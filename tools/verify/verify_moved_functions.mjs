import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as acorn from 'acorn';

const DROP_KEYS = new Set(['start', 'end', 'loc', 'range', 'raw']);
const USAGE = 'Usage: node tools/verify/verify_moved_functions.mjs --before <file|git:REV:file>[,…] --after <file>[,…] --names a,b,c (function declarations and const/let/var bindings)';

function readSpec(spec) {
  if (!spec.startsWith('git:')) return fs.readFileSync(spec, 'utf8');
  return execFileSync('git', ['show', spec.slice(4)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function parse(src) {
  const opts = { ecmaVersion: 'latest', allowHashBang: true, allowReturnOutsideFunction: true };
  try {
    return acorn.parse(src, { ...opts, sourceType: 'module' });
  } catch {
    return acorn.parse(src, { ...opts, sourceType: 'script' });
  }
}

function strip(node) {
  if (Array.isArray(node)) return node.map(strip);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const key of Object.keys(node)) {
    if (!DROP_KEYS.has(key)) out[key] = strip(node[key]);
  }
  return out;
}

function collectFunctions(ast, into) {
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id) {
      const list = into.get(node.id.name) || [];
      list.push(JSON.stringify(strip(node)));
      into.set(node.id.name, list);
    }
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id.type !== 'Identifier') continue;
        const list = into.get(decl.id.name) || [];
        list.push(JSON.stringify({ kind: node.kind, init: strip(decl.init) }));
        into.set(decl.id.name, list);
      }
    }
    for (const key of Object.keys(node)) {
      if (!DROP_KEYS.has(key)) visit(node[key]);
    }
  };
  visit(ast);
  return into;
}

function functionsIn(specs) {
  const found = new Map();
  for (const spec of specs) collectFunctions(parse(readSpec(spec)), found);
  return found;
}

export function compareMoved(beforeSpecs, afterSpecs, names) {
  const before = functionsIn(beforeSpecs);
  const after = functionsIn(afterSpecs);
  const problems = [];
  for (const name of names) {
    const b = before.get(name) || [];
    const a = after.get(name) || [];
    if (b.length !== 1) problems.push(name + ': ' + b.length + ' declarations before');
    else if (a.length !== 1) problems.push(name + ': ' + a.length + ' declarations after');
    else if (a[0] !== b[0]) problems.push(name + ': syntax tree differs');
  }
  return problems;
}

function main(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) opts[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!opts.before || !opts.after || !opts.names) {
    console.error(USAGE);
    return 2;
  }
  const names = opts.names.split(',').filter(Boolean);
  const problems = compareMoved(opts.before.split(','), opts.after.split(','), names);
  if (problems.length) {
    problems.forEach((p) => console.error('FAIL ' + p));
    return 1;
  }
  console.log('OK ' + names.length + ' declarations have identical syntax trees after the move.');
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  process.exitCode = main(process.argv.slice(2));
}
