import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BROWSER_CHECKS, QUARANTINED } from './run_browser_checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const NOT_IN_CI = {
  'verify_all.mjs': 'drives Chrome by hand over the whole site; kept for manual runs',
  'verify_load_live.mjs': 'loads the live production site, so it must not run on every pull request',
  'verify_pending_migrations.mjs': 'needs access to the production database',
  'verify_equivalence.mjs': 'compares two versions given on the command line; covered by tests/unit/equivalence.test.mjs',
  'verify_moved_functions.mjs': 'compares declarations across files given on the command line; covered by tests/unit/moved-functions.test.mjs',
};

const problems = [];
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
const scriptText = Object.values(scripts).join('\n');
const onDisk = fs.readdirSync(here).filter((f) => /^verify_.*\.mjs$/.test(f));
const diskSet = new Set(onDisk);
const browserSet = new Set([...BROWSER_CHECKS, ...QUARANTINED].map((c) => c.file));

for (const file of onDisk) {
  const wired = scriptText.includes('tools/verify/' + file) || browserSet.has(file);
  const exempt = Object.hasOwn(NOT_IN_CI, file);
  if (!wired && !exempt) problems.push(file + ' is not run by any package.json script or by run_browser_checks.mjs (run list or quarantine list). Wire it in, or add it to NOT_IN_CI with a reason.');
  if (wired && exempt) problems.push(file + ' is both wired and listed in NOT_IN_CI. Remove it from NOT_IN_CI.');
}

const runSet = new Set(BROWSER_CHECKS.map((c) => c.file));
for (const entry of QUARANTINED) {
  if (!entry.reason || !entry.reason.trim()) problems.push(entry.file + ' is quarantined without a reason.');
  if (runSet.has(entry.file)) problems.push(entry.file + ' is both run in CI and quarantined.');
}

for (const file of browserSet) {
  if (!diskSet.has(file)) problems.push('run_browser_checks.mjs lists ' + file + ', which does not exist.');
}

for (const file of Object.keys(NOT_IN_CI)) {
  if (!diskSet.has(file)) problems.push('NOT_IN_CI lists ' + file + ', which does not exist.');
}

for (const name of ['test:browser']) {
  if (!Object.hasOwn(scripts, name)) problems.push('package.json has no "' + name + '" script.');
}

if (problems.length) {
  console.error(problems.map((p) => '[FAIL] ' + p).join('\n'));
  process.exit(1);
}
console.log('every tools/verify/verify_*.mjs is wired (' + onDisk.length + ' files, ' + Object.keys(NOT_IN_CI).length + ' listed as not run in CI)');
