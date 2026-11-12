const SITE = String(process.argv[2] || process.env.SMOKE_BASE || 'https://cinematic-bible-study-daniel.pages.dev').replace(/\/$/, '');
const SUPABASE_URL = 'https://ttlrspnfadmxkoyqvofh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_k3fsJ1eGKIcmOxtmaZHbJw_R1qdW_ya';
const AUTH_HEALTH = SUPABASE_URL + '/auth/v1/health';
const DB_READ = SUPABASE_URL + '/rest/v1/rpc/exhibit_public_review_count';
const PAGES = ['/', '/study', '/account', '/reviews', '/map', '/gallery', '/privacy', '/terms'];
const PRIVATE = ['/docs/ARCHITECTURE.md', '/tests/unit/middleware.test.mjs', '/.git/config', '/wrangler.toml', '/server.py', '/tools/deploy-cloudflare-pages.ps1', '/functions/_middleware.js'];
const HEADERS = {
  'content-security-policy': /default-src 'self'/,
  'x-content-type-options': /^nosniff$/,
  'x-frame-options': /^DENY$/,
  'strict-transport-security': /max-age=\d+/
};
const TRIES = 2;

async function hit(url, init) {
  let last = null;
  for (let i = 0; i < TRIES; i += 1) {
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init });
      if (res.status < 500) return res;
      last = res;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (last instanceof Response) return last;
  return { status: 0, headers: new Headers(), text: async () => String(last && last.message) };
}

const results = [];
function record(ok, name, detail) {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
}

for (const path of PAGES) {
  const res = await hit(SITE + path);
  const body = res.status === 200 ? await res.text() : '';
  record(res.status === 200 && /<title>[^<]+<\/title>/i.test(body), `page ${path} loads`, `HTTP ${res.status}`);
}

const home = await hit(SITE + '/');
for (const [name, want] of Object.entries(HEADERS)) {
  const value = home.headers.get(name) || '';
  record(want.test(value), `header ${name}`, value ? '' : 'missing');
}

for (const path of PRIVATE) {
  const res = await hit(SITE + path);
  record(res.status === 404, `private ${path} is hidden`, `HTTP ${res.status}`);
}

const rate = await hit(SITE + '/__rate', { method: 'POST', body: '{}' });
record(rate.status === 403, 'rate proxy refuses callers without the secret', `HTTP ${rate.status}`);

const auth = await hit(AUTH_HEALTH);
record(auth.status > 0 && auth.status < 500, 'sign-in service answers', `HTTP ${auth.status}`);

const dbRead = await hit(DB_READ, {
  method: 'POST',
  headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
  body: '{}'
});
const dbBody = dbRead.status === 200 ? (await dbRead.text()).trim() : '';
const isCount = /^\d+$/.test(dbBody);
record(dbRead.status === 200 && isCount, 'database answers a read', `HTTP ${dbRead.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\nsmoke ${SITE}: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
