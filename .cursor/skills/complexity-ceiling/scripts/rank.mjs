import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const rc = JSON.parse(readFileSync(join(process.cwd(), '.oxlintrc.json'), 'utf8'));
const rule = rc.rules && rc.rules.complexity;
const ceiling = Array.isArray(rule) ? Number(rule[1]) : Number(rule);
if (!Number.isFinite(ceiling)) {
  console.error('complexity rule missing from .oxlintrc.json');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'oxc-'));
const cfg = join(dir, 'oxlintrc.json');
writeFileSync(cfg, JSON.stringify({
  categories: {
    correctness: 'off',
    suspicious: 'off',
    pedantic: 'off',
    perf: 'off',
    style: 'off',
    restriction: 'off',
    nursery: 'off'
  },
  rules: { complexity: ['warn', 20] }
}));

const ignores = ['vendor/**', 'node_modules/**', 'qa/**', 'qa-e2e/**', 'tools/**', 'models/**', 'assets/**'];
const args = ['oxlint', '-c', cfg, '-f', 'json', ...ignores.flatMap((pat) => ['--ignore-pattern', pat]), '.'];
const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = spawnSync(bin, args, { encoding: 'utf8', cwd: process.cwd() });
if (run.error) {
  console.error(run.error.message);
  process.exit(1);
}
const text = String(run.stdout || '').replace(/^\uFEFF/, '');
const start = text.indexOf('{');
if (start < 0) {
  console.error(run.stderr || text || 'oxlint produced no JSON');
  process.exit(1);
}
const report = JSON.parse(text.slice(start));
const rows = [];
for (const d of report.diagnostics || []) {
  const msg = String(d.message || '');
  const score = msg.match(/complexity of (\d+)/);
  if (!score) continue;
  const named = msg.match(/function `([^`]+)`/);
  const span = d.labels && d.labels[0] && d.labels[0].span;
  rows.push({
    n: Number(score[1]),
    name: named ? named[1] : '(anonymous)',
    file: String(d.filename || '').replaceAll('\\', '/'),
    line: span && (span.line || (span.start && span.start.line)) || 0
  });
}
rows.sort((a, b) => b.n - a.n || a.file.localeCompare(b.file));
const over = rows.filter((r) => r.n > ceiling);
console.log('ceiling', ceiling, '| functions above 20:', rows.length, '| over ceiling:', over.length);
for (const r of rows.slice(0, 8)) {
  console.log(String(r.n).padStart(3), r.name, r.file + ':' + r.line);
}
if (over.length) process.exit(1);
