const SUPABASE_URL = "https://ttlrspnfadmxkoyqvofh.supabase.co";
const SUPABASE_KEY = "sb_publishable_k3fsJ1eGKIcmOxtmaZHbJw_R1qdW_ya";

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
    return true;
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
    return !!data.ok;
  } catch (e) {
    reportEdge(context, path, "limit_unavailable", Date.now() - started);
    return true;
  }
}

async function rateProxy(context, request) {
  const secret = context.env && context.env.RATE_GATE_SECRET;
  const header = request.headers.get("authorization") || "";
  if (!secret || header !== "Bearer " + secret) {
    return new Response("Forbidden", { status: 403 });
  }
  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  const forwardedPath = String(body.path || "/");
  const ok = await allowed(context, String(body.ip || "0"), forwardedPath);
  if (!ok) {
    reportEdge(context, forwardedPath, "cap");
    return denied();
  }
  return new Response(null, { status: 204 });
}

export async function onRequest(context) {
  const request = context.request;
  if (request.method === "OPTIONS" || request.method === "HEAD") return context.next();
  const path = new URL(request.url).pathname;
  if (path === "/__rate" && request.method === "POST") return rateProxy(context, request);
  const ip = ipOf(request);
  if (!(await allowed(context, ip, path))) {
    reportEdge(context, path, "cap");
    return denied();
  }
  return context.next();
}
