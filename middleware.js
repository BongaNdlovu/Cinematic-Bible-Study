const GATE_URL = "https://cinematic-bible-study-daniel.pages.dev/__rate";

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

function pass() {
  return new Response(null, {
    status: 200,
    headers: { "x-middleware-next": "1" }
  });
}

async function askGate(ip, path) {
  const secret = typeof process !== "undefined" && process.env && process.env.RATE_GATE_SECRET;
  if (!secret) return "unavailable";
  try {
    const res = await fetch(GATE_URL, {
      method: "POST",
      headers: {
        authorization: "Bearer " + secret,
        "content-type": "application/json"
      },
      body: JSON.stringify({ ip: ip, path: path }),
      signal: AbortSignal.timeout(2000)
    });
    if (res.status === 429) return "deny";
    if (res.status === 204) return "allow";
    return "unavailable";
  } catch (e) {
    return "unavailable";
  }
}

export async function middleware(request) {
  if (request.method === "OPTIONS" || request.method === "HEAD") return pass();
  const decision = await askGate(ipOf(request), new URL(request.url).pathname);
  if (decision === "deny") return denied();
  return pass();
}

export default middleware;

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"]
};
