/*
 * Full-screen verification for the mindmap renderer (js/study/mindmap.js) on the
 * two migrated sitting-2 diagrams, s2-3 (a fan) and s2-4 (a spine).
 *
 * The claim under test is the brief's acceptance table
 * (docs/brief-fullscreen-diagram.md): the whole diagram, at a size where every
 * label reads, with nothing disabled. So every row is measured, never inferred:
 *
 *   the map          host box == viewport, box is 16:11, world scale >= 1.0 at
 *                    1440x1000, body text >= 15px on screen, whole world inside
 *                    the viewport with nothing clipped;
 *   scenes / films   a node opens its film inside full screen, the film is laid
 *                    out inside the layer, and it closes back to the map;
 *   HUD              Play/Stop and Overview still usable (toggling, not merely
 *                    present), plus the one full-screen entry/exit control,
 *                    keeping the bar's own budget at two and the block's at
 *                    three including the figure's shared Replay;
 *   citation chips   the film's chip is a live button, it opens its reference
 *                    row, and the row is reachable above the map;
 *   keyboard         arrows move between nodes, Enter/Space opens, Escape closes
 *                    the film and then the map, focus never escapes;
 *   pointer          the ground and every control answer a press; no dead zone
 *                    from the fixed positioning;
 *   themes           all four themes render the block as a dark inset, and
 *                    entering full screen does not change the palette;
 *   reduced motion   entering full screen introduces no animation;
 *   focus            focus moves in, is trapped, and returns to the opener;
 *   scrolling        the page behind is locked while open, and the lock is
 *                    released on Escape, on the exit control, and on a sitting
 *                    change while the view is open.
 *
 * Usage (a server must already serve the repo root):
 *   node tools/verify/verify_mindmap_fullscreen.mjs --base=http://127.0.0.1:8100
 *
 * Writes PNGs to qa/proofs/mindmap-fullscreen/ and prints PASS/FAIL per
 * assertion.
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
const BASE = String(args.base || 'http://127.0.0.1:8100').replace(/\/$/, '');
const OUT = path.join('qa', 'proofs', 'mindmap-fullscreen');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' }
};

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ---- ' + detail : ''}`);
}
const problems = [];

const browser = await chromium.launch();
try {
  /* ---- 1. 1440x1000: geometry, type, features, keyboard, focus, themes ---- */
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript((mock) => {
    try {
      localStorage.setItem('baQaMockSession', JSON.stringify(mock));
      const raw = localStorage.getItem('baJourney');
      const j = raw ? JSON.parse(raw) : {};
      j.termsAccepted = true;
      j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
      j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) { /* storage disabled */ }
  }, MOCK);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await dismissOverlays(page);
  const sheetIndex = await page.evaluate(() => {
    const article = document.getElementById('sheet-article');
    return article ? article.getAttribute('data-sheet-index') : null;
  });
  if (sheetIndex !== '2') {
    await page.evaluate(() => { if (window.openSittingFromPortal) window.openSittingFromPortal(2); });
    await page.waitForTimeout(2200);
    await dismissOverlays(page);
  }
  check('sitting 2 is open', (await page.evaluate(() => document.getElementById('sheet-article').getAttribute('data-sheet-index'))) === '2');

  const SEL = 'figure[data-diagram="s2-4"] .mm';
  const world = await page.locator(SEL).evaluate((mm) => {
    const w = mm.querySelector('.mm-world');
    return { w: w.offsetWidth, h: w.offsetHeight };
  });

  /* The column's numbers, for the before/after report. */
  const column = await readLayer(page, SEL);
  await page.locator(SEL).scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const before = await readLayer(page, SEL);
  check('the full-screen control is offered in the lesson column',
    before.controls.fs > 0 && before.controls.fsVisible, `${before.controls.fs} control(s), visible=${before.controls.fsVisible}`);

  /* ---- open it, through the control itself ---- */
  const opener = `${SEL} .mm-hud [data-mm-fs]`;
  await press(page, opener);
  await page.waitForTimeout(700);
  const full = await readLayer(page, SEL);
  await shot(page, SEL, 'fullscreen-map.png');

  /* the map: the host box IS the viewport, and it is the world's shape */
  check('full screen: the host box equals the viewport',
    full.host.w === full.viewport.w && full.host.h === full.viewport.h && full.host.top === 0 && full.host.left === 0,
    `host ${full.host.w}x${full.host.h} at ${full.host.top},${full.host.left}; viewport ${full.viewport.w}x${full.viewport.h}`);
  check('full screen: the block stays the world\'s own 16:11 shape',
    Math.abs(full.viewBox.width / full.viewBox.height - 16 / 11) < 0.01,
    `frame ${full.viewBox.width}x${full.viewBox.height} = ${(full.viewBox.width / full.viewBox.height).toFixed(4)} inside the ${full.box.width}x${full.box.height} full-viewport layer (16:11 = ${(16 / 11).toFixed(4)})`);
  check('full screen: the world scale is >= 1.0 at 1440x1000', full.scale >= 1.0,
    `scale ${full.scale} (column: ${before.scale})`);
  check('full screen: body text on screen is >= 15px', full.leafScreenPx >= 15,
    `leaf text ${full.textWorldPx}px world x ${full.scale} = ${full.leafScreenPx}px (column: ${before.leafScreenPx}px)`);
  /* The type is the point, but the world-fits check is what catches a
     letterboxed stage: the world box and the 16:11 frame are the same size, and
     the frame is entirely on screen. (The layer is the whole viewport and may be
     a few px taller than the frame it centres ---- 1440x990 inside 1440x1000 ----
     so the world sits up to half that difference above the frame's own top;
     what matters is that nothing of it leaves the visible box.) */
  check('full screen: the world is laid out at the frame\'s own size, not letterboxed',
    Math.abs(full.worldBox.width - full.viewBox.width) <= 2 && Math.abs(full.worldBox.height - full.viewBox.height) <= 2 &&
    full.worldBox.top >= -12 && full.worldBox.left >= -12 &&
    full.worldBox.top + full.worldBox.height <= full.viewport.h + 12 &&
    full.worldBox.left + full.worldBox.width <= full.viewport.w + 12,
    `world ${full.worldBox.width}x${full.worldBox.height} at ${full.worldBox.top},${full.worldBox.left}; frame ${full.viewBox.width}x${full.viewBox.height} at ${full.viewBox.top},${full.viewBox.left}; viewport ${full.viewport.w}x${full.viewport.h}`);
  check('full screen: every node and leaf is inside the visible box',
    full.nodes.every((n) => n.visible) && full.leaves.every((l) => l.visible),
    `${full.nodes.filter((n) => n.visible).length}/${full.nodes.length} nodes, ${full.leaves.filter((l) => l.visible).length}/${full.leaves.length} leaves inside the viewport`);

  /* HUD: present, and actually usable */
  check('full screen: the bar keeps its own two controls and adds the full-screen one',
    full.controls.bar === 2 && full.controls.fs === 1 && full.controls.play && full.controls.overview,
    `${full.controls.bar} bar control(s) + ${full.controls.fs} full-screen control(s)`);
  const tour = await page.evaluate(async (sel) => {
    const mm = document.querySelector(sel);
    const play = mm.querySelector('.mm-play');
    play.click();
    await new Promise((r) => setTimeout(r, 200));
    const touring = mm.classList.contains('is-touring');
    play.click();
    await new Promise((r) => setTimeout(r, 200));
    const stopped = !mm.classList.contains('is-touring');
    mm.querySelector('.mm-overview').click();
    return { touring, stopped, hudVisible: mm.querySelector('.mm-hud .mm-play').getBoundingClientRect().width > 0 };
  }, SEL);
  check('full screen: Play/Stop and Overview still work', tour.touring && tour.stopped && tour.hudVisible,
    `touring=${tour.touring} stopped=${tour.stopped} on-screen=${tour.hudVisible}`);

  /* keyboard: arrows move between nodes, Enter opens */
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);
  const trapped = await page.evaluate((sel) => ({
    inBlock: !!document.activeElement.closest(sel.split(' ')[0] + ' .mm') || !!document.activeElement.closest('.mm'),
    tag: document.activeElement.tagName + '.' + String(document.activeElement.className).split(' ')[0]
  }), SEL);
  check('full screen: focus moves into the view when it opens', trapped.inBlock, trapped.tag);

  const arrows = await page.evaluate(async (sel) => {
    const mm = document.querySelector(sel);
    const cards = [...mm.querySelectorAll('[data-mm-open]')];
    cards[0].focus();
    const before = document.activeElement;
    return { count: cards.length, before: cards.indexOf(before) };
  }, SEL);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const moved = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    const cards = [...mm.querySelectorAll('[data-mm-open]')];
    return { at: cards.indexOf(document.activeElement), inBlock: !!document.activeElement.closest('.mm') };
  }, SEL);
  check('full screen: the arrows move between nodes', arrows.count > 1 && moved.at >= 0 && moved.inBlock && moved.at !== arrows.before,
    `${arrows.count} cards, ${arrows.before} \u2192 ${moved.at}`);

  /* focus trap: Tab from the last control must come back into the block */
  const trap = await page.evaluate(async () => {
    const mm = document.querySelector('.mm.is-full');
    const items = [...mm.querySelectorAll('button:not([disabled])')];
    items[items.length - 1].focus();
    return { last: document.activeElement.textContent.trim(), count: items.length };
  });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  const trappedAfter = await page.evaluate(() => ({
    inside: !!document.activeElement.closest('.mm'),
    label: document.activeElement.textContent.trim()
  }));
  check('full screen: Tab from the last control wraps inside, it does not leave the block',
    trappedAfter.inside, `after "${trap.last}" comes "${trappedAfter.label}" inside=${trappedAfter.inside}`);
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(150);
  const trappedBack = await page.evaluate(() => ({ inside: !!document.activeElement.closest('.mm'), label: document.activeElement.textContent.trim() }));
  check('full screen: Shift+Tab wraps backwards inside too', trappedBack.inside,
    `landed on "${trappedBack.label}" inside=${trappedBack.inside}`);

  /* keyboard: Enter on a focused node opens its film (the arrows above only
     moved focus; this is the activation the acceptance table names). */
  const enterTarget = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    const cards = [...mm.querySelectorAll('[data-mm-open]')];
    const card = cards[2];
    card.focus();
    return {
      before: mm.querySelectorAll('.mm-scene.is-active').length,
      text: (card.querySelector('.mm-name, .mm-text') || {}).textContent || '',
      focused: document.activeElement === card
    };
  }, SEL);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  const enterOpened = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    const scene = mm.querySelector('.mm-scene.is-active');
    return {
      scenes: mm.querySelectorAll('.mm-scene.is-active').length,
      title: scene ? (scene.querySelector('.mm-sc-title') || {}).textContent || '' : '',
      stillFull: mm.classList.contains('is-full')
    };
  }, SEL);
  check('full screen: Enter opens the focused node\'s film',
    enterTarget.focused && enterTarget.before === 0 && enterOpened.scenes === 1 && enterOpened.stillFull,
    `Enter on "${enterTarget.text}" opened "${enterOpened.title}" (${enterOpened.scenes} film, still full screen=${enterOpened.stillFull})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);

  /* pointer: every control answers a press, and the ground is not a dead zone */
  const pointer = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    const hit = (el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      return !!top && (top === el || el.contains(top));
    };
    const ground = { x: Math.round(window.innerWidth / 2), y: 60 };
    const groundEl = document.elementFromPoint(ground.x, ground.y);
    return {
      fs: hit(mm.querySelector('[data-mm-fs]')),
      play: hit(mm.querySelector('.mm-play')),
      overview: hit(mm.querySelector('.mm-overview')),
      card: hit(mm.querySelector('.mm-head .mm-card')),
      groundInBlock: !!groundEl && !!groundEl.closest('.mm')
    };
  }, SEL);
  check('full screen: no control is a dead zone under the fixed positioning',
    pointer.fs && pointer.play && pointer.overview && pointer.card && pointer.groundInBlock,
    `fs=${pointer.fs} play=${pointer.play} overview=${pointer.overview} card=${pointer.card} ground=${pointer.groundInBlock}`);

  /* ---- the citation chip and its reference row ---- */
  await press(page, `${SEL} .mm-branch[data-mm="strikes"] .mm-card`);
  await page.waitForTimeout(2600);
  const film = await readFilm(page, SEL);
  await shot(page, SEL, 'fullscreen-film.png');
  check('full screen: a node opens its film, at full-screen size',
    film.active === 1 && film.onScreen && film.worldDimmed,
    `active=${film.active} title ${film.titlePx}px at top ${film.titleTop} (viewport ${film.viewportH}), map dimmed=${film.worldDimmed}`);
  check('full screen: the film is the node\'s own title, chain and note',
    film.title === film.expected.title && film.chain.length === film.expected.chain.length && film.caption === film.expected.caption,
    `"${film.title}" + ${film.chain.length} chain node(s) + "${film.caption}"`);
  check('full screen: the chip is a live control inside the film',
    film.cite.isButton && film.cite.onScreen && !film.cite.nested,
    `${film.cite.tag} "${film.cite.text}" on-screen=${film.cite.onScreen} nested-in-card=${film.cite.nested}`);

  await press(page, `${SEL} .mm-scene.is-active .chain-cite`);
  /* study-app.js scrolls the row into view smoothly; the assertion is on where
     it lands, so the scroll is given time to settle. */
  await page.waitForFunction(() => {
    const row = document.querySelector('#sheet-verify .cite-row.is-hit');
    if (!row) return false;
    const r = row.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const cite = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    const verify = document.getElementById('sheet-verify');
    const row = verify.querySelector('.cite-row.is-hit');
    const r = row ? row.getBoundingClientRect() : null;
    const x = r ? Math.round(r.left + Math.min(r.width, 200) / 2) : 0;
    const y = r ? Math.round(r.top + 30) : 0;
    const top = r ? document.elementFromPoint(x, y) : null;
    return {
      hits: verify.querySelectorAll('.cite-row.is-hit').length,
      openRows: verify.querySelectorAll('.cite-row .cite-details[open]').length,
      verifyHidden: verify.hidden,
      rowRect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join('/') : null,
      rowOnScreen: !!r && r.top >= 0 && r.bottom <= window.innerHeight,
      topIsMap: !!top && !!top.closest('.mm'),
      topAtRow: top ? top.tagName + '.' + String(top.className).split(' ')[0] : null,
      full: mm.classList.contains('is-full'),
      film: mm.querySelectorAll('.mm-scene.is-active').length,
      locked: getComputedStyle(document.documentElement).overflow,
      mapZ: getComputedStyle(mm).zIndex
    };
  }, SEL);
  check('full screen: a chip opens its reference row', cite.hits > 0 && cite.openRows > 0 && !cite.verifyHidden,
    `${cite.hits} row(s) hit, ${cite.openRows} opened, list hidden=${cite.verifyHidden}`);
  /* The row lives in the lesson at z-index 10; the layer is at 180, so the
     brief's ladder means the layer gives way rather than the row being buried
     under an opaque map. The film stays open. */
  check('full screen: the reference row is reachable, with no layer over it',
    cite.rowOnScreen && !cite.topIsMap && !cite.full && cite.film === 1,
    `row ${cite.rowRect} on screen=${cite.rowOnScreen}, topmost at the row is ${cite.topAtRow}; the map gave way (full=${cite.full}) and the film stayed open (${cite.film})`);
  check('full screen: giving way for the row releases the page lock and returns focus',
    cite.locked === 'visible',
    `documentElement overflow=${cite.locked}`);
  await shot(page, SEL, 'fullscreen-cite-row.png');
  /* The page the reader is left on, so the reference row itself is in the proof
     sheet and not only the block that gave way for it. */
  await page.screenshot({ path: path.join(OUT, 'fullscreen-cite-row-page.png') });

  /* ---- Escape: one layer per press ---- */
  await closeReferenceRow(page);
  await page.waitForTimeout(300);
  /* fresh: full screen, then a film, then one Escape for the film and one for
     the map ---- the film-first contract, measured on its own. */
  await press(page, opener);
  const armed = await page.evaluate(() => new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      const mm = document.querySelector('figure[data-diagram="s2-4"] .mm');
      if (mm && mm.classList.contains('is-full')) { resolve({ ok: true, ms: Math.round(performance.now() - started) }); return; }
      if (performance.now() - started > 3000) {
        resolve({ ok: false, cls: mm ? mm.className : '(no block)', locked: getComputedStyle(document.documentElement).overflow, connected: mm ? mm.isConnected : null });
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }));
  check('full screen can be re-entered after the page took the reader to a citation',
    armed.ok, armed.ok ? `re-armed in ${armed.ms}ms` : `not armed: ${JSON.stringify(armed)}`);
  await page.waitForTimeout(500);
  const armedStill = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    return { cls: mm ? mm.className : '(missing)', connected: mm ? mm.isConnected : null, scrollY: Math.round(window.scrollY) };
  }, SEL);
  check('full screen: still armed after the settle', armedStill.cls.includes('is-full'),
    `class "${armedStill.cls}", connected=${armedStill.connected}, scrollY=${armedStill.scrollY}`);
  await press(page, `${SEL} .mm-branch[data-mm="strikes"] .mm-card`);
  await page.waitForTimeout(1800);
  const armedAfterCard = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    return { cls: mm ? mm.className : '(missing)', scenes: document.querySelectorAll('.mm-scene.is-active').length };
  }, SEL);
  check('full screen: opening a film does not drop the view', armedAfterCard.cls.includes('is-full'),
    `class "${armedAfterCard.cls}", film(s) open=${armedAfterCard.scenes}`);
  /* Focus is put on a film control explicitly: Escape must answer wherever focus
     sits inside the layer, and a deterministic starting point is what makes the
     "handled once" count meaningful. */
  const escapeSpy = await page.evaluate((sel) => {
    const map = document.querySelector('.mm.is-full');
    if (!map) return { missing: true };
    window.__escapeSeen = { document: 0, host: 0 };
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      window.__escapeSeen.document += 1;
    });
    map.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.__escapeSeen.host += 1; });
    const chip = document.querySelector(sel + ' .mm-scene.is-active .chain-cite');
    if (chip) chip.focus();
    return {
      missing: false,
      film: document.querySelectorAll('.mm-scene.is-active').length,
      focused: String(document.activeElement.className).split(' ')[0],
      insideMap: !!document.activeElement.closest('.mm')
    };
  }, SEL);
  check('full screen: the Escape probe is armed on a live layer', !escapeSpy.missing,
    escapeSpy.missing ? `no .mm.is-full element: ` + JSON.stringify(escapeSpy) : `film open=${escapeSpy.film}, focus inside the map=${escapeSpy.insideMap}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const afterFirst = await page.evaluate((sel) => {
    const mm = document.querySelector(sel);
    return {
      full: mm.classList.contains('is-full'),
      scenes: mm.querySelectorAll('.mm-scene.is-active').length,
      focusInBlock: !!document.activeElement.closest('.mm'),
      focusClass: String(document.activeElement.className).split(' ')[0],
      locked: getComputedStyle(document.documentElement).overflow
    };
  }, SEL);
  check('full screen: the first Escape closes the film, not the map',
    escapeSpy.film === 1 && afterFirst.scenes === 0 && afterFirst.full,
    `film open ${escapeSpy.film} \u2192 ${afterFirst.scenes}, still full screen=${afterFirst.full}`);
  const escapeSeen = await page.evaluate(() => window.__escapeSeen || { host: -1, document: -1 });
  /* The block is the innermost layer, so it claims the press and stops it - the
     same claim the story reader makes from its own capture-phase listener. One
     press reached exactly one handler, and nothing above it saw one. */
  check('full screen: one Escape press is handled once',
    escapeSeen.host === 1,
    `host listener saw ${escapeSeen.host} press(es), the document listener above it saw ${escapeSeen.document}; focus was inside the map=${escapeSpy.insideMap}`);
  check('full screen: closing the film hands focus back inside the block',
    afterFirst.focusInBlock, `focus on "${afterFirst.focusClass}"`);
  check('full screen: the page is still locked while the map is open', afterFirst.locked === 'hidden', afterFirst.locked);
  await shot(page, SEL, 'fullscreen-after-film.png');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const afterSecond = await readLayer(page, SEL);
  /* Exact equality is the wrong bar: the column's width moves by a pixel or two
     across a session (a scrollbar appearing, a re-render), and the scale follows
     it exactly. What must be true is that the block is back to a column
     geometry, not the full-screen one. */
  check('full screen: the second Escape closes the map',
    !afterSecond.full && afterSecond.scale > 0.7 && afterSecond.scale < 1 &&
    afterSecond.host.w < full.host.w * 0.9 && afterSecond.host.h < full.host.h * 0.9,
    `is-full=${afterSecond.full}, scale back to ${afterSecond.scale} (column ${before.scale}, full screen ${full.scale}), host ${afterSecond.host.w}x${afterSecond.host.h} (full screen ${full.host.w}x${full.host.h})`);
  check('full screen: the scroll lock is released on close',
    afterSecond.locked === 'visible' && !afterSecond.lockClass,
    `documentElement overflow=${afterSecond.locked}, class="${afterSecond.lockClass}"`);
  check('full screen: focus returns to the control that opened it',
    afterSecond.focus === 'mm-btn mm-fs', `focus on "${afterSecond.focus}"`);
  check('full screen: nothing is left fixed or on top after the exit',
    afterSecond.position === 'relative' && afterSecond.zIndex === 'auto' && !afterSecond.ariaModal,
    `position=${afterSecond.position}, z-index=${afterSecond.zIndex}, aria-modal=${afterSecond.ariaModal}`);
  await shot(page, SEL, 'fullscreen-exited.png');

  /* ---- the exit control itself, and the ground ---- */
  await press(page, opener);
  await page.waitForTimeout(600);
  const reopened = await page.evaluate((sel) => document.querySelector(sel).classList.contains('is-full'), SEL);
  await press(page, opener);
  await page.waitForTimeout(700);
  const closedByControl = await readLayer(page, SEL);
  check('full screen: the exit control closes it and releases the lock',
    reopened && !closedByControl.full && closedByControl.locked === 'visible',
    `reopened=${reopened}, closed=${!closedByControl.full}, overflow=${closedByControl.locked}`);

  await press(page, opener);
  await page.waitForTimeout(700);
  const groundExit = await page.evaluate(async (sel) => {
    const mm = document.querySelector(sel);
    const stage = mm.querySelector('.mm-stage');
    const r = stage.getBoundingClientRect();
    /* a press on the stage's own ground, well away from every control */
    const x = Math.round(r.left + r.width * 0.5);
    const y = Math.round(r.top + r.height * 0.5);
    const target = document.elementFromPoint(x, y);
    return { open: mm.classList.contains('is-full'), x, y, target: target ? target.tagName + '.' + String(target.className).split(' ')[0] : null };
  }, SEL);
  await page.mouse.click(groundExit.x, groundExit.y);
  await page.waitForTimeout(700);
  const afterGround = await readLayer(page, SEL);
  check('full screen: a press on the map\'s own ground leaves the view',
    groundExit.open && !afterGround.full && afterGround.locked === 'visible',
    `pressed ${groundExit.target}, is-full=${afterGround.full}, overflow=${afterGround.locked}`);

  /* ---- the palette is the block's, in every theme ---- */
  const palettes = {};
  for (const theme of ['charcoal-mode', 'paper-mode', 'white-mode', 'dark']) {
    palettes[theme] = await readPalette(page, SEL, theme, opener);
  }
  const sameInEveryTheme = Object.entries(palettes).every(([, p]) => p.same);
  check('full screen: entering it does not change the palette, in any theme',
    sameInEveryTheme,
    Object.entries(palettes).map(([t, p]) => `${t}: ${p.same ? 'unchanged' : 'CHANGED ' + p.diff}`).join(' | '));
  const darkInset = Object.entries(palettes).every(([, p]) => p.full.ground.includes('radial-gradient') && p.full.ground === p.column.ground);
  check('full screen: the block is still a dark inset in every theme', darkInset,
    Object.entries(palettes).map(([t, p]) => `${t}: ${p.full.ground.slice(0, 48)}----`).join(' | '));

  /* paper + white full screen, for the proof sheet */
  for (const theme of ['paper-mode', 'white-mode']) {
    await page.evaluate((t) => { document.body.classList.remove('paper-mode', 'white-mode'); document.body.classList.add(t); }, theme);
    await press(page, opener);
    await page.waitForTimeout(700);
    await shot(page, SEL, `fullscreen-${theme.replace('-mode', '')}.png`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.body.classList.remove('paper-mode', 'white-mode'));
  }

  /* ---- a sitting change while the view is open ---- */
  await press(page, opener);
  await page.waitForTimeout(700);
  const beforeSwitch = await page.evaluate((sel) => document.querySelector(sel).classList.contains('is-full'), SEL);
  await page.evaluate(() => window.openSittingFromPortal && window.openSittingFromPortal(1));
  await page.waitForTimeout(1800);
  const switched = await page.evaluate(() => ({
    locked: getComputedStyle(document.documentElement).overflow,
    lockClass: document.documentElement.className.includes('mm-fullscreen-open'),
    fixedLeft: document.querySelectorAll('.mm.is-full').length,
    maps: document.querySelectorAll('#sheet-article .mm').length,
    sheet: (document.getElementById('sheet-article') || {}).getAttribute ? document.getElementById('sheet-article').getAttribute('data-sheet-index') : null,
    scrollable: document.documentElement.scrollHeight > window.innerHeight,
    scrolled: window.scrollY,
    storyLock: document.documentElement.classList.contains('story-read-open')
  }));
  check('a sitting change while full screen is open leaves no lock behind',
    beforeSwitch && switched.locked === 'visible' && !switched.lockClass && switched.scrollable,
    `overflow=${switched.locked}, class left=${switched.lockClass}, page scrollable=${switched.scrollable}, story lock=${switched.storyLock}`);
  check('a sitting change while full screen is open leaves no fixed block behind',
    switched.fixedLeft === 0 && switched.maps === 0,
    `${switched.fixedLeft} fixed block(s), ${switched.maps} map(s) in the new sitting`);
  await page.evaluate(() => { window.scrollTo(0, 800); });
  await page.waitForTimeout(400);
  const scrolledAfter = await page.evaluate(() => window.scrollY);
  check('the page really scrolls again after that teardown', scrolledAfter > 0, `scrollY ${switched.scrolled} \u2192 ${scrolledAfter}`);
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.evaluate(() => window.openSittingFromPortal && window.openSittingFromPortal(2));
  await page.waitForTimeout(2200);
  const remounted = await page.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-4"] .mm');
    return { blocks: document.querySelectorAll('#sheet-article .mm').length, fs: mm ? mm.querySelectorAll('[data-mm-fs]').length : 0 };
  });
  check('the sitting can be reopened with its full-screen control intact',
    remounted.blocks === 2 && remounted.fs === 1, `${remounted.blocks} block(s), ${remounted.fs} full-screen control(s)`);

  if (consoleErrors.length) problems.push(`console errors: ${consoleErrors.length} ---- ${consoleErrors.slice(0, 4).join(' ; ')}`);
  await context.close();

  /* ---- 2. reduced motion: full screen adds no animation ---- */
  const reduceContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await reduceContext.addInitScript((mock) => {
    try { localStorage.setItem('baQaMockSession', JSON.stringify(mock)); } catch (e) { /* ignore */ }
  }, MOCK);
  const reducePage = await reduceContext.newPage();
  reducePage.on('pageerror', (e) => consoleErrors.push('reduce: ' + String(e.message)));
  await reducePage.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
  await reducePage.waitForTimeout(1800);
  await dismissOverlays(reducePage);
  await reducePage.waitForTimeout(500);
  const reduceBefore = await readReducedMotion(reducePage, SEL);
  await press(reducePage, opener);
  await reducePage.waitForTimeout(800);
  const reduceAfter = await readReducedMotion(reducePage, SEL);
  check('reduced motion: entering full screen introduces no animation',
    reduceAfter.animated.length === 0 && reduceAfter.scale >= 1.0,
    `${reduceAfter.animated.length} animated element(s) after entry (before: ${reduceBefore.animated.length}), scale ${reduceAfter.scale}`);
  check('reduced motion: the map is fully drawn in full screen',
    reduceAfter.cardOpacity === '1' && reduceAfter.links.every((l) => l.dash !== '1px' && !l.empty),
    `card opacity ${reduceAfter.cardOpacity}, ${reduceAfter.links.length} connector(s), empty=${reduceAfter.links.filter((l) => l.empty).length}`);
  await shot(reducePage, SEL, 'fullscreen-reduced-motion.png');
  await press(reducePage, `${SEL} .mm-branch[data-mm="strikes"] .mm-card`);
  await reducePage.waitForTimeout(1200);
  const reduceFilm = await reducePage.evaluate(() => {
    const scene = document.querySelector('.mm-scene.is-active');
    if (!scene) return null;
    const anim = scene.getAnimations({ subtree: true }).filter((a) => a.playState === 'running');
    return { active: scene.classList.contains('is-active'), running: anim.length, title: (scene.querySelector('.mm-sc-title') || {}).textContent || '' };
  });
  check('reduced motion: a film opens in full screen without animation',
    !!reduceFilm && reduceFilm.active && reduceFilm.running === 0,
    reduceFilm ? `"${reduceFilm.title}", ${reduceFilm.running} running animation(s)` : 'no film');
  await reduceContext.close();

  /* ---- 3. 1440x800: the height trap (max-height bound below ~831px) ---- */
  const shortContext = await browser.newContext({ viewport: { width: 1440, height: 800 }, deviceScaleFactor: 1 });
  await shortContext.addInitScript((mock) => {
    try { localStorage.setItem('baQaMockSession', JSON.stringify(mock)); } catch (e) { /* ignore */ }
  }, MOCK);
  const shortPage = await shortContext.newPage();
  shortPage.on('pageerror', (e) => consoleErrors.push('short: ' + String(e.message)));
  await shortPage.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
  await shortPage.waitForTimeout(1800);
  await dismissOverlays(shortPage);
  await shortPage.locator(SEL).scrollIntoViewIfNeeded();
  await shortPage.waitForTimeout(800);
  const shortColumn = await readLayer(shortPage, SEL);
  await press(shortPage, opener);
  await shortPage.waitForTimeout(800);
  const shortFull = await readLayer(shortPage, SEL);
  check('a short viewport: the height cap is gone and the type is bigger than the column\'s',
    shortFull.scale > shortColumn.scale && shortFull.leafScreenPx > shortColumn.leafScreenPx &&
    shortFull.box.height === shortFull.viewport.h,
    `column ${shortColumn.scale} (${shortColumn.leafScreenPx}px) \u2192 full screen ${shortFull.scale} (${shortFull.leafScreenPx}px), block ${shortFull.box.width}x${shortFull.box.height} in ${shortFull.viewport.w}x${shortFull.viewport.h}`);
  check('a short viewport: the world still fits the block whole',
    shortFull.worldBox.height <= shortFull.box.height + 1 && shortFull.worldBox.width <= shortFull.box.width + 1,
    `world ${shortFull.worldBox.width}x${shortFull.worldBox.height} in block ${shortFull.box.width}x${shortFull.box.height}`);
  await shot(shortPage, SEL, 'fullscreen-1440x800.png');
  await shortPage.keyboard.press('Escape');
  await shortPage.waitForTimeout(700);
  const shortClosed = await readLayer(shortPage, SEL);
  check('a short viewport: Escape restores the column exactly',
    !shortClosed.full && shortClosed.scale === shortColumn.scale && shortClosed.locked === 'visible',
    `scale ${shortClosed.scale} (column ${shortColumn.scale}), overflow ${shortClosed.locked}`);
  await shortContext.close();

  /* ---- 4. 390x844: the outline is the right presentation, not a broken layer */
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobileContext.addInitScript((mock) => {
    try { localStorage.setItem('baQaMockSession', JSON.stringify(mock)); } catch (e) { /* ignore */ }
  }, MOCK);
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', (e) => consoleErrors.push('mobile: ' + String(e.message)));
  await mobilePage.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1800);
  await dismissOverlays(mobilePage);
  await mobilePage.locator('figure[data-diagram="s2-4"]').scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(800);
  const mobile = await mobilePage.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-4"] .mm');
    const fs = mm.querySelector('[data-mm-fs]');
    const r = fs.getBoundingClientRect();
    return {
      compact: mm.classList.contains('is-compact'),
      fsShown: getComputedStyle(fs).display !== 'none' && r.width > 0,
      pageOverflow: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      textPx: parseFloat(getComputedStyle(mm.querySelector('.mm-leaf .mm-text')).fontSize)
    };
  });
  check('390x844: the block is the compact outline and the stage is not offered',
    mobile.compact && !mobile.fsShown,
    `compact=${mobile.compact}, control shown=${mobile.fsShown}, body text ${mobile.textPx}px`);
  check('390x844: the compact block adds no horizontal overflow',
    mobile.pageOverflow <= mobile.viewport + 4,
    `page ${mobile.pageOverflow}px, viewport ${mobile.viewport}px`);
  await shot(mobilePage, 'figure[data-diagram="s2-4"] .mm', 'fullscreen-mobile-390.png');
  await mobileContext.close();
} finally {
  await browser.close();
}

