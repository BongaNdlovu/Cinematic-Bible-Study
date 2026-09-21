/**
 * progress-sync.js
 * Supabase signed-in progress synchronization.
 * Merges journey, mastery, workbench verification, and cohort metadata with cloud state.
 */
(function () {
  'use strict';

  const TABLE = 'exhibit_progress';
  const ACCOUNT_KEY = 'baProgressAccountId';
  let debounceTimer = null;
  let isSyncing = false;

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

  function pushLocalToRemote() {
    const c = authClient();
    const u = currentUser();
    if (!c || !u || isSyncing) return Promise.resolve(null);

    let journey = {};
    try {
      journey = window.BAJourney && typeof window.BAJourney.load === 'function'
        ? window.BAJourney.load()
        : JSON.parse(localStorage.getItem('baJourney') || '{}');
    } catch (e) {}

    let mastery = [];
    try {
      mastery = JSON.parse(localStorage.getItem('daniel_historicist_mastery') || '[]');
    } catch (e) {}

    let workbench = {};
    try {
      workbench = JSON.parse(localStorage.getItem('daniel_workbench_v1') || '{}');
    } catch (e) {}

    let telemetry = {};
    try {
      telemetry = JSON.parse(localStorage.getItem('daniel_competency_telemetry_v1') || '{}');
    } catch (e) {}

    const certName = localStorage.getItem('daniel_certificate_name') || '';
    const cohort = (journey && journey.cohort) || '';

    const payload = {
      user_id: u.id,
      journey: journey,
      mastery: mastery,
      workbench: workbench,
      telemetry: telemetry,
      certificate_name: certName,
      cohort: cohort,
      updated_at: new Date().toISOString()
    };

    return c.from(TABLE).upsert(payload).then(function (res) {
      return res;
    }).catch(function () {
      return null;
    });
  }

  function syncNow() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(pushLocalToRemote, 1000);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ProgressSync = {
    init: init,
    pullAndMerge: pullAndMerge,
    syncNow: syncNow
  };
})();
