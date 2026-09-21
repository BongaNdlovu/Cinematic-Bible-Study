import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
    import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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
      muted: false,
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
    window.__galleryCamera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('tabindex', '0');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D view of the Daniel 2 colossus');

    // Dynamic Room Environment map for rich metallic sheen
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.82;

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

    // --- PROCEDURAL SOFT-FOCUS STONE RELIEF HALL BACKDROP ---
    function createStoneReliefCanvas() {
      const c = document.createElement('canvas');
      c.width = 2048; c.height = 1024;
      const ctx = c.getContext('2d');

      // Base dark basalt gradient
      const bg = ctx.createLinearGradient(0, 0, 0, 1024);
      bg.addColorStop(0, '#15100b');
      bg.addColorStop(0.35, '#0e0906');
      bg.addColorStop(0.7, '#080503');
      bg.addColorStop(1, '#030202');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 2048, 1024);

      // Ashlar masonry course seams
      ctx.strokeStyle = 'rgba(210, 165, 90, 0.04)';
      ctx.lineWidth = 2;
      for (let y = 80; y < 1024; y += 110) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke();
        const row = Math.floor(y / 110);
        const offset = (row % 2) * 120;
        for (let x = offset; x < 2048; x += 240) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 110); ctx.stroke();
        }
      }

      // Mesopotamian palace frieze: Arches, Winged Bulls, Attendants & Rosettes
      const numBays = 8;
      const bayW = 2048 / numBays;
      for (let b = 0; b < numBays; b++) {
        const cx = b * bayW + bayW * 0.5;

        // Arched wall niche
        ctx.strokeStyle = 'rgba(230, 180, 100, 0.10)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, 340, 88, Math.PI, 0);
        ctx.lineTo(cx + 88, 860);
        ctx.lineTo(cx - 88, 860);
        ctx.closePath();
        ctx.stroke();

        if (b % 2 === 0) {
          // Winged Bull / Cherub silhouette
          ctx.save();
          ctx.translate(cx, 560);
          ctx.fillStyle = 'rgba(235, 190, 110, 0.08)';
          ctx.beginPath();
          ctx.ellipse(0, 60, 65, 38, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-50, 85, 14, 80);
          ctx.fillRect(-22, 85, 14, 80);
          ctx.fillRect(16, 85, 14, 80);
          ctx.fillRect(42, 85, 14, 80);
          ctx.beginPath();
          ctx.arc(45, 10, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(38, -25, 16, 18);
          ctx.beginPath();
          ctx.moveTo(-15, 40);
          ctx.quadraticCurveTo(-60, -80, -95, -110);
          ctx.quadraticCurveTo(-45, -60, -10, -30);
          ctx.quadraticCurveTo(20, -10, 30, 20);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          // Mesopotamian King/Attendant with libation vessel
          ctx.save();
          ctx.translate(cx, 540);
          ctx.fillStyle = 'rgba(235, 190, 110, 0.07)';
          ctx.beginPath();
          ctx.moveTo(-28, -20); ctx.lineTo(28, -20); ctx.lineTo(40, 180); ctx.lineTo(-40, 180);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath(); ctx.arc(0, -50, 20, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(-14, -85, 28, 20);
          ctx.fillRect(-10, -35, 20, 45);
          ctx.lineWidth = 9;
          ctx.strokeStyle = 'rgba(235, 190, 110, 0.07)';
          ctx.beginPath(); ctx.moveTo(15, -10); ctx.lineTo(55, -25); ctx.stroke();
          ctx.restore();
        }

        // Rosettes above niches
        ctx.fillStyle = 'rgba(240, 195, 105, 0.09)';
        for (let r = 0; r < 5; r++) {
          ctx.beginPath();
          ctx.arc(cx - 70 + r * 35, 190, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Soft focus gallery wash
      ctx.fillStyle = 'rgba(7, 5, 3, 0.45)';
      ctx.fillRect(0, 0, 2048, 1024);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(1.5, 1);
      return tex;
    }

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

    // Large atmospheric mural on the back wall — fills the black behind the small frames.
    const HALL_BACKDROPS = {
      assembled: 'assets/study/epochs/chronicle-babylon-dream.jpg',
      head: 'assets/study/babylon-sunset.jpg',
      chest: 'assets/study/epochs/persepolis.jpg',
      thighs: 'assets/maps/stops/athens.jpg',
      legs: 'assets/maps/stops/rome.jpg',
      feet: 'assets/hall/feet.jpg',
      altar: 'assets/plates/altar-dais.jpg',
      stone: 'assets/plates/stone-kingdom.jpg',
      lion: 'assets/plates/lion-procession.jpg',
      bear: 'assets/site/bear-painting.jpg',
      leopard: 'assets/plates/leopard-diadochi.jpg',
      beast: 'assets/study/epochs/papal-rome.jpg',
      years1260: 'assets/plates/years1260.jpg',
      ram: 'assets/plates/ram-ulai.jpg',
      goat: 'assets/plates/goat-charge.jpg',
      goat_broken: 'assets/plates/goat-broken.jpg',
      goat_horn: 'assets/plates/goat-horn.jpg',
      dura: 'assets/plates/dura-plain.jpg',
      ancient: 'assets/plates/ancient-throne.jpg',
      son: 'assets/plates/son-clouds.jpg',
      stump: 'assets/hall/stump.jpg',
      ox_king: 'assets/plates/ox-king.jpg',
      michael: 'assets/plates/michael.jpg',
      sealed: 'assets/plates/sealed.jpg',
      kings: 'assets/plates/kings.jpg',
      decree: 'assets/plates/decree.jpg'
    };
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
    let hallCurrentUrl = '';
    let hallSlot = 0;
    let hallMixTarget = 0;
    function prepHallTex(tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LINEAR_MIPMAP_LINEAR;
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
        if (hallCurrentUrl === url) apply(tex);
      });
    }
    Object.values(HALL_BACKDROPS).forEach((url) => {
      if (!url || hallTexCache.has(url)) return;
      texLoader.load(url, (tex) => {
        prepHallTex(tex);
        hallTexCache.set(url, tex);
      });
    });

    const galleryFrameGroup = new THREE.Group();
    scene.add(galleryFrameGroup);
    const WALL_FRAMES = [
      { img: 'assets/thumbs/lion.jpg', asset: 'lion', angle: -1.4, y: 2.15 },
      { img: 'assets/thumbs/head.jpg', asset: 'head', angle: -1.05, y: 2.35 },
      { img: 'assets/thumbs/chest.jpg', asset: 'chest', angle: -0.7, y: 2.55 },
      { img: 'assets/plates/babylon.jpg', asset: 'assembled', angle: -0.35, y: 2.7 },
      { img: 'assets/thumbs/thighs.jpg', asset: 'thighs', angle: 0.0, y: 2.65 },
      { img: 'assets/thumbs/legs.jpg', asset: 'legs', angle: 0.35, y: 2.55 },
      { img: 'assets/thumbs/feet.jpg', asset: 'feet', angle: 0.7, y: 2.4 },
      { img: 'assets/thumbs/stone.jpg', asset: 'stone', angle: 1.05, y: 2.3 },
      { img: 'assets/thumbs/bear.jpg', asset: 'bear', angle: 1.35, y: 2.15 },
      { img: 'assets/thumbs/leopard.jpg', asset: 'leopard', angle: 1.65, y: 2.05 },
      { img: 'assets/thumbs/beast.jpg', asset: 'beast', angle: 1.95, y: 1.95 },
      { img: 'assets/thumbs/years1260.jpg', asset: 'years1260', angle: 2.05, y: 1.88 },
      { img: 'assets/thumbs/ram.jpg', asset: 'ram', angle: -1.7, y: 2.0 },
      { img: 'assets/thumbs/goat.jpg', asset: 'goat', angle: 2.2, y: 1.9 },
      { img: 'assets/thumbs/dura.jpg', asset: 'dura', angle: -1.95, y: 1.9 },
      { img: 'assets/thumbs/ancient.jpg', asset: 'ancient', angle: 2.4, y: 1.85 },
      { img: 'assets/thumbs/ox_king.jpg', asset: 'ox_king', angle: -2.2, y: 1.8 },
      { img: 'assets/thumbs/michael.jpg', asset: 'michael', angle: 2.65, y: 1.8 },
      { img: 'assets/thumbs/sealed.jpg', asset: 'sealed', angle: -2.45, y: 1.72 },
      { img: 'assets/thumbs/kings.jpg', asset: 'kings', angle: 2.9, y: 1.72 },
      { img: 'assets/thumbs/decree.jpg', asset: 'decree', angle: -2.7, y: 1.68 }
    ];
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
    renderer.domElement.addEventListener('dblclick', (ev) => {
      ev.preventDefault();
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

    // --- CELESTIAL DISCOVERY GLOW DISC (HALO BEHIND PIECE) ---
    function createCelestialHaloTexture() {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 1024;
      const ctx = c.getContext('2d');
      const cx = 512, cy = 512;
      const radGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 480);
      radGlow.addColorStop(0, 'rgba(255, 220, 150, 0.22)');
      radGlow.addColorStop(0.28, 'rgba(210, 150, 60, 0.08)');
      radGlow.addColorStop(0.62, 'rgba(120, 70, 20, 0.03)');
      radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, 1024, 1024);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

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

    const galleryKeySpot = new THREE.SpotLight(0xfff3d2, 48, 22, Math.PI / 7.2, 0.38, 1.35);
    galleryKeySpot.position.set(2.4, 5.4, 4.2);
    galleryKeySpot.target.position.set(0, 1.2, 0);
    galleryKeySpot.castShadow = true;
    galleryKeySpot.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
    galleryKeySpot.shadow.bias = -0.0003;
    scene.add(galleryKeySpot);
    scene.add(galleryKeySpot.target);

    // Warm Amber Rim Spotlight from back-left
    const rimAmberSpot = new THREE.SpotLight(0xffc056, 28, 24, Math.PI / 4.4, 0.55, 1.05);
    rimAmberSpot.position.set(-4.2, 3.6, -3.4);
    rimAmberSpot.target.position.set(0, 1.25, 0);
    scene.add(rimAmberSpot);
    scene.add(rimAmberSpot.target);

    // Cool Lapis Contrast Fill Light
    const lapisFillLight = new THREE.PointLight(0x3a6cb8, 2.4, 16);
    lapisFillLight.position.set(-3.8, 1.4, 3.2);
    scene.add(lapisFillLight);

    // Flickering Palace Torches
    const torch1 = new THREE.PointLight(0xffaa33, 7.5, 11);
    torch1.position.set(-3.4, 2.0, 2.2);
    scene.add(torch1);

    const torch2 = new THREE.PointLight(0xff8822, 6.0, 11);
    torch2.position.set(3.4, 2.6, -1.8);
    scene.add(torch2);

    let torchesEnabled = true;

    function applyChiaroscuroRig(on) {
      ambientLight.intensity = on ? 0.08 : 0.18;
      hemiLight.intensity = on ? 0.16 : 0.28;
      galleryKeySpot.intensity = on ? 72 : 48;
      rimAmberSpot.intensity = on ? 38 : 28;
      lapisFillLight.intensity = on ? 1.4 : 2.4;
      scene.environmentIntensity = on ? 0.32 : 0.82;
      renderer.toneMappingExposure = on ? 1.05 : 1.12;
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

    const gltfLoader = new GLTFLoader();
    if (typeof MeshoptDecoder !== 'undefined') {
      gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    }

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
      tweenCamera(
        new THREE.Vector3(...data.camPos),
        new THREE.Vector3(...data.lookAt),
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

    // --- ASSET REGISTRY ---
    const ASSET_REGISTRY = {
      assembled: {
        id: 'assembled',
        eyebrow: 'PROPHETIC SUCCESSION OF EMPIRES',
        title: 'Complete Daniel 2 Colossus',
        pill: 'DANIEL 2:31-45',
        dates: '605 BC to the Second Coming',
        quote: '“Thou, O king, sawest, and behold a great image. This great image, whose brightness was excellent, stood before thee; and the form thereof was terrible.”',
        quoteRef: 'Daniel 2:31 (KJV)',
        explanation: 'The complete prophetic colossus revealed to King Nebuchadnezzar encompasses the entire timeline of gentile world dominion from the golden head of Babylon down through the divided feet of iron and clay. Each distinct metal depicts a successive world empire that ruled the ancient biblical landscape. Together, they outline the unbroken march of human kingdoms until the arrival of the eternal kingdom of God.',
        historical: 'Daniel interpreted the dream before the royal court of Babylon after all the empire’s Chaldean wise men failed to recall or explain it. He announced that a divine stone cut without hands would strike the image at its feet of iron and clay, shattering every earthly kingdom into dust. This divine kingdom would then expand into a mountain that fills the whole earth forever.',
        plateImg: 'assets/site/hero-colossus.jpg',
        plateCaption: 'The complete colossus of Daniel 2',
        thumb: 'assets/site/era-assembled.png',
        related: ['head', 'chest', 'feet', 'stone'],
        takeaway: 'The panoramic statue foretells human history from ancient Babylon to the end of time, showing that every earthly empire will finally give way to God’s everlasting kingdom.',
        filename: 'full_body.glb',
        camPos: [0.35, 1.45, 10.6],
        lookAt: [0, 1.05, 0],
        haloY: 2.8,
        haloScale: 1.2
      },
      head: {
        id: 'head',
        eyebrow: 'NEBUCHADNEZZAR’S',
        title: 'Golden Head',
        pill: 'DANIEL 2:32, 38',
        dates: '605–539 BC',
        quote: '“Thou art this head of gold.”',
        quoteRef: 'Daniel 2:38 (KJV)',
        explanation: 'The golden head represents the Babylonian Empire, the first in a series of world empires foretold by God. Babylon was known for its wealth, wisdom, and splendor, which is why gold is used to depict its rule.',
        historical: 'Under Nebuchadnezzar II, Babylon became the greatest city of its time. He expanded his empire, rebuilt the city with magnificent structures, and made Babylon the center of world power.',
        plateImg: 'assets/plates/babylon.jpg',
        plateCaption: 'The Ishtar Gate & Processional Way · Babylon',
        thumb: 'assets/site/era-head.png',
        related: ['chest', 'lion', 'dura', 'stump'],
        takeaway: 'The head of fine gold represents the wealth and majesty of the Babylonian Empire under King Nebuchadnezzar, which ruled from 605 to 539 BC.',
        filename: 'golden_head.glb',
        scale: 1.0,
        position: [0, 0.95, 0],
        camPos: [0.85, 1.38, 5.85],
        lookAt: [0, 1.18, 0],
        haloY: 1.35,
        haloScale: 1.12
      },
      chest: {
        id: 'chest',
        eyebrow: 'MEDO-PERSIAN EMPIRE',
        title: 'Silver Chest & Arms',
        pill: 'DANIEL 2:32, 39',
        dates: '539–331 BC',
        quote: '“And after thee shall arise another kingdom inferior to thee...”',
        quoteRef: 'Daniel 2:39 (KJV)',
        explanation: 'The breast and dual arms of silver portray the Medo-Persian alliance under Cyrus the Great and Darius. Silver represents both their vast coinage treasury and their second-tier position in imperial splendor.',
        historical: 'Cyrus took Babylon in 539 BC. Herodotus and Xenophon describe a diversion of the Euphrates. The Cyrus Cylinder records a policy of returning displaced peoples; Ezra 1 attributes the Jewish return and Temple rebuilding to the same king.',
        plateImg: 'assets/plates/persia.jpg',
        plateCaption: 'Apadana stairway reliefs · Persepolis',
        thumb: 'assets/site/era-chest.png',
        related: ['head', 'bear', 'ram', 'decree'],
        takeaway: 'The chest and arms of silver represent the Medo-Persian Empire, whose dual arms depict the alliance of Media and Persia that conquered Babylon in 539 BC.',
        filename: 'silver_chest.glb',
        scale: 1.0,
        position: [0, 0.95, 0],
        camPos: [0, 1.3, 4.6],
        lookAt: [0, 1.1, 0],
        haloY: 1.25,
        haloScale: 0.9
      },
      thighs: {
        id: 'thighs',
        eyebrow: 'GRECIAN EMPIRE',
        title: 'Bronze Belly & Thighs',
        pill: 'DANIEL 2:32, 39',
        dates: '331–168 BC',
        quote: '“And another third kingdom of brass, which shall bear rule over all the earth.”',
        quoteRef: 'Daniel 2:39 (KJV)',
        explanation: 'The belly and thighs of bronze symbolize the swift Greco-Macedonian empire founded by Alexander the Great, which swept across the Near East with bronze armor and phalanx warfare. Bronze reflects both the resonant trade and metalcraft of the Hellenistic world and its military equipment. Although dazzling in cultural influence, Greece occupied a third position in the descending succession of imperial metals.',
        historical: 'Alexander conquered from Greece to India in barely a decade. Upon his death, the empire fragmented into four Hellenistic dynasties, spreading the Greek language that later became the vehicle for the New Testament.',
        plateImg: 'assets/plates/greece.jpg',
        plateCaption: 'Bronze hoplite armor · Hellenistic gallery plate',
        thumb: 'assets/site/era-thighs.png',
        related: ['chest', 'leopard', 'goat', 'legs'],
        takeaway: 'The bronze belly and thighs represent the Grecian Empire of Alexander the Great, whose rapid conquests united the Mediterranean world under Greek culture and language.',
        filename: 'bronze_thighs.glb',
        scale: 1.0,
        position: [0, 0.95, 0],
        camPos: [0, 1.25, 4.4],
        lookAt: [0, 1.05, 0],
        haloY: 1.1,
        haloScale: 0.85
      },
      legs: {
        id: 'legs',
        eyebrow: 'ROMAN EMPIRE',
        title: 'Legs of Iron',
        pill: 'DANIEL 2:33, 40',
        dates: '168 BC–AD 476',
        quote: '“And the fourth kingdom shall be strong as iron: forasmuch as iron breaketh in pieces and subdueth all things: and as iron that breaketh all these, shall it break in pieces and bruise.”',
        quoteRef: 'Daniel 2:40 (KJV)',
        explanation: 'The dual legs of unyielding iron represent Imperial Rome, which eventually split into Western and Eastern divisions. The Roman Empire was renowned for disciplined legions, iron weapons, and extensive paved roads that connected three continents.',
        historical: 'The Mediterranean world experienced the Roman peace, known as the Pax Romana, during which Jesus Christ was born and crucified. Rome\'s legal order and highway system subsequently enabled the rapid spread of the Christian gospel.',
        plateImg: 'assets/plates/rome.jpg',
        plateCaption: 'Lorica, gladius, and aquila · Imperial Rome',
        thumb: 'assets/site/era-legs.png',
        related: ['thighs', 'beast', 'feet', 'stone'],
        takeaway: 'The two iron legs represent the unyielding military might of Imperial Rome, which crushed opposing realms and ruled during the earthly life of Jesus Christ.',
        filename: 'iron_legs.glb',
        scale: 1.0,
        position: [0, 0.95, 0],
        camPos: [0, 1.25, 4.4],
        lookAt: [0, 1.0, 0],
        haloY: 1.0,
        haloScale: 0.85
      },
      feet: {
        id: 'feet',
        eyebrow: 'DIVIDED REALMS',
        title: 'Feet of Iron & Clay',
        pill: 'DANIEL 2:33, 41-43',
        dates: 'AD 476 to the Second Coming',
        quote: '“And whereas thou sawest the feet and toes, part of potters’ clay, and part of iron, the kingdom shall be divided; but there shall be in it of the strength of the iron, forasmuch as thou sawest the iron mixed with miry clay.”',
        quoteRef: 'Daniel 2:41 (KJV)',
        explanation: 'The feet and ten toes composed of brittle potter\'s clay mixed with rigid iron represent the fragmented nations of Europe that arose after the fall of Western Rome. These kingdoms remain partly strong and partly fragile, continually forming diplomatic alliances yet never truly bonding into a single lasting empire.',
        historical: 'Centuries of royal marriages, diplomatic treaties, and military campaigns by conquerors such as Charlemagne, Charles V, and Napoleon failed to reunify Europe. This enduring division precisely fulfills Daniel\'s prophecy that these nations will remain divided until the supernatural stone strikes.',
        plateImg: 'assets/plates/divided.jpg',
        plateCaption: 'Iron crown and clay shards · divided realms',
        thumb: 'assets/site/era-feet.png',
        related: ['legs', 'beast', 'stone', 'assembled'],
        takeaway: 'The feet of iron mixed with clay portray the divided nations of Europe that arose after the collapse of Western Rome, continually forming alliances yet never uniting into a single world empire.',
        filename: 'feet_iron_clay.glb',
        scale: 1.0,
        position: [0, 0.78, 0],
        camPos: [0, 1.05, 4.2],
        lookAt: [0, 0.75, 0],
        haloY: 0.8,
        haloScale: 0.8
      },
      altar: {
        id: 'altar',
        eyebrow: 'SACRED MESOPOTAMIAN DAIS',
        title: 'Ancient Azure Altar',
        pill: 'DANIEL 2:46-47',
        dates: '605–539 BC (Modern Reconstruction)',
        quote: '“The king answered unto Daniel, and said, Of a truth it is, that your God is a God of gods, and a Lord of kings, and a revealer of secrets, seeing thou couldest reveal this secret.”',
        quoteRef: 'Daniel 2:47 (KJV)',
        explanation: 'This architectural display features a reconstructed Mesopotamian glazed-brick dais with ceremonial tier moldings. In ancient Babylon, raised brick platforms were used to elevate royal monuments, sacred altars, and votive statues before the public.',
        historical: 'Vibrant glazed blue brick was the signature decorative medium of Neo-Babylonian monumental architecture, displayed most famously on Babylon\'s Ishtar Gate. This museum dais is a modern reconstruction created for this gallery rather than an excavated artifact from the ancient temple of Esagila.',
        plateImg: 'assets/plates/altar-dais.jpg',
        plateCaption: 'Glazed lapis altar dais · Babylon',
        thumb: 'assets/thumbs/altar.jpg',
        related: ['assembled', 'head', 'dura', 'stone'],
        takeaway: 'This museum dais is a modern reconstruction of a Babylonian glazed-brick platform, illustrating the ceremonial settings where ancient kings bowed when God revealed hidden futures.',
        filename: 'azure_altar.glb',
        scale: 1.4,
        position: [0, -0.60, 0],
        camPos: [0, 0.7, 4.8],
        lookAt: [0, 0.0, 0],
        haloY: 0.2,
        haloScale: 0.8
      },
      stone: {
        id: 'stone',
        eyebrow: 'THE KINGDOM OF GOD',
        title: 'Stone Cut Without Hands',
        pill: 'DANIEL 2:34-35, 44-45',
        dates: 'The Second Coming of Christ',
        quote: '“Thou sawest till that a stone was cut out without hands, which smote the image upon his feet that were of iron and clay, and brake them to pieces.”',
        quoteRef: 'Daniel 2:34 (KJV)',
        explanation: 'The stone cut out without hands represents the eternal kingdom that God Himself establishes at the Second Coming of Jesus Christ. It strikes the prophetic colossus upon its divided feet of iron and clay, demolishing all human kingdoms before expanding into a mountain that fills the entire earth.',
        historical: 'Daniel explained to Nebuchadnezzar that in the days of these divided kingdoms, the God of heaven will set up an everlasting kingdom that will never be destroyed or left to other rulers. This divine realm will completely consume all earthly empires and endure forever.',
        plateImg: 'assets/plates/stone-kingdom.jpg',
        plateCaption: 'A stone cut without hands · Daniel 2:34',
        thumb: 'assets/site/era-stone.png',
        related: ['feet', 'assembled', 'son', 'ancient'],
        takeaway: 'The supernatural stone cut without human hands represents God’s eternal kingdom established at the Second Coming of Christ, which obliterates all earthly dominions and fills the whole earth.',
        filename: 'stone.glb',
        scale: 1.0,
        position: [0, 0.95, 0],
        camPos: [0, 1.22, 4.4],
        lookAt: [0, 1.0, 0],
        haloY: 1.2,
        haloScale: 0.9
      },
      lion: {
        id: 'lion',
        eyebrow: 'DANIEL 7 · FIRST BEAST',
        title: 'Winged Lion of Babylon',
        pill: 'DANIEL 7:4',
        dates: '605–539 BC',
        quote: '“The first was like a lion, and had eagle’s wings: I beheld till the wings thereof were plucked, and it was lifted up from the earth, and made stand upon the feet as a man, and a man’s heart was given to it.”',
        quoteRef: 'Daniel 7:4 (KJV)',
        explanation: 'Daniel 7 retells the succession of world empires as four predatory beasts emerging from a storm-tossed sea. The winged lion corresponds to the golden head of Babylon in Daniel 2. Its wings signify swift initial conquests, while the plucking of its wings and the gift of a human heart depict King Nebuchadnezzar being humbled and restored by God in Daniel 4.',
        historical: 'The Neo-Babylonian Empire under Nebuchadnezzar II served as the historical foundation for both the head of gold and the winged lion. Babylon adorned its monumental Processional Way and the Ishtar Gate with glazed reliefs of marching lions. The king who witnessed the colossus in Daniel 2 was later driven into the wilderness in Daniel 4 before acknowledging God and regaining his sanity.',
        plateImg: 'assets/plates/lion-procession.jpg',
        plateCaption: 'Winged lions on the Processional Way · Babylon',
        thumb: 'assets/site/era-lion.png',
        related: ['head', 'bear', 'stump', 'dura'],
        takeaway: 'The winged lion portrays the swift rise of Babylon, whose plucked wings and human heart reflect King Nebuchadnezzar’s humiliation and subsequent restoration by God.',
        filename: 'lion.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.6, 1.55, 5.6],
        lookAt: [0, 1.05, 0],
        haloY: 1.35,
        haloScale: 1.05
      },
      bear: {
        id: 'bear',
        eyebrow: 'DANIEL 7 · SECOND BEAST',
        title: 'The Bear with Three Ribs',
        pill: 'DANIEL 7:5',
        dates: '539–331 BC',
        quote: '“And behold another beast, a second, like to a bear, and it raised up itself on one side, and it had three ribs in the mouth of it between the teeth of it: and they said thus unto it, Arise, devour much flesh.”',
        quoteRef: 'Daniel 7:5 (KJV)',
        explanation: 'The bear raised up on one side portrays the Medo-Persian Empire, where the Persian kingdom eventually surpassed its Median partner in military strength. The three ribs held between the beast\'s teeth represent the three major territories conquered during Persian expansion, namely Lydia, Babylon, and Egypt. This predatory bear directly corresponds to the silver chest and arms seen in Daniel 2.',
        historical: 'Daniel received the vision of the four beasts during the first year of King Belshazzar of Babylon. In 539 BC, Cyrus the Great diverted the waters of the Euphrates River and captured Babylon in a single night. Both the dual silver arms of the colossus and the lopsided stance of the bear illustrate the unequal partnership between the Medes and the dominant Persians.',
        plateImg: 'assets/site/bear-painting.jpg',
        plateCaption: 'The Bear with Three Ribs · Daniel 7:5',
        thumb: 'assets/site/era-bear.png',
        related: ['chest', 'ram', 'lion', 'leopard'],
        takeaway: 'The lopsided bear represents the Medo-Persian Empire, with its raised side showing Persian dominance and the three ribs in its mouth recalling its three major conquests of Lydia, Babylon, and Egypt.',
        filename: 'bear.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.6, 1.55, 5.6],
        lookAt: [0, 1.05, 0],
        haloY: 1.3,
        haloScale: 1.0
      },
      leopard: {
        id: 'leopard',
        eyebrow: 'DANIEL 7 · THIRD BEAST',
        title: 'Four-Winged Leopard',
        pill: 'DANIEL 7:6',
        dates: '331–168 BC',
        quote: '“After this I beheld, and lo another, like a leopard, which had upon the back of it four wings of a fowl; the beast had also four heads; and dominion was given to it.”',
        quoteRef: 'Daniel 7:6 (KJV)',
        explanation: 'The four wings upon the leopard depict the remarkable speed of the Grecian armies led by Alexander the Great, who conquered the Persian world in a single decade. The beast\'s four heads symbolize the Diadochi, the rival Macedonian generals who partitioned Alexander\'s empire into four Hellenistic kingdoms following his death in 323 BC. This agile predator corresponds to the bronze belly and thighs described in Daniel 2.',
        historical: 'Alexander crushed the Persian forces at the Battle of Gaugamela in 331 BC to secure dominion over the Near East. Following his untimely death in Babylon at age thirty-two, his generals Cassander, Lysimachus, Seleucus, and Ptolemy established separate dynasties that spread Greek language and culture across the ancient world. Grecian political supremacy finally ended when Roman legions triumphed at the Battle of Pydna in 168 BC.',
        plateImg: 'assets/plates/leopard-diadochi.jpg',
        plateCaption: 'Four heads after Alexander · the Diadochi',
        thumb: 'assets/site/era-leopard.png',
        related: ['thighs', 'goat', 'goat_broken', 'beast'],
        takeaway: 'The four-winged leopard represents the rapid conquests of the Grecian Empire under Alexander the Great, while its four heads portray the four Hellenistic realms formed by his generals after his death.',
        filename: 'leopard.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 1.85,
        camPos: [1.8, 1.45, 5.8],
        lookAt: [0, 0.95, 0],
        haloY: 1.15,
        haloScale: 1.1
      },
      beast: {
        id: 'beast',
        eyebrow: 'DANIEL 7 · FOURTH BEAST',
        title: 'Dreadful Beast & Little Horn',
        pill: 'DANIEL 7:7-8, 23-25',
        dates: '168 BC–AD 476; Little Horn 538–1798',
        quote: '“After this I saw in the night visions, and behold a fourth beast, dreadful and terrible, and strong exceedingly; and it had great iron teeth: it devoured and brake in pieces, and stamped the residue with the feet of it: and it was diverse from all the beasts that were before it; and it had ten horns.”',
        quoteRef: 'Daniel 7:7 (KJV)',
        explanation: 'The fourth beast is distinct from all preceding predators, possessing massive iron teeth that correspond to the iron legs of Daniel 2. Its iron teeth portray Imperial Rome crushing Mediterranean nations, while its ten horns represent the barbarian kingdoms that partitioned Western Rome. Among these ten horns emerges a little horn, representing a persecuting religious and political power that uproots three rival kingdoms and exercises authority for 1,260 prophetic years, spanning from AD 538 to 1798.',
        historical: 'As Imperial Rome collapsed, authority shifted to a Roman church-state power established among the divided western tribes. The Byzantine emperor Justinian issued a decree elevating the Roman bishop, which took practical geopolitical effect in AD 538 after the defeat of the Ostrogoths, the third of three rival Arian tribal kingdoms who held differing theological views on Christ\'s nature. This dominion persisted until French forces arrested the pope in 1798, after which Daniel describes a heavenly courtroom session convening before the final kingdom is given to the saints.',
        plateImg: 'assets/study/epochs/papal-rome.jpg',
        plateCaption: 'Iron teeth and the little horn among the ten · Rome',
        thumb: 'assets/site/era-beast.png',
        related: ['legs', 'years1260', 'ancient', 'son'],
        takeaway: 'The fourth beast with iron teeth represents Imperial Rome, while its little horn portrays the persecuting church-state power that arose among the divided nations and reigned for 1,260 years until 1798.',
        filename: 'beast.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.2,
        camPos: [1.7, 1.6, 5.8],
        lookAt: [0, 1.1, 0],
        haloY: 1.4,
        haloScale: 1.12
      },
      years1260: {
        id: 'years1260',
        eyebrow: 'DANIEL 7 · THE MEASURED SPAN',
        title: 'A Time, Times, and Dividing of Time',
        pill: 'DANIEL 7:25 · 1,260 YEARS',
        dates: 'AD 538 – AD 1798',
        quote: '“And he shall speak great words against the most High, and shall wear out the saints of the most High, and think to change times and laws: and they shall be given into his hand until a time and times and the dividing of time.”',
        quoteRef: 'Daniel 7:25 (KJV)',
        explanation: 'Do not memorize 1,260 years first. Build the number. In this style of prophecy a “time” is a year, “times” is two years, and “the dividing of time” is a half year: 1 + 2 + ½ = 3½ years. Revelation writes the same span three ways: a thousand two hundred and threescore days (Revelation 12:6), a time and times and half a time (Revelation 12:14), and forty and two months (Revelation 13:5). Forty-two months of thirty days are 1,260 days. On the year-day scale God appointed in Numbers 14:34 and Ezekiel 4:6, those 1,260 days are 1,260 years. This exhibit is that measured reign — not a fifth metal, and not a three-and-a-half-year man at the end of time.',
        historical: 'The marks in Daniel 7:24–25 sit among the ten fragments of western Rome: a power diverse from the others, speaking great words, wearing out the saints, intending to change times and laws. Historicist readers date the opening when the Ostrogothic grip on Rome broke in AD 538, so Justinian’s grant to the Roman see could operate in the city, and the close when General Berthier took Pius VI in 1798. You may argue the start-year. You may not skip the marks in 7:24–25 and still claim any favorite villain. The court of 7:9–14 sits while this span is still a historical fact; the stone of chapter 2 is later.',
        plateImg: 'assets/plates/years1260.jpg',
        plateCaption: 'Time, times, and the dividing of time · 538 to 1798',
        thumb: 'assets/site/era-years1260.png',
        related: ['beast', 'ancient', 'sealed', 'feet'],
        takeaway: 'Daniel 7:25’s riddle is 3½ years; Revelation equates it with 1,260 days; the year-day scale makes those 1,260 years, from the little horn’s measured supremacy in 538 to the deadly wound in 1798.',
        filename: 'years1260.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.6, 1.55, 5.6],
        lookAt: [0, 1.08, 0],
        haloY: 1.35,
        haloScale: 1.08
      },
      ram: {
        id: 'ram',
        eyebrow: 'DANIEL 8 · THE RAM',
        title: 'Ram of Medo-Persia',
        pill: 'DANIEL 8:3-4, 20',
        dates: '539–331 BC',
        quote: '“Then I lifted up mine eyes, and saw, and, behold, there stood before the river a ram which had two horns: and the two horns were high; but one was higher than the other, and the higher came up last.”',
        quoteRef: 'Daniel 8:3 (KJV)',
        explanation: 'The angel Gabriel explicitly identifies the two-horned ram as the kings of Media and Persia in Daniel 8:20. The two horns represent this dual monarchy, with the higher horn that emerged last illustrating that Persia arose after Media and grew far more powerful. This symbol provides the direct biblical key to the silver arms of Daniel 2 and the lopsided bear of Daniel 7.',
        historical: 'Daniel stood beside the Ulai River in the fortress city of Susa, which later became a royal capital of the Persian Empire, when this vision appeared. The ram pushed aggressively toward the west, north, and south, conquering territory without encountering any rival power that could resist its advance. This unchecked expansion continued until the charging Grecian he-goat swept across the earth from the west to confront it.',
        plateImg: 'assets/plates/ram-ulai.jpg',
        plateCaption: 'Two horns beside the Ulai · Medo-Persia',
        thumb: 'assets/site/era-ram.png',
        related: ['chest', 'bear', 'goat', 'thighs'],
        takeaway: 'The two-horned ram represents the kings of Media and Persia, with the higher horn that came up last signifying the greater power of the Persian kingdom that arose after Media.',
        filename: 'ram.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.1,
        camPos: [1.7, 1.5, 5.7],
        lookAt: [0, 1.05, 0],
        haloY: 1.25,
        haloScale: 1.0
      },
      goat: {
        id: 'goat',
        eyebrow: 'DANIEL 8 · THE HE-GOAT',
        title: 'Charging Goat of Greece',
        pill: 'DANIEL 8:5-7, 21',
        dates: '331–168 BC (Alexander 334–323 BC)',
        quote: '“And as I was considering, behold, an he goat came from the west on the face of the whole earth, and touched not the ground: and the goat had a notable horn between his eyes.”',
        quoteRef: 'Daniel 8:5 (KJV)',
        explanation: 'The angel Gabriel explains in Daniel 8:21 that the rough he-goat represents the kingdom of Greece, while the prominent horn between its eyes represents its first king, Alexander the Great. The goat moving so swiftly that its feet do not touch the ground signifies Alexander\'s lightning military campaign from Greece to the borders of India. In this vision, the goat charges the Persian ram with furious power, breaking both of its horns and trampling it to the ground.',
        historical: 'Beginning at the Granicus River in 334 BC and culminating at the decisive Battle of Gaugamela in 331 BC, Alexander dismantled the Persian Empire in barely three years. This rapid triumph demonstrates why Daniel 2 depicted Greece as resonant bronze and Daniel 7 portrayed it as a four-winged leopard. The prophecy in Daniel 8 explicitly names the historical empires that were previously represented only by symbolic metals and beasts.',
        plateImg: 'assets/plates/goat-charge.jpg',
        plateCaption: 'The notable horn from the west · Alexander',
        thumb: 'assets/site/era-goat.png',
        related: ['thighs', 'leopard', 'ram', 'goat_broken'],
        takeaway: 'The swift he-goat represents the Grecian Empire moving from the west with unmatched speed, whose prominent single horn between his eyes identifies its first great monarch, Alexander the Great.',
        filename: 'goat.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.8, 1.5, 5.8],
        lookAt: [0, 1.05, 0],
        haloY: 1.3,
        haloScale: 1.05
      },
      goat_broken: {
        id: 'goat_broken',
        eyebrow: 'DANIEL 8 · THE GREAT HORN BROKEN',
        title: 'Goat with the Broken Horn',
        pill: 'DANIEL 8:8, 22',
        dates: '323–168 BC (Hellenistic Division)',
        quote: '“Therefore the he goat waxed very great: and when he was strong, the great horn was broken; and for it came up four notable ones toward the four winds of heaven.”',
        quoteRef: 'Daniel 8:8 (KJV)',
        explanation: 'The sudden shattering of the goat\'s great horn represents Alexander the Great dying unexpectedly of fever in Babylon in 323 BC at the zenith of his military career. In place of the single horn, four notable horns grew toward the four winds of heaven, representing the partition of Alexander\'s realm among four Macedonian generals known as the Diadochi. Daniel 8:22 explains that four separate kingdoms would arise from the Greek nation, but none would equal the personal power of its founder.',
        historical: 'The four horns of the he-goat correspond directly to the four heads of the leopard introduced in Daniel 7. Following decades of internal warfare, the Diadochi established the four Hellenistic realms of Cassander in Macedonia, Lysimachus in Thrace and Asia Minor, Seleucus in Syria and Mesopotamia, and Ptolemy in Egypt. Although Greek language and civilization continued to dominate the Mediterranean basin, the fractured dynasties progressively fell before the rising military power of Rome.',
        plateImg: 'assets/plates/goat-broken.jpg',
        plateCaption: 'When he was strong, the great horn was broken',
        thumb: 'assets/site/era-goat_broken.png',
        related: ['goat', 'leopard', 'goat_horn', 'thighs'],
        takeaway: 'The breaking of the goat’s great horn represents Alexander the Great’s sudden death at the height of his power in 323 BC, after which his realm fractured into four separate Hellenistic kingdoms.',
        filename: 'goat_broken.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.1,
        camPos: [1.7, 1.5, 5.7],
        lookAt: [0, 1.05, 0],
        haloY: 1.25,
        haloScale: 1.0
      },
      goat_horn: {
        id: 'goat_horn',
        eyebrow: 'DANIEL 8 · THE LITTLE HORN',
        title: 'Little Horn of the Goat',
        pill: 'DANIEL 8:9-14, 23-25',
        dates: '168 BC to 1844',
        quote: '“And out of one of them came forth a little horn, which waxed exceeding great, toward the south, and toward the east, and toward the pleasant land.”',
        quoteRef: 'Daniel 8:9 (KJV)',
        explanation: 'The little horn of Daniel 8 represents the persecuting power of Rome in both its pagan imperial and papal ecclesiastical phases. It grows exceeding great toward the south, east, and the pleasant land of Palestine, usurping the daily priestly ministry, or tamid in Hebrew, of Christ and casting down the truth of His heavenly sanctuary. Under the historicist year-day principle of prophetic interpretation, where a symbolic prophetic day represents a literal calendar year, this defiling power continues until the 2,300-day prophecy ends in 1844, when the heavenly sanctuary is cleansed and restored.',
        historical: 'The angel Gabriel stated twice in Daniel 8 that the vision concerns the time of the end, reaching far beyond the brief second-century BC oppression under the Seleucid king Antiochus IV Epiphanes. While Antiochus desecrated the earthly temple in Jerusalem for three years, this prophetic horn waxes exceeding great and attacks the heavenly priesthood of Christ Himself. The fulfillment spans from Roman imperial authority through the medieval church-state system until the final heavenly cleansing of the sanctuary in 1844.',
        plateImg: 'assets/plates/goat-horn.jpg',
        plateCaption: 'A little horn toward the pleasant land',
        thumb: 'assets/site/era-goat_horn.png',
        related: ['beast', 'goat_broken', 'ancient', 'stone'],
        takeaway: 'The little horn of Daniel 8 represents the persecuting power of Imperial and papal Rome that magnified itself against Christ’s heavenly sanctuary ministry across centuries until the 2,300 prophetic days ended in 1844.',
        filename: 'goat_horn.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.7, 1.55, 5.8],
        lookAt: [0, 1.1, 0],
        haloY: 1.35,
        haloScale: 1.08
      },
      dura: {
        id: 'dura',
        eyebrow: 'DANIEL 3 · PLAIN OF DURA',
        title: 'Golden Image of Dura',
        pill: 'DANIEL 3:1-6',
        dates: 'c. 594 BC',
        quote: '“Nebuchadnezzar the king made an image of gold, whose height was threescore cubits, and the breadth thereof six cubits: he set it up in the plain of Dura, in the province of Babylon.”',
        quoteRef: 'Daniel 3:1 (KJV)',
        explanation: 'King Nebuchadnezzar constructed an image fabricated entirely of gold on the plain of Dura as an open rejection of God\'s revelation in Daniel 2. Unwilling to accept that Babylon was merely the golden head and would eventually fall to an inferior kingdom, the king asserted that his empire would stand forever. Standing sixty cubits high and six cubits wide, the monument served as the centerpiece of a mandatory assembly where all subjects were commanded to bow down or face execution in a burning fiery furnace.',
        historical: 'Three young Hebrew administrators named Shadrach, Meshach, and Abednego refused to violate God\'s commandments by bowing before the golden idol. Even after the furious monarch ordered the furnace heated seven times hotter than normal, God protected them within the flames, where Nebuchadnezzar was astonished to see a divine fourth figure resembling the Son of God walking beside them unhurt. This dramatic trial serves as the biblical prototype for the end-time crisis described in Revelation 13, where civil rulers again enforce religious conformity upon threat of death.',
        plateImg: 'assets/plates/dura-plain.jpg',
        plateCaption: 'An image of gold on the plain of Dura',
        thumb: 'assets/site/era-dura.png',
        related: ['assembled', 'head', 'stump', 'son'],
        takeaway: 'Nebuchadnezzar made his ninety-foot statue entirely of gold to defy God’s revelation that Babylon would fall, demanding universal worship on pain of death until God delivered three faithful Hebrew captives from the fiery furnace.',
        filename: 'dura.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.4,
        camPos: [1.4, 1.7, 6.2],
        lookAt: [0, 1.15, 0],
        haloY: 1.55,
        haloScale: 1.15
      },
      ancient: {
        id: 'ancient',
        eyebrow: 'DANIEL 7 · THE HEAVENLY COURT',
        title: 'The Ancient of Days',
        pill: 'DANIEL 7:9-10',
        dates: 'Pre-Advent Judgment from 1844',
        quote: '“I beheld till the thrones were cast down, and the Ancient of days did sit, whose garment was white as snow, and the hair of his head like the pure wool: his throne was like the fiery flame, and his wheels as burning fire.”',
        quoteRef: 'Daniel 7:9 (KJV)',
        explanation: 'The judgment scene in Daniel 7 portrays a solemn celestial courtroom convened before the Ancient of Days rather than an earthly battlefield. Thrones are placed in order, celestial books of record are opened, and the oppressive deeds of the little horn are thoroughly evaluated before the heavenly court. In the historicist understanding of biblical prophecy, this judicial session represents the pre-advent judgment that commenced at the conclusion of the 2,300 prophetic days in 1844.',
        historical: 'Daniel describes millions of heavenly beings attending this celestial proceeding as a river of fire issues from the throne of the Ancient of Days. The arrogant fourth beast is not overthrown by an earthly military rival, but is condemned and destroyed as a direct result of heaven\'s judicial sentence. This verdict vindicates God\'s faithful people and prepares the way for the transfer of eternal dominion to the Son of man.',
        plateImg: 'assets/plates/ancient-throne.jpg',
        plateCaption: 'Thrones were set, and the books were opened',
        thumb: 'assets/site/era-ancient.png',
        related: ['son', 'beast', 'years1260', 'stone'],
        takeaway: 'The vision of the Ancient of Days reveals God convening a heavenly courtroom where the books of record are opened and earthly persecuting powers are judged before Christ receives His eternal kingdom.',
        filename: 'ancient.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.25,
        camPos: [1.5, 1.6, 5.8],
        lookAt: [0, 1.15, 0],
        haloY: 1.5,
        haloScale: 1.12
      },
      son: {
        id: 'son',
        eyebrow: 'DANIEL 7 · THE SON OF MAN',
        title: 'One Like the Son of Man',
        pill: 'DANIEL 7:13-14',
        dates: 'Culmination of the Heavenly Judgment',
        quote: '“I saw in the night visions, and, behold, one like the Son of man came with the clouds of heaven, and came to the Ancient of days, and they brought him near before him.”',
        quoteRef: 'Daniel 7:13 (KJV)',
        explanation: 'In Daniel 7:13, the figure described as the Son of man travels with the clouds of heaven toward the Ancient of Days rather than descending directly to earth. He is ushered into the presence of God to receive universal dominion, glory, and an everlasting kingdom that will never pass away. Jesus adopted this title during His earthly ministry to identify Himself as this divine ruler who receives sovereignty in the heavenly sanctuary before returning to claim His people.',
        historical: 'Daniel records that all peoples, nations, and languages will ultimately serve and obey the Son of man when His eternal kingdom is inaugurated. After the destructive dominion of the little horn is stripped away and consumed, the kingdom under the whole heaven will be given to the saints of the Most High. This climax marks the complete transition of world authority away from oppressive earthly empires and into the hands of Christ and His redeemed people.',
        plateImg: 'assets/plates/son-clouds.jpg',
        plateCaption: 'With the clouds of heaven, to the Ancient of Days',
        thumb: 'assets/site/era-son.png',
        related: ['ancient', 'stone', 'michael', 'sealed'],
        takeaway: 'The vision reveals Jesus Christ approaching God’s heavenly throne as the Son of man to receive everlasting dominion over all peoples, nations, and languages before returning to earth.',
        filename: 'son.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.2,
        camPos: [1.5, 1.55, 5.7],
        lookAt: [0, 1.12, 0],
        haloY: 1.45,
        haloScale: 1.1
      },
      stump: {
        id: 'stump',
        eyebrow: 'DANIEL 4 · THE WATCHER’S SENTENCE',
        title: 'Ironbound Stump',
        pill: 'DANIEL 4:14-17, 23',
        dates: 'c. 569–562 BC (Seven Times of Nebuchadnezzar)',
        quote: '“Nevertheless leave the stump of his roots in the earth, even with a band of iron and brass, in the tender grass of the field; and let it be wet with the dew of heaven, and let his portion be with the beasts in the grass of the earth.”',
        quoteRef: 'Daniel 4:15 (KJV)',
        explanation: 'In Daniel 4, a majestic tree that once offered shade and nourishment to all living creatures represents King Nebuchadnezzar at the height of his imperial power. A holy watcher from heaven commands the tree to be cut down, yet instructs that its roots and stump be secured with a band of iron and bronze so that the king\'s realm is preserved. The proud monarch is stricken with seven years of madness and lives among wild animals until he recognizes that the Most High rules over human kingdoms.',
        historical: 'Twelve months after Daniel warned him to repent of his sins and show mercy to the oppressed, Nebuchadnezzar boasted of building Babylon by his own sovereign might and was instantly struck with mental illness. For seven literal years he grazed upon grass like an ox until his hair grew like eagles\' feathers and his nails resembled birds\' claws. When his understanding finally returned, the humbled king lifted his eyes to heaven and publicly praised the Most High God, learning by personal experience that earthly sovereignty is granted only by divine decree.',
        plateImg: 'assets/study/babylon-sunset.jpg',
        plateCaption: 'Leave the stump of his roots · banded with iron and brass',
        thumb: 'assets/site/era-stump.png',
        related: ['head', 'dura', 'lion', 'ox_king'],
        takeaway: 'The iron and bronze band binding the tree stump showed that God preserved Nebuchadnezzar’s royal throne during seven years of humiliating madness until the proud monarch acknowledged heaven’s supreme sovereignty.',
        filename: 'stump.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 1.85,
        camPos: [1.6, 1.35, 5.4],
        lookAt: [0, 0.9, 0],
        haloY: 1.1,
        haloScale: 0.95
      },
      ox_king: {
        id: 'ox_king',
        eyebrow: 'DANIEL 4 · THE KING AMONG BEASTS',
        title: 'Nebuchadnezzar the Ox-King',
        pill: 'DANIEL 4:33',
        dates: 'c. 569–562 BC (Seven Times)',
        quote: '“The same hour was the thing fulfilled upon Nebuchadnezzar: and he was driven from men, and did eat grass as oxen, and his body was wet with the dew of heaven, till his hairs were grown like eagles’ feathers, and his nails like birds’ claws.”',
        quoteRef: 'Daniel 4:33 (KJV)',
        explanation: 'Daniel 4 records that the golden head of the colossus was himself driven from the throne and given a beast’s portion until he learned that the Most High rules. Hair like eagles’ feathers and nails like birds’ claws are the visible sentence: a king who claimed Babylon as his own building is numbered with the oxen. This figure stands beside the ironbound stump. The stump is the reserved throne; the ox-king is the man who must live the sentence.',
        historical: 'Twelve months after the warning, Nebuchadnezzar boasted on the palace roof and was struck the same hour. For seven years he ate grass as oxen until his understanding returned and he praised the King of heaven. Babylon’s throne was kept for him, then passed in the next generation to Belshazzar, who did not learn the family lesson.',
        plateImg: 'assets/plates/ox-king.jpg',
        plateCaption: 'Hair like eagles’ feathers, nails like birds’ claws',
        thumb: 'assets/site/era-ox_king.png',
        related: ['stump', 'head', 'lion', 'dura'],
        takeaway: 'The ox-king is Nebuchadnezzar under the Watcher’s sentence: driven from men, wet with dew, until a proud monarch lifts his eyes and confesses that heaven assigns every throne.',
        filename: 'ox_king.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.6, 1.55, 5.6],
        lookAt: [0, 1.05, 0],
        haloY: 1.35,
        haloScale: 1.05
      },
      michael: {
        id: 'michael',
        eyebrow: 'DANIEL 12 · THE GREAT PRINCE',
        title: 'Michael Standing Up',
        pill: 'DANIEL 12:1',
        dates: 'Close of the heavenly work',
        quote: '“And at that time shall Michael stand up, the great prince which standeth for the children of thy people: and there shall be a time of trouble, such as never was since there was a nation even to that same time: and at that time thy people shall be delivered, every one that shall be found written in the book.”',
        quoteRef: 'Daniel 12:1 (KJV)',
        explanation: 'Michael is named the great prince who stands for Daniel’s people. In the last vision he does not remain seated at advocacy; he stands up. That change of posture marks the close of intercession and the opening of a time of trouble such as never was, after which those written in the book are delivered. The same chapter then promises a bodily resurrection. This standing figure is distinct from the Son of man approaching the Ancient of Days on the clouds in Daniel 7:13.',
        historical: 'Daniel 10 already names Michael as the prince who helps against the prince of Persia. Daniel 12 places his standing at the climax of the long conflict traced through the kings of the north and south. The promise that follows is personal: many who sleep in the dust of the earth shall awake, and Daniel himself shall rest and stand in his lot at the end of the days.',
        plateImg: 'assets/plates/michael.jpg',
        plateCaption: 'Michael shall stand up, the great prince',
        thumb: 'assets/site/era-michael.png',
        related: ['son', 'sealed', 'ancient', 'stone'],
        takeaway: 'When Michael stands up, the heavenly work of advocacy is finished, a time of trouble follows, and those written in the book are delivered — then the dust-sleepers awake.',
        filename: 'michael.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.2,
        camPos: [1.5, 1.55, 5.7],
        lookAt: [0, 1.12, 0],
        haloY: 1.45,
        haloScale: 1.1
      },
      sealed: {
        id: 'sealed',
        eyebrow: 'DANIEL 12 · THE CLOSED BOOK',
        title: 'The Sealed Scroll',
        pill: 'DANIEL 12:4, 9',
        dates: 'Sealed until the time of the end',
        quote: '“But thou, O Daniel, shut up the words, and seal the book, even to the time of the end: many shall run to and fro, and knowledge shall be increased.”',
        quoteRef: 'Daniel 12:4 (KJV)',
        explanation: 'The last chapter does not leave the visions open for every generation to invent a new scheme. Daniel is told to shut up the words and seal the book until the time of the end. The angel repeats the charge in 12:9: the words are closed up and sealed. Understanding is promised to the wise when the measured spans actually reach their dates, not when curiosity demands an earlier chart.',
        historical: 'Daniel 8 and 9 give numbered days that could not be read as finished history until those spans closed in the era beginning at the close of the 1,260 years. The sealed book is why the sitting treats 1798 and 1844 as dates the text itself teaches the reader to wait for, rather than as ornaments hung on the last page.',
        plateImg: 'assets/plates/sealed.jpg',
        plateCaption: 'Shut up the words, and seal the book',
        thumb: 'assets/site/era-sealed.png',
        related: ['michael', 'son', 'goat_horn', 'ancient'],
        takeaway: 'Daniel is commanded to seal the book until the time of the end, so the numbered visions stay closed until their appointed dates arrive and the wise understand.',
        filename: 'sealed.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.05,
        camPos: [1.4, 1.5, 5.4],
        lookAt: [0, 1.05, 0],
        haloY: 1.3,
        haloScale: 1.0
      },
      kings: {
        id: 'kings',
        eyebrow: 'DANIEL 11 · NORTH AND SOUTH',
        title: 'Kings of the North and South',
        pill: 'DANIEL 11:5, 40',
        dates: 'After Alexander to the time of the end',
        quote: '“And at the time of the end shall the king of the south push at him: and the king of the north shall come against him like a whirlwind, with chariots, and with horsemen, and with many ships; and he shall enter into the countries, and shall overflow and pass over.”',
        quoteRef: 'Daniel 11:40 (KJV)',
        explanation: 'Daniel 11 opens after the broken horn of Greece. The king of the south is first the Ptolemaic power in Egypt; the king of the north is first the Seleucid power in Syria. Their wars, marriages, and betrayals fill the chapter as a dated march. At the time of the end the same titles return: the south pushes, the north comes like a whirlwind, and the conflict moves toward the glorious holy mountain before Michael stands up in chapter 12.',
        historical: 'Ptolemy I held Egypt; Seleucus I held Syria and the lands toward the north. Daniel 11:6 records a failed marriage-alliance between the houses. Later verses track Rome’s rise over the Hellenistic kings, then a continuing northern power that magnifies itself even to the prince of the covenant. The last movement of the chapter is not another named empire in metal, but the last contest that yields to Michael’s standing.',
        plateImg: 'assets/plates/kings.jpg',
        plateCaption: 'The king of the south shall be strong… the king of the north',
        thumb: 'assets/site/era-kings.png',
        related: ['goat_broken', 'michael', 'sealed', 'beast'],
        takeaway: 'After Alexander’s horn is broken, Daniel 11 tracks the kings of the south and north from the Ptolemies and Seleucids to a last whirlwind at the time of the end, just before Michael stands up.',
        filename: 'kings.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 1.75,
        camPos: [0, 1.15, 4.8],
        lookAt: [0, 0.85, 0],
        haloY: 1.05,
        haloScale: 1.15
      },
      decree: {
        id: 'decree',
        eyebrow: 'DANIEL 9 · THE GOING FORTH',
        title: 'Royal Decree of Artaxerxes',
        pill: 'EZRA 7:13 · DANIEL 9:25',
        dates: '457 BC (seventh year of Artaxerxes I)',
        quote: '“Know therefore and understand, that from the going forth of the commandment to restore and to build Jerusalem unto the Messiah the Prince shall be seven weeks, and threescore and two weeks: the street shall be built again, and the wall, even in troublous times.”',
        quoteRef: 'Daniel 9:25 (KJV)',
        explanation: 'Gabriel dates the seventy weeks from the going forth of the commandment to restore and to build Jerusalem. Among the Persian restoration decrees, Ezra 7 records the fullest grant: Artaxerxes I in his seventh year authorizes return, temple service, and the civil restoration of the city. That going forth is 457 BC, the hinge from which sixty-nine weeks of years run to Messiah the Prince, and from which the longer 2,300 days of Daniel 8 also take their start.',
        historical: 'Cyrus (Ezra 1) sent the first wave home to rebuild the house. Darius confirmed the temple work. Artaxerxes’ letter in Ezra 7:12–26 adds priests, Levites, silver and gold, and authority to appoint magistrates — the commandment that actually rebuilds Jerusalem as a city under law. Ezra 7:7–8 places the journey in the seventh year of the king. From that date the arithmetic of Daniel 9 can be worked on paper: 457 plus 483 years lands on the anointing of Messiah, and the midst of the seventieth week is Calvary.',
        plateImg: 'assets/plates/decree.jpg',
        plateCaption: 'The commandment to restore and to build Jerusalem',
        thumb: 'assets/site/era-decree.png',
        related: ['chest', 'ram', 'goat_horn', 'stone'],
        takeaway: 'Artaxerxes’ decree in 457 BC is the going forth of Daniel 9:25: the clock for Messiah the Prince, and the shared start of the 2,300 days.',
        filename: 'decree.glb',
        organic: true,
        autoFrame: true,
        targetHeight: 2.15,
        camPos: [1.5, 1.55, 5.6],
        lookAt: [0, 1.05, 0],
        haloY: 1.35,
        haloScale: 1.05
      }
    };
    Object.keys(ASSET_REGISTRY).forEach((k) => {
      if (HALL_BACKDROPS[k]) ASSET_REGISTRY[k].hallImg = HALL_BACKDROPS[k];
    });

    // --- MUSEUM NODES CONFIGURATION ---
    // 6 precision nodes matching the mock layout: 3 on left column, 3 on right column
    const MUSEUM_NODES_DATA = {
      // Complete Assembled Statue Nodes
      assembled: [
        {
          id: 'col-head', col: 'left', row: 0,
          icon: '👑', label: 'HEAD OF GOLD',
          body: 'The golden head represents the Babylonian Empire under Nebuchadnezzar II, ruling with supreme wealth and majesty from 605 to 539 BC.',
          anchor: new THREE.Vector3(0, 3.25, 0.42), enabled: true
        },
        {
          id: 'col-thighs', col: 'left', row: 1,
          icon: '⚔️', label: 'BRONZE THIGHS',
          body: 'The bronze thighs represent the Grecian Empire from 331 to 168 BC, whose swift armies conquered the ancient world in bronze hoplite armor.',
          anchor: new THREE.Vector3(0, 1.48, 0.45), enabled: true
        },
        {
          id: 'col-feet', col: 'left', row: 2,
          icon: '🦶', label: 'IRON AND CLAY',
          body: 'The feet of iron and clay represent the divided nations after AD 476, partly strong and partly fragile, which never permanently unite.',
          anchor: new THREE.Vector3(0, 0.25, 0.45), enabled: true
        },
        {
          id: 'col-chest', col: 'right', row: 0,
          icon: '🛡️', label: 'SILVER CHEST',
          body: 'The silver chest and arms represent the Medo-Persian Empire from 539 to 331 BC, renowned for massive treasuries and silver coinage.',
          anchor: new THREE.Vector3(0, 2.38, 0.45), enabled: true
        },
        {
          id: 'col-legs', col: 'right', row: 1,
          icon: '🦿', label: 'LEGS OF IRON',
          body: 'The iron legs represent Imperial Rome from 168 BC to AD 476, whose disciplined legions crushed and governed opposing realms.',
          anchor: new THREE.Vector3(0, 0.88, 0.40), enabled: true
        },
        {
          id: 'col-altar', col: 'right', row: 2,
          icon: '🏛️', label: 'AZURE ALTAR DAIS',
          body: 'This glazed-brick platform reconstructs a Mesopotamian dais, which elevated royal monuments and sacred altars in ancient Babylon.',
          anchor: new THREE.Vector3(0, -0.42, 1.15), enabled: true
        }
      ],
      // Golden Head Nodes
      head: [
        {
          id: 'head-mat', col: 'left', row: 0,
          icon: '🟡', label: 'WHY GOLD',
          body: 'Gold portrays Babylon\'s unmatched imperial splendor and vast wealth described by ancient historians. (Daniel 2:38)',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'head-sig', col: 'left', row: 1,
          icon: '👑', label: 'BABYLONIAN EMPIRE',
          body: 'Babylon ruled as the supreme power of the Near East from 605 to 539 BC, establishing the benchmark for world empires.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'head-fig', col: 'left', row: 2,
          icon: '👤', label: 'NEBUCHADNEZZAR II',
          body: 'King Nebuchadnezzar II reigned from 605 to 562 BC, expanding his empire and rebuilding Babylon into an architectural wonder.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'head-bib', col: 'right', row: 0,
          icon: '📖', label: 'SCRIPTURE TEXT',
          body: 'Daniel told the king: “Thou, O king, art a king of kings... Thou art this head of gold.” (Daniel 2:37-38)',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'head-rep', col: 'right', row: 1,
          icon: '🦁', label: 'MATCHING SYMBOL',
          body: 'In Daniel 7:4, Babylon is depicted as a winged lion that is subsequently plucked and given a human heart.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'head-ai', col: 'right', row: 2,
          icon: '🥈', label: 'WHAT FOLLOWED',
          body: 'Babylon fell in 539 BC to the Medo-Persian Empire, represented by the silver chest and arms of the colossus.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      // Silver Chest Nodes
      chest: [
        {
          id: 'chest-bib', col: 'left', row: 0,
          icon: '📖', label: 'SCRIPTURE',
          body: 'Daniel declared that after Babylon would arise another kingdom inferior to it, symbolized by silver arms. (Daniel 2:39)',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'chest-emp', col: 'left', row: 1,
          icon: '🏛️', label: 'MEDO-PERSIAN EMPIRE',
          body: 'The dual kingdom of the Medes and Persians ruled the Near East from 539 to 331 BC following Babylon\'s fall.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'chest-met', col: 'left', row: 2,
          icon: '🥈', label: 'WHY SILVER',
          body: 'Silver signifies Medo-Persia\'s vast coinage and tax revenues, while remaining second to Babylon in cultural splendor.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'chest-evt', col: 'right', row: 0,
          icon: '⚔️', label: 'FALL OF BABYLON',
          body: 'In 539 BC, Cyrus the Great diverted the Euphrates River to enter Babylon by night and end the Chaldean dynasty.',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'chest-par', col: 'right', row: 1,
          icon: '🐻', label: 'PARALLEL BEASTS',
          body: 'Medo-Persia is portrayed in Daniel 7 as a bear raised on one side and in Daniel 8 as a two-horned ram.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'chest-nxt', col: 'right', row: 2,
          icon: '🥉', label: 'WHAT FOLLOWED',
          body: 'Persian rule ended in 331 BC when Alexander the Great of Greece conquered the empire at the Battle of Gaugamela.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      // Bronze Thighs Nodes
      thighs: [
        {
          id: 'thighs-bib', col: 'left', row: 0,
          icon: '📖', label: 'SCRIPTURE',
          body: 'Daniel foresaw a third kingdom of brass that would bear rule over all the earth. (Daniel 2:39)',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'thighs-emp', col: 'left', row: 1,
          icon: '🏛️', label: 'GRECIAN EMPIRE',
          body: 'The Greco-Macedonian Empire established world supremacy from 331 to 168 BC following Alexander\'s rapid conquests.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'thighs-met', col: 'left', row: 2,
          icon: '🥉', label: 'WHY BRONZE',
          body: 'Bronze characterizes the metal armor, breastplates, and shields of the Grecian hoplite phalanxes.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'thighs-evt', col: 'right', row: 0,
          icon: '⚔️', label: 'GAUGAMELA 331 BC',
          body: 'At the Battle of Gaugamela in 331 BC, Alexander shattered the Persian forces of Darius III to claim the east.',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'thighs-par', col: 'right', row: 1,
          icon: '🐆', label: 'PARALLEL BEASTS',
          body: 'Greece corresponds to the four-winged leopard of Daniel 7 and the swift he-goat with a notable horn in Daniel 8.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'thighs-nxt', col: 'right', row: 2,
          icon: '🦿', label: 'WHAT FOLLOWED',
          body: 'Following Alexander\'s death in 323 BC, Greece split into four Hellenistic kingdoms before falling to Rome in 168 BC.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      // Iron Legs Nodes
      legs: [
        {
          id: 'legs-bib', col: 'left', row: 0,
          icon: '📖', label: 'SCRIPTURE',
          body: 'Daniel prophesied a fourth kingdom as strong as iron that breaks in pieces and subdues all things. (Daniel 2:40)',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'legs-emp', col: 'left', row: 1,
          icon: '🏛️', label: 'ROMAN EMPIRE',
          body: 'Imperial Rome dominated the Mediterranean basin from 168 BC until the collapse of the Western empire in AD 476.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'legs-met', col: 'left', row: 2,
          icon: '⚙️', label: 'WHY IRON',
          body: 'Iron signifies Rome\'s unyielding military discipline, legionary swords, and ability to crush all opposing nations.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'legs-evt', col: 'right', row: 0,
          icon: '⚔️', label: 'BATTLE OF PYDNA',
          body: 'Rome established supremacy over the Greek world at the Battle of Pydna in 168 BC, crushing the Macedonian monarchy.',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'legs-par', col: 'right', row: 1,
          icon: '🐉', label: 'PARALLEL BEAST',
          body: 'Daniel 7 depicts Rome as a dreadful beast with great iron teeth that stamped and devoured the ancient world.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'legs-nxt', col: 'right', row: 2,
          icon: '🦶', label: 'WHAT FOLLOWED',
          body: 'Rome was never conquered by a fifth world empire; instead, barbarian migrations divided it into the nations of Europe.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      // Feet of Iron and Clay Nodes
      feet: [
        {
          id: 'feet-bib', col: 'left', row: 0,
          icon: '📖', label: 'SCRIPTURE',
          body: 'Daniel foresaw that the feet of iron and clay meant the kingdom would be divided and partly fragile. (Daniel 2:41-42)',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'feet-emp', col: 'left', row: 1,
          icon: '👑', label: 'DIVIDED KINGDOMS',
          body: 'The division began in AD 476 as barbarian tribes fragmented Western Rome into the separate nations of modern Europe.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'feet-met', col: 'left', row: 2,
          icon: '🏺', label: 'IRON AND CLAY',
          body: 'The brittle mixture depicts European states retaining Roman strength yet unable to fuse into a lasting empire.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'feet-evt', col: 'right', row: 0,
          icon: '📜', label: 'FAILED ALLIANCES',
          body: 'Centuries of dynastic marriages and military campaigns by Charlemagne and Napoleon failed to permanently unite Europe.',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'feet-par', col: 'right', row: 1,
          icon: '🔟', label: 'TEN HORNS',
          body: 'The ten toes of the image match the ten horns of the fourth beast in Daniel 7, representing Western Rome\'s division.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'feet-nxt', col: 'right', row: 2,
          icon: '🪨', label: 'WHAT FOLLOWED',
          body: 'These divided powers will endure until the heavenly stone smites the feet to inaugurate God\'s everlasting kingdom.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      // Azure Altar Dais Nodes
      altar: [
        {
          id: 'altar-rec', col: 'left', row: 0,
          icon: '🏛️', label: 'GALLERY RECONSTRUCTION',
          body: 'This glazed-brick dais is a modern museum reconstruction created to elevate and showcase the colossus of Daniel 2.',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'altar-bab', col: 'left', row: 1,
          icon: '🧱', label: 'BABYLONIAN DAIS',
          body: 'Ancient Babylonian architects built tiered podiums of glazed brick to elevate sacred altars and royal monuments.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'altar-gla', col: 'left', row: 2,
          icon: '🎨', label: 'LAPIS-BLUE GLAZE',
          body: 'Cobalt and copper-glazed bricks formed the distinctive blue facade of Babylon\'s Processional Way and Ishtar Gate.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'altar-bib', col: 'right', row: 0,
          icon: '📖', label: 'SCRIPTURE CONTEXT',
          body: 'After hearing the interpretation of his dream, King Nebuchadnezzar fell prostrate and worshipped God. (Daniel 2:46)',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'altar-rev', col: 'right', row: 1,
          icon: '👑', label: 'GOD OF GODS',
          body: 'The king confessed to Daniel that his God is a Lord of kings and a revealer of secret things. (Daniel 2:47)',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'altar-pur', col: 'right', row: 2,
          icon: '✨', label: 'PEDESTAL FUNCTION',
          body: 'In royal courts, elevated platforms symbolized sovereign power, yet here the dais supports a prophecy of human decline.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      // Stone Kingdom Nodes
      stone: [
        {
          id: 'stone-bib', col: 'left', row: 0,
          icon: '📖', label: 'SCRIPTURE TEXT',
          body: 'A stone cut without hands struck the image upon its feet of iron and clay and broke them to pieces. (Daniel 2:34)',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'stone-div', col: 'left', row: 1,
          icon: '👑', label: 'DIVINE ORIGIN',
          body: 'Cut out of the mountain without human hands, the stone represents God\'s eternal kingdom established by Christ. (Daniel 2:45)',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'stone-tim', col: 'left', row: 2,
          icon: '⏳', label: 'IN THOSE DAYS',
          body: 'Daniel 2:44 foretells that God will set up this kingdom in the days of these divided post-Roman kings.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'stone-imp', col: 'right', row: 0,
          icon: '💥', label: 'STRIKES THE FEET',
          body: 'The stone strikes the feet rather than the head because God\'s kingdom arrives during the divided era, not ancient Babylon.',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'stone-ret', col: 'right', row: 1,
          icon: '☁️', label: 'SECOND COMING',
          body: 'The impact depicts the literal Second Coming of Christ, which obliterates every earthly kingdom and human tyranny.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'stone-mtn', col: 'right', row: 2,
          icon: '⛰️', label: 'GREAT MOUNTAIN',
          body: 'The stone that shattered the image becomes a great mountain that fills the whole earth forever. (Daniel 2:35, 44)',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ],
      lion: [
        {
          id: 'lion-wings', col: 'left', row: 0,
          icon: '🦅', label: 'EAGLE’S WINGS',
          body: 'Babylon’s early conquests were swift until its wings were plucked to humble the proud empire. (Daniel 7:4)',
          anchor: new THREE.Vector3(-0.55, 1.55, 0.35), enabled: true
        },
        {
          id: 'lion-heart', col: 'left', row: 1,
          icon: '❤️', label: 'A MAN’S HEART',
          body: 'The beast was lifted up and given a man’s heart, depicting King Nebuchadnezzar’s restoration after seven years of madness.',
          anchor: new THREE.Vector3(-0.42, 1.1, 0.42), enabled: true
        },
        {
          id: 'lion-gold', col: 'left', row: 2,
          icon: '🟡', label: 'HEAD OF GOLD',
          body: 'The lion corresponds to the golden head of Daniel 2, depicting Babylon as seen from heaven’s perspective.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'lion-bib', col: 'right', row: 0,
          icon: '📖', label: 'DANIEL 7:4',
          body: 'Daniel received this vision of four beasts emerging from the sea during the first year of King Belshazzar of Babylon.',
          anchor: new THREE.Vector3(0.5, 1.5, 0.35), enabled: true
        },
        {
          id: 'lion-gate', col: 'right', row: 1,
          icon: '🏛️', label: 'ISHTAR’S LIONS',
          body: 'Glazed reliefs of striding lions lined Babylon’s Processional Way, matching the prophetic symbol given to Daniel.',
          anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
        },
        {
          id: 'lion-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The golden head and the winged lion depict the same Babylonian empire, whose pride was abased by the God of heaven.',
          anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
        }
      ],
      bear: [
        {
          id: 'bear-side', col: 'left', row: 0,
          icon: '⚖️', label: 'ONE SIDE RAISED',
          body: 'The bear’s lopsided posture illustrates that the Persian half of the Medo-Persian alliance became dominant. (Daniel 7:5)',
          anchor: new THREE.Vector3(-0.45, 1.45, 0.38), enabled: true
        },
        {
          id: 'bear-ribs', col: 'left', row: 1,
          icon: '🦴', label: 'THREE RIBS',
          body: 'The three ribs between its teeth represent Medo-Persia’s three major conquests: Lydia in 546 BC, Babylon in 539 BC, and Egypt in 525 BC.',
          anchor: new THREE.Vector3(-0.5, 1.05, 0.45), enabled: true
        },
        {
          id: 'bear-devour', col: 'left', row: 2,
          icon: '⚔️', label: 'DEVOUR MUCH FLESH',
          body: 'Heaven commands the bear to arise and devour much flesh, portraying expansive imperial conquest permitted by divine providence.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'bear-bib', col: 'right', row: 0,
          icon: '📖', label: 'DANIEL 7:5',
          body: 'The second beast appears as a bear, corresponding directly to the silver chest and arms seen in Daniel 2.',
          anchor: new THREE.Vector3(0.48, 1.45, 0.38), enabled: true
        },
        {
          id: 'bear-silver', col: 'right', row: 1,
          icon: '🛡️', label: 'SILVER PARALLEL',
          body: 'Cyrus the Great captured Babylon in 539 BC and subsequently issued a royal decree permitting the Jewish exiles to return home.',
          anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
        },
        {
          id: 'bear-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The silver arms and the lopsided bear portray the Medo-Persian empire from two complementary prophetic viewpoints.',
          anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
        }
      ],
      leopard: [
        {
          id: 'leo-wings', col: 'left', row: 0,
          icon: '🪽', label: 'FOUR WINGS',
          body: 'The leopard’s four wings depict the extraordinary speed of Alexander the Great’s decade-long conquest of the ancient world. (Daniel 7:6)',
          anchor: new THREE.Vector3(-0.55, 1.4, 0.35), enabled: true
        },
        {
          id: 'leo-heads', col: 'left', row: 1,
          icon: '👑', label: 'FOUR HEADS',
          body: 'After Alexander’s death in 323 BC, his generals, known as the Diadochi, divided the empire into four Hellenistic kingdoms.',
          anchor: new THREE.Vector3(-0.5, 1.05, 0.4), enabled: true
        },
        {
          id: 'leo-bronze', col: 'left', row: 2,
          icon: '🥉', label: 'BRONZE PARALLEL',
          body: 'The four-winged leopard corresponds to the bronze belly and thighs of Daniel 2, depicting the same Grecian empire.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.38), enabled: true
        },
        {
          id: 'leo-bib', col: 'right', row: 0,
          icon: '📖', label: 'DANIEL 7:6',
          body: 'Scripture states that dominion was given to the leopard, showing that heaven guided the rise and fall of world powers.',
          anchor: new THREE.Vector3(0.55, 1.4, 0.35), enabled: true
        },
        {
          id: 'leo-alex', col: 'right', row: 1,
          icon: '⚔️', label: 'GAUGAMELA 331 BC',
          body: 'At the Battle of Gaugamela in 331 BC, Alexander shattered Persian power to establish Greek supremacy over the Near East.',
          anchor: new THREE.Vector3(0.5, 1.05, 0.4), enabled: true
        },
        {
          id: 'leo-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The four wings symbolize Alexander’s swift conquest, while the four heads depict his empire dividing among his four generals.',
          anchor: new THREE.Vector3(0.45, 0.55, 0.4), enabled: true
        }
      ],
      beast: [
        {
          id: 'beast-teeth', col: 'left', row: 0,
          icon: '🦷', label: 'IRON TEETH',
          body: 'The dreadful fourth beast with iron teeth represents Imperial Rome crushing and devouring opposing nations. (Daniel 7:7)',
          anchor: new THREE.Vector3(-0.5, 1.55, 0.4), enabled: true
        },
        {
          id: 'beast-ten', col: 'left', row: 1,
          icon: '🔟', label: 'TEN HORNS',
          body: 'The ten horns correspond to the feet of iron and clay in Daniel 2, representing the divided barbarian realms of Western Rome.',
          anchor: new THREE.Vector3(-0.48, 1.1, 0.42), enabled: true
        },
        {
          id: 'beast-horn', col: 'left', row: 2,
          icon: '📯', label: 'THE LITTLE HORN',
          body: 'A little horn emerges among the ten, uprooting three rival kingdoms: the Heruli, the Vandals, and the Ostrogoths.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'beast-bib', col: 'right', row: 0,
          icon: '📖', label: 'DANIEL 7:8, 25',
          body: 'The little horn speaks arrogant words, persecutes God’s saints, and intends to change religious times and laws for 1,260 prophetic years.',
          anchor: new THREE.Vector3(0.5, 1.5, 0.38), enabled: true
        },
        {
          id: 'beast-span', col: 'right', row: 1,
          icon: '📅', label: '538–1798',
          body: 'The 1,260-year prophetic era began in AD 538 with the fall of the Ostrogoths and concluded in 1798 with the capture of the pope by French forces.',
          anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
        },
        {
          id: 'beast-tak', col: 'right', row: 2,
          icon: '✨', label: 'HEAVENLY COURT',
          body: 'God convenes a heavenly courtroom to judge the persecuting little horn before giving the eternal kingdom to Christ.',
          anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
        }
      ],
      years1260: [
        {
          id: 'y1260-riddle', col: 'left', row: 0,
          icon: '⏳', label: 'TIME + TIMES + HALF',
          body: 'A time is a year, times is two, the dividing of time is a half. 1 + 2 + ½ = 3½ years. (Daniel 7:25)',
          anchor: new THREE.Vector3(-0.48, 1.5, 0.4), enabled: true
        },
        {
          id: 'y1260-days', col: 'left', row: 1,
          icon: '📖', label: '1,260 DAYS',
          body: 'Revelation writes the same span as 1,260 days, a time and times and half a time, and forty-two months. (Revelation 12:6, 14; 13:5)',
          anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
        },
        {
          id: 'y1260-years', col: 'left', row: 2,
          icon: '📅', label: 'YEAR-DAY SCALE',
          body: 'On the scale God appointed in Numbers 14:34 and Ezekiel 4:6, those 1,260 days are 1,260 years — not a 3½-year future man.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'y1260-open', col: 'right', row: 0,
          icon: '⛪', label: 'AD 538',
          body: 'Ostrogoths driven from Rome. Justinian’s grant to the Roman see can operate in the city. Candidate start of the measured reign.',
          anchor: new THREE.Vector3(0.5, 1.5, 0.38), enabled: true
        },
        {
          id: 'y1260-close', col: 'right', row: 1,
          icon: '⚔️', label: 'AD 1798',
          body: 'Berthier takes Pius VI. The 1,260 years close. Revelation 13:3 calls this a deadly wound. The time of the end opens.',
          anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
        },
        {
          id: 'y1260-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The riddle is 3½ years; Scripture equates it with 1,260 days; the year-day scale makes those 1,260 years, 538 to 1798.',
          anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
        }
      ],
      ram: [
        {
          id: 'ram-horns', col: 'left', row: 0,
          icon: '🐏', label: 'TWO HORNS',
          body: 'The two horns represent Media and Persia, with the higher horn showing that Persia arose after Media and became the dominant power. (Daniel 8:3, 20)',
          anchor: new THREE.Vector3(-0.45, 1.5, 0.4), enabled: true
        },
        {
          id: 'ram-push', col: 'left', row: 1,
          icon: '➡️', label: 'WEST, NORTH, SOUTH',
          body: 'The ram pushed westward, northward, and southward, conquering territories until no beast could stand before its military power.',
          anchor: new THREE.Vector3(-0.48, 1.05, 0.42), enabled: true
        },
        {
          id: 'ram-named', col: 'left', row: 2,
          icon: '📖', label: 'NAMED BY GABRIEL',
          body: 'The angel Gabriel explicitly declared in Daniel 8:20 that the two-horned ram represents the kings of Media and Persia.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'ram-silver', col: 'right', row: 0,
          icon: '🛡️', label: 'SILVER PARALLEL',
          body: 'The ram portrays the same Medo-Persian empire represented by the silver chest of Daniel 2 and the lopsided bear of Daniel 7.',
          anchor: new THREE.Vector3(0.48, 1.45, 0.38), enabled: true
        },
        {
          id: 'ram-ulai', col: 'right', row: 1,
          icon: '🌊', label: 'ULAI / SUSA',
          body: 'Daniel received this prophetic vision beside the Ulai River in the fortress city of Susa during the third year of King Belshazzar.',
          anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
        },
        {
          id: 'ram-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'Daniel 8 removes prophetic ambiguity by explicitly identifying the two-horned ram as the Medo-Persian empire.',
          anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
        }
      ],
      goat: [
        {
          id: 'goat-west', col: 'left', row: 0,
          icon: '💨', label: 'FROM THE WEST',
          body: 'The goat moving without touching the ground depicts the swift westward-to-east conquests of Alexander the Great. (Daniel 8:5)',
          anchor: new THREE.Vector3(-0.5, 1.5, 0.38), enabled: true
        },
        {
          id: 'goat-horn', col: 'left', row: 1,
          icon: '📯', label: 'THE NOTABLE HORN',
          body: 'The prominent horn between the goat’s eyes represents Greece’s first supreme monarch, Alexander the Great. (Daniel 8:21)',
          anchor: new THREE.Vector3(-0.48, 1.05, 0.42), enabled: true
        },
        {
          id: 'goat-ram', col: 'left', row: 2,
          icon: '⚔️', label: 'BREAKING THE RAM',
          body: 'The goat charged the ram with furious power at the Battle of Gaugamela in 331 BC, shattering Persian resistance.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'goat-named', col: 'right', row: 0,
          icon: '📖', label: 'KING OF GRECIA',
          body: 'The angel Gabriel explicitly named Greece as the goat, confirming the historicist understanding of biblical prophecy.',
          anchor: new THREE.Vector3(0.5, 1.45, 0.38), enabled: true
        },
        {
          id: 'goat-bronze', col: 'right', row: 1,
          icon: '🥉', label: 'BRONZE PARALLEL',
          body: 'The bronze thighs of Daniel 2, the leopard of Daniel 7, and the charging goat of Daniel 8 all depict the Grecian empire.',
          anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
        },
        {
          id: 'goat-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The notable horn portrays Alexander the Great, whose brilliant conquests ended abruptly with his unexpected death.',
          anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
        }
      ],
      goat_broken: [
        {
          id: 'brk-strong', col: 'left', row: 0,
          icon: '💔', label: 'BROKEN AT ZENITH',
          body: 'The great horn broke at the height of its power when Alexander the Great died suddenly in Babylon in 323 BC. (Daniel 8:8)',
          anchor: new THREE.Vector3(-0.48, 1.5, 0.4), enabled: true
        },
        {
          id: 'brk-four', col: 'left', row: 1,
          icon: '4️⃣', label: 'FOUR NOTABLE ONES',
          body: 'Four general officers divided the empire into separate kingdoms: Cassander, Lysimachus, Seleucus, and Ptolemy. (Daniel 8:22)',
          anchor: new THREE.Vector3(-0.5, 1.05, 0.42), enabled: true
        },
        {
          id: 'brk-heads', col: 'left', row: 2,
          icon: '🐆', label: 'FOUR HEADS',
          body: 'The four horns correspond to the four heads of the leopard in Daniel 7, depicting the division of Greece after Alexander.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'brk-bib', col: 'right', row: 0,
          icon: '📖', label: 'DANIEL 8:8, 22',
          body: 'Gabriel explained that four kingdoms would arise from the Grecian nation, but none would possess Alexander’s personal power.',
          anchor: new THREE.Vector3(0.48, 1.45, 0.38), enabled: true
        },
        {
          id: 'brk-west', col: 'right', row: 1,
          icon: '🛡️', label: 'FALL TO ROME',
          body: 'As the four Hellenistic realms fought among themselves, the rising power of Rome conquered them, culminating at Pydna in 168 BC.',
          anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
        },
        {
          id: 'brk-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'Alexander’s sudden death fragmented Greece into four smaller kingdoms that were ultimately absorbed by Rome.',
          anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
        }
      ],
      goat_horn: [
        {
          id: 'gh-exceed', col: 'left', row: 0,
          icon: '📈', label: 'EXCEEDING GREAT',
          body: 'The little horn expanded toward the south, the east, and the holy land, growing exceeding great as Imperial and papal Rome. (Daniel 8:9)',
          anchor: new THREE.Vector3(-0.48, 1.55, 0.4), enabled: true
        },
        {
          id: 'gh-tamid', col: 'left', row: 1,
          icon: '🕯️', label: 'THE DAILY TAKEN',
          body: 'This power obscured Christ’s daily heavenly priestly ministry, called the tamid in Hebrew, and attacked the sanctuary of God.',
          anchor: new THREE.Vector3(-0.5, 1.1, 0.42), enabled: true
        },
        {
          id: 'gh-end', col: 'left', row: 2,
          icon: '⏳', label: 'THE END TIME',
          body: 'The angel Gabriel declared that the vision reaches to the time of the end, extending far beyond the ancient Syrian king Antiochus IV.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'gh-bib', col: 'right', row: 0,
          icon: '📖', label: 'DANIEL 8:14',
          body: 'Daniel 8:14 foretells that after 2,300 prophetic days, the sanctuary would be cleansed and restored to its rightful state.',
          anchor: new THREE.Vector3(0.5, 1.5, 0.38), enabled: true
        },
        {
          id: 'gh-1844', col: 'right', row: 1,
          icon: '📅', label: '1844',
          body: 'Applying the year-day principle from the Persian decree in 457 BC, the 2,300 prophetic years conclude in 1844.',
          anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
        },
        {
          id: 'gh-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The little horn of Daniel 8 depicts Rome attacking Christ’s heavenly priesthood until the sanctuary is cleansed at the end of the 2,300 days.',
          anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
        }
      ],
      dura: [
        {
          id: 'dura-gold', col: 'left', row: 0,
          icon: '🥇', label: 'ALL GOLD',
          body: 'By covering the entire statue in gold, Nebuchadnezzar defied God’s revelation that Babylon would eventually fall. (Daniel 3:1)',
          anchor: new THREE.Vector3(-0.4, 1.7, 0.4), enabled: true
        },
        {
          id: 'dura-six', col: 'left', row: 1,
          icon: '6️⃣', label: '60 BY 6',
          body: 'The statue measured sixty cubits high and six cubits wide, reflecting Babylonian sexagesimal mathematics and forced devotion.',
          anchor: new THREE.Vector3(-0.45, 1.15, 0.42), enabled: true
        },
        {
          id: 'dura-bow', col: 'left', row: 2,
          icon: '🎵', label: 'THE DECREE',
          body: 'The royal herald commanded all people to bow before the golden image at the sound of the musical instruments or be cast into the fire.',
          anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
        },
        {
          id: 'dura-three', col: 'right', row: 0,
          icon: '🔥', label: 'THE FIERY FURNACE',
          body: 'Shadrach, Meshach, and Abednego remained faithful to God, who delivered them unharmed as a divine fourth figure walked in the furnace.',
          anchor: new THREE.Vector3(0.45, 1.65, 0.38), enabled: true
        },
        {
          id: 'dura-rev', col: 'right', row: 1,
          icon: '📖', label: 'REVELATION 13',
          body: 'The decree to worship the golden image prefigures the end-time testing described in Revelation 13 regarding coerced false worship.',
          anchor: new THREE.Vector3(0.48, 1.1, 0.4), enabled: true
        },
        {
          id: 'dura-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'King Nebuchadnezzar demanded absolute religious conformity, but God miraculously vindicated the three Hebrews who refused to worship his idol.',
          anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
        }
      ],
      ancient: [
        {
          id: 'anc-throne', col: 'left', row: 0,
          icon: '⚖️', label: 'THRONES SET',
          body: 'Daniel saw heavenly thrones placed and the Ancient of Days seated as the celestial court convened. (Daniel 7:9-10)',
          anchor: new THREE.Vector3(-0.42, 1.6, 0.4), enabled: true
        },
        {
          id: 'anc-wool', col: 'left', row: 1,
          icon: '🤍', label: 'HAIR LIKE WOOL',
          body: 'The Ancient of Days appeared with garments white as snow and hair like pure wool, signifying eternal purity and divine wisdom.',
          anchor: new THREE.Vector3(-0.45, 1.1, 0.42), enabled: true
        },
        {
          id: 'anc-fire', col: 'left', row: 2,
          icon: '🔥', label: 'FIERY FLAME',
          body: 'His throne blazed with fiery flames and burning wheels, representing God’s absolute justice and cleansing holiness.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'anc-books', col: 'right', row: 0,
          icon: '📚', label: 'THE BOOKS',
          body: 'The heavenly court sat in session and the books of record were opened to examine the conduct of earthly powers.',
          anchor: new THREE.Vector3(0.48, 1.55, 0.38), enabled: true
        },
        {
          id: 'anc-1844', col: 'right', row: 1,
          icon: '📅', label: 'PRE-ADVENT',
          body: 'In the historicist framework, this pre-advent judicial proceeding began in heaven at the close of the 2,300 prophetic days in 1844.',
          anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
        },
        {
          id: 'anc-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'Earthly empires are judged and stripped of dominion in heaven’s courtroom before Christ receives His everlasting kingdom.',
          anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
        }
      ],
      son: [
        {
          id: 'son-clouds', col: 'left', row: 0,
          icon: '☁️', label: 'CLOUDS OF HEAVEN',
          body: 'One like the Son of man arrives with the clouds of heaven to enter the presence of the Ancient of Days. (Daniel 7:13)',
          anchor: new THREE.Vector3(-0.42, 1.55, 0.4), enabled: true
        },
        {
          id: 'son-title', col: 'left', row: 1,
          icon: '✝️', label: 'SON OF MAN',
          body: 'Jesus frequently referred to Himself as the Son of man, pointing to His role as the divine recipient of this eternal kingdom.',
          anchor: new THREE.Vector3(-0.45, 1.08, 0.42), enabled: true
        },
        {
          id: 'son-kingdom', col: 'left', row: 2,
          icon: '👑', label: 'DOMINION GIVEN',
          body: 'The Son of man is given everlasting dominion, glory, and a kingdom that will never pass away or be destroyed. (Daniel 7:14)',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'son-saints', col: 'right', row: 0,
          icon: '📖', label: 'THE SAINTS',
          body: 'Following the judgment, the saints of the Most High inherit the kingdom and reign under Christ forever.',
          anchor: new THREE.Vector3(0.48, 1.5, 0.38), enabled: true
        },
        {
          id: 'son-stone', col: 'right', row: 1,
          icon: '🪨', label: 'THE STONE',
          body: 'This heavenly transfer of authority corresponds to the stone of Daniel 2 striking the colossus and filling the earth.',
          anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
        },
        {
          id: 'son-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'Jesus receives royal authority before God’s throne in heaven, which will be fully established on earth at His Second Coming.',
          anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
        }
      ],
      stump: [
        {
          id: 'stump-tree', col: 'left', row: 0,
          icon: '🌳', label: 'THE TREE',
          body: 'In Daniel 4, a holy watcher commanded the towering tree of Nebuchadnezzar’s empire to be chopped down to humble the king.',
          anchor: new THREE.Vector3(-0.42, 1.4, 0.4), enabled: true
        },
        {
          id: 'stump-band', col: 'left', row: 1,
          icon: '⛓️', label: 'IRON AND BRASS',
          body: 'A band of iron and bronze bound the tree stump in the earth, ensuring that Nebuchadnezzar’s throne was reserved for his return.',
          anchor: new THREE.Vector3(-0.45, 1.0, 0.42), enabled: true
        },
        {
          id: 'stump-seven', col: 'left', row: 2,
          icon: '7️⃣', label: 'SEVEN TIMES',
          body: 'Seven prophetic times of madness passed over the king until he acknowledged that the Most High rules over all human realms.',
          anchor: new THREE.Vector3(-0.4, 0.5, 0.4), enabled: true
        },
        {
          id: 'stump-beast', col: 'right', row: 0,
          icon: '🐂', label: 'GRASS AS OXEN',
          body: 'Nebuchadnezzar lived among wild beasts and ate grass like oxen until he humbled his heart and praised the God of heaven.',
          anchor: new THREE.Vector3(0.45, 1.35, 0.38), enabled: true
        },
        {
          id: 'stump-gold', col: 'right', row: 1,
          icon: '🟡', label: 'THE HEAD LEARNS',
          body: 'The proud golden head of Babylon learned through personal suffering that earthly monarchs rule solely by divine permission.',
          anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
        },
        {
          id: 'stump-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The banded stump demonstrates God’s mercy, preserving Nebuchadnezzar’s kingdom until the proud monarch learned humility.',
          anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
        }
      ],
      ox_king: [
        {
          id: 'ox-feathers', col: 'left', row: 0,
          icon: '🪶', label: 'EAGLES’ FEATHERS',
          body: 'Daniel 4:33 says his hairs were grown like eagles’ feathers — the golden head wearing a beast’s covering until he lifted his eyes.',
          anchor: new THREE.Vector3(-0.42, 1.45, 0.4), enabled: true
        },
        {
          id: 'ox-claws', col: 'left', row: 1,
          icon: '🦅', label: 'BIRDS’ CLAWS',
          body: 'His nails were like birds’ claws. The sentence is written on the body so the court can see that pride dehumanizes a king.',
          anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
        },
        {
          id: 'ox-seven', col: 'left', row: 2,
          icon: '7️⃣', label: 'SEVEN TIMES',
          body: 'Seven times pass over him among the oxen. The stump is banded so the throne waits; the man must live the grass and the dew.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'ox-dew', col: 'right', row: 0,
          icon: '💧', label: 'DEW OF HEAVEN',
          body: 'His body was wet with the dew of heaven. The field, not the palace roof, becomes the school where the Most High is confessed.',
          anchor: new THREE.Vector3(0.45, 1.4, 0.38), enabled: true
        },
        {
          id: 'ox-stump', col: 'right', row: 1,
          icon: '🌳', label: 'BESIDE THE STUMP',
          body: 'The ironbound stump is the reserved kingdom. This figure is the king who must become like the beasts before he rules again.',
          anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
        },
        {
          id: 'ox-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'A throne is safer in God’s keeping than in a boast. The ox-king learns that heaven assigns every kingdom.',
          anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
        }
      ],
      michael: [
        {
          id: 'mic-prince', col: 'left', row: 0,
          icon: '⚔️', label: 'GREAT PRINCE',
          body: 'Michael is the great prince who stands for the children of Daniel’s people — the same helper named in the unseen war of chapter 10.',
          anchor: new THREE.Vector3(-0.42, 1.5, 0.4), enabled: true
        },
        {
          id: 'mic-stand', col: 'left', row: 1,
          icon: '🕊️', label: 'STANDS UP',
          body: 'A priest sits to minister and stands when the work is finished. Michael standing marks the close of advocacy.',
          anchor: new THREE.Vector3(-0.45, 1.1, 0.42), enabled: true
        },
        {
          id: 'mic-trouble', col: 'left', row: 2,
          icon: '🌩️', label: 'TIME OF TROUBLE',
          body: 'After He stands, there is a time of trouble such as never was since there was a nation — then deliverance.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'mic-book', col: 'right', row: 0,
          icon: '📖', label: 'WRITTEN IN THE BOOK',
          body: 'Those delivered are the ones found written in the book. The last gift of Daniel is a name, not another metal.',
          anchor: new THREE.Vector3(0.45, 1.45, 0.38), enabled: true
        },
        {
          id: 'mic-wake', col: 'right', row: 1,
          icon: '🌅', label: 'DUST-SLEEPERS',
          body: 'Daniel 12:2 promises that many who sleep in the dust of the earth shall awake — some to everlasting life.',
          anchor: new THREE.Vector3(0.48, 1.0, 0.4), enabled: true
        },
        {
          id: 'mic-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The book ends with a Prince who stands, a people written in a book, and a bodily resurrection.',
          anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
        }
      ],
      sealed: [
        {
          id: 'seal-shut', col: 'left', row: 0,
          icon: '🔒', label: 'SHUT UP THE WORDS',
          body: 'Daniel is told to shut up the words. The visions are not a puzzle for every age to reopen at will.',
          anchor: new THREE.Vector3(-0.42, 1.45, 0.4), enabled: true
        },
        {
          id: 'seal-book', col: 'left', row: 1,
          icon: '📜', label: 'SEAL THE BOOK',
          body: 'Seal the book even to the time of the end. Chapter 12:9 repeats that the words are closed up and sealed.',
          anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
        },
        {
          id: 'seal-end', col: 'left', row: 2,
          icon: '⏳', label: 'TIME OF THE END',
          body: 'Understanding waits until the measured spans reach their dates. The wise understand when history meets the numbers.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'seal-run', col: 'right', row: 0,
          icon: '👣', label: 'RUN TO AND FRO',
          body: 'Many shall run to and fro, and knowledge shall be increased — search increases when the seal’s time arrives.',
          anchor: new THREE.Vector3(0.45, 1.4, 0.38), enabled: true
        },
        {
          id: 'seal-wise', col: 'right', row: 1,
          icon: '⭐', label: 'THE WISE',
          body: 'None of the wicked shall understand, but the wise shall understand. The seal is mercy against premature charts.',
          anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
        },
        {
          id: 'seal-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'The scroll stays sealed until the time of the end, then the same book that was shut is opened for the wise.',
          anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
        }
      ],
      kings: [
        {
          id: 'kings-south', col: 'left', row: 0,
          icon: '⬇️', label: 'KING OF THE SOUTH',
          body: 'Daniel 11:5: the king of the south shall be strong. First this is Ptolemaic Egypt after Alexander’s horn is broken.',
          anchor: new THREE.Vector3(-0.42, 1.4, 0.35), enabled: true
        },
        {
          id: 'kings-north', col: 'left', row: 1,
          icon: '⬆️', label: 'KING OF THE NORTH',
          body: 'One of his princes becomes stronger and holds a great dominion — the Seleucid north, then later powers wearing the same title.',
          anchor: new THREE.Vector3(-0.45, 1.05, 0.38), enabled: true
        },
        {
          id: 'kings-march', col: 'left', row: 2,
          icon: '📅', label: 'DATED MARCH',
          body: 'Marriages, betrayals, and wars fill the chapter as a survey of kings, not a new metal in the colossus.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'kings-end', col: 'right', row: 0,
          icon: '🌪️', label: 'TIME OF THE END',
          body: 'At the time of the end the south pushes and the north comes like a whirlwind with chariots, horsemen, and ships.',
          anchor: new THREE.Vector3(0.45, 1.35, 0.35), enabled: true
        },
        {
          id: 'kings-holy', col: 'right', row: 1,
          icon: '⛰️', label: 'HOLY MOUNTAIN',
          body: 'The north plants tabernacles toward the glorious holy mountain, then comes to his end with none to help him.',
          anchor: new THREE.Vector3(0.48, 0.95, 0.38), enabled: true
        },
        {
          id: 'kings-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'North and south are titles that run from the Diadochi to the last contest, then yield to Michael standing up.',
          anchor: new THREE.Vector3(0.42, 0.5, 0.4), enabled: true
        }
      ],
      decree: [
        {
          id: 'dec-king', col: 'left', row: 0,
          icon: '👑', label: 'ARTAXERXES I',
          body: 'Ezra 7 names Artaxerxes king of kings. The seventh year of his reign is the year the fullest restoration decree goes forth.',
          anchor: new THREE.Vector3(-0.42, 1.45, 0.4), enabled: true
        },
        {
          id: 'dec-ezra', col: 'left', row: 1,
          icon: '📜', label: 'EZRA 7:13',
          body: 'I make a decree: whoever of Israel, priests, and Levites is minded to go up to Jerusalem may go. The letter is law, not a wish.',
          anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
        },
        {
          id: 'dec-city', col: 'left', row: 2,
          icon: '🧱', label: 'RESTORE AND BUILD',
          body: 'Daniel 9:25 looks for a commandment that restores Jerusalem as a city — street and wall — not only the temple house.',
          anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
        },
        {
          id: 'dec-weeks', col: 'right', row: 0,
          icon: '7️⃣', label: 'SEVENTY WEEKS',
          body: 'Seventy weeks are cut off from the 2,300 for Daniel’s people and the holy city. The going forth starts both clocks.',
          anchor: new THREE.Vector3(0.45, 1.4, 0.38), enabled: true
        },
        {
          id: 'dec-messiah', col: 'right', row: 1,
          icon: '✝️', label: 'MESSIAH THE PRINCE',
          body: 'Sixty-nine weeks of years from 457 BC reach the anointing of Messiah. The midst of the seventieth week is His cutting off.',
          anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
        },
        {
          id: 'dec-tak', col: 'right', row: 2,
          icon: '✨', label: 'KEY TAKEAWAY',
          body: 'Work 457 + 483 on paper. The decree is why Daniel 9 can name a Person and a date from the same line.',
          anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
        }
      ]
    };

    // Auto-generate generic feature nodes for other pieces if not explicitly listed
    function nodeUnlocked(node, assetKey) {
      if (!window.BAJourney || typeof window.BAJourney.canAccessMuseumNode !== "function") return true;
      return window.BAJourney.canAccessMuseumNode(node.id, assetKey);
    }

    function getNodeDataForAsset(key) {
      let rows;
      if (ASSET_REGISTRY[key] && ASSET_REGISTRY[key].still) rows = [];
      else if (MUSEUM_NODES_DATA[key]) rows = MUSEUM_NODES_DATA[key];
      else {
        const d = ASSET_REGISTRY[key] || ASSET_REGISTRY.head;
        rows = [
          {
            id: `${key}-mat`, col: 'left', row: 0,
            icon: '🟡', label: 'PROPHETIC METAL',
            body: `${d.title} embodying ${d.eyebrow}. Reflected in Daniel 2 prophecy.`,
            anchor: new THREE.Vector3(-0.4, 1.4, 0.35), enabled: true
          },
          {
            id: `${key}-era`, col: 'left', row: 1,
            icon: '📅', label: 'HISTORICAL ERA',
            body: `${d.dates}. Documented across ancient biblical and secular annals.`,
            anchor: new THREE.Vector3(-0.45, 1.05, 0.4), enabled: true
          },
          {
            id: `${key}-geo`, col: 'left', row: 2,
            icon: '🏛️', label: 'GEOMETRY & FORM',
            body: 'Reconstructed 3D geometry with high-fidelity PBR metallic textures.',
            anchor: new THREE.Vector3(-0.45, 0.65, 0.45), enabled: true
          },
          {
            id: `${key}-bib`, col: 'right', row: 0,
            icon: '📖', label: 'SCRIPTURE TEXT',
            body: d.quote,
            anchor: new THREE.Vector3(0.4, 1.4, 0.35), enabled: true
          },
          {
            id: `${key}-emp`, col: 'right', row: 1,
            icon: '👑', label: 'WORLD EMPIRE',
            body: d.explanation,
            anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
          },
          {
            id: `${key}-tak`, col: 'right', row: 2,
            icon: '✨', label: 'KEY TAKEAWAY',
            body: d.takeaway,
            anchor: new THREE.Vector3(0.45, 0.65, 0.45), enabled: true
          }
        ];
      }
      return rows.filter((node) => nodeUnlocked(node, key));
    }

    let currentNodes = getNodeDataForAsset('assembled');
    let masterNodesVisible = true;
    let soloFocusNodeId = null;

    function buildEraTimeline() {
      const track = document.getElementById('era-track');
      if (!track) return;
      const cells = [
        { asset: 'assembled', label: 'COLOSSUS', date: 'Dan 2:31–45', img: 'assets/site/era-assembled.png' },
        { asset: 'head', label: 'GOLD', date: '605–539 BC', img: 'assets/site/era-head.png' },
        { asset: 'chest', label: 'SILVER', date: '539–331 BC', img: 'assets/site/era-chest.png' },
        { asset: 'thighs', label: 'BRONZE', date: '331–168 BC', img: 'assets/site/era-thighs.png' },
        { asset: 'legs', label: 'IRON', date: '168 BC–476 AD', img: 'assets/site/era-legs.png' },
        { asset: 'feet', label: 'IRON & CLAY', date: 'Divided era', img: 'assets/site/era-feet.png' },
        { asset: 'stone', label: 'THE STONE', date: 'Dan 2:34', img: 'assets/site/era-stone.png' },
        { asset: 'lion', label: 'WINGED LION', date: 'Dan 7:4', img: 'assets/site/era-lion.png' },
        { asset: 'bear', label: 'THE BEAR', date: 'Dan 7:5', img: 'assets/site/era-bear.png' },
        { asset: 'leopard', label: 'LEOPARD', date: 'Dan 7:6', img: 'assets/site/era-leopard.png' },
        { asset: 'beast', label: 'FOURTH BEAST', date: 'Dan 7:7', img: 'assets/site/era-beast.png' },
        { asset: 'years1260', label: '1,260 YEARS', date: 'Dan 7:25', img: 'assets/site/era-years1260.png' },
        { asset: 'ram', label: 'THE RAM', date: 'Dan 8:3', img: 'assets/site/era-ram.png' },
        { asset: 'goat', label: 'THE GOAT', date: 'Dan 8:5', img: 'assets/site/era-goat.png' },
        { asset: 'goat_broken', label: 'BROKEN HORN', date: 'Dan 8:8', img: 'assets/site/era-goat_broken.png' },
        { asset: 'goat_horn', label: 'LITTLE HORN', date: 'Dan 8:9', img: 'assets/site/era-goat_horn.png' },
        { asset: 'dura', label: 'DURA', date: 'Dan 3:1', img: 'assets/site/era-dura.png' },
        { asset: 'stump', label: 'THE STUMP', date: 'Dan 4:15', img: 'assets/site/era-stump.png' },
        { asset: 'ox_king', label: 'OX-KING', date: 'Dan 4:33', img: 'assets/site/era-ox_king.png' },
        { asset: 'ancient', label: 'ANCIENT OF DAYS', date: 'Dan 7:9', img: 'assets/site/era-ancient.png' },
        { asset: 'son', label: 'SON OF MAN', date: 'Dan 7:13', img: 'assets/site/era-son.png' },
        { asset: 'decree', label: 'THE DECREE', date: '457 BC', img: 'assets/site/era-decree.png' },
        { asset: 'kings', label: 'NORTH & SOUTH', date: 'Dan 11:5', img: 'assets/site/era-kings.png' },
        { asset: 'michael', label: 'MICHAEL', date: 'Dan 12:1', img: 'assets/site/era-michael.png' },
        { asset: 'sealed', label: 'SEALED BOOK', date: 'Dan 12:4', img: 'assets/site/era-sealed.png' }
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
      document.querySelectorAll('.artifact-card-item').forEach((card) => {
        const hay = `${card.textContent} ${card.dataset.asset}`.toLowerCase();
        card.style.display = !q || hay.includes(q) ? '' : 'none';
      });
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
        return;
      }

      const cardW = 196;
      const leftColX = Math.min(Math.max(258, w * 0.198), 280);
      const rightColX = Math.max(w - 330 - cardW - 18, w * 0.62);
      const rowYPositions = [
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

        pinEl.style.left = `${ax}px`;
        pinEl.style.top = `${ay}px`;
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
      const xOff = portrait ? dist * 0.28 : dist * 0.36;
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
    let explodeAmount = 0;
    let pedestalVisible = false;
    let baseExposure = 1.12;

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

    const MAP_YEAR_FOR_ASSET = {
      head: 'y605', chest: 'y539', thighs: 'y331', legs: 'y168', feet: 'y538',
      stone: 'y1844', assembled: 'y605',
      lion: 'y605', bear: 'y539', leopard: 'y331', beast: 'y538', years1260: 'y538',
      ram: 'y539', goat: 'y331', goat_broken: 'y331', goat_horn: 'y168',
      dura: 'y605', stump: 'y605', ox_king: 'y605',
      ancient: 'y1844', son: 'y1844',
      decree: 'y457', kings: 'y331', michael: 'y12', sealed: 'y12'
    };

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
          selectAsset(key, { instant: true, keepAngle: opts.keepAngle || userHasAimed });
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
      const data = ASSET_REGISTRY[key] || ASSET_REGISTRY.head;
      setHallBackdrop(data.hallImg || HALL_BACKDROPS[key] || data.plateImg);
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
        if (opts.instant) {
          camera.position.set(...data.camPos);
          controls.target.set(...data.lookAt);
          controls.update();
          cameraTween = null;
        } else {
          tweenCamera(new THREE.Vector3(...data.camPos), new THREE.Vector3(...data.lookAt), 1100);
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
    // Timeout wrapper: a hung request must count as a failure or the loading overlay never clears
    function loadGLB(url, onLoad, onError, timeoutMs = 45000) {
      let settled = false;
      let timer = 0;
      const settle = (fn, arg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(arg);
      };
      timer = setTimeout(() => settle(onError, new Error('GLB load timed out: ' + url)), timeoutMs);
      gltfLoader.load(url, (gltf) => settle(onLoad, gltf), undefined, (err) => settle(onError, err));
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
        if (onLoaded) onLoaded(loadedGLTFScenes[key].clone());
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
            if (!loadProgress.heroAssetCounted) {
              loadProgress.heroAssetCounted = true;
              loadProgress.loadedCount++;
              loadProgress.label = `${data.title} mounted`;
              updateLoadingUI();
            }
            if (onLoaded) {
              setTimeout(() => {
                try {
                  onLoaded(model.clone());
                } catch (e) {
                  if (key === 'assembled') markLoadFailure();
                }
              }, 0);
            }
          },
          () => {
            tryLoad(idx + 1);
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

      assembledContainer.clear();
      const fullBody = fullBodySource.clone();

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
    let activeStudyMode = 'lighting';
    applyChiaroscuroRig(true);
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
      if (prev && prev !== child.userData.origMat && prev !== nextMat) {
        disposeMaterial(prev);
      }
      child.material = nextMat;
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
            color: 0xd6cfc4, roughness: 0.85, metalness: 0.05,
            wireframe: false, envMapIntensity: 0.5
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
            if ('roughness' in mat && typeof mat.roughness === 'number') {
              mat.roughness = Math.max(0.18, Math.min(mat.roughness, 0.42));
            }
            if ('envMapIntensity' in mat) mat.envMapIntensity = 0.55;
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

    // Previous / Next artifact arrows
    const artifactOrder = ['assembled', 'head', 'chest', 'thighs', 'legs', 'feet', 'stone', 'lion', 'bear', 'leopard', 'beast', 'years1260', 'ram', 'goat', 'goat_broken', 'goat_horn', 'dura', 'stump', 'ox_king', 'ancient', 'son', 'decree', 'kings', 'michael', 'sealed'];
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
    function startArtifactTour() {
      let i = 0;
      const order = openArtifactKeys().filter((k) => k !== 'altar');
      const step = () => {
        if (i >= order.length) { museumToast('Tour complete'); return; }
        selectAsset(order[i]);
        i += 1;
        setTimeout(step, reducedMotion ? 400 : 2800);
      };
      museumToast('Guided artifact tour');
      step();
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') startArtifactTour();
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
        renderer.toneMappingExposure = baseExposure * (pct / 100);
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

    window.addEventListener('resize', () => {
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
    });

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

    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const cool = document.documentElement.classList.toggle('theme-cool');
        scene.background.set(cool ? 0x05070c : 0x050301);
        scene.fog.color.set(cool ? 0x05070c : 0x050301);
        hallUniforms.cool.value = cool ? 1 : 0;
        hemiLight.color.set(cool ? 0xc9e0ff : 0xffe8c2);
        btnTheme.textContent = cool ? '🌙' : '☀️';
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
      btnMute.addEventListener('click', () => {
        AudioBus.unlock();
        AudioBus.muted = !AudioBus.muted;
        btnMute.classList.toggle('active', AudioBus.muted);
        btnMute.textContent = AudioBus.muted ? '🔇' : '♪';
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

    function animate(now) {
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
        const f1 = 1.0 + 0.18 * Math.sin(elapsed * 12.0) + 0.08 * Math.sin(elapsed * 34.0);
        const f2 = 1.0 + 0.22 * Math.cos(elapsed * 14.5) + 0.07 * Math.cos(elapsed * 29.0);
        torch1.intensity = 14.0 * f1;
        torch2.intensity = 12.0 * f2;
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
      const relCam = camera.position.clone().sub(controls.target);
      relCam.applyAxisAngle(new THREE.Vector3(0, 1, 0), -artifactRoot.rotation.y);
      const azimuthDeg = THREE.MathUtils.radToDeg(Math.atan2(relCam.x, relCam.z));
      const elevLen = relCam.length();
      const elevationDeg = elevLen > 1e-6
        ? THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(relCam.y / elevLen, -1, 1)))
        : 0;

      const azEl = document.getElementById('diag-azimuth');
      const elEl = document.getElementById('diag-elevation');
      if (azEl) azEl.textContent = `${azimuthDeg.toFixed(1)}°`;
      if (elEl) elEl.textContent = `${elevationDeg.toFixed(1)}°`;

      frameCount++;
      if (now - lastFpsTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        const fpsEl = document.getElementById('diag-fps');
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
      syncNodes();
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
