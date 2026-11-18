import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMilo, makeDad, makeMom } from './lib/human.js';
import { Kitchen, Dock, Counter } from './lib/sets.js';
import { makeCake, makeHelmet, makeBubbleSleeve, makePlate, makeToastSlice, makeBaconStrip, makeMug, makeTablet, makeRod, makeLine, makeBoot, makeTicketHalf } from './lib/props.js';
import { track, lerp, clamp, smooth, easeOut, easeIn, easeInOut, easeOutBack, range, pulse, noise1, spring } from './lib/util.js';

const params = new URLSearchParams(location.search);
const W = +(params.get('w') || 1080), H = +(params.get('h') || 1920);
await document.fonts.load('700 40px Fredoka');
await document.fonts.load('600 40px Fredoka');
const TL = await (await fetch('/timeline.json')).json();
const FPS = TL.fps;
const LN = Object.fromEntries(TL.lines.map((l) => [l.id, l]));

// ---------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: params.get('aa') !== '0', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#10101a');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.03, 200);

const hemi = new THREE.HemisphereLight('#fff', '#888', 1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff', 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4; scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#fff', 0.8); scene.add(fill, fill.target);
const pendant = new THREE.PointLight('#ffc77a', 4, 6, 1.5); scene.add(pendant);
const candle = new THREE.PointLight('#ffb050', 0, 2.5, 1.6); scene.add(candle);
const glowL = new THREE.PointLight('#ffc040', 0, 2.2, 1.4); scene.add(glowL);   // light thrown by the golden numbers
const glowL2 = new THREE.PointLight('#ffc040', 0, 2.2, 1.4); scene.add(glowL2);
const rim = new THREE.PointLight('#7fa8ff', 0, 5, 1.2); scene.add(rim);

// ---------- world
const kitchen = new Kitchen(scene);
const DOCK_O = new THREE.Vector3(40, 0, 0);
const dock = new Dock(scene, DOCK_O);
const milo = makeMilo(), dad = makeDad(), mom = makeMom();
scene.add(milo.root, dad.root, mom.root);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = (x, y, z) => DOCK_O.clone().add(V(x, y, z));

const cake = makeCake(); cake.position.set(0, 0.775, -0.3); scene.add(cake);
const helmet = makeHelmet(); scene.add(helmet);
const bubble = makeBubbleSleeve(); dad.arms[0].sh.add(bubble.group); dad.arms[0].el.add(bubble.lower);
const plate = makePlate({ bacon: 2, toast: 1, eggs: 1 }); plate.position.set(0.02, 0.78, -0.7); scene.add(plate);
const plate2 = makePlate({ toast: 1 }); plate2.position.set(0, 0.78, 0.08); scene.add(plate2);
const toast = makeToastSlice(); dad.arms[1].hold.add(toast); toast.position.set(0, -0.02, 0.03);
const bacon = makeBaconStrip(); milo.arms[1].hold.add(bacon); bacon.position.set(0, -0.06, 0.02);
const mugD = makeMug('#ff8c42'), mugM = makeMug('#4cc9f0'); scene.add(mugD, mugM);
mugD.position.set(0.05, 0.78, -0.72); mugM.position.set(-0.04, 0.78, 0.1);
const tablet = makeTablet(); tablet.position.set(0.36, 0.91, -0.12); tablet.rotation.set(-0.28, -0.62, 0, 'YXZ'); scene.add(tablet);
const rodM = makeRod(), rodD = makeRod(), lineM = makeLine(), lineD = makeLine(); scene.add(rodM, rodD, lineM, lineD);
const boot = makeBoot(); scene.add(boot);
const tick = [makeTicketHalf(-1), makeTicketHalf(1)]; tick.forEach((m) => scene.add(m));
const rodF = makeRod(); scene.add(rodF); // flashback: dad holding a rod

const cDad = new Counter(scene), cMilo = new Counter(scene), cMom = new Counter(scene, { size: 0.26 }), cFriend = new Counter(scene, { size: 0.16 }), cGran = new Counter(scene, { size: 0.2 });

// ---------- timeline anchors (seconds)
const T = {
  s2: 4.69, s3: 8.7, s4: LN.v4.start - 0.2, s5: LN.v5.start - 0.25, s6: LN.n1.start - 0.8, s7: LN.x1.start - 0.15,
  s8: LN.x3.start - 0.25, s9: LN.x4.end + 0.3, s10: LN.c2.end + 0.2, s11: LN.v7.end + 0.15, end: TL.duration,
};
T.mid = T.s9 + 0.75;            // clock hits midnight
T.zero = T.mid + 0.35; T.spin = T.zero + 0.45; T.land = LN.c1.start - 0.42;
window.T = T;
const scn = (t) => (t < T.s2 ? 1 : t < T.s3 ? 2 : t < T.s4 ? 3 : t < T.s5 ? 4 : t < T.s6 ? 5 : t < T.s7 ? 6 : t < T.s8 ? 7 : t < T.s9 ? 8 : t < T.s10 ? 9 : t < T.s11 ? 10 : 11);

