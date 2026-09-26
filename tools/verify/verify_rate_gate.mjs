import assert from "assert";
import { allow } from "../../workers/exhibit-rate-gate/src/rate-gate.js";

const now = 1_700_000_000_000;
const shared = new Map();
for (let i = 0; i < 30; i += 1) {
  assert.strictEqual(allow(shared, "10.0.0.1", "/bible/kjv.json", now), true);
}
assert.strictEqual(allow(shared, "10.0.0.1", "/bible/kjv.json", now), false, "31st bible read on the shared counter is denied");
assert.strictEqual(allow(shared, "10.0.0.2", "/bible/kjv.json", now), true, "a second caller on the same counter has its own budget");

const separate = new Map();
assert.strictEqual(allow(separate, "10.0.0.1", "/bible/kjv.json", now), true, "a different counter does not see the shared one");

console.log("shared rate gate holds one store");
