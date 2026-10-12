/**
 * Master glossary proof table (all desk entries, all sittings linkage).
 * Run after build_glossary_enrichment.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractAllUnits } from './extract_claim_units.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outPath = path.join(root, 'tools/review/GLOSSARY_PROOF.md');

const data = extractAllUnits();
const byId = new Map();
for (const u of data.units) {
  if (u.field !== 'glossary') continue;
  const m = u.id.match(/^S(\d+)-GLS-([^-]+(?:-[^-]+)?)-(SMP|HIS|PRF)$/);
  if (!m) continue;
  const id = m[2];
  const part = m[3];
  if (!byId.has(id)) byId.set(id, { sheets: new Set(), smp: '', his: '', prf: '' });
  const row = byId.get(id);
  row.sheets.add(Number(m[1]));
  if (part === 'SMP') row.smp = u.text;
  if (part === 'HIS') row.his = u.text;
  if (part === 'PRF') row.prf = u.text;
}

const lines = [
  '# Glossary — full proof index',
  '',
  `**Generated:** ${new Date().toISOString().slice(0, 10)}`,
  '**Source:** `js/study/sheet-glossary.js` + `glossary-enrichment.js` merged at runtime',
  '',
  'Each row is one desk entry. **Sittings** lists where the term is linked in lesson text (data-term or auto-link).',
  'Regenerate: `node tools/verify/build_glossary_enrichment.mjs && node tools/verify/generate_glossary_proof.mjs`',
  '',
  '| ID | Sittings | In plain words (excerpt) | Deeper record (excerpt) | Proof & sources |',
  '|----|----------|--------------------------|-------------------------|-----------------|',
];

const ids = [...byId.keys()].sort();
for (const id of ids) {
  const r = byId.get(id);
  const sit = [...r.sheets].sort((a, b) => a - b).join(', ');
  const esc = (s) => String(s || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 200);
  lines.push(`| ${id} | ${sit || '—'} | ${esc(r.smp)} | ${esc(r.his)} | ${esc(r.prf)} |`);
}

lines.push('');
lines.push(`**Entries in index:** ${ids.length}`);
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath} (${ids.length} glossary IDs linked across sittings)`);
