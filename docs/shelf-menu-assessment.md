# Book-spine menu — feasibility assessment

Source studied: `C:\Users\fanel\Downloads\complete-shelf-main\complete-shelf-main`
(the "Complete Shelf" repo: one 2.2 MB `index.html` + `README.md` + `PROMPT.md`).

Target: this repo's curriculum menu surfaces.

## What the reference actually is

`index.html` is a single file: CSS at 18–1713, markup 1723–1881, one ES module at
1881–6305 (Three.js, `OrbitControls`, PBR materials, procedurally generated cloth
/ foil / paper / wood textures, embedded WebP atlases and embedded MP3 Foley).
The 2.2 MB is almost entirely those embedded media, not logic.

Its own design notes name the influence: *"the clarity, material craft, and book
photography of contemporary editorial publishers, including Stripe Press"* — with
original titles, artwork and interaction design.

**The part that matters here is not the WebGL.** It is the static fallback
catalog, `.static-fallback` / `.fallback-book` (CSS 548–664), which is pure CSS.
The 3D scene hides it once WebGL is ready (`.webgl-ready .static-fallback`), but
it is a complete, self-sufficient presentation of the same seven volumes.

## The portable idiom, verbatim

```css
.fallback__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(140px, 1fr));
  align-items: end;              /* the shelf: bottoms align, tops vary */
  gap: 12px;
}
.fallback-book {
  display: grid;
  align-content: end;            /* everything sits at the foot of the spine */
  min-height: var(--book-height, 360px);
  background: var(--book-color);
  color: #f2e5c8;
  border: 1px solid rgba(247, 235, 205, 0.38);
  box-shadow: 0 18px 34px rgba(49, 31, 18, 0.13);
}
.fallback-book::before { /* inset foil rule, 10px in */ }
.fallback-book::after  { /* the foil emblem: a centred circle, 44% wide, at 12% */ }
.fallback-book span    { /* monospace, uppercase, 0.58rem, tracked — the volume */
                          /* label, in the foil colour */
.fallback-book strong  { /* the name, clamp(1.25rem, 2vw, 2rem), the ink colour */ }
```

Three things make this cheap to adopt:

1. **One CSS custom property per book** carries its whole identity —
   `--book-color`, `--book-foil`, `--book-height`. No images, no JS, no WebGL.
2. **The two pseudo-elements are the entire "cloth and foil" craft.** An inset
   hairline plus one circle reads as a bound volume. Nothing is downloaded.
3. **Nothing is 3D and nothing rotates.** It is flat CSS that reads as an object
   because of proportion, alignment and restraint.

The wider page idiom is equally portable and worth taking with it: a dark paper
ground (`--paper: #171a24`), one light ink, one accent, a serif for display and a
sans used as a *monospace substitute* for tracked small capitals, hairline rules
(`--rule`), and a consistent `cubic-bezier(0.2, 0.72, 0.24, 1)` ease.

## Measured: does it port?

Ported the component verbatim (only the column count changed) and rendered eleven
volumes at 1440×1000 — `qa/shelf-menu/feasibility.mjs`:

| measurement | result |
|---|---|
| shelf width | 1344px |
| spine | 113 × 276–344px |
| spine width variance | 113–113px (uniform) |
| bottoms aligned (the shelf) | **true** |
| horizontal page overflow | **0** |
| title type on the spine | 16.56px, 3 lines |

So the component ports cleanly and eleven volumes fit a desktop shelf without
scrolling. Screenshot: `qa/shelf-menu/probe-11-shelf.png`.

## The real problem is the copy, not the code

The metaballs fit; the titles do not. Actual lengths from `sheets-data.js`:

| | length |
|---|---|
| title, shortest | 60 chars |
| title, longest | **110 chars** |
| title, mean | **79 chars** |
| subtitle, mean | 114 chars |

A 113px spine carries about 45 characters at a legible size. **Every one of the
eleven titles would be truncated.** In the probe, "The Prophetic Blueprint: Why
Daniel's Unbroken Chain Centers on Jesus Christ" renders as "The Prophetic
Blueprint" — and a reader cannot tell sittings apart from three-line fragments.

This is the one finding that decides the design. Everything else is detail.

## What the data *does* offer for a spine

Each sitting already carries a genuine spine-shaped label and a real progression:

```
SHEET 00 · THE PROLOGUE   SHEET 01 · DANIEL 1   SHEET 02 · DANIEL 2  …  SHEET 10 · DANIEL 10-12
```

