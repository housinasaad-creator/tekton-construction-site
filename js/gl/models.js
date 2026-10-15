/*
  Architectural maquettes for the projects table: white foam volumes, smoked-glass bands, dark details.
  Each builder returns a Group with userData { h: height, r: radius that frames it } in metres (model scale, not real scale).
*/
import * as THREE from 'three';
import { canvasTex, rng } from './core.js';

const M = {
  body: new THREE.MeshStandardMaterial({ color: 0xe9e5da, roughness: 0.74, metalness: 0.02 }),
  body2: new THREE.MeshStandardMaterial({ color: 0xcdc8bb, roughness: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x6d93aa, metalness: 0.65, roughness: 0.16, transparent: true, opacity: 0.82, envMapIntensity: 1.5 }),
  glassClear: new THREE.MeshStandardMaterial({ color: 0xa5c4d4, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.42, envMapIntensity: 1.4, depthWrite: false, side: THREE.DoubleSide }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.55, metalness: 0.5 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x8c877c, roughness: 0.85 }),
  green: new THREE.MeshStandardMaterial({ color: 0x86ad72, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x6f9a5e, roughness: 0.9 }),
  water: new THREE.MeshStandardMaterial({ color: 0x4b86ab, roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.8 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff6b1f, roughness: 0.5, metalness: 0.2 }),
  road: new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.9 })
};
const EDGE = new THREE.LineBasicMaterial({ color: 0x6b675d, transparent: true, opacity: 0.55 });
const BOXG = new THREE.BoxGeometry(1, 1, 1);

function bx(parent, w, h, d, x, y, z, mat = M.body, edge = true) {
  const m = new THREE.Mesh(BOXG, mat); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  if (edge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(BOXG), EDGE); m.add(e); }
  parent.add(m); return m;
}
function cyl(parent, rt, rb, h, x, y, z, mat = M.body, seg = 28, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function prism(parent, w, h, d, x, y, z, mat, ry = 0) {      // triangular prism, ridge along z
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function inst(parent, geo, mat, list) {
  const m = new THREE.InstancedMesh(geo, mat, list.length), t = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  list.forEach((a, i) => { p.set(a[0], a[1], a[2]); s.set(a[3], a[4], a[5]); q.setFromEuler(e.set(0, a[6] || 0, 0)); t.compose(p, q, s); m.setMatrixAt(i, t); });
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const UB = new THREE.BoxGeometry(1, 1, 1); UB.translate(0, 0.5, 0);
function tree(parent, x, z, s = 1) { cyl(parent, 0.12 * s, 0.16 * s, 0.9 * s, x, 0, z, M.dark, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 10, 8), M.leaf); l.position.set(x, 1.4 * s, z); l.castShadow = true; parent.add(l); }

const B = {};

/* 1 · residential tower, 18 floors */
B.zeytin = () => {
  const g = new THREE.Group();
  bx(g, 13, 1.8, 13, 0, 0, 0, M.body2);
  bx(g, 6, 25, 6, 0, 1.8, 0, M.body);
  const bands = [], slabs = [];
  for (let i = 0; i < 18; i++) { const y = 1.8 + 0.5 + i * (24 / 18); bands.push([0, y, 0, 6.12, 0.75, 6.12]); if (i % 3 === 2) slabs.push([0, y - 0.35, 0, 7.0, 0.14, 7.0]); }
  inst(g, UB, M.glass, bands); inst(g, UB, M.body, slabs);
  for (const [x, z] of [[-3, -3], [3, -3], [3, 3], [-3, 3]]) bx(g, 0.5, 25.2, 0.5, x, 1.8, z, M.body, false);
  bx(g, 4, 1.4, 4, 0, 26.8, 0, M.dark); cyl(g, 0.08, 0.08, 4, 0, 28.2, 0, M.dark, 6);
  for (let i = 0; i < 5; i++) tree(g, -5.2 + i * 2.6, 5.4, 0.8);
  g.userData = { h: 32, r: 13 }; return g;
};

/* 2 · office tower, six twisted segments */
B.pinar = () => {
  const g = new THREE.Group();
  bx(g, 13, 1.6, 13, 0, 0, 0, M.body2);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Group(); s.position.y = 1.6 + i * 4.3; s.rotation.y = i * 0.1; g.add(s);
    const sc = 1 - i * 0.045;
    const core = new THREE.Mesh(BOXG, M.glass); core.scale.set(5.4 * sc, 4.0, 7.4 * sc); core.position.y = 2.15; core.castShadow = true; s.add(core);
    const slab = new THREE.Mesh(BOXG, M.body); slab.scale.set(5.9 * sc, 0.3, 7.9 * sc); slab.position.y = 0.15; slab.castShadow = true; s.add(slab); slab.add(new THREE.LineSegments(new THREE.EdgesGeometry(BOXG), EDGE));
    for (let k = 1; k < 4; k++) { const f = new THREE.Mesh(BOXG, M.dark); f.scale.set(5.5 * sc, 0.07, 7.5 * sc); f.position.y = k * 1.0; s.add(f); }
  }
  bx(g, 3, 0.4, 4, 0, 1.6 + 6 * 4.3, 0, M.body); cyl(g, 0.07, 0.1, 6.4, 0, 1.6 + 6 * 4.3 + 0.4, 0, M.dark, 6);
  g.userData = { h: 33, r: 13 }; return g;
};

/* 3 · cable-stayed bridge over water */
B.kervan = () => {
  const outer = new THREE.Group(), g = new THREE.Group(); g.scale.setScalar(0.78); outer.add(g);
  const w = new THREE.Mesh(BOXG, M.water); w.scale.set(30, 0.5, 14); w.position.set(0, 0.25, 0); g.add(w);
  bx(g, 8, 3.4, 9, -17.2, 0, 0, M.body2); bx(g, 8, 3.4, 9, 17.2, 0, 0, M.body2);
  bx(g, 32, 0.6, 3.8, 0, 3.4, 0, M.body);
  bx(g, 32, 0.12, 3.7, 0, 4.0, 0, M.road, false);
  for (const x of [-9, 0, 9]) for (const z of [-1.2, 1.2]) bx(g, 0.9, 3.4, 0.9, x, 0, z, M.body2, false);
  for (const z of [-1.3, 1.3]) bx(g, 0.9, 17, 0.9, 0, 3.4, z, M.body);
  bx(g, 1.0, 0.7, 3.5, 0, 9.5, 0, M.body, false); bx(g, 1.0, 0.7, 3.5, 0, 19.0, 0, M.body, false);
  const v = [];
  for (let i = 1; i <= 8; i++) { const x = i * 1.9; for (const z of [-1.3, 1.3]) for (const sx of [-1, 1]) v.push(0, 20, z, sx * x, 4.1, z * 1.45); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3b4046 })));
  outer.userData = { h: 16.5, r: 16 }; return outer;
};

