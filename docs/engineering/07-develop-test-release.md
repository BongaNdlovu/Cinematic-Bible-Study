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

**Results on 12 November 2026:** lint clean, `npm test` passes, 68 of 68 unit tests pass, and 22 of 22 security checks pass.

## Continuous integration (`.github/workflows/ci.yml`)

On every push and pull request:

1. **test** (Ubuntu, Node 22, Python 3.12): `npm ci`, lint, unit tests, installing Chromium, then `npm test`.

On a push to `master` only, after **test** passes:

2. **deploy** (Windows, `production` environment): runs `tools/deploy-cloudflare-pages.ps1` with the Cloudflare secrets.
3. **smoke**: waits 30 s, then runs `tools/smoke.mjs` against the live site.
4. **alert**: opens a GitHub issue ("Alert: … is failing") if any step failed, and closes it when the site recovers (`tools/ci/alert.mjs`).

`.github/workflows/health.yml` runs the smoke test every 15 minutes, with the same alert and recovery issues.

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
- Backups: the project is on the Supabase Free plan, which has no automatic backups (per `docs/ARCHITECTURE.md`, 26 September 2026). `tools/export-exhibit-progress.sql` and `tools/restore-exhibit-progress.mjs` export and restore progress rows.

## Checklist for every change

1. Branch from `master`.
2. Make the change. Add or update a test.
3. Run `npm run lint`, `npm run test:unit`, and `npm test`. Run `npm run test:security` if the change touches security.
4. Update this handbook and add a line to [CHANGELOG.md](CHANGELOG.md) (see [Keeping this handbook current](README.md#keeping-this-handbook-current)).
5. If the database changed, run the SQL in Supabase first.
6. Merge to `master`. CI deploys and smoke-tests it.
