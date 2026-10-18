import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const PORT = process.env.MAP_PORT || "8013";
const BASE = `http://127.0.0.1:${PORT}`;
const LAUNCH = { headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] };
const NOISE = /arcgisonline|openstreetmap|supabase|ERR_|cloudflareinsights|fonts\.g/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync("qa/proofs", { recursive: true });

function countFrames() {
  window.__raf = 0;
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    window.__raf++;
    return orig(cb);
  };
}

async function open(browser, path, viewport) {
  const context = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push(m.text()); });
  page.on("request", (r) => requests.push(r.url()));
  await page.addInitScript(countFrames);
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  return { page, errors, requests, close: () => context.close() };
}

const globeOn = (page) => page.evaluate(() => document.querySelector(".cmap-root").classList.contains("is-globe-view"));

async function waitFor(page, fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await page.evaluate(fn)) return true;
    await sleep(200);
  }
  return false;
}

let server = null;
let browser = null;
try {
  server = spawn("python", ["server.py", "--no-browser"], { env: { ...process.env, PORT }, stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    try { ready = (await fetch(`${BASE}/map.html`)).ok; } catch {}
    if (!ready) await sleep(150);
  }
  assert.ok(ready, "server not ready");
  browser = await chromium.launch(LAUNCH);

  {
    const t = await open(browser, "/map.html?preview=full&skip=1&year=y605");
    await sleep(3500);
    assert.deepStrictEqual(t.requests.filter((u) => /globe|three/.test(u)), [], "map view must not load globe code or textures");
    assert.strictEqual(await globeOn(t.page), false);
    assert.deepStrictEqual(t.errors, []);
    console.log("skip=1 keeps the flat map and loads nothing of the globe");
    await t.close();
  }

  {
    const t = await open(browser, "/map.html?preview=full&view=globe&year=y457");
    assert.ok(await waitFor(t.page, () => document.querySelectorAll(".cmap-gpin:not(.is-hidden)").length > 0, 15000), "globe pins never appeared");
    assert.ok(await globeOn(t.page), "view=globe did not open the globe");
    await sleep(3000);
    const a = await t.page.evaluate(() => window.__raf);
    await sleep(2000);
    const b = await t.page.evaluate(() => window.__raf);
    assert.strictEqual(b - a, 0, "globe kept drawing while idle");
    await t.page.screenshot({ path: "qa/proofs/globe_proof_457.png" });
    console.log("globe draws nothing when idle");

    await t.page.mouse.move(900, 300);
    for (let i = 0; i < 3; i++) {
      await t.page.mouse.wheel(0, -120);
      await sleep(60);
    }
    assert.ok(await waitFor(t.page, () => !!document.querySelector(".cmap-globe").dataset.imagery, 20000), "close satellite imagery never appeared on the globe");
    assert.ok(await globeOn(t.page), "three wheel steps should not leave the globe");
    await t.page.screenshot({ path: "qa/proofs/globe_proof_imagery.png" });
    console.log("zooming close drapes satellite imagery on the globe");

    for (let i = 0; i < 40 && (await globeOn(t.page)); i++) {
      await t.page.mouse.wheel(0, -120);
      await sleep(50);
    }
    await sleep(800);
    assert.strictEqual(await globeOn(t.page), false, "zooming in did not hand over to the map");
    assert.ok(!new URL(t.page.url()).searchParams.get("view"), "view=globe left in the URL");
    console.log("zooming in hands over to the map");

    for (let i = 0; i < 16 && !(await globeOn(t.page)); i++) {
      await t.page.evaluate(() => document.querySelector(".leaflet-control-zoom-out").click());
      await sleep(450);
    }
    assert.ok(await globeOn(t.page), "zooming the map all the way out did not return to the globe");
    console.log("zooming the map out returns to the globe");
    assert.deepStrictEqual(t.errors, []);
    await t.close();
  }

  {
    const t = await open(browser, "/map.html?preview=full&skip=1&year=y457");
    await sleep(3500);
    await t.page.evaluate(() => {
      const i = document.querySelector(".cmap-scrub input");
      i.value = "27";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const read = await t.page.evaluate(() => document.querySelector(".cmap-scrub-read span").textContent);
    assert.match(read, /^483 of 2,300 years · The seventieth week/);
    assert.ok(await t.page.evaluate(() => !!document.querySelector(".cmap-lbeacon")), "slider beacon missing");
    await t.page.evaluate(() => document.querySelector(".cmap-scrub input").dispatchEvent(new Event("change", { bubbles: true })));
    await sleep(2500);
    assert.strictEqual(new URL(t.page.url()).searchParams.get("year"), "y31", "slider did not snap to the nearest year");
    await t.page.evaluate(() => {
      const i = document.querySelector(".cmap-scrub input");
      i.value = "1844";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    assert.match(await t.page.evaluate(() => document.querySelector(".cmap-scrub-read span").textContent), /^2,300 of 2,300 years/);
    console.log("slider counts the years and snaps to the nearest stop");

    await t.page.fill(".cmap-search input", "Susa");
    await t.page.click(".cmap-search-hits button[data-id='susa']");
    await sleep(1200);
    assert.ok(await t.page.evaluate(() => !!document.querySelector(".cmap-dossier .cmap-artifact")), "artifact card missing");
    assert.strictEqual(await t.page.evaluate(() => document.querySelectorAll(".cmap-dossier .cmap-pois [data-poi]").length), 3);
    assert.strictEqual(await t.page.evaluate(() => document.querySelectorAll(".cmap-dossier .cmap-sat-mark").length), 3, "aerial view should pin the three landmarks");
    assert.ok(await waitFor(t.page, () => Array.from(document.querySelectorAll(".cmap-sat-frame img")).some((i) => i.complete && i.naturalWidth > 0), 15000), "aerial view tiles never loaded");
    console.log("place panel shows an aerial view with its landmarks");
    await t.page.click(".cmap-dossier .cmap-pois [data-poi='1']");
    await sleep(3500);
    assert.ok(await t.page.evaluate(() => !!document.querySelector(".cmap-footprint")), "site outline missing at close zoom");
    await t.page.screenshot({ path: "qa/proofs/globe_proof_site.png" });
    console.log("site detail opens and flies in");
    assert.deepStrictEqual(t.errors, []);
    await t.close();
  }

  {
    const t = await open(browser, "/map.html?preview=full&view=globe&year=y331", { width: 390, height: 844 });
    assert.ok(await waitFor(t.page, () => document.querySelectorAll(".cmap-gpin:not(.is-hidden)").length > 0, 15000), "phone globe pins never appeared");
    assert.strictEqual(await t.page.evaluate(() => document.documentElement.scrollWidth), 390, "phone layout scrolls sideways");
    assert.ok(t.requests.some((u) => u.endsWith("earth-day-2k.webp")) && !t.requests.some((u) => u.endsWith("earth-day-4k.webp")), "phone should load the 2k earth only");
    await t.page.screenshot({ path: "qa/proofs/globe_proof_mobile.png" });
    console.log("phone globe loads the small texture and fits the screen");
    assert.deepStrictEqual(t.errors, []);
    await t.close();
  }

  console.log("globe checks passed");
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}
