/* Regression coverage for the 19 November audit follow-ups. Each test pins one
   audited fix in a pure Node vm sandbox — no network, no browser, fast enough
   for the unit gate. Complements the browser checks in verify_audit_followups. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (rel) => fs.readFileSync(new URL("../../" + rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const settle = async () => { for (let i = 0; i < 5; i += 1) await tick(); };

function memoryStorage(seed) {
  const store = Object.assign({}, seed || {});
  return {
    store,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
}

function makeContext({ location, document }) {
  const ctx = {
    console, JSON, Math, Date, Number, String, Array, Object, Promise, Error,
    URL, URLSearchParams: globalThis.URLSearchParams, Intl: globalThis.Intl,
    AbortController: globalThis.AbortController, atob: globalThis.atob,
    setTimeout: () => 0,
    clearTimeout: () => {},
    navigator: { onLine: true },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    history: { replaceState() {} },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    location,
    document: document || {
      readyState: "loading",
      addEventListener() {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    }
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  return ctx;
}

function authSandbox(rpcImpl) {
  let stateHandler = null;
  let rpcCalls = 0;
  const session = { user: { id: "u1", email: "one@example.test" }, access_token: "t1" };
  const client = {
    rpc: () => {
      rpcCalls += 1;
      return Promise.resolve(rpcImpl());
    },
    auth: {
      storageKey: "ba-auth-test",
      onAuthStateChange: (fn) => { stateHandler = fn; },
      getSession: () => Promise.resolve({ data: { session }, error: null }),
      signOut: () => Promise.resolve({ error: { message: "sign-out failed" } })
    }
  };
  const ctx = makeContext({
    location: { href: "https://example.test/account.html", pathname: "/account.html", search: "", hash: "", hostname: "example.test" }
  });
  ctx.BAAuthConfig = { url: "https://supabase.test", publishableKey: "pk-test" };
  ctx.supabase = { createClient: () => client };
  ctx.BAJourney = { save: () => {}, commitPendingTerms: () => {} };
  vm.runInContext(read("js/core/core.js"), ctx);
  vm.runInContext(read("js/core/auth.js"), ctx);
  const emit = (event, nextSession) => stateHandler(event, nextSession);
  return { ctx, emit, rpcCalls: () => rpcCalls };
}

test("sign-out swallows a stale token refresh until a fresh sign-in", async () => {
  const { ctx, emit } = authSandbox(() => ({ data: false, error: null }));
  const auth = ctx.window.ScrollAuth;
  await auth.ready();
  assert.equal(auth.getUser().id, "u1");
  await auth.signOut({ discard: true });
  assert.equal(auth.getUser(), null);
  emit("TOKEN_REFRESHED", { user: { id: "u1" }, access_token: "t-stale" });
  await settle();
  assert.equal(auth.getUser(), null, "a post-sign-out TOKEN_REFRESHED must not resurrect the session");
  emit("SIGNED_IN", { user: { id: "u2", email: "two@example.test" }, access_token: "t2" });
  await settle();
  assert.equal(auth.getUser().id, "u2", "a fresh SIGNED_IN clears the ended-session latch");
});

test("MFA verification re-asks the database who is a moderator", async () => {
  let answer = { data: false, error: null };
  const { ctx, emit, rpcCalls } = authSandbox(() => answer);
  const auth = ctx.window.ScrollAuth;
  await auth.ready();
  assert.equal(rpcCalls(), 1);
  const seen = [];
  auth.onChange((u) => seen.push(u && u.id));
  answer = { data: true, error: null };
  emit("MFA_CHALLENGE_VERIFIED", { user: { id: "u1" }, access_token: "t1" });
  await settle();
  assert.equal(rpcCalls(), 2, "the moderator rpc runs again for the unchanged user");
  assert.equal(auth.isModerator(), true);
  assert.deepEqual(seen, ["u1"]);
});

test("an MFA second step holds the ?next redirect until the stronger level is reached", async () => {
  let stateHandler = null;
  let mfaLevel = { nextLevel: "aal2", currentLevel: "aal1" };
  const session = { user: { id: "u1", email: "one@example.test" }, access_token: "t1" };
  const client = {
    auth: {
      onAuthStateChange: (fn) => { stateHandler = fn; },
      getSession: () => Promise.resolve({ data: { session }, error: null }),
      mfa: { getAuthenticatorAssuranceLevel: () => Promise.resolve({ data: mfaLevel, error: null }) }
    }
  };
  const hub = { dataset: {}, hidden: false };
  const ctx = makeContext({
    location: {
      href: "https://example.test/account.html?next=/insights.html",
      pathname: "/account.html",
      search: "?next=/insights.html",
      hash: "",
      hostname: "example.test"
    },
    document: {
      readyState: "complete",
      addEventListener() {},
      getElementById: (id) => (id === "account-hub" ? hub : null),
      querySelector: () => null,
      querySelectorAll: () => []
    }
  });
  ctx.BAAuthConfig = { url: "https://supabase.test", publishableKey: "pk-test" };
  ctx.supabase = { createClient: () => client };
  ctx.BAJourney = { save: () => {}, hasPendingTerms: () => false };
  const continues = [];
  ctx.ScrollTerms = {
    hasAgreed: () => true,
    sameOriginPath: (p) => p,
    rememberNext: () => {},
    continueIfReady: () => { continues.push(1); },
    syncLock: () => {}
  };
  vm.runInContext(read("js/core/core.js"), ctx);
  vm.runInContext(read("js/core/auth.js"), ctx);
  vm.runInContext(read("js/pages/account/account.js"), ctx);
  await ctx.window.ScrollAuth.ready();
  await settle();
  assert.equal(continues.length, 0, "aal1 below aal2 must hold the redirect");
  mfaLevel = { nextLevel: "aal2", currentLevel: "aal2" };
  stateHandler("MFA_CHALLENGE_VERIFIED", { user: { id: "u1" }, access_token: "t1" });
  await settle();
  assert.equal(continues.length, 1, "reaching aal2 releases the redirect exactly once");
});

test("blank and boolean NPS answers never reach the NPS tile", () => {
  const grid = { innerHTML: "", querySelectorAll: () => [], querySelector: () => null };
  const ctx = makeContext({
    location: { href: "https://example.test/insights.html", pathname: "/insights.html", search: "", hash: "" },
    document: {
      readyState: "loading",
      addEventListener() {},
      getElementById: (id) => (id === "insights-grid" ? grid : null),
      querySelector: () => null,
      querySelectorAll: () => []
    }
  });
  vm.runInContext(read("js/core/core.js"), ctx);
  vm.runInContext(read("js/pages/dashboard/dashboard-format.js"), ctx);
  vm.runInContext(read("js/pages/dashboard/dashboard-data.js"), ctx);
  vm.runInContext(read("js/pages/dashboard/dashboard.js"), ctx);
  const now = new Date().toISOString();
  const exit = (nps) => ({ created_at: now, responses: { kind: "exit", nps } });
  const blankCache = { events: [], profiles: [], progress: [], graduates: null, participation: null, capped: [] };
  const dash = ctx.window.InsightsDashboard;
  dash.setCache(Object.assign({}, blankCache, {
    surveys: [exit(undefined), exit(null), exit(""), exit("   "), exit(false), exit(10), exit(0)]
  }));
  dash.render();
  assert.match(grid.innerHTML, /insights-tile-label">NPS<\/p><p class="insights-tile-value">0<\/p><p class="insights-tile-detail">2 scores<\/p>/);
  dash.setCache(Object.assign({}, blankCache, { surveys: [exit(""), exit("  ")] }));
  dash.render();
  assert.match(grid.innerHTML, /insights-tile-label">NPS<\/p><p class="insights-tile-value">—<\/p><p class="insights-tile-detail">no scores yet<\/p>/);
});

function mapSandbox(fetchImpl) {
  const ctx = makeContext({
    location: { href: "https://example.test/map.html", pathname: "/map.html", search: "", hash: "" }
  });
  ctx.fetch = fetchImpl;
  ctx.MAP_CHRONICLE = { epochs: [] };
  ctx.MapRender = { BASE_STORE: "cmap-base", el: () => null, epochById: () => null, iconSrc: () => "" };
  vm.runInContext(read("js/core/core.js"), ctx);
  vm.runInContext(read("js/core/net.js"), ctx);
  vm.runInContext(read("js/pages/map/map-dom.js"), ctx);
  return ctx;
}

test("the map chronicle falls back to .json only on a 404", async () => {
  const calls = [];
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body)
  });
  const okCtx = mapSandbox((url) => {
    calls.push(url);
    return url.endsWith(".geojson") ? Promise.resolve(reply(404, {})) : Promise.resolve(reply(200, { loaded: "json" }));
  });
  const out = await okCtx.window.MapDom.loadJson("https://example.test/chronicle.geojson");
  assert.deepEqual(out, { loaded: "json" });
  assert.equal(calls.length, 2, "a 404 geojson is retried once against .json");
  assert.ok(calls[0].endsWith(".geojson") && calls[1].endsWith(".json"));

  calls.length = 0;
  const serverCtx = mapSandbox((url) => { calls.push(url); return Promise.resolve(reply(500, {})); });
  await assert.rejects(
    () => serverCtx.window.MapDom.loadJson("https://example.test/chronicle.geojson"),
    (err) => err.status === 500
  );
  assert.equal(calls.length, 1, "a server error stops after the first fetch");

  calls.length = 0;
  const netCtx = mapSandbox(() => { calls.push(1); return Promise.reject(new TypeError("Failed to fetch")); });
  await assert.rejects(
    () => netCtx.window.MapDom.loadJson("https://example.test/chronicle.geojson"),
    (err) => err.kind === "network"
  );
  assert.equal(calls.length, 1, "a network drop stops after the first fetch");
});

test("the weather scene maps a half-scale buffer onto the full view", () => {
  const frames = [];
  const calls = { setTransform: [], clearRect: [] };
  const grad = { addColorStop() {} };
  const noop = () => {};
  const ctx = makeContext({
    location: { href: "https://example.test/study.html", pathname: "/study.html", search: "", hash: "" }
  });
  ctx.performance = { now: () => 12345 };
  ctx.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  ctx.cancelAnimationFrame = noop;
  ctx.canvas2d = {
    setTransform: (...a) => calls.setTransform.push(a),
    clearRect: (...a) => calls.clearRect.push(a),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    fillRect: noop, save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, arc: noop, ellipse: noop, fill: noop, moveTo: noop, lineTo: noop, stroke: noop
  };
  vm.runInContext(read("js/pages/study/weather-scene.js"), ctx);
  const canvas = { width: 0, height: 0, getContext: () => ctx.canvas2d };
  const scene = ctx.window.WeatherScene.create(canvas);
  ctx.window.WeatherScene.apply(scene, {
    size: [720, 450, 1440, 900],
    state: { type: "quiet", atmosphere: 0, light: false },
    run: true
  });
  frames[frames.length - 1]();
  assert.deepEqual(calls.setTransform[calls.setTransform.length - 1], [0.5, 0, 0, 0.5, 0, 0]);
  assert.deepEqual(calls.clearRect[calls.clearRect.length - 1], [0, 0, 1440, 900]);
});

test("a concurrent hall texture arrival keeps the cached copy", () => {
  const src = read("js/pages/gallery/hall-backdrop.js");
  const fn = /function keepHallTex\(url, loaded\) \{[\s\S]*?\n\}/.exec(src)[0];
  const cache = new Map();
  const prepped = [];
  let trims = 0;
  const ctx = {
    hallTexCache: cache,
    prepHallTex: (tex) => { prepped.push(tex); return tex; },
    trimHallCache: () => { trims += 1; cache.delete("other.png"); }
  };
  const keepHallTex = vm.runInNewContext("(" + fn + ")", ctx);
  const tex1 = { disposed: 0, dispose() { this.disposed += 1; } };
  const first = keepHallTex("lion.png", tex1);
  assert.equal(first, tex1);
  assert.deepEqual(prepped, [tex1]);
  assert.equal(cache.get("lion.png"), tex1);
  assert.equal(trims, 1);
  const tex2 = { disposed: 0, dispose() { this.disposed += 1; } };
  const second = keepHallTex("lion.png", tex2);
  assert.equal(second, tex1, "the in-flight duplicate returns the cached texture");
  assert.equal(tex2.disposed, 1, "the duplicate is disposed exactly once");
  assert.equal(prepped.length, 1);
  assert.equal(trims, 1, "the cached path must not run an eviction pass");
  assert.equal(cache.get("lion.png"), tex1);
});
