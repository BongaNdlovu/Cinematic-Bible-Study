import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../../functions/_middleware.js";

const posted = [];
globalThis.fetch = async (url, init) => {
  posted.push({ url: String(url), body: init && init.body ? JSON.parse(init.body) : null });
  return new Response(null, { status: 201 });
};

function gate(verdict) {
  if (verdict === "missing") return undefined;
  return {
    idFromName: (name) => name,
    get: () => ({
      fetch: async () => {
        if (verdict === "throw") throw new Error("down");
        return Response.json(verdict);
      }
    })
  };
}

function context(path, { method = "GET", verdict = { ok: true, first: false }, secret, headers = {}, body } = {}) {
  const jobs = [];
  return {
    request: new Request("https://site.test" + path, method === "GET" ? { headers } : { method, headers, body }),
    env: {
      RATE_GATE: gate(verdict),
      RATE_GATE_SECRET: secret,
      ASSETS: { fetch: async (req) => new Response("asset:" + new URL(req.url).pathname, { status: 200 }) }
    },
    next: async () => new Response("next", { status: 200 }),
    waitUntil: (p) => jobs.push(p),
    jobs
  };
}

test("private paths answer 404 without touching the gate", async () => {
  for (const path of ["/docs/ARCHITECTURE.md", "/tools/x.mjs", "/tests/unit/x.test.mjs", "/.git/config", "/wrangler.toml", "/server.py", "/js/shared/auth-config.example.js"]) {
    const res = await onRequest(context(path, { verdict: "throw" }));
    assert.equal(res.status, 404, path);
  }
});

test("static folders skip the gate", async () => {
  const res = await onRequest(context("/js/shared/auth.js", { verdict: { ok: false, first: false } }));
  assert.equal(await res.text(), "next");
});

test("a denied caller gets 429, and only the first denial is reported", async () => {
  posted.length = 0;
  const first = await onRequest(context("/study", { verdict: { ok: false, first: true } }));
  assert.equal(first.status, 429);
  assert.equal(first.headers.get("Retry-After"), "60");
  const again = await onRequest(context("/study", { verdict: { ok: false, first: false } }));
  assert.equal(again.status, 429);
  assert.equal(posted.filter((p) => p.body && p.body.detail.reason === "cap").length, 1);
});

test("when the gate is down, reads still load and writes are refused", async () => {
  const read = await onRequest(context("/study.html", { verdict: "throw" }));
  assert.equal(read.status, 200);
  const write = await onRequest(context("/study", { method: "POST", verdict: "throw" }));
  assert.equal(write.status, 503);
  const unbound = await onRequest(context("/study", { method: "POST", verdict: "missing" }));
  assert.equal(unbound.status, 503);
});

test("allowed .html pages are served without a redirect", async () => {
  const res = await onRequest(context("/study.html"));
  assert.equal(await res.text(), "asset:/study");
});

test("the rate proxy needs the exact bearer secret", async () => {
  const none = await onRequest(context("/__rate", { method: "POST", secret: "s3cret", body: "{}" }));
  assert.equal(none.status, 403);
  const wrong = await onRequest(context("/__rate", { method: "POST", secret: "s3cret", headers: { authorization: "Bearer s3cres" }, body: "{}" }));
  assert.equal(wrong.status, 403);
  const unset = await onRequest(context("/__rate", { method: "POST", headers: { authorization: "Bearer undefined" }, body: "{}" }));
  assert.equal(unset.status, 403);
  const right = await onRequest(context("/__rate", { method: "POST", secret: "s3cret", headers: { authorization: "Bearer s3cret" }, body: JSON.stringify({ ip: "9.9.9.9", path: "/" }) }));
  assert.equal(right.status, 204);
});

test("csp reports are capped and keep only the directive name", async () => {
  posted.length = 0;
  const body = JSON.stringify({ "csp-report": { "effective-directive": "script-src<x>", "document-uri": "https://site.test/?email=a@b.c" } });
  const ok = await onRequest(context("/csp-report", { method: "POST", body }));
  assert.equal(ok.status, 204);
  const sent = posted.find((p) => p.body && p.body.page === "/csp-report");
  assert.deepEqual(sent.body.detail, { reason: "script-srcx" });
  const capped = await onRequest(context("/csp-report", { method: "POST", body, verdict: { ok: false, first: false } }));
  assert.equal(capped.status, 429);
});
