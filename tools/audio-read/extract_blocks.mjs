/* Dump the read-along blocks of a sitting exactly as the study app sees them.

Usage: node tools/audio-read/extract_blocks.mjs <sheet-index> [base-url]

Writes tools/audio-read/sitting-NN-blocks.json, the list of cooked block texts
from window.StudyAudioReader.texts(), which align.py turns into cues. Serve the
site first (PORT=8101 python server.py --no-browser). */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const sheet = Number(process.argv[2] || 0);
const base = process.argv[3] || 'http://127.0.0.1:8101';
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, `sitting-${String(sheet).padStart(2, '0')}-blocks.json`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${base}/study.html?sheet=${sheet}&preview=full`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.StudyAudioReader && document.querySelector('#sheet-article p'), null, { timeout: 30000 });
await page.waitForTimeout(3000);

const read = (view) => page.evaluate((v) => {
  if (window.BookReader) window.BookReader.setView(v);
  return window.StudyAudioReader.texts();
}, view);
const book = await read('book');
await page.waitForTimeout(800);
const scroll = await read('scroll');
await page.evaluate(() => window.BookReader && window.BookReader.setView('book'));

if (JSON.stringify(book) !== JSON.stringify(scroll)) {
  console.error('book and scroll views disagree on the read-along blocks');
  process.exitCode = 1;
}
writeFileSync(out, JSON.stringify({ sheet, blocks: book }, null, 1), 'utf8');
console.log(`blocks=${book.length} -> ${out}`);
await browser.close();
