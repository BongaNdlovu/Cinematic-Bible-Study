import { chromium } from 'playwright';
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const BASE = String(args.base || 'https://cinematic-bible-study-daniel.pages.dev').replace(/\/+$/, '');
const OUT = args.out || '';
const ONLY = args.only ? String(args.only).split(',').map(Number) : null;
const LAUNCH = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };

const PAGES = [
  ['home', '/'],
  ['study', '/study.html?sheet=1'],
  ['account', '/account.html'],
  ['reviews', '/reviews.html'],
  ['map', '/map.html'],
  ['gallery', '/gallery.html']
];

const SIGNED_IN = `(function(){function wrap(n,f){let v;Object.defineProperty(window,n,{configurable:true,get(){return v},set(x){v=x;try{f(x)}catch(e){}}});}
wrap("ScrollTerms",t=>{t.hasAgreed=()=>true;});
wrap("ScrollAuth",a=>{a.getUser=()=>({id:"perf",email:"perf@example.com"});a.displayName=()=>"Perf";});})();`;

const OBSERVE = `(function(){window.__perf={lcp:0,cls:0,long:[]};
try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perf.lcp=e.startTime}).observe({type:"largest-contentful-paint",buffered:true});}catch(e){}
try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__perf.cls+=e.value}).observe({type:"layout-shift",buffered:true});}catch(e){}
try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perf.long.push([e.startTime,e.duration])}).observe({type:"longtask",buffered:true});}catch(e){}})();`;

const results = {};
const ms = (n) => (n == null ? '—' : Math.round(n) + ' ms');
const kb = (n) => (n == null ? '—' : (n / 1024).toFixed(0) + ' KB');
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

function kindOf(url, type) {
  if (/\.(glb|gltf)(\?|$)/i.test(url)) return 'model';
  if (/tile|arcgisonline|openstreetmap/i.test(url)) return 'tile';
  if (type === 'image') return 'image';
  if (type === 'script') return 'script';
  if (type === 'stylesheet') return 'css';
  if (type === 'font') return 'font';
  if (type === 'document') return 'html';
  if (type === 'media') return 'media';
  return 'other';
}

async function openPage(browser, path, opts = {}) {
  const context = opts.context || await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const page = await context.newPage();
  const reqs = [];
  page.on('requestfinished', async (req) => {
    try {
      const s = await req.sizes();
      reqs.push({ url: req.url(), kind: kindOf(req.url(), req.resourceType()), bytes: s.responseBodySize + s.responseHeadersSize });
    } catch (e) {}
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.addInitScript(SIGNED_IN);
  await page.addInitScript(OBSERVE);
  if (opts.throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const t0 = Date.now();
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 240000 });
  const loadWall = Date.now() - t0;
  await page.waitForTimeout(opts.settle || 5000);
  return { context, page, reqs, errors, loadWall };
}

async function vitals(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime;
    const p = window.__perf || { long: [] };
    const tbt = p.long.filter(([s]) => s >= (fcp || 0)).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
    return {
      ttfb: nav.responseStart, fcp, lcp: p.lcp, cls: p.cls,
      dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd,
      longTasks: p.long.length, longest: p.long.reduce((m, [, d]) => Math.max(m, d), 0), tbt,
      dom: document.getElementsByTagName('*').length,
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null
    };
  });
}

function weight(reqs) {
  const by = {};
  let total = 0;
  for (const r of reqs) { by[r.kind] = (by[r.kind] || 0) + r.bytes; total += r.bytes; }
  return { total, count: reqs.length, by };
}

