import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onRequest } from "../../functions/_middleware.js";
import { ExhibitRateGate } from "../../workers/exhibit-rate-gate/src/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIVE_SITE = "https://cinematic-bible-study-daniel.pages.dev";
const SECRET = "pen-test-gate-secret";

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function authConfig() {
  const src = read("js/shared/auth-config.js");
  const url = (src.match(/url:\s*"([^"]+)"/) || [])[1];
  const key = (src.match(/publishableKey:\s*"([^"]+)"/) || [])[1];
  if (!url || !key) throw new Error("auth-config.js has no publishable project url");
  return { url, key };
}

function memoryState() {
  const disk = new Map();
  let chain = Promise.resolve();
  return {
    storage: {
      get: async (key) => disk.get(key),
      put: async (key, value) => { disk.set(key, value); }
    },
    blockConcurrencyWhile(task) {
      const run = chain.then(task, task);
      chain = run.then(() => {}, () => {});
      return run;
    }
  };
}

async function gateCheck(gate, ip, requestPath) {
  const res = await gate.fetch(new Request("https://gate/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ip, path: requestPath })
  }));
  const data = await res.json();
  return data.ok === true;
}

function browser() {
  const store = new Map();
  const session = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); }
  };
  const sessionStorage = {
    getItem: (key) => (session.has(key) ? session.get(key) : null),
    setItem: (key, value) => { session.set(key, String(value)); },
    removeItem: (key) => { session.delete(key); }
  };
  const location = {
    hostname: "cinematic-bible-study-daniel.pages.dev",
    href: "https://cinematic-bible-study-daniel.pages.dev/study.html",
    origin: "https://cinematic-bible-study-daniel.pages.dev",
    pathname: "/study.html",
    search: "",
    hash: ""
  };
  const document = {
    readyState: "complete",
    body: { classList: { toggle() {} } },
    getElementById() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return { style: {}, setAttribute() {}, click() {} }; }
  };
  global.localStorage = storage;
  global.sessionStorage = sessionStorage;
  global.location = location;
  global.document = document;
  global.history = { replaceState() {} };
  global.window = {
    location,
    localStorage: storage,
    sessionStorage,
    document,
    history: global.history,
    navigator: global.navigator,
    addEventListener() {}
  };
  return { storage, location, document };
}

function loadScript(rel) {
  const timers = [];
  const realTimeout = global.setTimeout;
  global.setTimeout = (fn, ms, ...args) => {
    const id = realTimeout(fn, ms, ...args);
    timers.push(id);
    return id;
  };
  try {
    new Function(read(rel))();
  } finally {
    timers.forEach((id) => clearTimeout(id));
    global.setTimeout = realTimeout;
  }
}

function assertNoLeak(text, label) {
  const body = String(text || "");
  const leaks = [
    [/allotted place/i, "quiz note"],
    [/service_role/i, "service role"],
    [/sb_secret_/i, "secret key"],
    [/postgres:\/\//i, "database url"],
    [/eyJ[A-Za-z0-9_-]{12,}/, "session token"],
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "email address"]
  ];
  leaks.forEach(([pattern, kind]) => {
    if (pattern.test(body)) throw new Error(label + " exposed a " + kind);
  });
}

function clip(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 160);
}

