(function () {
  'use strict';
  const { isSheetComplete, isTaskComplete, markTaskComplete } = window.WorkbenchStore;

  // --- SHEET 0: Hermeneutic Metric & Classification Workbench ---
  function renderSheet0Workbench(container, onComplete) {
    const t1Done = isTaskComplete(0, 'task1');
    const t2Done = isTaskComplete(0, 'task2');

    container.innerHTML = `
      <div class="workbench-card p-6 rounded-xl bg-transparent border border-amber-600/25 mb-8 font-sans">
        <div class="flex items-center justify-between border-b border-paper-300 dark:border-paper-800 pb-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded bg-amber-600 text-paper-50 font-mono text-xs font-bold uppercase tracking-wider">Active Proof Gate</span>
            <h3 class="font-serif text-xl font-bold text-ink-900 dark:text-paper-100">Hermeneutic Metric & Classification Workbench</h3>
          </div>
          <span id="wb0-status" class="font-mono text-xs px-2.5 py-1 rounded ${t1Done && t2Done ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-paper-200 text-ink-700 dark:bg-paper-800 dark:text-paper-300'}">
            ${t1Done && t2Done ? '✓ 2 of 2 Verified' : (t1Done || t2Done ? '1 of 2 Verified' : '0 of 2 Verified')}
          </span>
        </div>
        <p class="text-xs text-ink-600 dark:text-paper-400 mb-6 leading-relaxed">
          Before taking the checkpoint quiz, verify the day-for-year scale Scripture sets in Numbers 14:34 and Ezekiel 4:6 and correctly classify the three schools of apocalyptic interpretation.
        </p>

        <!-- Task 1: Year-Day Scriptural Formulation -->
        <div id="wb0-t1" class="task-box p-5 rounded-xl border ${t1Done ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} mb-6 transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <span>Task 1: Year-Day Scriptural Proof Formulation</span>
              ${t1Done ? '<span class="text-emerald-600 font-bold">✓ Verified</span>' : ''}
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">Num 14:34 & Ezek 4:6</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-4">
            Identify the two Old Testament verses that explicitly formulate the prophetic scale, and enter the exact formulaic biblical phrase:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label for="wb0-v1" class="block text-[11px] font-mono text-ink-600 dark:text-paper-400 mb-1">Passage 1 (Wilderness Sentence):</label>
              <select id="wb0-v1" aria-label="Passage 1 (Wilderness Sentence)" class="w-full p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-100/70 dark:bg-paper-900 text-xs font-mono text-ink-800 dark:text-paper-200">
                <option value="">Select Scripture reference...</option>
                <option value="gen1">Genesis 1:14 (Signs and seasons)</option>
                <option value="num14" ${t1Done ? 'selected' : ''}>Numbers 14:34 (After the number of the days...)</option>
                <option value="lev23">Leviticus 23:3 (The seventh day is sabbath)</option>
                <option value="ps90">Psalm 90:4 (A thousand years in thy sight)</option>
              </select>
            </div>
            <div>
              <label for="wb0-v2" class="block text-[11px] font-mono text-ink-600 dark:text-paper-400 mb-1">Passage 2 (Prophetic Siege Act):</label>
              <select id="wb0-v2" aria-label="Passage 2 (Prophetic Siege Act)" class="w-full p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-100/70 dark:bg-paper-900 text-xs font-mono text-ink-800 dark:text-paper-200">
                <option value="">Select Scripture reference...</option>
                <option value="isa40">Isaiah 40:28 (Creator of the ends of earth)</option>
                <option value="ezek4" ${t1Done ? 'selected' : ''}>Ezekiel 4:6 (I have appointed thee...)</option>
                <option value="jer25">Jeremiah 25:11 (Seventy years captivity)</option>
                <option value="dan12">Daniel 12:4 (Shut up the words)</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label for="wb0-phrase" class="block text-[11px] font-mono text-ink-600 dark:text-paper-400 mb-1">
              Exact Biblical Formula Phrase in KJV (Numbers 14:34 &amp; Ezekiel 4:6):
            </label>
            <div class="flex gap-2">
              <input type="text" id="wb0-phrase" value="${t1Done ? 'each day for a year' : ''}" placeholder="e.g., each day for a year" class="flex-1 p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-100/70 dark:bg-paper-900 text-xs font-mono text-ink-900 dark:text-paper-100" />
              <button type="button" id="wb0-check-t1" class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold tracking-wider uppercase transition-colors">
                Verify Formula
              </button>
            </div>
          </div>
          <div id="wb0-t1-feedback" class="text-xs ${t1Done ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-500 dark:text-paper-500'}">
            ${t1Done ? '✓ Biblical formula verified: Numbers 14:34 and Ezekiel 4:6 establish the prophetic scale.' : 'Enter the verses and phrase from Numbers 14:34 / Ezekiel 4:6 to verify.'}
          </div>
        </div>

        <!-- Task 2: Three-School Classification Matrix -->
        <div id="wb0-t2" class="task-box p-5 rounded-xl border ${t2Done ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <span>Task 2: The Three-School Structural Diagnosis</span>
              ${t2Done ? '<span class="text-emerald-600 font-bold">✓ Verified</span>' : ''}
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">Classify 6 Historical Positions</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-4 leading-relaxed">
            Assign each historical interpretation to its proper school: <strong>Historicism</strong> (continuous timeline), <strong>Preterism</strong> (Antiochus on Daniel is Porphyry; Alcázar puts the Apocalypse in the past: Jerusalem's fall, then pagan Rome's overthrow), or <strong>Futurism</strong> (severed future gap).
          </p>

          <div id="wb0-matrix" class="space-y-2.5 mb-4 text-xs">
            ${[
              { id: 'm0', text: "The 70th week of Daniel 9 is severed from the first 69 weeks by a 2,000-year parenthetical gap.", correct: "futurism" },
              { id: 'm1', text: "The little horn is Antiochus IV Epiphanes, exhausting all prophetic specifications in the 2nd century B.C.", correct: "preterism" },
              { id: 'm2', text: "Prophecy is an unbroken, continuous chain of historical fulfillment from 605 B.C. through divided Europe to the Second Advent.", correct: "historicism" },
              { id: 'm3', text: "All apocalyptic prophecies were completed by the destruction of Jerusalem in A.D. 70 and the fall of pagan Rome.", correct: "preterism" },
              { id: 'm4', text: "The Antichrist is a single future individual reigning for 3.5 literal years in a rebuilt temple in Jerusalem.", correct: "futurism" },
              { id: 'm5', text: "The number 1,260 is the year-day reading of Daniel 7:25's 'time, times, and the dividing of time'; Revelation 12:6 and 13:5 give the same span as 1,260 days and 42 months.", correct: "historicism" }
            ].map((item, idx) => `
              <div class="p-3 rounded-lg bg-paper-100/60 dark:bg-paper-900/60 border border-paper-300/80 dark:border-paper-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-item-id="${item.id}" data-correct="${item.correct}">
                <span class="text-ink-800 dark:text-paper-200 leading-snug"><strong class="font-mono text-ink-500 dark:text-paper-500 mr-1">${idx + 1}.</strong> ${item.text}</span>
                <div class="shrink-0 flex gap-1">
                  <select class="matrix-select p-1.5 rounded border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 font-mono text-[11px] text-ink-800 dark:text-paper-200" aria-label="Select interpretive school for item ${idx + 1}">
                    <option value="">Select school...</option>
                    <option value="historicism" ${t2Done && item.correct === 'historicism' ? 'selected' : ''}>Historicism</option>
                    <option value="preterism" ${t2Done && item.correct === 'preterism' ? 'selected' : ''}>Preterism</option>
                    <option value="futurism" ${t2Done && item.correct === 'futurism' ? 'selected' : ''}>Futurism</option>
                  </select>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex items-center justify-between">
            <button type="button" id="wb0-check-t2" class="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold tracking-wider uppercase transition-colors">
              Verify Classification Matrix
            </button>
            <span id="wb0-t2-feedback" class="text-xs font-medium text-ink-600 dark:text-paper-400">
              ${t2Done ? '✓ All 6 structural positions accurately classified.' : 'Assign all 6 positions and click verify.'}
            </span>
          </div>
        </div>
      </div>
    `;

    // Event binding Task 1
    const btnT1 = container.querySelector('#wb0-check-t1');
    btnT1.addEventListener('click', () => {
      const v1 = container.querySelector('#wb0-v1').value;
      const v2 = container.querySelector('#wb0-v2').value;
      const phrase = (container.querySelector('#wb0-phrase').value || '').trim().toLowerCase();
      const fb = container.querySelector('#wb0-t1-feedback');

      const isPassagesCorrect = (v1 === 'num14' && v2 === 'ezek4') || (v1 === 'ezek4' && v2 === 'num14');
      const isPhraseCorrect = /each\s+day\s+(for|unto)\s+a\s+year/i.test(phrase) || /a\s+day\s+for\s+(each|a)\s+year/i.test(phrase);

      if (isPassagesCorrect && isPhraseCorrect) {
        markTaskComplete(0, 'task1');
        fb.className = "text-xs text-emerald-700 dark:text-emerald-400 font-semibold";
        fb.textContent = "✓ Formula Verified: Numbers 14:34 and Ezekiel 4:6 explicitly establish 'each day for a year.'";
        container.querySelector('#wb0-t1').className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 mb-6 transition-all";
        checkAllDone();
      } else {
        if (window.Insights) window.Insights.track('workbench_task', 0, { task: 'task1', pass: false });
        fb.className = "text-xs text-rose-700 dark:text-rose-400 font-semibold";
        if (!isPassagesCorrect) {
          fb.textContent = "Select Numbers 14:34 and Ezekiel 4:6 for the two biblical anchors.";
        } else {
          fb.textContent = "Biblical phrase should match 'each day for a year' (as in Num 14:34 & Ezek 4:6).";
        }
      }
    });

    // Event binding Task 2
    const btnT2 = container.querySelector('#wb0-check-t2');
    btnT2.addEventListener('click', () => {
      const rows = container.querySelectorAll('#wb0-matrix [data-item-id]');
      let correctCount = 0;
      rows.forEach(row => {
        const expected = row.getAttribute('data-correct');
        const sel = row.querySelector('.matrix-select').value;
        if (sel === expected) {
          correctCount++;
          row.classList.remove('border-rose-500', 'bg-rose-50/50');
          row.classList.add('border-emerald-500/60', 'bg-emerald-50/30');
        } else {
          row.classList.remove('border-emerald-500/60', 'bg-emerald-50/30');
          row.classList.add('border-rose-500', 'bg-rose-50/50');
        }
      });

      const fb = container.querySelector('#wb0-t2-feedback');
      if (correctCount === rows.length) {
        markTaskComplete(0, 'task2');
        fb.className = "text-xs font-semibold text-emerald-700 dark:text-emerald-400";
        fb.textContent = `✓ 6 of 6 Correct! Matrix verified.`;
        container.querySelector('#wb0-t2').className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 transition-all";
        checkAllDone();
      } else {
        if (window.Insights) window.Insights.track('workbench_task', 0, { task: 'task2', pass: false });
        fb.className = "text-xs font-semibold text-rose-700 dark:text-rose-400";
        fb.textContent = `${correctCount} of 6 correct. Review highlighted items (Futurism = severed future gap; Preterism: Antiochus on Daniel is Porphyry; Alcázar puts the Apocalypse in the past: Jerusalem's fall, then pagan Rome's overthrow).`;
      }
    });

    function checkAllDone() {
      const done = isSheetComplete(0);
      const st = container.querySelector('#wb0-status');
      if (done) {
        st.className = "font-mono text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold";
        st.textContent = "✓ 2 of 2 Verified — Checkpoint Unlocked";
        if (typeof onComplete === 'function') onComplete();
      }
    }
  }

  // --- SHEET 1: Exilic Covenant Boundary Matrix ---
  function renderSheet1Workbench(container, onComplete) {
    const t1Done = isTaskComplete(1, 'task1');
    const t2Done = isTaskComplete(1, 'task2');

    container.innerHTML = `
      <div class="workbench-card p-6 rounded-xl bg-transparent border border-amber-600/25 mb-8 font-sans">
        <div class="flex items-center justify-between border-b border-paper-300 dark:border-paper-800 pb-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded bg-amber-600 text-paper-50 font-mono text-xs font-bold uppercase tracking-wider">Active Proof Gate</span>
            <h3 class="font-serif text-xl font-bold text-ink-900 dark:text-paper-100">Exilic Covenant Boundary Workbench</h3>
          </div>
          <span id="wb1-status" class="font-mono text-xs px-2.5 py-1 rounded ${t1Done && t2Done ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-paper-200 text-ink-700 dark:bg-paper-800 dark:text-paper-300'}">
            ${t1Done && t2Done ? '✓ 2 of 2 Verified' : (t1Done || t2Done ? '1 of 2 Verified' : '0 of 2 Verified')}
          </span>
        </div>
        <p class="text-xs text-ink-600 dark:text-paper-400 mb-6 leading-relaxed">
          Verify Daniel's exilic loyalty test: match the theophoric renamings, enforce the line between civic skill and covenant defilement, and verify the Hebrew diet term.
        </p>

        <!-- Task 1: Exilic Name Contrast -->
        <div id="wb1-t1" class="task-box p-5 rounded-xl border ${t1Done ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} mb-6 transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <span>Task 1: The Exilic Name & Loyalty Contrast</span>
              ${t1Done ? '<span class="text-emerald-600 font-bold">✓ Verified</span>' : ''}
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">Daniel 1:6–7</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-4">
            Match each Hebrew covenant name with its Babylonian replacement and the pagan deity Ashpenaz sought to honor:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
            ${[
              { hebrew: "Daniel (“God is my Judge”)", id: "n_dan", correct: "belteshazzar_bel" },
              { hebrew: "Hananiah (“Yahweh is gracious”)", id: "n_han", correct: "shadrach_aku" },
              { hebrew: "Mishael (“who belongs to God?”)", id: "n_mis", correct: "meshach_aku" },
              { hebrew: "Azariah (“Yahweh has helped”)", id: "n_aza", correct: "abednego_nabu" }
            ].map(item => `
              <div class="p-3 rounded-lg bg-paper-100/60 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800" data-name-id="${item.id}" data-correct="${item.correct}">
                <div class="font-bold text-ink-900 dark:text-paper-100 mb-1.5">${item.hebrew}</div>
                <select class="name-select w-full p-2 rounded border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-800 dark:text-paper-200" aria-label="Select Babylonian renaming">
                  <option value="">Select Babylonian renaming...</option>
                  <option value="belteshazzar_bel" ${t1Done && item.correct === 'belteshazzar_bel' ? 'selected' : ''}>Belteshazzar (Honors Bel / Marduk)</option>
                  <option value="shadrach_aku" ${t1Done && item.correct === 'shadrach_aku' ? 'selected' : ''}>Shadrach (traditional Aku reading, debated)</option>
                  <option value="meshach_aku" ${t1Done && item.correct === 'meshach_aku' ? 'selected' : ''}>Meshach (Honors Aku / “Who is what Aku is?” — traditional reading)</option>
                  <option value="abednego_nabu" ${t1Done && item.correct === 'abednego_nabu' ? 'selected' : ''}>Abednego (Honors Nabu / Nebo)</option>
                </select>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center justify-between">
            <button type="button" id="wb1-check-t1" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
              Verify Names
            </button>
            <span id="wb1-t1-feedback" class="text-xs font-medium text-ink-600 dark:text-paper-400">
              ${t1Done ? '✓ Exilic theophoric renamings confirmed.' : 'Select the 4 corresponding Babylonian court names.'}
            </span>
          </div>
        </div>

        <!-- Task 2: Consecration Line & Zeroim -->
        <div id="wb1-t2" class="task-box p-5 rounded-xl border ${t2Done ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <span>Task 2: The Consecration Line & Zeroim Check</span>
              ${t2Done ? '<span class="text-emerald-600 font-bold">✓ Verified</span>' : ''}
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">Daniel 1:8, 12</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-3">
            Distinguish permissible civic education from impermissible covenant defilement:
          </p>
          <div id="wb1-civic-matrix" class="space-y-2 mb-4 text-xs">
            ${[
              { id: 'c0', text: "Mastering Akkadian cuneiform literature, mathematics, and court administrative law.", correct: "civic" },
              { id: 'c1', text: "Consuming the king's meat, which the likeliest reading places outside the Torah's permitted list or first presented to the gods (Leviticus 11; 1 Corinthians 10:18-21).", correct: "defilement" },
              { id: 'c2', text: "Serving diligently as counselors and state administrators in the government of Babylon.", correct: "civic" },
              { id: 'c3', text: "Drinking the king's wine, which the likeliest reading ties to the court's libations poured out to the gods.", correct: "defilement" }
            ].map((item, idx) => `
              <div class="p-2.5 rounded-lg bg-paper-100/60 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800 flex flex-wrap items-center justify-between gap-2" data-civic-id="${item.id}" data-correct="${item.correct}">
                <span class="text-ink-800 dark:text-paper-200 text-xs">${idx + 1}. ${item.text}</span>
                <select class="civic-select max-w-full p-1.5 rounded border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 font-mono text-[11px] text-ink-800 dark:text-paper-200" aria-label="Classify item ${idx + 1}">
                  <option value="">Classify...</option>
                  <option value="civic" ${t2Done && item.correct === 'civic' ? 'selected' : ''}>Permissible Civic Skill</option>
                  <option value="defilement" ${t2Done && item.correct === 'defilement' ? 'selected' : ''}>Covenant Defilement</option>
                </select>
              </div>
            `).join('')}
          </div>

          <div class="p-3 rounded-lg bg-paper-200/50 dark:bg-paper-900/70 border border-paper-300 dark:border-paper-800 mb-4">
            <label for="wb1-zeroim-input" class="block text-xs font-mono text-ink-700 dark:text-paper-300 mb-1">
              Type the transliterated Hebrew term for the plant/pulse diet requested by Daniel (Dan 1:12):
            </label>
            <div class="flex gap-2">
              <input type="text" id="wb1-zeroim-input" value="${t2Done ? 'zeroim' : ''}" placeholder="Hebrew term (6 letters, starts with z)..." class="flex-1 p-2 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-900 dark:text-paper-100" />
              <button type="button" id="wb1-check-t2" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
                Verify Line & Term
              </button>
            </div>
          </div>

          <div id="wb1-t2-feedback" class="text-xs font-medium text-ink-600 dark:text-paper-400">
            ${t2Done ? '✓ Consecration line and Hebrew zeroim (זֵרֹעִים) verified.' : 'Classify the boundary and enter the Hebrew diet term.'}
          </div>
        </div>
      </div>
    `;

    // Bind Task 1
    container.querySelector('#wb1-check-t1').addEventListener('click', () => {
      const rows = container.querySelectorAll('#wb1-t1 [data-name-id]');
      let ok = 0;
      rows.forEach(r => {
        const expected = r.getAttribute('data-correct');
        const val = r.querySelector('.name-select').value;
        if (val === expected) ok++;
      });
      const fb = container.querySelector('#wb1-t1-feedback');
      if (ok === rows.length) {
        markTaskComplete(1, 'task1');
        fb.className = "text-xs font-semibold text-emerald-700 dark:text-emerald-400";
        fb.textContent = "✓ 4 of 4 Matched! Exilic name substitutions confirmed.";
        container.querySelector('#wb1-t1').className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 mb-6 transition-all";
        checkAllDone();
      } else {
        if (window.Insights) window.Insights.track('workbench_task', 1, { task: 'task1', pass: false });
        fb.className = "text-xs font-semibold text-rose-700 dark:text-rose-400";
        fb.textContent = `${ok} of 4 correct. Ensure Daniel matches Belteshazzar (Bel), Hananiah matches Shadrach, etc.`;
      }
    });

    // Bind Task 2
    container.querySelector('#wb1-check-t2').addEventListener('click', () => {
      const rows = container.querySelectorAll('#wb1-civic-matrix [data-civic-id]');
      let matrixOk = true;
      rows.forEach(r => {
        const exp = r.getAttribute('data-correct');
        const val = r.querySelector('.civic-select').value;
        if (val !== exp) matrixOk = false;
      });

      const term = (container.querySelector('#wb1-zeroim-input').value || '').trim().toLowerCase();
      const isTermOk = term === 'zeroim' || term === "zero'im" || term === 'zeroeem';
      const fb = container.querySelector('#wb1-t2-feedback');

      if (matrixOk && isTermOk) {
        markTaskComplete(1, 'task2');
        fb.className = "text-xs font-semibold text-emerald-700 dark:text-emerald-400";
        fb.textContent = "✓ Verified: Civic skill distinguished from defilement; zeroim (זֵרֹעִים) confirmed.";
        container.querySelector('#wb1-t2').className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 transition-all";
        checkAllDone();
      } else {
        if (window.Insights) window.Insights.track('workbench_task', 1, { task: 'task2', pass: false });
        fb.className = "text-xs font-semibold text-rose-700 dark:text-rose-400";
        if (!matrixOk) fb.textContent = "Check your classification: the learning and the tongue of the Chaldeans, and the skills and sciences of the Chaldeans, is civic skill; unclean food/wine is covenant defilement.";
        else fb.textContent = "The Hebrew term for pulse/vegetables is 'zeroim' (Dan 1:12).";
      }
    });

    function checkAllDone() {
      const done = isSheetComplete(1);
      const st = container.querySelector('#wb1-status');
      if (done) {
        st.className = "font-mono text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold";
        st.textContent = "✓ 2 of 2 Verified — Checkpoint Unlocked";
        if (typeof onComplete === 'function') onComplete();
      }
    }
  }

  // --- SHEET 2: Colossus Historical Succession & Metric Verification ---
  function renderSheet2Workbench(container, onComplete) {
    const t1Done = isTaskComplete(2, 'task1');
    const t2Done = isTaskComplete(2, 'task2');

    container.innerHTML = `
      <div class="workbench-card p-6 rounded-xl bg-transparent border border-amber-600/25 mb-8 font-sans">
        <div class="flex items-center justify-between border-b border-paper-300 dark:border-paper-800 pb-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded bg-amber-600 text-paper-50 font-mono text-xs font-bold uppercase tracking-wider">Active Proof Gate</span>
            <h3 class="font-serif text-xl font-bold text-ink-900 dark:text-paper-100">Colossus Succession & Metric Workbench</h3>
          </div>
          <span id="wb2-status" class="font-mono text-xs px-2.5 py-1 rounded ${t1Done && t2Done ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-paper-200 text-ink-700 dark:bg-paper-800 dark:text-paper-300'}">
            ${t1Done && t2Done ? '✓ 2 of 2 Verified' : (t1Done || t2Done ? '1 of 2 Verified' : '0 of 2 Verified')}
          </span>
        </div>
        <p class="text-xs text-ink-600 dark:text-paper-400 mb-6 leading-relaxed">
          Verify the contiguous metal succession of Daniel 2 and establish the definitive textual refutation against modern claims to restart the Head of Gold.
        </p>

        <!-- Task 1: Succession Chain Builder -->
        <div id="wb2-t1" class="task-box p-5 rounded-xl border ${t1Done ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} mb-6 transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <span>Task 1: The Contiguous Imperial Chain</span>
              ${t1Done ? '<span class="text-emerald-600 font-bold">✓ Verified</span>' : ''}
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">6 Stages in Strict Order</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-3">
            Assign the 6 stages of the colossus in strict contiguous descending sequence:
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 text-xs font-mono">
            ${[
              { stage: "Stage 1 (Head)", correct: "gold_babylon" },
              { stage: "Stage 2 (Chest & Arms)", correct: "silver_persia" },
              { stage: "Stage 3 (Belly & Thighs)", correct: "bronze_greece" },
              { stage: "Stage 4 (Legs)", correct: "iron_rome" },
              { stage: "Stage 5 (Feet & Toes)", correct: "iron_clay_europe" },
              { stage: "Stage 6 (Striking Climax)", correct: "stone_kingdom" }
            ].map(item => `
              <div class="p-2.5 rounded-lg bg-paper-100/60 dark:bg-paper-900/60 border border-paper-300 dark:border-paper-800" data-colossus-stage="${item.stage}" data-correct="${item.correct}">
                <div class="font-bold text-ink-800 dark:text-paper-200 mb-1 text-[11px]">${item.stage}</div>
                <select class="colossus-select w-full p-2 rounded border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs text-ink-800 dark:text-paper-200" aria-label="Select identification for ${item.stage}">
                  <option value="">Select identification...</option>
                  <option value="gold_babylon" ${t1Done && item.correct === 'gold_babylon' ? 'selected' : ''}>Gold: Babylon (605–539 B.C.)</option>
                  <option value="silver_persia" ${t1Done && item.correct === 'silver_persia' ? 'selected' : ''}>Silver: Medo-Persia (539–331 B.C.)</option>
                  <option value="bronze_greece" ${t1Done && item.correct === 'bronze_greece' ? 'selected' : ''}>Bronze: Greece (331–168 B.C.)</option>
                  <option value="iron_rome" ${t1Done && item.correct === 'iron_rome' ? 'selected' : ''}>Iron: Imperial Rome (168 B.C.–476 A.D.)</option>
                  <option value="iron_clay_europe" ${t1Done && item.correct === 'iron_clay_europe' ? 'selected' : ''}>Iron & Clay: Divided Europe (476 A.D.–Present)</option>
                  <option value="stone_kingdom" ${t1Done && item.correct === 'stone_kingdom' ? 'selected' : ''}>Stone: Supernatural Kingdom of God</option>
                </select>
              </div>
            `).join('')}
          </div>

          <div class="flex items-center justify-between">
            <button type="button" id="wb2-check-t1" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
              Verify Succession
            </button>
            <span id="wb2-t1-feedback" class="text-xs font-medium text-ink-600 dark:text-paper-400">
              ${t1Done ? '✓ Unbroken imperial succession confirmed.' : 'Set all 6 stages from Head to Stone.'}
            </span>
          </div>
        </div>

        <!-- Task 2: Daniel 2:38 Refutation Rule -->
        <div id="wb2-t2" class="task-box p-5 rounded-xl border ${t2Done ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-950'} transition-all">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-mono text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <span>Task 2: The Modern Colossus Refutation Rule</span>
              ${t2Done ? '<span class="text-emerald-600 font-bold">✓ Verified</span>' : ''}
            </h4>
            <span class="text-[11px] font-mono text-ink-500 dark:text-paper-500">Daniel 2:38 Textual Lock</span>
          </div>
          <p class="text-xs text-ink-700 dark:text-paper-300 mb-3 leading-relaxed">
            Which specific biblical verse anchors the Head of Gold to a single non-repeatable historical kingdom, and why does that refute modern claims that a 21st-century nation is a "new Head of Gold"?
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label for="wb2-verse-ref" class="block text-[11px] font-mono text-ink-600 dark:text-paper-400 mb-1">Load-Bearing Anchor Verse:</label>
              <select id="wb2-verse-ref" aria-label="Load-Bearing Anchor Verse" class="w-full p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-800 dark:text-paper-200">
                <option value="">Select verse...</option>
                <option value="dan2_38" ${t2Done ? 'selected' : ''}>Daniel 2:38 (“Thou art this head of gold”)</option>
                <option value="dan2_1">Daniel 2:1 (Nebuchadnezzar dreamed dreams)</option>
                <option value="dan4_30">Daniel 4:30 (Is not this great Babylon?)</option>
                <option value="rev17_5">Revelation 17:5 (Mystery Babylon the Great)</option>
              </select>
            </div>
            <div>
              <label for="wb2-principle" class="block text-[11px] font-mono text-ink-600 dark:text-paper-400 mb-1">Core Refutation Principle:</label>
              <select id="wb2-principle" aria-label="Core Refutation Principle" class="w-full p-2.5 rounded-lg border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-950 text-xs font-mono text-ink-800 dark:text-paper-200">
                <option value="">Select principle...</option>
                <option value="contiguous" ${t2Done ? 'selected' : ''}>Contiguous descent: metals never reset or cycle; we reside in the feet of iron/clay awaiting the stone</option>
                <option value="cyclical">History cycles every thousand years so each age gets a new gold head</option>
                <option value="allegorical">The metals are only spiritual attitudes with no chronological meaning</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <button type="button" id="wb2-check-t2" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 font-mono text-xs font-bold uppercase transition-colors">
              Verify Refutation Rule
            </button>
            <span id="wb2-t2-feedback" class="text-xs font-medium text-ink-600 dark:text-paper-400">
              ${t2Done ? '✓ Daniel 2:38 refutation rule verified.' : 'Select the anchor verse and contiguous succession principle.'}
            </span>
          </div>
        </div>
      </div>
    `;

    // Bind Task 1
    container.querySelector('#wb2-check-t1').addEventListener('click', () => {
      const rows = container.querySelectorAll('#wb2-t1 [data-colossus-stage]');
      let ok = 0;
      rows.forEach(r => {
        const exp = r.getAttribute('data-correct');
        const val = r.querySelector('.colossus-select').value;
        if (val === exp) ok++;
      });
      const fb = container.querySelector('#wb2-t1-feedback');
      if (ok === rows.length) {
        markTaskComplete(2, 'task1');
        fb.className = "text-xs font-semibold text-emerald-700 dark:text-emerald-400";
        fb.textContent = "✓ 6 of 6 Verified: Contiguous chronological succession confirmed.";
        container.querySelector('#wb2-t1').className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 mb-6 transition-all";
        checkAllDone();
      } else {
        if (window.Insights) window.Insights.track('workbench_task', 2, { task: 'task1', pass: false });
        fb.className = "text-xs font-semibold text-rose-700 dark:text-rose-400";
        fb.textContent = `${ok} of 6 correct. Order must strictly run Gold (Babylon) → Silver (Medo-Persia) → Bronze (Greece) → Iron (Rome) → Iron/Clay (Divided Europe) → Stone.`;
      }
    });

    // Bind Task 2
    container.querySelector('#wb2-check-t2').addEventListener('click', () => {
      const v = container.querySelector('#wb2-verse-ref').value;
      const p = container.querySelector('#wb2-principle').value;
      const fb = container.querySelector('#wb2-t2-feedback');

      if (v === 'dan2_38' && p === 'contiguous') {
        markTaskComplete(2, 'task2');
        fb.className = "text-xs font-semibold text-emerald-700 dark:text-emerald-400";
        fb.textContent = "✓ Refutation Rule Verified: Daniel 2:38 anchors the head to Babylon, forbidding restarts.";
        container.querySelector('#wb2-t2').className = "task-box p-5 rounded-xl border border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 transition-all";
        checkAllDone();
      } else {
        if (window.Insights) window.Insights.track('workbench_task', 2, { task: 'task2', pass: false });
        fb.className = "text-xs font-semibold text-rose-700 dark:text-rose-400";
        fb.textContent = "Select Daniel 2:38 and the contiguous descent principle.";
      }
    });

    function checkAllDone() {
      const done = isSheetComplete(2);
      const st = container.querySelector('#wb2-status');
      if (done) {
        st.className = "font-mono text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold";
        st.textContent = "✓ 2 of 2 Verified — Checkpoint Unlocked";
        if (typeof onComplete === 'function') onComplete();
      }
    }
  }

  window.WorkbenchSittings = Object.freeze({ renderSheet0Workbench, renderSheet1Workbench, renderSheet2Workbench });
})();
