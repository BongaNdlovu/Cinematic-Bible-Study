/*
 * MindMap — the cinematic mindmap renderer for the study lesson.
 *
 * A port of the standalone prototype ("The Three Interpretive Schools") into an
 * inline lesson figure, specified by docs/spec-flow-mindmap.md and scoped by
 * docs/flow-map-decisions.md. The prototype *is* its page; this is a block
 * inside a ~830 px lesson column under four themes, so the port keeps the design
 * and drops the parts that only make sense full-screen.
 *
 * Public surface (classic script, like the rest of js/study/):
 *
 *   window.MindMap.create(hostElement, spec, opts) -> { destroy, resize, refresh }
 *
 *   opts.cite        diagramCite(label, canResolve) from study-app.js, so a
 *                    node's `cite` renders as the same audited chip every other
 *                    diagram uses. Without it the reference prints flat.
 *   opts.canResolve  the sitting's reference resolver, passed straight through.
 *
 * One closure per figure, no module state (C15): renderSheet() rebuilds the
 * article on every sitting switch, so destroy() removes the DOM, cancels every
 * timer and animation frame, and disconnects every observer.
 *
 * Where this departs from the prototype, and why (collision numbers are §10 of
 * docs/spec-flow-mindmap.md):
 *
 *   C1  the stage is scaled to the *block*; innerWidth/innerHeight are never
 *       read. The world is 960×660 rather than the prototype's 1600×900 — the
 *       scale is what sets the reader's type size, and 1600 rendered this
 *       column's body text at 8 px (see the constants below).
 *   C2  no body.idle, no page-level overflow change; the HUD fade is local.
 *   C3  vignette and grain are re-parented inside the block; the 51vh curtains
 *       and the full-screen titlecard are dropped, not shrunk.
 *   C4  theming is pure CSS (a dark inset in all four themes, the .story-stage
 *       precedent). Nothing re-renders on a theme change; --chain-gold is never
 *       overloaded — the block carries its own --mm-ac / --mm-ac-rgb tokens.
 *   C5  .mm-text / .mm-name carry !important resets scoped to .mm.
 *   C6  no <ul> inside the map; leaves are sibling cards.
 *   C7  factory + destroy(), wired from renderSheetDiagrams.
 *   C9  the cite chip is a sibling of the node button, never inside it.
 *   C10 keydown is bound on the host and claims arrows, Enter/Space and Escape
 *       only. 1/2/3, L, C, Q, F and R are not claimed and never were.
 *   C11 "compact" is host.clientWidth < 720, driven by a ResizeObserver.
 *   C12 the map is visible and static by default and only *arms* its entrance
 *       when .mm.is-visible is added, so a JS failure cannot hide the content.
 *       Under reduced motion .mm-link and .mm-seg keep stroke-dasharray:none /
 *       stroke-dashoffset:0 — the prototype leaves them at offset 1, invisible.
 *   C14 every word is HTML text built from a spec field by direct interpolation.
 *   C19 two controls live in the block (Play/Stop, Overview); Replay is the
 *       figure's existing .chain-replay button, reused rather than duplicated.
 *   C20 focus is a selected state: the first tap selects, the second opens, and
 *       the same state is driven by keyboard focus.
 *   C21 no sentence is assembled in this file. The only strings rendered here
 *       that are not a spec field used verbatim are the four connector words
 *       (TEXT / HISTORY / INTERPRETATION / CHRIST — the course's own self-check
 *       headings, i.e. vocabulary) and control labels.
 */
