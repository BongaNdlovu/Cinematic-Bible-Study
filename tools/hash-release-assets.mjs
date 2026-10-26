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

function hashName(rel) {
  const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(stage, rel))).digest("hex").slice(0, 12);
  return rel.replace(/(\.[^.]+)$/, "." + hash + "$1");
}

function apply(prefix, extensions) {
  const textExt = new Set([".html", ".js", ".mjs", ".css"]);
  let pending = filesUnder(prefix, extensions).map(relPosix).filter((rel) => !alreadyHashed(rel));
  const refs = new Map();
  for (const rel of pending) {
    if (!textExt.has(path.extname(rel).toLowerCase())) { refs.set(rel, []); continue; }
    const text = fs.readFileSync(path.join(stage, rel), "utf8");
    refs.set(rel, pending.filter((other) => other !== rel && text.includes(other)));
  }
  while (pending.length) {
    const open = new Set(pending);
    let batch = pending.filter((rel) => !refs.get(rel).some((other) => open.has(other)));
    if (!batch.length) {
      console.warn("hash-release-assets: circular references under " + prefix + "/, hashing " + pending.length + " files together");
      batch = pending;
    }
    const pairs = [];
    for (const rel of batch) {
      const renamed = hashName(rel);
      fs.renameSync(path.join(stage, rel), path.join(stage, renamed));
      pairs.push([rel, renamed]);
      if (prefix === "models") {
        const base = path.posix.basename(rel);
        const nextBase = path.posix.basename(renamed);
        pairs.push(["'" + base + "'", "'" + nextBase + "'"]);
        pairs.push(['"' + base + '"', '"' + nextBase + '"']);
      }
    }
    rewrite(pairs);
    const done = new Set(batch);
    pending = pending.filter((rel) => !done.has(rel));
  }
}

apply("models", [".glb", ".gltf"]);
apply("bible", [".json"]);
apply("vendor/supabase", [".js"]);
apply("vendor/leaflet", [".js", ".css"]);
apply("css", [".css"]);
apply("js", [".js", ".mjs"]);
console.log("hashed release assets in " + stage);
