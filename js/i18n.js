/*
  All site text in three languages: ar / tr / en. Keys are used through data-i18n (text), data-i18n-html (text with tags),
  data-i18n-ph (placeholder) and data-i18n-aria. Each page registers its own dictionary with add() (see js/i18n/*.js).
  Direction is always LTR on <html>; Arabic runs right-to-left inside text blocks only (see css).
*/
export const LANGS = ['ar', 'tr', 'en'];
export const T = { ar: {}, tr: {}, en: {} };

export function add(D) { for (const k in D) for (const l of LANGS) T[l][k] = D[k][l] !== undefined ? D[k][l] : D[k].en; }

export function detectLang() {
  try { const q = new URLSearchParams(location.search).get('lang'); if (LANGS.includes(q)) return q; } catch (e) {}
  try { const s = localStorage.getItem('tkt-lang'); if (LANGS.includes(s)) return s; } catch (e) {}
  const n = (navigator.language || 'ar').slice(0, 2).toLowerCase();
  return LANGS.includes(n) ? n : 'ar';
}

