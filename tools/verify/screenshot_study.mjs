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

const PORT = process.env.PORT || 8000;
const BASE = `http://127.0.0.1:${PORT}`;
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

let server = null;
try {
  let ready = false;
  try { if ((await fetch(`${BASE}/study.html`)).ok) ready = true; } catch {}
  if (!ready) {
    server = spawn('python', ['server.py', '--no-browser'], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'pipe'
    });
    server.stdout.on('data', (d) => process.stdout.write('[srv] ' + d));
    server.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(`${BASE}/study.html`)).ok) { ready = true; break; } } catch {}
      await sleep(150);
    }
  }
  if (!ready) throw new Error('server not ready');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--remote-debugging-port=9334', '--disable-gpu', '--no-sandbox',
    '--window-size=1440,900', 'about:blank'
  ]);
  await sleep(1600);
  const targets = await (await fetch('http://127.0.0.1:9334/json')).json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await client.send('Page.navigate', { url: `${BASE}/study.html` });
  await sleep(2200);
  await client.eval('try { localStorage.removeItem("daniel_historicist_sheet"); } catch (e) {}');
  await client.send('Page.navigate', { url: `${BASE}/study.html` });
  await sleep(2200);
  const title = await client.eval('document.getElementById("sheet-title")?.textContent');
  const units = await client.eval('typeof sheetsData !== "undefined" ? sheetsData.length : 0');
  console.log({ title, units });
  await client.shot('qa/proofs/study_proof.png');

  await client.eval('showInstrument("map")');
  await sleep(400);
  await client.shot('qa/proofs/study_proof_map.png');
  await client.eval('showInstrument("context"); loadSheet(2);');
  await sleep(500);
  await client.shot('qa/proofs/study_proof_context.png');
  await client.eval('togglePomodoroDrawer()');
  await sleep(400);
  await client.eval("setWeatherPreset('storm')");
  await sleep(800);
  await client.shot('qa/proofs/study_proof_storm.png');
  await client.eval('showInstrument("timeline"); loadSheet(7);');
  await sleep(500);
  await client.shot('qa/proofs/study_proof_dream.png');

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await client.send('Page.navigate', { url: `${BASE}/study.html` });
  await sleep(1800);
  await client.shot('qa/proofs/study_proof_mobile.png');

  client.close();
  chrome.kill();
} finally {
  if (server) server.kill();
}
