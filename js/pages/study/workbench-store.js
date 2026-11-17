(function () {
  'use strict';

  const STORAGE_KEY = 'daniel_workbench_v1';

  const CAPSTONE_KEY = 'daniel_capstone_mastery_v1';

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveState(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function markTaskComplete(sheetId, taskId) {
    const s = loadState();
    if (!s[sheetId]) s[sheetId] = {};
    s[sheetId][taskId] = true;
    saveState(s);
    if (window.StudyCompetency) {
      window.StudyCompetency.recordWorkbenchSuccess(sheetId, taskId);
    }
    if (window.ProgressSync && typeof window.ProgressSync.syncNow === 'function') {
      window.ProgressSync.syncNow();
    }
    if (window.Insights) window.Insights.track('workbench_task', sheetId, { task: taskId, pass: true });
  }

  function isTaskComplete(sheetId, taskId) {
    const s = loadState();
    return !!(s[sheetId] && s[sheetId][taskId]);
  }

  function isSheetComplete(sheetId) {
    const s = loadState();
    if (sheetId === 0) return !!(s[0] && s[0].task1 && s[0].task2);
    if (sheetId === 1) return !!(s[1] && s[1].task1 && s[1].task2);
    if (sheetId === 2) return !!(s[2] && s[2].task1 && s[2].task2);
    if (sheetId >= 3 && sheetId <= 10) return !!(s[sheetId] && s[sheetId].task1);
    return false;
  }

  // --- SITTINGS 3–10: Generic Active Proof Tasks ---
  const SITTING_TASKS = {
    3: {
      type: 'typed',
      title: 'Daniel 3: Confession and the Furnace',
      passage: 'Daniel 2:47 & Daniel 3:15',
      question: "In one sentence, what changed between the king’s confession in Daniel 2:47 and “who is that God?” in Daniel 3:15?",
      lines: [
        { id: 's3', prompt: 'Your sentence', placeholder: 'He confessed the God of gods in 2:47, then demanded worship of the image in 3:15…', mustInclude: ['2:47', '3:15', 'confession', 'worship', 'image', 'god'], minHits: 2 }
      ],
      failText: 'Name the shift: 2:47 confession versus 3:15 forced worship.',
      successText: '✓ Shift named: praise of the Revealer in 2:47 became a demand to worship the image in 3:15.'
    },
    4: {
      type: 'select',
      title: 'Daniel 4: The Sovereign Stump & Seven Times Metric',
      passage: 'Daniel 4:17, 25–26',
      question: "What theological reality is guaranteed by the iron and bronze band around the stump of the great tree?",
      options: [
        { id: 'opt0', text: 'The Babylonian monarchy was completely dissolved without any future hope' },
        { id: 'opt1', text: 'Nebuchadnezzar would be permanently replaced by Darius the Mede' },
        { id: 'opt2', text: 'The kingdom is assured after he learns that the heavens do rule and the Most High governs humanity' },
        { id: 'opt3', text: 'An earthly metallic temple would be erected over the roots of the stump' }
      ],
      correct: 'opt2',
      successText: '✓ Sovereign Rule Verified: Daniel 4:26 anchors that the heavens rule over all earthly authority.'
    },
    5: {
      type: 'match',
      title: 'Daniel 5: The Mene-Tekel Historical Decryption',
      passage: 'Daniel 5:25–28',
      question: "Match each prophetic word from the handwriting on the wall to Daniel's inspired decipherment on the night of Babylon’s fall:",
      items: [
        { id: 'm0', text: 'MENE', correct: 'numbered' },
        { id: 'm1', text: 'TEKEL', correct: 'weighed' },
        { id: 'm2', text: 'PERES', correct: 'divided' }
      ],
      options: [
        { value: '', label: 'Select meaning...' },
        { value: 'numbered', label: 'Numbered and finished (MENE)' },
        { value: 'weighed', label: 'Weighed in balances and wanting (TEKEL)' },
        { value: 'divided', label: 'Divided and given to Medes & Persians (PERES)' }
      ],
      successText: '✓ Inscription Verified: Daniel 5:25–28 accurately decoded on the night of Babylon’s fall.'
    },
    6: {
      type: 'select',
      title: 'Daniel 6: Medo-Persian Law vs Divine Sovereignty',
      passage: 'Daniel 6:8–10, 20–22',
      question: "How does Daniel’s steadfast prayer posture expose the limit of Medo-Persian statutory law?",
      options: [
        { id: 'opt0', text: 'Daniel ceased praying for thirty days to comply with Persian civil order' },
        { id: 'opt1', text: 'The irreversible decree of men yielded to the living God who sent His angel to shut the lions’ mouths' },
        { id: 'opt2', text: 'King Darius repealed the decree before the sun went down' },
        { id: 'opt3', text: 'Daniel argued his civil rights before the supreme satrapy court' }
      ],
      correct: 'opt1',
      successText: '✓ Sovereign Deliverance Verified: God’s authority supersedes unalterable imperial edicts.'
    },
    7: {
      type: 'calc',
      title: 'Daniel 7: The 1,260-Year Historicist Calculation',
      passage: 'Daniel 7:25 & Revelation 12:6, 14',
      question: "Calculate the prophetic epoch of the Little Horn’s supremacy (time, times, and half a time = 1,260 prophetic days/years) starting from A.D. 538 (breaking of the Ostrogothic siege of Rome):",
      startYear: 538,
      duration: 1260,
      targetYear: 1798,
      successText: '✓ 1,260-Year Metric Verified: 538 A.D. + 1,260 years = 1798 A.D. (Berthier enters Rome).'
    },
    8: {
      type: 'select',
      title: 'Daniel 8: The 2,300 Days & Sanctuary Cleansing',
      passage: 'Daniel 8:14',
      question: "In Daniel 8:14, what Hebrew term describes the restoration/vindication of the sanctuary at the close of 2,300 prophetic days?",
      options: [
        { id: 'opt0', text: 'Chathak (cut off / apportioned)' },
        { id: 'opt1', text: 'Tamid (the continual / daily)' },
        { id: 'opt2', text: 'Nitsdaq (justified / cleansed / vindicated)' },
        { id: 'opt3', text: 'Zeroim (vegetables / seeds)' }
      ],
      correct: 'opt2',
      successText: '✓ Linguistic Anchor Verified: Nitsdaq (Daniel 8:14) denotes the justification and cleansing of the sanctuary.'
    },
    9: {
      type: 'match',
      title: 'Daniel 9: The Arithmetic of the Weeks',
      passage: 'Daniel 9:24–27 & Daniel 8:14',
      question: "Match each sum to its landing on the timeline.",
      items: [
        { id: 'a27', text: '457 B.C. + 483 years (69 weeks)', correct: 'ad27' },
        { id: 'a1844', text: '2,300 years − 490 years (70 weeks cut off)', correct: 'y1844' }
      ],
      options: [
        { value: '', label: 'Select landing...' },
        { value: 'ad27', label: 'A.D. 27 — Messiah the Prince' },
        { value: 'y1844', label: '1844 — sanctuary cleansing' },
        { value: 'ad70', label: 'A.D. 70 — temple burned' }
      ],
      failText: 'Match 457 + 483 → A.D. 27 and 2,300 − 490 → 1844.',
      successText: '✓ Layers checked: 457 + 483 lands at A.D. 27; 2,300 − 490 lands at 1844.'
    },
    10: {
      type: 'typed',
      title: 'Daniel 10–12: Write the chain in three lines',
      passage: 'Daniel 2:38; 9:26; 8:14',
      question: "Write the chain in three lines: 2:38 → 9:26 → 8:14. Each line must name the verse or its load-bearing phrase.",
      lines: [
        { id: 'c1', prompt: 'Line 1 — Daniel 2:38', placeholder: 'The head of gold…', mustInclude: ['2:38', 'head of gold', 'gold'], minHits: 1 },
        { id: 'c2', prompt: 'Line 2 — Daniel 9:26', placeholder: 'Messiah cut off…', mustInclude: ['9:26', 'cut off', 'messiah'], minHits: 1 },
        { id: 'c3', prompt: 'Line 3 — Daniel 8:14', placeholder: 'The sanctuary…', mustInclude: ['8:14', 'sanctuary', '2300', '2,300'], minHits: 1 }
      ],
      failText: 'Each line must hit 2:38 / head of gold, 9:26 / cut off, or 8:14 / sanctuary.',
      successText: '✓ Three-line chain written: 2:38 → 9:26 → 8:14.'
    }
  };

  function saveCapstoneMastery(evaluation) {
    try {
      localStorage.setItem(CAPSTONE_KEY, JSON.stringify(evaluation));
    } catch (e) {}
    if (window.StudyCompetency) {
      window.StudyCompetency.recordCapstone(evaluation.score, evaluation);
    }
  }

  window.WorkbenchStore = Object.freeze({ STORAGE_KEY, CAPSTONE_KEY, loadState, saveState, markTaskComplete, isTaskComplete, isSheetComplete, SITTING_TASKS, saveCapstoneMastery });
})();
