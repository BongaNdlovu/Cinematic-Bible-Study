/*
 * Measures what the mindmap's node and leaf text actually resolves to on
 * screen. The block lays out in a fixed world space and is scaled to the
 * column, so a type size declared in world units is not the size a reader
 * sees — and the smaller the column, the worse the ratio.
 *
 * Usage: node tools/verify/verify_mindmap_legibility.mjs --base=http://127.0.0.1:8000
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

const WIDTHS = [1600, 1280, 1024, 860, 720];
const results = [];

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript((mock) => {
      try {
        localStorage.setItem('baQaMockSession', JSON.stringify(mock));
        localStorage.setItem('baOnboardV1', '1');
        const j = JSON.parse(localStorage.getItem('baJourney') || '{}');
        j.termsAccepted = true;
        j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
        j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        localStorage.setItem('baJourney', JSON.stringify(j));
      } catch (e) { /* storage disabled */ }
    }, MOCK);

    const page = await context.newPage();
    await page.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);
    await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
    const fig = await page.$('figure[data-diagram="s2-3"] .mm');
    if (!fig) { console.log(`width ${width}: no mindmap found`); await context.close(); continue; }
    await fig.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => {
      const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
      const world = mm.querySelector('.mm-world') || mm.firstElementChild;
      const rect = (el) => (el ? el.getBoundingClientRect() : null);
      const px = (el, prop) => (el ? parseFloat(getComputedStyle(el)[prop]) : null);
      const name = mm.querySelector('.mm-head .mm-name') || mm.querySelector('.mm-name');
      const text = mm.querySelector('.mm-head .mm-text') || mm.querySelector('.mm-text');
      const leaf = mm.querySelector('.mm-leaf .mm-text') || mm.querySelector('.mm-leaf');
      const card = mm.querySelector('.mm-head .mm-card');
      // The world is scaled; recover the factor from a laid-out box.
      const wr = world ? rect(world) : null;
      const scale = wr && world.offsetWidth ? wr.width / world.offsetWidth : null;
      return {
        blockWidth: Math.round(rect(mm).width),
        worldScale: scale,
        compact: mm.classList.contains('is-compact'),
        nameFontWorld: px(name, 'fontSize'),
        headTextWorld: px(text, 'fontSize'),
        leafTextWorld: px(leaf, 'fontSize'),
        nameRect: name ? { w: Math.round(rect(name).width), h: Math.round(rect(name).height) } : null,
        headCard: card ? { h: Math.round(rect(card).height), w: Math.round(rect(card).width) } : null,
      };
    });
    const onScreen = (v) => (v !== null && m.worldScale ? +(v * m.worldScale).toFixed(1) : null);
    results.push({
      width,
      blockWidth: m.blockWidth,
      scale: m.worldScale ? +m.worldScale.toFixed(3) : null,
      compact: m.compact,
      headNameOnScreen: onScreen(m.nameFontWorld),
      headTextOnScreen: onScreen(m.headTextWorld),
      leafTextOnScreen: onScreen(m.leafTextWorld),
      headCardPx: m.headCard,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log('block    scale   compact  head name  head text  leaf text   (px on screen)');
results.forEach((r) => {
  console.log(
    String(r.blockWidth).padStart(5)
    + String(r.scale === null ? '-' : r.scale).padStart(9)
    + String(r.compact).padStart(9)
    + String(r.headNameOnScreen === null ? '-' : r.headNameOnScreen).padStart(11)
    + String(r.headTextOnScreen === null ? '-' : r.headTextOnScreen).padStart(11)
    + String(r.leafTextOnScreen === null ? '-' : r.leafTextOnScreen).padStart(11)
  );
});
const unreadable = results.filter((r) => !r.compact && r.headTextOnScreen !== null && r.headTextOnScreen < 11);
console.log(unreadable.length
  ? `\nBELOW 11px on screen at ${unreadable.length} width(s): ${unreadable.map((r) => r.width).join(', ')}`
  : '\nhead text stays at or above 11px on screen at every measured width');
