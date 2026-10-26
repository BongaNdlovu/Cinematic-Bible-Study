import test from "node:test";
import assert from "node:assert/strict";
import { allow, decide } from "../../workers/exhibit-rate-gate/src/rate-gate.js";

const NOW = 1_700_000_000_000;

function spend(store, ip, path, n, now) {
  let last = null;
  for (let i = 0; i < n; i += 1) last = decide(store, ip, path, now);
  return last;
}

test("static paths never use a page budget", () => {
  const store = new Map();
  for (const path of ["/assets/a.jpg", "/js/x.js", "/css/x.css", "/vendor/v.js", "/models/m.glb", "/bible/kjv.json"]) {
    assert.equal(spend(store, "1.1.1.1", path, 500, NOW).ok, true, path);
  }
  assert.equal(store.size, 0);
});

test("pages allow 240 a minute, then deny and flag only the first denial", () => {
  const store = new Map();
  assert.equal(spend(store, "1.1.1.1", "/study.html", 240, NOW).ok, true);
  const first = decide(store, "1.1.1.1", "/study.html", NOW);
  assert.deepEqual(first, { ok: false, first: true });
  assert.deepEqual(decide(store, "1.1.1.1", "/study.html", NOW), { ok: false, first: false });
});

test("account and report paths have tighter budgets", () => {
  const store = new Map();
  assert.equal(spend(store, "2.2.2.2", "/account", 30, NOW).ok, true);
  assert.equal(decide(store, "2.2.2.2", "/account.html", NOW).ok, false);
  assert.equal(spend(store, "2.2.2.2", "/csp-report", 10, NOW).ok, true);
  assert.equal(decide(store, "2.2.2.2", "/csp-report", NOW).ok, false);
  assert.equal(decide(store, "2.2.2.2", "/index.html", NOW).ok, true, "the page bucket is separate");
});

test("callers do not share a budget", () => {
  const store = new Map();
  spend(store, "3.3.3.3", "/", 241, NOW);
  assert.equal(allow(store, "3.3.3.3", "/", NOW), false);
  assert.equal(allow(store, "4.4.4.4", "/", NOW), true);
});

test("the window resets after a minute and stale buckets are pruned", () => {
  const store = new Map();
  spend(store, "5.5.5.5", "/", 241, NOW);
  assert.equal(allow(store, "5.5.5.5", "/", NOW + 59_999), false);
  assert.equal(allow(store, "5.5.5.5", "/", NOW + 60_000), true);
  decide(store, "6.6.6.6", "/", NOW);
  decide(store, "7.7.7.7", "/assets/x", NOW + 200_000);
  assert.equal(store.has("all:6.6.6.6"), false);
});
