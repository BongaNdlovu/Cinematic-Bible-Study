# 5. Performance

**Last verified:** 19 November 2026 (the globe row, Shelf book maps, stylesheet merging and the audit performance table), 16 November 2026

This chapter covers what keeps the site fast: caching, how files load, how the 3D scenes manage memory, and the size budgets that tests enforce.

**Not measured in this pass:** real-user load times, Core Web Vitals, and frame rates. Use `tools/perf/pressure-test.mjs` (Playwright, runs against the live site by default) to measure them.

## 1. Caching (`_headers`)

| Path | Cache rule | Why it is safe |
|---|---|---|
| `/`, `/*.html` | `max-age=0, must-revalidate` | Pages always check for a new version |
| `/js/*`, `/css/*`, `/bible/*`, `/models/*` | 1 year, `immutable` | The deploy renames each file with a content fingerprint, so a changed file gets a new URL |
| `/vendor/supabase/*`, `/vendor/leaflet/*`, `/vendor/three/build/*`, `/vendor/sentry/*` | 1 year, `immutable` | Fingerprinted at deploy |
| `/assets/shelf/covers/*` | 1 year, `immutable` | Cover file names already carry a hash (for example `vol-00-cf920485.jpg`) |
| Other `/assets/*` and `/vendor/*` | 1 hour, `stale-while-revalidate` 1 day | Not fingerprinted |

### Fingerprinting at deploy

`tools/hash-release-assets.mjs` renames these files with a 12-character content hash, and rewrites every reference to them in HTML, JS and CSS:

- `models/` (`.glb`, `.gltf`)
- `bible/` (`.json`)
- `vendor/supabase`, `vendor/leaflet`, `vendor/three/build`, `vendor/sentry`
- `css/`
- `js/` (`.js`, `.mjs`)

It also updates the CSP hashes of any inline script whose text changed. `tools/verify/verify_hash_release.mjs` tests it.

