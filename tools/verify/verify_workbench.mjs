import fs from 'fs';
import path from 'path';
import vm from 'vm';

console.log('=== Running Workbench & Proof Gates Automated Verification ===');

// Setup mock browser / DOM environment
const mockStorage = new Map();
const localStorageMock = {
  getItem(k) { return mockStorage.has(k) ? mockStorage.get(k) : null; },
  setItem(k, v) { mockStorage.set(k, String(v)); },
  removeItem(k) { mockStorage.delete(k); },
  clear() { mockStorage.clear(); }
};

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  URLSearchParams,
  window: {
    location: { search: '' },
    localStorage: localStorageMock
  },
  document: {
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: '',
        style: {},
        innerHTML: '',
        innerText: '',
        textContent: '',
        dataset: {},
        hidden: false,
        disabled: false,
        childNodes: [],
        children: [],
        appendChild(child) { this.childNodes.push(child); this.children.push(child); return child; },
        setAttribute(k, v) { this[k] = v; },
        getAttribute(k) { return this[k]; },
        addEventListener() {},
        removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; }
      };
    },
    getElementById() { return null; },
    querySelectorAll() { return []; },
    body: {
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() { return false; }
      }
    }
  },
  localStorage: localStorageMock
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;

const context = vm.createContext(sandbox);

// 1. Load workbench.js
const workbenchCode = fs.readFileSync(path.join('js', 'study', 'workbench.js'), 'utf8');
vm.runInContext(workbenchCode, context);

const StudyWorkbench = sandbox.window.StudyWorkbench;
if (!StudyWorkbench) {
  throw new Error('StudyWorkbench failed to mount on window.');
}

// Check 1: Initial state - all sittings 0..10 must return isSheetComplete === false
console.log('Test 1: Sittings 0..10 are not complete initially...');
for (let i = 0; i <= 10; i++) {
  if (StudyWorkbench.isSheetComplete(i)) {
    throw new Error(`Sitting ${i} was reported as complete with empty storage!`);
  }
}
console.log('  PASS: All 11 sittings initially incomplete.');

// Check 2: Sitting 0 proof gate (requires task1 and task2)
console.log('Test 2: Sitting 0 two-part proof gate (Year-Day formulation & School classification)...');
StudyWorkbench.markTaskComplete(0, 'task1');
if (StudyWorkbench.isSheetComplete(0)) {
  throw new Error('Sitting 0 completed with only task1 verified (missing task2).');
}
StudyWorkbench.markTaskComplete(0, 'task2');
if (!StudyWorkbench.isSheetComplete(0)) {
  throw new Error('Sitting 0 failed to complete after task1 and task2.');
}
console.log('  PASS: Sitting 0 requires both task1 and task2.');

// Check 3: Sitting 1 proof gate (requires task1 and task2)
console.log('Test 3: Sitting 1 two-part proof gate (Colossus assembly & Stone calculation)...');
StudyWorkbench.markTaskComplete(1, 'task1');
if (StudyWorkbench.isSheetComplete(1)) {
  throw new Error('Sitting 1 completed with only task1 verified.');
}
StudyWorkbench.markTaskComplete(1, 'task2');
if (!StudyWorkbench.isSheetComplete(1)) {
  throw new Error('Sitting 1 failed to complete after task1 and task2.');
}
console.log('  PASS: Sitting 1 requires both task1 and task2.');

// Check 4: Sitting 2 proof gate (requires task1 and task2)
console.log('Test 4: Sitting 2 two-part proof gate (Four beasts & Judgment throne)...');
StudyWorkbench.markTaskComplete(2, 'task1');
if (StudyWorkbench.isSheetComplete(2)) {
  throw new Error('Sitting 2 completed with only task1 verified.');
}
StudyWorkbench.markTaskComplete(2, 'task2');
if (!StudyWorkbench.isSheetComplete(2)) {
  throw new Error('Sitting 2 failed to complete after task1 and task2.');
}
console.log('  PASS: Sitting 2 requires both task1 and task2.');

// Check 5 & 6: Sittings 3 through 10 proof tasks
console.log('Test 5: Sittings 3 through 10 proof task specifications & gates...');
const tasks = StudyWorkbench.SITTING_TASKS;
if (!tasks) {
  throw new Error('SITTING_TASKS is missing from StudyWorkbench.');
}

