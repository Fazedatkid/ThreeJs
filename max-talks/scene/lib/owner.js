import * as THREE from 'three';
import { ell, capsule, std, mesh, group, lerp, clamp, canvasTex } from './util.js';
import { furMesh } from './fur.js';

const SKIN = '#d99a72', SKIN_D = '#c4805a', HAIR = '#4a2116', LIP = '#b84f55';

function knitTex(base, stripe) {
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
      c.fillStyle = `rgba(255,255,255,${0.04 + ((x * 7 + y * 13) % 5) * 0.012})`;
      c.beginPath(); c.ellipse(x + 2, y + 4, 2.2, 3.8, 0.4, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.06)';
      c.beginPath(); c.ellipse(x + 6, y + 4, 2.2, 3.8, -0.4, 0, 7); c.fill();
    }
    c.fillStyle = stripe; c.fillRect(0, 150, w, 22); c.fillRect(0, 186, w, 10);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
}

export class Owner {
  constructor() {
    this.root = new THREE.Group();
    const skin = std(SKIN, 0.55), sweater = std('#ffffff', 0.9, 0, { map: knitTex('#1f8f8a', '#ffd166') });
    const sleeve = std('#ffffff', 0.9, 0, { map: knitTex('#1f8f8a', '#1f8f8a') });
    const pants = std('#2c3557', 0.85), hair = std(HAIR, 0.55);
    this.pelvis = group(this.root, [0, 0.86, 0]);
    this.pelvis.add(mesh(ell(0.17, 0.11, 0.13), pants, { pos: [0, 0.02, 0] }));
    this.spine = group(this.pelvis, [0, 0.04, 0]);
    this.spine.add(mesh(ell(0.19, 0.27, 0.145), sweater, { pos: [0, 0.25, 0] }));
    this.spine.add(mesh(new THREE.TorusGeometry(0.065, 0.03, 12, 28).rotateX(Math.PI / 2), sleeve, { pos: [0, 0.5, 0] }));
    this.spine.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16), skin, { pos: [0, 0.53, 0] }));
    this.neck = group(this.spine, [0, 0.55, 0]);
    this.head = group(this.neck);
    const H = this.head;
    H.add(mesh(ell(0.125, 0.145, 0.128), skin, { pos: [0, 0.13, 0] }));
    H.add(mesh(ell(0.1, 0.07, 0.1), skin, { pos: [0, 0.06, 0.02] })); // jaw/chin softness
    // hair
    H.add(mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(0.138, 0.158, 0.142), hair, { pos: [0, 0.14, -0.005], rot: [-0.32, 0, 0] }));
    H.add(mesh(ell(0.135, 0.15, 0.1), hair, { pos: [0, 0.12, -0.05] }));
    this.bun = mesh(new THREE.SphereGeometry(0.075, 24, 16), hair, { pos: [0, 0.31, -0.06] }); H.add(this.bun);
    H.add(mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20).rotateX(Math.PI / 2 - 0.3), std('#ff5d8f', 0.5), { pos: [0, 0.265, -0.045] }));
    for (const [x, y, z, r] of [[-0.07, 0.235, 0.085, 0.4], [0.0, 0.25, 0.1, -0.1], [0.075, 0.235, 0.08, -0.5]]) {
      H.add(mesh(ell(0.06, 0.03, 0.04), hair, { pos: [x, y, z], rot: [0.3, 0, r] }));
    }
    for (const s of [-1, 1]) H.add(mesh(ell(0.03, 0.09, 0.04), hair, { pos: [s * 0.12, 0.08, 0.03], rot: [0, 0, s * 0.1] }));
    // ears + earrings
    for (const s of [-1, 1]) {
      H.add(mesh(ell(0.018, 0.03, 0.02), skin, { pos: [s * 0.124, 0.12, 0.0] }));
      H.add(mesh(new THREE.SphereGeometry(0.009, 12, 8), std('#ffcc33', 0.2, 1), { pos: [s * 0.128, 0.085, 0.005] }));
    }
    // nose
    H.add(mesh(ell(0.017, 0.02, 0.02), std(SKIN_D, 0.5), { pos: [0, 0.1, 0.13] }));
    // blush
    const blushM = new THREE.MeshBasicMaterial({ color: '#ff7a7a', transparent: true, opacity: 0.3, depthWrite: false });
    for (const s of [-1, 1]) H.add(mesh(new THREE.CircleGeometry(0.022, 20), blushM, { pos: [s * 0.075, 0.08, 0.112], rot: [0, s * 0.55, 0], cast: false }));
    // eyes
    this.eyes = [-1, 1].map((s) => {
      const eg = group(H, [s * 0.047, 0.135, 0.104], [0, s * 0.2, 0]);
      const look = group(eg);
      look.add(mesh(new THREE.SphereGeometry(0.028, 28, 20), std('#fbfaf7', 0.3), { cast: false }));
      look.add(mesh(new THREE.SphereGeometry(0.0195, 28, 20).scale(1, 1, 0.45), std('#3f7a4a', 0.3), { pos: [0, 0, 0.0195], cast: false }));
      const pupil = mesh(new THREE.SphereGeometry(0.0095, 20, 12).scale(1, 1, 0.4), std('#060404', 0.2), { pos: [0, 0, 0.0262], cast: false }); look.add(pupil);
      look.add(mesh(new THREE.SphereGeometry(0.0048, 10, 6), new THREE.MeshBasicMaterial({ color: '#fff' }), { pos: [0.005, 0.007, 0.0285], cast: false }));
      const up = mesh(new THREE.SphereGeometry(0.0335, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin, { cast: false }); eg.add(up);
      const lash = mesh(new THREE.TorusGeometry(0.0335, 0.0028, 6, 30, Math.PI).rotateX(Math.PI / 2), std('#1a0e0a', 0.6), { cast: false }); up.add(lash);
      const lo = mesh(new THREE.SphereGeometry(0.033, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, { cast: false }); eg.add(lo);
      const bg = group(H, [s * 0.05, 0.183, 0.112]);
      const brow = mesh(capsule(0.0075, 0.04, 4, 10), std('#2b130c', 0.7), { rot: [0, 0, Math.PI / 2 + s * 0.08], cast: false }); bg.add(brow);
      return { eg, look, up, lo, bg, s, pupil };
    });
    // mouth
    this.mouth = group(H, [0, 0.052, 0.118]);
    this.mouthDark = mesh(ell(0.03, 0.012, 0.014), std('#3d0f16', 0.7), { cast: false }); this.mouth.add(this.mouthDark);
    this.teeth = mesh(ell(0.022, 0.006, 0.01), std('#ffffff', 0.3), { pos: [0, 0.008, 0.004], cast: false }); this.mouth.add(this.teeth);
    this.lipU = mesh(capsule(0.0045, 0.04, 4, 10).rotateZ(Math.PI / 2), std(LIP, 0.45), { pos: [0, 0.012, 0.008], cast: false }); this.mouth.add(this.lipU);
    this.lipL = mesh(capsule(0.0055, 0.036, 4, 10).rotateZ(Math.PI / 2), std(LIP, 0.45), { pos: [0, -0.012, 0.008], cast: false }); this.mouth.add(this.lipL);

    // arms
    this.arms = [-1, 1].map((s) => {
      const sh = group(this.spine, [s * 0.2, 0.43, 0]);
      sh.add(mesh(capsule(0.055, 0.2), sleeve, { pos: [0, -0.13, 0] }));
      const el = group(sh, [0, -0.27, 0]);
      el.add(mesh(capsule(0.047, 0.18), sleeve, { pos: [0, -0.11, 0] }));
      el.add(mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20).rotateX(Math.PI / 2), std('#ffd166', 0.8), { pos: [0, -0.22, 0] }));
      const wr = group(el, [0, -0.25, 0]);
      wr.add(mesh(ell(0.038, 0.05, 0.024), skin, { pos: [0, -0.035, 0] }));
      wr.add(mesh(capsule(0.012, 0.03).rotateZ(-s * 0.6), skin, { pos: [-s * 0.03, -0.02, 0.01] }));
      return { sh, el, wr, s };
    });
    // legs
    this.legs = [-1, 1].map((s) => {
      const hp = group(this.pelvis, [s * 0.09, -0.02, 0]);
      hp.add(mesh(capsule(0.078, 0.3), pants, { pos: [0, -0.2, 0] }));
      const kn = group(hp, [0, -0.42, 0]);
      kn.add(mesh(capsule(0.062, 0.3), pants, { pos: [0, -0.2, 0] }));
      const an = group(kn, [0, -0.41, 0]);
      const sl = furMesh(ell(0.062, 0.045, 0.12), { color: '#ff8fb8', tip: '#ffd6e6', len: 0.02, density: 300, shells: 10 });
      sl.position.set(0, -0.015, 0.05); an.add(sl);
      return { hp, kn, an, s };
    });

    // props: mug + kibble bag (attached to right hand)
    const R = this.arms[1].wr;
    this.mug = group(R, [0.0, -0.06, 0.06]);
    this.mug.add(mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), std('#ffcf56', 0.4)));
    this.mug.add(mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 16), std('#ffcf56', 0.4), { pos: [0.05, 0, 0] }));
    this.mug.add(mesh(new THREE.CircleGeometry(0.04, 20).rotateX(-Math.PI / 2), std('#4a2a17', 0.2), { pos: [0, 0.045, 0] }));
    this.bag = group(R, [0, -0.02, 0.09], [0.2, 0, 0]);
    const label = canvasTex(256, 384, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff6b3d'); g.addColorStop(1, '#d6336c');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(w / 2, h * 0.55, 80, 0, 7); c.fill();
      c.fillStyle = '#8b4a1c'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(w / 2 - 40 + (i % 3) * 40, h * 0.55 - 40 + Math.floor(i / 3) * 40, 14, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 44px Fredoka'; c.fillText('PREMIUM', w / 2, 70); c.fillText('KIBBLE', w / 2, 118);
      c.font = '600 26px Fredoka'; c.fillText('★ ORIGINAL ★', w / 2, h - 30);
    });
    const bagM = [std('#d6336c', 0.6), std('#d6336c', 0.6), std('#c92a5f', 0.6), std('#c92a5f', 0.6), std('#fff', 0.5, 0, { map: label }), std('#d6336c', 0.6)];
    this.bag.add(mesh(new THREE.BoxGeometry(0.2, 0.3, 0.08, 4, 4, 2), bagM, { pos: [0, 0.02, 0], rot: [0, Math.PI, Math.PI] }));
    this.bag.visible = false;
  }

  armPose(i, [x, y, z, elbow, wristX = 0, wristZ = 0]) {
    const a = this.arms[i];
    a.sh.rotation.set(x, y, z * a.s, 'XYZ');
    a.el.rotation.set(-elbow, 0, 0);
    a.wr.rotation.set(wristX, 0, wristZ * a.s);
  }

  update(p, time) {
    const sit = p.sit ?? 1;
    this.pelvis.position.y = lerp(0.86, 0.52, sit) + (p.bounce || 0);
    this.pelvis.rotation.set(0, 0, 0);
    const breathe = Math.sin(time * 2.1) * 0.012;
    this.spine.rotation.set((p.lean || 0) + breathe * 0.3, p.spineYaw || 0, p.spineRoll || 0);
    this.spine.position.y = 0.04 + (p.slump || 0) * -0.03;
    this.neck.rotation.set((p.headPitch || 0), p.headYaw || 0, p.headRoll || 0, 'YXZ');
    this.legs.forEach((l) => {
      l.hp.rotation.set(lerp(0, -Math.PI / 2 + 0.05, sit) + (p.legSwing || 0) * l.s, 0, l.s * 0.03);
      l.kn.rotation.set(lerp(0, Math.PI / 2 - 0.05, sit), 0, 0);
      l.an.rotation.set(0, 0, 0);
    });
    this.armPose(0, p.armL || [0.1, 0, 0.12, 0.3]);
    this.armPose(1, p.armR || [0.1, 0, 0.12, 0.3]);
    // face
    const blink = p.blink || 0;
    for (const e of this.eyes) {
      const lid = clamp(Math.max(p.lid ?? 0.1, blink));
      e.up.rotation.x = lerp(-0.95, 1.55, lid);
      e.lo.rotation.x = lerp(0.6, -0.1, Math.max(p.squint || 0, blink * 0.6));
      e.look.rotation.set(-(p.lookY || 0) * 0.45, (p.lookX || 0) * 0.45, 0);
      e.eg.scale.setScalar(1 + (p.eyeBig || 0) * 0.3);
      e.pupil.scale.setScalar(Math.max(0.35, 1 + (p.pupil || 0)));
      e.bg.position.y = 0.183 + (p.brow || 0) * 0.025;
      e.bg.rotation.z = e.s * (p.browAngle || 0) * 0.45;
    }
    const open = clamp(p.mouth || 0), rnd = clamp(p.mouthRound || 0);
    const w = lerp(1, 0.62, rnd) * (1 + (p.smile || 0) * 0.25);
    this.mouthDark.scale.set(w, 0.25 + open * 2.4 + rnd * 0.6, 1);
    this.lipU.position.y = 0.006 + open * 0.012;
    this.lipL.position.y = -0.006 - open * 0.028 - rnd * 0.008;
    this.lipU.scale.set(w, 1, 1); this.lipL.scale.set(w * 0.95, 1, 1);
    this.teeth.visible = open > 0.15;
    this.teeth.position.y = 0.004 + open * 0.008;
    this.teeth.scale.set(w, 1, 1);
    this.mouth.rotation.z = p.mouthTilt || 0;
    this.mug.visible = !!p.mug;
    this.bag.visible = !!p.bag;
  }
}
