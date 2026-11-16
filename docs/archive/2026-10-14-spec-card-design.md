# Card Design Spec — porting *The Redemptive Center* carousel into the study story deck

**Status:** design specification, not an opinion piece. Every value below is copied verbatim from source or target and attributed.

| | |
|---|---|
| **SOURCE** | `C:\Users\fanel\Downloads\The Redemptive Center (5).html` (508 lines). Two `<style>` blocks: lines 10–146 (carousel), lines 148–208 (study row, `#sheet`, `link`/`bridge`). Script: lines 298–506. |
| **TARGET (markup/CSS)** | `study.html` — story CSS block lines **584–1264**; theme-restore block lines **5395–5457**. |
| **TARGET (markup/JS)** | `js/study/study-app.js` — `bodyStory()` line **2489**, `wireStory()` line **2568**, `storySrc()` line **2479**, `STORY_PHOTO_LAYERS` line **2487**, `diagramCite()` line **2252**, `renderSheetDiagrams()` line **3004**. |
| **TARGET artwork** | `assets/study/diagrams/{exile,cross,glory}.jpg` |

**Selector-name warning, read first.** The source's `.stage` (the perspective viewport) maps to the target's **`.story-viewport`**, *not* `.story-stage`. The target's `.story-stage` is the padded dark shell that wraps viewport + controls + utility. Every "port `.stage`" instruction below means `.story-viewport`. Getting this wrong silently drops `perspective` onto the wrong box.

**Scope.** Out of scope and must not be ported: `.site-shell`, `.intro`, `.eyebrow`, `h1`, `.intro__copy`, `.experience` (source standalone page chrome). The target already has its own page shell.

---

## 1. Design tokens

### 1.1 Source `:root` (source lines 10–27), verbatim

```css
:root {
  color-scheme: dark;
  --page: #080807;
  --surface: #0e0d0a;
  --ink: #f6efdf;
  --muted: #b9ad94;
  --muted-2: #807663;
  --gold: #d5b16a;
  --gold-bright: #f2d797;
  --line: rgba(213, 177, 106, .34);
  --serif: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --sans: "Segoe UI", Arial, sans-serif;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

A **second** `:root` block appears at source lines 148–149:

```css
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
```

Note the source declares `box-sizing: border-box` on `:root` (line 148) **and** `*, *::before, *::after { box-sizing: border-box }` (line 28). The target relies on Tailwind's preflight for the universal rule; it has no `:root` `box-sizing`.

Body ground (source lines 30–39):

```css
body {
  margin: 0;
  min-height: 100svh;
  color: var(--ink);
  background:
    radial-gradient(ellipse at 50% 7%, rgba(190, 139, 53, .17), transparent 33rem),
    radial-gradient(ellipse at 50% 75%, rgba(100, 77, 35, .09), transparent 35rem),
    var(--page);
  font-family: var(--serif);
}
```

### 1.2 Target tokens

The story deck currently declares its palette **on `.story-stage`** (`study.html` lines 585–597):

```css
.story-stage {
  --chain-gold: #d5b16a;
  --chain-strong: #f2d797;
  --chain-muted: #b9ad94;
  --story-ink: #f6efdf;
  margin-top: 0.4rem;
  padding: 0.85rem 0.45rem 1rem;
  border-radius: 18px;
  color: var(--story-ink);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(190, 139, 53, 0.16), transparent 18rem),
    #080807;
}
```

The ancestor `.sheet-diagram` (lines 278–281) declares **different** values, and `.sheet-diagram` under paper/white themes (lines 574–580) declares a third set. Both are shown because they are the fallback scope for anything that escapes `.story-stage`.

### 1.3 Mapping table

| Source token | Source value | Target token | Target value | Verdict |
|---|---|---|---|---|
| `--page` | `#080807` | `.story-stage` background layer 2 | `#080807` | **identical**, but hard-coded, not a token |
| `--surface` | `#0e0d0a` | `.story-card` `background` | `#0e0d0a` | **identical**, hard-coded |
| `--ink` | `#f6efdf` | `--story-ink` | `#f6efdf` | **identical** |
| `--muted` | `#b9ad94` | `--chain-muted` | `#b9ad94` | **identical** |
| `--muted-2` | `#807663` | *(none)* | — | target hard-codes `#807663` at `.story-step` (line 819). Token gap. |
| `--gold` | `#d5b16a` | `--chain-gold` | `#d5b16a` | **identical** |
| `--gold-bright` | `#f2d797` | `--chain-strong` | `#f2d797` | **identical** |
| `--line` | `rgba(213, 177, 106, .34)` | `.story-card` border | `rgba(213, 177, 106, 0.34)` | **identical**, hard-coded |
| `--serif` | `"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif` | — | `.story-title` → `"Playfair Display", Georgia, serif`; `.story-text` → `Newsreader, Georgia, serif` | **different family**. Do not import Iowan Old Style; keep the target's two faces. |
| `--sans` | `"Segoe UI", Arial, sans-serif` | — | `Inter, "Segoe UI", sans-serif` | target is a **superset** (adds Inter ahead of Segoe UI) |
| `--mono` | `"SFMono-Regular", Consolas, "Liberation Mono", monospace` | — | `"JetBrains Mono", monospace` | **different family** |

### 1.4 Numeric differences to flag

1. **`.sheet-diagram` chain tokens differ from `.story-stage` chain tokens.** `--chain-gold: #e4c56a` vs `#d5b16a`; `--chain-strong: #f7e6bd` vs `#f2d797`; `--chain-muted: #b3a98f` vs `#b9ad94`. Inside `.story-stage` the story values win by specificity-of-scope. **Outside it they do not** — see item 2.
2. **The full-screen reader is re-parented to `document.body`.** `wireStory()` line 2883 calls `document.body.appendChild(reader)`. While open, `.story-read` is **not** a descendant of `.story-stage`, so `--chain-gold`, `--chain-strong`, `--chain-muted` and `--story-ink` **do not resolve** inside it. There is also no `:root`-level declaration of any `--chain-*`. This is why every `.story-read-*` colour in the target is a hard-coded hex (lines 909, 988, 1100, 1103, 1128, 1157, 1179, 1184, 1188, 1202, 1219, 1227, 1190) and why the theme-restore block (5431–5456) uses literals. **Consequence:** any ported rule that puts `var(--chain-gold)` (etc.) inside `.story-read` will render with no colour. Either keep literals in the reader, or re-declare the tokens on `.story-read` itself.
3. **Latent bug worth fixing while porting:** `.story-medal { color: var(--chain-gold) }` (line 711) is fine on the stage, but `.story-read-deck .story-medal` (line 1072) only sets width/height. The cloned medal inside the reader therefore resolves `var(--chain-gold)` to nothing and inherits instead of painting gold. Fix by adding `--chain-gold: #d5b16a` to `.story-read` or an explicit `color` on `.story-read-deck .story-medal`.
4. **Source `color-scheme: dark` must not be ported to `:root`.** The target has four themes (charcoal, night, paper, white). Setting `color-scheme: dark` globally would force dark native form controls and scrollbars in paper/white mode. Scope it to `.story-stage, .story-read` only — both are permanently dark surfaces.
5. **Font sizes in `rem` differ at 16px root.** Source `.card__kicker` is `600 .6rem/1.4` = **9.6px**; target `.story-stage .story-kicker` is `0.68rem` = **10.88px**. Source `.card__topline` `.62rem` = **9.92px**; target `.story-topline` `0.68rem` = **10.88px**. Source `.live-message` `.61rem` = **9.76px**; target `.story-live` `0.68rem` = **10.88px**. These are genuine size increases, not rounding.
6. **Card width unit differs.** Source `.stage` uses `min(356px, 78vw)` — viewport-relative. Target `.story-viewport` uses `min(356px, 78%)` — container-relative, and the container sits inside `.story-stage` padding of `0.85rem 0.45rem 1rem`, so the target card is measurably narrower on wide screens. Switching to `78vw` (source) would overflow the padded shell. **Recommendation: keep `%`.**

---

## 2. The card

### 2.1 `.card` geometry (source lines 61–72)

```css
.card {
  --d: 0;
  --distance: 0;
  position: absolute; top: 7px; bottom: 13px; left: 50%; width: var(--card-width);
  margin-left: calc(var(--card-width) / -2); border-radius: 22px; overflow: hidden;
  background: var(--surface); border: 1px solid rgba(213, 177, 106, .34);
  box-shadow: 0 28px 66px rgba(0, 0, 0, .4), inset 0 0 0 1px rgba(255,255,255,.018);
  transform: translateX(calc(var(--d) * 64%)) rotateY(calc(var(--d) * -10deg)) scale(calc(1 - var(--distance) * .055));
  transform-origin: 50% 50%; opacity: calc(1 - var(--distance) * .22);
  z-index: calc(10 - var(--distance)); transition: transform .72s cubic-bezier(.2,.76,.2,1), opacity .55s ease, border-color .55s ease, box-shadow .55s ease;
  cursor: pointer; user-select: none;
}
```

Card width comes from the viewport, not the card: source `.stage { --card-width: min(356px, 78vw); position: relative; height: 492px; width: 100%; margin: 0 auto; perspective: 1500px; isolation: isolate; overflow: hidden; touch-action: pan-y; -webkit-tap-highlight-color: transparent; }` (lines 55–60).

### 2.2 The two states

```css
.card.is-active { border-color: rgba(242, 215, 151, .92); box-shadow: 0 30px 76px rgba(0,0,0,.48), 0 0 32px rgba(213,177,106,.08), inset 0 0 0 1px rgba(242,215,151,.2); cursor: default; }
.card:not(.is-active) { filter: saturate(.78); }
```

**`filter: saturate(.78)` is the one source rule the target must not adopt.** The target replaced it deliberately (`study.html` lines 642–654):

```css
/* Dimming a neighbour with a wash beats filtering it: a filter forces the
   whole card — artwork included — to repaint on every frame of the slide. */
.story-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: rgba(4, 4, 6, 0.42);
  opacity: 1;
  transition: opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1);
}
.story-card.is-active::after { opacity: 0; }
```

Beyond repaint cost, `filter` on an element makes it a containing block for `position: fixed` descendants and creates a stacking context; the target's reader is moved to `<body>` so it escapes today, but any future in-card fixed positioning would break. Keep the painted wash.

**`.card.is-active { cursor: default }` also must not be adopted verbatim.** The target binds a click on the *active* card to `openRead()` (`study-app.js` lines 2922–2926). Making the active card `cursor: default` would advertise the opposite of what it does.

**`user-select: none` must not be adopted.** It would block selecting the `story-detail` copy and the citation chip label — both of which the target expects readers to copy.

### 2.3 Photo

```css
.card__photo { position: absolute; inset: 0 0 auto; height: 66%; width: 100%; object-fit: cover; display: block; pointer-events: none; }
.card--exile .card__photo { object-position: center 48%; }
.card--cross .card__photo { object-position: center 47%; }
.card--glory .card__photo { object-position: center 45%; }
```

Target (lines 659–666):

```css
.story-photo {
  position: absolute;
  inset: 0 0 auto;
  width: 100%;
  height: 62%;
  object-fit: cover;
  object-position: center 46%;
}
```

