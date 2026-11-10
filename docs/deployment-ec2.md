# Deploying on one EC2 instance

Everything runs on one EC2 instance as containers: Postgres, the API, the web app (nginx), and Caddy,
which gets the HTTPS certificate from Let's Encrypt and renews it automatically.

```
browser ─https─► caddy (:443) ─► web (nginx :80) ─/api─► api (:4000) ─► db (Postgres :5432, internal only)
```

> **No domain yet?** That's the default in this guide: a free DuckDNS name such as `kwais.duckdns.org`
> (step 2). The site can't run on the bare IP address: browsers only keep the sign-in cookie over HTTPS,
> and this setup gets its HTTPS certificate for a name. Moving to your own domain later takes a few minutes
> ("Moving to your own domain" below).

Files: `docker-compose.ec2.yml`, `deploy/Caddyfile`, `deploy/env.example`, `deploy/api.env.example`,
`deploy/ec2-setup.sh`, `deploy/backup.sh`.

## What you need before starting

- [ ] An AWS account.
- [ ] A name for the site. Without a domain, use a free DuckDNS subdomain (step 2); you only need a
      GitHub or Google account to sign in there.
- [ ] A Brevo account with a verified sender (see "Email" in `deployment.md`).
- [ ] A Gemini API key, or plan to use `AI_PROVIDER=mock`. Free-tier keys: fictional data only.
- [ ] Read access to the Git repository from the server (a GitHub deploy key or a fine-grained token).

## 1. Launch the instance (AWS console)

1. Top-right region picker: **Asia Pacific (Singapore) ap-southeast-1**, the closest to the Philippines.
2. **EC2 → Instances → Launch instances**:
   - **Name**: `kwais`
   - **AMI**: Ubuntu Server 24.04 LTS (64-bit x86)
   - **Instance type**: `t3.small` (2 vCPU, 2 GB)
   - **Key pair**: Create new key pair → RSA, `.pem` → download and keep it safe. You cannot download it again.
   - **Network settings → Edit**: create a security group `kwais-web` with these inbound rules:

     | Type | Port | Source |
     | --- | --- | --- |
     | SSH | 22 | My IP |
     | HTTP | 80 | Anywhere (0.0.0.0/0) |
     | HTTPS | 443 | Anywhere (0.0.0.0/0) |

     Port 80 must stay open: Let's Encrypt uses it to issue and renew the certificate.
   - **Storage**: 20 GiB gp3.
3. **Launch instance**.
4. **EC2 → Elastic IPs → Allocate Elastic IP address → Allocate**, then **Actions → Associate Elastic IP
   address** → pick the `kwais` instance. Without this the public address changes on every stop and start.
   An Elastic IP is free only while it is attached to a running instance.

## 2. Get a free name for it (DuckDNS)

1. Go to duckdns.org and sign in (GitHub, Google and others work).
2. Under **domains**, type a subdomain, e.g. `kwais`, and **add domain**. Pick another if it's taken.
3. In the **current ip** box next to it, enter the **Elastic IP** from step 1 and click **update ip**.
   Don't use the IP DuckDNS fills in for you: that's your home connection, not the server.
4. Your site's name is now `kwais.duckdns.org`. Use it wherever this guide says "your domain".

Check from your computer: `nslookup kwais.duckdns.org` should answer with the Elastic IP. Wait for that
before starting Caddy in step 5; otherwise the certificate request fails and Caddy retries later.

The DuckDNS name keeps pointing at the Elastic IP; there's nothing to renew. Log in to duckdns.org once in a
while, as accounts unused for a long time can be removed.

Already have a domain? Add an `A` record (e.g. `kwais.example.com`) pointing to the Elastic IP instead.

## 3. Prepare the server

```bash
chmod 400 kwais.pem                       # Windows PowerShell: icacls kwais.pem /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i kwais.pem ubuntu@<elastic-ip>
git clone <your repo URL> kwais && cd kwais
./deploy/ec2-setup.sh                     # Docker, Compose, Git, 2 GB swap
exit                                      # log back in so docker works without sudo
```

For a private GitHub repository, either add the server's SSH key as a read-only deploy key
(`ssh-keygen -t ed25519`, then paste `~/.ssh/id_ed25519.pub` under the repo's **Settings → Deploy keys**,
and clone with the `git@github.com:` URL), or clone over HTTPS with a fine-grained token as the password.

## 4. Configure

```bash
ssh -i kwais.pem ubuntu@<elastic-ip>
cd ~/kwais
cp deploy/env.example .env
cp deploy/api.env.example backend/.env.production
openssl rand -hex 24        # → POSTGRES_PASSWORD
openssl rand -hex 48        # → JWT_ACCESS_SECRET
openssl rand -hex 48        # → JWT_REFRESH_SECRET
openssl rand -base64 32     # → LAB_ENCRYPTION_KEY
nano .env                   # DOMAIN and POSTGRES_PASSWORD
nano backend/.env.production
```

