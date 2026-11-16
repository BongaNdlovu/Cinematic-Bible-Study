import fs from 'node:fs';
import postcss from 'postcss';
const files = fs.readdirSync('css/study').filter((n) => n.endsWith('.css')).sort();
const groups = { 'print (@media print)': 0, 'reduced motion (@media prefers-reduced-motion)': 0, 'theme override (paper, white, charcoal, night, dark)': 0, 'full-screen diagram (.is-full, dfx-)': 0, 'article base (.article-body p / h4 font-size)': 0, 'other': 0 };
const otherProps = {};
const otherFiles = {};
let total = 0;
for (const f of files) {
  postcss.parse(fs.readFileSync('css/study/' + f, 'utf8')).walkDecls((d) => {
    if (!d.important) return;
    total += 1;
    const ctx = [];
    for (let p = d.parent; p; p = p.parent) if (p.type === 'atrule') ctx.push(p.params);
    const sel = d.parent.type === 'rule' ? d.parent.selector : '';
    const media = ctx.join(' ');
    let g = 'other';
    if (/print/.test(media)) g = 'print (@media print)';
    else if (/reduced-motion/.test(media)) g = 'reduced motion (@media prefers-reduced-motion)';
    else if (/paper-mode|white-mode|charcoal-mode|night-mode|html\.dark|\.dark\b/.test(sel)) g = 'theme override (paper, white, charcoal, night, dark)';
    else if (/is-full|dfx-/.test(sel)) g = 'full-screen diagram (.is-full, dfx-)';
    else if (/^\.article-body (p|h4)$/.test(sel.trim())) g = 'article base (.article-body p / h4 font-size)';
    groups[g] += 1;
    if (g === 'other') { otherProps[d.prop] = (otherProps[d.prop] || 0) + 1; otherFiles[f] = (otherFiles[f] || 0) + 1; }
  });
}
console.log('total ' + total);
for (const [g, n] of Object.entries(groups)) console.log(String(n).padStart(4) + '  ' + g);
console.log('other, by property: ' + Object.entries(otherProps).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
console.log('other, by file: ' + Object.entries(otherFiles).map(([k, v]) => k + ' ' + v).join(', '));
