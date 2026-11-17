import * as THREE from 'three';
import { R, EARTH_SHADE, EARTH_NIGHT, SUN } from '/js/pages/map/globe-math.js';
import { ATMOS_VERT, ATMOS_FRAG, HAZE_VERT, HAZE_FRAG, graticule } from '/js/pages/map/globe-math.js';

export function buildGlobeBase(deps) {
  const { container, dpr, phone } = deps;
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
  scene.add(new THREE.AmbientLight(0xdfe6ff, 0.22));
  const sun = new THREE.DirectionalLight(0xfff0d8, 4.2);
  sun.position.copy(SUN);
  camera.add(sun);
  camera.add(sun.target);

  const segs = phone ? 64 : 128;
  const earthMat = new THREE.MeshPhongMaterial({
    color: 0x0c1a26,
    specular: new THREE.Color(0x5a6f86),
    shininess: 30
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, segs, segs), earthMat);
  scene.add(earth);

  const sky = { cloudMap: { value: null }, cloudShift: { value: 0 }, cloudFade: { value: 1 } };
  earthMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sky);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D cloudMap;\nuniform float cloudShift;\nuniform float cloudFade;")
      .replace("#include <color_fragment>", EARTH_SHADE)
      .replace("#include <emissivemap_fragment>", EARTH_NIGHT);
  };
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf4f6fb, transparent: true, opacity: 0.9, depthWrite: false });
  const clouds = new THREE.Mesh(earth.geometry, cloudMat);
  clouds.scale.setScalar(1.006);
  clouds.renderOrder = 1;
  clouds.visible = false;
  scene.add(clouds);
  return { renderer, pinLayer, scene, camera, segs, earthMat, earth, sky, cloudMat, clouds };
}

export function buildGlobeSky(deps) {
  const { phone, scene, segs } = deps;
  const sunView = SUN.clone();
  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.004, segs, segs),
    new THREE.ShaderMaterial({
      vertexShader: HAZE_VERT,
      fragmentShader: HAZE_FRAG,
      uniforms: { sunDir: { value: sunView } },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  haze.renderOrder = 10;
  scene.add(haze);

  const grid = graticule();
  scene.add(grid);

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

  const stars = new THREE.Group();
  [[phone ? 700 : 1500, 1.1, 0.55, 0xdcd6c8], [phone ? 90 : 180, 2.2, 0.9, 0xfff1cc]].forEach(([count, size, opacity, color]) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(60 + Math.random() * 30);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    stars.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: color, size: size, sizeAttenuation: false, transparent: true, opacity: opacity, depthWrite: false })));
  });
  scene.add(stars);
  return { haze, grid, atmos, stars };
}