// ---------- helpers
function speech(who, t) {
  for (const L of TL.lines) {
    const sp = L.speaker === 'vo' ? null : L.speaker;
    if (sp !== who || t < L.start - 0.05 || t > L.end + 0.1) continue;
    const f = (t - L.start) * FPS, i = Math.floor(f), u = f - i;
    const get = (a, k) => (k < 0 || k >= a.length ? 0 : a[k]);
    return { open: lerp(get(L.mouthOpen, i), get(L.mouthOpen, i + 1), u), round: lerp(get(L.mouthRound, i), get(L.mouthRound, i + 1), u), id: L.id };
  }
  return { open: 0, round: 0, id: null };
}
function blinkAt(t, seed) { const period = 3.3 + seed * 0.6, ph = (t + seed * 1.37) % period; return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0; }
const orbit = (c, az, el, d) => V(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const _m = new THREE.Matrix4(), _l = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
function follow(obj, parent, pos, rot = [0, 0, 0]) {
  parent.updateWorldMatrix(true, false);
  _l.compose(V(...pos), _q.setFromEuler(new THREE.Euler(...rot)), V(1, 1, 1));
  _m.multiplyMatrices(parent.matrixWorld, _l); _m.decompose(obj.position, obj.quaternion, _s);
}
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// seating
const DAD_SEAT = V(0, 0, -1.0), MILO_SEAT = V(0, 0, 0.42);
const seatY = (h) => 0.475 - 0.5 * h.body.scale.y; // so the pelvis lands on the chair
const DOCK_DAD = D(0.3, 0, -2.0), DOCK_MILO = D(-0.3, 0, -2.0);
const dockY = (h) => 0.38 - 0.5 * h.body.scale.y + 0.03;

// ---------- character performance
function poses(t) {
  const S = scn(t);
  const ms = speech('milo', t), ds = speech('dad', t);
  const M = { pos: MILO_SEAT.clone(), yaw: Math.PI, p: { sit: 1, mouth: ms.open, mouthRound: ms.round, blink: blinkAt(t, 0), lid: 0.12 } };
  const Dd = { pos: DAD_SEAT.clone(), yaw: 0, p: { sit: 1, mouth: ds.open, mouthRound: ds.round, blink: blinkAt(t, 1), lid: 0.15 } };
  const Mo = { pos: V(-0.95, 0, -0.85), yaw: 0.72, p: { blink: blinkAt(t, 2), lid: 0.12, smile: 0.6 }, vis: S <= 2 };
  M.pos.y = seatY(milo); Dd.pos.y = seatY(dad);
  const m = M.p, d = Dd.p;
  const restArms = [-0.55, 0, 0.1, 1.15];
  m.armL = m.armR = d.armL = d.armR = restArms;

  if (S === 1) {
    // Milo leans in, blows candles
    m.lean = track([[0, 0.05], [0.3, 0.3], [1.3, 0.3], [1.7, 0.05]], t);
    const blow = pulse(t, 0.35, 1.05, 0.12);
    m.mouthRound = Math.max(m.mouthRound, blow); m.mouth = Math.max(m.mouth, blow * 0.25); m.lid = 0.25 * blow + 0.1;
    m.headPitch = 0.12 * blow; m.smile = t > 1.2 ? 0.8 : 0;
    m.armL = m.armR = [-0.75, 0, 0.12, 1.3];
    d.smile = 1; d.brow = 0.4;
    const clap = t > 1.25 && t < 3.0 ? Math.abs(Math.sin(t * 11)) : 0;
    d.armL = [-1.15, 0, -0.05 + clap * 0.25, 1.6]; d.armR = [-1.15, 0, -0.05 + clap * 0.25, 1.6];
    if (t > 3.45) { m.smile = 0; m.eyeBig = track([[3.45, 0], [3.7, 0.7]], t); m.pupil = -0.4; m.brow = 1; m.lean = 0.1; m.mouth = Math.max(m.mouth, 0.2); m.lookY = 0.55; m.headPitch = -0.08; }
    Mo.p.armL = Mo.p.armR = [-1.1, 0, -0.05 + (t > 1.25 && t < 3 ? Math.abs(Math.sin(t * 10 + 1)) * 0.25 : 0), 1.6];
  } else if (S === 2) {
    m.eyeBig = 0.5; m.pupil = -0.3; m.brow = 0.8;
    const look = t < 6.2 ? 'mom' : t < 7.75 ? 'tab' : 'dad';
    m.headYaw = look === 'mom' ? -0.55 : look === 'tab' ? 0.45 : 0; m.headPitch = look === 'tab' ? 0.15 : 0;
    m.lookY = look === 'dad' ? 0.5 : 0.35;
    d.smile = 0.7; d.lookX = 0.1; d.armL = d.armR = [-0.9, 0, 0.1, 1.4];
    Mo.p.smile = 0.8; Mo.p.lookX = 0.2;
  } else if (S === 3) {
    d.armR = [-1.05, 0.2, 0.25, 1.9, 0.0]; // toast near mouth
    d.lookX = -0.4; d.headYaw = 0.45; d.brow = 0.3;
    const mPos = V(0.82, 0, -0.45);
    const walkIn = range(t, T.s3, T.s3 + 0.6);
    M.pos = V(lerp(1.35, mPos.x, easeOut(walkIn)), 0, lerp(-0.3, mPos.z, easeOut(walkIn)));
    M.yaw = yawTo(mPos, DAD_SEAT) ; m.sit = 0;
    m.walk = 1 - smooth(range(t, T.s3 + 0.45, T.s3 + 0.7)); m.walkPhase = t * 11;
    m.armL = m.armR = [-0.75, 0, -0.12, 1.0];          // holding the helmet
    m.brow = -0.4; m.browAngle = 0.4; m.lid = 0.3;
    if (t > LN.b3.start - 0.25 && t < 11.95) { m.armL = m.armR = [-0.55, 0, -0.1, 0.9]; m.headPitch = -0.12; m.lid = 0.38; m.brow = -0.6; m.browAngle = 0.6; }
    if (t > 10.0 && t < 11.05) { d.brow = 0.9; d.eyeBig = 0.2; d.lookX = -0.5; d.headYaw = 0.55; }
    if (t >= 11.95) {
      m.armL = restArms.map((x, i) => (i === 0 ? -0.2 : x)); m.lid = 0.2; m.brow = 0.2;
      const grab = pulse(t, 12.55, 13.15, 0.2), lift = smooth(range(t, 13.1, 13.5));
      m.armR = [lerp(lerp(-0.2, -0.7, grab), -2.6, lift), 0, lerp(0.15, 0.25, lift), lerp(0.4, 0.2, lift)];
      m.headYaw = lift * -0.3; m.smile = lift * 0.7; m.lookX = 0.2;
      d.armR = t < 14.4 ? [-1.05, 0.2, 0.25, 1.9] : [-1.3, -0.35, 0.1, 0.4]; // points toast at Milo
      d.armL = [track([[13.4, -0.4], [13.8, -1.9]], t), 0, 0.3, 0.3];       // reaches for bacon
      d.lookY = track([[13.3, 0], [13.6, 0.5]], t); d.brow = track([[13.3, 0.4], [14.2, -0.5]], t); d.browAngle = 0.5; d.lid = 0.25;
      d.headYaw = 0.5; d.lookX = -0.3;
    }
  } else if (S === 4) {
    M.pos = DOCK_MILO.clone().setY(dockY(milo)); Dd.pos = DOCK_DAD.clone().setY(dockY(dad)); M.yaw = Dd.yaw = Math.PI;
    m.dangle = d.dangle = 1; m.armL = m.armR = [-0.9, 0, 0.1, 0.6]; d.armL = d.armR = [-0.9, 0, 0.1, 0.6];
    m.smile = 0.4; d.smile = 0.6; d.headYaw = 0.35; m.headYaw = -0.25;
    const tBoot = LN.v4.end - 0.6;
    if (t > tBoot - 0.6 && t < LN.f1.start) { const yank = smooth(range(t, tBoot - 0.6, tBoot)); m.armL = m.armR = [lerp(-0.9, -1.9, yank), 0, 0.1, lerp(0.6, 0.3, yank)]; m.lean = -0.2 * yank; m.eyeBig = yank * 0.5; m.mouth = Math.max(m.mouth, yank * 0.4 * (t > tBoot ? 1 : 0)); m.mouthRound = m.mouth; m.headYaw = 0; m.lookY = 0.3 * yank; }
    if (t > LN.f1.start - 0.2 && t < LN.f3.start) { d.armR = [-1.2, 0, 0.1, 2.2, 0.2]; d.smile = 0.9; d.headYaw = 0.5; d.brow = 0.6; m.headYaw = -0.5; m.lookX = -0.3; m.smile = 0.2; }
    if (t >= LN.f3.start - 0.05 && t < LN.f4.start - 0.1) { // big laugh
      m.headPitch = -0.25 + Math.sin(t * 22) * 0.05; m.lean = -0.18 + Math.sin(t * 22) * 0.04; m.lid = 0.8; m.smile = 1; m.mouth = Math.max(0.55, m.mouth); m.armL = [-0.6, 0, 0.3, 1.8]; m.armR = [-1.4, 0, -0.1, 1.9];
      d.headYaw = 0.5; d.smile = 0.5; d.brow = 0.5;
    }
    if (t >= LN.f4.start - 0.1) { d.headYaw = 0.6; d.lid = 0.45; d.brow = -0.3; d.browAngle = 0.5; d.smile = 0; d.lookX = 0.3; m.smile = 0.8; m.headYaw = -0.3; m.lid = 0.3; }
  } else if (S === 5) {
    if (t < T.s5 + 1.85) { // ticket tear
      Dd.pos = V(-0.6, 0, -1.45); Dd.yaw = 0.25; d.sit = 0;
      const tear = smooth(range(t, LN.v5.start + 0.55, LN.v5.start + 0.85));
      d.armL = [-1.35, 0, lerp(-0.25, 0.05, tear), 1.1]; d.armR = [-1.35, 0, lerp(-0.25, 0.05, tear), 1.1];
      d.lid = 0.2; d.brow = 0.5; d.browAngle = -0.3; d.headPitch = 0.1; d.smile = tear * 0.6; d.lookY = -0.2;
      M.pos = V(5, 0, 5);
    } else { // too-long hug
      Dd.pos = V(0.17, 0, 1.25); Dd.yaw = -Math.PI / 2; d.sit = 0;
      M.pos = V(-0.2, 0, 1.25); M.yaw = Math.PI / 2; m.sit = 0;
      const hug = smooth(range(t, T.s5 + 1.95, T.s5 + 2.35));
      if (hug > 0.01) { d.aimL = d.aimR = [[lerp(0.15, 0.3, hug), lerp(-0.95, -0.1, hug), lerp(0.2, 0.95, hug)], [-1, 0, 0.1], lerp(0.3, 1.25, hug)]; }
      d.lean = 0.15 * hug; d.headPitch = 0.25 * hug; d.headYaw = 0.35 * hug; d.lid = lerp(0.15, 1, hug); d.smile = 0.6 * hug;
      m.armL = m.armR = [0.05, 0, -0.05, 0.1];
      m.lean = -0.12 * hug; m.headPitch = -0.15 * hug; m.headYaw = -0.4 * hug; m.eyeBig = 0.4 * hug; m.brow = 0.8 * hug; m.lookX = -0.5;
      m.bounce = hug * 0.04 + Math.sin(t * 3) * 0.006 * hug;
      if (t > LN.h2.start - 0.2) { m.lid = 0.45; m.brow = -0.2; m.eyeBig = 0; }
    }
  } else if (S === 6 || S === 8 || S === 9) {
    m.armL = m.armR = [-0.3, 0, -0.22, 1.3]; d.armL = d.armR = [-0.3, 0, -0.22, 1.3];
    m.lid = 0.25; d.lid = 0.25; m.headPitch = 0.08; d.headPitch = 0.05;
    if (S === 6) {
      if (t > LN.n1.start - 0.3) { m.headPitch = 0; m.brow = 0.6; m.browAngle = -0.4; }
      if (t > LN.n3.start - 0.3) { d.brow = 0.5; d.browAngle = -0.4; d.headPitch = 0; }
      if (t > LN.n3.start + 1.0) { d.lookY = 0.75; d.headPitch = -0.08; }
      if (t > LN.n4.start - 0.6) { m.eyeBig = 0.4; m.pupil = -0.3; m.brow = 1.0; m.lookY = 0.1; m.mouth = Math.max(m.mouth, 0.08); }
      if (t > LN.n5.start - 0.3) { d.lookY = 0; d.brow = 0.9; d.browAngle = -0.6; d.smile = 0.2; }
    }
    if (S === 8) {
      m.brow = 0.9; m.browAngle = -0.7; m.lid = 0.3; m.headPitch = 0;
      d.brow = 0.9; d.browAngle = -0.6; d.headPitch = 0;
    }
    if (S === 9) {
      const wow = smooth(range(t, T.zero, T.zero + 0.3));
      m.lookY = d.lookY = 0.0; m.eyeBig = d.eyeBig = 0.25 * wow; m.headYaw = -0.35 * wow; d.headYaw = 0.35 * wow;
      if (t > T.land) { const joy = smooth(range(t, T.land, T.land + 0.4)); m.smile = d.smile = joy; m.eyeBig = d.eyeBig = 0.4 * (1 - joy) + 0.1; m.brow = d.brow = 0.7 * joy; m.headYaw = lerp(-0.35, 0, joy); d.headYaw = lerp(0.35, 0, joy); }
      if (t > LN.c1.start) { d.lid = 0.3; d.smile = 0.6; d.headRoll = 0.08; d.lookX = 0.1; }
      if (t > LN.c2.start) { m.lid = 0.2; m.brow = -0.2; m.browAngle = 0.5; m.smile = 0.5; m.headPitch = -0.05; m.armR = [-1.3, 0, 0.0, 1.9]; }
      if (t > LN.c2.end - 0.1) { const l = Math.abs(Math.sin(t * 18)); m.smile = d.smile = 1; m.mouth = Math.max(m.mouth, 0.4 + l * 0.2); d.mouth = 0.4 + l * 0.2; m.lid = d.lid = 0.7; m.headPitch = d.headPitch = -0.1; }
    }
  } else if (S === 7) { // flashback: Milo walks off, headphones on
    Dd.pos = V(0.55, 0, -0.55); Dd.yaw = -1.55; d.sit = 0; d.p = 0;
    d.mouth = 0; d.mouthRound = 0;
    d.armR = [-1.0, 0, 0.15, 0.5]; d.armL = [-0.3, 0, 0.1, 0.4];
    d.smile = track([[T.s7, 0.8], [LN.x1.end, 0.8], [LN.x1.end + 0.4, 0]], t); d.brow = track([[LN.x1.end, 0.6], [LN.x1.end + 0.5, 0.4]], t); d.browAngle = track([[LN.x1.end, 0], [LN.x1.end + 0.5, -0.5]], t);
    const u = clamp((t - T.s7 - 0.1) / 2.5);
    const path = (k) => (k < 0.55 ? V(-0.3, 0, 0.45).lerp(V(-2.6, 0, 0.3), k / 0.55) : V(-2.6, 0, 0.3).lerp(V(-3.55, 0, 0.25), (k - 0.55) / 0.45));
    M.pos = path(u); m.sit = 0; M.yaw = yawTo(path(u), path(Math.min(1, u + 0.02))) || -Math.PI / 2;
    m.walk = u < 1 ? 1 : 0; m.walkPhase = u * 26; m.phonesOn = 1; m.armL = m.armR = [0.05, 0, 0.1, 0.3];
    m.headYaw = pulse(t, LN.x1.start - 0.2, LN.x1.end + 0.1, 0.15) * 0.9; m.lid = 0.3;
    d.headYaw = 0; d.lookX = 0;
  } else if (S === 10) {
    M.pos = DOCK_MILO.clone().setY(dockY(milo)); Dd.pos = DOCK_DAD.clone().setY(dockY(dad)); M.yaw = Dd.yaw = Math.PI;
    M.pos.x += 0.06;
    m.dangle = d.dangle = 1; m.armL = m.armR = [-0.9, 0, 0.1, 0.6]; d.armL = d.armR = [-0.9, 0, 0.1, 0.6];
    m.spineRoll = 0.12; m.headRoll = 0.32; m.headYaw = -0.1; m.lid = 0.45; m.smile = 0.6; d.headRoll = 0.08; d.smile = 0.7; d.lid = 0.3;
    d.aimR = [[0.9, -0.12, -0.3], [0, 1, 0.3], 0.35];  // arm around Milo
  } else if (S === 11) {
    m.sit = 0; d.sit = 0; Dd.pos = V(9, 0, 9);
    const look = T.s11;
    M.pos = V(1.15, 0, -1.35); M.yaw = 2.28;
    m.armR = [-0.2, 0, 0.1, 0.3];
    if (t > look) { m.lookY = 0.25; m.headPitch = -0.1; }
    const tGrab = LN.g1.start - 0.3;
    if (t > look + 0.3) { m.brow = -0.3; m.browAngle = 0.5; m.lid = 0.25; m.smile = 0.5; }
    if (t > tGrab) {
      const turn = smooth(range(t, tGrab, tGrab + 0.35));
      M.yaw = lerp(2.28, 0.6, turn); m.lookY = 0; m.headPitch = 0;
      m.armR = [lerp(-0.2, -2.4, smooth(range(t, LN.g1.start, LN.g1.start + 0.35))), 0, 0.2, 0.2]; m.smile = 1; m.eyeBig = 0.3; m.brow = 0.8; m.browAngle = 0;
      const run = smooth(range(t, LN.g1.end - 0.15, LN.g1.end + 0.25)), dist = Math.max(0, t - LN.g1.end + 0.05) * 2.4;
      const dir = V(-2.7, 0, 0.3).sub(V(1.15, 0, -1.35)).normalize();
      if (run > 0) { M.yaw = lerp(M.yaw, Math.atan2(dir.x, dir.z), run); M.pos.addScaledVector(dir, dist); }
      m.walk = run; m.walkPhase = t * 16; m.lean = 0.2 * run; if (run > 0.5) m.armR = [-0.4, 0, 0.1, 0.4];
    }
  }
  return { M, D: Dd, Mo };
}

// ---------- camera shots
let MH = V(), DH = V(), MoH = V();
const SH = [
  // S1 birthday
  { t: 0, f: (t) => { const u = easeOut(range(t, 0, 1.25)); return { pos: V(0.08, lerp(1.12, 1.13, u), lerp(-1.15, -1.08, u)), target: MH.clone().add(V(0, -0.1, 0)), fov: lerp(27, 25, u) }; } },
  { t: 1.25, f: (t) => { const u = easeInOut(range(t, 1.25, 3.45)); return { pos: MH.clone().add(V(0.24, 0.1, lerp(0.55, 0.32, u))), target: DH.clone().add(V(0, lerp(0.08, 0.18, u), 0)), fov: lerp(40, 30, u) }; } },
  { t: 3.45, f: (t) => { const u = easeOut(range(t, 3.45, T.s2)); return { pos: orbit(MH, Math.PI - 0.18, 0.02, lerp(0.75, 0.6, u)), target: MH.clone().add(V(0, 0.02, 0)), fov: 30 }; } },
  // S2 the numbers
  { t: T.s2, f: (t) => { const u = easeOut(range(t, T.s2, 6.2)); return { pos: MH.clone().add(V(-0.25, 0.05, 0.25)), target: MoH.clone().add(V(0, lerp(0.05, 0.16, u), 0)), fov: lerp(32, 26, u) }; } },
  { t: 6.2, f: (t) => { const u = easeOut(range(t, 6.2, 7.75)); const tp = tablet.position.clone(); return { pos: V(lerp(0.3, 0.27, u), 1.3, lerp(0.34, 0.3, u)), target: tp.clone().add(V(0, lerp(0.14, 0.17, u), 0)), fov: 52 }; } },
  { t: 7.75, f: (t) => { const z = easeOut(range(t, 7.75, 8.1)); return { pos: MH.clone().add(V(0.18, 0.2, 0.3)), target: DH.clone().add(V(0, lerp(0.15, 0.28, z), 0)), fov: lerp(38, 22, z) }; } },
  // S3 breakfast
  { t: T.s3, f: (t) => { const u = easeInOut(range(t, T.s3, 10.0)); return { pos: V(lerp(0.85, 0.65, u), 1.3, lerp(1.45, 1.2, u)), target: V(0.3, 1.12, -0.8), fov: 42 }; } },
  { t: 10.0, f: (t) => ({ pos: orbit(DH, 0.3, 0.04, 0.85), target: DH.clone().add(V(0, 0.0, 0)), fov: 34 }) },
  { t: 11.05, f: (t) => { const u = easeOut(range(t, 11.05, 11.95)); return { pos: orbit(MH, yawTo(V(0.82, 0, -0.45), DAD_SEAT) + 0.15, -0.22, lerp(0.75, 0.6, u)), target: MH, fov: 34, roll: 0.06 }; } },
  { t: 11.95, f: (t) => { const u = easeInOut(range(t, 11.95, T.s4)); return { pos: V(lerp(1.05, 0.75, u), lerp(1.35, 1.3, u), lerp(1.45, 0.95, u)), target: V(0.22, lerp(1.05, 1.15, u), -0.8), fov: 42 }; } },
  // S4 dock (golden)
  { t: T.s4, f: (t) => { const u = easeInOut(range(t, T.s4, LN.v4.end - 1.0)); return { pos: D(lerp(1.7, 1.4, u), lerp(1.4, 1.2, u), lerp(0.6, 0.2, u)), target: D(-0.1, 0.75, -2.8), fov: 44 }; } },
  { t: LN.v4.end - 1.0, f: (t) => { const u = easeOut(range(t, LN.v4.end - 1.0, LN.f1.start)); return { pos: D(lerp(-1.05, -0.95, u), 1.1, -5.3), target: D(-0.4, lerp(1.0, 1.08, u), -2.2), fov: 36 }; } },
  { t: LN.f1.start - 0.05, f: (t) => { const u = easeInOut(range(t, LN.f1.start, LN.f3.start)); return { pos: D(lerp(0.6, 0.5, u), 1.15, -3.15), target: D(0.2, 1.22, -2.0), fov: 40 }; } },
  { t: LN.f3.start - 0.05, f: (t) => ({ pos: orbit(MH, Math.PI - 0.35, 0.0, 0.72), target: MH.clone().add(V(0, -0.02, 0)), fov: 34, roll: Math.sin(t * 20) * 0.01 }) },
  { t: LN.f4.start - 0.1, f: (t) => { const u = easeOut(range(t, LN.f4.start - 0.1, T.s5)); return { pos: orbit(DH, Math.PI + 0.45, 0.03, lerp(0.95, 0.8, u)), target: DH.clone().add(V(0, 0.1, 0)), fov: 34 }; } },
  // S5 acting weird
  { t: T.s5, f: (t) => { const u = easeInOut(range(t, T.s5, T.s5 + 1.85)); return { pos: orbit(DH.clone().add(V(0, -0.3, 0)), 0.35, 0.05, lerp(1.45, 1.2, u)), target: DH.clone().add(V(0, -0.15, 0)), fov: 38 }; } },
  { t: T.s5 + 1.85, f: (t) => { const u = easeInOut(range(t, T.s5 + 1.85, LN.h2.start - 0.2)); return { pos: V(lerp(-1.05, -0.95, u), 1.5, lerp(2.0, 1.85, u)), target: V(0.1, 1.38, 1.25), fov: 40 }; } },
  { t: LN.h2.start - 0.2, f: (t) => { const u = easeOut(range(t, LN.h2.start - 0.2, T.s6)); return { pos: orbit(MH, Math.PI / 2 - 0.6, 0.06, lerp(0.75, 0.62, u)), target: MH.clone().add(V(0, 0.02, 0)), fov: 34 }; } },
  // S6 night 11:58
  { t: T.s6, f: (t) => { const u = easeInOut(range(t, T.s6, LN.n1.start)); return { pos: kitchen.clockPos.clone().add(V(0.05, -0.1, lerp(1.05, 0.9, u))), target: kitchen.clockPos.clone().add(V(0, -0.05, 0)), fov: 32 }; } },
  { t: LN.n1.start - 0.05, f: (t) => { const u = easeInOut(range(t, LN.n1.start, LN.n3.start)); return { pos: V(lerp(0.95, 0.85, u), lerp(1.7, 1.6, u), lerp(1.75, 1.55, u)), target: V(0, 1.0, -0.45), fov: 42 }; } },
  { t: LN.n3.start - 0.15, f: (t) => { const u = easeInOut(range(t, LN.n3.start, LN.n4.start)); return { pos: MH.clone().add(V(-0.24, 0.1, lerp(0.45, 0.35, u))), target: DH.clone().add(V(0, 0.04, 0)), fov: 30 }; } },
  { t: LN.n4.start - 0.35, f: (t) => { const u = easeInOut(range(t, LN.n4.start - 0.35, LN.n4.start + 0.5)); return { pos: orbit(MH, Math.PI + 0.1, 0.02, 0.85), target: MH.clone().add(V(0, lerp(0.0, 0.32, u), 0)), fov: 33 }; } },
  { t: LN.n5.start - 0.25, f: (t) => { const u = easeOut(range(t, LN.n5.start - 0.25, T.s7)); return { pos: orbit(DH, -0.2, 0.02, lerp(0.85, 0.78, u)), target: DH.clone().add(V(0, 0.03, 0)), fov: 32 }; } },
  // S7 flashback
  { t: T.s7, f: (t) => { const u = easeInOut(range(t, T.s7, T.s8)); return { pos: V(lerp(1.4, 1.25, u), 1.55, lerp(-1.25, -1.1, u)), target: V(lerp(-1.0, -2.9, u), 1.05, lerp(0.2, 0.3, u)), fov: 42 }; } },
  // S8 night close-ups
  { t: T.s8, f: (t) => { const u = easeOut(range(t, T.s8, LN.x4.start)); return { pos: orbit(MH, Math.PI - 0.12, 0.02, lerp(0.85, 0.76, u)), target: MH.clone().add(V(0, 0.02, 0)), fov: 30 }; } },
  { t: LN.x4.start - 0.08, f: (t) => { const u = easeOut(range(t, LN.x4.start, T.s9)); return { pos: orbit(DH, 0.12, 0.02, lerp(0.85, 0.76, u)), target: DH.clone().add(V(0, 0.02, 0)), fov: 30 }; } },
  // S9 midnight
  { t: T.s9, f: (t) => ({ pos: kitchen.clockPos.clone().add(V(0, -0.1, lerp(1.0, 0.85, range(t, T.s9, T.mid + 0.2)))), target: kitchen.clockPos.clone().add(V(0, -0.05, 0)), fov: 30 }) },
  { t: T.mid + 0.2, f: (t) => { const u = easeInOut(range(t, T.mid + 0.2, LN.c1.start)); const sh = t > T.land ? Math.exp(-(t - T.land) * 6) * 0.02 : 0; return { pos: V(lerp(0.42, 0.36, u) + sh, lerp(2.3, 2.25, u), lerp(1.95, 1.85, u)), target: V(0, 1.22, -0.45), fov: 48 }; } },
  { t: LN.c1.start - 0.05, f: (t) => { const u = easeInOut(range(t, LN.c1.start, LN.c2.start)); return { pos: orbit(DH.clone().add(V(0, 0.08, 0)), 0.32, 0.04, lerp(1.05, 0.95, u)), target: DH.clone().add(V(0, 0.1, 0)), fov: 38 }; } },
  { t: LN.c2.start - 0.08, f: (t) => { const u = easeInOut(range(t, LN.c2.start, T.s10)); return { pos: orbit(MH, Math.PI - 0.4, 0.08, lerp(1.05, 0.95, u)), target: MH.clone().add(V(0, 0.08, 0)), fov: 38 }; } },
  // S10 sunrise dock
  { t: T.s10, f: (t) => { const u = easeInOut(range(t, T.s10, LN.v6.start + 2.9)); return { pos: D(lerp(0.05, 0.0, u), lerp(0.95, 1.7, u), lerp(-0.6, 1.1, u)), target: D(0, lerp(0.95, 0.75, u), -4), fov: 44 }; } },
  { t: LN.v6.start + 2.9, f: (t) => { const u = easeInOut(range(t, LN.v6.start + 2.9, T.s11)); return { pos: D(lerp(0.15, 0.05, u), lerp(0.85, 0.95, u), lerp(-3.9, -4.4, u)), target: D(0, 1.05, -2.0), fov: 40 }; } },
  // S11 fridge
    { t: T.s11, f: (t) => { const u = easeOut(range(t, T.s11, LN.g1.start - 0.4)); return { pos: kitchen.photoWorld.clone().add(V(0.25, 0.08, lerp(1.15, 1.0, u))), target: kitchen.photoWorld.clone().add(V(0, 0.12, 0)), fov: 34 }; } },
  { t: LN.g1.start - 0.4, f: (t) => { const u = easeOut(range(t, LN.g1.start - 0.4, LN.g1.end)); return { pos: V(1.55, 1.32, lerp(-0.45, -0.3, u)), target: MH.clone().add(V(0, 0.02, 0)), fov: 40 }; } },
  { t: LN.g1.end + 0.05, f: (t) => ({ pos: V(1.95, 1.5, 0.45), target: V(-0.6, 1.1, -0.45), fov: 50 }) },
];

// ---------- lighting presets
const PRESET = {
  evening: { hemi: ['#ffcfa0', '#5a3a50', 0.55], sun: ['#ff9a5a', 1.6, [-2, 3, -6]], fill: ['#c9a0ff', 0.25], pend: 6, env: 0.25, exp: 1.0, bg: '#201828' },
  morning: { hemi: ['#fff4e2', '#a08c7a', 1.05], sun: ['#fff0d0', 3.0, [-1.5, 4, -6]], fill: ['#cfe4ff', 0.6], pend: 0.0, env: 0.45, exp: 1.05, bg: '#cfe4ff' },
  night: { hemi: ['#6070b0', '#1a1a2a', 0.35], sun: ['#7d9cff', 0.9, [-1.5, 3, -6]], fill: ['#4a5aa0', 0.15], pend: 5.5, env: 0.15, exp: 1.0, bg: '#05081a' },
  golden: { hemi: ['#ffe0b0', '#5a7a6a', 0.9], sun: ['#ffb066', 3.4, [-3, 2.2, -8]], fill: ['#9fc3ff', 0.5], pend: 0, env: 0.5, exp: 1.0, bg: '#ffcf8a' },
  sunrise: { hemi: ['#ffd0c0', '#6a6a9a', 0.85], sun: ['#ffa080', 3.0, [0.5, 1.4, -8]], fill: ['#a0a8ff', 0.5], pend: 0, env: 0.45, exp: 1.02, bg: '#ffc9a0' },
};
const presetFor = (S) => ({ 1: 'evening', 2: 'evening', 3: 'morning', 4: 'golden', 5: 'morning', 6: 'night', 7: 'morning', 8: 'night', 9: 'night', 10: 'sunrise', 11: 'morning' }[S]);

// ---------- frame update
function update(t) {
  const S = scn(t), atDock = S === 4 || S === 10;
  const P = poses(t);
  for (const [h, st] of [[milo, P.M], [dad, P.D], [mom, P.Mo]]) { h.root.position.copy(st.pos); h.root.rotation.y = st.yaw; h.update(st.p, t); }
  mom.root.visible = P.Mo.vis; dad.root.visible = !(t < 1.25);
  scene.updateMatrixWorld(true);
  MH = milo.headWorld(); DH = dad.headWorld(); MoH = mom.headWorld();

  // props
  const inK = !atDock;
  cake.visible = S <= 2;
  const fl = 1 - smooth(range(t, 0.75, 0.95));
  cake.userData.flames.forEach((f, i) => { f.visible = fl > 0.01; f.scale.set(fl, fl * (1 + Math.sin(t * 30 + i) * 0.12), fl); f.rotation.z = Math.sin(t * 9 + i) * 0.15 * (t > 0.4 ? 2 : 1); });
  cake.userData.smoke.forEach((s, i) => { const k = t - 0.9 - i * 0.12; s.visible = k > 0 && k < 2.2; if (!s.visible) return; s.position.set((i % 2 ? 0.045 : -0.045) + Math.sin(k * 3 + i) * 0.03, 0.27 + k * 0.18, Math.cos(k * 2 + i) * 0.02); s.scale.setScalar(1 + k * 2.5); s.material.opacity = 0.35 * (1 - k / 2.2); });
  candle.position.set(0, 1.1, -0.3); candle.intensity = fl * 2.2 * (1 + noise1(t * 12) * 0.15) * (S <= 1 ? 1 : 0);
  tablet.visible = S === 2 || S === 1;
  plate.visible = S === 3; plate2.visible = S === 3;
  plate.userData.bacon[1].visible = !(S === 3 && t > 13.0);
  toast.visible = S === 3;
  bacon.visible = S === 3 && t > 13.0;
  mugD.visible = mugM.visible = S === 6 || S === 8 || S === 9;
  [mugD, mugM].forEach((mg, j) => mg.userData.steam.forEach((s, i) => { const k = (t * 0.4 + i / 3 + j * 0.2) % 1; s.position.set(Math.sin(k * 6 + i) * 0.015, 0.11 + k * 0.15, 0); s.scale.setScalar(1 + k * 2); s.material.opacity = 0.14 * Math.sin(k * Math.PI); }));
  // helmet
  helmet.visible = S === 3 || S === 11;
  if (S === 3 && t < 11.95) { const a = milo.handWorld(0), b = milo.handWorld(1); helmet.position.copy(a.add(b).multiplyScalar(0.5)).add(V(0, 0.06, 0)); helmet.rotation.set(0.3, P.M.yaw, 0); }
  else if (S === 3) follow(helmet, dad.head, [0, 0.235, -0.01], [-0.08, 0, 0]);
  else if (S === 11) {
    const tGrab = LN.g1.start;
    if (t < tGrab + 0.1) { helmet.position.set(1.0, 0.95, -1.98); helmet.rotation.set(0, 0.4, 0); }
    else if (t < tGrab + 0.4) { helmet.position.copy(milo.handWorld(1)).add(V(0, 0.1, 0)); helmet.rotation.set(0, P.M.yaw, 0); }
    else follow(helmet, milo.head, [0, 0.245, -0.01], [-0.1, 0, 0]);
  }
  bubble.group.visible = bubble.lower.visible = S === 3 && t >= 11.95;
  // fishing
  const fishing = S === 4;
  for (const [rod, line, h, i] of [[rodM, lineM, milo, 1], [rodD, lineD, dad, 1]]) {
    rod.visible = line.visible = fishing; if (!fishing) continue;
    const hp = h.handWorld(i); rod.position.copy(hp); rod.rotation.set(-0.95 + (h === milo ? -0.25 * smooth(range(t, LN.v4.end - 1.2, LN.v4.end - 0.6)) : 0), 0, h === milo ? 0.12 : -0.12);
    rod.updateMatrixWorld(); const tip = rod.localToWorld(rod.userData.tip.clone());
    let end = V(tip.x + (h === milo ? -0.1 : 0.1), -0.15, tip.z - 0.6);
    if (h === milo) { const up = smooth(range(t, LN.v4.end - 0.85, LN.v4.end - 0.45)); end = end.lerp(tip.clone().add(V(-0.24, -0.72, 0.1)), up); boot.visible = up > 0.01; boot.position.copy(end).add(V(0, -0.12, 0)); boot.rotation.set(Math.sin(t * 5) * 0.3, t * 1.5, Math.sin(t * 4) * 0.25); }
    placeBetweenLine(line, tip, end);
  }
  if (!fishing) boot.visible = false;
  rodF.visible = S === 7; if (S === 7) { rodF.position.copy(dad.handWorld(1)); rodF.rotation.set(0.2, 0, 0.35); }
  // ticket halves
  const tearT = LN.v5.start + 0.7;
  tick.forEach((m, i) => {
    m.visible = S === 5 && t < T.s5 + 1.85; if (!m.visible) return;
    const hp = dad.handWorld(i); const fall = Math.max(0, t - tearT - 0.4);
    m.position.copy(hp).add(V(0, 0.03 - fall * fall * 2.2, 0.05)); m.rotation.set(0.2 + fall * 3 * (i ? 1 : -1), P.D.yaw, (i ? -1 : 1) * smooth(range(t, tearT - 0.1, tearT + 0.2)) * 0.5 + fall * 4);
    if (t < tearT) m.position.x += (i ? -1 : 1) * 0.0; // held together
  });

  // counters
  const above = (h, y = 0.17) => h.topWorld().add(V(0, y, 0));
  const pop = (t0) => clamp(spring(t - t0, 12, 6));
  // dad's number over time
  let dTxt = '41', dOn = 0, dCold = 0, dBurst = 0, dScale = 1;
  if (S === 1) dOn = pop(1.45);
  else if (S === 2) { dOn = 1; dScale = 1 + pulse(t, 7.75, 8.7, 0.1) * 0.15; }
  else if (S === 3) { dOn = 1; dTxt = '40'; }
  else if (S === 4) { dOn = 1; dTxt = t < LN.f1.start - 0.05 ? '30' : t < LN.f3.start - 0.05 ? '19' : '12'; }
  else if (S === 5) { dOn = 1; dTxt = '3'; }
  else if (S === 6 || S === 8) { dOn = 1; dTxt = '1'; }
  else if (S === 9) {
    dOn = 1; dTxt = t < T.zero ? '1' : t < T.spin ? '0' : t < T.land ? fmt(Math.floor(((t * 97.13) % 1) * 99999)) : '16,436';
    dCold = t >= T.zero && t < T.spin ? 1 : 0; if (t >= T.zero && t < T.spin) dOn = 0.75 + 0.25 * Math.abs(Math.sin(t * 40));
    dBurst = t > T.land ? Math.exp(-(t - T.land) * 3) : 0; dScale = 1 + dBurst * 0.35;
  } else if (S === 10) { dOn = 0.75; dTxt = '16,436'; dScale = 0.85; }
  cDad.update({ text: dTxt, pos: above(dad, helmet.visible && S === 3 && t >= 11.95 ? 0.25 : 0.17), on: S === 7 ? 0 : dOn, t, cold: dCold, burst: dBurst, scale: dScale });
  let mOn = 0, mTxt = '1';
  if (S === 6 && t > LN.n4.start - 0.35) mOn = pop(LN.n4.start - 0.2);
  if (S === 8) mOn = 1;
  if (S === 9) { mOn = 1; mTxt = dTxt; }
  if (S === 10) { mOn = 0.75; mTxt = '16,436'; }
  if (S === 7) { mOn = 1; const k = LN.x1.start; mTxt = t < k + 0.6 ? '41' : t < k + 1.4 ? '40' : t < k + 2.2 ? '39' : '38'; }
  cMilo.update({ text: mTxt, pos: above(milo, S === 7 ? 0.22 : 0.17), on: mOn, t: t + 1.3, cold: S === 9 ? dCold : 0, burst: S === 9 ? dBurst : 0, scale: S === 9 ? dScale : S === 10 ? 0.85 : 1 });
  cMom.update({ text: '15,302', pos: above(mom, 0.15), on: S === 2 ? pop(5.25) : 0, t: t + 0.6 });
  cFriend.update({ text: '22,870', pos: tablet.position.clone().add(V(0, 0.22, 0)), on: S === 2 && t > 6.2 ? pop(6.75) : 0, t: t + 2 });
  cGran.update({ text: '9', pos: kitchen.photoWorld.clone().add(V(0, 0.24, 0.02)), on: S === 11 ? pop(T.s11 + 0.25) : 0, t });

  // camera
  let si = 0; for (let i = 0; i < SH.length; i++) if (t >= SH[i].t) si = i;
  const sh = SH[si].f(t);
  const hh = 0.004, amp = hh + (S === 9 && t > T.land ? Math.exp(-(t - T.land) * 5) * 0.015 : 0);
  const shake = V(noise1(t * 1.3) * amp, noise1(t * 1.1 + 9) * amp, noise1(t * 1.2 + 4) * amp);
  camera.position.copy(sh.pos).add(shake); camera.up.set(0, 1, 0);
  camera.lookAt(sh.target.clone().add(shake.multiplyScalar(0.5)));
  camera.rotateZ((sh.roll || 0) + noise1(t * 0.7 + 3) * 0.003);
  camera.fov = sh.fov; camera.updateProjectionMatrix();

  // lights
  const pr = PRESET[presetFor(S)];
  hemi.color.set(pr.hemi[0]); hemi.groundColor.set(pr.hemi[1]); hemi.intensity = pr.hemi[2];
  const base = atDock ? DOCK_O : V(0, 0, -0.3);
  sun.color.set(pr.sun[0]); sun.intensity = pr.sun[1]; sun.position.copy(base).add(V(...pr.sun[2])); sun.target.position.copy(base).add(V(0, 0.5, atDock ? -2 : 0));
  fill.color.set(pr.fill[0]); fill.intensity = pr.fill[1]; fill.position.copy(base).add(V(2, 2.5, 4)); fill.target.position.copy(base);
  pendant.position.copy(kitchen.lampPos).add(V(0, -0.08, 0)); pendant.intensity = inK ? pr.pend : 0;
  kitchen.bulbM.color.set(pr.pend > 0 ? '#fff3c8' : '#d8d0c0');
  scene.environmentIntensity = pr.env; renderer.toneMappingExposure = pr.exp; scene.background.set(pr.bg);
  // golden glow from numbers onto faces
  const gl = (S === 1 && t > 1.45) || S === 2 ? 0.8 : S === 6 || S === 8 ? 1.4 : S === 9 ? (dCold ? 0 : 1.4) + dBurst * 5 : S === 7 ? 0 : S === 11 ? 0.6 : 0.3;
  glowL.position.copy(above(dad, 0.1)); glowL.intensity = dOn > 0 ? gl : 0;
  glowL2.position.copy(S === 11 ? kitchen.photoWorld.clone().add(V(0, 0.25, 0.2)) : above(milo, 0.1)); glowL2.intensity = S === 11 ? 0.8 : (mOn > 0 ? gl : 0);
  rim.intensity = S === 9 && dCold ? 3 : (S === 6 || S === 8) ? 0.8 : 0; rim.position.copy(V(-1.5, 2, -2));
  if (S === 9 && dCold) { glowL.color.set('#7fb0ff'); glowL.intensity = 1.2; } else glowL.color.set('#ffc040');

  // sets
  kitchen.root.visible = inK; dock.root.visible = atDock;
  kitchen.setSky(presetFor(S) === 'evening' ? 'evening' : presetFor(S) === 'night' ? 'night' : 'morning');
  const clk = S === 6 ? [23, 58 + (t - T.s6) / 60, ((t - T.s6) * 1 + 5) % 60] : S === 8 ? [23, 59, 30] : S === 9 ? (t < T.mid ? [23, 59, 60 - (T.mid - t)] : [0, 0, (t - T.mid)]) : [8, 10, 0];
  kitchen.setClock(clk[0], clk[1], clk[2]);
  kitchen.bedDoor.rotation.y = S === 7 ? lerp(-1.3, 0, easeIn(range(t, LN.x2.start + 0.6, LN.x2.start + 0.9))) : 0;
  kitchen.setCalendar(S === 3 ? '40' : S === 5 ? '3' : S === 6 || S === 8 || S === 9 ? '1' : '41');
  dock.setMode(S === 10 ? 'sunrise' : 'golden'); dock.update(t);
}
function placeBetweenLine(obj, a, b) {
  const d = b.clone().sub(a), L = d.length();
  obj.position.copy(a).addScaledVector(d, 0.5); obj.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); obj.scale.set(1, L, 1);
}

function render(t) { update(t); renderer.render(scene, camera); }
window.TOTAL_FRAMES = Math.round(TL.duration * FPS);
window.renderFrame = async (frame) => {
  render(frame / FPS);
  return await new Promise((res) => renderer.domElement.toBlob((b) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(b); }, 'image/jpeg', 0.94));
};
window.READY = true;
if (params.has('t')) render(+params.get('t'));
