import { spawn } from "child_process";
import fs from "fs";
import path from "path";

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

const PORT = process.env.MAP_PORT || "8012";
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
      } else if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
        this.errors.push((data.params.args || []).map((a) => a.value || a.description).join(" "));
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

let server = null;
let chrome = null;
try {
  server = spawn("python", ["server.py", "--no-browser"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });
  server.stdout.on("data", (d) => process.stdout.write("[srv] " + d));
  server.stderr.on("data", (d) => process.stderr.write("[srv] " + d));
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

  const geo = await fetch(`${BASE}/assets/maps/world-land-110m.geojson`);
  const pol = await fetch(`${BASE}/assets/maps/chronicle-polities.geojson`);
  console.log("geojson", geo.status, geo.headers.get("content-type"), "polities", pol.status);

  if (!CHROME_PATH) throw new Error("Chrome not found");
  chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9336",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
    "about:blank",
  ]);
  await sleep(1600);
  const targets = await (await fetch("http://127.0.0.1:9336/json")).json();
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

  await client.send("Page.navigate", { url: `${BASE}/map.html?skip=1&year=y605` });
  await sleep(2800);
  const stats = await client.eval(`({
    title: document.title,
    leaflet: !!document.querySelector('.leaflet-container'),
    tiles: document.querySelectorAll('.leaflet-tile').length,
    polities: document.querySelectorAll('.leaflet-interactive').length,
    medals: document.querySelectorAll('.cmap-medal').length,
    compass: !!document.querySelector('.cmap-compass'),
    play: !!document.querySelector('.cmap-play'),
    years: document.querySelectorAll('.cmap-year').length,
    cartouche: document.querySelector('.cmap-cartouche strong')?.textContent,
    dossier: document.querySelector('.cmap-dossier.open h2')?.textContent,
    loadGone: document.querySelector('.cmap-load')?.classList.contains('is-done')
  })`);
  console.log("map stats", stats);
  await client.shot("map_proof.png");

  await client.eval(`document.querySelector('.cmap-year[data-year="y331"]').click()`);
  await sleep(1800);
  const greece = await client.eval(`document.querySelector('.cmap-cartouche strong')?.textContent`);
  console.log("after 331", greece);
  await client.shot("map_proof_331.png");

  await client.eval(`document.querySelector('.cmap-year[data-year="y1798"]').click()`);
  await sleep(1800);
  await client.shot("map_proof_1798.png");

  await client.eval(`document.querySelector('.cmap-marker[data-id="jerusalem"]')?.click()`);
  await sleep(400);
  const jer = await client.eval(`document.querySelector('.cmap-dossier.open h2')?.textContent`);
  console.log("jerusalem dossier", jer);
  await client.shot("map_proof_city.png");

  await client.send("Page.navigate", { url: `${BASE}/study.html` });
  await sleep(2200);
  await client.eval(`showInstrument("map")`);
  await sleep(2200);
  const studyStats = await client.eval(`({
    embed: !!document.querySelector('#study-chronicle-map .leaflet-container'),
    polities: document.querySelectorAll('#study-chronicle-map .leaflet-interactive').length,
    enter: document.getElementById('map-enter-full')?.href || null,
    name: document.getElementById('map-name')?.textContent
  })`);
  console.log("study map", studyStats);
  await client.shot("study_proof_map.png");

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `${BASE}/map.html?skip=1&year=y538` });
  await sleep(2600);
  await client.shot("map_proof_mobile.png");

  console.log("console errors", client.errors);
  if (!stats.leaflet) throw new Error("leaflet failed to mount");
  if (stats.polities < 1) throw new Error("no polities rendered");
  if (!studyStats.embed) throw new Error("study embed failed");

  client.close();
} finally {
  if (chrome) chrome.kill();
  if (server) server.kill();
}
