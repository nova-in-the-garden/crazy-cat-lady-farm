#!/usr/bin/env python3
"""Cache-busting: stamp every JS module, the stylesheet and Three.js with ?v=<version>.

Run this before every deploy:  python3 tools/bump_version.py
It rewrites the import map in index.html so that every module URL (including the
relative imports between our own modules) gets the same version query. A browser
then never mixes old cached files with new ones after an update.
"""
import json, pathlib, re, time

root = pathlib.Path(__file__).resolve().parent.parent
version = time.strftime('%Y%m%d%H%M')
html_path = root / 'index.html'
html = html_path.read_text()

imports = {'three': f'./vendor/three/three.module.js?v={version}',
           './vendor/three/three.core.js': f'./vendor/three/three.core.js?v={version}'}
for js in sorted((root / 'js').glob('*.js')):
    rel = f'./js/{js.name}'
    imports[rel] = f'{rel}?v={version}'
block = json.dumps({'imports': imports}, indent=2).replace('\n', '\n    ')
html = re.sub(r'(<script type="importmap">\s*)(.*?)(\s*</script>)', lambda m: m.group(1) + block + m.group(3), html, count=1, flags=re.S)
html = re.sub(r'css/style\.css(\?v=\d+)?', f'css/style.css?v={version}', html)
html = re.sub(r'src="js/main\.js(\?v=\d+)?"', f'src="js/main.js?v={version}"', html)
html = re.sub(r'<meta name="build" content="[^"]*" />', f'<meta name="build" content="{version}" />', html)
html_path.write_text(html)
print('stamped version', version, 'on', len(imports), 'modules')
