const PAGE_EVENTS = ['bookreader:mount', 'bookreader:unmount', 'bookreader:turn', 'bookreader:end'];

const TASK_EVENTS = ['quiz:changed', 'checkpoint:passed'];

const AUDIO_EVENTS = ['play', 'pause', 'ended', 'emptied', 'timeupdate', 'seeked', 'loadedmetadata'];

const SECONDS_PER_MINUTE = 60;

const meter = document.getElementById('read-meter');

const fill = meter && meter.querySelector('.read-meter-fill');

const pctText = meter && meter.querySelector('.read-meter-pct');

const labelText = meter && meter.querySelector('.read-meter-label');

const player = document.getElementById('lesson-audio-player');

const hasMeter = !!(meter && fill && pctText && labelText);

let readLabel = '';

let frame = 0;

let tasksStale = true;

let tasks = { done: 0, total: 0 };

function scrollSpan() {
  const main = document.querySelector('main.sitting-main');
  if (!main) return { done: 0, total: 0 };
  const top = window.scrollY || 0;
  const end = main.getBoundingClientRect().bottom + top - window.innerHeight;
  if (end <= 0) return { done: 0, total: 0 };
  return { done: Math.min(top, end), total: end };
}

function bookSpan() {
  const reader = window.BookReader;
  if (!reader || !reader.isActive()) return { done: 0, total: 0 };
  const state = reader.state();
  if (state.steps < 2) return { done: 0, total: 0 };
  const book = document.querySelector('.br-book');
  if (!book) return { done: 0, total: 0 };
  const height = book.getBoundingClientRect().height;
  return { done: state.step * height, total: (state.steps - 1) * height };
}

function countTasks() {
  const host = window.StudyTasks;
  const snap = host && typeof host.snapshot === 'function' ? host.snapshot() : null;
  if (!snap || !snap.ready) return { done: 0, total: 0 };
  const hasWorkbench = !!snap.workbench;
  const workbenchDone = hasWorkbench && snap.workbench.done ? 1 : 0;
  const answered = snap.questions.filter((q) => q.done).length;
  return { done: answered + workbenchDone, total: snap.questions.length + (hasWorkbench ? 1 : 0) };
}

function sittingShare() {
  if (tasksStale) {
    tasks = countTasks();
    tasksStale = false;
  }
  const page = scrollSpan();
  const book = bookSpan();
  const readDone = page.done + book.done;
  const readTotal = page.total + book.total;
  const reached = readTotal > 0 ? readDone / readTotal : 1;
  const taskUnit = window.innerHeight;
  const whole = readTotal + tasks.total * taskUnit;
  if (whole <= 0) return reached;
  return reached * (readTotal + tasks.done * taskUnit) / whole;
}

function isListening() {
  if (!player || player.paused || player.ended) return false;
  return Number.isFinite(player.duration) && player.duration > 0;
}

function listenLabel() {
  const minutes = Math.max(1, Math.round(player.duration / SECONDS_PER_MINUTE));
  return minutes + ' min listen';
}

function paint() {
  frame = 0;
  const listening = isListening();
  const share = listening ? player.currentTime / player.duration : sittingShare();
  const clamped = Math.min(1, Math.max(0, share));
  const percent = Math.round(clamped * 100);
  const label = listening ? listenLabel() : readLabel;
  fill.style.transform = 'scaleX(' + clamped + ')';
  pctText.textContent = percent + '%';
  labelText.textContent = label;
  meter.classList.toggle('is-listening', listening);
  meter.setAttribute('aria-valuenow', String(percent));
  meter.setAttribute('aria-valuetext', percent + '% · ' + label);
}

export function queueReadMeter() {
  if (!hasMeter || frame) return;
  frame = requestAnimationFrame(paint);
}

function queueTasks() {
  tasksStale = true;
  queueReadMeter();
}

export function setReadMeterTime(readTime) {
  readLabel = String(readTime || '').trim();
  queueTasks();
}

function wire() {
  if (!hasMeter) return;
  window.addEventListener('scroll', queueReadMeter, { passive: true });
  window.addEventListener('resize', queueReadMeter);
  PAGE_EVENTS.forEach((name) => document.addEventListener(name, queueTasks));
  TASK_EVENTS.forEach((name) => document.addEventListener(name, queueTasks));
  if (player) AUDIO_EVENTS.forEach((name) => player.addEventListener(name, queueReadMeter));
  const main = document.querySelector('main.sitting-main');
  if (main && 'ResizeObserver' in window) new ResizeObserver(queueTasks).observe(main);
  queueReadMeter();
}

wire();
