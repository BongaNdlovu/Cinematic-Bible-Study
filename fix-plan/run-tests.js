'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), http = require('http');

const root = process.cwd();
const mode = process.argv[2] || 'all';
const pick = (prefix) => (mode.startsWith(prefix) ? mode.slice(prefix.length).split(',') : null);
const onlyVerify = pick('only=');
const onlyUnit = pick('unit=');
const wantAll = mode === 'all';
const SERVER_PORTS = [8000, 8001, 8002, 8100];

function verifyScripts() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.scripts.test.split('&&').map(s => s.trim().split(/\s+/)[1]);
}

function run(cmd, args, shell) {
  return cp.spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, shell: !!shell, timeout: 900000 });
}

function answers(port) {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 800 }, res => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitPortsFree() {
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    const busy = await Promise.all(SERVER_PORTS.map(answers));
    if (!busy.some(Boolean)) return;
    await new Promise(r => setTimeout(r, 300));
  }
}

function unitFiles() {
  if (onlyUnit) return onlyUnit;
  return fs.readdirSync(path.join(root, 'tests/unit')).filter(f => f.endsWith('.test.mjs')).sort().map(f => 'tests/unit/' + f);
}

function unitRows() {
  const r = run(process.execPath, ['--test', '--test-reporter=tap', ...unitFiles()]);
  const rows = [];
  for (const line of (r.stdout || '').split(/\r?\n/)) {
    const m = /^(ok|not ok) \d+ - (.*?)(\s+#.*)?$/.exec(line);
    if (m) rows.push(`${m[1] === 'ok' ? 'PASS' : 'FAIL'} unit: ${m[2]}`);
  }
  if (!rows.length) rows.push('FAIL unit: no TAP results (exit ' + r.status + ')');
  return rows;
}

async function verifyRows() {
  const rows = [];
  for (const s of verifyScripts().filter(x => !onlyVerify || onlyVerify.includes(x))) {
    await waitPortsFree();
    const r = run(process.execPath, [s]);
    if (r.status !== 0) process.stderr.write(`--- ${s} exit ${r.status}\n${(r.stdout || '').slice(-1500)}${(r.stderr || '').slice(-1500)}\n`);
    rows.push(`${r.status === 0 ? 'PASS' : 'FAIL'} verify: ${s}`);
  }
  return rows;
}

function lintRows() {
  const r = run(process.platform === 'win32' ? 'npx.cmd oxlint --ignore-pattern "fix-plan/**"' : 'npx oxlint --ignore-pattern "fix-plan/**"', [], true);
  return [`${r.status === 0 ? 'PASS' : 'FAIL'} lint: oxlint`];
}

(async () => {
  const rows = [];
  if (wantAll || onlyUnit) rows.push(...unitRows());
  if (wantAll || onlyVerify) rows.push(...await verifyRows());
  if (wantAll) rows.push(...lintRows());
  for (const r of rows) console.log(r);
})();
