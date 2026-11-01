# Fairness of guarded discoveries: the bot collects real treasures, then fights whatever wakes. Reports hearts lost per ambush.
# Usage: serve on :8123, then python3 tests/ambush_test.py [trials-per-treasure]
import json, pathlib, sys
from playwright.sync_api import sync_playwright
T = pathlib.Path(__file__).parent
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); pg.set_default_timeout(900000); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2000)
    pg.add_script_tag(path=str(T / 'reach_lib.js')); pg.add_script_tag(path=str(T / 'bot_lib.js'))
    pg.evaluate("LF.G.fade.a=0;LF.G.fade.to=0;LF.settings.mute=true;LF.G.save.maxHp=8;LF.G.save.abil={dbl:true,dash:true,glide:true};LF.G.save.embers=200")
    # every treasure that can start an ambush: moths, heart fragments, chests (not in puzzle or bonus rooms)
    tre = pg.evaluate("""()=>{const o=[];for(const id in LF.Rooms.list){const r=LF.Rooms.list[id];if(r.pz||r.bonus||id==='trial')continue;r.ents.forEach((e,i)=>{if(['moth','frag','chest'].includes(e.type))o.push({room:id,idx:i,type:e.type,x:e.x,y:e.y})})}return o}""")
    print(len(tre), 'treasures'); amb = []; skipped = 0
    for t in tre:
        # each trial resets the save counters so the same treasure can be collected again; the roll changes with the count, so vary it
        for trial in range(N):
            r = pg.evaluate("""async ([t,k])=>{const G=LF.G,s=G.save;s.moths=[];for(const f of Object.keys(s.flags))if(f.indexOf('frag:')===0)delete s.flags[f];for(const c of Object.keys(s.seen))if(c.indexOf('c:')===0)delete s.seen[c];
                s.ng=0; for(let i=0;i<k;i++)s.moths.push('pad'+i);   // pad the counter so the hash roll differs per trial
                s.hp=s.maxHp; G.save.embers=200; G.ambushReset();
                return await BOT.fetch({room:t.room,from:null,idx:t.idx})}""", [t, trial])
            if not r.get('ok'): skipped += 1; print('  skip', t['room'], t['type'], r.get('why')); break
            if r.get('ambush'): amb.append(dict(r, room=t['room'], type=t['type']))
    print('ambushes triggered:', len(amb), 'skipped treasures:', skipped)
    if amb:
        lost = [a['hpLost'] for a in amb]; died = sum(1 for a in amb if a['died']); clr = sum(1 for a in amb if a['cleared'])
        print('cleared %d/%d, died %d, hearts lost: avg %.2f max %d, avg fight %.1fs, avg foes %.1f' % (clr, len(amb), died, sum(lost) / len(lost), max(lost), sum(a['frames'] for a in amb) / len(amb) / 60, sum(a['spawned'] for a in amb) / len(amb)))
        for a in amb[:16]: print('  %-10s %-5s foes %s lost %d cleared %s died %s fled %s %.1fs' % (a['room'], a['type'], ','.join(a['types']), a['hpLost'], a['cleared'], a['died'], a.get('fled'), a['frames'] / 60))
    print(errs or 'NO ERRORS'); b.close()
