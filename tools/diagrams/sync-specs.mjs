/*
 * Snapshots each sitting's live `diagrams` block from js/study/sheets-data.js
 * back into _mig/specN.json.
 *
 * The specs are upstream authoring files, but the live data has been hand-edited
 * since the last merge, so re-running tools/diagrams/merge-specs.mjs or
 * tools/diagrams/replace-spec.mjs would silently roll those edits back. This
 * writes the spec files from the data so the two agree again, and a later merge
 * is a no-op on content.
 *
 * Run: node tools/diagrams/sync-specs.mjs            (writes)
 *      node tools/diagrams/sync-specs.mjs --check    (reports drift only)
 */
import fs from 'fs';
import vm from 'vm';

const CHECK = process.argv.includes('--check');
const src = fs.readFileSync('js/study/sheets-data.js', 'utf8').replace(/\r\n/g, '\n');
const part = src.slice(src.indexOf('const sheetsData'), src.indexOf('const timelineEpochs'));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);
const sheets = ctx.sheetsData;

let written = 0;
let drifted = 0;

for (let s = 0; s < sheets.length; s++) {
  const live = sheets[s].diagrams;
  const file = `_mig/spec${s}.json`;
  const exists = fs.existsSync(file);

  if (!exists) {
    if (live && Object.keys(live).length) {
      console.log(`sheet ${String(s).padStart(2)}: no spec file, ${Object.keys(live).length} specs live (sheet 0 is authored in the data)`);
    }
    continue;
  }

  const current = fs.readFileSync(file, 'utf8');
  const desired = JSON.stringify(live || {}, null, 2) + '\n';
  const same = current.replace(/\r\n/g, '\n') === desired;
  if (same) continue;

  drifted++;
  if (CHECK) {
    console.log(`sheet ${String(s).padStart(2)}: spec differs from live data`);
    continue;
  }
  fs.writeFileSync(file, desired, 'utf8');
  written++;
  console.log(`sheet ${String(s).padStart(2)}: wrote ${Object.keys(live || {}).length} specs`);
}

console.log(CHECK
  ? `\n${drifted} spec file(s) differ from the live data`
  : `\n${written} spec file(s) rewritten`);
process.exit(CHECK && drifted ? 1 : 0);