| File | Variable | Value |
| --- | --- | --- |
| `.env` | `DOMAIN` | Your domain, without `https://` |
| `.env` | `POSTGRES_PASSWORD` | From `openssl rand -hex 24` |
| `backend/.env.production` | `CLIENT_URL` | `https://` + your domain, no trailing slash. CORS allows only this origin |
| | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two different `openssl rand -hex 48` values |
| | `LAB_ENCRYPTION_KEY` | From `openssl rand -base64 32` |
| | `GEMINI_API_KEY`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | From Gemini and Brevo |

**Save `POSTGRES_PASSWORD`, both JWT secrets and `LAB_ENCRYPTION_KEY` in your password manager.**
Without the lab key, lab values in the database and in backups cannot be read.

## 5. Start

```bash
docker compose -f docker-compose.ec2.yml up -d --build    # first build takes several minutes
docker compose -f docker-compose.ec2.yml ps               # db healthy; api, web, caddy up
docker compose -f docker-compose.ec2.yml logs -f api      # migrations, then "listening"; Ctrl+C to stop following
```

The API runs `prisma migrate deploy` each time it starts, so the first start creates the tables.
Then load the sample foods once:

```bash
docker compose -f docker-compose.ec2.yml exec api node_modules/.bin/tsx prisma/seed.ts
```

## 6. Check

- [ ] `curl -fsS https://your-domain/api/v1/health` and `.../api/v1/health/db` both answer `"status":"ok"`.
- [ ] The site opens over HTTPS with a valid certificate (`docker compose -f docker-compose.ec2.yml logs caddy` if not).
- [ ] Register a patient, finish onboarding, log and analyse a meal.
- [ ] Register a doctor in another browser, link to the patient by code, approve, open the record, leave a note.
- [ ] Email arrives (check spam the first time):
      `docker compose -f docker-compose.ec2.yml exec api node_modules/.bin/tsx scripts/mail-test.ts you@example.com`

## 7. Backups

```bash
mkdir -p ~/kwais-backups
./deploy/backup.sh                       # test once
crontab -e                               # add:
30 2 * * * /home/ubuntu/kwais/deploy/backup.sh >> /home/ubuntu/kwais-backups/backup.log 2>&1
```

Backups stay 14 days on the instance, so they die with it. Copy one off now and then from your computer:
`scp -i kwais.pem ubuntu@<elastic-ip>:~/kwais-backups/kwais-*.dump .`

Restore (replaces the current data):

```bash
docker compose -f docker-compose.ec2.yml stop api
docker compose -f docker-compose.ec2.yml exec -T db pg_restore -U kwais -d kwais --clean --if-exists < ~/kwais-backups/kwais-YYYYMMDD-HHMM.dump
docker compose -f docker-compose.ec2.yml start api
```

The database lives in the Docker volume `kwais_kwais-db`. `docker compose down` keeps it;
`docker compose down -v` **deletes it**.

## Updating

```bash
cd ~/kwais && git pull
docker compose -f docker-compose.ec2.yml up -d --build
docker image prune -f
```

New migrations run when the API restarts. Users stay signed in unless the JWT secrets change.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `ssh: connect ... timed out` | Security group's SSH rule allows a different IP (your IP changed): edit it to **My IP** again |
| Caddy log `challenge failed`, or no certificate | DNS not pointing at the Elastic IP yet, or port 80 closed. Fix, then `docker compose -f docker-compose.ec2.yml restart caddy` |
| API keeps restarting | `docker compose -f docker-compose.ec2.yml logs api`: usually a missing or too-short secret in `backend/.env.production` |
| Sign-in seems to work, then you are signed out | `CLIENT_URL` does not match the address in the browser, or the site was opened over plain HTTP |
| Every request answers 429 | Many users behind one network (a clinic): raise `API_REQUESTS_PER_15_MIN` and restart the API |
| Build killed or very slow | Not enough memory: check the swap file with `free -h` |
| Disk filling up | `docker system df`, then `docker image prune -f`; old backups older than 14 days are removed automatically |

## Moving to your own domain

1. At your domain registrar, add an `A` record (e.g. `kwais.example.com`) pointing to the Elastic IP, and
   wait until `nslookup kwais.example.com` answers with it.
2. On the server, change the name in both files:
   - `.env`: `DOMAIN=kwais.example.com`
   - `backend/.env.production`: `CLIENT_URL=https://kwais.example.com`
3. Apply it:
   ```bash
   docker compose -f docker-compose.ec2.yml up -d --force-recreate api caddy
   ```
   Caddy gets a certificate for the new name within a minute.

Data and accounts are unchanged. Everyone signs in once more, because browsers keep sign-in cookies per site
name. Links in emails already sent (password resets, invitations) still point at the old name, so ask people to
request new ones.

