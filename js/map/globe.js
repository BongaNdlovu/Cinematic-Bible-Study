import * as THREE from "three";

const R = 1;
const MIN_DIST = 1.3;
const MAX_DIST = 4.4;
const THROUGH_DIST = 1.42;
const DEG = Math.PI / 180;

export function toVec(lat, lon, r) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function wrapLon(lon) {
  return ((lon + 540) % 360) - 180;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function angleBetween(a, b) {
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

const ATMOS_VERT = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ATMOS_FRAG = `
varying vec3 vNormal;
void main() {
  float i = pow(clamp(0.74 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
  gl_FragColor = vec4(0.62, 0.74, 1.0, 1.0) * i * 1.6;
}`;

export function create(container, options) {
  const opts = options || {};
  const reduce = !!opts.reduce;
  const phone = window.matchMedia("(max-width: 800px), (pointer: coarse)").matches;
  const dpr = window.devicePixelRatio || 1;
  const base = opts.textureBase || "assets/maps/globe/";

  const renderer = new THREE.WebGLRenderer({ antialias: dpr <= 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(dpr, phone ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "cmap-globe-canvas";
  container.appendChild(renderer.domElement);

  const pinLayer = document.createElement("div");
  pinLayer.className = "cmap-globe-pins";
  container.appendChild(pinLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.7);
  sun.position.set(-2.2, 1.6, 3.2);
  camera.add(sun);

  const segs = phone ? 64 : 96;
  const earthMat = new THREE.MeshPhongMaterial({
    color: 0x0c1a26,
    specular: new THREE.Color(0x3a4a5c),
    shininess: 16
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, segs, segs), earthMat);
  scene.add(earth);

  const atmos = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 64, 64),
    new THREE.ShaderMaterial({
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  scene.add(atmos);

  const starCount = phone ? 700 : 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(60 + Math.random() * 30);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe8dcc0, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  let borderObj = null;
  let routeGroup = null;

  const loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function load(name) {
    return new Promise((resolve) => {
      loader.load(base + name, (tex) => { tex.anisotropy = aniso; resolve(tex); }, undefined, () => resolve(null));
    });
  }
  const rect = container.getBoundingClientRect();
  const big = !phone && renderer.capabilities.maxTextureSize >= 4096 && Math.max(rect.width, rect.height) * dpr >= 1600;
  const ready = Promise.all([
    load(big ? "earth-day-4k.webp" : "earth-day-2k.webp"),
    load("earth-bump-2k.webp"),
    load("earth-water-2k.webp")
  ]).then(([day, bump, water]) => {
    if (disposed) {
      [day, bump, water].forEach((t) => t && t.dispose());
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
    renderer.render(scene, camera);
    camDir.copy(camera.position).normalize();
    const horizon = R / cur.dist + 0.03;
    placePins(horizon);
    if (beacon) place(beacon.el, beacon.lat, beacon.lon, horizon);
    if (opts.onView) opts.onView({ lat: cur.lat, lon: cur.lon, dist: cur.dist });
  }

  function frame(now) {
    raf = 0;
    const moving = step(now);
    render();
    if (moving || dragging) kick();
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

  function setBorders(features) {
    disposeObj(borderObj);
    borderObj = null;
    if (!features || !features.length) { kick(); return; }
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    features.forEach((f) => {
      c.set(f.color || "#f3d98a");
      const lift = R * (f.active ? 1.0035 : 1.0025);
      f.rings.forEach((ring) => {
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
    borderObj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
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
        routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0032, 6, false), mat));
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
  }

  function dispose() {
    disposed = true;
    hide();
    if (ro) ro.disconnect();
    else window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    container.removeEventListener("wheel", onWheel);
    disposeObj(borderObj);
    disposeObj(routeGroup);
    [earthMat.map, earthMat.bumpMap, earthMat.specularMap].forEach((t) => t && t.dispose());
    earth.geometry.dispose();
    earthMat.dispose();
    atmos.geometry.dispose();
    atmos.material.dispose();
    starGeo.dispose();
    stars.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    container.innerHTML = "";
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
