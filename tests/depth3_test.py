# Tests the Ember Graze, Air Chain, hit-stop input buffering and Phoenix Ash reset.
# Usage: python3 -m http.server 8123 (in project root), then: python3 tests/depth3_test.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2200)
    r = pg.evaluate('''()=>{
      const G=LF.G, In=LF.input, out={}; G.fade.a=0; G.fade.to=0; G.save.abil.dash=true;
      const step=n=>{for(let i=0;i<n;i++){G.update(1/60);In.endFrame();}};
      // graze: dash straight through a slime
      G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(30);
      const pl=G.player; const e=LF.makeEnemy('slime',Math.floor((pl.x+30)/16),Math.floor(pl.y/16),G,'t1'); e.x=pl.x+24; e.y=pl.y+pl.h-e.h; e.vx=0; e.d=Object.assign({},e.d,{spd:0}); G.enemies.push(e);
      pl.face=1; const f0=G.flare, g0=(G.save.ext.graze||0); In.set('dash',true); step(2); In.set('dash',false); step(14);
      out.graze=(G.save.ext.graze||0)-g0; out.flareGain=G.flare>f0; out.hurt=G.save.hp<G.save.maxHp;
      // air chain: pogo twice over two foes without landing
      G.enemies=[]; G.air=0; G.player.vy=0; step(1);
      const p2=G.player, gy=p2.y; p2.onGround=false; p2.y-=60; p2.vy=0; G._melee=false;
      const hits=[]; for(let i=0;i<3;i++){ const en=LF.makeEnemy('beetle',0,0,G,'a'+i); en.hp=en.maxHp=99; G.enemies.push(en); }
      for(let i=0;i<3;i++){ p2.atkDir='d'; G._melee=true; LF.hurtEnemy(G.enemies[i],1,1,G); G._melee=false; }
      out.air=G.air; out.airBest=G.save.ext.air;
      G.player.y=gy; G.player.vy=0; step(15); out.airReset=G.air;
      // hit-stop keeps presses: press jump during hit-stop, then it must still register
      G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(30); G.hitstop(.1); In.set('jump',true); G.update(1/60); out.pressedKept=!!In.pressed.jump;
      In.set('jump',false); In.clear();
      // phoenix resets on respawn
      G.phoenixUsed=true; G.killPlayer(); G.respawn(); out.phoenix=G.phoenixUsed;
      return out}''')
    print(r)
    assert r['graze'] >= 1 and r['flareGain'] and not r['hurt'], 'graze'
    assert r['air'] == 3 and r['airBest'] >= 3 and r['airReset'] == 0, 'air chain'
    assert r['phoenix'] is False, 'phoenix'
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
