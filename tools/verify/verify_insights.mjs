import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

console.log('--- RUNNING USER INSIGHT TRACKING VERIFICATION ---');

// 1. Check tools/supabase-insights.sql
console.log('1. Checking tools/supabase-insights.sql...');
const sqlContent = fs.readFileSync(path.join(ROOT, 'tools/supabase-insights.sql'), 'utf8');
assert(sqlContent.includes('create table if not exists public.exhibit_events'), 'Missing exhibit_events table');
assert(sqlContent.includes('user_id uuid references auth.users (id)'), 'user_id must be nullable in exhibit_events');
assert(!sqlContent.includes('user_id uuid not null references auth.users (id)'), 'user_id must not be marked not null in exhibit_events');
assert(sqlContent.includes('anon_id text'), 'Missing anon_id column in exhibit_events');
assert(sqlContent.includes('session_id text'), 'Missing session_id column in exhibit_events');
assert(sqlContent.includes('sitting smallint'), 'Missing sitting column in exhibit_events');
assert(sqlContent.includes('sheet smallint'), 'Missing sheet column in exhibit_events');
assert(sqlContent.includes('add column if not exists session_id text'), 'Missing session_id in alter table migration block');
assert(sqlContent.includes('create index if not exists exhibit_events_sitting_idx'), 'Missing sitting index on exhibit_events');
assert(sqlContent.includes('create index if not exists exhibit_events_event_idx'), 'Missing event index on exhibit_events');
assert(sqlContent.includes('create table if not exists public.exhibit_profiles'), 'Missing exhibit_profiles table');
assert(sqlContent.includes('public.is_review_moderator()'), 'Missing moderator check in RLS');
assert(sqlContent.includes('grant insert on public.exhibit_events to anon, authenticated'), 'Missing insert grant to anon on exhibit_events');
assert(sqlContent.includes('grant select on public.exhibit_events to authenticated'), 'Missing select grant on exhibit_events');
assert(sqlContent.includes('grant select, insert, update on public.exhibit_profiles to authenticated'), 'Missing grant on exhibit_profiles');
console.log('✓ SQL schema, columns, indexes, RLS and grants verified.');

// 2. Check HTML files for tracker inclusion & opt-outs
console.log('2. Checking HTML files & CSP headers...');
const pages = ['index.html', 'study.html', 'gallery.html', 'map.html', 'insights.html'];
pages.forEach(p => {
  const c = fs.readFileSync(path.join(ROOT, p), 'utf8');
  assert(c.includes('js/shared/insights.js'), `${p} must include js/shared/insights.js`);
});
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(indexHtml.includes('data-insight-optout'), 'index.html must include opt-out toggle');
assert(indexHtml.includes('admin-insights-link'), 'index.html must include admin-insights-link');
assert(indexHtml.includes('insights.html'), 'index.html must link to insights.html');

const studyHtml = fs.readFileSync(path.join(ROOT, 'study.html'), 'utf8');
assert(studyHtml.includes('js/shared/insights.js'), 'study.html must include insights.js');

const compJs = fs.readFileSync(path.join(ROOT, 'js/study/competency.js'), 'utf8');
assert(compJs.includes('data-insight-optout'), 'competency.js must include opt-out toggle in progress modal');
assert(compJs.includes('bindOptOuts'), 'competency.js must bind opt-outs on modal open');

// CSP checks
const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
assert(headers.includes('https://static.cloudflareinsights.com'), '_headers missing static.cloudflareinsights.com in script-src');
assert(headers.includes('https://cloudflareinsights.com'), '_headers missing cloudflareinsights.com in connect-src');

const vercelJson = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
assert(vercelJson.includes('https://static.cloudflareinsights.com'), 'vercel.json missing static.cloudflareinsights.com');
assert(vercelJson.includes('https://cloudflareinsights.com'), 'vercel.json missing cloudflareinsights.com');
console.log('✓ HTML pages, opt-outs, and CSP headers verified.');

// 3. Check terms and journey version
console.log('3. Checking terms and journey TERMS_VERSION...');
const journeyJs = fs.readFileSync(path.join(ROOT, 'js/shared/journey.js'), 'utf8');
assert(/TERMS_VERSION\s*=\s*3/.test(journeyJs), 'TERMS_VERSION must be 3 in journey.js');

