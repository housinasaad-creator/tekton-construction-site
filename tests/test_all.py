# -*- coding: utf-8 -*-
"""Loads every page in ar/tr/en on desktop and phone sizes and reports: console errors, failed requests, missing i18n keys,
horizontal overflow, and that the loader lifted. Needs the site on http://127.0.0.1:3600/ . Usage: python tests/test_all.py [base-url]"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8")
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3600/'
PAGES = ['index.html', 'projects.html', 'services.html', 'lab.html', 'about.html', 'contact.html']
LANGS = ['ar', 'tr', 'en']
VPS = {'desktop': {'width': 1440, 'height': 810}, 'phone': {'width': 390, 'height': 800}}
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
CHECK = """(() => {
  const miss = [...document.querySelectorAll('[data-i18n]')].filter(e => e.textContent.trim() === e.dataset.i18n).map(e => e.dataset.i18n);
  const missPh = [...document.querySelectorAll('[data-i18n-ph]')].filter(e => e.placeholder === e.dataset.i18nPh).map(e => e.dataset.i18nPh);
  const over = document.documentElement.scrollWidth - innerWidth;
  const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 2 && r.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('.mnav,.labels,.pour,.cur,.tape,.hdr'); }).slice(0, 4).map(e => e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : '')).filter(Boolean);
  const imgs = [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop());
  const gone = document.getElementById('pour').classList.contains('gone');
  return { miss: [...new Set(miss)], missPh, over, wide, imgs, gone, lang: document.documentElement.lang, title: document.title };
})()"""
async def main():
    bad = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=ARGS)
        for vp_name, vp in VPS.items():
            for lang in LANGS:
                ctx = await b.new_context(viewport=vp, is_mobile=(vp_name == 'phone'), has_touch=(vp_name == 'phone'))
                await ctx.add_init_script(f"try{{localStorage.setItem('tkt-lang','{lang}')}}catch(e){{}}")
                for page in PAGES:
                    pg = await ctx.new_page(); logs = []
                    pg.on('console', lambda m, L=logs: L.append(m.type + ': ' + m.text) if m.type == 'error' else None)
                    pg.on('pageerror', lambda e, L=logs: L.append('PAGEERROR: ' + str(e)))
                    pg.on('requestfailed', lambda r, L=logs: L.append('REQFAILED: ' + r.url))
                    pg.on('response', lambda r, L=logs: L.append('HTTP %d: %s' % (r.status, r.url)) if r.status >= 400 else None)
                    await pg.goto(BASE + page, wait_until='load')
                    try: await pg.wait_for_function("document.getElementById('pour').classList.contains('gone')", timeout=25000)
                    except Exception: pass
                    await pg.wait_for_timeout(900)
                    r = await pg.evaluate(CHECK)
                    issues = []
                    if logs: issues.append('console: ' + ' | '.join(logs[:3]))
                    if r['miss'] or r['missPh']: issues.append('missing i18n: ' + ','.join(r['miss'] + r['missPh'])[:200])
                    if r['over'] > 2: issues.append(f"overflow +{r['over']}px {r['wide']}")
                    if r['imgs']: issues.append('broken img: ' + ','.join(r['imgs']))
                    if not r['gone']: issues.append('loader did not lift')
                    if r['lang'] != lang: issues.append('lang is ' + r['lang'])
                    status = 'OK ' if not issues else 'BAD'
                    if issues: bad += 1
                    print(f'{status} {vp_name:7s} {lang} {page:14s} {r["title"][:34]}' + ('' if not issues else '\n      ' + '\n      '.join(issues)), flush=True)
                    await pg.close()
                await ctx.close()
        await b.close()
    print('\nproblems:', bad)
asyncio.run(main())
