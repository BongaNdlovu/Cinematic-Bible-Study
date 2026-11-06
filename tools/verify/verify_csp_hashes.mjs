/*
 * Keeps the CSP script-src hash allowlist in _headers in lockstep with the
 * inline <script> blocks in the served HTML pages.
 *
 *   node tools/verify/verify_csp_hashes.mjs          verify only
 *   node tools/verify/verify_csp_hashes.mjs --write  rewrite _headers script-src
 *
 * A hash covers the exact bytes between <script> and </script>, so any edit
 * to an inline script (or a new page with one) fails this check until the
 * hashes are regenerated with --write.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const headersPath = path.join(root, '_headers');
const write = process.argv.includes('--write');

/* Chrome enforces script-src on importmap data blocks as well as runnable
   scripts (they shape module loading), so both need hashes. Other data
   blocks (application/json etc.) never run and stay unhashed. */
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module', 'module/javascript', 'importmap']);

function inlineBodies() {
  const found = [];
  const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
  for (const page of pages) {
    const src = fs.readFileSync(path.join(root, page), 'utf8');
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      const attrs = m[1];
      if (/\bsrc\s*=/.test(attrs)) continue;
      const type = (attrs.match(/type\s*=\s*["']?([^"'\s>]+)/) || [])[1] || '';
      if (!JS_TYPES.has(type.toLowerCase())) continue;
      found.push({ page, body: m[2] });
    }
  }
  return found;
}

function hash(body) {
  /* The HTML input preprocessor turns CRLF and lone CR into LF before the
     bytes reach the script element, so hashes must be over normalized text
     or every multi-line block in a CRLF file would mismatch. */
  return "'sha256-" + crypto.createHash('sha256').update(body.replace(/\r\n?/g, '\n'), 'utf8').digest('base64') + "'";
}

const required = [...new Set(inlineBodies().map((b) => hash(b.body)))].sort();

function cspOf(content) {
  const line = content.split(/\r?\n/).find((l) => l.trim().startsWith('Content-Security-Policy:'));
  if (!line) throw new Error('_headers has no Content-Security-Policy line');
  return { line, value: line.slice(line.indexOf(':') + 1).trim() };
}

let content = fs.readFileSync(headersPath, 'utf8');
const csp = cspOf(content);
const directives = csp.value.split(';').map((d) => d.trim());
const idx = directives.findIndex((d) => d.startsWith('script-src '));
if (idx === -1) {
  console.error('FAIL: CSP has no script-src directive');
  process.exit(1);
}

if (write) {
  const kept = directives[idx].split(/\s+/).filter((t) => t !== "'unsafe-inline'");
  directives[idx] = [...new Set([...kept, ...required])].join(' ');
  const next = csp.line.slice(0, csp.line.indexOf(':') + 1) + ' ' + directives.join('; ');
  content = content.replace(csp.line, next);
  fs.writeFileSync(headersPath, content, 'utf8');
  console.log('Wrote ' + required.length + ' script hashes into _headers script-src.');
}

/* Re-read so verify and --write check the same on-disk state. */
const finalCsp = cspOf(fs.readFileSync(headersPath, 'utf8'));
const scriptSrc = finalCsp.value.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) || '';
const tokens = scriptSrc.split(/\s+/).slice(1);

let ok = true;
if (tokens.includes("'unsafe-inline'")) {
  console.error("FAIL: script-src still carries 'unsafe-inline' (it disables every hash beside it).");
  ok = false;
}
const missing = required.filter((h) => !tokens.includes(h));
if (missing.length) {
  console.error('FAIL: ' + missing.length + ' inline script hash(es) missing from script-src.');
  console.error('Regenerate with: node tools/verify/verify_csp_hashes.mjs --write');
  ok = false;
}
if (!tokens.includes("'self'")) {
  console.error("FAIL: script-src no longer includes 'self'.");
  ok = false;
}

if (!ok) process.exit(1);
console.log('PASS: ' + required.length + ' inline script hashes match the served pages; script-src has no unsafe-inline.');
