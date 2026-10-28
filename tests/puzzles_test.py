# Solves all four Lamplight Galleries with real shots (mirrors, pivot mirror strike, Lance-only eyes, drifting eyes, grates, timers)
# and checks the failure cases. Usage: serve on :8123, then python3 tests/puzzles_test.py [screenshot dir]
import sys
from playwright.sync_api import sync_playwright
SP = sys.argv[1] if len(sys.argv) > 1 else None
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 960, 'height': 540}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2200)
    pg.evaluate('''()=>{ const G=LF.G,In=LF.input; G.fade.a=0; G.fade.to=0;
      window.step=n=>{for(let i=0;i<n;i++){G.update(1/60);In.endFrame();}};
      window.at=(col,row)=>{const pl=G.player; pl.x=col*16+3; pl.y=row*16-14; pl.vx=pl.vy=0; step(2);};   // stand on top of tile row 'row'
      window.shoot=(ang,lance)=>{ G.ammo=G.maxAmmo(); G.shotCD=0; G.hitstopT=0; LF.touchAim=ang; In.set('shoot',true); step(1); if(lance) step(50); In.set('shoot',false); step(1); LF.touchAim=null; step(90); };
      window.go=id=>{ G.loadRoom(id,null,{x:64,y:40}); step(5); };
      window.lit=()=>G.items.filter(i=>i.type==='target'&&i.lit).length;
      window.gateOpen=()=>!G.room.grid.some(r=>r.includes('E')); }''')
    U, R, L, UR = -1.5707963, 0, 3.14159265, -0.78539816
    r = pg.evaluate('''()=>{ const G=LF.G,out={};
      // doorways only appear once Ember Shot is unlocked
      G.loadRoom('rootbridge',null,{x:60,y:150}); out.hiddenBefore=!G.items.some(i=>i.gallery);
      G.save.abil.shot=true; G.loadRoom('rootbridge',null,{x:60,y:150}); out.shownAfter=G.items.some(i=>i.gallery&&i.to==='gal_moss');
      ['g_cavern','d_entry','s_foot'].forEach(h=>{G.loadRoom(h,null,{x:60,y:100}); out['door_'+h]=G.items.some(i=>i.gallery);});
      // a strike does not wake an eye
      go('gal_moss'); at(9,12); LF.input.set('up',true); LF.input.set('attack',true); step(1); LF.input.set('attack',false); LF.input.set('up',false); step(20); out.strikeNoLight=lit()===0; return out}''')
    print('doors', r); assert all(r.values()), 'doorways'
    a = pg.evaluate(f'''()=>{{ go('gal_moss'); at(10,12); shoot({U}); at(14,12); shoot({UR}); at(18,12); shoot({R}); return {{lit:lit(), open:gateOpen(), flag:!!LF.G.save.flags['pz:gal_moss']}} }}''')
    print('A', a); assert a['lit'] == 3 and a['open'] and a['flag'], 'gallery A'
    if SP: pg.screenshot(path=SP + '/gal_moss.png')
    bres = pg.evaluate(f'''()=>{{ const G=LF.G,In=LF.input,out={{}}; go('gal_glim');
      at(12,12); shoot({U}); out.viaMirror=lit();
      at(9,3); shoot({U}); out.wrongWay=lit();                                  // pivot mirror still points left
      In.set('up',true); In.set('attack',true); step(1); In.set('attack',false); step(15); In.set('up',false); step(15);
      out.turned=G.items.find(i=>i.type==='mirror'&&i.rot).dir; at(9,3); shoot({U}); out.lit=lit(); out.open=gateOpen(); return out }}''')
    print('B', bres); assert bres['viaMirror'] == 1 and bres['wrongWay'] == 1 and bres['turned'] == '/' and bres['lit'] == 2 and bres['open'], 'gallery B'
    if SP: pg.screenshot(path=SP + '/gal_glim.png')
    c = pg.evaluate(f'''()=>{{ const G=LF.G,out={{}}; go('gal_drown');
      at(15,12); shoot({U}); out.timerOn=G.pzT>0; step(60*7); out.dimmed=lit()===0;    // too slow: the eyes go dark again
      at(15,12); shoot({R}); out.normalOnIron=lit();                                    // iron eye ignores a normal shot
      const d=G.items.find(i=>i.type==='target'&&i.drift); at(8,12); let k=0; while(k++<400 && (d.by-8+(d.oy||0))<178) step(1); shoot({L}); // time the drifting eye
      at(15,12); shoot({U}); shoot({R},true); out.two=lit()-1;
      out.lit=lit(); out.open=gateOpen(); return out }}''')
    print('C', c); assert c['timerOn'] and c['dimmed'] and c['normalOnIron'] == 0 and c['two'] == 2 and c['lit'] == 3 and c['open'], 'gallery C'
    if SP: pg.screenshot(path=SP + '/gal_drown.png')
    d = pg.evaluate(f'''()=>{{ const G=LF.G,out={{}}; go('gal_spire');
      at(6,14); shoot({U}); out.mirror1=lit();
      const m2=G.items.find(i=>i.type==='mirror'&&i.rot); m2.dir='\\\\';
      at(13,11); shoot({U}); out.mirror2=lit();
      at(19,14); shoot({R},true); out.grateLance=lit();
      const dr=G.items.find(i=>i.type==='target'&&i.drift); at(20,11);                // lead the drifting eye: fire when it will cross the line as the shot arrives
      const ahead=()=>dr.by-8+Math.sin((G.clock+.27)*dr.sp+dr.ph)*dr.drift*16; let k=0; while(k++<500 && Math.abs(ahead()-168)>2) step(1); shoot({R});
      out.lit=lit(); out.open=gateOpen();
      const ch=G.items.find(i=>i.type==='chest'); G.interact(ch); out.glass=G.save.charms.includes('glass');
      out.bounty=!!G.save.bounties.lamp; return out }}''')
    print('D', d); assert d['mirror1'] == 1 and d['mirror2'] == 2 and d['grateLance'] == 3 and d['lit'] == 4 and d['open'] and d['glass'] and d['bounty'], 'gallery D'
    if SP: pg.screenshot(path=SP + '/gal_spire.png')
    e = pg.evaluate(f'''()=>{{ const G=LF.G,out={{}};
      G.save.eq=['glass']; G.loadRoom('glade',null,{{x:60,y:150}}); G.enemies=[]; step(5); at(2,12);
      G.ammo=3; LF.touchAim={L}; LF.input.set('shoot',true); step(1); LF.input.set('shoot',false); step(8); LF.touchAim=null;
      out.bounced=G.shots.some(s=>s.bounced&&s.vx>0);
      // solved galleries stay solved
      go('gal_glim'); out.persist=gateOpen()&&lit()===2; return out }}''')
    print('glass/persist', e); assert e['bounced'] and e['persist'], 'glass + persistence'
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
    assert not errs, 'errors'
