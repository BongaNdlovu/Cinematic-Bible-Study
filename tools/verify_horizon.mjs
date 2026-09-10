import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
].find((p) => p && fs.existsSync(p));

const PORT = process.env.PORT || 8013;
const DEBUG_PORT = process.env.DEBUG_PORT || 9343;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
    this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.errors.push(data.params.exceptionDetails?.text || JSON.stringify(data.params));
      } else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        this.errors.push((data.params.args || []).map((a) => a.value || a.description).join(' '));
      }
    };
  }
  async send(method, params = {}) {
    await this.ready;
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }
  async shot(outPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
    console.log('wrote', outPath);
  }
  close() { this.ws.close(); }
}

let server = null;
let chrome = null;
try {
  if (!CHROME_PATH) throw new Error('Chrome not found');
  server = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });
  server.stdout.on('data', (d) => process.stdout.write('[srv] ' + d));
  server.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/study.html`)).ok) { ready = true; break; } } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error('server not ready');

  chrome = spawn(CHROME_PATH, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, '--disable-gpu', '--no-sandbox',
    '--window-size=1440,900', 'about:blank'
  ]);
  await sleep(1600);
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await client.send('Page.navigate', { url: `${BASE}/study.html` });
  await sleep(2400);

  const horizon = await client.eval(`(() => {
    const cards = [...document.querySelectorAll('.horizon-card')];
    const srcs = cards.map((c) => c.querySelector('img')?.getAttribute('src'));
    return {
      count: cards.length,
      years: cards.map((c) => c.querySelector('.horizon-card-year')?.textContent),
      srcs,
      unique: new Set(srcs).size,
      active: document.querySelector('.horizon-card.is-active .horizon-card-year')?.textContent,
      plate: document.getElementById('epoch-plate-img')?.getAttribute('src'),
      tag: document.getElementById('active-epoch-tag')?.textContent,
      prevDisabled: document.getElementById('horizon-prev')?.disabled,
      nextDisabled: document.getElementById('horizon-next')?.disabled,
      arrows: !!document.getElementById('horizon-prev') && !!document.getElementById('horizon-next')
    };
  })()`);
  console.log('horizon', horizon);
  if (horizon.count !== 8) throw new Error('expected 8 horizon cards');
  if (horizon.unique !== 8) throw new Error('horizon cards reuse images: ' + JSON.stringify(horizon.srcs));
  if (horizon.prevDisabled !== true) throw new Error('prev should be disabled on first epoch');
  await client.shot('horizon_proof.png');

  await client.eval(`document.getElementById('horizon-next').click()`);
  await sleep(600);
  const afterNext = await client.eval(`({
    active: document.querySelector('.horizon-card.is-active .horizon-card-year')?.textContent,
    plate: document.getElementById('epoch-plate-img')?.getAttribute('src'),
    tag: document.getElementById('active-epoch-tag')?.textContent,
    prevDisabled: document.getElementById('horizon-prev')?.disabled
  })`);
  console.log('after next', afterNext);
  if (afterNext.active !== '539 B.C.') throw new Error('arrow did not advance to 539');
  if (!afterNext.plate.includes('y539')) throw new Error('plate did not follow arrow');
  await client.shot('horizon_proof_arrow.png');

  await client.eval(`(() => {
    const card = document.getElementById('t-node-2');
    card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  })()`);
  await sleep(400);
  const hover = await client.eval(`({
    on: document.getElementById('horizon-float')?.classList.contains('is-on'),
    hidden: document.getElementById('horizon-float')?.hidden,
    year: document.getElementById('horizon-float-year')?.textContent,
    title: document.getElementById('horizon-float-title')?.textContent,
    src: document.getElementById('horizon-float-img')?.getAttribute('src')
  })`);
  console.log('hover', hover);
  if (!hover.on) throw new Error('hover float did not open');
  if (hover.year !== '457 B.C.') throw new Error('hover showed wrong year');
  await client.shot('horizon_proof_hover.png');

  await client.eval(`setEpochInfo(2)`);
  await sleep(400);
  const decree = await client.eval(`({
    plate: document.getElementById('epoch-plate-img')?.getAttribute('src'),
    active: document.querySelector('.horizon-card.is-active .horizon-card-year')?.textContent,
    sheet: document.getElementById('sheet-title')?.textContent
  })`);
  console.log('457', decree);
  if (!decree.plate.includes('y457')) throw new Error('457 still not using decree art');
  if (!/70 Weeks|Chathak/i.test(decree.sheet || '')) throw new Error('457 did not open the seventy-weeks excerpt');

  await client.eval(`showInstrument('context'); loadSheet(1);`);
  await sleep(400);
  const d1 = await client.eval(`document.getElementById('context-img')?.getAttribute('src')`);
  await client.eval(`loadSheet(3)`);
  await sleep(300);
  const d3 = await client.eval(`document.getElementById('context-img')?.getAttribute('src')`);
  await client.eval(`loadSheet(0)`);
  await sleep(300);
  const intro = await client.eval(`document.getElementById('context-img')?.getAttribute('src')`);
  console.log('context sheets', { intro, d1, d3 });
  if (d1 === intro) throw new Error('Daniel 1 still shares intro siege art');
  if (d3 === intro || d3 === d1) throw new Error('Daniel 3 still reuses siege/court art');
  if (!d3.includes('dura-plain')) throw new Error('Daniel 3 should use dura-plain');

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await client.send('Page.navigate', { url: `${BASE}/study.html` });
  await sleep(2000);
  const mobile = await client.eval(`({
    count: document.querySelectorAll('.horizon-card').length,
    cardW: document.querySelector('.horizon-card')?.getBoundingClientRect().width,
    floatDisplay: getComputedStyle(document.getElementById('horizon-float')).display
  })`);
  console.log('mobile', mobile);
  if (mobile.cardW < 200) throw new Error('mobile cards should be large snap cards');
  await client.shot('horizon_proof_mobile.png');

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await client.send('Page.navigate', { url: `${BASE}/gallery.html?asset=goat` });
  await sleep(3500);
  const goatPlate = await client.eval(`document.getElementById('nar-plate-img')?.getAttribute('src')`);
  await client.eval(`document.querySelector('.timeline-item[data-asset="leopard"]')?.click()`);
  await sleep(1200);
  const leopardPlate = await client.eval(`document.getElementById('nar-plate-img')?.getAttribute('src')`);
  await client.eval(`document.querySelector('.timeline-item[data-asset="goat_broken"]')?.click()`);
  await sleep(1200);
  const brokenPlate = await client.eval(`document.getElementById('nar-plate-img')?.getAttribute('src')`);
  const thighsPlate = await client.eval(`(() => {
    document.querySelector('.timeline-item[data-asset="thighs"]')?.click();
    return null;
  })()`);
  await sleep(900);
  const thighsSrc = await client.eval(`document.getElementById('nar-plate-img')?.getAttribute('src')`);
  const greek = { goatPlate, leopardPlate, brokenPlate, thighsSrc };
  console.log('greek plates in UI', greek);
  if ([goatPlate, leopardPlate, brokenPlate, thighsSrc].some((s) => !s)) throw new Error('missing greek plate src ' + JSON.stringify(greek));
  if (new Set([goatPlate, leopardPlate, brokenPlate, thighsSrc]).size !== 4) throw new Error('Greek factors still share a plate in the gallery UI');
  await client.shot('horizon_proof_gallery_goat_broken.png');

  await client.send('Page.navigate', { url: `${BASE}/map.html?skip=1&year=y331` });
  await sleep(2800);
  const routeArts = await client.eval(`(() => {
    const routes = (window.MAP_CHRONICLE || window.DATA || {}).routes || (typeof DATA !== 'undefined' ? DATA.routes : null);
    const src = window.MAP_CHRONICLE?.routes || [];
    return src.map((r) => ({ id: r.id, stops: r.stops.map((s) => ({ name: s.name, art: s.art })) }));
  })()`);
  console.log('route arts', JSON.stringify(routeArts, null, 2));
  const alex = routeArts.find((r) => r.id === 'alexander');
  if (!alex) throw new Error('alexander route missing');
  const alexArts = alex.stops.map((s) => s.art);
  if (alexArts.some((a) => !a)) throw new Error('alexander stops missing art');
  if (new Set(alexArts).size !== alexArts.length) throw new Error('alexander stops share art');
  await client.eval(`document.querySelector('.cmap-play-route')?.click()`);
  await sleep(1400);
  const firstStop = await client.eval(`({
    title: document.querySelector('.cmap-dossier.open h2, .cmap-dossier h2')?.textContent,
    art: document.querySelector('.cmap-dossier img')?.getAttribute('src')
  })`);
  console.log('first route stop', firstStop);
  await client.shot('horizon_proof_map_pella.png');
  if (firstStop.art && !firstStop.art.includes('pella') && !firstStop.art.includes('stops/')) {
    console.warn('first stop art may not be Pella yet', firstStop);
  }

  if (client.errors.length) console.log('page errors', client.errors.slice(0, 8));
  client.close();
  chrome.kill();
  console.log('VERIFY_OK');
} catch (err) {
  console.error('VERIFY_FAIL', err);
  process.exitCode = 1;
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
