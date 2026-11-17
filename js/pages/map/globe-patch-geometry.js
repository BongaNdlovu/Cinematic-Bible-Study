import * as THREE from 'three';
import { R, toVec, PATCH_COLS, PATCH_ROWS, tileLat, tileLon } from '/js/pages/map/globe-math.js';

export function patchGeometry(z, x0, y0) {
  const sx = 40;
  const sy = 30;
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= sy; j++) {
    for (let i = 0; i <= sx; i++) {
      const v = toVec(tileLat(y0 + (PATCH_ROWS * j) / sy, z), tileLon(x0 + (PATCH_COLS * i) / sx, z), 1);
      nor.push(v.x, v.y, v.z);
      pos.push(v.x * R * 1.0015, v.y * R * 1.0015, v.z * R * 1.0015);
      uv.push(i / sx, 1 - j / sy);
    }
  }
  for (let j = 0; j < sy; j++) {
    for (let i = 0; i < sx; i++) {
      const a = j * (sx + 1) + i;
      idx.push(a, a + sx + 1, a + 1, a + 1, a + sx + 1, a + sx + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

export function freeCanvas(canvas) {
  canvas.width = 1;
  canvas.height = 1;
}
