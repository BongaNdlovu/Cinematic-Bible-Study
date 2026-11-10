# Plan: Close the security audit findings

**Status: executed; `gate pre` and `gate post` both passed.** A later sign-out change to `js/shared/auth.js` and `tests/unit/sentry.test.mjs` was made outside this plan, so `gate post` no longer matches the working tree. Every number was measured, and `gate pre` re-checks it before anything changes.

<!-- Fields with "=" inside double braces are filled by render-plan.js from tool output. The other double-brace fields are
     prose you write from this session's tool output. `render-plan.js <project> --check` must PASS before reporting. -->

## 1. Goal
A security audit found seven problems that code can fix: signed-in users could skip the write limit on events and surveys, the quiz returned the answer key on a wrong pick, error reports recreated the analytics ID without consent, the dev server accepted any Host header, HEAD requests skipped the rate gate, the CSP allowed every Sentry project and sent no COOP header, and workflow actions were pinned by tag. Nothing fails in the suite today, because no test covered these. The end state is the same suite plus the new tests, all passing, with each fix protected by a mutation; the before and after tallies are in section 7.

| # | Problem (exact test name or symptom) | Cause (file:line from an anchor) | Kind | Fix |
|---|---|---|---|---|
| F1 | A signed-in row with a fresh `anon_id` skips the per-user cap | `tools/supabase-hardening-2026-10.sql`, the `anon_id` branch runs first | Real bug | Signed-in rows take a per-user slot before the `anon_id` branch, in every copy of both gates |
| F2 | The quiz returns the answer key on a wrong pick | `tools/supabase-rate-limits-gaps.sql`, `correct_idx` is returned whatever was picked | Decision: hide the right answer after a wrong pick (rejected: also cap tries; leave as is) | `correct_idx` is returned only for a correct pick, in every copy |
| F3 | Error reports recreate the analytics ID without consent | `js/shared/ops.js`, `anonId()` has no consent check | Real bug; Decision: update the privacy page too (rejected: code only) | Without consent a visit-only sessionStorage ID is used, and `privacy.html` names it |
| F4 | The dev server answers any Host header | `server.py`, `send_head` has no Host check | Real bug | A Host that is not the server's own loopback address is refused |
| F5 | HEAD requests skip the rate gate | `functions/_middleware.js`, HEAD returns before the gate | Real bug | Only OPTIONS skips the gate; HEAD still loads when the gate is down |
| F6 | The CSP allows every Sentry project and no COOP header is sent | `_headers`, wildcard ingest host | Real bug | connect-src names the one project host and a COOP header is set |
| F7 | Workflow actions are pinned by tag and the deploy job has no environment | `.github/workflows/ci.yml` and `health.yml` | Real bug | Actions are pinned to commits and the deploy job declares production |

Out of scope, unchanged before and after: none.

## 2. Scope
- **Edited:** `tools/supabase-hardening-2026-10.sql`, `tools/supabase-rate-limits.sql`, `tools/supabase-insights.sql`, `tools/supabase-progress.sql`, `tools/verify/verify_ratelimit.mjs`, `tools/supabase-rate-limits-gaps.sql`, `tools/supabase-quiz-integrity.sql`, `tools/supabase-pending-migrations.sql`, `tools/verify/verify_quiz_integrity.mjs`, `js/shared/ops.js`, `privacy.html`, `tests/unit/sentry.test.mjs`, `server.py`, `tools/verify/verify_load.mjs`, `functions/_middleware.js`, `tests/unit/middleware.test.mjs`, `_headers`, `tools/verify-headers.mjs`, `.github/workflows/ci.yml`, `.github/workflows/health.yml`, `tools/verify/verify_pages_deny.mjs`, changed only by `node fix-plan/apply.js .`
- **Generated:** none, changed only by n/a
- **Everything else:** 1066 files stay byte-identical. No file is added or deleted.
- **Invariants:** none declared; the byte-for-byte manifest covers every file outside the edited list.

## 3. Hard rules (any violation = the plan FAILS)
1. **Fail closed.** Any `[FAIL]`, crash or timeout fails the plan. Never edit the gate, `config.js` or `expected.json`
   to get past one. Restore the backups and report.
2. **No hand edits.** Only `apply.js` changes edited files: each edit is applied exactly once, or nothing is written.
3. **No weakened tests.** Changed files must be byte-identical to the dry run. No test may be renamed, dropped, skipped
   or made always-true. The gate breaks the fixed code in 12 way(s), and each must be caught.
4. **Zero hallucination.** Report only what the gate or a tool printed. Write "not run" or "not measured" for
   anything else.
5. **Pinned tooling.**
   - `fix-plan/gate.js` sha256 `61bb8519de3de0ebba8c7436fb1703e6d182797e72b351eb1c56f0d13586a587`
   - `fix-plan/expected.json` sha256 `9f82bc42aed22a88c5db0dcb3dc0aef1e4f5a488ff13d35aba3596ebf7edd239`

   The gate pins the other files itself.
6. **Real run only.** The final `RESULT:` lines must not contain `DRY-RUN`.

## 4. Before execution: scope analysis
Read-only. Check the pins, run `node fix-plan/scope-report.js` (required: `SCOPE VERDICT: READY`), read sections 1–2
and 6 and `fix-plan/edits.js`, and grep the callers and tests of each edit site.