const termsJs = fs.readFileSync(path.join(ROOT, 'js/shared/terms.js'), 'utf8');
assert(termsJs.includes('What we learn from your study'), 'terms.js missing "What we learn from your study" header');
assert(termsJs.includes('anonymous until sign-in'), 'terms.js must mention anonymous learning until sign-in');
console.log('✓ TERMS_VERSION and data terms verified.');

// 4. Test Insights tracker logic
console.log('4. Testing js/shared/insights.js tracker logic...');

// Mock browser globals
const localStorageStore = {};
const sessionStorageStore = {};
const listeners = {};
const windowListeners = {};

global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null),
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; },
  clear: () => { for (const k in localStorageStore) delete localStorageStore[k]; }
};

global.sessionStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionStorageStore, k) ? sessionStorageStore[k] : null),
  setItem: (k, v) => { sessionStorageStore[k] = String(v); },
  removeItem: (k) => { delete sessionStorageStore[k]; },
  clear: () => { for (const k in sessionStorageStore) delete sessionStorageStore[k]; }
};

let insertedEvents = [];
let insertedSurveys = [];
let upsertedProfiles = [];
const mockClient = {
  from: (table) => ({
    insert: (rows) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      if (table === 'exhibit_events') insertedEvents.push(...arr);
      if (table === 'exhibit_surveys') insertedSurveys.push(...arr);
      return Promise.resolve({ data: arr, error: null });
    },
    upsert: (rows) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      if (table === 'exhibit_profiles') upsertedProfiles.push(...arr);
      return Promise.resolve({ data: arr, error: null });
    },
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      })
    })
  })
};

let currentUser = null;
global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  ScrollAuth: {
    getClient: () => mockClient,
    getUser: () => currentUser,
    onChange: (fn) => {},
    ready: () => Promise.resolve()
  },
  BAAuthConfig: {
    cfAnalyticsToken: 'test-token'
  },
  addEventListener: (name, fn) => {
    if (!windowListeners[name]) windowListeners[name] = [];
    windowListeners[name].push(fn);
  },
  removeEventListener: () => {},
  innerHeight: 800,
  scrollY: 0
};

global.document = {
  visibilityState: 'visible',
  readyState: 'complete',
  addEventListener: (name, fn) => {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(fn);
  },
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: (tag) => ({
    id: '',
    setAttribute: () => {},
    addEventListener: () => {},
    remove: () => {}
  }),
  scrollingElement: { scrollHeight: 2000 },
  head: { appendChild: () => {} },
  body: { appendChild: () => {} }
};

global.location = {
  href: 'https://example.com/study.html?ref=ref_xyz123&s=2',
  pathname: '/study.html'
};

global.history = {
  replaceState: (state, title, url) => {
    global.location.href = 'https://example.com' + url;
  }
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { doNotTrack: '0', globalPrivacyControl: false },
    configurable: true,
    writable: true
  });
} catch (e) {}

// Load insights.js in this sandbox
const insightsCode = fs.readFileSync(path.join(ROOT, 'js/shared/insights.js'), 'utf8');
const runTracker = new Function(insightsCode);
runTracker();

const Insights = global.window.Insights;
assert(Insights, 'window.Insights must be defined');
assert(typeof Insights.track === 'function', 'Insights.track must be a function');
assert(typeof Insights.readingTimer === 'function', 'Insights.readingTimer must be a function');
assert(typeof Insights.activeSeconds === 'function', 'Insights.activeSeconds must be a function');
assert(typeof Insights.setOptOut === 'function', 'Insights.setOptOut must be a function');
assert(typeof Insights.inviteUrl === 'function', 'Insights.inviteUrl must be a function');

// Test referral capture and URL rewriting (should strip ref but keep s)
assert.strictEqual(global.localStorage.getItem('baReferredBy'), 'ref_xyz123', 'baReferredBy should be stored');
assert.strictEqual(global.localStorage.getItem('baReferredSitting'), '2', 'baReferredSitting should be stored');
assert(!global.location.href.includes('ref='), 'ref query param should be stripped');
assert(global.location.href.includes('s=2'), 's query param should be preserved in location.href');

