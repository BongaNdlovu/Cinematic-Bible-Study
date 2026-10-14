/*
 * Visual + behavioural check for the three `flow` diagrams that stay flows
 * (`s4-4`, `s4-5`, `s10-2`): the connector rail through the stacked steps, the
 * travelling highlight that runs it on entry and from the figure's own Replay
 * control, each step opening the existing full-screen reader as its scene, the
 * `'amad` side-note and its counter-node, and the block's behaviour under
 * `prefers-reduced-motion: reduce` and at 390x844.
 *
 * Usage (server must already serve the repo root):
 *   node tools/verify/verify_flow.mjs --base=http://127.0.0.1:8090
 *
 * Writes PNGs to qa/proofs/flow/ and prints a JSON summary ending in
 * `problems` and `consoleErrors`.
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
const BASE = String(args.base || 'http://127.0.0.1:8090').replace(/\/$/, '');
const OUT = path.join('qa', 'proofs', 'flow');
fs.mkdirSync(OUT, { recursive: true });

// The three flows that stay flows, and the sitting each one lives in. The
// expected step order is read from the authored spec files — the same files
// tools/diagrams/sync-specs.mjs keeps identical to the live data — so "the DOM
// matches the spec" is asserted against the spec, not against the page.
const FLOWS = [
  { sheet: 4, id: 's4-4', spec: '_mig/spec4.json' },
  { sheet: 4, id: 's4-5', spec: '_mig/spec4.json' },
  { sheet: 10, id: 's10-2', spec: '_mig/spec10.json' }
];
for (const flow of FLOWS) {
  const specs = JSON.parse(fs.readFileSync(flow.spec, 'utf8'));
  flow.titles = (specs[flow.id].steps || []).map((step) => String(step.title || ''));
}

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

const summary = {
  base: BASE,
  flows: [],
  reducedMotion: [],
  mobile: null,
  problems: [],
  consoleErrors: [],
};
const problem = (where, text) => summary.problems.push(`${where}: ${text}`);
const shot = async (page, name) => {
  // The pointer is parked away from the block: a stray hover would brighten a
  // card in the proof.
  await page.mouse.move(4, 4);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  return `${name}.png`;
};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  await context.addInitScript((mock) => {
    try {
      localStorage.setItem('baQaMockSession', JSON.stringify(mock));
      const raw = localStorage.getItem('baJourney');
      const j = raw ? JSON.parse(raw) : {};
      j.termsAccepted = true;
      j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
      // A member who has worked through the course: every sitting is open, so
      // the run can read the diagrams of any sitting without the lock banner.
      j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) { /* storage disabled */ }
  }, MOCK);

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  for (const sheet of [4, 10]) {
    await openSheet(page, sheet);
    for (const flow of FLOWS.filter((f) => f.sheet === sheet)) {
      summary.flows.push(await auditFlow(page, flow));
      // The block is a dark inset with explicit paper/white restores; the rail and
      // the dashed side-note are new ink and have to be repainted with them.
      if (flow.id === 's10-2') summary.themes = await auditThemes(page, flow);
    }
  }

  // The same three blocks with the reader's reduced-motion preference set.
  const rmContext = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await rmContext.addInitScript((mock) => {
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
  const rmPage = await rmContext.newPage();
  rmPage.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  rmPage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  for (const sheet of [4, 10]) {
    await openSheet(rmPage, sheet);
    for (const flow of FLOWS.filter((f) => f.sheet === sheet)) {
      summary.reducedMotion.push(await auditReduced(rmPage, flow));
    }
  }
  await rmContext.close();

  // The block on the narrowest screen the site supports.
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobileContext.addInitScript((mock) => {
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
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  mobilePage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await openSheet(mobilePage, 10);
  summary.mobile = await auditMobile(mobilePage, FLOWS.find((f) => f.id === 's10-2'));
  await mobileContext.close();

  summary.consoleErrors = consoleErrors.slice(0, 12);
  if (consoleErrors.length) problem('page', `console errors: ${consoleErrors.length}`);
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.problems.length ? 1 : 0);

// The sitting guide, the lock banner, and the toast all sit over the lesson.
// None of them is what is under test, so each is dismissed before the diagrams
// are read or clicked.
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
    if (toast) {
      toast.classList.add('opacity-0', 'pointer-events-none');
      toast.textContent = '';
    }
  });
  await page.waitForTimeout(400);
}