/* ---- readers ---- */

/* Everything the acceptance table needs about the block's current box. */
async function readLayer(page, sel) {
  return page.locator(sel).evaluate((mm) => {
    const host = mm.getBoundingClientRect();
    const world = mm.querySelector('.mm-world');
    const wr = world.getBoundingClientRect();
    const scale = wr.width / world.offsetWidth;
    const leaf = mm.querySelector('.mm-leaf .mm-text');
    const fsBtn = mm.querySelector('[data-mm-fs]');
    const inView = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= -1 && r.left >= -1 &&
        r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1 && r.bottom > 0 && r.right > 0;
    };
    const parseTransform = () => {
      const t = mm.querySelector('.mm-stage').style.transform || '';
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/.exec(t);
      return m ? { x: +m[1], y: +m[2], s: +m[3] } : null;
    };
    return {
      host: { w: mm.clientWidth, h: mm.clientHeight, top: Math.round(host.top), left: Math.round(host.left) },
      box: { width: Math.round(host.width), height: Math.round(host.height), top: Math.round(host.top), left: Math.round(host.left) },
      /* The frame the world is scaled into. In the column that is the block
         itself (`.mm-viewport` is `inset: 0` over it); in full screen the layer
         is the whole viewport and the frame is the largest 16:11 box inside it,
         so both are measured rather than assumed. */
      viewBox: (() => {
        const vp = mm.querySelector('.mm-viewport').getBoundingClientRect();
        return { width: Math.round(vp.width), height: Math.round(vp.height), top: Math.round(vp.top), left: Math.round(vp.left) };
      })(),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      worldBox: { width: Math.round(wr.width), height: Math.round(wr.height), top: Math.round(wr.top), left: Math.round(wr.left) },
      scale: +scale.toFixed(4),
      stage: parseTransform(),
      textWorldPx: parseFloat(getComputedStyle(leaf).fontSize),
      leafScreenPx: +(parseFloat(getComputedStyle(leaf).fontSize) * scale).toFixed(2),
      nameScreenPx: +(parseFloat(getComputedStyle(mm.querySelector('.mm-head .mm-name')).fontSize) * scale).toFixed(2),
      full: mm.classList.contains('is-full'),
      compact: mm.classList.contains('is-compact'),
      position: getComputedStyle(mm).position,
      zIndex: getComputedStyle(mm).zIndex,
      ariaModal: mm.getAttribute('aria-modal'),
      lockClass: document.documentElement.className.includes('mm-fullscreen-open'),
      locked: getComputedStyle(document.documentElement).overflow,
      focus: String((document.activeElement && document.activeElement.className) || document.activeElement.tagName || ''),
      controls: {
        bar: mm.querySelectorAll('.mm-hud .mm-btn:not([data-mm-fs])').length,
        fs: mm.querySelectorAll('.mm-hud [data-mm-fs]').length,
        fsVisible: !!fsBtn && fsBtn.getBoundingClientRect().width > 0,
        fsLabel: fsBtn ? fsBtn.textContent.trim() : '',
        fsPressed: fsBtn ? fsBtn.getAttribute('aria-pressed') : null,
        play: !!mm.querySelector('.mm-play'),
        overview: !!mm.querySelector('.mm-overview'),
        replay: !!(mm.closest('figure') && mm.closest('figure').parentNode.querySelector('[data-chain-replay]'))
      },
      nodes: [...mm.querySelectorAll('.mm-head')].map((el) => ({ visible: inView(el), text: (el.querySelector('.mm-name') || {}).textContent || '' })),
      leaves: [...mm.querySelectorAll('.mm-leaf')].map((el) => ({ visible: inView(el), text: (el.querySelector('.mm-text') || {}).textContent || '' }))
    };
  });
}

