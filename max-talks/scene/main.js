import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Max } from './lib/max.js';
import { Owner } from './lib/owner.js';
import { Cat } from './lib/cat.js';
import { Room, makeSlipper } from './lib/room.js';
import { FUR_QUALITY, updateFurLights } from './lib/fur.js';
import { track, lerp, clamp, smooth, easeOut, easeInOut, easeOutBack, range, pulse, noise1, rand, spring } from './lib/util.js';

const params = new URLSearchParams(location.search);
const W = +(params.get('w') || 1080), H = +(params.get('h') || 1920);
FUR_QUALITY.shells = +(params.get('shells') || 18);
await document.fonts.load('700 40px Fredoka');
await document.fonts.load('600 40px Fredoka');
const TL = await (await fetch('/timeline.json')).json();
const FPS = TL.fps;

// ---------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: params.get('aa') !== '0', preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1020');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const camera = new THREE.PerspectiveCamera(45, W / H, 0.03, 120);

// lights
const hemi = new THREE.HemisphereLight('#ffe9d6', '#7a5a66', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffad70', 3.2);
sun.position.set(-1.6, 4.2, -9); sun.target.position.set(0.6, 0, -0.5);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 20 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const key = new THREE.DirectionalLight('#fff3e2', 1.4); key.position.set(2.5, 3.5, 3.5); key.target.position.set(0, 0.6, -1); scene.add(key, key.target);
const teal = new THREE.PointLight('#38d9c9', 5, 9, 1.4); teal.position.set(-2.6, 2.3, 2.2); scene.add(teal);
const pink = new THREE.PointLight('#ff4f9a', 6, 8, 1.4); pink.position.set(2.9, 2.2, -1.6); scene.add(pink);
const lampL = new THREE.PointLight('#ffc27a', 4, 6, 1.6); scene.add(lampL);
const moodL = new THREE.PointLight('#9b5de5', 0, 4, 1.2); scene.add(moodL);
const spot = new THREE.SpotLight('#fff1d0', 0, 9, 0.36, 0.55, 1.2); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); scene.add(spot, spot.target);
const rimA = new THREE.PointLight('#ff3fa4', 0, 5, 1.2), rimB = new THREE.PointLight('#3fc8ff', 0, 5, 1.2); scene.add(rimA, rimB);

// ---------- world
const room = new Room(scene);
lampL.position.copy(room.lampPos);
const max = new Max(); scene.add(max.root);
const owner = new Owner(); scene.add(owner.root);
const cat = new Cat(); scene.add(cat.root);
cat.root.position.copy(room.catSpot); cat.root.rotation.y = Math.PI / 2 - 0.2;
const headSlipper = makeSlipper(rand(3)); headSlipper.scale.setScalar(1.15); headSlipper.position.set(0.02, 0.27, 0.0); headSlipper.rotation.set(0.15, 0.4, 0.25);
max.head.add(headSlipper);

// coffee spray droplets
const drops = []; const DR = rand(99);
const dropM = new THREE.MeshStandardMaterial({ color: '#6b3a1a', roughness: 0.2 });
for (let i = 0; i < 46; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.003 + DR() * 0.005, 8, 6), dropM); scene.add(m);
  drops.push({ m, v: new THREE.Vector3((DR() - 0.5) * 1.6, 0.4 + DR() * 1.2, 2.0 + DR() * 2.0), d: DR() * 0.08 });
}

// ---------- key positions
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MAX_SPOT = V(0.55, 0, -0.35);
const OWNER_SIT = V(-0.55, 0, -2.0);
const OWNER_STAND = V(-0.75, 0, -1.45);
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const MAX_TO_OWNER = yawTo(MAX_SPOT, OWNER_SIT);
const MAX_TO_TV = yawTo(MAX_SPOT, room.tvPos);
const PILE_TOP = V(2.45, 0.5, -2.2);
const DOOR = V(3.75, 0, 1.0);
room.bowl.position.set(0.62, 0, -0.85);

