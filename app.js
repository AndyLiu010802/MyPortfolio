import * as THREE from "./vendor/three/three.module.js";
import { GLTFLoader } from "./vendor/three/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.querySelector("#scene");
const cursorCanvas = document.querySelector("#cursor-fx");
const cursorCtx = cursorCanvas?.getContext("2d", { alpha: true });
const brandButton = document.querySelector(".brand-model");
const brandCanvas = document.querySelector("#brand-model-canvas");
const brandEffectLayer = document.querySelector(".brand-effect-layer");
const heroCard = document.querySelector(".hero-copy");
const typewriterTargets = [...document.querySelectorAll("[data-typewriter]")];
const navLinks = [...document.querySelectorAll(".site-nav a[data-room]")];
const siteNav = document.querySelector(".site-nav");
const contactSection = document.querySelector("#contact");
const contactDoor = document.querySelector(".contact-door");
const contactRoom = document.querySelector("#contact-room");
const contactRoomClose = document.querySelector(".contact-room-close");
const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const lerp = THREE.MathUtils.lerp;
const smoothstep = (value) => value * value * (3 - 2 * value);
const maxScenePixelRatio = () => (window.innerWidth < 700 ? 1.15 : 1.65);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxScenePixelRatio()));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf2e8d9, 0.022);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 90);
const lookTarget = new THREE.Vector3();
const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let activeScene = "home";
let scrollProgress = 0;
let contactDoorHover = false;
let contactRoomOpen = false;
let contactRoomClosing = false;
let contactTransitionProgress = 0;
let contactRestoreFocusOnClose = true;
let hoveredSocialLink = null;

const contactEntryStartPosition = new THREE.Vector3();
const contactEntryStartTarget = new THREE.Vector3();
const corridorCameraPosition = new THREE.Vector3();
const corridorCameraTarget = new THREE.Vector3();
const contactAlignPosition = new THREE.Vector3();
const contactAlignTarget = new THREE.Vector3();
const contactInsidePosition = new THREE.Vector3();
const contactInsideTarget = new THREE.Vector3();
const contactCameraPosition = new THREE.Vector3();
const contactCameraTarget = new THREE.Vector3();

const socialLinks = [
  { id: "github", label: "GitHub", short: "GH", url: "https://github.com/AndyLiu010802", color: "#071126", model: "./3d_github_logo.glb", modelFit: 0.98, modelRotation: [0, 0, 0] },
  { id: "linkedin", label: "LinkedIn", short: "in", url: "https://www.linkedin.com/in/yao-liu-0a8ab2228/", color: "#19b8ff", model: "./3d_linkedin_logo.glb", modelFit: 0.98, modelRotation: [0, 0, 0] }
];

const socialRoomLayout = [
  { x: -1.22, y: 0.24, z: -48.95 },
  { x: 1.22, y: 0.24, z: -48.95 }
];

const cursorFx = {
  particles: [],
  lastX: window.innerWidth * 0.5,
  lastY: window.innerHeight * 0.5,
  down: false,
  hue: 13,
  spawnTrail(x, y, drag = false) {
    if (!cursorCtx || reducedMotion) return;
    const count = drag ? 7 : 2;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = drag ? 1.8 + Math.random() * 3.6 : 0.4 + Math.random() * 1.2;
      this.particles.push({
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.8,
        life: drag ? 1 : 0.72,
        size: drag ? 3 + Math.random() * 8 : 2 + Math.random() * 4,
        kind: drag && Math.random() > 0.44 ? "shard" : "dot",
        color: drag
          ? (Math.random() > 0.5 ? "255,112,67" : "25,184,255")
          : (Math.random() > 0.55 ? "7,17,38" : "255,112,67"),
        spin: (Math.random() - 0.5) * 0.18
      });
    }
    if (this.particles.length > 180) {
      this.particles.splice(0, this.particles.length - 180);
    }
  },
  burst(x, y) {
    if (!cursorCtx || reducedMotion) return;
    for (let i = 0; i < 26; i += 1) {
      this.spawnTrail(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, true);
    }
  },
  draw(delta) {
    if (!cursorCtx) return;
    const width = cursorCanvas.width / Math.max(1, window.devicePixelRatio);
    const height = cursorCanvas.height / Math.max(1, window.devicePixelRatio);
    cursorCtx.clearRect(0, 0, width, height);
    cursorCtx.lineCap = "round";
    cursorCtx.lineJoin = "round";

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.px = p.x;
      p.py = p.y;
      p.x += p.vx * (delta * 60);
      p.y += p.vy * (delta * 60);
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 0.018 * (delta * 60);
      p.life -= delta * (p.kind === "shard" ? 0.62 : 0.9);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, p.life);
      cursorCtx.globalAlpha = alpha * 0.74;
      cursorCtx.strokeStyle = `rgba(${p.color}, ${alpha})`;
      cursorCtx.fillStyle = `rgba(${p.color}, ${alpha})`;

      if (p.kind === "shard") {
        cursorCtx.save();
        cursorCtx.translate(p.x, p.y);
        cursorCtx.rotate(p.life * 5 + p.spin);
        cursorCtx.beginPath();
        cursorCtx.moveTo(-p.size * 0.42, -p.size * 0.22);
        cursorCtx.lineTo(p.size * 0.48, -p.size * 0.08);
        cursorCtx.lineTo(p.size * 0.2, p.size * 0.38);
        cursorCtx.closePath();
        cursorCtx.fill();
        cursorCtx.restore();
      } else {
        cursorCtx.lineWidth = Math.max(1, p.size * 0.38);
        cursorCtx.beginPath();
        cursorCtx.moveTo(p.px, p.py);
        cursorCtx.lineTo(p.x, p.y);
        cursorCtx.stroke();
        cursorCtx.beginPath();
        cursorCtx.arc(p.x, p.y, p.size * 0.36, 0, Math.PI * 2);
        cursorCtx.fill();
      }
    }

    cursorCtx.globalAlpha = this.down ? 0.42 : 0.24;
    cursorCtx.strokeStyle = this.down ? "rgba(255,112,67,0.72)" : "rgba(7,17,38,0.36)";
    cursorCtx.lineWidth = this.down ? 2 : 1.2;
    cursorCtx.beginPath();
    cursorCtx.arc(this.lastX, this.lastY, this.down ? 18 : 10, 0, Math.PI * 2);
    cursorCtx.stroke();
    cursorCtx.globalAlpha = 1;
  }
};

const sections = [...document.querySelectorAll("[data-scene]")];

const palette = {
  ink: 0x071126,
  graphite: 0x353b46,
  paper: 0xf5efe4,
  paperLight: 0xfff8ed,
  cyan: 0x19b8ff,
  coral: 0xff7043,
  green: 0x8bd66f,
  violet: 0x6158ff,
  amber: 0xf4b84b,
  skin: 0xefb28c,
  hair: 0x553521
};

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.68,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  });
}

function loadTexture(path, repeat = null) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

const textures = {
  paper: loadTexture("./assets/generated/paper-grain.webp", [4, 4]),
  wall: loadTexture("./assets/generated/sketch-wall.webp", [3.5, 8]),
  projectWeb: loadTexture("./assets/projects/sandwich-home.webp"),
  projectProperty: loadTexture("./assets/projects/south-property-home.webp"),
  projectJewelry: loadTexture("./assets/projects/jewelry-sale-home.png"),
  avatar: loadTexture("./assets/avatar/andy-avatar.png")
};

const mats = {
  floor: material(0xf3e2c7, { roughness: 0.92 }),
  wall: material(0xf1e7d8, { roughness: 0.9 }),
  ink: material(palette.ink, { roughness: 0.52 }),
  graphite: material(palette.graphite, { roughness: 0.82 }),
  cyan: material(palette.cyan, { emissive: palette.cyan, emissiveIntensity: 0.32 }),
  coral: material(palette.coral, { emissive: palette.coral, emissiveIntensity: 0.2 }),
  green: material(palette.green, { emissive: palette.green, emissiveIntensity: 0.18 }),
  violet: material(palette.violet, { emissive: palette.violet, emissiveIntensity: 0.18 }),
  amber: material(palette.amber, { emissive: palette.amber, emissiveIntensity: 0.12 }),
  paper: material(palette.paperLight, { roughness: 0.88 }),
  skin: material(palette.skin, { roughness: 0.76 }),
  hair: material(palette.hair, { roughness: 0.8 }),
  white: material(0xffffff, { roughness: 0.5 })
};

mats.floor.map = textures.paper;
mats.floor.needsUpdate = true;
mats.wall.map = textures.wall;
mats.wall.needsUpdate = true;

const hemi = new THREE.HemisphereLight(0xffffff, 0x6e7a88, 2.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.7);
sun.position.set(4, 7, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -10;
scene.add(sun);

const blueLight = new THREE.PointLight(palette.cyan, 1.4, 20);
blueLight.position.set(-2.8, 2.7, -12);
scene.add(blueLight);

const coralLight = new THREE.PointLight(palette.coral, 0.9, 18);
coralLight.position.set(3.2, 2.2, -25);
scene.add(coralLight);

function mesh(geometry, mat, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1, 32, 32),
  sphere: new THREE.SphereGeometry(1, 32, 18),
  sphereLow: new THREE.SphereGeometry(1, 18, 12),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 32),
  capsule: new THREE.CapsuleGeometry(1, 1, 8, 18),
  torus: new THREE.TorusGeometry(1, 0.08, 12, 64)
};

