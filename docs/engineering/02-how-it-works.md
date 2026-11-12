# 2. How it works

**Last verified:** 12 November 2026

This chapter follows a visitor through the system: a request reaching the site, a page starting up, and the data being saved.

## The big picture

```
Browser
  │  HTML, JS, CSS, images, 3D models  (static files)
  ▼
Cloudflare Pages ──── only a few paths ───▶ functions/_middleware.js
  │                                            │  /csp-report, /__rate,
  │                                            │  private paths → 404
  │                                            ▼
  │                                     exhibit-rate-gate Worker
  │                                     (Durable Object, per-IP counters)
  ▼
Supabase  ◀── called directly from the browser with the public key
  ├─ Auth: Google sign-in, authenticator app for moderators
  ├─ Postgres: exhibit_* tables, all with row-level security
  └─ RPC functions: progress save, answer checking, certificates, reviews, desk

Sentry ◀── browser error reports (production host only)
Cloudflare Web Analytics ◀── beacon, only after analytics consent
```

There is **no application server**. Pages are plain files. Everything personal goes from the browser straight to Supabase, and the database's row-level security decides what each user may read or write.

## 1. A request reaches the site

| Request | What answers it |
|---|---|
| A page (`/`, `/study.html`, …) | Cloudflare Pages serves the file. No Functions code runs. |
| Static files under `/assets/`, `/js/`, `/css/`, `/vendor/`, `/models/`, `/bible/` | Cloudflare Pages, with the cache rules in `_headers` |
| A path listed in `_routes.json` → `include` | `functions/_middleware.js` |

`_routes.json` sends only these to the middleware:

- `/csp-report`: browsers post CSP violations here. The middleware rate-limits them (10 a minute per IP) and logs the violated directive to `exhibit_events`.
- `/__rate`: a secret-protected proxy to the rate gate. It answers `403` without the `RATE_GATE_SECRET` bearer token.
- Private paths (`/docs/*`, `/tools/*`, `/tests/*`, `/functions/*`, `/server.py`, `/wrangler.toml`, dotfiles, and others): always `404`, even though the deploy bundle does not contain them.

