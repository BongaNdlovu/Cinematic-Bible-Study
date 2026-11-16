    function clearGuideSpotlight() {
      document.querySelectorAll('.is-guide-spot').forEach((el) => el.classList.remove('is-guide-spot'));
    }

    function syncSittingOverlay() {
      const guide = document.getElementById('sitting-guide');
      const open = guide && !guide.hidden;
      document.body.classList.toggle('is-sitting-overlay', !!open);
    }

    function hideSittingGuide() {
      const box = document.getElementById('sitting-guide');
      if (!box) return;
      box.hidden = true;
      box.classList.remove('is-end');
      box.style.alignItems = '';
      sittingGuideMode = null;
      clearGuideSpotlight();
      syncSittingOverlay();
    }

    function showIntroGuide(index) {
      const data = sheetsData[index];
      const guide = data && data.guide && data.guide.intro;
      const box = document.getElementById('sitting-guide');
      if (!guide || !box) return;
      sittingGuideMode = 'intro';
      box.classList.remove('is-end');
      box.style.alignItems = '';
      document.getElementById('sitting-guide-kicker').textContent = (window.BAJourney && window.BAJourney.sheetLabel(index)) || ('Sheet ' + index);
      document.getElementById('sitting-guide-title').textContent = guide.title || 'Begin this sitting';
      document.getElementById('sitting-guide-expect').textContent = guide.expect || '';
      const list = document.getElementById('sitting-guide-do');
      list.innerHTML = '';
      (guide.do || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      document.getElementById('sitting-guide-primary').textContent = 'Begin this sitting';
      document.getElementById('sitting-guide-skip').hidden = false;
      box.hidden = false;
      syncSittingOverlay();
      const primary = document.getElementById('sitting-guide-primary');
      if (primary) primary.focus();
    }

    function layoutEndSpotlight(target) {
      const box = document.getElementById('sitting-guide');
      if (!box || !target || target.hidden) return;
      let r = target.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 40) {
        target.scrollIntoView({ behavior: 'auto', block: 'center' });
        r = target.getBoundingClientRect();
        if (r.bottom < 80 || r.top > window.innerHeight - 40) {
          const top = window.scrollY + r.top - (window.innerHeight / 2) + (r.height / 2);
          window.scrollTo(0, Math.max(0, top));
          r = target.getBoundingClientRect();
        }
      }
      const pad = 18;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const rad = Math.max(r.width, r.height) / 2 + pad;
      box.style.setProperty('--spot-x', cx + 'px');
      box.style.setProperty('--spot-y', cy + 'px');
      box.style.setProperty('--spot-r', rad + 'px');
      box.style.alignItems = cy > (window.innerHeight * 0.42) ? 'flex-start' : 'flex-end';
    }

    function scheduleEndSpotlight(target) {
      const run = () => layoutEndSpotlight(target);
      run();
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(run);
      });
      setTimeout(run, 60);
      setTimeout(run, 220);
      setTimeout(run, 480);
    }

    function showEndGuide(index) {
      const data = sheetsData[index];
      const guide = data && data.guide && data.guide.end;
      const box = document.getElementById('sitting-guide');
      if (!guide || !box) return;
      sittingGuideMode = 'end';
      endCardShownForSheet = index;
      box.classList.add('is-end');
      document.getElementById('sitting-guide-kicker').textContent = 'Where to go next';
      document.getElementById('sitting-guide-title').textContent = guide.title || 'Continue';
      document.getElementById('sitting-guide-expect').textContent = guide.nextWhy || '';
      document.getElementById('sitting-guide-do').innerHTML = '';
      document.getElementById('sitting-guide-primary').textContent = 'Go to the highlighted control';
      document.getElementById('sitting-guide-skip').hidden = true;
      box.hidden = false;
      syncSittingOverlay();
      const spotId = guide.spotlight || 'next-sheet-btn';
      const target = document.getElementById(spotId);
      if (target && !target.hidden) {
        target.classList.add('is-guide-spot');
        scheduleEndSpotlight(target);
      }
    }

    function maybeShowEndGuide() {
      if (!sheetQuizComplete()) return;
      if (endCardShownForSheet === currentSheetIndex) return;
      if (sittingGuideMode === 'intro') return;
      showEndGuide(currentSheetIndex);
    }

    function finishIntroGuide() {
      if (window.BAJourney) window.BAJourney.markIntroSeen(currentSheetIndex);
      hideSittingGuide();
    }

    function activateGuideTarget() {
      const data = sheetsData[currentSheetIndex];
      const spotId = (data && data.guide && data.guide.end && data.guide.end.spotlight) || 'next-sheet-btn';
      hideSittingGuide();
      const target = document.getElementById(spotId);
      if (target && !target.hidden && !target.disabled) target.click();
    }

    function syncAdvanceButtons(index) {
      const prevBtn = document.getElementById('prev-sheet-btn');
      const nextBtn = document.getElementById('next-sheet-btn');
      const nextBtnText = document.getElementById('next-btn-text');
      if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.hidden = false;
      if (nextBtnText) {
        if (index === sheetsData.length - 1) nextBtnText.innerText = 'Complete Codex & Review Mastery';
        else nextBtnText.innerText = 'Continue to Sheet ' + (index + 1) + ' →';
      }
      updateNextGate();
    }
