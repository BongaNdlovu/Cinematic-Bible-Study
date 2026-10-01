import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

console.log("\n========================================================");
console.log("  RUNNING VERIFICATION FOR PROGRESS SAVE & ERROR BANNER FIX");
console.log("========================================================\n");

// 1. In-memory storage & environment simulation
const localStore = {};
const sessionStore = {};
const errorsShown = [];
let simulatedTime = 1_000_000;

global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
  setItem: (k, v) => { localStore[k] = String(v); },
  removeItem: (k) => { delete localStore[k]; }
};

global.sessionStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionStore, k) ? sessionStore[k] : null),
  setItem: (k, v) => { sessionStore[k] = String(v); },
  removeItem: (k) => { delete sessionStore[k]; }
};

Date.now = () => simulatedTime;

let rpcHandler = null;
let fromHandler = null;

const mockClient = {
  rpc: (name, args) => {
    if (rpcHandler) return rpcHandler(name, args);
    return Promise.resolve({ data: { status: "ok", revision: 2 }, error: null });
  },
  from: (table) => {
    if (fromHandler) return fromHandler(table);
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { revision: 1 }, error: null })
        })
      })
    };
  }
};

let currentUser = { id: "learner-101" };

global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  location: { search: "", href: "http://127.0.0.1/study.html", pathname: "/study.html", origin: "http://127.0.0.1" },
  addEventListener: () => {},
  SiteOps: {
    report: () => {}
  },
  SiteErrors: {
    show: (msg, kind) => { errorsShown.push({ msg, kind }); },
    clear: () => { errorsShown.length = 0; },
    current: () => (errorsShown.length ? errorsShown[errorsShown.length - 1].msg : "")
  },
  ScrollAuth: {
    getClient: () => mockClient,
    getUser: () => currentUser,
    ready: () => Promise.resolve(),
    onChange: () => {}
  }
};

global.document = { readyState: "loading", addEventListener: () => {} };
global.location = global.window.location;

// Load journey & progress-sync
new Function(fs.readFileSync(path.join(ROOT, "js/shared/journey.js"), "utf8"))();
new Function(fs.readFileSync(path.join(ROOT, "js/shared/progress-sync.js"), "utf8"))();

const ProgressSync = global.window.ProgressSync;

console.log("Test 1: Normal successful save");
localStore.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1 });
rpcHandler = () => Promise.resolve({ data: { status: "ok", revision: 2 }, error: null });
await ProgressSync.pushNow();
assert.strictEqual(localStore.baProgressOutbox, undefined, "Outbox must be cleared on success");
assert.strictEqual(errorsShown.length, 0, "No errors should be shown on success");
assert.strictEqual(sessionStore.baLastPushAt, String(simulatedTime), "sessionStorage must record baLastPushAt");
console.log("✓ Normal save cleared outbox and recorded sessionStorage.baLastPushAt");

console.log("\nTest 2: Rate limit error is handled as temporary pacing without alarming banner");
simulatedTime += 10000;
localStore.baJourney = JSON.stringify({ completedSheets: [1, 2], sheet: 2 });
errorsShown.length = 0;
// Supabase throws rate_limit
rpcHandler = () => Promise.resolve({ data: null, error: { message: "rate_limit" } });
await ProgressSync.pushNow();
assert.ok(localStore.baProgressOutbox, "Payload must be kept in outbox during rate limit");
assert.strictEqual(ProgressSync.retryPending(), true, "Retry must be scheduled");
assert.strictEqual(
  errorsShown.filter(e => e.msg.includes("did not save")).length,
  0,
  "Rate limit must NOT flash the alarming 'Your progress did not save' banner before retries fail"
);
console.log("✓ Rate limit queued outbox and scheduled retry WITHOUT flashing false-alarm banner");

