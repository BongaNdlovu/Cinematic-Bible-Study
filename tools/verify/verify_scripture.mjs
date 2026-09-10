import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

const kjv = readJson('bible/kjv.json');
const strongs = readJson('bible/strongs-daniel.json');
const sheets = readJson('bible/sheet-passages.json');

const expected = { 1: 21, 2: 49, 3: 30, 4: 37, 5: 31, 6: 28, 7: 28, 8: 27, 9: 27, 10: 21, 11: 45, 12: 13 };
for (const [ch, count] of Object.entries(expected)) {
  const verses = Object.keys(kjv.books.Daniel[ch] || {});
  if (verses.length !== count) fail('Daniel ' + ch + ' has ' + verses.length + ' verses, expected ' + count);
}

if (!kjv.books.Daniel['2']['38'].includes('head of gold')) fail('Daniel 2:38 must include head of gold');
if (!kjv.books.Daniel['7']['25'].includes('time and times')) fail('Daniel 7:25 must include time and times');
if (!kjv.books.Daniel['8']['14'].includes('two thousand and three hundred')) fail('Daniel 8:14 must include 2300');
if (!kjv.books.Daniel['9']['26'].includes('cut off')) fail('Daniel 9:26 must include cut off');
if (!kjv.books.Numbers['14']['34'].includes('each day for a year')) fail('Numbers 14:34 missing year-day line');
if (!kjv.books.Ezekiel['4']['6'].includes('each day for a year')) fail('Ezekiel 4:6 missing year-day line');
if (!kjv.books.Ezra['7']['7'] || !kjv.books.Leviticus['16']['30'] || !kjv.books.Revelation['13']['15']) {
  fail('Companion excerpts for Ezra 7, Leviticus 16, or Revelation 13 are missing');
}

for (let i = 0; i <= 10; i += 1) {
  if (!sheets[String(i)]) fail('sheet-passages missing sheet ' + i);
}

const sheet0 = sheets['0'];
if (!sheet0.sections || sheet0.sections.length !== 1) fail('Sheet 0 must show one chapter, not companion books as sections');
if (sheet0.sections[0].book !== 'Daniel' || Number(sheet0.sections[0].chapter) !== 1 || sheet0.sections[0].verses !== 'all') {
  fail('Sheet 0 must show all of Daniel 1');
}

function hasBearing(sheet, book, chapter, verse) {
  return (sheets[String(sheet)].loadBearing || []).some((row) => (
    row.book === book && Number(row.chapter) === Number(chapter) && Number(row.verse) === Number(verse)
  ));
}

if (!hasBearing(0, 'Numbers', 14, 34) || !hasBearing(0, 'Ezekiel', 4, 6)) {
  fail('Sheet 0 dock must carry the year-day verses');
}
if (!hasBearing(2, 'Daniel', 2, 38) || !hasBearing(2, 'Daniel', 2, 44)) {
  fail('Sheet 2 dock must list 2:38 and 2:44');
}
if (!hasBearing(9, 'Ezra', 7, 7) || !hasBearing(9, 'Daniel', 9, 24)) {
  fail('Sheet 9 dock must join Ezra 7 to Daniel 9:24');
}

if (!strongs.H69 || !strongs.H1722 || !strongs.H7162 || !strongs.H2852 || !strongs.H6663) {
  fail('Strong’s subset is missing load-bearing lemmas');
}

['H1722', 'H2852', 'H6663', 'H7162'].forEach((id) => {
  const entry = strongs[id];
  if (!entry.derivation || !entry.gloss || !entry.why) fail(id + ' must teach derivation, gloss, and argument');
  if (!entry.danielHits || !entry.danielHits.length) fail(id + ' must list Daniel hits');
  if (!entry.otherKjv || entry.otherKjv.length < 2) fail(id + ' must show at least two other KJV uses');
  if (String(entry.why).length < 80) fail(id + ' why is too thin to teach');
});
if (/thou art this head of gold/i.test(strongs.H1722.why) && strongs.H1722.why.length < 160) {
  fail('H1722 why must argue, not only restate 2:38');
}

