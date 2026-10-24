#!/usr/bin/env python3
"""Inline css/js into one self-contained file: dist/lanternfall-single.html"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
# the single-file build cannot be a PWA (no manifest or service worker), so leave those parts out
html = re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>\n', '', html)
html = html.replace('<script src="js/pwa.js"></script>\n', '').replace('<script src="js/pwa.js"></script>', '')
html = re.sub(r'<link rel="icon" type="image/png"[^>]*>\n', '', html)
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + (root / m.group(1)).read_text() + '\n</style>', html)
def js(m):
    src = (root / m.group(1)).read_text()
    assert '</script' not in src.lower(), m.group(1)
    return '<script>\n' + src + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
out = root / 'dist'; out.mkdir(exist_ok=True)
(out / 'lanternfall-single.html').write_text(html)
print('wrote', out / 'lanternfall-single.html', len(html), 'bytes')
