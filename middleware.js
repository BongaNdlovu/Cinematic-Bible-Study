const buckets = new Map();

function ipOf(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || '0';
}

function take(ip, name, limit, windowMs) {
  const k = name + ':' + ip;
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.start >= windowMs) b = { start: now, n: 0 };
  b.n += 1;
  buckets.set(k, b);
  return b.n <= limit;
}

function denied() {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' }
  });
}

function pass() {
  return new Response(null, {
    status: 200,
    headers: { 'x-middleware-next': '1' }
  });
}

export function middleware(request) {
  try {
    if (request.method === 'OPTIONS' || request.method === 'HEAD') {
      return pass();
    }
    const ip = ipOf(request);
    const path = new URL(request.url).pathname;
    if (path.startsWith('/models/') && !take(ip, 'models', 60, 60000)) return denied();
    if (path.startsWith('/bible/') && !take(ip, 'bible', 30, 60000)) return denied();
    if (!take(ip, 'all', 240, 60000)) return denied();
  } catch (e) {}
  return pass();
}

export default middleware;

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)']
};
