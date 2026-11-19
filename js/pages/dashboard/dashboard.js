(function () {
  const { SITTINGS, EVENT_CAP, ROW_CAP, PROBES, ALL_TIME_FROM, ACTIVITY_COUNT_FROM, client, isMod, byId, sinceIso, activityCut, escapeHtml, downloadCsv, events, surveys, profiles, uniqueBy, funnelRows, quizRows, timeAndDepthRows, learnerRows, graduateRows, barList, sub, note, panel, targetTile, tile, funnelHtml, reachHtml, quizHtml, onboardHtml, quotes, paintStatus, fetchAll, withSignal, GATE_SIGN_IN, GATE_SECOND_STEP, needsSecondStep, reportStatus, loadRange, ownActivity, setBuilding, getCache, setCache, setDays, setHideMine, getCountFrom, setCountFrom } = window.DashboardData;
  const { csvEscape, num, pct, duration, plural, countBy, day, scoreOf, quarterBounds } = window.InsightsFormat;
  let loadGen = 0;
  let gradQuery = '';

  function graduatesHtml(rows) {
    const ready = Array.isArray(getCache().graduates);
    const setup = ready ? '' : note('Email addresses and certificate numbers appear here after db/migrations/016-certificates.sql is run in Supabase. Until then this list comes from saved progress, and downloads are only matched within the time range above.');
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
    if (count) {
      if (q && rows.length && !shown) {
        /* Filtered-empty state: name it and offer the one-click clear. */
        count.innerHTML = '';
        count.appendChild(document.createTextNode('No graduates match \u201c' + gradQuery.trim() + '\u201d \u00b7 '));
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'igrad-clear';
        clear.textContent = 'Clear search';
        clear.addEventListener('click', function () {
          gradQuery = '';
          const box = grid.querySelector('#insights-grad-search');
          if (box) {
            box.value = '';
            box.focus();
          }
          filterGraduates(grid);
        });
        count.appendChild(clear);
      } else {
        count.textContent = q ? shown + ' of ' + rows.length + ' shown' : plural(rows.length, 'graduate', 'graduates');
      }
    }
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
    const npsVals = exits.filter(function (s) {
      const raw = s.responses.nps;
      return typeof raw !== 'boolean' && raw !== null && raw !== undefined && String(raw).trim() !== '';
    }).map(function (s) { return Number(s.responses.nps); }).filter(function (n) { return Number.isFinite(n) && n >= 0 && n <= 10; });
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
        targetTile(getCache().participation) +
        tile('Opened a sitting', num(openedAny), 'people in this range') +
        tile('Finished a sitting', num(finishedAny), openedAny ? pct(finishedAny, openedAny) + '% of those who opened one' : 'people in this range') +
        tile('Right first time', quizN ? pct(quizRight, quizN) + '%' : '—', quizN ? plural(quizN, 'first answer', 'first answers') : 'no quiz answers yet') +
        tile('Signed-in learners', num(learners.total), num(learners.active) + ' active in this range') +
        tile('Finished the course', num(graduates.length), Array.isArray(getCache().graduates) ? num(numbered) + ' with a numbered certificate' : 'all time, by saved progress') +
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
        sub('How they study') + barList(countBy(profs, function (p) { return p.study_mode; })) +
        sub('How they found the site') + barList(countBy(profs, function (p) { return p.found_via; })) +
        sub('Background') + barList(countBy(profs, function (p) { return p.background; }))) +
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

  let loadAbort = null;
  let loadSlowTimer = 0;

  let gateGen = 0;

  function explainGate(c, gate) {
    const gen = ++gateGen;
    gate.innerHTML = GATE_SIGN_IN;
    return needsSecondStep(c).then(function (isSecondStep) {
      if (gen !== gateGen || !isSecondStep) return;
      gate.innerHTML = GATE_SECOND_STEP;
    });
  }

  function load() {
    const c = client();
    const gate = byId('insights-gate');
    const app = byId('insights-app');
    if (!c || !isMod()) {
      if (app) app.hidden = true;
      if (!gate) return;
      gate.hidden = false;
      return explainGate(c, gate);
    }
    gateGen++;
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;

    /* Supersede any in-flight load first: its pages stop, its render is
       already blocked by the generation guard below. */
    if (loadAbort) { try { loadAbort.abort(); } catch (e) {} }
    if (loadSlowTimer) { clearTimeout(loadSlowTimer); loadSlowTimer = 0; }
    const ctrl = ('AbortController' in window) ? new AbortController() : null;
    loadAbort = ctrl;
    const signal = ctrl ? ctrl.signal : null;

    const gen = ++loadGen;
    const cut = sinceIso();
    const capped = [];
    const grid = byId('insights-grid');
    if (grid && grid.setAttribute) grid.setAttribute('aria-busy', 'true');
    paintStatus('Loading\u2026');
    loadSlowTimer = setTimeout(function () {
      loadSlowTimer = 0;
      if (gen === loadGen) paintStatus('Still loading \u2014 this range pulls a lot of records\u2026');
    }, 4000);

    const activityFrom = activityCut();

    function since(q) {
      return cut ? q.gte('created_at', cut) : q;
    }

    function sinceActivity(q) {
      return q.gte('created_at', activityFrom);
    }

    return Promise.resolve().then(function () {
      return Promise.all([
        fetchAll(function () {
          return withSignal(sinceActivity(c.from('exhibit_events')
            .select('event,sitting,sheet,detail,user_id,anon_id,session_id,created_at')
            .not('event', 'in', PROBES))
            .order('created_at', { ascending: false }), signal);
        }, EVENT_CAP, 'events', capped),
        fetchAll(function () {
          return withSignal(sinceActivity(c.from('exhibit_surveys').select('rating,feedback,responses,created_at,role,cohort,user_id,anon_id'))
            .order('created_at', { ascending: false }), signal);
        }, ROW_CAP, 'surveys', capped),
        fetchAll(function () {
          return withSignal(since(c.from('exhibit_profiles').select('user_id,study_mode,background,found_via,referred_by,referred_from_sitting,ref_code,created_at'))
            .order('created_at', { ascending: false }), signal);
        }, ROW_CAP, 'profiles', capped),
        fetchAll(function () {
          return withSignal(c.from('exhibit_progress').select('user_id,journey,certificate_name,cohort,updated_at')
            .order('updated_at', { ascending: false }), signal);
        }, ROW_CAP, 'learner records', capped),
        typeof c.rpc === 'function'
          ? Promise.resolve(c.rpc('exhibit_graduates')).then(function (r) {
            return r && !r.error && Array.isArray(r.data) ? r.data : null;
          }, function () { return null; })
          : null,
        typeof c.rpc === 'function'
          ? Promise.resolve(c.rpc('exhibit_participation', { p_from: ALL_TIME_FROM, p_to: new Date(Date.now() + 86400000).toISOString() })).then(function (r) {
            const row = r && !r.error && Array.isArray(r.data) ? r.data[0] : null;
            return row || null;
          }, function () { return null; })
          : null
      ]);
    }).then(function (rows) {
      if (gen !== loadGen) return;
      if (loadSlowTimer) { clearTimeout(loadSlowTimer); loadSlowTimer = 0; }
      if (loadAbort === ctrl) loadAbort = null;
      setCache({ events: rows[0], surveys: rows[1], profiles: rows[2], progress: rows[3], graduates: rows[4], participation: rows[5], capped: capped, loadedAt: new Date() });
      if (grid && grid.removeAttribute) grid.removeAttribute('aria-busy');
      render();
    }).catch(function (err) {
      if (gen !== loadGen) return;
      if (loadSlowTimer) { clearTimeout(loadSlowTimer); loadSlowTimer = 0; }
      if (loadAbort === ctrl) loadAbort = null;
      /* Abort here means a newer load superseded this one; its gen check above
         already covers that, so anything reaching this line is a real error. */
      const kind = window.SiteNet && typeof window.SiteNet.classify === 'function'
        ? window.SiteNet.classify(err)
        : 'client';
      const detail = {
        offline: 'You are offline \u2014 insights need a connection.',
        auth: 'Your session ended. Sign in again, then press Refresh.',
        forbidden: 'Moderator access is not available on this membership.',
        rate: 'The record is being asked a little too quickly. Wait a few seconds, then press Refresh.',
        timeout: 'The record took too long to answer. Check your connection and press Refresh.',
        server: 'The exhibit\u2019s service hiccuped. Try again in a minute.'
      }[kind];
      const message = detail || 'Could not load insights. Check your connection and press Refresh.';
      if (grid) {
        if (grid.removeAttribute) grid.removeAttribute('aria-busy');
        /* Every class above is static copy, so writing it as markup is safe. */
        grid.innerHTML = '<p class="insights-empty insights-error" id="insights-load-error" role="alert">' +
          escapeHtml(message) + '</p>';
      }
      paintStatus('Load failed');
    });
  }

  function closeReport() {
    reportGen++;
    setBuilding(false);
    const pages = byId('sid-pages');
    document.body.classList.remove('sid-open');
    if (pages) pages.innerHTML = '';
  }

  let reportGen = 0;

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
    const gen = ++reportGen;
    reportStatus('Building the report…');
    setBuilding(true);
    return loadRange(fromIso, toIso).then(function (data) {
      if (gen !== reportGen) return;
      const guestCutoff = new Date(Date.now() - 90 * 86400000).toISOString();
      const figures = window.SidReport.build(data, { from: fromIso, to: toIso, guestCutoff: guestCutoff, countFrom: getCountFrom(), exclude: ownActivity(data.events) });
      const pages = byId('sid-pages');
      if (!pages) return;
      pages.innerHTML = window.SidReport.render(figures);
      document.body.classList.add('sid-open');
      window.scrollTo(0, 0);
      reportStatus('');
    }).catch(function () {
      if (gen !== reportGen) return;
      reportStatus('Could not load the data for the report. Try again.');
    }).then(function () {
      if (gen === reportGen) setBuilding(false);
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
        setDays(Number(btn.getAttribute('data-days')) || 0);
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
      setHideMine(!!mine.checked);
      mine.addEventListener('change', function () {
        setHideMine(!!mine.checked);
        render();
      });
    }
    const again = byId('insights-refresh');
    if (again) again.addEventListener('click', function () { load(); });
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === 'function') {
      window.ScrollAuth.ready().then(function () {
        load();
        if (typeof window.ScrollAuth.onChange === 'function') window.ScrollAuth.onChange(load);
      });
    }
  }

  window.InsightsDashboard = {
    funnelRows: funnelRows,
    quizRows: quizRows,
    timeAndDepthRows: timeAndDepthRows,
    graduateRows: graduateRows,
    targetTile: targetTile,
    csvEscape: csvEscape,
    downloadCsv: downloadCsv,
    render: render,
    load: load,
    setDays: function (d) { setDays(d); },
    setCountFrom: function (iso) { setCountFrom(String(iso || ACTIVITY_COUNT_FROM)); },
    loadRange: loadRange,
    setHideMine: function (v) { setHideMine(!!v); },
    setCache: function (c) { setCache(c); },
    getCache: function () { return getCache(); },
    quarterBounds: quarterBounds,
    buildReport: buildReport
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
