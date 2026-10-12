import fs from "fs";

/* Merges the authored _mig/specN.json files into sheets-data.js as a `diagrams`
   map on each sitting.

   The value is emitted as a JavaScript object literal rather than pasted JSON,
   so a syntax slip cannot reach the file: the script reparses the result with
   `vm` and refuses to write unless all 11 sittings still load. CRLF preserved. */

const PATH = "js/study/sheets-data.js";
const raw = fs.readFileSync(PATH, "utf8");
let lf = raw.replace(/\r\n/g, "\n");

// JSON -> indented JS object literal.
function lit(v, ind) {
  const pad = " ".repeat(ind);
  const inner = " ".repeat(ind + 2);
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

const vmMod = await import("vm");
function parse(src) {
  const s = src.slice(src.indexOf("const sheetsData"), src.indexOf("const timelineEpochs"));
  const c = {};
  vmMod.createContext(c);
  vmMod.runInContext(s + "\nthis.sheetsData = sheetsData;", c);
  return c.sheetsData;
}

const anchor = /^ {8}subtitle: "/gm;
const starts = [];
let m;
while ((m = anchor.exec(lf))) starts.push(m.index);
if (starts.length !== 11) {
  console.error(`expected 11 sittings, found ${starts.length} — aborting`);
  process.exit(1);
}

let inserted = 0;
let skipped = 0;
for (let s = starts.length - 1; s >= 0; s--) {
  const specFile = `_mig/spec${s}.json`;
  if (!fs.existsSync(specFile)) { console.log(`sheet ${s}: no spec file, skipped`); continue; }
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const keys = Object.keys(spec);
  if (!keys.length) { console.log(`sheet ${s}: empty, skipped`); continue; }

  // Idempotency guard: never insert a second `diagrams` key into a sitting.
  // The region runs from this sitting's subtitle to the next one (or EOF).
  const regionEnd = s + 1 < starts.length ? starts[s + 1] : lf.length;
  const region = lf.slice(starts[s], regionEnd);
  if (/^ {8}diagrams: \{/m.test(region)) {
    console.log(`sheet ${s}: already has a diagrams key, skipped`);
    skipped++;
    continue;
  }

  const lineEnd = lf.indexOf("\n", starts[s]);
  const block = "\n        diagrams: " + lit(spec, 8) + ",";
  lf = lf.slice(0, lineEnd) + block + lf.slice(lineEnd);
  inserted++;
  console.log(`sheet ${s}: inserted ${keys.length} specs`);
}

// Refuse to write unless the result still parses and all 11 sittings load.
let parsed;
try {
  parsed = parse(lf);
} catch (e) {
  console.error(`\nABORT: result does not parse — ${e.message}`);
  process.exit(1);
}
if (parsed.length !== 11) {
  console.error(`\nABORT: parsed ${parsed.length} sittings, expected 11`);
  process.exit(1);
}
const withSpecs = parsed.filter((x) => x.diagrams).length;
const dupeKeys = (lf.match(/^ {8}diagrams: \{/gm) || []).length;
if (dupeKeys !== withSpecs) {
  console.error(`\nABORT: ${dupeKeys} diagrams keys but ${withSpecs} sittings carry one — duplicates present`);
  process.exit(1);
}

fs.writeFileSync(PATH, lf.replace(/\n/g, "\r\n"), "utf8");
const check = fs.readFileSync(PATH, "utf8");
console.log(`\nwrote OK — inserted ${inserted}, skipped ${skipped}`);
console.log(`sittings: ${parsed.length}, carrying diagrams: ${withSpecs}, diagrams keys: ${dupeKeys}`);
console.log(`CRLF=${(check.match(/\r\n/g) || []).length} bareLF=${(check.match(/(?<!\r)\n/g) || []).length}`);
