# Project Audit Report — Nebuchadnezzar Golden Head / Daniel 2 Colossus (Three.js)

**Date:** 2026-09-08
**Scope:** Full review of the app in `nebuchadnezzar_golden_head_threejs` — structure, runtime behavior (tested in a live browser against `server.py`), servers, assets, build tooling, performance, accessibility, and security posture.

---

## 1. Executive Summary

The core experience **works**: the page loads with zero console errors, the assembled colossus renders at 60 FPS with ~1.3 M triangles across 7 meshes, the loading screen completes, artifact switching (assembled / head / chest / … / altar) works, camera presets, node cards, and study render modes are all functional. The 3D pipeline itself is healthy — models are Meshopt-compressed with WebP textures and quantization (good sizes: 3.5–9.5 MB per part).

The problems are **around** the experience, not in it. This project carries three parallel generations of itself in one folder, ships roughly **450+ MB of junk, dead weight, and duplicate data**, has a second HTTP server that **crashes the whole process on a malformed `Range` header** (verified), a large amount of **dead UI** (roughly 15 visible controls do nothing), **zero responsive design**, and a **false offline/file:// claim** — the "offline support" data file (3.4 MB, loaded blocking on every page view) is never even read by the shipped page, while the actual Three.js dependency comes from a CDN, so the app dies without internet anyway.

Below, issues are ordered by severity. Line numbers refer to `index.html` unless stated otherwise.

---

## 2. Critical Issues

### C1. `server.js` crashes the entire process on a malformed `Range` header
**File:** `server.js:62-73`
The Range parser does `parseInt(parts[0], 10)` with no validation. A request with `Range: bytes=abc` produces `start = NaN`, which is passed to `fs.createReadStream()` → `RangeError: ERR_OUT_OF_RANGE` → **uncaught exception kills the Node process**. Verified live: after the malformed request, the server no longer responds at all.
Also missing: validation for `start > end`, `start >= totalSize`, and negative values.
**Fix:** wrap parsing in try/catch, fall back to a 200 full response (or 416) on any malformed range. Since `start_website.bat` launches `server.py`, either fix and keep one server or delete `server.js` entirely (see A2).

### C2. Zero responsive design — the app is desktop-only
`index.html` contains **0 `@media` queries** (the older `site/template.html` it replaced had one). Verified at 375 px viewport:
- The 250 px left rail + 320 px right narrative column + header utilities all overlap and overflow.
- Node cards render half off-screen (3 of 6 cards fully outside the viewport).
- The top header overflows (`scrollWidth > clientWidth`).

Anyone on a phone or small tablet gets a broken layout with no way to see the exhibit. **Fix:** add breakpoints (~1024 px, ~768 px, ~480 px): collapse the left rail into a drawer, hide/stack the narrative column behind a toggle, hide node cards behind the existing nodes toggle, and make the top chrome wrap.

### C3. The offline / `file://` claim is false, and the 3.4 MB "offline" payload is dead weight
- `index.html:12-18` loads `assets-data.js` (3.4 MB of base64 PNGs) **blocking, in `<head>`, on every page view** — but nothing in the shipped `index.html` ever reads `window.NEBU_ASSETS`. Only the *old* build (`site/app.js:498`, `site/bundle.mjs:1888`) consumes it. So every visitor downloads 3.4 MB of unused data before the page can render.
- Meanwhile the import map (`index.html:21-28`) pulls Three.js r0.181.2 and **all addons from `cdn.jsdelivr.net`**. With no internet the app cannot start at all, and ES modules are blocked on `file://` in every Chromium browser regardless.
- A local `vendor/three.module.js` + addons already exists (in two copies) but is referenced by nothing. The only local vendor path used is `vendor/draco/` (and the models don't even use Draco — they're Meshopt).

**Fix:** point the import map at the local `vendor/` copies (align their version with what the code expects), and delete the `assets-data.js` include from the shipped page — or actually wire it in if the file:// support is a real requirement (it currently cannot work).

