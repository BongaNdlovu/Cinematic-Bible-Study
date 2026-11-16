import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let acorn = null;
try {
  acorn = await import('acorn');
} catch {
  acorn = null;
}

const root = process.cwd();
const TOP = 15;
const SOURCE_DIRS = ['js', 'css'];
const SKIP = /(^|\/)(node_modules|vendor|models|\.git)(\/|$)/;
const MINIFIED = /\.min\.(js|css)$/;

function tracked() {
  const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter(Boolean);
}

function isSource(file) {
  if (SKIP.test(file) || MINIFIED.test(file)) return false;
  if (!SOURCE_DIRS.some((d) => file.startsWith(d + '/'))) return false;
  return /\.(js|css)$/.test(file);
}

function parse(text) {
  if (!acorn) return null;
  const clean = text.replace(/^﻿/, '');
  const base = { ecmaVersion: 'latest', allowHashBang: true, allowReturnOutsideFunction: true };
  try {
    return acorn.parse(clean, { ...base, sourceType: 'script', locations: true });
  } catch {
    try {
      return acorn.parse(clean, { ...base, sourceType: 'module', locations: true });
    } catch {
      return null;
    }
  }
}

function collectFunctions(ast, file, out) {
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node === null || typeof node !== 'object' || typeof node.type !== 'string') return;
    const isFn = node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
    if (isFn) {
      const name = node.id ? node.id.name : null;
      out.push({ file, name, lines: node.loc.end.line - node.loc.start.line + 1, line: node.loc.start.line });
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      visit(node[key]);
    }
  };
  visit(ast);
}

function row(cells) {
  return '| ' + cells.join(' | ') + ' |';
}

const files = tracked().filter(isSource);
const sizes = [];
const functions = [];
const unparsed = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  sizes.push({ file, bytes: Buffer.byteLength(text), lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0) });
  if (!file.endsWith('.js')) continue;
  const ast = parse(text);
  if (!ast) {
    if (acorn) unparsed.push(file);
    continue;
  }
  collectFunctions(ast, file, functions);
}

const names = new Map();
for (const fn of functions) {
  if (!fn.name) continue;
  const set = names.get(fn.name) ?? new Set();
  set.add(fn.file);
  names.set(fn.name, set);
}
const duplicated = [...names.entries()].filter(([, set]) => set.size >= 2).sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));

const lines = [];
const jsFiles = sizes.filter((s) => s.file.endsWith('.js'));
const cssFiles = sizes.filter((s) => s.file.endsWith('.css'));
lines.push('Totals: ' + jsFiles.length + ' JS files, ' + jsFiles.reduce((n, s) => n + s.lines, 0) + ' JS lines; ' + cssFiles.length + ' CSS files, ' + cssFiles.reduce((n, s) => n + s.lines, 0) + ' CSS lines; ' + (acorn ? functions.length + ' functions parsed.' : 'functions not measured (acorn is not installed).'));
lines.push('');
lines.push('Largest files by lines');
lines.push(row(['File', 'Lines', 'Bytes']));
lines.push(row(['---', '---', '---']));
for (const s of [...sizes].sort((a, b) => b.lines - a.lines).slice(0, TOP)) lines.push(row([s.file, s.lines, s.bytes]));
if (!acorn) {
  console.log(lines.join('\n'));
  process.exit(0);
}
lines.push('');
lines.push('Longest functions');
lines.push(row(['File', 'Function', 'Line', 'Lines long']));
lines.push(row(['---', '---', '---', '---']));
for (const f of [...functions].sort((a, b) => b.lines - a.lines).slice(0, TOP)) lines.push(row([f.file, f.name ?? '(anonymous)', f.line, f.lines]));
lines.push('');
lines.push('Function names defined in two or more files: ' + duplicated.length);
lines.push(row(['Name', 'Files']));
lines.push(row(['---', '---']));
for (const [name, set] of duplicated.slice(0, TOP)) lines.push(row([name, set.size]));
if (unparsed.length) {
  lines.push('');
  lines.push('Not parsed (skipped from function counts): ' + unparsed.join(', '));
}
console.log(lines.join('\n'));
