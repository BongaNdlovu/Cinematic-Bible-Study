import { chromium } from 'playwright';
import { ensureServer, dismissConsent, signedInScript } from './_server.mjs';

const server = await ensureServer({ preferred: 8145, probe: '/study.html' });
const BASE = server.base;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

let browser = null;
async function relaunch() {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch({ headless: true });
}

async function study(sheet, { theme = 'charcoal', query = '', setup = null } = {}) {
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript({ bookView: 'scroll' }));
  await context.addInitScript((t) => localStorage.setItem('daniel_theme_name_v1', t), theme);
  if (setup) await setup(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/study.html?sheet=${sheet}&preview=full${query}`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction((n) => {
    const a = document.getElementById('sheet-article');
    return a && a.getAttribute('data-sheet-index') === String(n) && a.children.length > 0;
  }, sheet, { timeout: 30000 });
  await page.waitForTimeout(1500);
  return { context, page, errors };
}

const wrongRows = [];
let chips = 0;
for (const sheet of [2, 7, 10]) {
  const { context, page } = await study(sheet);
  const r = await page.evaluate(async () => {
    const covers = (text, ch, v) => {
      const rx = new RegExp('\\b' + ch + ':\\s*([0-9,\\s\\u2013\\u2014-]+)', 'g');
      let m;
      while ((m = rx.exec(text))) {
        for (const part of m[1].split(',')) {
          const nums = part.match(/\d+/g);
          if (!nums) continue;
          const lo = Number(nums[0]);
          const hi = Number(nums[1] || nums[0]);
          if (v >= lo && v <= hi) return true;
        }
      }
      return false;
    };
    const out = { chips: 0, wrong: [] };
    for (const chip of [...document.querySelectorAll('.chain-cite[data-cite-src]')]) {
      const label = chip.getAttribute('data-cite-src');
      const m = label.match(/(\d+):(\d+)/);
      if (!m) continue;
      const [, ch, v] = m.map(Number);
      document.querySelectorAll('.cite-row.is-hit').forEach((row) => row.classList.remove('is-hit'));
      chip.click();
      await new Promise((res) => setTimeout(res, 60));
      const hit = document.querySelector('.cite-row.is-hit');
      if (!hit) continue;
      out.chips += 1;
      const rows = [...document.querySelectorAll('.cite-row')];
      const someCovers = rows.some((row) => covers((row.querySelector('.cite-source') || {}).textContent || '', ch, v));
      const hitCovers = covers((hit.querySelector('.cite-source') || {}).textContent || '', ch, v);
      if (someCovers && !hitCovers) out.wrong.push(label);
    }
    document.documentElement.classList.remove('dfx-cite-open');
    return out;
  });
  chips += r.chips;
  r.wrong.forEach((label) => wrongRows.push(sheet + ': ' + label));
  await context.close();
}
check('every diagram citation chip opens a reference row that holds its verse', chips > 0 && wrongRows.length === 0, { chips, wrong: wrongRows.slice(0, 6) });

{
  const { context, page, errors } = await study(2, {
    setup: async (ctx) => {
      await ctx.route(/\/js\/pages\/study\/mindmap(\.[a-f0-9]{12})?\.js/, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__mindmapStub = true;' }));
    }
  });
  const r = await page.evaluate(() => ({ stub: !!window.__mindmapStub, mindmap: !!window.MindMap, sheet: document.getElementById('sheet-article').getAttribute('data-sheet-index') }));
  check('a mind-map file that defines nothing fails cleanly and the sitting still opens', r.stub && !r.mindmap && r.sheet === '2', { ...r, errors: errors.slice(0, 2) });
  await context.close();
}

{
  const { context, page } = await study(9, { theme: 'paper' });
  const r = await page.evaluate(() => {
    const p = document.querySelector('.tlx p');
    const m = getComputedStyle(p).color.match(/\d+/g).map(Number);
    return { color: getComputedStyle(p).color, light: (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) > 120 };
  });
  check('in the paper theme the timeline plate keeps its light text', r.light, r);
  const panel = await page.evaluate(() => {
    const el = document.getElementById('access-panel');
    el.hidden = false;
    const bg = getComputedStyle(el).backgroundColor;
    el.hidden = true;
    return bg;
  });
  check('in the paper theme the access panel backdrop stays a dark see-through veil', /rgba\(6, 5, 4, 0\.72\)/.test(panel), panel);
  await context.close();
}

{
  const { context, page } = await study(0, { query: '&project=1' });
  const r = await page.evaluate(() => ({
    body: getComputedStyle(document.querySelector('.article-body')).fontSize,
    p: getComputedStyle(document.querySelector('.article-body p')).fontSize
  }));
  check('projection mode enlarges the lesson paragraphs too', r.p === '22px', r);
  const msg = await page.evaluate(() => window.SiteNet.message('cancelled'));
  check('a cancelled request has no error message', msg === '', JSON.stringify(msg));
  await context.close();
}

{
  await relaunch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript());
  const page = await context.newPage();
  await page.goto(`${BASE}/map.html?year=y605`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForTimeout(4000);
  const r = await page.evaluate(async () => {
    const input = document.querySelector('.cmap-search input');
    const hits = document.querySelector('.cmap-search-hits');
    if (!input || !hits) return null;
    input.value = 'babylon';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 100));
    const empire = !!hits.querySelector('button[data-kind="empire"]');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return { empire, closedOnEscape: hits.hidden };
  });
  check('map search finds empires and closes on Escape', r && r.empire && r.closedOnEscape, r);
  await context.close();
}

await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall group 2 audit-fix checks passed');
process.exit(failures ? 1 : 0);
