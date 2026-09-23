(function () {
  const SITTINGS = 11;
  let days = 30;
  let cache = { events: [], surveys: [], profiles: [] };

  function client() {
    return window.ScrollAuth && window.ScrollAuth.getClient && window.ScrollAuth.getClient();
  }

  function isMod() {
    return !!(window.ScrollAuth && window.ScrollAuth.isModerator && window.ScrollAuth.isModerator());
  }

  function sinceIso() {
    if (!days) return null;
    return new Date(Date.now() - days * 86400000).toISOString();
  }

  function inRange(iso) {
    const cut = sinceIso();
    if (!cut) return true;
    return String(iso || '') >= cut;
  }

  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv(name, rows) {
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]);
    const lines = [keys.join(',')].concat(rows.map(function (row) {
      return keys.map(function (k) { return csvEscape(row[k]); }).join(',');
    }));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function barList(pairs, unit) {
    const max = pairs.reduce(function (m, p) { return Math.max(m, p[1]); }, 0);
    if (!pairs.length) return '<p class="insights-empty">No rows in this range.</p>';
    const u = unit ? ' ' + unit : '';
    return pairs.map(function (p) {
      const pct = max ? Math.round((p[1] / max) * 100) : 0;
      return '<div class="ibar"><span>' + p[0] + '</span><i style="width:' + pct + '%"></i><b>' + p[1] + u + '</b></div>';
    }).join('');
  }

  function countBy(arr, keyFn) {
    const map = {};
    arr.forEach(function (item) {
      const k = keyFn(item);
      if (k == null || k === '') return;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  function events() {
    return cache.events.filter(function (e) { return inRange(e.created_at); });
  }

  function surveys() {
    return cache.surveys.filter(function (e) { return inRange(e.created_at); });
  }

  function profiles() {
    return cache.profiles.filter(function (p) { return inRange(p.created_at); });
  }

  function panel(id, title, html) {
    return '<section class="insights-panel" id="panel-' + id + '">' +
      '<button type="button" class="insights-csv" data-csv="' + id + '">CSV</button>' +
      '<h2>' + title + '</h2>' + html +
      '</section>';
  }

  function sittingOf(e) {
    if (Number.isInteger(e.sitting)) return e.sitting;
    if (Number.isInteger(e.sheet)) return e.sheet;
    return null;
  }

  function funnelRows() {
    const ev = events();
    const rows = [];
    for (let i = 0; i < SITTINGS; i++) {
      const start = ev.filter(function (e) { return e.event === 'sitting_start' && sittingOf(e) === i; }).length;
      const done = ev.filter(function (e) { return e.event === 'sitting_complete' && sittingOf(e) === i; }).length;
      rows.push({ sitting: i, started: start, completed: done });
    }
    return rows;
  }

  function quizRows() {
    const answers = events().filter(function (e) { return e.event === 'quiz_answer'; });
    const first = {};
    answers.forEach(function (e) {
      const d = e.detail || {};
      const s = sittingOf(e);
      if (s == null || d.q == null) return;
      const actor = e.user_id || e.anon_id || e.session_id || 'anon';
      const key = actor + ':' + s + ':' + d.q;
      if (!first[key]) {
        first[key] = e;
      } else {
        const curD = first[key].detail || {};
        if (d.attempt === 1 && curD.attempt !== 1) {
          first[key] = e;
        } else if (curD.attempt === 1 && d.attempt !== 1) {
          // keep existing first attempt
        } else if (String(e.created_at) < String(first[key].created_at)) {
          first[key] = e;
        }
      }
    });

    const byQ = {};
    Object.keys(first).forEach(function (k) {
      const e = first[k];
      const d = e.detail || {};
      const s = sittingOf(e);
      const id = 'Sitting ' + s + ' Q' + (Number(d.q) + 1);
      if (!byQ[id]) byQ[id] = { sitting: s, q: d.q, n: 0, correct: 0, wrong: {} };
      byQ[id].n += 1;
      if (d.correct) {
        byQ[id].correct += 1;
      } else {
        const rawChoice = d.chosen != null ? d.chosen : d.choice;
        const c = rawChoice != null ? String(rawChoice) : '?';
        byQ[id].wrong[c] = (byQ[id].wrong[c] || 0) + 1;
      }
    });

    return Object.keys(byQ).map(function (id) {
      const r = byQ[id];
      let topWrong = '';
      let topN = 0;
      Object.keys(r.wrong).forEach(function (c) {
        if (r.wrong[c] > topN) {
          topN = r.wrong[c];
          const asNum = parseInt(c, 10);
          topWrong = !Number.isNaN(asNum) && asNum >= 0 && asNum < 26
            ? String.fromCharCode(65 + asNum)
            : c;
        }
      });
      return {
        question: id,
        sitting: r.sitting,
        q: r.q,
        first_try_pct: r.n ? Math.round((r.correct / r.n) * 100) : 0,
        attempts: r.n,
        top_wrong: topWrong
      };
    }).sort(function (a, b) {
      if (a.sitting !== b.sitting) return a.sitting - b.sitting;
      return a.q - b.q;
    });
  }

  function timeAndDepthRows() {
    const ev = events();
    const map = {};
    for (let i = 0; i < SITTINGS; i++) {
      map[i] = { sitting: i, n: 0, total_sec: 0, d25: 0, d50: 0, d75: 0, d100: 0 };
    }

    ev.forEach(function (e) {
      const s = sittingOf(e);
      if (s == null || !map[s]) return;
      if (e.event === 'sitting_complete') {
        const sec = Number((e.detail || {}).seconds);
        if (Number.isFinite(sec)) {
          map[s].n += 1;
          map[s].total_sec += sec;
        }
      } else if (e.event === 'scroll_depth') {
        const d = Number((e.detail || {}).depth);
        if (d === 25) map[s].d25 += 1;
        else if (d === 50) map[s].d50 += 1;
        else if (d === 75) map[s].d75 += 1;
        else if (d === 100) map[s].d100 += 1;
      }
    });

    return Object.keys(map).map(function (k) {
      const r = map[k];
      return {
        sitting: r.sitting,
        avg_seconds: r.n ? Math.round(r.total_sec / r.n) : 0,
        completed_sessions: r.n,
        depth_25: r.d25,
        depth_50: r.d50,
        depth_75: r.d75,
        depth_100: r.d100
      };
    });
  }

  function render() {
    const grid = document.getElementById('insights-grid');
    if (!grid) return;
    const ev = events();
    const sv = surveys();
    const funnel = funnelRows();
    const quiz = quizRows();
    const timeData = timeAndDepthRows();
    const features = countBy(ev.filter(function (e) {
      return e.event === 'feature_use' || e.event.indexOf('gallery_') === 0 || e.event.indexOf('map_') === 0 || e.event === 'invite_shared';
    }), function (e) {
      if (e.event === 'feature_use') return (e.detail && e.detail.feature) || 'other';
      if (e.event === 'invite_shared') return 'invite_shared';
      if (e.event === 'gallery_view') return 'gallery_view';
      if (e.event === 'gallery_mode') return 'gallery_mode';
      if (e.event === 'gallery_node') return 'gallery_node';
      if (e.event === 'map_pin') return 'map_pin';
      if (e.event === 'map_year') return 'map_year';
      return e.event;
    });
    const pulses = sv.filter(function (s) { return s.responses && s.responses.kind === 'sitting_pulse'; });
    const exits = sv.filter(function (s) { return s.responses && (s.responses.kind === 'exit' || s.responses.nps != null); });
    const npsVals = exits.map(function (s) { return Number(s.responses.nps); }).filter(function (n) { return Number.isFinite(n); });
    const promoters = npsVals.filter(function (n) { return n >= 9; }).length;
    const detractors = npsVals.filter(function (n) { return n <= 6; }).length;
    const nps = npsVals.length ? Math.round(((promoters - detractors) / npsVals.length) * 100) : null;
    const profs = profiles();
    const modes = countBy(profs, function (p) { return p.study_mode; });
    const found = countBy(profs, function (p) { return p.found_via; });
    const backgrounds = countBy(profs, function (p) { return p.background; });
    const refs = countBy(profs, function (p) { return p.referred_by; });
    const signups = ev.filter(function (e) { return e.event === 'referral_signup'; }).length;

    const pulseAvg = pulses.length
      ? (pulses.reduce(function (s, p) { return s + Number(p.rating || (p.responses && p.responses.score) || 0); }, 0) / pulses.length).toFixed(1)
      : '—';

    grid.innerHTML =
      panel('funnel', 'Lesson funnel',
        '<small style="font-weight:600;display:block;margin-bottom:4px;">Starts</small>' +
        barList(funnel.map(function (r) { return ['Sitting ' + r.sitting, r.started]; })) +
        '<small style="font-weight:600;display:block;margin:8px 0 4px;">Completions</small>' +
        barList(funnel.map(function (r) { return ['Sitting ' + r.sitting, r.completed]; }))
      ) +
      panel('quiz', 'Quiz first try', quiz.length
        ? '<ul>' + quiz.map(function (q) {
          return '<li>' + q.question + ': <b>' + q.first_try_pct + '%</b> first-try (' + q.attempts + ')' +
            (q.top_wrong !== '' ? ', common miss option ' + q.top_wrong : '') + '</li>';
        }).join('') + '</ul>'
        : '<p class="insights-empty">No quiz answers yet.</p>'
      ) +
      panel('time', 'Reading time & scroll depth',
        barList(timeData.map(function (t) {
          return ['Sitting ' + t.sitting, t.avg_seconds];
        }), 's') +
        '<div style="margin-top:10px;font-size:11px;opacity:0.85;">' +
        timeData.filter(function (t) { return t.depth_25 || t.depth_50 || t.depth_75 || t.depth_100; }).map(function (t) {
          return '<div>Sitting ' + t.sitting + ' reach: 25% (' + t.depth_25 + '), 50% (' + t.depth_50 + '), 75% (' + t.depth_75 + '), 100% (' + t.depth_100 + ')</div>';
        }).join('') +
        '</div>'
      ) +
      panel('features', 'Feature use', barList(features)) +
      panel('pulse', 'Sitting clarity (1–5)',
        '<p>Average <b>' + pulseAvg + '</b> from ' + pulses.length + ' response' + (pulses.length === 1 ? '' : 's') + '.</p>' +
        '<ul>' + pulses.slice(0, 8).map(function (p) {
          const note = (p.responses && p.responses.note) || p.feedback || '';
          const rawS = p.responses && (p.responses.sitting != null ? p.responses.sitting : p.responses.sheet);
          const s = rawS != null ? rawS : '?';
          return note ? '<li>Sitting ' + s + ': ' + note + '</li>' : '';
        }).join('') + '</ul>'
      ) +
      panel('nps', 'Exit survey & NPS',
        '<p>NPS score: <b>' + (nps == null ? '—' : (nps > 0 ? '+' + nps : nps)) + '</b> (' + npsVals.length + ' score' + (npsVals.length === 1 ? '' : 's') + ' · ' + promoters + ' promoters, ' + detractors + ' detractors)</p>' +
        '<ul>' + exits.slice(0, 8).map(function (s) {
          const changed = (s.responses && s.responses.changed) || '';
          const note = changed || s.feedback || '';
          return note ? '<li>' + note.slice(0, 180) + '</li>' : '';
        }).join('') + '</ul>'
      ) +
      panel('profile', 'Learner profile mix',
        '<small style="font-weight:600;display:block;margin-bottom:4px;">Study mode</small>' +
        barList(modes) +
        '<small style="font-weight:600;display:block;margin:8px 0 4px;">Found via</small>' +
        barList(found) +
        '<small style="font-weight:600;display:block;margin:8px 0 4px;">Background</small>' +
        barList(backgrounds)
      ) +
      panel('referral', 'Referrals & invites',
        '<p><b>' + signups + '</b> referral sign-ups recorded.</p>' +
        '<small style="font-weight:600;display:block;margin-bottom:4px;">Top referral codes</small>' +
        barList(refs.slice(0, 8))
      );

    grid.querySelectorAll('[data-csv]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-csv');
        const csvMap = {
          funnel: funnel,
          quiz: quiz,
          time: timeData,
          features: features.map(function (p) { return { feature: p[0], count: p[1] }; }),
          pulse: pulses.map(function (p) {
            return {
              sitting: (p.responses && (p.responses.sitting != null ? p.responses.sitting : p.responses.sheet)),
              score: p.rating || (p.responses && p.responses.score),
              note: (p.responses && p.responses.note) || p.feedback,
              created_at: p.created_at
            };
          }),
          nps: exits.map(function (s) {
            return {
              nps: s.responses && s.responses.nps,
              rating: s.rating,
              changed: s.responses && s.responses.changed,
              feedback: s.feedback,
              role: s.role,
              cohort: s.cohort,
              created_at: s.created_at
            };
          }),
          profile: cache.profiles.map(function (p) {
            return {
              study_mode: p.study_mode,
              background: p.background,
              found_via: p.found_via,
              referred_by: p.referred_by,
              referred_from_sitting: p.referred_from_sitting,
              ref_code: p.ref_code,
              created_at: p.created_at
            };
          }),
          referral: refs.map(function (p) { return { ref_code: p[0], signups: p[1] }; })
        };
        downloadCsv('insights-' + id + '.csv', csvMap[id] || []);
      });
    });
  }

  function load() {
    const c = client();
    const gate = document.getElementById('insights-gate');
    const app = document.getElementById('insights-app');
    if (!c || !isMod()) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      return;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;

    const cut = sinceIso();
    let evq = c.from('exhibit_events').select('event,sitting,sheet,detail,user_id,anon_id,session_id,created_at').order('created_at', { ascending: false }).limit(4000);
    let svq = c.from('exhibit_surveys').select('rating,feedback,responses,created_at,role,cohort').order('created_at', { ascending: false }).limit(1000);
    let pfq = c.from('exhibit_profiles').select('study_mode,background,found_via,referred_by,referred_from_sitting,ref_code,created_at').order('created_at', { ascending: false }).limit(1000);

    if (cut) {
      evq = evq.gte('created_at', cut);
      svq = svq.gte('created_at', cut);
      pfq = pfq.gte('created_at', cut);
    }

    Promise.all([
      evq.then(function (r) { return (r && r.data) || []; }).catch(function () { return []; }),
      svq.then(function (r) { return (r && r.data) || []; }).catch(function () { return []; }),
      pfq.then(function (r) { return (r && r.data) || []; }).catch(function () { return []; })
    ]).then(function (rows) {
      cache = { events: rows[0], surveys: rows[1], profiles: rows[2] };
      render();
    });
  }

  function boot() {
    const range = document.getElementById('insights-range');
    if (range) {
      range.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-days]');
        if (!btn) return;
        days = Number(btn.getAttribute('data-days')) || 0;
        range.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        load();
      });
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === 'function') {
      window.ScrollAuth.ready().then(load);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === 'function') {
      window.ScrollAuth.onChange(load);
    }
  }

  window.InsightsDashboard = {
    funnelRows: funnelRows,
    quizRows: quizRows,
    timeAndDepthRows: timeAndDepthRows,
    csvEscape: csvEscape,
    downloadCsv: downloadCsv,
    render: render,
    load: load,
    setDays: function (d) { days = d; },
    setCache: function (c) { cache = c; },
    getCache: function () { return cache; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
