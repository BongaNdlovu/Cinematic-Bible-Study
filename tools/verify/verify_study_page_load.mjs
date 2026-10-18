/*
 * Study page load and teardown proof.
 *
 *   every sitting   opens by URL with no console or page errors, renders its
 *                   article, diagrams, quiz and audio orb;
 *   loading         fetches only the sitting it shows (plus idle neighbours),
 *                   Strong's once, and the mindmap module only where a
 *                   sitting draws one;
 *   full screen     a table left full screen across a sitting switch leaves
 *                   no lock class, no inert furniture and no live key handler;
 *   quiz            a server error is shown as unchecked, never as right or
 *                   wrong, and the learner's pick is not painted as the key;
 *   page controls   the header buttons work without inline handlers;
 *   certificate     loads on demand and opens its panel.
 *
 * Usage: node tools/verify/verify_study_page_load.mjs [--base=http://127.0.0.1:8130]
 */
import { chromium } from 'playwright';
import { ensureServer } from './_server.mjs';

const server = await ensureServer({ preferred: 8130, probe: '/study.html' });
const BASE = server.base;
const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa@example.com', user_metadata: { name: 'QA' } },
  session: { access_token: 't', refresh_token: 'r', expires_at: 4102444800, token_type: 'bearer' }
};

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(sheet, opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  await context.addInitScript(({ mock, completed }) => {
    try {
      localStorage.setItem('baQaMockSession', JSON.stringify(mock));
      localStorage.setItem('baOnboardV1', '1');
      localStorage.setItem('daniel_placement_track_v1', 'standard');
      const j = JSON.parse(localStorage.getItem('baJourney') || '{}');
      j.termsAccepted = true;
      j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
      j.completedSheets = completed;
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) { /* storage disabled */ }
  }, { mock: MOCK, completed: opts.completed || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
  if (opts.init) await context.addInitScript(opts.init);
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('request', (r) => requests.push(r.url().replace(BASE + '/', '')));
  await page.goto(`${BASE}/study.html?sheet=${sheet}&preview=full`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction((n) => {
    const a = document.getElementById('sheet-article');
    return a && a.getAttribute('data-sheet-index') === String(n) && a.children.length > 0;
  }, sheet, { timeout: 30000 });
  await page.waitForTimeout(opts.settle || 1500);
  await page.evaluate(() => {
    const g = document.getElementById('sitting-guide');
    if (g) g.hidden = true;
    const m = document.getElementById('placement-modal');
    if (m) m.remove();
  });
  return { context, page, errors, requests };
}

for (let sheet = 0; sheet <= 10; sheet += 1) {
  const { context, page, errors, requests } = await open(sheet);
  const state = await page.evaluate(() => ({
    title: document.getElementById('sheet-title').textContent.trim(),
    figures: document.querySelectorAll('#sheet-article figure[data-diagram]').length,
    drawn: document.querySelectorAll('#sheet-article figure[data-diagram].chain').length,
    quiz: document.querySelectorAll('#quiz-container .quiz-option, .checkpoint-plate .quiz-option').length,
    orb: !!document.querySelector('.audio-orb'),
    reader: !!window.StudyAudioReader,
    mm: document.querySelectorAll('#sheet-article .mm').length,
    mmDrawn: document.querySelectorAll('#sheet-article .mm svg, #sheet-article .mm canvas').length,
    book: !!(window.BookReader && window.BookReader.isActive && window.BookReader.isActive())
  }));
  const sheetFiles = requests.filter((u) => /js\/study\/sheets\/sheet-\d+\.js/.test(u)).map((u) => Number(/sheet-(\d+)\.js/.exec(u)[1]));
  check(`sitting ${sheet} renders its article, diagrams and quiz`, state.title && state.figures > 0 && state.drawn === state.figures && state.quiz > 0, state);
  check(`sitting ${sheet} mounts the read-along orb`, state.orb && state.reader);
  check(`sitting ${sheet} loads only itself and its neighbours`, sheetFiles.includes(sheet) && sheetFiles.every((n) => Math.abs(n - sheet) <= 1), sheetFiles);
  check(`sitting ${sheet} does not load sheets-data.js`, !requests.some((u) => u.includes('sheets-data.js')));
  check(`sitting ${sheet} fetches the mindmap module only when it draws one`, requests.some((u) => u.includes('js/study/mindmap.js')) === state.mm > 0, { mm: state.mm });
  if (state.mm) check(`sitting ${sheet} mindmaps are drawn`, state.mmDrawn > 0, state);
  check(`sitting ${sheet} has no console or page errors`, errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors, requests } = await open(2);
  await page.evaluate(async () => {
    const box = document.getElementById('scripture-root');
    if (window.BAScripture) await window.BAScripture.whenReady();
    if (box) box.scrollIntoView();
  });
  await page.evaluate(() => {
    const gloss = document.querySelector('.strongs-gloss');
    if (gloss) gloss.click();
  });
  await page.waitForTimeout(800);
  const strongs = requests.filter((u) => u.includes('strongs-daniel.json')).length;
  check("Strong's lexicon is fetched once", strongs === 1, { strongs });

  const figure = await page.evaluateHandle(() => document.querySelector('#sheet-article figure.chain [data-chain-fs]'));
  const hasFs = await figure.evaluate((b) => !!b);
  check('sitting 2 offers a full-screen table or comparison', hasFs);
  if (hasFs) {
    await page.evaluate(() => {
      const b = document.querySelector('#sheet-article figure.chain [data-chain-fs]');
      b.scrollIntoView({ block: 'center' });
      b.click();
    });
    await page.waitForTimeout(400);
    const during = await page.evaluate(() => ({
      open: document.documentElement.classList.contains('dfx-open'),
      inert: document.querySelectorAll('[data-dfx-inert]').length
    }));
    check('the full-screen layer opens and marks furniture inert', during.open && during.inert > 0, during);
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Control');
    await page.waitForFunction(() => document.getElementById('sheet-article').getAttribute('data-sheet-index') === '1', null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      lock: document.documentElement.classList.contains('dfx-open'),
      cite: document.documentElement.classList.contains('dfx-cite-open'),
      inert: document.querySelectorAll('[data-dfx-inert]').length,
      orbInert: Array.from(document.querySelectorAll('.audio-orb, .insight-card')).some((el) => el.hasAttribute('inert')),
      full: document.querySelectorAll('.chain.is-full').length
    }));
    check('a sitting switch while full screen releases the lock and the inert furniture', !after.lock && !after.cite && !after.inert && !after.orbInert && !after.full, after);
    const tabbed = await page.evaluate(() => {
      const before = document.activeElement;
      const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
      return { prevented: ev.defaultPrevented, same: document.activeElement === before };
    });
    check('no detached full-screen key trap survives the switch', !tabbed.prevented, tabbed);
  }
  check('sitting switch under full screen has no errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(0);
  const launch = await page.$('#sheet-article figure.is-story .story-fullscreen');
  check('sitting 0 has a story reader', !!launch);
  if (launch) {
    await launch.evaluate((b) => { b.scrollIntoView({ block: 'center' }); b.click(); });
    await page.waitForTimeout(1200);
    for (let i = 0; i < 12; i += 1) {
      await page.evaluate((back) => {
        const r = document.querySelector('body > .story-read');
        const b = r && r.querySelector(back ? '[data-read-prev]' : '[data-read-next]');
        if (b && !b.disabled) b.click();
        else if (r) { const o = r.querySelector(back ? '[data-read-next]' : '[data-read-prev]'); if (o && !o.disabled) o.click(); }
      }, i % 4 === 3);
      await page.waitForTimeout(450);
    }
    const cdp = await context.newCDPSession(page);
    const { result } = await cdp.send('Runtime.evaluate', { expression: "Array.from(document.querySelectorAll('body > .story-read .story-read-photo'))" });
    const props = await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
    let most = 0;
    for (const prop of props.result) {
      if (!/^\d+$/.test(prop.name) || !prop.value || !prop.value.objectId) continue;
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: prop.value.objectId });
      most = Math.max(most, listeners.filter((l) => l.type === 'error' || l.type === 'load').length);
    }
    check('story-reader photo layers do not pile up load/error listeners', most <= 2, { most });
  }
  check('story reader stepping raises no errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(0, {
    init: () => {
      window.__quizReplies = [];
      Object.defineProperty(window, 'QuizGate', {
        configurable: true,
        get() { return window.__gate; },
        set(v) {
          window.__gate = {
            verify: (s, q, chosen) => {
              const next = window.__quizReplies.shift();
              return Promise.resolve(next || v.verify(s, q, chosen));
            }
          };
        }
      });
    }
  });
  const probe = async (reply) => page.evaluate(async (r) => {
    window.__quizReplies.push(r);
    const card = Array.from(document.querySelectorAll('[id^="q-card-"]')).find((c) => !c.querySelector('.quiz-option[disabled]'));
    const btn = card.querySelector('.quiz-option');
    btn.click();
    await new Promise((res) => setTimeout(res, 300));
    const fb = card.querySelector('[id$="-feedback"]');
    return {
      text: fb ? fb.textContent.trim() : '',
      green: card.querySelectorAll('.quiz-option.border-emerald-600').length,
      red: card.querySelectorAll('.quiz-option.border-rose-500').length,
      enabled: card.querySelectorAll('.quiz-option:not([disabled])').length
    };
  }, reply);
  const notFound = await probe({ ok: false, error: 'not_found' });
  check('a not_found answer reads as unchecked, not right or wrong', /could not be checked/i.test(notFound.text) && !notFound.green && !notFound.red && notFound.enabled > 0, notFound);
  const offline = await probe({ ok: false, error: 'timeout' });
  check('a network failure keeps the connection message', /connection/i.test(offline.text) && !offline.green && !offline.red, offline);
  const wrongNoKey = await probe({ ok: true, correct: false, correctIdx: null, note: '' });
  check('a wrong pick with no key from the server is never painted as the answer', wrongNoKey.green === 0 && wrongNoKey.red === 1, wrongNoKey);
  const noted = await page.evaluate(async () => {
    window.__quizReplies.push({ ok: true, correct: true, correctIdx: 0, note: '<img src=x onerror="window.__xss=1">Correct!' });
    const card = Array.from(document.querySelectorAll('[id^="q-card-"]')).find((c) => !c.querySelector('.quiz-option[disabled]'));
    card.querySelector('.quiz-option').click();
    await new Promise((res) => setTimeout(res, 300));
    return { img: !!card.querySelector('[id$="-feedback"] img'), xss: !!window.__xss, text: card.querySelector('[id$="-feedback"]').textContent };
  });
  check('a server note is shown as text', !noted.img && !noted.xss && noted.text.includes('<img'), noted);
  const retry = await page.evaluate(async () => {
    const btn = document.querySelector('[data-quiz-retry]');
    if (!btn) return { found: false };
    const card = btn.closest('[id^="q-card-"]');
    btn.click();
    return { found: true, enabled: card.querySelectorAll('.quiz-option:not([disabled])').length };
  });
  check('Try Again works without an inline handler', retry.found && retry.enabled > 0, retry);
  check('quiz probes raise no page errors', errors.filter((e) => !/x:1|ERR_|404|Failed to load resource/.test(e)).length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors, requests } = await open(10);
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  check('study.html carries no inline event handlers', !/\son(click|change|input|error|load|submit)=/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, '')));
  const toc = await page.evaluate(async () => {
    const btn = document.querySelector('[data-action="toc"]');
    const drawer = document.getElementById('toc-drawer');
    btn.click();
    await new Promise((r) => setTimeout(r, 350));
    const opened = !drawer.classList.contains('-translate-x-full');
    document.querySelector('#toc-drawer [data-action="toc"]').click();
    await new Promise((r) => setTimeout(r, 350));
    return { opened, closed: drawer.classList.contains('-translate-x-full') };
  });
  check('the syllabus button opens and closes the drawer', toc.opened && toc.closed, toc);
  const font = await page.evaluate(() => {
    const size = () => document.documentElement.style.getPropertyValue('--reading-font-size');
    document.querySelector('[data-action="font"][data-arg="-1"]').click();
    const before = size();
    document.querySelector('[data-action="font"][data-arg="1"]').click();
    const after = size();
    document.querySelector('[data-action="font"][data-arg="-1"]').click();
    return { before, after };
  });
  check('font size buttons work', font.before !== font.after, font);
  const theme = await page.evaluate(() => {
    const before = document.documentElement.getAttribute('data-theme') + '|' + document.body.className;
    document.querySelector('[data-action="theme"]').click();
    return before !== document.documentElement.getAttribute('data-theme') + '|' + document.body.className;
  });
  check('the theme button cycles the theme', theme);
  const weather = await page.evaluate(() => {
    document.querySelector('[data-action="weather"][data-arg="storm"]').click();
    return document.body.dataset.weather;
  });
  check('a weather preset button applies', weather === 'storm', weather);
  const certBefore = requests.some((u) => u.includes('js/study/certificate.js'));
  check('the certificate module is not loaded up front', !certBefore);
  const cert = await page.evaluate(async () => {
    const btn = document.getElementById('btn-download-certificate');
    if (!btn || btn.hidden) return { button: false };
    btn.click();
    for (let i = 0; i < 40 && document.getElementById('certificate-panel').hidden; i += 1) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return { button: true, open: !document.getElementById('certificate-panel').hidden, api: !!window.StudyCertificate };
  });
  check('the certificate loads on demand and opens', cert.button && cert.open && cert.api, cert);
  check('page controls raise no errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors, requests } = await open(1, {
    init: () => {
      try { delete window.HTMLCanvasElement.prototype.transferControlToOffscreen; } catch (e) { /* locked */ }
      window.HTMLCanvasElement.prototype.transferControlToOffscreen = undefined;
    },
    settle: 2500
  });
  const scene = await page.evaluate(() => ({ api: !!window.WeatherScene, weather: document.body.dataset.weather || '' }));
  check('without OffscreenCanvas the weather scene loads on the main thread', scene.api && requests.some((u) => u.includes('js/study/weather-scene.js')), scene);
  check('the main-thread weather fallback raises no errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall study page load checks passed');
process.exit(failures ? 1 : 0);
