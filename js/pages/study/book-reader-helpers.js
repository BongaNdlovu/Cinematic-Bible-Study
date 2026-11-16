(function () {
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }
  function classTokens(value) {
    return String(value || '').split(/\s+/).filter(Boolean);
  }
  function deckPx(count, total) {
    if (count <= 0 || total <= 0) return '0px';
    return Math.max(2, Math.round((count / total) * 10)) + 'px';
  }

  window.BookReaderHelpers = Object.freeze({ clamp, classTokens, deckPx });
})();
