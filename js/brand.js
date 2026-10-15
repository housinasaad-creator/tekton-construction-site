/*
  Brand identity in one place. To re-skin this demo for a real client, edit this file (name, number, colors).
  "TEKTON / تكتون / Tekton Yapı" is an invented brand made for this concept demo; it is not tied to any real company.
*/
export const BRAND = {
  name: 'TEKTON',
  nameAr: 'تكتون',
  nameTr: 'Tekton Yapı',
  wa: '905537410520',            // studio demo number; replaced with the real company's number
  email: 'hello@tekton.example',
  city: { ar: 'غازي عنتاب · تركيا', tr: 'Gaziantep · Türkiye', en: 'Gaziantep · Türkiye' },
  orange: '#ff6b1f',
  year: new Date().getFullYear()
};

/* The mark: a T-beam section (the web is the signal-orange part) inside four survey crop corners, standing on a foundation line */
export const MARK = {
  corners: ['M5 21V5H21', 'M79 5H95V21', 'M95 79V95H79', 'M21 95H5V79'],
  flange: 'M23 25H77V39H23Z',
  web: 'M43 39H57V71H43Z',
  haunchL: 'M43 39V49L35 39Z',
  haunchR: 'M57 39V49L65 39Z',
  base: 'M29 75H71V81H29Z'
};

export function markSVG(cls = '') {
  return `<svg class="mark ${cls}" viewBox="0 0 100 100" aria-hidden="true" fill="none">
    <g stroke="currentColor" stroke-width="2.6" stroke-linecap="square">${MARK.corners.map(d => `<path d="${d}"/>`).join('')}</g>
    <g fill="currentColor"><path d="${MARK.flange}"/><path d="${MARK.haunchL}"/><path d="${MARK.haunchR}"/><path d="${MARK.base}"/></g>
    <path d="${MARK.web}" fill="var(--orange, ${BRAND.orange})"/>
  </svg>`;
}

/* The same mark drawn on a 2D canvas (site hoardings, textures) */
export function drawMark(g, cx, cy, r, color = '#efece4', accent = BRAND.orange) {
  g.save(); g.translate(cx - r, cy - r); g.scale(r / 50, r / 50);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2.6; g.lineCap = 'square';
  for (const d of MARK.corners) g.stroke(new Path2D(d));
  for (const d of [MARK.flange, MARK.haunchL, MARK.haunchR, MARK.base]) g.fill(new Path2D(d));
  g.fillStyle = accent; g.fill(new Path2D(MARK.web));
  g.restore();
}
