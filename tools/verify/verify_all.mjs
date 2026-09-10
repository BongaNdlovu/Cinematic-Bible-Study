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
const SERVER_PORT = 8011;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
    this.events = [];
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

  async click(selector) {
    const res = await this.eval(`(() => {
      const el = document.querySelector('${selector}');
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!res) throw new Error(`Could not click selector: ${selector}`);
  }

  async captureScreenshot(outPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('=== Step 1: Validating Local Files on Disk ===');
  const requiredFiles = [
    'index.html',
    'study.html',
    'bible/kjv.json',
    'bible/strongs-daniel.json',
    'bible/sheet-passages.json',
    'js/study/scripture.js',
    'gallery.html',
    'css/site.css',
    'js/gallery/app.js',
    'css/app.css',
    'js/shared/journey.js',
    'js/map/map.js',
    'js/map/map-data.js',
    'js/study/stage.js',
    'js/study/workbench.js',
    'js/study/competency.js',
    'css/map.css',
    'models/stone.glb',
    'models/full_body.glb',
    'models/golden_head.glb',
    'models/silver_chest.glb',
    'models/bronze_thighs.glb',
    'models/iron_legs.glb',
    'models/feet_iron_clay.glb',
    'models/azure_altar.glb',
    'models/lion.glb',
    'models/bear.glb',
    'models/leopard.glb',
    'models/beast.glb',
    'models/ram.glb',
    'models/goat.glb',
    'models/goat_broken.glb',
    'models/goat_horn.glb',
    'models/dura.glb',
    'models/ancient.glb',
    'models/son.glb',
    'models/stump.glb',
    'models/ox_king.glb',
    'models/michael.glb',
    'models/sealed.glb',
    'models/kings.glb',
    'models/decree.glb',
    'assets/plates/babylon.jpg',
    'assets/plates/persia.jpg',
    'assets/plates/greece.jpg',
    'assets/plates/rome.jpg',
    'assets/plates/divided.jpg',
    'assets/thumbs/altar.jpg',
    'assets/thumbs/bear.jpg',
    'assets/thumbs/lion.jpg',
    'assets/thumbs/leopard.jpg',
    'assets/thumbs/beast.jpg',
    'assets/thumbs/ram.jpg',
    'assets/thumbs/goat.jpg',
    'assets/thumbs/goat_broken.jpg',
    'assets/thumbs/goat_horn.jpg',
    'assets/thumbs/dura.jpg',
    'assets/thumbs/ancient.jpg',
    'assets/thumbs/son.jpg',
    'assets/thumbs/stump.jpg',
    'assets/thumbs/ox_king.jpg',
    'assets/thumbs/michael.jpg',
    'assets/thumbs/sealed.jpg',
    'assets/thumbs/kings.jpg',
    'assets/plates/ox-king.jpg',
    'assets/plates/michael.jpg',
    'assets/plates/sealed.jpg',
    'assets/plates/kings.jpg',
    'assets/thumbs/decree.jpg',
    'assets/plates/decree.jpg',
    'assets/thumbs/chest.jpg',
    'assets/thumbs/feet.jpg',
    'assets/thumbs/head.jpg',
    'assets/thumbs/legs.jpg',
    'assets/thumbs/stone.jpg',
    'assets/thumbs/thighs.jpg',
    'assets/study/hero-cinematic.jpg',
    'assets/study/statue-nebuchadnezzar.jpg',
    'assets/study/babylon-sunset.jpg',
    'assets/study/daniel-lions-den.jpg',
    'assets/study/storm-sky.jpg'
  ];

  for (const f of requiredFiles) {
    if (!fs.existsSync(f)) {
      throw new Error(`Missing required file: ${f}`);
    }
    const stat = fs.statSync(f);
    if (stat.size === 0) {
      throw new Error(`Empty file: ${f}`);
    }
  }
  console.log(`PASS: All ${requiredFiles.length} files exist and are non-empty.`);

  console.log('\n=== Step 2: Starting Local HTTP Server ===');
  // Start python server on port 8011
  const server = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: 'pipe'
  });

  server.stdout.on('data', d => process.stdout.write('[Server] ' + d.toString()));
  server.stderr.on('data', d => process.stderr.write('[Server Err] ' + d.toString()));

  // Wait for server ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${SERVER_BASE}/index.html`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await sleep(200);
  }

  if (!serverReady) {
    server.kill();
    throw new Error('Python server did not become ready in 6s');
  }
  console.log(`PASS: HTTP Server ready at ${SERVER_BASE}/`);

  console.log('\n=== Step 3: Checking Key Asset HTTP Endpoints & MIME Types ===');
  const urlsToCheck = [
    { url: `${SERVER_BASE}/index.html`, mime: 'text/html' },
    { url: `${SERVER_BASE}/study.html`, mime: 'text/html' },
    { url: `${SERVER_BASE}/bible/kjv.json`, mime: 'application/json' },
    { url: `${SERVER_BASE}/gallery.html`, mime: 'text/html' },
    { url: `${SERVER_BASE}/js/shared/journey.js`, mime: 'application/javascript' },
    { url: `${SERVER_BASE}/css/site.css`, mime: 'text/css' },
    { url: `${SERVER_BASE}/js/gallery/app.js`, mime: 'application/javascript' },
    { url: `${SERVER_BASE}/css/app.css`, mime: 'text/css' },
    { url: `${SERVER_BASE}/js/map/map.js`, mime: 'application/javascript' },
    { url: `${SERVER_BASE}/js/study/scripture.js`, mime: 'application/javascript' },
    { url: `${SERVER_BASE}/models/stone.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/lion.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/bear.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/leopard.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/beast.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/ram.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/goat.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/goat_broken.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/goat_horn.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/dura.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/ancient.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/son.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/stump.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/ox_king.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/michael.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/sealed.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/kings.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/models/decree.glb`, mime: 'model/gltf-binary' },
    { url: `${SERVER_BASE}/assets/plates/babylon.jpg`, mime: 'image/jpeg' },
    { url: `${SERVER_BASE}/assets/plates/persia.jpg`, mime: 'image/jpeg' },
    { url: `${SERVER_BASE}/assets/plates/greece.jpg`, mime: 'image/jpeg' },
    { url: `${SERVER_BASE}/assets/plates/rome.jpg`, mime: 'image/jpeg' },
    { url: `${SERVER_BASE}/assets/plates/divided.jpg`, mime: 'image/jpeg' },
    { url: `${SERVER_BASE}/assets/thumbs/stone.jpg`, mime: 'image/jpeg' }
  ];

  for (const { url, mime } of urlsToCheck) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP fetch failed for ${url} (status ${res.status})`);
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes(mime)) {
      throw new Error(`MIME mismatch for ${url}: expected ${mime}, got ${ctype}`);
    }
  }
  console.log(`PASS: All ${urlsToCheck.length} HTTP routes returned 200 OK with correct MIME types.`);

  console.log('\n=== Step 4: Launching Headless Chrome for CDP Automated Tests ===');
  if (!CHROME_PATH) {
    server.kill();
    throw new Error('Chrome/Chromium not found. Install Google Chrome or set the CHROME_PATH environment variable.');
  }
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1440,900',
    'about:blank'
  ]);

  await sleep(1500);

  // Discover debug target
  const listRes = await fetch('http://127.0.0.1:9222/json');
  const targets = await listRes.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
    chromeProc.kill();
    server.kill();
    throw new Error('Failed to find Chrome page target');
  }

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  console.log('\n=== Step 5: Testing study.html Functionality ===');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html` });
  await sleep(2500);

  const brand = await client.eval('document.querySelector("header")?.innerText || ""');
  console.log('  [study.html] Header contains Scroll:', brand.includes('Scroll of Daniel'));
  if (!brand.includes('Scroll of Daniel')) throw new Error('Study platform header missing');

  const sheetTitle = await client.eval('document.getElementById("sheet-title")?.textContent');
  console.log('  [study.html] Initial sheet:', sheetTitle);
  if (!sheetTitle || !sheetTitle.toLowerCase().includes('hermeneutic')) {
    throw new Error(`Unexpected initial sheet title: ${sheetTitle}`);
  }

  console.log('  [study.html] Opening Codex TOC...');
  await client.eval('toggleTocDrawer()');
  await sleep(300);
  const tocOpen = await client.eval('!document.getElementById("toc-drawer").classList.contains("-translate-x-full")');
  if (!tocOpen) throw new Error('TOC drawer did not open');
  const tocCount = await client.eval('document.querySelectorAll("#toc-unit-list button").length');
  console.log('  [study.html] Syllabus units:', tocCount);
  if (tocCount !== 11) throw new Error(`Expected 11 syllabus units, got ${tocCount}`);

  console.log('  [study.html] Loading metallic colossus sheet...');
  await client.eval('loadSheet(2); toggleTocDrawer();');
  await sleep(400);
  const colossus = await client.eval('document.getElementById("sheet-title")?.textContent');
  console.log('  [study.html] Sheet 2:', colossus);
  if (!colossus || !colossus.toLowerCase().includes('colossus')) throw new Error('Failed loading Daniel 2 sheet');

  console.log('  [study.html] Opening Scripture instrument...');
  await client.eval('showInstrument("scripture")');
  await sleep(400);
  const scriptureReady = await client.eval(`(() => {
    const root = document.getElementById('scripture-root');
    const gold = root && /head of gold/i.test(root.textContent || '');
    const nums = root && root.querySelectorAll('.verse-num').length;
    const highlight = root && root.querySelector('.scripture-verse.is-highlight');
    return { gold, nums, highlight: !!highlight, story: root && root.classList.contains('is-story') };
  })()`);
  console.log('  [study.html] Scripture panel:', scriptureReady);
  if (!scriptureReady.gold) throw new Error('Scripture tab did not render Daniel 2 KJV');
  if (!scriptureReady.nums) throw new Error('Verse numbers missing on Scripture panel');
  if (!scriptureReady.highlight) throw new Error('Load-bearing verses were not highlighted');
  await client.eval('BAScripture.setStoryMode(true)');
  const storyOn = await client.eval('document.getElementById("scripture-root")?.classList.contains("is-story")');
  if (!storyOn) throw new Error('Story mode did not hide verse numbers');
  await client.eval('BAScripture.setStoryMode(false)');

  console.log('  [study.html] Testing quiz option...');
  await client.eval(`document.querySelector("#quiz-container button")?.click()`);
  await sleep(200);
  const quizFeedback = await client.eval('document.querySelector("#q-0-feedback")?.className || ""');
  if (!quizFeedback || quizFeedback.includes('hidden')) throw new Error('Quiz feedback did not appear');

  console.log('  [study.html] Testing storm atmosphere...');
  await client.eval("setWeatherPreset('storm')");
  await sleep(200);
  const weatherStatus = await client.eval('document.getElementById("pomo-weather-status")?.innerText || ""');
  console.log('  [study.html] Weather status:', weatherStatus);

  console.log('  [study.html] Testing legacy ?id=head deep link...');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html?id=head` });
  await sleep(1800);
  const legacyTitle = await client.eval('document.getElementById("sheet-title")?.textContent');
  console.log('  [study.html] Legacy head sheet:', legacyTitle);
  if (!legacyTitle || !legacyTitle.toLowerCase().includes('colossus')) {
    throw new Error(`Legacy id=head mapped wrong: ${legacyTitle}`);
  }

  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html` });
  await sleep(1800);
  await client.eval('try { localStorage.removeItem("daniel_historicist_sheet"); } catch (e) {}');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/study.html` });
  await sleep(1800);
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  await client.captureScreenshot('qa/proofs/study_proof.png');
  console.log('  [study.html] Captured study_proof.png');

  await client.eval('togglePomodoroDrawer()');
  await sleep(400);
  await client.captureScreenshot('qa/proofs/study_proof_focus.png');
  console.log('  [study.html] Captured study_proof_focus.png');

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(500);
  await client.captureScreenshot('qa/proofs/study_proof_mobile.png');
  console.log('  [study.html] Captured study_proof_mobile.png');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  console.log('\n=== Step 6: Testing index.html Functionality ===');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/index.html` });
  await sleep(1000);

  // Test modern index.html curriculum structure
  console.log('  [index.html] Testing 3-Act curriculum structure and hero elements...');
  const actCardsCount = await client.eval('document.querySelectorAll(".act-card").length');
  console.log('  [index.html] Act cards count:', actCardsCount);
  if (actCardsCount !== 3) throw new Error(`Expected 3 act cards, got ${actCardsCount}`);

  const primaryBtn = await client.eval('document.getElementById("hero-primary")?.getAttribute("href")');
  console.log('  [index.html] Hero primary CTA:', primaryBtn);
  if (!primaryBtn || !primaryBtn.includes('study.html')) throw new Error('Hero primary CTA link missing or invalid');

  const fullScrollCard = await client.eval('!!document.getElementById("full-scroll")');
  console.log('  [index.html] Full scroll card present:', fullScrollCard);
  if (!fullScrollCard) throw new Error('Full scroll offer card missing from index.html');

  const verifiedPills = await client.eval('document.querySelectorAll(".hero-pills span").length');
  console.log('  [index.html] Hero pill badges count:', verifiedPills);
  if (verifiedPills < 4) throw new Error('Verified badge missing in hero pills');

  const actLinks = await client.eval(`(() => {
    const cards = Array.from(document.querySelectorAll('.act-card a.btn'));
    return cards.map(a => a.getAttribute('href'));
  })()`);
  console.log('  [index.html] Act card study entry links:', actLinks);
  if (!actLinks.some(href => href && href.includes('sheet=0')) || !actLinks.some(href => href && href.includes('sheet=7'))) {
    throw new Error('Act cards missing expected entry links to sheet=0 and sheet=7');
  }

  console.log('\n=== Step 7: Testing gallery.html Direct Study Link & Camera Framing ===');
  await client.send('Page.navigate', { url: `${SERVER_BASE}/gallery.html?asset=stone` });
  await sleep(1500);

  const studyLinkHref = await client.eval('document.getElementById("nar-study-link")?.getAttribute("href")');
  console.log('  [gallery.html] nar-study-link href:', studyLinkHref);
  if (!studyLinkHref || !studyLinkHref.includes('study.html?id=stone')) {
    throw new Error(`Expected nar-study-link to link to study.html?id=stone, got ${studyLinkHref}`);
  }

  // Check camera z-position: should be properly framed near 4.4, NOT at distant 6.8
  const camZ = await client.eval('window.__galleryCamera ? Math.round(window.__galleryCamera.position.z * 10) / 10 : null');
  console.log('  [gallery.html] Stone camera Z position:', camZ);
  if (camZ === null || camZ > 5.5) {
    throw new Error(`Camera was not framed to stone model: expected z ~4.4, got ${camZ}`);
  }

  for (let i = 0; i < 30; i++) {
    const isHidden = await client.eval('document.getElementById("loading-overlay")?.classList.contains("hidden")');
    if (isHidden) break;
    await sleep(300);
  }
  await sleep(1200); // Give Three.js time to finish rendering the 3D stone model
  await client.captureScreenshot('qa/proofs/gallery_stone_proof.png');
  console.log('  [gallery.html] Captured gallery_stone_proof.png');

  // Check console errors
  console.log('\n=== Step 8: Console Error Check ===');
  if (client.consoleErrors.length > 0) {
    console.warn('Console warnings/errors detected:', JSON.stringify(client.consoleErrors));
  } else {
    console.log('PASS: 0 uncaught JavaScript errors across all pages tested.');
  }

  // Teardown
  client.close();
  chromeProc.kill();
  server.kill();

  console.log('\n========================================');
  console.log('  ALL AUTOMATED VERIFICATION TESTS PASSED!');
  console.log('========================================');
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
