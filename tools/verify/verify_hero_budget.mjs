import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.join(ROOT, "assets", "site");
const MAX = 400 * 1024;
const heroes = [
  "hero-main.jpg",
  "hero-place-babylon.jpg",
  "hero-place-persia.jpg",
  "hero-place-greece.jpg",
  "hero-place-rome.jpg"
];

for (const name of heroes) {
  const file = path.join(SITE, name);
  assert(fs.existsSync(file), name + " must exist");
  const size = fs.statSync(file).size;
  assert(size <= MAX, name + " is " + size + " bytes; hero files must stay at or under 400 KB");
}

const leftover = fs.readdirSync(SITE).filter((name) => /^hero-place-(babylon|persia|greece|rome)\.png$/i.test(name));
assert.strictEqual(leftover.length, 0, "uncompressed hero PNGs must be removed: " + leftover.join(", "));

const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
assert(index.includes("assets/site/hero-place-babylon.jpg"), "index.html must use the compressed Babylon hero");
assert(index.includes("assets/site/hero-place-persia.jpg"), "index.html must use the compressed Persia hero");
assert(index.includes("assets/site/hero-place-greece.jpg"), "index.html must use the compressed Greece hero");
assert(index.includes("assets/site/hero-place-rome.jpg"), "index.html must use the compressed Rome hero");
assert(!index.includes("hero-place-babylon.png"), "index.html must not reference the Babylon PNG");

console.log("hero images stay at or under 400 KB");
