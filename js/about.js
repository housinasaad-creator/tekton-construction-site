/*
  About: the site-gate odometer sign, plus wiring for the shared reveal and counters.
*/
import './i18n/home.js';
import './i18n/about.js';
import { waLink, pageReady } from './layout.js';

const $ = (s, r = document) => r.querySelector(s);
const TARGET = 412;

function buildOdo() {
  const odo = $('#odo'); if (!odo) return;
  const str = String(TARGET).padStart(3, '0');
  odo.innerHTML = [...str].map(() => `<span class="col"><span class="roll">${Array.from({ length: 10 }, (_, d) => `<i>${d}</i>`).join('')}</span></span>`).join('');
}
function setOdo(n, animate) {
  const cols = document.querySelectorAll('#odo .roll'), str = String(n).padStart(cols.length, '0');
  cols.forEach((el, i) => { el.style.transition = animate ? `transform ${1.5 + i * 0.35}s cubic-bezier(.2,.8,.2,1)` : 'none'; el.style.transform = `translateY(${-(+str[i]) * 10}%)`; });
}
buildOdo(); setOdo(0, false);
const sign = $('#sign');
if (sign) {
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { setTimeout(() => setOdo(TARGET, true), 300); io.disconnect(); } }), { threshold: 0.4 });
  io.observe(sign);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) setOdo(TARGET, false);
}
const wa = $('#ctaWa'); if (wa) wa.href = waLink('');
window.addEventListener('langchange', () => { const w = $('#ctaWa'); if (w) w.href = waLink(''); });
pageReady();
