#!/usr/bin/env node
/**
 * Compress the four Daniel 7 Meshy GLBs for the gallery.
 * Sources stay in Downloads; shipped files are meshopt + webp in models/.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODELS = path.join(ROOT, 'models');
const ORIGINALS = path.join(MODELS, 'originals');
const DOWNLOADS = path.join(ROOT, '..');

const BEASTS = [
  {
    name: 'lion.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Celestial_Lion_0909170239_texture.glb'),
  },
  {
    name: 'bear.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Roaring_Cave_Bear_0909170615_texture.glb'),
  },
  {
    name: 'leopard.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Four_Headed_Winged_Le_0909171053_texture.glb'),
  },
  {
    name: 'beast.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Obsidian_Maw_0909172040_texture.glb'),
  },
];

function mb(n) {
  return (n / (1024 * 1024)).toFixed(2);
}

function run(args) {
  const r = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
    },
  });
  if (r.status !== 0) {
    throw new Error('gltf-transform failed: ' + args.slice(2).join(' '));
  }
}

fs.mkdirSync(ORIGINALS, { recursive: true });
fs.mkdirSync(MODELS, { recursive: true });

const report = [];

for (const beast of BEASTS) {
  if (!fs.existsSync(beast.src)) {
    console.error('MISSING source', beast.src);
    report.push({ name: beast.name, ok: false, reason: 'missing-source' });
    continue;
  }

  const origDest = path.join(ORIGINALS, beast.name);
  if (!fs.existsSync(origDest)) {
    console.log('\nCopying original', beast.name, mb(fs.statSync(beast.src).size) + 'MB');
    fs.copyFileSync(beast.src, origDest);
  }

  const src = origDest;
  const out = path.join(MODELS, beast.name);
  const before = fs.statSync(src).size;
  console.log('\n=== Optimizing', beast.name, mb(before) + 'MB ===');

  run([
    '--yes',
    '@gltf-transform/cli',
    'optimize',
    src,
    out,
    '--compress', 'meshopt',
    '--texture-compress', 'webp',
    '--texture-size', '2048',
    '--simplify', 'true',
    '--simplify-ratio', '0.05',
    '--simplify-error', '0.008',
    '--weld', 'true',
  ]);

  if (!fs.existsSync(out)) {
    console.error('FAILED', beast.name);
    report.push({ name: beast.name, before, after: null, ok: false });
    continue;
  }
  const after = fs.statSync(out).size;
  console.log(`wrote models/${beast.name}: ${mb(before)} -> ${mb(after)} MB`);
  report.push({ name: beast.name, before, after, ok: true });
}

console.log('\n=== BEAST COMPRESSION REPORT ===');
for (const row of report) {
  console.log(
    row.name,
    row.before != null ? mb(row.before) + 'MB' : '—',
    '->',
    row.after != null ? mb(row.after) + 'MB' : 'FAIL',
    row.after && row.before ? `(${((1 - row.after / row.before) * 100).toFixed(1)}% smaller)` : ''
  );
}

const failed = report.filter((r) => !r.ok);
if (failed.length) {
  process.exit(1);
}
fs.mkdirSync(path.join(ROOT, 'qa', 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'qa', 'reports', 'beast_compression_report.json'), JSON.stringify(report, null, 2));
console.log('DONE');
