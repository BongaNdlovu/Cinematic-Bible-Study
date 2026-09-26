import crypto from "crypto";
import fs from "fs";
import path from "path";

const stage = path.resolve(process.argv[2] || "");
if (!stage || !fs.existsSync(stage)) {
  console.error("usage: node tools/hash-release-assets.mjs <stage-dir>");
  process.exit(1);
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function relPosix(full) {
  return path.relative(stage, full).split(path.sep).join("/");
}

function alreadyHashed(rel) {
  return /\.[a-f0-9]{12}\.[^.]+$/.test(rel);
}

function filesUnder(prefix, extensions) {
  const root = path.join(stage, prefix);
  if (!fs.existsSync(root)) return [];
  const all = [];
  walk(root, all);
  return all.filter((full) => extensions.includes(path.extname(full).toLowerCase()));
}

function rewrite(pairs) {
  const all = [];
  walk(stage, all);
  const textExt = new Set([".html", ".js", ".mjs", ".css"]);
  const ordered = pairs.slice().sort((a, b) => b[0].length - a[0].length);
  for (const full of all) {
    if (!textExt.has(path.extname(full).toLowerCase())) continue;
    const text = fs.readFileSync(full, "utf8");
    let next = text;
    for (const [from, to] of ordered) next = next.split(from).join(to);
    if (next !== text) fs.writeFileSync(full, next);
  }
}

function apply(prefix, extensions) {
  const pairs = [];
  for (const full of filesUnder(prefix, extensions)) {
    const rel = relPosix(full);
    if (alreadyHashed(rel)) continue;
    const hash = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex").slice(0, 12);
    const renamed = rel.replace(/(\.[^.]+)$/, "." + hash + "$1");
    fs.renameSync(full, path.join(stage, renamed));
    pairs.push([rel, renamed]);
    if (prefix === "models") {
      const base = path.posix.basename(rel);
      const nextBase = path.posix.basename(renamed);
      pairs.push(["'" + base + "'", "'" + nextBase + "'"]);
      pairs.push(['"' + base + '"', '"' + nextBase + '"']);
    }
  }
  rewrite(pairs);
}

apply("models", [".glb", ".gltf"]);
apply("js", [".js", ".mjs"]);
console.log("hashed release assets in " + stage);
