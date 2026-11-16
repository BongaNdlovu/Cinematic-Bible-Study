import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSource, compare, parseArgs } from "../../tools/verify/verify_equivalence.mjs";

function makeTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "equiv-"));
  for (const [name, text] of Object.entries(files)) {
    const full = path.join(root, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  }
  return root;
}

function run(before, after, opts = {}) {
  return compare(openSource(before), openSource(after), opts);
}

test("JS that differs only in comments, spacing and quote style is identical", () => {
  const a = makeTree({ "a.js": "// note\nfunction add(x, y) { return x + y; }\nvar s = 'hi';\n" });
  const b = makeTree({ "a.js": "/* other */ function add(x,\n y) {\n  return x + y;\n}\nvar s = \"hi\";\n" });
  assert.equal(run(a, b).filter((r) => r.diff).length, 0);
});

test("JS with a changed operator is reported with its line", () => {
  const a = makeTree({ "a.js": "var a = 1;\nfunction add(x, y) { return x + y; }\n" });
  const b = makeTree({ "a.js": "var a = 1;\nfunction add(x, y) { return x - y; }\n" });
  const [r] = run(a, b);
  assert.equal(r.diff.index, 1);
  assert.match(r.diff.before, /line 2/);
});

test("JS statements that are reordered are reported", () => {
  const a = makeTree({ "a.js": "var a = 1;\nvar b = 2;\n" });
  const b = makeTree({ "a.js": "var b = 2;\nvar a = 1;\n" });
  assert.equal(run(a, b)[0].diff.index, 0);
});

test("ES module syntax is accepted", () => {
  const a = makeTree({ "m.mjs": "import x from './x.js';\nexport const y = x;\n" });
  const b = makeTree({ "m.mjs": "import x from './x.js'; // c\nexport const y = x;\n" });
  assert.equal(run(a, b).filter((r) => r.diff).length, 0);
});

test("CSS that differs only in comments and whitespace is identical", () => {
  const a = makeTree({ "s.css": "/* c */\n.a{color:red;margin:0}\n@media (min-width:600px){.b{top:1px}}\n" });
  const b = makeTree({ "s.css": ".a {\n  color: red;\n  margin: 0;\n}\n@media   (min-width:600px) {\n .b { top: 1px; }\n}\n" });
  assert.equal(run(a, b).filter((r) => r.diff).length, 0);
});

test("CSS rules in a different order are reported, because order is the cascade", () => {
  const a = makeTree({ "s.css": ".a{color:red}\n.b{color:blue}\n" });
  const b = makeTree({ "s.css": ".b{color:blue}\n.a{color:red}\n" });
  assert.equal(run(a, b)[0].diff.index, 0);
});

test("a CSS value change and an added !important are reported", () => {
  const a = makeTree({ "s.css": ".a{color:red}\n" });
  const b = makeTree({ "s.css": ".a{color:red !important}\n" });
  assert.ok(run(a, b)[0].diff);
});

test("a file missing after is reported", () => {
  const a = makeTree({ "a.js": "var a = 1;\n" });
  const b = makeTree({});
  assert.equal(run(a, b)[0].diff.note, "missing after");
});

test("a split stylesheet joined in order equals the original", () => {
  const a = makeTree({ "big.css": ".a{color:red}\n.b{color:blue}\n.c{top:0}\n" });
  const b = makeTree({ "one.css": ".a{color:red}\n", "two.css": ".b{color:blue}\n.c{top:0}\n" });
  const same = run(a, b, { "before-files": "big.css", "after-files": "one.css,two.css" });
  assert.equal(same[0].diff, null);
  const swapped = run(a, b, { "before-files": "big.css", "after-files": "two.css,one.css" });
  assert.ok(swapped[0].diff);
});

test("a JS file that cannot be parsed fails loudly", () => {
  const a = makeTree({ "a.js": "var a = ;\n" });
  const b = makeTree({ "a.js": "var a = 1;\n" });
  assert.throws(() => run(a, b), /cannot parse/);
});

test("arguments without a value are rejected", () => {
  assert.throws(() => parseArgs(["--before"]), /Missing value/);
  assert.deepEqual(parseArgs(["--before", "x", "--after", "y"]), { before: "x", after: "y" });
});
