import * as THREE from 'three';

// --- PROCEDURAL SOFT-FOCUS STONE RELIEF HALL BACKDROP ---
export function createStoneReliefCanvas() {
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

// Large atmospheric mural on the back wall — fills the black behind the small frames.
export const HALL_BACKDROPS = {
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

export const WALL_FRAMES = [
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

// --- CELESTIAL DISCOVERY GLOW DISC (HALO BEHIND PIECE) ---
export function createCelestialHaloTexture() {
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

export const ICONS = {
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v14c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-14c-3.8 0-6.3.5-8 2z"/><path d="M12 6.5v14"/></svg>',
  nodes: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/></svg>',
  title: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  lab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>'
};
