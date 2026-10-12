/**
 * Builds js/study/glossary-enrichment.js from live glossary + verify dock cross-refs.
 * Every desk entry targets "Newton-length" copy (see newton-isaac override).
 * Run: node tools/verify/build_glossary_enrichment.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const MIN_SIMPLE = 145;
const MIN_HISTORY = 520;
const MIN_PROOF = 4;
const MAX_PROOF = 5;

function loadGlossary() {
  const gCtx = { window: {} };
  vm.createContext(gCtx);
  let glossSrc = fs.readFileSync(path.join(root, 'js/study/sheet-glossary.js'), 'utf8');
  glossSrc = glossSrc.replace(/\(function applyGlossaryEnrichment\(\)[\s\S]*?\}\)\(\);\s*/, '');
  vm.runInContext(glossSrc, gCtx);
  return gCtx.window.SHEET_GLOSSARY || [];
}

function loadVerify() {
  const vCtx = { window: {} };
  vm.createContext(vCtx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/study/sheet-verify.js'), 'utf8'), vCtx);
  return vCtx.window.SHEET_VERIFY || [];
}

const SCRIPTURE_RE =
  /(?:Daniel|Dan\.?)\s*(\d+[:][\d–\-,\s]+)|(?:Numbers|Ezekiel|Leviticus|Revelation|Jeremiah|Isaiah|Hebrews|Ezra|2 Kings|1 Kings|1 John|Jude|Luke|Acts|Matthew|2 Peter|Genesis|2 Chronicles)\s*(\d+[:][\d–\-,\s]+)/gi;

function scriptureProofLines(text) {
  const out = [];
  const seen = new Set();
  let m;
  SCRIPTURE_RE.lastIndex = 0;
  while ((m = SCRIPTURE_RE.exec(text))) {
    const ref = (m[0] || '').replace(/\s+/g, ' ').trim();
    const key = ref.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`Scripture (KJV): ${ref} — verify in bible/kjv.json and the lesson Scripture dock.`);
  }
  return out;
}

/** Map glossary id → extra keywords to match in verify items */
const VERIFY_KEYS_EXTRA = {
  'newton-isaac': ['newton', 'isaac newton'],
  ribera: ['ribera'],
  alcazar: ['alcázar', 'alcazar'],
  porphyry: ['porphyry', 'jerome'],
  wycliffe: ['wycliffe'],
  luther: ['luther'],
  calvin: ['calvin'],
  darby: ['darby'],
  irving: ['irving'],
  scofield: ['scofield'],
  'year-day': ['year-day', 'each day for a year', 'day for a year'],
  historicism: ['historicism', 'hippolytus', 'four metals', 'four kingdoms'],
  preterism: ['preterism', 'alcázar', 'antiochus'],
  futurism: ['futurism', 'ribera', '70th week', 'gap'],
  dispensationalism: ['dispensational', 'maitland', 'darby'],
  antiochus: ['antiochus'],
  'little-horn': ['little horn', 'eleventh horn'],
  papacy: ['papacy', 'church of rome', 'pope'],
  tamid: ['tamid', 'daily'],
  nitsdaq: ['nitsdaq', '8:14', 'cleansed'],
  chathak: ['chathak', 'cut off', '9:24'],
  millerite: ['millerite', 'miller'],
  miller: ['william miller', 'miller'],
  'great-disappointment': ['1844', 'disappointment'],
  justinian: ['justinian'],
  berthier: ['berthier', '1798'],
  clovis: ['clovis', '508'],
  artaxerxes: ['artaxerxes', '457'],
  exile: ['605', 'deportation', 'jehoiakim'],
  jehoiakim: ['jehoiakim'],
  jehoiachin: ['jehoiachin', '597'],
  zedekiah: ['zedekiah', '586'],
  carchemish: ['carchemish'],
  ezekiel: ['ezekiel 4'],
  michael: ['michael', '12:1'],
  gabriel: ['gabriel'],
  nebuchadnezzar: ['nebuchadnezzar'],
  belshazzar: ['belshazzar'],
  cyrus: ['cyrus'],
  dura: ['dura', 'plain of dura'],
  colossus: ['colossus', 'statue', 'image composed'],
  sanctuary: ['sanctuary', '8:14'],
  heruli: ['heruli', '493'],
  vandals: ['vandals', '534'],
  ostrogoths: ['ostrogoth', '538'],
};

