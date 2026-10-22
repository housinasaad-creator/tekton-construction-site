/*
  The hero building and its site: a nine-storey RC frame (raft, piles, columns, slabs, core, curtain wall, MEP, roof),
  a climbing tower crane, site props, the night skyline, and the compression-test presses.
  Everything is driven by a few scalar setters so the scroll story can scrub it: setBuild(t), setCure(c), xray(x), setLights(f).
*/
import * as THREE from 'three';
import { clamp, lerp, smooth, easeOut, rng, canvasTex } from './core.js';
import { glowSprite, flatLabel } from './parts.js';
import { drawMark } from '../brand.js';

export const DIM = { W: 26, D: 18, N: 9, H: 3.6, SLAB: 0.4, COL: 0.9, OX: 0.6, xs: [-13, -4.3333, 4.3333, 13], zs: [-9, 0, 9] };
const { W, D, N, H, SLAB, COL, OX } = DIM;
const FW = 13.55, FD = 9.55;            // facade plane half extents
const PANE_H = H - SLAB - 0.1;
const NP = 20;                          // facade panes per floor (6 front, 6 back, 4 right, 4 left)

const UB = new THREE.BoxGeometry(1, 1, 1); UB.translate(0, 0.5, 0);          // unit box, base at y = 0
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const Q0 = new THREE.Quaternion();
const QY = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);

function setM(inst, i, x, y, z, sx, sy, sz, q = Q0) { _p.set(x, y, z); if (sy < 2e-3) _s.set(0, 0, 0); else _s.set(sx, sy, sz); _m.compose(_p, q, _s); inst.setMatrixAt(i, _m); }

