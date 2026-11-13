import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { onRequest } from "../../functions/_middleware.js";

const calls = [];
let verdict = { success: true, action: "guest-pass", hostname: "site.test" };
let grantStatus = 200;
globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (target.includes("challenges.cloudflare.com/turnstile/v0/siteverify")) {
    calls.push({ kind: "verify", secret: init.body.get("secret"), token: init.body.get("response"), ip: init.body.get("remoteip") });
    return Response.json(verdict);
  }
  if (target.includes("/rest/v1/rpc/exhibit_grant_human_pass")) {
    calls.push({ kind: "grant", body: JSON.parse(init.body), apikey: init.headers.apikey });
    if (grantStatus !== 200) return new Response("no", { status: grantStatus });
    return Response.json("2026-11-14T02:00:00+00:00");
  }
  calls.push({ kind: "other", url: target });
  return new Response(null, { status: 201 });
};

function gate(result) {
  return { idFromName: (name) => name, get: () => ({ fetch: async () => Response.json(result) }) };
}

function passRequest(body, { env = {}, rate = { ok: true, first: false } } = {}) {
  return {
    request: new Request("https://site.test/__human-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.9" },
      body: typeof body === "string" ? body : JSON.stringify(body)
    }),
    env: Object.assign({ RATE_GATE: gate(rate), TURNSTILE_SECRET: "ts-secret", HUMAN_PASS_KEY: "pass-key" }, env),
    next: async () => new Response("next", { status: 200 }),
    waitUntil: () => {}
  };
}

const GOOD_IDS = ["3f2b8c1e-7a44-4d2b-9a0e-0c1d2e3f4a5b", "a_lq9x2k1z"];

test("a verified Turnstile token grants a pass for the guest ids", async () => {
  calls.length = 0;
  verdict = { success: true, action: "guest-pass", hostname: "site.test" };
  grantStatus = 200;
  const res = await onRequest(passRequest({ token: "tok-1", ids: GOOD_IDS }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, until: "2026-11-14T02:00:00+00:00" });
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const verify = calls.find((c) => c.kind === "verify");
  assert.deepEqual(verify, { kind: "verify", secret: "ts-secret", token: "tok-1", ip: "203.0.113.9" });
  const grant = calls.find((c) => c.kind === "grant");
  assert.deepEqual(grant.body, { p_anon_ids: GOOD_IDS, p_key: "pass-key" });
});

test("a failed Turnstile check is refused and grants nothing", async () => {
  calls.length = 0;
  verdict = { success: false, "error-codes": ["invalid-input-response"] };
  const res = await onRequest(passRequest({ token: "bad", ids: GOOD_IDS }));
  assert.equal(res.status, 403);
  assert.equal(calls.filter((c) => c.kind === "grant").length, 0);
});

test("a token made for another action or another site is refused", async () => {
  for (const wrong of [{ success: true, action: "login", hostname: "site.test" }, { success: true, action: "guest-pass", hostname: "evil.example" }]) {
    calls.length = 0;
    verdict = wrong;
    const res = await onRequest(passRequest({ token: "tok", ids: GOOD_IDS }));
    assert.equal(res.status, 403, JSON.stringify(wrong));
    assert.equal(calls.filter((c) => c.kind === "grant").length, 0);
  }
});

test("missing token or unusable ids are refused before Turnstile is asked", async () => {
  verdict = { success: true, action: "guest-pass", hostname: "site.test" };
  for (const body of [{ ids: GOOD_IDS }, { token: "t", ids: [] }, { token: "t", ids: ["short"] }, { token: "t", ids: ["edge-rate-limit"] }, { token: "t", ids: ["has space in it"] }, "not json"]) {
    calls.length = 0;
    const res = await onRequest(passRequest(body));
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(calls.length, 0, JSON.stringify(body));
  }
});

test("at most two distinct ids are sent to the database", async () => {
  calls.length = 0;
  verdict = { success: true, action: "guest-pass", hostname: "site.test" };
  const res = await onRequest(passRequest({ token: "t", ids: [GOOD_IDS[0], GOOD_IDS[0], GOOD_IDS[1], "c_third_one_x"] }));
  assert.equal(res.status, 200);
  assert.deepEqual(calls.find((c) => c.kind === "grant").body.p_anon_ids, GOOD_IDS);
});

