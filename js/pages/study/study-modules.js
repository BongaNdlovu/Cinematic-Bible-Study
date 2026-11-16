import { completedSheets, showToast } from '/js/pages/study/study-app.js';

    export function hasCompletedCourse() {
      return sheetsData.every((_, i) => completedSheets.has(i));
    }

    export function syncCertificateCta() {
      const btn = document.getElementById('btn-download-certificate');
      if (!btn) return;
      btn.hidden = !hasCompletedCourse();
    }

    export const studyModules = new Map();

    export function studyModuleFailed(name) {
      const entry = studyModules.get(name);
      return !!(entry && entry.failed);
    }

    export function studyAssetPath(name) {
      const host = document.getElementById('study-chunks');
      return host ? host.getAttribute('data-' + name) || '' : '';
    }

    export function loadStudyModule(name) {
      const known = studyModules.get(name);
      if (known) return known.promise;
      const entry = { failed: false };
      const src = studyAssetPath(name);
      entry.promise = new Promise((resolve, reject) => {
        if (!src) { reject(new Error('no file for ' + name)); return; }
        const tag = document.createElement('script');
        tag.src = src;
        tag.async = true;
        tag.addEventListener('load', () => resolve());
        tag.addEventListener('error', () => {
          tag.remove();
          reject(new Error(name + ' failed to load'));
        });
        document.head.appendChild(tag);
      });
      entry.promise.catch(() => {
        entry.failed = true;
        window.setTimeout(() => { if (studyModules.get(name) === entry) studyModules.delete(name); }, 30000);
      });
      studyModules.set(name, entry);
      return entry.promise;
    }

    export function openCertificateIfReady() {
      if (!hasCompletedCourse()) return;
      if (window.StudyCertificate) {
        window.StudyCertificate.open();
        return;
      }
      loadStudyModule('certificate').then(() => {
        if (window.StudyCertificate) window.StudyCertificate.open();
      }, () => showToast('The certificate could not load. Check your connection and try again.'));
    }
