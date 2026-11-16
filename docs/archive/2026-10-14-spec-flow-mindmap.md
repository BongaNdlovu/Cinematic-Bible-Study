# Spec — Cinematic Mindmap (port of "The Three Interpretive Schools")

**Purpose.** Extract the design and interaction of the standalone prototype so it can be rebuilt
inside the study lesson, replacing the current "flow" diagram renderer, *exactly but adjusted
contextually*. This is a specification, not a critique. Values are copied from the source.

## 0. Sources and how to read this

| Role | Path | Size |
| --- | --- | --- |
| SOURCE — prototype | `C:\Users\fanel\Downloads\The Three Interpretive Schools — Cinematic Mindmap (1).html` | 54,602 B · 827 lines · single file, no build, no dependencies |
| TARGET — renderer | [`js/study/study-app.js`](../js/study/study-app.js) → `bodyFlow(spec, steps, canResolve)` at **L2369–2384**, dispatched at **L3041** | 4,704 lines |
| TARGET — styles | [`study.html`](../study.html) → `.flow-stack` / `.flow-step` / `.flow-points` at **L1450–1498**, theme overrides **L1512–1531** | 7,330 lines |
| TARGET — data | [`js/study/sheets-data.js`](../js/study/sheets-data.js) → 5 specs with `kind: "flow"` (L1115, L1136, L2164, L2190, L5667) | 6,221 lines |
| TARGET — audit tooling | [`tools/diagrams/validate-specs.mjs`](../tools/diagrams/validate-specs.mjs), [`tools/diagrams/count-figures.mjs`](../tools/diagrams/count-figures.mjs), [`tools/diagrams/enumerate-renderers.mjs`](../tools/diagrams/enumerate-renderers.mjs), [`tools/verify/extract_claim_units.mjs`](../tools/verify/extract_claim_units.mjs) | — |

Line references written `L###` are the SOURCE's line numbers unless prefixed with a target file.
Every quoted CSS rule, keyframe, and function body below is verbatim from the SOURCE.

### 0.1 What is being replaced

Today's flow diagram is a vertical stack of bordered cards, one per step, animating in sequence on
scroll. Verbatim, `js/study/study-app.js` L2369–2384:

```js
function bodyFlow(spec, steps, canResolve) {
  let t = 0.1;
  return '<div class="flow-stack">' + steps.map((step) => {
    const html = '<div class="flow-step" style="--t:' + t.toFixed(2) + 's">' +
      (step.role ? '<p class="chain-role">' + escapeStudy(step.role) + '</p>' : '') +
      (step.title ? '<h4 class="chain-title">' + escapeStudy(step.title) + '</h4>' : '') +
      diagramCite(step.cite, canResolve) +
      (step.text ? '<p class="chain-text">' + escapeStudy(step.text) + '</p>' : '') +
      ((step.points || []).length
        ? '<ul class="flow-points">' + step.points.map((p) => '<li>' + escapeStudy(p) + '</li>').join('') + '</ul>'
        : '') +
    '</div>';
    t += 0.35;
    return html;
  }).join('') + '</div>';
}
```

and its whole appearance, `study.html` L1450–1498:

```css
.flow-stack { display: flex; flex-direction: column; gap: 0.85rem; }
.flow-step {
  position: relative;
  padding: 0.95rem 1.1rem 1rem 1.25rem;
  border: 1px solid rgba(197, 155, 39, 0.28);
  border-left: 3px solid var(--chain-gold, #e4c56a);
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(212, 175, 55, 0.09), transparent 40%),
    rgba(255, 248, 230, 0.035);
  box-shadow: inset 0 1px 0 rgba(242, 215, 151, 0.07);
  opacity: 0;
  transform: translateY(8px);
}
.chain.is-visible .flow-step { animation: chain-rise 0.6s ease-out var(--t) forwards; }
.flow-points { list-style: none; margin: 0.7rem 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.45rem 0.9rem; }
.flow-points li { position: relative; padding-left: 0.95rem; font-family: Inter, sans-serif; font-size: 0.86rem; line-height: 1.55; color: var(--chain-muted, inherit); }
.flow-points li::before { content: ""; position: absolute; left: 0; top: 0.55em; width: 5px; height: 5px; border-radius: 50%; background: var(--chain-gold, #e4c56a); opacity: 0.75; }
@media (prefers-reduced-motion: reduce) { .flow-step { opacity: 1 !important; transform: none !important; animation: none !important; } }
```

Theme overrides for the flow block, `study.html` L1512–1531:

```css
body.paper-mode .cmp-col, body.white-mode .cmp-col,
body.paper-mode .flow-step, body.white-mode .flow-step {
  background: rgba(255, 250, 236, 0.72);
  border-color: rgba(180, 140, 40, 0.35);
}
body.paper-mode .flow-points li, body.white-mode .flow-points li,
body.paper-mode .tbl tbody td, body.white-mode .tbl tbody td { color: #57534e; }
```

Inventory today (measured, `node tools/diagrams/enumerate-renderers.mjs`):

```
kind         count  renderer
chain            4  bodyStory -> .story-card carousel (+ reader)
steps            5  bodyStory -> .story-card carousel (+ reader)
comparison      24  bodyComparison -> static block
table            8  bodyTable -> static block
timeline         3  bodyTimeline -> static block
flow             5  bodyFlow -> static block
```

49 authored `figure[data-diagram]` markers, 49 specs, 0 orphans (`node tools/diagrams/count-figures.mjs`).

The five flow specs, in full:

| id | title | steps | notes |
| --- | --- | --- | --- |
| `s2/s2-3` | The Post-Roman Dilemma (Daniel 2:43) | 2 | has `note`; step 2 has 4 `points` |
| `s2/s2-4` | The Smiting Stone | 4 | one `cite: "Dan. 2:34"` |
| `s4/s4-4` | Daniel's Account | 5 | every step cites `Daniel 4:30–34` |
| `s4/s4-5` | Daniel 4:34–37 | 4 | every step cites `Daniel 4:34–37` |
| `s10/s10-2` | Daniel 12:1-2 in Its Own Order | 5 | one `cite: "Dan 11:2-4"` |

All five are *linear sequences* — the same shape as the source map's per-school branch list. That is
why the port is a re-projection of the same data, not a new content model (§9).

---

## 1. The world model

### 1.1 Container stack

SOURCE markup, L283–313:

```html
<div id="viewport">
  <div id="stage">
    <div class="rays"></div>

    <div id="world">
      <svg id="links" viewBox="0 0 1600 900" aria-hidden="true"> … </svg>
      <div class="hdr">…</div>
      <div class="node center" style="left:800px;top:450px;--d:1.8s"> … </div>
      <div class="hint">…</div>
    </div>

    <div id="scenes"></div>
  </div>
</div>
```

CSS, L37–40 and L42–46 and L54:

```css
#viewport{position:fixed;inset:0;z-index:2;overflow:hidden}
#stage{position:absolute;left:0;top:0;width:1600px;height:900px;transform-origin:0 0}
#world{position:absolute;inset:0;transition:filter 1.1s ease}
.in-scene #world{filter:blur(7px) brightness(.26) saturate(.7);pointer-events:none}

.rays{position:absolute;left:50%;top:50%;width:2000px;height:2000px;margin:-1000px 0 0 -1000px;pointer-events:none;mix-blend-mode:screen;transition:opacity 1.1s;
  background:conic-gradient(from 0deg,transparent 0deg,rgba(220,178,87,.10) 11deg,transparent 26deg,transparent 98deg,rgba(220,178,87,.07) 112deg,transparent 130deg,transparent 205deg,rgba(220,178,87,.085) 221deg,transparent 240deg,transparent 360deg);
  -webkit-mask-image:radial-gradient(circle,#000 0,transparent 60%);mask-image:radial-gradient(circle,#000 0,transparent 60%);
  animation:spin 160s linear infinite}
.in-scene .rays{opacity:.15}

#links{position:absolute;left:0;top:0;width:1600px;height:900px;overflow:visible;pointer-events:none}
```

Three layers, each with one job:

| Layer | Position | Coordinate space | Contents |
| --- | --- | --- | --- |
| `#links` (SVG) | absolute, 1600×900 | SVG user units = world px, 1:1 | all 4 link groups |
| `.node` (HTML divs) | absolute, `transform:translate(-50%,-50%)` | world px via inline `left`/`top` | centre, heads, leaves |
| `.xwrap` (HTML divs) | absolute, `transform:translate(-50%,-50%)` | world px via inline `left`/`top` | cross-link labels |

Because the SVG is authored at exactly 1600×900 and the stage is exactly 1600×900, SVG user units and
HTML pixels coincide. Every geometry constant is therefore in one space.

### 1.2 Constants

```js
const W=1600,H=900,Y=520;                                   // L350
const T={linkC:[2.5,2.75,3.0],head:[3.3,3.6,3.9]};          // L392  opening schedule (seconds)
const P={cx:800,cy:450,cr:90,hxL:510,hxR:1090,hw:250,lw:290,lxL:185,lxR:1415};   // L393
```

| Name | Value | Meaning |
| --- | --- | --- |
| `W`,`H` | 1600, 900 | world size = stage size = SVG `viewBox` |
| `Y` | 520 | the y of every scene's horizontal chain |
| `P.cx`,`P.cy` | 800, 450 | centre node origin (page centre) |
| `P.cr` | 90 | centre radius — links start at `cx±cr∓2` |
| `P.hxL`,`P.hxR` | 510, 1090 | x of left/right school **head** nodes |
| `P.hw` | 250 | head card width (`.head .card{width:250px}`) |
| `P.lw` | 290 | leaf card width (`.leaf .card{width:290px}`) |
| `P.lxL`,`P.lxR` | 185, 1415 | x of left/right leaf columns |
| `T.linkC` | `[2.5, 2.75, 3.0]` | main link draw start per school, seconds |
| `T.head` | `[3.3, 3.6, 3.9]` | head node `--d` per school, seconds |

Vertical spacing between leaves in a cluster, from the build loop (`L436`):

```js
const step=left?150:136, lx=left?P.lxL:P.lxR;
```

### 1.3 Node placement

`.node{position:absolute;transform:translate(-50%,-50%);transition:opacity .5s ease}` (L74) — nodes are
centre-anchored, so `left`/`top` is the node's *centre point*, not its corner. Placement is written
inline per node as a `cssText` string:

```js
head.style.cssText=`left:${hx}px;top:${hy}px;--d:${hd}s`;                    // L431
leaf.style.cssText=`left:${lx}px;top:${ly}px;--d:${ld.toFixed(2)}s`;         // L443
```

Centre: `style="left:800px;top:450px;--d:1.8s"` (L302).

Leaf vertical positions, `L438–439` — note the `up` flag reverses the fan so a cluster above the centre
line reads outward from the centre:

```js
/* clusters read outward from the centre line: the top cluster runs upward */
const ly=b.up?hy+(1-li)*step:hy+(li-1)*step, ld=hd+1.1+li*.24;
```

Worked out for the shipped data:

| School | `side` | `y` | `up` | leaf y (li = 0,1,2) | leaf `--d` |
| --- | --- | --- | --- | --- | --- |
| historicism | L | 450 | — | 300, 450, 600 | 4.40, 4.64, 4.88 s |
| preterism | R | 225 | true | 361, 225, 89 | 4.70, 4.94, 5.18 s |
| futurism | R | 675 | — | 525, 675, 825 | 5.00, 5.24, 5.48 s |

### 1.4 Scaling the world to the viewport

The whole fit function, `L731–738`:

```js
/* ═════════ fit stage to the window ═════════ */
function fit(){
  const c=isCompact(); root.classList.toggle('compact',c);
  if(c){stage.style.transform='';return;}
  layoutCross();
  const s=Math.min(innerWidth/W,innerHeight/H);
  stage.style.transform=`translate(${((innerWidth-W*s)/2).toFixed(2)}px,${((innerHeight-H*s)/2).toFixed(2)}px) scale(${s.toFixed(5)})`;
}
```

Behaviour: uniform `scale` = `min(vw/1600, vh/900)` (contain), then the scaled 1600×900 box is centred
by translating `(vw − 1600s)/2`, `(vh − 900s)/2`. `transform-origin:0 0` on `#stage` makes the
translation the true top-left offset. Called from:

```js
addEventListener('resize',()=>{fit();resizeDust();});                 // L819
compactMQ.addEventListener&&compactMQ.addEventListener('change',fit); // L820
fit(); resizeDust(); layoutCross();                                   // L821
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(layoutCross); // L822
```

`layoutCross()` is re-run on resize and after fonts load because the cross-link geometry is measured
from rendered node heights (`offsetHeight`), which depend on the webfont.

### 1.5 What `--d` drives

`--d` is a per-element **delay in seconds**, set inline at build time and consumed by every entrance
animation. It is not a duration and not a state flag.

Consumers (all L167–177):

```css
.intro .center .core{animation:coreIn 1.5s var(--d) cubic-bezier(.2,.8,.2,1) both,corePulse 5s calc(var(--d) + 1.5s) ease-in-out infinite alternate}
.intro .orbit{animation:spin 70s linear infinite,fadeIn 1.5s calc(var(--d) + .6s) both}
.intro .ring{animation-delay:calc(var(--rd,0s) + var(--d) + 1s)}
.intro .card{animation:rise 1s var(--d) cubic-bezier(.2,.8,.2,1) both}
.intro .lk{stroke-dasharray:1;stroke-dashoffset:1;animation:draw var(--dur,1s) var(--d,0s) cubic-bezier(.55,.05,.25,1) forwards}
.intro #world .ah{animation:fadeTo .4s var(--d) both}
.intro .xl{animation:fadeIn 1s var(--d) both}
.intro .xlbl{animation:fadeIn .8s calc(var(--d) + .5s) both}
```

Scene children use the same variable with a *scene-local* timeline (§5.3). Three variables are in play:

* `--d` — delay, on nodes, links, arrowheads, cross-labels, and every scene child.
* `--rd` — ring delay only, on the three `.ring` elements (`0s`, `2s`, `4s`).
* `--dur` — link draw duration only, `1s` for main links, `0.8s` for leaf links.

The whole opening is gated on `body.intro`, present in the markup (`<body class="intro">`) and removed
under reduced motion (`if(reduce) body.classList.remove('intro')`, L356). `replay()` re-adds it after a
forced reflow:

```js
function replay(){                                     // L596–600
  stopTour(); closeScene(true);
  body.classList.remove('intro'); void body.offsetWidth; body.classList.add('intro');
  t0=performance.now();
}
```

### 1.6 Camera / parallax

```js
const cam={x:0,y:0,tx:0,ty:0,s:1,ts:1};                                 // L553
addEventListener('pointermove',e=>{                                     // L726–729
  if(e.pointerType==='touch'||reduce) return;
  cam.tx=-(e.clientX/innerWidth-.5)*18; cam.ty=-(e.clientY/innerHeight-.5)*12;
},{passive:true});
```

and in the frame loop, `L808–813`:

```js
const k=Math.min(1,dt*3);
cam.x+=(cam.tx-cam.x)*k; cam.y+=(cam.ty-cam.y)*k; cam.s+=(cam.ts-cam.s)*Math.min(1,dt*2);
if(!isCompact()){
  world.style.transform=`translate3d(${cam.x.toFixed(2)}px,${cam.y.toFixed(2)}px,0) scale(${cam.s.toFixed(4)})`;
  scenesEl.style.transform=`translate3d(${(-cam.x*.6).toFixed(2)}px,${(-cam.y*.6).toFixed(2)}px,0)`;
}
```

Translation range ±9 px horizontally, ±6 px vertically; scenes move at 0.6× and inverted — a cheap
parallax. `cam.ts` is the *target* scale: `1` on the map, `1.05` when a scene opens (`L569`), `1`
again on close (`L576`).

---

## 2. The SVG link layer

### 2.1 The four groups and `<defs>`

SOURCE markup, L288–298:

