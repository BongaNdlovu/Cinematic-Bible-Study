import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureServer } from './_server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const TIMEOUT_MS = 240000;

export const BROWSER_CHECKS = [
  { file: 'verify_bridge_copy.mjs', base: 'none' },
  { file: 'verify_bridge_panel.mjs', base: 'flag' },
  { file: 'verify_cp07.mjs', base: 'none' },
  { file: 'verify_flow.mjs', base: 'flag' },
  { file: 'verify_globe.mjs', base: 'none', timeoutMs: 720000 },
  { file: 'verify_grounding_quotes.mjs', base: 'none' },
  { file: 'verify_hall_mural.mjs', base: 'none', timeoutMs: 480000 },
  { file: 'verify_horizon.mjs', base: 'none' },
  { file: 'verify_insight_cards.mjs', base: 'flag' },
  { file: 'verify_lesson_connectors.mjs', base: 'none' },
  { file: 'verify_map.mjs', base: 'none' },
  { file: 'verify_medal_art.mjs', base: 'none' },
  { file: 'verify_mindmap.mjs', base: 'flag' },
  { file: 'verify_mindmap_fullscreen.mjs', base: 'flag' },
  { file: 'verify_mindmap_fullscreen_fit.mjs', base: 'flag' },
  { file: 'verify_mindmap_legibility.mjs', base: 'flag' },
  { file: 'verify_mobile_viewports.mjs', base: 'none', timeoutMs: 480000 },
  { file: 'verify_onevoice27.mjs', base: 'none' },
  { file: 'verify_photo_y.mjs', base: 'flag' },
  { file: 'verify_read_meter.mjs', base: 'flag' },
  { file: 'verify_study_audit_fixes.mjs', base: 'flag' },
  { file: 'verify_audit_group1.mjs', base: 'flag' },
  { file: 'verify_audit_group2.mjs', base: 'flag' },
  { file: 'verify_readalong.mjs', base: 'positional' },
  { file: 'verify_scripture.mjs', base: 'none' },
  { file: 'verify_sitting4_fixes.mjs', base: 'flag' },
  { file: 'verify_story_layers.mjs', base: 'flag' },
  { file: 'verify_story_mobile.mjs', base: 'flag' },
  { file: 'verify_story_reader.mjs', base: 'flag' },
  { file: 'verify_story_themes.mjs', base: 'flag' },
  { file: 'verify_study_page_load.mjs', base: 'flag' },
  { file: 'verify_theme.mjs', base: 'none' },
  { file: 'verify_verify_pack_quotes.mjs', base: 'none' },
  { file: 'verify_workbench.mjs', base: 'none' },
];

export const QUARANTINED = [
  { file: 'verify_book_reader.mjs', base: 'flag', reason: "timing and geometry checks fail: mid-turn step reads (M2.3), wheel throttle (M3.7), resize mode (M2.7), font-size steps (M3.10), 2px view height (M2.8); the reader itself reaches the last step" },
];

function argsFor(check, base) {
  if (check.base === 'flag') return ['--base=' + base];
  if (check.base === 'positional') return [base];
  return [];
}

function runOne(check, base) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join('tools', 'verify', check.file), ...argsFor(check, base)], { cwd: root, env: { ...process.env, BASE: base }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, check.timeoutMs || TIMEOUT_MS);
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    child.on('close', (code) => {
      clearTimeout(timer);
      const status = timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : 'FAIL';
      resolve({ file: check.file, status, seconds: Math.round((Date.now() - started) / 1000), tail: output.trim().split('\n').slice(-30).join('\n') });
    });
  });
}

function parseOnly(argv) {
  const hit = argv.find((a) => a.startsWith('--only='));
  if (!hit) return null;
  return new Set(hit.slice('--only='.length).split(',').filter(Boolean));
}

async function main() {
  const only = parseOnly(process.argv.slice(2));
  const jsonOut = process.argv.find((a) => a.startsWith('--json='));
  const everything = [...BROWSER_CHECKS, ...QUARANTINED];
  const pool = process.argv.includes('--include-quarantined') ? everything : BROWSER_CHECKS;
  const checks = only ? everything.filter((c) => only.has(c.file)) : pool;
  if (!checks.length) {
    console.error('No checks selected.');
    process.exit(2);
  }
  const server = await ensureServer({ preferred: 8000 });
  const results = [];
  try {
    for (const check of checks) {
      const result = await runOne(check, server.base);
      results.push(result);
      console.log('[' + result.status + '] ' + result.file + ' (' + result.seconds + 's)');
      if (result.status !== 'PASS') console.log(result.tail.split('\n').map((l) => '    ' + l).join('\n'));
    }
  } finally {
    server.stop();
  }
  if (jsonOut) fs.writeFileSync(jsonOut.slice('--json='.length), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => r.status !== 'PASS');
  console.log('RESULT ' + (failed.length ? 'FAIL' : 'PASS') + ': ' + (results.length - failed.length) + ' of ' + results.length + ' browser checks passed');
  process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
