# TEKTON · تكتون · Tekton Yapı

A **construction company website** with a scroll-driven 3D story. Work in progress: not finished yet, and the names, figures and projects are placeholders until it is. Arabic / Türkçe / English.

**What is on the site**

| Page | What it does |
|---|---|
| `index.html` | A floor plan draws itself, rises into a nine-storey tower under a climbing crane, the concrete cures for 28 days (two cylinders are crushed at 7 and 28 days), the skin turns to X-ray (structure, piles, water / fire / power / air layers you can toggle, load-path particles), and at dusk the visitor turns the key and the building lights up. |
| `projects.html` | "The model table": eight maquettes on a surveyor's table. Filter chips lift matching models and flatten the rest; tap one and the camera flies to it. A scroll-driven intro lowers the camera from a plan view. |
| `services.html` | A building exploded into six layers; scrolling steps through them and finally snaps the stack together. |
| `lab.html` | Two small instruments: *Cure & crush* (mix, curing method, age, compression test with a strength curve) and a *shake table* (five-storey frame, base isolation on/off, live simulation). Teaching models, not engineering calculations. |
| `about.html`, `contact.html` | Site-gate odometer sign, timeline, values; a rough-quantities estimator and a quote form that opens WhatsApp. |

**Under the hood**

* three.js r172 (vendored in `js/vendor`), no build step, no frameworks, no CDN. Fonts are vendored too (`assets/fonts`, regenerate with `python tools/get_fonts.py`).
* Everything in the 3D scenes is procedural (no model files). Concrete uses a triplanar shader so slabs are not stretched.
* Performance: each chapter draws only what it can see (visibility culling), all shaders and textures are pre-warmed behind the loader, an adaptive pixel-ratio governor lowers resolution if frames get slow, canvases stop rendering when off screen. Typical frames are 25 to 90 draw calls and under 10k triangles.
* Mobile: narrower field of view handling, no shadow maps, fewer particles, view offsets that keep the model clear of the text; touch-friendly controls.
* Layout is always LTR; Arabic text runs right-to-left inside its blocks (`html[lang=ar]` rules in `css/style.css`).
* Page transition = a poured-concrete overlay with a spirit-level loader; the cursor is a laser crosshair with a coordinate read-out; the right edge shows a tape measure that reads the scroll distance in metres.
* Sound (WebAudio, generated in code, off by default) is available on the home page.
* `prefers-reduced-motion` is respected; WebGL missing or `?nogl` falls back to static content.

**Run it**

```
python -m http.server 3600
```

then open <http://localhost:3600/> (or double-click `run-site.bat` on Windows). Any static host works.

**Tools** (`tools/`): `get_fonts.py` (vendor the fonts), `make_thumbs.py` (renders each maquette to `assets/projects/*.webp` via `projects.html?solo=<id>`), `make_og.py` (poster and share image). They need Python with Playwright + Pillow and the site served on port 3600.

**Tests** (`tests/`): `test_all.py` loads every page in ar/tr/en on desktop and phone sizes and checks console errors, missing translations, horizontal overflow and that the loader lifts; `shots.py`, `page.py`, `perf.py` are screenshot / draw-call helpers.

**Re-skinning**: edit `js/brand.js` (name, WhatsApp number, e-mail, colours, logo paths), the text in `js/i18n/*.js`, the portfolio in `js/data.js` and the maquettes in `js/gl/models.js`.

Design and development: MOHAMMED Web Studio.

## Hero: four-stop video (2026-10-23)
The hero is rendered offline (60 fps) from the live 3D scene and shipped as eight short H.264 clips per device class in `assets/hero/desktop|phone/` (`f0..f3` play forward from one stop to the next, `r0..r3` are the same frames in reverse order, so going back is a clip played forward, never reverse playback or seeking). `js/hero-video.js` plays them on one canvas in exactly four scroll gestures: each wheel notch / swipe / arrow key / dot plays the next clip by itself and stops on its last frame; a gesture in the same direction mid-clip speeds it up and chains, the opposite direction continues from the same frame in the mirrored clip. Clips are loaded as blobs (forward ones in the background, the reverse one when a stop is reached), at most three video elements exist at a time, and everything is released from memory when the hero is far away. The live 3D scene stays in the files and the earlier live-3D versions of the changed files are in `_live3d_version/`; a video failure hides the hero scene and the page scrolls normally. Re-render with `_hero_video_tools/capture.py` + `encode_site_clips.py`.
