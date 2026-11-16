import { readScrollPlace, writeScrollPlace } from '/js/pages/study/scroll-place.js';

    export let scrollHold = false;

    export function plainText(html) {
      const holder = document.createElement('div');
      holder.innerHTML = String(html || '');
      return holder.textContent.trim();
    }

    export function bookOpened() {
      return window.BookOpen ? window.BookOpen.finished : Promise.resolve();
    }

    export function mountSheetBook(index, data, restore) {
      if (!window.BookReader) return;
      window.BookReader.mount(document.getElementById('sheet-article'), {
        sheetIndex: index,
        title: data.title,
        kicker: plainText(data.epoch),
        restore
      });
    }

    export function placeReader(index, restore) {
      let hashTarget = null;
      try { hashTarget = location.hash ? document.querySelector(location.hash) : null; } catch (e) { hashTarget = null; }
      if (hashTarget) {
        setTimeout(() => {
          const book = window.BookReader;
          if (book && book.isActive() && book.reveal(hashTarget, { instant: true })) {
            document.getElementById('sheet-article').scrollIntoView({ behavior: 'auto', block: 'start' });
            return;
          }
          hashTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 0);
        return;
      }
      let top = 0;
      if (restore) {
        const place = readScrollPlace();
        if (place && place.sheet === index) top = place.top;
      } else {
        writeScrollPlace(index, 0);
      }
      scrollHold = true;
      window.scrollTo(0, top);
      requestAnimationFrame(() => { scrollHold = false; });
    }
