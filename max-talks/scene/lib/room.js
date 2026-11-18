import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ell, capsule, std, mesh, group, canvasTex, rand, lerp, clamp, easeOutBack, spring } from './util.js';

const rbox = (w, h, d, r = 0.05, s = 4) => new RoundedBoxGeometry(w, h, d, s, r);

function woodFloor() {
  const t = canvasTex(1024, 1024, (c, w, h) => {
    const R = rand(7);
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = -R() * 300;
      while (x < w) {
        const len = 260 + R() * 260;
        const l = 52 + R() * 10;
        c.fillStyle = `hsl(${26 + R() * 8}, ${45 + R() * 12}%, ${l}%)`;
        c.fillRect(x, r * (h / rows), len, h / rows);
        for (let g = 0; g < 14; g++) {
          c.strokeStyle = `rgba(80,40,10,${0.05 + R() * 0.07})`; c.lineWidth = 1 + R() * 2;
          const y = r * (h / rows) + R() * (h / rows);
          c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + len * 0.3, y + R() * 8 - 4, x + len * 0.6, y + R() * 8 - 4, x + len, y); c.stroke();
        }
        c.fillStyle = 'rgba(60,30,10,0.55)'; c.fillRect(x, r * (h / rows), 3, h / rows);
        x += len;
      }
      c.fillStyle = 'rgba(60,30,10,0.5)'; c.fillRect(0, r * (h / rows), w, 3);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.5, 3.5);
  return t;
}

function rugTex() {
  return canvasTex(1024, 1024, (c, w, h) => {
    const cx = w / 2, cy = h / 2;
    const rings = ['#f4a259', '#2a9d8f', '#f6e7cb', '#e76f51', '#264653', '#f6e7cb', '#e9c46a', '#2a9d8f', '#f6e7cb'];
    rings.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, w / 2 - i * 52, 0, 7); c.fill(); });
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 6;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * 330, cy + Math.sin(a) * 330, 18, 0, 7); c.stroke(); }
  });
}

function skyTex() {
  return canvasTex(512, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b2d6b'); g.addColorStop(0.35, '#8a4f9e'); g.addColorStop(0.6, '#f07d7d'); g.addColorStop(0.78, '#ffb36b'); g.addColorStop(1, '#ffe1a1');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (const [x, y, s] of [[90, 380, 1], [330, 300, 1.4], [420, 520, 0.8]]) { for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(x + i * 22 * s, y + Math.sin(i) * 6, 40 * s, 14 * s, 0, 0, 7); c.fill(); } }
  });
}

function artTex(seed) {
  return canvasTex(256, 320, (c, w, h) => {
    const R = rand(seed);
    c.fillStyle = ['#f6e7cb', '#264653', '#fbe3e8'][seed % 3]; c.fillRect(0, 0, w, h);
    const cols = ['#e76f51', '#f4a259', '#2a9d8f', '#e9c46a', '#8ab17d', '#ef476f'];
    for (let i = 0; i < 6; i++) { c.fillStyle = cols[Math.floor(R() * cols.length)]; c.beginPath(); if (R() > 0.5) c.arc(R() * w, R() * h, 30 + R() * 70, 0, 7); else c.rect(R() * w * 0.7, R() * h * 0.7, 40 + R() * 90, 40 + R() * 90); c.fill(); }
  });
}

