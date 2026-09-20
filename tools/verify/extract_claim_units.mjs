import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Load sheetsData
const sheetsSrc = fs.readFileSync(path.join(root, 'js/study/sheets-data.js'), 'utf8');
const sittingPart = sheetsSrc.slice(sheetsSrc.indexOf('const sheetsData'), sheetsSrc.indexOf('const timelineEpochs'));
const sCtx = {};
vm.createContext(sCtx);
vm.runInContext(sittingPart + '\nthis.sheetsData = sheetsData;', sCtx);
const sheetsData = sCtx.sheetsData;

// 2. Load SHEET_VERIFY
const verifySrc = fs.readFileSync(path.join(root, 'js/study/sheet-verify.js'), 'utf8');
const vCtx = { window: {} };
vm.createContext(vCtx);
vm.runInContext(verifySrc, vCtx);
const sheetVerify = vCtx.window.SHEET_VERIFY || [];

// 3. Load SHEET_GLOSSARY
const glossSrc = fs.readFileSync(path.join(root, 'js/study/sheet-glossary.js'), 'utf8');
const gCtx = { window: {} };
vm.createContext(gCtx);
vm.runInContext(glossSrc, gCtx);
const sheetGlossary = gCtx.window.SHEET_GLOSSARY || [];

// Glossary linking helper
function namesOf(item) {
  const names = [item.term].concat(item.aliases || []);
  const out = [];
  const seen = {};
  names.forEach((n) => {
    if (!n) return;
    const key = String(n).toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(String(n));
  });
  return out.sort((a, b) => b.length - a.length);
}

function wordBoundaryOk(text, start, end, needle) {
  if (/[^A-Za-z]/.test(needle.charAt(0)) || /[^A-Za-z0-9]/.test(needle.charAt(needle.length - 1))) return true;
  const before = start === 0 ? '' : text.charAt(start - 1);
  const after = end >= text.length ? '' : text.charAt(end);
  const edge = /[A-Za-z0-9]/;
  return !edge.test(before) && !edge.test(after);
}

function findMatch(text, needle) {
  const hay = text.toLowerCase();
  const find = needle.toLowerCase();
  let from = 0;
  while (from <= hay.length - find.length) {
    const at = hay.indexOf(find, from);
    if (at < 0) return -1;
    if (wordBoundaryOk(text, at, at + needle.length, needle)) return at;
    from = at + 1;
  }
  return -1;
}

function getLinkedGlossary(content) {
  const linked = new Set();
  const dtMatches = content.matchAll(/data-term=["']([^"']+)["']/g);
  for (const m of dtMatches) linked.add(m[1]);
  sheetGlossary.forEach((item) => {
    const names = namesOf(item);
    for (const name of names) {
      if (name.length < 4 && item.kind !== 'word') continue;
      if (findMatch(content, name) >= 0) {
        linked.add(item.id);
        break;
      }
    }
  });
  return Array.from(linked).sort();
}

// 4. Load workbench.js and validate synchronization
const wbSrc = fs.readFileSync(path.join(root, 'js/study/workbench.js'), 'utf8');
const normWb = wbSrc.replace(/\s+/g, ' ');

