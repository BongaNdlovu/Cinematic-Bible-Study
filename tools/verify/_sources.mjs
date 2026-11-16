import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMPORT_RX = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]\/([^'"?]+)(?:\?[^'"]*)?['"]/gm;

function moduleImports(rel) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  return [...text.matchAll(IMPORT_RX)].map((m) => m[1]);
}

export function pageScripts(page) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const seen = new Set();
  const out = [];
  const visit = (rel, isModule) => {
    if (seen.has(rel) || !fs.existsSync(path.join(root, rel))) return;
    seen.add(rel);
    out.push(rel);
    if (isModule) moduleImports(rel).forEach((dep) => visit(dep, true));
  };
  for (const m of html.matchAll(/<script\b([^>]*)\bsrc="(?:\.\/)?([^"?]+\.js)(?:\?[^"]*)?"([^>]*)>/g)) {
    visit(m[2], /type="module"/.test(m[1] + m[3]));
  }
  return out;
}

export function pageLoads(page, rel) {
  return pageScripts(page).includes(rel);
}

export function studyPageScripts() {
  return pageScripts('study.html').filter((rel) => rel.startsWith('js/pages/study/'));
}

export function studyPageSource() {
  return studyPageScripts().map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
}
