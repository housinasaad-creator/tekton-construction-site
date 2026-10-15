/*
  The model table: eight maquettes on a surveyor's table. Filter chips lift matching models and flatten the rest;
  tap a model and the camera flies to it. A scroll-driven intro lowers the camera from a top-down plan view.
*/
import * as THREE from 'three';
import { Stage, canvasTex, smooth, lerp, clamp, easeOut } from './core.js';
import { buildModel } from './models.js';
import { PROJECTS } from '../data.js';
import { flatLabel } from './parts.js';
import { drawMark } from '../brand.js';

const RING = 26.5, TABLE_R = 44, PL = 17;

function tableTexture() {
  return canvasTex(1536, 1536, (g, w, h) => {
    const c = w / 2, S = w / (TABLE_R * 2 + 4);
    g.fillStyle = '#23272c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(239,236,228,.07)'; g.lineWidth = 1;
    for (let m = -TABLE_R; m <= TABLE_R; m += 4) { g.beginPath(); g.moveTo(c + m * S, 0); g.lineTo(c + m * S, h); g.moveTo(0, c + m * S); g.lineTo(w, c + m * S); g.stroke(); }
    g.strokeStyle = 'rgba(239,236,228,.16)';
    for (const r of [10, 18, 26.5, 35, 41]) { g.beginPath(); g.arc(c, c, r * S, 0, 6.29); g.stroke(); }
    g.strokeStyle = 'rgba(255,107,31,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 42.2 * S, 0, 6.29); g.stroke();
    g.strokeStyle = 'rgba(239,236,228,.55)'; g.lineWidth = 1.5;
    for (let a = 0; a < 360; a += 2) {                                  // degree ticks
      const t = a % 30 === 0 ? 3.2 : a % 10 === 0 ? 2.0 : 1.0, r0 = 42.2, ra = a * Math.PI / 180;
      g.beginPath(); g.moveTo(c + Math.sin(ra) * r0 * S, c - Math.cos(ra) * r0 * S); g.lineTo(c + Math.sin(ra) * (r0 - t) * S, c - Math.cos(ra) * (r0 - t) * S); g.stroke();
    }
    g.fillStyle = '#ff9a57'; g.font = `600 ${Math.round(2.4 * S)}px "IBM Plex Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let a = 0; a < 360; a += 30) { const ra = a * Math.PI / 180, r = 37.6; g.save(); g.translate(c + Math.sin(ra) * r * S, c - Math.cos(ra) * r * S); g.rotate(ra); g.fillText(String(a).padStart(3, '0'), 0, 0); g.restore(); }
    drawMark(g, c, c, 7 * S, 'rgba(239,236,228,.3)', 'rgba(255,107,31,.6)');
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

export class City {
  constructor({ canvas, section, ui, mobile, solo }) {
    this.ui = ui; this.section = section; this.mobile = mobile; this.solo = solo || null;
    this.stage = new Stage(canvas, { mobile, shadows: !mobile, shadowExtent: 62, shadowSize: 2048, landShift: 0, portraitShift: 0, dust: true, exposure: 1.05 });
    this.stage.camera.far = 700; this.stage.camera.updateProjectionMatrix();
    const S = this.stage; S.key.position.set(-50, 78, 40);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.intro = 0; this.introS = 0; this.forceIntro = null;
    this.filter = 'all'; this.selected = null; this.hover = null;
    this.az = 28; this.el = 33; this.r = 94; this.target = new THREE.Vector3(0, 4, 0); this.ls = 0; this.ps = 0;
    this.drag = { on: false, x: 0, moved: 0, v: 0 };
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(); this.items = [];
    this._build();
    this._warm();
    S.add((dt, t) => this._frame(dt, t));
    this._bindInput();
    this._measure(); addEventListener('resize', () => this._measure());
  }

  _build() {
    const sc = this.stage.scene;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.4, 96), [new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.6, metalness: 0.5 }), new THREE.MeshStandardMaterial({ map: tableTexture(), roughness: 0.7, metalness: 0.1 }), new THREE.MeshStandardMaterial({ color: 0x1a1d21 })]);
    top.position.y = -0.2; top.receiveShadow = true; sc.add(top); this.table = top;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R + 1.2, TABLE_R - 6, 6, 96), new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.5, metalness: 0.6 }));
    base.position.y = -3.4; sc.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R + 0.3, 0.28, 8, 120), new THREE.MeshStandardMaterial({ color: 0xff6b1f, emissive: 0xff5a10, emissiveIntensity: 0.5, roughness: 0.4 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.05; sc.add(rim);
    // plinth material + ring (orange when active)
    this.plMat = new THREE.MeshStandardMaterial({ color: 0x30363c, roughness: 0.45, metalness: 0.6 });
    PROJECTS.forEach((p, i) => {
      const a = (i / PROJECTS.length) * Math.PI * 2 + Math.PI / PROJECTS.length, x = Math.sin(a) * RING, z = Math.cos(a) * RING;
      const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = a + (p.id === 'kervan' ? Math.PI / 2 : 0); sc.add(root);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(PL, 0.7, PL), this.plMat); plinth.position.y = 0.35; plinth.receiveShadow = true; plinth.castShadow = true; root.add(plinth);
      const ringM = new THREE.MeshBasicMaterial({ color: 0xff6b1f, transparent: true, opacity: 0, toneMapped: false });
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PL, 0.7, PL)), new THREE.LineBasicMaterial({ color: 0xff6b1f, transparent: true, opacity: 0.35 })); edge.position.y = 0.35; root.add(edge);
      const body = buildModel(p.id); body.position.y = 0.7; root.add(body);
      const ud = body.userData;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(ud.r * 0.62, ud.r * 0.62, ud.h + 2, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0, (ud.h + 2) / 2 + 0.7, 0); pick.userData.id = p.id; root.add(pick);
      const it = { p, a, root, body, plinth, edge, pick, ud, x, z, k: 1, lift: 0, hov: 0, act: 1 };
      this.items.push(it);
    });
    this.worldY = new THREE.Vector3();
    sc.fog = null;
    // soft dust amount reduced here (clean studio)
    if (this.stage.dustMat) this.stage.dustMat.uniforms.uAmt.value = 0.55;
    if (this.solo) this._setupSolo();
  }

  _setupSolo() {
    for (const it of this.items) it.root.visible = it.p.id === this.solo;
    this.table.visible = false; this.stage.scene.children.forEach(o => { if (o.isMesh && o !== this.table && !o.userData) o.visible = false; });
    const it = this.items.find(i => i.p.id === this.solo); if (!it) return;
    it.root.position.set(0, 0, 0); it.root.rotation.y = 0; it.pick.visible = false;
    it.plinth.visible = false; it.edge.visible = false;
    this.stage.scene.traverse(o => { if (o.geometry && o.geometry.type === 'CylinderGeometry' && o.position.y === -3.4) o.visible = false; if (o.geometry && o.geometry.type === 'TorusGeometry' && o.position.y === 0.05) o.visible = false; });
    const g = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.ShadowMaterial({ opacity: 0.32 })); g.rotation.x = -Math.PI / 2; g.position.y = 0.72; g.receiveShadow = true; this.stage.scene.add(g);
    this.soloFrame = { r: Math.max(it.ud.r * 3.3, it.ud.h * 2.0 + it.ud.r * 0.6), ty: it.ud.h * 0.42 };
  }

  _warm() {
    const S = this.stage, sc = S.scene, cam = S.camera, r = S.renderer, hid = [], cull = [];
    S.canvas.style.visibility = 'hidden';
    sc.traverse(o => { if (!o.visible && !(o.material && o.material.visible === false)) hid.push(o); if (o.material && o.material.visible === false) return; o.visible = true; if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } });
    try {
      r.compile(sc, cam);
      sc.traverse(o => { const m = o.material; if (!m) return; for (const mm of (Array.isArray(m) ? m : [m])) for (const k in mm) { const v = mm[k]; if (v && v.isTexture) r.initTexture(v); } });
      r.render(sc, cam); r.clear();
    } catch (e) { /* optional */ }
    for (const o of cull) o.frustumCulled = true;
    for (const o of hid) o.visible = false;
    if (this.solo) this._setupSolo();
  }

  _measure() { const r = this.section.getBoundingClientRect(); this.secTop = scrollY + r.top; this.secH = this.section.offsetHeight; this.vh = innerHeight; this.span = Math.max(1, this.secH - this.vh * 1.0); }
  readIntro() { return clamp((scrollY - this.secTop) / (this.vh * 0.85)); }

  setFilter(f) { this.filter = f; this.ui.onFilter && this.ui.onFilter(f, this.items.filter(i => this._match(i)).length); if (this.selected && !this._match(this.items.find(i => i.p.id === this.selected))) this.select(null); }
  _match(it) { return this.filter === 'all' || it.p.type === this.filter; }
  select(id) {
    if (this.selected === id) return;
    this.selected = id;
    this.ui.onSelect && this.ui.onSelect(id ? this.items.find(i => i.p.id === id).p : null);
    if (id) this.drag.v = 0;
  }

  /* ------------------------------------------------------------ input */
  _bindInput() {
    const cv = this.stage.canvas, d = this.drag;
    const setPtr = (e) => { const r = cv.getBoundingClientRect(); this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    const pick = () => { this.ray.setFromCamera(this.ptr, this.stage.camera); const h = this.ray.intersectObjects(this.items.filter(i => i.root.visible && this._match(i)).map(i => i.pick), false); return h.length ? h[0].object.userData.id : null; };
    cv.addEventListener('pointerdown', (e) => { d.on = true; d.x = e.clientX; d.moved = 0; d.v = 0; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
    cv.addEventListener('pointermove', (e) => {
      setPtr(e);
      if (d.on) { const dx = e.clientX - d.x; d.x = e.clientX; d.moved += Math.abs(dx); if (!this.selected) { this.az -= dx * 0.28; d.v = -dx * 0.28; } }
      else if (e.pointerType === 'mouse') { const id = pick(); if (id !== this.hover) { this.hover = id; cv.style.cursor = id ? 'pointer' : 'grab'; this.ui.onHover && this.ui.onHover(id); } }
    });
    const up = (e) => { if (!d.on) return; d.on = false; if (d.moved < 6) { setPtr(e); const id = pick(); if (id) this.select(id); else if (this.selected) this.select(null); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { d.on = false; });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') this.select(null); });
  }

  /* ------------------------------------------------------------ frame */
  _frame(dt, time) {
    const S = this.stage, d = this.drag;
    // intro from scroll
    const tgt = this.forceIntro !== null ? this.forceIntro : this.readIntro();
    this.intro += (tgt - this.intro) * (this.reduced ? 1 : 1 - Math.exp(-dt * 4.5));
    const ie = smooth(0, 1, this.intro);
    // models: filter state, hover lift, selection
    for (const it of this.items) {
      const on = this._match(it), want = on ? 1 : 0.05;
      it.k += (want - it.k) * (1 - Math.exp(-dt * 6));
      it.act += ((on ? 1 : 0) - it.act) * (1 - Math.exp(-dt * 6));
      const hov = this.hover === it.p.id || this.selected === it.p.id ? 1 : 0; it.hov += (hov - it.hov) * (1 - Math.exp(-dt * 8));
      it.body.scale.y = Math.max(0.04, it.k);
      it.root.position.y = on ? 0.9 * it.act + it.hov * 0.7 : 0;
      it.edge.material.opacity = 0.18 + 0.82 * it.hov * it.act;
      it.body.visible = it.k > 0.045;
    }
    // camera
    if (!d.on && !this.selected) { this.az += (this.reduced ? 0 : dt * 2.2) * (ie > 0.6 ? 1 : 0) + d.v; d.v *= Math.pow(0.04, dt); }
    let el, r, tx = 0, ty = 4, tz = 0, ls = 0, ps = 0;
    const mob = S.w / S.h < 1;
    if (this.solo && this.soloFrame) { el = 24; r = this.soloFrame.r; ty = this.soloFrame.ty; this.az = 32; }
    else if (this.selected) {
      const it = this.items.find(i => i.p.id === this.selected), h = it.ud.h;
      tx = it.x; tz = it.z; ty = h * 0.48 + 1; r = (it.ud.r * 1.7 + h * 1.15) * (mob ? 1.35 : 1.0); el = 20;
      const want = it.a * 180 / Math.PI; let da = ((want - this.az + 540) % 360) - 180; this.az += da * (1 - Math.exp(-dt * 3.2));
      ls = mob ? 0 : 0.14; ps = mob ? 0.3 : 0;
    } else {
      el = lerp(88, mob ? 42 : 33, ie); r = lerp(150, mob ? 170 : 118, ie);
    }
    this._cur = this._cur || { tx, ty, tz, r, el }; const c = this._cur, k = 1 - Math.exp(-dt * (this.selected ? 3.2 : 5));
    c.tx += (tx - c.tx) * k; c.ty += (ty - c.ty) * k; c.tz += (tz - c.tz) * k; c.r += (r - c.r) * k; c.el += (el - c.el) * k;
    this.ls += (ls - this.ls) * k; this.ps += (ps - this.ps) * k;
    if (Math.abs(S.landShift - this.ls) > 1e-3 || Math.abs(S.portraitShift - this.ps) > 1e-3) { S.landShift = this.ls; S.portraitShift = this.ps; S.applyViewOffset(0); }
    const az = this.az * Math.PI / 180, e = c.el * Math.PI / 180, cam = S.camera;
    cam.position.set(c.tx + c.r * Math.sin(az) * Math.cos(e), c.ty + c.r * Math.sin(e), c.tz + c.r * Math.cos(az) * Math.cos(e)); cam.lookAt(c.tx, c.ty, c.tz);
    S.setFov(30); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    S.keyTarget.position.set(0, 0, 0);
    // labels
    if (this.ui.onLabels) this.ui.onLabels(this.items, cam, ie, this.selected, mob);
    if (S.canvas.style.visibility === 'hidden') S.canvas.style.visibility = '';
  }

  start() { this.stage.start(); }
  stop() { this.stage.stop(); }
}