/* ================================================================== TOWER */
export class Tower {
  constructor(mats, { mobile = false } = {}) {
    this.mats = mats; this.group = new THREE.Group(); this.t = -1;
    const g = this.group;
    // own material clones so x-ray and cure can tint structure independently of the glass etc.
    this.mCol = mats.concrete.clone(); this.mSlab = mats.concrete.clone(); this.mCore = mats.concrete.clone();
    this.mRaft = mats.concreteDark.clone();
    for (const m of [this.mCol, this.mSlab, this.mCore]) { m.onBeforeCompile = mats.concrete.onBeforeCompile; m.customProgramCacheKey = mats.concrete.customProgramCacheKey; m.map = mats.concrete.map; }
    this.mRaft.onBeforeCompile = mats.concreteDark.onBeforeCompile; this.mRaft.customProgramCacheKey = mats.concreteDark.customProgramCacheKey; this.mRaft.map = mats.concreteDark.map;
    this.mCol.emissive = new THREE.Color(0xff5a10); this.mCol.emissiveIntensity = 0;
    this.mSlab.emissive = new THREE.Color(0x14304a); this.mSlab.emissiveIntensity = 0;
    this.glassMat = mats.glass.clone(); this.glassMat.side = THREE.DoubleSide;
    this.concs = [this.mCol, this.mSlab, this.mCore, this.mRaft];

    // raft + piles
    this.raft = new THREE.Mesh(UB, this.mRaft); this.raft.scale.set(W + 4, 1.2, D + 4); this.raft.position.set(0, -1.2, 0); this.raft.castShadow = this.raft.receiveShadow = true; g.add(this.raft);
    const pg = new THREE.CylinderGeometry(0.45, 0.45, 1, 14); pg.translate(0, -0.5, 0);
    const pileXZ = []; for (const x of DIM.xs) for (const z of DIM.zs) { pileXZ.push([x - 0.9, z - 0.9], [x + 0.9, z + 0.9]); }
    this.piles = new THREE.InstancedMesh(pg, mats.concreteDark, pileXZ.length);
    pileXZ.forEach(([x, z], i) => setM(this.piles, i, x, -1.2, z, 1, 17, 1));
    this.piles.visible = false; g.add(this.piles);

    // frame
    this.cols = new THREE.InstancedMesh(UB, this.mCol, N * 12); this.cols.castShadow = this.cols.receiveShadow = true;
    this.slabs = new THREE.InstancedMesh(UB, this.mSlab, N); this.slabs.castShadow = this.slabs.receiveShadow = true;
    this.core = new THREE.InstancedMesh(UB, this.mCore, N); this.core.castShadow = this.core.receiveShadow = true;
    for (const m of [this.cols, this.slabs, this.core]) { m.frustumCulled = false; g.add(m); }
    this.colXZ = []; for (const x of DIM.xs) for (const z of DIM.zs) this.colXZ.push([x, z]);

    // facade
    this.panes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.glassMat, N * NP); this.panes.frustumCulled = false; this.panes.renderOrder = 4;
    this.mulls = new THREE.InstancedMesh(UB, mats.frame, N * 24); this.mulls.frustumCulled = false; this.mulls.castShadow = true;
    const lightTex = canvasTex(8, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#ffd9a0'); gr.addColorStop(1, '#a8723a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    this.lights = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: lightTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), N * NP);
    this.lights.frustumCulled = false; this.lights.renderOrder = 3;
    this.lights.setColorAt(0, new THREE.Color(0, 0, 0)); for (let i = 0; i < N * NP; i++) this.lights.setColorAt(i, new THREE.Color(0, 0, 0));
    g.add(this.mulls, this.lights, this.panes);
    this.paneDef = [];                      // {x,z,ry,w,cx,cz lights}
    for (let k = 0; k < 6; k++) { const bw = 2 * FW / 6; this.paneDef.push({ x: -FW + bw * (k + .5), z: FD, ry: 0, w: bw - 0.14 }); }
    for (let k = 0; k < 6; k++) { const bw = 2 * FW / 6; this.paneDef.push({ x: -FW + bw * (k + .5), z: -FD, ry: Math.PI, w: bw - 0.14 }); }
    for (let k = 0; k < 4; k++) { const bw = 2 * FD / 4; this.paneDef.push({ x: FW, z: -FD + bw * (k + .5), ry: Math.PI / 2, w: bw - 0.14 }); }
    for (let k = 0; k < 4; k++) { const bw = 2 * FD / 4; this.paneDef.push({ x: -FW, z: -FD + bw * (k + .5), ry: -Math.PI / 2, w: bw - 0.14 }); }
    this.mullDef = [];
    for (let k = 0; k <= 6; k++) { const x = -FW + 2 * FW / 6 * k; this.mullDef.push([x, FD, 0], [x, -FD, 0]); }
    for (let k = 0; k <= 4; k++) { const z = -FD + 2 * FD / 4 * k; this.mullDef.push([FW, z, 1], [-FW, z, 1]); }
    this.flick = []; const R = rng(11); for (let i = 0; i < N * NP; i++) this.flick.push(0.55 + R() * 0.7);
    this.litOff = []; for (let i = 0; i < N * NP; i++) this.litOff.push(R());

    // roof
    this.roof = new THREE.Group(); this.roof.position.y = N * H;
    const plant = new THREE.Mesh(UB, this.mCore); plant.scale.set(9, 2.6, 7); plant.position.set(-3, 0, 1); plant.castShadow = true; this.roof.add(plant);
    const par = new THREE.Mesh(UB, this.mSlab); par.scale.set(W + 2 * OX, 0.9, 0.25); par.position.set(0, 0, D / 2 + OX - 0.12); this.roof.add(par);
    const par2 = par.clone(); par2.position.z = -(D / 2 + OX - 0.12); this.roof.add(par2);
    const par3 = new THREE.Mesh(UB, this.mSlab); par3.scale.set(0.25, 0.9, D + 2 * OX); par3.position.set(W / 2 + OX - 0.12, 0, 0); this.roof.add(par3);
    const par4 = par3.clone(); par4.position.x = -(W / 2 + OX - 0.12); this.roof.add(par4);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 7, 8), mats.steel); ant.position.set(7, 3.5, -2); this.roof.add(ant);
    this.beacon = glowSprite(0xff3a2a, 3.2, 0.0); this.beacon.position.set(7, 7.1, -2); this.roof.add(this.beacon);
    this.hvac = []; for (let i = 0; i < 3; i++) { const u = new THREE.Mesh(UB, mats.steel); u.scale.set(2.4, 1.2, 1.8); u.position.set(6 + i * 3.3, 0, 4.5); this.roof.add(u); }
    this.roof.visible = false; g.add(this.roof);

    // rebar cages (lines), one set per floor
    this._buildRebar();
    // MEP systems
    this._buildMEP(mobile);
    // load path particles
    this._buildLoads(mobile);

    this.topY = 0; this.setBuild(0); this.setLights(0); this.xray(0);
  }

  _buildRebar() {
    const v = [], push = (a, b) => v.push(...a, ...b);
    const c = 0.31;
    for (const [x, z] of this.colXZ) {
      for (const [dx, dz] of [[-c, -c], [c, -c], [c, c], [-c, c]]) push([x + dx, 0, z + dz], [x + dx, H + 0.9, z + dz]);
      for (let y = 0.2; y < H; y += 0.42) { const P = [[-c, -c], [c, -c], [c, c], [-c, c]]; for (let k = 0; k < 4; k++) { const a = P[k], b = P[(k + 1) % 4]; push([x + a[0], y, z + a[1]], [x + b[0], y, z + b[1]]); } }
    }
    const sw = W + 2 * OX - 0.3, sd = D + 2 * OX - 0.3;
    for (const y of [H - SLAB + 0.08, H - 0.08]) {
      for (let x = -sw / 2; x <= sw / 2 + 1e-3; x += 0.9) push([x, y, -sd / 2], [x, y, sd / 2]);
      for (let z = -sd / 2; z <= sd / 2 + 1e-3; z += 0.9) push([-sw / 2, y + 0.04, z], [sw / 2, y + 0.04, z]);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    this.rebar = [];
    for (let i = 0; i < N; i++) {
      const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe0773a, transparent: true, opacity: 1 }));
      l.position.y = i * H; l.visible = false; l.frustumCulled = false; this.group.add(l); this.rebar.push(l);
    }
  }

  _buildMEP(mobile) {
    const sys = [
      { id: 'water', color: 0x2f9cff, z: [-6.2], r: 0.16, x: -2.6 },
      { id: 'fire', color: 0xff3b30, z: [-4.7], r: 0.2, x: -1.6 },
      { id: 'power', color: 0xffd23f, z: [4.9], r: 0.14, x: 1.4 },
      { id: 'hvac', color: 0xb4bdc5, z: [6.4], r: 0.0, x: 2.6 }
    ];
    this.mep = {}; this.mepGroup = new THREE.Group(); this.mepGroup.visible = false;
    const cg = new THREE.CylinderGeometry(1, 1, 1, 10); cg.translate(0, 0.5, 0);
    for (const s of sys) {
      const mat = new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 1 });
      const grp = new THREE.Group(); grp.userData.mat = mat;
      // riser inside the core footprint
      const r = new THREE.Mesh(s.id === 'hvac' ? UB : cg, mat);
      if (s.id === 'hvac') r.scale.set(1.3, N * H, 1.3); else r.scale.set(s.r * 1.3, N * H, s.r * 1.3);
      r.position.set(s.x, 0, s.id === 'hvac' ? 0 : (s.z[0] > 0 ? 1.6 : -1.6)); grp.add(r);
      // horizontal run under every slab
      const hz = new THREE.InstancedMesh(s.id === 'hvac' ? UB : cg, mat, N);
      for (let i = 0; i < N; i++) {
        const y = (i + 1) * H - SLAB - (s.id === 'hvac' ? 0.75 : 0.28 + sys.indexOf(s) * 0.05);
        if (s.id === 'hvac') { setM(hz, i, 0, y - 0.0, s.z[0], 21, 0.6, 1.0); }
        else { _q.setFromEuler(_e.set(0, 0, Math.PI / 2)); setM(hz, i, 10.5, y, s.z[0], s.r, 21, s.r, _q.clone()); }
      }
      hz.frustumCulled = false; grp.add(hz);
      // branch drops (short stubs) every floor for flavour
      this.mep[s.id] = grp; this.mepGroup.add(grp);
    }
    this.group.add(this.mepGroup);
  }

  _buildLoads(mobile) {
    const n = mobile ? 200 : 380, a = new Float32Array(n * 3), sd = new Float32Array(n), R = rng(5);
    for (let i = 0; i < n; i++) { const c = this.colXZ[(R() * this.colXZ.length) | 0]; a[i * 3] = c[0] + (R() - .5) * .5; a[i * 3 + 1] = 0; a[i * 3 + 2] = c[1] + (R() - .5) * .5; sd[i] = R(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    this.loadMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uTop: { value: N * H }, uPx: { value: 1 }, uProj: { value: 1000 } },
      vertexShader: `uniform float uTime, uAmt, uTop, uPx, uProj; attribute float aSeed; varying float vA;
        void main(){ float span = uTop + 17.0; float y = uTop - mod(uTime*(5.0+aSeed*7.0) + aSeed*200.0, span);
          vec4 mv = modelViewMatrix*vec4(position.x, y, position.z, 1.0); float d = -mv.z;
          vA = uAmt * smoothstep(0.0, 4.0, uTop - y) * (1.0 - smoothstep(uTop+10.0, span, uTop - y + 0.0));
          gl_PointSize = (0.34 + aSeed*0.3) * uProj / max(d, 6.0); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord-.5; float a = smoothstep(.5,.0,length(c)); gl_FragColor = vec4(1.0,.55,.2, a*a*vA); }`
    });
    this.loads = new THREE.Points(g, this.loadMat); this.loads.frustumCulled = false; this.loads.visible = false; this.loads.renderOrder = 6;
    this.group.add(this.loads);
  }

  /* t in [0,1]: raft, then floors 0..8 staggered; each floor = columns+core up, slab, then curtain wall */
  setBuild(t) {
    if (Math.abs(t - this.t) < 1e-5) return; this.t = t;
    const ru = clamp(t / 0.06); this.raft.visible = ru > 0; this.raft.scale.y = Math.max(1e-3, 1.2 * easeOut(ru));
    let top = 0;
    for (let i = 0; i < N; i++) {
      const s = 0.05 + i * 0.0975, u = clamp((t - s) / 0.17), y0 = i * H;
      const cu = easeOut(clamp(u / 0.42)), ku = easeOut(clamp(u / 0.34)), su = easeOut(clamp((u - 0.34) / 0.26));
      for (let k = 0; k < 12; k++) { const [x, z] = this.colXZ[k]; setM(this.cols, i * 12 + k, x, y0, z, COL, u > 0 ? H * cu : 0, COL); }
      setM(this.core, i, 0, y0, 0, 7.2, u > 0 ? (H - SLAB) * ku : 0, 6.2);
      setM(this.slabs, i, 0, (i + 1) * H - SLAB, 0, W + 2 * OX, su > 0 ? SLAB * su : 0, D + 2 * OX);
      for (let k = 0; k < NP; k++) {
        const pd = this.paneDef[k], pu = easeOut(clamp((u - 0.58 - k * 0.011) / 0.22)), idx = i * NP + k;
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pd.ry);
        const h = PANE_H * pu;
        setM(this.panes, idx, pd.x, y0 + 0.05 + h / 2, pd.z, pd.w, h, 1, _q.clone());
        const ix = pd.ry === 0 ? 0 : pd.ry === Math.PI ? 0 : (pd.ry > 0 ? -0.6 : 0.6), iz = pd.ry === 0 ? -0.6 : pd.ry === Math.PI ? 0.6 : 0;
        setM(this.lights, idx, pd.x + ix, y0 + 0.2 + h / 2, pd.z + iz, pd.w - 0.2, (PANE_H - 0.3) * pu, 1, _q.clone());
      }
      for (let k = 0; k < 24; k++) {
        const [x, z, side] = this.mullDef[k], pu = easeOut(clamp((u - 0.6 - (k % 12) * 0.008) / 0.2));
        setM(this.mulls, i * 24 + k, x, y0 + 0.05, z, side ? 0.2 : 0.12, PANE_H * pu, side ? 0.12 : 0.2);
      }
      const rb = this.rebar[i]; rb.visible = u > 0.02 && u < 0.82; rb.material.opacity = 1 - smooth(0.5, 0.82, u);
      if (u > 0) top = Math.max(top, y0 + H * cu + (su > 0 ? 0.0 : 0));
    }
    for (const m of [this.cols, this.slabs, this.core, this.panes, this.mulls, this.lights]) m.instanceMatrix.needsUpdate = true;
    const rf = clamp((t - 0.93) / 0.07); this.roof.visible = rf > 0; this.roof.scale.y = Math.max(1e-3, easeOut(rf));
    this.topY = t >= 0.999 ? N * H + 1 : top;
  }

  /* c in [0,1]: wet dark concrete to cured pale concrete */
  setCure(c) {
    const wet = _wet, dry = _dry;
    for (const m of this.concs) {
      const base = m === this.mRaft ? 0.83 : 1;
      m.color.copy(wet).lerp(dry, c).multiplyScalar(base); m.roughness = lerp(0.42, 0.93, c);
    }
  }

  /* x-ray: glass fades, core and slabs turn see-through, columns glow orange, MEP + piles appear, ground handled by the story */
  xray(x, night = 0) {
    this.glassMat.opacity = lerp(lerp(0.58, 0.32, night), 0.04, x);
    this.mulls.material.opacity = 1;
    this.mCore.transparent = x > 0.01; this.mCore.opacity = lerp(1, 0.16, x); this.mCore.depthWrite = x < 0.3;
    this.mSlab.transparent = x > 0.01; this.mSlab.opacity = lerp(1, 0.5, x); this.mSlab.depthWrite = x < 0.3; this.mSlab.emissiveIntensity = x * 0.35;
    this.mCol.emissiveIntensity = x * 0.85;
    this.mepGroup.visible = x > 0.02; this.piles.visible = x > 0.02; this.loads.visible = x > 0.02;
    this.loadMat.uniforms.uAmt.value = x;
    for (const k in this.mep) this.mep[k].userData.mat.opacity = x;
    this.xr = x;
  }
  setSystem(id, on) { if (this.mep[id]) this.mep[id].visible = on; }

  /* f in [0,N+1]: window lights come on floor by floor (each pane with its own offset/flicker) */
  setLights(f, warm = 1) {
    if (this._lf === f && this._lw === warm) return; this._lf = f; this._lw = warm;
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) for (let k = 0; k < NP; k++) {
      const idx = i * NP + k, lvl = clamp(f - (N - 1 - i) * 0.8 - this.litOff[idx] * 0.7);       // top floors first
      const on = lvl * (this.litOff[idx] > 0.12 ? 1 : 0.0);
      c.setRGB(1.0, 0.7 + 0.12 * this.flick[idx], 0.36 + 0.2 * (this.flick[idx] - .5)).multiplyScalar(on * this.flick[idx] * 1.5 * warm);
      this.lights.setColorAt(idx, c);
    }
    this.lights.instanceColor.needsUpdate = true;
    this.beacon.material.opacity = clamp(f - N * 0.8) * 0.9;
  }
  update(time) { this.loadMat.uniforms.uTime.value = time; }
}
const _wet = new THREE.Color(0x66686b), _dry = new THREE.Color(0xcdc9be);

