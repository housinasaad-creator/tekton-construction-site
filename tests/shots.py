# -*- coding: utf-8 -*-
"""Takes screenshots of the home journey at chosen progress values. Usage: python tests/shots.py p1 p2 ... [--mobile] [--lang=ar]"""
import asyncio, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
mobile = '--mobile' in sys.argv
lang = next((a.split('=')[1] for a in sys.argv if a.startswith('--lang=')), 'en')
ps = [float(a) for a in args] or [0.1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        vp = {'width': 390, 'height': 800} if mobile else {'width': 1440, 'height': 810}
        ctx = await b.new_context(viewport=vp, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await ctx.add_init_script(f"try{{localStorage.setItem('tkt-lang','{lang}')}}catch(e){{}}")
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        await pg.goto('http://127.0.0.1:3600/index.html')
        await pg.wait_for_function('window.__story', timeout=30000)
        await pg.wait_for_timeout(2500)
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        for v in ps:
            await pg.evaluate("(v)=>{const s=document.getElementById('journey');const top=s.getBoundingClientRect().top+scrollY;window.scrollTo(0, top+__story.span*v);__story.setP(v,true)}", v)
            await pg.wait_for_timeout(1800)
            name = f"home_{'m' if mobile else 'd'}_{lang}_{int(v*1000):04d}.png"
            await pg.screenshot(path=os.path.join(OUT, name))
            print('saved', name, flush=True)
        for l in logs[:30]: print(l)
        await b.close()
asyncio.run(main())
