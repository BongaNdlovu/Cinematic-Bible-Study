import test from "node:test";
import assert from "node:assert/strict";
import { summarizeOutput } from "../../tools/verify/run_browser_checks.mjs";

const passLines = (n) => Array.from({ length: n }, (_, i) => `PASS check ${i}`);

test("a FAIL line above the last 30 lines is kept", () => {
  const output = ["FAIL [s3/desktop] M2.1 early failure", ...passLines(40)].join("\n");
  const { failLines, tail } = summarizeOutput(output);
  assert.deepEqual(failLines, ["FAIL [s3/desktop] M2.1 early failure"]);
  assert.equal(tail.split("\n").length, 30);
});

test("a FAIL line inside the last 30 lines is not repeated", () => {
  const output = [...passLines(40), "    FAIL  late failure"].join("\n");
  const { failLines, tail } = summarizeOutput(output);
  assert.deepEqual(failLines, []);
  assert.ok(tail.endsWith("FAIL  late failure"));
});

test("at most 40 earlier FAIL lines are kept", () => {
  const fails = Array.from({ length: 50 }, (_, i) => `FAIL item ${i}`);
  const { failLines } = summarizeOutput([...fails, ...passLines(30)].join("\n"));
  assert.equal(failLines.length, 40);
  assert.equal(failLines[0], "FAIL item 0");
});

test("a line that only mentions FAIL later is not counted", () => {
  const { failLines } = summarizeOutput(["PASS no FAIL here", ...passLines(30)].join("\n"));
  assert.deepEqual(failLines, []);
});
