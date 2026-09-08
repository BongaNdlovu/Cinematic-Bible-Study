# Nebuchadnezzar — Golden Head & Daniel 2 Colossus

Interactive Three.js museum exhibit of the prophetic image in Daniel 2: golden head, silver chest, bronze thighs, iron legs, feet of iron and clay, standing on an azure altar.

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
| `index.html` | Museum page (chrome + scene host) |
| `app.css` / `app.js` | UI and Three.js runtime |
| `models/*.glb` | Shipped Meshopt-compressed parts |
| `vendor/three/` | Three.js r0.181.2 (offline import map) |
| `plates/` | Per-empire historical plates |
| `tools/` | Optional model-pipeline helpers |

## Controls

- Drag to orbit, scroll to zoom, click floating nodes to focus
- Left rail / header arrows switch artifacts
- Study Lab: render modes, torches, dust, brightness, camera presets
- Keyboard: `←` `→` previous/next, `1`–`7` artifacts, `N` nodes, `L` study lab, `/` search, `Esc` close panels

## Rebuild compressed models (optional)

Uncompressed sources live in `models/originals/` (gitignored). After editing a source GLB:

```bash
npm install
npm run compress
```

Then copy the result into `models/`.
