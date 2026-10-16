/* The Shelf of Daniel: the home page's reading room.
   A WebGL bookshelf of the eleven sittings, mounted into #shelf-stage on
   index.html. Data comes from js/study/sheets-data.js and progress from
   BAJourney, so locks and completion always match the study desk. */

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const LOWQ = COARSE || (navigator.hardwareConcurrency || 8) <= 4;

/* ---------------- Archive data ---------------- */
const ARCHIVE_EXTRAS = [
  { horizon: 'Hermeneutic Method', binding: 'Umber Buckram · Octavo', epigraph: 'LEX PROPHETICA · QUATUOR SENSUS',
    pillars: ['Fourfold inquiry: Text, History, Interpretation, and Christological center', 'Distinguishing explicit prophetic symbols from later interpretive scaffolding', 'Why the continuous historical timeline anchors apocalyptic reading'],
    backQuote: '“Before a single beast or horn is weighed, the reader must settle how prophecy speaks across time.”',
    cloth: '#3a2e1f', labelHue: '#17110b', marble: ['#1d1610', '#7a3b26', '#c9a35a', '#2c4a52', '#e6d6b0'], k: 0.90, thick: 0.96 },
  { horizon: '605 BC · Babylon', binding: 'Oxblood Linen · Duodecimo', epigraph: 'PROPOSUIT IN CORDE SUO · DAN I',
    pillars: ['Exile, identity rename, and the quiet resolve of an uncompromised conscience', 'Wisdom tested ten times above the Chaldean court', 'Daniel’s seventy-year tenure from Nebuchadnezzar to Cyrus'],
    backQuote: '“Daniel purposed in his heart before the king’s delicacies ever reached the table.”',
    cloth: '#4e2219', labelHue: '#1c0e0a', marble: ['#22120e', '#a2412c', '#d7b06a', '#20343c', '#efe0bd'], k: 0.85, thick: 0.86 },
  { horizon: 'Empires to Eternity', binding: 'Chaldean Lapis · Royal Octavo', epigraph: 'LAPIS SINE MANIBUS · DAN II',
    pillars: ['Gold, silver, bronze, iron, and divided clay: the backbone of historicism', 'Why Daniel 2 establishes the grand template enlarged in Chapters 7, 8, and 11', 'The Stone cut without hands that shatters human dominion'],
    backQuote: '“A dream the wise men could not invent, revealing a sequence of empires no monarch could halt.”',
    cloth: '#1f2d42', labelHue: '#0e141d', marble: ['#0f1824', '#3a6080', '#d9b25c', '#8a2f25', '#e8dcc0'], k: 0.96, thick: 1.05 },
  { horizon: 'Plain of Dura', binding: 'Furnace Carmine · Octavo', epigraph: 'QUOD SI NOLUERIT · DAN III',
    pillars: ['State uniformity and coerced worship on the Plain of Dura', 'Faithfulness “even if He does not” — obedience unbound from outcome', 'The Fourth Man walking unbound in the heart of the sevenfold furnace'],
    backQuote: '“Our God whom we serve is able to deliver us—and if not, we still will not bow.”',
    cloth: '#5a2118', labelHue: '#210c09', marble: ['#1e0e0a', '#c4582e', '#e7b75a', '#4a1a14', '#f0dfb8'], k: 0.87, thick: 0.90 },
  { horizon: 'Babylon’s Cedar', binding: 'Cedar Verdigris · Octavo', epigraph: 'DOMINATUR EXCELSUS · DAN IV',
    pillars: ['The cosmic tree reaching heaven and the Watcher’s decree of humbling', 'Seven seasons in the field until pride yields to praise', 'A pagan emperor’s encyclical confessing the Most High rules'],
    backQuote: '“Those who walk in pride He is able to put down—spoken by the king who learned it in the dew.”',
    cloth: '#213a29', labelHue: '#0d1710', marble: ['#0e1a12', '#4f7a52', '#c9a456', '#6b2a1e', '#e4dcc0'], k: 0.90, thick: 0.94 },
  { horizon: '539 BC · Fall of Babylon', binding: 'Tyrian Porphyry · Duodecimo', epigraph: 'MENE TEKEL UPHARSIN · DAN V',
    pillars: ['Sacrilege with the Jerusalem temple vessels while the Medes divert the river', 'MENE, MENE, TEKEL, UPHARSIN — numbered, weighed, and divided', 'The suddenness of judgment when a civilization exhausts its measure'],
    backQuote: '“In that very night Belshazzar king of the Chaldeans was slain.”',
    cloth: '#43203a', labelHue: '#1a0d15', marble: ['#1a0c16', '#7c3a6a', '#d6ae5e', '#2a3a4e', '#eadcc4'], k: 0.86, thick: 0.88 },
  { horizon: 'Medo-Persian Court', binding: 'Median Teal · Octavo', epigraph: 'FENESTRAE APERTAE · DAN VI',
    pillars: ['Weaponized law: when integrity leaves adversaries no ground but worship', 'Windows open toward Jerusalem three times a day as before', 'The sealed pit, the sleepless king, and the type of resurrection morning'],
    backQuote: '“No fault was found in him, because he was faithful, neither was there any error.”',
    cloth: '#1c3a3e', labelHue: '#0c1719', marble: ['#0b1719', '#2f6d70', '#d8b462', '#7b3324', '#e9e0c6'], k: 0.91, thick: 0.92 },
  { horizon: 'Sea, Beasts & Court', binding: 'Imperial Indigo · Quarto', epigraph: 'ANTIQUUS DIERUM · DAN VII',
    pillars: ['Lion, Bear, Leopard, and terrifying Fourth Beast rising from the winds', 'The Little Horn, the uprooted three, and the saints worn down through time', 'The Ancient of Days seated in judgment and the Son of Man receiving dominion'],
    backQuote: '“The court was seated, and the books were opened—history’s monsters answered by heaven’s bench.”',
    cloth: '#2a2547', labelHue: '#110e1c', marble: ['#100d1e', '#4b4690', '#d5b05e', '#842f2a', '#e7dec8'], k: 0.98, thick: 1.12 },
  { horizon: '2,300 Evenings & Mornings', binding: 'Sanctuary Ochre · Quarto', epigraph: 'MUNDABITUR SANCTUARIUM · DAN VIII',
    pillars: ['The two-horned Ram and the swift Javanese Goat across the face of the earth', 'Horizontal and vertical expansion against the Prince of the host', 'The cleansing of the sanctuary and Gabriel’s command to understand the vision'],
    backQuote: '“Unto two thousand and three hundred days; then shall the sanctuary be cleansed.”',
    cloth: '#5a4120', labelHue: '#1c150a', marble: ['#1c140a', '#a8792e', '#ead08a', '#3d2a52', '#efe3c3'], k: 0.93, thick: 1.04 },
  { horizon: '490 Prophetic Years', binding: 'Covenant Crimson · Quarto', epigraph: 'SEPTUAGINTA HEBDOMADES · DAN IX',
    pillars: ['Daniel’s intercessory confession anchored in Jeremiah’s seventy-year scroll', 'From the decree to restore Jerusalem unto Messiah the Prince', 'Anointing the Most Holy and confirming the covenant in the midst of the week'],
    backQuote: '“Seventy weeks are determined upon thy people and upon thy holy city to finish the transgression.”',
    cloth: '#55201f', labelHue: '#1e0c0c', marble: ['#1e0c0c', '#9c2e28', '#dcb466', '#24384a', '#ecdcbc'], k: 0.96, thick: 1.10 },
  { horizon: 'Time of the End', binding: 'Obsidian Astral · Folio', epigraph: 'FULGEBUNT QUASI STELLAE · DAN XII',
    pillars: ['The radiant Man clothed in linen by the Hiddekel and unseen spiritual warfare', 'Kings of the North and South traced with startling historical precision', 'Michael standing up, the resurrection from the dust, and the unsealed book'],
    backQuote: '“Those who are wise shall shine like the brightness of the firmament, and those who turn many to righteousness like the stars.”',
    cloth: '#1a2433', labelHue: '#0b0f16', marble: ['#0a0f16', '#2c4466', '#e2c46e', '#5a2a3a', '#e3dccb'], k: 1.00, thick: 1.18 }
];

const SAMPLE = [
  ['Sheet 00 · Prologue', 'The Battle of Hermeneutics: The Historicist Blueprint', 'Four questions asked of every verse — text, history, interpretation, Christ — and a clear line between what the text says and what the framework adds.', 'Daniel 1–12 · Method', '20 min'],
  ['Sheet 01 · Daniel 1', 'Faithfulness in Babylon: The Uncompromised Table', 'Four young men, a king’s table, and a decision made before the test arrived.', 'Daniel 1:1–21', '14 min'],
  ['Sheet 02 · Daniel 2', 'The Image of Four Metals: The Backbone of Prophecy', 'A dream the wise men could not even recount, and a sequence of kingdoms that ends in stone.', 'Daniel 2:1–49', '22 min'],
  ['Sheet 03 · Daniel 3', 'The Furnace and the Fourth Man: Unbowed Conscience', 'A gold image, a decree, and three men who would not bow, with or without rescue.', 'Daniel 3:1–30', '16 min'],
  ['Sheet 04 · Daniel 4', 'The Tree Cut Down: The Humbling of a Monarch', 'A king’s pride, a dream of a felled tree, and seven years that taught him who rules.', 'Daniel 4:1–37', '18 min'],
  ['Sheet 05 · Daniel 5', 'Writing on the Plaster: Weighed in the Balances', 'A feast with temple vessels, a hand without a body, and a kingdom gone by morning.', 'Daniel 5:1–31', '15 min'],
  ['Sheet 06 · Daniel 6', 'The Den of Lions: Windows Open Toward Jerusalem', 'A law that could not be changed, a prayer that would not be, and a night in the pit.', 'Daniel 6:1–28', '15 min'],
  ['Sheet 07 · Daniel 7', 'Four Beasts and the Court: The Son of Man Enthroned', 'Four beasts from the sea, a little horn, and a court that sits in judgment.', 'Daniel 7:1–28', '26 min'],
  ['Sheet 08 · Daniel 8', 'The Ram, the Goat, the Horn: The Sanctuary Vision', 'Two powers, a swift conquest, and a horn that magnifies itself against the Prince.', 'Daniel 8:1–27', '24 min'],
  ['Sheet 09 · Daniel 9', 'Seventy Weeks: The Messianic Measure', 'A prayer of confession, and 490 years measured out for the people and the city.', 'Daniel 9:1–27', '28 min'],
  ['Sheet 10 · Daniel 10–12', 'The Final Vision: Sealed Until the Time of the End', 'A messenger, a long war foretold, and a book sealed until the time of the end.', 'Daniel 10:1–12:13', '30 min']
].map((a) => ({ epoch: a[0], title: a[1], subtitle: a[2], scripture: a[3], readTime: a[4] }));

const SHELF_SRC = window.SHELF_DATA || window.sheetsData;
const DATA = (SHELF_SRC && SHELF_SRC.length) ? SHELF_SRC.slice() : SAMPLE;
const N = DATA.length;
const J = window.BAJourney || null;

function can(i) { try { return J && J.canAccessSheet ? !!J.canAccessSheet(i) : true; } catch (e) { return true; } }
function done(i) { try { return J && J.sheetCompleted ? !!J.sheetCompleted(i) : false; } catch (e) { return false; } }
function clean(t) {
  return String(t == null ? '' : t)
    .replace(/&bull;/g, '·').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…')
    .replace(/<[^>]*>/g, '');
}
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function split(t) { t = clean(t); const a = t.indexOf(':'); return a > 0 ? [t.slice(0, a).trim(), t.slice(a + 1).trim()] : [t.trim(), '']; }
function cap(t) { return clean(t).toLowerCase().replace(/(^|[\s·])(\w)/g, (m, a, b) => a + b.toUpperCase()); }
function num(t) { const m = /sheet\s*0*(\d+)/i.exec(clean(t)); return m ? Number(m[1]) : 0; }
function roman(n) {
  n = Number(n) || 0;
  if (!n) return '0';
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}

const VOLS = DATA.map((d, i) => {
  const ex = ARCHIVE_EXTRAS[i % ARCHIVE_EXTRAS.length];
  const t = split(d.title);
  const p = split((d.infographic && d.infographic.title) || d.title);
  const n = num(d.epoch);
  return {
    i, d, ex, n,
    roman: roman(n),
    cat: 'DAN-' + String(n).padStart(2, '0'),
    title: t[0],
    sub: t[1],
    spineTitle: p[0],
    epoch: cap(d.epoch),
    scripture: clean(d.scripture),
    time: clean(d.readTime),
    deck: clean(d.subtitle)
  };
});

/* ---------------- Local memory (last volume entered) ---------------- */
const LS_LAST = 'daniel-shelf:last';
function getLast() { try { const v = localStorage.getItem(LS_LAST); return v == null ? -1 : Number(v); } catch (e) { return -1; } }
function setLast(i) { try { localStorage.setItem(LS_LAST, String(i)); } catch (e) {} }
function doneCount() { let c = 0; for (let i = 0; i < N; i++) if (done(i)) c++; return c; }
function continueIndex() {
  const last = getLast();
  if (last >= 0 && last < N && !done(last) && can(last)) return last;
  for (let i = 0; i < N; i++) if (can(i) && !done(i)) return i;
  return 0;
}

/* ---------------- Foley ---------------- */
let soundOn = true;
let actx = null;
function foley(type) {
  if (!soundOn) return;
  try {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
    if (actx.state === 'suspended') actx.resume();
    const now = actx.currentTime;
    const out = actx.createGain();
    out.gain.value = 0.9;
    out.connect(actx.destination);
    const noise = (dur, freq, q, peak, delay = 0, filterType = 'bandpass') => {
      const len = Math.floor(actx.sampleRate * dur);
      const buf = actx.createBuffer(1, len, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
      const src = actx.createBufferSource(); src.buffer = buf;
      const f = actx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = actx.createGain();
      g.gain.setValueAtTime(peak, now + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      src.connect(f); f.connect(g); g.connect(out); src.start(now + delay);
    };
    const thump = (f0, f1, dur, peak, delay = 0) => {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0, now + delay); o.frequency.exponentialRampToValueAtTime(f1, now + delay + dur);
      g.gain.setValueAtTime(peak, now + delay); g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      o.connect(g); g.connect(out); o.start(now + delay); o.stop(now + delay + dur + 0.02);
    };
    if (type === 'hover') { noise(0.06, 1100, 2.2, 0.014); thump(130, 70, 0.05, 0.012); }
    else if (type === 'pull') { noise(0.32, 480, 1.2, 0.05); noise(0.18, 1800, 1.6, 0.012, 0.05); thump(90, 40, 0.28, 0.07, 0.28); }
    else if (type === 'open') { noise(0.5, 260, 3.5, 0.02); noise(0.26, 1900, 1.6, 0.03, 0.12); noise(0.22, 2600, 1.2, 0.018, 0.3); }
    else if (type === 'close') { noise(0.2, 1500, 1.4, 0.022); thump(80, 34, 0.16, 0.06, 0.18); }
    else if (type === 'turn') { noise(0.14, 900, 1.5, 0.016); }
    else if (type === 'return') { noise(0.35, 420, 1.3, 0.04); thump(66, 30, 0.2, 0.08, 0.32); }
  } catch (e) {}
}

/* ---------------- DOM refs ---------------- */
/* The shelf is a section of the home page, so its state classes (is-open,
   is-drawer, is-ready ...) live on the stage element, not on <body>, and
   everything is sized from the stage rather than the window. */
const body = document.getElementById('shelf-stage');
const SHELF_PORTRAIT = 'assets/site/shelf-portrait.jpg';
const stageW = () => body.clientWidth || innerWidth;
const stageH = () => body.clientHeight || innerHeight;
/* Viewport point -> 0..1 inside the canvas (the canvas fills the stage). */
function stageFrac(clientX, clientY) {
  const r = body.getBoundingClientRect();
  return { x: (clientX - r.left) / (r.width || 1), y: (clientY - r.top) / (r.height || 1) };
}
let stageInView = true;
(function followHeader() {
  const sel = body.dataset.offsetFrom;
  const head = sel ? document.querySelector(sel) : null;
  if (!head) return;
  const sync = () => body.style.setProperty("--shelf-nav-h", Math.round(head.getBoundingClientRect().height) + "px");
  sync();
  if (window.ResizeObserver) new ResizeObserver(sync).observe(head); else addEventListener("resize", sync);
})();
const loaderBar = $('#loader-bar');
const loaderStatus = $('#loader-status');
const glCanvas = $('#gl');
const tag = $('#spine-tag');
const dossier = $('#dossier');
function setLoader(p, msg) {
  loaderBar.style.setProperty('--p', String(Math.max(0, Math.min(1, p))));
  if (msg) loaderStatus.textContent = msg;
}
const nextFrame = () => new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 60); });
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* =====================================================================
   UI (works with or without WebGL)
   ===================================================================== */
let selected = -1;
let view = 'cover';
let api = null; // set once the 3D room is live

function buildChrome() {
  const dots = $('#progress-dots');
  dots.innerHTML = VOLS.map((v) => '<i class="' + (done(v.i) ? 'done' : '') + '"></i>').join('');
  $('#progress-text').textContent = doneCount() + ' / ' + N + ' read';

  const ci = continueIndex();
  const cv = VOLS[ci];
  const started = doneCount() > 0 || getLast() >= 0;
  $('#continue-text').textContent = (started ? 'Continue · Vol. ' : 'Begin with Vol. ') + cv.roman + ' — ' + cv.title;

  $('#cat-list').innerHTML = VOLS.map((v) => {
    const state = done(v.i) ? 'done' : can(v.i) ? '' : 'locked';
    const label = done(v.i) ? 'Completed' : can(v.i) ? 'Open' : 'Locked';
    return '<li><button class="cat-item" type="button" data-i="' + v.i + '">' +
      '<span class="cat-swatch" style="background:linear-gradient(90deg,' + v.ex.cloth + ',' + shade(v.ex.cloth, 0.25) + ' 45%,' + v.ex.cloth + ')">' + esc(v.roman) + '</span>' +
      '<span class="cat-text"><span class="cat-title">' + esc(v.title) + '</span>' +
      '<span class="cat-meta">' + esc(v.scripture) + ' · ' + esc(v.time) + '</span></span>' +
      '<span class="cat-state ' + state + '" title="' + label + '"></span>' +
      '<span class="sr-only">' + label + '</span>' +
      '</button></li>';
  }).join('');
  $('#cat-foot').textContent = N + ' volumes · ' + doneCount() + ' completed · Daniel Historicist Press';
}

