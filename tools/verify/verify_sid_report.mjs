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
  const participation = { registered: 312, began: 241 };
  const figures = window.SidReport.build({ events, surveys, profiles, graduates, participation }, { from: FROM, to: TO, sample: true, preparedAt: '2026-10-26T09:00:00.000Z' });
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

    const target = await page.evaluate(() => {
      const opts = { from: '2026-01-01T00:00:00.000Z', to: '2027-01-01T00:00:00.000Z' };
      const text = (participation) => {
        const html = window.SidReport.render(window.SidReport.build({ participation }, opts));
        const box = document.createElement('div');
        box.innerHTML = html;
        return box.querySelector('.sid-page:nth-of-type(2)').textContent;
      };
      return {
        full: text({ registered: 312, began: 241 }),
        few: text({ registered: 3, began: 2 }),
        none: text(null),
        broken: text({ registered: 'x', began: 1 })
      };
    });
    const floor = await page.evaluate(() => {
      const opts = { from: '2026-01-01T00:00:00.000Z', to: '2026-11-14T00:00:00.000Z', countFrom: '2026-10-19T00:00:00.000Z', guestCutoff: '2026-08-15T00:00:00.000Z' };
      const events = [];
      for (let i = 0; i < 9; i++) events.push({ event: 'sitting_start', anon_id: 'test' + i, sitting: 0, detail: {}, created_at: '2026-10-14T10:00:00Z' });
      for (let i = 0; i < 6; i++) events.push({ event: 'sitting_start', anon_id: 'reader' + i, sitting: 0, detail: {}, created_at: '2026-10-25T10:00:00Z' });
      const surveys = [{ rating: 5, created_at: '2026-10-02T00:00:00Z' }];
      const profiles = [{ user_id: 'p1', found_via: 'First time', created_at: '2026-02-01T00:00:00Z' }];
      const late = window.SidReport.build({ events, surveys, profiles }, { ...opts, from: '2026-11-01T00:00:00.000Z' });
      const f = window.SidReport.build({ events, surveys, profiles }, opts);
      return { readers: f.reach.readers, surveys: f.feedback.overall.n, profiles: f.readers.firstRead.total, notes: f.incomplete, lateNotes: late.incomplete };
    });
    assert.equal(floor.readers, 6, 'starts before 19 October 2026 are left out of the report');
    assert.equal(floor.surveys, 0, 'ratings before 19 October 2026 are left out of the report');
    assert.equal(floor.profiles, 1, 'welcome answers keep the whole period');
    assert.ok(floor.notes.some((n) => n.includes('count from 19 October 2026')), 'the report says why it counts from 19 October 2026');
    assert.ok(!floor.notes.some((n) => n.includes('kept for 90 days')), 'the guest-deletion warning is not shown when the cut-off is later');
    assert.ok(!floor.lateNotes.some((n) => n.includes('count from 19 October 2026')), 'a period after the cut-off has no cut-off note');

    assert.ok(target.full.includes('312accounts registered in this period'), 'the summary shows accounts registered');
    assert.ok(target.full.includes('241registered and began the study'), 'the summary shows registered readers who began');
    assert.ok(target.full.includes('48%of the 500 target reached'), 'the summary shows progress toward the 500 target');
    assert.ok(target.few.includes('fewer than 5accounts registered'), 'small registration counts are withheld');
    assert.ok(target.none.includes('Registration figures are not available'), 'a missing participation figure says so');
    assert.ok(target.broken.includes('Registration figures are not available'), 'a malformed participation figure is not shown');

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
