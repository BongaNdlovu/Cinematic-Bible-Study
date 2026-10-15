import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { ensureServer } from './_server.mjs';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

async function enterSittingFromShelf(page, index) {
  await page.evaluate((i) => document.querySelectorAll('#cat-list .cat-item')[i].click(), index);
  await page.waitForFunction(() => document.getElementById('sitting-portal-view').hidden || document.getElementById('shelf-stage').classList.contains('is-open'), null, { timeout: 60000 });
  const volumeIsOpen = await page.evaluate(() => !document.getElementById('sitting-portal-view').hidden);
  if (volumeIsOpen) await page.evaluate(() => document.getElementById('d-go').click());
  await page.waitForFunction(() => document.getElementById('sitting-portal-view').hidden, null, { timeout: 20000 }).catch(() => {});
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
      // Ignore normal favicon 404 or cloudflare beacon if offline
      if (!txt.includes('favicon.ico') && !txt.includes('cloudflareinsights')) {
        consoleErrors.push(txt);
      }
    }
  });

  try {
    console.log('\n=== Step 1: Verifying study.html initial visit presents Lessons Portal ===');
    await page.goto(`${BASE}/study.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const portalVisible = await page.locator('#sitting-portal-view').isVisible();
    console.log('   Portal visible on initial visit:', portalVisible);
    if (!portalVisible) throw new Error('Lessons portal was not visible on initial load of study.html');

    await page.waitForFunction(() => document.querySelectorAll('#cat-list .cat-item').length > 0, null, { timeout: 30000 });
    const cardsCount = await page.locator('#cat-list .cat-item').count();
    console.log('   Volumes on the shelf:', cardsCount);
    if (cardsCount !== 11) throw new Error(`Expected 11 volumes, got ${cardsCount}`);

    console.log('\n=== Step 2: Verifying Access Control & Lock Status for Guest ===');
    const states = await page.evaluate(() => [...document.querySelectorAll('#cat-list .cat-item')].map((b) => {
      const st = b.querySelector('.cat-state');
      return st.classList.contains('locked') ? 'Locked' : st.classList.contains('done') ? 'Completed' : 'Open';
    }));
    console.log('   Volume states:', states.join(', '));
    if (states[0] !== 'Open' || states[1] !== 'Open' || states[2] !== 'Open') throw new Error('Sittings 0-2 should be open to a guest');
    if (states.slice(3).some((x) => x !== 'Locked')) throw new Error('Sittings 3-10 should be locked for a guest');

    await page.screenshot({ path: 'qa/proofs/sitting_portal_overview.png', fullPage: false });
    console.log('   Captured qa/proofs/sitting_portal_overview.png');

    console.log('\n=== Step 3: Verifying Progress on the Shelf ===');
    const progress = (await page.locator('#progress-text').textContent()).trim();
    console.log('   Progress pill:', progress);
    if (progress !== '0 / 11 read') throw new Error(`Expected "0 / 11 read" for a new guest, got "${progress}"`);

    console.log('\n=== Step 4: Verifying Transition from the Shelf into a Sitting ===');
    await enterSittingFromShelf(page, 0);
    await page.waitForTimeout(500);

    const portalHidden = await page.locator('#sitting-portal-view').isHidden();
    const shellVisible = await page.locator('.sitting-shell').isVisible();
    console.log('   Portal hidden after entering sitting:', portalHidden);
    console.log('   Sitting shell visible:', shellVisible);
    if (!portalHidden || !shellVisible) throw new Error('Failed to enter sitting from the shelf');

    if (await page.locator('#sitting-guide-primary').isVisible().catch(() => false)) {
      await page.locator('#sitting-guide-primary').click();
      await page.waitForTimeout(300);
    }

    console.log('\n=== Step 5: Verifying Returning to Portal via Spine Button ===');
    await page.locator('#btn-back-to-portal').click();
    await page.waitForTimeout(500);
    const portalReturnedSpine = await page.locator('#sitting-portal-view').isVisible();
    console.log('   Returned to portal via spine "← All Lessons":', portalReturnedSpine);
    if (!portalReturnedSpine) throw new Error('Failed to return to portal via spine button');

    console.log('\n=== Step 6: Verifying Direct Sheet Navigation & Header "All Lessons" ===');
    await page.goto(`${BASE}/study.html?sheet=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const directPortalHidden = await page.locator('#sitting-portal-view').isHidden();
    const directShellVisible = await page.locator('.sitting-shell').isVisible();
    console.log('   Direct visit study.html?sheet=1 went straight into sitting:', directPortalHidden && directShellVisible);
    if (!directPortalHidden || !directShellVisible) throw new Error('Direct query parameter did not open sitting directly');

    if (await page.locator('#sitting-guide-primary').isVisible().catch(() => false)) {
      await page.locator('#sitting-guide-primary').click();
      await page.waitForTimeout(300);
    }

    await page.locator('#btn-header-syllabus').click();
    await page.waitForTimeout(500);
    const portalReturnedHeader = await page.locator('#sitting-portal-view').isVisible();
    console.log('   Returned to portal via header "📜 All Lessons":', portalReturnedHeader);
    if (!portalReturnedHeader) throw new Error('Failed to return to portal via header button');

    console.log('\n=== Step 7: Verifying Account Hub Visual Rendering ===');
    await page.goto(`${BASE}/account.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const accountHub = await page.locator('#account-hub').isVisible();
    console.log('   Account hub visible:', accountHub);
    if (!accountHub) throw new Error('Account hub not visible');
    await page.screenshot({ path: 'qa/proofs/account_hub_proof.png' });
    console.log('   Captured qa/proofs/account_hub_proof.png');

    console.log('\n=== Step 8: Verifying Insights Hub Visual Rendering ===');
    await page.goto(`${BASE}/insights.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const insightsMain = await page.locator('.insights-main').isVisible();
    console.log('   Insights main visible:', insightsMain);
    if (!insightsMain) throw new Error('Insights main not visible');
    await page.screenshot({ path: 'qa/proofs/insights_hub_proof.png' });
    console.log('   Captured qa/proofs/insights_hub_proof.png');

    console.log('\n=== Step 9: Verifying Uncaught Console Errors ===');
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
  console.log('  ALL PORTAL, HUBS, AND ACCESS TESTS PASSED PERFECTLY (0 ERRORS)');
  console.log('============================================================\n');
}

run().catch(err => {
  console.error('\nFAIL: Test run failed:', err);
  process.exit(1);
});
