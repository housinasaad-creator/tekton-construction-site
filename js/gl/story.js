/*
  The home journey. A line becomes a plan (1), the plan rises into a building under a climbing crane (2), the concrete cures
  for 28 days and two cylinders are crushed (3), the skin turns to X-ray and shows the structure, the MEP and the load path (4),
  and at dusk the key is turned and the building lights up (5).
  Progress p is tied to scroll (with cinematic inertia); the final key ceremony is optional and time-based.
*/
import * as THREE from 'three';
import { Stage, smooth, lerp, clamp, easeOut } from './core.js';
import { makeMats, makeGround, glowSprite } from './parts.js';
import { Tower, Crane, makeSiteProps, makeSkyline, makePress, DIM } from './tower.js';
import { buildPlan } from './plan.js';

const { N, H } = DIM;
/* camera keys: [p, target x,y,z, radius, azimuth°, elevation°, fov] */
const PRESS = new THREE.Vector3(-62, 0, 34);
const KEYS = [
  [0.00, 0, 0, 0, 92, 0, 86, 30],
  [0.07, 0, 0, 2, 74, -4, 82, 30],
  [0.145, 0, 2, 0, 80, -16, 58, 30],
  [0.175, 0, 5, 0, 86, -28, 26, 30],
  [0.30, 0, 17, 0, 104, 12, 19, 30],
  [0.43, 0, 22, 0, 124, 36, 13, 30],
  [0.47, -26, 12, 22, 118, 18, 12, 30],
  [0.50, PRESS.x + 0.4, 7.6, PRESS.z, 56, 7, 8, 30],
  [0.60, PRESS.x + 0.4, 7.6, PRESS.z, 52, -6, 9, 30],
  [0.645, PRESS.x + 0.4, 7.6, PRESS.z, 54, -4, 10, 30],
  [0.69, 0, 14, 0, 104, 18, 13, 30],
  [0.78, 0, 15, 0, 120, 62, 18, 30],
  [0.84, 0, 16, 0, 132, 74, 9, 30],
  [0.92, 0, 16, 0, 138, 24, 6, 30],
  [1.00, 0, 16, 0, 118, 0, 5, 28]
];
const CH = [0.0, 0.155, 0.46, 0.665, 0.835];
const P_PLAN = [0.02, 0.145], P_BUILD = [0.165, 0.435], P_CURE = [0.485, 0.64];
const F28 = 31.6;
const strength = (d) => F28 * (d / (4 + 0.85 * d)) / (28 / (4 + 0.85 * 28));
const dayOf = (u) => u <= 0.36 ? 7 * u / 0.36 : u <= 0.86 ? 7 + (u - 0.36) / 0.5 * 21 : 28;

const _wetC = new THREE.Color(0x66686b), _dryC = new THREE.Color(0xcdc9be);
const _fogDay = new THREE.Color(0x232830), _fogNight = new THREE.Color(0x0a0e18);
const DAY = { key: new THREE.Color(0xfff1de), rim: new THREE.Color(0xffb27a), skyH: new THREE.Color(0xcfdde8), grdH: new THREE.Color(0x3a3733), base: new THREE.Color(0x3a3d41) };
const NIGHT = { key: new THREE.Color(0x7d98d8), rim: new THREE.Color(0x5a78c0), skyH: new THREE.Color(0x24324f), grdH: new THREE.Color(0x0a0c12), base: new THREE.Color(0x14171c) };

export class Story {
  constructor({ canvas, section, ui, sfx, mobile, preserve }) {
    this.ui = ui; this.section = section; this.sfx = sfx; this.mobile = mobile;
    this.stage = new Stage(canvas, { mobile, preserve, shadowExtent: 60, shadowSize: 2048, landShift: 0.12 });
    this.p = 0; this.ps = 0; this.forceP = null; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.tail = 0.5; this.lastCh = -1; this.lastCycle = 0;
    this.keyc = { active: false, done: false, t: 0, amt: 0, auto: false };
    this.sys = { water: true, fire: true, power: true, hvac: true };
    this._ev = {};
    this._build();
    this._warm();
    this.stage.add((dt, t) => this._frame(dt, t));
    this._bindInput();
    this._measure();
    this._onResize = () => this._measure(); addEventListener('resize', this._onResize);
  }