async function readFilm(page, sel) {
  return page.locator(sel).evaluate((mm) => {
    const scene = mm.querySelector('.mm-scene.is-active');
    if (!scene) return { active: 0 };
    const title = scene.querySelector('.mm-sc-title');
    const caption = scene.querySelector('.mm-sc-caption');
    const cite = scene.querySelector('.chain-cite');
    const tr = title ? title.getBoundingClientRect() : null;
    const cr = cite ? cite.getBoundingClientRect() : null;
    const fig = mm.closest('figure');
    const id = fig ? fig.getAttribute('data-diagram') : '';
    const spec = (window.sheetsData && window.sheetsData[2] && window.sheetsData[2].diagrams[id]) || {};
    const step = (spec.steps || []).find((s) => s.id === scene.getAttribute('data-mm-scene')) || {};
    const leaves = [];
    if (step.text) leaves.push(String(step.text));
    (step.points || []).forEach((p) => { if (typeof p === 'string' && p.trim()) leaves.push(p); });
    return {
      active: mm.querySelectorAll('.mm-scene.is-active').length,
      title: title ? title.textContent : '',
      titlePx: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
      titleTop: tr ? Math.round(tr.top) : null,
      onScreen: !!tr && tr.top >= 0 && tr.left >= 0 && tr.bottom <= window.innerHeight && tr.right <= window.innerWidth,
      caption: caption ? caption.textContent : '',
      captionOpacity: caption ? getComputedStyle(caption).opacity : '0',
      chain: [...scene.querySelectorAll('.mm-cn .mm-lbl b')].map((el) => el.textContent),
      worldDimmed: /blur/.test(getComputedStyle(mm.querySelector('.mm-world')).filter),
      viewportH: window.innerHeight,
      cite: cite ? {
        tag: cite.tagName,
        text: cite.textContent,
        isButton: cite.tagName === 'BUTTON',
        nested: !!cite.closest('[data-mm-open]'),
        onScreen: !!cr && cr.top >= 0 && cr.bottom <= window.innerHeight
      } : { isButton: false },
      expected: { title: String(step.title || ''), chain: leaves, caption: String(spec.note || '') }
    };
  });
}

