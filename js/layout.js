/*
  Shared chrome: header and footer, language switch (AR/TR/EN), reveal-on-scroll, counters, the "concrete pour" page transition
  with its spirit-level loader, the laser-crosshair cursor and the tape-measure scroll gauge.
  Every page loads this file and then its own. Event: window 'langchange' after each language switch. Pages call pageReady() when their 3D is warm.
*/
import { BRAND, markSVG } from './brand.js';
import { T, LANGS, detectLang } from './i18n.js';
import './i18n/common.js';

export const ICON = {
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7-6.2-7-11.2A7 7 0 0 1 19 9.8C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>'
};

const PAGE = document.body.dataset.page || 'home';
const NAV = [['home', 'index.html', 'nav.home'], ['projects', 'projects.html', 'nav.projects'], ['services', 'services.html', 'nav.services'], ['lab', 'lab.html', 'nav.lab'], ['about', 'about.html', 'nav.about']];

export const TKT = { lang: detectLang() };
export const t = (k) => (T[TKT.lang] && T[TKT.lang][k]) || T.en[k] || k;
export const waLink = (text) => `https://wa.me/${BRAND.wa}?text=${encodeURIComponent(text || t('wa.hi'))}`;
window.TKT = TKT; TKT.t = t; TKT.waLink = waLink;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function buildChrome() {
  const hdr = $('#hdr');
  if (hdr) hdr.outerHTML = `
  <header class="hdr" id="hdrbar">
    <a class="brand" href="index.html" aria-label="${BRAND.name}">${markSVG()}<span class="bn"><b>${BRAND.name}</b><em>${BRAND.nameAr}</em></span></a>
    <nav class="nav" aria-label="Main">${NAV.map(([id, href, k]) => `<a href="${href}" ${PAGE === id ? 'class="on" aria-current="page"' : ''} data-i18n="${k}"></a>`).join('')}</nav>
    <div class="tools">
      <div class="lang" role="group" aria-label="Language">${LANGS.map(l => `<button type="button" data-lang="${l}" aria-pressed="false">${l.toUpperCase()}</button>`).join('')}</div>
      ${document.body.dataset.sound ? `<button class="snd" id="sndBtn" type="button" aria-pressed="false" data-i18n-aria="nav.sound" aria-label="Sound"><svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg><svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg></button>` : ''}
      <a class="btn solid cta" href="contact.html" data-i18n="nav.quote"></a>
      <button class="burger" type="button" aria-label="Menu" aria-expanded="false" data-i18n-aria="nav.menu"><i></i></button>
    </div>
  </header>
  <div class="mnav" id="mnav">${NAV.map(([id, href, k]) => `<a href="${href}" data-i18n="${k}"></a>`).join('')}<a href="contact.html" data-i18n="nav.contact"></a></div>`;

  const ftr = $('#ftr');
  if (ftr) ftr.outerHTML = `
  <footer class="ftr"><div class="hazard" aria-hidden="true"></div><div class="wrap">
    <div class="fgrid">
      <div>
        <a class="brand" href="index.html">${markSVG()}<span class="bn"><b>${BRAND.name}</b><em>${BRAND.nameAr}</em></span></a>
        <p data-i18n="f.tag"></p>
        <p class="demo-note" data-i18n="f.demo"></p>
      </div>
      <div><h4 data-i18n="f.links"></h4><ul>${NAV.map(([id, href, k]) => `<li><a href="${href}" data-i18n="${k}"></a></li>`).join('')}<li><a href="contact.html" data-i18n="nav.contact"></a></li></ul></div>
      <div><h4 data-i18n="f.contact"></h4><ul>
        <li><a href="${waLink('')}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li data-i18n="f.hours"></li><li data-i18n="f.addr"></li></ul></div>
    </div>
    <div class="fbar"><span>© ${BRAND.year} ${BRAND.name} — demo</span><span><span data-i18n="f.by"></span> <a href="https://housinasaad-creator.github.io/mohammed-studio/" target="_blank" rel="noopener">MOHAMMED Web Studio</a></span></div>
  </div></footer>
  <a class="wa-float" href="${waLink('')}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>`;

  // concrete-pour overlay + spirit-level loader
  const pour = $('#pour');
  if (pour) pour.innerHTML = `<div class="pour-in">${markSVG('pm')}<div class="vial" aria-hidden="true"><i class="tick l"></i><i class="tick r"></i><b class="bub"></b></div><p data-i18n="load.t"></p></div>`;

  // laser crosshair + tape gauge (fine pointers / wide screens only)
  if (matchMedia('(pointer: fine)').matches) {
    const c = document.createElement('div'); c.className = 'cur'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i class="ch h"></i><i class="ch v"></i><i class="br a"></i><i class="br b"></i><i class="br c"></i><i class="br d"></i><span class="ro"></span>';
    document.body.appendChild(c); initCursor(c);
  }
  if (innerWidth >= 1100 && !document.body.dataset.notape) {
    const tp = document.createElement('div'); tp.className = 'tape'; tp.setAttribute('aria-hidden', 'true');
    tp.innerHTML = '<div class="tk"></div><div class="rd"><b>0.00</b><small>m</small></div>';
    document.body.appendChild(tp); initTape(tp);
  }
}

