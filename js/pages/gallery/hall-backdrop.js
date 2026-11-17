import * as THREE from 'three';
import { hallUniforms, hallDummy, hallTexCache, HALL_CACHE_CAP, renderer, texLoader, hallPending, hallMesh } from '/js/pages/gallery/gallery.js';

export function layoutHall() {
  const portrait = window.innerHeight > window.innerWidth * 1.05;
  hallMesh.position.set(0, portrait ? 4.6 : 3.7, portrait ? -17.4 : -14.2);
  hallMesh.scale.setScalar(portrait ? 0.78 : 1);
  hallUniforms.darken.value = portrait ? 0.40 : 0.52;
  hallUniforms.vig.value = portrait ? 0.82 : 0.64;
}

export let hallCurrentUrl = '';

export let hallSlot = 0;

export let hallMixTarget = 0;

export function trimHallCache(url) {
  const keep = new Set([url, hallCurrentUrl]);
  const bound = new Set([hallUniforms.mapA.value, hallUniforms.mapB.value, hallDummy]);
  const spare = [];
  hallTexCache.forEach((tex, cachedUrl) => {
    if (keep.has(cachedUrl) || bound.has(tex)) return;
    spare.push(cachedUrl);
  });
  while (hallTexCache.size > HALL_CACHE_CAP && spare.length) {
    const dropUrl = spare.shift();
    const tex = hallTexCache.get(dropUrl);
    hallTexCache.delete(dropUrl);
    if (tex && tex !== hallDummy && typeof tex.dispose === 'function') tex.dispose();
  }
}

export function prepHallTex(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  // Non-power-of-two images cannot be mipmapped cleanly; switch to a plain
  // linear filter so WebGL stops logging GL_INVALID_ENUM for these backdrops.
  const pot = (n) => (n & (n - 1)) === 0;
  if (!pot(tex.image?.width || 0) || !pot(tex.image?.height || 0)) {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
  } else {
    tex.minFilter = THREE.LINEAR_MIPMAP_LINEAR;
  }
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

export function setHallBackdrop(url) {
  if (!url || url === hallCurrentUrl) return;
  hallCurrentUrl = url;
  window.__hallUrl = url;
  const apply = (tex) => {
    if (hallSlot === 0) {
      hallUniforms.mapB.value = tex;
      hallMixTarget = 1;
      hallSlot = 1;
    } else {
      hallUniforms.mapA.value = tex;
      hallMixTarget = 0;
      hallSlot = 0;
    }
  };
  if (hallTexCache.has(url)) {
    apply(hallTexCache.get(url));
    return;
  }
  texLoader.load(url, (tex) => {
    prepHallTex(tex);
    hallTexCache.set(url, tex);
    trimHallCache(url);
    if (hallCurrentUrl === url) apply(tex);
  }, undefined, () => {
    if (hallCurrentUrl !== url) return;
    hallCurrentUrl = '';
    window.__hallUrl = '';
  });
}

export function prefetchHall(url) {
  if (!url || hallTexCache.has(url) || hallPending.has(url)) return;
  hallPending.add(url);
  texLoader.load(url, (tex) => {
    prepHallTex(tex);
    hallTexCache.set(url, tex);
    trimHallCache(url);
    hallPending.delete(url);
  }, undefined, () => hallPending.delete(url));
}
