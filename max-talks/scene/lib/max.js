import * as THREE from 'three';
import { furMesh } from './fur.js';
import { ell, capsule, std, mesh, group, placeBetween, lerp, clamp } from './util.js';

const GOLD = new THREE.Color('#d8963c'), GOLD_TIP = new THREE.Color('#f7d595');
const CREAM = new THREE.Color('#efc98a'), CREAM_TIP = new THREE.Color('#fff1d2');
const EAR = new THREE.Color('#b8722a'), EAR_TIP = new THREE.Color('#e7ac5c');

// Max the golden retriever. Root sits on the floor facing +Z.
export class Max {
  constructor() {
    this.root = new THREE.Group();
    const R = this.root;
    const fur = (geo, o = {}) => furMesh(geo, { color: GOLD, tip: GOLD_TIP, gravity: 1.1, ...o });
    const furC = (geo, o = {}) => furMesh(geo, { color: CREAM, tip: CREAM_TIP, gravity: 1.0, ...o });

    // torso pivot (hip) + torso along local +Y
    this.hip = group(R);
    this.torso = fur(ell(0.165, 0.29, 0.17), { len: 0.026 });
    this.torso.position.y = 0.22; this.hip.add(this.torso);
    this.chest = furC(ell(0.13, 0.17, 0.11), { len: 0.03, gravity: 0.6 });
    this.chest.position.set(0, 0.34, 0.085); this.hip.add(this.chest);
    // collar
    this.collar = mesh(new THREE.TorusGeometry(0.115, 0.018, 12, 40), std('#e2324a', 0.45), { pos: [0, 0.43, 0.02], rot: [Math.PI / 2 + 0.25, 0, 0] });
    this.hip.add(this.collar);
    this.tag = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.006, 24), std('#ffd34a', 0.25, 0.9), { pos: [0, 0.37, 0.14], rot: [Math.PI / 2 - 0.2, 0, 0] });
    this.hip.add(this.tag);

    // haunches
    this.haunch = [-1, 1].map((s) => { const h = fur(ell(0.105, 0.13, 0.165), { len: 0.026 }); R.add(h); return h; });
    // legs (unit length 1 along Y, scaled to fit)
    const legGeo = capsule(0.045, 0.9, 6, 16).scale(1, 1 / 1.0, 1);
    this.legs = [0, 1, 2, 3].map((i) => { const l = fur(legGeo, { len: 0.016, density: 320 }); R.add(l); return l; });
    const pawGeo = ell(0.055, 0.035, 0.07);
    this.paws = [0, 1, 2, 3].map(() => { const p = furC(pawGeo, { len: 0.012, density: 360 }); R.add(p); return p; });

    // tail: chain of segments
    this.tailRoot = group(R);
    this.tail = [];
    let parent = this.tailRoot;
    for (let i = 0; i < 6; i++) {
      const seg = group(parent, i === 0 ? [0, 0, 0] : [0, 0.075, 0]);
      const t = i / 5;
      const f = furMesh(ell(0.045 - t * 0.01, 0.06, 0.045 - t * 0.01), { color: GOLD.clone().lerp(CREAM, t * 0.6), tip: CREAM_TIP, len: 0.03 + t * 0.02, gravity: 0.8 });
      f.position.y = 0.04; seg.add(f);
      this.tail.push(seg); parent = seg;
    }

    // ---- head
    this.neck = group(R);
    this.head = group(this.neck);
    const H = this.head;
    const cran = fur(ell(0.165, 0.155, 0.16), { len: 0.018, density: 320, gravity: 0.8 }); cran.position.set(0, 0.12, 0); H.add(cran);
    // cheeks
    for (const s of [-1, 1]) { const c = fur(ell(0.085, 0.075, 0.08), { len: 0.02, density: 320 }); c.position.set(s * 0.085, 0.06, 0.06); H.add(c); }
    // forehead stripe
    const fh = fur(ell(0.07, 0.06, 0.07), { len: 0.014, density: 320 }); fh.position.set(0, 0.2, 0.08); H.add(fh);
    // muzzle
    this.muzzle = furC(ell(0.085, 0.062, 0.105), { len: 0.008, density: 420, gravity: 0.4 }); this.muzzle.position.set(0, 0.085, 0.155); H.add(this.muzzle);
    // nose
    this.nose = mesh(ell(0.038, 0.027, 0.028), std('#1b1311', 0.22), { pos: [0, 0.122, 0.255] }); H.add(this.nose);
    H.add(mesh(ell(0.012, 0.006, 0.01), std('#ffffff', 0.2, 0, { emissive: '#ffffff', emissiveIntensity: 0.25 }), { pos: [-0.012, 0.137, 0.27], cast: false }));
    // mouth interior + jaw
    this.mouthIn = mesh(ell(0.062, 0.035, 0.085), std('#5a1420', 0.7), { pos: [0, 0.05, 0.15], cast: false }); H.add(this.mouthIn);
    this.jaw = group(H, [0, 0.055, 0.07]);
    const jawFur = furC(ell(0.068, 0.028, 0.095), { len: 0.012, density: 360 }); jawFur.position.set(0, -0.022, 0.085); this.jaw.add(jawFur);
    this.tongue = mesh(ell(0.042, 0.014, 0.075), std('#f07a8a', 0.35), { pos: [0, -0.002, 0.1], cast: false }); this.jaw.add(this.tongue);
    // eyes
    this.eyes = [-1, 1].map((s) => {
      const eg = group(H, [s * 0.072, 0.155, 0.128], [0, s * 0.28, 0]);
      const look = group(eg);
      look.add(mesh(new THREE.SphereGeometry(0.043, 32, 24), std('#fbfaf6', 0.25), { cast: false }));
      const iris = mesh(new THREE.SphereGeometry(0.031, 32, 24).scale(1, 1, 0.45), std('#5a3416', 0.3), { pos: [0, 0, 0.03], cast: false }); look.add(iris);
      const ring = mesh(new THREE.SphereGeometry(0.0315, 32, 24).scale(1, 1, 0.4), std('#2a1408', 0.4), { pos: [0, 0, 0.0285], cast: false }); look.add(ring);
      const pupil = mesh(new THREE.SphereGeometry(0.017, 24, 16).scale(1, 1, 0.4), std('#050302', 0.2), { pos: [0, 0, 0.0385], cast: false }); look.add(pupil);
      const hl = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      look.add(mesh(new THREE.SphereGeometry(0.008, 12, 8), hl, { pos: [s * -0.008 + 0.006, 0.012, 0.039], cast: false }));
      look.add(mesh(new THREE.SphereGeometry(0.0038, 10, 6), hl, { pos: [-0.009, -0.01, 0.0405], cast: false }));
      // eyelids (upper + lower) as domes
      const up = furMesh(new THREE.SphereGeometry(0.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), { color: GOLD, tip: GOLD_TIP, len: 0.007, density: 420, shells: 6, gravity: 0.2, cast: false }); eg.add(up);
      const lo = furMesh(new THREE.SphereGeometry(0.0495, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { color: CREAM, tip: CREAM_TIP, len: 0.006, density: 420, shells: 6, gravity: 0.2, cast: false }); eg.add(lo);
      // brow
      const brow = mesh(capsule(0.011, 0.045, 4, 10), std('#8a4f1c', 0.8), { cast: false });
      brow.rotation.z = Math.PI / 2; const bg = group(H, [s * 0.075, 0.215, 0.15]); bg.add(brow);
      return { eg, look, up, lo, bg, s, pupil };
    });
    // ears
    this.ears = [-1, 1].map((s) => {
      const p = group(H, [s * 0.135, 0.215, -0.01]);
      const e = furMesh(ell(0.035, 0.125, 0.085), { color: EAR, tip: EAR_TIP, len: 0.02, gravity: 1.6, density: 300 });
      e.position.set(s * 0.025, -0.11, 0.0); p.add(e);
      return p;
    });
    // sunglasses
    this.shades = group(H, [0, 0.165, 0.2]);
    const black = std('#0c0c10', 0.15, 0.4);
    for (const s of [-1, 1]) {
      const lens = mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.012, 32).rotateX(Math.PI / 2).scale(1.15, 0.85, 1), black, { pos: [s * 0.07, 0, 0], rot: [0, s * 0.22, 0] });
      this.shades.add(lens);
      this.shades.add(mesh(new THREE.BoxGeometry(0.11, 0.008, 0.01), black, { pos: [s * 0.15, 0.015, -0.07], rot: [0, s * 1.3, 0] }));
      const glint = mesh(new THREE.PlaneGeometry(0.018, 0.05), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }), { pos: [s * 0.07 - 0.02, 0.005, 0.0075], rot: [0, s * 0.22, -0.6], cast: false });
      this.shades.add(glint);
    }
    this.shades.add(mesh(new THREE.BoxGeometry(0.04, 0.01, 0.01), black, { pos: [0, 0.012, 0.004] }));
    this.shades.visible = false;
    this.shadesBase = this.shades.position.clone();

    this.slipperHat = null; // optional prop on head
    this._tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() };
  }

  // p: pose params
  update(p, time) {
    const stand = p.stand || 0;
    const theta = lerp(0.32, 1.42, stand) + (p.lean || 0);
    const breathe = Math.sin(time * 2.4) * 0.006;
    const hipY = lerp(0.19, 0.42, stand) + (p.bounce || 0);
    const hipZ = lerp(-0.13, -0.2, stand);
    this.hip.position.set(0, hipY, hipZ);
    this.hip.rotation.set(theta, 0, p.bodyRoll || 0);
    this.torso.scale.set(1 + breathe, 1, 1 + breathe);
    const d = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta));
    const hip = this.hip.position.clone();
    const at = (k, side = 0, fwd = 0) => hip.clone().addScaledVector(d, k).add(new THREE.Vector3(side, 0, 0)).add(new THREE.Vector3(0, -Math.sin(theta), Math.cos(theta)).multiplyScalar(fwd));

    // neck/head
    const neck = at(0.43, 0, 0.03);
    this.neck.position.copy(neck);
    this.head.position.set(0, lerp(0.06, 0.08, stand), lerp(0.02, 0.1, stand));
    this.head.rotation.set((p.headPitch || 0) + lerp(0, 0.1, stand), p.headYaw || 0, p.headRoll || 0, 'YXZ');

    // legs
    const walk = p.walk || 0, ph = p.walkPhase || 0;
    const shoulderY = 0.38;
    const frontTop = [-1, 1].map((s) => at(shoulderY, s * 0.085, 0.02));
    const raise = p.pawRaise || 0; // right front paw raise 0..1
    const frontPaw = [-1, 1].map((s, i) => {
      const sw = Math.sin(ph + (i ? Math.PI : 0)) * walk;
      const lift = Math.max(0, Math.cos(ph + (i ? Math.PI : 0))) * walk;
      const v = new THREE.Vector3(s * 0.09, 0.035 + lift * 0.06, lerp(0.1, 0.24, stand) + sw * 0.11);
      if (s === 1 && raise > 0) v.lerp(new THREE.Vector3(0.16, 0.42, 0.24), raise);
      if (s === -1 && p.pawRaiseL) v.lerp(new THREE.Vector3(-0.16, 0.42, 0.24), p.pawRaiseL);
      return v;
    });
    const hindTop = [-1, 1].map((s) => new THREE.Vector3(s * lerp(0.13, 0.09, stand), lerp(0.16, 0.38, stand), lerp(-0.12, -0.24, stand)));
    const hindPaw = [-1, 1].map((s, i) => {
      const sw = Math.sin(ph + (i ? 0 : Math.PI)) * walk;
      const lift = Math.max(0, Math.cos(ph + (i ? 0 : Math.PI))) * walk;
      return new THREE.Vector3(s * lerp(0.14, 0.09, stand), 0.035 + lift * 0.06, lerp(0.06, -0.26, stand) + sw * 0.11);
    });
    const tops = [frontTop[0], frontTop[1], hindTop[0], hindTop[1]];
    const bots = [frontPaw[0], frontPaw[1], hindPaw[0], hindPaw[1]];
    for (let i = 0; i < 4; i++) {
      const legLen = 0.9 + 0.09; // capsule total length
      const top = tops[i].clone(), bot = bots[i].clone().add(new THREE.Vector3(0, 0.02, 0));
      if (i >= 2 && stand < 0.5) top.lerp(bot, 0.0); // hind legs in sitting are short and tucked
      placeBetween(this.legs[i], top, bot, legLen);
      const sc = this.legs[i].scale.y; this.legs[i].scale.set(1, sc, 1);
      this.paws[i].position.copy(bots[i]).add(new THREE.Vector3(0, 0, 0.03));
    }
    // hind legs while sitting look like folded haunches: shrink leg
    for (const i of [2, 3]) this.legs[i].visible = stand > 0.15;
    this.haunch.forEach((h, i) => {
      const s = i ? 1 : -1;
      h.position.set(s * lerp(0.12, 0.09, stand), lerp(0.14, 0.42, stand), lerp(-0.08, -0.22, stand));
      h.rotation.set(lerp(-0.2, 0.5, stand), 0, 0);
      h.scale.setScalar(lerp(1, 0.85, stand));
    });

    // tail
    const tr = at(-0.05, 0, -0.1);
    this.tailRoot.position.copy(tr);
    const wag = (p.wag ?? 0.4);
    const wagSpeed = p.wagSpeed || 9;
    this.tailRoot.rotation.set(lerp(-2.1, -0.9, stand), Math.sin(time * wagSpeed) * 0.6 * wag, 0);
    this.tail.forEach((s, i) => { if (i) { s.rotation.set(lerp(-0.25, -0.18, stand), 0, Math.sin(time * wagSpeed - i * 0.6) * 0.18 * wag); } });

    // ---- face
    const jaw = clamp((p.mouth || 0) * 0.42 + (p.jawExtra || 0), 0, 0.6);
    this.jaw.rotation.x = jaw;
    this.mouthIn.scale.set(1 - (p.mouthRound || 0) * 0.25, 1 + jaw * 1.5, 1);
    this.tongue.position.y = -0.002 + (p.tongueOut || 0) * 0.01;
    this.tongue.position.z = 0.1 + (p.tongueOut || 0) * 0.08;
    const blink = p.blink || 0;
    for (const e of this.eyes) {
      const lid = clamp(Math.max(p.lid ?? 0.12, blink) + (e.s < 0 ? p.lidL || 0 : p.lidR || 0));
      e.up.rotation.x = lerp(-0.85, 1.55, lid);
      e.lo.rotation.x = lerp(0.55, -0.15, Math.max(p.squint || 0, blink * 0.6));
      e.look.rotation.set(-(p.lookY || 0) * 0.45, (p.lookX || 0) * 0.45, 0);
      const es = 1 + (p.eyeBig || 0) * 0.25;
      e.eg.scale.setScalar(es);
      e.pupil.scale.setScalar(1 + (p.pupil || 0));
      const browUp = (p.brow || 0) + (e.s < 0 ? p.browL || 0 : p.browR || 0);
      e.bg.position.y = 0.215 + browUp * 0.035;
      e.bg.rotation.z = e.s * ((p.browAngle || 0) * 0.5 + (e.s < 0 ? p.browTiltL || 0 : p.browTiltR || 0));
    }
    // ears: floppy with secondary motion
    this.ears.forEach((e, i) => {
      const s = i ? 1 : -1;
      const flop = (p.earPerk || 0);
      e.rotation.set(-0.1 + Math.sin(time * 3 + i) * 0.03 + (p.earSwing || 0), 0, s * (0.15 + flop * 0.6) + (p.headRoll || 0) * -0.6);
    });
    // shades
    this.shades.visible = (p.shades || 0) > 0;
    if (this.shades.visible) {
      const drop = 1 - p.shades; // 0 => on face
      this.shades.position.copy(this.shadesBase).add(new THREE.Vector3(0, drop * 0.6 + (p.shadesLower || 0) * -0.04, (p.shadesLower || 0) * 0.02));
      this.shades.rotation.x = drop * 1.5;
    }
  }

  headWorld(v = new THREE.Vector3()) { return this.head.localToWorld(v.set(0, 0.13, 0.08)); }
}
