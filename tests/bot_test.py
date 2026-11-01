# Playtest bot: walks the main route room by room with live enemies and reports time, damage and deaths per room.
# Usage: serve on :8123, then python3 tests/bot_test.py
import json, pathlib, sys
from playwright.sync_api import sync_playwright
T = pathlib.Path(__file__).parent
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); pg.set_default_timeout(600000); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2000)
    pg.add_script_tag(path=str(T / 'reach_lib.js')); pg.add_script_tag(path=str(T / 'bot_lib.js'))
    pg.evaluate("LF.G.fade.a=0;LF.G.fade.to=0;LF.settings.mute=true;LF.G.save.maxHp=LF.G.save.hp=5")
    target = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith(('/', '.')) else 's_summit'   # CI passes a screenshots folder as the first argument
    route = pg.evaluate('''(target)=>{ // shortest chain of doors from the Glade to the target room
      const L=LF.Rooms.list, prev={glade:null}, q=['glade'];
      while(q.length){ const id=q.shift(); if(id===target)break; for(const dn in L[id].doors){ const d=L[id].doors[dn]; if(!L[d.to]||L[d.to].pz||L[d.to].bonus||prev[d.to]!==undefined)continue; prev[d.to]={from:id,door:dn,toName:d.toName}; q.push(d.to);} }
      const chain=[]; let c=target; while(prev[c]){ chain.unshift({room:prev[c].from,exit:prev[c].door,next:c,entry:prev[c].toName}); c=prev[c].from; }
      return chain}''', target)
    entry = None; failed = []
    for step in route:
        room, door = step['room'], step['exit']
        ab = {'dbl': True} if room in ('thicket', 'g_descent') else ({'dbl': True, 'dash': True, 'glide': True} if room not in ('glade', 'rootbridge') else {})
        r = pg.evaluate("""async (a)=>{const G=LF.G; Object.assign(G.save.abil,a.ab); G.save.sigils={root:true,prism:true,tide:true}; for(const k of ['boss_thorn','boss_prism','boss_tide']) G.save.flags[k]=1; G.save.maxHp={moss:5,glim:6,drown:7,spire:8}[LF.Rooms.list[a.room].area]||5; /* a boss adds a heart, as in play */ G.save.hp=G.save.maxHp;
           return await BOT.play({room:a.room,from:a.frm,door:a.door,maxFrames:7200,spawn:a.frm?null:{x:80,y:150}})}""", {'room': room, 'frm': entry, 'door': door, 'ab': ab})
        r['wanted'] = step['next']; r['ok'] = r['ok'] and r.get('via') == step['next']   # it must leave through the right door
        print('%-11s %s->%-3s' % (room, entry or 'start', door), json.dumps(r)); entry = step['entry']
        if not r['ok']: failed.append(room); break
    print(errs or 'NO ERRORS'); b.close()
    if failed or not route: print('ROUTE FAILED at', failed or 'no route'); sys.exit(1)
