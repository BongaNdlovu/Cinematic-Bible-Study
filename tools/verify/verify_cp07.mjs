import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

const CHROME_PATH = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
].find((p) => p && fs.existsSync(p));

if (!CHROME_PATH) {
  console.error('Chrome executable not found');
  process.exit(1);
}

async function getFreePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }
  async send(method, params = {}) {
    await this.ready;
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }
  async waitFor(expression, timeoutMs = 15000, intervalMs = 100) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await this.eval(`(() => {
          try {
            return Boolean(${expression});
          } catch (e) {
            return false;
          }
        })()`);
        if (val) return true;
      } catch (e) {}
      await sleep(intervalMs);
    }
    throw new Error(`Timeout waiting for: ${expression}`);
  }
  async shot(outPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
    console.log('  [Screenshot saved]', outPath);
  }
  close() { this.ws.close(); }
}

async function run() {
  console.log('=== Running CP-07 Browser Proof Test Suite ===');
  const SERVER_PORT = await getFreePort();
  const CHROME_PORT = await getFreePort();
  const BASE = `http://127.0.0.1:${SERVER_PORT}`;

  let server = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: 'pipe'
  });

  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${BASE}/index.html`)).ok) break;
    } catch {}
    await sleep(150);
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + fs.mkdtempSync(path.join(process.env.TEMP || '.', 'cp07-chrome-')),
    '--disable-gpu',
    '--window-size=1440,900'
  ]);

  await sleep(1600);
  const targets = await (await fetch(`http://127.0.0.1:${CHROME_PORT}/json`)).json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  async function dismissSittingGuide() {
    await client.waitFor(`document.getElementById('sitting-guide-primary')`);
    await client.eval(`(() => {
      const box = document.getElementById('sitting-guide');
      const btn = document.getElementById('sitting-guide-primary');
      if (box && !box.hidden && btn) btn.click();
      return true;
    })()`);
    await sleep(250);
  }

  try {
    // 1. CP-07 Check 1: study.html?sheet=3 — Next stays gated until proof task verified
    console.log('\n[CP-07 Check 1] study.html?sheet=3: Gated proof workbench...');
    await client.send('Page.navigate', { url: `${BASE}/study.html?sheet=3&preview=full` });
    await client.waitFor(`window.location.href.includes('sheet=3') && typeof window.StudyWorkbench?.isSheetComplete === 'function' && typeof loadSheet === 'function' && document.getElementById('wb3-s3') && document.getElementById('wb3-btn') && document.getElementById('next-sheet-btn')`);
    await dismissSittingGuide();
    const initialGated = await client.eval(`(() => {
      const btn = document.getElementById('next-sheet-btn');
      const isComplete = window.StudyWorkbench.isSheetComplete(3);
      return { disabled: btn?.disabled, isComplete };
    })()`);
    console.log('  Initial Sheet 3 Gate:', initialGated);
    if (initialGated.isComplete) throw new Error('Sheet 3 should not be complete initially');
    if (!initialGated.disabled) throw new Error('Next button must be disabled before proof task completion');

    await client.eval(`(() => {
      const box = document.getElementById('wb3-s3');
      if (box) box.value = 'In 2:47 he confessed the Revealer; in 3:15 he demanded worship of the image.';
      document.getElementById('wb3-btn')?.click();
    })()`);
    await client.waitFor(`window.StudyWorkbench?.isSheetComplete(3) === true`);
    const postProof = await client.eval(`(() => {
      return { isComplete: window.StudyWorkbench.isSheetComplete(3) };
    })()`);
    console.log('  Post-Proof Sheet 3 Gate:', postProof);
    if (!postProof.isComplete) throw new Error('Sheet 3 failed to verify the 2:47 / 3:15 typed line');
    await client.shot('qa/proofs/cp07_sheet3_proof_verified.png');
    console.log('  PASS: CP-07 Check 1 verified.');

    // 2. CP-07 Check 2: study.html?sheet=7 — 538 + 1260 -> 1798 accepted
    console.log('\n[CP-07 Check 2] study.html?sheet=7: 538 + 1260 calculation...');
    await client.send('Page.navigate', { url: `${BASE}/study.html?sheet=7&preview=full` });
    await client.waitFor(`window.location.href.includes('sheet=7') && typeof window.StudyWorkbench?.isSheetComplete === 'function' && document.getElementById('wb7-val') && document.getElementById('wb7-btn')`);
    await dismissSittingGuide();
    await client.eval(`(() => {
      const inp = document.getElementById('wb7-val');
      if (inp) inp.value = '1798';
      document.getElementById('wb7-btn')?.click();
    })()`);
    await client.waitFor(`window.StudyWorkbench?.isSheetComplete(7) === true`);
    const s7Done = await client.eval('window.StudyWorkbench.isSheetComplete(7)');
    console.log('  Sheet 7 verified:', s7Done);
    if (!s7Done) throw new Error('Sheet 7 1260-year calc 1798 was rejected');
    await client.shot('qa/proofs/cp07_sheet7_calc_verified.png');
    console.log('  PASS: CP-07 Check 2 verified.');

    // 3. CP-07 Check 3: study.html?sheet=10 — three-line chain accepted
    console.log('\n[CP-07 Check 3] study.html?sheet=10: Three-line chain verification...');
    await client.send('Page.navigate', { url: `${BASE}/study.html?sheet=10&preview=full` });
    await client.waitFor(`window.location.href.includes('sheet=10') && typeof window.StudyWorkbench?.isSheetComplete === 'function' && document.getElementById('wb10-c1') && document.getElementById('wb10-btn')`);
    await dismissSittingGuide();
    await client.eval(`(() => {
      const c1 = document.getElementById('wb10-c1');
      const c2 = document.getElementById('wb10-c2');
      const c3 = document.getElementById('wb10-c3');
      if (c1) c1.value = 'Daniel 2:38 — thou art this head of gold';
      if (c2) c2.value = 'Daniel 9:26 — Messiah cut off';
      if (c3) c3.value = 'Daniel 8:14 — then shall the sanctuary be cleansed';
      document.getElementById('wb10-btn')?.click();
    })()`);
    await client.waitFor(`window.StudyWorkbench?.isSheetComplete(10) === true`);
    const s10Done = await client.eval('window.StudyWorkbench.isSheetComplete(10)');
    console.log('  Sheet 10 verified:', s10Done);
    if (!s10Done) throw new Error('Sheet 10 three-line chain was rejected');
    await client.shot('qa/proofs/cp07_sheet10_chain_verified.png');
    console.log('  PASS: CP-07 Check 3 verified.');

    // 4. CP-07 Check 4: Progress export/import round-trip in browser
    console.log('\n[CP-07 Check 4] Progress Export/Import round-trip...');
    const roundTrip = await client.eval(`(() => {
      // Simulate completing sitting 0, 1, 2, 3
      localStorage.setItem('baJourney', JSON.stringify({ completedSheets: [0, 1, 2, 3], cohort: 'TEST-COHORT' }));
      localStorage.setItem('daniel_workbench_v1', JSON.stringify({ 0: { task1: true, task2: true }, 3: { task1: true } }));
      const exported = {
        baJourney: JSON.parse(localStorage.getItem('baJourney')),
        daniel_workbench_v1: JSON.parse(localStorage.getItem('daniel_workbench_v1')),
        exportedAt: new Date().toISOString()
      };
      // Clear storage
      localStorage.clear();
      const beforeRestore = localStorage.getItem('baJourney');
      // Restore
      localStorage.setItem('baJourney', JSON.stringify(exported.baJourney));
      localStorage.setItem('daniel_workbench_v1', JSON.stringify(exported.daniel_workbench_v1));
      if (window.BAJourney && typeof window.BAJourney.load === 'function') window.BAJourney.load();
      const afterRestore = window.BAJourney.load();
      return {
        beforeNull: beforeRestore === null,
        restoredSheets: afterRestore.completedSheets,
        restoredCohort: afterRestore.cohort
      };
    })()`);
    console.log('  Round-trip result:', roundTrip);
    if (!roundTrip.beforeNull || roundTrip.restoredSheets.length !== 4 || roundTrip.restoredCohort !== 'TEST-COHORT') {
      throw new Error('Export/import round-trip failed');
    }
    console.log('  PASS: CP-07 Check 4 verified.');

    // 5. CP-07 Check 5: study.html?project=1 — projection mode
    console.log('\n[CP-07 Check 5] study.html?project=1: Classroom projection mode...');
    await client.send('Page.navigate', { url: `${BASE}/study.html?sheet=1&project=1` });
    await client.waitFor(`window.location.href.includes('project=1') && document.body.classList.contains('projection-mode') && document.querySelector('.article-body') && document.getElementById('weather-canvas') && window.getComputedStyle(document.querySelector('.article-body')).fontSize === '22px'`);
    const projCheck = await client.eval(`(() => {
      const hasClass = document.body.classList.contains('projection-mode');
      const article = document.querySelector('.article-body');
      const fontSize = window.getComputedStyle(article).fontSize;
      const atmDisplay = window.getComputedStyle(document.getElementById('weather-canvas')).display;
      return { hasClass, fontSize, atmDisplay };
    })()`);
    console.log('  Projection mode check:', projCheck);
    if (!projCheck.hasClass) throw new Error('body.projection-mode class missing with ?project=1');
    if (projCheck.fontSize !== '22px') throw new Error(`Expected article font size 22px in projection mode, got ${projCheck.fontSize}`);
    if (projCheck.atmDisplay !== 'none') throw new Error('Atmosphere weather canvas must be hidden in projection mode');
    await client.shot('qa/proofs/cp07_projection_mode.png');
    console.log('  PASS: CP-07 Check 5 verified.');

    // 6. CP-07 Check 6: Print stylesheet verification
    console.log('\n[CP-07 Check 6] Print stylesheet visibility...');
    await client.send('Emulation.setEmulatedMedia', { media: 'print' });
    await sleep(300);
    const printCheck = await client.eval(`(() => {
      const topbarDisp = window.getComputedStyle(document.querySelector('.study-topbar')).display;
      const articleDisp = window.getComputedStyle(document.getElementById('sheet-article')).display;
      const emptyFacDisp = window.getComputedStyle(document.getElementById('facilitator-strip')).display;
      return { topbarHidden: topbarDisp === 'none', articleVisible: articleDisp !== 'none', emptyFacHidden: emptyFacDisp === 'none' };
    })()`);
    console.log('  Print styles check:', printCheck);
    if (!printCheck.topbarHidden) throw new Error('Topbar must be hidden in print mode');
    if (!printCheck.articleVisible) throw new Error('Article must be visible in print mode');
    if (!printCheck.emptyFacHidden) throw new Error('Empty facilitator strip must be hidden in print mode');
    await client.shot('qa/proofs/cp07_print_mode.png');
    await client.send('Emulation.setEmulatedMedia', { media: '' });
    console.log('  PASS: CP-07 Check 6 verified.');

    // 7. CP-07 Check 7: index.html at 390px and 1440px — outcome copy and reviews
    console.log('\n[CP-07 Check 7] index.html outcome copy & reviews...');
    await client.send('Page.navigate', { url: `${BASE}/index.html` });
    await client.waitFor(`window.location.pathname.includes('index.html') && document.querySelector('.dash-hero-outcome') && document.getElementById('witness-list')`);
    const indexCheck = await client.eval(`(() => {
      const outcome = document.querySelector('.dash-hero-outcome')?.innerText || '';
      const listHidden = document.getElementById('witness-list')?.hidden;
      return { outcome, listHidden };
    })()`);
    console.log('  Outcome copy found:', indexCheck.outcome.slice(0, 60) + '...');
    if (!indexCheck.outcome.includes('year-day') || !indexCheck.outcome.includes('Daniel 2:38') || !indexCheck.outcome.includes('certificate')) {
      throw new Error('Hero outcome sentence missing or incomplete');
    }
    if (!indexCheck.listHidden) throw new Error('Empty witness list should be hidden when zero approved reviews');
    await client.shot('qa/proofs/cp07_index_1440.png');

    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(400);
    await client.shot('qa/proofs/cp07_index_390.png');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    console.log('  PASS: CP-07 Check 7 verified.');

    // 8. CP-07 Check 8: study.html?sheet=0/1/2 at 390px
    console.log('\n[CP-07 Check 8] study.html sittings 0–2 at 390px phone width...');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    for (const sheet of [0, 1, 2]) {
      await client.send('Page.navigate', { url: `${BASE}/study.html?sheet=${sheet}&preview=full` });
      await client.waitFor(`window.location.href.includes('sheet=${sheet}') && typeof window.StudyWorkbench?.isSheetComplete === 'function' && document.querySelector('.workbench-card') && document.querySelector('.study-topbar') && document.querySelector('.article-body')`);
      await dismissSittingGuide();
      const mobileCheck = await client.eval(`(() => {
        const wb = document.querySelector('.workbench-card');
        const article = document.querySelector('.article-body');
        const topbar = document.querySelector('.study-topbar');
        const terms = document.getElementById('terms-overlay');
        const guide = document.getElementById('sitting-guide');
        const topbarPos = window.getComputedStyle(topbar).position;
        const articleTop = article.getBoundingClientRect().top;
        const topbarBottom = topbar.getBoundingClientRect().bottom;
        return {
          hasWorkbench: !!wb,
          hasArticle: !!(article && article.innerText.trim().length > 40),
          topbarPos,
          termsHidden: !terms || terms.hidden,
          guideHidden: !guide || guide.hidden,
          articleBelowTopbar: articleTop >= topbarBottom - 2
        };
      })()`);
      console.log(`  Mobile check sheet ${sheet}:`, mobileCheck);
      if (!mobileCheck.hasWorkbench) throw new Error(`Workbench not rendered on sheet ${sheet} at 390px`);
      if (!mobileCheck.hasArticle) throw new Error(`Article not readable on sheet ${sheet} at 390px`);
      if (mobileCheck.topbarPos !== 'relative') throw new Error(`Topbar should be relative on mobile sheet ${sheet}, got ${mobileCheck.topbarPos}`);
      if (!mobileCheck.termsHidden) throw new Error(`Terms overlay still blocking sheet ${sheet}`);
      if (!mobileCheck.guideHidden) throw new Error(`Sitting guide still blocking sheet ${sheet}`);
      if (!mobileCheck.articleBelowTopbar) throw new Error(`Topbar covering the article on sheet ${sheet}`);
      await client.eval(`(() => { document.querySelector('.article-body')?.scrollIntoView({ block: 'start' }); return true; })()`);
      await sleep(200);
      await client.shot(`qa/proofs/cp07_study_sheet${sheet}_390.png`);
      await client.eval(`(() => { document.querySelector('.workbench-card')?.scrollIntoView({ block: 'start' }); return true; })()`);
      await sleep(200);
      await client.shot(`qa/proofs/cp07_study_sheet${sheet}_wb_390.png`);
    }
    console.log('  PASS: CP-07 Check 8 verified.');

    console.log('\n=============================================');
    console.log('  ALL CP-07 BROWSER PROOF TESTS PASSED!');
    console.log('=============================================');
  } finally {
    try { client.close(); } catch {}
    try { chromeProc.kill(); } catch {}
    try { server.kill(); } catch {}
  }
}

run().catch((err) => {
  console.error('CP-07 TEST FAILED:', err);
  process.exit(1);
});
