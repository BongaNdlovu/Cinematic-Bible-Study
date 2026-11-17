/**
 * study-workbench.js
 * Active Proof Workbench & Apologist's Defense Mini-Capstone
 * Pure client-side, zero-dependency active learning verification engine
 */
(function () {
  'use strict';
  const { renderSheet0Workbench, renderSheet1Workbench, renderSheet2Workbench } = window.WorkbenchSittings;
  const { CAPSTONE_KEY, markTaskComplete, isTaskComplete, isSheetComplete, SITTING_TASKS, saveCapstoneMastery } = window.WorkbenchStore;
  const { evaluateCapstoneRubric } = window.WorkbenchRubric;

  function renderGenericWorkbench(sheetIndex, container, onComplete) {
    const spec = SITTING_TASKS[sheetIndex];
    if (!spec) return;
    const isDone = isTaskComplete(sheetIndex, 'task1');

    let taskBodyHtml = '';
    if (spec.type === 'calc') {
      taskBodyHtml = `
        <div class="p-3 bg-paper-100/70 dark:bg-paper-900/60 rounded-lg border border-paper-300 dark:border-paper-800 mb-3">
          <p class="text-xs font-mono text-ink-700 dark:text-paper-300 mb-2">
            Formula: Start Year (<strong class="text-amber-800 dark:text-amber-400">${spec.startYear} A.D.</strong>) + Duration (<strong class="text-amber-800 dark:text-amber-400">${spec.duration} years</strong>) = Target End Year
          </p>
          <div class="flex gap-2 max-w-sm">
            <input type="number" id="wb${sheetIndex}-val" value="${isDone ? spec.targetYear : ''}" placeholder="e.g. 1798" class="flex-1 p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-900 dark:text-paper-100" />
            <button type="button" id="wb${sheetIndex}-btn" class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
              Verify
            </button>
          </div>
        </div>
      `;
    } else if (spec.type === 'select') {
      taskBodyHtml = `
        <div class="space-y-2 mb-3">
          ${spec.options.map(opt => `
            <label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-paper-300 dark:border-paper-800 bg-paper-100/50 dark:bg-paper-900/40 hover:bg-paper-200/50 cursor-pointer text-xs">
              <input type="radio" name="wb${sheetIndex}-rad" value="${opt.id}" ${isDone && opt.id === spec.correct ? 'checked' : ''} class="mt-0.5 accent-amber-600" />
              <span class="text-ink-800 dark:text-paper-200">${opt.text}</span>
            </label>
          `).join('')}
        </div>
        <button type="button" id="wb${sheetIndex}-btn" class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
          Verify Proof
        </button>
      `;
    } else if (spec.type === 'match') {
      taskBodyHtml = `
        <div class="space-y-2.5 mb-3 text-xs">
          ${spec.items.map(item => `
            <div class="p-2.5 rounded-lg bg-paper-100/60 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span class="font-mono font-bold text-amber-800 dark:text-amber-400">${item.text}</span>
              <select class="wb${sheetIndex}-match-sel p-1.5 rounded border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 font-mono text-xs text-ink-800 dark:text-paper-200" data-item="${item.id}" data-correct="${item.correct}" aria-label="Select match for ${item.id}">
                ${spec.options.map(opt => `
                  <option value="${opt.value}" ${isDone && opt.value === item.correct ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
              </select>
            </div>
          `).join('')}
        </div>
        <button type="button" id="wb${sheetIndex}-btn" class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
          Verify Decryption
        </button>
      `;
    } else if (spec.type === 'chain') {
      taskBodyHtml = `
        <div class="space-y-2.5 mb-3 text-xs">
          ${spec.lines.map(line => `
            <label class="flex items-start gap-2.5 p-3 rounded-lg border border-paper-300 dark:border-paper-800 bg-paper-100/50 dark:bg-paper-900/40 hover:bg-paper-200/50 cursor-pointer">
              <input type="checkbox" class="wb${sheetIndex}-chain-cb mt-1 accent-amber-600" id="${line.id}" ${isDone ? 'checked' : ''} />
              <div>
                <strong class="font-mono text-amber-800 dark:text-amber-400 block mb-0.5">${line.title}</strong>
                <span class="text-ink-700 dark:text-paper-300">${line.desc}</span>
              </div>
            </label>
          `).join('')}
        </div>
        <button type="button" id="wb${sheetIndex}-btn" class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
          Verify Prophetic Chain
        </button>
      `;
    } else if (spec.type === 'typed') {
      taskBodyHtml = `
        <div class="space-y-2.5 mb-3 text-xs">
          ${(spec.lines || []).map(line => `
            <label class="block">
              <span class="font-mono font-bold text-amber-800 dark:text-amber-400 block mb-1">${line.prompt}</span>
              <textarea id="wb${sheetIndex}-${line.id}" rows="2" class="wb${sheetIndex}-typed w-full p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs text-ink-900 dark:text-paper-100" placeholder="${line.placeholder || ''}"></textarea>
            </label>
          `).join('')}
        </div>
        <button type="button" id="wb${sheetIndex}-btn" class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
          Verify Line
        </button>
      `;
    }

    container.innerHTML = `
      <div class="workbench-card p-6 rounded-xl bg-transparent border border-amber-600/25 mb-8 font-sans">
        <div class="flex items-center justify-between border-b border-paper-300 dark:border-paper-800 pb-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded bg-amber-600 text-paper-50 font-mono text-xs font-bold uppercase tracking-wider">Active Proof Gate</span>
            <h3 class="font-serif text-xl font-bold text-ink-900 dark:text-paper-100">${spec.title}</h3>
          </div>
          <span id="wb${sheetIndex}-status" class="font-mono text-xs px-2.5 py-1 rounded ${isDone ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold' : 'bg-paper-200 text-ink-700 dark:bg-paper-800 dark:text-paper-300'}">
            ${isDone ? '✓ 1 of 1 Verified — Checkpoint Unlocked' : '0 of 1 Verified'}
          </span>
        </div>
        <div id="wb${sheetIndex}-box" class="task-box p-5 rounded-xl border ${isDone ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400">
              Task 1: Load-Bearing Proof Formulation
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">${spec.passage}</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-4 leading-relaxed">${spec.question}</p>
          ${taskBodyHtml}
          <div id="wb${sheetIndex}-feedback" class="text-xs mt-3 font-semibold ${isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-500 dark:text-paper-500'}">
            ${isDone ? spec.successText : 'Verify the proof requirement above to unlock the sitting checkpoint.'}
          </div>
        </div>
      </div>
    `;

    const btn = container.querySelector(`#wb${sheetIndex}-btn`);
    const fb = container.querySelector(`#wb${sheetIndex}-feedback`);
    const box = container.querySelector(`#wb${sheetIndex}-box`);
    const statusPill = container.querySelector(`#wb${sheetIndex}-status`);

    function setSuccess() {
      markTaskComplete(sheetIndex, 'task1');
      fb.className = "text-xs mt-3 font-semibold text-emerald-700 dark:text-emerald-400";
      fb.textContent = spec.successText;
      box.className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 transition-all";
      statusPill.className = "font-mono text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold";
      statusPill.textContent = "✓ 1 of 1 Verified — Checkpoint Unlocked";
      if (typeof onComplete === 'function') onComplete();
    }

    if (btn) {
      btn.addEventListener('click', () => {
        if (spec.type === 'calc') {
          const val = parseInt((container.querySelector(`#wb${sheetIndex}-val`)?.value || '').trim(), 10);
          if (val === spec.targetYear) {
            setSuccess();
          } else {
            if (window.Insights) window.Insights.track('workbench_task', sheetIndex, { task: 'task1', pass: false });
            fb.className = "text-xs mt-3 font-semibold text-rose-700 dark:text-rose-400";
            fb.textContent = spec.failText || ('Calculate ' + spec.startYear + ' + ' + spec.duration + ' = ' + spec.targetYear + '.');
          }
        } else if (spec.type === 'select') {
          const sel = container.querySelector(`input[name="wb${sheetIndex}-rad"]:checked`);
          if (sel && sel.value === spec.correct) {
            setSuccess();
          } else {
            if (window.Insights) window.Insights.track('workbench_task', sheetIndex, { task: 'task1', pass: false });
            fb.className = "text-xs mt-3 font-semibold text-rose-700 dark:text-rose-400";
            fb.textContent = "Incorrect selection. Review the passage and select the verified historicist thesis.";
          }
        } else if (spec.type === 'match') {
          const selects = container.querySelectorAll(`.wb${sheetIndex}-match-sel`);
          let allMatch = true;
          selects.forEach(s => {
            if (s.value !== s.dataset.correct) allMatch = false;
          });
          if (allMatch) {
            setSuccess();
          } else {
            if (window.Insights) window.Insights.track('workbench_task', sheetIndex, { task: 'task1', pass: false });
            fb.className = "text-xs mt-3 font-semibold text-rose-700 dark:text-rose-400";
            fb.textContent = spec.failText || "Match every item to its verified gloss.";
          }
        } else if (spec.type === 'chain') {
          const cbs = container.querySelectorAll(`.wb${sheetIndex}-chain-cb`);
          let allChecked = true;
          cbs.forEach(cb => { if (!cb.checked) allChecked = false; });
          if (allChecked) {
            setSuccess();
          } else {
            if (window.Insights) window.Insights.track('workbench_task', sheetIndex, { task: 'task1', pass: false });
            fb.className = "text-xs mt-3 font-semibold text-rose-700 dark:text-rose-400";
            fb.textContent = spec.failText || "Confirm all three prophetic chains to verify the synthesis.";
          }
        } else if (spec.type === 'typed') {
          let allHit = true;
          (spec.lines || []).forEach(function (line) {
            const val = String(container.querySelector('#wb' + sheetIndex + '-' + line.id)?.value || '').toLowerCase();
            const needles = line.mustInclude || [];
            const hits = needles.filter(function (k) { return val.indexOf(String(k).toLowerCase()) >= 0; });
            if (hits.length < (line.minHits || 1)) allHit = false;
          });
          if (allHit) {
            setSuccess();
          } else {
            if (window.Insights) window.Insights.track('workbench_task', sheetIndex, { task: 'task1', pass: false });
            fb.className = "text-xs mt-3 font-semibold text-rose-700 dark:text-rose-400";
            fb.textContent = spec.failText || "Name the verse or its load-bearing phrase in each line.";
          }
        }
      });
    }
  }

  // --- COMPONENT 4: Mini-Capstone ("The Apologist's Defense") ---
  function renderCapstoneModal(onMastered) {
    const existingModal = document.getElementById('capstone-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'capstone-modal';
    modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto";
    modal.innerHTML = `
      <div class="bg-paper-50 dark:bg-paper-950 border border-amber-600/50 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl p-6 sm:p-8 font-sans">
        <div class="flex items-center justify-between border-b border-paper-300 dark:border-paper-800 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🛡️</span>
            <div>
              <span class="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold block">Historicist Synthesis Capstone</span>
              <h2 class="font-serif text-2xl font-bold text-ink-900 dark:text-paper-100">The Apologist's Defense: Foundations Mastery</h2>
            </div>
          </div>
          <button type="button" id="capstone-close-btn" class="text-ink-500 hover:text-ink-900 dark:text-paper-400 p-2 font-mono text-xs">✕ Close</button>
        </div>

        <p class="text-xs text-ink-600 dark:text-paper-400 leading-relaxed mb-6">
          To receive your verified <strong>Historicist Foundations Mastery Dossier</strong> and continue to Daniel 3, you must synthesize the principles of Sheets 0, 1, and 2.
        </p>

        <!-- Part 1 -->
        <div class="p-5 rounded-xl border border-paper-300 dark:border-paper-800 bg-paper-100/50 dark:bg-paper-900/50 mb-5">
          <h3 class="font-serif text-base font-bold text-ink-900 dark:text-paper-100 mb-2">
            Part 1: The Modern Colossus Refutation (Applied Dialogue)
          </h3>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-3 italic">
            Scenario: A popular political commentator insists: <em>“A modern superpower (e.g. the United States or a united European bloc) is a brand-new 'Head of Gold' in Bible prophecy that will reign for a millennium.”</em>
          </p>
          <p class="text-xs text-ink-600 dark:text-paper-400 mb-2">
            Construct your defense. Ensure you incorporate the 3 historicist proofs: (1) Daniel 2:38, (2) Contiguous succession without restarts, (3) We are currently in the feet of iron/clay awaiting the stone:
          </p>
          <textarea id="capstone-part1" class="w-full min-h-[110px] p-3 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs text-ink-900 dark:text-paper-100 font-sans leading-relaxed" placeholder="Draft your 3-point refutation here... (e.g., Daniel 2:38 strictly declares 'Thou art this head of gold' fixing Babylon as the unique start. The metal chain is contiguous without gaps or resets. Modern powers reside in the divided feet of iron and clay, awaiting the supernatural stone cut without hands.)"></textarea>
        </div>

        <!-- Part 2 -->
        <div class="p-5 rounded-xl border border-paper-300 dark:border-paper-800 bg-paper-100/50 dark:bg-paper-900/50 mb-6">
          <h3 class="font-serif text-base font-bold text-ink-900 dark:text-paper-100 mb-2">
            Part 2: The Chain of Synthesis (Consecration Precedes Revelation)
          </h3>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-3 italic">
            Why does Daniel 1 (the table in exile and the diet of zeroim) precede Daniel 2 (the dream of the world empires)? Why could God not give the vision directly to the astrologers of Babylon?
          </p>
          <textarea id="capstone-part2" class="w-full min-h-[90px] p-3 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs text-ink-900 dark:text-paper-100 font-sans leading-relaxed" placeholder="Explain the relationship between covenant loyalty and prophetic illumination... (e.g., Moral consecration precedes prophetic revelation. Daniel purposed in his heart not to defile himself at the king's table. God grants understanding of the secrets of time only to faithful witnesses tested in exile.)"></textarea>
        </div>

        <div id="capstone-eval-feedback" class="hidden p-4 rounded-xl mb-4 text-xs font-medium"></div>

        <div class="flex items-center justify-between pt-4 border-t border-paper-300 dark:border-paper-800">
          <div class="text-xs text-ink-500 font-mono">
            Evaluation criteria: Dan 2:38 citation • contiguous sequence • divided feet • covenant loyalty
          </div>
          <button type="button" id="capstone-submit-btn" class="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-sans font-bold text-xs shadow-md transition-colors flex items-center gap-2">
            <span>Evaluate & Issue Dossier</span> &rarr;
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#capstone-close-btn').addEventListener('click', () => modal.remove());

    modal.querySelector('#capstone-submit-btn').addEventListener('click', () => {
      const p1 = (modal.querySelector('#capstone-part1').value || '').trim();
      const p2 = (modal.querySelector('#capstone-part2').value || '').trim();
      const fb = modal.querySelector('#capstone-eval-feedback');

      const evaluation = evaluateCapstoneRubric(p1, p2);
      fb.classList.remove('hidden');

      if (evaluation.passed) {
        fb.className = "p-4 rounded-xl mb-4 text-xs font-sans leading-relaxed border border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200";
        fb.innerHTML = `<strong>✓ Capstone Defense Approved (Rubric Score: ${evaluation.score}/100)!</strong> All load-bearing criteria met: Daniel 2:38 citation, contiguous four-metal succession, divided iron/clay era, and exile consecration.`;

        saveCapstoneMastery(evaluation);
        setTimeout(() => {
          modal.remove();
          showDossierModal(evaluation, onMastered);
        }, 1200);
      } else {
        fb.className = "p-4 rounded-xl mb-4 text-xs font-sans leading-relaxed border border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200";
        fb.innerHTML = `<strong>Criteria Incomplete (Score: ${evaluation.score}/100):</strong><br>${evaluation.missing.join('<br>')}`;
      }
    });
  }

  function showDossierModal(evaluation, onProceed) {
    const existing = document.getElementById('dossier-modal');
    if (existing) existing.remove();

    const d = new Date(evaluation.timestamp || Date.now());
    const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const modal = document.createElement('div');
    modal.id = 'dossier-modal';
    modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto";
    modal.innerHTML = `
      <div class="bg-paper-50 dark:bg-paper-950 border-2 border-amber-600/70 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl p-6 sm:p-8 font-sans printable-dossier">
        <!-- Header -->
        <div class="text-center border-b border-paper-300 dark:border-paper-800 pb-5 mb-6">
          <div class="inline-block p-3 rounded-full bg-amber-500/15 border border-amber-600/40 text-3xl mb-3">📜</div>
          <span class="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold block mb-1">Official Verification Record</span>
          <h2 class="font-serif text-2xl sm:text-3xl font-bold text-ink-900 dark:text-paper-100">
            Historicist Foundations Mastery Dossier
          </h2>
          <p class="font-mono text-xs text-ink-500 dark:text-paper-400 mt-1">
            Certified on ${dateStr} &bull; Score: ${evaluation.score}/100
          </p>
        </div>

        <!-- Competencies List -->
        <div class="space-y-3 mb-6">
          <h4 class="font-mono text-xs uppercase tracking-wider text-ink-600 dark:text-paper-400 font-bold">Verified Academic Competencies:</h4>
          <div class="p-3 rounded-lg bg-paper-100/70 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 flex items-start gap-3">
            <span class="text-emerald-600 dark:text-emerald-400 font-bold text-base">✓</span>
            <div>
              <strong class="text-xs font-bold text-ink-900 dark:text-paper-100 block">The Prophetic Year-Day Metric (Unit 0)</strong>
              <span class="text-[11px] text-ink-600 dark:text-paper-400">Verified scriptural formulation under Numbers 14:34 and Ezekiel 4:6; diagnosed structural errors of Preterism (Antiochus on Daniel is Porphyry; Alcázar puts the Apocalypse in the past: Jerusalem's fall, then pagan Rome's overthrow) and Futurism (Ribera 1590).</span>
            </div>
          </div>
          <div class="p-3 rounded-lg bg-paper-100/70 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 flex items-start gap-3">
            <span class="text-emerald-600 dark:text-emerald-400 font-bold text-base">✓</span>
            <div>
              <strong class="text-xs font-bold text-ink-900 dark:text-paper-100 block">The Exilic Consecration Boundary (Unit 1)</strong>
              <span class="text-[11px] text-ink-600 dark:text-paper-400">Distinguished permissible secular statecraft from covenant defilement; verified Hebrew <em>zeroim</em> (Dan 1:12) as seed food that echoes Genesis 1:29, kept for loyalty to God.</span>
            </div>
          </div>
          <div class="p-3 rounded-lg bg-paper-100/70 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 flex items-start gap-3">
            <span class="text-emerald-600 dark:text-emerald-400 font-bold text-base">✓</span>
            <div>
              <strong class="text-xs font-bold text-ink-900 dark:text-paper-100 block">Colossus Succession & Apologist Refutation (Unit 2)</strong>
              <span class="text-[11px] text-ink-600 dark:text-paper-400">Traced contiguous four-empire descent from 605 B.C. to divided Europe; applied Daniel 2:38 to dismantle modern claims to restart the Head of Gold.</span>
            </div>
          </div>
        </div>

        <!-- Apologist Excerpt -->
        <div class="p-4 rounded-xl border border-amber-600/30 bg-amber-500/10 dark:bg-amber-950/20 text-xs font-serif text-ink-800 dark:text-paper-200 mb-6 italic">
          “Daniel 2:38 stands as an immutable hermeneutical anchor: Nebuchadnezzar's Babylon is fixed as the head of gold. The chain of metals descends contiguously through Medo-Persia, Greece, and Rome into divided Europe. We live in the feet of iron and clay, awaiting only the stone cut without hands.”
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-paper-300 dark:border-paper-800">
          <button type="button" id="dossier-print-btn" class="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-paper-300 dark:border-paper-700 text-ink-700 dark:text-paper-300 font-mono text-xs hover:bg-paper-200 dark:hover:bg-paper-800 transition-colors flex items-center justify-center gap-1.5">
            <span>🖨️ Print / Save Dossier PDF</span>
          </button>
          <button type="button" id="dossier-proceed-btn" class="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-ink-900 dark:bg-paper-100 text-paper-50 dark:text-ink-900 font-sans font-bold text-xs shadow hover:bg-black dark:hover:bg-white transition-colors">
            Continue to the next sitting &rarr;
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#dossier-print-btn').addEventListener('click', () => window.print());
    modal.querySelector('#dossier-proceed-btn').addEventListener('click', () => {
      modal.remove();
      if (typeof onProceed === 'function') onProceed();
      else if (window.navigateSheet) window.navigateSheet(1);
    });
  }

  // Global Export
  window.StudyWorkbench = {
    renderWorkbench: function (sheetIndex, container, onComplete) {
      if (!container) return;
      if (sheetIndex === 0) renderSheet0Workbench(container, onComplete);
      else if (sheetIndex === 1) renderSheet1Workbench(container, onComplete);
      else if (sheetIndex === 2) renderSheet2Workbench(container, onComplete);
      else if (sheetIndex >= 3 && sheetIndex <= 10) renderGenericWorkbench(sheetIndex, container, onComplete);
      else container.innerHTML = '';
    },
    isSheetComplete: isSheetComplete,
    markTaskComplete: markTaskComplete,
    isTaskComplete: isTaskComplete,
    SITTING_TASKS: SITTING_TASKS,
    renderCapstoneModal: renderCapstoneModal,
    showDossierModal: showDossierModal,
    getCapstoneData: function () {
      try {
        return JSON.parse(localStorage.getItem(CAPSTONE_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }
  };
})();
