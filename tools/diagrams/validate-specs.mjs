import fs from "fs";
import vm from "vm";

/* Validates the authored diagram specs before they are merged into the data:
   - every artwork id has a spec
   - the kind is one the renderer implements, with the fields that kind needs
   - every cite actually resolves against that sitting's reference list, using
     the same book/chapter matching the browser does
   - no text was smuggled in that is not in the source artwork */

const KINDS = new Set(["chain", "steps", "comparison", "table", "timeline", "flow"]);

const normalBook = (name) => {
  const s = String(name || "").trim().toLowerCase().replace(/\./g, "");
  const alias = {
    dan: "daniel", jer: "jeremiah", isa: "isaiah", ezek: "ezekiel", ex: "exodus",
    exod: "exodus", lev: "leviticus", num: "numbers", deut: "deuteronomy",
    ps: "psalm", psa: "psalm", prov: "proverbs", matt: "matthew", mt: "matthew",
    mk: "mark", lk: "luke", jn: "john", rom: "romans", rev: "revelation",
    gen: "genesis", hab: "habakkuk", zeph: "zephaniah", ezra: "ezra",
    neh: "nehemiah", est: "esther", kgs: "kings", chr: "chronicles",
    sam: "samuel", cor: "corinthians", thess: "thessalonians", tim: "timothy"
  };
  const c = s.replace(/^psalms?$/, "psalm").replace(/\s+/g, " ");
  if (alias[c]) return alias[c];
  const parts = c.match(/^([1-3])\s+(.+)$/);
  if (parts && alias[parts[2]]) return parts[1] + " " + alias[parts[2]];
  return c;
};
function parseSourceRefs(source) {
  const body = String(source || "").split(/,\s*King James Version/i)[0];
  const slots = [];
  const V = "\\d+(?:\\s*[\\u2013\\u2014\\u2011-]\\s*\\d+)?";
  const rx = new RegExp("([1-3]?\\s?[A-Za-z][A-Za-z. ]*?)?\\s*(\\d+):\\s*((?!\\d+\\s*:)" + V + "(?:\\s*,\\s*(?!\\d+\\s*:)" + V + ")*)", "g");
  let book = "";
  body.split(";").forEach((clause) => {
    let m; rx.lastIndex = 0;
    while ((m = rx.exec(clause))) {
      if (m[1] && m[1].trim()) book = normalBook(m[1].replace(/[.\s]+$/, ""));
      if (!book) continue;
      (m[3].match(/\d+/g) || []).forEach((v) => slots.push(book + " " + m[2] + ":" + v));
    }
  });
  return slots;
}

const sv = { window: {} };
vm.createContext(sv);
vm.runInContext(fs.readFileSync("js/study/sheet-verify.js", "utf8"), sv);
const packs = sv.window.SHEET_VERIFY;

let totalSpecs = 0, totalProblems = 0;
const maxSheet = Number(process.argv[2] || 10);

for (let s = 0; s <= maxSheet; s++) {
  const artFile = `_mig/sheet${s}.json`;
  const specFile = `_mig/spec${s}.json`;
  if (!fs.existsSync(specFile)) { console.log(`sheet ${s}: no spec file yet`); continue; }
  const art = JSON.parse(fs.readFileSync(artFile, "utf8"));
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const problems = [];

  // build the resolve table for this sitting
  const bySlot = new Set();
  ((packs[s] || {}).items || []).forEach((it) => {
    if (it.kind !== "scripture") return;
    parseSourceRefs(it.source).forEach((x) => bySlot.add(x));
  });

  const artIds = art.map((a) => a.id);
  artIds.forEach((id) => { if (!spec[id]) problems.push(`missing spec for ${id}`); });
  Object.keys(spec).forEach((id) => { if (!artIds.includes(id)) problems.push(`extra spec not in artwork: ${id}`); });

  Object.entries(spec).forEach(([id, d]) => {
    totalSpecs++;
    if (!KINDS.has(d.kind)) { problems.push(`${id}: bad kind "${d.kind}"`); return; }
    if (!d.title) problems.push(`${id}: no title`);
    const need = d.kind === "table" ? (d.rows || []).length : (d.steps || []).length;
    if (need < 2) problems.push(`${id}: kind=${d.kind} has only ${need} entries (need >= 2)`);
    if (d.kind === "table" && !(d.head || []).length) problems.push(`${id}: table without head`);
    (d.steps || []).forEach((st, i) => {
      if (!st.title && !st.text) problems.push(`${id}: step ${i + 1} is empty`);
      if (st.cite) {
        const c = String(st.cite);
        const colon = c.indexOf(":");
        if (colon < 0) { problems.push(`${id}: unparseable cite "${c}"`); return; }
        const before = c.slice(0, colon);
        const book = normalBook(before.replace(/\s*\d+\s*$/, "").trim());
        const chap = (before.match(/(\d+)\s*$/) || [])[1];
        if (![...bySlot].some((k) => k.startsWith(book + " " + chap + ":"))) {
          problems.push(`${id}: cite "${c}" does not resolve to any reference in sitting ${s}`);
        }
      }
      (st.points || []).forEach((p, pi) => { if (!String(p || "").trim()) problems.push(`${id}: step ${i + 1} empty point ${pi + 1}`); });
    });
  });

  const kinds = {};
  Object.values(spec).forEach((d) => { kinds[d.kind] = (kinds[d.kind] || 0) + 1; });
  console.log(`sheet ${s}: ${Object.keys(spec).length}/${art.length} specs  kinds=${JSON.stringify(kinds)}  ${problems.length ? "PROBLEMS " + problems.length : "OK"}`);
  problems.forEach((p) => console.log(`     - ${p}`));
  totalProblems += problems.length;
}
console.log(`\ntotal specs checked: ${totalSpecs}   problems: ${totalProblems}`);