async function openSheet(page, sheet) {
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await dismissOverlays(page);
  if (sheet !== 0) {
    await page.evaluate((index) => {
      if (window.openSittingFromPortal) window.openSittingFromPortal(index);
    }, sheet);
    await page.waitForTimeout(1800);
    await dismissOverlays(page);
  }
  await page.waitForSelector('#sheet-article figure.chain', { timeout: 20000 }).catch(() => {});
}

function flowFigure(page, id) {
  return page.$(`#sheet-article figure[data-diagram="${id}"]`);
}

function PROBE(fig) {
  const pulse = fig.querySelector('.flow-rail-pulse');
  const running = (fig.getAnimations ? fig.getAnimations({ subtree: true }) : [])
    .filter((a) => a.playState === 'running')
    .map((a) => (a.animationName || a.transitionProperty || '?'));
  return {
    entered: fig.classList.contains('is-visible'),
    pulse: !!pulse,
    pulseName: pulse ? getComputedStyle(pulse).animationName : '',
    running: running.slice(0, 10),
    sweepRunning: running.includes('flow-travel'),
  };
}

// The sweep starts when the intersection callback lands, which the page decides;
// poll for it rather than assuming a frame count.
async function waitForSweep(page, figure, budget) {
  const until = Date.now() + budget;
  let last = null;
  for (;;) {
    last = await figure.evaluate(PROBE);
    if (last.sweepRunning || Date.now() > until) return last;
    await page.waitForTimeout(100);
  }
}

// The entrance is gated on the same intersection callback in both motion
// modes, so both wait for the block to have been taken as visible.
async function waitForEntered(page, figure, budget) {
  const until = Date.now() + budget;
  for (;;) {
    const entered = await figure.evaluate((fig) => fig.classList.contains('is-visible'));
    if (entered || Date.now() > until) return entered;
    await page.waitForTimeout(100);
  }
}

// Everything is animated to its resting state, so wait for the block to stop
// moving instead of guessing how long the entrance takes.
async function waitForSettle(page, figure, budget) {
  const until = Date.now() + budget;
  let last = null;
  for (;;) {
    last = await figure.evaluate((fig) => {
      const steps = [...fig.querySelectorAll('.flow-step')];
      const lines = [...fig.querySelectorAll('.flow-connector-line')];
      const running = (fig.getAnimations ? fig.getAnimations({ subtree: true }) : [])
        .filter((a) => a.playState === 'running')
        .map((a) => (a.animationName || a.transitionProperty || '?'));
      const opacities = steps.map((s) => Number(getComputedStyle(s).opacity).toFixed(2));
      const lineHeights = lines.map((l) => Math.round(l.getBoundingClientRect().height));
      const pulse = fig.querySelector('.flow-rail-pulse');
      return {
        opacities,
        allVisible: opacities.length > 0 && opacities.every((o) => Number(o) > 0.99),
        lineHeights,
        linesDrawn: lineHeights.length > 0 && lineHeights.every((h) => h > 0),
        pulseName: pulse ? getComputedStyle(pulse).animationName : '',
        stillRunning: running,
      };
    });
    const done = last.allVisible && last.linesDrawn && last.stillRunning.length === 0;
    if (done || Date.now() > until) return last;
    await page.waitForTimeout(120);
  }
}

