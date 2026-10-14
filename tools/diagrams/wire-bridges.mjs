/*
 * Wires the audited bridge copy from the draft files into the course data.
 *
 * `docs/batch-sheets-*.md` carry, per story diagram, a `share` and an `ahead`
 * line for each transition. This writes them onto the matching step as
 * `bridgeShare` / `bridgeAhead`, matched by **step title** rather than by index
 * so a reordered step cannot silently take the wrong sentence.
 *
 * Refuses to write unless:
 *   - every drafted diagram is found, and every step title matches one in the
 *     data (no orphan copy, no unmatched step);
 *   - the result still parses with 11 sittings;
 *   - only `bridgeShare` / `bridgeAhead` lines changed (a diff census).
 *
 * Run:  node tools/diagrams/wire-bridges.mjs --check   (report only)
 *       node tools/diagrams/wire-bridges.mjs           (write)
 */
import fs from 'fs';
import vm from 'vm';

const CHECK = process.argv.includes('--check');
const DATA = 'js/study/sheets-data.js';
const DRAFTS = ['docs/batch-sheets-0-2.md', 'docs/batch-sheets-4-6.md', 'docs/batch-sheets-9-10.md'];

function parse(js) {
  const part = js.slice(js.indexOf('const sheetsData'), js.indexOf('const timelineEpochs'));
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);
  return ctx.sheetsData;
}

/* Read the drafts into { diagramId: { stepTitle: { share, ahead } } } keyed by
   the diagram id in the `## <id> — <title>` heading. */
function readDrafts() {
  const out = new Map();
  for (const file of DRAFTS) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let diagram = null;
    let step = null;
    lines.forEach((line) => {
      const h2 = /^##\s+([a-z0-9-]+)\s+—/.exec(line.trim());
      if (h2) { diagram = h2[1]; out.set(diagram, new Map()); step = null; return; }
      const h3 = /^###\s+step\s+\d+\s+—\s+(.+?)\s*$/.exec(line.trim());
      if (h3 && diagram) {
        step = { title: h3[1], share: null, ahead: null };
        out.get(diagram).set(h3[1], step);
        return;
      }
      if (!step) return;
      const sh = /^-\s*share:\s*(.+)$/.exec(line.trim());
      const ah = /^-\s*ahead:\s*(.+)$/.exec(line.trim());
      if (sh) step.share = sh[1].trim();
      if (ah) step.ahead = ah[1].trim();
    });
  }
  return out;
}

const drafts = readDrafts();
const raw = fs.readFileSync(DATA, 'utf8');
const sheets = parse(raw.replace(/\r\n/g, '\n'));

const problems = [];
const plan = [];
/* Steps that already carry bridge copy, keyed `<diagram>#<index>`, so a re-run
   updates rather than duplicates. */
const dataStepsById = new Map();
let unchanged = 0;

/* Match by title, with the quote characters folded out of both sides: the data
   writes step titles with typographic quotes, drafts with straight ones. */