function makeLabelTexture(lines, accent = "#ff7043") {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 1024;
  canvas2d.height = 512;
  const ctx = canvas2d.getContext("2d");
  ctx.fillStyle = "#fff8ed";
  ctx.fillRect(0, 0, canvas2d.width, canvas2d.height);
  ctx.fillStyle = "rgba(7,17,38,0.08)";
  for (let i = 0; i < 220; i += 1) {
    const x = Math.random() * canvas2d.width;
    const y = Math.random() * canvas2d.height;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.strokeStyle = "rgba(7,17,38,0.22)";
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, canvas2d.width - 56, canvas2d.height - 56);
  ctx.strokeStyle = "rgba(7,17,38,0.08)";
  ctx.lineWidth = 2;
  for (let x = 96; x < canvas2d.width - 96; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 88);
    ctx.lineTo(x, canvas2d.height - 90);
    ctx.stroke();
  }
  for (let y = 112; y < canvas2d.height - 92; y += 58) {
    ctx.beginPath();
    ctx.moveTo(72, y);
    ctx.lineTo(canvas2d.width - 72, y);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(62, 72, 130, 8);
  ctx.fillRect(62, canvas2d.height - 82, canvas2d.width - 124, 10);
  ctx.fillStyle = "rgba(7,17,38,0.12)";
  ctx.fillRect(canvas2d.width - 190, 68, 118, 52);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(canvas2d.width - 98, 94, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#071126";
  ctx.font = "900 66px Arial";
  ctx.fillText(lines[0], 62, 164);
  ctx.font = "700 34px Arial";
  ctx.fillStyle = "rgba(7,17,38,0.7)";
  lines.slice(1).forEach((line, index) => {
    ctx.fillText(line, 62, 238 + index * 48);
  });
  const texture = new THREE.CanvasTexture(canvas2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function canvasRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function makeContactSignTexture() {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 1024;
  canvas2d.height = 384;
  const ctx = canvas2d.getContext("2d");
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);

  ctx.fillStyle = "rgba(255,248,237,0.94)";
  ctx.beginPath();
  canvasRoundRect(ctx, 68, 76, 888, 232, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(7,17,38,0.22)";
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.strokeStyle = "rgba(7,17,38,0.08)";
  ctx.lineWidth = 2;
  for (let x = 132; x < 920; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 104);
    ctx.lineTo(x, 280);
    ctx.stroke();
  }
  for (let y = 126; y < 280; y += 44) {
    ctx.beginPath();
    ctx.moveTo(104, y);
    ctx.lineTo(920, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,112,67,0.94)";
  ctx.fillRect(164, 122, 696, 9);
  ctx.fillStyle = "rgba(25,184,255,0.72)";
  ctx.fillRect(236, 258, 552, 7);

  ctx.fillStyle = "#071126";
  ctx.font = "950 108px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CONTACT ME", 512, 198);

  const texture = new THREE.CanvasTexture(canvas2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeKnockTexture() {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 512;
  canvas2d.height = 192;
  const ctx = canvas2d.getContext("2d");
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);

  ctx.fillStyle = "rgba(255,248,237,0.86)";
  ctx.beginPath();
  canvasRoundRect(ctx, 42, 44, 428, 92, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(7,17,38,0.2)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,112,67,0.94)";
  ctx.beginPath();
  ctx.arc(84, 90, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#071126";
  ctx.font = "900 46px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("knock, knock!", 270, 91);

  ctx.strokeStyle = "rgba(25,184,255,0.78)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(68, 154);
  ctx.lineTo(132, 154);
  ctx.moveTo(380, 28);
  ctx.lineTo(444, 28);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeContactPaperTexture() {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 1024;
  canvas2d.height = 640;
  const ctx = canvas2d.getContext("2d");
  ctx.fillStyle = "#fff8ed";
  ctx.fillRect(0, 0, canvas2d.width, canvas2d.height);

  ctx.fillStyle = "rgba(7,17,38,0.06)";
  for (let i = 0; i < 260; i += 1) {
    ctx.fillRect(Math.random() * canvas2d.width, Math.random() * canvas2d.height, 1.4, 1.4);
  }

  ctx.strokeStyle = "rgba(7,17,38,0.18)";
  ctx.lineWidth = 7;
  ctx.strokeRect(42, 42, canvas2d.width - 84, canvas2d.height - 84);
  ctx.strokeStyle = "rgba(25,184,255,0.26)";
  ctx.lineWidth = 3;
  for (let y = 210; y < 520; y += 58) {
    ctx.beginPath();
    ctx.moveTo(118, y);
    ctx.lineTo(canvas2d.width - 118, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,112,67,0.92)";
  ctx.fillRect(118, 122, 246, 12);
  ctx.fillStyle = "rgba(25,184,255,0.82)";
  ctx.fillRect(118, 548, 520, 10);

  ctx.fillStyle = "#071126";
  ctx.textBaseline = "top";
  ctx.font = "950 74px Arial";
  ctx.fillText("CONTACT ROOM", 118, 86);
  ctx.font = "800 38px Arial";
  ctx.fillStyle = "rgba(7,17,38,0.78)";
  ctx.fillText("Choose a floating link", 118, 202);
  ctx.fillText("or start with a short brief.", 118, 260);

  ctx.font = "700 34px Arial";
  ctx.fillStyle = "rgba(7,17,38,0.64)";
  ctx.fillText("Email", 118, 382);
  ctx.fillStyle = "#071126";
  ctx.font = "900 44px Arial";
  ctx.fillText("andyliu010802@gmail.com", 118, 428);

  const texture = new THREE.CanvasTexture(canvas2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createKnockBurst(index) {
  const placements = [
    [-1.72, 2.64, -0.08],
    [1.62, 2.46, 0.06],
    [-1.42, 1.46, 0.08],
    [1.48, 1.42, -0.05],
    [0.12, 2.94, 0.02]
  ];
  const [x, y, rotation] = placements[index % placements.length];
  const group = new THREE.Group();
  group.position.set(x, y, 0.18);
  group.rotation.z = rotation;

  const label = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({
      map: makeKnockTexture(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    [0, 0, 0],
    [1.22, 0.46, 1]
  );
  label.castShadow = false;
  label.receiveShadow = false;
  group.add(label);

  const rayMat = new THREE.MeshBasicMaterial({
    color: index % 2 === 0 ? palette.coral : palette.cyan,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  [
    [-0.56, -0.38, -0.45, 0.24],
    [-0.66, 0.34, 0.52, 0.2],
    [0.58, -0.32, 0.42, 0.2],
    [0.68, 0.28, -0.46, 0.26]
  ].forEach(([rayX, rayY, rayRot, rayW]) => {
    const ray = mesh(geo.box, rayMat.clone(), [rayX, rayY, 0.02], [rayW, 0.035, 0.02], [0, 0, rayRot]);
    ray.castShadow = false;
    ray.receiveShadow = false;
    group.add(ray);
  });

  group.userData = {
    baseX: x,
    baseY: y,
    baseZ: 0.18,
    phaseOffset: index * 0.22
  };
  return group;
}

function createContactPortal() {
  const group = new THREE.Group();
  group.name = "ContactPortal";
  group.position.set(0, 0, -41.82);

  const wallWidth = 7.2;
  const wallHeight = 4.2;
  const plateWidth = 2.92;
  const plateHeight = 0.94;
  const plateY = 2.05;

  const wallMaterial = mats.wall.clone();
  wallMaterial.map = textures.wall;
  wallMaterial.needsUpdate = true;
  const wallPanel = mesh(geo.plane, wallMaterial, [0, wallHeight / 2, 0.018], [wallWidth, wallHeight, 1]);
  wallPanel.receiveShadow = true;

  const interior = new THREE.Group();
  interior.name = "ContactRoomInterior";

  const passageWidth = 1.88;
  const passageDepth = 3.15;
  const passageHeight = 2.58;
  const roomWidth = 7.6;
  const roomDepth = 8.8;
  const roomHeight = 4.1;
  const roomCenterZ = -(passageDepth + roomDepth / 2);
  const roomBackZ = -(passageDepth + roomDepth);

  const passageFloorMat = mats.floor.clone();
  passageFloorMat.map = textures.paper;
  passageFloorMat.needsUpdate = true;
  const passageWallMat = mats.wall.clone();
  passageWallMat.map = textures.wall;
  passageWallMat.needsUpdate = true;
  const roomFloorMat = mats.floor.clone();
  roomFloorMat.map = textures.paper;
  roomFloorMat.needsUpdate = true;
  const roomWallMat = material(0xf4eadc, { roughness: 0.92 });
  roomWallMat.map = textures.wall;
  roomWallMat.needsUpdate = true;
  const roomCeilingMat = material(0xfff8ed, { transparent: true, opacity: 0.74, roughness: 0.94 });

  const passageFloor = mesh(geo.plane, passageFloorMat, [0, 0.012, -passageDepth / 2], [passageWidth, passageDepth, 1], [-Math.PI / 2, 0, 0]);
  const passageCeiling = mesh(geo.plane, roomCeilingMat.clone(), [0, passageHeight, -passageDepth / 2], [passageWidth, passageDepth, 1], [Math.PI / 2, 0, 0]);
  const passageLeft = mesh(geo.plane, passageWallMat, [-passageWidth / 2, passageHeight / 2, -passageDepth / 2], [passageDepth, passageHeight, 1], [0, Math.PI / 2, 0]);
  const passageRight = mesh(geo.plane, passageWallMat.clone(), [passageWidth / 2, passageHeight / 2, -passageDepth / 2], [passageDepth, passageHeight, 1], [0, -Math.PI / 2, 0]);

  const roomFloor = mesh(geo.plane, roomFloorMat, [0, 0.01, roomCenterZ], [roomWidth, roomDepth, 1], [-Math.PI / 2, 0, 0]);
  const roomCeiling = mesh(geo.plane, roomCeilingMat.clone(), [0, roomHeight, roomCenterZ], [roomWidth, roomDepth, 1], [Math.PI / 2, 0, 0]);
  const roomLeft = mesh(geo.plane, roomWallMat, [-roomWidth / 2, roomHeight / 2, roomCenterZ], [roomDepth, roomHeight, 1], [0, Math.PI / 2, 0]);
  const roomRight = mesh(geo.plane, roomWallMat.clone(), [roomWidth / 2, roomHeight / 2, roomCenterZ], [roomDepth, roomHeight, 1], [0, -Math.PI / 2, 0]);
  const roomBack = mesh(geo.plane, roomWallMat.clone(), [0, roomHeight / 2, roomBackZ], [roomWidth, roomHeight, 1]);

  const paperMaterial = new THREE.MeshBasicMaterial({
    map: makeContactPaperTexture(),
    transparent: true,
    opacity: 0.96,
    side: THREE.FrontSide
  });
  const messagePaper = mesh(geo.plane, paperMaterial, [0, 2.12, roomBackZ + 0.04], [3.55, 2.2, 1]);
  messagePaper.castShadow = false;
  messagePaper.receiveShadow = false;

  const paperClipMat = material(palette.coral, {
    roughness: 0.48,
    emissive: palette.coral,
    emissiveIntensity: 0.26
  });
  const paperClip = mesh(geo.box, paperClipMat, [0, 3.37, roomBackZ + 0.09], [0.72, 0.08, 0.06]);

  const roomGlow = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    [0, 1.85, roomBackZ + 0.035],
    [roomWidth * 0.78, roomHeight * 0.72, 1]
  );
  roomGlow.castShadow = false;
  roomGlow.receiveShadow = false;

  const roomLight = new THREE.PointLight(palette.cyan, 0.7, 7.5);
  roomLight.position.set(0, 2.15, roomCenterZ + 0.9);
  const paperLight = new THREE.PointLight(palette.coral, 0.45, 5);
  paperLight.position.set(0, 2.45, roomBackZ + 1.3);
  interior.add(
    passageFloor,
    passageCeiling,
    passageLeft,
    passageRight,
    roomFloor,
    roomCeiling,
    roomLeft,
    roomRight,
    roomBack,
    roomGlow,
    messagePaper,
    paperClip,
    roomLight,
    paperLight
  );

  const plateGroup = new THREE.Group();
  plateGroup.position.set(0, plateY, 0.11);
  const plateFrameMat = material(0x121a28, {
    roughness: 0.58,
    metalness: 0.02,
    emissive: 0x071126,
    emissiveIntensity: 0.12
  });
  const plateBack = mesh(geo.box, plateFrameMat, [0, 0, 0], [plateWidth + 0.28, plateHeight + 0.22, 0.13]);
  const signMaterial = new THREE.MeshBasicMaterial({
    map: makeContactSignTexture(),
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const plateFace = mesh(geo.plane, signMaterial, [0, 0, 0.076], [plateWidth, plateHeight, 1]);
  plateFace.castShadow = false;
  plateFace.receiveShadow = false;
  const plateGlow = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    [0, 0, 0.052],
    [plateWidth + 0.62, plateHeight + 0.48, 1]
  );
  plateGlow.castShadow = false;
  plateGlow.receiveShadow = false;
  const plateTopLine = mesh(
    geo.box,
    material(palette.coral, { emissive: palette.coral, emissiveIntensity: 0.3, roughness: 0.48 }),
    [0, plateHeight / 2 + 0.16, 0.088],
    [plateWidth * 0.74, 0.035, 0.04]
  );
  const plateBottomLine = mesh(
    geo.box,
    material(palette.cyan, { emissive: palette.cyan, emissiveIntensity: 0.28, roughness: 0.48 }),
    [0, -(plateHeight / 2 + 0.16), 0.088],
    [plateWidth * 0.52, 0.028, 0.04]
  );
  plateGroup.add(plateGlow, plateBack, plateFace, plateTopLine, plateBottomLine);

  const knockBursts = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    knockBursts.add(createKnockBurst(i));
  }

  const hitbox = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    [0, plateY, 0.24],
    [plateWidth + 0.72, plateHeight + 0.82, 1]
  );
  hitbox.castShadow = false;
  hitbox.receiveShadow = false;
  hitbox.name = "ContactDoorHitbox";

  const doorLight = new THREE.PointLight(palette.cyan, 0.55, 4.2);
  doorLight.position.set(0, plateY, 0.62);

  group.add(interior, wallPanel, plateGroup, knockBursts, hitbox, doorLight);
  group.userData = {
    hitbox,
    plateGroup,
    plateGlow,
    signMaterial,
    knockBursts,
    interior,
    roomLight,
    paperLight,
    doorLight,
    hover: false,
    open: false
  };

  return group;
}

function makeSocialIconTexture(item) {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 512;
  canvas2d.height = 512;
  const ctx = canvas2d.getContext("2d");
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);

  ctx.fillStyle = "rgba(255,248,237,0.92)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(56, 56, 400, 400, 72);
  } else {
    ctx.moveTo(128, 56);
    ctx.lineTo(384, 56);
    ctx.quadraticCurveTo(456, 56, 456, 128);
    ctx.lineTo(456, 384);
    ctx.quadraticCurveTo(456, 456, 384, 456);
    ctx.lineTo(128, 456);
    ctx.quadraticCurveTo(56, 456, 56, 384);
    ctx.lineTo(56, 128);
    ctx.quadraticCurveTo(56, 56, 128, 56);
  }
  ctx.fill();
  ctx.strokeStyle = item.color;
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.fillStyle = item.color;
  ctx.font = item.id === "linkedin" ? "950 190px Arial" : "950 132px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.short, 256, 260);

  ctx.strokeStyle = "rgba(7,17,38,0.18)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(128, 392);
  ctx.lineTo(384, 392);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas2d);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createFallbackSocialBadge(item) {
  const faceMat = new THREE.MeshBasicMaterial({
    map: makeSocialIconTexture(item),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const badge = mesh(geo.plane, faceMat, [0, 0, 0], [0.78, 0.78, 1]);
  badge.renderOrder = 9;
  badge.castShadow = false;
  badge.receiveShadow = false;
  return badge;
}

function loadSocialGltfModel(item, modelRoot) {
  gltfLoader.load(
    item.model,
    (gltf) => {
      const object = gltf.scene;
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          mat.side = THREE.DoubleSide;
          mat.needsUpdate = true;
        });
      });

      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const fitScale = (item.modelFit ?? 1) / maxAxis;
      object.scale.setScalar(fitScale);
      object.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);

      const fitted = new THREE.Group();
      fitted.rotation.set(...(item.modelRotation ?? [0, 0, 0]));
      fitted.add(object);
      modelRoot.clear();
      modelRoot.add(fitted);
      modelRoot.userData.loaded = true;
    },
    undefined,
    () => {
      modelRoot.clear();
      modelRoot.add(createFallbackSocialBadge(item));
      modelRoot.userData.loaded = false;
    }
  );
}

function createSocialModel(item, index) {
  const group = new THREE.Group();

  const shadow = mesh(
    geo.cylinder,
    material(0x071126, { transparent: true, opacity: 0.18, roughness: 0.9 }),
    [0, 0.055, 0],
    [0.62, 0.035, 0.62]
  );
  const modelRoot = new THREE.Group();
  modelRoot.position.set(0, 0.86, 0.05);
  modelRoot.add(createFallbackSocialBadge(item));

  const hitbox = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    [0, 0.86, 0.32],
    [1.22, 1.28, 1],
    [0, 0, 0]
  );
  hitbox.castShadow = false;
  hitbox.receiveShadow = false;
  hitbox.userData.ignoreOpacity = true;
  hitbox.userData.social = item;
  hitbox.userData.socialGroup = group;

  group.add(shadow, modelRoot, hitbox);
  const layout = socialRoomLayout[index] ?? { x: -1.8 + index * 1.2, y: 0.22, z: -48.6 };
  group.position.set(layout.x, layout.y, layout.z);
  group.userData = {
    item,
    hitbox,
    modelRoot,
    baseX: group.position.x,
    baseY: group.position.y,
    baseZ: group.position.z,
    visibility: 0,
    hovered: false
  };
  loadSocialGltfModel(item, modelRoot);
  return group;
}

function createContactSocials() {
  const group = new THREE.Group();
  const hitboxes = [];
  socialLinks.forEach((item, index) => {
    const model = createSocialModel(item, index);
    group.add(model);
    hitboxes.push(model.userData.hitbox);
  });
  group.userData = { hitboxes, visibility: 0 };
  group.visible = false;
  return group;
}

function setObjectOpacity(object, opacity) {
  object.traverse((child) => {
    if (!child.material || child.userData.ignoreOpacity) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((mat) => {
      if (mat.userData.baseOpacity === undefined) {
        mat.userData.baseOpacity = mat.opacity ?? 1;
      }
      mat.transparent = true;
      mat.opacity = mat.userData.baseOpacity * opacity;
    });
  });
}

function createCorridor() {
  const group = new THREE.Group();
  const width = 7.2;
  const height = 4.2;
  const length = 48;
  const centerZ = -18;

  const floor = mesh(geo.plane, mats.floor, [0, 0, centerZ], [width, length, 1], [-Math.PI / 2, 0, 0]);
  const ceiling = mesh(
    geo.plane,
    material(0xf8ead7, { roughness: 0.9, transparent: true, opacity: 0.48 }),
    [0, height, centerZ],
    [width, length, 1],
    [Math.PI / 2, 0, 0]
  );
  const leftWall = mesh(geo.plane, mats.wall, [-width / 2, height / 2, centerZ], [length, height, 1], [0, Math.PI / 2, 0]);
  const rightWall = mesh(geo.plane, mats.wall, [width / 2, height / 2, centerZ], [length, height, 1], [0, -Math.PI / 2, 0]);
  group.add(floor, ceiling, leftWall, rightWall);

  const ribs = [];
  for (let z = 3; z > -41; z -= 4) {
    const rib = new THREE.Group();
    const top = mesh(geo.box, mats.graphite, [0, height, z], [width + 0.22, 0.055, 0.055]);
    const left = mesh(geo.box, mats.graphite, [-width / 2, height / 2, z], [0.055, height, 0.055]);
    const right = mesh(geo.box, mats.graphite, [width / 2, height / 2, z], [0.055, height, 0.055]);
    rib.add(top, left, right);
    rib.userData.baseZ = z;
    ribs.push(rib);
    group.add(rib);
  }

  for (let z = 1; z > -41; z -= 3.2) {
    const dash = mesh(geo.box, mats.amber, [0, 0.018, z], [0.08, 0.025, 0.72]);
    group.add(dash);
  }

  const portal = new THREE.Group();
  portal.position.set(0, 2.05, 4.4);
  const portalMat = material(0xfff4df, { roughness: 0.86 });
  portalMat.map = textures.paper;
  const top = mesh(geo.box, portalMat, [0, 1.85, 0], [8.6, 0.38, 0.22]);
  const bottom = mesh(geo.box, portalMat.clone(), [0, -1.95, 0], [8.6, 0.38, 0.22]);
  const left = mesh(geo.box, portalMat.clone(), [-4.08, 0, 0], [0.42, 4.2, 0.22]);
  const right = mesh(geo.box, portalMat.clone(), [4.08, 0, 0], [0.42, 4.2, 0.22]);
  portal.add(top, bottom, left, right);
  group.add(portal);

  group.userData.ribs = ribs;
  return group;
}

function createWallFrame({ side, z, title, subtitle, accent, imageTexture }) {
  const group = new THREE.Group();
  const x = side === "left" ? -3.58 : 3.58;
  const rotationY = side === "left" ? Math.PI / 2 : -Math.PI / 2;
  group.position.set(x, 2.25, z);
  group.rotation.y = rotationY;

  const frameMat = material(0x161d2a, { roughness: 0.62 });
  const outer = mesh(geo.box, frameMat, [0, 0, 0], [2.55, 1.55, 0.1]);
  const backing = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({ map: imageTexture ?? makeLabelTexture([title, subtitle], accent), side: THREE.FrontSide }),
    [0, 0, 0.056],
    [2.24, 1.25, 1]
  );
  const lipTop = mesh(geo.box, frameMat.clone(), [0, 0.8, 0.12], [2.7, 0.08, 0.16]);
  const lipBottom = mesh(geo.box, frameMat.clone(), [0, -0.8, 0.12], [2.7, 0.08, 0.16]);
  const lipLeft = mesh(geo.box, frameMat.clone(), [-1.33, 0, 0.12], [0.08, 1.6, 0.16]);
  const lipRight = mesh(geo.box, frameMat.clone(), [1.33, 0, 0.12], [0.08, 1.6, 0.16]);
  group.add(outer, backing, lipTop, lipBottom, lipLeft, lipRight);

  const glow = new THREE.PointLight(new THREE.Color(accent).getHex(), 0.5, 5);
  glow.position.set(0, 0.2, 0.6);
  group.add(glow);
  group.userData.baseY = group.position.y;
  return group;
}

function createFloatingCard({
  z,
  title,
  subtitle,
  accent,
  details = [],
  texture,
  size = [3.0, 1.5],
  y = 2.15,
  floatAmount = 0.055,
  tiltAmount = 0.08,
  mobileScale = 0.72,
  mobileYOffset = 0
}) {
  const group = new THREE.Group();
  group.position.set(0, y, z);
  const tex = texture ?? makeLabelTexture([title, subtitle, ...details], accent);
  const panel = mesh(
    geo.plane,
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    [0, 0, 0],
    [size[0], size[1], 1],
    [0, 0, 0]
  );
  group.add(panel);
  group.userData.baseY = group.position.y;
  group.userData.floatAmount = floatAmount;
  group.userData.tiltAmount = tiltAmount;
  group.userData.mobileScale = mobileScale;
  group.userData.mobileYOffset = mobileYOffset;
  return group;
}

function createDataThreads() {
  const group = new THREE.Group();
  const colors = [palette.cyan, palette.coral, palette.green, palette.amber];

  for (let i = 0; i < 34; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const color = colors[i % colors.length];
    const z = 2 - i * 1.35;
    const y = 0.9 + ((i * 37) % 21) / 10;
    const x = side * (1.35 + ((i * 19) % 16) / 18);
    const line = mesh(
      geo.box,
      material(color, {
        emissive: color,
        emissiveIntensity: 0.28,
        transparent: true,
        opacity: 0.5,
        roughness: 0.42
      }),
      [x, y, z],
      [0.018, 0.018, 0.65 + (i % 4) * 0.18],
      [0, side * 0.16, 0]
    );
    line.castShadow = false;
    line.receiveShadow = false;
    line.userData.phase = i * 0.71;
    line.userData.baseX = x;
    line.userData.baseY = y;
    line.userData.baseZ = z;
    group.add(line);

    if (i % 3 === 0) {
      const node = mesh(
        geo.box,
        material(0xfff8ed, {
          emissive: color,
          emissiveIntensity: 0.16,
          transparent: true,
          opacity: 0.82,
          roughness: 0.72
        }),
        [x + side * 0.34, y + 0.12, z - 0.22],
        [0.32, 0.2, 0.04],
        [0, side * 0.28, 0.05 * side]
      );
      node.castShadow = false;
      node.receiveShadow = false;
      node.userData.phase = i * 0.47;
      node.userData.baseX = node.position.x;
      node.userData.baseY = node.position.y;
      node.userData.baseZ = node.position.z;
      group.add(node);
    }
  }

  return group;
}

function createCharacter() {
  const rootGroup = new THREE.Group();
  const parts = {};
  const jacketMat = material(0x123a5a, { roughness: 0.54 });
  const shirtMat = material(0xf8efe0, { roughness: 0.8 });
  const pantsMat = material(0x0b172d, { roughness: 0.62 });
  const shoeMat = material(0xfff7e8, { roughness: 0.64 });
  const strapMat = material(0xe35c37, { emissive: 0xe35c37, emissiveIntensity: 0.08, roughness: 0.58 });
  const glassMat = material(0x071126, { roughness: 0.38 });
  const bagMat = material(0x243444, { roughness: 0.72 });

  const torso = new THREE.Group();
  torso.position.set(0, 1.2, 0);
  const body = mesh(geo.capsule, jacketMat, [0, 0, 0], [0.37, 0.53, 0.3]);
  const shirt = mesh(geo.box, shirtMat, [0, 0.06, 0.27], [0.34, 0.62, 0.035]);
  const jacketLeft = mesh(geo.box, jacketMat.clone(), [-0.14, 0.03, 0.31], [0.12, 0.66, 0.035], [0, 0, -0.08]);
  const jacketRight = mesh(geo.box, jacketMat.clone(), [0.14, 0.03, 0.31], [0.12, 0.66, 0.035], [0, 0, 0.08]);
  const zipper = mesh(geo.box, mats.ink, [0, 0.02, 0.335], [0.018, 0.66, 0.02]);
  const badge = mesh(geo.box, mats.cyan, [0.19, 0.2, 0.345], [0.07, 0.05, 0.018]);
  const collarL = mesh(geo.box, jacketMat.clone(), [-0.11, 0.42, 0.32], [0.2, 0.08, 0.04], [0, 0, -0.38]);
  const collarR = mesh(geo.box, jacketMat.clone(), [0.11, 0.42, 0.32], [0.2, 0.08, 0.04], [0, 0, 0.38]);
  torso.add(body, shirt, jacketLeft, jacketRight, zipper, badge, collarL, collarR);

  const strap = mesh(geo.box, strapMat, [-0.08, 1.25, 0.37], [0.075, 1.05, 0.035], [0, 0, -0.5]);
  const backpack = mesh(geo.box, bagMat, [0, 1.16, -0.33], [0.44, 0.66, 0.2]);
  const backpackFlap = mesh(geo.box, mats.graphite, [0, 1.36, -0.45], [0.38, 0.15, 0.04]);
  rootGroup.add(backpack, backpackFlap, strap, torso);

  parts.headPivot = new THREE.Group();
  parts.headPivot.position.set(0, 1.88, 0);
  const neck = mesh(geo.cylinder, mats.skin, [0, -0.27, 0], [0.11, 0.13, 0.11]);
  const head = mesh(geo.sphere, mats.skin, [0, 0, 0], [0.31, 0.34, 0.3]);
  const hairCap = mesh(geo.sphereLow, mats.hair, [0, 0.17, -0.035], [0.34, 0.2, 0.31]);
  const fringeA = mesh(geo.sphereLow, mats.hair, [-0.12, 0.15, 0.18], [0.18, 0.11, 0.09], [0, 0, -0.35]);
  const fringeB = mesh(geo.sphereLow, mats.hair, [0.05, 0.17, 0.19], [0.2, 0.1, 0.09], [0, 0, 0.24]);
  const sideHairL = mesh(geo.sphereLow, mats.hair, [-0.27, 0.02, 0.02], [0.08, 0.18, 0.11]);
  const sideHairR = mesh(geo.sphereLow, mats.hair, [0.27, 0.02, 0.02], [0.08, 0.18, 0.11]);
  const glassL = mesh(geo.torus, glassMat, [-0.095, -0.02, 0.278], [0.047, 0.047, 0.047]);
  const glassR = mesh(geo.torus, glassMat, [0.095, -0.02, 0.278], [0.047, 0.047, 0.047]);
  const bridge = mesh(geo.box, glassMat, [0, -0.02, 0.28], [0.07, 0.012, 0.012]);
  const eyeL = mesh(geo.sphereLow, mats.ink, [-0.095, -0.025, 0.293], [0.015, 0.018, 0.01]);
  const eyeR = mesh(geo.sphereLow, mats.ink, [0.095, -0.025, 0.293], [0.015, 0.018, 0.01]);
  const mouth = mesh(geo.box, mats.coral, [0, -0.15, 0.29], [0.075, 0.012, 0.012]);
  const cheekL = mesh(geo.sphereLow, mats.coral, [-0.16, -0.1, 0.285], [0.024, 0.014, 0.01]);
  const cheekR = mesh(geo.sphereLow, mats.coral, [0.16, -0.1, 0.285], [0.024, 0.014, 0.01]);
  glassL.rotation.x = Math.PI / 2;
  glassR.rotation.x = Math.PI / 2;
  parts.headPivot.add(neck, head, hairCap, fringeA, fringeB, sideHairL, sideHairR, glassL, glassR, bridge, eyeL, eyeR, mouth, cheekL, cheekR);
  rootGroup.add(parts.headPivot);

  parts.leftArm = new THREE.Group();
  parts.rightArm = new THREE.Group();
  parts.leftArm.position.set(-0.34, 1.42, 0.03);
  parts.rightArm.position.set(0.34, 1.42, 0.03);
  parts.leftLeg = new THREE.Group();
  parts.rightLeg = new THREE.Group();
  parts.leftLeg.position.set(-0.14, 0.72, 0.02);
  parts.rightLeg.position.set(0.14, 0.72, 0.02);

  parts.leftArm.add(mesh(geo.capsule, jacketMat.clone(), [0, -0.24, 0], [0.075, 0.25, 0.075], [0, 0, 0.13]));
  parts.leftArm.add(mesh(geo.sphereLow, mats.skin, [0.02, -0.55, 0.02], [0.07, 0.075, 0.06]));
  parts.rightArm.add(mesh(geo.capsule, jacketMat.clone(), [0, -0.24, 0], [0.075, 0.25, 0.075], [0, 0, -0.13]));
  parts.rightArm.add(mesh(geo.sphereLow, mats.skin, [-0.02, -0.55, 0.02], [0.07, 0.075, 0.06]));

  parts.leftLeg.add(mesh(geo.capsule, pantsMat, [0, -0.28, 0], [0.088, 0.31, 0.085], [0.03, 0, 0.02]));
  parts.rightLeg.add(mesh(geo.capsule, pantsMat.clone(), [0, -0.28, 0], [0.088, 0.31, 0.085], [-0.03, 0, -0.02]));
  parts.leftLeg.add(mesh(geo.box, shoeMat, [0, -0.58, 0.09], [0.23, 0.06, 0.3]));
  parts.rightLeg.add(mesh(geo.box, shoeMat.clone(), [0, -0.58, 0.09], [0.23, 0.06, 0.3]));
  const shadow = mesh(
    new THREE.CircleGeometry(0.52, 32),
    new THREE.MeshBasicMaterial({ color: 0x071126, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
    [0, 0.025, 0],
    [1, 0.55, 1],
    [-Math.PI / 2, 0, 0]
  );
  rootGroup.add(parts.leftArm, parts.rightArm, parts.leftLeg, parts.rightLeg);
  rootGroup.add(shadow);
  rootGroup.userData.parts = parts;
  rootGroup.scale.setScalar(0.72);
  return rootGroup;
}

function createAvatarCharacter() {
  const group = new THREE.Group();
  const avatarMaterial = new THREE.MeshBasicMaterial({
    map: textures.avatar,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const avatarPlane = mesh(
    new THREE.PlaneGeometry(1.16, 2.18),
    avatarMaterial,
    [0, 1.14, 0],
    [1, 1, 1]
  );
  avatarPlane.castShadow = false;
  avatarPlane.receiveShadow = false;
  avatarPlane.renderOrder = 6;

  const shadow = mesh(
    new THREE.CircleGeometry(0.54, 40),
    new THREE.MeshBasicMaterial({
      color: 0x071126,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide
    }),
    [0, 0.035, 0],
    [1, 0.42, 1],
    [-Math.PI / 2, 0, 0]
  );
  shadow.castShadow = false;
  shadow.receiveShadow = false;

  group.add(shadow, avatarPlane);
  group.userData.avatarPlane = avatarPlane;
  group.userData.shadow = shadow;
  group.scale.setScalar(0.74);
  return group;
}

function createBrandModel() {
  if (!brandCanvas) return null;

  const modelRenderer = new THREE.WebGLRenderer({
    canvas: brandCanvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power"
  });
  modelRenderer.outputColorSpace = THREE.SRGBColorSpace;
  modelRenderer.setClearColor(0x000000, 0);

  const modelScene = new THREE.Scene();
  const modelCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
  modelCamera.position.set(0, 0.08, 4.25);

  const modelRoot = new THREE.Group();
  modelScene.add(modelRoot);

  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(3, 4, 4);
  modelScene.add(key);
  modelScene.add(new THREE.HemisphereLight(0xffffff, 0x415166, 1.8));

  const letterGroup = new THREE.Group();
  const prismGeometry = new THREE.BoxGeometry(1, 1, 1);
  const prismMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0xfff8ed,
      roughness: 0.42,
      metalness: 0.08,
      emissive: 0xff7043,
      emissiveIntensity: 0.05
    }),
    new THREE.MeshStandardMaterial({
      color: 0xdfefff,
      roughness: 0.46,
      metalness: 0.06,
      emissive: 0x19b8ff,
      emissiveIntensity: 0.08
    }),
    new THREE.MeshStandardMaterial({
      color: 0xff7043,
      roughness: 0.5,
      metalness: 0.04,
      emissive: 0xff7043,
      emissiveIntensity: 0.12
    }),
    new THREE.MeshStandardMaterial({
      color: 0x071126,
      roughness: 0.56,
      metalness: 0.12,
      emissive: 0x071126,
      emissiveIntensity: 0.02
    }),
    new THREE.MeshStandardMaterial({
      color: 0xfff8ed,
      roughness: 0.42,
      metalness: 0.08,
      emissive: 0xff7043,
      emissiveIntensity: 0.05
    }),
    new THREE.MeshStandardMaterial({
      color: 0xf4b84b,
      roughness: 0.48,
      metalness: 0.05,
      emissive: 0xf4b84b,
      emissiveIntensity: 0.08
    })
  ];

  function addLetterBar(position, scale, rotationZ = 0) {
    const bar = new THREE.Mesh(prismGeometry, prismMaterials);
    bar.position.set(...position);
    bar.scale.set(...scale);
    bar.rotation.z = rotationZ;
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(prismGeometry),
      new THREE.LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.32 })
    );
    outline.scale.set(1.01, 1.01, 1.01);
    bar.add(outline);
    letterGroup.add(bar);
    return bar;
  }

  addLetterBar([-0.67, 0.02, 0], [0.14, 1.26, 0.24], -0.22);
  addLetterBar([-0.28, 0.02, 0], [0.14, 1.26, 0.24], 0.22);
  addLetterBar([-0.47, -0.08, 0.06], [0.43, 0.13, 0.28], 0);
  addLetterBar([0.25, 0.01, 0], [0.16, 1.2, 0.24], 0);
  addLetterBar([0.55, -0.53, 0.06], [0.68, 0.16, 0.28], 0);
  letterGroup.rotation.set(-0.08, -0.45, 0.03);

  const accentLine = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.018, 8, 70),
    new THREE.MeshBasicMaterial({ color: palette.cyan, transparent: true, opacity: 0.56 })
  );
  accentLine.rotation.set(Math.PI / 2.1, 0.08, -0.42);

  const coralLine = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.014, 8, 70),
    new THREE.MeshBasicMaterial({ color: palette.coral, transparent: true, opacity: 0.5 })
  );
  coralLine.rotation.set(0.42, Math.PI / 2.35, 0.2);

  const markerMaterial = new THREE.MeshBasicMaterial({ color: palette.amber, transparent: true, opacity: 0.86 });
  const markers = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), markerMaterial.clone());
    marker.position.set(Math.cos(angle) * 1.25, Math.sin(angle * 1.7) * 0.28, Math.sin(angle) * 1.08);
    marker.rotation.set(angle, angle * 0.4, angle * 0.2);
    marker.userData.phase = angle;
    markers.push(marker);
    modelRoot.add(marker);
  }

  modelRoot.add(letterGroup, accentLine, coralLine);

  const effects = [];
  const effectColors = [palette.coral, palette.cyan, palette.violet, palette.green, palette.amber];
  const shardGeometry = new THREE.TetrahedronGeometry(0.085, 0);
  let pulse = 0;
  let pointerX = 0;
  let pointerY = 0;

  function resize() {
    const rect = brandCanvas.getBoundingClientRect();
    const size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    modelRenderer.setPixelRatio(dpr);
    modelRenderer.setSize(size, size, false);
    modelCamera.aspect = 1;
    modelCamera.updateProjectionMatrix();
  }

  function setPointer(x, y) {
    pointerX = x;
    pointerY = y;
  }

  function resetPointer() {
    pointerX = 0;
    pointerY = 0;
  }

  function trigger() {
    pulse = 1;
    const count = 10 + Math.floor(Math.random() * 7);
    for (let i = 0; i < count; i += 1) {
      const color = effectColors[(i + Math.floor(Math.random() * effectColors.length)) % effectColors.length];
      const shard = new THREE.Mesh(
        shardGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
      );
      const angle = Math.random() * Math.PI * 2;
      const lift = (Math.random() - 0.5) * 0.8;
      shard.position.set(0, 0, 0);
      shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      modelScene.add(shard);
      effects.push({
        mesh: shard,
        vx: Math.cos(angle) * (0.9 + Math.random() * 1.35),
        vy: lift,
        vz: Math.sin(angle) * (0.9 + Math.random() * 1.35),
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5),
        life: 0.85 + Math.random() * 0.35
      });
    }
  }

  function animate(time, delta) {
    pulse = damp(pulse, 0, 5.5, delta);
    modelRoot.rotation.y = time * 0.78 + pointerX * 0.46;
    modelRoot.rotation.x = -0.12 + pointerY * 0.34 + Math.sin(time * 1.6) * 0.035;
    modelRoot.rotation.z = Math.sin(time * 0.9) * 0.08;
    modelRoot.scale.setScalar(1.14 + pulse * 0.16);

    letterGroup.rotation.y = -0.45 + Math.sin(time * 0.8) * 0.12 + pointerX * 0.22;
    letterGroup.rotation.x = -0.08 + pointerY * 0.16;
    letterGroup.rotation.z = 0.03 + Math.sin(time * 1.2) * 0.035;
    accentLine.rotation.z += delta * (0.9 + pulse * 1.4);
    coralLine.rotation.x -= delta * 0.72;

    markers.forEach((marker, index) => {
      marker.position.y = Math.sin(time * 2.2 + marker.userData.phase) * 0.26;
      marker.scale.setScalar(1 + Math.sin(time * 3 + index) * 0.12 + pulse * 0.35);
    });

    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      effect.life -= delta;
      effect.mesh.position.x += effect.vx * delta;
      effect.mesh.position.y += effect.vy * delta;
      effect.mesh.position.z += effect.vz * delta;
      effect.vx *= 0.96;
      effect.vy = effect.vy * 0.96 - 0.25 * delta;
      effect.vz *= 0.96;
      effect.mesh.rotation.x += effect.spin.x * delta;
      effect.mesh.rotation.y += effect.spin.y * delta;
      effect.mesh.rotation.z += effect.spin.z * delta;
      effect.mesh.material.opacity = Math.max(0, effect.life);

      if (effect.life <= 0) {
        modelScene.remove(effect.mesh);
        effect.mesh.material.dispose();
        effects.splice(i, 1);
      }
    }

    modelRenderer.render(modelScene, modelCamera);
  }

  resize();
  return { animate, resize, setPointer, resetPointer, trigger };
}

