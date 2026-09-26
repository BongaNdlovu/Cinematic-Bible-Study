import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

console.log('--- RUNNING RATE LIMIT VERIFICATION ---');

const insights = fs.readFileSync(path.join(ROOT, 'js/shared/insights.js'), 'utf8');
assert(insights.includes('const BATCH = 10'), 'insights flush batch must be 10');
assert(insights.includes('const FLUSH_MS = 10000'), 'insights flush interval must be 10000');
assert(insights.includes('const POSTS_PER_MIN = 12'), 'insights must cap 12 posts/min');
assert(insights.includes('const ROWS_PER_MIN = 60'), 'insights must cap 60 rows/min');
assert(insights.includes('const SURVEY_PER_HOUR = 5'), 'insights must cap 5 surveys/hour');
assert(insights.includes('takeFlushSlot'), 'insights must gate flushes');
assert(insights.includes('takeSurveySlot'), 'insights must gate surveys');
assert(insights.includes('anon_id: anonId()'), 'survey insert must send anon_id');

const progress = fs.readFileSync(path.join(ROOT, 'js/shared/progress-sync.js'), 'utf8');
assert(progress.includes('const PUSH_GAP_MS = 6000'), 'progress upsert gap must be 6s (10/min)');

const reviews = fs.readFileSync(path.join(ROOT, 'js/shared/reviews.js'), 'utf8');
assert(reviews.includes('const REVIEW_MAX = 3'), 'reviews must cap 3/day');
assert(reviews.includes('takeSurveySlot'), 'review survey insert must use survey slot');
assert(reviews.includes('anon_id:'), 'review survey insert must send anon_id');

const sql = fs.readFileSync(path.join(ROOT, 'tools/supabase-rate-limits.sql'), 'utf8');
assert(sql.includes("interval '1 minute') >= 60"), 'SQL events cap 60/min');
assert(sql.includes("interval '1 hour') >= 5"), 'SQL surveys cap 5/hour');
assert(sql.includes("interval '6 seconds'"), 'SQL progress cap 6 seconds');
assert(sql.includes("interval '1 day') >= 3"), 'SQL reviews cap 3/day');
assert(sql.includes('add column if not exists anon_id'), 'SQL adds survey anon_id');

const insightsSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-insights.sql'), 'utf8');
assert(insightsSql.includes('exhibit_events_rate_gate'), 'insights setup must include events write cap');
assert(insightsSql.includes("interval '1 minute') >= 60"), 'insights setup events cap 60/min');

const progressSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-progress.sql'), 'utf8');
assert(progressSql.includes('exhibit_surveys_rate_gate'), 'progress setup must include surveys write cap');
assert(progressSql.includes('exhibit_progress_rate_gate'), 'progress setup must include progress write cap');
assert(progressSql.includes("interval '1 hour') >= 5"), 'progress setup surveys cap 5/hour');

const reviewsSql = fs.readFileSync(path.join(ROOT, 'tools/supabase-reviews.sql'), 'utf8');
assert(reviewsSql.includes('exhibit_reviews_rate_gate'), 'reviews setup must include reviews write cap');
assert(reviewsSql.includes("interval '1 day') >= 3"), 'reviews setup reviews cap 3/day');

const auth = fs.readFileSync(path.join(ROOT, 'js/shared/auth.js'), 'utf8');
assert(auth.includes('const AUTH_PER_HOUR = 5'), 'auth must cap 5 Google sign-in starts/hour');
assert(auth.includes('takeAuthSlot'), 'auth must gate signIn');
assert(auth.includes('rate_limit'), 'auth must return rate_limit when capped');

const cf = fs.readFileSync(path.join(ROOT, 'functions/_middleware.js'), 'utf8');
assert(cf.includes('status: 429'), 'Cloudflare middleware must return 429');
assert(!cf.includes('new Map('), 'Cloudflare middleware must not keep a private counter');
assert(cf.includes('idFromName("exhibit")'), 'Cloudflare must ask the shared rate gate');
assert(cf.includes('limit_unavailable'), 'Cloudflare must record a missing counter');

const gate = fs.readFileSync(path.join(ROOT, 'workers/exhibit-rate-gate/src/rate-gate.js'), 'utf8');
assert(gate.includes('models: [60, 60000]'), 'shared gate must cap /models at 60/min');
assert(gate.includes('bible: [30, 60000]'), 'shared gate must cap /bible at 30/min');
assert(gate.includes('all: [240, 60000]'), 'shared gate must cap other paths at 240/min');

const vercel = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
assert(vercel.includes('status: 429'), 'Vercel middleware must return 429');
assert(!vercel.includes('new Map('), 'Vercel middleware must not keep a private counter');
assert(vercel.includes('/__rate'), 'Vercel must ask the Pages rate gate');
assert(vercel.includes('x-middleware-next'), 'Vercel middleware must continue with x-middleware-next');

const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
assert(pkg.includes('verify_ratelimit.mjs'), 'npm test must run verify_ratelimit.mjs');

console.log('1. Source caps present.');

const localStorageStore = {};
const sessionStorageStore = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null),
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; }
};
global.sessionStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionStorageStore, k) ? sessionStorageStore[k] : null),
  setItem: (k, v) => { sessionStorageStore[k] = String(v); },
  removeItem: (k) => { delete sessionStorageStore[k]; }
};
let insertedEvents = [];
const mockClient = {
  from: () => ({
    insert: (rows) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      insertedEvents.push(...arr);
      return Promise.resolve({ data: arr, error: null });
    },
    upsert: () => Promise.resolve({ data: null, error: null }),
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) })
  })
};
global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  ScrollAuth: {
    getClient: () => mockClient,
    getUser: () => null,
    onChange: () => {},
    ready: () => Promise.resolve()
  },
  BAAuthConfig: { cfAnalyticsToken: '' },
  addEventListener: () => {},
  location: { href: 'https://example.test/study.html', pathname: '/study.html', origin: 'https://example.test', search: '' }
};
global.document = {
  visibilityState: 'visible',
  readyState: 'complete',
  addEventListener: () => {},
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {} }
};
global.location = global.window.location;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { doNotTrack: '0', globalPrivacyControl: false },
    configurable: true,
    writable: true
  });
} catch (e) {}

new Function(insights)();
const Insights = global.window.Insights;

for (let i = 0; i < 5; i++) {
  assert.strictEqual(Insights.takeSurveySlot(), true, 'first 5 survey slots must pass');
}
assert.strictEqual(Insights.takeSurveySlot(), false, '6th survey in an hour must fail');

for (let i = 0; i < 13; i++) Insights.track('home_nav', null, { i: i });
await Insights.flush();
assert.ok(insertedEvents.length <= 10, 'first flush must send at most 10 rows');
const first = insertedEvents.length;
await Insights.flush();
assert.ok(insertedEvents.length - first <= 10, 'second flush must send at most 10 rows');
assert.ok(insertedEvents.length <= 13, 'queued extras stay under the 13 tracked events');

for (let i = 0; i < 20; i++) await Insights.flush();
assert.ok(insertedEvents.length <= 60, 'client must not send more than 60 event rows/min');

console.log('2. Client survey and event slots hold.');
console.log('✓ Rate limit constants, SQL, edge 429s, and client slots verified.');
process.exit(0);
