#!/usr/bin/env node
/**
 * Compress Daniel 3–4 and 7 court Meshy GLBs: Dura image, Ancient of Days, Son of Man, stump.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODELS = path.join(ROOT, 'models');
const ORIGINALS = path.join(MODELS, 'originals');
const DOWNLOADS = path.join(ROOT, '..');

const FILES = [
  {
    name: 'dura.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Golden_Mesopotamian_K_0909190852_texture.glb'),
  },
  {
    name: 'ancient.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_The_Radiant_Sage_0909190910_texture.glb'),
  },
  {
    name: 'son.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Radiant_Savior_0909191926_texture.glb'),
  },
  {
    name: 'stump.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Ironbound_Stump_0909191944_texture.glb'),
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

for (const item of FILES) {
  if (!fs.existsSync(item.src)) {
    console.error('MISSING source', item.src);
    report.push({ name: item.name, ok: false, reason: 'missing-source' });
    continue;
  }

  const origDest = path.join(ORIGINALS, item.name);
  if (!fs.existsSync(origDest)) {
    console.log('\nCopying original', item.name, mb(fs.statSync(item.src).size) + 'MB');
    fs.copyFileSync(item.src, origDest);
  }

  const src = origDest;
  const out = path.join(MODELS, item.name);
  const before = fs.statSync(src).size;
  console.log('\n=== Optimizing', item.name, mb(before) + 'MB ===');

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
    console.error('FAILED', item.name);
    report.push({ name: item.name, before, after: null, ok: false });
    continue;
  }
  const after = fs.statSync(out).size;
  console.log(`wrote models/${item.name}: ${mb(before)} -> ${mb(after)} MB`);
  report.push({ name: item.name, before, after, ok: true });
}

console.log('\n=== VISIONS COMPRESSION REPORT ===');
for (const row of report) {
  console.log(
    row.name,
    row.before != null ? mb(row.before) + 'MB' : '—',
    '->',
    row.after != null ? mb(row.after) + 'MB' : 'FAIL',
    row.after && row.before ? `(${((1 - row.after / row.before) * 100).toFixed(1)}% smaller)` : ''
  );
}

if (report.some((r) => !r.ok)) process.exit(1);
fs.mkdirSync(path.join(ROOT, 'qa', 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'qa', 'reports', 'visions_compression_report.json'), JSON.stringify(report, null, 2));
console.log('DONE');
