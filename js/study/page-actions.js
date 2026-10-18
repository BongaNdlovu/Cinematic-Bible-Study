(function () {
  'use strict';

  function call(name, arg) {
    const fn = window[name];
    if (typeof fn === 'function') fn(arg);
  }

  function competency(method, arg) {
    const record = window.StudyCompetency;
    if (record && typeof record[method] === 'function') record[method](arg);
  }

  const ACTIONS = {
    toc: () => call('toggleTocDrawer'),
    atmosphere: () => call('togglePomodoroDrawer'),
    font: (arg) => call('adjustFontSize', Number(arg)),
    theme: () => call('cycleTheme'),
    weather: (arg) => call('setWeatherPreset', arg),
    'pomodoro-start': () => call('startPomodoro'),
    'pomodoro-pause': () => call('pausePomodoro'),
    'pomodoro-reset': () => call('resetPomodoro'),
    'pomodoro-minutes': (arg) => call('setPomodoroDuration', Number(arg)),
    progress: () => competency('renderCompetencyRecordModal'),
    placement: () => competency('initPlacementModal', true),
    'artifact-open': () => call('openArtifactModal'),
    'artifact-close': () => call('closeArtifactModal'),
    scripture: () => call('openLessonScripture'),
    'bible-notice': () => {
      const notice = document.getElementById('lesson-bible-notice');
      if (notice) notice.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    'sheet-prev': () => call('navigateSheet', -1),
    'sheet-next': () => call('completeAndAdvance')
  };

  function wire(el) {
    if (el.__studyAction) return;
    const run = ACTIONS[el.getAttribute('data-action')];
    if (!run) return;
    el.__studyAction = true;
    el.addEventListener('click', () => run(el.getAttribute('data-arg')));
  }

  document.querySelectorAll('[data-action]').forEach(wire);

  document.addEventListener('error', (event) => {
    const img = event.target;
    if (img && img.tagName === 'IMG' && img.hasAttribute('data-drop-on-error')) img.remove();
  }, true);
})();