### C4. Loading screen can hang forever if the hero model fails to load
`index.html:1801, 2449-2451`: progress is hardcoded to `totalAssets: 2` (altar + assembled colossus). If `models/full_body.glb` fails (or all three candidate paths 404), `tryLoad` only does `console.warn` and never increments `loadedCount` — the loading overlay stays stuck at 50 % with no error shown to the user. The altar's own error path does increment (line 2605), so the bug is specific to the assembled model. **Fix:** add a failure handler that increments progress and surfaces a visible error message.

---

## 3. Dead / Fake UI (verified by clicking each control in a live session)

The interface looks rich, but a significant fraction of it is decoration. The following **visible** controls have no event handler and do nothing when clicked:

| Control | Location |
|---|---|
| `btn-theme-toggle` (☀️) | header |
| `btn-scripture-modal` (📖) | header |
| `btn-menu` (☰) | header |
| `btn-brand-home` (brand crest) | header |
| `btn-back-collection` ("← BACK TO COLLECTION") | left rail footer |
| `btn-dust` ("Golden Dust: ON") | Study Lab |
| `btn-explode-toggle` ("Explode Layers") | Study Lab |
| `btn-pedestal-toggle` ("Old Pedestal: OFF") | Study Lab |
| `brightness-slider` ("Scene Brightness") | Study Lab |
| Nav rail items: DISCOVER / TIMELINE / KINGDOMS / ABOUT | left rail |
| `search-input` | header (`readonly`, no search logic exists) |

Additional fake/stubbed behavior (verified):
- **Explode slider** (`index.html:2776-2782`): moving it to 75/100 changes only its text label; **no mesh in the scene moves** (verified by comparing mesh positions before/after).
- **AI ANALYSIS button** (`:2732-2737`): shows a hardcoded toast string. No analysis exists.
- **Geometry diagnostic** (`:1379`): "1.03M Triangles" is hardcoded in HTML; the actual assembled scene has ~1.31 M triangles.
- **COMPARE button**: just toggles clay/gold render mode.

**Fix (choose per control):** wire them up, or remove them. A UI that looks interactive but isn't erodes trust faster than a simpler honest UI. The hidden "backward compatibility" block (`:1384-1413`) — 13 empty buttons, `hotspot-container`, `glb-file-input`, etc. — is pure dead DOM and should be deleted.

---

## 4. Runtime Bugs & Code Smells