  _build() {
    const S = this.stage, sc = S.scene;
    this.mats = makeMats();
    this.ground = makeGround(); this.ground.position.y = -0.02; sc.add(this.ground);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.ShadowMaterial({ opacity: 0.38 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.receiveShadow = true; sc.add(sh); this.shadowPlane = sh;
    this.plan = buildPlan(); this.planGroup = this.plan.build(); sc.add(this.planGroup);
    this.tower = new Tower(this.mats, { mobile: this.mobile }); sc.add(this.tower.group);
    this.crane = new Crane(this.mats); sc.add(this.crane.group);
    this.props = makeSiteProps(this.mats); sc.add(this.props);
    this.skyline = makeSkyline(this.mobile ? 36 : 60); sc.add(this.skyline);
    // presses on a lab bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 7.6), this.mats.concreteDark); bench.position.set(PRESS.x, 0.4, PRESS.z); bench.receiveShadow = bench.castShadow = true;
    this.pressGroup = new THREE.Group(); this.pressGroup.add(bench);
    this.p7 = makePress(this.mats, '7'); this.p28 = makePress(this.mats, '28');
    this.p7.group.position.set(PRESS.x - 5.2, 0.8, PRESS.z); this.p28.group.position.set(PRESS.x + 5.6, 0.8, PRESS.z);
    this.pressGroup.add(this.p7.group, this.p28.group); sc.add(this.pressGroup);
    // night glow under the tower
    this.towerGlow = glowSprite(0xffb070, 90, 0.0); this.towerGlow.position.set(0, 3, 0); sc.add(this.towerGlow);
    this.cureSteam = this._makeSteam(); sc.add(this.cureSteam);
    sc.fog = null;
    this.tower.setCure(0.12);
  }

  /* curing vapour rising from the fresh slabs */
  _makeSteam() {
    const n = this.mobile ? 48 : 100, a = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - .5) * 26; a[i * 3 + 1] = 0; a[i * 3 + 2] = (Math.random() - .5) * 18; s[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uTop: { value: N * H }, uPx: { value: 1 } },
      vertexShader: `uniform float uTime, uAmt, uTop; attribute float aSeed; varying float vA;
        void main(){ float k = fract(uTime*(0.05+aSeed*.06) + aSeed*9.0); float y = uTop + 0.5 + k*7.0;
          vec3 p = vec3(position.x + sin(uTime*.4+aSeed*20.)*1.4, y, position.z + cos(uTime*.3+aSeed*30.)*1.2);
          vec4 mv = modelViewMatrix*vec4(p,1.0); vA = uAmt * sin(k*3.1416) * (.4+.6*aSeed);
          gl_PointSize = (30.0 + aSeed*40.0) * (1.0 + k*1.6) / max(-mv.z*.012, .4); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord-.5; float a = smoothstep(.5,.0,length(c)); gl_FragColor = vec4(.82,.86,.9, a*a*vA*.22); }`
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; pts.visible = false; return pts;
  }

  /* Pre-warm: compile every shader and upload every texture/geometry once while the loader is still up. Then hide what each chapter does not need. */
  _warm() {
    const S = this.stage, sc = S.scene, cam = S.camera, r = S.renderer, hid = [], cull = [];
    S.canvas.style.visibility = 'hidden';
    sc.traverse(o => { if (!o.visible) hid.push(o); o.visible = true; if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } });
    this.tower.setBuild(1); this.tower.xray(1); this.tower.setLights(N + 1);
    try {
      r.compile(sc, cam);
      sc.traverse(o => { const m = o.material; if (!m) return; for (const mm of (Array.isArray(m) ? m : [m])) for (const k in mm) { const v = mm[k]; if (v && v.isTexture) r.initTexture(v); } });
      r.render(sc, cam); r.clear();
    } catch (e) { /* warming is optional */ }
    this.tower.setBuild(0); this.tower.xray(0); this.tower.setLights(0);
    for (const o of cull) o.frustumCulled = true;
    for (const o of hid) o.visible = false;
  }

  _bindInput() {
    const M = this.mouse;
    this._onMove = (e) => { M.tx = (e.clientX / innerWidth - 0.5) * 2; M.ty = (e.clientY / innerHeight - 0.5) * 2; };
    addEventListener('pointermove', this._onMove, { passive: true });
  }

  _measure() {
    const r = this.section.getBoundingClientRect();
    this.secTop = scrollY + r.top; this.secH = this.section.offsetHeight; this.vh = innerHeight;
    this.span = Math.max(1, this.secH - this.vh * (1 + this.tail));
    this.lockY = this.secTop + this.span;
  }
  setP(p, instant) { this.forceP = p; if (instant) this.ps = p; }
  readScroll() { return clamp((scrollY - this.secTop) / this.span); }

