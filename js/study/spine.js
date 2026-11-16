import { sittingEmpireOverride, sittingYearOverride } from '/js/study/sitting-map.js';
import { STUDY_EPOCH_TO_YEAR, sheetToTimelineMap } from '/js/study/study-app.js';

    export function journeyState() {
      return window.BAJourney ? window.BAJourney.load() : { unlocked: [], station: {}, pathSheet: -1, sheet: 0, year: 'y605' };
    }

    export function spineEmpireForSheet(index, unlocked) {
      if (index <= 4) return 'gold';
      if (index <= 6) return 'silver';
      if (index === 7) return 'iron';
      if (index === 8) return 'bronze';
      if (index === 9) return 'silver';
      return 'stone';
    }

    export const SHEET_COMPETENCIES = [
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

    export function updateSpine(index, yearId, empireId) {
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
