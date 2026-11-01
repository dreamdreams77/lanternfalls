# Physics-driven reachability QA: every room reachable, every collectible obtainable, abilities in a sane order, no dead-end traps.
# Usage: serve on :8123, then python3 tests/reach_test.py [--strict]
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
LIB = pathlib.Path(__file__).with_name('reach_lib.js')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); pg.set_default_timeout(900000); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: (errs.append(m.text) if m.type == 'error' else (print(m.text, flush=True) if m.text.startswith('  expand') else None)))
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2000)
    pg.add_script_tag(path=str(LIB)); pg.evaluate("LF.G.fade.a=0;LF.G.fade.to=0")
    t = time.time(); rep = pg.evaluate("REACH.analyse({timing:true,log:s=>console.log(s)})"); dt = time.time() - t
    for e in rep['events']: print(' ', e)
    print('abilities', rep['abil'], 'sigils', rep['sigils'], 'time %.1fs' % dt)
    print('UNREACHABLE ROOMS:', rep['unreachableRooms'] or 'none')
    print('MISSING ITEMS:'); [print('  ', m) for m in rep['missingItems']] if rep['missingItems'] else print('   none')
    print('TRAPS:'); [print('  ', m) for m in rep['traps']] if rep['traps'] else print('   none')
    json.dump(rep, open(pathlib.Path(__file__).with_name('reach_report.json'), 'w'), indent=1)
    print(errs or 'NO ERRORS'); b.close()
    if '--strict' in sys.argv: assert not rep['unreachableRooms'] and not rep['missingItems'], 'reachability'
