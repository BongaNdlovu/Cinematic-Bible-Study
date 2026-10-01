/**
 * study-sync.js
 * Supabase signed-in sync for per-sheet study notes (frozen keys baNote-*) and
 * bookmarks (frozen key baStudyBookmarks). Pull-and-merge on sign-in, debounced
 * pushes with an outbox — the same contract as progress-sync.js, minus the
 * revision conflicts (per-sheet newest-timestamp wins, bookmarks union).
 */
(function () {
  'use strict';

  const TABLE = 'exhibit_study_data';
  const NOTE_PREFIX = 'baNote-';
  const NOTE_TIMES_KEY = 'baNoteTimes';
  const BOOKMARKS_KEY = 'baStudyBookmarks';
  const ACCOUNT_KEY = 'baStudySyncAccountId';
  const OUTBOX_KEY = 'baStudySyncOutbox';
  const LAST_PUSH_KEY = 'baStudySyncLastPushAt';
  const PUSH_GAP_MS = 6000;
  const RETRY_WAITS = [7000, 15000, 30000];
  const MAX_RETRIES = 5;
  const MAX_NOTE_CHARS = 50000;
  const MAX_PAYLOAD_BYTES = 400000;
  const MAX_SHEET_ID = 999;
  const SAVE_MISS = 'Your notes could not be saved to the cloud. This device keeps a local copy.';
  const PULL_MISS = 'Your saved notes could not be loaded from the cloud. This device still has its local copy.';

  let debounceTimer = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let isSyncing = false;
  let lastPushAt = 0;

  function authClient() {
    return window.ScrollAuth && typeof window.ScrollAuth.getClient === 'function' && window.ScrollAuth.getClient();
  }

  function currentUser() {
    return window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser();
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null || raw === '') return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function sanitizeSheetId(value) {
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && num <= MAX_SHEET_ID ? num : null;
  }

  function readNoteTimes() {
    const times = readJson(NOTE_TIMES_KEY, {});
    return times && typeof times === 'object' && !Array.isArray(times) ? times : {};
  }

  function noteSheets() {
    const ids = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.indexOf(NOTE_PREFIX) === 0) {
          const id = sanitizeSheetId(key.slice(NOTE_PREFIX.length));
          if (id !== null) ids.push(id);
        }
      }
    } catch (e) {}
    return ids;
  }

  function localNotes() {
    const times = readNoteTimes();
    const notes = {};
    noteSheets().forEach(function (id) {
      let body = '';
      try { body = localStorage.getItem(NOTE_PREFIX + id) || ''; } catch (e) {}
      notes[String(id)] = { body: body, updatedAt: Number(times[String(id)]) || 0 };
    });
    return notes;
  }

  function localBookmarks() {
    const list = readJson(BOOKMARKS_KEY, []);
    if (!Array.isArray(list)) return [];
    return list.map(sanitizeSheetId).filter(function (n) { return n !== null; });
  }

  function notifyStudySynced() {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ba-study-synced'));
      }
    } catch (e) {}
  }

  function reportSaveMiss(cause) {
    if (window.SiteErrors && typeof window.SiteErrors.show === 'function') {
      window.SiteErrors.show(SAVE_MISS, 'save');
    }
    if (window.SiteOps && typeof window.SiteOps.report === 'function') {
      window.SiteOps.report('study_sync_save_failed', cause || 'error', { cause: cause || 'error' });
    }
  }

  function reportPullMiss(cause) {
    if (window.SiteErrors && typeof window.SiteErrors.show === 'function') {
      window.SiteErrors.show(PULL_MISS, 'save');
    }
    if (window.SiteOps && typeof window.SiteOps.report === 'function') {
      window.SiteOps.report('study_sync_pull_failed', cause || 'error', { cause: cause || 'error' });
    }
  }

  function errorCause(error) {
    if (!error) return 'error';
    const message = error.message ? String(error.message) : (typeof error === 'string' ? error : '');
    const code = error.code ? String(error.code) : '';
    if (message.indexOf('JWT') !== -1 || message.indexOf('unauthorized') !== -1 ||
        message.indexOf('not_authenticated') !== -1 || code === '401' || code === 'PGRST301') {
      return 'not_authenticated';
    }
    if (message.indexOf('payload_too_large') !== -1) return 'payload_too_large';
    if (message.indexOf('rate_limit') !== -1) return 'rate_limit';
    if (message.indexOf('AbortError') !== -1 || message.indexOf('TimeoutError') !== -1 ||
        message.indexOf('aborted') !== -1 || error.name === 'AbortError' || error.name === 'TimeoutError') {
      return 'timeout';
    }
    return 'error';
  }

  function recordNote(sheetIndex, body) {
    const id = sanitizeSheetId(sheetIndex);
    if (id === null) return;
    const text = String(body == null ? '' : body).slice(0, MAX_NOTE_CHARS);
    try { localStorage.setItem(NOTE_PREFIX + id, text); } catch (e) { return; }
    const times = readNoteTimes();
    times[String(id)] = Date.now();
    writeJson(NOTE_TIMES_KEY, times);
    syncNow();
  }

  function recordBookmarks(list) {
    if (!Array.isArray(list)) return;
    writeJson(BOOKMARKS_KEY, list.map(sanitizeSheetId).filter(function (n) { return n !== null; }));
    syncNow();
  }

  /** Stamps legacy timestampless notes so the first merge keeps this device's text. */
  function collectPayload() {
    const notes = localNotes();
    const times = readNoteTimes();
    let migrated = false;
    Object.keys(notes).forEach(function (id) {
      if (!notes[id].updatedAt) {
        const ts = Date.now();
        notes[id].updatedAt = ts;
        times[id] = ts;
        migrated = true;
      }
    });
    if (migrated) writeJson(NOTE_TIMES_KEY, times);
    return { notes: notes, bookmarks: localBookmarks() };
  }

  /**
   * Pure merge used by pullAndMerge and the verify suite.
   * Notes: newest updatedAt wins per sheet (ties keep local). Bookmarks: union.
   * Returns { notes, bookmarks, localHadNew, remoteHadNew }.
   */
  function mergePayload(local, remote) {
    const localNotesMap = (local && local.notes) || {};
    const remoteNotesMap = (remote && remote.notes) || {};
    const mergedNotes = {};
    let localHadNew = false;
    let remoteHadNew = false;

    Object.keys(remoteNotesMap).forEach(function (id) {
      const r = remoteNotesMap[id] || {};
      const remoteTime = Number(r.updatedAt) || 0;
      const localEntry = localNotesMap[id];
      const localTime = localEntry ? (Number(localEntry.updatedAt) || 0) : -1;
      if (!localEntry || remoteTime > localTime) {
        mergedNotes[id] = { body: String(r.body == null ? '' : r.body), updatedAt: remoteTime };
        remoteHadNew = true;
      } else {
        mergedNotes[id] = { body: String(localEntry.body == null ? '' : localEntry.body), updatedAt: localTime };
        if (localTime > remoteTime) localHadNew = true;
      }
    });
    Object.keys(localNotesMap).forEach(function (id) {
      if (mergedNotes[id]) return;
      mergedNotes[id] = {
        body: String(localNotesMap[id].body == null ? '' : localNotesMap[id].body),
        updatedAt: Number(localNotesMap[id].updatedAt) || 0
      };
      localHadNew = true;
    });

    const localMarks = (local && Array.isArray(local.bookmarks))
      ? local.bookmarks.map(sanitizeSheetId).filter(function (n) { return n !== null; })
      : localBookmarks();
    const mergedBookmarks = Array.from(new Set([]
      .concat((remote && Array.isArray(remote.bookmarks)) ? remote.bookmarks : [], localMarks)
    )).map(sanitizeSheetId).filter(function (n) { return n !== null; }).sort(function (a, b) { return a - b; });
    if (mergedBookmarks.some(function (n) { return localMarks.indexOf(n) === -1; })) {
      remoteHadNew = true;
    }

    return {
      notes: mergedNotes,
      bookmarks: mergedBookmarks,
      localHadNew: localHadNew,
      remoteHadNew: remoteHadNew
    };
  }

  function applyMerged(merged) {
    if (!merged) return false;
    let wrote = false;
    const times = readNoteTimes();
    Object.keys(merged.notes).forEach(function (id) {
      const entry = merged.notes[id];
      try {
        const existing = localStorage.getItem(NOTE_PREFIX + id);
        if (existing !== entry.body) {
          localStorage.setItem(NOTE_PREFIX + id, entry.body);
          wrote = true;
        }
        if (entry.updatedAt && Number(times[id]) !== entry.updatedAt) {
          times[id] = entry.updatedAt;
          wrote = true;
        }
      } catch (e) {}
    });
    writeJson(NOTE_TIMES_KEY, times);
    const marksJson = JSON.stringify(merged.bookmarks || []);
    try {
      if (localStorage.getItem(BOOKMARKS_KEY) !== marksJson) {
        localStorage.setItem(BOOKMARKS_KEY, marksJson);
        wrote = true;
      }
    } catch (e) {}
    return wrote;
  }

  function clearLocalStudyData() {
    noteSheets().forEach(function (id) {
      try { localStorage.removeItem(NOTE_PREFIX + id); } catch (e) {}
    });
    try { localStorage.removeItem(BOOKMARKS_KEY); } catch (e) {}
    try { localStorage.removeItem(NOTE_TIMES_KEY); } catch (e) {}
  }

  function storeOutbox(payload) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(payload)); } catch (e) {}
  }

  function readOutbox() {
    const parsed = readJson(OUTBOX_KEY, null);
    if (!parsed || typeof parsed !== 'object' || !parsed.notes) return null;
    return parsed;
  }

  function clearOutbox() {
    try { localStorage.removeItem(OUTBOX_KEY); } catch (e) {}
    if (window.SiteErrors && typeof window.SiteErrors.current === 'function') {
      const cur = window.SiteErrors.current();
      if (cur === SAVE_MISS || cur === PULL_MISS) window.SiteErrors.clear();
    }
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
      retryAttempt += 1;
      pushLocalToRemote();
    }, wait);
  }

  function pushLocalToRemote() {
    const c = authClient();
    const u = currentUser();
    if (!c || !u) {
      if (!u) clearOutbox();
      return Promise.resolve(null);
    }
    if (Date.now() - lastPushAt < PUSH_GAP_MS) {
      const pending = collectPayload();
      storeOutbox(pending);
      scheduleRetry();
      return Promise.resolve(null);
    }
    const payload = readOutbox() || collectPayload();
    if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
      reportSaveMiss('payload_too_large');
      return Promise.resolve(null);
    }
    lastPushAt = Date.now();
    try { localStorage.setItem(LAST_PUSH_KEY, String(lastPushAt)); } catch (e) {}
    storeOutbox(payload);
    return c.from(TABLE).upsert({
      user_id: u.id,
      notes: payload.notes,
      bookmarks: payload.bookmarks,
      updated_at: new Date().toISOString()
    }).then(function (res) {
      if (res && res.error) {
        const cause = errorCause(res.error);
        if (cause === 'not_authenticated') {
          clearOutbox();
          return null;
        }
        storeOutbox(payload);
        scheduleRetry();
        reportSaveMiss(cause);
        return null;
      }
      clearOutbox();
      notifyStudySynced();
      return payload;
    }).catch(function (err) {
      const cause = errorCause(err);
      if (cause === 'not_authenticated') {
        clearOutbox();
        return null;
      }
      storeOutbox(payload);
      scheduleRetry();
      reportSaveMiss(cause);
      return null;
    });
  }

  function syncNow() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      pushLocalToRemote();
    }, PUSH_GAP_MS);
  }

  function pullAndMerge() {
    const c = authClient();
    const u = currentUser();
    if (!c || !u || isSyncing) return Promise.resolve(null);

    const uid = String(u.id);
    let prev = '';
    try { prev = localStorage.getItem(ACCOUNT_KEY) || ''; } catch (e) {}
    const switched = !!(prev && prev !== uid);
    if (switched) clearLocalStudyData();
    try { localStorage.setItem(ACCOUNT_KEY, uid); } catch (e) {}

    isSyncing = true;
    return c.from(TABLE)
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle()
      .then(function (res) {
        isSyncing = false;
        if (res && res.error) {
          const cause = errorCause(res.error);
          if (cause !== 'not_authenticated') reportPullMiss(cause);
          return null;
        }
        const merged = mergePayload(collectPayload(), res && res.data);
        const wroteLocal = applyMerged(merged);
        if (wroteLocal) notifyStudySynced();
        if (merged.localHadNew || readOutbox()) {
          pushLocalToRemote();
        } else {
          clearOutbox();
        }
        return merged;
      })
      .catch(function (err) {
        isSyncing = false;
        const cause = errorCause(err);
        if (cause !== 'not_authenticated') reportPullMiss(cause);
        return null;
      });
  }

  function init() {
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === 'function') {
      window.ScrollAuth.ready().then(function () {
        if (currentUser()) pullAndMerge();
      });
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === 'function') {
      window.ScrollAuth.onChange(function (u) {
        if (u) {
          pullAndMerge();
        } else {
          try { localStorage.removeItem(ACCOUNT_KEY); } catch (e) {}
          clearOutbox();
        }
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

  window.StudySync = {
    init: init,
    pullAndMerge: pullAndMerge,
    syncNow: syncNow,
    pushNow: pushLocalToRemote,
    retryNow: function () { return pushLocalToRemote(); },
    retryPending: function () { return !!retryTimer; },
    recordNote: recordNote,
    recordBookmarks: recordBookmarks,
    collectPayload: collectPayload,
    mergePayload: mergePayload
  };
})();
