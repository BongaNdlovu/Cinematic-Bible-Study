import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../../js/study/mindmap-layout.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const L = sandbox.window.MindMapLayout;
const plain = (v) => JSON.parse(JSON.stringify(v));

test("the world is 960 by 660 and the design units scale into it", () => {
  assert.equal(L.W, 960);
  assert.equal(L.H, 660);
  assert.equal(L.kx(1600), 960);
  assert.equal(L.ky(900), 660);
  assert.equal(L.P.cx, 480);
  assert.equal(L.P.cy, 330);
});

test("arrowhead draws a closed path with its tip at the origin", () => {
  assert.equal(L.arrowhead(10, 5), "M0 0L-10.00 -5.00L-6.80 0L-10.00 5.00Z");
});

test("connectorWord knows the four connectors and nothing else", () => {
  assert.equal(L.connectorWord("History"), "HISTORY");
  assert.equal(L.connectorWord("christ"), "CHRIST");
  assert.equal(L.connectorWord("other"), "");
  assert.equal(L.connectorWord(null), "");
});

test("splitLines balances the longest line", () => {
  assert.equal(JSON.stringify(L.splitLines(["The", "Smiting", "Stone"], 2)), '["The Smiting","Stone"]');
  assert.equal(JSON.stringify(L.splitLines(["One"], 3)), '["One"]');
});

test("coreFit keeps a parenthesised gloss together and shrinks long labels", () => {
  const empty = plain(L.coreFit(""));
  assert.deepEqual(empty, { lines: [], d: 160, fs: 20 });
  const short = plain(L.coreFit("Daniel 2"));
  assert.deepEqual(short.lines, ["Daniel 2"]);
  assert.equal(short.fs, 30);
  const gloss = plain(L.coreFit("Iron and clay (Daniel 2:43)"));
  assert.ok(gloss.lines.some((line) => line.includes("(Daniel 2:43)")), JSON.stringify(gloss.lines));
  const long = plain(L.coreFit("A very long title that needs several lines to fit inside"));
  assert.equal(long.lines.length, 3);
  assert.ok(long.fs >= 13 && long.fs < 30);
});

test("titleFit stays between its floor and ceiling", () => {
  assert.equal(L.titleFit("A"), L.kx(150));
  assert.equal(L.titleFit("x".repeat(500)), L.kx(40));
});

test("nameLines wraps greedily and nameFit picks the largest size that fits three lines", () => {
  assert.equal(L.nameLines("Gold", 20), 1);
  assert.ok(L.nameLines("Nebuchadnezzar Babylon Kingdom of Gold", 30) > 1);
  assert.equal(L.nameFit("Gold"), 30);
  const size = L.nameFit("The kingdom which shall never be destroyed nor left to other people");
  assert.ok(size >= 15 && size < 30);
  assert.ok(size === 15 || L.nameLines("The kingdom which shall never be destroyed nor left to other people", size) <= 3);
});

test("place splits steps across sides, clamps declared y and fans the leaves", () => {
  const items = plain(L.place([
    { id: "A b!", text: "first", points: ["p1", 7, " "] },
    { side: "L", y: 99999, link: "History" },
    { text: "third" }
  ]));
  assert.equal(items[0].id, "a-b");
  assert.equal(items[1].id, "step-1");
  assert.deepEqual(items.map((i) => i.side), ["L", "L", "R"]);
  assert.equal(items[1].y, L.ky(810));
  assert.equal(items[1].fan, "history");
  assert.deepEqual(items[0].leaves.map((l) => l.text), ["first", "p1"]);
  assert.equal(items[2].leaves[0].y, items[2].y);
  assert.equal(items[2].hx, L.P.hxR);
});