Eleven items numbered 00–10, in order, each with a short chapter mark, its own
hero image (`assets/site/home-ch*.jpg`), a read time, and one of four states
(completed / unlocked / locked / member). That is a shelf: eleven volumes, a
volume number, a short mark on the spine, and the long title on the title page.

## Theme interaction — a genuine risk, and a way through

The reference hard-codes `color: #f2e5c8` on the spine (light ink for dark
cloth). This site has **four themes**, two of them light, and its body text
colour flips with them. Dropping the reference's hard-coded ink into a light
theme gives bone-on-bone: unreadable.

The way through is to let each volume carry its own ink, derived from its own
cloth rather than from the page theme:

```css
.book {
  background: var(--book-color);
  color: var(--book-ink, #f2e5c8);              /* per-volume, not per-theme */
  border-color: color-mix(in srgb, var(--book-foil), transparent 62%);
}
.book .mark { color: color-mix(in srgb, var(--book-foil), #fff 28%); }
```

Because the cloth is a fixed dark colour in every theme, a fixed light ink is
*correct* in every theme — which is exactly how the full-screen diagram layer
already behaves in this repo (dark surface preserved under `paper-mode` and
`white-mode`). The shelf would read as a lit inset on a light page, not as part
of the flat page. That is a precedent already established here, not a new idea.

## Assessment

**Feasible, and a better fit than the reference's own subject.** The reference
binds seven software tools; this site has eleven books of a curriculum that is
already numbered, ordered and named like a series. The book metaphor is not
decoration here — Daniel is a scroll unsealed, a chain of empires, a series of
visions. A bound shelf says that before a word is read.

**Two conditions:**

1. **The spine carries the mark; the panel carries the title.** A shelf alone
   cannot present a 110-character title, and truncating all eleven would make the
   menu worse at its one job. The reference solves this the same way — it has a
   `detail-panel` beside the shelf. Selecting a volume should open the full title,
   subtitle, reference and read time in an editorial panel, with the existing
   filters, progress and status preserved.
2. **Keep a dense view.** A shelf is a browse surface, not a scanner. Eleven
   sittings with progress states are also read as a checklist, and this site
   already ships that grid. The shelf should be the front door with the grid one
   control away, not a replacement.

**Not recommended:** the WebGL scene. It is 4,400 lines and ~1.5 MB of embedded
media for one menu, it would fight the existing Three.js exhibit, and the
fallback catalog already delivers the entire visual idea in flat CSS.

## Scope estimate

- `study.html` — one new `.shelf-*` block, four-theme ink, responsive steps.
- `js/study/study-app.js` — a renderer for the shelf beside `renderLessonsPortal()`,
  reusing `canAccessSheet` / `sheetCompleted`; no new data.
- Reuse the existing `assets/site/home-ch*.jpg` per sitting for the panel.
- No dependency, no build step, no changes to `sheets-data.js` copy.

## Built: `shelf.html`

A standalone page, as agreed — nothing existing was touched, so it can be
reviewed and discarded without a revert.

**What it is.** The portal's front door as a shelf of eleven clothbound volumes.
Each spine carries its volume mark (`SHEET 02 · DANIEL 2`), the lead of the
sitting's own roadmap title (`The Metallic Colossus`), and its read time.
Selecting a volume opens the title page beside it: the full 95-character title,
the subtitle, the scripture line, and the sitting's roadmap as a plate. Locked
sittings stay on the shelf, dimmed, marked `Locked` — the mark stays at full
strength, because dimming the word that explains the dimming reads as a bug.

**Where the copy comes from.** `epoch` for the mark, `readTime` for the time,
`infographic.title`'s lead for the spine title, and `title` / `subtitle` /
`scripture` / `infographic` for the title page. All authored; nothing invented,
nothing truncated. The leads are distinct across all eleven (19–38 characters),
which is what makes them usable as spine titles.

**How it fits the site.** `BAJourney.canAccessSheet` and `sheetCompleted` drive
the locked and completed states, so the shelf cannot disagree with the guide. The
theme is read from the guide's own `daniel_theme_name_v1` and never written back.

| requirement | how it is met |
|---|---|
| the shelf | `align-items: end`; eleven volumes, own heights, one baseline |
| one authored value per volume | `--cloth`; ink, foil and shading derived with `color-mix()` |
| four themes | the cloth is authored, so a fixed light ink is correct in every theme. The page around it is dark or light, following the guide |
| keyboard | roving tabindex over a `role="listbox"`: arrows, Home/End, one tab stop |
| reduced motion | transitions neutralised; verified at 0 animations |
| no dependency | one file, one stylesheet, one script tag; no build step |

