import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SRC = fs.readFileSync(new URL("../../js/shared/sentry.js", import.meta.url), "utf8");

function boot(hostname, consent) {
  const calls = { init: null, integrations: [] };
  const Sentry = {
    init: (opts) => { calls.init = opts; },
    browserTracingIntegration: () => { calls.integrations.push("tracing"); return "tracing"; },
    replayIntegration: () => { calls.integrations.push("replay"); return "replay"; },
    feedbackIntegration: (opts) => { calls.integrations.push("feedback"); calls.feedback = opts; return "feedback"; }
  };
  const store = consent ? { sodConsent: JSON.stringify({ v: 1, analytics: true }) } : {};
  const window = { Sentry };
  vm.runInNewContext(SRC, {
    window,
    location: { hostname },
    navigator: {},
    localStorage: { getItem: (k) => store[k] || null }
  });
  return calls;
}

for (const host of ["localhost", "127.0.0.1", "[::1]", "shelf.localhost"]) {
  test(`Sentry stays off on ${host}, so tests and local work use no quota`, () => {
    const calls = boot(host, true);
    assert.equal(calls.init, null);
    assert.deepEqual(calls.integrations, []);
  });
}

test("production samples one page load in ten and never records replays", () => {
  const calls = boot("cinematic-bible-study-daniel.pages.dev", true);
  assert.equal(calls.init.environment, "production");
  assert.equal(calls.init.tracesSampleRate, 0.1);
  assert.equal(calls.init.replaysSessionSampleRate, 0);
  assert.equal(calls.init.replaysOnErrorSampleRate, 0);
  assert.ok(!calls.integrations.includes("replay"));
});

test("feedback is offered only with analytics consent and asks for no name or email", () => {
  assert.ok(!boot("cinematic-bible-study-daniel.pages.dev", false).integrations.includes("feedback"));
  const calls = boot("cinematic-bible-study-daniel.pages.dev", true);
  assert.ok(calls.integrations.includes("feedback"));
  assert.equal(calls.feedback.showName, false);
  assert.equal(calls.feedback.showEmail, false);
});

test("the privacy page names Sentry and still promises no session replay", () => {
  const html = fs.readFileSync(new URL("../../privacy.html", import.meta.url), "utf8");
  assert.match(html, /Sentry \(error monitoring\)/);
  assert.match(html, /never records your screen or replays your session/);
  assert.match(html, /We do not record your screen and we do not replay your sessions/);
});

const OPS_SRC = fs.readFileSync(new URL("../../js/shared/ops.js", import.meta.url), "utf8");

function memoryStore(seed) {
  const data = Object.assign({}, seed);
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; }
  };
}

async function reportError(consent, localSeed) {
  const rows = [];
  const client = { from: () => ({ insert: (batch) => { rows.push(...batch); return Promise.resolve({ error: null }); } }) };
  const localStorage = memoryStore(localSeed);
  const sessionStorage = memoryStore();
  const window = {
    addEventListener: () => {},
    ScrollAuth: { getClient: () => client, getUser: () => null },
    SODConsent: { has: (kind) => consent && kind === "analytics" }
  };
  vm.runInNewContext(OPS_SRC, {
    window,
    localStorage,
    sessionStorage,
    location: { pathname: "/study.html" },
    crypto: { randomUUID: () => "11111111-2222-4333-8444-555555555555" },
    setInterval: () => 0
  });
  window.SiteOps.report("save_failed", "timeout");
  await window.SiteOps.flush();
  await new Promise((resolve) => setImmediate(resolve));
  return { rows, local: localStorage.data, session: sessionStorage.data };
}

test("without analytics consent an error report never creates baInsightsAnon and carries a visit-only baOpsAnon ID", async () => {
  const out = await reportError(false);
  assert.equal(out.rows.length, 1);
  assert.ok(!("baInsightsAnon" in out.local));
  assert.equal(out.session.baOpsAnon, "11111111-2222-4333-8444-555555555555");
  assert.equal(out.rows[0].anon_id, out.session.baOpsAnon);
  assert.ok(out.rows[0].anon_id.length <= 64);
});

test("without analytics consent an error report does not read a leftover baInsightsAnon", async () => {
  const out = await reportError(false, { baInsightsAnon: "left-over-id" });
  assert.equal(out.rows.length, 1);
  assert.notEqual(out.rows[0].anon_id, "left-over-id");
  assert.equal(out.rows[0].anon_id, out.session.baOpsAnon);
});