function emitBrandDomEffect() {
  if (!brandEffectLayer || reducedMotion) return;
  const colors = ["#ff7043", "#19b8ff", "#6158ff", "#8bd66f", "#f4b84b"];
  const mode = Math.floor(Math.random() * 3);

  function addEffect(className, styles = {}) {
    const element = document.createElement("span");
    element.className = className;
    Object.entries(styles).forEach(([key, value]) => element.style.setProperty(key, value));
    brandEffectLayer.appendChild(element);
    element.addEventListener("animationend", () => element.remove(), { once: true });
  }

  addEffect("brand-ring", { "--fx-color": colors[Math.floor(Math.random() * colors.length)] });
  if (mode === 0 || mode === 2) {
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.28;
      const distance = 24 + Math.random() * 44;
      addEffect("brand-spark", {
        "--fx-color": colors[i % colors.length],
        "--spark-x": `${Math.cos(angle) * distance}px`,
        "--spark-y": `${Math.sin(angle) * distance}px`
      });
    }
  }
  if (mode === 1 || mode === 2) {
    for (let i = 0; i < 7; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 18 + Math.random() * 32;
      addEffect("brand-beam", {
        "--fx-color": colors[(i + 1) % colors.length],
        "--beam-rotate": `${angle}rad`,
        "--beam-x": `${Math.cos(angle) * distance}px`,
        "--beam-y": `${Math.sin(angle) * distance}px`
      });
    }
  }
}

