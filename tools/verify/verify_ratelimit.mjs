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
assert(cf.includes('idFromName(caller)'), 'Cloudflare must ask the per-IP rate gate');
assert(cf.includes('AbortSignal.timeout(2000)'), 'Cloudflare must time out the counter');
assert(cf.includes('limit_unavailable'), 'Cloudflare must record a missing counter');
assert(cf.includes('status: 503'), 'Cloudflare must refuse writes and the gate proxy when the counter does not answer');
assert(cf.includes('return "down"'), 'Cloudflare must report a missing counter as down');

const gate = fs.readFileSync(path.join(ROOT, 'workers/exhibit-rate-gate/src/rate-gate.js'), 'utf8');
assert(gate.includes('all: [240, 60000]'), 'shared gate must cap HTML and other paths at 240/min');
assert(gate.includes('account: [30, 60000]'), 'shared gate must cap the account page at 30/min');
assert(gate.includes('function prune'), 'shared gate must drop expired counters');
assert(gate.includes('"/assets/"'), 'shared gate must skip /assets/');
assert(gate.includes('"/js/"'), 'shared gate must skip /js/');
assert(gate.includes('"/css/"'), 'shared gate must skip /css/');
assert(gate.includes('"/vendor/"'), 'shared gate must skip /vendor/');
assert(gate.includes('"/models/"'), 'shared gate must skip /models/');
assert(gate.includes('"/bible/"'), 'shared gate must skip /bible/');
assert(gate.includes('isStaticPath'), 'shared gate must skip static prefixes before the page cap');
assert(!gate.includes('models: [60, 60000]'), 'shared gate must not cap /models at 60/min');
assert(!gate.includes('bible: [30, 60000]'), 'shared gate must not cap /bible at 30/min');

const vercel = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
assert(vercel.includes('status: 429'), 'Vercel middleware must return 429');
assert(!vercel.includes('new Map('), 'Vercel middleware must not keep a private counter');
assert(vercel.includes('/__rate'), 'Vercel must ask the Pages rate gate');
assert(vercel.includes('x-middleware-next'), 'Vercel middleware must continue with x-middleware-next');
assert(vercel.includes('AbortSignal.timeout(2000)'), 'Vercel must time out the counter');
assert(vercel.includes('status: 503'), 'Vercel must refuse writes when the counter does not answer');
assert(vercel.includes('decision === "unavailable"'), 'Vercel must treat a counter miss as unavailable');

const realFetch = globalThis.fetch;
const edgeReports = [];
globalThis.fetch = async (url, init) => {
  edgeReports.push({ url: String(url), body: init && init.body });
  return new Response(null, { status: 201 });
};
const { onRequest } = await import('../../functions/_middleware.js');
const SITE = 'https://cinematic-bible-study-daniel.pages.dev';

function gateThat(answer) {
  const calls = [];
  return {
    calls,
    idFromName(ip) { return ip; },
    get() {
      return {
        fetch: async (url, init) => {
          calls.push(JSON.parse(init.body).path);
          if (answer === 'throw') throw new Error('The operation was aborted due to timeout');
          return Response.json({ ok: answer === 'allow' });
        }
      };
    }
  };
}

function assetsStub(status) {
  const calls = [];
  return {
    calls,
    fetch: async (req) => {
      calls.push(new URL(req.url).pathname + new URL(req.url).search);
      if (status >= 300 && status < 400) return new Response(null, { status, headers: { location: '/elsewhere' } });
      return new Response('page body', { status, headers: { 'content-type': 'text/html' } });
    }
  };
}

async function edge(pathAndQuery, { method = 'GET', env = {}, headers = {}, body } = {}) {
  let nextCalls = 0;
  const res = await onRequest({
    request: new Request(SITE + pathAndQuery, { method, headers: { 'cf-connecting-ip': '203.0.113.9', ...headers }, body }),
    env,
    next: () => { nextCalls += 1; return new Response('next', { status: 200 }); },
    waitUntil: () => {}
  });
  return { res, nextCalls, text: await res.text() };
}

