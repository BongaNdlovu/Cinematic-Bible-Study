import { spawn } from "child_process";
import fs from "fs";
import path from "path";

fs.mkdirSync(path.join("qa", "proofs"), { recursive: true });

const CHROME_PATH = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
    : null,
].find((p) => p && fs.existsSync(p));

const PORT = "8017";
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9346;
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
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }
  async shot(outPath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(outPath, Buffer.from(res.data, "base64"));
    console.log("wrote", outPath);
  }
  close() { this.ws.close(); }
}

const ASSETS = [
  { id: "assembled", title: "Colossus", shot: true },
  { id: "head", title: "Golden Head", shot: true },
  { id: "chest", title: "Silver Chest", shot: true },
  { id: "thighs", title: "Bronze", shot: true },
  { id: "legs", title: "Legs of Iron", shot: true },
  { id: "feet", title: "Iron & Clay", shot: true },
  { id: "stone", title: "Stone", shot: true },
  { id: "lion", title: "Winged Lion", shot: false },
  { id: "bear", title: "Bear", shot: false },
  { id: "leopard", title: "Leopard", shot: true },
  { id: "beast", title: "Dreadful", shot: true },
  { id: "ram", title: "Ram of Medo-Persia", shot: true },
  { id: "goat", title: "Charging Goat", shot: false },
  { id: "goat_broken", title: "Broken Horn", shot: true },
  { id: "goat_horn", title: "Little Horn of the Goat", shot: true },
  { id: "dura", title: "Dura", shot: true },
  { id: "stump", title: "Stump", shot: true },
  { id: "ancient", title: "Ancient of Days", shot: true },
  { id: "son", title: "Son of Man", shot: true },
  { id: "ox_king", title: "Ox-King", shot: true },
  { id: "michael", title: "Michael", shot: true },
  { id: "sealed", title: "Sealed Scroll", shot: true },
  { id: "kings", title: "Kings", shot: true },
  { id: "decree", title: "Decree", shot: true },
];

let server = null;
let chrome = null;
try {
  if (!CHROME_PATH) throw new Error("Chrome not found");
  server = spawn("python", ["server.py", "--no-browser"], {
    env: { ...process.env, PORT },
    stdio: "pipe",
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/gallery.html`)).ok) { ready = true; break; } } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error("server not ready");

  chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--use-angle=d3d11",
    "--no-sandbox",
    "--window-size=1440,900",
    "about:blank",
  ]);
  await sleep(1800);
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
  const page = targets.find((t) => t.type === "page") || targets[0];
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  await client.send("Page.navigate", { url: `${BASE}/gallery.html?asset=assembled&preview=full` });
  const start = Date.now();
  while (Date.now() - start < 28000) {
    const st = await client.eval(`(() => {
      const overlay = document.getElementById('loading-overlay');
      return {
        hidden: overlay && overlay.classList.contains('hidden'),
        title: document.getElementById('hero-main-title')?.textContent || '',
        hallUrl: window.__hallUrl || ''
      };
    })()`);
    if (st.hidden && st.title.toLowerCase().includes("colossus") && st.hallUrl) break;
    await sleep(400);
  }
  await client.eval(`(() => {
    const spin = document.getElementById('btn-spin');
    if (spin && spin.classList.contains('active')) spin.click();
    const b360 = document.getElementById('btn-museum-360');
    if (b360 && b360.classList.contains('active')) b360.click();
  })()`);

  const seen = [];
  for (const s of ASSETS) {
    let hit = null;
    for (let i = 0; i < 50; i++) {
      const info = await client.eval(`(() => {
        const btn = document.querySelector('.artifact-card-item[data-asset="${s.id}"]');
        if (!btn) return { ok: false };
        btn.scrollIntoView({ block: 'center' });
        btn.click();
        return {
          ok: true,
          title: document.getElementById('hero-main-title')?.textContent || '',
          hallUrl: window.__hallUrl || ''
        };
      })()`);
      if (!info || !info.ok) throw new Error("no card for " + s.id);
      if (
        info.title.toLowerCase().includes(s.title.toLowerCase()) &&
        info.hallUrl
      ) {
        hit = info;
        break;
      }
      await sleep(250);
    }
    if (!hit) throw new Error("timed out on " + s.id);
    console.log(s.id, hit.hallUrl, hit.title);
    seen.push({ id: s.id, url: hit.hallUrl, title: hit.title });
    await sleep(s.shot ? 800 : 700);
    if (s.shot) await client.shot(`qa/proofs/hall_all_${s.id}.png`);
  }

  const urls = seen.map((x) => x.url);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dupes.length) throw new Error("shared hall murals: " + JSON.stringify(dupes));
  console.log("unique hall murals", seen.length);

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
  });
  await client.eval(`document.querySelector('.artifact-card-item[data-asset="head"]').click()`);
  await sleep(1400);
  await client.shot("qa/proofs/hall_all_head_mobile.png");
  client.close();
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
