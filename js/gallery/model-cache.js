import { activeAssetKey, loadedGLTFScenes } from '/js/gallery/app.js';

// Models are big (4.5-9.5 MB decoded), so only a handful stay cached.
// The boot pair (colossus + its 'full_body' alias) is permanent; everything
// else is least-recently-used. Evicted models reload from the browser cache.
export const GLTF_LRU_CAP = 6;

export const GLTF_PERMANENT = { assembled: true, full_body: true };

export const gltfLruOrder = [];

export const gltfRecentlyShown = [];

export function rememberShownKey(key) {
  const i = gltfRecentlyShown.indexOf(key);
  if (i >= 0) gltfRecentlyShown.splice(i, 1);
  gltfRecentlyShown.push(key);
  if (gltfRecentlyShown.length > 3) gltfRecentlyShown.shift();
}

export function isGltfEvictable(key) {
  return !GLTF_PERMANENT[key] && key !== activeAssetKey && gltfRecentlyShown.indexOf(key) === -1;
}

export function disposeGltfScene(model) {
  model.traverse((child) => {
    if (child.userData && child.userData.origMat && typeof child.userData.origMat.dispose === 'function') {
      child.userData.origMat.dispose();
    }
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        Object.values(m).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        m.dispose();
      });
    }
  });
}

export function touchGltf(key) {
  const i = gltfLruOrder.indexOf(key);
  if (i >= 0) gltfLruOrder.splice(i, 1);
  gltfLruOrder.push(key);
}

export function evictGltfs() {
  const cap = Math.max(GLTF_LRU_CAP - Object.keys(GLTF_PERMANENT).length, 2);
  let oldest = gltfLruOrder.find(isGltfEvictable);
  while (gltfLruOrder.filter((k) => !GLTF_PERMANENT[k]).length > cap && oldest) {
    disposeGltfScene(loadedGLTFScenes[oldest]);
    delete loadedGLTFScenes[oldest];
    const i = gltfLruOrder.indexOf(oldest);
    if (i >= 0) gltfLruOrder.splice(i, 1);
    oldest = gltfLruOrder.find(isGltfEvictable);
  }
}
