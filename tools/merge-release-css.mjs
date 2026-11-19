import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LINK = /^(\s*)<link rel="stylesheet" href="(css\/[^"?]+\.css)(?:\?[^"]*)?">\s*$/;
const SKIP_URL = /^(data:|#|\/|https?:)/i;

export function absoluteUrls(css, fromRel) {
  const dir = path.posix.dirname(fromRel);
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (whole, quote, target) => {
    if (SKIP_URL.test(target)) return whole;
    const resolved = path.posix.normalize(path.posix.join(dir, target));
    if (resolved.startsWith("..")) return whole;
    return "url(" + quote + "/" + resolved + quote + ")";
  });
}

export function linkRuns(lines) {
  const runs = [];
  let current = null;
  lines.forEach((line, index) => {
    const m = LINK.exec(line);
    if (!m) {
      current = null;
      return;
    }
    if (!current) {
      current = { start: index, indent: m[1], files: [] };
      runs.push(current);
    }
    current.files.push(m[2]);
  });
  return runs.filter((run) => run.files.length > 1);
}

export function mergePage(stage, page) {
  const htmlPath = path.join(stage, page);
  const text = fs.readFileSync(htmlPath, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const runs = linkRuns(lines);
  if (!runs.length) return [];
  const name = page.replace(/\.html$/, "");
  const made = [];
  runs.slice().reverse().forEach((run, back) => {
    const n = runs.length - back;
    const bundleRel = "css/bundles/" + name + "-" + n + ".css";
    const body = run.files.map((rel) => absoluteUrls(fs.readFileSync(path.join(stage, rel), "utf8"), rel)).join("\n");
    fs.mkdirSync(path.join(stage, "css/bundles"), { recursive: true });
    fs.writeFileSync(path.join(stage, bundleRel), body);
    lines.splice(run.start, run.files.length, run.indent + '<link rel="stylesheet" href="' + bundleRel + '">');
    made.push({ bundle: bundleRel, files: run.files.length });
  });
  fs.writeFileSync(htmlPath, lines.join(eol));
  return made.reverse();
}

function main() {
  const stage = path.resolve(process.argv[2] || "");
  if (!process.argv[2] || !fs.existsSync(path.join(stage, "css"))) {
    console.error("usage: node tools/merge-release-css.mjs <stage-dir>");
    process.exit(2);
  }
  const pages = fs.readdirSync(stage).filter((f) => f.endsWith(".html"));
  let merged = 0;
  for (const page of pages) {
    for (const made of mergePage(stage, page)) {
      merged += made.files;
      console.log("merge-release-css: " + page + " -> " + made.bundle + " (" + made.files + " files)");
    }
  }
  console.log("merge-release-css: merged " + merged + " stylesheet links");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