async function readReducedMotion(page, sel) {
  return page.locator(sel).evaluate((mm) => {
    const world = mm.querySelector('.mm-world');
    const scale = world.getBoundingClientRect().width / world.offsetWidth;
    const links = [...mm.querySelectorAll('.mm-link')].map((el) => {
      const b = el.getBBox();
      return { dash: getComputedStyle(el).strokeDasharray, empty: b.width === 0 && b.height === 0 };
    });
    const animated = [...mm.querySelectorAll('*')]
      .filter((el) => el.getAnimations && el.getAnimations().some((a) => a.playState === 'running'))
      .map((el) => String(el.className).split(' ')[0])
      .filter((c, i, all) => all.indexOf(c) === i);
    return {
      scale: +scale.toFixed(4),
      animated,
      cardOpacity: getComputedStyle(mm.querySelector('.mm-head .mm-card')).opacity,
      links
    };
  });
}

async function readPalette(page, sel, theme, opener) {
  /* The ground is read off the frame the world is painted on ---- the block in the
     column, and (in full screen) the 16:11 frame inside the full-viewport layer
     ---- because that is the box the palette is attached to in both states. */
  const read = () => page.locator(sel).evaluate((mm) => {
    const frame = mm.querySelector('.mm-viewport');
    const text = mm.querySelector('.mm-leaf .mm-text');
    const name = mm.querySelector('.mm-head .mm-name');
    const hud = mm.querySelector('.mm-play');
    const inner = getComputedStyle(mm);
    const cs = getComputedStyle(frame);
    const full = mm.classList.contains('is-full');
    return {
      /* In the column the palette is the block's own; in full screen the block
         is the full-viewport layer and the frame inside it carries the same
         three gradients. That is the frame's whole job, so it is what the
         ground is measured on there. */
      ground: full ? cs.backgroundColor + ' | ' + cs.backgroundImage.slice(0, 90) : inner.backgroundColor + ' | ' + inner.backgroundImage.slice(0, 90),
      text: getComputedStyle(text).color,
      name: getComputedStyle(name).color,
      /* The colour is the token; the background is a transition between two
         states of the same rule, so only the first component is compared. */
      hud: getComputedStyle(hud).color
    };
  });
  const setTheme = async () => {
    await page.evaluate((t) => {
      document.body.classList.remove('charcoal-mode', 'paper-mode', 'white-mode', 'dark');
      if (t) document.body.classList.add(t);
    }, theme);
    await page.waitForTimeout(250);
  };
  if (await page.locator(sel).evaluate((mm) => mm.classList.contains('is-full'))) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  await setTheme();
  const column = await read();
  await press(page, opener);
  await page.waitForTimeout(800);
  const full = await read();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const keys = ['text', 'name', 'hud'];
  const diff = keys.filter((k) => column[k] !== full[k]).map((k) => `${k}: ${column[k]} \u2192 ${full[k]}`);
  if (column.ground !== full.ground) diff.push(`ground: ${column.ground} \u2192 ${full.ground}`);
  return { column, full, same: diff.length === 0, diff: diff.join(', ') };
}

