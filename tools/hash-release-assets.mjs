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
    refs.set(rel, pending.filter((other) => other !== rel && (text.includes(other) || (prefix === "vendor/three/build" && text.includes("./" + path.posix.basename(other))))));
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
      if (prefix === "vendor/three/build") {
        /* three.module.min.js pulls in its sibling through the relative
           specifier "./three.core.min.js", which never contains the staged
           path, so the relative form gets its own pair. */
        const base = path.posix.basename(rel);
        const nextBase = path.posix.basename(renamed);
        pairs.push(["./" + base, "./" + nextBase]);
      }
    }
    rewrite(pairs);
    const done = new Set(batch);
    pending = pending.filter((rel) => !done.has(rel));
  }
}

const CSP_SCRIPT_TYPES = new Set(["", "text/javascript", "application/javascript", "module", "module/javascript", "importmap"]);

function cspHash(body) {
  return "'sha256-" + crypto.createHash("sha256").update(body.replace(/\r\n?/g, "\n"), "utf8").digest("base64") + "'";
}

function inlineScriptHashes() {
  const byPage = new Map();
  for (const page of fs.readdirSync(stage).filter((f) => f.endsWith(".html"))) {
    const src = fs.readFileSync(path.join(stage, page), "utf8");
    const hashes = [];
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc\s*=/.test(m[1])) continue;
      const type = (m[1].match(/type\s*=\s*["']?([^"'\s>]+)/) || [])[1] || "";
      if (!CSP_SCRIPT_TYPES.has(type.toLowerCase())) continue;
      hashes.push(cspHash(m[2]));
    }
    byPage.set(page, hashes);
  }
  return byPage;
}

function allowRewrittenInlineScripts(before) {
  const headersPath = path.join(stage, "_headers");
  if (!fs.existsSync(headersPath)) return;
  const added = new Set();
  for (const [page, hashes] of inlineScriptHashes()) {
    const old = before.get(page) || [];
    if (old.length !== hashes.length) throw new Error("inline script count changed while hashing " + page);
    hashes.forEach((h, i) => { if (h !== old[i]) added.add(h); });
  }
  if (!added.size) return;
  const headers = fs.readFileSync(headersPath, "utf8");
  const next = headers.replace(/(Content-Security-Policy:[^\r\n]*?script-src [^;\r\n]*)/, (directive) => {
    const missing = [...added].filter((h) => !directive.includes(h));
    return missing.length ? directive + " " + missing.join(" ") : directive;
  });
  if (next === headers) throw new Error("could not add rewritten inline script hashes to _headers");
  fs.writeFileSync(headersPath, next);
  console.log("allowed " + added.size + " rewritten inline script hash(es) in _headers");
}

const inlineBefore = inlineScriptHashes();
apply("models", [".glb", ".gltf"]);
apply("bible", [".json"]);
apply("vendor/supabase", [".js"]);
apply("vendor/leaflet", [".js", ".css"]);
apply("vendor/three/build", [".js"]);
apply("vendor/sentry", [".js"]);
apply("css", [".css"]);
apply("js", [".js", ".mjs"]);
allowRewrittenInlineScripts(inlineBefore);
console.log("hashed release assets in " + stage);
