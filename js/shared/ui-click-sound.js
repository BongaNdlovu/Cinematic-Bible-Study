/* Delegated UI click sound for the lesson and map interfaces.
 *
 * A single capture-phase listener on the document rather than per-element
 * handlers: the lessons render buttons, tabs, and cards dynamically, so
 * delegation keeps every present and future control covered.
 *
 * Deliberately exempt, so the sound never competes with content:
 *   - the lesson audio player (play/pause/seek/mute)
 *   - quiz answers (a sound on every option would be noise, not feedback)
 *   - anything marked data-silent
 */
(function () {
  if (!window.UiSound) return;

  var HIT = [
    "a[href]",
    "button",
    "[role='button']",
    "[role='tab']",
    "summary",
    ".lesson-toc-list a",
    ".leaflet-marker-icon",
    ".leaflet-control",
    "[data-instrument]",
    "[data-path]"
  ].join(",");

  var SKIP = [
    "#lesson-audio-player",
    "#lesson-audio",
    ".lesson-audio-player",
    "[data-lap-player]",
    ".quiz-option",
    "[data-silent]"
  ].join(",");

  document.addEventListener(
    "click",
    function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest(SKIP)) return;
      var hit = t.closest(HIT);
      if (!hit) return;
      if (hit.disabled || hit.getAttribute("aria-disabled") === "true") return;
      window.UiSound.play("click");
    },
    true
  );
})();
