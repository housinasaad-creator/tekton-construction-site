import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 810})).new_page()
        await pg.goto('http://127.0.0.1:3600/index.html')
        await pg.wait_for_function('window.__story', timeout=30000); await pg.wait_for_timeout(1500)
        for v in [0.03, 0.12, 0.2, 0.3, 0.42, 0.5, 0.6, 0.7, 0.78, 0.9, 0.99]:
            await pg.evaluate("(v)=>__story.setP(v,true)", v); await pg.wait_for_timeout(1100)
            r = await pg.evaluate("(()=>{const i=__story.stage.renderer.info;return [i.render.calls,i.render.triangles,i.memory.geometries,i.memory.textures,i.programs?i.programs.length:0]})()")
            print(v, 'calls', r[0], 'tris', r[1], 'geoms', r[2], 'tex', r[3], 'programs', r[4])
        await b.close()
asyncio.run(main())
