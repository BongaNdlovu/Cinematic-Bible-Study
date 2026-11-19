/* Regression suite for the 19 November audit follow-ups (P-09, B-30, B-23,
   B-25, B-13, B-27, B-29, B-37, B-32, P-05, B-17, B-18, B-19 and the two
   animation changes). Groups use a fresh browser each, matching the audit
   group scripts. Wired into run_browser_checks.mjs with a 12-minute budget. */
import { chromium } from 'playwright';
import { ensureServer, dismissConsent, signedInScript, webglFlags } from './_server.mjs';

const server = await ensureServer({ preferred: 8149, probe: '/study.html' });
const BASE = server.base;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

let browser = null;
async function relaunch(extraArgs = []) {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch({ headless: true, args: [...webglFlags(), ...extraArgs] });
}

async function studyPage(sheet, { completed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], initScripts = [], viewport } = {}) {
  const context = await browser.newContext({
    viewport: viewport || { width: 1440, height: 900 },
    reducedMotion: 'no-preference'
  });
  await context.addInitScript(signedInScript({ completedSheets: completed, bookView: 'scroll' }));
  for (const script of initScripts) await context.addInitScript(script);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/study.html?sheet=${sheet}&preview=full`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction((n) => {
    const a = document.getElementById('sheet-article');
    return a && a.getAttribute('data-sheet-index') === String(n) && a.children.length > 0;
  }, sheet, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const guide = document.getElementById('sitting-guide');
    if (guide && !guide.hidden) {
      const skip = document.getElementById('sitting-guide-skip');
      if (skip && !skip.hidden) skip.click();
      else guide.hidden = true;
    }
    const modal = document.getElementById('placement-modal');
    if (modal) modal.remove();
  });
  return { context, page, errors };
}

/* ---------- Group 1: study page (P-09, B-30, B-32, B-25, B-27, B-29, lap-beckon) ---------- */

const WEATHER_WORKER_SPY = `(() => {
  window.__workers = [];
  window.__weatherMsgs = [];
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(...args) {
      super(...args);
      window.__workers.push(String(args[0]));
      const orig = super.postMessage.bind(this);
      this.postMessage = (m, ...rest) => { window.__weatherMsgs.push(m); return orig(m, ...rest); };
    }
  };
})()`;

{
  await relaunch();
  const { context, page } = await studyPage(0, { initScripts: [WEATHER_WORKER_SPY] });
  const idle = await page.evaluate(() => ({
    workers: window.__workers.filter((u) => u.includes('weather-scene')).length,
    hidden: document.getElementById('weather-canvas').classList.contains('opacity-0')
  }));
  check('P-09: a fresh study page creates no weather worker and keeps the canvas hidden', idle.workers === 0 && idle.hidden, idle);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(400);
  const afterNoise = await page.evaluate(() => ({
    workers: window.__workers.filter((u) => u.includes('weather-scene')).length,
    hidden: document.getElementById('weather-canvas').classList.contains('opacity-0')
  }));
  check('P-09: resize and visibilitychange while idle never start the weather', afterNoise.workers === 0 && afterNoise.hidden, afterNoise);

  await page.click('[data-action="atmosphere"]');
  await page.waitForFunction(() => window.__workers.some((u) => u.includes('weather-scene')), null, { timeout: 15000 });
  const opened = await page.evaluate(() => ({
    workers: window.__workers.filter((u) => u.includes('weather-scene')).length,
    hidden: document.getElementById('weather-canvas').classList.contains('opacity-0'),
    runSent: window.__weatherMsgs.some((m) => m && m.run === true)
  }));
  check('P-09: opening the Atmosphere drawer spawns exactly one worker and starts it', opened.workers === 1 && !opened.hidden && opened.runSent, opened);

  await page.click('#pomo-dock [data-action="atmosphere"]');
  await page.waitForFunction(() => window.__weatherMsgs.some((m) => m && m.run === false), null, { timeout: 10000 });
  const closed = await page.evaluate(() => ({
    hidden: document.getElementById('weather-canvas').classList.contains('opacity-0'),
    workers: window.__workers.filter((u) => u.includes('weather-scene')).length
  }));
  check('P-09: closing the drawer with the timer idle stops the weather and re-hides the canvas', closed.hidden && closed.workers === 1, closed);

  await page.evaluate(() => window.startPomodoro());
  await page.waitForFunction(() => window.__weatherMsgs.some((m, i, a) => m && m.run === true && a.slice(0, i).some((p) => p && p.run === false)), null, { timeout: 10000 });
  const timerRun = await page.evaluate(() => document.getElementById('weather-canvas').classList.contains('opacity-0'));
  check('P-09: starting the focus timer with the drawer closed keeps the weather running', timerRun === false, { hidden: timerRun });
  await page.evaluate(() => window.pausePomodoro());
  await page.waitForFunction(() => window.__weatherMsgs.filter((m) => m && m.run === false).length >= 2, null, { timeout: 10000 });
  const paused = await page.evaluate(() => ({
    hidden: document.getElementById('weather-canvas').classList.contains('opacity-0'),
    workers: window.__workers.filter((u) => u.includes('weather-scene')).length
  }));
  check('P-09: pausing the timer with the drawer closed stops the weather, still one worker', paused.hidden && paused.workers === 1, paused);
  await context.close();
}

{
  const noOffscreen = () => {
    try { delete window.HTMLCanvasElement.prototype.transferControlToOffscreen; } catch (e) { /* locked */ }
    window.HTMLCanvasElement.prototype.transferControlToOffscreen = undefined;
    const origGet = window.HTMLCanvasElement.prototype.getContext;
    window.__paint = { clear: 0 };
    window.HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      const ctx = origGet.call(this, type, ...rest);
      if (!ctx || this.id !== 'weather-canvas') return ctx;
      return new Proxy(ctx, {
        get(target, prop) {
          if (prop === 'clearRect') return (...a) => { window.__paint.clear += 1; return target.clearRect(...a); };
          const v = target[prop];
          return typeof v === 'function' ? v.bind(target) : v;
        },
        set(target, prop, value) {
          target[prop] = value;
          return true;
        }
      });
    };
  };
  const { context, page } = await studyPage(0, { initScripts: [noOffscreen] });
  await page.click('[data-action="atmosphere"]');
  await page.waitForFunction(() => !!window.WeatherScene, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  const a = await page.evaluate(() => window.__paint.clear);
  await page.waitForTimeout(600);
  const b = await page.evaluate(() => window.__paint.clear);
  check('P-09: the main-thread fallback draws weather frames while the drawer is open', b > a, { first: a, second: b });
  await page.click('#pomo-dock [data-action="atmosphere"]');
  await page.waitForTimeout(700);
  const c = await page.evaluate(() => window.__paint.clear);
  await page.waitForTimeout(600);
  const d = await page.evaluate(() => window.__paint.clear);
  check('P-09: the main-thread fallback stops drawing when the drawer closes', c === d, { closed: c, after: d });
  await context.close();
}

{
  const { context, page, errors } = await studyPage(2);
  await page.click('[data-instrument="scripture"]');
  await page.waitForSelector('.scripture-scroll', { timeout: 20000 });
  const r = await page.evaluate(async () => {
    const root = document.getElementById('scripture-root');
    const box = root.querySelector('.scripture-scroll');
    box.scrollTop = 250;
    await new Promise((res) => setTimeout(res, 100));
    const before = root.querySelector('.scripture-scroll').scrollTop;
    const mark = root.querySelector('.strong-mark');
    const label = mark && mark.getAttribute('data-strong');
    if (!mark) return { before, mark: false };
    mark.click();
    await new Promise((res) => setTimeout(res, 250));
    const afterOpen = root.querySelector('.scripture-scroll').scrollTop;
    const close = root.querySelector('[data-strong-close]');
    if (close) close.click();
    await new Promise((res) => setTimeout(res, 250));
    const active = document.activeElement;
    return {
      mark: true,
      before, afterOpen,
      afterClose: root.querySelector('.scripture-scroll').scrollTop,
      dockClosed: !root.querySelector('#strong-dock.is-open'),
      focusBack: !!(active && active.classList && active.classList.contains('strong-mark') && active.getAttribute('data-strong') === label)
    };
  });
  check('B-30: opening a Strong’s word keeps the scripture scroll at its place', r.mark && r.before >= 240 && r.afterOpen >= 240, r);
  check('B-30: closing the dock keeps the scroll and hands focus back to the word', r.afterClose >= 240 && r.focusBack, r);
  check('the Strong’s run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page } = await studyPage(0);
  await page.click('[data-action="atmosphere"]');
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const off = document.getElementById('weather-btn-off');
    off.click();
    await new Promise((res) => setTimeout(res, 150));
    const afterOff = {
      pressed: off.getAttribute('aria-pressed'),
      tint: off.classList.contains('text-amber-600'),
      layout: off.classList.contains('mt-2') && off.classList.contains('w-full'),
      others: ['quiet', 'building', 'storm', 'sunshine', 'auto'].every((id) => document.getElementById('weather-btn-' + id).getAttribute('aria-pressed') === 'false')
    };
    const storm = document.getElementById('weather-btn-storm');
    storm.click();
    await new Promise((res) => setTimeout(res, 150));
    afterOff.cleared = !off.classList.contains('text-amber-600') && off.getAttribute('aria-pressed') === 'false';
    afterOff.layoutHeld = off.classList.contains('mt-2') && off.classList.contains('w-full');
    return afterOff;
  });
  check('B-32: the Off weather pill keeps its layout classes while toggling state', r.layout && r.layoutHeld && r.pressed === 'true' && r.tint, r);
  check('B-32: picking a preset clears the Off state without touching the layout', r.cleared && r.others, r);
  await context.close();
}

{
  const { context, page } = await studyPage(0, { completed: [] });
  await page.evaluate(() => window.StudyTaskFlow.open());
  await page.waitForSelector('.tf-root.is-open [data-tf="start"]', { timeout: 10000 });
  const r = await page.evaluate(async () => {
    const root = document.querySelector('.tf-root');
    const start = root.querySelector('[data-tf="start"]');
    start.click();
    setTimeout(() => start.click(), 40);
    await new Promise((res) => setTimeout(res, 500));
    const steps = root.querySelectorAll('.tf-stage .tf-step');
    const moved = root.querySelector('.tf-stage .tf-step .tf-body');
    return {
      oneCard: steps.length === 1,
      movedPreserved: !!moved && moved.children.length > 0,
      counter: (root.querySelector('.tf-counter') || {}).textContent || ''
    };
  });
  check('B-25: a rapid double Next within 50 ms leaves exactly one step with its moved card', r.oneCard && r.movedPreserved && /Question 1/.test(r.counter), r);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript({ completedSheets: [] }));
  await context.addInitScript(`try {
    const m = JSON.parse(localStorage.getItem('baQaMockSession') || '{}');
    m.moderator = true;
    localStorage.setItem('baQaMockSession', JSON.stringify(m));
  } catch (e) {}`);
  await context.route(/\/js\/pages\/study\/quiz-gate\.js/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.QuizGate = { verify: (sheet, q, opt) => Promise.resolve({ ok: true, correct: true, correctIdx: opt, note: "qa mock" }) };'
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction((n) => {
    const a = document.getElementById('sheet-article');
    return a && a.getAttribute('data-sheet-index') === String(n) && a.children.length > 0;
  }, 0, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const guide = document.getElementById('sitting-guide');
    if (guide && !guide.hidden) {
      const skip = document.getElementById('sitting-guide-skip');
      if (skip && !skip.hidden) skip.click();
      else guide.hidden = true;
    }
    const modal = document.getElementById('placement-modal');
    if (modal) modal.remove();
  });

  const end = await page.evaluate(async () => {
    for (let round = 0; round < 20; round += 1) {
      let answered = 0;
      for (let i = 0; i < 14; i += 1) {
        const btn = document.getElementById(`q-${i}-opt-0`);
        if (btn && !btn.disabled) { btn.click(); answered += 1; }
      }
      if (!answered) break;
      await new Promise((res) => setTimeout(res, 250));
    }
    const guide = document.getElementById('sitting-guide');
    const shown = !!(guide && !guide.hidden && guide.classList.contains('is-end'));
    if (!shown) return { shown, plates: [...document.querySelectorAll('.checkpoint-plate')].map((p) => p.getAttribute('data-checkpoint-passed')) };
    await new Promise((res) => setTimeout(res, 120));
    window.scrollTo(0, 0);
    guide.hidden = true;
    await new Promise((res) => setTimeout(res, 700));
    return { shown, scrollY: window.scrollY };
  });
  check('B-25: closing the end spotlight stops the deferred spotlight updates from stealing the scroll', end.shown && end.scrollY < 60, end);

  const flush = await page.evaluate(() => {
    window.StudyTaskFlow.open();
    const open = window.StudyTaskFlow.isOpen();
    window.navigateSheet(1);
    return {
      open,
      flushed: !window.StudyTaskFlow.isOpen() && document.querySelector('.tf-root').hidden,
      veilGone: !document.documentElement.classList.contains('tf-open')
    };
  });
  check('B-25: switching sittings while the TaskFlow is open closes it synchronously', flush.open && flush.flushed && flush.veilGone, flush);

  const midLeave = await page.evaluate(async () => {
    window.StudyTaskFlow.open();
    await new Promise((res) => setTimeout(res, 300));
    window.StudyTaskFlow.close();
    const leaving = document.querySelector('.tf-root').classList.contains('is-leaving');
    window.navigateSheet(-1);
    const root = document.querySelector('.tf-root');
    return {
      leaving,
      flushed: root.hidden && !root.classList.contains('is-leaving'),
      veilGone: !document.documentElement.classList.contains('tf-open')
    };
  });
  check('B-25: switching sittings during the 460 ms close animation finishes the close at once', midLeave.leaving && midLeave.flushed && midLeave.veilGone, midLeave);
  check('the moderator study run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await studyPage(2);
  await page.waitForSelector('figure[data-diagram="s2-4"] .mm .mm-hud [data-mm-fs]', { timeout: 20000 });
  await page.evaluate(() => {
    document.querySelector('figure[data-diagram="s2-4"] .mm .mm-hud [data-mm-fs]').click();
  });
  await page.waitForFunction(() => {
    const host = document.querySelector('figure[data-diagram="s2-4"] .mm.is-full');
    return !!(host && document.documentElement.classList.contains('mm-fullscreen-open') && host.contains(document.activeElement));
  }, null, { timeout: 10000 });
  const readMm = () => page.evaluate(() => ({
    mmOpen: document.documentElement.classList.contains('mm-fullscreen-open'),
    hostFull: !!document.querySelector('figure[data-diagram="s2-4"] .mm.is-full')
  }));
  await page.evaluate(() => { document.getElementById('certificate-panel').hidden = false; });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const heldCert = await readMm();
  check('B-27: Escape in fullscreen mind map does not exit while #certificate-panel is open', heldCert.mmOpen && heldCert.hostFull, heldCert);
  await page.evaluate(() => {
    document.getElementById('certificate-panel').hidden = true;
    document.getElementById('infographic-modal').hidden = false;
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const heldInfo = await readMm();
  check('B-27: Escape in fullscreen mind map does not exit while a later DOM modal (#infographic-modal) is open', heldInfo.mmOpen && heldInfo.hostFull, heldInfo);
  await page.evaluate(() => { document.getElementById('infographic-modal').hidden = true; });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const exited = await readMm();
  check('B-27: Escape exits fullscreen mind map once modals close', !exited.mmOpen && !exited.hostFull, exited);
  check('the mind-map Escape guard run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await studyPage(10);
  const opened = await page.evaluate(() => {
    for (const btn of document.querySelectorAll('[data-chain-fs]')) {
      const figure = btn.closest('figure');
      if (figure && figure.querySelector('.chain-cite[data-cite-src]')) {
        btn.click();
        return figure.getAttribute('data-diagram');
      }
    }
    return null;
  });
  await page.waitForFunction(() => document.documentElement.classList.contains('dfx-open'), null, { timeout: 10000 }).catch(() => {});
  const armed = await page.evaluate(() => document.documentElement.classList.contains('dfx-open'));
  check('B-29: a diagram with a citation chip opened fullscreen', !!opened && armed, { opened, armed });
  await page.locator('figure.is-full .chain-cite[data-cite-src]').first().click({ timeout: 10000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('dfx-cite-open'), null, { timeout: 10000 }).catch(() => {});
  const r = await page.evaluate(() => ({
    panelOpen: document.documentElement.classList.contains('dfx-cite-open'),
    openerIsChip: !!(document.activeElement && document.activeElement.classList.contains('chain-cite'))
  }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    closed: !document.documentElement.classList.contains('dfx-cite-open'),
    layerHeld: document.documentElement.classList.contains('dfx-open'),
    focusBack: !!(document.activeElement && document.activeElement.classList.contains('chain-cite'))
  }));
  check('B-29: Escape in the fullscreen diagram closes the reference panel, not the layer', armed && r.panelOpen && after.closed && after.layerHeld, { armed, ...r, ...after });
  check('B-29: focus returns to the citation chip that opened the panel', r.openerIsChip && after.focusBack, { ...r, ...after });
  check('the fullscreen reference run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript({ completedSheets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], bookView: 'scroll' }));
  await context.addInitScript(`try { localStorage.removeItem('daniel_audio_play_hint_v1'); } catch (e) {}`);
  const page = await context.newPage();
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForSelector('[data-lap-play]', { timeout: 20000 });
  const r = await page.evaluate(async () => {
    const btn = document.querySelector('[data-lap-play]');
    const section = document.getElementById('lesson-audio');
    if (section) section.hidden = false;
    btn.classList.add('is-beckoning');
    await new Promise((res) => setTimeout(res, 300));
    const style = (sel) => getComputedStyle(btn, sel);
    btn.scrollIntoView({ block: 'center' });
    await new Promise((res) => setTimeout(res, 400));
    const onscreen = {
      off: btn.classList.contains('is-offscreen'),
      before: style('::before').animationPlayState,
      after: style('::after').animationPlayState
    };
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((res) => setTimeout(res, 400));
    const offscreen = {
      off: btn.classList.contains('is-offscreen'),
      before: style('::before').animationPlayState,
      after: style('::after').animationPlayState
    };
    return { onscreen, offscreen };
  });
  check('lap-beckon: the hint rings run while the play button is on screen', !r.onscreen.off && r.onscreen.before === 'running' && r.onscreen.after === 'running', r.onscreen);
  check('lap-beckon: the hint rings pause while the play button is scrolled offscreen', r.offscreen.off && r.offscreen.before === 'paused' && r.offscreen.after === 'paused', r.offscreen);
  await context.close();
}

/* ---------- Group 2: account page (accept double save, acct-pulse) ---------- */

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(`(() => {
    let real;
    Object.defineProperty(window, 'BAJourney', {
      configurable: true,
      get() { return real; },
      set(value) {
        real = value;
        if (value) { value.__accepts = 0; const orig = value.acceptTerms.bind(value); value.acceptTerms = () => { value.__accepts += 1; return orig(); }; }
      }
    });
  })()`);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/account.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.click('#account-accept', { timeout: 15000 });
  await page.waitForTimeout(600);
  const accepts = await page.evaluate(() => (window.BAJourney && window.BAJourney.__accepts) || 0);
  check('accepting the terms on Account calls acceptTerms exactly once', accepts === 1, { accepts, errors: errors.slice(0, 2) });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript({ completedSheets: [0, 1, 2] }));
  const page = await context.newPage();
  await page.goto(`${BASE}/account.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForSelector('.acct-vol.is-next a', { timeout: 20000 });
  const r = await page.evaluate(() => {
    const vol = document.querySelector('.acct-vol.is-next');
    const a = vol.querySelector('a');
    return {
      linkAnim: getComputedStyle(a).animationName,
      pulseOnAfter: getComputedStyle(vol, '::after').animationName,
      afterOpacityKeyframes: [...document.styleSheets].some((s) => {
        try { return [...s.cssRules].some((rule) => rule.cssText && rule.cssText.includes('acct-pulse') && rule.cssText.includes('opacity')); } catch (e) { return false; }
      })
    };
  });
  check('acct-pulse: the link itself no longer runs the pulse animation', r.linkAnim === 'acct-vol-in', r);
  check('acct-pulse: the pulse is a composited opacity crossfade on ::after', r.pulseOnAfter === 'acct-pulse' && r.afterOpacityKeyframes, r);
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await reduced.addInitScript(signedInScript({ completedSheets: [0, 1, 2] }));
  const rpage = await reduced.newPage();
  await rpage.goto(`${BASE}/account.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(rpage);
  await rpage.waitForSelector('.acct-vol.is-next a', { timeout: 20000 });
  const rr = await rpage.evaluate(() => {
    const vol = document.querySelector('.acct-vol.is-next');
    return {
      linkAnim: getComputedStyle(vol.querySelector('a')).animationName,
      afterAnim: getComputedStyle(vol, '::after').animationName,
      afterTransition: getComputedStyle(vol, '::after').transitionProperty
    };
  });
  check('acct-pulse: reduced motion silences both the link and the ::after pulse', rr.linkAnim === 'none' && rr.afterAnim === 'none', rr);
  await reduced.close();
}

/* ---------- Group 3: map page (B-37) ---------- */

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript());
  const page = await context.newPage();
  await page.goto(`${BASE}/map.html?year=y605`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForSelector('.cmap-border', { timeout: 30000 });
  await page.waitForTimeout(2500);
  const widths = await page.evaluate(async () => {
    const read = () => [...document.querySelectorAll('.cmap-border')].map((p) => {
      const attr = parseFloat(p.getAttribute('stroke-width') || '');
      return Number.isFinite(attr) ? attr : parseFloat(getComputedStyle(p).strokeWidth) || 0;
    });
    const before = read().filter((w) => w === 3.2).length;
    const compare = document.getElementById('cmap-compare');
    compare.value = '50';
    compare.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 250));
    const after = read();
    return {
      before,
      strong: after.filter((w) => w === 3.2).length,
      total: after.length
    };
  });
  check('B-37: the active empire keeps its 3.2 border after adjusting the compare slider', widths.before >= 1 && widths.strong >= 1, widths);
  const zero = await page.evaluate(async () => {
    const compare = document.getElementById('cmap-compare');
    compare.value = '0';
    compare.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 250));
    return [...document.querySelectorAll('.cmap-border')].map((p) => p.style.pointerEvents);
  });
  check('B-37: at compare 0 the border paths stop taking pointer events', zero.length > 0 && zero.every((p) => p === 'none'), zero.slice(0, 4));
  const search = await page.evaluate(async () => {
    const input = document.querySelector('.cmap-search input');
    const hits = document.querySelector('.cmap-search-hits');
    if (!input || !hits) return { found: false };
    input.value = 'babylon';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 150));
    const open = !hits.hidden;
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 100));
    return { found: open, closedOutside: hits.hidden };
  });
  check('B-37: a pointerdown outside the search box closes the search hits', search.found && search.closedOutside, search);
  await context.close();
}

/* ---------- Group 4: gallery (shortcuts, B-17, B-18, B-19) ---------- */

const THREE_DISPOSE_SPY = (classId) => `;
if (typeof ${classId} !== 'undefined' && ${classId}.prototype && ${classId}.prototype.dispose) {
  const origPmrem = ${classId}.prototype.dispose;
  ${classId}.prototype.dispose = function () { window.__pmremDisposes = (window.__pmremDisposes || 0) + 1; return origPmrem.call(this); };
}`;

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript());
  const page = await context.newPage();
  await page.goto(`${BASE}/gallery.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => !!document.querySelector('.artifact-card-item.active'), null, { timeout: 60000 });
  const title = await page.evaluate(() => document.getElementById('hero-main-title').textContent);
  const labClosed = () => page.evaluate(() => !document.getElementById('study-lab-drawer').classList.contains('open'));
  await page.keyboard.press('Control+f');
  await page.keyboard.press('Control+l');
  await page.keyboard.press('Meta+1');
  await page.keyboard.press('Alt+ArrowRight');
  await page.waitForTimeout(400);
  const untouched = await page.evaluate((t) => ({
    searchFocused: document.activeElement === document.getElementById('search-input'),
    lab: document.getElementById('study-lab-drawer').classList.contains('open'),
    title: document.getElementById('hero-main-title').textContent
  }), title);
  check('gallery: Ctrl+F, Ctrl+L, Meta+1 and Alt+ArrowRight are left to the browser', !untouched.searchFocused && !untouched.lab && untouched.title === title, untouched);
  await page.keyboard.press('/');
  await page.waitForTimeout(200);
  const slash = await page.evaluate(() => document.activeElement === document.getElementById('search-input'));
  check('gallery: the bare / shortcut still focuses search, proving the guard is not a blanket', slash, { slash });
  check('the lab drawer stays closed through the shortcut run', await labClosed(), null);
  await context.close();
}

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(signedInScript());
  const lionRequests = [];
  let markInFlight = null;
  let releaseLion = null;
  const lionInFlight = new Promise((res) => { markInFlight = res; });
  const lionGate = new Promise((res) => { releaseLion = res; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('request', (req) => {
    const p = new URL(req.url()).pathname;
    if (/\/models\/lion.*\.glb$/.test(p)) lionRequests.push(p);
  });
  await context.route(/\/vendor\/three\/examples\/jsm\/loaders\/GLTFLoader\.js/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + `;
      const _gltfLoad = GLTFLoader.prototype.load;
      GLTFLoader.prototype.load = function (url, ...rest) {
        if (/lion.*\\.glb$/.test(String(url))) window.__lionLoads = (window.__lionLoads || 0) + 1;
        return _gltfLoad.call(this, url, ...rest);
      };`;
    await route.fulfill({ response: res, body, headers: Object.assign({}, res.headers(), { 'content-length': String(Buffer.byteLength(body)) }) });
  });
  await context.route(/\/models\/lion(\.[a-f0-9]{12})?\.glb/, async (route) => {
    markInFlight();
    await lionGate;
    await route.continue();
  });
  await page.goto(`${BASE}/gallery.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => !!document.querySelector('.artifact-card-item.active'), null, { timeout: 60000 });
  await page.waitForSelector('.artifact-card-item[data-asset="lion"]', { timeout: 15000 });
  const lionDone = page.waitForResponse((res) => /\/models\/lion.*\.glb$/.test(new URL(res.url()).pathname), { timeout: 30000 });
  await page.click('.artifact-card-item[data-asset="lion"]');
  await lionInFlight;
  await page.waitForFunction(() => document.querySelector('.artifact-card-item[data-asset="lion"].active'), null, { timeout: 10000 });
  await page.click('.artifact-card-item[data-asset="bear"]');
  await page.waitForFunction(() => document.querySelector('.artifact-card-item[data-asset="bear"].active'), null, { timeout: 10000 });
  await page.click('.artifact-card-item[data-asset="lion"]');
  await page.waitForFunction(() => document.querySelector('.artifact-card-item[data-asset="lion"].active'), null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const inFlightCount = lionRequests.length;
  const lionLoads = await page.evaluate(() => window.__lionLoads || 0);
  releaseLion();
  await lionDone;
  await page.waitForTimeout(400);
  check('B-17: lion → bear → lion while the lion is still downloading starts exactly one GLTFLoader and network request', lionLoads === 1 && inFlightCount === 1 && lionRequests.length === 1 && errors.length === 0, { lionLoads, inFlightCount, count: lionRequests.length, errors: errors.slice(0, 2) });
  await context.close();
}

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript());
  await context.route(/\/vendor\/three\/examples\/jsm\/environments\/RoomEnvironment\.js/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + `;
      const _envDispose = RoomEnvironment.prototype.dispose;
      RoomEnvironment.prototype.dispose = function () { window.__envDisposes = (window.__envDisposes || 0) + 1; return _envDispose.call(this); };`;
    await route.fulfill({ response: res, body, headers: Object.assign({}, res.headers(), { 'content-length': String(Buffer.byteLength(body)) }) });
  });
  await context.route(/\/vendor\/three\/build\/three\.module(\.[a-f0-9]{12})?\.min\.js/, async (route) => {
    const res = await route.fetch();
    const src = await res.text();
    const alias = /([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+PMREMGenerator\b/.exec(src);
    const body = src + (alias ? THREE_DISPOSE_SPY(alias[1]) : '');
    await route.fulfill({ response: res, body, headers: Object.assign({}, res.headers(), { 'content-length': String(Buffer.byteLength(body)) }) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/gallery.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => (window.__envDisposes || 0) >= 1 && (window.__pmremDisposes || 0) >= 1, null, { timeout: 60000 }).catch(() => {});
  const r = await page.evaluate(() => ({ env: window.__envDisposes || 0, pmrem: window.__pmremDisposes || 0 }));
  check('B-18: the environment map and PMREM generator are disposed at startup', r.env >= 1 && r.pmrem >= 1, { ...r, errors: errors.slice(0, 2) });
  await context.close();
}

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.addInitScript(signedInScript());
  const page = await context.newPage();
  await page.goto(`${BASE}/gallery.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => !!document.querySelector('.artifact-card-item.active') && !!document.querySelector('canvas'), null, { timeout: 60000 });
  const title = await page.evaluate(() => document.getElementById('hero-main-title').textContent);
  const taps = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const spots = [
      [rect.left + 12, rect.top + rect.height * 0.35],
      [rect.left + rect.width - 12, rect.top + rect.height * 0.5],
      [rect.left + 20, rect.top + rect.height * 0.7]
    ];
    for (const [x, y] of spots) {
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: x, clientY: y }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, buttons: 0, clientX: x, clientY: y }));
      await new Promise((res) => setTimeout(res, 350));
    }
    return { title: document.getElementById('hero-main-title').textContent };
  });
  check('B-19: tapping across hidden wall-frame coordinates in portrait never switches the exhibit', taps.title === title, { ...taps, expected: title });
  await context.close();
}

