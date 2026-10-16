/*
 * Lint the JavaScript that lives inline in the repo's HTML pages.
 *
 * `.oxlintrc.json` can only see files, and several pages in this repo carry
 * their logic in an inline `<script>` (study.html's own page script, and
 * shelf.html's menu). That code is shipped but never linted, so a genuine
 * `no-undef`-class mistake in it is invisible to `npm run lint`.
 *
 * This extracts every inline block to a temp file with a `.js` extension and
 * runs oxlint over the set. It is a lint gate, not a build step: nothing is
 * written back into the pages.
 *
 * Usage: node tools/lint-inline-scripts.mjs [page.html ...]
 *        (no arguments = every *.html in the repo root)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-lint-'));
const written = [];
let blocks = 0;

const BLOCK = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
/* A `<script type="importmap">` carries JSON, not JavaScript, so it is not
   lintable and is skipped by type along with the other non-JS block types. */
const NON_JS = /\btype\s*=\s*["']?(importmap|application\/json|text\/template)["']?/i;

for (const page of pages) {
  if (!fs.existsSync(page)) { console.log(`skip (missing): ${page}`); continue; }
  const html = fs.readFileSync(page, 'utf8');
  const name = path.basename(page, '.html');
  let n = 0;
  for (const m of html.matchAll(BLOCK)) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs) || NON_JS.test(attrs)) continue;
    const body = m[2];
    if (!body.trim()) continue;
    n += 1;
    blocks += 1;
    /* The start line is preserved with blank padding so a reported line number
       points at the real line of the real page. */
    const startLine = html.slice(0, m.index).split('\n').length;
    const pad = '\n'.repeat(Math.max(0, startLine));
    const file = path.join(tmp, `${name}.inline-${n}.js`);
    fs.writeFileSync(file, pad + body);
    written.push(file);
  }
  console.log(`${page}: ${n} inline block(s)`);
}

if (!written.length) {
  console.log('\nno inline scripts found');
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

console.log(`\nlinting ${blocks} inline block(s) from ${pages.length} page(s)\n`);
/* Run oxlint's binary rather than `npx`. On Windows the launcher in
   `node_modules/.bin` is a `.cmd` shim, and `execFileSync` cannot start one
   without a shell at all — it fails `EINVAL`, which the first two versions of
   this script reported as a silent exit 1. No `npx` and no shell is tried first;
   if the direct call cannot start, the fallback is a shell invocation, and a
   run that produces no findings *and* no output is reported as a failure rather
   than as a pass. */
const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'oxlint.cmd' : 'oxlint');
const exe = fs.existsSync(bin) ? bin : 'oxlint';

/* The run is judged by oxlint's *exit status*, not by whether it produced text:
   it prints its summary to stdout even when it fails, so "something was written"
   is true of both a pass and a failure. The earlier version checked only for
   output and therefore reported a clean gate for a file it had just flagged. */
function run(args, useShell) {
  return { ok: true, out: execFileSync(exe, args, { encoding: 'utf8', shell: useShell }) };
}

function attempt(args, useShell) {
  try {
    return run(args, useShell);
  } catch (e) {
    const stdout = String(e.stdout || '');
    const stderr = String(e.stderr || '');
    /* Findings on stdout with a non-zero status is a lint failure, and that is a
       result to report. Nothing on either stream is a launch failure. */
    if (stdout.trim() || stderr.trim()) return { ok: false, out: stdout, err: stderr };
    return { launchError: e };
  }
}

let result = null;
let failure = null;
for (const useShell of process.platform === 'win32' ? [false, true] : [false]) {
  const r = attempt(written, useShell);
  if (!r.launchError) { result = r; break; }
  failure = r.launchError;
}

if (!result) {
  console.error(`\nlint runner failed to start (${exe}): ${failure ? failure.message : 'unknown'}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

process.stdout.write(result.out || '');
if (result.err) process.stderr.write(result.err);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(result.ok ? 0 : 1);
fs.rmSync(tmp, { recursive: true, force: true });
