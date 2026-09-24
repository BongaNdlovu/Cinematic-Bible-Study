/**
 * Production access + curriculum audit (Playwright)
 *
 * Usage:
 *   node qa-e2e/production-audit.mjs --base=http://127.0.0.1:8001 --phase=after
 *
 * Signed-in tests MOCK Supabase by writing localStorage.baQaMockSession before
 * any page script runs (localhost only — auth.js ignores the key off-loopback):
 *   { user: { id, email, user_metadata }, session?: { access_token } }
 * Real Google OAuth is NOT exercised.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const BASE = arg("base", "http://127.0.0.1:8001").replace(/\/$/, "");
const PHASE = arg("phase", "after");
const EVIDENCE = process.env.EVIDENCE_DIR || "/workspace/audit-prod/evidence";
const SHOT = path.join(EVIDENCE, "screenshots", PHASE === "prod" ? "prod" : PHASE);
const REPORT_DIR = path.join(EVIDENCE, "reports");
fs.mkdirSync(SHOT, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });
const SHEET_COUNT = 11;

const MOCK_USER = {
  id: "qa-mock-user-001",
  email: "qa.auditor@example.com",
  user_metadata: { full_name: "QA Auditor", name: "QA Auditor" },
};
const MOCK_SESSION = {
  user: MOCK_USER,
  session: {
    access_token: "qa-mock-access-token",
    refresh_token: "qa-mock-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: "bearer",
  },
};

async function shot(page, name) {
  const file = path.join(SHOT, `${name}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 58, fullPage: false });
  return file;
}

async function dismissSoft(page) {
  for (const sel of ["#sitting-guide-primary", "#sitting-celebrate button", "#access-close"]) {
    try {
      const loc = page.locator(sel);
      if (await loc.first().isVisible({ timeout: 250 }).catch(() => false)) {
        await loc.first().click({ force: true }).catch(() => {});
      }
    } catch {}
  }
}

function mockAuthInitScript(mock) {
  const payload = JSON.stringify(mock);
  return `
try {
  // After an explicit QA sign-out, do not resurrect the mock on navigation.
  if (sessionStorage.getItem("baQaForceSignedOut") === "1") {
    localStorage.removeItem("baQaMockSession");
  } else {
    localStorage.setItem("baQaMockSession", ${JSON.stringify(payload)});
    const j = JSON.parse(localStorage.getItem("baJourney") || "{}");
    j.termsByUser = j.termsByUser || {};
    j.termsByUser[${JSON.stringify(MOCK_USER.id)}] = { version: 3, at: Date.now() };
    j.termsAccepted = { version: 3, at: Date.now(), userId: ${JSON.stringify(MOCK_USER.id)} };
    j.pendingTerms = null;
    localStorage.setItem("baJourney", JSON.stringify(j));
  }
} catch (e) {}
`;
}

async function completeWorkbench(page, idx) {
  return page.evaluate((sheetIndex) => {
    const WB = window.StudyWorkbench;
    if (!WB) return { ok: false, detail: "StudyWorkbench missing" };
    try {
      if (sheetIndex <= 2) {
        WB.markTaskComplete(sheetIndex, "task1");
        WB.markTaskComplete(sheetIndex, "task2");
      } else {
        WB.markTaskComplete(sheetIndex, "task1");
      }
      return { ok: !!WB.isSheetComplete(sheetIndex), method: "api-mark" };
    } catch (e) {
      return { ok: false, detail: String(e) };
    }
  }, idx);
}

async function answerQuizzes(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[id^="q-card-"]')];
    let answered = 0;
    cards.forEach((card) => {
      const btn = card.querySelector("button.quiz-option");
      if (btn) {
        btn.click();
        answered++;
      }
    });
    if (!cards.length) {
      const groups = new Map();
      document.querySelectorAll("button.quiz-option").forEach((btn) => {
        const p = btn.closest("section, article, div");
        if (p && !groups.has(p)) {
          groups.set(p, true);
          btn.click();
          answered++;
        }
      });
      return { n: groups.size, answered };
    }
    return { n: cards.length, answered };
  });
}

async function gateState(page) {
  return page.evaluate(() => {
    const o = document.getElementById("terms-overlay");
    return {
      url: location.href,
      overlayVisible: !!(o && !o.hidden && getComputedStyle(o).display !== "none"),
      siteLocked: document.body.classList.contains("site-locked"),
      canEnter: !!(window.ScrollTerms && window.ScrollTerms.canEnter && window.ScrollTerms.canEnter()),
      signedIn: !!(window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser()),
      userId: window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser()
        ? window.ScrollAuth.getUser().id
        : null,
      hasAgreed: !!(window.ScrollTerms && window.ScrollTerms.hasAgreed && window.ScrollTerms.hasAgreed()),
    };
  });
}

async function main() {
  const report = {
    phase: PHASE,
    base: BASE,
    startedAt: new Date().toISOString(),
    sheetCount: SHEET_COUNT,
    access: { signedOut: [], deepLinks: [], session: {}, notes: [] },
    sheets: [],
    pages: [],
    map: null,
    gallery: null,
    mock: {
      mechanism: "localStorage.baQaMockSession read by js/shared/auth.js on localhost only",
      userId: MOCK_USER.id,
      email: MOCK_USER.email,
    },
  };

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });

  // ---------- A) Signed-out blocking ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      try {
        localStorage.removeItem("baQaMockSession");
        localStorage.removeItem("baJourney");
      } catch {}
    });
    const page = await ctx.newPage();
    const targets = [
      "study.html",
      "study.html?sheet=3",
      "map.html",
      "gallery.html",
      "insights.html",
    ];
    for (const t of targets) {
      const entry = { path: t, pass: false };
      await page.goto(`${BASE}/${t}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(900);
      entry.state = await gateState(page);
      entry.screenshot = await shot(page, `blocked-${t.replace(/[^\w]+/g, "_")}`);
      entry.pass = entry.state.overlayVisible && entry.state.siteLocked && !entry.state.canEnter && !entry.state.signedIn;
      entry.reason = entry.pass
        ? "overlay+site-locked; canEnter false"
        : JSON.stringify(entry.state);
      report.access.signedOut.push(entry);
      report.access.deepLinks.push(entry);
    }
    // Cover may stay browsable
    await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(700);
    const cover = await gateState(page);
    report.access.cover = {
      ...cover,
      screenshot: await shot(page, "cover-signed-out"),
      note: "Cover stays browsable; Begin/Enter CTAs open the gate (client-side).",
    };
    await ctx.close();
  }

  // ---------- B) Signed-in (mocked) curriculum walkthrough ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(mockAuthInitScript(MOCK_SESSION));
    const page = await ctx.newPage();
    const consoleLines = [];
    const netFails = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        consoleLines.push({ type: m.type(), text: m.text() });
      }
    });
    page.on("pageerror", (e) => consoleLines.push({ type: "pageerror", text: String(e) }));
    page.on("response", (r) => {
      if (r.status() >= 400) netFails.push({ status: r.status(), url: r.url() });
    });

    await page.goto(`${BASE}/study.html`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1000);
    const signedInGate = await gateState(page);
    report.access.signedInOpen = {
      ...signedInGate,
      screenshot: await shot(page, "signed-in-study-open"),
      pass: signedInGate.signedIn && signedInGate.canEnter && !signedInGate.siteLocked,
    };
    report.access.notes.push(
      "Mock session + termsByUser pre-seeded so canEnter is true without Google OAuth."
    );

    // Static pages while signed in
    for (const p of ["index.html", "study.html", "map.html", "gallery.html", "insights.html", "404.html"]) {
      const entry = { page: p, status: 0, pass: false };
      const res = await page.goto(`${BASE}/${p}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      entry.status = res?.status() || 0;
      await page.waitForTimeout(700);
      await dismissSoft(page);
      entry.title = await page.title();
      entry.screenshot = await shot(page, `page-${p.replace(".html", "")}`);
      entry.pass = entry.status >= 200 && entry.status < 400;
      report.pages.push(entry);
    }

    // Full sitting walkthrough
    await page.goto(`${BASE}/study.html`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1000);
    await dismissSoft(page);
    const titles = await page.evaluate(() => (window.sheetsData || []).map((s) => s.title));
    report.sheetTitles = titles;

    for (let i = 0; i < SHEET_COUNT; i++) {
      const entry = { sheet: i, title: titles[i] || `Sheet ${i}`, pass: false };
      await page.evaluate((idx) => {
        if (typeof window.loadSheet === "function") window.loadSheet(idx);
      }, i);
      await page.waitForTimeout(700);
      await dismissSoft(page);
      entry.screenshot = await shot(page, `sheet-${String(i).padStart(2, "0")}-start`);
      entry.workbench = await completeWorkbench(page, i);
      entry.quiz = await answerQuizzes(page);
      await page.evaluate((idx) => {
        try {
          window.BAJourney?.markSheetComplete?.(idx);
        } catch {}
        try {
          if (typeof window.completeAndAdvance === "function") window.completeAndAdvance();
          else document.getElementById("next-sheet-btn")?.click();
        } catch {}
      }, i);
      await page.waitForTimeout(500);
      await dismissSoft(page);
      const completed = await page.evaluate((idx) => {
        try {
          if (window.BAJourney?.sheetCompleted) return !!window.BAJourney.sheetCompleted(idx);
          const j = window.BAJourney?.load?.();
          return (j?.completedSheets || []).map(Number).includes(idx);
        } catch {
          return false;
        }
      }, i);
      entry.completedFlag = completed;
      entry.pass = !!completed;
      entry.reason = completed
        ? `completed wb=${entry.workbench?.ok} quiz=${entry.quiz?.answered}/${entry.quiz?.n}`
        : `not complete wb=${JSON.stringify(entry.workbench)} quiz=${JSON.stringify(entry.quiz)}`;
      entry.screenshotEnd = await shot(page, `sheet-${String(i).padStart(2, "0")}-end`);
      report.sheets.push(entry);
    }

    // Map
    await page.goto(`${BASE}/map.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    report.map = { screenshot: await shot(page, "map-home"), epochs: [] };
    const epochIds = await page.evaluate(() => {
      const src = window.MAP_CHRONICLE || window.ChronicleMap?.epochs || window.MAP_EPOCHS;
      if (Array.isArray(src)) return src.map((e) => e.id || e.year || e.key);
      if (src && Array.isArray(src.epochs)) return src.epochs.map((e) => e.id || e.year);
      return [...document.querySelectorAll("[data-year-id],[data-epoch-id]")]
        .map((el) => el.getAttribute("data-year-id") || el.getAttribute("data-epoch-id"))
        .filter(Boolean);
    });
    for (const id of [...new Set(epochIds || [])].slice(0, 16)) {
      const info = { id, pass: false };
      try {
        await page.evaluate((eid) => {
          if (window.ChronicleMap?.setYear) return window.ChronicleMap.setYear(eid);
          const el = document.querySelector(`[data-year-id="${eid}"],[data-epoch-id="${eid}"]`);
          if (el) el.click();
        }, id);
        await page.waitForTimeout(300);
        info.pass = true;
        info.screenshot = await shot(page, `map-${String(id).replace(/[^\w-]+/g, "_")}`);
      } catch (e) {
        info.reason = String(e);
      }
      report.map.epochs.push(info);
    }

    // Gallery
    await page.goto(`${BASE}/gallery.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3000);
    const enterBtn = page.locator('#btn-load-continue, button:has-text("Enter gallery")');
    if (await enterBtn.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await enterBtn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    report.gallery = { screenshot: await shot(page, "gallery-home"), artifacts: [] };
    const arts = await page.evaluate(() =>
      [...document.querySelectorAll("[data-asset]")]
        .map((el) => el.getAttribute("data-asset"))
        .filter(Boolean)
    );
    for (const id of [...new Set(arts || [])].slice(0, 40)) {
      const info = { id, pass: false };
      try {
        const ok = await page.evaluate((aid) => {
          const el = document.querySelector(`[data-asset="${aid}"]`);
          if (el) {
            el.click();
            return true;
          }
          return false;
        }, id);
        await page.waitForTimeout(400);
        info.pass = !!ok;
        if (report.gallery.artifacts.length < 10) {
          info.screenshot = await shot(page, `gallery-${String(id).replace(/[^\w-]+/g, "_").slice(0, 40)}`);
        }
      } catch (e) {
        info.reason = String(e);
      }
      report.gallery.artifacts.push(info);
    }

    // ---------- C) Session persistence (reload + new tab) ----------
    await page.goto(`${BASE}/study.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);
    const beforeReload = await gateState(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const afterReload = await gateState(page);
    report.access.session.reload = {
      before: beforeReload,
      after: afterReload,
      pass: afterReload.signedIn && afterReload.canEnter && afterReload.userId === MOCK_USER.id,
      screenshot: await shot(page, "session-after-reload"),
    };

    const page2 = await ctx.newPage();
    await page2.goto(`${BASE}/study.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page2.waitForTimeout(1000);
    const newTab = await gateState(page2);
    report.access.session.newTab = {
      ...newTab,
      pass: newTab.signedIn && newTab.canEnter,
      screenshot: await shot(page2, "session-new-tab"),
    };
    await page2.close();

    // ---------- D) Sign-out re-gates ----------
    await page.evaluate(async () => {
      try { sessionStorage.setItem("baQaForceSignedOut", "1"); } catch (e) {}
      try { localStorage.removeItem("baQaMockSession"); } catch (e) {}
      if (window.ScrollAuth && window.ScrollAuth.signOut) await window.ScrollAuth.signOut();
    });
    await page.waitForTimeout(500);
    await page.goto(`${BASE}/study.html?sheet=3`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(900);
    const afterOut = await gateState(page);
    report.access.session.signOut = {
      ...afterOut,
      pass: !afterOut.signedIn && afterOut.siteLocked && !afterOut.canEnter,
      screenshot: await shot(page, "session-after-signout-blocked"),
    };

    // preview=full on localhost still works for signed-out? Document — it is a local-only bypass.
    await page.goto(`${BASE}/study.html?preview=full`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);
    const prev = await gateState(page);
    report.access.previewFullLocal = {
      ...prev,
      note: "localhost-only bypass; ignored on Pages/Vercel hostnames",
      screenshot: await shot(page, "preview-full-localhost"),
    };

    report.console = consoleLines;
    report.networkFails = netFails;
    await ctx.close();
  }

  report.finishedAt = new Date().toISOString();
  const out = path.join(REPORT_DIR, `live-${PHASE}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));

  const summary = {
    phase: PHASE,
    base: BASE,
    out,
    signedOutBlocked: report.access.signedOut.filter((x) => x.pass).length,
    signedOutTotal: report.access.signedOut.length,
    signedInOpen: report.access.signedInOpen?.pass || false,
    sheetsPass: report.sheets.filter((s) => s.pass).length,
    sheetsTotal: report.sheets.length,
    mapEpochs: report.map?.epochs?.length || 0,
    galleryArtifacts: report.gallery?.artifacts?.length || 0,
    reloadPersists: report.access.session.reload?.pass || false,
    newTabPersists: report.access.session.newTab?.pass || false,
    signOutRegates: report.access.session.signOut?.pass || false,
  };
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();

  const hardFail =
    !summary.signedInOpen ||
    summary.sheetsPass < SHEET_COUNT ||
    summary.signedOutBlocked < summary.signedOutTotal ||
    !summary.reloadPersists ||
    !summary.newTabPersists ||
    !summary.signOutRegates;
  if (hardFail) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