/* ---- helpers ---- */

/* Clicks a control and proves the press landed on it: a fixed positioning bug
   or an overlapping layer would otherwise show up as a mystery state change
   somewhere later in the run. */
async function press(page, selector) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded().catch(() => {});
  const hit = await target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(x, y);
    return { x, y, onTop: !!top && (top === el || el.contains(top)), top: top ? top.tagName + '.' + String(top.className).split(' ')[0] : '(none)' };
  });
  if (!hit.onTop) throw new Error(`press(${selector}): the press would land on ${hit.top}, not the control at ${hit.x},${hit.y}`);
  await page.mouse.click(hit.x, hit.y);
  return hit;
}

async function closeReferenceRow(page) {
  await page.evaluate(() => {
    document.querySelectorAll('#sheet-verify .cite-row .cite-details[open]').forEach((d) => { d.open = false; });
    document.querySelectorAll('#sheet-verify .cite-row.is-hit').forEach((r) => r.classList.remove('is-hit'));
  });
  await page.waitForTimeout(200);
}

async function shot(page, selector, name) {
  const file = path.join(OUT, name);
  const el = page.locator(selector).first();
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
  await page.waitForTimeout(250);
  await el.screenshot({ path: file }).catch(async () => { await page.screenshot({ path: file }); });
  return file;
}

