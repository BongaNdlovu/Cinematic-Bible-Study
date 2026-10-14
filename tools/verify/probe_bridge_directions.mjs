/*
 * Compares what the bridge panel shows against what the data says it should,
 * in both directions, from a movement where both arrows are live.
 *
 * Usage: node tools/verify/probe_bridge_directions.mjs --base=http://127.0.0.1:8000 [--sheet=4]
 */
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);
const BASE = String(args.base || 'http://127.0.0.1:8000').replace(/\/$/, '');
const SHEET = Number(args.sheet || 4);

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa@example.com', user_metadata: { name: 'QA' } },
  session: { access_token: 't', refresh_token: 'r', expires_at: 4102444800, token_type: 'bearer' },
};

let failures = 0;
const browser = await chromium.launch();
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
  await page.waitForTimeout(1300);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  if (SHEET !== 0) {
    await page.evaluate((i) => window.openSittingFromPortal(i), SHEET);
    await page.waitForTimeout(1600);
    await page.evaluate(() => {
      const b = document.getElementById('site-error');
      if (b) { const c = [...b.querySelectorAll('button')].find((x) => /dismiss/i.test(x.textContent)); if (c) c.click(); b.hidden = true; }
      const g = document.getElementById('sitting-guide');
      if (g) g.hidden = true;
    });
  }

  const spec = await page.evaluate((idx) => {
    const out = {};
    Object.entries(window.sheetsData[idx].diagrams || {}).forEach(([id, d]) => {
      if (d.kind !== 'chain' && d.kind !== 'steps') return;
      out[id] = (d.steps || []).map((st) => ({ share: st.bridgeShare || '', ahead: st.bridgeAhead || '' }));
    });
    return out;
  }, SHEET);

  /* The diagram on screen, and how many movements it has. */
  const fig = await page.evaluate(() => {
    const f = [...document.querySelectorAll('#sheet-article figure.chain')]
      .find((x) => x.querySelector('.story-link--next') && x.querySelector('.story-card'));
    if (!f) return null;
    return { id: f.getAttribute('data-diagram'), cards: f.querySelectorAll('.story-card').length };
  });
  if (!fig) { console.log('no story figure found'); process.exit(1); }
  const steps = spec[fig.id] || [];
  console.log(`diagram ${fig.id}: ${fig.cards} movements, ${steps.length} authored steps`);

  /* Park on movement 2 so both arrows are live. */
  await page.evaluate((id) => {
    const f = [...document.querySelectorAll('#sheet-article figure.chain')].find((x) => x.getAttribute('data-diagram') === id);
    f.scrollIntoView({ block: 'center' });
    f.querySelector('.story-card[data-index="1"]').click();
  }, fig.id);
  await page.waitForTimeout(500);

  const read = (dir) => page.evaluate((d) => {
    const f = [...document.querySelectorAll('#sheet-article figure.chain')]
      .find((x) => x.querySelector('.story-link--next:not([hidden])'));
    const btn = f.querySelector(d > 0 ? '.story-link--next' : '.story-link--prev');
    if (btn.disabled) return { disabled: true };
    /* Toggle twice through the other arrow so this direction re-resolves. */
    f.querySelector(d > 0 ? '.story-link--prev' : '.story-link--next').click();
    btn.click();
    const bridge = f.querySelector('.story-bridge');
    const active = f.querySelector('.story-card.is-active');
    return {
      active: active ? Number(active.getAttribute('data-index')) : null,
      share: (bridge.querySelector('[data-bridge-share]') || {}).textContent || '',
      text: (bridge.querySelector('[data-bridge-text]') || {}).textContent || '',
      dir: (bridge.querySelector('[data-bridge-dir]') || {}).textContent || '',
    };
  }, dir);

  /* Active movement is index 1 (step 2). Forward = step 2's bridge; back = step 1's. */
  const fwd = await read(1);
  const back = await read(-1);

  const norm = (s) => String(s).replace(/^Shared thread:\s*/, '').trim();
  const expectFwd = steps[1] ? steps[1].share : '';
  const expectBack = steps[0] ? steps[0].share : '';

  console.log('\nFORWARD (leaving step 2):');
  console.log(`  shown  : ${norm(fwd.share).slice(0, 66)}`);
  console.log(`  authored step 2: ${expectFwd.slice(0, 66)}`);
  const fwdOk = norm(fwd.share) === expectFwd && fwd.text.trim() === (steps[1] ? steps[1].ahead : '');
  console.log(`  ${fwdOk ? 'PASS' : 'FAIL'} forward panel matches the authored step 2 bridge`);
  if (!fwdOk) failures++;

  console.log('\nBACKWARD (leaving step 1):');
  console.log(`  shown  : ${norm(back.share).slice(0, 66)}`);
  console.log(`  authored step 1: ${expectBack.slice(0, 66)}`);
  const backShareOk = norm(back.share) === expectBack;
  const backTextOk = back.text.trim() === '';
  console.log(`  ${backShareOk ? 'PASS' : 'FAIL'} backward share is step 1's`);
  console.log(`  ${backTextOk ? 'PASS' : 'FAIL'} backward panel shows no forward explanation`);
  if (!backShareOk) failures++;
  if (!backTextOk) failures++;
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nbridge directions resolve to the authored links');
process.exit(failures ? 1 : 0);
