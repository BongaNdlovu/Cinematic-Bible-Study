import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
].find((p) => p && fs.existsSync(p));

const PORT = process.env.PORT || 8012;
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9340;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
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

async function waitForGallery(client, expectedTitlePart, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await client.eval(`(() => {
      const overlay = document.getElementById('loading-overlay');
      const hidden = overlay && overlay.classList.contains('hidden');
      const title = document.getElementById('hero-main-title')?.textContent || '';
      const geom = document.getElementById('dossier-geometry')?.textContent || '';
      const err = document.getElementById('loading-error');
      const errVisible = err && err.classList.contains('visible');
      const canvas = document.querySelector('#webgl-container canvas');
      return { hidden, title, geom, errVisible, hasCanvas: !!canvas };
    })()`);
    if (state.errVisible) throw new Error('Gallery reported a load error: ' + JSON.stringify(state));
    if (
      state.hidden &&
      state.hasCanvas &&
      state.title.toLowerCase().includes(expectedTitlePart.toLowerCase()) &&
      state.geom &&
      state.geom !== '—' &&
      !state.geom.startsWith('0')
    ) {
      return state;
    }
    await sleep(400);
  }
  throw new Error('Timed out waiting for gallery asset: ' + expectedTitlePart);
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
    try {
      if ((await fetch(`${BASE}/gallery.html`)).ok) { ready = true; break; }
    } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error('server not ready');

  chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--use-angle=d3d11',
    '--no-sandbox',
    '--window-size=1440,900',
    'about:blank'
  ]);
  await sleep(1800);
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });

  const beasts = [
    { id: 'lion', title: 'Winged Lion', out: 'gallery_lion.png', thumb: 'assets/thumbs/lion.jpg' },
    { id: 'bear', title: 'Bear', out: 'gallery_bear.png', thumb: 'assets/thumbs/bear.jpg' },
    { id: 'leopard', title: 'Leopard', out: 'gallery_leopard.png', thumb: 'assets/thumbs/leopard.jpg' },
    { id: 'beast', title: 'Dreadful Beast', out: 'gallery_beast.png', thumb: 'assets/thumbs/beast.jpg' },
  ];

  const reports = [];
  for (const b of beasts) {
    await client.send('Page.navigate', { url: `${BASE}/gallery.html?asset=${b.id}` });
    const state = await waitForGallery(client, b.title);
    await client.eval(`(() => {
      const spin = document.getElementById('btn-spin');
      if (spin && spin.classList.contains('active')) spin.click();
      const b360 = document.getElementById('btn-museum-360');
      if (b360 && b360.classList.contains('active')) b360.click();
    })()`);
    await sleep(900);
    const info = await client.eval(`(() => ({
      title: document.getElementById('hero-main-title')?.textContent,
      geom: document.getElementById('dossier-geometry')?.textContent,
      quote: document.getElementById('nar-scripture-quote')?.textContent?.slice(0, 80),
      card: document.querySelector('.artifact-card-item.active')?.dataset.asset,
      index: document.getElementById('exhibit-index')?.textContent,
      fps: document.getElementById('diag-fps')?.textContent
    }))()`);
    console.log(b.id, info);
    reports.push({ id: b.id, ...info, load: state });
    await client.shot(b.out);

    const jpeg = await client.eval(`(() => {
      const c = document.querySelector('#webgl-container canvas');
      if (!c) return null;
      return c.toDataURL('image/jpeg', 0.86);
    })()`);
    if (jpeg && jpeg.startsWith('data:image/jpeg')) {
      fs.writeFileSync(b.thumb, Buffer.from(jpeg.split(',')[1], 'base64'));
      console.log('thumb', b.thumb);
    }
  }

  await client.send('Page.navigate', { url: `${BASE}/index.html` });
  await sleep(1600);
  const tiles = await client.eval(`document.querySelectorAll('.artifact-grid.four .artifact-tile').length`);
  console.log('home beast tiles', tiles);
  if (tiles !== 4) throw new Error('Expected 4 Daniel 7 tiles on the cover, got ' + tiles);
  await client.shot('index_beasts.png');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await client.send('Page.navigate', { url: `${BASE}/gallery.html?asset=leopard` });
  await waitForGallery(client, 'Leopard');
  await sleep(700);
  await client.shot('gallery_leopard_mobile.png');

  await client.send('Page.navigate', { url: `${BASE}/index.html` });
  await sleep(1400);
  await client.shot('index_beasts_mobile.png');

  client.close();
  fs.writeFileSync('beast_gallery_report.json', JSON.stringify(reports, null, 2));
  console.log('DONE');
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
