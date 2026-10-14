/*
 * Verifies that every grounding quote in the editorial drafts actually exists in
 * the source it cites.
 *
 * Each draft carries `<!-- grounding: <diagram> ... -->` blocks whose entries
 * look like `<source label> — "<quoted licence>"`. The quote is the drafter's
 * claim that the sitting licences the bridge sentence. If the quote is not in
 * the course, the licence does not exist and the sentence resting on it is
 * unsupported — which is the failure this batch most needs to rule out.
 *
 * Quotes are matched with markup stripped and whitespace folded, because the
 * source contains inline <strong>/<em> that split sentences.
 *
 * Run: node tools/verify/verify_grounding_quotes.mjs
 */
import fs from 'fs';
import vm from 'vm';

const DRAFTS = ['docs/batch-sheets-0-2.md', 'docs/batch-sheets-4-6.md', 'docs/batch-sheets-9-10.md'];

/*
 * Fold everything that carries no meaning for a substring match: markup, quote
 * style (a draft may write 'third ruler' where the source has "third ruler"),
 * dash style, and whitespace runs. Applied to both the needle and the hay.
 */
function fold(s) {
  return String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2018\u2019\u201A\u2032'"\u201C\u201D\u201E\u2033]/g, '')
    .replace(/[\u2013\u2014\u2212]/g, '--')
    .replace(/\s+/g, ' ')
    .trim();
}

function plain(s) {
  return fold(s);
}

/*
 * A looser fold for matching only. The ASCII artwork pads names into columns
 * with runs of spaces ("1st Ruler: NABONIDUS      (King of Babylon…"), and a
 * quote may normalise those runs to one space — or drop the padding entirely.
 * So the comparison also tries spaces removed at punctuation boundaries. This
 * loosens whitespace, never wording.
 */
function loose(s) {
  return fold(s)
    .replace(/\s*([:(),])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCourseStrings() {
  const raw = fs.readFileSync('js/study/sheets-data.js', 'utf8').replace(/\r\n/g, '\n');
  const part = raw.slice(raw.indexOf('const sheetsData'), raw.indexOf('const timelineEpochs'));
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  ctx.sheetsData.forEach(walk);
  const vctx = { window: {} };
  vm.createContext(vctx);
  vm.runInContext(fs.readFileSync('js/study/sheet-verify.js', 'utf8'), vctx);
  walk(vctx.window.SHEET_VERIFY);
  return out.map(plain);
}

const kjv = JSON.parse(fs.readFileSync('bible/kjv.json', 'utf8'));
const kjvStrings = [];
for (const chapters of Object.values(kjv.books)) {
  for (const verses of Object.values(chapters)) kjvStrings.push(...Object.values(verses));
}
const KJV = kjvStrings.map(plain);
const COURSE = loadCourseStrings();
const KJV_LOOSE = kjvStrings.map(loose);
const COURSE_LOOSE = loadCourseStrings().map(loose);

function findOne(q) {
  const needle = plain(q);
  if (needle.length < 8) return { found: false, why: 'too short to test' };
  if (KJV.some((t) => t.includes(needle))) return { found: true, where: 'KJV' };
  if (COURSE.some((t) => t.includes(needle))) return { found: true, where: 'course' };
  /* Same words, whitespace folded differently (ASCII column padding). */
  const looseNeedle = loose(q);
  if (looseNeedle.length >= 8) {
    if (KJV_LOOSE.some((t) => t.includes(looseNeedle))) return { found: true, where: 'KJV (whitespace folded)' };
    if (COURSE_LOOSE.some((t) => t.includes(looseNeedle))) return { found: true, where: 'course (whitespace folded)' };
  }
  /* A quote stitched across an inline tag boundary, e.g. "… of <strong>x</strong> allotted …". */
  const words = needle.split(' ');
  if (words.length > 6) {
    for (let drop = 2; drop <= Math.min(4, words.length - 4); drop++) {
      for (let at = 0; at + drop <= words.length; at++) {
        const trimmed = words.slice(0, at).concat(words.slice(at + drop)).join(' ');
        if (KJV.some((t) => t.includes(trimmed)) || COURSE.some((t) => t.includes(trimmed))) {
          return { found: true, where: `course/KJV (${drop} interpolated word(s) dropped)` };
        }
      }
    }
  }
  return { found: false };
}

/*
 * A grounding entry may cite more than one source line, joined with " / " —
 * "1st Ruler: NABONIDUS … / 2nd Ruler: BELSHAZZAR …" is two artwork lines, not
 * one continuous run. Each fragment is checked separately, because a citation
 * that is half real and half invented is exactly what this is looking for.
 */
function findQuote(q) {
  const fragments = String(q).split(/\s+\/\s+/).map((f) => f.trim()).filter(Boolean);
  if (fragments.length > 1) {
    const results = fragments.map(findOne);
    const bad = results.filter((r) => !r.found);
    if (bad.length) return { found: false, fragment: fragments[results.indexOf(bad[0])] };
    return { found: true, where: `all ${fragments.length} fragments found` };
  }
  return findOne(q);
}

let checked = 0;
const missing = [];
const ok = [];

for (const file of DRAFTS) {
  if (!fs.existsSync(file)) { missing.push({ file, quote: '(file absent)' }); continue; }
  const body = fs.readFileSync(file, 'utf8');
  const blocks = [...body.matchAll(/<!--\s*grounding:\s*([\s\S]*?)-->/g)];
  for (const block of blocks) {
    const diagram = (block[1].match(/grounding:\s*([^\s]+)/) || [])[1] || '(unnamed)';
    /* Every quoted run inside the block is a claimed licence. */
    const quotes = [...block[1].matchAll(/"([^"]{8,})"/g)].map((m) => m[1]);
    for (const q of quotes) {
      checked++;
      const r = findQuote(q);
      if (r.found) ok.push({ diagram, q, where: r.where });
      else missing.push({ file: file.split('/').pop(), diagram, quote: q });
    }
  }
}

console.log(`grounding quotes checked: ${checked}`);
console.log(`  found: ${ok.length}`);
if (missing.length) {
  console.log(`  NOT FOUND: ${missing.length}`);
  missing.forEach((m) => {
    console.log(`\n  [${m.diagram}] ${m.file || ''}`);
    console.log(`    "${m.quote.slice(0, 160)}"`);
  });
}
const fromCourse = ok.filter((o) => o.where.startsWith('course')).length;
console.log(`\nsources: ${ok.length - fromCourse} in the KJV, ${fromCourse} in the course copy`);
process.exit(missing.length ? 1 : 0);