test("without the two secrets the route answers 503 and calls nobody", async () => {
  calls.length = 0;
  const res = await onRequest(passRequest({ token: "t", ids: GOOD_IDS }, { env: { TURNSTILE_SECRET: "", HUMAN_PASS_KEY: "" } }));
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test("a rate-limited caller gets 429 before Turnstile is asked", async () => {
  calls.length = 0;
  const res = await onRequest(passRequest({ token: "t", ids: GOOD_IDS }, { rate: { ok: false, first: false } }));
  assert.equal(res.status, 429);
  assert.equal(calls.filter((c) => c.kind === "verify").length, 0);
});

test("a database refusal is reported as 502", async () => {
  calls.length = 0;
  verdict = { success: true, action: "guest-pass", hostname: "site.test" };
  grantStatus = 401;
  const res = await onRequest(passRequest({ token: "t", ids: GOOD_IDS }));
  assert.equal(res.status, 502);
  grantStatus = 200;
});

test("the pass route is routed to the function and allows Turnstile in the CSP", () => {
  const routes = JSON.parse(fs.readFileSync(new URL("../../_routes.json", import.meta.url), "utf8"));
  assert.ok(routes.include.includes("/__human-pass"));
  const headers = fs.readFileSync(new URL("../../_headers", import.meta.url), "utf8");
  const csp = (headers.match(/Content-Security-Policy: (.*)/) || [])[1] || "";
  assert.match(csp, /script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com;/);
});

const SQL = fs.readFileSync(new URL("../../tools/supabase-human-pass.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const ENFORCE = fs.readFileSync(new URL("../../tools/supabase-human-pass-enforce.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("the database only grants passes with the right key, and clients cannot read passes or keys", () => {
  assert.match(SQL, /encode\(extensions\.digest\(p_key, 'sha256'\), 'hex'\) <> v_hash then\n\s+raise exception 'not allowed'/);
  assert.match(SQL, /revoke all on public\.exhibit_human_passes from public, anon, authenticated;/);
  assert.match(SQL, /revoke all on public\.exhibit_edge_keys from public, anon, authenticated;/);
  assert.match(SQL, /cardinality\(p_anon_ids\) > 2 then/);
  assert.match(SQL, /v_id = 'edge-rate-limit' then/);
});

test("guest rows need a live pass; signed-in rows and edge reports do not", () => {
  assert.match(SQL, /if new\.user_id is not null then\n\s+return new;/);
  assert.match(SQL, /if new\.event = 'rate_limited' and new\.anon_id = 'edge-rate-limit' then/);
  assert.match(SQL, /p\.anon_id = new\.anon_id\n\s+and p\.expires_at > now\(\)/);
  assert.match(SQL, /raise exception 'human_check';/);
  for (const table of ["exhibit_events", "exhibit_surveys"]) {
    assert.match(ENFORCE, new RegExp("before insert on public\\." + table + "\\n\\s+for each row execute function public\\.exhibit_require_human_pass\\(\\);"));
  }
});

function loadPassModule(state) {
  const store = new Map();
  const appended = [];
  const win = {
    BAAuthConfig: { turnstileSiteKey: "site-key" },
    ScrollAuth: { getUser: () => state.user },
    Insights: { anonId: () => state.insightsId },
    SiteOps: { anonId: () => state.opsId },
    turnstile: {
      render: (box, opts) => { state.rendered = opts; setTimeout(() => opts.callback("tok-xyz"), 0); }
    }
  };
  const sandbox = {
    window: win,
    document: { head: { appendChild: (n) => appended.push(n) }, body: { appendChild: (n) => appended.push(n) }, createElement: () => ({ style: {}, parentNode: null }) },
    sessionStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    fetch: async (url, init) => { state.posted.push({ url, body: JSON.parse(init.body) }); return { ok: state.grantOk, json: async () => ({ ok: true, until: "2026-11-14T02:00:00Z" }) }; },
    setTimeout, clearTimeout, Date, Number, Promise, JSON, String
  };
  vm.runInNewContext(fs.readFileSync(new URL("../../js/shared/human-pass.js", import.meta.url), "utf8"), sandbox);
  return { HumanPass: win.HumanPass, store };
}

test("a guest solves Turnstile once and the pass covers both guest ids", async () => {
  const state = { user: null, insightsId: "insights-id-1", opsId: "ops-id-0001", posted: [], grantOk: true };
  const { HumanPass, store } = loadPassModule(state);
  assert.equal(await HumanPass.ready(), true);
  assert.equal(state.rendered.action, "guest-pass");
  assert.equal(state.rendered.appearance, "interaction-only");
  assert.deepEqual(state.posted, [{ url: "/__human-pass", body: { token: "tok-xyz", ids: ["insights-id-1", "ops-id-0001"] } }]);
  assert.equal(store.get("baHumanPass:insights-id-1"), String(Date.parse("2026-11-14T02:00:00Z")));
  state.posted.length = 0;
  assert.equal(await HumanPass.ready(), true);
  assert.equal(state.posted.length, 0, "a valid pass is reused, not asked for again");
});

test("signed-in members never see Turnstile", async () => {
  const state = { user: { id: "u1" }, insightsId: "insights-id-1", opsId: "ops-id-0001", posted: [], grantOk: true };
  const { HumanPass } = loadPassModule(state);
  assert.equal(await HumanPass.ready(), true);
  assert.equal(state.rendered, undefined);
  assert.equal(state.posted.length, 0);
});

function memoryStorage() {
  const store = {};
  return {
    store,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null
  };
}

function pageSandbox({ user, passReady }) {
  const inserts = [];
  const element = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute() {}, getAttribute: () => null, addEventListener() {}, appendChild: (c) => c, querySelector: () => null, querySelectorAll: () => [] });
  const ctx = {
    console, JSON, Math, Date, Number, String, Array, Object, Promise, URL, Set, Map, Error,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: function CustomEvent() {},
    navigator: { onLine: true },
    crypto: { randomUUID: () => "11111111-2222-4333-8444-555555555555" },
    location: { href: "https://example.test/study.html", pathname: "/study.html", search: "", hash: "" },
    document: { readyState: "loading", visibilityState: "visible", body: element(), head: element(), documentElement: element(), createElement: element, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    ScrollAuth: {
      getUser: () => user,
      getClient: () => ({ from: (table) => ({ insert: (rows) => { inserts.push({ table, rows }); return Promise.resolve({ error: null }); } }) })
    }
  };
  if (passReady !== undefined) ctx.HumanPass = { ready: () => Promise.resolve(passReady) };
  ctx.window = ctx;
  return { ctx: vm.createContext(ctx), inserts };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
const readSource = (rel) => fs.readFileSync(new URL("../../" + rel, import.meta.url), "utf8");

test("a guest error report waits for the human pass and is kept when there is none", async () => {
  const refused = pageSandbox({ user: null, passReady: false });
  vm.runInContext(readSource("js/shared/ops.js"), refused.ctx);
  refused.ctx.SiteOps.report("save_failed", "network");
  await settle(); await settle();
  assert.equal(refused.inserts.length, 0);
  assert.equal(JSON.parse(refused.ctx.sessionStorage.getItem("baOpsQueue")).length, 1);
  assert.equal(typeof refused.ctx.SiteOps.anonId, "function");
  assert.ok(refused.ctx.SiteOps.anonId().length >= 8);

  const passed = pageSandbox({ user: null, passReady: true });
  vm.runInContext(readSource("js/shared/ops.js"), passed.ctx);
  passed.ctx.SiteOps.report("save_failed", "network");
  await settle(); await settle();
  assert.equal(passed.inserts.length, 1);
});

test("a member's error report is sent at once, without the human check", async () => {
  const member = pageSandbox({ user: { id: "u1" }, passReady: false });
  vm.runInContext(readSource("js/shared/ops.js"), member.ctx);
  member.ctx.SiteOps.report("save_failed", "network");
  assert.equal(member.inserts.length, 1);
});

test("a guest survey without a human pass is not sent and frees its slot", async () => {
  const refused = pageSandbox({ user: null, passReady: false });
  vm.runInContext(readSource("js/shared/insights.js"), refused.ctx);
  const result = await refused.ctx.Insights.insertSurvey({ rating: 4 });
  assert.equal(result.ok, false);
  assert.equal(refused.inserts.length, 0);
  assert.deepEqual(JSON.parse(refused.ctx.localStorage.getItem("baSurveyTimes") || "[]"), []);

  const passed = pageSandbox({ user: null, passReady: true });
  vm.runInContext(readSource("js/shared/insights.js"), passed.ctx);
  const sent = await passed.ctx.Insights.insertSurvey({ rating: 4 });
  assert.equal(sent.ok, true);
  assert.equal(passed.inserts.length, 1);
});

test("a refused pass leaves the guest without one", async () => {
  const state = { user: null, insightsId: "", opsId: "ops-id-0001", posted: [], grantOk: false };
  const { HumanPass, store } = loadPassModule(state);
  assert.equal(await HumanPass.ready(), false);
  assert.equal(store.size, 0);
});
