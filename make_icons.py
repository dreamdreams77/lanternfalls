#!/usr/bin/env python3
"""Generate PWA icons (pixel-art lantern) into icons/. Requires Pillow."""
from PIL import Image, ImageDraw, ImageFilter
import pathlib
out = pathlib.Path(__file__).resolve().parent.parent / 'icons'; out.mkdir(exist_ok=True)
G = 32
def art():
    im = Image.new('RGBA', (G, G), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    def r(x0, y0, x1, y1, c): d.rectangle([x0, y0, x1, y1], fill=c)
    r(15, 3, 16, 6, '#7a6a8c'); r(14, 3, 17, 3, '#7a6a8c')            # hook
    r(12, 5, 19, 5, '#5a4a70'); r(10, 6, 21, 7, '#4a3a60'); r(10, 6, 21, 6, '#6a5a82')   # cap
    r(10, 8, 21, 21, '#3a2a50')                                       # frame
    r(11, 9, 20, 20, '#ff8a3d'); r(12, 10, 19, 19, '#ffb23a'); r(13, 11, 18, 19, '#ffd27a'); r(14, 13, 17, 18, '#fff2c9')
    r(15, 9, 16, 12, '#ffd27a'); r(15, 8, 16, 9, '#ff8a3d')            # flame tip
    r(10, 14, 21, 14, '#3a2a50')                                       # cross bar
    r(10, 22, 21, 23, '#4a3a60'); r(10, 22, 21, 22, '#6a5a82'); r(12, 24, 19, 24, '#3a2a50')  # base
    for x, y in [(6, 10), (25, 8), (7, 19), (24, 18), (5, 14), (26, 13), (9, 5), (22, 4)]: r(x, y, x, y, '#ffd27a')
    for x, y in [(8, 7), (23, 21), (4, 22)]: r(x, y, x, y, '#fff2c9')
    return im
A = art()
def icon(size, art_frac, name, opaque=True):
    bg = Image.new('RGBA', (size, size)); px = bg.load()
    for y in range(size):
        t = y / (size - 1); c = (int(42 + (11 - 42) * t), int(29 + (10 - 29) * t), int(80 + (26 - 80) * t), 255)
        for x in range(size): px[x, y] = c
    n = int(size * art_frac) // G * G or G; n = max(n, G)
    a = A.resize((n, n), Image.NEAREST)
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow); cx = size // 2; cy = int(size * .47); R = int(n * .5)
    gd.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(255, 150, 60, 140)); glow = glow.filter(ImageFilter.GaussianBlur(size * .08))
    bg = Image.alpha_composite(bg, glow)
    bg.alpha_composite(a, ((size - n) // 2, (size - n) // 2))
    if not opaque: pass
    bg.convert('RGB').save(out / name, optimize=True); print('wrote', name, size)
icon(192, .82, 'icon-192.png'); icon(512, .82, 'icon-512.png'); icon(512, .56, 'icon-maskable-512.png')
icon(180, .8, 'apple-touch-icon.png'); icon(64, .9, 'favicon-64.png')
