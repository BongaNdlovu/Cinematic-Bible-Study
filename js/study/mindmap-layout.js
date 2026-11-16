(function () {
  'use strict';

  const W = 960, H = 660;
  const KX = W / 1600, KY = H / 900;
  const kx = (v) => v * KX;                 // 1600-wide design units → world
  const ky = (v) => v * KY;                 // 900-tall design units → world y
  /* The head and leaf card widths are declared in css/study/07-mindmap.css (.mm-head
     .mm-card / .mm-leaf .mm-card); the link endpoints below depend on them, so
     both must move together. */
  const HW = 160, LW = 195;
  const GAP = 16;                           // between a card and its neighbour
  const EDGE = 12;                          // world margin outside the leaf columns
  /* The centre circle. One diameter for a one-, two- or three-line label: the
     type is fitted to it (coreFit), so a long diagram title shrinks rather than
     pushing the fan columns off the world. */
  const CORE_D = 160;
  /* The circle sits at the world's centre; the leaf and head columns step
     inward from each edge by EDGE, LW, GAP and HW. */
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
  const SPACING_L = ky(150), SPACING_R = ky(136);
  const Y_MIN = ky(90), Y_MAX = ky(810);    // the range a spec's `y` may take
  /* The four self-check headings are the only words this file renders without a
     spec field behind them. */
  const CONNECTORS = { text: 'TEXT', history: 'HISTORY', interpretation: 'INTERPRETATION', christ: 'CHRIST' };

  function arrowhead(len, half) {
    return 'M0 0L' + (-len).toFixed(2) + ' ' + (-half).toFixed(2) + 'L' +
      (-len * 0.68).toFixed(2) + ' 0L' + (-len).toFixed(2) + ' ' + half.toFixed(2) + 'Z';
  }
  function connectorWord(kind) { return CONNECTORS[String(kind || '').toLowerCase()] || ''; }
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
        /* The object form of a leaf is not supported: extract_claim_units.mjs
           could not see its copy. A non-string leaf is skipped, never
           stringified. */
        if (typeof point === 'string' && point.trim()) texts.push(point);
      });
      const pitch = item.side === 'L' ? SPACING_L : SPACING_R;
      const m = texts.length;
      item.leaves = texts.map((text, li) => {
        /* The fan is centred on its head, so a lone leaf sits level with it. */
        const off = (li - (m - 1) / 2) * pitch;
        return { text, y: Math.max(ky(60), Math.min(ky(860), item.y + (item.up ? -off : off))) };
      });
    });

    return items;
  }
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
  function titleFit(title) {
    const len = String(title || '').length || 1;
    return Math.max(kx(40), Math.min(kx(150), Math.floor((W * 0.78) / (0.55 * len))));
  }
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
  function nameFit(label) {
    for (let fs = 30; fs > 15; fs -= 1) {
      if (nameLines(label, fs) <= 3) return fs;
    }
    return 15;
  }

  window.MindMapLayout = Object.freeze({ W, H, KX, KY, kx, ky, HW, LW, GAP, EDGE, CORE_D, P, SPACING_L, SPACING_R, Y_MIN, Y_MAX, CONNECTORS, arrowhead, connectorWord, place, splitLines, coreFit, titleFit, nameLines, nameFit });
})();
