# Architecture

The Scroll of Daniel is four static pages at the repo root. Python `server.py` is the only runtime. There is no bundler. Course-content work lives in [COURSE_IMPROVEMENT_PLAN.md](COURSE_IMPROVEMENT_PLAN.md); this file answers “where does X live?”

## Pages → scripts

| Page | URL stays at | CSS | Scripts (load order) | Owns |
|---|---|---|---|---|
| Cover | `index.html` | `css/site.css` | `js/shared/journey.js` | Entrance, resume CTA, three-act offer |
| Study desk | `study.html` | `css/map.css` (embedded map) + inline study styles | Tailwind CDN → `js/study/tailwind-config.js` → Tone.js → import map → `js/study/stage.js` (module) → Leaflet → `js/shared/journey.js` → `js/study/scripture.js` → `js/map/map-data.js` → `js/map/map.js` → `js/study/workbench.js` → `js/study/competency.js` → `js/study/sheets-data.js` → `js/study/study-app.js` | 11-sheet sitting, quiz gate, weather, pomodoro, horizon |
| Map | `map.html` | `vendor/leaflet/leaflet.css`, `css/map.css` | Leaflet → `js/shared/journey.js` → `js/map/map-data.js` → `js/map/map.js` | Chronicle fly, cities, events, routes |
| 3D gallery | `gallery.html` | `css/app.css` | `js/shared/journey.js` → import map → `js/gallery/app.js` (module) | Artifact registry, orbit, hall |

Deep links that must keep working: `study.html?sheet=N` / `?id=…`, `gallery.html?id=…` / `?asset=…`, `map.html?year=…&event=…`, `?preview=full`.

## Where behavior lives

| Behavior | File |
|---|---|
| Access gate (`FREE_THROUGH`, `canAccessSheet`, `previewFull`) | `js/shared/journey.js` |
| Artifact database (`ASSET_REGISTRY`, hall, `yearForAsset`) | `js/gallery/app.js` |
| Three.js study stage / idle models | `js/study/stage.js` |
| Curriculum (`sheetsData`) + horizon epochs (`timelineEpochs`) | `js/study/sheets-data.js` |
| Quiz, weather, pomodoro, chrome, `LEGACY_ID_MAP` | `js/study/study-app.js` |
| Scripture dock (KJV + Strong’s + sheet passages) | `js/study/scripture.js` + `bible/*.json` |
| Map chronicle (epochs, cities, events, routes) | `js/map/map-data.js` |
| Map engine / overlays | `js/map/map.js` |
| Notes / bookmarks workbench | `js/study/workbench.js` |
| Competency / placement | `js/study/competency.js` |
| Cover hall background | `css/site.css` → `../assets/site/hall-bg.jpg` |

`study.js`, `study-data.js`, and `study.css` were an unused older 8-section desk and have been deleted.

## Data flow (`journey.js` → localStorage)

`js/shared/journey.js` is a classic script. It must load before any consumer. It reads and writes these **frozen** keys (names and shapes must not change):

| Key | Role |
|---|---|
| `baJourney` | Cross-page resume: last epoch, sheet, artifact |
| `daniel_historicist_sheet` | Current study sheet index |
| `daniel_historicist_mastery` | Quiz / mastery flags |
| `daniel_theme_v1` | charcoal / paper / white |
| `daniel_font_size_idx_v4` | Reading size |
| `baNote-*` | Per-sheet notes |
| `baStudyBookmarks` | Bookmarks |
| `scroll_section` | Legacy scroll position |
| `baScriptureStory` | Scripture story-mode pref |
| `baGoogleMapsKey` | Optional map key |
| `baMapBasemap` | Map basemap choice |

`resumeHref()` always returns a root URL (`study.html?sheet=N`). Cross-page links in gallery/map/study stay document-relative to the four root HTML files.

## How instruments connect

On `study.html`, after `DOMContentLoaded`:

1. `journey.js` restores sheet / theme / preview (`?preview=full` unlocks gated sheets).
2. `sheetsData[index]` paints the article; `BAScripture.showSheet(index)` loads `bible/sheet-passages.json` highlights against `bible/kjv.json`.
3. Horizon cards drive `timelineEpochs` and call the embedded map (`map-data.js` / `map.js`) with `STUDY_EPOCH_TO_YEAR`.
4. `StudyStage` (`js/study/stage.js`) shows the idle GLB for that sheet (`models/*.glb` via the root import map `./vendor/three/...`).
5. Gallery and map links use `study.html?id=` / `map.html?year=` so the same `baJourney` record can resume on another page.

Fetch paths are **document-relative** (pages stay at repo root): `bible/*.json`, `assets/maps/chronicle-polities.json`, `models/…`. Moving a `.js` file does not change those URLs.

## Where new content goes

| If you are adding… | Put it here |
|---|---|
| A sitting / quiz / studyGuide | `js/study/sheets-data.js` (`sheetsData`) |
| A Strong’s teaching line | `bible/strongs-daniel.json` |
| Sheet verse highlights | `bible/sheet-passages.json` |
| A map city / event / year | `js/map/map-data.js` |
| A 3D artifact | `models/*.glb` + `js/gallery/app.js` (`ASSET_REGISTRY`) + plate/thumb under `assets/` |
| Course sequencing / gates | [COURSE_IMPROVEMENT_PLAN.md](COURSE_IMPROVEMENT_PLAN.md) — do not mix that work into a move PR |

## Tools and QA

| Path | Purpose |
|---|---|
| `tools/compress/` | Optional Meshopt/WebP GLB pipeline (`npm run compress*`) |
| `tools/verify/` | `verify_*.mjs` suite + `screenshot_*.mjs` |
| `tools/audit/` | One-off Python/Node inspectors |
| `qa/proofs/`, `qa/reports/` | Regenerable screenshots and compression logs (gitignored) |

Run verify scripts from the repo root so `server.py` and document-relative paths resolve.

## Offline runtime

```bash
python server.py
```

or `start_website.bat`. Served extensions are allowlisted in `server.py`. `docs/` and `qa/` are not required at runtime.
