#!/usr/bin/env python3
"""Write sw.js: precache list from index.html + manifest + icons, versioned by a content hash. Run after any change to game files."""
import re, json, hashlib, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
files = ['index.html', 'manifest.webmanifest']
files += re.findall(r'<link rel="stylesheet" href="([^"]+)">', html)
files += re.findall(r'<script src="([^"]+)"></script>', html)
files += [str(p.relative_to(root)) for p in sorted((root / 'icons').glob('*.png'))]
files = list(dict.fromkeys(files))
h = hashlib.sha1()
for f in files:
    h.update(f.encode()); h.update((root / f).read_bytes())
ver = h.hexdigest()[:10]
tpl = (root / 'tools' / 'sw.template.js').read_text()
(root / 'sw.js').write_text(tpl.replace('__VERSION__', ver).replace('__ASSETS__', json.dumps(files, indent=2)))
print('sw.js version', ver, len(files), 'files')
