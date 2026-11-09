import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SRC = fs.readFileSync(new URL("../../js/shared/sentry.js", import.meta.url), "utf8");

function boot(hostname, consent) {
  const calls = { init: null, integrations: [] };
  const Sentry = {
    init: (opts) => { calls.init = opts; },
    browserTracingIntegration: () => { calls.integrations.push("tracing"); return "tracing"; },
    replayIntegration: () => { calls.integrations.push("replay"); return "replay"; },
    feedbackIntegration: (opts) => { calls.integrations.push("feedback"); calls.feedback = opts; return "feedback"; }
  };
  const store = consent ? { sodConsent: JSON.stringify({ v: 1, analytics: true }) } : {};
  const window = { Sentry };
  vm.runInNewContext(SRC, {
    window,
    location: { hostname },
    navigator: {},
    localStorage: { getItem: (k) => store[k] || null }
  });
  return calls;
}

for (const host of ["localhost", "127.0.0.1", "[::1]", "shelf.localhost"]) {
  test(`Sentry stays off on ${host}, so tests and local work use no quota`, () => {
    const calls = boot(host, true);
    assert.equal(calls.init, null);
    assert.deepEqual(calls.integrations, []);
  });
}

test("production samples one page load in ten and never records replays", () => {
  const calls = boot("cinematic-bible-study-daniel.pages.dev", true);
  assert.equal(calls.init.environment, "production");
  assert.equal(calls.init.tracesSampleRate, 0.1);
  assert.equal(calls.init.replaysSessionSampleRate, 0);
  assert.equal(calls.init.replaysOnErrorSampleRate, 0);
  assert.ok(!calls.integrations.includes("replay"));
});

test("feedback is offered only with analytics consent and asks for no name or email", () => {
  assert.ok(!boot("cinematic-bible-study-daniel.pages.dev", false).integrations.includes("feedback"));
  const calls = boot("cinematic-bible-study-daniel.pages.dev", true);
  assert.ok(calls.integrations.includes("feedback"));
  assert.equal(calls.feedback.showName, false);
  assert.equal(calls.feedback.showEmail, false);
});

test("the privacy page names Sentry and still promises no session replay", () => {
  const html = fs.readFileSync(new URL("../../privacy.html", import.meta.url), "utf8");
  assert.match(html, /Sentry \(error monitoring\)/);
  assert.match(html, /never records your screen or replays your session/);
  assert.match(html, /We do not record your screen and we do not replay your sessions/);
});

for (const rel of ["../../functions/_middleware.js", "../../workers/exhibit-rate-gate/src/index.js"]) {
  test(`${rel.replace("../../", "")} traces one request in ten`, () => {
    const src = fs.readFileSync(new URL(rel, import.meta.url), "utf8");
    const rates = [...src.matchAll(/tracesSampleRate:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    assert.ok(rates.length > 0);
    assert.deepEqual(rates.filter((r) => r !== 0.1), []);
  });
}