function shade(hex, amt) {
  const c = parseInt(hex.slice(1), 16);
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function fillDossier(i, instant) {
  const v = VOLS[i];
  const ok = can(i), dn = done(i);
  const apply = () => {
    $('#d-meta').textContent = 'Vol. ' + v.roman + ' · Cat. ' + v.cat;
    const badge = $('#d-badge');
    badge.className = 'badge' + (dn ? ' completed' : ok ? '' : ' locked');
    badge.textContent = dn ? 'Completed' : ok ? 'Open sitting' : 'Locked';
    $('#d-title').textContent = v.title;
    $('#d-sub').textContent = v.sub || v.ex.horizon;
    $('#d-deck').textContent = v.deck;
    $('#d-epigraph').textContent = v.ex.epigraph;
    $('#d-ref').textContent = v.scripture;
    $('#d-time').textContent = v.time;
    $('#d-horizon').textContent = v.ex.horizon;
    $('#d-binding').textContent = v.ex.binding;
    $('#d-contents').innerHTML = v.ex.pillars.map((p, k) => '<li><b>' + roman(k + 1) + '.</b><span>' + esc(p) + '</span></li>').join('');
    const go = $('#d-go');
    go.href = ok ? 'study.html?sheet=' + i + '&preview=full' : 'account.html?next=' + encodeURIComponent('study.html?sheet=' + i);
    $('#d-go-text').textContent = ok ? (dn ? 'Reopen the sitting' : 'Enter the sitting') : 'Sign in to unlock';
    $('#d-journey').innerHTML = VOLS.map((w) => '<button type="button" data-i="' + w.i + '" class="' +
      (w.i === i ? 'current' : done(w.i) ? 'done' : can(w.i) ? '' : 'locked') + '" title="Vol. ' + esc(w.roman) + ' — ' + esc(w.title) + '" aria-label="Go to volume ' + esc(w.roman) + '"></button>').join('');
    $('#d-journey-text').textContent = doneCount() + ' of ' + N + ' completed';
    const pv = VOLS[(i - 1 + N) % N], nv = VOLS[(i + 1) % N];
    $('#d-prev-t').textContent = 'Vol. ' + pv.roman + ' · ' + pv.title;
    $('#d-next-t').textContent = 'Vol. ' + nv.roman + ' · ' + nv.title;
    $('#d-count').textContent = (i + 1) + ' / ' + N;
    document.querySelectorAll('.cat-item').forEach((el) => el.classList.toggle('current', Number(el.dataset.i) === i));
    dossier.classList.remove('sh-swap');
  };
  if (instant) apply();
  else if (window.Cinema && !window.Cinema.reduced) window.Cinema.swap(apply, dossier.querySelector('.dossier-body') || dossier);
  else { dossier.classList.add('sh-swap'); setTimeout(apply, 240); }
}

function setViewUI(v) {
  document.querySelectorAll('.view-btn[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#d-open').textContent = v === 'open' ? 'Close the boards' : 'Open the boards';
}

function openDrawer(on) {
  body.classList.toggle('is-drawer', on);
  $('#btn-catalogue').setAttribute('aria-expanded', String(on));
  if (on) setTimeout(() => { const c = document.querySelector('.cat-item.current') || document.querySelector('.cat-item'); if (c) c.focus({ preventScroll: true }); }, 350);
}

function hostSittingOpener() {
  return typeof window.openSittingFromPortal === 'function' ? window.openSittingFromPortal : null;
}

function opensInNewTab(e) {
  return e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1;
}

function enterSitting(i) {
  if (!can(i)) {
    location.href = 'account.html?next=' + encodeURIComponent('study.html?sheet=' + i);
    return;
  }
  setLast(i);
  const openInPlace = hostSittingOpener();
  if (openInPlace) {
    if (api && selected >= 0) api.put();
    openInPlace(i);
    return;
  }
  location.href = 'study.html?sheet=' + i + '&preview=full';
}

function select(i) {
  if (i < 0 || i >= N) return;
  openDrawer(false);
  if (!api) { // no WebGL: go straight to the sitting
    enterSitting(i);
    return;
  }
  api.pull(i);
}

function wireUI() {
  $('#btn-catalogue').addEventListener('click', () => openDrawer(!body.classList.contains('is-drawer')));
  $('#btn-browse').addEventListener('click', () => openDrawer(true));
  $('#cat-close').addEventListener('click', () => openDrawer(false));
  $('#scrim').addEventListener('click', () => openDrawer(false));
  $('#cat-list').addEventListener('click', (e) => { const b = e.target.closest('.cat-item'); if (b) select(Number(b.dataset.i)); });
  $('#btn-continue').addEventListener('click', () => select(continueIndex()));
  $('#d-journey').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) select(Number(b.dataset.i)); });
  $('#d-prev').addEventListener('click', () => api && api.step(-1));
  $('#d-next').addEventListener('click', () => api && api.step(1));
  $('#d-open').addEventListener('click', () => api && api.setView(view === 'open' ? 'cover' : 'open'));
  $('#d-go').addEventListener('click', (e) => {
    if (selected < 0) return;
    if (opensInNewTab(e)) { if (can(selected)) setLast(selected); return; }
    e.preventDefault();
    enterSitting(selected);
  });
  $('#d-link').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#volume-' + selected;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast('Copy failed'); }
  });
  document.querySelectorAll('.view-btn[data-view]').forEach((b) => b.addEventListener('click', () => api && api.setView(b.dataset.view)));
  $('#hud-shelf').addEventListener('click', () => api && api.put());

  const sb = $('#btn-sound');
  const toggleSound = () => {
    soundOn = !soundOn;
    sb.setAttribute('aria-pressed', String(soundOn));
    $('#sound-label').textContent = soundOn ? 'Foley on' : 'Muted';
    $('#sound-icon').textContent = soundOn ? '♦' : '◇';
    if (soundOn) foley('hover');
  };
  sb.addEventListener('click', toggleSound);
  $('#btn-full').addEventListener('click', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (body.requestFullscreen) body.requestFullscreen();
    } catch (e) {}
  });

  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('onboard-open')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const focusInside = body.contains(document.activeElement) && document.activeElement !== document.body;
    // Shortcuts belong to the shelf only while it is on screen or holds focus.
    if (!stageInView && !focusInside) return;
    const k = e.key;
    if (k === 'Escape') {
      if (body.classList.contains('is-drawer')) { openDrawer(false); return; }
      if (api && selected >= 0) api.put();
      return;
    }
    if (k === 'c' || k === 'C') { openDrawer(!body.classList.contains('is-drawer')); return; }
    if (k === 'm' || k === 'M') { toggleSound(); return; }
    if (!api || body.classList.contains('is-drawer')) return;
    if (selected >= 0) {
      if (k === 'ArrowRight') { e.preventDefault(); api.step(1); }
      else if (k === 'ArrowLeft') { e.preventDefault(); api.step(-1); }
      else if (k === 'o' || k === 'O') api.setView(view === 'open' ? 'cover' : 'open');
      else if (k === 'f' || k === 'F') api.setView(view === 'back' ? 'cover' : 'back');
      else if (k === 's' || k === 'S') api.setView('spine');
      else if (k >= '1' && k <= '5') api.setView(['cover', 'open', 'spine', 'back', 'edges'][Number(k) - 1]);
    } else {
      if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); api.focusStep(k === 'ArrowRight' ? 1 : -1); }
      else if ((k === 'Enter' || k === ' ') && focusInside) { if (api.focused() >= 0) { e.preventDefault(); api.pull(api.focused()); } }
    }
  });
}

