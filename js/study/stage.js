import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODELS = {
  assembled: 'full_body.glb',
  head: 'golden_head.glb',
  chest: 'silver_chest.glb',
  thighs: 'bronze_thighs.glb',
  legs: 'iron_legs.glb',
  feet: 'feet_iron_clay.glb',
  stone: 'stone.glb',
  lion: 'lion.glb',
  bear: 'bear.glb',
  leopard: 'leopard.glb',
  beast: 'beast.glb',
  years1260: 'years1260.glb',
  ox_king: 'ox_king.glb',
  michael: 'michael.glb',
  sealed: 'sealed.glb',
  kings: 'kings.glb',
  decree: 'decree.glb'
};

const TARGET_HEIGHT = 1.72;
const NO_SPIN = { years1260: true };
const MODEL_YAW = { years1260: 0.28 };
const DISSOLVE_VERT = `
varying vec3 vWorldP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const DISSOLVE_FRAG = `
varying vec3 vWorldP;
uniform vec3 uColor;
uniform float uMetal;
uniform float uRough;
uniform float uThreshold;
uniform float uInvert;
uniform vec3 uLight;
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}
void main() {
  float n = hash(floor(vWorldP * 18.0));
  n = mix(n, hash(vWorldP * 7.3), 0.45);
  float t = uInvert > 0.5 ? (1.0 - uThreshold) : uThreshold;
  if (n < t) discard;
  float edge = smoothstep(t, t + 0.08, n);
  vec3 N = normalize(cross(dFdx(vWorldP), dFdy(vWorldP)));
  float ndl = max(0.18, dot(N, normalize(uLight)));
  vec3 col = uColor * (0.22 + ndl * (0.55 + uMetal * 0.45));
  col = mix(col, vec3(1.0, 0.82, 0.38), (1.0 - edge) * 0.85);
  gl_FragColor = vec4(col, 0.96);
}`;

function createStage() {
  const cache = {};
  const state = {
    host: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    root: null,
    horn: null,
    chunks: null,
    clock: new THREE.Clock(),
    anim: null,
    spin: 0,
    expanded: false,
    visible: true,
    running: false,
    raf: 0,
    reduced: false,
    lowPower: false,
    currentKey: null,
    onStatus: null
  };

  const loader = new GLTFLoader();
  if (MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);

  function status(msg) {
    if (typeof state.onStatus === 'function') state.onStatus(msg);
  }

  function prefersReduce() {
    if (state.reduced) return true;
    try {
      if (window.BAJourney && window.BAJourney.prefersReducedMotion()) return true;
    } catch (e) {}
    return false;
  }

  function worldBox(obj) {
    return new THREE.Box3().setFromObject(obj);
  }

  function normalize(root) {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);
    const box = worldBox(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    root.position.sub(center);
    root.updateMatrixWorld(true);
    const box2 = worldBox(root);
    const size2 = new THREE.Vector3();
    box2.getSize(size2);
    const h = Math.max(size2.y, 0.001);
    const s = TARGET_HEIGHT / h;
    root.scale.multiplyScalar(s);
    root.updateMatrixWorld(true);
    const box3 = worldBox(root);
    root.position.y -= box3.min.y;
    root.updateMatrixWorld(true);
    return root;
  }

  function frameObject(obj) {
    if (!obj || !state.camera || !state.controls) return;
    obj.updateMatrixWorld(true);
    const box = worldBox(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.2);
    const aspect = Math.max(0.5, state.camera.aspect || 1);
    const fov = THREE.MathUtils.degToRad(state.camera.fov * 0.92);
    const portrait = aspect < 0.95;
    const frameDim = portrait ? Math.max(size.y * 1.28, size.x * 0.55) : maxDim;
    const dist = (frameDim / (2 * Math.tan(fov * 0.5))) * (portrait ? 1.85 : 1.42);
    state.camera.position.set(center.x + dist * 0.32, center.y + dist * 0.14, center.z + dist);
    state.controls.target.set(center.x, center.y + size.y * 0.02, center.z);
    state.controls.update();
  }

  function avgColor(root) {
    let color = new THREE.Color(0xc9a24a);
    let found = false;
    root.traverse((child) => {
      if (found || !child.isMesh) return;
      const mat = Array.isArray(child.material) ? child.material[0] : child.material;
      if (mat && mat.color) {
        color = mat.color.clone();
        found = true;
      }
    });
    return color;
  }

  function makeDissolveMesh(src, invert) {
    const color = avgColor(src);
    const group = new THREE.Group();
    src.updateMatrixWorld(true);
    src.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geo = child.geometry.clone();
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: color },
          uMetal: { value: 0.7 },
          uRough: { value: 0.35 },
          uThreshold: { value: invert ? 1 : 0 },
          uInvert: { value: invert ? 1 : 0 },
          uLight: { value: new THREE.Vector3(0.45, 0.8, 0.55) }
        },
        vertexShader: DISSOLVE_VERT,
        fragmentShader: DISSOLVE_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        extensions: { derivatives: true }
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.applyMatrix4(child.matrixWorld);
      group.add(mesh);
    });
    return group;
  }

  function setThreshold(root, t) {
    root.traverse((child) => {
      if (child.material && child.material.uniforms && child.material.uniforms.uThreshold) {
        child.material.uniforms.uThreshold.value = t;
      }
    });
  }

  function clearRoot() {
    if (!state.root) return;
    while (state.root.children.length) {
      const child = state.root.children[0];
      state.root.remove(child);
    }
    state.horn = null;
    state.chunks = null;
    state.anim = null;
  }

  function loadKey(key) {
    const file = MODELS[key];
    if (!file) return Promise.reject(new Error('Unknown artifact ' + key));
    if (cache[key]) return Promise.resolve(cache[key].clone(true));
    return new Promise((resolve, reject) => {
      loader.load(
        'models/' + file,
        (gltf) => {
          const scene = gltf.scene || gltf.scenes[0];
          cache[key] = scene;
          resolve(scene.clone(true));
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  function place(obj) {
    clearRoot();
    normalize(obj);
    const yaw = MODEL_YAW[state.currentKey];
    if (typeof yaw === 'number') {
      obj.rotation.y = yaw;
      obj.updateMatrixWorld(true);
    }
    state.root.add(obj);
    frameObject(state.root);
    return obj;
  }

  function tick() {
    if (!state.running) return;
    state.raf = requestAnimationFrame(tick);
    if (!state.renderer || !state.visible) return;
    const dt = Math.min(0.05, state.clock.getDelta());
    if (state.anim && state.anim.update) {
      const done = state.anim.update(dt);
      if (done) state.anim = null;
    } else if (!state.expanded && !prefersReduce() && !NO_SPIN[state.currentKey]) {
      state.spin += dt * 0.22;
      if (state.root) state.root.rotation.y = state.spin;
    }
    if (state.controls) state.controls.update();
    state.renderer.render(state.scene, state.camera);
  }

  function startLoop() {
    if (state.running) return;
    state.running = true;
    state.clock.getDelta();
    tick();
  }

  function stopLoop() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function resize() {
    if (!state.host || !state.renderer || !state.camera) return;
    const w = Math.max(2, state.host.clientWidth || 320);
    const h = Math.max(2, state.host.clientHeight || 220);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    const dpr = state.lowPower ? 1.15 : Math.min(2, window.devicePixelRatio || 1);
    state.renderer.setPixelRatio(dpr);
    state.renderer.setSize(w, h, false);
    if (state.root) frameObject(state.root);
  }

  function tween(duration, fn) {
    return new Promise((resolve) => {
      if (prefersReduce() || duration <= 0) {
        fn(1);
        resolve();
        return;
      }
      let t = 0;
      state.anim = {
        update(dt) {
          t += dt;
          const p = Math.min(1, t / duration);
          const e = 0.5 - 0.5 * Math.cos(p * Math.PI);
          fn(e);
          if (p >= 1) {
            resolve();
            return true;
          }
          return false;
        }
      };
    });
  }

  async function show(key) {
    if (!state.root) return null;
    status(key || 'idle');
    state.currentKey = key;
    try {
      const obj = await loadKey(key);
      place(obj);
      if (key === 'beast' && state.horn) state.root.add(state.horn);
      status('');
      return obj;
    } catch (err) {
      console.warn('Study stage failed to load', key, err);
      status('Could not load ' + key);
      throw err;
    }
  }

  async function playDissolve(fromKey, toKey) {
    status((fromKey || '') + ' → ' + (toKey || ''));
    try {
      const fromObj = await loadKey(fromKey);
      const toObj = await loadKey(toKey);
      normalize(fromObj);
      normalize(toObj);
      const fromD = makeDissolveMesh(fromObj, false);
      const toD = makeDissolveMesh(toObj, true);
      clearRoot();
      state.root.add(fromD);
      state.root.add(toD);
      setThreshold(fromD, 0);
      setThreshold(toD, 1);
      frameObject(state.root);
      await tween(prefersReduce() ? 0 : 1.35, (p) => {
        setThreshold(fromD, p);
        setThreshold(toD, p);
      });
      clearRoot();
      const end = await loadKey(toKey);
      place(end);
      state.currentKey = toKey;
      status('');
    } catch (err) {
      console.warn('Dissolve failed', fromKey, toKey, err);
      try { await show(toKey); } catch (e) {}
    }
  }

  function spawnChunks(assembled) {
    const box = worldBox(assembled);
    const size = new THREE.Vector3();
    box.getSize(size);
    const colors = [0xc9a24a, 0xc0c6ce, 0xb87333, 0x6b7280, 0x8a7a68, 0xd4b896];
    const group = new THREE.Group();
    const items = [];
    const nx = 3, ny = 5, nz = 2;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        for (let z = 0; z < nz; z++) {
          const w = size.x / nx * 0.86;
          const h = size.y / ny * 0.86;
          const d = Math.max(0.05, size.z / nz * 0.86);
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(0.04, w), Math.max(0.04, h), d),
            new THREE.MeshStandardMaterial({
              color: colors[(x + y + z) % colors.length],
              metalness: 0.55,
              roughness: 0.42,
              transparent: true,
              opacity: 1
            })
          );
          mesh.position.set(
            box.min.x + (x + 0.5) * (size.x / nx),
            box.min.y + (y + 0.5) * (size.y / ny),
            box.min.z + (z + 0.5) * (size.z / nz)
          );
          group.add(mesh);
          items.push({
            mesh: mesh,
            v: new THREE.Vector3((x - 1) * 0.9, 0.35 + y * 0.08, (z - 0.5) * 0.7)
          });
        }
      }
    }
    return { group: group, items: items };
  }

  async function playSmash() {
    status('The stone strikes the feet');
    try {
      const assembled = await loadKey('assembled');
      const stone = await loadKey('stone');
      normalize(assembled);
      normalize(stone);
      stone.scale.multiplyScalar(0.28);
      stone.updateMatrixWorld(true);
      const aBox = worldBox(assembled);
      const sBox = worldBox(stone);
      const sSize = new THREE.Vector3();
      sBox.getSize(sSize);
      stone.position.set(aBox.max.x + 0.85, aBox.min.y + 1.15, aBox.max.z + 0.55);
      const impact = new THREE.Vector3(
        (aBox.min.x + aBox.max.x) * 0.5,
        aBox.min.y + Math.max(0.08, (aBox.max.y - aBox.min.y) * 0.08),
        aBox.min.z + 0.12
      );
      clearRoot();
      state.root.add(assembled);
      state.root.add(stone);
      frameObject(state.root);
      const start = stone.position.clone();
      if (prefersReduce()) {
        stone.position.copy(impact);
      } else {
        await tween(0.95, (p) => {
          stone.position.lerpVectors(start, impact, p);
          stone.rotation.x = p * 1.2;
        });
      }
      assembled.visible = false;
      const shattered = spawnChunks(assembled);
      state.root.add(shattered.group);
      state.chunks = shattered;
      if (prefersReduce()) {
        shattered.group.visible = false;
      } else {
        await tween(1.15, (p) => {
          shattered.items.forEach((it) => {
            it.mesh.position.addScaledVector(it.v, 0.028);
            it.mesh.position.y -= p * 0.045;
            it.mesh.rotation.x += 0.04;
            it.mesh.rotation.z += 0.03;
            it.mesh.material.opacity = 1 - p;
          });
        });
        state.root.remove(shattered.group);
      }
      assembled.removeFromParent();
      stone.position.copy(impact);
      stone.scale.set(1, 1, 1);
      normalize(stone);
      stone.position.y = 0;
      frameObject(stone);
      state.currentKey = 'stone';
      status('');
    } catch (err) {
      console.warn('Smash failed', err);
      try { await show('stone'); } catch (e) {}
    }
  }

  function makeHorn(beast) {
    const box = worldBox(beast);
    const size = new THREE.Vector3();
    box.getSize(size);
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(0.045, size.x * 0.055), Math.max(0.22, size.y * 0.22), 9),
      new THREE.MeshStandardMaterial({
        color: 0xe8d7a8,
        metalness: 0.15,
        roughness: 0.45
      })
    );
    horn.position.set(box.max.x * 0.18, box.max.y + size.y * 0.02, box.max.z * 0.12);
    horn.rotation.z = -0.35;
    horn.rotation.x = 0.2;
    horn.scale.set(0.01, 0.01, 0.01);
    return horn;
  }

  async function playHornGrow() {
    status('A little horn grows');
    try {
      if (state.currentKey !== 'beast') await show('beast');
      const beast = state.root.children[0] || state.root;
      if (state.horn) state.horn.removeFromParent();
      const horn = makeHorn(beast);
      state.horn = horn;
      state.root.add(horn);
      if (prefersReduce()) {
        horn.scale.set(1, 1, 1);
      } else {
        await tween(1.15, (p) => {
          const s = 0.01 + p * 0.99;
          horn.scale.set(s, s, s);
        });
      }
      status('');
    } catch (err) {
      console.warn('Horn grow failed', err);
    }
  }

  function expand() {
    state.expanded = true;
    if (state.controls) {
      state.controls.enabled = true;
      state.controls.autoRotate = false;
    }
    requestAnimationFrame(resize);
  }

  function collapse() {
    state.expanded = false;
    if (state.controls) state.controls.enabled = true;
    requestAnimationFrame(resize);
  }

  function mount(el, opts) {
    if (!el) return api;
    if (state.renderer) {
      if (state.host !== el) {
        el.appendChild(state.renderer.domElement);
        state.host = el;
      }
      resize();
      startLoop();
      return api;
    }
    const options = opts || {};
    state.host = el;
    state.onStatus = options.onStatus || null;
    state.reduced = !!options.reducedMotion;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    state.lowPower = window.innerWidth < 768 || coarse || (navigator.hardwareConcurrency || 8) <= 4;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0a09);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
    camera.position.set(1.4, 1.2, 3.4);
    const renderer = new THREE.WebGLRenderer({ antialias: !state.lowPower, alpha: false, powerPreference: 'default' });
    renderer.setClearColor(0x0b0a09, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);

    if (!state.lowPower) {
      const gen = new THREE.PMREMGenerator(renderer);
      scene.environment = gen.fromScene(new RoomEnvironment(), 0.04).texture;
      gen.dispose();
    }

    const hemi = new THREE.HemisphereLight(0xfff1d6, 0x1a140e, 0.7);
    const key = new THREE.DirectionalLight(0xffe3b0, 1.35);
    key.position.set(2.2, 3.4, 2.6);
    const fill = new THREE.DirectionalLight(0x88a0c8, 0.35);
    fill.position.set(-2.4, 1.2, -1.6);
    scene.add(hemi, key, fill);

    const root = new THREE.Group();
    scene.add(root);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 48),
      new THREE.MeshStandardMaterial({ color: 0x16120d, roughness: 0.92, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.1;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.49;

    state.scene = scene;
    state.camera = camera;
    state.renderer = renderer;
    state.controls = controls;
    state.root = root;

    resize();
    startLoop();

    if (window.ResizeObserver) {
      new ResizeObserver(() => resize()).observe(el);
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver((entries) => {
        state.visible = entries.some((e) => e.isIntersecting);
      }, { threshold: 0.05 }).observe(el);
    }
    return api;
  }

  const api = {
    mount: mount,
    show: show,
    playDissolve: playDissolve,
    playSmash: playSmash,
    playHornGrow: playHornGrow,
    expand: expand,
    collapse: collapse,
    resize: resize,
    isExpanded: () => state.expanded,
    setReducedMotion: (v) => { state.reduced = !!v; },
    getCurrent: () => state.currentKey
  };
  return api;
}

window.StudyStage = createStage();
window.dispatchEvent(new CustomEvent('study-stage-ready'));
