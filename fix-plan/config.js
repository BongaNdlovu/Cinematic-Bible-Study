const RUNNER = 'C:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/fix-plan/run-tests.js';
const onlyVerify = (script) => ({ args: [RUNNER, 'only=' + script] });
const onlyUnit = (file) => ({ args: [RUNNER, 'unit=tests/unit/' + file] });
const V = (script) => 'verify: ' + script;
const U = (name) => 'unit: ' + name;
const VERIFY = [
  'tools/verify-headers.mjs', 'tools/verify/verify_csp_hashes.mjs', 'tools/verify/verify_insights.mjs', 'tools/verify/verify_ratelimit.mjs',
  'tools/verify/verify_progress_sync.mjs', 'tools/verify/verify_study_sync.mjs', 'tools/verify/verify_quiz_integrity.mjs',
  'tools/verify/verify_save_banner_fix.mjs', 'tools/verify/verify_portal_and_hubs.mjs', 'tools/verify/verify_account_and_banner_e2e.mjs',
  'tools/verify/verify_reviews.mjs', 'tools/verify/verify_rate_gate.mjs', 'tools/verify/verify_hash_release.mjs', 'tools/verify/verify_css_minify.mjs',
  'tools/verify/verify_pages_deny.mjs', 'tools/verify/verify_hero_budget.mjs', 'tools/verify/verify_load.mjs', 'tools/verify/verify_progress_live.mjs',
  'tools/verify/verify_desk.mjs', 'tools/verify/verify_certificates.mjs', 'tools/verify/verify_task_flow.mjs', 'tools/verify/verify_map_help.mjs',
  'tools/verify/verify_moderator_ui.mjs', 'tools/verify/verify_sid_report.mjs', 'tools/verify/verify_csp_policy.mjs',
];
const NEW_UNIT = [
  'a HEAD request to a page is counted by the gate',
  'OPTIONS requests skip the gate',
  'when the gate is down, a HEAD request still loads',
  'without analytics consent an error report never creates baInsightsAnon and carries a visit-only baOpsAnon ID',
  'without analytics consent an error report does not read a leftover baInsightsAnon',
  'with analytics consent an error report uses baInsightsAnon and sets no baOpsAnon',
  'the privacy page lists the visit-only error report ID',
];
const HEAVY = ['fix-plan', '.git', '.claude', 'models', 'qa', '.pages-deploy', 'backups', '.agents', '_factcheck', '.wrangler', '__pycache__'];
const SHA_CHECKOUT = '11d5960a326750d5838078e36cf38b85af677262';