```html
<svg id="links" viewBox="0 0 1600 900" aria-hidden="true">
  <defs>
    <radialGradient id="gl-historicism"><stop offset="0" stop-color="#ffe3a0" stop-opacity=".95"/><stop offset=".35" stop-color="#dcb257" stop-opacity=".5"/><stop offset="1" stop-color="#dcb257" stop-opacity="0"/></radialGradient>
    <radialGradient id="gl-preterism"><stop offset="0" stop-color="#d6e6f5" stop-opacity=".95"/><stop offset=".35" stop-color="#86a6c4" stop-opacity=".5"/><stop offset="1" stop-color="#86a6c4" stop-opacity="0"/></radialGradient>
    <radialGradient id="gl-futurism"><stop offset="0" stop-color="#ffd2bd" stop-opacity=".95"/><stop offset=".35" stop-color="#d98563" stop-opacity=".5"/><stop offset="1" stop-color="#d98563" stop-opacity="0"/></radialGradient>
  </defs>
  <g id="linkLayer"></g>
  <g id="arrowLayer"></g>
  <g id="crossLayer"></g>
  <g id="pulseLayer"></g>
</svg>
```

| Group | Draws | Rule |
| --- | --- | --- |
| `linkLayer` | solid outward `<path class="lk">`, one per head link and one per leaf | `.lk{fill:none;stroke:rgba(var(--ac-rgb),.5);stroke-width:1.3}` · `.lk.main{stroke:rgba(var(--ac-rgb),.85);stroke-width:2;filter:drop-shadow(0 0 5px rgba(var(--ac-rgb),.7))}` |
| `arrowLayer` | arrowheads, each a `<g class="ahg" data-b>` wrapping one `<path class="ah">` | `.ah{fill:var(--ac);filter:drop-shadow(0 0 4px rgba(var(--ac-rgb),.7))}` |
| `crossLayer` | dashed school-to-school connectors | `.xl{fill:none;stroke:rgba(244,236,216,.55);stroke-width:1.4;stroke-dasharray:6 6;stroke-linecap:round}` · `.ah.x{fill:rgba(244,236,216,.85);filter:none}` |
| `pulseLayer` | the travelling light head per link | `.pulse{transition:opacity .5s}` · `.pc{fill:#fff4d6}` |

There are **no SVG `<marker>` elements and no SVG filters**. Arrowheads are ordinary paths placed with a
`transform`; glow is CSS `filter:drop-shadow()`. This matters for the port: `drop-shadow` on a scaled
SVG is a per-frame raster cost and must be dropped in the compact/print paths.

Dimming is done by opacity transitions, not by re-styling, L59 and L65–71:

```css
.ahg,.xg,.xwrap{transition:opacity .5s}
#world[data-focus] .xg,#world[data-focus] .xwrap{opacity:.1}
#world[data-focus="preterism"] .xa,#world[data-focus="futurism"] .xa,
#world[data-focus="historicism"] .xb,#world[data-focus="futurism"] .xb{opacity:1}
#world[data-focus] [data-b]{opacity:.16}
#world[data-focus="historicism"] [data-b="historicism"],
#world[data-focus="preterism"] [data-b="preterism"],
#world[data-focus="futurism"] [data-b="futurism"]{opacity:1}
```

Per-school accent tokens, L23–26:

```css
/* one colour per school — gold is the reading the course defends */
[data-b="historicism"]{--ac:#dcb257;--ac-rgb:220,178,87}
[data-b="preterism"]{--ac:#86a6c4;--ac-rgb:134,166,196}
[data-b="futurism"]{--ac:#d98563;--ac-rgb:217,133,99}
```

Every generated element carries `data-b="<school id>"`, so `--ac`/`--ac-rgb` resolve from the nearest
`[data-b]` ancestor — `.branch` for nodes, the `<g>` itself for links and arrowheads.

### 2.2 Path `d` generation — solid links

The arrowhead template and its placement, L398–407:

```js
const ARROW='M0 0L-11 -5.5L-7.5 0L-11 5.5Z';
function addArrow(layer,x,y,ang,b,delay){
  const g=document.createElementNS(NS,'g');
  g.setAttribute('class','ahg'); g.setAttribute('data-b',b);
  const a=document.createElementNS(NS,'path');
  a.setAttribute('class','ah'); a.setAttribute('d',ARROW);
  a.setAttribute('transform',`translate(${x} ${y}) rotate(${ang})`);
  a.style.setProperty('--d',delay.toFixed(2)+'s');
  g.appendChild(a); layer.appendChild(g);
}
```

The solid link generator, L408–424 — a **cubic Bézier with both control points on the vertical mid-line**
(`mx`), which produces the S-curve between two differently-levelled nodes:

```js
function addLink(x1,y1,x2,y2,b,delay,dur,main){
  const mx=(x1+x2)/2;
  const p=document.createElementNS(NS,'path');
  p.setAttribute('d',`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`);
  p.setAttribute('pathLength','1');
  p.setAttribute('class','lk'+(main?' main':''));
  p.setAttribute('data-b',b);
  p.style.setProperty('--d',delay.toFixed(2)+'s');
  p.style.setProperty('--dur',dur.toFixed(2)+'s');
  linkLayer.appendChild(p);
  addArrow(arrowLayer,x2,y2,x2>=x1?0:180,b,delay+dur-.1);
  const g=document.createElementNS(NS,'g');
  g.setAttribute('class','pulse'); g.setAttribute('data-b',b); g.setAttribute('transform','translate(-60 -60)');
  g.innerHTML=`<g class="pin" opacity="0"><circle r="12" fill="url(#gl-${b})"/><circle class="pc" r="2.4"/></g>`;
  pulseLayer.appendChild(g);
  pulses.push({path:p,g,pin:g.firstChild,len:0,ready:delay+dur,speed:.11+Math.random()*.07,off:Math.random()});
}
```

Four things to carry over exactly:

1. `pathLength="1"` normalises the path so `stroke-dasharray:1; stroke-dashoffset:1 → 0` is a complete
   draw-on regardless of real length. The draw keyframe is only `@keyframes draw{to{stroke-dashoffset:0}}` (L199).
2. The arrowhead angle is **`0` for left-to-right, `180` for right-to-left** — never computed from the
   tangent. Arrowheads therefore always point exactly horizontally, matching the horizontal entry of
   the Bézier at `x2`.
3. Arrowhead `--d = delay + dur − 0.1 s`, so the head lands 100 ms before the line finishes.
4. Each link also creates a `.pin` — a `<g opacity="0">` holding a 12 px halo circle filled with the
   school's `url(#gl-<id>)` radial gradient plus a 2.4 px `#fff4d6` core. This is the travelling light;
   it is *not* an SVG `<marker>`.

The build loop, L425–449, verbatim:

```js
MAP.forEach((b,bi)=>{
  const left=b.side==='L';
  const hx=left?P.hxL:P.hxR, hy=b.y, hd=T.head[bi];
  const grp=document.createElement('div'); grp.className='branch'; grp.setAttribute('data-b',b.id);
  const head=document.createElement('div');
  head.className='node head'+(b.hero?' hero':''); head.setAttribute('data-b',b.id);
  head.style.cssText=`left:${hx}px;top:${hy}px;--d:${hd}s`;
  head.innerHTML=`<div class="card" role="button" tabindex="0" aria-label="Open the ${b.name} scene"><div class="tag">${b.tag}</div><h2>${b.name}</h2><div class="enter">Open scene</div></div>`;
  grp.appendChild(head);
  refs[b.id]={head,y:hy,leaves:[]};
  addLink(left?P.cx-P.cr+2:P.cx+P.cr-2,P.cy,left?hx+P.hw/2:hx-P.hw/2,hy,b.id,T.linkC[bi],1,true);
  const step=left?150:136, lx=left?P.lxL:P.lxR;
  b.leaves.forEach((html,li)=>{
    /* clusters read outward from the centre line: the top cluster runs upward */
    const ly=b.up?hy+(1-li)*step:hy+(li-1)*step, ld=hd+1.1+li*.24;
    addLink(left?hx-P.hw/2+3:hx+P.hw/2-3,hy,left?lx+P.lw/2:lx-P.lw/2,ly,b.id,hd+.5+li*.24,.8,false);
    const leaf=document.createElement('div');
    leaf.className='node leaf'; leaf.setAttribute('data-b',b.id);
    leaf.style.cssText=`left:${lx}px;top:${ly}px;--d:${ld.toFixed(2)}s`;
    leaf.innerHTML=`<div class="card"><p>${arrows(html)}</p></div>`;
    grp.appendChild(leaf);
    refs[b.id].leaves.push({el:leaf,y:ly});
  });
  world.appendChild(grp);
});
```

Exact endpoints:

| Link | from | to | delay | dur | main |
| --- | --- | --- | --- | --- | --- |
| head, left | `(710, 450)` = `cx − cr + 2` | `(hx + 125, y)` = `hx + hw/2` | `T.linkC[i]` 2.5/2.75/3.0 | 1.0 | yes |
| head, right | `(890, 450)` = `cx + cr − 2` | `(hx − 125, y)` | `T.linkC[i]` | 1.0 | yes |
| leaf, left | `(hx − 122, y)` = `hx − hw/2 + 3` | `(lx + 145, ly)` = `lx + lw/2` | `hd + .5 + .24·li` | 0.8 | no |
| leaf, right | `(hx + 122, y)` | `(lx − 145, ly)` | `hd + .5 + .24·li` | 0.8 | no |

`.branch{display:contents}` (L227) — the wrapper exists only to scope `data-b`, and contributes no box.

### 2.3 Path `d` generation — dashed cross-links

Group factory, L452–461:

```js
const X={};
function crossGroup(cls,delay){
  const g=document.createElementNS(NS,'g'); g.setAttribute('class','xg '+cls);
  const line=document.createElementNS(NS,'path'); line.setAttribute('class','xl'); line.style.setProperty('--d',delay+'s'); g.appendChild(line);
  const heads=[0,1].map(()=>{const h=document.createElementNS(NS,'path'); h.setAttribute('class','ah x'); h.setAttribute('d',ARROW); h.style.setProperty('--d',(delay+.5)+'s'); g.appendChild(h); return h;});
  crossLayer.appendChild(g);
  const wrap=document.createElement('div'); wrap.className='xwrap '+cls; wrap.style.setProperty('--d',delay+'s');
  const lbl=document.createElement('div'); lbl.className='xlbl'; wrap.appendChild(lbl); world.appendChild(wrap);
  return {line,heads,wrap,lbl};
}
```

Layout, measured from rendered node heights at fit time, L462–482:

```js
function layoutCross(){
  if(isCompact()) return;
  if(!X.a){
    X.a=crossGroup('xa',6.0); X.a.lbl.textContent='Same origin: Counter-Reformation';
    X.b=crossGroup('xb',6.4); X.b.lbl.textContent='Same chain up to Rome, then Futurism breaks it';
  }
  /* a: Preterism's History card (bottom of its cluster) ↔ Futurism's History card (top of its cluster) */
  const pl=refs.preterism.leaves[0], fl=refs.futurism.leaves[0], x=P.lxR;
  const y1=pl.y+pl.el.offsetHeight/2, y2=fl.y-fl.el.offsetHeight/2;
  X.a.line.setAttribute('d',`M${x} ${y1}V${y2}`);
  X.a.heads[0].setAttribute('transform',`translate(${x} ${y1}) rotate(-90)`);
  X.a.heads[1].setAttribute('transform',`translate(${x} ${y2}) rotate(90)`);
  X.a.wrap.style.left=x+'px'; X.a.wrap.style.top=((y1+y2)/2)+'px';
  /* b: Historicism ↔ Futurism, curving under the centre */
  const hh=refs.historicism.head.offsetHeight/2;
  const yb1=refs.historicism.y+hh, yb2=refs.futurism.y+hh;
  X.b.line.setAttribute('d',`M${P.hxL} ${yb1}C${P.hxL} ${yb1+160} ${P.hxR} ${yb2+160} ${P.hxR} ${yb2}`);
  X.b.heads[0].setAttribute('transform',`translate(${P.hxL} ${yb1}) rotate(-90)`);
  X.b.heads[1].setAttribute('transform',`translate(${P.hxR} ${yb2}) rotate(-90)`);
  X.b.wrap.style.left=((P.hxL+P.hxR)/2)+'px'; X.b.wrap.style.top=((4*yb1+4*yb2+960)/8)+'px';
}
```

The difference in kind between the two arrow families:

| | solid (`linkLayer` + `arrowLayer`) | dashed (`crossLayer`) |
| --- | --- | --- |
| Meaning | the school's own chain, outward from the centre | how two schools relate to each other |
| Stroke | school accent, `--ac`, 1.3 px (2 px + glow if `.main`) | fixed cream `rgba(244,236,216,.55)`, 1.4 px, `stroke-dasharray:6 6`, round caps |
| Arrowhead fill | `var(--ac)` + drop-shadow | `rgba(244,236,216,.85)`, no filter |
| Geometry | Bézier `M…C mx y1 mx y2 …` | `a` is a straight `V` (`M x y1 V y2`), `b` is a Bézier curving 160 px below the head |
| Label | none | `.xlbl` pill in `.xwrap`, offset `((4y1+4y2+960)/8)` for `b` |
| Label style | — | `.xlbl{padding:6px 13px;border-radius:999px;background:#0d0b08;border:1px dashed rgba(244,236,216,.42);font:400 12px/1.2 var(--sans);letter-spacing:.02em;color:var(--ash);white-space:nowrap}` |
| Delay | 2.5–3.0 s (with the heads) | `6.0` and `6.4` s — after every node has landed |
| Count | 3 main + 9 leaf = 12 | 2 |

The labels' own text is the only prose the cross-layer contributes to the screen, and it is set in JS:
`X.a.lbl.textContent='Same origin: Counter-Reformation'` and
`X.b.lbl.textContent='Same chain up to Rome, then Futurism breaks it'`.

`layoutCross()` is idempotent (it reuses `X.a`/`X.b` if present) and is called from `fit()` and from
`document.fonts.ready` — deliberately, because `offsetHeight` changes when the webfont swaps.

### 2.4 Every animation on a link

| Element | Declaration | Effect |
| --- | --- | --- |
| `.lk` | `.intro .lk{stroke-dasharray:1;stroke-dashoffset:1;animation:draw var(--dur,1s) var(--d,0s) cubic-bezier(.55,.05,.25,1) forwards}` | draw-on, `pathLength="1"` makes it length-independent |
| `.lk.main` | `filter:drop-shadow(0 0 5px rgba(var(--ac-rgb),.7))` | static glow on the head links only |
| `.ah` (in `#world`) | `.intro #world .ah{animation:fadeTo .4s var(--d) both}` | arrowhead tip: a 0.4 s opacity fade, `--d = linkdelay + dur − 0.1` |
| `.xl` | `.intro .xl{animation:fadeIn 1s var(--d) both}` | dashed line fades in over 1 s |
| `.ah.x` | same `.ah` fade (`--d = delay + .5`) | both cross arrowheads appear 0.5 s after their line starts |
| `.xlbl` | `.intro .xlbl{animation:fadeIn .8s calc(var(--d) + .5s) both}` | label appears 0.5 s after its line |
| `.pulse` / `.pin` | JS-driven, `updatePulses(now)`, L778–802 | travelling light |

```js
@keyframes draw{to{stroke-dashoffset:0}}                 /* L199 */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}          /* L205 */
@keyframes fadeTo{from{opacity:0}to{opacity:var(--o,1)}} /* L207 */
```

The travelling light, L777–802:

```js
function updatePulses(now){
  if(isCompact()) return;
  if(inScene){ … scene-chain variant, see §5.6 … }
  const el=(now-t0)/1000;
  for(const p of pulses){
    const t=el-p.ready;
    if(t<0) continue;
    if(!p.len){try{p.len=p.path.getTotalLength();}catch(e){continue;} if(!p.len) continue;}
    const f=(t*p.speed+p.off)%1, pt=p.path.getPointAtLength(f*p.len);
    p.g.setAttribute('transform',`translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    p.pin.setAttribute('opacity',Math.sin(Math.PI*f).toFixed(3));
  }
}
```

* A link's pulse starts at `ready = delay + dur` — the moment its arrowhead lands.
* `speed = 0.11 + Math.random()*0.07` loops per second, so a pass takes **5.6–9.1 s**.
* `off = Math.random()` staggers the pulses so they never line up.
* Opacity is `sin(π·f)`: invisible at both ends of the path, full in the middle.
* `getTotalLength()` is cached on first use (`p.len`), `getPointAtLength()` runs every frame — 12 calls
  per frame on the map.

---

## 3. The centre node

### 3.1 Structure

Markup, L302–306:

```html
<div class="node center" style="left:800px;top:450px;--d:1.8s">
  <div class="ring" style="--rd:0s"></div><div class="ring" style="--rd:2s"></div><div class="ring" style="--rd:4s"></div>
  <svg class="orbit" viewBox="0 0 232 232" aria-hidden="true"><circle cx="116" cy="116" r="114" fill="none" stroke="rgba(220,178,87,.35)" stroke-dasharray="1.5 7"/><circle cx="116" cy="2" r="3.2" fill="#f1cf86"/></svg>
  <div class="core"><div><small>Prophetic<br>interpretation</small><b>Three<br>Schools</b></div></div>
