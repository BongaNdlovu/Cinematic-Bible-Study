(function () {
  'use strict';

  var KEY = 'baBookOpen';
  var VIEW_KEY = 'daniel_book_view';
  var MAX_AGE = 15000;
  var SPREAD_MIN = 892;
  var START_CAP = 6000;
  var TYPE_CAP = 450;
  var INPUTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  var TIMES = {
    spread: { fade: 1060, end: 1440 },
    single: { fade: 960, end: 1340 },
    fade: { fade: 120, end: 440 }
  };

  var root = document.documentElement;
  var settle;
  var finished = new Promise(function (resolve) {
    settle = resolve;
  });
  window.BookOpen = { finished: finished };

  function take() {
    var raw = null;
    try {
      raw = window.sessionStorage.getItem(KEY);
      window.sessionStorage.removeItem(KEY);
    } catch (e) {
      return null;
    }
    if (!raw) return null;
    var hand = null;
    try {
      hand = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!hand || typeof hand !== 'object') return null;
    if (String(hand.sheet) !== new URLSearchParams(location.search).get('sheet')) return null;
    if (!(Date.now() - Number(hand.t) < MAX_AGE)) return null;
    var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (nav && nav.type !== 'navigate') return null;
    return hand;
  }

  function kindFor() {
    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var scroll = false;
    try {
      scroll = window.localStorage.getItem(VIEW_KEY) === 'scroll';
    } catch (e) {}
    if (reduced || scroll) return 'fade';
    return window.innerWidth >= SPREAD_MIN ? 'spread' : 'single';
  }

  function cssString(s) {
    return '"' + String(s == null ? '' : s).replace(/[\\"<>\n\r]/g, function (c) {
      return '\\' + c.charCodeAt(0).toString(16) + ' ';
    }) + '"';
  }

  function cssColor(c, fallback) {
    return /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : fallback;
  }

  function artUrl(hand) {
    var a = String(hand.art || '');
    return /^[\w\/.-]+\.(?:jpe?g|png|webp|avif)$/i.test(a) && a.indexOf('..') < 0 ? a : '';
  }

  function paint(hand) {
    var m = Array.isArray(hand.marble) ? hand.marble : [];
    var art = artUrl(hand);
    var vars = [
      '--bko-cloth:' + cssColor(hand.cloth, '#3a2e1f'),
      '--bko-m1:' + cssColor(m[0], '#1d1610'),
      '--bko-m2:' + cssColor(m[1], '#7a3b26'),
      '--bko-m3:' + cssColor(m[2], '#c9a35a'),
      '--bko-m4:' + cssColor(m[3], '#2c4a52'),
      '--bko-m5:' + cssColor(m[4], '#e6d6b0'),
      '--bko-roman:' + cssString(hand.roman),
      '--bko-title:' + cssString(hand.title),
      '--bko-sub:' + cssString(hand.sub),
      '--bko-epoch:' + cssString(hand.epoch),
      '--bko-ref:' + cssString(hand.scripture)
    ];
    if (art) vars.push('--bko-art:url(' + cssString(new URL(art, document.baseURI).href) + ')');
    var style = document.createElement('style');
    style.id = 'book-open-vars';
    style.textContent = '#book-open{' + vars.join(';') + '}';
    document.head.appendChild(style);
  }

  function typeReady() {
    root.setAttribute('data-bko-type', '');
  }

  function decoded(url) {
    if (!url) return Promise.resolve();
    var img = new Image();
    img.decoding = 'async';
    img.src = url;
    return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
  }

  function waitForType(hand) {
    var cap = setTimeout(typeReady, TYPE_CAP);
    var fonts = document.fonts && document.fonts.load;
    Promise.all([
      fonts ? document.fonts.load('600 16px Cinzel') : null,
      fonts ? document.fonts.load('400 16px Newsreader') : null,
      fonts ? document.fonts.load('italic 500 16px Newsreader') : null,
      decoded(artUrl(hand))
    ]).then(function () {
      clearTimeout(cap);
      typeReady();
    }, function () {});
  }

  var hand = take();
  if (!hand) {
    settle();
    return;
  }

  var kind = kindFor();
  var times = TIMES[kind];
  var el = null;
  var begun = 0;
  var over = false;
  var leaving = false;
  var arrived = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var settled = false;
  var timers = [];

  paint(hand);
  root.setAttribute('data-bko', kind);
  waitForType(hand);

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function finish() {
    if (over) return;
    over = true;
    timers.forEach(clearTimeout);
    INPUTS.forEach(function (type) {
      window.removeEventListener(type, onInput, true);
    });
    document.removeEventListener('animationend', onArrive, true);
    var node = el || document.getElementById('book-open');
    if (node && node.parentNode) node.parentNode.removeChild(node);
    var style = document.getElementById('book-open-vars');
    if (style && style.parentNode) style.parentNode.removeChild(style);
    root.removeAttribute('data-bko');
    root.removeAttribute('data-bko-type');
    settle();
  }

  function onArrive(e) {
    if (e.animationName !== 'bko-arrive') return;
    document.removeEventListener('animationend', onArrive, true);
    arrived = true;
    if (settled) begin(false);
  }

  function onEnd(e) {
    if (e.target === el && e.animationName === 'bko-out') finish();
  }

  function leave() {
    if (leaving || over) return;
    leaving = true;
    el.addEventListener('animationend', onEnd);
    el.classList.add('is-leaving');
    later(finish, 420);
  }

  function onInput() {
    if (!el) el = document.getElementById('book-open');
    if (over || !el) return;
    if (begun && performance.now() - begun >= times.fade) return;
    leave();
  }

  function begin(force) {
    if (begun || over || leaving) return;
    el = document.getElementById('book-open');
    if (!el) {
      finish();
      return;
    }
    if (!arrived && !force) {
      settled = true;
      return;
    }
    begun = performance.now();
    el.addEventListener('animationend', onEnd);
    el.classList.add('is-opening');
    later(finish, times.end + 300);
  }

  function whenSettled() {
    setTimeout(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          begin(false);
        });
      });
    }, 0);
  }

  INPUTS.forEach(function (type) {
    window.addEventListener(type, onInput, { capture: true, passive: true });
  });
  document.addEventListener('animationend', onArrive, true);
  later(function () {
    begin(true);
  }, START_CAP);
  window.addEventListener('pagereveal', function (e) {
    if (e.viewTransition) e.viewTransition.skipTransition();
  });
  window.addEventListener('pagehide', finish);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenSettled);
  else whenSettled();
})();
