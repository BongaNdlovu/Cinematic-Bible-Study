import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

fs.mkdirSync(path.join('qa', 'proofs'), { recursive: true });

async function isServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/account.html`, (res) => {
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
      if (!txt.includes('favicon.ico') && !txt.includes('cloudflareinsights')) {
        consoleErrors.push(txt);
      }
    }
  });

  try {
    console.log('\n=== E2E Step 1: Visiting account.html as guest ===');
    await page.goto(`http://127.0.0.1:${PORT}/account.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hubVisible = await page.locator('#account-hub').isVisible();
    console.log('   Account hub element visible:', hubVisible);
    if (!hubVisible) throw new Error('#account-hub not visible');

    const kickerText = await page.locator('.account-kicker').textContent();
    console.log('   Kicker badge text:', kickerText.trim());

    const termsVisible = await page.locator('#terms-form').isVisible();
    console.log('   Terms card visible for guest:', termsVisible);
    if (!termsVisible) throw new Error('#terms-form should be visible before agreeing');

    await page.screenshot({ path: 'qa/proofs/account_hub_guest_cinematic.png' });
    console.log('   Captured qa/proofs/account_hub_guest_cinematic.png');

    console.log('\n=== E2E Step 2: Accepting Terms & Transitioning to Sign-in Box ===');
    await page.locator('#account-accept').click();
    await page.waitForTimeout(400);

    const signinBoxVisible = await page.locator('#account-signin-box').isVisible();
    console.log('   Sign-in box visible after accepting terms:', signinBoxVisible);
    if (!signinBoxVisible) throw new Error('#account-signin-box did not appear after accepting terms');

    const isLit = await page.locator('#account-signin-box').evaluate(el => el.classList.contains('is-lit'));
    console.log('   Sign-in box illuminated (.is-lit):', isLit);
    if (!isLit) throw new Error('#account-signin-box should have .is-lit class when ready to sign in');

    await page.screenshot({ path: 'qa/proofs/account_hub_signin_box.png' });
    console.log('   Captured qa/proofs/account_hub_signin_box.png');

    console.log('\n=== E2E Step 3: Verifying In-Browser Error Banner & Dismiss Button ===');
    await page.evaluate(() => {
      window.SiteErrors.show('Your progress did not save. This device will keep trying.', 'save');
    });
    await page.waitForTimeout(200);

    const banner = page.locator('#site-error-banner');
    const bannerVisible = await banner.isVisible();
    const bannerText = await banner.textContent();
    console.log('   Banner visible:', bannerVisible);
    console.log('   Banner content:', bannerText.trim());
    if (!bannerVisible) throw new Error('site-error-banner was not displayed');

    const closeBtn = page.locator('.site-error-close');
    const closeBtnVisible = await closeBtn.isVisible();
    console.log('   Dismiss button (×) visible:', closeBtnVisible);
    if (!closeBtnVisible) throw new Error('.site-error-close was not rendered');

    await page.screenshot({ path: 'qa/proofs/error_banner_with_dismiss.png' });
    console.log('   Captured qa/proofs/error_banner_with_dismiss.png');

    // Click dismiss button
    await closeBtn.click();
    await page.waitForTimeout(200);

    const bannerAfterDismiss = await banner.isHidden();
    console.log('   Banner hidden after clicking dismiss:', bannerAfterDismiss);
    if (!bannerAfterDismiss) throw new Error('Banner did not disappear after clicking dismiss');

    console.log('\n=== E2E Step 4: Signed-in Member View with Hub Cards ===');
    await page.evaluate(() => {
      localStorage.setItem('baQaMockSession', JSON.stringify({
        user: { id: 'test-qa-user-1', email: 'scholar@exhibit.org', user_metadata: { full_name: 'Daniel the Scholar' } },
        session: { access_token: 'qa-jwt-token' }
      }));
      localStorage.setItem('baJourney', JSON.stringify({
        completedSheets: [0, 1, 2, 3],
        sheet: 4,
        termsAgreed: true
      }));
      localStorage.setItem('daniel_certificate_name', 'Daniel the Scholar');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const sessionVisible = await page.locator('#account-session').isVisible();
    const accountName = await page.locator('#account-name').textContent();
    console.log('   Signed-in session visible:', sessionVisible);
    console.log('   Account display name:', accountName);
    if (!sessionVisible || !accountName.includes('Daniel')) {
      throw new Error('Account session was not displayed properly for signed-in user');
    }

    const cardsVisible = await page.locator('#account-hub-cards').isVisible();
    const hubCardsCount = await page.locator('.hub-card').count();
    console.log('   Hub cards visible:', cardsVisible);
    console.log('   Total hub cards rendered:', hubCardsCount);
    if (!cardsVisible || hubCardsCount < 4) {
      throw new Error(`Expected at least 4 hub cards, got ${hubCardsCount}`);
    }

    const settingsVisible = await page.locator('#account-settings').isVisible();
    console.log('   Account settings section visible:', settingsVisible);
    if (!settingsVisible) throw new Error('#account-settings should be visible for signed-in user');

    await page.screenshot({ path: 'qa/proofs/account_hub_signed_in_member.png' });
    console.log('   Captured qa/proofs/account_hub_signed_in_member.png');

    console.log('\n=== E2E Step 5: Mobile Viewport Responsiveness ===');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);

    const mobileHubVisible = await page.locator('#account-hub').isVisible();
    console.log('   Mobile viewport hub visible:', mobileHubVisible);
    if (!mobileHubVisible) throw new Error('Mobile viewport failed to render account hub');

    await page.screenshot({ path: 'qa/proofs/account_hub_mobile_375px.png' });
    console.log('   Captured qa/proofs/account_hub_mobile_375px.png');

    console.log('\n=== E2E Step 6: Console Error Audit ===');
    console.log('   Console errors count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      throw new Error('Console errors encountered: ' + JSON.stringify(consoleErrors));
    }

    console.log('\n============================================================');
    console.log('  ALL ACCOUNT HUB E2E & BANNER DISMISS TESTS PASSED (0 ERRORS)');
    console.log('============================================================\n');
  } finally {
    // Cleanup QA mock session
    try {
      await page.evaluate(() => {
        localStorage.removeItem('baQaMockSession');
      });
    } catch (e) {}
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

run().catch(err => {
  console.error('\nFAIL: Test run failed:', err);
  process.exit(1);
});
