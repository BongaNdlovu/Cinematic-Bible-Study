/*
 * Measures whether the mindmap's content actually fits inside its frame when the
 * full-screen view is open, and whether the full-screen layer itself scrolls.
 *
 * A bounding-box check on the world stage is not enough: the stage can be the
 * right size while an inner box (a leaf column, a label pill) sits outside it.
 * This walks every placed element and compares it against the frame.
 *
 * Usage: node tools/verify/verify_mindmap_fullscreen_fit.mjs --base=http://127.0.0.1:8000
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
const OUT = path.join('qa', 'proofs', 'mindmap-fs-fit');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa@example.com', user_metadata: { name: 'QA' } },
  session: { access_token: 't', refresh_token: 'r', expires_at: 4102444800, token_type: 'bearer' },
};

const browser = await chromium.launch();
const out = { base: BASE, viewports: [] };
try {
  for (const vp of [{ w: 1440, h: 1000 }, { w: 1280, h: 800 }, { w: 1920, h: 1080 }]) {
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
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
    await page.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1700);
    await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
    await page.waitForTimeout(400);

    // Enter full screen through the block's own control.
    const fsBtn = await page.$('figure[data-diagram="s2-4"] .mm-hud [data-mm-fs]');
    if (!fsBtn) { out.viewports.push({ vp, error: 'no full-screen control' }); await context.close(); continue; }
    await fsBtn.click();
    await page.waitForTimeout(1400);

    const m = await page.evaluate(() => {
      const mm = document.querySelector('figure[data-diagram="s2-4"] .mm');
      if (!mm) return { error: 'no map' };
      const mmRect = mm.getBoundingClientRect();
      const stage = mm.querySelector('.mm-stage') || mm.querySelector('[class*="stage"]');
      const boxes = [];
      mm.querySelectorAll('.mm-head .mm-card, .mm-leaf .mm-card, .mm-leaf, .mm-cite').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        boxes.push({
          cls: el.className.toString().split(' ').filter((c) => c.startsWith('mm-')).join(' '),
          left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom),
        });
      });
      const cs = getComputedStyle(mm);
      return {
        isFull: mm.classList.contains('is-full'),
        mmBox: { left: Math.round(mmRect.left), right: Math.round(mmRect.right), top: Math.round(mmRect.top), bottom: Math.round(mmRect.bottom), w: Math.round(mmRect.width), h: Math.round(mmRect.height) },
        mmOverflow: cs.overflow,
        mmScroll: { scrollW: mm.scrollWidth, clientW: mm.clientWidth, scrollH: mm.scrollHeight, clientH: mm.clientHeight, scrollTop: mm.scrollTop, scrollLeft: mm.scrollLeft },
        stageTransform: stage ? getComputedStyle(stage).transform : null,
        vp: { w: window.innerWidth, h: window.innerHeight },
        boxes,
      };
    });
    if (m.boxes) {
      const outside = m.boxes.filter((b) => b.left < m.mmBox.left - 1 || b.right > m.mmBox.right + 1 || b.top < m.mmBox.top - 1 || b.bottom > m.mmBox.bottom + 1);
      m.outsideCount = outside.length;
      m.outside = outside.slice(0, 8);
      m.boxCount = m.boxes.length;
      delete m.boxes;
    }
    out.viewports.push({ vp, ...m });
    await page.screenshot({ path: path.join(OUT, `fs-${vp.w}x${vp.h}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(out, null, 2), 'utf8');
out.viewports.forEach((v) => {
  console.log(`\n=== ${v.vp.w}x${v.vp.h} (viewport ${v.vp ? v.vp.w + 'x' + v.vp.h : '?'}) ===`);
  if (v.error) { console.log('  ERROR', v.error); return; }
  if (v.mmBox) console.log(`  is-full=${v.isFull}  map box ${v.mmBox.w}x${v.mmBox.h} at (${v.mmBox.left},${v.mmBox.top})  overflow=${v.mmOverflow}`);
  if (v.mmScroll) console.log(`  layer scroll: ${v.mmScroll.scrollW}x${v.mmScroll.scrollH} vs client ${v.mmScroll.clientW}x${v.mmScroll.clientH}  scrollTop=${v.mmScroll.scrollTop} scrollLeft=${v.mmScroll.scrollLeft}`);
  if (v.stageTransform) console.log(`  stage transform: ${v.stageTransform}`);
  console.log(`  placed boxes: ${v.boxCount}   OUTSIDE the map box: ${v.outsideCount}`);
  (v.outside || []).forEach((b) => console.log(`    ${b.cls} [${b.left}..${b.right}] x [${b.top}..${b.bottom}]`));
});
const bad = out.viewports.filter((v) => v.outsideCount > 0 || (v.mmScroll && (v.mmScroll.scrollW > v.mmScroll.clientW + 1 || v.mmScroll.scrollH > v.mmScroll.clientH + 1)));
console.log(bad.length ? `\nFAIL: content outside the frame or the layer scrolls at ${bad.length} viewport(s)` : '\nall placed content fits and the layer does not scroll');
process.exit(bad.length ? 1 : 0);
