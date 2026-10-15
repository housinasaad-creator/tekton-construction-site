/*
  The service stack: a building taken apart into six layers (groundworks, structure, envelope, MEP, interior, roof).
  Scroll steps through the layers (the active one is solid, the rest turn to ghosts); at the end the stack snaps together.
*/
import * as THREE from 'three';
import { Stage, smooth, lerp, clamp, rng } from './core.js';
import { makeMats, makeGround } from './parts.js';

const UB = new THREE.BoxGeometry(1, 1, 1); UB.translate(0, 0.5, 0);
const W = 32, D = 22;
const THICK = [1.4, 4.2, 4.0, 2.4, 3.4, 2.6];
const KEYS = ['ground', 'structure', 'envelope', 'mep', 'interior', 'roof'];

export class Stack {
  constructor({ canvas, section, ui, mobile }) {
    this.ui = ui; this.section = section; this.mobile = mobile;
    this.stage = new Stage(canvas, { mobile, shadows: !mobile, shadowExtent: 52, shadowSize: 2048, landShift: 0.12, portraitShift: 0.12, exposure: 1.05 });
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.p = 0; this.ps = 0; this.forceP = null; this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.mats = makeMats(); this.layers = []; this.cur = { t: 0, op: new Array(6).fill(1) }; this.lastActive = -1;
    this._build(); this._warm();
    this.stage.add((dt, t) => this._frame(dt, t));
    addEventListener('pointermove', (e) => { this.mouse.tx = (e.clientX / innerWidth - 0.5) * 2; this.mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    this._measure(); addEventListener('resize', () => this._measure());
  }

  /* each layer owns clones of the materials so it can fade on its own */
  _mat(layer, base, extra = {}) {
    const m = base.clone();
    if (base.onBeforeCompile) { m.onBeforeCompile = base.onBeforeCompile; m.customProgramCacheKey = base.customProgramCacheKey; m.map = base.map; }
    m.transparent = true; m.userData.baseOp = base.transparent ? base.opacity : 1; Object.assign(m, extra);
    layer.mats.push(m); return m;
  }
  _box(layer, mat, w, h, d, x, y, z, ry = 0) { const m = new THREE.Mesh(UB, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; layer.g.add(m); return m; }
  _cyl(layer, mat, r, len, x, y, z, axis = 'x') { const g = new THREE.CylinderGeometry(r, r, len, 10); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2; m.castShadow = true; layer.g.add(m); return m; }
  _lines(layer, v, color) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); const m = new THREE.LineBasicMaterial({ color, transparent: true }); m.userData.baseOp = 1; layer.mats.push(m); const l = new THREE.LineSegments(g, m); layer.g.add(l); return l; }

  _build() {
    const S = this.stage, sc = S.scene, M = this.mats;
    this.ground = makeGround(600); this.ground.position.y = -8.2; sc.add(this.ground);
    this.ground.material.uniforms.uBase.value.set(0x3f4348); this.ground.material.uniforms.uGrid.value = 0.45; this.ground.material.uniforms.uFade.value.set(280, 60);
    const mk = (i) => { const l = { i, g: new THREE.Group(), mats: [], op: 1 }; sc.add(l.g); this.layers.push(l); return l; };
    const cols = [], gx = [-12, -6, 0, 6, 12], gz = [-8, 0, 8];
    for (const x of gx) for (const z of gz) cols.push([x, z]);

    // 0 · groundworks
    { const L = mk(0), c = this._mat(L, M.concreteDark), o = this._mat(L, M.concreteDark);
      this._box(L, c, W, 1.4, D, 0, 0, 0);
      for (const [x, z] of cols) for (const d of [-0.9, 0.9]) { const p = this._cyl(L, o, 0.5, 8, x + d, -4, z + d * 0.6, 'y'); }
      const v = []; for (let x = -W / 2 + 1; x <= W / 2 - 1 + 1e-3; x += 1.0) v.push(x, 1.5, -D / 2 + 1, x, 1.5, D / 2 - 1); for (let z = -D / 2 + 1; z <= D / 2 - 1 + 1e-3; z += 1.0) v.push(-W / 2 + 1, 1.62, z, W / 2 - 1, 1.62, z);
      this._lines(L, v, 0xe0773a);
      for (const sx of [-1, 1]) this._box(L, c, 0.6, 2.2, D + 2, sx * (W / 2 + 1.2), -0.4, 0); }
    // 1 · structure
    { const L = mk(1), c = this._mat(L, M.concrete), s = this._mat(L, M.concrete, { opacity: 0.55 }); s.userData.baseOp = 0.55;
      for (const [x, z] of cols) this._box(L, c, 0.9, 3.8, 0.9, x, 0, z);
      for (const z of gz) this._box(L, c, W, 0.55, 0.6, 0, 3.2, z);
      for (const x of gx) this._box(L, c, 0.6, 0.55, D, x, 3.2, 0);
      this._box(L, s, W + 1.2, 0.4, D + 1.2, 0, 3.8, 0);
      this._box(L, c, 6, 3.8, 5, 0, 0, 0); }
    // 2 · envelope
    { const L = mk(2), g = this._mat(L, M.glass), f = this._mat(L, M.frame), e = this._mat(L, M.concrete);
      const bay = (n, len, side) => { const w = len / n; for (let k = 0; k < n; k++) { const t = -len / 2 + w * (k + 0.5); if (side === 'z') { for (const sz of [-1, 1]) this._box(L, g, w - 0.14, 3.5, 0.08, t, 0.25, sz * D / 2); } else { for (const sx of [-1, 1]) this._box(L, g, 0.08, 3.5, w - 0.14, sx * W / 2, 0.25, t); } } for (let k = 0; k <= n; k++) { const t = -len / 2 + w * k; if (side === 'z') { for (const sz of [-1, 1]) this._box(L, f, 0.14, 3.6, 0.2, t, 0.2, sz * D / 2); } else { for (const sx of [-1, 1]) this._box(L, f, 0.2, 3.6, 0.14, sx * W / 2, 0.2, t); } } };
      bay(8, W, 'z'); bay(5, D, 'x');
      const ring = (y, t) => { for (const sz of [-1, 1]) this._box(L, e, W + 0.7, t, 0.5, 0, y, sz * (D / 2 + 0.05)); for (const sx of [-1, 1]) this._box(L, e, 0.5, t, D + 0.7, sx * (W / 2 + 0.05), y, 0); };
      ring(-0.1, 0.35); ring(3.75, 0.35); }
    // 3 · MEP
    { const L = mk(3), steel = this._mat(L, M.steel);
      const mat = (c) => this._mat(L, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.3 }));
      const w = mat(0x2f9cff), f = mat(0xff3b30), pw = mat(0xffd23f), h = this._mat(L, new THREE.MeshStandardMaterial({ color: 0xb4bdc5, roughness: 0.5, metalness: 0.6 }));
      for (const z of [-5.5, 5.5]) this._box(L, h, W - 3, 0.9, 1.5, 0, 0.6, z);
      for (let x = -12; x <= 12; x += 4) this._box(L, h, 1.0, 0.6, 9.2, x, 0.75, 0).scale.set(1.0, 0.6, 9.2);
      for (const z of [-3.2, 3.2]) { this._cyl(L, w, 0.14, W - 4, 0, 1.5, z); this._cyl(L, f, 0.19, W - 4, 0, 1.2, z + (z > 0 ? 0.7 : -0.7)); }
      for (const z of [-1.4, 1.4]) this._box(L, pw, W - 4, 0.12, 0.55, 0, 1.75, z);
      for (const x of [-14, 14, -7, 7]) for (const [m, dz] of [[w, -3.2], [f, -3.9], [pw, 3.2]]) this._cyl(L, m, 0.14, 2.4, x, 1.2, dz, 'y');
      this._box(L, steel, 6, 2.2, 5, 0, 0, 0); }
    // 4 · interior
    { const L = mk(4), floor = this._mat(L, M.concrete), wall = this._mat(L, M.white), wood = this._mat(L, new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.7 })), acc = this._mat(L, M.orange), glass = this._mat(L, M.glass), R = rng(31);
      this._box(L, floor, W, 0.3, D, 0, 0, 0);
      const wl = (x, z, len, rot) => this._box(L, wall, len, 2.8, 0.18, x, 0.3, z, rot);
      for (const x of [-9, 0, 9]) { wl(x, -3.6, 8, Math.PI / 2); wl(x, 7, 8, Math.PI / 2); }
      for (const z of [-3.6, 3.2]) { wl(-12, z, 8, 0); wl(5, z, 12, 0); }
      wl(0, -8.2, W - 4, 0).scale.set(W - 4, 1.1, 0.14); this._box(L, glass, 8, 2.2, 0.08, -9, 0.3, -3.6, 0);
      for (let i = 0; i < 24; i++) { const x = (R() - 0.5) * 28, z = (R() - 0.5) * 18, k = R(); if (k < 0.45) this._box(L, wood, 1.5, 0.75, 0.8, x, 0.3, z, R() * 3); else if (k < 0.75) this._box(L, acc, 2.0, 0.85, 0.9, x, 0.3, z, R() * 3); else this._box(L, wall, 0.8, 1.1, 0.8, x, 0.3, z); }
      for (let x = -14; x <= 14; x += 2) for (const z of [-9.4, 9.4]) this._box(L, wood, 0.05, 0.05, 0.05, x, 0.31, z); }
    // 5 · roof & landscape
    { const L = mk(5), c = this._mat(L, M.concrete), green = this._mat(L, new THREE.MeshStandardMaterial({ color: 0x7ba466, roughness: 0.9 })), leaf = this._mat(L, new THREE.MeshStandardMaterial({ color: 0x5f8f50, roughness: 0.9 })), pv = this._mat(L, new THREE.MeshStandardMaterial({ color: 0x1f3a5c, metalness: 0.8, roughness: 0.25 })), dark = this._mat(L, M.frame), sky = this._mat(L, M.glass), R = rng(7);
      this._box(L, c, W + 1.2, 0.5, D + 1.2, 0, 0, 0);
      for (const sz of [-1, 1]) this._box(L, c, W + 1.2, 0.9, 0.3, 0, 0.5, sz * (D / 2 + 0.45)); for (const sx of [-1, 1]) this._box(L, c, 0.3, 0.9, D + 1.2, sx * (W / 2 + 0.45), 0.5, 0);
      for (const [x, z, w, d] of [[-8, -4, 12, 7], [-10, 6, 8, 5], [6, 5, 7, 6]]) this._box(L, green, w, 0.35, d, x, 0.5, z);
      for (let i = 0; i < 16; i++) { const x = -15 + R() * 15, z = -9 + R() * 18, s = 0.7 + R() * 0.7; this._cyl(L, dark, 0.1 * s, 1.2 * s, x, 0.5 + 0.6 * s, z, 'y'); const cn = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 2.2 * s, 8), leaf); cn.position.set(x, 0.5 + 1.2 * s + 1.0 * s, z); cn.castShadow = true; L.g.add(cn); }
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { const m = this._box(L, pv, 2.4, 0.08, 1.4, 5 + i * 2.7, 0.55 + 0.3, -8 + r * 2.8); m.rotation.x = -0.4; }
      this._box(L, dark, 5, 2.0, 4, 12, 0.5, -4.5); this._box(L, sky, 5, 0.8, 3, -2, 0.5, 0); }
    this.total = THICK.reduce((a, b) => a + b, 0);
  }

  _warm() {
    const S = this.stage, sc = S.scene, cam = S.camera, r = S.renderer, hid = [], cull = [];
    S.canvas.style.visibility = 'hidden';
    sc.traverse(o => { if (!o.visible) hid.push(o); o.visible = true; if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } });
    try { r.compile(sc, cam); sc.traverse(o => { const m = o.material; if (!m) return; for (const mm of (Array.isArray(m) ? m : [m])) for (const k in mm) { const v = mm[k]; if (v && v.isTexture) r.initTexture(v); } }); r.render(sc, cam); r.clear(); } catch (e) { /* optional */ }
    for (const o of cull) o.frustumCulled = true; for (const o of hid) o.visible = false;
  }
  _measure() { const r = this.section.getBoundingClientRect(); this.secTop = scrollY + r.top; this.secH = this.section.offsetHeight; this.vh = innerHeight; this.span = Math.max(1, this.secH - this.vh * 1.0); }
  readScroll() { return clamp((scrollY - this.secTop) / this.span); }
  setP(p, instant) { this.forceP = p; if (instant) this.ps = p; }
  layerY(i, gap) { let y = 8; for (let k = 0; k < i; k++) y += THICK[k] + gap; return y; }
  yAtScroll(i) { return this.secTop + this.span * (0.06 + 0.84 * (i + 0.5) / 6); }

  _frame(dt, time) {
    const S = this.stage, M = this.mouse, cam = S.camera;
    const target = this.forceP !== null ? this.forceP : this.readScroll(); this.p = target;
    this.ps += (target - this.ps) * (this.reduced ? 1 : 1 - Math.exp(-dt * 4.2)); if (Math.abs(target - this.ps) < 1e-4) this.ps = target;
    const p = this.ps;
    M.x += (M.tx - M.x) * (1 - Math.exp(-dt * 3)); M.y += (M.ty - M.y) * (1 - Math.exp(-dt * 3));
    const asm = smooth(0.9, 0.985, p), gap = lerp(11, 0.5, asm);
    const f = clamp((p - 0.06) / 0.84) * 6, act = asm > 0.5 ? -1 : p < 0.045 ? -2 : Math.min(5, Math.max(0, Math.floor(f)));
    if (act !== this.lastActive) { this.lastActive = act; this.ui.onActive && this.ui.onActive(act); }
    // layers: position, ghosting
    for (const L of this.layers) {
      const y = this.layerY(L.i, gap); L.g.position.y = y;
      const want = act < 0 || act === L.i ? 1 : 0.14; L.op += (want - L.op) * (1 - Math.exp(-dt * 6));
      for (const m of L.mats) { m.opacity = L.op * m.userData.baseOp; m.depthWrite = L.op > 0.9 && m.userData.baseOp > 0.9; }
    }
    // camera: interpolate between layer centres
    const fi = clamp(f - 0.5, 0, 5), i0 = Math.floor(fi), i1 = Math.min(5, i0 + 1), k = smooth(0, 1, fi - i0);
    const yc = (i) => this.layerY(i, gap) + THICK[i] / 2;
    let ty = lerp(yc(i0), yc(i1), k);
    const mob = S.w / S.h < 1;
    let r = mob ? 108 : 66, el = 22, az = -34 + fi * 14;
    const intro = 1 - smooth(0.0, 0.06, p);
    ty = lerp(ty, this.layerY(2, gap) + 3, intro); r = lerp(r, mob ? 150 : 110, intro); el = lerp(el, 30, intro); az = lerp(az, -50, intro);
    ty = lerp(ty, 11, asm); r = lerp(r, mob ? 150 : 100, asm); el = lerp(el, 14, asm); az = lerp(az, 38, asm);
    const a = az * Math.PI / 180, e = el * Math.PI / 180;
    cam.position.set(Math.sin(a) * Math.cos(e) * r + M.x * 3 * (mob ? 0 : 1), ty + Math.sin(e) * r - M.y * 2 * (mob ? 0 : 1), Math.cos(a) * Math.cos(e) * r); cam.lookAt(0, ty, 0); S.setFov(30);
    S.key.position.set(-40, ty + 60, 40); S.keyTarget.position.set(0, ty, 0);
    this.ui.onProgress && this.ui.onProgress(p, f);
    if (S.canvas.style.visibility === 'hidden') S.canvas.style.visibility = '';
  }
  start() { this.stage.start(); } stop() { this.stage.stop(); }
}
export { KEYS, THICK };
