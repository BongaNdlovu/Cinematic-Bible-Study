#!/usr/bin/env node
/**
 * Compress the four Daniel 8 Meshy GLBs (ram and goat sequence) for the gallery.
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
    name: 'ram.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Majestic_Mountain_Ram_0909184108_texture.glb'),
  },
  {
    name: 'goat.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Stormhorn_0909184152_texture.glb'),
  },
  {
    name: 'goat_broken.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Charging_Horned_Goat_0909185001_texture.glb'),
  },
  {
    name: 'goat_horn.glb',
    src: path.join(DOWNLOADS, 'Meshy_AI_Horned_Mountain_Fury_0909185022_texture.glb'),
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

console.log('\n=== DANIEL 8 COMPRESSION REPORT ===');
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
if (failed.length) process.exit(1);
fs.mkdirSync(path.join(ROOT, 'qa', 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'qa', 'reports', 'daniel8_compression_report.json'), JSON.stringify(report, null, 2));
console.log('DONE');