const validTypes = ['select', 'calc', 'match', 'chain', 'typed'];

for (let s = 3; s <= 10; s++) {
  const spec = tasks[s];
  if (!spec) {
    throw new Error(`Sitting ${s} is missing task specification in SITTING_TASKS.`);
  }
  if (!validTypes.includes(spec.type)) {
    throw new Error(`Sitting ${s} task has invalid type: ${spec.type}.`);
  }
  if (!spec.title || typeof spec.title !== 'string') {
    throw new Error(`Sitting ${s} task is missing title.`);
  }
  if (!spec.passage || typeof spec.passage !== 'string') {
    throw new Error(`Sitting ${s} task is missing scripture passage reference.`);
  }
  if (!spec.question || typeof spec.question !== 'string') {
    throw new Error(`Sitting ${s} task is missing question prompt.`);
  }
  if (!spec.successText || typeof spec.successText !== 'string') {
    throw new Error(`Sitting ${s} task is missing success text.`);
  }

  // Verify task-specific structure
  if (spec.type === 'select') {
    if (!Array.isArray(spec.options) || spec.options.length < 2) {
      throw new Error(`Sitting ${s} select task needs at least 2 options.`);
    }
    if (!spec.correct) {
      throw new Error(`Sitting ${s} select task is missing correct answer.`);
    }
  } else if (spec.type === 'calc') {
    if (typeof spec.startYear !== 'number' || typeof spec.duration !== 'number' || typeof spec.targetYear !== 'number') {
      throw new Error(`Sitting ${s} calc task has invalid math parameters.`);
    }
    if (spec.startYear + spec.duration !== spec.targetYear && spec.startYear - spec.duration !== spec.targetYear) {
      throw new Error(`Sitting ${s} calc task arithmetic mismatch.`);
    }
  } else if (spec.type === 'match') {
    if (!Array.isArray(spec.items) || spec.items.length < 2) {
      throw new Error(`Sitting ${s} match task needs at least 2 items.`);
    }
  } else if (spec.type === 'chain') {
    const chainItems = spec.steps || spec.lines;
    if (!Array.isArray(chainItems) || chainItems.length < 2) {
      throw new Error(`Sitting ${s} chain task needs at least 2 steps or lines.`);
    }
  } else if (spec.type === 'typed') {
    const typedLines = spec.lines || [];
    if (!Array.isArray(typedLines) || !typedLines.length) {
      throw new Error(`Sitting ${s} typed task needs at least one line.`);
    }
    typedLines.forEach((line, li) => {
      if (!line.id || !Array.isArray(line.mustInclude) || !line.mustInclude.length) {
        throw new Error(`Sitting ${s} typed line ${li} needs id and mustInclude.`);
      }
    });
  }

  // Verify that sitting s does not auto-complete without submission
  const raw = localStorageMock.getItem('daniel_workbench_v1');
  const wbState = raw ? JSON.parse(raw) : {};
  delete wbState[s];
  localStorageMock.setItem('daniel_workbench_v1', JSON.stringify(wbState));

  if (StudyWorkbench.isSheetComplete(s)) {
    throw new Error(`Sitting ${s} auto-completed without task verification!`);
  }

  // Mark task1 complete and verify gate unlocks
  StudyWorkbench.markTaskComplete(s, 'task1');
  if (!StudyWorkbench.isSheetComplete(s)) {
    throw new Error(`Sitting ${s} failed to register complete after markTaskComplete(${s}, 'task1')!`);
  }
}
console.log('  PASS: Sittings 3..10 specifications and gating verified without auto-completion.');

// Check 7: Forbidden brand regression scan
console.log('Test 6: Scanning codebase for forbidden brand names...');
const FORBIDDEN = /Adventist|Ellen G\.|Uriah Smith|Investigative Judgment|Great Controversy|Early Writings|The Sanctified Life/i;

const filesToScan = [
  'js/study/workbench.js',
  'js/study/sheets-data.js',
  'js/study/competency.js',
  'js/study/certificate.js',
  'js/shared/journey.js',
  'js/shared/progress-sync.js',
  'js/shared/reviews.js',
  'study.html',
  'index.html',
  'map.html',
  'gallery.html'
];

