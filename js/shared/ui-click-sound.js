/* One capture-phase listener plays the UI click for every control, including
   ones rendered later.
   Exempt: the lesson audio player, quiz answers and anything marked
   data-silent. */
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
