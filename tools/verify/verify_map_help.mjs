import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const map = read('js/map/map.js');
const globe = read('js/map/globe.js');
const css = read('css/map.css');

assert(!map.includes('>View in 3D<') && !map.includes('">View in 3D'), 'the gallery link must not read as a 3D view of the place');
assert(map.includes('Symbol in 3D: '), 'the gallery link names the symbol it opens');
assert(map.includes('not this place'), 'the place panel says the 3D gallery is not the place');
assert(map.includes('How to use the map'), 'the map has a help panel');
for (const topic of ['Zoom in', 'Zoom out', 'Globe and map', 'Change year', 'Close-up', 'The 3D button']) {
  assert(map.includes('<dt>' + topic + '</dt>') || map.includes('<h3>' + topic + '</h3>'), 'the help panel covers ' + topic);
}
assert(map.includes("ev.key === \"?\""), 'the ? key opens help');
assert(map.includes("data-zoom='1'") && map.includes("data-zoom='-1'"), 'zoom buttons are on the map');
assert(!map.includes('L.control.zoom('), 'one zoom control serves both the globe and the map');
assert(/zoomBy:\s*zoomBy/.test(globe), 'the globe can be zoomed by the buttons');
assert(css.includes('.cmap-root:has(.cmap-dossier.open) .cmap-zoom { display: none; }'), 'on a phone the zoom buttons step aside for a place panel');
assert(map.includes('onSlow: () => { const loadEl = document.querySelector(".cmap-load");'), 'the slow-loading note finds the loading line by its class');
assert(!map.includes('getElementById("cmap-load")'), 'the slow-loading note is not looked up by an id no element has');
assert(map.includes('const loadEl = el("div", { class: "cmap-load" }'), 'the loading line is created with the class the slow-loading note looks up');

const gallery = read('js/gallery/app.js');
assert(gallery.includes("if (e.key !== 't' && e.key !== 'T') return;") && gallery.includes('if (e.ctrlKey || e.metaKey || e.altKey) return;'), 'the tour key ignores modifier chords');
assert(/!!\(e\.target && e\.target\.isContentEditable\);\s*if \(typing\) return;\s*startArtifactTour\(\);/.test(gallery), 'typing a t in a field does not start the tour');
assert(/if \(tourRunning\) \{\s*stopArtifactTour\(true\);\s*return;\s*\}/.test(gallery) && gallery.includes("tourRunning = false; museumToast('Tour complete');"), 'only one guided tour runs at a time, and pressing T again stops it');
assert(gallery.includes('if (!tourRunning) return;') && gallery.includes('if (tourRunning && !opts.fromTour) stopArtifactTour(true);'), 'a stopped tour takes no more steps, and picking an artifact stops the tour');
assert(gallery.includes('if (/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(window.location.hostname)) window.__galleryCamera = camera;') && !/^\s*window\.__galleryCamera = camera;/m.test(gallery), 'the gallery camera debug handle exists only on local hosts');

console.log('map help: zoom buttons, help panel, and an honest 3D label');
