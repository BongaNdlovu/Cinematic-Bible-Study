import { tellWeather, weatherRunning, weatherState } from '/js/pages/study/focus-timer.js';
import { currentSheetIndex, showToast } from '/js/pages/study/study-app.js';

    export let fontAuto = true;
    export let currentThemeIdx = 0;
    export let currentFontIdx = 1;

    export function setCurrentThemeIdx(value) { currentThemeIdx = value; }
    export function setCurrentFontIdx(value) { currentFontIdx = value; }
    export function setFontAuto(value) { fontAuto = value; }

    export const themes = ['charcoal', 'paper', 'white', 'night'];

    export const fontSizes = [
      { label: "85%", size: "0.95rem" },
      { label: "100%", size: "1.125rem" },
      { label: "115%", size: "1.28rem" },
      { label: "130%", size: "1.45rem" },
      { label: "150%", size: "1.65rem" }
    ];

    export function autoFontIndexFor(width) {
      if (width >= 1900) return 3; // 130% on large monitors
      if (width >= 1366) return 2; // 115% on laptops and up
      return 1;                    // 100% on tablets and phones
    }

    export function applyTheme(idx, silent) {
      currentThemeIdx = ((idx % themes.length) + themes.length) % themes.length;
      const theme = themes[currentThemeIdx];
      const html = document.documentElement;
      const themeIcon = document.getElementById('theme-icon');
      const isDark = theme === 'night' || theme === 'charcoal';

      html.classList.toggle('dark', isDark);
      html.dataset.theme = theme;
      document.body.dataset.theme = theme;

      document.body.classList.remove('charcoal-mode', 'paper-mode', 'white-mode', 'night-mode', 'bg-paper-950', 'bg-paper-50', 'bg-white', 'text-paper-100', 'text-ink-900', 'selection:bg-amber-900', 'selection:bg-amber-200');
      document.body.classList.add(theme + '-mode');
      document.body.classList.toggle('bg-paper-950', isDark);
      document.body.classList.toggle('text-paper-100', isDark);
      document.body.classList.toggle('selection:bg-amber-900', isDark);
      document.body.classList.toggle('bg-paper-50', theme === 'paper');
      document.body.classList.toggle('bg-white', theme === 'white');
      document.body.classList.toggle('text-ink-900', !isDark);
      document.body.classList.toggle('selection:bg-amber-200', !isDark);
      if (weatherRunning) tellWeather({ state: weatherState() });

      if (themeIcon) {
        themeIcon.innerText = theme === 'charcoal' ? '◑ Chiaroscuro'
          : theme === 'night' ? '🌙 Night'
          : theme === 'white' ? '⚪ White'
          : '☀️ Paper';
      }
      document.body.classList.remove('flashlight-active', 'beam-ready');
      try {
        localStorage.setItem('daniel_theme_v1', String(currentThemeIdx));
        localStorage.setItem('daniel_theme_name_v1', theme);
      } catch (e) {}
      if (!silent && themeIcon) {
        showToast(`Theme: ${themeIcon.innerText}`);
        if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'theme', theme: theme });
      }
    }

    export function cycleTheme() {
      applyTheme(currentThemeIdx + 1);
    }

    export function applyFontSize() {
      if (fontAuto) {
        currentFontIdx = autoFontIndexFor(window.innerWidth);
      }
      const current = fontSizes[currentFontIdx];
      document.documentElement.style.setProperty('--reading-font-size', current.size);
      const indicator = document.getElementById('font-size-indicator');
      if (indicator) {
        // Keep the pill short on phones so the topbar never wraps.
        indicator.innerText = fontAuto && window.innerWidth >= 700 ? `Auto · ${current.label}` : current.label;
        indicator.title = fontAuto
          ? 'Text size follows your screen automatically. Use A- / A+ to set it yourself.'
          : 'Text size set manually. Delete the A- / A+ choice to return to automatic.';
      }
      if (!fontAuto) {
        try {
          localStorage.setItem('daniel_font_size_idx_v4', currentFontIdx);
        } catch (e) {}
      }
    }

    export function adjustFontSize(delta) {
      fontAuto = false;
      try {
        localStorage.setItem('daniel_font_manual_v1', '1');
      } catch (e) {}
      currentFontIdx = Math.max(0, Math.min(fontSizes.length - 1, currentFontIdx + delta));
      applyFontSize();
      showToast(`Text size: ${fontSizes[currentFontIdx].label}`);
    }