/* ================================================================== TOWER CRANE */
function truss(len, h, w, seg, profile = 'tri') {
  const v = [], P = (a, b) => v.push(...a, ...b);
  for (let x = 0; x < len - 1e-6; x += seg) {
    const x2 = Math.min(len, x + seg);
    if (profile === 'tri') {
      P([x, 0, -w / 2], [x2, 0, -w / 2]); P([x, 0, w / 2], [x2, 0, w / 2]); P([x, h, 0], [x2, h, 0]);
      P([x, 0, -w / 2], [x, 0, w / 2]); P([x, 0, -w / 2], [x, h, 0]); P([x, 0, w / 2], [x, h, 0]);
      P([x, 0, -w / 2], [x2, h, 0]); P([x, 0, w / 2], [x2, h, 0]);
    }
  }
  return v;
}
export class Crane {
  constructor(mats) {
    this.mats = mats; this.group = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff7a2d });
    this.BAY = 2.0; this.MAXB = 29;
    const v = [], P = (a, b) => v.push(...a, ...b), s = 1.0;
    for (let b = 0; b < this.MAXB; b++) {
      const y = b * this.BAY, y2 = y + this.BAY, c = [[-s, -s], [s, -s], [s, s], [-s, s]];
      for (let k = 0; k < 4; k++) { const a = c[k], bb = c[(k + 1) % 4]; P([a[0], y, a[1]], [a[0], y2, a[1]]); P([a[0], y2, a[1]], [bb[0], y2, bb[1]]); P([a[0], y, a[1]], [bb[0], y2, bb[1]]); }
    }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    this.mast = new THREE.LineSegments(mg, lineMat); this.mast.frustumCulled = false; this.group.add(this.mast);
    this.chords = []; for (const [x, z] of [[-s, -s], [s, -s], [s, s], [-s, s]]) { const c = new THREE.Mesh(UB, mats.orange); c.position.set(x, 0, z); c.castShadow = true; this.group.add(c); this.chords.push(c); }
    // head
    this.head = new THREE.Group(); this.group.add(this.head);
    const jib = new THREE.LineSegments(this._geo(truss(34, 1.7, 1.5, 2.0)), lineMat); jib.position.set(1, 0.0, 0); this.head.add(jib);
    const cj = new THREE.LineSegments(this._geo(truss(11, 1.7, 1.5, 2.0)), lineMat); cj.rotation.y = Math.PI; cj.position.set(-1, 0, 0); this.head.add(cj);
    const top = new THREE.Mesh(UB, mats.orange); top.scale.set(2.4, 2.4, 2.4); top.position.set(0, -0.2, 0); top.rotation.y = 0; top.castShadow = true; this.head.add(top);
    const cab = new THREE.Mesh(UB, mats.white); cab.scale.set(1.6, 1.5, 1.4); cab.position.set(2.6, -1.6, 1.6); this.head.add(cab);
    const cabWin = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), mats.frame); cabWin.position.set(3.41, -0.9, 1.6); cabWin.rotation.y = Math.PI / 2; this.head.add(cabWin);
    const cw = new THREE.Mesh(UB, mats.concreteDark); cw.scale.set(3.0, 1.5, 2.4); cw.position.set(-10.4, -0.2, 0); cw.castShadow = true; this.head.add(cw);
    const apex = new THREE.Vector3(0, 7.5, 0);
    const pv = []; for (const p of [[14, 1.7], [30, 1.7], [-9, 1.7]]) pv.push(apex.x, apex.y, apex.z, p[0], p[1], 0);
    pv.push(0, 1.2, 0, 0, 7.5, 0);
    const pend = new THREE.LineSegments(this._geo(pv), new THREE.LineBasicMaterial({ color: 0xd8dde2 })); this.head.add(pend);
    this.trolley = new THREE.Group(); this.head.add(this.trolley);
    const tb = new THREE.Mesh(UB, mats.frame); tb.scale.set(1.6, 0.5, 1.4); tb.position.set(0, -0.6, 0); this.trolley.add(tb);
    this.cable = new THREE.Mesh(UB, mats.steel); this.cable.scale.set(0.05, 1, 0.05); this.trolley.add(this.cable);
    this.hook = new THREE.Group(); this.trolley.add(this.hook);
    const hb = new THREE.Mesh(UB, mats.orange); hb.scale.set(0.9, 0.9, 0.9); hb.position.y = -0.9; this.hook.add(hb);
    this.payload = new THREE.Group(); this.hook.add(this.payload);
    const pl = new THREE.Mesh(UB, mats.steel); pl.scale.set(5.2, 0.32, 3.0); pl.position.y = -4.1; pl.castShadow = true; this.payload.add(pl);
    const pf = new THREE.Mesh(UB, mats.concreteDark); pf.scale.set(5.0, 0.25, 2.8); pf.position.y = -3.78; this.payload.add(pf);
    const sl = this._geo([0, -1.2, 0, -2.4, -4.0, -1.3, 0, -1.2, 0, 2.4, -4.0, -1.3, 0, -1.2, 0, -2.4, -4.0, 1.3, 0, -1.2, 0, 2.4, -4.0, 1.3]);
    this.payload.add(new THREE.LineSegments(sl, new THREE.LineBasicMaterial({ color: 0xd8dde2 })));
    this.group.position.set(22, 0, -3);
    this.height = 20; this.setPose(20, -1.5, 0.6, 6, false);
  }
  _geo(v) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g; }
  /* mastH metres (quantised to bays), slew radians, trolley 0..1 along the jib, drop metres of cable, payload visible */
  setPose(mastH, slew, trolley, drop, payload) {
    const bays = clamp(Math.ceil(mastH / this.BAY), 4, this.MAXB), h = bays * this.BAY;
    this.mast.geometry.setDrawRange(0, bays * 4 * 3 * 2);
    for (const c of this.chords) c.scale.set(0.16, h, 0.16);
    this.head.position.y = h + 1.2; this.head.rotation.y = slew; this.height = h;
    const tx = lerp(4.5, 31, trolley); this.trolley.position.set(tx, 0, 0);
    this.cable.scale.y = Math.max(0.1, drop + 0.2); this.cable.position.y = -(drop + 0.2); this.hook.position.y = -drop;
    this.payload.visible = payload;
  }
}

