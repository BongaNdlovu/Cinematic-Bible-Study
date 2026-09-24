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
    if (!tel.scriptureLookups) tel.scriptureLookups = [];
    if (!tel.scriptureLookups.includes(passage)) {
      tel.scriptureLookups.push(passage);
    }
    saveTelemetry(tel);
  }

  function recordGlossaryLookup(term) {
    const tel = getTelemetry();
    if (!tel.glossaryLookups) tel.glossaryLookups = [];
    if (!tel.glossaryLookups.includes(term)) {
      tel.glossaryLookups.push(term);
    }
    saveTelemetry(tel);
  }

  function recordDossierLookup(tabId) {
    const tel = getTelemetry();
    if (!tel.dossierLookups) tel.dossierLookups = [];
    if (!tel.dossierLookups.includes(tabId)) {
      tel.dossierLookups.push(tabId);
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

  function exportProgress() {
    const payload = {
      baJourney: JSON.parse(localStorage.getItem('baJourney') || '{}'),
      daniel_historicist_mastery: JSON.parse(localStorage.getItem('daniel_historicist_mastery') || '[]'),
      daniel_competency_telemetry_v1: JSON.parse(localStorage.getItem('daniel_competency_telemetry_v1') || '{}'),
      daniel_workbench_v1: JSON.parse(localStorage.getItem('daniel_workbench_v1') || '{}'),
      daniel_capstone_mastery_v1: JSON.parse(localStorage.getItem('daniel_capstone_mastery_v1') || 'null'),
      daniel_certificate_name: localStorage.getItem('daniel_certificate_name') || '',
      daniel_placement_track_v1: localStorage.getItem('daniel_placement_track_v1') || 'foundations',
      exportedAt: new Date().toISOString(),
      version: 1
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daniel-study-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importProgress(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      const reader = new FileReader();
      reader.addEventListener('load', (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data || typeof data !== 'object') throw new Error('Invalid JSON format');
          if (data.baJourney) {
            let incoming = data.baJourney;
            try {
              const localJ = JSON.parse(localStorage.getItem('baJourney') || '{}');
              const localDone = Array.isArray(localJ.completedSheets) ? localJ.completedSheets : [];
              const inDone = Array.isArray(incoming.completedSheets) ? incoming.completedSheets : [];
              incoming = Object.assign({}, incoming, {
                completedSheets: Array.from(new Set(localDone.concat(inDone))).map(Number)
              });
            } catch (mergeErr) {}
            localStorage.setItem('baJourney', JSON.stringify(incoming));
          }
          if (data.daniel_historicist_mastery) {
            try {
              const localM = JSON.parse(localStorage.getItem('daniel_historicist_mastery') || '[]');
              const inM = Array.isArray(data.daniel_historicist_mastery) ? data.daniel_historicist_mastery : [];
              localStorage.setItem('daniel_historicist_mastery', JSON.stringify(Array.from(new Set(localM.concat(inM))).map(Number)));
            } catch (mErr) {
              localStorage.setItem('daniel_historicist_mastery', JSON.stringify(data.daniel_historicist_mastery));
            }
          }
          if (data.daniel_competency_telemetry_v1) localStorage.setItem('daniel_competency_telemetry_v1', JSON.stringify(data.daniel_competency_telemetry_v1));
          if (data.daniel_workbench_v1) localStorage.setItem('daniel_workbench_v1', JSON.stringify(data.daniel_workbench_v1));
          if (data.daniel_capstone_mastery_v1) localStorage.setItem('daniel_capstone_mastery_v1', JSON.stringify(data.daniel_capstone_mastery_v1));
          if (typeof data.daniel_certificate_name === 'string') localStorage.setItem('daniel_certificate_name', data.daniel_certificate_name);
          if (typeof data.daniel_placement_track_v1 === 'string') localStorage.setItem('daniel_placement_track_v1', data.daniel_placement_track_v1);
          if (window.BAJourney && typeof window.BAJourney.load === 'function') window.BAJourney.load();
          try {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent('ba-progress-synced'));
            }
          } catch (_syncErr) {}
          if (window.ProgressSync && typeof window.ProgressSync.syncNow === 'function') {
            window.ProgressSync.syncNow();
          }
          if (window.showToast) window.showToast('Progress restored successfully!');
          renderCompetencyRecordModal();
          resolve(data);
        } catch (err) {
          if (window.showToast) window.showToast('Failed to import progress JSON: ' + err.message);
          reject(err);
        }
      });
      reader.readAsText(file);
    });
  }

  // --- "My Competency Record" Slide-Out / Modal ---
  function renderCompetencyRecordModal() {
    const existing = document.getElementById('competency-record-modal');
    if (existing) existing.remove();

    const tel = getTelemetry();
    const verifiedCount = (tel.verifiedArtifacts || []).length;
    const allLookups = tel.scriptureLookups || [];
    const scriptureOnlyCount = allLookups.filter(s => !s.startsWith("Glossary:") && !s.startsWith("Primary Source Dossier:")).length;
    const glossaryCount = (tel.glossaryLookups || []).length + allLookups.filter(s => s.startsWith("Glossary:")).length;

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

    const journey = window.BAJourney && typeof window.BAJourney.load === 'function' ? window.BAJourney.load() : null;
    const completedList = (journey && Array.isArray(journey.completedSheets)) ? journey.completedSheets : [];
    const certReady = (window.BAJourney && typeof window.BAJourney.allLessonsComplete === 'function' && window.BAJourney.allLessonsComplete()) || completedList.length >= 11;

    const SITTING_TITLES = [
      "Sitting 0: Prophetic Blueprint & Year-Day Precedent",
      "Sitting 1: Exilic Consecration & Hebrew Zeroim",
      "Sitting 2: Colossus Succession & Head of Gold (Dan 2:38)",
      "Sitting 3: Plain of Dura Counter-Colossus Proof",
      "Sitting 4: Sovereign Tree Stump & Seven Times Metric",
      "Sitting 5: Mene-Tekel Historical Inscription Decryption",
      "Sitting 6: Medo-Persian Law vs Prayer Posture",
      "Sitting 7: Four Beasts & The 1,260-Year Calculation",
      "Sitting 8: Ram, Goat, & 2,300 Days (Nitsdaq)",
      "Sitting 9: 70 Weeks Anchor & The Cross (457 B.C.)",
      "Sitting 10: Unbroken Prophetic Chain & Standing of Michael"
    ];

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
              <h3 class="font-serif text-2xl font-bold text-ink-900 dark:text-paper-100">My Progress & Study Metrics</h3>
            </div>
          </div>
          <button type="button" id="record-close-btn" class="text-ink-500 hover:text-ink-900 dark:text-paper-400 p-2 font-mono text-xs">✕ Close</button>
        </div>

        <!-- Telemetry Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xl font-bold font-mono text-ink-900 dark:text-paper-100">${totalMinutes}m</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">Time on Task</span>
          </div>
          <div class="p-3 rounded-xl bg-paper-100/80 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 text-center">
            <span class="block text-xl font-bold font-mono text-ink-900 dark:text-paper-100">${scriptureOnlyCount}</span>
            <span class="text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase tracking-wider">Passages Checked</span>
            ${glossaryCount > 0 ? `<span class="block text-[9px] text-ink-400 font-mono mt-0.5">+${glossaryCount} glossary</span>` : ''}
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

        <!-- Certificate Readiness Banner -->
        <div class="p-3.5 rounded-xl border ${certReady ? 'border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-amber-600/30 bg-amber-500/10 dark:bg-amber-950/20'} flex items-center justify-between mb-5">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${certReady ? '🎓' : '📜'}</span>
            <div>
              <strong class="text-xs font-bold text-ink-900 dark:text-paper-100 block">Graduation Certificate</strong>
              <span class="text-[11px] text-ink-600 dark:text-paper-400">
                ${certReady ? 'All sittings complete! Official PDF certificate ready to issue.' : `Course in progress (${completedList.length} of 11 sittings completed).`}
              </span>
            </div>
          </div>
          <span class="font-mono text-xs font-bold px-2.5 py-1 rounded ${certReady ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-paper-200 text-ink-700 dark:bg-paper-800 dark:text-paper-300'}">
            ${certReady ? '✓ Ready' : `${completedList.length}/11 Complete`}
          </span>
        </div>

        <!-- Sittings 0–10 Progress Status -->
        <div class="space-y-2 mb-6">
          <div class="flex items-center justify-between">
            <h4 class="font-mono text-xs uppercase tracking-wider text-ink-700 dark:text-paper-300 font-bold">
              Course Sittings & Active Proof Gates (0–10):
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-400">
              ${completedList.length} / 11 Complete
            </span>
          </div>
          
          <div class="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            ${SITTING_TITLES.map((title, idx) => {
              const isWbDone = window.StudyWorkbench ? window.StudyWorkbench.isSheetComplete(idx) : false;
              const isLessonDone = completedList.includes(idx);
              const isFinished = isWbDone && isLessonDone;
              return `
                <div class="p-2.5 rounded-lg border ${isFinished ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20' : isWbDone ? 'border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10' : 'border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/20'} flex items-center justify-between text-xs">
                  <span class="text-ink-800 dark:text-paper-200 font-medium">${title}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[11px] ${isWbDone ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-400'}">
                      ${isWbDone ? '✓ Proof Done' : 'Proof Pending'}
                    </span>
                    <span class="px-2 py-0.5 rounded font-mono text-[10px] ${isLessonDone ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold' : 'bg-paper-200 text-ink-600 dark:bg-paper-800 dark:text-paper-400'}">
                      ${isLessonDone ? 'Done' : 'Open'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Export / Import Progress Bar -->
        <div class="p-4 rounded-xl border border-paper-300 dark:border-paper-800 bg-paper-100/60 dark:bg-paper-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div>
            <strong class="text-xs font-bold text-ink-900 dark:text-paper-100 block">Progress Backup & Classroom Transfer</strong>
            <span class="text-[11px] text-ink-600 dark:text-paper-400">Download or restore your journey, workbenches, and telemetry as a portable JSON file.</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="btn-export-progress" class="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-800 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-paper-800 transition-colors flex items-center gap-1.5">
              <span>📥 Export JSON</span>
            </button>
            <button type="button" id="btn-import-progress" class="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-800 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-paper-800 transition-colors flex items-center gap-1.5">
              <span>📤 Import JSON</span>
            </button>
            <input type="file" id="import-progress-file" accept=".json,application/json" class="hidden" />
          </div>
        </div>

        <label class="flex items-start gap-2.5 p-3.5 mb-6 rounded-xl border border-paper-300 dark:border-paper-800 bg-paper-100/40 dark:bg-paper-900/20 text-xs text-ink-700 dark:text-paper-300">
          <input type="checkbox" data-insight-optout class="mt-0.5">
          <span><strong class="block text-ink-900 dark:text-paper-100">Stop usage analytics</strong> Lesson events, quiz answers, and feature use will not be sent from this browser. Progress still saves so you can continue.</span>
        </label>

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
    if (window.Insights && typeof window.Insights.bindOptOuts === 'function') window.Insights.bindOptOuts();

    modal.querySelector('#record-close-btn').addEventListener('click', () => modal.remove());

    const exportBtn = modal.querySelector('#btn-export-progress');
    if (exportBtn) exportBtn.addEventListener('click', exportProgress);

    const importBtn = modal.querySelector('#btn-import-progress');
    const fileInput = modal.querySelector('#import-progress-file');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          importProgress(file);
        }
      });
    }

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
    recordGlossaryLookup: recordGlossaryLookup,
    recordDossierLookup: recordDossierLookup,
    recordQuizAttempt: recordQuizAttempt,
    recordWorkbenchSuccess: recordWorkbenchSuccess,
    recordCapstone: recordCapstone,
    renderCompetencyRecordModal: renderCompetencyRecordModal,
    exportProgress: exportProgress,
    importProgress: importProgress,
    startSheetTimer: startSheetTimer,
    getTelemetry: getTelemetry
  };

  // Run initial track setting
  setTrack(getTrack());
})();