/* The sitting guide, the lock banner, the toast and the insights pulse card all
   sit over the lesson. None of them is what is under test, so each is dismissed
   the way a reader would dismiss it. */
async function dismissOverlays(page) {
  await page.evaluate(() => {
    const skip = document.getElementById('sitting-guide-skip');
    const primary = document.getElementById('sitting-guide-primary');
    if (skip && !skip.hidden) skip.click();
    else if (primary && primary.offsetParent !== null) primary.click();
    const guide = document.getElementById('sitting-guide');
    if (guide) guide.hidden = true;
    const banner = document.getElementById('site-error');
    if (banner) {
      const close = [...banner.querySelectorAll('button')].find((b) => /dismiss/i.test(b.textContent.trim()));
      if (close) close.click();
      banner.hidden = true;
    }
    const toast = document.getElementById('toast');
    if (toast) { toast.classList.add('opacity-0', 'pointer-events-none'); toast.textContent = ''; }
    const pulse = document.getElementById('insight-pulse');
    if (pulse) {
      const notNow = document.getElementById('insight-pulse-skip');
      if (notNow) notNow.click();
    }
  });
  await page.waitForTimeout(400);
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ base: BASE, results, problems }, null, 2), 'utf8');
console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
if (problems.length) problems.forEach((p) => console.log(`PROBLEM  ${p}`));
console.log(`screenshots: ${OUT}`);
process.exitCode = failed.length || problems.length ? 1 : 0;
