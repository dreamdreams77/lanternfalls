# Sequence-break check: with every ability from the very start but no boss sigils, the sigil gates must still hold.
# Usage: serve on :8123, then python3 tests/skip_test.py
import pathlib, sys
from playwright.sync_api import sync_playwright
LIB = pathlib.Path(__file__).with_name('reach_lib.js')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context().new_page(); pg.set_default_timeout(900000)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2000)
    pg.add_script_tag(path=str(LIB)); pg.evaluate("LF.G.fade.a=0;LF.G.fade.to=0")
    rep = pg.evaluate("REACH.analyse({abil:{dbl:true,dash:true,glide:true},lockSigils:true})")
    reached = set(rep['rooms'].keys()); gated = ['g_descent', 'g_cavern', 'g_lake', 'g_prism', 'd_entry', 'd_nave', 'd_glide', 'd_chasm', 'd_tide', 's_foot', 's_climb', 's_summit']
    leaked = [r for r in gated if r in reached]
    print('reachable without any sigil:', sorted(reached)); print('LEAKED PAST THE SIGIL GATE:', leaked or 'none')
    b.close(); sys.exit(1 if leaked else 0)
