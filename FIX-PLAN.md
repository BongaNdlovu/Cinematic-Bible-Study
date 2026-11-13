# Plan: Turnstile human check for guest writes

**Status: plan only, nothing applied.** Every number was measured, and `gate pre` re-checks it before anything changes.

<!-- Fields with "=" inside double braces are filled by render-plan.js from tool output. The other double-brace fields are
     prose you write from this session's tool output. `render-plan.js <project> --check` must PASS before reporting. -->

## 1. Goal
Today any script holding the public key can write guest study events and survey answers straight to the database; only rate limits stand in the way (`tools/supabase-audit-fixes-2026-11.sql:3` and `:50`, which match the live database exactly, see `sources/live-db-check.txt`). Turnstile is configured (`js/shared/auth-config.js:4`) but used nowhere. After this plan a guest's browser solves Cloudflare Turnstile once per visit (managed mode, shown only if a click is needed), the edge verifies it with Cloudflare, and the database accepts guest rows only from guest ids holding a live 12-hour pass. Members are not affected. Unit tests go from 84 PASS / 0 FAIL to 101 PASS / 0 FAIL (section 7). Your choices on 13 November 2026: enforce on guest writes, managed visibility, you hold the Turnstile secret.

| # | Problem (exact test name or symptom) | Cause (file:line from an anchor) | Kind | Fix |
|---|---|---|---|---|
| F1 | The database accepts guest rows from any script | Guest branches of `exhibit_events_rate_gate` and `exhibit_surveys_rate_gate` (`tools/supabase-audit-fixes-2026-11.sql:3`, `:50`) only count rows | Decision: enforce on guest writes | New `tools/supabase-human-pass.sql` (pass table, key table, grant function, check function) and `tools/supabase-human-pass-enforce.sql` (two `before insert` triggers) |
| F2 | No server verifies Turnstile | The edge has no such route (`functions/_middleware.js:198` handles `/__rate` only) | Decision: edge verification | `/__human-pass` in `functions/_middleware.js` plus `_routes.json` |
| F3 | No page runs Turnstile; the CSP blocks it (`_headers:9`) | Removed earlier today because it was unused | Decision: managed, interaction-only | New `js/shared/human-pass.js`; guest flushes wait for it (`js/shared/insights.js:200`, `:336`, `js/shared/ops.js:88`); CSP allows the host again |
| F4 | The privacy page does not mention Turnstile | n/a | Real gap | Two rows in `privacy.html` |
| F5 | Live audit checks PT-19 and PT-20 assume guest writes succeed (`tools/security/run_penetration_audit.mjs:849`) | Behaviour changes on purpose | Stale test | They now expect `human_check`; new PT-23 proves the grant needs the edge key. The audit stops leaving test rows in the live database |

Out of scope, unchanged before and after: none.

## 2. Scope
- **Edited:** `functions/_middleware.js`, `_routes.json`, `_headers`, `tools/verify-headers.mjs`, `js/shared/insights.js`, `js/shared/ops.js`, `404.html`, `account.html`, `gallery.html`, `index.html`, `insights.html`, `map.html`, `reviews.html`, `study.html`, `privacy.html`, `tools/security/run_penetration_audit.mjs`, changed only by `node fix-plan/apply.js .`
- **Generated:** `js/shared/human-pass.js`, `tools/supabase-human-pass.sql`, `tools/supabase-human-pass-enforce.sql`, `tests/unit/human-pass.test.mjs`, changed only by `node C:/Users/fanel/AppData/Local/Temp/claude/7e6313a9fee51d70/13e0b23f-c16f-41d7-ab77-774855e11244/scratchpad/fix-plan/new-files.js .`
- **Everything else:** 736 files stay byte-identical. The 4 generated files above are new; nothing else is added and nothing is deleted.
- **Invariants:** the `/__rate` proxy handler and the edge telemetry writer in `functions/_middleware.js`, and event queuing (`track`) in `js/shared/insights.js`, stay byte-identical.
- **Toolkit deviation (disclosed):** the standard toolkit cannot add new files. In the staged copy, `gate.js` S2 allows exactly the files listed under Generated, `tamper-test.js` tampers a new generated file by changing a byte (there is no old version to copy), and `scope-report.js` reports a not-yet-created generated file as "NEW" not "MISSING". The gate still checks every new file byte for byte against the dry run (X checks) and by regeneration (G1).

