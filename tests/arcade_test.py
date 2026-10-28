# Tests Ember Shot (unlock after the Thornmother, aim, ammo, Lance pierce, reduced boss damage, touch drag-to-aim), the rotate screen mode and the four Ember Arcade mini games.
# Usage: serve on :8123, then python3 tests/arcade_test.py [screenshot dir]
import sys
from playwright.sync_api import sync_playwright
SP = sys.argv[1] if len(sys.argv) > 1 else None
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2200)
    r = pg.evaluate('''()=>{
      const G=LF.G,In=LF.input,out={}; G.fade.a=0; G.fade.to=0; const step=n=>{for(let i=0;i<n;i++){G.update(1/60);In.endFrame();}};
      G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(30);
      const pl=G.player; pl.face=1;
      // locked on a fresh save; the Thornmother's fall unlocks it (saves already past her get it on load)
      In.set('shoot',true); step(1); In.set('shoot',false); step(1); out.locked=G.shots.length===0&&!G.save.abil.shot;
      G.save.flags.boss_thorn=1; G.start(G.save); G.fade.a=0; G.fade.to=0; out.unlocked=!!G.save.abil.shot; G.loadRoom('glade',null,{x:60,y:150}); G.enemies=[]; step(30); pl.face=1;
      // a tap fires one shot that kills a 1 hp foe straight ahead
      const e=LF.makeEnemy('slime',Math.floor(pl.cx/16)+5,Math.floor((pl.y+pl.h)/16)-1,G,'t1'); e.hp=e.maxHp=1; e.d=Object.assign({},e.d,{spd:0}); G.enemies.push(e);
      const a0=G.ammo; In.set('shoot',true); step(1); In.set('shoot',false); out.fired=G.shots.length>0; out.ammoUsed=a0-G.ammo; step(40);
      out.killed=G.enemies.indexOf(e)<0; out.hits=G.save.ext.shotHits;
      // ammo refills on its own
      step(200); out.refilled=G.ammo===G.maxAmmo();
      // a held charge fires a Lance that pierces two foes in a row
      G.enemies=[]; const y=Math.floor((pl.y+pl.h)/16)-1, x0=Math.floor(pl.cx/16);
      const e1=LF.makeEnemy('husk',x0+4,y,G,'t2'), e2=LF.makeEnemy('husk',x0+7,y,G,'t3'); [e1,e2].forEach(q=>{q.hp=q.maxHp=20; q.d=Object.assign({},q.d,{spd:0}); G.enemies.push(q);});
      pl.face=1; In.set('shoot',true); step(1); step(50); out.ready=G.chReady; In.set('shoot',false); step(1);
      out.lance=G.shots.some(s=>s.lance); step(40); out.pierce=e1.hp<20&&e2.hp<20;
      // bosses take reduced damage from shots
      G.enemies=[]; const bs=LF.Bosses.make('thorn',12,9,G); bs.active=true; G.enemies.push(bs); const bx=bs.x+bs.w/2, by=bs.y+bs.h/2, h0=bs.hp;
      G.shots.push({x:bx-6,y:by,vx:280,vy:0,life:1,r:2,dmg:1,lance:false,hit:new Set(),tr:[],col:'#fff'}); step(1); out.bossShot=h0-bs.hp; G.hitstopT=0;
      G.shots.push({x:bx-6,y:by,vx:280,vy:0,life:1,r:4,dmg:5,lance:true,hit:new Set(),tr:[],col:'#fff'}); step(1); out.bossLance=h0-bs.hp-out.bossShot;
      G.enemies=[]; G.shots=[];
      // a held charge is dropped by a menu, so it never fires by itself on return
      G.shots=[]; In.set('shoot',true); step(60); LF.UI.menu('pause'); step(3); LF.UI.closeMenu(); step(3); out.noAutoLance=!G.shots.some(s=>s.lance); In.clear();
      out.noErr=true; return out}''')
    print('shot', r)
    assert r['noAutoLance'] and r['locked'] and r['unlocked'] and r['bossShot'] == 0.5 and r['bossLance'] == 3 and r['fired'] and r['ammoUsed'] == 1 and r['killed'] and r['refilled'] and r['ready'] and r['lance'] and r['pierce'], 'ember shot'
    if SP: pg.screenshot(path=SP + '/shot.png')
    # Pip stocks the shot items only once Ember Shot is unlocked
    stock = pg.evaluate('''()=>{ const G=LF.G, names=()=>[...document.querySelectorAll('.card b')].map(b=>b.textContent); const out={};
      G.save.abil.shot=false; LF.UI.shop(); out.before=names().some(n=>/Spitfire|Ember Quiver|Kindled Lance/.test(n)); LF.UI.clearScreen();
      G.save.abil.shot=true; LF.UI.shop(); out.after=['Spitfire','Ember Quiver','Kindled Lance'].every(k=>names().includes(k)); LF.UI.clearScreen(); G.setState('play'); return out}''')
    print('shop', stock); assert not stock['before'] and stock['after'], 'shop gating'
    # touch: dragging up from the SHOT button aims straight up
    pg.evaluate("LF.settings.touch='on'; LF.refreshTouch(); LF.G.enemies=[]; LF.G.shots=[]; LF.G.ammo=LF.G.maxAmmo()")
    bb = pg.locator('#touch [data-k=shoot]').bounding_box(); cx, cy = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx, cy - 60, steps=3); pg.wait_for_timeout(120)
    up = pg.evaluate("(()=>{const s=LF.G.shots[0]; return s ? {vx:Math.round(s.vx), vy:Math.round(s.vy), aim:LF.touchAim} : null})()")
    pg.mouse.up(); pg.wait_for_timeout(100); print('drag aim', up)
    assert up and up['vy'] < -200 and abs(up['vx']) < 5, 'touch drag aim'
    pg.evaluate("LF.settings.touch='auto'; LF.refreshTouch()")
    # play each mini game for a while with mashed inputs, from the pause menu, and check results + medal reward
    pg.evaluate("LF.UI.menu('arcade')"); pg.wait_for_timeout(300)
    if SP: pg.screenshot(path=SP + '/arcade_tab.png')
    for gid in pg.evaluate('Object.keys(LF.Arcade.GAMES)'):
        res = pg.evaluate('''(id)=>{
          const G=LF.G,In=LF.input,A=LF.Arcade; A.from='pause'; A.play(id); const keys=['left','right','jump','attack','up','down','shoot'];
          for(let i=0;i<60*100 && !A.cur.shown;i++){ if(i%9===0){const k=keys[(i/9)%keys.length|0]; In.set(k,true);} if(i%9===4) keys.forEach(k=>In.set(k,false)); if(i%30===0) A.taps.push({x:160,y:100}); G.update(1/60); A.render(document.getElementById('game').getContext('2d')); In.endFrame(); }
          return {state:LF.state, shown:A.cur&&A.cur.shown, score:A.cur&&A.cur.st.score}}''', gid)
        print(gid, res)
        if SP: pg.screenshot(path=SP + '/mini_' + gid + '.png')
        assert res['state'] == 'mini' and res['shown'], gid
    # snake: biting the tail while still growing ends the run
    bite = pg.evaluate('''()=>{ const G=LF.G,A=LF.Arcade; A.from='title'; A.play('snake'); A.cur.ready=0; const st=A.cur.st;
      st.body=[{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5}]; st.dir={x:1,y:0}; st.grow=2; st.stepT=0; st.food={x:20,y:10}; G.update(1/60);
      const over=st.over===true; st.over=true; A.quit(); return over }''')
    assert bite, 'snake growing tail'
    # skill bots reach gold in the newer games, so every medal is attainable
    bots = pg.evaluate('''(seed)=>{ const G=LF.G,In=LF.input,A=LF.Arcade,out={},W=LF.W; const rnd0=Math.random; Math.random=LF.rng(seed); // repeatable runs
      const run=(id,brain,max)=>{ A.from='title'; A.play(id); A.cur.ready=0; for(let i=0;i<max && !A.cur.over;i++){ brain(A.cur.st,i); G.update(1/60); In.endFrame(); } const sc=A.cur.st.score; out[id]=[sc,A.medal(id,sc)]; A.cur.st.over=true; A.quit(); };
      // stack: drop when the slider lines up with the top block
      run('stack',(st)=>{ const top=st.tower[st.tower.length-1]; if(Math.abs(st.cur.x-top.x)<2 && st.tower.length<60) A.taps.push({x:0,y:0}); },60*120);
      // flight: flap when below the middle of the next gap
      run('flight',(st)=>{ const v=st.vines.find(v=>v.x+14>70); const aimY=v?v.gy+v.gh/2+8:96; if(st.y>aimY && st.vy>0) A.taps.push({x:0,y:0}); },60*90);
      // breaker: keep the paddle under the ball, offset a little to angle shots
      run('breaker',(st)=>{ if(st.stuck){A.taps.push({x:st.px,y:0});return;}
        const b=st.balls.reduce((m,q)=>q.vy>0&&(!m||q.y>m.y)?q:m,null)||st.balls[0]; let want=b.x; if(b.vy>0){ let x=b.x+b.vx*(160-b.y)/b.vy; while(x<3||x>W-3) x=x<3?6-x:2*(W-3)-x; want=x; }
        In.set('left',st.px>want+2); In.set('right',st.px<want-2); },60*95);
      In.set('left',false); In.set('right',false);
      // snake: steer toward food (gold first), avoid walls and tail with a one-step check
      run('snake',(st)=>{ if(st.stepT>1/60) return; const h=st.body[0], f=st.gold||st.food, D=[[1,0],[-1,0],[0,1],[0,-1]];
        const free=(x,y)=>x>=0&&y>=0&&x<30&&y<14&&!st.body.slice(0,-1).some(s=>s.x===x&&s.y===y);
        const room=(x,y)=>{ const seen=new Set([x+','+y]), q=[[x,y]]; let n=0; while(q.length&&n<60){ const [a,b]=q.pop(); n++; for(const [dx,dy] of D){ const k=(a+dx)+','+(b+dy); if(!seen.has(k)&&free(a+dx,b+dy)){seen.add(k);q.push([a+dx,b+dy]);} } } return n; };
        let best=null,bs=-1e9; for(const [dx,dy] of D){ if(dx===-st.dir.x&&dy===-st.dir.y) continue; const x=h.x+dx,y=h.y+dy; if(!free(x,y)) continue; const sc=-Math.abs(f.x-x)-Math.abs(f.y-y)+Math.min(room(x,y),40)*2; if(sc>bs){bs=sc;best={x:dx,y:dy};} }
        if(best) st.next=best; },60*150);
      Math.random=rnd0; return out}''', 42)
    print('bots', bots)
    for gid, (sc, med) in bots.items(): assert med == 3, gid + ' gold not reached by bot: ' + str(sc)
    # a forced gold score pays embers once, and quitting returns to the pause menu
    r2 = pg.evaluate('''()=>{ const G=LF.G,A=LF.Arcade; LF.UI.clearScreen(); G.setState('paused'); A.from='pause'; const e0=G.save.embers; A.play('moth'); A.cur.ready=0; A.cur.st.score=900; A.cur.st.over=true; for(let i=0;i<70;i++) G.update(1/60);
      const paid=G.save.embers-e0, med=G.save.ext.medals.moth; A.play('moth'); A.cur.ready=0; A.cur.st.score=900; A.cur.st.over=true; for(let i=0;i<70;i++) G.update(1/60);
      const again=G.save.embers-e0; A.quit(); return {paid,med,again,state:LF.state}}''')
    print('reward', r2); assert r2['paid'] >= 100 and r2['again'] == r2['paid'] and r2['med'] == 3 and r2['state'] == 'paused', 'rewards'
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # rotate screen mode turns the stage on a portrait phone
    pg2 = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True).new_page()
    pg2.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg2.goto('http://localhost:8123/index.html'); pg2.wait_for_timeout(600)
    pg2.evaluate("LF.settings.view='rotate'; LF.resize()")
    tr = pg2.evaluate("document.getElementById('stage').style.transform"); print('rotate', tr)
    assert 'rotate(90deg)' in tr, 'rotate'
    pt = pg2.evaluate("(()=>{const r=LF.view.getBoundingClientRect(); return LF.toGame(r.right-1, r.top+1)})()"); print('corner', pt)
    assert pt['x'] < 4 and pt['y'] < 4, 'toGame mapping'
    pg2.click('text=Mini Games'); pg2.wait_for_timeout(300)
    if SP: pg2.screenshot(path=SP + '/rotate_arcade.png')
    pg2.click('text=Ember Range'); pg2.wait_for_timeout(2500)
    if SP: pg2.screenshot(path=SP + '/rotate_range.png')
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
    assert not errs, 'errors'