const sandbox = {
  window: {},
  localStorage: { getItem() { return null; }, setItem() {} }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/study/scripture.js'), 'utf8'), sandbox);
const api = sandbox.window.BAScripture;
if (!api) fail('BAScripture did not attach');

const set = api.verseSet([[31, 45], 28]);
if (!set[28] || !set[38] || !set[44] || set[30]) fail('verseSet did not expand the image range');

function highlighted(sheet, book, chapter, verse) {
  const passage = sheets[String(sheet)];
  return (passage.sections || []).some((section) => {
    if (section.book !== book || Number(section.chapter) !== Number(chapter)) return false;
    return !!api.verseSet(section.highlights)[Number(verse)];
  });
}

if (!highlighted(0, 'Daniel', 1, 1) || !highlighted(0, 'Daniel', 1, 2)) fail('Sheet 0 must highlight Daniel 1:1-2');
if (highlighted(0, 'Numbers', 14, 34)) fail('Year-day verses belong in the dock, not as sheet 0 highlights');
if (!highlighted(2, 'Daniel', 2, 38) || !highlighted(2, 'Daniel', 2, 44)) fail('Sheet 2 must highlight 2:38 and 2:44');
if (!highlighted(5, 'Daniel', 5, 25) || !highlighted(7, 'Daniel', 7, 25)) fail('Sheets 5 and 7 must highlight their load-bearing verses');
if (highlighted(2, 'Daniel', 2, 1)) fail('Daniel 2:1 is setup, not a highlight');

if (api.findPhrase("Thou art this head of gold.", "head of gold") < 0) fail('findPhrase missed head of gold');
if (api.findPhrase("the king\u2019s matter", "the king's matter") < 0) fail('findPhrase must treat curly apostrophes as straight');

const html = fs.readFileSync(path.join(root, 'study.html'), 'utf8');
const studyApp = fs.readFileSync(path.join(root, 'js/study/study-app.js'), 'utf8');
const sheetsSrc = fs.readFileSync(path.join(root, 'js/study/sheets-data.js'), 'utf8');
const studySources = html + studyApp + sheetsSrc;
if (!html.includes('data-instrument="scripture"')) fail('study.html is missing the Scripture instrument tab');
if (!html.includes('js/study/scripture.js')) fail('study.html does not load js/study/scripture.js');
if (!html.includes('js/study/sheets-data.js') || !html.includes('js/study/study-app.js')) {
  fail('study.html does not load extracted study scripts');
}
if (!studyApp.includes('BAScripture.showSheet')) fail('loadSheet does not ask Scripture to follow the sheet');
if (studySources.includes('para-hitch')) fail('sitting copy still has paragraph hitches');
if (!html.includes('load-bearing')) fail('study.html is missing load-bearing styles');
if (!html.includes('id="sheet-study-path"') || !studyApp.includes('renderStudyGuide')) {
  fail('study.html is missing the how-to-study path');
}
if (!html.includes('study-why') || !studyApp.includes('renderTrace') || !studyApp.includes('renderClaim')) {
  fail('study.html is missing how-to-study explainers');
}

const sitting = sheetsSrc.slice(sheetsSrc.indexOf('const sheetsData'), sheetsSrc.indexOf('const timelineEpochs'));
const guideCtx = {};
vm.createContext(guideCtx);
vm.runInContext(sitting + '\nthis.guides = sheetsData.map((sheet) => sheet.studyGuide);\nthis.sittingGuides = sheetsData.map((sheet) => sheet.guide);', guideCtx);
const parsedGuides = guideCtx.guides || [];
const sittingGuides = guideCtx.sittingGuides || [];
if (parsedGuides.length !== 11) fail('expected 11 studyGuide blocks, found ' + parsedGuides.length);
if (sittingGuides.length !== 11) fail('expected 11 sitting guide blocks, found ' + sittingGuides.length);

parsedGuides.forEach((guide, index) => {
  if (!guide || !Array.isArray(guide.trace) || guide.trace.length !== 4) {
    fail('sheet ' + index + ' must have four trace steps');
  }
  guide.trace.forEach((step, stepIndex) => {
    if (!step || typeof step !== 'object' || !step.do || !step.why) {
      fail('sheet ' + index + ' trace ' + stepIndex + ' must be {do, why}');
    }
    if (String(step.why).length < 220) fail('sheet ' + index + ' trace ' + stepIndex + ' why is too thin to teach');
  });
  ['christ', 'now', 'help', 'value'].forEach((key) => {
    const field = guide[key];
    if (!field || typeof field !== 'object' || !field.claim || !field.why) {
      fail('sheet ' + index + ' ' + key + ' must be {claim, why}');
    }
    if (String(field.why).length < 220) fail('sheet ' + index + ' ' + key + ' why is too thin to teach');
  });
  if (!guide.ask || guide.ask.length < 3) fail('sheet ' + index + ' is missing questions to sit with');
});

const sheet0Why = parsedGuides[0].trace.map((step) => step.why).join('\n') + '\n' + parsedGuides[0].christ.why;
if (!/Lord/.test(sheet0Why)) fail('sheet 0 why must name the Lord who gave the king');
if (!/day-for-year/i.test(sheet0Why)) fail('sheet 0 why must teach day-for-year');
if (!/Historicism/.test(sheet0Why)) fail('sheet 0 why must name Historicism');
if (!/2,300/.test(sheet0Why)) fail('sheet 0 why must land the 2,300');
if (!/Belteshazzar/.test(parsedGuides[1].value.why) || !/first commandment/.test(parsedGuides[1].value.why)) {
  fail('sheet 1 value why must unpack renaming and the first commandment');
}

sittingGuides.forEach((guide, index) => {
  if (!guide || !guide.intro || !guide.end) fail('sheet ' + index + ' is missing guide.intro or guide.end');
  if (!guide.intro.title || !guide.intro.expect || !Array.isArray(guide.intro.do) || guide.intro.do.length < 3) {
    fail('sheet ' + index + ' intro must name the sitting and list at least three beats');
  }
  if (!guide.end.title || !guide.end.nextWhy || !guide.end.spotlight) {
    fail('sheet ' + index + ' end must say where to go next and name a spotlight control');
  }
});
if (sittingGuides[2].end.spotlight !== 'access-open-btn') fail('sheet 2 end must spotlight the access preview control');
if (sittingGuides[10].end.spotlight !== 'next-sheet-btn') fail('sheet 10 end must spotlight the complete control, not a missing sheet');
if (/sheet 11/i.test(sittingGuides[10].end.nextWhy) && !/no sheet 11/i.test(sittingGuides[10].end.nextWhy)) {
  fail('sheet 10 must not invent a twelfth sitting');
}

if (!html.includes('id="sitting-guide"') || !html.includes('id="access-panel"') || !html.includes('id="access-open-btn"')) {
  fail('study.html is missing guided sitting or access markup');
}
if (!html.includes('#next-sheet-btn[hidden]') || !html.includes('guide-spot-pulse')) {
  fail('study.html is missing gated-button hide or spotlight motion styles');
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (/Bible Artifacts/i.test(home)) fail('homepage still brands Bible Artifacts');
if (/SDA Historicist Verified/i.test(home)) fail('homepage still carries a denominational verification badge');
if (!/Begin the sitting|hero-primary/.test(home)) fail('homepage is missing the sitting CTA');
if (!/The Scroll of Daniel/.test(home)) fail('homepage must be titled as The Scroll of Daniel');
if (!/full-scroll/.test(home)) fail('homepage is missing the full-scroll offer');

const journey = fs.readFileSync(path.join(root, 'js/shared/journey.js'), 'utf8');
if (!journey.includes('canAccessSheet') || !journey.includes('FREE_THROUGH')) {
  fail('journey.js is missing the free-sheet access policy');
}
if (!journey.includes('resumeLabel') || !journey.includes('seenIntro')) {
  fail('journey.js is missing resume or intro-seen helpers');
}

const brand = studySources.match(/Adventist|Ellen G\.|Uriah Smith|Investigative Judgment|Great Controversy|Early Writings|The Sanctified Life/i);
if (brand) fail('study sources still carry a forbidden label: ' + brand[0]);

console.log('PASS: KJV Daniel, load-bearing dock, Strong’s teaching entries, and destigmatized sitting hold.');
