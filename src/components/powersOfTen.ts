// @ts-nocheck -- dense WebGL buffer math
// "Powers of Ten" journey nested inside the globe: each scale is a concentric layer,
// ~1.9x smaller than the previous, so zooming toward the centre descends from Earth to quarks.
import * as THREE from "three";

export type Stage = { exp: number; name: string; note: string };
export const STAGES: Stage[] = [
  { exp: 7, name: "The Whole Earth", note: "Continents, oceans, the spherical globe" },
  { exp: 5, name: "Continent & Region", note: "Weather systems, lakes, boundaries" },
  { exp: 2, name: "Local Landscape", note: "City grids, forests, structures" },
  { exp: 0, name: "One Meter", note: "Human scale — a picnic by the lake" },
  { exp: -2, name: "One Centimeter", note: "The surface of the skin" },
  { exp: -4, name: "Skin & Blood Vessels", note: "Epidermis, capillaries, red cells" },
  { exp: -6, name: "The Cell", note: "Membrane, cytoplasm, nucleus" },
  { exp: -8, name: "DNA", note: "The long twisted ladder" },
  { exp: -9, name: "Molecules", note: "Atoms bonded into structure" },
  { exp: -10, name: "Electron Cloud", note: "Orbitals of a carbon atom" },
  { exp: -13, name: "The Nucleus", note: "Protons and neutrons packed tight" },
  { exp: -15, name: "Quarks", note: "The limit of spatial scale" },
];
const R0 = 9, RATIO = 0.53, VIEW = 3.2;
export const stageRadius = (i: number) => R0 * Math.pow(RATIO, i);
export const MIN_DIST = stageRadius(STAGES.length - 1) * 1.1;

const rnd = (a = 1) => (Math.random() * 2 - 1) * a;
const hash = (x: number, y: number, z: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x: number, y: number, z: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = (t: number) => t * t * (3 - 2 * t), l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(ix + dx, iy + dy, iz + dz);
  return l(l(l(c(0,0,0), c(1,0,0), u(fx)), l(c(0,1,0), c(1,1,0), u(fx)), u(fy)), l(l(c(0,0,1), c(1,0,1), u(fx)), l(c(0,1,1), c(1,1,1), u(fx)), u(fy)), u(fz));
};
const fbm = (x: number, y: number, z: number) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * vnoise(x, y, z); x *= 2; y *= 2; z *= 2; a *= 0.5; } return v; };

