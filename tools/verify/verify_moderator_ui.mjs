import { chromium } from 'playwright';
import assert from 'assert';
import { ensureServer } from './_server.mjs';

const READER = { user: { id: 'qa-reader', email: 'reader@example.test' } };
const MODERATOR = { user: { id: 'qa-moderator', email: 'moderator@example.test' }, moderator: true };
const PAGES = ['/index.html', '/reviews.html', '/account.html'];
const LEGAL = /Fanelesibonge Ndlovu[^.]*\.|the operator[^.]*\./gi;

async function inspect(browser, base, mock, page) {
  const context = await browser.newContext();
  await context.addInitScript((value) => {
    localStorage.setItem('baQaMockSession', value);
  }, JSON.stringify(mock));
  const tab = await context.newPage();
  await tab.goto(base + page, { waitUntil: 'load' });
  await tab.waitForFunction(() => window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser());
  await tab.waitForTimeout(1500);
  const seen = await tab.evaluate(() => ({
    admin: !!document.getElementById('admin-reviews-link'),
    insights: !!document.getElementById('admin-insights-link'),
    queue: !!document.getElementById('witness-queue'),
    publish: !!document.querySelector('.desk-admin'),
    authenticator: (function () { const c = document.getElementById('account-mfa'); return !!c && !c.hidden; })(),
    hubAdmin: !!document.querySelector('.hub-card-admin'),
    text: document.body.innerText
  }));
  await context.close();
  return seen;
}

async function run() {
  const server = await ensureServer({ preferred: 8000, probe: '/index.html' });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const page of PAGES) {
      const reader = await inspect(browser, server.base, READER, page);
      assert.equal(reader.admin, false, `${page}: readers get no Admin link`);
      assert.equal(reader.insights, false, `${page}: readers get no Insights link`);
      assert.equal(reader.queue, false, `${page}: readers get no review queue`);
      assert.equal(reader.publish, false, `${page}: readers get no Publish form`);
      assert.equal(reader.authenticator, false, `${page}: readers get no authenticator card`);
      assert.equal(reader.hubAdmin, false, `${page}: readers get no moderator dashboard card`);
      const visible = reader.text.replace(LEGAL, '');
      assert.doesNotMatch(visible, /\b(moderator|operator)s?\b/i, `${page}: readers see no moderator or operator wording outside the legal text`);
    }
    const home = await inspect(browser, server.base, MODERATOR, '/index.html');
    assert.ok(home.admin && home.insights, 'moderators get the Admin and Insights links on the home page');
    assert.ok(home.publish, 'moderators get the Publish form');
    const reviews = await inspect(browser, server.base, MODERATOR, '/reviews.html');
    assert.ok(reviews.queue && reviews.admin && reviews.insights, 'moderators get the review queue and nav links');
  } finally {
    await browser.close();
    server.stop();
  }
  console.log('moderator UI: readers get no moderator controls or wording; moderators keep theirs');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
