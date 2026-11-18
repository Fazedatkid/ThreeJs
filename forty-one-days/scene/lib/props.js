import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ell, capsule, std, mesh, group, canvasTex, rand } from './util.js';

export function makeCake() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 40), std('#f4f4f4', 0.3), { pos: [0, 0.006, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.12, 40), std('#6b3a22', 0.6), { pos: [0, 0.07, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.025, 40), std('#f7c6d9', 0.4), { pos: [0, 0.14, 0] }));
  const R = rand(31);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.018, 10, 8), std('#f7c6d9', 0.4), { pos: [Math.cos(a) * 0.145, 0.13 - (i % 2) * 0.02, Math.sin(a) * 0.145] })); }
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = R() * 0.13; g.add(mesh(new THREE.CapsuleGeometry(0.003, 0.012, 2, 4), std(['#ff4d6d', '#3a86ff', '#ffbe0b', '#06d6a0'][i % 4], 0.4), { pos: [Math.cos(a) * r, 0.155, Math.sin(a) * r], rot: [Math.PI / 2, 0, R() * 3], cast: false })); }
  // "14" candles
  const flames = [];
  const flameM = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.95 });
  const coreM = new THREE.MeshBasicMaterial({ color: '#fff8e0' });
  [[-0.045, '#3a86ff'], [0.045, '#ff4d6d']].forEach(([x, col]) => {
    g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 12), std(col, 0.4), { pos: [x, 0.2, 0] }));
    const f = group(g, [x, 0.265, 0]);
    f.add(mesh(new THREE.SphereGeometry(0.012, 12, 10).scale(1, 2.2, 1), flameM, { cast: false }));
    f.add(mesh(new THREE.SphereGeometry(0.006, 10, 8).scale(1, 2, 1), coreM, { pos: [0, -0.005, 0], cast: false }));
    flames.push(f);
  });
  // number toppers "1" "4"
  const topper = canvasTex(256, 128, (c, w, h) => { c.font = '700 120px Fredoka'; c.textAlign = 'center'; c.fillStyle = '#ffd166'; c.strokeStyle = '#b5651d'; c.lineWidth = 8; c.strokeText('14', w / 2, 108); c.fillText('14', w / 2, 108); });
  g.add(mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshStandardMaterial({ map: topper, transparent: true, roughness: 0.4 }), { pos: [0, 0.19, 0.06], cast: false }));
  g.userData.flames = flames;
  // smoke wisps
  const smokeM = new THREE.MeshBasicMaterial({ color: '#dddddd', transparent: true, opacity: 0, depthWrite: false });
  g.userData.smoke = [0, 1, 2, 3, 4, 5].map((i) => { const m = mesh(new THREE.SphereGeometry(0.02, 10, 8), smokeM.clone(), { cast: false }); g.add(m); return m; });
  return g;
}

export function makeHelmet() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.165, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.95, 1.12), std('#e63946', 0.3, 0.1), { pos: [0, 0, 0] }));
  for (const x of [-0.045, 0.045]) g.add(mesh(new THREE.TorusGeometry(0.162, 0.009, 8, 40, Math.PI).rotateY(Math.PI / 2).scale(1, 0.95, 1.12), std('#f1faee', 0.3), { pos: [x, 0.004, 0] }));
  g.add(mesh(new THREE.TorusGeometry(0.163, 0.01, 8, 40).rotateX(Math.PI / 2).scale(1, 1, 1.12), std('#1d1d1d', 0.6), { pos: [0, 0.025, 0] }));
  for (const s of [-1, 1]) g.add(mesh(capsule(0.004, 0.12), std('#1d1d1d', 0.6), { pos: [s * 0.13, -0.06, 0.02], rot: [0, 0, -s * 0.2] }));
  return g;
}

export function makeBubbleSleeve() {
  const tex = canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(220,240,255,0.35)'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const cx = x * 32 + 16 + (y % 2) * 16, cy = y * 32 + 16;
      const g = c.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, 13); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(210,235,255,0.45)'); g.addColorStop(1, 'rgba(160,200,240,0.6)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const g = new THREE.Group();
  g.add(mesh(capsule(0.072, 0.2, 6, 20), m, { pos: [0, -0.13, 0], cast: false }));
  return { group: g, mat: m, lower: mesh(capsule(0.064, 0.18, 6, 20), m, { pos: [0, -0.11, 0], cast: false }) };
}

export function makePlate({ bacon = 0, toast = 0, eggs = 0 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 32), std('#fdfdfd', 0.25), { pos: [0, 0.01, 0] }));
  g.userData.bacon = [];
  const baconTex = canvasTex(128, 32, (c, w, h) => { c.fillStyle = '#b5452f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c4a0'; c.fillRect(0, 10, w, 5); c.fillRect(0, 22, w, 3); });
  for (let i = 0; i < bacon; i++) {
    const geo = new THREE.PlaneGeometry(0.17, 0.035, 24, 1); const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 60) * 0.008);
    geo.computeVertexNormals(); geo.rotateX(-Math.PI / 2);
    const b = mesh(geo, std('#ffffff', 0.5, 0, { map: baconTex, side: THREE.DoubleSide }), { pos: [0, 0.03 + i * 0.006, -0.03 + i * 0.045], rot: [0, 0.2 - i * 0.3, 0] });
    g.add(b); g.userData.bacon.push(b);
  }
  for (let i = 0; i < toast; i++) {
    g.add(mesh(new RoundedBoxGeometry(0.1, 0.018, 0.1, 2, 0.008), std('#d99a4e', 0.8), { pos: [0.04, 0.03 + i * 0.02, 0.04], rot: [0, 0.4 + i * 0.3, 0] }));
  }
  for (let i = 0; i < eggs; i++) {
    g.add(mesh(ell(0.045, 0.006, 0.04), std('#ffffff', 0.4), { pos: [-0.05, 0.025, 0.03] }));
    g.add(mesh(ell(0.018, 0.012, 0.018), std('#ffb703', 0.3), { pos: [-0.05, 0.03, 0.03] }));
  }
  return g;
}
export function makeToastSlice() { return mesh(new RoundedBoxGeometry(0.1, 0.018, 0.1, 2, 0.008), std('#d99a4e', 0.8), { rot: [Math.PI / 2, 0, 0] }); }
export function makeBaconStrip() {
  const baconTex = canvasTex(128, 32, (c, w, h) => { c.fillStyle = '#b5452f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c4a0'; c.fillRect(0, 10, w, 5); c.fillRect(0, 22, w, 3); });
  const geo = new THREE.PlaneGeometry(0.17, 0.035, 24, 1); const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 60) * 0.008);
  geo.computeVertexNormals();
  return mesh(geo.rotateZ(Math.PI / 2), std('#ffffff', 0.5, 0, { map: baconTex, side: THREE.DoubleSide }));
}