/* ================================================================== SITE PROPS */
export function makeSiteProps(mats, tex) {
  const g = new THREE.Group();
  const box = (mat, w, h, d, x, y, z, ry = 0) => { const m = new THREE.Mesh(UB, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const cont = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.55 });
  const cA = cont(0x2f6f8f), cB = cont(0xd9602a), cC = cont(0xe5e0d4);
  box(cA, 6.1, 2.6, 2.5, -26, 0, -16, 0.15); box(cB, 6.1, 2.6, 2.5, -26.4, 2.6, -16.1, 0.12); box(cC, 6.1, 2.6, 2.5, -19, 0, -19.5, -0.1);
  // rebar bundles near the crane supply point
  const rbMat = new THREE.MeshStandardMaterial({ color: 0x6e4a33, metalness: 0.7, roughness: 0.55 });
  for (let i = 0; i < 4; i++) box(rbMat, 9, 0.22, 0.3, 21 + (i % 2) * 0.1, 0.12 + i * 0.22, 17 + (i > 1 ? 0.5 : 0), 0.05);
  box(mats.concreteDark, 2.4, 0.18, 2.4, 25, 0, 18); for (let i = 0; i < 12; i++) box(mats.concrete, 0.55, 0.3, 0.3, 24.2 + (i % 4) * 0.62, 0.18 + Math.floor(i / 4) * 0.3, 17.6 + (i % 2) * 0.3);
  // cones
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6b1f, roughness: 0.6 });
  const cg = new THREE.ConeGeometry(0.3, 0.8, 10); cg.translate(0, 0.4, 0);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(cg, coneMat); c.position.set(-12 + i * 3.4, 0, 28 + (i % 2) * 0.4); c.castShadow = true; g.add(c); }
  // hoarding sign
  const sign = canvasTex(1024, 384, (c, w, h) => {
    c.fillStyle = '#111316'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff6b1f'; for (let x = -40; x < w + 40; x += 64) { c.beginPath(); c.moveTo(x, h - 34); c.lineTo(x + 32, h - 34); c.lineTo(x + 6, h); c.lineTo(x - 26, h); c.fill(); }
    drawMark(c, 150, 170, 96, '#efece4');
    c.fillStyle = '#efece4'; c.font = '800 112px "Big Shoulders Display", Impact, sans-serif'; c.textBaseline = 'alphabetic'; c.fillText('TEKTON', 290, 160);
    c.font = '500 34px "IBM Plex Mono", monospace'; c.fillStyle = '#c9c5bb'; c.fillText('YAPI · تكتون · CONSTRUCTION', 292, 214);
    c.fillStyle = '#ff6b1f'; c.font = '700 40px "Big Shoulders Display", Impact, sans-serif'; c.fillText('SAFETY FIRST · EMNİYET ÖNCE', 292, 276);
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const hoard = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.7, metalness: 0.1 }));
  hoard.position.set(-30, 3.1, 14); hoard.rotation.y = 0.5; hoard.castShadow = true; g.add(hoard);
  box(mats.frame, 0.25, 3.2, 0.25, -34, 0, 11.6, 0.5); box(mats.frame, 0.25, 3.2, 0.25, -26, 0, 16.3, 0.5);
  return g;
}

