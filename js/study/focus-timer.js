    const RING_CIRCUMFERENCE = 427.26;

    const WEATHER_RENDER_SCALE = 0.5;

    const weatherMeta = {
      quiet: { name: "Still • Quiet Dusk", icon: "◌", level: "Quiet" },
      building: { name: "Building • Rising Wind", icon: "☁", level: "Building" },
      storm: { name: "Storm • Rain & Thunder", icon: "⛈", level: "Storm" },
      sunshine: { name: "Sunshine • Warm Light", icon: "☀", level: "Sunshine" },
      off: { name: "Off", icon: "⏸", level: "Off" }
    };

    function lerp(a, b, t) {
      return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    function focusPhase(progress) {
      if (weatherPreset !== 'auto') {
        return weatherPreset === 'storm' ? 0.58
          : weatherPreset === 'sunshine' ? 0.96
          : weatherPreset === 'building' ? 0.34
          : weatherPreset === 'quiet' ? 0.08
          : 0.0;
      }
      if (progress < 0.12) return progress * 0.7;
      if (progress < 0.32) return lerp(0.08, 0.36, (progress - 0.12) / 0.2);
      if (progress < 0.62) return lerp(0.36, 0.78, (progress - 0.32) / 0.3);
      return lerp(0.78, 1.0, (progress - 0.62) / 0.38);
    }

    const WEATHER_BANDS = [
      { below: 0.2, type: 'quiet', label: 'Still', step: 'quiet' },
      { below: 0.42, type: 'building', label: 'Building', step: 'quiet' },
      { below: 0.72, type: 'storm', label: 'Storm', step: 'storm' },
      { below: 0.78, type: 'storm', label: 'Breaking', step: 'storm' },
      { below: Infinity, type: 'sunshine', label: 'Sun', step: 'sun' }
    ];

    function weatherBand(v) {
      for (const band of WEATHER_BANDS) {
        if (v < band.below) return band;
      }
      return WEATHER_BANDS[WEATHER_BANDS.length - 1];
    }

    function deriveWeatherType(v) {
      return weatherBand(v).type;
    }

    function lightTheme() {
      return document.body.classList.contains('paper-mode') || document.body.classList.contains('white-mode');
    }

    function weatherState() {
      return { type: currentWeatherType, atmosphere: focusAtmosphere, light: lightTheme() };
    }

    function linkWeather() {
      if (weatherScene || weatherWorker) return true;
      const canvas = document.getElementById('weather-canvas');
      if (!canvas) return false;
      if (typeof canvas.transferControlToOffscreen === 'function' && typeof Worker === 'function') {
        let worker = null;
        try {
          worker = new Worker(studyAssetPath('weather') || 'js/study/weather-scene.js');
          const offscreen = canvas.transferControlToOffscreen();
          worker.postMessage({ canvas: offscreen }, [offscreen]);
          weatherWorker = worker;
          return true;
        } catch (e) {
          if (worker) worker.terminate();
        }
      }
      if (!window.WeatherScene) {
        if (!studyModuleFailed('weather')) {
          loadStudyModule('weather').then(() => {
            if (!weatherRunning || !window.WeatherScene) return;
            resizeWeatherCanvas();
            tellWeather({ state: weatherState(), run: true });
          }, () => {});
        }
        return false;
      }
      weatherScene = window.WeatherScene.create(canvas);
      return true;
    }

    function tellWeather(msg) {
      if (!linkWeather()) return;
      if (weatherWorker) weatherWorker.postMessage(msg, []);
      else window.WeatherScene.apply(weatherScene, msg);
    }

    function markWeather() {
      if (currentWeatherType !== 'off' && document.body.dataset.weather !== currentWeatherType) {
        document.body.dataset.weather = currentWeatherType;
      }
    }

    function resizeWeatherCanvas() {
      tellWeather({
        size: [
          Math.max(320, Math.round(window.innerWidth * WEATHER_RENDER_SCALE)),
          Math.max(240, Math.round(window.innerHeight * WEATHER_RENDER_SCALE)),
          window.innerWidth,
          window.innerHeight
        ]
      });
    }

    function startWeatherAnimation() {
      if (!weatherRunning && currentWeatherType !== 'off') {
        resizeWeatherCanvas();
        const canvas = document.getElementById('weather-canvas');
        if (canvas) canvas.classList.remove('opacity-0');
        weatherRunning = true;
        markWeather();
        tellWeather({ state: weatherState(), run: true });
      }
    }

    function stopWeatherAnimation() {
      if (weatherRunning) tellWeather({ run: false });
      weatherRunning = false;
      const canvas = document.getElementById('weather-canvas');
      if (canvas) canvas.classList.add('opacity-0');
    }

    function updateAutoWeather() {
      const progress = (timerDuration - timeRemaining) / timerDuration;
      focusAtmosphere = focusPhase(progress);
      currentWeatherType = weatherPreset === 'off' ? 'off' : (weatherPreset === 'auto' ? deriveWeatherType(focusAtmosphere) : weatherPreset);
      if (weatherRunning) {
        markWeather();
        tellWeather({ state: weatherState() });
      }
      updateWeatherHUD();
    }

    function updateWeatherHUD() {
      const meta = weatherMeta[currentWeatherType] || weatherMeta.quiet;
      const statusEl = document.getElementById('pomo-weather-status');
      const headerIcon = document.getElementById('pomo-header-icon');
      const phaseEl = document.getElementById('pomo-clock-phase');
      const levelEl = document.getElementById('focus-atmosphere-level');
      const fillEl = document.getElementById('focus-atmosphere-fill');

      const band = weatherBand(focusAtmosphere);
      const phaseLabel = band.label;
      if (statusEl) statusEl.innerText = weatherPreset === 'auto' ? `${phaseLabel} • ${meta.name.split(' • ')[1] || meta.name}` : meta.name;
      if (headerIcon) headerIcon.innerText = meta.icon;
      if (phaseEl) phaseEl.innerText = weatherPreset === 'auto' ? `Auto: ${phaseLabel}` : meta.level;
      if (levelEl) levelEl.innerText = phaseLabel;
      if (fillEl) fillEl.style.width = `${Math.round(focusAtmosphere * 100)}%`;
      ['quiet','storm','sun'].forEach(k => {
        const el = document.getElementById(`focus-phase-${k}`);
        if (!el) return;
        el.classList.remove('bg-amber-500/20','text-amber-900','dark:text-amber-200','ring-1','ring-amber-400');
      });
      const active = document.getElementById(`focus-phase-${band.step}`);
      if (active) active.classList.add('bg-amber-500/20','text-amber-900','dark:text-amber-200','ring-1','ring-amber-400');

    }

    function setWeatherPreset(preset, silent) {
      const prefersReduced =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        (window.BAJourney && typeof window.BAJourney.prefersReducedMotion === 'function' && window.BAJourney.prefersReducedMotion());
      if (prefersReduced && preset !== 'off') {
        preset = 'off';
      }
      if (document.hidden && preset !== 'off') {
        stopWeatherAnimation();
      }
      weatherPreset = preset;
      ['auto', 'quiet', 'building', 'storm', 'sunshine', 'off'].forEach(id => {
        const btn = document.getElementById(`weather-btn-${id}`);
        if (!btn) return;
        const active = id === preset;
        btn.className = active
          ? "weather-pill py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold transition-all"
          : "weather-pill py-1 rounded bg-paper-200/60 dark:bg-paper-800 text-ink-700 dark:text-paper-300 hover:bg-amber-500/10 transition-all";
      });
      updateAutoWeather();
      if (preset === 'off') stopWeatherAnimation();
      else startWeatherAnimation();
      if (!silent) {
        showToast(`Focus atmosphere: ${weatherMeta[currentWeatherType]?.name || preset}`);
        if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'weather', preset: preset });
      }
    }

    function updateTimerDisplay() {
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const clock = document.getElementById('pomo-clock');
      const headerTime = document.getElementById('pomo-header-time');
      const line = document.getElementById('pomo-progress-line');
      const ring = document.getElementById('timer-ring');

      if (clock) clock.innerText = str;
      if (headerTime) headerTime.innerText = str;

      const pct = ((timerDuration - timeRemaining) / timerDuration) * 100;
      if (line) line.style.width = `${pct}%`;
      if (ring) {
        const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
        ring.style.strokeDashoffset = offset;
      }

      if (isTimerRunning && weatherPreset === 'auto') {
        updateAutoWeather();
      }
    }

    function startPomodoro() {
      if (isTimerRunning) return;
      isTimerRunning = true;
      const ping = document.getElementById('pomo-ping');
      const dot = document.getElementById('pomo-dot');
      const sub = document.getElementById('pomo-status-sub');
      if (ping) ping.classList.remove('hidden');
      if (dot) dot.classList.replace('bg-amber-600', 'bg-emerald-500');
      if (sub) sub.innerText = "Focus Session Active • Contemplating Divine Sovereignty...";

      startWeatherAnimation();

      if (timeRemaining <= 0) timeRemaining = timerDuration;
      timerEndsAt = Date.now() + timeRemaining * 1000;
      timerInterval = setInterval(tickPomodoro, 1000);
      showToast("Exilic Study Focus Timer Started");
    }

    function tickPomodoro() {
      if (!isTimerRunning) return;
      timeRemaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      updateTimerDisplay();
      if (timeRemaining === 0) completePomodoroSession();
    }

    function pausePomodoro() {
      if (isTimerRunning) timeRemaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      isTimerRunning = false;
      clearInterval(timerInterval);
      const ping = document.getElementById('pomo-ping');
      const dot = document.getElementById('pomo-dot');
      const sub = document.getElementById('pomo-status-sub');
      if (ping) ping.classList.add('hidden');
      if (dot) dot.classList.replace('bg-emerald-500', 'bg-amber-600');
      if (sub) sub.innerText = "Focus Session Paused";

      showToast("Focus Timer Paused");
    }

    function resetPomodoro() {
      pausePomodoro();
      timeRemaining = timerDuration;
      updateTimerDisplay();
      updateAutoWeather();
      const sub = document.getElementById('pomo-status-sub');
      if (sub) sub.innerText = "Timer reset to designated reading duration.";
      showToast("Focus Timer Reset");
    }

    function setPomodoroDuration(minutes) {
      timerDuration = minutes * 60;
      timeRemaining = timerDuration;
      if (isTimerRunning) timerEndsAt = Date.now() + timerDuration * 1000;
      updateTimerDisplay();
      updateAutoWeather();
    }

    function completePomodoroSession() {
      pausePomodoro();
      const sub = document.getElementById('pomo-status-sub');
      if (sub) sub.innerText = "✓ Study Session Completed! The study path is complete.";

      // No sound — the site stays silent when a timed sitting ends.

      showToast("Study Session Complete! Review the quiz checkpoint.");
    }

    function togglePomodoroDrawer() {
      const dock = document.getElementById('pomo-dock');
      if (!dock) return;
      const isClosed = dock.classList.contains('pointer-events-none');
      if (isClosed) {
        dock.classList.remove('translate-y-[-120%]', 'opacity-0', 'pointer-events-none');
        startWeatherAnimation();
      } else {
        dock.classList.add('translate-y-[-120%]', 'opacity-0', 'pointer-events-none');
        if (!isTimerRunning) stopWeatherAnimation();
      }
    }
