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

const sheets = fs.readdirSync(path.join(ROOT, "css"), { recursive: true }).map(String).filter((n) => n.endsWith(".css"));
for (const name of sheets) {
  const before = fs.statSync(path.join(ROOT, "css", name)).size;
  const after = fs.readFileSync(path.join(stage, "css", name), "utf8");
  assert(after.length <= before, name + " must not grow when minified");
  assert(!after.includes("/*"), name + " keeps no comments once minified");
}
const studyParts = sheets.filter((n) => path.dirname(n) === "study");
assert(studyParts.length > 1, "css/study/ holds the study page stylesheets");
const studyBefore = studyParts.reduce((sum, n) => sum + fs.statSync(path.join(ROOT, "css", n)).size, 0);
const studyAfter = studyParts.reduce((sum, n) => sum + fs.statSync(path.join(stage, "css", n)).size, 0);
assert(studyAfter < studyBefore * 0.75, "the study page stylesheets shrink by at least a quarter in total");

const deploy = fs.readFileSync(path.join(ROOT, "tools", "deploy-cloudflare-pages.ps1"), "utf8");
const minifyAt = deploy.indexOf("minify-release-css.mjs");
const hashAt = deploy.indexOf("hash-release-assets.mjs");
assert(minifyAt !== -1 && hashAt !== -1 && minifyAt < hashAt, "the deploy minifies stylesheets before it hashes their names");
assert(deploy.includes('Remove-Item (Join-Path $stage "assets\\_glb_preview") -Recurse -Force'), "the deploy drops the GLB preview textures robocopy cannot exclude by path");
assert(/\$leaksLeft = @\([^)]*"assets\\_glb_preview"/.test(deploy), "the deploy aborts when the GLB preview textures survive");

fs.rmSync(stage, { recursive: true, force: true });
console.log("release stylesheets minify with the same rules, before their names are hashed");