// Test inviteUrl generation
const inviteDefault = Insights.inviteUrl(3);
assert(inviteDefault.includes('s=3'), 'inviteUrl must include sheet param');
global.localStorage.setItem('baRefCode', 'code777');
const inviteWithCode = Insights.inviteUrl(4);
assert(inviteWithCode.includes('ref=code777'), 'inviteUrl must include ref code when present');
assert(inviteWithCode.includes('s=4'), 'inviteUrl must include sitting param');

// Test tracking when active
Insights.track('sitting_start', 0, { revisit: false });
const q1 = JSON.parse(global.localStorage.getItem('baInsightsQueue') || '[]');
assert.strictEqual(q1.length, 1, 'Event should be queued');
assert.strictEqual(q1[0].event, 'sitting_start');
assert.strictEqual(q1[0].sitting, 0);
assert.strictEqual(q1[0].sheet, 0);
assert(q1[0].anon_id, 'Event must include anon_id');
assert(q1[0].session_id, 'Event must include session_id');

// Test flush when anonymous
await Insights.flush();
assert.strictEqual(insertedEvents.length, 1, 'Event should be inserted to client');
assert.strictEqual(insertedEvents[0].user_id, null, 'Anonymous event must have user_id null');
assert.strictEqual(insertedEvents[0].event, 'sitting_start');
const qAfter = JSON.parse(global.localStorage.getItem('baInsightsQueue') || '[]');
assert.strictEqual(qAfter.length, 0, 'Queue should be emptied after flush');

// Test flush when signed in
currentUser = { id: 'usr_abc_123' };
Insights.track('quiz_answer', 1, { q: 0, chosen: 2, choice: 2, correct: true, attempt: 1 });
await Insights.flush();
assert.strictEqual(insertedEvents.length, 2, 'Two events should be inserted total');
assert.strictEqual(insertedEvents[1].user_id, 'usr_abc_123', 'Signed in event must have user_id');
assert.strictEqual(insertedEvents[1].detail.chosen, 2);
assert.strictEqual(insertedEvents[1].detail.attempt, 1);

// Test readingTimer and scroll depth milestones (including 100% near-bottom reach)
Insights.readingTimer(3);
global.window.scrollY = 600; // 600 / (2000 - 800) = 50%
if (windowListeners['scroll']) {
  windowListeners['scroll'].forEach(fn => fn());
}
const qScroll = JSON.parse(global.localStorage.getItem('baInsightsQueue') || '[]');
const scrollEvents = qScroll.filter(e => e.event === 'scroll_depth');
assert(scrollEvents.some(e => e.detail.depth === 25), 'Should record 25% depth milestone');
assert(scrollEvents.some(e => e.detail.depth === 50), 'Should record 50% depth milestone');
assert(!scrollEvents.some(e => e.detail.depth === 75), 'Should not record 75% depth before reaching it');

// Test near-bottom 100% tolerance (e.g. 1185 / 1200 = 98.75%)
global.window.scrollY = 1185;
if (windowListeners['scroll']) {
  windowListeners['scroll'].forEach(fn => fn());
}
const qScroll2 = JSON.parse(global.localStorage.getItem('baInsightsQueue') || '[]');
const scrollEvents2 = qScroll2.filter(e => e.event === 'scroll_depth');
assert(scrollEvents2.some(e => e.detail.depth === 100), 'Should record 100% milestone at near-bottom scroll');

// Test opt-out
Insights.setOptOut(true);
assert.strictEqual(Insights.optedOut(), true, 'optedOut() must be true after setOptOut(true)');
const prevInsertedCount = insertedEvents.length;
Insights.track('feature_use', 3, { feature: 'audio' });
const qOpt = JSON.parse(global.localStorage.getItem('baInsightsQueue') || '[]');
assert.strictEqual(qOpt.length, 0, 'No events should be queued when opted out');
Insights.flush();
assert.strictEqual(insertedEvents.length, prevInsertedCount, 'No events flushed when opted out');

// Test opt-in again
Insights.setOptOut(false);
assert.strictEqual(Insights.optedOut(), false, 'optedOut() should be false after setOptOut(false)');

console.log('✓ Tracker queueing, anonymous/signed-in flushing, readingTimer, scroll depth, and opt-out verified.');

