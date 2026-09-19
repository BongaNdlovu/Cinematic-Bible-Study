import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

const CHROME_PATH = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));

const SERVER_PORT = 8013;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];

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
      } else if (data.method === 'Runtime.consoleAPICalled' || data.method === 'Runtime.exceptionThrown') {
        if (data.params.type === 'error' || data.method === 'Runtime.exceptionThrown') {
          this.consoleErrors.push(data.params);
        }
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
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async captureScreenshot(outPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function verifyChristologyData() {
  console.log('=== Checking sheetsData Christology Content ===');
  const sheetsFile = fs.readFileSync('js/study/sheets-data.js', 'utf8');
  const vm = await import('vm');
  const sheets = vm.runInNewContext(sheetsFile + '\nsheetsData;', {});
  if (!Array.isArray(sheets) || sheets.length !== 11) {
    throw new Error(`Expected 11 sheets in sheetsData, found ${sheets ? sheets.length : 'none'}`);
  }

  const apocryphaTerms = [
    'Maccabees', 'Tobit', 'Judith', 'Sirach', 'Ecclesiasticus',
    'Baruch', 'Wisdom of Solomon', 'Bel and the Dragon', 'Susanna', '1 Esdras', '2 Esdras'
  ];

  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    if (!s.christology) {
      throw new Error(`Sheet ${i} is missing christology object`);
    }
    const c = s.christology;
    if (c.kicker !== 'Christology') {
      throw new Error(`Sheet ${i} christology kicker must be 'Christology', got '${c.kicker}'`);
    }
    if (!c.title || typeof c.title !== 'string') {
      throw new Error(`Sheet ${i} christology title is invalid`);
    }
    if (!c.scripture || typeof c.scripture !== 'string') {
      throw new Error(`Sheet ${i} christology scripture is invalid`);
    }
    if (!Array.isArray(c.body) || c.body.length !== 3) {
      throw new Error(`Sheet ${i} christology body must have exactly 3 paragraphs, got ${c.body ? c.body.length : 0}`);
    }

    const fullText = `${c.kicker} ${c.title} ${c.scripture} ${c.body.join(' ')}`;
    for (const term of apocryphaTerms) {
      if (new RegExp(`\\b${term}\\b`, 'i').test(fullText)) {
        throw new Error(`Forbidden apocryphal book reference in Sheet ${i} Christology: ${term}`);
      }
    }
    console.log(`  [Sheet ${i}] Christology: "${c.title}" (${c.scripture}) - 3 paragraphs OK`);
  }
  console.log('PASS: All 11 sheets have valid 3-paragraph Christology plaques conforming to 66-book canon.');
}

async function verifySitting(client, sitting) {
  console.log(`\n--- Testing Sitting ${sitting.index} ---`);
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html?sheet=${sitting.index}` });
  await sleep(2000);

  const inspection = await client.eval(`(() => {
    const noShowOnMap = !document.getElementById('btn-show-on-map');
    const noViewArtifact = !document.getElementById('btn-view-artifact');
    const noDock = !document.getElementById('sitting-dock');
    const noStageWrap = !document.getElementById('sitting-stage-wrap');
    const noMapWrap = !document.getElementById('sitting-map-wrap');
    const noStudyStage = !document.getElementById('study-stage');
    const noStudyMap = !document.getElementById('study-chronicle-map');

    const steps = Array.from(document.querySelectorAll('#sitting-path-steps li button')).map(b => b.textContent.trim());

    const mapBtn = document.getElementById('btn-lesson-map');
    const galleryBtn = document.getElementById('btn-lesson-gallery');
    const mapHref = mapBtn ? mapBtn.getAttribute('href') : null;
    const galleryHref = galleryBtn ? galleryBtn.getAttribute('href') : null;

    const christologySection = document.getElementById('sheet-christology');
    const christologyVisible = christologySection && !christologySection.hidden;
    const christologyKicker = document.querySelector('#sheet-christology .uppercase')?.textContent.trim();
    const christologyTitle = document.getElementById('christology-title')?.textContent.trim();
    const christologyScripture = document.getElementById('christology-scripture')?.textContent.trim();
    const bodyParagraphs = document.querySelectorAll('#christology-body p').length;

    const article = document.getElementById('sheet-article');
    const connect = document.getElementById('lesson-connect');
    const christology = document.getElementById('sheet-christology');
    const recap = document.getElementById('sheet-recap');
    const quiz = document.getElementById('revision-section') || document.getElementById('quiz-container');

    const isOrdered = article && connect && christology && recap && quiz &&
      (article.compareDocumentPosition(connect) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (connect.compareDocumentPosition(christology) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (christology.compareDocumentPosition(recap) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (recap.compareDocumentPosition(quiz) & Node.DOCUMENT_POSITION_FOLLOWING);

    return {
      noShowOnMap,
      noViewArtifact,
      noDock,
      noStageWrap,
      noMapWrap,
      noStudyStage,
      noStudyMap,
      steps,
      mapHref,
      galleryHref,
      christologyVisible,
      christologyKicker,
      christologyTitle,
      christologyScripture,
      bodyParagraphs,
      isOrdered: !!isOrdered
    };
  })()`);

  console.log(`Sitting ${sitting.index} Inspection:`, inspection);

  if (!inspection.noShowOnMap || !inspection.noViewArtifact) {
    throw new Error(`Sitting ${sitting.index}: top Show on map / View artifact buttons still present!`);
  }
  if (!inspection.noDock || !inspection.noStageWrap || !inspection.noMapWrap || !inspection.noStudyStage || !inspection.noStudyMap) {
    throw new Error(`Sitting ${sitting.index}: in-page stage/map dock or element still present!`);
  }

  if (inspection.steps.length !== 3 || !inspection.steps[0].includes('Study') || !inspection.steps[1].includes('Questions') || !inspection.steps[2].includes('Next')) {
    throw new Error(`Sitting ${sitting.index}: sitting path steps invalid: ${JSON.stringify(inspection.steps)}`);
  }

  const expectedMapHref = `map.html?year=${sitting.mapYear}&from=lesson&sheet=${sitting.index}`;
  const expectedGalHref = `gallery.html?asset=${sitting.galleryAsset}&from=lesson&sheet=${sitting.index}`;

  if (inspection.mapHref !== expectedMapHref) {
    throw new Error(`Sitting ${sitting.index}: mapHref mismatch. Expected ${expectedMapHref}, got ${inspection.mapHref}`);
  }
  if (inspection.galleryHref !== expectedGalHref) {
    throw new Error(`Sitting ${sitting.index}: galleryHref mismatch. Expected ${expectedGalHref}, got ${inspection.galleryHref}`);
  }

  if (!inspection.christologyVisible || !inspection.christologyTitle || !inspection.christologyScripture || inspection.bodyParagraphs !== 3) {
    throw new Error(`Sitting ${sitting.index}: Christology plaque incomplete or not visible (paragraphs: ${inspection.bodyParagraphs})`);
  }

  if (!inspection.isOrdered) {
    throw new Error(`Sitting ${sitting.index}: DOM order is incorrect!`);
  }

  await client.captureScreenshot(`qa/proofs/study_sitting_${sitting.index}.png`);
}

async function verifyThemesAndMobile(client) {
  console.log('\n=== Testing Themes (Paper / Charcoal) on Sitting 2 ===');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html?sheet=2` });
  await sleep(1500);

  await client.eval(`document.documentElement.classList.remove('dark')`);
  await sleep(300);
  await client.captureScreenshot('qa/proofs/study_sitting_2_paper.png');

  await client.eval(`document.documentElement.classList.add('dark')`);
  await sleep(300);
  await client.captureScreenshot('qa/proofs/study_sitting_2_charcoal.png');
  console.log('PASS: Captured paper and charcoal theme screenshots.');

  console.log('\n=== Testing 390px Viewport on Sitting 7 ===');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html?sheet=7` });
  await sleep(1500);

  const mobileButtons = await client.eval(`(() => {
    const mapBtn = document.getElementById('btn-lesson-map');
    const galBtn = document.getElementById('btn-lesson-gallery');
    if (!mapBtn || !galBtn) return false;
    const r1 = mapBtn.getBoundingClientRect();
    const r2 = galBtn.getBoundingClientRect();
    return {
      mapVisible: r1.width > 0 && r1.height > 0,
      galVisible: r2.width > 0 && r2.height > 0,
      mapText: mapBtn.innerText.trim(),
      galText: galBtn.innerText.trim()
    };
  })()`);

  console.log('Mobile 390px buttons:', mobileButtons);
  if (!mobileButtons || !mobileButtons.mapVisible || !mobileButtons.galVisible) {
    throw new Error('Mobile 390px viewport: buttons not properly visible!');
  }
  await client.captureScreenshot('qa/proofs/study_sitting_7_mobile390.png');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
}

async function verifyMapReturn(client) {
  console.log('\n=== Testing map.html Return to Lesson ===');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/map.html?year=y538&from=lesson&sheet=7` });
  await sleep(2500);

  const mapReturnCheck = await client.eval(`(() => {
    const back = document.querySelector('.cmap-back');
    const galLink = document.querySelector('.cmap-links a[href*="gallery.html"]');
    return {
      exists: !!back,
      text: back ? back.textContent.trim() : null,
      href: back ? back.getAttribute('href') : null,
      galHref: galLink ? galLink.getAttribute('href') : null
    };
  })()`);

  console.log('map.html return check:', mapReturnCheck);
  if (!mapReturnCheck.exists || mapReturnCheck.text !== '← Back to this lesson') {
    throw new Error(`map.html: Expected '← Back to this lesson', got '${mapReturnCheck.text}'`);
  }
  if (mapReturnCheck.href !== 'study.html?sheet=7#sheet-article') {
    throw new Error(`map.html: Expected href 'study.html?sheet=7#sheet-article', got '${mapReturnCheck.href}'`);
  }
  if (!mapReturnCheck.galHref || !mapReturnCheck.galHref.includes('from=lesson&sheet=7')) {
    throw new Error(`map.html: Gallery link failed to preserve lesson context: ${mapReturnCheck.galHref}`);
  }
  await client.captureScreenshot('qa/proofs/map_lesson_return.png');

  // Verify actual return navigation to study.html?sheet=7#sheet-article and scroll positioning
  console.log('Testing return navigation to study.html?sheet=7#sheet-article and scroll positioning...');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html?sheet=7#sheet-article` });
  await sleep(2500);
  const returnScrollCheck = await client.eval(`(() => {
    const el = document.getElementById('sheet-article');
    const r = el ? el.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      articleTop: r ? Math.round(r.top) : null
    };
  })()`);
  console.log('return scroll check on study.html:', returnScrollCheck);
  if (returnScrollCheck.scrollY <= 0) {
    throw new Error(`study.html failed to scroll to #sheet-article; scrollY is ${returnScrollCheck.scrollY}`);
  }
  if (returnScrollCheck.articleTop === null || returnScrollCheck.articleTop > 120) {
    throw new Error(`study.html #sheet-article not in view; articleTop is ${returnScrollCheck.articleTop}`);
  }

  // Test map.html with invalid sheet param -> graceful fallback to generic
  await client.send('Page.navigate', { url: `${SERVER_BASE}/map.html?from=lesson&sheet=abc` });
  await sleep(2000);
  const mapInvalidCheck = await client.eval(`(() => {
    const back = document.querySelector('.cmap-back');
    return {
      text: back ? back.textContent.trim() : null,
      href: back ? back.getAttribute('href') : null
    };
  })()`);
  console.log('map.html invalid sheet fallback check:', mapInvalidCheck);
  if (mapInvalidCheck.text !== '← Study desk' || mapInvalidCheck.href !== 'study.html') {
    throw new Error(`map.html invalid sheet: Expected fallback to '← Study desk', got '${mapInvalidCheck.text}' -> '${mapInvalidCheck.href}'`);
  }

  await client.send('Page.navigate', { url: `${SERVER_BASE}/map.html?year=y538` });
  await sleep(2000);
  const mapGenericCheck = await client.eval(`(() => {
    const back = document.querySelector('.cmap-back');
    return {
      text: back ? back.textContent.trim() : null,
      href: back ? back.getAttribute('href') : null
    };
  })()`);
  console.log('map.html generic check:', mapGenericCheck);
  if (mapGenericCheck.text !== '← Study desk' || mapGenericCheck.href !== 'study.html') {
    throw new Error(`map.html generic: Expected '← Study desk' pointing to 'study.html', got '${mapGenericCheck.text}' -> '${mapGenericCheck.href}'`);
  }
}

