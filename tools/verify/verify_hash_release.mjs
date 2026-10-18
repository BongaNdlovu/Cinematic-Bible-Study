import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function put(stage, rel, text) {
  const full = path.join(stage, ...rel.split("/"));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

function build(globeSource) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "hash-release-"));
  put(stage, "models/altar.glb", "glb-bytes");
  put(stage, "js/shared/boot.js", "const file = 'altar.glb';\nconst sheet = 'css/site.css';\n");
  put(stage, "js/map/globe.js", globeSource);
  put(stage, "js/map/map.js", "load(\"js/map/globe.js\");\n");
  put(stage, "css/site.css", "body { background: url(\"../assets/site/hall-bg.jpg\"); }\n");
  put(stage, "css/map.css", ".map { color: red; }\n");
  put(stage, "assets/site/hall-bg.jpg", "jpg-bytes");
  put(stage, "index.html", [
    '<link rel="stylesheet" href="css/site.css?v=cx1">',
    '<link rel="stylesheet" href="css/map.css?v=cx4">',
    '<script src="js/shared/boot.js"></script>',
    '<script src="js/map/map.js"></script>',
    ""
  ].join("\n"));
  const run = spawnSync(process.execPath, [path.join(ROOT, "tools", "hash-release-assets.mjs"), stage], { encoding: "utf8" });
  assert.strictEqual(run.status, 0, run.stderr);
  return stage;
}

function only(stage, dir, pattern) {
  const hits = fs.readdirSync(path.join(stage, ...dir.split("/"))).filter((name) => pattern.test(name));
  assert.strictEqual(hits.length, 1, dir + " should hold exactly one file matching " + pattern + ", found " + hits.join(", "));
  return hits[0];
}

const stage = build("export const globe = 1;\n");
const html = fs.readFileSync(path.join(stage, "index.html"), "utf8");
assert.match(html, /js\/shared\/boot\.[a-f0-9]{12}\.js/);
assert.match(html, /href="css\/site\.[a-f0-9]{12}\.css\?v=cx1"/, "a versioned stylesheet link keeps its query after the hashed name");
assert.match(html, /href="css\/map\.[a-f0-9]{12}\.css\?v=cx4"/);
assert(!/css\/(site|map)\.css/.test(html), "no page may still point at an unhashed stylesheet");

assert.strictEqual(fs.existsSync(path.join(stage, "models", "altar.glb")), false);
assert.match(only(stage, "models", /^altar\./), /^altar\.[a-f0-9]{12}\.glb$/);

assert.strictEqual(fs.existsSync(path.join(stage, "css", "site.css")), false);
const siteCss = only(stage, "css", /^site\./);
assert.match(siteCss, /^site\.[a-f0-9]{12}\.css$/);
assert(fs.readFileSync(path.join(stage, "css", siteCss), "utf8").includes('url("../assets/site/hall-bg.jpg")'), "a hashed stylesheet keeps its relative image path");
assert(fs.existsSync(path.join(stage, "assets", "site", "hall-bg.jpg")), "images under assets are not renamed");

const boot = fs.readFileSync(path.join(stage, "js", "shared", only(stage, "js/shared", /^boot\./)), "utf8");
assert.match(boot, /altar\.[a-f0-9]{12}\.glb/);
assert(boot.includes("'css/" + siteCss + "'"), "a script that names a stylesheet gets its hashed name");

const mapName = only(stage, "js/map", /^map\./);
const globeName = only(stage, "js/map", /^globe\./);
assert(fs.readFileSync(path.join(stage, "js", "map", mapName), "utf8").includes("js/map/" + globeName), "a script points at the hashed name of a script it loads");

const changed = build("export const globe = 2;\n");
const mapAfter = only(changed, "js/map", /^map\./);
assert.notStrictEqual(only(changed, "js/map", /^globe\./), globeName, "a changed script gets a new name");
assert.notStrictEqual(mapAfter, mapName, "a script whose dependency changed gets a new name too, so an immutable cached copy never points at a missing file");
assert.strictEqual(only(changed, "css", /^site\./), siteCss, "an unchanged stylesheet keeps its name");

fs.rmSync(stage, { recursive: true, force: true });
fs.rmSync(changed, { recursive: true, force: true });
console.log("staged models, stylesheets and scripts get new filenames, in dependency order");
