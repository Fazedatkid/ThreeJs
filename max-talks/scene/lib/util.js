import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
export const easeIn = (t) => { t = clamp(t); return t * t * t; };
export const easeOutBack = (t) => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
// damped spring overshoot 0->1
export const spring = (t, k = 9, d = 5) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(k * t));
export const range = (t, a, b) => clamp((t - a) / (b - a));
export const pulse = (t, a, b, fade = 0.15) => smooth(range(t, a, a + fade)) * (1 - smooth(range(t, b - fade, b)));

// keyframe track: keys = [[time, value(number|array), ease?], ...]; ease applies to the segment ending at that key
const EASES = { s: smooth, io: easeInOut, o: easeOut, i: easeIn, l: (x) => clamp(x), b: easeOutBack, step: (x) => (x >= 1 ? 1 : 0) };
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
      const u = (EASES[e || 's'])((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((x, j) => lerp(x, v1[j], u));
      return lerp(v0, v1, u);
    }
  }
  return keys[keys.length - 1][1];
}

// smooth deterministic 1D noise
function h1(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
export function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h1(i), h1(i + 1), u) * 2 - 1; }
export function rand(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// geometry helpers (bake scale into geometry so fur shells stay uniform)
export function ell(rx, ry, rz, ws = 40, hs = 28) { return new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz); }
export function capsule(r, len, cs = 8, rs = 20) { return new THREE.CapsuleGeometry(r, len, cs, rs); }

export function std(color, rough = 0.6, metal = 0, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }); }
export function mesh(geo, mat, { pos, rot, scale, cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) (typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale));
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}
export function group(parent, pos, rot) { const g = new THREE.Group(); if (pos) g.position.set(...pos); if (rot) g.rotation.set(...rot); if (parent) parent.add(g); return g; }

// orient an object (whose length runs along local +Y, centered) between points a and b
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
export function placeBetween(obj, a, b, baseLen) {
  _d.subVectors(b, a); const L = _d.length();
  obj.position.copy(a).addScaledVector(_d, 0.5);
  _q.setFromUnitVectors(_up, _d.normalize());
  obj.quaternion.copy(_q);
  obj.scale.set(1, L / baseLen, 1);
}

// canvas texture helper
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { canvas: c, ctx, draw };
  return t;
}