const corridor = createCorridor();
scene.add(corridor);

const frames = [
  createWallFrame({ side: "left", z: -4, title: "Monash", subtitle: "Software Engineering Honours", accent: "#19b8ff" }),
  createWallFrame({ side: "right", z: -9, title: "RW Marketing", subtitle: "WordPress website development", accent: "#ff7043" }),
  createWallFrame({ side: "left", z: -15, title: "South Property", subtitle: "Web development and IT management", accent: "#8bd66f" }),
  createWallFrame({ side: "right", z: -21, title: "Creative Faith", subtitle: "Creativity as a human gift", accent: "#6158ff" }),
  createWallFrame({ side: "left", z: -28, title: "Melt & Sip", subtitle: "Sandwich cafe landing page", accent: "#19b8ff", imageTexture: textures.projectWeb }),
  createWallFrame({ side: "right", z: -33, title: "South Property", subtitle: "Premium residential collection website", accent: "#8bd66f", imageTexture: textures.projectProperty }),
  createWallFrame({ side: "left", z: -38, title: "Lume Atelier", subtitle: "Fine jewelry commerce and 3D preview", accent: "#d6b66a", imageTexture: textures.projectJewelry })
];
frames.forEach((frame) => scene.add(frame));

const floatingCards = [
  createFloatingCard({
    z: 1.2,
    title: "Andy Liu",
    subtitle: "Next.js Developer",
    accent: "#ff7043",
    details: ["GSAP motion", "Three.js interfaces", "WebGL spatial sites"],
    mobileScale: 0.58,
    mobileYOffset: 0.08
  })
];
floatingCards.forEach((card) => scene.add(card));

