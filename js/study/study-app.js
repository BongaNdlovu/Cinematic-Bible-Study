    // Sequential sittings: access is owned by BAJourney.canAccessSheet.

    /* Timeout-aware fetch for this page's own assets (cues, concordance).
       Uses SiteNet when present; degrades to a plain fetch that still cannot
       hang forever. */
    function netRequest(url, opts) {
      if (window.SiteNet && typeof window.SiteNet.request === 'function') {
        return window.SiteNet.request(url, opts);
      }
      const ctrl = ('AbortController' in window) ? new AbortController() : null;
      const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : 0;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined })['finally'](function () {
        if (timer) clearTimeout(timer);
      });
    }

    // Every sitting needs a sign-in (15 November 2026). A guest is sent to the
    // Account page and returns here afterwards. The page stays hidden until the
    // session is known, so a guest does not see the lesson flash first.
    (function gateStudyForMembers() {
      const J = window.BAJourney;
      if (!J || typeof J.requireMember !== 'function') return;
      const root = document.documentElement;
      try { root.style.visibility = 'hidden'; } catch (e) {}
      const reveal = function () { try { root.style.visibility = ''; } catch (e) {} };
      let gate;
      try {
        gate = J.requireMember('study.html' + (location.search || '') + (location.hash || ''));
      } catch (e) {
        reveal();
        return;
      }
      Promise.resolve(gate).then(function (allowed) {
        if (allowed) reveal();
      }, reveal);
    })();

    // A guest only sees this copy for an instant before the sign-in redirect.
    function memberLockText(fallback) {
      const guest = !(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
      return guest ? 'Members only — sign in to continue' : fallback;
    }

    const sheetToTimelineMap = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 1,
      6: 1,
      7: 4,
      8: 6,
      9: 2,
      10: 7
    };

    const timelineToSheetMap = {
      0: 0,
      1: 5,
      2: 9,
      3: 9,
      4: 7,
      5: 7,
      6: 8,
      7: 10
    };

    let currentEpochIndex = 0;

    function sheetBelongsToEpoch(sheetIdx, epochIdx) {
      if (sheetToTimelineMap[sheetIdx] === epochIdx) return true;
      return timelineToSheetMap[epochIdx] === sheetIdx;
    }

    function epochAccessible(epochIdx) {
      const target = timelineToSheetMap[epochIdx];
      if (typeof target !== 'number') return true;
      return canAccessSheet(target);
    }

    function showInstrument(id) {
      document.querySelectorAll('.instrument-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.instrument === id));
      document.querySelectorAll('.instrument-panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + id));
      if (id === 'map') {
        expandSittingMap(false);
        renderSheetMapPanel(currentSheetIndex);
      }
      if (id === 'scripture') {
        const box = document.querySelector('#scripture-root .scripture-scroll');
        const focus = document.getElementById('scripture-focus');
        if (box && focus) {
          box.scrollTop = Math.max(0, focus.offsetTop - box.offsetTop - 16);
        }
        if (window.StudyCompetency) {
          const pass = (sheetsData[currentSheetIndex] && sheetsData[currentSheetIndex].scripture) || `Sheet ${currentSheetIndex}`;
          window.StudyCompetency.recordScriptureLookup(pass);
        }
      }
    }

    function openLessonScripture() {
      showInstrument('scripture');
      const panel = document.getElementById('panel-scripture');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const STUDY_EPOCH_TO_YEAR = (window.MAP_CHRONICLE && window.MAP_CHRONICLE.studyEpochIds) ||
      ['y605', 'y539', 'y457', 'y31', 'y538', 'y1798', 'y1844', 'y12'];
    if (window.BAJourney) window.BAJourney.load();

    let sittingBusy = false;
    let sittingYearOverride = null;
    let sittingEmpireOverride = null;

    function journeyState() {
      return window.BAJourney ? window.BAJourney.load() : { unlocked: [], station: {}, pathSheet: -1, sheet: 0, year: 'y605' };
    }

    function spineEmpireForSheet(index, unlocked) {
      if (index <= 4) return 'gold';
      if (index <= 6) return 'silver';
      if (index === 7) return 'iron';
      if (index === 8) return 'bronze';
      if (index === 9) return 'silver';
      return 'stone';
    }

    const SHEET_COMPETENCIES = [
      "The Prophetic Blueprint — Christ at the Center of the Chain",
      "Distinguishing Civic Service from Covenant Defilement",
      "Defending the Contiguous Chain of Four Empires",
      "Discerning Forced Worship on the Plain of Dura",
      "Reading the Seven Times of Nebuchadnezzar’s Humiliation",
      "Reading the Divine Balance Sheet — Numbered, Weighed, Covered",
      "Uncompromising Prayer and the Resurrected Deliverer",
      "Verifying the 1,260-Year Ecclesiastical Supremacy",
      "Vindicating the Sanctuary: 2,300 Days and the High Priest",
      "Calculating the 70 Weeks Severed from the 2,300 Days",
      "Standing Prepared as the Sealed Book Unlocks"
    ];

    function updateSpine(index, yearId, empireId) {
      const emp = empireId || sittingEmpireOverride || spineEmpireForSheet(index, journeyState().unlocked);
      const year = yearId || sittingYearOverride || STUDY_EPOCH_TO_YEAR[sheetToTimelineMap[index] || 0] || 'y605';
      const empireEl = document.getElementById('spine-empire');
      const sheetEl = document.getElementById('spine-sheet');
      const yearEl = document.getElementById('spine-year');
      if (empireEl) empireEl.textContent = window.BAJourney ? window.BAJourney.empireLabel(emp) : emp;
      if (sheetEl) sheetEl.textContent = index + ' of 11';
      if (yearEl) yearEl.textContent = window.BAJourney ? window.BAJourney.yearLabel(year) : year;

      const compText = SHEET_COMPETENCIES[index] || "Historicist Exegesis";
      const headerPill = document.getElementById('header-competency-pill');
      const headerCompText = document.getElementById('header-competency-text');
      if (headerCompText) {
        headerCompText.textContent = compText;
        if (headerPill) headerPill.title = "Current learning competency: " + compText;
      } else if (headerPill) {
        headerPill.textContent = compText;
        headerPill.title = "Current learning competency: " + compText;
      }
      const spineComp = document.getElementById('spine-competency');
      if (spineComp) {
        spineComp.textContent = compText;
      }
    }

    function pulseMapYear(yearId, opts) {
      sittingYearOverride = yearId;
      if (window.BAJourney) window.BAJourney.save({ year: yearId });
    }

    let sittingPhase = 'study';
    const sittingVisited = { study: true, tasks: false };

    function bibleNoticeChapters(index) {
      const passage = window.BAScripture && window.BAScripture.passageForSheet(index);
      const sections = (passage && passage.sections) || [];
      if (!sections.length) return '';
      const first = sections[0];
      const last = sections[sections.length - 1];
      if (first.book !== last.book) return sections.map((s) => s.book + ' ' + s.chapter).join(' · ');
      if (sections.length === 1) return first.book + ' Chapter ' + first.chapter;
      return first.book + ' Chapters ' + first.chapter + '–' + last.chapter;
    }

    function closeInfographic() {
      const modal = document.getElementById('infographic-modal');
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove('infographic-open');
    }

    function openInfographic() {
      const modal = document.getElementById('infographic-modal');
      const img = document.getElementById('infographic-modal-img');
      if (!modal || !img) return;
      if (!img.getAttribute('src') && img.dataset.src) {
        img.src = img.dataset.src;
      }
      if (!img.getAttribute('src')) return;
      modal.hidden = false;
      document.body.classList.add('infographic-open');
      const closeBtn = document.getElementById('infographic-modal-close');
      if (closeBtn) closeBtn.focus();
      if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'infographic' });
    }

    window.StudyAudioReader = {
      texts: () => AudioReader.texts(),
      checkpoints: () => AudioCheckpoints.stops.map((stop) => stop.at)
    };

    function renderBibleNotice(index) {
      const badge = document.getElementById('bible-notice-chapters');
      if (!badge) return;
      const label = bibleNoticeChapters(index);
      if (label) badge.textContent = label;
    }

    function renderSheetInstruments(index) {
      const ctx = SHEET_CONTEXT[index] || SHEET_CONTEXT[0];
      const ins = SHEET_INSIGHTS[index] || SHEET_INSIGHTS[0];
      document.getElementById('context-img').src = ctx.img;
      document.getElementById('context-title').textContent = ctx.title;
      document.getElementById('context-body').textContent = ctx.body;
      document.getElementById('context-source').textContent = ctx.source;
      document.getElementById('context-exegesis').textContent = ctx.exegesis;
      document.getElementById('insight-genre').textContent = ins.genre;
      document.getElementById('insight-section').textContent = ins.section;
      document.getElementById('insight-theme').textContent = ins.theme;
      if (window.BAScripture) window.BAScripture.showSheet(index).then(() => renderBibleNotice(index));
    }

    function openArtifactModal() {
      const modal = document.getElementById('artifact-modal');
      modal.classList.remove('opacity-0', 'pointer-events-none');
    }

    function closeArtifactModal() {
      const modal = document.getElementById('artifact-modal');
      modal.classList.add('opacity-0', 'pointer-events-none');
    }

    let timerDuration = 5 * 60;
    let timeRemaining = 5 * 60;
    let timerInterval = null;
    let timerEndsAt = 0;
    let isTimerRunning = false;

    // Atmospheric Focus State — a continuous quiet → storm → sunshine continuum
    let weatherPreset = 'auto'; // visual weather only — no rain/thunder audio
    let currentWeatherType = 'quiet';
    let focusAtmosphere = 0;
    let weatherRunning = false;
    let weatherScene = null;
    let weatherWorker = null;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tickPomodoro();
    });

    let currentSheetIndex = 0;
    let completedSheets = new Set();
    let currentThemeIdx = 0;
    let currentFontIdx = 1;
    // Auto mode: the reading size follows the screen until the learner picks
    // one with A-/A+. Legacy saves that match the old default are treated as
    // auto; deliberate non-default choices keep working untouched.
    let fontAuto = true;

    try {
      if (window.BAJourney) {
        completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
      } else {
        const savedCompleted = localStorage.getItem('daniel_historicist_mastery');
        if (savedCompleted) completedSheets = new Set(JSON.parse(savedCompleted));
      }
      const savedSheet = localStorage.getItem('daniel_historicist_sheet');
      if (savedSheet !== null) currentSheetIndex = parseInt(savedSheet, 10) || 0;
      const savedFont = localStorage.getItem('daniel_font_size_idx_v4');
      const manualFont = localStorage.getItem('daniel_font_manual_v1') === '1';
      const legacyChosen = savedFont !== null && parseInt(savedFont, 10) !== 1;
      if (manualFont || legacyChosen) {
        fontAuto = false;
        if (savedFont !== null) currentFontIdx = Math.max(0, Math.min(fontSizes.length - 1, parseInt(savedFont, 10) || 1));
        if (legacyChosen && !manualFont) localStorage.setItem('daniel_font_manual_v1', '1');
      }
      const savedThemeName = localStorage.getItem('daniel_theme_name_v1');
      if (savedThemeName === 'white' || savedThemeName === 'night') {
        currentThemeIdx = themes.indexOf(savedThemeName);
      } else {
        currentThemeIdx = 0;
      }
    } catch (e) {}

    let toastTimer = 0;
    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastTimer = 0;
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 2500);
    }

    let fontResizeTimer = null;
    window.addEventListener('resize', () => {
      if (!fontAuto) return;
      clearTimeout(fontResizeTimer);
      fontResizeTimer = setTimeout(applyFontSize, 180);
    });

    function toggleTocDrawer() {
      const drawer = document.getElementById('toc-drawer');
      const overlay = document.getElementById('toc-overlay');
      const isOpen = !drawer.classList.contains('-translate-x-full');

      if (isOpen) {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
      } else {
        renderToc();
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
      }
    }

    function hasCompletedCourse() {
      return sheetsData.every((_, i) => completedSheets.has(i));
    }

    function syncCertificateCta() {
      const btn = document.getElementById('btn-download-certificate');
      if (!btn) return;
      btn.hidden = !hasCompletedCourse();
    }

    const studyModules = new Map();

    function studyModuleFailed(name) {
      const entry = studyModules.get(name);
      return !!(entry && entry.failed);
    }

    function studyAssetPath(name) {
      const host = document.getElementById('study-chunks');
      return host ? host.getAttribute('data-' + name) || '' : '';
    }

    function loadStudyModule(name) {
      const known = studyModules.get(name);
      if (known) return known.promise;
      const entry = { failed: false };
      const src = studyAssetPath(name);
      entry.promise = new Promise((resolve, reject) => {
        if (!src) { reject(new Error('no file for ' + name)); return; }
        const tag = document.createElement('script');
        tag.src = src;
        tag.async = true;
        tag.addEventListener('load', () => resolve());
        tag.addEventListener('error', () => {
          tag.remove();
          reject(new Error(name + ' failed to load'));
        });
        document.head.appendChild(tag);
      });
      entry.promise.catch(() => {
        entry.failed = true;
        window.setTimeout(() => { if (studyModules.get(name) === entry) studyModules.delete(name); }, 30000);
      });
      studyModules.set(name, entry);
      return entry.promise;
    }

    function openCertificateIfReady() {
      if (!hasCompletedCourse()) return;
      if (window.StudyCertificate) {
        window.StudyCertificate.open();
        return;
      }
      loadStudyModule('certificate').then(() => {
        if (window.StudyCertificate) window.StudyCertificate.open();
      }, () => showToast('The certificate could not load. Check your connection and try again.'));
    }

    function renderToc() {
      const list = document.getElementById('toc-unit-list');
      list.innerHTML = '';

      const memberViewer = !!(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
      const maxOpenIdx = (window.BAJourney && typeof window.BAJourney.maxOpenSheet === 'function') ? window.BAJourney.maxOpenSheet() : 0;

      sheetsData.forEach((sheet, idx) => {
        const isCurrent = idx === currentSheetIndex;
        const isDone = completedSheets.has(idx);

        const locked = !canAccessSheet(idx);
        // A guest's rows are sign-in doors (the page also sends guests to sign in).
        const guestWall = locked && !memberViewer;
        const btn = document.createElement('button');
        btn.type = 'button';
        if (!locked) {
          btn.addEventListener('click', () => {
            loadSheet(idx);
            toggleTocDrawer();
          });
        } else if (guestWall) {
          btn.addEventListener('click', () => {
            window.location.assign('account.html?next=' + encodeURIComponent('study.html?sheet=' + idx));
          });
        } else {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
        }
        const statusChip = isDone
          ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">✓ Completed</p>'
          : (locked
            ? `<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">${memberLockText('Locked — finish the open sitting')}</p>`
            : (!memberViewer && idx === maxOpenIdx
              ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Free — start here</p>'
              : (memberViewer && idx === maxOpenIdx
                ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Up next</p>'
                : '')));
        btn.className = `w-full text-left p-3 rounded-lg flex items-start space-x-3 transition-colors ${
          locked
            ? (guestWall
              ? 'opacity-70 hover:bg-paper-200/60 dark:hover:bg-paper-900'
              : 'opacity-45 cursor-default pointer-events-none')
            : isCurrent
            ? 'bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800'
            : 'hover:bg-paper-200/60 dark:hover:bg-paper-900'
        }`;

        btn.innerHTML = `
          <div class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
            isDone
              ? 'bg-emerald-600 text-white'
              : isCurrent
                ? 'bg-amber-600 text-white'
                : 'bg-paper-300 dark:bg-paper-800 text-ink-600 dark:text-paper-400'
          }">
            ${isDone ? '✓' : idx}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase">
              <span>${sheet.epoch}</span>
              <span>${sheet.readTime}</span>
            </div>
            <h4 class="font-serif text-sm font-semibold text-ink-900 dark:text-paper-100 truncate mt-0.5">
              ${sheet.title}
            </h4>
            ${statusChip}
          </div>
        `;
        if (locked && !guestWall) btn.title = 'Locked — finish the open sitting first';
        list.appendChild(btn);
      });

      const pct = Math.round((completedSheets.size / sheetsData.length) * 100);
      document.getElementById('toc-mastery-percent').innerText = `${pct}%`;
      document.getElementById('toc-mastery-bar').style.width = `${pct}%`;
      syncCertificateCta();
    }

    /* Mindmap: the steps around a centre node. js/study/mindmap.js renders into
       this host and owns the frame loop, observers and listeners, so it is
       destroyed with the figure. */
    function bodyMindmap(spec) {
      return '<div class="mm" data-mm-host></div>';
    }

    function replayControlFor(figure) {
      for (let node = figure ? figure.nextElementSibling : null; node; node = node.nextElementSibling) {
        if (node.matches('figure.chain')) return null;
        if (node.matches('[data-chain-replay]')) return node;
      }
      return null;
    }

    function wireFigure(state) {
      // Shared shell: caption, collapse control, entrance animation, replay.
      // `figure` carries data-chain itself, so it is passed in rather than
      // queried for — querySelector only searches descendants.
      const figure = state.figure;
      const panel = figure.querySelector('.chain-body');
      const toggle = figure.querySelector('.chain-toggle');
      const replay = state.replay || replayControlFor(figure);
      if (!figure || !panel || !toggle || !replay) return;

      const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb) => setTimeout(cb, 16);
      const caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : window.clearTimeout;
      let frame = 0;
      let started = false;

      const play = () => {
        if (reduce && reduce.matches) { figure.classList.add('is-visible'); return; }
        figure.classList.remove('is-visible');
        caf(frame);
        // Double rAF guarantees a style flush without forcing a sync layout.
        frame = raf(() => { frame = raf(() => figure.classList.add('is-visible')); });
      };
      const start = () => { if (started) return; started = true; play(); };
      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Collapse diagram' : 'Expand diagram');
        panel.hidden = !open;
      };

      if (figure.getBoundingClientRect().top < window.innerHeight * 0.9) start();
      else if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) { io.disconnect(); start(); }
        }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
        io.observe(figure);
      } else start();

      toggle.addEventListener('click', () => {
        // A host that owns the collapse control itself — a flow, whose scene
        // reader lives inside the panel, so wireStory() has already wired that
        // button — keeps this shell for the entrance animation only: expanding
        // the panel replays the rail.
        if (state.ownsToggle === true) {
          if (toggle.getAttribute('aria-expanded') === 'true') play();
          return;
        }
        const open = toggle.getAttribute('aria-expanded') !== 'false';
        setOpen(!open);
        if (!open) { started = true; play(); }
      });
      replay.addEventListener('click', () => { setOpen(true); started = true; play(); });
    }

    function releaseSheetFigures(root) {
      if (!root) return;
      root.querySelectorAll('figure').forEach((figure) => {
        releaseFigureFullscreen(figure);
        if (figure.__mm && typeof figure.__mm.destroy === 'function') figure.__mm.destroy();
        figure.__mm = null;
        if (typeof figure.__storyRelease === 'function') figure.__storyRelease();
        figure.__storyRelease = null;
      });
      releaseFullscreenLeftovers();
    }

    function renderSheetDiagrams(data) {
      document.querySelectorAll('body > .story-read').forEach((node) => {
        // Unhook the reader before it leaves the page: its key listener is
        // attached to the document, not to the node.
        if (typeof node.disarmStoryReader === 'function') node.disarmStoryReader();
        node.remove();
      });
      document.documentElement.classList.remove('story-read-open');
      /* A sitting switch rewrites #sheet-article's innerHTML, which detaches any
         figure that was full screen before its own exit() could run. The lock
         lives on <html>, not on the figure, so it is the one thing that would
         survive the rewrite with nothing left on screen to release it. */
      document.documentElement.classList.remove('dfx-open');
      releaseFullscreenLeftovers();
      const sheet = data || {};
      // Sittings mid-migration may still carry the single-diagram field.
      const specs = sheet.diagrams || (sheet.diagram ? { legacy: sheet.diagram } : {});
      const article = document.getElementById('sheet-article');
      if (!article) return;
      const sheetIndex = Number(article.getAttribute('data-sheet-index'));
      const refs = referenceIndex(isNaN(sheetIndex) ? 0 : sheetIndex);
      const canResolve = makeCiteResolver(refs);
      article.querySelectorAll('figure[data-diagram]').forEach((figure) => {
        // The mindmap owns a rAF loop, a ResizeObserver, an IntersectionObserver
        // and a block-scoped key listener. A sitting switch rebuilds the article,
        // so the previous mount is torn down before the figure is rewritten.
        releaseFigureFullscreen(figure);
        if (figure.__mm && typeof figure.__mm.destroy === 'function') figure.__mm.destroy();
        figure.__mm = null;
        if (typeof figure.__storyRelease === 'function') figure.__storyRelease();
        figure.__storyRelease = null;
        const id = figure.getAttribute('data-diagram');
        const spec = specs[id];
        if (!spec) return;
        const steps = Array.isArray(spec.steps) ? spec.steps : [];
        const rows = Array.isArray(spec.rows) ? spec.rows : [];
        const kind = spec.kind || 'chain';
        const needs = kind === 'table' ? rows : steps;
        if (needs.length < 2) return;

        const isStory = kind === 'chain' || kind === 'steps';
        let storyStart = 0;
        if (isStory && kind === 'chain') {
          const mid = steps.findIndex((step) => step.centre);
          if (mid >= 0) storyStart = mid;
        }

        let body = '';
        if (isStory) body = bodyStory(spec, steps, canResolve, storyStart, id);
        else if (kind === 'comparison') body = bodyComparison(spec, steps, canResolve);
        else if (kind === 'table') body = bodyTable(spec, rows);
        else if (kind === 'flow') body = bodyFlow(spec, steps, canResolve, id, flowContinuation(figure, specs, kind));
        else if (kind === 'mindmap') body = bodyMindmap(spec, steps, canResolve);
        else if (kind === 'timeline') body = bodyTimeline(spec, steps, canResolve);
        else body = bodyChain(spec, steps, true, canResolve);

        // The plain-text artwork stays in the DOM, hidden, so it survives for
        // search and copy without duplicating what the cards announce.
        const asciiEl = figure.querySelector('.chain-ascii');
        const ascii = asciiEl ? asciiEl.textContent : '';

        figure.classList.add('chain');
        figure.setAttribute('data-chain', '');
        figure.innerHTML =
          (FULLSCREEN_KINDS.has(kind) ? fullscreenControlHtml() : '') +
          '<button class="chain-toggle" type="button" aria-expanded="true" aria-controls="' + id + '-body" aria-label="Collapse diagram">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5l5 5 5-5"/></svg>' +
          '</button>' +
          (spec.title ? '<figcaption class="chain-title-cap">' + escapeStudy(spec.title) + '</figcaption>' : '') +
          (ascii ? '<pre class="chain-ascii" aria-hidden="true">' + escapeStudy(ascii) + '</pre>' : '') +
          '<div class="chain-body" id="' + id + '-body">' + body + '</div>' +
          (spec.note ? '<p class="chain-note">' + escapeStudy(spec.note) + '</p>' : '');

        if (isStory) {
          figure.classList.add('is-story');
          wireStory(figure);
        } else {
          const replay = document.createElement('button');
          replay.type = 'button';
          replay.className = 'chain-replay';
          replay.setAttribute('data-chain-replay', '');
          replay.textContent = 'Replay animation';
          figure.parentNode.insertBefore(replay, figure.nextSibling);
          if (kind === 'flow') {
            // A flow keeps its stack visible and reuses the story reader as its
            // scene layer: wireStory() wires the panel and the reader (the panel
            // it opens contains it), the shared shell supplies the entrance
            // animation and the Replay control, and wireFlow() opens a step's
            // scene. The carousel those cards belong to stays hidden.
            wireStory(figure);
            wireFigure({ figure: figure, replay: replay, ownsToggle: true });
            wireFlow(figure);
          } else {
            wireFigure({ figure: figure, replay: replay });
            // The timeline's axis, legend and panel are one selection; the wiring
            // is its own, and the shell's full-screen layer is added after it.
            if (kind === 'timeline') wireTimeline(figure);
            if (FULLSCREEN_KINDS.has(kind)) wireDiagramFullscreen(figure, kind);
          }
        }
        // The mindmap mounts after the shell exists: it reuses the figure's own
        // Replay control, and its host must already be in the document so the
        // ResizeObserver and IntersectionObserver have something to measure.
        if (kind === 'mindmap' && window.MindMap && typeof window.MindMap.create === 'function') {
          const mmHost = figure.querySelector('.mm');
          if (mmHost) figure.__mm = window.MindMap.create(mmHost, spec, { cite: diagramCite, canResolve: canResolve });
        }
        if (refs.length) decorateCitations(figure, refs);
      });
    }

    /* Both layers add and remove the class that makes the list a panel. The
       document's class changes are observed, so the Close control always
       follows it. */
    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => syncCiteClose())
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    /* Capture phase, so the panel answers Escape before any layer below it: the
       diagram's own handler is also capture-phase and is registered later, so it
       runs after this one and sees the class already cleared. */
    document.addEventListener('keydown', onCitePanelKey, true);

    document.addEventListener('click', (e) => {
      const cite = e.target.closest && e.target.closest('.cite-ref');
      if (cite) {
        e.preventDefault();
        revealReference(cite.getAttribute('data-cite'));
        return;
      }
      const chainCite = e.target.closest && e.target.closest('.chain-cite');
      if (chainCite) {
        e.preventDefault();
        resolveCiteLabel(chainCite.getAttribute('data-cite-src'));
        return;
      }
      const citeClose = e.target.closest && e.target.closest('[data-cite-close]');
      if (citeClose) {
        e.preventDefault();
        closeCitePanel();
      }
    });

    // The study-path card carries one thing only: the questions to sit with.
    // The trace / christ / now / help / value blocks were removed by request;
    // their helpers above remain unused rather than deleted, so nothing else
    // that referenced them can break.
    function renderStudyGuide(guide) {
      const box = document.getElementById("sheet-study-path");
      if (!box) return;
      const asked = guide && Array.isArray(guide.ask) ? guide.ask.filter((q) => q && String(q).trim()) : [];
      if (!asked.length) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      const items = asked
        .map((q, i) => '<li class="study-ask-item"><span class="study-ask-num" aria-hidden="true">' + (i + 1) + '</span><span class="study-ask-text">' + escapeStudy(String(q)) + "</span></li>")
        .join("");
      box.hidden = false;
      box.innerHTML =
        '<div class="study-ask-head">' +
          '<span class="study-ask-orb" aria-hidden="true"></span>' +
          '<p class="study-ask-kicker">Questions to sit with</p>' +
        "</div>" +
        '<ol class="study-ask-list">' + items + "</ol>";
    }

    function renderFacilitatorStrip(fac) {
      const box = document.getElementById("facilitator-strip");
      if (!box) return;
      const urlParams = new URLSearchParams(window.location.search);
      const isTeach = urlParams.get("teach") === "1" || localStorage.getItem("daniel_teach_mode") === "1";
      if (!fac || !isTeach) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      box.hidden = false;
      const points = (fac.talkingPoints || []).map(p => `<li>${p}</li>`).join('');
      const asks = (fac.askClass || []).map(q => `<li>${q}</li>`).join('');
      box.innerHTML = `
        <div class="p-4 sm:p-5 rounded-xl border border-amber-600/40 bg-amber-500/10 dark:bg-amber-950/20 mb-8 font-sans">
          <div class="flex items-center justify-between border-b border-amber-600/20 pb-3 mb-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-amber-600 text-paper-50 font-mono text-[11px] font-bold uppercase">Classroom Facilitator</span>
              <span class="font-mono text-xs text-ink-600 dark:text-paper-400">Paced for ${fac.minutes || 40} min class</span>
            </div>
            <span class="text-[11px] font-mono text-amber-800 dark:text-amber-400 font-semibold">Teacher Notes (?teach=1)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h5 class="font-mono font-bold text-amber-900 dark:text-amber-300 uppercase text-[11px] mb-2">Key Discussion Points</h5>
              <ul class="space-y-1.5 text-ink-800 dark:text-paper-200 list-disc list-inside">
                ${points}
              </ul>
            </div>
            <div>
              <h5 class="font-mono font-bold text-amber-900 dark:text-amber-300 uppercase text-[11px] mb-2">Ask the Class</h5>
              <ul class="space-y-1.5 text-ink-800 dark:text-paper-200 list-disc list-inside">
                ${asks}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    function canAccessSheet(index) {
      if (window.BAJourney && typeof window.BAJourney.previewAllContent === 'function' && window.BAJourney.previewAllContent()) return true;
      if (window.BAJourney && typeof window.BAJourney.canAccessSheet === 'function') {
        return window.BAJourney.canAccessSheet(index);
      }
      return Number(index) === 0;
    }

    function denyLockedSitting(index) {
      if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
        const target = (index == null || Number.isNaN(Number(index)))
          ? (window.BAJourney.maxOpenSheet() + 1)
          : Number(index);
        window.BAJourney.announceLock('sheet', target);
        return;
      }
      const open = window.BAJourney && typeof window.BAJourney.maxOpenSheet === 'function'
        ? window.BAJourney.maxOpenSheet()
        : 0;
      const label = window.BAJourney ? window.BAJourney.sheetLabel(open) : 'the open sitting';
      showToast('Finish ' + label + ' to open the next sitting.');
    }

    let sittingGuideMode = null;
    let endCardShownForSheet = -1;

    let strongsDataCache = null;
    async function getStrongsData() {
      /* A failed load must not be cached as "empty" for the session — the next
         tap retries, and the interim feedback below covers the wait. */
      if (strongsDataCache) return strongsDataCache;
      try {
        const scripture = window.BAScripture;
        if (scripture && typeof scripture.loadStrongs === 'function') {
          const viaScripture = await scripture.loadStrongs();
          if (viaScripture && Object.keys(viaScripture).length) {
            strongsDataCache = viaScripture;
            return strongsDataCache;
          }
        } else {
          const res = await netRequest('bible/strongs-daniel.json', {
            onSlow: () => { showToast('Still opening the concordance\u2026'); }
          });
          if (res.ok) {
            const parsed = await res.json();
            if (parsed && Object.keys(parsed).length) {
              strongsDataCache = parsed;
              return strongsDataCache;
            }
          }
        }
      } catch (e) {}
      return null;
    }

    function wireStrongsTooltips() {
      document.querySelectorAll('.strongs-gloss').forEach((el) => {
        if (el.dataset.wired) return;
        el.dataset.wired = 'true';
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const lemmaId = el.getAttribute('data-lemma');
          if (!lemmaId) return;

          const data = await getStrongsData();
          const entry = data ? data[lemmaId] : null;
          if (!entry) {
            if (data === null) {
              showToast("The concordance could not be opened just now. Check your connection and tap the word again.");
            }
            return;
          }
          if (window.StudyCompetency) {
            window.StudyCompetency.recordScriptureLookup(`Strong's ${lemmaId} (${entry.translit || entry.lemma || ''})`);
          }
          window.TermOverlay.open({ type: 'strongs', lemmaId, entry }, el);
        });
      });
    }

    window.onPlacementConfirmed = function() {
      const seen = window.BAJourney && window.BAJourney.hasSeenIntro(currentSheetIndex);
      if (!seen) {
        showIntroGuide(currentSheetIndex);
      }
    };

    document.addEventListener('click', (e) => {
      const termBtn = e.target.closest('.term-gloss');
      if (e.target.closest('[data-term-close]')) {
        const pop = e.target.closest('.term-popover');
        if (pop) pop.remove();
        return;
      }
      if (e.target.closest('[data-term-index]')) {
        const id = e.target.closest('[data-term-index]').getAttribute('data-term-index');
        document.querySelectorAll('.term-popover, .strongs-popover').forEach(p => p.remove());
        if (window.GlossaryIndex) window.GlossaryIndex.openIndex(id);
        return;
      }
      if (termBtn && window.GlossaryIndex) {
        e.stopPropagation();
        window.GlossaryIndex.showPopover(termBtn);
        return;
      }
      if (!e.target.closest('.strongs-popover') && !e.target.closest('.strongs-gloss') && !e.target.closest('.term-popover') && !e.target.closest('.term-gloss')) {
        document.querySelectorAll('.strongs-popover, .term-popover').forEach(p => p.remove());
      }
    });

    function playSheetEnter() {
      const main = document.querySelector('.sitting-main');
      if (!main) return;
      main.classList.remove('sheet-enter');
      void main.offsetWidth;
      main.classList.add('sheet-enter');
    }

    const SCROLL_KEY = 'scroll_section';
    let scrollHold = false;

    function readScrollPlace() {
      try {
        const raw = JSON.parse(localStorage.getItem(SCROLL_KEY) || 'null');
        const sheet = raw && Number(raw.sheet);
        const top = raw && Number(raw.top);
        if (!Number.isFinite(sheet) || !Number.isFinite(top) || top < 0) return null;
        return { sheet: sheet, top: top };
      } catch (e) {
        return null;
      }
    }

    function writeScrollPlace(sheet, top) {
      try {
        localStorage.setItem(SCROLL_KEY, JSON.stringify({
          sheet: sheet,
          top: Math.max(0, Math.round(top))
        }));
      } catch (e) {}
    }

    function rememberSheetUrl(index) {
      try {
        const params = new URLSearchParams(location.search);
        params.delete('id');
        params.delete('section');
        params.set('sheet', String(index));
        const next = location.pathname + '?' + params.toString() + location.hash;
        if (next !== location.pathname + location.search + location.hash) {
          history.replaceState(null, '', next);
        }
      } catch (e) {}
    }

    function plainText(html) {
      const holder = document.createElement('div');
      holder.innerHTML = String(html || '');
      return holder.textContent.trim();
    }

    function bookOpened() {
      return window.BookOpen ? window.BookOpen.finished : Promise.resolve();
    }

    function mountSheetBook(index, data, restore) {
      if (!window.BookReader) return;
      window.BookReader.mount(document.getElementById('sheet-article'), {
        sheetIndex: index,
        title: data.title,
        kicker: plainText(data.epoch),
        restore
      });
    }

    function placeReader(index, restore) {
      let hashTarget = null;
      try { hashTarget = location.hash ? document.querySelector(location.hash) : null; } catch (e) { hashTarget = null; }
      if (hashTarget) {
        setTimeout(() => {
          const book = window.BookReader;
          if (book && book.isActive() && book.reveal(hashTarget, { instant: true })) {
            document.getElementById('sheet-article').scrollIntoView({ behavior: 'auto', block: 'start' });
            return;
          }
          hashTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 0);
        return;
      }
      let top = 0;
      if (restore) {
        const place = readScrollPlace();
        if (place && place.sheet === index) top = place.top;
      } else {
        writeScrollPlace(index, 0);
      }
      scrollHold = true;
      window.scrollTo(0, top);
      requestAnimationFrame(() => { scrollHold = false; });
    }

    let sheetLoadTicket = 0;

    /* Slim indeterminate bar shown while a sitting's chunk loads, so a switch
       never reads as "nothing happened". Cleared before the article paints. */
    let sheetLoadingBar = null;
    function showSheetLoading(on) {
      if (on) {
        if (!sheetLoadingBar && document.body) {
          sheetLoadingBar = document.createElement('div');
          sheetLoadingBar.id = 'sheet-loading-bar';
          sheetLoadingBar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;z-index:80;pointer-events:none;overflow:hidden;background:rgba(212,175,55,0.12);';
          const inner = document.createElement('div');
          inner.style.cssText = 'height:100%;width:38%;border-radius:999px;background:linear-gradient(90deg,rgba(212,175,55,0),rgba(212,175,55,0.9),rgba(212,175,55,0));animation:sheet-loading-slide 1.1s linear infinite;';
          sheetLoadingBar.appendChild(inner);
          document.body.appendChild(sheetLoadingBar);
        }
        if (sheetLoadingBar) sheetLoadingBar.hidden = false;
      } else if (sheetLoadingBar) {
        sheetLoadingBar.hidden = true;
      }
    }

    function sheetDataReady(index) {
      const row = sheetsData[index];
      if (!row || typeof row.content !== 'string') return false;
      const store = window.StudySheets;
      if (store && typeof store.isReady === 'function') return store.isReady(index);
      return true;
    }

    function sheetHasKind(data, kind) {
      const specs = (data && data.diagrams) || {};
      return Object.keys(specs).some((id) => specs[id] && specs[id].kind === kind);
    }

    function sheetNeeds(index) {
      if (!sheetDataReady(index)) return window.StudySheets.ensure(index);
      if (!window.MindMap && !studyModuleFailed('mindmap') && sheetHasKind(sheetsData[index], 'mindmap')) {
        return loadStudyModule('mindmap').catch(() => {});
      }
      return null;
    }

    function loadSheet(index, opts) {
      if (index < 0 || index >= sheetsData.length) return;
      if (!canAccessSheet(index)) {
        denyLockedSitting(index);
        return;
      }
      const ticket = ++sheetLoadTicket;
      const needs = sheetNeeds(index);
      if (needs) {
        showSheetLoading(true);
        const slowTimer = setTimeout(() => {
          if (ticket === sheetLoadTicket) showToast('Still opening this sitting\u2026');
        }, 4000);
        needs.then(() => {
          clearTimeout(slowTimer);
          if (ticket === sheetLoadTicket) loadSheet(index, opts);
        }, () => {
          clearTimeout(slowTimer);
          if (ticket === sheetLoadTicket) {
            showSheetLoading(false);
            showToast('This sitting could not load. Check your connection and try again.');
          }
        });
        return;
      }
      showSheetLoading(false);
      rememberSheetUrl(index);
      currentSheetIndex = index;
      endCardShownForSheet = -1;
      hideSittingGuide();
      try {
        localStorage.setItem('daniel_historicist_sheet', index);
      } catch (e) {}
      if (window.Insights) {
        window.Insights.resetActive();
        if (typeof window.Insights.readingTimer === 'function') {
          window.Insights.readingTimer(index);
        }
        window.Insights.track('sitting_start', index, { revisit: completedSheets.has(index) });
        window.Insights.maybePulse(index);
      }

      const data = sheetsData[index];
      const fromEpoch = opts && opts.fromEpoch;

      setPomodoroDuration(data.allocatedMinutes || 5);

      const epochIndex = sheetToTimelineMap[index] !== undefined ? sheetToTimelineMap[index] : 0;
      if (!fromEpoch) setEpochInfo(epochIndex, { fromSheet: true });

      const overallProgress = ((index + 1) / sheetsData.length) * 100;
      document.getElementById('progress-bar').style.width = `${overallProgress}%`;

      document.getElementById('sheet-epoch-tag').innerHTML = data.epoch;
      document.getElementById('sheet-read-time').innerText = data.readTime;
      document.getElementById('sheet-scripture-ref').innerHTML = data.scripture;
      document.getElementById('sheet-title').innerText = data.title;
      document.getElementById('sheet-subtitle').innerText = data.subtitle;

      const articleEl = document.getElementById('sheet-article');
      articleEl.setAttribute('data-sheet-index', String(index));
      if (window.BookReader) window.BookReader.unmount();
      releaseSheetFigures(articleEl);
      articleEl.innerHTML = data.content;
      renderChristologyPlaque(articleEl, data.christology);
      renderLessonMedia(data);
      renderSheetDiagrams(data);
      renderLessonConnectBar(index);
      renderStudyGuide(data.studyGuide);
      renderFacilitatorStrip(data.facilitator);
      renderSheetVerify(index);
      if (window.GlossaryIndex) {
        window.GlossaryIndex.linkArticle(document.getElementById('sheet-article'));
      }
      document.querySelectorAll('#sheet-article img, #epoch-plate-img, #context-img').forEach((img) => {
        img.loading = 'lazy';
        if (!img.alt) img.alt = data.title || 'Study illustration';
      });

      // Start sheet competency telemetry timer and record sheet passage
      if (window.StudyCompetency) {
        window.StudyCompetency.startSheetTimer(index);
        const scriptureRef = document.getElementById('sheet-scripture-ref');
        const pass = (scriptureRef && scriptureRef.textContent.trim()) || `Sheet ${index}`;
        window.StudyCompetency.recordScriptureLookup(pass);
      }

      const wbContainer = document.getElementById('workbench-container');
      if (wbContainer && window.StudyWorkbench) {
        window.StudyWorkbench.renderWorkbench(index, wbContainer, () => {
          updateNextGate();
          document.dispatchEvent(new CustomEvent('quiz:changed', { detail: { workbench: true } }));
        });
      }

      wireStrongsTooltips();

      const recapTitle = document.getElementById('recap-title');
      const recapBody = document.getElementById('recap-body');
      if (recapTitle) recapTitle.textContent = data.title;
      if (recapBody) recapBody.textContent = (data.scripture || '') + ' — ' + (data.subtitle || '');
      const yearId = STUDY_EPOCH_TO_YEAR[currentEpochIndex] || STUDY_EPOCH_TO_YEAR[epochIndex] || 'y605';
      const notes = document.getElementById('sheet-notes');
      if (notes) {
        try { notes.value = localStorage.getItem('baNote-' + index) || ''; } catch (e) { notes.value = ''; }
      }
      if (window.BAJourney) window.BAJourney.save({ sheet: index, year: yearId });
      renderSheetInstruments(index);
      updateSpine(index, yearId, spineEmpireForSheet(index, journeyState().unlocked));
      restoreSheetStage(index);
      applySittingMap(index, { animate: false, focusId: null });
      resetSittingPath();
      syncHorizonLocks();
      playSheetEnter();

      renderQuiz(data.quizzes);
      placeCheckpointPlates(data.quizzes);
      syncAdvanceButtons(index);

      mountSheetBook(index, data, !!(opts && opts.restorePlace));
      placeReader(index, !!(opts && opts.restorePlace));
      const skipIntro = (opts && opts.skipIntro);
      const seen = window.BAJourney && window.BAJourney.hasSeenIntro(index);
      let hasChosenTrack = false;
      try { hasChosenTrack = !!localStorage.getItem('daniel_placement_track_v1'); } catch (e) { hasChosenTrack = true; }
      const openIntro = function () {
        if (!skipIntro && !seen && hasChosenTrack && index === currentSheetIndex) showIntroGuide(index);
      };
      bookOpened().then(function () {
        return window.Onboard && typeof window.Onboard.gate === 'function' ? window.Onboard.gate() : null;
      }).then(openIntro);
      if (window.StudySheets && typeof window.StudySheets.prefetchAround === 'function') window.StudySheets.prefetchAround(index);
    }

    function sheetQuizComplete() {
      if (!sheetDataReady(currentSheetIndex)) return false;
      const quizzes = (sheetsData[currentSheetIndex] && sheetsData[currentSheetIndex].quizzes) || [];
      if (!quizzes.length) return true;
      return quizzes.every((q, i) => verifiedQuiz[i] === true);
    }

    function canAdvancePath() {
      if (window.BAJourney && typeof window.BAJourney.isAdmin === "function" && window.BAJourney.isAdmin()) {
        return true;
      }
      if (window.StudyWorkbench && !window.StudyWorkbench.isSheetComplete(currentSheetIndex)) {
        return false;
      }
      if (completedSheets.has(currentSheetIndex)) return true;
      return sheetQuizComplete();
    }

    function updateNextGate() {
      const btn = document.getElementById('next-sheet-btn');
      const wbOk = !window.StudyWorkbench || window.StudyWorkbench.isSheetComplete(currentSheetIndex);
      const qOk = sheetQuizComplete();
      const ok = canAdvancePath();
      const hint = !wbOk ? 'Complete the active proof workbench above to continue' : (!qOk ? 'Answer the checkpoints in the lesson and the final questions to continue' : '');
      if (btn) {
        btn.disabled = !ok;
        btn.hidden = false;
        btn.title = hint;
      }
      const nextStep = document.querySelector('#sitting-path-steps [data-path="next"]');
      if (nextStep) nextStep.disabled = !ok;
    }

    function openTaskFlow() {
      const flow = window.StudyTaskFlow;
      return !!(flow && typeof flow.open === 'function' && flow.open());
    }

    function navigateSheet(delta) {
      if (delta > 0 && !canAdvancePath()) {
        if (openTaskFlow()) return;
        showToast('Answer the checkpoints in the lesson and the final questions to continue.');
        revealUnfinished();
        return;
      }
      loadSheet(currentSheetIndex + delta);
    }

    /* =========================================================================
       6. ACTIVE RECALL REVISION & QUIZ CONTROLLER
       Answers are graded server-side by QuizGate (verify_quiz_answer RPC);
       the client bundle carries no answer key.
       ========================================================================= */
    let answeredQuestions = {};
    let quizAttemptCounts = {};
    let verifiedQuiz = {};
    let quizPending = {};

    let celebrateTimer = 0;

    window.StudyTasks = {
      snapshot: function () {
        const data = sheetsData[currentSheetIndex] || {};
        const quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
        const wbNode = document.getElementById('workbench-container');
        const hasWorkbench = !!(window.StudyWorkbench && wbNode && wbNode.childElementCount);
        const last = currentSheetIndex >= sheetsData.length - 1;
        return {
          sheet: currentSheetIndex,
          label: sittingLabel(currentSheetIndex),
          nextLabel: last ? '' : sittingLabel(currentSheetIndex + 1),
          last: last,
          ready: sheetDataReady(currentSheetIndex),
          questions: quizzes.map((q, i) => {
            const card = document.getElementById('q-card-' + i);
            return { index: i, done: verifiedQuiz[i] === true, card: card, inLesson: !!(card && card.closest('.checkpoint-plate')) };
          }),
          workbench: hasWorkbench ? { node: wbNode, done: window.StudyWorkbench.isSheetComplete(currentSheetIndex) } : null,
          canAdvance: canAdvancePath()
        };
      },
      advance: function () { completeAndAdvance(); }
    };

    function offerCapstone(finishedSheet) {
      if (finishedSheet !== 2) return;
      const wb = window.StudyWorkbench;
      if (!wb || typeof wb.renderCapstoneModal !== 'function') return;
      if (typeof wb.getCapstoneData === 'function' && wb.getCapstoneData()) return;
      wb.renderCapstoneModal(function () {
        if (currentSheetIndex !== 3) loadSheet(3);
      });
    }

    function completeAndAdvance() {
      if (!canAdvancePath()) {
        if (openTaskFlow()) return;
        showToast('Answer the checkpoints in the lesson and the final questions to continue.');
        revealUnfinished();
        return;
      }
      const firstTime = !completedSheets.has(currentSheetIndex);
      const finishedSheet = currentSheetIndex;
      if (window.BAJourney && typeof window.BAJourney.markSheetComplete === 'function') {
        window.BAJourney.markSheetComplete(currentSheetIndex);
        completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
      } else {
        completedSheets.add(currentSheetIndex);
        try {
          localStorage.setItem('daniel_historicist_mastery', JSON.stringify(Array.from(completedSheets)));
        } catch (e) {}
      }
      if (window.Insights) {
        window.Insights.track('sitting_complete', currentSheetIndex, { seconds: window.Insights.activeSeconds() });
        window.Insights.notePulse(currentSheetIndex);
        if (currentSheetIndex === sheetsData.length - 1) {
          window.Insights.track('course_complete', currentSheetIndex);
          window.Insights.maybePulse();
        }
      }
      if (firstTime) showSittingCelebration(finishedSheet);
      if (firstTime) offerCapstone(finishedSheet);

      if (currentSheetIndex < sheetsData.length - 1) {
        loadSheet(currentSheetIndex + 1);
        if (!celebrationFor(finishedSheet)) {
          showToast('Unit mastered! Advancing to ' + (window.BAJourney ? window.BAJourney.sheetLabel(currentSheetIndex) : ('sheet ' + (currentSheetIndex + 1))) + '.');
        }
      } else {
        if (!celebrationFor(finishedSheet)) {
          showToast("Congratulations! You have mastered the entire Historicist Shelf of Daniel!");
        }
        syncCertificateCta();
        openCertificateIfReady();
      }
    }

    document.addEventListener('bookreader:continue', () => enterSittingPhase('tasks'));
    document.addEventListener('bookreader:held', () => {
      showToast('Answer this checkpoint before you turn the page.');
    });

    document.addEventListener('scroll', () => {
      if (sittingGuideMode !== 'end') return;
      const data = sheetsData[currentSheetIndex];
      const spotId = (data && data.guide && data.guide.end && data.guide.end.spotlight) || 'next-sheet-btn';
      const target = document.getElementById(spotId);
      if (target && !target.hidden) layoutEndSpotlight(target);
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        if (currentSheetIndex < sheetsData.length - 1) navigateSheet(1);
      } else if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        if (currentSheetIndex > 0) navigateSheet(-1);
      } else if (e.key === 'Escape') {
        const guide = document.getElementById('sitting-guide');
        if (guide && !guide.hidden) {
          if (sittingGuideMode === 'intro') finishIntroGuide();
          else hideSittingGuide();
          return;
        }
        const drawer = document.getElementById('toc-drawer');
        if (!drawer.classList.contains('-translate-x-full')) toggleTocDrawer();
        const dock = document.getElementById('pomo-dock');
        if (!dock.classList.contains('pointer-events-none')) togglePomodoroDrawer();
        const modal = document.getElementById('artifact-modal');
        if (!modal.classList.contains('pointer-events-none')) closeArtifactModal();
        collapseSittingInsets();
      }
    });

    const LEGACY_ID_MAP = {
      assembled: 2, head: 2, chest: 5, thighs: 8, legs: 7, feet: 7, stone: 10,
      lion: 7, bear: 7, leopard: 7, beast: 7, horn: 7, years1260: 7,
      ram: 8, goat: 8, goat_broken: 8, goat_horn: 8,
      dura: 3, stump: 4, ox_king: 4, ancient: 7, son: 7,
      decree: 9, kings: 10, michael: 10, sealed: 10
    };

    function clampStartSheet(index) {
      if (window.BAJourney && typeof window.BAJourney.previewAllContent === 'function' && window.BAJourney.previewAllContent()) return index;
      if (window.BAJourney && typeof window.BAJourney.clampToAccessible === 'function') {
        return window.BAJourney.clampToAccessible(index);
      }
      return canAccessSheet(index) ? index : 0;
    }

    function resolveStartSheet() {
      try {
        const params = new URLSearchParams(location.search);
        let raw = params.get('id') || params.get('section') || params.get('sheet') || params.get('s');
        if (raw == null || raw === '') {
          try {
            const refSitting = localStorage.getItem('baReferredSitting');
            if (refSitting != null && refSitting !== '') {
              raw = refSitting;
              localStorage.removeItem('baReferredSitting');
            }
          } catch (e) {}
        }
        if (raw != null && raw !== '') {
          if (Object.prototype.hasOwnProperty.call(LEGACY_ID_MAP, raw)) {
            const wanted = LEGACY_ID_MAP[raw];
            const clamped = clampStartSheet(wanted);
            if (clamped !== wanted) denyLockedSitting(wanted);
            return clamped;
          }
          const asNum = parseInt(raw, 10);
          if (!Number.isNaN(asNum) && asNum >= 0 && asNum < sheetsData.length) {
            const clamped = clampStartSheet(asNum);
            if (clamped !== asNum) denyLockedSitting(asNum);
            return clamped;
          }
        }
        const journey = journeyState();
        if (typeof journey.sheet === 'number' && journey.sheet >= 0 && journey.sheet < sheetsData.length) {
          return clampStartSheet(journey.sheet);
        }
      } catch (e) {}
      return currentSheetIndex;
    }

    document.querySelectorAll('.artifact-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const img = document.getElementById('artifact-modal-img');
        if (img && btn.dataset.src) img.src = btn.dataset.src;
        document.querySelectorAll('.artifact-thumb').forEach((b) => b.classList.remove('ring-2', 'ring-amber-400'));
        btn.classList.add('ring-2', 'ring-amber-400');
      });
    });

    window.addEventListener('DOMContentLoaded', () => {
      const guidePrimary = document.getElementById('sitting-guide-primary');
      const guideSkip = document.getElementById('sitting-guide-skip');
      if (guidePrimary) {
        guidePrimary.addEventListener('click', () => {
          if (sittingGuideMode === 'end') activateGuideTarget();
          else finishIntroGuide();
        });
      }
      if (guideSkip) guideSkip.addEventListener('click', finishIntroGuide);
      const accessOpen = document.getElementById('access-open-btn');
      const accessPanel = document.getElementById('access-panel');
      const accessClose = document.getElementById('access-close');
      const accessEnable = document.getElementById('access-enable-preview');
      if (accessOpen && accessPanel) {
        accessOpen.addEventListener('click', () => { accessPanel.hidden = false; });
      }
      if (accessClose && accessPanel) {
        accessClose.addEventListener('click', () => { accessPanel.hidden = true; });
      }
      if (accessEnable) {
        accessEnable.addEventListener('click', () => {
          const local = window.BAJourney && typeof window.BAJourney.isLocalDevHost === 'function' && window.BAJourney.isLocalDevHost();
          const admin = window.ScrollAuth && typeof window.ScrollAuth.isAdmin === 'function' && window.ScrollAuth.isAdmin();
          if (!local && !admin) {
            if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
              window.BAJourney.announceLock('preview', 0);
            }
            return;
          }
          if (window.BAJourney && typeof window.BAJourney.enablePreview === 'function') {
            window.BAJourney.enablePreview();
          }
          const u = new URL(location.href);
          u.searchParams.set('preview', 'full');
          location.href = u.toString();
        });
      }
      const certBtn = document.getElementById('btn-download-certificate');
      if (certBtn) certBtn.addEventListener('click', openCertificateIfReady);
      const openPlate = document.getElementById('btn-infographic-open');
      const openFull = document.getElementById('btn-infographic-fullscreen');
      const closePlate = document.getElementById('infographic-modal-close');
      const plateModal = document.getElementById('infographic-modal');
      if (openPlate) openPlate.addEventListener('click', openInfographic);
      if (openFull) openFull.addEventListener('click', openInfographic);
      if (closePlate) closePlate.addEventListener('click', closeInfographic);
      if (plateModal) {
        plateModal.addEventListener('click', (ev) => {
          if (ev.target === plateModal) closeInfographic();
        });
      }
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeInfographic();
      });
      syncCertificateCta();
      applyFontSize();
      applyTheme(currentThemeIdx, true);
      resizeWeatherCanvas();
      updateAutoWeather();
      setWeatherPreset('auto', true);
      updateTimerDisplay();
      window.addEventListener('resize', () => {
        resizeWeatherCanvas();
        if (sittingGuideMode === 'end') {
          const data = sheetsData[currentSheetIndex];
          const spotId = (data && data.guide && data.guide.end && data.guide.end.spotlight) || 'next-sheet-btn';
          const target = document.getElementById(spotId);
          if (target && !target.hidden) layoutEndSpotlight(target);
        }
      });
      document.querySelectorAll('.instrument-tabs button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const panel = document.getElementById('panel-' + btn.dataset.instrument);
          if (window.Cinema && panel) window.Cinema.swap(() => showInstrument(btn.dataset.instrument), panel);
          else showInstrument(btn.dataset.instrument);
        });
      });
      if (window.BAScripture) window.BAScripture.mount(document.getElementById('scripture-root'));
      window.addEventListener('ba-scripture-station', (ev) => {
        const station = ev.detail && ev.detail.station;
        if (!station) return;
        if (currentSheetIndex === 2) {
          const st = S2_STATIONS.find((s) => s.id === station);
          if (st) playStation('s2', st).then(() => refreshRailLabel('s2', S2_STATIONS));
        } else if (currentSheetIndex === 7) {
          const st = S7_STATIONS.find((s) => s.id === station);
          if (st) playStation('s7', st).then(() => refreshRailLabel('s7', S7_STATIONS));
        }
      });
      selectEmpire('babylon');
      buildHorizonCards();
      document.querySelectorAll('#sitting-path-steps [data-path]').forEach((btn) => {
        btn.addEventListener('click', () => enterSittingPhase(btn.dataset.path));
      });
      const btnFocusMap = document.getElementById('btn-focus-live-map');
      if (btnFocusMap) {
        btnFocusMap.addEventListener('click', () => {
          if (window.Insights) window.Insights.track('path_step', currentSheetIndex, { step: 'map' });
          const pack = lessonMapPack(currentSheetIndex);
          const y = (pack && pack.year) || 'y605';
          window.location.href = `map.html?year=${encodeURIComponent(y)}&from=lesson&sheet=${currentSheetIndex}`;
        });
      }

      loadSheet(resolveStartSheet(), { restorePlace: true });
      let scrollSaveTimer = null;
      window.addEventListener('scroll', () => {
        if (scrollHold) return;
        if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
        scrollSaveTimer = setTimeout(() => {
          writeScrollPlace(currentSheetIndex, window.scrollY || 0);
        }, 120);
      }, { passive: true });
      window.addEventListener('pagehide', () => {
        if (scrollHold) return;
        writeScrollPlace(currentSheetIndex, window.scrollY || 0);
      });
      const notes = document.getElementById('sheet-notes');
      if (notes) {
        notes.addEventListener('input', () => {
          try { localStorage.setItem('baNote-' + currentSheetIndex, notes.value); } catch (e) {}
          if (window.StudySync) window.StudySync.recordNote(currentSheetIndex, notes.value);
        });
      }
      window.addEventListener('ba-study-synced', () => {
        const notesEl = document.getElementById('sheet-notes');
        if (notesEl && document.activeElement !== notesEl) {
          try { notesEl.value = localStorage.getItem('baNote-' + currentSheetIndex) || ''; } catch (e) {}
        }
      });
      const btnBm = document.getElementById('btn-bookmark-sheet');
      if (btnBm) btnBm.addEventListener('click', () => {
        try {
          const list = JSON.parse(localStorage.getItem('baStudyBookmarks') || '[]');
          if (!list.includes(currentSheetIndex)) list.push(currentSheetIndex);
          localStorage.setItem('baStudyBookmarks', JSON.stringify(list));
          if (window.StudySync) window.StudySync.recordBookmarks(list);
          showToast('Sheet bookmarked' + (window.StudySync ? ' and synced to your account' : ' on this device'));
        } catch (e) {}
      });
      const btnNotes = document.getElementById('btn-toggle-notes');
      if (btnNotes && notes) btnNotes.addEventListener('click', () => { notes.hidden = !notes.hidden; });
      const gloss = document.getElementById('glossary-panel');
      const btnGloss = document.getElementById('btn-toggle-glossary');
      if (btnGloss && gloss) {
        btnGloss.addEventListener('click', () => {
          gloss.hidden = !gloss.hidden;
          btnGloss.setAttribute('aria-expanded', gloss.hidden ? 'false' : 'true');
          if (!gloss.hidden && window.GlossaryIndex) {
            window.GlossaryIndex.renderIndex(gloss, { kind: 'all', q: '' });
          }
        });
      }
      const btnStudy = document.getElementById('btn-jump-study-path');
      if (btnStudy) {
        btnStudy.addEventListener('click', () => {
          const path = document.getElementById('sheet-study-path');
          if (path && !path.hidden) path.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      const btnVerify = document.getElementById('btn-jump-verify');
      if (btnVerify) {
        btnVerify.addEventListener('click', () => {
          const box = document.getElementById('sheet-verify');
          if (box && !box.hidden) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      if (new URLSearchParams(window.location.search).get('project') === '1') {
        document.body.classList.add('projection-mode');
      }
      const btnProgHeader = document.getElementById('btn-progress-header');
      if (btnProgHeader) {
        btnProgHeader.addEventListener('click', () => {
          if (window.StudyCompetency && typeof window.StudyCompetency.renderCompetencyRecordModal === 'function') {
            window.StudyCompetency.renderCompetencyRecordModal();
          }
        });
      }
      const btnCodexProg = document.getElementById('btn-codex-progress');
      if (btnCodexProg) {
        btnCodexProg.addEventListener('click', () => {
          if (window.StudyCompetency && typeof window.StudyCompetency.renderCompetencyRecordModal === 'function') {
            window.StudyCompetency.renderCompetencyRecordModal();
          }
        });
      }
      const btnPrintHeader = document.getElementById('btn-print-header');
      if (btnPrintHeader) {
        btnPrintHeader.addEventListener('click', () => {
          if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'print' });
          window.print();
        });
      }
      const verifyHost = document.getElementById('sheet-verify');
      if (verifyHost && !verifyHost.dataset.tracked) {
        verifyHost.dataset.tracked = 'true';
        verifyHost.addEventListener('click', (e) => {
          const link = e.target.closest('.sheet-verify-open');
          if (link && window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'verify' });
        });
      }
      const audioPlayer = document.getElementById('lesson-audio-player');
      if (audioPlayer && !audioPlayer.dataset.tracked) {
        audioPlayer.dataset.tracked = 'true';
        audioPlayer.addEventListener('play', () => {
          AudioCheckpoints.played();
          AudioReader.run();
          if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'audio' });
        });
        audioPlayer.addEventListener('timeupdate', () => {
          AudioReader.sync(audioPlayer.currentTime);
        });
        audioPlayer.addEventListener('ended', () => AudioCheckpoints.hide());
        AudioCheckpoints.wire();
      }
      ['lesson-infographic-download', 'infographic-modal-download'].forEach((id) => {
        const link = document.getElementById(id);
        if (link && !link.dataset.tracked) {
          link.dataset.tracked = 'true';
          link.addEventListener('click', () => {
            if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'infographic_download' });
          });
        }
      });
      const btnToggleTeach = document.getElementById('btn-toggle-teach');
      if (btnToggleTeach) {
        btnToggleTeach.addEventListener('click', () => {
          const current = localStorage.getItem('daniel_teach_mode') === '1';
          localStorage.setItem('daniel_teach_mode', current ? '0' : '1');
          showToast(current ? 'Facilitator notes hidden' : 'Facilitator notes enabled');
          const curData = sheetsData[currentSheetIndex];
          if (curData) renderFacilitatorStrip(curData.facilitator);
        });
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopWeatherAnimation();
        else if (weatherPreset !== 'off') startWeatherAnimation();
      });
      if (window.StudyCompetency) {
        const openPlacement = function () { window.StudyCompetency.initPlacementModal(); };
        const afterAuth = window.ScrollAuth && typeof window.ScrollAuth.ready === "function"
          ? window.ScrollAuth.ready()
          : Promise.resolve();
        Promise.all([afterAuth, bookOpened()]).then(function () {
          return window.Onboard && typeof window.Onboard.gate === "function" ? window.Onboard.gate() : null;
        }).then(openPlacement);
      }
      function refreshAdminAccess() {
        renderToc();
        syncHorizonLocks();
        updateNextGate();
        const wanted = resolveStartSheet();
        if (wanted !== currentSheetIndex && canAccessSheet(wanted)) loadSheet(wanted);
      }
      if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
        window.ScrollAuth.ready().then(refreshAdminAccess);
      }
      if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
        window.ScrollAuth.onChange(refreshAdminAccess);
      }
      window.addEventListener('ba-progress-synced', () => {
        if (window.BAJourney && typeof window.BAJourney.load === 'function') {
          completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
        }
        renderToc();
        syncHorizonLocks();
        updateNextGate();
        syncCertificateCta();
      });
    });

    Object.assign(window, {
      applyTheme,
      cycleTheme,
      adjustFontSize,
      toggleTocDrawer,
      togglePomodoroDrawer,
      setWeatherPreset,
      startPomodoro,
      pausePomodoro,
      resetPomodoro,
      setPomodoroDuration,
      openArtifactModal,
      closeArtifactModal,
      openLessonScripture,
      navigateSheet,
      completeAndAdvance,
      showSittingCelebration,
      shareSitting,
      resetQuizQuestion,
      openInfographic,
      closeInfographic,
      showToast
    });
