import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/study/sheets-data.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('const sheetsData'), src.indexOf('const timelineEpochs')) + '\nthis.sheetsData = sheetsData;', ctx);

const shelf = ctx.sheetsData.map((d) => ({
  epoch: d.epoch,
  title: d.title,
  subtitle: d.subtitle,
  scripture: d.scripture,
  readTime: d.readTime,
  infographic: d.infographic && d.infographic.title ? { title: d.infographic.title } : undefined
}));

const out = path.join(root, 'js/home/shelf-data.js');
fs.writeFileSync(out, 'window.SHELF_DATA = ' + JSON.stringify(shelf, null, 1) + ';\n');
console.log('wrote ' + path.relative(root, out) + ' (' + shelf.length + ' volumes, ' + fs.statSync(out).size + ' bytes)');
