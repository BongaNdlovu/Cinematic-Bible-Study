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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const lowPower = window.innerWidth < 768 || coarsePointer || (navigator.hardwareConcurrency || 8) <= 4;

    // --- THREE.JS SCENE SETUP ---
    const container = document.getElementById('webgl-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070503, 0.024);
    scene.background = new THREE.Color(0x070503);

    const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 1.35, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('tabindex', '0');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D view of the Daniel 2 colossus');

    // Dynamic Room Environment map for rich metallic sheen
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 1.45;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.15, 0);
    controls.minDistance = 2.2;
    controls.maxDistance = 16.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;

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

    // --- CELESTIAL DISCOVERY GLOW DISC (HALO BEHIND PIECE) ---
    function createCelestialHaloTexture() {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 1024;
      const ctx = c.getContext('2d');
      const cx = 512, cy = 512;

      // Radial warm amber celestial aura
      const radGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 500);
      radGlow.addColorStop(0, 'rgba(255, 215, 120, 0.40)');
      radGlow.addColorStop(0.2, 'rgba(229, 167, 66, 0.20)');
      radGlow.addColorStop(0.45, 'rgba(180, 120, 40, 0.08)');
      radGlow.addColorStop(0.75, 'rgba(120, 70, 20, 0.02)');
      radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, 1024, 1024);

      // Concentric rings matching mock
      const rings = [120, 180, 260, 340, 420, 470, 495];
      rings.forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx % 2 === 0 ? 'rgba(255, 215, 120, 0.42)' : 'rgba(229, 167, 66, 0.24)';
        ctx.lineWidth = idx === 3 || idx === 5 ? 2.5 : 1.2;
        ctx.stroke();
      });

      // Prophetic radial tick marks
      for (let deg = 0; deg < 360; deg += 5) {
        const rad = (deg * Math.PI) / 180;
        const isMajor = deg % 30 === 0;
        const isMid = deg % 15 === 0;
        const r1 = isMajor ? 410 : (isMid ? 425 : 435);
        const r2 = 470;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
        ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        ctx.strokeStyle = isMajor ? 'rgba(255, 220, 130, 0.55)' : 'rgba(229, 167, 66, 0.25)';
        ctx.lineWidth = isMajor ? 2.0 : 1.0;
        ctx.stroke();
      }

      // Inner sacred stars / nodes
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 120, 0.7)';
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    const haloTex = createCelestialHaloTexture();
    const haloGeo = new THREE.PlaneGeometry(8.5, 8.5);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85
    });
    const celestialHalo = new THREE.Mesh(haloGeo, haloMat);
    celestialHalo.position.set(0, 1.75, -0.65);
    scene.add(celestialHalo);

    // --- GALLERY EXHIBIT LIGHTING RIG ---
    const ambientLight = new THREE.AmbientLight(0x18120b, 0.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffe8c2, 0x100a05, 0.50);
    scene.add(hemiLight);

    // Focused Key Spotlight on the metal colossus
    const galleryKeySpot = new THREE.SpotLight(0xfffae8, 32, 26, Math.PI / 5.2, 0.42, 1.2);
    galleryKeySpot.position.set(3.2, 5.8, 5.2);
    galleryKeySpot.target.position.set(0, 1.4, 0);
    galleryKeySpot.castShadow = true;
    galleryKeySpot.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
    galleryKeySpot.shadow.bias = -0.0003;
    scene.add(galleryKeySpot);
    scene.add(galleryKeySpot.target);

    // Warm Amber Rim Spotlight from back-left
    const rimAmberSpot = new THREE.SpotLight(0xffb74d, 22, 22, Math.PI / 4, 0.5, 1.0);
    rimAmberSpot.position.set(-3.8, 4.8, -2.8);
    rimAmberSpot.target.position.set(0, 1.5, 0);
    scene.add(rimAmberSpot);
    scene.add(rimAmberSpot.target);

    // Cool Lapis Contrast Fill Light
    const lapisFillLight = new THREE.PointLight(0x528ae8, 5.2, 18);
    lapisFillLight.position.set(-3.5, 1.8, 3.8);
    scene.add(lapisFillLight);

    // Flickering Palace Torches
    const torch1 = new THREE.PointLight(0xffaa33, 14.0, 12);
    torch1.position.set(-3.2, 2.2, 2.5);
    scene.add(torch1);

    const torch2 = new THREE.PointLight(0xff8822, 12.0, 12);
    torch2.position.set(3.2, 2.8, -2.0);
    scene.add(torch2);

    let torchesEnabled = true;

    // --- MUSEUM GALLERY FLOOR & CONTACT SHADOW ---
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f0b07,
      roughness: 0.88,
      metalness: 0.12
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
        museumBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.24, 0.65, 0.82);
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
    function hideLoadingOverlay() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.classList.add('hidden');
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
        dates: '605 BC — Climax of the Age',
        quote: '“Thou, O king, sawest, and behold a great image. This great image, whose brightness was excellent, stood before thee; and the form thereof was terrible.”',
        quoteRef: 'Daniel 2:31 (NKJV)',
        explanation: 'The complete prophetic colossus revealed to King Nebuchadnezzar encompasses the entire timeline of gentile world dominion—from the golden head of Babylon down through the divided feet of iron and clay.',
        historical: 'Daniel interpreted the dream before the royal court of Babylon, announcing that a divine Stone cut without hands would strike the image at its feet, shatter every earthly kingdom, and fill the whole earth forever.',
        plateImg: 'ishtar_gate_babylon.jpg',
        plateCaption: 'The Ishtar Gate & Processional Way · Babylon',
        thumb: 'golden-head-front.png',
        takeaway: 'Earthly empires rise and crumble, but God’s kingdom stands eternal.',
        filename: 'full_body.glb',
        camPos: [0, 1.85, 9.2],
        lookAt: [0, 1.55, 0],
        haloY: 2.8,
        haloScale: 1.2
      },
      head: {
        id: 'head',
        eyebrow: 'NEBUCHADNEZZAR’S',
        title: 'Golden Head',
        pill: 'DANIEL 2:32, 38',
        dates: 'c. 605–539 BC',
        quote: '“Thou art this head of gold.”',
        quoteRef: 'Daniel 2:32, 38 (NKJV)',
        explanation: 'The golden head represents the Babylonian Empire, the first in a series of world empires foretold by God. Babylon was known for its wealth, wisdom, and splendor, which is why gold is used to depict its rule.',
        historical: 'Under Nebuchadnezzar II, Babylon became the greatest city of its time. He expanded his empire, rebuilt the city with magnificent structures, and made Babylon the center of world power.',
        plateImg: 'ishtar_gate_babylon.jpg',
        plateCaption: 'The Ishtar Gate & Processional Way · Babylon',
        thumb: 'golden-head-front.png',
        takeaway: 'Empires rise and fall, but God’s kingdom stands forever.',
        filename: 'golden_head.glb',
        scale: 1.0,
        position: [0, 0.95, 0],
        camPos: [0, 1.22, 4.4],
        lookAt: [0, 1.10, 0],
        haloY: 1.20,
        haloScale: 0.95
      },
      chest: {
        id: 'chest',
        eyebrow: 'MEDO-PERSIAN EMPIRE',
        title: 'Silver Chest & Arms',
        pill: 'DANIEL 2:32, 39',
        dates: 'c. 539–331 BC',
        quote: '“And after thee shall arise another kingdom inferior to thee...”',
        quoteRef: 'Daniel 2:39 (NKJV)',
        explanation: 'The breast and dual arms of silver portray the Medo-Persian alliance under Cyrus the Great and Darius. Silver represents both their vast coinage treasury and their second-tier position in imperial splendor.',
        historical: 'Cyrus conquered Babylon in 539 BC by diverting the Euphrates river. He issued the famous Cyrus Cylinder decree permitting exiled peoples, including the Jews, to return to their homelands and rebuild the Temple.',
        plateImg: 'plates/persia.jpg',
        plateCaption: 'Apadana stairway reliefs · Persepolis',
        thumb: 'plates/persia.jpg',
        takeaway: 'God directs rulers and decrees to preserve His people throughout history.',
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
        dates: 'c. 331–168 BC',
        quote: '“...and another third kingdom of brass, which shall bear rule over all the earth.”',
        quoteRef: 'Daniel 2:39 (NKJV)',
        explanation: 'The belly and thighs of bronze symbolize the swift Greco-Macedonian empire founded by Alexander the Great, sweeping across the Near East with bronze armor and phalanx warfare.',
        historical: 'Alexander conquered from Greece to India in barely a decade. Upon his death, the empire fragmented into four Hellenistic dynasties, spreading the Greek language that later became the vehicle for the New Testament.',
        plateImg: 'plates/greece.jpg',
        plateCaption: 'Bronze hoplite armor · Hellenistic gallery plate',
        thumb: 'plates/greece.jpg',
        takeaway: 'Human conquests pass quickly, but divine providence prepares the nations.',
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
        dates: 'c. 168 BC – 476 AD',
        quote: '“And the fourth kingdom shall be strong as iron: forasmuch as iron breaketh in pieces and subdueth all things...”',
        quoteRef: 'Daniel 2:40 (NKJV)',
        explanation: 'The dual legs of unyielding iron represent Imperial Rome, eventually divided into Western and Eastern halves. Renowned for disciplined legions, iron swords, and road systems spanning three continents.',
        historical: 'Rome established the Pax Romana during which Jesus Christ was born, crucified, and resurrected. Rome\'s legal order and roads enabled the rapid propagation of the Christian gospel.',
        plateImg: 'plates/rome.jpg',
        plateCaption: 'Lorica, gladius, and aquila · Imperial Rome',
        thumb: 'plates/rome.jpg',
        takeaway: 'Even the strongest earthly iron yields to the eternal Kingdom of God.',
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
        dates: 'Post-Roman to Prophetic Climax',
        quote: '“...part of potters\' clay, and part of iron, the kingdom shall be divided; but there shall be in it of the strength of the iron... they shall not cleave one to another.”',
        quoteRef: 'Daniel 2:41-43 (NKJV)',
        explanation: 'The ten feet and toes composed of brittle potter\'s clay mixed with rigid iron denote the fragmented post-Roman world powers—partly strong, partly fragile, continually forming alliances yet never truly bonding.',
        historical: 'Centuries of treaties, dynastic marriages, and political coalitions have failed to reunify the divided realm, exactly matching Daniel\'s prophecy until the end-time Stone strikes.',
        plateImg: 'plates/divided.jpg',
        plateCaption: 'Iron crown and clay shards · divided realms',
        thumb: 'plates/divided.jpg',
        takeaway: 'Man cannot permanently unify divided humanity apart from the Prince of Peace.',
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
        dates: 'c. 1st Millennium BC',
        quote: '“The king answered unto Daniel, and said, Of a truth it is, that your God is a God of gods, and a Lord of kings, and a revealer of secrets...”',
        quoteRef: 'Daniel 2:47 (NKJV)',
        explanation: 'An authentic Mesopotamian glazed lapis-lazuli altar dais with ceremonial tier moldings, designed to elevate sacred royal monuments and votive statues before the palace throne.',
        historical: 'Excavated in the temple precincts of Babylon (Esagila), such glazed azure platforms reflected the celestial blue dome of heaven, symbolizing the divine authorization of kingship.',
        plateImg: 'ishtar_gate_babylon.jpg',
        plateCaption: 'Glazed lapis altar dais · Babylon',
        thumb: 'ishtar_gate_babylon.jpg',
        takeaway: 'Earthly altars bear testimony that the God of Heaven reveals all secrets.',
        filename: 'azure_altar.glb',
        scale: 1.4,
        position: [0, -0.60, 0],
        camPos: [0, 0.7, 4.8],
        lookAt: [0, 0.0, 0],
        haloY: 0.2,
        haloScale: 0.8
      }
    };

    // --- MUSEUM NODES CONFIGURATION ---
    // 6 precision nodes matching the mock layout: 3 on left column, 3 on right column
    const MUSEUM_NODES_DATA = {
      // Complete Assembled Statue Nodes
      assembled: [
        {
          id: 'col-head', col: 'left', row: 0,
          icon: '👑', label: 'HEAD OF GOLD',
          body: 'Neo-Babylonian Empire (605–539 BC). Represents King Nebuchadnezzar II and the supreme golden majesty of Babylon. (Dan 2:38)',
          anchor: new THREE.Vector3(0, 3.25, 0.42), enabled: true
        },
        {
          id: 'col-thighs', col: 'left', row: 1,
          icon: '⚔️', label: 'BRONZE THIGHS',
          body: 'Grecian Empire (331–168 BC). Alexander the Great and Hellenistic phalanxes clad in bronze hoplite armor. (Dan 2:39)',
          anchor: new THREE.Vector3(0, 1.48, 0.45), enabled: true
        },
        {
          id: 'col-feet', col: 'left', row: 2,
          icon: '🦶', label: 'FEET IRON & CLAY',
          body: 'Divided Era. Fragmented kingdoms partly strong and partly brittle that cannot permanently cleave together. (Dan 2:41-43)',
          anchor: new THREE.Vector3(0, 0.25, 0.45), enabled: true
        },
        {
          id: 'col-chest', col: 'right', row: 0,
          icon: '🛡️', label: 'SILVER CHEST',
          body: 'Medo-Persian Empire (539–331 BC). Cyrus the Great and Darius, renowned for vast imperial silver coinage. (Dan 2:39)',
          anchor: new THREE.Vector3(0, 2.38, 0.45), enabled: true
        },
        {
          id: 'col-legs', col: 'right', row: 1,
          icon: '🦿', label: 'LEGS OF IRON',
          body: 'Roman Empire (168 BC – 476 AD). Ruthless military strength that crushed and stamped former world realms. (Dan 2:40)',
          anchor: new THREE.Vector3(0, 0.88, 0.40), enabled: true
        },
        {
          id: 'col-altar', col: 'right', row: 2,
          icon: '🏛️', label: 'AZURE ALTAR DAIS',
          body: 'Carved glazed lapis-lazuli sacred podium upon which the prophetic dream monolith is ceremonially mounted.',
          anchor: new THREE.Vector3(0, -0.42, 1.15), enabled: true
        }
      ],
      // Golden Head Nodes (Exact Mock Replication)
      head: [
        {
          id: 'head-mat', col: 'left', row: 0,
          icon: '🟡', label: 'MATERIAL',
          body: 'Gold represents nobility, wealth, and the supreme kingdom of Babylon in prophetic symbolism.',
          anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
        },
        {
          id: 'head-sig', col: 'left', row: 1,
          icon: '👑', label: 'SIGNIFICANCE',
          body: 'Symbolizes the first great world empire in Daniel\'s vision granted to King Nebuchadnezzar.',
          anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
        },
        {
          id: 'head-fig', col: 'left', row: 2,
          icon: '👤', label: 'HISTORICAL FIGURE',
          body: 'Nebuchadnezzar II (605–562 BC) was the mighty king of Babylon who conquered nations and built a glorious empire.',
          anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
        },
        {
          id: 'head-bib', col: 'right', row: 0,
          icon: '📖', label: 'BIBLICAL CONTEXT',
          body: 'In a dream, King Nebuchadnezzar saw a great image whose head was of fine gold. (Daniel 2:32)',
          anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
        },
        {
          id: 'head-rep', col: 'right', row: 1,
          icon: '🏛️', label: 'REPRESENTS',
          body: 'The Kingdom of Babylon – the head of gold in the great prophetic image.',
          anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
        },
        {
          id: 'head-ai', col: 'right', row: 2,
          icon: '✨', label: 'AI INSIGHT',
          body: 'The golden head reveals that God raises up kings and kingdoms to fulfill His purposes and then sets them aside.',
          anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
        }
      ]
    };

    // Auto-generate generic feature nodes for other pieces if not explicitly listed
    function getNodeDataForAsset(key) {
      if (MUSEUM_NODES_DATA[key]) return MUSEUM_NODES_DATA[key];
      const d = ASSET_REGISTRY[key] || ASSET_REGISTRY.head;
      return [
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

    let currentNodes = getNodeDataForAsset('assembled');
    let masterNodesVisible = true;
    let soloFocusNodeId = null;

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

    function openInsightModal() {
      const data = ASSET_REGISTRY[activeAssetKey] || ASSET_REGISTRY.assembled;
      const title = document.getElementById('insight-modal-title');
      const body = document.getElementById('insight-modal-body');
      const take = document.getElementById('insight-modal-takeaway');
      if (title) title.textContent = `Exhibit insight · ${data.title}`;
      if (body) body.textContent = `${data.explanation} ${data.historical}`;
      if (take) take.textContent = data.takeaway;
      openModal('insight-modal');
    }

    function openAboutModal() {
      openModal('about-modal');
    }

    function openTimelineModal() {
      openModal('timeline-modal');
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
        btnNodesMaster.textContent = masterNodesVisible ? '👁 Nodes: ON' : '👁 Nodes: OFF';
        syncNodes();
        museumToast(masterNodesVisible ? 'Museum Nodes Enabled' : 'Museum Nodes Hidden');
      });
    }

    const _tempVec = new THREE.Vector3();
    function syncNodes() {
      if (!nodesSvg || !camera) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      nodesSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      const hideAll = !masterNodesVisible || w < 1024;
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

      const cardW = w < 1100 ? 180 : 235;
      const leftColX = Math.max(270, w * 0.20);
      const rightColX = Math.min(w - 325 - cardW, w * 0.80 - cardW);
      const rowYPositions = [
        Math.max(100, h * 0.23),
        Math.max(220, h * 0.47),
        Math.max(340, h * 0.70)
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
    let baseExposure = 1.28;

    function selectAsset(key) {
      activeAssetKey = key;
      const data = ASSET_REGISTRY[key] || ASSET_REGISTRY.head;

      // Update Left Rail active state
      document.querySelectorAll('.artifact-card-item').forEach(el => {
        el.classList.toggle('active', el.dataset.asset === key);
      });

      // Update Top Chrome
      const eyebrow = document.getElementById('hero-eyebrow');
      const title = document.getElementById('hero-main-title');
      const pill = document.getElementById('hero-scripture-pill');
      if (eyebrow) eyebrow.textContent = data.eyebrow;
      if (title) title.textContent = data.title;
      if (pill) pill.textContent = data.pill;

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

      // Update Diagnostics
      const diagView = document.getElementById('diag-view');
      if (diagView) diagView.textContent = data.title;

      // Update Celestial Halo position
      if (celestialHalo) {
        celestialHalo.position.y = data.haloY || 1.75;
        const s = data.haloScale || 1.0;
        celestialHalo.scale.set(s, s, s);
      }

      // Rebuild Museum Nodes for this piece
      currentNodes = getNodeDataForAsset(key);
      soloFocusNodeId = null;
      rebuildNodeElements();
      syncNodes();

      // Smooth camera transition to optimal angle
      if (data.camPos && data.lookAt) {
        autoSpin = false;
        const spinBtn = document.getElementById('btn-spin');
        if (spinBtn) {
          spinBtn.classList.remove('active');
          spinBtn.textContent = 'Auto Orbit: OFF';
        }
        const b360 = document.getElementById('btn-museum-360');
        if (b360) b360.classList.remove('active');
        tweenCamera(new THREE.Vector3(...data.camPos), new THREE.Vector3(...data.lookAt), 1100);
      }

      // Display Scene Mesh
      if (key === 'assembled') {
        singleModelContainer.visible = false;
        assembledContainer.visible = true;
        altarPlatformGroup.visible = altarVisible;
        setupAssembledColossus();
        return;
      }

      if (key === 'altar') {
        singleModelContainer.visible = false;
        assembledContainer.visible = false;
        altarPlatformGroup.visible = true;
        return;
      }

      // Individual assets (head, chest, thighs, legs, feet) stand on their own
      assembledContainer.visible = false;
      singleModelContainer.visible = true;
      altarPlatformGroup.visible = false;

      loadGLBAsset(key, (sceneObj) => {
        singleModelContainer.clear();
        currentSingleModel = sceneObj;
        normalizePart(currentSingleModel, 2.35);
        let b = getWorldBox(currentSingleModel);
        let bc = new THREE.Vector3();
        b.getCenter(bc);
        currentSingleModel.position.y += (1.10 - bc.y);
        currentSingleModel.position.x += -bc.x;
        currentSingleModel.position.z += -bc.z;
        singleModelContainer.add(currentSingleModel);
        applyStudyModeToMeshes(singleModelContainer);
        updateTriangleReadout();
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
        if (key === 'assembled') {
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
        gltfLoader.load(
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
          undefined,
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

      // Normalize full body to impressive 3.95m museum height
      normalizePart(fullBody, 3.95);

      const deckY = getAltarDeckLocalY();
      const altarCenter = getAltarCenterXZ();

      fullBody.updateMatrixWorld(true);
      let box = getWorldBox(fullBody);
      const desiredWorldBottom = artifactRoot.localToWorld(new THREE.Vector3(0, deckY, 0)).y;
      fullBody.position.y += (desiredWorldBottom - box.min.y);
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

      if (!loadProgress.assembledCounted) {
        loadProgress.assembledCounted = true;
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
    gltfLoader.load(
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
      undefined,
      () => {
        loadProgress.loadedCount++;
        loadProgress.label = 'Altar missing — using fallback dais';
        updateLoadingUI();
      }
    );


    // --- STUDY RENDER MODES ---
    let activeStudyMode = 'gold';
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
            mat.metalness = 0.95;
            mat.roughness = 0.20;
            replaceMeshMaterial(child, mat);
          } else {
            replaceMeshMaterial(child, new THREE.MeshStandardMaterial({
              color: 0xffffff, roughness: 0.3, metalness: 0.8,
              envMapIntensity: 2.2, wireframe: false
            }));
          }
        }
      });
    }

    function setStudyMode(mode) {
      activeStudyMode = mode;
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      if (assembledContainer.visible) applyStudyModeToMeshes(assembledContainer);
      if (singleModelContainer.visible) applyStudyModeToMeshes(singleModelContainer);
      museumToast(`Render Mode: ${mode.toUpperCase()}`);
    }
    document.querySelectorAll('[data-mode]').forEach(b => {
      b.addEventListener('click', () => setStudyMode(b.dataset.mode));
    });

    // --- CAMERA TWEEN ---
    let cameraTween = null;
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
    let autoSpin = !reducedMotion;

    // Artifact items click
    document.querySelectorAll('.artifact-card-item').forEach(item => {
      item.addEventListener('click', () => selectAsset(item.dataset.asset));
    });

    // Related avatar circles click
    document.querySelectorAll('.related-avatar').forEach(item => {
      item.addEventListener('click', () => selectAsset(item.dataset.rel));
    });

    // Previous / Next artifact arrows
    const artifactOrder = ['assembled', 'head', 'chest', 'thighs', 'legs', 'feet', 'altar'];
    document.getElementById('btn-prev-artifact').addEventListener('click', () => {
      let idx = artifactOrder.indexOf(activeAssetKey);
      idx = (idx - 1 + artifactOrder.length) % artifactOrder.length;
      selectAsset(artifactOrder[idx]);
    });
    document.getElementById('btn-next-artifact').addEventListener('click', () => {
      let idx = artifactOrder.indexOf(activeAssetKey);
      idx = (idx + 1) % artifactOrder.length;
      selectAsset(artifactOrder[idx]);
    });

    // Bottom action bar
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
        museumToast(autoSpin ? '360° Auto Orbit: ON' : '360° Auto Orbit: OFF');
      });
    }

    const btnCompare = document.getElementById('btn-museum-compare');
    if (btnCompare) {
      btnCompare.addEventListener('click', () => {
        const nextMode = activeStudyMode === 'clay' ? 'gold' : 'clay';
        setStudyMode(nextMode);
      });
    }

    const btnAi = document.getElementById('btn-museum-ai');
    if (btnAi) {
      btnAi.addEventListener('click', () => {
        openInsightModal();
      });
    }

    const btnDownload = document.getElementById('btn-museum-download');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        renderer.render(scene, camera);
        const dataURL = renderer.domElement.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `bible-artifacts-${activeAssetKey}.png`;
        a.href = dataURL;
        a.click();
        museumToast('High-Res Exhibit Screenshot Saved!');
      });
    }

    const btnShare = document.getElementById('btn-museum-share');
    if (btnShare) {
      btnShare.addEventListener('click', async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title: 'Daniel 2 Colossus', url });
            return;
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            museumToast('Exhibit link copied');
            return;
          }
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
        museumToast('Copy the address bar to share this exhibit');
      });
    }

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
        scene.background.set(cool ? 0x05070c : 0x070503);
        scene.fog.color.set(cool ? 0x05070c : 0x070503);
        hemiLight.color.set(cool ? 0xc9e0ff : 0xffe8c2);
        btnTheme.textContent = cool ? '🌙' : '☀️';
        btnTheme.classList.toggle('active', cool);
        museumToast(cool ? 'Cool gallery tone' : 'Warm palace tone');
      });
    }
    const btnScripture = document.getElementById('btn-scripture-modal');
    if (btnScripture) btnScripture.addEventListener('click', openScriptureModal);

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        setNavActive(nav);
        if (nav === 'discover' || nav === 'artifacts') {
          closeAllPanels();
          if (nav === 'discover') selectAsset('assembled');
          if (window.innerWidth <= 1024) document.body.classList.add('rail-open');
        } else if (nav === 'timeline') {
          openTimelineModal();
        } else if (nav === 'kingdoms') {
          closeAllPanels();
          selectAsset('head');
          museumToast('Kingdoms · start at the golden head');
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
      if (e.key === 'ArrowRight') document.getElementById('btn-next-artifact')?.click();
      if (e.key === 'ArrowLeft') document.getElementById('btn-prev-artifact')?.click();
      if (e.key === 'n' || e.key === 'N') btnNodesMaster?.click();
      if (e.key === 'l' || e.key === 'L') {
        labDrawer?.classList.toggle('open');
      }
      if (e.key >= '1' && e.key <= '7') {
        selectAsset(artifactOrder[Number(e.key) - 1]);
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
        artifactRoot.rotation.y += dt * 0.18;
      }

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

    // Initialize Default State: Complete Daniel 2 Colossus on Azure Altar
    rebuildNodeElements();
    selectAsset('assembled');
    animate(performance.now());
