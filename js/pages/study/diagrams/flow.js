import { diagramCite } from '/js/pages/study/diagrams/cite.js';
import { bodyStory, storySrc } from '/js/pages/study/story.js';
import { escapeStudy } from '/js/pages/study/references.js';

    /* A flow keeps its steps stacked in order, with a rail and a travelling
       highlight on entrance and on Replay; a step opens the full-screen reader
       as its scene.
       `continuation` marks steps already shown in the neighbouring diagram of
       the same kind, and the beat the sweep enters on. */
    export const FLOW_ASIDES = {
      /* The one label a flow prints that is not a step field: the state Daniel
         12:1 has not yet reached, in the sitting's own words. */
      's10-2': { step: 0, counter: 'Hebrews 7:25 is the ministry of this age' }
    };

    export function bodyFlow(spec, steps, canResolve, diagramId, continuation) {
      const aside = FLOW_ASIDES[diagramId] || null;
      const shared = (continuation && continuation.shared) || new Set();
      const last = steps.length - 1;
      const enter = Math.max(0, Math.min(last, (continuation && continuation.enter) || 0));
      // One beat per step: the mark on the rail lights as the highlight reaches
      // it, and the cards keep the stagger they have always had.
      const BEAT = 0.35;
      const lit = (i) => 0.15 + Math.max(0, i - enter) * BEAT;
      const travel = (lit(last) + 0.9).toFixed(2) + 's';
      const parts = [];
      steps.forEach((step, i) => {
        if (i > 0) {
          // The segment of rail between two steps, drawn in as the light arrives.
          parts.push('<div class="flow-connector" style="--t:' + (lit(i - 1) + BEAT / 2).toFixed(2) + 's" aria-hidden="true">' +
            '<span class="flow-connector-line"></span>' +
            '<span class="flow-connector-tip"></span>' +
          '</div>');
        }
        const asideHere = !!aside && aside.step === i;
        // The step's own words name its marker for a screen reader; the card
        // around the marker is the pointer target for the same scene.
        const label = String(step.title || step.role || ('Step ' + (i + 1)));
        parts.push('<div class="flow-step' + (shared.has(i) ? ' is-shared' : '') + (step.centre ? ' is-centre' : '') + (asideHere ? ' has-aside' : '') + '"' +
          ' data-index="' + i + '" style="--t:' + (0.1 + i * BEAT).toFixed(2) + 's">' +
          '<button class="flow-node" type="button" aria-label="' + escapeStudy(label) + '">' +
            '<span class="flow-node-dot" style="--t:' + lit(i).toFixed(2) + 's" aria-hidden="true"></span>' +
          '</button>' +
          '<span class="flow-scene-mark" aria-hidden="true">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2 9.6 6.4M2 14l4.4-4.4"/></svg>' +
          '</span>' +
          '<div class="flow-content">' +
            // A centre keeps the medal the story carousel gives one, so a centre
            // movement reads the same in both renderers.
            (step.centre && !storySrc(step)
              ? '<div class="story-medal" aria-hidden="true"><svg viewBox="0 0 140 140" fill="none" stroke="currentColor"><circle cx="70" cy="70" r="58" stroke-width="1.2"/><path d="M70 36V106M51 58H89" stroke-width="3.5" stroke-linecap="round"/></svg></div>'
              : '') +
            (step.role ? '<p class="chain-role">' + escapeStudy(step.role) + '</p>' : '') +
            (step.title ? '<h4 class="chain-title">' + escapeStudy(step.title) + '</h4>' : '') +
            diagramCite(step.cite, canResolve) +
            // A `text` that hangs beside the step as a side-note is not repeated
            // inside it.
            (step.text && !asideHere ? '<p class="chain-text">' + escapeStudy(step.text) + '</p>' : '') +
            ((step.points || []).length
              ? '<ul class="flow-points">' + step.points.map((p) => '<li>' + escapeStudy(p) + '</li>').join('') + '</ul>'
              : '') +
          '</div>' +
          (asideHere
            ? '<aside class="flow-aside">' +
                (step.text ? '<p class="flow-note">' + escapeStudy(step.text) + '</p>' : '') +
                (aside.counter ? '<p class="flow-counter">' + escapeStudy(aside.counter) + '</p>' : '') +
              '</aside>'
            : '') +
        '</div>');
      });
      // The scene layer: the same steps again as reader cards, so a step can open
      // the course's existing full-screen reader. The carousel they belong to
      // stays hidden — a flow's order must remain visible at once — and only its
      // `.story-read` dialog is ever shown.
      return '<div class="flow-stack" style="--flow-travel:' + travel + '"' +
          (enter > 0 ? ' data-flow-enter="' + enter + '"' : '') + '>' +
          '<div class="flow-rail" aria-hidden="true"><span class="flow-rail-pulse"></span></div>' +
          parts.join('') +
        '</div>' +
        '<div class="flow-scenes" hidden aria-hidden="true">' + bodyStory(spec, steps, canResolve, 0, diagramId) + '</div>';
    }

    /* A flow's scenes. Each step opens the course's existing full-screen reader
       on its own card — `wireStory` builds that reader and exposes the one way
       in, so nothing here draws a second overlay — and a chain that continues a
       node from the diagram before it starts its sweep there rather than
       replaying the beats the reader has just seen. */
    export function wireFlow(figure) {
      const stack = figure.querySelector('.flow-stack');
      const steps = Array.from(figure.querySelectorAll('.flow-step'));
      const openScene = figure.__openStoryScene;
      if (!stack || !steps.length || typeof openScene !== 'function') return;

      steps.forEach((node) => {
        const index = Number(node.getAttribute('data-index'));
        if (!Number.isFinite(index)) return;
        const marker = node.querySelector('.flow-node');
        node.addEventListener('click', (event) => {
          // The citation chip is its own control, exactly as it is on a story card.
          if (event.target.closest && event.target.closest('.chain-cite')) return;
          // The reader hands focus back to whatever held it when it opened, so
          // the step's own marker takes focus first and Escape returns here.
          if (marker && typeof marker.focus === 'function') marker.focus({ preventScroll: true });
          openScene(index);
        });
      });

      // Where the highlight enters: a percentage of the rail, measured once the
      // stack has a height, so a later reflow cannot leave it stranded.
      const enter = Number(stack.getAttribute('data-flow-enter'));
      const from = Number.isFinite(enter) && enter > 0 ? steps[enter] : null;
      const marker = from ? from.querySelector('.flow-node') : null;
      if (from && marker && stack.offsetHeight) {
        const centre = from.offsetTop + marker.offsetTop + marker.offsetHeight / 2;
        stack.style.setProperty('--flow-from', ((centre / stack.offsetHeight) * 100).toFixed(1) + '%');
      }
    }

    /* A chain can continue across two diagrams (s4-4 and s4-5 split Daniel 4 at
       4:34). A step whose title appeared in the neighbouring diagram of the
       same kind gets the same bead, and the later sweep starts there. The match
       reads only `title`. */
    export function flowContinuation(figure, specs, kind) {
      const out = { shared: new Set(), enter: 0 };
      const article = figure.closest('#sheet-article');
      const own = specs[figure.getAttribute('data-diagram')];
      const ownSteps = (own && Array.isArray(own.steps)) ? own.steps : [];
      if (!article || !ownSteps.length) return out;
      const figures = Array.from(article.querySelectorAll('figure[data-diagram]'));
      const at = figures.indexOf(figure);
      if (at < 0) return out;
      // Only a neighbour drawn by the same renderer can be the other half of the
      // chain: a comparison or a timeline beside this diagram is not a sequence.
      const neighbourTitles = (dir) => {
        for (let i = at + dir; i >= 0 && i < figures.length; i += dir) {
          const spec = specs[figures[i].getAttribute('data-diagram')];
          if (!spec || (spec.kind || 'chain') !== kind) continue;
          const steps = Array.isArray(spec.steps) ? spec.steps : [];
          if (steps.length) return steps.map((step) => String(step.title || '').trim()).filter(Boolean);
        }
        return [];
      };
      const words = (text) => String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
      // Function words carry no subject, so they are not evidence either way:
      // "He lifts his eyes" and "Nebuchadnezzar lifts his eyes to heaven" are the
      // same beat said twice, and so are the two verbatim titles.
      const EMPTY_WORDS = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'for', 'by', 'and', 'as', 'at', 'on', 'with',
        'he', 'she', 'it', 'its', 'his', 'her', 'their', 'them', 'they', 'this', 'that']);
      const isSameBeat = (mine, other) => {
        const [short, long] = mine.length <= other.length ? [mine, other] : [other, mine];
        const subject = short.filter((word) => !EMPTY_WORDS.has(word));
        const bag = new Set(long);
        // Two subject words is the floor: a one-word title like "Prologue"
        // cannot match a neighbour by accident.
        return subject.length >= 2 && subject.every((word) => bag.has(word));
      };
      const near = neighbourTitles(-1).concat(neighbourTitles(1)).map(words);
      ownSteps.forEach((step, i) => {
        const mine = words(step.title || '');
        if (near.some((other) => isSameBeat(mine, other))) out.shared.add(i);
      });
      // The sweep enters on the carried-over node — the last beat of the run this
      // diagram repeats — and only when the run is at the head of the chain.
      let head = 0;
      while (head < ownSteps.length && out.shared.has(head)) head += 1;
      out.enter = head > 0 ? head - 1 : 0;
      return out;
    }
