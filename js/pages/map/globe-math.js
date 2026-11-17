import * as THREE from 'three';

export const R = 1;

export const MIN_DIST = 1.3;

export const MAX_DIST = 4.4;

export const THROUGH_DIST = 1.42;

export const DEG = Math.PI / 180;

export function toVec(lat, lon, r) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export function wrapLon(lon) {
  return ((lon + 540) % 360) - 180;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function angleBetween(a, b) {
  const va = toVec(a.lat, a.lon, 1);
  const vb = toVec(b.lat, b.lon, 1);
  return Math.acos(clamp(va.dot(vb), -1, 1)) / DEG;
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch (e) {
    return false;
  }
}

export const ATMOS_VERT = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const ATMOS_FRAG = `
varying vec3 vNormal;
void main() {
  float i = pow(clamp(0.74 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
  gl_FragColor = vec4(0.62, 0.74, 1.0, 1.0) * i * 1.6;
}`;

export const HAZE_VERT = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const HAZE_FRAG = `
uniform vec3 sunDir;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
  float sun = dot(vNormal, sunDir);
  float lit = smoothstep(-0.25, 0.7, sun);
  vec3 tint = mix(vec3(1.0, 0.56, 0.32), vec3(0.45, 0.66, 1.0), smoothstep(-0.05, 0.35, sun));
  gl_FragColor = vec4(tint * rim * (0.2 + 0.8 * lit) * 0.85, 1.0);
}`;

export const EARTH_SHADE = `
#include <color_fragment>
float shade = 0.0;
#ifdef USE_MAP
  shade = texture2D(cloudMap, vec2(vMapUv.x + cloudShift, vMapUv.y)).g * cloudFade;
  diffuseColor.rgb *= 1.0 - 0.3 * shade;
#endif`;

export const EARTH_NIGHT = `
#ifdef USE_EMISSIVEMAP
  float dusk = 0.0;
  #if NUM_DIR_LIGHTS > 0
    dusk = 1.0 - smoothstep(-0.1, 0.3, dot(nonPerturbedNormal, directionalLights[0].direction));
  #endif
  totalEmissiveRadiance *= texture2D(emissiveMap, vEmissiveMapUv).r * dusk * (1.0 - 0.7 * shade);
#endif`;

export const SUN = new THREE.Vector3(-0.75, 0.35, 0.56).normalize();

export const CLOUD_DRIFT = 0.000003;

export const CLOUD_NEAR = 2.0;

export const CLOUD_FULL = 3.2;

export const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/";

export const PATCH_COLS = 8;

export const PATCH_ROWS = 6;

export const PATCH_NEAR = 2.5;

export const PATCH_FAR = 2.95;

export const TILE_LANES = 6;

export function tileX(lon, z) {
  return ((lon + 180) / 360) * Math.pow(2, z);
}

export function tileY(lat, z) {
  const r = clamp(lat, -84, 84) * DEG;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
}

export function tileLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return Math.atan(Math.sinh(n)) / DEG;
}

export function tileLon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

/* Per-tile timeout: a tile that never settles must not stall its lane forever,
   otherwise the Promise.all below never resolves and the failure backoff
   (patchFails) can never fire. 12s matches the hard-timeout budget used
   elsewhere on the site. */
const TILE_TIMEOUT_MS = 12000;

export function loadImage(url, live) {
  return new Promise((resolve) => {
    const img = new Image();
    let timer = 0;
    const done = (ok) => {
      if (timer) { clearTimeout(timer); timer = 0; }
      live.delete(img);
      resolve(ok ? img : null);
    };
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.addEventListener("load", () => done(true));
    img.addEventListener("error", () => done(false));
    live.set(img, done);
    img.src = url;
    timer = setTimeout(() => {
      img.src = ""; // release the in-flight request
      done(false);
    }, TILE_TIMEOUT_MS);
  });
}

export function graticule() {
  const pos = [];
  const lift = R * 1.0012;
  const seg = (a, b) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lon = -180; lon < 180; lon += 3) seg(toVec(lat, lon, lift), toVec(lat, lon + 3, lift));
  }
  for (let lon = -180; lon < 180; lon += 15) {
    for (let lat = -84; lat < 84; lat += 3) seg(toVec(lat, lon, lift), toVec(lat + 3, lon, lift));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd9b75a, transparent: true, opacity: 0.09, depthWrite: false }));
  lines.renderOrder = 2;
  return lines;
}

export function subdivide(a, b, c, depth, out) {
  const ab = a.distanceTo(b);
  const bc = b.distanceTo(c);
  const ca = c.distanceTo(a);
  const longest = Math.max(ab, bc, ca);
  if (longest <= 2 || depth >= 7) {
    out.push(a, b, c);
    return;
  }
  if (longest === ab) {
    const m = a.clone().lerp(b, 0.5);
    subdivide(a, m, c, depth + 1, out);
    subdivide(m, b, c, depth + 1, out);
  } else if (longest === bc) {
    const m = b.clone().lerp(c, 0.5);
    subdivide(a, b, m, depth + 1, out);
    subdivide(a, m, c, depth + 1, out);
  } else {
    const m = c.clone().lerp(a, 0.5);
    subdivide(a, b, m, depth + 1, out);
    subdivide(m, b, c, depth + 1, out);
  }
}
