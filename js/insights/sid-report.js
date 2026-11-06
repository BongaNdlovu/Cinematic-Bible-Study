(function (root) {
  const SITTINGS = 11;
  const MIN = 5;
  const NAMES = ['The Prologue', 'Daniel 1', 'Daniel 2', 'Daniel 3', 'Daniel 4', 'Daniel 5', 'Daniel 6', 'Daniel 7', 'Daniel 8', 'Daniel 9', 'Daniel 10–12'];
  const FIRST_READ = ['First time', 'Read it before', 'I teach it'];
  const USES = ['Personal study', 'With others', 'Teaching or leading', 'Exploring'];
  const FEATURES = { infographic: 'Infographics', weather: 'Scene weather', theme: 'Reading themes', cert_download: 'Certificate downloads' };
  const TOO_FEW = 'too few to report';
  const UNDER = 'fewer than ' + MIN;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(n) {
    try {
      return new Intl.NumberFormat('en-ZA').format(n);
    } catch (e) {
      return String(n);
    }
  }

  function day(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function count(n) {
    const v = Number(n) || 0;
    if (v <= 0) return '0';
    if (v < MIN) return UNDER;
    return num(v);
  }

  function share(part, base) {
    const p = Number(part) || 0;
    const b = Number(base) || 0;
    if (b < MIN) return TOO_FEW;
    if (p > 0 && p < MIN) return UNDER + ' of ' + num(b);
    return Math.round((p / b) * 100) + '%';
  }

  function mean(total, n, digits) {
    if (n < MIN) return TOO_FEW;
    const f = Math.pow(10, digits || 0);
    return String(Math.round((total / n) * f) / f);
  }

  function reportable(n) {
    return Number(n) >= MIN;
  }

  function sittingOf(e) {
    if (Number.isInteger(e.sitting)) return e.sitting;
    if (Number.isInteger(e.sheet)) return e.sheet;
    return null;
  }

  function actorOf(e, i) {
    return e.user_id || e.anon_id || e.session_id || ('row:' + i);
  }

  function within(from, to) {
    return function (row) {
      const at = String((row && (row.created_at || row.issued_at)) || '');
      return at >= from && at < to;
    };
  }

  function uniqueActors(rows, test) {
    const seen = Object.create(null);
    rows.forEach(function (e, i) {
      if (test(e)) seen[actorOf(e, i)] = true;
    });
    return Object.keys(seen).length;
  }

  function firstAnswers(answers) {
    const first = Object.create(null);
    answers.forEach(function (e, i) {
      const d = e.detail || {};
      const s = sittingOf(e);
      if (s == null || d.q == null) return;
      const key = actorOf(e, i) + ':' + s + ':' + d.q;
      const held = first[key];
      if (!held) {
        first[key] = e;
        return;
      }
      const heldFirst = (held.detail || {}).attempt === 1;
      if (d.attempt === 1 && !heldFirst) first[key] = e;
      else if (heldFirst && d.attempt !== 1) return;
      else if (String(e.created_at) < String(held.created_at)) first[key] = e;
    });
    return Object.keys(first).map(function (k) { return first[k]; });
  }

  function quizFigures(events) {
    const firsts = firstAnswers(events.filter(function (e) { return e.event === 'quiz_answer'; }));
    const bySitting = [];
    for (let i = 0; i < SITTINGS; i++) bySitting.push({ sitting: i, name: NAMES[i], answers: 0, correct: 0 });
    const byQuestion = Object.create(null);
    firsts.forEach(function (e) {
      const s = sittingOf(e);
      const d = e.detail || {};
      if (!bySitting[s]) return;
      const right = !!d.correct;
      bySitting[s].answers += 1;
      if (right) bySitting[s].correct += 1;
      const id = s + ':' + d.q;
      if (!byQuestion[id]) byQuestion[id] = { sitting: s, name: NAMES[s], question: Number(d.q) + 1, answers: 0, correct: 0 };
      byQuestion[id].answers += 1;
      if (right) byQuestion[id].correct += 1;
    });
    const hardest = Object.keys(byQuestion).map(function (k) { return byQuestion[k]; })
      .filter(function (q) { return reportable(q.answers); })
      .sort(function (a, b) { return a.correct / a.answers - b.correct / b.answers || b.answers - a.answers; })
      .slice(0, 5);
    const answers = bySitting.reduce(function (s, r) { return s + r.answers; }, 0);
    const correct = bySitting.reduce(function (s, r) { return s + r.correct; }, 0);
    return { bySitting: bySitting, hardest: hardest, answers: answers, correct: correct };
  }

  function funnelFigures(events) {
    const rows = [];
    for (let i = 0; i < SITTINGS; i++) {
      const at = function (name) { return function (e) { return e.event === name && sittingOf(e) === i; }; };
      let seconds = 0;
      let timed = 0;
      events.forEach(function (e) {
        if (e.event !== 'sitting_complete' || sittingOf(e) !== i) return;
        const sec = Number((e.detail || {}).seconds);
        if (!Number.isFinite(sec) || sec < 0) return;
        seconds += sec;
        timed += 1;
      });
      rows.push({
        sitting: i,
        name: NAMES[i],
        started: uniqueActors(events, at('sitting_start')),
        completed: uniqueActors(events, at('sitting_complete')),
        seconds: seconds,
        timed: timed
      });
    }
    return rows;
  }

  function tally(rows, keyFn, order) {
    const map = Object.create(null);
    order.forEach(function (k) { map[k] = 0; });
    let total = 0;
    rows.forEach(function (r) {
      const k = keyFn(r);
      if (!Object.prototype.hasOwnProperty.call(map, k)) return;
      map[k] += 1;
      total += 1;
    });
    return { total: total, items: order.map(function (k) { return { label: k, n: map[k] }; }) };
  }

  function scoreOf(s) {
    const raw = s.rating != null ? s.rating : (s.responses && s.responses.score);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }

  function ratings(surveys, test) {
    let total = 0;
    let n = 0;
    surveys.forEach(function (s) {
      if (!test(s)) return;
      const v = scoreOf(s);
      if (v == null) return;
      total += v;
      n += 1;
    });
    return { total: total, n: n };
  }

  function featureFigures(events) {
    const map = Object.create(null);
    events.forEach(function (e) {
      let label = '';
      if (e.event === 'feature_use') label = FEATURES[(e.detail || {}).feature] || '';
      else if (e.event === 'path_step' && (e.detail || {}).step === 'map') label = 'Map of History';
      else if (e.event === 'path_step' && (e.detail || {}).step === 'gallery') label = '3D Symbols gallery';
      if (label) map[label] = (map[label] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return { label: k, n: map[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  function highlights(funnel, quiz) {
    const out = [];
    let drop = null;
    for (let i = 1; i < funnel.length; i++) {
      const before = funnel[i - 1].started;
      const after = funnel[i].started;
      if (!reportable(before) || !reportable(after)) continue;
      const lost = (before - after) / before;
      if (!drop || lost > drop.lost) drop = { lost: lost, from: funnel[i - 1].name, to: funnel[i].name };
    }
    if (drop && drop.lost > 0) out.push('The largest fall in readers is between ' + drop.from + ' and ' + drop.to + ' (' + Math.round(drop.lost * 100) + '% fewer starts).');
    const scored = quiz.bySitting.filter(function (r) { return reportable(r.answers); });
    if (scored.length >= 2) {
      const sorted = scored.slice().sort(function (a, b) { return a.correct / a.answers - b.correct / b.answers; });
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      out.push(low.name + ' has the lowest first-try quiz score (' + share(low.correct, low.answers) + '); ' + high.name + ' has the highest (' + share(high.correct, high.answers) + ').');
    }
    return out;
  }

  function build(data, opts) {
    const o = opts || {};
    const from = String(o.from || '');
    const to = String(o.to || '');
    const exclude = typeof o.exclude === 'function' ? o.exclude : function () { return false; };
    const pick = function (rows) {
      const inside = within(from, to);
      return (rows || []).filter(function (r) { return r && inside(r) && !exclude(r); });
    };
    const events = pick(data.events);
    const surveys = pick(data.surveys);
    const profiles = pick(data.profiles);
    const graduates = Array.isArray(data.graduates) ? pick(data.graduates) : null;
    const funnel = funnelFigures(events);
    const quiz = quizFigures(events);
    const starts = function (e) { return e.event === 'sitting_start'; };
    const notes = (Array.isArray(data.capped) ? data.capped : []).map(function (c) {
      return 'The dashboard reached its row limit for ' + c + ', so some figures may be low.';
    });
    if (o.guestCutoff && from < String(o.guestCutoff)) {
      notes.push('Activity by guests (readers not signed in) is kept for 90 days, so guest activity before ' + day(o.guestCutoff) + ' has already been deleted and is missing from this report.');
    }
    return {
      from: from,
      to: to,
      preparedAt: o.preparedAt || new Date().toISOString(),
      sample: !!o.sample,
      incomplete: notes,
      reach: {
        readers: uniqueActors(events, starts),
        welcome: profiles.filter(function (p) { return FIRST_READ.indexOf(p.found_via) >= 0 || USES.indexOf(p.study_mode) >= 0; }).length,
        invites: events.filter(function (e) { return e.event === 'invite_shared'; }).length,
        referrals: uniqueActors(events, function (e) { return e.event === 'referral_signup'; })
      },
      completion: {
        sittings: funnel.reduce(function (s, r) { return s + r.completed; }, 0),
        anySitting: uniqueActors(events, function (e) { return e.event === 'sitting_complete'; }),
        course: uniqueActors(events, function (e) { return e.event === 'course_complete'; }),
        certificates: graduates ? graduates.length : null
      },
      funnel: funnel,
      quiz: quiz,
      readers: {
        firstRead: tally(profiles, function (p) { return p.found_via; }, FIRST_READ),
        uses: tally(profiles, function (p) { return p.study_mode; }, USES)
      },
      feedback: {
        pulse: ratings(surveys, function (s) { return s.responses && s.responses.kind === 'sitting_pulse'; }),
        overall: ratings(surveys, function (s) { return s.rating != null && !(s.responses && s.responses.kind === 'sitting_pulse'); })
      },
      features: featureFigures(events),
      highlights: highlights(funnel, quiz)
    };
  }

  function bar(n, max) {
    if (!reportable(n) || !max) return '<span class="sid-bar is-empty"></span>';
    return '<span class="sid-bar" style="width:' + Math.max(2, Math.round((n / max) * 100)) + '%"></span>';
  }

  function fill(percent, ok) {
    if (!ok) return '<span class="sid-bar is-empty"></span>';
    return '<span class="sid-bar" style="width:' + Math.max(2, Math.min(100, percent)) + '%"></span>';
  }

  function tile(value, label) {
    return '<div class="sid-tile"><strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></div>';
  }

  function page(n, title, body) {
    return '<section class="sid-page"><div class="sid-running"><span>The Shelf of Daniel</span><span>Reader impact report</span></div>' +
      (title ? '<h2>' + esc(title) + '</h2>' : '') + body +
      '<div class="sid-folio"><span>Prepared for the Southern Africa-Indian Ocean Division</span><span>' + n + '</span></div></section>';
  }

  function distribution(t) {
    const max = t.items.reduce(function (m, r) { return Math.max(m, r.n); }, 0);
    return '<table class="sid-table"><tbody>' + t.items.map(function (r) {
      return '<tr><th>' + esc(r.label) + '</th><td class="sid-bar-cell">' + bar(r.n, max) + '</td><td>' + esc(count(r.n)) + '</td><td>' + esc(share(r.n, t.total)) + '</td></tr>';
    }).join('') + '</tbody></table><p class="sid-note">Based on ' + esc(count(t.total)) + ' readers who answered.</p>';
  }

  function render(f) {
    const period = day(f.from) + ' to ' + day(new Date(new Date(f.to).getTime() - 86400000).toISOString());
    const watermark = f.sample ? '<p class="sid-sample">Sample data: these are not real figures.</p>' : '';
    const maxStart = f.funnel.reduce(function (m, r) { return Math.max(m, r.started); }, 0);
    const cover = '<section class="sid-page sid-cover">' + watermark +
      '<p class="sid-kicker">Reader impact report</p>' +
      '<h1>The Shelf of Daniel</h1>' +
      '<p class="sid-sub">A guided study of the book of Daniel</p>' +
      '<div class="sid-rule"></div>' +
      '<p class="sid-for">Prepared for the<br><strong>Southern Africa-Indian Ocean Division</strong></p>' +
      '<dl class="sid-meta"><dt>Period</dt><dd>' + esc(period) + '</dd><dt>Prepared</dt><dd>' + esc(day(f.preparedAt)) + '</dd><dt>Prepared by</dt><dd>Fanelesibonge Ndlovu, The Shelf of Daniel</dd></dl>' +
      '<p class="sid-cover-note">All figures are totals across readers. No reader is named, and any figure based on fewer than ' + MIN + ' people is withheld. Study figures count only readers who allowed anonymous study analytics, so they are lower than the true totals.</p>' +
      '</section>';

    const summary = page(2, 'Summary', watermark +
      '<div class="sid-tiles">' +
      tile(count(f.reach.readers), 'people started a sitting') +
      tile(count(f.reach.welcome), 'signed-in readers answered the welcome questions') +
      tile(count(f.completion.sittings), 'sittings completed') +
      tile(count(f.completion.course), 'finished the final sitting (Daniel 10–12)') +
      tile(f.completion.certificates == null ? 'not available' : count(f.completion.certificates), 'readers given a numbered certificate') +
      tile(share(f.quiz.correct, f.quiz.answers), 'quiz answers right first time') +
      '</div>' +
      (f.highlights.length ? '<h3>What stands out</h3><ul class="sid-list">' + f.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') +
      (f.incomplete.length ? f.incomplete.map(function (n) { return '<p class="sid-warn">' + esc(n) + '</p>'; }).join('') : ''));

    const engagement = page(3, 'Reach and completion', watermark +
      '<table class="sid-table sid-funnel"><thead><tr><th>Sitting</th><th>Started</th><th></th><th>Completed</th><th>Completion</th><th>Active time</th></tr></thead><tbody>' +
      f.funnel.map(function (r) {
        const avg = reportable(r.timed) ? mean(r.seconds / 60, r.timed) + ' min' : TOO_FEW;
        return '<tr><th>' + esc(r.name) + '</th><td>' + esc(count(r.started)) + '</td><td class="sid-bar-cell">' + bar(r.started, maxStart) + '</td><td>' + esc(count(r.completed)) + '</td><td>' + esc(share(r.completed, r.started)) + '</td><td>' + esc(avg) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="sid-tiles sid-tiles-small">' +
      tile(count(f.reach.invites), 'invitations shared') +
      tile(count(f.reach.referrals), 'accounts made from an invitation') +
      tile(count(f.completion.anySitting), 'people completed at least one sitting') +
      '</div>');

    const quiz = page(4, 'Understanding', watermark +
      '<p class="sid-lead">Each sitting ends with questions. These are first answers only, from signed-in readers.</p>' +
      '<table class="sid-table"><thead><tr><th>Sitting</th><th>Answers</th><th></th><th>Right first time</th></tr></thead><tbody>' +
      f.quiz.bySitting.map(function (r) {
        const ok = reportable(r.answers);
        const pctRight = ok ? Math.round((r.correct / r.answers) * 100) : 0;
        return '<tr><th>' + esc(r.name) + '</th><td>' + esc(count(r.answers)) + '</td><td class="sid-bar-cell">' + fill(pctRight, ok) + '</td><td>' + esc(share(r.correct, r.answers)) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<h3>Questions readers find hardest</h3>' +
      (f.quiz.hardest.length
        ? '<table class="sid-table"><thead><tr><th>Question</th><th>Answers</th><th>Right first time</th></tr></thead><tbody>' +
          f.quiz.hardest.map(function (q) {
            return '<tr><th>' + esc(q.name) + ', question ' + esc(q.question) + '</th><td>' + esc(count(q.answers)) + '</td><td>' + esc(share(q.correct, q.answers)) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="sid-note">No question had enough answers to report.</p>'));

    const pulse = f.feedback.pulse;
    const overall = f.feedback.overall;
    const readers = page(5, 'Readers and feedback', watermark +
      '<div class="sid-columns"><div><h3>Reading Daniel for the first time?</h3>' + distribution(f.readers.firstRead) + '</div>' +
      '<div><h3>How readers plan to use the study</h3>' + distribution(f.readers.uses) + '</div></div>' +
      '<div class="sid-tiles sid-tiles-small">' +
      tile(pulse.n >= MIN ? mean(pulse.total, pulse.n, 1) + ' / 5' : TOO_FEW, 'average rating after a sitting (' + count(pulse.n) + ' ratings)') +
      tile(overall.n >= MIN ? mean(overall.total, overall.n, 1) + ' / 5' : TOO_FEW, 'average rating given with readers’ notes (' + count(overall.n) + ' ratings)') +
      '</div>' +
      '<h3>Study tools used</h3>' +
      (f.features.length
        ? '<table class="sid-table"><tbody>' + f.features.map(function (r) { return '<tr><th>' + esc(r.label) + '</th><td>' + esc(count(r.n)) + ' uses</td></tr>'; }).join('') + '</tbody></table>'
        : '<p class="sid-note">No tool use recorded in this period.</p>'));

    const method = page(6, 'How these figures are counted', watermark +
      '<ul class="sid-list">' +
      '<li>Study activity is recorded only for readers who allow anonymous study analytics in the cookie banner. Readers who decline are not counted, so every study figure is a lower bound.</li>' +
      '<li>A person is a signed-in account, or a browser for guests. Someone who reads on two devices without signing in counts twice.</li>' +
      '<li>Started and completed count each person once per sitting, however many times they return.</li>' +
      '<li>Quiz figures use each reader\'s first answer to each question. Only signed-in readers can check answers.</li>' +
      '<li>Certificates count readers whose latest numbered certificate was issued in the period. A certificate needs all eleven sittings saved to the reader’s account, with every checkpoint question answered correctly.</li>' +
      '<li>"Finished the final sitting" counts readers who completed Daniel 10–12 in the period, whether or not they completed every earlier sitting here.</li>' +
      '<li>Active time counts only time the reader was active on the page.</li>' +
      '<li>Welcome-question answers come from signed-in readers who chose to answer them.</li>' +
      '<li>Guest activity is kept for 90 days, so reports for older periods miss guest activity. Build each report soon after its period ends.</li>' +
      '<li>Any figure based on fewer than ' + MIN + ' people is shown as "' + UNDER + '" or "' + TOO_FEW + '", so no reader can be picked out.</li>' +
      '<li>The preparer\'s own activity is left out.</li>' +
      '<li>Days run from midnight to midnight UTC (02:00 to 02:00 South African time).</li>' +
      '<li>The report contains totals only. It holds no names, email addresses or written comments.</li>' +
      '</ul>' +
      '<p class="sid-contact">The Shelf of Daniel · Fanelesibonge Ndlovu · shelfofdaniel@gmail.com</p>');

    return cover + summary + engagement + quiz + readers + method;
  }

  root.SidReport = { build: build, render: render, count: count, share: share, MIN: MIN, NAMES: NAMES };
})(typeof window !== 'undefined' ? window : globalThis);