Keeping pages out of `_routes.json` is a deliberate choice, enforced by `tools/verify/verify_pages_deny.mjs`. Page views never spend the Functions request quota. The middleware also has code for page rate limits and for removing `.html` from URLs, but that code does not run for pages today. See [Security](04-security.md#edge-rate-limits).

## 2. A page starts up

Every page except `privacy.html`, `terms.html` and `shelf.html` loads the same shared base. The order is roughly as below; it varies slightly per page (for example, `map.html` loads `consent.js` and Leaflet before `journey.js`).

1. `vendor/sentry/…` and `js/shared/sentry.js`: error reporting. This is switched off on `localhost`, `127.0.0.1`, `[::1]` and `*.localhost`. Every other host reports.
2. `js/shared/cinema.js`: page-transition effects. These are skipped under reduced motion.
3. `js/shared/journey.js`: the cross-page memory and the access rules.
4. `js/shared/auth-config.js` and `vendor/supabase/supabase.js`, then `js/shared/net.js`, `errors.js`, `ops.js`, `auth.js`: the Supabase client, network error handling, the error banner, and sign-in.
5. `js/shared/desk.js`, `terms.js`, `consent.js`: the message desk, the terms gate, and the cookie and analytics consent banner.
6. Then the page's own scripts. For example, the study desk adds `progress-sync.js`, `study-sync.js`, `quiz-gate.js`, and the `js/study/*` modules ending with `study-app.js`.

The exact list per page is in [Project structure](03-project-structure.md#pages-and-their-scripts).

## 3. Who may see what

`js/shared/journey.js` holds the access rules.

| Rule | Code |
|---|---|
| A member is anyone signed in | `isMember()` |
| Guests can open sittings 0 to 2 | `FREE_THROUGH = 2`, `maxOpenSheet()` |
| A member opens the next sitting by completing the one before | `maxOpenSheet()` walks the completed set |
| Map and gallery need a member | `requireMember()`, `canAccessMuseumNode()`, `canAccessYear()` |
| Moderators may preview every sitting | `previewAllContent()` → `isAdmin()` |
| `?preview=full` unlocks everything **only on localhost** | `previewAllContent()` |

These checks decide what the interface offers. The real protection is in the database: answers are graded on the server, and every table has row-level security.

## 4. Signing in

- Sign-in is Google only, through Supabase Auth (`signInWithOAuth({ provider: "google" })` in `js/shared/auth.js`).
- Moderators must also pass an authenticator-app check. In the live database, `is_review_moderator()` needs a Google identity **and** an `aal2` session (checked 12 November 2026). The enrolment and challenge screens are in `js/shared/mfa.js`.
- Signing out first tries to send any unsaved notes and progress, waiting up to 6 seconds. If something is still unsent, it asks before removing it from the device (`flushBeforeSignOut()` in `js/shared/auth.js`).
- For local tests only, `localStorage.baQaMockSession` can stand in for a signed-in user. It is ignored on any host other than localhost.

## 5. Reading a sitting and answering questions

1. `js/study/sheets/index.js` holds the list of 11 sittings and loads each sitting's text (`js/study/sheets/sheet-N.js`) only when it is opened.
2. `js/study/study-app.js` draws the sitting, its diagrams and its questions. `js/study/book-reader.js` lays the sitting out as turning pages.
3. An answer is sent to the database function `verify_quiz_answer` (`js/shared/quiz-gate.js`). **The answer key never reaches the browser.** It lives in `exhibit_quiz_keys`, which no client role can read. Guests cannot call the function; they are told to sign in.
4. A reply that comes back after the reader has moved to another sitting is ignored (fix of 12 November 2026).
5. When every question is right, the next sitting opens. `js/study/task-flow.js` offers the questions as a step-by-step dialog.

## 6. Saving progress, notes and bookmarks

The device is always the first copy. The cloud copy is kept in step with it.

| What | On the device | In the cloud | Module |
|---|---|---|---|
| Sitting progress, mastery, workbench, competency, certificate name | `baJourney`, `daniel_*` keys | `exhibit_progress`, saved through `save_exhibit_progress(expected_revision, payload)` | `js/shared/progress-sync.js` |
| Notes and bookmarks | `baNote-<n>`, `baNoteTimes`, `baStudyBookmarks` | `exhibit_study_data` | `js/shared/study-sync.js` |

How syncing works:

- **On sign-in**, the cloud copy is pulled and merged with the device copy. Progress takes the union of completed work. For notes, the newer edit wins for each sitting, and bookmarks are combined.
- **On a change**, a push waits briefly (6 seconds after the last one), then sends. If it fails, the change is kept in an outbox (`baProgressOutbox`, `baStudySyncOutbox`) and retried with growing waits.
- **Failed pulls** of notes are retried up to 8 times (5 s, 15 s, 30 s, then every 60 s). Reconnecting or signing in starts the retries again.
- **Progress conflicts**: each save carries the revision it was based on. If the cloud has moved on, the server returns the newer row. The client merges the two and saves again.
- **Account switch on one device**: the previous account's unsent changes are put aside under `baProgressStash:<account>` and `baStudySyncStash:<account>`, and the device is cleared for the new account. When the original owner signs in again, the put-aside changes are merged back and saved to their account (added 12 November 2026).

## 7. Analytics, surveys and error reports

| Stream | When it runs | Where it goes | Limits |
|---|---|---|---|
| Study events (`js/shared/insights.js`) | Only with analytics consent | `exhibit_events` | Batches of up to 10, a flush every 10 s, at most 12 requests and 60 rows a minute per tab |
| Short surveys (sitting pulse, profile) | Only with analytics consent | `exhibit_surveys`, `exhibit_profiles` | 5 surveys an hour per device |
| Cloudflare Web Analytics beacon | Only with analytics consent | Cloudflare | — |
| Operational reports (`js/shared/ops.js`: failed saves, failed answer checks) | Always (legitimate interest, stated in `privacy.html`) | `exhibit_events` | Queue of 20, a flush every 10 s. Without consent, a visit-only ID that is deleted when the tab closes |
| Browser errors (Sentry) | Any host except local ones | Sentry | 10% of page loads traced, no session replays. The feedback button appears only with analytics consent |

Consent is stored in `sodConsent` (`js/shared/consent.js`). If a visitor has not chosen yet and their browser sends Do-Not-Track or Global Privacy Control, analytics is recorded as declined.

## 8. Other account features

| Feature | Client | Database |
|---|---|---|
| Readers' notes (reviews) with moderation | `js/shared/reviews.js` | `exhibit_reviews`, `exhibit_public_reviews()` for public reading |
| Message desk (operator notices, help notes, replies) | `js/shared/desk.js` | `exhibit_notices`, `exhibit_notice_receipts`, `exhibit_help_notes`, `exhibit_help_replies` |
| Certificates | `js/study/certificate.js` (loaded on demand from `study.html`) | `exhibit_certificates`, `issue_exhibit_certificate()` |
| Account deletion | `js/shared/account.js` | `exhibit_delete_my_account()` |
| Insights dashboard and printable report | `js/insights/insights.js`, `js/insights/sid-report.js` | Moderator-only read policies on events, surveys and profiles; `exhibit_graduates()`; `exhibit_participation(from, to)` for the project target |

**The project target in the SID report.** The proposal to the Southern Africa-Indian Ocean Division sets a target of 500 people who register and begin the study within 12 months (`PARTICIPATION_TARGET` in `js/insights/sid-report.js`). The report's Summary page shows three figures for the chosen period, from `exhibit_participation(from, to)` in `tools/supabase-participation.sql`:

| Figure | How it is counted |
|---|---|
| Accounts registered | Rows in `auth.users` created in the period, leaving out moderator accounts |
| Registered and began | Those accounts whose saved progress (`exhibit_progress.journey`) shows at least one completed sitting, counted by `exhibit_sittings_finished()` |
| Share of the target | "Registered and began" divided by 500 |

These figures do not depend on the cookie banner, unlike the event-based figures. "Began" is read when the report is built, so it can rise after the period ends. Counts under 5 are withheld, as for every figure in the report. If the function is missing or refuses, the page says "Registration figures are not available for this report."

## 9. Running it locally

`python server.py` serves the folder on `127.0.0.1`. It tries port 8000, then up to 9 more ports. It answers only for an allow-list of file types and refuses dotfiles and path tricks. Local pages talk to the **real** Supabase project, so local sign-ins and saves are real. Sentry stays off locally.
