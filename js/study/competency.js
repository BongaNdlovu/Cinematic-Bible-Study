/**
 * study-competency.js
 * Private Competency Telemetry & Onboarding Placement Diagnostic
 * Tracks authentic learner engagement entirely in local storage.
 */
(function () {
  'use strict';

  const TELEMETRY_KEY = 'daniel_competency_telemetry_v1';
  const TRACK_KEY = 'daniel_placement_track_v1';

  function getTelemetry() {
    try {
      const data = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '{}');
      return Object.assign({
        timeOnSheet: {},
        scriptureLookups: [],
        quizAttempts: {},
        verifiedArtifacts: [],
        capstone: null,
        startedAt: new Date().toISOString()
      }, data);
    } catch (e) {
      return {
        timeOnSheet: {},
        scriptureLookups: [],
        quizAttempts: {},
        verifiedArtifacts: [],
        capstone: null,
        startedAt: new Date().toISOString()
      };
    }
  }

  function saveTelemetry(data) {
    try {
      localStorage.setItem(TELEMETRY_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getTrack() {
    try {
      return localStorage.getItem(TRACK_KEY) || 'foundations';
    } catch (e) {
      return 'foundations';
    }
  }

  function setTrack(track) {
    try {
      localStorage.setItem(TRACK_KEY, track);
    } catch (e) {}
    document.body.classList.toggle('track-scholarly', track === 'scholarly');
    document.body.classList.toggle('track-foundations', track === 'foundations');
  }

  // --- Telemetry Logging Methods ---
  function recordSheetTime(sheetId, seconds) {
    const tel = getTelemetry();
    tel.timeOnSheet[sheetId] = (tel.timeOnSheet[sheetId] || 0) + seconds;
    saveTelemetry(tel);
  }

  function recordScriptureLookup(passage) {
    const tel = getTelemetry();
    if (!tel.scriptureLookups.includes(passage)) {
      tel.scriptureLookups.push(passage);
    }
    saveTelemetry(tel);
  }

  function recordQuizAttempt(sheetId, arg2, arg3) {
    const tel = getTelemetry();
    if (!tel.quizAttempts[sheetId]) {
      tel.quizAttempts[sheetId] = {
        attempts: 0,
        questions: {},
        firstTryPassedAll: true,
        scores: []
      };
    }
    // Flexible signature: (sheetId, qIdx, isCorrect) or (sheetId, isFirstTry, score)
    if (typeof arg2 === 'number' && typeof arg3 === 'boolean') {
      const qIdx = arg2;
      const isCorrect = arg3;
      if (!tel.quizAttempts[sheetId].questions) tel.quizAttempts[sheetId].questions = {};
      const qData = tel.quizAttempts[sheetId].questions[qIdx] || { attempts: 0, passed: false, firstTry: false };
      qData.attempts++;
      if (isCorrect) {
        qData.passed = true;
        if (qData.attempts === 1) qData.firstTry = true;
      } else {
        tel.quizAttempts[sheetId].firstTryPassedAll = false;
      }
      tel.quizAttempts[sheetId].questions[qIdx] = qData;
      tel.quizAttempts[sheetId].attempts++;
      tel.quizAttempts[sheetId].scores.push(isCorrect ? 100 : 0);
    } else {
      tel.quizAttempts[sheetId].attempts++;
      tel.quizAttempts[sheetId].scores.push(arg3);
      if (!arg2) tel.quizAttempts[sheetId].firstTryPassedAll = false;
    }
    saveTelemetry(tel);
  }

  function recordWorkbenchSuccess(sheetId, taskId) {
    const tel = getTelemetry();
    const key = `s${sheetId}_${taskId}`;
    if (!tel.verifiedArtifacts.includes(key)) {
      tel.verifiedArtifacts.push(key);
    }
    saveTelemetry(tel);
  }

  function recordCapstone(score, data) {
    const tel = getTelemetry();
    tel.capstone = {
      completed: true,
      score: score,
      timestamp: new Date().toISOString(),
      details: data
    };
    saveTelemetry(tel);
  }

  // --- Onboarding Placement Diagnostic Modal ---
  function initPlacementModal(forceOpen) {
    const admin = !!(window.ScrollAuth && (
      (typeof window.ScrollAuth.isAdmin === "function" && window.ScrollAuth.isAdmin())
      || (typeof window.ScrollAuth.isModerator === "function" && window.ScrollAuth.isModerator())
    ));
    const hasChosen = localStorage.getItem(TRACK_KEY);
    if (admin && !forceOpen) {
      const existing = document.getElementById("placement-modal");
      if (existing) existing.remove();
      if (!hasChosen) setTrack("scholarly");
      else setTrack(hasChosen);
      return;
    }
    if (hasChosen && !forceOpen) {
      setTrack(hasChosen);
      return;
    }

    const existing = document.getElementById('placement-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'placement-modal';
    modal.className = "fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md";
    modal.innerHTML = `
      <div class="bg-paper-50 dark:bg-paper-950 border-2 border-amber-600/50 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl font-sans">
        <div class="text-center mb-6">
          <span class="text-3xl mb-2 inline-block">🧭</span>
          <span class="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold block mb-1">
            2-Minute Diagnostic Placement
          </span>
          <h2 class="font-serif text-2xl font-bold text-ink-900 dark:text-paper-100">
            Choose Your Historicist Learning Track
          </h2>
          <p class="text-xs text-ink-600 dark:text-paper-400 mt-1">
            Customize glossaries, Scripture hints, and proof workbench scaffolding to your study background:
          </p>
        </div>

        <div class="space-y-4 mb-6">
          <!-- Foundations Track -->
          <label class="block p-4 rounded-xl border-2 border-amber-600/60 bg-paper-100/70 dark:bg-paper-900/60 hover:border-amber-600 cursor-pointer transition-all">
            <div class="flex items-start gap-3">
              <input type="radio" name="placement-track" value="foundations" checked class="mt-1 accent-amber-600" />
              <div>
                <strong class="text-sm font-bold text-ink-900 dark:text-paper-100 block mb-0.5">
                  Foundations Track (Recommended for First-time Readers)
                </strong>
                <p class="text-xs text-ink-600 dark:text-paper-400 leading-relaxed">
                  Enables all inline Strong's Hebrew tooltips (<em>zeroim</em>, <em>tamid</em>, <em>chathak</em>, <em>nitsdaq</em>), guided Scripture navigation, contextual hints in the proof workbenches, and paced historical commentary.
                </p>
              </div>
            </div>
          </label>

          <!-- Scholarly Track -->
          <label class="block p-4 rounded-xl border-2 border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/30 hover:border-amber-600 cursor-pointer transition-all">
            <div class="flex items-start gap-3">
              <input type="radio" name="placement-track" value="scholarly" class="mt-1 accent-amber-600" />
              <div>
                <strong class="text-sm font-bold text-ink-900 dark:text-paper-100 block mb-0.5">
                  Scholarly / Review Track (Experienced Prophecy Students)
                </strong>
                <p class="text-xs text-ink-600 dark:text-paper-400 leading-relaxed">
                  Streamlines introductory scaffolding, direct access to primary-source dossiers (Ribera 1590, Alcazar 1614, Newton 1733), advanced linguistic analysis, and immediate workbench challenges.
                </p>
              </div>
            </div>
          </label>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-paper-300 dark:border-paper-800">
          <span class="text-[11px] font-mono text-ink-500 dark:text-paper-400">
            You can change tracks anytime in the Codex drawer.
          </span>
          <button type="button" id="placement-confirm-btn" class="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase tracking-wider shadow transition-colors">
            Confirm & Enter Codex
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#placement-confirm-btn').addEventListener('click', () => {
      const selected = modal.querySelector('input[name="placement-track"]:checked');
      const track = selected ? selected.value : 'foundations';
      setTrack(track);
      modal.remove();
      if (window.showToast) {
        window.showToast(`Active Track: ${track === 'scholarly' ? 'Scholarly Review' : 'Foundations Masterclass'}`);
      }
      if (typeof window.onPlacementConfirmed === 'function') {
        window.onPlacementConfirmed(track);
      }
    });
  }

  // --- "My Competency Record" Slide-Out / Modal ---
  function renderCompetencyRecordModal() {
    const existing = document.getElementById('competency-record-modal');
    if (existing) existing.remove();

    const tel = getTelemetry();
    const track = getTrack();
    const verifiedCount = (tel.verifiedArtifacts || []).length;
    const lookupsCount = (tel.scriptureLookups || []).length;

    // Calculate total time
    let totalSec = 0;
    Object.values(tel.timeOnSheet || {}).forEach(s => { totalSec += (Number(s) || 0); });
    const totalMinutes = Math.round(totalSec / 60);

    // Calculate quiz accuracy
    let totalQuestions = 0;
    let firstTryPassed = 0;
    Object.values(tel.quizAttempts || {}).forEach(qa => {
      if (qa.questions) {
        Object.values(qa.questions).forEach(q => {
          totalQuestions++;
          if (q.firstTry) firstTryPassed++;
        });
      }
    });
    const quizAccuracy = totalQuestions > 0 ? Math.round((firstTryPassed / totalQuestions) * 100) : 100;

    const modal = document.createElement('div');
    modal.id = 'competency-record-modal';
    modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto font-sans";
    modal.innerHTML = `
      <div class="bg-paper-50 dark:bg-paper-950 border border-amber-600/50 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-paper-300 dark:border-paper-800 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📊</span>
            <div>
              <span class="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold block">Private Telemetry Record</span>
              <h3 class="font-serif text-2xl font-bold text-ink-900 dark:text-paper-100">My Competency & Study Metrics</h3>
            </div>
          </div>
          <button type="button" id="record-close-btn" class="text-ink-500 hover:text-ink-900 dark:text-paper-400 p-2 font-mono text-xs">✕ Close</button>
        </div>

        <!-- Telemetry Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xl font-bold font-mono text-ink-900 dark:text-paper-100">${totalMinutes}m</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">Time on Task</span>
          </div>
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xl font-bold font-mono text-ink-900 dark:text-paper-100">${lookupsCount}</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">Passages Checked</span>
          </div>
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xl font-bold font-mono text-ink-900 dark:text-paper-100">${verifiedCount}</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">Proof Artifacts</span>
          </div>
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xl font-bold font-mono text-ink-900 dark:text-paper-100">${quizAccuracy}%</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">First-Try Acc.</span>
          </div>
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xs font-bold font-mono text-amber-700 dark:text-amber-400 uppercase mt-1">${track}</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">Current Track</span>
          </div>
        </div>

        <!-- Verified Capabilities -->
        <div class="space-y-3 mb-6">
          <h4 class="font-mono text-xs uppercase tracking-wider text-ink-700 dark:text-paper-300 font-bold">Transferrable Competency Status:</h4>
          
          <div class="p-3 rounded-lg border ${tel.verifiedArtifacts.includes('s0_task1') && tel.verifiedArtifacts.includes('s0_task2') ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/20'} flex items-center justify-between">
            <div>
              <strong class="text-xs text-ink-900 dark:text-paper-100 block">Unit 0: Prophetic Metric & Three-School Diagnosis</strong>
              <span class="text-[11px] text-ink-500 dark:text-paper-400">Year-Day Formula (Num 14:34, Ezek 4:6) • Refuting Preterism & Futurism</span>
            </div>
            <span class="font-mono text-xs font-bold ${tel.verifiedArtifacts.includes('s0_task1') ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}">
              ${tel.verifiedArtifacts.includes('s0_task1') && tel.verifiedArtifacts.includes('s0_task2') ? '✓ Verified' : 'In Progress'}
            </span>
          </div>

          <div class="p-3 rounded-lg border ${tel.verifiedArtifacts.includes('s1_task1') && tel.verifiedArtifacts.includes('s1_task2') ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/20'} flex items-center justify-between">
            <div>
              <strong class="text-xs text-ink-900 dark:text-paper-100 block">Unit 1: Exilic Consecration & Linguistic Boundary</strong>
              <span class="text-[11px] text-ink-500 dark:text-paper-400">Civic Skill vs Defilement • Hebrew <em>Zeroim</em></span>
            </div>
            <span class="font-mono text-xs font-bold ${tel.verifiedArtifacts.includes('s1_task1') ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}">
              ${tel.verifiedArtifacts.includes('s1_task1') && tel.verifiedArtifacts.includes('s1_task2') ? '✓ Verified' : 'In Progress'}
            </span>
          </div>

          <div class="p-3 rounded-lg border ${tel.verifiedArtifacts.includes('s2_task1') && tel.verifiedArtifacts.includes('s2_task2') ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/20'} flex items-center justify-between">
            <div>
              <strong class="text-xs text-ink-900 dark:text-paper-100 block">Unit 2: Colossus Chronology & Modern Colossus Refutation</strong>
              <span class="text-[11px] text-ink-500 dark:text-paper-400">Contiguous 4-Metal Descent • Daniel 2:38 Textual Lock</span>
            </div>
            <span class="font-mono text-xs font-bold ${tel.verifiedArtifacts.includes('s2_task1') ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}">
              ${tel.verifiedArtifacts.includes('s2_task1') && tel.verifiedArtifacts.includes('s2_task2') ? '✓ Verified' : 'In Progress'}
            </span>
          </div>

          <div class="p-3 rounded-lg border ${tel.capstone && tel.capstone.completed ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/20'} flex items-center justify-between">
            <div>
              <strong class="text-xs text-ink-900 dark:text-paper-100 block">The Apologist's Defense: Mini-Capstone</strong>
              <span class="text-[11px] text-ink-500 dark:text-paper-400">Synthesis Defense • Historicist Foundations Mastery Dossier</span>
            </div>
            <span class="font-mono text-xs font-bold ${tel.capstone && tel.capstone.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}">
              ${tel.capstone && tel.capstone.completed ? `✓ Passed (${tel.capstone.score}/100)` : 'Not Attempted'}
            </span>
          </div>
        </div>

        <!-- Track Switcher & Dossier Access -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-paper-300 dark:border-paper-800">
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="text-ink-500">Track:</span>
            <button type="button" id="btn-switch-track" class="px-2.5 py-1 rounded border border-amber-600/50 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors">
              Switch Track (${track})
            </button>
          </div>
          ${tel.capstone && tel.capstone.completed ? `
            <button type="button" id="btn-view-dossier" class="px-4 py-2 rounded-lg bg-amber-600 text-paper-50 text-xs font-bold uppercase tracking-wider hover:bg-amber-700 transition-colors">
              View Verified Dossier
            </button>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#record-close-btn').addEventListener('click', () => modal.remove());

    const switchBtn = modal.querySelector('#btn-switch-track');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        modal.remove();
        initPlacementModal(true);
      });
    }

    const dossierBtn = modal.querySelector('#btn-view-dossier');
    if (dossierBtn) {
      dossierBtn.addEventListener('click', () => {
        modal.remove();
        if (window.StudyWorkbench && tel.capstone) {
          window.StudyWorkbench.showDossierModal(tel.capstone.details || tel.capstone);
        }
      });
    }
  }

  // Auto-init timer tracker
  let activeSheet = 0;
  let timerInterval = null;

  function startSheetTimer(sheetId) {
    if (timerInterval) clearInterval(timerInterval);
    activeSheet = sheetId;
    timerInterval = setInterval(() => {
      if (!document.hidden) {
        recordSheetTime(activeSheet, 5);
      }
    }, 5000);
  }

  // Global Export
  window.StudyCompetency = {
    initPlacementModal: initPlacementModal,
    getTrack: getTrack,
    setTrack: setTrack,
    recordSheetTime: recordSheetTime,
    recordScriptureLookup: recordScriptureLookup,
    recordQuizAttempt: recordQuizAttempt,
    recordWorkbenchSuccess: recordWorkbenchSuccess,
    recordCapstone: recordCapstone,
    renderCompetencyRecordModal: renderCompetencyRecordModal,
    startSheetTimer: startSheetTimer,
    getTelemetry: getTelemetry
  };

  // Run initial track setting
  setTrack(getTrack());
})();
