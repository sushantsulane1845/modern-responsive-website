import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _zoomDir = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _tempColor = new THREE.Color();
const _skyTargetColor = new THREE.Color();
const _sunTargetColor = new THREE.Color();

const CAMERA_PRESETS = {
  exterior: {
    desktopPos: [14.2, 6.4, 14.8],
    desktopTarget: [-2.4, 1.3, 0.4],
    mobilePos: [15.5, 7.6, 15.5],
    mobileTarget: [0, 1.1, 0],
  },
  courtyard: {
    desktopPos: [5.2, 2.8, 6.1],
    desktopTarget: [-1.3, 1.35, -0.9],
    mobilePos: [5.8, 3.1, 6.6],
    mobileTarget: [-0.8, 1.3, -0.8],
  },
  aerial: {
    desktopPos: [10.8, 16.2, 10.8],
    desktopTarget: [-1.2, 0.6, 0.2],
    mobilePos: [12.0, 18.0, 12.0],
    mobileTarget: [0, 0.6, 0],
  },
};

const MATERIAL_PALETTES = {
  limestone: {
    wallColor: 0xe8e0d2,
    wallRoughness: 0.84,
    accentTimber: 0x946842,
    plinthColor: 0xcec7ba,
  },
  cedar: {
    wallColor: 0x3b342f,
    wallRoughness: 0.76,
    accentTimber: 0x6f4a2d,
    plinthColor: 0x9c9589,
  },
  concrete: {
    wallColor: 0xb6b8b3,
    wallRoughness: 0.89,
    accentTimber: 0x9e7652,
    plinthColor: 0x8e928c,
  },
};

const LIGHTING_MOODS = {
  morning: {
    sky: 0xd9e4dd,
    fogDensity: 0.016,
    sunPos: [18, 21, 14],
    sunColor: 0xfff5e4,
    sunIntensity: 2.45,
    hemiSky: 0xdbe9ed,
    hemiGround: 0x5c5346,
    hemiIntensity: 0.88,
    hearthIntensity: 0.7,
    accentEmissive: 0.15,
    exposure: 1.07,
  },
  golden: {
    sky: 0xdbc5ac,
    fogDensity: 0.018,
    sunPos: [25, 9.0, -10],
    sunColor: 0xffc380,
    sunIntensity: 2.75,
    hemiSky: 0xebd1b3,
    hemiGround: 0x4b4238,
    hemiIntensity: 0.74,
    hearthIntensity: 3.0,
    accentEmissive: 0.9,
    exposure: 1.05,
  },
  twilight: {
    sky: 0x13201a,
    fogDensity: 0.021,
    sunPos: [-16, 12, -14],
    sunColor: 0x8aa8c7,
    sunIntensity: 1.0,
    hemiSky: 0x334c48,
    hemiGround: 0x181c19,
    hemiIntensity: 0.62,
    hearthIntensity: 7.5,
    accentEmissive: 2.2,
    exposure: 1.18,
  },
};

