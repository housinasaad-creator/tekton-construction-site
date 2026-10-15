# -*- coding: utf-8 -*-
"""Downloads the Google Fonts once and stores them locally (woff2) with a ready css, so the site does not depend on any CDN."""
import os, re, urllib.request, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'fonts'); os.makedirs(OUT, exist_ok=True)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
FAMS = [
    'Big+Shoulders+Display:wght@600..900',
    'Manrope:wght@400..700',
    'IBM+Plex+Mono:wght@400;500',
    'Cairo:wght@400..900',
]
KEEP = {'latin', 'latin-ext', 'arabic'}
css_out = []
for fam in FAMS:
    url = 'https://fonts.googleapis.com/css2?family=' + fam + '&display=swap'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    css = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
    for m in re.finditer(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})', css, re.S):
        subset, block = m.group(1), m.group(2)
        if subset not in KEEP: continue
        u = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
        name = re.search(r"font-family:\s*'([^']+)'", block).group(1).replace(' ', '')
        style = re.search(r'font-style:\s*(\w+)', block).group(1)
        wt = re.search(r'font-weight:\s*([\d ]+);', block).group(1).replace(' ', '-')
        h = hashlib.md5(u.encode()).hexdigest()[:6]
        fn = f'{name}-{style}-{wt}-{subset}-{h}.woff2'
        path = os.path.join(OUT, fn)
        if not os.path.exists(path):
            data = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=60).read()
            open(path, 'wb').write(data); print('got', fn, len(data))
        block = re.sub(r'url\(https://[^)]+\.woff2\)', f'url(../assets/fonts/{fn})', block)
        css_out.append(f'/* {name} {subset} */\n' + block)
open(os.path.join(ROOT, 'css', 'fonts.css'), 'w', encoding='utf-8').write('\n'.join(css_out) + '\n')
print('fonts.css blocks:', len(css_out))
