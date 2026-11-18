import * as THREE from 'three';

// Shell-textured fur: an opaque PBR base mesh plus N instanced shells pushed out along the
// normal. Shells use a lean custom shader (wrap-lambert lighting fed from the scene's lights,
// fake sheen/rim) so dozens of layers stay affordable on a software GPU. Strands come from a 3D
// cell pattern; they taper toward the tip, roots are darkened (fake AO) and tips lightened.
export const FUR_QUALITY = { shells: 18 };
const NPT = 8;
export const FUR_LIGHTS = {
  uHemiSky: { value: new THREE.Color() }, uHemiGround: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() },
  uDirDir: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uDirCol: { value: [new THREE.Color(), new THREE.Color()] },
  uPtPos: { value: Array.from({ length: NPT }, () => new THREE.Vector3()) }, uPtCol: { value: Array.from({ length: NPT }, () => new THREE.Color()) },
  uPtDist: { value: new Array(NPT).fill(0) }, uPtDecay: { value: new Array(NPT).fill(2) },
  uSpotDir: { value: new THREE.Vector3(0, -1, 0) }, uSpotCos: { value: new THREE.Vector2(0.9, 0.95) },
};
// copy current scene lights into the shared fur uniforms (call once per frame)
export function updateFurLights({ hemi, dirs, points, spot, env = 0 }) {
  const U = FUR_LIGHTS;
  U.uHemiSky.value.copy(hemi.color).multiplyScalar(hemi.intensity);
  U.uHemiGround.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity);
  U.uAmb.value.setRGB(env, env * 0.95, env * 0.9);
  dirs.forEach((l, i) => { U.uDirDir.value[i].subVectors(l.position, l.target.position).normalize(); U.uDirCol.value[i].copy(l.color).multiplyScalar(l.intensity); });
  const all = [...points, spot];
  for (let i = 0; i < NPT; i++) {
    const l = all[i];
    if (!l) { U.uPtCol.value[i].setRGB(0, 0, 0); continue; }
    l.getWorldPosition(U.uPtPos.value[i]);
    U.uPtCol.value[i].copy(l.color).multiplyScalar(l.intensity);
    U.uPtDist.value[i] = l.distance; U.uPtDecay.value[i] = l.decay;
  }
  if (spot) { U.uSpotDir.value.subVectors(spot.target.position, spot.position).normalize(); U.uSpotCos.value.set(Math.cos(spot.angle), Math.cos(spot.angle * (1 - spot.penumbra))); }
}

const LIGHT_UNIFORMS = `
  uniform vec3 uHemiSky; uniform vec3 uHemiGround; uniform vec3 uAmb;
  uniform vec3 uDirDir[2]; uniform vec3 uDirCol[2];
  uniform vec3 uPtPos[${NPT}]; uniform vec3 uPtCol[${NPT}]; uniform float uPtDist[${NPT}]; uniform float uPtDecay[${NPT}];
  uniform vec3 uSpotDir; uniform vec2 uSpotCos;`;
const VERT = /* glsl */`
  uniform float uLen; uniform float uGravity; uniform float uShells;
  ${LIGHT_UNIFORMS}
  varying float vSh; varying vec3 vP; varying vec3 vIrr; varying float vRim;
  #include <common>
  float wrapL(float d){ return max((d + 0.35) / 1.35, 0.0); }
  void main() {
    vSh = (float(gl_InstanceID) + 1.0) / uShells;
    vP = position;
    vec3 tr = position + normal * (uLen * vSh);
    vec4 wp = modelMatrix * vec4(tr, 1.0);
    wp.y -= uGravity * uLen * vSh * vSh;
    vec3 n = normalize(mat3(modelMatrix) * normal);
    // per-vertex lighting (shells sit on smooth, densely tessellated shapes)
    vec3 irr = mix(uHemiGround, uHemiSky, 0.5 * n.y + 0.5) + uAmb;
    for (int i = 0; i < 2; i++) irr += uDirCol[i] * wrapL(dot(n, uDirDir[i]));
    for (int i = 0; i < ${NPT}; i++) {
      vec3 L = uPtPos[i] - wp.xyz; float dist = length(L); L /= dist;
      float fall = 1.0 / max(pow(dist, uPtDecay[i]), 0.01);
      if (uPtDist[i] > 0.0) fall *= pow2(saturate(1.0 - pow4(dist / uPtDist[i])));
      if (i == ${NPT - 1}) fall *= smoothstep(uSpotCos.x, uSpotCos.y, dot(-L, uSpotDir));
      irr += uPtCol[i] * fall * wrapL(dot(n, L));
    }
    vIrr = irr * RECIPROCAL_PI;
    vec3 V = normalize(cameraPosition - wp.xyz);
    vRim = pow(1.0 - abs(dot(n, V)), 2.5);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FRAG = /* glsl */`
  uniform vec3 uColor; uniform vec3 uTip; uniform float uDensity; uniform float uRootDark; uniform float uThick; uniform float uClump;
  varying float vSh; varying vec3 vP; varying vec3 vIrr; varying float vRim;
  #include <common>
  vec3 fhash3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
  void main() {
    vec3 p = vP * uDensity;
    vec3 ci = floor(p); vec3 fp = fract(p);
    vec3 hh = fhash3(ci);
    vec3 c = 0.5 + (hh - 0.5) * 0.45;
    float d = length(fp - c);
    float clumpN = fhash3(floor(vP * uDensity * 0.15)).x;
    float strandLen = mix(0.6, 1.0, hh.z) * mix(1.0, 0.7 + 0.6 * clumpN, uClump);
    float s = vSh / strandLen;
    if (s > 1.0) discard;
    if (d > uThick * (1.0 - s * 0.55) * 0.72) discard;
    float ao = mix(uRootDark, 1.0, pow(vSh, 0.6));
    vec3 albedo = mix(uColor, uTip, smoothstep(0.3, 1.0, s)) * ao * (0.86 + 0.28 * hh.y) * mix(0.93, 1.07, clumpN);
    vec3 col = albedo * vIrr * (1.0 + vRim * 0.35 * s);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function furMesh(geometry, opts = {}) {
  const {
    color = new THREE.Color('#d9a04a'), tip = new THREE.Color('#f6d79a'), len = 0.024, density = 260,
    gravity = 0.45, rootDark = 0.45, thick = 0.9, shells = FUR_QUALITY.shells, cast = true, clump = 0.6,
  } = opts;
  const g = new THREE.Group();
  const baseCol = new THREE.Color(color).multiplyScalar(0.55 + rootDark * 0.3);
  const base = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: baseCol, roughness: 0.95 }));
  base.castShadow = cast; base.receiveShadow = true;
  g.add(base);
  const n = Math.max(1, Math.round(shells * FUR_QUALITY.shells / 18));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      ...FUR_LIGHTS,
      uColor: { value: new THREE.Color(color) }, uTip: { value: new THREE.Color(tip) }, uLen: { value: len }, uDensity: { value: density },
      uGravity: { value: gravity }, uRootDark: { value: rootDark }, uThick: { value: thick }, uShells: { value: n }, uClump: { value: clump },
    },
  });
  const shellsMesh = new THREE.InstancedMesh(geometry, mat, n);
  const I = new THREE.Matrix4();
  for (let i = 0; i < n; i++) shellsMesh.setMatrixAt(i, I);
  shellsMesh.frustumCulled = false;
  shellsMesh.castShadow = false;
  g.add(shellsMesh);
  g.userData.fur = { base, shellsMesh, mat };
  return g;
}
