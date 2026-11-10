module.exports = [
 {
  "id": "E1.1 tools/supabase-hardening-2026-10.sql",
  "fixes": [
   "F1"
  ],
  "why": "a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first",
  "protectedBy": [
   "MU1",
   "MU2"
  ],
  "file": "tools/supabase-hardening-2026-10.sql",
  "find": "begin\n  new.created_at := now();\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_events",
  "replace": "begin\n  new.created_at := now();\n  if new.user_id is not null then\n    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');\n    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');\n    return new;\n  end if;\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_events"
 },
 {
  "id": "E1.2 tools/supabase-hardening-2026-10.sql",
  "fixes": [
   "F1"
  ],
  "why": "a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first",
  "protectedBy": [
   "MU1",
   "MU2"
  ],
  "file": "tools/supabase-hardening-2026-10.sql",
  "find": "begin\n  new.created_at := now();\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_surveys",
  "replace": "begin\n  new.created_at := now();\n  if new.user_id is not null then\n    perform public.exhibit_take_slot('survey', 5, interval '1 hour');\n    return new;\n  end if;\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_surveys"
 },
 {
  "id": "E2.1 tools/supabase-rate-limits.sql",
  "fixes": [
   "F1"
  ],
  "why": "a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy, so a re-run cannot undo the fix)",
  "protectedBy": [
   "MU1",
   "MU2"
  ],
  "file": "tools/supabase-rate-limits.sql",
  "find": "begin\n  new.created_at := now();\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_events",
  "replace": "begin\n  new.created_at := now();\n  if new.user_id is not null then\n    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');\n    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');\n    return new;\n  end if;\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_events"
 },
 {
  "id": "E2.2 tools/supabase-rate-limits.sql",
  "fixes": [
   "F1"
  ],
  "why": "a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy, so a re-run cannot undo the fix)",
  "protectedBy": [
   "MU1",
   "MU2"
  ],
  "file": "tools/supabase-rate-limits.sql",
  "find": "begin\n  new.created_at := now();\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_surveys",
  "replace": "begin\n  new.created_at := now();\n  if new.user_id is not null then\n    perform public.exhibit_take_slot('survey', 5, interval '1 hour');\n    return new;\n  end if;\n  if coalesce(new.anon_id, '') <> '' then\n    if (select count(*) from public.exhibit_surveys"
 },
 {
  "id": "E3.1 tools/supabase-insights.sql",
  "fixes": [
   "F1"
  ],
  "why": "a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy of the events gate)",
  "protectedBy": [
   "MU1"
  ],
  "file": "tools/supabase-insights.sql",
  "find": "  new.created_at := now();\n  if coalesce(new.anon_id, '') <> '' then",
  "replace": "  new.created_at := now();\n  if new.user_id is not null then\n    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');\n    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');\n    return new;\n  end if;\n  if coalesce(new.anon_id, '') <> '' then"
 },
 {
  "id": "E4.1 tools/supabase-progress.sql",
  "fixes": [
   "F1"
  ],
  "why": "a signed-in row with a fresh anon_id skipped the per-user cap; signed-in rows now take a per-user slot first (older copy of the surveys gate)",
  "protectedBy": [
   "MU2"
  ],
  "file": "tools/supabase-progress.sql",
  "find": "  new.created_at := now();\n  if coalesce(new.anon_id, '') <> '' then",
  "replace": "  new.created_at := now();\n  if new.user_id is not null then\n    perform public.exhibit_take_slot('survey', 5, interval '1 hour');\n    return new;\n  end if;\n  if coalesce(new.anon_id, '') <> '' then"
 },
 {
  "id": "E5.1 tools/verify/verify_ratelimit.mjs",
  "fixes": [
   "F1"
  ],
  "why": "checks that every copy of both gates caps signed-in rows per user before the anon_id branch",
  "protectedBy": [
   "MU1",
   "MU2"
  ],
  "file": "tools/verify/verify_ratelimit.mjs",
  "find": "const insightsSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-insights.sql'), 'utf8');\nassert(insightsSql.includes('exhibit_events_rate_gate'), 'insights setup must include events write cap');",
  "replace": "const insightsSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-insights.sql'), 'utf8');\n\nfunction signedInBlock(src, file, gateName) {\n  const start = src.indexOf('create or replace function public.' + gateName + '()');\n  assert(start >= 0, file + ' must define ' + gateName);\n  const body = src.slice(start, src.indexOf('$$;', start));\n  const open = body.indexOf('if new.user_id is not null then');\n  const anon = body.indexOf(\"if coalesce(new.anon_id, '') <> '' then\");\n  assert(anon >= 0, file + ' ' + gateName + ' must keep the anon_id check');\n  assert(open >= 0 && open < anon, file + ' ' + gateName + ' must cap signed-in rows per user before the anon_id check');\n  const block = body.slice(open, body.indexOf('end if;', open));\n  assert(block.includes('return new;'), file + ' ' + gateName + ' signed-in block must return before the anon_id check');\n  return block;\n}\n\nfunction assertEventsUserCap(src, file) {\n  const block = signedInBlock(src, file, 'exhibit_events_rate_gate');\n  assert(block.includes(\"perform public.exhibit_take_slot('event_min', 60, interval '1 minute');\"), file + ' events gate must cap a signed-in user at 60/min whatever anon_id is sent');\n  assert(block.includes(\"perform public.exhibit_take_slot('event_day', 2000, interval '1 day');\"), file + ' events gate must cap a signed-in user at 2000/day whatever anon_id is sent');\n}\n\nfunction assertSurveysUserCap(src, file) {\n  const block = signedInBlock(src, file, 'exhibit_surveys_rate_gate');\n  assert(block.includes(\"perform public.exhibit_take_slot('survey', 5, interval '1 hour');\"), file + ' surveys gate must cap a signed-in user at 5/hour whatever anon_id is sent');\n}\n\nconst hardeningSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-hardening-2026-10.sql'), 'utf8');\nassertEventsUserCap(hardeningSql, 'supabase-hardening-2026-10.sql');\nassertSurveysUserCap(hardeningSql, 'supabase-hardening-2026-10.sql');\nassertEventsUserCap(sql, 'supabase-rate-limits.sql');\nassertSurveysUserCap(sql, 'supabase-rate-limits.sql');\nassertEventsUserCap(insightsSql, 'supabase-insights.sql');\nassert(insightsSql.includes('exhibit_events_rate_gate'), 'insights setup must include events write cap');"
 },
 {
  "id": "E5.2 tools/verify/verify_ratelimit.mjs",
  "fixes": [
   "F1"
  ],
  "why": "checks that every copy of both gates caps signed-in rows per user before the anon_id branch",
  "protectedBy": [
   "MU1",
   "MU2"
  ],
  "file": "tools/verify/verify_ratelimit.mjs",
  "find": "const progressSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-progress.sql'), 'utf8');\nassert(progressSql.includes('exhibit_surveys_rate_gate'), 'progress setup must include surveys write cap');",
  "replace": "const progressSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-progress.sql'), 'utf8');\nassertSurveysUserCap(progressSql, 'supabase-progress.sql');\nassert(progressSql.includes('exhibit_surveys_rate_gate'), 'progress setup must include surveys write cap');"
 },
 {
  "id": "E6.1 tools/supabase-rate-limits-gaps.sql",
  "fixes": [
   "F2"
  ],
  "why": "verify_quiz_answer returned the answer key on a wrong pick; it now returns correct_idx only for a correct pick",
  "protectedBy": [
   "MU3"
  ],
  "file": "tools/supabase-rate-limits-gaps.sql",
  "find": "    'correct', v_correct,\n    'correct_idx', v_key.correct_idx,\n    'note', case when v_correct then v_key.correct_note else '' end",
  "replace": "    'correct', v_correct,\n    'correct_idx', case when v_correct then v_key.correct_idx end,\n    'note', case when v_correct then v_key.correct_note else '' end"
 },
 {
  "id": "E7.1 tools/supabase-quiz-integrity.sql",
  "fixes": [
   "F2"
  ],
  "why": "verify_quiz_answer returned the answer key on a wrong pick; it now returns correct_idx only for a correct pick (older copy)",
  "protectedBy": [
   "MU3"
  ],
  "file": "tools/supabase-quiz-integrity.sql",
  "find": "    'correct', v_correct,\n    'correct_idx', v_key.correct_idx,\n    'note', case when v_correct then v_key.correct_note else '' end",
  "replace": "    'correct', v_correct,\n    'correct_idx', case when v_correct then v_key.correct_idx end,\n    'note', case when v_correct then v_key.correct_note else '' end"
 },
 {
  "id": "E8.1 tools/supabase-pending-migrations.sql",
  "fixes": [
   "F2"
  ],
  "why": "verify_quiz_answer returned the answer key on a wrong pick; it now returns correct_idx only for a correct pick (older copy)",
  "protectedBy": [
   "MU3"
  ],
  "file": "tools/supabase-pending-migrations.sql",
  "find": "    'correct', v_correct,\n    'correct_idx', v_key.correct_idx,\n    'note', case when v_correct then v_key.correct_note else '' end",
  "replace": "    'correct', v_correct,\n    'correct_idx', case when v_correct then v_key.correct_idx end,\n    'note', case when v_correct then v_key.correct_note else '' end"
 },
 {
  "id": "E9.1 tools/verify/verify_quiz_integrity.mjs",
  "fixes": [
   "F2"
  ],
  "why": "checks all three SQL copies and models a wrong-pick reply with no key",
  "protectedBy": [
   "MU3"
  ],
  "file": "tools/verify/verify_quiz_integrity.mjs",
  "find": "assert.ok(pending.includes(\"insert into public.exhibit_quiz_passes\"), \"re-running the pending bundle keeps recording passes\");\nconst seed = new Set();",
  "replace": "assert.ok(pending.includes(\"insert into public.exhibit_quiz_passes\"), \"re-running the pending bundle keeps recording passes\");\n[\"tools/supabase-rate-limits-gaps.sql\", \"tools/supabase-quiz-integrity.sql\", \"tools/supabase-pending-migrations.sql\"].forEach((rel) => {\n  const src = read(rel);\n  const start = src.indexOf(\"create or replace function public.verify_quiz_answer(\");\n  assert.ok(start >= 0, `${rel} defines verify_quiz_answer`);\n  const body = src.slice(start, src.indexOf(\"$$;\", start));\n  assert.ok(body.includes(\"'correct_idx', case when v_correct then v_key.correct_idx end,\"), `${rel}: verify_quiz_answer returns correct_idx only for a correct pick`);\n  assert.strictEqual(/'correct_idx',s*v_key.correct_idxs*[,)]/.test(src), false, `${rel}: verify_quiz_answer must not return correct_idx whatever was picked`);\n});\nconst seed = new Set();"
 },
 {
  "id": "E9.2 tools/verify/verify_quiz_integrity.mjs",
  "fixes": [
   "F2"
  ],
  "why": "checks all three SQL copies and models a wrong-pick reply with no key",
  "protectedBy": [
   "MU3"
  ],
  "file": "tools/verify/verify_quiz_integrity.mjs",
  "find": "\nrpcReply = { data: { correct: false, correct_idx: 1, note: \"\" }, error: null };\nres = await QuizGate.verify(0, 0, 3);",
  "replace": "\nrpcReply = { data: { correct: false, correct_idx: null, note: \"\" }, error: null };\nres = await QuizGate.verify(0, 0, 3);"
 },
 {
  "id": "E9.3 tools/verify/verify_quiz_integrity.mjs",
  "fixes": [
   "F2"
  ],
  "why": "checks all three SQL copies and models a wrong-pick reply with no key",
  "protectedBy": [
   "MU3"
  ],
  "file": "tools/verify/verify_quiz_integrity.mjs",
  "find": "assert.strictEqual(res.correct, false, \"a wrong answer is graded false\");\nassert.strictEqual(res.correctIdx, 1, \"the server reveals the right option only after a pick\");\n",
  "replace": "assert.strictEqual(res.correct, false, \"a wrong answer is graded false\");\nassert.strictEqual(res.correctIdx, null, \"a wrong pick does not reveal which option is right\");\n"
 },
 {
  "id": "E10.1 js/shared/ops.js",
  "fixes": [
   "F3"
  ],
  "why": "error reports recreated the analytics ID without consent; without consent they now use a visit-only sessionStorage ID",
  "protectedBy": [
   "MU4"
  ],
  "file": "js/shared/ops.js",
  "find": "\n  function anonId() {",
  "replace": "\n  function hasAnalyticsConsent() {\n    return !!(window.SODConsent && typeof window.SODConsent.has === \"function\" && window.SODConsent.has(\"analytics\"));\n  }\n\n  function newId() {\n    if (typeof crypto !== \"undefined\" && crypto.randomUUID) return crypto.randomUUID();\n    return \"a_\" + Date.now().toString(36);\n  }\n\n  function anonId() {"
 },
 {
  "id": "E10.2 js/shared/ops.js",
  "fixes": [
   "F3"
  ],
  "why": "error reports recreated the analytics ID without consent; without consent they now use a visit-only sessionStorage ID",
  "protectedBy": [
   "MU4"
  ],
  "file": "js/shared/ops.js",
  "find": "  function anonId() {\n    try {",
  "replace": "  function anonId() {\n    const consented = hasAnalyticsConsent();\n    const key = consented ? \"baInsightsAnon\" : \"baOpsAnon\";\n    try {"
 },
 {
  "id": "E10.3 js/shared/ops.js",
  "fixes": [
   "F3"
  ],
  "why": "error reports recreated the analytics ID without consent; without consent they now use a visit-only sessionStorage ID",
  "protectedBy": [
   "MU4"
  ],
  "file": "js/shared/ops.js",
  "find": "    try {\n      let id = localStorage.getItem(\"baInsightsAnon\");\n      if (!id) {\n        id = (typeof crypto !== \"undefined\" && crypto.randomUUID)\n          ? crypto.randomUUID()\n          : \"a_\" + Date.now().toString(36);\n        localStorage.setItem(\"baInsightsAnon\", id);\n      }\n      return id;",
  "replace": "    try {\n      const store = consented ? localStorage : sessionStorage;\n      const existing = store.getItem(key);\n      if (existing) return existing;\n      const id = newId();\n      store.setItem(key, id);\n      return id;"
 },
 {
  "id": "E11.1 privacy.html",
  "fixes": [
   "F3"
  ],
  "why": "the privacy page names the new visit-only key and the ID an error report carries",
  "protectedBy": [
   "MU5"
  ],
  "file": "privacy.html",
  "find": "              <tr><td>Answer your messages to the operator</td><td>Subject, message, replies</td><td>Contract (answering your request); legitimate interests</td></tr>\n              <tr><td>Find and fix errors on the site</td><td>The error message, the page and line where it happened, browser and device type, IP address, and, for one page load in ten, how long the page took to load</td><td>Legitimate interests (keeping the site working)</td></tr>\n              <tr><td>Stop abuse and flooding</td><td>IP address at the hosting layer, request counts, technical reports</td><td>Legitimate interests (protecting the service)</td></tr>",
  "replace": "              <tr><td>Answer your messages to the operator</td><td>Subject, message, replies</td><td>Contract (answering your request); legitimate interests</td></tr>\n              <tr><td>Find and fix errors on the site</td><td>The error message, the page and line where it happened, browser and device type, IP address, and, for one page load in ten, how long the page took to load. An error report stored by the site also carries a visit ID, or your account ID if you are signed in</td><td>Legitimate interests (keeping the site working)</td></tr>\n              <tr><td>Stop abuse and flooding</td><td>IP address at the hosting layer, request counts, technical reports</td><td>Legitimate interests (protecting the service)</td></tr>"
 },
 {
  "id": "E11.2 privacy.html",
  "fixes": [
   "F3"
  ],
  "why": "the privacy page names the new visit-only key and the ID an error report carries",
  "protectedBy": [
   "MU5"
  ],
  "file": "privacy.html",
  "find": "              <tr><td>sb-ttlrspnfadmxkoyqvofh-auth-token</td><td>Your signed-in session, kept by Supabase</td></tr>\n              <tr><td>baInsightsAnon, baInsightsSession, baInsightsQueue, baFlushWin, baSurveyTimes, baOpsQueue</td><td>Anonymous ID, visit ID, study events waiting to be sent, and limits on how often events and surveys are sent</td></tr>\n              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>",
  "replace": "              <tr><td>sb-ttlrspnfadmxkoyqvofh-auth-token</td><td>Your signed-in session, kept by Supabase</td></tr>\n              <tr><td>baInsightsAnon, baInsightsSession, baInsightsQueue, baFlushWin, baSurveyTimes, baOpsQueue, baOpsAnon</td><td>Anonymous ID, visit ID, study events waiting to be sent, limits on how often events and surveys are sent, and a visit-only ID attached to error reports, removed when the tab closes</td></tr>\n              <tr><td>baInsightsOptOut</td><td>Legacy analytics setting</td></tr>"
 },
 {
  "id": "E12.1 tests/unit/sentry.test.mjs",
  "fixes": [
   "F3"
  ],
  "why": "tests the consent behaviour of ops.js and the privacy wording",
  "protectedBy": [
   "MU4",
   "MU5"
  ],
  "file": "tests/unit/sentry.test.mjs",
  "find": "\nfor (const rel of [\"../../functions/_middleware.js\", \"../../workers/exhibit-rate-gate/src/index.js\"]) {",
  "replace": "\nconst OPS_SRC = fs.readFileSync(new URL(\"../../js/shared/ops.js\", import.meta.url), \"utf8\");\n\nfunction memoryStore(seed) {\n  const data = Object.assign({}, seed);\n  return {\n    data,\n    getItem: (k) => (k in data ? data[k] : null),\n    setItem: (k, v) => { data[k] = String(v); },\n    removeItem: (k) => { delete data[k]; }\n  };\n}\n\nasync function reportError(consent, localSeed) {\n  const rows = [];\n  const client = { from: () => ({ insert: (batch) => { rows.push(...batch); return Promise.resolve({ error: null }); } }) };\n  const localStorage = memoryStore(localSeed);\n  const sessionStorage = memoryStore();\n  const window = {\n    addEventListener: () => {},\n    ScrollAuth: { getClient: () => client, getUser: () => null },\n    SODConsent: { has: (kind) => consent && kind === \"analytics\" }\n  };\n  vm.runInNewContext(OPS_SRC, {\n    window,\n    localStorage,\n    sessionStorage,\n    location: { pathname: \"/study.html\" },\n    crypto: { randomUUID: () => \"11111111-2222-4333-8444-555555555555\" },\n    setInterval: () => 0\n  });\n  window.SiteOps.report(\"save_failed\", \"timeout\");\n  await window.SiteOps.flush();\n  await new Promise((resolve) => setImmediate(resolve));\n  return { rows, local: localStorage.data, session: sessionStorage.data };\n}\n\ntest(\"without analytics consent an error report never creates baInsightsAnon and carries a visit-only baOpsAnon ID\", async () => {\n  const out = await reportError(false);\n  assert.equal(out.rows.length, 1);\n  assert.ok(!(\"baInsightsAnon\" in out.local));\n  assert.equal(out.session.baOpsAnon, \"11111111-2222-4333-8444-555555555555\");\n  assert.equal(out.rows[0].anon_id, out.session.baOpsAnon);\n  assert.ok(out.rows[0].anon_id.length <= 64);\n});\n\ntest(\"without analytics consent an error report does not read a leftover baInsightsAnon\", async () => {\n  const out = await reportError(false, { baInsightsAnon: \"left-over-id\" });\n  assert.equal(out.rows.length, 1);\n  assert.notEqual(out.rows[0].anon_id, \"left-over-id\");\n  assert.equal(out.rows[0].anon_id, out.session.baOpsAnon);\n});\n\ntest(\"with analytics consent an error report uses baInsightsAnon and sets no baOpsAnon\", async () => {\n  const kept = await reportError(true, { baInsightsAnon: \"existing-analytics-id\" });\n  assert.equal(kept.rows[0].anon_id, \"existing-analytics-id\");\n  assert.ok(!(\"baOpsAnon\" in kept.session));\n  const fresh = await reportError(true);\n  assert.equal(fresh.local.baInsightsAnon, \"11111111-2222-4333-8444-555555555555\");\n  assert.equal(fresh.rows[0].anon_id, fresh.local.baInsightsAnon);\n  assert.ok(!(\"baOpsAnon\" in fresh.session));\n});\n\ntest(\"the privacy page lists the visit-only error report ID\", () => {\n  const html = fs.readFileSync(new URL(\"../../privacy.html\", import.meta.url), \"utf8\");\n  assert.match(html, /baOpsQueue, baOpsAnon<\\/td>/);\n  assert.match(html, /a visit-only ID attached to error reports, removed when the tab closes/);\n  assert.match(html, /An error report stored by the site also carries a visit ID, or your account ID if you are signed in/);\n});\n\nfor (const rel of [\"../../functions/_middleware.js\", \"../../workers/exhibit-rate-gate/src/index.js\"]) {"
 },
 {
  "id": "E13.1 server.py",
  "fixes": [
   "F4"
  ],
  "why": "the dev server answered any Host header; it now refuses a Host that is not its own loopback address",
  "protectedBy": [
   "MU6"
  ],
  "file": "server.py",
  "find": "\n    def send_head(self):",
  "replace": "\n    def is_local_host_header(self):\n        port = str(self.server.server_address[1])\n        return self.headers.get(\"Host\", \"\").lower() in (\"127.0.0.1:\" + port, \"localhost:\" + port)\n\n    def send_head(self):"
 },
 {
  "id": "E13.2 server.py",
  "fixes": [
   "F4"
  ],
  "why": "the dev server answered any Host header; it now refuses a Host that is not its own loopback address",
  "protectedBy": [
   "MU6"
  ],
  "file": "server.py",
  "find": "        \"\"\"Serve byte ranges for large media so <audio>/<video> can seek.\"\"\"\n        range_header = self.headers.get(\"Range\")",
  "replace": "        \"\"\"Serve byte ranges for large media so <audio>/<video> can seek.\"\"\"\n        if not self.is_local_host_header():\n            self.send_error(403, \"Host not allowed\")\n            return None\n        range_header = self.headers.get(\"Range\")"
 },
 {
  "id": "E14.1 tools/verify/verify_load.mjs",
  "fixes": [
   "F4"
  ],
  "why": "checks that a foreign Host header gets 403",
  "protectedBy": [
   "MU6"
  ],
  "file": "tools/verify/verify_load.mjs",
  "find": "import assert from \"assert\";\nimport path from \"path\";",
  "replace": "import assert from \"assert\";\nimport http from \"http\";\nimport path from \"path\";"
 },
 {
  "id": "E14.2 tools/verify/verify_load.mjs",
  "fixes": [
   "F4"
  ],
  "why": "checks that a foreign Host header gets 403",
  "protectedBy": [
   "MU6"
  ],
  "file": "tools/verify/verify_load.mjs",
  "find": "  console.log(\"40 overlapping local study reads returned 200\");\n} finally {",
  "replace": "  console.log(\"40 overlapping local study reads returned 200\");\n  const foreign = await new Promise((resolve, reject) => {\n    const req = http.request({ host: \"127.0.0.1\", port: port, path: \"/study.html\", agent: false, headers: { Host: \"evil.example:\" + port } }, (res) => {\n      let body = \"\";\n      res.on(\"data\", (chunk) => { body += chunk.toString(); });\n      res.on(\"end\", () => resolve({ status: res.statusCode, body: body }));\n    });\n    req.on(\"error\", reject);\n    req.end();\n  });\n  assert.strictEqual(foreign.status, 403, \"a request with a foreign Host header must be refused\\n\" + log);\n  assert.ok(!/<html[\\s>][\\s\\S]*<script/i.test(foreign.body), \"a refused request must not carry the page\");\n  console.log(\"A request with a foreign Host header is refused with 403\");\n} finally {"
 },
 {
  "id": "E15.1 functions/_middleware.js",
  "fixes": [
   "F5"
  ],
  "why": "HEAD requests skipped the rate gate; only OPTIONS skips it now, and HEAD still loads when the gate is down",
  "protectedBy": [
   "MU7",
   "MU8"
  ],
  "file": "functions/_middleware.js",
  "find": "\nasync function handle(context) {",
  "replace": "\nfunction isRead(request) {\n  return request.method === \"GET\" || request.method === \"HEAD\";\n}\n\nasync function handle(context) {"
 },
 {
  "id": "E15.2 functions/_middleware.js",
  "fixes": [
   "F5"
  ],
  "why": "HEAD requests skipped the rate gate; only OPTIONS skips it now, and HEAD still loads when the gate is down",
  "protectedBy": [
   "MU7",
   "MU8"
  ],
  "file": "functions/_middleware.js",
  "find": "  if (path === \"/csp-report\" && request.method === \"POST\") return takeReport(context, request);\n  if (request.method === \"OPTIONS\" || request.method === \"HEAD\") return context.next();\n  if (path === \"/__rate\" && request.method === \"POST\") return rateProxy(context, request);",
  "replace": "  if (path === \"/csp-report\" && request.method === \"POST\") return takeReport(context, request);\n  if (request.method === \"OPTIONS\") return context.next();\n  if (path === \"/__rate\" && request.method === \"POST\") return rateProxy(context, request);"
 },
 {
  "id": "E15.3 functions/_middleware.js",
  "fixes": [
   "F5"
  ],
  "why": "HEAD requests skipped the rate gate; only OPTIONS skips it now, and HEAD still loads when the gate is down",
  "protectedBy": [
   "MU7",
   "MU8"
  ],
  "file": "functions/_middleware.js",
  "find": "  if (decision === \"deny\" || decision === \"deny_first\") return denied();\n  if (decision === \"down\" && request.method !== \"GET\") return unavailable();\n  return servePage(context, request);",
  "replace": "  if (decision === \"deny\" || decision === \"deny_first\") return denied();\n  if (decision === \"down\" && !isRead(request)) return unavailable();\n  return servePage(context, request);"
 },
 {
  "id": "E16.1 tests/unit/middleware.test.mjs",
  "fixes": [
   "F5"
  ],
  "why": "tests HEAD counting, the OPTIONS bypass and HEAD when the gate is down",
  "protectedBy": [
   "MU7",
   "MU8"
  ],
  "file": "tests/unit/middleware.test.mjs",
  "find": "\ntest(\"allowed .html pages are served without a redirect\", async () => {",
  "replace": "\ntest(\"a HEAD request to a page is counted by the gate\", async () => {\n  const res = await onRequest(context(\"/study\", { method: \"HEAD\", verdict: { ok: false, first: false } }));\n  assert.equal(res.status, 429);\n  assert.equal(res.headers.get(\"Retry-After\"), \"60\");\n});\n\ntest(\"OPTIONS requests skip the gate\", async () => {\n  const res = await onRequest(context(\"/study\", { method: \"OPTIONS\", verdict: { ok: false, first: false } }));\n  assert.equal(res.status, 200);\n  assert.equal(await res.text(), \"next\");\n});\n\ntest(\"when the gate is down, a HEAD request still loads\", async () => {\n  const thrown = await onRequest(context(\"/study\", { method: \"HEAD\", verdict: \"throw\" }));\n  assert.equal(thrown.status, 200);\n  const unbound = await onRequest(context(\"/study\", { method: \"HEAD\", verdict: \"missing\" }));\n  assert.equal(unbound.status, 200);\n});\n\ntest(\"allowed .html pages are served without a redirect\", async () => {"
 },
 {
  "id": "E17.1 _headers",
  "fixes": [
   "F6"
  ],
  "why": "connect-src allowed every Sentry project and no COOP header was sent; it now names the one project host and sets COOP",
  "protectedBy": [
   "MU9",
   "MU10"
  ],
  "file": "_headers",
  "find": "  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com 'sha256-E+aslqeud2eI1AxDzL4z/9Ov6zN9Ey+Sh7T5l4FSIkU=' 'sha256-ubcWAwNhdVeBfiRtLCSZVQ4g28MLL98xiQn5MsM8j8w=' 'sha256-/1QaprhjwN9kNwJKPf6Qw6O8O2f+syHifIpg/SJytdc=' 'sha256-JFIeDuj5EjAu2b8xcO7xFcxrQskGD1L6L50UmZiPwrY=' 'sha256-qDijm4ZMNArSFBE4jRo07Lzj4qXQokVve4ODLNv6134=' 'sha256-ZJUtJPcmPfGj7n53X0puoa050LmqMu7Gd/2KE+bQJak=' 'sha256-xibdK9otoj51oMcQYdeItJwnN+IWaqnyoZgwXIOLV3M=' 'sha256-kcQdYQ3/pccQdahZjufezkFwqTxdGZLXJcku8kxnJzY='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.arcgisonline.com https://*.ggpht.com https://*.googleusercontent.com; connect-src 'self' blob: https://ttlrspnfadmxkoyqvofh.supabase.co wss://ttlrspnfadmxkoyqvofh.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com https://*.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://cloudflareinsights.com https://static.cloudflareinsights.com https://*.ingest.de.sentry.io; worker-src 'self' blob:; media-src 'self' blob:; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-report\n",
  "replace": "  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n  Cross-Origin-Opener-Policy: same-origin-allow-popups\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com 'sha256-E+aslqeud2eI1AxDzL4z/9Ov6zN9Ey+Sh7T5l4FSIkU=' 'sha256-ubcWAwNhdVeBfiRtLCSZVQ4g28MLL98xiQn5MsM8j8w=' 'sha256-/1QaprhjwN9kNwJKPf6Qw6O8O2f+syHifIpg/SJytdc=' 'sha256-JFIeDuj5EjAu2b8xcO7xFcxrQskGD1L6L50UmZiPwrY=' 'sha256-qDijm4ZMNArSFBE4jRo07Lzj4qXQokVve4ODLNv6134=' 'sha256-ZJUtJPcmPfGj7n53X0puoa050LmqMu7Gd/2KE+bQJak=' 'sha256-xibdK9otoj51oMcQYdeItJwnN+IWaqnyoZgwXIOLV3M=' 'sha256-kcQdYQ3/pccQdahZjufezkFwqTxdGZLXJcku8kxnJzY='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.arcgisonline.com https://*.ggpht.com https://*.googleusercontent.com; connect-src 'self' blob: https://ttlrspnfadmxkoyqvofh.supabase.co wss://ttlrspnfadmxkoyqvofh.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com https://*.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://cloudflareinsights.com https://static.cloudflareinsights.com https://o4512321608679424.ingest.de.sentry.io; worker-src 'self' blob:; media-src 'self' blob:; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-report\n"
 },
 {
  "id": "E18.1 tools/verify-headers.mjs",
  "fixes": [
   "F6"
  ],
  "why": "checks the COOP header and the exact Sentry host",
  "protectedBy": [
   "MU9",
   "MU10"
  ],
  "file": "tools/verify-headers.mjs",
  "find": "assert(rootH['strict-transport-security']?.value?.includes('max-age=31536000'), 'Strict-Transport-Security is enabled');\nassert(!rootH['access-control-allow-origin'], 'Access-Control-Allow-Origin is NOT restricted on \"/*\" (avoids breaking preview deployments)');",
  "replace": "assert(rootH['strict-transport-security']?.value?.includes('max-age=31536000'), 'Strict-Transport-Security is enabled');\nassert(rootH['cross-origin-opener-policy']?.value === 'same-origin-allow-popups', 'Cross-Origin-Opener-Policy is same-origin-allow-popups');\nassert(!rootH['access-control-allow-origin'], 'Access-Control-Allow-Origin is NOT restricted on \"/*\" (avoids breaking preview deployments)');"
 },
 {
  "id": "E18.2 tools/verify-headers.mjs",
  "fixes": [
   "F6"
  ],
  "why": "checks the COOP header and the exact Sentry host",
  "protectedBy": [
   "MU9",
   "MU10"
  ],
  "file": "tools/verify-headers.mjs",
  "find": "\n// Verify Cloudflare Insights",
  "replace": "\nconst sentryConfig = fs.readFileSync(path.join(root, 'js', 'shared', 'sentry.js'), 'utf8');\nconst sentryHost = (/@([a-z0-9]+\\.ingest\\.[a-z0-9.]*sentry\\.io)\\//.exec(sentryConfig) || [])[1];\nassert(sentryHost, 'js/shared/sentry.js names the Sentry project ingest host');\nassert(cspDirectives['connect-src']?.includes(`https://${sentryHost}`), `CSP connect-src includes https://${sentryHost}`);\nassert(!cspDirectives['connect-src']?.some(v => v.includes('*.ingest.')), 'CSP connect-src no longer allows every Sentry project');\n\n// Verify Cloudflare Insights"
 },
 {
  "id": "E19.1 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "    timeout-minutes: 30\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \"22\"",
  "replace": "    timeout-minutes: 30\n    steps:\n      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n        with:\n          node-version: \"22\""
 },
 {
  "id": "E19.2 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "          cache: npm\n      - uses: actions/setup-python@v5\n        with:",
  "replace": "          cache: npm\n      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5\n        with:"
 },
 {
  "id": "E19.3 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "    runs-on: windows-latest\n    timeout-minutes: 40",
  "replace": "    runs-on: windows-latest\n    environment: production\n    timeout-minutes: 40"
 },
 {
  "id": "E19.4 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "      npm_config_yes: \"true\"\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \"22\"",
  "replace": "      npm_config_yes: \"true\"\n    steps:\n      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n        with:\n          node-version: \"22\""
 },
 {
  "id": "E19.5 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          sparse-checkout: tools",
  "replace": "    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n        with:\n          sparse-checkout: tools"
 },
 {
  "id": "E19.6 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "          sparse-checkout: tools\n          filter: blob:none\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \"22\"",
  "replace": "          sparse-checkout: tools\n          filter: blob:none\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n        with:\n          node-version: \"22\""
 },
 {
  "id": "E19.7 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "      GH_TOKEN: ${{ github.token }}\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          sparse-checkout: tools/ci",
  "replace": "      GH_TOKEN: ${{ github.token }}\n    steps:\n      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n        with:\n          sparse-checkout: tools/ci"
 },
 {
  "id": "E19.8 .github/workflows/ci.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag and the deploy job had no environment; they are pinned by commit and the job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": ".github/workflows/ci.yml",
  "find": "          sparse-checkout: tools/ci\n          filter: blob:none\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \"22\"",
  "replace": "          sparse-checkout: tools/ci\n          filter: blob:none\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n        with:\n          node-version: \"22\""
 },
 {
  "id": "E20.1 .github/workflows/health.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag; they are pinned by commit",
  "protectedBy": [
   "MU12"
  ],
  "file": ".github/workflows/health.yml",
  "find": "    steps:\n      - uses: actions/checkout@v4\n        with:",
  "replace": "    steps:\n      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n        with:"
 },
 {
  "id": "E20.2 .github/workflows/health.yml",
  "fixes": [
   "F7"
  ],
  "why": "actions were pinned by tag; they are pinned by commit",
  "protectedBy": [
   "MU12"
  ],
  "file": ".github/workflows/health.yml",
  "find": "          filter: blob:none\n      - uses: actions/setup-node@v4\n        with:",
  "replace": "          filter: blob:none\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n        with:"
 },
 {
  "id": "E21.1 tools/verify/verify_pages_deny.mjs",
  "fixes": [
   "F7"
  ],
  "why": "checks that every action is pinned to a full commit and the deploy job declares production",
  "protectedBy": [
   "MU11",
   "MU12"
  ],
  "file": "tools/verify/verify_pages_deny.mjs",
  "find": "\nconsole.log(\"The Pages stage drops operator files, the Vercel deploy path stays removed, and static folders skip the middleware without exposing protected paths\");",
  "replace": "\nconst workflowDir = path.join(ROOT, \".github/workflows\");\nfor (const name of fs.readdirSync(workflowDir).filter((entry) => /\\.ya?ml$/.test(entry))) {\n  const usesLines = fs.readFileSync(path.join(workflowDir, name), \"utf8\").split(/\\r?\\n/).filter((line) => /^\\s*(-\\s+)?uses:/.test(line));\n  for (const line of usesLines) {\n    assert(/uses:\\s+[\\w.\\/-]+@[0-9a-f]{40}(\\s+#.*)?$/.test(line), name + \" must pin every action to a full commit: \" + line.trim());\n  }\n}\nconst deployJob = (/\\n  deploy:\\n([\\s\\S]*?)(?=\\n  \\S|$)/.exec(fs.readFileSync(path.join(workflowDir, \"ci.yml\"), \"utf8\").replace(/\\r/g, \"\")) || [\"\", \"\"])[1];\nassert(/^    environment: production$/m.test(deployJob), \"the deploy job in ci.yml must declare environment: production\");\n\nconsole.log(\"The Pages stage drops operator files, the Vercel deploy path stays removed, and static folders skip the middleware without exposing protected paths\");"
 }
];