/* 4 · logistics hub, sawtooth roof */
B.kuzey = () => {
  const g = new THREE.Group();
  bx(g, 22, 5, 12, 0, 0, -1, M.body);
  for (let i = 0; i < 6; i++) { const w = 22 / 6; prism(g, w, 2.4, 12, -11 + w * (i + 0.5), 5, -1, M.roof); }
  for (let i = 0; i < 6; i++) { const w = 22 / 6; bx(g, 0.1, 1.8, 11.6, -11 + w * (i + 0.9), 5, -1, M.glass, false); }
  for (let i = 0; i < 7; i++) bx(g, 2.2, 3.2, 0.5, -9.2 + i * 3.1, 0, 5.2, M.dark, false);
  bx(g, 24, 0.12, 8, 0, 0, 10, M.road, false);
  for (let i = 0; i < 4; i++) { bx(g, 2.4, 2.6, 5.2, -7.5 + i * 5.2, 0.5, 9.2, M.body2); bx(g, 2.2, 2.2, 1.6, -7.5 + i * 5.2, 0.5, 12.6, M.orange); }
  for (let i = 0; i < 5; i++) cyl(g, 1.0, 1.0, 1.6, -9 + i * 4.5, 0, -9, M.body2, 14);   // silos
  g.userData = { h: 8, r: 16 }; return g;
};

/* 5 · cross-plan hospital on base isolators */
B.sifa = () => {
  const g = new THREE.Group();
  const iso = []; for (let x = -7; x <= 7; x += 3.5) for (const z of [-2, 2]) iso.push([x, 0, z]); for (let z = -7; z <= 7; z += 3.5) for (const x of [-2, 2]) iso.push([x, 0, z]);
  iso.forEach(([x, , z]) => cyl(g, 0.5, 0.5, 1.0, x, 0, z, M.orange, 12));
  const b = new THREE.Group(); b.position.y = 1.0; g.add(b);
  bx(b, 18, 6, 6.4, 0, 0, 0, M.body); bx(b, 6.4, 6, 18, 0, 0, 0, M.body);
  const bands = []; for (let k = 0; k < 4; k++) { bands.push([0, 0.9 + k * 1.3, 0, 18.1, 0.7, 5.0]); bands.push([0, 0.9 + k * 1.3, 0, 5.0, 0.7, 18.1]); }
  inst(b, UB, M.glass, bands);
  cyl(b, 3.6, 3.6, 7.2, 0, 0, 0, M.glassClear, 28);
  bx(b, 6.6, 0.5, 6.6, 0, 6.0, 0, M.body2);
  const hp = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#d7d3c8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ff6b1f'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 52, 0, 6.3); c.stroke(); c.fillStyle = '#ff6b1f'; c.font = '800 70px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', 64, 68); }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.25, 32), [M.body, new THREE.MeshStandardMaterial({ map: hp }), M.body]); pad.position.set(0, 6.6, 0); b.add(pad);
  bx(b, 5, 1.4, 3.2, 0, 0, 9.6, M.body2); bx(b, 5, 0.3, 4.2, 0, 1.4, 9.8, M.orange, false);
  g.userData = { h: 10, r: 14 }; return g;
};