async function auditFlow(page, flow) {
  const row = { id: flow.id, sheet: flow.sheet };
  const figure = await flowFigure(page, flow.id);
  if (!figure) {
    problem(flow.id, 'figure not rendered');
    return row;
  }

  // The block starts below the fold; the entrance (and the highlight) runs when
  // it scrolls in. The intersection callback is delivered on the page's own
  // schedule, so the sweep is polled for rather than sampled once.
  await figure.evaluate((fig) => fig.scrollIntoView({ block: 'center' }));
  row.sweep = await waitForSweep(page, figure, 8000);
  if (!row.sweep.pulse) problem(flow.id, 'no travelling highlight (.flow-rail-pulse)');
  if (!row.sweep.sweepRunning) problem(flow.id, `the highlight never ran on entry (${JSON.stringify(row.sweep)})`);
  else {
    // Caught mid-run: the light is part-way down the rail and the cards it has
    // passed have risen.
    await page.waitForTimeout(900);
    row.sweepShot = await shot(page, `${flow.id}-sweep`);
  }

  // (a) one rail, n-1 connector segments, every segment on the rail's axis.
  row.rail = await figure.evaluate((fig) => {
    const rail = fig.querySelector('.flow-rail');
    const pulse = fig.querySelector('.flow-rail-pulse');
    const segments = [...fig.querySelectorAll('.flow-connector')];
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const rr = rect(rail);
    return {
      rails: fig.querySelectorAll('.flow-rail').length,
      pulses: fig.querySelectorAll('.flow-rail-pulse').length,
      steps: fig.querySelectorAll('.flow-step').length,
      connectors: segments.length,
      connectorsInRail: segments.every((seg) => {
        const sr = rect(seg);
        return sr && sr.width > 0 && sr.height > 0;
      }),
      // Every segment straddles the rail's axis: one rail, not two columns.
      axisAligned: !!rr && segments.every((seg) => {
        const line = seg.querySelector('.flow-connector-line');
        const lr = rect(line);
        return lr && Math.abs((lr.left + lr.width / 2) - (rr.left + rr.width / 2)) < 1.5;
      }),
      pulseInsideRail: !!rr && !!pulse && rail.contains(pulse),
    };
  });
  if (row.rail.rails !== 1) problem(flow.id, `expected 1 rail, found ${row.rail.rails}`);
  if (row.rail.connectors !== row.rail.steps - 1) {
    problem(flow.id, `expected ${row.rail.steps - 1} connector segments for ${row.rail.steps} steps, found ${row.rail.connectors}`);
  }
  if (!row.rail.axisAligned) problem(flow.id, 'a connector segment is not on the rail axis');
  if (!row.rail.pulseInsideRail) problem(flow.id, 'the highlight is not on the rail');

  // (b) the DOM order is the spec order.
  row.titles = await figure.$$eval('.flow-step .chain-title', (nodes) => nodes.map((n) => n.textContent.trim()));
  row.orderMatchesSpec = JSON.stringify(row.titles) === JSON.stringify(flow.titles);
  if (!row.orderMatchesSpec) problem(flow.id, `step order differs from the spec: ${JSON.stringify(row.titles)}`);

  // The carousel the reader is built from must stay hidden: the whole order is
  // the argument, so no step may be off-stage.
  row.wholeOrderVisible = await figure.evaluate((fig) => {
    const steps = [...fig.querySelectorAll('.flow-step')];
    return {
      allBoxed: steps.every((s) => { const r = s.getBoundingClientRect(); return r.width > 0 && r.height > 0; }),
      carouselHidden: ![...fig.querySelectorAll('.story-viewport, .story-controls, .story-utility')]
        .some((el) => el.getBoundingClientRect().height > 0),
    };
  });
  if (!row.wholeOrderVisible.allBoxed) problem(flow.id, 'a step has an empty box');
  if (!row.wholeOrderVisible.carouselHidden) problem(flow.id, 'the hidden carousel is taking space');

  // (f) s10-2's lexical side-note and its counter-node, with the sitting's own
  // two labels. The `'amad` note is step 1's own `text`; the counter-node label
  // is quoted in docs/flow-map-decisions.md §6.5.
  if (flow.id === 's10-2') {
    row.aside = await figure.evaluate((fig) => {
      const aside = [...fig.querySelectorAll('.flow-aside')];
      const note = [...fig.querySelectorAll('.flow-note')];
      const counter = [...fig.querySelectorAll('.flow-counter')];
      const css = (el, pseudo) => (el ? getComputedStyle(el, pseudo || null) : null);
      return {
        asides: aside.length,
        notes: note.length,
        counters: counter.length,
        noteText: note.map((n) => n.textContent.trim()),
        counterText: counter.map((n) => n.textContent.trim()),
        noteDashed: aside.length === 1 && css(aside[0]).borderTopStyle === 'dashed',
        counterDashed: counter.length === 1 && css(counter[0], '::before').borderTopStyle === 'dashed',
        // The note hangs on step 1, and the step's own text is not repeated
        // inside the card.
        onStepOne: !!note[0] && !!note[0].closest('.flow-step') && note[0].closest('.flow-step').getAttribute('data-index') === '0',
        inlineText: fig.querySelectorAll('.flow-step:first-child .chain-text').length,
      };
    });
    if (row.aside.asides !== 1 || row.aside.notes !== 1) problem(flow.id, `expected one side-note, found ${row.aside.notes}`);
    if (row.aside.counters !== 1) problem(flow.id, `expected one counter-node, found ${row.aside.counters}`);
    if (row.aside.noteText[0] !== "'amad: kingly stance") problem(flow.id, `side-note label is ${JSON.stringify(row.aside.noteText)}`);
    if (row.aside.counterText[0] !== 'Hebrews 7:25 is the ministry of this age') problem(flow.id, `counter-node label is ${JSON.stringify(row.aside.counterText)}`);
    if (!row.aside.noteDashed) problem(flow.id, 'the side-note is not dashed');
    if (!row.aside.counterDashed) problem(flow.id, 'the counter-node is not dashed');
    if (!row.aside.onStepOne) problem(flow.id, 'the side-note is not attached to step 1');
    if (row.aside.inlineText !== 0) problem(flow.id, 'the side-note is repeated inside its step');
  }

  // The continuation across the Daniel 4:34 split: s4-4's last beats are s4-5's
  // first, and both wear the shared bead.
  if (flow.id === 's4-4' || flow.id === 's4-5') {
    row.shared = await figure.$$eval('.flow-step', (nodes) => nodes
      .filter((n) => n.classList.contains('is-shared'))
      .map((n) => Number(n.getAttribute('data-index'))));
    const want = flow.id === 's4-4' ? [3, 4] : [0, 1];
    if (JSON.stringify(row.shared) !== JSON.stringify(want)) {
      problem(flow.id, `carried-over beats are ${JSON.stringify(row.shared)}, expected ${JSON.stringify(want)}`);
    }
    row.enter = await figure.evaluate((fig) => {
      const stack = fig.querySelector('.flow-stack');
      return {
        declared: stack.getAttribute('data-flow-enter'),
        from: stack.style.getPropertyValue('--flow-from'),
      };
    });
    if (flow.id === 's4-5' && (row.enter.declared !== '1' || !/%$/.test(row.enter.from))) {
      problem(flow.id, `the sweep does not enter on the carried-over node (${JSON.stringify(row.enter)})`);
    }
    if (flow.id === 's4-4' && row.enter.declared !== null) {
      problem(flow.id, 'a full sweep was given an entry point');
    }
  }

  // Settle, then confirm every step is left fully visible and check the replay
  // control re-runs the highlight.
  row.settled = await waitForSettle(page, figure, 9000);
  if (!row.settled.allVisible) problem(flow.id, `steps left at ${JSON.stringify(row.settled.opacities)}`);
  if (!row.settled.linesDrawn) problem(flow.id, `connector segments left at ${JSON.stringify(row.settled.lineHeights)}`);
  if (row.settled.stillRunning.length) problem(flow.id, `still animating after the sweep: ${JSON.stringify(row.settled.stillRunning)}`);

  // The carried-over mark has to survive the sweep, at rest: the highlight
  // animates the bead's own shadow with `fill: both`, and a finished animation
  // outranks a declaration, so a mark declared on that shadow is rubbed out.
  if (flow.id === 's4-4' || flow.id === 's4-5') {
    row.beads = await figure.$$eval('.flow-step', (nodes) => nodes.map((n) => {
      const dot = n.querySelector('.flow-node-dot');
      const ring = getComputedStyle(dot, '::after');
      return {
        shared: n.classList.contains('is-shared'),
        ringWidth: ring.borderTopWidth,
        ringContent: ring.content,
        ringColour: ring.borderTopColor,
        shadow: getComputedStyle(dot).boxShadow,
      };
    }));
    const wrong = row.beads.filter((b) => (b.shared
      ? (b.ringContent === 'none' || parseFloat(b.ringWidth) <= 0)
      : b.ringContent !== 'none'));
    if (wrong.length) problem(flow.id, `the carried-over mark is not readable at rest: ${JSON.stringify(row.beads)}`);
  }
  row.figureShot = `${flow.id}-rail.png`;
  await page.mouse.move(4, 4);
  await figure.screenshot({ path: path.join(OUT, row.figureShot) }).catch(() => {});

  const replay = await page.$(`#sheet-article figure[data-diagram="${flow.id}"] + .chain-replay`);
  if (!replay) {
    problem(flow.id, 'no Replay animation control');
  } else {
    await replay.click();
    row.replay = await waitForSweep(page, figure, 4000);
    if (!row.replay.sweepRunning) problem(flow.id, `the Replay control did not re-run the highlight (${JSON.stringify(row.replay)})`);
    row.settledAgain = await waitForSettle(page, figure, 9000);
  }

  // (d) a step opens the reader on its own scene; (e) Escape closes it and hands
  // focus back to the step it came from.
  const index = Math.min(2, flow.titles.length - 1);
  row.scene = { index, expectedTitle: flow.titles[index] };
  const step = (await figure.$$('.flow-step'))[index];
  await step.click();
  await page.waitForTimeout(900);
  row.scene.reader = await page.evaluate(() => {
    const r = document.querySelector('body > .story-read');
    if (!r) return null;
    const active = r.querySelector('.story-read-deck .story-card.is-active');
    const text = (sel) => {
      const el = active && active.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };
    return {
      hidden: r.hidden,
      isOpen: r.classList.contains('is-open'),
      title: text('.story-title'),
      cite: text('.chain-cite'),
      count: (r.querySelector('.story-read-count') || {}).textContent,
      deckCards: r.querySelectorAll('.story-read-deck .story-card').length,
      focusInReader: !!(r.contains(document.activeElement)),
      overlayCount: document.querySelectorAll('body > .story-read').length,
    };
  });
  if (!row.scene.reader) {
    problem(flow.id, 'clicking a step did not open the reader');
  } else {
    if (row.scene.reader.hidden || !row.scene.reader.isOpen) problem(flow.id, 'the reader did not open');
    if (row.scene.reader.title !== row.scene.expectedTitle) {
      problem(flow.id, `the reader shows ${JSON.stringify(row.scene.reader.title)}, expected ${JSON.stringify(row.scene.expectedTitle)}`);
    }
    if (!row.scene.reader.focusInReader) problem(flow.id, 'focus did not move into the reader');
    if (row.scene.reader.overlayCount !== 1) problem(flow.id, `expected one reader overlay, found ${row.scene.reader.overlayCount}`);
  }
  row.scene.shot = await shot(page, `${flow.id}-reader`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  row.scene.afterEscape = await page.evaluate(() => {
    const r = document.querySelector('body > .story-read');
    const a = document.activeElement;
    const step = a && a.closest ? a.closest('.flow-step') : null;
    return {
      hidden: r ? r.hidden : true,
      isOpen: r ? r.classList.contains('is-open') : false,
      focusTag: a ? a.tagName : 'none',
      focusClass: a ? String(a.className || '') : '',
      focusStep: step ? step.getAttribute('data-index') : null,
      focusIsMarker: !!(a && a.classList && a.classList.contains('flow-node')),
    };
  });
  if (!row.scene.afterEscape.hidden) problem(flow.id, 'Escape did not close the reader');
  if (row.scene.afterEscape.focusStep !== String(index)) {
    problem(flow.id, `Escape returned focus to ${JSON.stringify(row.scene.afterEscape)}, expected step ${index}`);
  }

  // On s10-2 the annotated step's own scene has to carry the lexical note too:
  // the note hangs beside the step and rides into the reader with it.
  if (flow.id === 's10-2') {
    const first = (await figure.$$('.flow-step'))[0];
    await first.click();
    await page.waitForTimeout(900);
    row.scene.noteScene = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      const active = r && r.querySelector('.story-read-deck .story-card.is-active');
      const text = (sel) => {
        const el = active && active.querySelector(sel);
        return el ? el.textContent.trim() : '';
      };
      return { title: text('.story-title'), note: text('.story-text') };
    });
    if (row.scene.noteScene.note !== "'amad: kingly stance") {
      problem(flow.id, `the annotated step's scene does not carry its note (${JSON.stringify(row.scene.noteScene)})`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1400);
  }
  return row;
}

