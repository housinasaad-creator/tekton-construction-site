/*
  Home: runs the scroll story (WebGL) and wires it to the text and HUD, then renders the sections below it.
*/
import './i18n/home.js';
import { TKT, t, waLink, ICON, pageReady } from './layout.js';
import { PROJECTS } from './data.js';
import { BRAND } from './brand.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lname = (o) => o[TKT.lang] || o.en;
const fmt = (n) => n.toLocaleString('en-US');

/* ------------------------------------------------------------ featured projects */
const FEATURED = ['zeytin', 'pinar', 'kervan'];
function renderFeatured() {
  const g = $('#featGrid'); if (!g) return;
  g.innerHTML = FEATURED.map((id, i) => { const p = PROJECTS.find(x => x.id === id); return `
    <a class="proj reveal d${i + 1}" href="projects.html#${p.id}">
      <div class="img"><img src="assets/projects/${p.id}.webp" alt="${lname(p.name)}" width="640" height="480" loading="lazy"></div>
      <div class="meta num"><span>${lname(p.city)}</span><span>${p.year}</span><span>${fmt(p.area)} ${p.unit}</span></div>
      <h3>${lname(p.name)}</h3><p>${lname(p.blurb)}</p>
      <span class="go">${t('pr.open')} ${ICON.arrow}</span>
    </a>`; }).join('');
  window.dispatchEvent(new Event('tkt-rerender'));
}

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

/* ================= المشهد الثلاثي الأبعاد الحي (محفوظ، لا يُحذف): startJourney3D =================
   الهيرو الآن فيديو (startJourney أسفله). هذه الدالة كما كانت (Story/WebGL + HUD + المفتاح + أزرار الأشعة) ولا تُستدعى؛
   لإعادتها: استدعِ startJourney3D() بدل startJourney()، وأعد محتوى <template id="scene3d-archive"> في index.html إلى داخل .stage. */
async function startJourney3D() {
  const section = $('#journey');
  if (!webglOK() || new URLSearchParams(location.search).has('nogl')) { section.classList.add('nogl'); pageReady(); return; }
  const fontsReady = Promise.race([
    Promise.all(['600 40px "IBM Plex Mono"', '500 40px "IBM Plex Mono"', '800 100px "Big Shoulders Display"', '700 40px "Big Shoulders Display"'].map(f => document.fonts.load(f).catch(() => {}))),
    new Promise(r => setTimeout(r, 2500))
  ]);
  const [{ Story, CHAPTERS }, { Sfx }] = await Promise.all([import('./gl/story.js'), import('./gl/sfx.js'), fontsReady]);
  const sfx = new Sfx();
  const mobile = matchMedia('(max-width: 860px)').matches || matchMedia('(pointer: coarse)').matches;
  const chs = $$('.ch', section), dots = $('#dots'), shint = $('#shint'), stageEl = $('.stage', section);
  const names = ['j.c1.k', 'j.c2.k', 'j.c3.k', 'j.c4.k', 'j.c5.k'];
  dots.innerHTML = names.map((k, i) => `<button type="button" role="tab" aria-label="${i + 1}" data-i="${i}"><span data-i18n="${k}"></span></button>`).join('');
  $$('span', dots).forEach(sp => { sp.textContent = t(sp.dataset.i18n); });
  if (mobile) section.style.height = '620vh';
  $('#floors').innerHTML = Array.from({ length: 9 }, () => '<i></i>').join('');

  const hudPlan = $('#hudPlan'), hudRise = $('#hudRise'), hudCure = $('#hudCure'), hudXray = $('#hudXray'), keyp = $('#keyp');
  let story = null, penP = 0;
  const ui = {
    onChapter(i) {
      chs.forEach((el, k) => el.classList.toggle('on', k === i));
      $$('button', dots).forEach((b, k) => b.classList.toggle('on', k === i));
      stageEl.dataset.ch = i;
    },
    onPlan(val, show) { hudPlan.classList.toggle('on', show); $('#penv').textContent = val; },
    onRise({ level, h, show }) {
      hudRise.classList.toggle('on', show);
      $('#lvlv').textContent = String(level).padStart(2, '0'); $('#hgtv').textContent = h.toFixed(1);
      $$('#floors i').forEach((el, i) => el.classList.toggle('on', i < level));
    },
    onCure({ show, day, mpa, pct, t7, t28 }) {
      hudCure.classList.toggle('on', show);
      $('#dayv').textContent = String(Math.floor(day)).padStart(2, '0'); $('#mpav').textContent = mpa.toFixed(1);
      $('#curebar').style.width = (pct * 100).toFixed(1) + '%';
      const a = $('#t7'), b = $('#t28');
      a.textContent = t7 ? `${t('h.t7')} · ${t7.toFixed(1)} MPa` : ''; a.classList.toggle('on', !!t7);
      b.textContent = t28 ? `${t('h.t28')} · ${t28.toFixed(1)} MPa · ${t('h.pass')} ✓` : ''; b.classList.toggle('on', !!t28);
    },
    onXray(show) { hudXray.classList.toggle('on', show); },
    onKey(state) { keyp.dataset.state = state; },
    onProgress(p) {
      shint.style.opacity = p > 0.012 ? 0 : 1;
      const pp = Math.min(1, Math.max(0, (p - 0.02) / 0.125)); $('#penpct').textContent = Math.round(pp * 100) + '%'; $('#penbar').style.width = (pp * 100) + '%';
    }
  };
  story = new Story({ canvas: $('#gl'), section, ui, sfx, mobile });  window.__story = story;

  // sound
  const sbtn = $('#sndBtn');
  if (sbtn) sbtn.addEventListener('click', () => { const on = sfx.toggle(); sbtn.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  // chapter dots + skip + key
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; scrollTo({ top: story.chapterY(+b.dataset.i), behavior: 'smooth' }); });
  $('#skipj').addEventListener('click', () => { story.turnKey(true); scrollTo({ top: story.secTop + story.secH, behavior: 'smooth' }); });
  $('#keyBtn').addEventListener('click', () => story.turnKey(false));
  // x-ray layer chips
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); sfx.tick();
    const id = b.dataset.sys;
    if (id === 'struct') { story.tower.cols.visible = story.tower.slabs.visible = story.tower.core.visible = on; } else story.setSystem(id, on);
  });
  // draw only while on screen
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) story.start(); else story.stop(); }), { threshold: 0 });
  io.observe(section);
  story.start();
  addEventListener('load', () => story._measure());
  ui.onChapter(0);
  // first frame is warm: lift the loader
  requestAnimationFrame(() => requestAnimationFrame(() => pageReady()));
}

