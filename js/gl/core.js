/*
  Scene core: transparent renderer over a CSS background, an overcast-steel reflection environment, sun + fill lights with
  optional shadows, drifting site dust that follows the camera, a dpr governor, and small helpers. Unit: 1 = 1 metre.
*/
import * as THREE from 'three';

export const PROJ = { value: 1000 };

export class Stage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.mobile = !!opts.mobile;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = opts.exposure || 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.shadows = opts.shadows !== false && !this.mobile;
    if (this.shadows) { this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.quality = { dpr: Math.min(window.devicePixelRatio || 1, this.mobile ? 1.25 : 1.5), level: 0 };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);
    this.scene.add(this.camera);
    this.time = 0; this.hooks = []; this.running = false; this._last = 0; this._ft = [];
    this.landShift = opts.landShift === undefined ? 0.09 : opts.landShift;   // fraction of width the scene is pushed right on landscape (room for text on the left)
    this.portraitShift = opts.portraitShift === undefined ? 0.1 : opts.portraitShift;
    this.buildEnv();
    this.buildLights(opts);
    if (opts.dust !== false) this.buildDust();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /* reflection environment: big soft overcast sky panels, warm low sun strip, cool ground bounce */
  buildEnv() {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.MeshBasicMaterial({ color: 0x59636c, side: THREE.BackSide })));
    const box = (w, h, pos, color, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); s.add(m);
    };
    box(46, 30, [0, 34, 4], 0xe9eef2, 3.0);         // big overcast sky
    box(14, 24, [-26, 10, 16], 0xfff0dc, 3.2);      // key side (sun-ish)
    box(5, 30, [28, 8, -4], 0xcfe0ee, 2.6);         // cool edge
    box(30, 6, [0, -2, -34], 0xff8a45, 1.6);        // low warm horizon glow
    box(40, 10, [0, -26, 0], 0x8d98a0, 0.9);        // ground bounce
    box(24, 14, [8, 10, 32], 0xdfe6ea, 1.2);        // front fill
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pm.fromScene(s, 0.035);
    pm.dispose();
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 1.0;
  }

  buildLights(opts) {
    this.key = new THREE.DirectionalLight(0xfff1de, 2.9); this.key.position.set(-40, 62, 34);
    if (this.shadows) {
      const sz = Math.min(opts.shadowSize || 2048, 1536), e = opts.shadowExtent || 56;
      this.key.castShadow = true; this.key.shadow.mapSize.set(sz, sz);
      const c = this.key.shadow.camera; c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 10; c.far = 220;
      this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.05; this.key.shadow.radius = 3;
    }
    this.rim = new THREE.DirectionalLight(0xffb27a, 1.5); this.rim.position.set(46, 24, -44);
    this.fill = new THREE.HemisphereLight(0xcfdde8, 0x3a3733, 0.8);
    this.scene.add(this.key, this.rim, this.fill, this.key.target);
    this.keyTarget = this.key.target;
  }

  /* fine site dust in a box that follows the camera (gives a sense of travel between stations) */
  buildDust() {
    const n = this.mobile ? 140 : 280, box = new THREE.Vector3(140, 80, 110);
    const g = new THREE.BufferGeometry();
    const a = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { a[i * 3] = Math.random() * box.x; a[i * 3 + 1] = Math.random() * box.y; a[i * 3 + 2] = Math.random() * box.z; s[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uProj: PROJ, uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: box }, uPx: { value: 1 }, uTint: { value: new THREE.Color(.86, .9, .95) }, uAmt: { value: 1 } },
      vertexShader: `
        uniform float uTime, uPx, uAmt, uProj; uniform vec3 uCam, uBox; attribute float aSeed; varying float vA;
        void main(){
          vec3 p = position + vec3(sin(uTime*.07+aSeed*40.)*3., uTime*(.35+aSeed*.5), cos(uTime*.05+aSeed*30.)*3.);
          vec3 rel = mod(p - uCam + uBox*.5, uBox) - uBox*.5;
          vec3 w = uCam + rel;
          vec4 mv = viewMatrix*vec4(w,1.);
          float d = -mv.z;
          vA = smoothstep(uBox.z*.5, uBox.z*.15, length(rel)) * (.25+.75*fract(aSeed*7.13)) * uAmt;
          vA *= .55 + .45*sin(uTime*(.6+aSeed*1.6)+aSeed*60.);
          gl_PointSize = (0.2 + aSeed*0.6) * uProj / max(d, 6.);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uTint; varying float vA;
        void main(){ vec2 c = gl_PointCoord-.5; float r = length(c); float a = smoothstep(.5,.0,r); a*=a; gl_FragColor = linearToOutputTexel(vec4(uTint, a*vA*.7)); }`
    });
    this.dust = new THREE.Points(g, this.dustMat); this.dust.frustumCulled = false; this.dust.renderOrder = 5;
    this.scene.add(this.dust);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // narrow screens: widen the field of view so the model is not cropped
    this.camera.userData.aspectK = w / h < 1 ? 1.0 + (1 - w / h) * 0.9 : 1;
    this.applyViewOffset(0);
    if (this.dustMat) this.dustMat.uniforms.uPx.value = this.quality.dpr * Math.min(1.4, Math.max(0.7, h / 800));
  }

  /* pushes the picture right (landscape) or down-screen (portrait) so text on the left/bottom has room; oy = extra vertical fraction */
  applyViewOffset(oy = 0) {
    const w = this.w, h = this.h, cam = this.camera, land = w / h > 1.15;
    if (this.landShift === 0 && this.portraitShift === 0 && !oy) { cam.clearViewOffset(); cam.updateProjectionMatrix(); return; }
    cam.setViewOffset(w, h, land ? -w * this.landShift : 0, land ? h * oy : h * (this.portraitShift + oy), w, h);
    cam.updateProjectionMatrix();
  }

  setFov(f) { const k = this.camera.userData.aspectK || 1; const v = f * k; if (Math.abs(this.camera.fov - v) > 1e-3) { this.camera.fov = v; this.camera.updateProjectionMatrix(); } }

  /* quality governor: lower the resolution if frames get slow */
  _govern(dt) {
    this._ft.push(dt); if (this._ft.length < 60) return;
    const avg = this._ft.reduce((a, b) => a + b, 0) / this._ft.length; this._ft.length = 0;
    if (avg > 0.021 && this.quality.dpr > 1) { this.quality.dpr = Math.max(1, this.quality.dpr - 0.25); this.resize(); }
  }

  add(fn) { this.hooks.push(fn); }

  start() {
    if (this.running) return; this.running = true; this._last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
      this.time += dt;
      PROJ.value = (this.h * this.quality.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
      if (this.dustMat) { this.dustMat.uniforms.uTime.value = this.time; this.dustMat.uniforms.uCam.value.copy(this.camera.position); }
      for (const h of this.hooks) h(dt, this.time);
      this.renderer.render(this.scene, this.camera);
      this._govern(dt);
    };
    requestAnimationFrame(loop);
  }
  stop() { this.running = false; }
  /* يحرّر كل شيء (الأشكال والخامات والقوام وسياق الرسم) حين يبتعد الزائر عن الهيرو كثيراً */
  dispose() {
    this.running = false;
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { for (const k in x) { const v = x[k]; if (v && v.isTexture) v.dispose(); } x.dispose(); });
    });
    if (this.scene.environment) this.scene.environment.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}

/* quick 2D texture generator */
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8; t.wrapS = opts.wrapS || THREE.RepeatWrapping; t.wrapT = opts.wrapT || THREE.RepeatWrapping;
  return t;
}

export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/* seeded random so procedural scenery is identical on every load */
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
