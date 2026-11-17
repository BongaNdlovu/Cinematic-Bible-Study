(function () {
  const { countBy, csvEscape, num, pct, plural } = window.InsightsFormat;
  const SITTINGS = 11;

  const PAGE = 1000;

  const EVENT_CAP = 20000;

  const ROW_CAP = 5000;

  const PROBES = '("pen_probe","live_insert_probe")';

  let days = 30;

  let hideMine = true;

  let cache = { events: [], surveys: [], profiles: [], progress: [], graduates: null, participation: null, capped: [] };

  const ALL_TIME_FROM = '2000-01-01T00:00:00.000Z';

  const ACTIVITY_COUNT_FROM = '2026-10-19T00:00:00.000Z';

  let countFrom = ACTIVITY_COUNT_FROM;

  const COUNTER_TARGET = 700;

  const SID_TARGET = 500;

  function client() { return window.SiteCore.authClient(); }

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

  function activityCut() {
    const cut = sinceIso();
    const isRangeLater = !!cut && cut > countFrom;
    return isRangeLater ? cut : countFrom;
  }

  function isCountFromApplied() {
    const cut = sinceIso();
    return !cut || cut < countFrom;
  }

  function escapeHtml(value) { return window.SiteCore.escapeHtml(value); }

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
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
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

  function keepActivity(rows) {
    const cut = activityCut();
    return keep(rows).filter(function (r) { return String(r.created_at || '') >= cut; });
  }

  function events() {
    return keepActivity(cache.events);
  }

  function surveys() {
    return keepActivity(cache.surveys);
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

  function targetTile(participation) {
    const began = participation ? Number(participation.began) : NaN;
    const isKnown = Number.isFinite(began) && began >= 0;
    if (!isKnown) {
      return tile('Toward ' + num(COUNTER_TARGET), '—', 'verified count not available');
    }
    const detail = pct(began, COUNTER_TARGET) + '% of ' + num(COUNTER_TARGET) + ' · ' +
      pct(began, SID_TARGET) + '% of the ' + num(SID_TARGET) + ' SID target · registered and passed a sitting\'s checkpoints, all time';
    return tile('Toward ' + num(COUNTER_TARGET), num(began) + ' / ' + num(COUNTER_TARGET), detail);
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

  function paintStatus(message) {
    const el = byId('insights-status');
    if (!el) return;
    if (message) {
      el.textContent = message;
      return;
    }
    const parts = [num(events().length) + ' events in range'];
    if (isCountFromApplied()) parts.push('study activity counted from 19 October 2026, when analytics consent began');
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
      const q = Promise.resolve(build().range(from, from + PAGE - 1));
      return q.then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error('load_failed');
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

  /* Wire the builder's optional abortSignal so a superseded load stops pulling
     pages instead of fanning out to the cap in the background. */
  function withSignal(q, signal) {
    if (signal && typeof q.abortSignal === 'function') return q.abortSignal(signal);
    return q;
  }

  const GATE_SIGN_IN = 'Sign in with the moderator account from the <a href="account.html?next=insights.html">Account</a> page to open this page.';

  const GATE_SECOND_STEP = 'You are signed in. Enter the code from your authenticator app on the <a href="account.html?next=insights.html">Account</a> page to open this page.';

  function needsSecondStep(c) {
    const mfa = c && c.auth && c.auth.mfa;
    const user = window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser();
    if (!user || !mfa || typeof mfa.getAuthenticatorAssuranceLevel !== 'function') return Promise.resolve(false);
    return Promise.resolve(mfa.getAuthenticatorAssuranceLevel()).then(function (res) {
      const level = res && !res.error ? res.data : null;
      if (!level) return false;
      return level.nextLevel === 'aal2' && level.currentLevel !== 'aal2';
    }, function () { return false; });
  }

  function reportStatus(text) {
    const el = byId('sid-status');
    if (el) el.textContent = text || '';
  }

  function loadRange(fromIso, toIso) {
    const c = client();
    const capped = [];
    const isFromBeforeCount = fromIso < countFrom;
    const activityFrom = isFromBeforeCount ? countFrom : fromIso;
    function between(q) {
      return q.gte('created_at', fromIso).lt('created_at', toIso);
    }
    function betweenActivity(q) {
      return q.gte('created_at', activityFrom).lt('created_at', toIso);
    }
    return Promise.all([
      fetchAll(function () {
        return betweenActivity(c.from('exhibit_events')
          .select('event,sitting,sheet,detail,user_id,anon_id,session_id,created_at')
          .not('event', 'in', PROBES))
          .order('created_at', { ascending: false });
      }, EVENT_CAP, 'events', capped),
      fetchAll(function () {
        return betweenActivity(c.from('exhibit_surveys').select('rating,responses,created_at,user_id,anon_id'))
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
        : null,
      typeof c.rpc === 'function'
        ? Promise.resolve(c.rpc('exhibit_participation', { p_from: fromIso, p_to: toIso })).then(function (r) {
          const row = r && !r.error && Array.isArray(r.data) ? r.data[0] : null;
          return row || null;
        }, function () { return null; })
        : null
    ]).then(function (rows) {
      return { events: rows[0], surveys: rows[1], profiles: rows[2], graduates: rows[3], participation: rows[4], capped: capped };
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

  function setBuilding(on) {
    const go = byId('sid-build');
    if (!go) return;
    go.disabled = on;
    go.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function getCache() { return cache; }
  function setCache(value) { cache = value; }
  function getDays() { return days; }
  function setDays(value) { days = value; }
  function getHideMine() { return hideMine; }
  function setHideMine(value) { hideMine = value; }
  function getCountFrom() { return countFrom; }
  function setCountFrom(value) { countFrom = value; }

  window.DashboardData = Object.freeze({ SITTINGS, PAGE, EVENT_CAP, ROW_CAP, PROBES, ALL_TIME_FROM, ACTIVITY_COUNT_FROM, COUNTER_TARGET, SID_TARGET, client, isMod, byId, sinceIso, inRange, activityCut, isCountFromApplied, escapeHtml, downloadCsv, myIds, mineTest, keep, keepActivity, events, surveys, profiles, progressRows, sittingOf, actorOf, uniqueBy, funnelRows, quizRows, timeAndDepthRows, finishedCount, learnerRows, graduateRows, barList, sub, note, panel, targetTile, tile, funnelHtml, reachHtml, quizHtml, onboardHtml, quotes, paintStatus, fetchAll, withSignal, GATE_SIGN_IN, GATE_SECOND_STEP, needsSecondStep, reportStatus, loadRange, ownActivity, setBuilding, getCache, setCache, getDays, setDays, getHideMine, setHideMine, getCountFrom, setCountFrom });
})();
