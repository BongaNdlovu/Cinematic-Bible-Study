(function () {
  'use strict';

  const KEYS = 'abcdefgh';
  const LEAVE_MS = 460;
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  let root = null;
  let stage = null;
  let fill = null;
  let counter = null;
  let backBtn = null;
  let nextBtn = null;
  let keysHint = null;
  let foot = null;
  let steps = [];
  let at = 0;
  let screen = 'closed';
  let returnFocus = null;
  let launcher = null;
  let launchStatus = null;
  let launchBtn = null;
  const homes = new Map();

  function host() {
    return window.StudyTasks && typeof window.StudyTasks.snapshot === 'function' ? window.StudyTasks : null;
  }

  function snap() {
    const h = host();
    return h ? h.snapshot() : null;
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function still() {
    return !!(reduce && reduce.matches);
  }

  function take(node) {
    if (!node || !node.parentNode) return node;
    if (!homes.has(node)) {
      const mark = document.createComment('task-flow-home');
      node.parentNode.insertBefore(mark, node);
      homes.set(node, mark);
    }
    return node;
  }

  function restoreAll() {
    homes.forEach((mark, node) => {
      if (mark.parentNode) {
        mark.parentNode.insertBefore(node, mark);
        mark.parentNode.removeChild(mark);
      }
    });
    homes.clear();
  }

  function build() {
    root = el('div', 'tf-root');
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'tf-heading');
    root.innerHTML =
      '<div class="tf-veil" aria-hidden="true"></div>' +
      '<div class="tf-shell">' +
        '<div class="tf-top">' +
          '<div class="tf-progress" aria-hidden="true"><span class="tf-progress-fill"></span></div>' +
          '<p class="tf-counter" aria-live="polite"></p>' +
          '<button type="button" class="tf-close" data-tf="close" aria-label="Save and close">' +
            '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="tf-stage"></div>' +
        '<div class="tf-foot">' +
          '<button type="button" class="tf-back" data-tf="back">Back</button>' +
          '<p class="tf-keys"></p>' +
          '<button type="button" class="tf-next" data-tf="next">Next</button>' +
        '</div>' +
      '</div>';
    stage = root.querySelector('.tf-stage');
    fill = root.querySelector('.tf-progress-fill');
    counter = root.querySelector('.tf-counter');
    backBtn = root.querySelector('.tf-back');
    nextBtn = root.querySelector('.tf-next');
    keysHint = root.querySelector('.tf-keys');
    foot = root.querySelector('.tf-foot');
    root.addEventListener('click', onClick);
    document.body.appendChild(root);
  }

  function planSteps(s) {
    const list = [];
    s.questions.forEach((q) => {
      if (!q.done && q.card) list.push({ kind: 'question', q: q.index, node: q.card, inLesson: q.inLesson });
    });
    if (s.workbench && !s.workbench.done) list.push({ kind: 'workbench', node: s.workbench.node });
    return list;
  }

  function stepDone(step, s) {
    if (!step || !s) return false;
    if (step.kind === 'workbench') return !!(s.workbench && s.workbench.done);
    const q = s.questions[step.q];
    return !!(q && q.done);
  }

  function setProgress(s) {
    const total = steps.length;
    const done = steps.filter((st) => stepDone(st, s)).length;
    fill.style.width = (total ? Math.round((done / total) * 100) : 100) + '%';
  }

  function swap(render) {
    const paint = () => {
      stage.innerHTML = '';
      render();
      stage.classList.remove('is-leaving');
      stage.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('is-entering')));
    };
    if (still() || !stage.firstChild) {
      paint();
      return;
    }
    stage.classList.add('is-leaving');
    setTimeout(paint, 180);
  }

  function focusFirst(selector) {
    const target = root.querySelector(selector);
    if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  }

  function showIntro(s) {
    screen = 'intro';
    root.classList.add('is-intro');
    foot.hidden = true;
    counter.textContent = '';
    fill.style.width = '0%';
    const qCount = steps.filter((st) => st.kind === 'question').length;
    const hasTask = steps.some((st) => st.kind === 'workbench');
    const already = s.questions.filter((q) => q.done).length;
    swap(() => {
      const card = el('section', 'tf-intro');
      card.appendChild(el('p', 'tf-kicker', s.label + ' · Questions'));
      const h = el('h2', 'tf-title', 'Ready to close this sitting?');
      h.id = 'tf-heading';
      card.appendChild(h);
      card.appendChild(el('p', 'tf-lead', 'You will answer one at a time. Nothing is timed, and if you miss one you will see why and can try again.'));
      const list = el('ul', 'tf-plan');
      if (qCount) list.appendChild(planItem(plural(qCount, 'question', 'questions'), 'Pick an answer. Your reasoning is checked straight away.'));
      if (hasTask) list.appendChild(planItem('1 proof task', 'A short hands-on task from this sitting.'));
      if (already) list.appendChild(planItem(plural(already, 'already answered', 'already answered'), 'Checkpoints you passed in the lesson count.', true));
      card.appendChild(list);
      const actions = el('div', 'tf-actions');
      const start = el('button', 'tf-primary', 'Start');
      start.type = 'button';
      start.setAttribute('data-tf', 'start');
      const later = el('button', 'tf-ghost', 'Not now');
      later.type = 'button';
      later.setAttribute('data-tf', 'close');
      actions.appendChild(start);
      actions.appendChild(later);
      card.appendChild(actions);
      card.appendChild(el('p', 'tf-hint', 'Press Enter to start'));
      stage.appendChild(card);
      focusFirst('[data-tf="start"]');
    });
  }

  function planItem(title, body, done) {
    const li = el('li', done ? 'is-done' : '');
    const mark = el('span', 'tf-plan-mark');
    mark.setAttribute('aria-hidden', 'true');
    li.appendChild(mark);
    const copy = el('span', 'tf-plan-copy');
    copy.appendChild(el('strong', '', title));
    copy.appendChild(el('span', '', body));
    li.appendChild(copy);
    return li;
  }

  function showStep(index) {
    const s = snap();
    if (!s) return;
    at = Math.max(0, Math.min(index, steps.length - 1));
    screen = 'step';
    root.classList.remove('is-intro', 'is-done');
    foot.hidden = false;
    const step = steps[at];
    const qSteps = steps.filter((st) => st.kind === 'question');
    counter.textContent = step.kind === 'workbench'
      ? 'Proof task · step ' + (at + 1) + ' of ' + steps.length
      : 'Question ' + (qSteps.indexOf(step) + 1) + ' of ' + qSteps.length;
    keysHint.textContent = step.kind === 'question' ? 'Press A–D to answer · Enter for next' : 'Finish the task, then Next';
    swap(() => {
      const wrap = el('section', 'tf-step tf-step-' + step.kind);
      const label = el('p', 'tf-kicker', step.kind === 'workbench' ? 'Proof task' : (step.inLesson ? 'From the lesson' : 'Question ' + (qSteps.indexOf(step) + 1)));
      label.id = 'tf-heading';
      wrap.appendChild(label);
      if (step.kind === 'workbench') {
        wrap.appendChild(el('p', 'tf-lead', 'Work through the task below. Next lights up when it is complete.'));
      }
      const body = el('div', 'tf-body');
      body.appendChild(take(step.node));
      wrap.appendChild(body);
      stage.appendChild(wrap);
      refreshStep();
      const firstOption = step.kind === 'question'
        ? stage.querySelector('.quiz-option:not([disabled])')
        : stage.querySelector('input, select, textarea, button');
      if (firstOption) firstOption.focus({ preventScroll: true });
      else nextBtn.focus({ preventScroll: true });
    });
  }

  function refreshStep() {
    const s = snap();
    if (!s || screen !== 'step') return;
    const step = steps[at];
    const done = stepDone(step, s);
    backBtn.hidden = at === 0;
    nextBtn.disabled = !done;
    nextBtn.textContent = at === steps.length - 1 ? 'Finish' : 'Next';
    nextBtn.classList.toggle('is-ready', done);
    root.classList.toggle('is-answered', done);
    setProgress(s);
  }

  function showDone(s) {
    screen = 'done';
    root.classList.remove('is-intro', 'is-answered');
    root.classList.add('is-done');
    foot.hidden = true;
    counter.textContent = '';
    fill.style.width = '100%';
    const qCount = s.questions.length;
    swap(() => {
      const card = el('section', 'tf-done');
      const seal = el('div', 'tf-seal');
      seal.setAttribute('aria-hidden', 'true');
      seal.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>';
      card.appendChild(seal);
      card.appendChild(el('p', 'tf-kicker', s.label));
      const h = el('h2', 'tf-title', s.last ? 'You have finished the course' : 'Sitting complete');
      h.id = 'tf-heading';
      card.appendChild(h);
      const parts = [];
      if (qCount) parts.push(plural(qCount, 'question', 'questions') + ' answered');
      if (s.workbench) parts.push('the proof task done');
      card.appendChild(el('p', 'tf-lead', (parts.length ? parts.join(' and ') + '. ' : '') + 'Well done.'));
      const actions = el('div', 'tf-actions');
      const go = el('button', 'tf-primary', s.last ? 'Finish the course' : 'Continue to ' + s.nextLabel);
      go.type = 'button';
      go.setAttribute('data-tf', 'advance');
      const stay = el('button', 'tf-ghost', 'Stay on this sitting');
      stay.type = 'button';
      stay.setAttribute('data-tf', 'close');
      actions.appendChild(go);
      actions.appendChild(stay);
      card.appendChild(actions);
      stage.appendChild(card);
      focusFirst('[data-tf="advance"]');
    });
  }

  function showWaiting() {
    screen = 'waiting';
    foot.hidden = true;
    swap(() => {
      const card = el('section', 'tf-intro');
      const h = el('h2', 'tf-title', 'The questions are still loading');
      h.id = 'tf-heading';
      card.appendChild(h);
      card.appendChild(el('p', 'tf-lead', 'Give it a moment, then try again.'));
      const actions = el('div', 'tf-actions');
      const ok = el('button', 'tf-primary', 'Close');
      ok.type = 'button';
      ok.setAttribute('data-tf', 'close');
      actions.appendChild(ok);
      card.appendChild(actions);
      stage.appendChild(card);
      focusFirst('[data-tf="close"]');
    });
  }

  function goNext() {
    const s = snap();
    if (!s) return;
    if (screen === 'step' && !stepDone(steps[at], s)) return;
    const rest = steps.findIndex((st, i) => i > at && !stepDone(st, s));
    if (rest >= 0) {
      showStep(rest);
      return;
    }
    const earlier = steps.findIndex((st) => !stepDone(st, s));
    if (earlier >= 0) {
      showStep(earlier);
      return;
    }
    if (s.canAdvance) {
      restoreAll();
      showDone(s);
      return;
    }
    const fresh = planSteps(s);
    if (fresh.length) {
      restoreAll();
      steps = fresh;
      showStep(0);
    } else {
      showDone(s);
    }
  }

  function open() {
    const s = snap();
    if (!s) return false;
    if (!root) build();
    if (screen !== 'closed') return true;
    returnFocus = document.activeElement;
    steps = planSteps(s);
    at = 0;
    root.hidden = false;
    document.addEventListener('keydown', onKey, true);
    document.documentElement.classList.add('tf-open');
    requestAnimationFrame(() => root.classList.add('is-open'));
    if (!s.ready) showWaiting();
    else if (!steps.length && s.canAdvance) showDone(s);
    else if (!steps.length) showWaiting();
    else showIntro(s);
    return true;
  }

  function close(after) {
    if (!root || screen === 'closed') return;
    screen = 'closed';
    document.removeEventListener('keydown', onKey, true);
    root.classList.remove('is-open');
    root.classList.add('is-leaving');
    const finish = () => {
      restoreAll();
      stage.innerHTML = '';
      root.hidden = true;
      root.classList.remove('is-leaving', 'is-intro', 'is-done', 'is-answered');
      document.documentElement.classList.remove('tf-open');
      steps = [];
      refreshLauncher();
      if (typeof after === 'function') after();
      else if (returnFocus && typeof returnFocus.focus === 'function' && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    };
    if (still()) finish();
    else setTimeout(finish, LEAVE_MS);
  }

  function onClick(event) {
    const btn = event.target.closest('[data-tf]');
    if (!btn || !root.contains(btn) || btn.disabled) return;
    const act = btn.getAttribute('data-tf');
    if (act === 'close') close();
    else if (act === 'start') showStep(0);
    else if (act === 'back') { if (at > 0) showStep(at - 1); }
    else if (act === 'next') goNext();
    else if (act === 'advance') {
      const h = host();
      close(() => { if (h) h.advance(); });
    }
  }

  function typing(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function trap(event) {
    const items = Array.prototype.filter.call(
      root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      (n) => !n.disabled && n.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKey(event) {
    if (event.key === 'Tab') {
      trap(event);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Enter') {
      if (event.target.closest('button, a')) return;
      event.stopPropagation();
      if (screen === 'intro') { event.preventDefault(); showStep(0); }
      else if (screen === 'step' && !nextBtn.disabled) { event.preventDefault(); goNext(); }
      return;
    }
    if (screen !== 'step' || !steps[at] || steps[at].kind !== 'question') return;
    const key = event.key.toLowerCase();
    let pick = KEYS.indexOf(key);
    if (pick < 0 && /^[1-8]$/.test(key)) pick = Number(key) - 1;
    if (pick < 0) return;
    const option = document.getElementById('q-' + steps[at].q + '-opt-' + pick);
    if (option && !option.disabled && stage.contains(option)) {
      event.preventDefault();
      event.stopPropagation();
      option.click();
    }
  }

  function onChanged(event) {
    if (screen === 'step') {
      refreshStep();
      const s = snap();
      const detail = (event && event.detail) || {};
      if (s && stepDone(steps[at], s)) nextBtn.focus({ preventScroll: true });
      else if (detail.reset) {
        const first = stage.querySelector('.quiz-option:not([disabled])');
        if (first) first.focus({ preventScroll: true });
      } else if (!root.contains(document.activeElement)) {
        const retry = stage.querySelector('[data-quiz-retry]');
        if (retry) retry.focus({ preventScroll: true });
      }
    }
    refreshLauncher();
  }

  function buildLauncher() {
    const lead = document.getElementById('quiz-lead');
    if (!lead || !lead.parentNode) return;
    launcher = el('div', 'tf-launch');
    const copy = el('div', 'tf-launch-copy');
    launchStatus = el('strong', 'tf-launch-status');
    copy.appendChild(launchStatus);
    copy.appendChild(el('span', '', 'One at a time, in a quiet full-screen view.'));
    launchBtn = el('button', 'tf-launch-btn', 'Start the questions');
    launchBtn.type = 'button';
    launchBtn.addEventListener('click', () => open());
    launcher.appendChild(copy);
    launcher.appendChild(launchBtn);
    lead.parentNode.insertBefore(launcher, lead.nextSibling);
    document.body.classList.add('tf-ready');
    refreshLauncher();
    const box = document.getElementById('quiz-container');
    if (box && 'MutationObserver' in window) {
      new MutationObserver(() => refreshLauncher()).observe(box, { childList: true });
    }
  }

  function refreshLauncher() {
    if (!launcher) return;
    const s = snap();
    if (!s) return;
    const left = planSteps(s);
    const qLeft = left.filter((st) => st.kind === 'question').length;
    const taskLeft = left.some((st) => st.kind === 'workbench');
    if (!left.length && s.canAdvance) {
      launchStatus.textContent = 'All done for this sitting';
      launchBtn.textContent = s.last ? 'Finish the course' : 'Continue to ' + s.nextLabel;
      launcher.classList.add('is-done');
      return;
    }
    launcher.classList.remove('is-done');
    const parts = [];
    if (qLeft) parts.push(plural(qLeft, 'question', 'questions'));
    if (taskLeft) parts.push('1 proof task');
    launchStatus.textContent = parts.length ? parts.join(' and ') + ' to go' : 'Questions';
    const started = s.questions.some((q) => q.done && !q.inLesson);
    launchBtn.textContent = started ? 'Continue the questions' : 'Start the questions';
  }

  document.addEventListener('quiz:changed', onChanged);
  document.addEventListener('checkpoint:passed', onChanged);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildLauncher, { once: true });
  else buildLauncher();

  window.StudyTaskFlow = {
    open: open,
    close: function () { close(); },
    isOpen: function () { return screen !== 'closed'; }
  };
})();
