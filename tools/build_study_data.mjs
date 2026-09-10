import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('study.html', 'utf8');
const start = html.indexOf('const sheetsData = [');
const end = html.indexOf('const timelineEpochs = [');
if (start === -1 || end === -1) {
  console.error('Could not locate sheetsData markers in study.html');
  process.exit(1);
}

const slice = html.slice(start, end);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(slice.replace('const sheetsData', 'this.sheetsData'), ctx);

if (!ctx.sheetsData || ctx.sheetsData.length !== 11) {
  console.error('Expected 11 sheets, found ' + (ctx.sheetsData ? ctx.sheetsData.length : 0));
  process.exit(1);
}

const sectionMeta = [
  { id: 'intro', number: null, label: 'Prologue', icon: 'book', galleryId: 'assembled', kicker: 'The Battle of Hermeneutics' },
  { id: 'exile', number: 1, label: 'Daniel 1', icon: 'openbook', galleryId: 'assembled', kicker: 'Daniel 1 · 605 B.C.' },
  { id: 'dream', number: 2, label: 'Daniel 2', icon: 'crown', galleryId: 'head', kicker: 'Daniel 2 · 603 B.C.' },
  { id: 'dura', number: 3, label: 'Daniel 3', icon: 'flame', galleryId: 'dura', kicker: 'Daniel 3 · c. 594 B.C.' },
  { id: 'tree', number: 4, label: 'Daniel 4', icon: 'pillars', galleryId: 'stump', kicker: 'Daniel 4 · c. 570 B.C.' },
  { id: 'feast', number: 5, label: 'Daniel 5', icon: 'scroll', galleryId: 'assembled', kicker: 'Daniel 5 · 539 B.C.' },
  { id: 'lions', number: 6, label: 'Daniel 6', icon: 'openbook', galleryId: 'assembled', kicker: 'Daniel 6 · 539 B.C.' },
  { id: 'beasts', number: 7, label: 'Daniel 7', icon: 'horn', galleryId: 'beast', kicker: 'Daniel 7 · 553 B.C.' },
  { id: 'ram_goat', number: 8, label: 'Daniel 8', icon: 'horn', galleryId: 'ram', kicker: 'Daniel 8 · 551 B.C.' },
  { id: 'weeks', number: 9, label: 'Daniel 9', icon: 'calendar', galleryId: 'stone', kicker: 'Daniel 9 · 538 B.C.' },
  { id: 'michael', number: 10, label: 'Daniel 10–12', icon: 'sun', galleryId: 'michael', kicker: 'Daniel 10–12 · 536 B.C.' }
];

const scrollSections = ctx.sheetsData.map((sheet, idx) => {
  const meta = sectionMeta[idx];
  return {
    id: meta.id,
    sheetIndex: idx,
    number: meta.number,
    label: meta.label,
    icon: meta.icon,
    kicker: meta.kicker,
    title: sheet.title,
    subtitle: sheet.subtitle,
    galleryId: meta.galleryId,
    body: sheet.content,
    quizzes: sheet.quizzes,
    studyGuide: sheet.studyGuide,
    guide: sheet.guide
  };
});

const fileHeader = `/**
 * study-data.js
 * Daniel Historicist Prophetic Masterclass - Complete Curriculum Data Engine
 * Covers all 11 Units (Sheets 0 through 10) with deep exegesis, applied scenario quizzes,
 * 4-element diagnostic misconception feedback, and primary source historical dossiers.
 */

var LEGACY_ID_MAP = {
  assembled: "intro",
  head: "dream",
  chest: "dream",
  thighs: "dream",
  legs: "dream",
  feet: "dream",
  stone: "weeks",
  lion: "beasts",
  bear: "beasts",
  leopard: "beasts",
  beast: "beasts",
  ram: "ram_goat",
  goat: "ram_goat",
  goat_broken: "ram_goat",
  goat_horn: "ram_goat",
  dura: "dura",
  stump: "tree",
  ox_king: "tree",
  ancient: "beasts",
  son: "michael",
  kings: "michael",
  michael: "michael",
  sealed: "michael"
};

var TIMELINE_EPOCHS = [
  { year: "605 B.C.", title: "Nebuchadnezzar's first siege of Jerusalem", desc: "The 70 years of Babylonian captivity begin. Daniel and the Hebrew youth are taken to Babylon." },
  { year: "539 B.C.", title: "Fall of Babylon to Medo-Persia", desc: "Cyrus diverts the Euphrates. Belshazzar's feast ends. The silver kingdom assumes dominion." },
  { year: "457 B.C.", title: "Decree of Artaxerxes Longimanus", desc: "Ezra 7 records the decree to restore Jerusalem — the start of the 70 weeks and the 2,300 days." },
  { year: "A.D. 31", title: "Crucifixion in the midst of the week", desc: "After 3.5 years of ministry, Messiah is cut off. The earthly sacrificial system meets its antitype." },
  { year: "538 A.D.", title: "1,260 years of ecclesiastical supremacy begin", desc: "The Ostrogoths are driven from Rome. Justinian's decree is in effect." },
  { year: "1798 A.D.", title: "The close of the 1,260 years", desc: "Berthier enters Rome. The 1,260 prophetic years end and the time of the end begins." },
  { year: "1844 A.D.", title: "Cleansing of the sanctuary", desc: "The 2,300 prophetic years close. Christ enters the final phase of heavenly intercession." },
  { year: "Dan 12", title: "Michael stands up", desc: "Intercession concludes. A time of trouble follows, then deliverance and the bodily resurrection." }
];

var SHEETS_DATA = `;

const fileFooter = `;

var SCROLL_SECTIONS = ` + JSON.stringify(scrollSections, null, 2) + `;

if (typeof window !== 'undefined') {
  window.SHEETS_DATA = SHEETS_DATA;
  window.SCROLL_SECTIONS = SCROLL_SECTIONS;
  window.TIMELINE_EPOCHS = TIMELINE_EPOCHS;
  window.LEGACY_ID_MAP = LEGACY_ID_MAP;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SHEETS_DATA, SCROLL_SECTIONS, TIMELINE_EPOCHS, LEGACY_ID_MAP };
}
`;

const fullOutput = fileHeader + JSON.stringify(ctx.sheetsData, null, 2) + fileFooter;
fs.writeFileSync('study-data.js', fullOutput, 'utf8');
console.log('Successfully generated study-data.js with all 11 sheets! Total size: ' + fullOutput.length + ' bytes');
