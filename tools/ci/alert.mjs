import { spawnSync } from 'node:child_process';

const LABEL = 'ci-alert';
const MODES = new Set(['fail', 'recover']);
const [mode, check] = process.argv.slice(2);

if (!MODES.has(mode) || !check) {
  console.error('usage: node tools/ci/alert.mjs <fail|recover> <check name>');
  process.exit(2);
}

const title = `Alert: ${check} is failing`;
const run = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : 'no run link';
const when = new Date().toISOString();

function gh(args) {
  const res = spawnSync('gh', args, { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`gh ${args[0]} ${args[1]} failed: ${(res.stderr || '').trim()}`);
  return res.stdout.trim();
}

function openIssue() {
  const found = JSON.parse(gh(['issue', 'list', '--label', LABEL, '--state', 'open', '--search', `"${title}" in:title`, '--json', 'number,title']));
  return found.find((i) => i.title === title) || null;
}

const open = openIssue();

if (mode === 'recover') {
  if (!open) {
    console.log(`${check}: healthy, no open alert`);
    process.exit(0);
  }
  gh(['issue', 'close', String(open.number), '--comment', `Recovered at ${when}. ${run}`]);
  console.log(`${check}: recovered, closed #${open.number}`);
  process.exit(0);
}

if (open) {
  console.log(`${check}: still failing, #${open.number} is already open`);
  process.exit(0);
}

gh(['label', 'create', LABEL, '--color', 'B60205', '--description', 'Opened by CI when a check fails', '--force']);
const url = gh(['issue', 'create', '--label', LABEL, '--title', title, '--body', `${check} failed at ${when}.\n\nRun: ${run}\n\nThis issue closes itself when the check passes again.`]);
console.log(`${check}: failing, opened ${url}`);
