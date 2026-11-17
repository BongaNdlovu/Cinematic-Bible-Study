import { escapeStudy } from '/js/pages/study/references.js';

    /* Each row is two cells: the row label, and one `td` holding the row's data
       cells as a grid on the shared column template, so heads line up at any
       wrap.
       The grid must be a cell: the HTML parser moves any non-table child of
       `tr` out of the table. thead/th[scope] semantics and the `data-label`
       contract stay. */
    export function bodyTable(spec, rows) {
      const head = spec.head || [];
      const cols = Math.max(1, head.length - 1);
      const body = rows;
      /* Written once: the real `<th scope=col>` heads and the stacked layout's
         `data-label` captions are the same words. */
      const dataHeads = head.slice(1);
      return '<div class="tbl-wrap"><table class="tbl">' +
        (head.length
          ? '<thead><tr><th class="tbl-label" scope="col" aria-label="Row"></th>' +
            '<td class="tbl-grid is-head" style="--tbl-cols:' + cols + '">' +
              dataHeads.map((h) => '<span class="tbl-head" role="columnheader">' + escapeStudy(h) + '</span>').join('') +
            '</td></tr></thead>'
          : '') +
        '<tbody>' + body.map((r) => {
          const cells = r.cells || [];
          return '<tr>' +
            '<th class="tbl-label" scope="row">' + (cells.length ? escapeStudy(cells[0]) : '') + '</th>' +
            '<td class="tbl-grid" style="--tbl-cols:' + cols + '">' +
              cells.slice(1).map((c, ci) => '<span class="tbl-cell" data-label="' + escapeStudy(dataHeads[ci] || '') + '">' + escapeStudy(c) + '</span>').join('') +
            '</td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table></div>';
    }
