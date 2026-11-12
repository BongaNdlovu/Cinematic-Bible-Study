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

## 2026-11-12 — Free full-database backups

**Why:** The project is on the Supabase Free plan, which has no automatic backups. The only backup tool copied `exhibit_progress`, one of the 18 tables, and the last copy in `backups/` was from 26 September 2026. Upgrading to Pro is not affordable right now.

**What changed**

- New `.github/workflows/db-backup.yml`: every Sunday at 03:00 UTC, or by hand, it runs `pg_dump` on the `public` schema and on the rows of `auth.users` and `auth.identities`. It encrypts the result with AES-256 and keeps it 90 days as an Actions artifact. A failed run opens a `ci-alert` issue. It needs two new repository secrets, `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE`.
- New `tools/export-all-tables.sql`: a hand-run SQL editor export of every `public` table plus `auth.users` and `auth.identities`, as one JSON snapshot.
- Tested: the SQL on a local PGlite database, and the encrypt and decrypt round trip with `gpg`. Not checked: a real workflow run and `pg_dump` against the live database.

**Handbook updated:** 03, 04, 07.

**Status:** not committed. The workflow does nothing useful until the two secrets are added.

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
