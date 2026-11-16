import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../../js/insights/insights-format.js", import.meta.url), "utf8");
const sandbox = { window: {}, Intl, Date, Number, String, Math, Object };
vm.runInNewContext(src, sandbox);
const F = sandbox.window.InsightsFormat;

test("csvEscape quotes separators and defuses formula prefixes", () => {
  assert.equal(F.csvEscape("plain"), "plain");
  assert.equal(F.csvEscape("a,b"), '"a,b"');
  assert.equal(F.csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(F.csvEscape("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(F.csvEscape(null), "");
});

test("pct rounds and guards an empty whole", () => {
  assert.equal(F.pct(1, 3), 33);
  assert.equal(F.pct(5, 0), 0);
});

test("duration writes minutes and seconds, then hours", () => {
  assert.equal(F.duration(65), "1m 05s");
  assert.equal(F.duration(3725), "1h 2m");
  assert.equal(F.duration(-4), "0m 00s");
});

test("plural picks the singular only for one", () => {
  assert.match(F.plural(1, "reader", "readers"), /^1 reader$/);
  assert.match(F.plural(2, "reader", "readers"), /readers$/);
});

test("countBy counts, skips empty keys and sorts by count", () => {
  const out = F.countBy(["a", "b", "a", "", null, "a", "b", "c"], (x) => x);
  assert.equal(JSON.stringify(out), '[["a",3],["b",2],["c",1]]');
});

test("day formats a date and returns empty for nonsense", () => {
  assert.equal(F.day(""), "");
  assert.equal(F.day("not a date"), "");
  assert.match(F.day("2026-03-04T12:00:00Z"), /2026/);
});

test("scoreOf accepts ratings from 1 to 5 only", () => {
  assert.equal(F.scoreOf({ rating: 4 }), 4);
  assert.equal(F.scoreOf({ responses: { score: "5" } }), 5);
  assert.equal(F.scoreOf({ rating: 9 }), null);
  assert.equal(F.scoreOf({}), null);
});

test("quarterBounds returns the previous calendar quarter", () => {
  const q = F.quarterBounds(new Date(Date.UTC(2026, 10, 16)));
  assert.equal(q.from, "2026-07-01");
  assert.equal(q.to, "2026-09-30");
  const jan = F.quarterBounds(new Date(Date.UTC(2026, 0, 5)));
  assert.equal(jan.from, "2025-10-01");
  assert.equal(jan.to, "2025-12-31");
});
