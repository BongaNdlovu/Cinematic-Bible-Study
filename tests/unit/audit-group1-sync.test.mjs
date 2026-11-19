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

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function sandbox({ storage, client, auth, journey }) {
  const ctx = {
    console, JSON, Math, Date, Number, String, Array, Object, Promise, URL, Set, Map, Error,
    setTimeout: () => 1,
    clearTimeout: () => {},
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
    ScrollAuth: { getClient: () => client, getUser: () => auth.user }
  };
  if (journey) ctx.BAJourney = journey;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/core/core.js"), ctx);
  return ctx;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

function studyClient(selects, upserts) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => selects.shift() }) }),
      upsert: (row) => { upserts.push(row); return Promise.resolve({ error: null }); }
    })
  };
}

test("a note typed while the push is reading the cloud is kept, and is what gets uploaded", async () => {
  const storage = memoryStorage({ "baNote-3": "old text", baNoteTimes: JSON.stringify({ 3: 1000 }), baStudySyncAccountId: "U" });
  const firstPull = Promise.resolve({ data: { notes: { 3: { body: "old text", updatedAt: 1000 } }, bookmarks: [] }, error: null });
  const slowSelect = deferred();
  const upserts = [];
  const auth = { user: { id: "U" } };
  const ctx = sandbox({ storage, client: studyClient([firstPull, slowSelect.promise], upserts), auth });
  vm.runInContext(read("js/features/study-sync.js"), ctx);
  await ctx.StudySync.pullAndMerge();
  await settle();
  storage.setItem("baStudySyncLastPushAt", "0");
  const push = ctx.StudySync.pushNow();
  await settle();
  storage.setItem("baNote-3", "new text typed during the read");
  storage.setItem("baNoteTimes", JSON.stringify({ 3: Date.now() + 1000 }));
  slowSelect.resolve({ data: { notes: {}, bookmarks: [] }, error: null });
  await push;
  await settle();
  assert.equal(storage.getItem("baNote-3"), "new text typed during the read");
  const sent = upserts[upserts.length - 1];
  assert.ok(sent, "an upload should happen");
  assert.equal(sent.notes[3].body, "new text typed during the read");
});

test("a push that finishes after the account changed writes nothing into the new account's device copy", async () => {
  const storage = memoryStorage({ "baNote-3": "A's note", baNoteTimes: JSON.stringify({ 3: 1000 }), baStudySyncAccountId: "A" });
  const slowSelect = deferred();
  const upserts = [];
  const auth = { user: { id: "A" } };
  const ctx = sandbox({ storage, client: studyClient([Promise.resolve({ data: { notes: { 3: { body: "A's note", updatedAt: 1000 } }, bookmarks: [] }, error: null }), slowSelect.promise], upserts), auth });
  vm.runInContext(read("js/features/study-sync.js"), ctx);
  await ctx.StudySync.pullAndMerge();
  await settle();
  storage.setItem("baStudySyncLastPushAt", "0");
  const push = ctx.StudySync.pushNow();
  await settle();
  auth.user = { id: "B" };
  storage.removeItem("baNote-3");
  slowSelect.resolve({ data: { notes: { 7: { body: "remote A note", updatedAt: 5 } }, bookmarks: [] }, error: null });
  await push;
  await settle();
  assert.equal(storage.getItem("baNote-7"), null, "A's cloud note must not land on B's device copy");
  assert.equal(upserts.length, 0, "nothing is uploaded for A after the switch");
});

test("signing out while the notes pull is running still counts the unsaved note as pending", async () => {
  const storage = memoryStorage({ "baNote-2": "draft", baNoteTimes: JSON.stringify({ 2: 1000 }), baStudySyncAccountId: "U" });
  const slowPull = deferred();
  const auth = { user: { id: "U" } };
  const ctx = sandbox({ storage, client: studyClient([slowPull.promise], []), auth });
  vm.runInContext(read("js/features/study-sync.js"), ctx);
  ctx.StudySync.pullAndMerge();
  ctx.StudySync.syncNow();
  assert.equal(ctx.StudySync.hasPending(), true);
  await ctx.StudySync.flushNow();
  assert.equal(ctx.StudySync.hasPending(), true, "the sign-out warning must still see the note");
  slowPull.resolve({ data: null, error: null });
  await settle();
});

test("signing out while the progress pull is running still counts unsent progress as pending", async () => {
  const storage = memoryStorage({
    baProgressAccountId: "U",
    daniel_workbench_v1: "{}",
    daniel_historicist_mastery: "[0]",
    daniel_competency_telemetry_v1: "{}",
    baJourney: JSON.stringify({ completedSheets: [0] })
  });
  const slowPull = deferred();
  const auth = { user: { id: "U" } };
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => slowPull.promise }) }) }),
    rpc: () => Promise.resolve({ data: { status: "ok", revision: 2 }, error: null })
  };
  const journey = {
    load: () => JSON.parse(storage.getItem("baJourney") || "{}"),
    save: (patch) => storage.setItem("baJourney", JSON.stringify(Object.assign(journey.load(), patch)))
  };
  const ctx = sandbox({ storage, client, auth, journey });
  vm.runInContext(read("js/features/progress-sync.js"), ctx);
  ctx.ProgressSync.pullAndMerge();
  ctx.ProgressSync.syncNow();
  assert.equal(ctx.ProgressSync.hasPending(), true);
  await ctx.ProgressSync.flushNow();
  assert.equal(ctx.ProgressSync.hasPending(), true, "the sign-out warning must still see the progress");
  assert.ok(storage.getItem("baProgressOutbox"), "the unsent progress is kept in the outbox");
  slowPull.resolve({ data: null, error: null });
  await settle();
});
