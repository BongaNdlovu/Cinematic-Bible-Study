# Plan: move off Supabase onto Cloudflare only

**Written:** 12 November 2026. **Status:** plan only. Nothing in it has been carried out.
**Mode:** light (this document changes no site files; each phase will get its own gated plan when it is carried out).

## 1. Goal

Run the whole site on Cloudflare's free tier, with no Supabase project, so the Free-plan limits that hurt today no longer apply. Every existing user keeps their account, progress, notes and certificates. No security layer gets weaker.

### Why: the Supabase Free-plan limits

From `https://supabase.com/pricing`, read 12 November 2026:

| Limit | Supabase Free | Does it hurt this site? |
|---|---|---|
| Pausing | "Free projects are paused after 1 week of inactivity." | Yes. A quiet week takes sign-in and saving offline. |
| Backups | Not available on Free | Yes. The repo now makes its own (`.github/workflows/db-backup.yml`), but nothing is automatic until its secrets are set. |
| Log retention | "1 day" | Yes. Problems older than a day cannot be investigated. |
| Database size | "500 MB" | Not yet. The full export was 2,814,727 characters on 12 November 2026. |
| Monthly active users | "50,000" | Not yet. `auth.users` had 5 rows. |
| Egress | "5 GB" | Not checked. |

### What Cloudflare's free tier gives instead

From the Cloudflare docs, read 12 November 2026:

| Item | Workers Free | Source |
|---|---|---|
| Worker and Pages Functions requests | 100,000 per day, reset 00:00 UTC. Pages Functions count toward it; static files do not. | `developers.cloudflare.com/workers/platform/limits/`, `developers.cloudflare.com/pages/functions/pricing/` |
| CPU time | 10 ms per request | `developers.cloudflare.com/workers/platform/limits/` |
| Subrequests | 50 per request | same |
| D1 (SQLite database) | 5 million rows read and 100,000 rows written per day; 500 MB per database; 10 databases; 5 GB total | `developers.cloudflare.com/d1/platform/pricing/`, `developers.cloudflare.com/d1/platform/limits/` |
| D1 queries per Worker call | 50 | `developers.cloudflare.com/d1/platform/limits/` |
| D1 Time Travel (point-in-time restore) | 7 days | same |
| Durable Objects (SQLite backend only) | 100,000 requests and 100,000 rows written per day | `developers.cloudflare.com/durable-objects/platform/pricing/` |
| What happens past a limit | "further operations of that type fail with an error" (Durable Objects page) | same |

**The trade.** Cloudflare free removes the pausing and adds 7 days of free point-in-time restore. In exchange, the site gets **hard daily caps**. Every database call becomes a Worker request, and past 100,000 a day they fail until midnight UTC. Step 0 measures whether real traffic fits.

## 2. Scope

### What has to be replaced (measured 12 November 2026)

