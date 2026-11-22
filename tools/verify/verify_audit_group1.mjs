import { chromium } from 'playwright';
import { ensureServer, dismissConsent, signedInScript } from './_server.mjs';

const server = await ensureServer({ preferred: 8141, probe: '/study.html' });
const BASE = server.base;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const SLOW_SIGN_IN = 'setUser(qaMock.user, qaMock.session || { access_token: "qa-mock-token" }).then(markReady);';

async function slowAuth(context) {
  await context.route(/\/js\/core\/auth(\.[a-f0-9]{12})?\.js(\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const slowed = body.replace(SLOW_SIGN_IN, 'setTimeout(function () { ' + SLOW_SIGN_IN + ' }, 1500);');
    await route.fulfill({ response, body: slowed, headers: Object.assign({}, response.headers(), { 'content-length': String(Buffer.byteLength(slowed)) }) });
  });
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript({ completedSheets: [0, 1, 2, 3, 4, 5, 6], bookView: 'scroll' }));
  await slowAuth(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${BASE}/study.html?sheet=5`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => {
    const a = document.getElementById('sheet-article');
    return !!(window.ScrollAuth && window.ScrollAuth.getUser() && a && a.getAttribute('data-sheet-index') != null);
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    shown: document.getElementById('sheet-article') && document.getElementById('sheet-article').getAttribute('data-sheet-index'),
    url: new URLSearchParams(location.search).get('sheet'),
    signedIn: !!(window.ScrollAuth && window.ScrollAuth.getUser())
  }));
  check('a link to sitting 5 still opens sitting 5 when sign-in finishes after the page starts', r.signedIn && r.shown === '5' && r.url === '5', r);
  check('the slow sign-in run raises no page errors', errors.length === 0, errors.slice(0, 3));
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript());
  await context.route(/\/models\/lion(\.[a-f0-9]{12})?\.glb/, (route) => route.abort());
  const page = await context.newPage();
  await page.goto(`${BASE}/gallery.html?asset=lion`, { waitUntil: 'load', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForTimeout(12000);
  const r = await page.evaluate(() => {
    const overlay = document.getElementById('loading-overlay');
    const cont = document.getElementById('btn-load-continue');
    const pct = document.getElementById('loading-pct');
    const gone = !overlay || overlay.hidden || getComputedStyle(overlay).display === 'none' || getComputedStyle(overlay).opacity === '0' || overlay.classList.contains('hidden');
    return { pct: pct && pct.textContent, continueShown: !!(cont && cont.classList.contains('visible')), overlayGone: gone };
  });
  check('when a linked exhibit fails to load, the loader reaches 100% and offers Continue', r.pct === '100%' && (r.continueShown || r.overlayGone), r);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(signedInScript());
  await context.addInitScript(() => {
    let real;
    Object.defineProperty(window, 'BAJourney', {
      configurable: true,
      get() { return real; },
      set(value) {
        real = value;
        if (value) value.requireMember = () => { throw new Error('membership check failed'); };
      }
    });
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/gallery.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(11500);
  const r = await page.evaluate(() => ({
    held: document.documentElement.classList.contains('member-hold'),
    visibility: getComputedStyle(document.body).visibility
  }));
  check('if the membership check throws, the gallery shows itself after the watchdog instead of staying invisible', !r.held && r.visibility === 'visible', r);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await context.addInitScript(signedInScript({ bookView: 'scroll' }));
  const page = await context.newPage();
  await page.goto(`${BASE}/study.html?sheet=10&preview=full`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForFunction(() => {
    const a = document.getElementById('sheet-article');
    return a && a.getAttribute('data-sheet-index') === '10';
  }, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const host = document.querySelector('[data-certificate]');
    const tag = document.createElement('script');
    tag.src = (host && host.getAttribute('data-certificate')) || 'js/pages/study/certificate.js';
    await new Promise((resolve, reject) => { tag.onload = resolve; tag.onerror = reject; document.head.appendChild(tag); });
    window.__cert = { flushed: 0, pushed: 0, asks: 0 };
    window.ProgressSync.flushNow = () => { window.__cert.flushed += 1; window.__cert.saved = true; return Promise.resolve(null); };
    window.ProgressSync.pushNow = () => { window.__cert.pushed += 1; return Promise.resolve(null); };
    window.ScrollAuth.getClient = () => ({
      rpc: () => {
        window.__cert.asks += 1;
        return Promise.resolve(window.__cert.saved
          ? { data: [{ serial: 'SD-2026-0A1B2C3D', issued_at: '2026-11-19T00:00:00Z' }], error: null }
          : { data: null, error: { message: 'not_finished' } });
      }
    });
    window.StudyCertificate.open();
    document.getElementById('certificate-name').value = 'Test Reader';
    document.getElementById('certificate-name').dispatchEvent(new Event('input', { bubbles: true }));
  });
  const download = page.waitForEvent('download', { timeout: 45000 }).then(() => true, () => false);
  await page.click('#certificate-download');
  const downloaded = await download;
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ ...window.__cert, note: (document.getElementById('certificate-note') || {}).textContent || '' }));
  check('a certificate asked for before the last save reaches the server flushes the save and comes out numbered', downloaded && r.flushed === 1 && r.asks >= 2 && !/without a certificate number/.test(r.note), { downloaded, ...r });

  await page.evaluate(() => {
    window.__cert = { flushed: 0, pushed: 0, asks: 0, saved: false };
    window.ProgressSync.flushNow = () => new Promise((resolve) => setTimeout(() => { window.__cert.saved = true; resolve(null); }, 1500));
    window.StudyCertificate.open();
  });
  const late = page.waitForEvent('download', { timeout: 6000 }).then(() => true, () => false);
  await page.click('#certificate-download');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.StudyCertificate.close());
  check('closing the certificate panel while the number is being issued downloads nothing', !(await late));
  await context.close();
}

await browser.close();
server.stop();
console.log(failures ? `\n${failures} check(s) failed` : '\nall group 1 audit-fix checks passed');
process.exit(failures ? 1 : 0);
