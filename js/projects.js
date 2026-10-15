/*
  Projects: runs the model table (WebGL), wires the filter chips, labels and info card, and renders the plain list under it.
*/
import './i18n/home.js';
import './i18n/projects.js';
import { TKT, t, waLink, ICON, pageReady } from './layout.js';
import { PROJECTS, TYPES } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lname = (o) => o[TKT.lang] || o.en;
const fmt = (n) => n.toLocaleString('en-US');
const params = new URLSearchParams(location.search);

let city = null, current = null, filter = 'all';

function renderFilters() {
  const f = $('#filters'); if (!f) return;
  f.innerHTML = ['all', ...TYPES].map(k => `<button type="button" role="tab" data-f="${k}" aria-selected="${k === filter}" class="${k === filter ? 'on' : ''}"><span>${t('f.' + k)}</span><sup class="num">${k === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.type === k).length}</sup></button>`).join('');
}
function renderList() {
  const g = $('#plist'); if (!g) return;
  g.innerHTML = PROJECTS.map((p, i) => `
    <a class="proj reveal d${(i % 3) + 1}" href="#pj" data-id="${p.id}" id="${p.id}">
      <div class="img"><img src="assets/projects/${p.id}.webp" alt="${lname(p.name)}" width="640" height="480" loading="lazy"></div>
      <div class="meta num"><span>${t('f.' + p.type)}</span><span>${lname(p.city)}</span><span>${p.year}</span></div>
      <h3>${lname(p.name)}</h3><p>${lname(p.blurb)}</p>
      <span class="go">${t('pr.open')} ${ICON.arrow}</span>
    </a>`).join('');
  window.dispatchEvent(new Event('tkt-rerender'));
}
function fillInfo(p) {
  $('#iTag').textContent = t('f.' + p.type);
  $('#iName').textContent = lname(p.name); $('#iBlurb').textContent = lname(p.blurb);
  $('#iCity').textContent = lname(p.city); $('#iYear').textContent = p.year;
  $('#iAreaK').textContent = t(p.unit === 'm' ? 's.length' : 's.area');
  $('#iArea').textContent = fmt(p.area) + ' ' + p.unit;
  $('#iFloors').textContent = p.floors || '—';
  $('#iStatus').textContent = t('st.' + p.status);
  $('#iBar').style.width = p.status === 'done' ? '100%' : '72%';
  $('#info').dataset.st = p.status;
  $('#iAsk').href = waLink(`${t('pj.wa')} ${lname(p.name)}`);
}

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

async function startCity() {
  const section = $('#pj');
  if (!webglOK() || params.has('nogl')) { section.classList.add('nogl'); pageReady(); return; }
  const solo = params.get('solo');
  if (solo) document.documentElement.classList.add('solo');
  await Promise.race([Promise.all(['600 40px "IBM Plex Mono"'].map(f => document.fonts.load(f).catch(() => {}))), new Promise(r => setTimeout(r, 2000))]);
  const { City } = await import('./gl/city.js');
  const mobile = matchMedia('(max-width: 860px)').matches || matchMedia('(pointer: coarse)').matches;
  const labels = $('#labels');
  labels.innerHTML = PROJECTS.map(p => `<button type="button" class="plbl" data-id="${p.id}"><i></i><span></span></button>`).join('');
  const lbl = {}; $$('.plbl', labels).forEach(b => { lbl[b.dataset.id] = b; });
  const fillLabels = () => PROJECTS.forEach(p => { $('span', lbl[p.id]).textContent = lname(p.name); });
  fillLabels(); window.addEventListener('langchange', fillLabels);
  const titleEl = $('#pjTitle');
  const ui = {
    onFilter(f, n) { filter = f; $$('#filters button').forEach(b => { const on = b.dataset.f === f; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); },
    onSelect(p) {
      current = p; const info = $('#info');
      if (p) { fillInfo(p); info.classList.add('on'); $('#pj').classList.add('sel'); history.replaceState(null, '', '#' + p.id); }
      else { info.classList.remove('on'); $('#pj').classList.remove('sel'); history.replaceState(null, '', location.pathname + location.search); }
    },
    onHover() {},
    onLabels(items, cam, ie, selected, mob) {
      const w = city.stage.w, h = city.stage.h, vec = ui._v || (ui._v = cam.position.clone());
      titleEl.style.opacity = Math.max(0, 1 - ie * 1.9).toFixed(2); titleEl.style.transform = `translateY(${(-ie * 30).toFixed(0)}px)`;
      for (const it of items) {
        const b = lbl[it.p.id], on = it.act > 0.5 && !selected && ie > 0.55 && !document.documentElement.classList.contains('solo');
        b.classList.toggle('on', on);
        if (!on) continue;
        vec.set(it.x, it.root.position.y + 0.7 + it.ud.h + 2.2, it.z).project(cam);
        const sx = (vec.x * 0.5 + 0.5) * w, sy = (-vec.y * 0.5 + 0.5) * h;
        b.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) translate(-50%,-100%)`;
        b.style.opacity = vec.z < 1 ? 1 : 0;
      }
    }
  };
  city = new City({ canvas: $('#gl'), section, ui, mobile, solo });
  window.__city = city;
  if (solo) city.forceIntro = 1;
  renderFilters();
  $('#filters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) city.setFilter(b.dataset.f); });
  labels.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) city.select(b.dataset.id); });
  $('#infoX').addEventListener('click', () => city.select(null)); $('#iBack').addEventListener('click', () => city.select(null));
  // list cards fly to the model
  $('#plist').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-id]'); if (!a) return; e.preventDefault();
    city.setFilter('all'); scrollTo({ top: city.secTop + city.vh * 0.9, behavior: 'smooth' }); setTimeout(() => city.select(a.dataset.id), 450);
  });
  window.addEventListener('langchange', () => { renderFilters(); if (current) fillInfo(current); });
  const io = new IntersectionObserver((es) => es.forEach(en => { if (en.isIntersecting) city.start(); else city.stop(); }), { threshold: 0 });
  io.observe(section); city.start();
  addEventListener('load', () => city._measure());
  // deep link to a project
  const hash = location.hash.slice(1); if (PROJECTS.some(p => p.id === hash) && !solo) { city.forceIntro = 1; setTimeout(() => { city.forceIntro = null; city.select(hash); scrollTo({ top: city.secTop + city.vh * 0.9 }); }, 900); }
  requestAnimationFrame(() => requestAnimationFrame(() => pageReady()));
}

function renderAll() { renderFilters(); renderList(); const wa = $('#ctaWa'); if (wa) wa.href = waLink(''); }
window.addEventListener('langchange', renderAll);
renderAll();
startCity();
