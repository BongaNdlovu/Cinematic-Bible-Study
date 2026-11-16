import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareMoved } from "../../tools/verify/verify_moved_functions.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "moved-"));
const file = (name, text) => {
  const full = path.join(dir, name);
  fs.writeFileSync(full, text);
  return full;
};

test("a function and a constant moved unchanged pass", () => {
  const before = file("a.js", "(function () {\n  const K = 2;\n  function f(x) { return x * K; }\n  f(1);\n})();\n");
  const after = file("b.js", "export const K = 2;\nexport function f(x) {\n  return x * K;\n}\n");
  assert.deepEqual(compareMoved([before], [after], ["f", "K"]), []);
});

test("a changed body, a missing name and a duplicate are each reported", () => {
  const before = file("c.js", "function f(x) { return x; }\nfunction g() {}\n");
  const after = file("d.js", "function f(x) { return x + 1; }\nfunction g() {}\nfunction g() {}\n");
  assert.deepEqual(compareMoved([before], [after], ["f", "g", "h"]), [
    "f: syntax tree differs",
    "g: 2 declarations after",
    "h: 0 declarations before"
  ]);
});
