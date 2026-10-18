/*
 * Visual + behavioural check for the study story diagrams (chain / steps) and
 * the full-screen reader. It drives a real browser, so it catches what a unit
 * assertion cannot: blur that buries the artwork, a crossfade that snaps, a
 * transition that finishes before the eye arrives, and a reader whose copy is
 * missing or clipped.
 *
 * Usage (server must already serve the repo root):
 *   node tools/verify/verify_story_reader.mjs --base=http://127.0.0.1:8000 --label=after
 *
 * Writes PNGs to qa/proofs/story-<label>/ and prints a JSON summary.
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);
const BASE = String(args.base || 'http://127.0.0.1:8000').replace(/\/$/, '');
const LABEL = String(args.label || 'run');
const OUT = path.join('qa', 'proofs', `story-${LABEL}`);
fs.mkdirSync(OUT, { recursive: true });

const MOCK = {
  user: { id: 'qa-mock-user-001', email: 'qa.auditor@example.com', user_metadata: { full_name: 'QA Auditor', name: 'QA Auditor' } },
  session: { access_token: 'qa-mock-access-token', refresh_token: 'qa-mock-refresh-token', expires_at: 4102444800, token_type: 'bearer' },
};

const summary = { base: BASE, label: LABEL, sheets: [], problems: [] };
const shot = async (page, name) => {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
};

async function openSittingInPage(page, index) {
  await page.evaluate((i) => {
    const drawer = document.getElementById('toc-drawer');
    if (drawer.classList.contains('-translate-x-full')) window.toggleTocDrawer();
    document.querySelectorAll('#toc-unit-list button')[i].click();
    if (!drawer.classList.contains('-translate-x-full')) window.toggleTocDrawer();
  }, index);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  await context.addInitScript((mock) => {
    try {
      localStorage.setItem('baQaMockSession', JSON.stringify(mock));
      localStorage.setItem('baOnboardV1', '1');
      const raw = localStorage.getItem('baJourney');
      const j = raw ? JSON.parse(raw) : {};
      j.termsAccepted = true;
      j.termsByUser = Object.assign({}, j.termsByUser, { 'qa-mock-user-001': 5 });
      // A member who has worked through the course: every sitting is open, so
      // the run can read the diagrams of any sitting without the lock banner.
      j.completedSheets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      localStorage.setItem('baJourney', JSON.stringify(j));
    } catch (e) { /* storage disabled */ }
  }, MOCK);

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  for (const sheet of [0, 1, 8, 9]) {
    summary.sheets.push(await auditSheet(page, sheet));
  }

  summary.consoleErrors = consoleErrors.slice(0, 12);
  if (consoleErrors.length) summary.problems.push(`console errors: ${consoleErrors.length}`);
} finally {
  await browser.close();
}

// The sitting guide, the lock banner, and the toast all sit over the lesson.
// None of them is what is under test, so each is dismissed before the diagrams
// are read or clicked.
async function dismissOverlays(page) {
  await page.evaluate(() => {
    const skip = document.getElementById('sitting-guide-skip');
    const primary = document.getElementById('sitting-guide-primary');
    if (skip && !skip.hidden) skip.click();
    else if (primary && primary.offsetParent !== null) primary.click();
    const guide = document.getElementById('sitting-guide');
    if (guide) guide.hidden = true;
    const banner = document.getElementById('site-error');
    if (banner) {
      const close = [...banner.querySelectorAll('button')].find((b) => /dismiss/i.test(b.textContent.trim()));
      if (close) close.click();
      banner.hidden = true;
    }
    const toast = document.getElementById('toast');
    if (toast) {
      toast.classList.add('opacity-0', 'pointer-events-none');
      toast.textContent = '';
    }
  });
  await page.waitForTimeout(400);
}

