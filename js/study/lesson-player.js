/* Custom lesson audio player — replaces the native <audio> bar with a glass
   panel: play/pause, 15-second skips, a remembered playback speed, tabular
   time readouts, a seek track, and a mute toggle. The native element
   stays in the DOM (hidden) and keeps driving playback, the read-along
   highlighter, and every existing listener. */
(function () {
  'use strict';

  var player = document.getElementById('lesson-audio-player');
  var host = document.querySelector('[data-lap-player]');
  if (!player || !host) return;

  var playBtn = host.querySelector('[data-lap-play]');
  var seek = host.querySelector('[data-lap-seek]');
  var cur = host.querySelector('[data-lap-cur]');
  var dur = host.querySelector('[data-lap-dur]');
  var muteBtn = host.querySelector('[data-lap-mute]');
  var glyphPlay = host.querySelector('[data-lap-glyph-play]');
  var glyphPause = host.querySelector('[data-lap-glyph-pause]');
  var rateBtn = host.querySelector('[data-lap-rate]');
  var skipBtns = host.querySelectorAll('[data-lap-skip]');
  var RATE_KEY = 'daniel_audio_rate_v1';
  var RATES = [1, 1.25, 1.5, 2, 0.75];
  var rate = 1;
  var scrubbing = false;

  try {
    var saved = Number(localStorage.getItem(RATE_KEY));
    if (RATES.indexOf(saved) >= 0) rate = saved;
  } catch (e) {}

  function rateLabel(r) {
    return String(r).replace(/^0\./, '.') + '×';
  }

  function applyRate() {
    player.defaultPlaybackRate = rate;
    player.playbackRate = rate;
    if (!rateBtn) return;
    rateBtn.textContent = rateLabel(rate);
    rateBtn.setAttribute('aria-label', 'Playback speed, ' + (rate === 1 ? 'normal' : rate + ' times'));
    rateBtn.classList.toggle('is-set', rate !== 1);
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var s = Math.floor(t % 60);
    var m = Math.floor(t / 60) % 60;
    var h = Math.floor(t / 3600);
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
  }

  function setFill() {
    var pct = isFinite(player.duration) && player.duration > 0
      ? (player.currentTime / player.duration) * 100
      : 0;
    seek.style.setProperty('--lap-fill', pct.toFixed(2) + '%');
  }

  function setPlayGlyph(isPlaying) {
    glyphPlay.style.display = isPlaying ? 'none' : '';
    glyphPause.style.display = isPlaying ? '' : 'none';
    playBtn.classList.toggle('is-playing', isPlaying);
    host.classList.toggle('is-playing', isPlaying);
  }

  playBtn.addEventListener('click', function () {
    if (player.paused) {
      var p = player.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      player.pause();
    }
  });

  if (rateBtn) {
    rateBtn.addEventListener('click', function () {
      rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
      try { localStorage.setItem(RATE_KEY, String(rate)); } catch (e) {}
      applyRate();
    });
  }

  Array.prototype.forEach.call(skipBtns, function (btn) {
    btn.addEventListener('click', function () {
      if (!isFinite(player.duration) || player.duration <= 0) return;
      var by = Number(btn.getAttribute('data-lap-skip')) || 0;
      player.currentTime = Math.max(0, Math.min(player.duration - 0.25, player.currentTime + by));
      cur.textContent = fmt(player.currentTime);
      setFill();
    });
  });

  muteBtn.addEventListener('click', function () {
    player.muted = !player.muted;
    muteBtn.classList.toggle('is-muted', player.muted);
    muteBtn.setAttribute('aria-pressed', String(player.muted));
  });

  seek.addEventListener('input', function () {
    if (!isFinite(player.duration) || player.duration <= 0) return;
    scrubbing = true;
    player.currentTime = (Number(seek.value) / 1000) * player.duration;
    cur.textContent = fmt(player.currentTime);
    setFill();
  });
  seek.addEventListener('change', function () { scrubbing = false; });

  player.addEventListener('loadedmetadata', function () {
    dur.textContent = fmt(player.duration);
    if (player.playbackRate !== rate) player.playbackRate = rate;
    host.classList.add('is-ready');
  });
  player.addEventListener('timeupdate', function () {
    if (!scrubbing && isFinite(player.duration) && player.duration > 0) {
      seek.value = String(Math.round((player.currentTime / player.duration) * 1000));
    }
    cur.textContent = fmt(player.currentTime);
    setFill();
  });
  player.addEventListener('play', function () { setPlayGlyph(true); });
  player.addEventListener('pause', function () { setPlayGlyph(false); });
  player.addEventListener('ended', function () { setPlayGlyph(false); });
  player.addEventListener('emptied', function () {
    scrubbing = false;
    seek.value = '0';
    cur.textContent = '0:00';
    dur.textContent = '0:00';
    setFill();
    setPlayGlyph(false);
    host.classList.remove('is-ready');
  });

  applyRate();

  setPlayGlyph(!player.paused);
})();