console.log("\nTest 3: Conflict is handled as temporary pacing without alarming banner");
simulatedTime += 10000;
localStore.baJourney = JSON.stringify({ completedSheets: [1, 2, 3], sheet: 3 });
delete localStore.baProgressOutbox;
errorsShown.length = 0;
rpcHandler = () => Promise.resolve({
  data: {
    status: "conflict",
    revision: 3,
    row: { revision: 3, journey: { completedSheets: [1, 2] } }
  },
  error: null
});
await ProgressSync.pushNow();
assert.ok(localStore.baProgressOutbox, "Merged payload kept in outbox on conflict");
assert.strictEqual(ProgressSync.retryPending(), true, "Retry must be scheduled on conflict");
assert.strictEqual(
  errorsShown.filter(e => e.msg.includes("did not save")).length,
  0,
  "Conflict must NOT flash alarming banner"
);
console.log("✓ Conflict resolved and queued retry WITHOUT flashing false-alarm banner");

console.log("\nTest 4: Unauthenticated (expired JWT) stops retries and clears outbox");
simulatedTime += 10000;
localStore.baJourney = JSON.stringify({ completedSheets: [1, 2], sheet: 2 });
localStore.baProgressOutbox = JSON.stringify({ payload: { test: 1 } });
errorsShown.length = 0;
rpcHandler = () => Promise.resolve({ data: null, error: { message: "not_authenticated", code: "401" } });
await ProgressSync.pushNow();
assert.strictEqual(localStore.baProgressOutbox, undefined, "Outbox must be cleared on not_authenticated");
assert.strictEqual(ProgressSync.retryPending(), false, "Retry must NOT be scheduled on not_authenticated");
assert.strictEqual(
  errorsShown.filter(e => e.msg.includes("did not save")).length,
  0,
  "Unauthenticated must not spam 'device will keep trying'"
);
console.log("✓ Unauthenticated error cleanly stopped retries and purged outbox");

console.log("\nTest 5: Exhausting all 8 retries DOES trigger SAVE_MISS banner");
simulatedTime += 10000;
localStore.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1 });
localStore.baProgressOutbox = JSON.stringify({ payload: { test: 1 } });
errorsShown.length = 0;
rpcHandler = () => Promise.resolve({ data: null, error: { message: "rate_limit" } });
// Run 8 retries
for (let i = 0; i < 8; i++) {
  simulatedTime += 10000;
  await ProgressSync.retryNow();
}
assert.strictEqual(ProgressSync.retryPending(), false, "Retries must stop after 8 attempts");
// 9th retry stops and reports max retries
await ProgressSync.retryNow();
assert.ok(
  errorsShown.some(e => e.msg.includes("did not save")),
  "SAVE_MISS must be shown once retries are completely exhausted"
);
console.log("✓ Exhausted retries correctly displayed SAVE_MISS banner as final fallback");

console.log("\nTest 6: sessionStorage baLastPushAt preservation across navigations");
// Simulate navigating to another page:
// In the previous page, a push happened at simulatedTime = 2,000,000
simulatedTime = 2_000_000;
sessionStore.baLastPushAt = String(simulatedTime);
// Fresh page load (progress-sync re-evaluates):
new Function(fs.readFileSync(path.join(ROOT, "js/shared/progress-sync.js"), "utf8"))();
const NavigatedSync = global.window.ProgressSync;
// 2 seconds later (within 6 second window):
simulatedTime = 2_002_000;
let callCount = 0;
rpcHandler = () => { callCount++; return Promise.resolve({ data: { status: "ok", revision: 5 } }); };
await NavigatedSync.pushNow();
assert.strictEqual(callCount, 0, "Push inside 6s window of previous page must NOT fire RPC call");
assert.strictEqual(NavigatedSync.retryPending(), true, "Retry must be queued for later");
console.log("✓ Push inside 6s window across page navigation was properly guarded");

console.log("\nTest 7: ScrollAuth.signOut() clears outbox, last push time, and error banner");
localStore.baProgressOutbox = "test-outbox";
sessionStore.baLastPushAt = "12345";

