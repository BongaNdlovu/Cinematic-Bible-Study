import test from "node:test";
import assert from "node:assert/strict";
import { clean, split, cap, num, roman, shade, shade2, rgba, rng, wrapLines, fitLines } from "../../js/pages/index/shelf-helpers.js";

const fakeCtx = () => ({ font: "10px", measureText(t) { return { width: t.length * parseInt(this.font, 10) / 2 }; } });

test("clean decodes the entities the data uses and strips tags", () => {
  assert.equal(clean("A &amp; B&nbsp;&mdash; <b>C</b>&hellip;"), "A & B — C…");
  assert.equal(clean(null), "");
});

test("split cuts a title at its first colon", () => {
  assert.deepEqual(split("The Image: Daniel 2"), ["The Image", "Daniel 2"]);
  assert.deepEqual(split("No colon"), ["No colon", ""]);
});

test("cap title-cases each word and each part after a middle dot", () => {
  assert.equal(cap("THE GOLDEN head·of BABYLON"), "The Golden Head·Of Babylon");
});

test("num reads the sitting number from an epoch line", () => {
  assert.equal(num("Sheet 07 · Babylon"), 7);
  assert.equal(num("nothing"), 0);
});

test("roman writes numbers as Roman numerals", () => {
  assert.equal(roman(0), "0");
  assert.equal(roman(4), "IV");
  assert.equal(roman(11), "XI");
  assert.equal(roman(1994), "MCMXCIV");
});

test("shade lightens towards white and shade2 can darken towards black", () => {
  assert.equal(shade("#000000", 0.5), "rgb(128,128,128)");
  assert.equal(shade2("#ffffff", -0.5), "rgb(128,128,128)");
  assert.equal(shade2("#000000", 1), "rgb(255,255,255)");
  assert.equal(rgba("#102030", 0.5), "rgba(16,32,48,0.5)");
});

test("rng is a repeatable generator in [0, 1)", () => {
  const a = rng(42), b = rng(42);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.equal(rng(0)(), rng(1)());
});

test("wrapLines and fitLines wrap to the measured width", () => {
  const x = fakeCtx();
  assert.deepEqual(wrapLines(x, "aa bb cc", 25), ["aa bb", "cc"]);
  const fit = fitLines(x, "aaaa bbbb cccc dddd", (s) => s + "px serif", 40, 2, 20, 4);
  assert.ok(fit.lines.length <= 2);
  assert.ok(fit.size <= 20 && fit.size >= 4);
  const floor = fitLines(x, "a".repeat(200), (s) => s + "px serif", 10, 1, 8, 6);
  assert.equal(floor.size, 6);
  assert.equal(floor.lines.length, 1);
});