async function api(method, apiPath, body, extra) {
  const cfg = authConfig();
  const res = await fetch(cfg.url + apiPath, {
    method,
    headers: {
      apikey: cfg.key,
      Authorization: "Bearer " + cfg.key,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extra
    },
    body: body == null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  const text = await res.text();
  assertNoLeak(text, method + " " + apiPath);
  return { status: res.status, text };
}

function assertHidden(res, label) {
  if (res.status === 401 || res.status === 403) return res.status + " denied";
  if (res.status === 200) {
    const rows = JSON.parse(res.text);
    if (Array.isArray(rows) && rows.length === 0) return "empty";
    throw new Error(label + " returned " + (Array.isArray(rows) ? rows.length : "data") + " row(s) to the anonymous key");
  }
  throw new Error(label + " replied " + res.status + " " + clip(res.text));
}

async function edgePageCap() {
  const gate = new ExhibitRateGate(memoryState());
  for (let i = 0; i < 240; i += 1) {
    if (!await gateCheck(gate, "203.0.113.10", "/study.html")) {
      throw new Error("page " + (i + 1) + " was denied before the 240 cap");
    }
  }
  if (await gateCheck(gate, "203.0.113.10", "/study.html")) {
    throw new Error("the 241st page for one address was allowed");
  }
  if (!await gateCheck(gate, "203.0.113.11", "/study.html")) {
    throw new Error("a second address shared the first address's cap");
  }
  return "241st page denied; a second address kept its own budget";
}

async function edgeStaticOutsideCap() {
  const gate = new ExhibitRateGate(memoryState());
  for (let i = 0; i < 240; i += 1) await gateCheck(gate, "203.0.113.20", "/study.html");
  const bible = await gateCheck(gate, "203.0.113.20", "/bible/kjv.json");
  const script = await gateCheck(gate, "203.0.113.20", "/js/shared/auth.js");
  const model = await gateCheck(gate, "203.0.113.20", "/models/full_body.glb");
  const overflow = await gateCheck(gate, "203.0.113.20", "/index.html");
  if (!bible || !script || !model) throw new Error("a full page budget blocked scripture, script, or model reads");
  if (overflow) throw new Error("static reads reset or skipped the page cap");
  return "scripture, script, and model reads stayed up after the page cap";
}

async function edgeWindowReset() {
  const gate = new ExhibitRateGate(memoryState());
  const realNow = Date.now;
  let now = 1_700_000_000_000;
  Date.now = () => now;
  try {
    for (let i = 0; i < 240; i += 1) await gateCheck(gate, "203.0.113.30", "/study.html");
    if (await gateCheck(gate, "203.0.113.30", "/study.html")) throw new Error("cap did not engage");
    now += 60000;
    if (!await gateCheck(gate, "203.0.113.30", "/study.html")) {
      throw new Error("the budget did not return after the minute window");
    }
  } finally {
    Date.now = realNow;
  }
  return "a locked address was admitted again after 60 seconds";
}

async function edgeParallelSpam() {
  const gate = new ExhibitRateGate(memoryState());
  const replies = await Promise.all(Array.from({ length: 241 }, () => gateCheck(gate, "203.0.113.40", "/study.html")));
  const allowed = replies.filter(Boolean).length;
  if (allowed !== 240) throw new Error("parallel spam was allowed " + allowed + " times");
  return "241 simultaneous checks admitted exactly 240";
}

async function edgeSpoofedForwarding() {
  const seen = [];
  const gate = {
    idFromName(ip) { return ip; },
    get(id) {
      return {
        fetch: async () => {
          seen.push(id);
          return Response.json({ ok: true });
        }
      };
    }
  };
  const next = () => new Response("next");
  const spoofed = await onRequest({
    request: new Request("https://cinematic-bible-study-daniel.pages.dev/study.html", {
      headers: {
        "cf-connecting-ip": "203.0.113.50",
        "x-real-ip": "198.51.100.8",
        "x-forwarded-for": "198.51.100.9, 203.0.113.1"
      }
    }),
    env: { RATE_GATE: gate },
    next
  });
  const fallback = await onRequest({
    request: new Request("https://cinematic-bible-study-daniel.pages.dev/study.html", {
      headers: { "x-real-ip": "198.51.100.8", "x-forwarded-for": "198.51.100.9" }
    }),
    env: { RATE_GATE: gate },
    next
  });
  if (spoofed.status !== 200 || fallback.status !== 200) throw new Error("legitimate page reads were blocked");
  if (seen[0] !== "203.0.113.50") throw new Error("X-Forwarded-For overrode the Cloudflare address");
  if (seen[1] !== "198.51.100.8") throw new Error("X-Forwarded-For outranked X-Real-IP");
  return "Cloudflare's address beat both client-supplied forwarding headers";
}

async function edgeRateProxyClosed() {
  const calls = [];
  const gate = {
    idFromName(ip) { return ip; },
    get() {
      return {
        fetch: async () => {
          calls.push("checked");
          return Response.json({ ok: false });
        }
      };
    }
  };
  let nextCalls = 0;
  const contextFor = (headers, env) => ({
    request: new Request("https://cinematic-bible-study-daniel.pages.dev/__rate", {
      method: "POST",
      headers,
      body: JSON.stringify({ ip: "203.0.113.60", path: "/study.html" })
    }),
    env,
    next: () => { nextCalls += 1; return new Response("next"); }
  });
  const missing = await onRequest(contextFor({}, { RATE_GATE_SECRET: SECRET, RATE_GATE: gate }));
  const wrong = await onRequest(contextFor(
    { authorization: "Bearer " + SECRET.slice(0, -1) + "x" },
    { RATE_GATE_SECRET: SECRET, RATE_GATE: gate }
  ));
  const missingGate = await onRequest(contextFor(
    { authorization: "Bearer " + SECRET },
    { RATE_GATE_SECRET: SECRET }
  ));
  const denied = await onRequest(contextFor(
    { authorization: "Bearer " + SECRET },
    { RATE_GATE_SECRET: SECRET, RATE_GATE: gate }
  ));
  const missingText = await missing.text();
  const wrongText = await wrong.text();
  const downText = await missingGate.text();
  const deniedText = await denied.text();
  if (missing.status !== 403 || wrong.status !== 403) throw new Error("the rate proxy accepted a bad secret");
  if (missingText !== "Forbidden" || wrongText !== "Forbidden") throw new Error("the proxy returned a body other than Forbidden");
  if ((missingText + wrongText + downText + deniedText).includes(SECRET)) throw new Error("the proxy echoed the gate secret");
  if (missingGate.status !== 503 || downText !== "Service Unavailable") throw new Error("a missing gate failed open");
  if (denied.status !== 429 || deniedText !== "Too Many Requests" || denied.headers.get("retry-after") !== "60") {
    throw new Error("a full gate did not return a plain 429");
  }
  if (calls.length !== 1 || nextCalls !== 0) throw new Error("rejected proxy calls still reached the gate or the origin");
  return "bad secrets got 403, a down gate got 503, a full gate got 429";
}

async function edgeHiddenPaths() {
  const blocked = [
    "/tools/supabase-quiz-integrity.sql",
    "/package.json",
    "/server.py",
    "/.env",
    "/README.md",
    "/backups/db.sql"
  ];
  for (const requestPath of blocked) {
    let nextCalls = 0;
    const res = await onRequest({
      request: new Request("https://cinematic-bible-study-daniel.pages.dev" + requestPath),
      env: {},
      next: () => { nextCalls += 1; return new Response("secret file"); }
    });
    if (res.status !== 404 || nextCalls !== 0) throw new Error(requestPath + " reached the origin");
  }
  const livePaths = blocked.slice(0, 5);
  for (const requestPath of livePaths) {
    const res = await fetch(LIVE_SITE + requestPath, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    assertNoLeak(text, requestPath);
    if (res.status !== 404) throw new Error(LIVE_SITE + requestPath + " returned " + res.status);
    if (text.includes("exhibit_quiz_keys") || text.includes("publishableKey")) {
      throw new Error(requestPath + " is being served");
    }
  }
  const home = await fetch(LIVE_SITE + "/", { signal: AbortSignal.timeout(20000) });
  const csp = home.headers.get("content-security-policy") || "";
  if (home.status !== 200) throw new Error("home page returned " + home.status);
  if (home.headers.get("x-content-type-options") !== "nosniff") throw new Error("nosniff header missing");
  if ((home.headers.get("x-frame-options") || "").toUpperCase() !== "DENY") throw new Error("framing is allowed");
  if (!csp.includes("frame-ancestors 'none'") || !csp.includes("object-src 'none'")) {
    throw new Error("CSP does not block framing and plugins");
  }
  return "operator files 404 locally and on the live site; framing and sniffing are blocked";
}

function quizBundleHasNoKey() {
  browser();
  loadScript("js/study/sheets-data.js");
  const sheets = global.window.sheetsData;
  if (!Array.isArray(sheets) || sheets.length !== 11) throw new Error("eleven sittings did not load");
  let total = 0;
  sheets.forEach((sheet, sitting) => {
    sheet.quizzes.forEach((quiz, qIdx) => {
      total += 1;
      if ("correct" in quiz) throw new Error("sitting " + sitting + " question " + qIdx + " ships a correct index");
      if (!Array.isArray(quiz.diagnostics) || quiz.diagnostics.length !== quiz.options.length) {
        throw new Error("sitting " + sitting + " question " + qIdx + " diagnostics do not match the options");
      }
      if (quiz.diagnostics.some((line) => /^correct/i.test(line))) {
        throw new Error("sitting " + sitting + " question " + qIdx + " ships the answer note");
      }
    });
  });
  if (total !== 55) throw new Error("expected 55 quizzes, found " + total);
  return "55 quizzes ship with no correct index and no answer note";
}

async function quizFailsClosed() {
  browser();
  const calls = [];
  global.window.ScrollAuth = {
    getUser: () => null,
    getClient: () => null
  };
  global.localStorage.setItem("baQaMockSession", JSON.stringify({ user: { id: "qa" } }));
  loadScript("js/shared/quiz-gate.js");
  const signedOut = await global.window.QuizGate.verify(10, 1, 1);
  if (calls.length !== 0) throw new Error("a signed-out visitor called the grading function");
  if (!signedOut || signedOut.ok !== false || signedOut.error !== "not_authenticated") {
    throw new Error("a production-host QA mock was graded as signed in");
  }
  global.window.ScrollAuth = {
    getUser: () => ({ id: "learner" }),
    getClient: () => ({
      rpc: () => {
        calls.push("rpc");
        return Promise.resolve({
          data: null,
          error: { message: "Correct! Daniel 12:2 is the resurrection and the allotted place secret@example.com" }
        });
      }
    })
  };
  const fault = await global.window.QuizGate.verify(10, 1, 1);
  const encoded = JSON.stringify(fault);
  if (fault.ok !== false || fault.error !== "error") throw new Error("a grading fault was treated as an answer");
  if (/allotted place|@example\.com|Correct!/i.test(encoded)) throw new Error("the grading fault returned server text");
  return "signed-out and faulted grades reveal nothing and do not call through a QA mock";
}

async function authCapRedirectAndErrors() {
  const box = browser();
  box.location.search = "?error=server_error&error_description=" + encodeURIComponent("eyJhbGciOiJIUzI1NiJ9.secret secret@example.com");
  box.location.href = "https://cinematic-bible-study-daniel.pages.dev/study.html?redirect=https://evil.example/phish&error=server_error";
  const shown = [];
  const oauth = [];
  global.window.SiteErrors = {
    show(message) { shown.push(String(message || "")); },
    clear() {},
    current() { return shown[shown.length - 1] || ""; }
  };
  global.window.BAAuthConfig = { url: "https://example.test", publishableKey: "publishable" };
  global.window.supabase = {
    createClient() {
      return {
        auth: {
          onAuthStateChange() {},
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          signInWithOAuth(options) {
            oauth.push(options);
            return Promise.resolve({ data: { url: "https://accounts.google.com/o" }, error: null });
          }
        }
      };
    }
  };
  loadScript("js/shared/auth.js");
  const visible = shown.join(" ");
  if (/eyJ|secret@example\.com|evil\.example/i.test(visible)) throw new Error("the sign-in error showed the raw callback");
  if (!visible.includes("Sign-in failed")) throw new Error("a callback error produced no visitor-facing message");
  for (let i = 0; i < 5; i += 1) await global.window.ScrollAuth.signIn();
  const blocked = await global.window.ScrollAuth.signIn();
  if (oauth.length !== 5) throw new Error("sign-in started " + oauth.length + " times in one hour");
  if (!blocked || !blocked.error || blocked.error.message !== "rate_limit") throw new Error("the sixth sign-in was not limited");
  const target = oauth[0] && oauth[0].options && oauth[0].options.redirectTo;
  if (target !== "https://cinematic-bible-study-daniel.pages.dev/account.html") {
    throw new Error("OAuth redirect left the site: " + target);
  }
  return "sixth sign-in limited; redirect stayed on account.html; callback text was scrubbed";
}

async function clientEventSpamCap() {
  browser();
  global.location.hostname = "127.0.0.1";
  global.window.location.hostname = "127.0.0.1";
  let sent = 0;
  global.window.ScrollAuth = {
    getUser: () => null,
    getClient: () => ({
      from() {
        return {
          insert(rows) {
            sent += rows.length;
            return Promise.resolve({ error: null });
          }
        };
      }
    })
  };
  loadScript("js/shared/insights.js");
  const queued = Array.from({ length: 100 }, () => ({
    event: "pen",
    sitting: null,
    sheet: null,
    detail: {},
    page: "index.html",
    anon_id: "pen",
    session_id: "pen",
    created_at: new Date().toISOString()
  }));
  global.localStorage.setItem("baInsightsQueue", JSON.stringify(queued));
  for (let i = 0; i < 10; i += 1) await global.window.Insights.flush();
  if (sent !== 60) throw new Error("the browser sent " + sent + " events in one minute");
  return "the browser stopped at 60 events in one minute";
}

async function clientSurveySpamAndError() {
  browser();
  global.location.hostname = "127.0.0.1";
  global.window.location.hostname = "127.0.0.1";
  global.window.ScrollAuth = {
    getUser: () => null,
    getClient: () => ({
      from() {
        return {
          insert: () => Promise.resolve({ error: { message: "duplicate secret@example.com allotted place" } })
        };
      }
    })
  };
  loadScript("js/shared/insights.js");
  const fault = await global.window.Insights.insertSurvey({ feedback: "probe" });
  if (!fault || fault.ok !== false || fault.reason !== "error") throw new Error("a survey fault was not closed");
  if (/secret@example|allotted place/i.test(JSON.stringify(fault))) throw new Error("the survey fault returned database text");
  global.localStorage.removeItem("baSurveyTimes");
  let allowed = 0;
  for (let i = 0; i < 5; i += 1) if (global.window.Insights.takeSurveySlot()) allowed += 1;
  if (allowed !== 5 || global.window.Insights.takeSurveySlot()) throw new Error("a sixth survey was accepted in the same hour");
  return "five surveys an hour, and a database error came back only as error";
}

function storedXssAndCsv() {
  browser();
  const grid = { innerHTML: "", querySelectorAll() { return []; } };
  global.document.getElementById = (id) => (id === "insights-grid" ? grid : null);
  global.window.document = global.document;
  loadScript("js/insights/insights.js");
  const stamp = new Date().toISOString();
  global.window.InsightsDashboard.setCache({
    events: [],
    surveys: [{
      created_at: stamp,
      feedback: "",
      responses: { kind: "sitting_pulse", note: "<img src=x onerror=alert(1)>", sitting: 1 }
    }],
    profiles: [{ created_at: stamp, study_mode: "<script>alert(1)</script>" }],
    progress: []
  });
  global.window.InsightsDashboard.render();
  if (grid.innerHTML.includes("<img") || grid.innerHTML.includes("<script>")) {
    throw new Error("a survey note or profile field was inserted as HTML");
  }
  if (!grid.innerHTML.includes("&lt;img") || !grid.innerHTML.includes("&lt;script&gt;")) {
    throw new Error("the hostile fields were dropped instead of escaped");
  }
  const formula = global.window.InsightsDashboard.csvEscape("=cmd|'/c calc'!A0");
  const plus = global.window.InsightsDashboard.csvEscape("+2+2");
  const at = global.window.InsightsDashboard.csvEscape("@SUM(A1)");
  const plain = global.window.InsightsDashboard.csvEscape("Daniel");
  if (!formula.startsWith("'") || !plus.startsWith("'") || !at.startsWith("'")) {
    throw new Error("a spreadsheet formula was exported as a formula");
  }
  if (plain !== "Daniel") throw new Error("an ordinary export cell was rewritten");
  return "hostile notes were escaped and formula cells were neutralized";
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function devServerTraversal() {
  const port = await freePort();
  const child = spawn("py", ["-3", "server.py", "--no-browser"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), PYTHONUNBUFFERED: "1" },
    windowsHide: true
  });
  let log = "";
  child.stdout.on("data", (chunk) => { log += chunk; });
  child.stderr.on("data", (chunk) => { log += chunk; });
  const started = Date.now();
  try {
    while (!/Serving HTTP on port (\d+)/.test(log)) {
      if (child.exitCode != null) throw new Error("dev server exited: " + clip(log));
      if (Date.now() - started > 8000) throw new Error("dev server did not start: " + clip(log));
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const origin = "http://127.0.0.1:" + log.match(/Serving HTTP on port (\d+)/)[1];
    const home = await fetch(origin + "/index.html");
    if (home.status !== 200) throw new Error("index.html returned " + home.status);
    await home.body.cancel();
    const attacks = [
      "/server.py",
      "/.env",
      "/.git/config",
      "/tools/supabase-quiz-integrity.sql",
      "/js/shared/../../tools/supabase-quiz-integrity.sql",
      "/js/%2e%2e/%2e%2e/server.py",
      "/tools/"
    ];
    for (const requestPath of attacks) {
      const res = await fetch(origin + requestPath);
      const text = await res.text();
      if (res.status === 200) throw new Error(requestPath + " was served");
      if (text.includes("exhibit_quiz_keys") || text.includes("def translate_path") || text.includes("[core]")) {
        throw new Error(requestPath + " returned file contents");
      }
      if (/[A-Za-z]:\\Users\\|\/Users\//.test(text)) throw new Error(requestPath + " revealed a filesystem path");
    }
    return "index served; source, env, git, SQL, and traversed paths were not";
  } finally {
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
    }
    child.kill();
    child.unref();
  }
}

async function liveQuizTableHidden() {
  const res = await api("GET", "/rest/v1/exhibit_quiz_keys?select=sitting,q_idx,correct_idx,correct_note");
  const detail = assertHidden(res, "quiz keys");
  if (/"correct_idx"\s*:/.test(res.text)) throw new Error("an answer index was in the anonymous response");
  return "anonymous quiz-key read was " + detail;
}

async function liveQuizRpcDenied() {
  const res = await api("POST", "/rest/v1/rpc/verify_quiz_answer", {
    p_sitting: 10,
    p_q_idx: 1,
    p_chosen: 1
  });
  if (res.status === 200) throw new Error("anonymous grading returned " + clip(res.text));
  if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
    throw new Error("anonymous grading replied " + res.status + " " + clip(res.text));
  }
  if (/"correct"\s*:\s*true/.test(res.text) || /Correct!/.test(res.text)) {
    throw new Error("anonymous grading returned an answer");
  }
  return "anonymous grading was HTTP " + res.status + " with no answer";
}

async function livePrivateTables() {
  const tables = [
    ["/rest/v1/exhibit_progress?select=certificate_name,cohort,journey", "progress"],
    ["/rest/v1/exhibit_study_data?select=notes,bookmarks", "study notes"],
    ["/rest/v1/exhibit_profiles?select=user_id,background,found_via", "profiles"],
    ["/rest/v1/exhibit_moderators?select=email", "moderators"],
    ["/rest/v1/exhibit_events?select=anon_id,event,detail", "events"]
  ];
  const parts = [];
  for (const [apiPath, label] of tables) {
    parts.push(label + " " + assertHidden(await api("GET", apiPath), label));
  }
  const cfg = authConfig();
  const admin = await fetch(cfg.url + "/auth/v1/admin/users", {
    headers: { apikey: cfg.key, Authorization: "Bearer " + cfg.key },
    signal: AbortSignal.timeout(20000)
  });
  const adminText = await admin.text();
  assertNoLeak(adminText, "auth admin");
  if (admin.status === 200) throw new Error("the anonymous key listed accounts");
  parts.push("accounts " + admin.status);
  return parts.join("; ");
}

async function liveReviewAndSaveDenied() {
  const inserted = await api("POST", "/rest/v1/exhibit_reviews", {
    user_id: "00000000-0000-0000-0000-000000000000",
    display_name: "Pen Tester",
    body: "This anonymous note is long enough to meet the review length rule.",
    approved: true,
    rejected: false,
    rating: 5
  }, { Prefer: "return=representation" });
  if (inserted.status === 200 || inserted.status === 201) throw new Error("an anonymous review was stored as approved");
  const visible = await api("GET", "/rest/v1/exhibit_reviews?select=approved,rejected,body");
  if (visible.status === 200) {
    const rows = JSON.parse(visible.text);
    if (!Array.isArray(rows)) throw new Error("review list was not a list");
    rows.forEach((row) => {
      if (row.approved !== true || row.rejected !== false) throw new Error("an unapproved review was publicly readable");
    });
  } else if (visible.status !== 401 && visible.status !== 403) {
    throw new Error("review list replied " + visible.status);
  }
  const saved = await api("POST", "/rest/v1/rpc/save_exhibit_progress", {
    expected_revision: 0,
    payload: { save_id: "pen-test", certificate_name: "X".repeat(70000) }
  });
  if (saved.status === 200) throw new Error("anonymous progress save returned " + clip(saved.text));
  if (!/not_authenticated|permission denied|PGRST202/i.test(saved.text)) {
    throw new Error("anonymous progress save replied " + saved.status + " " + clip(saved.text));
  }
  if (saved.text.includes("XXXX")) throw new Error("the progress error echoed the payload");
  return "approved insert " + inserted.status + "; public reviews stay approved; progress save " + saved.status;
}

async function liveSurveyRate() {
  const anonId = "pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  let stored = 0;
  let rejected = null;
  for (let i = 0; i < 6; i += 1) {
    const res = await api("POST", "/rest/v1/exhibit_surveys", {
      user_id: null,
      anon_id: anonId,
      cohort: "",
      role: "Student",
      feedback: "pen",
      responses: { kind: "pen" },
      created_at: "2000-01-01T00:00:00.000Z"
    }, { Prefer: "return=minimal" });
    if (res.status === 200 || res.status === 201) stored += 1;
    else {
      rejected = res;
      break;
    }
  }
  if (stored !== 5 || !rejected) throw new Error("survey spam stored " + stored + " rows");
  if (!rejected.text.includes("rate_limit")) throw new Error("sixth survey replied " + rejected.status + " " + clip(rejected.text));
  return "5 surveys stored, the 6th rejected with rate_limit";
}

async function liveEventRateAndIdentity() {
  const nameless = await api("POST", "/rest/v1/exhibit_events", {
    event: "pen_probe",
    page: "pen",
    anon_id: "",
    session_id: "",
    user_id: null,
    detail: {}
  }, { Prefer: "return=minimal" });
  if (nameless.status === 200 || nameless.status === 201) throw new Error("an event with no identity was stored");
  if (!nameless.text.includes("rate_limit")) {
    throw new Error("nameless event replied " + nameless.status + " " + clip(nameless.text));
  }
  const anonId = "pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  let stored = 0;
  let rejected = null;
  for (let i = 0; i < 61; i += 1) {
    const res = await api("POST", "/rest/v1/exhibit_events", {
      event: "pen_probe",
      page: "pen",
      anon_id: anonId,
      session_id: "pen",
      detail: {},
      created_at: "2000-01-01T00:00:00.000Z"
    }, { Prefer: "return=minimal" });
    if (res.status === 200 || res.status === 201) stored += 1;
    else {
      rejected = res;
      break;
    }
  }
  if (stored !== 60 || !rejected) throw new Error("event spam stored " + stored + " rows");
  if (!rejected.text.includes("rate_limit")) throw new Error("61st event replied " + rejected.status + " " + clip(rejected.text));
  return "nameless event rejected; 60 events stored; the 61st rejected with rate_limit";
}

/*
 * Regression for the 2026-10-16 finding: _factcheck/ (third-party research
 * copies) and _mig/ (diagram build input) reached production because neither
 * the deploy script excluded them nor the middleware denied them. Both halves
 * are asserted here, so a future edit to either file re-opens the test.
 */
async function deployLeakPaths() {
  const mustDeny = [
    "/_factcheck/meta.json",
    "/_factcheck/uriah_smith_DAR.pdf",
    "/_mig/index.json",
    "/_mig/spec2.json",
    "/__wiring_check.mjs",
    "/qa_book_reader_full.log"
  ];
  for (const p of mustDeny) {
    const res = await onRequest({
      request: new Request("https://example.test" + p),
      env: {},
      next: () => new Response("SERVED", { status: 200 }),
      waitUntil: () => {}
    });
    if (res.status !== 404) throw new Error(p + " replied HTTP " + res.status + ", expected 404");
  }
  const deploy = read("tools/deploy-cloudflare-pages.ps1");
  for (const name of ["_factcheck", "_mig", "__wiring_check.mjs", "qa_book_reader_full.log"]) {
    if (!deploy.includes(name)) throw new Error("deploy script no longer excludes " + name);
  }
  for (const name of ["_factcheck", "_mig"]) {
    if (fs.existsSync(path.join(ROOT, ".pages-deploy", name))) {
      throw new Error(".pages-deploy/" + name + " is staged and would be uploaded");
    }
  }
  return mustDeny.length + " private paths denied; deploy script excludes both directories";
}

async function liveDeskClosed() {
  const notices = await api("GET", "/rest/v1/exhibit_notices?select=id,title,body,created_at");
  if (notices.status !== 200) throw new Error("public notices replied " + notices.status + " " + clip(notices.text));
  if (/"author_id"\s*:/.test(notices.text) || /"user_id"\s*:/.test(notices.text)) {
    throw new Error("a public notice included an author");
  }
  const author = await api("GET", "/rest/v1/exhibit_notices?select=author_id");
  if (author.status === 200) throw new Error("anonymous key read notice authors");
  const help = await api("GET", "/rest/v1/exhibit_help_notes?select=id,subject,body,user_id");
  const helpWrite = await api("POST", "/rest/v1/exhibit_help_notes", {
    subject: "pen",
    body: "This note must not be stored for an anonymous caller."
  }, { Prefer: "return=minimal" });
  const publish = await api("POST", "/rest/v1/exhibit_notices", {
    title: "pen",
    body: "This notice must not be published by an anonymous caller."
  }, { Prefer: "return=minimal" });
  const inbox = await api("POST", "/rest/v1/rpc/exhibit_help_inbox", {});
  const receipt = await api("POST", "/rest/v1/rpc/exhibit_notice_receipt_set", {
    p_notice: "00000000-0000-0000-0000-000000000000",
    p_read: true,
    p_hidden: false
  });
  const receipts = await api("GET", "/rest/v1/exhibit_notice_receipts?select=notice_id,read_at,hidden_at,user_id");
  const trigger = await api("POST", "/rest/v1/rpc/exhibit_help_before_insert", {});
  const denied = [author, help, helpWrite, publish, inbox, receipt, receipts, trigger];
  denied.forEach((res) => {
    if (res.status === 200 || res.status === 201) throw new Error("anonymous desk call stored or returned data");
  });
  const reviewUser = await api("GET", "/rest/v1/exhibit_reviews?select=user_id");
  if (reviewUser.status === 200) throw new Error("anonymous key read review account ids");
  const publicReviews = await api("POST", "/rest/v1/rpc/exhibit_public_reviews", { p_limit: 60 });
  if (publicReviews.status !== 200) throw new Error("public review list replied " + publicReviews.status);
  const publicRows = JSON.parse(publicReviews.text);
  if (!Array.isArray(publicRows)) throw new Error("public review list was not a list");
  publicRows.forEach((row) => {
    const extra = Object.keys(row).filter((k) => !["id", "display_name", "body", "rating", "created_at"].includes(k));
    if (extra.length) throw new Error("public review list exposed " + extra.join(", "));
  });
  return "notices are public text only; help notes, receipts, inbox, and review account ids stay closed";
}

const tests = [
  ["PT-01", "Edge page cap is per address", edgePageCap],
  ["PT-02", "Static reads do not spend the page cap", edgeStaticOutsideCap],
  ["PT-03", "Page cap opens again after its window", edgeWindowReset],
  ["PT-04", "Parallel page spam cannot pass the cap", edgeParallelSpam],
  ["PT-05", "Forwarded-for spoofing does not pick the bucket", edgeSpoofedForwarding],
  ["PT-06", "Rate proxy rejects bad secrets and fails closed", edgeRateProxyClosed],
  ["PT-07", "Operator files and framing stay closed", edgeHiddenPaths],
  ["PT-08", "Shipped quizzes contain no answer key", quizBundleHasNoKey],
  ["PT-09", "Quiz grading fails closed", quizFailsClosed],
  ["PT-10", "Sign-in is capped, same-origin, and scrubbed", authCapRedirectAndErrors],
  ["PT-11", "Browser event flush stops at 60 a minute", clientEventSpamCap],
  ["PT-12", "Browser survey slot and error scrub", clientSurveySpamAndError],
  ["PT-13", "Insights HTML and CSV exports stay inert", storedXssAndCsv],
  ["PT-14", "Dev server refuses traversal and private files", devServerTraversal],
  ["PT-15", "Anonymous key cannot read quiz answers", liveQuizTableHidden],
  ["PT-16", "Anonymous key cannot grade a quiz", liveQuizRpcDenied],
  ["PT-17", "Anonymous key cannot read private learner data", livePrivateTables],
  ["PT-18", "Anonymous key cannot approve a review or save progress", liveReviewAndSaveDenied],
  ["PT-19", "Survey spam stops at 5 an hour", liveSurveyRate],
  ["PT-20", "Event spam stops at 60 a minute", liveEventRateAndIdentity],
  ["PT-21", "Research copies and build input are not deployable", deployLeakPaths],
  ["PT-22", "Message desk hides authors, help notes, and receipts", liveDeskClosed]
];

if (tests.length !== 22) throw new Error("expected 22 tests, found " + tests.length);

const results = [];
for (const [id, title, fn] of tests) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ id, title, ok: true, detail, ms: Date.now() - started });
  } catch (err) {
    results.push({ id, title, ok: false, detail: err.message, ms: Date.now() - started });
  }
}

let failed = 0;
results.forEach((result) => {
  const mark = result.ok ? "PASS" : "FAIL";
  if (!result.ok) failed += 1;
  console.log(mark + " " + result.id + " " + result.title + " (" + result.ms + "ms)");
  console.log("  " + result.detail);
});
console.log(results.length - failed + " passed, " + failed + " failed, " + tests.length + " tests");
process.exit(failed > 0 ? 1 : 0);
