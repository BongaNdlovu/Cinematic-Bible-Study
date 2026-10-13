/*
 * Phone-width check for the story stage and the full-screen reader. The reader
 * gained a padded panel, a progress rail, and per-movement detail, so the
 * narrow layout has to be seen, not assumed.
 *
 * Usage: node tools/verify/verify_story_mobile.mjs --base=http://127.0.0.1:8000
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
const LABEL = String(args.label || 'mobile');
const OUT = path.join('qa', 'proofs', `story-${LABEL}`);
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

const summary = { base: BASE, viewport: null, reader: null };
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const box = document.getElementById('sitting-guide');
    if (box) box.hidden = true;
  });
  await page.waitForSelector('#sheet-article figure.chain.is-story', { timeout: 20000 });
  summary.viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, scrollW: document.documentElement.scrollWidth }));

  // The artwork story: stage, then the reader.
  const figure = await page.$('#sheet-article figure[data-diagram="s0-3"]');
  await figure.evaluate((f) => f.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(700);
  await figure.screenshot({ path: path.join(OUT, 'phone-stage.png') });
  summary.stageShot = 'phone-stage.png';

  const launch = await figure.$('.story-fullscreen');
  await launch.click();
  await page.waitForTimeout(1500);
  summary.reader = await page.evaluate(() => {
    const r = document.querySelector('body > .story-read');
    const panel = r.querySelector('.story-read-panel');
    const box = panel.getBoundingClientRect();
    return {
      open: r.classList.contains('is-open'),
      panel: { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height) },
      scrollW: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
      pips: r.querySelectorAll('.story-read-pip').length,
      detail: (r.querySelector('.story-read-detail').textContent || '').slice(0, 60),
      title: (r.querySelector('.story-read-title') || {}).textContent,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'phone-reader.png') });
  summary.readerShot = 'phone-reader.png';
  summary.errors = errors.slice(0, 8);
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'mobile-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
