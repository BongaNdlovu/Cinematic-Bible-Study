import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('study.html');
const app = read('js/study/study-app.js');
const flow = read('js/study/task-flow.js');
const flowCss = read('css/task-flow.css');
const player = read('js/study/lesson-player.js');
const audioCss = read('css/study-audio.css');

assert(html.includes('js/study/task-flow.js') && html.includes('css/task-flow.css'), 'the study page loads the task flow');
assert(html.includes('css/study-audio.css'), 'the study page loads the audio player styles');
assert(app.includes('window.StudyTasks = {'), 'the study app exposes what is done to the flow');
assert(app.includes("new CustomEvent('quiz:changed'"), 'answers and retries tell the flow');
assert((app.match(/openTaskFlow\(\)/g) || []).length >= 2, 'next sitting opens the flow when work is unfinished');
assert(app.includes("flow.open()"), 'the Questions step opens the flow');
assert(!app.includes('Consolidate Prophetic Understanding'), 'the quiz copy is gentle');

assert(flow.includes("'Ready to close this sitting?'"), 'the flow has a start screen');
assert(flow.includes('take(step.node)') && flow.includes('restoreAll()'), 'question cards are borrowed and always put back');
assert(flow.includes("'q-' + steps[at].q + '-opt-' + pick"), 'letter keys pick an option through the existing buttons');
assert(flow.includes("h.advance()"), 'the done screen moves on to the next sitting');
assert(flow.includes("document.addEventListener('keydown', onKey, true)") && flow.includes("document.removeEventListener('keydown', onKey, true)"), 'keys work while open and are released on close');
assert(!flow.includes('innerHTML = q') && !/innerHTML\s*=\s*[^'"\s]/.test(flow.replace(/stage\.innerHTML = ''/g, '')), 'the flow never writes question text as HTML');
assert(flowCss.includes('backdrop-filter: blur(18px)'), 'the page behind the flow is blurred');
assert(flowCss.includes('.tf-stage > * { margin-block: auto;'), 'long questions scroll from the top instead of being cut off');

assert(html.includes('data-lap-skip="-15"') && html.includes('data-lap-skip="15"') && html.includes('data-lap-rate'), 'the player has skip and speed controls');
assert(player.includes("RATE_KEY = 'daniel_audio_rate_v1'"), 'the chosen speed is remembered');
assert(player.includes('player.defaultPlaybackRate = rate'), 'speed survives a change of sitting');
assert(audioCss.includes('backdrop-filter: blur(32px) saturate(180%)'), 'the player is glass');
assert(audioCss.includes('body.paper-mode #lesson-audio') && audioCss.includes('body.white-mode #lesson-audio'), 'the player has a light-theme glass');

const workbench = read('js/study/workbench.js');
const scripture = read('js/study/scripture.js');
assert(workbench.includes('else if (window.navigateSheet) window.navigateSheet(1);') && !workbench.includes('window.loadSheet('), 'the dossier Continue button uses a navigator the study app exports');
assert(app.includes('if (firstTime) offerCapstone(finishedSheet);'), 'finishing a sitting can open the capstone');
assert(/function offerCapstone\(finishedSheet\) \{\s*if \(finishedSheet !== 2\) return;/.test(app), 'the capstone follows Sitting 2 only');
assert(app.includes('wb.getCapstoneData()) return;'), 'a saved capstone is not offered again');
assert(/Object\.assign\(window, \{[^}]*\bshowToast\b[^}]*\}\);/.test(app), 'competency toasts reach the study toast');
assert(scripture.includes('return sheets[key] || null;'), 'an unmapped sitting shows the no-passage message instead of sitting 0');
{
  const store = {};
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const win = { localStorage: ls };
  const doc = { body: { classList: { toggle() {} } }, getElementById: () => null, addEventListener() {}, querySelector: () => null };
  new Function('window', 'document', 'localStorage', read('js/study/competency.js'))(win, doc, ls);
  store.daniel_placement_track_v1 = '<img src=x onerror=alert(1)>';
  assert.strictEqual(win.StudyCompetency.getTrack(), 'foundations', 'a hand-edited track never reaches the record as HTML');
  store.daniel_placement_track_v1 = 'scholarly';
  assert.strictEqual(win.StudyCompetency.getTrack(), 'scholarly', 'the scholarly track still reads back');
}

console.log('task flow: start screen, one question at a time, done screen; glass audio player');