/* ================================================================== SKYLINE (procedural windows, lit by the night uniform) */
export function makeSkyline(count = 70) {
  const R = rng(21), g = new THREE.InstancedMesh(UB, new THREE.ShaderMaterial({
    uniforms: { uNight: { value: 0 }, uFog: { value: new THREE.Color(0x232830) }, uBase: { value: new THREE.Color(0x3a4048) } },
    vertexShader: `varying vec3 vW; varying float vSeed; void main(){ vec4 w = modelMatrix*instanceMatrix*vec4(position,1.); vW = w.xyz; vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898,78.233)))*43758.5453); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uNight; uniform vec3 uFog, uBase; varying vec3 vW; varying float vSeed;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 cell = vec2((vW.x+vW.z)/3.4, vW.y/3.6); vec2 id = floor(cell), f = fract(cell);
        float ax = fwidth(cell.x), ay = fwidth(cell.y); float det = 1. - smoothstep(.1, .38, max(ax, ay));
        float wx = smoothstep(.18, .18 + ax, f.x) * (1. - smoothstep(.82 - ax, .82, f.x));
        float wy = smoothstep(.2, .2 + ay, f.y) * (1. - smoothstep(.8 - ay, .8, f.y));
        float win = wx * wy;
        float thr = .62 - vSeed*.2, lit = step(thr, h(id + vSeed*40.));
        win = mix(.55, win, det); lit = mix(1. - thr, lit, det);
        vec3 col = uBase*(.55+.45*smoothstep(0., 90., vW.y));
        col = mix(col, uFog, .35);
        col += win*lit*vec3(1.,.78,.46)*uNight*1.05;
        col += win*(1.-lit)*vec3(.12,.16,.22)*.3;
        float dist = length(vW.xz); col = mix(col, uFog, smoothstep(120., 330., dist)*.7);
        gl_FragColor = linearToOutputTexel(vec4(col,1.)); }`
  }), count);
  let i = 0; const ang0 = R() * 6;
  while (i < count) {
    const a = ang0 + R() * Math.PI * 2, r = 150 + R() * 170, w = 12 + R() * 20, d = 12 + R() * 20, h = 22 + Math.pow(R(), 1.6) * 90;
    setM(g, i++, Math.cos(a) * r, 0, Math.sin(a) * r, w, h, d, QY(R() * 0.4));
  }
  g.frustumCulled = false; return g;
}