(function () {
  'use strict';

  /* ── the world ──────────────────────────────────────────────────────────
     The block is a lesson figure in a ≤846 px column and `fit()` scales this
     entire world to the block, so a type size declared in world px reaches the
     reader at `size × blockWidth / W`. The prototype's world was 1600×900:
     in an 846 px column that is a scale of 0.527, which rendered its 15.5 px
     leaf text at 8.2 px — measured, not feared
     (tools/verify/verify_mindmap_legibility.mjs). Shrinking the world is what
     makes the words bigger, so the world is now 960×660 (16:11 — exactly the
     shape the block's own `aspect-ratio` gives it, so nothing is letterboxed)
     and the same column lands at ~0.88: 15.5 px world text reads at ~13.6 px,
     and every non-compact column (C11: block ≥ 722 px) clears 11.5 px.

     Everything below is derived from W and H. Anything the prototype sized
     against its own 1600×900 — every arrowhead, scene position and chain dot —
     is re-based through KX (a width) or KY (a height), so a future resize is
     one edit and nothing here is a stray literal. */
  const NS = 'http://www.w3.org/2000/svg';
  const W = 960, H = 660;
  const KX = W / 1600, KY = H / 900;
  const kx = (v) => v * KX;                 // prototype width/size → world
  const ky = (v) => v * KY;                 // prototype y → world y
  const Y = ky(520);                        // §2.3, every scene's chain line
  /* The head card and the leaf card widths are declared in study.html
     (.mm-head .mm-card / .mm-leaf .mm-card); the link endpoints below are
     derived from them, so both must move together. */
  const HW = 160, LW = 195;
  const GAP = 16;                           // between a card and its neighbour
  const EDGE = 12;                          // world margin outside the leaf columns
  /* The centre circle. One diameter for a one-, two- or three-line label: the
     type is fitted to it (coreFit), so a long diagram title shrinks rather than
     pushing the fan columns off the world. */
  const CORE_D = 160;
  /* P is the prototype's placement table (§1.2), re-derived from the world
     instead of transcribed. The circle sits at the world's centre and the four
     columns step inward from its two outer edges — EDGE is the margin the leaf
     cards keep from the canvas, and what is left between the head cards and the
     circle is the run the centre's own spokes are drawn on. */
  const P = {
    cx: W / 2,
    cy: H / 2,
    cr: CORE_D / 2,
    hw: HW,
    lw: LW,
    lxL: EDGE + LW / 2,
    lxR: W - EDGE - LW / 2,
    hxL: EDGE + LW + GAP + HW / 2,
    hxR: W - EDGE - LW - GAP - HW / 2
  };
  const ARROW = arrowhead(kx(11), kx(5.5));
  const SC_ARROW = arrowhead(kx(14), kx(6.5));
  /* The scene chain, laid out on the prototype's own 120…1480 measure. */
  const CHAIN_X0 = kx(120), CHAIN_SPAN = kx(1360);
  /* Head and leaf pitch per side (§1.2; the placement rule of §11 step 5). */
  const SPACING_L = ky(150), SPACING_R = ky(136);
  /* C11: measured on the block. A viewport query calls a ~830 px column "not
     compact" on a 1400 px screen and renders 15.5 px leaf text at 8 px. */
  const COMPACT_WIDTH = 720;
  const IDLE_MS = 3800;                     // C2
  /* The full-screen view's focus trap needs to know what "focusable" means
     here. Every control the block builds is a real <button>, so this is the
     whole list; the host itself carries tabindex so it can fall back. */
  const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
  const DIP = ky(160);                      // §2.3, the under-centre Bézier
  const Y_MIN = ky(90), Y_MAX = ky(810);    // the authored `y` range (§12)

  /* The prototype's arrowheads are triangles pointing along +x with their tip
     at the origin, drawn at 11 px and 14 px on a 1600 px world. */
  function arrowhead(len, half) {
    return 'M0 0L' + (-len).toFixed(2) + ' ' + (-half).toFixed(2) + 'L' +
      (-len * 0.68).toFixed(2) + ' 0L' + (-len).toFixed(2) + ' ' + half.toFixed(2) + 'Z';
  }
  const CHEVRON = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
    '<path d="M4.2 1.6 8.6 6l-4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* The prototype's three school accents, plus the course's sage green (already
     in study.html for quiz feedback) so a four-step spine never repeats one.
     Block-local tokens (C18): --chain-gold stays untouched for .chain-cite and
     .chain-title. */
  const ACCENTS = [
    { hex: '#dcb257', rgb: '220,178,87' },
    { hex: '#86a6c4', rgb: '134,166,196' },
    { hex: '#d98563', rgb: '217,133,99' },
    { hex: '#9ccf8f', rgb: '156,207,143' }
  ];

  /* The connector vocabulary is the course's own: every sitting closes with a
     self-check card headed TEXT / HISTORY / INTERPRETATION / CHRIST. Those four
     words are navigational vocabulary rather than prose, which is why they are
     the one thing this file may render without a spec field behind it (C21). */
  const CONNECTORS = { text: 'TEXT', history: 'HISTORY', interpretation: 'INTERPRETATION', christ: 'CHRIST' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function svgEl(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
    return node;
  }

  function connectorWord(kind) { return CONNECTORS[String(kind || '').toLowerCase()] || ''; }

  /* ── layout ────────────────────────────────────────────────────────────
     The steps are the nodes and each step's leaves are its `text` followed by
     its `points[]`, in the authored order (§12.2). Nothing is split,
     re-parented or invented: s2-3 stays two nodes, with the four historical
     instances owned by step 2. A declared `side`/`y` is honoured; otherwise
     §11 step 5 places the first half of the list on the left and the rest on
     the right, at the prototype's own 150 px / 136 px pitch measured against
     its 900 px world and so re-based to H, both centred on the world's own
     centre (`P.cy`, which is now 330 rather than 450). */
  function place(steps) {
    const half = Math.ceil(steps.length / 2);
    const items = steps.map((step, i) => {
      const id = String(step.id || ('step-' + i)).toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      return {
        step,
        i,
        id: id || ('step-' + i),
        side: step.side === 'L' || step.side === 'R' ? step.side : (i < half ? 'L' : 'R'),
        cite: step.cite ? String(step.cite) : '',
        fan: CONNECTORS[String(step.link || '').toLowerCase()] ? String(step.link).toLowerCase() : '',
        hero: !!step.hero,
        up: !!step.up,
        leaves: []
      };
    });

    ['L', 'R'].forEach((side) => {
      const group = items.filter((item) => item.side === side);
      const m = group.length;
      group.forEach((item, j) => {
        const fallback = P.cy + (j - (m - 1) / 2) * (side === 'L' ? SPACING_L : SPACING_R);
        const declared = Number(item.step.y);
        const y = Number.isFinite(declared) ? declared : fallback;
        item.y = Math.max(Y_MIN, Math.min(Y_MAX, y));
        item.hx = side === 'L' ? P.hxL : P.hxR;
        item.lx = side === 'L' ? P.lxL : P.lxR;
      });
    });

    items.forEach((item) => {
      const texts = [];
      if (item.step.text) texts.push(String(item.step.text));
      (item.step.points || []).forEach((point) => {
        /* The object form of a leaf ({text, lead, terms, cite}) is deliberately
           not implemented: no migrated spec uses it, and reading `.text` would
           put copy on the page that extract_claim_units.mjs cannot see
           (C13/C21). A non-string leaf is skipped, never stringified. */
        if (typeof point === 'string' && point.trim()) texts.push(point);
      });
      const pitch = item.side === 'L' ? SPACING_L : SPACING_R;
      const m = texts.length;
      item.leaves = texts.map((text, li) => {
        /* §1.3's fan, generalised to be centred on its head: for three leaves
           this is the prototype's `(li - 1) * step` exactly, and a lone leaf
           sits level with its head instead of a full step above it. */
        const off = (li - (m - 1) / 2) * pitch;
        return { text, y: Math.max(ky(60), Math.min(ky(860), item.y + (item.up ? -off : off))) };
      });
    });

    return items;
  }

  /* A balanced line split that minimises the longest line, so "The Smiting
     Stone" breaks as "The Smiting" / "Stone" rather than "The" / "Smiting Stone". */
  function splitLines(words, maxLines) {
    const n = words.length;
    if (n <= 1) return [words.join(' ')];
    const memo = new Map();
    const width = (i, j) => words.slice(i, j).join(' ').length;
    function solve(i, lines) {
      if (i >= n) return { cost: 0, out: [] };
      if (lines === 0) return { cost: Infinity, out: [] };
      const key = i + ':' + lines;
      if (memo.has(key)) return memo.get(key);
      let best = { cost: Infinity, out: [] };
      for (let j = i + 1; j <= n; j++) {
        const rest = solve(j, lines - 1);
        const cost = Math.max(width(i, j), rest.cost);
        if (cost < best.cost) best = { cost, out: [words.slice(i, j).join(' ')].concat(rest.out) };
      }
      memo.set(key, best);
      return best;
    }
    const result = solve(0, maxLines);
    return result.out.length ? result.out : [words.join(' ')];
  }

  /* The centre circle holds the diagram's own title. It is one fixed diameter
     (CORE_D) whatever the label's shape — the fan columns are placed from it —
     and the type is fitted to the longest line instead, so a long title shrinks
     rather than pushing the map off the canvas. 0.52 em per character is the
     measured advance of the loaded serif at 700 weight (0.51 for the shipped
     "The Post-Roman"), and 0.84·d is the circle's inner box for 12 px of
     padding. No word is changed, added or lost. */
  function coreFit(label) {
    const raw = String(label || '').trim();
    if (!raw) return { lines: [], d: CORE_D, fs: 20 };
    /* Keep a parenthesised gloss on one line: "(Daniel 2:43)" is one token. */
    const words = [];
    let buffer = '';
    raw.split(/\s+/).forEach((word) => {
      buffer = buffer ? buffer + ' ' + word : word;
      const open = (buffer.match(/\(/g) || []).length;
      const close = (buffer.match(/\)/g) || []).length;
      if (open <= close) { words.push(buffer); buffer = ''; }
    });
    if (buffer) words.push(buffer);
    const total = words.join(' ').length;
    const maxLines = total <= 12 ? 1 : (total <= 24 ? 2 : 3);
    const lines = splitLines(words, maxLines);
    const longest = lines.reduce((m, line) => Math.max(m, line.length), 1);
    const fs = Math.max(13, Math.min(30, Math.floor((CORE_D * 0.84) / (0.52 * longest))));
    return { lines, d: CORE_D, fs };
  }

  /* The scene title is per-letter (prototype `.sc-title` at 150 px on a 1600 px
     stage). Fitted to 0.78·W — the prototype's own 1250 px measure, and 0.10·W
     inside the 0.88·W the scene head actually lays out in, so a long diagram
     title cannot run off it or break mid-word. Never below 0.025·W, where it
     stops being a title. 0.55 em per character is the measured advance of the
     loaded serif at 600 weight, rounded up. */
  function titleFit(title) {
    const len = String(title || '').length || 1;
    return Math.max(kx(40), Math.min(kx(150), Math.floor((W * 0.78) / (0.55 * len))));
  }

  /* How many lines the browser will need for `label` at `fs`: greedy word
     wrapping against the card's measure, which is what `text-wrap: wrap` does.
     0.58 em per character is the measured advance of the loaded serif at 700
     weight — the prototype's 0.42 estimate under-counted it by a third, which
     is why names wrapped to four lines. Estimating from the character count
     alone still under-counts, because a line rarely fills to its last
     character: a three-line estimate that renders as four is a card that
     collides with the next head. */
  function nameLines(label, fs) {
    const measure = HW - 30;
    const per = 0.58 * fs;
    let lines = 1;
    let used = 0;
    String(label || '').split(/\s+/).forEach((word, i) => {
      const w = word.length * per;
      if (i === 0) { used = w; return; }
      if (used + per + w <= measure) used += per + w;
      else { lines += 1; used = w; }
    });
    return lines;
  }

  /* The largest size at which the name still fits the card in three lines, so
     the size follows the words instead of the card overflowing. Nothing is
     truncated: the full title stays in the DOM at any size. */
  function nameFit(label) {
    for (let fs = 30; fs > 15; fs -= 1) {
      if (nameLines(label, fs) <= 3) return fs;
    }
    return 15;
  }

  function create(host, spec, opts) {
    if (!host || !spec) return null;
    const options = opts || {};
    const citeFn = typeof options.cite === 'function' ? options.cite : null;
    const canResolve = options.canResolve;
    const steps = Array.isArray(spec.steps) ? spec.steps : [];
    if (!steps.length) return null;

    const model = place(steps);
    const byId = new Map(model.map((item) => [item.id, item]));
    const title = String(spec.title || '');

    /* Cross-links come from spec.links[], each naming two declared step ids. Two
       steps on the same side keep the authored order (solid, "spine"); two on
       opposite sides are a relation across it (dashed, "under-centre"), the
       prototype's own cross-link route. A declared `route` overrides. */
    const links = (Array.isArray(spec.links) ? spec.links : []).map((link, i) => {
      const from = byId.get(String((link && link.from) || ''));
      const to = byId.get(String((link && link.to) || ''));
      if (!from || !to || from === to) return null;
      const declared = String((link && link.route) || '');
      const route = declared === 'spine' || declared === 'vertical' || declared === 'under-centre'
        ? declared
        : (from.side === to.side ? 'spine' : 'under-centre');
      return { i, from, to, route, kind: String((link && link.kind) || '').toLowerCase(), word: connectorWord(link && link.kind) };
    }).filter(Boolean);

    const state = {
      compact: false,
      visible: false,
      reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      full: false,
      inScene: false,
      scene: -1,
      tour: false,
      raf: 0,
      idle: 0,
      last: 0,
      started: 0,
      focus: '',
      tap: '',
      opener: null,
      width: 0,
      height: 0,
      coreRadius: CORE_D / 2,
      timers: []
    };
    let destroyed = false;
    const cam = { x: 0, y: 0, tx: 0, ty: 0, s: 1, ts: 1 };
    const pulses = [];
    const scenes = [];
    const cross = [];
    const dom = {};
    let pointerKind = 'mouse';                 // C20: a tap selects, a click opens
    let replayEl = null;
    let observers = null;

    const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb) => window.setTimeout(cb, 16);
    const caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : window.clearTimeout;

    function later(fn, ms) {
      const id = window.setTimeout(() => {
        state.timers = state.timers.filter((x) => x !== id);
        fn();
      }, ms);
      state.timers.push(id);
      return id;
    }

    function clearTimers() {
      state.timers.forEach((id) => window.clearTimeout(id));
      state.timers = [];
    }

    /* ── markup ─────────────────────────────────────────────────────────── */

    function citeChip(label) {
      if (!label) return '';
      if (citeFn) return citeFn(label, canResolve);
      return '<span class="chain-cite is-flat">' + esc(label) + '</span>';
    }

    /* C17: @media print hides `button` and forces #sheet-article to #111, so a
       dark-ground block prints as a black rectangle with no control. The same
       steps are laid out as an auditable list instead. */
    function printListHtml() {
      return '<div class="mm-print"><ol class="mm-print-list">' + model.map((item) => {
        const step = item.step;
        return '<li>' +
          (step.role ? '<span class="mm-print-role">' + esc(step.role) + '</span> ' : '') +
          (step.title ? '<span class="mm-print-title">' + esc(step.title) + '</span>' : '') +
          (step.text ? ' <span class="mm-print-text">' + esc(step.text) + '</span>' : '') +
          (item.cite ? ' <span class="mm-print-cite">' + esc(item.cite) + '</span>' : '') +
          (item.leaves.length
            ? '<ul class="mm-print-points">' + item.leaves.map((leaf) => '<li>' + esc(leaf.text) + '</li>').join('') + '</ul>'
            : '') +
        '</li>';
      }).join('') + '</ol></div>';
    }

    function centreHtml(fitInfo) {
      if (!fitInfo.lines.length) return '';
      const kicker = spec.centre && spec.centre.kicker
        ? '<small class="mm-core-kicker">' + esc(spec.centre.kicker) + '</small>' : '';
      const lines = fitInfo.lines.map((line) => '<span>' + esc(line) + '</span>').join(' ');
      return '<div class="mm-node mm-centre" style="left:' + P.cx + 'px;top:' + P.cy + 'px;' +
        '--mm-core-d:' + fitInfo.d + 'px;--mm-core-fs:' + fitInfo.fs + 'px;--d:0.15s">' +
        '<span class="mm-ring" style="--rd:0s"></span>' +
        '<span class="mm-ring" style="--rd:2s"></span>' +
        '<span class="mm-ring" style="--rd:4s"></span>' +
        '<svg class="mm-orbit" viewBox="0 0 232 232" aria-hidden="true" focusable="false">' +
          '<circle cx="116" cy="116" r="114" fill="none" stroke="rgba(220,178,87,.35)" stroke-dasharray="1.5 7"/>' +
          '<circle cx="116" cy="2" r="3.2" fill="#f1cf86"/>' +
        '</svg>' +
        '<span class="mm-core"><span class="mm-core-in">' + kicker + '<b>' + lines + '</b></span></span>' +
      '</div>';
    }

    function headHtml(item) {
      const step = item.step;
      return '<div class="mm-node mm-head' + (item.hero ? ' mm-hero' : '') + '" data-mm="' + esc(item.id) + '" ' +
        'style="left:' + item.hx + 'px;top:' + item.y + 'px;--d:' + item.headDelay.toFixed(2) + 's;' +
        '--mm-name-fs:' + nameFit(step.title) + 'px">' +
        '<button type="button" class="mm-card" data-mm-open="' + esc(item.id) + '">' +
          (step.role ? '<span class="mm-tag">' + esc(step.role) + '</span>' : '') +
          (step.title ? '<span class="mm-name">' + esc(step.title) + '</span>' : '') +
          '<span class="mm-go" aria-hidden="true">' + CHEVRON + '</span>' +
        '</button>' +
        /* C9: the audited cite chip is a sibling of the button, never inside it,
           so a cartesian click cannot nest one control in another. */
        (item.cite ? '<span class="mm-cite">' + citeChip(item.cite) + '</span>' : '') +
      '</div>';
    }

    function leafHtml(item, leaf, k) {
      const delay = item.headDelay + 0.72 + k * 0.18;
      return '<div class="mm-node mm-leaf" data-mm="' + esc(item.id) + '" ' +
        'style="left:' + item.lx + 'px;top:' + leaf.y + 'px;--d:' + delay.toFixed(2) + 's">' +
        '<button type="button" class="mm-card" data-mm-open="' + esc(item.id) + '">' +
          '<span class="mm-text">' + esc(leaf.text) + '</span>' +
        '</button>' +
      '</div>';
    }

    /* The film for one node. The prototype's scenes are hand-authored content
       (badge, origin, marker, chain). A migrated flow spec declares none, so the
       scene is built from the node's own audited fields and nothing else: role
       as the kicker, title as the per-letter display line, the audited cite chip
       as the badge, the leaves as the horizontal chain on the world's own chain
       line (`Y`, the prototype's 520 re-based to H), and the diagram's own note
       as the caption.

       A scene is a 1600×900 film played inside a 16:11 block, so its positions
       are re-derived (CHAIN_X0/CHAIN_SPAN across, `Y` down) while its type is
       re-based through KX: that keeps every label the size it already reads at
       on screen while the map's own text grows. */
    function sceneHtml(item) {
      const step = item.step;
      const leaves = item.leaves;
      const n = leaves.length;
      /* Chain nodes are sized to leave a run of line between them: the segment,
         not the label, is what says "and then". */
      const width = Math.min(kx(420), Math.max(kx(180), Math.floor(CHAIN_SPAN / Math.max(1, n)) - kx(60)));
      const longest = leaves.reduce((m, leaf) => Math.max(m, leaf.text.length), 0);
      const cnFs = Math.round((longest > 44 ? 20 : 26) * KX);
      /* Per-letter, so the film writes its own title. Words are kept whole —
         a mid-word break reads as a mistake, not as a title — while the spaces
         between them stay real text nodes so the heading still copies and
         searches as one sentence. */
      const letters = String(step.title || '').split(' ').map((word, wi) => (
        '<span class="mm-sc-word">' + [...word].map((char, ci) => (
          '<span aria-hidden="true" style="--d:' + (0.2 + (wi + ci * 0.06) * 0.05).toFixed(2) + 's">' +
          esc(char) + '</span>'
        )).join('') + '</span>'
      )).join(' ');
      const art = [];
      leaves.forEach((leaf, k) => {
        if (k >= n - 1) return;
        const x1 = CHAIN_X0 + CHAIN_SPAN * (k + 0.5) / n + width / 2 + kx(6);
        const x2 = CHAIN_X0 + CHAIN_SPAN * (k + 1.5) / n - width / 2 - kx(12);
        const delay = 1.15 + k * 0.62;
        art.push('<path class="mm-seg" pathLength="1" d="M' + x1.toFixed(0) + ' ' + Y + 'H' + x2.toFixed(0) + '" ' +
          'style="--d:' + delay.toFixed(2) + 's"/>');
        art.push('<path class="mm-sc-arrow" d="' + SC_ARROW + '" style="--d:' + (delay + 0.5).toFixed(2) + 's" ' +
          'transform="translate(' + (x2 + kx(9)).toFixed(0) + ' ' + Y + ')"/>');
      });
      const lights = Array.from({ length: 10 }, (_, k) => '<circle class="mm-pl' + (k ? '' : ' is-head') + '" ' +
        'cx="' + (-CHAIN_X0).toFixed(0) + '" cy="' + Y + '" r="' +
        (k ? Math.max(1.2, kx(5 - k * 0.4)).toFixed(1) : kx(6).toFixed(1)) + '" opacity="0"/>').join('');
      const chain = leaves.map((leaf, k) => '<div class="mm-cn" ' +
        'style="left:' + (CHAIN_X0 + CHAIN_SPAN * (k + 0.5) / n).toFixed(0) + 'px;top:' + Y + 'px;' +
        '--mm-cn-w:' + width + 'px;--mm-cn-fs:' + cnFs + 'px;--d:' + (1.15 + k * 0.62).toFixed(2) + 's">' +
        '<span class="mm-dot"></span><span class="mm-lbl"><b>' + esc(leaf.text) + '</b></span></div>').join('');
      return '<section class="mm-scene" data-mm-scene="' + esc(item.id) + '" aria-hidden="true" tabindex="-1" ' +
        'style="--mm-ac:' + item.accent.hex + ';--mm-ac-rgb:' + item.accent.rgb + '">' +
        '<span class="mm-sc-glow"></span>' +
        '<div class="mm-sc-head">' +
          (step.role ? '<p class="mm-sc-kicker">' + esc(step.role) + '</p>' : '') +
          (step.title ? '<p class="mm-sc-title" style="--mm-sc-fs:' + titleFit(step.title) + 'px">' + letters + '</p>' : '') +
          (item.cite ? '<span class="mm-sc-badge">' + citeChip(item.cite) + '</span>' : '') +
        '</div>' +
        '<svg class="mm-sc-svg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' +
          art.join('') + lights +
        '</svg>' + chain +
        (spec.note ? '<p class="mm-sc-caption">' + esc(spec.note) + '</p>' : '') +
      '</section>';
    }

    function build() {
      const centreText = coreFit((spec.centre && spec.centre.label) || title);
      state.coreRadius = centreText.d / 2;
      model.forEach((item, i) => {
        item.accent = ACCENTS[i % ACCENTS.length];
        item.headDelay = 0.9 + i * 0.22;
        item.linkDelay = 0.55 + i * 0.22;
      });
      const lastHead = model.reduce((m, item) => Math.max(m, item.headDelay), 0);

      const branches = model.map((item) => '<div class="mm-branch" data-mm="' + esc(item.id) + '" ' +
        'style="--mm-ac:' + item.accent.hex + ';--mm-ac-rgb:' + item.accent.rgb + '">' +
        headHtml(item) + item.leaves.map((leaf, k) => leafHtml(item, leaf, k)).join('') +
      '</div>').join('');

      const defs = ACCENTS.map((a, i) => '<radialGradient id="mm-glow-' + i + '">' +
        '<stop offset="0" stop-color="' + a.hex + '" stop-opacity=".95"/>' +
        '<stop offset=".35" stop-color="' + a.hex + '" stop-opacity=".5"/>' +
        '<stop offset="1" stop-color="' + a.hex + '" stop-opacity="0"/></radialGradient>').join('');

      host.innerHTML = printListHtml() +
        '<div class="mm-viewport">' +
          '<div class="mm-stage">' +
            '<div class="mm-rays"></div>' +
            '<div class="mm-world">' +
              '<svg class="mm-links" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' +
                '<defs>' + defs + '</defs>' +
                '<g class="mm-main"></g><g class="mm-arrows"></g><g class="mm-cross"></g><g class="mm-pulses"></g>' +
              '</svg>' +
              centreHtml(centreText) +
              branches +
            '</div>' +
            '<div class="mm-scenes">' + model.map(sceneHtml).join('') + '</div>' +
          '</div>' +
          '<div class="mm-vignette"></div>' +
          '<div class="mm-grain"></div>' +
        '</div>' +
        '<div class="mm-live" aria-live="polite"></div>' +
        '<nav class="mm-hud" aria-label="Mindmap controls">' +
          '<button type="button" class="mm-btn mm-play" aria-pressed="false">' +
            '<svg class="mm-i mm-i-play" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 1.5v9l7.5-4.5z"/></svg>' +
            '<svg class="mm-i mm-i-stop" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><rect x="2.5" y="2.5" width="7" height="7" rx="1"/></svg>' +
            '<span class="mm-lbl-play">Play</span><span class="mm-lbl-stop">Stop</span>' +
          '</button>' +
          '<span class="mm-sep" aria-hidden="true"></span>' +
          '<button type="button" class="mm-btn mm-overview">Overview</button>' +
          /* The full-screen control is the block's third affordance. The brief's
             budget is three, and the figure's own Replay control is the third
             only in the sense that it is shared (C19) — this is the control the
             block itself adds. It is a child of the bar so it is a `.mm-btn`
             like its siblings and takes the block's palette, and the bar's own
             selector filters it out (`.mm-hud .mm-btn:not([data-mm-fs])`), so
             the two controls the bar was built to hold stay exactly two. */
          '<button type="button" class="mm-btn mm-fs" data-mm-fs aria-pressed="false" ' +
            'aria-label="Full screen">' +
            '<svg class="mm-i mm-i-expand" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
              '<path d="M1.2 1.2h3.6v1.6H2.8v2H1.2zM7.2 1.2h3.6v3.6H9.2V2.8H7.2zM1.2 7.2h1.6v2h2v1.6H1.2zM9.2 7.2h1.6v3.6H7.2V9.2h2z"/>' +
            '</svg>' +
            '<svg class="mm-i mm-i-collapse" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
              '<path d="M4.8 4.8h1.6V1.2H4.8zM1.2 3.2h1.6v1.6H1.2zM7.2 1.2h1.6v2H7.2zM5.6 7.2h1.6v3.6H5.6zM3.2 8.8H1.2V7.2h2zM7.2 8.8h2v1.6h-2z"/>' +
            '</svg>' +
            '<span class="mm-lbl-fs">Full screen</span>' +
          '</button>' +
        '</nav>';

      dom.world = host.querySelector('.mm-world');
      dom.stage = host.querySelector('.mm-stage');
      dom.scenes = host.querySelector('.mm-scenes');
      dom.live = host.querySelector('.mm-live');
      dom.play = host.querySelector('.mm-play');
      dom.overview = host.querySelector('.mm-overview');
      dom.fs = host.querySelector('[data-mm-fs]');
      dom.main = host.querySelector('.mm-main');
      dom.arrows = host.querySelector('.mm-arrows');
      dom.cross = host.querySelector('.mm-cross');
      dom.pulses = host.querySelector('.mm-pulses');

      pulses.length = 0;
      scenes.length = 0;
      cross.length = 0;

      /* Centre → head, with the prototype's travelling light. The spoke leaves
         the *rendered* circle (state.coreRadius, which coreFit sized) rather
         than a constant, so a fitted label never has a line running through it. */
      model.forEach((item, i) => {
        const left = item.side === 'L';
        const x1 = left ? P.cx - state.coreRadius + 2 : P.cx + state.coreRadius - 2;
        const x2 = left ? item.hx + P.hw / 2 : item.hx - P.hw / 2;
        const mx = (x1 + x2) / 2;
        const dur = 0.8;
        const path = svgEl('path', {
          class: 'mm-link is-main',
          d: 'M' + x1 + ' ' + P.cy + 'C' + mx + ' ' + P.cy + ' ' + mx + ' ' + item.y + ' ' + x2 + ' ' + item.y,
          pathLength: '1',
          'data-mm': item.id
        });
        path.style.setProperty('--d', item.linkDelay.toFixed(2) + 's');
        path.style.setProperty('--dur', dur.toFixed(2) + 's');
        dom.main.appendChild(path);

        const head = svgEl('path', {
          class: 'mm-arrow',
          d: ARROW,
          'data-mm': item.id,
          transform: 'translate(' + x2 + ' ' + item.y + ') rotate(' + (x2 >= x1 ? 0 : 180) + ')'
        });
        head.style.setProperty('--d', (item.linkDelay + dur - 0.1).toFixed(2) + 's');
        dom.arrows.appendChild(head);
        item.linkPath = path;
        item.linkHead = head;

        /* Head → leaf. */
        item.leaves.forEach((leaf, k) => {
          const lx1 = left ? item.hx - P.hw / 2 + 3 : item.hx + P.hw / 2 - 3;
          const lx2 = left ? item.lx + P.lw / 2 : item.lx - P.lw / 2;
          const lmx = (lx1 + lx2) / 2;
          const delay = item.headDelay + 0.55 + k * 0.18;
          const lpath = svgEl('path', {
            class: 'mm-link',
            d: 'M' + lx1 + ' ' + item.y + 'C' + lmx + ' ' + item.y + ' ' + lmx + ' ' + leaf.y + ' ' + lx2 + ' ' + leaf.y,
            pathLength: '1',
            'data-mm': item.id
          });
          lpath.style.setProperty('--d', delay.toFixed(2) + 's');
          lpath.style.setProperty('--dur', '0.6s');
          dom.main.appendChild(lpath);
          const lhead = svgEl('path', {
            class: 'mm-arrow',
            d: ARROW,
            'data-mm': item.id,
            transform: 'translate(' + lx2 + ' ' + leaf.y + ') rotate(' + (lx2 >= lx1 ? 0 : 180) + ')'
          });
          lhead.style.setProperty('--d', (delay + 0.5).toFixed(2) + 's');
          dom.arrows.appendChild(lhead);
          leaf.linkPath = lpath;
          leaf.linkHead = lhead;
        });

        /* The light runs on the main spoke only; a scene's chain has its own. */
        const g = svgEl('g', { class: 'mm-pulse', 'data-mm': item.id });
        g.innerHTML = '<g class="mm-pin" opacity="0"><circle r="' + kx(12).toFixed(1) + '" fill="url(#mm-glow-' + (i % ACCENTS.length) + ')"/>' +
          '<circle class="mm-pc" r="' + kx(2.4).toFixed(2) + '"/></g>';
        dom.pulses.appendChild(g);
        pulses.push({
          path, g, pin: g.firstChild, len: 0,
          speed: 0.11 + Math.random() * 0.07,
          off: Math.random(),
          ready: item.linkDelay + dur
        });
      });

      /* Step → step. Same side: the authored order, drawn as a bracket beside
         the two cards. Across the centre: the prototype's Bézier dipping below
         the head line. */
      links.forEach((link, i) => {
        const delay = lastHead + 0.5 + i * 0.25;
        const path = svgEl('path', {
          class: 'mm-link mm-cross-link' + (link.route === 'spine' ? ' is-spine' : ' is-dashed'),
          pathLength: '1'
        });
        path.style.setProperty('--d', delay.toFixed(2) + 's');
        path.style.setProperty('--dur', '0.7s');
        dom.cross.appendChild(path);
        const headA = svgEl('path', { class: 'mm-arrow is-cross', d: ARROW });
        const headB = svgEl('path', { class: 'mm-arrow is-cross', d: ARROW });
        headA.style.setProperty('--d', (delay + 0.45).toFixed(2) + 's');
        headB.style.setProperty('--d', (delay + 0.45).toFixed(2) + 's');
        dom.arrows.appendChild(headA);
        dom.arrows.appendChild(headB);

        /* One pill per run: three TEXT connectors in a row are one TEXT rail. */
        const previous = links[i - 1];
        const inRun = previous && previous.to === link.from && previous.kind === link.kind && previous.route === link.route;
        let wrap = null;
        if (link.word && !inRun) {
          wrap = document.createElement('span');
          wrap.className = 'mm-xlabel';
          wrap.style.setProperty('--d', (delay + 0.5).toFixed(2) + 's');
          wrap.innerHTML = '<span class="mm-label" data-mm-kind="' + esc(link.kind) + '">' + esc(link.word) + '</span>';
          dom.world.appendChild(wrap);
        }
        cross.push({ link, path, headA, headB, wrap, delay });
      });

      /* A step may label the connector that carries its own leaf fan: s2-3's
         four historical instances are HISTORY, s2-4's timing rail is
         INTERPRETATION — the sitting's own self-check words. */
      model.forEach((item) => {
        if (!item.fan || !item.leaves.length) return;
        const wrap = document.createElement('span');
        wrap.className = 'mm-xlabel is-fan';
        wrap.style.setProperty('--d', (item.headDelay + 1.15).toFixed(2) + 's');
        wrap.innerHTML = '<span class="mm-label" data-mm-kind="' + esc(item.fan) + '">' + esc(CONNECTORS[item.fan]) + '</span>';
        wrap.style.left = item.lx + 'px';
        /* Above the fan, in the leaf column: the only band in that column that
           is empty whatever the leaf cards measure. This is the pre-measure
           estimate — layoutFans() places it against the rendered cards, which
           in a world this narrow wrap to more lines than the prototype's did. */
        wrap.style.top = (Math.min.apply(null, item.leaves.map((leaf) => leaf.y)) - ky(90)) + 'px';
        dom.world.appendChild(wrap);
        item.fanEl = wrap;
      });

      model.forEach((item, i) => {
        const el = host.querySelector('[data-mm-scene="' + item.id + '"]');
        scenes.push({ el, node: item, i, lights: Array.from(el.querySelectorAll('.mm-pl')), t0: 0 });
      });

      wireBlock();
      updateFull();                 // a rebuild must not lose the exit control
    }

    /* ── geometry that has to measure the rendered cards ─────────────────── */
    /* The y of an under-centre cubic at t, for control points a..d. */
    function cubicAt(t, a, b, c, d) {
      const u = 1 - t;
      return a * u * u * u + 3 * b * t * u * u + 3 * c * t * t * u + d * t * t * t;
    }

    function layoutCross() {
      if (state.compact) return;
      cross.forEach((entry) => {
        const a = entry.link.from;
        const b = entry.link.to;
        const cardA = a.headEl && a.headEl.querySelector('.mm-card');
        const cardB = b.headEl && b.headEl.querySelector('.mm-card');
        const yA = a.y + (cardA ? cardA.offsetHeight / 2 : ky(60));
        const yB = b.y - (cardB ? cardB.offsetHeight / 2 : ky(60));
        if (entry.link.route === 'under-centre') {
          const x1 = a.hx;
          const x2 = b.hx;
          /* §2.3: the Bézier dips 160 px below the head line, re-based to H. Two
             schools level with each other would otherwise leave the line grazing
             the centre node, so the dip deepens until the curve's lowest point —
             which is 0.75 of the control-point offset, the curve being symmetric
             — clears the circle by 50 px. */
          const coreBottom = P.cy + state.coreRadius;
          const dip = Math.max(DIP, ((coreBottom + ky(50)) - (yA + yB) / 2) / 0.75);
          entry.path.setAttribute('d', 'M' + x1 + ' ' + yA + 'C' + x1 + ' ' + (yA + dip) + ' ' +
            x2 + ' ' + (yB + dip) + ' ' + x2 + ' ' + yB);
          entry.headA.setAttribute('transform', 'translate(' + x1 + ' ' + yA + ') rotate(-90)');
          entry.headB.setAttribute('transform', 'translate(' + x2 + ' ' + yB + ') rotate(-90)');
          if (entry.wrap) {
            /* Under the curve, not under its midpoint: the curve is still falling
               at either side of it, so the word is placed against its own y at the
               label's own edges — a wide pill otherwise clips its top corner. */
            const mid = (yA + yB) / 2;
            const cx = (x1 + x2) / 2;
            const halfW = entry.wrap.offsetWidth / 2 || kx(60);
            const halfH = entry.wrap.offsetHeight / 2 || ky(14);
            let deepest = 0.75 * dip;
            for (let s = 0; s <= 20; s++) {
              const t = s / 20;
              const px = x1 + (x2 - x1) * (3 * t * t - 2 * t * t * t);
              if (px < cx - halfW || px > cx + halfW) continue;
              deepest = Math.max(deepest, cubicAt(t, yA, yA + dip, yB + dip, yB) - mid);
            }
            entry.wrap.style.left = cx + 'px';
            entry.wrap.style.top = (mid + deepest + ky(12) + halfH).toFixed(1) + 'px';
          }
        } else {
          const dir = a.side === 'L' ? -1 : 1;
          const edge = a.side === 'L' ? a.hx - P.hw / 2 : a.hx + P.hw / 2;
          const bulge = edge + dir * kx(26);
          entry.path.setAttribute('d', 'M' + edge + ' ' + a.y + 'C' + bulge + ' ' + a.y + ' ' + bulge + ' ' + b.y + ' ' + edge + ' ' + b.y);
          entry.headA.setAttribute('transform', 'translate(' + edge + ' ' + a.y + ') rotate(' + (dir > 0 ? 180 : 0) + ')');
          entry.headB.setAttribute('transform', 'translate(' + edge + ' ' + b.y + ') rotate(' + (dir > 0 ? 0 : 180) + ')');
          if (entry.wrap) {
            entry.wrap.style.left = (bulge + dir * kx(30)) + 'px';
            entry.wrap.style.top = ((a.y + b.y) / 2) + 'px';
          }
        }
      });
    }

    /* The fan's connector word sits directly above the topmost leaf card, set
       flush to the leaf column's outer edge. Which band that is depends on how
       many lines the leaf text wrapped to, and a narrower world wraps it to more
       of them, so the offset is measured from the rendered card instead of
       assumed; the flush edge is what keeps a wide word — INTERPRETATION is the
       longest one the vocabulary has — from running under the head cards, where
       the spine's own rail label sits. */
    function layoutFans() {
      if (state.compact) return;
      model.forEach((item) => {
        if (!item.fanEl || !item.leaves.length) return;
        let top = Infinity;
        item.leaves.forEach((leaf, k) => {
          const el = item.leafEls && item.leafEls[k];
          top = Math.min(top, leaf.y - (el ? el.offsetHeight / 2 : 0));
        });
        if (!Number.isFinite(top)) return;
        const halfW = item.fanEl.offsetWidth / 2;
        item.fanEl.style.left = (item.side === 'L' ? EDGE + halfW : W - EDGE - halfW) + 'px';
        item.fanEl.style.top = (top - ky(24) - item.fanEl.offsetHeight / 2).toFixed(1) + 'px';
      });
    }

    /* C1: the scale is measured on the block. Never innerWidth/innerHeight. */
    function fit() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      state.width = w;
      state.height = h;
      /* C11's threshold is a *column* measurement: below 720 px the block is too
         narrow for the stage, so the outline takes over. Full screen is never
         that block — a viewport narrower than the world is exactly the case the
         layer's own `width: min(100%, 100vh * 16/11)` box reports honestly — so
         the classification is left where it was when the view opened and only
         the geometry below follows the new box. */
      if (!state.full) {
        const compact = w > 0 && w < COMPACT_WIDTH;
        if (compact !== state.compact) {
          state.compact = compact;
          host.classList.toggle('is-compact', compact);
        }
      }
      if (!dom.stage) return;
      if (state.compact || !w || !h) {
        dom.stage.style.transform = '';
        return;
      }
      const s = Math.min(w / W, h / H);
      dom.stage.style.transform = 'translate(' + ((w - W * s) / 2).toFixed(2) + 'px,' +
        ((h - H * s) / 2).toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
      layoutCross();
      layoutFans();
    }

    /* ── scenes ─────────────────────────────────────────────────────────── */

    function announce(index) {
      if (!dom.live) return;
      const item = model[index];
      /* Chrome, not copy: the node's own title plus a counter, the same shape the
         story reader uses for "Movement 2 of 5". */
      dom.live.textContent = item
        ? String(item.step.title || item.id) + ' \u00b7 ' + (index + 1) + ' / ' + model.length
        : '';
    }

    function openScene(index, auto) {
      if (state.compact || !scenes[index]) return;
      if (!auto) stopTour();
      /* §8.4's focus gap: remember where the film was opened from, so closing it
         can hand focus back instead of dropping it on <body>. */
      if (!auto) {
        state.opener = host.contains(document.activeElement) ? document.activeElement : null;
      }
      const previous = scenes[state.scene];
      if (previous) {
        previous.el.classList.remove('is-active');
        previous.el.setAttribute('aria-hidden', 'true');
        if (previous.node.branchEl) previous.node.branchEl.classList.remove('is-open');
      }
      state.scene = index;
      state.inScene = true;
      host.classList.add('in-scene');
      const entry = scenes[index];
      void entry.el.offsetWidth;                 // restart the scene's animations
      entry.el.classList.add('is-active');
      entry.el.setAttribute('aria-hidden', 'false');
      entry.t0 = performance.now();
      cam.ts = 1.05;
      if (entry.node.branchEl) entry.node.branchEl.classList.add('is-open');
      announce(index);
      updateHud();
      if (!auto && !state.reduced) {
        /* Closes the prototype's focus gap: focus follows the film, and Escape
           then works from inside the block. */
        const target = entry.el.querySelector('.chain-cite') || entry.el;
        if (target && target.focus) target.focus({ preventScroll: true });
      }
    }

    function closeScene(auto) {
      if (!auto) stopTour();
      if (!state.inScene) return;
      const entry = scenes[state.scene];
      /* Only pull focus back if it is inside the film being closed: a press on
         the block's own Overview control keeps the focus it was given. */
      const hadFocus = !!entry && !!entry.el.contains(document.activeElement);
      if (entry) {
        entry.el.classList.remove('is-active');
        entry.el.setAttribute('aria-hidden', 'true');
        if (entry.node.branchEl) entry.node.branchEl.classList.remove('is-open');
      }
      state.inScene = false;
      state.scene = -1;
      host.classList.remove('in-scene');
      cam.ts = 1;
      announce(-1);
      updateHud();
      if (!auto && hadFocus && state.opener && state.opener.isConnected) {
        state.opener.focus({ preventScroll: true });
      }
      if (!auto) state.opener = null;
    }

    function updateHud() {
      if (dom.play) dom.play.setAttribute('aria-pressed', String(state.tour));
      host.classList.toggle('is-touring', state.tour);
      if (dom.overview) {
        dom.overview.setAttribute('aria-pressed', String(!state.inScene));
        dom.overview.classList.toggle('on', !state.inScene);
      }
    }

    function stopTour() {
      if (!state.tour) return;
      state.tour = false;
      clearTimers();
      updateHud();
    }

    /* Play/Stop: the prototype's tour, paced to the length of each node's own
       film and started once the entrance has settled. */
    function startTour() {
      if (state.compact || state.inScene) {
        if (state.inScene) closeScene(true);
        else return;
      }
      stopTour();
      closeScene(true);
      state.tour = true;
      updateHud();
      let at = 1400;
      model.forEach((item, i) => {
        later(() => { if (state.tour) openScene(i, true); }, at);
        at += 5200;
      });
      later(() => {
        if (!state.tour) return;
        closeScene(true);
        state.tour = false;
        updateHud();
      }, at);
    }

    /* ── the frame loop: camera parallax and the travelling light ───────── */

    function startLoop() {
      if (state.raf || state.reduced || state.compact || document.hidden) return;
      state.last = performance.now();
      state.raf = raf(frame);
    }

    function stopLoop() {
      if (!state.raf) return;
      caf(state.raf);
      state.raf = 0;
    }

    function frame(now) {
      state.raf = 0;
      const dt = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;
      const k = Math.min(1, dt * 3);
      cam.x += (cam.tx - cam.x) * k;
      cam.y += (cam.ty - cam.y) * k;
      cam.s += (cam.ts - cam.s) * Math.min(1, dt * 2);
      if (!state.compact && dom.world) {
        dom.world.style.transform = 'translate3d(' + cam.x.toFixed(2) + 'px,' + cam.y.toFixed(2) +
          'px,0) scale(' + cam.s.toFixed(4) + ')';
        if (dom.scenes) {
          dom.scenes.style.transform = 'translate3d(' + (-cam.x * 0.6).toFixed(2) + 'px,' +
            (-cam.y * 0.6).toFixed(2) + 'px,0)';
        }
      }
      updateLights(now);
      state.raf = raf(frame);
    }

    function updateLights(now) {
      if (state.inScene) {
        const entry = scenes[state.scene];
        if (!entry) return;
        /* The brightness profile is [[0,1],[1,1]] — an unbroken line — unless a
           spec declares one, which is what a sequence means. */
        const profile = entry.node.step.scene && Array.isArray(entry.node.step.scene.brightness) &&
          entry.node.step.scene.brightness.length
          ? entry.node.step.scene.brightness
          : [[0, 1], [1, 1]];
        const t = (now - entry.t0) / 1000 - 1.6;
        if (t < 0) return;
        const f = (t / 5) % 1;
        const n = entry.node.leaves.length || 1;
        /* The run the light travels: the same chain measure sceneHtml laid the
           nodes out on, first node's centre to last node's centre. */
        const first = CHAIN_X0 + CHAIN_SPAN * 0.5 / n;
        const last = CHAIN_X0 + CHAIN_SPAN * (n - 0.5) / n;
        const count = entry.lights.length;
        entry.lights.forEach((circle, k) => {
          const ff = f - k * 0.011;
          if (ff < 0) { circle.setAttribute('opacity', '0'); return; }
          let value = profile[profile.length - 1][1];
          for (let i = 1; i < profile.length; i++) {
            if (ff <= profile[i][0]) {
              const a = profile[i - 1];
              const b = profile[i];
              value = a[1] + (b[1] - a[1]) * ((ff - a[0]) / ((b[0] - a[0]) || 1));
              break;
            }
          }
          const o = value * (1 - k / count) * Math.min(1, ff * 14) * Math.min(1, (1 - ff) * 10);
          circle.setAttribute('cx', (first + ff * (last - first)).toFixed(1));
          circle.setAttribute('opacity', o.toFixed(3));
        });
        return;
      }
      pulses.forEach((pulse) => {
        const elapsed = (now - state.started) / 1000 - pulse.ready;
        if (elapsed < 0) return;
        if (!pulse.len) {
          try { pulse.len = pulse.path.getTotalLength(); } catch (e) { return; }
          if (!pulse.len) return;
        }
        const f = (elapsed * pulse.speed + pulse.off) % 1;
        const point = pulse.path.getPointAtLength(f * pulse.len);
        pulse.g.setAttribute('transform', 'translate(' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ')');
        pulse.pin.setAttribute('opacity', Math.sin(Math.PI * f).toFixed(3));
      });
    }

    /* ── wiring ─────────────────────────────────────────────────────────── */

    /* C20: focus is a selected state, not a hover state. One code path serves
       the mouse, the keyboard and the touch screen. */
    function setFocus(id) {
      state.focus = id || '';
      if (state.compact) return;
      if (id) dom.world.setAttribute('data-mm-focus', id);
      else dom.world.removeAttribute('data-mm-focus');
      model.forEach((item) => {
        const on = !!id && item.id === id;
        if (item.branchEl) item.branchEl.classList.toggle('is-focus', on);
        if (item.linkPath) item.linkPath.classList.toggle('is-focus', on);
        if (item.linkHead) item.linkHead.classList.toggle('is-focus', on);
        item.leaves.forEach((leaf) => {
          if (leaf.linkPath) leaf.linkPath.classList.toggle('is-focus', on);
          if (leaf.linkHead) leaf.linkHead.classList.toggle('is-focus', on);
        });
      });
    }

    function branchOf(target) {
      const el = target && target.closest ? target.closest('.mm-branch') : null;
      return el ? el.getAttribute('data-mm') : '';
    }

    function onPointerDown(event) { pointerKind = event.pointerType || 'mouse'; }

    function onPointerOver(event) {
      if (state.inScene || state.compact) return;
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const id = branchOf(event.target);
      if (id) setFocus(id);
    }

    function onPointerOut(event) {
      if (state.inScene || state.compact) return;
      const related = event.relatedTarget;
      if (related && related.closest && related.closest('.mm-branch')) return;
      if (!state.tap) setFocus('');
    }

    function onFocusIn(event) {
      const id = branchOf(event.target);
      if (id) setFocus(id);
    }

    function onFocusOut(event) {
      const next = event.relatedTarget;
      if (next && next.closest && next.closest('.mm-branch')) return;
      if (!state.tap) setFocus('');
    }

    function onPointerMove(event) {
      if (state.compact || state.reduced) return;
      if (event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      cam.tx = -((event.clientX - rect.left) / rect.width - 0.5) * 18;
      cam.ty = -((event.clientY - rect.top) / rect.height - 0.5) * 12;
    }

    function onClick(event) {
      const target = event.target;
      const button = target.closest ? target.closest('[data-mm-open]') : null;
      if (button && host.contains(button)) {
        const id = button.getAttribute('data-mm-open');
        const index = model.findIndex((item) => item.id === id);
        if (index < 0) return;
        if (pointerKind !== 'mouse' && state.focus !== id) {
          state.tap = id;
          setFocus(id);
          return;
        }
        state.tap = '';
        openScene(index);
        return;
      }
      /* A citation chip belongs to the page, not to the block: it opens the
         sitting's reference row, which lives in the lesson at z-index 10 while
         this layer is at 180 — so on a full screen the row would open *under* an
         opaque map and be unreachable. The stacking is the brief's ladder (the
         map is below the reader and above the lesson), so the layer is the thing
         that gives way: the block returns the page, and the row the reader asked
         for is scrolled into view by study-app.js's own handler, which runs
         after this one. The film stays open, so a second Escape is not needed to
         get back to it. */
      if (state.full && target.closest && target.closest('.chain-cite')) {
        exitFull(true);
        return;
      }
      if (state.inScene && target.closest && target.closest('.mm-scene')) {
        if (!target.closest('.chain-cite')) closeScene();
        return;
      }
      if (state.inScene) { closeScene(); return; }
      /* Full screen: a press on the stage's own ground leaves it, the same way a
         press on the ground closes a film. "The ground" is everything inside the
         block that is not chrome and not a node — measured off the world's
         wrapper rather than off the viewport, so no control can be a dead zone
         and none of them counts as ground. */
      if (state.full) {
        const wrapper = dom.world ? dom.world.parentNode : null;
        if (wrapper && target.closest && wrapper.contains(target) && !target.closest('[data-mm-open]')) {
          exitFull(true);
          return;
        }
      }
      state.tap = '';
      setFocus('');
    }

    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      /* Another layer owns the keyboard while it is open. The story reader
         arbitrates with anotherLayerOwnsEscape() from its own capture-phase
         listener, which runs before this one; the modals below run their own. */
      if (document.querySelector('.story-read:not([hidden])')) return;
      /* The reference list is presented as a panel above everything while a block
         is full screen (study.html, `html.dfx-cite-open`). It sits at 240, above
         this map's 180, and owns Escape while it is up: a citation chip opened
         from a full-screen diagram or map puts a reference in front of the
         reader, and closing the map behind it would take the reference away with
         it. One Escape closes the panel, the next the map. */
      if (document.documentElement.classList.contains('dfx-cite-open')) return;
      const modal = document.querySelector('#infographic-modal, #certificate-review-modal, #certificate-panel');
      if (modal && !modal.hidden) return;

      const key = event.key;
      if (key === 'Escape') {
        if (state.inScene) {
          /* This block is the innermost layer, so it owns Escape — the same
             claim the story reader makes when it is the one on top. */
          event.preventDefault();
          event.stopPropagation();
          closeScene();
          return;
        }
        if (state.full) {
          /* Escape takes one layer at a time: the film first, the map second.
             The reader is opened *from* the film's own cite chip, so the film
             is always closed before a reader exists; and while a reader is open
             the guard above has already stood this listener down, which is the
             other half of wireStory's `anotherLayerOwnsEscape()` contract —
             there, and here, one Escape closes exactly one thing. */
          event.preventDefault();
          event.stopPropagation();
          exitFull(true);
          return;
        }
        if (state.focus) { state.tap = ''; setFocus(''); }
        return;
      }
      if (key === 'Tab' && state.full) { trapFocus(event); return; }
      if (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
        const forward = key === 'ArrowRight' || key === 'ArrowDown';
        if (state.inScene) {
          openScene((state.scene + (forward ? 1 : model.length - 1)) % model.length);
          return;
        }
        const cards = Array.from(host.querySelectorAll('[data-mm-open]'));
        if (!cards.length) return;
        const at = cards.indexOf(document.activeElement);
        const next = at < 0
          ? (forward ? 0 : cards.length - 1)
          : (at + (forward ? 1 : -1) + cards.length) % cards.length;
        if (cards[next]) cards[next].focus();
        return;
      }
      /* Enter and Space activate a focused card natively. Space on the block
         itself must not scroll the page: the block is a focusable widget, and
         the page below it owns the arrow keys. */
      if ((key === ' ' || key === 'Spacebar') && document.activeElement === host) {
        event.preventDefault();
      }
    }

    /* ── full screen ────────────────────────────────────────────────────────
       The map was drawn as a page and ported into a column, where `fit()`
       scales its 960x660 world down to ~0.81 and renders the 15.5 px leaf text
       at ~12.6 px. Full screen is the surface it was designed for: at
       1440x1000 the frame is 1440x990, `min(w/W, h/H)` resolves to 1.5, and the
       same words read at 23.25 px.

       The mechanism is `position: fixed; inset: 0` on the host, not the
       Fullscreen API: it escapes ancestor overflow exactly as `.story-read`
       does, needs no user gesture, and behaves the same in every engine. The
       host becomes the full-viewport layer and the `.mm-viewport` inside it the
       world's own 16:11 box, centred — so the block's box is the *only* thing
       that changes: no reparenting, no second overlay, no second render path,
       and nothing caches the block size, so `fit()` (which already runs from
       the host's ResizeObserver) does the rest. The Fullscreen API would be an
       enhancement on top; it is deliberately not used, because it would hand
       Escape to the browser and take it away from the arbitration below.

       Stacking: 180, below the story reader (220) and above the insight cards
       (~72) — see the comment on `.mm.is-full` in study.html. */

    function focusables() {
      return Array.from(host.querySelectorAll(FOCUSABLE)).filter((el) => !el.hidden);
    }

    /* Options: the block's controls. The trap is what makes "the focus never
       escapes to the page behind" true rather than hopeful. */
    function trapFocus(event) {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      event.preventDefault();
      if (!host.contains(active)) { first.focus(); return; }
      const at = items.indexOf(active);
      if (at < 0) { (event.shiftKey ? last : first).focus(); return; }
      const step = event.shiftKey ? -1 : 1;
      items[(at + step + items.length) % items.length].focus();
    }

    /* The page behind must not scroll while the view is open. The reader locks
       the same way, so this only ever removes the class it added: if a reader
       is still open on top (a reference row or a scene opened from a chip), the
       lock is its property and stays. */
    function unlockScroll() {
      if (document.querySelector('.story-read:not([hidden])')) return;
      document.documentElement.classList.remove('mm-fullscreen-open');
    }

    function onScroll() {
      if (!state.full) return;
      /* And if an engine scrolls the block anyway, the world would move off the
         origin fit() measured, so it is pinned back. */
      if (host.scrollTop) host.scrollTop = 0;
      if (host.scrollLeft) host.scrollLeft = 0;
    }

    /* A sitting switch replaces #sheet-article's innerHTML, which detaches the
       block *before* anything can call destroy() on it — measured: the figure
       the API was mounted on is gone by the time renderSheetDiagrams() looks for
       it, so destroy() never runs and the page would stay locked with nothing on
       screen to release it. A detached node reports it through the observer that
       was watching the whole time, and the undo is the same one destroy() does. */
    function onTreeChange() {
      if (!state.full || host.isConnected) return;
      state.full = false;
      host.classList.remove('is-full');
      document.documentElement.classList.remove('mm-fullscreen-open');
    }

    function updateFull() {
      if (!dom.fs) return;
      dom.fs.setAttribute('aria-pressed', String(state.full));
      dom.fs.setAttribute('aria-label', state.full ? 'Exit full screen' : 'Full screen');
      const label = dom.fs.querySelector('.mm-lbl-fs');
      if (label) label.textContent = state.full ? 'Exit full screen' : 'Full screen';
    }

    function enterFull() {
      if (state.compact || state.full) return;
      state.full = true;
      state.fsOpener = document.activeElement;
      /* The host becomes the whole of what is on screen. `role` and
         `aria-label` are restored from what the block had — the label is the
         diagram's own title and must survive — and nothing is invented for the
         heading, because the block has no heading contract to reuse. */
      state.hostRole = host.getAttribute('role') || 'group';
      host.classList.add('is-full');
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      document.documentElement.classList.add('mm-fullscreen-open');
      updateFull();
      /* The class change has to be laid out before the deferred pass reads the
         box: the ResizeObserver dedupes on the size `fit()` last stored, so a
         read taken before the browser has laid the new box out would compare
         the full-screen box against itself and the observer would skip. */
      void host.offsetWidth;
      const after = () => {
        if (!destroyed && state.full) {
          fit();
          wake();
          if (dom.fs) dom.fs.focus({ preventScroll: true });
        }
      };
      raf(() => raf(after));
      later(after, 80);
    }

    function exitFull(refocus) {
      if (!state.full) return;
      state.full = false;
      host.classList.remove('is-full');
      /* The overlay scrolls the block to bring a film's control into view. The
         class already un-makes the block a scroll container, but the offsets it
         left behind are put back to zero so the column comes up where it was. */
      if (host.scrollTop) host.scrollTop = 0;
      if (host.scrollLeft) host.scrollLeft = 0;
      host.setAttribute('role', state.hostRole || 'group');
      /* Not `aria-label`: the label belongs to the block's own title and is
         already there. An empty aria-modal is worse than none. */
      host.removeAttribute('aria-modal');
      const opener = state.fsOpener;
      state.fsOpener = null;
      updateFull();
      unlockScroll();
      if (refocus && opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true });
      } else if (refocus && host.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') document.activeElement.blur();
      }
      if (destroyed) return;
      /* The column's geometry is restored by un-setting the class, so `fit()`
         has to run after the browser has laid the block out again — one frame
         after. The ResizeObserver usually gets there first and then no-ops,
         because its dedupe compares against the size `fit()` last stored; the
         reflow below is what makes that comparison see the column again. */
      state.width = 0;
      state.height = 0;
      void host.offsetWidth;
      raf(() => { if (!destroyed && !state.full) fit(); });
      later(() => { if (!destroyed && !state.full) fit(); }, 120);
    }

    function onFull() {
      if (state.full) exitFull(true);
      else enterFull();
    }

    function wake() {
      host.classList.remove('is-idle');
      window.clearTimeout(state.idle);
      state.idle = window.setTimeout(() => {
        if (!state.compact && !state.inScene) host.classList.add('is-idle');
      }, IDLE_MS);
    }

    function play() {
      state.visible = true;
      state.started = performance.now();
      if (state.reduced) {
        host.classList.add('is-visible');
      } else {
        host.classList.remove('is-visible');
        /* Two frames: one to commit the hidden state, one to start the run. */
        raf(() => { raf(() => host.classList.add('is-visible')); });
      }
      startLoop();
    }

    function onReplay(event) {
      if (event) event.preventDefault();
      closeScene(true);
      state.reduced = !!(reduceMQ && reduceMQ.matches);
      play();
    }

    function onReduceChange() {
      state.reduced = !!(reduceMQ && reduceMQ.matches);
      if (state.reduced) {
        host.classList.add('is-visible');
        stopLoop();
      } else if (state.visible) {
        startLoop();
      }
    }

    function onVisibility() {
      if (document.hidden) stopLoop();
      else if (state.visible && !state.reduced) startLoop();
    }

    function wireBlock() {
      model.forEach((item) => {
        item.branchEl = host.querySelector('.mm-branch[data-mm="' + item.id + '"]');
        item.headEl = item.branchEl ? item.branchEl.querySelector('.mm-head') : null;
        /* Leaves render in `item.leaves` order, one `.mm-leaf` each. */
        item.leafEls = item.branchEl ? Array.from(item.branchEl.querySelectorAll('.mm-leaf')) : [];
      });
      host.addEventListener('keydown', onKey);
      host.addEventListener('click', onClick);
      host.addEventListener('pointerdown', onPointerDown, { passive: true });
      host.addEventListener('pointerover', onPointerOver, { passive: true });
      host.addEventListener('pointerout', onPointerOut, { passive: true });
      host.addEventListener('pointermove', onPointerMove, { passive: true });
      host.addEventListener('focusin', onFocusIn);
      host.addEventListener('focusout', onFocusOut);
      /* Belt as well as braces for the layer's own no-scroll rule: an engine
         that scrolled the block anyway would move the world off the origin
         `fit()` measured, so it is pinned back. Nothing in the column scrolls
         this element (its content is exactly its own box), so this is inert
         outside full screen. */
      host.addEventListener('scroll', onScroll, { passive: true });
      ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((name) => host.addEventListener(name, wake, { passive: true }));
      if (dom.play) dom.play.addEventListener('click', () => { if (state.tour) stopTour(); else startTour(); });
      if (dom.overview) dom.overview.addEventListener('click', () => { stopTour(); closeScene(); state.tap = ''; setFocus(''); });
      if (dom.fs) dom.fs.addEventListener('click', onFull);
      updateFull();
      updateHud();
      wake();
    }

    function unwireBlock() {
      host.removeEventListener('keydown', onKey);
      host.removeEventListener('click', onClick);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointerover', onPointerOver);
      host.removeEventListener('pointerout', onPointerOut);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('focusin', onFocusIn);
      host.removeEventListener('focusout', onFocusOut);
      ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((name) => host.removeEventListener(name, wake));
      host.removeEventListener('scroll', onScroll);
      if (dom.fs) dom.fs.removeEventListener('click', onFull);
    }

    /* ── observers and lifecycle ───────────────────────────────────────── */

    function observe() {
      /* The figure's own Replay control is reused (C19), so the block needs no
         third pill for the most common action. renderSheetDiagrams inserts one
         button per figure, immediately after it: take that one, not the first
         one in the article, which belongs to an earlier diagram. */
      const figure = host.closest ? host.closest('figure.chain') : null;
      const sibling = figure ? figure.nextElementSibling : null;
      replayEl = sibling && sibling.matches && sibling.matches('[data-chain-replay]')
        ? sibling
        : (figure && figure.parentNode ? figure.parentNode.querySelector('[data-chain-replay]') : null);
      if (replayEl) replayEl.addEventListener('click', onReplay);

      observers = [];
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => {
          if (host.clientWidth === state.width && host.clientHeight === state.height) return;
          fit();
        });
        ro.observe(host);
        observers.push(ro);
      }
      if ('MutationObserver' in window) {
        const mo = new MutationObserver(onTreeChange);
        mo.observe(document.body, { childList: true, subtree: true });
        observers.push(mo);
      }
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          const hit = entries.some((entry) => entry.isIntersecting);
          if (hit && !state.visible) play();
          if (!hit) stopLoop();
          else if (state.visible && !state.reduced) startLoop();
        }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
        io.observe(host);
        observers.push(io);
      } else {
        play();
      }
      document.addEventListener('visibilitychange', onVisibility);
      if (reduceMQ) {
        if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
        else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);
      }
    }

    function refresh() {
      if (destroyed) return;
      unwireBlock();
      build();
      fit();
      /* The controls were rebuilt, so an opener remembered from before this
         call is a detached node: focus goes back to the rebuilt exit control
         instead of to nothing. */
      if (state.full) state.fsOpener = dom.fs;
      /* C12: reduced motion shows the map synchronously; a re-render of an
         already-revealed block keeps it revealed. */
      if (state.reduced || state.visible) {
        if (state.reduced) host.classList.add('is-visible');
        else play();
      }
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stopTour();
      closeScene(true);
      /* Teardown must undo the full-screen state in full: the class, the scroll
         lock, the role it swapped and the focus it is holding — a sitting switch
         while the view is open must not leave the page locked or a torn-down
         node on top of it. `state.full` is cleared before the deferred fitters
         can run, so each of them sees the guard and does nothing. */
      state.full = false;
      state.fsOpener = null;
      host.classList.remove('is-full');
      host.setAttribute('role', state.hostRole || 'group');
      host.removeAttribute('aria-modal');
      document.documentElement.classList.remove('mm-fullscreen-open');
      stopLoop();
      clearTimers();
      window.clearTimeout(state.idle);
      if (observers) observers.forEach((observer) => observer.disconnect());
      observers = null;
      document.removeEventListener('visibilitychange', onVisibility);
      if (reduceMQ) {
        if (reduceMQ.removeEventListener) reduceMQ.removeEventListener('change', onReduceChange);
        else if (reduceMQ.removeListener) reduceMQ.removeListener(onReduceChange);
      }
      if (replayEl) replayEl.removeEventListener('click', onReplay);
      replayEl = null;
      unwireBlock();
      pulses.length = 0;
      scenes.length = 0;
      cross.length = 0;
      host.innerHTML = '';
      host.classList.remove('mm', 'is-visible', 'is-compact', 'in-scene', 'is-idle', 'is-touring');
      host.removeAttribute('data-mm-focus');
    }

    /* ── start ──────────────────────────────────────────────────────────── */
    host.classList.add('mm');
    if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
    if (!host.getAttribute('role')) host.setAttribute('role', 'group');
    if (title && !host.getAttribute('aria-label')) host.setAttribute('aria-label', title);

    build();
    fit();
    observe();

    /* C12: with reduced motion there is nothing to wait for, so the block is
       revealed synchronously and the loop never starts. Otherwise the map is
       revealed when it first comes into view. */
    if (state.reduced) {
      state.visible = true;
      host.classList.add('is-visible');
    } else if (host.getBoundingClientRect().top < window.innerHeight * 0.95) {
      play();
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!destroyed) fit(); }).catch(() => {});
    }

    return { destroy, resize: fit, refresh };
  }

  window.MindMap = { create, CONNECTORS };
})();
