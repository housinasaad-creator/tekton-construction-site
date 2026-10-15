/*
  The two Site Lab instruments.
  CureLab: one compression-test press and a concrete cylinder whose colour follows its age; the test is time-based.
  ShakeLab: a five-storey shear building on a shake table with optional base isolation, integrated live (mass-normalised, semi-implicit Euler).
  Both are simplified teaching models, not engineering calculations.
*/
import * as THREE from 'three';
import { Stage, smooth, lerp, clamp, rng } from './core.js';
import { makeMats, makeGround } from './parts.js';
import { makePress } from './tower.js';

const UB = new THREE.BoxGeometry(1, 1, 1); UB.translate(0, 0.5, 0);
const CB = new THREE.BoxGeometry(1, 1, 1);
const _wet = new THREE.Color(0x66686b), _dry = new THREE.Color(0xcdc9be);

function baseStage(canvas, mobile, opts = {}) {
  const S = new Stage(canvas, Object.assign({ mobile, shadows: !mobile, shadowExtent: 34, shadowSize: 1024, landShift: 0, portraitShift: 0, dust: false, exposure: 1.05 }, opts));
  S.renderer.setPixelRatio(Math.min(S.quality.dpr, mobile ? 1.25 : 1.5)); S.quality.dpr = Math.min(S.quality.dpr, mobile ? 1.25 : 1.5); S.resize();
  return S;
}
function warm(S) {
  const sc = S.scene, cam = S.camera, r = S.renderer, hid = [], cull = [];
  S.canvas.style.visibility = 'hidden';
  sc.traverse(o => { if (!o.visible) hid.push(o); o.visible = true; if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } });
  try { r.compile(sc, cam); sc.traverse(o => { const m = o.material; if (!m) return; for (const mm of (Array.isArray(m) ? m : [m])) for (const k in mm) { const v = mm[k]; if (v && v.isTexture) r.initTexture(v); } }); r.render(sc, cam); r.clear(); } catch (e) { /* optional */ }
  for (const o of cull) o.frustumCulled = true; for (const o of hid) o.visible = false;
}