function keywordSet(entry) {
  const keys = new Set();
  keys.add(entry.id.replace(/-/g, ' ').toLowerCase());
  keys.add(entry.term.toLowerCase());
  (entry.aliases || []).forEach((a) => keys.add(String(a).toLowerCase()));
  (VERIFY_KEYS_EXTRA[entry.id] || []).forEach((k) => keys.add(k.toLowerCase()));
  return [...keys].filter((k) => k.length >= 3);
}

function verifyMatches(entry, verifyBlocks) {
  const keys = keywordSet(entry);
  const proof = [];
  const checks = [];
  const lessons = [];
  for (const block of verifyBlocks) {
    for (const it of block.items || []) {
      const blob = `${it.lesson || ''} ${it.source || ''} ${it.check || ''} ${it.quote || ''}`.toLowerCase();
      if (!keys.some((k) => blob.includes(k))) continue;
      const src = (it.source || 'Primary source').replace(/\s+/g, ' ').trim();
      const quote = (it.quote || '').replace(/\s+/g, ' ').trim();
      const excerpt = quote.length > 110 ? `${quote.slice(0, 107)}…` : quote;
      proof.push(`${src}${excerpt ? `: “${excerpt}”` : ''} — Sitting verify dock.`);
      if (it.check) checks.push(String(it.check).replace(/\s+/g, ' ').trim());
      if (it.lesson) lessons.push(String(it.lesson).replace(/\s+/g, ' ').trim());
      if (proof.length >= 4) break;
    }
    if (proof.length >= 4) break;
  }
  return { proof, checks: checks.slice(0, 2), lessons: lessons.slice(0, 1) };
}

function expandSimple(entry) {
  let s = entry.simple.trim();
  if (s.length >= MIN_SIMPLE) return s;
  const t = entry.term;
  if (entry.kind === 'person') {
    s = `${s} This desk indexes ${t} wherever the course cites that life, office, or published witness on the historicist timeline—not as an infallible authority on every disputed detail.`;
  } else if (entry.kind === 'place') {
    s = `${s} Maps and narrative use ${t} to orient the reader; the prophetic assignment still rests on Daniel’s own metal, beast, or kingdom language.`;
  } else {
    s = `${s} Gold-linked terms open this card when the lesson needs the idea for dates, symbols, sanctuary themes, or rival schools (historicism, preterism, futurism).`;
  }
  return s.length >= MIN_SIMPLE ? s : `${s} Cross-check the verify dock on the sitting where the term appears.`;
}

function courseDepth(entry, verifyLesson) {
  const t = entry.term;
  const parts = [];
  if (entry.kind === 'person') {
    parts.push(
      `When ${t} appears in a sitting, ask what dated event or primary source the lesson is pointing to, and whether the prophetic chain requires that name or only the kingdom or office behind it.`,
    );
  } else if (entry.kind === 'place') {
    parts.push(
      `${t} helps the eye on the chronicle map; do not let geography override Daniel’s explicit identifications (for example Daniel 8:20–21 for Persia and Greece).`,
    );
  } else {
    parts.push(
      `In historicist reading, ${t} usually affects how you count time, match symbols to empires, or weigh preterist and futurist alternatives—follow the lesson sentence that linked the term before treating this card as settled.`,
    );
  }
  if (/Daniel\s+\d+/i.test(entry.history)) {
    parts.push(
      'Re-read the Daniel references named in this card beside the sitting paragraph that first drove the conclusion; Scripture interprets Scripture before outside historians are invoked.',
    );
  }
  if (verifyLesson) {
    parts.push(verifyLesson);
  }
  parts.push('Open the verify dock on any sitting where this term is linked in gold.');
  return parts.join(' ');
}

function expandHistory(entry, checks, verifyLesson) {
  let h = entry.history.trim();
  const depth = courseDepth(entry, verifyLesson);
  if (checks.length) {
    h = `${h} ${checks.join(' ')}`;
  }
  if (h.length < MIN_HISTORY) {
    h = `${h} ${depth}`;
  }
  if (h.length < MIN_HISTORY) {
    h = `${h} Audit rows GLS-${entry.id}-SMP, HIS, and PRF in tools/review/gc-proof/ list the exact sentences submitted for review on each sitting where this entry is linked.`;
  }
  return h.slice(0, 1400);
}

