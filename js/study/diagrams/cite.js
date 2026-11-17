import { escapeStudy, normalBook } from '/js/study/references.js';

    /* Chain diagram: cards joined by arrows that draw in, the middle node as a
       medalled centre. The entrance plays on scroll into view, can be replayed,
       and is skipped under prefers-reduced-motion. */
    /* Each sitting's diagrams are specs in `sheet.diagrams`, keyed to
       `figure[data-diagram]` markers; renderSheetDiagrams() fills the markers
       in place.
       Kinds: chain, steps, comparison, table, timeline, flow, mindmap. The
       original ASCII art stays hidden in each figure for search and copy. A
       cite the sitting's list does not carry prints as a flat label. */

    /* A diagram's printed reference renders as a chip that opens the matching
       reference row. References the sitting's list does not carry — chapter-only
       labels like "Daniel 4", or a book this sitting never documents — are
       printed as plain text instead, so nothing is lost and nothing is a dead
       control. `canResolve` is supplied by the renderer for the current sitting. */
    export function diagramCite(label, canResolve) {
      const text = String(label || '');
      if (!text) return '';
      if (canResolve && !canResolve(text)) {
        return '<span class="chain-cite is-flat">' + escapeStudy(text) + '</span>';
      }
      return '<button type="button" class="chain-cite" data-cite-src="' + escapeStudy(text) + '">' + escapeStudy(text) + '</button>';
    }

    // Does this printed reference correspond to a reference row for the sitting?
    export function makeCiteResolver(refs) {
      const bySlot = new Map();
      const spans = [];
      refs.forEach((r) => {
        r.slots.forEach((s) => { if (!bySlot.has(s)) bySlot.set(s, r); });
        (r.ranges || []).forEach((rg) => spans.push({ book: rg.book, chapter: rg.chapter, lo: rg.lo, hi: rg.hi, ref: r }));
      });
      return (label) => {
        const text = String(label || '');
        const colon = text.indexOf(':');
        if (colon < 0) return false;
        const before = text.slice(0, colon);
        const book = normalBook(before.replace(/\s*\d+\s*$/, '').trim());
        const chapter = (before.match(/(\d+)\s*$/) || [])[1];
        if (!book || !chapter) return false;
        return spans.some((sp) => sp.book === book && String(sp.chapter) === String(chapter)) ||
          [...bySlot.keys()].some((k) => k.startsWith(book + ' ' + chapter + ':'));
      };
    }
