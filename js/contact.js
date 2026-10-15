/*
  Contact: a rough-quantities estimator (rules of thumb, with an SVG building that follows the inputs) and a quote form that opens WhatsApp.
*/
import './i18n/home.js';
import './i18n/contact.js';
import { TKT, t, waLink, ICON, pageReady } from './layout.js';
import { BRAND } from './brand.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('en-US');

const TYPES = {
  villa: { c: 0.30, r: 95, base: 3.5, k: 0.9, ratio: 1.3 },
  apt: { c: 0.38, r: 110, base: 4, k: 0.55, ratio: 1.45 },
  com: { c: 0.40, r: 115, base: 4.5, k: 0.5, ratio: 1.5 },
  ind: { c: 0.28, r: 80, base: 3.5, k: 0.35, ratio: 2.2 },
  pub: { c: 0.42, r: 120, base: 5, k: 0.55, ratio: 1.6 }
};
const st = { type: 'apt', area: 6000, floors: 8, finish: 1 };

function calc() {
  const T = TYPES[st.type], conc = st.area * T.c, steel = conc * T.r / 1000;
  const months = T.base + st.area / 1000 * T.k + st.floors * 0.22 + [0, 1.5, 3][st.finish];
  const foot = st.area / st.floors, d = Math.sqrt(foot / T.ratio), w = d * T.ratio;
  return { conc, steel, months, lo: Math.max(2, Math.round(months * 0.85)), hi: Math.round(months * 1.15), w, d };
}

function drawSvg(r) {
  const el = $('#esvg'); if (!el) return;
  const W = 420, H = 190, ground = 164, maxH = 140, fl = st.floors, fh = Math.min(16, maxH / fl);
  const bw = Math.max(40, Math.min(250, r.w * 2.4)), x0 = (W - bw) / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img"><line x1="10" y1="${ground}" x2="${W - 10}" y2="${ground}" stroke="rgba(239,236,228,.35)"/>`;
  for (let i = 0; i < fl; i++) {
    const y = ground - (i + 1) * fh;
    s += `<rect x="${x0}" y="${y}" width="${bw}" height="${fh - 1.5}" fill="rgba(127,183,212,.16)" stroke="rgba(239,236,228,.5)" stroke-width="1"/>`;
    s += `<rect x="${x0 - 3}" y="${y + fh - 3}" width="${bw + 6}" height="2.2" fill="#efece4"/>`;
  }
  const cols = Math.max(2, Math.round(bw / 36)); for (let c = 0; c <= cols; c++) { const x = x0 + c * bw / cols; s += `<line x1="${x}" y1="${ground}" x2="${x}" y2="${ground - fl * fh}" stroke="#ff6b1f" stroke-width="1.6"/>`; }
  const top = ground - fl * fh; s += `<path d="M${x0 + bw + 14} ${top} v${fl * fh}" stroke="rgba(239,236,228,.5)"/><path d="M${x0 + bw + 10} ${top} h8M${x0 + bw + 10} ${ground} h8" stroke="rgba(239,236,228,.5)"/>`;
  s += `<text x="${x0 + bw + 24}" y="${(top + ground) / 2 + 4}" fill="#ff9a57" font-family="IBM Plex Mono, monospace" font-size="11">${(fl * 3.2).toFixed(0)} m</text>`;
  s += `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" fill="#8f8e88" font-family="IBM Plex Mono, monospace" font-size="11">${r.w.toFixed(0)} × ${r.d.toFixed(0)} m</text></svg>`;
  el.innerHTML = s;
}

function render() {
  const r = calc();
  $('#eAreaOut').textContent = fmt(st.area) + ' m²'; $('#eFloorsOut').textContent = st.floors;
  $('#oConc').textContent = fmt(r.conc); $('#oSteel').textContent = fmt(r.steel);
  $('#oDur').textContent = r.lo + '–' + r.hi; $('#oFoot').textContent = r.w.toFixed(0) + ' × ' + r.d.toFixed(0);
  const price = +$('#ePrice').value, b = $('#eBudget');
  b.innerHTML = price > 0 ? `<span>${t('eo.budget')}</span><b class="num">${fmt(price * st.area)}</b>` : '';
  b.classList.toggle('on', price > 0);
  for (const id of ['eArea', 'eFloors']) { const el = $('#' + id); el.style.setProperty('--v', ((+el.value - +el.min) / (+el.max - +el.min) * 100) + '%'); }
  drawSvg(r); return r;
}

function renderInfo() {
  const ci = $('#cinfo'); if (!ci) return;
  ci.innerHTML = `<li>${ICON.chat}<span><a href="${waLink('')}" target="_blank" rel="noopener">WhatsApp · +${BRAND.wa.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}</a></span></li><li>${ICON.mail}<span><a href="mailto:${BRAND.email}">${BRAND.email}</a></span></li><li>${ICON.clock}<span>${t('f.hours')}</span></li><li>${ICON.pin}<span>${t('f.addr')}</span></li>`;
}

function bind() {
  $('#eType').addEventListener('change', (e) => { st.type = e.target.value; render(); });
  $('#eArea').addEventListener('input', (e) => { st.area = +e.target.value; render(); });
  $('#eFloors').addEventListener('input', (e) => { st.floors = +e.target.value; render(); });
  $('#ePrice').addEventListener('input', render);
  $('#eFinish').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.finish = +b.dataset.f; $$('#eFinish button').forEach(x => x.classList.toggle('on', x === b)); render(); });
  $('#quoteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), lines = [t('wa.q.hi')];
    const sel = (id) => { const o = $('#' + id); return o.selectedIndex > 0 ? o.options[o.selectedIndex].textContent : ''; };
    if (f.name) lines.push(`${t('f.name')}: ${f.name}`);
    if (f.phone) lines.push(`${t('f.phone')}: ${f.phone}`);
    if (sel('qType')) lines.push(`${t('f.type')}: ${sel('qType')}`);
    if (f.city) lines.push(`${t('f.city')}: ${f.city}`);
    if (f.area) lines.push(`${t('f.area2')}: ${f.area}`);
    if (sel('qWhen')) lines.push(`${t('f.when')}: ${sel('qWhen')}`);
    if (f.msg) lines.push(f.msg);
    if ($('#qUse').checked) { const r = calc(); lines.push(`— ${t('wa.q.est')}: ${$('#eType').selectedOptions[0].textContent}, ${fmt(st.area)} m², ${st.floors} ${t('f.floors')}, ~${fmt(r.conc)} m³, ~${fmt(r.steel)} t, ${r.lo}–${r.hi} ${t('eo.mo')}`); }
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  });
  // keep the quote form in step with the estimator
  const sync = () => { $('#qArea').value = $('#qArea').dataset.t ? $('#qArea').value : st.area; };
  $('#qArea').addEventListener('input', () => { $('#qArea').dataset.t = '1'; });
  $('#eArea').addEventListener('input', sync); $('#eType').addEventListener('change', () => { const q = $('#qType'); if (!q.dataset.t) q.value = $('#eType').value; });
  $('#qType').addEventListener('change', () => { $('#qType').dataset.t = '1'; });
  sync();
}

bind(); render(); renderInfo();
window.addEventListener('langchange', () => { renderInfo(); render(); });
pageReady();
