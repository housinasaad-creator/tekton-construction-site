/*
  Services: the exploded-building scroll story, wired to the text blocks, the layer HUD and the rail.
*/
import './i18n/home.js';
import './i18n/services.js';
import { TKT, t, waLink, pageReady } from './layout.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NAMES = ['sv.1.t', 'sv.2.t', 'sv.3.t', 'sv.4.t', 'sv.5.t', 'sv.6.t'];
const RAIL = ['sv.1.k', 'sv.2.k', 'sv.3.k', 'sv.4.k', 'sv.5.k', 'sv.6.k'];

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

async function start() {
  const section = $('#svc');
  if (!webglOK() || new URLSearchParams(location.search).has('nogl')) { section.classList.add('nogl'); pageReady(); return; }
  await Promise.race([Promise.all(['500 40px "IBM Plex Mono"'].map(f => document.fonts.load(f).catch(() => {}))), new Promise(r => setTimeout(r, 2000))]);
  const { Stack } = await import('./gl/stack.js');
  const mobile = matchMedia('(max-width: 860px)').matches || matchMedia('(pointer: coarse)').matches;
  const chs = $$('.ch', section), dots = $('#dots'), shint = $('#shint');
  if (mobile) section.style.height = '600vh';
  dots.innerHTML = RAIL.map((k, i) => `<button type="button" role="tab" aria-label="${i + 1}" data-i="${i}"><span data-i18n="${k}"></span></button>`).join('');
  $$('span', dots).forEach(sp => { sp.textContent = t(sp.dataset.i18n); });
  $('#lyBars').innerHTML = Array.from({ length: 6 }, () => '<i></i>').join('');
  let stack = null;
  const setHud = (act) => {
    const n = act < 0 ? 6 : act + 1;
    $('#hudLayer').classList.toggle('on', act !== -2);
    $('#lyNo').textContent = String(n).padStart(2, '0'); $('#lyName').textContent = act < 0 ? t('sv.7.k') : t(NAMES[act]);
    $$('#lyBars i').forEach((el, i) => el.classList.toggle('on', act === -1 || (act >= 0 && i <= act)));
  };
  const ui = {
    onActive(act) {
      const idx = act === -2 ? 0 : act === -1 ? 7 : act + 1;
      chs.forEach((el, k) => el.classList.toggle('on', k === idx));
      $$('button', dots).forEach((b, k) => b.classList.toggle('on', k === act));
      setHud(act); ui.act = act;
    },
    onProgress(p) { shint.style.opacity = p > 0.012 ? 0 : 1; }
  };
  stack = new Stack({ canvas: $('#gl'), section, ui, mobile });
  window.__stack = stack;
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; scrollTo({ top: stack.yAtScroll(+b.dataset.i), behavior: 'smooth' }); });
  window.addEventListener('langchange', () => { $$('span', dots).forEach(sp => { sp.textContent = t(sp.dataset.i18n); }); setHud(ui.act === undefined ? 0 : ui.act); });
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) stack.start(); else stack.stop(); }), { threshold: 0 });
  io.observe(section); stack.start();
  addEventListener('load', () => stack._measure());
  ui.onActive(-2);
  requestAnimationFrame(() => requestAnimationFrame(() => pageReady()));
}

function renderAll() { const wa = $('#ctaWa'); if (wa) wa.href = waLink(''); }
window.addEventListener('langchange', renderAll); renderAll();
start();