1. **Material leak on every render-mode switch** (`applyStudyModeToMeshes`, `:2613-2653`): every invocation does `orig.clone()` per mesh (and `new THREE.MeshStandardMaterial(...)` for clay/wireframe) without disposing the replaced materials. Repeated toggling and asset switching accumulates GPU resources. Dispose the outgoing material when replacing it.
2. **Per-frame DOM churn in `syncNodes()`** (`:2176-2277`, called every frame from `animate` at `:2929`): every frame it sets `nodesSvg.innerHTML = ''` and recreates ~12 SVG elements plus `getElementById` lookups for all 6 nodes, and allocates two `THREE.Vector3`s per node in the hot loop. Move node sync to an `requestAnimationFrame`-throttled or transform-only update (position existing SVG nodes, don't rebuild them), and hoist vector allocations out of the loop.
3. **Elevation diagnostic is wrong** (`:2905`): it computes `asin(camera.y / |camera|)` relative to the **world origin**, but the orbit target is at `(0, 1.15, 0)`. The displayed elevation is skewed and never goes negative when looking up from below the target.
4. **`document.write` fallback** (`:14-18`): parser-blocking, deprecated practice; the fallback path can never be needed anyway since both copies of `assets-data.js` are identical.
5. **Debug globals left in production** (`:1439, 2327-2332`): `window.THREE`, `__scene`, `__camera`, `__controls`, `__museumBloom`, `__selectAsset`, plus `console.log` init messages.
6. **Draco decoder configured but unnecessary** (`:1791-1793`): all shipped GLBs use `EXT_meshopt_compression`, not Draco. `DRACOLoader` is dead weight; and if kept, it's forced to the **JS** decoder (`type: 'js'`) even though the faster WASM binaries sit right next to it in `vendor/draco/`.
7. **Dead `assetFiles` map** (`:1445-1458`): declared, never used.
8. **`dustEnabled` state exists but no UI toggles it** (see dead controls above); particles always run.
9. **Share button promise ignored** (`:2756`): `navigator.clipboard.writeText()` isn't awaited/caught — a permission denial produces an unhandled rejection, and the success toast shows regardless.
10. **Stale camera state after model swaps:** switching assets during a camera tween doesn't cancel the tween (`tweenCamera` overwrites but the old closure keeps running until `progress >= 1` — benign but sloppy).

---

## 5. Project Structure — the biggest cleanup opportunity

The folder is **657 MB** and contains at least **three generations of the app** plus build machinery, none of it organized:

### 5.1 Junk and dead weight (≈ 315 MB + 32 MB + 14 MB)

| Item | Size | Status |
|---|---|---|
| `.chrome_verify_tmp/` | **228 MB** | A stray Chrome *user profile* (caches, crash dumps, `Crashpad` reports) accidentally created inside the project by a prior browser-verification run. Delete. |
| `models/originals/full_body_v3.glb` | **119 MB** | Archival intermediate. 8× larger than the shipped model. Remove from the repo (keep in cloud/external storage if needed at all). |
| `models/originals/` (other 7 files) | ~148 MB | Source-of-truth originals, but they belong behind a build step, not in the shipping tree. |
| `nebuchadnezzar_golden_head_assets/` | **32 MB** | A byte-identical distribution copy of the app: same `index.html` (verified `cmp` identical), same `assets-data.js`, same `vendor/` (5 files verified identical), plus its own `model.glb`. It duplicates the entire site for no current purpose — the main page even tries loading from it as a *fallback* (`ASSET_PREFIX`), but the primary `models/` path always succeeds first. Either make this the one true folder or delete it. |
| Root PNG debris (~30 files) | **14 MB** | `cap-*.png`, `cmp-*.png`, `gate-*.png`, `bright_head_screenshot.png`, `museum_render_screenshot.png`, `glb_website_screenshot.png`, `luminous_website_screenshot.png`, `screenshot_preview.png`, `golden_head_switch_screenshot.png`… These are pipeline screenshots, not app assets. Move to a `docs/pipeline/` folder or delete. |
| `model.glb` (root) | 18 MB | **Unreferenced** by any HTML/JS (verified by grep). Delete. |
| `models/full_body.prev.glb` | 5 MB | Unreferenced previous version. Delete. |
| `models/compressed/` | 42 MB | Output of `compress_models.mjs`, but 6 of 7 files are **identical** to `models/*.glb` (the app loads from `models/`, not `models/compressed/`), and `full_body.glb` there is *stale* vs. the current `models/full_body.glb`. Redundant + actively misleading. Delete or regenerate the pipeline so `compressed/` is the single source. |
| `test_write.txt` | — | Literally contains "ok". Delete. |

### 5.2 Three generations of the app coexisting

1. **Shipped app:** root `index.html` — a 2,938-line monolith (≈1,400 lines CSS + ≈1,500 lines JS inline).
2. **Old modular build:** `site/template.html` + `site/app.js` + `src/createNebuchadnezzarModel.js` + `src/nebuchadnezzar-details.js`, assembled by `build_site.py` into `index.html`, with `site/bundle.mjs` as a previously generated bundle. **Danger:** `build_site.py` writes its output to `index.html` — running it today would silently *destroy* the current hand-edited museum page and replace it with the old procedural-head app. The current `index.html` diverged from this pipeline long ago (the `.bak` files chart the drift).
3. **Distribution copy:** `nebuchadnezzar_golden_head_assets/` (see above).

`src/createNebuchadnezzarModel.js` and `.ts` are near-duplicates (942 lines each) — the `.js` appears auto-generated from the `.ts` with mangled whitespace (large runs of blank-space lines).

**Recommendation:** pick one architecture. Either (a) declare the monolithic `index.html` the app, split its CSS/JS into `app.css`/`app.js` for sanity, and delete `site/`, `src/`, `build_site.py`, `bundle.mjs`, and all `.bak` files; or (b) revive the modular pipeline and port the museum UI into it. Option (a) is far less work. Never leave a build script in the tree that overwrites the shipped artifact with an older app.

### 5.3 Script & state clutter in root

~25 one-off pipeline scripts sit in the root with no folder, docs, or entry point: `build_site.py`, `check_assets.py`, `check_nodes.py`, `check_three_api.py`, `enrich_spec.py`, `fix_layers.py`, `gen_manifest.py`, `inspect_glb.py`, `patch_assessment.py`, `patch_viewer.py`, `patch_viewer.mjs`, `record_review.py`, `record_review2.py`, `refine_spec_profile.py`, `write_review_json.py`, `tweak_altar.mjs`, `compress_models.mjs`, `capture_clean.ps1`, `capture_flat.ps1`, `capture_views.ps1`, plus pipeline state JSONs (`assessment.json`, `di.json`, `object-sculpt-spec.json`, `part-manifest.json`, `review_features.json`, `review_layers.json`, `review_viewpoints.json`, `compression_report.json`, `.img2threejs/state.json`).

Move all of it into `tools/` (scripts) and `tools/state/` (JSON), with a one-line purpose comment at the top of each script you keep — or delete the ones whose job is done (most of the `capture_*`, `record_review*`, `patch_*` family).

### 5.4 Missing project basics

- **No git repository.** The `.bak` file pattern (`index.html.bak`, `index.html.cinematic_pre.bak`, `index.html.pre_assembly_patch.bak`, `index.html.pre_museum_mock.bak`) is manual, error-prone version control. Initialize git, add a `.gitignore` (`.chrome_verify_tmp/`, `*.bak`, `models/originals/`, `*.png` debris as appropriate), and commit.
- **No README.** A visitor cannot tell how to run this (`start_website.bat`? `server.py`? `server.js`?), what `tools/` scripts do, or what the model pipeline is.
- **No `package.json`** even though `compress_models.mjs` and `server.js` are Node scripts.

---

## 6. Servers (redundancy + hardening)

- **Two servers duplicate each other:** `server.js` (Node) and `server.py` (Python). `start_website.bat` runs only `server.py`. Keep one. The Python one is the better survivor: threaded, MIME-registered, port-fallback, browser auto-open — but see C1 for the Node one's crash bug.
- **Python server serves everything**, including dotfiles (`.img2threejs/state.json` → 200), its own source (`server.py` → 200), and pipeline JSONs. It binds `127.0.0.1` only, so this is low risk locally, but if this is ever hosted: serve only an explicit whitelist of extensions, block dotfiles, and drop `Access-Control-Allow-Origin: *` (both servers set it permissively — fine for local dev, wrong for deployment).

---

## 7. Performance Notes

- **First paint is needlessly heavy:** 3.4 MB blocking `assets-data.js` + Google Fonts + CDN module graph before the scene even starts. Removing the dead `assets-data.js` include (C3) is the single biggest quick win.
- **Initial payload is good where it matters:** the app loads only 2 GLBs up front (`full_body.glb` 4.5 MB + `azure_altar.glb` 6 MB); parts load on demand. Consider lazy-loading the altar too, or at least `preload`-hinting the hero model.
- **60 FPS on desktop** with bloom + 2048 px shadow maps + 1.3 M tris is fine, but there is no quality tier for weaker/mobile GPUs (no pixel-ratio downgrade, no shadow-size fallback, bloom always on). When adding responsive breakpoints (C2), add a low-power tier.
- `renderer.setPixelRatio(min(dpr, 2))` — good.
- 1.28M-triangle `golden_head.glb` (9.2 MB) is the heaviest single asset; worth a decimation pass if mobile is a target.

---

## 8. Accessibility

- **No keyboard support at all:** no `keydown` handlers; OrbitControls mouse-only (it supports keyboard, but focus never reaches the canvas); the search box is readonly; buttons have no focus styles (global `user-select: none`, no `:focus-visible`).
- **13 empty, unlabeled buttons** in the DOM (hidden block + `detail-*`, `btn-audio`, etc.) — screen-reader noise. Delete the whole hidden block.
- Canvas has no `aria-label` or fallback content; node cards are clickable `div`s, not buttons.
- No `prefers-reduced-motion` handling despite auto-orbit, flickering torches, and floating dust.
- Fonts ship only from Google Fonts with no fallback preload — if the CDN is slow, text pops in late (minor).

---

## 9. Minor Content Issues

- The **same photo** (`ishtar_gate_babylon.jpg`) is used as the "historical plate" for every empire (Babylon, Persia, Greece, Rome, divided kingdoms) and as the altar thumbnail — 7 contexts, 1 image, captions claim different subjects.
- **Mismatched thumbnails:** the Silver Chest card shows `golden-head-clay.png` (a head render), Bronze Thighs shows `golden-head-three-quarter.png`, Iron Legs shows `golden-head-profile.png`, Feet show `golden-head-pedestal.png`. Every part card shows a golden-*head* image.
- Header/search/`hero-scripture-pill` text uses typographic quotes in some places and escaped ones in others (`'` vs `’`) — cosmetic inconsistency.

---

## 10. What Is Already Good (keep this)

- Live-tested: clean console, no runtime errors during a full click-through of the wired UI; 60 FPS; asset switching, node solo-focus, study modes, camera presets, prev/next wrap-around all work.
- Model pipeline output quality is genuinely good: Meshopt compression + WebP textures + quantization; sensible per-asset registry-driven camera framing; `normalizePart` auto-centering makes parts drop in correctly.
- Both GLB candidate-path fallback and model caching (`loadedGLTFScenes`) are sensible patterns.
- The Python server is solid for local dev.
- The UI design (mock-faithful museum chrome, canvas-generated relief wall and halo textures) is polished.

---

## 11. Prioritized Fix List

**P0 — do now**
1. Fix or delete `server.js` (process-killing Range bug — C1).
2. Delete `.chrome_verify_tmp/` (228 MB of browser profile data) and `test_write.txt`.
3. Remove the dead `assets-data.js` `<script>` include from the shipped page (3.4 MB off every load).
4. Fix loading-screen hang on hero-model load failure (C4).
5. Initialize git + `.gitignore` + README (how to run, where things live).

**P1 — this week**
6. Remove or wire the ~15 dead controls (Section 3); delete the hidden compatibility DOM block and the dead `assetFiles` map.
7. Add responsive breakpoints (C2).
8. Delete `models/compressed/` (stale duplicate), root `model.glb`, `full_body.prev.glb`; move `models/originals/` out of the shipping tree (esp. the 119 MB `full_body_v3.glb`).
9. Decide the architecture: monolith vs. `build_site.py` pipeline — and delete the loser (including the 4 `.bak` files and `nebuchadnezzar_golden_head_assets/` duplication).
10. Fix the material leak in `applyStudyModeToMeshes` (dispose replaced materials).

**P2 — next iteration**
11. Point the import map at local `vendor/` (real offline support) or drop the offline claim; align vendor Three.js version.
12. Throttle/refactor `syncNodes()` off the per-frame hot path; fix the elevation diagnostic.
13. Keyboard accessibility, ARIA on canvas/nodes, `prefers-reduced-motion`.
14. Move pipeline scripts/JSON into `tools/`; unique per-empire plate images; correct part thumbnails.
15. Quality tier for mobile GPUs (pixel ratio, shadow size, bloom toggle).

---

*Verification notes: the app was served via `python server.py` and exercised in a real browser — page load, console error collection, resource waterfall, canvas/scene stats, artifact switching, all button probes (state compared before/after click), node-card interactions, viewport resize to 375 px, and canvas hit-testing. The Node server was separately probed with a malformed Range header and observed to crash (stack trace captured). File-level claims (duplicates, sizes, references) were verified with `cmp`, `du`, and project-wide grep.*
