# Deployment

K-WAIS ships as three containers: PostgreSQL, the API, and the web app (nginx serving the built
frontend and proxying `/api` to the API). `docker-compose.prod.yml` at the repository root wires
them together. Put a TLS-terminating proxy (Caddy, Traefik, a cloud load balancer) in front of
the `web` container; the API sets `Secure` cookies in production, so plain HTTP sign-in will not work.

```
browser ─https─► TLS proxy ─► web (nginx :80) ─/api─► api (:4000) ─► db (:5432, internal only)
```

## Before the first deploy

- [ ] **Gemini key on a paid tier.** Free-tier inputs may be used to improve Google's products.
      Real patient data must only go through a paid key. Keep `AI_PROVIDER=mock` until then.
- [ ] **Secrets generated fresh**, never copied from `.env.example`:
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
  - `LAB_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - `POSTGRES_PASSWORD`: a long random string
- [ ] **`LAB_ENCRYPTION_KEY` backed up** somewhere separate from the database backups (a password
      manager or secrets vault). Without it, stored lab values cannot be read, including from backups.
- [ ] **`CLIENT_URL`** set to the public origin, e.g. `https://kwais.example.ph`. CORS only allows this origin.
- [ ] **`TRUST_PROXY`** equal to the number of proxies in front of the API. With the compose file
      behind one TLS proxy that is `2` (TLS proxy, then nginx).
- [ ] **HTTPS** with HSTS enabled at the TLS proxy.
- [ ] **Real food composition data** imported (`pnpm db:import-foods`); the seeded values are approximate samples.
- [ ] **Migrations committed** in `backend/prisma/migrations/`. The API container runs `prisma migrate deploy` on start.
- [ ] **Privacy notice and consent text** reviewed against RA 10173 and NPC Circular 2023-06; register with the NPC if required.

## Configure

Create `backend/.env.production` (not committed) from `backend/.env.example`:

```bash
NODE_ENV=production
CLIENT_URL=https://kwais.example.ph
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
LAB_ENCRYPTION_KEY=...
LAB_ENCRYPTION_KEY_VERSION=1
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
AI_MAX_REQUESTS_PER_MINUTE=10   # raise to match the paid quota
AI_MAX_QUEUE_WAIT_MS=15000
SOFT_DELETE_RETENTION_DAYS=30
AUDIT_RETENTION_DAYS=365
MAIL_TRANSPORT=smtp
MAIL_FROM="K-WAIS <your-verified-address@example.com>"
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

`DATABASE_URL`, `PORT`, `NODE_ENV` and `TRUST_PROXY` are set by the compose file.

## Email

K-WAIS sends email over SMTP, so any provider works. The defaults point at Brevo's free plan (300 emails a day),
which can send from a single verified address, so no domain of your own is needed.

1. Create a free account at brevo.com.
2. **Senders, domains and dedicated IPs → Senders → Add a sender**, and confirm the email Brevo sends to that address.
3. **SMTP & API → SMTP**: copy the SMTP login into `SMTP_USER` and generate an SMTP key for `SMTP_PASS`.
4. Set `MAIL_TRANSPORT=smtp` and `MAIL_FROM` to the verified sender, e.g. `"K-WAIS <kwais.capstone@gmail.com>"`.
5. Check it: `pnpm mail:test you@example.com` locally, or
   `docker compose -f docker-compose.prod.yml exec api node_modules/.bin/tsx scripts/mail-test.ts you@example.com` on the server.

Emails from a free mailbox address (Gmail, Yahoo) may land in spam. Verifying a domain you own in Brevo
(SPF and DKIM records) fixes that when you have one. A failed send is logged as `Email to … failed` and never
shown to the user, so password-reset responses look the same whether or not the address exists.

## Run

```bash
export POSTGRES_PASSWORD='...'         # PowerShell: $env:POSTGRES_PASSWORD='...'
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api node_modules/.bin/tsx prisma/seed.ts   # first time only, sample foods
curl -fsS http://127.0.0.1:8080/api/v1/health
```

The web container listens on `127.0.0.1:8080` only; point the TLS proxy at it. A minimal Caddyfile:

```
kwais.example.ph {
  reverse_proxy 127.0.0.1:8080
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}
```

## After deploying

- [ ] Register a test account, log a meal, download the data, delete the account.
- [ ] Run the end-to-end suite against the server: `E2E_BASE_URL=https://kwais.example.ph E2E_FULL=1 pnpm test:e2e` (frontend).
- [ ] Database backups scheduled (`pg_dump` daily, kept encrypted, restore tested once).
- [ ] Logs checked for `Audit log write failed`, `Retention purge failed` and `Email to … failed`.
- [ ] A password reset email arrives (check spam the first time).

## Operations

| Task | How |
| --- | --- |
| Rotate `LAB_ENCRYPTION_KEY` | Move the current key to `LAB_ENCRYPTION_KEY_PREVIOUS` with its version, set a new key and `LAB_ENCRYPTION_KEY_VERSION` + 1, restart. Old rows keep decrypting |
| Rotate JWT secrets | Change both and restart. Everyone is signed out |
| Gemini answering 429 | Lower `AI_MAX_REQUESTS_PER_MINUTE` or raise the quota. Patients see "The AI service is busy" and their meal keeps its numbers |
| Data access request outside the app | The patient can use Settings → Download my data. For requests by email, verify identity, then export from the patient's account |
| Scaling past one API container | The Gemini limiter, reminder job and retention job run in-process. Run one API container, or move these to a shared store and a single worker first |
