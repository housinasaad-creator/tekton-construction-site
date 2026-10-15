/*
  Site Lab page logic: the cure-and-crush instrument and the shake table, with their charts and readouts.
  The numbers come from simple textbook-style models (maturity curve and a five-DOF shear building); they are for teaching, not design.
*/
import './i18n/home.js';
import './i18n/lab.js';
import { TKT, t, waLink, pageReady } from './layout.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* ---------------------------------------------------------------- cure model */
const MIX = { c25: { f: 25, am: 1, name: 'C25' }, c30: { f: 30, am: 1, name: 'C30' }, c30r: { f: 30, am: 0.55, name: 'C30' }, c35: { f: 35, am: 0.95, name: 'C35' } };
const CUR = { wet: { a: 4, b: 0.85, fin: 1.0 }, air: { a: 5, b: 0.9, fin: 0.72 }, cold: { a: 8, b: 0.8, fin: 0.92 }, hot: { a: 2.5, b: 0.95, fin: 0.8 } };
const st = { mix: 'c30', cur: 'wet', day: 28, tests: [], testDay: null, playing: false, raf: 0 };
const g = (d, a, b) => d / (a + b * d);
const mean28 = () => MIX[st.mix].f + 8;                                  // fcm = fck + 8 (Eurocode-style relation)
const frac = (d) => { const c = CUR[st.cur], a = c.a * MIX[st.mix].am; return d <= 0 ? 0 : g(d, a, c.b) / g(28, a, c.b); };
const strength = (d) => mean28() * CUR[st.cur].fin * frac(d);
const scatter = (d) => 1 + 0.02 * Math.sin(d * 12.9898 + Object.keys(MIX).indexOf(st.mix) * 3.1);

let cure = null, shake = null;
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

function drawChart(cv, draw) {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth || 640, h = cv.clientHeight || 240;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); draw(c, w, h);
}
const ORANGE = '#ff6b1f', INK = '#efece4', GRID = 'rgba(239,236,228,.12)', DIM = '#8f8e88';

