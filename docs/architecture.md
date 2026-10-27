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

## Section 7 decisions: Gemini layer

```
analyse meal ─► AI consent? ── no ──► rules parser → engine → numbers only (ai_status unavailable, reason no_consent)
                    │ yes
                    ▼
            Gemini parse (JSON schema) ─ fails ─► rules parser
                    ▼
            engine (numbers) + same-day totals + supplied details only
                    ▼
            Gemini analysis (JSON schema) → server checks → score = 10 − deductions
                    ▼
            meal_analyses: ai_output, score, model, prompt_version, inputs_snapshot
```

| Decision | Why |
| --- | --- |
| Gemini runs only with the patient's `ai_processing` consent; the mock follows the same rule | AI use needs its own consent under the Data Privacy Act; development behaves like production |
| The AI receives the engine's numbers, same-day totals and only the details the patient entered. No name, patient code, contact details or lab name | Data minimisation; nothing is inferred from data that was not given |
| Structured output: a JSON schema in the request, then Zod validation of the answer, one retry | Malformed or off-schema output never reaches the patient |
| The server sets the score to 10 minus the listed deductions, removes it when no target or lab range was supplied, and rejects answers that cite inputs not supplied | The score always matches its stated reasons and never rests on assumptions |
| When the AI fails, the meal keeps its numbers and shows "Try again"; parsing falls back to the rule-based reader | An outage never loses a logged meal |
| `inputs_snapshot` stores exactly what was sent for parsing and analysis, or why nothing was sent; sending is audited as `ai_processing` | Every output can be traced to its inputs for the thesis and for audits |
| `AI_PROVIDER=mock` writes rule-based sample text labelled "Sample text, not AI" | Offline development without presenting rules as AI |
| `pnpm ai:eval` runs 20 sample meals through the configured provider | Repeatable check of parsing and validation for the thesis |

## Section 8 decisions: dashboard, history, analytics, reminders

| Decision | Why |
| --- | --- |
| Days are counted in the patient's own time zone (`patient_profiles.timezone`) | A meal at 11 pm belongs to that day, not the next UTC day |
| Daily totals add up analysed meals only; meals saved without analysis count as logged days | No nutrient number exists unless the engine produced it |
| Dashboard and analytics are built by pure functions (`buildDashboard`, `buildAnalytics`) from meal rows | Tested without a database; the same numbers feed both pages |
| Analytics ranges are fixed at 7, 30 or 90 days | Bounded queries; enough for trends in the thesis |
| Insights on the dashboard reuse each meal's stored AI observations, labelled "Sample text, not AI" when they came from the mock | No extra AI calls just to render the dashboard |
| Analysis progress streams from `POST /meals/:id/analyse` as newline-delimited JSON (`{step}` lines, then `{done, data}` or `{error}`) when the request sends `Accept: application/x-ndjson` | The progress dialog shows the step the server is actually on, not a timer |
| Reminders: a scheduler in the API process checks every 5 minutes and creates one in-app reminder per day, only with `reminders` consent, after the patient's chosen time, and only if nothing was logged that day | Respects consent; never nags twice; no email or SMS in v0 |


## Section 9 decisions: privacy, audit, rate limits, testing, deployment

| Decision | Why |
| --- | --- |
| Outbound Gemini calls share one in-process limiter (`AI_MAX_REQUESTS_PER_MINUTE`, default 10). Callers queue for up to `AI_MAX_QUEUE_WAIT_MS`, then get "busy, try again in N seconds" | Stays under the free-tier quota instead of answering 429s; a long wait never blocks a request silently |
| A 429 or 503 from Gemini pauses every caller for the `Retry-After` time (header or `RetryInfo` in the body), with at most two retries | One quota error does not trigger a burst of further ones |
| `GET /patients/me/export` returns one JSON file: account, profile, all targets (including ended ones), decrypted labs, meals with every analysis and `inputs_snapshot`, consents, notifications, data requests and activity | Right to access and data portability (RA 10173 §16); the patient sees exactly what was sent to the AI |
| Each export is recorded as a completed `data_requests` row and audited as `export`; limited to 5 an hour | Proof the request was honoured; a stolen session cannot pull the file repeatedly |
| Account deletion needs the password and the word DELETE, then deletes the user row and cascades to every record | Right to erasure; no half-deleted accounts |
| Audit rows have no foreign keys, so the deletion event and earlier entries remain, with no health data in them. Entries older than `AUDIT_RETENTION_DAYS` (365) are purged | Security accountability without keeping health data after deletion |
| Soft-deleted meals are purged after `SOFT_DELETE_RETENTION_DAYS` (30); expired refresh and reset tokens after 7 days. A daily job in the API process runs the purge | Undo window for mistakes, then storage limitation |
| Account activity reads the audit log for the signed-in user (as actor, or as the patient whose record was touched) and shows the device as "Chrome on Windows"; the IP hash is never sent to the browser | Patients can spot sign-ins and changes they did not make |
| Changing the password revokes every refresh token and reset link, then issues a new session for the current device. "Sign out on every device" revokes all refresh tokens | A leaked password or device can be shut out; access tokens still expire within 15 minutes |
| `trust proxy` comes from `TRUST_PROXY` (number of proxies in front of the API) | Rate limits and IP hashes use the real client address without trusting spoofed headers |
| Playwright end-to-end tests live in `frontend/e2e`. Public pages always run; signed-in flows run with `E2E_FULL=1` against a real API using `AI_PROVIDER=mock`. Every page is scanned with axe for serious or critical WCAG 2.2 AA problems | The thesis can show accessibility and the main flows were checked on desktop and mobile sizes |