| Supabase piece | Size today | Where | Replacement |
|---|---|---|---|
| Browser files that call Supabase | 25 files (grep for `.from(`, `.rpc(`, `.auth.`, `supabase` in `js/` and `functions/`) | `js/shared/*.js` mostly, plus `js/insights/insights.js` and `js/study/certificate.js` | A small `fetch` client to a new `/api/*` Worker |
| Tables | 18 in `public`, plus `auth.users` and `auth.identities` | live database | D1 tables, same names and ids |
| Database functions | 32 distinct names in `tools/supabase-*.sql` (23 files) | e.g. `save_exhibit_progress`, `verify_quiz_answer`, `issue_exhibit_certificate`, `exhibit_take_slot` | Worker route handlers |
| Triggers | 12 (rate gates, review moderation, desk guards) | `tools/supabase-*.sql` | Checks inside the Worker routes before writing |
| Row-level security | 34 `create policy` statements (some may redefine the same policy; not deduplicated) | `tools/supabase-*.sql` | Every route reads the user id from the session, never from the request |
| Scheduled job | 1: `exhibit-prune-anon`, daily at 03:17 | `tools/supabase-anon-retention.sql:42` | A Worker Cron Trigger |
| Sign-in | Google through Supabase Auth: `signInWithOAuth`, `getSession`, `onAuthStateChange`, `signOut` | `js/shared/auth.js` | Google OAuth (code flow with PKCE) in a Worker, plus an HttpOnly session cookie |
| Moderator authenticator | `auth.mfa.enroll/challenge/verify/listFactors/unenroll/getAuthenticatorAssuranceLevel`; the database requires `aal2` | `js/shared/mfa.js`, `tools/supabase-moderator-require-mfa.sql:27` | TOTP checked in the Worker (WebCrypto HMAC), stored in D1 |
| Edge telemetry | `fetch(SUPABASE_URL + "/rest/v1/exhibit_events")` | `functions/_middleware.js:42` | Direct D1 write |
| Supabase library | `vendor/supabase/supabase.js`, loaded by 8 pages | `404.html`, `account.html`, `gallery.html`, `index.html`, `insights.html`, `map.html`, `reviews.html`, `study.html` | Removed |
| Tests tied to Supabase | 12 of 71 `tools/verify/*.mjs`; 2 of 7 `tests/unit/*.mjs`; `tools/security/run_penetration_audit.mjs`; `tools/smoke.mjs` (Supabase auth health) | `tools/`, `tests/` | Rewritten for `/api/*` |
| File storage | Not used (no `storage.` bucket calls found in `js/`) | — | — |

### Not in scope

- Changing what the site does or how it looks.
- Adding sign-in methods other than Google (your decision, 12 November 2026).
- Paid Cloudflare plans. Their price was not checked.
- Carrying out any step. This document is the plan only.

## 3. Steps

Each phase is built and tested on a Cloudflare **preview** deployment. Supabase stays live and untouched until the cutover in Phase 6.

### Phase 0: Measure the traffic and freeze the inputs

1. Run `.github/workflows/db-backup.yml` and `tools/export-all-tables.sql`, and keep both copies.
2. Count real requests for several days. Use the Supabase dashboard (it showed 43 requests in the last 60 minutes on 12 November 2026) and the Cloudflare analytics. Supabase keeps API logs for only 1 day, so read them daily.
3. Work out the projected Worker requests and D1 writes per day. The heaviest source is probably the telemetry flush every 10 seconds (`FLUSH_MS = 10000` in `js/shared/insights.js:12`; `setInterval(flush, 10000)` in `js/shared/ops.js:85`).

- **Verify:** a table of requests per day, with the peak day, saved in `docs/`.
- **Stop if:** the projected peak is above about half of 100,000 Worker requests or 100,000 D1 writes a day. Then the telemetry design (Decision 3) comes first.

### Phase 1: The D1 schema and data import

1. Write `migrations/d1/0001_schema.sql` for all 18 tables plus `users` and `identities`. Map Postgres types to SQLite: `uuid` → `TEXT`, `jsonb` → `TEXT` with `json_valid` checks, `timestamptz` → ISO `TEXT`, `bigint` → `INTEGER`.
2. Write `tools/d1-import.mjs`. It turns a `tools/export-all-tables.sql` snapshot into D1 `INSERT` batches, keeping every `id` and `user_id` as it is.
3. Import into a **preview** D1 database.

- **Verify:** the row counts in D1 match the snapshot's counts table by table (on 12 November 2026: 20 tables, `exhibit_events` 8,600, `exhibit_surveys` 113, `exhibit_quiz_keys` 55, `exhibit_quiz_passes` 50, `exhibit_progress` 4, `auth.users` 5). A spot check of JSON columns shows they read back unchanged.
- **Stop if:** any count differs, or any row is over D1's 2 MB row limit.

### Phase 2: Google sign-in and sessions in a Worker

