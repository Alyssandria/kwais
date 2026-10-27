# K-WAIS — Your Intelligent Kidney Care Companion

K-WAIS helps people living with chronic kidney disease (CKD) log what they eat, see estimated
sodium, potassium, phosphorus and protein, and bring better questions to their care team.

> **Decision support, not diagnosis.** K-WAIS never infers a CKD stage, prescribes, or labels
> intake as safe on its own authority. Clinical values come only from the patient or their clinician.

MIT capstone project. v0 is the patient portal; v1 adds the doctor portal.

## Repository layout

```
kwais/
├─ frontend/          React 18 + Vite + Tailwind CSS v4 + TanStack Query (TypeScript)
├─ backend/           Node 20+ + Express 5 + Prisma + PostgreSQL 16 (TypeScript), JSON API:
│                     routes → controllers → services → models
├─ docker-compose.yml Local PostgreSQL
└─ docs/              Architecture notes and thesis figures
```

Each app is its own pnpm project with its own lockfile. There is no monorepo tooling.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20.11 or newer (22 LTS recommended) | `node -v` |
| pnpm | 9 or newer | `corepack enable` then `corepack prepare pnpm@latest --activate` |
| Docker Desktop | any recent | Runs PostgreSQL. Or point `DATABASE_URL` at your own Postgres 16. |

## First-time setup

Run these from the repository root. PowerShell and bash both work.

```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
pnpm install
pnpm db:migrate --name init     # creates prisma/migrations/ — commit that folder
pnpm db:seed                    # sample food tables (approximate values, see below)
pnpm dev                        # http://localhost:4000/api/v1/health

# 3. Frontend (second terminal)
cd frontend
pnpm install
pnpm dev                        # http://localhost:5173
```

Open http://localhost:5173 for the landing page, then create an account at `/register`.
Development-only pages:

- **Status** at `/dev/status`: green checks when the web app, API and database are connected
- **Component gallery** at `/dev/components`: every shared UI piece in each state

**Email in development:** with `MAIL_TRANSPORT=console` (the default) no email is sent; password-reset
links and other emails are printed in the terminal running the backend (`pnpm dev`). To send real email
through Brevo, see [Email](docs/deployment.md#email) and check it with `pnpm mail:test you@example.com`.

**Doctor accounts:** choose "A doctor or dietitian" when signing up, or open `/register?role=doctor`.

## Everyday commands

| Where | Command | What it does |
| --- | --- | --- |
| root | `docker compose up -d db` | Start the database |
| root | `docker compose down` | Stop it (data is kept in a Docker volume) |
| backend | `pnpm dev` | API with auto-reload |
| backend | `pnpm test` | API tests (Vitest + Supertest) |
| backend | `pnpm typecheck` | TypeScript check |
| backend | `pnpm db:migrate --name <change>` | Create and apply a migration after editing `schema.prisma` |
| backend | `pnpm db:studio` | Browse the database in Prisma Studio |
| backend | `pnpm db:reset` | Drop and recreate the database, then re-seed (development only) |
| backend | `pnpm db:seed` | Load or refresh the sample food tables |
| backend | `pnpm db:import-foods <file.csv>` | Import real PhilFCT / USDA records (checked first; nothing written on errors) |
| backend | `pnpm ai:eval` | Run 20 sample meals (15 Filipino, 5 international) through the configured AI and check parsing and validation |
| backend | `pnpm mail:test <email>` | Send a test email with the current mail settings |
| frontend | `pnpm dev` | Web app with hot reload |
| frontend | `pnpm build` | Type-check and production build |
| frontend | `pnpm test` | Component tests (Vitest + Testing Library) |
| frontend | `pnpm exec playwright install chromium` | One-time browser download for end-to-end tests |
| frontend | `pnpm test:e2e` | Public pages and accessibility scans (starts the dev server if needed) |
| frontend | `pnpm test:e2e:full` | Also the signed-in flows; needs the API running with `AI_PROVIDER=mock`, `AUTH_ATTEMPTS_PER_15_MIN=200` and `API_REQUESTS_PER_15_MIN=5000` |

## Environment variables

Every variable is documented in `backend/.env.example` and `frontend/.env.example`.
Secrets live only in `backend/.env`; the browser only ever sees `VITE_*` values.

| Variable | Used from | Development fallback |
| --- | --- | --- |
| `DATABASE_URL` | Section 1 | Docker Postgres from `docker-compose.yml` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Section 3 | Any long random strings |
| `LAB_ENCRYPTION_KEY` | Section 5 (required) | 32 random bytes, base64. Back it up: without it, saved lab values cannot be read |
| `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_TIMEOUT_MS` | Section 7 | `AI_PROVIDER=mock` works offline with rule-based sample text, labelled as not AI |
| `AI_MAX_REQUESTS_PER_MINUTE`, `AI_MAX_QUEUE_WAIT_MS` | Section 9 | 10 a minute, 15 s queue: fits the Gemini free tier |
| `TRUST_PROXY`, `SOFT_DELETE_RETENTION_DAYS`, `AUDIT_RETENTION_DAYS` | Section 9 | `0`, 30 days, 365 days |
| `MAIL_TRANSPORT`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Section 10 | `console`: emails are printed, not sent |

Use only fictional data with a free-tier Gemini key, since free-tier inputs may be used to
improve Google's products. Switch to a paid key before any real patient data is processed.

## Build sections

The work is split into sections so each can be reviewed and committed on its own.

| # | Section | Status |
| --- | --- | --- |
| 1 | Foundation: apps, tokens, database schema, health checks | ✅ |
| 2 | Design system and app shell | ✅ |
| 3 | Landing page and authentication | ✅ |
| 4 | Patient dashboard (sample data) | ✅ |
| 5 | Onboarding, profile, targets, lab results | ✅ |
| 6 | Meal logging and nutrition engine | ✅ |
| 7 | Gemini layer (parsing + structured analysis) | ✅ |
| 8 | Live dashboard, history, analytics, reminders | ✅ |
| 9 | Hardening: privacy requests, audit, tests, accessibility | ✅ |
| 10 | Doctor accounts, doctor app shell, email delivery | ✅ |
| 11 | Linking doctors and patients, with consent | ✅ |
| 12 | Doctor's patient list and priorities | ✅ |
| 13 | Patient detail for doctors (read-only) | ✅ |
| 14 | Clinical actions: verify targets and labs, add labs, notes | ✅ |
| 15 | v1 hardening: tests, accessibility, docs | |

## Data and privacy notes

- Health data is sensitive personal information under the Philippine Data Privacy Act of 2012
  (RA 10173). Encryption of lab values protects them at rest; it does not exempt them from the law.
- All sample patients, meals and lab values in this repository are fictional.
- **The seeded food values are approximate sample data**, not PhilFCT or USDA records. They are
  stored as unverified, so every result that uses them is labelled *Estimated*. Replace them with
  real records before the study: see `backend/prisma/seed-data/README.md`.
- Patients can download everything K-WAIS stores about them and delete their account from
  **Settings**. Deleted meals are purged after 30 days.

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for the production checklist, Docker setup and operations.
