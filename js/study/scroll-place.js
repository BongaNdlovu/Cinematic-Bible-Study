    function readScrollPlace() {
      try {
        const raw = JSON.parse(localStorage.getItem(SCROLL_KEY) || 'null');
        const sheet = raw && Number(raw.sheet);
        const top = raw && Number(raw.top);
        if (!Number.isFinite(sheet) || !Number.isFinite(top) || top < 0) return null;
        return { sheet: sheet, top: top };
      } catch (e) {
        return null;
      }
    }

    function writeScrollPlace(sheet, top) {
      try {
        localStorage.setItem(SCROLL_KEY, JSON.stringify({
          sheet: sheet,
          top: Math.max(0, Math.round(top))
        }));
      } catch (e) {}
    }

    function rememberSheetUrl(index) {
      try {
        const params = new URLSearchParams(location.search);
        params.delete('id');
        params.delete('section');
        params.set('sheet', String(index));
        const next = location.pathname + '?' + params.toString() + location.hash;
        if (next !== location.pathname + location.search + location.hash) {
          history.replaceState(null, '', next);
        }
      } catch (e) {}
    }
