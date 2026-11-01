# Real touch input through the browser (CDP touch events, multi-touch): move, jump while moving, strike, Flare, menus, panel scrolling,
# no page scroll or zoom, button sizes and overlap. Usage: serve on :8123, then python3 tests/touch_test.py
import sys
from playwright.sync_api import sync_playwright
SIZES = [('phone landscape', 844, 390), ('small phone', 667, 375), ('phone portrait', 390, 844), ('tablet', 1024, 768)]
fails = []
def check(ok, msg):
    print(('  ok   ' if ok else '  FAIL ') + msg)
    if not ok: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, vw, vh in SIZES:
        print(name, vw, vh)
        ctx = b.new_context(viewport={'width': vw, 'height': vh}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        cdp = ctx.new_cdp_session(pg)
        def touch(kind, pts): cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
        def center(sel):
            bb = pg.locator(sel).first.bounding_box(); return (bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(1200)
        pg.tap('text=New Game'); pg.wait_for_timeout(2600)
        pg.evaluate("(()=>{const G=LF.G,s=G.save;s.abil={dbl:true,dash:true,glide:true};G.fade.a=0;G.fade.to=0;G.loadRoom('glade',null,{x:80,y:150});G.enemies=[];G.tutT=-99})()"); pg.wait_for_timeout(1500)
        check(pg.evaluate("LF.state") == 'play', 'playing after tapping New Game')
        # layout: buttons big enough, on screen, not overlapping each other
        boxes = pg.evaluate("""[...document.querySelectorAll('#touch .tbtn')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return {k:b.dataset.k,x:r.left,y:r.top,w:r.width,h:r.height}})""")
        check(len(boxes) >= 8, 'touch buttons visible (%d)' % len(boxes))
        check(all(0 <= x['x'] and x['x'] + x['w'] <= vw + 1 and 0 <= x['y'] and x['y'] + x['h'] <= vh + 1 for x in boxes), 'all buttons fully on screen')
        small = [x['k'] for x in boxes if min(x['w'], x['h']) < 34]
        check(not small, 'every button at least 34 CSS px (too small: %s)' % small)
        ov = [(a['k'], c['k']) for i, a in enumerate(boxes) for c in boxes[i + 1:] if a['x'] < c['x'] + c['w'] and c['x'] < a['x'] + a['w'] and a['y'] < c['y'] + c['h'] and c['y'] < a['y'] + a['h']]
        check(not ov, 'no overlapping buttons %s' % ov)
        # move: hold right
        x0 = pg.evaluate("LF.G.player.x"); r = center('[data-k=right]'); touch('touchStart', [r]); pg.wait_for_timeout(700)
        x1 = pg.evaluate("LF.G.player.x"); check(x1 - x0 > 25, 'holding RIGHT moves the player (%.0f px)' % (x1 - x0))
        # jump while still holding right (second finger)
        j = center('[data-k=jump]'); touch('touchStart', [r, j]); pg.wait_for_timeout(120)
        vy = pg.evaluate("LF.G.player.vy"); air = pg.evaluate("!LF.G.player.onGround")
        check(air and vy < 0, 'JUMP while holding RIGHT (two fingers) leaves the ground')
        touch('touchEnd', [])
        pg.wait_for_timeout(900)
        # strike
        pg.evaluate("LF.G.player.atkCD=0"); h = center('[data-k=attack]'); touch('touchStart', [h]); pg.wait_for_timeout(60); atk = pg.evaluate("LF.G.player.atkT>0"); touch('touchEnd', [])
        check(atk, 'HIT strikes')
        pg.wait_for_timeout(500)
        # flare
        pg.evaluate("LF.G.flare=100"); f = center('[data-k=flare]'); touch('touchStart', [f]); pg.wait_for_timeout(120); touch('touchEnd', [])
        check(pg.evaluate("LF.G.flare") < 50, 'FLARE spends the gauge')
        # dash
        pg.wait_for_timeout(400); pg.evaluate("LF.G.player.dashCD=0"); d = center('[data-k=dash]'); touch('touchStart', [d]); pg.wait_for_timeout(80); dash = pg.evaluate("LF.G.player.dashT>0"); touch('touchEnd', [])
        check(dash, 'DASH dashes')
        # menus: MAP button opens, tab tap switches, scrolling a long panel with a finger, PAUSE closes
        m = center('[data-k=map]'); touch('touchStart', [m]); pg.wait_for_timeout(80); touch('touchEnd', []); pg.wait_for_timeout(500)
        check(pg.evaluate("LF.state") == 'paused', 'MAP button opens the menu')
        pg.tap('.tabs >> text=Charms'); pg.wait_for_timeout(300)
        check('charms' in pg.inner_text('h2').lower(), 'tapping a tab switches to it')
        tabs = pg.evaluate("[...document.querySelectorAll('.tabs .btn')].map(b=>{const r=b.getBoundingClientRect();return Math.min(r.width,r.height)})")
        check(min(tabs) >= 26, 'menu tabs are finger sized (smallest %.0f px)' % min(tabs))
        pg.tap('.tabs >> text=Stats'); pg.wait_for_timeout(300)
        pan = pg.locator('.panel').first.bounding_box(); sc0 = pg.evaluate("document.querySelector('.panel').scrollTop"); over = pg.evaluate("(()=>{const p=document.querySelector('.panel');return p.scrollHeight-p.clientHeight})()")
        if over > 8:
            rot = pg.evaluate("!!LF.rotated")   # a sideways stage scrolls along the screen's long axis
            cx, cy = pan['x'] + pan['width'] * (.2 if rot else .5), pan['y'] + pan['height'] * (.5 if rot else .8)
            touch('touchStart', [(cx, cy)])
            for k in range(1, 9): touch('touchMove', [(cx + k * pan['width'] * .08, cy)] if rot else [(cx, cy - k * pan['height'] * .08)])
            touch('touchEnd', []); pg.wait_for_timeout(300)
            check(pg.evaluate("document.querySelector('.panel').scrollTop") > sc0, 'a long panel scrolls with a swipe (overflow %d px)' % over)
        else: print('  --   panel fits without scrolling')
        check(pg.evaluate("[scrollX,scrollY]") == [0, 0], 'the page itself never scrolls')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        if pg.evaluate("LF.state") != 'play': pg.evaluate("LF.UI.closeMenu()")
        pg.wait_for_timeout(300)
        zoom = pg.evaluate("document.querySelector('meta[name=viewport]').content")
        check('user-scalable=no' in zoom and 'maximum-scale=1' in zoom, 'pinch zoom disabled')
        check(not errs, 'no console errors %s' % errs[:2])
        ctx.close()
    b.close()
print('FAILED: %d' % len(fails) if fails else 'ALL TOUCH CHECKS PASSED'); sys.exit(1 if fails else 0)
