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
  let debounceTimer = null;
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

  function reportSaveMiss() {
    if (window.SiteErrors && typeof window.SiteErrors.show === 'function') {
      window.SiteErrors.show(SAVE_MISS, 'save');
    }
    if (window.SiteOps && typeof window.SiteOps.report === 'function') {
      window.SiteOps.report('save_failed', 'push');
    }
  }

  function rememberOutbox(payload, expectedRevision) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify({
        payload: payload,
        expectedRevision: expectedRevision
      }));
    } catch (e) {}
    reportSaveMiss();
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

  function saveCall(client, expectedRevision, payload) {
    return client.rpc('save_exhibit_progress', {
      expected_revision: expectedRevision,
      payload: payload
    });
  }

  function settleSave(client, expectedRevision, payload, triesLeft) {
    return saveCall(client, expectedRevision, payload).then(function (res) {
      if (!res || res.error || !res.data) {
        rememberOutbox(payload, expectedRevision);
        return null;
      }
      if (res.data.status === 'conflict' && triesLeft > 0) {
        knownRevision = res.data.revision;
        return settleSave(client, res.data.revision, mergeConflict(payload, res.data.row), triesLeft - 1);
      }
      if (res.data.status !== 'ok') {
        rememberOutbox(payload, knownRevision);
        return null;
      }
      knownRevision = res.data.revision;
      clearSaveMiss();
      return res.data;
    }).catch(function () {
      rememberOutbox(payload, expectedRevision);
      return null;
    });
  }

  function pushLocalToRemote() {
    const c = authClient();
    const u = currentUser();
    if (!c || !u || isSyncing) return Promise.resolve(null);
    const now = Date.now();
    if (now - lastPushAt < PUSH_GAP_MS) return Promise.resolve(null);
    const payload = collectPayload();
    if (!payload) return Promise.resolve(null);
    lastPushAt = now;
    return settleSave(c, knownRevision, payload, 3);
  }

  function syncNow() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(pushLocalToRemote, PUSH_GAP_MS);
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
    pushNow: pushLocalToRemote,
    mergeConflict: mergeConflict
  };
})();