const dataThreads = createDataThreads();
scene.add(dataThreads);

const character = createAvatarCharacter();
scene.add(character);

const contactPortal = createContactPortal();
scene.add(contactPortal);

const contactSocials = createContactSocials();
scene.add(contactSocials);

const brandModel = createBrandModel();

let lastNavRoom = "";

function positionNavIndicator(link) {
  if (!siteNav || !link) {
    siteNav?.style.setProperty("--nav-active-w", "0px");
    return;
  }
  const navRect = siteNav.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  siteNav.style.setProperty("--nav-active-x", `${linkRect.left - navRect.left}px`);
  siteNav.style.setProperty("--nav-active-w", `${linkRect.width}px`);
}

function updateNavState(room = activeScene) {
  if (!siteNav || navLinks.length === 0) return;
  const activeLink = navLinks.find((link) => link.dataset.room === room);
  if (room !== lastNavRoom) {
    navLinks.forEach((link) => link.classList.toggle("is-active", link === activeLink));
    lastNavRoom = room;
  }
  positionNavIndicator(activeLink);
}

function updateSceneClass() {
  const midpoint = window.scrollY + window.innerHeight * 0.52;
  const current = sections.find((section) => midpoint >= section.offsetTop && midpoint < section.offsetTop + section.offsetHeight);
  activeScene = current?.dataset.scene ?? "home";
  updateNavState(activeScene);
}

