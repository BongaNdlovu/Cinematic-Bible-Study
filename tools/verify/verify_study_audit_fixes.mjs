import { chromium } from 'playwright';
import { ensureServer, dismissConsent, signedInScript } from './_server.mjs';

const server = await ensureServer({ preferred: 8139, probe: '/study.html' });
const BASE = server.base;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch({ headless: true });

async function open(sheet, { view = 'scroll', seed = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript({ bookView: view }));
  await context.addInitScript((pairs) => {
    for (const [k, v] of Object.entries(pairs)) localStorage.setItem(k, v);
  }, seed);
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

const hidden = [];
for (const sheet of [0, 1, 7]) {
  const { context, page, errors } = await open(sheet, { view: 'book' });
  const r = await page.evaluate(() => ({
    inAscii: [...document.querySelectorAll('.chain-ascii .term-gloss')].map((b) => b.dataset.term),
    linked: document.querySelectorAll('#sheet-article .term-gloss').length
  }));
  hidden.push({ sheet, ...r });
  check(`sitting ${sheet} links no glossary term inside the hidden diagram text`, r.inAscii.length === 0 && r.linked > 0, r);
  check(`sitting ${sheet} raises no page errors`, errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(2, { view: 'scroll' });
  const ids = await page.evaluate(() => {
    const grads = [...document.querySelectorAll('radialGradient[id^="mm-glow-"]')].map((g) => g.id);
    const refs = [...document.querySelectorAll('circle[fill^="url(#mm-glow-"]')].map((c) => c.getAttribute('fill').slice(5, -1));
    return { grads, maps: document.querySelectorAll('.mm').length, unresolved: refs.filter((id) => !grads.includes(id)).length };
  });
  check('each mind map has its own glow gradients and every pulse finds one', ids.maps >= 2 && new Set(ids.grads).size === ids.grads.length && ids.unresolved === 0, { maps: ids.maps, gradients: ids.grads.length, unresolved: ids.unresolved });
  check('the mind map sitting raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page, errors } = await open(0, { view: 'scroll' });
  const r = await page.evaluate(async () => {
    const btn = document.querySelector('.cardmin-btn');
    if (!btn) return null;
    const before = btn.getAttribute('aria-expanded');
    btn.click();
    await new Promise((res) => setTimeout(res, 200));
    const after = btn.getAttribute('aria-expanded');
    btn.click();
    await new Promise((res) => setTimeout(res, 200));
    return { before, after, back: btn.getAttribute('aria-expanded') };
  });
  check('a minimised card says it is collapsed, and expanded again after', r && r.before === 'true' && r.after === 'false' && r.back === 'true', r);
  check('the card-minimise run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const { context, page } = await open(0, { view: 'scroll', seed: { daniel_theme_name_v1: 'paper' } });
  const theme = await page.evaluate(() => ({ paper: document.body.classList.contains('paper-mode'), saved: localStorage.getItem('daniel_theme_name_v1') }));
  check('the paper theme is restored on reload', theme.paper && theme.saved === 'paper', theme);
  await context.close();
}

{
  const { context, page, errors } = await open(0, { view: 'scroll' });
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const gate = window.QuizGate;
    const plan = { delay: 0, wrong: false };
    gate.verify = (sitting, q, chosen) => new Promise((res) => setTimeout(() => res({
      ok: true,
      correct: !plan.wrong,
      correctIdx: plan.wrong ? (Number(chosen) === 0 ? 1 : 0) : Number(chosen),
      note: ''
    }), plan.delay));
    if (!window.StudyTaskFlow || !window.StudyTaskFlow.open()) return { opened: false };
    await wait(400);
    const start = [...document.querySelectorAll('.tf-primary')].find((b) => b.textContent === 'Start');
    if (start) start.click();
    await wait(500);
    const stage = () => document.querySelector('.tf-stage');
    const option = () => stage() && stage().querySelector('.tf-step-question .quiz-option:not([disabled])');
    const next = () => document.querySelector('.tf-next');
    const back = () => document.querySelector('.tf-back');
    let guard = 0;
    while (!option() && guard < 6) { if (next() && !next().disabled) next().click(); await wait(400); guard += 1; }
    if (!option()) return { opened: true, firstQuestion: false };
    option().click();
    await wait(400);
    next().click();
    await wait(500);
    guard = 0;
    while (!option() && guard < 6) { if (next() && !next().disabled) next().click(); await wait(400); guard += 1; }
    const second = option();
    if (!second) return { opened: true, firstQuestion: true, secondQuestion: false };
    const card = second.closest('[id^="q-card-"]');
    const cardId = card && card.id;
    plan.delay = 900;
    plan.wrong = true;
    second.click();
    await wait(60);
    back().click();
    await wait(1600);
    const detached = !!(card && !document.contains(card));
    next().click();
    await wait(600);
    const shown = document.getElementById(cardId);
    return {
      opened: true,
      firstQuestion: true,
      secondQuestion: true,
      detachedWhileChecking: detached,
      retry: !!(shown && shown.querySelector('[data-quiz-retry]')),
      feedbackShown: !!(shown && shown.querySelector('[id$="-feedback"]:not(.hidden)'))
    };
  });
  check('answering, going Back while it is checked, and returning shows the result and Try Again', r && r.secondQuestion && r.retry && r.feedbackShown, r);
  check('the quiz run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall study audit-fix checks passed');
process.exit(failures ? 1 : 0);
