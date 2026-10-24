/*
  هيرو فيديو دائر (قالب عام لكل المواقع، نفس واجهة initHeroVideo القديمة فلا يتغيّر ما حوله في كل موقع):
  فيديو واحد خفيف (نحو 15 ثانية) مُصوَّر مسبقاً من مشهد الهيرو بسرعة ثابتة بلا أي توقف أو تباطؤ، ويتكرر بلا قطع (أول ثانية وربع منه انصهار من نهاية الرحلة إلى بدايتها)، ولا علاقة له بالتمرير.
  يعمل فقط حين يكون الهيرو ظاهراً على الشاشة؛ يتوقف (pause) فور الابتعاد عنه، ويُفرَّغ من الذاكرة (يُزال المصدر) حين يبتعد الزائر كثيراً (load/unload يستدعيهما الموقع).
  لا عجلة ولا لمس ولا وقفات: التمرير أصلي تماماً. الفصول النصية تتبع التمرير كما كانت (onPos يُستدعى مع التمرير في النمط العادي)؛ jump(k) = تمرير سلس إلى مكان الفصل k.
  بلا فيديو (حركة أقل / توفير بيانات / فشل التحميل) يبقى الملصق الثابت. إن منع المتصفح التشغيل التلقائي (مثل وضع توفير الطاقة بالآيفون) يبقى الملصق إلى أول لمسة.
  الخيارات: clips = مجلد الملفات (clips/loop-desktop.mp4 وclips/loop-phone.mp4) | stops = عدد الفصول أو مصفوفة بطولها | virtual = الهيرو افتراضي بلا تمرير (يتوقف حين ينزل الزائر عن القمة).
*/
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function initHeroVideo({ hero, stick, video, hdr = () => 0, reduced, saveData, stops, clips = 'assets/hero/', mobileQuery = '(max-width: 760px)', onReady, onFail, onPos, virtual = false }) {
  const LAST = Math.max(1, (Array.isArray(stops) ? stops.length : stops || 5) - 1);
  const stub = { load() { }, unload() { }, jump() { }, snap() { }, pause() { }, get stage() { return 0; }, get ready() { return false; }, get animating() { return false; }, get top() { return true; }, stats: () => ({ stub: true }) };
  if (reduced || saveData || !video) return stub;
  let wanted = false, ready = false, vis = true, tm = 0;
  video.muted = video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none'; video.disablePictureInPicture = true; video.disableRemotePlayback = true;
  video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.removeAttribute('autoplay');

  const span = () => Math.max(1, hero.offsetHeight - stick.offsetHeight);
  const base = () => hero.getBoundingClientRect().top + scrollY - hdr();
  const stageY = (k) => base() + span() * (k / LAST);
  const posNow = () => (hero.offsetHeight - stick.offsetHeight < 4 ? 0 : clamp((scrollY - base()) / span(), 0, 1) * LAST);   // الهيرو شاشة واحدة: الفصل الأول دائماً

  /* يعمل فقط وهو ظاهر وفي صفحة ظاهرة؛ غير ذلك pause */
  function sync() {
    if (!wanted) return;
    if (vis && !document.hidden) { const p = video.play(); p && p.catch && p.catch(() => { }); } else video.pause();
  }
  const done = () => { if (!wanted || ready) return; ready = true; clearTimeout(tm); onReady && onReady(); };
  const onPlaying = () => { if (!wanted) return; stick.classList.add('on3d'); done(); };
  const onErr = () => { if (!wanted) return; ready = false; stick.classList.remove('on3d'); onFail && onFail(); };

  function load() {
    if (wanted) return; wanted = true; ready = false;
    const kind = matchMedia(mobileQuery).matches ? 'phone' : 'desktop';
    video.addEventListener('playing', onPlaying); video.addEventListener('loadeddata', done); video.addEventListener('error', onErr);
    tm = setTimeout(done, 2500);                                             // لا نُعطّل شاشة التحميل في الموقع إن تأخر الفيديو أو مُنع تشغيله
    video.preload = 'auto'; video.src = `${clips}loop-${kind}.mp4`; video.load(); sync();
  }
  function unload() {
    if (!wanted) return; wanted = false; ready = false; clearTimeout(tm);
    video.removeEventListener('playing', onPlaying); video.removeEventListener('loadeddata', done); video.removeEventListener('error', onErr);
    video.pause(); video.removeAttribute('src'); video.load(); stick.classList.remove('on3d');
  }

  /* الظهور: عادةً IntersectionObserver على المنصة؛ في النمط الافتراضي (المنصة ثابتة والمتجر تحتها) نتوقف بمجرد النزول عن القمة */
  if (virtual) { const chk = () => { const v = scrollY < innerHeight * 0.9; if (v !== vis) { vis = v; sync(); } }; addEventListener('scroll', chk, { passive: true }); chk(); }
  else if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); }, { rootMargin: '0px' }).observe(stick);
  document.addEventListener('visibilitychange', sync);
  for (const ev of ['touchend', 'pointerup', 'keydown']) addEventListener(ev, () => { if (wanted && video.paused) sync(); }, { passive: true, once: true });   // التشغيل التلقائي ممنوع أحياناً حتى أول لمسة

  /* الفصول تتبع التمرير الأصلي كما كانت */
  if (onPos && !virtual) {
    let r = 0; const f = () => { r = 0; onPos(posNow()); };
    addEventListener('scroll', () => { r = r || requestAnimationFrame(f); }, { passive: true }); addEventListener('resize', () => { r = r || requestAnimationFrame(f); }, { passive: true }); onPos(posNow());
  }

  const api = {
    load, unload, pause() { }, snap() { },
    jump(k) { if (!virtual) scrollTo({ top: stageY(clamp(k, 0, LAST)), behavior: 'smooth' }); },
    get stage() { return virtual ? 0 : Math.round(posNow()); }, get ready() { return ready; }, get animating() { return false; }, get top() { return virtual ? scrollY <= 2 : true; },
    stats: () => ({ loaded: wanted, ready, playing: !video.paused && !video.ended, t: +video.currentTime.toFixed(2), vis, src: video.getAttribute('src') || '', on3d: stick.classList.contains('on3d') })
  };
  window.__hv = api;
  return api;
}
