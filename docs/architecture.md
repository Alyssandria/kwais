# Architecture notes

The full plan (sitemap, journeys, data model, API, roadmap) lives in the shared planning doc.
This file records decisions as they land in code.

## Request path

```
Browser (React SPA)
  └─ /api/v1/*  ──(Vite proxy in dev)──►  Express
                                            ├─ helmet, CORS allowlist, JSON body limit 100 kb
                                            ├─ rate limit 300 req / 15 min on /api
                                            ├─ routes → controllers → services → models → PostgreSQL
                                            ├─ controllers → res.json({ data, meta? })
                                            └─ errorHandler → { error: { code, message, details? } }
```

## Backend layering

The backend is a JSON-only API. A request flows through the layers in one direction;
each layer may call only the one below it.

```
routes/        URL + HTTP method → controller function (plus middleware: auth, validation)
  ↓
controllers/   Read req (params, body, user) → call a service → res.json({ data })
  ↓
services/      Business rules: targets, scoring, encryption, AI calls. Throws HttpError.
               Returns objects that are safe to send as-is.
  ↓
models/        Data access through Prisma. Plain inputs in, plain records out.
               (Table definitions themselves live in prisma/schema.prisma.)
```

There is no separate view layer, so sensitive fields are kept out of responses at the source:
models `select` only the columns a caller needs (never password hashes or token hashes), and
services decrypt lab values and strip raw AI output before returning.

| Layer | Knows about HTTP? | Knows about the database? | Tested with |
| --- | --- | --- | --- |
| routes | yes | no | Supertest (through the app) |
| controllers | yes | no | Supertest |
| services | no | no (calls models) | Vitest, models mocked |
| models | no | yes | Vitest against a test database |

File naming: `<resource>.<layer>.ts`, e.g. `meal.model.ts`, `meal.service.ts`,
`meal.controller.ts`, `meal.routes.ts`.

## Conventions

- **Responses:** success `{ data, meta? }`, failure `{ error: { code, message, details? } }`.
- **Errors:** throw `HttpError` from routes or services; the error handler formats it.
  Zod validation errors become `400 validation_failed` with per-field details.
- **IDs:** UUIDs everywhere. Patients share a short `patient_code` (KW-000123), never their UUID.
- **Database naming:** snake_case tables and columns via Prisma `@map`; camelCase in TypeScript.
- **Provenance:** clinical values carry `source` (`patient_entered` | `clinician_verified`);
  nutrient values carry `verified` | `estimated` | `missing` | `ai_text`.
- **Immutability:** meal analyses are versioned, never edited; targets are ended, never edited.

## Section 1 decisions

| Decision | Why |
| --- | --- |
| TypeScript in both apps | Shared shapes between Zod schemas and code; fewer runtime surprises in a thesis demo |
| Express 5 | Async errors reach the error handler without wrappers |
| Routes → controllers → services → models, JSON only | Clear separation for review and for the thesis write-up; services testable without a database |
| Tailwind v4 `@theme` tokens | One file (`frontend/src/styles/index.css`) defines every colour, radius and shadow |
| Vite dev proxy for `/api` | Cookies stay same-origin in development, matching production behind one domain |
| Doctor-portal tables deferred | v0 schema holds only what the patient portal uses; v1 adds a migration |
| `citext` for email | Case-insensitive uniqueness without lower-casing in every query |
