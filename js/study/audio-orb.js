/* Floating audio-reactive orb (lower right, visible throughout the lesson).
   A small HUD ball wired to the lesson audio via Web Audio: the core breathes
   with the bass, radial spokes trace the spectrum, and twin arcs orbit while
   sound plays. Includes its own play/pause + hide controls; the hide choice
   persists. The canvas only consumes frequency data — if the AudioContext can
   never start (no user gesture), the lesson audio stays untouched and the orb
   falls back to an idle standby animation. */
(function () {
  'use strict';

  var PREF_KEY = 'daniel_audio_orb_v1';
  var player = document.getElementById('lesson-audio-player');
  var audioBox = document.getElementById('lesson-audio');
  if (!player || !audioBox) return;

  var pref = 'on';
  try { pref = localStorage.getItem(PREF_KEY) || 'on'; } catch (e) {}

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---- Build the widget ---------------------------------------------- */
  var host = document.createElement('div');
  host.className = 'audio-orb';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Lesson audio visualizer');
  host.innerHTML =
    '<canvas class="audio-orb-canvas" aria-hidden="true"></canvas>' +
    '<span class="audio-orb-tag" data-orb-tag>STBY</span>' +
    '<div class="audio-orb-controls">' +
    '  <button type="button" class="audio-orb-btn" data-orb-play aria-label="Play or pause the lesson audio" title="Play / pause">' +
    '    <svg data-glyph-play viewBox="0 0 12 12"><path d="M2.5 1.2 10.4 6 2.5 10.8z"/></svg>' +
    '    <svg data-glyph-pause viewBox="0 0 12 12" style="display:none"><path d="M2.2 1.4h2.6v9.2H2.2zM7.2 1.4h2.6v9.2H7.2z"/></svg>' +
    '  </button>' +
    '  <button type="button" class="audio-orb-btn" data-orb-close aria-label="Switch off the audio visualizer" title="Switch off">' +
    '    <svg viewBox="0 0 12 12"><path d="M2.2 1 6 4.8 9.8 1 11 2.2 7.2 6 11 9.8 9.8 11 6 7.2 2.2 11 1 9.8 4.8 6 1 2.2z"/></svg>' +
    '  </button>' +
    '</div>';
  document.body.appendChild(host);

  var canvas = host.querySelector('.audio-orb-canvas');
  var tag = host.querySelector('[data-orb-tag]');
  var playBtn = host.querySelector('[data-orb-play]');
  var closeBtn = host.querySelector('[data-orb-close]');
  var glyphPlay = host.querySelector('[data-glyph-play]');
  var glyphPause = host.querySelector('[data-glyph-pause]');

  var LOGICAL = 76;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = LOGICAL * dpr;
  canvas.height = LOGICAL * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  /* Restore chip lives inside the lesson-audio panel; the stub is the
     dormant ring that stays in the orb's corner so it can be re-awakened
     from anywhere in the lesson with one click. */
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'lesson-audio-orb-restore';
  chip.setAttribute('hidden', '');
  chip.innerHTML = '&#9686; Visualizer is off &mdash; bring it back';
  audioBox.appendChild(chip);

  var stub = document.createElement('button');
  stub.type = 'button';
  stub.className = 'audio-orb-stub';
  stub.setAttribute('hidden', '');
  stub.setAttribute('aria-label', 'Show the audio visualizer');
  stub.setAttribute('title', 'Show visualizer');
  document.body.appendChild(stub);

  /* ---- Web Audio graph (created only once, only while running) -------- */
  var actx = null;
  var analyser = null;
  var freq = null;
  var sourceCreated = false;

  function ensureAudioGraph() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) {
      try { actx = new AC(); } catch (e) { actx = null; return; }
      actx.addEventListener('statechange', function () { if (actx.state === 'running') connectGraph(); });
    }
    if (actx.state === 'suspended') {
      var p = actx.resume();
      if (p && p.catch) p.catch(function () {});
    }
    if (actx.state === 'running') connectGraph();
  }

  function connectGraph() {
    if (sourceCreated || !actx || actx.state !== 'running') return;
    try {
      var source = actx.createMediaElementSource(player);
      analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
      sourceCreated = true;
    } catch (e) {
      sourceCreated = false; // audio keeps playing normally; orb stays idle
    }
  }

  /* ---- Render loop ----------------------------------------------------- */
  var SPOKES = 40;
  var spokeSm = Array.from({ length: SPOKES }, function () { return 0; });
  var playing = false;
  var raf = 0;
  var rot = 0;
  var lastTs = 0;
  var lastFrameAt = 0;
  var bassSm = 0;
  var levelSm = 0;
  var settleUntil = 0;

  function sampleSpectrum() {
    var level = 0;
    var bass = 0;
    if (analyser && freq) {
      analyser.getByteFrequencyData(freq);
      var sum = 0;
      var i;
      for (i = 0; i < freq.length; i++) sum += freq[i];
      level = sum / (freq.length * 255);
      var bsum = 0;
      var bins = 10;
      for (i = 1; i <= bins; i++) bsum += freq[i];
      bass = Math.pow(bsum / (bins * 255), 1.35);
    }
    return { level: level, bass: bass };
  }

  function frame(ts) {
    lastFrameAt = performance.now();
    raf = 0;
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0.016;
    lastTs = ts;
    var s = sampleSpectrum();

    // fast attack, slow release — feels like a live VU ball
    var kUp = 0.35;
    var kDown = 0.07;
    bassSm += (s.bass - bassSm) * (s.bass > bassSm ? kUp : kDown);
    levelSm += (s.level - levelSm) * (s.level > levelSm ? kUp : kDown);
    if (bassSm < 0.001) bassSm = 0;
    if (levelSm < 0.001) levelSm = 0;

    if (playing) {
      rot += dt * (reduceMotion ? 0.12 : 0.55);
      draw(ts, s);
      raf = requestAnimationFrame(frame);
    } else if (bassSm > 0.002 || levelSm > 0.002 || ts < settleUntil) {
      draw(ts, s); // settle toward the standby frame
      raf = requestAnimationFrame(frame);
    } else {
      draw(ts, s); // final standby frame, then stop the loop
      lastTs = 0;
    }
  }

  function draw(ts, s) {
    var t = ts / 1000;
    var cx = LOGICAL / 2;
    var cy = LOGICAL / 2;
    ctx.clearRect(0, 0, LOGICAL, LOGICAL);

    /* radial spectrum spokes */
    var rIn = 21.5;
    var maxLen = 10.5;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1;
    for (var i = 0; i < SPOKES; i++) {
      var v;
      if (sourceCreated && freq && (playing || bassSm > 0.002 || levelSm > 0.002)) {
        var bin = 2 + Math.floor(Math.pow(i / SPOKES, 1.6) * (freq.length * 0.62));
        v = freq[bin] / 255;
        v = v * 0.25 + v * v * 0.75;
      } else {
        v = reduceMotion ? 0.08 : 0.1 + 0.07 * Math.sin(t * 1.4 + i * 0.55);
      }
      spokeSm[i] += (v - spokeSm[i]) * (v > spokeSm[i] ? 0.5 : 0.12);
      var a = (i / SPOKES) * Math.PI * 2 + rot;
      var len = 1.2 + spokeSm[i] * maxLen;
      var x0 = cx + Math.cos(a) * rIn;
      var y0 = cy + Math.sin(a) * rIn;
      var x1 = cx + Math.cos(a) * (rIn + len);
      var y1 = cy + Math.sin(a) * (rIn + len);
      ctx.strokeStyle = 'rgba(251, 191, 36, ' + (0.16 + spokeSm[i] * 0.6).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    /* orbiting HUD arcs */
    var rArc = 27;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(212, 175, 55, ' + (0.3 + levelSm * 0.55).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, rArc, rot * 1.9, rot * 1.9 + 1.7);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(251, 191, 36, ' + (0.22 + levelSm * 0.5).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, rArc, -rot * 1.3 + 2.4, -rot * 1.3 + 3.3);
    ctx.stroke();

    /* faint full ring */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, rArc, 0, Math.PI * 2);
    ctx.stroke();

    /* satellite dot */
    var da = rot * 2.6;
    ctx.fillStyle = 'rgba(255, 236, 170, ' + (0.5 + levelSm * 0.5).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(da) * rArc, cy + Math.sin(da) * rArc, 1.5, 0, Math.PI * 2);
    ctx.fill();

    /* reactive core */
    var r0 = 12 + bassSm * 9.5;
    if (!playing && bassSm <= 0.002) r0 = 12 + (reduceMotion ? 0 : 0.9 * Math.sin(t * 1.7));
    var glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 25);
    glow.addColorStop(0, 'rgba(251, 191, 36, ' + (0.12 + levelSm * 0.3).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();

    var core = ctx.createRadialGradient(cx - r0 * 0.3, cy - r0 * 0.35, 1, cx, cy, r0);
    core.addColorStop(0, '#fff6db');
    core.addColorStop(0.45, '#f7c948');
    core.addColorStop(1, '#b45309');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 243, 208, 0.75)';
    ctx.stroke();
  }

  function wake() {
    if (!raf) {
      lastTs = 0;
      lastFrameAt = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  // Chromium suspends rAF entirely for hidden/occluded pages, which would
  // freeze the orb mid-stroke while the lesson keeps playing. A light
  // watchdog hand-runs the frame when the pending callback goes stale; the
  // moment the page is visible again, normal rAF pacing takes back over.
  setInterval(function () {
    if (!raf) return;
    if (performance.now() - lastFrameAt <= 400) return;
    var stale = raf;
    raf = 0;
    cancelAnimationFrame(stale);
    frame(performance.now());
  }, 500);

  /* ---- State + preference wiring -------------------------------------- */
  function setPlayingUI(isPlaying) {
    playing = isPlaying;
    glyphPlay.style.display = isPlaying ? 'none' : '';
    glyphPause.style.display = isPlaying ? '' : 'none';
    tag.textContent = isPlaying ? 'LIVE' : 'STBY';
    tag.classList.toggle('is-live', isPlaying);
    host.classList.toggle('is-playing', isPlaying);
  }

  function togglePlayback() {
    ensureAudioGraph();
    if (player.paused) {
      var p = player.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      player.pause();
    }
  }

  player.addEventListener('play', function () {
    ensureAudioGraph();
    setPlayingUI(true);
    wake();
  });
  player.addEventListener('pause', function () {
    setPlayingUI(false);
    settleUntil = performance.now() + 1400;
    wake();
  });
  player.addEventListener('emptied', function () {
    setPlayingUI(false);
    bassSm = 0;
    levelSm = 0;
    for (var i = 0; i < SPOKES; i++) spokeSm[i] = 0;
    wake();
  });

  playBtn.addEventListener('click', togglePlayback);
  canvas.addEventListener('click', togglePlayback);
  canvas.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlayback(); }
  });

  function refresh(animated) {
    var off = pref === 'off';
    var boxGone = audioBox.hidden;
    if (off) {
      if (animated && !host.hidden) {
        host.classList.add('is-hiding');
        setTimeout(function () {
          host.classList.remove('is-hiding');
          host.hidden = true;
        }, 300);
      } else {
        host.hidden = true;
      }
    } else {
      host.hidden = boxGone;
      if (!boxGone) wake();
    }
    stub.hidden = !off || boxGone; // dormant ring only while the orb is away
    chip.hidden = !off || boxGone;
  }

  function activate() {
    pref = 'on';
    try { localStorage.setItem(PREF_KEY, 'on'); } catch (e) {}
    refresh(false);
  }

  closeBtn.addEventListener('click', function () {
    pref = 'off';
    try { localStorage.setItem(PREF_KEY, 'off'); } catch (e) {}
    refresh(true);
  });
  chip.addEventListener('click', activate);
  stub.addEventListener('click', activate);

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { refresh(false); }).observe(audioBox, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  canvas.tabIndex = 0;
  setPlayingUI(false);
  refresh(false);
})();