// 5. Test Dashboard Calculations with the actual js/insights/insights.js code
console.log('5. Testing js/insights/insights.js calculations directly...');
const dashEvents = [
  { event: 'sitting_start', sitting: 0, sheet: 0, created_at: '2026-01-01T00:00:00Z' },
  { event: 'sitting_complete', sitting: 0, sheet: 0, detail: { seconds: 120 }, created_at: '2026-01-01T00:05:00Z' },
  { event: 'scroll_depth', sitting: 0, sheet: 0, detail: { depth: 25 }, created_at: '2026-01-01T00:01:00Z' },
  { event: 'scroll_depth', sitting: 0, sheet: 0, detail: { depth: 50 }, created_at: '2026-01-01T00:02:00Z' },
  { event: 'scroll_depth', sitting: 0, sheet: 0, detail: { depth: 75 }, created_at: '2026-01-01T00:03:00Z' },
  { event: 'scroll_depth', sitting: 0, sheet: 0, detail: { depth: 100 }, created_at: '2026-01-01T00:04:00Z' },
  // Q0: u1 got it right first try (attempt 1)
  { event: 'quiz_answer', sitting: 0, sheet: 0, detail: { q: 0, chosen: 1, correct: true, attempt: 1 }, user_id: 'u1', created_at: '2026-01-01T00:02:00Z' },
  // Q0: u2 missed first try (chose option 0 which is 'A', attempt 1)
  { event: 'quiz_answer', sitting: 0, sheet: 0, detail: { q: 0, chosen: 0, correct: false, attempt: 1 }, user_id: 'u2', created_at: '2026-01-01T00:02:05Z' },
  // Q0: u2 re-answered later and got it right on attempt 2
  { event: 'quiz_answer', sitting: 0, sheet: 0, detail: { q: 0, chosen: 1, correct: true, attempt: 2 }, user_id: 'u2', created_at: '2026-01-01T00:02:30Z' },
  { event: 'feature_use', sitting: 0, detail: { feature: 'print' }, created_at: '2026-01-01T00:06:00Z' },
  { event: 'gallery_view', sitting: 0, detail: { asset: 'head' }, created_at: '2026-01-01T00:07:00Z' },
  { event: 'map_pin', sitting: 0, detail: { id: 'babylon' }, created_at: '2026-01-01T00:08:00Z' },
  { event: 'referral_signup', sitting: 0, detail: { ref: 'partner1' }, created_at: '2026-01-01T00:09:00Z' }
];

const dashSurveys = [
  { rating: 5, feedback: 'Great clarity!', responses: { kind: 'sitting_pulse', sitting: 0, score: 5, note: 'Great clarity!' }, created_at: '2026-01-01T00:05:00Z' },
  { rating: 5, responses: { kind: 'exit', nps: 10, changed: 'Understood 457 BC thoroughly.' }, created_at: '2026-01-01T00:10:00Z' },
  { rating: 4, responses: { kind: 'exit', nps: 5, changed: 'Timeline is clearer.' }, created_at: '2026-01-01T00:11:00Z' }
];

const dashProfiles = [
  { study_mode: 'alone', background: 'adventist', found_via: 'search', ref_code: 'ref_1', referred_by: 'partner1', created_at: '2026-01-01T00:00:00Z' },
  { study_mode: 'group', background: 'protestant', found_via: 'friend', ref_code: 'ref_2', referred_by: 'partner1', created_at: '2026-01-01T00:00:00Z' }
];

// Load insights.js dashboard in sandbox
const dashCode = fs.readFileSync(path.join(ROOT, 'js/insights/insights.js'), 'utf8');
const runDash = new Function(dashCode);
runDash();

const Dashboard = global.window.InsightsDashboard;
assert(Dashboard, 'InsightsDashboard must be exported');
assert(typeof Dashboard.quizRows === 'function', 'Dashboard.quizRows must be a function');
assert(typeof Dashboard.timeAndDepthRows === 'function', 'Dashboard.timeAndDepthRows must be a function');
assert(typeof Dashboard.funnelRows === 'function', 'Dashboard.funnelRows must be a function');
assert(typeof Dashboard.csvEscape === 'function', 'Dashboard.csvEscape must be a function');

Dashboard.setDays(0); // All time
Dashboard.setCache({ events: dashEvents, surveys: dashSurveys, profiles: dashProfiles });

