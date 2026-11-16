# 7. Develop, test, release

**Last verified:** 16 November 2026

## Running the site locally

| Way | Command |
|---|---|
| Python (the only runtime needed to view the site) | `python server.py`. Add `--no-browser` to skip opening a browser. |
| Windows | Double-click `start_website.bat`. It tries `py -3`, then `python`. |
| npm | `npm start` (runs `python server.py`) |

The server binds `127.0.0.1`. It starts at port 8000, or at `PORT` if that is set to a valid number, and tries up to 10 ports in a row. If all of them are busy, it prints which ports to free and exits.

**Local pages use the real Supabase project.** Signing in and saving locally changes real data. For tests, `localStorage.baQaMockSession = JSON.stringify({ user: { id: "…" } })` stands in for a signed-in user. It works on localhost only.

**Previewing locked sittings locally:** `study.html?preview=full`. This works on localhost only.

## npm scripts

| Script | What it does |
|---|---|
| `npm run lint` | `oxlint` over the code. CI fails on any error. The complexity ceiling is 55 per function (see `docs/ARCHITECTURE.md`). |
| `npm run test:unit` | `node --test "tests/unit/*.test.mjs"`: fast unit tests, no browser |
| `npm test` | The regression suite: 24 `tools/verify/verify_*.mjs` scripts plus `tools/verify-headers.mjs`. Some start `server.py` and drive Chromium through Playwright. It ends with three guards: `node tools/build_study_sheets.mjs --check` and `node tools/verify/build_glossary_enrichment.mjs --check` (fail when a generated file is older than its source) and `tools/verify/verify_wiring.mjs` (fails when a `verify_*.mjs` file is not run anywhere). |
| `npm run test:browser` | `tools/verify/run_browser_checks.mjs`: starts one site server and runs the 20 browser checks that pass today (see [Browser checks](#browser-checks)). Add `--include-quarantined` to run the 10 known-failing ones too, or `--only=verify_x.mjs,verify_y.mjs` to run named ones. |
| `npm run test:security` | 23 penetration-style checks (`tools/security/run_penetration_audit.mjs`). Since 13 November 2026 PT-19 and PT-20 prove that guest writes without a human pass are refused, so they no longer leave rows behind; `exhibit_prune_test_rows()` still clears any that appear. |
| `npm run smoke` | Smoke test of the live site (`tools/smoke.mjs`) |
| `npm run build:tailwind` | Rebuild `css/study-tailwind.css` |
| `npm run compress`, `compress:beasts`, `compress:daniel8`, `compress:visions`, `compress:daniel11` | Rebuild compressed 3D models from `models/originals/` |
| `npm run deploy:pages` | Run the deploy script by hand |
| `npm run rollback` | Restore the previous successful production deployment |

### Generated files: rebuild after editing their source

| Edit | Then run |
|---|---|
| `js/study/sheets-data.js` | `node tools/build_study_sheets.mjs` (writes `js/study/sheets/`) |
| `css/study-tailwind-src.css` or `tailwind.study.config.js` | `npm run build:tailwind` |
| Shelf content | `node tools/build-shelf-data.mjs` (the deploy runs it too) |
| `js/study/glossary-enrichment-overrides.json` | `node tools/verify/build_glossary_enrichment.mjs` |

`npm test` checks the first and last rows with `--check`: it fails, and names the rebuild command, when `js/study/sheets/` or `js/study/glossary-enrichment.js` no longer matches its source. The glossary check ignores Windows line endings. The sheet files are always written with CRLF (`.gitattributes`), so that check compares them as they are.

## Tests

| Suite | Where | Runs in CI |
|---|---|---|
| Unit | `tests/unit/`: middleware, rate gate, Sentry config, MFA card, report pages, and the 12 November audit fixes | Yes |
| Regression | `tools/verify/` (headers, CSP, insights, rate limits, both syncs, quiz integrity, reviews, desk, certificates, task flow, map help, moderator UI, report pages, hashing, CSS minify, page deny list, image budgets, load) | Yes |
| Browser | `tools/verify/run_browser_checks.mjs`: mind map, story reader, book reader, flows, map, horizon, mobile layout and others (20 checks) | Yes, as its own job, `test-browser` |
| Security | `tools/security/run_penetration_audit.mjs` | No. Run it before security-related changes. |
| Live smoke | `tools/smoke.mjs` | After every deploy, and every 15 minutes |
| Production walkthrough | `qa-e2e/production-audit.mjs` (see the root `README.md`) | No |

**Results on 12 November 2026:** lint clean, `npm test` passes, 73 of 73 unit tests pass, and 22 of 22 security checks pass. **On 13 November 2026**, after a clean `npm ci` with `ignore-scripts=true`: lint clean, `npm test` passes, 84 of 84 unit tests pass (11 new supply-chain tests). The security checks were not re-run then. **Later on 13 November 2026**, with the guest human check enforced: 101 of 101 unit tests, and `npm run test:security` 23 of 23, writing no rows to the live database.

**On 15 November 2026** (sign-in required for every sitting), run in a sandbox with no outside network: lint clean; `verify_portal_and_hubs.mjs` passes every step when the sandbox's `ERR_TUNNEL_CONNECTION_FAILED` console lines are ignored. `verify_portal_and_hubs.mjs` and `verify_account_and_banner_e2e.mjs` fail there on untouched `master` too, only because the sandbox blocks Google Fonts and Supabase (`ERR_TUNNEL_CONNECTION_FAILED` console lines). `verify_csp_policy.mjs` fails there because it fetches a tile from `server.arcgisonline.com`. Every other `npm test` script passes. Unit test 20 in `tests/unit/human-pass.test.mjs` was failing **everywhere**, CI included: it gave the human pass a fixed expiry of 14 November 2026 02:00, so from then on the pass counted as expired. It now expires two hours after the test starts, and the unit tests pass 101 of 101. While it failed, the `test` job failed, so no push could deploy. CI on GitHub is the full check. `verify_portal_and_hubs.mjs` now checks that a guest sees every volume locked and is redirected with `next` kept, then signs in with `baQaMockSession` and checks that only the Prologue is open.

### Browser checks

Thirty-four `tools/verify/verify_*.mjs` files were not part of `npm test`. Three of them do not belong in a CI run: `verify_all`, `verify_load_live` and `verify_pending_migrations`. The other 31 were run once each on 16 November 2026, on a Windows machine with the local working tree, through `run_browser_checks.mjs`. One of the 31, `verify_live_inserts`, turned out to be obsolete and was taken out of the list. The other 30 gave this result:

| State | Scripts | What it means |
|---|---|---|
| Pass (20) | `verify_bridge_copy`, `verify_bridge_panel`, `verify_globe`, `verify_grounding_quotes`, `verify_hall_mural`, `verify_horizon`, `verify_mindmap_fullscreen_fit`, `verify_mindmap_legibility`, `verify_onevoice27`, `verify_photo_y`, `verify_readalong`, `verify_scripture`, `verify_sitting4_fixes`, `verify_story_layers`, `verify_story_mobile`, `verify_story_reader`, `verify_story_themes`, `verify_study_page_load`, `verify_verify_pack_quotes`, `verify_workbench` | Run by `npm run test:browser` and by the `test-browser` CI job |
| Quarantined (10) | listed below | Fail today. Kept in `QUARANTINED` in `tools/verify/run_browser_checks.mjs`, each with its reason. They do not run in CI. |

Six of the 20 passes needed a fix to the script, not to the site. The site now asks for cookie consent and shows an onboarding dialog, which blocked clicks. `verify_readalong`, `verify_story_layers`, `verify_story_mobile`, `verify_story_reader` and `verify_story_themes` now set `sodConsent` (reject) before the first page loads, and `verify_story_layers`, `verify_story_mobile` and `verify_story_themes` also set `baOnboardV1`. `verify_book_reader`, `verify_flow`, `verify_mindmap` and `verify_mindmap_fullscreen` got the same lines but still fail for other reasons (see the quarantine table). `verify_workbench` had two stale assertions. It expected the survey grant line `to authenticated, anon` (the file now has separate lines for `authenticated` and `anon`), and it looked for `upsert` in `js/shared/progress-sync.js`, which now saves through `rpc('save_exhibit_progress')`. It now checks the current lines.

| Quarantined script | Failure seen on 16 November 2026 |
|---|---|
| `verify_book_reader` | Times out after 240 s. Assertions M2.8 (plate steps) and M3.1 (next button) fail. |
| `verify_cp07` | Check 5 fails: classroom projection mode never appears at `study.html?project=1`. |
| `verify_flow` | Fails. Cause not investigated. |
| `verify_lesson_connectors` | Sitting 0 reports an empty list of sitting-path steps. Cause not investigated. |
| `verify_map` | Uncaught page error in its first evaluate (`verify_map.mjs:139`). Cause not investigated. |
| `verify_medal_art` | The map has no medal named "Ostrogoths driven from Rome" in the year it checks. |
| `verify_mindmap` | 2 of 78 assertions fail, including 390x844 "the block stays inside the viewport". |
| `verify_mindmap_fullscreen` | The press on the `s2-4` full-screen control lands on another element. |
| `verify_mobile_viewports` | An assertion fails (expected true, got false). Cause not investigated. |
| `verify_theme` | Uncaught page error in its first evaluate (`verify_theme.mjs:98`). Cause not investigated. |

Not checked: whether any of the ten fail on a clean checkout of `master`. The run included uncommitted local edits to `js/study/mindmap.js`, `js/study/book-reader.js`, `js/study/study-app.js` and `css/study-page.css`.

Five other files are not in CI on purpose. `verify_wiring.mjs` lists them in `NOT_IN_CI`, each with its reason:

| Script | Why it is not in CI |
|---|---|
| `verify_all.mjs` | Drives Chrome by hand over the whole site. Kept for manual runs. |
| `verify_load_live.mjs` | Loads the live production site. |
| `verify_pending_migrations.mjs` | Needs access to the production database. |
| `verify_live_inserts.mjs` | Obsolete. It posts to the production database and expects 201. Guest writes now need a human check, so production answers 400 `human_check` (both inserts were rejected when it was run on 16 November 2026, so nothing was written). Candidate for deletion. |
| `verify_equivalence.mjs` | Compares two versions given on the command line. Covered by `tests/unit/equivalence.test.mjs`. |

### Proving that a move changed nothing

`node tools/verify/verify_equivalence.mjs --before <folder|git:REV> --after <folder|git:REV>` compares code, not text. JavaScript is parsed with `acorn` and compared statement by statement, so comments, spacing and quote style do not count. CSS is parsed with `postcss` and compared as an ordered list of rules and declarations, so a reordered rule counts as a difference, because order is the cascade. Options: `--files a.js,b.css` to compare named files; `--before-files a.css --after-files x.css,y.css` to compare one file with the joined content of several (for a split); `--git-dir` to name the repository for `git:` sources. It exits 1 and names the first differing statement and line when anything differs. Use it for every step of Phases 3 to 5 of the architecture plan.

`node tools/measure_baseline.mjs` prints the size and function-length figures that those steps are compared against. The figures taken on 16 November 2026 are in [the architecture baseline](architecture-baseline.md).

## Continuous integration (`.github/workflows/ci.yml`)

On every push and pull request:

1. **test** (Ubuntu, Node 22, Python 3.12): `npm ci`, lint, unit tests, installing Chromium, then `npm test`.
2. **test-browser** (Ubuntu, Node 22, Python 3.12): `npm ci`, installing Chromium, then `npm run test:browser`. Not checked: a run of this job on GitHub. It is also not a condition of **deploy** yet; make **deploy** wait for it once it has passed there.

On a push to `master` only, after **test** passes:

3. **deploy** (Windows, `production` environment): runs `tools/deploy-cloudflare-pages.ps1` with the Cloudflare secrets.
4. **smoke**: waits 30 s, then runs `tools/smoke.mjs` against the live site.
5. **alert**: opens a GitHub issue ("Alert: … is failing") if any step failed, and closes it when the site recovers (`tools/ci/alert.mjs`).

`.github/workflows/health.yml` runs the smoke test every 15 minutes, with the same alert and recovery issues.

**Keep-alive.** The smoke test ends with one real database read: it calls the public function `exhibit_public_review_count` through the Supabase REST API with the publishable key, and expects a number back. Supabase pauses Free projects "after 1 week of inactivity" (`https://supabase.com/pricing`, read 12 November 2026), so a read every 15 minutes is meant to keep the project awake. Not checked: exactly which activity Supabase counts. The sign-in health URL alone may not touch the database, so it was not relied on.

**Watch for:** GitHub turns off scheduled workflows in a public repository "when no repository activity has occurred in 60 days" (GitHub docs, "Disabling and enabling a workflow", read 12 November 2026). If the repo has no commits for 60 days, `health.yml` and `db-backup.yml` stop, and so does the keep-alive. Turn them back on from the Actions tab.

`.github/workflows/db-backup.yml` backs up the database every week. See [Database backups](#database-backups).

> **A push to `master` deploys to production.** Work on a branch until the change is ready.

## Deploying

`tools/deploy-cloudflare-pages.ps1` does the following:

1. Builds the shelf data (`tools/build-shelf-data.mjs`).
2. Copies the repo into a fresh `.pages-deploy/`, leaving out dev folders, sources, tools, docs, tests, `functions/` source, `workers/`, `fix-plan/`, `_mig/`, `_factcheck/`, original models, and every dotfile.
3. **Refuses to deploy** if any private or dev-only file is still in the bundle, or if `_headers`, `_routes.json` or the minified three.js files are missing.
4. Minifies CSS (`tools/minify-release-css.mjs`).
5. Fingerprints asset names and rewrites their references (`tools/hash-release-assets.mjs`).
6. Runs `npx wrangler pages deploy .pages-deploy --project-name=cinematic-bible-study-daniel --branch=main` **from the repo root**, so Wrangler also compiles `functions/` from the root.

### Rolling back

`npm run rollback`, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set, restores the previous successful production deployment through the Cloudflare API. The Cloudflare dashboard can do the same.

## Database changes

- Migrations are SQL files in `tools/supabase-*.sql`. They are run **by hand** in the Supabase SQL editor. Nothing applies them automatically.
- Run a migration **before** deploying the client that depends on it. For example, the answer check fails closed until `verify_quiz_answer` exists.
- Never rename `save_exhibit_progress(bigint, jsonb)`. A breaking change ships as a new function, together with the client that uses it.
- Backups: the project is on the Supabase Free plan, which has no automatic backups (per `docs/ARCHITECTURE.md`, 26 September 2026). So the repo makes its own. See [Database backups](#database-backups).

## Database backups

There are two ways, and both cost nothing.

| Way | Covers | How often | Where the copy goes |
|---|---|---|---|
| `.github/workflows/db-backup.yml` | Every table, function and row-level security policy in `public`, plus the rows of `auth.users` and `auth.identities` | Every Sunday at 03:00 UTC, or by hand from the Actions tab | An encrypted GitHub Actions artifact, kept 90 days |
| `tools/export-all-tables.sql` | The rows of every table in `public`, plus `auth.users` and `auth.identities` | By hand | A JSON file you save yourself |

**Why `auth.users` is included.** Every saved row points at a user id. A new project would give the same Google account a new id, so restoring the data without the old user rows would leave it pointing at nobody.

**Why the workflow encrypts.** The repository is public. Artifacts of a public repository can be downloaded by any signed-in GitHub user, so the dump is encrypted with AES-256 before upload, and the unencrypted files are shredded on the runner.

### Setting up the weekly backup (once)

1. In Supabase, open **Connect** and copy the **Session pooler** connection string. The runner has no IPv6, so the direct connection does not work there. Put your database password into it.
2. In GitHub, open **Settings → Secrets and variables → Actions** and add two secrets:
   - `SUPABASE_DB_URL`: the connection string from step 1.
   - `BACKUP_PASSPHRASE`: a long passphrase. Store it in your password manager. Without it the backups cannot be opened.
3. Open **Actions → db-backup → Run workflow** once, and check that the run is green and has an artifact.

A failed run opens a `ci-alert` issue, as the health check does (`tools/ci/alert.mjs`).

### Making a copy by hand

1. Open the Supabase SQL editor and run `tools/export-all-tables.sql`. It defines a temporary function in `pg_temp`, so nothing is left in the database.
2. Save the `snapshot` cell as `backups/all-tables-<UTC time>.json`. The `backups/` folder is in `.gitignore`. The file holds user emails, so keep it off shared drives.

On 12 November 2026 the snapshot was about 2.8 million characters. Not checked: whether the SQL editor lets you copy a cell that large in full. If the saved file does not end with `}`, it was cut off; use the weekly backup instead.

### Restoring

From the weekly backup (needs the Postgres 17 client, `pg_restore`):

```bash
gpg --decrypt db-backup-<time>.tar.gz.gpg | tar -xzf -
pg_restore --dbname "<connection string>" --no-owner --no-privileges dump/auth-users.dump
pg_restore --dbname "<connection string>" --no-owner --no-privileges dump/public.dump
```

Restore the user rows first, because the `public` tables refer to them.

From a hand-made snapshot, one table at a time in the SQL editor:

```sql
insert into public.exhibit_progress
select * from jsonb_populate_recordset(null::public.exhibit_progress, '<the table''s JSON array>'::jsonb);
```

`tools/restore-exhibit-progress.mjs` still builds a restore script for progress rows only, from the older `tools/export-exhibit-progress.sql` snapshot.

### What was tested (12 November 2026)

- `tools/export-all-tables.sql` ran on a local PGlite database (Postgres in Node). It exported every `public` table, including an empty one, and `auth.users` and `auth.identities`. It skipped views and other `auth` tables. Text with quotes, `<`, `>` and `&` came back unchanged, and `jsonb_populate_recordset` turned the JSON back into the same row.
- The encryption command from the workflow was run locally with `gpg`. Decrypting with the right passphrase gave back the file. A wrong passphrase failed (exit code 2).
- The function in `tools/export-all-tables.sql` ran in the live SQL editor, with a final query that showed only row counts, not the data. It exported 20 tables: all 18 in `public`, plus `auth.users` (5 rows) and `auth.identities` (5 rows). The largest table was `exhibit_events` (8,600 rows). The whole snapshot was 2,814,727 characters.
- Not checked: the workflow itself has not run yet, because it needs the two secrets. The `pg_dump` commands have not been run against the live database.

## Checklist for every change

1. Branch from `master`.
2. Make the change. Add or update a test.
3. Run `npm run lint`, `npm run test:unit`, and `npm test`. Run `npm run test:security` if the change touches security.
4. Update this handbook and add a line to [CHANGELOG.md](CHANGELOG.md) (see [Keeping this handbook current](README.md#keeping-this-handbook-current)).
5. If the database changed, run the SQL in Supabase first.
6. Merge to `master`. CI deploys and smoke-tests it.
