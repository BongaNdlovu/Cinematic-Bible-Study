import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import vm from "node:vm";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (rel) => fs.readFileSync(new URL("../../" + rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startDevServer(port) {
  const python = process.platform === "win32" ? ["py", ["-3"]] : ["python3", []];
  const child = spawn(python[0], [...python[1], "server.py", "--no-browser"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), PYTHONUNBUFFERED: "1" },
    windowsHide: true
  });
  let log = "";
  child.stdout.on("data", (chunk) => { log += chunk; });
  child.stderr.on("data", (chunk) => { log += chunk; });
  const ready = new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (/Serving HTTP on port \d+/.test(log)) return resolve();
      if (child.exitCode !== null) return reject(new Error("server.py exited: " + log));
      if (Date.now() - started > 15000) return reject(new Error("server.py did not start: " + log));
      setTimeout(tick, 100);
    };
    tick();
  });
  return { child, ready };
}

function keepAliveExchange(port, path) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let data = Buffer.alloc(0);
    let sentGet = false;
    const host = "127.0.0.1:" + port;
    const finish = () => { socket.destroy(); resolve(data.toString("latin1")); };
    socket.setTimeout(3000, finish);
    socket.on("error", reject);
    socket.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
      if (!sentGet && data.includes("\r\n\r\n")) {
        sentGet = true;
        data = Buffer.alloc(0);
        socket.write("GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\n\r\n");
      }
      const text = data.toString("latin1");
      const head = text.indexOf("\r\n\r\n");
      const length = /Content-Length: (\d+)/i.exec(text);
      if (sentGet && head >= 0 && length && data.length - head - 4 >= Number(length[1])) finish();
    });
    socket.write("HEAD " + path + " HTTP/1.1\r\nHost: " + host + "\r\nRange: bytes=0-99\r\n\r\n");
  });
}

test("a GET after a HEAD with Range on the same connection gets the whole file", async (t) => {
  const port = await freePort();
  const { child, ready } = startDevServer(port);
  t.after(() => child.kill());
  await ready;
  const path = "/js/pages/study/study-app.js";
  const reply = await keepAliveExchange(port, path);
  const head = reply.indexOf("\r\n\r\n");
  const declared = Number((/Content-Length: (\d+)/i.exec(reply) || [])[1]);
  assert.match(reply, /^HTTP\/1\.1 200/);
  assert.equal(Buffer.byteLength(reply.slice(head + 4), "latin1"), declared);
  assert.equal(declared, fs.statSync(new URL("../../" + path.slice(1), import.meta.url)).size);
});

test("the master alert waits for the browser tests too", () => {
  const ci = read(".github/workflows/ci.yml");
  const alert = ci.slice(ci.indexOf("\n  alert:"));
  const needs = (/needs:\s*\[([^\]]*)\]/.exec(alert) || [])[1] || "";
  const jobs = needs.split(",").map((s) => s.trim());
  for (const job of ["test", "test-browser", "deploy", "smoke"]) assert.ok(jobs.includes(job), job + " missing from alert.needs");
});

test("every dev-only path the deploy guard looks for points into a folder that exists", () => {
  const script = read("tools/deploy-cloudflare-pages.ps1");
  const list = (/\$devLeft = @\(([^)]*)\)/.exec(script) || [])[1] || "";
  const paths = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/\\/g, "/"));
  assert.ok(paths.length > 0);
  const stale = paths.filter((p) => {
    const folder = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : ".";
    return !fs.existsSync(new URL("../../" + folder, import.meta.url));
  });
  assert.deepEqual(stale, []);
});

test("no page loads a module before its import map", () => {
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const late = pages.filter((page) => {
    const html = read(page);
    const map = html.indexOf('<script type="importmap"');
    if (map < 0) return false;
    const firstModule = html.indexOf('<script type="module"');
    return firstModule >= 0 && firstModule < map;
  });
  assert.deepEqual(late, []);
});

test("the hall backdrop uses a filter constant three.js defines, and treats 0 as not a power of two", () => {
  const src = read("js/pages/gallery/hall-backdrop.js");
  const used = [...src.matchAll(/THREE\.([A-Za-z_]+Filter)\b/g)].map((m) => m[1]);
  const three = read("vendor/three/build/three.core.min.js");
  for (const name of used) assert.ok(new RegExp("\\b" + name + "\\b").test(three), name + " is not a three.js export");
  assert.ok(!/LINEAR_MIPMAP_LINEAR/.test(src));
  const pot = new Function("return " + (/const pot = (\([^;]+);/.exec(src) || [])[1])();
  assert.equal(pot(0), false);
  assert.equal(pot(1024), true);
  assert.equal(pot(1000), false);
});

test("the shelf canvas lets a vertical swipe scroll the page until a volume is open", () => {
  const css = read("css/pages/index/shelf.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
  const closed = rules.filter((r) => r.sel === ".shelf-stage #gl" && /touch-action/.test(r.body));
  assert.equal(closed.length, 1);
  assert.match(closed[0].body, /touch-action:\s*pan-y/);
  const open = rules.filter((r) => r.sel === ".shelf-stage.is-open #gl");
  assert.match(open[0].body, /touch-action:\s*none/);
});

test("the Siege of Jerusalem pin sits on Jerusalem", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("js/content/map-data.js"), ctx);
  const data = ctx.window.MAP_CHRONICLE;
  const siege = data.events.find((e) => e.id === "siege-jerusalem");
  const city = data.cities.find((c) => c.id === "jerusalem");
  const km = Math.hypot((siege.lon - city.lon) * 111.32 * Math.cos(city.lat * Math.PI / 180), (siege.lat - city.lat) * 110.57);
  assert.ok(km < 1, "the siege pin is " + km.toFixed(1) + " km from Jerusalem");
});

