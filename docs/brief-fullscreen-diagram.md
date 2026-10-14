# Full-screen diagram view — brief

## Why

Two measured problems, one feature:

1. **The lesson column is too narrow for the map.** The mindmap renders a fixed world scaled to its host. In an ~846px column the scale lands at 0.487–0.527, so type declared in world units arrives at **7.5–11.1px** on screen. The node titles read; the explanatory text does not. Shrinking the world (a separate task) lifts body text to ~11.9px — passable, still cramped.
2. **The map was designed for a viewport.** The prototype is a full-page 1600×900 canvas, where its 15.5px text *is* 15.5px. Given a viewport-sized host, the same map is not merely legible but generous.

So full screen is not a bonus — it is the surface the design was drawn for. The lesson column becomes the preview; full screen is where the diagram is properly read.

## What the user asked for

> "I need a full screen feature where really gets to see the diagram fully with all features."

Both halves are requirements: **fully** (the whole diagram, at a size where every label reads) and **all features** (nothing disabled, nothing replaced by a reduced version).

## Mechanism — already supported, do not rebuild it

`fit()` in `js/study/mindmap.js` computes `min(host.clientWidth / W, host.clientHeight / H)` and transforms the world stage. It measures **the host element**, never `window`. That means:

- Give the `.mm` host a full-viewport box and `fit()` does the rest — no reparenting, no second overlay, no separate render path.
- A `ResizeObserver` on the host already calls `fit()`, deduped on `clientWidth`/`clientHeight`. `fit()` is also called on construction (`build(); fit(); observe();`), from `refresh()`, from the returned `resize()`, and after `document.fonts.ready`. **Nothing caches the block size at create time** — the geometry depends only on world constants, and both measured layouts (`layoutCross`, `layoutFans`) re-run inside every `fit()`. This was proved by forcing the host to other shapes (846×300 → scale 0.4515, recentred; 600 wide → compact outline, no transform).
- Prefer `position: fixed; inset: 0` on the host over the Fullscreen API: it escapes ancestor `overflow` clipping exactly as the story reader's `.story-read` does, it works without a user-gesture requirement, it behaves the same in every engine, and it avoids iOS's restrictions on element fullscreen. If you also want native fullscreen, it must be an *enhancement* layered on top, never the mechanism.

### Two traps, both measured by the agent who just changed the world

1. **`aspect-ratio: 16/11` on `.mm` is what keeps the block's shape equal to the world's.** Override it — e.g. a plain `height: 100%` on a viewport of a different shape — and the stage letterboxes *and the type shrinks*: measured **7.0px** at 846×300. So in full screen, size the host to the largest 16:11 rectangle that fits the viewport rather than filling a rectangle of arbitrary shape, or the type gets worse than the lesson column you are trying to escape.
2. **`max-height: min(70vh, 620px)` never binds at any column width; it binds below ~831px of viewport height.** In full screen you are presumably removing that cap — say so explicitly in the CSS, and confirm the height that results. Below a ~831px-tall viewport the map currently bottoms out at 11.46px of body text.

The world is now **960×660** and every placement is derived from `W`/`H` via `KX`/`KY`/`kx()`/`ky()`. Nothing you do should reintroduce a positional literal.

## All features must work in full screen

This is the acceptance bar, and each item needs a test:

| Feature | Requirement |
|---|---|
| The map itself | The whole diagram visible, nothing clipped, nothing off-canvas, at a scale where body text is comfortably readable |
| Scenes / films | Click a node → its film opens, at full-screen size, and closes back to the map |
| HUD controls | Play/Stop, Overview, Replay all usable; a Full screen entry/exit control is added, keeping the in-block budget at three |
| Citation chips | A chip is clickable, opens its reference row, and the row is reachable (the reference list lives behind an opaque overlay — decide and document the stacking) |
| Keyboard | Arrows move between nodes, Enter/Space opens, Escape closes the *innermost* thing open (film → then map), focus never escapes to the page behind |
| Pointer | Click and drag/pan if the map supports it; no dead zones from the new fixed positioning |
| Themes | All four themes still render the block as a dark inset — entering full screen must not change the palette |
| Reduced motion | Full screen must not introduce motion that `prefers-reduced-motion` has otherwise removed |
| Focus management | Focus moves into the full-screen view, is trapped there while open, and returns to the control that opened it on exit |
| Scrolling | The page behind must not scroll while the view is open; releasing on close must **always** happen, including on Escape, on the exit control, on a layer above opening, and on a sitting change while open |

## Stacking

The page's ladder today: insight cards ≈ 72, the story reader `.story-read` = 220. Put the full-screen diagram **below the reader** so a scene's reference row or a story reader opened from a chip lands on top of it, and above the insight cards. State the value you chose and why.

`wireStory`'s `anotherLayerOwnsEscape()` arbitrates Escape between the reader and layers above it (`#infographic-modal`, `#certificate-panel`, `#certificate-review-modal`). If the full-screen diagram can be open at the same time as the reader, decide explicitly which one owns Escape and make both sides agree — one Escape must close one thing.

## Scope

- `js/study/mindmap.js` — the full-screen state, its control, focus trap and teardown.
- `study.html` — `.mm-*` CSS only. **A parallel agent is editing the `.mm-*` world geometry and block height in this same file**, and a third is working in `.flow-*`. Stay in your own selectors; if you need a shared value, read it, do not redefine it.
- `js/study/study-app.js` — only if the layer arbitration genuinely requires it. Another agent is editing `bodyFlow` there; keep any edit to the smallest possible hunk and say exactly what you changed.
- Do **not** touch `js/study/sheets-data.js`, `js/study/mindmap.js`'s world constants, or any copy.

## Verification

1. `npm run lint` → 0 errors.
2. Server on **8100** — 8000/8020/8040/8050/8060/8070 are dead; **8080 and 8090 are taken by the other two agents.** Do not reuse those.
3. Extend `tools/verify/verify_mindmap.mjs` or add `tools/verify/verify_mindmap_fullscreen.mjs` with an assertion per row of the table above. Measure, do not infer: host box equals the viewport; world scale is ≥1.0 at a 1440×1000 viewport; body text on screen ≥ 15px; a node opens its film; Escape closes the film then the map; focus returns to the opener; `document.documentElement` scroll is released on close; palette unchanged in paper and white.
4. Re-run `node tools/verify/verify_mindmap.mjs` (72 assertions) and `node tools/diagrams/validate-specs.mjs` — both must stay green.
5. Screenshots of the full-screen view, a film open inside it, and the exit state, to `qa/proofs/mindmap-fullscreen/`.

Report the before/after scale and type numbers, the stacking value you chose, how Escape is arbitrated, and anything in this brief that turned out to be wrong about the code. Do not commit anything.