async function verifyGalleryReturn(client) {
  console.log('\n=== Testing gallery.html Return to Lesson & Pinned Sheet ===');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/gallery.html?asset=years1260&from=lesson&sheet=7` });
  await sleep(3500);

  const galleryReturnCheck = await client.eval(`(() => {
    const topBack = document.getElementById('gallery-back-lesson');
    const topDisplay = topBack ? window.getComputedStyle(topBack).display : null;
    const genericStudy = document.getElementById('gallery-study-link');
    const genericDisplay = genericStudy ? window.getComputedStyle(genericStudy).display : null;
    const narLink = document.getElementById('nar-study-link');
    const narMapLink = document.getElementById('nar-map-link');
    const topMapLink = document.getElementById('gallery-map-link');

    return {
      topExists: !!topBack,
      topDisplay,
      topText: topBack ? topBack.textContent.trim() : null,
      topHref: topBack ? topBack.getAttribute('href') : null,
      genericHidden: genericDisplay === 'none',
      narText: narLink ? narLink.textContent.trim() : null,
      narHref: narLink ? narLink.getAttribute('href') : null,
      narMapHref: narMapLink ? narMapLink.getAttribute('href') : null,
      topMapHref: topMapLink ? topMapLink.getAttribute('href') : null
    };
  })()`);

  console.log('gallery.html return check (initial asset):', galleryReturnCheck);
  if (!galleryReturnCheck.topExists || galleryReturnCheck.topDisplay === 'none' || galleryReturnCheck.topText !== '← Back to this lesson') {
    throw new Error(`gallery.html: header back button invalid: ${JSON.stringify(galleryReturnCheck)}`);
  }
  if (galleryReturnCheck.topHref !== 'study.html?sheet=7#sheet-article') {
    throw new Error(`gallery.html: header back href mismatch: ${galleryReturnCheck.topHref}`);
  }
  if (!galleryReturnCheck.genericHidden) {
    throw new Error('gallery.html: generic study link was not hidden when arriving from lesson');
  }
  if (!galleryReturnCheck.narText.includes('← Back to this lesson') || galleryReturnCheck.narHref !== 'study.html?sheet=7#sheet-article') {
    throw new Error(`gallery.html: dossier study link mismatch: ${galleryReturnCheck.narText} -> ${galleryReturnCheck.narHref}`);
  }
  if (!galleryReturnCheck.narMapHref || !galleryReturnCheck.narMapHref.includes('from=lesson&sheet=7')) {
    throw new Error(`gallery.html: dossier map link failed to preserve lesson context: ${galleryReturnCheck.narMapHref}`);
  }
  if (!galleryReturnCheck.topMapHref || !galleryReturnCheck.topMapHref.includes('from=lesson&sheet=7')) {
    throw new Error(`gallery.html: top nav map link failed to preserve lesson context: ${galleryReturnCheck.topMapHref}`);
  }

  console.log('Selecting another artifact (stone) to verify return href persistence...');
  await client.eval(`(() => {
    const stoneCard = document.querySelector('.artifact-card-item[data-asset="stone"]');
    if (stoneCard) stoneCard.click();
  })()`);
  await sleep(2000);

  const pinnedCheck = await client.eval(`(() => {
    const narLink = document.getElementById('nar-study-link');
    const topBack = document.getElementById('gallery-back-lesson');
    const narMapLink = document.getElementById('nar-map-link');
    return {
      topHref: topBack ? topBack.getAttribute('href') : null,
      narText: narLink ? narLink.textContent.trim() : null,
      narHref: narLink ? narLink.getAttribute('href') : null,
      narMapHref: narMapLink ? narMapLink.getAttribute('href') : null
    };
  })()`);

  console.log('gallery.html return check after selecting stone:', pinnedCheck);
  if (pinnedCheck.topHref !== 'study.html?sheet=7#sheet-article' || pinnedCheck.narHref !== 'study.html?sheet=7#sheet-article') {
    throw new Error(`gallery.html: Return link failed to stay pinned to lesson 7 after switching asset: ${JSON.stringify(pinnedCheck)}`);
  }
  if (!pinnedCheck.narMapHref || !pinnedCheck.narMapHref.includes('from=lesson&sheet=7')) {
    throw new Error(`gallery.html: dossier map link failed to keep lesson context after switching asset: ${pinnedCheck.narMapHref}`);
  }
  await client.captureScreenshot('qa/proofs/gallery_lesson_return_pinned.png');

  // Test invalid sheet fallback in gallery
  await client.send('Page.navigate', { url: `${SERVER_BASE}/gallery.html?from=lesson&sheet=abc` });
  await sleep(3000);
  const galleryInvalidCheck = await client.eval(`(() => {
    const topBack = document.getElementById('gallery-back-lesson');
    const topDisplay = topBack ? window.getComputedStyle(topBack).display : null;
    return {
      topHidden: topDisplay === 'none'
    };
  })()`);
  console.log('gallery.html invalid sheet check:', galleryInvalidCheck);
  if (!galleryInvalidCheck.topHidden) {
    throw new Error('gallery.html invalid sheet: top back button was not hidden');
  }

  await client.send('Page.navigate', { url: `${SERVER_BASE}/gallery.html?asset=stone` });
  await sleep(3000);
  const galleryGenericCheck = await client.eval(`(() => {
    const topBack = document.getElementById('gallery-back-lesson');
    const topDisplay = topBack ? window.getComputedStyle(topBack).display : null;
    const genericStudy = document.getElementById('gallery-study-link');
    const genericDisplay = genericStudy ? window.getComputedStyle(genericStudy).display : null;
    const narLink = document.getElementById('nar-study-link');

    return {
      topHidden: topDisplay === 'none',
      genericVisible: genericDisplay !== 'none',
      narText: narLink ? narLink.textContent.trim() : null,
      narHref: narLink ? narLink.getAttribute('href') : null
    };
  })()`);

  console.log('gallery.html generic check:', galleryGenericCheck);
  if (!galleryGenericCheck.topHidden || !galleryGenericCheck.genericVisible) {
    throw new Error('gallery.html generic: header controls not in generic state');
  }
  if (galleryGenericCheck.narText.includes('← Back to this lesson')) {
    throw new Error('gallery.html generic: dossier button shows lesson return in generic mode');
  }
}

async function run() {
  await verifyChristologyData();

  console.log('\n=== Starting Python Server ===');
  const server = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: 'pipe'
  });

  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${SERVER_BASE}/study.html`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await sleep(200);
  }

  if (!serverReady) {
    server.kill();
    throw new Error('Python server did not start in time');
  }
  console.log(`PASS: Python server ready at ${SERVER_BASE}`);

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1440,900',
    'about:blank'
  ]);

  await sleep(1500);

  let client;
  try {
    const listRes = await fetch('http://127.0.0.1:9223/json');
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension://')) || targets[0];
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('Chrome target not found');
    }

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('\n=== Verifying Sittings 0, 2, 7, 10 on study.html ===');
    const testSittings = [
      { index: 0, mapYear: 'y605', galleryAsset: 'assembled' },
      { index: 2, mapYear: 'y605', galleryAsset: 'head' },
      { index: 7, mapYear: 'y538', galleryAsset: 'leopard' },
      { index: 10, mapYear: 'y12', galleryAsset: 'kings' }
    ];

    for (const sitting of testSittings) {
      await verifySitting(client, sitting);
    }

    await verifyThemesAndMobile(client);
    await verifyMapReturn(client);
    await verifyGalleryReturn(client);

    console.log('\n=== Console Error Audit ===');
    console.log(`Console error count: ${client.consoleErrors.length}`);
    if (client.consoleErrors.length > 0) {
      console.error('Console errors:', JSON.stringify(client.consoleErrors, null, 2));
      throw new Error(`Unexpected console errors during execution: ${client.consoleErrors.length}`);
    }

    console.log('\n========================================');
    console.log('SUCCESS: All lesson connectors & Christology tests passed cleanly!');
    console.log('========================================');

  } finally {
    if (client) client.close();
    chromeProc.kill();
    server.kill();
  }
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
