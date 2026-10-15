import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const BASE = String(args.base || 'http://127.0.0.1:8100').replace(/\/+$/, '');
const OUT = args.out ? resolve(String(args.out)) : '';
const SHOTS = args.shots ? resolve(String(args.shots)) : '';
const ONLY = String(args.only || '');
const REPEAT = Math.max(1, Number(args.repeat || 2));
const VIEW = { width: 1100, height: 700 };
const LAUNCH = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
const DRAG_PX = 120;
const DRAG_RATE_PER_PX = 0.0085;

const r3 = (v) => Math.round(v * 1000) / 1000;
const sig = (v) => Number(v.toPrecision(5));

function median(list) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function openShelf(browser, seedRandom) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      const loc = msg.location() || {};
      logs.push({ type, text: msg.text().slice(0, 240), url: String(loc.url || '').slice(0, 160) });
    }
  });
  page.on('pageerror', (err) => logs.push({ type: 'pageerror', text: String(err && err.message ? err.message : err).slice(0, 240), url: '' }));
  if (seedRandom) {
    await page.addInitScript(() => {
      let s = 20260101;
      Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    });
  }
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 120000 });
  await page.waitForSelector('#shelf-stage.is-ready', { timeout: 180000 });
  const hasShelf = await page.evaluate(() => !!window.__shelf);
  if (!hasShelf) throw new Error('window.__shelf missing: WebGL did not start');
  const bootMs = r3(await page.evaluate(() => performance.now()));
  await page.evaluate(() => {
    const S = window.__shelf;
    S.renderer.info.autoReset = false;
    window.__cost = (n) => {
      const info = S.renderer.info;
      info.reset();
      for (let k = 0; k < n; k++) S.advance(1 / 60);
      return { calls: Math.round(info.render.calls / n), triangles: Math.round(info.render.triangles / n) };
    };
  });
  return { context, page, logs, bootMs };
}

async function bootSession(browser) {
  const s = await openShelf(browser, false);
  const { page } = s;
  const programsBoot = await page.evaluate(() => window.__shelf.renderer.info.programs.length);
  const pullBlockMs = await page.evaluate(() => {
    const t0 = performance.now();
    window.__shelf.api.pull(7);
    return performance.now() - t0;
  });
  const firstFrameAfterPullMs = await page.evaluate(() => {
    const t0 = performance.now();
    window.__shelf.advance(1 / 60);
    return performance.now() - t0;
  });
  await page.evaluate(() => window.__shelf.advance(2));
  const programsAfterPull2s = await page.evaluate(() => window.__shelf.renderer.info.programs.length);
  await s.context.close();
  return {
    bootMs: s.bootMs,
    programsBoot,
    pullBlockMs: r3(pullBlockMs),
    firstFrameAfterPullMs: r3(firstFrameAfterPullMs),
    programsAfterPull2s,
    logs: s.logs
  };
}

async function frameSession(browser) {
  const s = await openShelf(browser, false);
  const { page } = s;
  await page.evaluate(() => window.__shelf.advance(5));
  const idle = await page.evaluate(() => window.__cost(1));
  const idleAvg12 = await page.evaluate(() => window.__cost(12));
  await page.evaluate(() => { window.__shelf.api.pull(3); window.__shelf.advance(3); });
  const presenting = await page.evaluate(() => window.__cost(1));
  const presentingAvg12 = await page.evaluate(() => window.__cost(12));
  await page.evaluate(() => { window.__shelf.api.pull(6); window.__shelf.advance(0.2); });
  const midPull = await page.evaluate(() => window.__cost(1));
  const midPullAvg6 = await page.evaluate(() => window.__cost(6));
  await s.context.close();
  return { frames: { idle, idleAvg12, presenting, presentingAvg12, midPull, midPullAvg6 }, logs: s.logs };
}