Present it under four headings, citing `file:line`:
- **Scope covered:** 21 file(s) change (`.github/workflows/ci.yml`, `.github/workflows/health.yml`, `_headers`, `functions/_middleware.js`, `js/shared/ops.js`, `privacy.html`, `server.py`, `tests/unit/middleware.test.mjs`, `tests/unit/sentry.test.mjs`, `tools/supabase-hardening-2026-10.sql`, `tools/supabase-insights.sql`, `tools/supabase-pending-migrations.sql`, `tools/supabase-progress.sql`, `tools/supabase-quiz-integrity.sql`, `tools/supabase-rate-limits-gaps.sql`, `tools/supabase-rate-limits.sql`, `tools/verify-headers.mjs`, `tools/verify/verify_load.mjs`, `tools/verify/verify_pages_deny.mjs`, `tools/verify/verify_quiz_integrity.mjs`, `tools/verify/verify_ratelimit.mjs`) and 1066 stay identical.
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
node fix-plan/gate.js pre     # required: RESULT: PASS (54/54 checks passed, mode=pre); writes backups
node fix-plan/apply.js .      # required: applied 42 edits to 21 files
# no generate step: this plan has no generated files
node fix-plan/gate.js post    # required: RESULT: PASS (48/48 checks passed, mode=post)
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
### E1.1 tools/supabase-hardening-2026-10.sql  (`tools/supabase-hardening-2026-10.sql`, serves F1)

Why: a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first

Find (exactly once):

```sql
begin
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_events
```

Replace with:

```sql
begin
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');
    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_events
```

### E1.2 tools/supabase-hardening-2026-10.sql  (`tools/supabase-hardening-2026-10.sql`, serves F1)

Why: a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first

Find (exactly once):

```sql
begin
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_surveys
```

Replace with:

```sql
begin
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('survey', 5, interval '1 hour');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_surveys
```

### E2.1 tools/supabase-rate-limits.sql  (`tools/supabase-rate-limits.sql`, serves F1)

Why: a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy, so a re-run cannot undo the fix)

Find (exactly once):

```sql
begin
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_events
```

Replace with:

```sql
begin
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');
    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_events
```

### E2.2 tools/supabase-rate-limits.sql  (`tools/supabase-rate-limits.sql`, serves F1)

Why: a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy, so a re-run cannot undo the fix)

Find (exactly once):

```sql
begin
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_surveys
```

Replace with:

```sql
begin
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('survey', 5, interval '1 hour');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_surveys
```

### E3.1 tools/supabase-insights.sql  (`tools/supabase-insights.sql`, serves F1)

Why: a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy of the events gate)

Find (exactly once):

```sql
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
```

Replace with:

```sql
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');
    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
```

### E4.1 tools/supabase-progress.sql  (`tools/supabase-progress.sql`, serves F1)

Why: a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy of the surveys gate)

Find (exactly once):

```sql
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
```

Replace with:

```sql
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('survey', 5, interval '1 hour');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
```

### E5.1 tools/verify/verify_ratelimit.mjs  (`tools/verify/verify_ratelimit.mjs`, serves F1)

Why: checks that every copy of both gates caps signed-in rows per user before the anon_id branch

Find (exactly once):

```mjs
const insightsSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-insights.sql'), 'utf8');
assert(insightsSql.includes('exhibit_events_rate_gate'), 'insights setup must include events write cap');
```

Replace with:

```mjs
const insightsSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-insights.sql'), 'utf8');

function signedInBlock(src, file, gateName) {
  const start = src.indexOf('create or replace function public.' + gateName + '()');
  assert(start >= 0, file + ' must define ' + gateName);
  const body = src.slice(start, src.indexOf('$$;', start));
  const open = body.indexOf('if new.user_id is not null then');
  const anon = body.indexOf("if coalesce(new.anon_id, '') <> '' then");
  assert(anon >= 0, file + ' ' + gateName + ' must keep the anon_id check');
  assert(open >= 0 && open < anon, file + ' ' + gateName + ' must cap signed-in rows per user before the anon_id check');
  const block = body.slice(open, body.indexOf('end if;', open));
  assert(block.includes('return new;'), file + ' ' + gateName + ' signed-in block must return before the anon_id check');
  return block;
}

function assertEventsUserCap(src, file) {
  const block = signedInBlock(src, file, 'exhibit_events_rate_gate');
  assert(block.includes("perform public.exhibit_take_slot('event_min', 60, interval '1 minute');"), file + ' events gate must cap a signed-in user at 60/min whatever anon_id is sent');
  assert(block.includes("perform public.exhibit_take_slot('event_day', 2000, interval '1 day');"), file + ' events gate must cap a signed-in user at 2000/day whatever anon_id is sent');
}

function assertSurveysUserCap(src, file) {
  const block = signedInBlock(src, file, 'exhibit_surveys_rate_gate');
  assert(block.includes("perform public.exhibit_take_slot('survey', 5, interval '1 hour');"), file + ' surveys gate must cap a signed-in user at 5/hour whatever anon_id is sent');
}

const hardeningSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-hardening-2026-10.sql'), 'utf8');
assertEventsUserCap(hardeningSql, 'supabase-hardening-2026-10.sql');
assertSurveysUserCap(hardeningSql, 'supabase-hardening-2026-10.sql');
assertEventsUserCap(sql, 'supabase-rate-limits.sql');
assertSurveysUserCap(sql, 'supabase-rate-limits.sql');
assertEventsUserCap(insightsSql, 'supabase-insights.sql');
assert(insightsSql.includes('exhibit_events_rate_gate'), 'insights setup must include events write cap');
```