export function makeTVTexture() {
  const tex = canvasTex(640, 360, () => {});
  tex.userData.drawAt = (t) => {
    const c = tex.userData.ctx, w = 640, h = 360;
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b2a6f'); g.addColorStop(1, '#1d6fd1'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // studio rays
    c.save(); c.globalAlpha = 0.12; c.fillStyle = '#fff';
    for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(w * 0.72, h * 0.45); const a = i * 0.63 + t * 0.4; c.lineTo(w * 0.72 + Math.cos(a) * 600, h * 0.45 + Math.sin(a) * 600); c.lineTo(w * 0.72 + Math.cos(a + 0.2) * 600, h * 0.45 + Math.sin(a + 0.2) * 600); c.fill(); }
    c.restore();
    // cartoon dog icon with speech bubble
    const bx = w * 0.74, by = h * 0.46;
    c.fillStyle = '#e8a64a'; c.beginPath(); c.arc(bx, by, 58, 0, 7); c.fill();
    c.fillStyle = '#b8722a'; c.beginPath(); c.ellipse(bx - 55, by + 10, 18, 42, 0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(bx + 55, by + 10, 18, 42, -0.3, 0, 7); c.fill();
    c.fillStyle = '#fff0d0'; c.beginPath(); c.ellipse(bx, by + 24, 30, 22, 0, 0, 7); c.fill();
    c.fillStyle = '#1b1311'; c.beginPath(); c.ellipse(bx, by + 12, 11, 8, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(bx - 20, by - 12, 7, 0, 7); c.arc(bx + 20, by - 12, 7, 0, 7); c.fill();
    const mo = 6 + Math.abs(Math.sin(t * 14)) * 10;
    c.fillStyle = '#6a1a24'; c.beginPath(); c.ellipse(bx, by + 34, 12, mo * 0.6, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(bx - 150, by - 140, 150, 64, 20); c.fill();
    c.beginPath(); c.moveTo(bx - 60, by - 80); c.lineTo(bx - 40, by - 50); c.lineTo(bx - 30, by - 80); c.fill();
    c.fillStyle = '#0b2a6f'; c.font = '700 36px Fredoka'; c.textAlign = 'center'; c.fillText('HELLO!', bx - 75, by - 95);
    // headline
    c.textAlign = 'left';
    c.fillStyle = '#e63946'; c.fillRect(0, 230, w, 66);
    c.fillStyle = '#ffd60a'; c.fillRect(0, 230, 190, 66);
    c.fillStyle = '#1b1b1b'; c.font = '700 30px Fredoka'; c.fillText('BREAKING', 18, 274);
    c.fillStyle = '#fff'; c.font = '700 34px Fredoka'; c.fillText('DOGS CAN TALK!', 205, 276);
    c.fillStyle = '#111'; c.fillRect(0, 296, w, 40);
    c.fillStyle = '#fff'; c.font = '600 22px Fredoka';
    const tick = 'ALL DOGS NOW SPEAK ENGLISH  •  EXPERTS: "THEY HAVE OPINIONS"  •  SQUIRREL COMMUNITY ON HIGH ALERT  •  ';
    const off = (t * 140) % 1100; c.fillText(tick + tick, -off, 324);
    c.fillStyle = '#e63946'; c.beginPath(); c.arc(w - 40, 30, 10, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '700 20px Fredoka'; c.fillText('LIVE', w - 100, 37);
    tex.needsUpdate = true;
  };
  tex.userData.drawAt(0);
  return tex;
}

function makeSlipper(R) {
  const g = new THREE.Group();
  const cols = ['#ff8fab', '#7bdff2', '#ffd166', '#cdb4db', '#ef476f', '#06d6a0', '#f4a261', '#a0c4ff', '#ffadad', '#caffbf'];
  const col = new THREE.Color(cols[Math.floor(R() * cols.length)]);
  const plush = std(col, 1), sole = std(col.clone().multiplyScalar(0.7), 0.8);
  g.add(mesh(rbox(0.11, 0.035, 0.26, 0.016), sole, { pos: [0, 0.018, 0] }));
  g.add(mesh(rbox(0.105, 0.03, 0.25, 0.014), std('#fff4e6', 1), { pos: [0, 0.04, 0] }));
  g.add(mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.06, 0.07, 0.1), plush, { pos: [0, 0.035, 0.045] }));
  g.add(mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20, Math.PI).rotateX(-Math.PI / 2).scale(1.15, 1, 1.2), plush, { pos: [0, 0.05, -0.06] }));
  const k = R();
  if (k > 0.55) g.add(mesh(new THREE.SphereGeometry(0.032, 14, 10), std(R() > 0.5 ? '#ffffff' : col, 1), { pos: [0, 0.1, 0.07] }));
  else if (k > 0.25) for (const s of [-1, 1]) g.add(mesh(ell(0.016, 0.04, 0.01), plush, { pos: [s * 0.03, 0.12, 0.04], rot: [-0.3, 0, s * 0.2] })); // bunny ears
  else for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.009, 10, 8), std('#111', 0.3), { pos: [s * 0.022, 0.09, 0.105] })); // googly face
  return g;
}
export { makeSlipper };

