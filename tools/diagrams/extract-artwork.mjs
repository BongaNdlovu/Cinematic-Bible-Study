import fs from "fs";
import vm from "vm";

const src = fs.readFileSync("js/study/sheets-data.js", "utf8");
const part = src.slice(src.indexOf("const sheetsData"), src.indexOf("const timelineEpochs"));
const c = {};
vm.createContext(c);
vm.runInContext(part + "\nthis.sheetsData = sheetsData;", c);

// Normalise box-drawing and arrow glyphs to ASCII so the extracted files carry
// no encoding ambiguity for any reader.
function toAscii(s) {
  return s
    .replace(/[\u2500-\u257F]/g, "-")
    .replace(/\u25B6/g, ">")
    .replace(/\u25BC/g, "v")
    .replace(/\u25B2/g, "^")
    .replace(/\u2022/g, "-")
    .replace(/\u00B7/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

fs.mkdirSync("_mig", { recursive: true });
const index = [];
c.sheetsData.forEach((sheet, si) => {
  const html = String(sheet.content || "");
  const figs = [...html.matchAll(/<figure class="sheet-diagram" data-diagram="([^"]+)">([\s\S]*?)<\/figure>/g)];
  const payload = figs.map((m) => {
    const id = m[1];
    const asciiM = m[2].match(/<pre class="chain-ascii" aria-hidden="true">([\s\S]*?)<\/pre>/);
    const before = html.slice(0, m.index);
    const h = [...before.matchAll(/<h([234])[^>]*>([\s\S]*?)<\/h\1>/g)].pop();
    const heading = h ? toAscii(h[2].replace(/<[^>]*>/g, "").trim()) : "";
    return { id, heading, ascii: toAscii(asciiM ? asciiM[1] : "") };
  });
  if (payload.length) {
    fs.writeFileSync(`_mig/sheet${si}.json`, JSON.stringify(payload, null, 1), "utf8");
    index.push({ sheet: si, file: `_mig/sheet${si}.json`, count: payload.length, ids: payload.map((p) => p.id), headings: payload.map((p) => p.heading) });
  }
});
fs.writeFileSync("_mig/index.json", JSON.stringify(index, null, 1), "utf8");
console.log("extracted artwork per sitting (ASCII-normalised):");
index.forEach((x) => console.log(`  sheet ${String(x.sheet).padStart(2)}: ${x.count} diagrams -> ${x.file}`));