// Load actual auth.js
new Function(fs.readFileSync(path.join(ROOT, "js/shared/auth.js"), "utf8"))();

// Now simulate active save miss error banner
errorsShown.length = 0;
errorsShown.push({ msg: "Your progress did not save. This device will keep trying.", kind: "save" });
assert.strictEqual(global.window.SiteErrors.current().includes("did not save"), true);

global.window.ScrollAuth.signOut();
assert.strictEqual(localStore.baProgressOutbox, undefined, "signOut must clear baProgressOutbox");
assert.strictEqual(sessionStore.baLastPushAt, undefined, "signOut must clear baLastPushAt");
assert.strictEqual(global.window.SiteErrors.current(), "", "signOut must clear save miss error banner");
console.log("✓ ScrollAuth.signOut() successfully wiped outbox, session push time, and save banner");

console.log("\nTest 8: Dismissible error banner in errors.js");
// Create a fake DOM with body and elements to test paint and dismiss
const elements = {};
function makeElem(tag) {
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    children,
    dataset: {},
    classList: { toggle: () => {}, contains: () => false, add: () => {}, remove: () => {} },
    hidden: false,
    textContent: "",
    setAttribute: (k, v) => { el[k] = v; },
    getAttribute: (k) => el[k],
    removeAttribute: (k) => { delete el[k]; delete el.dataset[k]; },
    appendChild: (ch) => { children.push(ch); },
    replaceChildren: () => { children.length = 0; el.textContent = ""; },
    addEventListener: (evt, fn) => { el[`on_${evt}`] = fn; },
    click: () => { if (el.on_click) el.on_click(); }
  };
  return el;
}
global.document = {
  body: makeElem("body"),
  createElement: makeElem,
  getElementById: (id) => elements[id] || null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.document.body.appendChild = (child) => {
  if (child.id) elements[child.id] = child;
  document.body.children.push(child);
};

new Function(fs.readFileSync(path.join(ROOT, "js/shared/errors.js"), "utf8"))();
const SiteErrors = global.window.SiteErrors;

SiteErrors.show("Your progress did not save. This device will keep trying.", "save");
const bannerEl = global.document.getElementById("site-error-banner");
assert.ok(bannerEl, "site-error-banner should exist");
assert.strictEqual(bannerEl.hidden, false, "banner should not be hidden");
const closeBtn = bannerEl.children.find(ch => ch.className === "site-error-close");
assert.ok(closeBtn, "Close button must be present in the banner");
assert.strictEqual(closeBtn.textContent, "×", "Close button text should be ×");

// Click close button
closeBtn.click();
assert.strictEqual(bannerEl.hidden, true, "Banner should be hidden after dismiss click");
assert.strictEqual(SiteErrors.current(), "", "SiteErrors.current() should be empty after dismiss");
console.log("✓ Error banner rendered dismiss button and successfully dismissed on click");

console.log("\nTest 9: Cross-tab rate limit protection via localStorage.baLastPushAt");
// Tab A pushed at simulatedTime = 3,000,000
simulatedTime = 3_000_000;
localStore.baLastPushAt = String(simulatedTime);
localStore.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1 });
// Tab B has isolated empty sessionStorage:
delete sessionStore.baLastPushAt;
global.document.readyState = "loading";
global.window.ScrollAuth.getClient = () => mockClient;
global.window.ScrollAuth.getUser = () => ({ id: "learner-101" });
new Function(fs.readFileSync(path.join(ROOT, "js/shared/progress-sync.js"), "utf8"))();
const TabBSync = global.window.ProgressSync;
// 2 seconds later in Tab B (inside 6s window):
simulatedTime = 3_002_000;
let tabBCallCount = 0;
rpcHandler = () => { tabBCallCount++; return Promise.resolve({ data: { status: "ok", revision: 10 } }); };
await TabBSync.pushNow();
assert.strictEqual(tabBCallCount, 0, "Tab B must respect Tab A's push via localStorage and NOT fire RPC call");
assert.strictEqual(TabBSync.retryPending(), true, "Tab B must queue retry instead of hitting Postgres rate gate");
console.log("✓ Cross-tab rate limit collision prevented via shared localStorage.baLastPushAt");

