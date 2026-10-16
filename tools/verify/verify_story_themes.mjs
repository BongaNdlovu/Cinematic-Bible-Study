/*
 * Theme check for the story stage and the reader. The stage is a permanently
 * dark inset in every theme, so each piece of copy on it must be forced light;
 * anything left to inherit turns near-black on a #080807 ground.
 *
 * Usage: node tools/verify/verify_story_themes.mjs --base=http://127.0.0.1:8000
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);
const BASE = String(args.base || 'http://127.0.0.1:8000').replace(/\/$/, '');
const OUT = path.join('qa', 'proofs', 'story-themes');
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

// Relative luminance against the stage's fixed ground (#080807).
const luminance = (rgb) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
  if (!m) return null;
  const [r, g, b] = [1, 2, 3].map((i) => {
    const v = Number(m[i]) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const STAGE_L = luminance('rgb(8, 8, 7)');
const contrast = (rgb) => {
  const l = luminance(rgb);
  if (l === null) return null;
  const hi = Math.max(l, STAGE_L);
  const lo = Math.min(l, STAGE_L);
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
};

// `applyTheme` takes an index into the app's own order, not a name.
const themes = [
  { name: 'charcoal', index: 0 },
  { name: 'paper', index: 1 },
  { name: 'white', index: 2 },
  { name: 'night', index: 3 },
];
const results = [];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await context.addInitScript((mock) => {
    try {
      localStorage.setItem('baQaMockSession', JSON.stringify(mock));
      const j = JSON.parse(localStorage.getItem('baJourney') || '{}');
      j.termsAccepted = true;
      j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
      j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) { /* storage disabled */ }
  }, MOCK);

  const page = await context.newPage();
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = document.getElementById('sitting-guide'); if (g) g.hidden = true; });
  await page.waitForSelector('#sheet-article figure[data-diagram="s0-3"] .story-detail', { timeout: 20000 });

  for (const { name, index } of themes) {
    await page.evaluate((i) => window.applyTheme(i, true), index);
    await page.waitForTimeout(500);
    const stage = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector('#sheet-article figure[data-diagram="s0-3"] ' + sel);
        return el ? getComputedStyle(el).color : null;
      };
      const mode = ['charcoal', 'paper', 'white', 'night']
        .find((m) => document.body.classList.contains(m + '-mode')) || 'none';
      return {
        mode,
        kicker: pick('.story-kicker'),
        title: pick('.story-title'),
        text: pick('.story-text'),
        detail: pick('.story-detail'),
        index: pick('.story-index'),
      };
    });
    const figure = await page.$('#sheet-article figure[data-diagram="s0-3"]');
    await figure.evaluate((f) => f.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await figure.screenshot({ path: path.join(OUT, `stage-${name}.png`) });

    // Reader copy in the same theme.
    const launch = await figure.$('.story-fullscreen');
    await launch.click();
    await page.waitForTimeout(1400);
    const reader = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector('body > .story-read ' + sel);
        return el ? getComputedStyle(el).color : null;
      };
      return {
        title: pick('.story-read-title'),
        copy: pick('.story-read-copy'),
        detail: pick('.story-read-detail'),
        note: pick('.story-read-note'),
        count: pick('.story-read-count'),
        hint: pick('.story-read-hint'),
      };
    });
    await page.screenshot({ path: path.join(OUT, `reader-${name}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1300);

    const row = { theme: name, mode: stage.mode, stage, reader, stageContrast: {}, readerContrast: {} };
    Object.entries(stage).forEach(([k, v]) => { if (v) row.stageContrast[k] = contrast(v); });
    Object.entries(reader).forEach(([k, v]) => { if (v) row.readerContrast[k] = contrast(v); });
    results.push(row);
  }
} finally {
  await browser.close();
}

const MIN = 4.5;
let bad = 0;
results.forEach((row) => {
  const fails = Object.entries(row.stageContrast).filter(([, c]) => c !== null && c < MIN);
  const readerFails = Object.entries(row.readerContrast).filter(([, c]) => c !== null && c < MIN);
  bad += fails.length + readerFails.length;
  console.log(`${row.theme.padEnd(9)} stage ${JSON.stringify(row.stageContrast)}`);
  console.log(`${''.padEnd(9)} reader ${JSON.stringify(row.readerContrast)}`);
  fails.forEach(([k, c]) => console.log(`   FAIL stage.${k} contrast ${c} (<${MIN})`));
  readerFails.forEach(([k, c]) => console.log(`   FAIL reader.${k} contrast ${c} (<${MIN})`));
});
console.log(bad ? `\ncontrast failures: ${bad}` : '\nall theme copy clears 4.5:1 against the stage ground');
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(bad ? 1 : 0);