**Verified: 69/69 assertions** (`qa/shelf-menu/verify.mjs`) across structure,
the shelf baseline, per-spine contrast sampled from rendered pixels, selection,
keyboard, four themes, theme inheritance, four viewports (390/900/1440/1920),
and reduced motion. Screenshots in `qa/shelf-menu/verify/`.

**Two defects the harness caught, both real:**

1. `var isDone` inside a closure IIFE shadowed the `isDone` reader for the whole
   closure, so every call threw and the page loaded with no current volume and an
   empty title page. The readers are now named `canOpenSheet` / `sheetIsDone`.
2. The plate image was declared `width="1200" height="1600"` for a **1672×941
   landscape** asset, so the element reserved a portrait box and the roadmap
   letterboxed inside it. `object-fit` was also `cover`, which cropped an
   information-dense plate. Both fixed and asserted by ratio.

Two measurement bugs were caught in the harness itself and are worth recording,
because both would have produced a confident wrong answer:

- Reading the cloth out of `getComputedStyle().backgroundImage` reported 1.01:1
  for every volume. The declaration is a stack of four gradients; its computed
  form is a list of stops, not the visible shade.
- `color-mix()` computes to `color(srgb 0.90 0.87 0.81)`, whose channels are 0–1
  floats. A regex lifting numbers out of a colour string read that ink as
  near-black. Colours are now resolved by painting them to a canvas and reading
  the pixel back, so any colour syntax arrives in one space.

**Not done:** the shelf is not linked from the portal yet. That is deliberate —
the integration is a one-line change to `renderLessonsPortal()` plus a control to
switch between the shelf and the existing grid, and it should be a decision made
after seeing the page rather than before.

**Also added:** `tools/lint-inline-scripts.mjs`. The repo keeps page logic in
inline `<script>` blocks, which `.oxlintrc.json` cannot see, so that code shipped
unlinted. The harness extracts every inline block and runs oxlint over the set —
7 blocks across 8 root pages, currently clean. It caught a dead function in
`shelf.html` on first run, and it is verified to exit non-zero on a real error
rather than passing silently.

## Superseded: the cinematic shelf

The flat-CSS `shelf.html` above has been replaced by `the_shelf_of_daniel
(cinematic).html`, copied at the owner's request (original SHA-256
`DBAEA7D9…F866BE`). This reverses the "not recommended: the WebGL scene" call
above. That was a judgement about weight, and the owner chose the look.

It was written for this repo: it reads `sheets-data.js` and `BAJourney`, so
locks and completion match the guide, and it links to `study.html?sheet=N` or
`account.html?next=…`.

**Two deliberate departures from a byte-for-byte copy**, each forced by a defect:

1. **Import map points at `vendor/three` (r181), not jsDelivr 0.169.** Production's
   CSP (`_headers`, `vercel.json`) does not allow `cdn.jsdelivr.net` in
   `script-src`, so the CDN import is blocked there and the page drops to its
   no-WebGL drawer. Localhost has no CSP, which is why this could not be seen
   in development. `qa/shelf-menu/csp.mjs` applies the real policy from
   `_headers`: the vendored build renders with 0 violations, and the CDN build
   is blocked (a control, so the test can fail). The render is visually the
   same as 0.169.
