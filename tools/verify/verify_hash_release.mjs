import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "hash-release-"));
fs.mkdirSync(path.join(stage, "js", "shared"), { recursive: true });
fs.mkdirSync(path.join(stage, "models"), { recursive: true });
fs.writeFileSync(path.join(stage, "models", "altar.glb"), "glb-bytes");
fs.writeFileSync(path.join(stage, "js", "shared", "boot.js"), "const file = 'altar.glb';\n");
fs.writeFileSync(path.join(stage, "index.html"), '<script src="js/shared/boot.js"></script>\n');

const run = spawnSync(process.execPath, [path.join(ROOT, "tools", "hash-release-assets.mjs"), stage], { encoding: "utf8" });
assert.strictEqual(run.status, 0, run.stderr);
const html = fs.readFileSync(path.join(stage, "index.html"), "utf8");
assert.match(html, /js\/shared\/boot\.[a-f0-9]{12}\.js/);
assert.strictEqual(fs.existsSync(path.join(stage, "models", "altar.glb")), false);
const models = fs.readdirSync(path.join(stage, "models"));
assert.strictEqual(models.length, 1);
assert.match(models[0], /^altar\.[a-f0-9]{12}\.glb$/);
const jsDir = fs.readdirSync(path.join(stage, "js", "shared"));
const boot = fs.readFileSync(path.join(stage, "js", "shared", jsDir[0]), "utf8");
assert.match(boot, /altar\.[a-f0-9]{12}\.glb/);
fs.rmSync(stage, { recursive: true, force: true });
console.log("staged models and scripts get new filenames");