1. Add `/api/auth/start`, `/api/auth/callback`, `/api/auth/session` and `/api/auth/signout`, using Google OAuth with PKCE and `state`. Verify Google's ID token signature, `iss`, `aud` and `exp`.
2. Find the user by the Google account id in `identities`. **Existing users keep their old `id`**, so all their rows still match.
3. Store sessions in D1. Send them as a `__Host-` cookie: `HttpOnly`, `Secure`, `SameSite=Lax`. Require a same-origin check on every write.
4. Keep the `window.ScrollAuth` interface the other files use (`getClient`, `getUser`), so most callers don't change.

- **Verify:** each of the 5 existing accounts signs in on preview and gets its old user id. Unit tests show that a forged, expired or wrong-audience token is refused.
- **Stop if:** the column that holds the Google account id in `auth.identities` can't be matched one-to-one. The column names were not checked.

### Phase 3: The data API, one feature at a time

Order, lowest risk first: notes and bookmarks (`exhibit_study_data`) → progress (`save_exhibit_progress`, keeping its revision check) → quiz answers (`verify_quiz_answer`) → certificates → readers' notes and moderation → message desk → insights and telemetry → account deletion.

For each feature:
1. Port its functions, triggers and policies into `/api/*` routes. The user id always comes from the session.
2. Port the write limits (`exhibit_take_slot` and the `*_rate_gate` triggers) to the existing Durable Object or a D1 table.
3. Switch that feature's browser file from the Supabase client to `fetch('/api/…')`.
4. Port its `tools/verify/*.mjs` checks.

