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

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Museum landing cover / entrance |
| `gallery.html` | Interactive 3D museum gallery |
| `study.html` | Scroll of Daniel cinematic study desk |
| `bible/` | Local KJV Daniel, Strong’s subset, and the Scripture instrument |
| `map.html` | Full-screen cinematic map of the four kingdoms |
| `map.js` / `map.css` / `map-data.js` | Geographic map engine, HUD, chronicle data |
| `assets/maps/` | Parchment atlas plates, Natural Earth land, Cliopatria empire polygons |
| `app.css` / `app.js` | 3D Gallery UI and Three.js runtime |
| `study.css` / `study.js` / `study-data.js` | Cinematic study desk, atmosphere, curriculum |
| `assets/study/` | Hero statue, Babylon sunset, storm sky, lions’ den |
| `models/*.glb` | Shipped Meshopt-compressed 3D artifacts (colossus, beasts, ram and goat, Dura, court, stump) |
| `vendor/three/` | Three.js r0.181.2 (offline import map) |
| `assets/` | High-resolution plates, artwork, and thumbnails |
| `tools/` | Optional model-pipeline helpers |

## Controls

- Map of History (`map.html`): drag to pan, scroll to zoom, click a kingdom or city, `←` `→` to change year, space to play, search box, Then/Now slider, Routes layer
- Shared journey state (`journey.js`) remembers the last epoch, study sheet, and artifact across pages
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
