import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.join(ROOT, "assets", "site");
const MAX = 400 * 1024;
const COVER_MAX = 600 * 1024;
const THUMB_MAX = 64 * 1024;

function local(ref) {
  const clean = String(ref).split(/[?#]/)[0].replace(/^https?:\/\/[^/]+\//, "").replace(/^\.?\//, "");
  return path.join(ROOT, ...clean.split("/"));
}

function checkSize(file, max, label) {
  assert(fs.existsSync(file), label + " must exist: " + path.relative(ROOT, file));
  const size = fs.statSync(file).size;
  assert(size <= max, label + " " + path.relative(ROOT, file) + " is " + size + " bytes; the budget is " + max);
  return size;
}

const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const eager = new Map();

for (const m of index.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]+content="([^"]+)"/g)) {
  eager.set(local(m[1]), "social preview image");
}
for (const m of index.matchAll(/<img[^>]+src="([^"]+)"/g)) {
  if (!m[1].startsWith("data:")) eager.set(local(m[1]), "home page <img>");
}
for (const m of index.matchAll(/<link[^>]+rel="preload"[^>]+as="image"[^>]+href="([^"]+)"/g)) {
  eager.set(local(m[1]), "preloaded image");
}
for (const m of index.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(css\/[^"]+)"/g)) {
  const cssFile = local(m[1]);
  const css = fs.readFileSync(cssFile, "utf8");
  for (const u of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(u[1].split(/[?#]/)[0])) continue;
    eager.set(path.resolve(path.dirname(cssFile), u[1].split(/[?#]/)[0]), "stylesheet image in " + m[1].split("?")[0]);
  }
}

assert(index.includes("js/home/shelf.js"), "index.html must load the shelf scene");
const shelf = fs.readFileSync(path.join(ROOT, "js", "home", "shelf.js"), "utf8");
const portrait = /const SHELF_PORTRAIT = '([^']+)'/.exec(shelf);
assert(portrait, "shelf.js must name the painting it waits for before the shelf is ready");
eager.set(local(portrait[1]), "shelf painting");

assert(eager.size >= 2, "the home page budget must cover the shelf painting and the social preview at least");
for (const [file, label] of eager) checkSize(file, MAX, label);

assert(index.includes("js/shared/covers.js"), "index.html must load the cover list");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "js", "shared", "covers.js"), "utf8"), sandbox);
const covers = sandbox.window.SHELF_COVERS || [];
const thumbs = sandbox.window.SHELF_COVER_THUMBS || [];
assert.strictEqual(covers.length, 11, "the shelf must list eleven cover paintings");
assert.strictEqual(thumbs.length, 11, "the shelf must list eleven cover thumbnails");

function checkHashedName(file, label) {
  const named = /-([a-f0-9]{8})\.[a-z]+$/.exec(file);
  assert(named, label + " " + path.relative(ROOT, file) + " must carry a content hash, because /assets/shelf/covers/* is served immutable");
  const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
  assert.strictEqual(named[1], actual, label + " " + path.relative(ROOT, file) + " was changed in place; rebuild it under a new hashed name");
}

for (const ref of covers) {
  const file = local(ref);
  checkSize(file, COVER_MAX, "cover painting");
  checkHashedName(file, "cover painting");
}
for (const ref of thumbs) {
  const file = local(ref);
  checkSize(file, THUMB_MAX, "cover thumbnail");
  checkHashedName(file, "cover thumbnail");
}

const leftover = fs.readdirSync(SITE).filter((name) => /^hero-place-(babylon|persia|greece|rome)\.png$/i.test(name));
assert.strictEqual(leftover.length, 0, "uncompressed hero PNGs must be removed: " + leftover.join(", "));

console.log("home page images stay within budget (" + eager.size + " eager files, " + covers.length + " covers, " + thumbs.length + " thumbnails)");
