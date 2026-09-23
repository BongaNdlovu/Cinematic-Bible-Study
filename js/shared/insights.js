(function () {
  const TABLE = 'exhibit_events';
  const QUEUE_KEY = 'baInsightsQueue';
  const SESSION_KEY = 'baInsightsSession';
  const ANON_KEY = 'baInsightsAnon';
  const OPT_KEY = 'baInsightsOptOut';
  const REF_OWN = 'baRefCode';
  const REF_BY = 'baReferredBy';
  const REF_SIT = 'baReferredSitting';
  const MAX_QUEUE = 200;
  const BATCH = 10;
  const FLUSH_MS = 10000;
  const POSTS_PER_MIN = 12;
  const ROWS_PER_MIN = 60;
  const SURVEY_PER_HOUR = 5;
  const FLUSH_WIN = 'baFlushWin';
  const SURVEY_WIN = 'baSurveyTimes';
  let flushing = false;

  let timerSitting = null;
  let activeTimerSeconds = 0;
  let lastActiveTimestamp = Date.now();
  let depthRecorded = {};
  let timerInterval = null;

  function optedOut() {
    try { if (localStorage.getItem(OPT_KEY) === '1') return true; } catch (e) {}
    return (typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes' || navigator.globalPrivacyControl === true)) ||
           (typeof window !== 'undefined' && window.doNotTrack === '1');
  }

  function optOutFlag() {
    try { return localStorage.getItem(OPT_KEY) === '1'; } catch (e) { return false; }
  }

  function setOptOut(on) {
    try { localStorage.setItem(OPT_KEY, on ? '1' : '0'); } catch (e) {}
    upsertProfile({ analytics_opt_out: !!on });
    if (on) {
      writeQueue([]);
      const beacon = document.getElementById('cf-insight-beacon');
      if (beacon) beacon.remove();
    } else {
      injectBeacon();
    }
    document.querySelectorAll('[data-insight-optout]').forEach(function (el) {
      el.checked = !!on;
    });
  }

  function bindOptOuts() {
    document.querySelectorAll('[data-insight-optout]').forEach(function (el) {
      el.checked = optOutFlag();
      if (el.dataset.bound) return;
      el.dataset.bound = 'true';
      el.addEventListener('change', function () {
        setOptOut(el.checked);
      });
    });
  }

  function anonId() {
    try {
      let id = localStorage.getItem(ANON_KEY);
      if (!id) {
        id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(ANON_KEY, id);
      }
      return id;
    } catch (e) {
      return '';
    }
  }

  function sessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2);
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) {
      return '';
    }
  }

  function readQueue() {
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(q) ? q : [];
    } catch (e) {
      return [];
    }
  }

  function writeQueue(q) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
    } catch (e) {}
  }

  function track(event, sitting, detail) {
    if (!event || optedOut()) return;
    const sit = Number.isInteger(sitting) ? sitting : null;
    const q = readQueue();
    q.push({
      event: String(event).slice(0, 40),
      sitting: sit,
      sheet: sit,
      detail: detail || {},
      page: (typeof location !== 'undefined' && location.pathname ? location.pathname.split('/').pop() : '') || 'index.html',
      anon_id: anonId(),
      session_id: sessionId(),
      created_at: new Date().toISOString()
    });
    writeQueue(q);
  }

  function takeFlushSlot(want) {
    const now = Date.now();
    let w = { posts: [], rows: [] };
    try { w = JSON.parse(sessionStorage.getItem(FLUSH_WIN) || '{}'); } catch (e) {}
    const posts = (w.posts || []).filter(function (t) { return now - t < 60000; });
    const rows = (w.rows || []).filter(function (t) { return now - t < 60000; });
    if (posts.length >= POSTS_PER_MIN) return 0;
    const n = Math.min(want, BATCH, ROWS_PER_MIN - rows.length);
    if (n <= 0) return 0;
    posts.push(now);
    for (let i = 0; i < n; i++) rows.push(now);
    try { sessionStorage.setItem(FLUSH_WIN, JSON.stringify({ posts: posts, rows: rows })); } catch (e) {}
    return n;
  }

  function takeSurveySlot() {
    const now = Date.now();
    let times = [];
    try {
      times = JSON.parse(localStorage.getItem(SURVEY_WIN) || '[]');
      if (!Array.isArray(times)) times = [];
    } catch (e) { times = []; }
    times = times.filter(function (t) { return now - t < 3600000; });
    if (times.length >= SURVEY_PER_HOUR) return false;
    times.push(now);
    try { localStorage.setItem(SURVEY_WIN, JSON.stringify(times)); } catch (e) {}
    return true;
  }

  function flush() {
    if (flushing || optedOut()) return Promise.resolve();
    const auth = window.ScrollAuth;
    const client = auth && auth.getClient && auth.getClient();
    const user = auth && auth.getUser && auth.getUser();
    const queued = readQueue();
    if (!client || !queued.length) return Promise.resolve();
    const n = takeFlushSlot(Math.min(BATCH, queued.length));
    if (!n) return Promise.resolve();
    const batch = queued.slice(0, n);
    flushing = true;
    return client.from(TABLE).insert(batch.map(function (row) {
      return Object.assign({ user_id: user ? user.id : null }, row);
    })).then(function (res) {
      if (!res.error) writeQueue(readQueue().slice(batch.length));
    }).catch(function () {}).then(function () {
      flushing = false;
    });
  }

  function markUserActive() {
    lastActiveTimestamp = Date.now();
  }

  if (typeof window !== 'undefined') {
    ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(function (evName) {
      window.addEventListener(evName, markUserActive, { passive: true });
    });
  }

  function checkScrollDepth() {
    if (optedOut() || timerSitting == null || typeof window === 'undefined') return;
    const scrollEl = document.scrollingElement || document.documentElement;
    if (!scrollEl) return;
    const maxScroll = scrollEl.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
    const reached100 = pct >= 98 || (maxScroll - window.scrollY) <= 20;
    const milestones = [25, 50, 75, 100];
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const reached = m === 100 ? reached100 : (pct >= m);
      if (reached && !depthRecorded[m]) {
        depthRecorded[m] = true;
        track('scroll_depth', timerSitting, { depth: m });
      }
    }
  }

  function readingTimer(sitting) {
    timerSitting = Number.isInteger(sitting) ? sitting : null;
    activeTimerSeconds = 0;
    lastActiveTimestamp = Date.now();
    depthRecorded = {};

    if (!timerInterval && typeof window !== 'undefined') {
      timerInterval = setInterval(function () {
        if (optedOut()) return;
        const now = Date.now();
        const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
        const isUserActive = (now - lastActiveTimestamp) < 30000;
        if (isVisible && isUserActive) {
          activeTimerSeconds += 1;
        }
      }, 1000);
    }

    checkScrollDepth();
    return activeTimerSeconds;
  }

  function activeSeconds() {
    return activeTimerSeconds;
  }

  function resetActive() {
    activeTimerSeconds = 0;
    lastActiveTimestamp = Date.now();
    depthRecorded = {};
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        lastActiveTimestamp = Date.now();
      } else {
        flush();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    window.addEventListener('scroll', checkScrollDepth, { passive: true });
    setInterval(flush, FLUSH_MS);
  }

  if (typeof window !== 'undefined' && window.ScrollAuth && typeof window.ScrollAuth.onChange === 'function') {
    window.ScrollAuth.onChange(flush);
  }

  const PULSE_ASKED = 'baPulseAsked';
  const PULSE_PENDING = 'baPulsePending';
  const PROFILE_ASKED = 'baProfileAsked';
  let cardsReady = false;

  function readList(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }

  function clientAndUser() {
    const auth = window.ScrollAuth;
    return {
      client: auth && auth.getClient && auth.getClient(),
      user: auth && auth.getUser && auth.getUser()
    };
  }

  function insertSurvey(row) {
    const pair = clientAndUser();
    if (!pair.client || !takeSurveySlot()) return;
    pair.client.from('exhibit_surveys').insert(Object.assign({
      user_id: pair.user ? pair.user.id : null,
      anon_id: anonId(),
      cohort: '',
      role: 'Student',
      feedback: '',
      responses: {}
    }, row)).then(function () {}).catch(function () {});
  }

  function upsertProfile(fields) {
    const pair = clientAndUser();
    if (!pair.client || !pair.user) return;
    pair.client.from('exhibit_profiles').upsert(Object.assign({ user_id: pair.user.id }, fields)).then(function () {}).catch(function () {});
  }

  function ensureCardStyle() {
    if (document.getElementById('insight-card-style')) return;
    const style = document.createElement('style');
    style.id = 'insight-card-style';
    style.textContent =
      '.insight-card{position:fixed;right:1rem;bottom:1rem;z-index:72;width:min(22rem,calc(100vw - 2rem));padding:1rem 1.1rem 1.05rem;border:1px solid rgba(196,162,90,.38);background:#f7f1e4;color:#1c1914;font-family:Inter,system-ui,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.28)}' +
      'html.dark .insight-card,body.charcoal-mode .insight-card,body.night-mode .insight-card{background:#1c1914;color:#f3ead8;border-color:rgba(212,175,55,.35)}' +
      '.insight-card small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:.35rem}' +
      '.insight-card h3{margin:0 0 .35rem;font-family:Cormorant Garamond,Georgia,serif;font-size:1.15rem}' +
      '.insight-card p{margin:0 0 .7rem;font-size:13px;line-height:1.45}' +
      '.insight-card-row{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 .7rem}' +
      '.insight-card button,.insight-card select{font:inherit;font-size:12px}' +
      '.insight-card-row button,.insight-card .insight-save{border:1px solid rgba(28,25,20,.2);background:transparent;color:inherit;padding:.35rem .65rem;cursor:pointer}' +
      '.insight-card-row button.is-on,.insight-card .insight-save{background:#1c1914;color:#f7f1e4;border-color:#1c1914}' +
      'html.dark .insight-card-row button.is-on,html.dark .insight-card .insight-save,body.charcoal-mode .insight-card-row button.is-on,body.charcoal-mode .insight-card .insight-save{background:#e7decc;color:#1c1914;border-color:#e7decc}' +
      '.insight-card textarea,.insight-card select{width:100%;margin:0 0 .7rem;padding:.4rem .5rem;border:1px solid rgba(28,25,20,.2);background:transparent;color:inherit}' +
      '.insight-card-actions{display:flex;justify-content:flex-end;gap:.5rem}' +
      '.insight-card .insight-skip{border:0;background:transparent;color:inherit;opacity:.7;cursor:pointer;padding:.35rem .4rem}';
    document.head.appendChild(style);
  }

  function closeCard(id) {
    const node = document.getElementById(id);
    if (node) node.remove();
  }

  function notePulse(sheet) {
    if (!Number.isInteger(sheet)) return;
    try { sessionStorage.setItem(PULSE_PENDING, String(sheet)); } catch (e) {}
  }

  function pulseAsked(sheet) {
    return readList(PULSE_ASKED).indexOf(sheet) >= 0;
  }

  function markPulseAsked(sheet) {
    const list = readList(PULSE_ASKED);
    if (list.indexOf(sheet) < 0) {
      list.push(sheet);
      writeList(PULSE_ASKED, list);
    }
    try { sessionStorage.removeItem(PULSE_PENDING); } catch (e) {}
  }

  function showPulse(sheet) {
    if (!Number.isInteger(sheet) || pulseAsked(sheet) || optedOut()) return;
    if (document.getElementById('insight-pulse')) return;
    ensureCardStyle();
    const card = document.createElement('div');
    card.id = 'insight-pulse';
    card.className = 'insight-card';
    card.innerHTML =
      '<small>One question</small>' +
      '<h3>How clear was the last sitting?</h3>' +
      '<p>Sitting ' + sheet + ' · optional, never sold.</p>' +
      '<div class="insight-card-row" id="insight-pulse-scores">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-score="' + n + '">' + n + '</button>'; }).join('') +
      '</div>' +
      '<textarea id="insight-pulse-note" rows="2" maxlength="240" placeholder="Anything that confused you? (optional)"></textarea>' +
      '<div class="insight-card-actions">' +
        '<button type="button" class="insight-skip" id="insight-pulse-skip">Not now</button>' +
        '<button type="button" class="insight-save" id="insight-pulse-save">Save</button>' +
      '</div>';
    document.body.appendChild(card);
    let score = 0;
    card.querySelectorAll('[data-score]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        score = Number(btn.dataset.score);
        card.querySelectorAll('[data-score]').forEach(function (b) {
          b.classList.toggle('is-on', b === btn);
        });
      });
    });
    function finish() {
      markPulseAsked(sheet);
      closeCard('insight-pulse');
    }
    document.getElementById('insight-pulse-skip').addEventListener('click', finish);
    document.getElementById('insight-pulse-save').addEventListener('click', function () {
      if (score) {
        const note = (document.getElementById('insight-pulse-note').value || '').trim().slice(0, 240);
        insertSurvey({
          rating: score,
          feedback: note,
          responses: { kind: 'sitting_pulse', sitting: sheet, sheet: sheet, score: score, note: note }
        });
        track('sitting_pulse', sheet, { score: score });
      }
      finish();
    });
  }

  function maybePulse(currentSheet) {
    let pending = null;
    try { pending = Number(sessionStorage.getItem(PULSE_PENDING)); } catch (e) {}
    if (!Number.isInteger(pending)) return;
    if (Number.isInteger(currentSheet) && pending === currentSheet) return;
    showPulse(pending);
  }

  function showProfile() {
    if (optedOut()) return;
    try { if (localStorage.getItem(PROFILE_ASKED) === '1') return; } catch (e) {}
    if (document.getElementById('insight-profile')) return;
    ensureCardStyle();
    const card = document.createElement('div');
    card.id = 'insight-profile';
    card.className = 'insight-card';
    card.innerHTML =
      '<small>Optional</small>' +
      '<h3>How are you studying?</h3>' +
      '<p>Three short questions so we can teach more clearly. Skip any you prefer not to answer.</p>' +
      '<select id="insight-study-mode">' +
        '<option value="">I am studying…</option>' +
        '<option value="alone">Alone</option>' +
        '<option value="group">In a group</option>' +
        '<option value="teaching">Teaching a class</option>' +
      '</select>' +
      '<select id="insight-background">' +
        '<option value="">Background</option>' +
        '<option value="adventist">Seventh-day Adventist</option>' +
        '<option value="protestant">Other Protestant</option>' +
        '<option value="catholic">Catholic</option>' +
        '<option value="other">Other / none</option>' +
        '<option value="prefer_not">Prefer not to say</option>' +
      '</select>' +
      '<select id="insight-found">' +
        '<option value="">How did you find this site?</option>' +
        '<option value="teacher">A teacher or pastor</option>' +
        '<option value="friend">A friend or family</option>' +
        '<option value="search">Search</option>' +
        '<option value="other">Other</option>' +
      '</select>' +
      '<div class="insight-card-actions">' +
        '<button type="button" class="insight-skip" id="insight-profile-skip">Skip</button>' +
        '<button type="button" class="insight-save" id="insight-profile-save">Save</button>' +
      '</div>';
    document.body.appendChild(card);
    function finish() {
      try { localStorage.setItem(PROFILE_ASKED, '1'); } catch (e) {}
      closeCard('insight-profile');
    }
    document.getElementById('insight-profile-skip').addEventListener('click', finish);
    document.getElementById('insight-profile-save').addEventListener('click', function () {
      const study_mode = document.getElementById('insight-study-mode').value || '';
      const background = document.getElementById('insight-background').value || '';
      const found_via = document.getElementById('insight-found').value || '';
      upsertProfile({ study_mode: study_mode, background: background, found_via: found_via });
      insertSurvey({
        responses: { kind: 'profile', study_mode: study_mode, background: background, found_via: found_via }
      });
      track('profile_card', null, { study_mode: study_mode, found_via: found_via });
      finish();
    });
  }

  function maybeProfile(user) {
    if (!user || optedOut()) return;
    try { if (localStorage.getItem(PROFILE_ASKED) === '1') return; } catch (e) {}
    const pair = clientAndUser();
    if (pair.client && user.id) {
      pair.client.from('exhibit_profiles').select('study_mode').eq('user_id', user.id).maybeSingle().then(function (res) {
        if (res && res.data && res.data.study_mode) {
          try { localStorage.setItem(PROFILE_ASKED, '1'); } catch (e) {}
          return;
        }
        showProfile();
      }).catch(function () {
        showProfile();
      });
      return;
    }
    showProfile();
  }

  function injectBeacon() {
    const token = window.BAAuthConfig && window.BAAuthConfig.cfAnalyticsToken;
    if (!token || optedOut() || document.getElementById('cf-insight-beacon')) return;
    const s = document.createElement('script');
    s.id = 'cf-insight-beacon';
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: String(token) }));
    document.head.appendChild(s);
  }

  function captureRef() {
    try {
      const u = new URL(location.href);
      const ref = String(u.searchParams.get('ref') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
      const sitting = Number(u.searchParams.get('s'));
      if (!ref) return;
      localStorage.setItem(REF_BY, ref);
      if (Number.isInteger(sitting) && sitting >= 0 && sitting <= 10) {
        localStorage.setItem(REF_SIT, String(sitting));
      }
      u.searchParams.delete('ref');
      history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    } catch (e) {}
  }

  function makeCode() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  function currentRefCode() {
    try {
      let code = localStorage.getItem(REF_OWN) || '';
      if (!code) {
        const pair = clientAndUser();
        if (pair.user) {
          code = makeCode();
          localStorage.setItem(REF_OWN, code);
          upsertProfile({ ref_code: code });
        }
      }
      return code;
    } catch (e) {
      return '';
    }
  }

  function inviteUrl(sheet) {
    const u = new URL('index.html', location.href);
    const code = currentRefCode();
    if (code) u.searchParams.set('ref', code);
    if (Number.isInteger(sheet)) u.searchParams.set('s', String(sheet));
    return u.href;
  }

  function applyReferral(user, row) {
    if (!user) return;
    let ref = '';
    let sitting = null;
    try {
      ref = localStorage.getItem(REF_BY) || '';
      const n = Number(localStorage.getItem(REF_SIT));
      if (Number.isInteger(n)) sitting = n;
    } catch (e) {}
    if (!ref || ref === currentRefCode()) return;
    if (row && row.referred_by) return;
    const fields = { referred_by: ref };
    if (Number.isInteger(sitting)) fields.referred_from_sitting = sitting;
    upsertProfile(fields);
    track('referral_signup', sitting, { ref: ref });
    try { localStorage.removeItem(REF_BY); } catch (e) {}
    flush();
  }

  function ensureOwnCode(user) {
    if (!user) return;
    const pair = clientAndUser();
    if (!pair.client) return;
    pair.client.from('exhibit_profiles').select('ref_code, referred_by').eq('user_id', user.id).maybeSingle().then(function (res) {
      const row = res && res.data;
      let code = row && row.ref_code;
      if (!code) {
        code = currentRefCode() || makeCode();
        upsertProfile({ ref_code: code });
      }
      try { localStorage.setItem(REF_OWN, code); } catch (e) {}
      applyReferral(user, row);
    }).catch(function () {
      const code = currentRefCode() || makeCode();
      try { localStorage.setItem(REF_OWN, code); } catch (e) {}
      upsertProfile({ ref_code: code });
      applyReferral(user, null);
    });
  }

  function bootCards() {
    if (cardsReady) return;
    cardsReady = true;
    captureRef();
    injectBeacon();
    bindOptOuts();
    function onUser(user) {
      maybeProfile(user);
      ensureOwnCode(user);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === 'function') {
      window.ScrollAuth.onChange(onUser);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === 'function') {
      window.ScrollAuth.ready().then(function () {
        onUser(window.ScrollAuth.getUser && window.ScrollAuth.getUser());
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootCards);
    } else {
      bootCards();
    }
  }

  window.Insights = {
    track: track,
    flush: flush,
    readingTimer: readingTimer,
    activeSeconds: activeSeconds,
    resetActive: resetActive,
    notePulse: notePulse,
    maybePulse: maybePulse,
    inviteUrl: inviteUrl,
    setOptOut: setOptOut,
    optedOut: optedOut,
    bindOptOuts: bindOptOuts,
    takeSurveySlot: takeSurveySlot,
    anonId: anonId
  };
})();