// Verify quizRows calculation
const quizCalculated = Dashboard.quizRows();
assert.strictEqual(quizCalculated.length, 1, 'Should have 1 question analyzed');
assert.strictEqual(quizCalculated[0].question, 'Sitting 0 Q1');
assert.strictEqual(quizCalculated[0].attempts, 2, 'Should analyze 2 unique learners (u1 and u2)');
assert.strictEqual(quizCalculated[0].first_try_pct, 50, 'First try percent should be 50% (1 of 2)');
assert.strictEqual(quizCalculated[0].top_wrong, 'A', 'Top wrong option should be letter A for option 0');

// Verify timeAndDepthRows calculation
const timeCalculated = Dashboard.timeAndDepthRows();
assert.strictEqual(timeCalculated.length, 11, 'Should analyze all 11 sittings');
const s0Time = timeCalculated[0];
assert.strictEqual(s0Time.avg_seconds, 120, 'Average seconds should be 120');
assert.strictEqual(s0Time.completed_sessions, 1, 'Completed sessions should be 1');
assert.strictEqual(s0Time.depth_25, 1, 'Depth 25 should be 1');
assert.strictEqual(s0Time.depth_50, 1, 'Depth 50 should be 1');
assert.strictEqual(s0Time.depth_75, 1, 'Depth 75 should be 1');
assert.strictEqual(s0Time.depth_100, 1, 'Depth 100 should be 1');

// Verify funnelRows calculation
const funnelCalculated = Dashboard.funnelRows();
assert.strictEqual(funnelCalculated[0].started, 1, 'Sitting 0 starts should be 1');
assert.strictEqual(funnelCalculated[0].completed, 1, 'Sitting 0 completions should be 1');

// Verify CSV escaping using actual dashboard function
assert.strictEqual(Dashboard.csvEscape('hello'), 'hello');
assert.strictEqual(Dashboard.csvEscape('hello, world'), '"hello, world"');
assert.strictEqual(Dashboard.csvEscape('line1\nline2'), '"line1\nline2"');
assert.strictEqual(Dashboard.csvEscape('say "hi"'), '"say ""hi"""');

console.log('✓ Real dashboard analytics & CSV escaping formulas verified.');

// 6. Test Instrumentation in study-app, workbench, certificate
console.log('6. Checking instrumentation points in study-app, workbench, certificate...');
const studyAppJs = fs.readFileSync(path.join(ROOT, 'js/study/study-app.js'), 'utf8');
assert(studyAppJs.includes("track('sitting_start'"), 'study-app missing sitting_start track');
assert(studyAppJs.includes("track('path_step'"), 'study-app missing path_step track');
assert(studyAppJs.includes("track('quiz_answer'"), 'study-app missing quiz_answer track');
assert(studyAppJs.includes("track('sitting_complete'"), 'study-app missing sitting_complete track');
assert(studyAppJs.includes('The first sitting is yours.'), 'study-app missing first-sitting celebration');
assert(studyAppJs.includes('Halfway through the scroll.'), 'study-app missing middle-sitting celebration');
assert(studyAppJs.includes('Well done.'), 'study-app missing final-sitting celebration');
assert(studyAppJs.includes('burstConfetti'), 'study-app missing confetti burst');
assert(studyAppJs.includes("track('course_complete'"), 'study-app missing course_complete track');
assert(studyAppJs.includes("readingTimer("), 'study-app must call readingTimer');
assert(studyAppJs.includes("baReferredSitting"), 'study-app must support baReferredSitting in resolveStartSheet');
assert(studyAppJs.includes("maybePulse()"), 'study-app must show the last-sitting pulse without advancing');

const workbenchJs = fs.readFileSync(path.join(ROOT, 'js/study/workbench.js'), 'utf8');
assert(workbenchJs.includes("track('workbench_task'"), 'workbench missing workbench_task track');
assert(workbenchJs.includes("pass: true"), 'workbench missing pass: true track');
assert(workbenchJs.includes("pass: false"), 'workbench missing pass: false track');

const certJs = fs.readFileSync(path.join(ROOT, 'js/study/certificate.js'), 'utf8');
assert(certJs.includes("track('feature_use'"), 'certificate missing feature_use track');
assert(certJs.includes("cert-review-nps"), 'certificate missing NPS select');
assert(certJs.includes("cert-review-changed"), 'certificate missing changed textarea');

console.log('✓ All 6 check phases passed successfully!');
process.exit(0);