### E5.2 tools/verify/verify_ratelimit.mjs  (`tools/verify/verify_ratelimit.mjs`, serves F1)

Why: checks that every copy of both gates caps signed-in rows per user before the anon_id branch

Find (exactly once):

```mjs
const progressSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-progress.sql'), 'utf8');
assert(progressSql.includes('exhibit_surveys_rate_gate'), 'progress setup must include surveys write cap');
```

Replace with:

```mjs
const progressSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-progress.sql'), 'utf8');
assertSurveysUserCap(progressSql, 'supabase-progress.sql');
assert(progressSql.includes('exhibit_surveys_rate_gate'), 'progress setup must include surveys write cap');
```

### E6.1 tools/supabase-rate-limits-gaps.sql  (`tools/supabase-rate-limits-gaps.sql`, serves F2)

Why: verify_quiz_answer returned the answer key on a wrong pick; it now returns correct_idx only for a correct pick

Find (exactly once):

```sql
    'correct', v_correct,
    'correct_idx', v_key.correct_idx,
    'note', case when v_correct then v_key.correct_note else '' end
```

Replace with:

```sql
    'correct', v_correct,
    'correct_idx', case when v_correct then v_key.correct_idx end,
    'note', case when v_correct then v_key.correct_note else '' end
```

### E7.1 tools/supabase-quiz-integrity.sql  (`tools/supabase-quiz-integrity.sql`, serves F2)

Why: verify_quiz_answer returned the answer key on a wrong pick; it now returns correct_idx only for a correct pick (older copy)

Find (exactly once):

```sql
    'correct', v_correct,
    'correct_idx', v_key.correct_idx,
    'note', case when v_correct then v_key.correct_note else '' end
```

Replace with:

```sql
    'correct', v_correct,
    'correct_idx', case when v_correct then v_key.correct_idx end,
    'note', case when v_correct then v_key.correct_note else '' end
```

### E8.1 tools/supabase-pending-migrations.sql  (`tools/supabase-pending-migrations.sql`, serves F2)

Why: verify_quiz_answer returned the answer key on a wrong pick; it now returns correct_idx only for a correct pick (older copy)

Find (exactly once):

```sql
    'correct', v_correct,
    'correct_idx', v_key.correct_idx,
    'note', case when v_correct then v_key.correct_note else '' end
```

Replace with:

```sql
    'correct', v_correct,
    'correct_idx', case when v_correct then v_key.correct_idx end,
    'note', case when v_correct then v_key.correct_note else '' end
```

### E9.1 tools/verify/verify_quiz_integrity.mjs  (`tools/verify/verify_quiz_integrity.mjs`, serves F2)

Why: checks all three SQL copies and models a wrong-pick reply with no key

Find (exactly once):

```mjs
assert.ok(pending.includes("insert into public.exhibit_quiz_passes"), "re-running the pending bundle keeps recording passes");
const seed = new Set();
```

Replace with:

```mjs
assert.ok(pending.includes("insert into public.exhibit_quiz_passes"), "re-running the pending bundle keeps recording passes");
["tools/supabase-rate-limits-gaps.sql", "tools/supabase-quiz-integrity.sql", "tools/supabase-pending-migrations.sql"].forEach((rel) => {
  const src = read(rel);
  const start = src.indexOf("create or replace function public.verify_quiz_answer(");
  assert.ok(start >= 0, `${rel} defines verify_quiz_answer`);
  const body = src.slice(start, src.indexOf("$$;", start));
  assert.ok(body.includes("'correct_idx', case when v_correct then v_key.correct_idx end,"), `${rel}: verify_quiz_answer returns correct_idx only for a correct pick`);
  assert.strictEqual(/'correct_idx',s*v_key.correct_idxs*[,)]/.test(src), false, `${rel}: verify_quiz_answer must not return correct_idx whatever was picked`);
});
const seed = new Set();
```

### E9.2 tools/verify/verify_quiz_integrity.mjs  (`tools/verify/verify_quiz_integrity.mjs`, serves F2)

Why: checks all three SQL copies and models a wrong-pick reply with no key

Find (exactly once):

```mjs

rpcReply = { data: { correct: false, correct_idx: 1, note: "" }, error: null };
res = await QuizGate.verify(0, 0, 3);
```

Replace with:

```mjs

rpcReply = { data: { correct: false, correct_idx: null, note: "" }, error: null };
res = await QuizGate.verify(0, 0, 3);
```

### E9.3 tools/verify/verify_quiz_integrity.mjs  (`tools/verify/verify_quiz_integrity.mjs`, serves F2)

Why: checks all three SQL copies and models a wrong-pick reply with no key

Find (exactly once):

```mjs
assert.strictEqual(res.correct, false, "a wrong answer is graded false");
assert.strictEqual(res.correctIdx, 1, "the server reveals the right option only after a pick");
```

Replace with:

```mjs
assert.strictEqual(res.correct, false, "a wrong answer is graded false");
assert.strictEqual(res.correctIdx, null, "a wrong pick does not reveal which option is right");
```

### E10.1 js/shared/ops.js  (`js/shared/ops.js`, serves F3)

Why: error reports recreated the analytics ID without consent; without consent they now use a visit-only sessionStorage ID

Find (exactly once):

```js

  function anonId() {
```

Replace with:

```js

  function hasAnalyticsConsent() {
    return !!(window.SODConsent && typeof window.SODConsent.has === "function" && window.SODConsent.has("analytics"));
  }

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "a_" + Date.now().toString(36);
  }

  function anonId() {
```

### E10.2 js/shared/ops.js  (`js/shared/ops.js`, serves F3)

Why: error reports recreated the analytics ID without consent; without consent they now use a visit-only sessionStorage ID

Find (exactly once):

```js
  function anonId() {
    try {
```

Replace with:

```js
  function anonId() {
    const consented = hasAnalyticsConsent();
    const key = consented ? "baInsightsAnon" : "baOpsAnon";
    try {
```

### E10.3 js/shared/ops.js  (`js/shared/ops.js`, serves F3)

Why: error reports recreated the analytics ID without consent; without consent they now use a visit-only sessionStorage ID

Find (exactly once):

```js
    try {
      let id = localStorage.getItem("baInsightsAnon");
      if (!id) {
        id = (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : "a_" + Date.now().toString(36);
        localStorage.setItem("baInsightsAnon", id);
      }
      return id;
```

Replace with:

```js
    try {
      const store = consented ? localStorage : sessionStorage;
      const existing = store.getItem(key);
      if (existing) return existing;
      const id = newId();
      store.setItem(key, id);
      return id;
```

### E11.1 privacy.html  (`privacy.html`, serves F3)

Why: the privacy page names the new visit-only key and the ID an error report carries

Find (exactly once):

```html
              <tr><td>Answer your messages to the operator</td><td>Subject, message, replies</td><td>Contract (answering your request); legitimate interests</td></tr>
              <tr><td>Find and fix errors on the site</td><td>The error message, the page and line where it happened, browser and device type, IP address, and, for one page load in ten, how long the page took to load</td><td>Legitimate interests (keeping the site working)</td></tr>
              <tr><td>Stop abuse and flooding</td><td>IP address at the hosting layer, request counts, technical reports</td><td>Legitimate interests (protecting the service)</td></tr>
```

Replace with:

```html
              <tr><td>Answer your messages to the operator</td><td>Subject, message, replies</td><td>Contract (answering your request); legitimate interests</td></tr>
              <tr><td>Find and fix errors on the site</td><td>The error message, the page and line where it happened, browser and device type, IP address, and, for one page load in ten, how long the page took to load. An error report stored by the site also carries a visit ID, or your account ID if you are signed in</td><td>Legitimate interests (keeping the site working)</td></tr>
              <tr><td>Stop abuse and flooding</td><td>IP address at the hosting layer, request counts, technical reports</td><td>Legitimate interests (protecting the service)</td></tr>
```

### E11.2 privacy.html  (`privacy.html`, serves F3)

Why: the privacy page names the new visit-only key and the ID an error report carries

Find (exactly once):

```html
              <tr><td>sb-ttlrspnfadmxkoyqvofh-auth-token</td><td>Your signed-in session, kept by Supabase</td></tr>
              <tr><td>baInsightsAnon, baInsightsSession, baInsightsQueue, baFlushWin, baSurveyTimes, baOpsQueue</td><td>Anonymous ID, visit ID, study events waiting to be sent, and limits on how often events and surveys are sent</td></tr>
              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>
```

Replace with:

```html
              <tr><td>sb-ttlrspnfadmxkoyqvofh-auth-token</td><td>Your signed-in session, kept by Supabase</td></tr>
              <tr><td>baInsightsAnon, baInsightsSession, baInsightsQueue, baFlushWin, baSurveyTimes, baOpsQueue, baOpsAnon</td><td>Anonymous ID, visit ID, study events waiting to be sent, limits on how often events and surveys are sent, and a visit-only ID attached to error reports, removed when the tab closes</td></tr>
              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>
```

### E12.1 tests/unit/sentry.test.mjs  (`tests/unit/sentry.test.mjs`, serves F3)

Why: tests the consent behaviour of ops.js and the privacy wording

Find (exactly once):

```mjs

for (const rel of ["../../functions/_middleware.js", "../../workers/exhibit-rate-gate/src/index.js"]) {
```

Replace with:

```mjs

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
```

### E13.1 server.py  (`server.py`, serves F4)

Why: the dev server answered any Host header; it now refuses a Host that is not its own loopback address

Find (exactly once):

```py

    def send_head(self):
```

Replace with:

```py

    def is_local_host_header(self):
        port = str(self.server.server_address[1])
        return self.headers.get("Host", "").lower() in ("127.0.0.1:" + port, "localhost:" + port)

    def send_head(self):
```

### E13.2 server.py  (`server.py`, serves F4)

Why: the dev server answered any Host header; it now refuses a Host that is not its own loopback address

Find (exactly once):

```py
        """Serve byte ranges for large media so <audio>/<video> can seek."""
        range_header = self.headers.get("Range")
```

Replace with:

```py
        """Serve byte ranges for large media so <audio>/<video> can seek."""
        if not self.is_local_host_header():
            self.send_error(403, "Host not allowed")
            return None
        range_header = self.headers.get("Range")
```

### E14.1 tools/verify/verify_load.mjs  (`tools/verify/verify_load.mjs`, serves F4)

Why: checks that a foreign Host header gets 403

Find (exactly once):

```mjs
import assert from "assert";
import path from "path";
```

Replace with:

```mjs
import assert from "assert";
import http from "http";
import path from "path";
```

