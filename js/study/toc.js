    function toggleTocDrawer() {
      const drawer = document.getElementById('toc-drawer');
      const overlay = document.getElementById('toc-overlay');
      const isOpen = !drawer.classList.contains('-translate-x-full');

      if (isOpen) {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
      } else {
        renderToc();
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
      }
    }

    function renderToc() {
      const list = document.getElementById('toc-unit-list');
      list.innerHTML = '';

      const memberViewer = !!(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
      const maxOpenIdx = (window.BAJourney && typeof window.BAJourney.maxOpenSheet === 'function') ? window.BAJourney.maxOpenSheet() : 0;

      sheetsData.forEach((sheet, idx) => {
        const isCurrent = idx === currentSheetIndex;
        const isDone = completedSheets.has(idx);

        const locked = !canAccessSheet(idx);
        // A guest's rows are sign-in doors (the page also sends guests to sign in).
        const guestWall = locked && !memberViewer;
        const btn = document.createElement('button');
        btn.type = 'button';
        if (!locked) {
          btn.addEventListener('click', () => {
            loadSheet(idx);
            toggleTocDrawer();
          });
        } else if (guestWall) {
          btn.addEventListener('click', () => {
            window.location.assign('account.html?next=' + encodeURIComponent('study.html?sheet=' + idx));
          });
        } else {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
        }
        const statusChip = isDone
          ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">✓ Completed</p>'
          : (locked
            ? `<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">${memberLockText('Locked — finish the open sitting')}</p>`
            : (!memberViewer && idx === maxOpenIdx
              ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Free — start here</p>'
              : (memberViewer && idx === maxOpenIdx
                ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Up next</p>'
                : '')));
        btn.className = `w-full text-left p-3 rounded-lg flex items-start space-x-3 transition-colors ${
          locked
            ? (guestWall
              ? 'opacity-70 hover:bg-paper-200/60 dark:hover:bg-paper-900'
              : 'opacity-45 cursor-default pointer-events-none')
            : isCurrent
            ? 'bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800'
            : 'hover:bg-paper-200/60 dark:hover:bg-paper-900'
        }`;

        btn.innerHTML = `
          <div class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
            isDone
              ? 'bg-emerald-600 text-white'
              : isCurrent
                ? 'bg-amber-600 text-white'
                : 'bg-paper-300 dark:bg-paper-800 text-ink-600 dark:text-paper-400'
          }">
            ${isDone ? '✓' : idx}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase">
              <span>${sheet.epoch}</span>
              <span>${sheet.readTime}</span>
            </div>
            <h4 class="font-serif text-sm font-semibold text-ink-900 dark:text-paper-100 truncate mt-0.5">
              ${sheet.title}
            </h4>
            ${statusChip}
          </div>
        `;
        if (locked && !guestWall) btn.title = 'Locked — finish the open sitting first';
        list.appendChild(btn);
      });

      const pct = Math.round((completedSheets.size / sheetsData.length) * 100);
      document.getElementById('toc-mastery-percent').innerText = `${pct}%`;
      document.getElementById('toc-mastery-bar').style.width = `${pct}%`;
      syncCertificateCta();
    }