  turnKey(auto = false) {
    const k = this.keyc; if (k.done) return;
    k.done = true; k.t = 0; k.auto = auto; this.sfx.key(); this._shake = 1;
    this.ui.onKey && this.ui.onKey('done');
  }

  /* ------------------------------------------------------------ camera */
  _cam() {
    const ps = this.ps; let i = 0; while (i < KEYS.length - 2 && ps > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], e = smooth(a[0], b[0], ps);
    const tx = lerp(a[1], b[1], e), ty = lerp(a[2], b[2], e), tz = lerp(a[3], b[3], e), r = lerp(a[4], b[4], e);
    const az = lerp(a[5], b[5], e) * Math.PI / 180, el = lerp(a[6], b[6], e) * Math.PI / 180, fov = lerp(a[7], b[7], e);
    const cam = this.stage.camera, M = this.mouse, k = this.mobile ? 0 : 1;
    let px = tx + r * Math.sin(az) * Math.cos(el) + M.x * r * 0.03 * k, py = ty + r * Math.sin(el) - M.y * r * 0.018 * k, pz = tz + r * Math.cos(az) * Math.cos(el);
    if (this._shake > 0) { px += Math.sin(this.stage.time * 70) * this._shake * 0.35; py += Math.cos(this.stage.time * 61) * this._shake * 0.25; }
    cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); this.stage.setFov(fov);
    // sun follows the target so shadows stay sharp where we look
    const kp = this.stage.key.position, kt = this.stage.keyTarget.position;
    kt.set(tx, 0, tz); kp.set(tx - 40, 62, tz + 34);
  }

  /* ------------------------------------------------------------ frame */
  _frame(dt, time) {
    const S = this.stage, tw = this.tower, kc = this.keyc, M = this.mouse;
    const target = this.forceP !== null ? this.forceP : this.readScroll();
    this.p = target;
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 4.2);
    this.ps += (target - this.ps) * k; if (Math.abs(target - this.ps) < 1e-4) this.ps = target;
    const p = this.ps;
    M.x += (M.tx - M.x) * (1 - Math.exp(-dt * 3)); M.y += (M.ty - M.y) * (1 - Math.exp(-dt * 3));
    if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 2.5);

    let ch = 0; for (let i = 0; i < CH.length; i++) if (p >= CH[i] - 1e-6) ch = i;
    if (ch !== this.lastCh) { this.lastCh = ch; this.ui.onChapter && this.ui.onChapter(ch); }

    // ---- visibility culling: only what the current chapter can see is drawn
    const showPlan = p < 0.34, showTower = p > 0.135, showCrane = p > 0.15 && p < 0.72, showPress = p > 0.4 && p < 0.7;
    this.planGroup.visible = showPlan; tw.group.visible = showTower; this.crane.group.visible = showCrane;
    this.props.visible = p > 0.13 && p < 0.9; this.pressGroup.visible = showPress; this.skyline.visible = p > 0.78;

    // ---- 1 · the plan draws itself
    this.intro = Math.min(1, (this.intro || 0) + dt / 3.4);
    const pd = Math.max(smooth(P_PLAN[0], P_PLAN[1], p), easeOut(this.intro) * 0.075);
    if (showPlan) {
      this.plan.setDraw(pd * this.plan.total, 1 - smooth(0.16, 0.3, p) * 0.9);
      const rate = Math.abs(target - this.ps) * 60;
      this.sfx.pencil(p > 0.02 && p < 0.15 ? clamp(rate * 3) * 0.8 : 0);
      if (this.ui.onPlan) { const pt = this.plan.pointAt(pd * this.plan.total); this._emit('plan', `X ${pt[0].toFixed(2).padStart(6, ' ')}   Z ${pt[1].toFixed(2).padStart(6, ' ')}`, p < 0.16, this.ui.onPlan); }
    }

    // ---- 2 · the building rises under the crane
    const tb = clamp((p - P_BUILD[0]) / (P_BUILD[1] - P_BUILD[0]));
    tw.setBuild(tb);
    this._craneAnim(p, tb, time);
    if (this.ui.onRise) {
      const lvl = Math.min(N, Math.max(0, Math.ceil(tw.topY / H - 0.02)));
      this._emit('rise', lvl + '|' + Math.round(tw.topY), p > 0.16 && p < 0.465, (v, show) => this.ui.onRise({ level: lvl, h: tw.topY, show }));
    }

    // ---- 3 · the concrete cures: two cylinders broken at 7 and 28 days
    const u = clamp((p - P_CURE[0]) / (P_CURE[1] - P_CURE[0])), day = dayOf(u), inCure = p > 0.47 && p < 0.665;
    const sFrac = day / (4 + 0.85 * day) / (28 / (4 + 0.85 * 28));
    const cureAll = p < 0.485 ? 0.12 : p > 0.64 ? 1 : lerp(0.12, 1, sFrac);
    tw.setCure(cureAll);
    this._presses(p, u, day, sFrac, time, dt, showPress);
    const steamAmt = smooth(0.43, 0.46, p) * (1 - smooth(0.5, 0.58, p)) * 0.9;
    this.cureSteam.visible = steamAmt > 0.02; if (this.cureSteam.visible) { this.cureSteam.material.uniforms.uAmt.value = steamAmt; this.cureSteam.material.uniforms.uTime.value = time; }
    if (this.ui.onCure) this._emit('cure', Math.round(day * 10) + '|' + (u > 0.385 ? 1 : 0) + (u > 0.91 ? 1 : 0), inCure && p > 0.484, (v, show) => this.ui.onCure({ show, day, mpa: strength(day), pct: strength(day) / F28, t7: u > 0.385 ? strength(7) : null, t28: u > 0.905 ? strength(28) : null }));
    if (this._lastU !== undefined) {
      if (this._lastU < 0.385 && u >= 0.385 && showPress) { this.sfx.crack(0.9); }
      if (this._lastU < 0.905 && u >= 0.905 && showPress) { this.sfx.crack(1.25); }
    }
    this._lastU = u;
    this.sfx.press(showPress && ((u > 0.3 && u < 0.39) || (u > 0.84 && u < 0.91)) ? 0.8 : 0);
    this.sfx.rumble(p > 0.17 && p < 0.44 && Math.abs(target - this.ps) > 0.0004 ? 0.4 : 0);

    // ---- 4 · X-ray
    const xr = smooth(0.665, 0.72, p) * (1 - smooth(0.815, 0.86, p));
    tw.xray(xr, smooth(0.8, 0.9, p)); tw.update(time);
    this.ground.material.uniforms.uAlpha.value = lerp(1, 0.42, xr);
    this.shadowPlane.visible = xr < 0.6;
    if (this.ui.onXray) this._emit('xray', xr > 0.5 ? 1 : 0, xr > 0.5, (v, show) => this.ui.onXray(show));

    // ---- 5 · dusk and night; the key
    const night = smooth(0.80, 0.9, p);
    this._lighting(night, xr, p, dt);
    this._keyCeremony(p, dt, night);
    this._tint(p);
    this._cam();
    this.ui.onProgress && this.ui.onProgress(p, ch);
    if (S.canvas.style.visibility === 'hidden') S.canvas.style.visibility = '';
  }

  _emit(name, val, show, fn) {
    const key = val + '|' + (show ? 1 : 0);
    if (this._ev[name] === key) return; this._ev[name] = key; fn(val, show);
  }

  /* ------------------------------------------------------------ crane */
  _craneAnim(p, tb, time) {
    const cr = this.crane, tw = this.tower;
    if (!cr.group.visible) return;
    let mastH = Math.max(16, tw.topY + 10);
    if (p > 0.64) mastH = lerp(mastH, 6, smooth(0.64, 0.70, p));
    const SUP = -Math.PI / 2, TOW = -2.96;
    let slew, trolley, drop, load = false;
    const h = Math.ceil(mastH / cr.BAY) * cr.BAY, carry = Math.max(1.5, h - tw.topY - 8.1), place = Math.max(1.5, h - tw.topY - 3.6), ground = h - 3.1, sTr = 0.62, tTr = 0.445;
    if (tb > 0 && tb < 1) {
      const raw = tb * 26, ph = raw % 1, cyc = Math.floor(raw);
      if (cyc !== this.lastCycle) { if (Math.abs(cyc - this.lastCycle) === 1 && this.stage.running) this.sfx.clank(0.8); this.lastCycle = cyc; }
      const s = (a, b) => smooth(a, b, ph);
      slew = lerp(SUP, TOW, s(0.34, 0.62)) + (ph > 0.84 ? (SUP - TOW) * s(0.84, 1.0) : 0);
      trolley = lerp(sTr, tTr, s(0.34, 0.62)) + (ph > 0.84 ? (sTr - tTr) * s(0.84, 1.0) : 0);
      drop = ph < 0.18 ? lerp(carry, ground, s(0.0, 0.18)) : ph < 0.34 ? lerp(ground, carry, s(0.18, 0.34)) : ph < 0.62 ? carry : ph < 0.8 ? lerp(carry, place, s(0.62, 0.8)) : lerp(place, carry, s(0.84, 0.96));
      load = ph > 0.14 && ph < 0.82;
    } else {
      slew = -2.2 + Math.sin(time * 0.15) * 0.12 + (p > 0.64 ? 0.5 * smooth(0.64, 0.7, p) : 0); trolley = 0.5; drop = Math.max(3, h * 0.3);
    }
    cr.setPose(mastH, slew, trolley, drop, load);
  }

  /* ------------------------------------------------------------ cylinders */
  _presses(p, u, day, sFrac, time, dt, vis) {
    if (!vis) return;
    const one = (pr, a0, a1, c0, c1, f0, f1, r0, r1, sf, id) => {
      const approach = smooth(a0, a1, u), crush = smooth(c0, c1, u), fail = smooth(f0, f1, u), retr = smooth(r0, r1, u);
      let y = lerp(9.8, 7.4 - 0.14 * crush, approach); y = lerp(y, 9.8, retr);
      pr.platen.position.y = y; pr.ram.position.y = y + 2.2;
      pr.crackMat.opacity = Math.pow(crush, 1.5) * 0.95;
      pr.spec.scale.set(1 + fail * 0.02, 1 - 0.02 * crush, 1 + fail * 0.02); pr.crack.scale.set(1 + fail * 0.02, 1 - 0.02 * crush, 1 + fail * 0.02); pr.crack.scale.x *= 1.004; pr.crack.scale.z *= 1.004;
      pr.specMat.color.copy(_wetC).lerp(_dryC, sf);
      pr.specMat.roughness = lerp(0.42, 0.93, sf);
      const tau = smooth(f0 - 0.004, f0 + 0.075, u);
      for (const s of pr.shards) {
        s.m.visible = tau > 0.001;
        if (s.m.visible) { s.m.position.set(s.vx * tau * 1.4, 5 + s.vy * tau * 2 - 14 * tau * tau, 1.0 + s.vz * tau * 1.2); s.m.position.y = Math.max(0.5, s.m.position.y); s.m.rotation.set(tau * s.rx, tau * s.ry, 0); }
      }
      pr.tag.material.opacity = 0.35 + 0.65 * approach;
      pr.puff.material.opacity = Math.sin(Math.PI * smooth(f0 - 0.002, f0 + 0.07, u)) * 0.6; pr.puff.scale.setScalar(7 + 6 * smooth(f0, f0 + 0.07, u));
    };
    const s7 = Math.min(day, 7) / (4 + 0.85 * Math.min(day, 7)) / (28 / (4 + 0.85 * 28));
    one(this.p7, 0.27, 0.335, 0.335, 0.385, 0.38, 0.39, 0.43, 0.5, s7, 7);
    one(this.p28, 0.80, 0.865, 0.865, 0.905, 0.90, 0.91, 0.955, 1.0, sFrac, 28);
  }

  /* ------------------------------------------------------------ light, sky, night */
  _lighting(night, xr, p, dt) {
    const S = this.stage;
    S.key.intensity = lerp(2.9, 0.34, night); S.key.color.copy(DAY.key).lerp(NIGHT.key, night);
    S.rim.intensity = lerp(1.5, 0.25, night); S.rim.color.copy(DAY.rim).lerp(NIGHT.rim, night);
    S.fill.intensity = lerp(0.8, 0.34, night); S.fill.color.copy(DAY.skyH).lerp(NIGHT.skyH, night); S.fill.groundColor.copy(DAY.grdH).lerp(NIGHT.grdH, night);
    S.scene.environmentIntensity = lerp(1.0, 0.16, night);
    S.renderer.toneMappingExposure = lerp(1.0, 1.12, night);
    const gu = this.ground.material.uniforms;
    gu.uBase.value.copy(DAY.base).lerp(NIGHT.base, night);
    // paper-like plan sheet at the start, wide ground afterwards
    const wide = smooth(0.1, 0.2, p);
    gu.uFade.value.set(lerp(78, 360, wide), lerp(22, 80, wide));
    gu.uGrid.value = lerp(1.0, 0.32, smooth(0.12, 0.22, p)) * (1 - 0.6 * smooth(0.46, 0.5, p) * (1 - smooth(0.66, 0.7, p))) * (1 - 0.7 * night) + xr * 0.5;
    this.shadowPlane.material.opacity = 0.38 * (1 - night * 0.85);
  }

  _keyCeremony(p, dt, night) {
    const kc = this.keyc, tw = this.tower, sky = this.skyline.material.uniforms;
    const inCer = p >= 0.975;
    if (inCer && !kc.active) { kc.active = true; this.ui.onKey && this.ui.onKey(kc.done ? 'done' : 'ready'); }
    if (!inCer && kc.active) { kc.active = false; if (p < 0.9 && kc.done) { kc.done = false; kc.amt = 0; this.ui.onKey && this.ui.onKey('idle'); } }
    if (kc.active && !kc.done && this.forceP === null && scrollY > this.lockY + this.vh * 0.12 && !kc.autoPending) { kc.autoPending = true; setTimeout(() => { this.turnKey(true); kc.autoPending = false; }, 500); }
    if (kc.done) { kc.t += dt; kc.amt = Math.min(1, kc.t / 2.8); } else kc.amt = Math.max(0, kc.amt - dt * 1.2);
    const e = easeOut(kc.amt);
    tw.setLights(night * 0.45 + e * (N + 1.2), 1);
    sky.uNight.value = night * (0.55 + 0.45 * e);
    sky.uFog.value.copy(_fogDay).lerp(_fogNight, night);
    this.towerGlow.material.opacity = night * (0.12 + 0.5 * e); this.towerGlow.visible = night > 0.02;
    this.ground.material.uniforms.uPool.value = night * (0.2 + 0.8 * e);
    this.stage.dustMat.uniforms.uAmt.value = 1 - night * 0.7;
  }

  /* CSS background tint under the transparent canvas, per chapter */
  _tint(p) {
    const stops = [
      [0.00, [30, 35, 40], [9, 11, 13], [0.5, 0.5]],
      [0.15, [58, 66, 74], [14, 17, 20], [0.5, 0.45]],
      [0.30, [104, 116, 126], [28, 32, 38], [0.5, 0.35]],
      [0.46, [92, 104, 114], [24, 28, 33], [0.5, 0.4]],
      [0.50, [34, 40, 46], [11, 13, 16], [0.45, 0.5]],
      [0.66, [40, 48, 56], [12, 14, 18], [0.5, 0.5]],
      [0.72, [22, 28, 36], [8, 10, 13], [0.5, 0.5]],
      [0.82, [70, 62, 78], [16, 14, 24], [0.5, 0.6]],
      [0.92, [20, 28, 48], [5, 7, 12], [0.5, 0.55]],
      [1.00, [18, 26, 46], [4, 6, 11], [0.5, 0.55]]
    ];
    let i = 0; while (i < stops.length - 2 && p > stops[i + 1][0]) i++;
    const a = stops[i], b = stops[i + 1], t = smooth(a[0], b[0], p);
    const mix = (x, y) => x.map((v, k) => Math.round(lerp(v, y[k], t)));
    const c1 = mix(a[1], b[1]), c2 = mix(a[2], b[2]), el = this.section.style;
    el.setProperty('--g1', `${c1[0]},${c1[1]},${c1[2]}`); el.setProperty('--g2', `${c2[0]},${c2[1]},${c2[2]}`);
    el.setProperty('--gx', (lerp(a[3][0], b[3][0], t) * 100).toFixed(1) + '%'); el.setProperty('--gy', (lerp(a[3][1], b[3][1], t) * 100).toFixed(1) + '%');
  }

  setSystem(id, on) { this.sys[id] = on; this.tower.setSystem(id, on); }
  start() { this.stage.start(); }
  stop() { this.stage.stop(); this.sfx.stopAll(); }
  /* تفريغ كامل من الذاكرة (يُستدعى حين نبتعد عن الهيرو بأكثر من شاشتين ونصف) */
  dispose() { this.stop(); removeEventListener('resize', this._onResize); removeEventListener('pointermove', this._onMove); this.stage.dispose(); if (window.__story === this) window.__story = null; }
  chapterY(i) { return this.secTop + this.span * (CH[i] + (i === 0 ? 0 : 0.004)); }
}
export { CH as CHAPTERS };
