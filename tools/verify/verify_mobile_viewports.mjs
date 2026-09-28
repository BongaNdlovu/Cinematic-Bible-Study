import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

const MIME_MAP = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, "http://127.0.0.1:8123");
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.join(ROOT, pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME_MAP[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(8123, resolve));
console.log("Local test server running on http://127.0.0.1:8123");

const browser = await chromium.launch({ headless: true });

try {
  const VIEWPORTS = [
    { name: "iPhone SE (375x667)", width: 375, height: 667 },
    { name: "iPhone 12/13/14 (390x844)", width: 390, height: 844 },
    { name: "iPhone XR / 11 (414x896)", width: 414, height: 896 }
  ];

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Testing Viewport: ${vp.name} ===`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // 1. Check index.html
    await page.goto("http://127.0.0.1:8123/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const heroBox = await page.locator(".dash-hero").boundingBox();
    const kickerBox = await page.locator(".dash-title-kicker").boundingBox();
    const mainTitleBox = await page.locator(".dash-title-main").boundingBox();
    const ctaBox = await page.locator("#hero-cta").boundingBox();
    const signinBox = await page.locator(".dash-top-signin").boundingBox();

    assert(heroBox, "dash-hero must exist");
    assert(kickerBox, "dash-title-kicker must exist");
    assert(mainTitleBox, "dash-title-main must exist");
    assert(ctaBox, "hero-cta must exist");
    assert(signinBox, "dash-top-signin must exist");

    console.log(`[Home] hero top: ${heroBox.y}, kicker top: ${kickerBox.y}, main top: ${mainTitleBox.y}`);
    assert(
      kickerBox.y >= heroBox.y,
      `Kicker ("THE SCROLL OF") top (${kickerBox.y}) must be inside hero top (${heroBox.y})`
    );
    assert(
      kickerBox.y + kickerBox.height <= heroBox.y + heroBox.height,
      "Kicker bottom must be inside hero"
    );
    assert(
      mainTitleBox.y >= kickerBox.y,
      `Main title ("DANIEL") top (${mainTitleBox.y}) must be below kicker (${kickerBox.y})`
    );
    assert(
      ctaBox.y + ctaBox.height <= heroBox.y + heroBox.height + 20,
      "CTA button must fit within hero bounds"
    );

    // Verify document width does not overflow viewport width
    const homeScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert(
      homeScrollWidth <= vp.width,
      `Home document scrollWidth (${homeScrollWidth}) must not exceed viewport width (${vp.width})`
    );
    console.log(`✓ Home title and buttons fully visible on ${vp.name}`);

    // 2. Check gallery.html
    await page.goto("http://127.0.0.1:8123/gallery.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Document horizontal overflow
    const wideInfo = await page.evaluate((maxW) => {
      const list = [];
      document.querySelectorAll("*").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > maxW + 2) {
          list.push({ tag: el.tagName, id: el.id, class: el.className, right: rect.right, width: rect.width });
        }
      });
      return list;
    }, vp.width);
    console.log("Elements overflowing viewport width:", JSON.stringify(wideInfo, null, 2));

    const galleryScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert(
      galleryScrollWidth <= vp.width,
      `Gallery document scrollWidth (${galleryScrollWidth}) must not exceed viewport width (${vp.width})`
    );

    // Account link in gallery header
    const accountLink = page.locator('.header-utilities a[href="account.html"]');
    assert(await accountLink.isVisible(), "Account link must be visible in gallery");
    const accountBox = await accountLink.boundingBox();
    console.log(`[Gallery] Account button: left=${accountBox.x}, right=${accountBox.x + accountBox.width}`);
    assert(
      accountBox.x >= 0 && accountBox.x + accountBox.width <= vp.width,
      `Account button right (${accountBox.x + accountBox.width}) must be within viewport width (${vp.width})`
    );

    // Check museum node cards do not overflow right edge
    const cards = await page.locator(".museum-node-card").all();
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (await card.isVisible()) {
        const box = await card.boundingBox();
        if (box) {
          console.log(`[Gallery] Node card ${i}: left=${box.x}, right=${box.x + box.width}`);
          assert(
            box.x >= 0,
            `Card ${i} left (${box.x}) must not be negative`
          );
          assert(
            box.x + box.width <= vp.width + 1,
            `Card ${i} right (${box.x + box.width}) must not exceed viewport width (${vp.width})`
          );
        }
      }
    }
    console.log(`✓ Gallery width, Account button, and info cards stay within ${vp.name}`);

    // 3. Check account.html
    await page.goto("http://127.0.0.1:8123/account.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    const leadText = await page.locator("#account-lead").textContent();
    console.log(`[Account] Subtitle: "${leadText}"`);
    assert(
      !leadText.includes("begin the sittings"),
      "Account subtitle must not contradict terms by saying sign in is required to begin the sittings"
    );

    const bodyText = await page.locator("#terms-form").textContent();
    assert(
      bodyText.includes("admin@endoftime7.com"),
      "Terms must include admin@endoftime7.com as the site operator email for deletion requests"
    );
    console.log(`✓ Account page copy verified on ${vp.name}`);

    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log("\nALL MOBILE VIEWPORT TESTS PASSED SUCCESSFULLY!");
