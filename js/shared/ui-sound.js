/* Shared interface sound bus.
 *
 * Plays the sampled UI sounds used across the lessons, the map, and the
 * 3D gallery. Distinct from AudioBus in js/gallery/app.js, which synthesizes
 * tones with oscillators; this one plays real files.
 *
 * Browser autoplay policy: nothing can play until the user has interacted with
 * the page, so playback is armed on the first pointerdown/keydown and every
 * play() before that is dropped silently. Playback never throws and never
 * blocks an interaction.
 *
 * Mute/opt-out is stored under baUiSound and shared across every page.
 */
(function () {
  var KEY = "baUiSound";
  var SOUNDS = {
    // Short confirm/menu click — lessons UI and map.
    click: "assets/site/sfx/ui-click.mp3",
    // Notification blip — 3D gallery arena.
    notify: "assets/site/sfx/ui-notify.mp3"
  };

  var pool = {};
  var armed = false;
  var enabled = true;
  // Per-sound debounce. Tracking only the most recent sound would let
  // click -> notify -> click slip a second click through inside the window,
  // which is exactly what happens when a page plays both.
  var lastAt = {};

  try {
    if (window.localStorage && window.localStorage.getItem(KEY) === "off") enabled = false;
  } catch (e) { /* storage unavailable — stay enabled for this page only */ }

  function make(name) {
    var a = new Audio(SOUNDS[name]);
    a.preload = "auto";
    a.volume = name === "notify" ? 0.5 : 0.4;
    return a;
  }

  function prime() {
    if (armed || typeof Audio === "undefined") return;
    armed = true;
    Object.keys(SOUNDS).forEach(function (name) {
      var a = make(name);
      pool[name] = [a];
      // Warm the decoder without making a sound.
      var p = a.play();
      if (p && p.catch) {
        p.then(function () { a.pause(); a.currentTime = 0; }).catch(function () {});
      } else {
        try { a.pause(); a.currentTime = 0; } catch (e) {}
      }
    });
  }

  function voice(name) {
    var list = pool[name] || (pool[name] = [make(name)]);
    for (var i = 0; i < list.length; i++) {
      if (list[i].paused || list[i].ended) return list[i];
    }
    // All busy (fast repeated clicks) — add one more voice, capped.
    if (list.length < 4) {
      var extra = make(name);
      list.push(extra);
      return extra;
    }
    var oldest = list[0];
    list.push(list.shift());
    return oldest;
  }

  function play(name) {
    if (!enabled || !armed || !SOUNDS[name]) return;
    var now = Date.now();
    // Debounce each sound independently so rapid repeat gestures do not stack.
    if (now - (lastAt[name] || 0) < 45) return;
    lastAt[name] = now;
    try {
      var a = voice(name);
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* never let a sound break an interaction */ }
  }

  function arm() {
    prime();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", arm, { once: true, capture: true });
    document.addEventListener("keydown", arm, { once: true, capture: true });
  }

  window.UiSound = {
    play: play,
    prime: prime,
    get enabled() { return enabled; },
    set enabled(v) {
      enabled = !!v;
      try {
        if (window.localStorage) window.localStorage.setItem(KEY, enabled ? "on" : "off");
      } catch (e) {}
    }
  };
})();
