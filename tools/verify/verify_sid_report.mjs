import { chromium } from 'playwright';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ensureServer } from './_server.mjs';

const SHOTS = process.env.SID_SHOTS || '';

function sampleScript() {
  const FROM = '2026-07-01T00:00:00.000Z';
  const TO = '2026-10-01T00:00:00.000Z';
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const at = () => new Date(Date.parse(FROM) + rnd() * (Date.parse(TO) - Date.parse(FROM) - 1)).toISOString();
  const events = [];
  const surveys = [];
  const profiles = [];
  for (let u = 0; u < 420; u++) {
    const id = 'u' + u;
    let reach = 0;
    while (reach < 11 && rnd() < (reach === 0 ? 1 : 0.86)) {
      events.push({ event: 'sitting_start', user_id: id, sitting: reach, detail: {}, created_at: at() });
      if (rnd() < 0.82) {
        events.push({ event: 'sitting_complete', user_id: id, sitting: reach, detail: { seconds: 900 + Math.floor(rnd() * 900) }, created_at: at() });
        for (let q = 0; q < 5; q++) events.push({ event: 'quiz_answer', user_id: id, sitting: reach, detail: { q, attempt: 1, correct: rnd() < 0.6 }, created_at: at() });
      }
      reach++;
    }
    if (reach === 11) events.push({ event: 'course_complete', user_id: id, sitting: 10, detail: {}, created_at: at() });
    if (rnd() < 0.2) events.push({ event: 'feature_use', user_id: id, sitting: 3, detail: { feature: ['infographic', 'weather', 'theme'][Math.floor(rnd() * 3)] }, created_at: at() });
    if (rnd() < 0.55) profiles.push({ user_id: id, found_via: ['First time', 'Read it before', 'I teach it'][Math.floor(rnd() * 3)], study_mode: ['Personal study', 'With others', 'Teaching or leading', 'Exploring'][Math.floor(rnd() * 4)], created_at: at() });
    if (rnd() < 0.35) surveys.push({ user_id: id, responses: { kind: 'sitting_pulse', score: 3 + Math.floor(rnd() * 3) }, created_at: at() });
  }
  events.push({ event: 'referral_signup', user_id: 'r0', detail: {}, created_at: at() });
  const graduates = Array.from({ length: 23 }, (_, i) => ({ user_id: 'g' + i, issued_at: at() }));
  const figures = window.SidReport.build({ events, surveys, profiles, graduates }, { from: FROM, to: TO, sample: true, preparedAt: '2026-10-26T09:00:00.000Z' });
  document.getElementById('sid-pages').innerHTML = window.SidReport.render(figures);
  document.body.classList.add('sid-open');
  return document.querySelectorAll('.sid-page').length;
}

async function run() {
  const server = await ensureServer({ preferred: 8000, probe: '/insights.html' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(server.base + '/insights.html', { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.SidReport);
    await page.evaluate(() => document.fonts.ready);

    const controls = await page.evaluate(() => ({
      from: !!document.getElementById('sid-from'),
      to: !!document.getElementById('sid-to'),
      build: !!document.getElementById('sid-build')
    }));
    assert.deepEqual(controls, { from: true, to: true, build: true }, 'the Insights page has the report controls');

    const pages = await page.evaluate(sampleScript);
    assert.equal(pages, 6, 'the report has six pages');
    await page.evaluate(() => document.fonts.ready);

    await page.emulateMedia({ media: 'print' });
    const layout = await page.evaluate(() => ({
      toolbar: getComputedStyle(document.querySelector('.sid-toolbar')).display,
      dashboard: getComputedStyle(document.querySelector('main.insights-main')).display,
      folios: Array.from(document.querySelectorAll('.sid-folio')).filter((f) => getComputedStyle(f).display !== 'none').length,
      pages: Array.from(document.querySelectorAll('.sid-page')).map((p) => ({ client: p.clientHeight, scroll: p.scrollHeight }))
    }));
    assert.equal(layout.toolbar, 'none', 'the toolbar does not print');
    assert.equal(layout.dashboard, 'none', 'the dashboard does not print');
    assert.equal(layout.folios, 5, 'every inner page prints its footer');
    layout.pages.forEach((p, i) => assert.ok(p.scroll <= p.client + 1, `page ${i + 1} fits on one A4 sheet (${p.scroll}px of ${p.client}px)`));

    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const sheets = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert.equal(sheets, 6, `the PDF has six A4 pages (got ${sheets})`);

    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      fs.writeFileSync(path.join(SHOTS, 'sid-report-sample.pdf'), pdf);
      const handles = await page.$$('.sid-page');
      for (let i = 0; i < handles.length; i++) await handles[i].screenshot({ path: path.join(SHOTS, `sid-page-${i + 1}.png`) });
    }
    assert.deepEqual(errors, [], 'no page errors');
  } finally {
    await browser.close();
    server.stop();
  }
  console.log('sid report: six A4 pages, each fits its sheet, the toolbar and dashboard stay off the print');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
