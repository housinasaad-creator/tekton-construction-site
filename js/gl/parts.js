/*
  Shared building blocks: triplanar concrete, the engineering-paper ground, glow sprites, flat text labels,
  and the "drawn plan" ribbon system (lines that draw themselves along a global distance, with a pen tip).
*/
import * as THREE from 'three';
import { canvasTex, rng, PROJ, clamp, lerp } from './core.js';

/* ------------------------------------------------------------ concrete */
export function concreteMap(seed = 7, size = 512) {
  const R = rng(seed);
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = '#ece9e2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {                         // large soft blotches (drawn wrapped, so the tile is seamless)
      const x = R() * w, y = R() * h, r = 30 + R() * 90, v = R() > .5 ? 255 : 170, a = 0.05 + R() * 0.05;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${v},${v},${v - 4},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
    for (let i = 0; i < 9000; i++) {                       // fine aggregate speckle
      const x = R() * w, y = R() * h, v = R() > .55 ? 255 : 90;
      g.fillStyle = `rgba(${v},${v},${v},${0.04 + R() * 0.1})`; g.fillRect(x, y, 1 + (R() > .8 ? 1 : 0), 1);
    }
    for (let i = 0; i < 26; i++) {                         // air voids
      const x = R() * w, y = R() * h;
      g.fillStyle = 'rgba(70,68,64,.22)'; g.beginPath(); g.arc(x, y, 0.6 + R() * 1.4, 0, 6.3); g.fill();
    }
    g.fillStyle = 'rgba(60,58,54,.18)';                    // form-tie holes
    for (let y = 64; y < h; y += 128) for (let x = 64; x < w; x += 128) { g.beginPath(); g.arc(x, y, 3.2, 0, 6.3); g.fill(); }
    g.fillStyle = 'rgba(60,58,54,.10)'; g.fillRect(0, h - 1.5, w, 1.5);        // formwork joint
  });
}

/* MeshStandardMaterial whose map is sampled triplanar in world space (works on instanced meshes), so big slabs are not stretched */
export function triplanar(mat, tex, tile = 0.22) {
  mat.map = tex;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTile = { value: tile };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTkW; varying vec3 vTkN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 tkW = vec4(transformed, 1.0);
        vec3 tkN = objectNormal;
        #ifdef USE_INSTANCING
          tkW = instanceMatrix * tkW; tkN = mat3(instanceMatrix) * tkN;
        #endif
        tkW = modelMatrix * tkW; vTkW = tkW.xyz; vTkN = normalize(mat3(modelMatrix) * tkN);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTkW; varying vec3 vTkN; uniform float uTile;')
      .replace('#include <map_fragment>', `
        vec3 bw = pow(abs(normalize(vTkN)), vec3(10.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 tp = vTkW * uTile;
        vec4 sampledDiffuseColor = texture2D(map, tp.zy) * bw.x + texture2D(map, tp.xz) * bw.y + texture2D(map, tp.xy) * bw.z;
        diffuseColor *= sampledDiffuseColor;`);
  };
  mat.customProgramCacheKey = () => 'tkt-triplanar';
  return mat;
}

export function makeMats() {
  const cmap = concreteMap();
  const concrete = triplanar(new THREE.MeshStandardMaterial({ color: 0xc4c0b6, roughness: 0.93, metalness: 0 }), cmap, 0.22);
  const concreteDark = triplanar(new THREE.MeshStandardMaterial({ color: 0x8f8c86, roughness: 0.95, metalness: 0 }), cmap, 0.3);
  const glass = new THREE.MeshStandardMaterial({ color: 0xa6c6d8, metalness: 0.7, roughness: 0.12, transparent: true, opacity: 0.58, envMapIntensity: 1.6, depthWrite: false });
  const frame = new THREE.MeshStandardMaterial({ color: 0x2a2f34, metalness: 0.7, roughness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x555b61, metalness: 0.8, roughness: 0.38 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff6b1f, metalness: 0.25, roughness: 0.48 });
  const orangeGlow = new THREE.MeshStandardMaterial({ color: 0xff6b1f, emissive: 0xff5a10, emissiveIntensity: 0.9, metalness: 0.1, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, metalness: 0.1, roughness: 0.6 });
  return { cmap, concrete, concreteDark, glass, frame, steel, orange, orangeGlow, white };
}

/* ------------------------------------------------------------ small helpers */
export function glowSprite(color = 0xffb070, size = 20, opacity = 0.5) {
  const t = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.scale.setScalar(size); return m;
}

/* text lying flat on the ground (reads upright from a top-down camera at azimuth 0) or standing (vertical=true) */
export function flatLabel(text, wMeters, opts = {}) {
  const font = opts.font || '500 44px "IBM Plex Mono", monospace', color = opts.color || '#efece4';
  const c = document.createElement('canvas'); const g0 = c.getContext('2d'); g0.font = font;
  const tw = Math.ceil(g0.measureText(text).width) + 16, th = opts.h || 64;
  c.width = tw; c.height = th;
  const g = c.getContext('2d'); g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = opts.align || 'center';
  g.fillText(text, opts.align === 'left' ? 8 : opts.align === 'right' ? tw - 8 : tw / 2, th / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const hM = wMeters * th / tw;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opts.opacity === undefined ? 1 : opts.opacity, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wMeters, hM), mat);
  if (!opts.vertical) m.rotation.x = -Math.PI / 2;
  m.renderOrder = 3;
  return m;
}

