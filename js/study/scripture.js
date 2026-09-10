(function () {
  const STORY_KEY = "baScriptureStory";

  let root = null;
  let books = {};
  let strongs = {};
  let sheets = {};
  let loadError = "";
  let ready = null;
  let storyMode = false;
  let currentSheet = 0;
  let openStrongId = "";

  function loadStoryPref() {
    try {
      return localStorage.getItem(STORY_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveStoryPref(on) {
    try {
      localStorage.setItem(STORY_KEY, on ? "1" : "0");
    } catch (e) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function verseSet(highlights) {
    const set = {};
    (highlights || []).forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const from = Number(item[0]);
        const to = Number(item[1]);
        if (Number.isNaN(from) || Number.isNaN(to)) return;
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        for (let n = lo; n <= hi; n += 1) set[n] = true;
      } else {
        const n = Number(item);
        if (!Number.isNaN(n)) set[n] = true;
      }
    });
    return set;
  }

  function passageForSheet(index) {
    const key = String(index);
    return sheets[key] || sheets["0"] || null;
  }

  function isHighlighted(sheetIndex, book, chapter, verse) {
    const passage = passageForSheet(sheetIndex);
    if (!passage) return false;
    return (passage.sections || []).some((section) => {
      if (section.book !== book || Number(section.chapter) !== Number(chapter)) return false;
      return !!verseSet(section.highlights)[Number(verse)];
    });
  }

  function chapterVerses(book, chapter) {
    const ch = books[book] && books[book][String(chapter)];
    if (!ch) return [];
    return Object.keys(ch)
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b)
      .map((n) => ({ verse: n, text: ch[String(n)] || "" }));
  }

  function verseText(book, chapter, verse) {
    const ch = books[book] && books[book][String(chapter)];
    return (ch && ch[String(verse)]) || "";
  }

  function renderRefList(items, className) {
    if (!items || !items.length) return "";
    return '<ul class="' + className + '">' + items.map((item) => {
      if (typeof item === "string") return "<li>" + escapeHtml(item) + "</li>";
      const ref = item.ref || "";
      const note = item.gloss || item.note || "";
      return "<li><strong>" + escapeHtml(ref) + "</strong> " + escapeHtml(note) + "</li>";
    }).join("") + "</ul>";
  }

  function versesForSection(section) {
    const all = chapterVerses(section.book, section.chapter);
    if (!all.length) return [];
    if (section.verses === "all" || section.verses == null) return all;
    const want = {};
    (section.verses || []).forEach((n) => { want[Number(n)] = true; });
    return all.filter((row) => want[row.verse]);
  }

  function normalizeNeedle(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, "\"");
  }

  function findPhrase(text, phrase) {
    const hay = normalizeNeedle(text);
    const needle = normalizeNeedle(phrase);
    if (!needle) return -1;
    return hay.indexOf(needle);
  }

  function stationForVerse(passage, book, chapter, verse) {
    const hit = (passage.stations || []).find((row) => (
      row.book === book && Number(row.chapter) === Number(chapter) && Number(row.verse) === Number(verse)
    ));
    return hit ? hit.station : "";
  }

  function marksForVerse(passage, book, chapter, verse) {
    return (passage.marks || []).filter((row) => (
      row.book === book && Number(row.chapter) === Number(chapter) && Number(row.verse) === Number(verse)
    ));
  }

  function wrapMarks(text, marks) {
    if (!marks.length) return escapeHtml(text);
    const ranges = [];
    marks.forEach((mark, idx) => {
      const start = findPhrase(text, mark.phrase);
      if (start < 0) return;
      ranges.push({
        start: start,
        end: start + mark.phrase.length,
        mark: mark,
        idx: idx
      });
    });
    ranges.sort((a, b) => a.start - b.start || b.end - a.end);
    const kept = [];
    let cursor = 0;
    ranges.forEach((range) => {
      if (range.start < cursor) return;
      kept.push(range);
      cursor = range.end;
    });
    if (!kept.length) return escapeHtml(text);
    let html = "";
    let at = 0;
    kept.forEach((range) => {
      html += escapeHtml(text.slice(at, range.start));
      const stationAttr = range.mark.station ? ' data-station="' + escapeHtml(range.mark.station) + '"' : "";
      html += '<button type="button" class="strong-mark" data-strong="' + escapeHtml(range.mark.strong) + '"' + stationAttr + ">";
      html += escapeHtml(text.slice(range.start, range.end));
      html += "</button>";
      at = range.end;
    });
    html += escapeHtml(text.slice(at));
    return html;
  }

  function renderVerse(passage, section, row, firstHighlight) {
    const highlighted = !!verseSet(section.highlights)[row.verse];
    const station = stationForVerse(passage, section.book, section.chapter, row.verse);
    const marks = marksForVerse(passage, section.book, section.chapter, row.verse);
    const classes = ["scripture-verse"];
    if (highlighted) classes.push("is-highlight");
    if (station) classes.push("is-station");
    const id = firstHighlight ? ' id="scripture-focus"' : "";
    const stationAttr = station ? ' data-station="' + escapeHtml(station) + '"' : "";
    return (
      '<span class="' + classes.join(" ") + '"' + id + stationAttr +
      ' data-book="' + escapeHtml(section.book) + '"' +
      ' data-chapter="' + escapeHtml(section.chapter) + '"' +
      ' data-verse="' + escapeHtml(row.verse) + '">' +
      '<sup class="verse-num">' + escapeHtml(row.verse) + "</sup>" +
      wrapMarks(row.text, marks) +
      " </span>"
    );
  }

  function renderStrongDock() {
    const entry = strongs[openStrongId];
    if (!entry) {
      return '<aside class="strong-dock" id="strong-dock"><p class="strong-hint">Tap a gold-underlined word for Strong’s. Daniel 2:4b–7:28 is Aramaic; the rest of the book is Hebrew.</p></aside>';
    }
    let html = '<aside class="strong-dock is-open" id="strong-dock">';
    html += '<p class="strong-id">' + escapeHtml(openStrongId) + " · " + escapeHtml(entry.lang || "") + "</p>";
    html += "<h4>" + escapeHtml(entry.lemma || "") + " <i>" + escapeHtml(entry.translit || "") + "</i></h4>";
    if (entry.derivation) html += '<p class="strong-derivation">' + escapeHtml(entry.derivation) + "</p>";
    html += '<p class="strong-gloss">' + escapeHtml(entry.gloss || "") + "</p>";
    if (entry.danielHits && entry.danielHits.length) {
      html += '<p class="strong-label">In Daniel</p>' + renderRefList(entry.danielHits, "strong-hits");
    }
    if (entry.otherKjv && entry.otherKjv.length) {
      html += '<p class="strong-label">Elsewhere in the KJV</p>' + renderRefList(entry.otherKjv, "strong-other");
    }
    html += '<p class="strong-why">' + escapeHtml(entry.why || "") + "</p>";
    html += '<button type="button" class="strong-close" data-strong-close>Close Strong’s</button></aside>';
    return html;
  }

  function renderLoadBearing(passage) {
    const rows = (passage && passage.loadBearing) || [];
    if (!rows.length) return "";
    let html = '<aside class="load-bearing" id="load-bearing">';
    html += "<h4>Load-bearing lines</h4>";
    html += '<p class="strong-hint">The verses the sitting leans on. Companion books appear here as excerpts, not as extra full chapters.</p>';
    rows.forEach((row) => {
      const book = row.book || "";
      const chapter = row.chapter;
      const verse = row.verse;
      const text = verseText(book, chapter, verse);
      const ref = book + " " + chapter + ":" + verse;
      html += '<article class="load-bearing-line">';
      html += '<p class="load-bearing-ref">' + escapeHtml(ref) + "</p>";
      if (text) html += '<blockquote class="load-bearing-text">' + escapeHtml(text) + "</blockquote>";
      else html += renderEmpty(ref + " is missing from the local KJV file.");
      if (row.connects && row.connects.length) {
        html += '<p class="load-bearing-connects"><span>Connects</span> ' + escapeHtml(row.connects.join(" · ")) + "</p>";
      }
      if (row.sitting) html += '<p class="load-bearing-sitting">' + escapeHtml(row.sitting) + "</p>";
      html += "</article>";
    });
    html += "</aside>";
    return html;
  }

  function renderToolbar(passage) {
    const storyOn = storyMode ? " is-on" : "";
    const versesOn = storyMode ? "" : " is-on";
    return (
      '<div class="scripture-toolbar">' +
        '<div class="scripture-meta">' +
          "<strong>" + escapeHtml(passage.title || "Scripture") + "</strong>" +
          '<span class="scripture-lang">' + escapeHtml(passage.kicker || passage.language || "KJV") + "</span>" +
        "</div>" +
        '<div class="scripture-actions">' +
          '<button type="button" data-story="0" class="scripture-toggle' + versesOn + '">Verse numbers</button>' +
          '<button type="button" data-story="1" class="scripture-toggle' + storyOn + '">Read as story</button>' +
          '<button type="button" data-jump-highlights>' + escapeHtml(passage.jumpLabel || "Load-bearing lines") + "</button>" +
        "</div>" +
      "</div>"
    );
  }

  function renderEmpty(message) {
    return '<p class="scripture-empty">' + escapeHtml(message) + "</p>";
  }

  function renderSheetHtml(index) {
    if (loadError) {
      return renderEmpty("Scripture could not load. Serve the desk over HTTP so bible/kjv.json can be read. " + loadError);
    }
    const passage = passageForSheet(index);
    if (!passage) return renderEmpty("No KJV passage is mapped to this sheet.");
    let body = "";
    let placedFocus = false;
    (passage.sections || []).forEach((section) => {
      const rows = versesForSection(section);
      if (!rows.length) {
        body += renderEmpty(section.book + " " + section.chapter + " is missing from the local KJV file.");
        return;
      }
      const highlightMap = verseSet(section.highlights);
      body += '<section class="scripture-chapter">';
      body += "<h4>" + escapeHtml(section.book) + " " + escapeHtml(section.chapter) + "</h4>";
      body += '<div class="scripture-text">';
      rows.forEach((row) => {
        const first = !placedFocus && !!highlightMap[row.verse];
        if (first) placedFocus = true;
        body += renderVerse(passage, section, row, first);
      });
      body += "</div></section>";
    });
    if (!body) return renderToolbar(passage) + renderEmpty("This sheet has no verses to show.") + renderLoadBearing(passage) + renderStrongDock();
    return renderToolbar(passage) + '<div class="scripture-scroll">' + body + "</div>" + renderLoadBearing(passage) + renderStrongDock();
  }

  function scrollFocusIntoPanel() {
    if (!root) return;
    const box = root.querySelector(".scripture-scroll");
    const focus = root.querySelector("#scripture-focus");
    if (!box || !focus) return;
    const top = focus.offsetTop - box.offsetTop - 16;
    box.scrollTop = Math.max(0, top);
  }

  function applyStoryClass() {
    if (!root) return;
    root.classList.toggle("is-story", storyMode);
  }

  function paint() {
    if (!root) return;
    root.innerHTML = renderSheetHtml(currentSheet);
    applyStoryClass();
    requestAnimationFrame(scrollFocusIntoPanel);
  }

  function emitStation(station) {
    if (!station || !root) return;
    root.dispatchEvent(new CustomEvent("ba-scripture-station", {
      bubbles: true,
      detail: { sheet: currentSheet, station: station }
    }));
  }

  function onRootClick(ev) {
    const closer = ev.target.closest("[data-strong-close]");
    if (closer) {
      openStrongId = "";
      paint();
      return;
    }
    const storyBtn = ev.target.closest("[data-story]");
    if (storyBtn) {
      setStoryMode(storyBtn.getAttribute("data-story") === "1");
      return;
    }
    const jump = ev.target.closest("[data-jump-highlights]");
    if (jump) {
      const dock = root.querySelector("#load-bearing");
      if (dock && dock.scrollIntoView) dock.scrollIntoView({ behavior: "smooth", block: "nearest" });
      else scrollFocusIntoPanel();
      return;
    }
    const mark = ev.target.closest(".strong-mark");
    if (mark) {
      ev.stopPropagation();
      openStrongId = mark.getAttribute("data-strong") || "";
      paint();
      const dock = root.querySelector("#strong-dock");
      if (dock && dock.scrollIntoView) dock.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (mark.getAttribute("data-station")) emitStation(mark.getAttribute("data-station"));
      return;
    }
    const verse = ev.target.closest(".scripture-verse.is-station");
    if (verse) emitStation(verse.getAttribute("data-station"));
  }

  function bindRoot() {
    if (!root || root._baScriptureBound) return;
    root.addEventListener("click", onRootClick);
    root._baScriptureBound = true;
  }

  function ensureLoaded() {
    if (ready) return ready;
    ready = Promise.all([
      fetch("bible/kjv.json").then((res) => {
        if (!res.ok) throw new Error("kjv.json " + res.status);
        return res.json();
      }),
      fetch("bible/strongs-daniel.json").then((res) => {
        if (!res.ok) throw new Error("strongs-daniel.json " + res.status);
        return res.json();
      }),
      fetch("bible/sheet-passages.json").then((res) => {
        if (!res.ok) throw new Error("sheet-passages.json " + res.status);
        return res.json();
      })
    ]).then((bundle) => {
      books = (bundle[0] && bundle[0].books) || {};
      strongs = bundle[1] || {};
      sheets = bundle[2] || {};
      loadError = "";
      if (!books.Daniel || !books.Daniel["2"] || !books.Daniel["2"]["38"]) {
        loadError = "Daniel 2:38 is missing.";
      }
    }).catch((err) => {
      loadError = err && err.message ? err.message : String(err);
    });
    return ready;
  }

  function mount(el) {
    root = el || null;
    storyMode = loadStoryPref();
    if (!root) return ensureLoaded();
    bindRoot();
    return ensureLoaded().then(paint);
  }

  function showSheet(index) {
    const next = Number(index);
    currentSheet = Number.isNaN(next) ? 0 : next;
    openStrongId = "";
    if (!root) return ensureLoaded();
    return ensureLoaded().then(paint);
  }

  function setStoryMode(on) {
    storyMode = !!on;
    saveStoryPref(storyMode);
    applyStoryClass();
    if (root) {
      root.querySelectorAll("[data-story]").forEach((btn) => {
        btn.classList.toggle("is-on", (btn.getAttribute("data-story") === "1") === storyMode);
      });
    }
  }

  window.BAScripture = {
    mount: mount,
    showSheet: showSheet,
    setStoryMode: setStoryMode,
    passageForSheet: passageForSheet,
    isHighlighted: isHighlighted,
    verseSet: verseSet,
    findPhrase: findPhrase,
    whenReady: function () { return ensureLoaded(); }
  };
})();
