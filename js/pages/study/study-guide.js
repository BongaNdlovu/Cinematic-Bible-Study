import { escapeStudy } from '/js/pages/study/references.js';

    // The study-path card carries one thing only: the questions to sit with.
    // The trace / christ / now / help / value blocks were removed by request;
    // their helpers above remain unused rather than deleted, so nothing else
    // that referenced them can break.
    export function renderStudyGuide(guide) {
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

    export function renderFacilitatorStrip(fac) {
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
