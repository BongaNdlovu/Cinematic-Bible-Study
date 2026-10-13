/*
 * Reproduces the two artwork races in the story reader by holding a diagram
 * image on the wire, so the defect is deterministic instead of depending on a
 * cold cache:
 *
 *   A. while the next movement's image is in flight, the overlay must still be
 *      showing the previous movement's artwork (never the bare dark ground);
 *   B. when a held request finally resolves after the reader has moved on, the
 *      stale handler must not reveal the wrong movement's image, and only one
 *      layer may be current.
 *
 * Usage: node tools/verify/verify_story_layers.mjs --base=http://127.0.0.1:8000
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);
const BASE = String(args.base || 'http://127.0.0.1:8000').replace(/\/$/, '');
const OUT = path.join('qa', 'proofs', 'story-layers');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

const layers = () => [...document.querySelectorAll('body > .story-read .story-read-photo')].map((l) => ({
  src: (l.getAttribute('src') || '').split('/').pop(),
  opacity: Number(getComputedStyle(l).opacity).toFixed(2),
  z: Number(getComputedStyle(l).zIndex) || 0,
  current: l.classList.contains('is-current'),
  transition: l.style.transition || '(css)',
}));

const summary = { base: BASE, blankWhileLoading: null, staleReveal: null };
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript((mock) => {
    try {
      localStorage.setItem('baQaMockSession', JSON.stringify(mock));
      const j = JSON.parse(localStorage.getItem('baJourney') || '{}');
      j.termsAccepted = true;
      j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
      j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) { /* storage disabled */ }
  }, MOCK);

  // ---- A: hold glory.jpg so the second step's artwork is slow ----
  let release = null;
  const gate = new Promise((resolve) => { release = resolve; });
  await context.route('**/assets/study/diagrams/glory.jpg', async (route) => {
    await gate;
    await route.continue();
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  const figure = await page.$('#sheet-article figure[data-diagram="s0-3"]');
  await figure.evaluate((f) => f.scrollIntoView({ block: 'center' }));
  await figure.$('.story-fullscreen').then((b) => b.click());
  await page.waitForTimeout(1500);

  // The reader opens on the centre movement (2 of 3). Step once: movement 3's
  // artwork (glory.jpg) is held, so the cross must stay on screen meanwhile.
  const titleAt = (index) => page.evaluate((i) => {
    const card = document.querySelectorAll('body > .story-read .story-card')[i];
    return (card.querySelector('.story-title') || {}).textContent;
  }, index);
  const beforeTitle = await page.evaluate(() => (document.querySelector('body > .story-read .story-read-title') || {}).textContent);
  await page.click('body > .story-read [data-read-next]');
  await page.waitForTimeout(800);
  summary.blankWhileLoading = {
    shownTitle: await page.evaluate(() => (document.querySelector('body > .story-read .story-read-title') || {}).textContent),
    previousTitle: beforeTitle,
    layersWhileLoading: await page.evaluate(layers),
  };
  summary.blankWhileLoading.visibleWhileLoading = summary.blankWhileLoading.layersWhileLoading
    .filter((l) => Number(l.opacity) > 0.5).map((l) => l.src);
  await page.screenshot({ path: path.join(OUT, 'a-while-loading.png') });

  release();
  await page.waitForTimeout(2000);
  summary.blankWhileLoading.layersAfterLoad = await page.evaluate(layers);
  summary.blankWhileLoading.currentAfterLoad = summary.blankWhileLoading.layersAfterLoad
    .filter((l) => l.current).map((l) => l.src);
  await page.screenshot({ path: path.join(OUT, 'a-after-load.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1100);

  // ---- B: same hold, but the reader moves on before the request resolves ----
  let release2 = null;
  const gate2 = new Promise((resolve) => { release2 = resolve; });
  await context.unroute('**/assets/study/diagrams/glory.jpg');
  await context.route('**/assets/study/diagrams/exile.jpg', async (route) => {
    await gate2;
    await route.continue();
  });
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  const figure2 = await page.$('#sheet-article figure[data-diagram="s0-3"]');
  await figure2.evaluate((f) => f.scrollIntoView({ block: 'center' }));
  await figure2.$('.story-fullscreen').then((b) => b.click());
  await page.waitForTimeout(1500);

  // Reader opens at movement 2. Step back to movement 1 (exile.jpg, held), then
  // move forward again before it lands: the stale request must not decide what
  // is on screen.
  await page.click('body > .story-read [data-read-prev]');
  await page.waitForTimeout(600);
  const heldTitle = await page.evaluate(() => (document.querySelector('body > .story-read .story-read-title') || {}).textContent);
  await page.click('body > .story-read [data-read-next]');
  await page.waitForTimeout(900);
  release2();
  await page.waitForTimeout(2200);
  summary.staleReveal = {
    titleThatWasHeld: heldTitle,
    finalTitle: await page.evaluate(() => (document.querySelector('body > .story-read .story-read-title') || {}).textContent),
    layers: await page.evaluate(layers),
  };
  summary.staleReveal.currentLayers = summary.staleReveal.layers.filter((l) => l.current).map((l) => l.src);
  summary.staleReveal.topVisible = summary.staleReveal.layers
    .filter((l) => Number(l.opacity) > 0.5).sort((a, b) => b.z - a.z).map((l) => l.src);
  await page.screenshot({ path: path.join(OUT, 'b-after-stale-load.png') });

  summary.errors = errors.slice(0, 8);
} finally {
  await browser.close();
}

const problems = [];
const a = summary.blankWhileLoading;
if (!a.visibleWhileLoading.length) problems.push('A: no artwork visible while the next movement loaded (dark hole)');
if (a.currentAfterLoad.length !== 1) problems.push(`A: ${a.currentAfterLoad.length} current layers after load (expected 1)`);
const b = summary.staleReveal;
if (b.currentLayers.length !== 1) problems.push(`B: ${b.currentLayers.length} current layers after a stale load (expected 1)`);
if (b.topVisible.length && b.finalTitle && !b.topVisible[0].includes('cross')) {
  problems.push(`B: top visible layer "${b.topVisible[0]}" does not match the displayed movement "${b.finalTitle}"`);
}
summary.problems = problems;
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
console.log(problems.length ? `\nFAILURES:\n  ${problems.join('\n  ')}` : '\nno layer races reproduced');
process.exit(problems.length ? 1 : 0);
