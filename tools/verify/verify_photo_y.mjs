/*
 * Checks the per-card artwork crop. Each story card declares `--photo-y`, which
 * `.story-photo` consumes as its `object-position`; without it every picture in
 * a diagram is cropped at the same height, which is wrong for a subject that
 * sits low or high in the frame.
 *
 * Usage: node tools/verify/verify_photo_y.mjs --base=http://127.0.0.1:8000
 */
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);
const BASE = String(args.base || 'http://127.0.0.1:8000').replace(/\/$/, '');

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa@example.com', user_metadata: { name: 'QA' } },
  session: { access_token: 't', refresh_token: 'r', expires_at: 4102444800, token_type: 'bearer' },
};

const browser = await chromium.launch();
let failures = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
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
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  await page.waitForSelector('#sheet-article figure[data-diagram="s0-3"] .story-card', { timeout: 20000 });

  // s0-3 is the artwork story: three movements, so the crop should differ.
  const art = await page.evaluate(() => {
    const fig = document.querySelector('#sheet-article figure[data-diagram="s0-3"]');
    return [...fig.querySelectorAll('.story-card')].map((card) => {
      const img = card.querySelector('.story-photo');
      return {
        index: card.getAttribute('data-index'),
        declared: card.style.getPropertyValue('--photo-y').trim(),
        resolved: img ? getComputedStyle(img).objectPosition : null,
        hasPhoto: !!img,
      };
    });
  });
  console.log('s0-3 (three movements, artwork):');
  art.forEach((c) => console.log(`  card ${c.index}: --photo-y=${c.declared}  object-position=${c.resolved}`));
  const declaredValues = art.filter((c) => c.hasPhoto).map((c) => c.declared);
  if (new Set(declaredValues).size < 2) {
    failures++;
    console.log('  FAIL: every card crops at the same height, so --photo-y is not varying');
  }
  art.filter((c) => c.hasPhoto).forEach((c) => {
    if (!c.resolved || !c.resolved.includes(c.declared.replace('%', ''))) {
      failures++;
      console.log(`  FAIL: card ${c.index} declares ${c.declared} but resolves ${c.resolved}`);
    }
  });

  // A copy-only story has no photo; the variable should still be harmless.
  const noPhoto = await page.evaluate(() => {
    const fig = document.querySelector('#sheet-article figure[data-diagram="s0-2"]');
    if (!fig) return null;
    return [...fig.querySelectorAll('.story-card')].map((card) => ({
      index: card.getAttribute('data-index'),
      declared: card.style.getPropertyValue('--photo-y').trim(),
      photos: card.querySelectorAll('.story-photo').length,
    }));
  });
  console.log('s0-2 (copy only):');
  if (noPhoto) noPhoto.forEach((c) => console.log(`  card ${c.index}: --photo-y=${c.declared}  photos=${c.photos}`));

  // A two-movement story must still get two different crops, not the first two
  // entries of a three-entry default. Loaded through the portal, since only the
  // first sitting is rendered on arrival.
  await page.evaluate(() => { if (window.openSittingFromPortal) window.openSittingFromPortal(1); });
  await page.waitForTimeout(1600);
  const three = await page.evaluate(() => {
    const fig = document.querySelector('#sheet-article figure[data-diagram="s1-1"]');
    if (!fig) return null;
    return [...fig.querySelectorAll('.story-card')].map((c) => c.style.getPropertyValue('--photo-y').trim());
  });
  console.log('s1-1 (sitting 1, three movements, no artwork):');
  console.log(`  --photo-y values = ${three === null ? 'figure not mounted' : JSON.stringify(three)}`);
  if (three === null) {
    failures++;
    console.log('  FAIL: could not reach sitting 1 to check a second diagram');
  } else if (three.some((v) => !v)) {
    failures++;
    console.log('  FAIL: a card in s1-1 declares no --photo-y');
  }
} finally {
  await browser.close();
}
console.log(failures ? `\nFAILURES: ${failures}` : '\nphotograph crop varies per card and resolves as declared');
process.exit(failures ? 1 : 0);
