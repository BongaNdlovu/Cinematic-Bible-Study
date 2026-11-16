import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import postcss from 'postcss';

const SKIP_DIRS = new Set(['node_modules', '.git', 'qa', 'dist', '.wrangler']);
const JS_EXT = /\.(?:m?js)$/;
const CSS_EXT = /\.css$/;
const DROP_KEYS = new Set(['start', 'end', 'loc', 'range', 'raw']);

const USAGE = [
  'Usage: node tools/verify/verify_equivalence.mjs --before <dir|git:REV> --after <dir|git:REV> [options]',
  '  --files a.js,b.css            compare only these paths (same path on both sides)',
  '  --before-files a.css          compare the joined content of these before paths',
  '  --after-files x.css,y.css     with the joined content of these after paths',
  '  --git-dir <dir>               repository for git: sources (default: current folder)',
].join('\n');

export function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error('Unexpected argument: ' + key);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error('Missing value for ' + key);
    opts[key.slice(2)] = value;
    i += 1;
  }
  return opts;
}

function listDir(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
        continue;
      }
      out.push(path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out;
}

export function openSource(spec, gitDir) {
  const isGit = spec.startsWith('git:');
  if (!isGit) {
    const root = path.resolve(spec);
    if (!fs.existsSync(root)) throw new Error('Folder not found: ' + root);
    return {
      label: root,
      list: () => listDir(root),
      read: (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null),
    };
  }
  const rev = spec.slice(4);
  const git = (args) => execFileSync('git', args, { cwd: gitDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  git(['rev-parse', '--verify', rev + '^{commit}']);
  return {
    label: spec,
    list: () => git(['ls-tree', '-r', '--name-only', rev]).split('\n').filter(Boolean),
    read: (rel) => {
      try {
        return git(['show', rev + ':' + rel]);
      } catch {
        return null;
      }
    },
  };
}

function stripAst(node) {
  if (Array.isArray(node)) return node.map(stripAst);
  if (node === null || typeof node !== 'object') return node;
  if (node instanceof RegExp) return String(node);
  const out = {};
  for (const key of Object.keys(node)) {
    if (DROP_KEYS.has(key)) continue;
    const value = node[key];
    out[key] = typeof value === 'bigint' ? String(value) + 'n' : stripAst(value);
  }
  return out;
}

function parseJs(text, file) {
  const clean = text.replace(/^#!.*\n/, '\n').replace(/^﻿/, '');
  const base = { ecmaVersion: 'latest', allowHashBang: true, allowReturnOutsideFunction: true };
  try {
    return acorn.parse(clean, { ...base, sourceType: 'script' });
  } catch {
    try {
      return acorn.parse(clean, { ...base, sourceType: 'module' });
    } catch (err) {
      throw new Error(file + ': cannot parse (' + err.message + ')');
    }
  }
}

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

export function jsUnits(text, file) {
  const ast = parseJs(text, file);
  return ast.body.map((stmt) => ({
    key: JSON.stringify(stripAst(stmt)),
    line: lineOf(text, stmt.start),
    label: stmt.type,
  }));
}

function normText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function cssWalk(nodes, ctx, out) {
  for (const node of nodes) {
    if (node.type === 'comment') continue;
    if (node.type === 'decl') {
      out.push({ key: ctx + ' { ' + node.prop.toLowerCase() + ': ' + normText(node.value) + (node.important ? ' !important' : '') + ' }', line: node.source?.start?.line ?? 0, label: node.prop });
      continue;
    }
    if (node.type === 'rule') {
      cssWalk(node.nodes ?? [], ctx + ' ' + normText(node.selector) + ' >', out);
      continue;
    }
    if (node.type === 'atrule') {
      const head = '@' + node.name.toLowerCase() + ' ' + normText(node.params);
      if (!node.nodes) out.push({ key: ctx + ' ' + head, line: node.source?.start?.line ?? 0, label: head });
      else cssWalk(node.nodes, ctx + ' ' + head + ' >', out);
    }
  }
}

export function cssUnits(text, file) {
  let root;
  try {
    root = postcss.parse(text);
  } catch (err) {
    throw new Error(file + ': cannot parse (' + err.message + ')');
  }
  const out = [];
  cssWalk(root.nodes, '', out);
  return out;
}

function unitsFor(file, text) {
  if (JS_EXT.test(file)) return jsUnits(text, file);
  if (CSS_EXT.test(file)) return cssUnits(text, file);
  return null;
}

function firstMismatch(before, after) {
  const shared = Math.min(before.length, after.length);
  for (let i = 0; i < shared; i += 1) {
    if (before[i].key !== after[i].key) return i;
  }
  if (before.length !== after.length) return shared;
  return -1;
}

function describe(unit) {
  return unit ? unit.label + ' at line ' + unit.line : 'end of file';
}

export function compareUnits(before, after) {
  const at = firstMismatch(before, after);
  if (at < 0) return null;
  return { index: at, before: describe(before[at]), after: describe(after[at]), beforeCount: before.length, afterCount: after.length };
}

function joinUnits(source, files) {
  const all = [];
  for (const file of files) {
    const text = source.read(file);
    if (text === null) throw new Error('Missing in ' + source.label + ': ' + file);
    const units = unitsFor(file, text);
    if (units === null) throw new Error('Not a .js, .mjs or .css file: ' + file);
    all.push(...units);
  }
  return all;
}

function splitList(value) {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function compare(beforeSource, afterSource, opts = {}) {
  const results = [];
  if (opts['before-files'] || opts['after-files']) {
    if (!opts['before-files'] || !opts['after-files']) throw new Error('--before-files and --after-files go together');
    const bf = splitList(opts['before-files']);
    const af = splitList(opts['after-files']);
    const diff = compareUnits(joinUnits(beforeSource, bf), joinUnits(afterSource, af));
    results.push({ name: bf.join('+') + ' vs ' + af.join('+'), diff });
    return results;
  }
  const beforeList = beforeSource.list();
  const afterSet = new Set(afterSource.list());
  const candidates = opts.files ? splitList(opts.files) : beforeList.filter((f) => JS_EXT.test(f) || CSS_EXT.test(f));
  for (const file of candidates) {
    const beforeText = beforeSource.read(file);
    if (beforeText === null) {
      results.push({ name: file, diff: { note: 'missing before' } });
      continue;
    }
    if (!afterSet.has(file) && afterSource.read(file) === null) {
      results.push({ name: file, diff: { note: 'missing after' } });
      continue;
    }
    const afterText = afterSource.read(file);
    const units = unitsFor(file, beforeText);
    if (units === null) continue;
    results.push({ name: file, diff: compareUnits(units, unitsFor(file, afterText)) });
  }
  if (!opts.files) {
    const beforeSet = new Set(beforeList);
    for (const file of afterSet) {
      const isCode = JS_EXT.test(file) || CSS_EXT.test(file);
      if (isCode && !beforeSet.has(file)) results.push({ name: file, diff: { note: 'added after' } });
    }
  }
  return results;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message + '\n' + USAGE);
    process.exit(2);
  }
  if (!opts.before || !opts.after) {
    console.error(USAGE);
    process.exit(2);
  }
  const gitDir = opts['git-dir'] ? path.resolve(opts['git-dir']) : process.cwd();
  const results = compare(openSource(opts.before, gitDir), openSource(opts.after, gitDir), opts);
  const differing = results.filter((r) => r.diff);
  for (const r of differing) {
    const d = r.diff;
    if (d.note) {
      console.log('[DIFF] ' + r.name + ': ' + d.note);
      continue;
    }
    console.log('[DIFF] ' + r.name + ': first difference at unit ' + d.index + ' (before: ' + d.before + '; after: ' + d.after + '); units ' + d.beforeCount + ' vs ' + d.afterCount);
  }
  console.log('RESULT ' + (differing.length ? 'DIFFERENT' : 'IDENTICAL') + ': ' + (results.length - differing.length) + ' of ' + results.length + ' compared are identical');
  process.exit(differing.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
