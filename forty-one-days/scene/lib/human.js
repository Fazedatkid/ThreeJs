import * as THREE from 'three';
import { ell, capsule, std, mesh, group, lerp, clamp, canvasTex, rand } from './util.js';

// Fabric textures --------------------------------------------------------------------------
function fabricTex(base, { stripe = null, seed = 1, plaid = null, panel = null, text = null } = {}) {
  const t = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    if (plaid) {
      c.globalAlpha = 0.35; c.fillStyle = plaid[0];
      for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 22, h);
      for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 22);
      c.globalAlpha = 0.5; c.fillStyle = plaid[1];
      for (let x = 30; x < w; x += 64) c.fillRect(x, 0, 4, h);
      for (let y = 30; y < h; y += 64) c.fillRect(0, y, w, 4);
      c.globalAlpha = 1;
    }
    const R = rand(seed);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},${0.025 + R() * 0.03})`; c.fillRect(R() * w, R() * h, 2, 2 + R() * 3); }
    if (panel) { // open shirt: t-shirt panel at the front (u = 0.25 on a THREE sphere)
      const cx = w * 0.25, pw = w * panel.width;
      c.fillStyle = panel.color; c.fillRect(cx - pw / 2, 0, pw, h);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(cx - pw / 2 - 5, 0, 6, h); c.fillRect(cx + pw / 2 - 1, 0, 6, h);
      if (text) {
        c.save(); c.translate(cx, h * 0.42); c.fillStyle = text.color; c.textAlign = 'center';
        c.font = `700 ${text.size}px Fredoka`; text.lines.forEach((l, i) => c.fillText(l, 0, i * text.size * 1.05)); c.restore();
      }
    }
    if (stripe) { c.fillStyle = stripe; c.fillRect(0, h * 0.86, w, h * 0.05); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function airplanePatch() {
  return canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#2f4a7a'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
    c.strokeStyle = '#f2e6c9'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(28, 70); c.lineTo(100, 36); c.lineTo(62, 98); c.lineTo(56, 74); c.closePath(); c.fill();
    c.fillStyle = '#c8d6ec'; c.beginPath(); c.moveTo(56, 74); c.lineTo(100, 36); c.lineTo(62, 84); c.closePath(); c.fill();
  });
}

// Configurable stylized human. Root on the floor, facing +Z. ------------------------------
export class Human {
  constructor(o) {
    this.o = o;
    this.root = new THREE.Group();
    this.body = group(this.root); this.body.scale.setScalar(o.scale || 1);
    const skin = std(o.skin, 0.55), skinD = std(o.skinDark || o.skin, 0.5);
    this.skinM = skin;
    const top = std('#ffffff', 0.85, 0, { map: o.topTex });
    const sleeve = std('#ffffff', 0.85, 0, { map: o.sleeveTex || o.topTex });
    const pants = std(o.pants, 0.85), hair = std(o.hairColor, 0.6);
    const belly = o.belly || 0;

    this.pelvis = group(this.body, [0, 0.86, 0]);
    this.pelvis.add(mesh(ell(0.17 + belly * 0.02, 0.11, 0.13 + belly * 0.02), pants, { pos: [0, 0.02, 0] }));
    this.spine = group(this.pelvis, [0, 0.04, 0]);
    this.spine.add(mesh(ell(0.19 + belly * 0.02, 0.27, 0.145), top, { pos: [0, 0.25, 0] }));
    if (belly) this.spine.add(mesh(ell(0.185, 0.18, 0.15 + belly * 0.05), o.bellyTex ? std('#ffffff', 0.85, 0, { map: o.bellyTex }) : top, { pos: [0, 0.14, 0.02 + belly * 0.02] }));
    // neck
    this.spine.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16), skin, { pos: [0, 0.53, 0] }));
    if (o.hoodie) {
      const hm = std(o.hoodie, 0.85);
      this.spine.add(mesh(new THREE.TorusGeometry(0.1, 0.045, 14, 32).rotateX(Math.PI / 2 - 0.5), hm, { pos: [0, 0.5, -0.04] }));
      this.spine.add(mesh(ell(0.12, 0.07, 0.04), hm, { pos: [0, 0.12, 0.13] })); // pocket
      for (const s of [-1, 1]) this.spine.add(mesh(capsule(0.006, 0.12), std('#f4f1e8', 0.6), { pos: [s * 0.035, 0.4, 0.145], rot: [-0.25, 0, 0] }));
      const patch = mesh(new THREE.CircleGeometry(0.03, 24), new THREE.MeshStandardMaterial({ map: airplanePatch(), roughness: 0.8 }), { pos: [0.075, 0.37, 0.139], rot: [-0.2, 0.32, 0], cast: false });
      this.spine.add(patch);
    } else if (o.collar) {
      this.spine.add(mesh(new THREE.TorusGeometry(0.075, 0.025, 12, 28).rotateX(Math.PI / 2), std(o.collar, 0.85), { pos: [0, 0.5, 0] }));
    }
    this.neck = group(this.spine, [0, 0.55, 0]);
    this.head = group(this.neck);
    const H = this.head;
    H.add(mesh(ell(0.125, 0.145, 0.128), skin, { pos: [0, 0.13, 0] }));
    H.add(mesh(ell(0.1, 0.07, 0.1), skin, { pos: [0, 0.06, 0.02] }));
    this.buildHair(H, hair, o);
    for (const s of [-1, 1]) H.add(mesh(ell(0.018, 0.03, 0.02), skin, { pos: [s * 0.124, 0.12, 0.0] }));
    if (o.earrings) for (const s of [-1, 1]) H.add(mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 16), std('#ffcc33', 0.2, 1), { pos: [s * 0.128, 0.08, 0.005], rot: [0, Math.PI / 2, 0] }));
    H.add(mesh(ell(0.019, 0.022, 0.022), skinD, { pos: [0, 0.1, 0.13] }));
    const blushM = new THREE.MeshBasicMaterial({ color: '#ff7a7a', transparent: true, opacity: o.blush ?? 0.22, depthWrite: false });
    for (const s of [-1, 1]) H.add(mesh(new THREE.CircleGeometry(0.022, 20), blushM, { pos: [s * 0.075, 0.08, 0.112], rot: [0, s * 0.55, 0], cast: false }));
    if (o.freckles) {
      const fm = new THREE.MeshBasicMaterial({ color: '#8a4a2a', transparent: true, opacity: 0.55, depthWrite: false });
      const R = rand(5);
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
        const x = s * (0.032 + R() * 0.04), y = 0.095 + R() * 0.025;
        const z = Math.sqrt(Math.max(0, 1 - (x / 0.126) ** 2 - ((y - 0.13) / 0.146) ** 2)) * 0.129 + 0.0015;
        H.add(mesh(new THREE.CircleGeometry(0.0032, 8), fm, { pos: [x, y, z], rot: [0, Math.asin(clamp(x / 0.126, -1, 1)), 0], cast: false }));
      }
    }
    // eyes
    const iris = std(o.eyeColor || '#5a3a1a', 0.3);
    this.eyes = [-1, 1].map((s) => {
      const eg = group(H, [s * 0.047, 0.135, 0.104], [0, s * 0.2, 0]);
      const look = group(eg);
      look.add(mesh(new THREE.SphereGeometry(0.028, 28, 20), std('#fbfaf7', 0.3), { cast: false }));
      look.add(mesh(new THREE.SphereGeometry(0.0195, 28, 20).scale(1, 1, 0.45), iris, { pos: [0, 0, 0.0195], cast: false }));
      const pupil = mesh(new THREE.SphereGeometry(0.0095, 20, 12).scale(1, 1, 0.4), std('#060404', 0.2), { pos: [0, 0, 0.0262], cast: false }); look.add(pupil);
      look.add(mesh(new THREE.SphereGeometry(0.0048, 10, 6), new THREE.MeshBasicMaterial({ color: '#fff' }), { pos: [0.005, 0.007, 0.0285], cast: false }));
      const up = mesh(new THREE.SphereGeometry(0.0335, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin, { cast: false }); eg.add(up);
      if (o.lashes) up.add(mesh(new THREE.TorusGeometry(0.0335, 0.0028, 6, 30, Math.PI).rotateX(Math.PI / 2), std('#1a0e0a', 0.6), { cast: false }));
      const lo = mesh(new THREE.SphereGeometry(0.033, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, { cast: false }); eg.add(lo);
      const bg = group(H, [s * 0.05, 0.183, 0.112]);
      bg.add(mesh(capsule(o.browThick || 0.0075, 0.04, 4, 10), std(o.browColor || '#2b130c', 0.7), { rot: [0, 0, Math.PI / 2 + s * 0.08], cast: false }));
      return { eg, look, up, lo, bg, s, pupil };
    });
    // tears (emotional beats)
    this.tearM = new THREE.MeshStandardMaterial({ color: '#a8dcff', roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0 });
    this.tears = [-1, 1].map((s) => mesh(ell(0.0045, 0.0075, 0.004), this.tearM, { pos: [s * 0.055, 0.1, 0.122], cast: false }));
    this.tears.forEach((m) => H.add(m));
    // mouth
    this.mouth = group(H, [0, 0.052, 0.118]);
    this.mouthDark = mesh(ell(0.03, 0.012, 0.014), std('#3d0f16', 0.7), { cast: false }); this.mouth.add(this.mouthDark);
    this.teeth = mesh(ell(0.022, 0.006, 0.01), std('#ffffff', 0.3), { pos: [0, 0.008, 0.004], cast: false }); this.mouth.add(this.teeth);
    const lipM = std(o.lip || '#a65a52', 0.45);
    this.lipU = mesh(capsule(0.0045, 0.04, 4, 10).rotateZ(Math.PI / 2), lipM, { pos: [0, 0.012, 0.008], cast: false }); this.mouth.add(this.lipU);
    this.lipL = mesh(capsule(0.0055, 0.036, 4, 10).rotateZ(Math.PI / 2), lipM, { pos: [0, -0.012, 0.008], cast: false }); this.mouth.add(this.lipL);
    if (o.beard) this.buildBeard(H, std(o.beard, 0.75));
    if (o.glasses) this.buildGlasses(H, std(o.glasses, 0.35));
    // headphones (around neck by default, on ears when p.phonesOn)
    if (o.headphones) {
      const hp = std('#16161a', 0.35), pad = std('#2a2a30', 0.8);
      this.phonesNeck = group(this.spine, [0, 0.5, 0.0]);
      this.phonesNeck.add(mesh(new THREE.TorusGeometry(0.105, 0.012, 10, 36, Math.PI * 1.15).rotateX(Math.PI / 2).rotateY(-Math.PI * 0.075 + Math.PI), hp, { pos: [0, 0, -0.01] }));
      for (const s of [-1, 1]) this.phonesNeck.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.028, 24), pad, { pos: [s * 0.11, -0.01, 0.035], rot: [0.3, 0, s * (Math.PI / 2 - 0.5)] }));
      this.phonesHead = group(H);
      this.phonesHead.add(mesh(new THREE.TorusGeometry(0.148, 0.011, 10, 40, Math.PI).rotateZ(0), hp, { pos: [0, 0.13, -0.01] }));
      for (const s of [-1, 1]) this.phonesHead.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 24), pad, { pos: [s * 0.142, 0.115, 0], rot: [0, 0, Math.PI / 2] }));
      this.phonesHead.visible = false;
    }
    // arms
    const cuff = o.cuff ? std(o.cuff, 0.8) : null;
    this.arms = [-1, 1].map((s) => {
      const sh = group(this.spine, [s * (0.2 + belly * 0.01), 0.43, 0]);
      sh.add(mesh(capsule(0.055, 0.2), sleeve, { pos: [0, -0.13, 0] }));
      const el = group(sh, [0, -0.27, 0]);
      el.add(mesh(capsule(0.047, 0.18), sleeve, { pos: [0, -0.11, 0] }));
      if (cuff) el.add(mesh(new THREE.TorusGeometry(0.044, 0.014, 8, 20).rotateX(Math.PI / 2), cuff, { pos: [0, -0.22, 0] }));
      const wr = group(el, [0, -0.25, 0]);
      wr.add(mesh(ell(0.038, 0.05, 0.026), skin, { pos: [0, -0.035, 0] }));
      wr.add(mesh(capsule(0.012, 0.03).rotateZ(-s * 0.6), skin, { pos: [-s * 0.03, -0.02, 0.01] }));
      const hold = group(wr, [0, -0.05, 0.02]);
      return { sh, el, wr, s, hold };
    });
    // legs
    const shoeM = std(o.shoe || '#ffffff', 0.5);
    this.legs = [-1, 1].map((s) => {
      const hp = group(this.pelvis, [s * 0.09, -0.02, 0]);
      hp.add(mesh(capsule(0.078, 0.3), pants, { pos: [0, -0.2, 0] }));
      const kn = group(hp, [0, -0.42, 0]);
      kn.add(mesh(capsule(0.062, 0.3), pants, { pos: [0, -0.2, 0] }));
      const an = group(kn, [0, -0.41, 0]);
      an.add(mesh(ell(0.06, 0.045, 0.12), shoeM, { pos: [0, -0.012, 0.045] }));
      if (o.shoeSole) an.add(mesh(ell(0.062, 0.016, 0.122), std(o.shoeSole, 0.6), { pos: [0, -0.042, 0.045] }));
      if (o.laces) an.add(mesh(ell(0.03, 0.012, 0.05), std(o.laces, 0.5), { pos: [0, 0.025, 0.07], rot: [-0.3, 0, 0] }));
      return { hp, kn, an, s };
    });
  }

  buildHair(H, hair, o) {
    if (o.hair === 'curly') {
      const R = rand(11), dir = new THREE.Vector3();
      const geo = new THREE.IcosahedronGeometry(1, 2);
      let n = 0;
      for (let i = 0; i < 600 && n < 110; i++) {
        dir.set(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1); if (dir.lengthSq() > 1 || dir.lengthSq() < 0.05) continue; dir.normalize();
        if (dir.y < -0.05 && dir.z > -0.3) continue;      // keep the face + ears clear
        if (dir.y < -0.35) continue;
        if (dir.z > 0.55 && dir.y < 0.62) continue;        // forehead
        if (Math.abs(dir.x) > 0.8 && dir.y < 0.2 && dir.z > -0.2) continue;
        const r = 0.03 + R() * 0.017;
        H.add(mesh(geo, hair, { pos: [dir.x * 0.132, 0.15 + dir.y * 0.14, -0.01 + dir.z * 0.135], scale: r }));
        n++;
      }
      for (let i = 0; i < 6; i++) { // fringe curls
        const x = -0.085 + i * 0.034;
        H.add(mesh(geo, hair, { pos: [x, 0.245 - Math.abs(x) * 0.25 + (i % 2) * 0.012, 0.085 - Math.abs(x) * 0.25], scale: 0.03 + (i % 3) * 0.004 }));
      }
      H.add(mesh(ell(0.133, 0.13, 0.13), hair, { pos: [0, 0.165, -0.025] }));
    } else if (o.hair === 'receding') {
      H.add(mesh(new THREE.SphereGeometry(1, 40, 24, Math.PI / 2 + 1.15, Math.PI * 2 - 2.3, 0.62, 1.35).scale(0.134, 0.152, 0.137), hair, { pos: [0, 0.13, -0.003] }));
      for (const s of [-1, 1]) H.add(mesh(ell(0.025, 0.06, 0.05), hair, { pos: [s * 0.122, 0.13, 0.02] }));
    } else if (o.hair === 'bun') {
      H.add(mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(0.138, 0.158, 0.142), hair, { pos: [0, 0.14, -0.005], rot: [-0.32, 0, 0] }));
      H.add(mesh(ell(0.135, 0.15, 0.1), hair, { pos: [0, 0.12, -0.05] }));
      const geo = new THREE.IcosahedronGeometry(1, 2), R = rand(4);
      for (let i = 0; i < 14; i++) H.add(mesh(geo, hair, { pos: [(R() - 0.5) * 0.12, 0.3 + R() * 0.07, -0.08 + (R() - 0.5) * 0.08], scale: 0.035 + R() * 0.015 }));
      for (const s of [-1, 1]) H.add(mesh(ell(0.03, 0.09, 0.04), hair, { pos: [s * 0.12, 0.08, 0.03], rot: [0, 0, s * 0.1] }));
    }
  }

  buildBeard(H, m) {
    const u = new THREE.TorusGeometry(0.082, 0.03, 12, 32, Math.PI * 1.05).rotateZ(Math.PI * 0.975).scale(1, 0.9, 0.7);
    H.add(mesh(u, m, { pos: [0, 0.075, 0.072], rot: [0.25, 0, 0] }));
    H.add(mesh(ell(0.045, 0.03, 0.03), m, { pos: [0, -0.005, 0.1] }));
    for (const s of [-1, 1]) {
      H.add(mesh(ell(0.022, 0.05, 0.035), m, { pos: [s * 0.112, 0.1, 0.035] }));
      H.add(mesh(capsule(0.009, 0.03, 4, 10).rotateZ(Math.PI / 2 + s * 0.35), m, { pos: [s * 0.02, 0.071, 0.128], cast: false }));
    }
  }

  buildGlasses(H, m) {
    const g = group(H, [0, 0.135, 0.138]);
    for (const s of [-1, 1]) {
      const rim = mesh(new THREE.TorusGeometry(0.036, 0.0045, 8, 32).scale(1.18, 0.82, 1), m, { pos: [s * 0.05, 0, s * 0], rot: [0, s * 0.18, 0], cast: false }); g.add(rim);
      g.add(mesh(new THREE.BoxGeometry(0.005, 0.006, 0.13), m, { pos: [s * 0.1, 0.006, -0.07], rot: [0, -s * 0.12, 0], cast: false }));
    }
    g.add(mesh(capsule(0.004, 0.022, 4, 8).rotateZ(Math.PI / 2), m, { pos: [0, 0.008, 0.003], cast: false }));
    const lens = new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, depthWrite: false });
    for (const s of [-1, 1]) g.add(mesh(new THREE.CircleGeometry(0.036, 24).scale(1.18, 0.82, 1), lens, { pos: [s * 0.05, 0, 0], rot: [0, s * 0.18, 0], cast: false }));
  }

  armPose(i, [x, y, z, elbow, wristX = 0, wristZ = 0]) {
    const a = this.arms[i];
    a.sh.rotation.set(x, y * a.s, z * a.s, 'XYZ');
    a.el.rotation.set(-elbow, 0, 0);
    a.wr.rotation.set(wristX, 0, wristZ * a.s);
  }

  // aim upper arm along `u` (spine-local, x mirrored per side), forearm bends toward `w`
  armAim(i, u, w, elbow) {
    const a = this.arms[i], s = a.s;
    const y = new THREE.Vector3(-u[0] * s, -u[1], -u[2]).normalize();
    const z = new THREE.Vector3(w[0] * s, w[1], w[2]); z.addScaledVector(y, -z.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    a.sh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    a.el.rotation.set(-elbow, 0, 0); a.wr.rotation.set(0, 0, 0);
  }

  headWorld(v = new THREE.Vector3(0, 0.13, 0.04)) { return this.head.localToWorld(v.clone()); }
  topWorld() { return this.head.localToWorld(new THREE.Vector3(0, 0.36, 0)); }
  handWorld(i) { return this.arms[i].hold.getWorldPosition(new THREE.Vector3()); }

  update(p, time) {
    const sit = p.sit ?? 0;
    this.pelvis.position.y = lerp(0.86, 0.5, sit) + (p.bounce || 0);
    this.pelvis.rotation.set(p.hipPitch || 0, 0, 0);
    const breathe = Math.sin(time * 2.1 + (this.o.phase || 0)) * 0.012;
    this.spine.rotation.set((p.lean || 0) + breathe * 0.3, p.spineYaw || 0, p.spineRoll || 0);
    this.spine.position.y = 0.04 + (p.slump || 0) * -0.03;
    this.neck.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0, 'YXZ');
    const walk = p.walk || 0, ph = p.walkPhase || 0;
    this.legs.forEach((l) => {
      const sw = Math.sin(ph + (l.s > 0 ? Math.PI : 0)) * 0.5 * walk;
      const hang = p.dangle ? Math.sin(time * 1.6 + l.s) * 0.12 : 0;
      l.hp.rotation.set(lerp(0, -Math.PI / 2 + 0.05, sit) + sw + (p.legSwing || 0) * l.s, 0, l.s * 0.03);
      l.kn.rotation.set(lerp(0, Math.PI / 2 - 0.05, sit) + Math.max(0, -sw) * 1.2 * walk + hang, 0, 0);
      l.an.rotation.set(0, 0, 0);
    });
    this.armPose(0, p.armL || [0.05, 0, 0.12, 0.25]);
    this.armPose(1, p.armR || [0.05, 0, 0.12, 0.25]);
    if (p.aimL) this.armAim(0, ...p.aimL);
    if (p.aimR) this.armAim(1, ...p.aimR);
    if (walk) { this.arms.forEach((a) => { a.sh.rotation.x += Math.sin(ph + (a.s > 0 ? 0 : Math.PI)) * 0.35 * walk; }); }
    const blink = p.blink || 0;
    for (const e of this.eyes) {
      const lid = clamp(Math.max(p.lid ?? 0.1, blink));
      e.up.rotation.x = lerp(-0.95, 1.55, lid);
      e.lo.rotation.x = lerp(0.6, -0.1, Math.max(p.squint || 0, blink * 0.6));
      e.look.rotation.set(-(p.lookY || 0) * 0.45, (p.lookX || 0) * 0.45, 0);
      e.eg.scale.setScalar(1 + (this.o.eyeScale || 0) + (p.eyeBig || 0) * 0.3);
      e.pupil.scale.setScalar(Math.max(0.35, 1 + (p.pupil || 0)));
      e.bg.position.y = 0.183 + (p.brow || 0) * 0.025;
      e.bg.rotation.z = e.s * (p.browAngle || 0) * 0.45;
    }
    const open = clamp(p.mouth || 0), rnd = clamp(p.mouthRound || 0);
    const w = lerp(1, 0.62, rnd) * (1 + (p.smile || 0) * 0.3);
    this.mouthDark.scale.set(w, 0.25 + open * 2.4 + rnd * 0.6, 1);
    this.lipU.position.y = 0.006 + open * 0.012 + (p.smile || 0) * 0.002;
    this.lipL.position.y = -0.006 - open * 0.028 - rnd * 0.008;
    this.lipU.scale.set(w, 1, 1); this.lipL.scale.set(w * 0.95, 1, 1);
    this.lipL.rotation.z = 0; this.lipU.rotation.z = 0;
    this.teeth.visible = open > 0.15 || (p.smile || 0) > 0.6;
    this.teeth.position.y = 0.004 + open * 0.008;
    this.teeth.scale.set(w, 1, 1);
    this.mouth.rotation.z = p.mouthTilt || 0;
    const tear = p.tear || 0;
    this.tearM.opacity = tear * 0.6;
    this.tears.forEach((m, i) => { m.visible = tear > 0.01; m.position.y = 0.105 - ((p.tearFall || 0) + i * 0.3) % 1 * 0.05 * tear; });
    if (this.phonesHead) { this.phonesHead.visible = !!p.phonesOn; this.phonesNeck.visible = !p.phonesOn; }
  }
}

// Character presets -------------------------------------------------------------------------
export function makeMilo() {
  const hood = fabricTex('#e0a526', { seed: 3, stripe: '#c48d1a' });
  return new Human({
    scale: 0.9, phase: 0.7, skin: '#b9825c', skinDark: '#a06c48', hairColor: '#2e1b12', hair: 'curly', eyeColor: '#7a6a2c', eyeScale: 0.12,
    topTex: hood, hoodie: '#d69b20', cuff: '#c48d1a', pants: '#3a3d45', shoe: '#f6f6f2', shoeSole: '#dcdcd6', laces: '#7ed957',
    freckles: true, headphones: true, lip: '#9a5a4a', browColor: '#2b1810',
  });
}
export function makeDad() {
  const flannel = fabricTex('#4f79b8', { seed: 8, plaid: ['#2c4f86', '#d7e3f5'], panel: { color: '#8d9096', width: 0.11 }, text: { color: '#f2f2f2', size: 13, lines: ['DAD JOKE', 'LOADING...'] } });
  const sleeves = fabricTex('#4f79b8', { seed: 9, plaid: ['#2c4f86', '#d7e3f5'] });
  return new Human({
    scale: 1.06, phase: 2.1, skin: '#b07a55', skinDark: '#946140', hairColor: '#4d4743', hair: 'receding', eyeColor: '#4a2c18', belly: 1,
    topTex: flannel, sleeveTex: sleeves, bellyTex: fabricTex('#4f79b8', { seed: 8, plaid: ['#2c4f86', '#d7e3f5'], panel: { color: '#8d9096', width: 0.11 } }), collar: '#3f6aa8', pants: '#3b4a5e', shoe: '#7a5236', beard: '#5d5650', glasses: '#6b3b1f', lip: '#8f5146',
    browColor: '#3a3430', browThick: 0.009,
  });
}
export function makeMom() {
  const card = fabricTex('#8fb39a', { seed: 12, panel: { color: '#f3eee4', width: 0.09 } });
  return new Human({
    scale: 0.97, phase: 4.2, skin: '#a8714e', skinDark: '#8f5d3d', hairColor: '#1d1411', hair: 'bun', eyeColor: '#3b2617', lashes: true, earrings: true,
    topTex: card, sleeveTex: fabricTex('#8fb39a', { seed: 13 }), collar: '#7fa38a', pants: '#4a3f5c', shoe: '#c9a27a', lip: '#b8545a',
  });
}
