import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (rel) => fs.readFileSync(new URL("../../" + rel, import.meta.url), "utf8");

function memoryStorage(seed) {
  const store = Object.assign({}, seed || {});
  return {
    store,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null
  };
}

function fakeElement(tag) {
  const el = {
    tagName: String(tag || "div").toUpperCase(),
    id: "",
    hidden: false,
    style: {},
    dataset: {},
    children: [],
    innerHTML: "",
    textContent: "",
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    click() { el.clicked = true; },
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {}
  };
  return el;
}

function fakeDocument() {
  const byId = new Map();
  const listeners = {};
  const register = (child) => { if (child && child.id) byId.set(child.id, child); return child; };
  const doc = {
    readyState: "loading",
    visibilityState: "visible",
    hidden: false,
    listeners,
    byId,
    body: Object.assign(fakeElement("body"), { appendChild: register }),
    head: Object.assign(fakeElement("head"), { appendChild: register }),
    documentElement: fakeElement("html"),
    createElement: (tag) => fakeElement(tag),
    getElementById(id) {
      if (byId.has(id)) return byId.get(id);
      if (id.startsWith("insight-pulse-")) return fakeElement("button");
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    removeEventListener() {}
  };
  return doc;
}

function sandbox(extra) {
  const ctx = Object.assign({
    console,
    JSON,
    Math,
    Date,
    Number,
    String,
    Array,
    Object,
    Promise,
    URL,
    Set,
    Map,
    Error,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    navigator: { onLine: true },
    history: { replaceState() {}, pushState() {}, back() {} },
    location: { href: "https://example.test/study.html", pathname: "/study.html", search: "", hash: "" }
  }, extra);
  ctx.window = ctx;
  return vm.createContext(ctx);
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("no pending pulse means no 'Sitting 0' card", () => {
  const document = fakeDocument();
  const ctx = sandbox({ document, localStorage: memoryStorage(), sessionStorage: memoryStorage() });
  vm.runInContext(read("js/shared/insights.js"), ctx);
  ctx.Insights.maybePulse(3);
  assert.equal(document.byId.has("insight-pulse"), false);
  assert.equal(ctx.localStorage.getItem("baPulseAsked"), null);
});

test("a real pending pulse for sitting 0 still shows", () => {
  const document = fakeDocument();
  const ctx = sandbox({ document, localStorage: memoryStorage(), sessionStorage: memoryStorage({ baPulsePending: "0" }) });
  vm.runInContext(read("js/shared/insights.js"), ctx);
  ctx.Insights.maybePulse(3);
  assert.equal(document.byId.has("insight-pulse"), true);
  assert.match(document.byId.get("insight-pulse").innerHTML, /Sitting 0 /);
});

test("an invite link without a sitting stores no sitting 0", () => {
  const document = fakeDocument();
  const ctx = sandbox({
    document,
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    SODConsent: { has: (kind) => kind === "analytics" },
    location: { href: "https://example.test/index.html?ref=abc123", pathname: "/index.html", search: "?ref=abc123", hash: "" }
  });
  vm.runInContext(read("js/shared/insights.js"), ctx);
  document.listeners.DOMContentLoaded.forEach((fn) => fn());
  assert.equal(ctx.localStorage.getItem("baReferredBy"), "abc123");
  assert.equal(ctx.localStorage.getItem("baReferredSitting"), null);
});

test("a failed survey frees its own slot, not another insert's", async () => {
  const document = fakeDocument();
  const replies = [{ error: { message: "denied" } }, { error: null }];
  const resolvers = [];
  const client = {
    from: () => ({ insert: () => new Promise((resolve) => resolvers.push(resolve)) })
  };
  const ctx = sandbox({
    document,
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    ScrollAuth: { getClient: () => client, getUser: () => null }
  });
  let clock = 5_000_000;
  ctx.Date = class extends Date { static now() { return clock; } };
  vm.runInContext(read("js/shared/insights.js"), ctx);
  const first = ctx.Insights.insertSurvey({ rating: 3 });
  clock += 1_000;
  const second = ctx.Insights.insertSurvey({ rating: 4 });
  const stamps = JSON.parse(ctx.localStorage.getItem("baSurveyTimes"));
  assert.equal(stamps.length, 2);
  resolvers[1](replies[1]);
  resolvers[0](replies[0]);
  assert.deepEqual({ ...(await first) }, { ok: false, reason: "error" });
  assert.deepEqual({ ...(await second) }, { ok: true });
  assert.deepEqual(JSON.parse(ctx.localStorage.getItem("baSurveyTimes")), [stamps[1]]);
});

function studySyncContext(storage, auth) {
  const remote = { A: null, B: null };
  const upserts = [];
  const client = {
    from: () => ({
      select: () => ({ eq: (col, uid) => ({ maybeSingle: () => Promise.resolve({ data: remote[uid], error: null }) }) }),
      upsert: (row) => {
        upserts.push(row);
        remote[row.user_id] = row;
        return { select: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }) };
      }
    })
  };
  const ctx = sandbox({
    document: fakeDocument(),
    localStorage: storage,
    sessionStorage: memoryStorage(),
    ScrollAuth: { getClient: () => client, getUser: () => auth.user }
  });
  vm.runInContext(read("js/shared/study-sync.js"), ctx);
  return { ctx, remote, upserts };
}