// ---------- dialogue helpers
const lines = TL.lines;
function speech(who, t) {
  for (const L of lines) {
    if (L.speaker !== who || t < L.start - 0.05 || t > L.end + 0.1) continue;
    const f = (t - L.start) * FPS, i = Math.floor(f), u = f - i;
    const get = (arr, k) => (k < 0 || k >= arr.length ? 0 : arr[k]);
    return { open: lerp(get(L.mouthOpen, i), get(L.mouthOpen, i + 1), u), round: lerp(get(L.mouthRound, i), get(L.mouthRound, i + 1), u), line: L };
  }
  return { open: 0, round: 0, line: null };
}
function blinkAt(t, seed) {
  const period = 3.1 + seed * 0.7; const ph = (t + seed * 1.37) % period;
  return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
}

// ---------- camera helpers
const orbit = (c, az, el, d) => V(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
let MH = V(), OH = V(), CH = V();

// shot list: each returns {pos, target, fov, roll?}
const SHOTS = [
  { t: 0, f: (t) => { // TV news open, pull back over Max's head
    const u = easeInOut(range(t, 0.2, 2.75));
    return { pos: V(lerp(1.28, 0.28, u), lerp(1.24, 1.28, u), lerp(3.1, -1.55, u)), target: V(lerp(1.3, 0.8, u), lerp(1.24, 0.85, u), lerp(4.0, 1.0, u)), fov: lerp(34, 50, u) };
  } },
  { t: 2.75, f: (t) => { const u = easeOut(range(t, 2.75, 5)); return { pos: orbit(MH, MAX_TO_OWNER + 0.28, 0.06, lerp(1.35, 1.05, u)), target: MH.clone().add(V(0, -0.08, 0)), fov: 38 }; } },
  { t: 5.0, f: (t) => { const z = easeOut(range(t, 5.08, 5.3)); return { pos: orbit(OH, yawTo(OWNER_SIT, MAX_SPOT) - 0.15, -0.03, lerp(1.6, 0.95, z)), target: OH.clone().add(V(0, -0.12 + z * 0.06, 0)), fov: lerp(42, 34, z) }; } },
  { t: 6.55, f: (t) => {
    const u = easeInOut(range(t, 6.55, 10.7));
    const punch = [8.42, 8.86, 9.3].reduce((a, k, i) => a + (t > k ? 1 : 0) * 0.12 * (1 - Math.exp(-(t - k) * 30)), 0);
    const c = MH.clone().add(V(0, lerp(-0.2, -0.08, smooth(range(t, 8.2, 8.6))), 0));
    return { pos: orbit(c, MAX_TO_OWNER + lerp(0.75, 0.35, u), 0.16, lerp(1.7, 1.45, u) * (1 - punch)), target: c, fov: 40 };
  } },
  { t: 10.7, f: (t) => { const u = easeOut(range(t, 10.7, 11.95)); return { pos: orbit(OH.clone().add(V(0, -0.15, 0)), yawTo(OWNER_SIT, MAX_SPOT) + 0.1, 0.02, lerp(1.9, 1.6, u)), target: OH.clone().add(V(0, -0.15, 0)), fov: 40 }; } },
  { t: 11.95, f: (t) => { const u = easeOut(range(t, 11.95, 15)); return { pos: orbit(MH, MAX_TO_OWNER + 0.08, -0.22, lerp(1.2, 0.98, u)), target: MH.clone().add(V(0, -0.04, 0)), fov: 40, roll: 0.03 }; } },
  { t: 15.0, f: (t) => { const u = easeInOut(range(t, 15, 16.95)); return { pos: orbit(MH, MAX_TO_OWNER - 0.25, 0.04, lerp(1.0, 0.74, u)), target: MH.clone().add(V(0, -0.03, 0)), fov: 36, roll: -0.08 }; } },
  { t: 16.95, f: (t) => { const u = easeInOut(range(t, 16.95, 19.9)); return { pos: V(lerp(1.3, 1.85, u), lerp(1.75, 0.95, u), lerp(-0.5, -1.05, u)), target: V(2.45, lerp(0.15, 0.35, u), -2.25), fov: lerp(46, 38, u) }; } },
  { t: 19.9, f: (t) => { const u = easeOut(range(t, 19.9, 21.25)); return { pos: orbit(OH.clone().add(V(0, -0.1, 0)), yawTo(OWNER_SIT, MAX_SPOT) - 0.15, 0.04, lerp(1.9, 1.7, u)), target: OH.clone().add(V(-0.12, -0.12, 0)), fov: 42 }; } },
  { t: 21.25, f: (t) => { const z = easeOut(range(t, 21.25, 21.4)); return { pos: orbit(CH, Math.PI / 2 - 0.2 + 0.15, -0.05, lerp(0.75, 0.48, z)), target: CH, fov: 36 }; } },
  { t: 21.85, f: (t) => { const u = easeOut(range(t, 21.85, 23.7)); return { pos: orbit(MH.clone().add(V(0, -0.08, 0)), MAX_TO_OWNER + 0.4, 0.04, lerp(1.05, 0.95, u)), target: MH.clone().add(V(0, -0.08, 0)), fov: 40 }; } },
  { t: 23.7, f: (t) => { const u = easeInOut(range(t, 23.7, 28)); const az = yawTo(PILE_TOP, V(0, 0, 0)); return { pos: orbit(MH.clone().add(V(0, -0.25, 0)), az + lerp(-0.25, 0.3, u), lerp(-0.05, 0.45, u), lerp(1.35, 2.1, u)), target: MH.clone().add(V(0, -0.25, 0)), fov: 42, roll: lerp(0.04, -0.03, u) }; } },
  { t: 28.0, f: (t) => { const u = easeOut(range(t, 28, 29.9)); return { pos: orbit(MH.clone().add(V(0, 0.0, 0)), MAX_TO_OWNER, -0.04, lerp(1.45, 1.15, u)), target: MH.clone().add(V(0, 0.0, 0)), fov: 42 }; } },
  { t: 29.9, f: (t) => {
    const u = easeInOut(range(t, 29.9, 37.6));
    const punch = [29.95, 32.05, 34.65].reduce((a, k) => a + (t > k ? 0.08 * Math.exp(-(t - k) * 4) : 0), 0);
    const c = MH.clone().add(V(0, 0.18, 0));
    return { pos: orbit(c, MAX_TO_OWNER + lerp(0.3, -0.3, u), -0.08, 1.75 * (1 - punch)), target: c, fov: 42 };
  } },
  { t: 37.6, f: (t) => { const u = easeOut(range(t, 37.6, 40.2)); const c = OH.clone().add(V(0, -0.35, 0)); return { pos: orbit(c, yawTo(OWNER_STAND, MAX_SPOT) + 0.38, 0.1, lerp(2.3, 2.0, u)), target: c, fov: 44 }; } },
  { t: 40.2, f: (t) => { const u = easeInOut(range(t, 40.2, 42)); return { pos: orbit(MH, yawTo(MAX_SPOT, OWNER_STAND) + 0.36, 0.17, lerp(2.0, 1.75, u)), target: MH.clone().add(V(0, -0.05, 0)), fov: 40 }; } },
  { t: 42.0, f: (t) => { const u = easeInOut(range(t, 42, 44.15)); const c = OH.clone().add(V(0, -0.18, 0)); return { pos: orbit(c, yawTo(OWNER_STAND, MAX_SPOT) + 0.2, 0.02, lerp(1.45, 1.25, u)), target: c, fov: 40 }; } },
  { t: 44.15, f: (t) => { const u = easeOut(range(t, 44.15, 46.35)); return { pos: orbit(MH, MAX_TO_OWNER + 0.05, 0.03, lerp(0.95, 0.8, u)), target: MH, fov: 38 }; } },
  { t: 46.35, f: (t) => {
    const w = easeInOut(range(t, 46.95, 47.55));
    const z = easeInOut(range(t, 47.55, 48.9));
    const a = { pos: orbit(MH, MAX_TO_OWNER + 0.3, 0.05, 0.9), target: MH };
    const winPos = V(0.35, 1.5, -1.4), nw = V(0.3, 1.85, -9.3);
    const pos = a.pos.clone().lerp(winPos, w), target = a.target.clone().lerp(nw, w);
    return { pos, target, fov: lerp(38, lerp(55, 18, z), w), roll: Math.sin(w * Math.PI) * 0.12 };
  } },
  { t: 49.0, f: (t) => { const u = easeOut(range(t, 49.0, 50.3)); const d = lerp(0.5, 1.15, u); return { pos: orbit(OH, yawTo(OWNER_STAND, MAX_SPOT) + 0.1, 0.0, d), target: OH.clone().add(V(0, -0.01, 0)), fov: 2 * Math.atan(0.205 / d) * 180 / Math.PI * 1.0 }; } },
  { t: 50.3, f: (t) => {
    const u = easeInOut(range(t, 52.4, 55));
    const C = V(-2.06, 1.5, -1.79), dir = V(Math.cos(0.4), 0, Math.sin(0.4));
    const tgt0 = C.clone().addScaledVector(dir, 3).setY(1.12);
    const pos = C.clone().lerp(OH.clone().setY(1.55), u * 0.42);
    const target = tgt0.clone().lerp(OH.clone().add(V(0.25, -0.05, 0.1)), u * 0.5);
    return { pos, target, fov: lerp(48, 40, u) };
  } },
];
const CUTS = SHOTS.map((s) => s.t);

// ---------- per-frame state
function maxState(t) {
  const sp = speech('max', t);
  const p = { mouth: sp.open, mouthRound: sp.round, blink: blinkAt(t, 0), lid: 0.12, wag: 0.5, wagSpeed: 10 };
  let pos = MAX_SPOT.clone(), yaw = MAX_TO_OWNER;
  // S1: watching TV then turning
  if (t < 2.75) {
    yaw = MAX_TO_TV;
    p.headYaw = track([[0, 0], [2.0, 0], [2.6, -1.4]], t); p.headPitch = -0.12; p.earPerk = 0.4 + Math.sin(t * 4) * 0.1; p.wag = 0.2;
  } else if (t < 5) {
    yaw = track([[2.75, MAX_TO_OWNER + 0.6], [3.0, MAX_TO_OWNER]], t);
    p.headYaw = track([[2.75, -0.3], [3.0, 0]], t);
    p.lid = 0.3; p.brow = -0.3; p.browAngle = 0.3; p.wag = 0.15;
    p.browR = track([[4.5, 0], [4.7, 1.1, 'b']], t); p.headRoll = track([[4.5, 0], [4.75, 0.12]], t);
    p.headPitch = track([[3.0, 0], [3.4, 0.08], [4.4, 0.0]], t);
  } else if (t < 6.55) { // owner's reaction shot; Max stays put
    p.lid = 0.3; p.brow = -0.2;
  } else if (t < 10.7) { // complaining about food
    const look = pulse(t, 6.7, 7.9, 0.2);
    p.headPitch = look * 0.35; p.headYaw = look * 0.55; p.lookX = look * 0.3;
    p.lid = 0.3; p.brow = 0.2; p.browAngle = -0.3;
    const beats = [8.42, 8.86, 9.3];
    p.pawRaise = beats.reduce((a, k) => a + pulse(t, k - 0.12, k + 0.18, 0.08) * 0.55, 0);
    p.headRoll = beats.reduce((a, k, i) => a + pulse(t, k - 0.1, k + 0.3, 0.08) * (i % 2 ? -0.12 : 0.12), 0);
    p.wag = 0.1; p.earSwing = Math.sin(t * 9) * 0.05;
  } else if (t < 11.95) {
    p.lid = 0.45; p.brow = -0.2;
  } else if (t < 15) { // cardboard's sad cousin (deadpan)
    p.lid = track([[11.95, 0.5], [13.8, 0.5], [14.2, 0.2], [14.9, 0.55]], t); p.brow = -0.4; p.browAngle = 0.2;
    p.lookY = track([[13.8, 0], [14.1, 0.8], [14.6, 0.8], [14.8, 0]], t);
    p.headPitch = track([[13.8, 0], [14.2, -0.12], [14.9, 0.05]], t); p.wag = 0.05; p.earPerk = -0.2;
  } else if (t < 16.95) { // conspiratorial lean
    p.lean = track([[15, 0], [15.6, 0.22]], t);
    p.headPitch = 0.12; p.lid = 0.38; p.brow = -0.5; p.browAngle = 0.5;
    p.lookX = track([[15, 0], [15.3, 0.7], [15.7, 0.7], [15.9, -0.7], [16.3, -0.7], [16.5, 0]], t);
    p.wag = 0.05; p.earPerk = -0.3;
  } else if (t < 19.9) { p.lid = 0.25; p.brow = 0.4; p.wag = 0.6; }
  else if (t < 21.85) { p.lid = 0.35; p.brow = 0; p.wag = 0.2; p.headYaw = -0.2; }
  else if (t < 23.7) { // the cat had motive (shrug)
    const sh = pulse(t, 21.9, 23.3, 0.25);
    p.headRoll = sh * 0.22; p.browL = sh * 0.9; p.browR = sh * 0.2; p.lid = 0.35; p.pawRaise = sh * 0.35; p.bodyRoll = sh * 0.04; p.lookX = sh * -0.5; p.lookY = sh * 0.3;
  } else if (t < 28) { // on the slipper pile
    pos = PILE_TOP.clone(); yaw = yawTo(PILE_TOP, V(0.1, 0, 0.3));
    p.headPitch = -0.22; p.lid = 0.42; p.brow = 0.1; p.wag = 1; p.wagSpeed = 14; p.headRoll = Math.sin(t * 2) * 0.05; p.slipper = true;
    p.jawExtra = t > 25.9 ? 0.12 : 0;
  } else if (t < 37.6) { // demands from the pouf
    pos = MAX_SPOT.clone().add(V(0, 0.36, 0));
    p.shades = clamp(spring(t - 28.65, 13, 6));
    if (t < 28.65) p.shades = 0;
    p.headPitch = -0.1; p.lid = 0.3; p.brow = 0.1; p.wag = 0.6;
    p.pawRaise = [29.95, 32.05, 34.65].reduce((a, k, i) => a + pulse(t, k, k + 1.4, 0.15) * (0.75 + i * 0.05), 0);
    p.headRoll = Math.sin(t * 1.5) * 0.05; p.earPerk = 0.2;
  } else if (t < 42) { // owner freaks out; Max unbothered on pouf
    pos = MAX_SPOT.clone().add(V(0, 0.36, 0));
    p.shades = 1; p.shadesLower = track([[40.6, 0], [41.0, 1]], t); p.lid = 0.45; p.brow = -0.2; p.lookY = t > 40.6 ? 0.25 : 0; p.wag = 0.1;
  } else if (t < 46.35) {
    p.shades = 0;
    const happy = 1 - smooth(range(t, 44.95, 45.2));
    p.eyeBig = 0.3 * happy; p.brow = lerp(-0.1, 0.8, happy); p.wag = 0.3 + happy * 0.7; p.wagSpeed = 14; p.lid = lerp(0.35, 0.05, happy);
    p.lookX = (1 - happy) * 0.6; p.lookY = (1 - happy) * -0.2; p.earPerk = happy * 0.4 - (1 - happy) * 0.3;
    p.headRoll = (1 - happy) * 0.1;
  } else if (t < 49) { // second family
    p.headYaw = track([[46.4, 0], [46.9, -0.9]], t); p.lookX = track([[46.4, 0], [46.8, -0.6]], t); p.brow = 0.6; p.lid = 0.2; p.wag = 0.9; p.wagSpeed = 13;
  } else if (t < 50.3) { p.lid = 0.25; p.brow = 0.4; p.wag = 0.6; }
  else { // walking away
    const start = MAX_SPOT.clone(), end = DOOR.clone();
    const u = clamp((t - 51.0) / 3.6);
    const ue = smooth(u) * 0.15 + u * 0.85;
    pos = start.clone().lerp(end, ue);
    yaw = track([[50.3, MAX_TO_OWNER], [50.9, yawTo(start, end)]], t);
    p.stand = smooth(range(t, 50.6, 51.1));
    const dist = start.distanceTo(end) * ue;
    p.walk = smooth(range(t, 50.95, 51.3)); p.walkPhase = (dist / 0.4) * Math.PI * 2;
    p.bounce = Math.abs(Math.sin(p.walkPhase)) * 0.02 * p.walk;
    p.headYaw = track([[51.2, 0], [51.6, -0.9], [52.5, -0.9], [52.9, 0]], t);
    p.shades = t > 50.4 ? 1 : 0; p.wag = 1; p.wagSpeed = 12; p.lid = 0.3; p.brow = 0.2;
  }
  return { pos, yaw, p };
}

function ownerState(t) {
  const sp = speech('owner', t);
  const p = { mouth: sp.open, mouthRound: sp.round, blink: blinkAt(t, 1), sit: 1, lid: 0.12 };
  let pos = OWNER_SIT.clone(), yaw = 0.42;
  p.headYaw = 0.12; p.lookX = 0.1;
  const restArms = { armL: [-0.35, 0, 0.18, 1.2], armR: [-0.35, 0, 0.18, 1.2] };
  Object.assign(p, restArms);
  if (t < 5.12) { // sipping coffee
    p.mug = true; const sip = pulse(t, 3.6, 5.3, 0.4);
    p.armR = [lerp(-0.5, -1.05, sip), 0.2, 0.25, lerp(1.5, 2.3, sip)];
    p.headPitch = sip * -0.1; p.lid = 0.3;
  } else if (t < 6.55) { // spit take!
    p.mug = true;
    p.armR = [-0.9, 0.2, 0.35, 1.8];
    p.eyeBig = 0.8; p.pupil = -0.45; p.brow = 1.2; p.lid = 0;
    p.lean = track([[5.05, 0.05], [5.2, -0.18], [5.5, -0.1]], t);
    p.mouth = Math.max(p.mouth, pulse(t, 5.05, 5.35, 0.05) * 0.9);
    p.headPitch = track([[5.05, 0], [5.2, -0.15], [5.6, 0]], t); p.blink = 0;
  } else if (t < 10.7) {
    p.lid = 0.1; p.brow = 0.6; p.eyeBig = 0.3; p.mug = true; p.armR = [-0.6, 0.2, 0.3, 1.6];
  } else if (t < 15) { // premium kibble
    p.bag = t < 12.2 || t > 14.9 ? t < 12.2 : true;
    p.bag = true;
    p.armR = [track([[10.7, -0.6], [10.95, -1.45]], t), 0, 0.3, track([[10.7, 0.3], [10.95, 1.0]], t), -0.2];
    p.brow = 0.8; p.smile = 1; p.lid = 0.05; p.headRoll = 0.08;
    if (t > 11.95) { p.brow = track([[12, 0.8], [13, -0.3]], t); p.smile = 0; p.armR = [track([[11.95, -1.45], [13, -0.8]], t), 0, 0.3, 1.0]; }
  } else if (t < 19.9) {
    p.brow = 0.3; p.lid = 0.15; p.headPitch = 0.05;
  } else if (t < 21.85) { // you blamed the cat!
    p.armL = [track([[19.9, -0.4], [20.1, -1.45]], t), -0.3, track([[19.9, 0.2], [20.1, 0.9]], t), 0.05];
    p.headYaw = track([[19.9, 0.12], [20.3, -0.35]], t); p.lookX = track([[19.9, 0.1], [20.2, -0.5]], t);
    p.brow = 1; p.browAngle = -0.4; p.eyeBig = 0.35; p.lean = 0.08;
  } else if (t < 28) {
    p.brow = track([[21.85, 1], [24, -0.4]], t); p.browAngle = 0.4; p.lid = 0.35; p.headRoll = -0.08;
    p.armL = [-1.1, 0.4, 0.5, 2.0]; p.armR = [-1.1, -0.4, 0.5, 2.0]; // arms crossed-ish
  } else if (t < 37.6) {
    p.lid = 0.3; p.brow = 0.6; p.browAngle = -0.3; p.headRoll = 0.1;
  } else if (t < 42) { // a personal chef?!
    const up = smooth(range(t, 37.6, 38.0));
    p.sit = 1 - up; pos = OWNER_SIT.clone().lerp(OWNER_STAND, up); yaw = lerp(0.42, yawTo(OWNER_STAND, MAX_SPOT), up);
    p.headYaw = 0;
    const flail = Math.sin(t * 9) * 0.25;
    p.armL = [-2.3 + flail, 0, 0.55, 0.6]; p.armR = [-2.3 - flail, 0, 0.55, 0.6];
    p.eyeBig = 0.5; p.brow = 1.2; p.browAngle = -0.2;
    if (t > 40.2) { p.armL = [-0.3, 0, 0.55, 1.6, 0, 0.6]; p.armR = [-0.3, 0, 0.55, 1.6, 0, 0.6]; p.brow = -0.3; p.browAngle = 0.5; p.eyeBig = 0; p.lid = 0.3; }
  } else if (t < 46.35) { // ugh, fine. deal.
    p.sit = 0; pos = OWNER_STAND.clone(); yaw = yawTo(OWNER_STAND, MAX_SPOT); p.headYaw = 0;
    const slump = pulse(t, 42.1, 43.3, 0.3);
    p.slump = slump; p.headPitch = slump * 0.25 + track([[43.3, 0], [43.6, 0.05]], t); p.lid = 0.3 + slump * 0.3; p.brow = -0.2;
    p.armR = [track([[43.3, -0.2], [43.7, -1.25]], t), 0, 0.15, track([[43.3, 0.6], [43.7, 0.25]], t)];
    p.smile = t > 43.6 ? 0.6 : 0;
  } else if (t < 49) {
    p.sit = 0; pos = OWNER_STAND.clone(); yaw = yawTo(OWNER_STAND, MAX_SPOT); p.headYaw = 0;
    p.armR = [track([[46.4, -1.25], [47, -0.3]], t), 0, 0.15, 0.4]; p.brow = track([[46.4, 0], [47.4, 1.0]], t); p.eyeBig = track([[46.4, 0], [47.4, 0.5]], t);
  } else { // shock
    p.sit = 0; pos = OWNER_STAND.clone(); yaw = yawTo(OWNER_STAND, MAX_SPOT); p.headYaw = 0;
    p.eyeBig = 1.0; p.pupil = -0.55; p.brow = 1.4; p.lid = 0; p.blink = 0;
    p.mouth = Math.max(p.mouth, 0.55); p.mouthRound = Math.max(p.mouthRound, 0.8);
    p.armL = [-1.35, 0.5, 0.15, 2.45]; p.armR = [-1.35, -0.5, 0.15, 2.45];
    p.lean = -0.06;
    if (t > 50.3) {
      yaw = yawTo(OWNER_STAND, V(-2.06, 0, -1.79));
      p.headYaw = 0; p.lookX = track([[50.3, 0], [52.5, 0.0], [53.0, 0.35]], t);
      p.lid = t > 53.6 && t < 53.75 ? 0.6 : 0; // eye twitch
      p.headRoll = noise1(t * 30) * 0.008;
    }
  }
  return { pos, yaw, p };
}

function catState(t) {
  const p = { lid: 0.5, blink: blinkAt(t, 2) };
  p.hiss = pulse(t, 21.3, 21.85, 0.06);
  p.headYaw = t > 19.9 && t < 21.3 ? 0.35 : 0;
  if (t > 21.85 && t < 28) { p.lid = 0.65; p.headYaw = 0.3; }
  return p;
}

function mood(t) {
  return {
    purple: pulse(t, 15.0, 16.95, 0.25),
    spot: pulse(t, 28.0, 37.6, 0.2) + pulse(t, 40.2, 42.0, 0.1) * 0,
    red: t > 48.35 && t < 49.0 ? 0.6 + 0.4 * Math.sin((t - 48.35) * 30) : 0 + (t >= 49 && t < 50.3 ? 0.5 + 0.5 * Math.sin(t * 25) : 0),
    pile: pulse(t, 16.95, 19.9, 0.2) + pulse(t, 23.7, 28, 0.2),
  };
}

// ---------- frame update
function update(t) {
  // characters
  const ms = maxState(t);
  max.root.position.copy(ms.pos); max.root.rotation.y = ms.yaw;
  max.update(ms.p, t);
  headSlipper.visible = !!ms.p.slipper;
  const os = ownerState(t);
  owner.root.position.copy(os.pos); owner.root.rotation.y = os.yaw;
  owner.update(os.p, t);
  cat.update(catState(t), t);
  scene.updateMatrixWorld(true);
  MH = max.headWorld(); OH = owner.head.localToWorld(V(0, 0.12, 0.04)); CH = cat.head.localToWorld(V(0, 0, 0.03));

  // camera
  let si = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t) si = i;
  const sh = SHOTS[si].f(t);
  // handheld + impact shake
  const hh = 0.006, imp = [5.12, 21.3, 48.4, 49.05].reduce((a, k) => a + (t > k ? Math.exp(-(t - k) * 7) : 0), 0) * 0.03;
  const amp = hh + imp;
  const shake = V(noise1(t * 1.3) * amp, noise1(t * 1.1 + 9) * amp, noise1(t * 1.2 + 4) * amp);
  camera.position.copy(sh.pos).add(shake);
  camera.up.set(0, 1, 0);
  camera.lookAt(sh.target.clone().add(shake.multiplyScalar(0.5)));
  camera.rotateZ((sh.roll || 0) + noise1(t * 0.7 + 3) * 0.004);
  camera.fov = sh.fov; camera.updateProjectionMatrix();

  // lights / mood
  const m = mood(t);
  const dim = 1 - Math.max(m.purple * 0.65, m.spot * 0.75);
  sun.intensity = 3.2 * dim; key.intensity = 1.4 * dim; hemi.intensity = 0.9 * (1 - Math.max(m.purple, m.spot) * 0.6);
  teal.intensity = 5 * (1 + m.spot * 1.5); pink.intensity = 6 * (1 + m.spot * 0.4 + m.red * 2);
  lampL.intensity = 4 * dim + 2 * m.pile;
  scene.environmentIntensity = 0.45 * (1 - Math.max(m.purple, m.spot) * 0.5);
  moodL.intensity = m.purple * 6; moodL.color.set('#9b5de5'); moodL.position.copy(MH).add(V(0.4, 0.3, 0.4));
  if (m.red > 0) { moodL.intensity = m.red * 9; moodL.color.set('#ff2a4a'); moodL.position.copy(camera.position).add(V(0, 0.4, 0)); moodL.distance = 6; }
  spot.intensity = m.spot * 13; spot.position.copy(MAX_SPOT).add(V(0.0, 3.0, 0.6)); spot.target.position.copy(MAX_SPOT).add(V(0, 0.5, 0));
  rimA.intensity = m.spot * 5 + m.pile * 4; rimB.intensity = m.spot * 5 + m.pile * 4;
  const rc = m.pile > 0.01 ? PILE_TOP : MAX_SPOT;
  rimA.position.copy(rc).add(V(-0.9, 1.2, -0.8)); rimB.position.copy(rc).add(V(0.9, 1.0, -0.6));
  if (m.pile > 0.01) { rimA.position.copy(PILE_TOP).add(V(-1.2, 1.3, 0.3)); rimB.position.copy(PILE_TOP).add(V(0.2, 1.1, 1.3)); }

  updateFurLights({ hemi, dirs: [sun, key], points: [teal, pink, lampL, moodL, rimA, rimB, null], spot, env: scene.environmentIntensity * 1.5 });

  // room state
  const iconOn = (k) => clamp((t - k) / 0.6) * (1 - smooth(range(t, 37.55, 37.8)));
  const up = V(0, 1, 0);
  const camRight = V().subVectors(camera.position, MH).cross(up).normalize().multiplyScalar(-1);
  const icons = t > 29 && t < 38 ? [
    { on: iconOn(29.95), pos: MH.clone().add(camRight.clone().multiplyScalar(-0.27)).add(V(0, 0.47, 0)), scale: 0.55 },
    { on: iconOn(32.05), pos: MH.clone().add(camRight.clone().multiplyScalar(0.27)).add(V(0, 0.47, 0)), scale: 0.55 },
    { on: iconOn(34.65), pos: MH.clone().add(V(0, 0.78, 0)), scale: 0.55 },
  ] : null;
  room.update(t, { tvOn: t < 15, pouf: t >= 28 && t < 46.35, camPos: camera.position, icons, flap: t > 54.0 ? Math.sin((t - 54.0) * 9) * Math.exp(-(t - 54.0) * 2) * 0.9 : 0 });
  room.bowl.visible = t < 28;

  // coffee spray
  const ds = t - 5.1;
  drops.forEach((d) => {
    const tt = ds - d.d;
    d.m.visible = tt > 0 && tt < 0.9 && t < 6.55;
    if (!d.m.visible) return;
    const yawO = owner.root.rotation.y;
    const v = d.v.clone().applyAxisAngle(up, yawO);
    const origin = owner.mouth.localToWorld(V(0, 0, 0.02));
    d.m.position.copy(origin).addScaledVector(v, tt).add(V(0, -4.9 * tt * tt, 0));
  });
}

function render(t) { update(t); renderer.render(scene, camera); }

window.TOTAL_FRAMES = Math.round(TL.duration * FPS);
window.renderFrame = async (frame) => {
  render(frame / FPS);
  return await new Promise((res) => renderer.domElement.toBlob((b) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(b); }, 'image/jpeg', 0.94));
};
window.renderAt = (t) => render(t);
window.READY = true;
if (params.has('t')) render(+params.get('t'));
if (params.has('play')) { const t0 = performance.now(); const loop = () => { render(((performance.now() - t0) / 1000) % TL.duration); requestAnimationFrame(loop); }; loop(); }
