import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ell, capsule, std, mesh, group, canvasTex, rand, lerp, clamp, placeBetween } from './util.js';

const rbox = (w, h, d, r = 0.03, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);

function tileFloor() {
  const t = canvasTex(1024, 1024, (c, w, h) => {
    const R = rand(3), n = 8, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const l = (x + y) % 2 ? 86 : 74;
      c.fillStyle = `hsl(${30 + R() * 6}, ${28 + R() * 6}%, ${l + R() * 3}%)`; c.fillRect(x * s, y * s, s, s);
    }
    c.strokeStyle = 'rgba(90,60,40,0.35)'; c.lineWidth = 4;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2.5);
  return t;
}
function wallTex() {
  const t = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#f3dfc0'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 28, h); // soft stripe wallpaper
    const R = rand(9); for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(220,140,90,0.25)'; c.beginPath(); c.arc(R() * w, R() * h, 3, 0, 7); c.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2);
  return t;
}
function woodTex(base = '#a8703f') {
  const t = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h); const R = rand(2);
    for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(60,30,10,${0.06 + R() * 0.1})`; c.lineWidth = 1 + R() * 3; const y = R() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + R() * 20 - 10, w * 0.6, y + R() * 20 - 10, w, y); c.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// sky painters for window + dock
export const SKIES = {
  evening: ['#2b2459', '#7b4c8f', '#e9837a', '#ffc27e'],
  morning: ['#6fb7ff', '#a8d8ff', '#e4f3ff', '#fff6dc'],
  golden: ['#ffb067', '#ffcf8a', '#ffe7b8', '#fff1cf'],
  night: ['#05081a', '#0d1638', '#1a2a5a', '#2c3c70'],
  sunrise: ['#4b5fa8', '#c792c9', '#ffb38a', '#ffe0a3'],
};
function paintSky(c, w, h, cols, { stars = false, sun = null, R = rand(5) } = {}) {
  const g = c.createLinearGradient(0, 0, 0, h);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (stars) { for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,240,${0.3 + R() * 0.7})`; c.beginPath(); c.arc(R() * w, R() * h * 0.7, R() * 1.8 + 0.3, 0, 7); c.fill(); } }
  if (sun) {
    const rg = c.createRadialGradient(sun.x * w, sun.y * h, 0, sun.x * w, sun.y * h, sun.r * w * 4);
    rg.addColorStop(0, sun.glow); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h);
    c.fillStyle = sun.col; c.beginPath(); c.arc(sun.x * w, sun.y * h, sun.r * w, 0, 7); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 6; i++) { const x = R() * w, y = h * (0.15 + R() * 0.4), s = 0.6 + R(); for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + k * 26 * s, y + Math.sin(k) * 6, 46 * s, 14 * s, 0, 0, 7); c.fill(); } }
}

