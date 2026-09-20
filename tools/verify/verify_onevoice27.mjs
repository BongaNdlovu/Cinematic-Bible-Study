import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reviewDir = path.join(root, 'tools/review/onevoice27');

function fail(msg) {
  console.error(`\x1b[31mFAIL: ${msg}\x1b[0m`);
  process.exit(1);
}

function normalizeQuotes(str) {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('=== OneVoice27 Verification Harness ===\n');

// 1. Verify units.json exists
const unitsJsonPath = path.join(reviewDir, 'units.json');
if (!fs.existsSync(unitsJsonPath)) {
  fail(`Missing ${unitsJsonPath}. Run node tools/verify/extract_claim_units.mjs first.`);
}
const unitsData = JSON.parse(fs.readFileSync(unitsJsonPath, 'utf8'));
const { sheetHashes, units } = unitsData;
if (!sheetHashes || !units || units.length === 0) {
  fail('units.json is missing required sheetHashes or units array.');
}
console.log(`[PASS] units.json loaded (${units.length} total units across 11 sittings).`);

// 2. Verify rules file
const rulesPath = path.join(reviewDir, 'RULES.md');
if (!fs.existsSync(rulesPath)) {
  fail('Missing tools/review/onevoice27/RULES.md.');
}
console.log('[PASS] RULES.md exists in tools/review/onevoice27/.');

// 3. Verify KJV database & Scripture quotes
console.log('\n--- Checking Quoted Scripture Against bible/kjv.json ---');
const kjv = JSON.parse(fs.readFileSync(path.join(root, 'bible/kjv.json'), 'utf8'));

// Build flattened normalized KJV corpus
const kjvCorpus = [];
for (const [book, chs] of Object.entries(kjv.books)) {
  for (const [ch, verses] of Object.entries(chs)) {
    for (const [v, text] of Object.entries(verses)) {
      kjvCorpus.push({
        ref: `${book} ${ch}:${v}`,
        text: normalizeQuotes(text).replace(/[.,;:?!—–…-]+/g, ' ').toLowerCase()
      });
    }
  }
}
const allKjvText = kjvCorpus.map((c) => c.text).join(' ');

// Load sheetsData, SHEET_VERIFY, SHEET_GLOSSARY
const sheetsSrc = fs.readFileSync(path.join(root, 'js/study/sheets-data.js'), 'utf8');
const sittingPart = sheetsSrc.slice(sheetsSrc.indexOf('const sheetsData'), sheetsSrc.indexOf('const timelineEpochs'));
const sCtx = {};
vm.createContext(sCtx);
vm.runInContext(sittingPart + '\nthis.sheetsData = sheetsData;', sCtx);
const sheetsData = sCtx.sheetsData;

const verifySrc = fs.readFileSync(path.join(root, 'js/study/sheet-verify.js'), 'utf8');
const vCtx = { window: {} };
vm.createContext(vCtx);
vm.runInContext(verifySrc, vCtx);
const sheetVerify = vCtx.window.SHEET_VERIFY || [];

const glossSrc = fs.readFileSync(path.join(root, 'js/study/sheet-glossary.js'), 'utf8');
const gCtx = { window: {} };
vm.createContext(gCtx);
vm.runInContext(glossSrc, gCtx);
const sheetGlossary = gCtx.window.SHEET_GLOSSARY || [];

const wbSrc = fs.readFileSync(path.join(root, 'js/study/workbench.js'), 'utf8');

// Verify scripture quotes in SHEET_VERIFY
let verifiedScriptureQuotes = 0;
sheetVerify.forEach((sv, sIdx) => {
  sv.items.forEach((it, itIdx) => {
    if (it.kind !== 'scripture') return;
    const cleanQuote = it.quote.replace(/\[[^\]]+\]/g, ' ');
    const clauses = cleanQuote
      .split(/…|\.\.\./)
      .map((c) => normalizeQuotes(c).replace(/[.,;:?!—–…-]+/g, ' ').toLowerCase().trim())
      .filter((c) => c.length > 10);

    clauses.forEach((clause) => {
      const words = clause.split(' ').filter(Boolean);
      let matched = false;
      for (let i = 0; i <= words.length - 4; i++) {
        const sub = words.slice(i, i + 4).join(' ');
        if (allKjvText.includes(sub)) {
          matched = true;
          break;
        }
      }
      if (!matched && words.length >= 3) {
        const sub = words.slice(0, Math.min(words.length, 3)).join(' ');
        if (allKjvText.includes(sub)) matched = true;
      }
      if (!matched) {
        fail(`SHEET_VERIFY[${sIdx}] item ${itIdx} (${it.source}): "${clause}" not found in bible/kjv.json`);
      }
      verifiedScriptureQuotes++;
    });
  });
});

