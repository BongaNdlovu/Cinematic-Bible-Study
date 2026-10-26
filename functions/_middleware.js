import * as Sentry from "@sentry/cloudflare";

const SUPABASE_URL = "https://ttlrspnfadmxkoyqvofh.supabase.co";
const SENTRY_DSN = "https://fb62126576bb04e73c1be1d851791ab8@o4512321608679424.ingest.de.sentry.io/4512321650557008";
const SUPABASE_KEY = "sb_publishable_k3fsJ1eGKIcmOxtmaZHbJw_R1qdW_ya";

const STATIC_PREFIXES = ["/assets/", "/js/", "/css/", "/vendor/", "/models/", "/bible/"];

function ipOf(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "0";
}

function denied() {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": "60", "Cache-Control": "no-store" }
  });
}

function unavailable() {
  return new Response("Service Unavailable", {
    status: 503,
    headers: { "Retry-After": "5", "Cache-Control": "no-store" }
  });
}

function reportEdge(context, path, reason, elapsed) {
  const job = fetch(SUPABASE_URL + "/rest/v1/exhibit_events", {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      event: "rate_limited",
      anon_id: "edge-rate-limit",
      page: String(path || "").slice(0, 60),
      detail: { reason: reason, ms: elapsed }
    })
  }).catch(function () {});
  if (context && typeof context.waitUntil === "function") context.waitUntil(job);
}

async function allowed(context, ip, path) {
  const gate = context.env && context.env.RATE_GATE;
  const caller = String(ip || "0");
  if (!gate || typeof gate.idFromName !== "function") {
    reportEdge(context, path, "limit_unavailable");
    return "down";
  }
  const started = Date.now();
  try {
    const stub = gate.get(gate.idFromName(caller));
    const res = await stub.fetch("https://gate/check", {
      method: "POST",
      body: JSON.stringify({ ip: caller, path: path }),
      signal: AbortSignal.timeout(2000)
    });
    const data = await res.json();
    if (data.ok) return "allow";
    return data.first ? "deny_first" : "deny";
  } catch (e) {
    reportEdge(context, path, "limit_unavailable", Date.now() - started);
    return "down";
  }
}

/* Compare without an early exit, so response time does not reveal how many
   leading characters of the secret a guess got right. */
function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

async function rateProxy(context, request) {
  const secret = context.env && context.env.RATE_GATE_SECRET;
  const header = request.headers.get("authorization") || "";
  if (!secret || !safeEqual(header, "Bearer " + secret)) {
    return new Response("Forbidden", { status: 403 });
  }
  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  const forwardedPath = String(body.path || "/");
  const decision = await allowed(context, String(body.ip || "0"), forwardedPath);
  if (decision === "down") return unavailable();
  if (decision === "deny_first") reportEdge(context, forwardedPath, "cap");
  if (decision === "deny" || decision === "deny_first") return denied();
  return new Response(null, { status: 204 });
}

function extensionlessUrl(url) {
  const p = url.pathname;
  if (!p.endsWith(".html")) return null;
  const target = new URL(url.toString());
  if (p === "/index.html" || p.endsWith("/index.html")) target.pathname = p.slice(0, -"index.html".length);
  else target.pathname = p.slice(0, -".html".length);
  return target;
}

function cspDirective(text) {
  const raw = String(text || "").slice(0, 2048);
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch (e) { return "unparsed"; }
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  const body = item && item["csp-report"] ? item["csp-report"] : (item && item.body ? item.body : item);
  const name = body && (body["effective-directive"] || body["violated-directive"]);
  const directive = String(name || "unknown").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
  return directive || "unknown";
}

async function takeReport(context, request) {
  const decision = await allowed(context, ipOf(request), "/csp-report");
  if (decision === "deny" || decision === "deny_first") return denied();
  if (decision !== "allow") return unavailable();
  let text = "";
  try { text = await request.text(); } catch (e) { text = ""; }
  reportEdge(context, "/csp-report", cspDirective(text));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

async function servePage(context, request) {
  const assets = context.env && context.env.ASSETS;
  const target = request.method === "GET" ? extensionlessUrl(new URL(request.url)) : null;
  if (!target || !assets || typeof assets.fetch !== "function") return context.next();
  const res = await assets.fetch(new Request(target.toString(), request));
  if (res.status >= 300 && res.status < 400) return context.next();
  return res;
}

async function handle(context) {
  const request = context.request;
  const path = new URL(request.url).pathname;
  if (
    path.startsWith("/docs") ||
    path.startsWith("/tools") ||
    path.startsWith("/tests") ||
    path.startsWith("/backups") ||
    path.startsWith("/workers") ||
    path.startsWith("/functions") ||
    path.startsWith("/qa") ||
    path.startsWith("/originals") ||
    /* Third-party research copies and diagram-migration working files. Neither
       belongs in a release: the first is copyrighted material gathered for the
       accuracy audit, the second is build input. */
    path.startsWith("/_factcheck") ||
    path.startsWith("/_mig") ||
    path === "/README.md" ||
    path === "/package.json" ||
    path === "/package-lock.json" ||
    path === "/server.py" ||
    path === "/vercel.json" ||
    path === "/wrangler.toml" ||
    path === "/start_website.bat" ||
    path === "/middleware.js" ||
    path === "/__wiring_check.mjs" ||
    path.includes("auth-config.example") ||
    path.includes("auth-config.be73b1b3b81c") ||
    path.includes("auth-config.cfc4671cd63c") ||
    path.includes("auth-config.f495d043ec28") ||
    /(^|\/)\.[^/]+/.test(path)
  ) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  }
  if (path === "/csp-report" && request.method === "POST") return takeReport(context, request);
  if (request.method === "OPTIONS" || request.method === "HEAD") return context.next();
  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);
  if (STATIC_PREFIXES.some(function (prefix) { return path.startsWith(prefix); })) return context.next();
  const ip = ipOf(request);
  const decision = await allowed(context, ip, path);
  if (decision === "deny_first") reportEdge(context, path, "cap");
  if (decision === "deny" || decision === "deny_first") return denied();
  if (decision === "down" && request.method !== "GET") return unavailable();
  return servePage(context, request);
}

const sentryPlugin = Sentry.sentryPagesPlugin(function (context) {
  const env = context && context.env;
  return {
    dsn: (env && env.SENTRY_DSN) || SENTRY_DSN,
    tracesSampleRate: 1,
    dataCollection: { userInfo: false }
  };
});

export async function onRequest(context) {
  return sentryPlugin(Object.assign({}, context, {
    next: function () { return handle(context); }
  }));
}