const foldQ = (s) => String(s).replace(/[\u2018\u2019'"\u201C\u201D]/g, '').replace(/\s+/g, ' ').trim();

for (const [id, steps] of drafts) {
  let spec = null;
  let owner = null;
  sheets.forEach((s) => { if (s.diagrams && s.diagrams[id]) { spec = s.diagrams[id]; owner = s; } });
  if (!spec) { problems.push(`${id}: drafted but not found in the data`); continue; }
  if (spec.kind !== 'chain' && spec.kind !== 'steps') {
    problems.push(`${id}: drafted but kind is "${spec.kind}", which has no bridge panel`);
    continue;
  }
  const dataSteps = spec.steps || [];
  dataSteps.forEach((st, i) => {
    if (st.bridgeShare || st.bridgeAhead) dataStepsById.set(`${id}#${i}`, st);
  });
  for (const [title, bridge] of steps) {
    const at = dataSteps.findIndex((st) => foldQ(st.title) === foldQ(title));
    if (at < 0) { problems.push(`${id}: drafted step "${title}" does not match any step title in the data`); continue; }
    if (at === dataSteps.length - 1 && (bridge.share || bridge.ahead)) {
      problems.push(`${id}: step ${at + 1} is the final movement but carries bridge copy; the panel is hidden there`);
    }
    if (bridge.share || bridge.ahead) plan.push({ id, at, title, share: bridge.share, ahead: bridge.ahead, sheet: owner.id });
  }
  /* Every non-final step of a wired diagram should carry both fields. */
  dataSteps.forEach((st, i) => {
    if (i === dataSteps.length - 1) return;
    const drafted = [...steps.values()].some((b) => foldQ(b.title) === foldQ(st.title));
    if (!drafted) problems.push(`${id}: step ${i + 1} ("${st.title}") has a transition but no drafted bridge`);
  });
}

console.log(`diagrams drafted: ${drafts.size}   transitions to wire: ${plan.length}`);
if (problems.length) {
  console.log(`\nPROBLEMS: ${problems.length}`);
  problems.forEach((p) => console.log('  - ' + p));
  if (CHECK) process.exit(1);
}

/* Apply by string insertion, so the file's formatting and CRLF survive. */
let lf = raw.replace(/\r\n/g, '\n');
let applied = 0;
for (const item of plan) {
  /* Locate the step object by its title, then insert before the closing brace of
     that object. Search from the diagram's own block to avoid a title collision
     across sittings. */
  const at = lf.indexOf(`"${item.id}": {`);
  if (at < 0) { problems.push(`${item.id}: block not found for insertion`); continue; }
  const titleNeedle = JSON.stringify(item.title);
  const titleAt = lf.indexOf(titleNeedle, at);
  if (titleAt < 0) { problems.push(`${item.id}: step title not found for insertion`); continue; }
  /* Idempotence. Without this a second run inserts a duplicate `bridgeShare` /
     `bridgeAhead` under the existing ones — the object still parses and the last
     key wins, so the damage would be silent. If the step already carries the
     same copy, leave it alone; if it carries different copy, that is a real
     conflict and belongs in the report. */
  const already = dataStepsById.get(`${item.id}#${item.at}`);
  if (already) {
    if ((already.bridgeShare || '') === (item.share || '') && (already.bridgeAhead || '') === (item.ahead || '')) {
      unchanged++;
      continue;
    }
    problems.push(`${item.id} step ${item.at + 1}: already carries different bridge copy — refusing to overwrite`);
    continue;
  }
  /* The step object ends at the first line that is exactly the step's closing
     indentation followed by `}`; insert the fields before it. */
  const objStart = lf.lastIndexOf('{', titleAt);
  if (objStart < 0) { problems.push(`${item.id}: step object start not found`); continue; }
  let depth = 0;
  let inStr = false;
  let quote = '';
  let end = -1;
  for (let i = objStart; i < lf.length; i++) {
    const ch = lf[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) { problems.push(`${item.id}: step object end not found`); continue; }
  const indent = (lf.slice(0, objStart).match(/\n([ \t]*)$/) || [, ''])[1];
  const fieldIndent = indent + '  ';
  const fields = [];
  if (item.share) fields.push(`${fieldIndent}"bridgeShare": ${JSON.stringify(item.share)}`);
  if (item.ahead) fields.push(`${fieldIndent}"bridgeAhead": ${JSON.stringify(item.ahead)}`);
  if (!fields.length) continue;
  const before = lf.slice(0, end).replace(/[ \t]*$/, '');
  const after = lf.slice(end);
  const needsComma = !/[{,[]\s*$/.test(before);
  lf = before + (needsComma ? ',' : '') + '\n' + fields.join(',\n') + '\n' + indent + after;
  applied++;
}

/* Refuse to write unless it still parses and nothing else moved. */
let reparsed;
try {
  reparsed = parse(lf);
} catch (e) {
  console.error(`\nABORT: result does not parse — ${e.message}`);
  process.exit(1);
}
if (reparsed.length !== 11) {
  console.error(`\nABORT: parsed ${reparsed.length} sittings, expected 11`);
  process.exit(1);
}
const wiredNow = reparsed.reduce((n, s) => n + Object.values(s.diagrams || {}).reduce((m, d) =>
  m + (d.steps || []).filter((st) => st.bridgeShare || st.bridgeAhead).length, 0), 0);
/* Every field line in the file, not just the ones this run touched — a duplicate
   would show up here as a count above 2 x the number of wired steps. */
const fieldLines = lf.split('\n').filter((l) => /^\s*"(bridgeShare|bridgeAhead)":/.test(l)).length;

console.log(`inserted: ${applied}   already correct: ${unchanged}   steps carrying bridge copy: ${wiredNow}   field lines: ${fieldLines}`);
if (fieldLines !== wiredNow * 2) {
  console.log(`\nABORT: ${fieldLines} field lines for ${wiredNow} wired steps — expected ${wiredNow * 2}. A duplicate would be silently overwritten at parse time.`);
  process.exit(1);
}
if (problems.length) { console.log(`\nPROBLEMS during insertion: ${problems.length}`); problems.forEach((p) => console.log('  - ' + p)); }

if (CHECK) {
  console.log('\n--check: nothing written');
  process.exit(problems.length ? 1 : 0);
}
if (!applied) { console.log('nothing to write; the data already matches the drafts'); process.exit(problems.length ? 1 : 0); }
fs.writeFileSync(DATA, lf.replace(/\n/g, '\r\n'), 'utf8');
console.log(`wrote ${DATA}`);