const tests = {
  async 1(browser) {
    const rows = {};
    for (const [name, path] of PAGES) {
      const { context, page, errors, loadWall } = await openPage(browser, path);
      rows[name] = { ...(await vitals(page)), loadWall, errors: errors.length };
      await context.close();
    }
    return rows;
  },
  async 2(browser) {
    const rows = {};
    for (const [name, path] of PAGES) {
      const { context, reqs } = await openPage(browser, path, { settle: name === 'gallery' || name === 'home' ? 15000 : 6000 });
      const w = weight(reqs);
      const top = [...reqs].sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((r) => [r.url.replace(BASE, ''), kb(r.bytes)]);
      rows[name] = { total: kb(w.total), requests: w.count, by: Object.fromEntries(Object.entries(w.by).map(([k, v]) => [k, kb(v)])), heaviest: top };
      await context.close();
    }
    return rows;
  },
  async 3(browser) {
    const rows = {};
    for (const [name, path] of [['home', '/'], ['study', '/study.html?sheet=1'], ['account', '/account.html']]) {
      const { context, page, loadWall } = await openPage(browser, path, { throttle: true, viewport: { width: 390, height: 844 }, settle: 8000 });
      rows[name] = { ...(await vitals(page)), loadWall };
      await context.close();
    }
    return rows;
  },
  async 4(browser) {
    const rows = {};
    for (const [name, path] of PAGES) {
      const { context, page } = await openPage(browser, path, { settle: 8000 });
      const v = await vitals(page);
      rows[name] = { longTasks: v.longTasks, longest: ms(v.longest), tbt: ms(v.tbt) };
      await context.close();
    }
    return rows;
  },
  async 5(browser) {
    const rows = {};
    for (const [name, path] of [['home', '/'], ['study', '/study.html?sheet=1'], ['account', '/account.html']]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const first = await openPage(browser, path, { context, settle: 6000 });
      const firstW = weight(first.reqs).total;
      await first.page.close();
      const second = await openPage(browser, path, { context, settle: 6000 });
      const secondNet = second.reqs.filter((r) => r.bytes > 0);
      const secondW = weight(secondNet).total;
      rows[name] = { firstVisit: kb(firstW), repeatVisit: kb(secondW), refetched: secondNet.length, saved: firstW ? Math.round((1 - secondW / firstW) * 100) + '%' : '—' };
      await context.close();
    }
    return rows;
  },
  async 6() {
    const staticRun = await burst(['/assets/site/hall-bg.jpg', '/css/cinema.css', '/vendor/supabase/supabase.js', '/assets/site/era-head.webp', '/assets/maps/chronicle-map-605.jpg', '/vendor/leaflet/leaflet.js'], 300, 30);
    const pageRun = await burst(['/', '/study.html', '/account.html', '/reviews.html'], 80, 10);
    return { staticFiles: staticRun, pages: pageRun };
  }
};