test("switching accounts keeps the previous account's unsaved notes and gives them back on its next sign-in", async () => {
  const storage = memoryStorage({
    baStudySyncAccountId: "A",
    baStudySyncOutbox: JSON.stringify({ pending: true, at: 1 }),
    "baNote-2": "unsaved thought",
    baNoteTimes: JSON.stringify({ 2: 1_700_000_000_000 })
  });
  const auth = { user: { id: "B" } };
  const { ctx } = studySyncContext(storage, auth);

  await ctx.StudySync.pullAndMerge();
  await settle();
  assert.equal(storage.getItem("baNote-2"), null, "account B must not see account A's note");
  assert.equal(storage.getItem("baStudySyncOutbox"), null, "A's outbox must not be pushed to B");
  const stash = JSON.parse(storage.getItem("baStudySyncStash:A"));
  assert.equal(stash.notes[2].body, "unsaved thought");

  auth.user = { id: "A" };
  await ctx.StudySync.pullAndMerge();
  await settle();
  assert.equal(storage.getItem("baNote-2"), "unsaved thought");
  assert.equal(storage.getItem("baStudySyncStash:A"), null);
});

test("switching accounts parks unsaved progress for its owner instead of pushing it to the new account", async () => {
  const storage = memoryStorage({
    baProgressAccountId: "A",
    baProgressOutbox: JSON.stringify({ payload: { workbench: { 4: { proof: true } } }, expectedRevision: 2 }),
    daniel_workbench_v1: JSON.stringify({ 4: { proof: true } }),
    daniel_historicist_mastery: "[]",
    daniel_competency_telemetry_v1: "{}",
    baJourney: JSON.stringify({ completedSheets: [] })
  });
  const rows = { A: { user_id: "A", revision: 3, journey: { completedSheets: [] }, workbench: {}, telemetry: {} }, B: null };
  const saves = [];
  const auth = { user: { id: "B" } };
  const client = {
    from: () => ({ select: () => ({ eq: (col, uid) => ({ maybeSingle: () => Promise.resolve({ data: rows[uid], error: null }) }) }) }),
    rpc: (name, args) => { saves.push({ user: auth.user.id, args }); return Promise.resolve({ data: { status: "ok", revision: 9 }, error: null }); }
  };
  const journey = {
    load: () => JSON.parse(storage.getItem("baJourney") || "{}"),
    save: (patch) => storage.setItem("baJourney", JSON.stringify(Object.assign(journey.load(), patch)))
  };
  const ctx = sandbox({
    document: fakeDocument(),
    localStorage: storage,
    sessionStorage: memoryStorage(),
    BAJourney: journey,
    ScrollAuth: { getClient: () => client, getUser: () => auth.user }
  });
  vm.runInContext(read("js/shared/progress-sync.js"), ctx);

  await ctx.ProgressSync.pullAndMerge();
  await settle();
  assert.equal(storage.getItem("baProgressOutbox"), null, "A's outbox must not be retried against B");
  assert.deepEqual(JSON.parse(storage.getItem("daniel_workbench_v1")), {});
  assert.deepEqual(JSON.parse(storage.getItem("baProgressStash:A")).workbench, { 4: { proof: true } });
  assert.equal(saves.filter((s) => s.user === "B" && JSON.stringify(s.args).includes("proof")).length, 0);

  auth.user = { id: "A" };
  await ctx.ProgressSync.pullAndMerge();
  await settle();
  assert.deepEqual(JSON.parse(storage.getItem("daniel_workbench_v1"))[4], { proof: true });
  assert.equal(storage.getItem("baProgressStash:A"), null);
});

function competencyContext(seed) {
  const document = fakeDocument();
  const made = [];
  document.createElement = (tag) => { const el = fakeElement(tag); made.push(el); return el; };
  const blobs = [];
  const ctx = sandbox({
    document,
    localStorage: memoryStorage(seed),
    Blob: function Blob(parts) { blobs.push(parts.join("")); },
    URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} }
  });
  vm.runInContext(read("js/study/competency.js"), ctx);
  return { ctx, made, blobs };
}

test("a passage header with HTML entities is counted once, however it was stored", () => {
  const { ctx } = competencyContext({
    daniel_competency_telemetry_v1: JSON.stringify({ scriptureLookups: ["Daniel 1:1-21 &bull; Babylon, 605 B.C."] })
  });
  ctx.StudyCompetency.recordScriptureLookup("Daniel 1:1-21 • Babylon, 605 B.C.");
  assert.deepEqual(Array.from(ctx.StudyCompetency.getTelemetry().scriptureLookups), ["Daniel 1:1-21 • Babylon, 605 B.C."]);
});

test("export still downloads a backup when one saved value is damaged", () => {
  const { ctx, made, blobs } = competencyContext({
    baJourney: "{\"completedSheets\":[1,2]",
    daniel_workbench_v1: JSON.stringify({ 1: { a: true } })
  });
  assert.doesNotThrow(() => ctx.StudyCompetency.exportProgress());
  assert.equal(made.some((el) => el.tagName === "A" && el.clicked), true);
  const backup = JSON.parse(blobs[0]);
  assert.equal("baJourney" in backup, false, "a damaged value is left out, not replaced with an empty one");
  assert.deepEqual(backup.daniel_workbench_v1, { 1: { a: true } });
  assert.deepEqual(backup.unreadable, ["baJourney"]);
});
