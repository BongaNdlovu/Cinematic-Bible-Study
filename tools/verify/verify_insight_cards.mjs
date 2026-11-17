import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { ensureServer, signedInScript } from './_server.mjs';

const server = await ensureServer({ preferred: 8000 });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript({ content: signedInScript() });
  await context.addInitScript({ content: "try { sessionStorage.setItem('baPulsePending', '1'); } catch (e) {}" });
  const page = await context.newPage();
  await page.goto(server.base + '/study.html?sheet=0&preview=full', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => !!document.querySelector('.insight-card:not(article)'), null, { timeout: 20000 });
  await page.evaluate(() => {
    document.getElementById('sitting-guide-skip')?.click();
    document.querySelector('[data-instrument="insights"]').click();
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    popup: [...document.querySelectorAll('body > .insight-card')].map((el) => getComputedStyle(el).position),
    grid: [...document.querySelectorAll('.insight-grid .insight-card')].map((el) => getComputedStyle(el).position),
  }));
  assert.ok(state.popup.length > 0, 'a reader prompt card is showing');
  assert.ok(state.popup.every((p) => p === 'fixed'), 'the prompt card floats over the page: ' + JSON.stringify(state.popup));
  assert.equal(state.grid.length, 3, 'the Insights tab has its three cards');
  assert.ok(state.grid.every((p) => p !== 'fixed'), 'the Insights tab cards stay in their grid while a prompt card shows: ' + JSON.stringify(state.grid));
  console.log('prompt cards float and the Insights tab cards stay in their grid');
} finally {
  await browser.close();
  server.stop();
}
