export function clean(t) {
  return String(t == null ? '' : t)
    .replace(/&bull;/g, '·').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…')
    .replace(/<[^>]*>/g, '');
}
export function split(t) { t = clean(t); const a = t.indexOf(':'); return a > 0 ? [t.slice(0, a).trim(), t.slice(a + 1).trim()] : [t.trim(), '']; }
export function cap(t) { return clean(t).toLowerCase().replace(/(^|[\s·])(\w)/g, (m, a, b) => a + b.toUpperCase()); }
export function num(t) { const m = /sheet\s*0*(\d+)/i.exec(clean(t)); return m ? Number(m[1]) : 0; }
export function roman(n) {
  n = Number(n) || 0;
  if (!n) return '0';
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}
export function shade(hex, amt) {
  const c = parseInt(hex.slice(1), 16);
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
export function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
export function wrapLines(x, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
export function fitLines(x, text, fontFor, maxW, maxLines, size, min) {
  for (let s = size; s >= min; s -= Math.max(1, s * 0.05)) {
    x.font = fontFor(s);
    const lines = wrapLines(x, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => x.measureText(l).width <= maxW)) return { size: s, lines };
  }
  x.font = fontFor(min);
  return { size: min, lines: wrapLines(x, text, maxW).slice(0, maxLines) };
}
export function shade2(hex, amt) {
  const c = parseInt(hex.slice(1), 16);
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
