import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { ensureServer } from './_server.mjs';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

async function dismissGuide(page) {
  if (await page.locator('#sitting-guide-primary').isVisible().catch(() => false)) {
    await page.locator('#sitting-guide-primary').click();
    await page.waitForTimeout(300);
  }
}

async function run() {
  const server = await ensureServer({ preferred: 8000, probe: '/index.html' });
  const BASE = server.base;
  console.log(`Using server at ${BASE}.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon.ico') && !txt.includes('cloudflareinsights')) {
        consoleErrors.push(txt);
      }
    }
  });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));

  try {
    console.log('\n=== Step 1: Verifying index.html shows the shelf of eleven volumes ===');
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('#cat-list .cat-item').length > 0, null, { timeout: 30000 });
    const cardsCount = await page.locator('#cat-list .cat-item').count();
    console.log('   Volumes on the shelf:', cardsCount);
    if (cardsCount !== 11) throw new Error(`Expected 11 volumes, got ${cardsCount}`);

    const states = await page.evaluate(() => [...document.querySelectorAll('#cat-list .cat-item')].map((b) => {
      const st = b.querySelector('.cat-state');
      return st.classList.contains('locked') ? 'Locked' : st.classList.contains('done') ? 'Completed' : 'Open';
    }));
    console.log('   Volume states:', states.join(', '));
    if (states[0] !== 'Open' || states[1] !== 'Open' || states[2] !== 'Open') throw new Error('Sittings 0-2 should be open to a guest');
    if (states.slice(3).some((x) => x !== 'Locked')) throw new Error('Sittings 3-10 should be locked for a guest');

    const progress = (await page.locator('#progress-text').textContent()).trim();
    console.log('   Progress pill:', progress);
    if (progress !== '0 / 11 read') throw new Error(`Expected "0 / 11 read" for a new guest, got "${progress}"`);

    const sittingTabs = await page.locator('.sh-tab[href="study.html"]').count();
    console.log('   "The Sitting" tab links on the shelf:', sittingTabs);
    if (sittingTabs !== 0) throw new Error('The shelf still has a "The Sitting" tab');

    await page.screenshot({ path: 'qa/proofs/shelf_home_overview.png', fullPage: false });
    console.log('   Captured qa/proofs/shelf_home_overview.png');

    console.log('\n=== Step 2: Verifying study.html with no parameters opens straight into a sitting ===');
    await page.goto(`${BASE}/study.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.sitting-shell', { state: 'visible', timeout: 30000 });
    await dismissGuide(page);
    const bareTitle = (await page.locator('#sheet-title').textContent()).trim();
    const bareShell = await page.locator('.sitting-shell').isVisible();
    const embeddedShelf = await page.evaluate(() => !!document.getElementById('shelf-stage') || !!document.getElementById('cat-list'));
    const overviewNode = await page.evaluate(() => [...document.querySelectorAll('[id]')].some((el) => el.id.endsWith('portal-view')));
    console.log('   Sitting shell visible:', bareShell, '| title:', bareTitle);
    console.log('   Shelf overview embedded in the reader:', embeddedShelf, '| overview node in DOM:', overviewNode);
    if (!bareShell || !bareTitle) throw new Error('study.html without parameters did not open a sitting');
    if (embeddedShelf || overviewNode) throw new Error('study.html still embeds the shelf overview');

    console.log('\n=== Step 3: Verifying study.html?sheet=1 opens sitting 1 ===');
    await page.goto(`${BASE}/study.html?sheet=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#sheet-article[data-sheet-index="1"]', { timeout: 30000 });
    await dismissGuide(page);
    const sheetTitle = (await page.locator('#sheet-title').textContent()).trim();
    console.log('   Sitting 1 title:', sheetTitle);
    if (!sheetTitle) throw new Error('Sitting 1 opened without a title');

    console.log('\n=== Step 3b: Verifying a reader who answered the first-visit questions is not asked again ===');
    const firstVisitAsked = await page.locator('#onboard').isVisible().catch(() => false);
    console.log('   First-visit questions shown to a new guest:', firstVisitAsked);
    if (!firstVisitAsked) throw new Error('A new guest was not asked the first-visit questions');
    await page.evaluate(() => {
      localStorage.setItem('baOnboardV1', '1');
      localStorage.setItem('baProfileAsked', '1');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#sheet-article[data-sheet-index="1"]', { timeout: 30000 });
    await dismissGuide(page);
    await page.waitForTimeout(500);
    const askedAgain = await page.locator('#onboard').isVisible().catch(() => false);
    console.log('   First-visit questions shown after they were answered:', askedAgain);
    if (askedAgain) throw new Error('The first-visit questions came back after they were answered');

    console.log('\n=== Step 4: Verifying the header and spine controls link back to the shelf ===');
    const headerLink = await page.locator('#btn-header-syllabus').evaluate((el) => ({ tag: el.tagName, href: el.getAttribute('href') }));
    console.log('   Header shelf control:', headerLink.tag, headerLink.href);
    if (headerLink.tag !== 'A' || !String(headerLink.href).endsWith('index.html')) throw new Error('Header shelf control is not a link to index.html');
    await page.locator('#btn-header-syllabus').click();
    await page.waitForURL(/\/index\.html$/, { timeout: 30000 });
    await page.waitForSelector('#shelf-stage', { state: 'attached', timeout: 30000 });
    console.log('   Header link landed on the shelf:', page.url());

    await page.goto(`${BASE}/study.html?sheet=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#sheet-article[data-sheet-index="1"]', { timeout: 30000 });
    await dismissGuide(page);
    const spineLink = await page.locator('#btn-back-to-portal').evaluate((el) => ({ tag: el.tagName, href: el.getAttribute('href') }));
    console.log('   Spine shelf control:', spineLink.tag, spineLink.href);
    if (spineLink.tag !== 'A' || !String(spineLink.href).endsWith('index.html')) throw new Error('Spine shelf control is not a link to index.html');
    await page.locator('#btn-back-to-portal').click();
    await page.waitForURL(/\/index\.html$/, { timeout: 30000 });
    await page.waitForSelector('#shelf-stage', { state: 'attached', timeout: 30000 });
    console.log('   Spine link landed on the shelf:', page.url());

    console.log('\n=== Step 5: Verifying Account Hub Visual Rendering ===');
    await page.goto(`${BASE}/account.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const accountHub = await page.locator('#account-hub').isVisible();
    console.log('   Account hub visible:', accountHub);
    if (!accountHub) throw new Error('Account hub not visible');
    await page.screenshot({ path: 'qa/proofs/account_hub_proof.png' });
    console.log('   Captured qa/proofs/account_hub_proof.png');

    console.log('\n=== Step 6: Verifying Insights Hub Visual Rendering ===');
    await page.goto(`${BASE}/insights.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const insightsMain = await page.locator('.insights-main').isVisible();
    console.log('   Insights main visible:', insightsMain);
    if (!insightsMain) throw new Error('Insights main not visible');
    await page.screenshot({ path: 'qa/proofs/insights_hub_proof.png' });
    console.log('   Captured qa/proofs/insights_hub_proof.png');

    console.log('\n=== Step 7: Verifying Uncaught Console Errors ===');
    console.log('   Uncaught console errors count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error('   Uncaught errors:', consoleErrors);
      throw new Error('Uncaught console errors detected: ' + JSON.stringify(consoleErrors));
    }
  } finally {
    await browser.close();
    server.stop();
  }

  console.log('\n============================================================');
  console.log('  ALL SHELF, READER, HUBS, AND ACCESS TESTS PASSED (0 ERRORS)');
  console.log('============================================================\n');
}

run().catch(err => {
  console.error('\nFAIL: Test run failed:', err);
  process.exit(1);
});
