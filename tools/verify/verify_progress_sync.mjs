import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const store = {};
const errors = [];
let now = 1_000_000;
const realNow = Date.now;
Date.now = () => now;

global.localStorage = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; }
};
global.sessionStorage = {
  getItem: () => "[]",
  setItem: () => {},
  removeItem: () => {}
};

const calls = [];
let failNext = false;
let failAlways = false;
let useRules = false;
const serverRow = {
  revision: 1,
  updatedAt: 0,
  lastSaveId: null,
  certificate_name: "Ada",
  cohort: "north",
  journey: { completedSheets: [2], sheet: 2, cohort: "north" },
  mastery: [2],
  workbench: {},
  telemetry: {}
};

function copyServerRow() {
  return JSON.parse(JSON.stringify(serverRow));
}

function ruledSave(args) {
  const payload = args.payload || {};
  if (JSON.stringify(payload).length > 65536) {
    return { data: null, error: { message: "payload_too_large" } };
  }
  const saveId = payload.save_id || null;
  if (saveId && saveId === serverRow.lastSaveId) {
    return { data: { status: "ok", revision: serverRow.revision, row: copyServerRow() }, error: null };
  }
  if (args.expected_revision != null && serverRow.revision !== args.expected_revision) {
    return { data: { status: "conflict", revision: serverRow.revision, row: copyServerRow() }, error: null };
  }
  if (now - serverRow.updatedAt < 6000) {
    return { data: null, error: { message: "rate_limit" } };
  }
  const name = String(payload.certificate_name || "").trim();
  const cohort = String(payload.cohort || "").trim();
  serverRow.revision += 1;
  serverRow.updatedAt = now;
  serverRow.lastSaveId = saveId;
  serverRow.journey = payload.journey || serverRow.journey;
  serverRow.mastery = payload.mastery || serverRow.mastery;
  serverRow.certificate_name = name || serverRow.certificate_name;
  serverRow.cohort = cohort || serverRow.cohort;
  return { data: { status: "ok", revision: serverRow.revision, row: copyServerRow() }, error: null };
}

const mockClient = {
  rpc: (_name, args) => {
    calls.push(args);
    if (failAlways) return Promise.reject(new Error("network"));
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error("network"));
    }
    if (useRules) return Promise.resolve(ruledSave(args));
    const revision = (args.expected_revision || 0) + 1;
    return Promise.resolve({ data: { status: "ok", revision: revision }, error: null });
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      })
    })
  })
};

global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  location: { search: "", href: "http://127.0.0.1/", pathname: "/", origin: "http://127.0.0.1" },
  addEventListener: () => {},
  SiteErrors: {
    show: (message) => { errors.push(message); },
    clear: () => { errors.length = 0; },
    current: () => errors[errors.length - 1] || ""
  },
  ScrollAuth: {
    getClient: () => mockClient,
    getUser: () => ({ id: "learner-1" }),
    ready: () => Promise.resolve(),
    onChange: () => {}
  }
};
global.document = { readyState: "loading", addEventListener: () => {} };
global.location = global.window.location;

new Function(fs.readFileSync(path.join(ROOT, "js/shared/journey.js"), "utf8"))();
new Function(fs.readFileSync(path.join(ROOT, "js/shared/progress-sync.js"), "utf8"))();

const ProgressSync = global.window.ProgressSync;
let row = {
  revision: 1,
  journey: { completedSheets: [], sheet: 0, cohort: "north" },
  mastery: [],
  workbench: {},
  telemetry: {},
  certificate_name: "Ada",
  cohort: "north"
};

function serverSave(expected, payload) {
  if (row.revision !== expected) {
    return { status: "conflict", revision: row.revision, row: JSON.parse(JSON.stringify(row)) };
  }
  row = Object.assign({}, row, payload, { revision: row.revision + 1 });
  return { status: "ok", revision: row.revision, row: JSON.parse(JSON.stringify(row)) };
}

function clientSave(payload, expected) {
  let revision = expected;
  let next = payload;
  for (let i = 0; i < 3; i += 1) {
    const result = serverSave(revision, next);
    if (result.status === "ok") return result;
    next = ProgressSync.mergeConflict(next, result.row);
    revision = result.revision;
  }
  throw new Error("conflict was not resolved");
}

clientSave({
  journey: { completedSheets: [2], sheet: 2, cohort: "north" },
  mastery: [2],
  workbench: {},
  telemetry: {},
  certificate_name: "Ada",
  cohort: "north"
}, 1);
clientSave({
  journey: { completedSheets: [4], sheet: 4, cohort: "" },
  mastery: [4],
  workbench: { 4: { read: true } },
  telemetry: { verifiedArtifacts: ["seal"] },
  certificate_name: "",
  cohort: ""
}, 1);