function updateScrollVars() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scrollProgress = clamp(window.scrollY / maxScroll, 0, 1);
  const open = clamp(scrollProgress * 6, 0, 1);
  root.style.setProperty("--open", open.toFixed(3));
}

function animateCharacter(time, delta) {
  const targetZ = lerp(2.1, -36.5, scrollProgress);
  const targetX = 0.35 + Math.sin(scrollProgress * Math.PI * 2.1) * 0.62;
  character.position.x = damp(character.position.x, targetX, 5, delta);
  character.position.y = damp(character.position.y, 0.08, 5, delta);
  character.position.z = damp(character.position.z, targetZ - 2.0, 5, delta);
  const isAvatarSprite = Boolean(character.userData.avatarPlane);
  const turnAmount = isAvatarSprite ? 0.1 : 0.45;
  character.rotation.y = damp(character.rotation.y, Math.sin(scrollProgress * Math.PI * 1.4) * turnAmount, 5, delta);
  const narrow = window.innerWidth < 760;
  const scale = narrow ? 0.52 : 0.74;
  character.scale.setScalar(damp(character.scale.x, scale, 4, delta));

  const parts = character.userData.parts;
  const walk = reducedMotion ? 0 : Math.sin(time * 8);
  if (parts) {
    parts.leftLeg.rotation.x = walk * 0.45;
    parts.rightLeg.rotation.x = -walk * 0.45;
    parts.leftArm.rotation.x = -walk * 0.36;
    parts.rightArm.rotation.x = walk * 0.36;
    parts.leftArm.rotation.z = 0.22;
    parts.rightArm.rotation.z = -0.22;
    if (parts.headPivot) {
      parts.headPivot.rotation.y = Math.sin(time * 1.4) * 0.08 + pointer.x * 0.05;
      parts.headPivot.rotation.z = Math.sin(time * 2.2) * 0.025;
    }
  }
  if (character.userData.avatarPlane) {
    character.userData.avatarPlane.position.y = 1.14 + Math.abs(walk) * 0.035;
    character.userData.avatarPlane.rotation.z = Math.sin(time * 2.1) * 0.018 + pointer.x * 0.012;
    character.userData.shadow.scale.x = 1 + Math.abs(walk) * 0.08;
    character.userData.shadow.scale.y = 0.42 + Math.abs(walk) * 0.03;
  }
}