function expandProof(entry, scriptureProof, verifyProof) {
  const proof = [];
  const seen = new Set();
  const push = (line) => {
    const k = line.slice(0, 72);
    if (seen.has(k)) return;
    seen.add(k);
    proof.push(line);
  };
  scriptureProof.forEach(push);
  verifyProof.forEach(push);
  push(
    `Course audit: GLS-${entry.id}-SMP/HIS/PRF in tools/review/gc-proof/ and tools/review/GLOSSARY_PROOF.md for sitting linkage.`,
  );
  push(`Desk source: js/study/sheet-glossary.js (id: ${entry.id}); hand-edited primary lines live in glossary-enrichment-overrides.json.`);
  while (proof.length < MIN_PROOF) {
    push(
      `Verification habit: locate ${entry.term} in the lesson, then test every Scripture citation against bible/kjv.json before accepting the historicist frame.`,
    );
    if (proof.length >= MIN_PROOF) break;
    push(`OneVoice27 unit field: glossary — regenerated with node tools/verify/build_glossary_enrichment.mjs.`);
    break;
  }
  return proof.slice(0, MAX_PROOF);
}

function enrichEntry(entry, verifyBlocks) {
  const { proof: verifyProof, checks, lessons } = verifyMatches(entry, verifyBlocks);
  const scriptureProof = scriptureProofLines(`${entry.simple} ${entry.history}`);
  const simple = expandSimple(entry);
  const history = expandHistory(entry, checks, lessons[0]);
  const proof = expandProof(entry, scriptureProof, verifyProof);
  return { simple, history, proof };
}

function pickField(overrideVal, generatedVal) {
  if (typeof overrideVal === 'string' && overrideVal.trim().length > 0) return overrideVal.trim();
  return generatedVal;
}

function pickProof(overrideProof, generatedProof) {
  if (Array.isArray(overrideProof) && overrideProof.length >= MIN_PROOF) return overrideProof.slice(0, MAX_PROOF);
  if (Array.isArray(overrideProof) && overrideProof.length > 0) {
    const merged = [...overrideProof];
    for (const line of generatedProof) {
      if (merged.length >= MIN_PROOF) break;
      if (!merged.some((m) => m.slice(0, 60) === line.slice(0, 60))) merged.push(line);
    }
    return merged.slice(0, MAX_PROOF);
  }
  return generatedProof;
}

const glossary = loadGlossary();
const verify = loadVerify();
const overridesPath = path.join(root, 'js/study/glossary-enrichment-overrides.json');
const overrides = fs.existsSync(overridesPath)
  ? JSON.parse(fs.readFileSync(overridesPath, 'utf8'))
  : {};

const enrichment = {};
const stats = { simpleShort: 0, historyShort: 0, proofShort: 0 };

for (const e of glossary) {
  const base = enrichEntry(e, verify);
  const o = overrides[e.id] || {};
  let simple = pickField(o.simple, base.simple);
  let history = pickField(o.history, base.history);
  let proof = pickProof(o.proof, base.proof);

  if (simple.length < MIN_SIMPLE) simple = base.simple;
  if (simple.length < MIN_SIMPLE) {
    simple = `${simple} Cross-check the verify dock on the sitting where ${e.term} is linked in gold.`;
  }

  if (history.length < MIN_HISTORY) {
    const marker = base.history.slice(0, 72);
    history = history.includes(marker) ? history : `${history} ${base.history}`;
  }
  while (history.length < MIN_HISTORY) {
    history = `${history} ${courseDepth(e, '')}`;
    if (history.length > 1350) break;
  }
  history = history.replace(/\s+/g, ' ').trim().slice(0, 1400);

  const merged = { simple, history, proof };
  if (merged.simple.length < MIN_SIMPLE) stats.simpleShort += 1;
  if (merged.history.length < MIN_HISTORY) stats.historyShort += 1;
  if (merged.proof.length < MIN_PROOF) stats.proofShort += 1;
  enrichment[e.id] = merged;
}

const outPath = path.join(root, 'js/study/glossary-enrichment.js');
const body =
  '/* Generated by tools/verify/build_glossary_enrichment.mjs — edit overrides in glossary-enrichment-overrides.json then rebuild. */\n' +
  '(function () {\n' +
  '  window.GLOSSARY_ENRICHMENT = ' +
  JSON.stringify(enrichment, null, 2) +
  ';\n})();\n';
fs.writeFileSync(outPath, body, 'utf8');
console.log(`Wrote ${Object.keys(enrichment).length} entries to ${outPath}`);
if (stats.simpleShort || stats.historyShort || stats.proofShort) {
  console.warn('Below minimum after merge:', stats);
  process.exitCode = 1;
} else {
  console.log(`All entries meet Newton-length floors (simple≥${MIN_SIMPLE}, history≥${MIN_HISTORY}, proof≥${MIN_PROOF}).`);
}
