import { diagramCite } from '/js/pages/study/diagrams/cite.js';
import { escapeStudy } from '/js/pages/study/references.js';

    /* Timeline: milestones are dates the spec already prints (an axis end, or a
       year in a track's `role` or a segment's `label`).
       Years are astronomical (457 B.C. is -456). Milestones sit on an even
       beat, because A.D. 27, 31 and 34 would share one dot on a 2,300-year
       axis; `.tlx-scale` shows the true proportions. No copy is authored here. */
    export const TLX_W = 1600;

    export const TLX_EDGE = 150;

    export const TLX_LEVEL = 48;

    export const TLX_BRACKET_Y = 66;

    export const TLX_PALETTE = ['#7db3e8', '#f2c75a', '#e8695d', '#b79af0', '#5fc4b0'];

    export const TLX_FINAL = '#fff1c9';

    export const TLX_GILT = '#dcb257';

    /* The reference's own icon set, on its 24-unit grid. */
    export const TLX_ICONS = {
      scroll: 'M6 3h9l4 4v14H6ZM15 3v4h4M9 12h7M9 16h7',
      drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
      cross: 'M12 3v18M6.5 9h11',
      globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 2.7 3 15.3 0 18M12 3c-3 2.7-3 15.3 0 18',
      hourglass: 'M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4',
      temple: 'M3 20h18M5 20V11M19 20V11M3 11l9-7 9 7M9 20v-5h6v5',
      ring: 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2ZM12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z'
    };

    /* Which badge a milestone wears is read off the milestone's own words. */
    export const TLX_ICON_RULES = [
      [/decree|restore|rebuild|command|edict/i, 'scroll'],
      [/baptis|anoint|messiah|spirit/i, 'drop'],
      [/cross|cut off|midst|death/i, 'cross'],
      [/cleans|sanctuar|atonement|temple|church|pope|papacy|roman|judgment/i, 'temple'],
      [/wait|centur|remain|long stretch|time of the end/i, 'hourglass'],
      [/gospel|gentile|nation|world|week|seventy/i, 'globe'],
      [/prophec|unseal|vision|seal/i, 'scroll']
    ];

    export const TLX_YEAR_RX = /(\d[\d,]*)\s*(B\.C\.|A\.D\.)|(B\.C\.|A\.D\.)\s*(\d[\d,]*)/g;

    export const TLX_BREAK_RX = /\s*:\s+|\s*(?:→|—|–)\s*|\s*;\s*/;

    export const TLX_JOIN_RX = /^(?:to|and|then|until|til)\b[\s:,]*/i;

    export const TLX_TAIL_RX = /\s+(?:to|and|then|until|til)$/i;

    /* Every dated token in a string, in order. `year` is the astronomical year —
       457 B.C. is -456 — which is what makes a span between two dates
       subtractable, so a milestone needs no position table. */
    export function tlxYears(text) {
      const src = String(text == null ? '' : text);
      const out = [];
      TLX_YEAR_RX.lastIndex = 0;
      let m = TLX_YEAR_RX.exec(src);
      while (m) {
        const era = m[2] || m[3];
        const n = parseInt(String(m[1] || m[4]).replace(/,/g, ''), 10);
        if (Number.isFinite(n)) {
          out.push({ at: m.index, end: TLX_YEAR_RX.lastIndex, label: m[0].replace(/\s+/g, ' ').trim(), year: era === 'B.C.' ? 1 - n : n });
        }
        m = TLX_YEAR_RX.exec(src);
      }
      return out;
    }

    /* A label's clauses. Only a separator that introduces one splits, so
       "2,300 Years (Daniel 8:14)" survives whole while "483 Years: 457 B.C. …"
       reads as "483 Years". */
    export function tlxClauses(label) {
      return String(label == null ? '' : label).split(TLX_BREAK_RX).map((s) => s.trim()).filter(Boolean);
    }

    export function tlxGroup(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    export function tlxClip(text, max) {
      const s = String(text == null ? '' : text).trim();
      if (s.length <= max) return s;
      const cut = s.slice(0, max);
      const space = cut.lastIndexOf(' ');
      return (space > max * 0.55 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '') + '…';
    }

    /* A long event name becomes at most `lines` centred rows of about `perLine`
       characters, so it reads as two rows instead of running under its
       neighbours. The panel below prints the segment in full, so clipping the
       last row loses nothing. */
    export const TLX_DANGLE_RX = /\s+(?:&|and|or|to|of|the|in|for|a|an)$/i;

    export function tlxWrap(text, perLine, lines) {
      const words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
      const rows = [];
      let row = '';
      words.forEach((w) => {
        if (rows.length >= lines) return;
        const next = row ? row + ' ' + w : w;
        if (next.length <= perLine) { row = next; return; }
        if (row) { rows.push(row); row = ''; }
        if (w.length <= perLine) row = w;
        else rows.push(tlxClip(w, perLine));
      });
      if (row && rows.length < lines) rows.push(row);
      /* A row that ends on a joining word reads as a break in the middle of its
         phrase, so that word starts the next row instead. */
      for (let i = 0; i < rows.length - 1; i += 1) {
        const tail = TLX_DANGLE_RX.exec(rows[i]);
        if (!tail) continue;
        rows[i] = rows[i].slice(0, tail.index);
        rows[i + 1] = tail[0].trim() + ' ' + rows[i + 1];
      }
      const shown = rows.join(' ').length;
      if (rows.length && shown < words.join(' ').length) rows[rows.length - 1] += '…';
      return rows.length ? rows : [''];
    }

    /* What the label says happens at a date: the words that follow the year, up
       to the next date or the next clause, with a joining "to" trimmed off either
       end — "457 B.C. Decree to Restore City to A.D. 27" reads "Decree to
       Restore City". */
    export function tlxPhrase(label, year) {
      const src = String(label == null ? '' : label);
      const tokens = tlxYears(src);
      const hit = tokens.find((t) => t.year === year);
      if (!hit) return '';
      const next = tokens.find((t) => t.at >= hit.end);
      const tail = src.slice(hit.end, next ? next.at : src.length).split(TLX_BREAK_RX)[0];
      return tlxClip(tail.trim().replace(TLX_JOIN_RX, '').replace(TLX_TAIL_RX, '').trim(), 46);
    }

    /* The badge is read off the milestone's own name first, and only then off the
       segments it sits between: a label that says "457 B.C. Decree" must not put
       a scroll on the baptism three beats later. */
    export function tlxIcon(title, labels) {
      const first = String(title == null ? '' : title);
      for (const rule of TLX_ICON_RULES) if (rule[0].test(first)) return rule[1];
      const rest = String(labels == null ? '' : labels);
      for (const rule of TLX_ICON_RULES) if (rule[0].test(rest)) return rule[1];
      return 'ring';
    }

    /* The spec read into the shape an axis needs: the milestones in date order
       with the slot each is drawn in, the segments with the slots they span, and
       the intervals between the milestones. */
    export function tlxModel(spec, steps) {
      const axis = (Array.isArray(spec.axis) ? spec.axis : []).map((a) => String(a == null ? '' : a));
      const ends = axis.map((a) => tlxYears(a)[0] || null);
      if (!ends[0] || !ends[1]) return null;
      const start = Math.min(ends[0].year, ends[1].year);
      const end = Math.max(ends[0].year, ends[1].year);
      const span = end - start;
      if (!(span > 0)) return null;

      const segs = [];
      steps.forEach((step) => {
        (step.segments || []).forEach((sg) => {
          const from = Number(sg.from);
          const to = Number(sg.to);
          if (!Number.isFinite(from) || !Number.isFinite(to)) return;
          const label = String(sg.label == null ? '' : sg.label).trim();
          segs.push({
            label: label, lo: Math.min(from, to), hi: Math.max(from, to), step: step,
            head: tlxClauses(label)[0] || label,
            colour: TLX_PALETTE[segs.length % TLX_PALETTE.length]
          });
        });
      });
      if (!segs.length) return null;

      /* A date is a milestone if the spec prints it inside the axis. The axis's
         own two labels are read first, so an endpoint keeps the authored order
         ("1844 A.D.", not "A.D. 1844"). */
      const byYear = new Map();
      const note = (token) => {
        if (!token || token.year < start - 0.5 || token.year > end + 0.5) return;
        const key = Math.round(token.year);
        if (!byYear.has(key)) byYear.set(key, { year: key, label: token.label });
      };
      ends.forEach(note);
      segs.forEach((sg) => tlxYears(sg.label).forEach(note));
      steps.forEach((step) => { tlxYears(step.role).forEach(note); tlxYears(step.title).forEach(note); });
      const miles = Array.from(byYear.values()).sort((a, b) => a.year - b.year);
      if (miles.length < 2) return null;

      /* The margin at each end is what keeps the first and last milestone's name
         inside the axis: a centred label needs as much room beside its node as
         half its own width, so the margin is set from how many milestones there
         are. Three can afford a wide one and print their names whole; five
         cannot, and wrap. */
      const edge = Math.max(TLX_EDGE, Math.min(420, (TLX_W * 0.48) / miles.length));
      const slotStep = (TLX_W - 2 * edge) / (miles.length - 1);
      /* How many characters a milestone's name may hold before it wraps: the slot
         it owns, less a margin, at the sans face's average advance. No name ever
         reaches into its neighbour's column. */
      const perLine = Math.max(16, Math.floor((slotStep * 0.92) / 13));
      const pctOf = (year) => ((year - start) / span) * 100;
      const yearAt = (pct) => start + (pct / 100) * span;
      const slotOf = (year) => {
        let best = 0;
        let gap = Infinity;
        miles.forEach((m, i) => {
          const d = Math.abs(m.year - year);
          if (d < gap) { gap = d; best = i; }
        });
        return best;
      };
      miles.forEach((m, i) => {
        m.slot = i;
        m.x = edge + i * slotStep;
        m.colour = i === miles.length - 1 ? TLX_FINAL : TLX_PALETTE[i % TLX_PALETTE.length];
      });
      segs.forEach((sg) => {
        const a = slotOf(yearAt(sg.lo));
        const b = slotOf(yearAt(sg.hi));
        sg.a = Math.min(a, b);
        sg.b = Math.max(a, b);
      });

      miles.forEach((m) => {
        m.touch = segs.filter((sg) => sg.a === m.slot || sg.b === m.slot);
        let title = '';
        for (const sg of m.touch) {
          title = tlxPhrase(sg.label, m.year);
          if (title) break;
        }
        const opens = m.touch.find((sg) => sg.a === m.slot) || null;
        if (!title && m.touch.length) {
          /* No date in the label to hang a phrase on: the segment that opens
             here names what begins, the one that closes here names what ends. */
          const src = opens || m.touch[0];
          const clauses = tlxClauses(src.label);
          title = opens ? (clauses[0] || '') : (clauses[clauses.length - 1] || '');
        }
        const primary = m.touch[0] || null;
        m.track = primary ? primary.step : null;
        if (!title) title = (m.track && (m.track.title || m.track.role)) || '';
        m.title = tlxClip(title, 46);
        m.cite = (m.track && m.track.cite) || '';
        m.ref = tlxClip(m.cite || (m.track && (m.track.role || m.track.title)) || '', 34);
        m.rows = tlxWrap(m.title, perLine, 2);
        m.icon = tlxIcon(m.title, m.touch.map((sg) => sg.label).join(' '));
        m.aria = m.label + (m.title ? ': ' + m.title : '');
        m.parts = [];
        const seen = new Set();
        m.touch.forEach((sg) => {
          if (seen.has(sg.label)) return;
          seen.add(sg.label);
          m.parts.push({ kicker: [sg.step.role, sg.step.title].filter(Boolean).join(' · '), label: sg.label });
        });
      });

      /* The interval a stretch of spine is drawn across, and the colour it takes:
         the narrowest segment that covers it, which is the one that names it. */
      const intervals = [];
      for (let i = 0; i < miles.length - 1; i += 1) {
        const a = miles[i];
        const b = miles[i + 1];
        const mid = pctOf((a.year + b.year) / 2);
        let pick = null;
        segs.forEach((sg) => {
          if (mid < sg.lo || mid > sg.hi) return;
          if (!pick || sg.hi - sg.lo < pick.hi - pick.lo) pick = sg;
        });
        const years = b.year - a.year;
        intervals.push({
          a: a, b: b, years: years, colour: pick ? pick.colour : TLX_GILT,
          label: '+' + tlxGroup(years) + (years === 1 ? ' YEAR' : ' YEARS')
        });
      }

      /* Brackets nest: the widest span takes the top line, and a span that
         overlaps one already placed drops a level. */
      const brackets = segs.filter((sg) => sg.b > sg.a).sort((x, y) => (y.b - y.a) - (x.b - x.a) || x.a - y.a);
      const levelEnds = [];
      brackets.forEach((sg) => {
        let level = 0;
        while (level < levelEnds.length && levelEnds[level] > sg.a) level += 1;
        levelEnds[level] = sg.b;
        sg.level = level;
      });
      const levels = Math.max(1, levelEnds.length);

      /* The entrance: one beat per interval, its length set by the years it
         covers, so the long stretch draws slower than the last week. A milestone
         arrives when the spine reaches it, and a bracket when its own end has. */
      const longest = intervals.reduce((best, iv) => (iv.years > best.years ? iv : best), intervals[0]);
      let clock = 0.15;
      intervals.forEach((iv) => {
        iv.t = clock;
        iv.dur = 0.35 + 0.5 * (iv.years / longest.years);
        clock += iv.dur;
        iv.arrive = clock;
      });
      miles.forEach((m, i) => { m.t = i === 0 ? 0.1 : intervals[i - 1].arrive; });
      brackets.forEach((sg) => {
        sg.t = intervals[sg.b - 1].arrive + 0.25;
        /* A caption may not run past the span it labels. The budget is that
           bracket's own width at the caption's type size, and the track's
           reference is dropped before the segment's own name is clipped — the
           panel below always prints the reference in full. */
        const width = Math.abs(miles[sg.b].x - miles[sg.a].x);
        const budget = Math.max(12, width / 14.4);
        const named = /[0-9]\s*:\s*[0-9]/.test(sg.head) || !sg.step.cite;
        const withCite = named ? sg.head : sg.head + ' · ' + sg.step.cite;
        sg.caption = withCite.length <= budget ? withCite : tlxClip(sg.head, budget);
      });

      /* Century marks on the longest stretch, at their due share of it. */
      let tickStep = 100;
      while (longest.years / tickStep > 22) tickStep *= 2;
      const ticks = [];
      for (let y = Math.ceil((longest.a.year + 1) / tickStep) * tickStep; y < longest.b.year; y += tickStep) {
        const f = (y - longest.a.year) / longest.years;
        ticks.push({ x: longest.a.x + (longest.b.x - longest.a.x) * f, t: longest.t + f * longest.dur });
      }

      /* The vertical rhythm is the reference's, tightened: the bracket stack, the
         badges, the spine and the three lines under each milestone. In column and
         full screen alike the whole diagram has to fit one plate, so the badge
         hangs just clear of the last bracket line and the lines under the spine
         sit at a 30-unit pitch. */
      const top = TLX_BRACKET_Y + (levels - 1) * TLX_LEVEL;
      const badgeY = top + 62;
      const spineY = badgeY + 82;
      const yearY = spineY + 60;
      const pitch = 30;
      miles.forEach((m) => {
        m.yearY = yearY;
        m.titleY = yearY + 40;
        m.refY = m.titleY + m.rows.length * pitch + 8;
      });
      const height = miles.reduce((deep, m) => Math.max(deep, m.refY), 0) + 22;

      /* The to-scale bar: the axis is split at the milestone that divides it most
         evenly, at that milestone's true proportion. The remaining cuts are
         hairlines, and the sum is the arithmetic the axis already carries. */
      let cut = null;
      miles.slice(1, -1).forEach((m) => {
        const left = m.year - start;
        const right = end - m.year;
        const even = Math.min(left, right);
        if (!cut || even > cut.even) cut = { m: m, even: even, left: left, right: right };
      });
      const marks = miles.slice(1, -1).map((m) => ({ m: m, pct: pctOf(m.year), main: !!cut && m === cut.m }));
      if (cut) marks.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));

      return {
        miles: miles, segs: segs, intervals: intervals, brackets: brackets, ticks: ticks,
        start: start, end: end, span: span, axis: axis, cut: cut, marks: marks,
        cutPct: cut ? pctOf(cut.m.year) : null,
        badgeY: badgeY, spineY: spineY, height: height, levels: levels
      };
    }

    export function bodyTimeline(spec, steps, canResolve) {
      const model = tlxModel(spec, steps);
      /* A timeline with no dated axis cannot be drawn on one. The tracks and their
         segments are still listed rather than dropped. */
      if (!model) {
        return '<div class="tlx"><ul class="tlx-plain">' + steps.map((step) => '<li>' +
          (step.role ? '<b>' + escapeStudy(step.role) + '</b> ' : '') +
          (step.title ? escapeStudy(step.title) + ' ' : '') +
          diagramCite(step.cite, canResolve) +
          (step.segments || []).map((sg) => '<span>' + escapeStudy(sg.label) + '</span>').join('') +
        '</li>').join('') + '</ul></div>';
      }
      const miles = model.miles;
      const last = miles.length - 1;

      /* --- the axis ------------------------------------------------------- */
      const parts = [];
      model.intervals.forEach((iv) => {
        parts.push('<path class="tlx-seg" pathLength="1" d="M' + iv.a.x + ' ' + model.spineY + 'H' + iv.b.x +
          '" style="--tlx-c:' + iv.colour + ';--tlx-t:' + iv.t.toFixed(2) + 's;--tlx-du:' + iv.dur.toFixed(2) + 's"/>');
      });
      /* Ticks are struck over the spine, as the reference draws them: they are the
         century marks of the long stretch, not a decoration underneath it. */
      model.ticks.forEach((tk) => {
        parts.push('<path class="tlx-tick" d="M' + tk.x.toFixed(1) + ' ' + (model.spineY - 12) + 'V' + (model.spineY + 12) +
          '" style="--tlx-t:' + tk.t.toFixed(2) + 's"/>');
      });
      model.brackets.forEach((sg) => {
        const y = TLX_BRACKET_Y + sg.level * TLX_LEVEL;
        const x1 = miles[sg.a].x;
        const x2 = miles[sg.b].x;
        parts.push('<g class="tlx-br" style="--tlx-c:' + sg.colour + ';--tlx-t:' + sg.t.toFixed(2) + 's">' +
          '<path class="tlx-br-line" pathLength="1" d="M' + x1 + ' ' + (y + 20) + 'V' + y + 'H' + x2 + 'V' + (y + 20) + '"/>' +
          '<text class="tlx-bt" x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (y - 24) + '">' + escapeStudy(sg.caption) + '</text>' +
        '</g>');
      });
      model.intervals.forEach((iv) => {
        parts.push('<text class="tlx-dl" x="' + ((iv.a.x + iv.b.x) / 2).toFixed(1) + '" y="' + (model.spineY - 22) +
          '" style="--tlx-c:' + iv.colour + '">' + escapeStudy(iv.label) + '</text>');
      });
      miles.forEach((m, i) => {
        const isFinal = i === last;
        const dotR = isFinal ? 18 : 12;
        parts.push('<g class="tlx-nd' + (isFinal ? ' is-final' : '') + '" tabindex="0" role="button" aria-pressed="false"' +
          ' data-tlx-i="' + i + '" aria-label="' + escapeStudy(m.aria) + '"' +
          ' style="--tlx-c:' + m.colour + ';--tlx-t:' + m.t.toFixed(2) + 's">' +
          (isFinal ? '<circle class="tlx-ping" cx="' + m.x + '" cy="' + model.spineY + '" r="20"/>' : '') +
          '<circle class="tlx-bd" cx="' + m.x + '" cy="' + model.badgeY + '" r="25"/>' +
          '<g class="tlx-ico" transform="translate(' + (m.x - 12) + ' ' + (model.badgeY - 12) + ')"><path d="' + TLX_ICONS[m.icon] + '"/></g>' +
          '<path class="tlx-stem" d="M' + m.x + ' ' + (model.badgeY + 25) + 'V' + (model.spineY - 17) + '"/>' +
          '<circle class="tlx-foc" cx="' + m.x + '" cy="' + model.spineY + '" r="' + (dotR + 10) + '"/>' +
          '<circle class="tlx-halo" cx="' + m.x + '" cy="' + model.spineY + '" r="' + (dotR + 5) + '"/>' +
          '<circle class="tlx-dot" cx="' + m.x + '" cy="' + model.spineY + '" r="' + dotR + '"/>' +
          '<text class="tlx-yr" x="' + m.x + '" y="' + m.yearY + '">' + escapeStudy(m.label) + '</text>' +
          m.rows.map((row, k) => '<text class="tlx-tt" x="' + m.x + '" y="' + (m.titleY + k * 30) + '">' + escapeStudy(row) + '</text>').join('') +
          (m.ref ? '<text class="tlx-rf" x="' + m.x + '" y="' + m.refY + '">' + escapeStudy(m.ref) + '</text>' : '') +
        '</g>');
      });
      const svg = '<svg class="tlx-svg" viewBox="0 0 ' + TLX_W + ' ' + Math.round(model.height) + '"' +
        ' role="group" aria-label="' + escapeStudy('Timeline from ' + model.axis[0] + ' to ' + model.axis[1] + ': ' + miles.length + ' dated milestones') + '">' +
        parts.join('') + '</svg>';

      /* --- the legend ------------------------------------------------------ */
      const legend = '<div class="tlx-legend" role="group" aria-label="Milestones, colour coded">' +
        miles.map((m, i) => '<button type="button" class="tlx-lg" data-tlx-i="' + i + '" aria-pressed="false"' +
          ' style="--tlx-c:' + m.colour + ';--tlx-t:' + (m.t + 0.1).toFixed(2) + 's">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + TLX_ICONS[m.icon] + '"/></svg>' +
          '<b>' + escapeStudy(m.label) + '</b><span>' + escapeStudy(m.title) + '</span>' +
        '</button>').join('') + '</div>';

      /* --- the two tracks the spec compares -------------------------------- */
      const tracks = '<ul class="tlx-tracks">' + steps.map((step) => {
        const first = model.segs.find((sg) => sg.step === step);
        return '<li class="tlx-track"' + (first ? ' style="--tlx-c:' + first.colour + '"' : '') + '>' +
          '<span class="tlx-track-dot" aria-hidden="true"></span>' +
          (step.role ? '<span class="tlx-track-role">' + escapeStudy(step.role) + '</span>' : '') +
          (step.title ? '<b>' + escapeStudy(step.title) + '</b>' : '') +
        '</li>';
      }).join('') + '</ul>';

      /* --- the to-scale bar ------------------------------------------------- */
      const scale = '<div class="tlx-scale">' +
        '<p class="tlx-scale-head">' +
          '<span>To scale</span>' +
          '<span>' + escapeStudy((model.cut ? tlxGroup(model.cut.left) + ' + ' + tlxGroup(model.cut.right) + ' = ' : '') + tlxGroup(model.span) + ' years') + '</span>' +
          '<span>Milestones above are evenly spaced; this bar is not</span>' +
        '</p>' +
        '<div class="tlx-scale-bar" aria-hidden="true" style="--tlx-cut:' + (model.cutPct === null ? 50 : model.cutPct.toFixed(2)) + '%">' +
          (model.cut
            ? '<i style="flex:' + model.cut.left + '"></i><i style="flex:' + model.cut.right + '"></i>'
            : '<i style="flex:' + model.span + '"></i>') +
          model.marks.map((mk) => '<span class="tlx-scale-mark' + (mk.main ? ' is-cut' : '') +
            '" style="left:' + mk.pct.toFixed(2) + '%"></span>').join('') +
          '<span class="tlx-scale-fill"></span>' +
        '</div>' +
        '<div class="tlx-scale-axis" aria-hidden="true">' +
          '<span style="left:0">' + escapeStudy(model.axis[0]) + '</span>' +
          /* Only the structural cut is named, and only when it is clear of the two
             end labels: on a 2,300-year axis A.D. 27, 31 and 34 fall within 0.3%
             of each other, so three labels would stack into one smudge, and a cut
             at 96.6% would sit on top of the closing date. The mark stays either
             way, and the head row prints the split as arithmetic. */
          model.marks.map((mk) => (mk.main && mk.pct > 8 && mk.pct < 92
            ? '<span style="left:' + mk.pct.toFixed(2) + '%">' + escapeStudy(mk.m.label) + '</span>' : '')).join('') +
          '<span style="right:0">' + escapeStudy(model.axis[1]) + '</span>' +
        '</div>' +
      '</div>';

      /* --- the panel, and one hidden slide per milestone -------------------- */
      const slide = (m, i) => '<div class="tlx-ph">' +
          '<span class="tlx-pib" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + TLX_ICONS[m.icon] + '"/></svg></span>' +
          '<div class="tlx-pid">' +
            '<p class="tlx-pmeta"><span class="tlx-pdate">' + escapeStudy(m.label) + '</span>' +
              (m.cite ? diagramCite(m.cite, canResolve)
                : (m.ref ? '<span class="chain-cite is-flat">' + escapeStudy(m.ref) + '</span>' : '')) +
            '</p>' +
            '<b class="tlx-ptitle">' + escapeStudy(m.title) + '</b>' +
          '</div>' +
        '</div>' +
        m.parts.map((pt) => '<p class="tlx-prow">' +
          (pt.kicker ? '<span class="tlx-pk">' + escapeStudy(pt.kicker) + '</span>' : '') +
          '<span class="tlx-pl">' + escapeStudy(pt.label) + '</span></p>').join('') +
        '<div class="tlx-pn">' +
          '<button type="button" class="tlx-pbtn" data-tlx-step="-1"' + (i === 0 ? ' disabled' : '') + '>Previous</button>' +
          '<span class="tlx-pnum">' + (i + 1) + ' OF ' + miles.length + '</span>' +
          '<button type="button" class="tlx-pbtn" data-tlx-step="1"' + (i === last ? ' disabled' : '') + '>Next</button>' +
        '</div>';
      const slides = miles.map((m, i) => '<div data-tlx-slide="' + i + '">' + slide(m, i) + '</div>').join('');

      return '<div class="tlx" data-tlx>' +
        '<div class="tlx-plot">' + svg + '</div>' +
        legend +
        tracks +
        scale +
        '<section class="tlx-panel" aria-live="polite" data-tlx-panel style="--tlx-c:' + miles[0].colour + '">' +
          slide(miles[0], 0) + '</section>' +
        '<div class="tlx-src" hidden>' + slides + '</div>' +
      '</div>';
    }

    /* The axis node, the legend pill and the panel's Previous/Next all call
       `select`, so they cannot disagree. Each panel is rendered once as a
       hidden slide and moved into the live region.
       Escape is not handled here: the full-screen shell takes it first, in the
       capture phase. */
    export function wireTimeline(figure) {
      const root = figure.querySelector('[data-tlx]');
      if (!root) return;
      const panel = root.querySelector('[data-tlx-panel]');
      const nodes = Array.from(root.querySelectorAll('.tlx-nd'));
      const pills = Array.from(root.querySelectorAll('.tlx-lg'));
      const slides = Array.from(root.querySelectorAll('[data-tlx-slide]'));
      if (!panel || !nodes.length || slides.length !== nodes.length) return;

      let current = -1;
      const select = (index, focus) => {
        const next = Math.max(0, Math.min(nodes.length - 1, index));
        const node = nodes[next];
        if (next !== current) {
          const slide = slides[next];
          if (slide) panel.innerHTML = slide.innerHTML;
          // The panel's own edge takes the selected milestone's colour, which is
          // the same inline token the axis node and its legend pill carry.
          const colour = node && node.style ? node.style.getPropertyValue('--tlx-c').trim() : '';
          if (colour) panel.style.setProperty('--tlx-c', colour);
          current = next;
        }
        nodes.forEach((item, i) => {
          const on = i === next;
          item.classList.toggle('is-sel', on);
          item.setAttribute('aria-pressed', String(on));
        });
        pills.forEach((pill, i) => {
          const on = i === next;
          pill.classList.toggle('is-sel', on);
          pill.setAttribute('aria-pressed', String(on));
        });
        if (focus && node && typeof node.focus === 'function') node.focus({ preventScroll: true });
      };

      root.addEventListener('click', (event) => {
        const hit = event.target && event.target.closest ? event.target.closest('[data-tlx-i]') : null;
        if (!hit) return;
        select(Number(hit.getAttribute('data-tlx-i')), false);
      });
      panel.addEventListener('click', (event) => {
        const btn = event.target && event.target.closest ? event.target.closest('[data-tlx-step]') : null;
        if (!btn || btn.disabled) return;
        select(current + Number(btn.getAttribute('data-tlx-step')), false);
      });
      nodes.forEach((node, i) => {
        node.addEventListener('keydown', (event) => {
          const key = event.key;
          if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            select(i, false);
          } else if (key === 'ArrowRight' || key === 'ArrowDown') {
            event.preventDefault();
            select(i + 1, true);
          } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
            event.preventDefault();
            select(i - 1, true);
          } else if (key === 'Home') {
            event.preventDefault();
            select(0, true);
          } else if (key === 'End') {
            event.preventDefault();
            select(nodes.length - 1, true);
          }
        });
      });

      // The panel's first slide is already in the markup, so the opening state is
      // the same whether or not this ran; this only marks the node and the pill.
      select(0, false);
    }
