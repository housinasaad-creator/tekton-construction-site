import asyncio, os
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 810})).new_page()
        await pg.goto('http://127.0.0.1:3600/index.html'); await pg.wait_for_function('window.__story', timeout=40000); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        end = await pg.evaluate("(()=>{const s=document.getElementById('journey');return s.getBoundingClientRect().top+scrollY+s.offsetHeight})()")
        H = await pg.evaluate("document.documentElement.scrollHeight")
        y = end; k = 0
        while y < H - 100 and k < 6:
            await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=os.path.join(OUT, f'home_below_{k}.png')); y += 760; k += 1
        print('shots', k)
        await b.close()
asyncio.run(main())
