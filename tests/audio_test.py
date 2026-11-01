# Audio wiring: muffle filter, intensity layers, new stingers must run without errors. Usage: serve on :8123, then python3 tests/audio_test.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type in ('error',) else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2200)
    r = pg.evaluate('''()=>{const A=LF.Audio,G=LF.G,In=LF.input,out={}; G.fade.a=0; G.fade.to=0; const step=n=>{for(let i=0;i<n;i++){G.update(1/60);In.endFrame();}};
      out.ready=A.ready; out.lp=!!A.lp;
      for(const n of ['perfect','heartbeat','ambush','clear','squash','curl','split','hit','jump']) A.sfx(n);
      G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(20);
      for(let i=0;i<5;i++){ const e=LF.makeEnemy('slime',6+i,9,G,'q'+i); G.enemies.push(e); }
      G.player.x=100; step(200); out.intensity=A.int;
      G.enemies=[]; step(400); out.calm=A.int;
      G.save.hp=1; step(120); out.hbOK=true;
      LF.UI.menu('pause'); step(30); out.muffled=A.lp?A.lp.frequency.value:null; LF.UI.closeMenu();
      return out}''')
    print(r); assert r['ready'] and r['lp'] and r['intensity'] > .3 and r['calm'] < r['intensity'], 'audio'
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