function detectSoftwareWebGL() {
  const probeCanvas = document.createElement('canvas');
  const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpuName = String(gl.getParameter(param) || '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuName);
}

function createProceduralTexture(kind, maxAnisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (kind === 'stone') {
    ctx.fillStyle = '#e0d9cd';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? 'rgba(90, 82, 70, 0.08)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, y, 512, 31);
      ctx.fillStyle = 'rgba(60, 55, 48, 0.14)';
      ctx.fillRect(0, y + 31, 512, 1);
    }
    for (let i = 0; i < 4200; i++) {
      const x = (i * 73) % 512;
      const y = (i * 137) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(55, 50, 44, 0.06)' : 'rgba(255, 252, 245, 0.07)';
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'timber') {
    ctx.fillStyle = '#9a6e46';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = 'rgba(42, 26, 14, 0.16)';
      ctx.fillRect(x, 0, 2, 512);
      for (let g = 0; g < 18; g++) {
        ctx.fillStyle = g % 2 === 0 ? 'rgba(60, 36, 18, 0.07)' : 'rgba(218, 178, 130, 0.06)';
        ctx.fillRect(x + 4 + ((g * 7) % 54), 0, 2, 512);
      }
    }
  } else if (kind === 'ground') {
    ctx.fillStyle = '#5a6a56';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5500; i++) {
      const x = (i * 97) % 512;
      const y = (i * 193) % 512;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(28, 48, 34, 0.16)' : 'rgba(130, 148, 118, 0.12)';
      ctx.fillRect(x, y, 3, 3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function initPavilion3d() {
  const mountEl = document.getElementById('hero3dMount');
  const heroSection = document.getElementById('home');
  const dockEl = document.getElementById('pavilion3dDock');
  const toggleDockBtn = document.getElementById('toggle3dDockBtn');
  if (!mountEl || !heroSection) return null;

  const isSoftwareGl = detectSoftwareWebGL();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
  } catch {
    return null;
  }

  const canvas = renderer.domElement;
  canvas.className = 'hero-3d-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D architectural courtyard pavilion');
  mountEl.appendChild(canvas);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHTING_MOODS.morning.exposure;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const initialMood = LIGHTING_MOODS.morning;
  scene.background = new THREE.Color(initialMood.sky);
  scene.fog = new THREE.FogExp2(initialMood.sky, initialMood.fogDensity);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.25, 160);
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false; // Never hijack vertical page scroll
  controls.enablePan = false;
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.055;
  controls.autoRotate = !isSoftwareGl;
  controls.autoRotateSpeed = 0.52;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 6;
  controls.maxDistance = 28;

  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const stoneTex = createProceduralTexture('stone', maxAniso);
  if (stoneTex) stoneTex.repeat.set(2, 2);
  const timberTex = createProceduralTexture('timber', maxAniso);
  if (timberTex) timberTex.repeat.set(3, 3);
  const groundTex = createProceduralTexture('ground', maxAniso);
  if (groundTex) groundTex.repeat.set(14, 14);

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: MATERIAL_PALETTES.limestone.wallColor,
    map: stoneTex,
    roughness: MATERIAL_PALETTES.limestone.wallRoughness,
    metalness: 0.04,
  });

  const plinthMat = new THREE.MeshStandardMaterial({
    color: MATERIAL_PALETTES.limestone.plinthColor,
    map: stoneTex,
    roughness: 0.88,
    metalness: 0.03,
  });

  const timberMat = new THREE.MeshStandardMaterial({
    color: MATERIAL_PALETTES.limestone.accentTimber,
    map: timberTex,
    roughness: 0.72,
    metalness: 0.04,
  });

  const oakFloorMat = new THREE.MeshStandardMaterial({
    color: 0xb98d60,
    map: timberTex,
    roughness: 0.56,
    metalness: 0.05,
  });

  const bronzeMetalMat = new THREE.MeshStandardMaterial({
    color: 0x262420,
    roughness: 0.28,
    metalness: 0.86,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xddebe4,
    metalness: 0.05,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    ior: 1.5,
    thickness: 0.4,
    transmission: isSoftwareGl ? 0 : 0.74,
    transparent: true,
    opacity: isSoftwareGl ? 0.36 : 1.0,
    depthWrite: false,
  });

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x173a2f,
    roughness: 0.1,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const linenMat = new THREE.MeshStandardMaterial({
    color: 0xf1ede4,
    roughness: 0.92,
    metalness: 0.0,
  });

  const rugMat = new THREE.MeshStandardMaterial({
    color: 0xd8d2c6,
    roughness: 0.96,
    metalness: 0.0,
  });

  const walnutMat = new THREE.MeshStandardMaterial({
    color: 0x4e3626,
    roughness: 0.5,
    metalness: 0.06,
  });

  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffdeb4,
    emissive: 0xffb366,
    emissiveIntensity: initialMood.accentEmissive,
    roughness: 0.3,
  });

  // Ground terrain extending seamlessly into horizon fog
  const terrainGeo = new THREE.PlaneGeometry(150, 150);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a56,
    map: groundTex,
    roughness: 0.95,
    metalness: 0.0,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.y = 0;
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const pavilionGroup = new THREE.Group();
  scene.add(pavilionGroup);

  // 1. Stepped Limestone Plinth & Terrace
  const baseStep = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.16, 10.2), plinthMat);
  baseStep.position.set(0, 0.08, 0);
  baseStep.receiveShadow = true;
  pavilionGroup.add(baseStep);

  const mainPlinth = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.24, 9.6), plinthMat);
  mainPlinth.position.set(0, 0.26, 0);
  mainPlinth.castShadow = true;
  mainPlinth.receiveShadow = true;
  pavilionGroup.add(mainPlinth);

  const deckTerrace = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 4.4), timberMat);
  deckTerrace.position.set(1.6, 0.42, 2.0);
  deckTerrace.receiveShadow = true;
  pavilionGroup.add(deckTerrace);

  // Stepping pavers & warm garden path bollards
  for (let i = 0; i < 4; i++) {
    const paver = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.72), plinthMat);
    paver.position.set(1.6, 0.04, 5.4 + i * 1.15);
    paver.receiveShadow = true;
    pavilionGroup.add(paver);

    const bollardPost = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.11), bronzeMetalMat);
    bollardPost.position.set(i % 2 === 0 ? 0.65 : 2.55, 0.24, 5.4 + i * 1.15);
    bollardPost.castShadow = true;
    pavilionGroup.add(bollardPost);

    const bollardLens = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.09), warmGlowMat);
    bollardLens.position.set(bollardPost.position.x, 0.42, bollardPost.position.z);
    pavilionGroup.add(bollardLens);
  }

  // Reflecting courtyard pool + submerged stepping stones
  const poolBasin = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 3.8), bronzeMetalMat);
  poolBasin.position.set(-2.3, 0.39, 2.2);
  pavilionGroup.add(poolBasin);

  const waterSurface = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.04, 3.55), waterMat);
  waterSurface.position.set(-2.3, 0.43, 2.2);
  waterSurface.receiveShadow = true;
  pavilionGroup.add(waterSurface);

  for (let s = 0; s < 3; s++) {
    const poolPad = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.62), plinthMat);
    poolPad.position.set(-3.1 + s * 0.9, 0.44, 2.35);
    poolPad.receiveShadow = true;
    pavilionGroup.add(poolPad);
  }

  // 2. Interior Oak Floor Slab & Woven Area Rug
  const northFloor = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.05, 4.2), oakFloorMat);
  northFloor.position.set(-0.4, 0.41, -2.1);
  northFloor.receiveShadow = true;
  pavilionGroup.add(northFloor);

  const eastFloor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.05, 4.2), oakFloorMat);
  eastFloor.position.set(2.5, 0.41, 2.1);
  eastFloor.receiveShadow = true;
  pavilionGroup.add(eastFloor);

  const livingRug = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.025, 2.5), rugMat);
  livingRug.position.set(-2.2, 0.445, -2.1);
  livingRug.receiveShadow = true;
  pavilionGroup.add(livingRug);

  // 3. Structural Stone & Timber Walls
  const addWall = (w, h, d, x, y, z, mat = wallMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pavilionGroup.add(mesh);
    return mesh;
  };

  addWall(10.2, 3.1, 0.42, -0.4, 1.93, -4.1);
  addWall(0.42, 3.1, 4.4, -5.3, 1.93, -2.1);
  addWall(0.42, 3.1, 8.6, 4.5, 1.93, 0.0);
  // Sculpted Limestone Chimney & Hearth Pier
  addWall(1.75, 4.2, 1.15, -3.4, 2.44, -3.55);

  // Fireplace mantel & firebox embers
  const mantelShelf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.34), walnutMat);
  mantelShelf.position.set(-3.4, 1.48, -2.92);
  pavilionGroup.add(mantelShelf);

  const firebox = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.68, 0.28), bronzeMetalMat);
  firebox.position.set(-3.4, 0.9, -2.92);
  pavilionGroup.add(firebox);

  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xff8a3c,
    emissive: 0xff6b21,
    emissiveIntensity: 1.9,
    roughness: 0.4,
  });
  const embers = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.16), emberMat);
  embers.position.set(-3.4, 0.68, -2.86);
  pavilionGroup.add(embers);

  // 4. Bronze Mullions & Glazing Curtain Walls
  const addGlassWall = (w, h, x, y, z, rotY = 0) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), glassMat);
    glassPane.renderOrder = 2;
    group.add(glassPane);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.08, 0.1), bronzeMetalMat);
    topRail.position.y = h / 2;
    group.add(topRail);

    const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.08, 0.1), bronzeMetalMat);
    bottomRail.position.y = -h / 2;
    group.add(bottomRail);

    const postCount = Math.max(2, Math.round(w / 1.55) + 1);
    for (let i = 0; i < postCount; i++) {
      const px = -w / 2 + (w / (postCount - 1)) * i;
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.11), bronzeMetalMat);
      mullion.position.x = px;
      mullion.castShadow = true;
      group.add(mullion);
    }
    pavilionGroup.add(group);
  };

  addGlassWall(7.1, 2.95, -1.65, 1.92, -0.05, 0);
  addGlassWall(4.0, 2.95, 0.55, 1.92, 2.05, Math.PI / 2);

  // 5. Instanced Cedar Louver Privacy Screen & Courtyard Pergola Beams
  const louverCount = 18;
  const louverGeo = new THREE.BoxGeometry(0.06, 2.95, 0.18);
  const louverInst = new THREE.InstancedMesh(louverGeo, timberMat, louverCount);
  louverInst.castShadow = true;
  louverInst.receiveShadow = true;
  for (let i = 0; i < louverCount; i++) {
    _dummy.position.set(0.65 + i * 0.21, 1.92, 4.15);
    _dummy.rotation.set(0, 0.25, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    louverInst.setMatrixAt(i, _dummy.matrix);
  }
  louverInst.computeBoundingSphere();
  pavilionGroup.add(louverInst);

  // Cantilevered Courtyard Pergola Beams
  const pergolaCount = 9;
  const pergolaBeamGeo = new THREE.BoxGeometry(2.6, 0.16, 0.08);
  const pergolaInst = new THREE.InstancedMesh(pergolaBeamGeo, timberMat, pergolaCount);
  pergolaInst.castShadow = true;
  for (let i = 0; i < pergolaCount; i++) {
    _dummy.position.set(-0.7, 3.48, 0.25 + i * 0.42);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    pergolaInst.setMatrixAt(i, _dummy.matrix);
  }
  pergolaInst.computeBoundingSphere();
  pavilionGroup.add(pergolaInst);

  // 6. Interior Furniture (visible through glass & when roof is exploded)
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.36, 0.96), linenMat);
  sofaBase.position.set(-2.35, 0.64, -1.45);
  sofaBase.castShadow = true;
  pavilionGroup.add(sofaBase);

  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.42, 0.22), linenMat);
  sofaBack.position.set(-2.35, 0.9, -1.06);
  pavilionGroup.add(sofaBack);

  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.24, 0.72), walnutMat);
  coffeeTable.position.set(-2.35, 0.58, -2.45);
  coffeeTable.castShadow = true;
  pavilionGroup.add(coffeeTable);

  // Architectural floor lamp
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.55, 8), bronzeMetalMat);
  lampStem.position.set(-0.85, 1.22, -1.35);
  pavilionGroup.add(lampStem);

  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 0.28, 12),
    warmGlowMat
  );
  lampShade.position.set(-0.85, 2.02, -1.35);
  pavilionGroup.add(lampShade);

  // Dining table & 4 sculpted chairs
  const diningTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 2.35), walnutMat);
  diningTop.position.set(2.55, 1.14, 1.75);
  diningTop.castShadow = true;
  pavilionGroup.add(diningTop);

  const diningBase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.7, 1.25), bronzeMetalMat);
  diningBase.position.set(2.55, 0.78, 1.75);
  pavilionGroup.add(diningBase);

  const chairOffsets = [
    [-0.92, -0.55],
    [-0.92, 0.55],
    [0.92, -0.55],
    [0.92, 0.55],
  ];
  chairOffsets.forEach(([ox, oz]) => {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), walnutMat);
    chairSeat.position.set(2.55 + ox, 0.65, 1.75 + oz);
    chairSeat.castShadow = true;
    pavilionGroup.add(chairSeat);
  });

  // 7. Cantilevered Roof & Exposed Structural Joists Group (Explodable!)
  const roofGroup = new THREE.Group();
  pavilionGroup.add(roofGroup);

  const northRoofDeck = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 5.6), timberMat);
  northRoofDeck.position.set(-0.4, 3.6, -2.0);
  northRoofDeck.castShadow = true;
  northRoofDeck.receiveShadow = true;
  roofGroup.add(northRoofDeck);

  const northRoofFascia = new THREE.Mesh(new THREE.BoxGeometry(11.54, 0.28, 5.74), bronzeMetalMat);
  northRoofFascia.position.set(-0.4, 3.76, -2.0);
  northRoofFascia.castShadow = true;
  roofGroup.add(northRoofFascia);

  // Warm linear soffit cove strip under north roof
  const soffitStrip = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.04, 0.1), warmGlowMat);
  soffitStrip.position.set(-1.6, 3.47, 0.22);
  roofGroup.add(soffitStrip);

  // Exposed interior oak ceiling joists attached to roofGroup
  const joistGeo = new THREE.BoxGeometry(0.14, 0.18, 5.2);
  const joistInst = new THREE.InstancedMesh(joistGeo, walnutMat, 8);
  for (let i = 0; i < 8; i++) {
    _dummy.position.set(-4.6 + i * 1.25, 3.42, -2.0);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    joistInst.setMatrixAt(i, _dummy.matrix);
  }
  joistInst.computeBoundingSphere();
  roofGroup.add(joistInst);

  const eastRoofDeck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 5.4), timberMat);
  eastRoofDeck.position.set(2.5, 3.6, 2.2);
  eastRoofDeck.castShadow = true;
  roofGroup.add(eastRoofDeck);

  const eastRoofFascia = new THREE.Mesh(new THREE.BoxGeometry(5.34, 0.28, 5.54), bronzeMetalMat);
  eastRoofFascia.position.set(2.5, 3.76, 2.2);
  eastRoofFascia.castShadow = true;
  roofGroup.add(eastRoofFascia);

  const skylightFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 1.6), bronzeMetalMat);
  skylightFrame.position.set(0.4, 3.96, -2.0);
  roofGroup.add(skylightFrame);

  const skylightGlass = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.08, 1.3), glassMat);
  skylightGlass.position.set(0.4, 4.06, -2.0);
  roofGroup.add(skylightGlass);

  // 8. Surrounding Pacific Northwest Evergreen & Moss Clusters (InstancedMesh)
  const treeCount = 30;
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 2.2, 7);
  trunkGeo.translate(0, 1.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3a2e, roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  trunkInst.castShadow = true;

  const canopyGeo = new THREE.ConeGeometry(1.38, 4.7, 8);
  canopyGeo.translate(0, 3.85, 0);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x264835, roughness: 0.88 });
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  canopyInst.castShadow = true;
  canopyInst.receiveShadow = true;

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.14;
    const radius = 12.5 + (i % 5) * 3.8;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    const s = 0.85 + ((i * 37) % 30) / 100;

    _dummy.position.set(tx, 0, tz);
    _dummy.rotation.set(0, angle, 0);
    _dummy.scale.set(s, s * (0.9 + (i % 4) * 0.12), s);
    _dummy.updateMatrix();
    trunkInst.setMatrixAt(i, _dummy.matrix);
    canopyInst.setMatrixAt(i, _dummy.matrix);

    const shade = 0.82 + ((i * 19) % 35) / 100;
    _tempColor.setRGB(0.14 * shade, 0.3 * shade, 0.21 * shade);
    canopyInst.setColorAt(i, _tempColor);
  }
  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  scene.add(trunkInst);
  scene.add(canopyInst);

  // Courtyard specimen tree
  const specimenTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.13, 1.65, 8),
    trunkMat
  );
  specimenTrunk.position.set(-2.3, 1.2, -0.72);
  specimenTrunk.castShadow = true;
  pavilionGroup.add(specimenTrunk);

  const specimenCrown = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.95, 1),
    new THREE.MeshStandardMaterial({ color: 0x3b6346, roughness: 0.85 })
  );
  specimenCrown.position.set(-2.3, 2.3, -0.72);
  specimenCrown.scale.set(1.25, 0.72, 1.15);
  specimenCrown.castShadow = true;
  pavilionGroup.add(specimenCrown);

  // Lighting Rig (<= 3 shadow casters: only Sun casts shadows)
  const hemiLight = new THREE.HemisphereLight(
    initialMood.hemiSky,
    initialMood.hemiGround,
    initialMood.hemiIntensity
  );
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(initialMood.sunColor, initialMood.sunIntensity);
  sunLight.position.set(...initialMood.sunPos);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 65;
  sunLight.shadow.camera.left = -16;
  sunLight.shadow.camera.right = 16;
  sunLight.shadow.camera.top = 16;
  sunLight.shadow.camera.bottom = -16;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xcde0d8, 0.45);
  fillLight.position.set(-14, 10, 12);
  scene.add(fillLight);

  const hearthLight = new THREE.PointLight(0xffa458, initialMood.hearthIntensity, 14, 1.8);
  hearthLight.position.set(-3.2, 1.5, -2.2);
  scene.add(hearthLight);

  // State & Smooth Transitions
  let isExploded = false;
  let currentRoofY = 0;
  let targetRoofY = 0;
  let currentMoodKey = 'morning';
  let isTransitioning = false;
  let camTransitionActive = false;

  const isMobileLayout = () => window.innerWidth < 992;

  function applyPresetImmediately(key) {
    const preset = CAMERA_PRESETS[key] || CAMERA_PRESETS.exterior;
    const pos = isMobileLayout() ? preset.mobilePos : preset.desktopPos;
    const tgt = isMobileLayout() ? preset.mobileTarget : preset.desktopTarget;
    camera.position.set(pos[0], pos[1], pos[2]);
    controls.target.set(tgt[0], tgt[1], tgt[2]);
    _targetCamPos.copy(camera.position);
    _targetLookAt.copy(controls.target);
    controls.update();
  }

  function setCameraPreset(key) {
    const preset = CAMERA_PRESETS[key] || CAMERA_PRESETS.exterior;
    const pos = isMobileLayout() ? preset.mobilePos : preset.desktopPos;
    const tgt = isMobileLayout() ? preset.mobileTarget : preset.desktopTarget;
    _targetCamPos.set(pos[0], pos[1], pos[2]);
    _targetLookAt.set(tgt[0], tgt[1], tgt[2]);
    camTransitionActive = true;
    isTransitioning = true;
    requestRender();
  }

  function stepZoom(factor) {
    _zoomDir.subVectors(camera.position, controls.target);
    const currentDist = _zoomDir.length();
    const nextDist = THREE.MathUtils.clamp(
      currentDist * factor,
      controls.minDistance,
      controls.maxDistance
    );
    _zoomDir.normalize().multiplyScalar(nextDist);
    _targetCamPos.copy(controls.target).add(_zoomDir);
    _targetLookAt.copy(controls.target);
    camTransitionActive = true;
    isTransitioning = true;
    requestRender();
  }

  function setMaterialPalette(key) {
    const palette = MATERIAL_PALETTES[key] || MATERIAL_PALETTES.limestone;
    wallMat.color.setHex(palette.wallColor);
    wallMat.roughness = palette.wallRoughness;
    timberMat.color.setHex(palette.accentTimber);
    plinthMat.color.setHex(palette.plinthColor);
    requestRender();
  }

  function setLightingMood(key) {
    currentMoodKey = key;
    isTransitioning = true;
    requestRender();
  }

  function toggleExplodeRoof() {
    isExploded = !isExploded;
    targetRoofY = isExploded ? 2.75 : 0;
    isTransitioning = true;
    requestRender();
    return isExploded;
  }

  // Coalesced Render Loop with Software WebGL afterDraw Pacing
  let frameId = 0;
  let renderBusy = false;
  let renderDirty = false;
  let lastTime = performance.now();
  let disposed = false;

  function afterDraw(cb) {
    const gl = renderer.getContext();
    if (!gl || !('fenceSync' in gl)) {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const gl2 = /** @type {WebGL2RenderingContext} */ (gl);
    const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl2.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl2.deleteSync(sync);
        return;
      }
      const state = sync ? gl2.getSyncParameter(sync, gl2.SYNC_STATUS) : gl2.SIGNALED;
      if (state === gl2.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl2.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function stepTransitions(delta) {
    let stillMoving = false;

    if (Math.abs(currentRoofY - targetRoofY) > 0.004) {
      currentRoofY = THREE.MathUtils.damp(currentRoofY, targetRoofY, 5.5, delta);
      roofGroup.position.y = currentRoofY;
      stillMoving = true;
    } else if (currentRoofY !== targetRoofY) {
      currentRoofY = targetRoofY;
      roofGroup.position.y = currentRoofY;
    }

    if (camTransitionActive) {
      const distPos = camera.position.distanceTo(_targetCamPos);
      const distTgt = controls.target.distanceTo(_targetLookAt);
      if (distPos > 0.03 || distTgt > 0.02) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5.0, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5.0, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5.0, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5.0, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5.0, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5.0, delta);
        stillMoving = true;
      } else {
        camera.position.copy(_targetCamPos);
        controls.target.copy(_targetLookAt);
        camTransitionActive = false;
      }
    }

    const mood = LIGHTING_MOODS[currentMoodKey] || LIGHTING_MOODS.morning;
    _skyTargetColor.setHex(mood.sky);
    _sunTargetColor.setHex(mood.sunColor);

    if (
      scene.background instanceof THREE.Color &&
      (Math.abs(scene.background.r - _skyTargetColor.r) > 0.004 ||
        Math.abs(sunLight.intensity - mood.sunIntensity) > 0.02 ||
        Math.abs(hearthLight.intensity - mood.hearthIntensity) > 0.04 ||
        Math.abs(warmGlowMat.emissiveIntensity - mood.accentEmissive) > 0.02)
    ) {
      const alpha = 1 - Math.exp(-4.5 * delta);
      scene.background.lerp(_skyTargetColor, alpha);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background);
        scene.fog.density = THREE.MathUtils.damp(scene.fog.density, mood.fogDensity, 4.5, delta);
      }
      sunLight.color.lerp(_sunTargetColor, alpha);
      sunLight.position.x = THREE.MathUtils.damp(sunLight.position.x, mood.sunPos[0], 4.5, delta);
      sunLight.position.y = THREE.MathUtils.damp(sunLight.position.y, mood.sunPos[1], 4.5, delta);
      sunLight.position.z = THREE.MathUtils.damp(sunLight.position.z, mood.sunPos[2], 4.5, delta);
      sunLight.intensity = THREE.MathUtils.damp(sunLight.intensity, mood.sunIntensity, 4.5, delta);
      hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, mood.hemiIntensity, 4.5, delta);
      hearthLight.intensity = THREE.MathUtils.damp(
        hearthLight.intensity,
        mood.hearthIntensity,
        4.5,
        delta
      );
      warmGlowMat.emissiveIntensity = THREE.MathUtils.damp(
        warmGlowMat.emissiveIntensity,
        mood.accentEmissive,
        4.5,
        delta
      );
      renderer.toneMappingExposure = THREE.MathUtils.damp(
        renderer.toneMappingExposure,
        mood.exposure,
        4.5,
        delta
      );
      stillMoving = true;
    }

    isTransitioning = stillMoving;
  }

  function requestRender() {
    if (disposed) return;
    if (renderBusy) {
      renderDirty = true;
      return;
    }
    renderBusy = true;
    frameId = requestAnimationFrame((now) => {
      if (disposed) return;
      renderDirty = false;
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      stepTransitions(delta);
      const dampingMoved = controls.update();
      renderer.render(scene, camera);

      const done = () => {
        renderBusy = false;
        if (renderDirty || isTransitioning || dampingMoved || controls.autoRotate) {
          requestRender();
        }
      };

      if (isSoftwareGl) afterDraw(done);
      else done();
    });
  }

  function handleResize() {
    const width = mountEl.clientWidth || heroSection.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || heroSection.clientHeight || 640;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    requestRender();
  }

  handleResize();
  applyPresetImmediately('exterior');
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }
  requestRender();

  const orbitToggleBtn = document.getElementById('autoOrbitBtn');
  if (orbitToggleBtn) {
    orbitToggleBtn.classList.toggle('is-active', controls.autoRotate);
    orbitToggleBtn.setAttribute('aria-pressed', String(controls.autoRotate));
    if (isSoftwareGl) {
      orbitToggleBtn.classList.add('d-none');
    }
    orbitToggleBtn.addEventListener('click', () => {
      if (isSoftwareGl) return;
      controls.autoRotate = !controls.autoRotate;
      orbitToggleBtn.classList.toggle('is-active', controls.autoRotate);
      orbitToggleBtn.setAttribute('aria-pressed', String(controls.autoRotate));
      if (controls.autoRotate) requestRender();
    });
  }

  controls.addEventListener('start', () => {
    camTransitionActive = false;
    if (controls.autoRotate) {
      controls.autoRotate = false;
      if (orbitToggleBtn) {
        orbitToggleBtn.classList.remove('is-active');
        orbitToggleBtn.setAttribute('aria-pressed', 'false');
      }
    }
  });

  controls.addEventListener('change', () => {
    requestRender();
  });

  window.addEventListener('resize', handleResize);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(frameId);
    mountEl.classList.add('is-webgl-lost');
  });

  canvas.addEventListener('webglcontextrestored', () => {
    mountEl.classList.remove('is-webgl-lost');
    requestRender();
  });

  // Wire Bottom Control Dock Buttons
  if (dockEl) {
    const cameraButtons = dockEl.querySelectorAll('[data-cam-preset]');
    cameraButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-cam-preset') || 'exterior';
        cameraButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        setCameraPreset(key);
      });
    });

    const zoomInBtn = document.getElementById('zoomIn3dBtn');
    const zoomOutBtn = document.getElementById('zoomOut3dBtn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => stepZoom(0.8));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => stepZoom(1.25));

    const materialButtons = dockEl.querySelectorAll('[data-mat-preset]');
    materialButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-mat-preset') || 'limestone';
        materialButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        setMaterialPalette(key);
      });
    });

    const moodButtons = dockEl.querySelectorAll('[data-mood-preset]');
    moodButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-mood-preset') || 'morning';
        moodButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        setLightingMood(key);
      });
    });

    const explodeBtn = document.getElementById('explodeRoofBtn');
    if (explodeBtn) {
      explodeBtn.addEventListener('click', () => {
        const active = toggleExplodeRoof();
        explodeBtn.classList.toggle('is-active', active);
        explodeBtn.setAttribute('aria-pressed', String(active));
        const label = explodeBtn.querySelector('.explode-label');
        if (label) {
          label.textContent = active ? 'Assemble Roof' : 'Explode Roof';
        }
      });
    }

    if (toggleDockBtn) {
      const dockPanel = document.getElementById('pavilion3dDockPanel');
      toggleDockBtn.addEventListener('click', () => {
        const collapsed = dockEl.classList.toggle('is-collapsed');
        toggleDockBtn.setAttribute('aria-expanded', String(!collapsed));
        if (dockPanel) dockPanel.setAttribute('aria-hidden', String(collapsed));
        const textSpan = toggleDockBtn.querySelector('.dock-toggle-text');
        if (textSpan) {
          textSpan.textContent = collapsed ? 'Show 3D Studio' : 'Hide 3D Studio';
        }
      });
    }
  }

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    },
  };
}
