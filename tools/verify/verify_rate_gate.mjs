import assert from "assert";
import fs from "fs";
import { allow, decide } from "../../workers/exhibit-rate-gate/src/rate-gate.js";

const now = 1_700_000_000_000;
const shared = new Map();
for (let i = 0; i < 300; i += 1) {
  assert.strictEqual(allow(shared, "10.0.0.1", "/bible/kjv.json", now), true, "bible reads stay outside the page cap");
}
assert.strictEqual(allow(shared, "10.0.0.1", "/models/full_body.glb", now), true, "model reads stay outside the page cap");
assert.strictEqual(allow(shared, "10.0.0.1", "/js/shared/boot.js", now), true, "script reads stay outside the page cap");
assert.strictEqual(allow(shared, "10.0.0.1", "/assets/site/hero-main.jpg", now), true, "asset reads stay outside the page cap");

for (let i = 0; i < 240; i += 1) {
  assert.strictEqual(allow(shared, "10.0.0.1", "/study.html", now), true);
}
assert.strictEqual(allow(shared, "10.0.0.1", "/study.html", now), false, "241st HTML read on the shared counter is denied");
assert.strictEqual(allow(shared, "10.0.0.2", "/study.html", now), true, "a second caller on the same counter has its own budget");

const separate = new Map();
assert.strictEqual(allow(separate, "10.0.0.1", "/study.html", now), true, "a different counter does not see the shared one");

let chain = Promise.resolve();
function serialized(task) {
  const run = chain.then(task, task);
  chain = run.then(function () {}, function () {});
  return run;
}

const counted = new Map();
const overlap = await Promise.all([
  serialized(function () { return allow(counted, "10.1.0.1", "/study.html", now); }),
  serialized(function () { return allow(counted, "10.1.0.1", "/study.html", now); })
]);
assert.deepStrictEqual(overlap, [true, true]);
assert.strictEqual(counted.get("all:10.1.0.1").n, 2, "serialized checks do not lose a count");

const account = new Map();
for (let i = 0; i < 30; i += 1) {
  assert.strictEqual(allow(account, "10.8.0.1", "/account", now), true);
}
assert.strictEqual(allow(account, "10.8.0.1", "/account.html", now), false, "the account page has a 30-read budget");
assert.strictEqual(allow(account, "10.8.0.1", "/study.html", now), true, "the account budget does not spend the page budget");

const aging = new Map();
assert.strictEqual(allow(aging, "10.9.0.1", "/study.html", now), true);
assert.strictEqual(allow(aging, "10.9.0.1", "/study.html", now + 60001), true);
assert.strictEqual(aging.get("all:10.9.0.1").n, 1, "an expired counter is dropped before the next page");
assert.strictEqual(aging.size, 1, "the expired counter is not kept beside the new one");

const windowed = new Map();
assert.strictEqual(decide(windowed, "10.10.0.1", "/study.html", now).first, false, "a first allowed read is not a denial");
for (let i = 1; i < 240; i += 1) decide(windowed, "10.10.0.1", "/study.html", now);
const crossing = decide(windowed, "10.10.0.1", "/study.html", now);
assert.deepStrictEqual(crossing, { ok: false, first: true }, "the read that crosses the page cap is the first denial");
for (let i = 0; i < 5; i += 1) {
  assert.deepStrictEqual(decide(windowed, "10.10.0.1", "/study.html", now), { ok: false, first: false }, "later denials in the same window are not first");
}
assert.strictEqual(windowed.get("all:10.10.0.1").n, 241, "a denied IP's counter stops growing at limit plus one");
assert.deepStrictEqual(decide(windowed, "10.10.0.1", "/study.html", now + 60001), { ok: true, first: false }, "a new window allows again");

const { ExhibitRateGate } = await import("../../workers/exhibit-rate-gate/src/index.js");
const gateObject = new ExhibitRateGate();
const askGate = async (ip, path) => {
  const res = await gateObject.fetch(new Request("https://gate/check", { method: "POST", body: JSON.stringify({ ip, path }) }));
  return res.json();
};
for (let i = 0; i < 240; i += 1) {
  assert.deepStrictEqual(await askGate("10.11.0.1", "/study.html"), { ok: true, first: false });
}
assert.deepStrictEqual(await askGate("10.11.0.1", "/study.html"), { ok: false, first: true }, "the durable object flags the first denial");
assert.deepStrictEqual(await askGate("10.11.0.1", "/study.html"), { ok: false, first: false }, "the durable object does not flag a second denial");
await askGate("10.11.0.1", "/study.html");
await askGate("10.11.0.1", "/study.html");
assert.strictEqual(gateObject.store.get("all:10.11.0.1").n, 241, "the durable object stops counting a blocked IP");

const gateSource = fs.readFileSync(new URL("../../workers/exhibit-rate-gate/src/index.js", import.meta.url), "utf8");
assert.ok(!gateSource.includes("blockConcurrencyWhile"), "the counter needs no lock: it decides synchronously in memory");
assert.ok(!gateSource.includes("storage"), "the counter keeps its buckets in memory, with no durable write per request");
assert.ok(gateSource.includes("await request.json()"), "the counter reads the body before deciding");

console.log("shared rate gate holds one store");
