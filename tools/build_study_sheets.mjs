/*
 * Split js/study/sheets-data.js into the files study.html loads.
 *
 * sheets-data.js stays the one file every authoring tool edits. The page no
 * longer loads it whole: it loads js/study/sheets/index.js (the eleven
 * sittings' titles and the horizon epochs) and fetches one sitting at a time
 * from js/study/sheets/sheet-N.js. Run this after any change to
 * sheets-data.js; tools/verify/verify_quiz_integrity.mjs fails while the two
 * disagree.
 *
 * Usage: node tools/build_study_sheets.mjs [--check]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'js/study/sheets-data.js');
const OUT_DIR = path.join(ROOT, 'js/study/sheets');
const INDEX_FIELDS = ['id', 'epoch', 'readTime', 'allocatedMinutes', 'scripture', 'title', 'subtitle'];
const EOL = '\r\n';

export function loadSource() {
  const box = {};
  new Function('window', fs.readFileSync(SOURCE, 'utf8'))(box);
  if (!Array.isArray(box.sheetsData) || !Array.isArray(box.timelineEpochs)) {
    throw new Error('sheets-data.js did not define sheetsData and timelineEpochs');
  }
  return { sheetsData: box.sheetsData, timelineEpochs: box.timelineEpochs };
}

function pick(sheet) {
  const out = {};
  INDEX_FIELDS.forEach((key) => { if (key in sheet) out[key] = sheet[key]; });
  return out;
}

export function sheetPath(index) {
  return 'js/study/sheets/sheet-' + index + '.js';
}

export function render() {
  const { sheetsData, timelineEpochs } = loadSource();
  const files = {};
  const index = [
    '(function () {',
    "  'use strict';",
    '',
    '  const sheetsData = ' + JSON.stringify(sheetsData.map(pick)) + ';',
    '',
    '  const timelineEpochs = ' + JSON.stringify(timelineEpochs) + ';',
    '',
    '  const loaded = new Set();',
    '  const waiting = new Map();',
    '',
    '  function chunkPath(index) {',
    "    const host = document.getElementById('study-chunks');",
    "    return host ? host.getAttribute('data-sheet-' + index) || '' : '';",
    '  }',
    '',
    '  function hasBody(index) {',
    '    const row = sheetsData[Number(index)];',
    '    return !!(row && typeof row.content === \'string\');',
    '  }',
    '',
    '  function isReady(index) {',
    '    const at = Number(index);',
    '    return loaded.has(at) && hasBody(at);',
    '  }',
    '',
    '  function put(index, sheet) {',
    '    const at = Number(index);',
    '    if (!sheet || at < 0 || at >= sheetsData.length) return;',
    '    sheetsData[at] = sheet;',
    '    loaded.add(at);',
    '    const entry = waiting.get(at);',
    '    if (entry) {',
    '      waiting.delete(at);',
    '      entry.resolve(sheet);',
    '    }',
    '  }',
    '',
    '  function ensure(index) {',
    '    const at = Number(index);',
    "    if (!Number.isInteger(at) || at < 0 || at >= sheetsData.length) return Promise.reject(new Error('no sitting ' + index));",
    '    if (isReady(at)) return Promise.resolve(sheetsData[at]);',
    '    const known = waiting.get(at);',
    '    if (known) return known.promise;',
    '    const src = chunkPath(at);',
    "    if (!src) return Promise.reject(new Error('no file for sitting ' + at));",
    '    const entry = {};',
    '    entry.promise = new Promise((resolve, reject) => {',
    '      entry.resolve = resolve;',
    '      entry.reject = reject;',
    '    });',
    '    waiting.set(at, entry);',
    "    const tag = document.createElement('script');",
    '    tag.src = src;',
    '    tag.async = true;',
    "    tag.addEventListener('load', () => {",
    '      tag.remove();',
    '      if (loaded.has(at)) return;',
    '      waiting.delete(at);',
    "      entry.reject(new Error('sitting ' + at + ' did not register'));",
    '    });',
    "    tag.addEventListener('error', () => {",
    '      tag.remove();',
    '      waiting.delete(at);',
    "      entry.reject(new Error('sitting ' + at + ' failed to load'));",
    '    });',
    '    document.head.appendChild(tag);',
    '    return entry.promise;',
    '  }',
    '',
    '  function whenIdle(fn) {',
    "    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 4000 });",
    '    else window.setTimeout(fn, 1200);',
    '  }',
    '',
    '  function prefetchAround(index) {',
    '    const at = Number(index);',
    '    whenIdle(() => {',
    '      [at + 1, at - 1].forEach((n) => {',
    '        if (n >= 0 && n < sheetsData.length && !loaded.has(n)) ensure(n).catch(() => {});',
    '      });',
    '    });',
    '  }',
    '',
    '  function startingGuess() {',
    '    try {',
    '      const params = new URLSearchParams(location.search);',
    "      const raw = params.get('sheet') || params.get('s');",
    "      if (raw != null && raw !== '' && /^\\d+$/.test(raw)) return Number(raw);",
    "      if (params.get('id') || params.get('section')) return -1;",
    "      const saved = localStorage.getItem('daniel_historicist_sheet');",
    '      if (saved != null && /^\\d+$/.test(saved)) return Number(saved);',
    '    } catch (e) {}',
    '    return -1;',
    '  }',
    '',
    '  window.sheetsData = sheetsData;',
    '  window.timelineEpochs = timelineEpochs;',
    '  window.StudySheets = { ensure: ensure, isReady: isReady, put: put, prefetchAround: prefetchAround };',
    '',
    '  const guess = startingGuess();',
    '  if (guess >= 0 && guess < sheetsData.length) ensure(guess).catch(() => {});',
    '})();',
    ''
  ].join(EOL);
  files['index.js'] = index;
  sheetsData.forEach((sheet, i) => {
    files['sheet-' + i + '.js'] = 'window.StudySheets.put(' + i + ', ' + JSON.stringify(sheet) + ');' + EOL;
  });
  return { files, count: sheetsData.length };
}

function main() {
  const check = process.argv.includes('--check');
  const { files, count } = render();
  const stale = [];
  if (!check) fs.mkdirSync(OUT_DIR, { recursive: true });
  Object.entries(files).forEach(([name, text]) => {
    const full = path.join(OUT_DIR, name);
    const now = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (now === text) return;
    stale.push(name);
    if (!check) fs.writeFileSync(full, text);
  });
  if (check) {
    if (stale.length) {
      console.error('js/study/sheets is out of date with sheets-data.js: ' + stale.join(', ') + '\nRun: node tools/build_study_sheets.mjs');
      process.exit(1);
    }
    console.log('js/study/sheets matches sheets-data.js (' + count + ' sittings)');
    return;
  }
  console.log(stale.length ? 'wrote ' + stale.join(', ') : 'js/study/sheets already up to date');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
