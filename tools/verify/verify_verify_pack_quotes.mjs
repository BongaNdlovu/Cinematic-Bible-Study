/*
 * Checks every scripture quotation in the study reference packs against the
 * local KJV corpus. A quotation that is not in the text is a defect whether or
 * not anyone notices it, so this is mechanical: fold punctuation, then look for
 * each ellipsis-separated fragment of four words or more in the KJV.
 *
 * Run: node tools/verify/verify_verify_pack_quotes.mjs
 */
import fs from 'fs';
import vm from 'vm';

function loose(s) {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const kjv = JSON.parse(fs.readFileSync('bible/kjv.json', 'utf8'));
const hay = [];
for (const chapters of Object.values(kjv.books)) {
  for (const verses of Object.values(chapters)) {
    for (const text of Object.values(verses)) hay.push(loose(text));
  }
}
const corpus = hay.join(' ');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/study/sheet-verify.js', 'utf8'), ctx);
const packs = ctx.window.SHEET_VERIFY || [];

let checked = 0;
const missing = [];
packs.forEach((pack, sIdx) => {
  (pack.items || []).forEach((item, iIdx) => {
    if (item.kind !== 'scripture') return;
    const book = String(item.source).split(/\s+\d/)[0];
    const inCorpus = Object.prototype.hasOwnProperty.call(kjv.books, book.replace(/^\d\s+/, ''));
    String(item.quote).split(/\u2026|\.\.\./).forEach((fragment) => {
      const words = loose(fragment).split(' ').filter(Boolean);
      if (words.length < 4) return;
      checked++;
      if (!corpus.includes(words.join(' '))) {
        missing.push({
          sitting: sIdx,
          item: iIdx,
          source: item.source,
          bookInLocalKjv: inCorpus,
          fragment: fragment.trim().slice(0, 150),
        });
      }
    });
  });
});

console.log(`quotation fragments checked: ${checked}`);
if (!missing.length) {
  console.log('all fragments found in bible/kjv.json');
} else {
  console.log(`NOT FOUND: ${missing.length}`);
  missing.forEach((m) => {
    console.log(`  sitting ${m.sitting} item ${m.item} [${m.source}] localKjv=${m.bookInLocalKjv}`);
    console.log(`    "${m.fragment}"`);
  });
}
process.exit(missing.length ? 1 : 0);