export class Room {
  constructor(scene) {
    this.scene = scene;
    const S = (this.group = group(scene));
    // floor
    S.add(mesh(new THREE.PlaneGeometry(7, 7.5).rotateX(-Math.PI / 2), std('#ffffff', 0.55, 0, { map: woodFloor() }), { pos: [0, 0, 0.5], cast: false }));
    // walls
    const wallMat = std('#efe2cf', 0.95), accent = std('#7fa7c4', 0.92);
    // back wall with window hole: build from 4 pieces
    const W = 7, Hh = 3.1, wx0 = -1.45, wx1 = 1.45, wy0 = 0.7, wy1 = 2.5;
    const back = group(S, [0, 0, -3]);
    back.add(mesh(new THREE.PlaneGeometry(wx0 + W / 2, Hh), accent, { pos: [(-W / 2 + wx0) / 2, Hh / 2, 0], cast: false }));
    back.add(mesh(new THREE.PlaneGeometry(W / 2 - wx1, Hh), accent, { pos: [(W / 2 + wx1) / 2, Hh / 2, 0], cast: false }));
    back.add(mesh(new THREE.PlaneGeometry(wx1 - wx0, wy0), accent, { pos: [0, wy0 / 2, 0], cast: false }));
    back.add(mesh(new THREE.PlaneGeometry(wx1 - wx0, Hh - wy1), accent, { pos: [0, (Hh + wy1) / 2, 0], cast: false }));
    // window frame + mullions
    const frameM = std('#fdfaf3', 0.5);
    back.add(mesh(new THREE.BoxGeometry(wx1 - wx0 + 0.16, 0.08, 0.2), frameM, { pos: [0, wy0 - 0.04, 0.04] }));
    back.add(mesh(new THREE.BoxGeometry(wx1 - wx0 + 0.16, 0.08, 0.14), frameM, { pos: [0, wy1 + 0.04, 0] }));
    for (const x of [wx0 - 0.04, wx1 + 0.04, 0]) back.add(mesh(new THREE.BoxGeometry(0.07, wy1 - wy0, 0.12), frameM, { pos: [x, (wy0 + wy1) / 2, 0] }));
    back.add(mesh(new THREE.BoxGeometry(wx1 - wx0, 0.05, 0.1), frameM, { pos: [0, 1.75, 0] }));
    // curtains
    const curtM = std('#f28482', 0.95, 0, { side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const cg = new THREE.PlaneGeometry(0.6, 2.4, 24, 1); const pa = cg.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 26) * 0.04);
      cg.computeVertexNormals();
      back.add(mesh(cg, curtM, { pos: [s * 1.75, 1.45, 0.12] }));
    }
    back.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 4.2, 8).rotateZ(Math.PI / 2), std('#c9a227', 0.3, 0.8), { pos: [0, 2.68, 0.14] }));
    // side & front walls + ceiling
    S.add(mesh(new THREE.PlaneGeometry(7.5, Hh).rotateY(Math.PI / 2), wallMat, { pos: [-3.5, Hh / 2, 0.5], cast: false }));
    S.add(mesh(new THREE.PlaneGeometry(7.5, Hh).rotateY(-Math.PI / 2), wallMat, { pos: [3.5, Hh / 2, 0.5], cast: false }));
    S.add(mesh(new THREE.PlaneGeometry(7, Hh).rotateY(Math.PI), std('#f3d8c7', 0.95), { pos: [0, Hh / 2, 4.2], cast: false }));
    S.add(mesh(new THREE.PlaneGeometry(7, 7.5).rotateX(Math.PI / 2), std('#fbf6ee', 0.95), { pos: [0, Hh, 0.5], cast: false }));
    // baseboards
    const bb = std('#ffffff', 0.6);
    S.add(mesh(new THREE.BoxGeometry(7, 0.1, 0.03), bb, { pos: [0, 0.05, -2.98] }));
    S.add(mesh(new THREE.BoxGeometry(0.03, 0.1, 7.5), bb, { pos: [-3.48, 0.05, 0.5] }));
    S.add(mesh(new THREE.BoxGeometry(0.03, 0.1, 7.5), bb, { pos: [3.48, 0.05, 0.5] }));

    // rug
    S.add(mesh(new THREE.CircleGeometry(1.55, 64).rotateX(-Math.PI / 2), std('#fff', 1, 0, { map: rugTex() }), { pos: [0.2, 0.006, -0.45], cast: false }));

    // sofa
    const sofaM = std('#e5654e', 0.9), sofaD = std('#c9503d', 0.9);
    const sofa = group(S, [-0.7, 0, -2.25]);
    sofa.add(mesh(rbox(2.3, 0.3, 0.95, 0.08), sofaD, { pos: [0, 0.25, 0] }));
    for (const x of [-0.55, 0.55]) sofa.add(mesh(rbox(1.08, 0.16, 0.8, 0.07), sofaM, { pos: [x, 0.47, 0.06] }));
    for (const x of [-0.55, 0.55]) sofa.add(mesh(rbox(1.08, 0.55, 0.24, 0.1), sofaM, { pos: [x, 0.78, -0.33], rot: [-0.12, 0, 0] }));
    for (const s of [-1, 1]) sofa.add(mesh(rbox(0.24, 0.62, 0.95, 0.1), sofaM, { pos: [s * 1.2, 0.48, 0] }));
    for (const s of [-1, 1]) for (const z of [-0.35, 0.35]) sofa.add(mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.1, 8), std('#3d2b1f', 0.5), { pos: [s * 1.1, 0.05, z] }));
    // pillows
    sofa.add(mesh(rbox(0.42, 0.38, 0.14, 0.07), std('#ffd166', 0.95), { pos: [-0.85, 0.72, -0.12], rot: [-0.2, 0.25, 0.1] }));
    sofa.add(mesh(rbox(0.38, 0.36, 0.14, 0.07), std('#2a9d8f', 0.95), { pos: [0.9, 0.72, -0.12], rot: [-0.2, -0.3, -0.08] }));
    // throw blanket
    sofa.add(mesh(rbox(0.5, 0.05, 0.9, 0.02), std('#cdb4db', 1), { pos: [1.2, 0.8, 0.02], rot: [0, 0, -0.2] }));

    // coffee table
    const ct = group(S, [-1.85, 0, -0.75]);
    ct.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 40), std('#c8935e', 0.5), { pos: [0, 0.42, 0] }));
    ct.add(mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.4, 16), std('#2b2b2b', 0.4, 0.5), { pos: [0, 0.2, 0] }));
    ct.add(mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 24), std('#ef476f', 0.4), { pos: [0.1, 0.49, 0.05] }));
    for (let i = 0; i < 3; i++) ct.add(mesh(new THREE.SphereGeometry(0.045, 12, 10), std(['#ffd166', '#06d6a0', '#ff8fab'][i], 0.4), { pos: [0.1 + (i - 1) * 0.05, 0.55, 0.05 + (i % 2) * 0.03] }));
    ct.add(mesh(rbox(0.3, 0.04, 0.22, 0.01), std('#264653', 0.7), { pos: [-0.15, 0.47, -0.1], rot: [0, 0.4, 0] }));

    // floor lamp (practical)
    const lamp = group(S, [0.85, 0, -2.55]);
    lamp.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 24), std('#222', 0.4, 0.6), { pos: [0, 0.015, 0] }));
    lamp.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), std('#222', 0.4, 0.6), { pos: [0, 0.75, 0] }));
    lamp.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 32, 1, true), std('#fff1d6', 0.8, 0, { side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.9 }), { pos: [0, 1.6, 0], cast: false }));
    this.lampPos = new THREE.Vector3(0.85, 1.55, -2.55);

    // bookshelf with cat on top (left wall)
    const bs = group(S, [-3.25, 0, -0.9], [0, Math.PI / 2, 0]);
    const wood = std('#f4efe6', 0.6);
    bs.add(mesh(new THREE.BoxGeometry(1.1, 0.04, 0.38), wood, { pos: [0, 1.8, 0] }));
    for (const y of [0.02, 0.45, 0.9, 1.35]) bs.add(mesh(new THREE.BoxGeometry(1.1, 0.04, 0.38), wood, { pos: [0, y, 0] }));
    for (const x of [-0.53, 0.53]) bs.add(mesh(new THREE.BoxGeometry(0.04, 1.8, 0.38), wood, { pos: [x, 0.9, 0] }));
    const R = rand(11); const bookCols = ['#e76f51', '#2a9d8f', '#e9c46a', '#264653', '#f4a261', '#8ab17d', '#ef476f', '#118ab2'];
    for (const y of [0.04, 0.47, 0.92, 1.37]) {
      let x = -0.5;
      while (x < 0.45) {
        const bw = 0.04 + R() * 0.04, bh = 0.25 + R() * 0.13;
        if (R() > 0.12) bs.add(mesh(new THREE.BoxGeometry(bw, bh, 0.26), std(bookCols[Math.floor(R() * 8)], 0.7), { pos: [x + bw / 2, y + 0.02 + bh / 2, 0.02], rot: [0, 0, R() > 0.85 ? 0.15 : 0] }));
        x += bw + 0.005;
      }
    }
    this.catSpot = new THREE.Vector3(-3.2, 1.82, -0.9);
    // wall art
    const artPos = [[-3.47, 1.9, 1.0, Math.PI / 2, 0], [-3.47, 1.75, 1.75, Math.PI / 2, 1], [2.3, 1.85, -2.97, 0, 2], [-2.4, 1.9, -2.97, 0, 3]];
    for (const [x, y, z, ry, i] of artPos) {
      const fr = group(S, [x, y, z], [0, ry, 0]);
      fr.add(mesh(new THREE.BoxGeometry(0.62, 0.78, 0.04), std('#2b2b2b', 0.5), { pos: [0, 0, 0.02] }));
      fr.add(mesh(new THREE.PlaneGeometry(0.52, 0.68), std('#fff', 0.8, 0, { map: artTex(i + 3) }), { pos: [0, 0, 0.045], cast: false }));
    }
    // right wall door + doggy flap (exit for the ending)
    const door = group(S, [3.48, 0, 1.0], [0, -Math.PI / 2, 0]);
    door.add(mesh(new THREE.BoxGeometry(1.06, 2.16, 0.04), std('#ffffff', 0.5), { pos: [0, 1.08, -0.01] }));
    door.add(mesh(new THREE.BoxGeometry(0.95, 2.08, 0.05), std('#f2a65a', 0.55), { pos: [0, 1.04, 0.01] }));
    door.add(mesh(new THREE.SphereGeometry(0.035, 16, 12), std('#c9a227', 0.3, 0.9), { pos: [0.38, 1.0, 0.06] }));
    door.add(mesh(rbox(0.42, 0.44, 0.06, 0.03), std('#5a3a22', 0.6), { pos: [0, 0.28, 0.02] }));
    this.flap = mesh(rbox(0.36, 0.38, 0.03, 0.02), std('#3b2716', 0.5), { pos: [0, -0.19, 0], cast: false });
    this.flapPivot = group(door, [0, 0.47, 0.05]); this.flapPivot.add(this.flap);
    door.add(mesh(new THREE.PlaneGeometry(0.34, 0.36), std('#ffe3a3', 0.7, 0, { emissive: '#ffcf80', emissiveIntensity: 0.6 }), { pos: [0, 0.28, 0.005], cast: false }));
    // welcome mat
    S.add(mesh(rbox(0.6, 0.02, 0.9, 0.01), std('#8d6e63', 1), { pos: [3.05, 0.01, 1.0] }));
    // coat hooks


    // TV on front wall
    const tv = group(S, [1.3, 0, 4.05], [0, Math.PI, 0]);
    tv.add(mesh(rbox(1.9, 0.5, 0.45, 0.04), std('#e9d8c4', 0.6), { pos: [0, 0.25, 0] }));
    for (const x of [-0.5, 0.5]) tv.add(mesh(rbox(0.85, 0.36, 0.02, 0.01), std('#c8935e', 0.5), { pos: [x, 0.25, 0.23] }));
    tv.add(mesh(rbox(1.5, 0.88, 0.05, 0.02), std('#111', 0.3, 0.3), { pos: [0, 1.25, 0] }));
    this.tvTex = makeTVTexture();
    this.tvScreen = mesh(new THREE.PlaneGeometry(1.42, 0.8), new THREE.MeshBasicMaterial({ map: this.tvTex, toneMapped: false }), { pos: [0, 1.25, 0.027], cast: false });
    tv.add(this.tvScreen);
    this.tvPos = new THREE.Vector3(1.3, 1.25, 4.0);

    // plants
    this.plant(S, [-2.9, 0, -2.5], 1.2, 3);
    this.plant(S, [2.95, 0, 3.6], 1.0, 5);
    this.plant(S, [-0.2, 0.5, 3.95], 0.45, 9);

    // dog bed (corner) + slipper stash
    const bed = group(S, [2.45, 0, -2.25]);
    bed.add(mesh(new THREE.TorusGeometry(0.42, 0.13, 16, 40).rotateX(Math.PI / 2), std('#6d597a', 0.95), { pos: [0, 0.13, 0] }));
    bed.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 40), std('#b5838d', 0.95), { pos: [0, 0.05, 0] }));
    this.bedPos = new THREE.Vector3(2.45, 0, -2.25);
    this.pile = group(S, [2.45, 0.08, -2.25]);
    const PR = rand(47);
    for (let i = 0; i < 47; i++) {
      const sl = makeSlipper(PR);
      const hgt = Math.pow(i / 47, 0.85) * 0.5;
      const r = (1 - hgt / 0.56) * 0.5 * Math.sqrt(PR());
      const a = PR() * Math.PI * 2;
      sl.position.set(Math.cos(a) * r, hgt, Math.sin(a) * r);
      sl.rotation.set((PR() - 0.5) * 0.9, PR() * 6.28, (PR() - 0.5) * 0.9);
      this.pile.add(sl);
    }
    // food bowl
    this.bowl = group(S, [1.05, 0, 0.05]);
    const bowlPts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; bowlPts.push(new THREE.Vector2(0.11 + u * 0.06 + Math.sin(u * 3.14) * 0.01, u * 0.08)); }
    this.bowl.add(mesh(new THREE.LatheGeometry(bowlPts, 40), std('#4cc9f0', 0.25, 0.3, { side: THREE.DoubleSide })));
    this.bowl.add(mesh(new THREE.CircleGeometry(0.11, 30).rotateX(-Math.PI / 2), std('#4cc9f0', 0.3), { pos: [0, 0.003, 0] }));
    const KR = rand(5);
    for (let i = 0; i < 60; i++) { const a = KR() * 6.28, r = Math.sqrt(KR()) * 0.13; this.bowl.add(mesh(new THREE.SphereGeometry(0.016, 8, 6).scale(1, 0.6, 1), std(KR() > 0.5 ? '#8b4a1c' : '#a0602a', 0.8), { pos: [Math.cos(a) * r, 0.03 + KR() * 0.03 + (0.13 - r) * 0.2, Math.sin(a) * r], cast: false })); }
    const bowlLabel = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#fff'; c.font = '700 48px Fredoka'; c.textAlign = 'center'; c.fillText('MAX', w / 2, 50); });
    this.bowl.add(mesh(new THREE.PlaneGeometry(0.12, 0.03), new THREE.MeshBasicMaterial({ map: bowlLabel, transparent: true }), { pos: [0, 0.045, 0.157], rot: [-0.35, 0, 0], cast: false }));

    // pouf / podium for the demands
    this.pouf = group(S, [0.55, 0, -0.35]);
    this.pouf.add(mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.36, 40), std('#ffd166', 0.95), { pos: [0, 0.18, 0] }));
    this.pouf.add(mesh(new THREE.TorusGeometry(0.36, 0.04, 12, 40).rotateX(Math.PI / 2), std('#f4a261', 0.9), { pos: [0, 0.36, 0] }));
    this.pouf.visible = false;

    // ---- outside: yard + neighbor's house + second family
    const out = group(S);
    out.add(mesh(new THREE.PlaneGeometry(60, 30).rotateX(-Math.PI / 2), std('#6fae5a', 1), { pos: [0, -0.05, -18], cast: false }));
    out.add(mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ map: skyTex(), toneMapped: false, fog: false }), { pos: [0, 12, -40], cast: false }));
    // fence
    for (let i = -14; i <= 14; i++) out.add(mesh(rbox(0.16, 1.0, 0.05, 0.02), std('#fbf3e4', 0.8), { pos: [i * 0.25, 0.5, -5.2], cast: false }));
    out.add(mesh(new THREE.BoxGeometry(7.5, 0.08, 0.04), std('#fbf3e4', 0.8), { pos: [0, 0.75, -5.23], cast: false }));
    // neighbor house
    const nh = group(out, [0.6, 0, -9]);
    const fac = std('#ffd6a5', 0.9);
    for (const [w, h, x, y] of [[2, 4, -2.5, 2], [2.6, 4, 2.2, 2], [2.4, 1, -0.3, 0.5], [2.4, 1.4, -0.3, 3.3]]) nh.add(mesh(new THREE.PlaneGeometry(w, h), fac, { pos: [x, y, 0], cast: false }));
    nh.add(mesh(new THREE.BoxGeometry(7, 4, 3), fac, { pos: [0, 2, -3.0], cast: false }));
    nh.add(mesh(new THREE.BoxGeometry(0.9, 1.9, 0.05), std('#118ab2', 0.6), { pos: [2.2, 0.95, 0.03], cast: false }));
    nh.add(mesh(new THREE.PlaneGeometry(0.9, 0.8), std('#ffe8b0', 0.8, 0, { emissive: '#ffb347', emissiveIntensity: 0.8 }), { pos: [-2.5, 2.2, 0.01], cast: false }));
    nh.add(mesh(new THREE.ConeGeometry(5, 1.8, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.45), std('#9d4edd', 0.8), { pos: [0, 4.9, -1.5], cast: false }));
    // neighbor window interior
    const nw = group(nh, [-0.3, 1.0, 0.01]);
    const room = mesh(new THREE.BoxGeometry(2.4, 1.6, 1.2), std('#ffe8b0', 0.9, 0, { side: THREE.BackSide, emissive: '#ffb347', emissiveIntensity: 0.35 }), { pos: [0, 0.8, -0.6], cast: false });
    nw.add(room);
    nh.add(mesh(new THREE.BoxGeometry(2.6, 0.12, 0.1), std('#ffffff', 0.6), { pos: [-0.3, 0.98, 0.05], cast: false }));
    nh.add(mesh(new THREE.BoxGeometry(2.6, 0.12, 0.1), std('#ffffff', 0.6), { pos: [-0.3, 2.62, 0.05], cast: false }));
    for (const x of [-1.55, 0.95]) nh.add(mesh(new THREE.BoxGeometry(0.12, 1.75, 0.1), std('#ffffff', 0.6), { pos: [x, 1.8, 0.05], cast: false }));
    // facade around window must be open: carve by placing facade panels in front (house box is behind)
    // banner
    const banner = canvasTex(512, 128, (c, w, h) => {
      c.fillStyle = '#ef476f'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { c.fillStyle = ['#ffd166', '#06d6a0', '#118ab2'][i % 3]; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 16, 22); c.fill(); }
      c.fillStyle = '#fff'; c.font = '700 72px Fredoka'; c.textAlign = 'center'; c.fillText('WE      MAX', w / 2, 104);
      c.fillStyle = '#ffd166'; const hx = w / 2 - 4, hy = 78; c.beginPath(); c.moveTo(hx, hy + 22); c.bezierCurveTo(hx - 40, hy - 6, hx - 18, hy - 34, hx, hy - 14); c.bezierCurveTo(hx + 18, hy - 34, hx + 40, hy - 6, hx, hy + 22); c.fill();
    });
    nw.add(mesh(new THREE.PlaneGeometry(1.25, 0.31), new THREE.MeshBasicMaterial({ map: banner, toneMapped: false }), { pos: [0, 1.32, -1.15], cast: false }));
    // family figures
    this.family = [];
    const fam = [[-0.48, 1.0, '#118ab2', '#f1c27d', '#3d2314'], [0.05, 0.75, '#ffd166', '#8d5524', '#111'], [0.5, 1.05, '#06d6a0', '#e0ac69', '#7a3b12']];
    fam.forEach(([x, hgt, shirt, skin, hairC], i) => {
      const f = group(nw, [x, 0, -0.6]);
      f.add(mesh(capsule(0.17, hgt * 0.45), std(shirt, 0.8), { pos: [0, hgt * 0.45, 0], cast: false }));
      f.add(mesh(new THREE.SphereGeometry(0.15, 24, 16), std(skin, 0.6), { pos: [0, hgt * 0.85 + 0.12, 0], cast: false }));
      f.add(mesh(new THREE.SphereGeometry(0.155, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), std(hairC, 0.6), { pos: [0, hgt * 0.85 + 0.13, -0.01], rot: [-0.3, 0, 0], cast: false }));
      for (const s of [-1, 1]) f.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), std('#111', 0.3), { pos: [s * 0.05, hgt * 0.85 + 0.15, 0.135], cast: false }));
      f.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI).rotateZ(Math.PI), std('#6a1a24', 0.5), { pos: [0, hgt * 0.85 + 0.08, 0.14], cast: false }));
      // party hat
      f.add(mesh(new THREE.ConeGeometry(0.08, 0.2, 16), std(['#ef476f', '#06d6a0', '#ffd166'][i], 0.6), { pos: [0.03, hgt * 0.85 + 0.33, 0], rot: [0, 0, -0.2], cast: false }));
      const arm = group(f, [0.17, hgt * 0.7, 0]);
      arm.add(mesh(capsule(0.045, 0.3), std(shirt, 0.8), { pos: [0, 0.17, 0], cast: false }));
      arm.add(mesh(new THREE.SphereGeometry(0.055, 12, 8), std(skin, 0.6), { pos: [0, 0.36, 0], cast: false }));
      this.family.push(arm);
    });
    // their dog bowl, labelled MAX
    const nb = group(nw, [0.45, 0, -0.15]);
    nb.add(mesh(new THREE.LatheGeometry(bowlPts, 30), std('#ef476f', 0.3, 0.2, { side: THREE.DoubleSide }), { scale: 1.6, cast: false }));
    const nwLight = new THREE.PointLight('#ffb347', 6, 4, 1.5); nwLight.position.set(0, 1.2, 0); nw.add(nwLight);
    this.neighborWindow = new THREE.Vector3(0.3, 2.0, -9.0);

    // demand icons (scene 4)
    this.icons = this.makeIcons(S);
  }

  plant(S, pos, sc, seed) {
    const p = group(S, pos); p.scale.setScalar(sc);
    p.add(mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.38, 24), std(['#e07a5f', '#f2cc8f', '#81b29a'][seed % 3], 0.6), { pos: [0, 0.19, 0] }));
    p.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24), std('#3b2a1a', 1), { pos: [0, 0.37, 0] }));
    const R = rand(seed);
    const leafG = new THREE.SphereGeometry(1, 16, 8).scale(0.13, 0.015, 0.26).translate(0, 0, 0.24);
    for (let i = 0; i < 11; i++) {
      const stem = group(p, [0, 0.38, 0], [0, R() * 6.28, 0]);
      const h = 0.3 + R() * 0.65;
      stem.add(mesh(new THREE.CylinderGeometry(0.008, 0.01, h, 5), std('#3d7a3a', 0.8), { pos: [0, h / 2, 0], cast: false }));
      stem.add(mesh(leafG, std(R() > 0.5 ? '#2d8a4e' : '#3fa65b', 0.6, 0, { side: THREE.DoubleSide }), { pos: [0, h, 0], rot: [-0.4 - R() * 0.5, 0, 0] }));
    }
  }

  makeIcons(S) {
    const make = (builder, color) => {
      const g = group(S); const inner = group(g); builder(inner);
      const ring = mesh(new THREE.TorusGeometry(0.32, 0.025, 12, 48), new THREE.MeshBasicMaterial({ color, toneMapped: false }), { cast: false }); g.add(ring);
      const disc = mesh(new THREE.CircleGeometry(0.31, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false }), { pos: [0, 0, -0.03], cast: false }); g.add(disc);
      g.visible = false; g.userData = { inner, ring };
      return g;
    };
    const bed = make((g) => {
      g.add(mesh(rbox(0.36, 0.08, 0.24, 0.02), std('#8d5a3b', 0.6), { pos: [0, -0.06, 0] }));
      g.add(mesh(rbox(0.06, 0.24, 0.26, 0.02), std('#8d5a3b', 0.6), { pos: [-0.19, 0.0, 0] }));
      g.add(mesh(rbox(0.34, 0.06, 0.22, 0.03), std('#ffffff', 0.8), { pos: [0, 0.0, 0] }));
      g.add(mesh(rbox(0.22, 0.05, 0.23, 0.02), std('#ef476f', 0.8), { pos: [0.06, 0.03, 0] }));
      g.add(mesh(rbox(0.08, 0.06, 0.16, 0.03), std('#ffd166', 0.8), { pos: [-0.12, 0.05, 0] }));
    }, '#ff70a6');
    const phone = make((g) => {
      g.add(mesh(rbox(0.22, 0.42, 0.035, 0.03), std('#1b1b2f', 0.25, 0.5), { pos: [0, 0, 0] }));
      const scr = canvasTex(128, 256, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7b2ff7'); gr.addColorStop(1, '#00d4ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.fillStyle = '#fff'; c.font = '700 22px Fredoka'; c.textAlign = 'center'; c.fillText('5G', w - 22, 24);
        // paw print
        c.fillStyle = '#ffd166'; c.beginPath(); c.ellipse(w / 2, 150, 26, 22, 0, 0, 7); c.fill();
        for (const [dx, dy] of [[-30, 112], [-11, 98], [11, 98], [30, 112]]) { c.beginPath(); c.ellipse(w / 2 + dx, dy, 9, 12, 0, 0, 7); c.fill(); }
        c.fillStyle = '#fff'; c.font = '600 18px Fredoka'; c.fillText('UNLIMITED', w / 2, 214);
      });
      g.add(mesh(new THREE.PlaneGeometry(0.19, 0.38), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }), { pos: [0, 0, 0.019], cast: false }));
    }, '#70d6ff');
    const chef = make((g) => {
      const w = std('#ffffff', 0.85);
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 28), w, { pos: [0, -0.08, 0] }));
      for (const [x, y, z, r] of [[0, 0.08, 0, 0.13], [-0.1, 0.04, 0, 0.09], [0.1, 0.04, 0, 0.09], [0, 0.05, 0.08, 0.09], [0, 0.05, -0.08, 0.09]]) g.add(mesh(new THREE.SphereGeometry(r, 20, 14), w, { pos: [x, y, z] }));
      g.add(mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 28).rotateX(Math.PI / 2), std('#e63946', 0.6), { pos: [0, -0.13, 0] }));
    }, '#ffd670');
    return [bed, phone, chef];
  }

  update(t, st) {
    // TV screen animates
    if (st.tvOn) this.tvTex.userData.drawAt(t);
    this.tvScreen.material.color.setScalar(st.tvOn ? 1 : 0.05);
    this.pouf.visible = !!st.pouf;
    // neighbor family waves
    this.family.forEach((a, i) => { a.rotation.z = -0.4 - Math.abs(Math.sin(t * 7 + i * 1.3)) * 0.8; });
    // dog flap swing
    this.flapPivot.rotation.x = st.flap || 0;
    // demand icons
    this.icons.forEach((ic, i) => {
      const s = st.icons ? st.icons[i] : null;
      ic.visible = !!s && s.on > 0;
      if (!ic.visible) return;
      ic.position.copy(s.pos);
      ic.scale.setScalar(Math.max(0.001, spring(s.on * 1.2, 11, 5.5)) * (s.scale || 1));
      ic.userData.inner.rotation.set(0.25, Math.sin(t * 2 + i) * 0.5 + 0.4, 0);
      ic.lookAt(st.camPos);
      ic.userData.inner.rotation.y = Math.sin(t * 2.2 + i) * 0.6;
    });
  }
}
