# Changelog

Newest first. Every change to the site adds an entry here, in the same change. Each entry says what changed, why, and which handbook chapters were updated. See [Keeping this handbook current](README.md#keeping-this-handbook-current).

Entry template:

```
## YYYY-MM-DD — short title
**Why:** one or two sentences.
**What changed:** bullet list, with file paths.
**Handbook updated:** chapter numbers.
**Status:** committed / deployed / not yet deployed.
```

---

## 2026-11-13 — Guest human check (Turnstile)

**Why:** You asked for real bot protection. Any script with the public key could write guest study events and surveys; only rate limits stood in the way. Turnstile only protects anything when a server checks it.

**What changed** (gated plan `FIX-PLAN.md`; `gate.js pre` RESULT: PASS 39/39, `apply.js` applied 26 edits to 16 files, 4 new files, `gate.js post` RESULT: PASS 57/57)

- New `js/shared/human-pass.js`, loaded on all 8 pages after `ops.js`. Guest flushes in `js/shared/insights.js` and `js/shared/ops.js`, and guest surveys, wait for a pass.
- `functions/_middleware.js`: new `/__human-pass` route; `_routes.json` routes it.
- New `tools/supabase-human-pass.sql` (pass table, key table, grant and check functions) and `tools/supabase-human-pass-enforce.sql` (two triggers).
- `_headers`: Turnstile allowed again in `script-src` and `frame-src`, because it is now used. `tools/verify-headers.mjs` requires it.
- `js/shared/auth-config.js`: new site key `0x4AAAAAAF_kupAyw6i2kALC` (a new Turnstile widget made today). This one-line change was made after the gate, outside the plan.
- `privacy.html`: Turnstile named under Cloudflare; new `baHumanPass:<ID>` session key listed.
- `tools/security/run_penetration_audit.mjs`: PT-19 and PT-20 now expect `human_check`; new PT-23.
- New `tests/unit/human-pass.test.mjs` (17 tests). The gate caught all 15 planned mutations and all 24 tampers.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 101 of 101; `npm test` exit 0, including "csp policy: 7 pages load under the _headers policy with nothing blocked".
- Live database, 13 November 2026: `tools/supabase-human-pass.sql` run ("Success. No rows returned"). Read-only check: both tables exist with row-level security on; `anon` cannot read either; `anon` can call the grant, `authenticated` cannot; no enforcement triggers yet.

- You stored the hash of `HUMAN_PASS_KEY` in `exhibit_edge_keys` (read-only check: 1 key, 64-character hash). Deployed as `a92ae2d` (CI: test, deploy, smoke success). Live: `/__human-pass` answered 403 to a fake token (so both Cloudflare secrets are set) and 400 to no token.
- A real guest visit in a private window got a pass (12 hours) and its `sitting_start`, `onboarding` and `scroll_depth` events were stored under the same guest id. Turnstile passed without showing a widget. A headless test browser was held at the challenge, as expected.
- You ran `tools/supabase-human-pass-enforce.sql`. Read-only check: `exhibit_events_human_pass` and `exhibit_surveys_human_pass` exist and are enabled, next to the rate-gate triggers.
- `npm run test:security`: 23 passed, 0 failed, including PT-19, PT-20 and PT-23. Afterwards, 0 `pen` events, 0 `pen` surveys and 0 `pen` passes in the database.

**Handbook updated:** 03, 04, 07.

**Status:** committed, pushed, deployed, and enforced in the live database.

---

## 2026-11-13 — Stricter popup isolation and no unused Turnstile host

**Why:** Two gaps from `docs/SECURITY-ASSESSMENT-OWASP.md` (G4, G5) that needed your decision; you chose to apply both.

**What changed**

- `_headers`: `Cross-Origin-Opener-Policy: same-origin` (was `same-origin-allow-popups`). The CSP no longer allows `https://challenges.cloudflare.com`: removed from `script-src`, and `frame-src` is now `'none'`.
- `tools/verify-headers.mjs`: checks the new values. Two mutations were caught (old COOP value; Turnstile back in `frame-src`).
- `docs/SECURITY-ASSESSMENT-OWASP.md`: G4 and G5 marked fixed (F5, F6).
- Tested: `npx oxlint` exit 0; `npm run test:unit` 84 of 84; `npm test` exit 0, including "csp policy: 7 pages load under the _headers policy with nothing blocked".

**Handbook updated:** 04.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-13 — OWASP security assessment and supply-chain fixes

**Why:** You asked for the site to be assessed against the OWASP Cheat Sheet Series, and for clear gaps to be fixed.

**What changed**

- New `docs/SECURITY-ASSESSMENT-OWASP.md`: 23 points that meet the guidance, 4 gaps fixed, 7 left open with reasons (one medium: sign-in tokens in `localStorage`), and 6 things not checked. Live checks were read-only.
- `.github/workflows/ci.yml`, `db-backup.yml`, `health.yml`: `persist-credentials: false` on all 6 checkouts.
- New `.github/dependabot.yml`: weekly updates for actions and npm, 7-day cooldown.
- New `.npmrc`: `ignore-scripts=true`.
- `package-lock.json`: `npm audit fix` moved `postcss-selector-parser` from 6.1.4 to 6.1.6 (moderate advisory GHSA-rj75-hqrm-r3gf, build-time only) and dropped `cssesc`. `npm audit`: 0 vulnerabilities.
- New `tests/unit/supply-chain.test.mjs` (11 tests). Four mutations were caught.
- Tested: clean `npm ci`; `npx oxlint` exit 0; `npm run test:unit` 84 of 84; `npm test` exit 0. `npm run test:security` was not re-run (it writes to the live database).

**Handbook updated:** 03, 04, 07.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-13 — Clean up rows left by the live tests

**Why:** `npm run test:security` (PT-19, PT-20) and `tools/verify/verify_live_inserts.mjs` write real rows to the live database to prove the spam limits there. They have to write to prove it, but the rows stayed. A read-only count on 13 November 2026 found 1,328 test events and 117 test surveys, out of 8,917 events and 138 surveys. The dashboard already hid the test events (`PROBES`), and the test surveys had no rating, so no figure was wrong, but the data was cluttered.

**What changed**

- New `tools/supabase-prune-test-rows.sql`: `exhibit_prune_test_rows()` deletes only rows with no account and both test markers (see chapter 04), and returns how many it deleted. A `pg_cron` job runs it every hour at minute 23. No client role can run it.
- `tools/verify/verify_insights.mjs`: checks that both deletes are limited to rows with no account, that each test row is matched by two markers, that clients cannot run it, and the schedule. Two mutations were caught.
- Tested on a local PGlite database: it deleted the 4 test events and 2 test surveys in the sample, and kept every real, signed-in or half-matching row.
- Live check before any delete: no `pen` survey or `pen_probe` event falls outside the rules.

**Handbook updated:** 04, 07.

- Run in the live database on 13 November 2026, with the owner's go-ahead. Supabase showed its "destructive operations" warning, which was confirmed. The cron job was created (job id 2). The first run returned `deleted_events=1328 ; deleted_surveys=117`, the same as the count beforehand. A read-only check afterwards: 0 test events and 0 test surveys left; 7,591 events and 21 surveys in total (2 new events arrived between the counts); job `exhibit-prune-test-rows`, `23 * * * *`, active; neither `anon` nor `authenticated` can run the function; 22 people started a sitting since 19 October 2026, the same as before.

**Status:** committed, pushed to `master`, and run in the live database.

---

## 2026-11-13 — Count study activity from 19 October 2026

**Why:** The SID report counted every event since launch. Before 19 October 2026 events were recorded without analytics consent, and the busiest days match development and test runs: 385 starts on 24 September, 398 on 30 September, 1,470 starts by 134 browsers on 14 October (read-only query on the live database, 13 November 2026). So "607 people started a sitting" was mostly test traffic, and the report's own line "count only readers who allowed anonymous study analytics" was untrue for those dates.

**What changed**

- `js/insights/insights.js`: `ACTIVITY_COUNT_FROM = '2026-10-19T00:00:00.000Z'`. The dashboard loads and counts events and ratings from that date at the earliest (`activityCut()`, `keepActivity()`); "All time" included. `loadRange()` does the same for the SID report and passes `countFrom` to it. The status line says "study activity counted from 19 October 2026, when analytics consent began". Test hooks `setCountFrom` and `loadRange` added.
- `js/insights/sid-report.js`: events and ratings are filtered from `countFrom`. A note explains the cut when the period starts earlier. The 90-day guest-deletion note only shows when it still matters. The method page has a line on the cut.
- Not cut: welcome answers, saved progress, certificates, the project-target figures. No rows were deleted.
- Tests: `verify_insights.mjs` checks the in-memory cut, and that report queries start at 19 October for events and ratings but not for profiles. `verify_sid_report.mjs` checks the cut, the notes, and that profiles keep the whole period. Four mutations were caught (no cut in the report, no cut in the report query, no cut on the dashboard, an earlier date).
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.

**Handbook updated:** 02.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-13 — Clearer Study insights gate

**Why:** A moderator signed in with Google but without the authenticator step was told to "Sign in", although they were signed in. Seen on the live site on 13 November 2026 (session `aal1`).

**What changed**

- `js/insights/insights.js`: when the page is gated, `explainGate()` asks Supabase for the session's assurance level. If the account has an authenticator but the session has not used it (`nextLevel` `aal2`, `currentLevel` not `aal2`), the gate says "You are signed in. Enter the code from your authenticator app on the Account page to open this page." Otherwise it keeps the sign-in message. A late answer from an older check cannot overwrite a newer one (`gateGen`).
- `tools/verify/verify_insights.mjs`: five gate cases (second step needed, already `aal2`, no authenticator, signed out, failed check). Two mutations were caught.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.

**Handbook updated:** 06.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — Count "began" from server-checked quiz answers

**Why:** "Began" counted sittings marked complete in saved progress, which the browser writes. A script with a Google account could fake that and inflate the 500 and 700 figures.

**What changed**

- `tools/supabase-participation.sql`: "began" is now `exhibit_sittings_passed(u.id) >= 1`, meaning every checkpoint question of at least one sitting was answered correctly through `verify_quiz_answer()`. It no longer reads `exhibit_progress`.
- `js/insights/sid-report.js` and `js/insights/insights.js`: the labels and the "How these figures are counted" line say so.
- `tools/verify/verify_insights.mjs`: checks that the SQL counts quiz passes, never reads `journey`, and refuses non-moderators first. A mutation back to the old rule was caught.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.
- Run in the live database on 12 November 2026 ("Success. No rows returned"). A read-only check then showed: one `exhibit_participation` function, using `exhibit_sittings_passed` and not `journey`; `security definer`; `anon` cannot run it and `authenticated` can; a non-moderator call returns `42501`; `is_review_moderator()` still requires `aal2`; all 11 sittings have questions. Live counts, leaving out moderators: 4 accounts registered, 0 began under the old rule and 0 under the new one.
- Not checked: the dashboard and report while signed in as a moderator.

**Handbook updated:** 02.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — 700 counter on the Study insights page

**Why:** You want one verified number to watch: how many people have registered and begun the study, against a goal of 700.

**What changed**

- `js/insights/insights.js`: `load()` also calls `exhibit_participation()` for all time. A new first tile, "Toward 700", shows `began / 700` and the share of 700 and of the 500 SID target (`targetTile()`, `COUNTER_TARGET = 700`, `SID_TARGET = 500`).
- `tools/verify/verify_insights.mjs`: checks the tile's text, the missing and malformed cases, that the all-time count is loaded, and that the tile is rendered first. Two mutations were caught: changing the target to 600, and removing the tile from the page.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.
- Not checked: the tile on the live site while signed in as a moderator.

**Handbook updated:** 02.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — Project target in the SID report

**Why:** The proposal to the Southern Africa-Indian Ocean Division measures success as 500 people who register and begin the study within 12 months. The report could not show that: it had no count of new accounts, its "started a sitting" figure mixed in guests, and its event figures count only readers who accepted analytics.

**What changed**

- New `tools/supabase-participation.sql`: `exhibit_participation(p_from, p_to)`, a moderator-only `security definer` function. It returns accounts created in the period and how many of them have at least one completed sitting saved. Moderator accounts are left out.
- `js/insights/insights.js`: `loadRange()` calls it with the report's period.
- `js/insights/sid-report.js`: a "Project target" block on the Summary page (accounts registered, registered and began, share of the 500 target), and a line on the "How these figures are counted" page. `PARTICIPATION_TARGET = 500`.
- `tools/verify/verify_sid_report.mjs`: checks the three figures, that counts under 5 are withheld, and that a missing or malformed result says the figures are not available. Two mutations were caught: removing the block, and changing the target to 600.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0 (the SID report still fits six A4 pages); `npm run test:security` 22 of 22.
- `tools/supabase-participation.sql` was run in the live SQL editor on 12 November 2026 ("Success. No rows returned"). A read-only check then showed: `security_definer` true, `anon` cannot execute, `authenticated` can, and a call from a non-moderator session returned error `42501`.
- Not checked: a real moderator building the report on the live site.

**Handbook updated:** 02, 04.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — Keep the Supabase project awake

**Why:** Supabase pauses Free projects after 1 week of inactivity (`https://supabase.com/pricing`, read 12 November 2026). A pause takes sign-in and saving offline. Moving off Supabase is planned in `docs/MIGRATION-PLAN-CLOUDFLARE.md`, but that is large work; this stops the pausing now.

**What changed**

- `tools/smoke.mjs` now makes one real database read: `POST /rest/v1/rpc/exhibit_public_review_count` with the publishable key (the same public key as `functions/_middleware.js`). It passes only on `HTTP 200` with a number in the body. The smoke test runs every 15 minutes (`health.yml`) and after each deploy (`ci.yml`).
- New `docs/MIGRATION-PLAN-CLOUDFLARE.md`: a plan only, for moving off Supabase onto Cloudflare. Nothing in it was carried out.
- Tested: `node tools/smoke.mjs` against the live site, 22 of 22 passed, including "database answers a read (HTTP 200)". `npx oxlint` exit 0.
- Not checked: exactly which activity Supabase counts against pausing.

**Handbook updated:** 04, 07.

**Status:** committed and pushed to `master`.

---

## 2026-11-12 — Free full-database backups

**Why:** The project is on the Supabase Free plan, which has no automatic backups. The only backup tool copied `exhibit_progress`, one of the 18 tables, and the last copy in `backups/` was from 26 September 2026. Upgrading to Pro is not affordable right now.

**What changed**

- New `.github/workflows/db-backup.yml`: every Sunday at 03:00 UTC, or by hand, it runs `pg_dump` on the `public` schema and on the rows of `auth.users` and `auth.identities`. It encrypts the result with AES-256 and keeps it 90 days as an Actions artifact. A failed run opens a `ci-alert` issue. It needs two new repository secrets, `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE`.
- New `tools/export-all-tables.sql`: a hand-run SQL editor export of every `public` table plus `auth.users` and `auth.identities`, as one JSON snapshot.
- Tested: the SQL on a local PGlite database, the encrypt and decrypt round trip with `gpg`, and the export function in the live SQL editor (20 tables, row counts only). Not checked: a real workflow run and `pg_dump` against the live database.

**Handbook updated:** 03, 04, 07.

**Status:** merged and pushed to `master`. The workflow is active but does nothing useful until the two secrets are added.

---

## 2026-11-12 — Known issues fixed

**Why:** The handbook's "Known issues" list held six problems confirmed from the state-machine review. Five were fixed; the sixth turned out to be correct behaviour and is now documented as such.

**What changed**

- Question dialog: the "still loading" screen now checks every half second and moves on to the questions by itself. Its text says so (`js/study/task-flow.js`).
- Message desk: action buttons check the lock key their action really uses (`retract:<id>`, `help:<id>`), so retract and clear buttons stay disabled while their request runs. A conversation that no longer exists says so, and a failed load offers a "Try again" button (`js/shared/desk.js`).
- Notes sync: a failing pull stops after 8 retries instead of retrying every minute forever. Reconnecting or signing in starts it again (`js/shared/study-sync.js`).
- Gallery tour: pressing `T` again or `Esc`, or picking any artifact, stops the guided tour. A tour step that arrives during a transition waits instead of being skipped (`js/gallery/app.js`).
- `Insights.readingTimer()` no longer returns a value that was always 0 (`js/shared/insights.js`).
- Not changed: the notes sync recording its last push time when a push starts. That timestamp only spaces attempts apart, so this is correct.
- New tests: 2 more in `tests/unit/state-fixes.test.mjs`; both fail on the previous code. `tools/verify/verify_map_help.mjs` now checks that pressing `T` again stops the tour and that picking an artifact stops it. It used to check for the old "ignore a second `T`" line.

**Handbook updated:** 01, 02, 05, 06, 07, CHANGELOG.

**Status:** shipped in the commit that adds this entry, pushed to `master` on 12 November 2026 for the CI deploy. The deploy result is in that commit's CI run.

---

## 2026-11-12 — Four state bugs from the state-machine review

**Why:** A read-only review (`docs/implicit-state-machines.md`) was checked against the code. Four of its findings were confirmed as real bugs; one of them was a gap in the morning's own-note fix.

**What changed**

- Message desk: each in-flight lock now carries an owner token. A late reply from before a refresh can no longer release a newer request's lock or re-enable its button (`js/shared/desk.js`).
- Focus weather: one band table (`WEATHER_BANDS`) now gives the weather type, the label and the highlighted step. Before, three different threshold sets could disagree, for example "Building" over a storm (`js/study/study-app.js`).
- Map playback: one `stopPlayback()` is used everywhere. Picking a year, a search result or another year's event, scrubbing, the arrows and the arrow keys now stop the chronicle, so it no longer jumps past the reader's choice (`js/map/map.js`).
- Readers' notes: when the 4 automatic re-checks of a reader's own note run out, the message now says to reload, instead of promising another try. Coming back online restarts the checks once, instead of running a second check alongside the timer (`js/shared/reviews.js`).
- New tests: `tests/unit/state-fixes.test.mjs` (3 tests; each fails on the previous code).

**Handbook updated:** 01 (known issues), 06 (map, UI rules), CHANGELOG.

**Status:** committed as `27d9499`, deployed through CI and smoke-tested on 12 November 2026.

---

## 2026-11-12 — Audit fixes and the engineering handbook

**Why:** The November audit listed 36 findings. 29 were real problems; the other 7 were not bugs or were deliberate designs. A developer handbook was also requested, to be kept current with every change.

**What changed**

- Survey and referral figures no longer treat a missing value as "Sitting 0" (`js/shared/insights.js`).
- Switching accounts on one device no longer loses unsaved notes and progress, and never sends them to the new account (`js/shared/study-sync.js`, `js/shared/progress-sync.js`, `privacy.html`).
- Late answer checks no longer affect a sitting the reader has left (`js/study/study-app.js`).
- The question dialog survives a fast close and reopen (`js/study/task-flow.js`).
- A map tap on another year's event now flies the camera, and flights finish only on their own end (`js/map/map.js`).
- The insights report shows only the newest build (`js/insights/insights.js`).
- The gallery releases material copies on every model swap (`js/gallery/app.js`).
- The progress export survives damaged saved values (`js/study/competency.js`).
- 17 edge-case fixes across reviews, insights, Sentry, the desk, net, the focus timer, passage counting, word cards, card buttons, diagram Replay, the home carousel, gallery backgrounds and double-tap.
- Dev tooling: `start_website.bat`, `server.py` (port handling, CORS) and `wrangler.toml` (output directory).
- New tests: `tests/unit/audit-fixes.test.mjs` (8 tests).
- New documents: the `docs/engineering/` handbook, and `docs/FIX-REPORT-2026-11-12.md` (the plain-English report).

**Handbook updated:** all chapters (first version).

**Status:** committed as `f9db265`, deployed through CI and smoke-tested on 12 November 2026.
