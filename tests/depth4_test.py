# Tests Frenzied elites, the new charms and bounties. Usage: serve on :8123, then python3 tests/depth4_test.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2200)
    r = pg.evaluate('''()=>{
      const G=LF.G,In=LF.input,out={}; G.fade.a=0; G.fade.to=0; const step=n=>{for(let i=0;i<n;i++){G.update(1/60);In.endFrame();}};
      // frenzied appears somewhere and enrages at half health
      let found=null; for(const id of Object.keys(LF.Rooms.list)){ G.loadRoom(id,null,{x:40,y:40}); const f=G.enemies.find(e=>e.affix==='frenzied'); if(f){found=id;break;} }
      out.room=found;
      G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(20);
      const e=LF.makeEnemy('slime',20,9,G,2); e.affix='frenzied'; e.maxHp=e.hp=6; const spd=e.d.spd; G.enemies.push(e); e.hp=3; step(2);
      out.rage=!!e.rage; out.fast=e.d.spd>spd*1.5;
      G.save.ext=G.save.ext||{}; G.save.ext.frenzy=3; G.save.ext.graze=40; G.checkBounties();
      out.charms=G.save.charms.filter(c=>c==='needle'||c==='skyfire');
      G.save.eq=['needle','skyfire']; G.save.slots=4; step(2); LF.UI.menu('charms'); out.menu=LF.state;
      return out}''')
    print(r); assert r['rage'] and r['fast'] and sorted(r['charms']) == ['needle', 'skyfire'], 'depth4'
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
