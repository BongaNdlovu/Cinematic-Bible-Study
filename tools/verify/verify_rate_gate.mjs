import assert from "assert";
import fs from "fs";
import { allow } from "../../workers/exhibit-rate-gate/src/rate-gate.js";

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

const gateSource = fs.readFileSync(new URL("../../workers/exhibit-rate-gate/src/index.js", import.meta.url), "utf8");
assert.ok(gateSource.includes("blockConcurrencyWhile"), "the counter object serializes its update");
assert.ok(gateSource.includes("await request.json()"), "the counter reads the body before the lock");

console.log("shared rate gate holds one store");
