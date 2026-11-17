import * as THREE from "three";
import { R, MIN_DIST, MAX_DIST, THROUGH_DIST, DEG, toVec, wrapLon, clamp, ease, angleBetween, CLOUD_DRIFT, CLOUD_NEAR, CLOUD_FULL, TILE_URL, PATCH_COLS, PATCH_ROWS, PATCH_NEAR, PATCH_FAR, TILE_LANES, tileX, tileY, loadImage, subdivide } from '/js/pages/map/globe-math.js';
import { buildGlobeBase, buildGlobeSky } from '/js/pages/map/globe-scene.js';
import { freeCanvas, patchGeometry } from '/js/pages/map/globe-patch-geometry.js';
export { toVec, webglAvailable } from '/js/pages/map/globe-math.js';

export function create(container, options) {
  const opts = options || {};
  const reduce = !!opts.reduce;
  const phone = window.matchMedia("(max-width: 800px), (pointer: coarse)").matches;
  const dpr = window.devicePixelRatio || 1;
  const base = opts.textureBase || "assets/maps/globe/";

  const { renderer, pinLayer, scene, camera, segs, earthMat, earth, sky, cloudMat, clouds } = buildGlobeBase({ container, dpr, phone });
  let drift = 0;
  let lastFrame = 0;

  const { haze, grid, atmos, stars } = buildGlobeSky({ phone, scene, segs });

  let borderObj = null;
  let fillObj = null;
  let routeGroup = null;
  const patchGroup = new THREE.Group();
  scene.add(patchGroup);
  const patches = new Map();
  let patchKey = "";
  let patchTimer = 0;
  let patchFails = 0;
  let patchRetryAt = 0;
  let featherTex = null;
  let fade = null;

  const loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function load(name, red) {
    return new Promise((resolve) => {
      loader.load(base + name, (tex) => {
        tex.anisotropy = aniso;
        if (red) tex.format = THREE.RedFormat;
        resolve(tex);
      }, undefined, () => resolve(null));
    });
  }
  const rect = container.getBoundingClientRect();
  const big = !phone && renderer.capabilities.maxTextureSize >= 4096 && Math.max(rect.width, rect.height) * dpr >= 1600;
  const ready = Promise.all([
    load(big ? "earth-day-4k.webp" : "earth-day-2k.webp"),
    load("earth-bump-2k.webp", true),
    load("earth-water-2k.webp", true),
    load("earth-clouds-1k.webp"),
    load("earth-night-1k.webp", true)
  ]).then(([day, bump, water, cloud, night]) => {
    if (disposed) {
      [day, bump, water, cloud, night].forEach((t) => t && t.dispose());
      return false;
    }
    if (day) {
      day.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = day;
      earthMat.color.set(0xffffff);
    }
    if (bump) {
      earthMat.bumpMap = bump;
      earthMat.bumpScale = 2.2;
    }
    if (water) earthMat.specularMap = water;
    if (cloud) {
      cloud.wrapS = THREE.RepeatWrapping;
      cloudMat.alphaMap = cloud;
      cloudMat.needsUpdate = true;
      sky.cloudMap.value = cloud;
      container.dataset.clouds = drift.toFixed(5);
    }
    if (night) {
      earthMat.emissiveMap = night;
      earthMat.emissive.set(0xffb46a);
      earthMat.emissiveIntensity = 1.5;
      container.dataset.night = "1";
    }
    earthMat.needsUpdate = true;
    kick();
    return !!day;
  });

  const cur = { lat: 30, lon: 30, dist: 3.4 };
  const tgt = { lat: 30, lon: 30, dist: 3.4 };
  let tween = null;
  let shown = true;
  let disposed = false;
  let raf = 0;
  let through = false;
  let pins = [];
  let beacon = null;
  let width = 1;
  let height = 1;

  function resize() {
    const r = container.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    kick();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);
  else window.addEventListener("resize", resize);
  resize();

  function kick() {
    if (!raf && shown && !disposed && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function step(now) {
    let moving = false;
    if (tween) {
      const t = clamp((now - tween.start) / tween.ms, 0, 1);
      const k = ease(t);
      cur.lat = tween.from.lat + (tween.to.lat - tween.from.lat) * k;
      cur.lon = wrapLon(tween.from.lon + tween.dLon * k);
      cur.dist = tween.from.dist + (tween.to.dist - tween.from.dist) * k + tween.hop * Math.sin(Math.PI * t);
      tgt.lat = cur.lat;
      tgt.lon = cur.lon;
      tgt.dist = cur.dist;
      if (t >= 1) {
        const done = tween.resolve;
        tween = null;
        done(true);
      } else {
        moving = true;
      }
      return moving;
    }
    const dLat = tgt.lat - cur.lat;
    const dLon = wrapLon(tgt.lon - cur.lon);
    const dDist = tgt.dist - cur.dist;
    if (Math.abs(dLat) + Math.abs(dLon) > 0.01 || Math.abs(dDist) > 0.0005) {
      const f = reduce ? 1 : 0.2;
      cur.lat += dLat * f;
      cur.lon = wrapLon(cur.lon + dLon * f);
      cur.dist += dDist * f;
      moving = true;
    } else {
      cur.lat = tgt.lat;
      cur.lon = tgt.lon;
      cur.dist = tgt.dist;
    }
    return moving;
  }

  const camDir = new THREE.Vector3();
  const proj = new THREE.Vector3();
  function place(el, lat, lon, horizon) {
    const n = toVec(lat, lon, 1);
    const facing = n.dot(camDir);
    if (facing < horizon) {
      el.classList.add("is-hidden");
      return;
    }
    proj.copy(n).multiplyScalar(R * 1.004).project(camera);
    const x = (proj.x * 0.5 + 0.5) * width;
    const y = (-proj.y * 0.5 + 0.5) * height;
    el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    el.classList.remove("is-hidden");
    el.style.opacity = String(clamp((facing - horizon) * 6, 0, 1).toFixed(2));
    return { x: x, y: y };
  }

  function placePins(horizon) {
    const labelled = [];
    pins.forEach((p) => {
      const at = place(p.el, p.lat, p.lon, horizon);
      if (!at || !p.hot) return;
      const crowded = labelled.some((q) => Math.abs(q.x - at.x) < 160 && Math.abs(q.y - at.y) < 22);
      p.el.classList.toggle("is-crowded", crowded);
      if (!crowded) labelled.push(at);
    });
  }

  function render() {
    camera.position.copy(toVec(cur.lat, cur.lon, cur.dist));
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const veil = clamp((cur.dist - CLOUD_NEAR) / (CLOUD_FULL - CLOUD_NEAR), 0, 1);
    clouds.visible = !!cloudMat.alphaMap && veil > 0;
    cloudMat.opacity = 0.85 * veil;
    sky.cloudFade.value = veil;
    sky.cloudShift.value = drift;
    if (cloudMat.alphaMap) cloudMat.alphaMap.offset.x = drift;
    patchGroup.visible = cur.dist < PATCH_FAR;
    renderer.render(scene, camera);
    camDir.copy(camera.position).normalize();
    const horizon = R / cur.dist + 0.03;
    placePins(horizon);
    if (beacon) place(beacon.el, beacon.lat, beacon.lon, horizon);
    if (opts.onView) opts.onView({ lat: cur.lat, lon: cur.lon, dist: cur.dist });
  }

  function frame(now) {
    raf = 0;
    if (!reduce && lastFrame) drift = (drift + Math.min(now - lastFrame, 50) * CLOUD_DRIFT) % 1;
    lastFrame = now;
    const fading = stepFade(now);
    const moving = step(now) || fading;
    render();
    if (moving || dragging) {
      kick();
      return;
    }
    lastFrame = 0;
    if (cloudMat.alphaMap) container.dataset.clouds = drift.toFixed(5);
    schedulePatch();
  }

  function stepFade(now) {
    if (!fade) return false;
    const t = clamp((now - fade.start) / 500, 0, 1);
    fade.mat.opacity = t;
    if (t >= 1) fade = null;
    return true;
  }

  function feather() {
    if (featherTex) return featherTex;
    const n = 128;
    const c = document.createElement("canvas");
    c.width = n;
    c.height = n;
    const g = c.getContext("2d");
    const img = g.createImageData(n, n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const e = Math.min(x, n - 1 - x, y, n - 1 - y) / (n - 1);
        const t = clamp(e / 0.16, 0, 1);
        const a = Math.round(255 * t * t * (3 - 2 * t));
        const i = (y * n + x) * 4;
        img.data[i] = a;
        img.data[i + 1] = a;
        img.data[i + 2] = a;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    featherTex = new THREE.CanvasTexture(c);
    return featherTex;
  }


  function showPatch(key) {
    patches.forEach((p, k) => {
      if (!p.mesh) return;
      const on = k === key;
      if (on && !p.mesh.visible) {
        p.mesh.material.opacity = reduce ? 1 : 0;
        if (!reduce) fade = { mat: p.mesh.material, start: performance.now() };
      }
      p.mesh.visible = on;
      if (on) p.used = performance.now();
    });
    container.dataset.imagery = key;
    kick();
  }

  function evictPatches() {
    const limit = phone ? 2 : 4;
    const spare = Array.from(patches.entries()).filter(([k, p]) => p.mesh && k !== patchKey);
    spare.sort((a, b) => a[1].used - b[1].used);
    while (spare.length && patches.size > limit) {
      const [k, p] = spare.shift();
      patchGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.map.dispose();
      p.mesh.material.dispose();
      patches.delete(k);
    }
  }

  function dropPending() {
    const p = patches.get(patchKey);
    if (!p || p.mesh) return false;
    patches.delete(patchKey);
    p.cancel();
    return true;
  }


  async function buildPatch(key, z, x0, y0) {
    const live = new Map();
    const entry = {
      mesh: null,
      used: performance.now(),
      cancel: () => live.forEach((done, img) => {
        img.src = "";
        done(false);
      })
    };
    patches.set(key, entry);
    const n = Math.pow(2, z);
    const canvas = document.createElement("canvas");
    canvas.width = PATCH_COLS * 256;
    canvas.height = PATCH_ROWS * 256;
    const g = canvas.getContext("2d");
    const tiles = [];
    for (let row = 0; row < PATCH_ROWS; row++) {
      for (let col = 0; col < PATCH_COLS; col++) {
        tiles.push({ col: col, row: row, url: TILE_URL + z + "/" + (y0 + row) + "/" + ((((x0 + col) % n) + n) % n) });
      }
    }
    const allowed = Math.floor(tiles.length * 0.5);
    let next = 0;
    let missed = 0;
    const wanted = () => !disposed && patches.get(key) === entry && missed <= allowed;
    const lane = async () => {
      while (next < tiles.length && wanted()) {
        const t = tiles[next++];
        const img = await loadImage(t.url, live);
        if (img) g.drawImage(img, t.col * 256, t.row * 256);
        else missed++;
      }
    };
    await Promise.all(Array.from({ length: TILE_LANES }, lane));
    if (disposed || patches.get(key) !== entry) {
      freeCanvas(canvas);
      return;
    }
    if (missed > allowed) {
      freeCanvas(canvas);
      patches.delete(key);
      patchKey = "";
      patchFails++;
      patchRetryAt = performance.now() + Math.min(60000, 2000 * Math.pow(2, patchFails - 1));
      schedulePatch();
      return;
    }
    patchFails = 0;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    tex.onUpdate = () => {
      tex.onUpdate = null;
      freeCanvas(canvas);
    };
    const mat = new THREE.MeshPhongMaterial({
      color: 0xe2e2e2,
      map: tex,
      alphaMap: feather(),
      transparent: true,
      depthWrite: false,
      specular: new THREE.Color(0x111111),
      shininess: 6
    });
    const mesh = new THREE.Mesh(patchGeometry(z, x0, y0), mat);
    mesh.renderOrder = 1;
    mesh.visible = false;
    entry.mesh = mesh;
    patchGroup.add(mesh);
    renderer.initTexture(tex);
    evictPatches();
    if (patchKey === key) showPatch(key);
  }

  function updatePatch() {
    patchTimer = 0;
    if (disposed || !shown || opts.imagery === false || cur.dist > PATCH_NEAR) return;
    const z = cur.dist < 1.75 ? 7 : 6;
    const n = Math.pow(2, z);
    const cx = Math.floor(tileX(cur.lon, z));
    const cy = Math.floor(tileY(cur.lat, z));
    const x0 = Math.floor((cx - PATCH_COLS / 2) / 2) * 2;
    const y0 = clamp(Math.floor((cy - PATCH_ROWS / 2) / 2) * 2, 0, n - PATCH_ROWS);
    const key = z + "/" + x0 + "/" + y0;
    if (key === patchKey) return;
    const have = patches.get(key);
    const wait = patchRetryAt - performance.now();
    if (!have && wait > 0) {
      patchTimer = setTimeout(updatePatch, wait);
      return;
    }
    dropPending();
    patchKey = key;
    if (have && have.mesh) showPatch(key);
    else if (!have) buildPatch(key, z, x0, y0);
  }

  function schedulePatch() {
    if (patchTimer) clearTimeout(patchTimer);
    patchTimer = setTimeout(updatePatch, 220);
  }

  function flyTo(lat, lon, dist) {
    const to = { lat: clamp(lat, -75, 75), lon: wrapLon(lon), dist: clamp(dist == null ? cur.dist : dist, MIN_DIST, MAX_DIST) };
    if (tween) tween.resolve(false);
    tween = null;
    if (reduce || !shown) {
      cur.lat = tgt.lat = to.lat;
      cur.lon = tgt.lon = to.lon;
      cur.dist = tgt.dist = to.dist;
      kick();
      return Promise.resolve(true);
    }
    const span = angleBetween(cur, to);
    const ms = clamp(900 + span * 18, 900, 2600);
    const hop = clamp(span / 70, 0, 1.1) * Math.max(0, 2.6 - Math.min(cur.dist, to.dist)) * 0.6;
    return new Promise((resolve) => {
      tween = { from: { lat: cur.lat, lon: cur.lon, dist: cur.dist }, to: to, dLon: wrapLon(to.lon - cur.lon), hop: hop, ms: ms, start: performance.now(), resolve: resolve };
      kick();
    });
  }

  const pointers = new Map();
  let dragging = false;
  let pinchStart = 0;
  let pinchDist = 0;
  const canvas = renderer.domElement;

  function cancelTween() {
    if (!tween) return;
    const done = tween.resolve;
    tween = null;
    done(false);
  }

  function checkThrough() {
    if (tgt.dist <= THROUGH_DIST && !through) {
      through = true;
      if (opts.onZoomThrough) opts.onZoomThrough({ lat: tgt.lat, lon: tgt.lon });
    } else if (tgt.dist > THROUGH_DIST + 0.15) {
      through = false;
    }
  }

  function onDown(ev) {
    canvas.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    cancelTween();
    dragging = true;
    container.classList.add("is-dragging");
    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      pinchDist = tgt.dist;
    }
    kick();
  }

  function onMove(ev) {
    const prev = pointers.get(ev.pointerId);
    if (!prev) return;
    const next = { x: ev.clientX, y: ev.clientY };
    pointers.set(ev.pointerId, next);
    if (pointers.size === 1) {
      const per = ((tgt.dist - R) * 62) / height;
      tgt.lon = wrapLon(tgt.lon - (next.x - prev.x) * per);
      tgt.lat = clamp(tgt.lat + (next.y - prev.y) * per, -75, 75);
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      const spread = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      tgt.dist = clamp(R + (pinchDist - R) * (pinchStart / spread), MIN_DIST, MAX_DIST);
      checkThrough();
    }
    kick();
  }

  function onUp(ev) {
    pointers.delete(ev.pointerId);
    if (pointers.size === 0) {
      dragging = false;
      container.classList.remove("is-dragging");
    }
    kick();
  }

  function onWheel(ev) {
    ev.preventDefault();
    cancelTween();
    const dy = ev.deltaY * (ev.deltaMode === 1 ? 33 : ev.deltaMode === 2 ? height : 1);
    const factor = Math.exp(clamp(dy, -120, 120) * 0.0016);
    tgt.dist = clamp(R + (tgt.dist - R) * factor, MIN_DIST, MAX_DIST);
    if (ev.deltaY < 0) checkThrough();
    else if (tgt.dist > THROUGH_DIST + 0.15) through = false;
    kick();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onUp);
  container.addEventListener("wheel", onWheel, { passive: false });

  function onVisibility() {
    if (!document.hidden) kick();
  }
  document.addEventListener("visibilitychange", onVisibility);

  function setPins(list) {
    pins.forEach((p) => p.el.remove());
    pins = (list || []).map((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cmap-gpin" + (p.hot ? " is-pulse" : " is-dim") + " is-hidden";
      el.setAttribute("aria-label", p.name);
      el.title = p.name;
      el.innerHTML = "<img src='" + p.icon + "' alt=''><span class='label'></span>";
      el.querySelector(".label").textContent = p.name;
      el.addEventListener("click", () => { if (opts.onPick) opts.onPick(p.id); });
      pinLayer.appendChild(el);
      return { el: el, lat: p.lat, lon: p.lon, hot: !!p.hot };
    });
    kick();
  }

  function setBeacon(lat, lon) {
    if (lat == null) {
      if (beacon) beacon.el.remove();
      beacon = null;
      return;
    }
    if (!beacon) {
      const el = document.createElement("div");
      el.className = "cmap-gbeacon is-hidden";
      el.setAttribute("aria-hidden", "true");
      pinLayer.appendChild(el);
      beacon = { el: el, lat: lat, lon: lon };
    }
    beacon.lat = lat;
    beacon.lon = lon;
    kick();
  }

  function disposeObj(obj) {
    if (!obj) return;
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    scene.remove(obj);
  }

  function setFills(features) {
    disposeObj(fillObj);
    fillObj = null;
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    features.forEach((f) => {
      if (!f.fill || !f.fillOpacity) return;
      c.set(f.fill);
      f.polys.forEach((poly) => {
        const rings = poly.map((ring) => {
          const r = ring.map((p) => new THREE.Vector2(p[0], p[1]));
          if (r.length > 1 && r[0].equals(r[r.length - 1])) r.pop();
          return r;
        });
        if (!rings[0] || rings[0].length < 3) return;
        const all = rings.reduce((acc, r) => acc.concat(r), []);
        const tris = [];
        THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1)).forEach((t) => subdivide(all[t[0]], all[t[1]], all[t[2]], 0, tris));
        tris.forEach((v) => {
          const p = toVec(v.y, v.x, R * 1.002);
          pos.push(p.x, p.y, p.z);
          col.push(c.r, c.g, c.b, f.fillOpacity);
        });
      });
    });
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    geo.computeVertexNormals();
    fillObj = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    fillObj.renderOrder = 3;
    scene.add(fillObj);
  }

  function setBorders(features) {
    disposeObj(borderObj);
    borderObj = null;
    setFills(features || []);
    if (!features || !features.length) { kick(); return; }
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    features.forEach((f) => {
      c.set(f.color || "#f3d98a");
      const lift = R * (f.active ? 1.0035 : 1.0025);
      f.polys.reduce((acc, p) => acc.concat(p), []).forEach((ring) => {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lon1, lat1] = ring[i];
          const [lon2, lat2] = ring[i + 1];
          const n = Math.max(1, Math.ceil(Math.max(Math.abs(lon2 - lon1), Math.abs(lat2 - lat1)) / 1.5));
          for (let s = 0; s < n; s++) {
            const t0 = s / n;
            const t1 = (s + 1) / n;
            const a = toVec(lat1 + (lat2 - lat1) * t0, lon1 + (lon2 - lon1) * t0, lift);
            const b = toVec(lat1 + (lat2 - lat1) * t1, lon1 + (lon2 - lon1) * t1, lift);
            pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
            col.push(c.r, c.g, c.b, c.r, c.g, c.b);
          }
        }
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    borderObj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    borderObj.renderOrder = 4;
    scene.add(borderObj);
    kick();
  }

  function arcPoints(a, b) {
    const va = toVec(a[0], a[1], 1);
    const vb = toVec(b[0], b[1], 1);
    const ang = Math.acos(clamp(va.dot(vb), -1, 1));
    const h = clamp(ang * 0.22, 0.012, 0.3);
    const n = Math.max(12, Math.ceil(ang / DEG));
    const out = [];
    const q = new THREE.Quaternion();
    const axis = new THREE.Vector3().crossVectors(va, vb).normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const v = ang > 1e-4 ? va.clone().applyQuaternion(q.setFromAxisAngle(axis, ang * t)) : va.clone();
      out.push(v.multiplyScalar(R * 1.003 + h * Math.sin(Math.PI * t)));
    }
    return out;
  }

  function setRoutes(routes) {
    disposeObj(routeGroup);
    routeGroup = null;
    if (!routes || !routes.length) { kick(); return; }
    routeGroup = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf0d78c, transparent: true, opacity: 0.92, depthWrite: false });
    routes.forEach((stops) => {
      for (let i = 0; i < stops.length - 1; i++) {
        const curve = new THREE.CatmullRomCurve3(arcPoints(stops[i], stops[i + 1]));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0032, 6, false), mat);
        tube.renderOrder = 5;
        routeGroup.add(tube);
      }
    });
    scene.add(routeGroup);
    kick();
  }

  function show() {
    shown = true;
    container.classList.add("is-shown");
    resize();
  }

  function hide() {
    shown = false;
    container.classList.remove("is-shown");
    pointers.clear();
    dragging = false;
    container.classList.remove("is-dragging");
    cancelTween();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (patchTimer) clearTimeout(patchTimer);
    patchTimer = 0;
    if (dropPending()) patchKey = "";
  }

  function dispose() {
    disposed = true;
    hide();
    if (ro) ro.disconnect();
    else window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    container.removeEventListener("wheel", onWheel);
    disposeObj(borderObj);
    disposeObj(fillObj);
    disposeObj(routeGroup);
    patches.forEach((p) => { if (p.mesh) p.mesh.material.map.dispose(); });
    disposeObj(patchGroup);
    disposeObj(grid);
    disposeObj(haze);
    disposeObj(stars);
    if (featherTex) featherTex.dispose();
    [earthMat.map, earthMat.bumpMap, earthMat.specularMap, earthMat.emissiveMap, cloudMat.alphaMap].forEach((t) => t && t.dispose());
    earth.geometry.dispose();
    earthMat.dispose();
    cloudMat.dispose();
    atmos.geometry.dispose();
    atmos.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    container.innerHTML = "";
  }

  function zoomBy(factor) {
    cancelTween();
    tgt.dist = clamp(R + (tgt.dist - R) * factor, MIN_DIST, MAX_DIST);
    if (factor < 1) checkThrough();
    else if (tgt.dist > THROUGH_DIST + 0.15) through = false;
    kick();
  }

  function jumpTo(lat, lon, dist) {
    cancelTween();
    cur.lat = tgt.lat = clamp(lat, -75, 75);
    cur.lon = tgt.lon = wrapLon(lon);
    cur.dist = tgt.dist = clamp(dist == null ? cur.dist : dist, MIN_DIST, MAX_DIST);
    through = cur.dist <= THROUGH_DIST;
    kick();
  }

  return {
    ready: ready,
    flyTo: flyTo,
    jumpTo: jumpTo,
    zoomBy: zoomBy,
    setPins: setPins,
    setBorders: setBorders,
    setRoutes: setRoutes,
    setBeacon: setBeacon,
    show: show,
    hide: hide,
    dispose: dispose,
    view: () => ({ lat: cur.lat, lon: cur.lon, dist: cur.dist }),
    isShown: () => shown,
    frames: () => renderer.info.render.frame
  };
}