function memoryStorage(seed) {
  const store = Object.assign({}, seed || {});
  return {
    store,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
}

function syncSandbox({ storage, client, auth }) {
  const timers = [];
  const journey = {
    load: () => JSON.parse(storage.getItem("baJourney") || "{}"),
    save(patch) {
      const cur = journey.load();
      const next = Object.assign({}, cur, patch);
      if (patch.seenIntro) next.seenIntro = Object.assign({}, cur.seenIntro, patch.seenIntro);
      if (patch.station) next.station = Object.assign({}, cur.station, patch.station);
      storage.setItem("baJourney", JSON.stringify(next));
      ctx.ProgressSync.syncNow();
      return next;
    }
  };
  const ctx = {
    console, JSON, Math, Date, Number, String, Array, Object, Promise, URL, Set, Map, Error,
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: (id) => { if (id) timers[id - 1] = null; },
    setInterval: () => 0,
    clearInterval: () => {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    navigator: { onLine: true },
    location: { href: "https://example.test/study.html", pathname: "/study.html", search: "", hash: "" },
    document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null },
    localStorage: storage,
    sessionStorage: memoryStorage(),
    BAJourney: journey,
    ScrollAuth: { getClient: () => client, getUser: () => auth.user }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/core/core.js"), ctx);
  vm.runInContext(read("js/features/progress-sync.js"), ctx);
  const runTimers = async () => {
    for (let i = 0; i < timers.length; i += 1) {
      const fn = timers[i];
      timers[i] = null;
      if (fn) fn();
    }
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { ctx, runTimers };
}

test("switching accounts takes the new account's map unlocks and pushes nothing back over its cloud row", async () => {
  const storage = memoryStorage({
    baProgressAccountId: "A",
    daniel_workbench_v1: "{}",
    daniel_historicist_mastery: "[]",
    daniel_competency_telemetry_v1: "{}",
    baJourney: JSON.stringify({ completedSheets: [2], unlocked: ["persia"], sheet: 2, pathSheet: 2 })
  });
  const remoteB = { user_id: "B", revision: 4, journey: { completedSheets: [0, 1], unlocked: ["babylon"], sheet: 1, pathSheet: 1, seenIntro: { map: true } }, workbench: {}, telemetry: {} };
  const saves = [];
  const auth = { user: { id: "B" } };
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: remoteB, error: null }) }) }) }),
    rpc: (name, args) => { saves.push(args); return Promise.resolve({ data: { status: "ok", revision: 5 }, error: null }); }
  };
  const { ctx, runTimers } = syncSandbox({ storage, client, auth });
  await ctx.ProgressSync.pullAndMerge();
  await runTimers();
  const local = JSON.parse(storage.getItem("baJourney"));
  assert.deepEqual(local.unlocked, ["babylon"]);
  assert.deepEqual(local.completedSheets, [0, 1]);
  assert.equal(local.seenIntro.map, true);
  assert.equal(saves.length, 0, "nothing should be pushed over B's cloud row right after the switch");
});

test("a save conflict keeps the cloud's map unlocks and intro flags", async () => {
  const storage = memoryStorage({
    baProgressAccountId: "B",
    daniel_workbench_v1: "{}",
    daniel_historicist_mastery: "[]",
    daniel_competency_telemetry_v1: "{}",
    baJourney: JSON.stringify({ completedSheets: [], unlocked: [], sheet: 0, pathSheet: -1 })
  });
  const cloud = { journey: { completedSheets: [0], unlocked: ["babylon", "persia"], seenIntro: { map: true }, station: { a: 1 } }, workbench: {}, telemetry: {} };
  const auth = { user: { id: "B" } };
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: "offline" } }) }) }) }),
    rpc: () => Promise.resolve({ data: { status: "conflict", revision: 7, row: cloud }, error: null })
  };
  const { ctx } = syncSandbox({ storage, client, auth });
  await ctx.ProgressSync.flushNow();
  await ctx.ProgressSync.pushNow();
  await new Promise((resolve) => setImmediate(resolve));
  const outbox = JSON.parse(storage.getItem("baProgressOutbox") || "null");
  assert.ok(outbox, "the merged conflict should be queued");
  const merged = outbox.payload.journey;
  assert.deepEqual([...merged.unlocked].sort(), ["babylon", "persia"]);
  assert.equal(merged.seenIntro.map, true);
  assert.equal(merged.station.a, 1);
});
