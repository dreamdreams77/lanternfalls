# Smoke test: loads every room, dialog, menus, shop, death/respawn, save/continue, ending.
# Usage: python3 -m http.server 8123 (in project root), then: python3 tests/smoke_test.py /some/output/dir
# Requires: pip install playwright && playwright install chromium
import sys, json
from playwright.sync_api import sync_playwright
SP=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':960,'height':540}); pg=ctx.new_page()
    errs=[]
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800)
    pg.click('text=New Game'); pg.wait_for_timeout(2200)
    # 1. all rooms load + render + door sanity
    res=pg.evaluate('''()=>{const G=LF.G,out=[];const ids=Object.keys(LF.Rooms.list);
      for(const id of ids){ try{ G.loadRoom(id,null,{x:40,y:40}); for(let i=0;i<5;i++){G.update(1/60);} G.render(document.getElementById('game').getContext('2d'));
        const r=G.room; for(const k in r.doors){const d=r.doors[k]; const t=LF.Rooms.list[d.to]; if(!t) out.push(id+' door '+k+' -> missing '+d.to); else if(!t.doors[d.toName]) out.push(id+' door '+k+' -> no door '+d.toName+' in '+d.to); }
      }catch(e){out.push(id+': '+e.message)} } return {n:ids.length,out}}''')
    print('rooms',json.dumps(res))
    # 2. wick dialog
    pg.evaluate("LF.G.loadRoom('glade',null,{x:10*16,y:11*16-14}); LF.G.player.x=10*16+6; LF.G.player.y=11*16-14")
    pg.wait_for_timeout(300); pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(600)
    print('dialog state',pg.evaluate('LF.state'))
    pg.screenshot(path=SP+'/dialog.png')
    for i in range(40):
        pg.keyboard.press('Space'); pg.wait_for_timeout(120)
        if pg.evaluate('LF.state')=='play': break
    print('after dialog',pg.evaluate('LF.state'))
    # 3. menus
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400); print('menu',pg.evaluate('LF.state'))
    pg.screenshot(path=SP+'/pause.png')
    for t in ['Charms','Map','Journal','Stats','Help']:
        pg.click('.tabs >> text='+t); pg.wait_for_timeout(250)
        if t in('Map','Stats'): pg.screenshot(path=SP+'/tab_'+t+'.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); print('closed',pg.evaluate('LF.state'))
    # 4. shop
    pg.evaluate("LF.G.save.embers=400; LF.UI.shop()"); pg.wait_for_timeout(300); pg.screenshot(path=SP+'/shop.png')
    pg.click('.card >> nth=1'); pg.wait_for_timeout(200)
    print('bought charms',pg.evaluate('LF.G.save.charms'),'embers',pg.evaluate('LF.G.save.embers'))
    pg.click('text=Leave'); pg.wait_for_timeout(200); print('after shop',pg.evaluate('LF.state'))
    # 5. death/respawn
    pg.evaluate("LF.G.killPlayer()"); pg.wait_for_timeout(4500); print('after death',pg.evaluate('LF.state'),pg.evaluate('LF.G.save.hp'))
    # 6. boss rooms
    for rid in ['thicket','g_prism','d_tide','s_summit']:
        ok=pg.evaluate("(id)=>{ if(!LF.Rooms.list[id]) return 'noroom'; LF.G.loadRoom(id,null,{x:200,y:100}); return LF.G.boss? LF.G.boss.id:'noboss'}",rid); print('room',rid,ok)
    # 7. save -> reload -> continue
    pg.evaluate("LF.G.loadRoom('glade',null,{x:100,y:150}); LF.Save.write(LF.G.save)")
    pg.reload(); pg.wait_for_timeout(1500); pg.screenshot(path=SP+'/title2.png')
    pg.click('text=Continue'); pg.wait_for_timeout(2000); print('continued',pg.evaluate('LF.state'),pg.evaluate('LF.G.room.id'),pg.evaluate('LF.G.save.charms'))
    # 8. ending
    pg.evaluate("LF.UI.ending()"); pg.wait_for_timeout(1800)
    for i in range(5): pg.mouse.click(480,270); pg.wait_for_timeout(500)
    pg.screenshot(path=SP+'/ending.png'); print('ending',pg.evaluate('LF.state'))
    pg.click('text=Keep Exploring'); pg.wait_for_timeout(300); print('state',pg.evaluate('LF.state'))
    print('\n'.join(errs[:15]) or 'NO ERRORS')
    b.close()
