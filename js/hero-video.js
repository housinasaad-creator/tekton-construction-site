/*
  محرّك هيرو الفيديو بأربع وقفات (قالب عام لكل المواقع، نفس واجهة القالب القديم initHeroVideo).
  المشهد مُصوَّر مسبقاً بدقة عالية ومقسوم إلى ثمانية مقاطع قصيرة: f0..f3 للأمام من محطة إلى التي تليها، وr0..r3 هي نفس الإطارات بترتيب معكوس
  (الرجوع = تشغيل مقطع للأمام وليس تشغيلاً عكسياً ولا seek، فلا أخطاء بصرية عند الصعود). آخر إطار من مقطع هو أول إطار من المقطع التالي.
  العرض كله على لوحة canvas واحدة تحلّ محل عنصر <video class="hv">: عند كل وقفة تبقى آخر صورة مرسومة عليها، والمقطع التالي لا يظهر إلا حين يكون إطاره جاهزاً.
  المقاطع تُحمَّل كـ Blob إلى الذاكرة، وفي أي لحظة يوجد عنصر فيديو واحد يعمل + عنصرا فيديو جاهزان للمقطعين المحتملين التاليين.
  تمريرة جديدة أثناء الحركة: بنفس الاتجاه تسرّع المقطع وتتابع، وبالاتجاه المعاكس تنقلب الحركة من نفس الإطار إلى المقطع المرآة.
  الخيارات: clips = مجلد المقاطع (clips/desktop/f0.mp4 ...) | stops = عدد المحطات أو مصفوفة بطولها | virtual = بلا تحريك للصفحة (الهيرو افتراضي والتمرير يبقى عند 0)
  onPos(p) أثناء الحركة (p بين 0 و LAST) | onGo(k) عند كل تمريرة | locked() | onReady | onFail. الواجهة: load/unload/jump/snap/pause وstage/ready/animating/top.
*/
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const FR1 = 1 / 60, ORDER = ['f0', 'f1', 'f2', 'f3']                      // التحميل المسبق للأمام فقط؛ مقطع الرجوع يُحمَّل عند الوصول إلى المحطة (prime) فلا نهدر بيانات من لا يرجع;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const seek = (v, t) => new Promise((res) => { let tm = 0; const fin = () => { clearTimeout(tm); v.removeEventListener('seeked', fin); res(); }; v.addEventListener('seeked', fin); tm = setTimeout(fin, 1500); v.currentTime = t; });