function assertInWorkbench(phrase, label) {
  const normWb = wbSrc
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ');
  const parts = phrase
    .split(/[:\->—–]/)
    .map((p) => p.replace(/<[^>]+>/g, ' ').replace(/[\u2018\u2019']/g, "'").replace(/[\u201C\u201D"]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 5);
  for (const part of parts) {
    const sample = part.slice(0, Math.min(part.length, 40));
    if (!normWb.includes(sample)) {
      throw new Error(`Workbench synchronization error for ${label}: "${sample}" not found in js/study/workbench.js`);
    }
  }
}

// Workbench claim unit definitions for sittings 0, 1, 2
const WORKBENCH_DATA = {
  0: {
    intro: "Before taking the checkpoint quiz, verify the day-for-year precedent in Scripture (precedent, not universal rule) and correctly classify the three schools of apocalyptic interpretation.",
    task1Prompt: "Identify the two Old Testament verses that explicitly formulate the prophetic scale, and enter the exact formulaic biblical phrase: Numbers 14:34 and Ezekiel 4:6 'each day for a year'.",
    task2Prompt: "Assign each historical interpretation to its proper school: Historicism, Preterism, or Futurism.",
    items: [
      "The 70th week of Daniel 9 is severed from the first 69 weeks by a 2,000-year parenthetical gap.",
      "The little horn is Antiochus IV Epiphanes, exhausting all prophetic specifications in the 2nd century B.C.",
      "Prophecy is an unbroken, continuous chain of historical fulfillment from 605 B.C. through divided Europe to the Second Advent.",
      "All apocalyptic prophecies were completed by the destruction of Jerusalem in A.D. 70 and the fall of pagan Rome.",
      "The Antichrist is a single future individual reigning for 3.5 literal years in a rebuilt temple in Jerusalem.",
      "The number 1,260 years is built from Daniel's 'time, times, and half a time' through day-year and calendar conventions — four interpretive layers, not a number Daniel prints outright."
    ]
  },
  1: {
    intro: "Verify Daniel's exilic loyalty test: match the theophoric renamings, enforce the line between civic skill and covenant defilement, and verify the Hebrew diet term.",
    task1Prompt: "Match each Hebrew covenant name with its Babylonian replacement and the pagan deity Ashpenaz sought to honor.",
    names: [
      "Daniel (“God is my Judge”) -> Belteshazzar (Honors Bel / Marduk)",
      "Hananiah (“Yahweh is gracious”) -> Shadrach (Honors Aku / Moon god)",
      "Mishael (“Who is like God?”) -> Meshach (Honors Aku / “Who is what Aku is?” — traditional reading)",
      "Azariah (“Yahweh has helped”) -> Abednego (Honors Nabu / Nebo)"
    ],
    task2Prompt: "Distinguish permissible civic education from impermissible covenant defilement:",
    civic: [
      "Mastering Akkadian cuneiform literature, mathematics, and court administrative law (Permissible Civic Skill).",
      "Consuming royal meats that, by historical reconstruction, were first presented to pagan deities and included unclean foods under Leviticus 11 (Covenant Defilement).",
      "Serving diligently as counselors and state administrators in the government of Babylon (Permissible Civic Skill).",
      "Drinking royal palace wine tied to pagan court liturgy (historical reconstruction from ancient Near Eastern royal custom) (Covenant Defilement)."
    ],
    dietTerm: "Transliterated Hebrew term for the plant/pulse diet requested by Daniel (Dan 1:12): zeroim (זֵרֹעִים)."
  },
  2: {
    intro: "Verify the contiguous metal succession of Daniel 2 and establish the definitive textual refutation against modern claims to restart the Head of Gold.",
    task1Prompt: "Assign the 6 stages of the colossus in strict contiguous descending sequence:",
    stages: [
      "Stage 1 (Head): Gold — Babylon (605–539 B.C.)",
      "Stage 2 (Chest & Arms): Silver — Medo-Persia (539–331 B.C.)",
      "Stage 3 (Belly & Thighs): Bronze — Greece (331–168 B.C.)",
      "Stage 4 (Legs): Iron — Imperial Rome (168 B.C.–476 A.D.)",
      "Stage 5 (Feet & Toes): Iron & Clay — Divided Europe (476 A.D.–Present)",
      "Stage 6 (Striking Climax): Stone — Supernatural Kingdom of God"
    ],
    task2Prompt: "Which specific biblical verse anchors the Head of Gold to a single non-repeatable historical kingdom, and why does that refute modern claims that a 21st-century nation is a 'new Head of Gold'?",
    principle: "Load-bearing anchor: Daniel 2:38 (“Thou art this head of gold”). Core principle: Contiguous descent — metals never reset or cycle; we reside in the feet of iron/clay awaiting the stone."
  }
};

// Validate all workbench definitions are synchronized with js/study/workbench.js
for (const [sId, wb] of Object.entries(WORKBENCH_DATA)) {
  assertInWorkbench(wb.intro, `S${sId} intro`);
  if (wb.items) wb.items.forEach((it, idx) => assertInWorkbench(it, `S${sId} item ${idx}`));
  if (wb.civic) wb.civic.forEach((c, idx) => assertInWorkbench(c, `S${sId} civic ${idx}`));
  if (wb.stages) wb.stages.forEach((st, idx) => assertInWorkbench(st, `S${sId} stage ${idx}`));
}

export function extractAllUnits() {
  const allUnits = [];
  const sheetHashes = {};
  const sheetUnitCounts = {};

  sheetsData.forEach((sheet, sIdx) => {
    const pad = String(sIdx).padStart(2, '0');
    const sheetUnits = [];

    // Helper to add unit
    function addUnit(id, field, text) {
      const cleaned = cleanText(text);
      if (!cleaned) return;
      sheetUnits.push({
        id,
        sheet: sIdx,
        field,
        text: cleaned,
        hash: sha256(cleaned).slice(0, 16)
      });
    }

    // A. Parse content HTML
    let html = sheet.content;

    // 1. Extract and remove TOC
    const tocMatch = html.match(/<nav\b[^>]*class=["'][^"']*lesson-toc[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i);
    if (tocMatch) {
      addUnit(`S${pad}-TOC`, 'content', tocMatch[0]);
      html = html.replace(tocMatch[0], '');
    }

    // 2. Extract and remove Next Sitting Card
    const nextMatch = html.match(/<div\b[^>]*class=["'][^"']*next-sitting-card[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (nextMatch) {
      addUnit(`S${pad}-NEXT`, 'content', nextMatch[0]);
      html = html.replace(nextMatch[0], '');
    }

    // 3. Walk through all other elements in order: h3, h4, p, blockquote, li, pre
    const tagRegex = /<(h3|h4|p|blockquote|li|pre)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let m;
    let hCount = 0;
    let pCount = 0;
    let bqCount = 0;
    let liCount = 0;
    let diaCount = 0;

    while ((m = tagRegex.exec(html)) !== null) {
      const tag = m[1].toLowerCase();
      const attrs = m[2];
      const inner = m[3];
      const text = cleanText(inner);
      if (!text) continue;

      const isHeader = tag === 'h3' || tag === 'h4' || /kicker|subtitle|header/i.test(attrs);

      if (isHeader) {
        hCount++;
        addUnit(`S${pad}-H-${String(hCount).padStart(2, '0')}`, 'content', text);
      } else if (tag === 'blockquote') {
        bqCount++;
        addUnit(`S${pad}-BQ-${String(bqCount).padStart(2, '0')}`, 'content', text);
      } else if (tag === 'pre') {
        diaCount++;
        addUnit(`S${pad}-DIA-${String(diaCount).padStart(2, '0')}`, 'content', text);
      } else if (tag === 'li') {
        liCount++;
        addUnit(`S${pad}-LI-${String(liCount).padStart(2, '0')}`, 'content', text);
      } else {
        pCount++;
        addUnit(`S${pad}-P-${String(pCount).padStart(2, '0')}`, 'content', text);
      }
    }

    // B. Christology
    if (sheet.christology) {
      addUnit(`S${pad}-CHR-TITLE`, 'christology', `${sheet.christology.kicker || 'Christology'}: ${sheet.christology.title || ''}`);
      if (sheet.christology.scripture) {
        addUnit(`S${pad}-CHR-SCRIPTURE`, 'christology', sheet.christology.scripture);
      }
      (sheet.christology.body || []).forEach((p, idx) => {
        addUnit(`S${pad}-CHR-P${idx + 1}`, 'christology', p);
      });
    }

    // C. Quizzes (5 quizzes)
    (sheet.quizzes || []).forEach((q, qIdx) => {
      addUnit(`S${pad}-Q${qIdx}-STEM`, 'quizzes', q.question);
      (q.options || []).forEach((opt, optIdx) => {
        addUnit(`S${pad}-Q${qIdx}-OPT${optIdx}`, 'quizzes', opt);
      });
      addUnit(`S${pad}-Q${qIdx}-EXP`, 'quizzes', q.explanation);
      (q.diagnostics || []).forEach((dia, diaIdx) => {
        addUnit(`S${pad}-Q${qIdx}-DIA${diaIdx}`, 'quizzes', dia);
      });
    });

    // D. Study Guide
    if (sheet.studyGuide) {
      (sheet.studyGuide.trace || []).forEach((tr, trIdx) => {
        addUnit(`S${pad}-SG-TR${trIdx}-DO`, 'studyGuide', tr.do);
        addUnit(`S${pad}-SG-TR${trIdx}-WHY`, 'studyGuide', tr.why);
      });
      ['christ', 'now', 'help', 'value'].forEach((k) => {
        if (sheet.studyGuide[k]) {
          addUnit(`S${pad}-SG-${k.toUpperCase()}-CLM`, 'studyGuide', sheet.studyGuide[k].claim);
          addUnit(`S${pad}-SG-${k.toUpperCase()}-WHY`, 'studyGuide', sheet.studyGuide[k].why);
        }
      });
      (sheet.studyGuide.ask || []).forEach((ask, askIdx) => {
        addUnit(`S${pad}-SG-ASK-${askIdx + 1}`, 'studyGuide', ask);
      });
    }

    // E. Guide
    if (sheet.guide) {
      if (sheet.guide.intro) {
        addUnit(`S${pad}-GD-INTRO-EXP`, 'guide', sheet.guide.intro.expect);
        (sheet.guide.intro.do || []).forEach((d, dIdx) => {
          addUnit(`S${pad}-GD-INTRO-DO-${dIdx + 1}`, 'guide', d);
        });
      }
      if (sheet.guide.end) {
        addUnit(`S${pad}-GD-END-WHY`, 'guide', sheet.guide.end.nextWhy);
      }
    }

    // F. Verify Cards (SHEET_VERIFY[sIdx])
    const vEntry = sheetVerify[sIdx];
    if (vEntry) {
      if (vEntry.claim) {
        addUnit(`S${pad}-VRF-CLAIM`, 'verify', vEntry.claim);
      }
      (vEntry.items || []).forEach((it, itIdx) => {
        addUnit(`S${pad}-VRF-${itIdx}-LESSON`, 'verify', it.lesson);
        addUnit(`S${pad}-VRF-${itIdx}-QUOTE`, 'verify', `${it.source}: ${it.quote}`);
        addUnit(`S${pad}-VRF-${itIdx}-CHECK`, 'verify', it.check);
      });
    }

    // G. Workbench (sittings 0, 1, 2)
    const wb = WORKBENCH_DATA[sIdx];
    if (wb) {
      addUnit(`S${pad}-WB-INTRO`, 'workbench', wb.intro);
      addUnit(`S${pad}-WB-T1-PROMPT`, 'workbench', wb.task1Prompt);
      if (wb.items) {
        addUnit(`S${pad}-WB-T2-PROMPT`, 'workbench', wb.task2Prompt);
        wb.items.forEach((item, itIdx) => {
          addUnit(`S${pad}-WB-T2-M${itIdx}`, 'workbench', item);
        });
      }
      if (wb.names) {
        wb.names.forEach((name, nIdx) => {
          addUnit(`S${pad}-WB-T1-N${nIdx}`, 'workbench', name);
        });
        addUnit(`S${pad}-WB-T2-PROMPT`, 'workbench', wb.task2Prompt);
        (wb.civic || []).forEach((civ, cIdx) => {
          addUnit(`S${pad}-WB-T2-C${cIdx}`, 'workbench', civ);
        });
        addUnit(`S${pad}-WB-T2-TERM`, 'workbench', wb.dietTerm);
      }
      if (wb.stages) {
        wb.stages.forEach((stg, stgIdx) => {
          addUnit(`S${pad}-WB-T1-STG${stgIdx}`, 'workbench', stg);
        });
        addUnit(`S${pad}-WB-T2-PROMPT`, 'workbench', wb.task2Prompt);
        addUnit(`S${pad}-WB-T2-PRINCIPLE`, 'workbench', wb.principle);
      }
    }

    // H. Linked Glossary Entries
    const linkedIds = getLinkedGlossary(sheet.content);
    linkedIds.forEach((gId) => {
      const gItem = sheetGlossary.find((x) => x.id === gId);
      if (gItem) {
        addUnit(`S${pad}-GLS-${gId}-SMP`, 'glossary', `${gItem.term}: ${gItem.simple}`);
        addUnit(`S${pad}-GLS-${gId}-HIS`, 'glossary', gItem.history);
      }
    });

    // Content Hash for Sheet
    // Combines text of all extracted units for this sheet into a stable SHA-256
    const combinedContent = sheetUnits.map((u) => `${u.id}|${u.text}`).join('\n');
    const sheetHash = sha256(combinedContent).slice(0, 16);
    sheetHashes[sIdx] = sheetHash;
    sheetUnitCounts[sIdx] = sheetUnits.length;

    allUnits.push(...sheetUnits);
  });

  return { sheetHashes, sheetUnitCounts, units: allUnits };
}

// If run directly:
if (process.argv[1] && process.argv[1].endsWith('extract_claim_units.mjs')) {
  const data = extractAllUnits();
  const outDir = path.join(root, 'tools/review/onevoice27');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'units.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log(`Successfully extracted ${data.units.length} total units across 11 sittings.`);
  for (let i = 0; i <= 10; i++) {
    console.log(`Sheet ${i}: hash=${data.sheetHashes[i]}, count=${data.sheetUnitCounts[i]}`);
  }
}
