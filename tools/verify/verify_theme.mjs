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

const PORT = process.env.PORT || 8014;
const DEBUG_PORT = process.env.DEBUG_PORT || 9344;
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
    return this.resultValue(res.result);
  }
  resultValue(result) {
    if (!result) return undefined;
    if (result.unserializableValue) return result.unserializableValue;
    return result.value;
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
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/study.html`)).ok) { ready = true; break; } } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error('server not ready');

  chrome = spawn(CHROME_PATH, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, '--disable-gpu', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
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
  await client.eval(`localStorage.removeItem('daniel_theme_v1')`);
  await client.eval(`applyTheme(2, true)`);
  await sleep(400);

  const white = await client.eval(`(() => {
    const body = getComputedStyle(document.body);
    const spine = getComputedStyle(document.querySelector('.sitting-spine'));
    const inst = getComputedStyle(document.querySelector('.study-instruments'));
    const fact = getComputedStyle(document.querySelector('.epoch-facts .fact'));
    const rgb = body.backgroundColor;
    const isPureWhite = rgb === 'rgb(255, 255, 255)' || rgb === '#ffffff' || rgb === 'white';
    return {
      dark: document.documentElement.classList.contains('dark'),
      paperMode: document.body.classList.contains('paper-mode'),
      whiteMode: document.body.classList.contains('white-mode'),
      icon: document.getElementById('theme-icon')?.textContent,
      bodyBg: rgb,
      isPureWhite,
      spineBg: spine.backgroundColor,
      instBg: inst.backgroundColor,
      factColor: fact.color,
      bodyColor: body.color
    };
  })()`);
  console.log('white theme', white);
  if (white.dark) throw new Error('white theme still has html.dark');
  if (white.paperMode) throw new Error('white theme is still paper-mode');
  if (!white.whiteMode) throw new Error('white theme missing white-mode');
  const bg = (white.bodyBg || '').replace(/\s/g, '');
  if (bg !== 'rgb(255,255,255)' && bg !== '#ffffff' && bg !== 'white') {
    throw new Error('white theme is not actual white: ' + white.bodyBg);
  }
  await client.shot('qa/proofs/theme_proof_white.png');

  await client.eval(`applyTheme(1, true)`);
  await sleep(300);
  const paper = await client.eval(`({
    dark: document.documentElement.classList.contains('dark'),
    icon: document.getElementById('theme-icon')?.textContent,
    bg: getComputedStyle(document.body).backgroundColor
  })`);
  console.log('paper theme', paper);
  await client.shot('qa/proofs/theme_proof_paper.png');

  await client.eval(`applyTheme(0, true)`);
  await sleep(300);
  const charcoal = await client.eval(`({
    dark: document.documentElement.classList.contains('dark'),
    charcoal: document.body.classList.contains('charcoal-mode'),
    icon: document.getElementById('theme-icon')?.textContent
  })`);
  console.log('charcoal', charcoal);
  if (!charcoal.charcoal) throw new Error('charcoal theme lost charcoal-mode');

  await client.eval(`applyTheme(2, true); togglePomodoroDrawer();`);
  await sleep(400);
  const weather = await client.eval(`(async () => {
    setWeatherPreset('storm', true);
    return {
      preset: typeof weatherPreset !== 'undefined' ? weatherPreset : null,
      canvas: !!document.getElementById('weather-canvas')
    };
  })()`);
  console.log('weather visual check', weather);
  await client.shot('qa/proofs/theme_proof_white_storm.png');

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await client.eval(`applyTheme(2, true)`);
  await sleep(500);
  await client.shot('qa/proofs/theme_proof_white_mobile.png');

  if (client.errors.length) console.log('page errors', client.errors.slice(0, 6));
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
