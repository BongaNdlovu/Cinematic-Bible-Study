import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (rel) => fs.readFileSync(new URL("../../" + rel, import.meta.url), "utf8");

function extractBlock(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, "missing " + startMarker);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error("unbalanced block after " + startMarker);
}

function extractStatement(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, "missing " + startMarker);
  return source.slice(start, source.indexOf("];", start) + 2);
}

test("a stale desk reply cannot release the lock of a newer request", () => {
  const desk = read("js/shared/desk.js");
  const code = [
    "const inflight = Object.create(null);",
    "const busy = [];",
    "function setSendBusy(key, on) { busy.push([key, on]); }",
    "let lockSeq = 0;",
    extractBlock(desk, "function lock(key)"),
    extractBlock(desk, "function unlock(key, token)"),
    "({ lock, unlock, inflight, busy });"
  ].join("\n");
  const api = vm.runInNewContext(code);
  const first = api.lock("reply");
  assert.ok(first);
  assert.equal(api.lock("reply"), 0, "a second request is refused while the first is in flight");
  delete api.inflight.reply;
  const second = api.lock("reply");
  assert.ok(second && second !== first);
  api.unlock("reply", first);
  assert.equal(api.inflight.reply, second, "the old reply leaves the newer lock alone");
  assert.equal(api.busy.length, 0, "the old reply does not re-enable the newer request's button");
  api.unlock("reply", second);
  assert.equal("reply" in api.inflight, false);
  assert.equal(JSON.stringify(api.busy), JSON.stringify([["reply", false]]));
});

test("the weather label, type and highlighted step always come from the same band", () => {
  const app = read("js/study/study-app.js");
  assert.equal(/focusAtmosphere < 0\.\d/.test(app), false, "no second threshold set may remain");
  const code = [
    extractStatement(app, "const WEATHER_BANDS = ["),
    extractBlock(app, "function weatherBand(v)"),
    "({ WEATHER_BANDS, weatherBand });"
  ].join("\n");
  const { WEATHER_BANDS, weatherBand } = vm.runInNewContext(code);
  const typeFor = { Still: "quiet", Building: "building", Storm: "storm", Breaking: "storm", Sun: "sunshine" };
  const stepFor = { quiet: "quiet", building: "quiet", storm: "storm", sunshine: "sun" };
  for (let i = 1; i < WEATHER_BANDS.length; i += 1) {
    assert.ok(WEATHER_BANDS[i].below > WEATHER_BANDS[i - 1].below, "bands rise in order");
  }
  for (let v = 0; v <= 1; v += 0.001) {
    const band = weatherBand(v);
    assert.equal(band.type, typeFor[band.label], "label " + band.label + " at " + v.toFixed(3));
    assert.equal(band.step, stepFor[band.type], "step at " + v.toFixed(3));
  }
  assert.equal(weatherBand(0.425).label, "Storm");
  assert.equal(weatherBand(0.425).type, "storm");
  const presets = { quiet: 0.08, building: 0.34, storm: 0.58, sunshine: 0.96 };
  for (const [type, level] of Object.entries(presets)) {
    assert.equal(weatherBand(level).type, type, "preset " + type + " reads as its own type");
  }
});

function permissiveElement(id) {
  const el = {
    id,
    hidden: false,
    value: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    style: {},
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { el.children.push(child); return child; },
    insertBefore(child) { el.children.push(child); return child; },
    replaceChildren() { el.children = []; },
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    focus() {},
    reset() {},
    remove() {}
  };
  return el;
}

test("the own-note check stops promising a retry once its retries run out", async () => {
  const elements = new Map();
  const byId = (id) => {
    if (!elements.has(id)) elements.set(id, permissiveElement(id));
    return elements.get(id);
  };
  const timers = [];
  const failedReply = (onOk, onErr) => Promise.resolve({ data: null, error: { status: 503, message: "upstream" } }).then(onOk, onErr);
  const chain = new Proxy({}, {
    get(target, prop) {
      if (prop === "then") return failedReply;
      return () => chain;
    }
  });
  const client = { from: () => chain, rpc: () => chain };
  const user = { id: "reader-1" };
  const context = {
    console,
    JSON, Math, Date, Number, String, Array, Object, Promise, Error, RegExp, Set, Map,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    navigator: { onLine: true },
    location: { pathname: "/reviews.html", search: "", href: "https://example.test/reviews.html" },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {},
    document: {
      readyState: "complete",
      body: permissiveElement("body"),
      getElementById: byId,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => permissiveElement(tag),
      addEventListener() {}
    },
    SiteNet: { classify: (err) => (err && err.status >= 500 ? "server" : "client") },
    ScrollAuth: { getClient: () => client, getUser: () => user, isModerator: () => false }
  };
  context.window = context;
  vm.runInNewContext(read("js/shared/reviews.js"), vm.createContext(context));
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  await settle();
  await settle();
  const status = byId("witness-status");
  assert.match(status.textContent, /trying again shortly/);
  const waits = [];
  for (let round = 0; round < 10; round += 1) {
    const ownTimer = timers.find((t) => !t.used && [10000, 20000, 40000, 60000].includes(t.ms));
    if (!ownTimer) break;
    ownTimer.used = true;
    waits.push(ownTimer.ms);
    ownTimer.fn();
    await settle();
    await settle();
  }
  assert.deepEqual(waits, [10000, 20000, 40000, 60000]);
  assert.match(status.textContent, /Reload the page to try again/);
  assert.doesNotMatch(status.textContent, /trying again shortly/);
  assert.equal(byId("witness-new-card").hidden, true, "the new-note card stays hidden");
});
