/*
  محرّك هيرو الفيديو (قالب عام لكل المواقع): فيديو مُصوَّر مسبقاً بدقة عالية يتحرك بأربع تمريرات فقط:
  كل تمريرة (عجلة أو سحب إصبع أو سهم) تشغّل الفيديو بسرعة إلى محطته التالية ثم يقف، وبعد المحطة الرابعة يكمل الموقع تمريره عادياً.
  الرجوع للخلف: فيديو ثانٍ معكوس (يُحمَّل في الخلفية بعد أول تمريرة) يُشغَّل للأمام فيظهر الرجوع سلساً بلا سحب إطارات.
  تمريرة جديدة أثناء الحركة تقفز فوراً إلى المحطة الجارية ثم تبدأ التالية (الزائر لا ينتظر).
  بلا فيديو (حركة أقل / توفير بيانات / فشل التحميل) يبقى الهيرو صورة ثابتة والتمرير عادياً.
  الوسائط: stops = ثواني الفيديو عند المحطات (أولها 0 وآخرها = مدة الفيديو)، srcDesktop/srcPhone (+Rev للمعكوس)، rate = سرعة التشغيل.
*/
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function initHeroVideo({ hero, stick, video, hdr, reduced, saveData, stops, srcDesktop, srcPhone, srcDesktopRev, srcPhoneRev, mobileQuery = '(max-width: 760px)', onReady, onFail, rate = 2 }) {
  const STOPS = stops, LAST = STOPS.length - 1, TOTAL = STOPS[LAST], RATE = rate;
  const phone = matchMedia(mobileQuery).matches, SRC = phone ? srcPhone : srcDesktop, SRCR = phone ? srcPhoneRev : srcDesktopRev;
  let stage = 0, target = 0, mode = '', animating = false, touching = false, rafId = 0, settleT = 0, ready = false, wanted = false, wheelOn = false, lastW = 0, revReady = false, revLoading = false;
  const useVideo = !reduced && !saveData;
  /* الفيديو المعكوس: عنصر فوق الأصلي، يظهر فقط أثناء الرجوع للخلف */
  const vr = document.createElement('video'); vr.className = video.className; vr.muted = true; vr.playsInline = true; vr.preload = 'none'; vr.disablePictureInPicture = true; vr.tabIndex = -1;
  vr.setAttribute('aria-hidden', 'true'); vr.style.opacity = '0'; vr.style.pointerEvents = 'none'; vr.style.transition = 'none'; video.after(vr);

  const span = () => Math.max(1, hero.offsetHeight - stick.offsetHeight);
  const base = () => hero.getBoundingClientRect().top + scrollY - hdr();
  const stageY = (k) => base() + span() * (k / LAST);
  const nearest = () => { let b = 0, d = Infinity; for (let k = 0; k <= LAST; k++) { const dd = Math.abs(scrollY - stageY(k)); if (dd < d) { d = dd; b = k; } } return b; };
  const stepOn = () => useVideo && ready && !document.documentElement.classList.contains('noscroll');
  const inHero = () => scrollY <= stageY(LAST) + 2;
  const canStep = (dir) => stepOn() && inHero() && !(dir > 0 && scrollY >= stageY(LAST) - 2) && !(dir < 0 && scrollY <= stageY(0) + 2);

  function load() {
    if (!useVideo || video.getAttribute('src')) return; wanted = true; ready = false;
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    const onOk = () => { if (!wanted) return; video.currentTime = STOPS[stage]; ready = true; stick.classList.add('on3d'); onReady && onReady(); };
    video.addEventListener('loadeddata', onOk, { once: true });
    video.addEventListener('error', () => { ready = false; stick.classList.remove('on3d'); onFail && onFail(); }, { once: true });
    video.src = SRC; video.load();
  }
  function loadRev() {
    if (!useVideo || !SRCR || revLoading || !wanted) return; revLoading = true; vr.preload = 'auto';
    vr.addEventListener('loadeddata', () => { revReady = true; }, { once: true });
    vr.addEventListener('error', () => { revLoading = false; }, { once: true });
    vr.src = SRCR; vr.load();
  }
  function unload() {
    wanted = false; ready = false; revReady = false; revLoading = false; cancelAnimationFrame(rafId); animating = false;
    for (const v of [video, vr]) { v.pause(); v.removeAttribute('src'); v.load(); } vr.style.opacity = '0'; stick.classList.remove('on3d');
  }

  const setY = (y) => scrollTo({ top: y, behavior: 'instant' });
  const hideRev = () => { vr.style.opacity = '0'; };
  const finish = (k) => {
    const wasRev = mode === 'rev'; stage = k; target = k; mode = ''; animating = false; video.playbackRate = 1; vr.pause(); setY(stageY(k));
    if (wasRev) { const done = () => hideRev(); video.addEventListener('seeked', done, { once: true }); setTimeout(done, 350); } else hideRev();
    video.currentTime = STOPS[k];
    if (k >= 1) setTimeout(loadRev, 1200);                                   // بعد أول تمريرة نبدأ تحميل فيديو الرجوع في الخلفية
  };
  /* تمريرة جديدة أثناء الحركة: نقفز فوراً إلى محطة الحركة الجارية ثم نبدأ التالية */
  const skipNow = () => { if (!animating) return; cancelAnimationFrame(rafId); video.pause(); vr.pause(); finish(target); };

  /* تقدّم: الفيديو يعمل بسرعته والصفحة تتبعه */
  function playTo(k) {
    const from = STOPS[stage], to = STOPS[k], y0 = scrollY, y1 = stageY(k); animating = true; target = k; mode = 'fwd'; let stall = performance.now(), lastT = -1;
    hideRev(); if (Math.abs(video.currentTime - from) > .06) video.currentTime = from;
    video.playbackRate = Math.min(RATE * (1 + .5 * (k - stage - 1)), 8); video.play().catch(() => finish(k));
    const tick = (now) => {
      if (!animating) return; const t = video.currentTime;
      if (t !== lastT) { lastT = t; stall = now; }
      const u = clamp((t - from) / (to - from));
      if (u >= .995 || video.ended || now - stall > 4000) { video.pause(); finish(k); return; }
      setY(y0 + (y1 - y0) * u); rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }
  /* رجوع: نشغّل الفيديو المعكوس للأمام (الزمن المعكوس = المدة - الزمن الأصلي) */
  function playBack(k) {
    if (!revReady) { loadRev(); finish(k); return; }                          // لم يجهز بعد: قفزة فورية (وسيجهز للمرة القادمة)
    const from = TOTAL - STOPS[stage], to = TOTAL - STOPS[k], y0 = scrollY, y1 = stageY(k); animating = true; target = k; mode = 'rev'; video.pause(); let stall = performance.now(), lastT = -1, go = false;
    const run = () => {
      if (!animating || go) return; go = true; vr.style.opacity = '1'; vr.playbackRate = Math.min(RATE * (1 + .5 * (stage - k - 1)), 8); vr.play().catch(() => finish(k));
      const tick = (now) => {
        if (!animating) return; const t = vr.currentTime;
        if (t !== lastT) { lastT = t; stall = now; }
        const u = clamp((t - from) / (to - from));
        if (u >= .995 || vr.ended || now - stall > 4000) { vr.pause(); finish(k); return; }
        setY(y0 + (y1 - y0) * u); rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };
    if (Math.abs(vr.currentTime - from) < .03) run(); else { vr.addEventListener('seeked', run, { once: true }); vr.currentTime = from; setTimeout(run, 600); }
  }
  const goTo = (k) => { skipNow(); k = clamp(k, 0, LAST); if (k === stage) return; if (k > stage) playTo(k); else playBack(k); };
  const go = (dir) => goTo(stage + dir);
  const jump = (k) => { if (stepOn()) goTo(k); };

  function onWheel(e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const now = performance.now(), fresh = now - lastW > 110; lastW = now; const dir = e.deltaY > 0 ? 1 : -1;
    if (!canStep(dir)) return; e.preventDefault(); if (fresh) go(dir);
  }
  function wheelWatch() { const near = scrollY <= stageY(LAST) + 1200; if (near && !wheelOn) { addEventListener('wheel', onWheel, { passive: false }); wheelOn = true; } else if (!near && wheelOn) { removeEventListener('wheel', onWheel); wheelOn = false; } }

  let ty0 = 0, tx0 = 0, tState = '';
  hero.addEventListener('touchstart', (e) => { touching = true; if (e.touches.length !== 1) { tState = 'native'; return; } ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX; tState = stepOn() ? 'pending' : 'native'; }, { passive: true });
  hero.addEventListener('touchmove', (e) => {
    if (tState === 'native' || e.touches.length !== 1) return;
    if (tState === 'pending') {
      const dy = e.touches[0].clientY - ty0, dx = e.touches[0].clientX - tx0; if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      const dir = dy < 0 ? 1 : -1; if (Math.abs(dx) > Math.abs(dy) || !canStep(dir)) { tState = 'native'; return; }
      tState = 'done'; if (e.cancelable) e.preventDefault(); go(dir); return;
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const touchEnd = () => { touching = false; tState = ''; };
  hero.addEventListener('touchend', touchEnd, { passive: true }); hero.addEventListener('touchcancel', touchEnd, { passive: true });

  addEventListener('keydown', (e) => {
    if (!stepOn() || e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target || {}, tag = tg.tagName || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || tg.isContentEditable || (e.key === ' ' && /^(BUTTON|A)$/.test(tag))) return;
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey), back = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
    if (!fwd && !back) return; const dir = fwd ? 1 : -1; if (!canStep(dir)) return; e.preventDefault(); if (!e.repeat) go(dir);
  });

  /* لو استقرت الصفحة بين محطتين (سحب شريط التمرير أو استعادة الموضع) تنتقل لأقرب محطة */
  addEventListener('scroll', () => {
    wheelWatch(); clearTimeout(settleT); if (animating) return;
    settleT = setTimeout(() => { if (animating || touching || !stepOn() || !inHero()) return; const k = nearest(); if (k !== stage) goTo(k); else if (Math.abs(scrollY - stageY(k)) > 3) setY(stageY(k)); }, 220);
  }, { passive: true });
  wheelWatch();

  return { load, unload, jump, get stage() { return stage; }, get ready() { return ready; }, pause() { if (!animating) { video.pause(); vr.pause(); } } };
}
