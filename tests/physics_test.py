# Regression: a body spawned inside solid rock must not hang the physics loop. Usage: serve on :8123, then python3 tests/physics_test.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context().new_page(); pg.set_default_timeout(15000); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2000)
    r = pg.evaluate('''()=>{const G=LF.G; G.fade.a=0; G.fade.to=0; G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[];
      for(const [tx,ty] of [[0,0],[0,5],[20,40],[-3,3]]){ const e=LF.makeEnemy('beetle',tx,ty,G,'w'); e.vx=50; e.vy=-80; G.enemies.push(e); }
      for(let i=0;i<120;i++) G.update(1/60); return G.enemies.every(e=>isFinite(e.x)&&isFinite(e.y))}''')
    print('finished, finite positions:', r); assert r; print(errs or 'NO ERRORS'); b.close()
