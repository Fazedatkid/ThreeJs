import * as THREE from 'three';
import { ell, std, mesh, group, lerp, clamp } from './util.js';
import { furMesh } from './fur.js';

const GREY = new THREE.Color('#4b4752'), GREY_TIP = new THREE.Color('#8d8796');
const WHITE = new THREE.Color('#e9e4e0'), WHITE_TIP = new THREE.Color('#ffffff');

// A smug grey cat (non-speaking!) that sits on the bookshelf.
export class Cat {
  constructor() {
    this.root = new THREE.Group();
    const fur = (g, o = {}) => furMesh(g, { color: GREY, tip: GREY_TIP, len: 0.02, density: 320, shells: 14, ...o });
    this.body = group(this.root);
    const b = fur(ell(0.11, 0.15, 0.12)); b.position.set(0, 0.14, -0.02); this.body.add(b);
    const chest = furMesh(ell(0.065, 0.09, 0.05), { color: WHITE, tip: WHITE_TIP, len: 0.02, shells: 12 }); chest.position.set(0, 0.17, 0.08); this.body.add(chest);
    for (const s of [-1, 1]) {
      const l = fur(ell(0.035, 0.09, 0.04)); l.position.set(s * 0.05, 0.07, 0.08); this.body.add(l);
      const p = furMesh(ell(0.035, 0.022, 0.045), { color: WHITE, tip: WHITE_TIP, len: 0.01, shells: 8 }); p.position.set(s * 0.05, 0.015, 0.1); this.body.add(p);
      const hh = fur(ell(0.07, 0.07, 0.1)); hh.position.set(s * 0.08, 0.07, -0.04); this.body.add(hh);
    }
    // tail (curve)
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.03, -0.12), new THREE.Vector3(0.12, 0.02, -0.1), new THREE.Vector3(0.18, 0.02, 0.04), new THREE.Vector3(0.13, 0.03, 0.14)]);
    this.tail = group(this.root);
    const tf = fur(new THREE.TubeGeometry(curve, 30, 0.025, 12, false), { len: 0.018 }); this.tail.add(tf);

    this.head = group(this.root, [0, 0.31, 0.02]);
    const H = this.head;
    H.add(fur(ell(0.095, 0.08, 0.085)));
    const muz = furMesh(ell(0.045, 0.03, 0.035), { color: WHITE, tip: WHITE_TIP, len: 0.01, shells: 8 }); muz.position.set(0, -0.025, 0.07); H.add(muz);
    H.add(mesh(ell(0.012, 0.009, 0.008), std('#e88d9a', 0.4), { pos: [0, -0.005, 0.105] }));
    this.ears = [-1, 1].map((s) => {
      const g = group(H, [s * 0.05, 0.06, 0]);
      g.add(mesh(new THREE.ConeGeometry(0.035, 0.07, 4).scale(1, 1, 0.5), std(GREY, 0.8), { pos: [0, 0.03, 0] }));
      g.add(mesh(new THREE.ConeGeometry(0.022, 0.05, 4).scale(1, 1, 0.3), std('#e8a0ad', 0.6), { pos: [0, 0.025, 0.01] }));
      return g;
    });
    this.eyes = [-1, 1].map((s) => {
      const eg = group(H, [s * 0.038, 0.012, 0.07], [0, s * 0.25, 0]);
      eg.add(mesh(new THREE.SphereGeometry(0.021, 24, 16), std('#c9e24a', 0.15, 0, { emissive: '#7a8f12', emissiveIntensity: 0.6 }), { cast: false }));
      const pupil = mesh(new THREE.SphereGeometry(0.02, 16, 12).scale(0.22, 0.85, 0.3), std('#050505', 0.2), { pos: [0, 0, 0.017], cast: false }); eg.add(pupil);
      eg.add(mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' }), { pos: [0.006, 0.007, 0.02], cast: false }));
      const lid = mesh(new THREE.SphereGeometry(0.0235, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(GREY, 0.8), { cast: false }); eg.add(lid);
      return { eg, pupil, lid };
    });
    this.mouth = mesh(ell(0.025, 0.004, 0.01), std('#3a0d14', 0.6), { pos: [0, -0.04, 0.095], cast: false }); H.add(this.mouth);
    this.fangs = [-1, 1].map((s) => { const f = mesh(new THREE.ConeGeometry(0.004, 0.012, 6).rotateX(Math.PI), std('#fff', 0.3), { pos: [s * 0.012, -0.033, 0.103], cast: false }); H.add(f); return f; });
    const wm = new THREE.MeshBasicMaterial({ color: '#f4f4f4' });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const w = mesh(new THREE.CylinderGeometry(0.0012, 0.0006, 0.11, 4).rotateZ(Math.PI / 2), wm, { pos: [s * 0.075, -0.025 - i * 0.008, 0.075], rot: [0, -s * 0.3, s * (0.15 - i * 0.12)], cast: false });
      H.add(w);
    }
  }
  update(p, time) {
    const hiss = clamp(p.hiss || 0);
    this.body.scale.set(1, 1 + hiss * 0.08, 1);
    this.body.rotation.x = -hiss * 0.1;
    this.head.position.y = 0.31 + hiss * 0.02;
    this.head.rotation.set(p.headPitch || 0, (p.headYaw || 0) + Math.sin(time * 0.7) * 0.05, (p.headRoll || 0));
    this.ears.forEach((e, i) => e.rotation.set(-hiss * 0.9, 0, (i ? -1 : 1) * (0.1 + hiss * 1.0)));
    this.eyes.forEach((e) => {
      e.lid.rotation.x = lerp(-0.9, 1.55, Math.max(p.lid ?? 0.45, p.blink || 0)) * (1 - hiss) + hiss * -1.0;
      e.pupil.scale.set(1 + hiss * 1.6, 1, 1);
    });
    this.mouth.scale.set(1, 1 + hiss * 5, 1);
    this.fangs.forEach((f) => (f.visible = hiss > 0.3));
    this.tail.rotation.y = Math.sin(time * 1.5) * 0.15 + hiss * 0.4;
  }
}