function scan(series, endFlags, floor) {
  let max = 0, count = 0, onEnd = 0, endSnap = 0, kink = 0, kinkAt = null;
  const samples = [];
  series.forEach((s, b) => {
    s.forEach((d, j) => {
      if (d > max) max = d;
      if (endFlags[b][j]) {
        endSnap = Math.max(endSnap, d);
      } else if (j > 0) {
        const k = Math.abs(d - s[j - 1]);
        if (k > kink) kink = k, kinkAt = { book: b, step: j, before: sig(s[j - 1]), after: sig(d) };
      }
      if (j >= 20) {
        const med = median(s.slice(j - 20, j));
        if (med > floor && d > 6 * med) {
          count++;
          if (endFlags[b][j]) onEnd++;
          if (samples.length < 4) samples.push({ book: b, step: j, value: sig(d), medianBefore: sig(med), atSeqEnd: endFlags[b][j] });
        }
      }
    });
  });
  return { max, count, onEnd, endSnap, kink, kinkAt, samples };
}

function analysePhase(frames) {
  const nb = frames[0].length;
  const posS = [], angS = [], endS = [];
  for (let b = 0; b < nb; b++) {
    const ps = [], as = [], es = [];
    for (let k = 1; k < frames.length; k++) {
      const A = frames[k - 1][b], B = frames[k][b];
      ps.push(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]));
      as.push(2 * Math.acos(Math.min(1, Math.abs(A[3] * B[3] + A[4] * B[4] + A[5] * B[5] + A[6] * B[6]))));
      es.push(A[7] === 'seq' && B[7] !== 'seq');
    }
    posS.push(ps); angS.push(as); endS.push(es);
  }
  const pos = scan(posS, endS, 1e-3);
  const ang = scan(angS, endS, 1e-3);
  return {
    maxPosStep: sig(pos.max),
    maxAngStep: sig(ang.max),
    posPops: pos.count,
    angPops: ang.count,
    popsAtSeqEnd: pos.onEnd + ang.onEnd,
    seqEndSnapPos: sig(pos.endSnap),
    seqEndSnapAng: sig(ang.endSnap),
    posKink: sig(pos.kink),
    posKinkAt: pos.kinkAt,
    angKink: sig(ang.kink),
    angKinkAt: ang.kinkAt,
    popSamples: [...pos.samples.map((x) => ({ kind: 'pos', ...x })), ...ang.samples.map((x) => ({ kind: 'ang', ...x }))].slice(0, 6)
  };
}