module.exports = {
  edited: [
    'tools/supabase-hardening-2026-10.sql', 'tools/supabase-rate-limits.sql', 'tools/supabase-insights.sql', 'tools/supabase-progress.sql',
    'tools/verify/verify_ratelimit.mjs', 'tools/supabase-rate-limits-gaps.sql', 'tools/supabase-quiz-integrity.sql',
    'tools/supabase-pending-migrations.sql', 'tools/verify/verify_quiz_integrity.mjs', 'js/shared/ops.js', 'privacy.html',
    'tests/unit/sentry.test.mjs', 'server.py', 'tools/verify/verify_load.mjs', 'functions/_middleware.js', 'tests/unit/middleware.test.mjs',
    '_headers', 'tools/verify-headers.mjs', '.github/workflows/ci.yml', '.github/workflows/health.yml', 'tools/verify/verify_pages_deny.mjs',
  ],
  generated: [],
  generate: null,

  skipDirs: [...HEAVY, 'node_modules'],
  skipFiles: ['FIX-PLAN.md'],
  copySkipDirs: HEAVY,

  test: {
    cmd: 'node', args: [RUNNER, 'all'], shell: false, timeoutSec: 1500,
    line: '^(PASS|FAIL) (.*?)\\s*$', pass: 'PASS', fail: 'FAIL',
    normalize: '\\s+$',
  },
  parallel: 2,

  targets: [],
  requiredPass: [...VERIFY.map(V), ...NEW_UNIT.map(U), 'lint: oxlint'],
  obsoleteNames: [],
  unrelatedFails: [],
  flaky: [],

  anchors: [
    { file: 'tools/supabase-hardening-2026-10.sql', needle: 'create or replace function public.exhibit_events_rate_gate()' },
    { file: 'tools/supabase-hardening-2026-10.sql', needle: 'create or replace function public.exhibit_surveys_rate_gate()' },
    { file: 'tools/supabase-hardening-2026-10.sql', needle: "if coalesce(new.anon_id, '') <> '' then" },
    { file: 'tools/supabase-rate-limits-gaps.sql', needle: 'create or replace function public.exhibit_take_slot(p_bucket text, p_max integer, p_window interval)' },
    { file: 'tools/supabase-rate-limits-gaps.sql', needle: "'correct_idx', v_key.correct_idx," },
    { file: 'tools/supabase-quiz-integrity.sql', needle: "'correct_idx', v_key.correct_idx," },
    { file: 'tools/supabase-pending-migrations.sql', needle: "'correct_idx', v_key.correct_idx," },
    { file: 'tools/supabase-progress.sql', needle: 'create or replace function public.exhibit_surveys_rate_gate()' },
    { file: 'js/shared/ops.js', needle: 'let id = localStorage.getItem("baInsightsAnon");' },
    { file: 'js/study/study-app.js', needle: "const correctIdx = typeof res.correctIdx === 'number' ? res.correctIdx : (isCorrect ? selectedOptIdx : -1);" },
    { file: 'privacy.html', needle: 'baSurveyTimes, baOpsQueue</td>' },
    { file: 'server.py', needle: 'def send_head(self):' },
    { file: 'server.py', needle: 'HOST = "127.0.0.1"' },
    { file: 'functions/_middleware.js', needle: 'if (request.method === "OPTIONS" || request.method === "HEAD") return context.next();' },
    { file: 'functions/_middleware.js', needle: 'if (decision === "down" && request.method !== "GET") return unavailable();' },
    { file: '_headers', needle: 'https://*.ingest.de.sentry.io' },
    { file: '_headers', needle: 'Strict-Transport-Security:' },
    { file: 'tools/verify-headers.mjs', needle: 'line.length <= 1950' },
    { file: '.github/workflows/ci.yml', needle: 'uses: actions/checkout@v4' },
    { file: '.github/workflows/ci.yml', needle: 'uses: actions/setup-node@v4' },
    { file: '.github/workflows/ci.yml', needle: 'uses: actions/setup-python@v5' },
    { file: '.github/workflows/ci.yml', needle: 'runs-on: windows-latest' },
    { file: '.github/workflows/health.yml', needle: 'uses: actions/checkout@v4' },
    { file: 'js/shared/auth.js', needle: 'else clearPersonalData();' },
  ],

  invariants: [],

  checks: [
    { id: 'syntax-ops', desc: 'js/shared/ops.js is valid JavaScript', cmd: 'node', args: ['--check', 'js/shared/ops.js'] },
  ],

  mutations: [
    { id: 'MU1', what: 'drop the daily per-user cap from the events gate', file: 'tools/supabase-hardening-2026-10.sql',
      find: "    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');\n", replace: '',
      test: onlyVerify('tools/verify/verify_ratelimit.mjs'), mustFail: [V('tools/verify/verify_ratelimit.mjs')] },
    { id: 'MU2', what: 'drop the per-user cap from the surveys gate', file: 'tools/supabase-hardening-2026-10.sql',
      find: "    perform public.exhibit_take_slot('survey', 5, interval '1 hour');\n", replace: '',
      test: onlyVerify('tools/verify/verify_ratelimit.mjs'), mustFail: [V('tools/verify/verify_ratelimit.mjs')] },
    { id: 'MU3', what: 'return the answer key on a wrong pick again', file: 'tools/supabase-rate-limits-gaps.sql',
      find: "'correct_idx', case when v_correct then v_key.correct_idx end,", replace: "'correct_idx', v_key.correct_idx,",
      test: onlyVerify('tools/verify/verify_quiz_integrity.mjs'), mustFail: [V('tools/verify/verify_quiz_integrity.mjs')] },
    { id: 'MU4', what: 'treat every visitor as having given analytics consent in ops.js', file: 'js/shared/ops.js',
      find: 'const consented = hasAnalyticsConsent();', replace: 'const consented = true;',
      test: onlyUnit('sentry.test.mjs'), mustFail: [U('without analytics consent an error report never creates baInsightsAnon and carries a visit-only baOpsAnon ID')] },
    { id: 'MU5', what: 'remove the new key from the privacy page storage table', file: 'privacy.html',
      find: 'baOpsQueue, baOpsAnon</td>', replace: 'baOpsQueue</td>',
      test: onlyUnit('sentry.test.mjs'), mustFail: [U('the privacy page lists the visit-only error report ID')] },
    { id: 'MU6', what: 'stop checking the Host header in the dev server', file: 'server.py',
      find: 'if not self.is_local_host_header():', replace: 'if False:',
      test: onlyVerify('tools/verify/verify_load.mjs'), mustFail: [V('tools/verify/verify_load.mjs')] },
    { id: 'MU7', what: 'let HEAD requests skip the rate gate again', file: 'functions/_middleware.js',
      find: 'if (request.method === "OPTIONS") return context.next();', replace: 'if (request.method === "OPTIONS" || request.method === "HEAD") return context.next();',
      test: onlyUnit('middleware.test.mjs'), mustFail: [U('a HEAD request to a page is counted by the gate')] },
    { id: 'MU8', what: 'refuse HEAD requests when the gate is down', file: 'functions/_middleware.js',
      find: 'if (decision === "down" && !isRead(request)) return unavailable();', replace: 'if (decision === "down" && request.method !== "GET") return unavailable();',
      test: onlyUnit('middleware.test.mjs'), mustFail: [U('when the gate is down, a HEAD request still loads')] },
    { id: 'MU9', what: 'weaken the COOP header', file: '_headers',
      find: 'Cross-Origin-Opener-Policy: same-origin-allow-popups', replace: 'Cross-Origin-Opener-Policy: unsafe-none',
      test: onlyVerify('tools/verify-headers.mjs'), mustFail: [V('tools/verify-headers.mjs')] },
    { id: 'MU10', what: 'allow every Sentry project in connect-src again', file: '_headers',
      find: 'https://o4512321608679424.ingest.de.sentry.io', replace: 'https://*.ingest.de.sentry.io',
      test: onlyVerify('tools/verify-headers.mjs'), mustFail: [V('tools/verify-headers.mjs')] },
    { id: 'MU11', what: 'point the deploy job at a different environment', file: '.github/workflows/ci.yml',
      find: 'environment: production', replace: 'environment: staging',
      test: onlyVerify('tools/verify/verify_pages_deny.mjs'), mustFail: [V('tools/verify/verify_pages_deny.mjs')] },
    { id: 'MU12', what: 'pin an action by tag again', file: '.github/workflows/health.yml',
      find: 'uses: actions/checkout@' + SHA_CHECKOUT + ' # v4', replace: 'uses: actions/checkout@v4',
      test: onlyVerify('tools/verify/verify_pages_deny.mjs'), mustFail: [V('tools/verify/verify_pages_deny.mjs')] },
  ],
};