/* ================================================================== CURE LAB */
export class CureLab {
  constructor({ canvas, mobile, ui }) {
    this.ui = ui; this.mobile = mobile; const S = this.stage = baseStage(canvas, mobile);
    this.mats = makeMats(); const sc = S.scene;
    this.ground = makeGround(300); this.ground.material.uniforms.uBase.value.set(0x3c4046); this.ground.material.uniforms.uGrid.value = 0.4; this.ground.material.uniforms.uFade.value.set(110, 30); this.ground.position.y = -0.02; sc.add(this.ground);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.35 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.receiveShadow = true; sc.add(sh);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 8), this.mats.concreteDark); bench.position.y = 0.4; bench.receiveShadow = bench.castShadow = true; sc.add(bench);
    this.press = makePress(this.mats, 'lab', null); this.press.group.position.set(0, 0.8, 0); sc.add(this.press.group);
    this.test = { t: -1, broken: false, failed: false }; this.sf = 0; this.az = 10; this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', (e) => { this.mouse.tx = (e.clientX / innerWidth - 0.5) * 2; this.mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    this._applyPress(0, 0, 0, 0);
    warm(S); S.add((dt, t) => this._frame(dt, t));
  }
  setAge(sFrac) { this.sf = sFrac; }
  run() { if (this.test.t >= 0 && !this.test.broken) return; this.reset(); this.test.t = 0; }
  reset() { this.test = { t: -1, broken: false, failed: false }; this._applyPress(0, 0, 0, 0); }
  _applyPress(approach, crush, fail, retract) {
    const pr = this.press; let y = lerp(9.8, 7.4 - 0.14 * crush, approach); y = lerp(y, 9.8, retract);
    pr.platen.position.y = y; pr.ram.position.y = y + 2.2;
    pr.crackMat.opacity = Math.pow(crush, 1.5) * 0.95;
    const sx = 1 + fail * 0.02, sy = 1 - 0.02 * crush; pr.spec.scale.set(sx, sy, sx); pr.crack.scale.set(sx * 1.004, sy, sx * 1.004);
    const tau = fail > 0.01 ? clamp((this.test.tFail || 0)) : 0;
    for (const s of pr.shards) { s.m.visible = tau > 0.001; if (s.m.visible) { s.m.position.set(s.vx * tau * 1.4, 5 + s.vy * tau * 2 - 14 * tau * tau, 1.0 + s.vz * tau * 1.2); s.m.position.y = Math.max(0.5, s.m.position.y); s.m.rotation.set(tau * s.rx, tau * s.ry, 0); } }
    pr.puff.material.opacity = Math.sin(Math.PI * clamp(this.test.tFail || 0)) * 0.6 * (fail > 0.01 ? 1 : 0); pr.puff.scale.setScalar(7 + 6 * (this.test.tFail || 0));
  }
  _frame(dt, time) {
    const S = this.stage, T = this.test, M = this.mouse, pr = this.press;
    M.x += (M.tx - M.x) * (1 - Math.exp(-dt * 3)); M.y += (M.ty - M.y) * (1 - Math.exp(-dt * 3));
    pr.specMat.color.copy(_wet).lerp(_dry, this.sf); pr.specMat.roughness = lerp(0.42, 0.93, this.sf);
    if (T.t >= 0 && !T.broken) {
      T.t = Math.min(1, T.t + dt / 4.6);
      const t = T.t, approach = smooth(0, 0.3, t), crush = smooth(0.3, 0.74, t), fail = smooth(0.72, 0.76, t), retract = smooth(0.9, 1, t);
      if (fail > 0.5 && !T.failed) { T.failed = true; T.tFail = 0; this.ui.onFail && this.ui.onFail(); }
      if (T.failed) T.tFail = Math.min(1, (T.tFail || 0) + dt / 1.6);
      this._applyPress(approach, crush, fail, retract);
      this.ui.onProgress && this.ui.onProgress(t);
      if (t >= 1) { T.broken = true; this.ui.onDone && this.ui.onDone(); }
    } else if (T.broken) { T.tFail = Math.min(1, (T.tFail || 0) + dt / 1.6); this._applyPress(1, 1, 1, 1); }
    // camera: slow breathing orbit
    this.az = 10 + Math.sin(time * 0.15) * 12 + M.x * 6;
    const mob = S.w / S.h < 1, r = mob ? 52 : 34, el = 10 + M.y * -2, a = this.az * Math.PI / 180, e = el * Math.PI / 180, ty = 6.4;
    const cam = S.camera; cam.position.set(Math.sin(a) * Math.cos(e) * r, ty + Math.sin(e) * r, Math.cos(a) * Math.cos(e) * r); cam.lookAt(0, ty, 0); S.setFov(30);
    S.key.position.set(-24, 40, 26); S.keyTarget.position.set(0, 4, 0);
    if (S.canvas.style.visibility === 'hidden') S.canvas.style.visibility = '';
  }
  start() { this.stage.start(); } stop() { this.stage.stop(); }
}

