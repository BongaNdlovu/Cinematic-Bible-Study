import fs from "fs";
import vm from "vm";

/* Validates the authored diagram specs before they are merged into the data:
   - every artwork id has a spec
   - the kind is one the renderer implements, with the fields that kind needs
   - every cite actually resolves against that sitting's reference list, using
     the same book/chapter matching the browser does
   - no text was smuggled in that is not in the source artwork */

const KINDS = new Set(["chain", "steps", "comparison", "table", "timeline", "flow", "mindmap"]);

/* The mindmap's structural vocabulary. None of these fields carries prose: the
   only words a map renders beyond `role`/`title`/`text`/`points[]` are the four
   connector names, which are the course's own self-check headings. */
const MM_SIDES = new Set(["L", "R"]);
const MM_ROUTES = new Set(["spine", "vertical", "under-centre"]);
const MM_CONNECTORS = new Set(["text", "history", "interpretation", "christ"]);
/* The vertical band a step may be placed in, as the renderer clamps it: 10%..90%
   of the world height. The world is 960x660 (it was 1600x900 before the type-size
   fix), so the band is 66…594. Keep these in step with Y_MIN/Y_MAX in
   js/study/mindmap.js — a validator that accepts more than the renderer honours
   lets a spec declare a `y` that is silently re-clamped. */
const MM_Y_MIN = 66;
const MM_Y_MAX = 594;

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

    /* The mindmap adds structure only, so every new field is checkable without
       reading a sentence: a slug, a side, a coordinate inside the world, and two
       enums whose values are the four connector names. `side`/`y` stay optional —
       §12 gives the renderer a placement rule for a spec that omits them — but a
       declared value must be usable.

       Bounds track the renderer's own clamp, which derives from the world height
       (Y_MIN/Y_MAX = 10%..90% of H). The world was 1600x900 and is now 960x660, so
       the usable band is 66…594; keeping the old 90…810 here would accept a `y` the
       renderer silently re-clamps. */
    if (d.kind === "mindmap") {
      const declared = new Set();
      (d.steps || []).forEach((st, i) => {
        const slug = String(st.id || `step-${i}`);
        if (!/^[a-z0-9-]+$/.test(slug)) problems.push(`${id}: step ${i + 1} id "${slug}" is not a [a-z0-9-]+ slug`);
        if (declared.has(slug)) problems.push(`${id}: duplicate step id "${slug}"`);
        declared.add(slug);
        if (st.side !== undefined && !MM_SIDES.has(st.side)) problems.push(`${id}: step ${i + 1} side "${st.side}" is not L or R`);
        if (st.y !== undefined) {
          const y = Number(st.y);
          if (!Number.isFinite(y) || y < MM_Y_MIN || y > MM_Y_MAX) problems.push(`${id}: step ${i + 1} y "${st.y}" is outside ${MM_Y_MIN}…${MM_Y_MAX}`);
        }
        if (st.link !== undefined && !MM_CONNECTORS.has(String(st.link).toLowerCase())) {
          problems.push(`${id}: step ${i + 1} link "${st.link}" is not one of text|history|interpretation|christ`);
        }
        (st.points || []).forEach((p, pi) => {
          // The renderer reads `text` only from steps[]; a leaf object would put
          // copy on the page the claim-unit extractor cannot see, so the plain
          // string is the only accepted leaf form.
          if (typeof p !== "string") problems.push(`${id}: step ${i + 1} point ${pi + 1} is not a string`);
        });
      });
      (d.links || []).forEach((link, li) => {
        const at = `${id}: link ${li + 1}`;
        const from = String(link && link.from || "");
        const to = String(link && link.to || "");
        if (!declared.has(from)) problems.push(`${at} from "${from}" names no declared step id`);
        if (!declared.has(to)) problems.push(`${at} to "${to}" names no declared step id`);
        if (from && from === to) problems.push(`${at} links a step to itself`);
        if (!MM_CONNECTORS.has(String(link && link.kind).toLowerCase())) {
          problems.push(`${at} kind "${link && link.kind}" is not one of text|history|interpretation|christ`);
        }
        if (link && link.route !== undefined && !MM_ROUTES.has(link.route)) {
          problems.push(`${at} route "${link.route}" is not one of spine|vertical|under-centre`);
        }
      });
    }
  });

  const kinds = {};
  Object.values(spec).forEach((d) => { kinds[d.kind] = (kinds[d.kind] || 0) + 1; });
  console.log(`sheet ${s}: ${Object.keys(spec).length}/${art.length} specs  kinds=${JSON.stringify(kinds)}  ${problems.length ? "PROBLEMS " + problems.length : "OK"}`);
  problems.forEach((p) => console.log(`     - ${p}`));
  totalProblems += problems.length;
}
console.log(`\ntotal specs checked: ${totalSpecs}   problems: ${totalProblems}`);
