import { diagramCite, makeCiteResolver } from '/js/pages/study/diagrams/cite.js';
import { bodyChain } from '/js/pages/study/diagrams/chain.js';
import { bodyComparison } from '/js/pages/study/diagrams/comparison.js';
import { bodyTable } from '/js/pages/study/diagrams/table.js';
import { bodyFlow, flowContinuation, wireFlow } from '/js/pages/study/diagrams/flow.js';
import { bodyTimeline, wireTimeline } from '/js/pages/study/diagrams/timeline.js';
import { FULLSCREEN_KINDS, fullscreenControlHtml, releaseFigureFullscreen, releaseFullscreenLeftovers, wireDiagramFullscreen } from '/js/pages/study/diagrams/fullscreen.js';
import { bodyStory, wireStory } from '/js/pages/study/story.js';
import { pausePomodoro, resetPomodoro, resizeWeatherCanvas, setPomodoroDuration, setWeatherPreset, startPomodoro, startWeatherAnimation, stopWeatherAnimation, tickPomodoro, togglePomodoroDrawer, updateAutoWeather, updateTimerDisplay, weatherPreset } from '/js/pages/study/focus-timer.js';
import { AudioCheckpoints, AudioReader, renderLessonMedia } from '/js/pages/study/read-along.js';
import { adjustFontSize, applyFontSize, applyTheme, currentThemeIdx, cycleTheme, fontAuto, fontSizes, setCurrentFontIdx, setCurrentThemeIdx, setFontAuto, themes } from '/js/pages/study/reading-settings.js';
import { closeCitePanel, decorateCitations, escapeStudy, onCitePanelKey, referenceIndex, renderSheetVerify, resolveCiteLabel, revealReference, syncCiteClose } from '/js/pages/study/references.js';
import { celebrationFor, placeCheckpointPlates, renderQuiz, resetQuizQuestion, revealUnfinished, showSittingCelebration, sittingLabel, verifiedQuiz } from '/js/pages/study/quiz.js';
import { buildHorizonCards, currentEpochIndex, setEpochInfo, syncHorizonLocks } from '/js/pages/study/horizon.js';
import { S2_STATIONS, S7_STATIONS, applySittingMap, collapseSittingInsets, enterSittingPhase, expandSittingMap, lessonMapPack, playStation, refreshRailLabel, renderSheetMapPanel, resetSittingPath, restoreSheetStage, selectEmpire, setSittingYearOverride } from '/js/pages/study/sitting-map.js';
import { activateGuideTarget, finishIntroGuide, hideSittingGuide, layoutEndSpotlight, setEndCardShownForSheet, showIntroGuide, sittingGuideMode, syncAdvanceButtons } from '/js/pages/study/sitting-guide.js';
import { renderChristologyPlaque, renderLessonConnectBar, shareSitting } from '/js/pages/study/lesson-connect.js';
import { renderToc, toggleTocDrawer } from '/js/pages/study/toc.js';
import { wireStrongsTooltips } from '/js/pages/study/strongs.js';
import { renderFacilitatorStrip, renderStudyGuide } from '/js/pages/study/study-guide.js';
import { rememberSheetUrl, writeScrollPlace } from '/js/pages/study/scroll-place.js';
import { bookOpened, mountSheetBook, placeReader, scrollHold } from '/js/pages/study/sheet-book.js';
import { closeArtifactModal, closeInfographic, openArtifactModal, openInfographic, renderSheetInstruments } from '/js/pages/study/instruments.js';
import { journeyState, spineEmpireForSheet, updateSpine } from '/js/pages/study/spine.js';
import { setReadMeterTime } from '/js/pages/study/read-meter.js';
import { loadStudyModule, openCertificateIfReady, studyModuleFailed, syncCertificateCta } from '/js/pages/study/study-modules.js';

    // Sequential sittings: access is owned by BAJourney.canAccessSheet.

    /* Timeout-aware fetch for this page's own assets (cues, concordance).
       Uses SiteNet when present; degrades to a plain fetch that still cannot
       hang forever. */
    export function netRequest(url, opts) {
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
    export function memberLockText(fallback) {
      const guest = !(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
      return guest ? 'Members only — sign in to continue' : fallback;
    }

    export const sheetToTimelineMap = {
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

    export const timelineToSheetMap = {
      0: 0,
      1: 5,
      2: 9,
      3: 9,
      4: 7,
      5: 7,
      6: 8,
      7: 10
    };


    export function sheetBelongsToEpoch(sheetIdx, epochIdx) {
      if (sheetToTimelineMap[sheetIdx] === epochIdx) return true;
      return timelineToSheetMap[epochIdx] === sheetIdx;
    }

    export function epochAccessible(epochIdx) {
      const target = timelineToSheetMap[epochIdx];
      if (typeof target !== 'number') return true;
      return canAccessSheet(target);
    }

    export function showInstrument(id) {
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

    export function openLessonScripture() {
      showInstrument('scripture');
      const panel = document.getElementById('panel-scripture');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    export const STUDY_EPOCH_TO_YEAR = (window.MAP_CHRONICLE && window.MAP_CHRONICLE.studyEpochIds) ||
      ['y605', 'y539', 'y457', 'y31', 'y538', 'y1798', 'y1844', 'y12'];
    if (window.BAJourney) window.BAJourney.load();


    export function pulseMapYear(yearId, opts) {
      setSittingYearOverride(yearId);
      if (window.BAJourney) window.BAJourney.save({ year: yearId });
    }

    export const sittingVisited = { study: true, tasks: false };

    window.StudyAudioReader = {
      texts: () => AudioReader.texts(),
      checkpoints: () => AudioCheckpoints.stops.map((stop) => stop.at)
    };


    // Atmospheric Focus State — a continuous quiet → storm → sunshine continuum

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tickPomodoro();
    });

    export let currentSheetIndex = 0;
    export let completedSheets = new Set();
    // Auto mode: the reading size follows the screen until the learner picks
    // one with A-/A+. Legacy saves that match the old default are treated as
    // auto; deliberate non-default choices keep working untouched.

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
        setFontAuto(false);
        if (savedFont !== null) setCurrentFontIdx(Math.max(0, Math.min(fontSizes.length - 1, parseInt(savedFont, 10) || 1)));
        if (legacyChosen && !manualFont) localStorage.setItem('daniel_font_manual_v1', '1');
      }
      const savedThemeName = localStorage.getItem('daniel_theme_name_v1');
      if (themes.indexOf(savedThemeName) > 0) {
        setCurrentThemeIdx(themes.indexOf(savedThemeName));
      } else {
        setCurrentThemeIdx(0);
      }
    } catch (e) {}

    export let toastTimer = 0;
    export function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastTimer = 0;
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 2500);
    }

    export let fontResizeTimer = null;
    window.addEventListener('resize', () => {
      if (!fontAuto) return;
      clearTimeout(fontResizeTimer);
      fontResizeTimer = setTimeout(applyFontSize, 180);
    });

    /* Mindmap: the steps around a centre node. js/pages/study/mindmap.js renders into
       this host and owns the frame loop, observers and listeners, so it is
       destroyed with the figure. */
    export function bodyMindmap(spec) {
      return '<div class="mm" data-mm-host></div>';
    }

    export function replayControlFor(figure) {
      for (let node = figure ? figure.nextElementSibling : null; node; node = node.nextElementSibling) {
        if (node.matches('figure.chain')) return null;
        if (node.matches('[data-chain-replay]')) return node;
      }
      return null;
    }

    export function wireFigure(state) {
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

    export function releaseSheetFigures(root) {
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

    export function renderSheetDiagrams(data) {
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

    export function canAccessSheet(index) {
      if (window.BAJourney && typeof window.BAJourney.previewAllContent === 'function' && window.BAJourney.previewAllContent()) return true;
      if (window.BAJourney && typeof window.BAJourney.canAccessSheet === 'function') {
        return window.BAJourney.canAccessSheet(index);
      }
      return Number(index) === 0;
    }

    export function denyLockedSitting(index) {
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

    export function playSheetEnter() {
      const main = document.querySelector('.sitting-main');
      if (!main) return;
      main.classList.remove('sheet-enter');
      void main.offsetWidth;
      main.classList.add('sheet-enter');
    }

    export const SCROLL_KEY = 'scroll_section';

    export let sheetLoadTicket = 0;

    /* Slim indeterminate bar shown while a sitting's chunk loads, so a switch
       never reads as "nothing happened". Cleared before the article paints. */
    export let sheetLoadingBar = null;
    export function showSheetLoading(on) {
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

    export function sheetDataReady(index) {
      const row = sheetsData[index];
      if (!row || typeof row.content !== 'string') return false;
      const store = window.StudySheets;
      if (store && typeof store.isReady === 'function') return store.isReady(index);
      return true;
    }

    export function sheetHasKind(data, kind) {
      const specs = (data && data.diagrams) || {};
      return Object.keys(specs).some((id) => specs[id] && specs[id].kind === kind);
    }

    export function sheetNeeds(index) {
      if (!sheetDataReady(index)) return window.StudySheets.ensure(index);
      if (!window.MindMap && !studyModuleFailed('mindmap') && sheetHasKind(sheetsData[index], 'mindmap')) {
        return loadStudyModule('mindmap').catch(() => {});
      }
      return null;
    }

    export function loadSheet(index, opts) {
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
      setEndCardShownForSheet(-1);
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

      setReadMeterTime(data.readTime);

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

    export function sheetQuizComplete() {
      if (!sheetDataReady(currentSheetIndex)) return false;
      const quizzes = (sheetsData[currentSheetIndex] && sheetsData[currentSheetIndex].quizzes) || [];
      if (!quizzes.length) return true;
      return quizzes.every((q, i) => verifiedQuiz[i] === true);
    }

    export function canAdvancePath() {
      if (window.BAJourney && typeof window.BAJourney.isAdmin === "function" && window.BAJourney.isAdmin()) {
        return true;
      }
      if (window.StudyWorkbench && !window.StudyWorkbench.isSheetComplete(currentSheetIndex)) {
        return false;
      }
      if (completedSheets.has(currentSheetIndex)) return true;
      return sheetQuizComplete();
    }

    export function updateNextGate() {
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

    export function openTaskFlow() {
      const flow = window.StudyTaskFlow;
      return !!(flow && typeof flow.open === 'function' && flow.open());
    }

    export function navigateSheet(delta) {
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

    export function offerCapstone(finishedSheet) {
      if (finishedSheet !== 2) return;
      const wb = window.StudyWorkbench;
      if (!wb || typeof wb.renderCapstoneModal !== 'function') return;
      if (typeof wb.getCapstoneData === 'function' && wb.getCapstoneData()) return;
      wb.renderCapstoneModal(function () {
        if (currentSheetIndex !== 3) loadSheet(3);
      });
    }

    export function completeAndAdvance() {
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

    export const LEGACY_ID_MAP = {
      assembled: 2, head: 2, chest: 5, thighs: 8, legs: 7, feet: 7, stone: 10,
      lion: 7, bear: 7, leopard: 7, beast: 7, horn: 7, years1260: 7,
      ram: 8, goat: 8, goat_broken: 8, goat_horn: 8,
      dura: 3, stump: 4, ox_king: 4, ancient: 7, son: 7,
      decree: 9, kings: 10, michael: 10, sealed: 10
    };

    export function clampStartSheet(index) {
      if (window.BAJourney && typeof window.BAJourney.previewAllContent === 'function' && window.BAJourney.previewAllContent()) return index;
      if (window.BAJourney && typeof window.BAJourney.clampToAccessible === 'function') {
        return window.BAJourney.clampToAccessible(index);
      }
      return canAccessSheet(index) ? index : 0;
    }

    export function resolveStartSheet() {
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
