import { escapeStudy } from '/js/pages/study/references.js';
import { renderSittingPath } from '/js/pages/study/sitting-map.js';
import { maybeShowEndGuide } from '/js/pages/study/sitting-guide.js';
import { currentSheetIndex, sheetLoadTicket, sheetQuizComplete, showToast, sittingVisited, updateNextGate } from '/js/pages/study/study-app.js';

    export let verifiedQuiz = {};
    export let quizPending = {};
    export let quizAttemptCounts = {};
    export let celebrateTimer = 0;
    export let answeredQuestions = {};

    export const QUIZ_COPY_DEFAULT = {
      kicker: 'Questions',
      title: 'A few questions to close the sitting',
      lead: 'One at a time. Nothing is timed, and if you miss one you will see why and can try again.',
      badgeTail: ' to finish'
    };

    export function checkpointCountFor(total) {
      if (total < 2) return 0;
      const finals = total >= 5 ? 2 : 1;
      return Math.min(3, total - finals);
    }

    export function spreadIndexes(slotCount, take) {
      const picked = [];
      if (slotCount <= 0 || take <= 0) return picked;
      const n = Math.min(take, slotCount);
      let prev = -1;
      for (let k = 1; k <= n; k += 1) {
        let idx = Math.round((k * (slotCount + 1)) / (n + 1)) - 1;
        if (idx < 0) idx = 0;
        if (idx > slotCount - 1) idx = slotCount - 1;
        if (idx <= prev) idx = prev + 1;
        picked.push(idx);
        prev = idx;
      }
      return picked;
    }

    export function checkpointAnchors(headers, take) {
      let slots = headers.slice(1);
      const intro = headers[0] && /introduction/i.test(headers[0].textContent || '');
      if (intro && slots.length - 1 >= take) slots = slots.slice(1);
      return spreadIndexes(slots.length, take).map((i) => slots[i]);
    }

    export function setQuizCopy(copy, count) {
      const kicker = document.getElementById('quiz-kicker');
      const title = document.getElementById('quiz-title');
      const lead = document.getElementById('quiz-lead');
      const badge = document.getElementById('quiz-badge');
      if (kicker) kicker.textContent = copy.kicker;
      if (title) title.textContent = copy.title;
      if (lead) lead.textContent = copy.lead;
      if (badge) {
        badge.textContent = count + ' Question' + (count === 1 ? '' : 's') + copy.badgeTail;
      }
    }

    export function makeCheckpointPlate(index, total, qIdx) {
      const plate = document.createElement('section');
      plate.className = 'checkpoint-plate';
      plate.setAttribute('aria-label', 'Checkpoint ' + index + ' of ' + total);
      plate.setAttribute('data-checkpoint', String(index));
      plate.setAttribute('data-checkpoint-total', String(total));
      plate.setAttribute('data-checkpoint-q', String(qIdx));
      const kicker = document.createElement('p');
      kicker.className = 'checkpoint-kicker';
      kicker.textContent = 'Checkpoint ' + index + ' of ' + total;
      const title = document.createElement('h3');
      title.textContent = 'A question from these pages';
      const lead = document.createElement('p');
      lead.className = 'checkpoint-lead';
      lead.textContent = 'Answer it on its own when you are ready. Nothing is timed.';
      const slot = document.createElement('div');
      slot.className = 'checkpoint-slot';
      const start = document.createElement('button');
      start.type = 'button';
      start.className = 'checkpoint-start';
      start.textContent = 'Answer this question';
      start.addEventListener('click', () => {
        const flow = window.StudyTaskFlow;
        if (flow && typeof flow.open === 'function') flow.open();
      });
      plate.appendChild(kicker);
      plate.appendChild(title);
      plate.appendChild(lead);
      plate.appendChild(start);
      plate.appendChild(slot);
      return plate;
    }

    export function placeCheckpointPlates(quizzes) {
      const list = Array.isArray(quizzes) ? quizzes : [];
      setQuizCopy(QUIZ_COPY_DEFAULT, list.length);
      const article = document.getElementById('sheet-article');
      if (!article || article.querySelector('.checkpoint-plate')) return;
      const gates = checkpointCountFor(list.length);
      const headers = Array.prototype.slice.call(article.querySelectorAll('.part-header'));
      if (!gates || headers.length < 2) return;
      const anchors = checkpointAnchors(headers, gates);
      let placed = 0;
      anchors.forEach((anchor) => {
        const card = document.getElementById('q-card-' + placed);
        if (!card || !anchor || !anchor.parentNode) return;
        const plate = makeCheckpointPlate(placed + 1, anchors.length, placed);
        plate.querySelector('.checkpoint-slot').appendChild(card);
        anchor.parentNode.insertBefore(plate, anchor);
        placed += 1;
      });
      if (!placed) return;
      const finals = list.length - placed;
      const word = placed === 1 ? 'checkpoint is' : 'checkpoints are';
      setQuizCopy({
        kicker: 'Final questions',
        title: 'Close the sitting',
        lead: placed + ' ' + word + ' in the lesson. These last ones finish it, one at a time, with no timer.',
        badgeTail: ' to finish'
      }, finals);
    }

    export function markCheckpoint(qIdx, flag) {
      const plate = document.querySelector('[data-checkpoint-q="' + qIdx + '"]');
      if (!plate) return;
      if (flag) plate.setAttribute('data-checkpoint-passed', flag);
      else plate.removeAttribute('data-checkpoint-passed');
      plate.classList.remove('is-held');
      document.dispatchEvent(new CustomEvent('checkpoint:passed'));
    }

    export function revealUnfinished() {
      const plate = document.querySelector('.checkpoint-plate:not([data-checkpoint-passed])');
      const book = window.BookReader;
      const article = document.getElementById('sheet-article');
      if (plate && book && book.isActive() && book.reveal(plate, { instant: true })) {
        if (article) article.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const rev = document.getElementById('revision-section') || document.getElementById('workbench-section');
      if (rev) rev.scrollIntoView({ behavior: 'smooth' });
    }

    export function renderQuiz(quizzes) {
      const container = document.getElementById('quiz-container');
      container.innerHTML = '';
      answeredQuestions = {};
      quizAttemptCounts = {};
      verifiedQuiz = {};
      quizPending = {};
      const badge = document.getElementById('quiz-badge');
      if (badge) {
        const n = (quizzes && quizzes.length) || 0;
        badge.textContent = n + ' Question' + (n === 1 ? '' : 's') + ' to finish';
      }

      quizzes.forEach((q, qIdx) => {
        const qBox = document.createElement('div');
        qBox.className = "p-5 sm:p-6 rounded-xl bg-transparent border border-paper-300/60 dark:border-paper-800/60 transition-all";
        qBox.id = `q-card-${qIdx}`;

        const qTitle = document.createElement('h4');
        qTitle.className = "font-serif text-base sm:text-lg font-bold text-ink-900 dark:text-paper-100 mb-4 leading-snug";
        qTitle.innerHTML = `<span class="font-mono text-xs px-2 py-0.5 rounded bg-paper-200 dark:bg-paper-900 mr-2 text-ink-600 dark:text-paper-400 font-semibold">Q${qIdx + 1}</span> ${q.question}`;
        qBox.appendChild(qTitle);

        const optionsGrid = document.createElement('div');
        optionsGrid.className = "space-y-2.5";

        q.options.forEach((optText, optIdx) => {
          const btn = document.createElement('button');
          btn.className = "quiz-option w-full p-3.5 sm:p-4 rounded-lg border border-paper-300 dark:border-paper-800 hover:border-ink-900 dark:hover:border-paper-200 bg-paper-100/50 dark:bg-paper-900/40 text-left text-xs sm:text-sm text-ink-800 dark:text-paper-200 flex items-start space-x-3";
          btn.id = `q-${qIdx}-opt-${optIdx}`;
          btn.innerHTML = `
            <span class="font-mono font-bold text-xs text-ink-500 dark:text-paper-500 mt-0.5 shrink-0">${String.fromCharCode(65 + optIdx)}.</span>
            <span class="flex-1">${optText}</span>
          `;
          btn.addEventListener('click', () => handleQuizAnswer(qIdx, optIdx, q));
          optionsGrid.appendChild(btn);
        });

        qBox.appendChild(optionsGrid);

        const fb = document.createElement('div');
        fb.id = `q-${qIdx}-feedback`;
        fb.className = "hidden mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border";
        qBox.appendChild(fb);

        container.appendChild(qBox);
      });
    }

    export function paintQuizOutcome(qIdx, selectedOptIdx, correctIdx, isCorrect, questionData, note) {
      const feedback = document.getElementById(`q-${qIdx}-feedback`);

      questionData.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        btn.disabled = true;
        if (optIdx === correctIdx) {
          btn.classList.remove('bg-paper-100/50', 'dark:bg-paper-900/40', 'border-paper-300', 'dark:border-paper-800');
          btn.classList.add('bg-emerald-50', 'dark:bg-emerald-950/40', 'border-emerald-600', 'text-emerald-950', 'dark:text-emerald-200', 'font-medium');
        } else if (optIdx === selectedOptIdx && !isCorrect) {
          btn.classList.remove('bg-paper-100/50', 'dark:bg-paper-900/40', 'border-paper-300', 'dark:border-paper-800');
          btn.classList.add('bg-rose-50', 'dark:bg-rose-950/40', 'border-rose-500', 'text-rose-900', 'dark:text-rose-200');
        } else {
          btn.classList.add('opacity-40');
        }
      });

      feedback.classList.remove('hidden');
      const diagMsg = (!isCorrect && questionData.diagnostics && questionData.diagnostics[selectedOptIdx])
        ? `<div class="mt-2.5 pt-2 border-t border-current/20 font-mono text-xs"><strong>Diagnostic Analysis:</strong> ${questionData.diagnostics[selectedOptIdx]}</div>`
        : '';

      if (isCorrect) {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200";
        feedback.innerHTML = `<strong>✓ Historicist Exegesis:</strong> ${questionData.explanation}${note ? `<div class="mt-2.5 pt-2 border-t border-current/20 font-mono text-xs">${escapeStudy(note)}</div>` : ''}${diagMsg}`;
        showToast("Correct! Understanding verified.");
      } else {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200";
        feedback.innerHTML = `
          <div><strong>Key Doctrine:</strong> ${questionData.explanation}</div>
          ${diagMsg}
          <div class="mt-3">
            <button type="button" class="px-3 py-1 rounded bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-colors" data-quiz-retry>Try Again</button>
          </div>
        `;
        const retry = feedback.querySelector('[data-quiz-retry]');
        if (retry) retry.addEventListener('click', () => resetQuizQuestion(qIdx));
        showToast("Review the historicist explanation and try again.");
      }
    }

    export function handleQuizAnswer(qIdx, selectedOptIdx, questionData) {
      if (verifiedQuiz[qIdx] !== undefined || quizPending[qIdx]) return;
      answeredQuestions[qIdx] = selectedOptIdx;
      const attempt = (quizAttemptCounts[qIdx] = (quizAttemptCounts[qIdx] || 0) + 1);
      const feedback = document.getElementById(`q-${qIdx}-feedback`);

      quizPending[qIdx] = true;
      questionData.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        if (btn) {
          btn.disabled = true;
          btn.style.borderColor = '';
        }
      });
      if (feedback) {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-900/40 text-ink-700 dark:text-paper-300";
        feedback.classList.remove('hidden');
        feedback.innerHTML = '<em>Verifying against the record…</em>';
      }

      const gate = window.QuizGate && typeof window.QuizGate.verify === 'function' ? window.QuizGate : null;
      const askedSheet = currentSheetIndex;
      const askedTicket = sheetLoadTicket;
      const askedAnswers = verifiedQuiz;
      const call = gate
        ? gate.verify(askedSheet, qIdx, selectedOptIdx)
        : Promise.resolve({ ok: false, error: 'not_authenticated' });

      call.then(function (res) {
        const isStale = askedTicket !== sheetLoadTicket || askedSheet !== currentSheetIndex || askedAnswers !== verifiedQuiz;
        if (isStale) return;
        quizPending[qIdx] = false;
        if (!res || !res.ok) {
          const cause = (res && res.error) || 'error';
          questionData.options.forEach((_, optIdx) => {
            const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
            if (btn) btn.disabled = false;
          });
          /* Keep the reader's pick visible while they recover from an
             environment problem (signed-out, offline, pacing) — re-tapping
             re-verifies without losing their place. */
          const keepPick = cause === 'not_authenticated' || cause === 'offline' ||
            cause === 'rate_limit' || cause === 'timeout' || cause === 'forbidden';
          if (keepPick) {
            const picked = document.getElementById(`q-${qIdx}-opt-${selectedOptIdx}`);
            if (picked) picked.style.borderColor = 'rgba(180, 140, 60, 0.9)';
          }
          const feedbackPanel = function (tone, html) {
            if (!feedback) return;
            feedback.className = tone === 'amber'
              ? "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 text-ink-800 dark:text-paper-200"
              : "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-900/40 text-ink-700 dark:text-paper-300";
            feedback.classList.remove('hidden');
            feedback.innerHTML = html;
          };
          if (cause === 'not_authenticated') {
            const accountHref = 'account.html?next=' + encodeURIComponent(location.pathname + location.search);
            feedbackPanel('amber', `<strong>Answer checking is available to signed-in members.</strong> Sign in to check your answers, save your progress, and work toward your certificate — your pick stays marked on this page. <a href="${accountHref}" class="font-semibold underline text-amber-800 dark:text-amber-300">Go to Account</a>`);
            markCheckpoint(qIdx, 'auth');
            updateNextGate();
            return;
          }
          if (cause === 'offline') {
            feedbackPanel('amber', '<strong>You are offline.</strong> The record can\u2019t verify answers without a connection. Your pick is kept \u2014 tap your answer again once you are back online.');
            updateNextGate();
            return;
          }
          if (cause === 'rate_limit') {
            feedbackPanel('plain', 'The record is being asked a little too quickly. Wait a few seconds, then tap your answer again.');
            updateNextGate();
            return;
          }
          if (cause === 'forbidden') {
            feedbackPanel('amber', '<strong>Answer checking is not available on this membership.</strong> You can keep reading \u2014 your progress is saved on this device. <a href="account.html" class="font-semibold underline text-amber-800 dark:text-amber-300">Review membership</a>');
            updateNextGate();
            return;
          }
          if (cause === 'timeout') {
            feedbackPanel('plain', 'The record took too long to answer. Check your connection, then tap your answer again.');
            updateNextGate();
            return;
          }
          const unchecked = cause === 'not_found' || cause === 'bad_input' || cause === 'bad_response';
          if (feedback) {
            feedbackPanel('plain', unchecked
              ? 'This question could not be checked right now. Your pick was not marked right or wrong; please try again later.'
              : 'The record could not verify that answer. Your pick was not marked right or wrong; check your connection and try again.');
          }
          delete answeredQuestions[qIdx];
          if (window.SiteOps && typeof window.SiteOps.report === 'function') {
            window.SiteOps.report('quiz_verify_failed', cause, { q: qIdx, cause: cause });
          }
          showToast(unchecked
            ? 'This question could not be checked right now.'
            : 'The record could not verify that answer. Check your connection and try again.');
          updateNextGate();
          return;
        }

        const isCorrect = !!res.correct;
        const correctIdx = typeof res.correctIdx === 'number' ? res.correctIdx : (isCorrect ? selectedOptIdx : -1);
        verifiedQuiz[qIdx] = isCorrect;
        if (isCorrect) markCheckpoint(qIdx, 'true');

        if (window.StudyCompetency) {
          window.StudyCompetency.recordQuizAttempt(currentSheetIndex, qIdx, isCorrect);
        }
        if (window.Insights) {
          window.Insights.track('quiz_answer', currentSheetIndex, {
            q: qIdx,
            chosen: selectedOptIdx,
            choice: selectedOptIdx,
            correct: isCorrect,
            attempt: attempt
          });
        }

        paintQuizOutcome(qIdx, selectedOptIdx, correctIdx, isCorrect, questionData, res.note);
        document.dispatchEvent(new CustomEvent('quiz:changed', { detail: { q: qIdx, correct: isCorrect } }));
        updateNextGate();
        if (sheetQuizComplete()) {
          sittingVisited.tasks = true;
          renderSittingPath();
        }
        maybeShowEndGuide();
      });
    }

    export function resetQuizQuestion(qIdx) {
      delete answeredQuestions[qIdx];
      delete verifiedQuiz[qIdx];
      const data = sheetsData[currentSheetIndex];
      const q = data.quizzes[qIdx];
      q.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        if (btn) {
          btn.disabled = false;
          btn.style.borderColor = '';
          btn.className = "quiz-option w-full p-3.5 sm:p-4 rounded-lg border border-paper-300 dark:border-paper-800 hover:border-ink-900 dark:hover:border-paper-200 bg-paper-100/50 dark:bg-paper-900/40 text-left text-xs sm:text-sm text-ink-800 dark:text-paper-200 flex items-start space-x-3";
        }
      });
      const feedback = document.getElementById(`q-${qIdx}-feedback`);
      if (feedback) feedback.classList.add('hidden');
      markCheckpoint(qIdx, '');
      updateNextGate();
      document.dispatchEvent(new CustomEvent('quiz:changed', { detail: { q: qIdx, reset: true } }));
    }

    export function celebrationFor(sheet) {
      if (sheet === 0) {
        return {
          title: 'The first sitting is yours.',
          body: 'A quiet, good beginning. Continue in the same care.'
        };
      }
      if (sheet === 5) {
        return {
          title: 'Halfway through the scroll.',
          body: 'Keep going. The later visions will reward the same patience.'
        };
      }
      if (sheet === 10) {
        return {
          title: 'Well done.',
          body: 'You have finished the eleven sittings of Daniel.'
        };
      }
      return null;
    }

    export function burstConfetti() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const old = document.getElementById('sitting-confetti');
      if (old) old.remove();
      const canvas = document.createElement('canvas');
      canvas.id = 'sitting-confetti';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;z-index:240;pointer-events:none;width:100%;height:100%;';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        canvas.remove();
        return;
      }
      ctx.scale(dpr, dpr);
      const colors = ['#c9a227', '#e8d5a3', '#8b1e1e', '#f4efe3', '#5c4033', '#d4af37', '#b8860b'];
      const cannons = [
        { x: W * 0.18, y: H * 0.28, dir: 1 },
        { x: W * 0.82, y: H * 0.28, dir: -1 }
      ];
      const bits = [];
      for (let i = 0; i < 148; i++) {
        const origin = cannons[i % 2];
        const angle = (-92 + origin.dir * (16 + Math.random() * 54)) * Math.PI / 180;
        const speed = 6.5 + Math.random() * 10;
        bits.push({
          x: origin.x,
          y: origin.y,
          w: 4 + Math.random() * 7,
          h: 8 + Math.random() * 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * Math.PI,
          vr: -0.24 + Math.random() * 0.48,
          color: colors[i % colors.length],
          kind: i % 5 === 0 ? 'circle' : 'rect',
          wobble: 0.35 + Math.random() * 0.85
        });
      }
      const started = performance.now();
      function frame(now) {
        const t = (now - started) / 1000;
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < bits.length; i++) {
          const p = bits[i];
          p.vy += 0.17;
          p.vx *= 0.991;
          p.x += p.vx + Math.sin(t * 9 + i) * p.wobble;
          p.y += p.vy;
          p.r += p.vr;
          const fade = t > 2.5 ? Math.max(0, 1 - (t - 2.5) / 1.0) : 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          if (p.kind === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.w * 0.48, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          ctx.restore();
        }
        if (t < 3.5) requestAnimationFrame(frame);
        else canvas.remove();
      }
      requestAnimationFrame(frame);
    }

    export function showSittingCelebration(sheet) {
      const spec = celebrationFor(sheet);
      if (!spec) return;
      burstConfetti();
      const prev = document.getElementById('sitting-celebrate');
      if (prev) prev.remove();
      if (celebrateTimer) window.clearTimeout(celebrateTimer);
      const label = window.BAJourney && typeof window.BAJourney.sheetLabel === 'function'
        ? window.BAJourney.sheetLabel(sheet)
        : ('Sitting ' + sheet);
      const card = document.createElement('div');
      card.id = 'sitting-celebrate';
      card.setAttribute('role', 'status');
      card.innerHTML =
        '<small>' + label + '</small>' +
        '<h3></h3>' +
        '<p></p>' +
        '<button type="button">Continue</button>';
      card.querySelector('h3').textContent = spec.title;
      card.querySelector('p').textContent = spec.body;
      document.body.appendChild(card);
      function close() {
        if (card.parentNode) card.remove();
      }
      card.querySelector('button').addEventListener('click', close);
      celebrateTimer = window.setTimeout(close, 5600);
    }

    export function sittingLabel(index) {
      return window.BAJourney && typeof window.BAJourney.sheetLabel === 'function'
        ? window.BAJourney.sheetLabel(index)
        : 'Sitting ' + index;
    }
