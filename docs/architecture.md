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
- **Tests:** in `backend/tests` and `frontend/tests`, mirroring the `src` folders.
- **Comments:** only where the code is hard to read on its own; one short line, no narration.
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

## Section 3 decisions: authentication

| Decision | Why |
| --- | --- |
| Passwords hashed with Node's built-in `scrypt` (N=2^15, r=8, p=1, 16-byte salt) | Memory-hard and OWASP-recommended; no native build step on Windows; parameters stored with each hash so they can be raised later |
| Access token: HS256 JWT, 15 minutes, kept in browser memory only | Short-lived; never in localStorage, so injected scripts cannot lift a long-lived credential |
| Refresh token: random 256-bit string in an `httpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth`, stored only as a SHA-256 hash | Survives page reloads without exposing it to JavaScript; a database leak gives no usable tokens |
| Refresh rotation with reuse detection | Each refresh issues a new token; replaying an old one revokes the whole chain and forces sign-in |
| Account lockout: 5 wrong passwords → 15 minutes; 10 credential requests per 15 minutes per IP | Slows password guessing |
| Same error and similar timing for unknown email and wrong password; forgot-password always answers the same | Does not reveal which emails are registered |
| Password reset links: single use, 30 minutes, all older links invalidated; reset signs out every device | Limits the damage of a leaked or old email |
| Consent recorded at sign-up (`terms`, `health_data`) with the policy version | Data Privacy Act: explicit, versioned consent for sensitive personal information |
| Sign-ins, failures, token replays and password changes written to `audit_logs` with a salted IP hash | Security trail without storing raw IP addresses |
| Emails printed to the backend console in v0 | No mail server yet; swap `mail.service.ts` for SMTP before real users |

## Section 5 decisions: profile, targets, lab results

| Decision | Why |
| --- | --- |
| Patient routes resolve the patient id from the signed-in user (`requirePatient`); ids in the URL or query are never trusted | A patient can only ever reach their own records |
| Lab values and reference-range bounds encrypted with AES-256-GCM, a fresh IV per value, key version stored in each value | Database dumps and backups hold no readable lab values; keys can be rotated |
| Each ciphertext is bound to `lab:<patientId>:<column>` as authenticated data | A value copied into another patient's row or another column fails to decrypt instead of showing a wrong number |
| Lab rows are looked up with both `id` and `patientId` | Another patient's lab id behaves exactly like a missing one (404) |
| Clinical fields record `source`: `patient_entered` or `clinician_verified`; a patient edit always sets `patient_entered` | The UI can show who entered each value; a doctor's verification (v1) is never silently kept after a change |
| CKD stage is a fixed list including "not sure"; nothing derives it | Brief requirement: never infer or diagnose CKD stage |
| Targets have fixed units per nutrient (mg, g for protein) and sanity limits; setting one ends the previous target | Numbers cannot land in the wrong unit, and past analyses keep the target that applied at the time |
| AI processing and reminders are separate, append-only consent records | AI use needs its own explicit consent under the Data Privacy Act; the history of choices is kept |

## Section 6 decisions: meal logging and the nutrition engine

```
Log a meal form ──► POST /meals { rawText, condiments, drinks, cookingMethods, status, analyse }
                        │
                        ├─ status draft  → stored, nothing else
                        ├─ status saved, analyse off → stored, counts toward history
                        └─ status saved, analyse on  → nutrition engine:
                              parse text (rules@1; Gemini from Section 7)
                              → match each phrase to food_items (name + local names)
                              → grams from the food's own household portions
                              → grams × value per 100 g ÷ 100, per item and in total
                              → meal_analyses version n (immutable) + meal_items
```

| Decision | Why |
| --- | --- |
| The engine (`services/nutrition/`) is pure: meal input + catalog in, numbers out; no database, no AI | Results can be reproduced by hand; 10 sample meals are checked against hand-worked totals in `tests/services/nutrition/engine.test.ts` |
| Every nutrient number is dataset arithmetic; the AI never produces one | Brief requirement; the AI (Section 7) only reads these numbers |
| Each value and total carries a source: `verified`, `estimated` or `missing`; totals say whether they are `complete` | A total with an uncounted food is shown as "at least", never as the full amount |
| Unknown foods are reported, not guessed; a match needs a score of 0.5 or more | A wrong match is worse than an honest gap |
| Assumed amounts (no amount typed, "konti", "marami", drinks by the glass, a unit the food has no weight for) are flagged | The patient can see which numbers rest on assumptions and add amounts |
| Condiments and drinks are fixed keys, matched to foods by name (not by record id) | Replacing the sample tables with real PhilFCT records keeps them working |
| Recipes store ingredients only; dish values are always worked out from them | Fixing one ingredient fixes every dish that uses it |
| Sample food data is stored as `verified = false`, `sourceRef = sample:*`; a CSV importer loads real records | No approximate number is ever labelled Verified |
| Saved meals are not edited in place; drafts are. Analyses are versioned, never overwritten | Each analysis keeps describing exactly what was logged |
| Analysing is limited to 30 per hour per patient | Protects the Gemini quota from Section 7 |
| `inputs_snapshot` records the parser version and exactly what was sent to any AI (`null` for now) | Audit trail for the thesis: which inputs produced which output |

