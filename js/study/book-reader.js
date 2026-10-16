(function () {
  'use strict';

  var VIEW_KEY = 'daniel_book_view';
  var POS_KEY = 'daniel_book_pos_';
  var TOP_PAD = 40;
  var BOT_PAD = 44;
  var FRAME_V = 18;
  var WIDE_GAP = 84;
  var RE_MS = 120;
  var FLOW_MS = 150;
  var SNAP_MS = 90;
  var WHEEL_MS = 400;
  var SWIPE_MS = 350;
  var SWIPE_PX = 40;
  var EDGE = 0.16;
  var PLATE_CAP = 2.4;
  var RISE_MAX = 14;
  var RISE_GAP = 45;
  var RISE_LIFE = 900;
  var PLATE_SEL = 'figure[data-diagram], figure.lesson-infographic, .checkpoint-plate';
  var DIAGRAM_SEL = 'figure[data-diagram]';
  var REPLAY_SEL = '[data-chain-replay]';
  var PART_SEL = '.part-header';
  var FLOW_ATTRS = ['class', 'hidden', 'open', 'aria-expanded', 'data-cardmin-hidden'];
  var KEY_BLOCK_SEL = '.br-plate, .chain, .mm, .story-stage, .story-read, [role="dialog"], [aria-modal="true"]';
  var CLICK_SKIP_SEL = 'a, button, input, textarea, select, label, [contenteditable], .term-gloss, [data-term-index], .br-plate';
  var PATH_NEXT = 'M9 5l7 7-7 7';
  var PATH_PREV = 'M15 5l-7 7 7 7';
  var DASH = '–';

  var session = null;
  var last = null;
  var memoryView = null;

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function isWhitespace(node) {
    return node.nodeType === 3 && !/\S/.test(node.nodeValue);
  }

  function isPlate(node) {
    if (node.nodeType !== 1) return false;
    return node.matches(PLATE_SEL) || !!node.querySelector(DIAGRAM_SEL);
  }

  function elementChildren(node) {
    return Array.prototype.filter.call(node.childNodes, function (child) {
      return child.nodeType === 1;
    });
  }

  function classTokens(value) {
    return String(value || '').split(/\s+/).filter(Boolean);
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function readStore(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      return false;
    }
    return true;
  }

  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail === undefined ? null : detail }));
  }

  function view() {
    var v = readStore(VIEW_KEY);
    if (v === null) v = memoryView;
    return v === 'scroll' ? 'scroll' : 'book';
  }

  function setPref(v) {
    memoryView = v;
    writeStore(VIEW_KEY, v);
  }

  function savedAnchor(sheet) {
    if (sheet === null) return null;
    var raw = readStore(POS_KEY + sheet);
    if (raw === null) return null;
    var n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }

  function saveAnchor(sheet, idx) {
    if (sheet === null || idx === null || idx < 0) return;
    writeStore(POS_KEY + sheet, String(idx));
  }

  function normalize(article, opts) {
    var o = opts || {};
    var sheet = typeof o.sheetIndex === 'number' && !isNaN(o.sheetIndex) ? o.sheetIndex : parseInt(article.getAttribute('data-sheet-index'), 10);
    if (isNaN(sheet)) sheet = null;
    var titleNode = document.getElementById('sheet-title');
    var fallback = titleNode ? titleNode.textContent : '';
    return {
      sheetIndex: sheet,
      title: String(o.title || fallback || 'Lesson').replace(/\s+/g, ' ').trim(),
      kicker: String(o.kicker || '').replace(/\s+/g, ' ').trim(),
      restore: !!o.restore
    };
  }

  function touch(s, node) {
    if (s.touched.has(node)) return;
    s.touched.set(node, { cls: node.getAttribute('class'), style: node.getAttribute('style') });
  }

  function restoreTouched(s) {
    s.touched.forEach(function (rec, node) {
      if (rec.cls === null) node.removeAttribute('class');
      else node.setAttribute('class', rec.cls);
      if (rec.style === null) node.removeAttribute('style');
      else node.setAttribute('style', rec.style);
    });
    s.touched.clear();
  }

  function createSession(article, opts) {
    return {
      article: article,
      opts: opts,
      originals: Array.prototype.slice.call(article.childNodes),
      articleWidth: article.clientWidth || 0,
      touched: new Map(),
      stops: [],
      items: [],
      blocks: [],
      risers: [],
      parts: [],
      marks: [],
      stepInfo: [],
      root: null,
      bar: null,
      desk: null,
      book: null,
      paper: null,
      view: null,
      track: null,
      foot: null,
      rail: null,
      railFill: null,
      pos: null,
      runL: null,
      runR: null,
      folioL: null,
      folioR: null,
      sweep: null,
      shadeL: null,
      shadeR: null,
      fold: null,
      prevBtn: null,
      nextBtn: null,
      nextText: null,
      scrollBtn: null,
      fullBtn: null,
      kickerEl: null,
      titleEl: null,
      flowWatch: null,
      flowTimer: 0,
      Vw: 0,
      Vh: 0,
      mo: 0,
      gap: 0,
      col: 0,
      spread: 2,
      mode: 'spread',
      step: 0,
      steps: 0,
      pages: 0,
      page: 0,
      immersive: false,
      fsOwned: false,
      endFired: false,
      animId: 0,
      animating: false,
      snapTimer: 0,
      riseTimer: 0,
      reTimer: 0,
      openT: 0,
      wheelAt: 0,
      swipeAt: 0,
      drag: null
    };
  }

  function listen(s, target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    s.stops.push(function () {
      target.removeEventListener(type, fn, opts);
    });
  }

  function stopAnim(s) {
    if (s.animId) cancelAnimationFrame(s.animId);
    s.animId = 0;
    s.animating = false;
    if (s.paper) {
      s.paper.style.removeProperty('--br-leaf');
      s.paper.style.removeProperty('--br-leaf-a');
    }
  }

  function stopAll(s) {
    stopAnim(s);
    clearTimeout(s.snapTimer);
    clearTimeout(s.riseTimer);
    clearTimeout(s.reTimer);
    clearTimeout(s.flowTimer);
    clearTimeout(s.openT);
    s.stops.forEach(function (fn) {
      fn();
    });
    s.stops = [];
  }

  function svgArrow(path) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
  }

  function turnButton(cls, label, path) {
    var b = el('button', cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-disabled', 'false');
    b.appendChild(el('span', 'br-turn-text'));
    b.appendChild(svgArrow(path));
    return b;
  }

  function toolButton(label, action) {
    var b = el('button', 'br-tool');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('data-br', action);
    return b;
  }

  function build(s) {
    s.root = el('section', 'br-root');
    s.root.setAttribute('aria-label', 'Lesson as a book');

    s.bar = el('header', 'br-bar');
    var heading = el('div', 'br-heading');
    s.kickerEl = el('span', 'br-kicker');
    s.kickerEl.textContent = s.opts.kicker;
    s.titleEl = el('h2', 'br-title');
    s.titleEl.textContent = s.opts.title;
    heading.appendChild(s.kickerEl);
    heading.appendChild(s.titleEl);
    var tools = el('div', 'br-tools');
    s.scrollBtn = toolButton('Scroll view', 'scroll');
    s.fullBtn = toolButton('Full screen', 'full');
    s.fullBtn.setAttribute('aria-pressed', 'false');
    tools.appendChild(s.scrollBtn);
    tools.appendChild(s.fullBtn);
    s.bar.appendChild(heading);
    s.bar.appendChild(tools);

    s.desk = el('div', 'br-desk');
    s.book = el('div', 'br-book');
    s.book.tabIndex = 0;
    s.book.setAttribute('role', 'group');
    s.book.setAttribute('aria-roledescription', 'book');
    s.book.setAttribute('aria-label', 'Lesson text');
    s.prevBtn = turnButton('br-turn br-prev', 'Previous page', PATH_PREV);
    s.nextBtn = turnButton('br-turn br-next', 'Next page', PATH_NEXT);
    s.nextText = s.nextBtn.querySelector('.br-turn-text');

    s.paper = el('div', 'br-paper');
    s.view = el('div', 'br-view');
    s.track = el('div', 'br-track');
    s.view.appendChild(s.track);
    s.shadeL = el('div', 'br-shade-l');
    s.shadeR = el('div', 'br-shade-r');
    s.fold = el('div', 'br-fold');
    s.runL = el('div', 'br-runhead-l');
    s.runR = el('div', 'br-runhead-r');
    s.folioL = el('div', 'br-folio-l');
    s.folioR = el('div', 'br-folio-r');
    s.sweep = el('div', 'br-sweep');
    [s.view, s.shadeL, s.shadeR, s.fold, s.runL, s.runR, s.folioL, s.folioR, s.sweep].forEach(function (node) {
      s.paper.appendChild(node);
    });

    s.book.appendChild(s.prevBtn);
    s.book.appendChild(s.paper);
    s.book.appendChild(s.nextBtn);
    s.desk.appendChild(s.book);

    s.foot = el('footer', 'br-foot');
    s.pos = el('div', 'br-pos');
    s.pos.setAttribute('aria-live', 'polite');
    s.rail = el('div', 'br-rail');
    s.railFill = el('div', 'br-rail-fill');
    s.rail.appendChild(s.railFill);
    var hint = el('div', 'br-hint');
    hint.textContent = '← → turn the page';
    s.foot.appendChild(s.pos);
    s.foot.appendChild(s.rail);
    s.foot.appendChild(hint);

    s.root.appendChild(s.bar);
    s.root.appendChild(s.desk);
    s.root.appendChild(s.foot);
  }

  function segment(nodes) {
    var specs = [];
    var pending = [];
    var current = null;
    var i = 0;
    while (i < nodes.length) {
      var node = nodes[i];
      if (isWhitespace(node)) {
        if (current) current.nodes.push(node);
        else if (specs.length) specs[specs.length - 1].nodes.push(node);
        else pending.push(node);
        i += 1;
        continue;
      }
      if (isPlate(node)) {
        var plate = { type: 'plate', nodes: pending.concat([node]) };
        pending = [];
        var j = i + 1;
        var between = [];
        while (j < nodes.length && isWhitespace(nodes[j])) {
          between.push(nodes[j]);
          j += 1;
        }
        if (j < nodes.length && nodes[j].nodeType === 1 && nodes[j].matches(REPLAY_SEL)) {
          plate.nodes = plate.nodes.concat(between, [nodes[j]]);
          i = j + 1;
        } else {
          i += 1;
        }
        specs.push(plate);
        current = null;
        continue;
      }
      if (!current) {
        current = { type: 'text', nodes: pending };
        pending = [];
        specs.push(current);
      }
      current.nodes.push(node);
      i += 1;
    }
    return specs;
  }

  function assemble(s, specs) {
    var order = new Map();
    s.originals.forEach(function (node, index) {
      order.set(node, index);
    });
    specs.forEach(function (spec) {
      var plate = spec.type === 'plate';
      var item = {
        type: spec.type,
        el: el('div', plate ? 'br-item is-plate' : 'br-item is-text'),
        box: el('div', plate ? 'br-plate' : 'br-flow'),
        start: 0,
        steps: 1,
        cols: 0,
        pageBase: 0,
        natural: 0,
        tops: []
      };
      spec.nodes.forEach(function (node) {
        if (node.nodeType === 1) node.setAttribute('data-br-i', String(order.get(node)));
        item.box.appendChild(node);
      });
      item.tops = elementChildren(item.box);
      item.el.appendChild(item.box);
      s.track.appendChild(item.el);
      s.items.push(item);
    });
  }

  function collectNodes(s) {
    var out = [];
    Array.prototype.slice.call(s.track.childNodes).forEach(function (item) {
      if (item.nodeType !== 1 || !item.classList.contains('br-item')) {
        out.push(item);
        return;
      }
      Array.prototype.slice.call(item.childNodes).forEach(function (child) {
        if (child.nodeType === 1 && (child.classList.contains('br-flow') || child.classList.contains('br-plate'))) {
          Array.prototype.slice.call(child.childNodes).forEach(function (node) {
            out.push(node);
          });
        } else {
          out.push(child);
        }
      });
    });
    return out;
  }

  function headingText(node) {
    var h = node.querySelector('h1, h2, h3, h4');
    var src = h || node;
    return String(src.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function setItemSteps(it, steps, Vw) {
    it.el.style.width = steps * Vw + 'px';
    it.box.style.width = steps * Vw + 'px';
  }

  function renderMarks(s) {
    s.marks.forEach(function (m) {
      if (m.parentNode) m.parentNode.removeChild(m);
    });
    s.marks = [];
    var span = Math.max(1, s.steps - 1);
    s.parts.forEach(function (p) {
      var m = el('button', 'br-mark');
      m.type = 'button';
      m.title = p.label;
      m.setAttribute('aria-label', 'Go to ' + p.label);
      m.setAttribute('data-step', String(p.step));
      m.style.left = (p.step / span) * 100 + '%';
      m.addEventListener('click', function () {
        goTo(p.step);
      });
      s.rail.appendChild(m);
      s.marks.push(m);
    });
  }

  function layout(s) {
    if (!s.root.getClientRects().length) return false;
    var iw = window.innerWidth;
    var ih = window.innerHeight;
    var avail = Math.min(iw - 32, 1180);
    var spread = avail >= 860 ? 2 : 1;
    var Vw = spread === 2 ? avail : Math.min(avail, 680);
    var Vh = s.immersive
      ? Math.max(260, ih - s.bar.offsetHeight - s.foot.offsetHeight - FRAME_V)
      : clamp(380, ih - 160, 900);
    var mo = spread === 2 ? Math.round(clamp(18, Vw * 0.045, 44)) : Math.round(clamp(16, Vw * 0.06, 30));
    var gap = 2 * mo;
    var col = spread === 2 ? (Vw - 4 * mo) / 2 : Vw - 2 * mo;
    s.spread = spread;
    s.mode = spread === 2 ? 'spread' : 'single';
    s.Vw = Vw;
    s.Vh = Vh;
    s.mo = mo;
    s.gap = gap;
    s.col = col;

    s.root.classList.toggle('br-single', spread === 1);
    s.root.classList.toggle('br-wide', (iw - Vw) / 2 >= WIDE_GAP);
    s.root.style.width = s.immersive ? '' : Vw + 'px';
    s.root.style.marginLeft = !s.immersive && Vw >= s.articleWidth ? Math.round((s.articleWidth - Vw) / 2) + 'px' : '';
    s.paper.style.width = Vw + 'px';
    s.view.style.width = Vw + 'px';

    var pad = TOP_PAD + 'px ' + mo + 'px ' + BOT_PAD + 'px';
    var total = 0;
    s.items.forEach(function (it) {
      it.tops = elementChildren(it.box);
      it.box.style.padding = pad;
      if (it.type === 'plate') {
        setItemSteps(it, 1, Vw);
        it.box.style.height = 'auto';
        it.natural = it.box.scrollHeight;
        it.box.style.height = '';
        it.steps = 1;
        it.cols = 0;
      } else {
        it.box.style.height = Vh + 'px';
        it.box.style.columnWidth = col + 'px';
        it.box.style.columnGap = gap + 'px';
        setItemSteps(it, 1, Vw);
        var n = Math.max(1, Math.round((it.box.scrollWidth - mo + gap) / (col + gap)));
        var steps = Math.max(1, Math.ceil(n / spread));
        setItemSteps(it, steps, Vw);
        var guard = 0;
        while (it.box.scrollWidth > it.box.clientWidth + 1 && guard < 60) {
          steps += 1;
          guard += 1;
          setItemSteps(it, steps, Vw);
        }
        it.cols = n;
        it.steps = steps;
      }
      it.start = total;
      total += it.steps;
    });
    s.steps = total;
    s.track.style.width = total * Vw + 'px';
    observePlateContent(s);

    var pageNo = 0;
    s.items.forEach(function (it) {
      it.pageBase = pageNo;
      if (it.type === 'text') pageNo += it.cols;
    });
    s.pages = pageNo;

    var blocks = [];
    var prevIdx = -1;
    s.items.forEach(function (it) {
      var prevStep = it.start;
      it.tops.forEach(function (node) {
        var raw = node.getAttribute('data-br-i');
        var idx = raw !== null && !isNaN(Number(raw)) ? Number(raw) : prevIdx;
        prevIdx = idx;
        var step = prevStep;
        if (it.type === 'text') {
          var rects = node.getClientRects();
          if (rects.length) {
            var fr = it.box.getBoundingClientRect();
            var c = Math.max(0, Math.floor((rects[0].left - fr.left - mo + 1) / (col + gap)));
            step = it.start + Math.min(it.steps - 1, Math.floor(c / spread));
          }
        }
        prevStep = step;
        blocks.push({ idx: idx, node: node, item: it, step: step });
      });
    });
    s.blocks = blocks;

    var partPositions = [];
    blocks.forEach(function (b, p) {
      if (b.node.matches(PART_SEL)) partPositions.push(p);
    });
    s.parts = partPositions.map(function (p) {
      return { step: blocks[p].step, label: headingText(blocks[p].node) || 'Part' };
    });

    var info = [];
    s.items.forEach(function (it) {
      for (var k = 0; k < it.steps; k += 1) {
        var rec = { kind: it.type, leftPage: 0, rightPage: 0, anchor: null, part: '', natural: it.natural, item: it };
        if (it.type === 'text') {
          var lc = spread === 2 ? k * 2 : k;
          var rc = k * 2 + 1;
          if (lc < it.cols) rec.leftPage = it.pageBase + lc + 1;
          if (spread === 2 && rc < it.cols) rec.rightPage = it.pageBase + rc + 1;
        }
        info.push(rec);
      }
    });
    info.forEach(function (rec, st) {
      var p = -1;
      var q;
      for (q = 0; q < blocks.length; q += 1) {
        if (blocks[q].step === st) {
          p = q;
          break;
        }
      }
      if (p < 0) {
        for (q = blocks.length - 1; q >= 0; q -= 1) {
          if (blocks[q].step < st) {
            p = q;
            break;
          }
        }
      }
      if (p < 0) p = 0;
      rec.anchor = blocks.length ? blocks[p].idx : null;
      var part = null;
      for (var r = partPositions.length - 1; r >= 0; r -= 1) {
        if (partPositions[r] <= p) {
          part = blocks[partPositions[r]];
          break;
        }
      }
      rec.part = part ? headingText(part.node) : '';
    });
    s.stepInfo = info;

    renderMarks(s);
    return true;
  }

  function checkpointPlate(s, step) {
    var rec = s.stepInfo && s.stepInfo[step];
    if (!rec || rec.kind !== 'plate' || !rec.item || !rec.item.box) return null;
    return rec.item.box.querySelector('[data-checkpoint]');
  }

  function checkpointOpen(plate) {
    if (!plate) return true;
    var flag = plate.getAttribute('data-checkpoint-passed');
    return flag === 'true' || flag === 'auth';
  }

  function gateShut(s) {
    return !checkpointOpen(checkpointPlate(s, s.step));
  }

  /* A checkpoint can be arrived at. It cannot be turned past until the
     question on it is answered, or until sign-in is required to grade it. */
  function allowedForward(s, from, to) {
    if (to <= from || !s.stepInfo) return to;
    var limit = to;
    var step;
    for (step = from; step < to; step += 1) {
      var plate = checkpointPlate(s, step);
      if (!plate || checkpointOpen(plate)) continue;
      limit = step === from ? from : step;
      break;
    }
    return limit;
  }

  function clearHeld(s) {
    if (!s.root) return;
    var nodes = s.root.querySelectorAll('.checkpoint-plate.is-held');
    var i;
    for (i = 0; i < nodes.length; i += 1) nodes[i].classList.remove('is-held');
  }

  function holdCheckpoint(s) {
    var plate = checkpointPlate(s, s.step);
    if (plate) plate.classList.add('is-held');
    dispatch('bookreader:held', { checkpoint: plate ? plate.getAttribute('data-checkpoint') : '' });
  }

  function positionLabel(s, rec) {
    var plate = checkpointPlate(s, s.step);
    if (plate) {
      return 'Checkpoint ' + plate.getAttribute('data-checkpoint') + ' of ' + plate.getAttribute('data-checkpoint-total');
    }
    if (!rec || rec.kind === 'plate') return 'Plate';
    if (rec.leftPage && rec.rightPage) return 'pp. ' + rec.leftPage + DASH + rec.rightPage + ' of ' + s.pages;
    if (rec.leftPage) return 'p. ' + rec.leftPage + ' of ' + s.pages;
    return '';
  }

  function viewHeightFor(s, rec) {
    if (!rec || rec.kind !== 'plate') return s.Vh;
    var cap = s.immersive ? s.Vh : s.Vh * PLATE_CAP;
    return Math.round(clamp(Math.max(s.Vh, rec.natural || 0), s.Vh, cap));
  }

  function lastTextPage(s) {
    for (var i = s.step; i >= 0; i -= 1) {
      var r = s.stepInfo[i];
      if (r && r.kind === 'text' && r.leftPage) return r.leftPage;
    }
    return s.pages ? 1 : 0;
  }

  function updateChrome(s) {
    var rec = s.stepInfo[s.step] || { kind: 'text', leftPage: 0, rightPage: 0, part: '', natural: 0 };
    var viewPx = viewHeightFor(s, rec) + 'px';
    if (s.view.style.height !== viewPx) s.view.style.height = viewPx;
    clearHeld(s);

    var first = rec.kind === 'plate' ? lastTextPage(s) : rec.leftPage;
    s.page = first || 0;
    s.pos.textContent = positionLabel(s, rec);

    var leftNo = rec.kind === 'text' && rec.leftPage ? String(rec.leftPage) : '';
    var rightNo = rec.kind === 'text' && rec.rightPage ? String(rec.rightPage) : '';
    if (s.mode === 'single') {
      s.folioL.textContent = '';
      s.folioR.textContent = leftNo;
    } else {
      s.folioL.textContent = leftNo;
      s.folioR.textContent = rightNo;
    }
    s.runL.textContent = s.opts.title;
    s.runR.textContent = rec.part || s.opts.title;

    var label = s.pages ? (rec.kind === 'plate' ? 'Lesson text, plate, page ' : 'Lesson text, page ') + first + ' of ' + s.pages : 'Lesson text';
    s.book.setAttribute('aria-label', label);

    var endStep = s.steps - 1;
    var atEnd = s.step >= endStep;
    s.prevBtn.setAttribute('aria-disabled', s.step <= 0 ? 'true' : 'false');
    s.nextBtn.setAttribute('aria-disabled', gateShut(s) ? 'true' : 'false');
    s.nextBtn.setAttribute('aria-label', atEnd ? 'Continue' : 'Next page');
    s.nextBtn.classList.toggle('is-continue', atEnd);
    s.nextText.textContent = atEnd ? 'Continue' : '';

    s.railFill.style.width = (endStep > 0 ? (s.step / endStep) * 100 : 100) + '%';
    s.marks.forEach(function (m) {
      var st = Number(m.getAttribute('data-step'));
      m.classList.toggle('is-passed', st <= s.step);
    });
    s.fullBtn.setAttribute('aria-pressed', s.immersive ? 'true' : 'false');
    s.root.classList.toggle('br-on-plate', rec.kind === 'plate');
    paintDeck(s);
  }

  function deckPx(count, total) {
    if (count <= 0 || total <= 0) return '0px';
    return Math.max(2, Math.round((count / total) * 10)) + 'px';
  }

  function paintDeck(s) {
    var total = Math.max(0, s.steps - 1);
    var ahead = total - s.step;
    if (ahead < 0) ahead = 0;
    s.paper.style.setProperty('--br-fore', deckPx(ahead, total));
    s.paper.style.setProperty('--br-past', deckPx(s.step, total));
  }

  function stepOfIdx(s, idx) {
    for (var i = 0; i < s.blocks.length; i += 1) {
      if (s.blocks[i].idx === idx) return s.blocks[i].step;
    }
    return -1;
  }

  function currentAnchor(s) {
    var r = s.stepInfo[s.step];
    return r ? r.anchor : null;
  }

  function persist(s) {
    var idx = currentAnchor(s);
    if (s.opts.sheetIndex !== null && idx !== null) saveAnchor(s.opts.sheetIndex, idx);
  }

  function setScroll(s, x) {
    s.view.scrollLeft = x;
    if (s.view.scrollTop) s.view.scrollTop = 0;
  }

  function clearRises(s) {
    clearTimeout(s.riseTimer);
    s.riseTimer = 0;
    s.risers.forEach(function (node) {
      node.classList.remove('br-rise');
      node.style.removeProperty('--br-d');
    });
    s.risers = [];
  }

  function riseBlocks(s) {
    clearRises(s);
    if (reducedMotion()) return;
    var picked = [];
    for (var i = 0; i < s.blocks.length && picked.length < RISE_MAX; i += 1) {
      var b = s.blocks[i];
      if (b.step === s.step && b.item.type === 'text') picked.push(b.node);
    }
    picked.forEach(function (node, n) {
      touch(s, node);
      node.classList.add('br-rise');
      node.style.setProperty('--br-d', n * RISE_GAP + 'ms');
      s.risers.push(node);
    });
    if (s.risers.length) s.riseTimer = setTimeout(function () { clearRises(s); }, RISE_LIFE);
  }

  function animateTurn(s, from, to) {
    stopAnim(s);
    var span = Math.abs(to - from) / s.Vw;
    var dur = Math.min(640, 420 + 60 * span);
    var t0 = null;
    s.animating = true;
    s.paper.style.setProperty('--br-leaf', '0');
    s.paper.style.setProperty('--br-leaf-a', '0');
    s.book.setAttribute('data-dir', to >= from ? 'next' : 'prev');
    s.book.classList.add('is-turning');
    var tick = function (now) {
      if (session !== s) return;
      if (t0 === null) t0 = now;
      var p = clamp((now - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      s.paper.style.setProperty('--br-leaf', e.toFixed(3));
      s.paper.style.setProperty('--br-leaf-a', Math.sin(p * Math.PI).toFixed(3));
      if (p < 1) {
        setScroll(s, from + (to - from) * e);
        s.animId = requestAnimationFrame(tick);
      } else {
        s.animId = 0;
        s.animating = false;
        setScroll(s, to);
        s.book.classList.remove('is-turning');
        s.paper.style.removeProperty('--br-leaf');
        s.paper.style.removeProperty('--br-leaf-a');
        riseBlocks(s);
      }
    };
    s.animId = requestAnimationFrame(tick);
  }

  function noteEnd(s) {
    if (s.steps && s.step === s.steps - 1 && !s.endFired) {
      s.endFired = true;
      dispatch('bookreader:end', stateOf());
    }
  }

  function goTo(index, options) {
    var s = session;
    if (!s || !s.steps) return false;
    var requested = clamp(Math.round(index), 0, s.steps - 1);
    var target = allowedForward(s, s.step, requested);
    if (target !== requested && target === s.step) {
      if (!(options && options.quiet)) holdCheckpoint(s);
      return false;
    }
    var from = s.view.scrollLeft;
    var to = target * s.Vw;
    var moved = target !== s.step;
    var instant = !!(options && options.instant) || reducedMotion() || Math.abs(to - from) < 1;
    s.step = target;
    updateChrome(s);
    if (instant) {
      stopAnim(s);
      s.book.classList.remove('is-turning');
      setScroll(s, to);
    } else {
      animateTurn(s, from, to);
    }
    if (moved) {
      persist(s);
      dispatch('bookreader:turn', stateOf());
    }
    noteEnd(s);
    return true;
  }

  function next() {
    var s = session;
    if (!s) return false;
    var before = s.step;
    goTo(before + 1);
    return s.step !== before;
  }

  function prev() {
    var s = session;
    if (!s) return false;
    var before = s.step;
    goTo(before - 1);
    return s.step !== before;
  }

  function observeFlows(s) {
    if (!s.flowWatch) return;
    s.items.forEach(function (it) {
      if (it.type !== 'text') return;
      s.flowWatch.observe(it.box, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: FLOW_ATTRS
      });
    });
  }

  function pauseFlows(s) {
    if (!s.flowWatch) return;
    s.flowWatch.disconnect();
    s.flowWatch.takeRecords();
  }

  function resumeFlows(s) {
    if (!s.flowWatch || session !== s) return;
    s.flowWatch.takeRecords();
    observeFlows(s);
  }

  function flowRecordMatters(rec) {
    var target = rec.target;
    if (target.nodeType === 1 && target.classList.contains('br-flow')) return false;
    if (rec.type === 'attributes' && rec.attributeName === 'class') {
      var before = classTokens(rec.oldValue);
      var after = classTokens(target.getAttribute('class'));
      var moved = before.concat(after).filter(function (c) {
        return (before.indexOf(c) < 0) !== (after.indexOf(c) < 0);
      });
      return moved.some(function (c) {
        return c !== 'br-rise';
      });
    }
    return true;
  }

  function flowSchedule(s) {
    clearTimeout(s.flowTimer);
    s.flowTimer = setTimeout(function () {
      s.flowTimer = 0;
      if (session === s) repaginate(s);
    }, FLOW_MS);
  }

  /* Keep the plate pages' measured height honest. Layout() reads each plate
     box's scrollHeight once; content that reaches full size later (an image
     decoding, a replay stage drawing) would otherwise sit in a page sized for
     the empty box. The children are what actually change size, so they are the
     observed set; the observer itself is built with the session (s.contentRO)
     and torn down with it. */
  function observePlateContent(s) {
    if (!s.contentRO) return;
    s.items.forEach(function (it) {
      if (it.type !== 'plate') return;
      Array.prototype.forEach.call(it.box.children, function (child) {
        s.contentRO.observe(child);
      });
    });
  }

  function watchFlows(s) {
    if (!window.MutationObserver) return;
    s.flowWatch = new MutationObserver(function (records) {
      if (session !== s) return;
      if (records.some(flowRecordMatters)) flowSchedule(s);
    });
    s.stops.push(function () {
      if (s.flowWatch) s.flowWatch.disconnect();
    });
    observeFlows(s);
  }

  function repaginate(s) {
    if (session !== s) return;
    stopAnim(s);
    s.book.classList.remove('is-turning');
    var prior = s.stepInfo[s.step];
    var anchor = prior ? prior.anchor : null;
    var ok = false;
    var changed = false;
    pauseFlows(s);
    try {
      ok = layout(s);
      if (ok) {
        var target = s.step;
        if (anchor !== null) {
          var found = stepOfIdx(s, anchor);
          if (found >= 0) target = found;
        }
        target = clamp(target, 0, s.steps - 1);
        changed = target !== s.step;
        s.step = target;
        setScroll(s, s.step * s.Vw);
        updateChrome(s);
      }
    } finally {
      resumeFlows(s);
    }
    if (!ok) return;
    if (changed) {
      persist(s);
      dispatch('bookreader:turn', stateOf());
    }
    noteEnd(s);
  }

  function schedule() {
    var s = session;
    if (!s) return;
    clearTimeout(s.reTimer);
    s.reTimer = setTimeout(function () {
      s.reTimer = 0;
      repaginate(s);
    }, RE_MS);
  }

  function revealNode(s, node, options) {
    var item = null;
    for (var i = 0; i < s.items.length; i += 1) {
      if (s.items[i].el.contains(node)) {
        item = s.items[i];
        break;
      }
    }
    if (!item) return false;
    if (item.type === 'plate') return goTo(item.start, options);
    var probe = node;
    var rects = probe.getClientRects();
    while (!rects.length && probe && probe !== item.box) {
      probe = probe.parentNode;
      rects = probe && probe.getClientRects ? probe.getClientRects() : [];
    }
    if (!rects.length) return goTo(item.start, options);
    var fr = item.box.getBoundingClientRect();
    var c = Math.max(0, Math.floor((rects[0].left - fr.left - s.mo + 1) / (s.col + s.gap)));
    return goTo(item.start + Math.min(item.steps - 1, Math.floor(c / s.spread)), options);
  }

  function reveal(target, options) {
    var s = session;
    if (!s || !target) return false;
    var node = null;
    if (typeof target === 'string') {
      try {
        node = s.root.querySelector(target);
      } catch (e) {
        node = null;
      }
    } else if (target.nodeType === 1) {
      node = target;
    }
    if (!node || !s.root.contains(node)) return false;
    return revealNode(s, node, options);
  }

  function visibleShare(s) {
    var r = s.root.getBoundingClientRect();
    var h = Math.max(1, r.height);
    var top = Math.max(0, r.top);
    var bottom = Math.min(window.innerHeight, r.bottom);
    return Math.max(0, bottom - top) / h;
  }

  function keysAllowed(s, t) {
    var html = document.documentElement;
    if (html.classList.contains('dfx-open') || html.classList.contains('story-read-open') || html.classList.contains('mm-fullscreen-open')) return false;
    if (document.body.classList.contains('is-sitting-overlay')) return false;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return false;
    if (t === document.body || t === s.book) return true;
    if (t.classList && t.classList.contains('br-turn')) return true;
    return !!(t.closest && t.closest('.br-flow'));
  }

  function onKeyDown(e) {
    var s = session;
    if (!s || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (!t || (t !== document.body && t.nodeType !== 1)) return;
    if (t.closest && t.closest(KEY_BLOCK_SEL)) return;
    var k = e.key;
    if (k === 'Escape') {
      if (s.immersive && !document.fullscreenElement) {
        e.preventDefault();
        exitImmersive(s);
      }
      return;
    }
    if (!keysAllowed(s, t)) return;
    var inside = s.root.contains(t);
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      if (!inside && !(t === document.body && visibleShare(s) >= 0.4)) return;
      e.preventDefault();
      if (k === 'ArrowRight') next();
      else prev();
      return;
    }
    if (!inside) return;
    if (k === ' ' || k === 'Spacebar') {
      if (t.closest && t.closest('button, a, summary')) return;
      e.preventDefault();
      if (e.shiftKey) prev();
      else next();
      return;
    }
    if (k === 'PageDown') {
      e.preventDefault();
      next();
    } else if (k === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (k === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (k === 'End') {
      e.preventDefault();
      goTo(s.steps - 1);
    }
  }

  function onWheel(e) {
    var s = session;
    if (!s || !s.Vw) return;
    var t = e.target;
    if (t.nodeType === 1 && t.closest && t.closest('.br-plate')) return;
    if (!s.immersive && !s.paper.contains(t)) return;
    var dx = e.deltaX;
    var dy = e.deltaY;
    var horizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30;
    var vertical = s.immersive && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30;
    if (!horizontal && !vertical) return;
    e.preventDefault();
    var now = Date.now();
    if (now - s.wheelAt < WHEEL_MS) return;
    s.wheelAt = now;
    if ((horizontal ? dx : dy) > 0) next();
    else prev();
  }

  function onPointerDown(e) {
    var s = session;
    if (!s || e.pointerType === 'mouse') return;
    var t = e.target;
    if (t.nodeType === 1 && t.closest && t.closest(CLICK_SKIP_SEL)) return;
    s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      s.view.setPointerCapture(e.pointerId);
    } catch (err) {
      return;
    }
  }

  function onPointerUp(e) {
    var s = session;
    if (!s || !s.drag || e.pointerId !== s.drag.id) return;
    var d = s.drag;
    s.drag = null;
    var dx = e.clientX - d.x;
    var dy = e.clientY - d.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      s.swipeAt = Date.now();
      if (dx < 0) next();
      else prev();
    }
  }

  function onPointerCancel() {
    if (session) session.drag = null;
  }

  function hasSelection() {
    var sel = window.getSelection ? window.getSelection() : null;
    return !!(sel && !sel.isCollapsed && String(sel).length);
  }

  function onPaperClick(e) {
    var s = session;
    if (!s || Date.now() - s.swipeAt < SWIPE_MS) return;
    var t = e.target;
    if (t.nodeType !== 1 || (t.closest && t.closest(CLICK_SKIP_SEL))) return;
    if (hasSelection()) return;
    var r = s.paper.getBoundingClientRect();
    if (r.width <= 0) return;
    var f = (e.clientX - r.left) / r.width;
    if (f < EDGE) prev();
    else if (f > 1 - EDGE) next();
  }

  function onPaperMove(e) {
    var s = session;
    if (!s) return;
    var r = s.paper.getBoundingClientRect();
    var f = r.width ? (e.clientX - r.left) / r.width : 0.5;
    s.paper.classList.toggle('br-zone-l', f < EDGE);
    s.paper.classList.toggle('br-zone-r', f > 1 - EDGE);
  }

  function onPaperLeave() {
    var s = session;
    if (!s) return;
    s.paper.classList.remove('br-zone-l');
    s.paper.classList.remove('br-zone-r');
  }

  function onNextClick() {
    var s = session;
    if (!s) return;
    if (s.step >= s.steps - 1) {
      if (gateShut(s)) {
        holdCheckpoint(s);
        return;
      }
      dispatch('bookreader:continue', stateOf());
      return;
    }
    next();
  }

  function onRootClick(e) {
    var s = session;
    var t = e.target;
    if (!s || !t || t.nodeType !== 1 || !t.closest) return;
    var a = t.closest('a[href^="#"]');
    if (!a || !s.root.contains(a)) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var node = null;
    try {
      node = document.getElementById(decodeURIComponent(id));
    } catch (err) {
      node = null;
    }
    if (!node || !s.root.contains(node)) return;
    e.preventDefault();
    revealNode(s, node, null);
  }

  function onScroll() {
    var s = session;
    if (!s || s.animating) return;
    clearTimeout(s.snapTimer);
    s.snapTimer = setTimeout(function () {
      s.snapTimer = 0;
      if (session !== s || s.animating || !s.Vw) return;
      var target = clamp(Math.round(s.view.scrollLeft / s.Vw), 0, s.steps - 1);
      if (target !== s.step || Math.abs(s.view.scrollLeft - target * s.Vw) > 0.5) goTo(target);
    }, SNAP_MS);
  }

  function onFullscreenChange() {
    var s = session;
    if (!s || !s.immersive) return;
    if (document.fullscreenElement === s.root) s.fsOwned = true;
    if (s.fsOwned && !document.fullscreenElement) exitImmersive(s);
  }

  function enterImmersive(s) {
    if (s.immersive) return;
    s.immersive = true;
    s.root.classList.add('br-immersive');
    document.documentElement.classList.add('br-immersive-open');
    if (s.root.requestFullscreen && !document.fullscreenElement) {
      try {
        var p = s.root.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      } catch (err) {
        s.fsOwned = false;
      }
    }
    repaginate(s);
  }

  function exitImmersive(s) {
    if (!s.immersive) return;
    s.immersive = false;
    s.root.classList.remove('br-immersive');
    document.documentElement.classList.remove('br-immersive-open');
    if (s.fsOwned && document.fullscreenElement === s.root && document.exitFullscreen) {
      try {
        var p = document.exitFullscreen();
        if (p && p.catch) p.catch(function () {});
      } catch (err) {
        s.fsOwned = false;
      }
    }
    s.fsOwned = false;
    repaginate(s);
  }

  function onFullClick() {
    var s = session;
    if (!s) return;
    if (s.immersive) exitImmersive(s);
    else enterImmersive(s);
  }

  function observeOpening(s) {
    if (!window.IntersectionObserver || reducedMotion()) return;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        if (entries[i].intersectionRatio >= 0.35) {
          io.disconnect();
          s.root.classList.add('br-open');
          s.openT = setTimeout(function () {
            s.root.classList.remove('br-open');
          }, 900);
          return;
        }
      }
    }, { threshold: [0, 0.35, 1] });
    io.observe(s.root);
    s.stops.push(function () {
      io.disconnect();
    });
  }

  function abandon(s) {
    stopAll(s);
    session = null;
    s.article.classList.remove('br-mounted');
    dispatch('bookreader:unmount', null);
  }

  function install(s) {
    listen(s, document, 'keydown', onKeyDown);
    listen(s, document, 'checkpoint:passed', function () {
      if (session === s) updateChrome(s);
    });
    listen(s, document, 'fullscreenchange', onFullscreenChange);
    listen(s, window, 'resize', schedule);
    listen(s, s.root, 'load', schedule, true);
    listen(s, s.root, 'click', onRootClick);
    listen(s, s.root, 'wheel', onWheel, { passive: false });
    listen(s, s.paper, 'click', onPaperClick);
    listen(s, s.paper, 'mousemove', onPaperMove);
    listen(s, s.paper, 'mouseleave', onPaperLeave);
    listen(s, s.view, 'pointerdown', onPointerDown, { passive: true });
    listen(s, s.view, 'pointerup', onPointerUp);
    listen(s, s.view, 'pointercancel', onPointerCancel);
    listen(s, s.view, 'scroll', onScroll);
    listen(s, s.prevBtn, 'click', function () {
      prev();
    });
    listen(s, s.nextBtn, 'click', onNextClick);
    listen(s, s.scrollBtn, 'click', function () {
      setView('scroll');
    });
    listen(s, s.fullBtn, 'click', onFullClick);
    if (document.fonts) {
      listen(s, document.fonts, 'loadingdone', schedule);
      if (document.fonts.ready) {
        document.fonts.ready.then(function () {
          schedule();
        });
      }
    }
    if (window.MutationObserver) {
      var attrs = new MutationObserver(schedule);
      attrs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
      attrs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      s.stops.push(function () {
        attrs.disconnect();
      });
      var detach = new MutationObserver(function () {
        if (session === s && s.root.parentNode !== s.article) abandon(s);
      });
      detach.observe(s.article, { childList: true });
      s.stops.push(function () {
        detach.disconnect();
      });
    }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(schedule);
      ro.observe(s.article);
      /* A plate page is sized to its content: layout() measures `natural`
         once, and the view grows to it (up to the cap). Figures, canvases and
         images inside a plate often reach full size *after* that measure — an
         image decodes, a replay draws its stage — and none of that changes the
         article's own box, so the observer above stays quiet and the plate
         would keep a stale, too-short page. Watching the plate children is
         what lets flowSchedule() re-measure them. observe() is idempotent, so
         layout() may re-observe the same children on every pass. */
      s.contentRO = new ResizeObserver(function () {
        if (session === s) flowSchedule(s);
      });
      s.stops.push(function () {
        ro.disconnect();
        if (s.contentRO) s.contentRO.disconnect();
      });
    }
    /* A late font swaps text metrics inside the fixed-height columns, which
       changes how many pages the text fills — one settle once fonts are ready. */
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () {
        if (session === s) flowSchedule(s);
      });
    }
    watchFlows(s);
  }

  function clearSwitches(article) {
    Array.prototype.slice.call(article.children).forEach(function (child) {
      if (child.classList && child.classList.contains('br-switch') && child.parentNode) child.parentNode.removeChild(child);
    });
  }

  function closeSession(keepSwitch) {
    var s = session;
    if (!s) return;
    if (last && last.article === s.article) last.anchor = currentAnchor(s);
    session = null;
    stopAll(s);
    if (s.immersive) {
      s.immersive = false;
      s.root.classList.remove('br-immersive');
      document.documentElement.classList.remove('br-immersive-open');
      if (s.fsOwned && document.fullscreenElement === s.root && document.exitFullscreen) {
        try {
          var p = document.exitFullscreen();
          if (p && p.catch) p.catch(function () {});
        } catch (err) {
          s.fsOwned = false;
        }
      }
    }
    var nodes = collectNodes(s);
    var frag = document.createDocumentFragment();
    nodes.forEach(function (node) {
      frag.appendChild(node);
    });
    if (s.root.parentNode) s.root.parentNode.removeChild(s.root);
    restoreTouched(s);
    nodes.forEach(function (node) {
      if (node.nodeType === 1) node.removeAttribute('data-br-i');
    });
    s.article.insertBefore(frag, s.article.firstChild);
    if (!keepSwitch) clearSwitches(s.article);
    dispatch('bookreader:unmount', null);
  }

  function showSwitch(article) {
    clearSwitches(article);
    var bar = el('div', 'br-switch');
    var label = el('span', 'br-switch-label');
    label.textContent = 'Scroll view';
    var btn = el('button', 'br-switch-btn');
    btn.type = 'button';
    btn.textContent = 'Read as a book';
    btn.addEventListener('click', function () {
      setView('book');
    });
    bar.appendChild(label);
    bar.appendChild(btn);
    article.insertBefore(bar, article.firstChild);
  }

  function openBook(article, o, startAnchor) {
    var s = createSession(article, o);
    session = s;
    try {
      if (!s.originals.length) throw new Error('empty lesson');
      touch(s, article);
      build(s);
      var specs = segment(s.originals);
      if (!specs.length) throw new Error('no lesson content');
      assemble(s, specs);
      article.appendChild(s.root);
      article.classList.add('br-mounted');
      if (!layout(s) || !s.steps) throw new Error('layout failed');
      install(s);
      var at = startAnchor === null ? -1 : stepOfIdx(s, startAnchor);
      s.step = at >= 0 ? clamp(at, 0, s.steps - 1) : 0;
      setScroll(s, s.step * s.Vw);
      updateChrome(s);
      persist(s);
      noteEnd(s);
      observeOpening(s);
    } catch (err) {
      unmount();
      return false;
    }
    dispatch('bookreader:mount', stateOf());
    return true;
  }

  function quietly(fn) {
    var s = session;
    if (!s) return fn();
    pauseFlows(s);
    try {
      return fn();
    } finally {
      resumeFlows(s);
    }
  }

  function refresh() {
    if (!session) return false;
    repaginate(session);
    return true;
  }

  function mount(article, opts) {
    if (!article || article.nodeType !== 1) return false;
    var o = normalize(article, opts);
    if (session && session.article === article) return refresh();
    if (session) closeSession(false);
    clearSwitches(article);
    var startAnchor = o.restore ? savedAnchor(o.sheetIndex) : null;
    last = { article: article, opts: o, anchor: startAnchor };
    if (view() === 'scroll') {
      showSwitch(article);
      return true;
    }
    return openBook(article, o, startAnchor);
  }

  function unmount() {
    if (session) closeSession(false);
    if (last) clearSwitches(last.article);
    last = null;
  }

  function setView(v) {
    var pref = v === 'scroll' ? 'scroll' : 'book';
    setPref(pref);
    if (pref === 'scroll') {
      if (session) {
        var article = session.article;
        closeSession(true);
        showSwitch(article);
      } else if (last) {
        showSwitch(last.article);
      }
      return;
    }
    if (!session && last) {
      clearSwitches(last.article);
      openBook(last.article, last.opts, last.anchor);
    }
  }

  function stateOf() {
    var s = session;
    if (!s) {
      return {
        view: view(),
        mode: window.innerWidth - 32 >= 860 ? 'spread' : 'single',
        step: 0,
        steps: 0,
        page: 0,
        pages: 0,
        immersive: false
      };
    }
    return {
      view: 'book',
      mode: s.mode,
      step: s.step,
      steps: s.steps,
      page: s.page,
      pages: s.pages,
      immersive: s.immersive
    };
  }

  window.BookReader = {
    mount: mount,
    unmount: unmount,
    isActive: function () {
      return !!session;
    },
    view: view,
    setView: setView,
    next: next,
    prev: prev,
    goTo: function (index, options) {
      return goTo(index, options);
    },
    reveal: reveal,
    quietly: quietly,
    refresh: refresh,
    state: stateOf
  };
})();