async function motionSession(browser) {
  const s = await openShelf(browser, false);
  const { page } = s;
  await page.evaluate(() => {
    const S = window.__shelf;
    S.frozen = true;
    S.renderer.render = () => {};
    window.__snap = () => S.books.map((b) => {
      const p = b.root.position, q = b.root.quaternion;
      return [p.x, p.y, p.z, q.x, q.y, q.z, q.w, b.mode];
    });
    S.advance(5);
  });
  const phases = await page.evaluate(() => {
    const S = window.__shelf;
    const rec = (frames, secs) => {
      for (let k = 0; k < Math.round(secs * 60); k++) { S.advance(1 / 60); frames.push(window.__snap()); }
      return frames;
    };
    const shelf0 = window.__snap();
    let f = [window.__snap()];
    S.api.pull(2); f.push(window.__snap());
    const pull2 = rec(f, 3);
    f = [window.__snap()];
    S.api.put(); f.push(window.__snap());
    const put = rec(f, 3);
    f = [window.__snap()];
    S.api.pull(2); f.push(window.__snap());
    rec(f, 2);
    S.api.step(1); f.push(window.__snap());
    const pull2Step1 = rec(f, 3);
    return { shelf0, pull2, put, pull2Step1 };
  });

  const last = phases.put[phases.put.length - 1];
  let finalPos = 0, finalAng = 0, worst = -1;
  last.forEach((b, i) => {
    const a = phases.shelf0[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const q = 2 * Math.acos(Math.min(1, Math.abs(b[3] * a[3] + b[4] * a[4] + b[5] * a[5] + b[6] * a[6])));
    if (d > finalPos) { finalPos = d; worst = i; }
    finalAng = Math.max(finalAng, q);
  });
  const finalShelfDelta = { pos: sig(finalPos), ang: sig(finalAng), worstBook: worst, allOnShelf: last.every((b) => b[7] === 'shelf') };

  const idx = await page.evaluate(() => window.__shelf.books.findIndex((b) => b.mode === 'present'));
  await page.evaluate((i) => {
    const S = window.__shelf;
    window.__dragIdx = i;
    window.__relQ = () => S.camera.quaternion.clone().invert().multiply(S.books[window.__dragIdx].root.quaternion.clone());
    window.__dragRel0 = window.__relQ();
    window.__dragAngle = () => {
      const r = window.__relQ(), r0 = window.__dragRel0;
      return 2 * Math.acos(Math.min(1, Math.abs(r.x * r0.x + r.y * r0.y + r.z * r0.z + r.w * r0.w)));
    };
    window.__dragStep = (sec) => { S.advance(sec); return window.__dragAngle(); };
  }, idx);
  const pt = await page.evaluate(() => {
    const cv = document.getElementById('gl');
    const r = cv.getBoundingClientRect();
    for (const fy of [0.5, 0.45, 0.55, 0.4, 0.6]) for (const fx of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (document.elementFromPoint(x, y) === cv) return { x, y };
    }
    return null;
  });
  let drag = { started: false };
  if (pt && idx >= 0) {
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.move(pt.x + DRAG_PX, pt.y, { steps: 12 });
    const a01 = await page.evaluate(() => window.__dragStep(0.1));
    const aFinal = await page.evaluate(() => window.__dragStep(3));
    await page.mouse.up();
    drag = {
      started: true,
      bookIndex: idx,
      angleAt0_1s: sig(a01),
      finalAngle: sig(aFinal),
      expectedFinal: sig(DRAG_PX * DRAG_RATE_PER_PX),
      progress: sig(aFinal > 0 ? a01 / aFinal : 0),
      pass: a01 >= 0.85 * aFinal
    };
  }

  await s.context.close();
  return {
    continuity: {
      pull2_3s: analysePhase(phases.pull2),
      put_3s: analysePhase(phases.put),
      pull2_2s_step1_3s: analysePhase(phases.pull2Step1)
    },
    finalShelfDelta,
    drag,
    logs: s.logs
  };
}

async function shotSession(browser, prefix) {
  const s = await openShelf(browser, true);
  const { page } = s;
  await page.evaluate(() => { window.__shelf.frozen = true; window.__shelf.advance(5); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: prefix + '-idle.png' });
  await page.evaluate(() => { window.__shelf.api.pull(3); window.__shelf.advance(3); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: prefix + '-present3.png' });
  await s.context.close();
  return { logs: s.logs };
}

function dedupe(logs) {
  const seen = new Map();
  for (const e of logs) {
    const key = e.type + '|' + e.text + '|' + e.url;
    if (seen.has(key)) seen.get(key).count++;
    else seen.set(key, { ...e, count: 1 });
  }
  return [...seen.values()];
}

const browser = await chromium.launch(LAUNCH);
const allLogs = [];
try {
  if (ONLY === 'shots') {
    const sh = await shotSession(browser, SHOTS);
    const json = JSON.stringify({ shots: [SHOTS + '-idle.png', SHOTS + '-present3.png'], consoleErrors: dedupe(sh.logs.filter((e) => e.type === 'error' || e.type === 'pageerror')) }, null, 2);
    console.log(json);
  } else {
    const boots = [];
    for (let r = 0; r < REPEAT; r++) {
      const b = await bootSession(browser);
      boots.push(b);
      allLogs.push(...b.logs);
    }
    const last = boots[boots.length - 1];
    const frames = await frameSession(browser);
    allLogs.push(...frames.logs);
    const motion = await motionSession(browser);
    allLogs.push(...motion.logs);
    if (SHOTS) {
      const sh = await shotSession(browser, SHOTS);
      allLogs.push(...sh.logs);
    }
    const result = {
      base: BASE,
      generated: new Date().toISOString(),
      viewport: VIEW,
      bootMs: boots.map((b) => b.bootMs),
      pullBlockMs: boots.map((b) => b.pullBlockMs),
      firstFrameAfterPullMs: boots.map((b) => b.firstFrameAfterPullMs),
      programs: { boot: last.programsBoot, afterPull2s: last.programsAfterPull2s },
      frames: frames.frames,
      continuity: motion.continuity,
      finalShelfDelta: motion.finalShelfDelta,
      drag: motion.drag,
      consoleErrors: dedupe(allLogs.filter((e) => e.type === 'error' || e.type === 'pageerror')),
      consoleWarnings: dedupe(allLogs.filter((e) => e.type === 'warning'))
    };
    const json = JSON.stringify(result, null, 2);
    if (OUT) {
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, json + '\n');
    }
    console.log(json);
  }
} finally {
  await browser.close();
}
