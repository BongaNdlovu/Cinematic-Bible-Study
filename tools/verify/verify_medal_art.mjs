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
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].find((p) => p && fs.existsSync(p));

const PORT = process.env.MAP_PORT || "8013";
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
      } else if (data.method === "Runtime.exceptionThrown") {
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
  close() {
    this.ws.close();
  }
}

const CHECKS = [
  { year: "y331", names: ["Persepolis", "Pella", "Athens", "Alexandria", "Gaugamela"], shots: ["Persepolis", "Pella", "Athens"] },
  { year: "y605", names: ["Babylon", "Jerusalem", "Siege of Jerusalem"] },
  { year: "y539", names: ["Babylon", "Persepolis", "Sardis", "Fall of Babylon"] },
  { year: "y168", names: ["Rome", "Carthage", "Pydna", "Athens"] },
  { year: "y538", names: ["Rome", "Constantinople", "Ostrogoths driven from Rome"] },
];

let server = null;
let chrome = null;
try {
  server = spawn("python", ["server.py", "--no-browser"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${BASE}/map.html`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error("server not ready");
  if (!CHROME_PATH) throw new Error("Chrome not found");

  chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9337",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
    "about:blank",
  ]);
  await sleep(1600);
  const targets = await (await fetch("http://127.0.0.1:9337/json")).json();
  const page = targets.find((t) => t.type === "page") || targets[0];
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const seen = [];
  const collisions = [];

  for (const check of CHECKS) {
    await client.send("Page.navigate", { url: `${BASE}/map.html?skip=1&year=${check.year}` });
    await sleep(2800);
    const medals = await client.eval(`[...document.querySelectorAll('.cmap-medal .label')].map(n => n.textContent)`);
    console.log(check.year, "medals", medals);
    for (const name of check.names) {
      const hit = await client.eval(`(() => {
        const el = [...document.querySelectorAll('.cmap-medal')].find(n => (n.textContent || '').includes(${JSON.stringify(name)}));
        if (!el) return { ok: false, names: [...document.querySelectorAll('.cmap-medal .label')].map(n => n.textContent) };
        el.click();
        const img = document.querySelector('.cmap-dossier.open img');
        return {
          ok: true,
          title: document.querySelector('.cmap-dossier.open h2')?.textContent || '',
          src: img ? img.getAttribute('src') : ''
        };
      })()`);
      console.log("click", name, hit);
      if (!hit || !hit.ok) throw new Error("missing medal " + name + " " + JSON.stringify(hit));
      if (!hit.src) throw new Error("no image for " + name);
      if (hit.title && !hit.title.toLowerCase().includes(name.split(" ")[0].toLowerCase()) && name !== "Ostrogoths driven from Rome") {
        console.warn("title mismatch", name, hit.title);
      }
      const prev = seen.find((s) => s.src === hit.src && s.name !== name);
      if (prev) collisions.push({ a: prev, b: { year: check.year, name, ...hit } });
      seen.push({ year: check.year, name, ...hit });
      if ((check.shots || []).includes(name)) {
        const slug = name.toLowerCase().replace(/\s+/g, "_");
        await sleep(250);
        await client.shot(`qa/proofs/medal_proof_${check.year}_${slug}.png`);
      }
    }
  }

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `${BASE}/map.html?skip=1&year=y331` });
  await sleep(2600);
  await client.eval(`(() => {
    const el = [...document.querySelectorAll('.cmap-medal')].find(n => (n.textContent || '').includes('Persepolis'));
    if (el) el.click();
    return true;
  })()`);
  await sleep(400);
  await client.shot("qa/proofs/medal_proof_persepolis_mobile.png");

  console.log("collisions", collisions);
  console.log("console errors", client.errors);
  if (collisions.length) throw new Error("shared dossier art: " + JSON.stringify(collisions, null, 2));
  client.close();
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
