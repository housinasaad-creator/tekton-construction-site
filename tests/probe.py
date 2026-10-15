import asyncio, sys
from playwright.async_api import async_playwright
JS = sys.argv[1]; P = float(sys.argv[2]) if len(sys.argv) > 2 else 0.58
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 810})
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        await pg.goto('http://127.0.0.1:3600/index.html')
        await pg.wait_for_function('window.__story', timeout=30000)
        await pg.wait_for_timeout(1500)
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        await pg.evaluate("(v)=>{const s=document.getElementById('journey');const top=s.getBoundingClientRect().top+scrollY;window.scrollTo(0, top+__story.span*v);__story.setP(v,true)}", P)
        await pg.wait_for_timeout(2500)
        r = await pg.evaluate(JS)
        print(r)
        for l in logs[:20]: print(l)
        await b.close()
asyncio.run(main())
