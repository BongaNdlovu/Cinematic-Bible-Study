/*
 * Counts the authored diagram figures per sitting and confirms each one has a
 * spec, so "every <figure data-diagram> renders" is a checked fact rather than
 * an assumption.
 *
 * Run: node tools/diagrams/count-figures.mjs
 */
import fs from 'fs';
import vm from 'vm';

const raw = fs.readFileSync('js/study/sheets-data.js', 'utf8').replace(/\r\n/g, '\n');
const part = raw.slice(raw.indexOf('const sheetsData'), raw.indexOf('const timelineEpochs'));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);

let figures = 0;
let specs = 0;
let orphanFigures = 0;
let orphanSpecs = 0;

ctx.sheetsData.forEach((s) => {
  const ids = [...String(s.content || '').matchAll(/<figure class="sheet-diagram" data-diagram="([^"]+)"/g)].map((m) => m[1]);
  const declared = Object.keys(s.diagrams || {});
  const missingSpec = ids.filter((id) => !declared.includes(id));
  const missingFigure = declared.filter((id) => !ids.includes(id));
  figures += ids.length;
  specs += declared.length;
  orphanFigures += missingSpec.length;
  orphanSpecs += missingFigure.length;
  console.log(
    `sitting ${String(s.id).padStart(2)}  figures ${String(ids.length).padStart(2)}  specs ${String(declared.length).padStart(2)}`
    + (missingSpec.length ? `  NO SPEC: ${missingSpec.join(', ')}` : '')
    + (missingFigure.length ? `  NO FIGURE: ${missingFigure.join(', ')}` : '')
  );
});

console.log(`\nfigures ${figures}  specs ${specs}  figures without a spec ${orphanFigures}  specs without a figure ${orphanSpecs}`);
process.exit(orphanFigures ? 1 : 0);