// Grandma photo (2D illustration on the fridge)
function grandmaPhoto() {
  return canvasTex(300, 360, (c, w, h) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, '#9ed2f0'); g.addColorStop(1, '#d9f0d0'); c.fillStyle = g; c.fillRect(16, 16, w - 32, 268);
    c.fillStyle = '#7cbf6a'; c.fillRect(16, 230, w - 32, 54);
    c.fillStyle = '#7b4bb3'; c.beginPath(); c.moveTo(70, 284); c.quadraticCurveTo(150, 150, 230, 284); c.fill(); // raincoat
    c.fillStyle = '#c99573'; c.beginPath(); c.arc(150, 140, 52, 0, 7); c.fill();
    c.fillStyle = '#e6e6ee'; c.beginPath(); c.arc(150, 122, 60, Math.PI, 0); c.fill(); c.fillRect(90, 118, 22, 50); c.fillRect(188, 118, 22, 50);
    c.strokeStyle = '#d6303a'; c.lineWidth = 5; for (const x of [130, 170]) { c.beginPath(); c.arc(x, 142, 15, 0, 7); c.stroke(); }
    c.beginPath(); c.moveTo(145, 142); c.lineTo(155, 142); c.stroke();
    c.fillStyle = '#2a1a12'; for (const x of [130, 170]) { c.beginPath(); c.arc(x, 143, 4, 0, 7); c.fill(); }
    c.strokeStyle = '#6a2a2a'; c.lineWidth = 5; c.beginPath(); c.arc(150, 160, 22, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.fillStyle = '#ff9a9a'; c.globalAlpha = 0.4; c.beginPath(); c.arc(118, 165, 9, 0, 7); c.arc(182, 165, 9, 0, 7); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#4a3a30'; c.font = '600 30px Fredoka'; c.textAlign = 'center'; c.fillText('Grandma ♥', w / 2, 330);
  });
}
function kidDrawing(seed) {
  return canvasTex(200, 160, (c, w, h) => {
    const R = rand(seed); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.lineWidth = 6; c.lineCap = 'round';
    const cols = ['#ff5d5d', '#3a86ff', '#2bb673', '#ffb703', '#8338ec'];
    c.strokeStyle = cols[seed % 5]; c.beginPath(); c.arc(50, 45, 22, 0, 7); c.stroke(); // sun
    for (let i = 0; i < 8; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(50 + Math.cos(a) * 30, 45 + Math.sin(a) * 30); c.lineTo(50 + Math.cos(a) * 40, 45 + Math.sin(a) * 40); c.stroke(); }
    c.strokeStyle = cols[(seed + 2) % 5]; c.beginPath(); c.moveTo(110, 140); c.lineTo(110, 90); c.lineTo(140, 65); c.lineTo(170, 90); c.lineTo(170, 140); c.closePath(); c.stroke();
    c.strokeStyle = '#333'; for (const x of [70, 95]) { c.beginPath(); c.arc(x, 100, 9, 0, 7); c.moveTo(x, 109); c.lineTo(x, 140); c.stroke(); }
    c.strokeStyle = cols[(seed + 3) % 5]; c.beginPath(); c.moveTo(0, 150 - R() * 5); c.lineTo(w, 150); c.stroke();
  });
}

