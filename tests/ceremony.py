import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 810})
        await ctx.add_init_script("try{localStorage.setItem('tkt-lang','en')}catch(e){}")
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        await pg.goto('http://127.0.0.1:3600/index.html')
        await pg.wait_for_function('window.__story', timeout=30000)
        await pg.wait_for_timeout(1500)
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        await pg.evaluate("(v)=>{const s=document.getElementById('journey');const top=s.getBoundingClientRect().top+scrollY;window.scrollTo(0, top+__story.span*v);__story.setP(v,true)}", 0.99)
        await pg.wait_for_timeout(1500)
        await pg.click('#keyBtn')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=os.path.join(OUT, 'cer_a.png'))
        await pg.wait_for_timeout(4500)
        await pg.screenshot(path=os.path.join(OUT, 'cer_b.png'))
        for l in logs[:20]: print(l)
        await b.close()
asyncio.run(main())