// Verify scripture quotes in sheetsData blockquotes
sheetsData.forEach((sheet, sIdx) => {
  const bqMatches = sheet.content.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi);
  for (const m of bqMatches) {
    let raw = m[1].replace(/<[^>]+>/g, ' ');
    raw = raw.replace(/[—–-]\s*(Daniel|Luke|Mark|Jeremiah|Ezekiel|Matthew|Revelation|John|Hebrews|Exodus|1 Kings|2 Kings|Esther|Psalm|Isaiah|Acts|Ezra|Leviticus|Sir Isaac Newton|Martin Luther|Historical)[^()]*(\([^)]*\))?\s*$/i, '');
    if (/Pope|Papacy|Rome was|Antichrist|Luther|Newton|Chronicle|Inscription/i.test(raw)) continue;

    const clauses = raw
      .split(/…|\.\.\./)
      .map((c) => normalizeQuotes(c).replace(/[.,;:?!—–…-]+/g, ' ').toLowerCase().trim())
      .filter((c) => c.length > 15);

    clauses.forEach((clause) => {
      const words = clause.split(' ').filter(Boolean);
      let matched = false;
      for (let i = 0; i <= words.length - 4; i++) {
        const sub = words.slice(i, i + 4).join(' ');
        if (allKjvText.includes(sub)) {
          matched = true;
          break;
        }
      }
      if (!matched && words.length >= 3) {
        const sub = words.slice(0, Math.min(words.length, 3)).join(' ');
        if (allKjvText.includes(sub)) matched = true;
      }
      if (!matched) {
        fail(`Sitting ${sIdx} blockquote quote: "${clause}" not found in bible/kjv.json`);
      }
      verifiedScriptureQuotes++;
    });
  }
});
console.log(`[PASS] ${verifiedScriptureQuotes} quoted Scripture clauses verified against bible/kjv.json.`);

// 4. Check forbidden learner-facing brands
console.log('\n--- Checking Forbidden Learner-Facing Brands ---');
const brandRegex = /\b(Adventist|Ellen G\.|Uriah Smith|Investigative Judgment|Great Controversy|Early Writings|The Sanctified Life)\b/i;

sheetsData.forEach((sheet, sIdx) => {
  const learnerText = [
    sheet.content,
    JSON.stringify(sheet.quizzes),
    JSON.stringify(sheet.studyGuide),
    JSON.stringify(sheet.guide),
    JSON.stringify(sheet.christology)
  ].join(' ');
  const match = learnerText.match(brandRegex);
  if (match) {
    fail(`Sitting ${sIdx} contains forbidden brand: "${match[0]}"`);
  }
});

sheetVerify.forEach((sv, sIdx) => {
  const text = JSON.stringify(sv);
  const match = text.match(brandRegex);
  if (match) {
    fail(`SHEET_VERIFY[${sIdx}] contains forbidden brand: "${match[0]}"`);
  }
});

const wbBrandMatch = wbSrc.match(brandRegex);
if (wbBrandMatch) {
  fail(`workbench.js contains forbidden brand: "${wbBrandMatch[0]}"`);
}

const glossBrandMatch = glossSrc.match(brandRegex);
if (glossBrandMatch) {
  fail(`sheet-glossary.js contains forbidden brand: "${glossBrandMatch[0]}"`);
}

console.log('[PASS] 0 forbidden learner-facing brands found.');

// 5. Check dates: Ribera 1590/1591, Alcázar 1614, and numbers not taught as "printed in the verse"
console.log('\n--- Checking Prophetic Dates & Framing ---');
const allText = sheetsSrc + verifySrc + wbSrc + glossSrc;

// Ribera
const riberaMatches = allText.matchAll(/Ribera[^\.\n]*?(\d{4})/gi);
for (const m of riberaMatches) {
  const yr = m[1];
  if (yr !== '1590' && yr !== '1591' && yr !== '1537') { // 1537 is his birth year in bio
    fail(`Ribera commentary must be dated 1590/1591, found: ${m[0]}`);
  }
}

