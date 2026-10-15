# K-WAIS — Your Intelligent Kidney Care Companion

K-WAIS helps people living with chronic kidney disease (CKD) log what they eat, see estimated
sodium, potassium, phosphorus and protein, and bring better questions to their care team.

> **Decision support, not diagnosis.** K-WAIS never infers a CKD stage, prescribes, or labels
> intake as safe on its own authority. Clinical values come only from the patient or their clinician.

MIT capstone project. v0 is the patient portal; the doctor portal follows in v1.

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
pnpm dev                        # http://localhost:4000/api/v1/health

# 3. Frontend (second terminal)
cd frontend
pnpm install
pnpm dev                        # http://localhost:5173
```

Open http://localhost:5173. The start page shows three green checks when the web app, API
and database are connected, and links to:

- **App shell** at `/patient/dashboard`: sidebar, drawer and phone tab bar, with placeholder pages
- **Component gallery** at `/dev/components` (development only): every shared UI piece in each state

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
| backend | `pnpm db:reset` | Drop and recreate the database (development only) |
| frontend | `pnpm dev` | Web app with hot reload |
| frontend | `pnpm build` | Type-check and production build |
| frontend | `pnpm test` | Component tests (Vitest + Testing Library) |

## Environment variables

Every variable is documented in `backend/.env.example` and `frontend/.env.example`.
Secrets live only in `backend/.env`; the browser only ever sees `VITE_*` values.

| Variable | Used from | Development fallback |
| --- | --- | --- |
| `DATABASE_URL` | Section 1 | Docker Postgres from `docker-compose.yml` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Section 3 | Any long random strings |
| `LAB_ENCRYPTION_KEY` | Section 5 | 32 random bytes, base64 |
| `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Section 7 | `AI_PROVIDER=mock` works offline |

Use only fictional data with a free-tier Gemini key, since free-tier inputs may be used to
improve Google's products. Switch to a paid key before any real patient data is processed.

## Build sections

The work is split into sections so each can be reviewed and committed on its own.

| # | Section | Status |
| --- | --- | --- |
| 1 | Foundation: apps, tokens, database schema, health checks | ✅ |
| 2 | Design system and app shell | ✅ |
| 3 | Landing page and authentication | |
| 4 | Patient dashboard (mock data) | |
| 5 | Onboarding, profile, targets, lab results | |
| 6 | Meal logging and nutrition engine | |
| 7 | Gemini layer (parsing + structured analysis) | |
| 8 | Live dashboard, history, analytics, reminders | |
| 9 | Hardening: privacy requests, audit, tests, accessibility | |

## Data and privacy notes

- Health data is sensitive personal information under the Philippine Data Privacy Act of 2012
  (RA 10173). Encryption of lab values protects them at rest; it does not exempt them from the law.
- All sample patients, meals and lab values in this repository are fictional.