async function burst(urls, total, conc) {
  const lat = [], status = {};
  let i = 0;
  const t0 = Date.now();
  async function worker() {
    while (i < total) {
      const url = BASE + urls[i++ % urls.length];
      const s = Date.now();
      try {
        const r = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
        await r.arrayBuffer();
        status[r.status] = (status[r.status] || 0) + 1;
      } catch (e) { status.error = (status.error || 0) + 1; }
      lat.push(Date.now() - s);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  const wall = Date.now() - t0;
  return { requests: total, concurrency: conc, wall: ms(wall), throughput: (total / (wall / 1000)).toFixed(1) + ' req/s', p50: ms(pct(lat, 50)), p95: ms(pct(lat, 95)), p99: ms(pct(lat, 99)), max: ms(Math.max(...lat)), status };
}

Object.assign(tests, {
  async 7(browser) {
    const { context, page, reqs, loadWall } = await openPage(browser, '/gallery.html', { settle: 500 });
    const t0 = Date.now();
    await page.waitForFunction(() => { const o = document.getElementById('loading-overlay'); return !!o && o.classList.contains('hidden'); }, null, { timeout: 240000 }).catch(() => {});
    const ready = loadWall + (Date.now() - t0);
    await page.waitForTimeout(8000);
    const models = reqs.filter((r) => r.kind === 'model');
    const images = reqs.filter((r) => r.kind === 'image');
    const v = await vitals(page);
    const out = { timeToUsable: ms(ready), models: models.length, modelBytes: kb(models.reduce((a, r) => a + r.bytes, 0)), imageBytes: kb(images.reduce((a, r) => a + r.bytes, 0)), heaviestModels: models.sort((a, b) => b.bytes - a.bytes).slice(0, 4).map((r) => [r.url.replace(BASE, ''), kb(r.bytes)]), heapMB: v.heapMB };
    await context.close();
    return out;
  },
  async 8(browser) {
    const { context, page } = await openPage(browser, '/', { settle: 1000 });
    await page.waitForSelector('#shelf-stage.is-ready', { state: 'attached', timeout: 240000 });
    await page.waitForTimeout(4000);
    const snap = () => page.evaluate(() => {
      const r = window.__shelf && window.__shelf.renderer;
      return { heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, textures: r ? r.info.memory.textures : null, geometries: r ? r.info.memory.geometries : null, programs: r ? r.info.programs.length : null };
    });
    const before = await snap();
    const frame = [];
    for (let round = 0; round < 2; round++) {
      for (let v = 0; v < 11; v++) {
        const t = await page.evaluate((i) => { const s = performance.now(); window.__shelf.api.pull(i); window.__shelf.advance(2.5); return performance.now() - s; }, v);
        frame.push(t / 150);
      }
    }
    await page.evaluate(() => { if (window.gc) window.gc(); });
    await page.waitForTimeout(2000);
    const after = await snap();
    await context.close();
    return { before, afterTwoLapsOfElevenBooks: after, heapGrowthMB: before.heapMB != null ? +(after.heapMB - before.heapMB).toFixed(1) : null, cpuMsPerFrameAvg: (frame.reduce((a, b) => a + b, 0) / frame.length).toFixed(2), cpuMsPerFrameWorst: Math.max(...frame).toFixed(2) };
  },
  async 9(browser) {
    const { context, page } = await openPage(browser, '/study.html?sheet=7', { settle: 4000 });
    const begin = page.getByRole('button', { name: 'Begin this sitting' });
    if (await begin.count()) await begin.first().click();
    const v = await vitals(page);
    const tabs = ['map', 'context', 'insights', 'scripture', 'timeline'];
    const lat = [];
    for (let k = 0; k < 3; k++) {
      for (const t of tabs) {
        const d = await page.evaluate((id) => new Promise((res) => {
          const btn = document.querySelector('.instrument-tabs button[data-instrument="' + id + '"]');
          if (!btn) return res(null);
          const s = performance.now();
          btn.click();
          requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - s)));
        }), t);
        if (d != null) lat.push(d);
        await page.waitForTimeout(450);
      }
    }
    await context.close();
    return { dom: v.dom, heapMB: v.heapMB, tabSwitches: lat.length, tabP50: ms(pct(lat, 50)), tabP95: ms(pct(lat, 95)), tabWorst: ms(Math.max(...lat)) };
  },
  async 10(browser) {
    const { context, page, reqs } = await openPage(browser, '/map.html', { settle: 8000 });
    const tiles = reqs.filter((r) => r.kind === 'tile');
    const lat = [];
    const medals = await page.$$('.cmap-medal');
    for (const m of medals.slice(0, 4)) {
      const s = Date.now();
      await m.click({ force: true }).catch(() => {});
      await page.waitForFunction(() => document.querySelector('.cmap-dossier.open'), null, { timeout: 5000 }).catch(() => {});
      lat.push(Date.now() - s);
      await page.waitForTimeout(400);
    }
    const zoomStart = reqs.length;
    for (let k = 0; k < 3; k++) { await page.click('.leaflet-control-zoom-in').catch(() => {}); await page.waitForTimeout(900); }
    const zoomTiles = reqs.slice(zoomStart).filter((r) => r.kind === 'tile');
    const v = await vitals(page);
    await context.close();
    return { tilesOnLoad: tiles.length, tileBytesOnLoad: kb(tiles.reduce((a, r) => a + r.bytes, 0)), tilesAfter3Zooms: zoomTiles.length, tileBytesAfterZooms: kb(zoomTiles.reduce((a, r) => a + r.bytes, 0)), markerToPanelP50: ms(pct(lat, 50)), markerToPanelWorst: ms(Math.max(...lat)), longTasks: v.longTasks, tbt: ms(v.tbt) };
  }
});

const NAMES = {
  1: 'Cold load, every page', 2: 'Page weight', 3: 'Throttled phone (4x CPU, slow 4G)', 4: 'Main-thread blocking',
  5: 'Repeat visit caching', 6: 'Server pressure (300 req, 30 concurrent)', 7: '3D gallery', 8: 'Shelf memory and frame cost',
  9: 'Study page size and tab latency', 10: 'Map tiles and responsiveness'
};

for (const n of Object.keys(tests).map(Number).sort((a, b) => a - b)) {
  if (ONLY && !ONLY.includes(n)) continue;
  const t0 = Date.now();
  const browser = await chromium.launch(LAUNCH);
  try {
    results[n] = await tests[n](browser);
  } catch (e) {
    results[n] = { error: String(e).slice(0, 300) };
  }
  await browser.close();
  console.log(`\n=== Test ${n}: ${NAMES[n]} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log(JSON.stringify(results[n], (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(2) : v), 1));
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 1));
