import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

async function isServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/index.html`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function run() {
  const PORT = 8000;
  let serverProcess = null;
  const running = await isServerRunning(PORT);
  if (!running) {
    console.log(`Starting local server on port ${PORT}...`);
    serverProcess = spawn('python', ['server.py', '--no-browser'], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore'
    });
    let up = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (await isServerRunning(PORT)) {
        up = true;
        break;
      }
    }
    if (!up) throw new Error('Failed to start python server on port ' + PORT);
    console.log('Local server started successfully.');
  } else {
    console.log(`Using existing server on port ${PORT}.`);
  }

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
    await page.goto(`http://127.0.0.1:${PORT}/study.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const portalVisible = await page.locator('#sitting-portal-view').isVisible();
    console.log('   Portal visible on initial visit:', portalVisible);
    if (!portalVisible) throw new Error('Lessons portal was not visible on initial load of study.html');

    const cardsCount = await page.locator('.lesson-portal-card').count();
    console.log('   Total lesson portal cards count:', cardsCount);
    if (cardsCount !== 11) throw new Error(`Expected 11 portal cards, got ${cardsCount}`);

    console.log('\n=== Step 2: Verifying Access Control & Lock Status for Guest ===');
    // Sitting 0, 1, 2 are free sittings (unlocked for guests)
    // Sittings 3..10 are member-gated (sign-in required for guests)
    const card0Pill = await page.locator('.lesson-portal-card').nth(0).locator('.lesson-status-pill').textContent();
    const card1Pill = await page.locator('.lesson-portal-card').nth(1).locator('.lesson-status-pill').textContent();
    const card2Pill = await page.locator('.lesson-portal-card').nth(2).locator('.lesson-status-pill').textContent();
    const card3Pill = await page.locator('.lesson-portal-card').nth(3).locator('.lesson-status-pill').textContent();
    const card10Pill = await page.locator('.lesson-portal-card').nth(10).locator('.lesson-status-pill').textContent();

    console.log(`   Sitting 0 status: "${card0Pill.trim()}"`);
    console.log(`   Sitting 1 status: "${card1Pill.trim()}"`);
    console.log(`   Sitting 2 status: "${card2Pill.trim()}"`);
    console.log(`   Sitting 3 status: "${card3Pill.trim()}"`);
    console.log(`   Sitting 10 status: "${card10Pill.trim()}"`);

    if (!card0Pill.includes('Unlocked')) throw new Error('Sitting 0 should be Unlocked');
    if (!card3Pill.includes('Sign-in Required') && !card3Pill.includes('Locked')) {
      throw new Error(`Sitting 3 should be locked/sign-in required, got "${card3Pill}"`);
    }

    const card3Action = page.locator('.lesson-portal-card').nth(3).locator('.lesson-portal-action-btn');
    const card3ActionText = await card3Action.textContent();
    console.log(`   Sitting 3 action button: "${card3ActionText.trim()}"`);
    if (!card3ActionText.includes('Sign In to Unlock') && !card3ActionText.includes('Locked')) {
      throw new Error('Sitting 3 action button must prompt sign in or lock');
    }

    await page.screenshot({ path: 'qa/proofs/sitting_portal_overview.png', fullPage: false });
    console.log('   Captured qa/proofs/sitting_portal_overview.png');

    console.log('\n=== Step 3: Verifying Filter Pills Interaction ===');
    // Test filter: Unlocked
    await page.locator('button[data-filter="unlocked"]').click();
    await page.waitForTimeout(300);
    const unlockedCardsCount = await page.locator('.lesson-portal-card').count();
    console.log(`   Visible cards under "Unlocked" filter: ${unlockedCardsCount}`);
    if (unlockedCardsCount !== 3) {
      throw new Error(`Expected 3 unlocked cards for unsigned guest (Sittings 0, 1, 2), got ${unlockedCardsCount}`);
    }

    // Test filter: Incomplete
    await page.locator('button[data-filter="incomplete"]').click();
    await page.waitForTimeout(300);
    const incompleteCardsCount = await page.locator('.lesson-portal-card').count();
    console.log(`   Visible cards under "Incomplete" filter: ${incompleteCardsCount}`);
    if (incompleteCardsCount !== 11) {
      throw new Error(`Expected 11 incomplete cards, got ${incompleteCardsCount}`);
    }

    // Reset filter: All
    await page.locator('button[data-filter="all"]').click();
    await page.waitForTimeout(300);
    const resetCardsCount = await page.locator('.lesson-portal-card').count();
    console.log(`   Visible cards under "All Lessons" filter: ${resetCardsCount}`);
    if (resetCardsCount !== 11) throw new Error(`Expected 11 cards, got ${resetCardsCount}`);

    console.log('\n=== Step 4: Verifying Transition from Portal into Sitting ===');
    const firstCardAction = page.locator('.lesson-portal-card').first().locator('.lesson-portal-action-btn');
    await firstCardAction.click();
    await page.waitForTimeout(500);

    const portalHidden = await page.locator('#sitting-portal-view').isHidden();
    const shellVisible = await page.locator('.sitting-shell').isVisible();
    console.log('   Portal hidden after entering sitting:', portalHidden);
    console.log('   Sitting shell visible:', shellVisible);
    if (!portalHidden || !shellVisible) throw new Error('Failed to enter sitting from portal');

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
    await page.goto(`http://127.0.0.1:${PORT}/study.html?sheet=1`, { waitUntil: 'networkidle' });
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
    await page.goto(`http://127.0.0.1:${PORT}/account.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const accountHub = await page.locator('#account-hub').isVisible();
    console.log('   Account hub visible:', accountHub);
    if (!accountHub) throw new Error('Account hub not visible');
    await page.screenshot({ path: 'qa/proofs/account_hub_proof.png' });
    console.log('   Captured qa/proofs/account_hub_proof.png');

    console.log('\n=== Step 8: Verifying Insights Hub Visual Rendering ===');
    await page.goto(`http://127.0.0.1:${PORT}/insights.html`, { waitUntil: 'networkidle' });
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
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  console.log('\n============================================================');
  console.log('  ALL PORTAL, HUBS, AND ACCESS TESTS PASSED PERFECTLY (0 ERRORS)');
  console.log('============================================================\n');
}

run().catch(err => {
  console.error('\nFAIL: Test run failed:', err);
  process.exit(1);
});