let violations = 0;
for (const relPath of filesToScan) {
  const content = fs.readFileSync(path.join(relPath), 'utf8');
  const lines = content.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    const match = lines[idx].match(FORBIDDEN);
    if (match) {
      console.error(`FORBIDDEN BRAND in ${relPath}:${idx + 1} -> "${match[0]}"`);
      violations++;
    }
  }
}

if (violations > 0) {
  throw new Error(`Detected ${violations} forbidden brand violation(s) in codebase.`);
}
console.log('  PASS: 0 forbidden brand violations across all scanned files.');

// Check 8: Verify facilitator notes in sheets-data.js
console.log('Test 7: Verifying facilitator notes across all 11 sittings in sheets-data.js...');
const sheetsDataCode = fs.readFileSync(path.join('js', 'study', 'sheets-data.js'), 'utf8');
vm.runInContext(sheetsDataCode, context);
const sheetsData = sandbox.window.sheetsData;

if (!Array.isArray(sheetsData) || sheetsData.length !== 11) {
  throw new Error(`sheetsData is invalid or does not have 11 sittings (found: ${sheetsData?.length}).`);
}

for (let i = 0; i <= 10; i++) {
  const fac = sheetsData[i].facilitator;
  if (!fac) {
    throw new Error(`Sitting ${i} is missing facilitator notes object.`);
  }
  if (typeof fac.minutes !== 'number' || fac.minutes <= 0) {
    throw new Error(`Sitting ${i} has invalid facilitator minutes: ${fac.minutes}.`);
  }
  if (!Array.isArray(fac.talkingPoints) || fac.talkingPoints.length < 3) {
    throw new Error(`Sitting ${i} facilitator talkingPoints must have at least 3 points.`);
  }
  if (!Array.isArray(fac.askClass) || fac.askClass.length < 2) {
    throw new Error(`Sitting ${i} facilitator askClass must have at least 2 questions.`);
  }
}
console.log('  PASS: All 11 sittings contain structured facilitator notes (minutes, 3+ points, 2+ questions).');

// Check 9: Verify classroom print styles, projection mode, and button IDs in study.html
console.log('Test 8: Verifying classroom print stylesheet, projection mode, and action button IDs in study.html...');
const studyHtmlContent = fs.readFileSync('study.html', 'utf8');
if (!studyHtmlContent.includes('@media print')) {
  throw new Error('study.html is missing @media print classroom print styles.');
}
if (!studyHtmlContent.includes('body.projection-mode')) {
  throw new Error('study.html is missing body.projection-mode classroom styles.');
}
if (!studyHtmlContent.includes('id="btn-progress-header"')) {
  throw new Error('study.html is missing #btn-progress-header.');
}
if (!studyHtmlContent.includes('id="btn-print-header"')) {
  throw new Error('study.html is missing #btn-print-header.');
}
if (!studyHtmlContent.includes('id="btn-codex-progress"')) {
  throw new Error('study.html is missing #btn-codex-progress.');
}
console.log('  PASS: study.html contains print stylesheet, projection styles, and all header/codex action IDs.');

// Check 10: Verify supabase-progress.sql schema completeness
console.log('Test 9: Verifying supabase-progress.sql table schema & RLS policies...');
const sqlContent = fs.readFileSync(path.join('tools', 'supabase-progress.sql'), 'utf8');
if (!sqlContent.includes('create table if not exists public.exhibit_progress')) {
  throw new Error('supabase-progress.sql missing exhibit_progress table definition.');
}
if (!sqlContent.includes('create table if not exists public.exhibit_surveys')) {
  throw new Error('supabase-progress.sql missing exhibit_surveys table definition.');
}
if (!sqlContent.includes('cohort text default') || !sqlContent.includes('role text default')) {
  throw new Error('supabase-progress.sql exhibit_surveys table missing cohort or role columns.');
}
if (!sqlContent.includes('grant select, insert on public.exhibit_surveys to authenticated, anon')) {
  throw new Error('supabase-progress.sql missing anon survey insert grant.');
}
console.log('  PASS: supabase-progress.sql contains complete exhibit_progress and exhibit_surveys schemas.');

