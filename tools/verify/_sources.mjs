import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function studyPageScripts() {
  const html = fs.readFileSync(path.join(root, 'study.html'), 'utf8');
  return [...html.matchAll(/<script src="(js\/study\/[^"?]+\.js)"/g)].map((m) => m[1]);
}

export function studyPageSource() {
  return studyPageScripts().map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
}
