import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const store = {};
const keys = [];
const errors = [];
const opsReports = [];
let now = 1_000_000;
const realNow = Date.now;
Date.now = () => now;

// Capture timers so recordNote's 6-second debounce never stalls the run.
const timers = [];
global.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
global.clearTimeout = () => {};

global.localStorage = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key, value) => {
    if (!Object.prototype.hasOwnProperty.call(store, key)) keys.push(key);
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
    const i = keys.indexOf(key);
    if (i >= 0) keys.splice(i, 1);
  },
  get length() { return keys.length; },
  key: (i) => (i >= 0 && i < keys.length ? keys[i] : null)
};
global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

let upsertReply = { data: null, error: null };
let upsertReject = null;
let failNext = false;
const upserts = [];
const remoteRow = {
  user_id: "learner-1",
  notes: {},
  bookmarks: [],
  updated_at: "2026-01-01T00:00:00Z"
};

function copyRow() {
  return JSON.parse(JSON.stringify(remoteRow));
}

const mockClient = {
  from: (table) => {
    assert.strictEqual(table, "exhibit_study_data", "study sync must target exhibit_study_data");
    return {
      upsert: (row) => {
        upserts.push(row);
        if (upsertReject) { const e = upsertReject; upsertReject = null; return Promise.reject(e); }
        if (failNext) { failNext = false; return Promise.reject(new Error("Failed to fetch")); }
        if (upsertReply.error) return Promise.resolve(upsertReply);
        remoteRow.notes = row.notes;
        remoteRow.bookmarks = row.bookmarks;
        remoteRow.updated_at = row.updated_at;
        return Promise.resolve({ data: null, error: null });
      },
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: copyRow(), error: null })
        })
      })
    };
  }
};

global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  location: { search: "", href: "http://127.0.0.1/", pathname: "/", origin: "http://127.0.0.1" },
  addEventListener: () => {},
  dispatchEvent: () => {},
  SiteErrors: {
    show: (message) => { errors.push(message); },
    clear: () => { errors.length = 0; },
    current: () => errors[errors.length - 1] || ""
  },
  SiteOps: {
    report: (event, cause) => { opsReports.push({ event, cause }); }
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

new Function(fs.readFileSync(path.join(ROOT, "js/shared/study-sync.js"), "utf8"))();
const StudySync = global.window.StudySync;

// 1. recordNote writes local state plus a timestamp and queues a push.
StudySync.recordNote(3, "Head of gold is Neo-Babylon.");
assert.strictEqual(store["baNote-3"], "Head of gold is Neo-Babylon.");
const times = JSON.parse(store.baNoteTimes);
assert.ok(times["3"] > 0, "note timestamp recorded");

now += 10000;
await StudySync.pushNow();
assert.strictEqual(upserts.length, 1, "first push reaches the cloud");
assert.strictEqual(upserts[0].user_id, "learner-1");
assert.strictEqual(upserts[0].notes["3"].body, "Head of gold is Neo-Babylon.");
assert.strictEqual(upserts[0].bookmarks.length, 0);
assert.ok(store.baStudySyncOutbox === undefined, "successful push clears the outbox");

// 2. Bookmarks ride in the same row (stored as given; merge dedupes).
StudySync.recordBookmarks([3, 1, 3]);
assert.deepStrictEqual(JSON.parse(store.baStudyBookmarks), [3, 1, 3]);
now += 10000;
await StudySync.pushNow();
assert.deepStrictEqual(upserts[upserts.length - 1].bookmarks, [3, 1, 3]);

// 3. A failed push stays queued and retries out of the outbox.
StudySync.recordNote(3, "Updated note.");
now += 10000;
failNext = true;
await StudySync.pushNow();
assert.ok(store.baStudySyncOutbox, "failed push keeps the outbox");
assert.ok(errors.some((m) => m.includes("could not be saved")), "save miss is surfaced");
now += 10000;
await StudySync.retryNow();
assert.strictEqual(upserts[upserts.length - 1].notes["3"].body, "Updated note.", "retry delivers the queued payload");
assert.strictEqual(store.baStudySyncOutbox, undefined, "retry clears the outbox");

// 4. Pull-and-merge: remote newer note wins, local newer note wins, bookmarks union.
remoteRow.notes = {
  "3": { body: "Cloud edit for sheet 3.", updatedAt: now + 5000 },
  "7": { body: "Only on cloud.", updatedAt: now + 5000 }
};
remoteRow.bookmarks = [2, 5];
global.localStorage.setItem("baNote-1", "Local note for sheet 1.");
store.baNoteTimes = JSON.stringify({ "1": now + 9000, "3": now });
store.baStudyBookmarks = "[1]";
now += 10000;
await StudySync.pullAndMerge();
assert.strictEqual(store["baNote-3"], "Cloud edit for sheet 3.", "remote newer note wins");
assert.strictEqual(store["baNote-7"], "Only on cloud.", "cloud-only note lands locally");
assert.strictEqual(store["baNote-1"], "Local note for sheet 1.", "local newer note survives");
assert.deepStrictEqual(JSON.parse(store.baStudyBookmarks).sort(), [1, 2, 5], "bookmarks merged");
assert.strictEqual(upserts[upserts.length - 1].notes["1"].body, "Local note for sheet 1.", "local-new merge pushes back");

// 5. Pure merge payload: ties keep local; missing remote row keeps local.
const merged = StudySync.mergePayload(
  { notes: { "2": { body: "same time", updatedAt: 50 }, "4": { body: "local only", updatedAt: 10 } }, bookmarks: [1] },
  { notes: { "2": { body: "same time remote", updatedAt: 50 } }, bookmarks: [1, 2] }
);
assert.strictEqual(merged.notes["2"].body, "same time", "timestamp tie keeps local");
assert.strictEqual(merged.notes["4"].body, "local only", "local-only note preserved");
assert.deepStrictEqual(merged.bookmarks, [1, 2], "bookmarks union in merge");
assert.strictEqual(merged.localHadNew, true, "local-only note flags push");
assert.strictEqual(merged.remoteHadNew, true, "remote bookmark flags pull-write");

// 6. Account switch clears this device's notes before the cloud pull.
store.baStudySyncAccountId = "learner-9";
global.window.ScrollAuth.getUser = () => ({ id: "learner-2" });
remoteRow.user_id = "learner-2";
remoteRow.notes = { "0": { body: "Account B note.", updatedAt: now + 1000 } };
remoteRow.bookmarks = [];
now += 10000;
await StudySync.pullAndMerge();
assert.strictEqual(store["baNote-3"], undefined, "previous learner's note wiped on switch");
assert.strictEqual(store["baNote-0"], "Account B note.", "switching pulls the new account's note");
assert.strictEqual(store.baStudySyncAccountId, "learner-2");

// 7. Oversized payloads are refused without an outbox entry.
global.window.ScrollAuth.getUser = () => ({ id: "learner-1" });
remoteRow.user_id = "learner-1";
remoteRow.notes = {};
store.baStudySyncAccountId = "learner-1";
global.localStorage.setItem("baNote-2", "y".repeat(450000));
const before = upserts.length;
now += 10000;
await StudySync.pushNow();
assert.strictEqual(upserts.length, before, "oversized payload is not uploaded");
assert.strictEqual(store.baStudySyncOutbox, undefined, "oversized payload is not queued");

Date.now = realNow;
console.log("study sync: push, outbox retry, pull-merge, account switch, and size guard hold");