// The two light themes repaint every role in the block. The rail and the dashed
// side-note carry copy-adjacent ink, so they must be drawn in the theme's own
// gold rather than left at their dark-theme colour.
async function auditThemes(page, flow) {
  const row = { id: flow.id, modes: {} };
  const figure = await flowFigure(page, flow.id);
  if (!figure) {
    problem(flow.id, 'figure not rendered for the theme check');
    return row;
  }
  await figure.evaluate((fig) => fig.scrollIntoView({ block: 'center' }));
  await waitForSettle(page, figure, 9000);
  // The audit above ends with Escape handing focus back to a step's marker; a
  // proof shot should show the block, not that focus ring.
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  for (const mode of ['paper-mode', 'white-mode']) {
    await page.evaluate((cls) => {
      document.body.classList.remove('paper-mode', 'white-mode');
      document.body.classList.add(cls);
    }, mode);
    await page.waitForTimeout(400);
    row.modes[mode] = await figure.evaluate((fig) => {
      const rail = fig.querySelector('.flow-rail');
      const dot = fig.querySelector('.flow-node-dot');
      const aside = fig.querySelector('.flow-aside');
      const note = fig.querySelector('.flow-note');
      const counter = fig.querySelector('.flow-counter');
      const painted = (value) => !!value && value !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(value);
      // Both labels are paragraphs, so they render in the same ink the lesson
      // sets for every paragraph. What must not happen is a label that is
      // invisible or washed out against the block's own ground.
      const probe = document.createElement('p');
      probe.textContent = 'x';
      fig.appendChild(probe);
      const readFg = getComputedStyle(probe).color;
      probe.remove();
      return {
        railImage: getComputedStyle(rail).backgroundImage.slice(0, 60),
        railPainted: painted(getComputedStyle(rail).backgroundImage),
        bead: getComputedStyle(dot).backgroundColor,
        beadPainted: painted(getComputedStyle(dot).backgroundColor),
        asideBorder: getComputedStyle(aside).borderTopStyle,
        noteColour: getComputedStyle(note).color,
        counterColour: getComputedStyle(counter).color,
        readFg,
        counterRing: getComputedStyle(counter, '::before').borderTopStyle,
      };
    });
    const state = row.modes[mode];
    if (!state.railPainted) problem(flow.id, `${mode}: the rail is not painted`);
    if (!state.beadPainted) problem(flow.id, `${mode}: the marker is not painted`);
    if (state.asideBorder !== 'dashed') problem(flow.id, `${mode}: the side-note lost its dashed frame`);
    if (state.counterRing !== 'dashed') problem(flow.id, `${mode}: the counter-node lost its dashed ring`);
    if (state.noteColour !== state.readFg || state.counterColour !== state.readFg) {
      problem(flow.id, `${mode}: a label is not in the lesson's reading ink (${state.noteColour} / ${state.counterColour} vs ${state.readFg})`);
    }
    await page.mouse.move(4, 4);
    await figure.screenshot({ path: path.join(OUT, `${flow.id}-${mode}.png`) }).catch(() => {});
  }
  await page.evaluate(() => document.body.classList.remove('paper-mode', 'white-mode'));
  return row;
}