function animateFrames(time, delta) {
  frames.forEach((frame, index) => {
    const distance = Math.abs(frame.position.z - camera.position.z);
    const highlight = clamp(1 - distance / 8, 0, 1);
    frame.position.y = frame.userData.baseY + Math.sin(time * 1.1 + index) * 0.025;
    frame.scale.setScalar(1 + highlight * 0.035);
  });
  floatingCards.forEach((card, index) => {
    const mobile = window.innerWidth < 620;
    const targetScale = mobile ? card.userData.mobileScale : 1;
    const yOffset = mobile ? card.userData.mobileYOffset : 0;
    card.scale.setScalar(damp(card.scale.x, targetScale, 5, delta));
    card.position.y = card.userData.baseY + yOffset + Math.sin(time * 0.9 + index * 1.7) * card.userData.floatAmount;
    card.rotation.y = Math.sin(time * 0.35 + index) * card.userData.tiltAmount;
  });
  corridor.userData.ribs.forEach((rib, index) => {
    rib.position.y = Math.sin(time * 0.8 + index) * 0.01;
  });
  dataThreads.children.forEach((item, index) => {
    item.position.x = item.userData.baseX + Math.sin(time * 0.9 + item.userData.phase) * 0.08;
    item.position.y = item.userData.baseY + Math.sin(time * 1.25 + item.userData.phase) * 0.055;
    item.position.z = item.userData.baseZ + Math.sin(time * 0.55 + index) * 0.08;
    item.rotation.z = Math.sin(time * 0.8 + item.userData.phase) * 0.06;
    if (item.material) {
      item.material.opacity = 0.45 + Math.sin(time * 1.1 + item.userData.phase) * 0.18;
    }
  });
}

function animateContactPortal(time, delta) {
  const focus = clamp((scrollProgress - 0.74) / 0.2, 0, 1);
  const state = contactPortal.userData;
  const open = contactRoomOpen || state.open;
  const hover = state.hover && focus > 0.36 && !open;
  const glowTarget = open ? 1.55 : hover ? 0.95 : 0.45 + focus * 0.5;
  const pulse = 0.5 + Math.sin(time * 3.4) * 0.5;
  const plateScale = open ? 0.92 : hover ? 1.08 : 1 + focus * 0.025 + pulse * focus * 0.012;

  state.plateGroup.scale.setScalar(damp(state.plateGroup.scale.x, plateScale, 6.2, delta));
  state.plateGroup.position.z = damp(state.plateGroup.position.z, open ? 0.02 : hover ? 0.18 : 0.11, 6.2, delta);
  state.plateGroup.rotation.z = damp(state.plateGroup.rotation.z, open ? 0 : Math.sin(time * 1.9) * focus * 0.012, 5.4, delta);
  state.signMaterial.opacity = damp(state.signMaterial.opacity, open ? 0.24 : 0.82 + focus * 0.14 + (hover ? 0.06 : 0), 4.5, delta);
  state.plateGlow.material.opacity = damp(state.plateGlow.material.opacity, open ? 0.04 : 0.08 + focus * 0.13 + (hover ? 0.1 : pulse * 0.04), 5, delta);
  state.roomLight.intensity = damp(state.roomLight.intensity, open ? 1.2 : 0.42, 4.5, delta);
  state.paperLight.intensity = damp(state.paperLight.intensity, open ? 0.72 : 0.18, 4.5, delta);
  state.doorLight.intensity = damp(state.doorLight.intensity, glowTarget, 5, delta);

  state.knockBursts.children.forEach((burst, index) => {
    const cycle = (time * 0.58 + burst.userData.phaseOffset) % 1;
    const rise = smoothstep(cycle);
    const fadeIn = smoothstep(clamp(cycle / 0.24, 0, 1));
    const fadeOut = 1 - smoothstep(clamp((cycle - 0.58) / 0.42, 0, 1));
    const burstOpacity = (open ? 0 : 0.32 + focus * 0.68 + (hover ? 0.24 : 0)) * fadeIn * fadeOut;
    burst.visible = burstOpacity > 0.02;
    burst.position.x = burst.userData.baseX + Math.sin(time * 1.6 + index) * 0.035;
    burst.position.y = burst.userData.baseY + rise * 0.24;
    burst.position.z = burst.userData.baseZ + rise * 0.12;
    burst.scale.setScalar(0.72 + rise * 0.46 + (hover ? 0.08 : 0));
    setObjectOpacity(burst, burstOpacity);
  });

  contactPortal.position.y = 0;
  contactPortal.scale.setScalar(1);
}

function animateContactSocials(time, delta) {
  const target = contactRoomOpen ? 1 : 0;
  contactSocials.userData.visibility = damp(contactSocials.userData.visibility, target, 5, delta);
  const visibility = contactSocials.userData.visibility;
  const narrow = window.innerWidth < 760;
  const spread = narrow ? 0.36 : 1;
  const targetScale = narrow ? 0.3 : 0.92;
  const mobileYOffset = narrow ? -0.18 : 0;
  const mobileZOffset = narrow ? -0.62 : 0;
  contactSocials.visible = visibility > 0.02;
  contactSocials.scale.setScalar(1);
  setObjectOpacity(contactSocials, visibility);

  contactSocials.children.forEach((model, index) => {
    const hovered = hoveredSocialLink?.id === model.userData.item.id;
    model.userData.hovered = hovered;
    const floatY = visibility * (Math.sin(time * 1.4 + index * 0.8) * 0.06 + (hovered ? 0.22 : 0.04));
    model.position.x = damp(model.position.x, model.userData.baseX * spread + pointer.x * 0.05 * (index - 1.5), 4.5, delta);
    model.position.y = damp(model.position.y, model.userData.baseY + mobileYOffset + floatY, 5.5, delta);
    model.position.z = damp(model.position.z, model.userData.baseZ + mobileZOffset + (hovered ? 0.18 : 0), 5, delta);
    model.rotation.y = damp(model.rotation.y, 0, 5, delta);
    model.rotation.x = damp(model.rotation.x, 0, 5, delta);
    if (model.userData.modelRoot) {
      const socialScale = targetScale * (hovered ? 1.1 : 1);
      model.userData.modelRoot.scale.setScalar(damp(model.userData.modelRoot.scale.x, socialScale, 7, delta));
      model.userData.modelRoot.rotation.y = damp(model.userData.modelRoot.rotation.y, 0, 7, delta);
    }
  });
}

function updateContactDoorHit(event) {
  if (!contactPortal?.userData?.hitbox) return false;
  pointerNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);

  hoveredSocialLink = null;
  if (contactTransitionProgress > 0.68 && contactSocials.visible) {
    const socialHits = raycaster.intersectObjects(contactSocials.userData.hitboxes, false);
    if (socialHits.length > 0) {
      hoveredSocialLink = socialHits[0].object.userData.social;
      contactDoorHover = false;
      contactPortal.userData.hover = false;
      document.body.classList.add("is-contact-door-hover");
      return true;
    }
  }

  const canHitDoor = (activeScene === "contact" || scrollProgress > 0.78) && !contactRoomOpen && !contactRoomClosing && contactTransitionProgress < 0.08;
  const hits = raycaster.intersectObject(contactPortal.userData.hitbox, false);
  contactDoorHover = canHitDoor && hits.length > 0;
  contactPortal.userData.hover = contactDoorHover;
  document.body.classList.toggle("is-contact-door-hover", contactDoorHover);
  return contactDoorHover || Boolean(hoveredSocialLink);
}

function setCorridorCameraState(position, target) {
  const narrow = window.innerWidth < 760;
  const camZ = lerp(6.7, -36.8, scrollProgress);
  const camX = (narrow ? 0.25 : 0.85) * Math.sin(scrollProgress * Math.PI * 1.2) + pointer.x * (narrow ? 0.12 : 0.26) + (narrow ? 0 : 0.28);
  const camY = narrow ? 1.85 : 2.0;
  position.set(camX, camY + pointer.y * 0.08, camZ);
  target.set(camX * 0.25, narrow ? 1.55 : 1.8, camZ - 7);
}

function animateCamera(delta) {
  const narrow = window.innerWidth < 760;
  const targetProgress = contactRoomOpen ? 1 : 0;
  contactTransitionProgress = damp(
    contactTransitionProgress,
    targetProgress,
    reducedMotion ? 80 : 2.15,
    delta
  );

  if (contactRoomClosing && contactTransitionProgress < 0.018) {
    finishContactRoomClose();
  }

  if (contactRoomOpen || contactRoomClosing || contactTransitionProgress > 0.018) {
    const progress = smoothstep(clamp(contactTransitionProgress, 0, 1));
    setCorridorCameraState(corridorCameraPosition, corridorCameraTarget);

    contactAlignPosition.set(pointer.x * (narrow ? 0.035 : 0.055), narrow ? 1.68 : 1.78, -39.35);
    contactAlignTarget.set(0, narrow ? 1.34 : 1.48, -41.9);
    contactInsidePosition.set(pointer.x * (narrow ? 0.08 : 0.14), narrow ? 1.62 : 1.72 + pointer.y * 0.035, narrow ? -45.2 : -44.72);
    contactInsideTarget.set(pointer.x * (narrow ? 0.16 : 0.26), narrow ? 1.22 : 1.34, narrow ? -49.65 : -49.25);

    if (progress < 0.42) {
      const alignProgress = smoothstep(progress / 0.42);
      const startPosition = contactRoomOpen ? contactEntryStartPosition : corridorCameraPosition;
      const startTarget = contactRoomOpen ? contactEntryStartTarget : corridorCameraTarget;
      contactCameraPosition.copy(startPosition).lerp(contactAlignPosition, alignProgress);
      contactCameraTarget.copy(startTarget).lerp(contactAlignTarget, alignProgress);
    } else {
      const enterProgress = smoothstep((progress - 0.42) / 0.58);
      contactCameraPosition.copy(contactAlignPosition).lerp(contactInsidePosition, enterProgress);
      contactCameraTarget.copy(contactAlignTarget).lerp(contactInsideTarget, enterProgress);
    }

    camera.position.copy(contactCameraPosition);
    lookTarget.copy(contactCameraTarget);
    camera.lookAt(lookTarget);
    return;
  }

  setCorridorCameraState(corridorCameraPosition, corridorCameraTarget);
  camera.position.x = damp(camera.position.x, corridorCameraPosition.x, 4.4, delta);
  camera.position.y = damp(camera.position.y, corridorCameraPosition.y, 4.4, delta);
  camera.position.z = damp(camera.position.z, corridorCameraPosition.z, 4.4, delta);

  lookTarget.copy(corridorCameraTarget);
  camera.lookAt(lookTarget);
}

