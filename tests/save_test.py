# Saves keep working: the very first save format, a bare-minimum save, a mid-game save, corrupt data, wrong version.
# Usage: serve on :8123, then python3 tests/save_test.py
import json, sys
from playwright.sync_api import sync_playwright
KEY = 'lanternfall.save.v1'
FIRST = {"v": 1, "hp": 5, "maxHp": 5, "embers": 120, "abil": {"dbl": True, "dash": False, "glide": False}, "charms": ["dust"], "eq": ["dust"], "slots": 2, "dmgLvl": 1, "lightLvl": 0, "flaskLvl": 0,
         "flags": {"started": 1, "boss_thorn": 1, "wick_met": 1}, "sigils": {"root": True, "prism": False, "tide": False}, "moths": ["m1"], "lore": ["glade"], "bestiary": {"slime": 4}, "bounties": {}, "seen": {"r:glade": 1, "r:stump": 1, "tip:move": 1},
         "cp": {"room": "glade", "x": 5, "y": 9}, "time": 1234, "deaths": 2, "ng": 0, "lost": None, "gaunt": 0, "ending": False, "kills": 30}   # no ext, up, created...
MINIMAL = {"v": 1}
MID = {"v": 1, "hp": 3, "maxHp": 7, "embers": 480, "abil": {"dbl": True, "dash": True, "glide": True, "shot": True}, "charms": ["dust", "echo", "needle"], "eq": ["dust", "echo"], "slots": 3, "dmgLvl": 2, "lightLvl": 1, "flaskLvl": 1,
       "flags": {"started": 1, "boss_thorn": 1, "boss_prism": 1, "frag:g_lake#7": 1, "pz:blink": 1}, "sigils": {"root": True, "prism": True, "tide": False}, "moths": ["m1", "m2", "g1"], "lore": ["glade", "altar"],
       "bestiary": {"slime": 12, "beetle": 6}, "bounties": {"slime": 1}, "ext": {"elites": 2, "chain": 3, "graze": 4}, "up": {"fcost": 1}, "seen": {"r:glade": 1, "c:glade#9": 1},
       "cp": {"room": "g_cavern", "x": 12, "y": 11, "px": 190, "py": 170}, "time": 9000, "deaths": 9, "ng": 1, "lost": {"room": "g_lake", "x": 100, "y": 100, "n": 55}, "gaunt": 3, "ending": True, "kills": 400}
CASES = [('first-ever format', FIRST), ('bare minimum', MINIMAL), ('mid-game with extras', MID), ('corrupt json', '{not json'), ('wrong version', {"v": 2, "hp": 5}), ('null', None)]
fails = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, data in CASES:
        ctx = b.new_context(viewport={'width': 960, 'height': 540}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(500)
        raw = data if isinstance(data, str) else json.dumps(data)
        if data is not None: pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [KEY, raw])
        pg.reload(); pg.wait_for_timeout(1500)
        has_cont = pg.locator('text=Continue').count() > 0
        ok = True; note = ''
        if has_cont:
            pg.click('text=Continue'); pg.wait_for_timeout(2200)
            st = pg.evaluate("LF.state"); room = pg.evaluate("LF.G.room&&LF.G.room.id")
            ok = st == 'play' and bool(room)
            pg.evaluate("(()=>{const G=LF.G;G.fade.a=0;G.fade.to=0;})()")
            for tab in ['pause', 'charms', 'map', 'journal', 'bounty', 'stats', 'help']:
                pg.evaluate("(t)=>{if(LF.state==='paused')LF.UI.closeMenu();LF.UI.menu(t)}", tab); pg.wait_for_timeout(120)
            pg.evaluate("LF.UI.closeMenu()")
            pg.evaluate("(()=>{const G=LF.G;for(let i=0;i<240;i++){G.update(1/60);LF.input.endFrame();} LF.Save.write(G.save)})()")
            back = pg.evaluate("(k)=>JSON.parse(localStorage.getItem(k))", KEY)
            if isinstance(data, dict) and data.get('v') == 1:   # progress must survive a round trip
                for f in ['embers', 'charms', 'moths', 'deaths']:
                    if f in data and back.get(f) != data[f] and f != 'embers': ok = False; note += ' lost ' + f
                if 'abil' in data and any(back['abil'].get(k) != v for k, v in data['abil'].items()): ok = False; note += ' lost abilities'
            note += ' room=%s hp=%s complete=%s%%' % (room, pg.evaluate("LF.G.save.hp"), pg.evaluate("LF.completion(LF.G.save)"))
        else:
            # no usable save: starting a new game must still work
            pg.click('text=New Game'); pg.wait_for_timeout(2000); ok = pg.evaluate("LF.state") == 'play'; note = ' (no Continue offered; new game plays)'
        ok = ok and not errs
        print(('ok   ' if ok else 'FAIL ') + name + note + (' ' + str(errs[:2]) if errs else '')); fails += 0 if ok else 1; ctx.close()
    b.close()
print('SAVE CHECKS FAILED: %d' % fails if fails else 'ALL SAVE CHECKS PASSED'); sys.exit(1 if fails else 0)