/* ---------- Group 5: shelf (P-05, B-23) ---------- */

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => window.__shelf && window.__shelf.books && window.__shelf.books.length === 11, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const p05 = await page.evaluate(() => {
    const b = window.__shelf.books[0];
    return { orm: !!b.spineMat.roughnessMap, same: b.spineMat.roughnessMap === b.spineMat.metalnessMap };
  });
  check('P-05: the shelf spine uses one shared ORM texture for roughness and metalness', p05.orm && p05.same, p05);

  await page.evaluate(() => window.__shelf.api.pull(0));
  await page.waitForFunction(() => !!window.__shelf.books[0].hi, null, { timeout: 30000 });
  const locked = await page.evaluate(() => {
    const b = window.__shelf.books[0];
    return {
      hi: !!b.hi,
      lockTint: b.lockTint,
      spine: b.spineMat.color.r,
      hiFront: b.hi ? b.hi.front.color.r : null
    };
  });
  check('B-23: a signed-out shelf builds locked volumes tinted at 0.62 with a pre-warmed highlight', locked.hi && locked.lockTint === 0.62 && locked.hiFront === 0.62, locked);

  await page.evaluate(() => {
    try {
      const j = JSON.parse(localStorage.getItem('baJourney') || '{}');
      j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) {}
    const u = { id: 'qa-mock-user-001', email: 'qa.auditor@example.com' };
    window.ScrollAuth.getUser = () => u;
    window.dispatchEvent(new Event('ba-progress-synced'));
  });
  await page.waitForFunction(() => window.__shelf.books[0].lockTint === 1, null, { timeout: 15000 });
  const unlocked = await page.evaluate(() => {
    const b = window.__shelf.books[0];
    return { lockTint: b.lockTint, spine: b.spineMat.color.r, hiFront: b.hi.front.color.r, hiBack: b.hi.back.color.r };
  });
  check('B-23: after the progress-synced refresh the volume, spine and highlight all re-tint to 1', unlocked.spine === 1 && unlocked.hiFront === 1 && unlocked.hiBack === 1, unlocked);

  const pulls = await page.evaluate(async () => {
    const shelf = window.__shelf;
    shelf.api.put();
    for (let i = 0; i < 600 && document.getElementById('shelf-stage').classList.contains('is-open'); i += 1) shelf.advance(1 / 60);
    await new Promise((res) => setTimeout(res, 300));
    const stage = document.getElementById('shelf-stage');
    const gl = document.getElementById('gl') || document.querySelector('canvas');
    const rect = gl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const openAt = () => stage.classList.contains('is-open');
    const wasOpen = openAt();
    gl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 4, pointerType: 'mouse', button: 2, buttons: 2, clientX: cx, clientY: cy }));
    gl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 4, pointerType: 'mouse', button: 2, buttons: 0, clientX: cx, clientY: cy }));
    await new Promise((res) => setTimeout(res, 400));
    const rightClick = openAt();
    gl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: cx - 40, clientY: cy }));
    gl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 6, pointerType: 'touch', isPrimary: false, button: 0, buttons: 1, clientX: cx + 40, clientY: cy }));
    await new Promise((res) => setTimeout(res, 120));
    gl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5, pointerType: 'touch', isPrimary: true, button: 0, buttons: 0, clientX: cx - 40, clientY: cy }));
    gl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 6, pointerType: 'touch', isPrimary: false, button: 0, buttons: 0, clientX: cx + 40, clientY: cy }));
    await new Promise((res) => setTimeout(res, 400));
    return { wasOpen, rightClick, pinch: openAt() };
  });
  check('B-23: a right-click never pulls a volume', pulls.wasOpen === pulls.rightClick, pulls);
  check('B-23: a two-finger touch without a drag never pulls a volume', pulls.wasOpen === pulls.pinch, pulls);
  check('the shelf run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => window.__shelf && window.__shelf.books && window.__shelf.books.length === 11, null, { timeout: 90000 });
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.__shelf.advance(2));
  await page.waitForFunction(() => window.__shelf.state().rafId === 0, null, { timeout: 90000 });
  await page.evaluate(() => {
    const r = window.__shelf.renderer;
    window.__renders = 0;
    const orig = r.render.bind(r);
    r.render = (...a) => { window.__renders += 1; return orig(...a); };
  });
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.waitForTimeout(800);
  const renders = await page.evaluate(() => window.__renders);
  check('B-23: a viewport resize while the reduced-motion shelf is idle redraws once', renders >= 1, { renders });
  await context.close();
}

await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall audit follow-up checks passed');
process.exit(failures ? 1 : 0);