export function makeMug(color = '#ff8c42') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), std(color, 0.4), { pos: [0, 0.05, 0] }));
  g.add(mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 16), std(color, 0.4), { pos: [0.05, 0.05, 0] }));
  g.add(mesh(new THREE.CircleGeometry(0.04, 20).rotateX(-Math.PI / 2), std('#5a3220', 0.3), { pos: [0, 0.092, 0], cast: false }));
  g.add(mesh(ell(0.03, 0.012, 0.03), std('#fffaf2', 0.6), { pos: [0, 0.095, 0], cast: false })); // marshmallow foam
  // steam
  const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false });
  g.userData.steam = [0, 1, 2].map((i) => { const m = mesh(new THREE.SphereGeometry(0.015, 10, 8), sm.clone(), { cast: false }); g.add(m); return m; });
  return g;
}

export function makeTablet() {
  const tex = canvasTex(384, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7ad3ff'); g.addColorStop(1, '#3a7bd5'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // friend avatar: cartoon kid with cap
    c.fillStyle = '#8d5a3b'; c.beginPath(); c.arc(w / 2, 250, 95, 0, 7); c.fill();
    c.fillStyle = '#ff6b3d'; c.beginPath(); c.arc(w / 2, 220, 100, Math.PI, 0); c.fill(); c.fillRect(w / 2, 205, 150, 26);
    c.fillStyle = '#fff'; for (const x of [-35, 35]) { c.beginPath(); c.arc(w / 2 + x, 260, 22, 0, 7); c.fill(); }
    c.fillStyle = '#222'; for (const x of [-30, 40]) { c.beginPath(); c.arc(w / 2 + x, 262, 10, 0, 7); c.fill(); }
    c.strokeStyle = '#4a1f10'; c.lineWidth = 9; c.beginPath(); c.arc(w / 2, 290, 38, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
    c.fillStyle = '#2a8c5a'; c.fillRect(w / 2 - 120, 345, 240, 170);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, h - 70, w, 70);
    c.fillStyle = '#ff4d4d'; c.beginPath(); c.arc(w / 2, h - 35, 22, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '600 30px Fredoka'; c.fillText('JAY', 18, 44);
  });
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(0.2, 0.27, 0.012, 3, 0.01), std('#1c1c22', 0.3)));
  g.add(mesh(new THREE.PlaneGeometry(0.18, 0.245), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), { pos: [0, 0, 0.0065], cast: false }));
  return g;
}

export function makeRod() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.012, 1.4, 8).translate(0, 0.7, 0), std('#2a2a2a', 0.4)));
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10).translate(0, 0.08, 0), std('#7a4a2a', 0.7)));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16).rotateZ(Math.PI / 2), std('#c0c0c0', 0.3, 0.8), { pos: [0.035, 0.24, 0] }));
  g.userData.tip = new THREE.Vector3(0, 1.4, 0);
  return g;
}
export function makeLine() { return mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 1, 4), new THREE.MeshBasicMaterial({ color: '#f0f0f0' }), { cast: false }); }
export function makeBoot() {
  const g = new THREE.Group(); const m = std('#4a3426', 0.85);
  g.add(mesh(capsule(0.055, 0.14), m, { pos: [0, 0.1, 0] }));
  g.add(mesh(ell(0.06, 0.05, 0.13), m, { pos: [0, -0.02, 0.06] }));
  g.add(mesh(ell(0.064, 0.015, 0.135), std('#2a1d14', 0.9), { pos: [0, -0.06, 0.06] }));
  const weed = std('#4f9e4a', 0.7);
  for (let i = 0; i < 4; i++) g.add(mesh(capsule(0.006, 0.08), weed, { pos: [-0.02 + i * 0.015, 0.25, 0], rot: [0.3 * (i - 1.5), 0, 0.4 * (i - 1.5)] }));
  return g;
}
export function makeTicketHalf(side) {
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a86ff'; c.fillRect(0, 0, w, 30);
    c.fillStyle = '#fff'; c.font = '700 22px Fredoka'; c.fillText('BOARDING PASS', 12, 22);
    c.fillStyle = '#333'; c.font = '700 34px Fredoka'; c.fillText('WORK TRIP', 12, 76); c.font = '600 20px Fredoka'; c.fillText('7 DAYS  ✈', 12, 108);
  });
  tex.offset.x = side < 0 ? 0 : 0.5; tex.repeat.x = 0.5;
  return mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }), { cast: false });
}