assert.deepStrictEqual(row.journey.completedSheets.slice().sort(), [2, 4]);
assert.strictEqual(row.certificate_name, "Ada");
assert.strictEqual(row.cohort, "north");
assert.strictEqual(row.workbench[4].read, true);

store.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1 });
failNext = true;
errors.length = 0;
await global.window.ProgressSync.pushNow();
assert.ok(store.baProgressOutbox, "a failed save stays queued");
assert.ok(errors.some((message) => message.includes("did not save")));
now += 10000;
await global.window.ProgressSync.pushNow();
assert.strictEqual(store.baProgressOutbox, undefined);

function saveAllowed(authUid) {
  if (!authUid) return "not_authenticated";
  return "ok";
}
assert.strictEqual(saveAllowed(null), "not_authenticated");
assert.strictEqual(saveAllowed("learner-1"), "ok");

now += 10000;
store.baJourney = JSON.stringify({ completedSheets: [4], sheet: 4, cohort: "" });
store.daniel_historicist_mastery = "[4]";
store.daniel_certificate_name = "";
delete store.baProgressOutbox;
serverRow.revision = 4;
serverRow.updatedAt = now;
serverRow.lastSaveId = null;
serverRow.certificate_name = "Ada";
serverRow.journey = { completedSheets: [2], sheet: 2, cohort: "north" };
useRules = true;
await global.window.ProgressSync.pushNow();
assert.ok(store.baProgressOutbox, "a conflict stays queued instead of writing again immediately");
const queued = JSON.parse(store.baProgressOutbox);
assert.deepStrictEqual(queued.payload.journey.completedSheets.slice().sort(), [2, 4]);
assert.strictEqual(queued.payload.certificate_name, "Ada");
now += 1000;
await global.window.ProgressSync.retryNow();
assert.strictEqual(serverRow.revision, 4, "the 6-second rule rejects the merged write");
now += 7000;
await global.window.ProgressSync.retryNow();
assert.deepStrictEqual(serverRow.journey.completedSheets.slice().sort(), [2, 4]);
assert.strictEqual(serverRow.certificate_name, "Ada");

const replayId = serverRow.lastSaveId;
const replayRevision = serverRow.revision;
store.baProgressOutbox = JSON.stringify({
  payload: calls[calls.length - 1].payload,
  expectedRevision: replayRevision
});
await global.window.ProgressSync.retryNow();
assert.strictEqual(serverRow.revision, replayRevision, "the same save id does not bump revision");
assert.strictEqual(serverRow.lastSaveId, replayId);

now += 10000;
store.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1, blob: "x".repeat(70000) });
store.daniel_historicist_mastery = "[1]";
const tooBigCalls = calls.length;
await global.window.ProgressSync.pushNow();
assert.strictEqual(calls.length, tooBigCalls + 1);
assert.strictEqual(global.window.ProgressSync.retryPending(), false, "an oversized payload is not retried");

useRules = false;
failAlways = true;
const retryCalls = calls.length;
for (let i = 0; i < 8; i += 1) await global.window.ProgressSync.retryNow();
assert.strictEqual(calls.length, retryCalls + 8);
assert.strictEqual(global.window.ProgressSync.retryPending(), false);
const stopped = calls.length;
await global.window.ProgressSync.retryNow();
assert.strictEqual(calls.length, stopped, "retries stop after 8");
failAlways = false;

now += 10000;
store.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1 });
store.daniel_historicist_mastery = "[1]";
await global.window.ProgressSync.pushNow();
const guarded = calls.length;
await global.window.ProgressSync.pushNow();
assert.strictEqual(calls.length, guarded, "a second push inside 6 seconds does not call");
assert.strictEqual(global.window.ProgressSync.retryPending(), true);
await global.window.ProgressSync.retryNow();
assert.ok(calls.length > guarded, "the timer retry is not dropped by the 6-second guard");

store.baJourney = "{";
const before = store.baJourney;
global.window.BAJourney.save({ sheet: 3 });
assert.strictEqual(store.baJourney, before, "damaged journey JSON is left unchanged");
assert.ok(errors.some((message) => message.includes("could not be read")));

store.daniel_historicist_mastery = "{";
const masteryBefore = store.daniel_historicist_mastery;
const callsBefore = calls.length;
await global.window.ProgressSync.pushNow();
assert.strictEqual(store.daniel_historicist_mastery, masteryBefore);
assert.strictEqual(calls.length, callsBefore, "damaged progress is not uploaded");

Date.now = realNow;
console.log("overlap merge, damaged save, and outbox retry hold");
