# Nebuchadnezzar — Golden Head & Daniel 2 Colossus

Interactive Three.js museum exhibit of the prophetic image in Daniel 2: golden head, silver chest, bronze thighs, iron legs, feet of iron and clay, standing on an azure altar — and the four beasts of Daniel 7 beside it.

## Site map

| Page | File |
|---|---|
| Cover | `index.html` |
| Study desk | `study.html` |
| Map of History | `map.html` |
| 3D gallery | `gallery.html` |

## Run locally

Python 3.10+ is the only runtime needed to view the exhibit:

```bash
python server.py
```

Windows shortcut: double-click `start_website.bat`.

The server binds `127.0.0.1` (port 8000, with fallback), opens a browser, and serves only exhibit file types. It does not require Node.js.

Before committing JS, run `npm run lint`. CI runs the same command on every push and pull request. The cyclomatic-complexity ceiling is 55 (highest current score + 2). Do not add `eslint-disable` / `oxlint-disable` for `complexity`.

## Layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for page-to-JS mapping and data flow.

| Path | Purpose |
|---|---|
| `index.html` `study.html` `map.html` `gallery.html` | URL entry points (stay at repo root) |
| `css/` | `site.css` (cover), `app.css` (gallery), `map.css` (map + study embed) |
| `js/shared/journey.js` | Cross-page resume and access gate (localStorage) |
| `js/gallery/app.js` | 3D gallery engine and artifact registry |
| `js/map/` | Map engine (`map.js`) and chronicle data (`map-data.js`) |
| `js/study/` | Stage, Scripture dock, workbench, competency |
| `bible/` | KJV Daniel, Strong’s subset, sheet passages (data corpus) |
| `assets/` `models/` `vendor/` | Plates, GLBs, vendored Three.js + Leaflet |
| `docs/` | Architecture, audit, course-improvement plan |
| `tools/compress/` `tools/verify/` `tools/audit/` | Optional pipeline and QA |
| `qa/` | Regenerable proofs and reports (gitignored) |

## Controls

- Map of History (`map.html`): drag to pan, scroll to zoom, click a kingdom or city, `←` `→` to change year, space to play, search box, Then/Now slider, Routes layer
- Shared journey state (`js/shared/journey.js`) remembers the last epoch, study sheet, and artifact across pages
- Drag to orbit, scroll to zoom, click floating nodes to focus
- Left rail / header arrows switch artifacts
- Study Lab: render modes, torches, dust, brightness, camera presets
- Keyboard: `←` `→` previous/next, `1`–`9` and `0` artifacts, `N` nodes, `L` study lab, `/` search, `Esc` close panels

## Rebuild compressed models (optional)

Uncompressed sources live in `models/originals/` (gitignored). After editing a source GLB:

```bash
npm install
npm run compress
npm run compress:beasts
npm run compress:daniel8
npm run compress:visions
```

Then copy the result into `models/`. `compress:beasts` and `compress:daniel8` simplify the high-poly Meshy sources and write Meshopt + WebP gallery files.

## Production audit (Playwright)

Live access-gate + curriculum walkthrough (see `qa-e2e/README.md`):

```bash
python server.py &
npm install
npx playwright install chromium
node qa-e2e/production-audit.mjs --base=http://127.0.0.1:8001 --phase=after
```

Signed-out visitors must be blocked on exhibit pages. Signed-in tests inject a localhost-only mock Supabase session (`localStorage.baQaMockSession`) — real Google OAuth is not used. Evidence JSON defaults to `/workspace/audit-prod/evidence/reports/` when `EVIDENCE_DIR` is set.