## 3. Hard rules (any violation = the plan FAILS)
1. **Fail closed.** Any `[FAIL]`, crash or timeout fails the plan. Never edit the gate, `config.js` or `expected.json`
   to get past one. Restore the backups and report.
2. **No hand edits.** Only `apply.js` changes edited files: each edit is applied exactly once, or nothing is written.
3. **No weakened tests.** Changed files must be byte-identical to the dry run. No test may be renamed, dropped, skipped
   or made always-true. The gate breaks the fixed code in 15 way(s), and each must be caught.
4. **Zero hallucination.** Report only what the gate or a tool printed. Write "not run" or "not measured" for
   anything else.
5. **Pinned tooling.**
   - `fix-plan/gate.js` sha256 `da309b371809b6b949c29fb47d23c3804fe1d074a3baf759d415c46370ea6f54`
   - `fix-plan/expected.json` sha256 `aa25cd2c6b17c3259717cc9403d9bb06b2182c03d11f6c7f3ae88a0b0d36ceb6`

   The gate pins the other files itself.
6. **Real run only.** The final `RESULT:` lines must not contain `DRY-RUN`.

## 4. Before execution: scope analysis
Read-only. Check the pins, run `node fix-plan/scope-report.js` (required: `SCOPE VERDICT: READY`), read sections 1–2
and 6 and `fix-plan/edits.js`, and grep the callers and tests of each edit site.

Present it under four headings, citing `file:line`:
- **Scope covered:** 20 file(s) change (`404.html`, `_headers`, `_routes.json`, `account.html`, `functions/_middleware.js`, `gallery.html`, `index.html`, `insights.html`, `js/shared/human-pass.js`, `js/shared/insights.js`, `js/shared/ops.js`, `map.html`, `privacy.html`, `reviews.html`, `study.html`, `tests/unit/human-pass.test.mjs`, `tools/security/run_penetration_audit.mjs`, `tools/supabase-human-pass-enforce.sql`, `tools/supabase-human-pass.sql`, `tools/verify-headers.mjs`) and 736 stay identical.
- **What it entails.**
- **What is in it.**
- **How it connects with the plan:** each edit → its goal → the tests that must pass → its mutations.

**Stop and ask** if:
- the verdict isn't READY;
- an edit or goal isn't linked;
- the code doesn't match this plan;
- this document and `edits.js` disagree;
- the change affects something not mentioned here.

Otherwise, continue to section 5 without waiting. ALREADY APPLIED: run `gate.js post` and report; don't re-apply.

## 5. Steps (from `C:\Users\fanel\Downloads\nebuchadnezzar_golden_head_threejs`)
```bash
sha256sum fix-plan/gate.js fix-plan/expected.json   # must match rule 5
node fix-plan/gate.js pre     # required: RESULT: PASS (39/39 checks passed, mode=pre); writes backups
node fix-plan/apply.js .      # required: applied 26 edits to 16 files
node C:/Users/fanel/AppData/Local/Temp/claude/7e6313a9fee51d70/13e0b23f-c16f-41d7-ab77-774855e11244/scratchpad/fix-plan/new-files.js .    # regenerate
node fix-plan/gate.js post    # required: RESULT: PASS (57/57 checks passed, mode=post)
```
**On any other output:**
1. Copy each edited file back from `%TEMP%/fix-plan-backup` (`/` in the path is written as `__`).
2. Regenerate.
3. Report FAILED, quoting the `[FAIL]` lines.

