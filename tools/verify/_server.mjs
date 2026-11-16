/*
 * Find or start the local site server for a verification script.
 *
 * Order:
 *   1. --base=URL on the command line, or the BASE environment variable.
 *   2. A healthy server already on `preferred` (a 200 with a body).
 *   3. Start server.py and read the port it actually chose.
 *
 * Step 3 reads the port from the server's own output rather than assuming
 * `preferred`: server.py falls back to the next free port when one is taken,
 * and a stale process that holds the port without answering is exactly the
 * case where assuming it made scripts fail with "could not start a server".
 */
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

function healthy(base, probe) {
  return new Promise((resolve) => {
    const req = http.get(base + probe, (res) => {
      let n = 0;
      res.on('data', (c) => { n += c.length; });
      res.on('end', () => resolve(res.statusCode === 200 && n > 0));
      res.on('error', () => resolve(false));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

function argBase() {
  const hit = process.argv.slice(2).find((a) => a.startsWith('--base='));
  const v = hit ? hit.slice('--base='.length) : process.env.BASE;
  return v ? String(v).replace(/\/$/, '') : '';
}

export async function ensureServer({ preferred = 8000, probe = '/index.html', timeoutMs = 10000 } = {}) {
  const given = argBase();
  if (given) return { base: given, port: Number(new URL(given).port) || 80, stop() {} };

  const preferredBase = `http://127.0.0.1:${preferred}`;
  if (await healthy(preferredBase, probe)) {
    return { base: preferredBase, port: preferred, stop() {} };
  }

  const child = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(preferred), PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  let port = 0;
  child.stdout.on('data', (d) => {
    log += d;
    const m = /Serving HTTP on port (\d+)/.exec(log);
    if (m && !port) port = Number(m[1]);
  });
  child.stderr.on('data', (d) => { log += d; });

  const stop = () => { try { child.kill(); } catch (e) { /* already gone */ } };
  // A script that throws before its own cleanup must not leave a server behind.
  process.once('exit', stop);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    if (child.exitCode !== null) break;
    if (port && await healthy(`http://127.0.0.1:${port}`, probe)) {
      return { base: `http://127.0.0.1:${port}`, port, stop };
    }
  }
  stop();
  throw new Error(
    `Could not start or find a site server (preferred port ${preferred}).\n` +
    `Pass --base=http://127.0.0.1:<port> to use one you started.\n${log.trim().slice(-600)}`
  );
}

/*
 * Accept the cookie-and-storage consent dialog if it is showing. Fresh
 * browser contexts see the dialog on their first page, and it intercepts
 * every click until a choice is made; the choice then persists for the
 * whole context, so one call per context's first page is enough.
 */
export async function dismissConsent(page) {
  const dialog = page.locator('#sod-consent');
  if (await dialog.isVisible().catch(() => false)) {
    await page.locator('button[data-sod-action="accept"]').click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const QA_MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

export function termsVersion() {
  const src = fs.readFileSync(path.join(repoRoot, 'js', 'shared', 'journey.js'), 'utf8');
  const hit = /const TERMS_VERSION = (\d+);/.exec(src);
  if (!hit) throw new Error('TERMS_VERSION not found in js/shared/journey.js');
  return Number(hit[1]);
}

export function signedInScript({ completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], bookView = null } = {}) {
  const p = { mock: QA_MOCK, terms: termsVersion(), done: completedSheets, view: bookView };
  return '(() => { const p = ' + JSON.stringify(p) + ';' +
    ' try {' +
    " localStorage.setItem('baQaMockSession', JSON.stringify(p.mock));" +
    " localStorage.setItem('baOnboardV1', '1');" +
    " localStorage.setItem('sodConsent', JSON.stringify({ analytics: false, ts: 1, v: 1 }));" +
    " const raw = localStorage.getItem('baJourney');" +
    ' const j = raw ? JSON.parse(raw) : {};' +
    ' j.termsByUser = Object.assign({}, j.termsByUser, { [p.mock.user.id]: { version: p.terms, at: 1 } });' +
    ' j.completedSheets = p.done;' +
    " localStorage.setItem('baJourney', JSON.stringify(j));" +
    " if (p.view) localStorage.setItem('daniel_book_view', p.view);" +
    ' } catch (e) {} })();';
}

const INSTALLED_CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function chromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const installed = INSTALLED_CHROME.find((p) => p && fs.existsSync(p));
  if (installed) return installed;
  const bundled = chromium.executablePath();
  return bundled && fs.existsSync(bundled) ? bundled : null;
}
