    /* A comparison whose sides have equal points about the same things carries
       `rows` and renders as a real table; otherwise its sides stay parallel
       bullets.
       Cells are `points[]` verbatim. The row label is the only text this
       renderer adds. */
    function bodyComparison(spec, steps, canResolve) {
      const rows = Array.isArray(spec.rows) ? spec.rows : [];
      // A matrix only where the labels cover every side exactly. Anything else is
      // the parallel shape, which is what the data is when the counts disagree.
      const isMatrix = rows.length > 0 && steps.every((s) => (s.points || []).length === rows.length);

      // A head is sized by this standard, so its parts are spans: `.article-body
      // p` and `.article-body h4` both carry `font-size: … !important` for the
      // reader's text-size control, and either element would overrule the block.
      const colHead = (side) =>
        (side.role ? '<span class="chain-role cmp-role">' + escapeStudy(side.role) + '</span>' : '') +
        (side.title ? '<span class="chain-title cmp-title">' + escapeStudy(side.title) + '</span>' : '') +
        diagramCite(side.cite, canResolve);

      // Some comparisons branch from one labelled node rather than being a flat
      // pair of columns. `centre` renders that node above the columns, keeping
      // its reference a resolvable chip instead of demoting it to a note.
      const c = spec.centre;
      const centreHtml = c
        ? '<div class="cmp-centre" style="--t:0.1s">' +
            (c.role ? '<span class="chain-role cmp-role">' + escapeStudy(c.role) + '</span>' : '') +
            (c.title ? '<span class="chain-title cmp-title">' + escapeStudy(c.title) + '</span>' : '') +
            diagramCite(c.cite, canResolve) +
            (c.text ? '<p class="chain-text">' + escapeStudy(c.text) + '</p>' : '') +
          '</div>' +
          '<div class="cmp-stem" aria-hidden="true"></div>'
        : '';

      if (isMatrix) {
        // `th[scope=col]` for a column's identity and `th[scope=row]` for a row's,
        // so the matrix stays a table for a screen reader. The stacked phone
        // layout captions each value from `data-label`, the column it came from.
        const head = '<tr class="cmp-headrow" style="--t:0.1s">' +
          '<td class="cmp-corner"></td>' +
          steps.map((side) => '<th scope="col" class="cmp-colhead">' + colHead(side) + '</th>').join('') +
        '</tr>';
        const body = rows.map((label, r) =>
          // The stagger stops climbing after the eighth row: eleven rows of
          // narrative should arrive as one movement, not as a queue.
          '<tr style="--t:' + (0.16 + Math.min(r, 8) * 0.05).toFixed(2) + 's">' +
            '<th scope="row" class="cmp-rowhead">' + escapeStudy(label) + '</th>' +
            steps.map((side) => '<td data-label="' + escapeStudy(side.title || side.role || '') + '">' +
              escapeStudy((side.points || [])[r] || '') + '</td>').join('') +
          '</tr>').join('');
        return '<div class="cmp is-matrix' + (c ? ' has-centre' : '') + '">' + centreHtml +
          '<div class="cmp-matrix-wrap">' +
            '<table class="cmp-matrix">' +
              '<thead>' + head + '</thead>' +
              '<tbody>' + body + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
      }

      // Parallel columns. The head is a row of its own above the panels, so a
      // column's identity sits in the same place in both shapes, and `--cmp-i`
      // is what the stacked layout orders each head with its own panel by.
      const at = (i) => (0.1 + i * 0.25).toFixed(2) + 's;--cmp-i:' + i;
      const cols = steps.map((side, i) =>
        '<div class="cmp-head" style="--t:' + at(i) + '">' + colHead(side) + '</div>').join('') +
        steps.map((side, i) =>
          '<div class="cmp-col' + (i === 0 ? ' is-first' : '') + '" style="--t:' + at(i) + '">' +
            '<ul class="cmp-list">' +
              (side.points || []).map((p) => '<li>' + escapeStudy(p) + '</li>').join('') +
            '</ul>' +
          '</div>').join('');
      // Column count follows the data: some comparisons have two sides, the
      // schools comparison has three.
      return '<div class="cmp' + (c ? ' has-centre' : '') + '">' + centreHtml +
        '<div class="cmp-grid' + (steps.length >= 3 ? ' is-three' : '') + '" style="--cmp-cols:' + Math.max(2, steps.length) + '">' + cols + '</div>' +
      '</div>';
    }
