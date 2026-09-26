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
const mockClient = {
  rpc: (_name, args) => {
    calls.push(args);
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error("network"));
    }
    const revision = (args.expected_revision || 0) + 1;
    return Promise.resolve({ data: { status: "ok", revision: revision }, error: null });
  }
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