Differences: **height 62% → 66%**, and object-position is a **single shared `center 46%`** instead of **three per-card values (48% / 47% / 45%)**. `display: block` and `pointer-events: none` are absent on the target; `pointer-events: none` matters because the card is a click target and `<img>` de-focuses drag behaviour in some browsers.

The source reaches per-card values through hard-coded modifier classes `.card--exile / .card--cross / .card--glory`, which the target's `bodyStory()` does not emit and which **cannot generalise** — a `steps` diagram may have 2, 4 or 7 cards. Port as a custom property instead (see change list §15).

### 2.4 Wash (source line 79)

```css
.card__photo-wash { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(4,5,8,.06) 0%, transparent 33%, rgba(9,8,6,.15) 49%, #0e0c08 73%, #0e0c08 100%); }
```

Target (lines 667–671):

```css
.story-wash {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(4, 5, 8, 0.08) 0%, transparent 30%, rgba(9, 8, 6, 0.2) 48%, #0e0c08 70%, #0e0c08 100%);
}
```

Stop-by-stop difference: `rgba(4,5,8,.06)@0%` → `rgba(4,5,8,0.08)@0%`; `transparent@33%` → `@30%`; `rgba(9,8,6,.15)@49%` → `rgba(9,8,6,0.2)@48%`; `#0e0c08@73%` → `@70%`. Target is missing `pointer-events: none`.

### 2.5 Topline (source lines 80–81)

```css
.card__topline { position: absolute; top: 18px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #f4e5c4; font: 500 .62rem/1 var(--mono); letter-spacing: .16em; text-transform: uppercase; text-shadow: 0 2px 12px #000; }
.card__topline .index { color: var(--gold-bright); }
```

Target (lines 672–682):

```css
.story-topline {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  padding: 0.85rem 1rem 0;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  color: var(--chain-gold);
}
```

Differences: source is `position: absolute` with `justify-content: space-between` and **two** spans (left label "The redemptive story", right `01 / 03`); target is `position: relative` in the card's flex column with `justify-content: flex-end` and **one** span (`.story-index`). Source has `text-transform: uppercase` and `text-shadow: 0 2px 12px #000`; target has neither. Source index colour is `--gold-bright` (`#f2d797`); the target's `.story-index` has no own rule and inherits `var(--chain-gold)` (`#d5b16a`).

