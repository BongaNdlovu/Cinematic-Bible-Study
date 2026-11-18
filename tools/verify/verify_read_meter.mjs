import { chromium } from 'playwright';
import { ensureServer, dismissConsent, signedInScript } from './_server.mjs';

const server = await ensureServer({ preferred: 8131, probe: '/study.html' });
const BASE = server.base;
const STEPS = [0, 0.25, 0.5, 0.75, 1, 0.6, 0.3, 0];

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(sheet, { view = 'book', viewport = { width: 1440, height: 900 }, strip = '' } = {}) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(signedInScript({ bookView: view }));
  if (strip) {
    await context.route('**/study.html*', async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(strip, '');
      await route.fulfill({ response, body });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.goto(`${BASE}/study.html?sheet=${sheet}&preview=full`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction((n) => {
    const a = document.getElementById('sheet-article');
    return a && a.getAttribute('data-sheet-index') === String(n) && a.children.length > 0;
  }, sheet, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const g = document.getElementById('sitting-guide');
    if (g) g.hidden = true;
    const m = document.getElementById('placement-modal');
    if (m) m.remove();
  });
  return { context, page, errors };
}

function readMeter(page) {
  return page.evaluate(() => {
    const m = document.getElementById('read-meter');
    if (!m) return null;
    return {
      pct: Number(m.getAttribute('aria-valuenow')),
      shown: m.querySelector('.read-meter-pct').textContent,
      label: m.querySelector('.read-meter-label').textContent,
      listening: m.classList.contains('is-listening'),
      inSpine: !!m.closest('#sitting-spine'),
    };
  });
}

async function scrollTo(page, fraction) {
  await page.evaluate((f) => {
    const main = document.querySelector('main.sitting-main');
    const end = main.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    window.scrollTo({ top: Math.max(0, end * f), behavior: 'instant' });
  }, fraction);
  await page.waitForTimeout(120);
  return readMeter(page);
}

async function scrollRun(page) {
  const seen = [];
  for (const f of STEPS) seen.push((await scrollTo(page, f)).pct);
  return seen;
}

function risesThenFalls(seen) {
  const peak = STEPS.indexOf(1);
  const up = seen.slice(0, peak + 1).every((v, i, a) => i === 0 || v > a[i - 1]);
  const down = seen.slice(peak).every((v, i, a) => i === 0 || v < a[i - 1]);
  return up && down && seen[0] === 0 && seen[seen.length - 1] === 0;
}

async function bookTurns(page) {
  await page.evaluate(() => document.querySelector('.br-book').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(150);
  const start = await readMeter(page);
  const moved = await page.evaluate(() => window.BookReader.goTo(1, { instant: true, quiet: true }));
  await page.waitForTimeout(150);
  const forward = await readMeter(page);
  await page.evaluate(() => window.BookReader.goTo(0, { instant: true, quiet: true }));
  await page.waitForTimeout(150);
  const back = await readMeter(page);
  return { moved, start: start.pct, forward: forward.pct, back: back.pct };
}

for (let sheet = 0; sheet <= 10; sheet += 1) {
  const { context, page, errors } = await open(sheet);
  const top = await scrollTo(page, 0);
  const readTime = await page.evaluate(() => document.getElementById('sheet-read-time').textContent.trim());
  check(`sitting ${sheet} meter sits in the sitting strip and shows its read time`, top && top.inSpine && top.label === readTime && /^\d+ min read$/.test(top.label), { top, readTime });
  check(`sitting ${sheet} starts at 0%`, top && top.pct === 0 && top.shown === '0%', top);
  const seen = await scrollRun(page);
  check(`sitting ${sheet} book view rises with scrolling down and falls with scrolling up`, risesThenFalls(seen), seen);
  const turns = await bookTurns(page);
  check(`sitting ${sheet} a page turn forward raises it and back lowers it`, turns.moved && turns.forward > turns.start && turns.back === turns.start, turns);
  const tasks = await page.evaluate(() => {
    const s = window.StudyTasks.snapshot();
    return s.questions.filter((q) => !q.done).length + (s.workbench && !s.workbench.done ? 1 : 0);
  });
  const end = await scrollTo(page, 1);
  check(`sitting ${sheet} stays under 100% while ${tasks} task(s) are unanswered`, tasks > 0 ? end.pct < 100 : end.pct === 100, { tasks, end: end.pct });
  check(`sitting ${sheet} has no page errors`, errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(3, { view: 'scroll' });
  const book = await page.evaluate(() => window.BookReader.isActive());
  const seen = await scrollRun(page);
  check('scroll view rises with scrolling down and falls with scrolling up', !book && risesThenFalls(seen), { book, seen });
  check('scroll view has no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(0);
  await scrollTo(page, 0.1);
  const playing = await page.evaluate(async () => {
    const p = document.getElementById('lesson-audio-player');
    p.muted = true;
    if (!p.getAttribute('src')) return { src: false };
    p.load();
    await new Promise((resolve) => {
      if (p.readyState >= 1) resolve();
      else p.addEventListener('loadedmetadata', resolve, { once: true });
    });
    p.currentTime = p.duration / 2;
    await p.play();
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { src: true, share: Math.round((p.currentTime / p.duration) * 100), minutes: Math.max(1, Math.round(p.duration / 60)) };
  });
  const during = await readMeter(page);
  check('while the audio plays the meter follows the audio and says min listen', playing.src && during.listening && Math.abs(during.pct - playing.share) <= 1 && during.label === playing.minutes + ' min listen', { playing, during });
  await page.evaluate(() => document.getElementById('lesson-audio-player').pause());
  await page.waitForTimeout(150);
  const after = await readMeter(page);
  check('after a pause it goes back to the reading position and min read', !after.listening && /min read$/.test(after.label), after);
  check('listening raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(0, { viewport: { width: 375, height: 812 } });
  const fit = await page.evaluate(() => {
    const m = document.getElementById('read-meter').getBoundingClientRect();
    return { right: Math.round(m.right), width: Math.round(m.width), page: document.documentElement.scrollWidth, view: window.innerWidth };
  });
  check('on a 375px phone the meter fits with no sideways scroll', fit.width > 0 && fit.right <= fit.view && fit.page <= fit.view, fit);
  const seen = await scrollRun(page);
  check('on a phone it rises and falls with scrolling', risesThenFalls(seen), seen);
  check('the phone run has no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page } = await open(0);
  const old = await page.evaluate(() => !!document.getElementById('progress-bar'));
  check('the old course-position bar is gone', !old);
  await context.close();
}

{
  const strip = '<span class="read-meter-fill"></span>';
  const { context, page, errors } = await open(0, { strip });
  const state = await page.evaluate(() => ({
    fill: !!document.querySelector('#read-meter .read-meter-fill'),
    meter: !!document.getElementById('read-meter'),
  }));
  await scrollTo(page, 0.5);
  check('a meter missing one of its parts stays still and raises no page errors', state.meter && !state.fill && errors.length === 0, { state, errors: errors.slice(0, 3) });
  await context.close();
}

await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall read meter checks passed');
process.exit(failures ? 1 : 0);