async function auditReduced(page, flow) {  const row = { id: flow.id, sheet: flow.sheet };
  const figure = await flowFigure(page, flow.id);
  if (!figure) {
    problem(flow.id, 'figure not rendered under reduced motion');
    return row;
  }
  await figure.evaluate((fig) => fig.scrollIntoView({ block: 'center' }));
  row.entered = await waitForEntered(page, figure, 8000);
  await page.waitForTimeout(500);
  row.state = await figure.evaluate((fig) => {
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    const parts = {
      steps: [...fig.querySelectorAll('.flow-step')],
      connectors: [...fig.querySelectorAll('.flow-connector')],
      lines: [...fig.querySelectorAll('.flow-connector-line')],
      dots: [...fig.querySelectorAll('.flow-node-dot')],
      aside: [...fig.querySelectorAll('.flow-aside')],
    };
    const running = (fig.getAnimations ? fig.getAnimations({ subtree: true }) : [])
      .filter((a) => a.playState === 'running')
      .map((a) => (a.animationName || a.transitionProperty || '?'));
    const opacity = (el) => Number(getComputedStyle(el).opacity).toFixed(2);
    const names = (el) => getComputedStyle(el).animationName;
    return {
      steps: parts.steps.length,
      connectors: parts.connectors.length,
      stepBoxes: parts.steps.map(box),
      connectorBoxes: parts.connectors.map(box),
      lineBoxes: parts.lines.map(box),
      dotBoxes: parts.dots.map(box),
      asideBoxes: parts.aside.map(box),
      stepOpacity: parts.steps.map(opacity),
      lineOpacity: parts.lines.map(opacity),
      lineTransform: parts.lines.map((l) => getComputedStyle(l).transform),
      stepAnimation: parts.steps.map(names),
      lineAnimation: parts.lines.map(names),
      dotAnimation: parts.dots.map(names),
      running,
      pulse: !!fig.querySelector('.flow-rail-pulse'),
      pulseAnimation: (() => {
        const p = fig.querySelector('.flow-rail-pulse');
        return p ? getComputedStyle(p).animationName : '';
      })(),
    };
  });
  const emptyBoxes = (boxes) => boxes.filter((b) => b.w === 0 || b.h === 0).length;
  if (emptyBoxes(row.state.stepBoxes)) problem(flow.id, `reduced motion: ${emptyBoxes(row.state.stepBoxes)} step(s) with an empty box`);
  if (emptyBoxes(row.state.connectorBoxes)) problem(flow.id, `reduced motion: ${emptyBoxes(row.state.connectorBoxes)} connector(s) with an empty box`);
  if (emptyBoxes(row.state.lineBoxes)) problem(flow.id, `reduced motion: ${emptyBoxes(row.state.lineBoxes)} connector segment(s) with a zero-height box`);
  if (emptyBoxes(row.state.dotBoxes)) problem(flow.id, `reduced motion: ${emptyBoxes(row.state.dotBoxes)} marker(s) with an empty box`);
  if (emptyBoxes(row.state.asideBoxes) && row.state.asideBoxes.length) problem(flow.id, 'reduced motion: the side-note has an empty box');
  if (!row.state.stepOpacity.every((o) => Number(o) > 0.99)) problem(flow.id, `reduced motion: steps at ${JSON.stringify(row.state.stepOpacity)}`);
  if (!row.state.lineOpacity.every((o) => Number(o) > 0.99)) problem(flow.id, `reduced motion: connectors at ${JSON.stringify(row.state.lineOpacity)}`);
  if (!row.state.lineTransform.every((t) => t === 'none')) problem(flow.id, `reduced motion: a connector is still scaled (${JSON.stringify(row.state.lineTransform)})`);
  if (!row.state.stepAnimation.every((n) => n === 'none')) problem(flow.id, `reduced motion: a step still animates (${JSON.stringify(row.state.stepAnimation)})`);
  if (!row.state.lineAnimation.every((n) => n === 'none')) problem(flow.id, `reduced motion: a connector still animates (${JSON.stringify(row.state.lineAnimation)})`);
  if (!row.state.dotAnimation.every((n) => n === 'none')) problem(flow.id, `reduced motion: a marker still animates (${JSON.stringify(row.state.dotAnimation)})`);
  if (row.state.running.length) problem(flow.id, `reduced motion: animations still running (${JSON.stringify(row.state.running)})`);
  if (!row.state.pulse) problem(flow.id, 'reduced motion: the highlight is missing from the markup');
  if (row.state.pulseAnimation !== 'none') problem(flow.id, `reduced motion: the highlight still animates (${row.state.pulseAnimation})`);
  await page.mouse.move(4, 4);
  await figure.screenshot({ path: path.join(OUT, `${flow.id}-reduced.png`) }).catch(() => {});
  return row;
}