</div>
```

The centre node carries **no `data-b`** — it has no accent token, no scene, and is never a hover target
(the handler binds `$$('.node[data-b]')`, L687).

### 3.2 Styles

L77–86 verbatim:

```css
.center{width:180px;height:180px}
.center .core{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;text-align:center;
  background:radial-gradient(circle at 35% 28%,rgba(255,224,150,.26),rgba(58,40,14,.92) 58%,#120e08);
  border:1px solid rgba(220,178,87,.75);
  box-shadow:0 0 70px rgba(220,178,87,.32),inset 0 0 44px rgba(220,178,87,.14);
  animation:corePulse 5s ease-in-out infinite alternate}
.core small{display:block;margin-bottom:7px;font:500 8.5px/1.55 var(--mono);letter-spacing:.24em;text-transform:uppercase;color:var(--gilt)}
.core b{display:block;font:700 33px/.95 var(--serif);color:var(--cream)}
.ring{position:absolute;inset:0;border-radius:50%;border:1px solid rgba(220,178,87,.55);opacity:0;animation:ping 6s var(--rd,0s) ease-out infinite}
.orbit{position:absolute;left:-26px;top:-26px;width:232px;height:232px;animation:spin 70s linear infinite}
```

| Part | Value |
| --- | --- |
| `.center` box | 180 × 180 px, centred on `(800, 450)` |
| `.core` | fills the box, `border-radius:50%`, 1 px gold border `rgba(220,178,87,.75)` |
| `.core` ground | radial-gradient at 35%/28%: `rgba(255,224,150,.26)` → `rgba(58,40,14,.92)` at 58% → `#120e08` |
| `.core` glow | `0 0 70px rgba(220,178,87,.32), inset 0 0 44px rgba(220,178,87,.14)`, animated by `corePulse` |
| `small` | JetBrains Mono 500 8.5px/1.55, `letter-spacing:.24em`, uppercase, `--gilt` |
| `b` | Cormorant Garamond 700 33px/0.95, `--cream` |
| `.ring` ×3 | same 180 px circle, 1 px `rgba(220,178,87,.55)`, `--rd` 0 s / 2 s / 4 s, `ping 6s` infinite |
| `.orbit` | 232 × 232 px SVG at `left:-26px; top:-26px` (so it is concentric and 26 px proud), `spin 70s linear infinite` |

The orbit SVG is two shapes: a dashed circle `r=114` centred at 116,116 with `stroke-dasharray="1.5 7"`,
and a 3.2 px dot at `cx=116, cy=2` — i.e. a satellite riding the orbit's top. The ring rotation carries
the dot round.

`.hint`, L51 and L308:

```css
.hint{position:absolute;left:40px;top:862px;font:400 11px/1.4 var(--sans);letter-spacing:.04em;color:var(--dim)}
```

```html
<div class="hint">Solid arrows branch outward. Dashed arrows connect the schools. Click a school to open its scene. Press L to learn, C to compare, Q to quiz yourself.</div>
```

Four sentences — two of legend ("Solid arrows branch outward. Dashed arrows connect the schools."), one
of instruction ("Click a school to open its scene."), and one listing the study shortcuts — set
bottom-left of the world at y = 862. Hidden in compact mode (`.compact .hint{display:none}`, L221).

### 3.3 Entrance animation

| t (s) | Event | Rule |
| --- | --- | --- |
| 1.8 | `--d` set on the node (inline) | `style="…--d:1.8s"` |
| 2.4 | orbit fades in (0.6 s after `--d`) | `.intro .orbit{animation:spin 70s linear infinite,fadeIn 1.5s calc(var(--d) + .6s) both}` |
| 2.8 / 4.8 / 6.8 | ring 1 / 2 / 3 begin pinging | `.intro .ring{animation-delay:calc(var(--rd,0s) + var(--d) + 1s)}` |
| 1.8→3.3 | `.core` scales up from 0.3 with a 16 px blur | `coreIn 1.5s var(--d) cubic-bezier(.2,.8,.2,1) both` |
| 3.3→ | `.core` breathes | `corePulse 5s calc(var(--d) + 1.5s) ease-in-out infinite alternate` |

```css
@keyframes coreIn{from{opacity:0;transform:scale(.3);filter:blur(16px)}to{opacity:1;transform:none;filter:blur(0)}}      /* L200 */
@keyframes corePulse{from{box-shadow:0 0 50px rgba(220,178,87,.22),inset 0 0 36px rgba(220,178,87,.1)}to{box-shadow:0 0 92px rgba(220,178,87,.46),inset 0 0 52px rgba(220,178,87,.2)}}  /* L201 */
@keyframes ping{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.7);opacity:0}}                                   /* L202 */
@keyframes spin{to{transform:rotate(360deg)}}                                                                            /* L197 */
```

`.core` and `.orbit` are the only elements that keep animating forever on the map, plus the three rings
(ping 6 s, phase-shifted 2 s apart) and the `.rays` conic gradient (160 s).

### 3.4 Hover / press behaviour

There is none. The centre node:

* is not matched by `$$('.node[data-b]')`, so `pointerenter`/`pointerleave`/`click` are never bound to it;
* carries no `.card`, so the `.card` scale-on-hover rule (`.head .card:hover{scale:1.035}`, L92) does not apply;
* has no `:active`, `:focus`, `tabindex`, or `role`;
* is not affected by `#world[data-focus]` dimming (no `data-b`).

Its only interactive-adjacent behaviour is *being dimmed with everything else* — `#world` blur when a
scene is open. If the port wants the centre to be pressable (e.g. "Overview"), that is new behaviour,
not a ported one.

---

## 4. School and leaf nodes

### 4.1 The head node

Built at L429–433 (quoted in full in §2.2). Resulting HTML per school:

```html
<div class="branch" data-b="historicism">
  <div class="node head hero" data-b="historicism" style="left:510px;top:450px;--d:3.3s">
    <div class="card" role="button" tabindex="0" aria-label="Open the Historicism scene">
      <div class="tag">Continuous</div>
      <h2>Historicism</h2>
      <div class="enter">Open scene</div>
    </div>
  </div>
  …
</div>
```

Three interpolations, all from `MAP[n]`: `b.tag` → `.tag`, `b.name` → `<h2>`, `b.name` → the
`aria-label`. `b.hero` appends `.hero`.

### 4.2 The leaf nodes

```js
leaf.innerHTML=`<div class="card"><p>${arrows(html)}</p></div>`;      // L444
```

where `arrows` is a text transform, L394:

```js
const arrows=s=>s.replace(/→/g,'<i class="ar">→</i>');
```

So a leaf is exactly one `<p>` inside one `.card`; `→` characters become gold italic glyphs. Leaf copy
may also contain `<b class="lead">…</b>`, `<span class="term">…</span>`, and `<br>` — it is inserted as
HTML, *not* escaped. (In the port this must be `escapeStudy()`-ed or replaced by a typed field; see §10, C13.)

### 4.3 Styles

L88–106 verbatim:

```css
.head .card{width:250px;padding:20px 22px 18px;cursor:pointer;border-radius:14px;
  background:linear-gradient(160deg,rgba(var(--ac-rgb),.17),rgba(19,16,12,.92) 58%);
  border:1px solid rgba(var(--ac-rgb),.55);
  box-shadow:0 0 38px rgba(var(--ac-rgb),.16),inset 0 1px 0 rgba(255,255,255,.06)}
.head .card:hover,.head .card:focus-visible{scale:1.035;border-color:rgba(var(--ac-rgb),.95);box-shadow:0 0 62px rgba(var(--ac-rgb),.42),inset 0 1px 0 rgba(255,255,255,.08);outline:none}
.tag{font:500 11px/1.25 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--ac)}
.head h2{margin-top:14px;padding-bottom:13px;font:700 38px/1.05 var(--serif);color:var(--cream);border-bottom:1px solid rgba(var(--ac-rgb),.35)}
.enter{margin-top:11px;font:400 11px/1 var(--sans);letter-spacing:.06em;color:var(--dim);transition:color .3s}
.head .card:hover .enter{color:var(--ac)}
.hero .card{border-color:rgba(var(--ac-rgb),.8)}
.hero .card::before{content:'';position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;box-shadow:0 0 56px rgba(var(--ac-rgb),.4);animation:breathe 4.5s ease-in-out infinite alternate}

.leaf .card{width:290px;padding:14px 16px 15px 18px;border-radius:10px;
  background:rgba(18,15,11,.88);
  border:1px solid rgba(var(--ac-rgb),.26);border-left:2px solid rgba(var(--ac-rgb),.9)}
.leaf p{font-size:15.5px;line-height:1.45;color:var(--ash)}
.leaf .lead{font-weight:500;color:var(--ac)}
.ar{font-style:normal;color:var(--ac);padding:0 .1em}
.term{border-bottom:1px dotted rgba(var(--ac-rgb),.85);color:var(--cream)}
```

`.card` itself is the shared hover shell, L75: `.card{position:relative;scale:1;transition:scale .35s ease,box-shadow .4s,border-color .4s}`.
Note `scale:` is the standalone CSS `scale` property, not `transform` — it composes with the parent's
`translate(-50%,-50%)` and never fights it.

| | head card | leaf card |
| --- | --- | --- |
| width | 250 px | 290 px |
| padding | `20px 22px 18px` | `14px 16px 15px 18px` |
| radius | 14 px | 10 px |
| ground | `linear-gradient(160deg, rgba(ac,.17), rgba(19,16,12,.92) 58%)` | flat `rgba(18,15,11,.88)` |
| border | `1px rgba(ac,.55)`; `.hero` → `rgba(ac,.8)` | `1px rgba(ac,.26)` + `border-left:2px rgba(ac,.9)` |
| glow | `0 0 38px rgba(ac,.16)` + inset top light | none |
| type | `.tag` mono 11 px · `h2` serif 700 38 px (gold rule under) · `.enter` sans 11 px | `p` sans 15.5px/1.45 `--ash` |
| hover | `scale:1.035`, brighter border + 62 px glow, `.enter` turns `--ac`, `outline:none` | none |
| extra | `.hero` gets a `::before` ring breathing `breathe 4.5s ease-in-out infinite alternate` | — |

`.hero` marks the reading the course defends (gold `#dcb257`); `breathe` is
`@keyframes breathe{from{opacity:.3}to{opacity:1}}` (L203).

### 4.4 Node entrance

`@keyframes rise` (L198) is the only node entrance:

```css
@keyframes rise{from{opacity:0;transform:translateY(26px) scale(.94);filter:blur(12px)}to{opacity:1;transform:none;filter:blur(0)}}
.intro .card{animation:rise 1s var(--d) cubic-bezier(.2,.8,.2,1) both}
```

Rise 26 px, scale from 0.94, 12 px blur, 1 s, `cubic-bezier(.2,.8,.2,1)`, `both` fill so nothing is
visible before its delay. Because `both` is used and the base `.card` has no `opacity:0`, a node is
present and invisible from t=0 — relevant for the target, where the house rule is the opposite
(`.chain-node{opacity:0}` + `.is-visible`, which hides content if JS never runs; §10, C12).

### 4.5 Clicking a node opens a scene

```js
$$('.node[data-b]').forEach(n=>{                                        // L687–692
  const b=n.getAttribute('data-b');
  n.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!inScene&&!isCompact()) world.dataset.focus=b;});
  n.addEventListener('pointerleave',()=>{delete world.dataset.focus;});
  n.addEventListener('click',()=>openScene(IDX[b]));
});
$$('.head .card').forEach(c=>{                                          // L693–698
  const b=c.parentNode.getAttribute('data-b');
  c.addEventListener('focus',()=>{if(!inScene&&!isCompact()) world.dataset.focus=b;});
  c.addEventListener('blur',()=>{delete world.dataset.focus;});
  c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openScene(IDX[b]);}});
});
```

* **Hover trace** — mouse only (`e.pointerType==='mouse'`), and only when no scene is open. Sets
  `#world[data-focus="<id>"]`, which dims every other school to `opacity:.16` and cross-links to `.1`.
* **Focus trace** — same effect from the keyboard, on `.head .card` only (leaves are not focusable).
* **Press** — `click` on *any* `.node[data-b]`, head or leaf, opens that school's scene.
* **Keyboard** — `Enter`/`Space` on a head card only; `preventDefault()` stops Space scrolling.
* `pointerleave`/`blur` clear the focus attribute; the `--ac` tokens are unchanged by focus.

---

## 5. Scenes — the cinematic layer

### 5.1 Layer, styles, and the mechanism

`#scenes` is a sibling of `#world` inside `#stage`, and `pointer-events:none` (L109):

```css
#scenes{position:absolute;inset:0;pointer-events:none}
.scene{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .6s ease,visibility 0s .6s}
.scene.active{opacity:1;visibility:visible;transition:opacity .8s ease .2s,visibility 0s}
```

Enter and exit, L560–578 verbatim:

```js
function openScene(i,auto){
  if(isCompact()) return;
  if(!auto) stopTour();
  if(inScene&&scenes[cur]) scenes[cur].el.classList.remove('active');
  delete world.dataset.focus;
  cur=i; inScene=true;
  body.classList.add('in-scene');
  void scenesEl.offsetWidth;                 /* restart the scene's animations */
  const S=scenes[i]; S.el.classList.add('active'); S.el.setAttribute('aria-hidden','false');
  S.t0=performance.now(); cam.ts=1.05; $$('.sc')[i].classList.add('seen');
  updateHud();
}
function closeScene(auto){
  if(!auto) stopTour();
  if(!inScene) return;
  scenes[cur].el.classList.remove('active'); scenes[cur].el.setAttribute('aria-hidden','true');
  inScene=false; body.classList.remove('in-scene'); cam.ts=1;
  updateHud();
}
```

Mechanism, precisely:

* **Entering** — one `.active` class. The forced reflow (`void scenesEl.offsetWidth`) *between* removing
  the old scene and adding the new one is what restarts every child animation; without it, moving from
  scene A to scene B reuses the running animations and the new scene appears already finished.
* **Only one scene is ever active.** `openScene` removes `.active` from the previous scene and never
  waits for its 0.6 s fade — the two cross in the same 0.6–0.8 s window.
* **Exiting** — remove `.active`; `visibility` stays `visible` for the length of the fade because the
  base transition is `visibility 0s .6s` (delayed switch). The `.active` rule overrides that with
  `visibility 0s` (immediate) plus `opacity .8s ease .2s` (delayed start), giving the asymmetric
  0.6 s out / 0.8 s in with a 0.2 s hold.
* **The map recedes** — `body.in-scene` blurs and darkens `#world` over 1.1 s and drops its pointer
  events; `.rays` dims to `.15`; the camera eases to scale 1.05.
* **Scene is skipped entirely in compact mode** — `if(isCompact()) return;` is the first line.
* **`.sc.seen::after`** puts a `✓` on the HUD button for a school whose scene has been opened
  (`content:'✓';margin-left:2px;font-size:11px;opacity:.75`, L235).

### 5.2 Curtains, titlecard, vignette, grain — the opening

Markup, L315–319:

```html
<div class="vignette"></div>
<div class="grain"></div>
<div class="curtain top"></div>
<div class="curtain bottom"></div>
<div class="titlecard">The three interpretive schools</div>
```

CSS, L34–35 and L159–177:

```css
.vignette{position:fixed;inset:0;z-index:6;pointer-events:none;background:radial-gradient(ellipse at center,transparent 52%,rgba(0,0,0,.7) 100%)}
.grain{position:fixed;inset:0;z-index:7;pointer-events:none;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")}

.curtain{position:fixed;left:0;right:0;height:51vh;background:#030302;z-index:9;pointer-events:none}
.curtain.top{top:0;transform:translateY(-101%)}
.curtain.bottom{bottom:0;transform:translateY(101%)}
.titlecard{position:fixed;inset:0;z-index:10;display:grid;place-items:center;pointer-events:none;opacity:0;font:500 15px/1 var(--mono);letter-spacing:.5em;text-transform:uppercase;color:var(--gilt);text-align:center;padding:0 24px}

.intro .curtain.top{animation:curtT 1.9s 1.2s cubic-bezier(.7,0,.2,1) both}
.intro .curtain.bottom{animation:curtB 1.9s 1.2s cubic-bezier(.7,0,.2,1) both}
.intro .titlecard{animation:titleCard 2.5s .1s both}
.intro .hdr{animation:hdrIn 1.6s var(--hd,2.1s) both}
.intro .hint{animation:fadeIn 1.2s 6.8s both}
.intro .card{animation:rise 1s var(--d) cubic-bezier(.2,.8,.2,1) both}
.intro .lk{stroke-dasharray:1;stroke-dashoffset:1;animation:draw var(--dur,1s) var(--d,0s) cubic-bezier(.55,.05,.25,1) forwards}
.intro .hud{animation:fadeUp .9s 7s both}
.intro #world .ah{animation:fadeTo .4s var(--d) both}
.intro .xl{animation:fadeIn 1s var(--d) both}
.intro .xlbl{animation:fadeIn .8s calc(var(--d) + .5s) both}
```

with

```css
@keyframes titleCard{0%{opacity:0;letter-spacing:.9em}30%{opacity:1;letter-spacing:.5em}72%{opacity:1;letter-spacing:.5em}100%{opacity:0;letter-spacing:.62em}}  /* L208 */
@keyframes curtT{from{transform:translateY(0)}to{transform:translateY(-101%)}}   /* L209 */
@keyframes curtB{from{transform:translateY(0)}to{transform:translateY(101%)}}    /* L210 */
@keyframes hdrIn{from{opacity:0;letter-spacing:.8em;filter:blur(6px)}to{opacity:1;letter-spacing:.32em;filter:blur(0)}}  /* L204 */
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}  /* L206 */
```

The two curtains are each `51vh` tall, start *offscreen* (`translateY(±101%)`) and slide **fully off**
over 1.9 s from t=1.2 s — i.e. they are a shutter closing over a black page and opening onto the map.
The titlecard sits above them at z-index 10, its letter-spacing breathing `.9em → .5em → .5em → .62em`
over 2.5 s while the curtains are still closed.

### 5.3 Scene contents and their schedule

Built by `buildScene(s)`, L492–547. The schedule generator, L496–498:

```js
/* schedule: each node lands as the line reaches it; the gap takes longer */
let t=1.15; const at=[];
s.nodes.forEach((n,k)=>{at[k]=t; const nx=s.nodes[k+1]; if(nx) t+= n.gap?2.1:(nx.ghost?.75:.62);});
const last=at[at.length-1], capD=last+1.1, pulseStart=capD+.5;
```

| Condition | Step |
| --- | --- |
| normal | `+0.62 s` |
| next node is `ghost` | `+0.75 s` |
| this node declares `gap` | `+2.10 s` |

Segments and arrowheads between nodes, L500–525:

```js
s.nodes.forEach((n,k)=>{
  const nx=s.nodes[k+1]; if(!nx) return;
  const d=(at[k]+.18).toFixed(2);
  const tipX=nx.x-(nx.final?21:15);
  const head=(o,dl)=>`<path class="ah" d="M0 0L-14 -6.5L-9.5 0L-14 6.5Z" transform="translate(${tipX} ${Y})" style="--d:${dl.toFixed(2)}s;--o:${o}"/>`;
  if(n.gap){
    svg+=`<path class="seg dash" d="M${n.x+30} ${Y}H${tipX-12}" style="--d:${(at[k]+.9).toFixed(2)}s;--o:.28"/>`;
    svg+=head(.5,at[k]+1.7);
    let x=n.x+95, gw=26;
    for(let q=0;q<9&&x<nx.x-60;q++){
      svg+=`<line class="tick" x1="${x.toFixed(0)}" y1="${Y-9}" x2="${x.toFixed(0)}" y2="${Y+9}" style="--d:${(at[k]+1+q*.12).toFixed(2)}s;--o:${(.7-q*.06).toFixed(2)}"/>`;
      x+=gw; gw*=1.17;
    }
    for(let q=0;q<7;q++){
      const mx=n.x+80+Math.random()*(nx.x-n.x-160), my=Y+(Math.random()-.5)*70;
      svg+=`<circle class="mote" cx="${mx.toFixed(0)}" cy="${my.toFixed(0)}" r="${(1+Math.random()*1.6).toFixed(1)}" style="--d:${(at[k]+1+Math.random()*2.5).toFixed(2)}s;--mx:${(10+Math.random()*30).toFixed(0)}px"/>`;
    }
    extra+=`<div class="gaplbl" style="left:${((n.x+nx.x)/2+45).toFixed(0)}px;--d:${(at[k]+1.2).toFixed(2)}s">${n.gap}</div>`;
  }else if(nx.ghost){
    svg+=`<path class="seg dash" d="M${n.x+16} ${Y}H${tipX-10}" style="--d:${d}s;--o:${n.ghost?.18:.32}"/>`;
    svg+=head(n.ghost?.25:.45,at[k]+.8);
  }else{
    svg+=`<path class="seg" pathLength="1" d="M${n.x+13} ${Y}H${tipX-9}" style="--d:${d}s"/>`;
    svg+=head(1,at[k]+.68);
  }
});
```

Three segment kinds:

| Kind | Trigger | Path | Stroke | Arrowhead | Extra |
| --- | --- | --- | --- | --- | --- |
| solid | default | `M{x+13} 520 H{tipX−9}`, `pathLength="1"` | `.seg{stroke:var(--ac);stroke-width:2;filter:drop-shadow(0 0 6px rgba(ac,.85))}` | full opacity, at `at[k]+.68` | — |
| dashed | next node is `ghost` | `M{x+16} 520 H{tipX−10}` | `.seg.dash{stroke-dasharray:2 9;stroke-linecap:round;filter:none;opacity:var(--o,.4)}`, `--o:.18` or `.32` | opacity `.25`/`.45`, at `at[k]+.8` | — |
| gap | this node declares `gap` | `M{x+30} 520 H{tipX−12}` | same dashed, `--o:.28`, at `at[k]+.9` | opacity `.5`, at `at[k]+1.7` | up to 9 accelerating ticks (`x += gw; gw *= 1.17`, first gap 26 px, spaced 0.12 s apart, opacity `.7 → .22`, stops before `nx.x−60`) + 7 random motes + a `.gaplbl` |

`tipX = nx.x − (nx.final ? 21 : 15)` — a final node's arrowhead stops 6 px shorter to clear the larger dot.

Nodes and labels, L526–530:

```js
const pl=Array.from({length:10},(_,q)=>`<circle class="pl${q?'':' h'}" cx="-80" cy="${Y}" r="${q?Math.max(1.2,5-q*.4).toFixed(1):6}" opacity="0"/>`).join('');
const nodesHtml=s.nodes.map((n,k)=>`<div class="cn${n.ghost?' ghost':''}${n.final?' final':''}" style="left:${n.x}px;top:${Y}px;--d:${at[k].toFixed(2)}s${n.ghost?';--o:.38':''}"><span class="dot"></span><div class="lbl"><b>${n.t}</b>${n.s?`<small>${n.s}</small>`:''}</div></div>`).join('');
const gi=s.nodes.findIndex(n=>n.gap), hi=s.nodes.findIndex(n=>n.ghost);
const pivot=gi>=0?gi:Math.max(0,hi-1), md=(at[pivot]+.7).toFixed(2);
const mk=s.marker?`<div class="mk" style="left:${s.marker.x}px;--d:${md}s"></div><div class="mkl" style="left:${s.marker.x}px;--d:${md}s">${s.marker.t}</div>`:'';
```

and the scene shell, L531–539:

```js
el.innerHTML=`
  <div class="sc-glow"></div>
  <div class="sc-kicker">${s.tag}</div>
  <h1 class="sc-title" aria-label="${s.name}">${[...s.name].map((c,q)=>`<span aria-hidden="true" style="--d:${(.2+q*.055).toFixed(2)}s">${c}</span>`).join('')}</h1>
  ${s.badge?`<div class="sc-badge" style="--d:.95s">${s.badge}</div>`:''}
  ${s.origin?`<div class="sc-origin" style="--d:.95s">${s.origin}</div>`:''}
  <svg class="sc-svg" viewBox="0 0 1600 900" aria-hidden="true">${svg}${pl}</svg>
  ${mk}${extra}${nodesHtml}
  <p class="sc-caption" style="--d:${capD.toFixed(2)}s">${s.caption}</p>`;
```

Scene typography, L112–141 verbatim:

```css
.sc-glow{position:absolute;left:0;right:0;bottom:-150px;height:650px;background:radial-gradient(ellipse 55% 60% at 50% 100%,rgba(var(--ac-rgb),.3),transparent 70%)}
.sc-kicker{position:absolute;left:100px;top:86px;font:500 13px/1 var(--mono);letter-spacing:.3em;text-transform:uppercase;color:var(--ac)}
.sc-title{position:absolute;left:96px;top:116px;font:600 150px/1.05 var(--serif);letter-spacing:-.01em;color:var(--cream);text-shadow:0 0 70px rgba(var(--ac-rgb),.45)}
.sc-title span{display:inline-block}
.sc-badge{position:absolute;left:100px;top:300px;display:inline-flex;gap:10px;align-items:center;padding:10px 18px;border:1px solid rgba(var(--ac-rgb),.6);border-radius:999px;background:rgba(var(--ac-rgb),.1);font:500 13px/1 var(--sans);letter-spacing:.04em;color:var(--ac);box-shadow:0 0 30px rgba(var(--ac-rgb),.2)}
.sc-origin{position:absolute;left:100px;top:304px;max-width:980px;font:400 15px/1.4 var(--sans);letter-spacing:.02em;color:var(--ash)}
.sc-svg{position:absolute;left:0;top:0;width:1600px;height:900px;overflow:visible}
.sc-svg .seg{fill:none;stroke:var(--ac);stroke-width:2;filter:drop-shadow(0 0 6px rgba(var(--ac-rgb),.85))}
.sc-svg .seg.dash{stroke-dasharray:2 9;stroke-linecap:round;filter:none;opacity:var(--o,.4)}
.sc-svg .tick{stroke:var(--ac);stroke-width:1.5;opacity:var(--o,.5)}
.sc-svg .mote{fill:var(--ac);opacity:0}
.sc-svg .pl{fill:var(--ac)}
.sc-svg .ah{opacity:var(--o,1);filter:drop-shadow(0 0 5px rgba(var(--ac-rgb),.85))}
.sc-svg .pl.h{filter:drop-shadow(0 0 9px var(--ac))}

.cn{position:absolute;width:0;height:0}
.cn .dot{position:absolute;left:-11px;top:-11px;width:22px;height:22px;border-radius:50%;background:#0a0907;border:2px solid var(--ac);box-shadow:0 0 0 5px rgba(var(--ac-rgb),.12),0 0 22px rgba(var(--ac-rgb),.8)}
.cn .lbl{position:absolute;left:-100px;top:34px;width:200px;text-align:center}
.cn .lbl b{display:block;font:600 28px/1.12 var(--serif);color:var(--cream)}
.cn .lbl small{display:block;margin-top:8px;font:400 12px/1.4 var(--sans);letter-spacing:.03em;color:var(--ac)}
.cn.final .dot{left:-17px;top:-17px;width:34px;height:34px;background:var(--ac);box-shadow:0 0 0 7px rgba(var(--ac-rgb),.16),0 0 44px rgba(var(--ac-rgb),.95)}
.cn.final .dot::after{content:'';position:absolute;inset:-7px;border-radius:50%;border:1px solid var(--ac);opacity:0}
.cn.final .lbl{top:46px}
.cn.ghost .dot{border-style:dashed;background:transparent;box-shadow:none}
.mk{position:absolute;top:372px;width:2px;height:170px;margin-left:-1px;background:linear-gradient(transparent,var(--ac) 35%,var(--ac) 80%,transparent)}
.mkl,.gaplbl{position:absolute;text-align:center}
.mkl{top:344px;width:340px;margin-left:-170px;font:500 12px/1 var(--mono);letter-spacing:.28em;text-transform:uppercase;color:var(--ac)}
.gaplbl{top:432px;width:380px;margin-left:-190px;font:italic 500 25px/1.2 var(--serif);color:var(--ash)}
.sc-caption{position:absolute;left:100px;right:100px;top:742px;text-align:center;font:italic 500 40px/1.25 var(--serif);color:var(--cream)}
.sc-caption::before{content:'';display:block;width:90px;height:1px;margin:0 auto 22px;background:var(--ac);opacity:.7}
```

Scene motion, L143–156 verbatim:

```css
/* scene motion — plays only when a scene opens */
.scene.active .sc-kicker{animation:fadeIn 1s .1s both}
.scene.active .sc-title span{animation:letterIn 1.1s var(--d) cubic-bezier(.2,.8,.2,1) both}
.scene.active .sc-badge,.scene.active .sc-origin,.scene.active .sc-caption{animation:riseSoft 1.2s var(--d) both}
.scene.active .seg{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .55s var(--d) cubic-bezier(.5,0,.3,1) forwards}
.scene.active .seg.dash{stroke-dasharray:2 9;stroke-dashoffset:0;animation:fadeTo .9s var(--d) both}
.scene.active .tick{animation:fadeTo .8s var(--d) both}
.scene.active .ah{animation:fadeTo .4s var(--d) both}
.scene.active .mote{animation:mote 4.5s var(--d) ease-out infinite}
.scene.active .cn .dot{animation:dotIn .7s var(--d) cubic-bezier(.2,.9,.2,1.2) both}
.scene.active .cn .lbl{animation:riseSoft .9s calc(var(--d) + .15s) both}
.scene.active .cn.final .dot::after{animation:ping 3s calc(var(--d) + .8s) ease-out infinite}
.scene.active .mk{animation:growY .9s var(--d) cubic-bezier(.3,.8,.2,1) both}
.scene.active .mkl,.scene.active .gaplbl{animation:riseSoft 1s calc(var(--d) + .3s) both}
```

```css
@keyframes letterIn{from{opacity:0;transform:translateY(42px) scale(1.06);filter:blur(16px)}to{opacity:1;transform:none;filter:blur(0)}}  /* L211 */
@keyframes riseSoft{from{opacity:0;transform:translateY(16px);filter:blur(6px)}to{opacity:var(--o,1);transform:none;filter:blur(0)}}     /* L212 */
@keyframes dotIn{0%{opacity:0;transform:scale(0)}60%{transform:scale(1.35)}100%{opacity:var(--o,1);transform:scale(1)}}                 /* L213 */
@keyframes growY{from{opacity:0;transform:scaleY(0)}to{opacity:.85;transform:scaleY(1)}}                                                /* L214 */
@keyframes mote{0%{opacity:0;transform:translate(0,0)}25%{opacity:.8}100%{opacity:0;transform:translate(var(--mx,20px),-18px)}}          /* L215 */
```

### 5.4 A scene on a timeline

For `SCENES[0]` (Historicism, six nodes, no gap, no ghosts), `at = [1.15, 1.77, 2.39, 3.01, 3.63, 4.25]`,
`capD = 5.35`, `pulseStart = 5.85`:

| t (s) | Visual event | Source |
| --- | --- | --- |
| 0.00 | click; outgoing scene fades out over 0.6 s; `#world` begins a 1.1 s blur/darken; `.rays` → `.15`; camera eases to 1.05 | `closeScene`/`openScene`, L40, L46, L569 |
| 0.20 | scene layer fades up over 0.8 s (`.active` transition) | L110–111 |
| 0.10 | kicker (`sc.tag`) fades in, 1 s | L144 |
| 0.20 → 0.75 | title letters rise, one every 0.055 s (11 letters for "Historicism"), each 1.1 s long, 42 px up + 6 % scale + 16 px blur | L145, L534 |
| 0.95 | badge *or* origin line rises (1.2 s, 16 px + 6 px blur) | L146, L535–536 |
| 1.15 | node 1 dot pops (0.7 s, overshoot to 1.35) and its label rises 0.15 s later | L152–153 |
| 1.33 | segment 1 draws from `x+13` to `tipX−9` over 0.55 s | L147, L502 |
| 1.83 | arrowhead 1 fades in (0.4 s) | L150, L504 |
| 1.77 | node 2 dot, label at 1.92 | `at[1]=1.77` |
| … | each node +0.62 s | L497 |
| 4.25 | final node: 34 px dot, filled, 44 px glow | L132 |
| 5.05 | final node's ping ring starts, 3 s, infinite | L154 |
| 5.35 | caption rises (1.2 s) with a 90 × 1 px gold rule above it | L146, L140–141 |
| 5.85 | travelling light begins: 10 circles, period 5 s, 0.011 phase offset each, head circle brightest | L526, §5.6 |
| 10.85 | travelling light loops | L783 |

For a `gap` scene the schedule stretches: `s2-4`-style gaps cost `+2.10 s` instead of `+0.62 s`, the
segment becomes dashed with 9 accelerating ticks and 7 motes, and a `.gaplbl` rises 0.3 s after the
marker.

### 5.5 The marker and the `.cn` dot geometry

* `.cn{position:absolute;width:0;height:0}` with `left:<x>px; top:520px` — a zero-size anchor; the dot is
  positioned `-11px/-11px` (or `-17px/-17px` when `.final`) so it is centred on the point, and the label
  is `left:-100px; top:34px; width:200px; text-align:center` (or `top:46px` when `.final`).
* `.ghost` nodes: dashed border, transparent fill, no glow, label opacity `.38` (via `--o:.38`), and the
  *incoming* segment is dashed too.
* `.marker` (preterism: `{x:700,t:'Locked in antiquity'}`, futurism: `{x:848,t:'Truncated at Rome'}`)
  draws a `.mk` — a 2 px × 170 px vertical gradient bar from y=372 to y=542 — plus `.mkl` at y=344.
  Its delay pivots on the gap node if there is one, else on `ghostIndex − 1`, at `at[pivot] + 0.7 s`.

### 5.6 The travelling light inside a scene

L781–791:

```js
const S=scenes[cur], t=(now-S.t0)/1000-S.pulseStart;
if(t<0) return;
const f=(t/5)%1, n=S.pl.length;
S.pl.forEach((c,k)=>{
  const ff=f-k*.011;
  if(ff<0){c.setAttribute('opacity',0);return;}
  const o=interp(S.keyp,ff)*(1-k/n)*Math.min(1,ff*14)*Math.min(1,(1-ff)*10);
  c.setAttribute('cx',(S.x0+ff*(S.x1-S.x0)).toFixed(1));
  c.setAttribute('opacity',o.toFixed(3));
});
```

with the brightness profile, L541–546:

```js
function interp(k,f){
  for(let i=1;i<k.length;i++){
    if(f<=k[i][0]){const a=k[i-1],b=k[i];return a[1]+(b[1]-a[1])*((f-a[0])/((b[0]-a[0])||1));}
  }
  return k[k.length-1][1];
}
…
const x0=s.nodes[0].x, x1=s.nodes[s.nodes.length-1].x, fr=x=>(x-x0)/(x1-x0);
let keyp=[[0,1],[1,1]];
if(s.id==='preterism'){const f=fr(s.nodes[1].x); keyp=[[0,1],[f,1],[f+.22,0],[1,0]];}
if(s.id==='futurism'){const a=fr(s.nodes[3].x), b=fr(s.nodes[4].x); keyp=[[0,1],[a,1],[a+.04,.04],[b-.05,.04],[b,1],[1,1]];}
```

The `keyp` array is the pedagogical payload of the whole film:

| School | Profile | Reads as |
| --- | --- | --- |
| historicism | `[[0,1],[1,1]]` | one unbroken chain, full brightness end to end |
| preterism | full to node 2, then 0 after `f+0.22` | the line **fades out** after pagan Rome |
| futurism | full to Rome, drops to `.04` across the gap, full again at the final 3½ years | the line **breaks** and **resumes** |

Ten `.pl` circles form a comet: each is 0.011 of the path behind the last, opacity tapers as `(1−k/n)`,
and the ramp factors `min(1, ff*14)` and `min(1, (1−ff)*10)` fade the tail in and out at the ends.
Circle radii: head 6 px, then `max(1.2, 5 − q*0.4)`.

### 5.7 Exit

`closeScene()` → `.active` removed → opacity 1 → 0 over 0.6 s; `visibility` flips at 0.6 s; `#world`
un-blurs and regains pointer events over 1.1 s; `cam.ts` returns to 1. `#sheet` and the tour both call
`stopTour()` first, so a scene never closes underneath a running tour.

---

## 6. The HUD

### 6.1 Markup

L321–341 verbatim:

```html
<div id="hudwrap">
  <nav class="hud" aria-label="Mindmap controls">
    <button id="bTour" type="button" aria-pressed="false" title="Play tour (Space)">
      <svg class="i i-play" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg>
      <svg class="i i-stop" viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="2.5" width="7" height="7" rx="1"/></svg>
      <span class="lbl-play">Play tour</span><span class="lbl-stop">Stop tour</span>
    </button>
    <span class="sep"></span>
    <button class="sc" type="button" data-i="0" data-b="historicism" title="Historicism (1)">Historicism</button>
    <button class="sc" type="button" data-i="1" data-b="preterism" title="Preterism (2)">Preterism</button>
    <button class="sc" type="button" data-i="2" data-b="futurism" title="Futurism (3)">Futurism</button>
    <button id="bMap" type="button" class="on" title="Overview (Esc)">Overview</button>
    <span class="sep"></span>
    <button class="study" type="button" data-sh="learn" title="Learn (L)">Learn</button>
    <button class="study" type="button" data-sh="compare" title="Compare (C)">Compare</button>
    <button class="study" type="button" data-sh="quiz" title="Test yourself (Q)">Quiz</button>
    <span class="sep"></span>
    <button id="bReplay" type="button" aria-label="Replay opening" title="Replay opening (R)"><svg class="i ln" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.4 7a4.6 4.6 0 1 0 1.5-3.4M2.2 1.6v3.2h3.2"/></svg></button>
    <button id="bFs" type="button" aria-label="Fullscreen" title="Fullscreen (F)"><svg class="i ln" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg></button>
  </nav>
</div>
```

### 6.2 Every control

| # | Control | `id`/class | Action | Shortcut | `title` / `aria` |
| --- | --- | --- | --- | --- | --- |
| 1 | Play / Stop tour | `#bTour` | `tour ? stopTour() : startTour()` | `Space` (when focus is not on a `button` or `[role=button]`) | `title="Play tour (Space)"`, `aria-pressed="false"→"true"` |
| 2 | Historicism | `.sc[data-i="0"][data-b="historicism"]` | `openScene(0)` | `1` | `title="Historicism (1)"` |
| 3 | Preterism | `.sc[data-i="1"][data-b="preterism"]` | `openScene(1)` | `2` | `title="Preterism (2)"` |
| 4 | Futurism | `.sc[data-i="2"][data-b="futurism"]` | `openScene(2)` | `3` | `title="Futurism (3)"` |
| 5 | Overview | `#bMap` | `closeScene()` | `Esc` or `0` | `title="Overview (Esc)"`; ships with class `on` |
| 6 | Learn | `.study[data-sh="learn"]` | `openSheet('learn')` | `L` | `title="Learn (L)"` |
| 7 | Compare | `.study[data-sh="compare"]` | `openSheet('compare')` | `C` | `title="Compare (C)"` |
| 8 | Quiz | `.study[data-sh="quiz"]` | `openSheet('quiz')` | `Q` | `title="Test yourself (Q)"` |
| 9 | Replay opening | `#bReplay` | `replay()` | `R` | `aria-label="Replay opening"`, `title="Replay opening (R)"` |
| 10 | Fullscreen | `#bFs` | `toggleFs()` | `F` | `aria-label="Fullscreen"`, `title="Fullscreen (F)"` |

Two more shortcuts exist with no button: `ArrowRight` → `openScene(inScene ? (cur+1)%3 : 0)` and
`ArrowLeft` → `openScene(inScene ? (cur+2)%3 : 2)`.

Global handler, L705–719 verbatim:

```js
addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(sheet.classList.contains('open')){ if(e.key==='Escape') closeSheet(); return; }
  const k=e.key, onBtn=!!e.target.closest('button,[role="button"]');
  if(k==='1'||k==='2'||k==='3') openScene(+k-1);
  else if(k==='Escape'||k==='0') closeScene();
  else if(k==='ArrowRight') openScene(inScene?(cur+1)%3:0);
  else if(k==='ArrowLeft') openScene(inScene?(cur+2)%3:2);
  else if(k===' '&&!onBtn){e.preventDefault(); tour?stopTour():startTour();}
  else if(k==='f'||k==='F') toggleFs();
  else if(k==='l'||k==='L') openSheet('learn');
  else if(k==='c'||k==='C') openSheet('compare');
  else if(k==='q'||k==='Q') openSheet('quiz');
  else if(k==='r'||k==='R') replay();
});
```

Notes: shortcuts are suppressed while the study sheet is open, but *not* while focus is in a text field.
`onBtn` guards only `Space` — `1/2/3` fire even when a HUD button has focus.

### 6.3 Styles and `on` state

L180–194 verbatim:

```css
#hudwrap{position:fixed;left:0;right:0;bottom:20px;z-index:11;display:flex;justify-content:center;pointer-events:none;transition:opacity .7s ease}
.idle #hudwrap{opacity:0}
.hud{pointer-events:auto;display:flex;align-items:center;gap:4px;padding:6px;border-radius:999px;background:rgba(14,12,9,.78);border:1px solid rgba(220,178,87,.26);box-shadow:0 10px 40px rgba(0,0,0,.55)}
.hud button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:999px;font:500 13px/1 var(--sans);color:var(--ash);transition:background .25s,color .25s}
.hud button:hover{background:rgba(255,255,255,.07);color:var(--cream)}
.hud button:focus-visible{outline:1px solid var(--gilt);outline-offset:1px}
.hud button.on{background:rgba(var(--ac-rgb,220,178,87),.18);color:var(--ac,var(--gilt))}
.hud .sep{width:1px;height:18px;margin:0 4px;background:rgba(255,255,255,.14)}
.hud .i{width:11px;height:11px;fill:currentColor;flex:none}
.hud .i.ln{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.i-stop,.lbl-stop{display:none}
.touring .i-play,.touring .lbl-play{display:none}
.touring .i-stop{display:inline}
.touring .lbl-stop{display:inline}
.touring #bTour{color:var(--gilt)}
```

| State | Visual |
| --- | --- |
| base button | `all:unset`, transparent, `--ash` text, 9 px/15 px padding, pill radius |
| `:hover` | `rgba(255,255,255,.07)` ground, `--cream` text |
| `:focus-visible` | 1 px `--gilt` outline, offset 1 px |
| `.on` | `rgba(var(--ac-rgb,220,178,87),.18)` ground and `--ac` text — the *school's* colour, because `.sc` buttons carry `data-b`; the fallback gold covers `#bMap`, which has no `data-b` |
| `body.touring` | swaps play icon+label for stop icon+label and tints `#bTour` gold |
| `.sc.seen` | appends a `✓` (`::after`) to a school button whose scene has been opened at least once |
| `.study` | permanently `color:var(--gilt)` (L234) — marks the study-guide group |

Pressed-state logic, L555–559:

```js
function updateHud(){
  $$('.sc').forEach((b,i)=>b.classList.toggle('on',inScene&&cur===i));
  $('#bMap').classList.toggle('on',!inScene);
  $('#bTour').setAttribute('aria-pressed',String(!!tour));
}
```

So exactly one of {three school buttons, Overview} carries `.on` at any time.

Responsive HUD: `@media (max-width:1100px){.hud button{padding:9px 10px}}` (L274), and in compact mode
`.compact #hudwrap{display:flex}`, `.compact .hud{flex-wrap:wrap;justify-content:center}`,
`.compact .hud>:not(.study){display:none}` (tour, schools, overview, replay, fullscreen all hidden;
Learn/Compare/Quiz remain), `.compact .idle #hudwrap{opacity:1}` (L270–273).

---

## 7. Auto-play, idle, and attract behaviour

### 7.1 The tour

```js
function stopTour(){                                    // L579–582
  if(tour) clearTimeout(tour);
  tour=null; body.classList.remove('touring'); updateHud();
}
function startTour(){                                   // L583–595
  if(isCompact()) return;
  stopTour(); closeScene(true);
  const seq=[[null,2200],[0,10000],[1,10000],[2,11000],[null,0]];
  let i=0; body.classList.add('touring');
  const step=()=>{
    const [s,ms]=seq[i++];
    if(s===null) closeScene(true); else openScene(s,true);
    if(i>=seq.length){stopTour();return;}
    tour=setTimeout(step,ms); updateHud();
  };
  step();
}
```

| Order | Action | Dwell |
| --- | --- | --- |
| 1 | `closeScene(true)` — the overview, only 2.2 s | 2 200 ms |
| 2 | `openScene(0, true)` — Historicism | 10 000 ms |
| 3 | `openScene(1, true)` — Preterism | 10 000 ms |
| 4 | `openScene(2, true)` — Futurism | 11 000 ms |
| 5 | `closeScene(true)` — back to the overview | — (sequence ends, `stopTour()`) |

Total ≈ 33.2 s. `startTour()` begins by calling `closeScene(true)` so the overview state is the first
beat. `openScene(s, true)` passes `auto=true`, which is the *only* reason a scene change does not kill
the tour.

### 7.2 What stops it

`stopTour()` is called from exactly five places:

| Call site | Trigger |
| --- | --- |
| `openScene(i)` with `auto` falsy (L562) | a click, `Enter`/`Space`, `1`/`2`/`3`, or an arrow key opening a scene |
| `closeScene()` with `auto` falsy (L573) | `Esc`/`0`, the Overview button, or a click on `#bMap` |
| `#bTour` click (L701) | the button itself |
| `replay()` (L597) | `R` |
| `openSheet(t)` (L658) | Learn / Compare / Quiz |

Manual input **does** stop it, but only the listed inputs. Deliberately *not* stopping:
`pointermove` (parallax), hover on a node (`#world[data-focus]`), window resize, or scrolling.
Scene changes are guarded so the tour's own steps do not stop it.

The tour does not run in compact mode (`if(isCompact()) return;`), and `startTour()` is not called on
load — the tour is user-initiated only.

### 7.3 Idle behaviour

```js
/* idle: fade the controls and cursor out */                                  // L721–729
let idleT;
function wake(){body.classList.remove('idle'); clearTimeout(idleT); idleT=setTimeout(()=>body.classList.add('idle'),3800);}
['pointermove','pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,wake,{passive:true}));
wake();
```

| Time | Effect |
| --- | --- |
| any of pointermove / pointerdown / keydown / touchstart | `body.idle` removed, 3 800 ms timer restarts |
| 3 800 ms without input | `body.idle` added |
| `body.idle` | `body.idle{cursor:none}` (L21) and `.idle #hudwrap{opacity:0}` (L181) over 0.7 s |

There is **no attract loop** — nothing replays, nothing cycles, the tour is not self-starting, and the
only thing that changes on idle is the cursor and the HUD's opacity. The ambient motion
(`.rays` 160 s spin, `.orbit` 70 s spin, `ping` 6 s rings, `corePulse` 5 s, dust canvas, link pulses)
runs unconditionally.

---

## 8. Responsive, performance, accessibility

### 8.1 Responsive

The single breakpoint is a *media query object*, L354:

```js
const compactMQ=matchMedia('(max-width: 860px), (max-aspect-ratio: 1/1)');
const isCompact=()=>compactMQ.matches;
```

so "compact" means **narrower than 861 px OR taller than it is wide**. `fit()` toggles
`html.compact` (L733), and the compact rules, L217–232, are a different design rather than a scaled one:

```css
/* ───────── small / portrait screens: a simple outline version ───────── */
.compact #viewport{position:relative;inset:auto;overflow:visible}
.compact #stage{position:relative;width:100%;height:auto;transform:none!important;padding:64px 18px 64px}
.compact #world{position:relative;inset:auto;transform:none!important;filter:none!important}
.compact #links,.compact .rays,.compact #scenes,.compact .hint,.compact .enter{display:none}
.compact .hdr{position:relative;left:auto;top:auto;margin-bottom:38px;font-size:11px;letter-spacing:.24em}
.compact .node{position:relative;left:auto!important;top:auto!important;transform:none;margin-bottom:12px}
.compact .center{margin:0 auto 48px}
.compact .branch{display:block;margin:0 0 40px;padding-left:16px;border-left:1px solid rgba(var(--ac-rgb),.45)}
.compact .head .card,.compact .leaf .card{width:100%}
.branch{display:contents}
.compact .branch{display:block}
```

What compact mode sheds: the SVG link layer, the rays, **all scenes**, the hint line, the "Open scene"
affordance, the camera transform, the canvas dust is still drawn but the parallax is off, and the tour
is disabled. What it keeps: every word, as a linear outline grouped by school with a coloured left rule.

Additional queries: `@media (max-width:1100px){.hud button{padding:9px 10px}}` (L274).
There is no `max-width: 360px`-class query in the source; the compact mode covers everything below 861 px.

### 8.2 Reduced motion

```js
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;   // L353
if(reduce) body.classList.remove('intro');                             // L356
```

```css
@media (prefers-reduced-motion:reduce){                                /* L230–232 */
  *,*::before,*::after{animation:none!important;transition-duration:.01ms!important}
}
```

```js
const gain=reduce?.6:Math.max(0,Math.min(1,(now-t0)/3500));            // L763
if(!reduce){ p.x+=p.vx*dt*p.z; p.y+=p.vy*dt*p.z; … }                   // L765–768
…
if(!reduce) requestAnimationFrame(frame);                              // L823
```

Three separate mechanisms, all keyed off the same flag:

1. **CSS** — every animation is disabled globally and transitions collapse to 0.01 ms.
2. **Entrance** — `body.intro` is never applied, so nothing animates in; the map simply *is*.
3. **JS** — the rAF loop is never started, so the camera, the dust motion, and the travelling pulses
   are all frozen. The dust still renders once (at 60 % gain, static), because `resizeDust()` calls
   `drawDust(0,0)` directly (L759).

**A defect to fix in the port.** `.scene.active .seg{stroke-dasharray:1;stroke-dashoffset:1;animation:draw … forwards}`
sets the hidden state as a *static property* and relies on the animation to reveal it. Under
`animation:none!important` the solid scene segments stay at `stroke-dashoffset:1` with
`pathLength="1"` — i.e. a full-length dash pushed entirely off the path. The chain lines in every scene
are therefore invisible to a reduced-motion user. L210 in the source target's own CSS already solves
this pattern correctly (`.chain-node,…{opacity:1!important;transform:none!important;animation:none!important}`);
the mindmap must do the same for `.seg` (`stroke-dasharray:none;stroke-dashoffset:0`).

### 8.3 What animates where

| Technology | Used for | Notes |
| --- | --- | --- |
| CSS keyframes + transitions | everything structural: node entrance, link draw-on, arrowhead fade, rings, core pulse, orbit spin, rays, scene children, HUD, curtains, titlecard | ~25 keyframes, no library |
| Inline SVG (JS-generated) | link paths, arrowheads, scene segments/ticks/motes/pulse circles | geometry from JS, animation from CSS |
| Canvas 2D | `#dust` — the gold dust | the *only* canvas on the page |
| JS per-frame transform | camera parallax, travelling pulses, dust integration | driven by one `requestAnimationFrame` loop |
| WebGL / libraries | **none** | no `<script src>` dependency, no three.js, no GSAP |

The single loop, L804–817:

```js
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  const k=Math.min(1,dt*3);
  cam.x+=(cam.tx-cam.x)*k; cam.y+=(cam.ty-cam.y)*k; cam.s+=(cam.ts-cam.s)*Math.min(1,dt*2);
  if(!isCompact()){
    world.style.transform=`translate3d(${cam.x.toFixed(2)}px,${cam.y.toFixed(2)}px,0) scale(${cam.s.toFixed(4)})`;
    scenesEl.style.transform=`translate3d(${(-cam.x*.6).toFixed(2)}px,${(-cam.y*.6).toFixed(2)}px,0)`;
  }
  drawDust(dt,now);
  updatePulses(now);
  requestAnimationFrame(frame);
}
```

The loop runs for the life of the page, whether or not anything is visible, whether or not anything is
moving, and whether or not a scene is open. There is no `IntersectionObserver`, no
`document.hidden` guard, and no teardown. Everything it writes is a `transform` (composited) except
`drawDust` (a full-canvas `clearRect` + up to 150 `drawImage` calls per frame) and the pulse positions.

Dust budget, L749–760:

```js
return{x:Math.random()*DW,y:rand?Math.random()*DH:DH+20,z:.25+Math.random()*.75,r:1.2+Math.random()*3.2,
  vx:(Math.random()-.5)*6,vy:-(4+Math.random()*10),ph:Math.random()*6.28,ts:.4+Math.random()*1.2};
…
const dpr=Math.min(devicePixelRatio||1,2);
DW=innerWidth; DH=innerHeight;
cv.width=DW*dpr; cv.height=DH*dpr; cv.style.width=DW+'px'; cv.style.height=DH+'px';
cx.setTransform(dpr,0,0,dpr,0,0);
dust=Array.from({length:Math.round(Math.min(150,DW*DH/14000))},()=>mkDust(true));
```

DPR is capped at 2; particles are `min(150, w·h/14000)` (≈ 103 at 1440×1000, ≈ 150 at 1920×1080 and
above), each a pre-rendered 64 px radial-gradient sprite drawn with `drawImage` and `globalAlpha`.

Other performance facts worth restating for the port:

* `.pin` halos and `.ah` arrowheads use CSS `filter:drop-shadow()`. On a stage scaled down to a 700 px
  column these are cheap in absolute pixels, but they force rasterisation on every transform change,
  so they must be dropped in the compact path (as the source does for `.seg.dash`).
* `getPointAtLength()` is called per pulse per frame (12 on the map); `getTotalLength()` is cached in
  `p.len` on first success and swallowed in a `try/catch`.
* `void scenesEl.offsetWidth` forces one synchronous layout per scene open — deliberate, and the only
  forced reflow in the file.
* `layoutCross()` reads `offsetHeight` from two nodes and writes geometry; it runs only from `fit()`
  and `fonts.ready`, never per frame.

### 8.4 ARIA and semantics

| Element | Accessibility |
| --- | --- |
| `#links` | `aria-hidden="true"` — the whole link layer is decorative |
| `#dust` | `aria-hidden="true"` on the `<canvas>` |
| `.orbit` | `aria-hidden="true"` |
| `.scene` | `aria-hidden="true"` in HTML; set to `"false"` by `openScene`, back to `"true"` by `closeScene` |
| `#scenes` (their SVG) | each scene's `.sc-svg` also `aria-hidden="true"` |
| `.sc-title` | `aria-label="<school name>"` on the `<h1>`, with every per-letter `<span aria-hidden="true">` |
| `.head .card` | `role="button" tabindex="0" aria-label="Open the <name> scene"`, `Enter`/`Space` handled |
| `nav.hud` | `aria-label="Mindmap controls"`; `.hud button` are real `<button type="button">` |
| `#bTour` | `aria-pressed` mirrors `!!tour` |
| icon-only buttons | `aria-label="Replay opening"` / `aria-label="Fullscreen"`; the decorative SVGs are `aria-hidden` |
| `#sheet` | `role="dialog" aria-modal="true" aria-label="Study guide" aria-hidden` toggled; focus moves to Close and returns to the opener |
| focus rings | `.hud button:focus-visible{outline:1px solid var(--gilt);outline-offset:1px}`; `.head .card:focus-visible` gets the hover treatment plus `outline:none` |

Gaps to close in the port (not copied behaviour):

* No focus management when a scene opens: the scene is `aria-hidden="false"` but nothing is focusable
  inside it and focus stays on the node that opened it.
* No live region announces a scene change; the travelling-light narrative in `keyp` is purely visual.
* `.head .card` is a `div[role=button]`, not a `<button>`; `.leaf .card` is not focusable at all even
  though a leaf click opens a scene.
* Keyboard shortcuts are document-global and are only suppressed while `#sheet` is open.
* The cross-link labels (`.xlbl`) live in a `pointer-events:none` world and are not announced.

### 8.5 Keyboard and pointer support

| Input | Supported |
| --- | --- |
| pointer hover (mouse only, `e.pointerType==='mouse'`) | dims the other schools |
| pointer click on any node | opens that school's scene |
| touch | no hover of any kind; a tap fires `click` and opens the scene directly |
| `Tab` | reaches `.head .card`s and all HUD buttons; leaves and centre are skipped |
| `Enter` / `Space` | opens a scene from a focused head card |
| `Space` (elsewhere) | play/stop tour |
| `1` `2` `3` | open a school |
| `Esc` `0` | overview |
| `←` `→` | cycle scenes (wrapping) |
| `L` `C` `Q` | study sheet tabs |
| `R` | replay the opening |
| `F` | fullscreen |
| pinch/zoom, drag, scroll | not handled; the stage is `overflow:hidden` and fixed |

---

## 9. The data shape

### 9.1 What the source actually holds

The prototype has no data file: the model is two literal arrays plus one index map, L359–389. Read as a
schema, a **school** is a record with a display identity, a placement, an ordered list of leaf
statements, and an optional film. A **cross-link** is an unnamed pair of school ids plus a label.

`MAP` (the map): `L359–372`

```js
const MAP=[
 {id:'historicism',tag:'Continuous',name:'Historicism',side:'L',y:450,hero:true,leaves:[
   'The reading this course defends.',
   'Babylon → Medo-Persia → Greece → Rome → Divided Europe, <span class="term">the historicist reading</span> → Christ’s kingdom.',
   'One unbroken chain running in real time.']},
 {id:'preterism',tag:'Locked in antiquity',name:'Preterism',side:'R',y:225,up:true,leaves:[
   '<b class="lead">History:</b> Counter-Reformation: Luis de Alcázar, 1614, posthumous publication date.',
   '<b class="lead">Apocalypse commentary:</b> Jerusalem’s desolation (chapters 1–11), then pagan Rome’s overthrow.',
   'Leaves no medieval or modern chain.']},
 {id:'futurism',tag:'Truncated at Rome',name:'Futurism',side:'R',y:675,leaves:[
   '<b class="lead">History:</b> Counter-Reformation: Francisco Ribera, written about A.D. 1580, published 1590.',
   'Babylon → Medo-Persia → Greece → Imperial Rome, then the great gap of the spreading centuries.',
   'Resumes for a final three and a half years and an end-times antichrist.']}
];
```

`SCENES` (the films): `L373–388`

```js
const SCENES=[
 {id:'historicism',tag:'Continuous',name:'Historicism',
  badge:'The reading this course defends',
  caption:'One unbroken chain running in real time.',
  nodes:[{t:'Babylon',s:'Gold head · Lion',x:170},{t:'Medo-Persia',s:'Silver · Bear',x:422},{t:'Greece',s:'Bronze · Leopard',x:674},{t:'Rome',s:'Iron · Fourth beast',x:926},{t:'Divided Europe',s:'Iron and clay · Ten horns',x:1178},{t:'Christ’s kingdom',s:'The stone · Dan 2:44; 7:27',x:1430,final:true}]},
 {id:'preterism',tag:'Locked in antiquity',name:'Preterism',
  origin:'Counter-Reformation · Luis de Alcázar · 1614, posthumous publication date',
  caption:'Leaves no medieval or modern chain.',
  marker:{x:700,t:'Locked in antiquity'},
  nodes:[{t:'Jerusalem’s desolation',s:'Apocalypse, chapters 1–11',x:250},{t:'Pagan Rome’s overthrow',x:550},{t:'Medieval',x:850,ghost:true},{t:'Modern',x:1150,ghost:true}]},
 {id:'futurism',tag:'Truncated at Rome',name:'Futurism',
  origin:'Counter-Reformation · Francisco Ribera · about A.D. 1580',
  caption:'Resumes for a final three and a half years and an end-times antichrist.',
  marker:{x:848,t:'Truncated at Rome'},
  nodes:[{t:'Babylon',s:'Gold head · Lion',x:170},{t:'Medo-Persia',s:'Silver · Bear',x:376},{t:'Greece',s:'Bronze · Leopard',x:582},{t:'Imperial Rome',s:'Iron · Fourth beast',x:788,gap:'the great gap of the spreading centuries'},{t:'Final 3½ years',s:'Dan 7:25 · Rev 13:5',x:1243},{t:'End-times antichrist',s:'Rev 13 · 2 Thess 2',x:1437,final:true}]}
];
const IDX={historicism:0,preterism:1,futurism:2};
```

Cross-links are *not* data: they are two hard-coded groups with hard-coded labels (`L465–466`), and the
geometry is computed from measured node heights in `layoutCross()`. Their semantic content is:

| id | from → to | label | route |
| --- | --- | --- | --- |
| `xa` | `preterism` ↔ `futurism` | `Same origin: Counter-Reformation` | vertical, at `x = lxR = 1415` |
| `xb` | `historicism` ↔ `futurism` | `Same chain up to Rome, then Futurism breaks it` | Bézier curving 160 px below the head line |

### 9.2 Field reference

**School (map record)**

| Field | Type | Required | Meaning | Consumed by |
| --- | --- | --- | --- | --- |
| `id` | string slug | yes | also the `data-b` value and the accent-token key | `IDX`, `[data-b]`, `#gl-${id}` |
| `tag` | string | yes | `.tag` kicker; the school's self-description | `.tag`, scene kicker |
| `name` | string | yes | `<h2>` and the scene title | `.head h2`, `.sc-title` |
| `side` | `"L"` \| `"R"` | yes | which side of the centre; picks `hxL`/`hxR`, `lxL`/`lxR`, and leaf `step` 150/136 | build loop |
| `y` | number | yes | world y of the head node | build loop |
| `hero` | boolean | no | adds `.hero` — the course's own reading | `.hero .card` |
| `up` | boolean | no | reverses the leaf fan so a top cluster reads outward | leaf `ly` |
| `leaves` | string[] (HTML) | yes | one leaf card per entry | `.leaf .card > p` |
| `scene` | object | no | the film for this school | `buildScene` |

**Scene record**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | slug | yes | must equal the school's `id`; keys the `keyp` profile |
| `tag` | string | yes | `.sc-kicker`, top-left |
| `name` | string | yes | `.sc-title`, split into letters |
| `badge` | string | one of | gold pill at (100, 300) |
| `origin` | string | one of | ash line at (100, 304) |
| `caption` | string | yes | `.sc-caption` at y=742, with a 90 px rule above |
| `marker` | `{x:number, t:string}` | no | the `.mk` bar + `.mkl` label |
| `nodes` | `ChainNode[]` | yes | the horizontal chain at `y = 520` |

**Chain node**

| Field | Type | Meaning |
| --- | --- | --- |
| `t` | string | `.lbl b` — the node title |
| `s` | string | `.lbl small` — the sub-line (metal/beast/verse) |
| `x` | number | world x on the chain |
| `ghost` | boolean | dashed dot, low opacity, dashed incoming segment |
| `final` | boolean | 34 px filled dot, ping ring, shorter arrow stub |
| `gap` | string | label text; turns this node's outgoing segment into the dashed gap with ticks and motes, and costs +2.1 s |

### 9.3 One school as clean JSON

Reverse-engineered from the three records above, with the cross-links folded in as first-class data (the
one thing the prototype hard-codes but a spec must declare). Historicism, complete:

```json
{
  "id": "historicism",
  "tag": "Continuous",
  "name": "Historicism",
  "side": "L",
  "y": 450,
  "hero": true,
  "leaves": [
    "The reading this course defends.",
    "Babylon → Medo-Persia → Greece → Rome → Divided Europe, the historicist reading → Christ’s kingdom.",
    "One unbroken chain running in real time."
  ],
  "scene": {
    "id": "historicism",
    "tag": "Continuous",
    "name": "Historicism",
    "badge": "The reading this course defends",
    "caption": "One unbroken chain running in real time.",
    "brightness": [[0, 1], [1, 1]],
    "nodes": [
      { "t": "Babylon",         "s": "Gold head · Lion",              "x": 170 },
      { "t": "Medo-Persia",     "s": "Silver · Bear",                 "x": 422 },
      { "t": "Greece",          "s": "Bronze · Leopard",              "x": 674 },
      { "t": "Rome",            "s": "Iron · Fourth beast",           "x": 926 },
      { "t": "Divided Europe",  "s": "Iron and clay · Ten horns",     "x": 1178 },
      { "t": "Christ’s kingdom","s": "The stone · Dan 2:44; 7:27",    "x": 1430, "final": true }
    ]
  },
  "links": [
    { "to": "preterism", "label": "Same origin: Counter-Reformation", "route": "vertical" },
    { "to": "futurism",  "label": "Same chain up to Rome, then Futurism breaks it", "route": "under-centre" }
  ]
}
```

Two notes on this shape:

* `brightness` is the serialised `keyp`. In the prototype it is *derived* by school id inside
  `buildScene` (L543–545); a spec must either declare it (as here) or keep the same derivation, because
  it is the one field that encodes the whole argument of the film.
* `links[].route` replaces the hard-coded `xa`/`xb` geometry: `"vertical"` = straight `V` between two
  vertically-stacked leaves; `"under-centre"` = Bézier dipping 160 px below the head line.

### 9.4 How that projects onto a target flow spec

The target's flow spec is `{ title, steps: [{ role, title, text, points[], cite }] }`. The projection is
a **re-labelling, not a re-modelling** — every source field already has a home:

| Source | Target flow spec field | Notes |
| --- | --- | --- |
| `spec.title` | `spec.title` | unchanged; already the `figcaption` |
| `MAP[].id` | `steps[].id` | **new**; also the `--ac` key |
| `MAP[].tag` | `steps[].role` | identical meaning: the mono kicker |
| `MAP[].name` | `steps[].title` | identical meaning: the display name |
| `MAP[].side`,`y`,`hero`,`up` | `steps[].side`,`y`,`hero`,`up` | **new**, placement only |
| `MAP[].leaves[]` | `steps[].points[]` | identical meaning: the ordered leaves |
| leaf with emphasis | `points[]` entry as object | **new** optional form (see §12) |
| `SCENES[].badge/origin/caption/marker/nodes` | `steps[].scene` | **new** |
| `cross-links` | `spec.links[]` | **new**, replacing two hard-coded labels |
| `spec.note` | `spec.note` | unchanged |
| `spec.centre` | `spec.centre` | **new**; the centre node's two lines + hint |

The existing five flow specs stay valid under this mapping with **no edits**: each is a 2–5 step list of
`{role, title, text, points[]}`. Rendered as a mindmap with `side` derived from the index
(split the list left/right around the middle), `y` derived from the index (spread across `P.cy ± step`),
and no `scene`/`links`, the outcome is a mindmap with N school heads, each carrying its leaves — which is
exactly the prototype's structure with the film layer omitted.

---

## 10. Porting constraints

Each row is a concrete collision between the prototype's assumptions and the target's, with the
resolution that keeps both.

| # | Collision | Evidence | Resolution that keeps both |
| --- | --- | --- | --- |
| **C1** | The prototype *is* the page: `#viewport{position:fixed;inset:0;z-index:2;overflow:hidden}` + `html,body{overflow:hidden}`. The target is a scrolling lesson. | SOURCE L19, L37; target `.sitting-layout{max-width:52rem}` at `study.html` L4547–4559 | Keep `W=1600,H=900`, `#stage{width:1600px;height:900px;transform-origin:0 0}` and the identical scale formula, but measure the **block**: `const r = host.getBoundingClientRect(); const s = Math.min(r.width/W, r.height/H);`. Host is `position:relative; overflow:hidden; contain:paint` with `aspect-ratio:16/9` capped by `max-height:min(70vh, 620px)`. Never read `innerWidth`/`innerHeight`. |
| **C2** | `body.idle{cursor:none}` and `overflow:hidden` are page-level. | SOURCE L19–21 | Drop both. Keep the HUD-fade idea but scope it: `.mm.is-idle .mm-hud{opacity:0}` on a 3 800 ms timer owned by the block. |
| **C3** | Vignette (z-index 6), grain (z-index 7), curtains (z-index 9), titlecard (z-index 10), HUD wrap (z-index 11) are all `position:fixed` full-viewport. Copying them would black out the lesson above and below the diagram. | SOURCE L34–35, L159–162, L180 | Re-parent all five inside the block as `position:absolute` and re-base the z-index scale to a local stacking context (`isolate` on the host). **Keep** vignette + grain (they are the film look, and they are innocent at block scale). **Drop** the two 51vh curtains and the full-screen titlecard; if the wipe is wanted, run a single `.mm-curtain` pair that only ever covers the block, on first `is-visible`, once per sitting. |
| **C4** | Four themes. The prototype assumes a permanently dark page and reads `--cream`/`--ink` from `:root`. The target has `charcoal / paper / white / night` (`themes = ['charcoal','paper','white','night']`, `study-app.js` L1586) and reapplies them by body class with no re-render — so theming must be **pure CSS**, and the block must be a dark inset in paper/white. | SOURCE L12–17; `study-app.js` L1642–1678; precedent `.story-stage` at `study.html` L584–597 and its restores at L5395–5430 | The block declares its own tokens on `.mm { --mm-ink:#070605; --mm-cream:#f4ecd8; --mm-ash:#cbc3b0; --mm-dim:#8c8573; --mm-gilt:#dcb257; background:#070605; color:var(--mm-cream) }` — **inside its own scope**, never on `body`. Follow the `.story-stage` precedent: fixed dark ground `#080807`, local gold `--chain-gold:#d5b16a`, plus explicit `body.paper-mode .mm …, body.white-mode .mm …{color:…!important}` restores for every text role, because `.article-body` sets colour with higher specificity. No JS on theme change. |
| **C5** | `!important` typography in the lesson body will override the nodes: `.article-body p{margin-bottom:1.85rem;line-height:1.9;font-size:var(--reading-font-size,1.125rem)!important}`. A leaf `<p>` would be 18–20 px with a 30 px bottom margin instead of `15.5px/1.45`. | `study.html` L46–52 | Render each node's text in a `<p class="mm-text">` (or a `<span>`) and reset with equal-or-higher specificity plus `!important`: `.mm .mm-text{margin:0!important;font-size:15.5px!important;line-height:1.45!important}`. Same for `.chain-title`/`h4` if headings are reused (`study.html` L1703–1706 sets `h4` with `!important` too). |
| **C6** | `.article-body ul/ol{margin:1.25rem 0 1.75rem 1.5rem}` and `.article-body li{margin-bottom:.65rem;line-height:1.75}` will wreck a leaf list inside the block. | `study.html` L73–82 | The mindmap uses no `<ul>`; leaves are sibling cards. Where a leaf genuinely needs a sub-list, mark it `.mm-list` and reset margins/indent explicitly. |
| **C7** | `renderSheet()` renders the article with `articleEl.innerHTML = data.content` and then calls `renderSheetDiagrams(data)` — **on every sitting switch**. Every map is a fresh DOM tree, so any running rAF loop, timer, `IntersectionObserver`, or `ResizeObserver` from the previous sitting leaks unless destroyed. | `study-app.js` L3792–3796 | Mount through a factory: `mountMindmap(host, spec, ctx)` returning `{ destroy() }`. Keep the rAF handle and every listener inside the closure. `renderSheetDiagrams` stores the handle on the figure (`figure.__mm`) and calls `figure.__mm.destroy()` before re-rendering — matching the existing precedent at `study-app.js` L3005–3011 (`disarmStoryReader()` before `node.remove()`). |
| **C8** | `GlossaryIndex.linkArticle(#sheet-article)` walks **every text node under the article** and injects `<button class="term-gloss">` around the first match of each glossary term. It runs *after* `renderSheetDiagrams` (L3803 vs L3796), so it will fire inside the map: a nested button inside `.card[role=button]`, and — if any node text ever lands in SVG `<text>` — a button inside an SVG element, which cannot render. | `js/study/sheet-glossary.js` L400–403 (`skipParent`) and L428–464 | Extend the existing skip list: `return !!el.closest("script, style, button, a, .term-gloss, …, .glossary-index, .mm");`. One-line change, keeps glossary links everywhere else. Also render all node copy as HTML, never SVG `<text>`. |
| **C9** | `decorateCitations(figure, refs)` walks the figure's text nodes and rewrites `(Daniel 2:44)` into a `.cite-ref` button. Its exclusion list is `'blockquote, nav.lesson-toc, .cite-ref, a, button'` — a `div[role=button]` is **not** excluded, so a citation inside a clickable school card would nest a button in a role=button. | `study-app.js` L2166–2220, exclusion at L2182 | Keep the audited citation path: render `spec.cite` through `diagramCite()` as a chip, positioned **outside** the clickable card (e.g. directly under `.mm-name`, as a sibling of the `role="button"` element) so no interactive element is nested. Also add `.mm-scene` to the walker's exclusion list, since a scene's copy is decorative film, not prose. |
| **C10** | The prototype binds `keydown` on `window` and claims `1 2 3`, `Esc`, `0`, `←`, `→`, `Space`, `F`, `L`, `C`, `Q`, `R`. In the lesson that hijacks scrolling, the story reader's own `Escape` (which already arbitrates layering via `anotherLayerOwnsEscape()`), and the page's `L/C/Q/F` features. | SOURCE L705–719; `study-app.js` L2805–2821, L2894, L2947 | Bind on the **block** (`host.tabIndex = 0`, visible focus ring) and guard with `if (!host.contains(document.activeElement)) return;`. Keep only: `1/2/3` → schools, `Esc` → overview, `←`/`→` → cycle, `Space` → play/stop **only** when focus is not on a `button`/`[role=button]`. Drop `L`, `C`, `Q`, `F`, `R` — the figure already owns a `.chain-replay` button and the page owns the rest. Also bail when `document.querySelector('.story-read:not([hidden])')` or the sheet dialog is open. |
| **C11** | "Compact" is a **viewport** media query: `matchMedia('(max-width: 860px), (max-aspect-ratio: 1/1)')`. Inside a 52 rem column on a 1 400 px screen the map is ~830 px wide but the query reports "not compact", so the map renders at ~0.52 scale with 8 px leaf text. On a 360 px phone the block is ~330 px wide and the query does fire — but for the wrong reason. | SOURCE L354, L733 | Measure the **block**: `const compact = host.clientWidth < 720;` inside `fit()`, driven by a `ResizeObserver` on `host` (not `window.resize`). Toggle `.mm.is-compact` instead of `html.compact`. Keep the prototype's compact *design* verbatim: links/scenes/hint/enter hidden, `.node` static in flow, `.branch` a left-ruled block, cards `width:100%`. |
| **C12** | Where the prototype fills from the top (`--d` + `both` fill; content visible by default), the target's convention is the opposite: `.chain-node{opacity:0}` revealed by `.is-visible` from an `IntersectionObserver` — so a JS failure hides the content. Also `prefers-reduced-motion` disables the scene's draw animation while leaving `stroke-dashoffset:1` in place, making every scene segment invisible. | SOURCE L147 vs `study.html` L492–499 and L523–529 | Keep the target's gating (`.mm.is-visible` via `IntersectionObserver`, `rootMargin:'0px 0px -15% 0px'`, `threshold:0`, matching `wireFigure` at `study-app.js` L2463–2469) **and** the target's safety net: under `reduce`, add `.is-visible` immediately and set `.mm .seg{stroke-dasharray:none!important;stroke-dashoffset:0!important;animation:none!important}` plus `.mm .node,.mm .card{opacity:1!important;transform:none!important}`. Also honour `document.hidden` by pausing the loop, as `study-app.js` L2986–2989 does for the story. |
| **C13** | **Audit.** `tools/verify/extract_claim_units.mjs` L302–332 harvests exactly `spec.title`, `spec.note`, `steps[].role`, `steps[].title`, `steps[].text`, `steps[].detail`, `steps[].points[]` as auditable units tagged `diagram`; `tools/diagrams/validate-specs.mjs` L11 whitelists `KINDS = {chain, steps, comparison, table, timeline, flow}`, requires `title`, requires `≥2` steps, and rejects blank `points[]` with `String(p||'').trim()` (L94); `tools/diagrams/enumerate-renderers.mjs` L56/L80 hard-lists the six kinds. Any prose placed in a new field (`centre.label`, `links[].label`, `scene.caption`, `scene.chain[].t`) escapes the audit silently. | cited files | (a) Put **no prose** in structural fields — `id`, `side`, `y`, `hero`, `up`, `x`, `ghost`, `final`, `route` are all non-textual. (b) Keep every learner-facing word in the fields the extractor already reads, by mapping `role`←tag, `title`←name, `points[]`←leaves. (c) For the genuinely new prose (`centre.kicker/label/hint`, `links[].label`, `scene.badge/origin/caption/marker.label`, `scene.chain[].title/sub`) extend the extractor with the same `addUnit(...)` pattern and the same `S##-DGM-<id>-…` tagging. (d) Add the new kind to all three tool lists. (e) Keep `figure.chain-ascii` untouched — the ASCII artwork is itself harvested as `S##-DIA-##` units and is what proves no text was smuggled in. |
| **C14** | **The copy must stay plain text in the DOM.** The prototype builds leaf copy with raw HTML (`leaf.innerHTML=<div class="card"><p>${arrows(html)}</p></div>`) and scene titles letter by letter; node text in a canvas or an SVG `<text>` would be invisible to search, copy, the glossary linker, and the QA probes. | SOURCE L444, L534 | Build nodes as HTML `<div>`s (the prototype already does). Scenes may keep the per-letter spans, but the `<h1>` keeps `aria-label` and the chain nodes keep real `<b>`/`<small>` text. Never render prose to canvas. |
| **C15** | **Many maps per page.** The prototype is a singleton: module-level `$`/`$$`, module-level `pulses`, `scenes`, `t`, one `const t0`, one `requestAnimationFrame(frame)` for the life of the page. The lesson has 49 figures across 11 sittings, and `s0` alone has 3. | SOURCE L346–356, L397, L551, L806–816 | One closure per figure, no module state. Either give each map its own loop started/stopped by `IntersectionObserver`, or register all live maps in a shared scheduler that runs a single rAF and stops when the registry is empty. The prototype's per-frame work is O(links) — 12 `getPointAtLength` calls — so cap concurrent maps at 1 (the on-screen one). |
| **C16** | **Fullscreen** is `root.requestFullscreen()` on `<html>` — a page takeover that would fight `body.projection-mode` (`?project=1`, `study.html` L5232–5252) and the story reader's own fullscreen. | SOURCE L601–604 | Call `host.requestFullscreen()` on the block, and re-run `fit()` on `fullscreenchange`. Suppress the affordance entirely when `body.projection-mode` is set. |
| **C17** | **Print.** `@media print` (study.html L5147+) hides `button` and forces `#sheet-article{display:block!important;color:#111!important}` (L5197–5200). A dark-ground block with hidden controls prints as a black rectangle with no replay affordance. | `study.html` L5147–5230 | In `@media print`, flatten: `.mm{background:#fff;color:#111}` or, better, hide the map and print the audited list — `.mm{display:none!important}` with a sibling `<ol class="mm-print">` generated from the same `steps` (`role` → `title` → `text` → `points[]`). Either way the words are on paper, which is what the reference list and the proof audit assume. |
| **C18** | **Accent colours.** The map needs three per-school accents (`#dcb257`, `#86a6c4`, `#d98563`); the target's diagram family is single-accent gold via `--chain-gold` / `--chain-strong` / `--chain-muted`. Overloading `--chain-gold` per node would leak into `.chain-cite`, `.chain-title`, and every sibling component. | SOURCE L23–26; `study.html` L279–281, L586–588 | Introduce block-local tokens — `--mm-ac` / `--mm-ac-rgb` on `[data-mm="<school-id>"]` — and derive gold from the block's own `--mm-gilt`. Keep `--chain-gold` untouched so the cite chips and captions stay in the house palette; let the hero school use gold so the block still reads as one family. |
| **C19** | **HUD scale.** Ten pill controls with `13px` labels and `9px 15px` padding measure ≈ 780 px — wider than the block at any column below ~850 px, and they duplicate the page's own Learn/Compare/Quiz controls. | SOURCE L321–341, L274; compact rule L270–273 | Keep at most three controls inside the block: **Play/Stop**, **Overview**, **Replay**. Keep the school buttons only when the block is ≥ 720 px (`is-compact` hides them, exactly as SOURCE L272 already does). Drop Learn/Compare/Quiz/Fullscreen/R from the HUD — they are page features and page shortcuts in the target. Reuse the existing `.chain-replay` ("Replay animation") button for the entrance, so the block needs no new affordance for the most common action. |
| **C20** | **Touch has no hover.** `#world[data-focus]` is the entire focus affordance and is mouse-only (`e.pointerType==='mouse'`); the leaves are not focusable, so on touch there is no way to trace a single school before committing to a scene. | SOURCE L65–71, L689–696 | Make focus a *selected* state, not a hover state: first tap on a school selects (`data-mm-focus`), second tap (or the scene button) opens. Clear it on `Esc`, on tapping the background, and when a scene opens. Bind the same toggle to `:focus-within` for keyboards so one code path serves both. |
| **C21** | **Text audit reads JSON, QA reads DOM.** `extract_claim_units.mjs` proves the *spec* is auditable; `qa/*.mjs` probes and the reference list prove the *rendered page* is. If the map renders copy that exists in no spec field (e.g. a label assembled in JS), neither can see it. | `tools/verify/extract_claim_units.mjs` L302–332; `tools/diagrams/validate-specs.mjs` L74–96 | Every string the map renders must come from a spec field by direct interpolation — including `centre.*`, `links[].label`, and every scene string. Add a validator rule that fails the build if a rendered string has no spec source, e.g. assert `links[].label` is present for every link, and that no template literal in the renderer contains a quoted English sentence. |

---

## 11. Change list

Ordered so that each step leaves the tree valid and the audits green.

1. **Extend the spec schema** (`js/study/sheets-data.js`) — document, above the first `diagrams:` block, the new optional fields: `centre`, `links[]`, and per-step `id`, `side`, `y`, `hero`, `up`, `scene`. No spec is edited in this step; the five existing flow specs must remain valid unchanged.
2. **Patch `tools/diagrams/validate-specs.mjs`** — add `"mindmap"` to `KINDS` (L11); allow a `points[]` entry to be either a string or `{text, lead?, terms?, cite?}` and unwrap it at L94; require `id`/`side`/`y` when `kind === "mindmap"` and require `≥2` steps (already enforced); validate that every `links[].from`/`to` names a declared `id`; validate that `scene.chain[].x` lies inside `0…1600`.
3. **Patch `tools/verify/extract_claim_units.mjs`** — inside the existing diagram loop (L314–332), add the new prose fields as units with the same tag scheme: `centre.kicker`, `centre.label`, `centre.hint`, `links[].label`, `steps[].scene.badge`, `.origin`, `.caption`, `.marker.label`, and each `scene.chain[].title` / `.sub`. Nothing else about the file changes.
4. **Patch `tools/diagrams/enumerate-renderers.mjs`** — add `mindmap` to the known-kind list (L56, L80) and to `path()` (L48–52, mapping to `bodyMindmap -> block`). Re-run it; the new kind must show `implemented`.
5. **Write `bodyMindmap(spec, steps, canResolve)`** in `js/study/study-app.js`, next to `bodyFlow` (L2369). It returns the block markup only — no `<figure>` shell, no toggle, no replay. Required output order: `host > stage > (rays, world(links-svg, hdr, centre, nodes), scenes)` + `vignette` + `grain` + local `hud`. When a step omits `side`/`y`, place it by this rule, which is the whole auto-layout contract: `side = i < Math.ceil(n/2) ? "L" : "R"`; let `j` be the step's index within its side and `m` the number of steps on that side; then `y = 450 + (j − (m−1)/2) × (side === "L" ? 150 : 136)`, clamped to `90…810`. For `n = 2` that yields one school at `(510, 450)` and one at `(1090, 450)`; for `n = 5` it yields y = 300, 450, 600 on the left and 382, 518 on the right.
6. **Wire the dispatcher** — add `else if (kind === 'mindmap') body = bodyMindmap(spec, steps, canResolve);` at `study-app.js` L3041–3042, before the `bodyChain` fallback. Keep the existing min-steps guard (L3028) and the `.chain-ascii` / `.chain-title-cap` / `.chain-note` shell (L3052–3059) exactly as they are.
7. **Wire the lifecycle** — in `renderSheetDiagrams`, after `figure.innerHTML = …`, if the kind is `mindmap` call `figure.__mm = mountMindmap(figure.querySelector('.mm'), spec, { canResolve, refs })`. At the top of the `figure[data-diagram]` loop, call `figure.__mm && figure.__mm.destroy()`. `mountMindmap` owns: the rAF loop, the `ResizeObserver` on the host, the `IntersectionObserver`, the `document.hidden` listener, the block-scoped `keydown`, and every node/link listener.
8. **Add the CSS** to `study.html`, immediately after the `.flow-stack` block (L1498), under a single `.mm` namespace: `.mm`, `.mm-viewport`, `.mm-stage`, `.mm-world`, `.mm-links`, `.mm-node`, `.mm-card`, `.mm-tag`, `.mm-name`, `.mm-enter`, `.mm-leaf`, `.mm-text`, `.mm-centre`, `.mm-ring`, `.mm-orbit`, `.mm-core`, `.mm-hint`, `.mm-link`, `.mm-arrow`, `.mm-cross`, `.mm-pulse`, `.mm-pin`, `.mm-label`, `.mm-scene`, `.mm-curtain`, `.mm-hud`. Port the prototype's values verbatim; rename every `#id` selector to a `.mm-` class; keep `--d`, `--rd`, `--dur`, `--o`, `--ac`/`--mm-ac` semantics identical.
9. **Scope the atmosphere** — re-parent `.mm-vignette`, `.mm-grain`, `.mm-curtain top/bottom`, `.mm-titlecard`, `.mm-hud` inside the host, `position:absolute`, with `isolation:isolate` on the host. Delete the full-screen behaviour; keep the wipe only if it is confined to the block and runs once per sitting.
10. **Theme contract** — set the block's own tokens and dark ground (`#070605` ground, `--mm-*` palette) and add the `body.paper-mode` / `body.white-mode` restores for every text role, following the `.story-stage` precedent at `study.html` L5395–5430. Fix the typography collisions from C5/C6 with `!important` resets scoped to `.mm`.
11. **Responsive** — replace `compactMQ` with `host.clientWidth < 720` measured in `fit()` via `ResizeObserver`; add `.mm.is-compact` rules that mirror the prototype's `.compact` block verbatim. Add the `@media (max-width: 360px)` case: collapse the HUD to play/overview only, drop `.mm-label`, and set the leaf type to `0.85rem`.
12. **Reduced motion** — add `@media (prefers-reduced-motion: reduce){ .mm .mm-node,.mm .mm-card{opacity:1!important;transform:none!important;animation:none!important} .mm .mm-link{stroke-dasharray:none!important;stroke-dashoffset:0!important;animation:none!important} .mm .mm-scene .seg{stroke-dasharray:none!important;stroke-dashoffset:0!important} .mm .mm-curtain{display:none} }` and, in `mountMindmap`, skip the rAF loop entirely and add `.is-visible` synchronously — plus honour `matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change')` so a mid-session change is respected.
13. **Keyboard and focus** — make the host `tabindex="0"` with a `:focus-visible` ring; bind the reduced key set from C10 on the host; make every school card a real `<button>` (not `div[role=button]`) and give leaves `tabindex="0"` + `Enter`/`Space`; add `aria-live="polite"` announcing "<School> scene, N of M" on every scene change.
14. **Touch selection** — implement the tap-to-select state from C20 with `data-mm-focus` and `:focus-within`, replacing the mouse-only `pointerenter` trace.
15. **Exclude the decorative layers from decoration** — add `.mm` to `skipParent()` in `js/study/sheet-glossary.js` (L400–403) and `.mm-scene` to the `decorateCitations` walker exclusion (L2182). Re-run `tools/verify/verify_scripture.mjs` and the glossary checks.
16. **Print** — add a print rule that hides the map chrome and prints the audited list, generated from the same `steps` in `bodyMindmap` as `<ol class="mm-print">`.
17. **Performance guards** — start/stop the loop from the `IntersectionObserver`; skip all per-frame work when `document.hidden`; cap concurrent live maps at one; drop `filter:drop-shadow()` from `.mm-arrow`, `.mm-link.is-main`, and `.mm-scene .seg` when `is-compact` is set.
18. **QA** — extend `qa/` with: reduced-motion screenshots of a mindmap sitting and one open scene (proving the scene segments are visible, i.e. the C12 fix); a 360 px viewport run asserting `document.documentElement.scrollWidth <= 360`; a theme run over all four themes asserting the node text is `--mm-cream` on paper/white; and a run that asserts the rendered node text set equals the spec's `role`/`title`/`text`/`points[]` strings verbatim (the C21 audit link).
19. **Re-run the audits** — `node tools/diagrams/count-figures.mjs` (49/49, no orphans), `node tools/diagrams/validate-specs.mjs`, `node tools/diagrams/enumerate-renderers.mjs` (mindmap: implemented), and `node tools/verify/extract_claim_units.mjs`.
20. **Migrate one sitting at a time** — start with `s2/s2-3` (2 steps, has a `note` and a `points[]`, so it exercises the branch cluster) and `s4/s4-4` (5 steps, every step cited, so it exercises the cite chip and the fan). Only after both render correctly should `s2/s2-4`, `s4/s4-5`, and `s10/s10-2` follow. **Nothing else in the corpus changes** — the `flow` kind stays implemented and dispatched, so an un-migrated spec is never broken.

---

## 12. What a flow spec must additionally declare to render as a mindmap

Everything below is **optional**. A spec with none of it is still a valid flow spec and still renders as
the current vertical stack.

| Field | Type | Required for a mindmap | Default if omitted | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `"mindmap"` | yes | `"flow"` | selects the new renderer; `"flow"` keeps today's stack |
| `centre.kicker` | string | no | `"Interpretation"` | `.mm-core small`, uppercase mono, max 2 lines |
| `centre.label` | string | no | `spec.title` | `.mm-core b`, serif 33 px, max 2 lines |
| `centre.hint` | string | no | the legend sentence | `.mm-hint`, bottom-left of the block |
| `steps[].id` | string slug `[a-z0-9-]+` | yes | `step-<i>` | the `data-mm` value and the `--mm-ac` key |
| `steps[].side` | `"L"` \| `"R"` | no | `i < Math.ceil(n/2) ? "L" : "R"` — first half left | which side of the centre the head sits |
| `steps[].y` | number `90…810` | no | `450 + (j − (m−1)/2) × (side === "L" ? 150 : 136)`, where `j` is the index within the side and `m` the count on that side | world y of the head node |
| `steps[].hero` | boolean | no | `false` | adds the gold `.mm-hero` breathing ring |
| `steps[].up` | boolean | no | `false` | reverses the leaf fan so a top cluster reads outward |
| `steps[].points[]` | `string` **or** `{ text, lead?, terms?, cite? }` | no | plain strings, as today | leaves; the object form allows emphasis without raw HTML |
| `steps[].scene` | object | no | no scene for this school | the film; without it the school is map-only |
| `spec.links[]` | array | no | no dashed connectors | the school-to-school relations |

**`steps[].scene`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `badge` | string | one of `badge`/`origin` | gold pill under the title |
| `origin` | string | one of `badge`/`origin` | ash line under the title |
| `caption` | string | yes | the italic serif line at the foot of the scene |
| `marker` | `{ x: number, label: string }` | no | vertical gold bar + mono label at `x` |
| `brightness` | `[number, number][]` | no | `keyp`; defaults to `[[0,1],[1,1]]` (an unbroken line) |
| `chain[]` | array | yes | the horizontal chain at `y = 520` |
| `chain[].title` | string | yes | the node's bold serif line |
| `chain[].sub` | string | no | the small accent sub-line |
| `chain[].x` | number `0…1600` | yes | position along the chain |
| `chain[].ghost` | boolean | no | dashed hollow dot; the incoming segment dashes |
| `chain[].final` | boolean | no | 34 px filled dot, ping ring, shorter arrow stub |
| `chain[].gap` | string | no | label text; makes the outgoing segment the dashed gap with ticks and motes (+2.1 s) |

**`spec.links[]`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `from` | string slug | yes | a declared `steps[].id` |
| `to` | string slug | yes | a declared `steps[].id` |
| `label` | string | yes | the `.mm-label` pill on the dashed line — **prose, so it must be added to the claim-unit extractor** |
| `route` | `"vertical"` \| `"under-centre"` | no, default `"vertical"` | straight vertical between stacked leaves, or a Bézier dipping 160 px below the head line |

### 12.1 Example — one school, ready to paste

```json
{
  "kind": "mindmap",
  "title": "The Three Interpretive Schools",
  "note": "Solid arrows branch outward. Dashed arrows connect the schools.",
  "centre": {
    "kicker": "Prophetic interpretation",
    "label": "Three Schools",
    "hint": "Solid arrows branch outward. Dashed arrows connect the schools. Open a school to follow its chain."
  },
  "links": [
    { "from": "preterism", "to": "futurism", "label": "Same origin: Counter-Reformation", "route": "vertical" },
    { "from": "historicism", "to": "futurism", "label": "Same chain up to Rome, then Futurism breaks it", "route": "under-centre" }
  ],
  "steps": [
    {
      "id": "historicism",
      "role": "Continuous",
      "title": "Historicism",
      "side": "L",
      "y": 450,
      "hero": true,
      "cite": "Daniel 2:44",
      "points": [
        { "text": "The reading this course defends." },
        { "text": "Babylon → Medo-Persia → Greece → Rome → Divided Europe, the historicist reading → Christ's kingdom.", "terms": ["the historicist reading"] },
        { "text": "One unbroken chain running in real time." }
      ],
      "scene": {
        "badge": "The reading this course defends",
        "caption": "One unbroken chain running in real time.",
        "brightness": [[0, 1], [1, 1]],
        "chain": [
          { "title": "Babylon",          "sub": "Gold head · Lion",           "x": 170 },
          { "title": "Medo-Persia",      "sub": "Silver · Bear",              "x": 422 },
          { "title": "Greece",           "sub": "Bronze · Leopard",           "x": 674 },
          { "title": "Rome",             "sub": "Iron · Fourth beast",        "x": 926 },
          { "title": "Divided Europe",   "sub": "Iron and clay · Ten horns",  "x": 1178 },
          { "title": "Christ's kingdom", "sub": "The stone · Dan 2:44; 7:27", "x": 1430, "final": true }
        ]
      }
    },
    { "id": "preterism",  "role": "Locked in antiquity", "title": "Preterism", "side": "R", "y": 225, "up": true, "points": ["…"] },
    { "id": "futurism",   "role": "Truncated at Rome",   "title": "Futurism",  "side": "R", "y": 675,            "points": ["…"] }
  ]
}
```

### 12.2 Migration rule for the five existing flow specs

Add `"kind": "mindmap"` and, if the sense of the diagram is a **sequence** rather than a set of
**parallel schools** (as all five are), leave `side`/`y`/`scene`/`links` out. The renderer then fan-widens
`steps` around the centre using the default placement rule in §11 step 5 — first half of the list to the
left at 150 px spacing, second half to the right at 136 px, both centred on `y = 450` — and treats every
`role` as a head tag, every `title` as a head name, and every step's `text` plus `points[]` as that
head's leaves. The diagram keeps every word it has today, gains the map's layout and entrance, and needs
no new prose — which is what keeps the reference list and the proof audit intact.