/* 6 · villas around a shared court */
B.bahce = () => {
  const g = new THREE.Group(), R = rng(8);
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.4, 0.3, 40), M.green); lawn.position.y = 0.15; lawn.receiveShadow = true; g.add(lawn);
  const court = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.36, 28), M.body2); court.position.y = 0.18; g.add(court);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, x = Math.cos(a) * 5.8, z = Math.sin(a) * 5.8, v = new THREE.Group(); v.position.set(x, 0.3, z); v.rotation.y = -a - Math.PI / 2; g.add(v);
    bx(v, 3.4, 2.1, 2.9, 0, 0, 0, M.body); prism(v, 3.9, 1.3, 3.3, 0, 2.1, 0, M.roof, Math.PI / 2); bx(v, 1.0, 1.0, 0.1, 0, 0.5, 1.46, M.glass, false);
    tree(v, 1.9, 1.7, 0.7);
  }
  for (let i = 0; i < 8; i++) { const a = R() * 6.28, r = 3.0 + R() * 1.4; tree(g, Math.cos(a) * r, Math.sin(a) * r, 0.7 + R() * 0.4); }
  g.userData = { h: 5, r: 11 }; return g;
};

/* 7 · mall with a glazed atrium */
B.cinar = () => {
  const g = new THREE.Group();
  bx(g, 18, 3.4, 13, 0, 0, 0, M.body); bx(g, 14.5, 3.2, 9.6, 0, 3.4, 0, M.body);
  for (const [w, d, y] of [[18.1, 13.1, 1.2], [14.6, 9.7, 4.6]]) bx(g, w, 0.9, d, 0, y, 0, M.glass, false);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.4, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glassClear); dome.position.set(0, 6.6, 0); g.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.14, 8, 40), M.dark); ring.rotation.x = Math.PI / 2; ring.position.y = 6.6; g.add(ring);
  bx(g, 6.4, 0.35, 3.4, 0, 3.0, 7.6, M.orange, false); bx(g, 0.3, 3.0, 0.3, -2.8, 0, 8.9, M.dark, false); bx(g, 0.3, 3.0, 0.3, 2.8, 0, 8.9, M.dark, false);
  for (let i = 0; i < 6; i++) bx(g, 1.4, 0.05, 3.2, -6.5 + i * 2.6, 6.63, -3, M.dark, false);
  g.userData = { h: 11, r: 14 }; return g;
};

/* 8 · domed sports hall */
B.atlas = () => {
  const g = new THREE.Group();
  const pitch = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.3, 48), M.green); pitch.position.y = 0.15; pitch.receiveShadow = true; g.add(pitch);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(10.6, 8.2, 3.6, 48, 1, true), M.body); bowl.material = M.body.clone(); bowl.material.side = THREE.DoubleSide; bowl.position.y = 2.0; bowl.castShadow = true; g.add(bowl);
  const tiers = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 7.6, 2.2, 48, 1, true), M.body2); tiers.material = M.body2.clone(); tiers.material.side = THREE.DoubleSide; tiers.position.y = 1.4; g.add(tiers);
  const cap = new THREE.SphereGeometry(10.8, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(cap, M.glassClear); dome.scale.set(1, 0.66, 1); dome.position.y = 3.8; g.add(dome);
  const wf = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(10.85, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), new THREE.LineBasicMaterial({ color: 0x3a3f45 })); wf.scale.set(1, 0.66, 1); wf.position.y = 3.8; g.add(wf);
  const rg = new THREE.Mesh(new THREE.TorusGeometry(10.7, 0.22, 8, 60), M.orange); rg.rotation.x = Math.PI / 2; rg.position.y = 3.8; g.add(rg);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; bx(g, 0.5, 3.0, 0.5, Math.cos(a) * 11, 0, Math.sin(a) * 11, M.dark, false); }
  g.userData = { h: 11, r: 15 }; return g;
};

export const MODEL_IDS = Object.keys(B);
export function buildModel(id) { return B[id](); }
export { M as MODEL_MATS };
