#!/usr/bin/env node
/**
 * Compress GLBs with @gltf-transform/cli via programmatic API if CLI fails.
 * Prefer: npx @gltf-transform/cli optimize ...
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELS = path.join(ROOT, 'models');
const ORIGINALS = path.join(MODELS, 'originals');
const COMPRESSED = path.join(MODELS, 'compressed');

const FILES = [
  'azure_altar.glb',
  'golden_head.glb',
  'silver_chest.glb',
  'bronze_thighs.glb',
  'iron_legs.glb',
  'feet_iron_clay.glb',
  'full_body.glb',
  'lion.glb',
  'bear.glb',
  'leopard.glb',
  'beast.glb',
  'ram.glb',
  'goat.glb',
  'goat_broken.glb',
  'goat_horn.glb',
  'dura.glb',
  'ancient.glb',
  'son.glb',
  'stump.glb',
];

fs.mkdirSync(ORIGINALS, { recursive: true });
fs.mkdirSync(COMPRESSED, { recursive: true });

function mb(n) { return (n / (1024 * 1024)).toFixed(2); }

const report = [];

for (const name of FILES) {
  const src = path.join(MODELS, name);
  if (!fs.existsSync(src)) {
    console.warn('MISSING', src);
    continue;
  }
  const before = fs.statSync(src).size;
  const origDest = path.join(ORIGINALS, name);
  if (!fs.existsSync(origDest)) {
    fs.copyFileSync(src, origDest);
    console.log('backed up', name, mb(before) + 'MB');
  }

  const out = path.join(COMPRESSED, name);
  console.log('\n=== Optimizing', name, '===');
  const args = [
    '--yes',
    '@gltf-transform/cli',
    'optimize',
    src,
    out,
    '--texture-compress', 'webp',
    '--texture-size', '2048',
  ];
  let r = spawnSync('npx', args, { stdio: 'inherit', shell: true });
  if (r.status !== 0 || !fs.existsSync(out)) {
    console.warn('optimize failed, trying meshopt+draco+webp separately');
    // fallback pipeline
    const tmp1 = out + '.tmp1.glb';
    const steps = [
      ['--yes', '@gltf-transform/cli', 'resize', src, tmp1, '--width', '2048', '--height', '2048'],
      ['--yes', '@gltf-transform/cli', 'webp', tmp1, out, '--quality', '80'],
    ];
    for (const a of steps) {
      r = spawnSync('npx', a, { stdio: 'inherit', shell: true });
      if (r.status !== 0) break;
    }
    try { fs.unlinkSync(tmp1); } catch {}
  }

  if (!fs.existsSync(out)) {
    console.error('FAILED', name);
    report.push({ name, before, after: null, ok: false });
    continue;
  }
  const after = fs.statSync(out).size;
  // Replace models/ with compressed if smaller
  if (after < before) {
    fs.copyFileSync(out, src);
    console.log(`replaced models/${name}: ${mb(before)} -> ${mb(after)} MB`);
  } else {
    console.log(`kept original (compressed not smaller): ${mb(before)} vs ${mb(after)}`);
  }
  report.push({ name, before, after, ok: true });
}

console.log('\n=== REPORT ===');
for (const row of report) {
  console.log(
    row.name,
    mb(row.before) + 'MB',
    '->',
    row.after != null ? mb(row.after) + 'MB' : 'FAIL',
    row.after && row.before ? `(${((1 - row.after / row.before) * 100).toFixed(1)}% smaller)` : ''
  );
}
fs.writeFileSync(path.join(ROOT, 'compression_report.json'), JSON.stringify(report, null, 2));
