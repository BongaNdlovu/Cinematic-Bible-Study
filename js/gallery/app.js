import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
    import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
    import { ASSET_REGISTRY, getNodeDataForAsset, MAP_YEAR_FOR_ASSET, artifactOrder } from '/js/gallery/artifact-registry.js';
    import { createStoneReliefCanvas, HALL_BACKDROPS, WALL_FRAMES, createCelestialHaloTexture, ICONS } from '/js/gallery/hall-art.js';

    const MODELS_PREFIX = 'models/';
    const journeyBoot = window.BAJourney ? window.BAJourney.load() : null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !!(journeyBoot && journeyBoot.reducedMotion);
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const lowPower = window.innerWidth < 768 || coarsePointer || (navigator.hardwareConcurrency || 8) <= 4;

    const urlParams = new URLSearchParams(window.location.search);
    const fromLesson = urlParams.get('from') === 'lesson';
    const lessonSheetRaw = urlParams.get('sheet');
    const isValidSheet = (s) => s !== null && s !== undefined && /^\d+$/.test(String(s).trim()) && Number(s) >= 0 && Number(s) <= 10;
    const lessonSheetSafe = (fromLesson && isValidSheet(lessonSheetRaw))
      ? (window.BAJourney && typeof window.BAJourney.clampToAccessible === 'function'
        ? String(window.BAJourney.clampToAccessible(Number(lessonSheetRaw)))
        : String(lessonSheetRaw).trim())
      : null;
    const lessonReturnHref = lessonSheetSafe
      ? `study.html?sheet=${encodeURIComponent(lessonSheetSafe)}#sheet-article`
      : null;

    const AudioBus = {
      ctx: null,
      muted: true,
      unlocked: false,
      unlock() {
        if (this.unlocked) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.unlocked = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();
      },
      tone(freq, dur, type, gain, startAt) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + (startAt || 0);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain || 0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      },
      noise(dur, gain) {
        if (!this.ctx || this.muted) return;
        const n = this.ctx.sampleRate * dur;
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1800;
        src.buffer = buf;
        g.gain.value = gain || 0.04;
        src.connect(f);
        f.connect(g);
        g.connect(this.ctx.destination);
        src.start();
      },
      play(kind) {
        if (!this.unlocked || this.muted) return;
        // Sampled arena notification, layered over the synthesized tones. Used
        // for the meaningful arena moments — staging an artifact, the hall
        // transition, and opening a panel — while hover ticks and generic
        // button clicks stay synthesized so rapid interaction is not noisy.
        if (window.UiSound && (kind === 'select' || kind === 'whoosh' || kind === 'panel')) {
          window.UiSound.play('notify');
        }
        if (kind === 'tick') this.tone(880, 0.05, 'sine', 0.02);
        else if (kind === 'select') {
          this.tone(220, 0.16, 'sine', 0.035);
          this.tone(392, 0.12, 'sine', 0.02, 0.04);
        } else if (kind === 'whoosh') {
          this.noise(0.18, 0.03);
          this.tone(160, 0.22, 'sine', 0.03);
        } else if (kind === 'panel') {
          this.tone(240, 0.1, 'sine', 0.025);
        } else if (kind === 'click') {
          this.tone(520, 0.045, 'sine', 0.016);
        }
      }
    };
    const unlockAudio = () => AudioBus.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    // --- THREE.JS SCENE SETUP ---
    const container = document.getElementById('webgl-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050301, 0.018);
    scene.background = new THREE.Color(0x050301);

    const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.02, 200);
    camera.position.set(7.2, 5.4, 21.5);
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) window.__galleryCamera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('tabindex', '0');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D view of the Daniel 2 colossus');

    // Dynamic Room Environment map for rich metallic sheen
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.38;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 1.35, 0);
    controls.minDistance = 0.08;
    controls.maxDistance = 48.0;
    controls.minPolarAngle = 0.04;
    controls.maxPolarAngle = Math.PI - 0.04;
    controls.zoomToCursor = false;
    controls.zoomSpeed = 1.45;
    controls.rotateSpeed = 0.92;
    controls.panSpeed = 0.7;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    let userHasAimed = false;
    let cameraTween = null;
    let autoSpin = false;
    function pauseAutoOrbit() {
      userHasAimed = true;
      if (!autoSpin) return;
      autoSpin = false;
      const spinBtn = document.getElementById('btn-spin');
      if (spinBtn) {
        spinBtn.classList.remove('active');
        spinBtn.textContent = 'Auto Orbit: OFF';
      }
      const b360 = document.getElementById('btn-museum-360');
      if (b360) b360.classList.remove('active');
    }
    controls.addEventListener('start', () => {
      cameraTween = null;
      pauseAutoOrbit();
    });


    const reliefWallTex = createStoneReliefCanvas();
    const reliefWallGeo = new THREE.CylinderGeometry(14.5, 14.5, 12.0, 64, 1, true, -Math.PI * 0.65, Math.PI * 1.3);
    const reliefWallMat = new THREE.MeshStandardMaterial({
      map: reliefWallTex,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.04,
      side: THREE.BackSide,
      fog: true
    });
    const reliefWall = new THREE.Mesh(reliefWallGeo, reliefWallMat);
    reliefWall.position.set(0, 2.5, -1.0);
    scene.add(reliefWall);

    const texLoader = new THREE.TextureLoader();

    const hallDummy = new THREE.DataTexture(new Uint8Array([6, 4, 3, 255]), 1, 1);
    hallDummy.needsUpdate = true;
    const hallUniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        mapA: { value: hallDummy },
        mapB: { value: hallDummy },
        mixAmt: { value: 0 },
        darken: { value: 0.58 },
        vig: { value: 0.62 },
        cool: { value: 0 }
      }
    ]);
    const hallMat = new THREE.ShaderMaterial({
      uniforms: hallUniforms,
      vertexShader: `
        varying vec2 vUv;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        uniform sampler2D mapA;
        uniform sampler2D mapB;
        uniform float mixAmt;
        uniform float darken;
        uniform float vig;
        uniform float cool;
        varying vec2 vUv;
        #include <common>
        #include <fog_pars_fragment>
        void main() {
          vec3 img = mix(texture2D(mapA, vUv).rgb, texture2D(mapB, vUv).rgb, mixAmt);
          img *= darken;
          img = mix(img, img * vec3(0.80, 0.88, 1.08), cool);
          vec2 p = (vUv - 0.5) * vec2(1.12, 1.05);
          float v = smoothstep(1.05, 0.22, length(p) * vig + length(p) * 0.35);
          float bottom = smoothstep(0.16, 0.48, vUv.y);
          vec3 voidCol = mix(vec3(0.020, 0.012, 0.006), vec3(0.016, 0.018, 0.028), cool);
          gl_FragColor = vec4(mix(voidCol, img, v * bottom), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
      side: THREE.FrontSide,
      fog: true,
      toneMapped: true,
      depthWrite: true
    });
    const hallMesh = new THREE.Mesh(new THREE.PlaneGeometry(44, 24.75), hallMat);
    hallMesh.renderOrder = -2;
    hallMesh.frustumCulled = false;
    scene.add(hallMesh);
    function layoutHall() {
      const portrait = window.innerHeight > window.innerWidth * 1.05;
      hallMesh.position.set(0, portrait ? 4.6 : 3.7, portrait ? -17.4 : -14.2);
      hallMesh.scale.setScalar(portrait ? 0.78 : 1);
      hallUniforms.darken.value = portrait ? 0.40 : 0.52;
      hallUniforms.vig.value = portrait ? 0.82 : 0.64;
    }
    layoutHall();
    window.addEventListener('resize', layoutHall);

    const hallTexCache = new Map();
    const HALL_CACHE_CAP = 4;
    const TOUCH_DBLCLICK_ECHO_MS = 500;
    const TOUR_BUSY_RETRY_MS = 300;
    let hallCurrentUrl = '';
    let hallSlot = 0;
    let hallMixTarget = 0;
    function trimHallCache(url) {
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
    function prepHallTex(tex) {
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
    function setHallBackdrop(url) {
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
    const hallPending = new Set();
    function prefetchHall(url) {
      if (!url || hallTexCache.has(url) || hallPending.has(url)) return;
      hallPending.add(url);
      texLoader.load(url, (tex) => {
        prepHallTex(tex);
        hallTexCache.set(url, tex);
        trimHallCache(url);
        hallPending.delete(url);
      }, undefined, () => hallPending.delete(url));
    }

    const galleryFrameGroup = new THREE.Group();
    scene.add(galleryFrameGroup);
    WALL_FRAMES.forEach((spec) => {
      const frame = new THREE.Group();
      const wood = new THREE.Mesh(
        new THREE.BoxGeometry(1.72, 1.28, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x3a2a12, metalness: 0.35, roughness: 0.55 })
      );
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.52, 1.08),
        new THREE.MeshBasicMaterial({ color: 0x222222 })
      );
      plate.position.z = 0.04;
      frame.add(wood);
      frame.add(plate);
      const a = spec.angle;
      frame.position.set(Math.sin(a) * 11.2, spec.y, -Math.cos(a) * 9.4 - 1.6);
      frame.lookAt(0, spec.y * 0.4, 4.0);
      frame.userData.asset = spec.asset;
      galleryFrameGroup.add(frame);
      texLoader.load(spec.img, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        plate.material.map = tex;
        plate.material.color.set(0xffffff);
        plate.material.needsUpdate = true;
      });
    });
    galleryFrameGroup.visible = !isPortraitStage();
    const frameRaycaster = new THREE.Raycaster();
    const framePointer = new THREE.Vector2();
    let ptrDown = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    renderer.domElement.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      ptrDown = { x: ev.clientX, y: ev.clientY };
    });
    renderer.domElement.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const steps = Math.max(1, Math.min(6, Math.abs(ev.deltaY) / 80));
      const factor = ev.deltaY > 0 ? Math.pow(1.12, steps) : Math.pow(0.88, steps);
      dollyByFactor(factor, ev.clientX, ev.clientY);
    }, { passive: false, capture: true });
    let lastTouchInspectAt = -Infinity;
    renderer.domElement.addEventListener('dblclick', (ev) => {
      ev.preventDefault();
      const isTouchEcho = performance.now() - lastTouchInspectAt < TOUCH_DBLCLICK_ECHO_MS;
      if (isTouchEcho) return;
      inspectAtPointer(ev.clientX, ev.clientY);
    });
    renderer.domElement.addEventListener('pointerup', (ev) => {
      if (!ptrDown) return;
      const moved = Math.abs(ev.clientX - ptrDown.x) + Math.abs(ev.clientY - ptrDown.y);
      ptrDown = null;
      if (moved > 8) return;
      const now = performance.now();
      const dbl = now - lastTap.t < 320 && Math.abs(ev.clientX - lastTap.x) + Math.abs(ev.clientY - lastTap.y) < 18;
      lastTap = { t: now, x: ev.clientX, y: ev.clientY };
      if (dbl && ev.pointerType !== 'mouse') {
        lastTouchInspectAt = now;
        inspectAtPointer(ev.clientX, ev.clientY);
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      framePointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      framePointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      frameRaycaster.setFromCamera(framePointer, camera);
      const frameHits = frameRaycaster.intersectObjects(galleryFrameGroup.children, true);
      if (frameHits.length) {
        let obj = frameHits[0].object;
        while (obj && !obj.userData.asset) obj = obj.parent;
        if (obj && obj.userData.asset) {
          AudioBus.play('select');
          selectAsset(obj.userData.asset);
          return;
        }
      }
      if (activeAssetKey === 'assembled' && assembledPartBody) {
        const bodyHits = frameRaycaster.intersectObject(assembledPartBody, true);
        if (bodyHits.length) {
          const part = pickAssembledPart(bodyHits[0].point);
          if (part) {
            AudioBus.play('select');
            selectAsset(part, { keepAngle: true });
          }
        }
      }
    });


    const haloTex = createCelestialHaloTexture();
    const haloGeo = new THREE.PlaneGeometry(14, 14);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55
    });
    const celestialHalo = new THREE.Mesh(haloGeo, haloMat);
    celestialHalo.position.set(0, 1.55, -2.4);
    scene.add(celestialHalo);

    // --- GALLERY EXHIBIT LIGHTING RIG ---
    const ambientLight = new THREE.AmbientLight(0x100c08, 0.18);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffe0b0, 0x080503, 0.28);
    scene.add(hemiLight);

    const galleryKeySpot = new THREE.SpotLight(0xfff3d2, 14, 22, Math.PI / 7.2, 0.38, 1.35);
    galleryKeySpot.position.set(2.4, 5.4, 4.2);
    galleryKeySpot.target.position.set(0, 1.2, 0);
    galleryKeySpot.castShadow = true;
    galleryKeySpot.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
    galleryKeySpot.shadow.bias = -0.0003;
    scene.add(galleryKeySpot);
    scene.add(galleryKeySpot.target);

    // Warm Amber Rim Spotlight from back-left
    const rimAmberSpot = new THREE.SpotLight(0xffc056, 8, 24, Math.PI / 4.4, 0.55, 1.05);
    rimAmberSpot.position.set(-4.2, 3.6, -3.4);
    rimAmberSpot.target.position.set(0, 1.25, 0);
    scene.add(rimAmberSpot);
    scene.add(rimAmberSpot.target);

    // Cool Lapis Contrast Fill Light
    const lapisFillLight = new THREE.PointLight(0x3a6cb8, 1.1, 16);
    lapisFillLight.position.set(-3.8, 1.4, 3.2);
    scene.add(lapisFillLight);

    // Flickering Palace Torches
    const torch1 = new THREE.PointLight(0xffaa33, 2.4, 11);
    torch1.position.set(-3.4, 2.0, 2.2);
    scene.add(torch1);

    const torch2 = new THREE.PointLight(0xff8822, 1.8, 11);
    torch2.position.set(3.4, 2.6, -1.8);
    scene.add(torch2);

    let torchesEnabled = true;
    const torchBase = { a: 2.4, b: 1.8 };
    let rigExposure = 1.0;
    let brightnessScale = 1.0;

    function applyExposure() {
      renderer.toneMappingExposure = rigExposure * brightnessScale;
    }

    // Chiaroscuro: one hard key from the side, near-black fill, so half the figure falls into shadow.
    function applyChiaroscuroRig(on) {
      ambientLight.intensity = on ? 0.08 : 0.35;
      hemiLight.intensity = on ? 0.14 : 0.55;
      galleryKeySpot.intensity = on ? 70 : 30;
      galleryKeySpot.angle = on ? Math.PI / 8 : Math.PI / 6.5;
      galleryKeySpot.penumbra = on ? 0.3 : 0.45;
      if (on) galleryKeySpot.position.set(4.6, 4.8, 1.4);
      else galleryKeySpot.position.set(2.4, 5.4, 4.2);
      rimAmberSpot.intensity = on ? 26 : 14;
      lapisFillLight.intensity = on ? 0.4 : 1.8;
      torchBase.a = on ? 2.2 : 5.0;
      torchBase.b = on ? 1.6 : 4.0;
      torch1.intensity = torchBase.a;
      torch2.intensity = torchBase.b;
      scene.environmentIntensity = on ? 0.3 : 0.75;
      rigExposure = on ? 1.1 : 1.15;
      applyExposure();
    }

    // --- MUSEUM GALLERY FLOOR & CONTACT SHADOW ---
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080603,
      roughness: 0.92,
      metalness: 0.08
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Contact shadow plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512; shadowCanvas.height = 512;
    const sctx = shadowCanvas.getContext('2d');
    const sgrad = sctx.createRadialGradient(256, 256, 16, 256, 256, 250);
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    sgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 512, 512);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 6.5),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.88, depthWrite: false })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.48;
    scene.add(shadowPlane);

    // Old Dais (fallback)
    const daisGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.18, 48);
    const daisMat = new THREE.MeshStandardMaterial({ color: 0x1c150e, roughness: 0.8, metalness: 0.2 });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = -1.51;
    dais.receiveShadow = true;
    scene.add(dais);

    // --- BLOOM COMPOSER ---
    let museumComposer = null;
    let museumBloomPass = null;
    if (!lowPower) {
      try {
        museumBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.28, 0.62, 0.84);
        museumComposer = new EffectComposer(renderer);
        museumComposer.addPass(new RenderPass(scene, camera));
        museumComposer.addPass(museumBloomPass);
        museumComposer.addPass(new OutputPass());
      } catch (err) {
        museumComposer = null;
        museumBloomPass = null;
      }
    }

    // --- ARTIFACT ROOT & GROUPS ---
    const artifactRoot = new THREE.Group();
    artifactRoot.position.y = -0.3;
    scene.add(artifactRoot);

    const singleModelContainer = new THREE.Group();
    artifactRoot.add(singleModelContainer);

    const assembledContainer = new THREE.Group();
    artifactRoot.add(assembledContainer);

    const altarPlatformGroup = new THREE.Group();
    artifactRoot.add(altarPlatformGroup);
    let altarModel = null;
    let altarVisible = true;

    /* GLB loads build their own GLTFLoader per request inside loadGLB() so a
       timeout can abort that download via its own LoadingManager. */

    const loadProgress = { totalAssets: 2, loadedCount: 0, label: 'Initializing…', failed: false };
    let approachStarted = false;
    function beginHallApproach() {
      if (approachStarted) return;
      approachStarted = true;
      autoSpin = false;
      const spinBtn = document.getElementById('btn-spin');
      if (spinBtn) {
        spinBtn.classList.remove('active');
        spinBtn.textContent = 'Auto Orbit: OFF';
      }
      const b360 = document.getElementById('btn-museum-360');
      if (b360) b360.classList.remove('active');
      if (activeAssetKey && activeAssetKey !== 'assembled') {
        const data = ASSET_REGISTRY[activeAssetKey];
        if (data?.autoFrame) {
          if (currentSingleModel) frameLoadedModel(currentSingleModel);
          return;
        }
        if (data?.camPos) {
          camera.position.set(...data.camPos);
          controls.target.set(...data.lookAt);
          controls.update();
          cameraTween = null;
          return;
        }
      }
      const data = ASSET_REGISTRY.assembled;
      const duration = reducedMotion ? 500 : 3200;
      const isPortrait = isPortraitStage() || window.innerWidth <= 768;
      const camPos = isPortrait ? new THREE.Vector3(0, 1.45, 12.0) : new THREE.Vector3(...data.camPos);
      const lookAt = isPortrait ? new THREE.Vector3(0, 1.05, 0) : new THREE.Vector3(...data.lookAt);
      tweenCamera(
        camPos,
        lookAt,
        duration
      );
      setTimeout(() => {
        masterNodesVisible = true;
        const btn = document.getElementById('btn-nodes-master');
        if (btn) btn.classList.add('active');
        syncNodes();
      }, reducedMotion ? 400 : 2400);
    }
    function hideLoadingOverlay() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.classList.add('hidden');
      beginHallApproach();
    }
    function updateLoadingUI() {
      const pct = Math.min(100, Math.round((loadProgress.loadedCount / loadProgress.totalAssets) * 100));
      const fill = document.getElementById('loading-bar-fill');
      const text = document.getElementById('loading-pct');
      const status = document.getElementById('loading-status');
      const errEl = document.getElementById('loading-error');
      if (fill) fill.style.width = pct + '%';
      if (text) text.textContent = pct + '%';
      if (status && loadProgress.label) status.textContent = loadProgress.label;
      if (loadProgress.failed && errEl) errEl.classList.add('visible');
      if (pct >= 100 && !loadProgress.failed) {
        setTimeout(hideLoadingOverlay, 350);
      } else if (pct >= 100 && loadProgress.failed) {
        const cont = document.getElementById('btn-load-continue');
        if (cont) cont.classList.add('visible');
      }
    }

    Object.keys(ASSET_REGISTRY).forEach((k) => {
      if (HALL_BACKDROPS[k]) ASSET_REGISTRY[k].hallImg = HALL_BACKDROPS[k];
    });




    let currentNodes = getNodeDataForAsset('assembled');
    let masterNodesVisible = true;
    let soloFocusNodeId = null;

    function buildEraTimeline() {
      const track = document.getElementById('era-track');
      if (!track) return;
      const cells = [
        { asset: 'assembled', label: 'COLOSSUS', date: 'Dan 2:31–45', img: 'assets/site/era-assembled.webp' },
        { asset: 'head', label: 'GOLD', date: '605–539 BC', img: 'assets/site/era-head.webp' },
        { asset: 'chest', label: 'SILVER', date: '539–331 BC', img: 'assets/site/era-chest.webp' },
        { asset: 'thighs', label: 'BRONZE', date: '331–168 BC', img: 'assets/site/era-thighs.webp' },
        { asset: 'legs', label: 'IRON', date: '168 BC–476 AD', img: 'assets/site/era-legs.webp' },
        { asset: 'feet', label: 'IRON & CLAY', date: 'Divided era', img: 'assets/site/era-feet.webp' },
        { asset: 'stone', label: 'THE STONE', date: 'Dan 2:34', img: 'assets/site/era-stone.webp' },
        { asset: 'lion', label: 'WINGED LION', date: 'Dan 7:4', img: 'assets/site/era-lion.webp' },
        { asset: 'bear', label: 'THE BEAR', date: 'Dan 7:5', img: 'assets/site/era-bear.webp' },
        { asset: 'leopard', label: 'LEOPARD', date: 'Dan 7:6', img: 'assets/site/era-leopard.webp' },
        { asset: 'beast', label: 'FOURTH BEAST', date: 'Dan 7:7', img: 'assets/site/era-beast.webp' },
        { asset: 'years1260', label: '1,260 YEARS', date: 'Dan 7:25', img: 'assets/site/era-years1260.webp' },
        { asset: 'ram', label: 'THE RAM', date: 'Dan 8:3', img: 'assets/site/era-ram.webp' },
        { asset: 'goat', label: 'THE GOAT', date: 'Dan 8:5', img: 'assets/site/era-goat.webp' },
        { asset: 'goat_broken', label: 'BROKEN HORN', date: 'Dan 8:8', img: 'assets/site/era-goat_broken.webp' },
        { asset: 'goat_horn', label: 'LITTLE HORN', date: 'Dan 8:9', img: 'assets/site/era-goat_horn.webp' },
        { asset: 'dura', label: 'DURA', date: 'Dan 3:1', img: 'assets/site/era-dura.webp' },
        { asset: 'stump', label: 'THE STUMP', date: 'Dan 4:15', img: 'assets/site/era-stump.webp' },
        { asset: 'ox_king', label: 'OX-KING', date: 'Dan 4:33', img: 'assets/site/era-ox_king.webp' },
        { asset: 'ancient', label: 'ANCIENT OF DAYS', date: 'Dan 7:9', img: 'assets/site/era-ancient.webp' },
        { asset: 'son', label: 'SON OF MAN', date: 'Dan 7:13', img: 'assets/site/era-son.webp' },
        { asset: 'decree', label: 'THE DECREE', date: '457 BC', img: 'assets/site/era-decree.webp' },
        { asset: 'kings', label: 'NORTH & SOUTH', date: 'Dan 11:5', img: 'assets/site/era-kings.webp' },
        { asset: 'michael', label: 'MICHAEL', date: 'Dan 12:1', img: 'assets/site/era-michael.webp' },
        { asset: 'sealed', label: 'SEALED BOOK', date: 'Dan 12:4', img: 'assets/site/era-sealed.webp' }
      ];
      const html = cells.map((c) => `
        <button class="era-cell" type="button" data-asset="${c.asset}">
          <img src="${c.img}" alt="">
          <span class="era-meta"><b>${c.label}</b><span>${c.date}</span></span>
        </button>`).join('');
      track.innerHTML = html + html;
      track.querySelectorAll('.era-cell').forEach((btn) => {
        btn.addEventListener('click', () => {
          AudioBus.play('select');
          selectAsset(btn.dataset.asset);
        });
      });
    }

    function museumToast(msg) {
      const el = document.getElementById('museum-toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(museumToast._t);
      museumToast._t = setTimeout(() => el.classList.remove('show'), 2400);
    }

    function closeAllPanels() {
      document.body.classList.remove('rail-open', 'narrative-open', 'modal-open');
      const lab = document.getElementById('study-lab-drawer');
      if (lab) lab.classList.remove('open');
      document.querySelectorAll('.exhibit-modal.open').forEach((m) => m.classList.remove('open'));
    }

    function openModal(id) {
      closeAllPanels();
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.add('open');
      document.body.classList.add('modal-open');
    }

    function openScriptureModal() {
      const data = ASSET_REGISTRY[activeAssetKey] || ASSET_REGISTRY.assembled;
      const body = document.getElementById('scripture-modal-body');
      const ref = document.getElementById('scripture-modal-ref');
      if (body) body.textContent = data.quote;
      if (ref) ref.textContent = data.quoteRef;
      openModal('scripture-modal');
    }

    function openAboutModal() {
      openModal('about-modal');
    }

    function setNavActive(name) {
      document.querySelectorAll('.nav-item').forEach((el) => {
        el.classList.toggle('active', el.dataset.nav === name);
      });
    }

    function filterArtifacts(query) {
      const q = (query || '').trim().toLowerCase();
      let visible = 0;
      document.querySelectorAll('.artifact-card-item').forEach((card) => {
        const hay = `${card.textContent} ${card.dataset.asset}`.toLowerCase();
        const show = !q || hay.includes(q);
        card.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      const list = document.getElementById('artifact-cards-list');
      if (list) {
        let empty = document.getElementById('artifact-search-empty');
        if (!empty) {
          empty = document.createElement('p');
          empty.id = 'artifact-search-empty';
          empty.className = 'artifact-search-empty';
          empty.textContent = 'No artifacts match that search.';
          list.appendChild(empty);
        }
        empty.hidden = !(q && visible === 0);
      }
    }

    // Build DOM elements for museum nodes
    const nodesContainer = document.getElementById('museum-nodes-container');
    const nodesSvg = document.getElementById('museum-nodes-svg');
    const nodeSvgParts = new Map();
    const _toCam = new THREE.Vector3();
    const _normal = new THREE.Vector3();

    function rebuildNodeElements() {
      if (!nodesContainer) return;
      nodesContainer.innerHTML = '';
      if (nodesSvg) nodesSvg.innerHTML = '';
      nodeSvgParts.clear();

      currentNodes.forEach((node) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'museum-node-card';
        card.id = `node-card-${node.id}`;
        card.dataset.id = node.id;
        card.setAttribute('aria-label', node.label);
        card.innerHTML = `
          <div class="museum-node-header">
            <div class="museum-node-icon">${node.icon}</div>
            <div class="museum-node-label">${node.label}</div>
          </div>
          <div class="museum-node-body">${node.body}</div>
        `;
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          handleNodeClick(node.id);
        });
        nodesContainer.appendChild(card);

        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'museum-node-pin';
        pin.id = `node-pin-${node.id}`;
        pin.dataset.id = node.id;
        pin.setAttribute('aria-label', `Focus ${node.label}`);
        pin.innerHTML = `
          <div class="museum-node-pin-halo"></div>
          <div class="museum-node-pin-inner"></div>
        `;
        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          handleNodeClick(node.id);
        });
        nodesContainer.appendChild(pin);

        if (!nodesSvg) return;
        const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitPath.setAttribute('class', 'museum-node-line-hit');
        hitPath.addEventListener('click', (e) => {
          e.stopPropagation();
          handleNodeClick(node.id);
        });
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('class', 'museum-node-line');
        const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot1.setAttribute('r', '2.5');
        dot1.setAttribute('fill', '#ffd678');
        nodesSvg.appendChild(hitPath);
        nodesSvg.appendChild(line);
        nodesSvg.appendChild(dot1);
        nodeSvgParts.set(node.id, { hitPath, line, dot1, cardH: 80 });
      });
    }

    function handleNodeClick(nodeId) {
      if (soloFocusNodeId === nodeId) {
        soloFocusNodeId = null; // restore all
      } else {
        soloFocusNodeId = nodeId;
      }
      if (window.Insights) window.Insights.track('gallery_node', null, { node: nodeId });
      syncNodes();
    }

    // Toggle master nodes
    const btnNodesMaster = document.getElementById('btn-nodes-master');
    if (btnNodesMaster) {
      btnNodesMaster.addEventListener('click', () => {
        masterNodesVisible = !masterNodesVisible;
        btnNodesMaster.classList.toggle('active', masterNodesVisible);
        btnNodesMaster.title = masterNodesVisible ? 'Hide annotation nodes' : 'Show annotation nodes';
        syncNodes();
        museumToast(masterNodesVisible ? 'Museum Nodes Enabled' : 'Museum Nodes Hidden');
      });
    }

    const TITLES_HIDE_KEY = 'gallery_hide_titles';
    const btnTitlesToggle = document.getElementById('btn-titles-toggle');
    function titlesHiddenStored() {
      try { return localStorage.getItem(TITLES_HIDE_KEY) === '1'; } catch (e) { return false; }
    }
    function applyTitlesHidden(hidden, persist) {
      document.body.classList.toggle('titles-hidden', hidden);
      if (persist) {
        try { localStorage.setItem(TITLES_HIDE_KEY, hidden ? '1' : '0'); } catch (e) {}
      }
      if (btnTitlesToggle) {
        btnTitlesToggle.classList.toggle('active', !hidden);
        btnTitlesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        const label = hidden ? 'Show artifact title' : 'Hide artifact title';
        btnTitlesToggle.title = label;
        btnTitlesToggle.setAttribute('aria-label', label);
      }
    }
    applyTitlesHidden(titlesHiddenStored() || document.body.classList.contains('titles-hidden'), false);
    if (btnTitlesToggle) {
      btnTitlesToggle.addEventListener('click', () => {
        const nextHidden = !document.body.classList.contains('titles-hidden');
        applyTitlesHidden(nextHidden, true);
        museumToast(nextHidden ? 'Artifact title hidden' : 'Artifact title shown');
      });
    }

    // Mobile notes sheet toggle shares the master-nodes state
    const btnNodesSheetToggle = document.getElementById('btn-nodes-sheet-toggle');
    if (btnNodesSheetToggle) {
      btnNodesSheetToggle.addEventListener('click', () => {
        masterNodesVisible = !masterNodesVisible;
        if (btnNodesMaster) {
          btnNodesMaster.classList.toggle('active', masterNodesVisible);
          btnNodesMaster.title = masterNodesVisible ? 'Hide annotation nodes' : 'Show annotation nodes';
        }
        syncNodes();
      });
    }

    const _tempVec = new THREE.Vector3();
    let nodesHiddenSynced = false;
    function syncNodes() {
      if (!nodesSvg || !camera) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      nodesSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      const hideAll = !masterNodesVisible;
      const sheet = document.getElementById('museum-nodes-sheet');
      if (sheet) {
        sheet.hidden = true;
        sheet.style.display = 'none';
      }
      if (hideAll) {
        document.querySelectorAll('.museum-node-card').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.museum-node-pin').forEach(p => { p.style.display = 'none'; });
        nodeSvgParts.forEach((parts) => {
          parts.hitPath.style.display = 'none';
          parts.line.style.display = 'none';
          parts.dot1.style.display = 'none';
        });
        nodesHiddenSynced = true;
        return;
      }
      nodesHiddenSynced = false;

      const isMobile = w <= 768;
      const cardW = isMobile ? Math.min(138, Math.floor(w * 0.36)) : 196;
      const leftColX = isMobile ? 8 : Math.min(Math.max(258, w * 0.198), 280);
      const rightColX = isMobile ? (w - cardW - 8) : Math.max(w - 330 - cardW - 18, w * 0.62);
      const rowYPositions = isMobile ? [
        Math.max(130, h * 0.23),
        Math.max(230, h * 0.45),
        Math.max(330, h * 0.67)
      ] : [
        Math.max(178, h * 0.255),
        Math.max(318, h * 0.49),
        Math.max(458, h * 0.72)
      ];

      currentNodes.forEach((node) => {
        const cardEl = document.getElementById(`node-card-${node.id}`);
        const pinEl = document.getElementById(`node-pin-${node.id}`);
        const parts = nodeSvgParts.get(node.id);
        if (!cardEl || !pinEl || !parts) return;

        const isSolo = soloFocusNodeId !== null;
        const isFocused = soloFocusNodeId === node.id;

        cardEl.classList.toggle('active', isFocused);
        cardEl.classList.toggle('dim', isSolo && !isFocused);
        cardEl.classList.remove('hidden');

        const cardX = node.col === 'left' ? leftColX : rightColX;
        const cardY = rowYPositions[node.row] || (150 + node.row * 130);
        cardEl.style.left = `${cardX}px`;
        cardEl.style.top = `${cardY}px`;
        if (isMobile) {
          cardEl.style.width = `${cardW}px`;
          cardEl.style.maxWidth = `${cardW}px`;
        } else {
          cardEl.style.width = '';
          cardEl.style.maxWidth = '';
        }

        _tempVec.copy(node.anchor).applyMatrix4(artifactRoot.matrixWorld);
        _toCam.copy(camera.position).sub(_tempVec).normalize();
        _normal.set(0, 0, 1).applyQuaternion(artifactRoot.quaternion);
        const dot = _toCam.dot(_normal);

        _tempVec.project(camera);
        const behind = _tempVec.z > 1.0 || dot < -0.35;

        parts.hitPath.style.display = '';
        parts.line.style.display = '';
        parts.dot1.style.display = '';

        if (behind) {
          pinEl.style.display = 'none';
          cardEl.classList.add('dim');
          parts.hitPath.style.display = 'none';
          parts.line.style.display = 'none';
          parts.dot1.style.display = 'none';
          return;
        }

        pinEl.style.display = 'flex';
        const ax = (_tempVec.x * 0.5 + 0.5) * w;
        const ay = (-_tempVec.y * 0.5 + 0.5) * h;

        pinEl.style.left = `${Math.max(4, Math.min(w - 24, ax))}px`;
        pinEl.style.top = `${Math.max(4, Math.min(h - 24, ay))}px`;
        pinEl.classList.toggle('active', isFocused);

        const cardH = parts.cardH || cardEl.offsetHeight || 80;
        parts.cardH = cardH;
        const cardAttachX = node.col === 'left' ? (cardX + cardW) : cardX;
        const cardAttachY = cardY + cardH * 0.5;
        const kneeX = node.col === 'left' ? (cardAttachX + 24) : (cardAttachX - 24);
        const pathD = `M ${cardAttachX} ${cardAttachY} L ${kneeX} ${cardAttachY} L ${ax} ${ay}`;
        parts.hitPath.setAttribute('d', pathD);
        parts.line.setAttribute('d', pathD);
        parts.line.classList.toggle('active', isFocused);
        parts.line.style.opacity = (isSolo && !isFocused) ? '0.2' : '1';
        parts.dot1.setAttribute('cx', cardAttachX);
        parts.dot1.setAttribute('cy', cardAttachY);
      });
    }

    function getWorldBox(object) {
      object.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(object);
    }

    function isPortraitStage() {
      return window.innerHeight > window.innerWidth * 1.05;
    }

    function getLiveArtifact() {
      if (assembledContainer.visible) return assembledContainer;
      if (singleModelContainer.visible) return singleModelContainer;
      return artifactRoot;
    }

    function fitOrbitLimits(object) {
      const subject = object || getLiveArtifact();
      if (!subject) return;
      const box = getWorldBox(subject);
      if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;
      const size = new THREE.Vector3();
      box.getSize(size);
      const radius = Math.max(0.35, size.length() * 0.5);
      controls.minDistance = Math.max(0.08, radius * 0.045);
      controls.maxDistance = Math.max(28, Math.min(56, radius * 14));
    }

    function applyKeepAngleCamera(object, instant) {
      if (!object) return;
      const framed = frameFromCurrentAngle(object);
      if (instant) {
        camera.position.copy(framed.pos);
        controls.target.copy(framed.look);
        controls.update();
        cameraTween = null;
      } else {
        tweenCamera(framed.pos, framed.look, 700);
      }
    }

    function dollyByFactor(factor, clientX, clientY) {
      pauseAutoOrbit();
      cameraTween = null;
      const live = getLiveArtifact();
      if (live) fitOrbitLimits(live);
      if (clientX != null && clientY != null && live) {
        const rect = renderer.domElement.getBoundingClientRect();
        framePointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        framePointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        frameRaycaster.setFromCamera(framePointer, camera);
        const hits = frameRaycaster.intersectObject(live, true);
        if (hits[0] && factor < 1) {
          controls.target.lerp(hits[0].point, 0.26);
        }
      }
      const offset = camera.position.clone().sub(controls.target);
      const len = offset.length();
      if (len < 1e-6) return;
      offset.setLength(THREE.MathUtils.clamp(len * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
      controls.update();
    }

    function frameFromCurrentAngle(object) {
      const subject = object || getLiveArtifact();
      if (!subject) return { pos: camera.position.clone(), look: controls.target.clone() };
      subject.updateMatrixWorld(true);
      const box = getWorldBox(subject);
      if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) {
        return { pos: camera.position.clone(), look: controls.target.clone() };
      }
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      fitOrbitLimits(subject);
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-8) dir.set(0.36, 0.18, 1);
      dir.normalize();
      const fov = THREE.MathUtils.degToRad(camera.fov * 0.9);
      const portrait = isPortraitStage() || camera.aspect < 0.9;
      const frameDim = portrait
        ? Math.max(size.y * 1.35, size.x * 0.45, size.z * 0.45)
        : Math.max(size.x, size.y, size.z);
      const distScale = portrait ? 2.05 : 1.28;
      const dist = THREE.MathUtils.clamp(
        (frameDim / (2 * Math.tan(fov * 0.5))) * distScale,
        controls.minDistance * 1.4,
        controls.maxDistance * 0.92
      );
      return {
        pos: center.clone().addScaledVector(dir, dist),
        look: center.clone().add(new THREE.Vector3(0, size.y * 0.04, 0))
      };
    }

    function frameLoadedModel(object) {
      if (!object) return;
      object.updateMatrixWorld(true);
      fitOrbitLimits(object);
      if (userHasAimed) {
        const framed = frameFromCurrentAngle(object);
        camera.position.copy(framed.pos);
        controls.target.copy(framed.look);
        controls.update();
        cameraTween = null;
        return;
      }
      const box = getWorldBox(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = THREE.MathUtils.degToRad(camera.fov * 0.9);
      const portrait = isPortraitStage() || camera.aspect < 0.9;
      const frameDim = portrait
        ? Math.max(size.y * 1.35, size.x * 0.45, size.z * 0.45)
        : maxDim;
      const distScale = portrait ? 2.05 : 1.28;
      const dist = (frameDim / (2 * Math.tan(fov * 0.5))) * distScale;
      const xOff = portrait ? 0 : dist * 0.36;
      const yOff = portrait ? dist * 0.16 : dist * 0.16;
      camera.position.set(center.x + xOff, center.y + yOff, center.z + dist);
      controls.target.set(center.x, center.y + size.y * 0.04, center.z);
      controls.update();
      cameraTween = null;
    }

    function nudgeZoom(direction) {
      const live = getLiveArtifact();
      if (live) fitOrbitLimits(live);
      if (direction > 0 && live) {
        frameRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = frameRaycaster.intersectObject(live, true);
        if (hits[0]) controls.target.lerp(hits[0].point, 0.22);
      }
      dollyByFactor(direction > 0 ? 0.72 : 1.38);
    }

    function inspectAtPointer(clientX, clientY) {
      pauseAutoOrbit();
      cameraTween = null;
      const rect = renderer.domElement.getBoundingClientRect();
      framePointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      framePointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      frameRaycaster.setFromCamera(framePointer, camera);
      const hits = frameRaycaster.intersectObject(getLiveArtifact(), true);
      const look = hits[0] ? hits[0].point.clone() : controls.target.clone();
      const view = new THREE.Vector3();
      camera.getWorldDirection(view);
      const current = camera.position.distanceTo(look);
      const closer = hits[0]
        ? Math.max(controls.minDistance * 1.6, hits[0].distance * 0.38)
        : Math.max(controls.minDistance * 1.6, current * 0.52);
      tweenCamera(look.clone().addScaledVector(view, -closer), look, 720);
    }

    function pickAssembledPart(point) {
      if (!assembledPartBody) return null;
      const box = getWorldBox(assembledPartBody);
      const t = (point.y - box.min.y) / Math.max(0.01, box.max.y - box.min.y);
      if (t > 0.78) return 'head';
      if (t > 0.52) return 'chest';
      if (t > 0.32) return 'thighs';
      if (t > 0.14) return 'legs';
      return 'feet';
    }

    function normalizePart(root, targetHeight) {
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scale.set(1, 1, 1);
      root.updateMatrixWorld(true);
      let box = getWorldBox(root);
      const center = new THREE.Vector3();
      box.getCenter(center);
      root.position.x += -center.x;
      root.position.z += -center.z;
      root.position.y += -box.min.y;
      root.updateMatrixWorld(true);
      box = getWorldBox(root);
      const h = Math.max(0.001, box.max.y - box.min.y);
      const s = targetHeight / h;
      root.scale.setScalar(s);
      root.position.multiplyScalar(s);
      root.updateMatrixWorld(true);
      box = getWorldBox(root);
      root.position.y += -box.min.y;
      root.updateMatrixWorld(true);
      return getWorldBox(root);
    }

    function getAltarDeckLocalY() {
      if (!altarModel) return -0.4;
      altarModel.updateMatrixWorld(true);
      const box = getWorldBox(altarModel);
      return artifactRoot.worldToLocal(new THREE.Vector3(0, box.max.y, 0)).y + 0.02;
    }

    function getAltarCenterXZ() {
      if (!altarModel) return new THREE.Vector3(0, 0, 0);
      altarModel.updateMatrixWorld(true);
      const box = getWorldBox(altarModel);
      const c = new THREE.Vector3();
      box.getCenter(c);
      return c;
    }

    let activeAssetKey = 'assembled';
    let currentSingleModel = null;
    const loadedGLTFScenes = {};
    // Models are big (4.5-9.5 MB decoded), so only a handful stay cached.
    // The boot pair (colossus + its 'full_body' alias) is permanent; everything
    // else is least-recently-used. Evicted models reload from the browser cache.
    const GLTF_LRU_CAP = 6;
    const GLTF_PERMANENT = { assembled: true, full_body: true };
    const gltfLruOrder = [];
    const gltfRecentlyShown = [];
    function rememberShownKey(key) {
      const i = gltfRecentlyShown.indexOf(key);
      if (i >= 0) gltfRecentlyShown.splice(i, 1);
      gltfRecentlyShown.push(key);
      if (gltfRecentlyShown.length > 3) gltfRecentlyShown.shift();
    }
    function isGltfEvictable(key) {
      return !GLTF_PERMANENT[key] && key !== activeAssetKey && gltfRecentlyShown.indexOf(key) === -1;
    }
    function disposeGltfScene(model) {
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
    function touchGltf(key) {
      const i = gltfLruOrder.indexOf(key);
      if (i >= 0) gltfLruOrder.splice(i, 1);
      gltfLruOrder.push(key);
    }
    function evictGltfs() {
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
    let explodeAmount = 0;
    let pedestalVisible = false;

    function syncDossierStudyLink(key) {
      const narStudyLink = document.getElementById('nar-study-link');
      if (!narStudyLink) return;
      const J = window.BAJourney;
      const sitting = J && typeof J.sittingForAsset === 'function' ? J.sittingForAsset(key) : -1;
      if (sitting >= 0 && J && typeof J.canAccessSheet === 'function' && !J.canAccessSheet(sitting)) {
        narStudyLink.hidden = true;
        return;
      }
      narStudyLink.hidden = false;
      if (lessonReturnHref) {
        narStudyLink.href = lessonReturnHref;
        narStudyLink.innerHTML = '<span>📖</span> ← Back to this lesson';
      } else {
        narStudyLink.href = `study.html?id=${key}`;
        narStudyLink.innerHTML = '<span>📖</span> Open Full Study Desk &amp; Quiz →';
      }
    }


    function syncDossierMapLink(key) {
      const narMapLink = document.getElementById('nar-map-link');
      if (!narMapLink) return;
      const y = MAP_YEAR_FOR_ASSET[key] || 'y605';
      const lessonQuery = lessonSheetSafe
        ? `&from=lesson&sheet=${encodeURIComponent(lessonSheetSafe)}`
        : '';
      narMapLink.href = `map.html?year=${y}${lessonQuery}`;
      const mapTopLink = document.getElementById('gallery-map-link');
      if (mapTopLink && lessonSheetSafe) {
        mapTopLink.href = `map.html?year=${y}&from=lesson&sheet=${encodeURIComponent(lessonSheetSafe)}`;
      }
      if (window.BAJourney) window.BAJourney.save({ artifact: key, year: y });
    }

    function syncDossierNarrative(data) {
      // Update Right Narrative Column
      const quote = document.getElementById('nar-scripture-quote');
      const ref = document.getElementById('nar-scripture-ref');
      const exp = document.getElementById('nar-explanation');
      const hist = document.getElementById('nar-historical');
      const plate = document.getElementById('nar-plate-img');
      const take = document.getElementById('nar-takeaway');
      if (quote) quote.textContent = data.quote;
      if (ref) ref.textContent = data.quoteRef;
      if (exp) exp.textContent = data.explanation;
      if (hist) hist.textContent = data.historical;
      if (plate && data.plateImg) {
        plate.src = data.plateImg;
        plate.alt = data.plateCaption || data.title;
      }
      const plateCap = document.getElementById('nar-plate-caption');
      if (plateCap) plateCap.textContent = data.plateCaption || '';
      if (take) take.textContent = data.takeaway;
    }

    function assetOpen(key) {
      const k = key === 'altar' ? 'assembled' : key;
      if (window.BAJourney && typeof window.BAJourney.canAccessAsset === 'function') {
        return window.BAJourney.canAccessAsset(k);
      }
      return k === 'assembled';
    }

    function selectAsset(key, opts = {}) {
      if (tourRunning && !opts.fromTour) stopArtifactTour(true);
      if (key === 'altar') key = 'assembled';
      if (!Object.prototype.hasOwnProperty.call(ASSET_REGISTRY, key)) return;
      if (!assetOpen(key)) {
        if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
          window.BAJourney.announceLock('asset', key);
        } else {
          museumToast('Finish the open sitting to view this artifact.');
        }
        return;
      }
      if (!opts.instant && key !== activeAssetKey) {
        if (selectAsset._busy) return;
        selectAsset._busy = true;
        AudioBus.play('whoosh');
        const trans = document.getElementById('stage-transition');
        const fadeMs = reducedMotion ? 0 : 180;
        if (trans && !reducedMotion) {
          trans.classList.remove('glitch');
          trans.classList.add('active', 'out');
        }
        setTimeout(() => {
          selectAsset(key, { instant: true, keepAngle: opts.keepAngle || userHasAimed, fromTour: opts.fromTour });
          if (trans && !reducedMotion) {
            trans.classList.remove('glitch', 'out');
            trans.classList.add('in');
            setTimeout(() => {
              trans.classList.remove('active', 'in');
              selectAsset._busy = false;
            }, fadeMs);
          } else {
            if (trans) trans.classList.remove('active', 'out', 'in', 'glitch');
            selectAsset._busy = false;
          }
        }, fadeMs);
        return;
      }

      activeAssetKey = key;
      rememberShownKey(key);
      if (window.Insights) window.Insights.track('gallery_view', null, { asset: key });
      const data = ASSET_REGISTRY[key] || ASSET_REGISTRY.head;
      setHallBackdrop(data.hallImg || HALL_BACKDROPS[key] || data.plateImg);
      setTimeout(() => {
        const at = artifactOrder.indexOf(key);
        [artifactOrder[at + 1], artifactOrder[at - 1]].forEach((near) => {
          const d = near && ASSET_REGISTRY[near];
          if (d) prefetchHall(d.hallImg || HALL_BACKDROPS[near] || d.plateImg);
        });
      }, 1500);
      AudioBus.play('select');
      document.querySelectorAll('.era-cell').forEach((el) => {
        el.classList.toggle('active', el.dataset.asset === key);
      });

      // Update Left Rail active state
      document.querySelectorAll('.artifact-card-item').forEach(el => {
        el.classList.toggle('active', el.dataset.asset === key);
      });
      const activeCard = document.querySelector('.artifact-card-item.active');
      if (activeCard && typeof activeCard.scrollIntoView === 'function') {
        activeCard.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
      }

      // Update Top Chrome
      const eyebrow = document.getElementById('hero-eyebrow');
      const title = document.getElementById('hero-main-title');
      const pill = document.getElementById('hero-scripture-pill');
      if (eyebrow) eyebrow.textContent = data.eyebrow;
      if (title) title.textContent = data.title;
      if (pill) pill.textContent = data.pill;

      syncDossierNarrative(data);
      [document.querySelector('.hero-title-group'), document.querySelector('.narrative-dossier')].forEach((node) => {
        if (!node || reducedMotion) return;
        node.classList.remove('cx-enter');
        void node.offsetWidth;
        node.classList.add('cx-enter');
      });

      syncDossierStudyLink(key);
      syncDossierMapLink(key);

      const idxEl = document.getElementById('exhibit-index');
      if (idxEl) {
        const i = Math.max(0, artifactOrder.indexOf(key));
        idxEl.textContent = `${i + 1} / ${artifactOrder.length}`;
      }
      const related = data.related || ['chest', 'thighs', 'legs', 'stone'];
      document.querySelectorAll('#related-avatars-row .related-avatar').forEach((btn, i) => {
        const rel = related[i];
        if (!rel || !ASSET_REGISTRY[rel]) return;
        btn.dataset.rel = rel;
        btn.title = ASSET_REGISTRY[rel].title;
        const img = btn.querySelector('img');
        if (img) {
          img.src = ASSET_REGISTRY[rel].thumb;
          img.alt = ASSET_REGISTRY[rel].title;
        }
      });
      document.querySelectorAll('#related-dots .dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === 0);
      });

      // Update Diagnostics
      const diagView = document.getElementById('diag-view');
      if (diagView) diagView.textContent = data.title;

      // Update Celestial Halo position (full reset so the head-view z-offset never leaks to other pieces)
      if (celestialHalo) {
        celestialHalo.position.set(0, data.haloY || 1.75, -2.4);
        const s = data.haloScale || 1.0;
        celestialHalo.scale.set(s, s, s);
      }

      // Rebuild Museum Nodes for this piece
      currentNodes = getNodeDataForAsset(key);
      soloFocusNodeId = null;
      rebuildNodeElements();
      syncNodes();

      const keepAngle = !!(opts.keepAngle || userHasAimed);

      // Smooth camera transition to optimal angle
      if (key === 'years1260') {
        autoSpin = false;
        const spinBtnPlaque = document.getElementById('btn-spin');
        if (spinBtnPlaque) {
          spinBtnPlaque.classList.remove('active');
          spinBtnPlaque.textContent = 'Auto Orbit: OFF';
        }
        const b360Plaque = document.getElementById('btn-museum-360');
        if (b360Plaque) b360Plaque.classList.remove('active');
      }
      if (data.camPos && data.lookAt && !opts.skipCamera && !data.autoFrame && !keepAngle) {
        autoSpin = false;
        const spinBtn = document.getElementById('btn-spin');
        if (spinBtn) {
          spinBtn.classList.remove('active');
          spinBtn.textContent = 'Auto Orbit: OFF';
        }
        const b360 = document.getElementById('btn-museum-360');
        if (b360) b360.classList.remove('active');
        const isPortrait = isPortraitStage() || window.innerWidth <= 768;
        const targetCam = isPortrait
          ? new THREE.Vector3(0, data.camPos[1], Math.max(data.camPos[2] * 1.12, 6.2))
          : new THREE.Vector3(...data.camPos);
        const targetLook = isPortrait
          ? new THREE.Vector3(0, data.lookAt[1], data.lookAt[2])
          : new THREE.Vector3(...data.lookAt);
        if (opts.instant) {
          camera.position.copy(targetCam);
          controls.target.copy(targetLook);
          controls.update();
          cameraTween = null;
        } else {
          tweenCamera(targetCam, targetLook, 1100);
        }
      }

      const stillStage = document.getElementById('still-stage');
      const stillImg = document.getElementById('still-stage-img');
      if (data.still) {
        assembledContainer.visible = false;
        singleModelContainer.visible = false;
        altarPlatformGroup.visible = false;
        if (stillImg) {
          stillImg.src = data.still;
          stillImg.alt = data.title;
        }
        if (stillStage) stillStage.hidden = false;
        if (!loadProgress.heroAssetCounted) {
          loadProgress.heroAssetCounted = true;
          loadProgress.loadedCount++;
          loadProgress.label = `${data.title} ready`;
          updateLoadingUI();
        }
        updateTriangleReadout();
        return;
      }
      if (stillStage) stillStage.hidden = true;

      // Display Scene Mesh
      if (key === 'assembled') {
        singleModelContainer.visible = false;
        assembledContainer.visible = true;
        altarPlatformGroup.visible = altarVisible;
        setupAssembledColossus();
        if (assembledBuilt) {
          fitOrbitLimits(assembledContainer);
          if (keepAngle && !opts.skipCamera) applyKeepAngleCamera(assembledContainer, opts.instant);
        }
        return;
      }

      // Individual assets (head, chest, thighs, legs, feet) stand on their own
      assembledContainer.visible = false;
      singleModelContainer.visible = true;
      altarPlatformGroup.visible = false;

      loadGLBAsset(key, (sceneObj) => {
        if (key !== activeAssetKey) return;
        releaseExhibitMaterials(singleModelContainer);
        singleModelContainer.clear();
        currentSingleModel = sceneObj;
        normalizePart(currentSingleModel, data.targetHeight || 2.35);
        if (data.yaw) {
          currentSingleModel.rotation.y = data.yaw;
          currentSingleModel.updateMatrixWorld(true);
        }
        let b = getWorldBox(currentSingleModel);
        let bc = new THREE.Vector3();
        b.getCenter(bc);
        const stageY = data.stageY != null ? data.stageY : 1.10;
        currentSingleModel.position.y += (stageY - bc.y);
        currentSingleModel.position.x += -bc.x;
        currentSingleModel.position.z += -bc.z;
        if (data.organic) {
          currentSingleModel.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if ('metalness' in mat) mat.metalness = Math.min(mat.metalness ?? 1, 0.16);
              if ('envMapIntensity' in mat) mat.envMapIntensity = 0.72;
              mat.needsUpdate = true;
            });
          });
        }
        singleModelContainer.add(currentSingleModel);
        applyStudyModeToMeshes(singleModelContainer);
        updateTriangleReadout();
        if (key === 'head') {
          celestialHalo.position.set(0, 1.28, -1.05);
        }
        fitOrbitLimits(currentSingleModel);
        if (keepAngle) applyKeepAngleCamera(currentSingleModel, opts.instant);
        else if (data.autoFrame) frameLoadedModel(currentSingleModel);
      });
    }

    function countTriangles(root) {
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

    function updateTriangleReadout() {
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
    function loadGLB(url, onLoad, onError, timeoutMs = 45000, onSlow) {
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
    function cloneExhibit(model) {
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

    async function loadGLBAsset(key, onLoaded) {
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

    // --- ASSEMBLED PROPHETIC COLOSSUS BUILDER ---
    let assembledBuilt = false;
    let assembledPartBody = null;

    function buildAssembledHierarchy() {
      const fullBodySource = loadedGLTFScenes['assembled'] || loadedGLTFScenes['full_body'];
      if (!fullBodySource) return;

      releaseExhibitMaterials(assembledContainer);
      assembledContainer.clear();
      const fullBody = cloneExhibit(fullBodySource);

      normalizePart(fullBody, 3.55);

      const deckY = getAltarDeckLocalY();
      const altarCenter = getAltarCenterXZ();

      fullBody.updateMatrixWorld(true);
      let box = getWorldBox(fullBody);
      const desiredWorldBottom = artifactRoot.localToWorld(new THREE.Vector3(0, deckY, 0)).y;
      fullBody.position.y += (desiredWorldBottom - box.min.y) + 0.22;
      fullBody.updateMatrixWorld(true);
      box = getWorldBox(fullBody);
      const c = new THREE.Vector3();
      box.getCenter(c);
      fullBody.position.x += (altarCenter.x - c.x);
      fullBody.position.z += (altarCenter.z - c.z);
      fullBody.updateMatrixWorld(true);

      fullBody.userData.baseY = fullBody.position.y;
      assembledPartBody = fullBody;

      fullBody.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (!child.userData.origMat && child.material && typeof child.material.clone === 'function') {
            child.userData.origMat = child.material.clone();
          }
          if (child.material) {
            child.material.envMapIntensity = 1.5;
            child.material.needsUpdate = true;
          }
        }
      });

      assembledContainer.add(fullBody);
      assembledBuilt = true;
      applyStudyModeToMeshes(assembledContainer);
      updateTriangleReadout();
      fitOrbitLimits(assembledContainer);
      if (activeAssetKey === 'assembled' && userHasAimed) {
        applyKeepAngleCamera(assembledContainer, true);
      }

      if (!loadProgress.heroAssetCounted) {
        loadProgress.heroAssetCounted = true;
        loadProgress.loadedCount++;
        loadProgress.label = 'Experience Ready';
        updateLoadingUI();
      }
    }

    function setupAssembledColossus() {
      loadGLBAsset('assembled', () => {
        buildAssembledHierarchy();
      });
    }

    // Load Azure Altar Dais
    loadGLB(
      MODELS_PREFIX + 'azure_altar.glb',
      (gltf) => {
        altarModel = gltf.scene;
        altarModel.position.set(0, 0, 0);
        altarModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material && typeof child.material.clone === 'function') {
              child.userData.origMat = child.material.clone();
            }
            if (child.material) {
              child.material.envMapIntensity = 1.4;
            }
          }
        });
        altarPlatformGroup.add(altarModel);
        altarModel.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(altarModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetWidth = 2.8;
        const s = targetWidth / Math.max(size.x, size.z, 0.001);
        altarModel.scale.setScalar(s);
        altarModel.updateMatrixWorld(true);

        const newBox = new THREE.Box3().setFromObject(altarModel);
        altarModel.position.y += (-1.46) - newBox.min.y;
        const c = new THREE.Vector3();
        newBox.getCenter(c);
        altarModel.position.x -= c.x;
        altarModel.position.z -= c.z;

        dais.visible = pedestalVisible;

        if (activeAssetKey === 'assembled') {
          buildAssembledHierarchy();
        }

        loadProgress.loadedCount++;
        loadProgress.label = 'Altar mounted, finalizing…';
        updateLoadingUI();
        updateTriangleReadout();
      },
      () => {
        loadProgress.loadedCount++;
        loadProgress.label = 'Altar missing — using fallback dais';
        updateLoadingUI();
      }
    );


    // --- STUDY RENDER MODES ---
    let activeStudyMode = 'gold';
    applyChiaroscuroRig(false);
    function disposeMaterial(mat) {
      if (!mat) return;
      if (Array.isArray(mat)) {
        mat.forEach(disposeMaterial);
        return;
      }
      if (typeof mat.dispose === 'function') mat.dispose();
    }
    function replaceMeshMaterial(child, nextMat) {
      const prev = child.material;
      const ownsPrev = !!child.userData.ownsMaterial;
      if (ownsPrev && prev && prev !== child.userData.origMat && prev !== nextMat) {
        disposeMaterial(prev);
      }
      child.material = nextMat;
      child.userData.ownsMaterial = true;
    }
    function releaseExhibitMaterials(rootObj) {
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
    function applyStudyModeToMeshes(rootObj) {
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

    function setStudyMode(mode) {
      activeStudyMode = mode;
      applyChiaroscuroRig(mode === 'lighting');
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      if (assembledContainer.visible) applyStudyModeToMeshes(assembledContainer);
      if (singleModelContainer.visible) applyStudyModeToMeshes(singleModelContainer);
      museumToast(`Render Mode: ${mode === 'lighting' ? 'CHIAROSCURO' : mode.toUpperCase()}`);
      if (window.Insights) window.Insights.track('gallery_mode', null, { mode: mode });
    }
    document.querySelectorAll('[data-mode]').forEach(b => {
      b.addEventListener('click', () => setStudyMode(b.dataset.mode));
    });

    // --- CAMERA TWEEN ---
    function tweenCamera(targetPos, targetLook, duration = 1000) {
      const startPos = camera.position.clone();
      const startLook = controls.target.clone();
      const startTime = performance.now();
      cameraTween = {
        update(now) {
          const progress = Math.min((now - startTime) / duration, 1.0);
          const t = 0.5 - 0.5 * Math.cos(progress * Math.PI);
          camera.position.lerpVectors(startPos, targetPos, t);
          controls.target.lerpVectors(startLook, targetLook, t);
          if (progress >= 1.0) cameraTween = null;
        }
      };
    }

    // --- CONTROLS & WIRING ---
    autoSpin = !reducedMotion;

    // Artifact items click
    document.querySelectorAll('.artifact-card-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('is-locked')) AudioBus.play('tick');
      });
      item.addEventListener('click', () => {
        if (item.classList.contains('is-locked')) {
          if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
            window.BAJourney.announceLock('asset', item.dataset.asset);
          } else {
            museumToast('Finish the open sitting to view this artifact.');
          }
          return;
        }
        selectAsset(item.dataset.asset);
      });
    });

    function applyJourneyUnlocks() {
      document.querySelectorAll('.artifact-card-item').forEach((card) => {
        const open = assetOpen(card.dataset.asset);
        card.classList.toggle('is-locked', !open);
        card.classList.remove('has-sermon');
        card.setAttribute('aria-disabled', open ? 'false' : 'true');
        card.tabIndex = 0;
        if (!open && window.BAJourney && typeof window.BAJourney.lockExplain === 'function') {
          const note = window.BAJourney.lockExplain('asset', card.dataset.asset);
          card.title = note.title + ' — ' + note.body;
        } else {
          card.removeAttribute('title');
        }
      });
      document.querySelectorAll('.related-avatar').forEach((el) => {
        const open = assetOpen(el.dataset.rel);
        el.hidden = false;
        el.disabled = false;
        el.classList.toggle('is-locked', !open);
      });
      document.querySelectorAll('.era-cell, .timeline-item').forEach((el) => {
        const key = el.dataset.asset;
        if (!key) return;
        const open = assetOpen(key);
        el.classList.toggle('is-locked', !open);
        el.setAttribute('aria-disabled', open ? 'false' : 'true');
        if (!open && window.BAJourney && typeof window.BAJourney.lockExplain === 'function') {
          const note = window.BAJourney.lockExplain('asset', key);
          el.title = note.title + ' — ' + note.body;
        } else if (open) {
          el.removeAttribute('title');
        }
      });
      currentNodes = getNodeDataForAsset(activeAssetKey);
      rebuildNodeElements();
      syncNodes();
    }
    applyJourneyUnlocks();
    window.addEventListener('storage', (ev) => {
      if (ev.key === 'baJourney') applyJourneyUnlocks();
    });
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(applyJourneyUnlocks);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(applyJourneyUnlocks);
    }

    // Related avatar circles click
    document.querySelectorAll('.related-avatar').forEach(item => {
      item.addEventListener('click', () => {
        if (!assetOpen(item.dataset.rel)) {
          if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
            window.BAJourney.announceLock('asset', item.dataset.rel);
          } else {
            museumToast('Finish the open sitting to view this artifact.');
          }
          return;
        }
        selectAsset(item.dataset.rel);
      });
    });

    function openArtifactKeys() {
      return artifactOrder.filter(assetOpen);
    }
    function stepArtifact(dir) {
      const open = openArtifactKeys();
      if (!open.length) return;
      let idx = open.indexOf(activeAssetKey);
      if (idx < 0) idx = 0;
      idx = (idx + dir + open.length) % open.length;
      selectAsset(open[idx]);
    }
    document.getElementById('btn-prev-artifact').addEventListener('click', () => stepArtifact(-1));
    document.getElementById('btn-next-artifact').addEventListener('click', () => stepArtifact(1));

    // Bottom action bar
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomFit = document.getElementById('btn-zoom-fit');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        nudgeZoom(1);
        AudioBus.play('click');
      });
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        nudgeZoom(-1);
        AudioBus.play('click');
      });
    }
    if (btnZoomFit) {
      btnZoomFit.addEventListener('click', () => {
        pauseAutoOrbit();
        const live = getLiveArtifact();
        if (live) applyKeepAngleCamera(live, false);
        AudioBus.play('click');
        museumToast('Fit artifact from this angle');
      });
    }

    const btn360 = document.getElementById('btn-museum-360');
    if (btn360) {
      btn360.addEventListener('click', () => {
        autoSpin = !autoSpin;
        btn360.classList.toggle('active', autoSpin);
        const spinBtn = document.getElementById('btn-spin');
        if (spinBtn) {
          spinBtn.classList.toggle('active', autoSpin);
          spinBtn.textContent = autoSpin ? 'Auto Orbit: ON' : 'Auto Orbit: OFF';
        }
        AudioBus.play('click');
        museumToast(autoSpin ? '360° Auto Orbit: ON' : '360° Auto Orbit: OFF');
      });
    }

    const sheetBodyEl = document.getElementById('museum-nodes-sheet-body');
    if (sheetBodyEl) {
      sheetBodyEl.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-node]');
        if (b) handleNodeClick(b.dataset.node);
      });
    }
    let tourRunning = false;
    let tourTimer = 0;
    function stopArtifactTour(announce) {
      if (!tourRunning) return;
      tourRunning = false;
      clearTimeout(tourTimer);
      tourTimer = 0;
      if (announce) museumToast('Tour stopped');
    }
    function startArtifactTour() {
      if (tourRunning) {
        stopArtifactTour(true);
        return;
      }
      tourRunning = true;
      let i = 0;
      const order = openArtifactKeys().filter((k) => k !== 'altar');
      const step = () => {
        if (!tourRunning) return;
        if (i >= order.length) { tourRunning = false; museumToast('Tour complete'); return; }
        if (selectAsset._busy) {
          tourTimer = setTimeout(step, TOUR_BUSY_RETRY_MS);
          return;
        }
        selectAsset(order[i], { fromTour: true });
        i += 1;
        tourTimer = setTimeout(step, reducedMotion ? 400 : 2800);
      };
      museumToast('Guided artifact tour · press T or Esc to stop');
      step();
    }
    window.addEventListener('keydown', (e) => {
      if (e.key !== 't' && e.key !== 'T') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(e.target && e.target.isContentEditable);
      if (typing) return;
      startArtifactTour();
    });

    // Study Lab Drawer toggle
    const labDrawer = document.getElementById('study-lab-drawer');
    const btnOpenLab = document.getElementById('btn-open-lab');
    const btnCloseLab = document.getElementById('btn-close-lab');
    if (btnOpenLab && labDrawer) {
      btnOpenLab.addEventListener('click', () => labDrawer.classList.toggle('open'));
    }
    if (btnCloseLab && labDrawer) {
      btnCloseLab.addEventListener('click', () => labDrawer.classList.remove('open'));
    }

    function setExplode(pct) {
      explodeAmount = Math.max(0, Math.min(1, pct / 100));
      const slider = document.getElementById('explode-slider');
      const label = document.getElementById('explode-val');
      const toggle = document.getElementById('btn-explode-toggle');
      if (slider && Number(slider.value) !== pct) slider.value = String(pct);
      if (label) label.textContent = pct <= 0 ? '0% (Assembled)' : `${pct}% lift`;
      if (toggle) {
        toggle.classList.toggle('active', pct > 0);
        toggle.textContent = pct > 0 ? 'Lift from Altar: ON' : 'Lift from Altar';
      }
    }
    const explodeSlider = document.getElementById('explode-slider');
    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        setExplode(Number(e.target.value));
      });
    }
    const btnExplodeToggle = document.getElementById('btn-explode-toggle');
    if (btnExplodeToggle) {
      btnExplodeToggle.addEventListener('click', () => {
        setExplode(explodeAmount > 0.05 ? 0 : 80);
      });
    }
    const btnPedestal = document.getElementById('btn-pedestal-toggle');
    if (btnPedestal) {
      btnPedestal.addEventListener('click', () => {
        pedestalVisible = !pedestalVisible;
        dais.visible = pedestalVisible;
        btnPedestal.classList.toggle('active', pedestalVisible);
        btnPedestal.textContent = pedestalVisible ? 'Old Pedestal: ON' : 'Old Pedestal: OFF';
      });
    }
    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', (e) => {
        const pct = Number(e.target.value);
        brightnessScale = pct / 100;
        applyExposure();
        const label = document.getElementById('brightness-val');
        if (label) label.textContent = `${pct}%`;
      });
    }
    const btnDust = document.getElementById('btn-dust');
    if (btnDust) {
      btnDust.addEventListener('click', () => {
        dustEnabled = !dustEnabled;
        dustPoints.visible = dustEnabled;
        btnDust.classList.toggle('active', dustEnabled);
        btnDust.textContent = dustEnabled ? 'Golden Dust: ON' : 'Golden Dust: OFF';
      });
    }

    // Altar toggle
    const btnAltarToggle = document.getElementById('btn-altar-toggle');
    if (btnAltarToggle) {
      btnAltarToggle.addEventListener('click', () => {
        altarVisible = !altarVisible;
        altarPlatformGroup.visible = altarVisible;
        btnAltarToggle.classList.toggle('active', altarVisible);
        btnAltarToggle.textContent = altarVisible ? 'Altar Dais: ON' : 'Altar Dais: OFF';
      });
    }

    // Torches toggle
    const btnTorch = document.getElementById('btn-torch');
    if (btnTorch) {
      btnTorch.addEventListener('click', () => {
        torchesEnabled = !torchesEnabled;
        torch1.visible = torchesEnabled;
        torch2.visible = torchesEnabled;
        btnTorch.classList.toggle('active', torchesEnabled);
        btnTorch.textContent = torchesEnabled ? 'Palace Torches: ON' : 'Palace Torches: OFF';
      });
    }

    // Auto spin button in lab
    const btnSpin = document.getElementById('btn-spin');
    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        autoSpin = !autoSpin;
        btnSpin.classList.toggle('active', autoSpin);
        btnSpin.textContent = autoSpin ? 'Auto Orbit: ON' : 'Auto Orbit: OFF';
        if (btn360) btn360.classList.toggle('active', autoSpin);
      });
    }

    // Camera presets in lab
    document.querySelectorAll('[data-cam]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cam = btn.dataset.cam;
        autoSpin = false;
        if (btnSpin) { btnSpin.classList.remove('active'); btnSpin.textContent = 'Auto Orbit: OFF'; }
        if (btn360) btn360.classList.remove('active');

        userHasAimed = true;
        const cur = ASSET_REGISTRY[activeAssetKey] || ASSET_REGISTRY.assembled;
        const fy = cur.lookAt ? cur.lookAt[1] : 1.2;
        const fz = (activeAssetKey === 'assembled') ? 9.2 : 5.2;

        if (cam === 'front') tweenCamera(new THREE.Vector3(0, fy + 0.3, fz), new THREE.Vector3(0, fy, 0));
        else if (cam === 'threeq') tweenCamera(new THREE.Vector3(fz * 0.7, fy + 0.4, fz * 0.7), new THREE.Vector3(0, fy, 0));
        else if (cam === 'profile') tweenCamera(new THREE.Vector3(fz, fy + 0.2, 0), new THREE.Vector3(0, fy, 0));
        else if (cam === 'back') tweenCamera(new THREE.Vector3(0, fy + 0.3, -fz), new THREE.Vector3(0, fy, 0));
        else if (cam === 'colossus') tweenCamera(new THREE.Vector3(0, 2.3, 8.8), new THREE.Vector3(0, 1.8, 0));
        else if (cam === 'altar') tweenCamera(new THREE.Vector3(0, 0.5, 4.6), new THREE.Vector3(0, -0.2, 0));
        else if (cur.camPos && cur.lookAt) tweenCamera(new THREE.Vector3(...cur.camPos), new THREE.Vector3(...cur.lookAt));
      });
    });

    // Golden dust particles
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 8.0;
      dustPositions[i + 1] = Math.random() * 5.0 - 1.2;
      dustPositions[i + 2] = (Math.random() - 0.5) * 8.0;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffd678, size: 0.035, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);
    let dustEnabled = !reducedMotion;
    dustPoints.visible = dustEnabled;
    if (btnDust) {
      btnDust.classList.toggle('active', dustEnabled);
      btnDust.textContent = dustEnabled ? 'Golden Dust: ON' : 'Golden Dust: OFF';
    }

    let resizeQueued = false;
    window.addEventListener('resize', () => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(applyResize);
    });
    function applyResize() {
      resizeQueued = false;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (museumComposer) museumComposer.setSize(window.innerWidth, window.innerHeight);
      if (window.innerWidth > 1024) {
        document.body.classList.remove('rail-open', 'narrative-open');
      }
      const framed = ASSET_REGISTRY[activeAssetKey];
      if (framed?.autoFrame && currentSingleModel) frameLoadedModel(currentSingleModel);
      if (galleryFrameGroup) galleryFrameGroup.visible = !isPortraitStage();
      syncNodes();
    }

    const btnBrand = document.getElementById('btn-brand-home');
    if (btnBrand) btnBrand.addEventListener('click', () => {
      closeAllPanels();
      setNavActive('artifacts');
      selectAsset('assembled');
    });
    const btnBack = document.getElementById('btn-back-collection');
    if (btnBack) btnBack.addEventListener('click', () => {
      closeAllPanels();
      setNavActive('artifacts');
      selectAsset('assembled');
      museumToast('Collection · Complete Colossus');
    });
    function toggleRail() {
      const open = !document.body.classList.contains('rail-open');
      document.body.classList.remove('narrative-open', 'modal-open');
      document.body.classList.toggle('rail-open', open);
    }
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', toggleRail);
    const btnMenuFab = document.getElementById('btn-menu-fab');
    if (btnMenuFab) btnMenuFab.addEventListener('click', toggleRail);
    const btnToggleNarrative = document.getElementById('btn-toggle-narrative');
    if (btnToggleNarrative) {
      btnToggleNarrative.addEventListener('click', () => {
        const open = !document.body.classList.contains('narrative-open');
        document.body.classList.remove('rail-open', 'modal-open');
        document.body.classList.toggle('narrative-open', open);
      });
    }
    const scrim = document.getElementById('scrim');
    if (scrim) scrim.addEventListener('click', closeAllPanels);

    [['btn-theme-toggle', 'sun'], ['btn-scripture-modal', 'book'], ['btn-nodes-master', 'nodes'], ['btn-titles-toggle', 'title'], ['btn-open-lab', 'lab'], ['btn-menu', 'menu']].forEach(([id, icon]) => {
      const b = document.getElementById(id);
      if (b) b.innerHTML = ICONS[icon];
    });
    const stageEl = document.getElementById('webgl-container');
    const hintDone = () => document.body.classList.add('hint-done');
    if (stageEl) stageEl.addEventListener('pointerdown', hintDone, { once: true });
    setTimeout(hintDone, 9000);

    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const cool = document.documentElement.classList.toggle('theme-cool');
        scene.background.set(cool ? 0x05070c : 0x050301);
        scene.fog.color.set(cool ? 0x05070c : 0x050301);
        hallUniforms.cool.value = cool ? 1 : 0;
        hemiLight.color.set(cool ? 0xc9e0ff : 0xffe8c2);
        btnTheme.innerHTML = cool ? ICONS.moon : ICONS.sun;
        btnTheme.classList.toggle('active', cool);
        museumToast(cool ? 'Cool gallery tone' : 'Warm palace tone');
      });
    }
    const btnScripture = document.getElementById('btn-scripture-modal');
    if (btnScripture) btnScripture.addEventListener('click', () => {
      AudioBus.play('panel');
      openScriptureModal();
    });
    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.classList.toggle('active', AudioBus.muted);
      btnMute.innerHTML = AudioBus.muted ? ICONS.muted : ICONS.sound;
      btnMute.title = AudioBus.muted ? 'Unmute gallery sound' : 'Mute gallery sound';
      btnMute.setAttribute('aria-label', AudioBus.muted ? 'Unmute sound' : 'Mute sound');
      btnMute.addEventListener('click', () => {
        AudioBus.unlock();
        AudioBus.muted = !AudioBus.muted;
        // The sampled arena notification lives on its own bus; keep the one
        // mute control authoritative for both.
        if (window.UiSound) window.UiSound.enabled = !AudioBus.muted;
        btnMute.classList.toggle('active', AudioBus.muted);
        btnMute.innerHTML = AudioBus.muted ? ICONS.muted : ICONS.sound;
        btnMute.title = AudioBus.muted ? 'Unmute gallery sound' : 'Mute gallery sound';
        if (!AudioBus.muted) AudioBus.play('click');
      });
    }

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        setNavActive(nav);
        if (nav === 'discover' || nav === 'artifacts') {
          closeAllPanels();
          if (nav === 'discover') selectAsset('assembled');
          if (window.innerWidth <= 1024) document.body.classList.add('rail-open');
        } else if (nav === 'timeline') {
          closeAllPanels();
          document.body.classList.toggle('timeline-mode');
          setNavActive(document.body.classList.contains('timeline-mode') ? 'timeline' : 'artifacts');
          AudioBus.play('panel');
          museumToast(document.body.classList.contains('timeline-mode') ? 'Timeline wing' : 'Gallery floor');
        } else if (nav === 'kingdoms') {
          closeAllPanels();
          document.body.classList.add('timeline-mode');
          selectAsset('assembled');
          museumToast('Kingdoms in procession');
        } else if (nav === 'about') {
          openAboutModal();
        }
      });
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.removeAttribute('readonly');
      searchInput.addEventListener('input', () => filterArtifacts(searchInput.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const visible = [...document.querySelectorAll('.artifact-card-item')].find((c) => c.style.display !== 'none');
          if (visible) selectAsset(visible.dataset.asset);
        }
      });
    }

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', closeAllPanels);
    });
    document.querySelectorAll('#timeline-modal [data-asset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeAllPanels();
        selectAsset(btn.dataset.asset);
      });
    });

    const btnLoadContinue = document.getElementById('btn-load-continue');
    if (btnLoadContinue) btnLoadContinue.addEventListener('click', hideLoadingOverlay);

    if (btn360 && reducedMotion) {
      autoSpin = false;
      btn360.classList.remove('active');
    }
    const spinInit = document.getElementById('btn-spin');
    if (spinInit && reducedMotion) {
      spinInit.classList.remove('active');
      spinInit.textContent = 'Auto Orbit: OFF';
    }

    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        stopArtifactTour(true);
        closeAllPanels();
        return;
      }
      if (typing) return;
      if (e.key === '/' ) {
        e.preventDefault();
        if (searchInput) searchInput.focus();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        nudgeZoom(1);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        nudgeZoom(-1);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const live = getLiveArtifact();
        if (live) applyKeepAngleCamera(live, false);
        return;
      }
      if (e.key === 'ArrowRight') document.getElementById('btn-next-artifact')?.click();
      if (e.key === 'ArrowLeft') document.getElementById('btn-prev-artifact')?.click();
      if (e.key === 'n' || e.key === 'N') btnNodesMaster?.click();
      if (e.key === 'l' || e.key === 'L') {
        labDrawer?.classList.toggle('open');
      }
      if (e.key >= '1' && e.key <= '9') {
        const pick = openArtifactKeys()[Number(e.key) - 1];
        if (pick) selectAsset(pick);
      }
      if (e.key === '0') {
        const pick = openArtifactKeys()[9];
        if (pick) selectAsset(pick);
      }
    });

    // --- ANIMATION & RENDER LOOP ---
    const clock = new THREE.Clock();
    let frameCount = 0;
    let lastFpsTime = performance.now();
    const relCam = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const azEl = document.getElementById('diag-azimuth');
    const elEl = document.getElementById('diag-elevation');
    const fpsEl = document.getElementById('diag-fps');
    let lastAzText = '';
    let lastElText = '';

    /* Hidden-tab gating: browsers throttle rAF in background tabs, but the loop
       still wakes for every throttle tick — stop it outright and restart on
       return, flushing the clock so the first frame back has no dt spike. */
    let rafPaused = false;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && rafPaused) {
        rafPaused = false;
        clock.getDelta();
        requestAnimationFrame(animate);
      }
    });

    function animate(now) {
      if (document.hidden) {
        rafPaused = true;
        return;
      }
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (cameraTween) cameraTween.update(now);

      if (autoSpin && !cameraTween && !reducedMotion) {
        artifactRoot.rotation.y += dt * 0.12;
      }

      const mix = hallUniforms.mixAmt.value;
      hallUniforms.mixAmt.value = mix + (hallMixTarget - mix) * Math.min(1, dt * (reducedMotion ? 12 : 3.4));


      if (assembledPartBody && assembledPartBody.userData.baseY != null) {
        assembledPartBody.position.y = assembledPartBody.userData.baseY + explodeAmount * 1.6;
      }

      if (torchesEnabled && !reducedMotion) {
        const f1 = 1.0 + 0.07 * Math.sin(elapsed * 2.3) + 0.04 * Math.sin(elapsed * 5.9 + 1.3) + 0.02 * Math.sin(elapsed * 13.1);
        const f2 = 1.0 + 0.07 * Math.cos(elapsed * 2.7 + 0.8) + 0.04 * Math.cos(elapsed * 6.4) + 0.02 * Math.sin(elapsed * 11.7 + 2.1);
        torch1.intensity = torchBase.a * f1;
        torch2.intensity = torchBase.b * f2;
      }

      if (dustEnabled) {
        const pos = dustGeo.attributes.position;
        for (let i = 0; i < dustCount; i++) {
          let y = pos.getY(i) + dt * 0.05;
          if (y > 4.5) y = -1.5;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      controls.update();
      const focusDist = camera.position.distanceTo(controls.target);
      const nextNear = THREE.MathUtils.clamp(focusDist * 0.025, 0.012, 0.35);
      const nextFar = Math.max(140, focusDist * 24);
      if (Math.abs(camera.near - nextNear) > 0.004 || Math.abs(camera.far - nextFar) > 2) {
        camera.near = nextNear;
        camera.far = nextFar;
        camera.updateProjectionMatrix();
      }

      // Live scene diagnostics
      relCam.copy(camera.position).sub(controls.target);
      relCam.applyAxisAngle(upAxis, -artifactRoot.rotation.y);
      const azimuthDeg = THREE.MathUtils.radToDeg(Math.atan2(relCam.x, relCam.z));
      const elevLen = relCam.length();
      const elevationDeg = elevLen > 1e-6
        ? THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(relCam.y / elevLen, -1, 1)))
        : 0;

      const azText = `${azimuthDeg.toFixed(1)}°`;
      const elText = `${elevationDeg.toFixed(1)}°`;
      if (azEl && azText !== lastAzText) { azEl.textContent = azText; lastAzText = azText; }
      if (elEl && elText !== lastElText) { elEl.textContent = elText; lastElText = elText; }

      frameCount++;
      if (now - lastFpsTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        if (fpsEl) fpsEl.textContent = `${fps} FPS`;
        frameCount = 0;
        lastFpsTime = now;
      }

      // Render Three.js scene
      if (museumComposer) {
        museumComposer.render();
      } else {
        renderer.render(scene, camera);
      }

      // Sync floating nodes position & dogleg lines
      if (masterNodesVisible || !nodesHiddenSynced) syncNodes();
    }

    // Initialize State: Check URL parameter (?asset=... or ?id=...) or default to 'assembled'
    const initialAssetKey = urlParams.get('asset') || urlParams.get('id');
    const requestedAsset = (initialAssetKey && Object.prototype.hasOwnProperty.call(ASSET_REGISTRY, initialAssetKey)) ? initialAssetKey : 'assembled';
    const startAsset = assetOpen(requestedAsset) ? requestedAsset : (openArtifactKeys()[0] || 'assembled');
    if (requestedAsset !== startAsset) {
      if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
        window.BAJourney.announceLock('asset', requestedAsset);
      }
    }
    if (requestedAsset !== startAsset && history.replaceState) {
      try {
        const u = new URL(location.href);
        u.searchParams.set('asset', startAsset);
        history.replaceState(null, '', u.pathname + u.search);
      } catch (e) {}
    }

    if (lessonReturnHref) {
      const backBtn = document.getElementById('gallery-back-lesson');
      if (backBtn) {
        backBtn.href = lessonReturnHref;
        backBtn.style.display = 'inline-flex';
      }
      const genericStudy = document.getElementById('gallery-study-link');
      if (genericStudy) {
        genericStudy.style.display = 'none';
      }
      // gallery-map-link gets its year from syncDossierMapLink when the first asset is selected
    }

    rebuildNodeElements();
    buildEraTimeline();
    masterNodesVisible = false;
    if (btnNodesMaster) {
      btnNodesMaster.classList.remove('active');
      btnNodesMaster.title = 'Show annotation nodes';
    }
    selectAsset(startAsset, { instant: true, skipCamera: startAsset === 'assembled' });
    if (
      startAsset !== 'assembled' &&
      ASSET_REGISTRY[startAsset]?.camPos &&
      !ASSET_REGISTRY[startAsset]?.autoFrame
    ) {
      camera.position.set(...ASSET_REGISTRY[startAsset].camPos);
      controls.target.set(...ASSET_REGISTRY[startAsset].lookAt);
      controls.update();
    }
    animate(performance.now());