test("with analytics consent an error report uses baInsightsAnon and sets no baOpsAnon", async () => {
  const kept = await reportError(true, { baInsightsAnon: "existing-analytics-id" });
  assert.equal(kept.rows[0].anon_id, "existing-analytics-id");
  assert.ok(!("baOpsAnon" in kept.session));
  const fresh = await reportError(true);
  assert.equal(fresh.local.baInsightsAnon, "11111111-2222-4333-8444-555555555555");
  assert.equal(fresh.rows[0].anon_id, fresh.local.baInsightsAnon);
  assert.ok(!("baOpsAnon" in fresh.session));
});

test("the privacy page lists the visit-only error report ID", () => {
  const html = fs.readFileSync(new URL("../../privacy.html", import.meta.url), "utf8");
  assert.match(html, /baOpsQueue, baOpsAnon<\/td>/);
  assert.match(html, /a visit-only ID attached to error reports, removed when the tab closes/);
  assert.match(html, /An error report stored by the site also carries a visit ID, or your account ID if you are signed in/);
});

for (const rel of ["../../functions/_middleware.js", "../../workers/exhibit-rate-gate/src/index.js"]) {
  test(`${rel.replace("../../", "")} traces one request in ten`, () => {
    const src = fs.readFileSync(new URL(rel, import.meta.url), "utf8");
    const rates = [...src.matchAll(/tracesSampleRate:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    assert.ok(rates.length > 0);
    assert.deepEqual(rates.filter((r) => r !== 0.1), []);
  });
}

const SHARED = (name) => fs.readFileSync(new URL(`../../js/shared/${name}`, import.meta.url), "utf8");
const SIGN_OUT_SCRIPTS = ["journey.js", "auth.js", "progress-sync.js", "study-sync.js"].map(SHARED);
const SESSION_KEY = "sb-test-auth-token";
const LEARNER = { id: "learner-1", email: "reader@example.org" };
const CLOUD_ROW = {
  revision: 5,
  journey: { sheet: 4, pathSheet: 3, unlocked: ["gold"], completedSheets: [0, 1] },
  mastery: [0, 1],
  workbench: {},
  telemetry: {},
  certificate_name: "Reader One"
};

function listStore(seed) {
  const data = Object.assign({}, seed);
  return {
    data,
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] || null,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; }
  };
}

function fakeClock() {
  const clock = { now: 1_700_000_000_000, timers: [], seq: 0 };
  clock.setTimeout = (fn, ms) => {
    clock.seq += 1;
    clock.timers.push({ id: clock.seq, at: clock.now + (ms || 0), fn });
    return clock.seq;
  };
  clock.clearTimeout = (id) => { clock.timers = clock.timers.filter((t) => t.id !== id); };
  clock.settle = () => new Promise((resolve) => setImmediate(resolve));
  clock.advance = async (ms) => {
    const end = clock.now + ms;
    await clock.settle();
    for (;;) {
      const due = clock.timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      clock.timers = clock.timers.filter((t) => t !== due);
      clock.now = due.at;
      due.fn();
      await clock.settle();
    }
    clock.now = end;
    await clock.settle();
  };
  return clock;
}

function signOutStub(mode, emit, localStorage) {
  if (mode === "error") return () => Promise.resolve({ error: { message: "session could not be loaded" } });
  if (mode === "reject") return () => Promise.reject(new Error("lock acquire timed out"));
  return () => {
    localStorage.removeItem(SESSION_KEY);
    emit("SIGNED_OUT", null);
    return Promise.resolve({ error: null });
  };
}

