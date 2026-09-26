/**
 * progress-sync.js
 * Supabase signed-in progress synchronization.
 * Merges journey, mastery, workbench verification, and cohort metadata with cloud state.
 */
(function () {
  'use strict';

  const TABLE = 'exhibit_progress';
  const ACCOUNT_KEY = 'baProgressAccountId';
  const OUTBOX_KEY = 'baProgressOutbox';
  const PUSH_GAP_MS = 6000;
  const SAVE_MISS = 'Your progress did not save. This device will keep trying.';
  const RETRY_WAITS = [7000, 12000, 24000];
  const MAX_RETRIES = 8;
  let debounceTimer = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let applyingMerge = false;
  let isSyncing = false;
  let lastPushAt = 0;
  let knownRevision = null;

  function accountId(u) {
    return u && u.id ? String(u.id) : '';
  }

  function notifyProgressSynced() {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ba-progress-synced'));
      }
    } catch (e) {}
  }

  function clearLocalLearnerProgress() {
    try {
      if (window.BAJourney && typeof window.BAJourney.save === 'function') {
        window.BAJourney.save({
          completedSheets: [],
          pathSheet: -1,
          sheet: 0,
          unlocked: []
        });
      }
    } catch (e) {}
    try { localStorage.setItem('daniel_historicist_mastery', '[]'); } catch (e) {}
    try { localStorage.setItem('daniel_workbench_v1', '{}'); } catch (e) {}
    try { localStorage.setItem('daniel_competency_telemetry_v1', '{}'); } catch (e) {}
    try { localStorage.removeItem('daniel_certificate_name'); } catch (e) {}
  }

  function applyCloudProgress(remote) {
    const remoteJourney = (remote && remote.journey) || {};
    const remoteSheets = Array.isArray(remoteJourney.completedSheets)
      ? remoteJourney.completedSheets
      : (remote && Array.isArray(remote.mastery) ? remote.mastery : []);
    const cleanSheets = Array.from(new Set(remoteSheets.map(Number))).filter(function (n) {
      return !Number.isNaN(n) && n >= 0 && n <= 10;
    });
    try {
      if (window.BAJourney && typeof window.BAJourney.save === 'function') {
        window.BAJourney.save({
          completedSheets: cleanSheets,
          cohort: remote.cohort || remoteJourney.cohort || null,
          sheet: typeof remoteJourney.sheet === 'number' ? remoteJourney.sheet : 0,
          pathSheet: typeof remoteJourney.pathSheet === 'number' ? remoteJourney.pathSheet : -1
        });
      }
      localStorage.setItem('daniel_historicist_mastery', JSON.stringify(cleanSheets));
    } catch (e) {}
    try {
      localStorage.setItem('daniel_workbench_v1', JSON.stringify((remote && remote.workbench) || {}));
    } catch (e) {}
    try {
      localStorage.setItem('daniel_competency_telemetry_v1', JSON.stringify((remote && remote.telemetry) || {}));
    } catch (e) {}
    try {
      if (remote && remote.certificate_name) {
        localStorage.setItem('daniel_certificate_name', remote.certificate_name);
      } else {
        localStorage.removeItem('daniel_certificate_name');
      }
    } catch (e) {}
  }

  function authClient() {
    return window.ScrollAuth && typeof window.ScrollAuth.getClient === 'function' && window.ScrollAuth.getClient();
  }

  function currentUser() {
    return window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser();
  }

  function pullAndMerge() {
    const c = authClient();
    const u = currentUser();
    if (!c || !u) return Promise.resolve(null);

    const uid = accountId(u);
    const prev = (function () {
      try { return localStorage.getItem(ACCOUNT_KEY) || ''; } catch (e) { return ''; }
    })();
    const switched = !!(prev && uid && prev !== uid);
    if (switched) clearLocalLearnerProgress();
    try { if (uid) localStorage.setItem(ACCOUNT_KEY, uid); } catch (e) {}

    isSyncing = true;
    return c.from(TABLE)
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle()
      .then(function (res) {
        if (res && res.error) {
          // Table may not yet be provisioned by operator - fail silently
          isSyncing = false;
          if (switched) notifyProgressSynced();
          return null;
        }
        const remote = res && res.data;
        if (remote && typeof remote.revision === 'number') knownRevision = remote.revision;
        if (localProgressDamaged()) {
          isSyncing = false;
          return null;
        }
        if (!remote) {
          // New cloud row: do not carry another account's desk onto this login.
          if (switched) notifyProgressSynced();
          isSyncing = false;
          syncNow();
          return null;
        }

        if (switched) {
          applyCloudProgress(remote);
          notifyProgressSynced();
          isSyncing = false;
          syncNow();
          return remote;
        }

        // 1. Merge completedSheets in baJourney
        try {
          const localJourney = window.BAJourney && typeof window.BAJourney.load === 'function'
            ? window.BAJourney.load()
            : JSON.parse(localStorage.getItem('baJourney') || '{}');
          const localSheets = Array.isArray(localJourney.completedSheets) ? localJourney.completedSheets : [];
          const remoteJourney = remote.journey || {};
          const remoteSheets = Array.isArray(remoteJourney.completedSheets) ? remoteJourney.completedSheets : (Array.isArray(remote.mastery) ? remote.mastery : []);
          
          const unionSheets = Array.from(new Set([...localSheets, ...remoteSheets])).map(Number).filter(n => !Number.isNaN(n) && n >= 0 && n <= 10);
          
          const mergedCohort = localJourney.cohort || remote.cohort || remoteJourney.cohort || null;

          if (window.BAJourney && typeof window.BAJourney.save === 'function') {
            window.BAJourney.save({ completedSheets: unionSheets, cohort: mergedCohort });
          }
          localStorage.setItem('daniel_historicist_mastery', JSON.stringify(unionSheets));
        } catch (e) {}

        // 2. Merge Workbench state
        try {
          const localWb = JSON.parse(localStorage.getItem('daniel_workbench_v1') || '{}');
          const remoteWb = remote.workbench || {};
          const mergedWb = Object.assign({}, remoteWb);
          Object.keys(localWb).forEach(function (sheetId) {
            if (!mergedWb[sheetId]) mergedWb[sheetId] = {};
            Object.keys(localWb[sheetId] || {}).forEach(function (taskId) {
              if (localWb[sheetId][taskId]) mergedWb[sheetId][taskId] = true;
            });
          });
          localStorage.setItem('daniel_workbench_v1', JSON.stringify(mergedWb));
        } catch (e) {}

        // 3. Merge Telemetry
        try {
          const localTel = JSON.parse(localStorage.getItem('daniel_competency_telemetry_v1') || '{}');
          const remoteTel = remote.telemetry || {};
          const mergedArtifacts = Array.from(new Set([
            ...(localTel.verifiedArtifacts || []),
            ...(remoteTel.verifiedArtifacts || [])
          ]));
          const mergedLookups = Array.from(new Set([
            ...(localTel.scriptureLookups || []),
            ...(remoteTel.scriptureLookups || [])
          ]));
          const mergedTel = Object.assign({}, remoteTel, localTel, {
            verifiedArtifacts: mergedArtifacts,
            scriptureLookups: mergedLookups,
            capstone: localTel.capstone || remoteTel.capstone || null
          });
          localStorage.setItem('daniel_competency_telemetry_v1', JSON.stringify(mergedTel));
        } catch (e) {}

        // 4. Merge Certificate Name
        try {
          const localCertName = localStorage.getItem('daniel_certificate_name') || '';
          if (!localCertName && remote.certificate_name) {
            localStorage.setItem('daniel_certificate_name', remote.certificate_name);
          }
        } catch (e) {}

        try {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent('ba-progress-synced'));
          }
        } catch (e) {}

        isSyncing = false;
        // Push merged state back to ensure both client and cloud match
        syncNow();
        return remote;
      })
      .catch(function (err) {
        isSyncing = false;
        return null;
      });
  }

  function noteUnreadable() {
    if (window.SiteErrors && typeof window.SiteErrors.show === 'function') {
      window.SiteErrors.show('Saved progress on this device could not be read. It was left unchanged.', 'storage');
    }
  }

  function parseStored(key) {
    let raw = null;
    try { raw = localStorage.getItem(key); } catch (e) { return { damaged: true }; }
    if (raw == null || raw === '') return { damaged: false, missing: true };
    try { return { damaged: false, value: JSON.parse(raw) }; }
    catch (e) { return { damaged: true }; }
  }

  function localProgressDamaged() {
    if (window.BAJourney && typeof window.BAJourney.isDamaged === 'function' && window.BAJourney.isDamaged()) {
      return true;
    }
    const keys = ['baJourney', 'daniel_historicist_mastery', 'daniel_workbench_v1', 'daniel_competency_telemetry_v1'];
    for (let i = 0; i < keys.length; i++) {
      if (parseStored(keys[i]).damaged) return true;
    }
    return false;
  }

  function sheetUnion(left, right) {
    return Array.from(new Set([].concat(left || [], right || []).map(Number))).filter(function (n) {
      return !Number.isNaN(n) && n >= 0 && n <= 10;
    });
  }

  function taskUnion(remoteWb, localWb) {
    const merged = Object.assign({}, remoteWb || {});
    Object.keys(localWb || {}).forEach(function (sheetId) {
      if (!merged[sheetId]) merged[sheetId] = {};
      Object.keys(localWb[sheetId] || {}).forEach(function (taskId) {
        if (localWb[sheetId][taskId]) merged[sheetId][taskId] = true;
      });
    });
    return merged;
  }

  function keepText(preferred, fallback) {
    const chosen = preferred == null ? '' : String(preferred).trim();
    if (chosen) return chosen;
    return fallback == null ? '' : String(fallback);
  }

  function telemetryUnion(localTel, remoteTel) {
    const local = localTel || {};
    const remote = remoteTel || {};
    return Object.assign({}, remote, local, {
      verifiedArtifacts: Array.from(new Set([].concat(local.verifiedArtifacts || [], remote.verifiedArtifacts || []))),
      scriptureLookups: Array.from(new Set([].concat(local.scriptureLookups || [], remote.scriptureLookups || []))),
      capstone: local.capstone || remote.capstone || null
    });
  }

  function mergeConflict(local, remote) {
    const localJourney = (local && local.journey) || {};
    const remoteJourney = (remote && remote.journey) || {};
    const sheets = sheetUnion(localJourney.completedSheets, remoteJourney.completedSheets || (remote && remote.mastery));
    const cohort = keepText(localJourney.cohort || (local && local.cohort), (remote && remote.cohort) || remoteJourney.cohort) || null;
    return {
      journey: Object.assign({}, remoteJourney, localJourney, { completedSheets: sheets, cohort: cohort }),
      mastery: sheets,
      workbench: taskUnion(remote && remote.workbench, local && local.workbench),
      telemetry: telemetryUnion(local && local.telemetry, remote && remote.telemetry),
      certificate_name: keepText(local && local.certificate_name, remote && remote.certificate_name),
      cohort: cohort || ''
    };
  }

  function reportSaveMiss(cause, ms) {
    if (window.SiteErrors && typeof window.SiteErrors.show === 'function') {
      window.SiteErrors.show(SAVE_MISS, 'save');
    }
    if (window.SiteOps && typeof window.SiteOps.report === 'function') {
      window.SiteOps.report('save_failed', cause || 'error', { ms: ms, cause: cause || 'error' });
    }
  }

  function storeOutbox(payload, expectedRevision) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify({
        payload: payload,
        expectedRevision: expectedRevision
      }));
    } catch (e) {}
  }

  function readOutbox() {
    try {
      const raw = localStorage.getItem(OUTBOX_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.payload) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function rememberOutbox(payload, expectedRevision, cause, ms) {
    storeOutbox(payload, expectedRevision);
    reportSaveMiss(cause, ms);
  }

  function clearSaveMiss() {
    try { localStorage.removeItem(OUTBOX_KEY); } catch (e) {}
    if (window.SiteErrors && typeof window.SiteErrors.current === 'function' && window.SiteErrors.current() === SAVE_MISS) {
      window.SiteErrors.clear();
    }
  }

  function collectPayload() {
    if (localProgressDamaged()) {
      noteUnreadable();
      return null;
    }
    let journey = {};
    if (window.BAJourney && typeof window.BAJourney.load === 'function') journey = window.BAJourney.load() || {};
    const mastery = parseStored('daniel_historicist_mastery');
    const workbench = parseStored('daniel_workbench_v1');
    const telemetry = parseStored('daniel_competency_telemetry_v1');
    if (mastery.damaged || workbench.damaged || telemetry.damaged) {
      noteUnreadable();
      return null;
    }
    let certName = '';
    try { certName = localStorage.getItem('daniel_certificate_name') || ''; } catch (e) {}
    return {
      journey: journey,
      mastery: mastery.missing ? [] : mastery.value,
      workbench: workbench.missing ? {} : workbench.value,
      telemetry: telemetry.missing ? {} : telemetry.value,
      certificate_name: certName,
      cohort: (journey && journey.cohort) || ''
    };
  }

  function newSaveId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }

  function errorCause(error) {
    const message = error && error.message ? String(error.message) : '';
    if (message.indexOf('payload_too_large') !== -1) return 'payload_too_large';
    if (message.indexOf('rate_limit') !== -1) return 'rate_limit';
    if (message.indexOf('AbortError') !== -1 || message.indexOf('TimeoutError') !== -1 || message.indexOf('aborted') !== -1) {
      return 'timeout';
    }
    return 'error';
  }

  function writeMergedLocal(merged) {
    applyingMerge = true;
    try {
      const journey = (merged && merged.journey) || {};
      const patch = { completedSheets: journey.completedSheets || [] };
      if (journey.cohort) patch.cohort = journey.cohort;
      if (typeof journey.sheet === 'number') patch.sheet = journey.sheet;
      if (typeof journey.pathSheet === 'number') patch.pathSheet = journey.pathSheet;
      if (window.BAJourney && typeof window.BAJourney.save === 'function') window.BAJourney.save(patch);
      localStorage.setItem('daniel_historicist_mastery', JSON.stringify(merged.mastery || []));
      localStorage.setItem('daniel_workbench_v1', JSON.stringify(merged.workbench || {}));
      localStorage.setItem('daniel_competency_telemetry_v1', JSON.stringify(merged.telemetry || {}));
      if (merged.certificate_name) localStorage.setItem('daniel_certificate_name', merged.certificate_name);
    } catch (e) {}
    applyingMerge = false;
  }

  function armRetry(fn, wait) {
    const handle = setTimeout(fn, wait);
    if (handle && typeof handle.unref === 'function') handle.unref();
    return handle;
  }

  function scheduleRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    if (retryAttempt >= MAX_RETRIES) {
      retryTimer = null;
      return;
    }
    const wait = RETRY_WAITS[Math.min(retryAttempt, RETRY_WAITS.length - 1)];
    retryTimer = armRetry(function () {
      retryTimer = null;
      runScheduledRetry();
    }, wait);
  }

  function queueFailure(payload, expectedRevision, cause, ms) {
    if (cause === 'payload_too_large') {
      reportSaveMiss(cause, ms);
      return null;
    }
    rememberOutbox(payload, expectedRevision, cause, ms);
    scheduleRetry();
    return null;
  }

  function saveCall(client, expectedRevision, payload) {
    return client.rpc('save_exhibit_progress', {
      expected_revision: expectedRevision,
      payload: payload
    });
  }

  function settleSave(client, expectedRevision, payload) {
    const started = Date.now();
    return saveCall(client, expectedRevision, payload).then(function (res) {
      const ms = Date.now() - started;
      if (res && res.error) return queueFailure(payload, expectedRevision, errorCause(res.error), ms);
      if (!res || !res.data) return queueFailure(payload, expectedRevision, 'error', ms);
      if (res.data.status === 'conflict') {
        knownRevision = res.data.revision;
        const merged = mergeConflict(payload, res.data.row);
        merged.save_id = payload.save_id;
        writeMergedLocal(merged);
        return queueFailure(merged, res.data.revision, 'conflict', ms);
      }
      if (res.data.status !== 'ok') return queueFailure(payload, knownRevision, 'error', ms);
      knownRevision = res.data.revision;
      retryAttempt = 0;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      clearSaveMiss();
      return res.data;
    }).catch(function (err) {
      const ms = Date.now() - started;
      const cause = err && (err.name === 'AbortError' || err.name === 'TimeoutError') ? 'timeout' : 'error';
      return queueFailure(payload, expectedRevision, cause, ms);
    });
  }

  function pushFresh(client) {
    const payload = collectPayload();
    if (!payload) return Promise.resolve(null);
    payload.save_id = newSaveId();
    retryAttempt = 0;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    storeOutbox(payload, knownRevision);
    lastPushAt = Date.now();
    return settleSave(client, knownRevision, payload);
  }

  function pushLocalToRemote(fromTimer) {
    const c = authClient();
    const u = currentUser();
    if (!c || !u || isSyncing) return Promise.resolve(null);
    if (fromTimer) {
      const stored = readOutbox();
      if (!stored) return Promise.resolve(null);
      lastPushAt = Date.now();
      return settleSave(c, stored.expectedRevision, stored.payload);
    }
    if (Date.now() - lastPushAt < PUSH_GAP_MS) {
      const payload = collectPayload();
      if (!payload) return Promise.resolve(null);
      payload.save_id = newSaveId();
      retryAttempt = 0;
      storeOutbox(payload, knownRevision);
      scheduleRetry();
      return Promise.resolve(null);
    }
    return pushFresh(c);
  }

  function runScheduledRetry() {
    if (retryAttempt >= MAX_RETRIES) return Promise.resolve(null);
    retryAttempt += 1;
    return pushLocalToRemote(true);
  }

  function syncNow() {
    if (applyingMerge) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { pushLocalToRemote(false); }, PUSH_GAP_MS);
  }

  function init() {
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === 'function') {
      window.ScrollAuth.ready().then(function () {
        if (currentUser()) pullAndMerge();
      });
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === 'function') {
      window.ScrollAuth.onChange(function (u) {
        if (u) pullAndMerge();
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', syncNow);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ProgressSync = {
    init: init,
    pullAndMerge: pullAndMerge,
    syncNow: syncNow,
    pushNow: function () { return pushLocalToRemote(false); },
    retryNow: runScheduledRetry,
    retryPending: function () { return !!retryTimer; },
    mergeConflict: mergeConflict
  };
})();
