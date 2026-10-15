/*
  Sounds generated in code (WebAudio): pencil scratch, metal clank, concrete mixer rumble, crane beep, cylinder crack, key turn, building hum.
  Off by default; the speaker button in the header turns them on.
*/
export class Sfx {
  constructor() { this.on = false; this.ctx = null; this.master = null; this.noise = null; this.loops = {}; }
  _init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  toggle() {
    this.on = !this.on;
    if (this.on) { this._init(); if (!this.ctx) { this.on = false; return false; } if (this.ctx.state === 'suspended') this.ctx.resume(); this.chime(); }
    else this.stopAll();
    return this.on;
  }
  get t() { return this.ctx.currentTime; }
  _src(t0, dur, fType, f0, f1, q, gain, atk = 0.01) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = fType; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + atk); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  _tone(t0, freq, dur, gain, type = 'sine', slide = 1) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  _loop(name, fType, freq, q, gain) {
    if (!this.on || !this.ctx) return null;
    if (this.loops[name]) return this.loops[name];
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = fType; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    return (this.loops[name] = { s, f, g, gain });
  }
  setLoop(name, level, freq) {
    const l = this.loops[name]; if (!l) return;
    l.g.gain.setTargetAtTime(level * l.gain, this.t, 0.08);
    if (freq) l.f.frequency.setTargetAtTime(freq, this.t, 0.08);
  }
  stopAll() { for (const k in this.loops) { try { this.loops[k].s.stop(); } catch (e) {} } this.loops = {}; }

  chime() { if (!this.on) return; const t = this.t; this._tone(t, 659, 0.5, 0.06, 'triangle'); this._tone(t + 0.09, 988, 0.7, 0.05, 'sine'); }
  tick() { if (!this.on) return; this._src(this.t, 0.03, 'highpass', 4200 + Math.random() * 2000, 5200, 0.8, 0.07, 0.001); }
  /* pencil drawing a line: a scratchy band that follows how fast the plan is being drawn */
  pencil(level) { if (!this.on) return; this._loop('pencil', 'bandpass', 4200, 2.2, 0.12); this.setLoop('pencil', level, 3600 + level * 1800); }
  /* metal impact: a dull clank with a ring */
  clank(k = 1) {
    if (!this.on) return; const t = this.t;
    this._src(t, 0.09, 'bandpass', 2200, 900, 1.6, 0.35 * k, 0.002);
    this._tone(t, 410 * (0.9 + Math.random() * 0.2), 0.55, 0.11 * k, 'triangle', 0.8); this._tone(t, 1130, 0.3, 0.05 * k, 'sine');
  }
  /* concrete mixer: low rumble with a slow wobble */
  rumble(level) { if (!this.on) return; this._loop('mix', 'lowpass', 220, 0.6, 0.35); this.setLoop('mix', level, 160 + Math.sin(this.t * 2.2) * 50 + level * 90); }
  beep() { if (!this.on) return; const t = this.t; this._tone(t, 1480, 0.1, 0.035, 'square'); }
  /* concrete cylinder failing: sharp crack, a thump, then rubble */
  crack(big = 1) {
    if (!this.on) return; const t = this.t;
    this._src(t, 0.12, 'bandpass', 3200, 1200, 1.2, 0.6 * big, 0.002);
    this._tone(t, 90, 0.45, 0.28 * big, 'sine', 0.5);
    for (let i = 0; i < 6; i++) this._src(t + 0.08 + i * 0.05 + Math.random() * 0.04, 0.05, 'highpass', 3600 + Math.random() * 2400, 5000, 0.7, 0.09 * big, 0.002);
  }
  press(level) { if (!this.on) return; this._loop('press', 'bandpass', 520, 3, 0.07); this.setLoop('press', level, 420 + level * 520); }
  /* key turn: ratchet clicks, a heavy clunk, then the building humming into life */
  key() {
    if (!this.on) return; const t = this.t;
    for (let i = 0; i < 5; i++) this._src(t + i * 0.07, 0.03, 'highpass', 3000, 3600, 0.8, 0.12, 0.001);
    this.clank(1.6);
    this._tone(t + 0.45, 55, 2.2, 0.18, 'sawtooth', 1.8); this._tone(t + 0.45, 110, 2.2, 0.1, 'triangle', 1.5);
    for (let i = 0; i < 6; i++) this._tone(t + 0.9 + i * 0.16, 520 + i * 70, 0.9, 0.04, 'sine');
  }
  done() { if (!this.on) return; const t = this.t; this._tone(t, 392, 1.2, 0.07, 'triangle'); this._tone(t + 0.14, 494, 1.3, 0.06, 'triangle'); this._tone(t + 0.28, 587, 1.6, 0.06, 'sine'); this._tone(t + 0.42, 784, 2, 0.05, 'sine'); }
  /* shaking table: low thud-rumble that follows ground motion */
  quake(level) { if (!this.on) return; this._loop('quake', 'lowpass', 140, 0.8, 0.55); this.setLoop('quake', level, 90 + level * 160); }
}
