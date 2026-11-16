import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { touchGltf, evictGltfs } from '/js/pages/gallery/model-cache.js';
import { ASSET_REGISTRY } from '/js/pages/gallery/artifact-registry.js';
import { assembledContainer, singleModelContainer, altarPlatformGroup, loadedGLTFScenes, MODELS_PREFIX, loadProgress, updateLoadingUI, museumToast } from '/js/pages/gallery/gallery.js';

export function countTriangles(root) {
  let n = 0;
  if (!root) return n;
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const idx = child.geometry.index;
    const pos = child.geometry.attributes.position;
    if (idx) n += idx.count / 3;
    else if (pos) n += pos.count / 3;
  });
  return n;
}

export function updateTriangleReadout() {
  const el = document.getElementById('dossier-geometry');
  if (!el) return;
  let n = 0;
  if (assembledContainer.visible) n += countTriangles(assembledContainer);
  if (singleModelContainer.visible) n += countTriangles(singleModelContainer);
  if (altarPlatformGroup.visible) n += countTriangles(altarPlatformGroup);
  const label = n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(Math.round(n));
  el.textContent = `${label} Triangles`;
}

// --- GLB ASSET LOADER ---
// Each load gets its own manager so a timeout can genuinely abort the
// in-flight download (LoadingManager.abortController), not just stop
// waiting on it. onSlow fires once past 4s for progressive feedback.
export function loadGLB(url, onLoad, onError, timeoutMs = 45000, onSlow) {
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  if (typeof MeshoptDecoder !== 'undefined') {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  let settled = false;
  let slowTimer = 0;
  let timer = 0;
  const settle = (fn, arg) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (slowTimer) clearTimeout(slowTimer);
    fn(arg);
  };
  if (typeof onSlow === 'function') {
    slowTimer = setTimeout(() => { if (!settled) onSlow(); }, 4000);
  }
  timer = setTimeout(() => {
    try { manager.abortController.abort(); } catch (e) { /* already settled */ }
    settle(onError, new Error('GLB load timed out: ' + url));
  }, timeoutMs);
  loader.load(url, (gltf) => settle(onLoad, gltf), undefined, (err) => settle(onError, err));
}

/* Three's Object3D.clone JSON-serializes userData. A material stored there
   runs toJSON and writes every texture out as a data URL. Lift those
   materials off the source for the clone, then put them back. */
export function cloneExhibit(model) {
  const held = [];
  model.traverse((child) => {
    if (!child.userData || child.userData.origMat == null) return;
    held.push([child, child.userData.origMat]);
    delete child.userData.origMat;
  });
  try {
    return model.clone();
  } finally {
    held.forEach(([child, mat]) => { child.userData.origMat = mat; });
  }
}

export async function loadGLBAsset(key, onLoaded) {
  if (MeshoptDecoder && MeshoptDecoder.ready) {
    try {
      await Promise.race([
        MeshoptDecoder.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('meshopt-timeout')), 8000))
      ]);
    } catch {
      /* decoder may still decode; failure is reported by the GLB loader */
    }
  }
  if (loadedGLTFScenes[key]) {
    touchGltf(key);
    if (onLoaded) onLoaded(cloneExhibit(loadedGLTFScenes[key]));
    return;
  }
  const data = ASSET_REGISTRY[key];
  if (!data || !data.filename) return;

  const candidatePaths = [
    MODELS_PREFIX + data.filename
  ];

  function markLoadFailure() {
    if (key === 'assembled' || key === 'head') {
      loadProgress.failed = true;
      loadProgress.loadedCount++;
      loadProgress.label = 'Hero model failed to load';
      const errEl = document.getElementById('loading-error');
      if (errEl) {
        errEl.textContent = `Could not load models/${data.filename}. The altar may still appear — use Continue to enter the gallery.`;
        errEl.classList.add('visible');
      }
      updateLoadingUI();
    } else {
      museumToast(`Could not load ${data.title}`);
    }
  }

  function tryLoad(idx) {
    if (idx >= candidatePaths.length) {
      markLoadFailure();
      return;
    }
    loadGLB(
      candidatePaths[idx],
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.userData.origMat = child.material.clone();
              child.material.envMapIntensity = 1.45;
              child.material.needsUpdate = true;
            }
          }
        });
        loadedGLTFScenes[key] = model;
        if (key === 'assembled') loadedGLTFScenes['full_body'] = model;
        touchGltf(key);
        if (key === 'assembled') touchGltf('full_body');
        evictGltfs();
        if (!loadProgress.heroAssetCounted) {
          loadProgress.heroAssetCounted = true;
          loadProgress.loadedCount++;
          loadProgress.label = `${data.title} mounted`;
          updateLoadingUI();
        }
        if (onLoaded) {
          setTimeout(() => {
            try {
              onLoaded(cloneExhibit(model));
            } catch (e) {
              if (key === 'assembled') markLoadFailure();
            }
          }, 0);
        }
      },
      () => {
        tryLoad(idx + 1);
      },
      45000,
      () => {
        /* Progressive feedback while a model is still arriving. */
        if (key === 'assembled' || key === 'head') {
          const status = document.getElementById('loading-status');
          if (status) status.textContent = 'Still assembling — this can take a little longer\u2026';
        } else {
          museumToast(`Still fetching ${data.title}\u2026`);
        }
      }
    );
  }
  tryLoad(0);
}