// Check 11: Verify study-app.js default weatherPreset keeps the desk silent (auto or off)
console.log('Test 10: Verifying default weatherPreset in study-app.js keeps desk silent...');
const studyAppCode = fs.readFileSync(path.join('js', 'study', 'study-app.js'), 'utf8');
if (!/let\s+weatherPreset\s*=\s*['"](?:auto|off)['"]/i.test(studyAppCode)) {
  throw new Error("study-app.js does not declare weatherPreset initialized to 'auto' or 'off'.");
}
console.log("  PASS: study-app.js initializes weatherPreset cleanly for silent desk.");

console.log('Test 11: Homepage outcome, Open Graph, cohort capture, and review survey...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
if (!indexHtml.includes('dash-hero-outcome') || !indexHtml.includes('year-day') || !indexHtml.includes('Daniel 2:38') || !indexHtml.includes('certificate')) {
  throw new Error('index.html is missing the eleven-sitting outcome sentence.');
}
['index.html', 'study.html', 'map.html', 'gallery.html'].forEach((page) => {
  const html = fs.readFileSync(page, 'utf8');
  ['og:title', 'og:description', 'og:image', 'og:url', 'name="description"'].forEach((needle) => {
    if (!html.includes(needle)) throw new Error(page + ' is missing ' + needle);
  });
  if (!html.includes('https://cinematic-bible-study-daniel.pages.dev/assets/site/hero-main.jpg')) {
    throw new Error(page + ' og:image is not the production hero URL.');
  }
});
const journeyCode = fs.readFileSync(path.join('js', 'shared', 'journey.js'), 'utf8');
if (!journeyCode.includes('get("cohort")') || !journeyCode.includes('getCohort')) {
  throw new Error('journey.js does not capture ?cohort= or expose getCohort.');
}
const certCode = fs.readFileSync(path.join('js', 'study', 'certificate.js'), 'utf8');
if (!certCode.includes('openReviewPrompt') || !certCode.includes('cert-review-class') || !certCode.includes('classroomUse')) {
  throw new Error('certificate.js is missing the post-PDF review + classroom-use survey.');
}
const reviewsCode = fs.readFileSync(path.join('js', 'shared', 'reviews.js'), 'utf8');
if (!reviewsCode.includes('exhibit_surveys') || !reviewsCode.includes('classroomUse')) {
  throw new Error('reviews.js does not insert exhibit_surveys with classroomUse.');
}
if (!indexHtml.includes('id="witness-list"')) {
  throw new Error('index.html is missing #witness-list.');
}
if (!reviewsCode.includes('list.hidden = true')) {
  throw new Error('reviews.js does not hide the witness list when empty.');
}
if (!fs.existsSync(path.join('js', 'shared', 'progress-sync.js'))) {
  throw new Error('js/shared/progress-sync.js is missing.');
}
const syncCode = fs.readFileSync(path.join('js', 'shared', 'progress-sync.js'), 'utf8');
if (!syncCode.includes('exhibit_progress') || !syncCode.includes('pullAndMerge') || !syncCode.includes('upsert')) {
  throw new Error('progress-sync.js is missing merge/upsert of exhibit_progress.');
}
console.log('  PASS: Outcome sentence, OG tags, cohort, survey, hidden empty reviews, and progress-sync are present.');

console.log('Test 12: verify_all.mjs SID gates exclude OneVoice27...');
const verifyAllCode = fs.readFileSync(path.join('tools', 'verify', 'verify_all.mjs'), 'utf8');
if (verifyAllCode.includes('verify_onevoice27')) {
  throw new Error('verify_all.mjs still calls or requires OneVoice27.');
}
if (!verifyAllCode.includes('verify_scripture.mjs') || !verifyAllCode.includes('verify_workbench.mjs')) {
  throw new Error('verify_all.mjs must run verify_scripture and verify_workbench.');
}
console.log('  PASS: verify_all.mjs runs scripture + workbench only.');

console.log('\nALL WORKBENCH AND PROOF GATE VERIFICATIONS PASSED SUCCESSFULLY!');