function renderAll() {
  renderFeatured();
  const wa = $('#ctaWa'); if (wa) wa.href = waLink('');
}
window.addEventListener('langchange', renderAll);
renderAll();

/* ------------------------------------------------------------ الهيرو كفيديو بأربع تمريرات (انظر js/hero-video.js) */
async function startJourney() {
  const section = $('#journey'), stageEl = $('.stage', section), chs = $$('.ch', section), dots = $('#dots'), shint = $('#shint');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (new URLSearchParams(location.search).has('nogl')) { section.classList.add('nogl'); pageReady(); return; }
  const names = ['j.c1.k', 'j.c2.k', 'j.c3.k', 'j.c4.k', 'j.c5.k'], STG = names.length;
  dots.innerHTML = names.map((k, i) => `<button type="button" role="tab" aria-label="${i + 1}" data-i="${i}"><span data-i18n="${k}"></span></button>`).join('');
  $$('span', dots).forEach(sp => { sp.textContent = t(sp.dataset.i18n); });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  let last = -1;
  const layout = () => {
    const total = Math.max(1, section.offsetHeight - stageEl.offsetHeight), p = reduced ? 0 : clamp(-section.getBoundingClientRect().top / total), i = clamp(Math.round(p * (STG - 1)), 0, STG - 1);
    if (i !== last) { last = i; chs.forEach((el, k) => el.classList.toggle('on', k === i)); $$('button', dots).forEach((b, k) => b.classList.toggle('on', k === i)); stageEl.dataset.ch = i; }
    shint.style.opacity = p > 0.012 ? 0 : 1;
  };
  addEventListener('scroll', layout, { passive: true }); addEventListener('resize', layout, { passive: true }); layout();
  const { initHeroVideo } = await import('./hero-video.js');
  const hv = initHeroVideo({
    hero: section, stick: stageEl, video: $('#hv'), hdr: () => 0, reduced, saveData: !!(navigator.connection && navigator.connection.saveData),
    stops: [0, 3.6, 7.0, 10.0, 14.4], srcDesktop: 'assets/hero/hero-desktop.mp4', srcPhone: 'assets/hero/hero-phone.mp4', srcDesktopRev: 'assets/hero/hero-desktop-rev.mp4', srcPhoneRev: 'assets/hero/hero-phone-rev.mp4', mobileQuery: '(max-width: 860px)', rate: 2,
    onFail: () => section.classList.add('nogl')
  });
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) hv.jump(+b.dataset.i); });
  $('#skipj').addEventListener('click', () => scrollTo({ top: section.getBoundingClientRect().top + scrollY + section.offsetHeight, behavior: 'smooth' }));
  /* الفيديو يُحمَّل مرة واحدة ويبقى (يتوقف خارج الشاشة فقط)؛ الأجهزة قليلة الذاكرة تُفرِّغه عند الابتعاد */
  const lowMem = (navigator.deviceMemory || 8) <= 2;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (!e.isIntersecting) hv.pause(); }, { rootMargin: '80px' }).observe(section);
    new IntersectionObserver(([e]) => { if (e.isIntersecting) hv.load(); else if (lowMem) hv.unload(); }, { rootMargin: '250% 0px 250% 0px' }).observe(section);
  } else hv.load();
  requestAnimationFrame(() => requestAnimationFrame(() => pageReady()));
}
startJourney();

