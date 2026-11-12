# 7. Develop, test, release

**Last verified:** 12 November 2026

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
| `npm test` | The regression suite: 24 `tools/verify/verify_*.mjs` scripts plus `tools/verify-headers.mjs`. Some start `server.py` and drive Chromium through Playwright. |
| `npm run test:security` | 22 penetration-style checks (`tools/security/run_penetration_audit.mjs`) |
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

## Tests

| Suite | Where | Runs in CI |
|---|---|---|
| Unit | `tests/unit/`: middleware, rate gate, Sentry config, MFA card, report pages, and the 12 November audit fixes | Yes |
| Regression | `tools/verify/` (headers, CSP, insights, rate limits, both syncs, quiz integrity, reviews, desk, certificates, task flow, map help, moderator UI, report pages, hashing, CSS minify, page deny list, image budgets, load) | Yes |
| Security | `tools/security/run_penetration_audit.mjs` | No. Run it before security-related changes. |
| Live smoke | `tools/smoke.mjs` | After every deploy, and every 15 minutes |
| Production walkthrough | `qa-e2e/production-audit.mjs` (see the root `README.md`) | No |

**Results on 12 November 2026:** lint clean, `npm test` passes, 73 of 73 unit tests pass, and 22 of 22 security checks pass.

## Continuous integration (`.github/workflows/ci.yml`)

On every push and pull request:

1. **test** (Ubuntu, Node 22, Python 3.12): `npm ci`, lint, unit tests, installing Chromium, then `npm test`.

On a push to `master` only, after **test** passes:

2. **deploy** (Windows, `production` environment): runs `tools/deploy-cloudflare-pages.ps1` with the Cloudflare secrets.
3. **smoke**: waits 30 s, then runs `tools/smoke.mjs` against the live site.
4. **alert**: opens a GitHub issue ("Alert: … is failing") if any step failed, and closes it when the site recovers (`tools/ci/alert.mjs`).

`.github/workflows/health.yml` runs the smoke test every 15 minutes, with the same alert and recovery issues.

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