{
  const assets = assetsStub(200);
  const gateOk = gateThat('allow');
  const r = await edge('/study.html?sheet=3&from=map', { env: { RATE_GATE: gateOk, ASSETS: assets } });
  assert.strictEqual(r.res.status, 200, 'an allowed .html page is served');
  assert.strictEqual(r.text, 'page body', 'an allowed .html page is served from the asset store, not through a redirect');
  assert.deepStrictEqual(assets.calls, ['/study?sheet=3&from=map'], 'a .html page is fetched by its extensionless name with the query string kept');
  assert.strictEqual(r.nextCalls, 0, 'a .html page does not fall through to the 308');
  assert.deepStrictEqual(gateOk.calls, ['/study.html'], 'the gate is asked once per page read');
}
{
  const assets = assetsStub(200);
  await edge('/index.html', { env: { RATE_GATE: gateThat('allow'), ASSETS: assets } });
  await edge('/notes/index.html?q=1', { env: { RATE_GATE: gateThat('allow'), ASSETS: assets } });
  assert.deepStrictEqual(assets.calls, ['/', '/notes/?q=1'], 'index.html maps to its folder');
}
{
  const r = await edge('/study.html', { env: { RATE_GATE: gateThat('allow'), ASSETS: assetsStub(308) } });
  assert.strictEqual(r.nextCalls, 1, 'when the asset store still redirects, the request falls back to the normal route');
}
{
  const r = await edge('/study', { env: { RATE_GATE: gateThat('allow'), ASSETS: assetsStub(200) } });
  assert.strictEqual(r.nextCalls, 1, 'an extensionless page goes straight to the normal route');
}
{
  const r = await edge('/study.html', { env: { RATE_GATE: gateThat('allow') } });
  assert.strictEqual(r.nextCalls, 1, 'without an asset binding the page falls back to the normal route');
}
{
  edgeReports.length = 0;
  const assets = assetsStub(200);
  const r = await edge('/study.html', { env: { ASSETS: assets } });
  assert.strictEqual(r.res.status, 200, 'a GET page is served when the gate binding is missing');
  assert.strictEqual(assets.calls.length, 1, 'a GET page still skips the redirect when the gate is missing');
  assert(edgeReports.some((x) => String(x.body).includes('limit_unavailable')), 'a missing gate is still reported');
}
{
  const r = await edge('/map.html', { env: { RATE_GATE: gateThat('throw'), ASSETS: assetsStub(200) } });
  assert.strictEqual(r.res.status, 200, 'a GET page is served when the gate times out');
}
{
  const r = await edge('/study.html', { method: 'POST', env: { ASSETS: assetsStub(200) }, body: 'x' });
  assert.strictEqual(r.res.status, 503, 'a non-GET request is refused when the gate binding is missing');
  const t = await edge('/study.html', { method: 'POST', env: { RATE_GATE: gateThat('throw') }, body: 'x' });
  assert.strictEqual(t.res.status, 503, 'a non-GET request is refused when the gate times out');
}
{
  const r = await edge('/study.html', { env: { RATE_GATE: gateThat('deny'), ASSETS: assetsStub(200) } });
  assert.strictEqual(r.res.status, 429, 'a full gate still returns 429 for pages');
}
{
  const secret = 'verify-gate-secret';
  const r = await edge('/__rate', {
    method: 'POST',
    env: { RATE_GATE_SECRET: secret },
    headers: { authorization: 'Bearer ' + secret, 'content-type': 'application/json' },
    body: JSON.stringify({ ip: '203.0.113.9', path: '/study.html' })
  });
  assert.strictEqual(r.res.status, 503, 'the gate proxy stays strict when the gate is missing');
}
{
  const gateSeen = gateThat('allow');
  const r = await edge('/js/shared/boot.js', { env: { RATE_GATE: gateSeen, ASSETS: assetsStub(200) } });
  assert.strictEqual(r.nextCalls, 1, 'static files pass straight through');
  assert.strictEqual(gateSeen.calls.length, 0, 'static files do not wait on the gate');
}

function sequencedGate(answers) {
  let calls = 0;
  return {
    idFromName(ip) { return ip; },
    get() {
      return {
        fetch: async () => {
          const answer = answers[Math.min(calls, answers.length - 1)];
          calls += 1;
          return Response.json(answer);
        }
      };
    }
  };
}
const capReports = () => edgeReports.filter((x) => String(x.body).includes('"reason":"cap"')).length;
const denials = [{ ok: false, first: true }, { ok: false, first: false }, { ok: false, first: false }];
{
  edgeReports.length = 0;
  const pageGate = sequencedGate(denials);
  for (let i = 0; i < denials.length; i += 1) {
    const r = await edge('/study.html', { env: { RATE_GATE: pageGate, ASSETS: assetsStub(200) } });
    assert.strictEqual(r.res.status, 429, 'every denied page read gets 429, not only the first');
  }
  assert.strictEqual(capReports(), 1, 'a page read reports the cap once per window, on the first denial');
}
{
  edgeReports.length = 0;
  const secret = 'verify-gate-secret';
  const proxyGate = sequencedGate(denials);
  for (let i = 0; i < denials.length; i += 1) {
    const r = await edge('/__rate', {
      method: 'POST',
      env: { RATE_GATE_SECRET: secret, RATE_GATE: proxyGate },
      headers: { authorization: 'Bearer ' + secret, 'content-type': 'application/json' },
      body: JSON.stringify({ ip: '203.0.113.9', path: '/study.html' })
    });
    assert.strictEqual(r.res.status, 429, 'every denied gate proxy call gets 429, not only the first');
  }
  assert.strictEqual(capReports(), 1, 'the gate proxy reports the cap once per window, on the first denial');
}

const { middleware: vercelMiddleware } = await import('../../middleware.js');
const savedSecret = process.env.RATE_GATE_SECRET;
delete process.env.RATE_GATE_SECRET;
const vercelGet = await vercelMiddleware(new Request(SITE + '/study.html'));
assert.strictEqual(vercelGet.headers.get('x-middleware-next'), '1', 'Vercel serves a GET page when the gate is unavailable');
const vercelPost = await vercelMiddleware(new Request(SITE + '/study.html', { method: 'POST', body: 'x' }));
assert.strictEqual(vercelPost.status, 503, 'Vercel refuses a non-GET request when the gate is unavailable');
if (savedSecret !== undefined) process.env.RATE_GATE_SECRET = savedSecret;
globalThis.fetch = realFetch;
console.log('1b. Edge gate fails open for page reads, stays strict for writes, and serves .html without a redirect.');

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
