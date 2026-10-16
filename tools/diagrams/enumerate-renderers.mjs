/*
 * Enumerates the visual renderers the study lesson can reach.
 *
 * Two registries matter:
 *   1. `kind` values in a sitting's `diagrams` map — the authoring vocabulary.
 *      A kind the dispatcher does not know silently falls back to the static
 *      chain layout, so the dispatcher, not the specs, decides what exists.
 *   2. The decorative pieces rendered around a diagram (medal, replay control)
 *      and the variants a story picks up from its data (artwork or not).
 *
 * Run: node tools/diagrams/enumerate-renderers.mjs
 */
import fs from 'fs';
import vm from 'vm';

const appSrc = fs.readFileSync('js/study/study-app.js', 'utf8');

// ---- 1. what the dispatcher implements -------------------------------------
const dispatch = appSrc.match(/let body = '';([\s\S]*?)figure\.classList\.add\('chain'\)/);
const implemented = [];
if (dispatch) {
  const src = dispatch[1];
  const re = /(?:if|else if) \(kind === '([a-z]+)'\)[^\n]*?body = (\w+)/g;
  let m;
  while ((m = re.exec(src))) implemented.push({ kind: m[1], fn: m[2] });
  const fallback = /else body = (\w+)\(/.exec(src);
  if (fallback) implemented.push({ kind: '(unrecognised kind)', fn: fallback[1] });
}

// ---- 2. what the data actually uses ---------------------------------------
const raw = fs.readFileSync('js/study/sheets-data.js', 'utf8').replace(/\r\n/g, '\n');
const part = raw.slice(raw.indexOf('const sheetsData'), raw.indexOf('const timelineEpochs'));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(part + '\nthis.sheetsData = sheetsData;', ctx);
const sheets = ctx.sheetsData;

const used = new Map();
sheets.forEach((s) => {
  Object.entries(s.diagrams || {}).forEach(([id, d]) => {
    const k = d.kind || '(none)';
    if (!used.has(k)) used.set(k, []);
    used.get(k).push(`s${s.id}/${id}`);
  });
});

// ---- 3. which path each kind takes, and the variants it picks up ----------
const path = (kind) => {
  if (kind === 'chain' || kind === 'steps') return 'bodyStory -> .story-card carousel (+ reader)';
  const hit = implemented.find((i) => i.kind === kind);
  return hit ? `${hit.fn} -> ${kind === 'mindmap' ? 'block (js/study/mindmap.js)' : 'static block'}` : 'bodyChain (fallback) -> static block';
};

console.log('=== A. the seven registered kinds ===\n');
console.log('kind'.padEnd(12), 'count'.padStart(5), ' renderer');
['chain', 'steps', 'comparison', 'table', 'timeline', 'flow', 'mindmap'].forEach((k) => {
  const n = (used.get(k) || []).length;
  console.log(k.padEnd(12), String(n).padStart(5), ' ' + path(k));
});

console.log('\n=== B. variants a spec selects by its own data ===\n');
const storyIds = [];
sheets.forEach((s) => Object.entries(s.diagrams || {}).forEach(([id, d]) => {
  if (d.kind === 'chain' || d.kind === 'steps') storyIds.push({ id: `s${s.id}/${id}`, d });
}));
const withArt = storyIds.filter((x) => (x.d.steps || []).some((st) => st.image));
const withCentre = storyIds.filter((x) => (x.d.steps || []).some((st) => st.centre));
const dense = storyIds.filter((x) => (x.d.steps || []).length > 3);
console.log(`story with artwork/crossfade   ${withArt.length}  ${withArt.map((x) => x.id).join(', ') || '-'}`);
console.log(`story with a centre movement   ${withCentre.length}  ${withCentre.map((x) => x.id).join(', ') || '-'}`);
console.log(`story on the dense card ring   ${dense.length}  ${dense.map((x) => x.id).join(', ') || '-'}`);
const cmpCentre = [];
sheets.forEach((s) => Object.entries(s.diagrams || {}).forEach(([id, d]) => {
  if (d.kind === 'comparison' && d.centre) cmpCentre.push(`s${s.id}/${id}`);
}));
console.log(`comparison branching from one  ${cmpCentre.length}  ${cmpCentre.map((x) => x).join(', ') || '-'}`);

console.log('\n=== C. every kind the specs mention, and whether it is reachable ===\n');
[...used.keys()].sort().forEach((k) => {
  const known = ['chain', 'steps', 'comparison', 'table', 'timeline', 'flow', 'mindmap'].includes(k);
  console.log(`${k.padEnd(12)} ${known ? 'implemented' : 'NOT implemented -> falls back to bodyChain'}`);
});

console.log('\n=== D. renderers defined in the app but never dispatched ===\n');
// `bodyStory` is chosen by the isStory test rather than a `kind === ...`
// comparison, so it never appears in the match above.
const called = new Set(implemented.map((i) => i.fn));
called.add('bodyStory');
['bodyStory', 'bodyChain', 'bodyComparison', 'bodyTable', 'bodyFlow', 'bodyTimeline', 'bodyMindmap'].forEach((fn) => {
  if (!called.has(fn)) console.log(`${fn}  defined, no kind dispatches to it`);
});
console.log('reached by the isStory test: bodyStory');
console.log('reached only by the else fallback: bodyChain');
