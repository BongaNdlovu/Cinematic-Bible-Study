/*
 * Verifies the two sitting-4 fixes:
 *   - `s4-1` step 2's title now quotes the KING's own sentence (Daniel 3:29),
 *     so the card no longer attributes the Hebrews' words to him;
 *   - `s4-5` step 2 carries the centre mark, and the medal it renders actually
 *     paints (its colour comes from a custom property, so a missing declaration
 *     would leave an invisible ring).
 *
 * Usage: node tools/verify/verify_sitting4_fixes.mjs --base=http://127.0.0.1:8000
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

const checks = [];
const ok = (name, pass, detail) => checks.push({ name, pass: !!pass, detail: detail || '' });

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
  await page.waitForTimeout(1300);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  await openSittingInPage(page, 4);
  await page.waitForTimeout(1700);
  await page.evaluate(() => {
    const b = document.getElementById('site-error');
    if (b) { const c = [...b.querySelectorAll('button')].find((x) => /dismiss/i.test(x.textContent)); if (c) c.click(); b.hidden = true; }
    const g = document.getElementById('sitting-guide');
    if (g) g.hidden = true;
  });
  await page.waitForTimeout(400);

  /* ---- s4-1: the card's own title, as rendered ---- */
  const s41 = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s4-1"]');
    if (!fig) return null;
    fig.scrollIntoView({ block: 'center' });
    const cards = [...fig.querySelectorAll('.story-card')];
    return cards.map((c) => ({
      title: (c.querySelector('.story-title') || {}).textContent || '',
      cite: (c.querySelector('.chain-cite') || {}).textContent || '',
    }));
  });
  if (!s41) { ok('s4-1 found', false); } else {
    const second = s41[1] || {};
    ok('s4-1 step 2 title no longer quotes the Hebrews\' words', !/able to deliver/.test(second.title), second.title);
    ok('s4-1 step 2 title quotes the king\'s own sentence', /no other God that can deliver after this sort/i.test(second.title), second.title);
    ok('s4-1 step 2 cites Daniel 3:29', /3:29/.test(second.cite), second.cite);
    ok('s4-1 step 1 still quotes the king at 2:47', /revealer of secrets/.test((s41[0] || {}).title || '') && /2:47/.test((s41[0] || {}).cite || ''),
      `${(s41[0] || {}).title} · ${(s41[0] || {}).cite}`);
    ok('s4-1 step 3 still quotes the king at 4:37', /King of heaven/.test((s41[2] || {}).title || '') && /4:37/.test((s41[2] || {}).cite || ''),
      `${(s41[2] || {}).title} · ${(s41[2] || {}).cite}`);
  }
  await page.screenshot({ path: path.join(OUT, 's4-1-titles.png') });

  /* ---- s4-5: the centre mark and the medal's colour ---- */
  const s45 = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s4-5"]');
    if (!fig) return null;
    fig.scrollIntoView({ block: 'center' });
    const steps = [...fig.querySelectorAll('.flow-step')];
    return steps.map((st, i) => {
      const medal = st.querySelector('.story-medal');
      const dot = st.querySelector('.flow-node-dot');
      return {
        index: i,
        title: (st.querySelector('.chain-title') || {}).textContent || '',
        isCentre: st.classList.contains('is-centre'),
        hasMedal: !!medal,
        medalColor: medal ? getComputedStyle(medal).color : null,
        medalBox: medal ? { w: Math.round(medal.getBoundingClientRect().width), h: Math.round(medal.getBoundingClientRect().height) } : null,
        medalStroke: medal ? getComputedStyle(medal.querySelector('svg')).stroke : null,
        dot: dot ? Math.round(dot.getBoundingClientRect().width) : null,
      };
    });
  });
  if (!s45) { ok('s4-5 found', false); } else {
    const centre = s45.find((s) => s.isCentre);
    ok('s4-5 marks exactly one step as the centre', s45.filter((s) => s.isCentre).length === 1,
      s45.map((s) => `${s.index}${s.isCentre ? '*' : ''}`).join(' '));
    ok('s4-5 centres "His understanding returns"', !!centre && /understanding returns/.test(centre.title), centre ? centre.title : 'none');
    ok('the centre renders the medal', !!centre && centre.hasMedal, centre ? String(centre.hasMedal) : '-');
    ok('the medal paints in a visible colour (not the inherited near-white)',
      !!centre && !!centre.medalColor && centre.medalColor !== 'rgb(246, 239, 223)' && centre.medalColor !== 'rgb(0, 0, 0)',
      centre ? centre.medalColor : '-');
    ok('the medal has a real box', !!centre && centre.medalBox && centre.medalBox.w > 20 && centre.medalBox.h > 20,
      centre ? JSON.stringify(centre.medalBox) : '-');
    ok('the centre bead is larger than the others',
      !!centre && s45.filter((s) => !s.isCentre).every((s) => s.dot === null || centre.dot > s.dot),
      centre ? `centre ${centre.dot}px, others ${s45.filter((s) => !s.isCentre).map((s) => s.dot).join('/')}` : '-');
  }
  await page.screenshot({ path: path.join(OUT, 's4-5-centre.png') });

  /* ---- s4-5 is a flow: it must NOT carry bridge fields, because its panel is
     not wired and a field nothing renders would be copy that ships nowhere. ---- */
  const shareFields = await page.evaluate(() => {
    const d = window.sheetsData[4].diagrams['s4-5'];
    return (d.steps || []).filter((s) => s.bridgeShare || s.bridgeAhead).length;
  });
  ok('s4-5 carries no bridge fields (its panel is not wired)', shareFields === 0, `${shareFields} field(s)`);
  ok('the flow did not gain a story carousel', await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s4-5"]');
    return !fig.classList.contains('is-story') && fig.querySelectorAll('.flow-step').length === 4;
  }), 'flow shape preserved');

  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

checks.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  - ' + c.detail : ''}`));
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(checks, null, 2), 'utf8');
process.exit(failed.length ? 1 : 0);
