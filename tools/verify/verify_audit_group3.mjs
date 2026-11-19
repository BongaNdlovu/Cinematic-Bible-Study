import { chromium } from 'playwright';
import { ensureServer, dismissConsent, signedInScript } from './_server.mjs';

const server = await ensureServer({ preferred: 8147, probe: '/study.html' });
const BASE = server.base;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(signedInScript({ bookView: 'scroll' }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
const asked = [];
page.on('request', (req) => asked.push(new URL(req.url()).pathname));
const seen = (rx) => asked.some((p) => rx.test(p));

await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'load', timeout: 60000 });
await dismissConsent(page);
await page.waitForFunction(() => {
  const a = document.getElementById('sheet-article');
  return a && a.getAttribute('data-sheet-index') === '0' && a.children.length > 0;
}, null, { timeout: 30000 });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const g = document.getElementById('sitting-guide');
  if (g) g.hidden = true;
  const m = document.getElementById('placement-modal');
  if (m) m.remove();
});

const atLoad = {
  kjv: seen(/\/bible\/kjv(\.[a-f0-9]{12})?\.json$/),
  strongs: seen(/\/bible\/strongs-daniel(\.[a-f0-9]{12})?\.json$/),
  passages: seen(/\/bible\/sheet-passages(\.[a-f0-9]{12})?\.json$/),
  mapData: seen(/\/js\/content\/map-data(\.[a-f0-9]{12})?\.js$/),
  cues: seen(/readalong(\.[a-f0-9]{12})?\.json$/)
};
check('the study page loads no Bible text, Strong\'s data, map data or audio cues before they are needed', !atLoad.kjv && !atLoad.strongs && !atLoad.mapData && !atLoad.cues, atLoad);
check('the chapter badge data still loads at once', atLoad.passages, atLoad);

await page.click('[data-instrument="scripture"]');
await page.waitForTimeout(2500);
const scripture = await page.evaluate(() => {
  const root = document.getElementById('scripture-root');
  return { text: (root && root.textContent || '').length, verse: !!(root && root.querySelector('.scripture-verse')) };
});
check('opening the Scripture panel loads the text and shows verses', seen(/\/bible\/kjv(\.[a-f0-9]{12})?\.json$/) && scripture.verse, scripture);

await page.evaluate(async () => {
  const p = document.getElementById('lesson-audio-player');
  if (!p || !p.getAttribute('src')) return;
  p.muted = true;
  try { await p.play(); } catch (e) {}
});
await page.waitForTimeout(2500);
check('pressing Play loads the audio cues', seen(/readalong(\.[a-f0-9]{12})?\.json$/));
check('the run raises no page errors', errors.length === 0, errors.slice(0, 3));

await context.close();
await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall group 3 audit-fix checks passed');
process.exit(failures ? 1 : 0);
