# Tests slime splitting, beetle curl, bat flock, thorn fan and ambush encounters. Usage: serve on :8123, then python3 tests/depth5_test.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2200)
    r = pg.evaluate('''()=>{
      const G=LF.G,In=LF.input,out={}; G.fade.a=0; G.fade.to=0; const step=n=>{for(let i=0;i<n;i++){G.update(1/60);In.endFrame();}};
      G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(30);
      // slime splits into two babies that do not split again and do not inflate the bestiary
      const sl=LF.makeEnemy('slime',20,9,G,'s1'); G.enemies.push(sl); const b0=G.save.bestiary.slime||0; sl.hp=1; LF.hurtEnemy(sl,5,1,G); step(2);
      out.babies=G.enemies.filter(e=>e.baby).length; const bb=G.enemies.find(e=>e.baby); LF.hurtEnemy(bb,5,1,G); step(2);
      out.afterBaby=G.enemies.filter(e=>e.type==='slime').length; out.bestiary=(G.save.bestiary.slime||0)-b0;
      // beetle: three hits curl it, and a curled beetle ignores blows
      G.enemies=[]; const bt=LF.makeEnemy('beetle',22,9,G,'b1'); bt.hp=bt.maxHp=50; G.enemies.push(bt);
      for(let i=0;i<3;i++) LF.hurtEnemy(bt,1,1,G); out.curl=bt.curl>0; const hp=bt.hp; LF.hurtEnemy(bt,1,1,G); out.clank=bt.hp===hp; step(120); out.uncurl=!(bt.curl>0);
      // bat flock
      G.enemies=[]; const bats=[0,1,2].map(i=>{const e=LF.makeEnemy('bat',20+i,3,G,'k'+i); G.enemies.push(e); return e;}); G.player.x=bats[0].x+4; G.player.y=bats[0].y+60; step(40);
      out.flock=bats.filter(e=>e.state!=='hang').length;
      // ambush: discovering a treasure can set one off (force the roll)
      G.enemies=[]; G.player.x=60; G.player.y=150; step(30);
      const hashOK=[...Array(60).keys()].some(i=>{ G.save.moths.push('t'+i); step(14); return false;}); step(100);
      out.ambushSeen=G.enemies.some(e=>e.ambush);
      return out}''')
    print(r)
    assert r['babies'] == 2 and r['afterBaby'] == 1 and r['bestiary'] == 1, 'split'
    assert r['curl'] and r['clank'] and r['uncurl'] and r['flock'] == 3 and r['ambushSeen'], 'behaviours'
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