## Meal analysis v2: general guidance and next steps

Supersedes the Section 7 rule that a meal gets no score without a patient target or lab range.

| Decision | Why |
| --- | --- |
| When the patient has no sodium target, sodium is scored against general guidance: under 2,000 mg a day (KDIGO 2024 CKD guideline). The AI receives it as `guidance.sodium`, separate from `supplied`, and must call it "general guidance for people with CKD", never "your target" | Every meal with a sodium value gets a score, without pretending a general number is personal |
| No general numbers for potassium, phosphorus or protein | KDIGO 2024 sets no general dietary limit for potassium or phosphorus (they depend on labs and a dietitian), and protein guidance needs body weight, which the profile does not store. The AI may say which foods contributed most, but does not judge the amount |
| The server sets `scoreBasis`: `personal` with any patient target or ranged lab, `general` with guidance only, `null` when even sodium is unknown. The score card says when a score uses general guidance and links to targets and labs | The patient always knows what the score was measured against |
| The AI never assumes the patient's CKD stage, labs or targets | Guidance is a published population number; inferring personal values would be a clinical judgement |
| New `actions` field: two to four concrete food steps (a swap, a portion, what to keep light today, a detail to add to the profile), shown as "What you can do" under the score. Dashboard insights use the first action | Patients asked for advice they can act on, not just numbers |
| `PROMPT_VERSION` is `v2`. Older analyses keep their stored output; `actions` defaults to an empty list, so they show no actions card | Stored analyses stay reproducible from `inputs_snapshot` and their prompt version |

### Prompt v3: dietitian judgement and per-meal share

| Decision | Why |
| --- | --- |
| The analysis prompt speaks as a renal dietitian on a Philippine nephrology team, not as a nephrologist | It brings knowledge of Filipino dishes and common CKD diet advice, while staying with food advice rather than diagnosis or medication |
| Every score reason has a `basis`: target, guidance, lab, restriction, allergy, meal_share, description or not_scored | The server can enforce limits per kind, and the page can show where each deduction came from |
| A meal that alone gives more than 40% of the day's target or guidance for a nutrient loses 1 point (`meal_share`) | One meal is about a third of the day; before this, a salty meal scored 10 as long as the whole-day total stayed under the limit |
| The AI may take off points for what the patient wrote that the food tables cannot show, such as "maalat", a lot of sabaw, extra sawsawan, or processed and instant food (`description`): at most 2 per reason and 3 in total, enforced by the server, and the detail must quote the patient's words | The tables give typical recipes; "maalat na sinigang" scored 10. The limit keeps the AI's own judgement from deciding most of the score |

## Section 10 decisions: doctor accounts and email

| Decision | Why |
| --- | --- |
| Doctors are ordinary accounts with the `doctor` role, chosen at sign-up. No licence check or admin approval | Keeps v1 simple for the capstone. The safeguard is consent: a doctor sees nothing about a patient until that patient approves a link (Section 11) |
| `doctor_profiles` holds name, and optional PRC licence number, specialty and clinic, shown to patients as self-reported | Lets patients recognise who is asking without implying K-WAIS verified them |
| Registration body is a union on `role` (missing role means patient). Doctors give only the terms consent; the health-data consent is for patients | Doctors do not store their own health data |
| Download data, account activity and delete account moved to `/account/*`, open to any signed-in user | The same privacy rights apply to doctors |
| Doctor pages live under `/doctor` with their own layout, closed to patients and the reverse | One app, two roles; each role lands on its own home after sign-in |
| Email goes through one SMTP sender (nodemailer). `MAIL_TRANSPORT=console` prints emails in development; `smtp` sends them, with Brevo's free plan as the default | Any provider works by changing settings. Brevo sends from a single verified address, so no domain is needed for the study |
| A failed email is logged and not reported to the user | Password-reset answers stay the same whether or not the address exists |

