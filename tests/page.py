# -*- coding: utf-8 -*-
"""Generic page screenshots. Usage: python tests/page.py <page.html> <out-name> [--mobile] [--lang=ar] [--js="code"] [--wait=2500] [--full] [--scroll=Y]
Prints console errors/warnings."""
import asyncio, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a.split('=', 1)[0]: (a.split('=', 1)[1] if '=' in a else True) for a in sys.argv[1:] if a.startswith('--')}
page_name, out_name = args[0], args[1]
mobile = '--mobile' in opt; lang = opt.get('--lang', 'en'); wait = int(opt.get('--wait', 2500))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        vp = {'width': 390, 'height': 800} if mobile else {'width': 1440, 'height': 810}
        ctx = await b.new_context(viewport=vp, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await ctx.add_init_script(f"try{{localStorage.setItem('tkt-lang','{lang}')}}catch(e){{}}")
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.on('requestfailed', lambda r: logs.append('REQFAILED: ' + r.url))
        await pg.goto('http://127.0.0.1:3600/' + page_name)
        await pg.wait_for_timeout(wait)
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        if '--scroll' in opt: await pg.evaluate(f"window.scrollTo(0,{opt['--scroll']})"); await pg.wait_for_timeout(900)
        if '--sweep' in opt:
            hgt = await pg.evaluate("document.documentElement.scrollHeight")
            for y in range(0, hgt, 500):
                await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(120)
            await pg.wait_for_timeout(1200); await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(500)
        steps = opt.get('--js', '')
        for i, js in enumerate([s for s in steps.split('||') if s.strip()]):
            r = await pg.evaluate(js)
            if r is not None: print('js', i, r)
            await pg.wait_for_timeout(int(opt.get('--step', 1800)))
        await pg.screenshot(path=os.path.join(OUT, out_name + '.png'), full_page='--full' in opt)
        print('saved', out_name)
        for l in logs[:30]: print(l)
        await b.close()
asyncio.run(main())