What the gate checks (each check's result is in the report JSON it prints):
- **pre:** tooling hashes, a byte-identical baseline, anchors, line endings, invariants, the recorded test results, and
  verified backups.
- **post:**
  - only the planned files changed, each byte-identical to the dry run, with the rest unchanged;
  - invariants and extra checks;
  - fresh regeneration;
  - test tallies, names and statuses;
  - every mutation caught.

After the first FAIL, the gate skips the slow steps (`[SKIP]`), because the RESULT is FAIL anyway.

## 6. The exact change (ground truth: `fix-plan/edits.js`)
### E1 edge pass route  (`functions/_middleware.js`, serves F2)

Why: adds /__human-pass: rate-limited, verifies the Turnstile token with siteverify (action and hostname must match), then asks the database to grant a 12-hour pass for at most two guest ids

Find (exactly once):

```js
async function servePage(context, request) {
```

Replace with:

```js
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
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
```

### E2 route the pass path  (`functions/_middleware.js`, serves F2)

Why: sends POST /__human-pass to the new handler

Find (exactly once):

```js
  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);
```

Replace with:

```js
  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);
  if (path === "/__human-pass" && request.method === "POST") return humanPass(context, request);
```

### E3 _routes.json  (`_routes.json`, serves F2)

Why: Pages only runs the function for listed paths; static pages stay function-free

Find (exactly once):

```json
    "/__rate",
```

Replace with:

```json
    "/__rate",
    "/__human-pass",
```

### E4 CSP allows Turnstile again  (`_headers`, serves F3)

Why: the widget script and its frame come from challenges.cloudflare.com; now actually used

Find (exactly once):

```
https://static.cloudflareinsights.com 'sha256
```

Replace with:

```
https://static.cloudflareinsights.com https://challenges.cloudflare.com 'sha256
```

### E5 CSP frame-src  (`_headers`, serves F3)

Why: the Turnstile challenge renders in a frame from challenges.cloudflare.com, the only frame the site uses

Find (exactly once):

```
frame-src 'none';
```

Replace with:

```
frame-src https://challenges.cloudflare.com;
```

### E6 header test: Turnstile script  (`tools/verify-headers.mjs`, serves F3)

Why: the header check now requires the Turnstile host, because the site uses it

Find (exactly once):

```mjs
assert(!cspDirectives['script-src']?.includes("https://challenges.cloudflare.com"), "CSP script-src does not allow the unused Turnstile host");
```

Replace with:

```mjs
assert(cspDirectives['script-src']?.includes("https://challenges.cloudflare.com"), "CSP script-src allows challenges.cloudflare.com for the guest human check (Turnstile)");
```

### E7 header test: Turnstile frame  (`tools/verify-headers.mjs`, serves F3)

Why: frame-src must be exactly the Turnstile host

Find (exactly once):

```mjs
assert(cspDirectives['frame-src']?.length === 1 && cspDirectives['frame-src'][0] === "'none'", "CSP frame-src is 'none': the site embeds no frames");
```

Replace with:

```mjs
assert(cspDirectives['frame-src']?.length === 1 && cspDirectives['frame-src'][0] === "https://challenges.cloudflare.com", "CSP frame-src allows only the Turnstile challenge frame");
```

### E8 insights: wait for a pass  (`js/shared/insights.js`, serves F3)

Why: a guest flush first obtains a human pass; members and pages without the module carry on as before, and the database stays the judge

Find (exactly once):

```js
  function flush() {
    if (flushing || optedOut() || !consented()) return Promise.resolve();
```

Replace with:

```js
  function withHumanPass(user, send) {
    const pass = window.HumanPass;
    if (user || !pass || typeof pass.ready !== 'function') return Promise.resolve(send());
    return pass.ready().then(function (isHuman) {
      return isHuman ? send() : { error: { message: 'human_check' } };
    });
  }

  function flush() {
    if (flushing || optedOut() || !consented()) return Promise.resolve();
```

### E9 insights: flush through the pass  (`js/shared/insights.js`, serves F3)

Why: without a pass the batch is kept and its flush slots refunded, exactly as for any failed insert

Find (exactly once):

```js
    return client.from(TABLE).insert(batch.map(function (row) {
      return Object.assign({ user_id: user ? user.id : null }, row);
    })).then(function (res) {
```

Replace with:

```js
    return withHumanPass(user, function () {
      return client.from(TABLE).insert(batch.map(function (row) {
        return Object.assign({ user_id: user ? user.id : null }, row);
      }));
    }).then(function (res) {
```

### E10 insights: surveys through the pass  (`js/shared/insights.js`, serves F3)

Why: guest surveys also need a pass; a refusal releases the survey slot like any failed insert

Find (exactly once):

```js
    return pair.client.from('exhibit_surveys').insert(Object.assign({
      user_id: pair.user ? pair.user.id : null,
      anon_id: anonId(),
      cohort: '',
      role: 'Student',
      feedback: '',
      responses: {}
    }, row)).then(function (res) {
```

Replace with:

```js
    return withHumanPass(pair.user, function () {
      return pair.client.from('exhibit_surveys').insert(Object.assign({
        user_id: pair.user ? pair.user.id : null,
        anon_id: anonId(),
        cohort: '',
        role: 'Student',
        feedback: '',
        responses: {}
      }, row));
    }).then(function (res) {
```

### E11 ops: flush through the pass  (`js/shared/ops.js`, serves F3)

Why: guest error reports also need a pass; the queue is kept when there is none

Find (exactly once):

```js
    return client.from(TABLE).insert(batch.map(function (row) {
      return {
        event: row.event,
        anon_id: anonId(),
        page: row.page,
        detail: { reason: row.reason, ms: row.ms, cause: row.cause },
        user_id: user ? user.id : null
      };
    })).then(function (res) {
```

Replace with:

```js
    const pass = window.HumanPass;
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
    return sent.then(function (res) {
```

### E12 ops: share the guest id  (`js/shared/ops.js`, serves F3)

Why: the human-check module needs the error-report guest id to cover it with the same pass

Find (exactly once):

```js
  window.SiteOps = { report: report, flush: flush };
```

Replace with:

```js
  window.SiteOps = { report: report, flush: flush, anonId: anonId };
```

### E-page 404.html  (`404.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page account.html  (`account.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page gallery.html  (`gallery.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page index.html  (`index.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page insights.html  (`insights.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page map.html  (`map.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page reviews.html  (`reviews.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E-page study.html  (`study.html`, serves F3)

Why: loads the guest human-check module on every page that can write guest events or surveys

Find (exactly once):

```html
  <script src="js/shared/ops.js" defer></script>
```

Replace with:

```html
  <script src="js/shared/ops.js" defer></script>
  <script src="js/shared/human-pass.js" defer></script>
```

### E13 privacy: Cloudflare row  (`privacy.html`, serves F4)

Why: Turnstile is a Cloudflare service that processes visitor data for the human check

Find (exactly once):

```html
<tr><td>Cloudflare (hosting, rate limiting, Web Analytics)</td><td>IP address and request details for each page; short-lived rate-limit counts; aggregate page views</td><td>Hosting, protection against abuse, and page-view counts</td>
```

Replace with:

```html
<tr><td>Cloudflare (hosting, rate limiting, Web Analytics, Turnstile)</td><td>IP address and request details for each page; short-lived rate-limit counts; aggregate page views; for guests, the browser signals Turnstile uses to tell people from automated scripts</td><td>Hosting, protection against abuse, page-view counts, and a human check before a guest's study activity is stored</td>
```

### E14 privacy: storage row  (`privacy.html`, serves F4)

Why: lists the new session-only key

Find (exactly once):

```html
              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>
```

Replace with:

```html
              <tr><td>baHumanPass:&lt;ID&gt;</td><td>When a guest's human check expires (about 12 hours), removed when the tab closes</td></tr>
              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>
```

### E15 audit PT-19 survey  (`tools/security/run_penetration_audit.mjs`, serves F5)

Why: guest surveys without a pass are now refused outright; the live check proves that and no longer stores five rows

Find (exactly once):

```mjs
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
```

Replace with:

```mjs
async function liveSurveyRate() {
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
}
```

### E16 audit PT-20 events  (`tools/security/run_penetration_audit.mjs`, serves F5)

Why: guest events without a pass are now refused outright; the live check proves that and no longer stores sixty rows

Find (exactly once):

```mjs
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
```

Replace with:

```mjs
  const anonId = "pen-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
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
}
```

### E17 audit PT-20 nameless  (`tools/security/run_penetration_audit.mjs`, serves F5)

Why: the human-pass trigger fires before the rate gate, so a nameless guest event is now refused with human_check

Find (exactly once):

```mjs
  if (!nameless.text.includes("rate_limit")) {
    throw new Error("nameless event replied " + nameless.status + " " + clip(nameless.text));
  }
```

Replace with:

```mjs
  if (!nameless.text.includes("rate_limit") && !nameless.text.includes("human_check")) {
    throw new Error("nameless event replied " + nameless.status + " " + clip(nameless.text));
  }
```

### E18 audit list  (`tools/security/run_penetration_audit.mjs`, serves F5)

Why: renames PT-19 and PT-20 and adds PT-23

Find (exactly once):

```mjs
  ["PT-19", "Survey spam stops at 5 an hour", liveSurveyRate],
  ["PT-20", "Event spam stops at 60 a minute", liveEventRateAndIdentity],
  ["PT-21", "Research copies and build input are not deployable", deployLeakPaths],
  ["PT-22", "Message desk hides authors, help notes, and receipts", liveDeskClosed]
];

if (tests.length !== 22) throw new Error("expected 22 tests, found " + tests.length);
```

Replace with:

```mjs
  ["PT-19", "Guest surveys need a human pass", liveSurveyRate],
  ["PT-20", "Guest events need an identity and a human pass", liveEventRateAndIdentity],
  ["PT-21", "Research copies and build input are not deployable", deployLeakPaths],
  ["PT-22", "Message desk hides authors, help notes, and receipts", liveDeskClosed],
  ["PT-23", "A human pass cannot be granted without the edge key", liveHumanPassGrantClosed]
];

if (tests.length !== 23) throw new Error("expected 23 tests, found " + tests.length);
```

**What does NOT change:** member sign-in, member writes, progress saving, quizzes, certificates, the rate limits themselves, and every page's look. Pages load no Turnstile code until a guest has something to save. The database is not touched by `apply.js`: the two SQL files are run by hand afterwards, in the order below.

**After `gate post` passes (live steps, each confirmed with you):**
1. Run `tools/supabase-human-pass.sql` in Supabase. It creates the tables and functions but enforces nothing yet.
2. You create a long random key, add it in Cloudflare Pages as `HUMAN_PASS_KEY`, add the Turnstile secret as `TURNSTILE_SECRET`, and store the key's hash with `insert into public.exhibit_edge_keys (name, key_hash) values ('human_pass', encode(extensions.digest('<the key>', 'sha256'), 'hex'));`. I never see or type either secret.
3. Commit, push, deploy. Check that a guest visit gets a pass (a row in `exhibit_human_passes`).
4. Only then run `tools/supabase-human-pass-enforce.sql`, and run `npm run test:security` (PT-19, PT-20, PT-23 now write nothing).
5. Rollback: `drop trigger exhibit_events_human_pass on public.exhibit_events; drop trigger exhibit_surveys_human_pass on public.exhibit_surveys;` then `npm run rollback` if needed.

## 7. Measured facts (verbatim from prove.js)
```text
apply (dry-run copy)               114 ms  applied 26 edits to 16 files
generate (dry-run copy)             71 ms  exit 0
make-expected                     4672 ms  expected.json written: 756 baseline files; changed: 404.html, _headers, _routes.json, account.html, functions/_middleware.js, gallery.html, index.html, insights.html, js/shared/human-pass.js, js/shared/insights.js, js/shared/ops.js, map.html, privacy.html, reviews.html, study.html, tests/unit/human-pass.test.mjs, tools/security/run_penetration_audit.mjs, tools/supabase-human-pass-enforce.sql, tools/supabase-human-pass.sql, tools/verify-headers.mjs
tamper-test (+ full gate post)  582181 ms  TAMPER-TEST: PASS  (control passed; 24 tampers)
scope-report pristine              135 ms  SCOPE VERDICT: READY  (26 edit(s) pending, 0 already applied)
scope-report dry-run               122 ms  SCOPE VERDICT: ALREADY APPLIED  (0 edit(s) pending, 26 already applied)
scope-report (real project)        136 ms  SCOPE VERDICT: READY  (26 edit(s) pending, 0 already applied)
gate pre (real project)          18233 ms  RESULT: PASS  (39/39 checks passed, mode=pre)

# make-expected
expected.json written: 756 baseline files; changed: 404.html, _headers, _routes.json, account.html, functions/_middleware.js, gallery.html, index.html, insights.html, js/shared/human-pass.js, js/shared/insights.js, js/shared/ops.js, map.html, privacy.html, reviews.html, study.html, tests/unit/human-pass.test.mjs, tools/security/run_penetration_audit.mjs, tools/supabase-human-pass-enforce.sql, tools/supabase-human-pass.sql, tools/verify-headers.mjs
tests before {"pass":84,"fail":0} (exit 0) -> after {"pass":101,"fail":0} (exit 0)
  anchor functions/_middleware.js:198 x1  if (path === "/__rate" && request.method === "POST") return rateProxy(
  anchor functions/_middleware.js:143 x1  async function servePage(context, request) {
  anchor js/shared/insights.js:200 x1  if (flushing || optedOut() || !consented()) return Promise.resolve();
  anchor js/shared/insights.js:336 x1  return pair.client.from('exhibit_surveys').insert(Object.assign({
  anchor js/shared/ops.js:88 x1  window.SiteOps = { report: report, flush: flush };
  anchor _headers:9 x1  frame-src 'none';
  anchor _routes.json:5 x1  "/__rate",
  anchor tools/security/run_penetration_audit.mjs:849 x1  ["PT-19", "Survey spam stops at 5 an hour", liveSurveyRate],
  anchor tools/supabase-audit-fixes-2026-11.sql:3 x1  create or replace function public.exhibit_events_rate_gate()
  anchor tools/supabase-audit-fixes-2026-11.sql:50 x1  create or replace function public.exhibit_surveys_rate_gate()
  anchor js/shared/auth-config.js:4 x1  turnstileSiteKey: "0x4AAAAAAFbbppkuIdZRVoHz",

# tamper-test (its control is the full dry-run gate post)
control: gate post on the dry-run copy (full, with mutation tests)…
  OK    control must PASS -> RESULT: PASS  (57/57 checks passed, mode=post)  [DRY-RUN]
  OK    plan never applied (pristine copy) -> RESULT: FAIL  (13/35 checks passed, mode=post)   caught by: S1  exactly these files changed: 404.html, _headers, , X-404.html  404.html is byte-identical to the dry-run, X-_headers  _headers is byte-identical to the dry-run, X-_routes.json  _routes.json is byte-identical to the
  OK    a stray file was added -> RESULT: FAIL  (33/35 checks passed, mode=post)   caught by: S1  exactly these files changed: 404.html, _headers, , S2  no file was added or deleted, apart from the decl
  OK    edited file drifted by one byte: functions/_middleware.js -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-functions/_middleware.js  functions/_middleware.js 
  OK    edited file drifted by one byte: _routes.json -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-_routes.json  _routes.json is byte-identical to the
  OK    edited file drifted by one byte: _headers -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-_headers  _headers is byte-identical to the dry-run
  OK    edited file drifted by one byte: tools/verify-headers.mjs -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-tools/verify-headers.mjs  tools/verify-headers.mjs 
  OK    edited file drifted by one byte: js/shared/insights.js -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-js/shared/insights.js  js/shared/insights.js is byt
  OK    edited file drifted by one byte: js/shared/ops.js -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-js/shared/ops.js  js/shared/ops.js is byte-identica
  OK    edited file drifted by one byte: 404.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-404.html  404.html is byte-identical to the dry-run
  OK    edited file drifted by one byte: account.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-account.html  account.html is byte-identical to the
  OK    edited file drifted by one byte: gallery.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-gallery.html  gallery.html is byte-identical to the
  OK    edited file drifted by one byte: index.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-index.html  index.html is byte-identical to the dry
  OK    edited file drifted by one byte: insights.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-insights.html  insights.html is byte-identical to t
  OK    edited file drifted by one byte: map.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-map.html  map.html is byte-identical to the dry-run
  OK    edited file drifted by one byte: reviews.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-reviews.html  reviews.html is byte-identical to the
  OK    edited file drifted by one byte: study.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-study.html  study.html is byte-identical to the dry
  OK    edited file drifted by one byte: privacy.html -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-privacy.html  privacy.html is byte-identical to the
  OK    edited file drifted by one byte: tools/security/run_penetration_audit.mjs -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-tools/security/run_penetration_audit.mjs  tools/sec
  OK    an out-of-scope file was changed: .cursor/skills/complexity-ceiling/SKILL.md -> RESULT: FAIL  (33/35 checks passed, mode=post)   caught by: S1  exactly these files changed: 404.html, _headers, , S3  the other 740 files are byte-identical to the bas
  OK    generated file left stale: js/shared/human-pass.js -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-js/shared/human-pass.js  js/shared/human-pass.js is
  OK    generated file left stale: tools/supabase-human-pass.sql -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-tools/supabase-human-pass.sql  tools/supabase-human
  OK    generated file left stale: tools/supabase-human-pass-enforce.sql -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-tools/supabase-human-pass-enforce.sql  tools/supaba
  OK    generated file left stale: tests/unit/human-pass.test.mjs -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-tests/unit/human-pass.test.mjs  tests/unit/human-pa
  OK    half-applied: edit "E1 edge pass route" undone -> RESULT: FAIL  (34/35 checks passed, mode=post)   caught by: X-functions/_middleware.js  functions/_middleware.js 
TAMPER-TEST: PASS  (control passed; 24 tampers)

PIN fix-plan/gate.js sha256 da309b371809b6b949c29fb47d23c3804fe1d074a3baf759d415c46370ea6f54
PIN fix-plan/expected.json sha256 aa25cd2c6b17c3259717cc9403d9bb06b2182c03d11f6c7f3ae88a0b0d36ceb6
```

## 8. Not measured
- The SQL ran on a local PGlite database (`sources/sql-harness-output.txt`), with `extensions.digest` replaced by PostgreSQL's `sha256()` because PGlite has no pgcrypto. The live database has pgcrypto in `extensions` and its digest gave the correct sha256 hash of `abc` (`sources/live-db-check.txt`). The SQL itself has not run on the live database: not run.
- Turnstile in a real browser, the managed widget's look, and Cloudflare's `siteverify` reply format: not measured. The unit tests use stand-ins.
- Whether the Turnstile widget for site key `0x4AAAAAAFbbppkuIdZRVoHz` is set to Managed and allows the site's hostname: not checked.
- Whether Turnstile also needs `connect-src`: not checked; only `script-src` and `frame-src` are added.
- The browser suite (`npm test`) and the live audit (`npm run test:security`) are outside the gate; they run after `gate post`.
- Edge request volume added by `/__human-pass` (one call per guest visit that writes): not measured.

## 9. Execution report (only these statements)
1. The scope analysis summary under the four headings, and the SCOPE VERDICT line.
2. Both `RESULT:` lines and both report paths with their hashes.
3. The S1 line (files changed) and the H1 line (test tally).
4. Anything not run, marked "not run".