The target's `01 / 03` string is produced in `bodyStory()` line 2500: `String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0')` — same format as the source.

### 2.6 Content block (source line 82)

```css
.card__content { position: absolute; inset: 42% 0 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; text-align: center; padding: 20px 24px 28px; background: linear-gradient(180deg, rgba(14,12,8,0) 0%, rgba(14,12,8,.9) 23%, #0e0c08 47%, #0e0c08 100%); }
```

Target (lines 683–699):

```css
.story-content {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  bottom: 0;
  top: 36%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  max-height: none;
  overflow: auto;
  padding: 1.1rem 1.2rem 1.25rem;
  text-align: center;
  background: linear-gradient(180deg, rgba(14, 12, 8, 0) 0%, rgba(14, 12, 8, 0.9) 22%, #0e0c08 46%, #0e0c08 100%);
}
```

Differences: **`top: 36%` → `42%`**; gradient stops **`22%` → `23%`** and **`46%` → `47%`**; padding `1.1rem 1.2rem 1.25rem` (= 17.6px / 19.2px / 20px) → `20px 24px 28px`. Target adds `z-index: 1`, `overflow: auto` and `max-height: none` (the target's cards carry a `story-detail` line the source does not, so the block must be able to scroll — see §7).

Photo/content overlap is unchanged in relationship (source photo 0–66% vs content 42–100%; target 0–62% vs 36–100%), so raising photo height to 66% and content top to 42% together preserves it.

Target-only rule with no source analogue (lines 700–706) — **must be preserved**:

```css
.story-card:not(:has(.story-photo)) .story-content {
  top: 2.2rem;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 28%, rgba(190, 139, 53, 0.18), transparent 13rem),
    #0e0d0a;
}
```

Its `top: 2.2rem` is unaffected by the 36%→42% change, but any new `--card-*` custom property must not leak into it.

### 2.7 Kicker, heading, chip, description

```css
.card__kicker { margin: 0 0 9px; color: var(--gold); font: 600 .6rem/1.4 var(--sans); letter-spacing: .22em; text-transform: uppercase; }
.card h2 { max-width: 100%; margin: 0 0 15px; color: #fff8e9; font-size: clamp(1.14rem, 2.2vw, 1.48rem); font-weight: 500; line-height: 1.18; letter-spacing: .035em; text-transform: uppercase; text-wrap: balance; }
.scripture { display: inline-flex; justify-content: center; align-items: center; min-height: 30px; margin: 0; padding: 7px 13px 6px; border: 1px solid rgba(213,177,106,.55); border-radius: 99px; color: var(--gold-bright); background: rgba(213,177,106,.06); font: 500 .62rem/1 var(--mono); letter-spacing: .08em; }
.card__description { max-width: 275px; margin: 14px auto 0; color: #d1c5ad; font-size: 1.06rem; font-style: italic; line-height: 1.42; text-wrap: balance; }
.card--exile { --accent: #a9c3e7; }
.card--exile .scripture { border-color: rgba(169,195,231,.52); color: #c4d8f4; }
.card--glory { --accent: #f6dfaa; }
```

(Source lines 83–90.)

Target equivalents:

| Source | Target rule | Line | Deltas |
|---|---|---|---|
| `.card__kicker` | `.story-stage .story-kicker` | 714–722 | `0.6rem` → `0.68rem`; family `--sans` → `"JetBrains Mono", monospace`; `letter-spacing .22em` → `0.16em`; target adds `line-height: 1.4 !important`; margin `0 0 9px` → `0 0 0.35rem !important` (9px → 5.6px) |
| `.card h2` | `.story-stage .story-title` | 744–753 | element `h2` → `h4`; `max-width: 100%` → `18rem`; `clamp(1.14rem, 2.2vw, 1.48rem)` → `clamp(1.15rem, 2vw, 1.42rem)`; `letter-spacing .035em` → `0.02em`; **target drops `text-transform: uppercase`**; target drops `text-wrap: balance`; margin `0 0 15px` → `0 0 0.55rem !important` (15px → 8.8px); family `--serif` → `"Playfair Display", Georgia, serif` |
| `.scripture` | `.story-stage .chain-cite` + base `.chain-cite` | 405–423, 754 | see below |
| `.card__description` | `.story-stage .story-text` | 755–763 | `max-width: 275px` → `18rem` (275px → 288px); margin `14px auto 0` → `0.75rem 0 0 !important` (14px → 12px); `font-size: 1.06rem` → `1.02rem`; target adds `line-height: 1.42 !important`; target drops `text-wrap: balance` |
| *(none)* | `.story-stage .story-detail` | 766–774 | target-only line, see §7 |

**The `.scripture` chip is the target's citation chip, and the two are structurally different.** Source `.scripture` is a `<p>`. Target `.chain-cite` is a `<button>` (or a `<span class="chain-cite is-flat">` when the reference cannot resolve) emitted by `diagramCite()` (`study-app.js` line 2252) and wired by `decorateCitations()` (line 2166) to open the matching row in `#sheet-verify`. Current target base (lines 405–434):

```css
.chain-cite {
  margin: 0 0 0.6rem;
  padding: 0.45em 0.95em;
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: 99px;
  background: rgba(212, 175, 55, 0.07);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  line-height: 1.35;
  max-width: 100%;
  white-space: normal;
  color: var(--chain-gold);
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.chain-cite:hover { background: rgba(212, 175, 55, 0.18); border-color: rgba(228, 197, 106, 0.8); }
.chain-cite.is-flat { cursor: default; color: var(--chain-muted, #b3a98f); border-color: rgba(197, 155, 39, 0.22); background: transparent; }
.chain-cite.is-flat:hover { background: transparent; border-color: rgba(197, 155, 39, 0.22); }
```

Port the *shape* — `min-height: 30px`, `padding: 7px 13px 6px`, `border-color: rgba(213,177,106,.55)`, `background: rgba(213,177,106,.06)`, `letter-spacing: .08em`, `color: #f2d797`, plus `display: inline-flex; justify-content: center; align-items: center` — onto `.chain-cite`. **Keep** `cursor: pointer`, the `:hover` rule, the `transition`, and every `.is-flat` override: a printed reference the sitting's list cannot resolve must stay a flat label, not a dead control.

The source's per-card chip tinting (`.card--exile` → `rgba(169,195,231,.52)` / `#c4d8f4`; `.card--glory` → `#f6dfaa`) is **not portable**: it is hard-coded to three named cards, and it would fight the chip's job of signalling resolvable-vs-flat through colour. See §7.

### 2.8 `.card__edge` (source line 87)

```css
.card__edge { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.035); }
```

The target has no `.card__edge`. Its nearest equivalent is inside `.story-card`'s box-shadow (line 628): `inset 0 0 0 1px rgba(255, 255, 255, 0.03)`. The source carries **both**: the card's own inset at `.018` (line 67) **and** the edge at `.035` (line 87). Porting the edge means either
(a) add a `<span class="story-edge" aria-hidden="true"></span>` as the card's last child in `bodyStory()` plus the rule, or
(b) raise the card's existing inset from `0.03` to `0.035` — cheaper, but loses the `border-radius: inherit` crispness and the `::after` z-index-2 wash interaction (the edge must sit above the wash; in the target the wash is `.story-card::after { z-index: 2 }`, so an absolutely-positioned edge needs `z-index: 3` to stay visible).

**Recommendation: (a) with `z-index: 3`**, because the `.is-active` state changes the card's inset ring to `rgba(242,215,151,.2)` and the edge is the layer that keeps a constant 1px white hairline over both states.

---

## 3. The controls

### 3.1 Container

```css
/* source */
.controls { display: flex; justify-content: space-between; align-items: center; gap: 18px; width: min(700px, 100%); margin: 17px auto 0; }
```

```css
/* target, lines 776-781 */
.story-controls { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.85rem; }
```

Target is missing `width: min(700px, 100%)`, `margin: ... auto` (no centring) and `justify-content: space-between`. It does not need `space-between` because `.story-track` is `flex: 1 1 auto`, but without the width cap the track stretches the full stage width. **Add `width: min(700px, 100%); margin: 0.85rem auto 0;`** and leave `justify-content` alone.

### 3.2 Nav buttons

```css
/* source 92-95 */
.nav-button { flex: 0 0 43px; width: 43px; height: 43px; display: grid; place-items: center; border: 1px solid rgba(213,177,106,.58); border-radius: 50%; background: rgba(213,177,106,.025); color: var(--gold-bright); cursor: pointer; transition: background .2s, border-color .2s, opacity .2s, transform .2s; }
.nav-button:hover:not(:disabled) { background: rgba(213,177,106,.14); border-color: var(--gold-bright); transform: translateY(-1px); }
.nav-button:disabled { opacity: .28; cursor: default; }
.nav-button svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
```

```css
/* target 782-793 */
.story-nav { flex: 0 0 auto; width: 2.4rem; height: 2.4rem; border-radius: 999px; border: 1px solid rgba(213, 177, 106, 0.45); background: transparent; color: var(--chain-gold); cursor: pointer; }
.story-nav:disabled { opacity: 0.35; cursor: default; }
.story-nav svg { width: 16px; height: 16px; display: block; margin: 0 auto; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
```

| Property | Source | Target | Action |
|---|---|---|---|
| size | `43px` (`flex: 0 0 43px`) | `2.4rem` = 38.4px, `flex: 0 0 auto` | set `43px` + `flex: 0 0 43px` |
| display | `grid; place-items: center` | (block) | add |
| radius | `50%` | `999px` | equivalent; leave |
| border | `rgba(213,177,106,.58)` | `rgba(213,177,106,0.45)` | raise to `.58` |
| background | `rgba(213,177,106,.025)` | `transparent` | set the rgba |
| colour | `var(--gold-bright)` = `#f2d797` | `var(--chain-gold)` = `#d5b16a` | **change to `var(--chain-strong)`** |
| hover | present | **absent** | add |
| disabled opacity | `.28` | `0.35` | set `.28` |
| svg | `17px`, `stroke-width: 1.7` | `16px`, `stroke-width: 1.6` | set 17px / 1.7 |
| transition | `background .2s, border-color .2s, opacity .2s, transform .2s` | **absent** | add |

### 3.3 `story-track` with dots, labels, connectors

```css
/* source 96-102 */
.story-track { display: flex; align-items: center; justify-content: center; flex: 1; gap: 0; min-width: 0; }
.track-step { appearance: none; display: flex; align-items: center; gap: 9px; min-width: 0; padding: 8px 9px; border: 0; background: transparent; color: var(--muted-2); cursor: pointer; transition: color .25s; }
.track-step__dot { flex: none; width: 8px; height: 8px; border: 1px solid var(--gold); border-radius: 50%; background: transparent; transition: background .25s, box-shadow .25s, transform .25s; }
.track-step__label { font: 600 .68rem/1 var(--sans); letter-spacing: .12em; text-transform: uppercase; }
.track-step.is-active { color: var(--gold-bright); }
.track-step.is-active .track-step__dot { background: var(--gold-bright); box-shadow: 0 0 0 4px rgba(213,177,106,.1), 0 0 14px rgba(213,177,106,.35); transform: scale(1.05); }
.track-connector { height: 1px; min-width: 14px; flex: 1; max-width: 84px; background: linear-gradient(90deg, rgba(213,177,106,.48), rgba(213,177,106,.16)); }
```

```css
/* target 794-846 */
.story-track { flex: 1 1 auto; display: flex; align-items: center; gap: 0.35rem; min-width: 0; overflow-x: auto; padding-bottom: 0.15rem; }
.story-connector { flex: 1 1 1.2rem; min-width: 0.6rem; height: 1px; background: rgba(213, 177, 106, 0.35); }
.story-step { flex: 0 0 auto; display: flex; flex-direction: row; align-items: center; gap: 0.45rem; max-width: 11rem; padding: 0.35rem 0.4rem; border: 0; background: transparent; color: #807663; cursor: pointer; }
.story-step-dot { flex: none; width: 0.5rem; height: 0.5rem; border-radius: 50%; border: 1px solid var(--chain-gold); }
.story-step.is-active { color: var(--chain-strong); }
.story-step.is-active .story-step-dot { background: var(--chain-strong); box-shadow: 0 0 0 4px rgba(213, 177, 106, 0.12); }
.story-step-label { font-family: Inter, "Segoe UI", sans-serif; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em; line-height: 1.2; text-align: left; text-transform: uppercase; max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

Step-by-step deltas:

- `.story-track`: source `justify-content: center` and `gap: 0`; target has neither and adds `overflow-x: auto`. Target's `gap: 0.35rem` **double-spaces** the track because `bodyStory()` line 2521 already inserts `<span class="story-connector">` between steps. **Set `gap: 0` and add `justify-content: center`.**
- `.story-connector`: source is a **linear gradient** `linear-gradient(90deg, rgba(213,177,106,.48), rgba(213,177,106,.16))` with **`max-width: 84px`**; target is a flat `rgba(213,177,106,0.35)` with no cap, `min-width: 0.6rem` (9.6px) vs source `14px`. **Set `min-width: 14px`, `flex: 1`, `max-width: 84px`, and the gradient.**
- `.story-step`: padding `0.35rem 0.4rem` (5.6px / 6.4px) → `8px 9px`; gap `0.45rem` (7.2px) → `9px`. Target adds `max-width: 11rem`; source has `min-width: 0`. **Set `gap: 9px; padding: 8px 9px; min-width: 0;`** and add `transition: color .25s`.
- `.story-step-dot`: ✓ 0.5rem = 8px matches; add `background: transparent` and `transition: background .25s, box-shadow .25s, transform .25s`.
- active dot: target has `box-shadow: 0 0 0 4px rgba(213,177,106,0.12)`; source has `0 0 0 4px rgba(213,177,106,.1), 0 0 14px rgba(213,177,106,.35)` **plus `transform: scale(1.05)`**. Both the second shadow and the scale are missing.
- `.story-step-label`: source `line-height: 1`; target `1.2` and adds ellipsis machinery. Ellipsis is a target improvement for long `role` strings — keep it, but set `line-height: 1`.

### 3.4 The `seen` state

Source line 154 (second style block):

```css
.track-step.seen:not(.is-active) .track-step__dot{background:rgba(213,177,106,.45)}
```

**The target has no `seen` state at all.** `render()` (`study-app.js` lines 2641–2645) toggles `is-active` and `aria-current` and nothing else; `bodyStory()` never emits `seen`. The source marks it cumulatively in `render()` (line 329): `steps[current].classList.add('seen')` — the class is only ever added, never removed, so it accumulates into a trail. Port CSS as `.story-step.seen:not(.is-active) .story-step-dot { background: rgba(213, 177, 106, 0.45); }` and add the one JS line.

### 3.5 Utility row, live message, play button

```css
/* source 103-107 */
.utility-row { display: flex; justify-content: center; align-items: center; gap: 16px; min-height: 36px; margin-top: 11px; }
.live-message { margin: 0; color: var(--muted-2); font: 500 .61rem/1.5 var(--mono); letter-spacing: .06em; text-align: center; }
.play-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; padding: 7px 10px; color: var(--gold); background: transparent; cursor: pointer; font: 600 .64rem/1.2 var(--sans); letter-spacing: .1em; text-transform: uppercase; }
.play-button:hover { color: var(--gold-bright); }
.play-button svg { width: 12px; height: 12px; fill: currentColor; }
```

```css
/* target 847-885 */
.story-utility { display: flex; flex-direction: column; align-items: center; gap: 0.65rem; margin-top: 0.85rem; text-align: center; }
.story-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.55rem; }
.story-stage .story-live { margin: 0 !important; font-family: "JetBrains Mono", monospace !important; font-size: 0.68rem !important; line-height: 1.45 !important; letter-spacing: 0.04em; color: var(--chain-muted); }
.story-play { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.55em 0.95em; border-radius: 999px; border: 1px solid rgba(213, 177, 106, 0.45); background: transparent; color: var(--chain-gold); font-family: "JetBrains Mono", monospace; font-size: 0.72rem; cursor: pointer; }
.story-play svg { width: 12px; height: 12px; fill: currentColor; }
.story-play .story-icon-pause { display: none; }
.story-play[aria-pressed="true"] .story-icon-play { display: none; }
.story-play[aria-pressed="true"] .story-icon-pause { display: block; }
```

Notes:

- The source's utility row is a **single row** with `min-height: 36px`; the target stacks it into a column because it has two buttons (`.story-play` + `.story-fullscreen`) in `.story-actions`. **Keep the column**; adopt `min-height: 36px` and `margin-top: 11px` on `.story-utility`.
- `.story-live`: `letter-spacing 0.04em` → source `0.06em`; `color: var(--chain-muted)` ✓ matches `--muted`; size `0.68rem` vs `.61rem`.
- `.story-play`: the source's play button is a **borderless text button** (`border: 0; padding: 7px 10px; color: var(--gold)`) with `600 .64rem/1.2 var(--sans)`; the target's is a **pill** (`border-radius: 999px; border: 1px solid rgba(213,177,106,0.45)`) in JetBrains Mono at `0.72rem`. The target's pill matches the source's `.study-btn` / `#sheet button` style (source line 151) rather than its `.play-button`. **Recommendation: keep the pill** (it sits next to `.story-fullscreen`, which is also a pill at lines 886–901) and only port `gap: 8px`, `padding: 7px 10px` is incompatible with the pill's `0.55em 0.95em` — leave the target's padding. Add `:hover { color: var(--gold-bright) }` (→ `var(--chain-strong)`).
- The play/pause icon swap via `aria-pressed` is a **target-only** mechanism (the source swaps `innerHTML` in JS). Keep the CSS mechanism; it is strictly better.

### 3.6 Footer

```css
/* source 108-110 */
.footer { width: min(880px,100%); display: flex; justify-content: center; align-items: center; gap: 10px; margin: 21px auto 0; color: #6f6654; font: 500 .58rem/1.5 var(--mono); letter-spacing: .12em; text-align: center; text-transform: uppercase; }
.footer::before, .footer::after { content: ""; display: block; width: clamp(12px, 5vw, 54px); height: 1px; background: linear-gradient(90deg, transparent, rgba(213,177,106,.35)); }
.footer::after { transform: scaleX(-1); }
```

The target has **no story-level footer**. The source footer text is "Original artwork · Scripture references shown on each panel", which is specific to that prototype's provenance. **Recommendation: do not port.** If a caption rail is wanted, add it as `.story-footer` with the same rule block, not by repurposing the page footer.

### 3.7 Source-only extras: `.link` / `.bridge` (source lines 191–208)

These are the paging arrows that float outside the card edges and the "how these connect" popover. They are part of `updateLinks()` in §5 and are **not requested for the target**. Recorded here so the values are not lost:

```css
.link{position:absolute;top:34%;z-index:25;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:6px;padding:0;border:0;background:none;color:var(--gold-bright);cursor:pointer}
.link--next{left:calc(50% + var(--card-width) / 2)}
.link--prev{left:calc(50% - var(--card-width) / 2)}
.link[hidden],.bridge[hidden]{display:none}
.link__arrow{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;background:rgba(14,12,8,.93);border:1px solid var(--gold-bright);animation:linkPulse 2.8s ease-in-out infinite;transition:background .2s}
.link__arrow svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.link:hover .link__arrow,.link[aria-expanded="true"] .link__arrow{background:rgba(213,177,106,.28)}
.link:focus-visible{outline:2px solid var(--gold-bright);outline-offset:6px;border-radius:14px}
.link__label{max-width:70px;padding:4px 7px;border-radius:8px;background:rgba(8,8,7,.88);border:1px solid rgba(213,177,106,.35);font:600 .5rem/1.25 var(--sans);letter-spacing:.1em;text-transform:uppercase;text-align:center;color:var(--gold)}
@keyframes linkPulse{0%,100%{box-shadow:0 0 0 4px rgba(213,177,106,.1),0 0 14px rgba(213,177,106,.3)}50%{box-shadow:0 0 0 8px rgba(213,177,106,.05),0 0 28px rgba(213,177,106,.55)}}
.bridge{position:absolute;left:50%;bottom:14px;z-index:30;width:min(440px,calc(100% - 20px));transform:translateX(-50%);padding:16px 18px 14px;border-radius:16px;background:rgba(10,9,6,.97);border:1px solid var(--gold-bright);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 30px rgba(213,177,106,.15)}
.br-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.br-k{color:var(--gold-bright);font:600 .66rem/1.3 var(--sans);letter-spacing:.16em;text-transform:uppercase}
.br-dir{color:var(--muted-2);font:500 .58rem/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.br-share{margin:10px 0 0;color:var(--gold);font:italic 500 .98rem/1.35 var(--serif)}
.br-text{margin:8px 0 0;color:#d9ceb7;font-size:1rem;line-height:1.5}
.br-act{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
@media (max-width:620px){.link__arrow{width:38px;height:38px}}
```

**Do not port.** The target already has a paging affordance trio (`.story-nav` ×2, `.story-read-pip` rail, `.story-read-nav`), and `.link--next` is positioned off `var(--card-width)`, which resolves against `.story-viewport` in the target — it would sit under the stage's padding, not at the card edge.

---

## 4. The full-screen surface

### 4.1 Mechanism vs styling — read this before porting anything

The source `#sheet` and the target `.story-read` are **different mechanisms that must not be merged**.

| | Source `#sheet` | Target `.story-read` |
|---|---|---|
| What it shows | **Replaces** the stage with a *different* content model: tabs (Study / Connect / Quiz), a **hero image copied from the card**, key-verse list, note, a comparison table, a quiz, a score screen. | A **zoomed, cloned copy of the same cards**, over a **three-layer photographic crossfade**, with a progress pip rail. |
| DOM | Static `body > #sheet`, `display: none` → `display: block` | Cloned at runtime into `document.body`, `hidden` attribute + `is-open` class + opacity fade |
| Scroll model | `#sheet` itself is `overflow: auto` — **one** scroll container. Body is **not** locked. | `html.story-read-open { overflow: hidden }` locks the page; `.story-read-frame` is the scroll container |
| Background | `backdrop-filter: blur(10px)` over whatever is behind | Opaque `.story-read-bg` + 3 blurred `<img>` layers + `.story-read-veil` |
| Focus | `#sClose` focused; **no** `inert`, **no** Tab trap | `.story-back` focused; `stage.inert = true`; Tab trapped |
| Exit | `Close` button, backdrop click (`e.target === sheet`), `Escape` | `Back` button, `Escape` |

**Port the `#sheet` *mechanism* only if a separate "Study this" surface is actually wanted** — the target already ships `#sheet-article`, `#sheet-verify`, `#sheet-study-path`, `#sheet-christology` as page-level panels, and the target's story reader is deliberately the crossfade model. **The `#sheet` content-block styling (`sv-*`, `cmp`, `thread`, `qbox`) is portable and useful on its own**; the `#sheet` overlay shell is not.

**`backdrop-filter: blur(10px)` over a full-viewport fixed element is a per-frame composite cost** the target's reader deliberately avoids (its blur is baked into a static `filter` on each photo layer, `study.html` line 948). Do not add `backdrop-filter` to `.story-read`.

### 4.2 The `#sheet` overlay shell (source lines 155–160)

```css
#sheet{position:fixed;inset:0;z-index:50;display:none;overflow:auto;padding:max(5vh,env(safe-area-inset-top,0px)) 18px calc(80px + env(safe-area-inset-bottom,0px));background:rgba(5,5,4,.93);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#sheet.open{display:block}
.sh{max-width:880px;margin:0 auto}
.sh-top{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:26px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.sh-top .ttl{margin-right:auto;color:var(--gold);font:600 .68rem/1 var(--sans);letter-spacing:.25em;text-transform:uppercase}
#sheet .tab.on{background:rgba(213,177,106,.2);border-color:var(--gold-bright)}
```

Trigger: `.study-btn` (source lines 150–152, 286–289):

```css
.study-btn,#sheet button{appearance:none;cursor:pointer;font:600 .64rem/1.2 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--gold-bright);background:rgba(213,177,106,.04);border:1px solid rgba(213,177,106,.45);border-radius:99px;padding:9px 16px;transition:background .2s,border-color .2s}
.study-btn:hover,#sheet button:hover:not(:disabled){background:rgba(213,177,106,.14);border-color:var(--gold-bright)}
#sheet button:disabled{opacity:.3;cursor:default}
```

**"Fixed inset + one scroll container + safe-area padding" is the portable idea.** Mapping to the target: `.story-read` is already `position: fixed; inset: 0` (line 903). The safe-area padding is the transferable part:

- source top: `max(5vh, env(safe-area-inset-top, 0px))`
- source bottom: `calc(80px + env(safe-area-inset-bottom, 0px))`
- source sides: `18px`

The target's `.story-read` uses `padding: 4.75rem 1.25rem 1.5rem` and at ≤620px `padding-top: 4.2rem`. It has **no** safe-area handling anywhere. On a notched device in landscape or on iOS with the home indicator, `padding-bottom: 1.5rem` puts `.story-read-hint` under the gesture bar. **Port the safe-area bottom inset only:** `padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))`.

### 4.3 The header row with tabs (source lines 157–160)

Covered above. Note `.sh-top .ttl { margin-right: auto }` is what pushes the tabs right; the target has no equivalent header row — its reader's top control is the absolutely-positioned `.story-back` (lines 976–995). **Do not add a header row to `.story-read`**; it would sit under `.story-back`.

### 4.4 `.sv` / `.sv-hero` content blocks (source lines 161–181)

```css
.sv-hero{position:relative;display:flex;align-items:flex-end;min-height:190px;margin-bottom:20px;padding:20px;border-radius:18px;overflow:hidden;border:1px solid var(--line)}
.sv-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sv-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,8,7,.1),rgba(8,8,7,.92))}
.sv-hero>div{position:relative;z-index:1}
.sv-k{color:var(--gold);font:600 .62rem/1.4 var(--sans);letter-spacing:.22em;text-transform:uppercase}
.sv h3{margin:6px 0 0;font:500 clamp(1.5rem,4vw,2.2rem)/1.1 var(--serif);color:#fff8e9}
.sv h4{margin:24px 0 8px;color:var(--gold);font:600 .64rem/1.2 var(--sans);letter-spacing:.2em;text-transform:uppercase}
.sv p,.sv li{font-size:1.06rem;line-height:1.55;color:#d1c5ad}
.sv-idea{font-size:1.18rem!important;color:var(--ink)!important}
.sv-v{margin:0;padding:0;list-style:none}
.sv-v li{padding:9px 0;border-bottom:1px solid rgba(213,177,106,.14)}
.sv-v b{display:inline-block;min-width:92px;margin-right:6px;color:var(--gold-bright);font:500 .74rem/1.5 var(--mono);letter-spacing:.05em}
.sv-note{margin:16px 0 0;padding:12px 16px;border-left:2px solid var(--gold);background:rgba(213,177,106,.07);font-size:.98rem!important}
.sv-ask{font-style:italic;color:var(--gold-bright)!important}
.sv-nav{display:flex;justify-content:space-between;gap:10px;margin-top:28px}
```

Key mechanics to note:

- **`.sv-v b` is a gutter, not a bold run.** `display: inline-block; min-width: 92px; margin-right: 6px` reserves a fixed 92px column so the verse labels line up and the text wraps into a hanging indent. This is the one pattern in the `#sheet` that has real typographic value and no counterpart in the target.
- **`.sv-note` maps onto the target's existing `.chain-note`** (`study.html` lines 1281–1287: `margin: 0.9rem 0 0; font-family: Inter, sans-serif; font-size: 0.84rem; line-height: 1.6; color: var(--chain-muted, inherit)`). If the source's note treatment is wanted, restyle `.chain-note` rather than adding a parallel `.sv-note`.
- `.sv-hero` is the source's **replacement** for the crossfading photo stack: a single still, cropped to `min-height: 190px`, with a `180deg` scrim from `rgba(8,8,7,.1)` to `rgba(8,8,7,.92)`. The target's reader deliberately does something richer. Do not port `.sv-hero`.

### 4.5 `cmp` table and `thread` (source lines 176–181)

```css
.cmpw{overflow-x:auto}
.cmp{width:100%;min-width:640px;border-collapse:collapse}
.cmp th,.cmp td{padding:14px 14px;text-align:left;vertical-align:top;font-size:1rem;line-height:1.45;color:#d1c5ad;border-bottom:1px solid rgba(213,177,106,.16)}
.cmp thead th{font:500 1.5rem/1.1 var(--serif);color:var(--ink);border-bottom:2px solid var(--gold)}
.cmp tbody th{width:19%;font:600 .6rem/1.4 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted-2)}
.thread{margin:24px 0 0;max-width:640px;font-size:1.12rem;line-height:1.55;font-style:italic;color:var(--gold-bright)}
```

Note `padding: 14px 14px` (a deliberate duplicate, not a shorthand typo) and `.cmp tbody th { width: 19% }` as the row-label column. `min-width: 640px` inside `.cmpw { overflow-x: auto }` is the horizontal-scroll model. The target already has a `.tbl` table style (lines ~1400–1420) — check for collision before adding `.cmp`.

### 4.6 How `#sheet` closes (source lines 433–447)

```js
function closeSheet() {
  sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); go(si, true);
  if (opener && opener.focus) opener.focus();
}
```

Three exits: the `Close` button (`#sClose`), a click on the backdrop (`if (e.target === sheet) return closeSheet()`), and `document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); })`. `openSheet()` records `opener = document.activeElement`, calls `stopPlayback()`, sets `si = current`, sets `sheet.scrollTop = 0`, and focuses `#sClose`.

Two a11y gaps in the source that the target already solves and **must not regress**:

1. The source never sets `inert` on the stage and never traps Tab — a keyboard user can tab out of the "modal" into the page behind it. The target sets `stage.inert = true` (`study-app.js` line 2884) and traps Tab (lines 2947–2955).
2. The source does not lock page scroll while `#sheet` is open, so the lesson behind scrolls under the panel. The target locks with `html.story-read-open { overflow: hidden }` (lines 1235–1236).

Keep both target behaviours. Also keep the target's `Escape` deference to stacked layers (`ABOVE_READER = '#infographic-modal, #certificate-panel, #certificate-review-modal'`, `study-app.js` line 2810) — the source has nothing comparable.

---

## 5. Interaction and state

### 5.1 Source state machine (lines 299–505)

| Concern | Source behaviour |
|---|---|
| Initial index | `let current = 1;` (line 310) — the **middle** card. No card carries `is-active` in the static HTML; `render()` is called once at the end (line 504). |
| `render()` per-card | `const distance = Math.abs(index - current);` then `card.style.setProperty('--d', index - current)`, `card.style.setProperty('--distance', distance)`, `card.classList.toggle('is-active', index === current)`, `card.setAttribute('aria-current', index === current ? 'true' : 'false')`, `card.style.pointerEvents = distance > 1 ? 'none' : 'auto'`. |
| `seen` marking | `steps.forEach(...)` toggles `is-active` and sets/removes `aria-current="step"`; then `steps[current].classList.add('seen')` — line 329, inside `render()`, cumulative, never removed. |
| prev/next disabling | `prev.disabled = current === 0;` `next.disabled = current === cards.length - 1;` |
| Live region | `` live.textContent = `Movement ${current + 1} of ${cards.length} · ${titles[current]}` `` — separator is **U+00B7 MIDDLE DOT**, single spaces around it. `titles` is a hard-coded 3-element array (line 309). |
| Navigation | `go(index, manual = false)`: `if (manual) stopPlayback();` then `current = Math.max(0, Math.min(cards.length - 1, index));` then `render();` |
| Bindings | `prev`/`next` click → `go(±1, true)`; `.track-step` click → `go(Number(step.dataset.index), true)`; `.card` click → `if (index !== current) go(index, true)` (**clicking the active card does nothing**). |
| Keyboard | On `.stage`: `keydown`, `ArrowRight` → `go(current+1, true)`, `ArrowLeft` → `go(current-1, true)`, both `event.preventDefault()`. `.stage` has `tabindex="0"`. |
| Pointer/swipe | On `.stage`: `pointerdown` stores `event.clientX`; `pointerup` computes `delta`, nulls the start, and `if (Math.abs(delta) > 45) go(current + (delta < 0 ? 1 : -1), true);`; `pointercancel` nulls the start. **Threshold 45px.** |
| Autoplay | Interval **`3900` ms** (line 379). Click handler: if `timer !== null` → `stopPlayback(); return;`. If `current === cards.length - 1` → `go(0)` — **note: not manual, so playback is not stopped and restarts from the top**. Then `aria-pressed="true"`, label `'Pause story'`, icon → `<path d="M4 3h3v10H4zM9 3h3v10H9z"/>`. Interval body: `if (current < cards.length - 1) go(current + 1); if (current === cards.length - 1) stopPlayback();` |
| `stopPlayback()` | `clearInterval`, `timer = null`, `aria-pressed="false"`, label `'Play the story'`, icon → `<path d="M4 2.5 13 8l-9 5.5z"/>`. |
| Visibility | `document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); })` |
| Escape/close | `Escape` closes `#sheet` if open; closes `.bridge` if open. |

`updateLinks()` (lines 489–494):

```js
function updateLinks() {
  closeBridge(false);
  linkPrev.hidden = current === 0; linkNext.hidden = current === cards.length - 1;
  if (current > 0) { const B = BRIDGE[current - 1]; linkPrev.querySelector('.link__label').textContent = B.back; linkPrev.setAttribute('aria-label', `${B.back}: how ${B.to} connects back to ${B.from}`); }
  if (current < cards.length - 1) { const B = BRIDGE[current]; linkNext.querySelector('.link__label').textContent = B.fwd; linkNext.setAttribute('aria-label', `${B.fwd}: how ${B.from} leads to ${B.to}`); }
}
```

It is called at the **end of `render()`** (line 333). `BRIDGE` is a 2-element array of `{from, to, share, fwd, back, ahead, behind}` (lines 463–470). `openBridge(dir)` (line 480) toggles closed on a repeat press of the same direction, calls `stopPlayback()`, indexes `BRIDGE[dir > 0 ? current : current - 1]`, injects `.br-top` / `.br-share` / `.br-text` / `.br-act`, sets `bridge.hidden = false`, sets `aria-expanded` on both `.link`s, and focuses `[data-br="go"]`. A document-level click outside `.bridge` and outside `.link` closes it; `Escape` closes it.

### 5.2 Target state machine, for comparison (`study-app.js` 2568–3002)

| Concern | Target behaviour | Note |
|---|---|---|
| Initial index | `Number(stage.getAttribute('data-start'))`, clamped (lines 2604–2605). `bodyStory()` receives `start`, which for `kind === 'chain'` is the index of the step flagged `centre` (line 3033). | **Keep.** The source's literal `current = 1` would mis-start a 4-step or 7-step `steps` diagram. |
| `render()` | `cards.forEach(paint)` **and** `readCards.forEach(paint)` — the reader clones are painted in lockstep (lines 2639–2640). `paint` sets `--d`, `--distance`, `is-active`, `pointerEvents`, and `aria-current="true"`/`removeAttribute` (source uses `"false"`; `removeAttribute` is preferred). | Keep the dual paint. |
| `seen` | **absent** | add |
| prev/next disabling | same as source (lines 2646–2647) | ✓ |
| Live region | `'Movement ' + (current + 1) + ' of ' + cards.length + ' \u00b7 ' + titleOf(current)` (line 2648). `titleOf` reads `.story-title` textContent (2618–2622). | Same format. **Edge case:** `titleOf` returns `''` when the card has no title, leaving a trailing `" · "` in the live region. Guard it. |
| Autoplay | Interval **`2800` ms** (line 2984). Restart path `if (current === cards.length - 1) go(0, false);` (line 2978). Interval body: `if (current >= cards.length - 1) { stopPlayback(); return; } go(current + 1, false);` | **3900 → 2800 is a real difference.** See §7. |
| Keyboard (stage) | On `.story-viewport`: ArrowRight/ArrowLeft → `go(±1, true)` (lines 2956–2959) | matches source, but source listens on `.stage` = target `.story-viewport`. ✓ |
| Pointer/swipe | `pointerdown`/`pointerup`/`pointercancel` on `.story-viewport` **and** on the reader `deck` (lines 2960–2975); threshold `> 45` | matches source threshold. ✓ |
| Card click | `if (event.target.closest('.chain-cite')) return; if (index !== current) go(index, true); else openRead();` (2922–2926) | **Diverges from source** — the active card opens the reader. Keep. |
| Reader keys | Document-level capture-phase handler (2814–2826); Tab trap (2947–2955) | superior to source |
| Reader photos | 3 layers, round-robin `photoCursor`, `--photo-z` stacking, `retireOthers` on `transitionend` or a **1600 ms** fallback timer (line 2741) | see §7 |

---

## 6. Responsive + accessibility

### 6.1 Source `@media` blocks, complete

**`@media (min-width: 1100px)`** (line 112):

```css
.site-shell { padding-top: 38px; } .experience { margin-top: 31px; }
```

Both selectors are out of scope (page chrome). **No card-relevant rule exists in this block.** The target has no `min-width: 1100px` story block, and does not need one — the only candidate would be widening `.story-stage` padding at large sizes.

**`@media (max-width: 620px)`** (lines 113–137), card-relevant subset:

```css
.site-shell { padding: 26px 12px 20px; }        /* out of scope */
.experience { margin-top: 23px; }                /* out of scope */
.stage { --card-width: min(330px, 81vw); height: 454px; }
.card { top: 5px; bottom: 9px; border-radius: 19px; transform: translateX(calc(var(--d) * 67%)) rotateY(calc(var(--d) * -7deg)) scale(calc(1 - var(--distance) * .055)); }
.card__photo { height: 64%; }
.card__topline { top: 15px; left: 15px; right: 15px; font-size: .55rem; }
.card__content { inset: 41% 0 0; padding: 17px 18px 22px; }
.card__kicker { margin-bottom: 7px; font-size: .56rem; }
.card h2 { font-size: 1.16rem; margin-bottom: 12px; }
.card__description { margin-top: 12px; font-size: 1rem; }
.controls { gap: 7px; margin-top: 12px; }
.nav-button { flex-basis: 37px; width: 37px; height: 37px; }
.track-step { gap: 6px; padding: 8px 5px; }
.track-step__label { font-size: .59rem; letter-spacing: .07em; }
.track-step__dot { width: 7px; height: 7px; }
.track-connector { min-width: 10px; }
.utility-row { margin-top: 5px; gap: 7px; flex-wrap: wrap; }
.live-message { font-size: .57rem; }
.footer { margin-top: 15px; font-size: .52rem; letter-spacing: .08em; }
```

Note the **`.card` transform override at 620px**: `67%` (not `64%`) and `-7deg` (not `-10deg`), keeping `scale(calc(1 - var(--distance) * .055))` unchanged.

**`@media (max-width: 360px)`** (lines 138–143):

```css
.stage { --card-width: 82vw; height: 438px; }
.track-step__label { font-size: .53rem; }
.track-step { padding-inline: 3px; }
.card__description { font-size: .95rem; }
```

**`@media (max-width: 620px)` for `.link__arrow`** (line 208): `.link__arrow { width: 38px; height: 38px; }` — out of scope (§3.7).

**`@media (prefers-reduced-motion: reduce)`** (lines 144–146):

```css
*, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
```

**This blanket rule must not be ported.** The target's reduced-motion block (`study.html` 1254–1264) deliberately keeps a *reduced but present* fade:

```css
.story-card { transition: opacity 0.3s ease; }
.story-card::after { transition: none; }
.story-card .story-content > * { transition: none; transform: none; opacity: 1; }
.story-read { transition: none; }
.story-read-frame { transition: none; opacity: 1; transform: none; }
.story-read-deck .story-card { transition: opacity 0.3s ease; }
/* Artwork still changes, it just does not drift or zoom. */
.story-read-photo { transition: opacity 0.3s ease; transform: none; }
.story-read-photo.is-current { transform: none; }
```

Under the source's `*` rule, `transition-duration: .01ms !important` would collapse `opacity 0.3s ease` on `.story-card` and `.story-read-photo` to nothing — the comment on line 1261 ("Artwork still changes") documents an intent the source's rule would defeat. Keep the target's targeted approach, and if you port `.story-card::after`, add it to this block.

### 6.2 Target `@media` blocks, complete

**`@media (max-width: 620px)`** (lines 1237–1249):

```css
.story-viewport { height: 460px; --card-width: min(320px, 84%); }
.story-step { max-width: 7.5rem; }
.story-step-label { max-width: 5.6rem; }
.story-read { padding-top: 4.2rem; }
.story-read-deck { height: min(52vh, 480px); --card-width: min(300px, 76vw); }
.story-read-deck .story-title { font-size: 1.4rem !important; }
.story-read-note { margin-top: 0.6rem; }
.story-read-detail { font-size: 0.92rem; text-align: left; }
.story-read-hint { display: none; }
```

**`@media (max-width: 360px)`** (lines 1250–1253):

```css
.story-viewport { height: 420px; }
.story-stage .story-title { font-size: 1.05rem !important; }
```

**`@media (prefers-reduced-motion: reduce)`** (lines 1254–1264): quoted in §6.1.

### 6.3 Side-by-side responsive deltas

| Breakpoint | Property | Source | Target | Action |
|---|---|---|---|---|
| base | viewport height | `492px` | `500px` | set `492px` |
| base | card width | `min(356px, 78vw)` | `min(356px, 78%)` | keep `%` (§1.4 item 6) |
| base | card top/bottom | `7px` / `13px` | `8px` / `12px` | set `7px` / `13px` |
| ≤620px | viewport height | `454px` | `460px` | set `454px` |
| ≤620px | card width | `min(330px, 81vw)` | `min(320px, 84%)` | set `min(330px, 81%)` |
| ≤620px | card top/bottom/radius | `5px` / `9px` / `19px` | *(none)* | add |
| ≤620px | card transform | `67%` / `-7deg` | *(none)* | add |
| ≤620px | photo height | `64%` | *(none)* | add |
| ≤620px | content top / padding | `41%` / `17px 18px 22px` | *(none)* | add |
| ≤620px | nav button | `37px` | *(none)* | add |
| ≤620px | step gap / padding | `6px` / `8px 5px` | *(none)* | add |
| ≤620px | step label | `.59rem` / `.07em` | `max-width: 5.6rem` | merge both |
| ≤620px | dot | `7px` | *(none)* | add |
| ≤620px | connector min-width | `10px` | *(none)* | add |
| ≤620px | utility | `margin-top: 5px; gap: 7px; flex-wrap: wrap` | *(none)* | add |
| ≤620px | live | `.57rem` | *(none)* | add |
| ≤360px | viewport height | `438px` | `420px` | set `438px` |
| ≤360px | card width | `82vw` | *(none)* | add `82%` |
| ≤360px | step label | `.53rem` | *(none)* | add |
| ≤360px | step padding-inline | `3px` | *(none)* | add |
| ≤360px | description/text | `.95rem` | *(none)* | add on `.story-text` |

### 6.4 ARIA roles and labels

| Element | Source | Target | Action |
|---|---|---|---|
| Viewport | `<section class="stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Three movements in Daniel: exile, the Messiah, and glory">` | `<div class="story-viewport" tabindex="0" role="region" aria-roledescription="carousel" aria-label="' + escapeStudy(spec.title \|\| 'Diagram') + '">` (line 2524) | ✓ equivalent |
| Card | `<article class="card card--exile" role="group" aria-roledescription="slide" aria-label="1 of 3: Sovereignty in Exile">` | `<article class="story-card" data-index="0">` (line 2502) | **add `role="group"`, `aria-roledescription="slide"`, `aria-label="<i+1> of <n>: <title>"`** |
| Card current | `aria-current="true"` / `"false"` | `aria-current="true"` / removed | keep target |
| Step current | `aria-current="step"` | `aria-current="step"` | ✓ |
| Live | `<p class="live-message" id="live" aria-live="polite">` | `<p class="story-live" aria-live="polite">` | ✓ |
| Play | `aria-pressed="false"` toggled | `aria-pressed="false"` toggled | ✓ |
| Nav buttons | `aria-label="Previous story movement"` / `"Next story movement"` | identical strings (lines 2528, 2532) | ✓ |
| Steps | `aria-label="Go to Exile"` | `aria-label="<role or title or Step N>"` (line 2517) | target's is richer; keep |
| Reader | `#sheet role="dialog" aria-modal="true" aria-label="Study guide" aria-hidden="true"` | `.story-read hidden role="dialog" aria-modal="true" aria-label="<spec.title>"` (line 2546) | ✓ equivalent; target uses `hidden` not `aria-hidden` — better |
| Keyboard help | `<p class="sr-only" id="keyboard-help">Use the left and right arrow keys to move between story movements.</p>` | **none** | **add `.sr-only` (rule below) + the help paragraph** |
| Bridge | `aria-expanded` on `.link` | n/a | out of scope |

### 6.5 `.sr-only` and focus-visible

Source `.sr-only` (line 111) — **the target should adopt this verbatim as `.story-sr-only`** (the target ships Tailwind, which provides `sr-only`; prefer the framework's utility and skip the custom rule if Tailwind's preflight/utilities are loaded in `study.html`):

```css
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
```

The target's `.chain-ascii` (lines 1269–1280) already uses the modern variant with `clip-path: inset(50%)`.

Source focus rules (lines 41–42):

```css
button:focus-visible, .stage:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 4px; }
::selection { background: rgba(213, 177, 106, .35); color: white; }
.link:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 6px; border-radius: 14px; }
```

Target (lines 608–611): `.story-viewport:focus-visible { outline: 2px solid var(--chain-gold); outline-offset: 2px; }`

Deltas: source offset `4px` vs target `2px`; source colour `--gold-bright` (`#f2d797`) vs target `--chain-gold` (`#d5b16a`). **The source's colour choice is correct** — a focus ring in the brightest gold reads against the dark stage. Set `.story-viewport:focus-visible { outline: 2px solid var(--chain-strong); outline-offset: 4px; }` and add the same for every focusable control in the story block (`.story-nav`, `.story-step`, `.story-play`, `.story-fullscreen`, `.chain-cite`, `.story-back`, `.story-read-pip`, `.story-read-nav button`). The target currently defines **no** `:focus-visible` for any of them, so they fall back to the UA ring — which is invisible against `#080807` in some browsers.

---

## 7. What the target must NOT lose

Each row names a target feature, the exact ported rule that collides with it, and the resolution.

**C1 — Per-movement `detail` copy (`.story-detail`).**
The source card has four content children (kicker, `h2`, `.scripture`, `.card__description`); the target has up to six (medal, kicker, title, cite, text, detail). The source tightens the content block to `top: 42%` and its gradient to `47%` solid, and its card is `492px` tall.
*Collision:* raising `top` from 36% to 42% and the solid stop from 46% to 47% shrinks the copy area by 6% of card height. The target's `.story-content` is `overflow: auto` precisely because the detail line can overflow.
*Resolution:* adopt `top: 42%` and the 23%/47% stops, **keep `overflow: auto` and `max-height: none`**, and keep `.story-detail`'s compact metrics (`0.78rem`, `line-height: 1.5`, `max-width: 18.5rem`, `margin: 0.7rem 0 0`). Do not import the source's larger `.card__description` size (`1.06rem`) onto `.story-detail`.

**C2 — Citation chip resolving to a reference row.**
Source `.scripture` is a static `<p>`. Target `.chain-cite` is a `<button>` wired by `decorateCitations()` to open the matching row in `#sheet-verify`, with a `.is-flat` fallback for unresolvable references.
*Collision:* the source's per-card chip tints (`.card--exile .scripture { border-color: rgba(169,195,231,.52); color: #c4d8f4 }`, `.card--glory { --accent: #f6dfaa }`) reuse colour as decoration; the target reuses it as a resolvable/flat signal (`.chain-cite.is-flat { color: var(--chain-muted, #b3a98f); border-color: rgba(197,155,39,.22); background: transparent }`).
*Resolution:* adopt the source's *geometry and default tint* (`min-height: 30px`, `padding: 7px 13px 6px`, `border-color: rgba(213,177,106,.55)`, `background: rgba(213,177,106,.06)`, `color: #f2d797`, `letter-spacing: .08em`, `inline-flex` centring). **Drop the per-card tints.** Keep `cursor: pointer`, the `:hover` rule, the `transition`, and all three `.is-flat` declarations. Also keep the JS guards that stop a chip click from re-opening the reader (`study-app.js` lines 2923, 2928, 2941).

**C3 — Full-screen reader with three stacked photo layers crossfading.**
Source `#sheet` swaps content models and layers a blurred backdrop; the target's reader is clone-based with its own layer stack.

> **Numeric correction to the brief.** The brief describes the crossfade as "three stacked photo layers that crossfade over **1.25s**". The shipped values in `study.html` are **1.45s**, not 1.25s: `.story-read-photo { transition: opacity 1.45s cubic-bezier(0.4, 0, 0.2, 1), transform 8s cubic-bezier(0.16, 0.62, 0.28, 1); }` (lines 951–953), with a **1600 ms** retire fallback timer in `wireStory()` (line 2741) and a **900 ms** close-fade fallback (line 2875). `STORY_PHOTO_LAYERS = 3` (line 2487) is correct. Nothing in this port touches those values; recording them here so a future edit does not "fix" 1.45 → 1.25 on the strength of the brief.

*Collision:* porting `#sheet`'s shell (`position:fixed; inset:0; overflow:auto; background:rgba(5,5,4,.93); backdrop-filter:blur(10px)`) would replace `.story-read-bg` / `.story-read-photos` / `.story-read-veil` and delete the crossfade. The source also has no `inert`, no scroll lock and no Tab trap.
*Resolution:* **do not port the `#sheet` overlay shell.** Port only the `sv-*` / `cmp` / `thread` content-block styling if a study surface is wanted, and add safe-area padding to `.story-read` (`padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))`). Keep `.story-read-bg`, `.story-read-photos`, `.story-read-photo`, `.story-read-veil`, `stage.inert = true`, `document.documentElement.classList.add('story-read-open')`, and the Tab trap intact.

**C4 — Reduced-motion handling.**
Source uses a blanket `*, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }`.
*Collision:* that `!important` universal rule overrides the target's deliberate *reduced-but-present* 0.3s fades (`.story-card { transition: opacity 0.3s ease }`, `.story-read-photo { transition: opacity 0.3s ease }`) and annihilates the 8s Ken-Burns transform's reduced-motion substitute.
*Resolution:* keep the target's targeted reduced-motion block exactly as written, and **append** one line if `.story-card::after` lands: `.story-card::after { transition: none; }` (already present at line 1256). Do not port the source's universal rule.

**C5 — Four themes (charcoal / night / paper / white), stage permanently dark.**
The target's `.story-stage` hard-codes `#080807` and `color: var(--story-ink)`; paper/white themes restore every descendant colour with `!important` (lines 5399–5457) because `.article-body` would otherwise paint near-black text on the fixed dark stage.
*Collisions:*
1. **`color-scheme: dark`** — must not go on `:root` (§1.4 item 4).
2. **New selectors need theme-restore entries.** Every selector added to the story block must be added to the paper/white restore list at lines 5399–5457, or it will inherit `--read-*` body colours. Specifically: `.story-edge` (no text, safe), `.story-step.seen .story-step-dot` (background only, safe), `.story-topline > span:first-child` (**text — needs a restore entry**, `#d5b16a !important`).
3. **The reader escapes the theme block.** Lines 5431–5456 restore `.story-read-title`, `.story-read-copy`, `.story-read-note`, `.story-read-detail`, `.story-read-hint`, `.story-fullscreen`, `.story-back`, `.story-read-nav button`, `.story-read-count`. If you add reader selectors (e.g. a `.sv-v b` gutter inside the reader, or an explicit `.story-read-deck .story-medal` colour), add them there too.
4. **`.sheet-diagram` token collision** (§1.4 item 1): the new story tokens must be declared on `.story-stage` (where they already are), never on `.sheet-diagram`.
*Resolution:* keep `.story-stage`'s dark ground and its four token declarations untouched; add `color-scheme: dark` to `.story-stage, .story-read` only; extend both the story block and the theme-restore block in the same commit.

**C6 — The `story-detail` line specifically.**
Source has no second description line. Its `.card__description` is the *only* body copy and is set at `1.06rem` italic with `text-wrap: balance`.
*Collision:* `text-wrap: balance` on `.story-detail` would fight the target's `text-wrap: pretty` (line 773) and produce ragged last lines on a multi-sentence paragraph. Also `.story-card:not(.is-active) .story-detail { opacity: 0.6 }` (line 775) composes with the new per-child stagger (`.story-card .story-content > * { opacity: 0.72 }`, line 728) — the inactive card's detail ends at `0.72 × 0.6 = 0.432` opacity, which is intentional but worth checking after the content-block geometry changes.
*Resolution:* keep `text-wrap: pretty`, keep `0.78rem`/`1.5`, keep the `0.6` inactive multiplier, and apply `text-wrap: balance` only to `.story-title` and `.story-text` where the source uses it.

**C7 — Additional collisions not in the brief.**

| # | Collision | Resolution |
|---|---|---|
| C7.1 | **Reader token scope.** `.story-read` is moved to `document.body` (`study-app.js` line 2883), so `--chain-*` / `--story-ink` do not resolve inside it. Porting `var(--gold)`-based rules into the reader yields unpainted text. | Either keep hard-coded hexes throughout `.story-read-*`, **or** add `--chain-gold: #d5b16a; --chain-strong: #f2d797; --chain-muted: #b9ad94; --story-ink: #f6efdf; --muted-2: #807663;` to `.story-read` itself. The second option also fixes the `.story-medal` colour loss (§1.4 item 3). |
| C7.2 | **`filter: saturate(.78)`.** | Do not port. Keep `.story-card::after { background: rgba(4,4,6,0.42) }` + `.story-card.is-active::after { opacity: 0 }`. Rationale: repaint cost on a 1.15s transform, plus `filter` creates a stacking context and a fixed-position containing block. |
| C7.3 | **Base64 artwork.** The source embeds three JPEGs as `data:image/jpeg;base64,…` `src` attributes (lines 222, 235, 248). | Do not port. `storySrc()` (`study-app.js` line 2479) validates `/^assets\/study\/diagrams\/[a-z0-9-]+\.jpg$/`; base64 would be rejected and the card would render photo-less, dropping `.has-photo` and changing the reader's veil (`study.html` lines 971–975). |
| C7.4 | **Per-card `object-position`.** Source `.card--exile/.card--cross/.card--glory` are three hard-coded classes. | Generalise. Emit `--photo-y` per step in `bodyStory()` and use `object-position: center var(--photo-y, 46%)`, defaulting per index. Values: `48% / 47% / 45%` for the three-movement case. |
| C7.5 | **`current = 1`.** Source hard-codes the start index. | Keep the target's `data-start` / `centre`-step rule. |
| C7.6 | **Autoplay `3900` vs `2800` ms.** The target's card transition is `1.15s` (vs source `.72s`). At 2800ms only 1.65s of each beat is settled; the source's cadence assumes a faster card. | Set the interval to **`3900`** as part of this port, or shorten the card transition. Do not leave 2800 with a 1.15s transition. |
| C7.7 | **`user-select: none`** and **`.card.is-active { cursor: default }`.** | Do not port either. Both contradict the target's copyable detail/citation text and click-active-card-to-open-reader behaviour. |
| C7.8 | **`text-transform: uppercase` on the heading.** Source `.card h2` uppercases; the target's `.story-title` shares its text with `.story-read-deck .story-title` (the reader's zoomed clone) and with `titleOf()`'s live-region string. | If ported, scope it to `.story-stage .story-title` only. **Recommendation: do not port** — the target's Playfair title at `clamp(1.15rem, 2vw, 1.42rem)` is set for sentence/title case. |
| C7.9 | **`aria-current="false"` on inactive cards.** | Keep the target's `removeAttribute`. |
| C7.10 | **Live-region trailing separator.** `titleOf()` returns `''` for a title-less step, producing `"Movement 2 of 3 · "`. | Guard: build the string in one expression and omit the separator when the title is empty. |
| C7.11 | **`.story-track` `gap: 0.35rem` double-spaces connectors.** `bodyStory()` line 2521 already emits `<span class="story-connector">` between steps. | Set `.story-track { gap: 0 }` when adopting the source's `gap: 0`. |

---

## 8. Ordered change list

Ordered so each step is independently verifiable and later steps depend only on earlier ones. "Target selector" is the element to edit in `study.html` unless a JS file is named.

1. **`.story-stage`** — add `color-scheme: dark;` to the existing rule (after `--story-ink: #f6efdf;`, line 589). Do **not** touch `:root`. Also add `--muted-2: #807663;` so the step colour can become a token. No other value in `.story-stage` changes; the `#080807` ground and the `radial-gradient(ellipse at 50% 0%, rgba(190, 139, 53, 0.16), transparent 18rem)` stay.

2. **`.story-viewport`** — change `height: 500px` → `height: 492px`. Leave `--card-width: min(356px, 78%)` as a percentage (source `78vw` would overflow the `.story-stage` padding). Add `isolation: isolate;` and `-webkit-tap-highlight-color: transparent;` from source `.stage` (line 58). Keep `perspective: 1500px`, `overflow: hidden`, `touch-action: pan-y`.

3. **`.story-viewport:focus-visible`** — change `outline: 2px solid var(--chain-gold)` → `outline: 2px solid var(--chain-strong)`; change `outline-offset: 2px` → `outline-offset: 4px`.

4. **`.story-card`** — change `top: 8px` → `top: 7px`; `bottom: 12px` → `bottom: 13px`. Change the base box-shadow's inset from `inset 0 0 0 1px rgba(255, 255, 255, 0.03)` → `inset 0 0 0 1px rgba(255, 255, 255, 0.018)`. Leave `border-radius: 22px`, `border: 1px solid rgba(213, 177, 106, 0.34)`, `background: #0e0d0a`, `transform`, `transform-origin`, `opacity: calc(1 - var(--distance) * 0.22)`, `z-index: calc(10 - var(--distance))`, `cursor: pointer` unchanged. **Do not add `filter`, `user-select: none`, or the source's `transition` values** (the target's `1.15s cubic-bezier(0.22, 0.61, 0.24, 1)` for transform is deliberate).

5. **`.story-card.is-active`** — change the third shadow `0 0 32px rgba(213, 177, 106, 0.1)` → `0 0 32px rgba(213, 177, 106, 0.08)`. Leave `border-color: rgba(242, 215, 151, 0.92)` and `inset 0 0 0 1px rgba(242, 215, 151, 0.2)` as-is. **Do not add `cursor: default`.**

6. **`.story-card::after`** — no change. It is the deliberate replacement for `filter: saturate(.78)`. Leave `background: rgba(4, 4, 6, 0.42)` and the `0.9s cubic-bezier(0.4, 0, 0.2, 1)` transition.

7. **`.story-photo`** — change `height: 62%` → `height: 66%`; change `object-position: center 46%` → `object-position: center var(--photo-y, 46%)`. Add `display: block;` and `pointer-events: none;`.

8. **`.story-wash`** — replace the gradient with the source's exact stops: `linear-gradient(180deg, rgba(4, 5, 8, 0.06) 0%, transparent 33%, rgba(9, 8, 6, 0.15) 49%, #0e0c08 73%, #0e0c08 100%)`. Add `pointer-events: none;`.

9. **`.story-topline`** — change `position: relative` → `position: absolute`; add `top: 18px; left: 20px; right: 20px;`; change `justify-content: flex-end` → `justify-content: space-between; align-items: center; gap: 12px;`; change `padding: 0.85rem 1rem 0` → remove it; change `font-size: 0.68rem` → `0.62rem`; change `color: var(--chain-gold)` → `color: #f4e5c4`; add `text-transform: uppercase;` and `text-shadow: 0 2px 12px #000;`. Keep `z-index: 1`.

10. **`.story-index` (new rule)** — add `.story-index { color: var(--chain-strong); }`. This is the source's `.card__topline .index { color: var(--gold-bright) }` (`#f2d797`). The theme-restore block at line 5411–5412 already covers `.story-index` for paper/white.

11. **Left topline label (new)** — in the story block add `.story-topline > .story-label { color: #f4e5c4; }` and in the paper/white restore block extend the `.story-index` group (lines 5411–5412) to include `body.paper-mode .story-stage .story-label, body.white-mode .story-stage .story-label { color: #d5b16a !important; }`. Populate the span in step 24.

12. **`.story-content`** — change `top: 36%` → `top: 42%`; change `padding: 1.1rem 1.2rem 1.25rem` → `padding: 20px 24px 28px`; change the gradient to `linear-gradient(180deg, rgba(14, 12, 8, 0) 0%, rgba(14, 12, 8, 0.9) 23%, #0e0c08 47%, #0e0c08 100%)`. **Keep** `z-index: 1`, `max-height: none`, `overflow: auto`, `align-items: center`, `justify-content: flex-end`, `text-align: center`.

13. **`.story-card:not(:has(.story-photo)) .story-content`** — no change. Verify after step 12 that its `top: 2.2rem` still overrides (it does: it is a later, more specific rule).

14. **`.story-edge` (new rule + markup)** — add:
    ```css
    .story-edge { position: absolute; inset: 0; z-index: 3; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.035); }
    ```
    and emit `<span class="story-edge" aria-hidden="true"></span>` as the last child of each card in `bodyStory()`. `z-index: 3` clears the `.story-card::after` wash at `z-index: 2`.

15. **Per-card photo position (JS)** — in `bodyStory()` add a per-step vertical focus. Either add `'--photo-y:' + (step.photoY || (i === 0 ? '48%' : i === 1 ? '47%' : '45%')) + ';'` to the card's existing inline `style` (line 2502), or extend the `steps` spec with `photoY`. This reproduces the source's `center 48% / 47% / 45%` without the three hard-coded `.card--exile/.card--cross/.card--glory` classes.

16. **`.story-stage .story-kicker`** — change `font-size: 0.68rem !important` → `0.6rem !important`; change `font-family: "JetBrains Mono", monospace` → `Inter, "Segoe UI", sans-serif` (source uses `--sans`); change `letter-spacing: 0.16em` → `0.22em`; change `margin: 0 0 0.35rem !important` → `margin: 0 0 9px !important`. Keep `text-transform: uppercase` and `color: var(--chain-gold)`.

17. **`.story-stage .story-title`** — change `font-size: clamp(1.15rem, 2vw, 1.42rem) !important` → `clamp(1.14rem, 2.2vw, 1.48rem) !important`; change `margin: 0 0 0.55rem !important` → `margin: 0 0 15px !important`; change `letter-spacing: 0.02em` → `0.035em`; change `max-width: 18rem` → `max-width: 100%`; add `text-wrap: balance;`. **Do not add `text-transform: uppercase`** (C7.8). Keep `font-family: "Playfair Display", Georgia, serif !important`, `font-weight: 500`, `line-height: 1.18`, `color: #fff8e9`.

18. **`.chain-cite`** — adopt the source chip geometry while keeping button semantics:
    ```css
    display: inline-flex; justify-content: center; align-items: center;
    min-height: 30px;
    padding: 7px 13px 6px;
    border-color: rgba(213, 177, 106, 0.55);
    background: rgba(213, 177, 106, 0.06);
    letter-spacing: 0.08em;
    color: #f2d797;
    ```
    replacing `padding: 0.45em 0.95em`, `border: 1px solid rgba(212, 175, 55, 0.45)`, `background: rgba(212, 175, 55, 0.07)`, `color: var(--chain-gold)`. **Keep** `cursor: pointer`, `border-radius: 99px`, `font-family: "JetBrains Mono", monospace`, `font-size: 0.7rem`, `line-height: 1.35`, `max-width: 100%`, `white-space: normal`, `margin: 0 0 0.6rem`, `transition: background 0.18s ease, border-color 0.18s ease`. **Keep both `.chain-cite:hover` and both `.chain-cite.is-flat` rules unchanged.** Change `.story-stage .chain-cite { color: var(--chain-gold) }` (line 754) → `color: #f2d797;` — or delete it, since the base rule now carries the colour. **Do not port the `.card--exile` / `.card--glory` chip tints.**

19. **`.story-stage .story-text`** — change `max-width: 18rem` → `275px`; change `margin: 0.75rem 0 0 !important` → `margin: 14px auto 0 !important`; change `font-size: 1.02rem !important` → `1.06rem !important`; add `text-wrap: balance;`. Keep `font-family: Newsreader, Georgia, serif`, `font-style: italic`, `line-height: 1.42 !important`, `color: #d1c5ad`.

20. **`.story-stage .story-detail`** — **no change**. Keep `max-width: 18.5rem`, `margin: 0.7rem 0 0 !important`, `font-family: Inter, "Segoe UI", sans-serif`, `font-size: 0.78rem !important`, `line-height: 1.5 !important`, `color: #a89c85`, `text-wrap: pretty`. Keep `.story-card:not(.is-active) .story-detail { opacity: 0.6 }` (C6).

21. **`.story-controls`** — add `width: min(700px, 100%);` and change `margin-top: 0.85rem` → `margin: 17px auto 0;`. Keep `display: flex; align-items: center; gap: 0.4rem`. (Do not add `justify-content: space-between`; `.story-track` is `flex: 1 1 auto`.)

22. **`.story-nav`** — change `width: 2.4rem; height: 2.4rem` → `width: 43px; height: 43px`; change `flex: 0 0 auto` → `flex: 0 0 43px`; add `display: grid; place-items: center;`; change `border: 1px solid rgba(213, 177, 106, 0.45)` → `rgba(213, 177, 106, 0.58)`; change `background: transparent` → `rgba(213, 177, 106, 0.025)`; change `color: var(--chain-gold)` → `var(--chain-strong)`; add `transition: background 0.2s, border-color 0.2s, opacity 0.2s, transform 0.2s;`. Add:
    ```css
    .story-nav:hover:not(:disabled) { background: rgba(213, 177, 106, 0.14); border-color: var(--chain-strong); transform: translateY(-1px); }
    ```
    Change `.story-nav:disabled { opacity: 0.35 }` → `0.28`. Change `.story-nav svg { width: 16px; height: 16px; ... stroke-width: 1.6 }` → `width: 17px; height: 17px; ... stroke-width: 1.7`, keeping `display: block; margin: 0 auto; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round`.

23. **`.story-track` / `.story-connector` / `.story-step` / `.story-step-dot` / `.story-step-label`** —
    - `.story-track`: change `gap: 0.35rem` → `gap: 0`; add `justify-content: center;`. Keep `flex: 1 1 auto`, `align-items: center`, `min-width: 0`, `overflow-x: auto`, `padding-bottom: 0.15rem`.
    - `.story-connector`: change `flex: 1 1 1.2rem; min-width: 0.6rem; background: rgba(213, 177, 106, 0.35)` → `flex: 1; min-width: 14px; max-width: 84px; background: linear-gradient(90deg, rgba(213, 177, 106, 0.48), rgba(213, 177, 106, 0.16));`. Keep `height: 1px`.
    - `.story-step`: change `gap: 0.45rem` → `gap: 9px`; change `padding: 0.35rem 0.4rem` → `padding: 8px 9px`; add `min-width: 0; transition: color 0.25s;`. Keep `flex: 0 0 auto`, `flex-direction: row`, `align-items: center`, `max-width: 11rem`, `border: 0`, `background: transparent`, `cursor: pointer`.
    - `.story-step` colour `#807663` → `var(--muted-2)` (added in step 1).
    - `.story-step-dot`: add `background: transparent; transition: background 0.25s, box-shadow 0.25s, transform 0.25s;`. Keep `flex: none; width: 0.5rem; height: 0.5rem; border-radius: 50%; border: 1px solid var(--chain-gold)`.
    - `.story-step.is-active .story-step-dot`: change `box-shadow: 0 0 0 4px rgba(213, 177, 106, 0.12)` → `box-shadow: 0 0 0 4px rgba(213, 177, 106, 0.1), 0 0 14px rgba(213, 177, 106, 0.35); transform: scale(1.05);`.
    - `.story-step-label`: change `line-height: 1.2` → `1`. Keep the ellipsis machinery (`max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) and `text-align: left`.

24. **`.story-step.seen:not(.story-step.is-active) .story-step-dot` (new rule)** — add `background: rgba(213, 177, 106, 0.45);`. Background-only, so no theme-restore entry is needed.

25. **`.story-utility`** — add `min-height: 36px;` and change `margin-top: 0.85rem` → `margin-top: 11px`. Keep `flex-direction: column`, `align-items: center`, `gap: 0.65rem`, `text-align: center`.

26. **`.story-stage .story-live`** — change `letter-spacing: 0.04em` → `0.06em`; change `font-size: 0.68rem !important` → `0.61rem !important`. Keep `font-family: "JetBrains Mono", monospace !important`, `line-height: 1.45 !important`, `margin: 0 !important`, `color: var(--chain-muted)`.

27. **`.story-play`** — change `gap: 0.45rem` → `gap: 8px`. Add `.story-play:hover { color: var(--chain-strong); }`. **Keep the pill** (`border-radius: 999px; border: 1px solid rgba(213, 177, 106, 0.45)`), the JetBrains Mono face, `font-size: 0.72rem`, and the `aria-pressed` icon-swap rules. Rationale: it must sit beside `.story-fullscreen`, which is also a pill (lines 886–901).

28. **`.story-read`** — add `padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));` (replacing the `1.5rem` in `padding: 4.75rem 1.25rem 1.5rem`). Change the `#f6efdf` colour to `var(--story-ink, #f6efdf)` and add the escaped token block so ported `var()` usage resolves:
    ```css
    .story-read { --chain-gold: #d5b16a; --chain-strong: #f2d797; --chain-muted: #b9ad94; --story-ink: #f6efdf; --muted-2: #807663; }
    ```
    This fixes the `.story-medal` colour loss inside reader clones (C7.1) without touching any reader mechanism. **Do not add `backdrop-filter`, `display: none/block`, `#sheet`-style `overflow: auto` on the root, or a header row** (C3).

29. **`.story-read-deck .story-medal`** — optionally add `color: var(--chain-strong);` as a belt-and-braces fix for C7.1 if step 28 is skipped.

30. **`@media (max-width: 620px)` (story block)** —
    - `.story-viewport`: change `height: 460px` → `454px`; change `--card-width: min(320px, 84%)` → `min(330px, 81%)`.
    - Add `.story-card { top: 5px; bottom: 9px; border-radius: 19px; transform: translateX(calc(var(--d) * 67%)) rotateY(calc(var(--d) * -7deg)) scale(calc(1 - var(--distance) * 0.055)); }`.
    - Add `.story-photo { height: 64%; }`.
    - Add `.story-topline { top: 15px; left: 15px; right: 15px; font-size: 0.55rem; }`.
    - Add `.story-content { top: 41%; padding: 17px 18px 22px; }`.
    - Add `.story-stage .story-kicker { margin-bottom: 7px; font-size: 0.56rem; }`.
    - Add `.story-stage .story-title { font-size: 1.16rem !important; margin-bottom: 12px; }`.
    - Add `.story-stage .story-text { margin-top: 12px !important; font-size: 1rem !important; }`.
    - Change `.story-stage .story-controls` → add `.story-controls { gap: 7px; margin-top: 12px; }`.
    - Add `.story-nav { flex-basis: 37px; width: 37px; height: 37px; }`.
    - Add `.story-step { gap: 6px; padding: 8px 5px; }`.
    - Merge into the existing rule: `.story-step-label { font-size: 0.59rem; letter-spacing: 0.07em; max-width: 5.6rem; }`.
    - Add `.story-step-dot { width: 7px; height: 7px; }`.
    - Add `.story-connector { min-width: 10px; }`.
    - Add `.story-utility { margin-top: 5px; gap: 7px; flex-wrap: wrap; }`.
    - Add `.story-stage .story-live { font-size: 0.57rem !important; }`.
    - Keep `.story-step { max-width: 7.5rem }`, and all six `.story-read-*` rules already present.

31. **`@media (max-width: 360px)` (story block)** — change `.story-viewport { height: 420px }` → `height: 438px`; add `--card-width: 82%;` to the same rule. Add `.story-step-label { font-size: 0.53rem; }`, `.story-step { padding-inline: 3px; }`, `.story-stage .story-text { font-size: 0.95rem !important; }`. Keep `.story-stage .story-title { font-size: 1.05rem !important }`.

32. **`@media (prefers-reduced-motion: reduce)`** — **no change**. Do not port the source's universal `*` override (C4). If step 14's `.story-edge` is added, no reduced-motion entry is needed (no transition).

33. **`bodyStory()` — card ARIA and topline (JS)** — in the card template (line 2502), add `role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + n + ': ' + escapedTitle + '"`. In the `.story-topline` markup (line 2504) add the source's left label: `'<span class="story-label">' + escapeStudy(spec.title || 'The story') + '</span><span class="story-index">' + num + '</span>'`. Keep the existing `num` construction.

34. **`wireStory()` — `seen` marking (JS)** — in `render()` after the `steps.forEach` block (line 2645), add `if (steps[current]) steps[current].classList.add('seen');`. This matches the source's cumulative semantics (never removed).

35. **`wireStory()` — live-region guard (JS)** — replace line 2648 with a form that omits the separator when the title is empty, e.g. `const t = titleOf(current); live.textContent = 'Movement ' + (current + 1) + ' of ' + cards.length + (t ? ' \u00b7 ' + t : '');`. The separator stays **U+00B7 MIDDLE DOT**.

36. **`wireStory()` — autoplay interval (JS)** — change `}, 2800);` (line 2984) → `}, 3900);`. Re-check the interaction with `.story-card`'s `1.15s` transform: at 3900ms, 2.75s of each beat is settled. Leave the interval body (`if (current >= cards.length - 1) { stopPlayback(); return; } go(current + 1, false);`) unchanged.

37. **`.sr-only` keyboard help (markup)** — add a visually-hidden paragraph to the story markup emitted by `bodyStory()` (or once per figure), reading "Use the left and right arrow keys to move between story movements." Use Tailwind's `sr-only` utility if it is available in `study.html`; otherwise add the source's `.sr-only` rule (line 111) as `.story-sr-only` and use that.

38. **Theme restore (paper/white)** — extend the block at `study.html` lines 5399–5457 in the same commit as steps 9–11:
    - `.story-label` → add to the `.story-index` group at lines 5411–5412, value `#d5b16a !important`.
    - `.story-title` / `.story-text` groups (5399–5404) already cover the new sizes; only the `color` matters there and it is unchanged at `#f6efdf !important`.
    - `.story-detail` (5405–5408) unchanged at `#a89c85 !important`.
    - If step 28's token block is added to `.story-read`, no new reader entries are needed; otherwise add any newly coloured reader selector (e.g. `.story-read-deck .story-medal`) to lines 5431–5456.

39. **Regression check** — after all changes, verify on the three `assets/study/diagrams/*.jpg` movements and on a 4-step `steps` diagram: (a) card geometry at 1440 / 1024 / 620 / 360 px; (b) `--d` / `--distance` still drive transform, opacity and z-index; (c) `is-active` border and shadow; (d) `.story-card::after` wash still dims neighbours and clears on active; (e) `seen` dots accumulate and never override `is-active`; (f) citation chip opens the right `#sheet-verify` row and `.is-flat` still renders flat; (g) reader opens with `stage.inert`, three photo layers crossfade, `Escape` closes and returns focus; (h) all four themes show the stage and the reader in their dark palette with no near-black text; (i) `prefers-reduced-motion: reduce` still fades (0.3s) rather than cutting.