function tick() {
  const delta = Math.min(0.05, clock.getDelta());
  const time = clock.elapsedTime;
  pointer.x = damp(pointer.x, pointer.tx, 5, delta);
  pointer.y = damp(pointer.y, pointer.ty, 5, delta);

  updateSceneClass();
  updateScrollVars();
  animateCamera(delta);
  animateCharacter(time, delta);
  animateFrames(time, delta);
  animateContactPortal(time, delta);
  animateContactSocials(time, delta);
  brandModel?.animate(time, delta);
  cursorFx.draw(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxScenePixelRatio()));
  renderer.setSize(window.innerWidth, window.innerHeight);
  brandModel?.resize();
  updateNavState(activeScene);
  resizeCursorCanvas();
}

function resizeCursorCanvas() {
  if (!cursorCanvas || !cursorCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cursorCanvas.width = Math.floor(window.innerWidth * dpr);
  cursorCanvas.height = Math.floor(window.innerHeight * dpr);
  cursorCanvas.style.width = `${window.innerWidth}px`;
  cursorCanvas.style.height = `${window.innerHeight}px`;
  cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let typewriterStarted = false;
let typewriterPrepared = false;

function prepareHeroTypewriter() {
  if (typewriterPrepared || typewriterTargets.length === 0) return;
  typewriterPrepared = true;
  typewriterTargets.forEach((element) => {
    const text = (element.dataset.typewriter ?? element.textContent ?? "").replace(/\s+/g, " ").trim();
    element.dataset.typewriter = text;
    element.textContent = "";
    element.dataset.typing = "waiting";
    element.setAttribute("aria-label", text);
  });
}

function typeText(element, speed) {
  const text = element.dataset.typewriter ?? "";
  element.textContent = "";
  element.dataset.typing = "true";
  return new Promise((resolve) => {
    let index = 0;
    const write = () => {
      element.textContent = text.slice(0, index);
      index += 1;
      if (index <= text.length) {
        window.setTimeout(write, speed);
      } else {
        element.dataset.typing = "false";
        resolve();
      }
    };
    write();
  });
}

async function startHeroTypewriter() {
  if (typewriterStarted || typewriterTargets.length === 0) return;
  typewriterStarted = true;
  prepareHeroTypewriter();

  if (reducedMotion) {
    typewriterTargets.forEach((element) => {
      element.textContent = element.dataset.typewriter ?? "";
      element.dataset.typing = "false";
    });
    return;
  }

  const [title, intro] = typewriterTargets;
  if (title) await typeText(title, 18);
  if (intro) await typeText(intro, 9);
}

prepareHeroTypewriter();

if (heroCard) {
  heroCard.addEventListener("pointermove", (event) => {
    if (window.innerWidth < 760 || reducedMotion) return;
    const rect = heroCard.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const localY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    heroCard.style.setProperty("--card-shift-x", `${localX * 9}px`);
    heroCard.style.setProperty("--card-shift-y", `${localY * 7}px`);
    heroCard.style.setProperty("--card-tilt-x", `${localX * 2.8}deg`);
    heroCard.style.setProperty("--card-tilt-y", `${localY * -2.2}deg`);
    heroCard.style.setProperty("--card-shadow-x", `${localX * -10}px`);
    heroCard.style.setProperty("--card-shadow-y", `${38 + Math.abs(localY) * 6}px`);
  });

  heroCard.addEventListener("pointerleave", () => {
    heroCard.style.setProperty("--card-shift-x", "0px");
    heroCard.style.setProperty("--card-shift-y", "0px");
    heroCard.style.setProperty("--card-tilt-x", "0deg");
    heroCard.style.setProperty("--card-tilt-y", "0deg");
    heroCard.style.setProperty("--card-shadow-x", "0px");
    heroCard.style.setProperty("--card-shadow-y", "38px");
  });
}

if (brandButton) {
  brandButton.addEventListener("pointermove", (event) => {
    const rect = brandButton.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const localY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    brandButton.style.setProperty("--brand-tilt-x", `${localX * 11}deg`);
    brandButton.style.setProperty("--brand-tilt-y", `${localY * -9}deg`);
    brandModel?.setPointer(localX, localY);
  });

  brandButton.addEventListener("pointerleave", () => {
    brandButton.style.setProperty("--brand-tilt-x", "0deg");
    brandButton.style.setProperty("--brand-tilt-y", "0deg");
    brandModel?.resetPointer();
  });

  brandButton.addEventListener("click", () => {
    const rect = brandButton.getBoundingClientRect();
    if (contactRoomOpen) {
      closeContactRoom({ restoreFocus: false });
    }
    brandModel?.trigger();
    emitBrandDomEffect();
    cursorFx.burst(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
    document.querySelector("#home")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    if (history.replaceState) {
      history.replaceState(null, "", "#home");
    }
  });
}

if (siteNav && navLinks.length > 0) {
  navLinks.forEach((link) => {
    link.addEventListener("pointerenter", () => positionNavIndicator(link));
  });
  siteNav.addEventListener("pointerleave", () => {
    const activeLink = navLinks.find((link) => link.classList.contains("is-active"));
    positionNavIndicator(activeLink);
  });
}

function finishContactRoomClose() {
  contactRoomClosing = false;
  hoveredSocialLink = null;
  contactDoorHover = false;
  contactPortal.userData.hover = false;
  document.body.classList.remove("is-contact-room", "is-contact-door-hover");
  contactSection?.classList.remove("is-open");
  if (contactRestoreFocusOnClose) {
    contactDoor?.focus({ preventScroll: true });
  }
}

function openContactRoom() {
  if (!contactSection || !contactDoor || !contactRoom) return;
  contactEntryStartPosition.copy(camera.position);
  contactEntryStartTarget.copy(lookTarget);
  contactRoomOpen = true;
  contactRoomClosing = false;
  contactPortal.userData.open = true;
  contactPortal.userData.hover = false;
  contactDoorHover = false;
  document.body.classList.remove("is-contact-door-hover");
  document.body.classList.add("is-contact-room");
  contactSection.classList.add("is-open");
  contactDoor.setAttribute("aria-expanded", "true");
  const rect = contactDoor.getBoundingClientRect();
  cursorFx.burst(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
}

function closeContactRoom({ restoreFocus = true } = {}) {
  if (!contactSection || !contactDoor) return;
  contactRoomOpen = false;
  contactRoomClosing = true;
  contactRestoreFocusOnClose = restoreFocus;
  contactPortal.userData.open = false;
  contactPortal.userData.hover = false;
  hoveredSocialLink = null;
  contactDoorHover = false;
  document.body.classList.remove("is-contact-door-hover");
  contactDoor.setAttribute("aria-expanded", "false");
  if (reducedMotion) {
    contactTransitionProgress = 0;
    finishContactRoomClose();
  }
}

contactDoor?.addEventListener("click", openContactRoom);
contactRoomClose?.addEventListener("click", closeContactRoom);

window.addEventListener("resize", resize);
window.addEventListener("scroll", () => {
  updateSceneClass();
  updateScrollVars();
}, { passive: true });
window.addEventListener("pointermove", (event) => {
  pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.ty = (event.clientY / window.innerHeight - 0.5) * -2;
  updateContactDoorHit(event);
  const dx = event.clientX - cursorFx.lastX;
  const dy = event.clientY - cursorFx.lastY;
  const distance = Math.hypot(dx, dy);
  cursorFx.lastX = event.clientX;
  cursorFx.lastY = event.clientY;
  if (distance > 2) {
    cursorFx.spawnTrail(event.clientX, event.clientY, cursorFx.down);
  }
});
window.addEventListener("pointerdown", (event) => {
  const target = event.target;
  const isUiTarget = target?.closest?.(".site-header, .contact-room-panel, a, button, input, textarea");
  if (hoveredSocialLink && !isUiTarget) {
    event.preventDefault();
    cursorFx.burst(event.clientX, event.clientY);
    window.open(hoveredSocialLink.url, "_blank", "noopener,noreferrer");
  }
  if (contactDoorHover && !isUiTarget) {
    event.preventDefault();
    openContactRoom();
  }
  cursorFx.down = true;
  cursorFx.lastX = event.clientX;
  cursorFx.lastY = event.clientY;
  document.body.classList.add("is-dragging");
  cursorFx.burst(event.clientX, event.clientY);
});
window.addEventListener("pointerup", (event) => {
  cursorFx.down = false;
  document.body.classList.remove("is-dragging");
  cursorFx.burst(event.clientX, event.clientY);
});
window.addEventListener("pointercancel", () => {
  cursorFx.down = false;
  document.body.classList.remove("is-dragging");
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && contactRoomOpen) {
    closeContactRoom();
  }
});

updateSceneClass();
updateScrollVars();
resize();
document.body.classList.add("webgl-ready");
window.setTimeout(() => {
  document.body.classList.add("intro-complete");
  window.setTimeout(startHeroTypewriter, reducedMotion ? 0 : 1250);
}, reducedMotion ? 200 : 1850);
requestAnimationFrame(tick);
