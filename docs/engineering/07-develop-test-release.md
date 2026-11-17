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
| `npm run lint` | `oxlint` over the code. CI fails on any error. The complexity ceiling is 55 per function, set in `.oxlintrc.json`. The unused-variable rule applies to every file. Since 16 November 2026, `no-undef` is on for `js/**` with the browser environment, so a name no file defines fails lint. The three names other scripts set on `window` and read bare are declared in `globals`: `sheetsData`, `timelineEpochs` (both from `js/study/sheets/index.js`) and Leaflet's `L`. Its override for the study files was removed on 16 November 2026 (plan step 4.5): they are ES modules now, so lint sees what each file exports and imports. `.cursor/skills/complexity-ceiling/SKILL.md` says how to change the complexity ceiling. |
| `npm run test:unit` | `node --test "tests/unit/*.test.mjs"`: fast unit tests, no browser |
| `npm test` | The regression suite: 24 `tools/verify/verify_*.mjs` scripts plus `tools/verify-headers.mjs`. Some start `server.py` and drive Chromium through Playwright. It ends with three guards: `node tools/build_study_sheets.mjs --check` and `node tools/verify/build_glossary_enrichment.mjs --check` (fail when a generated file is older than its source) and `tools/verify/verify_wiring.mjs` (fails when a `verify_*.mjs` file is not run anywhere). |
| `npm run test:browser` | `tools/verify/run_browser_checks.mjs`: starts one site server and runs the 29 browser checks that pass today (see [Browser checks](#browser-checks)). Add `--include-quarantined` to run the one known-failing check too, or `--only=verify_x.mjs,verify_y.mjs` to run named ones. |
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
| Browser | `tools/verify/run_browser_checks.mjs`: mind map, story reader, flows, map, globe, horizon, theme, mobile layout and others (29 checks) | Yes, as its own job, `test-browser` |
| Security | `tools/security/run_penetration_audit.mjs` | No. Run it before security-related changes. |
| Live smoke | `tools/smoke.mjs` | After every deploy, and every 15 minutes |
| Production walkthrough | `qa-e2e/production-audit.mjs` (see the root `README.md`) | No |

**Results on 12 November 2026:** lint clean, `npm test` passes, 73 of 73 unit tests pass, and 22 of 22 security checks pass. **On 13 November 2026**, after a clean `npm ci` with `ignore-scripts=true`: lint clean, `npm test` passes, 84 of 84 unit tests pass (11 new supply-chain tests). The security checks were not re-run then. **Later on 13 November 2026**, with the guest human check enforced: 101 of 101 unit tests, and `npm run test:security` 23 of 23, writing no rows to the live database.

**On 15 November 2026** (sign-in required for every sitting), run in a sandbox with no outside network: lint clean; `verify_portal_and_hubs.mjs` passes every step when the sandbox's `ERR_TUNNEL_CONNECTION_FAILED` console lines are ignored. `verify_portal_and_hubs.mjs` and `verify_account_and_banner_e2e.mjs` fail there on untouched `master` too, only because the sandbox blocks Google Fonts and Supabase (`ERR_TUNNEL_CONNECTION_FAILED` console lines). `verify_csp_policy.mjs` fails there because it fetches a tile from `server.arcgisonline.com`. Every other `npm test` script passes. Unit test 20 in `tests/unit/human-pass.test.mjs` was failing **everywhere**, CI included: it gave the human pass a fixed expiry of 14 November 2026 02:00, so from then on the pass counted as expired. It now expires two hours after the test starts, and the unit tests pass 101 of 101. While it failed, the `test` job failed, so no push could deploy. CI on GitHub is the full check. `verify_portal_and_hubs.mjs` now checks that a guest sees every volume locked and is redirected with `next` kept, then signs in with `baQaMockSession` and checks that only the Prologue is open.

### Browser checks

Thirty-four `tools/verify/verify_*.mjs` files were not part of `npm test` before 16 November 2026. Three of them do not belong in a CI run (see the last table). One, `verify_live_inserts`, was obsolete and is deleted (see below). The other 30 now run through `run_browser_checks.mjs`:

| State | Scripts | What it means |
|---|---|---|
| In CI (29) | every other browser script, listed in `BROWSER_CHECKS` in `tools/verify/run_browser_checks.mjs` | Run by `npm run test:browser` and by the `test-browser` CI job |
| Quarantined (1) | `verify_book_reader` | Fails today. Kept in `QUARANTINED`, with its reason. Not run in CI. |

**Why they failed, and what fixed them.** On the first run, 14 of 31 passed. Every failure that was traced came from a script that had fallen behind a deliberate change to the site, not from a site bug:

| Change on the site | Scripts it broke | Fix in the script |
|---|---|---|
| A cookie dialog and an onboarding dialog block clicks on a fresh browser | the story scripts, `verify_readalong`, the mind map scripts, `verify_flow`, `verify_book_reader` | Set `sodConsent` (reject) and `baOnboardV1` before the first page loads |
| Every sitting and the map need a sign-in | `verify_map`, `verify_medal_art`, `verify_theme`, `verify_lesson_connectors`, `verify_cp07`, `verify_book_reader` | Sign in as the local test user before the first page loads |
| The lesson is read as a page-turning book, so a figure on another page sits off screen | `verify_mindmap`, `verify_mindmap_fullscreen`, `verify_flow` | Run in the reader's scroll view (`daniel_book_view = scroll`), which readers can choose too. The book itself is tested by `verify_book_reader`. |
| `applyTheme()` is no longer a global | `verify_theme` | Press the real theme button until the wanted theme shows |
| The medal "Ostrogoths driven from Rome" was renamed "Siege of Rome lifted" (commit `6d7dfb0`) | `verify_medal_art` | Look for the new name |
| The terms now say readers delete their own account, with email as the fallback (commit `6028a20`) | `verify_mobile_viewports` | Check the two current sentences |
| Survey grants were split into separate lines, and progress saves through `rpc('save_exhibit_progress')` | `verify_workbench` | Check the current lines |
| The page loads and mounts the book reader itself | `verify_book_reader` | Stop injecting a second copy; unmount the page's book before the test mounts its own |
| Checkpoints hold the book until answered (commit `788ab13`) | `verify_book_reader` | Count checkpoint plates as plates, pass the checkpoints before walking the book, and a new check (M2.0) that an unanswered checkpoint holds the book |
| Some scripts only looked for Chrome in Windows folders | `verify_hall_mural`, `verify_horizon`, and the other Chrome-driven scripts | `chromePath()` in `tools/verify/_server.mjs`: `CHROME_PATH`, then an installed Chrome, then Playwright's Chromium |

`run_browser_checks.mjs` starts one site server and passes its address to every script as `BASE` (and as `--base` where a script takes it), so no script depends on its own fixed port. A failing script's last 30 lines are printed. Each script gets 240 s, except `verify_globe.mjs`, `verify_hall_mural.mjs` and `verify_mobile_viewports.mjs`, which get 480 s (`timeoutMs` in `BROWSER_CHECKS`): on GitHub's runners, which draw WebGL in software, they took more than 240 s on 16 November 2026. The `test-browser` job's own limit is 60 minutes. The shared pieces live in `tools/verify/_server.mjs`: `cdpTargets()` (waits up to 30 s for Chrome's debugging port instead of a fixed sleep), `signedInScript()` (test sign-in, consent, onboarding and terms, with `TERMS_VERSION` read from `js/shared/journey.js` so it cannot go stale), `QA_MOCK`, and `chromePath()`.

**Still quarantined: `verify_book_reader`.** Its structural problems are fixed, and the new checkpoint check passes on every sitting. What still fails are timing and geometry checks: a step read in the middle of a turn (M2.3), the wheel throttle (M3.7), the mode after a resize (M2.7), the step count after a font-size change (M3.10), and a view height 2 px off its rule (M2.8). A separate walk with a short pause between turns reached the last step of sitting 0 on a phone, so the reader itself works. Not checked: each of those assertions one by one.

**`verify_globe` on Linux.** It passes on Windows. In the first CI run on GitHub it failed with "globe pins never appeared". It now prints WebGL support, the renderer and page errors when that happens. Not checked yet: the cause. **Watch for:** `verify_mindmap_fullscreen` failed 2 of its 50 assertions once in a full run on 16 November 2026 and passed alone straight after, so it may be timing-sensitive. `verify_horizon` and `verify_lesson_connectors` failed on Windows when driven by Playwright's Chromium instead of the installed Chrome; not checked why.

Four files are not in CI on purpose. `verify_wiring.mjs` lists them in `NOT_IN_CI`, each with its reason:

| Script | Why it is not in CI |
|---|---|
| `verify_all.mjs` | Drives Chrome by hand over the whole site. Kept for manual runs. |
| `verify_load_live.mjs` | Loads the live production site. |
| `verify_pending_migrations.mjs` | Needs access to the production database. |
| `verify_equivalence.mjs` | Compares two versions given on the command line. Covered by `tests/unit/equivalence.test.mjs`. |
| `verify_moved_functions.mjs` | Checks that named functions and constants have the same syntax tree after a move between files (`--before`, `--after`, `--names`). Covered by `tests/unit/moved-functions.test.mjs`. |

`verify_live_inserts.mjs` was deleted on 16 November 2026. It posted a guest event and a guest survey to the production database and expected 201. Guest writes now need a human check, so production answers 400 `human_check`. When it was run that day, both inserts were rejected, so nothing was written.

### Proving that a move changed nothing

`node tools/verify/verify_equivalence.mjs --before <folder|git:REV> --after <folder|git:REV>` compares code, not text. JavaScript is parsed with `acorn` and compared statement by statement, so comments, spacing and quote style do not count. CSS is parsed with `postcss` and compared as an ordered list of rules and declarations, so a reordered rule counts as a difference, because order is the cascade. Options: `--files a.js,b.css` to compare named files; `--before-files a.css --after-files x.css,y.css` to compare one file with the joined content of several (for a split); `--git-dir` to name the repository for `git:` sources. It exits 1 and names the first differing statement and line when anything differs. Use it for every step of Phases 3 to 5 of the architecture plan.

`node tools/measure_baseline.mjs` prints the size and function-length figures that those steps are compared against. The figures taken on 16 November 2026 are in [the architecture baseline](architecture-baseline.md).

## Continuous integration (`.github/workflows/ci.yml`)

On every push and pull request:

1. **test** (Ubuntu, Node 22, Python 3.12): `npm ci`, lint, unit tests, installing Chromium, then `npm test`.
2. **test-browser** (Ubuntu, Node 22, Python 3.12): `npm ci`, installing Chromium, then `npm run test:browser`. It passed on GitHub on 17 November 2026 (run 43970504324), after the timing fixes in the changelog. Since then **deploy** waits for it as well as for **test** (`needs: [test, test-browser]`), so a push to `master` deploys only when the browser checks pass.

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
- Backups: the project is on the Supabase Free plan, which has no automatic backups (per `docs/archive/2026-09-10-ARCHITECTURE.md`, 26 September 2026). So the repo makes its own. See [Database backups](#database-backups).

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
