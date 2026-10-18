import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');
const JS_PATH = path.join(ROOT, 'js/study/book-reader.js');
const CSS_PATH = path.join(ROOT, 'css/book-reader.css');
const OUT_DIR = path.join(ROOT, 'qa/proofs/book');

const argv = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const BASE = argv.base || 'http://127.0.0.1:8100';
const SHEETS = argv.sheets ? String(argv.sheets).split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VIEWPORTS = argv.viewports ? String(argv.viewports).split(',') : ['desktop', 'mobile'];
const MILESTONE = Number(argv.milestone || 5);
const SHOTS = !!argv.shots;
const VP = { desktop: { w: 1440, h: 900 }, mobile: { w: 390, h: 844 } };

let passes = 0;
let failures = 0;

function check(tag, name, ok, detail) {
  if (ok) passes += 1;
  else failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${tag}] ${name}${detail ? ` -- ${detail}` : ''}`);
  return ok;
}

function info(tag, text) {
  console.log(`INFO [${tag}] ${text}`);
}

async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('.br-book.is-turning'), null, { polling: 20, timeout: 8000 });
  await page.waitForTimeout(30);
}

async function geom(page) {
  return page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const r = v.getBoundingClientRect();
    const st = window.BookReader.state();
    const avail = Math.min(innerWidth - 32, 1180);
    const expVw = avail >= 860 ? avail : Math.min(avail, 680);
    const expVh = Math.max(380, Math.min(900, innerHeight - 160));
    return {
      step: st.step,
      steps: st.steps,
      mode: st.mode,
      Vw: v.clientWidth,
      Vh: v.clientHeight,
      expVw,
      expVh,
      expMode: avail >= 860 ? 'spread' : 'single',
      scrollLeft: v.scrollLeft,
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom
    };
  });
}

async function currentItem(page) {
  return page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const st = window.BookReader.state();
    const tr = document.querySelector('.br-track').getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
    let cur = null;
    items.forEach((it) => {
      const ir = it.getBoundingClientRect();
      const s0 = Math.round((ir.left - tr.left) / v.clientWidth);
      const n = Math.round(ir.width / v.clientWidth);
      if (st.step >= s0 && st.step < s0 + n) cur = it;
    });
    if (!cur) return { plate: false, idx: -1 };
    const plate = cur.classList.contains('is-plate');
    const fig = cur.querySelector('figure[data-diagram]');
    const figBox = fig ? fig.getBoundingClientRect() : null;
    const vr = v.getBoundingClientRect();
    const box = cur.querySelector('.br-plate');
    return {
      plate,
      idx: Array.from(document.querySelectorAll('.br-track > .br-item')).indexOf(cur),
      figOk: figBox ? figBox.left >= vr.left - 1 && figBox.right <= vr.right + 1 : null,
      figW: figBox ? Math.round(figBox.width) : null,
      boxScroll: box ? box.scrollHeight : null,
      boxClient: box ? box.clientHeight : null
    };
  });
}

async function anchorIdx(page) {
  return page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const vr = v.getBoundingClientRect();
    const nodes = Array.from(document.querySelectorAll('.br-flow > *'));
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.left >= vr.left - 1 && r.left < vr.right - 1 && r.bottom > vr.top && r.top < vr.bottom) {
        return Number(n.getAttribute('data-br-i'));
      }
    }
    return -1;
  });
}

async function visibleIdx(page, idx) {
  return page.evaluate((i) => {
    const v = document.querySelector('.br-view');
    const vr = v.getBoundingClientRect();
    const n = document.querySelector(`.br-flow > [data-br-i="${i}"]`);
    if (!n) return { found: false, ok: false };
    const rects = Array.from(n.getClientRects());
    const ok = rects.some((r) => r.right > vr.left + 1 && r.left < vr.right - 1);
    return { found: true, ok };
  }, idx);
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.evaluate(() => {
    const r = document.querySelector('.br-root');
    if (r) window.scrollTo(0, window.scrollY + r.getBoundingClientRect().top - 150);
  });
  await page.waitForTimeout(250);
  const root = await page.$('.br-root');
  if (root) await root.screenshot({ path: path.join(OUT_DIR, name) });
}

async function m1(page, tag, sheet) {
  await page.evaluate(() => {
    const a = document.getElementById('sheet-article');
    a.querySelectorAll('figure[data-diagram]').forEach((f) => { f.__mark = true; });
    a.querySelectorAll('p').forEach((p) => { p.__mark = true; });
    window.__orig = Array.from(a.childNodes);
    window.__preHTML = a.innerHTML;
    window.__preSW = document.documentElement.scrollWidth;
    window.__figCount = a.querySelectorAll('figure[data-diagram]').length;
    window.__expPlates = window.__orig.filter((n) => n.nodeType === 1 && (n.matches('figure[data-diagram], figure.lesson-infographic') || n.querySelector('figure[data-diagram]'))).length;
    window.__expReplay = window.__orig.filter((n, i) => {
      if (n.nodeType !== 1 || !(n.matches('figure[data-diagram], figure.lesson-infographic') || n.querySelector('figure[data-diagram]'))) return false;
      let j = i + 1;
      while (j < window.__orig.length && window.__orig[j].nodeType === 3 && !/\S/.test(window.__orig[j].nodeValue)) j += 1;
      return j < window.__orig.length && window.__orig[j].nodeType === 1 && window.__orig[j].matches('[data-chain-replay]');
    }).length;
  });
  const mounted = await page.evaluate((sh) => {
    const a = document.getElementById('sheet-article');
    return window.BookReader.mount(a, { sheetIndex: sh, title: 'Test sitting', kicker: 'Sitting test', restore: false });
  }, sheet);
  check(tag, 'M1.1 mount returns true', mounted === true);
  const s1 = await page.evaluate(() => ({ root: !!document.querySelector('#sheet-article > .br-root'), state: window.BookReader.state(), mounted: document.getElementById('sheet-article').classList.contains('br-mounted'), active: window.BookReader.isActive() }));
  check(tag, 'M1.1 .br-root present and mounted class set', s1.root && s1.mounted && s1.active);
  check(tag, 'M1.1 state().steps >= 2', s1.state.steps >= 2, `steps=${s1.state.steps}`);
  const g = await geom(page);
  check(tag, 'M1.1 mode matches viewport', s1.state.mode === g.expMode, `mode=${s1.state.mode} expected=${g.expMode}`);
  const ident = await page.evaluate(() => {
    const a = document.getElementById('sheet-article');
    const tagged = Array.from(a.querySelectorAll('figure[data-diagram], p'));
    const marked = Array.from(document.querySelectorAll('figure[data-diagram]')).length;
    const allMarked = tagged.every((n) => n.__mark === true && document.contains(n));
    const figsStill = a.querySelectorAll('figure[data-diagram]').length === window.__figCount;
    const onlyRoot = a.childNodes.length === 1 && a.firstChild.classList && a.firstChild.classList.contains('br-root');
    const noOrig = window.__orig.every((n) => n.parentNode !== a || n === a.firstChild);
    return { taggedCount: tagged.length, allMarked, figsStill, onlyRoot, noOrig, marked };
  });
  check(tag, 'M1.2 identity: every tagged figure/p still in document with __mark', ident.allMarked, `tagged=${ident.taggedCount}`);
  check(tag, 'M1.2 figure[data-diagram] count unchanged', ident.figsStill, `figs=${ident.marked}`);
  check(tag, 'M1.2 article has only .br-root as direct child', ident.onlyRoot && ident.noOrig);
  const seg = await page.evaluate(() => {
    const a = document.getElementById('sheet-article');
    const plates = Array.from(document.querySelectorAll('.br-item.is-plate')).length;
    const texts = Array.from(document.querySelectorAll('.br-item.is-text')).length;
    const figInPlate = Array.from(document.querySelectorAll('figure[data-diagram]')).every((f) => f.closest('.br-plate'));
    const replayInPlate = Array.from(document.querySelectorAll('.br-plate [data-chain-replay]')).length;
    const idxOk = window.__orig.every((n, i) => n.nodeType !== 1 || n.getAttribute('data-br-i') === String(i));
    return { plates, texts, figInPlate, replayInPlate, idxOk, expPlates: window.__expPlates, expReplay: window.__expReplay };
  });
  check(tag, 'M1.3 plate items match original plate nodes', seg.plates === seg.expPlates, `plates=${seg.plates} expected=${seg.expPlates}`);
  check(tag, 'M1.3 every figure sits inside a .br-plate', seg.figInPlate);
  check(tag, 'M1.3 replay buttons grouped with their plate', seg.replayInPlate === seg.expReplay, `replay=${seg.replayInPlate} expected=${seg.expReplay}`);
  check(tag, 'M1.3 text items exist', seg.texts >= 1, `texts=${seg.texts}`);
  check(tag, 'M1.4 data-br-i equals original index for top-level elements', seg.idxOk);

  await page.evaluate(() => { window.BookReader.setView('scroll'); });
  const sw = await page.evaluate(() => {
    const a = document.getElementById('sheet-article');
    const kids = Array.from(a.childNodes).filter((n) => !(n.nodeType === 1 && n.classList.contains('br-switch')));
    const orderOk = kids.length === window.__orig.length && kids.every((n, i) => n === window.__orig[i]);
    return {
      root: !!a.querySelector('.br-root'),
      sw: !!a.querySelector('.br-switch'),
      orderOk,
      active: window.BookReader.isActive(),
      view: window.BookReader.view(),
      firstIsSwitch: !!(a.firstChild && a.firstChild.classList && a.firstChild.classList.contains('br-switch'))
    };
  });
  check(tag, 'M1.5 setView(scroll) removes .br-root, shows .br-switch', !sw.root && sw.sw && !sw.active && sw.view === 'scroll' && sw.firstIsSwitch);
  check(tag, 'M1.5 scroll view keeps original node order (identity)', sw.orderOk);
  await page.evaluate(() => { window.BookReader.setView('book'); });
  const bk = await page.evaluate(() => ({ root: !!document.querySelector('#sheet-article > .br-root'), sw: !!document.querySelector('.br-switch'), active: window.BookReader.isActive(), view: window.BookReader.view() }));
  check(tag, 'M1.5 setView(book) mounts again and removes switch', bk.root && !bk.sw && bk.active && bk.view === 'book');

  const un = await page.evaluate(() => {
    window.BookReader.unmount();
    const a = document.getElementById('sheet-article');
    const same = a.innerHTML === window.__preHTML;
    let firstDiff = -1;
    if (!same) {
      const x = a.innerHTML;
      const y = window.__preHTML;
      for (let i = 0; i < Math.min(x.length, y.length); i += 1) { if (x[i] !== y[i]) { firstDiff = i; break; } }
      if (firstDiff < 0) firstDiff = Math.min(x.length, y.length);
    }
    const beforeSecond = a.innerHTML;
    window.BookReader.unmount();
    return { same, firstDiff, idempotent: a.innerHTML === beforeSecond, active: window.BookReader.isActive(), root: !!a.querySelector('.br-root'), mounted: a.classList.contains('br-mounted'), sw: !!a.querySelector('.br-switch'), markOk: Array.from(a.querySelectorAll('p')).every((p) => p.__mark === true) };
  });
  check(tag, 'M1.6 unmount restores articleEl.innerHTML exactly', un.same, un.same ? '' : `first diff at ${un.firstDiff}`);
  check(tag, 'M1.6 unmount idempotent and clean', un.idempotent && !un.active && !un.root && !un.mounted && !un.sw && un.markOk);

  const inj = await page.evaluate((sh) => {
    const a = document.getElementById('sheet-article');
    window.BookReader.mount(a, { sheetIndex: sh, title: 'Test sitting', kicker: 'Sitting test', restore: false });
    const p = document.querySelector('.br-flow > p');
    const node = document.createElement('span');
    node.className = 'test-injected';
    node.hidden = true;
    p.parentNode.insertBefore(node, p.nextSibling);
    window.BookReader.unmount();
    return { before: p.nextSibling === node, parentIsArticle: node.parentNode === a, prevIsP: node.previousSibling === p, prevAfter: node.previousSibling && node.previousSibling.nodeType === 1 ? node.previousSibling.tagName : null };
  }, sheet);
  check(tag, 'M1.7 node injected inside a flow survives unmount in place', inj.parentIsArticle && inj.prevIsP, `prev=${inj.prevAfter}`);
  await page.evaluate(() => { const n = document.querySelector('.test-injected'); if (n) n.remove(); });
  await page.evaluate((sh) => {
    const a = document.getElementById('sheet-article');
    window.BookReader.mount(a, { sheetIndex: sh, title: 'Test sitting', kicker: 'Sitting test', restore: false });
  }, sheet);
}

async function m2(page, tag, vpName, sheet) {
  await page.evaluate(() => {
    window.__end = 0;
    window.__turns = 0;
    document.addEventListener('bookreader:end', () => { window.__end += 1; });
    document.addEventListener('bookreader:turn', () => { window.__turns += 1; });
  });

  const clip = await page.evaluate(() => {
    const bad = Array.from(document.querySelectorAll('.br-flow')).filter((f) => f.scrollWidth > f.clientWidth + 1).length;
    const flows = document.querySelectorAll('.br-flow').length;
    return { bad, flows };
  });
  check(tag, 'M2.1 no clipped columns (flow.scrollWidth <= clientWidth + 1)', clip.bad === 0 && clip.flows > 0, `flows=${clip.flows} bad=${clip.bad}`);

  const g0 = await geom(page);
  check(tag, 'M2.2 view width equals the geometry rule', g0.Vw === g0.expVw, `Vw=${g0.Vw} expected=${g0.expVw}`);
  const first = await currentItem(page);
  check(tag, 'M2.2 text view height equals the Vh rule on text steps', first.plate || g0.Vh === g0.expVh, `Vh=${g0.Vh} expected=${g0.expVh} plate=${first.plate}`);
  const tr = await page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const track = document.querySelector('.br-track');
    const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
    const multiples = items.every((it) => Math.abs(it.getBoundingClientRect().width / v.clientWidth - Math.round(it.getBoundingClientRect().width / v.clientWidth)) < 0.01);
    return { trackSteps: Math.round(track.getBoundingClientRect().width / v.clientWidth), steps: window.BookReader.state().steps, multiples };
  });
  check(tag, 'M2.2 track width equals steps * Vw and items are whole steps', tr.trackSteps === tr.steps && tr.multiples, `track=${tr.trackSteps} steps=${tr.steps}`);

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(60);
  let walkOk = true;
  let walkDetail = '';
  let plateFails = 0;
  let plateSeen = 0;
  let docFails = 0;
  const totalSteps = (await page.evaluate(() => window.BookReader.state().steps));
  for (let i = 0; i < totalSteps; i += 1) {
    if (i > 0) {
      const moved = await page.evaluate(() => window.BookReader.next());
      if (!moved) { walkOk = false; walkDetail = `next() refused at ${i}`; break; }
      await settle(page);
    }
    const gg = await geom(page);
    if (gg.step !== i || Math.abs(gg.scrollLeft - i * gg.Vw) > 1) {
      walkOk = false;
      walkDetail = `step ${i}: step=${gg.step} scrollLeft=${gg.scrollLeft} expected=${i * gg.Vw}`;
      break;
    }
    const it = await currentItem(page);
    if (it.plate) {
      plateSeen += 1;
      if (it.figOk === false) plateFails += 1;
    }
    const docOk = await page.evaluate(() => document.documentElement.scrollWidth <= Math.max(innerWidth, window.__preSW || 0) + 1);
    if (!docOk) docFails += 1;
  }
  check(tag, 'M2.3 walking next() lands every step on step*Vw (within 1px)', walkOk, walkDetail);
  check(tag, 'M2.3 plate figures fit the view horizontally', plateFails === 0, `plates=${plateSeen} fails=${plateFails}`);
  check(tag, 'M2.3 document adds no horizontal overflow', docFails === 0, `fails=${docFails}`);
  const endState = await page.evaluate(() => ({ step: window.BookReader.state().step, steps: window.BookReader.state().steps, end: window.__end }));
  check(tag, 'M2.4 bookreader:end fired once at the last step', endState.step === endState.steps - 1 && endState.end === 1, `end=${endState.end} step=${endState.step}/${endState.steps}`);
  const again = await page.evaluate(() => window.BookReader.next());
  check(tag, 'M2.4 next() at the last step does nothing', again === false);

  const rev = await page.evaluate(() => {
    const target = document.querySelector('#sheet-article [id="part-ii"]') || document.querySelectorAll('#sheet-article .part-header')[1];
    window.__revealTarget = target;
    return { ok: !!target, id: target ? target.id : '' };
  });
  if (check(tag, 'M2.5 a second part header exists to reveal', rev.ok, rev.id || 'none')) {
    await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
    const did = await page.evaluate(() => window.BookReader.reveal(window.__revealTarget));
    await settle(page);
    const vis = await page.evaluate(() => {
      const v = document.querySelector('.br-view').getBoundingClientRect();
      const r = window.__revealTarget.getBoundingClientRect();
      const rects = Array.from(window.__revealTarget.getClientRects());
      return rects.some((x) => x.right > v.left + 1 && x.left < v.right - 1) || (r.right > v.left && r.left < v.right);
    });
    check(tag, 'M2.5 reveal(element) returns true and the element intersects the view', did === true && vis, `did=${did}`);
    const bad = await page.evaluate(() => window.BookReader.reveal('#no-such-element-here'));
    check(tag, 'M2.5 reveal of a missing id returns false', bad === false);
    const outside = await page.evaluate(() => window.BookReader.reveal(document.querySelector('.sitting-roadmap, #sitting-roadmap, body')));
    check(tag, 'M2.5 reveal of an element outside the book returns false', outside === false);
  }

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await settle(page);
  const hash = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('#sheet-article nav.lesson-toc a[href^="#"]'));
    const pick = links.find((a) => {
      const id = a.getAttribute('href').slice(1);
      const t = document.getElementById(id);
      return t && document.querySelector('.br-root').contains(t) && id !== 'intro';
    });
    if (!pick) return { ok: false };
    window.__hashTarget = document.getElementById(pick.getAttribute('href').slice(1));
    const before = location.hash;
    pick.click();
    return { ok: true, href: pick.getAttribute('href'), before, after: location.hash };
  });
  if (check(tag, 'M2.6 a TOC link targets an element inside the book', hash.ok)) {
    await settle(page);
    const vis = await page.evaluate(() => {
      const v = document.querySelector('.br-view').getBoundingClientRect();
      return Array.from(window.__hashTarget.getClientRects()).some((x) => x.right > v.left + 1 && x.left < v.right - 1);
    });
    check(tag, 'M2.6 TOC link click reveals its target without changing the URL hash', vis && hash.before === hash.after, `href=${hash.href}`);
  }

  const cur = await geom(page);
  const anchorBefore = await anchorIdx(page);
  const other = vpName === 'desktop' ? VP.mobile : VP.desktop;
  await page.setViewportSize({ width: other.w, height: other.h });
  await page.waitForTimeout(700);
  const g1 = await geom(page);
  const vis1 = anchorBefore >= 0 ? await visibleIdx(page, anchorBefore) : { ok: true };
  check(tag, 'M2.7 resize flips the mode', g1.mode === g1.expMode && g1.mode !== cur.mode, `from=${cur.mode} to=${g1.mode}`);
  check(tag, 'M2.7 resize keeps the anchor block visible', vis1.ok === true, `anchor=${anchorBefore}`);
  await page.setViewportSize({ width: VP[vpName].w, height: VP[vpName].h });
  await page.waitForTimeout(700);
  const g2 = await geom(page);
  const vis2 = anchorBefore >= 0 ? await visibleIdx(page, anchorBefore) : { ok: true };
  check(tag, 'M2.7 resize back restores the mode and the anchor', g2.mode === cur.mode && vis2.ok === true, `mode=${g2.mode}`);

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await settle(page);
  const plates = await page.evaluate(() => Array.from(document.querySelectorAll('.br-track > .br-item')).map((it, i) => ({ i, plate: it.classList.contains('is-plate') })).filter((p) => p.plate).map((p) => p.i));
  let heightFails = 0;
  let plateChecked = 0;
  for (const pi of plates.slice(0, 3)) {
    const start = await page.evaluate((idx) => {
      const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
      const v = document.querySelector('.br-view');
      const tr = document.querySelector('.br-track').getBoundingClientRect();
      const it = items[idx];
      return Math.round((it.getBoundingClientRect().left - tr.left) / v.clientWidth);
    }, pi);
    await page.evaluate((s) => { window.BookReader.goTo(s, { instant: true }); }, start);
    await page.waitForTimeout(380);
    const gp = await geom(page);
    const it = await currentItem(page);
    plateChecked += 1;
    const capOk = gp.Vh >= gp.expVh - 1 && gp.Vh <= gp.expVh * 2.4 + 1;
    const fits = (it.boxScroll !== null && it.boxScroll <= it.boxClient + 1) || gp.Vh >= gp.expVh * 2.4 - 1;
    if (!(capOk && fits)) heightFails += 1;
  }
  check(tag, 'M2.8 plate steps grow the view up to 2.4*Vh and scroll beyond that', plateChecked > 0 && heightFails === 0, `plates=${plateChecked} fails=${heightFails}`);
  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(400);
  const gt = await geom(page);
  check(tag, 'M2.8 text steps return the view to Vh', gt.Vh === gt.expVh, `Vh=${gt.Vh} expected=${gt.expVh}`);

  const fsResult = await page.evaluate(() => {
    const f = document.querySelector('.br-plate figure[data-diagram]');
    return { ok: !!f, hasBtn: !!(f && f.querySelector('.chain-fs')) };
  });
  if (fsResult.ok && fsResult.hasBtn) {
    const plateStart = plates.length ? await page.evaluate((pi) => {
      const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
      const v = document.querySelector('.br-view');
      const tr = document.querySelector('.br-track').getBoundingClientRect();
      return Math.round((items[pi].getBoundingClientRect().left - tr.left) / v.clientWidth);
    }, plates[0]) : 0;
    await page.evaluate((s) => { window.BookReader.goTo(s, { instant: true }); }, plateStart);
    await page.waitForTimeout(350);
    const full = await page.evaluate(() => {
      const f = document.querySelector('.br-plate figure[data-diagram]');
      f.querySelector('.chain-fs').click();
      return new Promise((resolve) => setTimeout(() => {
        const r = f.getBoundingClientRect();
        resolve({ isFull: f.classList.contains('is-full'), w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, pos: getComputedStyle(f).position });
      }, 450));
    });
    const covers = full.isFull && full.pos === 'fixed' && full.w >= full.vw - 2 && full.h >= full.vh - 2;
    check(tag, 'M2.9 a diagram can go full screen (not trapped by the book)', covers, `pos=${full.pos} rect=${Math.round(full.w)}x${Math.round(full.h)} vp=${full.vw}x${full.vh}`);
    await page.evaluate(() => {
      const f = document.querySelector('.br-plate figure[data-diagram]');
      if (f.classList.contains('is-full')) f.querySelector('.chain-fs').click();
    });
    await page.waitForTimeout(400);
    const exited = await page.evaluate(() => !document.querySelector('figure[data-diagram].is-full'));
    check(tag, 'M2.9 the full-screen diagram exits cleanly', exited);
  } else {
    info(tag, 'M2.9 skipped: no diagram full-screen control on this sheet');
  }

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(200);
  const anc = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.br-root figure[data-diagram]').forEach((f) => {
      let n = f.parentElement;
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n);
        const hit = (cs.transform !== 'none') || (cs.filter !== 'none') || (cs.perspective !== 'none') || (cs.contain !== 'none' && cs.contain !== '') || (cs.willChange && cs.willChange.indexOf('transform') >= 0) || (cs.backdropFilter && cs.backdropFilter !== 'none');
        if (hit && !(n.classList && (n.classList.contains('br-paper') && document.querySelector('.br-book.is-turning')))) {
          bad.push(`${n.tagName}.${String(n.className).slice(0, 40)} transform=${cs.transform} filter=${cs.filter}`);
          break;
        }
        n = n.parentElement;
      }
    });
    return bad;
  });
  check(tag, 'M2.10 no transform/filter/contain on ancestors of figures at rest (inside the book)', anc.length === 0, anc.slice(0, 2).join(' | '));
}

async function m3(page, tag, vpName, sheet) {
  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.evaluate(() => { const r = document.querySelector('.br-root'); r.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(200);
  const s0 = (await geom(page)).step;
  await page.click('.br-next');
  await settle(page);
  const a1 = await geom(page);
  check(tag, 'M3.1 next button turns one step', a1.step === s0 + 1, `step=${a1.step}`);
  await page.click('.br-prev');
  await settle(page);
  check(tag, 'M3.1 previous button turns back', (await geom(page)).step === s0);
  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(100);
  const prevDis = await page.evaluate(() => document.querySelector('.br-prev').getAttribute('aria-disabled'));
  /* aria-disabled is a Playwright actionability stop, so the "stays put" press
     is a DOM click on the same handler a pointer would reach. */
  await page.evaluate(() => { document.querySelector('.br-prev').click(); });
  await page.waitForTimeout(120);
  check(tag, 'M3.1 previous at the first step stays put and is marked disabled', prevDis === 'true' && (await geom(page)).step === 0);

  await page.focus('.br-book');
  await page.keyboard.press('ArrowRight');
  await settle(page);
  check(tag, 'M3.2 ArrowRight with focus on .br-book turns', (await geom(page)).step === 1);
  await page.keyboard.press('ArrowLeft');
  await settle(page);
  check(tag, 'M3.2 ArrowLeft turns back', (await geom(page)).step === 0);
  await page.keyboard.press('End');
  await settle(page);
  const last = (await geom(page));
  check(tag, 'M3.2 End goes to the last step', last.step === last.steps - 1, `step=${last.step}`);
  await page.keyboard.press('Home');
  await settle(page);
  check(tag, 'M3.2 Home goes to the first step', (await geom(page)).step === 0);
  await page.keyboard.press('PageDown');
  await settle(page);
  check(tag, 'M3.2 PageDown turns forward', (await geom(page)).step === 1);
  await page.keyboard.press('PageUp');
  await settle(page);
  check(tag, 'M3.2 PageUp turns back', (await geom(page)).step === 0);
  await page.keyboard.press('Space');
  await settle(page);
  check(tag, 'M3.2 Space turns forward', (await geom(page)).step === 1);
  await page.keyboard.press('Shift+Space');
  await settle(page);
  check(tag, 'M3.2 Shift+Space turns back', (await geom(page)).step === 0);

  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); document.querySelector('.br-root').scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(120);
  const bodyFocus = await page.evaluate(() => document.activeElement === document.body);
  if (bodyFocus) {
    await page.keyboard.press('ArrowRight');
    await settle(page);
    check(tag, 'M3.3 ArrowRight with focus on body turns when the book is visible', (await geom(page)).step === 1);
    await page.keyboard.press('ArrowLeft');
    await settle(page);
  } else {
    info(tag, 'M3.3 skipped: focus did not land on body');
  }

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(100);
  const plateStep = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
    const v = document.querySelector('.br-view');
    const tr = document.querySelector('.br-track').getBoundingClientRect();
    const it = items.find((x) => x.classList.contains('is-plate'));
    return it ? Math.round((it.getBoundingClientRect().left - tr.left) / v.clientWidth) : -1;
  });
  if (plateStep >= 0) {
    await page.evaluate((s) => { window.BookReader.goTo(s, { instant: true }); }, plateStep);
    await page.waitForTimeout(150);
    const before = (await geom(page)).step;
    const focused = await page.evaluate(() => {
      const btn = document.querySelector('.br-plate button');
      if (!btn) return false;
      btn.focus({ preventScroll: true });
      return document.activeElement === btn;
    });
    if (check(tag, 'M3.4 a button inside a plate can take focus', focused)) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      const r1 = (await geom(page)).step;
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(150);
      const r2 = (await geom(page)).step;
      await page.keyboard.press('Home');
      await page.keyboard.press('End');
      await page.waitForTimeout(150);
      const r3 = (await geom(page)).step;
      check(tag, 'M3.4 arrow keys from a plate button do not change the step (addendum)', r1 === before && r2 === before && r3 === before, `before=${before} r=${r1},${r2},${r3}`);
    }
  } else {
    info(tag, 'M3.4 skipped: no plate on this sheet');
  }

  await page.evaluate(() => { window.BookReader.goTo(2, { instant: true }); });
  await settle(page);
  await page.evaluate(() => { document.querySelector('.br-root').scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(150);
  const edge = await page.evaluate(() => {
    const p = document.querySelector('.br-paper').getBoundingClientRect();
    const v = document.querySelector('.br-view').getBoundingClientRect();
    const CLICK_SKIP = 'a, button, input, textarea, select, label, [contenteditable], .term-gloss, [data-term-index], .br-plate';
    const find = (x) => {
      for (let f = 0.25; f <= 0.75; f += 0.05) {
        const y = v.top + v.height * f;
        const n = document.elementFromPoint(x, y);
        if (n && !(n.closest && n.closest(CLICK_SKIP))) return { x, y };
      }
      return null;
    };
    const left = find(p.left + p.width * 0.07);
    const right = find(p.right - p.width * 0.07);
    return { left, right };
  });
  if (edge.right) {
    const before = (await geom(page)).step;
    await page.mouse.click(edge.right.x, edge.right.y);
    await settle(page);
    check(tag, 'M3.5 click in the right 16% of the paper turns forward', (await geom(page)).step === before + 1);
  } else info(tag, 'M3.5 right edge had no safe click point');
  if (edge.left) {
    const before = (await geom(page)).step;
    await page.mouse.click(edge.left.x, edge.left.y);
    await settle(page);
    check(tag, 'M3.5 click in the left 16% of the paper turns back', (await geom(page)).step === before - 1);
  } else info(tag, 'M3.5 left edge had no safe click point');

  const beforeSwipe = (await geom(page)).step;
  await page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const r = v.getBoundingClientRect();
    const x0 = r.left + r.width * 0.7;
    const y0 = r.top + r.height * 0.3;
    v.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 9, isPrimary: true, clientX: x0, clientY: y0, bubbles: true }));
    v.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 9, isPrimary: true, clientX: x0 - 140, clientY: y0 + 6, bubbles: true }));
  });
  await settle(page);
  check(tag, 'M3.6 touch swipe left (>40px, mostly horizontal) turns forward', (await geom(page)).step === beforeSwipe + 1);
  await page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const r = v.getBoundingClientRect();
    const x0 = r.left + r.width * 0.3;
    const y0 = r.top + r.height * 0.3;
    v.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 10, isPrimary: true, clientX: x0, clientY: y0, bubbles: true }));
    v.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 10, isPrimary: true, clientX: x0 + 140, clientY: y0 + 4, bubbles: true }));
  });
  await settle(page);
  check(tag, 'M3.6 touch swipe right turns back', (await geom(page)).step === beforeSwipe);
  await page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const r = v.getBoundingClientRect();
    const x0 = r.left + r.width * 0.5;
    const y0 = r.top + r.height * 0.3;
    v.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 11, isPrimary: true, clientX: x0, clientY: y0, bubbles: true }));
    v.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 11, isPrimary: true, clientX: x0 - 140, clientY: y0 + 150, bubbles: true }));
  });
  await settle(page);
  check(tag, 'M3.6 a mostly vertical gesture does not turn', (await geom(page)).step === beforeSwipe);

  const pz = await page.evaluate(() => {
    const p = document.querySelector('.br-paper').getBoundingClientRect();
    return { x: p.left + p.width / 2, y: p.top + p.height / 2 };
  });
  await page.mouse.move(pz.x, pz.y);
  const wheelStart = (await geom(page)).step;
  await page.mouse.wheel(160, 0);
  await page.waitForTimeout(260);
  await settle(page);
  const wheelOne = (await geom(page)).step;
  await page.mouse.wheel(160, 0);
  await page.waitForTimeout(120);
  await settle(page);
  const wheelThrottled = (await geom(page)).step;
  await page.waitForTimeout(450);
  await page.mouse.wheel(160, 0);
  await page.waitForTimeout(260);
  await settle(page);
  const wheelTwo = (await geom(page)).step;
  check(tag, 'M3.7 horizontal wheel turns once, then is throttled', wheelOne === wheelStart + 1 && wheelThrottled === wheelOne, `${wheelStart}->${wheelOne}->${wheelThrottled}`);
  check(tag, 'M3.7 horizontal wheel turns again after the 400ms throttle', wheelTwo === wheelOne + 1, `two=${wheelTwo}`);

  await page.evaluate(() => {
    window.__cont = 0;
    window.__contDetail = null;
    document.addEventListener('bookreader:continue', (e) => { window.__cont += 1; window.__contDetail = e.detail; });
    window.BookReader.goTo(window.BookReader.state().steps - 1, { instant: true });
  });
  await page.waitForTimeout(120);
  const lastLabel = await page.evaluate(() => {
    const b = document.querySelector('.br-next');
    return { label: b.getAttribute('aria-label'), text: b.textContent.trim(), cls: b.classList.contains('is-continue') };
  });
  check(tag, 'M3.8 the last step shows a Continue next button', lastLabel.label === 'Continue' && lastLabel.text === 'Continue' && lastLabel.cls, JSON.stringify(lastLabel));
  await page.click('.br-next');
  await page.waitForTimeout(150);
  const contInfo = await page.evaluate(() => ({ n: window.__cont, step: window.BookReader.state().step, steps: window.BookReader.state().steps, end: window.__end }));
  check(tag, 'M3.8 pressing Continue dispatches bookreader:continue and does not turn', contInfo.n === 1 && contInfo.step === contInfo.steps - 1, JSON.stringify(contInfo));
  check(tag, 'M3.8 bookreader:end fired at the last step', contInfo.end >= 1);
  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(100);
  const firstLabel = await page.evaluate(() => { const b = document.querySelector('.br-next'); return { label: b.getAttribute('aria-label'), text: b.textContent.trim() }; });
  check(tag, 'M3.8 other steps keep the Next page button', firstLabel.label === 'Next page' && firstLabel.text === '', JSON.stringify(firstLabel));

  const mid = Math.max(1, Math.floor((await geom(page)).steps / 2));
  await page.evaluate((m) => { window.BookReader.goTo(m, { instant: true }); }, mid);
  await page.waitForTimeout(120);
  const saved = await page.evaluate((sh) => localStorage.getItem('daniel_book_pos_' + sh), sheet);
  check(tag, 'M3.9 turning stores the anchor for this sheet', saved !== null && /^\d+$/.test(saved), `saved=${saved}`);
  await page.evaluate((sh) => {
    const a = document.getElementById('sheet-article');
    window.BookReader.unmount();
    window.BookReader.mount(a, { sheetIndex: sh, title: 'Test sitting', kicker: 'Sitting test', restore: true });
  }, sheet);
  await page.waitForTimeout(150);
  const restored = await geom(page);
  check(tag, 'M3.9 mount with restore:true returns to the saved step', restored.step === mid, `step=${restored.step} expected=${mid}`);
  await page.evaluate((sh) => {
    const a = document.getElementById('sheet-article');
    window.BookReader.unmount();
    window.BookReader.mount(a, { sheetIndex: sh, title: 'Test sitting', kicker: 'Sitting test', restore: false });
  }, sheet);
  await page.waitForTimeout(120);
  check(tag, 'M3.9 mount without restore starts at the first step', (await geom(page)).step === 0);

  await page.evaluate(() => { window.BookReader.setView('scroll'); });
  const viewSaved = await page.evaluate(() => ({ pref: localStorage.getItem('daniel_book_view'), view: window.BookReader.view(), sw: !!document.querySelector('.br-switch'), root: !!document.querySelector('.br-root') }));
  check(tag, 'M3.9 setView(scroll) persists the preference and shows the switch bar', viewSaved.pref === 'scroll' && viewSaved.view === 'scroll' && viewSaved.sw && !viewSaved.root, JSON.stringify(viewSaved));
  const remount = await page.evaluate((sh) => {
    const a = document.getElementById('sheet-article');
    const ok = window.BookReader.mount(a, { sheetIndex: sh, title: 'Test sitting', kicker: 'Sitting test', restore: false });
    return { ok, active: window.BookReader.isActive(), sw: !!document.querySelector('.br-switch') };
  }, sheet);
  check(tag, 'M3.9 with scroll preference, mount shows only the switch bar', remount.ok === true && remount.active === false && remount.sw === true);
  await page.evaluate(() => { document.querySelector('.br-switch-btn').click(); });
  await page.waitForTimeout(150);
  const backBook = await page.evaluate(() => ({ view: window.BookReader.view(), active: window.BookReader.isActive(), sw: !!document.querySelector('.br-switch') }));
  check(tag, 'M3.9 the switch bar returns to the book', backBook.view === 'book' && backBook.active && !backBook.sw);

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(120);
  const fsBefore = await page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const vr = v.getBoundingClientRect();
    const idxs = Array.from(document.querySelectorAll('.br-flow > *')).filter((n) => {
      const r = n.getBoundingClientRect();
      return r.left >= vr.left - 1 && r.left < vr.right - 1 && r.bottom > vr.top && r.top < vr.bottom;
    }).map((n) => Number(n.getAttribute('data-br-i')));
    return { steps: window.BookReader.state().steps, anchor: idxs[0] };
  });
  await page.evaluate(() => { document.documentElement.style.setProperty('--reading-font-size', '1.5rem'); });
  await page.waitForTimeout(500);
  const bigger = await geom(page);
  const anchorBig = await visibleIdx(page, fsBefore.anchor);
  check(tag, 'M3.10 larger --reading-font-size repaginates to more steps', bigger.steps > fsBefore.steps, `steps ${fsBefore.steps} -> ${bigger.steps}`);
  check(tag, 'M3.10 the anchor block stays visible after re-pagination', anchorBig.ok === true, `anchor=${fsBefore.anchor}`);
  await page.evaluate(() => { document.documentElement.style.removeProperty('--reading-font-size'); });
  await page.waitForTimeout(500);
  check(tag, 'M3.10 restoring the font size restores the steps', (await geom(page)).steps === fsBefore.steps, `steps=${(await geom(page)).steps}`);

  const cardBtn = await page.evaluate(() => {
    const b = document.querySelector('.br-flow .framework-card > .cardmin-btn') || document.querySelector('.br-flow .cardmin-btn');
    return !!b;
  });
  if (cardBtn) {
    await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
    await page.waitForTimeout(100);
    const stepsA = (await geom(page)).steps;
    const pickStep = await page.evaluate(() => {
      const b = document.querySelector('.br-flow .framework-card > .cardmin-btn') || document.querySelector('.br-flow .cardmin-btn');
      b.__pick = true;
      const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
      const v = document.querySelector('.br-view');
      const tr = document.querySelector('.br-track').getBoundingClientRect();
      const it = items.find((x) => x.contains(b));
      return it ? Math.round((it.getBoundingClientRect().left - tr.left) / v.clientWidth) : 0;
    });
    await page.evaluate((s) => { window.BookReader.goTo(s, { instant: true }); }, pickStep);
    await page.waitForTimeout(120);
    const anchorC = await anchorIdx(page);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.br-flow .cardmin-btn')).find((x) => x.__pick); (b || document.querySelector('.br-flow .cardmin-btn')).click(); });
    await page.waitForTimeout(550);
    const stepsB = (await geom(page)).steps;
    const visC = anchorC >= 0 ? (await visibleIdx(page, anchorC)).ok : true;
    check(tag, 'M3.11 collapsing a card re-measures the steps and keeps the anchor', stepsB <= stepsA && visC, `steps ${stepsA} -> ${stepsB}`);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.br-flow .cardmin-btn')).find((x) => x.__pick) || document.querySelector('.br-flow .cardmin-btn'); b.click(); });
    await page.waitForTimeout(550);
    check(tag, 'M3.11 expanding the card restores the step count', (await geom(page)).steps === stepsA, `steps=${(await geom(page)).steps} expected=${stepsA}`);
  } else {
    info(tag, 'M3.11 skipped: no card minimize control on this sheet');
  }
}

async function m4(page, tag, vpName, sheet) {
  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  const themes = ['charcoal-mode', 'night-mode', 'paper-mode', 'white-mode'];
  const lum = (rgb) => {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    const c = [m[1], m[2], m[3]].map((v) => {
      const x = Number(v) / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  for (const th of themes) {
    await page.evaluate((t) => {
      const list = ['charcoal-mode', 'night-mode', 'paper-mode', 'white-mode'];
      list.forEach((c) => document.body.classList.remove(c));
      document.body.classList.add(t);
    }, th);
    await page.waitForTimeout(450);
    const c = await page.evaluate(() => {
      const p = document.querySelector('.br-flow p');
      const paper = document.querySelector('.br-paper');
      return { color: p ? getComputedStyle(p).color : null, bg: getComputedStyle(paper).backgroundColor, flowBg: getComputedStyle(document.querySelector('.br-flow')).backgroundColor };
    });
    const lc = lum(c.color || '');
    const lb = lum(c.bg || '');
    check(tag, `M4.1 theme ${th}: paragraph ink is dark and paper is light`, lc !== null && lb !== null && lc < 0.35 && lb > 0.6, `ink=${c.color} paper=${c.bg}`);
    if (SHOTS && vpName === 'desktop' && sheet === 0) {
      await shot(page, `theme-${th}.png`);
    }
  }
  await page.evaluate(() => {
    ['charcoal-mode', 'night-mode', 'paper-mode', 'white-mode'].forEach((c) => document.body.classList.remove(c));
    document.body.classList.add('charcoal-mode');
  });
  await page.waitForTimeout(300);
  if (SHOTS && sheet === 0) {
    await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
    await page.waitForTimeout(250);
    await shot(page, vpName === 'desktop' ? '01-first-spread.png' : '05-mobile-single-first.png');
    if (vpName === 'desktop') {
      const mid = Math.floor((await geom(page)).steps / 2);
      await page.evaluate((m) => { window.BookReader.goTo(m, { instant: true }); }, mid);
      await page.waitForTimeout(300);
      await shot(page, '02-mid-lesson-spread.png');
      const plateStart = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
        const v = document.querySelector('.br-view');
        const tr = document.querySelector('.br-track').getBoundingClientRect();
        const it = items.find((x) => x.classList.contains('is-plate'));
        return it ? Math.round((it.getBoundingClientRect().left - tr.left) / v.clientWidth) : -1;
      });
      if (plateStart >= 0) {
        await page.evaluate((s) => { window.BookReader.goTo(s, { instant: true }); }, plateStart);
        await page.waitForTimeout(600);
        await shot(page, '03-plate-step.png');
      }
      await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
      await page.waitForTimeout(250);
      await shot(page, '04-contents-first-page.png');
    } else {
      const plateStart = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.br-track > .br-item'));
        const v = document.querySelector('.br-view');
        const tr = document.querySelector('.br-track').getBoundingClientRect();
        const it = items.find((x) => x.classList.contains('is-plate'));
        return it ? Math.round((it.getBoundingClientRect().left - tr.left) / v.clientWidth) : -1;
      });
      if (plateStart >= 0) {
        await page.evaluate((s) => { window.BookReader.goTo(s, { instant: true }); }, plateStart);
        await page.waitForTimeout(600);
        await shot(page, '06-mobile-plate.png');
      }
    }
  }
}

async function m5(page, tag, vpName, sheet) {
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(150);
  const pr = await page.evaluate(() => {
    const cs = (s) => { const n = document.querySelector(s); return n ? getComputedStyle(n) : null; };
    const view = cs('.br-view');
    const flow = cs('.br-flow');
    const track = cs('.br-track');
    const paper = cs('.br-paper');
    return {
      bar: cs('.br-bar') ? cs('.br-bar').display : 'none',
      turn: cs('.br-turn') ? cs('.br-turn').display : 'none',
      viewOverflow: view ? view.overflow : null,
      viewH: view ? view.height : null,
      trackDisplay: track ? track.display : null,
      flowColumns: flow ? flow.columnCount : null,
      paperBg: paper ? paper.backgroundColor : null,
      hScroll: document.documentElement.scrollWidth - innerWidth
    };
  });
  await page.emulateMedia({ media: 'screen' });
  check(tag, 'M5.1 print: chrome hidden, view and track unclipped, flows in normal flow', pr.bar === 'none' && pr.turn === 'none' && pr.viewOverflow === 'visible' && pr.trackDisplay === 'block' && (pr.flowColumns === 'auto' || pr.flowColumns === null || pr.flowColumns === 0 || pr.flowColumns === 1), JSON.stringify(pr));
  check(tag, 'M5.1 print: paper is plain white', pr.paperBg === 'rgb(255, 255, 255)', pr.paperBg);

  const a11y = await page.evaluate(() => {
    const book = document.querySelector('.br-book');
    const root = document.querySelector('.br-root');
    const buttons = Array.from(document.querySelectorAll('.br-root button'));
    const unnamed = buttons.filter((b) => !((b.getAttribute('aria-label') || '').trim() || (b.textContent || '').trim() || b.title)).length;
    const marks = Array.from(document.querySelectorAll('.br-mark')).every((m) => m.getAttribute('aria-label'));
    const pos = document.querySelector('.br-pos');
    return {
      rootLabel: root.getAttribute('aria-label'),
      role: book.getAttribute('role'),
      rd: book.getAttribute('aria-roledescription'),
      label: book.getAttribute('aria-label'),
      live: pos.getAttribute('aria-live'),
      unnamed,
      marks,
      prevDisabled: document.querySelector('.br-prev').getAttribute('aria-disabled'),
      tabIndex: book.tabIndex,
      scrollBtn: !!document.querySelector('[data-br="scroll"]'),
      fullBtn: !!document.querySelector('[data-br="full"]')
    };
  });
  check(tag, 'M5.2 book has group role, roledescription, page label and a live position', a11y.role === 'group' && a11y.rd === 'book' && /page \d+ of \d+/.test(a11y.label) && a11y.live === 'polite' && a11y.rootLabel === 'Lesson as a book', JSON.stringify(a11y));
  check(tag, 'M5.2 every button has a name and the rail marks are labelled', a11y.unnamed === 0 && a11y.marks, `unnamed=${a11y.unnamed}`);
  check(tag, 'M5.2 book is focusable and the ends are aria-disabled', a11y.tabIndex === 0 && a11y.scrollBtn && a11y.fullBtn);

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  await page.waitForTimeout(100);
  const prevAt0 = await page.evaluate(() => document.querySelector('.br-prev').getAttribute('aria-disabled'));
  check(tag, 'M5.2 previous button is aria-disabled on the first step', prevAt0 === 'true');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(() => {
    const v = document.querySelector('.br-view');
    const st0 = window.BookReader.state().step;
    window.BookReader.next();
    const immediate = Math.abs(v.scrollLeft - (st0 + 1) * v.clientWidth) <= 1;
    const turning = !!document.querySelector('.br-book.is-turning');
    return { immediate, turning, step: window.BookReader.state().step, st0 };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check(tag, 'M5.3 reduced motion: turns are instant and no turn class is set', rm.immediate && !rm.turning && rm.step === rm.st0 + 1, JSON.stringify(rm));
  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });

  const root = await page.$('.br-root');
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const fsBtn = await page.$('[data-br="full"]');
  await fsBtn.click();
  await page.waitForTimeout(400);
  const imm = await page.evaluate(() => ({ cls: document.querySelector('.br-root').classList.contains('br-immersive'), html: document.documentElement.classList.contains('br-immersive-open'), state: window.BookReader.state().immersive, fs: !!document.fullscreenElement }));
  check(tag, 'M5.4 full screen mode engages', imm.cls && imm.html && imm.state, JSON.stringify(imm));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  let exit = await page.evaluate(() => ({ immersive: window.BookReader.state().immersive, fs: !!document.fullscreenElement }));
  if (exit.fs) {
    await page.evaluate(() => { document.exitFullscreen().catch(() => {}); });
    await page.waitForTimeout(400);
    exit = await page.evaluate(() => ({ immersive: window.BookReader.state().immersive, fs: !!document.fullscreenElement }));
  }
  check(tag, 'M5.4 Escape leaves full screen mode', exit.immersive === false, JSON.stringify(exit));

  await page.evaluate(() => { window.BookReader.goTo(0, { instant: true }); });
  if (SHOTS && vpName === 'desktop' && sheet === 0) {
    await page.evaluate(() => { window.BookReader.setView('scroll'); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.scrollTo(0, document.querySelector('.br-switch').getBoundingClientRect().top + window.scrollY - 150); });
    await page.waitForTimeout(250);
    const sw = await page.$('.br-switch');
    const art = await page.$('#sheet-article');
    if (art) await art.screenshot({ path: path.join(OUT_DIR, '11-scroll-view-switch-bar.png') });
    await page.evaluate(() => { window.BookReader.setView('book'); });
    await page.waitForTimeout(300);
  } else {
    await page.evaluate(() => { window.BookReader.setView('scroll'); });
    await page.waitForTimeout(120);
    await page.evaluate(() => { window.BookReader.setView('book'); });
    await page.waitForTimeout(120);
  }
  check(tag, 'M5.5 the book is mounted again after the scroll-view round trip', await page.evaluate(() => window.BookReader.isActive()));
}

async function runOne(browser, sheet, vpName) {
  const tag = `s${sheet}/${vpName}`;
  const vp = VP[vpName];
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  await context.addInitScript(() => {
    try { localStorage.setItem('baOnboardV1', '1'); } catch (e) { /* storage disabled */ }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => {
    pageErrors.push(String(e && e.message ? e.message : e));
  });
  try {
    await page.goto(`${BASE}/study.html?sheet=${sheet}&preview=full`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => {
      const a = document.getElementById('sheet-article');
      return a && a.children.length > 0;
    }, null, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('figure[data-diagram] > *').length > 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const skip = await page.$('#sitting-guide-skip');
    if (skip && (await skip.isVisible())) await skip.click();
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    await page.addStyleTag({ path: CSS_PATH });
    await page.addScriptTag({ path: JS_PATH });
    if (MILESTONE >= 1) {
      await m1(page, tag, sheet);
    }
    if (MILESTONE >= 2) {
      await m2(page, tag, vpName, sheet);
    }
    if (MILESTONE >= 3) {
      await m3(page, tag, vpName, sheet);
    }
    if (MILESTONE >= 4) {
      await m4(page, tag, vpName, sheet);
    }
    if (MILESTONE >= 5) {
      await m5(page, tag, vpName, sheet);
    }
    check(tag, 'M12 zero console errors and zero page errors during the run', consoleErrors.length === 0 && pageErrors.length === 0, JSON.stringify({ console: consoleErrors.slice(0, 3), page: pageErrors.slice(0, 3) }));
  } catch (err) {
    check(tag, 'run completes without an exception', false, String(err && err.stack ? err.stack : err).slice(0, 600));
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const sheet of SHEETS) {
  for (const vpName of VIEWPORTS) {
    await runOne(browser, sheet, vpName);
  }
}
await browser.close();
console.log(`\nSUMMARY milestone<=${MILESTONE}: ${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