- **Verify:** for every policy that used to block an action (for example reading another user's progress, or approving a review without being a moderator), there is a test proving the new route refuses it too.
- **Stop if:** a route needs more than 50 D1 queries in one call, or more than 10 ms of CPU. Both are measured on preview.

### Phase 4: The moderator authenticator

1. Add TOTP enrolment and checking routes (RFC 6238, 30-second step, a small clock-drift window, and a cap on attempts).
2. Mark the session as "authenticator passed" only after a successful check. Every moderator route requires it.

- **Verify:** the moderator routes refuse a session without the check, refuse a wrong code, and lock out after repeated failures.
- **Stop if:** Decision 2 is not made.

### Phase 5: The edge, the scheduled job and clean-up

1. Point `functions/_middleware.js` telemetry at D1. Remove the Supabase key from it.
2. Add a Cron Trigger that runs the anonymous-data prune daily.
3. Remove `vendor/supabase/` and its `<script>` tags from the 8 pages. Remove the Supabase hosts from `connect-src` in `_headers`.
4. Point `tools/smoke.mjs` at `/api/auth/session` instead of the Supabase auth health URL.
5. Switch `db-backup.yml` to a D1 export.

- **Verify:** `npm run lint`, `npm run test:unit`, `npm test` and `npm run test:security` all pass. The CSP verify scripts pass. A grep for `supabase` in `js/`, `functions/`, `_headers` and `*.html` finds nothing.
- **Stop if:** any security check that passed before (22 of 22 on 12 November 2026) now fails.

### Phase 6: Cutover

1. Announce a short window. Put the site's saves into read-only mode.
2. Take a final snapshot, import it into the **production** D1, and check the counts as in Phase 1.
3. Deploy. Sign in as each test account and save progress.
4. Keep the Supabase project as it is (paused, not deleted) for 30 days as the rollback. Rollback = `npm run rollback` to the previous deployment, plus copying any new rows back.

- **Verify:** the smoke test passes, and a real user signs in and saves.
- **Stop if:** any count differs or any sign-in fails. Then roll back.

### Phase 7: Handbook

Rewrite `docs/engineering/02-how-it-works.md`, `04-security.md`, `05-performance.md` and `07-develop-test-release.md`, plus the CHANGELOG, as each phase lands (project rule in `.claude/CLAUDE.md`).

## 4. Decisions for you

| # | Decision | Options | Recommendation and evidence |
|---|---|---|---|
| 1 | How to cut over | **A.** One cutover window after everything works on preview. **B.** Run both databases side by side and sync them. | **A.** There are 5 users today (`auth.users`, 12 November 2026), so a short window costs little. Two-way sync is a large new source of bugs. |
| 2 | Moderator authenticators | **A.** Moderators set up their authenticator app again after the move. **B.** Try to copy the old secrets from Supabase. | **A.** `exhibit_moderators` has 1 row, so one person re-enrols. Whether Supabase lets you read the secrets was not checked, and copying them adds risk. |
| 3 | Telemetry volume | **A.** Keep writing events to D1, in bigger and less frequent batches. **B.** Move events to another Cloudflare product. | Decide after Phase 0. `exhibit_events` is the largest table (8,600 rows). Other Cloudflare products' free limits were not checked. |
| 4 | Is the plan worth doing now? | **A.** Do it now. **B.** Stop the pausing first with a cheap keep-alive (for example the existing 15-minute `health.yml` doing one real database read), and migrate later. | Your call. **B** takes far less work than this plan and removes the worst limit at once. Whether `health.yml`'s current check already counts as "activity" for Supabase was not checked. |

## 5. Sourced facts

| Fact | Source |
|---|---|
| Supabase Free limits (pausing, backups, logs, 500 MB, 50,000 users, 5 GB egress, 2 projects) | `https://supabase.com/pricing`, read 12 November 2026 |
| Workers Free: 100,000 requests/day, 10 ms CPU, 50 subrequests | `https://developers.cloudflare.com/workers/platform/limits/`, read 12 November 2026 |
| Pages Functions count toward the Workers quota; static files are free and unlimited | `https://developers.cloudflare.com/pages/functions/pricing/`, read 12 November 2026 |
| D1 Free: 5M reads and 100k writes per day, 500 MB per database, 10 databases, 5 GB total, 50 queries per call, 7-day Time Travel, 2 MB row limit | `https://developers.cloudflare.com/d1/platform/pricing/` and `/limits/`, read 12 November 2026 |
| Durable Objects on Free: SQLite only, 100k requests/day, 100k rows written/day; over-limit calls fail | `https://developers.cloudflare.com/durable-objects/platform/pricing/`, read 12 November 2026 |
| 25 code files, 32 functions, 12 triggers, 34 policy statements, 1 cron job, 23 SQL files | grep over `js/`, `functions/` and `tools/supabase-*.sql`, 12 November 2026 |
| 12 of 71 verify scripts, 2 of 7 unit test files, 1 security audit file mention Supabase | grep over `tools/verify/`, `tests/unit/`, `tools/security/`, 12 November 2026 |
| 8 pages load `vendor/supabase/` | grep over `*.html`, 12 November 2026 |
| 20 tables and the row counts quoted | `tools/export-all-tables.sql` run in the live SQL editor (row counts only), 12 November 2026 |
| 43 requests in the last 60 minutes; "Last backup: No backups" | Supabase project dashboard, 12 November 2026 |

## 6. Not measured / not checked

- Real daily request volume, and so whether the site fits under Cloudflare's daily caps (Phase 0 measures it).
- CPU time per request for token checks and TOTP on the 10 ms Free limit.
- The column names in `auth.identities`, and how the Google account id is stored.
- Whether Supabase lets you read stored TOTP secrets.
- Whether Cloudflare pauses or deletes inactive free D1 databases. No such limit was seen on the pages read, but this was not checked specifically.
- The price of Workers Paid or other Cloudflare products.
- How long the work takes. No estimate is given.
- Whether the 34 policy statements are 34 distinct policies.
- Whether any browser code calls Supabase through a pattern the grep missed.

## 7. Before execution

Whoever carries out a phase first writes its scope: which files it touches, what it changes, what it leaves alone, and how each step serves the goal in section 1. They present that before running anything, and write a full-mode gated plan for that phase (exact edits, measured facts, dry run, mutation and tamper tests).
