/*
 * Verification harness for the mindmap renderer (js/study/mindmap.js) on the two
 * migrated sitting-2 diagrams, s2-3 (a fan) and s2-4 (a spine).
 *
 * What a unit test cannot see, and this does:
 *   a  the map renders the authored structure: one node per step, one leaf per
 *      `text` + `points[]` entry, no more and no fewer;
 *   b  every rendered word equals its spec value (the C21 audit link between the
 *      JSON and the DOM);
 *   c  s2-4's four steps read in the authored order, left column then right;
 *   d  under prefers-reduced-motion every connector is *visible* - the
 *      prototype's own bug leaves stroke-dashoffset:1 in place, so a bbox check
 *      is the only thing that catches it;
 *   e  the keyboard is scoped to the block: 3 / L / Space do nothing and do not
 *      scroll the page, Escape inside the block closes an open node;
 *   f  at 390x844 the block does not push the page sideways.
 * Plus two extras the port is judged on: the paper/white restore keeps the dark
 * inset readable, and the original ASCII artwork is still in the figure.
 *
 * Usage (a server must already serve the repo root):
 *   node tools/verify/verify_mindmap.mjs --base=http://127.0.0.1:8060
 *
 * Writes PNGs to qa/proofs/mindmap/ and prints PASS/FAIL per assertion.
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
const BASE = String(args.base || 'http://127.0.0.1:8060').replace(/\/$/, '');
const OUT = path.join('qa', 'proofs', 'mindmap');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   - ' + detail : ''}`);
}
const problems = [];

/* The renderer's own leaf rule: `text` first, then `points[]`, in order. */
const leavesOf = (step) => {
  const out = [];
  if (step.text) out.push(String(step.text));
  (step.points || []).forEach((p) => { if (typeof p === 'string' && p.trim()) out.push(p); });
  return out;
};