// Alcazar
const alcazarMatches = allText.matchAll(/Alc[áa]zar[^\.\n]*?(\d{4})/gi);
for (const m of alcazarMatches) {
  const yr = m[1];
  if (yr !== '1614' && yr !== '1554' && yr !== '1613') { // 1554 birth, 1613 death
    fail(`Alcázar commentary must be dated 1614, found: ${m[0]}`);
  }
}

// Check that 457 / 27 / 31 / 34 / 1844 / 1,260 are not taught as "printed in the verse"
const badFramingRegex = /(Daniel\s+(?:[789]:\d+|[789])\s+(?:states|says|prints|reads)\s+(?:457|27|31|34|1844|1[,\.]?260)|(?<!not\s+(?:calendar\s+years\s+|words\s+)?)printed\s+in\s+the\s+verse)/i;
if (badFramingRegex.test(allText)) {
  fail('Overclaiming detected: prophetic dates (457/27/31/34/1844/1,260) must not be taught as printed in the verse.');
}

// Check for confusing or overclaiming patterns: "the Bible says" for an inference
const bibleSaysRegex = /\b(?:the\s+Bible\s+(?:says|states|declares)|Scripture\s+says)\b/i;
if (bibleSaysRegex.test(allText)) {
  fail('Confusing pattern detected: "the Bible says" must not be used for inferences.');
}

// Check that rival schools are not treated as equal winners
const equalWinnersRegex = /\b(?:equal\s+validity|equally\s+valid|equally\s+true|all\s+three\s+schools\s+are\s+correct|all\s+three\s+views\s+win)\b/i;
if (equalWinnersRegex.test(allText)) {
  fail('Confusing pattern detected: rival prophetic schools must not be treated as equal winners.');
}

console.log('[PASS] Dates, framing, and hermeneutical patterns verified.');

// 6. Check required sections per sitting
console.log('\n--- Checking Required Sections per Sitting ---');
sheetsData.forEach((s, idx) => {
  if (!s.subtitle && (!s.flow || s.flow.length === 0)) {
    fail(`Sheet ${idx} missing big idea (subtitle / flow).`);
  }
  if (!/level-text|TEXT/i.test(s.content) && (!s.scripture || s.scripture.length === 0)) {
    fail(`Sheet ${idx} missing TEXT section.`);
  }
  if (!/level-interpretation|INTERPRETATION/i.test(s.content)) {
    fail(`Sheet ${idx} missing INTERPRETATION section.`);
  }
  if (!s.christology || !s.christology.body || s.christology.body.length === 0) {
    fail(`Sheet ${idx} missing christology section.`);
  }
  if (!s.studyGuide || !s.studyGuide.trace || s.studyGuide.trace.length !== 4) {
    fail(`Sheet ${idx} studyGuide missing 4 trace steps.`);
  }
  if (!s.quizzes || s.quizzes.length !== 5) {
    fail(`Sheet ${idx} must have exactly 5 quizzes, found ${s.quizzes ? s.quizzes.length : 0}.`);
  }
  if (!s.guide || !s.guide.end || !s.guide.end.title || !s.guide.end.nextWhy) {
    fail(`Sheet ${idx} missing guide.end bridge.`);
  }
});
console.log('[PASS] All 11 sittings contain all required sections.');

// 7. Verify all 11 SHEETxx_LINECHECK.md files exist and cover all units
console.log('\n--- Checking LINECHECK Files Coverage & Hashes ---');
const VALID_TAGS = new Set(['TEXT', 'HISTORY', 'INTERPRETATION', 'CHRIST', 'PASTORAL', 'N/A']);
const VALID_VERDICTS = new Set(['ACCURATE', 'SOFTEN', 'FIX', 'N/A']);

let totalVerifiedUnits = 0;
let totalFixCount = 0;
let totalSoftenCount = 0;
let totalAccurateCount = 0;
let totalNaCount = 0;