function initCursor(c) {
  const ro = $('.ro', c); let x = -100, y = -100, cx = x, cy = y, raf = 0, live = false;
  const step = () => {
    cx += (x - cx) * 0.28; cy += (y - cy) * 0.28;
    c.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    if (Math.abs(x - cx) + Math.abs(y - cy) > 0.3) raf = requestAnimationFrame(step); else raf = 0;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    if (!live) { live = true; cx = x; cy = y; c.classList.add('on'); }
    ro.textContent = `X ${String(Math.round(x)).padStart(4, '0')}  Y ${String(Math.round(y)).padStart(4, '0')}`;
    const el = e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,[data-hot]');
    c.classList.toggle('hot', !!el);
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { live = false; c.classList.remove('on'); });
  addEventListener('pointerdown', () => c.classList.add('dn')); addEventListener('pointerup', () => c.classList.remove('dn'));
}

function initTape(tp) {
  const tk = $('.tk', tp), rd = $('.rd b', tp); let pend = 0;
  const upd = () => {
    pend = 0; const y = scrollY;
    const o = `100% ${-(y % 1000)}px`; tk.style.backgroundPosition = `${o}, ${o}, ${o}`;
    rd.textContent = (y / 100).toFixed(2);
  };
  addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(upd); }, { passive: true }); upd();
}

export function applyLang(lang) {
  if (!LANGS.includes(lang)) lang = 'ar';
  TKT.lang = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem('tkt-lang', lang); } catch (e) {}
  document.title = t('title.' + PAGE);
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/* ---- page transition: the overlay is "poured" over the page, then we navigate; on arrival it lifts away ---- */
const pourEl = () => $('#pour');
let readyDone = false;
const t0 = performance.now();
let navFlag = false; try { navFlag = sessionStorage.getItem('tkt-nav') === '1'; sessionStorage.removeItem('tkt-nav'); } catch (e) {}

export function pageReady() {
  if (readyDone) return; readyDone = true;
  const p = pourEl(); if (!p) return;
  const minShow = navFlag ? 260 : 900;
  const wait = Math.max(0, minShow - (performance.now() - t0));
  setTimeout(() => {
    p.classList.add('lvl');                        // bubble settles in the middle
    setTimeout(() => {
      p.classList.add('out');
      setTimeout(() => { p.classList.add('gone'); document.documentElement.classList.add('loaded'); }, 900);
    }, 420);
  }, wait);
}

function bindTransitions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (!/\.html?$|\/$/.test(u.pathname)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    const p = pourEl(); if (!p) { location.href = a.href; return; }
    try { sessionStorage.setItem('tkt-nav', '1'); } catch (er) {}
    p.classList.remove('out', 'gone', 'lvl'); p.classList.add('cover'); void p.offsetWidth; p.classList.add('go');
    setTimeout(() => { location.href = a.href; }, 620);
  });
  addEventListener('pageshow', (e) => {   // back/forward cache: reset the overlay
    if (e.persisted) { const p = pourEl(); if (p) { p.className = 'pour out gone'; } }
  });
}

function init() {
  buildChrome();
  const bar = $('#hdrbar');
  const onScroll = () => bar && bar.classList.toggle('solid', scrollY > 24);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  $$('.lang button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
  const burger = $('.burger'), mnav = $('#mnav');
  if (burger) {
    const close = () => { mnav.classList.remove('open'); document.body.style.overflow = ''; burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', () => { const o = mnav.classList.toggle('open'); document.body.style.overflow = o ? 'hidden' : ''; burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    mnav.addEventListener('click', (e) => { if (e.target.tagName === 'A') close(); });
  }
  applyLang(TKT.lang);
  // reveal on scroll + counters
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    if (e.target.dataset.count) countUp(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  const watch = () => $$('.reveal:not(.in),[data-count]:not(.counted)').forEach(el => io.observe(el));
  watch(); window.addEventListener('tkt-rerender', watch);
  if (location.hash) setTimeout(() => { const el = $(location.hash); if (el) el.scrollIntoView(); }, 350);
  bindTransitions();
  // the floating WhatsApp button steps aside while a full-screen 3D story is on screen
  const stories = $$('.journey, .pj');
  if (stories.length) {
    const upd = () => document.body.classList.toggle('in-journey', stories.some(s => { const r = s.getBoundingClientRect(); return r.top < innerHeight * 0.4 && r.bottom > innerHeight * 0.6; }));
    addEventListener('scroll', upd, { passive: true }); upd();
  }
  // safety: never keep the loader forever
  setTimeout(() => pageReady(), 7000);
  if (!document.querySelector('[data-needs-gl]')) addEventListener('load', () => pageReady());
}

function countUp(el) {
  el.classList.add('counted');
  const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), dur = 1600, suf = el.dataset.suffix || '', t0 = performance.now();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to.toFixed(dec) + suf; return; }
  const f = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
