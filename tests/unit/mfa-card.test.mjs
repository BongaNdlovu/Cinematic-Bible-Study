import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SRC = fs.readFileSync(new URL("../../js/shared/mfa.js", import.meta.url), "utf8");

function el(hidden) {
  return { hidden, textContent: "", value: "", addEventListener() {}, focus() {} };
}

async function mount({ rpc, user = { id: "u1" }, factors = [] }) {
  const nodes = {
    "account-mfa": el(true), "account-mfa-note": el(true), "account-mfa-secret": el(true),
    "account-mfa-form": el(true), "account-mfa-start": el(false), "account-mfa-code": el(false)
  };
  const calls = [];
  const db = {
    rpc(name) {
      calls.push(name);
      return typeof rpc === "function" ? rpc() : Promise.resolve(rpc);
    },
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: () => Promise.resolve({ data: { currentLevel: "aal1", nextLevel: factors.length ? "aal2" : "aal1" } }),
        listFactors: () => Promise.resolve({ data: { totp: factors, all: factors } }),
        challenge: () => Promise.resolve({ data: { id: "ch1" } })
      }
    }
  };
  const window = {
    ScrollAuth: { getClient: () => db, getUser: () => user, onChange() {}, ready: () => Promise.resolve() }
  };
  const document = { readyState: "complete", getElementById: (id) => nodes[id] || null, addEventListener() {} };
  vm.runInNewContext(SRC, { window, document, Promise });
  await new Promise((r) => setTimeout(r, 20));
  return { nodes, calls, shown: nodes["account-mfa"].hidden === false, note: nodes["account-mfa-note"].textContent };
}

test("a moderator-list account sees the card", async () => {
  const r = await mount({ rpc: { data: true, error: null } });
  assert.equal(r.shown, true);
  assert.deepEqual(r.calls, ["exhibit_shows_authenticator"]);
  assert.doesNotMatch(r.note, /operator|moderator/i);
});

test("a moderator with a factor is asked for the code", async () => {
  const r = await mount({ rpc: { data: true, error: null }, factors: [{ id: "f1", status: "verified", factor_type: "totp" }] });
  assert.equal(r.shown, true);
  assert.equal(r.nodes["account-mfa-form"].hidden, false);
});

for (const [name, rpc] of [
  ["a reader", { data: false, error: null }],
  ["an rpc error", { data: null, error: { message: "missing" } }],
  ["a network failure", () => Promise.reject(new Error("net"))],
  ["a non-boolean answer", { data: "true", error: null }]
]) {
  test(`${name} keeps the card hidden`, async () => {
    const r = await mount({ rpc });
    assert.equal(r.shown, false);
    assert.equal(r.note, "");
  });
}

test("a signed-out visitor never triggers the check", async () => {
  const r = await mount({ rpc: { data: true, error: null }, user: null });
  assert.equal(r.shown, false);
  assert.deepEqual(r.calls, []);
});

const read = (file) => fs.readFileSync(new URL("../../" + file, import.meta.url), "utf8");
const idleTimers = { setTimeout: () => ({ unref() {} }), clearTimeout() {} };
const settle = () => new Promise((r) => setTimeout(r, 20));

function memoryStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  return {
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); }
  };
}

test("a wrong authenticator code during setup keeps the code form open", async () => {
  const handlers = {};
  const nodes = {};
  for (const [id, hidden] of [["account-mfa", true], ["account-mfa-note", true], ["account-mfa-secret", true], ["account-mfa-form", true], ["account-mfa-start", false], ["account-mfa-code", false]]) {
    nodes[id] = { hidden, textContent: "", value: "", focus() {}, addEventListener(type, fn) { handlers[id + ":" + type] = fn; } };
  }
  const db = {
    rpc: () => Promise.resolve({ data: true, error: null }),
    auth: {
      getSession: () => Promise.resolve({ data: {} }),
      mfa: {
        getAuthenticatorAssuranceLevel: () => Promise.resolve({ data: { currentLevel: "aal1", nextLevel: "aal1" } }),
        listFactors: () => Promise.resolve({ data: { totp: [], all: [] } }),
        enroll: () => Promise.resolve({ data: { id: "f1", totp: { secret: "SECRET" } } }),
        challenge: () => Promise.resolve({ data: { id: "ch1" } }),
        verify: () => Promise.resolve({ error: { message: "invalid code" } })
      }
    }
  };
  const window = { ScrollAuth: { getClient: () => db, getUser: () => ({ id: "u1" }), onChange() {}, ready: () => Promise.resolve() } };
  const document = { readyState: "complete", getElementById: (id) => nodes[id] || null, addEventListener() {} };
  vm.runInNewContext(SRC, { window, document, Promise });
  await settle();
  handlers["account-mfa-start:click"]();
  await settle();
  nodes["account-mfa-code"].value = "123456";
  handlers["account-mfa-form:submit"]({ preventDefault() {} });
  await settle();
  assert.equal(nodes["account-mfa-form"].hidden, false);
  assert.equal(nodes["account-mfa-note"].textContent, "That code was not accepted.");
});

