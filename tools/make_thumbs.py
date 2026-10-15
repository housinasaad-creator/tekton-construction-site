# -*- coding: utf-8 -*-
"""Renders each maquette alone (projects.html?solo=<id>) and saves assets/projects/<id>.webp (640x480) + the og image + a poster.
Needs the site served on http://127.0.0.1:3600/ (run-site.bat)."""
import asyncio, io, os, sys
from playwright.async_api import async_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'projects'); os.makedirs(OUT, exist_ok=True)
IDS = ['zeytin', 'pinar', 'kervan', 'kuzey', 'sifa', 'bahce', 'cinar', 'atlas']
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
async def main():
    only = sys.argv[1:] or IDS
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=ARGS)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 960}, device_scale_factor=1)
        for i in only:
            pg = await ctx.new_page()
            await pg.goto(f'http://127.0.0.1:3600/projects.html?solo={i}')
            await pg.wait_for_function('window.__city', timeout=40000)
            await pg.wait_for_timeout(3500)
            png = await pg.screenshot()
            im = Image.open(io.BytesIO(png)).convert('RGB').resize((640, 480), Image.LANCZOS)
            im.save(os.path.join(OUT, i + '.webp'), 'WEBP', quality=84, method=6)
            print('saved', i, flush=True)
            await pg.close()
        await b.close()
asyncio.run(main())