function fillRange(el) { const mn = +el.min, mx = +el.max; el.style.setProperty('--v', ((+el.value - mn) / (mx - mn) * 100) + '%'); }
function chartCure() {
  const cv = $('#cureChart'); if (!cv) return;
  drawChart(cv, (c, w, h) => {
    const L = 40, R = 12, T = 12, B = 28, pw = w - L - R, ph = h - T - B, ymax = 50;
    const X = (d) => L + d / 28 * pw, Y = (v) => T + ph - v / ymax * ph;
    c.font = '500 11px "IBM Plex Mono", monospace'; c.fillStyle = DIM; c.strokeStyle = GRID; c.lineWidth = 1;
    for (let v = 0; v <= 50; v += 10) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(String(v), L - 6, Y(v) + 4); }
    for (const d of [0, 7, 14, 21, 28]) { c.beginPath(); c.moveTo(X(d), T); c.lineTo(X(d), T + ph); c.stroke(); c.textAlign = 'center'; c.fillText(String(d), X(d), h - 8); }
    c.textAlign = 'left'; c.fillText(t('cu.axis.y'), 4, T + 4); c.textAlign = 'right'; c.fillText(t('cu.axis.x'), w - 2, h - 8);
    const tg = MIX[st.mix].f; c.setLineDash([6, 5]); c.strokeStyle = 'rgba(92,194,127,.85)'; c.beginPath(); c.moveTo(L, Y(tg)); c.lineTo(w - R, Y(tg)); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#5cc27f'; c.textAlign = 'left'; c.fillText(MIX[st.mix].name, L + 6, Y(tg) - 5);
    c.strokeStyle = ORANGE; c.lineWidth = 2.6; c.beginPath();
    for (let d = 0; d <= 28.001; d += 0.25) { const v = strength(d); if (d === 0) c.moveTo(X(d), Y(v)); else c.lineTo(X(d), Y(v)); } c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(X(st.day), T); c.lineTo(X(st.day), T + ph); c.stroke(); c.setLineDash([]);
    c.fillStyle = INK; c.beginPath(); c.arc(X(st.day), Y(strength(st.day)), 5, 0, 6.3); c.fill();
    for (const q of st.tests) { c.strokeStyle = ORANGE; c.fillStyle = '#14100c'; c.lineWidth = 2.5; c.beginPath(); c.arc(X(q.day), Y(q.mpa), 7, 0, 6.3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(X(q.day) - 4, Y(q.mpa) - 4); c.lineTo(X(q.day) + 4, Y(q.mpa) + 4); c.moveTo(X(q.day) + 4, Y(q.mpa) - 4); c.lineTo(X(q.day) - 4, Y(q.mpa) + 4); c.stroke(); }
  });
}
function readCure() {
  const d = st.day, mpa = strength(d);
  $('#dayOut').textContent = fmt1(d).replace('.0', ''); $('#rMpa').textContent = fmt1(mpa);
  $('#rPct').textContent = Math.round(mpa / (mean28() * CUR[st.cur].fin) * 100); $('#rTgt').textContent = MIX[st.mix].f;
  $('#day').value = d; fillRange($('#day'));
  if (cure) cure.setAge(frac(d));
  chartCure();
}
function setSeg(seg, attr, val) { $$('button', seg).forEach(b => { const on = b.dataset[attr] === val; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
function resetTests() { st.tests = []; $('#cureRes').innerHTML = ''; $('#cureRes').className = 'result'; if (cure) cure.reset(); $('#runBtn').disabled = false; $('#day').disabled = false; readCure(); }

function initCure() {
  $('#mixSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.mix = b.dataset.mix; setSeg($('#mixSeg'), 'mix', st.mix); resetTests(); });
  $('#curSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.cur = b.dataset.cur; setSeg($('#curSeg'), 'cur', st.cur); resetTests(); });
  $('#day').addEventListener('input', (e) => { st.day = +e.target.value; stopPlay(); readCure(); });
  $('#resetBtn').addEventListener('click', () => { stopPlay(); resetTests(); });
  $('#playBtn').addEventListener('click', () => { if (st.playing) { stopPlay(); return; } if (cure && cure.test.t >= 0 && !cure.test.broken) return; if (cure) cure.reset(); st.day = 0; st.playing = true; $('#playBtn').classList.add('on'); let last = performance.now(); const f = (now) => { if (!st.playing) return; st.day = Math.min(28, st.day + (now - last) / 1000 * 3.1); last = now; readCure(); if (st.day >= 28) { stopPlay(); return; } st.raf = requestAnimationFrame(f); }; st.raf = requestAnimationFrame(f); });
  $('#runBtn').addEventListener('click', () => { if (!cure) return; stopPlay(); st.testDay = st.day; $('#runBtn').disabled = true; $('#day').disabled = true; $('#cureRes').className = 'result'; $('#cureRes').innerHTML = ''; cure.run(); });
}
function stopPlay() { st.playing = false; cancelAnimationFrame(st.raf); const b = $('#playBtn'); if (b) b.classList.remove('on'); }
function cureFail() {
  const d = st.testDay, mpa = strength(d) * scatter(d), tgt = MIX[st.mix].f, pct = Math.round(mpa / (mean28() * CUR[st.cur].fin) * 100);
  st.tests.push({ day: d, mpa }); chartCure();
  const late = d >= 27.5, ok = mpa >= tgt;
  const res = $('#cureRes'); res.className = 'result on ' + (late ? (ok ? 'ok' : 'bad') : 'mid');
  res.innerHTML = `<b class="num">${t('cu.res.at')} ${fmt1(d).replace('.0', '')} · ${fmt1(mpa)} MPa · ${pct}%</b><span>${late ? (ok ? '✓ ' + t('cu.res.pass') : '✗ ' + t('cu.res.fail')) : t('cu.res.early')}</span>`;
}

/* ---------------------------------------------------------------- shake */
const sh = { iso: true, pga: 0.35, results: {} };
function chartShake(series) {
  const cv = $('#shakeChart'); if (!cv) return;
  drawChart(cv, (c, w, h) => {
    const L = 8, R = 8, T = 10, B = 22, pw = w - L - R, ph = h - T - B, X = (s) => L + s / 14 * pw;
    c.strokeStyle = GRID; c.lineWidth = 1; c.fillStyle = DIM; c.font = '500 11px "IBM Plex Mono", monospace'; c.textAlign = 'center';
    for (let s = 0; s <= 14; s += 2) { c.beginPath(); c.moveTo(X(s), T); c.lineTo(X(s), T + ph); c.stroke(); c.fillText(s + ' s', X(s), h - 6); }
    c.beginPath(); c.moveTo(L, T + ph / 2); c.lineTo(w - R, T + ph / 2); c.stroke();
    if (!series || !series.length) return;
    const aMax = Math.max(0.1, ...series.map(p => Math.abs(p[1]))), dMax = Math.max(2, ...series.map(p => Math.abs(p[2])));
    const trace = (k, max, color, lw) => { c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); series.forEach((p, i) => { const x = X(p[0]), y = T + ph / 2 - p[k] / max * (ph / 2 - 3); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); };
    trace(1, aMax, 'rgba(239,236,228,.45)', 1.2); trace(2, dMax, ORANGE, 2.2);
    c.textAlign = 'left'; c.fillStyle = 'rgba(239,236,228,.6)'; c.fillText('ground a (g)', L + 2, T + 10); c.fillStyle = ORANGE; c.fillText('roof Δ (cm)', L + 104, T + 10);
  });
}
function gauge(drift, stroke) {
  $('#gDrift').textContent = (drift * 100).toFixed(2); $('#gFill').style.width = clamp(drift / 0.03, 0, 1) * 100 + '%';
  $('#gFill').dataset.s = drift < 0.01 ? 'ok' : drift < 0.02 ? 'mid' : 'bad';
  $('#gStroke').textContent = Math.round(stroke * 100);
}
function shakeDone(r) {
  const key = r.pga.toFixed(2); sh.results[key] = sh.results[key] || {}; sh.results[key][r.iso ? 'iso' : 'fix'] = r.maxDrift;
  const v = r.maxDrift < 0.01 ? 'ok' : r.maxDrift < 0.02 ? 'mid' : 'bad', txt = t('sh.v.' + v);
  const both = sh.results[key]; let cmp = '';
  if (both.fix !== undefined && both.iso !== undefined) cmp = `<em>${t('sh.cmp')} (${key} g): ${t('sh.fixed')} <b class="num">${(both.fix * 100).toFixed(2)}%</b> · ${t('sh.isol')} <b class="num">${(both.iso * 100).toFixed(2)}%</b></em>`;
  const res = $('#shakeRes'); res.className = 'result on ' + (v === 'ok' ? 'ok' : v === 'mid' ? 'mid' : 'bad');
  res.innerHTML = `<b class="num">${t('sh.max')} ${(r.maxDrift * 100).toFixed(2)}%${r.iso ? ' · ' + t('sh.stroke') + ' ' + Math.round(r.stroke * 100) + ' cm' : ''}</b><span>${txt}</span>${cmp}`;
  $('#quakeBtn').disabled = false; $('#quakeBtn').textContent = t('sh.go');
  chartShake(r.series); gauge(r.maxDrift, r.stroke);
}
function initShake() {
  $('#isoSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || shake.running) return; sh.iso = b.dataset.iso === '1'; setSeg($('#isoSeg'), 'iso', sh.iso ? '1' : '0'); shake.setIsolation(sh.iso); clearShake(); });
  const setPga = (v) => { sh.pga = v; $('#pgaOut').textContent = v.toFixed(2) + ' g'; $('#pga').value = v; fillRange($('#pga')); $$('#pgaSeg button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.pga - v) < 0.005)); shake.setPga(v); };
  $('#pgaSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || shake.running) return; setPga(+b.dataset.pga); clearShake(); });
  $('#pga').addEventListener('input', (e) => { if (shake.running) return; setPga(+e.target.value); clearShake(); });
  $('#quakeBtn').addEventListener('click', () => { if (shake.running) return; clearShake(); shake.setPga(sh.pga); shake._initSim(); shake.start(); });
  $('#quakeReset').addEventListener('click', () => { shake.reset(); clearShake(); });
}
function clearShake() { if (shake && !shake.running) { shake._initSim(); shake._pose(); } $('#shakeRes').className = 'result'; $('#shakeRes').innerHTML = ''; gauge(0, 0); chartShake(null); }

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

async function start() {
  initCure(); readCure(); initShake(); gauge(0, 0); chartShake(null); fillRange($('#pga'));
  $('#cureCap').textContent = t('cu.cap'); $('#shakeCap').textContent = t('sh.cap');
  const wa = $('#ctaWa'); if (wa) wa.href = waLink('');
  window.addEventListener('langchange', () => { $('#cureCap').textContent = t('cu.cap'); $('#shakeCap').textContent = t('sh.cap'); chartCure(); chartShake(shake && shake.series); $('#quakeBtn').textContent = shake && shake.running ? t('sh.running') : t('sh.go'); });
  addEventListener('resize', () => { chartCure(); chartShake(shake && shake.series); });
  if (!webglOK() || new URLSearchParams(location.search).has('nogl')) { $$('.lab-view').forEach(v => v.classList.add('nogl')); pageReady(); return; }
  await Promise.race([Promise.all(['500 40px "IBM Plex Mono"', '800 54px "Big Shoulders Display"'].map(f => document.fonts.load(f).catch(() => {}))), new Promise(r => setTimeout(r, 2000))]);
  const { CureLab, ShakeLab } = await import('./gl/labs.js');
  const mobile = matchMedia('(max-width: 860px)').matches || matchMedia('(pointer: coarse)').matches;
  cure = new CureLab({ canvas: $('#cureGl'), mobile, ui: { onFail: cureFail, onDone() { $('#runBtn').disabled = false; $('#day').disabled = false; } } });
  shake = new ShakeLab({ canvas: $('#shakeGl'), mobile, ui: {
    onStart() { $('#quakeBtn').disabled = true; $('#quakeBtn').textContent = t('sh.running'); $('#shakeRes').className = 'result'; $('#shakeRes').innerHTML = ''; },
    onTick(d) { gauge(d.maxDrift, d.stroke); if (((d.t * 10) | 0) % 4 === 0) chartShake(d.series); },
    onDone: shakeDone, onReset() {} } });
  window.__cure = cure; window.__shake = shake;
  readCure(); shake.setIsolation(sh.iso);
  for (const [lab, el] of [[cure, '#cureGl'], [shake, '#shakeGl']]) {
    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) lab.stage ? lab.stage.start() : lab.start(); else lab.stage.stop(); }), { threshold: 0 });
    io.observe($(el));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => pageReady()));
}
start();
