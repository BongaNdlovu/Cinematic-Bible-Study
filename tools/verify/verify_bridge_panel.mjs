/*
 * Verifies the wired bridge copy actually reaches the screen.
 *
 * The data being right is not the same as the panel showing it: the fields ride
 * to the DOM as data attributes, the panel is built by `linkFor`, and the
 * backward direction deliberately omits the explanation. So this drives the
 * real control and reads what a reader would see.
 *
 * Usage: node tools/verify/verify_bridge_panel.mjs --base=http://127.0.0.1:8000
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
const OUT = path.join('qa', 'proofs', 'bridge-panel');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa@example.com', user_metadata: { name: 'QA' } },
  session: { access_token: 't', refresh_token: 'r', expires_at: 4102444800, token_type: 'bearer' },
};

const check = [];
const ok = (name, pass, detail) => check.push({ name, pass: !!pass, detail: detail || '' });

async function openSittingInPage(page, index) {
  await page.evaluate((i) => {
    const drawer = document.getElementById('toc-drawer');
    if (drawer.classList.contains('-translate-x-full')) window.toggleTocDrawer();
    document.querySelectorAll('#toc-unit-list button')[i].click();
    if (!drawer.classList.contains('-translate-x-full')) window.toggleTocDrawer();
  }, index);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
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
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));

  /* Sittings 0, 1, 2, 4, 5 and 9 own story diagrams with wired bridges. */
  for (const sheet of [0, 1, 2, 4, 5, 9]) {
    await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1300);
    await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
    if (sheet !== 0) {
      await openSittingInPage(page, sheet);
      await page.waitForTimeout(1600);
      await page.evaluate(() => {
        const b = document.getElementById('site-error');
        if (b) { const c = [...b.querySelectorAll('button')].find((x) => /dismiss/i.test(x.textContent)); if (c) c.click(); b.hidden = true; }
        const g = document.getElementById('sitting-guide');
        if (g) g.hidden = true;
      });
    }
    /* How many steps carry bridge copy in this sitting? */
    const wired = await page.evaluate((idx) => {
      let n = 0;
      Object.values(window.sheetsData[idx].diagrams || {}).forEach((d) => {
        (d.steps || []).forEach((st) => { if (st.bridgeShare || st.bridgeAhead) n++; });
      });
      return n;
    }, sheet);
    if (!wired) continue;

    /* The first story figure with an edge control. */
    const target = await page.evaluateHandle(() => {
      const figs = [...document.querySelectorAll('#sheet-article figure.chain')];
      const fig = figs.find((f) => f.querySelector('.story-link--next:not([hidden])'));
      return fig || null;
    });
    const has = await target.evaluate((f) => !!f);
    if (!has) { ok(`sitting ${sheet}: a wired story figure is present`, false, 'none found'); continue; }

    await target.evaluate((f) => f.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    /* Press the forward edge control and read the panel. */
    const panel = await page.evaluate(() => {
      const fig = [...document.querySelectorAll('#sheet-article figure.chain')]
        .find((f) => f.querySelector('.story-link--next:not([hidden])'));
      fig.querySelector('.story-link--next').click();
      const bridge = fig.querySelector('.story-bridge');
      const text = bridge.querySelector('[data-bridge-text]');
      const share = bridge.querySelector('[data-bridge-share]');
      return {
        open: !bridge.hidden,
        share: share.hidden ? '' : share.textContent.trim(),
        ahead: text.hidden ? '' : text.textContent.trim(),
      };
    });
    await page.waitForTimeout(300);
    ok(`sitting ${sheet}: the forward panel opens`, panel.open, JSON.stringify(panel).slice(0, 90));
    ok(`sitting ${sheet}: the panel shows the authored Shared thread`, /^Shared thread: \S/.test(panel.share), panel.share.slice(0, 80));
    ok(`sitting ${sheet}: the panel shows the authored forward explanation`, panel.ahead.length > 40, panel.ahead.slice(0, 80));

    /* Looking back must show the share and no explanation. This needs a movement
       where the prev arrow is live — from movement 1 the control is disabled, and
       driving it would only re-toggle the forward panel. So park on movement 2
       and check the pair from there. */
    const canGoBack = await page.evaluate(() => {
      const fig = [...document.querySelectorAll('#sheet-article figure.chain')]
        .find((f) => f.querySelector('.story-link--next:not([hidden])'));
      const cards = fig.querySelectorAll('.story-card');
      if (cards.length < 3) return false;
      cards[1].click();
      return !fig.querySelector('.story-link--prev').disabled;
    });
    if (!canGoBack) {
      ok(`sitting ${sheet}: looking back (skipped: no middle movement)`, true, 'diagram has fewer than 3 movements');
    } else {
      await page.waitForTimeout(500);
      const forwardFirst = await page.evaluate(() => {
        const fig = [...document.querySelectorAll('#sheet-article figure.chain')]
          .find((f) => f.querySelector('.story-link--next:not([hidden])'));
        fig.querySelector('.story-link--next').click();
        const b = fig.querySelector('.story-bridge');
        return { share: (b.querySelector('[data-bridge-share]') || {}).textContent || '', text: (b.querySelector('[data-bridge-text]') || {}).textContent || '' };
      });
      await page.waitForTimeout(250);
      const back = await page.evaluate(() => {
        const fig = [...document.querySelectorAll('#sheet-article figure.chain')]
          .find((f) => f.querySelector('.story-link--next:not([hidden])'));
        fig.querySelector('.story-link--prev').click();
        const b = fig.querySelector('.story-bridge');
        const t = b.querySelector('[data-bridge-text]');
        const s = b.querySelector('[data-bridge-share]');
        return { hidden: t.hidden, share: s.hidden ? '' : s.textContent.trim() };
      });
      /* Looking back from movement 2 shows movement 1's thread, so the two
         directions must differ — that is what proves the direction re-resolves
         rather than re-showing whatever was already there. */
      ok(`sitting ${sheet}: looking back shows the share and no explanation`,
        back.hidden && /^Shared thread: \S/.test(back.share),
        back.share.slice(0, 80));
      ok(`sitting ${sheet}: the two directions show different threads`,
        back.share !== forwardFirst.share,
        `back "${back.share.slice(14, 50)}" vs forward "${forwardFirst.share.slice(14, 50)}"`);
    }
    await page.screenshot({ path: path.join(OUT, `bridge-sitting-${sheet}.png`) });
  }
  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

check.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  - ' + c.detail : ''}`));
const failed = check.filter((c) => !c.pass);
console.log(`\n${check.length - failed.length}/${check.length} checks passed`);
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(check, null, 2), 'utf8');
process.exit(failed.length ? 1 : 0);