const browser = await chromium.launch();
try {
  /* - 1. desktop: structure, copy, order, keyboard, themes ---- */
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
  await page.waitForTimeout(1500);
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

  const specs = await page.evaluate(() => {
    const sheet = window.sheetsData[2];
    return { s23: sheet.diagrams['s2-3'], s24: sheet.diagrams['s2-4'] };
  });
  check('s2-3 and s2-4 are authored as mindmaps', specs.s23.kind === 'mindmap' && specs.s24.kind === 'mindmap',
    `kinds: ${specs.s23.kind}, ${specs.s24.kind}`);

  const s23 = await readMap(page, 's2-3');
  const s24 = await readMap(page, 's2-4');

  /* (a) node and leaf counts. */
  const expectLeaves = (spec) => spec.steps.reduce((n, step) => n + leavesOf(step).length, 0);
  check('s2-3 node count', s23.branches === specs.s23.steps.length, `${s23.branches} nodes for ${specs.s23.steps.length} steps`);
  check('s2-3 leaf count', s23.leaves === expectLeaves(specs.s23), `${s23.leaves} leaves, spec has ${expectLeaves(specs.s23)}`);
  check('s2-3 step 2 owns exactly its four historical instances',
    JSON.stringify(s23.heads[1] && s23.heads[1].leaves) === JSON.stringify(leavesOf(specs.s23.steps[1])),
    JSON.stringify(s23.heads[1] && s23.heads[1].leaves));
  check('s2-3 step 1 owns no leaves (it authored none)',
    s23.heads[0] && s23.heads[0].leaves.length === 0, `step 1 leaves: ${s23.heads[0] && s23.heads[0].leaves.length}`);
  check('s2-4 node count', s24.branches === specs.s24.steps.length, `${s24.branches} nodes for ${specs.s24.steps.length} steps`);
  check('s2-4 leaf count', s24.leaves === expectLeaves(specs.s24), `${s24.leaves} leaves, spec has ${expectLeaves(specs.s24)}`);
  check('one centre node per map', s23.centres === 1 && s24.centres === 1, `${s23.centres} / ${s24.centres}`);

  /* (b) every rendered word matches its spec value. */
  [
    ['s2-3', specs.s23, s23],
    ['s2-4', specs.s24, s24]
  ].forEach(([id, spec, dom]) => {
    const roleMismatch = spec.steps.map((step, i) => (
      String(step.role || '') === String(dom.heads[i] && dom.heads[i].role || '') ? '' : `step ${i + 1} role`
    )).filter(Boolean);
    const titleMismatch = spec.steps.map((step, i) => (
      String(step.title || '') === String(dom.heads[i] && dom.heads[i].title || '') ? '' : `step ${i + 1} title`
    )).filter(Boolean);
    const leafMismatch = spec.steps.map((step, i) => (
      JSON.stringify(leavesOf(step)) === JSON.stringify(dom.heads[i] ? dom.heads[i].leaves : []) ? '' : `step ${i + 1} leaves`
    )).filter(Boolean);
    check(`${id} roles match the spec`, roleMismatch.length === 0, roleMismatch.join(', '));
    check(`${id} titles match the spec`, titleMismatch.length === 0, titleMismatch.join(', '));
    check(`${id} leaf text matches the spec verbatim`, leafMismatch.length === 0,
      leafMismatch.length ? leafMismatch.join(', ') : `${dom.leaves} leaves compared`);
    check(`${id} centre label is the spec title`, dom.centre === spec.title, JSON.stringify(dom.centre));
    check(`${id} cite chips match the spec`, JSON.stringify(dom.cites) === JSON.stringify(spec.steps.filter((s) => s.cite).map((s) => s.cite)),
      JSON.stringify(dom.cites));
    check(`${id} keeps its hidden ASCII artwork`, dom.ascii.length > 40, `${dom.ascii.length} chars`);
    check(`${id} exposes the figure's Replay control`, dom.replay);
  });

  /* (c) s2-4 reads as a spine in the authored order. */
  const reading = s24.heads.slice().sort((a, b) => (a.side === b.side ? a.y - b.y : (a.side === 'L' ? -1 : 1))).map((h) => h.id);
  check('s2-4 renders the spine in authored order (left column, then right)',
    JSON.stringify(reading) === JSON.stringify(specs.s24.steps.map((s) => s.id)),
    reading.join(' \u2192 '));
  /*
   * These assert the *structure* of the connector set rather than a frozen
   * count. The counts changed once when the cross-link vocabulary was applied to
   * both maps; a hard-coded count breaks on every authoring change while proving
   * nothing. What matters is: the spine is drawn solid, the cross-centre turn is
   * dashed, every label is one of the course's four, and every authored link is
   * actually drawn.
   */
  const expected24 = specs.s24.links.map((l) => String(l.kind).toUpperCase());
  const expected23 = specs.s23.links.map((l) => String(l.kind).toUpperCase());
  const FOUR = ['TEXT', 'HISTORY', 'INTERPRETATION', 'CHRIST'];
  check('s2-4 draws the same-side spine connectors solid',
    s24.spines >= 2 && s24.spines === specs.s24.links.length - s24.dasheds,
    `${s24.spines} solid spine links, ${s24.dasheds} dashed, ${specs.s24.links.length} authored`);
  check('s2-4 draws the cross-centre turn dashed', s24.dasheds >= 1, `${s24.dasheds} dashed link(s)`);
  check('s2-4 draws one connector path per authored link',
    s24.crossCount === expected24.length,
    `${s24.crossCount} paths for ${expected24.length} authored links`);
  check('s2-3 draws one connector path per authored link',
    s23.crossCount === expected23.length,
    `${s23.crossCount} paths for ${expected23.length} authored links`);
  /* Every authored kind must be named by a pill. A pill per run means three
     consecutive TEXT links share one pill, so this counts kinds, not pills. */
  const named24 = new Set(s24.allLabels);
  const named23 = new Set(s23.allLabels);
  check('s2-4 names every authored connector kind',
    expected24.every((k) => named24.has(k)),
    `named ${[...named24].join(', ')} · authored ${[...new Set(expected24)].join(', ')}`);
  check('s2-3 names every authored connector kind',
    expected23.every((k) => named23.has(k)),
    `named ${[...named23].join(', ')} · authored ${[...new Set(expected23)].join(', ')}`);
  check('no connector is labelled with a word outside the course\'s four',
    s24.allLabels.concat(s23.allLabels).every((k) => FOUR.includes(k)),
    `${[...new Set(s24.allLabels.concat(s23.allLabels))].join(', ')}`);
  check('each map names at least three of the four, so the grammar is visible',
    named24.size >= 3 && named23.size >= 3,
    `s2-4 ${[...named24].join('/')} · s2-3 ${[...named23].join('/')}`);
  /* Two links may run between the same pair of nodes — a passage can answer more
     than one of the four questions — and both must be drawn, not collapsed. */
  const pairs24 = new Set(specs.s24.links.map((l) => `${l.from}>${l.to}`));
  check('a node pair with more than one connector draws every one of them',
    specs.s24.links.length > pairs24.size && s24.crossCount === specs.s24.links.length,
    `${s24.crossCount} connectors over ${pairs24.size} node pair(s)`);
  const hudRun = await page.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
    /* The block's own controls: Play/Stop and Overview. The full-screen control
       is the third affordance and is counted separately below, so the HUD's own
       count stays the two this assertion is about. */
    const own = [...mm.querySelectorAll('.mm-hud .mm-btn:not([data-mm-fs])')];
    return {
      controls: own.length,
      labels: own.map((b) => b.textContent.trim()),
      fs: mm.querySelectorAll('.mm-hud [data-mm-fs]').length,
      width: Math.round(mm.querySelector('.mm-hud').getBoundingClientRect().width)
    };
  });
  check('the in-block HUD is two controls (Play/Stop, Overview)', hudRun.controls === 2, `${hudRun.controls}: ${hudRun.labels.join(' / ')}`);
  check('the block adds exactly one full-screen control', hudRun.fs === 1, `${hudRun.fs} full-screen control(s)`);
  check('every step of s2-4 opens a scene', s24.scenes === 4, `${s24.scenes} scenes`);
  check('every step of s2-3 opens a scene', s23.scenes === 2, `${s23.scenes} scenes`);

  /* Screenshots: the block itself, plus the figure in its column. The pointer
     rests on the block's centre first, which clears the idle fade so the proof
     shows the two controls (and cannot land on a branch, which would trace it). */
  await wake(page, 'figure[data-diagram="s2-3"] .mm');
  await shot(page, 'figure[data-diagram="s2-3"] .mm', 's2-3-map.png');
  await wake(page, 'figure[data-diagram="s2-4"] .mm');
  await shot(page, 'figure[data-diagram="s2-4"] .mm', 's2-4-map.png');
  /* In context: the block in the lesson column, at 1440x1000, with the existing
     "Replay animation" control underneath it - the third affordance the block
     reuses rather than re-implements (C19). */
  await hideOverlappingCards(page, 'figure[data-diagram="s2-4"] .mm');
  await page.screenshot({ path: path.join(OUT, 'in-lesson.png') });

  /* Replay: the figure's own .chain-replay must restart *this* block. */
  const replayBefore = await page.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
    return [...mm.querySelectorAll('.mm-head .mm-card')]
      .map((el) => el.getAnimations().map((a) => a.playState).join(','));
  });
  await page.locator('figure[data-diagram="s2-3"]').evaluate((fig) => {
    const btn = fig.nextElementSibling;
    if (btn && btn.matches('[data-chain-replay]')) btn.click();
  });
  await page.waitForTimeout(220);
  const replayAfter = await page.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
    return {
      running: [...mm.querySelectorAll('.mm-head .mm-card')].filter((el) => el.getAnimations().some((a) => a.playState === 'running')).length,
      visible: mm.classList.contains('is-visible')
    };
  });
  await page.waitForTimeout(3200);
  const replaySettled = await page.evaluate(() => getComputedStyle(
    document.querySelector('figure[data-diagram="s2-3"] .mm-head .mm-card')).opacity);
  check('the figure\'s Replay control restarts this block\'s entrance',
    replayBefore.every((s) => !s.includes('running')) && replayAfter.running > 0 && replaySettled === '1',
    `${replayAfter.running} card(s) animating after the press, settled at opacity ${replaySettled}`);

  /* (e) the keyboard is scoped to the block. */
  await page.locator('figure[data-diagram="s2-3"] .mm').evaluate((el) => el.focus());
  await page.locator('figure[data-diagram="s2-3"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => window.scrollY);
  for (const key of ['3', 'l', 'Space']) {
    await page.keyboard.press(key === 'Space' ? 'Space' : key);
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(300);
  const afterKeys = await page.evaluate(() => ({
    scrollY: window.scrollY,
    open: document.querySelectorAll('.mm-scene.is-active').length,
    focusInBlock: !!document.activeElement.closest && !!document.activeElement.closest('.mm')
  }));
  check('3 / L / Space open no scene', afterKeys.open === 0, `${afterKeys.open} open scene(s)`);
  check('3 / L / Space do not move the page', Math.abs(afterKeys.scrollY - before) < 2, `scrollY ${before} \u2192 ${afterKeys.scrollY}`);
  check('the block keeps focus while its keys are pressed', afterKeys.focusInBlock);

  /* Escape closes an open node, from inside the block. */
  await page.locator('figure[data-diagram="s2-3"] .mm-branch[data-mm="not-cleave"] .mm-card').first().click();
  await page.waitForTimeout(1200);
  const opened = await page.evaluate(() => ({
    open: document.querySelectorAll('.mm-scene.is-active').length,
    inScene: !!document.querySelector('figure[data-diagram="s2-3"] .mm.in-scene'),
    chainNodes: document.querySelectorAll('figure[data-diagram="s2-3"] .mm-scene.is-active .mm-cn').length,
    focusInside: !!(document.activeElement.closest && document.activeElement.closest('.mm'))
  }));
  check('a node opens on click', opened.open === 1 && opened.inScene, `open=${opened.open} in-scene=${opened.inScene}`);
  check('the open node shows its own leaves on the chain', opened.chainNodes === 4, `${opened.chainNodes} chain nodes`);
  check('focus moves into the opened film', opened.focusInside);
  /* The film's own timeline: the caption lands at ~3.4 s, after the chain. */
  await page.waitForTimeout(2800);
  await shot(page, 'figure[data-diagram="s2-3"] .mm', 's2-3-scene-not-cleave.png');
  const filmText = await page.evaluate(() => {
    const scene = document.querySelector('figure[data-diagram="s2-3"] .mm-scene.is-active');
    const title = scene.querySelector('.mm-sc-title');
    const caption = scene.querySelector('.mm-sc-caption');
    return {
      title: title ? title.textContent : '',
      titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).fontSize)) : 0,
      caption: caption ? caption.textContent : '',
      captionOpacity: caption ? getComputedStyle(caption).opacity : '0',
      dimmed: getComputedStyle(document.querySelector('figure[data-diagram="s2-3"] .mm-world')).filter,
      chain: [...scene.querySelectorAll('.mm-cn .mm-lbl b')].map((el) => el.textContent)
    };
  });
  check('the film\'s title is the node\'s own title, on one line',
    filmText.title === specs.s23.steps[1].title && filmText.titleLines === 1,
    `"${filmText.title}" over ${filmText.titleLines} line(s)`);
  check('the film\'s chain is the node\'s own leaves, in order',
    JSON.stringify(filmText.chain) === JSON.stringify(leavesOf(specs.s23.steps[1])), filmText.chain.join(' | '));
  check('the film\'s caption is the diagram\'s own note',
    filmText.caption === specs.s23.note && filmText.captionOpacity === '1',
    `"${filmText.caption}" at opacity ${filmText.captionOpacity}`);
  check('the map steps back behind an open film', /blur/.test(filmText.dimmed), filmText.dimmed);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  const closed = await page.evaluate(() => ({
    open: document.querySelectorAll('.mm-scene.is-active').length,
    inScene: !!document.querySelector('figure[data-diagram="s2-3"] .mm.in-scene'),
    focusInBlock: !!(document.activeElement.closest && document.activeElement.closest('.mm'))
  }));
  check('Escape inside the block closes the open node', closed.open === 0 && !closed.inScene,
    `open=${closed.open} in-scene=${closed.inScene}`);
  check('Escape does not eject focus from the block', closed.focusInBlock);

  /* s2-4's cited node: the chip is the audited control, and it must still open
     the sitting's reference row from inside the block (C9). The block is centred
     in the viewport first, so the page's own sticky sitting bar is not over it. */
  await page.evaluate(() => document.querySelector('figure[data-diagram="s2-4"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.locator('figure[data-diagram="s2-4"] .mm-branch[data-mm="strikes"] .mm-card').first().click();
  await page.waitForTimeout(1400);
  /* Re-centre after the press: the page's own sticky bars sit at the top of the
     viewport and would otherwise be captured over the film's title. */
  await page.evaluate(() => document.querySelector('figure[data-diagram="s2-4"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(400);
  await wake(page, 'figure[data-diagram="s2-4"] .mm');
  const filmRect = await page.evaluate(() => {
    const title = document.querySelector('figure[data-diagram="s2-4"] .mm-scene.is-active .mm-sc-title');
    if (!title) return null;
    const r = title.getBoundingClientRect();
    return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), viewport: window.innerHeight };
  });
  check('the film\'s title is on screen, laid out inside the block',
    !!filmRect && filmRect.height > 20 && filmRect.top > 0 && filmRect.top + filmRect.height < filmRect.viewport,
    filmRect ? `top ${filmRect.top}, ${filmRect.width}x${filmRect.height}, viewport ${filmRect.viewport}` : 'no title');
  await shot(page, 'figure[data-diagram="s2-4"] .mm', 's2-4-scene-strikes.png');
  const citeRun = await page.evaluate(() => {
    const chip = document.querySelector('figure[data-diagram="s2-4"] .mm-scene.is-active .chain-cite');
    return {
      chip: !!chip,
      text: chip ? chip.textContent : '',
      inFilm: !!chip && !!chip.closest('.mm-scene'),
      dangling: !!chip && !!chip.closest('[data-mm-open]')
    };
  });
  await page.locator('figure[data-diagram="s2-4"] .mm-scene.is-active .chain-cite').click();
  await page.waitForTimeout(1000);
  const revealed = await page.evaluate(() => ({
    hits: document.querySelectorAll('#sheet-verify .cite-row.is-hit').length,
    openRows: document.querySelectorAll('#sheet-verify .cite-row .cite-details[open]').length,
    verifyHidden: document.getElementById('sheet-verify').hidden
  }));
  check('the film\'s badge is the step\'s own cite chip', citeRun.chip && citeRun.text === 'Dan. 2:34' && citeRun.inFilm && !citeRun.dangling,
    `"${citeRun.text}" in film=${citeRun.inFilm} nested in card=${citeRun.dangling}`);
  check('pressing the chip opens its reference row from inside the block',
    revealed.hits > 0 && revealed.openRows > 0 && !revealed.verifyHidden,
    `${revealed.hits} row(s) hit, ${revealed.openRows} opened, list hidden=${revealed.verifyHidden}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  /* s2-4's cited node: the chip is a sibling of the card, not inside it (C9). */
  const citeStructure = await page.evaluate(() => {
    const branch = document.querySelector('figure[data-diagram="s2-4"] .mm-branch[data-mm="strikes"]');
    const chip = branch.querySelector('.mm-cite .chain-cite');
    return {
      chip: !!chip,
      text: chip ? chip.textContent : '',
      insideButton: !!(chip && chip.closest('[data-mm-open]')),
      headsWithChip: document.querySelectorAll('figure[data-diagram="s2-4"] .mm-head .mm-cite').length
    };
  });
  check('the cite chip renders as a chip', citeStructure.chip && citeStructure.text === 'Dan. 2:34', citeStructure.text);
  check('the cite chip is not nested in the node button', !citeStructure.insideButton);
  check('only the authored step carries a cite chip', citeStructure.headsWithChip === 1, `${citeStructure.headsWithChip} chips`);

  /* Themes: the block stays a dark inset and its text does not inherit ink. */
  const themeRun = await page.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
    const read = () => {
      const text = mm.querySelector('.mm-text');
      const name = mm.querySelector('.mm-name');
      return {
        ground: getComputedStyle(mm).backgroundColor + ' | ' + getComputedStyle(mm).backgroundImage.slice(0, 40),
        text: getComputedStyle(text).color,
        name: getComputedStyle(name).color,
        textSize: getComputedStyle(text).fontSize,
        textMargin: getComputedStyle(text).marginBottom
      };
    };
    const before = read();
    document.body.classList.add('paper-mode');
    const paper = read();
    document.body.classList.remove('paper-mode');
    document.body.classList.add('white-mode');
    const white = read();
    document.body.classList.remove('white-mode');
    return { before, paper, white };
  });
  check('leaf text is 15.5px with no bottom margin (C5 reset)',
    themeRun.before.textSize === '15.5px' && themeRun.before.textMargin === '0px',
    `${themeRun.before.textSize} / margin ${themeRun.before.textMargin}`);
  check('paper/white keep the leaf text on the dark ground',
    themeRun.paper.text === 'rgb(203, 195, 176)' && themeRun.white.text === 'rgb(203, 195, 176)',
    `${themeRun.paper.text} / ${themeRun.white.text}`);
  check('paper/white keep the node title on the dark ground',
    themeRun.paper.name === 'rgb(244, 236, 216)' && themeRun.white.name === 'rgb(244, 236, 216)',
    `${themeRun.paper.name} / ${themeRun.white.name}`);

  /* Print: the block flattens to a list, not a black rectangle. */
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  const printRun = await page.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
    const list = mm.querySelector('.mm-print');
    return {
      listShown: getComputedStyle(list).display,
      mapHidden: getComputedStyle(mm.querySelector('.mm-viewport')).display,
      ground: getComputedStyle(mm).backgroundColor,
      items: list.querySelectorAll('.mm-print-list > li').length,
      points: list.querySelectorAll('.mm-print-points > li').length
    };
  });
  await page.screenshot({ path: path.join(OUT, 's2-3-print.png'), fullPage: false });
  await page.emulateMedia({ media: 'screen' });
  check('print hides the map and shows the audited list',
    printRun.listShown === 'block' && printRun.mapHidden === 'none', `list=${printRun.listShown} map=${printRun.mapHidden}`);
  check('print lays the same steps and leaves out as a list',
    printRun.items === 2 && printRun.points === 4, `${printRun.items} steps, ${printRun.points} points`);

  /* - the factory contract: resize(), refresh(), destroy() ---- */
  const refreshRun = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s2-3"]');
    const api = fig.__mm;
    api.resize();
    api.refresh();
    const mm = fig.querySelector('.mm');
    return {
      hasApi: !!(api && api.resize && api.refresh && api.destroy),
      blocks: fig.querySelectorAll('.mm').length,
      branches: mm.querySelectorAll('.mm-branch').length,
      leaves: mm.querySelectorAll('.mm-leaf').length,
      scenes: mm.querySelectorAll('.mm-scene').length,
      visible: mm.classList.contains('is-visible')
    };
  });
  check('resize() and refresh() rebuild one block, not two',
    refreshRun.hasApi && refreshRun.blocks === 1 && refreshRun.branches === 2 && refreshRun.leaves === 4 && refreshRun.scenes === 2,
    `${refreshRun.blocks} block(s), ${refreshRun.branches} nodes, ${refreshRun.leaves} leaves, visible=${refreshRun.visible}`);

  const destroyRun = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s2-4"]');
    const host = fig.querySelector('.mm');
    const before = host.querySelectorAll('*').length;
    fig.__mm.destroy();
    return { before, after: host.querySelectorAll('*').length, cls: host.className };
  });
  check('destroy() removes every node, link and control it built',
    destroyRun.before > 40 && destroyRun.after === 0 && destroyRun.cls.trim() === '',
    `${destroyRun.before} \u2192 ${destroyRun.after} elements, class="${destroyRun.cls}"`);

  /* A destroyed map must not answer a resize or a key press any more. The class
     is gone with the teardown, so the host is found by its data attribute. */
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.waitForTimeout(400);
  await page.locator('figure[data-diagram="s2-4"] [data-mm-host]').evaluate((el) => el.focus());
  for (const key of ['ArrowRight', 'Escape', ' ']) await page.keyboard.press(key === ' ' ? 'Space' : key);
  await page.waitForTimeout(300);
  const afterDestroy = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s2-4"]');
    const host = fig.querySelector('[data-mm-host]');
    return { children: host.querySelectorAll('*').length, open: document.querySelectorAll('.mm-scene.is-active').length };
  });
  check('a destroyed map stays inert through resize and key presses',
    afterDestroy.children === 0 && afterDestroy.open === 0, `${afterDestroy.children} children, ${afterDestroy.open} open scene(s)`);

  /* Sitting switch: destroy() runs from renderSheetDiagrams, and the map is
     rebuilt from scratch when the sitting comes back. */
  await page.setViewportSize({ width: 1440, height: 1000 });
  const replaysBefore = await page.evaluate(() => document.querySelectorAll('#sheet-article [data-chain-replay]').length);
  await page.evaluate(() => window.openSittingFromPortal && window.openSittingFromPortal(1));
  await page.waitForTimeout(1800);
  const away = await page.evaluate(() => document.querySelectorAll('#sheet-article .mm').length);
  await page.evaluate(() => window.openSittingFromPortal && window.openSittingFromPortal(2));
  await page.waitForTimeout(2200);
  const back = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-diagram="s2-3"]');
    const mm = fig ? fig.querySelector('.mm') : null;
    const figures = [...document.querySelectorAll('#sheet-article figure[data-diagram]')];
    return {
      blocks: document.querySelectorAll('#sheet-article .mm').length,
      mounted: !!(fig && fig.__mm),
      branches: mm ? mm.querySelectorAll('.mm-branch').length : 0,
      leaves: mm ? mm.querySelectorAll('.mm-leaf').length : 0,
      replays: document.querySelectorAll('#sheet-article [data-chain-replay]').length,
      /* C19: the block carries two controls and borrows the figure's Replay. */
      perFigure: figures.filter((f) => f.querySelector('.mm')).map((f) => ({
        id: f.getAttribute('data-diagram'),
        ownReplay: !!(f.nextElementSibling && f.nextElementSibling.matches('[data-chain-replay]')),
        replayInsideBlock: f.querySelectorAll('.mm [data-chain-replay]').length,
        hudButtons: f.querySelectorAll('.mm-hud .mm-btn:not([data-mm-fs])').length,
        fullScreenButtons: f.querySelectorAll('.mm-hud [data-mm-fs]').length
      }))
    };
  });
  check('a sitting switch tears the map down and the return rebuilds it',
    away === 0 && back.blocks === 2 && back.mounted && back.branches === 2 && back.leaves === 4,
    `away ${away} block(s); back ${back.blocks} blocks, ${back.branches} nodes, ${back.leaves} leaves, mounted=${back.mounted}`);
  check('the round trip leaves no extra Replay control behind',
    back.replays === replaysBefore, `${replaysBefore} before the switch, ${back.replays} after`);
  check('each map reuses the figure\'s own Replay control and adds none inside',
    back.perFigure.length === 2 && back.perFigure.every((f) => f.ownReplay && f.replayInsideBlock === 0 && f.hudButtons === 2 && f.fullScreenButtons === 1),
    back.perFigure.map((f) => `${f.id}: own=${f.ownReplay} inside=${f.replayInsideBlock} hud=${f.hudButtons} fs=${f.fullScreenButtons}`).join('; '));

  /* - 2. reduced motion: connectors must be visible ---- */
  const reduceContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await reduceContext.addInitScript((mock) => {
    try { localStorage.setItem('baQaMockSession', JSON.stringify(mock)); } catch (e) { /* ignore */ }
  }, MOCK);
  const reducePage = await reduceContext.newPage();
  reducePage.on('pageerror', (e) => consoleErrors.push('reduce: ' + String(e.message)));
  await reducePage.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
  await reducePage.waitForTimeout(1800);
  await dismissOverlays(reducePage);
  await reducePage.waitForTimeout(600);

  const reduceRun = await reducePage.evaluate(() => {
    const out = { figures: {}, visible: {}, scene: null };
    ['s2-3', 's2-4'].forEach((id) => {
      const mm = document.querySelector(`figure[data-diagram="${id}"] .mm`);
      const links = [...mm.querySelectorAll('.mm-link')];
      out.figures[id] = links.map((el) => {
        const box = el.getBBox();
        return {
          dash: getComputedStyle(el).strokeDasharray,
          offset: getComputedStyle(el).strokeDashoffset,
          dashed: el.classList.contains('is-dashed'),
          empty: box.width === 0 && box.height === 0,
          isVisible: mm.classList.contains('is-visible')
        };
      });
      out.visible[id] = {
        card: getComputedStyle(mm.querySelector('.mm-head .mm-card')).opacity,
        linkCount: links.length
      };
    });
    return out;
  });
  const reduceLinks = [...reduceRun.figures['s2-3'], ...reduceRun.figures['s2-4']];
  check('reduced motion: the map is revealed synchronously',
    reduceRun.visible['s2-3'].isVisible !== false && reduceRun.visible['s2-3'].card === '1' && reduceRun.visible['s2-4'].card === '1',
    `card opacity ${reduceRun.visible['s2-3'].card}`);
  // Reduced motion removes the draw-on, not the vocabulary. A solid connector
  // reveals itself by animating an offset against a one-unit dash, so killing
  // that animation must leave it truly solid; a dashed connector's pattern *is*
  // its meaning (dashed = cross-link, solid = spine step), so the pattern stays
  // and only the fade goes.
  const solidLinks = reduceLinks.filter((l) => !l.dashed);
  const dashedLinks = reduceLinks.filter((l) => l.dashed);
  check('reduced motion: every solid connector is drawn fully solid',
    solidLinks.length > 0 && solidLinks.every((l) => l.dash === 'none'),
    `${solidLinks.length} solid links, dash values: ${[...new Set(solidLinks.map((l) => l.dash))].join(' | ')}`);
  check('reduced motion: dashed connectors keep their dash pattern',
    dashedLinks.length > 0 && dashedLinks.every((l) => l.dash !== 'none' && l.dash !== '1px'),
    `${dashedLinks.length} dashed links, dash values: ${[...new Set(dashedLinks.map((l) => l.dash))].join(' | ')}`);
  check('reduced motion: every connector has a non-empty bounding box',
    reduceLinks.every((l) => !l.empty), `${reduceLinks.filter((l) => l.empty).length} empty`);
  check('reduced motion: stroke-dashoffset is reset',
    reduceLinks.every((l) => l.offset === '0px' || l.offset === '0'), [...new Set(reduceLinks.map((l) => l.offset))].join(' | '));
  await shot(reducePage, 'figure[data-diagram="s2-3"] .mm', 'reduced-s2-3-map.png');

  await reducePage.locator('figure[data-diagram="s2-3"] .mm-branch[data-mm="not-cleave"] .mm-card').first().click();
  await reducePage.waitForTimeout(900);
  const reduceScene = await reducePage.evaluate(() => {
    const scene = document.querySelector('figure[data-diagram="s2-3"] .mm-scene.is-active');
    if (!scene) return null;
    const segs = [...scene.querySelectorAll('.mm-seg')];
    return {
      segs: segs.length,
      dash: [...new Set(segs.map((el) => getComputedStyle(el).strokeDasharray))],
      offset: [...new Set(segs.map((el) => getComputedStyle(el).strokeDashoffset))],
      empty: segs.filter((el) => { const b = el.getBBox(); return b.width === 0 && b.height === 0; }).length
    };
  });
  await shot(reducePage, 'figure[data-diagram="s2-3"] .mm', 'reduced-s2-3-scene.png');
  check('reduced motion: the opened node\'s chain segments are visible',
    !!reduceScene && reduceScene.segs === 3 && reduceScene.dash.every((d) => d === 'none') && reduceScene.empty === 0,
    reduceScene ? `${reduceScene.segs} segments, dash ${reduceScene.dash.join('|')}, empty ${reduceScene.empty}` : 'no scene opened');
  await reduceContext.close();

  /* - 3. print of the whole figure + mobile overflow ---- */

  /* (f) 390x844: no horizontal overflow, compact outline instead of a stage. */
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobileContext.addInitScript((mock) => {
    try { localStorage.setItem('baQaMockSession', JSON.stringify(mock)); } catch (e) { /* ignore */ }
  }, MOCK);
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', (e) => consoleErrors.push('mobile: ' + String(e.message)));
  await mobilePage.goto(`${BASE}/study.html?sheet=2&preview=full`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1800);
  await dismissOverlays(mobilePage);
  await mobilePage.locator('figure[data-diagram="s2-3"]').scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(900);
  const mobile = await mobilePage.evaluate(() => {
    const mm = document.querySelector('figure[data-diagram="s2-3"] .mm');
    const rect = mm.getBoundingClientRect();
    const doc = document.documentElement;
    const figures = [...document.querySelectorAll('#sheet-article figure[data-diagram]')];
    const widest = (els) => Math.max(0, ...els.map((el) => {
      const r = el.getBoundingClientRect();
      return Math.round(r.right - doc.clientWidth);
    }));
    const withMaps = doc.scrollWidth;
    const figureOverhang = widest(figures);
    // Does the mindmap itself add any sideways scroll? Hide every diagram figure
    // and compare: this page already overflows 4 px from the horizon rail (the
    // same 394 px appears on a sitting with no mindmap), so only the delta is
    // attributable to this renderer.
    figures.forEach((el) => { el.style.display = 'none'; });
    const withoutMaps = doc.scrollWidth;
    figures.forEach((el) => { el.style.display = ''; });
    return {
      scrollWidth: withMaps,
      withoutDiagrams: withoutMaps,
      clientWidth: doc.clientWidth,
      figureOverhang,
      blockLeft: Math.round(rect.left),
      blockRight: Math.round(rect.right),
      compact: mm.classList.contains('is-compact'),
      linksHidden: getComputedStyle(mm.querySelector('.mm-links')).display,
      leaves: mm.querySelectorAll('.mm-leaf .mm-text').length,
      cardWidth: Math.round(mm.querySelector('.mm-leaf .mm-card').getBoundingClientRect().width)
    };
  });
  /* A sitting with no mindmap in it, for the same measurement: the baseline any
     horizontal overflow has to be compared against. */
  const baselinePage = await mobileContext.newPage();
  await baselinePage.goto(`${BASE}/study.html?sheet=1&preview=full`, { waitUntil: 'domcontentloaded' });
  await baselinePage.waitForTimeout(1600);
  await dismissOverlays(baselinePage);
  await baselinePage.waitForTimeout(600);
  const baselineScroll = await baselinePage.evaluate(() => document.documentElement.scrollWidth);
  await baselinePage.close();
  /* The page pins its own chrome over this viewport (the "All Lessons" bar, the
     sitting survey card and the floating insight card), so the block shot is
     supplemented by the branch that owns the four leaves. */
  await shot(mobilePage, 'figure[data-diagram="s2-3"] .mm-branch[data-mm="not-cleave"]', 'mobile-390-s2-3-branch.png');
  await shot(mobilePage, 'figure[data-diagram="s2-3"] .mm', 'mobile-390-s2-3-block.png');
  check('390x844: the mindmap adds no horizontal overflow',
    mobile.scrollWidth === mobile.withoutDiagrams && mobile.figureOverhang <= 0,
    `page ${mobile.scrollWidth}px with diagrams, ${mobile.withoutDiagrams}px without; figure overhang ${mobile.figureOverhang}px`);
  check('390x844: the document overflow is the page\'s own, not the mindmap\'s',
    mobile.scrollWidth === baselineScroll,
    `sitting 2 ${mobile.scrollWidth}px vs sitting 1 (no mindmap) ${baselineScroll}px, viewport ${mobile.clientWidth}px`);
  check('390x844: the block stays inside the viewport',
    mobile.blockLeft >= -1 && mobile.blockRight <= mobile.clientWidth + 1,
    `block ${mobile.blockLeft}\u2026${mobile.blockRight}`);
  check('390x844: the block switches to the compact outline',
    mobile.compact && mobile.linksHidden === 'none', `compact=${mobile.compact} links=${mobile.linksHidden}`);
  check('390x844: every leaf is still readable in the outline', mobile.leaves === 4 && mobile.cardWidth > 200,
    `${mobile.leaves} leaves, card ${mobile.cardWidth}px`);
  await mobileContext.close();

  if (consoleErrors.length) problems.push(`console errors: ${consoleErrors.length} - ${consoleErrors.slice(0, 4).join(' ; ')}`);
} finally {
  await browser.close();
}

async function readMap(page, id) {
  const figure = page.locator(`figure[data-diagram="${id}"]`);
  await figure.scrollIntoViewIfNeeded();
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel + ' .mm');
    return !!el && el.classList.contains('is-visible') && el.querySelectorAll('.mm-branch').length > 0;
  }, `figure[data-diagram="${id}"]`, { timeout: 10000 }).catch(() => {});
  /* The entrance is ~2.2 s for s2-3 and ~3.2 s for s2-4; the assertions are on
     final geometry, so let it land before measuring. */
  await page.waitForTimeout(3600);
  return figure.evaluate((fig) => {
    const mm = fig.querySelector('.mm');
    const mmRect = mm.getBoundingClientRect();
    const mid = mmRect.left + mmRect.width / 2;
    const heads = [...mm.querySelectorAll('.mm-branch')].map((branch) => {
      const head = branch.querySelector('.mm-head');
      const rect = head.getBoundingClientRect();
      return {
        id: branch.getAttribute('data-mm'),
        role: (head.querySelector('.mm-tag') || {}).textContent || '',
        title: (head.querySelector('.mm-name') || {}).textContent || '',
        leaves: [...branch.querySelectorAll('.mm-leaf .mm-text')].map((el) => el.textContent),
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        side: (rect.left + rect.width / 2) < mid ? 'L' : 'R'
      };
    });
    return {
      heads,
      branches: mm.querySelectorAll('.mm-branch').length,
      leaves: mm.querySelectorAll('.mm-leaf').length,
      centres: mm.querySelectorAll('.mm-centre').length,
      centre: (mm.querySelector('.mm-core b') || {}).textContent || '',
      cites: [...mm.querySelectorAll('.mm-head .chain-cite')].map((el) => el.textContent),
      /* Every connector pill is `.mm-label`, in a `.mm-xlabel` wrapper. A
         cross-link pill and a fan pill are told apart only by the wrapper's
         `is-fan` class, so the cross-link set is derived by subtraction and the
         assertions below count kinds rather than trusting an exact sequence. */
      allLabels: [...mm.querySelectorAll('.mm-label')].map((el) => el.textContent.trim()),
      fanLabels: [...mm.querySelectorAll('.mm-xlabel.is-fan .mm-label')].map((el) => el.textContent.trim()),
      spines: mm.querySelectorAll('.mm-cross-link.is-spine').length,
      dasheds: mm.querySelectorAll('.mm-cross-link.is-dashed').length,
      crossCount: mm.querySelectorAll('.mm-cross-link').length,
      fanCount: mm.querySelectorAll('.mm-xlabel.is-fan').length,
      spine: mm.querySelectorAll('.mm-cross-link.is-spine').length,
      dashed: mm.querySelectorAll('.mm-cross-link.is-dashed').length,
      scenes: mm.querySelectorAll('.mm-scene').length,
      links: mm.querySelectorAll('.mm-link').length,
      ascii: (fig.querySelector('.chain-ascii') || {}).textContent || '',
      replay: !!(fig.parentNode && fig.parentNode.querySelector('[data-chain-replay]')),
      box: { left: Math.round(mmRect.left), right: Math.round(mmRect.right), height: Math.round(mmRect.height) }
    };
  });
}

async function shot(page, selector, name) {
  const file = path.join(OUT, name);
  const el = page.locator(selector).first();
  /* Instant, not smooth: the page sets scroll-behavior:smooth, and a capture
     taken mid-scroll lands the block half out of the viewport. */
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
  await page.waitForTimeout(250);
  await hideOverlappingCards(page, selector);
  await el.screenshot({ path: file }).catch(async () => { await page.screenshot({ path: file }); });
  return file;
}

/* The page pins its survey and lesson-context cards to the viewport (fixed,
   z-index 72). One that happens to sit over the block would be captured on top
   of it, so it is hidden for the duration of the shot - display:none, not
   remove(), because the app keeps writing into those panels. */
async function hideOverlappingCards(page, selector) {
  await page.locator(selector).first().evaluate((node) => {
    const r = node.getBoundingClientRect();
    document.querySelectorAll('.insight-card').forEach((card) => {
      const c = card.getBoundingClientRect();
      const hit = c.width > 0 && c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top;
      if (hit) card.style.display = 'none';
    });
  }).catch(() => {});
  await page.waitForTimeout(120);
}

/* Clears the block's idle fade by resting the pointer on the block's centre -
   on the centre node, not on a branch, so nothing is traced and the camera
   parallax settles at zero. */
async function wake(page, selector) {
  const el = page.locator(selector).first();
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
  await page.waitForTimeout(250);
  const box = await el.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
}

/* The sitting guide, the lock banner, the toast and the insights pulse card all
   sit over the lesson (the pulse card is fixed, z-index 72, and reaches over the
   diagram's corner). None of them is what is under test, so each is dismissed
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
    /* The insights pulse card is fixed, z-index 72 and queues one after another.
       Dismiss the queue the way a reader would; the cards themselves are only
       hidden for a screenshot (shot() below), never removed - the page's own
       lesson-context panel is an .insight-card too and the app writes to it. */
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