/* =====================================================================
   Canvas texture painting (cloth, foil, paper, marbling, wood)
   ===================================================================== */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function tint(src, color, blur) {
  const c = mk(src.width, src.height), x = c.getContext('2d');
  if (blur) x.filter = 'blur(' + blur + 'px)';
  x.drawImage(src, 0, 0);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

let WEAVE = null;
function makeWeave() {
  const S = 128, c = mk(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), r = rng(7);
  for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) {
    const cx = i % 4, cy = y % 4, blk = ((i >> 2) + (y >> 2)) & 1;
    const warp = Math.sin(((cx + 0.5) / 4) * Math.PI), weft = Math.sin(((cy + 0.5) / 4) * Math.PI);
    const v = 60 + (blk ? warp : weft) * 140 + (r() - 0.5) * 60;
    const o = (y * S + i) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.max(0, Math.min(255, v));
    img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function paintCloth(x, w, h, color, seed, opts = {}) {
  const r = rng(seed);
  x.fillStyle = color;
  x.fillRect(0, 0, w, h);
  // Sun-fade and handling mottling
  for (let k = 0; k < 30; k++) {
    const cx = r() * w, cy = r() * h, rad = (0.12 + r() * 0.5) * Math.max(w, h);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const light = r() > 0.55;
    g.addColorStop(0, light ? 'rgba(255,236,200,0.05)' : 'rgba(0,0,0,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }
  // Woven buckram
  x.save();
  x.globalAlpha = 0.2;
  x.globalCompositeOperation = 'overlay';
  x.fillStyle = x.createPattern(WEAVE, 'repeat');
  x.fillRect(0, 0, w, h);
  x.restore();
  // Loose fibres
  x.save();
  for (let k = 0; k < (w * h) / 1800; k++) {
    x.globalAlpha = 0.03 + r() * 0.05;
    x.strokeStyle = r() > 0.5 ? '#fff3dc' : '#000';
    x.lineWidth = 0.6;
    const px = r() * w, py = r() * h, a = r() * Math.PI, l = 3 + r() * 9;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  x.restore();
  if (opts.wear !== false) {
    // Rubbed edges and corners
    const e = Math.max(w, h) * 0.014;
    const edge = (x0, y0, x1, y1) => {
      const g = x.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(255,232,196,0.13)');
      g.addColorStop(1, 'rgba(255,232,196,0)');
      x.fillStyle = g;
    };
    edge(0, 0, 0, e); x.fillRect(0, 0, w, e);
    edge(0, h, 0, h - e); x.fillRect(0, h - e, w, e);
    if (opts.foreEdge === 'right') { edge(w, 0, w - e, 0); x.fillRect(w - e, 0, e, h); }
    if (opts.foreEdge === 'left') { edge(0, 0, e, 0); x.fillRect(0, 0, e, h); }
    const corners = opts.foreEdge === 'right' ? [[w, 0], [w, h]] : opts.foreEdge === 'left' ? [[0, 0], [0, h]] : [];
    for (const [cx, cy] of corners) {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, e * 3.2);
      g.addColorStop(0, 'rgba(255,226,186,0.24)');
      g.addColorStop(1, 'rgba(255,226,186,0)');
      x.fillStyle = g;
      x.fillRect(cx - e * 4, cy - e * 4, e * 8, e * 8);
    }
  }
}

function goldLayer(mask) {
  const w = mask.width, h = mask.height, c = mk(w, h), x = c.getContext('2d');
  x.drawImage(mask, 0, 0);
  x.globalCompositeOperation = 'source-in';
  const g = x.createLinearGradient(0, 0, w * 0.7, h);
  g.addColorStop(0, '#d2a24a');
  g.addColorStop(0.3, '#ecc571');
  g.addColorStop(0.5, '#f5d892');
  g.addColorStop(0.72, '#dcae55');
  g.addColorStop(1, '#c19040');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  return c;
}

/* Builds colour + ORM (G = roughness, B = metalness) + bump maps for a foil-stamped cloth surface */
function surface(w, h, o) {
  const baseC = mk(w, h), bx = baseC.getContext('2d');
  o.base(bx, w, h);
  let blindC = null;
  if (o.blind) {
    blindC = mk(w, h);
    const b = blindC.getContext('2d');
    b.fillStyle = b.strokeStyle = '#fff';
    o.blind(b, w, h);
  }
  const foilC = mk(w, h), f = foilC.getContext('2d');
  f.fillStyle = f.strokeStyle = '#fff';
  if (o.foil) o.foil(f, w, h);
  // Foil wear: tiny flecks where the leaf has lifted
  const r = rng(o.seed || 3);
  f.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < (w * h) / 700; k++) {
    f.globalAlpha = r() * 0.55;
    f.beginPath();
    f.arc(r() * w, r() * h, r() * 1.8 + 0.3, 0, 7);
    f.fill();
  }
  f.globalAlpha = 1;
  f.globalCompositeOperation = 'source-over';

  const col = mk(w, h), c = col.getContext('2d');
  c.drawImage(baseC, 0, 0);
  if (blindC) {
    c.globalAlpha = 0.45; c.drawImage(tint(blindC, '#000', 1.2), 0, 0);
    c.globalAlpha = 0.12; c.drawImage(tint(blindC, '#fff2d6', 0.8), -1, -1);
    c.globalAlpha = 1;
  }
  c.globalAlpha = 0.6; c.drawImage(tint(foilC, '#000', 1.6), 0, 1.4); c.globalAlpha = 1;
  c.drawImage(goldLayer(foilC), 0, 0);

  const orm = mk(w, h), m = orm.getContext('2d');
  const cr = Math.round((o.clothRough ?? 0.86) * 255), fr = Math.round((o.foilRough ?? 0.3) * 255);
  m.fillStyle = 'rgb(0,' + cr + ',0)';
  m.fillRect(0, 0, w, h);
  if (blindC) m.drawImage(tint(blindC, 'rgb(0,' + Math.round(cr * 0.78) + ',0)'), 0, 0);
  m.drawImage(tint(foilC, 'rgb(0,' + fr + ',255)'), 0, 0);

  const bump = mk(w, h), bb = bump.getContext('2d');
  bb.fillStyle = '#8c8c8c';
  bb.fillRect(0, 0, w, h);
  bb.globalAlpha = 0.6;
  bb.fillStyle = bb.createPattern(WEAVE, 'repeat');
  bb.fillRect(0, 0, w, h);
  bb.globalAlpha = 1;
  if (o.bumpExtra) o.bumpExtra(bb, w, h);
  if (blindC) bb.drawImage(tint(blindC, '#2c2c2c', 1.6), 0, 0);
  bb.drawImage(tint(foilC, '#404040', 1.1), 0, 0);
  return { col, orm, bump };
}

function wrapLines(x, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function fitLines(x, text, fontFor, maxW, maxLines, size, min) {
  for (let s = size; s >= min; s -= Math.max(1, s * 0.05)) {
    x.font = fontFor(s);
    const lines = wrapLines(x, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => x.measureText(l).width <= maxW)) return { size: s, lines };
  }
  x.font = fontFor(min);
  return { size: min, lines: wrapLines(x, text, maxW).slice(0, maxLines) };
}
function spaced(x, px) { try { x.letterSpacing = px + 'px'; } catch (e) {} }

function spandrel(x, cx, cy, s, sx, sy, lw) {
  x.save();
  x.translate(cx, cy);
  x.scale(sx, sy);
  const k = s / 32;
  x.lineWidth = lw;
  x.beginPath(); x.moveTo(0, 30 * k); x.lineTo(0, 0); x.lineTo(30 * k, 0); x.stroke();
  x.beginPath(); x.moveTo(4.5 * k, 22 * k); x.lineTo(4.5 * k, 4.5 * k); x.lineTo(22 * k, 4.5 * k); x.stroke();
  x.beginPath(); x.moveTo(0, 13 * k); x.bezierCurveTo(7 * k, 13 * k, 13 * k, 7 * k, 13 * k, 0); x.stroke();
  x.beginPath(); x.moveTo(9 * k, 13 * k); x.quadraticCurveTo(17 * k, 17 * k, 13 * k, 9 * k); x.stroke();
  x.beginPath(); x.arc(9.5 * k, 9.5 * k, 1.9 * k, 0, 7); x.fill();
  x.beginPath(); x.arc(26 * k, 4.5 * k, 1.1 * k, 0, 7); x.fill();
  x.beginPath(); x.arc(4.5 * k, 26 * k, 1.1 * k, 0, 7); x.fill();
  x.restore();
}
function diamond(x, cx, cy, r) {
  x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * 0.62, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r * 0.62, cy); x.closePath(); x.fill();
}
function fleuron(x, cx, cy, r) {
  diamond(x, cx, cy, r);
  diamond(x, cx - r * 1.25, cy, r * 0.42);
  diamond(x, cx + r * 1.25, cy, r * 0.42);
  diamond(x, cx, cy - r * 1.35, r * 0.32);
  diamond(x, cx, cy + r * 1.35, r * 0.32);
}
function printerMark(x, cx, cy, s, lw) {
  x.save();
  x.translate(cx - s / 2, cy - s / 2);
  const k = s / 60;
  x.scale(k, k);
  x.lineWidth = lw / k;
  x.beginPath(); x.arc(30, 30, 26, 0, 7); x.stroke();
  x.setLineDash([2, 2]); x.beginPath(); x.arc(30, 30, 22, 0, 7); x.stroke(); x.setLineDash([]);
  x.stroke(new Path2D('M30 8 L30 52 M14 22 L46 22 M18 42 L42 42'));
  x.stroke(new Path2D('M30 14 L35 30 L30 46 L25 30 Z'));
  x.beginPath(); x.arc(30, 30, 3, 0, 7); x.fill();
  x.restore();
}

/* Cover medallion motifs (white-on-transparent SVG, rasterised into the foil layer) */
function motifSVG(index) {
  const M = 'fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="none" stroke="#fff" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round"';
  const D = 'fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="1.5 2.5"';
  const ring = '<circle cx="50" cy="50" r="46" ' + M + '/><circle cx="50" cy="50" r="43" ' + D + '/><circle cx="50" cy="50" r="39" ' + F + '/>';
  const motifs = [
    ring + '<circle cx="50" cy="50" r="27" ' + F + '/><path d="M50 6 L50 94 M6 50 L94 50" ' + F + '/><path d="M19 19 L81 81 M81 19 L19 81" ' + D + '/><polygon points="50,12 56,44 88,50 56,56 50,88 44,56 12,50 44,44" ' + M + '/><polygon points="50,24 54,46 76,50 54,54 50,76 46,54 24,50 46,46" ' + F + '/><circle cx="50" cy="50" r="6" ' + M + '/><circle cx="50" cy="50" r="2" fill="#fff"/>',
    ring + '<path d="M30 74 L70 74 M35 69 L65 69" ' + M + '/><path d="M46 48 L46 69 M54 48 L54 69 M50 48 L50 69" ' + F + '/><path d="M29 33 C29 50, 71 50, 71 33 Z" ' + M + '/><path d="M33 36 C33 46, 67 46, 67 36" ' + F + '/><path d="M26 27 L35 17 L43 24 L50 15 L57 24 L65 17 L74 27 Z" ' + M + '/><circle cx="50" cy="12" r="2" fill="#fff"/><circle cx="35" cy="14" r="1.5" fill="#fff"/><circle cx="65" cy="14" r="1.5" fill="#fff"/>',
    ring + '<polygon points="50,14 75,78 25,78" ' + M + '/><polygon points="50,19 71,75 29,75" ' + F + '/><line x1="42" y1="34" x2="58" y2="34" ' + M + '/><line x1="37" y1="47" x2="63" y2="47" ' + M + '/><line x1="32" y1="60" x2="68" y2="60" ' + M + '/><line x1="28" y1="70" x2="72" y2="70" ' + F + '/><polygon points="69,18 84,26 79,40 64,34" ' + M + '/><path d="M64 34 L48 52 M66 28 L55 38" ' + D + '/>',
    ring + '<path d="M25 78 L25 42 A25 25 0 0 1 75 42 L75 78 Z" ' + M + '/><path d="M30 78 L30 43 A20 20 0 0 1 70 43 L70 78" ' + F + '/><path d="M50 20 C60 36, 40 46, 50 66 C60 46, 40 36, 50 20 Z" ' + M + '/><path d="M38 35 C44 47, 34 55, 40 72" ' + M + '/><path d="M62 35 C56 47, 66 55, 60 72" ' + M + '/><circle cx="50" cy="36" r="10" ' + D + '/>',
    ring + '<circle cx="50" cy="50" r="31" ' + D + '/><circle cx="50" cy="50" r="21" ' + F + '/><path d="M33 77 L43 53 L57 53 L67 77" ' + M + '/><line x1="20" y1="50" x2="80" y2="50" ' + M + '/><line x1="39" y1="58" x2="61" y2="58" ' + F + '/><path d="M50 15 L50 42 M35 23 L50 38 L65 23 M41 18 L50 28 L59 18" ' + M + '/>',
    ring + '<line x1="50" y1="14" x2="50" y2="82" ' + M + '/><path d="M35 82 L65 82 M41 78 L59 78" ' + M + '/><line x1="21" y1="36" x2="79" y2="28" ' + M + '/><path d="M21 36 L14 56 L28 56 Z" ' + M + '/><path d="M79 28 L72 48 L86 48 Z" ' + M + '/><circle cx="50" cy="32" r="4" ' + M + '/>',
    ring + '<rect x="29" y="21" width="42" height="56" rx="21" ' + M + '/><rect x="33" y="25" width="34" height="48" rx="17" ' + F + '/><line x1="50" y1="21" x2="50" y2="77" ' + M + '/><line x1="29" y1="45" x2="71" y2="45" ' + M + '/><line x1="29" y1="60" x2="71" y2="60" ' + M + '/><circle cx="50" cy="34" r="5.5" ' + M + '/>',
    ring + '<circle cx="50" cy="50" r="28" ' + F + '/><path d="M15 62 Q32 51 50 62 T85 62" ' + M + '/><path d="M18 70 Q35 59 50 70 T82 70" ' + M + '/><path d="M24 77 Q38 68 50 77 T76 77" ' + F + '/><polygon points="50,14 55,28 70,28 58,36 62,50 50,41 38,50 42,36 30,28 45,28" ' + M + '/><circle cx="50" cy="34" r="4" ' + F + '/>',
    ring + '<path d="M50 20 L50 79 M35 79 L65 79 M40 75 L60 75" ' + M + '/><path d="M36 36 C36 50, 64 50, 64 36" ' + M + '/><path d="M28 31 C28 56, 72 56, 72 31" ' + M + '/><path d="M20 26 C20 63, 80 63, 80 26" ' + F + '/><circle cx="50" cy="18" r="2.5" fill="#fff"/>',
    ring + '<circle cx="50" cy="50" r="32" ' + M + '/><circle cx="50" cy="50" r="28" ' + D + '/><circle cx="50" cy="50" r="16" ' + M + '/><line x1="50" y1="8" x2="50" y2="92" ' + F + '/><line x1="8" y1="50" x2="92" y2="50" ' + F + '/><line x1="20" y1="20" x2="80" y2="80" ' + F + '/><line x1="80" y1="20" x2="20" y2="80" ' + F + '/><polygon points="50,30 55,45 70,50 55,55 50,70 45,55 30,50 45,45" ' + M + '/>',
    ring + '<rect x="26" y="26" width="48" height="48" transform="rotate(45 50 50)" ' + M + '/><rect x="26" y="26" width="48" height="48" ' + M + '/><rect x="31" y="31" width="38" height="38" transform="rotate(22.5 50 50)" ' + F + '/><circle cx="50" cy="50" r="12" ' + M + '/><circle cx="50" cy="50" r="4" fill="#fff"/>'
  ];
  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 100 100">' + motifs[index % motifs.length] + '</svg>';
}
const MOTIFS = [];
async function loadMotifs() {
  const jobs = VOLS.map(async (v) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(motifSVG(v.i));
    try { await img.decode(); } catch (e) {}
    MOTIFS[v.i] = img;
  });
  await Promise.all(jobs);
}

/* ---- Spine ---- */
const BANDS = [0.13, 0.25, 0.70, 0.82];
function paintSpine(v, w, h) {
  const ex = v.ex, seed = 900 + v.i * 31;
  const labelTop = (BANDS[1] + 0.022) * h, labelBot = (BANDS[2] - 0.022) * h;
  return surface(w, h, {
    seed,
    clothRough: 0.84,
    foilRough: 0.26,
    base: (x) => {
      paintCloth(x, w, h, ex.cloth, seed, { wear: false });
      // Leather title label
      const lx = w * 0.1, lw = w * 0.8;
      const g = x.createLinearGradient(lx, 0, lx + lw, 0);
      g.addColorStop(0, shade2(ex.labelHue, -0.3));
      g.addColorStop(0.35, shade2(ex.labelHue, 0.12));
      g.addColorStop(0.7, ex.labelHue);
      g.addColorStop(1, shade2(ex.labelHue, -0.35));
      x.fillStyle = g;
      x.fillRect(lx, labelTop, lw, labelBot - labelTop);
      const r = rng(seed + 5);
      for (let k = 0; k < 400; k++) {
        x.fillStyle = 'rgba(' + (r() > 0.5 ? '255,240,220' : '0,0,0') + ',' + (0.03 + r() * 0.05) + ')';
        x.fillRect(lx + r() * lw, labelTop + r() * (labelBot - labelTop), 1 + r() * 2, 1 + r() * 2);
      }
      // Head and tail scuffing
      const sg = x.createLinearGradient(0, 0, 0, h * 0.04);
      sg.addColorStop(0, 'rgba(255,230,190,0.16)'); sg.addColorStop(1, 'rgba(255,230,190,0)');
      x.fillStyle = sg; x.fillRect(0, 0, w, h * 0.04);
      const tg = x.createLinearGradient(0, h, 0, h * 0.96);
      tg.addColorStop(0, 'rgba(255,230,190,0.2)'); tg.addColorStop(1, 'rgba(255,230,190,0)');
      x.fillStyle = tg; x.fillRect(0, h * 0.96, w, h * 0.04);
    },
    bumpExtra: (b) => {
      b.fillStyle = '#7a7a7a';
      b.fillRect(w * 0.1, labelTop, w * 0.8, labelBot - labelTop);
    },
    foil: (x) => {
      const lw = Math.max(1.5, h * 0.0016);
      const line = (y, t) => { x.fillRect(w * 0.04, y - t / 2, w * 0.92, t); };
      line(h * 0.022, lw * 1.6); line(h * 0.03, lw * 0.8);
      line(h * 0.978, lw * 1.6); line(h * 0.97, lw * 0.8);
      for (const b of BANDS) { line(b * h - h * 0.017, lw); line(b * h + h * 0.017, lw); }
      // Head compartment fleuron
      fleuron(x, w / 2, (0.03 + BANDS[0]) / 2 * h, w * 0.11);
      // Numeral medallion
      const cy2 = (BANDS[0] + BANDS[1]) / 2 * h, R = Math.min(w * 0.3, (BANDS[1] - BANDS[0]) * h * 0.36);
      x.lineWidth = lw * 1.2;
      x.beginPath(); x.arc(w / 2, cy2, R, 0, 7); x.stroke();
      x.lineWidth = lw * 0.6;
      x.beginPath(); x.arc(w / 2, cy2, R * 0.86, 0, 7); x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const numSize = R * (v.roman.length > 3 ? 0.62 : v.roman.length > 2 ? 0.78 : 1.0);
      x.font = '600 ' + numSize + 'px Cinzel, serif';
      x.fillText(v.roman, w / 2, cy2 + R * 0.05);
      // Label borders + vertical title
      x.fillRect(w * 0.1, labelTop, w * 0.8, lw);
      x.fillRect(w * 0.1, labelBot - lw, w * 0.8, lw);
      x.save();
      x.translate(w / 2, (labelTop + labelBot) / 2);
      x.rotate(Math.PI / 2);
      const avail = (labelBot - labelTop) * 0.86;
      const fit = fitLines(x, v.spineTitle.toUpperCase(), (sz) => '600 ' + sz + 'px Cinzel, serif', avail, 2, w * 0.3, w * 0.13);
      x.font = '600 ' + fit.size + 'px Cinzel, serif';
      spaced(x, fit.size * 0.06);
      const gap = fit.size * 1.12;
      fit.lines.forEach((l, k) => x.fillText(l, 0, (k - (fit.lines.length - 1) / 2) * gap));
      x.restore();
      // Fourth compartment: small ornament
      const cy4 = (BANDS[2] + BANDS[3]) / 2 * h;
      diamond(x, w / 2, cy4, w * 0.09);
      x.lineWidth = lw * 0.7;
      x.beginPath(); x.moveTo(w * 0.22, cy4); x.lineTo(w * 0.38, cy4); x.moveTo(w * 0.62, cy4); x.lineTo(w * 0.78, cy4); x.stroke();
      // Tail imprint
      const cy5 = (BANDS[3] + 0.97) / 2 * h;
      x.font = '500 ' + (w * 0.15) + 'px Cinzel, serif';
      spaced(x, w * 0.02);
      x.fillText('D·H·P', w / 2, cy5 - w * 0.13);
      x.font = '500 ' + (w * 0.1) + 'px Cinzel, serif';
      x.fillText('MMXXVI', w / 2, cy5 + w * 0.1);
    }
  });
}
function shade2(hex, amt) {
  const c = parseInt(hex.slice(1), 16);
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

const COVER_ART = window.SHELF_COVERS || [];
const COVER_IMG = [];
function ensureCoverArt(i) {
  if (COVER_IMG[i] || !COVER_ART[i]) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = COVER_ART[i];
  COVER_IMG[i] = img;
  img.decode().then(() => { img.cxReady = true; }, () => { img.cxReady = true; });
}
function artReady(i) { const a = COVER_IMG[i]; return !!(a && a.cxReady && a.naturalWidth); }
function artPending(i) { const a = COVER_IMG[i]; return !!(a && !a.cxReady); }
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function frontArtLayout(v, u, h, tw) {
  const m = mk(1, 1).getContext('2d');
  const volY = h - 9 * u;
  const subFont = (sz) => 'italic 500 ' + sz + 'px Newsreader, serif';
  let sl = v.sub ? fitLines(m, v.sub, subFont, tw, 2, 3.8 * u, 2.8 * u) : { lines: [], size: 0 };
  if (sl.lines.length === 2) {
    m.font = subFont(sl.size);
    if (m.measureText(sl.lines[1]).width < tw * 0.4) {
      const even = fitLines(m, v.sub, subFont, tw * 0.74, 2, sl.size, 2.8 * u);
      if (even.lines.length === 2) sl = even;
    }
  }
  const tf = fitLines(m, v.title, (sz) => '400 ' + sz + 'px Newsreader, serif', tw, 3, 8.6 * u, 5.2 * u);
  const subY = volY - 8.2 * u - (sl.lines.length - 1) * sl.size * 1.22;
  const titleY = (sl.lines.length ? subY - sl.size * 1.5 : volY - 8.2 * u) - (tf.lines.length - 1) * tf.size * 1.04;
  return { volY, sl, tf, subY, titleY, pressY: titleY - tf.size * 1.05 };
}

function paintFrontArt(v, w, h) {
  const ex = v.ex, seed = 100 + v.i * 17, u = w / 100, art = COVER_IMG[v.i];
  const L = 8.4 * u, R = w - 4.2 * u, x0 = L + 6 * u, tw = R - x0 - 6 * u;
  const lay = frontArtLayout(v, u, h, tw);
  return surface(w, h, {
    seed,
    base: (x) => {
      paintCloth(x, w, h, ex.cloth, seed, { foreEdge: 'right' });
      const pw = w - L, s = Math.max(pw / art.naturalWidth, h / art.naturalHeight);
      const dw = art.naturalWidth * s, dh = art.naturalHeight * s;
      x.drawImage(art, L + (pw - dw) / 2, 0, dw, dh);
      const vg = x.createRadialGradient(L + pw / 2, h * 0.36, h * 0.18, L + pw / 2, h * 0.36, h * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.42)');
      x.fillStyle = vg;
      x.fillRect(L, 0, pw, h);
      const fade = x.createLinearGradient(0, h * 0.5, 0, h);
      fade.addColorStop(0, rgba(ex.cloth, 0));
      fade.addColorStop(0.42, rgba(ex.cloth, 0.86));
      fade.addColorStop(0.7, rgba(ex.cloth, 0.97));
      fade.addColorStop(1, rgba(ex.cloth, 1));
      x.fillStyle = fade;
      x.fillRect(L, h * 0.5, pw, h * 0.5);
      if (WEAVE) {
        x.globalAlpha = 0.08;
        x.fillStyle = x.createPattern(WEAVE, 'repeat');
        x.fillRect(L, 0, pw, h);
        x.globalAlpha = 1;
      }
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#f1e6cc';
      let y = lay.titleY;
      x.font = '400 ' + lay.tf.size + 'px Newsreader, serif';
      lay.tf.lines.forEach((l) => { x.fillText(l, x0, y); y += lay.tf.size * 1.04; });
      x.fillStyle = 'rgba(232,218,190,0.82)';
      y = lay.subY;
      x.font = 'italic 500 ' + lay.sl.size + 'px Newsreader, serif';
      lay.sl.lines.forEach((l) => { x.fillText(l, x0, y); y += lay.sl.size * 1.22; });
    },
    blind: (x) => {
      x.fillRect(3.4 * u, 0, 1.3 * u, h);
    },
    foil: (x) => {
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.font = '600 ' + (2.4 * u) + 'px Cinzel, serif';
      spaced(x, 0.7 * u);
      x.fillText('VOLUME ' + v.roman, x0, lay.volY);
      x.font = '600 ' + (2.2 * u) + 'px Cinzel, serif';
      spaced(x, 0.6 * u);
      x.fillText('THE HISTORICIST PRESS', x0, lay.pressY);
      spaced(x, 0);
      x.fillRect(x0, lay.volY - 4.6 * u, 10 * u, 0.22 * u);
    }
  });
}

/* ---- Front cover ---- */
function paintFront(v, w, h) {
  if (artReady(v.i)) return paintFrontArt(v, w, h);
  const ex = v.ex, seed = 100 + v.i * 17, u = w / 100;
  const L = 8.4 * u, R = w - 4.2 * u;           // hinge on the left
  const cx = (L + R) / 2;
  const medY = h * 0.385, medR = 27 * u;
  const cartTop = h * 0.64, cartBot = h * 0.885;
  return surface(w, h, {
    seed,
    base: (x) => paintCloth(x, w, h, ex.cloth, seed, { foreEdge: 'right' }),
    blind: (x) => {
      x.fillRect(3.4 * u, 0, 1.3 * u, h);                       // French groove
      x.lineWidth = 0.5 * u;
      x.strokeRect(L - 1.6 * u, 3.0 * u, R - L + 2.6 * u, h - 6 * u);
      x.beginPath(); x.arc(cx, medY, medR, 0, 7); x.fill();      // medallion well
      x.lineWidth = 0.35 * u;
      x.strokeRect(L + 6 * u, cartTop - 1.6 * u, R - L - 12 * u, cartBot - cartTop + 3.2 * u);
    },
    foil: (x) => {
      x.lineWidth = 0.6 * u;
      x.strokeRect(L + 1.2 * u, 5.4 * u, R - L - 3.4 * u, h - 10.8 * u);
      x.lineWidth = 0.24 * u;
      x.strokeRect(L + 3 * u, 7.2 * u, R - L - 7 * u, h - 14.4 * u);
      const s = 9 * u, ix0 = L + 3 * u, iy0 = 7.2 * u, ix1 = R - 4 * u, iy1 = h - 7.2 * u;
      spandrel(x, ix0 + 1 * u, iy0 + 1 * u, s, 1, 1, 0.35 * u);
      spandrel(x, ix1 - 1 * u, iy0 + 1 * u, s, -1, 1, 0.35 * u);
      spandrel(x, ix0 + 1 * u, iy1 - 1 * u, s, 1, -1, 0.35 * u);
      spandrel(x, ix1 - 1 * u, iy1 - 1 * u, s, -1, -1, 0.35 * u);
      // Header
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '600 ' + (2.6 * u) + 'px Cinzel, serif';
      spaced(x, 0.9 * u);
      x.fillText('THE HISTORICIST PRESS', cx, 12.8 * u);
      spaced(x, 0);
      x.fillRect(cx - 16 * u, 15.4 * u, 32 * u, 0.22 * u);
      diamond(x, cx, 15.5 * u, 0.9 * u);
      // Medallion rings + motif
      x.lineWidth = 0.55 * u; x.beginPath(); x.arc(cx, medY, medR + 1.6 * u, 0, 7); x.stroke();
      for (let k = 0; k < 72; k++) {
        const a = (k / 72) * Math.PI * 2;
        x.beginPath(); x.arc(cx + Math.cos(a) * (medR + 3.4 * u), medY + Math.sin(a) * (medR + 3.4 * u), 0.32 * u, 0, 7); x.fill();
      }
      const img = MOTIFS[v.i];
      if (img && img.complete) x.drawImage(img, cx - medR * 0.9, medY - medR * 0.9, medR * 1.8, medR * 1.8);
      // Cartouche
      x.lineWidth = 0.4 * u;
      x.strokeRect(L + 7.5 * u, cartTop, R - L - 15 * u, cartBot - cartTop);
      const tw = R - L - 22 * u;
      x.font = '500 ' + (2.3 * u) + 'px "JetBrains Mono", monospace';
      spaced(x, 0.5 * u);
      x.fillText((v.scripture + ' · ' + ex.horizon).toUpperCase(), cx, cartTop + 4 * u, tw);
      spaced(x, 0);
      const tf = fitLines(x, v.title.toUpperCase(), (sz) => '600 ' + sz + 'px Cinzel, serif', tw, 3, 6.6 * u, 3.6 * u);
      const subText = v.sub || '';
      x.font = 'italic 500 ' + (3.5 * u) + 'px Newsreader, serif';
      const sl = subText ? fitLines(x, subText, (sz) => 'italic 500 ' + sz + 'px Newsreader, serif', tw, 2, 3.6 * u, 2.6 * u) : { lines: [], size: 0 };
      const tH = tf.lines.length * tf.size * 1.12, sH = sl.lines.length * sl.size * 1.25;
      const midY = (cartTop + 7 * u + cartBot) / 2;
      let y = midY - (tH + (sH ? sH + 2 * u : 0)) / 2 + tf.size * 0.56;
      x.font = '600 ' + tf.size + 'px Cinzel, serif';
      spaced(x, tf.size * 0.03);
      tf.lines.forEach((l) => { x.fillText(l, cx, y); y += tf.size * 1.12; });
      spaced(x, 0);
      if (sl.lines.length) {
        y += 2 * u - tf.size * 0.12;
        x.font = 'italic 500 ' + sl.size + 'px Newsreader, serif';
        sl.lines.forEach((l) => { x.fillText(l, cx, y); y += sl.size * 1.25; });
      }
      // Volume line
      x.font = '600 ' + (2.6 * u) + 'px Cinzel, serif';
      spaced(x, 0.8 * u);
      x.fillText('VOLUME ' + v.roman, cx, h - 11.6 * u);
      spaced(x, 0);
      x.fillRect(cx - 22 * u, h - 11.7 * u, 8 * u, 0.2 * u);
      x.fillRect(cx + 14 * u, h - 11.7 * u, 8 * u, 0.2 * u);
    }
  });
}

/* ---- Back cover (hinge on the right) ---- */
function paintBack(v, w, h) {
  const ex = v.ex, seed = 300 + v.i * 13, u = w / 100;
  const L = 4.2 * u, R = w - 8.4 * u, cx = (L + R) / 2;
  return surface(w, h, {
    seed,
    base: (x) => paintCloth(x, w, h, ex.cloth, seed, { foreEdge: 'left' }),
    blind: (x) => {
      x.fillRect(w - 4.7 * u, 0, 1.3 * u, h);
      x.lineWidth = 0.5 * u;
      x.strokeRect(L + 1 * u, 3 * u, R - L - 1 * u, h - 6 * u);
      x.lineWidth = 0.22 * u;
      x.strokeRect(L + 3 * u, 5 * u, R - L - 5 * u, h - 10 * u);
      printerMark(x, cx, h * 0.27, 30 * u, 0.6 * u);
    },
    foil: (x) => {
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '500 ' + (2.3 * u) + 'px "JetBrains Mono", monospace';
      spaced(x, 0.5 * u);
      x.fillText('HISTORICIST ARCHIVAL PRESS · SITTING ' + v.roman, cx, 11 * u);
      spaced(x, 0);
      x.fillRect(cx - 20 * u, 13.4 * u, 40 * u, 0.2 * u);
      const qf = fitLines(x, ex.backQuote, (s) => 'italic 400 ' + s + 'px Newsreader, serif', R - L - 22 * u, 7, 4.6 * u, 3.2 * u);
      x.font = 'italic 400 ' + qf.size + 'px Newsreader, serif';
      let y = h * 0.56 - (qf.lines.length - 1) * qf.size * 0.7;
      qf.lines.forEach((l) => { x.fillText(l, cx, y); y += qf.size * 1.4; });
      fleuron(x, cx, y + 2 * u, 1.3 * u);
      x.fillRect(L + 8 * u, h - 21 * u, R - L - 16 * u, 0.2 * u);
      x.textAlign = 'left';
      x.font = '500 ' + (2.2 * u) + 'px "JetBrains Mono", monospace';
      spaced(x, 0.3 * u);
      x.fillText('CAT. NO. ' + v.cat, L + 8 * u, h - 16 * u);
      x.fillText(ex.binding.toUpperCase(), L + 8 * u, h - 12.5 * u);
      spaced(x, 0);
      x.textAlign = 'center';
      x.lineWidth = 0.4 * u;
      const sx = R - 15 * u, sy = h - 14.5 * u;
      x.beginPath(); x.arc(sx, sy, 5.5 * u, 0, 7); x.stroke();
      x.lineWidth = 0.2 * u;
      x.beginPath(); x.arc(sx, sy, 4.6 * u, 0, 7); x.stroke();
      x.font = '600 ' + (v.roman.length > 3 ? 2.4 : 3.2) * u + 'px Cinzel, serif';
      x.fillText(v.roman, sx, sy + 0.2 * u);
    }
  });
}

/* ---- Marbled endpapers ---- */
function marble(w, h, seed, pal) {
  const r = rng(seed);
  const a = mk(w, h), x = a.getContext('2d');
  x.fillStyle = pal[0];
  x.fillRect(0, 0, w, h);
  for (let k = 0; k < 1400; k++) {
    const cx = r() * w, cy = r() * h, rad = 1.5 + Math.pow(r(), 3) * 16;
    x.fillStyle = pal[1 + Math.floor(r() * (pal.length - 1))];
    x.globalAlpha = 0.85;
    x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
    x.globalAlpha = 0.5;
    x.strokeStyle = 'rgba(15,10,6,0.8)';
    x.lineWidth = 1;
    x.stroke();
  }
  x.globalAlpha = 1;
  const b = mk(w, h), bx = b.getContext('2d');
  for (let y = 0; y < h; y++) {
    const off = Math.sin(y * 0.06 + seed) * 26 + Math.sin(y * 0.017 + seed * 0.3) * 30;
    bx.drawImage(a, 0, y, w, 1, off, y, w, 1);
    bx.drawImage(a, 0, y, w, 1, off - Math.sign(off || 1) * w, y, w, 1);
  }
  const c = mk(w, h), cx2 = c.getContext('2d');
  for (let X = 0; X < w; X++) {
    const off = Math.sin(X * 0.09 + seed * 2) * 9 + Math.sin(X * 0.021) * 16;
    cx2.drawImage(b, X, 0, 1, h, X, off, 1, h);
    cx2.drawImage(b, X, 0, 1, h, X, off - Math.sign(off || 1) * h, 1, h);
  }
  const d = mk(w, h), dx = d.getContext('2d');
  for (let y = 0; y < h; y++) {
    const off = Math.sin(y * 0.45 + seed) * 4;
    dx.drawImage(c, 0, y, w, 1, off, y, w, 1);
    dx.drawImage(c, 0, y, w, 1, off - Math.sign(off || 1) * w, y, w, 1);
  }
  return d;
}
function paintEndpaper(v, w, h, hinge, plate) {
  const ex = v.ex, u = w / 100, seed = 500 + v.i * 7 + (plate ? 0 : 3);
  const c = mk(w, h), x = c.getContext('2d');
  paintCloth(x, w, h, shade2(ex.cloth, -0.25), seed, { wear: false });
  const m = 3.2 * u, gutter = 0.9 * u;
  const rx = hinge === 'right' ? m : gutter, ry = m, rw = w - m - gutter, rh = h - 2 * m;
  const mb = marble(Math.round(rw / 1.5), Math.round(rh / 1.5), seed, ex.marble);
  x.imageSmoothingQuality = 'high';
  x.filter = 'blur(0.7px)';
  x.drawImage(mb, rx, ry, rw, rh);
  x.filter = 'none';
  // paper sheen + turn-in shadow
  const sh = x.createLinearGradient(rx, 0, rx + rw, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(0.08, 'rgba(0,0,0,0)'); sh.addColorStop(0.92, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
  x.fillStyle = sh; x.fillRect(rx, ry, rw, rh);
  x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.4 * u; x.strokeRect(rx, ry, rw, rh);
  if (plate) {
    const pw = 52 * u, ph = 34 * u, px = w / 2 - pw / 2 + (hinge === 'right' ? -1.5 * u : 1.5 * u), py = h * 0.44 - ph / 2;
    x.save();
    x.translate(px + pw / 2, py + ph / 2);
    x.rotate(-0.012);
    x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 2.2 * u; x.shadowOffsetY = 0.6 * u;
    x.fillStyle = '#eee3c9';
    x.fillRect(-pw / 2, -ph / 2, pw, ph);
    x.shadowColor = 'transparent';
    const pr = rng(seed + 2);
    for (let k = 0; k < 160; k++) { x.fillStyle = 'rgba(120,90,40,' + (pr() * 0.08) + ')'; x.beginPath(); x.arc((pr() - 0.5) * pw, (pr() - 0.5) * ph, pr() * 1.6 * u, 0, 7); x.fill(); }
    x.strokeStyle = '#8a6d38'; x.lineWidth = 0.35 * u;
    x.strokeRect(-pw / 2 + 2 * u, -ph / 2 + 2 * u, pw - 4 * u, ph - 4 * u);
    x.lineWidth = 0.15 * u;
    x.strokeRect(-pw / 2 + 3 * u, -ph / 2 + 3 * u, pw - 6 * u, ph - 6 * u);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#6e5220';
    x.font = '600 ' + (2.6 * u) + 'px Cinzel, serif'; spaced(x, 0.8 * u);
    x.fillText('EX LIBRIS', 0, -ph / 2 + 7.5 * u); spaced(x, 0);
    x.fillStyle = '#8a6421';
    fleuron(x, 0, -ph / 2 + 12.5 * u, 1.4 * u);
    x.fillStyle = '#1d160e';
    x.font = 'italic 500 ' + (4.2 * u) + 'px Newsreader, serif';
    x.fillText('The Historicist Canon', 0, 1.6 * u);
    x.fillStyle = 'rgba(138,109,56,0.5)'; x.fillRect(-16 * u, 5 * u, 32 * u, 0.15 * u);
    x.fillStyle = '#5c4928';
    x.font = '500 ' + (1.9 * u) + 'px "JetBrains Mono", monospace'; spaced(x, 0.3 * u);
    x.fillText('CAT. ' + v.cat + ' · ' + ex.binding.toUpperCase(), 0, 9 * u, pw - 8 * u);
    spaced(x, 0);
    x.restore();
  }
  return c;
}

/* ---- Letterpress title page ---- */
function paintTitlePage(v, w, h) {
  const ex = v.ex, u = w / 100, seed = 700 + v.i;
  const c = mk(w, h), x = c.getContext('2d'), r = rng(seed);
  const g = x.createRadialGradient(w * 0.6, h * 0.4, 0, w * 0.6, h * 0.45, w * 1.1);
  g.addColorStop(0, '#f6eedb'); g.addColorStop(1, '#e2d3b2');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let k = 0; k < (w * h) / 900; k++) { x.fillStyle = 'rgba(110,85,45,' + r() * 0.06 + ')'; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
  for (let k = 0; k < 26; k++) {                                       // foxing
    const fx = r() < 0.6 ? (r() < 0.5 ? r() * w * 0.15 : w - r() * w * 0.15) : r() * w, fy = r() * h, fr = (0.3 + r() * 1.3) * u;
    const fg = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
    fg.addColorStop(0, 'rgba(140,90,40,' + (0.12 + r() * 0.18) + ')'); fg.addColorStop(1, 'rgba(140,90,40,0)');
    x.fillStyle = fg; x.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  }
  const gs = x.createLinearGradient(0, 0, w * 0.16, 0);                // gutter
  gs.addColorStop(0, 'rgba(40,25,10,0.45)'); gs.addColorStop(1, 'rgba(40,25,10,0)');
  x.fillStyle = gs; x.fillRect(0, 0, w * 0.16, h);
  const cx = w * 0.53;
  x.strokeStyle = 'rgba(138,98,36,0.55)'; x.lineWidth = 0.3 * u;
  x.strokeRect(9 * u, 6 * u, w - 15 * u, h - 12 * u);
  x.lineWidth = 0.12 * u;
  x.strokeRect(10.4 * u, 7.4 * u, w - 17.8 * u, h - 14.8 * u);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#8a2c1a';
  x.font = '500 ' + (2.4 * u) + 'px "JetBrains Mono", monospace'; spaced(x, 0.5 * u);
  x.fillText(ex.epigraph, cx, 16 * u, w - 30 * u); spaced(x, 0);
  x.fillStyle = '#18120c';
  const tf = fitLines(x, v.title.toUpperCase(), (sz) => '600 ' + sz + 'px Cinzel, serif', w - 34 * u, 4, 7 * u, 4 * u);
  x.font = '600 ' + tf.size + 'px Cinzel, serif';
  let y = h * 0.25;
  tf.lines.forEach((l) => { x.fillText(l, cx, y); y += tf.size * 1.15; });
  if (v.sub) {
    x.fillStyle = '#4a3b2a';
    const sf = fitLines(x, v.sub, (s) => 'italic 400 ' + s + 'px Newsreader, serif', w - 36 * u, 3, 4 * u, 2.8 * u);
    x.font = 'italic 400 ' + sf.size + 'px Newsreader, serif';
    y += 2 * u;
    sf.lines.forEach((l) => { x.fillText(l, cx, y); y += sf.size * 1.3; });
  }
  x.fillStyle = '#4a3b2a';
  x.font = '400 ' + (2.6 * u) + 'px Newsreader, serif';
  x.fillText('being Sitting ' + v.roman + ' of the historicist reading', cx, y + 4 * u);
  x.strokeStyle = '#8a2c1a'; x.fillStyle = '#8a2c1a';
  printerMark(x, cx, h * 0.66, 22 * u, 0.5 * u);
  x.fillStyle = 'rgba(138,98,36,0.6)'; x.fillRect(cx - 24 * u, h * 0.8, 48 * u, 0.15 * u);
  x.fillStyle = '#54432e';
  x.font = '500 ' + (2.1 * u) + 'px "JetBrains Mono", monospace'; spaced(x, 0.4 * u);
  x.fillText('DANIEL HISTORICIST PRESS', cx, h * 0.84);
  x.fillText((v.scripture + ' · ' + v.time).toUpperCase(), cx, h * 0.875, w - 30 * u);
  x.fillText('MMXXVI', cx, h * 0.91);
  spaced(x, 0);
  return c;
}

/* ---- Page edges ---- */
function paintEdge(w, h, horizontal, gilt) {
  const c = mk(w, h), x = c.getContext('2d'), r = rng(gilt ? 41 : 43);
  x.fillStyle = gilt ? '#d9ae55' : '#e8dcc0';
  x.fillRect(0, 0, w, h);
  const n = horizontal ? h : w;
  for (let k = 0; k < n; k += 1) {
    const v = r();
    x.fillStyle = gilt ? (v > 0.6 ? 'rgba(255,240,190,0.35)' : 'rgba(90,60,15,' + v * 0.35 + ')') : (v > 0.55 ? 'rgba(255,252,240,0.5)' : 'rgba(90,70,40,' + v * 0.3 + ')');
    if (horizontal) x.fillRect(0, k, w, 1); else x.fillRect(k, 0, 1, h);
  }
  if (!gilt) {                                   // handling grime toward the middle of the fore-edge
    const g = horizontal ? x.createLinearGradient(0, 0, w, 0) : x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(90,60,30,0.18)'); g.addColorStop(0.5, 'rgba(90,60,30,0.05)'); g.addColorStop(1, 'rgba(90,60,30,0.18)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  return c;
}

/* ---- Wood ---- */
function paintWood(w, h, o) {
  const c = mk(w, h), x = c.getContext('2d'), r = rng(o.seed || 1);
  x.fillStyle = o.base;
  x.fillRect(0, 0, w, h);
  for (let k = 0; k < 14; k++) {
    const y0 = r() * h, hh = h * (0.05 + r() * 0.2);
    const g = x.createLinearGradient(0, y0 - hh, 0, y0 + hh);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, r() > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,220,170,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, y0 - hh, w, hh * 2);
  }
  for (let k = 0; k < h * 0.9; k++) {
    const y0 = r() * h, amp = 1 + r() * 7, f1 = 0.002 + r() * 0.006, ph = r() * 6.28;
    x.strokeStyle = r() > 0.4 ? o.dark : o.light;
    x.globalAlpha = 0.05 + r() * 0.22;
    x.lineWidth = 0.5 + r() * 2;
    x.beginPath();
    for (let X = 0; X <= w; X += 10) {
      const y = y0 + Math.sin(X * f1 + ph) * amp + Math.sin(X * f1 * 3.3 + ph * 2) * amp * 0.25;
      if (X === 0) x.moveTo(X, y); else x.lineTo(X, y);
    }
    x.stroke();
  }
  x.globalAlpha = 1;
  for (let k = 0; k < (w * h) / 260; k++) {
    x.fillStyle = 'rgba(10,5,2,' + (0.15 + r() * 0.3) + ')';
    x.fillRect(r() * w, r() * h, 2 + r() * 8, 0.8);
  }
  if (o.seams) {
    for (let k = 1; k < o.seams; k++) {
      const y = (k / o.seams) * h;
      x.fillStyle = 'rgba(0,0,0,0.75)'; x.fillRect(0, y - 1.5, w, 3);
      x.fillStyle = 'rgba(255,220,170,0.06)'; x.fillRect(0, y + 1.5, w, 1);
    }
  }
  return c;
}

/* ---- Small helper textures ---- */
function dotTexture() {
  const c = mk(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return c;
}
function stripes(w, h, a, b, n) {
  const c = mk(w, h), x = c.getContext('2d');
  for (let k = 0; k < n; k++) { x.fillStyle = k % 2 ? a : b; x.fillRect((k / n) * w, 0, w / n + 1, h); }
  return c;
}
function paintFlatSpine(w, h, color, title, sub, seed) {
  const u = h / 100;
  return surface(w, h, {
    seed,
    clothRough: 0.6,
    foilRough: 0.32,
    base: (x) => {
      paintCloth(x, w, h, color, seed, { wear: false });
      const r = rng(seed + 9);
      for (let k = 0; k < 900; k++) { x.fillStyle = 'rgba(0,0,0,' + r() * 0.12 + ')'; x.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 3); }
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    },
    foil: (x) => {
      for (const fx of [0.1, 0.22, 0.78, 0.9]) { x.fillRect(fx * w, 10 * u, 0.9 * u, 80 * u); x.fillRect(fx * w + 2.4 * u, 10 * u, 0.4 * u, 80 * u); }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '600 ' + (30 * u) + 'px Cinzel, serif'; spaced(x, 3 * u);
      x.fillText(title, w / 2, h * 0.42, w * 0.48);
      x.font = 'italic 500 ' + (18 * u) + 'px Newsreader, serif'; spaced(x, 0);
      x.fillText(sub, w / 2, h * 0.72, w * 0.48);
    }
  });
}

/* =====================================================================
   3D reading room
   ===================================================================== */
async function startRoom() {
  const THREE = await import('three');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
  setLoader(0.18, 'Setting the type…');

  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const damp = THREE.MathUtils.damp;
  const _e = new THREE.Euler(), _q = new Q(), _v = new V3(), _w = new V3();

  /* ---- Renderer ---- */
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !LOWQ, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, LOWQ ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(stageW(), stageH(), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040302');
  scene.fog = new THREE.Fog('#040302', 140, 360);
  const camera = new THREE.PerspectiveCamera(30, stageW() / stageH(), 0.5, 600);

  const tex = (canvas, srgb, repeat) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  };

  /* ---- Environment for reflections (warm study, mostly dark) ---- */
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#0a0705');
    const panel = (w, h, p, color, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.copy(p); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(70, 12, new V3(0, 46, 14), '#ffd8a0', 3.0);
    panel(20, 34, new V3(-46, 10, 26), '#ffcf96', 2.0);
    panel(16, 22, new V3(44, 6, 30), '#ff9a50', 1.6);
    panel(60, 14, new V3(0, -14, 46), '#6a4a30', 0.7);
    panel(40, 40, new V3(0, 10, -50), '#1a120c', 1);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.035).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();
  }

  WEAVE = makeWeave();
  const weaveTex = tex(WEAVE, false, [10, 14]);

  /* ---- Lights ---- */
  const hemi = new THREE.HemisphereLight('#6a5238', '#0b0806', 0.5);
  scene.add(hemi);
  const lamp = new THREE.SpotLight('#ffe0b6', 0, 0, 0.5, 0.95, 0);
  lamp.position.set(-4, 64, 36);
  lamp.target.position.set(0, 8, -10);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  lamp.shadow.camera.near = 4;
  lamp.shadow.camera.far = 130;
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.03;
  scene.add(lamp, lamp.target);
  const candle = new THREE.PointLight('#ff9a48', 0, 110, 1);
  candle.position.set(58, 14, 26);
  scene.add(candle);
  const key = new THREE.SpotLight('#fff0d6', 0, 36, 0.62, 0.75, 0);
  key.castShadow = !LOWQ;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  lamp.shadow.autoUpdate = key.shadow.autoUpdate = false;
  const glint = new THREE.SpotLight('#fff3dc', 0, 26, 0.75, 0.9, 0);
  scene.add(glint, glint.target);
  const rim = new THREE.SpotLight('#ffc98a', 0, 34, 0.7, 0.8, 0);
  scene.add(rim, rim.target);

  /* ---- Bookcase ---- */
  setLoader(0.26, 'Laying the walnut…');
  await nextFrame();
  const woodA = paintWood(1024, 256, { base: '#2c1b10', dark: '#120904', light: '#5a3a22', seed: 11 });
  const woodB = paintWood(1024, 1024, { base: '#1a100a', dark: '#090502', light: '#3c2616', seed: 12, seams: 6 });
  const woodMat = new THREE.MeshPhysicalMaterial({ map: tex(woodA, true), bumpMap: tex(woodA), bumpScale: 0.6, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const wallTex = tex(woodB, true); wallTex.center.set(0.5, 0.5); wallTex.rotation = Math.PI / 2;
  const wallBump = tex(woodB); wallBump.center.set(0.5, 0.5); wallBump.rotation = Math.PI / 2;
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallBump, bumpScale: 0.8, roughness: 0.78, color: '#a08870' });
  const brass = new THREE.MeshStandardMaterial({ color: '#b48a44', metalness: 1, roughness: 0.34 });
  const brassDark = new THREE.MeshStandardMaterial({ color: '#7a5a2a', metalness: 1, roughness: 0.48 });

  const addBox = (w, h, d, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const CASE_W = 126;
  addBox(CASE_W, 3, 31, woodMat, 0, -1.5, -15.5);                      // shelf board
  addBox(CASE_W, 6.5, 1.6, woodMat, 0, -3.25, 0.5);                    // apron
  addBox(CASE_W, 0.35, 0.35, brass, 0, -0.35, 1.35, false);            // brass nosing
  addBox(CASE_W, 0.9, 0.5, woodMat, 0, -6.3, 1.4);                     // moulding
  addBox(CASE_W + 8, 90, 1, wallMat, 0, 18, -31.5, false);             // back panel
  addBox(4, 90, 34, woodMat, -CASE_W / 2 - 2, 18, -14);                // sides
  addBox(4, 90, 34, woodMat, CASE_W / 2 + 2, 18, -14);
  addBox(CASE_W, 3, 31, woodMat, 0, 52, -15.5);                        // shelf above
  addBox(CASE_W, 5, 1.6, woodMat, 0, 51, 0.5);
  addBox(CASE_W, 30, 2, woodMat, 0, -22, 0.5, false);                  // cabinet below

  /* ---- The painting behind the books ---- */
  let picLight = null;
  if (SHELF_PORTRAIT) {
    const img = new Image();
    await new Promise((res) => { img.addEventListener('load', res); img.addEventListener('error', res); img.src = SHELF_PORTRAIT; setTimeout(res, 5000); });
    if (img.complete && img.naturalWidth) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const c = mk(iw, ih), x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      // Yellowed varnish
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = 'rgb(236,214,178)';
      x.fillRect(0, 0, iw, ih);
      // Edges fall into shadow, as old canvases do under a single lamp
      x.globalCompositeOperation = 'source-over';
      const vg = x.createRadialGradient(iw * 0.48, ih * 0.42, ih * 0.25, iw * 0.5, ih * 0.5, iw * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.32)');
      x.fillStyle = vg;
      x.fillRect(0, 0, iw, ih);
      // Fine craquelure
      const cr = rng(2024);
      x.strokeStyle = 'rgba(0,0,0,0.16)';
      x.lineWidth = 0.7;
      for (let k = 0; k < 900; k++) {
        let px = cr() * iw, py = cr() * ih;
        x.beginPath(); x.moveTo(px, py);
        for (let s2 = 0; s2 < 4; s2++) { px += (cr() - 0.5) * 22; py += (cr() - 0.5) * 22; x.lineTo(px, py); }
        x.stroke();
      }
      // Hung left of centre so the king's face clears the title; the fire glows behind the books
      const PW = 68, PH = PW * ih / iw, PX = -20.8, PY = 43.8 - PH / 2, PZ = -30.85;
      const canvasWeave = tex(WEAVE, false, [46, 26]);
      const paintMat = new THREE.MeshPhysicalMaterial({
        map: tex(c, true), color: new THREE.Color(0.92, 0.88, 0.84), roughness: 0.66,
        clearcoat: 0.22, clearcoatRoughness: 0.6, bumpMap: canvasWeave, bumpScale: 0.3
      });
      const painting = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), paintMat);
      painting.position.set(PX, PY, PZ);
      painting.receiveShadow = true;
      scene.add(painting);
      // Old gilt frame
      const gilt = new THREE.MeshStandardMaterial({ color: '#8a6a34', metalness: 0.9, roughness: 0.46 });
      const giltInner = new THREE.MeshStandardMaterial({ color: '#5e4520', metalness: 0.85, roughness: 0.55 });
      const F = 1.7, FD = 1.3;
      const rail = (w, h, xx, yy, mat, d) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(xx, yy, PZ + d / 2 - 0.05);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
      };
      rail(PW + F * 2, F, PX, PY + PH / 2 + F / 2, gilt, FD);
      rail(PW + F * 2, F, PX, PY - PH / 2 - F / 2, gilt, FD);
      rail(F, PH, PX - PW / 2 - F / 2, PY, gilt, FD);
      rail(F, PH, PX + PW / 2 + F / 2, PY, gilt, FD);
      const L = 0.35;
      rail(PW, L, PX, PY + PH / 2 - L / 2, giltInner, 0.5);
      rail(PW, L, PX, PY - PH / 2 + L / 2, giltInner, 0.5);
      rail(L, PH, PX - PW / 2 + L / 2, PY, giltInner, 0.5);
      rail(L, PH, PX + PW / 2 - L / 2, PY, giltInner, 0.5);
      // Small brass picture light over the frame
      const top = PY + PH / 2 + F;
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 22, 28, 1, false, Math.PI * 0.1, Math.PI * 1.3), brass);
      hood.rotation.z = Math.PI / 2;
      hood.rotation.x = -0.5;
      hood.position.set(PX, top + 1.9, PZ + 4.2);
      hood.castShadow = true;
      scene.add(hood);
      for (const ax of [-7, 7]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 10), brassDark);
        arm.rotation.x = Math.PI / 2 - 0.45;
        arm.position.set(PX + ax, top + 1.0, PZ + 2.1);
        scene.add(arm);
      }
      picLight = new THREE.SpotLight('#ffd7a6', 0, 80, 0.85, 0.8, 0);
      picLight.position.set(PX, top + 3, PZ + 16);
      picLight.target.position.set(PX, PY - PH * 0.05, PZ);
      scene.add(picLight, picLight.target);
    }
  }

  /* ---- Books ---- */
  const PXS = LOWQ ? 44 : 62;          // spine px per cm
  const PXC = LOWQ ? 40 : 64;          // cover px per cm
  const foreTex = tex(paintEdge(64, 512, false, false), true);
  const headTex = tex(paintEdge(512, 64, true, false), true);
  const giltC = paintEdge(512, 64, true, true);
  const giltOrm = mk(4, 4); { const g = giltOrm.getContext('2d'); g.fillStyle = 'rgb(0,70,255)'; g.fillRect(0, 0, 4, 4); }
  const foreMat = new THREE.MeshStandardMaterial({ map: foreTex, bumpMap: foreTex, bumpScale: 0.4, roughness: 0.9 });
  const tailMat = new THREE.MeshStandardMaterial({ map: headTex, bumpMap: headTex, bumpScale: 0.4, roughness: 0.92, color: '#e8dcc8' });
  const giltMat = new THREE.MeshStandardMaterial({ map: tex(giltC, true), bumpMap: tex(giltC), bumpScale: 0.3, metalness: 1, roughness: 0.4, color: '#e8d8b8' });
  const paperMat = new THREE.MeshStandardMaterial({ color: '#e9dec4', roughness: 0.95 });
  const bandTex = tex(stripes(64, 8, '#8f1d1d', '#e4c47a', 16), true);
  const headbandMat = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.6, metalness: 0.1 });
  const ribbonMat = new THREE.MeshPhysicalMaterial({ color: '#7a1414', roughness: 0.45, sheen: 1, sheenColor: new THREE.Color('#ff7b6b'), sheenRoughness: 0.35, side: THREE.DoubleSide });
  const slipMat = new THREE.MeshStandardMaterial({ color: '#efe4c8', roughness: 0.95, side: THREE.DoubleSide });

  const books = [];
  const hitboxes = [];
  let shelfX = 0;
  const widths = VOLS.map((v) => 3.7 * v.ex.thick);
  const GAP = 0.1;
  const booksW = widths.reduce((a, b) => a + b, 0) + GAP * (N - 1);
  const jr = rng(77);
  shelfX = -booksW / 2;

  for (let i = 0; i < N; i++) {
    const v = VOLS[i], ex = v.ex;
    const H = 25.5 * ex.k, T = widths[i], W = H * 0.66;
    const boardT = 0.27, over = 0.32, bulge = 0.42;
    const locked = !can(i);
    const cloth = new THREE.Color(ex.cloth);
    const sheenColor = cloth.clone().lerp(new THREE.Color('#d8bf94'), 0.22);
    const clothMat = new THREE.MeshPhysicalMaterial({ color: cloth, roughness: 0.86, sheen: 0.35, sheenRoughness: 0.75, sheenColor, bumpMap: weaveTex, bumpScale: 0.35 });

    // Spine maps
    const sw = Math.round(T * PXS * 1.15), sh = Math.round(H * PXS);
    const sp = paintSpine(v, sw, sh);
    const spineMat = new THREE.MeshPhysicalMaterial({
      map: tex(sp.col, true), roughnessMap: tex(sp.orm), metalnessMap: tex(sp.orm), bumpMap: tex(sp.bump), bumpScale: 0.9,
      roughness: 1, metalness: 1, sheen: 0.3, sheenRoughness: 0.75, sheenColor
    });
    if (locked) { spineMat.color.setScalar(0.62); clothMat.color.multiplyScalar(0.62); }

    const root = new THREE.Group();
    scene.add(root);
    const all = [];
    const add = (mesh, parent = root) => { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); all.push(mesh); return mesh; };

    // Rounded spine with linear-in-width UVs
    const sg = new THREE.CylinderGeometry(T / 2, T / 2, H, 48, 1, true, Math.PI, Math.PI);
    { const p = sg.attributes.position, uv = sg.attributes.uv; for (let k = 0; k < p.count; k++) uv.setX(k, (p.getZ(k) / (T / 2) + 1) / 2); uv.needsUpdate = true; }
    const spine = add(new THREE.Mesh(sg, spineMat));
    spine.scale.x = bulge; spine.position.x = -W / 2;
    // Raised bands
    const bandPts = [];
    for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI; bandPts.push(new V3(-bulge * (T / 2) * Math.sin(a), 0, -(T / 2) * Math.cos(a))); }
    const bandGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bandPts), 28, 0.17, 8, false);
    for (const f of BANDS) { const b = add(new THREE.Mesh(bandGeo, clothMat)); b.position.set(-W / 2, H / 2 - f * H, 0); }

    // Text block
    const Wp = W - over - 0.25, Hp = H - over * 2, Tp = T - boardT * 2 - 0.04;
    const pages = add(new THREE.Mesh(new THREE.BoxGeometry(Wp, Hp, Tp), [foreMat, paperMat, giltMat, tailMat, paperMat, paperMat]));
    pages.position.x = -W / 2 + 0.25 + Wp / 2;
    // Boards
    const edgeMat = clothMat;
    const back = add(new THREE.Mesh(new THREE.BoxGeometry(W, H, boardT), [edgeMat, edgeMat, edgeMat, edgeMat, paperMat, clothMat]));
    back.position.z = -T / 2 + boardT / 2;
    const pivot = new THREE.Group();
    pivot.position.set(-W / 2, 0, T / 2 - boardT / 2);
    root.add(pivot);
    const front = add(new THREE.Mesh(new THREE.BoxGeometry(W, H, boardT), [edgeMat, edgeMat, edgeMat, edgeMat, clothMat, paperMat]), pivot);
    front.position.x = W / 2;
    // Headbands
    const hbGeo = new THREE.CylinderGeometry(0.17, 0.17, Tp, 10);
    for (const s of [1, -1]) { const hb = add(new THREE.Mesh(hbGeo, headbandMat)); hb.rotation.x = Math.PI / 2; hb.position.set(-W / 2 + 0.3, s * (Hp / 2 + 0.02), 0); }
    // Silk ribbon (marks the volume you last entered)
    const rg = new THREE.PlaneGeometry(0.55, 7.5, 1, 10);
    { const p = rg.attributes.position; for (let k = 0; k < p.count; k++) { const yy = p.getY(k); p.setZ(k, Math.sin((yy + 3.75) * 0.5) * 0.25); } rg.computeVertexNormals(); }
    const ribbon = add(new THREE.Mesh(rg, ribbonMat));
    ribbon.position.set(-W / 2 + W * 0.36, -Hp / 2 - 2.6, 0.2);
    ribbon.rotation.set(0.05, 0.5, 0.06);
    ribbon.visible = getLast() === i;
    // Paper slip (completed volumes)
    const slip = add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 6), slipMat));
    slip.position.set(-W / 2 + W * 0.62, Hp / 2 - 0.6, 0.1);
    slip.rotation.set(0, 0.7, 0.05);
    slip.visible = done(i);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(W + bulge * T * 0.5, H, T + 0.2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.x = -bulge * T * 0.25;
    hit.userData.index = i;
    root.add(hit);
    hitboxes.push(hit);

    const cx = shelfX + T / 2;
    shelfX += T + GAP;
    const spineFront = -0.5 - jr() * 0.9;
    const b = {
      i, v, H, T, W, root, pivot, front, back, pages, spineMat, clothMat, paperMat, all,
      x: cx, zc: spineFront - (W / 2 + bulge * T / 2), yawJ: (jr() - 0.5) * 0.02, rollJ: (jr() - 0.5) * 0.008,
      hover: 0, lean: 0, open: 0, mode: 'shelf', seq: null, hi: null, sig: 0,
      pos: new V3(), quat: new Q()
    };
    shelfPose(b, b.pos, b.quat);
    root.position.copy(b.pos); root.quaternion.copy(b.quat);
    books.push(b);
    setLoader(0.3 + (0.45 * (i + 1)) / N, 'Binding volume ' + v.roman + '…');
    if (i % 2 === 1) await nextFrame();
  }

  /* ---- Props: bookend, reference books, hourglass ---- */
  {
    const shape = new THREE.Shape();
    shape.moveTo(-6, 0); shape.lineTo(6, 0); shape.lineTo(6, 11.5);
    shape.quadraticCurveTo(6, 17.5, 0, 17.5); shape.quadraticCurveTo(-6, 17.5, -6, 11.5); shape.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 11.6, 2.6, 0, Math.PI * 2, true); shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.1, bevelSegments: 2, curveSegments: 32 });
    g.rotateY(Math.PI / 2);
    const end = new THREE.Mesh(g, brass);
    end.position.set(-booksW / 2 - 0.85, 0, -9.5);
    end.castShadow = end.receiveShadow = true;
    scene.add(end);
    const medal = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 12, 48), brassDark);
    medal.rotation.y = Math.PI / 2; medal.position.set(-booksW / 2 - 0.55, 11.6, -9.5);
    scene.add(medal);

    const leathers = [['#2b1a12', 'CONCORDANCE', 'of the Prophets', 501], ['#16241f', 'LEXICON', 'Hebrew & Chaldee', 502]];
    const sx = booksW / 2 + 3.5;
    const dims = [[25, 4.2, 18.5], [22.5, 3.4, 16.5]];
    let y = 0;
    leathers.forEach((L, k) => {
      const [w, h, d] = dims[k];
      const s = paintFlatSpine(Math.round(w * 26), Math.round(h * 26), L[0], L[1], L[2], L[3]);
      const leather = new THREE.MeshPhysicalMaterial({ color: L[0], roughness: 0.62, sheen: 0.3, sheenColor: new THREE.Color('#a08060'), bumpMap: weaveTex, bumpScale: 0.25 });
      const sm = new THREE.MeshPhysicalMaterial({ map: tex(s.col, true), roughnessMap: tex(s.orm), metalnessMap: tex(s.orm), bumpMap: tex(s.bump), bumpScale: 0.7, roughness: 1, metalness: 1 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [foreMat, foreMat, leather, leather, sm, foreMat]);
      m.position.set(sx + w / 2 + (k ? 1.2 : 0), y + h / 2, -d / 2 - 0.8 - k * 1.1);
      m.rotation.y = k ? -0.045 : 0.025;
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      y += h;
    });
    // Hourglass on the stack
    const hg = new THREE.Group();
    hg.position.set(sx + 12, y, -10.5);
    scene.add(hg);
    const capMat = woodMat;
    for (const yy of [0.45, 13.35]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.5, 0.9, 40), capMat); c.position.y = yy; c.castShadow = c.receiveShadow = true; hg.add(c); }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12, 12), brass);
      p.position.set(Math.cos(a) * 3.6, 6.9, Math.sin(a) * 3.6); p.castShadow = true; hg.add(p);
    }
    const prof = [];
    const half = [[0.32, 0], [0.9, 0.5], [1.9, 1.4], [2.7, 2.6], [3.0, 3.7], [2.85, 4.7], [2.3, 5.5], [2.05, 6.0]];
    for (let k = half.length - 1; k >= 0; k--) prof.push(new THREE.Vector2(half[k][0], -half[k][1]));
    for (let k = 1; k < half.length; k++) prof.push(new THREE.Vector2(half[k][0], half[k][1]));
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 2 });
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glassMat);
    glass.position.y = 6.9;
    hg.add(glass);
    const sandMat = new THREE.MeshStandardMaterial({ color: '#c9a46a', roughness: 0.95 });
    const sandBot = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.9, 40), sandMat);
    sandBot.position.y = 6.9 - 4.75; hg.add(sandBot);
    const sandTop = new THREE.Mesh(new THREE.ConeGeometry(2.55, 2.4, 40), sandMat);
    sandTop.rotation.x = Math.PI; sandTop.position.y = 6.9 + 2.0; hg.add(sandTop);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), sandMat);
    stream.position.y = 6.9 - 1.6; hg.add(stream);
    window.__sand = { sandTop, sandBot };
  }

  /* ---- A lit candle on the shelf ---- */
  const candleRig = (() => {
    const g = new THREE.Group();
    g.position.set(-booksW / 2 - 9.5, 0, -7.5);
    scene.add(g);
    // Brass candlestick (turned profile)
    const prof = [[0, 0], [4.1, 0], [4.35, 0.18], [4.3, 0.42], [3.6, 0.62], [2.2, 0.8], [1.25, 1.15], [0.95, 1.7], [1.35, 2.15], [1.3, 2.45], [0.8, 2.8], [0.62, 4.4], [0.72, 5.2], [1.15, 5.55], [0.8, 5.9], [0.9, 6.2], [2.1, 6.55], [2.25, 6.8], [2.05, 6.95], [1.25, 7.0], [1.25, 7.25], [0, 7.25]];
    const stick = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56),
      new THREE.MeshStandardMaterial({ color: '#b08540', metalness: 1, roughness: 0.3 }));
    stick.castShadow = stick.receiveShadow = true;
    g.add(stick);
    // Wax candle, burned down with a melted crater; uv.y runs bottom to top for the glow map
    const H = 7.6, R = 1.12, base = 7.0;
    const wprof = [[0, 0], [R, 0], [R, H - 0.3], [R * 1.03, H - 0.08], [R * 0.96, H + 0.04], [R * 0.78, H - 0.12], [R * 0.4, H - 0.32], [0, H - 0.38]];
    const wg = new THREE.LatheGeometry(wprof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
    {
      const pa = wg.attributes.position, uv = wg.attributes.uv;
      for (let k = 0; k < pa.count; k++) {
        const x0 = pa.getX(k), y0 = pa.getY(k), z0 = pa.getZ(k), r0 = Math.hypot(x0, z0);
        uv.setY(k, y0 / (H + 0.05));
        if (r0 > 0.2) {
          const a = Math.atan2(z0, x0);
          const f = 1 + 0.014 * Math.sin(a * 3 + y0 * 1.7) + 0.009 * Math.sin(a * 7 - y0 * 3.1) + 0.006 * Math.sin(y0 * 9.0 + a);
          pa.setX(k, x0 * f); pa.setZ(k, z0 * f);
        }
      }
      uv.needsUpdate = true;
      wg.computeVertexNormals();
    }
    const waxC = mk(256, 512), wx = waxC.getContext('2d'), wr = rng(77);
    wx.fillStyle = '#eee1c3'; wx.fillRect(0, 0, 256, 512);
    for (let k = 0; k < 70; k++) {
      const x0 = wr() * 256, w0 = 2 + wr() * 14;
      wx.fillStyle = wr() > 0.5 ? 'rgba(255,250,235,' + (0.05 + wr() * 0.12) + ')' : 'rgba(150,120,80,' + (0.03 + wr() * 0.07) + ')';
      wx.fillRect(x0, wr() * 120, w0, 300 + wr() * 260);
    }
    for (let k = 0; k < 4000; k++) { wx.fillStyle = 'rgba(120,95,60,' + wr() * 0.05 + ')'; wx.fillRect(wr() * 256, wr() * 512, 1 + wr() * 2, 1 + wr() * 2); }
    const waxMap = tex(waxC, true), waxBump = tex(waxC);
    const glowC = mk(4, 256), gx = glowC.getContext('2d');
    const gg = gx.createLinearGradient(0, 256, 0, 0);
    gg.addColorStop(0, '#000'); gg.addColorStop(0.55, '#000'); gg.addColorStop(0.82, '#3a1806'); gg.addColorStop(0.95, '#c8641e'); gg.addColorStop(1, '#ffb060');
    gx.fillStyle = gg; gx.fillRect(0, 0, 4, 256);
    const waxMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', map: waxMap, bumpMap: waxBump, bumpScale: 0.6, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#fff2d8'), sheenRoughness: 0.45,
      clearcoat: 0.15, clearcoatRoughness: 0.4,
      emissive: '#ffffff', emissiveMap: tex(glowC, true), emissiveIntensity: 1
    });
    const wax = new THREE.Mesh(wg, waxMat);
    wax.position.y = base;
    wax.castShadow = wax.receiveShadow = true;
    g.add(wax);
    // Drips running down from the rim
    const dr = rng(321);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + dr() * 0.6, len = 0.5 + Math.pow(dr(), 1.6) * 3.6, rad = 0.09 + dr() * 0.09;
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const t = j / 14, y = t * len;
        const bulb = Math.sin(Math.min(1, t / 0.22) * Math.PI * 0.5);
        const r = t < 0.22 ? rad * bulb : rad * (1 - (t - 0.22) / 0.78 * 0.55);
        pts.push(new THREE.Vector2(Math.max(0.001, r), y));
      }
      const drip = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), waxMat);
      drip.scale.set(1, 1, 0.5);
      drip.rotation.y = -a + Math.PI / 2;
      drip.position.set(Math.cos(a) * (R - rad * 0.15), base + H - 0.1 - len, Math.sin(a) * (R - rad * 0.15));
      drip.receiveShadow = false;
      g.add(drip);
    }
    // Wax pooled in the cup
    const pool = new THREE.Mesh(new THREE.TorusGeometry(R + 0.12, 0.16, 8, 32), waxMat);
    pool.rotation.x = Math.PI / 2; pool.position.y = base + 0.12; g.add(pool);
    // Wick with a glowing ember tip
    const wtop = base + H - 0.38;
    const wick = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, wtop, 0), new V3(0.03, wtop + 0.35, 0), new V3(0.12, wtop + 0.62, 0.02)]), 8, 0.045, 6, false),
      new THREE.MeshStandardMaterial({ color: '#1b120b', roughness: 0.9 }));
    g.add(wick);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a').multiplyScalar(3) }));
    ember.position.set(0.12, wtop + 0.62, 0.02);
    g.add(ember);

    // Flame: camera-facing teardrop, licked by noise, HDR so the bloom catches it
    const fgeo = new THREE.PlaneGeometry(1.15, 2.7, 1, 1);
    fgeo.translate(0, 1.35, 0);
    const flameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSway: { value: 0 }, uHeight: { value: 1 }, uFlick: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime, uSway, uHeight;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.y *= uHeight;
          float k = uv.y * uv.y;
          p.x += (uSway + sin(uTime * 9.0) * 0.025 + sin(uTime * 15.7 + 1.3) * 0.016) * k * 2.0;
          vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mv.xy += p.xy;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime, uFlick;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          float y = vUv.y;
          float n = noise(vec2((vUv.x - 0.5) * 4.0, y * 5.0 - uTime * 4.6));
          float x = vUv.x - 0.5 + (n - 0.5) * 0.11 * y;
          float w = 0.38 * pow(sin(clamp(y * 1.04, 0.0, 1.0) * 3.14159), 0.6) * (1.06 - y * 0.78);
          w *= 0.45 + 0.55 * smoothstep(0.0, 0.14, y);
          float d = abs(x) / max(w, 0.001);
          float body = smoothstep(1.0, 0.5, d) * smoothstep(1.0, 0.78, y + (n - 0.5) * 0.12);
          float core = smoothstep(0.6, 0.0, d) * smoothstep(0.72, 0.2, y) * smoothstep(0.05, 0.17, y);
          float blue = smoothstep(1.0, 0.25, d) * smoothstep(0.3, 0.04, y) * (1.0 - core);
          float dark = smoothstep(0.35, 0.0, d) * smoothstep(0.2, 0.07, y);
          vec3 col = vec3(1.0, 0.38, 0.06) * body;
          col = mix(col, vec3(1.0, 0.84, 0.5), core);
          col += vec3(0.12, 0.22, 0.95) * blue * 0.7;
          col *= 1.0 - dark * 0.6;
          float a = clamp(max(body, blue * 0.55), 0.0, 1.0);
          gl_FragColor = vec4(col * a * (2.0 + core * 3.0) * uFlick, a);
        }`
    });
    const flame = new THREE.Mesh(fgeo, flameMat);
    flame.position.set(0.06, wtop + 0.28, 0);
    flame.renderOrder = 10;
    flame.frustumCulled = false;
    g.add(flame);
    // Soft halo + wide haze
    const haloC = mk(128, 128), hx = haloC.getContext('2d');
    const hg = hx.createRadialGradient(64, 64, 0, 64, 64, 64);
    hg.addColorStop(0, 'rgba(255,200,130,1)'); hg.addColorStop(0.18, 'rgba(255,160,80,0.45)'); hg.addColorStop(0.5, 'rgba(255,120,50,0.1)'); hg.addColorStop(1, 'rgba(255,120,50,0)');
    hx.fillStyle = hg; hx.fillRect(0, 0, 128, 128);
    const haloTex = tex(haloC, true);
    const mkHalo = (size, op) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op }));
      sp.scale.set(size, size, 1);
      sp.position.set(0.06, wtop + 1.2, 0);
      sp.renderOrder = 9;
      g.add(sp);
      return sp;
    };
    const halo = mkHalo(6.5, 0.55), haze = mkHalo(26, 0.09);
    // The light itself
    const light = new THREE.PointLight('#ffa456', 0, 95, 1.25);
    light.position.set(0.06, wtop + 1.0, 0);
    if (!LOWQ) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 0.6;
      light.shadow.camera.far = 95;
      light.shadow.bias = -0.003;
      light.shadow.autoUpdate = false;
    }
    g.add(light);
    return {
      g, flame, flameMat, halo, haze, light, waxMat,
      fl: 1, flT: 1, timer: 0, sway: 0, swayT: 0, swayTimer: 0, gust: 0, shimmer: 1,
      top: new V3(), base: new V3()
    };
  })();

  /* ---- Dust in the lamp light ---- */
  const DUST = REDUCED ? 0 : LOWQ ? 160 : 320;
  const dustGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST * 3), dCol = new Float32Array(DUST * 3), dVel = new Float32Array(DUST * 3);
  for (let k = 0; k < DUST; k++) {
    dPos[k * 3] = (Math.random() - 0.5) * 80; dPos[k * 3 + 1] = Math.random() * 33; dPos[k * 3 + 2] = -6 + Math.random() * 40;
    dVel[k * 3] = (Math.random() - 0.5) * 0.25; dVel[k * 3 + 1] = (Math.random() - 0.5) * 0.18; dVel[k * 3 + 2] = (Math.random() - 0.5) * 0.2;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.16, map: tex(dotTexture(), true), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---- Post ---- */
  let composer = null, shimmer = null;
  if (!LOWQ) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(DPR);
    composer.setSize(stageW(), stageH());
    composer.addPass(new RenderPass(scene, camera));
    shimmer = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uPos: { value: new THREE.Vector2(-1, -1) }, uTime: { value: 0 }, uAspect: { value: 1 }, uAmt: { value: 0 }, uScale: { value: 0.05 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uPos;
        uniform float uTime, uAspect, uAmt, uScale;
        varying vec2 vUv;
        void main() {
          vec2 d = vUv - uPos;
          d.x *= uAspect;
          float up = smoothstep(-0.2 * uScale, 0.15 * uScale, d.y) * smoothstep(uScale * 2.6, uScale * 0.3, d.y);
          float spread = uScale * (0.28 + max(d.y, 0.0) / uScale * 0.22);
          float side = exp(-(d.x * d.x) / (spread * spread));
          float m = up * side * uAmt;
          vec2 off = vec2(sin(vUv.y * 260.0 - uTime * 9.0) + 0.6 * sin(vUv.y * 143.0 - uTime * 6.3 + vUv.x * 40.0),
                          0.5 * cos(vUv.x * 190.0 + uTime * 7.0)) * 0.0016 * m;
          gl_FragColor = texture2D(tDiffuse, vUv + off);
        }`
    });
    composer.addPass(shimmer);
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(stageW() / 2, stageH() / 2), 0.22, 0.5, 0.92));
    composer.addPass(new OutputPass());
  }

  /* =================================================================
     Poses & camera
     ================================================================= */
  const VIEWS = {
    cover: { yaw: 0.24, pitch: 0.05, open: 0 },
    open: { yaw: -0.06, pitch: 0.08, open: 1 },
    spine: { yaw: Math.PI / 2 - 0.12, pitch: 0.04, open: 0 },
    back: { yaw: Math.PI - 0.2, pitch: 0.05, open: 0 },
    edges: { yaw: -0.78, pitch: 0.72, open: 0 }
  };
  const isMobile = () => stageW() < 820 || stageH() > stageW() * 1.05;
  const layout = () => isMobile()
    ? { frac: 0.29, sx: 0, sy: 0.53, openScale: 1.28 }
    : { frac: 0.64, sx: -0.4, sy: 0.03, openScale: 1.1 };
  const tanV = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  function shelfPose(b, outPos, outQuat) {
    const yaw = Math.PI / 2 + b.yawJ - b.hover * 0.13;
    const roll = b.lean + b.rollJ;
    _e.set(0, yaw, roll, 'ZYX');
    outQuat.setFromEuler(_e);
    _v.set(0, b.H / 2, 0).applyQuaternion(outQuat);
    outPos.set(b.x, Math.abs(Math.sin(roll)) * b.T * 0.5 + b.hover * 0.5, b.zc + b.hover * 3.4).add(_v);
  }
  const fwd = new V3(), right = new V3(), up = new V3();
  let zoom = 1;
  const orbit = { yaw: 0, pitch: 0, vy: 0, vp: 0 };
  const tilt = { yaw: 0, pitch: 0 };
  function bookDistance(b) {
    const L = layout();
    let D = b.H / (L.frac * 2 * tanV());
    if (view === 'open') D *= L.openScale;
    return D / zoom;
  }
  function presentPose(b, outPos, outQuat, t) {
    const L = layout();
    camera.getWorldDirection(fwd);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const tv = tanV(), th = tv * camera.aspect;
    let D = Math.min(bookDistance(b), camera.position.z - 14);
    const z = Math.min(1, zoom);
    outPos.copy(camera.position)
      .addScaledVector(fwd, D)
      .addScaledVector(right, L.sx * z * D * th)
      .addScaledVector(up, L.sy * D * tv + (REDUCED ? 0 : Math.sin(t * 0.7) * 0.12));
    if (view === 'open') outPos.addScaledVector(right, b.W * 0.62);
    const vv = VIEWS[view];
    _e.set(vv.pitch + orbit.pitch + tilt.pitch, vv.yaw + orbit.yaw + tilt.yaw, 0, 'XYZ');
    _q.setFromEuler(_e);
    outQuat.copy(camera.quaternion).multiply(_q);
  }

  const cam = { pos: new V3(), look: new V3(), tPos: new V3(), tLook: new V3() };
  function shelfCam(outPos, outLook) {
    const mob = isMobile(), tv = tanV(), th = tv * camera.aspect;
    const Wv = mob ? booksW + 7 : booksW + 30;
    let D = Math.max((Wv / 2) / th, (mob ? 27 : 27.5) / tv);
    const aimY = 12.5 + (mob ? 0.28 : 0.37) * D * tv;
    const cx = mob ? 0 : 3;
    outPos.set(cx, aimY + D * 0.06, D);
    outLook.set(cx, aimY, -10);
  }
  function presentCam(outPos, outLook) {
    shelfCam(outPos, outLook);
    const b = books[selected];
    const D = bookDistance(b) * Math.max(1, zoom);
    const z = Math.max(outPos.z * 0.9, D + 18);
    outPos.set(outPos.x, 15.5, z);
    outLook.set(outPos.x, 14.5, -10);
  }

  /* =================================================================
     Hi-res covers (built on demand, kept in a small cache)
     ================================================================= */
  const HI_CAP = LOWQ ? 3 : 6;
  const hiOrder = [];
  const hiJobs = [];
  function touchHi(b) {
    const k = hiOrder.indexOf(b);
    if (k >= 0) hiOrder.splice(k, 1);
    hiOrder.push(b);
  }
  function* hiSteps(b) {
    const v = b.v, cw = Math.round(b.W * PXC), ch = Math.round(b.H * PXC);
    ensureCoverArt(v.i);
    const artWait = performance.now() + 8000;
    while (artPending(v.i) && performance.now() < artWait) yield;
    const f = paintFront(v, cw, ch);
    yield;
    const bk = paintBack(v, Math.round(cw * 0.8), Math.round(ch * 0.8));
    yield;
    const e1 = paintEndpaper(v, Math.round(cw * 0.8), Math.round(ch * 0.8), 'right', true);
    yield;
    const e2 = paintEndpaper(v, Math.round(cw * 0.5), Math.round(ch * 0.5), 'left', false);
    yield;
    const tp = paintTitlePage(v, Math.round(cw * 0.8), Math.round(ch * 0.8));
    yield;
    const sheen = b.clothMat.sheenColor;
    const mkFoil = (s) => new THREE.MeshPhysicalMaterial({
      map: tex(s.col, true), roughnessMap: tex(s.orm), metalnessMap: tex(s.orm), bumpMap: tex(s.bump), bumpScale: 0.9,
      roughness: 1, metalness: 1, sheen: 0.3, sheenRoughness: 0.75, sheenColor: sheen
    });
    const hi = {
      front: mkFoil(f), back: mkFoil(bk),
      endF: new THREE.MeshStandardMaterial({ map: tex(e1, true), roughness: 0.82 }),
      endB: new THREE.MeshStandardMaterial({ map: tex(e2, true), roughness: 0.82 }),
      title: new THREE.MeshStandardMaterial({ map: tex(tp, true), roughness: 0.94 })
    };
    if (!can(b.i)) for (const k of ['front', 'back']) hi[k].color.setScalar(0.62);
    yield;
    for (const m of Object.values(hi)) {
      for (const k of ['map', 'roughnessMap', 'metalnessMap', 'bumpMap']) {
        if (m[k]) { renderer.initTexture(m[k]); yield; }
      }
    }
    b.front.material[4] = hi.front; b.front.material[5] = hi.endF;
    b.back.material[5] = hi.back; b.back.material[4] = hi.endB;
    b.pages.material[4] = hi.title;
    b.hi = hi;
    hiOrder.push(b);
    while (hiOrder.length > HI_CAP) {
      const old = hiOrder.find((o) => o.i !== selected && o.mode === 'shelf');
      if (!old) break;
      hiOrder.splice(hiOrder.indexOf(old), 1);
      dropHi(old);
    }
  }
  function buildHi(b) {
    if (b.hi) { touchHi(b); return; }
    ensureCoverArt(b.v.i);
    if (artPending(b.v.i)) { scheduleHi(b, true); return; }
    const k = hiJobs.findIndex((j) => j.b === b);
    if (k >= 0) hiJobs.splice(k, 1);
    const g = hiSteps(b);
    let r = g.next();
    while (!r.done) r = g.next();
  }
  function scheduleHi(b, urgent) {
    if (b.hi) { touchHi(b); return; }
    const k = hiJobs.findIndex((j) => j.b === b);
    if (k >= 0) {
      if (urgent && k > 0) hiJobs.unshift(hiJobs.splice(k, 1)[0]);
      return;
    }
    const job = { b, gen: hiSteps(b) };
    if (urgent) hiJobs.unshift(job); else hiJobs.push(job);
  }
  function pumpHi() {
    if (!hiJobs.length) return;
    const sq = selected >= 0 ? books[selected].seq : null;
    const burst = !!sq && sq.type === 'pull' && sq.t < (PULL.A + PULL.B) / 2 && hiJobs[0].b === books[selected];
    for (let s = 0, n = burst ? 2 : 1; s < n && hiJobs.length; s++) {
      const job = hiJobs[0];
      if (job.b.hi) { hiJobs.shift(); continue; }
      let r;
      try { r = job.gen.next(); } catch (e) { hiJobs.shift(); console.warn('[shelf] cover build failed', e); continue; }
      if (r.done) hiJobs.shift();
    }
  }
  function dropHi(b) {
    if (!b.hi) return;
    b.front.material[4] = b.clothMat; b.front.material[5] = b.paperMat;
    b.back.material[5] = b.clothMat; b.back.material[4] = b.paperMat;
    b.pages.material[4] = b.paperMat;
    for (const m of Object.values(b.hi)) {
      for (const k of ['map', 'roughnessMap', 'metalnessMap', 'bumpMap']) if (m[k] && m[k] !== (k === 'metalnessMap' ? m.roughnessMap : null)) m[k].dispose();
      m.dispose();
    }
    b.hi = null;
  }
  function prefetch(i) { if (i < 0 || i >= N || books[i].hi) return; scheduleHi(books[i], false); }

  /* =================================================================
     Interaction
     ================================================================= */
  let hovered = -1, focusIdx = -1, lastHoverSound = -1;
  let lastInput = performance.now();
  const noteInput = () => { lastInput = performance.now(); };
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown']) document.addEventListener(ev, noteInput, { capture: true, passive: true });
  const pointer = new THREE.Vector2(0, 0), pointerS = new THREE.Vector2(0, 0);
  const ray = new THREE.Raycaster();
  let intro = 0;
  const introLen = REDUCED ? 0.6 : 3.4;
  let downAt = null, dragging = false, moved = false;
  const touches = new Map();
  let pinch0 = 0, zoom0 = 1;

  function pick(clientX, clientY) {
    const f = stageFrac(clientX, clientY), nx = f.x * 2 - 1, ny = -f.y * 2 + 1;
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const hits = ray.intersectObjects(hitboxes, false);
    return hits.length ? hits[0].object.userData.index : -1;
  }

  function pull(i) {
    if (i === selected) return;
    noteInput();
    if (selected >= 0) sendBack(selected);
    selected = i;
    focusIdx = i;
    const b = books[i];
    scheduleHi(b, true);
    prefetch(i + 1); prefetch(i - 1);
    view = 'cover';
    zoom = 1;
    orbit.yaw = orbit.pitch = orbit.vy = orbit.vp = 0;
    setViewUI(view);
    b.seq = { type: 'pull', t: 0, from: { pos: b.pos.clone(), quat: b.quat.clone() } };
    b.mode = 'seq';
    candleRig.gust = 1;
    const first = !body.classList.contains('is-open');
    body.classList.add('is-open');
    fillDossier(i, first);
    hideTag();
    foley('pull');
    try { history.replaceState(null, '', '#volume-' + i); } catch (e) {}
  }
  function sendBack(i) {
    const b = books[i];
    b.seq = { type: 'return', t: 0, from: { pos: b.pos.clone(), quat: b.quat.clone() } };
    b.mode = 'seq';
  }
  function put() {
    if (selected < 0) return;
    noteInput();
    sendBack(selected);
    candleRig.gust = 0.8;
    foley('return');
    focusIdx = selected;
    selected = -1;
    body.classList.remove('is-open');
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  function step(d) { pull(((selected < 0 ? focusIdx : selected) + d + N) % N); }
  function setView(v) {
    if (selected < 0 || !VIEWS[v]) return;
    if (v === view) v = 'cover';
    const wasOpen = view === 'open';
    view = v;
    zoom = 1;
    orbit.yaw = orbit.pitch = orbit.vy = orbit.vp = 0;
    setViewUI(view);
    foley(v === 'open' ? 'open' : wasOpen ? 'close' : 'turn');
  }
  function focusStep(d) {
    focusIdx = focusIdx < 0 ? (d > 0 ? 0 : N - 1) : (focusIdx + d + N) % N;
    hovered = focusIdx;
    foley('hover');
    prefetch(focusIdx);
  }

  glCanvas.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom;
    }
    downAt = { x: e.clientX, y: e.clientY };
    moved = false;
    if (selected >= 0) {
      dragging = true;
      orbit.vy = orbit.vp = 0;
      glCanvas.setPointerCapture(e.pointerId);
      glCanvas.classList.add('is-grabbing');
    }
  });
  glCanvas.addEventListener('pointermove', (e) => {
    const pf = stageFrac(e.clientX, e.clientY);
    pointer.set(pf.x * 2 - 1, -pf.y * 2 + 1);
    const prev = touches.get(e.pointerId);
    if (prev) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && selected >= 0) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) zoom = THREE.MathUtils.clamp(zoom0 * (d / pinch0), 0.8, 2.2);
      moved = true;
      return;
    }
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) moved = true;
    if (dragging && prev) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      orbit.yaw += dx * 0.0085;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.006, -0.9, 0.9);
      orbit.vy = dx * 0.0085; orbit.vp = dy * 0.006;
      return;
    }
    if (e.pointerType === 'mouse') {
      const h = pick(e.clientX, e.clientY);
      if (selected < 0) {
        if (h !== hovered) {
          hovered = h;
          if (h >= 0) { focusIdx = h; if (lastHoverSound !== h) foley('hover'); lastHoverSound = h; prefetch(h); prefetch(h - 1); prefetch(h + 1); }
        }
      }
      glCanvas.classList.toggle('is-pointer', h >= 0 && h !== selected);
      glCanvas.classList.toggle('is-grab', selected >= 0 && (h === selected || h < 0));
    }
  });
  const endPointer = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch0 = 0;
    if (dragging) { dragging = false; glCanvas.classList.remove('is-grabbing'); }
    if (downAt && !moved && e.type === 'pointerup') {
      const h = pick(e.clientX, e.clientY);
      if (h >= 0 && h !== selected) pull(h);
      else if (h < 0 && selected >= 0) put();
    }
    downAt = null;
  };
  glCanvas.addEventListener('pointerup', endPointer);
  glCanvas.addEventListener('pointercancel', endPointer);
  glCanvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && selected < 0) hovered = -1; });
  glCanvas.addEventListener('dblclick', () => { if (selected >= 0) setView(view === 'open' ? 'cover' : 'open'); });
  glCanvas.addEventListener('wheel', (e) => {
    if (selected < 0) return;
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(-e.deltaY * 0.0012), 0.8, 2.2);
  }, { passive: false });

  function onResize() {
    camera.aspect = stageW() / stageH();
    camera.updateProjectionMatrix();
    renderer.setSize(stageW(), stageH(), false);
    if (composer) composer.setSize(stageW(), stageH());
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(body); else addEventListener('resize', onResize);
  onResize();

  /* ---- Floating tag over the hovered spine ---- */
  const tagMeta = $('#tag-meta'), tagTitle = $('#tag-title'), tagSub = $('#tag-sub');
  let tagFor = -1;
  function hideTag() { tag.classList.remove('visible'); body.classList.remove('is-hovering'); tagFor = -1; }
  function updateTag() {
    const i = selected < 0 && intro >= introLen * 0.8 && !body.classList.contains('is-drawer') ? hovered : -1;
    if (i < 0) { if (tagFor >= 0) hideTag(); return; }
    const b = books[i];
    if (tagFor !== i) {
      const v = b.v;
      tagMeta.textContent = 'Vol. ' + v.roman + (done(i) ? ' · Completed' : can(i) ? '' : ' · Locked');
      tagTitle.textContent = v.title;
      tagSub.textContent = v.scripture + ' · ' + v.time;
      tagFor = i;
      tag.classList.add('visible');
      body.classList.add('is-hovering');
    }
    _w.set(b.root.position.x, b.H + 3.2, b.root.position.z + b.W * 0.5).project(camera);
    tag.style.left = ((_w.x + 1) / 2) * stageW() + 'px';
    tag.style.top = ((1 - _w.y) / 2) * stageH() + 'px';
  }

  /* =================================================================
     Animation
     ================================================================= */
  const ease = {
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out2: (t) => 1 - (1 - t) * (1 - t),
    out3: (t) => 1 - Math.pow(1 - t, 3),
    out4: (t) => 1 - Math.pow(1 - t, 4),
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2
  };
  const P = { a: new V3(), b: new V3(), c: new V3(), q: new Q(), sp: new V3(), sq: new Q() };
  const bez = (out, a, c, b, t) => out.set(
    (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
    (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
    (1 - t) * (1 - t) * a.z + 2 * (1 - t) * t * c.z + t * t * b.z);
  const SPEED = REDUCED ? 3 : 1;
  const PULL = { A: 0.24, B: 0.8 }, RET = { A: 0.42, B: 0.3 };
  function poseSig(b) {
    const p = b.root.position, q = b.root.quaternion;
    return p.x + p.y + p.z + q.x + q.y + q.z + q.w + b.open;
  }

  function updateBook(b, dt, t) {
    const out = selected >= 0 && books[selected].mode !== 'shelf';
    const leanT = out && b.i === selected - 1 ? -0.042 : out && b.i === selected + 1 ? 0.042 : 0;
    b.lean = damp(b.lean, leanT, 3.2, dt);
    const hovT = b.mode === 'shelf' && selected < 0 && hovered === b.i && !body.classList.contains('is-drawer') ? 1 : 0;
    b.hover = damp(b.hover, hovT, 9, dt);

    if (b.mode === 'shelf') {
      shelfPose(b, b.pos, b.quat);
    } else if (b.mode === 'present') {
      presentPose(b, P.a, P.q, t);
      const k = 1 - Math.exp(-(dragging ? 28 : 9) * dt);
      b.pos.lerp(P.a, k);
      b.quat.slerp(P.q, k);
    } else if (b.mode === 'seq') {
      const s = b.seq;
      s.t += dt * SPEED;
      if (s.type === 'pull') {
        const A = PULL.A, B = PULL.B;
        P.sp.copy(s.from.pos); P.sp.z += b.W * 0.82; P.sp.y += 0.6;
        if (s.t < A) {
          b.pos.lerpVectors(s.from.pos, P.sp, ease.out3(s.t / A));
          b.quat.copy(s.from.quat);
        } else {
          const k = Math.min(1, (s.t - A) / B), e = ease.out3(k);
          presentPose(b, P.b, P.q, t);
          P.c.lerpVectors(P.sp, P.b, 0.5); P.c.y += 7; P.c.z += 5;
          bez(b.pos, P.sp, P.c, P.b, e);
          b.quat.slerpQuaternions(s.from.quat, P.q, ease.out3(Math.min(1, k * 1.12)));
          if (k >= 1) { b.mode = 'present'; b.seq = null; }
        }
      } else {
        const A = RET.A, B = RET.B;
        const hov0 = b.hover; b.hover = 0;
        shelfPose(b, P.a, P.sq);
        b.hover = hov0;
        P.sp.copy(P.a); P.sp.z += b.W * 0.82; P.sp.y += 0.6;
        if (s.t < A) {
          const k = s.t / A, e = ease.out3(k);
          P.c.lerpVectors(s.from.pos, P.sp, 0.5); P.c.y += 6; P.c.z += 4;
          bez(b.pos, s.from.pos, P.c, P.sp, e);
          b.quat.slerpQuaternions(s.from.quat, P.sq, ease.out3(k));
        } else {
          const k = Math.min(1, (s.t - A) / B);
          b.pos.lerpVectors(P.sp, P.a, ease.out3(k));
          b.quat.copy(P.sq);
          if (k >= 1) { b.mode = 'shelf'; b.seq = null; }
        }
      }
    }
    const openT = b.i === selected && b.mode === 'present' && view === 'open' ? -Math.PI * 0.93 : 0;
    b.open = damp(b.open, openT, openT ? 3.2 : 4.5, dt);
    b.pivot.rotation.y = b.open;
    b.root.position.copy(b.pos);
    b.root.quaternion.copy(b.quat);
  }

  let lampLevel = 0, keyLevel = 0;
  const clock = new THREE.Clock();
  shelfCam(cam.tPos, cam.tLook);
  cam.pos.copy(cam.tPos).add(new V3(-4, -5, 34));
  cam.look.copy(cam.tLook).add(new V3(0, -3, 0));
  let running = true;
  let rafId = 0;
  let tabVisible = !document.hidden;
  /* One place decides whether the loop runs: tab visible AND stage on screen.
     A hidden tab keeps its queued frame callback, so it is cancelled before the
     loop restarts; otherwise each hide/show would leave one more loop running. */
  function syncRunning() {
    const next = tabVisible && stageInView;
    if (next === running) return;
    running = next;
    cancelAnimationFrame(rafId);
    if (running) { clock.getDelta(); loop(); }
  }
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; syncRunning(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver((entries) => {
      stageInView = entries.some((en) => en.isIntersecting);
      syncRunning();
    }, { threshold: 0.05 }).observe(body);
  }

  let simT = 0;
  let shadowSettle = 3, shadowTick = 0, keyWasOn = false, introDone = false;
  let pendingDt = 0, skipToggle = false;
  function requestShadows(light) {
    if (!light.castShadow) return;
    light.shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  }
  const DPR_MIN = Math.min(DPR, 1);
  let dprCur = DPR, fastWins = 0, lastDprAt = -Infinity, frameN = 0;
  const frameRing = new Float64Array(60);
  function setDpr(v) {
    dprCur = v;
    renderer.setPixelRatio(dprCur);
    renderer.setSize(stageW(), stageH(), false);
    if (composer) { composer.setPixelRatio(dprCur); composer.setSize(stageW(), stageH()); }
  }
  function governor(raw) {
    frameRing[frameN % 60] = raw;
    frameN++;
    if (frameN % 60 !== 0 || window.__shelfGovernorOff === true) return;
    if (intro < introLen || books.some((b) => b.mode === 'seq')) { fastWins = 0; return; }
    const sorted = Array.from(frameRing).sort((a, b) => a - b);
    const med = (sorted[29] + sorted[30]) / 2;
    const now = performance.now();
    if (med > 0.026 && dprCur > DPR_MIN) {
      if (now - lastDprAt >= 3000) { lastDprAt = now; setDpr(Math.max(DPR_MIN, dprCur - 0.25)); }
      fastWins = 0;
    } else if (med < 0.0185 && dprCur < DPR) {
      fastWins++;
      if (fastWins >= 4 && now - lastDprAt >= 3000) { lastDprAt = now; fastWins = 0; setDpr(Math.min(DPR, dprCur + 0.25)); }
    } else fastWins = 0;
  }
  function isIdle() {
    return intro >= introLen && shadowSettle === 0 && selected < 0 && hiJobs.length === 0 && !document.hidden &&
      !books.some((b) => b.mode === 'seq') && performance.now() - lastInput > 4000;
  }
  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    const raw = clock.getDelta();
    if (window.__shelf && window.__shelf.frozen) return;
    governor(raw);
    pendingDt += Math.min(raw, 0.05);
    skipToggle = !skipToggle;
    if (skipToggle && isIdle()) return;
    const dt = pendingDt;
    pendingDt = 0;
    update(dt);
    render();
    pumpHi();
  }
  function render() { if (composer) composer.render(); else renderer.render(scene, camera); }
  function booksPoseChanged() {
    let moving = false;
    for (const b of books) {
      const s = poseSig(b);
      if (Math.abs(s - b.sig) > 1e-4) moving = true;
      b.sig = s;
    }
    return moving;
  }
  function refreshShadows(fast, slow) {
    if (!introDone && intro >= introLen) { introDone = true; shadowSettle = 3; }
    const busy = fast || slow;
    if (busy) shadowSettle = 3;
    const settle = !busy && shadowSettle > 0;
    if (settle) shadowSettle--;
    shadowTick++;
    const lampNow = settle || (busy && shadowTick % (fast ? 1 : 2) === 0);
    const candleNow = settle || (busy && shadowTick % (fast ? 2 : 4) === 0);
    if (lampNow) requestShadows(lamp);
    if (key.visible && (lampNow || !keyWasOn)) requestShadows(key);
    keyWasOn = key.visible;
    if (candleNow) requestShadows(candleRig.light);
  }
  function update(dt) {
    simT += dt;
    const t = simT;
    intro = Math.min(introLen, t);
    const ip = intro / introLen;

    // Pointer smoothing + idle tilt
    pointerS.x = damp(pointerS.x, pointer.x, 4, dt);
    pointerS.y = damp(pointerS.y, pointer.y, 4, dt);
    if (!dragging) {
      orbit.yaw += orbit.vy; orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + orbit.vp, -0.9, 0.9);
      orbit.vy *= Math.pow(0.04, dt); orbit.vp *= Math.pow(0.04, dt);
    }
    const tiltOn = selected >= 0 && !dragging && !COARSE && !REDUCED;
    tilt.yaw = damp(tilt.yaw, tiltOn ? pointerS.x * 0.12 : 0, 3, dt);
    tilt.pitch = damp(tilt.pitch, tiltOn ? -pointerS.y * 0.08 : 0, 3, dt);

    // Camera
    if (selected >= 0) presentCam(cam.tPos, cam.tLook); else shelfCam(cam.tPos, cam.tLook);
    if (!REDUCED && !COARSE) {
      const k = selected >= 0 ? 0.6 : 2.4;
      cam.tPos.x += pointerS.x * k; cam.tPos.y += pointerS.y * k * 0.45;
      cam.tLook.x += pointerS.x * k * 0.3; cam.tLook.y += pointerS.y * k * 0.2;
    }
    if (!REDUCED) cam.tPos.y += Math.sin(t * 0.23) * 0.25;
    const camRate = ip < 1 ? 0.9 : (selected >= 0 ? 3.4 : 2.6);
    cam.pos.x = damp(cam.pos.x, cam.tPos.x, camRate, dt); cam.pos.y = damp(cam.pos.y, cam.tPos.y, camRate, dt); cam.pos.z = damp(cam.pos.z, cam.tPos.z, camRate, dt);
    cam.look.x = damp(cam.look.x, cam.tLook.x, camRate, dt); cam.look.y = damp(cam.look.y, cam.tLook.y, camRate, dt); cam.look.z = damp(cam.look.z, cam.tLook.z, camRate, dt);
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
    camera.updateMatrixWorld();

    for (const b of books) updateBook(b, dt, t);
    const moving = booksPoseChanged();
    const fast = books.some((b) => b.mode === 'seq');
    const slow = selected >= 0 || moving;

    // Lights
    const presenting = selected >= 0;
    lampLevel = damp(lampLevel, presenting ? 0.2 : 1, presenting ? 2.2 : 1.6, dt);
    keyLevel = damp(keyLevel, presenting ? 1 : 0, 2.2, dt);
    let warm = Math.min(1, ip * 1.6);
    if (ip < 0.55 && !REDUCED) warm *= 0.75 + 0.25 * Math.sin(t * 47) * Math.sin(t * 13);
    const flick = 0.94 + 0.04 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 17.1 + 1.3);
    lamp.intensity = 10.5 * lampLevel * warm * (0.985 + 0.015 * Math.sin(t * 3.1));
    hemi.intensity = 0.3 + 0.25 * lampLevel * warm;
    candle.intensity = 0.9 * warm * flick * (0.6 + 0.4 * lampLevel);
    // Candle: flicker, sway, gusts, wax glow, heat shimmer
    {
      const C = candleRig, amp = REDUCED ? 0.4 : 1;
      C.timer -= dt;
      if (C.timer <= 0) {
        C.timer = 0.05 + Math.random() * 0.16;
        C.flT = Math.random() < 0.05 ? 0.62 + Math.random() * 0.14 : 0.86 + Math.random() * 0.16;
      }
      C.swayTimer -= dt;
      if (C.swayTimer <= 0) { C.swayTimer = 0.3 + Math.random() * 0.9; C.swayT = (Math.random() - 0.5) * 0.09; }
      C.gust = damp(C.gust, 0, 1.4, dt);
      C.fl = damp(C.fl, C.flT, 13, dt);
      C.sway = damp(C.sway, C.swayT + Math.sin(t * 5.3) * 0.12 * C.gust, 3.5, dt);
      const f = 1 + (C.fl * (1 + 0.03 * Math.sin(t * 31)) - 1) * amp - C.gust * 0.18;
      C.flameMat.uniforms.uTime.value = t;
      C.flameMat.uniforms.uSway.value = C.sway * amp;
      C.flameMat.uniforms.uFlick.value = f;
      C.flameMat.uniforms.uHeight.value = 0.9 + 0.16 * (f - 0.85) / 0.2 + C.gust * 0.12;
      const ig = Math.min(1, ip * 1.3);
      C.light.intensity = 26 * f * ig;
      C.light.position.x = 0.06 + C.sway * 4;
      C.halo.material.opacity = 0.5 * f * ig;
      C.haze.material.opacity = 0.09 * f * ig;
      C.waxMat.emissiveIntensity = 1.25 * f * ig;
      C.flame.visible = ig > 0.02;
      if (shimmer) {
        C.flame.getWorldPosition(C.base);
        C.top.copy(C.base); C.top.y += 2.6;
        C.base.project(camera); C.top.project(camera);
        const on = C.top.z < 1 && Math.abs(C.top.x) < 1.2 && Math.abs(C.top.y) < 1.2;
        shimmer.uniforms.uPos.value.set((C.top.x + 1) / 2, (C.top.y + 1) / 2 - (C.top.y - C.base.y) * 0.25);
        shimmer.uniforms.uScale.value = Math.max(0.01, (C.top.y - C.base.y) / 2);
        shimmer.uniforms.uAspect.value = camera.aspect;
        shimmer.uniforms.uTime.value = t;
        // Heat haze only while every book is on the shelf, so it never warps a volume in hand
        const bookOut = selected >= 0 || books.some((bk) => bk.mode !== 'shelf');
        C.shimmer = bookOut ? 0 : damp(C.shimmer, 1, 1.5, dt);
        shimmer.uniforms.uAmt.value = on && !REDUCED ? ig * C.shimmer : 0;
        shimmer.enabled = shimmer.uniforms.uAmt.value > 0.001;
      }
    }

    if (picLight) picLight.intensity = 11 * warm * (0.3 + 0.7 * lampLevel);
    if (selected >= 0) {
      const bp = books[selected].pos;
      camera.getWorldDirection(fwd);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      const side = view === 'edges' ? 1 : -1;
      key.position.copy(bp).addScaledVector(right, 17 * side).addScaledVector(up, 16).addScaledVector(fwd, -18);
      key.target.position.copy(bp);
      glint.position.copy(bp).addScaledVector(fwd, -15).addScaledVector(right, pointerS.x * 12).addScaledVector(up, pointerS.y * 9 + 3);
      glint.target.position.copy(bp);
      rim.position.copy(bp).addScaledVector(right, 14).addScaledVector(up, 12).addScaledVector(fwd, 11);
      rim.target.position.copy(bp);
    }
    key.intensity = 4.4 * keyLevel;
    glint.intensity = 1.7 * keyLevel;
    rim.intensity = 3.2 * keyLevel;
    key.visible = keyLevel > 0.01; glint.visible = rim.visible = key.visible;
    refreshShadows(fast, slow);

    // Dust
    if (DUST) {
      const pa = dustGeo.attributes.position.array, ca = dustGeo.attributes.color.array;
      const bright = (0.25 + 0.75 * lampLevel) * warm;
      for (let k = 0; k < DUST; k++) {
        const o = k * 3;
        pa[o] += (dVel[o] + Math.sin(t * 0.3 + k) * 0.05) * dt;
        pa[o + 1] += (dVel[o + 1] + Math.cos(t * 0.21 + k * 1.7) * 0.04) * dt;
        pa[o + 2] += dVel[o + 2] * dt;
        if (pa[o + 1] < 0) pa[o + 1] = 33; if (pa[o + 1] > 33) pa[o + 1] = 0;
        if (pa[o] < -40) pa[o] = 40; if (pa[o] > 40) pa[o] = -40;
        if (pa[o + 2] < -8) pa[o + 2] = 34; if (pa[o + 2] > 34) pa[o + 2] = -8;
        const inCone = Math.max(0, 1 - Math.abs(pa[o]) / 34) * Math.max(0, 1 - Math.abs(pa[o + 2] - 6) / 30);
        const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + k * 2.1);
        const c = inCone * tw * bright;
        ca[o] = c; ca[o + 1] = c * 0.86; ca[o + 2] = c * 0.62;
      }
      dustGeo.attributes.position.needsUpdate = true;
      dustGeo.attributes.color.needsUpdate = true;
    }

    // Hourglass sand drains over ten minutes
    if (window.__sand) {
      const p = Math.min(1, t / 600);
      window.__sand.sandTop.scale.set(1 - p * 0.75, 1 - p * 0.75, 1 - p * 0.75);
      window.__sand.sandBot.scale.set(1, 0.7 + p * 0.5, 1);
    }

    updateTag();
  }

  setLoader(1, 'Lighting the lamp…');
  await nextFrame();
  buildHi(books[continueIndex()]);
  const warmed = [];
  scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isSprite)) return;
    warmed.push([o, o.visible, o.frustumCulled]);
    o.visible = true; o.frustumCulled = false;
  });
  for (const on of [true, false]) {
    key.visible = glint.visible = rim.visible = on;
    requestShadows(lamp); requestShadows(key); requestShadows(candleRig.light);
    render();
  }
  for (const [o, vis, culled] of warmed) { o.visible = vis; o.frustumCulled = culled; }
  key.visible = glint.visible = rim.visible = false;
  renderer.compile(scene, camera);
  loop();

  api = { pull, put, step, setView: (v) => setView(v), focusStep, focused: () => focusIdx };
  window.__shelf = { books, camera, scene, renderer, api, state: () => ({ running, stageInView, tabVisible, rafId, dpr: dprCur }), advance(sec) { for (let k = 0; k < sec * 60; k++) { update(1 / 60); pumpHi(); } render(); } };

  // Warm a few covers in the background
  setTimeout(() => { prefetch(continueIndex()); }, 1800);

  return {
    deepLink() {
      const m = /#volume-(\d+)/.exec(location.hash);
      if (m && Number(m[1]) < N) setTimeout(() => pull(Number(m[1])), REDUCED ? 200 : 2200);
    }
  };
}