## Section 11 decisions: linking doctors and patients

```
doctor ── request by patient code ──► pending ── patient approves ──► active ── either side ends ──► ended
patient ── invite by email ──┬─ doctor has an account ──► pending ── doctor accepts ──► active
                             └─ no account ──► email with a one-time link ── doctor signs up and accepts ──► active
```

| Decision | Why |
| --- | --- |
| A `care_links` row per doctor–patient pair: pending, active, declined, cancelled or ended, with who started it and who ended it | One place decides access; history stays for the audit trail |
| Approve and decline belong to whoever did not send the request; cancel to whoever did; either side can end an active link | Neither side can be added without saying yes |
| A request for an unknown patient code, an invitation to an address that is not a doctor, or a repeat request gets the same "sent" answer | Codes and email addresses cannot be probed |
| Invitations to people without an account carry a random token, stored only as a hash, valid for 14 days, used once. The patient can cancel it | Only the person holding the email can accept, and an old email cannot be reused |
| Requests and invitations are limited to 10 an hour per account | Stops a doctor or patient spamming others |
| `CareService.assertActiveLink` answers "not found" unless the doctor has an active link to that patient | The single check every doctor route to patient data uses from Section 12 on |
| Every request, answer and ending is audited as `care_link` against the patient, notified in the app, and emailed where the other side may not be signed in | Patients see it in their activity; nothing happens silently |
| Doctors' details in requests and emails are labelled as entered by the doctor | K-WAIS does not verify licences in v1 |
| Notifications are shared by both roles; doctors get the bell back | Requests and replies need to reach doctors too |

## Section 12 decisions: patient list and priorities

| Decision | Why |
| --- | --- |
| `GET /doctors/me/patients` returns one row per active link, built by a pure function (`buildPriorities`) from the last 7 days of meals in the patient's own time zone, active targets and labs | Tested without a database; the same daily totals as the patient's dashboard |
| Sodium uses the 7-day average of days with analysed meals, against the patient's target or else general guidance (2,000 mg), and the row says which | Saved-but-unanalysed meals count as logged days but have no numbers to average |
| Flags, in plain words: sodium over the limit on 4 or more of 7 days, a latest lab outside the range on its slip (bad); no meals for 3 or more days, or never logged (warn); no CKD stage, no targets, or targets not verified (information); otherwise "On track" | A doctor sees why a patient is near the top, not just a colour |
| Rows are sorted by attention (2 per bad flag, 1 per warning), then by name | Patients who need a look come first |
| The list itself is not written to the patient's audit log; opening a patient's detail is (Section 13) | The list is a summary the doctor sees on every visit; logging it would bury real views in the patient's activity |
| Computed on request, a handful of queries per patient | Fine for a clinic's list in the study; a cached summary table is the next step for hundreds of patients |

## Section 13 decisions: patient detail for doctors

| Decision | Why |
| --- | --- |
| Doctor routes live under `/doctors/me/patients/:patientId` and reuse the patient controllers. `requireLinkedPatient` checks the id, calls `assertActiveLink`, then sets `req.patientId` | One implementation of each read; the link check happens before any data is touched |
| A malformed id, no link, a pending or ended link all answer 404 "Patient not found" | A doctor cannot tell whether a patient exists without a link |
| The record, meal history, a single meal, labs and trends are audited as `read` against the patient. The dashboard, profile and targets requests behind those pages are not | The patient sees one "Your clinician viewed…" line per page, not five |
| Drafts stay private: the doctor meal routes return no drafts and 404 for a draft's id | A draft is unfinished and not part of the patient's log |
| The frontend wraps the doctor's pages in a `PatientScopeProvider`. Shared hooks then call the doctor routes and add `['patient', id]` to their cache keys; outside a scope keys are unchanged | The patient's pages and cache updates work as before, and two patients never share cached data |
| Overview, labs and targets are doctor pages; meal history, a meal's analysis and trends are the patient's components with doctor wording and no actions | Patient cards speak to the patient ("your target", "Log a meal"); the analysis and charts read the same for both |
| Everything is read-only in this section | Changing stage, targets and labs, and notes, come with their own audit and notifications in Section 14 |