export function initHeroVideo({ hero, stick, video, hdr = () => 0, reduced, saveData, stops, clips = 'assets/hero/', mobileQuery = '(max-width: 760px)', dims = {}, onReady, onFail, onPos, onGo, locked = () => false, virtual = false }) {
  const LAST = (Array.isArray(stops) ? stops.length : stops) - 1, DIMS = { desktop: [2560, 1440], phone: [1080, 1920], ...dims };
  const stub = { load() { }, unload() { }, jump() { }, snap() { }, pause() { }, get stage() { return 0; }, get ready() { return false; }, get animating() { return false; }, get top() { return true; } };
  if (reduced || saveData) return stub;
  const canvas = document.createElement('canvas'); canvas.className = video.className; if (video.id) canvas.id = video.id; canvas.setAttribute('aria-hidden', 'true'); canvas.style.opacity = '1'; canvas.style.transition = 'none'; video.replaceWith(canvas);   // المواقع كانت تُخفي لوحة الثلاثي الأبعاد حتى تجهز (opacity:0): هذه اللوحة تظهر دائماً
  const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) return stub;
  let S = null, stage = 0, touching = false, lastW = 0, owned = false, wheelOn = false, settleT = 0;

  /* ---------------- هندسة الصفحة ---------------- */
  const span = () => Math.max(1, hero.offsetHeight - stick.offsetHeight);
  const base = () => hero.getBoundingClientRect().top + scrollY - hdr();
  const stageY = (k) => (virtual ? 0 : base() + span() * (k / LAST));
  const nearest = () => { let b = 0, d = Infinity; for (let k = 0; k <= LAST; k++) { const dd = Math.abs(scrollY - stageY(k)); if (dd < d) { d = dd; b = k; } } return b; };
  const setY = (y) => { if (!virtual) scrollTo({ top: y, behavior: 'instant' }); };
  const inHero = () => (virtual ? scrollY <= 2 : scrollY <= stageY(LAST) + 2);
  const stepOn = () => !!S && S.ready && !locked() && !document.documentElement.classList.contains('noscroll');
  const busy = () => !!S && S.busy();
  const canStep = (dir) => {
    if (!stepOn()) return false; const w = S.want, b = busy();
    if (virtual) return scrollY <= 2 && (dir > 0 ? w < LAST || b : w > 0 || b);
    return inHero() && !(dir > 0 && w >= LAST && scrollY >= stageY(LAST) - 2 && !b) && !(dir < 0 && w <= 0 && scrollY <= stageY(0) + 2 && !b);
  };

  /* ---------------- جلسة واحدة: من load() إلى unload() ---------------- */
  function session() {
    const kind = matchMedia(mobileQuery).matches ? 'phone' : 'desktop'; let [SW, SH] = DIMS[kind];
    const ac = new AbortController(), blobs = new Map(), have = new Set(), prepared = new Map(), vids = new Set();
    let dead = false, ready = false, cw = 0, ch = 0, want = stage, st = stage, run = null, pending = false, cutting = false, cutId = 0, raf = 0, drawnW = 0, drawnH = 0;

    function getBlob(name) {
      let p = blobs.get(name);
      if (!p) {
        p = fetch(`${clips}${kind}/${name}.mp4`, { signal: ac.signal }).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); }).then((b) => { have.add(name); return b; });
        blobs.set(name, p); p.catch(() => { if (blobs.get(name) === p) blobs.delete(name); });
      }
      return p;
    }
    const loaded = (v) => new Promise((res, rej) => {
      let tm = 0; const fin = (e) => { clearTimeout(tm); v.removeEventListener('loadeddata', ok); v.removeEventListener('error', bad); e ? rej(e) : res(v); }, ok = () => fin(), bad = () => fin(new Error('video error'));
      if (v.readyState >= 2) return res(v);
      v.addEventListener('loadeddata', ok); v.addEventListener('error', bad); tm = setTimeout(ok, 2500);   // بعض متصفحات الجوال لا تُظهر الإطار الأول قبل play(): لا ننتظر للأبد
    });
    function mkVideo(name) {
      const v = document.createElement('video'); v.muted = v.defaultMuted = true; v.playsInline = true; v.preload = 'auto'; v.disablePictureInPicture = true; v.disableRemotePlayback = true; v.tabIndex = -1;
      v.setAttribute('aria-hidden', 'true'); v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.dataset.n = name;
      v.style.cssText = 'position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1'; stick.appendChild(v); vids.add(v);
      v.ready = getBlob(name).then((b) => { if (dead || v.gone) throw new Error('gone'); v.url = URL.createObjectURL(b); v.src = v.url; return loaded(v); });
      v.ready.catch(() => { }); return v;
    }
    function retire(v) {
      if (!v || v.gone) return; v.gone = true; vids.delete(v); for (const [n, p] of prepared) if (p === v) prepared.delete(n);
      try { v.pause(); } catch (e) { } v.removeAttribute('src'); try { v.load(); } catch (e) { } if (v.url) { URL.revokeObjectURL(v.url); v.url = ''; } v.remove();
    }
    /* عند كل وقفة: عنصرا فيديو جاهزان (الأمام والخلف) على الإطار الأول، وما عداهما يُحرَّر */
    function prime() {
      const need = []; if (st < LAST) need.push('f' + st); if (st > 0) need.push('r' + (st - 1));
      for (const [n, p] of [...prepared]) if (!need.includes(n)) retire(p);
      for (const n of need) if (!prepared.has(n)) prepared.set(n, mkVideo(n));
    }
    const take = (name) => { let v = prepared.get(name); if (v) prepared.delete(name); else v = mkVideo(name); return v; };

    function draw(v) {
      if (v.readyState < 2 || !v.videoWidth || !cw) return false;
      const iw = v.videoWidth, ih = v.videoHeight, s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(v, (cw - dw) / 2, (ch - dh) / 2, dw, dh); drawnW = cw; drawnH = ch; return true;
    }
    function fit() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), w = Math.max(2, Math.round((r.width || innerWidth) * dpr)), h = Math.max(2, Math.round((r.height || innerHeight) * dpr)), k = Math.min(1, SW / w, SH / h);
      const nw = Math.max(2, Math.round(w * k)), nh = Math.max(2, Math.round(h * k));
      if (nw !== cw || nh !== ch) { cw = nw; ch = nh; canvas.width = cw; canvas.height = ch; ctx.imageSmoothingQuality = 'high'; if (ready && !api.busy()) cut(st, true); }
    }

    const rate = () => (run && want !== run.to ? 1.8 : 1);                  // طلب أبعد من نهاية المقطع الجاري: نسرّع قليلاً ثم نتابع بلا انتظار
    function begin(v, from, to) {
      run = { v, from, to, dir: to > from ? 1 : -1, D: v.duration || 1.5, y0: stageY(from), y1: stageY(to), lastT: -1, seen: performance.now(), mir: false };
      for (const p of [...prepared.values()]) if (p !== v) retire(p);         // التزمنا باتجاه واحد: نحرّر الفك الجاهز للاتجاه الآخر
      v.playbackRate = rate(); const pr = v.play(); pr && pr.catch && pr.catch(() => { if (run && run.v === v) failRun(); });
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function loop(now) {
      raf = 0; const r = run; if (!r || dead) return; const v = r.v, t = v.currentTime, u = clamp(t / r.D);
      if (t !== r.lastT) { r.lastT = t; r.seen = now; draw(v); }
      setY(r.y0 + (r.y1 - r.y0) * u); onPos && onPos(r.from + (r.to - r.from) * u);
      if (v.ended) { arrive(); return; }
      if (!r.mir && now - r.seen > 2500) { failRun(); return; }
      raf = requestAnimationFrame(loop);
    }
    function arrive() {
      const r = run; if (!r) return; run = null; cancelAnimationFrame(raf); raf = 0;
      draw(r.v); setY(stageY(r.to)); st = stage = r.to; retire(r.v); prime(); onPos && onPos(st);
      if (want !== st) next();
    }
    async function next() {
      if (run || pending || cutting || dead || want === st) return;
      const dir = want > st ? 1 : -1, v = take(dir > 0 ? 'f' + st : 'r' + (st - 1)); pending = true;
      try { await v.ready; } catch (e) { pending = false; retire(v); if (!dead) giveUp(e); return; }
      pending = false; if (dead) { retire(v); return; }
      if (want === st || (want > st ? 1 : -1) !== dir) { prepared.set(v.dataset.n, v); if (want !== st) next(); return; }   // الطلب تغيّر أثناء الانتظار: نعيد المقطع جاهزاً
      begin(v, st, st + dir);
    }
    function retarget() {
      const r = run; if (!r || r.mir) return;
      if (r.dir > 0 ? want >= r.to : want <= r.to) r.v.playbackRate = rate(); else mirror();
    }
    /* اتجاه معاكس في منتصف مقطع: نتجمد على الإطار الحالي ثم نكمل من نفس الإطار في المقطع المرآة */
    async function mirror() {
      const r = run; if (!r || r.mir) return; r.mir = true;
      const name = r.dir > 0 ? 'r' + r.from : 'f' + r.to, t = r.v.currentTime; r.v.pause();
      const v2 = prepared.get(name) || mkVideo(name); prepared.set(name, v2);
      try {
        await v2.ready; if (dead || run !== r) return;
        await seek(v2, clamp(r.D - FR1 - t, 0, r.D)); await nextFrame(); if (dead || run !== r) return;
        prepared.delete(name); cancelAnimationFrame(raf); raf = 0; run = null; retire(r.v);
        begin(v2, r.to, r.from); retarget();
      } catch (e) { r.mir = false; if (run === r) { const p = r.v.play(); p && p.catch && p.catch(() => { }); if (!raf) raf = requestAnimationFrame(loop); } }
    }
    function failRun() { const r = run; run = null; cancelAnimationFrame(raf); raf = 0; if (r) retire(r.v); cut(clamp(want, 0, LAST), false); }
    /* انتقال فوري بلا حركة إلى محطة: آخر إطار من مقطع الوصول إليها (أو أول إطار للمحطة صفر) */
    async function cut(s, silent) {
      const id = ++cutId; cutting = true; if (run) { cancelAnimationFrame(raf); raf = 0; retire(run.v); run = null; } pending = false; want = s;
      const v = mkVideo(s === 0 ? 'f0' : 'f' + (s - 1));
      try {
        await v.ready; if (dead || id !== cutId) { retire(v); return false; }
        if (v.videoWidth) { SW = v.videoWidth; SH = v.videoHeight; }
        if (s > 0) { await seek(v, Math.max(0, v.duration - FR1 + 0.002)); } await nextFrame(); if (dead || id !== cutId) { retire(v); return false; }
        if (!draw(v)) { try { await v.play(); await nextFrame(); v.pause(); } catch (e) { } if (dead || id !== cutId) { retire(v); return false; } if (!draw(v)) throw new Error('no frame'); }   // بعض المتصفحات لا تفك الإطار الأول قبل play()
        retire(v); st = stage = s; if (ready && !silent) setY(stageY(s)); cutting = false; prime(); onPos && onPos(st); if (want !== st) next(); return true;
      } catch (e) { retire(v); if (id === cutId) { cutting = false; if (!dead) giveUp(e); } return false; }
    }
    function giveUp(e) { console.warn('hero video', e); const was = ready; ready = false; cancelAnimationFrame(raf); raf = 0; run = null; pending = false; cutting = false; stick.classList.remove('on3d'); if (was || !dead) onFail && onFail(); }

    function go(dir) { jump(want + dir); }
    function jump(k) {
      const nw = clamp(k, 0, LAST); if (nw === want) return; want = nw; onGo && onGo(nw);
      if (run) retarget(); else next();
    }
    /* لو استقرت الصفحة بين محطتين (سحب شريط التمرير أو استعادة الموضع) ننتقل لأقرب محطة؛ وإن غادرنا الهيرو للأسفل تُعرض المحطة الأخيرة */
    function settle() {
      if (virtual || !ready || dead || api.busy() || touching || !stepOn()) return;
      if (!inHero()) { if (st !== LAST) cut(LAST, false); return; }
      const k = nearest(); if (k !== st) { cut(k, false); return; }
      if (scrollY > stageY(0) + 3 && Math.abs(scrollY - stageY(k)) > 3) setY(stageY(k));
    }

    /* ---------------- الانطلاق ---------------- */
    fit(); const s0 = virtual ? stage : (inHero() ? nearest() : LAST);
    cut(s0, true).then((ok) => {
      if (!ok || dead) return;
      ready = true; stick.classList.add('on3d'); onReady && onReady(); if (drawnW !== cw || drawnH !== ch) cut(st, true);
      (async () => { const q = ORDER.slice(); const worker = async () => { while (q.length && !dead) { try { await getBlob(q.shift()); } catch (e) { if (dead) return; } } }; await Promise.all([worker(), worker()]); })();
    });
    const api = {
      go, jump, settle, fit, snap(k) { k = clamp(k, 0, LAST); if (k === want && (st === k || cutting)) return; want = k; if (!ready) { st = stage = want; onPos && onPos(st); return; } cut(want, true); },
      busy: () => !!(run || pending || cutting), get ready() { return ready; }, get want() { return want; }, get stage() { return st; },
      dispose() {
        dead = true; ready = false; cancelAnimationFrame(raf); raf = 0; ac.abort(); stage = st;
        for (const v of [...vids]) retire(v); prepared.clear(); blobs.clear(); have.clear(); ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    return api;
  }

  /* ---------------- الإدخال: عجلة الماوس، اللمس، لوحة المفاتيح ---------------- */
  function onWheel(e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const now = performance.now(), fresh = now - lastW > 110; lastW = now; const dir = e.deltaY > 0 ? 1 : -1;
    if (fresh) owned = false;                                               // ذيل اللوحة (قصور ذاتي) يبقى ملكاً للتمريرة التي بدأت الوقفة فلا ينزلق بعدها خارج الهيرو
    if (!canStep(dir)) { if (owned) e.preventDefault(); return; }
    e.preventDefault(); owned = true; if (fresh) S.go(dir);
  }
  function wheelWatch() { const near = virtual ? true : scrollY <= stageY(LAST) + 1200; if (near && !wheelOn) { addEventListener('wheel', onWheel, { passive: false }); wheelOn = true; } else if (!near && wheelOn) { removeEventListener('wheel', onWheel); wheelOn = false; } }
  const tEl = virtual ? window : hero; let ty0 = 0, tx0 = 0, tState = '';
  tEl.addEventListener('touchstart', (e) => { touching = true; if (e.touches.length !== 1) { tState = 'native'; return; } ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX; tState = stepOn() ? 'pending' : 'native'; }, { passive: true });
  tEl.addEventListener('touchmove', (e) => {
    if (tState === 'native' || e.touches.length !== 1) return;
    if (tState === 'pending') {
      const dy = e.touches[0].clientY - ty0, dx = e.touches[0].clientX - tx0; if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      const dir = dy < 0 ? 1 : -1; if (Math.abs(dx) > Math.abs(dy) || !canStep(dir)) { tState = 'native'; return; }
      tState = 'done'; if (e.cancelable) e.preventDefault(); S.go(dir); return;
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const touchEnd = () => { touching = false; tState = ''; };
  tEl.addEventListener('touchend', touchEnd, { passive: true }); tEl.addEventListener('touchcancel', touchEnd, { passive: true });
  addEventListener('keydown', (e) => {
    if (!stepOn() || e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target || {}, tag = tg.tagName || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || tg.isContentEditable || (e.key === ' ' && /^(BUTTON|A)$/.test(tag))) return;
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey), back = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
    if (!fwd && !back) return; const dir = fwd ? 1 : -1; if (!canStep(dir)) return; e.preventDefault(); if (!e.repeat) S.go(dir);
  });
  addEventListener('scroll', () => { wheelWatch(); clearTimeout(settleT); if (virtual || busy()) return; settleT = setTimeout(() => S && S.settle(), 220); }, { passive: true });
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { S && S.fit(); if (S && S.ready && !virtual) { clearTimeout(settleT); settleT = setTimeout(() => S && S.settle(), 300); } }) : null; ro && ro.observe(canvas);
  wheelWatch();

  const api = {
    load() { if (!S) S = session(); },
    unload() { if (!S) return; stage = S.stage; S.dispose(); S = null; if (!virtual) stick.classList.remove('on3d'); },   // الافتراضي: المنصة تختفي أصلاً، فلا نُظهر الملصق
    jump(k) { if (stepOn()) S.jump(k); },
    snap(k) { if (S) S.snap(k); else stage = clamp(k, 0, LAST); },
    pause() { },
    get stage() { return S ? S.stage : stage; }, get ready() { return !!S && S.ready; }, get animating() { return busy(); }, get top() { return virtual ? scrollY <= 2 : true; },
    stats: () => ({ stage: S ? S.stage : stage, want: S ? S.want : stage, busy: busy(), ready: !!S && S.ready, loaded: !!S, stops: Array.from({ length: LAST + 1 }, (_, k) => Math.round(stageY(k))), y: Math.round(scrollY) })
  };
  window.__hv = api;
  return api;
}
