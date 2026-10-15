# -*- coding: utf-8 -*-
"""Renders assets/logo-sheet.png from tools/logo.html (no server needed)."""
import asyncio, os, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        pg = await b.new_page(viewport={'width': 1600, 'height': 900})
        await pg.goto((ROOT / 'tools' / 'logo.html').as_uri()); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=str(ROOT / 'assets' / 'logo-sheet.png'))
        await b.close()
asyncio.run(main()); print('logo sheet saved')