2. **The frame loop is cancelled on `visibilitychange`.** A hidden tab keeps its
   queued `requestAnimationFrame` callback, and the handler also called `loop()`
   directly, so every hide/show added one more render loop. Measured with
   `qa/shelf-menu/loop.mjs` (a model of the browser's rAF pause): the original
   goes 1 → 1 → 3 → 4 loops over three cycles; patched, it stays at 1.

Still as authored:

- A 496 KB base64 portrait inline (`window.SHELF_PORTRAIT`). The page is 646 KB.
- `&preview=full` on every sitting link. It has no effect off localhost (`journey.js:340`).
- 7 oxlint style findings in its module (shadowing, short-circuit statements,
  `img.onload`), so `tools/lint-inline-scripts.mjs` exits non-zero. None is a bug.

**Linked from:** the `index.html` top nav ("The Shelf"), the study portal's
progress card ("Browse the Shelf"), and the Study Syllabus drawer footer. The
portal's card grid is unchanged and stays the dense progress view.

**Verified:** `qa/shelf-menu/cinematic.mjs`, 14/14 checks: loader, 11 volumes,
catalogue, dossier link, locked-volume routing, zero console errors, no overflow
at 390px, and all three entry links. `qa/shelf-menu/verify.mjs` tests the old
flat page and no longer applies.

## Review: bugs, leaks, security, performance

**Fixed**

- **Memory/listener leak on every sheet switch** (`js/study/study-app.js`).
  Stepping through all 11 sheets added +3,680 DOM nodes and +470 event
  listeners per pass, linearly and without limit (`qa/shelf-menu/study-probe.mjs`,
  GC forced). Live DOM stayed flat, so the growth was detached nodes pinned by
  listeners. Two causes, found by instrumenting `addEventListener`:
  the story reader's `visibilitychange` listener only removed itself on the
  *next* visibility event, and a mindmap was only destroyed when its own figure
  was re-rendered, but a sheet switch creates new figures, so the old mindmaps
  (each with a body-wide `MutationObserver`) were orphaned. New
  `releaseSheetFigures()` runs before the article is replaced. After: 0 nodes,
  0 listeners per pass, no runtime errors; mindmap (78/78), full screen (50/50),
  flow, story reader/layers/mobile and fit suites all pass.
- **Shelf render loop multiplied across tab switches** (above).
- **Shelf blocked by production CSP** (above).
- **Non-constant-time secret comparison** in `functions/_middleware.js`
  (`/__rate` bearer check). Now `safeEqual()`. `tools/security/run_penetration_audit.mjs`: 20/20.
- **Mojibake in `study.html`** (116 sequences: em dashes, arrows and emoji
  decoded as Windows-1252 and re-saved). Repaired losslessly and idempotently.

**Checked, nothing to fix**

- No hardcoded secrets; the only key in the tree is the publishable one.
- User-typed values (name, cohort, bookmarks) are escaped before `innerHTML`;
  reviews are built with `textContent`.
- RLS is enabled on every table; a trigger forces new and edited reviews back to
  `pending`, so a user cannot self-approve; event payloads are size-capped.
- `server.py` binds loopback only, with realpath traversal, dotfile and
  extension guards. The QA mock session is gated to localhost.

**Fixed in a second pass**

- **Operator email no longer ships in public code.** `js/shared/auth.js` carried
  `MODERATOR_EMAILS` and compared against it, contrary to the project's own
  check (`verify_insights.mjs` 3b: "auth.js must ask the server who is a
  moderator"), which passed only because a comment mentioned the function name.
  It now calls `is_review_moderator()` and fails closed on no session, error,
  rejection or a non-boolean answer. A localhost-only QA mock can opt in with
  `moderator: true`. In `tools/supabase-reviews.sql` the list moved into a
  locked table, `public.exhibit_moderators` (RLS on, no grants, read only by the
  SECURITY DEFINER function). The live function was replaced with that version,
  and one operator row was inserted into `public.exhibit_moderators`, so the
  address is no longer inside the function. The address remains in git history;
  removing it from there needs a history rewrite of `master`, which was not done.
- **`card-min.js`**: `headTextOf` threw `NotFoundError` when a card's head wrapped
  a nested card (reproduced; the minimized state was then never persisted), and
  every `childList` change anywhere re-scanned the whole document. It now strips
  controls at any depth and enhances only the changed subtrees, re-measures
  cards whose text changed in place, and keeps a full pass for resize.
  `qa/shelf-menu/cardmin.mjs` 7/7 (200 unrelated mutations: 5 scans before, 0
  after). On the real desk the same cards are enhanced on all 11 sheets, and
  compact sizing agrees with `height < 150` as often as the original (0 of 248
  disagree); a first version regressed that for in-place text edits and was
  corrected.
- **Port 8000.** The cause was not only that something held the port:
  `server.py` falls back to the next free port, but the tests ignored its output
  and kept polling 8000, and threw before cleanup, orphaning a server. New
  `tools/verify/_server.mjs` honours `--base`/`BASE`, uses a healthy server on
  8000, or starts one and reads the port it really chose, and always stops it.
  `verify_portal_and_hubs` and `verify_account_and_banner_e2e` use it and pass
  with 8000 still blocked.

**Noted, not changed**

- Each live mindmap holds a `MutationObserver` on `document.body`. Teardown now
  works, so this is bounded by the diagrams on the current sheet.
- The process holding port 8000 (a `python server.py` from before this session)
  was left alone; it is not ours to stop.
- About twenty other scripts in `tools/verify/` still default `--base` to a fixed
  port. They accept `--base`, so they work; they were not changed.

## What I would do next, if the shelf is approved

1. Link it from the portal and from the top bar, with a control to switch between
   the shelf and the card grid, so the at-a-glance progress view survives.
2. Give the "Study Syllabus" drawer the same type and rule vocabulary so the two
   navigation surfaces read as one site.
3. Nothing else. The shelf does not need the WebGL scene, a soundtrack, or a
   page-turn animation to do its job, and each of those would be weight the menu
   does not earn.

