# 3. Project structure

**Last verified:** 18 November 2026

The site has no build step for its pages. The files in the repository root and in `js/`, `css/`, `assets/`, `bible/`, `models/` and `vendor/` are what browsers download. The deploy script copies them into a clean folder, then minifies the CSS and fingerprints the file names (see [Develop, test, release](07-develop-test-release.md#deploying)).

## Top level

```
.
├── *.html                 Pages (served as they are)
├── _headers               Cloudflare cache and security headers, CSP
├── _routes.json           Which paths run the edge middleware
├── functions/             Cloudflare Pages Functions: _middleware.js
├── workers/               exhibit-rate-gate Worker (Durable Object rate counters)
├── js/                    Browser code: core/, features/, content/, pages/<page>/ (see The layout rule)
├── css/                   Stylesheets, mirroring js/: core/, features/, pages/<page>/ (css/pages/study/study-tailwind.css is generated)
├── assets/                Images: hall, maps, plates, shelf covers, site, study, thumbs
├── bible/                 KJV Daniel, Strong's subset, sitting passage highlights (JSON)
├── models/                3D models (.glb, Meshopt-compressed)
├── vendor/                Pinned third-party code: three, leaflet, supabase, sentry
├── tests/unit/            node:test unit tests (npm run test:unit)
├── tools/                 Build, verify, deploy, audit and content scripts, plus hand-run SQL exports
├── db/migrations/         Database migrations, numbered in run order (never deployed)
├── _mig/                  Diagram source: specN.json (authored specs) and sheetN.json (extracted artwork). tools/diagrams/ merges them into sheets-data.js; verify_flow.mjs reads them. Never deployed.
├── docs/                  engineering/ (this handbook) and archive/ (dated older papers)
├── server.py              Local static server
├── start_website.bat      Windows launcher for server.py
├── wrangler.toml          Cloudflare Pages settings and Durable Object binding
├── package.json           npm scripts and dev dependencies
├── .npmrc                 ignore-scripts=true: npm runs no package install scripts
└── .github/               workflows/: CI (ci.yml), the 15-minute live health check (health.yml) and the weekly database backup (db-backup.yml); dependabot.yml: weekly update proposals; pull_request_template.md: the where-things-go checklist
```

Folders that are **never deployed**. `tools/deploy-cloudflare-pages.ps1` leaves them out and refuses to ship if some of them slip in; the middleware also answers 404 for most of these paths: `docs/`, `tools/`, `db/`, `tests/`, `functions/` (its source), `workers/`, `backups/`, `qa/`, `qa-e2e/`, `fix-plan/`, `_mig/`, `_factcheck/`, `models/originals/`, `assets/_glb_preview/`, and every dotfile.

## Pages and their scripts

Every page loads `css/core/cinema.css`, `css/core/terms-gate.css` and `css/core/consent.css`. All except `privacy.html` and `terms.html` also load `css/features/desk.css`.

**How scripts load (since 16 November 2026, plan step 4.5).** Each page has one ES module entry, `js/pages/<page>/main.js`, which imports the page's scripts in the order the page used to list them. Only these stay as classic `<script>` tags, because they must run before the rest: vendor files (Sentry, Supabase, Leaflet), `js/core/sentry.js`, `js/core/core.js`, `js/core/cinema.js`, `js/core/consent.js` and, on the study page, `js/pages/study/book-open.js`. `privacy.html` and `terms.html` load only those, so they have no entry. Most imported scripts still publish one `window.<Name>` object, as before; the study page's own files share names through `import` and `export` (see `js/pages/study/` below).

**One behaviour change from the entry.** Classic `defer` scripts let promise callbacks run between scripts; a module graph runs all its files first. So on `index.html` and `study.html`, `analytics.js` now sees that `onboard.js` has loaded before it decides whether to show its own profile card, and skips it, as its code intends (`if (window.Onboard) return;`). Before, that check ran too early, and a signed-in reader without a profile could get both the onboarding questions and the profile card.

| Page | Code folder and entry | What it loads besides the core |
|---|---|---|
| `index.html` | `js/pages/index/` | Content `covers.js`, `shelf-data.js`; features `reviews.js`, `progress-sync.js`, `analytics.js`, `onboard.js`, the two sound scripts; page `home.js`, `shelf.js` (with `shelf-helpers.js`). Styles: `css/core/site.css`, `css/pages/index/shelf.css`, `css/features/onboard.css` |
| `study.html` | `js/pages/study/` | Content `sheets/index.js`, `sheet-map.js`, `sheet-verify.js`, `glossary-enrichment.js`, `sheet-glossary.js`, `map-data.js`; features `progress-sync.js`, `study-sync.js`, `analytics.js`, `onboard.js`, sounds, `reviews.js`; page `quiz-gate.js`, `scripture.js`, `workbench.js`, `competency.js`, `term-overlay.js`, `card-min.js`, `book-reader.js`, `study-app.js` (which imports the study modules), `lesson-player.js`, `task-flow.js`, `audio-orb.js`, `page-actions.js`. `certificate.js`, `mindmap.js`, `weather-scene.js` and the per-sitting text load on demand. Styles: `css/pages/study/` (`study-tailwind.css`, the 24 parts in `parts/`, `book-reader.css`, `book-open.css`, `task-flow.css`, `study-audio.css`), `css/features/insight-card.css`, `css/features/onboard.css` |
| `map.html` | `js/pages/map/` | Vendor Leaflet; content `sheet-map.js`, `map-data.js`; features `analytics.js`, sounds; page `map-math.js`, `map.js` (which loads `globe.js` on demand). Styles: `css/pages/map/map.css` |
| `gallery.html` | `js/pages/gallery/` | Features `analytics.js`, `ui-sound.js`; the page's inline module imports `js/pages/gallery/gallery.js` (three.js through an import map). Styles: `css/pages/gallery/gallery.css` |
| `account.html` | `js/pages/account/` | Content `covers.js`; features `analytics.js`, `progress-sync.js`, `study-sync.js`, `reviews.js`; page `mfa.js`, `account.js`. Styles: `css/core/site.css`, `css/features/reviews.css`, `css/features/account.css` |
| `reviews.html` | `js/pages/reviews/` (entry only) | Features `analytics.js`, `reviews.js`. Styles: `css/core/site.css`, `css/features/reviews.css` |
| `insights.html` | `js/pages/dashboard/` | Feature `analytics.js`; page `sid-report.js`, `dashboard-format.js`, `dashboard.js`. Styles: `css/core/site.css`, `css/pages/dashboard/dashboard.css`, `css/pages/dashboard/sid-report.css` |
| `privacy.html`, `terms.html` | none | Sentry, `cinema.js`, `consent.js` only. Styles: `css/core/site.css`, `css/features/account.css` |
| `404.html` | `js/pages/404/` (entry only) | The core only. Styles: `css/core/site.css` |

**Core** (every page with an entry): `js/core/journey.js`, `auth-config.js`, Supabase, `net.js`, `errors.js`, `ops.js`, `human-pass.js`, `auth.js`, `terms.js`, and the features `desk.js` and `desk-rows.js`, on top of the classic tags listed above.

To check the current list, run (it follows each entry's imports):

```bash
node -e "import('./tools/verify/_sources.mjs').then((m) => console.log(m.pageScripts('study.html').join(' ')))"
```

## The layout rule

Since 16 November 2026 (plan step 5.1), a file's folder says how far it reaches. Page counts come from what each page's tags and entry load.

| Folder | What goes there | Today |
|---|---|---|
| `js/core/`, `css/core/` | Site infrastructure that every page needs to start: helpers, sign-in, network, errors, consent, the terms gate, base styles | `core.js` (the one copy of each small helper, `window.SiteCore`), `sentry.js`, `cinema.js`, `consent.js`, `journey.js`, `auth-config.js` (and `.example.js`), `auth.js`, `net.js`, `errors.js`, `ops.js`, `human-pass.js`, `terms.js`; `cinema.css`, `consent.css`, `terms-gate.css`, `site.css` |
| `js/features/`, `css/features/` | A reader-facing feature used by two or more pages | `desk.js`, `desk-rows.js`, `analytics.js`, `reviews.js` (helpers in `review-helpers.js`, imported just before it), `progress-sync.js`, `study-sync.js`, `onboard.js`, `ui-sound.js`, `ui-click-sound.js`; `desk.css`, `insight-card.css`, `reviews.css`, `onboard.css`, `account.css` |
| `js/content/` | Lesson and site data, apart from the code that shows it (step 5.4) | `sheets-data.js` (source of every sitting), `sheets/` (generated from it), `sheet-map.js`, `sheet-verify.js`, `sheet-glossary.js`, `glossary-enrichment.js` (and its `-overrides.json`), `map-data.js`, `shelf-data.js` (generated by `tools/build-shelf-data.mjs`), `covers.js` |
| `js/pages/<page>/`, `css/pages/<page>/` | Everything one page uses, and its entry `main.js` | `index`, `study`, `map`, `gallery`, `account`, `reviews`, `dashboard` (for `insights.html`), `404` |

**Renamed on 16 November 2026 (plan step 5.2)**, because each old name pointed at the wrong thing or clashed with another file: `js/shared/insights.js` → `analytics.js` (reader analytics; the global is still `window.Insights`), `js/insights/` → the dashboard folder, with `insights.js` → `dashboard.js` and `insights-format.js` → `dashboard-format.js` (globals `window.InsightsDashboard` and `window.InsightsFormat` unchanged), the gallery's `app.js` → `gallery.js` and `app.css` → `gallery.css`, `notes.css` → `reviews.css`, `terms.css` → `terms-gate.css`, `insights.css` → `dashboard.css`. Global names were kept: renaming them would touch every caller and the tests for no gain in findability.

## Inside `js/pages/`

| Folder | Main files |
|---|---|
| `js/pages/study/` | `study-app.js` (the page controller: state, start-up and `loadSheet`) and the ES modules split out of it: `story.js`, `quiz.js`, `read-along.js`, `focus-timer.js`, `reading-settings.js`, `references.js`, `horizon.js`, `sitting-map.js`, `sitting-guide.js`, `lesson-connect.js`, `toc.js`, `strongs.js`, `study-guide.js`, `scroll-place.js`, `sheet-book.js`, `instruments.js`, `spine.js`, `read-meter.js`, `study-modules.js`, and `diagrams/` (`cite.js`, `chain.js`, `comparison.js`, `table.js`, `flow.js`, `timeline.js`, `fullscreen.js`). Also `book-reader.js` (helpers in `book-reader-helpers.js`), `mindmap.js` (layout maths in `mindmap-layout.js`; building, scenes, tour and animation in `mindmap-render.js`, which `create` calls through `make(deps)`), `task-flow.js`, `term-overlay.js`, `workbench.js` (rubric in `workbench-rubric.js`, state in `workbench-store.js`, the three sitting-specific workbenches in `workbench-sittings.js`), `competency.js`, `certificate.js` (loaded on demand; its PDF writer is `certificate-pdf.js`, loaded with the page), `scripture.js`, `quiz-gate.js`, `book-open.js`. `main.js` also sets `window.showToast` and `window.navigateSheet`, which `competency.js` and `workbench.js` call, and on local hosts only exposes a few study functions to the browser tests (`loadSheet`, `showInstrument`, `applyTheme`, `toggleTocDrawer`, `setEpochInfo`, `setWeatherPreset`, `togglePomodoroDrawer`), as `window.__galleryCamera` already does for the gallery |
| `js/pages/gallery/` | `gallery.js` (the scene, camera, lighting, input and start-up; 2,083 lines), `artifact-registry.js` (`ASSET_REGISTRY`, `MUSEUM_NODES_DATA`, `getNodeDataForAsset`, artifact order), `hall-art.js`, `hall-backdrop.js`, `model-loader.js`, `model-cache.js`, `tour.js`, `study-looks.js`, `panels.js`, `dossier.js`, `explode.js`. These read a few names exported by `gallery.js`, and `gallery.js` imports them back, so the modules import each other in a cycle. That is safe because the split-out files only declare things: nothing in them runs at load time, and nothing assigns to an imported name (checked with a script over the syntax tree) |
| `js/pages/map/` | `map.js` (engine: state, globe and Leaflet hand-over, playback, start-up), `map-render.js` (overlays, markers, place panel, scrubber and layers, through `make(deps)`), `map-dom.js` (page building and control wiring), `map-header.js` (page header), `map-math.js` (distance, smoothing, tile and year maths), `globe.js` (3D globe view, loaded on demand; its helpers are in `globe-math.js`, its scene set-up in `globe-scene.js` and its tile-patch geometry in `globe-patch-geometry.js`) |
| `js/pages/index/` | `shelf.js` (3D shelf, an ES module), `shelf-helpers.js`, `home.js` |
| `js/pages/account/` | `account.js`, `mfa.js` (moved from `js/shared/` in step 5.3) |
| `js/pages/dashboard/` | `dashboard.js` (loading, rendering, filters, the moderator API), `dashboard-data.js` (the figures' state behind getters and setters, the data accessors and the row and HTML builders), `dashboard-format.js` (number, date, CSV and quarter helpers), `sid-report.js` |
| `js/content/sheets/` | The 11 sittings, one file each, plus `index.js` (the list and the on-demand loader). **Generated** from `js/content/sheets-data.js` by `node tools/build_study_sheets.mjs` |

## Source files that are not served

| File | Role |
|---|---|
| `js/content/sheets-data.js` | Source of all sitting content. Edit this, then rebuild `js/content/sheets/`. |
| `css/pages/study/parts/NN-name.css` | The study page's styles, one file per feature (story, mind map, flow, audio, horizon, themes and so on). `study.html` links them in number order, and the number order is the cascade order: a later file wins a tie. Parts 01–21 were cut from the old `css/study-page.css` at rule boundaries, so joined they hold the same rules in the same order (checked with `tools/verify/verify_equivalence.mjs`). 22 and 23 came from styles that scripts used to inject. 24 is the reading-progress meter (added 18 November 2026). `tests/unit/study-css.test.mjs` keeps the links and the folder in step. |
| `css/features/insight-card.css` | The reader prompt cards (sitting pulse, profile), linked last on the seven pages that load `js/features/analytics.js` |
| `css/pages/study/study-tailwind-src.css`, `tailwind.study.config.js` | Source for `css/pages/study/study-tailwind.css` (`npm run build:tailwind`) |
| `js/content/glossary-enrichment-overrides.json` | Input for `js/content/glossary-enrichment.js` (`tools/verify/build_glossary_enrichment.mjs`) |
| `vendor/three/build/three.core.js`, `three.module.js` | Unminified three.js; the site serves the `.min.js` files |

The deploy script refuses to ship if any of these are in the bundle.

## `tools/`

| Path | Purpose |
|---|---|
| `tools/deploy-cloudflare-pages.ps1` | Build and deploy the production bundle |
| `tools/hash-release-assets.mjs`, `tools/minify-release-css.mjs` | Fingerprint file names and minify CSS during the deploy |
| `tools/build_study_sheets.mjs`, `tools/build-shelf-data.mjs` | Generate the per-sitting files and the shelf data |
| `db/migrations/NNN-name.sql` | Database migrations, numbered in run order (plan step 5.6), run by hand in the Supabase SQL editor. `db/migrations/README.md` says how the order was set and which have run in production (not checked yet). `db/` is never deployed: the deploy script leaves it out and the middleware answers 404 for `/db/` |
| `tools/verify/` | The regression suite behind `npm test`, plus screenshot helpers. `run_browser_checks.mjs` runs the browser checks (`npm run test:browser`), `verify_wiring.mjs` fails when a `verify_*.mjs` file is run nowhere, and `verify_equivalence.mjs` proves that a move changed no code or CSS rule |
| `tools/storage-keys.mjs` | The list of every browser storage key, with which ones sign-out and account deletion clear, and (`deleteOwnAccount`) the two stash prefixes cleared only for the deleted account's own id. `tests/unit/storage-keys.test.mjs` checks it against the code, `privacy.html`, `PERSONAL_KEYS` and `SITE_KEYS` |
| `tools/measure_baseline.mjs` | Prints file sizes, function lengths and duplicate function names (see [the architecture baseline](architecture-baseline.md)) |
| `tools/security/run_penetration_audit.mjs` | `npm run test:security` |
| `tools/smoke.mjs` | Live-site smoke test (CI after each deploy, and every 15 minutes) |
| `tools/ci/alert.mjs` | Opens or closes a GitHub issue when the live site fails or recovers |
| `tools/rollback-deploy.mjs` | `npm run rollback` |
| `tools/restore-exhibit-progress.mjs`, `tools/export-exhibit-progress.sql` | Progress backup and restore |
| `tools/export-all-tables.sql` | Hand-run copy of every `public` table plus `auth.users` and `auth.identities` |
| `tools/compress/` | Meshopt and WebP pipeline for 3D models (`npm run compress*`) |
| `tools/audit/`, `tools/review/`, `tools/diagrams/`, `tools/audio-read/`, `tools/perf/` | One-off inspection, editorial review, diagram, audio and performance helpers |
| `tools/legacy/` | The 33 older content-building scripts and their output (`build_sheet*_html.py`, `patch_sheet*_data.py`, `sheet*_generated.html`), moved here on 16 November 2026 so they are not mistaken for `tools/build_study_sheets.mjs`. The `patch_sheet*` scripts were adjusted to find the repository root one level higher. Not run since. |

## Where new work goes

| Adding… | Put it in |
|---|---|
| Sitting text, questions or a study guide | `js/content/sheets-data.js`, then `node tools/build_study_sheets.mjs`. Answer keys go in the database (`exhibit_quiz_keys`), never in the client. |
| A Strong's line or verse highlights | `bible/strongs-daniel.json`, `bible/sheet-passages.json` |
| A map year, city, event or route | `js/content/map-data.js` |
| A 3D artifact | `models/*.glb` (compressed with `tools/compress/`), plus `ASSET_REGISTRY` in `js/pages/gallery/artifact-registry.js`, plus a plate and thumbnail under `assets/` |
| A study-page feature | Its own ES module in `js/pages/study/` (or `js/pages/study/diagrams/` for a renderer). `export` what other files use and `import` what it needs, by root path (`'/js/pages/study/references.js'`). Then add an `import` for it at the top of `js/pages/study/study-app.js`, in the order of the others. `study-app.js` is the only study file the page entry imports, so every other study module finishes loading before `study-app.js` runs its start-up code. A feature file therefore holds only declarations, and nothing in it may read another file's names at load. A variable that two files assign lives in one of them, with a small setter (`setCurrentThemeIdx`) for the other, because a module cannot assign an imported name. Tests that check the study page's code read every script it loads through `tools/verify/_sources.mjs`, which follows the entry's imports |
| A script for a page | An `import` line in that page's `js/pages/<page>/main.js`, not a `<script>` tag. Only a script that must run before the page is parsed (like `core.js`) gets a tag |
| Code shared by pages | `js/features/` for a reader-facing feature used by two or more pages, `js/core/` for infrastructure every page needs; then an `import` in each page's entry. A file used by one page goes in `js/pages/<page>/`. A small helper used by two or more files (escaping, sign-in reads, focus handling) goes in `js/core/core.js`; local copies call it, they do not repeat its body |
| A database change | The next number in `db/migrations/` (`028-<topic>.sql`), run in Supabase **before** deploying the client that needs it, then recorded as applied in `db/migrations/README.md` |
| A new storage key | Add it to `tools/storage-keys.mjs` and to the storage table in `privacy.html`; also to `PERSONAL_KEYS` in `js/core/auth.js` if sign-out must clear it, and to `SITE_KEYS` in `js/pages/account/account.js` if account deletion must clear it. `npm run test:unit` fails until all of them agree |
| Code split out of a factory (a function such as `create()` that makes one instance) | A `make(deps)` function in a new file, as `js/pages/study/mindmap-render.js` does: the moved functions keep their bodies, `deps` passes in the instance's values, and `make` returns the functions the rest calls. Move only functions that assign nothing outside their group and read no variable that is reassigned later |
| A pure helper (maths, layout, text fitting, formatting) | A helper file next to its feature, outside the feature's closure: for a classic script it sets one `window.<Name>` object and the feature reads it with `const { … } = window.<Name>;`; for an ES module it uses `export`. Give it a unit test in `tests/unit/`. Import between ES modules with a root path (`'/js/pages/index/shelf-helpers.js'`), because `tools/hash-release-assets.mjs` rewrites references by their full path and would miss `./shelf-helpers.js` |
| A test | `tests/unit/*.test.mjs` (fast, `node:test`) or `tools/verify/verify_*.mjs` (browser and integration, then add it to the `test` script in `package.json`) |
