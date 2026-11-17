(function () {
  'use strict';

  const { W, H, KX, kx, ky, EDGE, P, CONNECTORS, arrowhead, coreFit, titleFit, nameFit } = window.MindMapLayout;
  /* fit() scales this world to the block, so world type reaches the reader at
     size × blockWidth / W.
     An 846 px column gives about 0.88: 15.5 px text reads at about 13.6 px.
     Everything below derives from W and H; 1600×900 design units are converted
     through KX and KY. */
  const NS = 'http://www.w3.org/2000/svg';
  const Y = ky(520);                        // every scene's chain line
  const ARROW = arrowhead(kx(11), kx(5.5));
  const SC_ARROW = arrowhead(kx(14), kx(6.5));
  /* The scene chain spans 120 to 1480 design units. */
  const CHAIN_X0 = kx(120), CHAIN_SPAN = kx(1360);
  /* Below this block width the map becomes an outline. Measured on the block,
     never the viewport. */
  const COMPACT_WIDTH = 720;
  const IDLE_MS = 3800;                     // idle time before the HUD fades
  const DIP = ky(160);                      // how far a cross-centre curve dips

  const CHEVRON = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
    '<path d="M4.2 1.6 8.6 6l-4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* Four step accents, so a four-step spine never repeats one. They are
     block-local, leaving --chain-gold to .chain-cite and .chain-title. */
  const ACCENTS = [
    { hex: '#dcb257', rgb: '220,178,87' },
    { hex: '#86a6c4', rgb: '134,166,196' },
    { hex: '#d98563', rgb: '217,133,99' },
    { hex: '#9ccf8f', rgb: '156,207,143' }
  ];

  function esc(value) { return window.SiteCore.escapeHtml(value); }

  function svgEl(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
    return node;
  }

  function make(deps) {
    const { caf, cam, canResolve, citeFn, clearTimers, cross, dom, host, later, links, model, pulses, raf, scenes, spec, state, title, updateFull, wireBlock } = deps;

    function citeChip(label) {
      if (!label) return '';
      if (citeFn) return citeFn(label, canResolve);
      return '<span class="chain-cite is-flat">' + esc(label) + '</span>';
    }

    /* Print hides buttons and darkens #sheet-article, so the map prints as a
       plain list of its steps instead. */
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
        /* The cite chip is a sibling of the button, never inside it, so no
           control nests in another. */
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

    /* A node's film is built only from its own fields: role as kicker, title as
       the per-letter line, cite chip as badge, leaves as the chain, the
       diagram's note as caption.
       Positions use CHAIN_X0/CHAIN_SPAN and Y; type goes through KX. */
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
          /* The full-screen control lives in the bar, so it takes the bar's
             palette. The bar's own selector excludes it (`:not([data-mm-fs])`). */
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

      /* The spoke leaves the rendered circle (state.coreRadius), so a fitted
         label never has a line through it. */
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

      /* Step → step. Same side: a bracket beside the two cards. Across the
         centre: a curve dipping below the head line. */
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
        /* Pre-measure estimate; layoutFans() places it against the rendered
           cards. */
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
          /* The curve dips DIP below the head line, deeper if needed so its
             lowest point (0.75 of the control offset) clears the circle by 50
             px. */
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

    /* The connector word sits above the topmost leaf card, flush to the
       column's outer edge, measured from the rendered card.
       The flush edge keeps a long word (INTERPRETATION) from running under the
       head cards. */
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

    /* The scale is measured on the block, never innerWidth/innerHeight. */
    function fit() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      state.width = w;
      state.height = h;
      /* Compact is a column measurement. In full screen the classification
         stays as it was when the view opened; only the geometry follows the new
         box. */
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
      /* Remember where the film was opened from, so closing it hands focus back
         instead of dropping it on <body>. */
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
        /* Focus follows the film, so Escape works from inside the block. */
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

    /* Play/Stop tour: each node's film plays for its own length, starting after
       the entrance settles. */
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

    /* Focus is a selected state, not a hover state: one code path for mouse,
       keyboard and touch. */
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

    return { build, closeScene, fit, openScene, setFocus, startLoop, startTour, stopLoop, stopTour, updateHud };
  }

  window.MindMapRender = Object.freeze({ NS, Y, ARROW, SC_ARROW, CHAIN_X0, CHAIN_SPAN, COMPACT_WIDTH, IDLE_MS, DIP, CHEVRON, ACCENTS, esc, svgEl, make });
})();
