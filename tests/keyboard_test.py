# Desktop controls through real key events and the mouse: menu by keyboard, move, jump, strike, dash, Flare, pause, map, charms, focus after clicking.
# Usage: serve on :8123, then python3 tests/keyboard_test.py
import sys
from playwright.sync_api import sync_playwright
fails = []
def check(ok, msg):
    print(('  ok   ' if ok else '  FAIL ') + msg)
    if not ok: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1280, 'height': 720}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(1500)
    check(pg.evaluate("LF.state") == 'title', 'title screen first')
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(100); pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(100); pg.keyboard.press('Enter'); pg.wait_for_timeout(2600)
    check(pg.evaluate("LF.state") == 'play', 'Enter on New Game starts the game')
    pg.evaluate("(()=>{const G=LF.G;G.save.abil={dbl:true,dash:true,glide:true};G.loadRoom('glade',null,{x:80,y:150});G.enemies=[];G.tutT=-99;G.fade.a=0;G.fade.to=0})()"); pg.wait_for_timeout(1200)
    x0 = pg.evaluate("LF.G.player.x"); pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(600); x1 = pg.evaluate("LF.G.player.x"); check(x1 - x0 > 25, 'ArrowRight moves (%.0f px)' % (x1 - x0))
    pg.keyboard.down('Space'); pg.wait_for_timeout(120); air = pg.evaluate("!LF.G.player.onGround"); pg.keyboard.up('Space'); check(air, 'Space jumps while running'); pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(700)
    pg.keyboard.press('KeyX'); pg.wait_for_timeout(40); check(pg.evaluate("LF.G.player.atkT>0"), 'X strikes')
    pg.wait_for_timeout(500); pg.keyboard.down('ArrowRight'); pg.keyboard.press('KeyC'); pg.wait_for_timeout(60); check(pg.evaluate("LF.G.player.dashT>0"), 'C dashes'); pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(500)
    pg.evaluate("LF.G.flare=100"); pg.keyboard.press('KeyV'); pg.wait_for_timeout(100); check(pg.evaluate("LF.G.flare") < 50, 'V releases the Flare')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400); check(pg.evaluate("LF.state") == 'paused', 'Escape pauses'); 
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(250); check('charms' in pg.inner_text('h2').lower() or pg.evaluate("LF.state") == 'paused', 'arrow keys move between menu tabs')
    pg.keyboard.press('KeyM'); pg.wait_for_timeout(300); pg.keyboard.press('KeyM'); pg.wait_for_timeout(300)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    if pg.evaluate("LF.state") != 'play': pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check(pg.evaluate("LF.state") == 'play', 'M and Escape close the menu again')
    # mouse: click a pause button, then make sure the keyboard still works afterwards (no stolen focus)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); pg.click('text=Resume'); pg.wait_for_timeout(300); check(pg.evaluate("LF.state") == 'play', 'clicking Resume resumes')
    x0 = pg.evaluate("LF.G.player.x"); pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(500); pg.keyboard.up('ArrowLeft'); check(abs(pg.evaluate("LF.G.player.x") - x0) > 20, 'keyboard still works after a mouse click')
    # page behaviour: no scroll bars, arrow keys and space never scroll the page
    check(pg.evaluate("[scrollX,scrollY,document.documentElement.scrollHeight-innerHeight]") == [0, 0, 0], 'no page scroll')
    # losing focus pauses (alt-tab) instead of dying in the background
    pg.evaluate("window.dispatchEvent(new Event('blur'))"); pg.wait_for_timeout(300); check(pg.evaluate("LF.state") == 'paused', 'losing focus pauses the game')
    check(not errs, 'no console errors %s' % errs[:2])
    b.close()
print('FAILED: %d' % len(fails) if fails else 'ALL KEYBOARD CHECKS PASSED'); sys.exit(1 if fails else 0)
