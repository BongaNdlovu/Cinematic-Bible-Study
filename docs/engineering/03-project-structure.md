# 3. Project structure

**Last verified:** 12 November 2026

The site has no build step for its pages. The files in the repository root and in `js/`, `css/`, `assets/`, `bible/`, `models/` and `vendor/` are what browsers download. The deploy script copies them into a clean folder, then minifies the CSS and fingerprints the file names (see [Develop, test, release](07-develop-test-release.md#deploying)).

## Top level

```
.
├── *.html                 Pages (served as they are)
├── _headers               Cloudflare cache and security headers, CSP
├── _routes.json           Which paths run the edge middleware
├── functions/             Cloudflare Pages Functions: _middleware.js
├── workers/               exhibit-rate-gate Worker (Durable Object rate counters)
├── js/                    Browser code (classic scripts plus one ES module for the gallery)
├── css/                   Stylesheets (study-tailwind.css is generated)
├── assets/                Images: hall, maps, plates, shelf covers, site, study, thumbs
├── bible/                 KJV Daniel, Strong's subset, sitting passage highlights (JSON)
├── models/                3D models (.glb, Meshopt-compressed)
├── vendor/                Pinned third-party code: three, leaflet, supabase, sentry
├── tests/unit/            node:test unit tests (npm run test:unit)
├── tools/                 Build, verify, deploy, SQL, audit and content scripts
├── docs/                  Documentation (this handbook lives in docs/engineering/)
├── server.py              Local static server
├── start_website.bat      Windows launcher for server.py
├── wrangler.toml          Cloudflare Pages settings and Durable Object binding
├── package.json           npm scripts and dev dependencies
├── .npmrc                 ignore-scripts=true: npm runs no package install scripts
└── .github/               workflows/: CI (ci.yml), the 15-minute live health check (health.yml) and the weekly database backup (db-backup.yml); dependabot.yml: weekly update proposals
```

Folders that are **never deployed**. `tools/deploy-cloudflare-pages.ps1` leaves them out and refuses to ship if some of them slip in; the middleware also answers 404 for most of these paths: `docs/`, `tools/`, `tests/`, `functions/` (its source), `workers/`, `backups/`, `qa/`, `qa-e2e/`, `fix-plan/`, `_mig/`, `_factcheck/`, `models/originals/`, `assets/_glb_preview/`, and every dotfile.

## Pages and their scripts

Every page loads `cinema.css`, `terms.css` and `consent.css`. All except `privacy.html` and `terms.html` also load `desk.css`.

| Page | Page-specific scripts (after the shared base) | Page stylesheets |
|---|---|---|
| `index.html` | `covers.js`, `reviews.js`, `progress-sync.js`, `insights.js`, `onboard.js`, `ui-sound.js`, `ui-click-sound.js`, `js/home/home.js`, `shelf-data.js`, `shelf.js` | `site.css`, `shelf.css`, `onboard.css` |
| `study.html` | `book-open.js` (in the head), `progress-sync.js`, `study-sync.js`, `quiz-gate.js`, `insights.js`, `onboard.js`, sounds, `reviews.js`, then `js/study/`: `scripture.js`, `workbench.js`, `competency.js`, `sheets/index.js`, `sheet-map.js`, `sheet-verify.js`, `term-overlay.js`, `card-min.js`, `glossary-enrichment.js`, `sheet-glossary.js`, `book-reader.js`, `study-app.js`, `lesson-player.js`, `task-flow.js`, `audio-orb.js`, `page-actions.js`. `certificate.js` and the per-sitting text load on demand. | `study-tailwind.css`, `study-page.css`, `book-reader.css`, `book-open.css`, `task-flow.css`, `study-audio.css`, `onboard.css` |
| `map.html` | `vendor/leaflet`, `insights.js`, sounds, `js/study/sheet-map.js`, `js/map/map-data.js`, `js/map/map.js` (which loads `js/map/globe.js` on demand) | `map.css` |
| `gallery.html` | `insights.js`, `ui-sound.js`, then `js/gallery/app.js` as an ES module (three.js through an import map) | `app.css` |
| `account.html` | `covers.js`, `mfa.js`, `insights.js`, `progress-sync.js`, `study-sync.js`, `reviews.js`, `account.js` | `site.css`, `notes.css`, `account.css` |
| `reviews.html` | `insights.js`, `reviews.js` | `site.css`, `notes.css` |
| `insights.html` | `insights.js`, `js/insights/sid-report.js`, `js/insights/insights.js` | `site.css`, `insights.css`, `sid-report.css` |
| `privacy.html`, `terms.html` | Sentry, `cinema.js`, `consent.js` only | `site.css`, `account.css` |
| `404.html` | Shared base only | `site.css` |

**Shared base** (most pages): Sentry, `cinema.js`, `journey.js`, `auth-config.js`, Supabase, `net.js`, `errors.js`, `ops.js`, `auth.js`, `desk.js`, `terms.js`, `consent.js`, all under `js/shared/`.

To check the current list, run:

```bash
grep -oE '<script[^>]+src="[^"]+"' study.html
```

## `js/` by folder

| Folder | What lives there | Main files |
|---|---|---|
| `js/shared/` | Code used by many pages: sign-in, access rules, sync, analytics, errors, network, consent, terms, desk, reviews, account | `journey.js`, `auth.js`, `progress-sync.js`, `study-sync.js`, `quiz-gate.js`, `insights.js`, `ops.js`, `net.js`, `errors.js`, `consent.js`, `desk.js`, `reviews.js`, `account.js`, `mfa.js`, `sentry.js` |
| `js/study/` | The study desk | `study-app.js` (the page controller), `book-reader.js`, `mindmap.js`, `task-flow.js`, `term-overlay.js`, `workbench.js`, `competency.js`, `certificate.js`, `scripture.js` |
| `js/study/sheets/` | The 11 sittings, one file each, plus `index.js` (the list and the on-demand loader). **Generated** from `js/study/sheets-data.js` by `node tools/build_study_sheets.mjs`. | `index.js`, `sheet-0.js` … `sheet-10.js` |
| `js/map/` | The map | `map.js` (engine), `map-data.js` (kingdoms, cities, events, routes), `globe.js` (3D globe view) |
| `js/gallery/` | The 3D gallery | `app.js` (scene, artifact registry `ASSET_REGISTRY`, model cache) |
| `js/home/` | The home shelf | `shelf.js` (3D shelf), `shelf-data.js` (generated by `tools/build-shelf-data.mjs`), `home.js` |
| `js/insights/` | The moderator dashboard | `insights.js`, `sid-report.js` |

## Source files that are not served

| File | Role |
|---|---|
| `js/study/sheets-data.js` | Source of all sitting content. Edit this, then rebuild `js/study/sheets/`. |
| `css/study-tailwind-src.css`, `tailwind.study.config.js` | Source for `css/study-tailwind.css` (`npm run build:tailwind`) |
| `js/study/glossary-enrichment-overrides.json` | Input for `js/study/glossary-enrichment.js` (`tools/verify/build_glossary_enrichment.mjs`) |
| `vendor/three/build/three.core.js`, `three.module.js` | Unminified three.js; the site serves the `.min.js` files |

The deploy script refuses to ship if any of these are in the bundle.

## `tools/`

| Path | Purpose |
|---|---|
| `tools/deploy-cloudflare-pages.ps1` | Build and deploy the production bundle |
| `tools/hash-release-assets.mjs`, `tools/minify-release-css.mjs` | Fingerprint file names and minify CSS during the deploy |
| `tools/build_study_sheets.mjs`, `tools/build-shelf-data.mjs` | Generate the per-sitting files and the shelf data |
| `tools/supabase-*.sql` | Database migrations, run by hand in the Supabase SQL editor |
| `tools/verify/` | The regression suite behind `npm test`, plus screenshot helpers |
| `tools/security/run_penetration_audit.mjs` | `npm run test:security` |
| `tools/smoke.mjs` | Live-site smoke test (CI after each deploy, and every 15 minutes) |
| `tools/ci/alert.mjs` | Opens or closes a GitHub issue when the live site fails or recovers |
| `tools/rollback-deploy.mjs` | `npm run rollback` |
| `tools/restore-exhibit-progress.mjs`, `tools/export-exhibit-progress.sql` | Progress backup and restore |
| `tools/export-all-tables.sql` | Hand-run copy of every `public` table plus `auth.users` and `auth.identities` |
| `tools/compress/` | Meshopt and WebP pipeline for 3D models (`npm run compress*`) |
| `tools/audit/`, `tools/review/`, `tools/diagrams/`, `tools/audio-read/`, `tools/perf/` | One-off inspection, editorial review, diagram, audio and performance helpers |
| `tools/build_sheet*_html.py`, `tools/patch_sheet*_data.py`, `tools/sheet*_generated.html` | Older content-building scripts and their output |

## Where new work goes

| Adding… | Put it in |
|---|---|
| Sitting text, questions or a study guide | `js/study/sheets-data.js`, then `node tools/build_study_sheets.mjs`. Answer keys go in the database (`exhibit_quiz_keys`), never in the client. |
| A Strong's line or verse highlights | `bible/strongs-daniel.json`, `bible/sheet-passages.json` |
| A map year, city, event or route | `js/map/map-data.js` |
| A 3D artifact | `models/*.glb` (compressed with `tools/compress/`), plus `ASSET_REGISTRY` in `js/gallery/app.js`, plus a plate and thumbnail under `assets/` |
| Code shared by pages | `js/shared/`, then add the `<script>` tag to each page that needs it |
| A database change | A new `tools/supabase-<topic>.sql`, run in Supabase **before** deploying the client that needs it |
| A new storage key | Add it to the storage table in `privacy.html`, and to `PERSONAL_KEYS` in `js/shared/auth.js` if sign-out must clear it |
| A test | `tests/unit/*.test.mjs` (fast, `node:test`) or `tools/verify/verify_*.mjs` (browser and integration, then add it to the `test` script in `package.json`) |
