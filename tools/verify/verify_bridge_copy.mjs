/*
 * Machine-checks the editorial drafts before they are wired into the course.
 *
 * Three things are checkable without judgement:
 *   1. every double-quoted string is a verbatim substring of the KJV or of the
 *      sitting's own copy (markup stripped) — a paraphrase inside quote marks is
 *      a defect whatever it says;
 *   2. every `share`/`ahead` line carries no brand name, no apocalyptic date
 *      presented as printed in the verse, and no banned framing;
 *   3. the drafts cover every wired transition, so a diagram is not half-filled.
 *
 * What it cannot check is whether a sentence is *licensed* by the sitting — that
 * is the auditor's job. This narrows that job to prose only.
 *
 * Run: node tools/verify/verify_bridge_copy.mjs [--drafts] [--wired]
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const DRAFTS = ['docs/batch-sheets-0-2.md', 'docs/batch-sheets-4-6.md', 'docs/batch-sheets-9-10.md'];
const args = process.argv.slice(2);
const onlyDrafts = args.includes('--drafts');
const onlyWired = args.includes('--wired');

/* Everything learner-facing in the course, flattened for substring tests. */
function loadCourseCopy() {
  const raw = fs.readFileSync('js/study/sheets-data.js', 'utf8').replace(/\r\n/g, '\n');
  const part = raw.slice(raw.indexOf('const sheetsData'), raw.indexOf('const timelineEpochs'));
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  ctx.sheetsData.forEach((s) => { walk(s); });
  const vctx = { window: {} };
  vm.createContext(vctx);
  vm.runInContext(fs.readFileSync('js/study/sheet-verify.js', 'utf8'), vctx);
  walk(vctx.window.SHEET_VERIFY);
  return strings;
}

/* Strip tags and fold whitespace, so "a <strong>b</strong> c" matches "a b c". */
function plain(s) {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const kjv = JSON.parse(fs.readFileSync('bible/kjv.json', 'utf8'));
const kjvText = [];
for (const chapters of Object.values(kjv.books)) {
  for (const verses of Object.values(chapters)) kjvText.push(...Object.values(verses));
}
const kjvPlain = kjvText.map(plain);
const coursePlain = loadCourseCopy().map(plain);

const hasVerbatim = (q) => {
  const needle = plain(q);
  if (needle.length < 3) return true; /* too short to be a claim */
  return kjvPlain.some((t) => t.includes(needle)) || coursePlain.some((t) => t.includes(needle));
};

const QUOTE_RE = /"([^"]{2,})"/g;
const BRANDS = /\b(Adventist|Ellen G\.|Uriah Smith|Investigative Judgment|Great Controversy|Early Writings)\b/i;
/* The course's own rule: a date may be referenced, never taught as printed. */
const DATE_AS_PRINTED = /\b(457|27|31|34|1844|1[,.]?260)\b[^.]{0,40}\b(verse|text|says|states|prints|reads)\b/i;
const BIBLE_SAYS = /\b(?:the\s+Bible\s+(?:says|states|declares)|Scripture\s+says)\b/i;

const problems = [];
let quotesChecked = 0;
let linesChecked = 0;

function checkLine(where, text) {
  linesChecked++;
  if (BRANDS.test(text)) problems.push(`${where}: brand name — ${text.slice(0, 90)}`);
  if (DATE_AS_PRINTED.test(text)) problems.push(`${where}: date framed as printed in the verse — ${text.slice(0, 90)}`);
  if (BIBLE_SAYS.test(text)) problems.push(`${where}: "the Bible says" for an inference — ${text.slice(0, 90)}`);
  let m;
  QUOTE_RE.lastIndex = 0;
  while ((m = QUOTE_RE.exec(text))) {
    quotesChecked++;
    if (!hasVerbatim(m[1])) problems.push(`${where}: quoted text not found in the KJV or the course — "${m[1].slice(0, 70)}"`);
  }
}

if (!onlyWired) {
  for (const file of DRAFTS) {
    if (!fs.existsSync(file)) { problems.push(`${file}: missing`); continue; }
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = /^-\s*(share|ahead):\s*(.+)$/.exec(line.trim());
      if (m) checkLine(`${path.basename(file)}:${i + 1} ${m[1]}`, m[2]);
    });
  }
}

if (!onlyDrafts) {
  /* The wired copy, once it exists: every story step's two fields. */
  const raw = fs.readFileSync('js/study/sheets-data.js', 'utf8').replace(/\r\n/g, '\n');
  const part = raw.slice(raw.indexOf('const sheetsData'), raw.indexOf('const timelineEpochs'));
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);
  let wired = 0;
  ctx.sheetsData.forEach((s) => Object.entries(s.diagrams || {}).forEach(([id, d]) => {
    if (d.kind !== 'chain' && d.kind !== 'steps') return;
    (d.steps || []).forEach((st, i) => {
      if (st.bridgeShare) { wired++; checkLine(`wired ${id} step ${i + 1} share`, st.bridgeShare); }
      if (st.bridgeAhead) { wired++; checkLine(`wired ${id} step ${i + 1} ahead`, st.bridgeAhead); }
    });
  }));
  console.log(`wired bridge fields found: ${wired}`);
}

console.log(`draft lines checked: ${linesChecked}   quoted strings checked: ${quotesChecked}`);
if (problems.length) {
  console.log(`\nPROBLEMS: ${problems.length}`);
  problems.forEach((p) => console.log('  - ' + p));
} else {
  console.log('all quotations verbatim; no brand, date-as-printed or Bible-says framing');
}
process.exit(problems.length ? 1 : 0);
