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
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9341;
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
      return { hidden, title, geom };
    })()`);
    if (
      state.hidden &&
      state.title.toLowerCase().includes(expectedTitlePart.toLowerCase()) &&
      state.geom && state.geom !== '—'
    ) return state;
    await sleep(400);
  }
  throw new Error('timeout ' + expectedTitlePart);
}

let server = null;
let chrome = null;
try {
  server = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/index.html`)).ok) { ready = true; break; } } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error('server not ready');

  chrome = spawn(CHROME_PATH, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
    '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=d3d11',
    '--no-sandbox', '--window-size=1440,900', 'about:blank'
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
  await client.send('Page.navigate', { url: `${BASE}/index.html` });
  await sleep(1400);
  await client.eval(`document.querySelector('.artifact-grid.four')?.scrollIntoView({block:'center'})`);
  await sleep(500);
  const tileInfo = await client.eval(`(() => {
    const tiles = [...document.querySelectorAll('.artifact-grid.four .artifact-tile')].map((a) => ({
      href: a.getAttribute('href'),
      title: a.querySelector('h3')?.textContent
    }));
    return { count: tiles.length, tiles };
  })()`);
  console.log(tileInfo);
  if (tileInfo.count !== 4) throw new Error('expected 4 beast tiles');
  await client.shot('index_beasts.png');

  await client.send('Page.navigate', { url: `${BASE}/gallery.html?asset=lion` });
  await waitForGallery(client, 'Winged Lion');
  await sleep(800);
  const rail = await client.eval(`(() => {
    const cards = [...document.querySelectorAll('.artifact-card-item')].map((c) => c.dataset.asset);
    const visible = [...document.querySelectorAll('.artifact-card-item')].filter((c) => {
      const r = c.getBoundingClientRect();
      return r.height > 0 && r.bottom > 80 && r.top < window.innerHeight - 40;
    }).map((c) => c.dataset.asset);
    return { cards, visible, active: document.querySelector('.artifact-card-item.active')?.dataset.asset };
  })()`);
  console.log('rail', rail);
  await client.shot('gallery_lion.png');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true
  });
  await client.send('Page.navigate', { url: `${BASE}/gallery.html?asset=leopard` });
  await waitForGallery(client, 'Leopard');
  await sleep(900);
  const camInfo = await client.eval(`(() => {
    const c = window.__galleryCamera;
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      aspect: c ? +c.aspect.toFixed(3) : null,
      pos: c ? [c.position.x, c.position.y, c.position.z].map((n) => +n.toFixed(2)) : null,
      targetGuess: document.getElementById('hero-main-title')?.textContent
    };
  })()`);
  console.log('mobile cam', camInfo);
  await client.shot('gallery_leopard_mobile.png');

  await client.send('Page.navigate', { url: `${BASE}/index.html` });
  await sleep(1200);
  await client.eval(`document.querySelector('.artifact-grid.four')?.scrollIntoView({block:'center'})`);
  await sleep(400);
  await client.shot('index_beasts_mobile.png');

  client.close();
  console.log('DONE');
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
