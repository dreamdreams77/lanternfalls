# Every door arrival must be survivable: no room may drop the player onto a spike, and nobody may be hurt just by walking through a door.
# Usage: serve on :8123, then python3 tests/arrival_test.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context().new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2000)
    bad = pg.evaluate('''()=>{const G=LF.G,In=LF.input,out=[]; G.fade.a=0; G.fade.to=0; LF.settings.mute=true; G.save.abil={dbl:true,dash:true,glide:true};
      for(const id of Object.keys(LF.Rooms.list)){ const r=LF.Rooms.list[id]; for(const dn in r.doors){
        G.save.maxHp=G.save.hp=9; G.loadRoom(id,dn,null); G.enemies=[]; G.state='play'; G.doorCD=5; G.fade.a=0; G.fade.to=0;
        for(let f=0;f<400;f++){ G.player.invul=Math.max(G.player.invul,0); G.update(1/60); In.endFrame(); if(G.state!=='play')G.setState('play'); if(f>150)break; }
        if(G.save.hp<9) out.push(id+'.'+dn+' arrival cost '+(9-G.save.hp)+' heart(s)');
      }} return out}''')
    print(bad or 'all arrivals safe'); assert not bad, 'unsafe arrivals'
    print(errs or 'NO ERRORS'); b.close()
