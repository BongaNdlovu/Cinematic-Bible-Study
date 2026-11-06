import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "css-minify-"));
fs.cpSync(path.join(ROOT, "css"), path.join(stage, "css"), { recursive: true });

const run = spawnSync(process.execPath, [path.join(ROOT, "tools", "minify-release-css.mjs"), stage], { encoding: "utf8" });
assert.strictEqual(run.status, 0, run.stderr);

for (const name of fs.readdirSync(path.join(ROOT, "css")).filter((n) => n.endsWith(".css"))) {
  const before = fs.statSync(path.join(ROOT, "css", name)).size;
  const after = fs.readFileSync(path.join(stage, "css", name), "utf8");
  assert(after.length <= before, name + " must not grow when minified");
  assert(!after.includes("/*"), name + " keeps no comments once minified");
}
assert(fs.statSync(path.join(stage, "css", "study-page.css")).size < fs.statSync(path.join(ROOT, "css", "study-page.css")).size * 0.75, "study-page.css shrinks by at least a quarter");

const deploy = fs.readFileSync(path.join(ROOT, "tools", "deploy-cloudflare-pages.ps1"), "utf8");
const minifyAt = deploy.indexOf("minify-release-css.mjs");
const hashAt = deploy.indexOf("hash-release-assets.mjs");
assert(minifyAt !== -1 && hashAt !== -1 && minifyAt < hashAt, "the deploy minifies stylesheets before it hashes their names");

fs.rmSync(stage, { recursive: true, force: true });
console.log("release stylesheets minify with the same rules, before their names are hashed");
