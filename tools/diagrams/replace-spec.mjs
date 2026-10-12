import fs from "fs";
import vm from "vm";

/* Replaces the `diagrams` block for one sitting with the current spec file.
   Used after a spec is revised post-merge; the merge script is insert-only. */

const PATH = "js/study/sheets-data.js";
const sheetNo = Number(process.argv[2]);
if (Number.isNaN(sheetNo)) { console.error("usage: _respec.mjs <sheetNo>"); process.exit(1); }

const raw = fs.readFileSync(PATH, "utf8");
let lf = raw.replace(/\r\n/g, "\n");
const spec = JSON.parse(fs.readFileSync(`_mig/spec${sheetNo}.json`, "utf8"));

function lit(v, ind) {
  const pad = " ".repeat(ind), inner = " ".repeat(ind + 2);
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return "[\n" + v.map((x) => inner + lit(x, ind + 2)).join(",\n") + "\n" + pad + "]";
  }
  const keys = Object.keys(v);
  if (!keys.length) return "{}";
  return "{\n" + keys.map((k) => inner + JSON.stringify(k) + ": " + lit(v[k], ind + 2)).join(",\n") + "\n" + pad + "}";
}

function matchBrace(src, open) {
  let depth = 0, inStr = false, quote = "";
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { if (ch === "\\") { i++; continue; } if (ch === quote) inStr = false; continue; }
    if (ch === '"' || ch === "'") { inStr = true; quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const starts = [];
const anchor = /^ {8}subtitle: "/gm;
let m;
while ((m = anchor.exec(lf))) starts.push(m.index);
if (starts.length !== 11) { console.error(`expected 11 sittings, found ${starts.length}`); process.exit(1); }

const regionEnd = sheetNo + 1 < starts.length ? starts[sheetNo + 1] : lf.length;
const region = lf.slice(starts[sheetNo], regionEnd);
const hit = region.match(/^ {8}diagrams: \{/m);
if (!hit) { console.error(`sheet ${sheetNo} has no diagrams block to replace`); process.exit(1); }

const absKey = starts[sheetNo] + hit.index;
const absOpen = absKey + hit[0].length - 1;
const close = matchBrace(lf, absOpen);
if (close < 0) { console.error("unbalanced block"); process.exit(1); }

const replacement = "        diagrams: " + lit(spec, 8);
lf = lf.slice(0, absKey) + replacement + lf.slice(close + 1);

// Refuse to write unless it still parses with 11 sittings and one key per sitting.
const part = lf.slice(lf.indexOf("const sheetsData"), lf.indexOf("const timelineEpochs"));
let parsed;
try {
  const c = {};
  vm.createContext(c);
  vm.runInContext(part + "\nthis.sheetsData = sheetsData;", c);
  parsed = c.sheetsData;
} catch (e) { console.error(`ABORT: does not parse — ${e.message}`); process.exit(1); }
const keys = (lf.match(/^ {8}diagrams: \{/gm) || []).length;
const carrying = parsed.filter((x) => x.diagrams).length;
if (parsed.length !== 11 || keys !== 11 || carrying !== 11) {
  console.error(`ABORT: sittings=${parsed.length} keys=${keys} carrying=${carrying}`);
  process.exit(1);
}

fs.writeFileSync(PATH, lf.replace(/\n/g, "\r\n"), "utf8");
console.log(`sheet ${sheetNo}: replaced diagrams block (${Object.keys(spec).length} specs)`);
console.log(`sittings=${parsed.length} keys=${keys} carrying=${carrying}`);
