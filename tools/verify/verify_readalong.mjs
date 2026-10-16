/* Read-along proof for sittings 0-2: the spoken text is highlighted on the
   visible book page, and at a checkpoint the reader can pause, answer, and
   continue from the exact point the narration reached it.

   Usage: node tools/verify/verify_readalong.mjs [base-url]
   Serve the site first (PORT=8101 python server.py --no-browser). */
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8101';
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const failures = [];
const check = (sheet, name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} sheet ${sheet} ${name}${detail ? ' ' + JSON.stringify(detail) : ''}`);
  if (!ok) failures.push(`sheet ${sheet} ${name}`);
};

for (const sheet of [0, 1, 2]) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('baOnboardV1', '1');
    } catch (e) {}
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/study.html?sheet=${sheet}&preview=full`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.StudyAudioReader && document.querySelector('#sheet-article .checkpoint-plate'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const skip = await page.$('#sitting-guide-skip');
  if (skip && (await skip.isVisible())) await skip.click();
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const p = document.getElementById('lesson-audio-player');
    p.muted = true;
    p.currentTime = 60;
    return p.play();
  });
  await page.waitForTimeout(2500);
  const mid = await page.evaluate(() => {
    const mark = document.querySelector('mark.audio-read');
    if (!mark) return { mark: false };
    const view = mark.closest('.br-view');
    const r = mark.getClientRects()[0];
    const v = view ? view.getBoundingClientRect() : null;
    const word = document.querySelector('mark.audio-word');
    return {
      mark: true,
      word: word ? word.textContent : null,
      text: mark.textContent.slice(0, 60),
      onPage: !!(r && v && r.left >= v.left - 2 && r.right <= v.right + 2)
    };
  });
  check(sheet, 'highlights spoken text', mid.mark, mid);
  check(sheet, 'highlights the word being spoken', !!mid.word);
  check(sheet, 'spoken text is on the open page', mid.onPage);

  const stops = await page.evaluate(() => window.StudyAudioReader.checkpoints());
  check(sheet, 'checkpoint stops found', stops.length > 0, stops);
  if (!stops.length) { await page.close(); continue; }

  const at = stops[0];
  await page.evaluate((t) => {
    const p = document.getElementById('lesson-audio-player');
    p.currentTime = Math.max(0, t - 2.5);
  }, at);
  await page.waitForTimeout(5000);
  const offered = await page.evaluate(() => {
    const box = document.getElementById('audio-checkpoint');
    return { shown: !box.hidden, state: box.getAttribute('data-state'), kicker: document.getElementById('audio-cp-kicker').textContent };
  });
  check(sheet, 'offers a checkpoint stop', offered.shown && offered.state === 'offer', offered);

  await page.click('#audio-cp-pause');
  await page.waitForTimeout(900);
  const held = await page.evaluate(() => {
    const p = document.getElementById('lesson-audio-player');
    const plate = document.querySelector('.checkpoint-plate[data-checkpoint="1"]');
    const view = plate && plate.closest('.br-view');
    const r = plate && plate.getBoundingClientRect();
    const v = view && view.getBoundingClientRect();
    return {
      paused: p.paused,
      state: document.getElementById('audio-checkpoint').getAttribute('data-state'),
      plateOpen: !!(r && v && r.left >= v.left - 2 && r.left < v.right),
      pauseHidden: document.getElementById('audio-cp-pause').hidden
    };
  });
  check(sheet, 'pause holds the audio at the checkpoint page', held.paused && held.state === 'held' && held.plateOpen && held.pauseHidden, held);

  await page.evaluate(() => {
    const plate = document.querySelector('.checkpoint-plate[data-checkpoint="1"]');
    plate.setAttribute('data-checkpoint-passed', 'true');
    document.dispatchEvent(new CustomEvent('checkpoint:passed'));
  });
  const done = await page.textContent('#audio-cp-title');
  check(sheet, 'acknowledges the answered checkpoint', /answered/i.test(done), done);

  await page.click('#audio-cp-continue');
  await page.waitForTimeout(700);
  const resumed = await page.evaluate((t) => {
    const p = document.getElementById('lesson-audio-player');
    return { playing: !p.paused, from: p.currentTime, at: t, hidden: document.getElementById('audio-checkpoint').hidden };
  }, at);
  check(sheet, 'continue resumes from the checkpoint', resumed.playing && resumed.hidden && Math.abs(resumed.from - at) < 1.5, resumed);

  check(sheet, 'no page errors', errors.length === 0, errors.slice(0, 3));
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(`${failures.length} read-along check(s) failed`);
  process.exitCode = 1;
}
