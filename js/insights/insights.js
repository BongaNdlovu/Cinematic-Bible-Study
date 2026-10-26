(function () {
  const SITTINGS = 11;
  const PAGE = 1000;
  const EVENT_CAP = 20000;
  const ROW_CAP = 5000;
  const PROBES = '("pen_probe","live_insert_probe")';
  let days = 30;
  let hideMine = true;
  let loadGen = 0;
  let gradQuery = '';
  let cache = { events: [], surveys: [], profiles: [], progress: [], graduates: null, capped: [] };

  function client() {
    return window.ScrollAuth && window.ScrollAuth.getClient && window.ScrollAuth.getClient();
  }

  function isMod() {
    return !!(window.ScrollAuth && window.ScrollAuth.isModerator && window.ScrollAuth.isModerator());
  }

  function byId(id) {
    return document.getElementById ? document.getElementById(id) : null;
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function csvEscape(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
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

  function num(n) {
    const v = Number(n) || 0;
    try {
      return new Intl.NumberFormat(undefined).format(v);
    } catch (e) {
      return String(v);
    }
  }

  function pct(part, whole) {
    return whole ? Math.round((part / whole) * 100) : 0;
  }

  function duration(sec) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    return m + 'm ' + (r < 10 ? '0' : '') + r + 's';
  }

  function plural(n, one, many) {
    return num(n) + ' ' + (n === 1 ? one : many);
  }

  function countBy(arr, keyFn) {
    const map = Object.create(null);
    arr.forEach(function (item) {
      const k = keyFn(item);
      if (k == null || k === '') return;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  function myIds() {
    const auth = window.ScrollAuth;
    const user = auth && auth.getUser && auth.getUser();
    let anon = '';
    try {
      anon = (window.localStorage && window.localStorage.getItem('baInsightsAnon')) || '';
    } catch (e) {}
    return { user: user && user.id ? String(user.id) : '', anon: anon };
  }

  function mineTest() {
    if (!hideMine) return null;
    const ids = myIds();
    if (!ids.user && !ids.anon) return null;
    const anons = Object.create(null);
    if (ids.anon) anons[ids.anon] = true;
    (cache.events || []).forEach(function (e) {
      if (ids.user && e.user_id === ids.user && e.anon_id) anons[e.anon_id] = true;
    });
    return function (row) {
      return !!((ids.user && row.user_id === ids.user) || (row.anon_id && anons[row.anon_id]));
    };
  }

  function keep(rows) {
    const mine = mineTest();
    return (rows || []).filter(function (r) { return inRange(r.created_at) && !(mine && mine(r)); });
  }

  function events() {
    return keep(cache.events);
  }

  function surveys() {
    return keep(cache.surveys);
  }

  function profiles() {
    return keep(cache.profiles);
  }

  function progressRows() {
    const ids = hideMine ? myIds() : { user: '' };
    return (cache.progress || []).filter(function (p) { return !(ids.user && p.user_id === ids.user); });
  }

  function sittingOf(e) {
    if (Number.isInteger(e.sitting)) return e.sitting;
    if (Number.isInteger(e.sheet)) return e.sheet;
    return null;
  }

  function actorOf(e, i) {
    return e.user_id || e.anon_id || e.session_id || ('row:' + i);
  }

  function uniqueBy(ev, test) {
    const seen = Object.create(null);
    let n = 0;
    ev.forEach(function (e, i) {
      if (!test(e)) return;
      const a = actorOf(e, i);
      if (seen[a]) return;
      seen[a] = true;
      n += 1;
    });
    return n;
  }

  function funnelRows() {
    const ev = events();
    const rows = [];
    for (let i = 0; i < SITTINGS; i++) {
      const isStart = function (e) { return e.event === 'sitting_start' && sittingOf(e) === i; };
      const isDone = function (e) { return e.event === 'sitting_complete' && sittingOf(e) === i; };
      rows.push({
        sitting: i,
        started: uniqueBy(ev, isStart),
        completed: uniqueBy(ev, isDone),
        opens: ev.filter(isStart).length,
        finishes: ev.filter(isDone).length
      });
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
        return;
      }
      const curD = first[key].detail || {};
      if (d.attempt === 1 && curD.attempt !== 1) first[key] = e;
      else if (curD.attempt === 1 && d.attempt !== 1) return;
      else if (String(e.created_at) < String(first[key].created_at)) first[key] = e;
    });

    const byQ = {};
    Object.keys(first).forEach(function (k) {
      const e = first[k];
      const d = e.detail || {};
      const s = sittingOf(e);
      const id = 'Sitting ' + s + ' Q' + (Number(d.q) + 1);
      if (!byQ[id]) byQ[id] = { sitting: s, q: d.q, n: 0, correct: 0, wrong: Object.create(null) };
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
        first_try_pct: pct(r.correct, r.n),
        first_try_correct: r.correct,
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
      map[i] = { sitting: i, n: 0, total_sec: 0, starters: Object.create(null), depth: { 25: {}, 50: {}, 75: {}, 100: {} } };
    }

    ev.forEach(function (e, i) {
      const s = sittingOf(e);
      if (s == null || !map[s]) return;
      if (e.event === 'sitting_start') {
        map[s].starters[actorOf(e, i)] = true;
      } else if (e.event === 'sitting_complete') {
        const sec = Number((e.detail || {}).seconds);
        if (Number.isFinite(sec) && sec >= 0) {
          map[s].n += 1;
          map[s].total_sec += sec;
        }
      } else if (e.event === 'scroll_depth') {
        const d = Number((e.detail || {}).depth);
        if (map[s].depth[d]) map[s].depth[d][actorOf(e, i)] = true;
      }
    });

    return Object.keys(map).map(function (k) {
      const r = map[k];
      return {
        sitting: r.sitting,
        avg_seconds: r.n ? Math.round(r.total_sec / r.n) : 0,
        completed_sessions: r.n,
        opened_by: Object.keys(r.starters).length,
        depth_25: Object.keys(r.depth[25]).length,
        depth_50: Object.keys(r.depth[50]).length,
        depth_75: Object.keys(r.depth[75]).length,
        depth_100: Object.keys(r.depth[100]).length
      };
    });
  }

  function finishedCount(journey) {
    const list = journey && Array.isArray(journey.completedSheets) ? journey.completedSheets : [];
    const seen = Object.create(null);
    list.forEach(function (v) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0 && n < SITTINGS) seen[n] = true;
    });
    return Object.keys(seen).length;
  }

  function learnerRows() {
    const rows = progressRows();
    const active = rows.filter(function (p) { return inRange(p.updated_at); });
    const doneArr = rows.map(function (p) { return finishedCount(p.journey); });
    const avgDone = doneArr.length
      ? Math.round((doneArr.reduce(function (s, n) { return s + n; }, 0) / doneArr.length) * 10) / 10
      : 0;
    const named = rows.filter(function (p) { return String(p.certificate_name || '').trim() !== ''; }).length;
    return {
      total: rows.length,
      active: active.length,
      avg_completed: avgDone,
      finished_all: doneArr.filter(function (n) { return n >= SITTINGS; }).length,
      certificates_named: named,
      cohorts: countBy(rows, function (p) { return p.cohort; })
    };
  }

  function graduateRows() {
    const ids = hideMine ? myIds() : { user: '' };
    const skip = function (row) { return !!(ids.user && row.user_id === ids.user); };
    if (Array.isArray(cache.graduates)) {
      return cache.graduates.filter(function (r) { return r && !skip(r); }).map(function (r) {
        return {
          user_id: r.user_id || '',
          name: String(r.certificate_name || '').trim(),
          email: r.email || '',
          sittings: Number(r.sittings) || 0,
          serial: /^SD-[0-9]{4}-[0-9A-F]{8}$/.test(String(r.serial || '')) ? r.serial : '',
          issued_at: r.issued_at || '',
          certificates: Number(r.certificates) || 0,
          downloaded_at: r.first_download_at || '',
          last_active: r.last_active || ''
        };
      });
    }
    const downloads = Object.create(null);
    (cache.events || []).forEach(function (e) {
      if (!e.user_id || e.event !== 'feature_use' || !e.detail || e.detail.feature !== 'cert_download') return;
      if (!downloads[e.user_id] || String(e.created_at) < String(downloads[e.user_id])) downloads[e.user_id] = e.created_at;
    });
    return progressRows().filter(function (r) {
      return finishedCount(r.journey) >= SITTINGS;
    }).map(function (r) {
      return {
        user_id: r.user_id || '',
        name: String(r.certificate_name || '').trim(),
        email: '',
        sittings: finishedCount(r.journey),
        serial: '',
        issued_at: '',
        certificates: 0,
        downloaded_at: downloads[r.user_id] || '',
        last_active: r.updated_at || ''
      };
    }).sort(function (a, b) { return String(b.last_active).localeCompare(String(a.last_active)); });
  }

  function day(iso) {
    const when = new Date(iso);
    if (!iso || Number.isNaN(when.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(when);
    } catch (e) {
      return when.toISOString().slice(0, 10);
    }
  }

  function graduatesHtml(rows) {
    const ready = Array.isArray(cache.graduates);
    const setup = ready ? '' : note('Email addresses and certificate numbers appear here after tools/supabase-certificates.sql is run in Supabase. Until then this list comes from saved progress, and downloads are only matched within the time range above.');
    if (!rows.length) return '<p class="insights-empty">No one has finished all ' + SITTINGS + ' sittings yet.</p>' + setup;
    return '<div class="igrad-tools">' +
        '<label class="igrad-search"><span class="sr-only">Search graduates</span>' +
        '<input type="search" id="insights-grad-search" placeholder="Search name, email or certificate number" value="' + escapeHtml(gradQuery) + '"></label>' +
        '<span class="igrad-count" id="insights-grad-count" aria-live="polite"></span>' +
      '</div>' +
      '<div class="igrad-wrap"><table class="igrad">' +
        '<thead><tr><th scope="col">Name on certificate</th><th scope="col">Email</th><th scope="col">Certificate</th><th scope="col">Last active</th></tr></thead>' +
        '<tbody>' + rows.map(function (r) {
          const blob = [r.name, r.email, r.serial].join(' ').toLowerCase();
          let cert;
          if (r.serial) {
            cert = '<span class="igrad-serial">' + escapeHtml(r.serial) + '</span><small>Issued ' + escapeHtml(day(r.issued_at)) +
              (r.certificates > 1 ? ' · ' + r.certificates + ' names issued' : '') + '</small>';
          } else if (r.downloaded_at) {
            cert = '<span>Downloaded, no number</span><small>' + escapeHtml(day(r.downloaded_at)) + '</small>';
          } else {
            cert = '<span class="is-muted">Not downloaded</span>';
          }
          return '<tr data-search="' + escapeHtml(blob) + '">' +
            '<td>' + (r.name ? escapeHtml(r.name) : '<span class="is-muted">No name saved</span>') + '</td>' +
            '<td>' + (r.email ? escapeHtml(r.email) : '<span class="is-muted">—</span>') + '</td>' +
            '<td class="igrad-cert">' + cert + '</td>' +
            '<td class="igrad-date">' + escapeHtml(day(r.last_active)) + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>' + setup;
  }

  function filterGraduates(grid) {
    const input = grid.querySelector ? grid.querySelector('#insights-grad-search') : null;
    if (!input) return;
    const rows = grid.querySelectorAll('.igrad tbody tr');
    const count = grid.querySelector('#insights-grad-count');
    const q = gradQuery.trim().toLowerCase();
    let shown = 0;
    rows.forEach(function (tr) {
      const hit = !q || String(tr.getAttribute('data-search') || '').indexOf(q) >= 0;
      tr.hidden = !hit;
      if (hit) shown += 1;
    });
    if (count) count.textContent = q ? shown + ' of ' + rows.length + ' shown' : plural(rows.length, 'graduate', 'graduates');
  }

  function scoreOf(p) {
    const raw = p.rating != null ? p.rating : (p.responses && p.responses.score);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }

  function barList(pairs, opts) {
    const o = opts || {};
    if (!pairs.length) return '<p class="insights-empty">' + escapeHtml(o.empty || 'Nothing in this range.') + '</p>';
    const max = pairs.reduce(function (m, p) { return Math.max(m, p[1]); }, 0);
    return '<div class="ibars">' + pairs.map(function (p) {
      const w = max ? Math.max(p[1] ? 2 : 0, Math.round((p[1] / max) * 100)) : 0;
      const shown = o.format ? o.format(p) : num(p[1]);
      const tip = p[0] + ': ' + (o.tip ? o.tip(p) : shown);
      const muted = !p[1] && o.muteZero !== false;
      return '<div class="ibar' + (muted ? ' is-zero' : '') + '" title="' + escapeHtml(tip) + '">' +
        '<span class="ibar-label">' + escapeHtml(p[0]) + '</span>' +
        '<span class="ibar-track"><i style="width:' + w + '%"></i></span>' +
        '<b>' + escapeHtml(shown) + '</b></div>';
    }).join('') + '</div>';
  }

  function sub(text) {
    return '<h3 class="insights-sub">' + escapeHtml(text) + '</h3>';
  }

  function note(text) {
    return '<p class="insights-note">' + escapeHtml(text) + '</p>';
  }

  function panel(id, title, html, opts) {
    const o = opts || {};
    return '<section class="insights-panel' + (o.wide ? ' is-wide' : '') + '" id="panel-' + id + '" aria-labelledby="panel-' + id + '-title">' +
      '<header class="insights-panel-head">' +
        '<div><h2 id="panel-' + id + '-title">' + escapeHtml(title) + '</h2>' +
        (o.caption ? '<p class="insights-caption">' + escapeHtml(o.caption) + '</p>' : '') + '</div>' +
        '<button type="button" class="insights-csv" data-csv="' + id + '" aria-label="Download ' + escapeHtml(title) + ' as CSV">CSV</button>' +
      '</header>' + html +
      '</section>';
  }

  function tile(label, value, detail) {
    return '<div class="insights-tile">' +
      '<p class="insights-tile-label">' + escapeHtml(label) + '</p>' +
      '<p class="insights-tile-value">' + escapeHtml(value) + '</p>' +
      (detail ? '<p class="insights-tile-detail">' + escapeHtml(detail) + '</p>' : '') +
      '</div>';
  }

  function funnelHtml(funnel) {
    const max = funnel.reduce(function (m, r) { return Math.max(m, r.started); }, 0);
    if (!max && !funnel.some(function (r) { return r.completed; })) {
      return '<p class="insights-empty">No one opened a sitting in this range.</p>';
    }
    const scale = Math.max(max, 1);
    return '<div class="ifunnel-legend" aria-hidden="true">' +
        '<span><i class="is-open"></i>Opened</span><span><i class="is-done"></i>Finished</span>' +
      '</div>' +
      '<div class="ifunnel" role="table" aria-label="People who opened and finished each sitting">' +
      '<div class="ifunnel-row is-head" role="row">' +
        '<span role="columnheader">Sitting</span><span role="columnheader" class="ifunnel-chart-head">People</span>' +
        '<span role="columnheader">Opened</span><span role="columnheader">Finished</span><span role="columnheader">Rate</span>' +
      '</div>' +
      funnel.map(function (r) {
        const ow = r.started ? Math.max(2, Math.round((r.started / scale) * 100)) : 0;
        const dw = r.completed ? Math.max(2, Math.round((Math.min(r.completed, r.started || r.completed) / scale) * 100)) : 0;
        const tip = 'Sitting ' + r.sitting + ': ' + plural(r.started, 'person', 'people') + ' opened it (' + plural(r.opens, 'open', 'opens') + '), ' +
          plural(r.completed, 'person', 'people') + ' finished it (' + plural(r.finishes, 'finish', 'finishes') + ')';
        return '<div class="ifunnel-row" role="row" title="' + escapeHtml(tip) + '">' +
          '<span role="rowheader">' + r.sitting + '</span>' +
          '<span class="ifunnel-track" aria-hidden="true"><i class="is-open" style="width:' + ow + '%"></i><i class="is-done" style="width:' + dw + '%"></i></span>' +
          '<span role="cell" class="' + (r.started ? '' : 'is-zero') + '">' + num(r.started) + '</span>' +
          '<span role="cell" class="' + (r.completed ? '' : 'is-zero') + '">' + num(r.completed) + '</span>' +
          '<span role="cell" class="is-muted">' + (r.started ? pct(r.completed, r.started) + '%' : '—') + '</span>' +
          '</div>';
      }).join('') +
      '</div>';
  }

  function reachHtml(timeData) {
    const rows = timeData.filter(function (t) { return t.opened_by || t.depth_25; });
    if (!rows.length) return '<p class="insights-empty">No scroll data in this range.</p>';
    const marks = [25, 50, 75, 100];
    return '<div class="ireach" role="table" aria-label="Share of people who scrolled each sitting this far">' +
      '<div class="ireach-row is-head" role="row"><span role="columnheader">Sitting</span>' +
      marks.map(function (m) { return '<span role="columnheader">' + m + '%</span>'; }).join('') + '</div>' +
      rows.map(function (t) {
        const base = Math.max(t.opened_by, t.depth_25);
        return '<div class="ireach-row" role="row"><span role="rowheader">' + t.sitting + '</span>' +
          marks.map(function (m) {
            const n = t['depth_' + m];
            const p = pct(n, base);
            const level = n ? Math.min(5, Math.ceil(p / 20)) : 0;
            const tip = 'Sitting ' + t.sitting + ': ' + num(n) + ' of ' + num(base) + ' reached ' + m + '% of the page';
            return '<span role="cell" class="ireach-cell" data-level="' + level + '" title="' + escapeHtml(tip) + '">' + (base ? p + '%' : '—') + '</span>';
          }).join('') + '</div>';
      }).join('') + '</div>';
  }

  function quizHtml(quiz) {
    if (!quiz.length) {
      return '<p class="insights-empty">No quiz answers in this range.</p>' +
        note('Only signed-in readers can check an answer, so a guest’s pick is never recorded. Moderator accounts can finish a sitting without answering.');
    }
    return barList(quiz.map(function (q) {
      return [q.question.replace('Sitting ', 'S').replace(' Q', ' · Q'), q.first_try_pct, q];
    }), {
      muteZero: false,
      format: function (p) { return p[1] + '%'; },
      tip: function (p) {
        const q = p[2];
        return q.first_try_correct + ' of ' + q.attempts + ' right first time' + (q.top_wrong ? '; most common wrong pick ' + q.top_wrong : '');
      }
    });
  }

  function onboardHtml(sv) {
    const rows = sv.filter(function (s) { return s.responses && s.responses.kind === "onboarding"; });
    if (!rows.length) return '<p class="insights-empty">No first-reader answers in this range.</p>';
    return sub('Reading Daniel') + barList(countBy(rows, function (s) { return s.responses.daniel; })) +
      sub('Book they love') + barList(countBy(rows, function (s) { return s.responses.book; })) +
      sub('How they will use it') + barList(countBy(rows, function (s) { return s.responses.use; }));
  }

  function quotes(list) {
    const items = list.filter(Boolean).slice(0, 8);
    if (!items.length) return '';
    return '<ul class="insights-quotes">' + items.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') + '</ul>';
  }

  function render() {
    const grid = byId('insights-grid');
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
      return e.event;
    });
    const pulses = sv.filter(function (s) { return s.responses && s.responses.kind === 'sitting_pulse'; });
    const pulseScores = pulses.map(scoreOf).filter(function (n) { return n != null; });
    const pulseAvg = pulseScores.length
      ? (pulseScores.reduce(function (s, n) { return s + n; }, 0) / pulseScores.length).toFixed(1)
      : '—';
    const exits = sv.filter(function (s) { return s.responses && (s.responses.kind === 'exit' || s.responses.nps != null); });
    const npsVals = exits.map(function (s) { return Number(s.responses.nps); }).filter(function (n) { return Number.isFinite(n) && n >= 0 && n <= 10; });
    const promoters = npsVals.filter(function (n) { return n >= 9; }).length;
    const detractors = npsVals.filter(function (n) { return n <= 6; }).length;
    const nps = npsVals.length ? Math.round(((promoters - detractors) / npsVals.length) * 100) : null;
    const profs = profiles();
    const refs = countBy(profs, function (p) { return p.referred_by; });
    const signups = ev.filter(function (e) { return e.event === 'referral_signup'; }).length;
    const learners = learnerRows();
    const openedAny = uniqueBy(ev, function (e) { return e.event === 'sitting_start'; });
    const finishedAny = uniqueBy(ev, function (e) { return e.event === 'sitting_complete'; });
    const quizN = quiz.reduce(function (s, q) { return s + q.attempts; }, 0);
    const quizRight = quiz.reduce(function (s, q) { return s + q.first_try_correct; }, 0);
    const timed = timeData.filter(function (t) { return t.completed_sessions; });
    const graduates = graduateRows();
    const numbered = graduates.filter(function (g) { return g.serial; }).length;

    grid.innerHTML =
      '<div class="insights-tiles">' +
        tile('Opened a sitting', num(openedAny), 'people in this range') +
        tile('Finished a sitting', num(finishedAny), openedAny ? pct(finishedAny, openedAny) + '% of those who opened one' : 'people in this range') +
        tile('Right first time', quizN ? pct(quizRight, quizN) + '%' : '—', quizN ? plural(quizN, 'first answer', 'first answers') : 'no quiz answers yet') +
        tile('Signed-in learners', num(learners.total), num(learners.active) + ' active in this range') +
        tile('Finished the course', num(graduates.length), Array.isArray(cache.graduates) ? num(numbered) + ' with a numbered certificate' : 'all time, by saved progress') +
        tile('NPS', nps == null ? '—' : (nps > 0 ? '+' + nps : String(nps)), npsVals.length ? plural(npsVals.length, 'score', 'scores') : 'no scores yet') +
      '</div>' +
      '<div class="insights-panels">' +
      panel('funnel', 'Lesson funnel', funnelHtml(funnel), {
        wide: true,
        caption: 'People who opened each sitting, and how many of them finished it. Hover a row for raw open and finish counts.'
      }) +
      panel('graduates', 'Graduates', graduatesHtml(graduates), {
        wide: true,
        caption: 'Everyone who has finished all ' + SITTINGS + ' sittings, all time. A certificate number is issued when they download the certificate.'
      }) +
      panel('time', 'Scroll reach', reachHtml(timeData), {
        caption: 'Share of the people who opened a sitting who scrolled at least this far.'
      }) +
      panel('quiz', 'Right first time', quizHtml(quiz), {
        caption: 'Per checkpoint question, first answer per person.'
      }) +
      panel('finish-time', 'Active time to finish', timed.length
        ? barList(timed.map(function (t) { return ['Sitting ' + t.sitting, t.avg_seconds, t]; }), {
          format: function (p) { return duration(p[1]); },
          tip: function (p) { return 'average ' + duration(p[1]) + ' over ' + plural(p[2].completed_sessions, 'finish', 'finishes'); }
        }) + note('Average over finished sittings only. The clock pauses after 30 seconds without input or when the tab is hidden.')
        : '<p class="insights-empty">No finished sittings in this range.</p>') +
      panel('features', 'Feature use', barList(features)) +
      panel('pulse', 'Sitting clarity',
        '<p class="insights-stat"><b>' + escapeHtml(pulseAvg) + '</b><span> out of 5 · ' + plural(pulseScores.length, 'rating', 'ratings') + '</span></p>' +
        quotes(pulses.map(function (p) {
          const text = (p.responses && p.responses.note) || p.feedback || '';
          const rawS = p.responses && (p.responses.sitting != null ? p.responses.sitting : p.responses.sheet);
          return text ? 'Sitting ' + (rawS != null ? rawS : '?') + ': ' + text : '';
        }))) +
      panel('nps', 'Exit survey',
        '<p class="insights-stat"><b>' + (nps == null ? '—' : (nps > 0 ? '+' + nps : nps)) + '</b><span> NPS · ' + num(promoters) + ' promoters, ' + num(detractors) + ' detractors</span></p>' +
        quotes(exits.map(function (s) {
          const text = (s.responses && s.responses.changed) || s.feedback || '';
          return text ? String(text).slice(0, 180) : '';
        }))) +
      panel('learners', 'Learners',
        '<dl class="insights-dl">' +
          '<div><dt>Signed in, all time</dt><dd>' + num(learners.total) + '</dd></div>' +
          '<div><dt>Active in this range</dt><dd>' + num(learners.active) + '</dd></div>' +
          '<div><dt>Average sittings finished</dt><dd>' + escapeHtml(learners.avg_completed) + ' of ' + SITTINGS + '</dd></div>' +
          '<div><dt>Finished all ' + SITTINGS + '</dt><dd>' + num(learners.finished_all) + '</dd></div>' +
          '<div><dt>Certificate names saved</dt><dd>' + num(learners.certificates_named) + '</dd></div>' +
        '</dl>' +
        (learners.cohorts.length ? sub('Cohorts') + barList(learners.cohorts) : '')) +
      panel('profile', 'Learner profile mix',
        sub('How they will use it') + barList(countBy(profs, function (p) { return p.study_mode; })) +
        sub('Reading Daniel') + barList(countBy(profs, function (p) { return p.found_via; })) +
        sub('Book they love') + barList(countBy(profs, function (p) { return p.background; }))) +
      panel('onboard', 'First readers', onboardHtml(sv)) +
      panel('referral', 'Referrals & invites',
        '<p class="insights-stat"><b>' + num(signups) + '</b><span> referral sign-ups</span></p>' +
        sub('Top referral codes') + barList(refs.slice(0, 8))) +
      '</div>';

    grid.querySelectorAll('[data-csv]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-csv');
        const csvMap = {
          funnel: funnel,
          quiz: quiz,
          time: timeData,
          'finish-time': timeData,
          features: features.map(function (p) { return { feature: p[0], count: p[1] }; }),
          pulse: pulses.map(function (p) {
            return {
              sitting: (p.responses && (p.responses.sitting != null ? p.responses.sitting : p.responses.sheet)),
              score: scoreOf(p),
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
          onboard: sv.filter(function (s) {
            return s.responses && s.responses.kind === "onboarding";
          }).map(function (s) {
            return {
              daniel: s.responses.daniel,
              book: s.responses.book,
              use: s.responses.use,
              created_at: s.created_at
            };
          }),
          profile: profs.map(function (p) {
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
          referral: refs.map(function (p) { return { ref_code: p[0], signups: p[1] }; }),
          graduates: graduates.map(function (g) {
            return {
              name_on_certificate: g.name,
              email: g.email,
              sittings_finished: g.sittings,
              certificate_number: g.serial,
              issued_at: g.issued_at,
              first_download_at: g.downloaded_at,
              last_active: g.last_active
            };
          }),
          learners: [{
            total: learners.total,
            active_in_range: learners.active,
            avg_sittings_completed: learners.avg_completed,
            finished_all: learners.finished_all,
            certificates_named: learners.certificates_named
          }]
        };
        downloadCsv('insights-' + id + '.csv', csvMap[id] || []);
      });
    });

    const search = grid.querySelector ? grid.querySelector('#insights-grad-search') : null;
    if (search) {
      search.addEventListener('input', function () {
        gradQuery = search.value;
        filterGraduates(grid);
      });
      filterGraduates(grid);
    }

    paintStatus();
  }

  function paintStatus(message) {
    const el = byId('insights-status');
    if (!el) return;
    if (message) {
      el.textContent = message;
      return;
    }
    const parts = [num(events().length) + ' events in range'];
    if (cache.loadedAt) {
      try {
        parts.push('updated ' + new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(cache.loadedAt));
      } catch (e) {}
    }
    if (cache.capped && cache.capped.length) {
      parts.push('only the newest ' + cache.capped.join(', ') + ' were loaded, so older rows in this range are missing');
    }
    el.textContent = parts.join(' · ');
    el.classList.toggle('is-warn', !!(cache.capped && cache.capped.length));
  }

  function fetchAll(build, cap, label, capped) {
    const rows = [];
    function next(from) {
      return Promise.resolve(build().range(from, from + PAGE - 1)).then(function (r) {
        if (!r || r.error) throw new Error((r && r.error && r.error.message) || 'load_failed');
        const data = Array.isArray(r.data) ? r.data : [];
        Array.prototype.push.apply(rows, data);
        if (data.length < PAGE) return rows;
        if (rows.length >= cap) {
          capped.push(num(cap) + ' ' + label);
          return rows;
        }
        return next(from + PAGE);
      });
    }
    return next(0);
  }

  function load() {
    const c = client();
    const gate = byId('insights-gate');
    const app = byId('insights-app');
    if (!c || !isMod()) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      return;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;

    const gen = ++loadGen;
    const cut = sinceIso();
    const capped = [];
    const grid = byId('insights-grid');
    if (grid && grid.setAttribute) grid.setAttribute('aria-busy', 'true');
    paintStatus('Loading…');

    function since(q) {
      return cut ? q.gte('created_at', cut) : q;
    }

    return Promise.resolve().then(function () {
      return Promise.all([
        fetchAll(function () {
          return since(c.from('exhibit_events')
            .select('event,sitting,sheet,detail,user_id,anon_id,session_id,created_at')
            .not('event', 'in', PROBES))
            .order('created_at', { ascending: false });
        }, EVENT_CAP, 'events', capped),
        fetchAll(function () {
          return since(c.from('exhibit_surveys').select('rating,feedback,responses,created_at,role,cohort,user_id,anon_id'))
            .order('created_at', { ascending: false });
        }, ROW_CAP, 'surveys', capped),
        fetchAll(function () {
          return since(c.from('exhibit_profiles').select('user_id,study_mode,background,found_via,referred_by,referred_from_sitting,ref_code,created_at'))
            .order('created_at', { ascending: false });
        }, ROW_CAP, 'profiles', capped),
        fetchAll(function () {
          return c.from('exhibit_progress').select('user_id,journey,certificate_name,cohort,updated_at')
            .order('updated_at', { ascending: false });
        }, ROW_CAP, 'learner records', capped),
        typeof c.rpc === 'function'
          ? Promise.resolve(c.rpc('exhibit_graduates')).then(function (r) {
            return r && !r.error && Array.isArray(r.data) ? r.data : null;
          }, function () { return null; })
          : null
      ]);
    }).then(function (rows) {
      if (gen !== loadGen) return;
      cache = { events: rows[0], surveys: rows[1], profiles: rows[2], progress: rows[3], graduates: rows[4], capped: capped, loadedAt: new Date() };
      if (grid && grid.removeAttribute) grid.removeAttribute('aria-busy');
      render();
    }).catch(function () {
      if (gen !== loadGen) return;
      if (grid) {
        if (grid.removeAttribute) grid.removeAttribute('aria-busy');
        grid.innerHTML = '<p class="insights-empty insights-error" id="insights-load-error" role="alert">Could not load insights. Check your connection and press Refresh.</p>';
      }
      paintStatus('Load failed');
    });
  }

  function quarterBounds(now) {
    const d = now || new Date();
    const q = Math.floor(d.getUTCMonth() / 3);
    const start = new Date(Date.UTC(d.getUTCFullYear(), q * 3 - 3, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 0));
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  function reportStatus(text) {
    const el = byId('sid-status');
    if (el) el.textContent = text || '';
  }

  function loadRange(fromIso, toIso) {
    const c = client();
    const capped = [];
    function between(q) {
      return q.gte('created_at', fromIso).lt('created_at', toIso);
    }
    return Promise.all([
      fetchAll(function () {
        return between(c.from('exhibit_events')
          .select('event,sitting,sheet,detail,user_id,anon_id,session_id,created_at')
          .not('event', 'in', PROBES))
          .order('created_at', { ascending: false });
      }, EVENT_CAP, 'events', capped),
      fetchAll(function () {
        return between(c.from('exhibit_surveys').select('rating,responses,created_at,user_id,anon_id'))
          .order('created_at', { ascending: false });
      }, ROW_CAP, 'surveys', capped),
      fetchAll(function () {
        return between(c.from('exhibit_profiles').select('user_id,study_mode,found_via,created_at'))
          .order('created_at', { ascending: false });
      }, ROW_CAP, 'profiles', capped),
      typeof c.rpc === 'function'
        ? Promise.resolve(c.rpc('exhibit_graduates')).then(function (r) {
          return r && !r.error && Array.isArray(r.data) ? r.data : null;
        }, function () { return null; })
        : null
    ]).then(function (rows) {
      return { events: rows[0], surveys: rows[1], profiles: rows[2], graduates: rows[3], capped: capped };
    });
  }

  function ownActivity(rows) {
    const ids = myIds();
    const anons = Object.create(null);
    if (ids.anon) anons[ids.anon] = true;
    (rows || []).forEach(function (e) {
      if (ids.user && e.user_id === ids.user && e.anon_id) anons[e.anon_id] = true;
    });
    return function (row) {
      return !!((ids.user && row.user_id === ids.user) || (row.anon_id && anons[row.anon_id]));
    };
  }

  function closeReport() {
    const pages = byId('sid-pages');
    document.body.classList.remove('sid-open');
    if (pages) pages.innerHTML = '';
  }

  function buildReport() {
    const fromField = byId('sid-from');
    const toField = byId('sid-to');
    const from = fromField ? fromField.value : '';
    const to = toField ? toField.value : '';
    if (!client() || !isMod() || !window.SidReport) {
      reportStatus('Sign in as a moderator to build the report.');
      return Promise.resolve();
    }
    if (!from || !to || from > to) {
      reportStatus('Pick a start date on or before the end date.');
      return Promise.resolve();
    }
    const fromIso = from + 'T00:00:00.000Z';
    const toIso = new Date(Date.parse(to + 'T00:00:00.000Z') + 86400000).toISOString();
    reportStatus('Building the report…');
    return loadRange(fromIso, toIso).then(function (data) {
      const guestCutoff = new Date(Date.now() - 90 * 86400000).toISOString();
      const figures = window.SidReport.build(data, { from: fromIso, to: toIso, guestCutoff: guestCutoff, exclude: ownActivity(data.events) });
      const pages = byId('sid-pages');
      if (!pages) return;
      pages.innerHTML = window.SidReport.render(figures);
      document.body.classList.add('sid-open');
      window.scrollTo(0, 0);
      reportStatus('');
    }).catch(function () {
      reportStatus('Could not load the data for the report. Try again.');
    });
  }

  function bootReport() {
    const fromField = byId('sid-from');
    const toField = byId('sid-to');
    const bounds = quarterBounds();
    if (fromField && !fromField.value) fromField.value = bounds.from;
    if (toField && !toField.value) toField.value = bounds.to;
    const go = byId('sid-build');
    if (go) go.addEventListener('click', buildReport);
    const print = byId('sid-print');
    if (print) print.addEventListener('click', function () { window.print(); });
    const close = byId('sid-close');
    if (close) close.addEventListener('click', closeReport);
  }

  function boot() {
    bootReport();
    const range = byId('insights-range');
    if (range) {
      range.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-days]');
        if (!btn) return;
        days = Number(btn.getAttribute('data-days')) || 0;
        range.querySelectorAll('[data-days]').forEach(function (b) {
          const on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        load();
      });
    }
    const mine = byId('insights-hide-mine');
    if (mine) {
      hideMine = !!mine.checked;
      mine.addEventListener('change', function () {
        hideMine = !!mine.checked;
        render();
      });
    }
    const again = byId('insights-refresh');
    if (again) again.addEventListener('click', function () { load(); });
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
    graduateRows: graduateRows,
    csvEscape: csvEscape,
    downloadCsv: downloadCsv,
    render: render,
    load: load,
    setDays: function (d) { days = d; },
    setHideMine: function (v) { hideMine = !!v; },
    setCache: function (c) { cache = c; },
    getCache: function () { return cache; },
    quarterBounds: quarterBounds,
    buildReport: buildReport
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