/* =====================================================================
   Boot
   ===================================================================== */
async function loadFonts() {
  const specs = ['600 48px Cinzel', '500 48px Cinzel', '400 48px Newsreader', 'italic 400 48px Newsreader', 'italic 500 48px Newsreader', '500 24px "JetBrains Mono"'];
  try {
    await Promise.race([
      Promise.all(specs.map((s) => document.fonts.load(s))),
      new Promise((r) => setTimeout(r, 4000))
    ]);
  } catch (e) {}
}

function fallback(msg) {
  console.warn('[shelf] 3D unavailable:', msg);
  body.classList.add('no-gl', 'is-ready', 'is-drawer');
  body.classList.remove('is-loading');
}

function whenShown(el) {
  return new Promise((resolve) => {
    if (!window.IntersectionObserver) { resolve(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); resolve(); }
    });
    io.observe(el);
  });
}

function watchForRefresh() {
  let wasShown = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver((entries) => {
      const shown = entries.some((en) => en.isIntersecting);
      if (shown && !wasShown) buildChrome();
      wasShown = shown;
    }).observe(body);
  }
  const auth = window.ScrollAuth;
  if (auth && typeof auth.ready === 'function') auth.ready().then(buildChrome, () => {});
  if (auth && typeof auth.onChange === 'function') auth.onChange(() => buildChrome());
}

(async function boot() {
  buildChrome();
  wireUI();
  watchForRefresh();
  setLoader(0.06, 'Opening the reading room…');
  try {
    await whenShown(body);
    await Promise.all([loadFonts(), loadMotifs()]);
    const room = await startRoom();
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    room.deepLink();
  } catch (e) {
    console.error(e);
    fallback(e && e.message);
  }
})();