export class Kitchen {
  constructor(scene) {
    const K = this.root = group(scene);
    const floor = mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), std('#ffffff', 0.55, 0, { map: tileFloor() }), { cast: false }); K.add(floor);
    const wallM = std('#ffffff', 0.9, 0, { map: wallTex() });
    const ceil = mesh(new THREE.PlaneGeometry(7, 7).rotateX(Math.PI / 2), std('#fff6e8', 0.9), { pos: [0, 2.75, 0], cast: false }); K.add(ceil);
    // back wall with window hole (4 pieces)
    const bw = (w, h, x, y) => K.add(mesh(new THREE.PlaneGeometry(w, h), wallM, { pos: [x, y, -2.5], cast: false }));
    bw(2.1, 2.75, -2.45, 1.375); bw(2.85, 2.75, 2.075, 1.375); bw(1.4, 1.05, -0.7, 0.525); bw(1.4, 0.6, -0.7, 2.45); /* wall above window holds the clock */
    // window frame + sky
    const frameM = std('#fbf7ef', 0.5);
    for (const [w, h, x, y] of [[1.5, 0.08, -0.7, 1.05], [1.5, 0.08, -0.7, 2.15], [0.08, 1.15, -1.42, 1.6], [0.08, 1.15, 0.02, 1.6], [0.05, 1.1, -0.7, 1.6], [1.4, 0.05, -0.7, 1.6]])
      K.add(mesh(new THREE.BoxGeometry(w, h, 0.08), frameM, { pos: [x, y, -2.48] }));
    K.add(mesh(new THREE.BoxGeometry(1.6, 0.05, 0.22), frameM, { pos: [-0.7, 1.03, -2.42] }));
    this.skyTex = canvasTex(512, 512, () => {});
    this.sky = mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: this.skyTex, fog: false }), { pos: [-0.7, 1.8, -6], cast: false, recv: false }); K.add(this.sky);
    // neighbour trees through window
    const treeM = std('#5e9e5a', 0.8), trunkM = std('#6b4a32', 0.8);
    for (const [x, z, s] of [[-2.2, -4.5, 1], [0.4, -5.2, 1.3], [-0.9, -5.6, 0.9]]) { K.add(mesh(new THREE.SphereGeometry(0.7 * s, 20, 14), treeM, { pos: [x, 1.4 * s, z], cast: false })); K.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8), trunkM, { pos: [x, 0.5, z], cast: false })); }
    this.outdoor = [];
    // other walls
    K.add(mesh(new THREE.PlaneGeometry(7, 2.75).rotateY(-Math.PI / 2), wallM, { pos: [2.6, 1.375, 0], cast: false }));
    // left wall with doorway at z=0.3 (0.95 wide, 2.1 high)
    const lw = (w, h, z, y) => K.add(mesh(new THREE.PlaneGeometry(w, h).rotateY(Math.PI / 2), wallM, { pos: [-2.6, y, z], cast: false }));
    lw(2.325, 2.75, -1.3375, 1.375); lw(3.225, 2.75, 1.8875, 1.375); lw(0.95, 0.65, 0.3, 2.425);
    for (const [w, h, z, y] of [[0.06, 2.12, -0.18, 1.06], [0.06, 2.12, 0.78, 1.06], [1.02, 0.06, 0.3, 2.12]]) K.add(mesh(new THREE.BoxGeometry(0.12, h, w), frameM, { pos: [-2.6, y, z] }));
    // hallway beyond (dim) + bedroom door
    const hallM = std('#c9b59a', 0.9);
    K.add(mesh(new THREE.PlaneGeometry(1.6, 2.6).rotateY(Math.PI / 2), hallM, { pos: [-4.0, 1.3, 0.3], cast: false }));
    K.add(mesh(new THREE.PlaneGeometry(1.4, 2.6), hallM, { pos: [-3.3, 1.3, -0.5], cast: false }));
    K.add(mesh(new THREE.PlaneGeometry(1.4, 2.6).rotateY(Math.PI), hallM, { pos: [-3.3, 1.3, 1.1], cast: false }));
    K.add(mesh(new THREE.PlaneGeometry(1.5, 1.6).rotateX(-Math.PI / 2), std('#8a6a4e', 0.8), { pos: [-3.3, 0.002, 0.3], cast: false }));
    this.bedDoor = group(K, [-3.98, 0, -0.15]);
    const door = mesh(rbox(0.06, 2.0, 0.85, 0.02), std('#3e6fa6', 0.6), { pos: [0, 1.0, 0.425] }); this.bedDoor.add(door);
    const sign = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#ffd34d'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 24); c.fill(); c.fillStyle = '#2b2b2b'; c.font = '700 54px Fredoka'; c.textAlign = 'center'; c.fillText('KEEP OUT', w / 2, 84); });
    this.bedDoor.add(mesh(new THREE.PlaneGeometry(0.4, 0.2).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), { pos: [0.035, 1.5, 0.425], cast: false }));
    this.bedDoor.add(mesh(new THREE.SphereGeometry(0.03, 12, 8), std('#e0c060', 0.3, 0.8), { pos: [0.05, 1.0, 0.75] }));
    // front wall (behind default camera)
    K.add(mesh(new THREE.PlaneGeometry(5.2, 2.75).rotateY(Math.PI), wallM, { pos: [0, 1.375, 3.4], cast: false }));
    // counter + cabinets along back wall
    const cabM = std('#6aa6a0', 0.55), topM = std('#f2ede4', 0.25), handleM = std('#d9b45a', 0.3, 0.8);
    for (const [x0, x1] of [[-2.55, -1.55], [0.15, 1.15]]) {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      K.add(mesh(rbox(w, 0.86, 0.6, 0.02), cabM, { pos: [cx, 0.43, -2.2] }));
      K.add(mesh(rbox(w + 0.04, 0.05, 0.64, 0.01), topM, { pos: [cx, 0.885, -2.19] }));
      K.add(mesh(rbox(w, 0.62, 0.36, 0.02), cabM, { pos: [cx, 2.05, -2.32] }));
      for (let i = 0; i < Math.round(w / 0.5); i++) { const hx = x0 + 0.25 + i * 0.5; K.add(mesh(capsule(0.01, 0.08), handleM, { pos: [hx, 0.72, -1.89], rot: [0, 0, Math.PI / 2] })); K.add(mesh(capsule(0.01, 0.08), handleM, { pos: [hx, 1.82, -2.13], rot: [0, 0, Math.PI / 2] })); }
    }
    // sink counter under window
    K.add(mesh(rbox(1.7, 0.86, 0.6, 0.02), cabM, { pos: [-0.7, 0.43, -2.2] }));
    K.add(mesh(rbox(1.74, 0.05, 0.64, 0.01), topM, { pos: [-0.7, 0.885, -2.19] }));
    K.add(mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 20, Math.PI), std('#cfd4da', 0.2, 0.9), { pos: [-0.7, 1.05, -2.35] }));
    // counter props
    const R = rand(21);
    const jarCols = ['#ff8c69', '#ffd166', '#06d6a0'];
    jarCols.forEach((col, i) => { K.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 20), std(col, 0.4), { pos: [-2.35 + i * 0.16, 1.0, -2.3] })); K.add(mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 20), std('#7a5236', 0.5), { pos: [-2.35 + i * 0.16, 1.105, -2.3] })); });
    K.add(mesh(ell(0.12, 0.06, 0.12), std('#e85d4a', 0.4), { pos: [0.5, 0.94, -2.2] })); // fruit bowl
    for (let i = 0; i < 4; i++) K.add(mesh(new THREE.SphereGeometry(0.045, 14, 10), std(['#ff4d4d', '#ffb703', '#8ac926', '#ff4d4d'][i], 0.4), { pos: [0.45 + (i % 2) * 0.08, 1.0, -2.24 + Math.floor(i / 2) * 0.07] }));
    // plant on window sill
    K.add(mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 16), std('#d9775b', 0.6), { pos: [-1.15, 1.13, -2.38] }));
    for (let i = 0; i < 7; i++) K.add(mesh(ell(0.025, 0.09, 0.012), std('#4e9e4a', 0.6), { pos: [-1.15 + (R() - 0.5) * 0.06, 1.25, -2.38 + (R() - 0.5) * 0.06], rot: [(R() - 0.5) * 0.9, R() * 3, (R() - 0.5) * 0.9] }));
    // fridge (right, against back wall)
    this.fridgePos = new THREE.Vector3(1.75, 0, -2.1);
    const fr = group(K, [1.75, 0, -2.1]);
    const frM = std('#f4f6f8', 0.3, 0.1);
    fr.add(mesh(rbox(0.85, 1.9, 0.7, 0.06), frM, { pos: [0, 0.95, 0] }));
    fr.add(mesh(new THREE.BoxGeometry(0.84, 0.01, 0.01), std('#b8c0c8', 0.4), { pos: [0, 1.3, 0.355] }));
    for (const y of [1.0, 1.55]) fr.add(mesh(capsule(0.014, 0.22), std('#b8c0c8', 0.3, 0.8), { pos: [-0.36, y, 0.38] }));
    this.photo = mesh(new THREE.PlaneGeometry(0.25, 0.3), new THREE.MeshStandardMaterial({ map: grandmaPhoto(), roughness: 0.6 }), { pos: [0.08, 1.48, 0.357], rot: [0, 0, 0.04], cast: false }); fr.add(this.photo);
    this.photoWorld = new THREE.Vector3(1.83, 1.48, -1.74);
    fr.add(mesh(new THREE.SphereGeometry(0.015, 10, 8), std('#ff3b3b', 0.4), { pos: [0.08, 1.62, 0.365] }));
    [[-0.2, 1.05, -0.06, 1], [0.18, 0.95, 0.05, 2], [-0.18, 1.62, 0.03, 3]].forEach(([x, y, r, s]) => {
      fr.add(mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshStandardMaterial({ map: kidDrawing(s), roughness: 0.7 }), { pos: [x, y, 0.357], rot: [0, 0, r], cast: false }));
      fr.add(mesh(new THREE.SphereGeometry(0.012, 10, 8), std(['#3a86ff', '#ffb703', '#2bb673'][s - 1], 0.4), { pos: [x, y + 0.07, 0.365] }));
    });
    // table + chairs
    const woodM = std('#ffffff', 0.55, 0, { map: woodTex('#b77a45') });
    this.tablePos = new THREE.Vector3(0, 0, -0.3);
    K.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 48), woodM, { pos: [0, 0.75, -0.3] }));
    K.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 16), woodM, { pos: [0, 0.37, -0.3] }));
    K.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.03, 32), woodM, { pos: [0, 0.015, -0.3] }));
    const cloth = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#ef6f6c'; for (let i = 0; i < 8; i++) { c.globalAlpha = 0.5; c.fillRect(i * 32, 0, 16, h); c.fillRect(0, i * 32, w, 16); } });
    K.add(mesh(new THREE.CircleGeometry(0.36, 32).rotateX(-Math.PI / 2), std('#fff', 0.8, 0, { map: cloth }), { pos: [0, 0.777, -0.3], cast: false }));
    this.chairs = [];
    for (const [z, ry] of [[0.42, Math.PI], [-1.02, 0]]) {
      const ch = group(K, [0, 0, z], [0, ry, 0]);
      ch.add(mesh(rbox(0.44, 0.05, 0.42, 0.02), woodM, { pos: [0, 0.45, 0] }));
      for (const [x, zz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) ch.add(mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.45, 8), woodM, { pos: [x, 0.225, zz] }));
      ch.add(mesh(rbox(0.44, 0.5, 0.04, 0.02), woodM, { pos: [0, 0.72, -0.2] }));
      this.chairs.push(ch);
    }
    // pendant lamp
    this.lampPos = new THREE.Vector3(0, 1.95, -0.3);
    K.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.75, 6), std('#222', 0.5), { pos: [0, 2.37, -0.3] }));
    K.add(mesh(new THREE.SphereGeometry(0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std('#ffcf4d', 0.45, 0, { side: THREE.DoubleSide }), { pos: [0, 1.95, -0.3], cast: false }));
    this.bulbM = new THREE.MeshBasicMaterial({ color: '#fff3c8' });
    K.add(mesh(new THREE.SphereGeometry(0.05, 16, 10), this.bulbM, { pos: [0, 1.93, -0.3], cast: false }));
    // wall clock (left of fridge on back wall)
    this.clockTex = canvasTex(256, 256, () => {});
    this.clockPos = new THREE.Vector3(-0.7, 2.45, -2.47);
    K.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 40).rotateX(Math.PI / 2), std('#e85d4a', 0.4), { pos: [-0.7, 2.45, -2.48] }));
    K.add(mesh(new THREE.CircleGeometry(0.15, 40), new THREE.MeshBasicMaterial({ map: this.clockTex }), { pos: [-0.7, 2.45, -2.457], cast: false }));
    this.clockTime = null;
    // calendar on right wall
    this.calTex = canvasTex(256, 320, () => {}); this.calText = null;
    K.add(mesh(new THREE.PlaneGeometry(0.4, 0.5).rotateY(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.calTex, roughness: 0.7 }), { pos: [2.59, 1.55, -0.6], cast: false }));
    this.skyMode = null;
  }
  setSky(mode) {
    if (mode === this.skyMode) return; this.skyMode = mode;
    const { ctx: c } = this.skyTex.userData;
    paintSky(c, 512, 512, SKIES[mode], { stars: mode === 'night', sun: mode === 'night' ? { x: 0.7, y: 0.25, r: 0.05, col: '#fdf6dc', glow: 'rgba(200,220,255,0.35)' } : null });
    this.skyTex.needsUpdate = true;
  }
  setClock(h, m, s = 0) {
    const key = `${h}:${m.toFixed(2)}`; if (key === this.clockTime) return; this.clockTime = key;
    const c = this.clockTex.userData.ctx, w = 256;
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, w);
    c.fillStyle = '#333'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.arc(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100, i % 3 ? 5 : 9, 0, 7); c.fill(); }
    const hand = (a, len, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); c.stroke(); };
    hand(((h % 12) + m / 60) / 12 * Math.PI * 2, 58, 12, '#2a2a2a'); hand(m / 60 * Math.PI * 2, 88, 8, '#2a2a2a'); hand(s / 60 * Math.PI * 2, 92, 3, '#e85d4a');
    c.fillStyle = '#e85d4a'; c.beginPath(); c.arc(128, 128, 9, 0, 7); c.fill();
    this.clockTex.needsUpdate = true;
  }
  setCalendar(txt) {
    if (txt === this.calText) return; this.calText = txt;
    const c = this.calTex.userData.ctx, w = 256, h = 320;
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e85d4a'; c.fillRect(0, 0, w, 70);
    c.fillStyle = '#fff'; c.font = '700 40px Fredoka'; c.textAlign = 'center'; c.fillText('DAYS', w / 2, 50);
    c.fillStyle = '#333'; c.font = '700 130px Fredoka'; c.fillText(txt, w / 2, 220);
    c.strokeStyle = '#e85d4a'; c.lineWidth = 8; c.beginPath(); c.moveTo(40, 270); c.lineTo(216, 290); c.stroke();
    this.calTex.needsUpdate = true;
  }
}