/* ------------------------------------------------------------ ground: engineering-paper grid that fades into the distance */
export function makeGround(size = 520) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uBase: { value: new THREE.Color(0x3a3d41) }, uGridC: { value: new THREE.Color(0xdfe6ea) },
      uGrid: { value: 1 }, uFade: { value: new THREE.Vector2(190, 40) }, uAlpha: { value: 1 }, uPool: { value: 0 }, uPoolC: { value: new THREE.Color(1.0, 0.72, 0.4) }
    },
    vertexShader: 'varying vec3 vWp; void main(){ vec4 w = modelMatrix*vec4(position,1.); vWp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `
      uniform vec3 uBase, uGridC, uPoolC; uniform vec2 uFade; uniform float uGrid, uAlpha, uPool; varying vec3 vWp;
      float gl(vec2 p, float s){ vec2 q = p/s; vec2 d = abs(fract(q-.5)-.5)/fwidth(q); return 1.-min(min(d.x,d.y),1.); }
      void main(){
        float r = length(vWp.xz);
        float fade = 1.0 - smoothstep(uFade.y, uFade.x, r);
        float l1 = gl(vWp.xz, 1.), l5 = gl(vWp.xz, 5.), l25 = gl(vWp.xz, 25.);
        float g = (l1*.07 + l5*.24 + l25*.5) * uGrid;
        vec3 col = uBase * (.92 + .08*sin(r*.05)) + uGridC * g;
        col += uPoolC * uPool * (1.0 - smoothstep(0., 60., r)) * .55;
        gl_FragColor = linearToOutputTexel(vec4(col, fade * uAlpha));
      }`
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2; m.renderOrder = -2;
  return m;
}

/* ------------------------------------------------------------ drawn plan */
export class PlanDrawing {
  constructor() { this.paths = []; this.segs = []; this.labels = []; this.total = 0; this.verts = []; this.styles = []; this.idx = []; this.ds = []; }

  /* pts: [[x,z],...]; w: width in metres; style 0 solid, 1 dashed, 2 dash-dot */
  path(pts, w = 0.14, style = 0, close = false) {
    const P = close ? [...pts, pts[0]] : pts;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 1e-6) continue;
      const ux = dx / len, uz = dz / len, nx = -uz * w / 2, nz = ux * w / 2, e = w / 2;
      const ax = a[0] - ux * e, az = a[1] - uz * e, bx = b[0] + ux * e, bz = b[1] + uz * e;
      const d0 = this.total, d1 = this.total + len, i0 = this.verts.length / 3;
      this.verts.push(ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx - nx, 0, bz - nz, bx + nx, 0, bz + nz);
      this.ds.push(d0 - e, d0 - e, d1 + e, d1 + e); this.styles.push(style, style, style, style);
      this.idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
      this.segs.push({ d0, d1, ax: a[0], az: a[1], ux, uz });
      this.total = d1;
    }
    return this.total;
  }
  rect(cx, cz, w, d, lw = 0.14, style = 0) { const x = w / 2, z = d / 2; return this.path([[cx - x, cz - z], [cx + x, cz - z], [cx + x, cz + z], [cx - x, cz + z]], lw, style, true); }
  circle(cx, cz, r, lw = 0.1, n = 28, style = 0) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return this.path(p, lw, style, true); }
  label(text, x, z, wMeters, opts = {}) { this.labels.push({ text, x, z, w: wMeters, at: this.total, opts }); }

  build(color = 0xe9eef2) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.verts, 3));
    g.setAttribute('aD', new THREE.Float32BufferAttribute(this.ds, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(this.styles, 1));
    g.setIndex(this.idx);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uDraw: { value: 0 }, uAlpha: { value: 1 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: 'attribute float aD; attribute float aS; varying float vD; varying float vS; void main(){ vD = aD; vS = aS; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `
        uniform float uDraw, uAlpha; uniform vec3 uColor; varying float vD; varying float vS;
        void main(){
          if (vD > uDraw) discard;
          if (vS > .5 && vS < 1.5) { if (mod(vD, 1.5) > .85) discard; }
          else if (vS > 1.5) { float m = mod(vD, 3.2); if (!(m < 1.8 || (m > 2.25 && m < 2.55))) discard; }
          float head = smoothstep(uDraw - 2.0, uDraw, vD);
          vec3 col = mix(uColor, vec3(1.0, .55, .2), head);
          gl_FragColor = linearToOutputTexel(vec4(col, uAlpha));
        }`
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.position.y = 0.07; this.mesh.renderOrder = 2; this.mesh.frustumCulled = false;
    this.group = new THREE.Group(); this.group.add(this.mesh);
    this.labelMeshes = this.labels.map(l => {
      const m = flatLabel(l.text, l.w, l.opts); m.position.set(l.x, 0.1, l.z); if (l.opts.rot) m.rotation.z = l.opts.rot; m.userData.at = l.at; m.material.opacity = 0; m.userData.op = l.opts.opacity === undefined ? 1 : l.opts.opacity;
      this.group.add(m); return m;
    });
    // pen tip: orange dot + glow
    this.pen = glowSprite(0xff7a2d, 4.5, 0.95); this.pen.position.y = 0.4; this.group.add(this.pen);
    return this.group;
  }
  pointAt(d) {
    const S = this.segs; let lo = 0, hi = S.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (S[mid].d0 <= d) lo = mid; else hi = mid - 1; }
    const s = S[lo], k = clamp(d - s.d0, 0, s.d1 - s.d0);
    return [s.ax + s.ux * k, s.az + s.uz * k];
  }
  setDraw(d, alpha = 1) {
    this.mat.uniforms.uDraw.value = d; this.mat.uniforms.uAlpha.value = alpha;
    for (const m of this.labelMeshes) m.material.opacity = clamp((d - m.userData.at) / 3) * m.userData.op * alpha;
    const complete = d >= this.total;
    this.pen.visible = !complete && d > 0.01;
    if (this.pen.visible) { const p = this.pointAt(d); this.pen.position.x = p[0]; this.pen.position.z = p[1]; }
  }
}