class B { p: number[] = []; c: number[] = []; col = new THREE.Color();
  add(x: number, y: number, z: number, hex: number | THREE.Color, j = 0) {
    this.p.push(x, y, z); if (typeof hex === "number") this.col.setHex(hex); else this.col.copy(hex);
    this.c.push(Math.min(1, this.col.r + rnd(j)), Math.min(1, this.col.g + rnd(j)), Math.min(1, this.col.b + rnd(j)));
  }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); return g; }
}
const line = (L: B, a: THREE.Vector3, b: THREE.Vector3, hex: number) => { L.add(a.x, a.y, a.z, hex); L.add(b.x, b.y, b.z, hex); };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Each builder works in a unit-radius local space.
const builders: ((P: B, L: B) => void)[] = [
  // 0 Earth
  (P, L) => {
    const v = new THREE.Vector3();
    for (let i = 0; i < 14000; i++) {
      v.randomDirection(); const n = fbm(v.x * 2.2 + 5, v.y * 2.2, v.z * 2.2);
      const lat = Math.abs(v.y);
      let hex = n > 0.52 ? (lat > 0.85 ? 0xf2f6ff : n > 0.62 ? 0x8a7a4a : n > 0.57 ? 0x3f7a2c : 0x6b9a3a) : n > 0.48 ? 0x2a8ac8 : 0x0b3a8a;
      if (lat > 0.92) hex = 0xffffff;
      P.add(v.x, v.y, v.z, hex, 0.05);
    }
    for (let i = 0; i < 5000; i++) { v.randomDirection(); if (fbm(v.x * 4, v.y * 4 + 9, v.z * 4) > 0.55) P.add(v.x * 1.04, v.y * 1.04, v.z * 1.04, 0xffffff); }
    for (let i = 0; i < 2000; i++) { v.randomDirection().multiplyScalar(1.12 + Math.random() * 0.05); P.add(v.x, v.y, v.z, 0x4aa8ff); } // atmosphere
  },
  // 1 Continent & region: terrain disc, lakes, rivers, hurricane
  (P, L) => {
    for (let i = 0; i < 9000; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const n = fbm(x * 3 + 2, 0.5, z * 3), h = (n - 0.5) * 0.3;
      const hex = n < 0.42 ? 0x1c6ec4 : n < 0.5 ? 0x4c8a3a : n < 0.6 ? 0x7a8a40 : 0xa08a60;
      P.add(x, n < 0.42 ? -0.05 : h, z, hex, 0.04);
    }
    for (let i = 0; i < 6000; i++) { // spiral weather system
      const arm = i % 3, t = Math.random() * 3.2, a = t * 2.4 + (arm * 6.283) / 3, r = 0.04 + t * 0.17;
      P.add(0.35 + Math.cos(a) * r + rnd(0.04), 0.22 + rnd(0.02), -0.2 + Math.sin(a) * r + rnd(0.04), 0xffffff, 0.05);
    }
    for (let k = 0; k < 5; k++) { let p = V(rnd(0.8), 0, rnd(0.8)), d = V(rnd(1), 0, rnd(1)).normalize();
      for (let s = 0; s < 25; s++) { const q = p.clone().add(d.clone().multiplyScalar(0.04)); d.add(V(rnd(0.4), 0, rnd(0.4))).normalize(); if (q.length() > 1) break; line(L, p, q, 0x3aa0ff); p = q; } }
  },
  // 2 Landscape: city grid, buildings, forest
  (P, L) => {
    const N = 14, S = 1.4;
    for (let i = 0; i <= N; i++) { const o = -S / 2 + (S * i) / N; line(L, V(o, 0, -S / 2), V(o, 0, S / 2), 0xffc870); line(L, V(-S / 2, 0, o), V(S / 2, 0, o), 0xffc870); }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const cx = -S / 2 + (S * (i + 0.5)) / N, cz = -S / 2 + (S * (j + 0.5)) / N, w = (S / N) * 0.32;
      const h = 0.04 + Math.pow(Math.random(), 3) * 0.45 * (1 - Math.hypot(cx, cz));
      if (h < 0.02) continue;
      for (const [dx, dz] of [[-w,-w],[w,-w],[w,w],[-w,w]]) line(L, V(cx + dx, 0, cz + dz), V(cx + dx, h, cz + dz), 0x9ad0ff);
      line(L, V(cx - w, h, cz - w), V(cx + w, h, cz + w), 0x9ad0ff);
      for (let k = 0; k < 6; k++) P.add(cx + rnd(w), Math.random() * h, cz + rnd(w), 0xffe9a0); // lit windows
    }
    for (let i = 0; i < 6000; i++) { const a = Math.random() * 6.283, r = 0.75 + Math.random() * 0.25; P.add(Math.cos(a) * r, Math.random() * 0.06, Math.sin(a) * r, 0x2f8a3a, 0.08); }
    for (let i = 0; i < 2500; i++) { const a = Math.random() * 6.283, r = Math.random() * 0.3; P.add(-0.95 + Math.cos(a) * r * 0.5, -0.01, 0.6 + Math.sin(a) * r, 0x2a7ad0); } // lake edge
  },
  // 3 One meter: picnic blanket + two figures + grass
  (P, L) => {
    const n = 40;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < 3; k++) {
      const x = -0.6 + (1.2 * (i + Math.random())) / n, z = -0.6 + (1.2 * (j + Math.random())) / n;
      const check = (Math.floor(i / 5) + Math.floor(j / 5)) % 2; P.add(x, 0, z, check ? 0xe03030 : 0xf4f0e8, 0.04);
    }
    for (let i = 0; i < 6000; i++) { const x = rnd(1), z = rnd(1); if (Math.abs(x) < 0.62 && Math.abs(z) < 0.62) continue; P.add(x, Math.random() * 0.04, z, 0x3c9a3a, 0.1); }
    const person = (ox: number, oz: number, hex: number, lying: boolean) => {
      const hd = lying ? V(ox + 0.4, 0.06, oz) : V(ox, 0.42, oz), hip = lying ? V(ox - 0.05, 0.05, oz) : V(ox, 0.12, oz);
      line(L, hd, hip, hex);
      line(L, hip, lying ? V(ox - 0.45, 0.04, oz + 0.06) : V(ox + 0.22, 0.02, oz + 0.1), hex);
      line(L, hip, lying ? V(ox - 0.45, 0.04, oz - 0.06) : V(ox + 0.22, 0.02, oz - 0.1), hex);
      const sh = hd.clone().lerp(hip, 0.25); line(L, sh, sh.clone().add(V(0.12, -0.12, 0.15)), hex); line(L, sh, sh.clone().add(V(0.12, -0.12, -0.15)), hex);
      for (let i = 0; i < 300; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(0.05); P.add(hd.x + v.x, hd.y + v.y, hd.z + v.z, 0xf0c090); }
    };
    person(-0.15, -0.25, 0xffd060, false); person(0.05, 0.22, 0x60c0ff, true);
    for (let i = 0; i < 400; i++) P.add(0.35 + rnd(0.08), 0.02, -0.35 + rnd(0.05), 0xd09040); // basket
  },
  // 4 One centimeter: wrinkled skin with pores and hairs
  (P, L) => {
    for (let i = 0; i < 12000; i++) {
      const x = rnd(1), z = rnd(1); if (x * x + z * z > 1) continue;
      const wr = Math.abs(Math.sin(x * 14 + Math.sin(z * 5)) * Math.sin(z * 11 + x * 3)), y = -wr * 0.06 + fbm(x * 6, 1, z * 6) * 0.05;
      P.add(x, y, z, wr > 0.85 ? 0x9a5040 : 0xe8a888, 0.06);
    }
    for (let i = 0; i < 50; i++) { const x = rnd(0.8), z = rnd(0.8); const b = V(x, 0, z), t = b.clone().add(V(rnd(0.2), 0.3 + Math.random() * 0.3, rnd(0.2))); line(L, b, t, 0x5a3a28); }
  },
  // 5 Skin cells + branching blood vessels with red cells
  (P, L) => {
    const hex = 0.09;
    for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
      const cx = i * hex * 1.5, cz = (j + (i % 2) * 0.5) * hex * 1.732; if (cx * cx + cz * cz > 1) continue;
      for (let k = 0; k < 6; k++) { const a1 = (k * Math.PI) / 3, a2 = ((k + 1) * Math.PI) / 3;
        line(L, V(cx + Math.cos(a1) * hex, 0.25, cz + Math.sin(a1) * hex), V(cx + Math.cos(a2) * hex, 0.25, cz + Math.sin(a2) * hex), 0xffb8a0); }
      P.add(cx, 0.25, cz, 0xb06070);
    }
    const branch = (p: THREE.Vector3, d: THREE.Vector3, len: number, depth: number) => {
      if (depth === 0 || p.length() > 1) return;
      const q = p.clone().add(d.clone().multiplyScalar(len)); line(L, p, q, depth > 3 ? 0xd01020 : 0xff4050);
      for (let i = 0; i < 6; i++) { const t = Math.random(); P.add(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, p.z + (q.z - p.z) * t, 0xe02030, 0.05); }
      for (let k = 0; k < 2; k++) branch(q, d.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.7)).normalize(), len * 0.78, depth - 1);
    };
    branch(V(-0.9, -0.2, 0), V(1, 0, 0.2).normalize(), 0.3, 7);
    branch(V(0.8, -0.3, -0.5), V(-1, 0.1, 0.6).normalize(), 0.28, 7);
  },
  // 6 The cell
  (P, L) => {
    const v = new THREE.Vector3();
    for (let i = 0; i < 7000; i++) { v.randomDirection(); const r = 1 + Math.sin(v.x * 7) * Math.sin(v.y * 6) * 0.03; P.add(v.x * r, v.y * r, v.z * r, 0xff80c0, 0.08); }
    for (let i = 0; i < 4000; i++) { v.randomDirection().multiplyScalar(0.35); P.add(v.x + 0.1, v.y, v.z, 0x9a50ff, 0.08); }
    for (let i = 0; i < 1500; i++) { v.randomDirection().multiplyScalar(Math.random() * 0.3); P.add(v.x + 0.1, v.y, v.z, 0xd0a0ff); } // chromatin
    for (let i = 0; i < 3000; i++) { v.randomDirection().multiplyScalar(0.4 + Math.random() * 0.55); P.add(v.x, v.y, v.z, 0x60d0ff, 0.2); } // cytoplasm
    for (let m = 0; m < 10; m++) { // mitochondria
      const c = new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 0.25), ax = new THREE.Vector3().randomDirection();
      for (let i = 0; i < 200; i++) { const t = rnd(0.1); P.add(c.x + ax.x * t + rnd(0.03), c.y + ax.y * t + rnd(0.03), c.z + ax.z * t + rnd(0.03), 0xffa030); }
    }
    for (let k = 0; k < 8; k++) { let p = new THREE.Vector3().randomDirection().multiplyScalar(0.42);
      for (let s = 0; s < 20; s++) { const q = p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.05)); if (q.length() > 0.9 || q.length() < 0.38) break; line(L, p, q, 0x40ffb0); p = q; } } // ER
  },
  // 7 DNA double helix
  (P, L) => {
    const turns = 3.5, N = 140, pairs = [0xff4040, 0x40c0ff, 0x40ff80, 0xffd040];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), y = -1 + 2 * t, a = t * turns * 6.283, r = 0.32;
      const A = V(Math.cos(a) * r, y, Math.sin(a) * r), Bp = V(Math.cos(a + Math.PI * 0.8) * r, y, Math.sin(a + Math.PI * 0.8) * r);
      for (let k = 0; k < 12; k++) { P.add(A.x + rnd(0.025), A.y + rnd(0.025), A.z + rnd(0.025), 0x60a0ff); P.add(Bp.x + rnd(0.025), Bp.y + rnd(0.025), Bp.z + rnd(0.025), 0xff9a40); }
      if (i % 3 === 0) { const mid = A.clone().lerp(Bp, 0.5), b = pairs[(i / 3) % 4 | 0]; line(L, A, mid, b); line(L, mid, Bp, pairs[(((i / 3) | 0) + 2) % 4]); }
      if (i > 0) { const tp = (i - 1) / (N - 1), ap = tp * turns * 6.283, yp = -1 + 2 * tp;
        line(L, V(Math.cos(ap) * r, yp, Math.sin(ap) * r), A, 0x80c0ff); line(L, V(Math.cos(ap + Math.PI * 0.8) * r, yp, Math.sin(ap + Math.PI * 0.8) * r), Bp, 0xffb060); }
    }
  },
  // 8 Molecules: ball-and-stick cluster (CPK colours)
  (P, L) => {
    const cpk = [0x909090, 0xffffff, 0xff3030, 0x3050ff, 0xff8000], atoms: { p: THREE.Vector3; c: number }[] = [];
    let p = V(0, 0, 0);
    for (let i = 0; i < 34; i++) {
      const c = i % 7 === 0 ? cpk[2] : i % 5 === 0 ? cpk[3] : i % 11 === 0 ? cpk[4] : cpk[0];
      atoms.push({ p: p.clone(), c });
      if (i > 0) line(L, atoms[i - 1].p, p, 0xc0c0c0);
      for (let h = 0; h < (c === cpk[0] ? 2 : 0); h++) { const hp = p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.12)); atoms.push({ p: hp, c: cpk[1] }); line(L, p, hp, 0xc0c0c0); }
      p = p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.2)); if (p.length() > 0.85) p.multiplyScalar(0.6);
    }
    atoms.forEach((a) => { const r = a.c === cpk[1] ? 0.03 : 0.055; for (let k = 0; k < 160; k++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(r * Math.cbrt(Math.random())); P.add(a.p.x + v.x, a.p.y + v.y, a.p.z + v.z, a.c, 0.05); } });
  },
  // 9 Electron cloud: carbon 1s, 2s, 2p orbitals
  (P, L) => {
    const v = new THREE.Vector3();
    for (let i = 0; i < 3000; i++) { v.randomDirection().multiplyScalar(-Math.log(Math.random()) * 0.12); P.add(v.x, v.y, v.z, 0x80b0ff); }
    for (let i = 0; i < 3000; i++) { v.randomDirection().multiplyScalar(0.5 + rnd(0.12)); P.add(v.x, v.y, v.z, 0x5070ff, 0.05); }
    const axes = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], cols = [0x40e0ff, 0xb060ff, 0x60ffc0];
    axes.forEach((ax, k) => { for (let i = 0; i < 3500; i++) { const s = Math.random() < 0.5 ? -1 : 1, d = 0.15 + Math.random() * 0.75, w = Math.sin((d / 0.9) * Math.PI) * 0.28;
      v.randomDirection(); const q = ax.clone().multiplyScalar(s * d).add(v.multiplyScalar(w * Math.random())); P.add(q.x, q.y, q.z, cols[k], 0.05); } });
    for (let i = 0; i < 300; i++) { v.randomDirection().multiplyScalar(0.03); P.add(v.x, v.y, v.z, 0xffffff); } // nucleus speck
  },
  // 10 Nucleus: 6 protons + 6 neutrons
  (P, L) => {
    const v = new THREE.Vector3();
    for (let n = 0; n < 12; n++) {
      const c = new THREE.Vector3().randomDirection().multiplyScalar(n === 0 ? 0 : 0.35 + Math.random() * 0.15), hex = n % 2 ? 0xff4040 : 0xb0b0c0;
      for (let i = 0; i < 700; i++) { v.randomDirection().multiplyScalar(0.28 * Math.cbrt(Math.random())); P.add(c.x + v.x, c.y + v.y, c.z + v.z, hex, 0.06); }
    }
    for (let i = 0; i < 1500; i++) { v.randomDirection().multiplyScalar(0.9 + Math.random() * 0.2); P.add(v.x, v.y, v.z, 0xffe080); } // strong-force haze
  },
  // 11 Quarks: up, up, down bound by gluon strings
  (P, L) => {
    const v = new THREE.Vector3(), q = [V(0, 0.45, 0), V(-0.4, -0.25, 0.1), V(0.4, -0.25, -0.1)], c = [0xff3030, 0x30ff60, 0x3070ff];
    q.forEach((p, k) => { for (let i = 0; i < 1500; i++) { v.randomDirection().multiplyScalar(0.12 * Math.cbrt(Math.random())); P.add(p.x + v.x, p.y + v.y, p.z + v.z, c[k], 0.05); } });
    for (let a = 0; a < 3; a++) { const A = q[a], Bq = q[(a + 1) % 3];
      for (let s = 0; s < 40; s++) { const t0 = s / 40, t1 = (s + 1) / 40, w = (t: number) => A.clone().lerp(Bq, t).add(V(0, 0, Math.sin(t * 40) * 0.04));
        line(L, w(t0), w(t1), 0xffe060); } }
    for (let i = 0; i < 2500; i++) { v.randomDirection().multiplyScalar(Math.random()); P.add(v.x, v.y, v.z, Math.random() < 0.5 ? 0xffffff : 0xffd0ff); } // sea quarks
  },
];

