/**
 * quiz-gate.js
 * Server-verified checkpoint answers. The answer key never ships in the client:
 * every pick is graded by the verify_quiz_answer RPC (see tools/supabase-quiz-integrity.sql).
 * Under the localhost QA mock session (localStorage.baQaMockSession, see auth.js)
 * there is no Supabase client, so answers pass in practice mode.
 */
(function () {
  'use strict';

  function isLocalDevHost() {
    try {
      const h = location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    } catch (e) {
      return false;
    }
  }

  function hasQaMockSession() {
    if (!isLocalDevHost()) return false;
    try { return !!localStorage.getItem('baQaMockSession'); } catch (e) { return false; }
  }

  function authClient() {
    return window.ScrollAuth && typeof window.ScrollAuth.getClient === 'function' && window.ScrollAuth.getClient();
  }

  function authReady() {
    const auth = window.ScrollAuth;
    return auth && typeof auth.ready === 'function' ? auth.ready() : Promise.resolve();
  }

  function signedIn() {
    return !!(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
  }

  function errorCause(error) {
    if (!error) return 'error';
    const message = error.message ? String(error.message) : (typeof error === 'string' ? error : '');
    const code = error.code ? String(error.code) : '';
    if (message.indexOf('PGRST202') !== -1 || message.indexOf('Could not find the function') !== -1) {
      return 'missing_rpc';
    }
    if (message.indexOf('JWT') !== -1 || message.indexOf('unauthorized') !== -1 ||
        message.indexOf('not_authenticated') !== -1 || code === '401' || code === 'PGRST301') {
      return 'not_authenticated';
    }
    if (message.indexOf('AbortError') !== -1 || message.indexOf('TimeoutError') !== -1 ||
        message.indexOf('aborted') !== -1 || error.name === 'AbortError' || error.name === 'TimeoutError') {
      return 'timeout';
    }
    return 'error';
  }

  /**
   * verify(sitting, qIdx, chosen) -> Promise
   * Resolves { ok: true, correct: bool, correctIdx: number|null, note: string }
   * or { ok: false, error: cause } — callers must fail closed on !ok.
   */
  function verify(sitting, qIdx, chosen) {
    return authReady().then(function () { return verifyNow(sitting, qIdx, chosen); });
  }

  function verifyNow(sitting, qIdx, chosen) {
    const client = authClient();
    if (!client) {
      if (hasQaMockSession()) {
        return { ok: true, correct: true, correctIdx: Number(chosen), note: '' };
      }
      return { ok: false, error: 'not_authenticated' };
    }
    if (!signedIn()) return { ok: false, error: 'not_authenticated' };
    return client.rpc('verify_quiz_answer', {
      p_sitting: Number(sitting),
      p_q_idx: Number(qIdx),
      p_chosen: Number(chosen)
    }).then(function (res) {
      if (res && res.error) return { ok: false, error: errorCause(res.error) };
      const data = res && res.data;
      if (!data || typeof data.correct !== 'boolean') return { ok: false, error: 'bad_response' };
      return {
        ok: true,
        correct: data.correct,
        correctIdx: typeof data.correct_idx === 'number' ? data.correct_idx : null,
        note: String(data.note || '')
      };
    }).catch(function (err) {
      return { ok: false, error: errorCause(err) };
    });
  }

  window.QuizGate = { verify: verify };
})();
