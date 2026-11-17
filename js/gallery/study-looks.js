import * as THREE from 'three';
import { applyChiaroscuroRig, assembledContainer, singleModelContainer, museumToast } from '/js/gallery/app.js';

// --- STUDY RENDER MODES ---
export let activeStudyMode = 'gold';

export function disposeMaterial(mat) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  if (typeof mat.dispose === 'function') mat.dispose();
}

export function replaceMeshMaterial(child, nextMat) {
  const prev = child.material;
  const ownsPrev = !!child.userData.ownsMaterial;
  if (ownsPrev && prev && prev !== child.userData.origMat && prev !== nextMat) {
    disposeMaterial(prev);
  }
  child.material = nextMat;
  child.userData.ownsMaterial = true;
}

export function releaseExhibitMaterials(rootObj) {
  if (!rootObj) return;
  rootObj.traverse((child) => {
    if (!child.isMesh || !child.userData) return;
    const orig = child.userData.origMat;
    if (child.userData.ownsMaterial && child.material !== orig) disposeMaterial(child.material);
    if (orig) disposeMaterial(orig);
    delete child.userData.origMat;
    delete child.userData.ownsMaterial;
  });
}

export function applyStudyModeToMeshes(rootObj) {
  if (!rootObj) return;
  rootObj.traverse((child) => {
    if (!child.isMesh) return;
    let orig = child.userData && child.userData.origMat;
    if (!orig || typeof orig.clone !== 'function') {
      if (child.material && typeof child.material.clone === 'function') {
        orig = child.userData.origMat = child.material.clone();
      }
    }
    if (activeStudyMode === 'gold') {
      if (orig && typeof orig.clone === 'function') {
        const mat = orig.clone();
        mat.wireframe = false;
        mat.envMapIntensity = 1.45;
        mat.needsUpdate = true;
        replaceMeshMaterial(child, mat);
      }
    } else if (activeStudyMode === 'clay') {
      replaceMeshMaterial(child, new THREE.MeshStandardMaterial({
        color: 0xa89c8a, roughness: 0.9, metalness: 0.0,
        wireframe: false, envMapIntensity: 0.3
      }));
    } else if (activeStudyMode === 'wireframe') {
      replaceMeshMaterial(child, new THREE.MeshStandardMaterial({
        color: 0xffd678, emissive: 0x3d2706,
        roughness: 0.4, metalness: 0.3, wireframe: true
      }));
    } else if (activeStudyMode === 'lighting') {
      if (orig && typeof orig.clone === 'function') {
        const mat = orig.clone();
        mat.wireframe = false;
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.6;
        mat.needsUpdate = true;
        replaceMeshMaterial(child, mat);
      }
    }
  });
}

export function setStudyMode(mode) {
  activeStudyMode = mode;
  applyChiaroscuroRig(mode === 'lighting');
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  if (assembledContainer.visible) applyStudyModeToMeshes(assembledContainer);
  if (singleModelContainer.visible) applyStudyModeToMeshes(singleModelContainer);
  museumToast(`Render Mode: ${mode === 'lighting' ? 'CHIAROSCURO' : mode.toUpperCase()}`);
  if (window.Insights) window.Insights.track('gallery_mode', null, { mode: mode });
}
