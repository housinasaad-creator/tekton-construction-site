# -*- coding: utf-8 -*-
"""Renders assets/poster.jpg (a clean frame of the 3D story) and assets/og.jpg (share image). Needs the site on http://127.0.0.1:3600/."""
import asyncio, io, os
from playwright.async_api import async_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
HIDE = "const s=document.createElement('style');s.textContent='.hdr,.ch,.hud,.dots,.scrollhint,.skipj,.shade,.wa-float,.cur,.tape,.pour,.keyp{opacity:0!important;visibility:hidden!important}';document.head.appendChild(s)"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=ARGS)
        ctx = await b.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=1)
        pg = await ctx.new_page()
        await pg.goto('http://127.0.0.1:3600/index.html'); await pg.wait_for_function('window.__story', timeout=40000); await pg.wait_for_timeout(1500)
        await pg.evaluate(HIDE)
        await pg.evaluate("document.querySelector('.journey').style.setProperty('--g1','70,80,90');__story.setP(0.405,true)"); await pg.wait_for_timeout(2500)
        png = await pg.screenshot()
        Image.open(io.BytesIO(png)).convert('RGB').save(os.path.join(ROOT, 'assets', 'poster.jpg'), quality=86)
        print('poster saved')
        og = await ctx.new_page(); await og.set_viewport_size({'width': 1200, 'height': 630})
        await og.goto('file:///' + os.path.join(ROOT, 'tools', 'og.html').replace('\\', '/')); await og.wait_for_timeout(1500)
        png = await og.screenshot()
        Image.open(io.BytesIO(png)).convert('RGB').save(os.path.join(ROOT, 'assets', 'og.jpg'), quality=88)
        print('og saved')
        await b.close()
asyncio.run(main())
