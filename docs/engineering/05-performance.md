# 5. Performance

**Last verified:** 12 November 2026

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

### CSS minification at deploy

`tools/minify-release-css.mjs` (PostCSS) minifies every stylesheet in the bundle. `tools/verify/verify_css_minify.mjs` tests it.

## 2. Loading

- **Pages are plain files.** No server code runs for a page view (see [How it works](02-how-it-works.md#1-a-request-reaches-the-site)).
- **Scripts are deferred.** On `study.html`, 37 of the 39 external scripts use `defer`. The two that do not are `book-open.js` (the book-opening intro) and `consent.js` (the consent banner). Both run as soon as they are parsed.
- **Content loads when needed:**

| What | When it loads | Code |
|---|---|---|
| A sitting's full text | When that sitting is opened | `js/study/sheets/index.js` |
| The certificate maker | When it is first used | `study.html` (`data-certificate`) |
| The 3D globe on the map | When the globe view is opened | `GLOBE_SRC` in `js/map/map.js` |
| Article images | Lazily (`loading="lazy"`) | `study-app.js`, `loadSheet` |
| Gallery hall backgrounds | Prefetched, then cached | `prefetchHall` and `setHallBackdrop` in `js/gallery/app.js` |

## 3. 3D scenes

| Technique | Detail | Code |
|---|---|---|
| Compressed models | Meshopt geometry and WebP textures, built by `npm run compress*` from sources in `models/originals/` (not committed) | `tools/compress/` |
| Model cache | Least-recently-used, 6 models at most. The statue (`assembled` / `full_body`) is always kept; the 3 most recently shown are never evicted. Evicted models are freed from the GPU. | `GLTF_LRU_CAP`, `evictGltfs`, `disposeGltfScene` in `js/gallery/app.js` |
| Material copies | Copies made for the gold, clay, wireframe and lighting looks are released when a model is removed. Shared originals are left alone. | `releaseExhibitMaterials` in `js/gallery/app.js` (added 12 November 2026) |
| Hall textures | Up to 4 cached | `HALL_CACHE_CAP` |
| Download timeouts | A model download that hangs is cancelled through the loading manager's abort signal | The GLB load helper in `js/gallery/app.js` (`manager.abortController.abort()`) |

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
| Progress and notes sync | A push waits 6 s after the last change. Retries back off (progress: 7, 12 and 24 s waits, up to 8 tries; notes: 7, 15 and 30 s waits, up to 5 tries). |
| Error tracing (Sentry) | 10% of page loads |

## 6. Motion and battery

- `prefers-reduced-motion` is honoured in 17 stylesheets, and in the scripts that animate: `cinema.js`, `study-app.js`, `map.js`, the gallery and the home shelf.
- The home notes carousel stops while hovered, focused, paused or when the tab is hidden (`stopped()` in `js/home/home.js`).
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