async function auditSheet(page, sheet) {
  const row = { sheet, diagrams: [], reader: null };
  await page.goto(`${BASE}/study.html?sheet=0&preview=full`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await dismissOverlays(page);
  // The URL parameter only reaches the free sittings, so the rest are loaded
  // through the page's own contents drawer.
  if (sheet !== 0) {
    await openSittingInPage(page, sheet);
    await page.waitForTimeout(1800);
    await dismissOverlays(page);
  }
  await page.waitForSelector('#sheet-article figure.chain', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => {
    // Bring every diagram into view once so lazy reveals and artwork decode.
    document.querySelectorAll('#sheet-article figure.chain').forEach((f) => f.scrollIntoView({ block: 'center' }));
  });
  await page.waitForTimeout(900);

  const figures = await page.$$('#sheet-article figure.chain');
  row.diagramCount = figures.length;
  // One reader pass per sitting: the first story figure that carries artwork,
  // so the crossfade is exercised too; otherwise the first story figure.
  const storyKinds = await page.$$eval('#sheet-article figure.chain', (nodes) => nodes.map((fig) => ({
    story: fig.classList.contains('is-story'),
    photo: !!fig.querySelector('.story-photo'),
  })));
  const firstPhoto = storyKinds.findIndex((f) => f.story && f.photo);
  const firstStory = storyKinds.findIndex((f) => f.story);
  const readerAt = firstPhoto >= 0 ? firstPhoto : firstStory;

  for (let i = 0; i < figures.length; i++) {
    const info = await figures[i].evaluate((fig) => {
      const body = fig.querySelector('.chain-body');
      const img = fig.querySelector('.story-photo');
      const card = fig.querySelector('.story-card.is-active') || fig.querySelector('.story-card');
      const style = card ? getComputedStyle(card) : null;
      return {
        id: fig.getAttribute('data-diagram'),
        kind: fig.classList.contains('is-story') ? 'story' : 'static',
        open: !!body && !body.hidden,
        hasPhoto: !!img,
        photoLoaded: !!img && img.complete && img.naturalWidth > 0,
        cards: fig.querySelectorAll('.story-card').length,
        columns: fig.querySelectorAll('.cmp-col').length,
        rows: fig.querySelectorAll('.tbl tbody tr').length,
        tracks: fig.querySelectorAll('.tl-track').length,
        flowSteps: fig.querySelectorAll('.flow-step').length,
        cardTransition: style ? style.transition : '',
        flatCites: fig.querySelectorAll('.chain-cite.is-flat').length,
        cites: fig.querySelectorAll('.chain-cite').length,
        text: (fig.querySelector('.chain-title-cap') || {}).textContent || '',
      };
    });
    info.screenshot = `s${sheet}-fig${i}-${info.id}.png`;
    await figures[i].screenshot({ path: path.join(OUT, info.screenshot) }).catch(() => {});
    // The reader is opened once per sitting, on the figure chosen above.
    if (i === readerAt) {
      await figures[i].evaluate((fig) => fig.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      info.stageShot = `s${sheet}-stage.png`;
      await figures[i].screenshot({ path: path.join(OUT, info.stageShot) });
      row.reader = await auditReader(page, figures[i], sheet);
    }
    row.diagrams.push(info);
  }
  return row;
}

async function auditReader(page, figure, sheet) {
  const out = {};
  const launch = await figure.$('.story-fullscreen');
  if (!launch) return { error: 'no full-screen control' };
  await launch.click();
  await page.waitForTimeout(1400);
  out.focusOnOpen = await page.evaluate(() => {
    const r = document.querySelector('body > .story-read');
    const a = document.activeElement;
    return {
      inReader: !!(r && a && r.contains(a)),
      active: a ? a.tagName + '.' + String(a.className || '').slice(0, 30) : 'none',
    };
  });

  out.open = await page.evaluate(() => {
    const r = document.querySelector('body > .story-read');
    if (!r) return null;
    const bg = r.querySelector('.story-read-bg');
    const veil = r.querySelector('.story-read-veil');
    const photo = r.querySelector('.story-read-photo');
    const frame = r.querySelector('.story-read-frame');
    const cs = getComputedStyle(bg);
    const vs = getComputedStyle(veil);
    // The reader's copy lives on the enlarged card clones and in the study band
    // under the deck. The old `.story-read-kicker/-title/-cite/-copy/-detail`
    // container was removed by the clone-deck rework; querying it here made
    // every copy assertion below vacuously pass.
    const clone = r.querySelector('.story-read-deck .story-card');
    const pick = (root, sel) => (root && root.querySelector(sel) ? root.querySelector(sel).textContent.trim() : '');
    return {
      hidden: r.hidden,
      opacity: getComputedStyle(r).opacity,
      bgFilter: cs.filter,
      bgOpacity: cs.opacity,
      bgImage: cs.backgroundImage.slice(0, 90),
      layerCount: r.querySelectorAll('.story-read-photo').length,
      photoSrc: photo ? (photo.getAttribute('src') || '') : '',
      veilBackground: vs.backgroundColor + ' | ' + vs.backdropFilter,
      deckCards: r.querySelectorAll('.story-read-deck .story-card').length,
      kicker: pick(clone, '.story-kicker'),
      title: pick(clone, '.story-title'),
      cite: pick(clone, '.chain-cite'),
      copy: pick(clone, '.story-text'),
      detail: pick(r, '.story-read-band-detail'),
      bandChip: pick(r, '.story-read-band-cite .chain-cite'),
      count: (r.querySelector('.story-read-count') || {}).textContent,
      frameTop: frame ? Math.round(frame.getBoundingClientRect().top) : null,
      frameHeight: frame ? Math.round(frame.getBoundingClientRect().height) : null,
      viewportHeight: window.innerHeight,
    };
  });
  out.screenshot = path.basename(await shot(page, `s${sheet}-reader-1`));

  const next = await page.$('body > .story-read [data-read-next]');
  if (next) {
    const before = out.open && out.open.photoSrc;
    out.focusBeforeNext = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      const a = document.activeElement;
      return { inReader: !!(r && a && r.contains(a)), active: a ? a.tagName + '.' + String(a.className || '').slice(0, 24) : 'none' };
    });
    await next.click();
    out.focusAfterNext = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      const a = document.activeElement;
      return { inReader: !!(r && a && r.contains(a)), active: a ? a.tagName + '.' + String(a.className || '').slice(0, 24) : 'none' };
    });
    // Sampled mid-transition: a real crossfade is still moving here.
    await page.waitForTimeout(320);
    out.midFade = await page.evaluate(() => {
      const layers = [...document.querySelectorAll('body > .story-read .story-read-photo')];
      return {
        layers: layers.length,
        opacities: layers.map((l) => Number(getComputedStyle(l).opacity).toFixed(2)),
        srcs: layers.map((l) => (l.getAttribute('src') || '').split('/').pop()),
      };
    });
    await page.waitForTimeout(1600);
    out.afterNext = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      const photo = r.querySelector('.story-read-photo');
      // Read the copy off the now-active clone and the study band, which is
      // where the reader actually renders it after the clone-deck rework.
      const active = r.querySelector('.story-read-deck .story-card.is-active');
      const text = (sel) => {
        const el = active && active.querySelector(sel);
        return el ? el.textContent.trim() : '';
      };
      const band = r.querySelector('.story-read-band-detail');
      return {
        title: text('.story-title'),
        copy: text('.story-text'),
        count: (r.querySelector('.story-read-count') || {}).textContent,
        detail: band ? band.textContent.trim().slice(0, 70) : '',
        detailShown: !!(band && band.textContent.trim()),
        bandChip: ((r.querySelector('.story-read-band-cite .chain-cite') || {}).textContent || '').trim(),
        deckCards: r.querySelectorAll('.story-read-deck .story-card').length,
        pips: r.querySelectorAll('.story-read-pip').length,
        activePip: [...r.querySelectorAll('.story-read-pip')].findIndex((p) => p.classList.contains('is-active')),
        photoSrc: photo ? (photo.getAttribute('src') || '').split('/').pop() : '',
      };
    });
    // A movement change must actually change what is on screen: the title on the
    // active clone and the line in the band are the two things that move.
    out.copyChanged = out.open && out.afterNext && out.open.title !== out.afterNext.title;
    if (!out.copyChanged) out.problems = (out.problems || []).concat('movement change did not change the reader title');
    out.changed = before !== (out.afterNext && out.afterNext.photoSrc);
    out.screenshot2 = path.basename(await shot(page, `s${sheet}-reader-2`));
    // Arrows are handled once, at the document: one press must move one
    // movement, not two.
    const countBefore = out.afterNext && out.afterNext.count;
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(700);
    out.afterArrowLeft = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      return (r.querySelector('.story-read-count') || {}).textContent;
    });
    out.arrowMovedOnce = countBefore !== out.afterArrowLeft;
    // Ctrl/Cmd+Arrow is bound to the page's own sitting navigation. With the
    // reader open, one press must move one movement and nothing else.
    out.pageKeyHandlerRuns = await page.evaluate(() => {
      window.__pageKeyRuns = 0;
      document.addEventListener('keydown', (e) => {
        if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (e.ctrlKey || e.metaKey)) window.__pageKeyRuns++;
      });
      return 0;
    });
    const sheetBefore = await page.evaluate(() => document.body.dataset.sheetIndex || null);
    await page.keyboard.press('Control+ArrowRight');
    await page.waitForTimeout(600);
    out.ctrlArrow = {
      pageHandlerRuns: await page.evaluate(() => window.__pageKeyRuns),
      sheetBefore,
      sheetAfter: await page.evaluate(() => document.body.dataset.sheetIndex || null),
      count: await page.evaluate(() => {
        const r = document.querySelector('body > .story-read');
        return (r.querySelector('.story-read-count') || {}).textContent;
      }),
    };
    out.focusTrace = [];
    for (let t = 0; t < 3; t++) {
      await page.waitForTimeout(600);
      out.focusTrace.push(await page.evaluate(() => {
        const r = document.querySelector('body > .story-read');
        const a = document.activeElement;
        return (r && a && r.contains(a)) ? 'in:' + a.tagName : 'OUT:' + (a ? a.tagName : 'none');
      }));
    }
    out.focusBeforeEscape = await page.evaluate(() => {
      const a = document.activeElement;
      return a ? (a.tagName + '.' + (a.className || '') + '[' + (a.textContent || '').trim().slice(0, 20) + ']') : 'none';
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(140);
    out.afterEscape140 = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return {
        isOpen: r.classList.contains('is-open'),
        opacity: getComputedStyle(r).opacity,
        pointerEvents: getComputedStyle(r).pointerEvents,
        centerHit: hit ? (hit.className || hit.tagName).toString().slice(0, 40) : null,
      };
    });
    // The overlay is faded out, so it is still mounted while the fade runs.
    await page.waitForTimeout(1300);
    out.closed = await page.evaluate(() => {
      const r = document.querySelector('body > .story-read');
      if (!r) return true;
      return { hidden: r.hidden, isOpen: r.classList.contains('is-open'), opacity: getComputedStyle(r).opacity };
    });
  }
  return out;
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