for (let sIdx = 0; sIdx <= 10; sIdx++) {
  const pad = String(sIdx).padStart(2, '0');
  const filename = `SHEET${pad}_LINECHECK.md`;
  const filePath = path.join(reviewDir, filename);

  if (!fs.existsSync(filePath)) {
    fail(`Missing linecheck file: ${filename}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check required metadata headers and sections
  if (!content.includes('**Audit Date:**')) {
    fail(`${filename} is missing **Audit Date:** metadata.`);
  }
  if (!content.includes('**File Audited:**')) {
    fail(`${filename} is missing **File Audited:** metadata.`);
  }
  if (!content.includes('**Counts:**')) {
    fail(`${filename} is missing **Counts:** metadata.`);
  }
  if (!content.includes('## 3. FIX List')) {
    fail(`${filename} is missing ## 3. FIX List section.`);
  }
  if (!content.includes('## 4. Verification Sources')) {
    fail(`${filename} is missing ## 4. Verification Sources section.`);
  }

  // Check expected content hash
  const expectedHash = sheetHashes[sIdx];
  if (!content.includes(expectedHash)) {
    fail(`${filename} content hash mismatch! Expected ${expectedHash} from units.json.`);
  }

  // Get all expected units for this sheet
  const expectedUnits = units.filter((u) => u.sheet === sIdx);
  const expectedUnitIds = new Set(expectedUnits.map((u) => u.id));

  // Parse markdown table rows: | Unit | Tag | Verdict | Proof |
  const lines = content.split('\n');
  const foundUnitIds = new Set();
  let tableHeaderFound = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (trimmed.includes('---')) continue;
    
    const parts = trimmed.split('|').map((p) => p.trim()).filter((p, i, arr) => i > 0 && i < arr.length - 1);
    if (parts.length < 4) continue;
    
    const [uId, tag, verdict, proof] = parts;
    if (uId.toLowerCase() === 'unit' || tag.toLowerCase() === 'tag') {
      tableHeaderFound = true;
      continue;
    }

    if (!expectedUnitIds.has(uId)) {
      fail(`${filename} contains unexpected unit ID: "${uId}"`);
    }

    if (foundUnitIds.has(uId)) {
      fail(`${filename} has duplicate entry for unit ID: "${uId}"`);
    }
    foundUnitIds.add(uId);

    // Validate Tag
    if (!VALID_TAGS.has(tag)) {
      fail(`${filename} unit ${uId} has invalid Tag: "${tag}" (must be TEXT|HISTORY|INTERPRETATION|CHRIST|PASTORAL|N/A)`);
    }

    // Validate Verdict
    if (!VALID_VERDICTS.has(verdict)) {
      fail(`${filename} unit ${uId} has invalid Verdict: "${verdict}" (must be ACCURATE|SOFTEN|FIX|N/A)`);
    }

    // N/A correlation
    if (tag === 'N/A' && verdict !== 'N/A') {
      fail(`${filename} unit ${uId} tagged N/A must have verdict N/A, got "${verdict}"`);
    }
    if (verdict === 'N/A' && tag !== 'N/A') {
      fail(`${filename} unit ${uId} verdict N/A must have tag N/A, got "${tag}"`);
    }

    // Proof non-empty for non-N/A
    if (verdict !== 'N/A' && (!proof || proof.length === 0 || proof === '-')) {
      fail(`${filename} unit ${uId} has empty Proof column.`);
    }

    // SOFTEN hedge check
    if (verdict === 'SOFTEN') {
      if (!/hedge/i.test(proof)) {
        fail(`${filename} unit ${uId} is marked SOFTEN but proof does not name the in-text hedge: "${proof}"`);
      }
      totalSoftenCount++;
    } else if (verdict === 'FIX') {
      totalFixCount++;
    } else if (verdict === 'ACCURATE') {
      totalAccurateCount++;
    } else if (verdict === 'N/A') {
      totalNaCount++;
    }

    totalVerifiedUnits++;
  }

  if (!tableHeaderFound) {
    fail(`${filename} does not contain a valid markdown table header.`);
  }

  // Verify all units are covered
  for (const expId of expectedUnitIds) {
    if (!foundUnitIds.has(expId)) {
      fail(`${filename} is missing coverage for unit ID: "${expId}"`);
    }
  }

  console.log(`[PASS] ${filename}: ${foundUnitIds.size}/${expectedUnits.length} units audited (Hash: ${expectedHash}).`);
}

console.log(`\nLinecheck Audit Summary:`);
console.log(`- Total units: ${totalVerifiedUnits}`);
console.log(`- ACCURATE: ${totalAccurateCount}`);
console.log(`- SOFTEN: ${totalSoftenCount}`);
console.log(`- N/A: ${totalNaCount}`);
console.log(`- FIX remaining: ${totalFixCount}`);

if (totalFixCount > 0) {
  fail(`Hard gate failed: ${totalFixCount} FIX items remain unapplied across LINECHECK files!`);
}

console.log('\n======================================================');
console.log('  ALL ONEVOICE27 LINECHECK AUDIT REQUIREMENTS PASSED!');
console.log('======================================================');