test("loading saved progress does not queue a cloud save when nothing changed", async () => {
  const remote = { journey: { completedSheets: [1] }, mastery: [1], workbench: {}, telemetry: {}, revision: 3 };
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: remote, error: null }) }) }) }) };
  const window = {
    addEventListener() {},
    ScrollAuth: { getClient: () => db, getUser: () => ({ id: "u1" }), ready: () => new Promise(() => {}), onChange() {} },
    BAJourney: { load: () => ({ completedSheets: [1] }), save: () => { window.ProgressSync.syncNow(); return {}; } }
  };
  const localStorage = memoryStorage({ daniel_historicist_mastery: "[1]", daniel_workbench_v1: "{}", daniel_competency_telemetry_v1: "{}", baProgressAccountId: "u1" });
  vm.runInNewContext(read("js/shared/progress-sync.js"), { window, localStorage, sessionStorage: memoryStorage(), document: { readyState: "complete" }, ...idleTimers });
  await window.ProgressSync.pullAndMerge();
  assert.equal(window.ProgressSync.hasPending(), false);
});

test("a notes save keeps a newer note another device saved since the last load", async () => {
  let server = { notes: { "3": { body: "A", updatedAt: 1 } }, bookmarks: [] };
  const db = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: JSON.parse(JSON.stringify(server)), error: null }) }) }),
      upsert: (row) => { server = { notes: row.notes, bookmarks: row.bookmarks }; return Promise.resolve({ error: null }); }
    })
  };
  const window = { addEventListener() {}, ScrollAuth: { getClient: () => db, getUser: () => ({ id: "u1" }), ready: () => new Promise(() => {}), onChange() {} } };
  vm.runInNewContext(read("js/shared/study-sync.js"), { window, localStorage: memoryStorage(), document: { readyState: "complete" }, ...idleTimers });
  await window.StudySync.pullAndMerge();
  server = { notes: { "3": { body: "B", updatedAt: 5 } }, bookmarks: [] };
  window.StudySync.recordNote(5, "mine");
  await window.StudySync.flushNow();
  assert.equal(server.notes["3"].body, "B");
});

const bible = { ok: true, status: 200, json: () => Promise.resolve({ books: { Daniel: { "2": { "38": "Thou art this head of gold." } } } }) };

function scripture(window, fetch) {
  vm.runInNewContext(read("js/study/scripture.js"), { window, fetch, localStorage: memoryStorage() });
  return window.BAScripture;
}

test("scripture retries its files after a failed load", async () => {
  const asked = [];
  const fetch = (url) => { asked.push(url); return asked.length === 1 ? Promise.reject(new Error("Failed to fetch")) : Promise.resolve(bible); };
  const s = scripture({}, fetch);
  await s.whenReady();
  await s.whenReady();
  assert.equal(asked.filter((u) => u === "bible/kjv.json").length, 2);
});

test("scripture files load through the site network gateway", async () => {
  const asked = [];
  const s = scripture({ SiteNet: { request: (url) => { asked.push(url); return Promise.resolve(bible); } } }, () => Promise.reject(new Error("raw fetch used")));
  await s.whenReady();
  assert.deepEqual(asked.sort(), ["bible/kjv.json", "bible/sheet-passages.json", "bible/strongs-daniel.json"]);
});

test("the learner profile charts are labelled with the question each one counts", () => {
  const pairs = {};
  for (const m of read("js/insights/insights.js").matchAll(/sub\('([^']+)'\) \+ barList\(countBy\(profs, function \(p\) \{ return p\.(\w+); \}\)\)/g)) pairs[m[2]] = m[1];
  assert.deepEqual(pairs, { study_mode: "How they study", found_via: "How they found the site", background: "Background" });
});

test("a timed-out Supabase request is classified as a timeout", () => {
  const window = {};
  vm.runInNewContext(read("js/shared/net.js"), { window, navigator: { onLine: true } });
  assert.equal(window.SiteNet.classify({ message: "TimeoutError: signal timed out", code: "" }), "timeout");
});

test("a failed map tile keeps its own source instead of the image plate", () => {
  let onImageError = null;
  class HTMLImageElement {
    constructor(cls) { this.cls = cls; this.dataset = {}; this.src = "tile.png"; this.classList = { contains: (c) => c === cls, add() {} }; }
    getAttribute() { return this.src; }
    hasAttribute() { return false; }
  }
  const document = { readyState: "complete", body: null, addEventListener: (type, fn, capture) => { if (type === "error" && capture) onImageError = fn; } };
  vm.runInNewContext(read("js/shared/errors.js"), { window: { addEventListener() {} }, document, navigator: { onLine: true }, HTMLImageElement });
  const tile = new HTMLImageElement("leaflet-tile");
  onImageError({ target: tile });
  assert.equal(tile.src, "tile.png");
});
