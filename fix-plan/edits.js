const PAGES = ['404.html', 'account.html', 'gallery.html', 'index.html', 'insights.html', 'map.html', 'reviews.html', 'study.html'];

const pageEdits = PAGES.map((file) => ({
  id: 'E-page ' + file,
  fixes: ['F3'],
  why: 'loads the guest human-check module on every page that can write guest events or surveys',
  protectedBy: [],
  file,
  find: '  <script src="js/shared/ops.js" defer></script>\n',
  replace: '  <script src="js/shared/ops.js" defer></script>\n  <script src="js/shared/human-pass.js" defer></script>\n',
}));

module.exports = [
  {
    id: 'E1 edge pass route',
    fixes: ['F2'],
    why: 'adds /__human-pass: rate-limited, verifies the Turnstile token with siteverify (action and hostname must match), then asks the database to grant a 12-hour pass for at most two guest ids',
    protectedBy: ['M1', 'M2', 'M3', 'M4'],
    file: 'functions/_middleware.js',
    find: 'async function servePage(context, request) {\n',
    replace: `const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const PASS_ACTION = "guest-pass";
const GUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const NO_STORE = { "Cache-Control": "no-store" };

function passIds(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const ids = [];
  for (const value of list) {
    const id = typeof value === "string" ? value : "";
    if (!GUEST_ID.test(id) || id === "edge-rate-limit") continue;
    if (ids.indexOf(id) >= 0) continue;
    ids.push(id);
  }
  return ids.slice(0, 2);
}

async function verifyTurnstile(secret, token, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  form.append("remoteip", ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY, { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function humanPass(context, request) {
  const env = context.env || {};
  const secret = env.TURNSTILE_SECRET;
  const key = env.HUMAN_PASS_KEY;
  if (!secret || !key) return new Response("Not configured", { status: 503, headers: NO_STORE });
  const ip = ipOf(request);
  const decision = await allowed(context, ip, "/__human-pass");
  if (decision === "deny" || decision === "deny_first") return denied();
  if (decision !== "allow") return unavailable();
  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  const token = body && typeof body.token === "string" ? body.token.slice(0, 2048) : "";
  const ids = passIds(body && body.ids);
  if (!token || !ids.length) return new Response("Bad Request", { status: 400, headers: NO_STORE });
  const check = await verifyTurnstile(secret, token, ip);
  const host = new URL(request.url).hostname;
  const isHuman = !!(check && check.success === true && check.action === PASS_ACTION && check.hostname === host);
  if (!isHuman) return new Response("Forbidden", { status: 403, headers: NO_STORE });
  let grant = null;
  try {
    grant = await fetch(SUPABASE_URL + "/rest/v1/rpc/exhibit_grant_human_pass", {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_anon_ids: ids, p_key: key }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (e) {
    grant = null;
  }
  if (!grant || !grant.ok) return new Response("Bad Gateway", { status: 502, headers: NO_STORE });
  const until = await grant.json();
  return Response.json({ ok: true, until: until }, { headers: NO_STORE });
}

async function servePage(context, request) {
`,
  },
  {
    id: 'E2 route the pass path',
    fixes: ['F2'],
    why: 'sends POST /__human-pass to the new handler',
    protectedBy: ['M1'],
    file: 'functions/_middleware.js',
    find: '  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);\n',
    replace: '  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);\n  if (path === "/__human-pass" && request.method === "POST") return humanPass(context, request);\n',
  },
  {
    id: 'E3 _routes.json',
    fixes: ['F2'],
    why: 'Pages only runs the function for listed paths; static pages stay function-free',
    protectedBy: ['M5'],
    file: '_routes.json',
    find: '    "/__rate",\n',
    replace: '    "/__rate",\n    "/__human-pass",\n',
  },
  {
    id: 'E4 CSP allows Turnstile again',
    fixes: ['F3'],
    why: 'the widget script and its frame come from challenges.cloudflare.com; now actually used',
    protectedBy: ['M6'],
    file: '_headers',
    find: "https://static.cloudflareinsights.com 'sha256",
    replace: "https://static.cloudflareinsights.com https://challenges.cloudflare.com 'sha256",
  },
  {
    id: 'E5 CSP frame-src',
    fixes: ['F3'],
    why: 'the Turnstile challenge renders in a frame from challenges.cloudflare.com, the only frame the site uses',
    protectedBy: ['M6'],
    file: '_headers',
    find: "frame-src 'none';",
    replace: 'frame-src https://challenges.cloudflare.com;',
  },
  {
    id: 'E6 header test: Turnstile script',
    fixes: ['F3'],
    why: 'the header check now requires the Turnstile host, because the site uses it',
    protectedBy: [],
    file: 'tools/verify-headers.mjs',
    find: 'assert(!cspDirectives[\'script-src\']?.includes("https://challenges.cloudflare.com"), "CSP script-src does not allow the unused Turnstile host");',
    replace: 'assert(cspDirectives[\'script-src\']?.includes("https://challenges.cloudflare.com"), "CSP script-src allows challenges.cloudflare.com for the guest human check (Turnstile)");',
  },
  {
    id: 'E7 header test: Turnstile frame',
    fixes: ['F3'],
    why: 'frame-src must be exactly the Turnstile host',
    protectedBy: [],
    file: 'tools/verify-headers.mjs',
    find: 'assert(cspDirectives[\'frame-src\']?.length === 1 && cspDirectives[\'frame-src\'][0] === "\'none\'", "CSP frame-src is \'none\': the site embeds no frames");',
    replace: 'assert(cspDirectives[\'frame-src\']?.length === 1 && cspDirectives[\'frame-src\'][0] === "https://challenges.cloudflare.com", "CSP frame-src allows only the Turnstile challenge frame");',
  },
  {
    id: 'E8 insights: wait for a pass',
    fixes: ['F3'],
    why: 'a guest flush first obtains a human pass; members and pages without the module carry on as before, and the database stays the judge',
    protectedBy: [],
    file: 'js/shared/insights.js',
    find: '  function flush() {\n    if (flushing || optedOut() || !consented()) return Promise.resolve();\n',
    replace: `  function withHumanPass(user, send) {
    const pass = window.HumanPass;
    if (user || !pass || typeof pass.ready !== 'function') return Promise.resolve(send());
    return pass.ready().then(function (isHuman) {
      return isHuman ? send() : { error: { message: 'human_check' } };
    });
  }

  function flush() {
    if (flushing || optedOut() || !consented()) return Promise.resolve();
`,
  },
  {
    id: 'E9 insights: flush through the pass',
    fixes: ['F3'],
    why: 'without a pass the batch is kept and its flush slots refunded, exactly as for any failed insert',
    protectedBy: [],
    file: 'js/shared/insights.js',
    find: `    return client.from(TABLE).insert(batch.map(function (row) {
      return Object.assign({ user_id: user ? user.id : null }, row);
    })).then(function (res) {`,
    replace: `    return withHumanPass(user, function () {
      return client.from(TABLE).insert(batch.map(function (row) {
        return Object.assign({ user_id: user ? user.id : null }, row);
      }));
    }).then(function (res) {`,
  },
  {
    id: 'E10 insights: surveys through the pass',
    fixes: ['F3'],
    why: 'guest surveys also need a pass; a refusal releases the survey slot like any failed insert',
    protectedBy: [],
    file: 'js/shared/insights.js',
    find: `    return pair.client.from('exhibit_surveys').insert(Object.assign({
      user_id: pair.user ? pair.user.id : null,
      anon_id: anonId(),
      cohort: '',
      role: 'Student',
      feedback: '',
      responses: {}
    }, row)).then(function (res) {`,
    replace: `    return withHumanPass(pair.user, function () {
      return pair.client.from('exhibit_surveys').insert(Object.assign({
        user_id: pair.user ? pair.user.id : null,
        anon_id: anonId(),
        cohort: '',
        role: 'Student',
        feedback: '',
        responses: {}
      }, row));
    }).then(function (res) {`,
  },
  {
    id: 'E11 ops: flush through the pass',
    fixes: ['F3'],
    why: 'guest error reports also need a pass; the queue is kept when there is none',
    protectedBy: [],
    file: 'js/shared/ops.js',
    find: `    return client.from(TABLE).insert(batch.map(function (row) {
      return {
        event: row.event,
        anon_id: anonId(),
        page: row.page,
        detail: { reason: row.reason, ms: row.ms, cause: row.cause },
        user_id: user ? user.id : null
      };
    })).then(function (res) {`,
    replace: `    const pass = window.HumanPass;
    const send = function () {
      return client.from(TABLE).insert(batch.map(function (row) {
        return {
          event: row.event,
          anon_id: anonId(),
          page: row.page,
          detail: { reason: row.reason, ms: row.ms, cause: row.cause },
          user_id: user ? user.id : null
        };
      }));
    };
    const sent = user || !pass || typeof pass.ready !== "function"
      ? Promise.resolve(send())
      : pass.ready().then(function (isHuman) { return isHuman ? send() : { error: { message: "human_check" } }; });
    return sent.then(function (res) {`,
  },
  {
    id: 'E12 ops: share the guest id',
    fixes: ['F3'],
    why: 'the human-check module needs the error-report guest id to cover it with the same pass',
    protectedBy: ['M7'],
    file: 'js/shared/ops.js',
    find: '  window.SiteOps = { report: report, flush: flush };\n',
    replace: '  window.SiteOps = { report: report, flush: flush, anonId: anonId };\n',
  },
  ...pageEdits,
  {
    id: 'E13 privacy: Cloudflare row',
    fixes: ['F4'],
    why: 'Turnstile is a Cloudflare service that processes visitor data for the human check',
    protectedBy: [],
    file: 'privacy.html',
    find: '<tr><td>Cloudflare (hosting, rate limiting, Web Analytics)</td><td>IP address and request details for each page; short-lived rate-limit counts; aggregate page views</td><td>Hosting, protection against abuse, and page-view counts</td>',
    replace: '<tr><td>Cloudflare (hosting, rate limiting, Web Analytics, Turnstile)</td><td>IP address and request details for each page; short-lived rate-limit counts; aggregate page views; for guests, the browser signals Turnstile uses to tell people from automated scripts</td><td>Hosting, protection against abuse, page-view counts, and a human check before a guest\'s study activity is stored</td>',
  },
  {
    id: 'E14 privacy: storage row',
    fixes: ['F4'],
    why: 'lists the new session-only key',
    protectedBy: [],
    file: 'privacy.html',
    find: '              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>\n',
    replace: '              <tr><td>baHumanPass:&lt;ID&gt;</td><td>When a guest\'s human check expires (about 12 hours), removed when the tab closes</td></tr>\n              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>\n',
  },
  {
    id: 'E15 audit PT-19 survey',
    fixes: ['F5'],
    why: 'guest surveys without a pass are now refused outright; the live check proves that and no longer stores five rows',
    protectedBy: [],
    file: 'tools/security/run_penetration_audit.mjs',
    find: `async function liveSurveyRate() {
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
}`,
    replace: `async function liveSurveyRate() {
  const anonId = "pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const res = await api("POST", "/rest/v1/exhibit_surveys", {
    user_id: null,
    anon_id: anonId,
    cohort: "",
    role: "Student",
    feedback: "pen",
    responses: { kind: "pen" }
  }, { Prefer: "return=minimal" });
  if (res.status === 200 || res.status === 201) throw new Error("a guest survey without a human pass was stored");
  if (!res.text.includes("human_check")) throw new Error("guest survey replied " + res.status + " " + clip(res.text));
  return "guest survey without a human pass rejected with human_check";
}`,
  },
  {
    id: 'E16 audit PT-20 events',
    fixes: ['F5'],
    why: 'guest events without a pass are now refused outright; the live check proves that and no longer stores sixty rows',
    protectedBy: [],
    file: 'tools/security/run_penetration_audit.mjs',
    find: `  const anonId = "pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
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
}`,
    replace: `  const anonId = "pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const res = await api("POST", "/rest/v1/exhibit_events", {
    event: "pen_probe",
    page: "pen",
    anon_id: anonId,
    session_id: "pen",
    detail: {}
  }, { Prefer: "return=minimal" });
  if (res.status === 200 || res.status === 201) throw new Error("a guest event without a human pass was stored");
  if (!res.text.includes("human_check")) throw new Error("guest event replied " + res.status + " " + clip(res.text));
  return "nameless event rejected; guest event without a human pass rejected with human_check";
}

async function liveHumanPassGrantClosed() {
  const res = await api("POST", "/rest/v1/rpc/exhibit_grant_human_pass", {
    p_anon_ids: ["pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24)],
    p_key: "not-the-edge-key"
  });
  if (res.status === 200 || res.status === 201 || res.status === 204) throw new Error("a human pass was granted without the edge key");
  if (!res.text.includes("not allowed") && res.status !== 401 && res.status !== 403) throw new Error("pass grant replied " + res.status + " " + clip(res.text));
  return "pass grant without the edge key refused (" + res.status + ")";
}`,
  },
  {
    id: 'E17 audit PT-20 nameless',
    fixes: ['F5'],
    why: 'the human-pass trigger fires before the rate gate, so a nameless guest event is now refused with human_check',
    protectedBy: [],
    file: 'tools/security/run_penetration_audit.mjs',
    find: `  if (!nameless.text.includes("rate_limit")) {
    throw new Error("nameless event replied " + nameless.status + " " + clip(nameless.text));
  }`,
    replace: `  if (!nameless.text.includes("rate_limit") && !nameless.text.includes("human_check")) {
    throw new Error("nameless event replied " + nameless.status + " " + clip(nameless.text));
  }`,
  },
  {
    id: 'E18 audit list',
    fixes: ['F5'],
    why: 'renames PT-19 and PT-20 and adds PT-23',
    protectedBy: [],
    file: 'tools/security/run_penetration_audit.mjs',
    find: `  ["PT-19", "Survey spam stops at 5 an hour", liveSurveyRate],
  ["PT-20", "Event spam stops at 60 a minute", liveEventRateAndIdentity],
  ["PT-21", "Research copies and build input are not deployable", deployLeakPaths],
  ["PT-22", "Message desk hides authors, help notes, and receipts", liveDeskClosed]
];

if (tests.length !== 22) throw new Error("expected 22 tests, found " + tests.length);`,
    replace: `  ["PT-19", "Guest surveys need a human pass", liveSurveyRate],
  ["PT-20", "Guest events need an identity and a human pass", liveEventRateAndIdentity],
  ["PT-21", "Research copies and build input are not deployable", deployLeakPaths],
  ["PT-22", "Message desk hides authors, help notes, and receipts", liveDeskClosed],
  ["PT-23", "A human pass cannot be granted without the edge key", liveHumanPassGrantClosed]
];

if (tests.length !== 23) throw new Error("expected 23 tests, found " + tests.length);`,
  },
];