/* ================================================================== SHAKE LAB */
const H = 3.2, NF = 5, EX = 4.0;
const K = 1951, KISO = 36.2, CISO = 5.39, CS = K * 2 * 0.03 / 12.57, M0 = 1.2;
export class ShakeLab {
  constructor({ canvas, mobile, ui }) {
    this.ui = ui; this.mobile = mobile; const S = this.stage = baseStage(canvas, mobile, { shadowExtent: 40 });
    this.mats = makeMats(); const sc = S.scene, M = this.mats;
    this.ground = makeGround(300); this.ground.material.uniforms.uBase.value.set(0x3c4046); this.ground.material.uniforms.uGrid.value = 0.45; this.ground.material.uniforms.uFade.value.set(120, 30); this.ground.position.y = -0.02; sc.add(this.ground);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.35 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.receiveShadow = true; sc.add(sh);
    // fixed pit + rams
    const pit = new THREE.Mesh(UB, M.frame); pit.scale.set(22, 0.5, 15); pit.position.y = 0; pit.receiveShadow = true; sc.add(pit);
    for (const x of [-7, 7]) { const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 14), M.steel); ram.rotation.z = Math.PI / 2; ram.scale.set(1, 6, 1); ram.position.set(x > 0 ? 12.5 : -12.5, 0.9, 0); sc.add(ram); }
    this.table = new THREE.Group(); sc.add(this.table);
    const plate = new THREE.Mesh(UB, new THREE.MeshStandardMaterial({ color: 0x31373d, metalness: 0.6, roughness: 0.4 })); plate.scale.set(15, 0.6, 12); plate.position.y = 0.5; plate.castShadow = plate.receiveShadow = true; this.table.add(plate);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(15, 0.6, 12)), new THREE.LineBasicMaterial({ color: 0xff6b1f })); rim.position.y = 0.8; this.table.add(rim);
    // isolators / rigid blocks
    this.isoMat = new THREE.MeshStandardMaterial({ color: 0xff6b1f, roughness: 0.55 }); this.rigidMat = new THREE.MeshStandardMaterial({ color: 0x4a5057, metalness: 0.6, roughness: 0.45 });
    this.isos = []; const pos = [[-3.2, -3.2], [3.2, -3.2], [3.2, 3.2], [-3.2, 3.2], [0, -3.2], [0, 3.2]];
    pos.forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 16), this.isoMat); m.castShadow = true; m.userData = { x, z }; sc.add(m); this.isos.push(m); });
    // building
    this.slabs = []; this.cols = []; this.colMats = [];
    const slabMat = M.white.clone();
    const mkSlab = (y, thick, w) => { const s = new THREE.Mesh(UB, slabMat); s.scale.set(w, thick, 9.2); s.castShadow = s.receiveShadow = true; s.position.y = y; sc.add(s); const e = new THREE.LineSegments(new THREE.EdgesGeometry(UB), new THREE.LineBasicMaterial({ color: 0x77736a, transparent: true, opacity: 0.6 })); s.add(e); return s; };
    this.baseSlab = mkSlab(1.9, 0.4, 9.6);
    for (let j = 1; j <= NF; j++) this.slabs.push(mkSlab(2.3 + j * H - 0.35, 0.35, 9.2));
    for (let j = 0; j < NF; j++) { const cm = new THREE.MeshStandardMaterial({ color: 0xcfcabd, roughness: 0.7 }); this.colMats.push(cm); for (const [x, z] of [[-4, -4], [4, -4], [4, 4], [-4, 4]]) { const c = new THREE.Mesh(CB, cm); c.castShadow = true; c.userData = { j, x, z }; sc.add(c); this.cols.push(c); } }
    this.glassBands = []; const gm = M.glass.clone(); gm.opacity = 0.5; for (let j = 0; j < NF; j++) { const g = new THREE.Mesh(CB, gm); g.scale.set(8.0, H - 0.9, 0.06); g.userData = { j }; sc.add(g); this.glassBands.push(g); const g2 = g.clone(); g2.userData = { j, back: true }; sc.add(g2); this.glassBands.push(g2); }
    // datum rod (does not move): a reading scale next to the table
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.12, 19, 0.12), M.orange); rod.position.set(-11.5, 11, 6.5); sc.add(rod);
    for (let j = 0; j <= NF; j++) { const t = new THREE.Mesh(UB, M.orange); t.scale.set(1.2, 0.08, 0.12); t.position.set(-11.5, 2.3 + j * H, 6.5); sc.add(t); }
    this.iso = true; this.pga = 0.35; this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this._initSim(); this._pose();
    addEventListener('pointermove', (e) => { this.mouse.tx = (e.clientX / innerWidth - 0.5) * 2; this.mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    warm(S); S.add((dt, t) => this._frame(dt, t));
  }

  setIsolation(on) { this.iso = !!on; if (!this.running) this._initSim(); this._applyIsoLook(); this._pose(); }
  setPga(g) { this.pga = g; }
  _applyIsoLook() { for (const m of this.isos) m.material = this.iso ? this.isoMat : this.rigidMat; }

  _initSim() {
    this.u = new Float64Array(NF + 1); this.v = new Float64Array(NF + 1); this.t = 0; this.running = false; this.done = false;
    this.maxDrift = 0; this.maxStroke = 0; this.series = []; this.ag = 0; this.xg = 0; this._acc = 0;
    // synthetic ground motion: broadband, peaked near 1.8 Hz, normalised to the chosen PGA
    const R = rng(1234 + Math.round(this.pga * 100)); this.gm = [];
    for (let i = 0; i < 16; i++) { const f = 0.45 + i * 0.5 + R() * 0.3, A = 1 / (1 + Math.pow((f - 1.8) / 1.6, 2)); this.gm.push({ w: 2 * Math.PI * f, A, ph: R() * 6.283 }); }
    let mx = 0; for (let t = 0; t < 14; t += 0.01) mx = Math.max(mx, Math.abs(this._ag(t, 1)));
    this.gmScale = this.pga * 9.81 / mx;
  }
  _env(t) { return t < 1.6 ? Math.pow(t / 1.6, 2) : t < 8 ? 1 : t < 12.5 ? 0.5 + 0.5 * Math.cos((t - 8) / 4.5 * Math.PI) : 0; }
  _ag(t, sc) { let a = 0; for (const c of this.gm) a += c.A * Math.cos(c.w * t + c.ph); return a * this._env(t) * (sc === undefined ? this.gmScale : sc); }
  _xg(t) { let a = 0; for (const c of this.gm) a += -c.A / (c.w * c.w) * Math.cos(c.w * t + c.ph); return a * this._env(t) * this.gmScale; }
  start() { if (this.running) return; this._initSim(); this.running = true; this.ui.onStart && this.ui.onStart(); }
  reset() { this._initSim(); this._pose(); this.ui.onReset && this.ui.onReset(); }
  startLoop() { this.stage.start(); } stopLoop() { this.stage.stop(); }

  _step(dtS) {
    const u = this.u, v = this.v, iso = this.iso, ag = this._ag(this.t), a = new Float64Array(NF + 1);
    // spring/damper forces
    const F = new Float64Array(NF + 1);
    if (iso) { let f = KISO * u[0] + CISO * v[0]; const L = 0.55; if (Math.abs(u[0]) > L) f += 4000 * (Math.abs(u[0]) - L) * Math.sign(u[0]); F[0] -= f; }
    for (let i = 1; i <= NF; i++) { const f = K * (u[i] - u[i - 1]) + CS * (v[i] - v[i - 1]); F[i] -= f; F[i - 1] += f; }
    for (let i = iso ? 0 : 1; i <= NF; i++) { const m = i === 0 ? M0 : 1; a[i] = F[i] / m - ag; }
    for (let i = iso ? 0 : 1; i <= NF; i++) { v[i] += a[i] * dtS; u[i] += v[i] * dtS; }
    if (!iso) { u[0] = 0; v[0] = 0; }
    this.t += dtS; this.ag = ag;
  }

  _pose() {
    const u = this.u, xg = (this.running || this.done) ? this._xg(this.t) : 0;
    const tbx = xg * EX, bx0 = (xg + u[0]) * EX;
    this.table.position.x = tbx;
    for (const m of this.isos) { const dx = bx0 - tbx, h = 0.8, len = Math.hypot(h, dx); m.position.set((tbx + bx0) / 2 + m.userData.x, 1.5, m.userData.z); m.rotation.z = -Math.atan2(dx, h); m.scale.set(1, len, 1); }
    this.baseSlab.position.x = bx0;
    const px = [bx0]; for (let j = 1; j <= NF; j++) px.push((xg + u[j]) * EX);
    for (let j = 1; j <= NF; j++) this.slabs[j - 1].position.x = px[j];
    const hc = H - 0.35;
    for (const c of this.cols) {
      const j = c.userData.j, yb = 2.3 + j * H, dx = px[j + 1] - px[j], len = Math.hypot(hc, dx);
      c.position.set((px[j] + px[j + 1]) / 2 + c.userData.x, yb + hc / 2, c.userData.z); c.rotation.z = -Math.atan2(dx, hc); c.scale.set(0.5, len, 0.5);
    }
    let maxD = 0;
    for (let j = 0; j < NF; j++) {
      const d = Math.abs((u[j + 1] - u[j]) / H); maxD = Math.max(maxD, d);
      this.colMats[j].color.setHex(d < 0.005 ? 0xcfcabd : d < 0.01 ? 0xffb27a : 0xff5a3a);
    }
    for (const g of this.glassBands) {
      const j = g.userData.j, yb = 2.3 + j * H, dx = px[j + 1] - px[j];
      g.position.set((px[j] + px[j + 1]) / 2, yb + hc / 2, g.userData.back ? -4.3 : 4.3); g.rotation.z = -Math.atan2(dx, hc);
    }
    return maxD;
  }

  _frame(dt, time) {
    const S = this.stage, M = this.mouse;
    M.x += (M.tx - M.x) * (1 - Math.exp(-dt * 3)); M.y += (M.ty - M.y) * (1 - Math.exp(-dt * 3));
    if (this.running) {
      const target = Math.min(dt, 0.05); let rem = target; const dtS = 1 / 600;
      while (rem > 1e-9) { const d = Math.min(dtS, rem); this._step(d); rem -= d; }
      let mx = 0; for (let j = 0; j < NF; j++) mx = Math.max(mx, Math.abs((this.u[j + 1] - this.u[j]) / H)); this.maxDrift = Math.max(this.maxDrift, mx);
      this.maxStroke = Math.max(this.maxStroke, Math.abs(this.u[0]));
      this._acc += target; if (this._acc >= 1 / 30) { this._acc = 0; this.series.push([this.t, this.ag / 9.81, (this.u[NF] - this.u[0]) * 100]); }
      this.ui.onTick && this.ui.onTick({ t: this.t, drift: mx, maxDrift: this.maxDrift, stroke: this.maxStroke, ag: this.ag / 9.81, series: this.series });
      if (this.t >= 14) { this.running = false; this.done = true; this.ui.onDone && this.ui.onDone({ maxDrift: this.maxDrift, stroke: this.maxStroke, iso: this.iso, pga: this.pga, series: this.series }); }
    }
    this._pose();
    if (this.done || !this.running) { /* settle gently after the quake */ for (let i = 0; i <= NF; i++) { this.u[i] *= 0.98; this.v[i] *= 0.98; } }
    const mob = S.w / S.h < 1, r = mob ? 70 : 54, el = 9 + M.y * -2, az = 18 + M.x * 6 + Math.sin(time * 0.12) * 4, a = az * Math.PI / 180, e = el * Math.PI / 180, ty = 9.4;
    const cam = S.camera; cam.position.set(Math.sin(a) * Math.cos(e) * r, ty + Math.sin(e) * r, Math.cos(a) * Math.cos(e) * r); cam.lookAt(0, ty, 0); S.setFov(30);
    S.key.position.set(-30, 50, 32); S.keyTarget.position.set(0, 6, 0);
    if (S.canvas.style.visibility === 'hidden') S.canvas.style.visibility = '';
  }
}