async function auditMobile(page, flow) {
  const row = { id: flow.id };
  const figure = await flowFigure(page, flow.id);
  if (!figure) {
    problem(flow.id, 'figure not rendered at 390x844');
    return row;
  }
  await figure.evaluate((fig) => fig.scrollIntoView({ block: 'center' }));
  await waitForSettle(page, figure, 6000);
  row.state = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      viewport: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });
  // What the page would scroll to without this block: the overflow that matters
  // is the overflow the block adds, not one the sitting already had.
  row.baseline = await page.evaluate((id) => {
    const fig = document.querySelector(`#sheet-article figure[data-diagram="${id}"]`);
    const replay = fig.nextElementSibling;
    fig.style.display = 'none';
    if (replay && replay.classList.contains('chain-replay')) replay.style.display = 'none';
    const doc = document.documentElement;
    const width = { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    fig.style.display = '';
    if (replay && replay.classList.contains('chain-replay')) replay.style.display = '';
    return width;
  }, flow.id);
  row.figure = await figure.evaluate((fig) => {
    const parts = [...fig.querySelectorAll('.flow-stack, .flow-step, .flow-rail, .flow-connector, .flow-aside')];
    const worst = parts.reduce((acc, el) => {
      const r = el.getBoundingClientRect();
      return Math.max(acc, Math.round(r.right));
    }, 0);
    const figRect = fig.getBoundingClientRect();
    return {
      figureRight: Math.round(figRect.right),
      figureLeft: Math.round(figRect.left),
      widestPartRight: worst,
      scrollWidth: fig.scrollWidth,
      clientWidth: fig.clientWidth,
    };
  });
  const addedPageOverflow = row.state.scrollWidth > row.baseline.scrollWidth;
  const overflowsFigure = row.figure.scrollWidth > row.figure.clientWidth + 1;
  const spillsViewport = row.figure.widestPartRight > row.state.viewport + 1;
  if (addedPageOverflow) {
    problem(flow.id, `390x844: the block widens the page (${row.baseline.scrollWidth} -> ${row.state.scrollWidth})`);
  }
  if (overflowsFigure) problem(flow.id, `390x844: the block scrolls horizontally (${row.figure.scrollWidth} > ${row.figure.clientWidth})`);
  if (spillsViewport) problem(flow.id, `390x844: a part of the block ends at ${row.figure.widestPartRight} > ${row.state.viewport}`);
  row.shot = await shot(page, `${flow.id}-390x844`);
  return row;
}