async function signedInPage(mode) {
  const clock = fakeClock();
  const writes = [];
  const shown = [];
  const session = { user: LEARNER, access_token: "" };
  const localStorage = listStore({
    [SESSION_KEY]: JSON.stringify(session),
    baJourney: JSON.stringify(CLOUD_ROW.journey),
    daniel_historicist_mastery: "[0,1]",
    daniel_certificate_name: "Reader One",
    "baNote-3": "a private note",
    baNoteTimes: JSON.stringify({ 3: 1000 }),
    baStudyBookmarks: "[3]"
  });
  let authListener = () => {};
  const emit = (event, next) => authListener(event, next);
  let saves = 0;
  const saveReply = () => {
    saves += 1;
    if (saves % 2 === 1) return { data: { status: "conflict", revision: 5, row: CLOUD_ROW }, error: null };
    return { data: { status: "ok", revision: 6 }, error: null };
  };
  const table = (name) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({
      data: name === "exhibit_progress" ? CLOUD_ROW : { notes: { 3: { body: "a private note", updatedAt: 1000 } }, bookmarks: [3] },
      error: null
    }) }) }),
    upsert: (row) => { writes.push({ kind: "upsert", table: name, row }); return Promise.resolve({ error: null }); }
  });
  const client = {
    auth: {
      storageKey: SESSION_KEY,
      onAuthStateChange: (fn) => { authListener = fn; },
      getSession: () => Promise.resolve({ data: { session }, error: null }),
      signOut: signOutStub(mode, emit, localStorage)
    },
    rpc: (name, args) => {
      if (name !== "save_exhibit_progress") return Promise.resolve({ data: false, error: null });
      writes.push({ kind: "rpc", name, payload: args.payload });
      return Promise.resolve(saveReply());
    },
    from: table
  };
  const location = { hostname: "example.org", search: "", hash: "", pathname: "/account.html", href: "https://example.org/account.html" };
  const window = {
    localStorage,
    location,
    addEventListener: () => {},
    dispatchEvent: () => {},
    BAAuthConfig: { url: "https://example.supabase.co", publishableKey: "publishable" },
    supabase: { createClient: () => client },
    SiteErrors: { show: (msg, kind) => { shown.push({ msg, kind }); }, clear: () => {}, current: () => "" }
  };
  class ClockDate extends Date {
    static now() { return clock.now; }
  }
  const context = vm.createContext({
    window,
    document: { readyState: "complete", addEventListener: () => {}, querySelectorAll: () => [] },
    localStorage,
    sessionStorage: listStore(),
    location,
    history: { replaceState: () => {} },
    navigator: { onLine: true },
    URLSearchParams,
    URL,
    CustomEvent: function (type) { this.type = type; },
    Date: ClockDate,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout
  });
  SIGN_OUT_SCRIPTS.forEach((src) => vm.runInContext(src, context));
  await clock.advance(120_000);
  writes.length = 0;
  return { clock, writes, shown, session, emit, window, local: localStorage.data };
}

async function signOutAndWait(mode) {
  const page = await signedInPage(mode);
  assert.equal(page.window.ScrollAuth.getUser().id, LEARNER.id);
  assert.equal(page.local["baNote-3"], "a private note");
  page.result = await page.window.ScrollAuth.signOut();
  page.emit("TOKEN_REFRESHED", page.session);
  await page.clock.advance(300_000);
  return page;
}

function assertPersonalDataCleared(page) {
  const journey = JSON.parse(page.local.baJourney);
  assert.equal(journey.sheet, 0);
  assert.equal(journey.pathSheet, -1);
  assert.deepEqual(journey.completedSheets, []);
  assert.deepEqual(journey.unlocked, []);
  assert.equal(journey.identity, null);
  assert.equal(page.local.daniel_historicist_mastery, "[]");
  for (const key of ["daniel_certificate_name", "baNote-3", "baNoteTimes", "baStudyBookmarks", "baProgressOutbox", "baProgressAccountId", "baStudySyncAccountId"]) {
    assert.ok(!(key in page.local), `${key} should be removed`);
  }
}

test("a sign-out that resolves with an error still clears personal data and shows the reader signed out", async () => {
  const page = await signOutAndWait("error");
  assert.equal(page.result.error.message, "session could not be loaded");
  assertPersonalDataCleared(page);
  assert.equal(page.window.ScrollAuth.getUser(), null);
  assert.ok(!(SESSION_KEY in page.local));
  assert.equal(page.shown.filter((e) => e.kind === "auth").length, 1);
});

test("a sign-out that rejects still clears personal data and shows the reader signed out", async () => {
  const page = await signOutAndWait("reject");
  assert.equal(page.result.error.message, "lock acquire timed out");
  assertPersonalDataCleared(page);
  assert.equal(page.window.ScrollAuth.getUser(), null);
  assert.ok(!(SESSION_KEY in page.local));
  assert.equal(page.shown.filter((e) => e.kind === "auth").length, 1);
});

for (const mode of ["error", "reject"]) {
  test(`after a failed sign-out (${mode}) with the session still alive, no progress or study write follows the clearing`, async () => {
    const page = await signOutAndWait(mode);
    assert.deepEqual(page.writes.map((w) => `${w.kind}:${w.name || w.table}`), []);
    assert.deepEqual(page.clock.timers, []);
    assertPersonalDataCleared(page);
  });
}

test("a successful sign-out clears personal data and sends no write", async () => {
  const page = await signedInPage("ok");
  page.result = await page.window.ScrollAuth.signOut();
  await page.clock.advance(300_000);
  assert.equal(page.result.error, null);
  assertPersonalDataCleared(page);
  assert.equal(page.window.ScrollAuth.getUser(), null);
  assert.deepEqual(page.writes, []);
  assert.deepEqual(page.shown.filter((e) => e.kind === "auth"), []);
});
