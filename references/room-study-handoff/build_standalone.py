#!/usr/bin/env python3
from pathlib import Path
import base64,re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
css=(root/'styles.css').read_text()
html=html.replace('<link rel="stylesheet" href="./styles.css">',f'<style>{css}</style>')
for name in ['math.js','model.js','renderer.js','app.js']:
    src=(root/'src'/name).read_text()
    html=html.replace(f'<script src="./src/{name}"></script>',f'<script>\n{src}\n</script>')
img=base64.b64encode((root/'public/floorplan.png').read_bytes()).decode()
html=html.replace('./public/floorplan.png',f'data:image/png;base64,{img}')
(root/'room-study-standalone.html').write_text(html)
print('built',root/'room-study-standalone.html')
