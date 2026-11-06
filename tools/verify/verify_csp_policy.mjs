import { chromium } from 'playwright';
import assert from 'assert';
import fs from 'fs';
import { ensureServer } from './_server.mjs';

const PAGES = ['/index.html', '/map.html', '/study.html', '/account.html', '/reviews.html', '/gallery.html', '/insights.html'];

function policy() {
  const line = fs.readFileSync('_headers', 'utf8').split(/\r?\n/).find((l) => /^\s+Content-Security-Policy:/i.test(l));
  assert(line, '_headers sets a Content-Security-Policy');
  return line.replace(/^\s+Content-Security-Policy:\s*/i, '').replace(/;\s*upgrade-insecure-requests/, '');
}

async function run() {
  const csp = policy();
  const server = await ensureServer({ preferred: 8000, probe: '/index.html' });
  const browser = await chromium.launch({ headless: true });
  const blocked = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (request.resourceType() !== 'document' || !request.url().startsWith(server.base)) return route.continue();
      const response = await route.fetch();
      return route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
    });
    for (const path of PAGES) {
      const page = await context.newPage();
      page.on('console', (msg) => {
        const text = msg.text();
        if (/Content Security Policy|Refused to/i.test(text)) blocked.push(`${path}: ${text.slice(0, 220)}`);
      });
      await page.goto(server.base + path, { waitUntil: 'load' });
      await page.waitForTimeout(path === '/map.html' ? 4000 : 1500);
      if (path === '/map.html') {
        const tile = await page.evaluate(async () => {
          const url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/1/1';
          const image = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
          });
          const fetched = await fetch(url).then((r) => r.ok, () => false);
          return { image, fetched };
        });
        assert.deepEqual(tile, { image: true, fetched: true }, 'ArcGIS satellite tiles load as images and fetches under *.arcgisonline.com');
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }
  assert.deepEqual(blocked, [], `the _headers policy blocked something:\n${blocked.join('\n')}`);
  console.log(`csp policy: ${PAGES.length} pages load under the _headers policy with nothing blocked`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
