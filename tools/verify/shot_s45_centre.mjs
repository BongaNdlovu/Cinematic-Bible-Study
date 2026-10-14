/*
 * Element-level screenshot of the s4-5 flow, so the centre medal and the larger
 * centre bead can be eyeballed. The measurements already assert them; this is
 * the visual proof that goes with them.
 *
 * Usage: node tools/verify/shot_s45_centre.mjs --base=http://127.0.0.1:8000
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
const OUT = path.join('qa', 'proofs', 'sitting4-fixes');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa@example.com', user_metadata: { name: 'QA' } },
  session: { access_token: 't', refresh_token: 'r', expires_at: 4102444800, token_type: 'bearer' },
};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
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
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  await page.evaluate(() => window.openSittingFromPortal(4));
  await page.waitForTimeout(1700);
  await page.evaluate(() => {
    const b = document.getElementById('site-error');
    if (b) { const c = [...b.querySelectorAll('button')].find((x) => /dismiss/i.test(x.textContent)); if (c) c.click(); b.hidden = true; }
    const g = document.getElementById('sitting-guide');
    if (g) g.hidden = true;
    ['insight-pulse', 'insight-card', 'profile-card'].forEach((id) => {
      document.querySelectorAll('#' + id).forEach((n) => { n.style.display = 'none'; });
    });
  });
  await page.waitForTimeout(500);

  for (const [id, name] of [['s4-5', 's4-5-centre-figure.png'], ['s4-1', 's4-1-titles-figure.png']]) {
    const fig = await page.$(`figure[data-diagram="${id}"]`);
    if (!fig) { console.log(`${id}: figure not found`); continue; }
    await fig.evaluate((f) => f.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(700);
    await fig.screenshot({ path: path.join(OUT, name) });
    console.log('wrote', path.join(OUT, name));
  }
} finally {
  await browser.close();
}