console.log("\nTest 10: pullAndMerge with matching data does NOT schedule redundant syncNow");
simulatedTime = 4_000_000;
localStore.baJourney = JSON.stringify({ completedSheets: [1, 2], sheet: 2, cohort: "live" });
localStore.daniel_historicist_mastery = JSON.stringify([1, 2]);
localStore.daniel_workbench_v1 = JSON.stringify({ "1": { "q1": true } });
localStore.daniel_competency_telemetry_v1 = JSON.stringify({ verifiedArtifacts: ["art1"], scriptureLookups: ["Dan 1:1"] });
localStore.daniel_certificate_name = "Daniel";
delete localStore.baProgressOutbox;
fromHandler = () => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve({
        data: {
          revision: 7,
          journey: { completedSheets: [1, 2], sheet: 2, cohort: "live" },
          mastery: [1, 2],
          workbench: { "1": { "q1": true } },
          telemetry: { verifiedArtifacts: ["art1"], scriptureLookups: ["Dan 1:1"] },
          certificate_name: "Daniel"
        },
        error: null
      })
    })
  })
});
let syncFired = false;
rpcHandler = () => { syncFired = true; return Promise.resolve({ data: { status: "ok", revision: 8 } }); };
await TabBSync.pullAndMerge();
assert.strictEqual(localStore.baProgressOutbox, undefined, "No outbox should be created when client matches cloud");
console.log("✓ pullAndMerge with matching cloud data avoids redundant background write");

console.log("\nTest 11: pullAndMerge promise rejection with not_authenticated suppresses PULL_MISS");
errorsShown.length = 0;
fromHandler = () => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.reject(new Error("JWT expired: not_authenticated"))
    })
  })
});
await TabBSync.pullAndMerge();
assert.strictEqual(
  errorsShown.filter(e => e.msg.includes("could not be loaded")).length,
  0,
  "pullAndMerge catch rejection with not_authenticated must NOT flash PULL_MISS"
);
console.log("✓ pullAndMerge rejected promise with not_authenticated cleanly suppressed PULL_MISS");

console.log("\nTest 12: settleSave catch rejection correctly routed through errorCause");
simulatedTime = 5_000_000;
localStore.baJourney = JSON.stringify({ completedSheets: [1], sheet: 1 });
errorsShown.length = 0;
// Promise rejection with rate_limit
rpcHandler = () => Promise.reject(new Error("Postgres exception: rate_limit"));
await TabBSync.pushNow();
assert.strictEqual(
  errorsShown.filter(e => e.msg.includes("did not save")).length,
  0,
  "settleSave catch rejection with rate_limit must NOT flash alarming banner"
);
assert.strictEqual(TabBSync.retryPending(), true, "Retry must be scheduled on rate_limit rejection");
console.log("✓ settleSave rejected promise with rate_limit properly categorized without alarming banner");

console.log("\nTest 13: Successful save clears previous PULL_MISS error banner");
simulatedTime = 6_000_000;
SiteErrors.show("Your saved progress could not be loaded from the cloud. This device still has what it stored here.", "save");
assert.ok(global.window.SiteErrors.current().includes("could not be loaded"));
rpcHandler = () => Promise.resolve({ data: { status: "ok", revision: 15 }, error: null });
await TabBSync.pushNow();
assert.strictEqual(global.window.SiteErrors.current(), "", "Successful save must clear previous PULL_MISS error banner");
console.log("✓ Successful save cleared previous PULL_MISS error banner");

console.log("\n========================================================");
console.log("  ALL PROGRESS SAVE & ERROR BANNER CHECKS PASSED!");
console.log("========================================================\n");
