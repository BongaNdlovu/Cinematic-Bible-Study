import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

const CHROME_PATH = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
].find((p) => p && fs.existsSync(p));

const PORT = process.env.PORT || 8015;
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9343;
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
      return { hidden, title, geom, errVisible };
    })()`);
    if (state.errVisible) throw new Error('load error ' + JSON.stringify(state));
    if (
      state.hidden &&
      state.title.toLowerCase().includes(expectedTitlePart.toLowerCase()) &&
      state.geom && state.geom !== '—' && !state.geom.startsWith('0')
    ) return state;
    await sleep(400);
  }
  throw new Error('timeout ' + expectedTitlePart);
}

let server = null;
let chrome = null;
try {
  if (!CHROME_PATH) throw new Error('Chrome not found');
  server = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/gallery.html`)).ok) { ready = true; break; } } catch {}
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

  const shots = [
    { id: 'dura', title: 'Golden Image of Dura', out: 'qa/proofs/gallery_dura.png' },
    { id: 'stump', title: 'Ironbound Stump', out: 'qa/proofs/gallery_stump.png' },
    { id: 'ancient', title: 'Ancient of Days', out: 'qa/proofs/gallery_ancient.png' },
    { id: 'son', title: 'Son of Man', out: 'qa/proofs/gallery_son.png' },
    { id: 'ox_king', title: 'Nebuchadnezzar the Ox-King', out: 'qa/proofs/gallery_ox_king.png' },
    { id: 'michael', title: 'Michael Standing Up', out: 'qa/proofs/gallery_michael.png' },
    { id: 'sealed', title: 'The Sealed Scroll', out: 'qa/proofs/gallery_sealed.png' },
    { id: 'kings', title: 'Kings of the North and South', out: 'qa/proofs/gallery_kings.png' },
    { id: 'decree', title: 'Royal Decree of Artaxerxes', out: 'qa/proofs/gallery_decree.png' },
  ];

  for (const b of shots) {
    await client.send('Page.navigate', { url: `${BASE}/gallery.html?asset=${b.id}` });
    await waitForGallery(client, b.title);
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
      card: document.querySelector('.artifact-card-item.active')?.dataset.asset,
      index: document.getElementById('exhibit-index')?.textContent,
      fps: document.getElementById('diag-fps')?.textContent
    }))()`);
    console.log(b.id, info);
    if (info.card !== b.id) throw new Error('active card mismatch for ' + b.id);
    await client.shot(b.out);
  }

  await client.send('Page.navigate', { url: `${BASE}/index.html` });
  await sleep(1200);
  await client.eval(`document.querySelector('a[href="gallery.html?asset=dura"]')?.closest('.artifact-grid')?.scrollIntoView({block:'center'})`);
  await sleep(400);
  const n = await client.eval(`document.querySelectorAll('a[href="gallery.html?asset=dura"]').length`);
  console.log('dura tiles on cover', n);
  if (!n) throw new Error('Dura tile missing on cover');
  await client.shot('qa/proofs/index_visions.png');

  client.close();
  console.log('DONE');
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
