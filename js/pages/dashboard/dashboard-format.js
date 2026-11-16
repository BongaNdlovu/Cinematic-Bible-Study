(function () {
  function csvEscape(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function num(n) {
    const v = Number(n) || 0;
    try {
      return new Intl.NumberFormat(undefined).format(v);
    } catch (e) {
      return String(v);
    }
  }
  function pct(part, whole) {
    return whole ? Math.round((part / whole) * 100) : 0;
  }
  function duration(sec) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    return m + 'm ' + (r < 10 ? '0' : '') + r + 's';
  }
  function plural(n, one, many) {
    return num(n) + ' ' + (n === 1 ? one : many);
  }
  function countBy(arr, keyFn) {
    const map = Object.create(null);
    arr.forEach(function (item) {
      const k = keyFn(item);
      if (k == null || k === '') return;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function day(iso) {
    const when = new Date(iso);
    if (!iso || Number.isNaN(when.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(when);
    } catch (e) {
      return when.toISOString().slice(0, 10);
    }
  }
  function scoreOf(p) {
    const raw = p.rating != null ? p.rating : (p.responses && p.responses.score);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }
  function quarterBounds(now) {
    const d = now || new Date();
    const q = Math.floor(d.getUTCMonth() / 3);
    const start = new Date(Date.UTC(d.getUTCFullYear(), q * 3 - 3, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 0));
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  window.InsightsFormat = Object.freeze({ csvEscape, num, pct, duration, plural, countBy, day, scoreOf, quarterBounds });
})();
