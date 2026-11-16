import { diagramCite } from '/js/study/diagrams/cite.js';
import { escapeStudy } from '/js/study/references.js';

    export function nodeHtml(step, isCentre, t, canResolve) {
      return '<article class="chain-node' + (isCentre ? ' is-centre' : '') + '" style="--t:' + t.toFixed(2) + 's">' +
        (isCentre
          ? '<div class="chain-medal" aria-hidden="true">' +
              '<svg viewBox="0 0 140 140" fill="none" stroke="currentColor">' +
                '<circle cx="70" cy="70" r="68" stroke-opacity=".35" stroke-width="1"/>' +
                '<circle cx="70" cy="70" r="58" stroke-opacity=".7" stroke-width="1.2"/>' +
                '<path d="M70 36V106M51 58H89" stroke-width="3.5" stroke-linecap="round"/>' +
              '</svg>' +
            '</div>'
          : (step.role ? '<p class="chain-role">' + escapeStudy(step.role) + '</p>' : '')) +
        (step.title ? '<h4 class="chain-title">' + escapeStudy(step.title) + '</h4>' : '') +
        diagramCite(step.cite, canResolve) +
        (step.text ? '<p class="chain-text">' + escapeStudy(step.text) + '</p>' : '') +
      '</article>';
    }

    export function bodyChain(spec, steps, withCentre, canResolve) {
      const mid = withCentre ? steps.findIndex((s) => s.centre) : -1;
      let t = 0.1;
      const parts = [];
      steps.forEach((step, i) => {
        if (i > 0) {
          t += 0.4;
          parts.push('<div class="chain-link" style="--t:' + t.toFixed(2) + 's" aria-hidden="true">' +
            '<span class="chain-link-line"></span><span class="chain-link-head"></span></div>');
          t += 0.5;
        }
        parts.push(nodeHtml(step, i === mid, t, canResolve));
      });
      // More than three cards form a grid (.chain-flow.is-dense in
      // css/study/03-chain.css):
      // two columns for four cards, three columns otherwise, read left to right.
      const dense = steps.length > 3;
      const flowClass = 'chain-flow' + (dense ? ' is-dense' : '');
      const flowStyle = dense ? ' style="--chain-cols:' + (steps.length === 4 ? 2 : 3) + '"' : '';
      return '<div class="' + flowClass + '"' + flowStyle + '>' + parts.join('') + '</div>';
    }