A file is hashed only after the files it references, so its name changes when they do. Files that reference each other in a cycle (the gallery's ES modules import `app.js` and `app.js` imports them) cannot be ordered, so they are hashed together, and since 16 November 2026 each one's hash also covers the text of every file in that batch. Without that, a change to one module would leave the others' names unchanged while their contents (the new import names) changed, and a browser holding the old copy under the one-year `immutable` cache would ask for files that no longer exist. `verify_hash_release.mjs` checks that a change anywhere in a cycle renames the whole cycle.

ES module imports between site files use root paths (`'/js/pages/gallery/tour.js'`): the tool rewrites references by their full path, so it would miss `./tour.js`.

### CSS minification at deploy

`tools/minify-release-css.mjs` (PostCSS) minifies every stylesheet in the bundle, including those in subfolders such as `css/pages/study/parts/` (since 16 November 2026), which also removes CSS comments. `tools/verify/verify_css_minify.mjs` tests it, including that the study parts shrink by at least a quarter in total.

**Stylesheets are merged at deploy** (since 19 November 2026). The source keeps one file per study feature. On 19 November 2026 the deploy began merging each page's unbroken runs of stylesheet links (`tools/merge-release-css.mjs`), which reverses the earlier "no build step" decision for CSS only, at the owner's request after the 19 November audit. On a staged copy, 89 links on 11 pages became 15 files; the study page's 35 local stylesheet links became 3. The measured effect is in the table below.

| Change (19 November 2026) | What it saves | Where |
|---|---|---|
| Merged stylesheets | 32 fewer stylesheet requests on the study page | `tools/merge-release-css.mjs` |
| No map data on the study page | `js/content/map-data.js` is no longer imported there; its 8-epoch list was identical to the fallback in `study-app.js` | `js/pages/study/main.js` |
| Bible text and Strong's load when the Scripture panel is shown | `bible/kjv.json` (85,987 bytes) and `bible/strongs-daniel.json` (182,983 bytes) wait for the panel; `bible/sheet-passages.json` still loads at once for the chapter badge | `js/pages/study/scripture.js` |
| Audio cue files load on the first Play | One cue file per sitting | `js/pages/study/read-along.js` |
| Lazy images | The 8 horizon cards use `loading="lazy"`. The 3 atmosphere images were tried and put back to eager: on a throttled phone, lazy loading made the largest paint 0.8 s later (7.57 s against 6.73 s) | `js/pages/study/horizon.js` |
| Glossary linking walks the text once | Same output on all 11 sittings (compared in a browser); 255 ms instead of 3,650 ms summed over the sittings, desktop, no throttling | `js/content/sheet-glossary.js` |
| Start-up queries run once | Desk, dashboard, authenticator card, analytics and reviews subscribe to sign-in changes only after their first run | `desk.js`, `dashboard.js`, `mfa.js`, `analytics.js`, `reviews.js` |
| Book reader re-paginates only on typography changes | Class changes on `<html>`/`<body>` from dialogs no longer re-paginate | `js/pages/study/book-reader.js` |
| Mind maps | The page-wide observer runs only in full screen; a map that turns compact stops its animation loop | `mindmap.js`, `mindmap-render.js` |
| Audio orb | The audio context is suspended 1.6 s after a pause or the end | `js/pages/study/audio-orb.js` |
| Map globe intro | Skipped when the browser asks to save data or reports a 2G or 3G connection | `js/pages/map/map.js` |
| Animations | The audio equaliser and the connect-button sheen animate `transform` instead of `height` and `left` | `study-audio.css`, `19-sitting-page.css` |

**Measured on 19 November 2026** with `tools`-style Playwright runs on one machine, against minified copies served locally: a 390 px phone with 4× CPU slowdown and Slow 4G (1.6 Mbps, 150 ms), and a 1440 px desktop with no throttling. "Before" is the code after audit group 2; "after" adds this change.

| Page | Measure | Before | After |
|---|---|---|---|
| Study, sitting 7, phone | Requests | 136 | 100 |
| Study, sitting 7, phone | Load | 33.5 s | 28.9 s |
| Study, sitting 7, phone | Total blocking time | 18.4 s | 10.4 s |
| Study, sitting 7, phone | Longest task | 9.6 s | 4.0 s |
| Study, sitting 7, desktop | Load | 8.9 s | 6.5 s |
| Study, sitting 0, desktop | Load | 21.9 s | 1.4 s |

First paint on the phone came out slower with merged stylesheets in this local test: 3.1–3.3 s without merging against 3.7–3.9 s with it on the study page, and 1.33 s against 1.62 s on the home page (both with eager atmosphere images). Chrome's network throttling may apply its bandwidth limit to each request separately, which would favour many small files, so this was not taken as the real effect. Before the deploy, the live home page (9 stylesheet requests, real network, phone with 4× CPU slowdown) had a median first paint of 904 ms over 5 runs. After the deploy (PR #46), the same test gave medians of 880 ms and 872 ms in two runs of 5, with 3 stylesheet requests. So on the real network merging did not slow first paint; the difference from 904 ms is within run-to-run variation.

Not changed, with reasons: the three infinite `box-shadow` pulses (`invite-breathe`, `lap-beckon`, `acct-pulse`) repaint small elements and would need a visual redesign; `flow-travel` runs once per diagram, not in a loop; P-09 (weather running from page load) was not confirmed; P-06 (smaller Sentry bundle) and P-11 (`defer` on core scripts) were left out by decision.

JavaScript and HTML are **not** minified. Their comments ship to readers as written: the 12 November bundle's `study-app.4c181f2f6b9d.js` still held 351 comments. Keep comments short for that reason (see [UI rules](06-ui.md#ui-rules-worth-keeping)).

## 2. Loading

- **Pages are plain files.** No server code runs for a page view (see [How it works](02-how-it-works.md#1-a-request-reaches-the-site)).
- **Scripts are deferred.** On `study.html`, 37 of the 39 external scripts use `defer`. The two that do not are `book-open.js` (the book-opening intro) and `consent.js` (the consent banner). Both run as soon as they are parsed.
- **Content loads when needed:**

| What | When it loads | Code |
|---|---|---|
| A sitting's full text | When that sitting is opened | `js/content/sheets/index.js` |
| The certificate maker | When it is first used | `study.html` (`data-certificate`) |
| The 3D globe on the map | When the globe view is opened, and for the short globe intro once per browser session unless reduced motion is on (checked 19 November 2026: `map.js` keeps `cmap-globe-intro` in `sessionStorage`) | `GLOBE_SRC` in `js/pages/map/map.js` |
| Article images | Lazily (`loading="lazy"`) | `study-app.js`, `loadSheet` |
| Gallery hall backgrounds | Prefetched, then cached | `prefetchHall` and `setHallBackdrop` in `js/pages/gallery/gallery.js` |

## 3. 3D scenes

| Technique | Detail | Code |
|---|---|---|
| Compressed models | Meshopt geometry and WebP textures, built by `npm run compress*` from sources in `models/originals/` (not committed) | `tools/compress/` |
| Model cache | Least-recently-used, 6 models at most. The statue (`assembled` / `full_body`) is always kept; the 3 most recently shown are never evicted. Evicted models are freed from the GPU. | `GLTF_LRU_CAP`, `evictGltfs`, `disposeGltfScene` in `js/pages/gallery/gallery.js` |
| Material copies | Copies made for the gold, clay, wireframe and lighting looks are released when a model is removed. Shared originals are left alone. | `releaseExhibitMaterials` in `js/pages/gallery/gallery.js` (added 12 November 2026) |
| Hall textures | Up to 4 cached. Since 19 November 2026 a second download of the same image is freed instead of replacing the cached texture | `HALL_CACHE_CAP`, `keepHallTex()` in `js/pages/gallery/hall-backdrop.js` |
| Model downloads in flight | A model asked for again while it is still downloading waits for that download instead of starting another (`loadingGlb` in `js/pages/gallery/model-loader.js`, 19 November 2026). Not covered by a test: the gallery's switch lock kept the browser check from reaching the second request | `loadingGlb` |
| Gallery environment map | The `PMREMGenerator` and `RoomEnvironment` used once at start-up are freed right after | `js/pages/gallery/gallery.js` |
| Shelf book maps | One texture serves as both the roughness and the metalness map of a spine, flat spine or foil cover (`ormPair()` in `js/pages/index/shelf.js`). Before 19 November 2026 each was uploaded twice. The GPU saving was not measured | `ormPair()` |
| Download timeouts | A model download that hangs is cancelled through the loading manager's abort signal | The GLB load helper in `js/pages/gallery/gallery.js` (`manager.abortController.abort()`) |

## 4. Size budgets (enforced by tests)

`tools/verify/verify_hero_budget.mjs` (part of `npm test`) fails if:

| Asset | Budget |
|---|---|
| Any image loaded eagerly on the home page | 400 KB |
| A shelf cover | 600 KB |
| A thumbnail | 64 KB |

## 5. Network traffic from the browser

| Stream | Limits |
|---|---|
| Study events | Batches of 10, a flush every 10 s, at most 12 requests and 60 rows a minute per tab. Failed batches give back their row budget. |
| Surveys | 5 an hour per device |
| Operational reports | Batches of 10 from a queue of 20, a flush every 10 s |
| Progress and notes sync | A push waits 6 s after the last change. Retries back off (progress: 7, 12 and 24 s waits, up to 8 tries; notes: 7, 15 and 30 s waits, up to 5 tries). A failing notes pull retries at most 8 times. |
| Error tracing (Sentry) | 10% of page loads |

## 6. Motion and battery

- `prefers-reduced-motion` is honoured in 17 stylesheets, and in the scripts that animate: `cinema.js`, `study-app.js`, `map.js`, the gallery and the home shelf.
- The home notes carousel stops while hovered, focused, paused or when the tab is hidden (`stopped()` in `js/pages/index/home.js`).
- The focus timer counts wall-clock time, so background-tab throttling cannot slow it (12 November 2026).

## 7. Local server

`server.py` is multi-threaded, with 256 KB thread stacks and a request queue of 128. It supports byte ranges, so audio and video can seek. `tools/verify/verify_load.mjs` sends 40 overlapping study requests and expects all of them to return `200`.

## Performance tooling

| Tool | What it does |
|---|---|
| `tools/perf/pressure-test.mjs` | Playwright run against a base URL (live site by default) |
| `tools/verify/verify_hero_budget.mjs` | Image size budgets |
| `tools/verify/verify_load.mjs` | Local server under concurrent load |
| `tools/verify/measure_shelf.mjs` | Shelf measurements |