/* ================================================================== COMPRESSION PRESS + CONCRETE CYLINDER */
export function crackTexture(seed = 3) {
  const R = rng(seed);
  return canvasTex(256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(20,18,16,.95)'; c.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      let x = R() * w, y = k % 2 ? 0 : h * .35; c.lineWidth = 6 - k * .5; c.beginPath(); c.moveTo(x, y);
      while (y < h * (k % 2 ? 1 : .9)) { x += (R() - .5) * 34 + (k % 3 - 1) * 5; y += 12 + R() * 22; c.lineTo(x, y); if (R() > .8) { c.moveTo(x, y); c.lineTo(x + (R() - .5) * 60, y + R() * 28); c.moveTo(x, y); } }
      c.stroke();
    }
  });
}
export function makePress(mats, label, tagText) {
  const g = new THREE.Group(), steel = mats.steel, dark = mats.frame;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(6.4, 0.7, 5), dark, 0, 0.35, 0);
  add(new THREE.CylinderGeometry(0.32, 0.32, 11.5, 14), steel, -2.7, 6.4, -1.8); add(new THREE.CylinderGeometry(0.32, 0.32, 11.5, 14), steel, 2.7, 6.4, -1.8);
  add(new THREE.BoxGeometry(6.4, 1.1, 2.0), dark, 0, 12.4, -1.8);
  const ram = add(new THREE.CylinderGeometry(0.7, 0.7, 4, 18), steel, 0, 10.0, 0);
  add(new THREE.CylinderGeometry(0.95, 0.95, 0.4, 24), steel, 0, 1.0, 0);            // lower platen
  const platen = add(new THREE.CylinderGeometry(1.05, 1.05, 0.4, 24), mats.orange, 0, 9.0, 0);   // upper platen
  const specMat = mats.concrete.clone(); specMat.onBeforeCompile = mats.concrete.onBeforeCompile; specMat.customProgramCacheKey = mats.concrete.customProgramCacheKey; specMat.map = mats.concrete.map;
  const spec = add(new THREE.CylinderGeometry(0.75, 0.75, 6, 32), specMat, 0, 4.2, 0);
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTexture(label === '28' ? 9 : 4), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const crack = add(new THREE.CylinderGeometry(0.765, 0.765, 6, 32, 1, true), crackMat, 0, 4.2, 0);
  const tag = flatLabel(tagText === undefined ? (label === '28' ? '28 DAYS' : '7 DAYS') : (tagText || ' '), 4.2, { vertical: true, font: '800 54px "Big Shoulders Display", Impact, sans-serif', color: '#ff8a4a', h: 80 });
  tag.position.set(0, 14.2, 0); tag.visible = tagText !== null; g.add(tag);
  const shards = []; const sg = new THREE.TetrahedronGeometry(0.22);
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(sg, specMat); m.visible = false; g.add(m); shards.push({ m, vx: (Math.random() - .5) * 3, vy: 1 + Math.random() * 2.5, vz: 1 + Math.random() * 2.5, rx: Math.random() * 6, ry: Math.random() * 6 }); }
  const puff = glowSprite(0xe6e2d6, 9, 0); puff.position.set(0, 4.4, 1.2); g.add(puff);
  return { group: g, platen, ram, spec, crack, specMat, crackMat, shards, tag, puff, state: 0, tFail: 0 };
}