export function buildPowersOfTen(dot: THREE.Texture) {
  const group = new THREE.Group();
  const layers = STAGES.map((_, i) => {
    const P = new B(), L = new B(); builders[i](P, L);
    const r = stageRadius(i), g = new THREE.Group(); g.scale.setScalar(r);
    const pm = new THREE.PointsMaterial({ size: r * 0.018, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const lm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    g.add(new THREE.Points(P.geo(), pm));
    if (L.p.length) g.add(new THREE.LineSegments(L.geo(), lm));
    // tilt flat layers so they read well from the default view
    if ([1, 2, 3, 4, 5].includes(i)) g.rotation.x = 0.5;
    group.add(g);
    return { g, pm, lm, r };
  });
  const lnR = Math.log(1 / RATIO);

  /** Fades layers by camera distance and returns the continuous stage position (0..N-1). */
  const update = (dist: number, t: number) => {
    layers.forEach((l, i) => {
      const x = Math.log(dist / (l.r * VIEW)) / lnR;
      const fin = THREE.MathUtils.smoothstep(-x, -2.6, -0.4); // appears as you approach
      const fout = THREE.MathUtils.smoothstep(x, -1.9, -0.7); // dissolves once you pass through
      const w = i === 0 ? fout : fin * fout;
      l.g.visible = w > 0.01; l.pm.opacity = w; l.lm.opacity = w * 0.8;
      l.g.rotation.y = t * (0.03 + i * 0.006);
    });
    return THREE.MathUtils.clamp(Math.log(R0 * VIEW / dist) / lnR, 0, STAGES.length - 1);
  };
  return { group, update };
}

/** Interpolated scale exponent in metres for a continuous stage position. */
export function exponentAt(pos: number) {
  const i = Math.floor(pos), f = pos - i, a = STAGES[i], b = STAGES[Math.min(i + 1, STAGES.length - 1)];
  return a.exp + (b.exp - a.exp) * f;
}