### E14.2 tools/verify/verify_load.mjs  (`tools/verify/verify_load.mjs`, serves F4)

Why: checks that a foreign Host header gets 403

Find (exactly once):

```mjs
  console.log("40 overlapping local study reads returned 200");
} finally {
```

Replace with:

```mjs
  console.log("40 overlapping local study reads returned 200");
  const foreign = await new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: port, path: "/study.html", agent: false, headers: { Host: "evil.example:" + port } }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode, body: body }));
    });
    req.on("error", reject);
    req.end();
  });
  assert.strictEqual(foreign.status, 403, "a request with a foreign Host header must be refused\n" + log);
  assert.ok(!/<html[\s>][\s\S]*<script/i.test(foreign.body), "a refused request must not carry the page");
  console.log("A request with a foreign Host header is refused with 403");
} finally {
```

### E15.1 functions/_middleware.js  (`functions/_middleware.js`, serves F5)

Why: HEAD requests skipped the rate gate; only OPTIONS skips it now, and HEAD still loads when the gate is down

Find (exactly once):

```js

async function handle(context) {
```

Replace with:

```js

function isRead(request) {
  return request.method === "GET" || request.method === "HEAD";
}

async function handle(context) {
```

### E15.2 functions/_middleware.js  (`functions/_middleware.js`, serves F5)

Why: HEAD requests skipped the rate gate; only OPTIONS skips it now, and HEAD still loads when the gate is down

Find (exactly once):

```js
  if (path === "/csp-report" && request.method === "POST") return takeReport(context, request);
  if (request.method === "OPTIONS" || request.method === "HEAD") return context.next();
  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);
```

Replace with:

```js
  if (path === "/csp-report" && request.method === "POST") return takeReport(context, request);
  if (request.method === "OPTIONS") return context.next();
  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);
```

### E15.3 functions/_middleware.js  (`functions/_middleware.js`, serves F5)

Why: HEAD requests skipped the rate gate; only OPTIONS skips it now, and HEAD still loads when the gate is down

Find (exactly once):

```js
  if (decision === "deny" || decision === "deny_first") return denied();
  if (decision === "down" && request.method !== "GET") return unavailable();
  return servePage(context, request);
```

Replace with:

```js
  if (decision === "deny" || decision === "deny_first") return denied();
  if (decision === "down" && !isRead(request)) return unavailable();
  return servePage(context, request);
```

### E16.1 tests/unit/middleware.test.mjs  (`tests/unit/middleware.test.mjs`, serves F5)

Why: tests HEAD counting, the OPTIONS bypass and HEAD when the gate is down

Find (exactly once):

```mjs

test("allowed .html pages are served without a redirect", async () => {
```

Replace with:

```mjs

test("a HEAD request to a page is counted by the gate", async () => {
  const res = await onRequest(context("/study", { method: "HEAD", verdict: { ok: false, first: false } }));
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
});

test("OPTIONS requests skip the gate", async () => {
  const res = await onRequest(context("/study", { method: "OPTIONS", verdict: { ok: false, first: false } }));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "next");
});

test("when the gate is down, a HEAD request still loads", async () => {
  const thrown = await onRequest(context("/study", { method: "HEAD", verdict: "throw" }));
  assert.equal(thrown.status, 200);
  const unbound = await onRequest(context("/study", { method: "HEAD", verdict: "missing" }));
  assert.equal(unbound.status, 200);
});

test("allowed .html pages are served without a redirect", async () => {
```

### E17.1 _headers  (`_headers`, serves F6)

Why: connect-src allowed every Sentry project and no COOP header was sent; it now names the one project host and sets COOP

Find (exactly once):

```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com 'sha256-E+aslqeud2eI1AxDzL4z/9Ov6zN9Ey+Sh7T5l4FSIkU=' 'sha256-ubcWAwNhdVeBfiRtLCSZVQ4g28MLL98xiQn5MsM8j8w=' 'sha256-/1QaprhjwN9kNwJKPf6Qw6O8O2f+syHifIpg/SJytdc=' 'sha256-JFIeDuj5EjAu2b8xcO7xFcxrQskGD1L6L50UmZiPwrY=' 'sha256-qDijm4ZMNArSFBE4jRo07Lzj4qXQokVve4ODLNv6134=' 'sha256-ZJUtJPcmPfGj7n53X0puoa050LmqMu7Gd/2KE+bQJak=' 'sha256-xibdK9otoj51oMcQYdeItJwnN+IWaqnyoZgwXIOLV3M=' 'sha256-kcQdYQ3/pccQdahZjufezkFwqTxdGZLXJcku8kxnJzY='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.arcgisonline.com https://*.ggpht.com https://*.googleusercontent.com; connect-src 'self' blob: https://ttlrspnfadmxkoyqvofh.supabase.co wss://ttlrspnfadmxkoyqvofh.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com https://*.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://cloudflareinsights.com https://static.cloudflareinsights.com https://*.ingest.de.sentry.io; worker-src 'self' blob:; media-src 'self' blob:; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-report
```

Replace with:

```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com 'sha256-E+aslqeud2eI1AxDzL4z/9Ov6zN9Ey+Sh7T5l4FSIkU=' 'sha256-ubcWAwNhdVeBfiRtLCSZVQ4g28MLL98xiQn5MsM8j8w=' 'sha256-/1QaprhjwN9kNwJKPf6Qw6O8O2f+syHifIpg/SJytdc=' 'sha256-JFIeDuj5EjAu2b8xcO7xFcxrQskGD1L6L50UmZiPwrY=' 'sha256-qDijm4ZMNArSFBE4jRo07Lzj4qXQokVve4ODLNv6134=' 'sha256-ZJUtJPcmPfGj7n53X0puoa050LmqMu7Gd/2KE+bQJak=' 'sha256-xibdK9otoj51oMcQYdeItJwnN+IWaqnyoZgwXIOLV3M=' 'sha256-kcQdYQ3/pccQdahZjufezkFwqTxdGZLXJcku8kxnJzY='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.arcgisonline.com https://*.ggpht.com https://*.googleusercontent.com; connect-src 'self' blob: https://ttlrspnfadmxkoyqvofh.supabase.co wss://ttlrspnfadmxkoyqvofh.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com https://*.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://cloudflareinsights.com https://static.cloudflareinsights.com https://o4512321608679424.ingest.de.sentry.io; worker-src 'self' blob:; media-src 'self' blob:; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-report
```

### E18.1 tools/verify-headers.mjs  (`tools/verify-headers.mjs`, serves F6)

Why: checks the COOP header and the exact Sentry host

Find (exactly once):

```mjs
assert(rootH['strict-transport-security']?.value?.includes('max-age=31536000'), 'Strict-Transport-Security is enabled');
assert(!rootH['access-control-allow-origin'], 'Access-Control-Allow-Origin is NOT restricted on "/*" (avoids breaking preview deployments)');
```

Replace with:

```mjs
assert(rootH['strict-transport-security']?.value?.includes('max-age=31536000'), 'Strict-Transport-Security is enabled');
assert(rootH['cross-origin-opener-policy']?.value === 'same-origin-allow-popups', 'Cross-Origin-Opener-Policy is same-origin-allow-popups');
assert(!rootH['access-control-allow-origin'], 'Access-Control-Allow-Origin is NOT restricted on "/*" (avoids breaking preview deployments)');
```

### E18.2 tools/verify-headers.mjs  (`tools/verify-headers.mjs`, serves F6)

Why: checks the COOP header and the exact Sentry host

Find (exactly once):

```mjs

// Verify Cloudflare Insights
```

Replace with:

```mjs

const sentryConfig = fs.readFileSync(path.join(root, 'js', 'shared', 'sentry.js'), 'utf8');
const sentryHost = (/@([a-z0-9]+\.ingest\.[a-z0-9.]*sentry\.io)\//.exec(sentryConfig) || [])[1];
assert(sentryHost, 'js/shared/sentry.js names the Sentry project ingest host');
assert(cspDirectives['connect-src']?.includes(`https://${sentryHost}`), `CSP connect-src includes https://${sentryHost}`);
assert(!cspDirectives['connect-src']?.some(v => v.includes('*.ingest.')), 'CSP connect-src no longer allows every Sentry project');

// Verify Cloudflare Insights
```

### E19.1 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
```

Replace with:

```yml
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: "22"
```

### E19.2 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
          cache: npm
      - uses: actions/setup-python@v5
        with:
```

Replace with:

```yml
          cache: npm
      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5
        with:
```

### E19.3 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
    runs-on: windows-latest
    timeout-minutes: 40
```

Replace with:

```yml
    runs-on: windows-latest
    environment: production
    timeout-minutes: 40
```

### E19.4 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
      npm_config_yes: "true"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
```

Replace with:

```yml
      npm_config_yes: "true"
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: "22"
```

### E19.5 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: tools
```

Replace with:

```yml
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          sparse-checkout: tools
```

### E19.6 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
          sparse-checkout: tools
          filter: blob:none
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
```

Replace with:

```yml
          sparse-checkout: tools
          filter: blob:none
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: "22"
```

### E19.7 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: tools/ci
```

Replace with:

```yml
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          sparse-checkout: tools/ci
```

### E19.8 .github/workflows/ci.yml  (`.github/workflows/ci.yml`, serves F7)

Why: actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production

Find (exactly once):

```yml
          sparse-checkout: tools/ci
          filter: blob:none
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
```

Replace with:

```yml
          sparse-checkout: tools/ci
          filter: blob:none
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: "22"
```

### E20.1 .github/workflows/health.yml  (`.github/workflows/health.yml`, serves F7)

Why: actions were pinned by tag; they are pinned by commit

Find (exactly once):

```yml
    steps:
      - uses: actions/checkout@v4
        with:
```

Replace with:

```yml
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
```

### E20.2 .github/workflows/health.yml  (`.github/workflows/health.yml`, serves F7)

Why: actions were pinned by tag; they are pinned by commit

Find (exactly once):

```yml
          filter: blob:none
      - uses: actions/setup-node@v4
        with:
```

Replace with:

```yml
          filter: blob:none
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
```

### E21.1 tools/verify/verify_pages_deny.mjs  (`tools/verify/verify_pages_deny.mjs`, serves F7)

Why: checks that every action is pinned to a full commit and the deploy job declares production

Find (exactly once):

```mjs

console.log("The Pages stage drops operator files, the Vercel deploy path stays removed, and static folders skip the middleware without exposing protected paths");
```

Replace with:

```mjs

const workflowDir = path.join(ROOT, ".github/workflows");
for (const name of fs.readdirSync(workflowDir).filter((entry) => /\.ya?ml$/.test(entry))) {
  const usesLines = fs.readFileSync(path.join(workflowDir, name), "utf8").split(/\r?\n/).filter((line) => /^\s*(-\s+)?uses:/.test(line));
  for (const line of usesLines) {
    assert(/uses:\s+[\w.\/-]+@[0-9a-f]{40}(\s+#.*)?$/.test(line), name + " must pin every action to a full commit: " + line.trim());
  }
}
const deployJob = (/\n  deploy:\n([\s\S]*?)(?=\n  \S|$)/.exec(fs.readFileSync(path.join(workflowDir, "ci.yml"), "utf8").replace(/\r/g, "")) || ["", ""])[1];
assert(/^    environment: production$/m.test(deployJob), "the deploy job in ci.yml must declare environment: production");

console.log("The Pages stage drops operator files, the Vercel deploy path stays removed, and static folders skip the middleware without exposing protected paths");
```

No page layout, lesson content, study data or database table changes. The signed-out path of both gates is untouched. `js/shared/auth.js` is not part of this plan.

## 7. Measured facts (verbatim from prove.js)
```text
apply (dry-run copy)               100 ms  applied 42 edits to 21 files
make-expected                   306748 ms  expected.json written: 1087 baseline files; changed: .github/workflows/ci.yml, .github/workflows/health.yml, _headers, functions/_middleware.js, js/shared/ops.js, privacy.html, server.py, tests/unit/middleware.test.mjs, tests/unit/sentry.test.mjs, tools/supabase-hardening-2026-10.sql, tools/supabase-insights.sql, tools/supabase-pending-migrations.sql, tools/supabase-progress.sql, tools/supabase-quiz-integrity.sql, tools/supabase-rate-limits-gaps.sql, tools/supabase-rate-limits.sql, tools/verify-headers.mjs, tools/verify/verify_load.mjs, tools/verify/verify_pages_deny.mjs, tools/verify/verify_quiz_integrity.mjs, tools/verify/verify_ratelimit.mjs
tamper-test (+ full gate post)  673594 ms  TAMPER-TEST: PASS  (control passed; 25 tampers)
scope-report pristine              122 ms  SCOPE VERDICT: READY  (42 edit(s) pending, 0 already applied)
scope-report dry-run               117 ms  SCOPE VERDICT: ALREADY APPLIED  (0 edit(s) pending, 42 already applied)
scope-report (real project)        144 ms  SCOPE VERDICT: READY  (42 edit(s) pending, 0 already applied)
gate pre (real project)         163204 ms  RESULT: PASS  (54/54 checks passed, mode=pre)

# make-expected
expected.json written: 1087 baseline files; changed: .github/workflows/ci.yml, .github/workflows/health.yml, _headers, functions/_middleware.js, js/shared/ops.js, privacy.html, server.py, tests/unit/middleware.test.mjs, tests/unit/sentry.test.mjs, tools/supabase-hardening-2026-10.sql, tools/supabase-insights.sql, tools/supabase-pending-migrations.sql, tools/supabase-progress.sql, tools/supabase-quiz-integrity.sql, tools/supabase-rate-limits-gaps.sql, tools/supabase-rate-limits.sql, tools/verify-headers.mjs, tools/verify/verify_load.mjs, tools/verify/verify_pages_deny.mjs, tools/verify/verify_quiz_integrity.mjs, tools/verify/verify_ratelimit.mjs
tests before {"pass":74,"fail":0} (exit 0) -> after {"pass":81,"fail":0} (exit 0)
  anchor tools/supabase-hardening-2026-10.sql:70 x1  create or replace function public.exhibit_events_rate_gate()
  anchor tools/supabase-hardening-2026-10.sql:117 x1  create or replace function public.exhibit_surveys_rate_gate()
  anchor tools/supabase-hardening-2026-10.sql:78,125 x2  if coalesce(new.anon_id, '') <> '' then
  anchor tools/supabase-rate-limits-gaps.sql:18 x1  create or replace function public.exhibit_take_slot(p_bucket text, p_m
  anchor tools/supabase-rate-limits-gaps.sql:118 x1  'correct_idx', v_key.correct_idx,
  anchor tools/supabase-quiz-integrity.sql:59 x1  'correct_idx', v_key.correct_idx,
  anchor tools/supabase-pending-migrations.sql:135 x1  'correct_idx', v_key.correct_idx,
  anchor tools/supabase-progress.sql:133 x1  create or replace function public.exhibit_surveys_rate_gate()
  anchor js/shared/ops.js:9 x1  let id = localStorage.getItem("baInsightsAnon");
  anchor js/study/study-app.js:5718 x1  const correctIdx = typeof res.correctIdx === 'number' ? res.correctIdx
  anchor privacy.html:190 x1  baSurveyTimes, baOpsQueue</td>
  anchor server.py:72 x1  def send_head(self):
  anchor server.py:16 x1  HOST = "127.0.0.1"
  anchor functions/_middleware.js:193 x1  if (request.method === "OPTIONS" || request.method === "HEAD") return 
  anchor functions/_middleware.js:200 x1  if (decision === "down" && request.method !== "GET") return unavailabl
  anchor _headers:8 x1  https://*.ingest.de.sentry.io
  anchor _headers:7 x1  Strict-Transport-Security:
  anchor tools/verify-headers.mjs:114 x1  line.length <= 1950
  anchor .github/workflows/ci.yml:20,51,72,95 x4  uses: actions/checkout@v4
  anchor .github/workflows/ci.yml:21,52,76,99 x4  uses: actions/setup-node@v4
  anchor .github/workflows/ci.yml:25 x1  uses: actions/setup-python@v5
  anchor .github/workflows/ci.yml:41 x1  runs-on: windows-latest
  anchor .github/workflows/health.yml:23 x1  uses: actions/checkout@v4
  anchor js/shared/auth.js:378 x1  else clearPersonalData();

# tamper-test (its control is the full dry-run gate post)
control: gate post on the dry-run copy (full, with mutation tests)…
  OK    control must PASS -> RESULT: PASS  (48/48 checks passed, mode=post)  [DRY-RUN]
  OK    plan never applied (pristine copy) -> RESULT: FAIL  (8/30 checks passed, mode=post)   caught by: S1  exactly these files changed: .github/workflows/ci, X-.github/workflows/ci.yml  .github/workflows/ci.yml , X-.github/workflows/health.yml  .github/workflows/hea, X-_headers  _headers is byte-identical to the dry-run
  OK    a stray file was added -> RESULT: FAIL  (28/30 checks passed, mode=post)   caught by: S1  exactly these files changed: .github/workflows/ci, S2  no file was added or deleted
  OK    edited file drifted by one byte: tools/supabase-hardening-2026-10.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-hardening-2026-10.sql  tools/supabas
  OK    edited file drifted by one byte: tools/supabase-rate-limits.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-rate-limits.sql  tools/supabase-rate
  OK    edited file drifted by one byte: tools/supabase-insights.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-insights.sql  tools/supabase-insight
  OK    edited file drifted by one byte: tools/supabase-progress.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-progress.sql  tools/supabase-progres
  OK    edited file drifted by one byte: tools/verify/verify_ratelimit.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/verify/verify_ratelimit.mjs  tools/verify/ver
  OK    edited file drifted by one byte: tools/supabase-rate-limits-gaps.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-rate-limits-gaps.sql  tools/supabase
  OK    edited file drifted by one byte: tools/supabase-quiz-integrity.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-quiz-integrity.sql  tools/supabase-q
  OK    edited file drifted by one byte: tools/supabase-pending-migrations.sql -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-pending-migrations.sql  tools/supaba
  OK    edited file drifted by one byte: tools/verify/verify_quiz_integrity.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/verify/verify_quiz_integrity.mjs  tools/verif
  OK    edited file drifted by one byte: js/shared/ops.js -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-js/shared/ops.js  js/shared/ops.js is byte-identica
  OK    edited file drifted by one byte: privacy.html -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-privacy.html  privacy.html is byte-identical to the
  OK    edited file drifted by one byte: tests/unit/sentry.test.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tests/unit/sentry.test.mjs  tests/unit/sentry.test.
  OK    edited file drifted by one byte: server.py -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-server.py  server.py is byte-identical to the dry-r
  OK    edited file drifted by one byte: tools/verify/verify_load.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/verify/verify_load.mjs  tools/verify/verify_l
  OK    edited file drifted by one byte: functions/_middleware.js -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-functions/_middleware.js  functions/_middleware.js 
  OK    edited file drifted by one byte: tests/unit/middleware.test.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tests/unit/middleware.test.mjs  tests/unit/middlewa
  OK    edited file drifted by one byte: _headers -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-_headers  _headers is byte-identical to the dry-run
  OK    edited file drifted by one byte: tools/verify-headers.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/verify-headers.mjs  tools/verify-headers.mjs 
  OK    edited file drifted by one byte: .github/workflows/ci.yml -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-.github/workflows/ci.yml  .github/workflows/ci.yml 
  OK    edited file drifted by one byte: .github/workflows/health.yml -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-.github/workflows/health.yml  .github/workflows/hea
  OK    edited file drifted by one byte: tools/verify/verify_pages_deny.mjs -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/verify/verify_pages_deny.mjs  tools/verify/ve
  OK    an out-of-scope file was changed: .cursor/skills/complexity-ceiling/SKILL.md -> RESULT: FAIL  (28/30 checks passed, mode=post)   caught by: S1  exactly these files changed: .github/workflows/ci, S3  the other 1066 files are byte-identical to the ba
  OK    half-applied: edit "E1.1 tools/supabase-hardening-2026-10.sql" undone -> RESULT: FAIL  (29/30 checks passed, mode=post)   caught by: X-tools/supabase-hardening-2026-10.sql  tools/supabas
TAMPER-TEST: PASS  (control passed; 25 tampers)

PIN fix-plan/gate.js sha256 61bb8519de3de0ebba8c7436fb1703e6d182797e72b351eb1c56f0d13586a587
PIN fix-plan/expected.json sha256 9f82bc42aed22a88c5db0dcb3dc0aef1e4f5a488ff13d35aba3596ebf7edd239
```

## 8. Not measured
- The SQL was not run against a database by this plan: not measured here.
- Whether the F5 change has any effect in production: not measured by this plan. Pages are served as static files and do not pass through the middleware.
- Behaviour of the narrower connect-src in a real browser beyond `verify_csp_policy.mjs`: not investigated.
- The limits as seen by a signed-in learner on the live database: not measured.

## 9. Execution report (only these statements)
1. The scope analysis summary under the four headings, and the SCOPE VERDICT line.
2. Both `RESULT:` lines and both report paths with their hashes.
3. The S1 line (files changed) and the H1 line (test tally).
4. Anything not run, marked "not run".