// Lake dock ----------------------------------------------------------------------------------
export class Dock {
  constructor(scene, origin) {
    this.origin = origin.clone();
    const D = this.root = group(scene, origin.toArray());
    this.skyTex = canvasTex(1024, 1024, () => {});
    this.skyM = new THREE.MeshBasicMaterial({ map: this.skyTex, side: THREE.BackSide, fog: false });
    D.add(mesh(new THREE.SphereGeometry(60, 48, 24), this.skyM, { cast: false, recv: false }));
    // water
    this.waterTex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); const R = rand(4);
      for (let i = 0; i < 500; i++) { c.strokeStyle = `rgba(255,255,255,${0.05 + R() * 0.15})`; c.lineWidth = 1 + R() * 2; const x = R() * w, y = R() * h, l = 10 + R() * 40; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 3, x + l, y); c.stroke(); }
    });
    this.waterTex.wrapS = this.waterTex.wrapT = THREE.RepeatWrapping; this.waterTex.repeat.set(14, 14); this.waterTex.colorSpace = THREE.NoColorSpace;
    this.waterM = new THREE.MeshStandardMaterial({ color: '#3f7fa0', roughness: 0.12, metalness: 0.35, bumpMap: this.waterTex, bumpScale: 0.6 });
    D.add(mesh(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), this.waterM, { pos: [0, -0.15, 0], cast: false }));
    // shore + hills
    const grass = std('#6aa84f', 0.85), hillM = std('#4f7f6a', 0.9), hill2 = std('#6f8fa8', 0.95);
    D.add(mesh(ell(9, 1.0, 5), grass, { pos: [0, -0.5, 7.5], cast: false }));
    for (const [x, z, sx, sy, m] of [[-18, -40, 22, 7, hill2], [14, -44, 26, 9, hill2], [-6, -30, 14, 4, hillM], [20, -28, 12, 3.5, hillM]]) D.add(mesh(ell(sx, sy, 6), m, { pos: [x, -0.4, z], cast: false, recv: false }));
    const treeM = std('#3f7a4a', 0.8), trunkM = std('#5a3d2a', 0.9), R = rand(17);
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? -1 : 1, x = side * (4 + R() * 16), z = -24 - R() * 10, s = 0.8 + R() * 1.4;
      D.add(mesh(new THREE.ConeGeometry(0.9 * s, 3 * s, 10), treeM, { pos: [x, 1.2 * s, z], cast: false, recv: false }));
    }
    for (let i = 0; i < 8; i++) { const x = (R() - 0.5) * 14, z = 5.5 + R() * 3, s = 0.8 + R() * 0.6; D.add(mesh(new THREE.ConeGeometry(0.7 * s, 2.6 * s, 10), treeM, { pos: [x, 1.0 * s, z] })); D.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), trunkM, { pos: [x, 0, z] })); }
    // dock: from shore (z=+4) out to z=-2.2, deck height 0.35
    const plankM = std('#ffffff', 0.7, 0, { map: woodTex('#9c6b43') }), postM = std('#6b4a32', 0.8);
    for (let i = 0; i < 26; i++) D.add(mesh(rbox(1.5, 0.05, 0.22, 0.015), plankM, { pos: [0, 0.35, 3.9 - i * 0.235], rot: [0, (R() - 0.5) * 0.02, 0] }));
    for (const x of [-0.7, 0.7]) for (const z of [-2.15, -0.5, 1.2, 3.0]) D.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 10), postM, { pos: [x, -0.1, z] }));
    for (const x of [-0.7, 0.7]) D.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.4, 10), postM, { pos: [x, 0.5, -2.15] }));
    // tackle box + bucket
    D.add(mesh(rbox(0.32, 0.16, 0.2, 0.02), std('#2f8f6f', 0.5), { pos: [0.45, 0.455, -0.9] }));
    D.add(mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 20, 1, true), std('#e85d4a', 0.5, 0, { side: THREE.DoubleSide }), { pos: [-0.55, 0.485, -0.6] }));
    // mist
    this.mistM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthWrite: false, fog: false });
    for (let i = 0; i < 5; i++) D.add(mesh(new THREE.PlaneGeometry(40, 1.4).rotateX(-0.05), this.mistM, { pos: [0, 0.2 + i * 0.12, -6 - i * 4], cast: false, recv: false }));
    this.mode = null;
  }
  setMode(mode) {
    if (mode === this.mode) return; this.mode = mode;
    const sun = mode === 'golden' ? { x: 0.42, y: 0.52, r: 0.035, col: '#fff2c4', glow: 'rgba(255,190,110,0.8)' } : { x: 0.55, y: 0.56, r: 0.04, col: '#fff0d0', glow: 'rgba(255,170,140,0.75)' };
    const c = this.skyTex.userData.ctx;
    // sky sphere UV: horizon is v=0.5; paint the top half as sky and bottom as haze
    paintSky(c, 1024, 1024, mode === 'golden' ? ['#5aa0d8', '#9cc6e8', '#ffd59a', '#ffb067'] : ['#3d4f9a', '#9c86c4', '#ffb38a', '#ffd9a0'], { sun });
    const g = c.createLinearGradient(0, 512, 0, 1024); g.addColorStop(0, mode === 'golden' ? '#ffcf8a' : '#ffc9a0'); g.addColorStop(1, '#556a7a'); c.fillStyle = g; c.fillRect(0, 540, 1024, 484);
    this.skyTex.needsUpdate = true;
    this.waterM.color.set(mode === 'golden' ? '#4f86a0' : '#6a7fb0');
    this.mistM.opacity = mode === 'sunrise' ? 0.12 : 0.0;
  }
  update(t) { this.waterTex.offset.set(t * 0.01, t * 0.025); }
}

// Glowing "days left" counter ---------------------------------------------------------------
const sparkTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,215,120,0.8)'); g.addColorStop(1, 'rgba(255,190,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,240,0.9)'; x.fillRect(30, 4, 4, 56); x.fillRect(4, 30, 56, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

export class Counter {
  constructor(scene, { size = 0.32 } = {}) {
    this.size = size;
    this.tex = canvasTex(1024, 384, () => {}); this.text = null; this.hue = null;
    this.mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
    this.sprite = new THREE.Sprite(this.mat); this.sprite.renderOrder = 10; scene.add(this.sprite);
    this.sparks = []; const R = rand(Math.floor(Math.random() * 1e6));
    const sm = new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(sm.clone()); s.renderOrder = 11; scene.add(s); this.sparks.push({ s, a: R() * 6.28, r: 0.5 + R() * 0.7, y: R(), sp: 0.3 + R() * 0.6, sz: 0.03 + R() * 0.05 }); }
    this.pos = new THREE.Vector3();
  }
  draw(text, cold = 0) {
    const key = text + '|' + cold.toFixed(2); if (key === this.text) return; this.text = key;
    const c = this.tex.userData.ctx, w = 1024, h = 384; c.clearRect(0, 0, w, h);
    const fs = text.length > 5 ? 190 : 230;
    c.font = `700 ${fs}px Fredoka`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const top = cold ? `rgb(${lerp(255, 200, cold)},${lerp(247, 230, cold)},${lerp(214, 255, cold)})` : '#fff7d6';
    const bot = cold ? `rgb(${lerp(255, 120, cold)},${lerp(176, 170, cold)},${lerp(46, 255, cold)})` : '#ffb02e';
    c.shadowColor = cold ? 'rgba(130,180,255,0.95)' : 'rgba(255,170,40,0.95)';
    for (const b of [60, 30, 12]) { c.shadowBlur = b; c.fillStyle = 'rgba(255,200,90,0.35)'; c.fillText(text, w / 2, h / 2 + 6); }
    c.shadowBlur = 0;
    const g = c.createLinearGradient(0, h / 2 - fs / 2, 0, h / 2 + fs / 2); g.addColorStop(0, top); g.addColorStop(1, bot);
    c.lineWidth = 14; c.strokeStyle = 'rgba(120,60,0,0.55)'; c.strokeText(text, w / 2, h / 2 + 6);
    c.fillStyle = g; c.fillText(text, w / 2, h / 2 + 6);
    this.tex.needsUpdate = true;
  }
  // on: 0..1 visibility, pop: 0..1 pop animation, t: time
  update({ text, pos, on = 1, t = 0, scale = 1, cold = 0, burst = 0, sparks = 1 }) {
    const vis = on > 0.001;
    this.sprite.visible = vis; this.sparks.forEach((p) => (p.s.visible = vis && sparks > 0));
    if (!vis) return;
    this.draw(text, cold);
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 8) * 0.06;
    const s = this.size * scale * beat * on * (text.length > 3 ? 0.72 : 1);
    this.sprite.scale.set(s * 2.67, s, 1);
    this.sprite.position.copy(pos).add(new THREE.Vector3(0, Math.sin(t * 1.7) * 0.01, 0));
    this.mat.opacity = Math.min(1, on * 1.4);
    for (const p of this.sparks) {
      const a = p.a + t * p.sp, yy = ((p.y + t * 0.12 * p.sp) % 1);
      const rr = this.size * scale * (1.3 * p.r + burst * 3 * p.r);
      p.s.position.set(pos.x + Math.cos(a) * rr, pos.y - this.size * 0.4 * scale + yy * this.size * 1.2 * scale + burst * Math.sin(a) * rr * 0.5, pos.z + Math.sin(a) * rr * 0.4);
      const tw = 0.5 + 0.5 * Math.sin(t * 7 + p.a * 5);
      p.s.scale.setScalar(p.sz * scale * (0.6 + tw * 0.6) * (1 + burst * 1.5) * on);
      p.s.material.opacity = on * Math.sin(yy * Math.PI) * sparks;
    }
  }
}
