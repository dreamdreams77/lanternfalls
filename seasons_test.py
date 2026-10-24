from playwright.sync_api import sync_playwright
import sys; SP=sys.argv[1] if len(sys.argv)>1 else '.'
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':960,'height':540}); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(2300)
    print('rooms', pg.evaluate("LF.Rooms.order.length"))
    # glade portals locked
    pg.evaluate("()=>{const G=LF.G;G.loadRoom('glade',null,{x:160,y:150})}"); print('portals locked', pg.evaluate("LF.G.items.filter(i=>i.type==='portal').length"))
    pg.evaluate("()=>{const G=LF.G;G.save.flags.boss_thorn=1;G.loadRoom('glade',null,{x:19*16,y:178})}"); pg.wait_for_timeout(600)
    print('portals unlocked', pg.evaluate("LF.G.items.filter(i=>i.type==='portal').map(i=>i.season)"))
    pg.screenshot(path=SP+'/glade_portal.png')
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(1500)
    print('after portal', pg.evaluate("({r:LF.G.room.id,s:LF.state,x:Math.round(LF.G.player.x),y:Math.round(LF.G.player.y)})"))
    pg.wait_for_timeout(9000); pg.screenshot(path=SP+'/storm1.png')
    print('storm env', pg.evaluate("({gust:LF.G.gust,haz:LF.G.hazards.length,hp:LF.G.save.hp})"))
    pg.evaluate("()=>{const pl=LF.G.player;pl.x=30*16;pl.y=8*16;}"); pg.wait_for_timeout(700); pg.screenshot(path=SP+'/storm2.png')
    pg.evaluate("()=>{const G=LF.G;G.save.hp=5;const pl=G.player;pl.x=57*16;pl.y=13*16-6}"); pg.wait_for_timeout(500)
    pg.evaluate("()=>{const G=LF.G;const c=G.items.find(i=>i.type==='chest');G.player.x=c.cx-6;G.player.y=13*16-6;}"); pg.wait_for_timeout(300)
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(1200)
    print('storm clear', pg.evaluate("({clear:LF.G.save.flags.storm_clear,maxHp:LF.G.save.maxHp})"))
    # snow
    pg.evaluate("()=>{LF.G.loadRoom('snow',null,{x:64,y:210})}"); pg.wait_for_timeout(2500)
    pg.evaluate("()=>{const G=LF.G;G.player.x=20*16;G.player.y=13*16-6;G.enemies.forEach(e=>{if(e.type==='snowman'){e.x=26*16;}})}")
    pg.wait_for_timeout(3500); pg.screenshot(path=SP+'/snow1.png')
    print('snow enemies', pg.evaluate("LF.G.enemies.map(e=>e.type+':'+e.hp+(e.affix?':'+e.affix:''))"))
    pg.evaluate("()=>{LF.G.blizzard=3}"); pg.wait_for_timeout(500); pg.screenshot(path=SP+'/blizzard.png')
    # arena + boss
    pg.evaluate("()=>{const G=LF.G;G.save.hp=5;G.loadRoom('snow_arena','l')}"); pg.wait_for_timeout(1500)
    pg.evaluate("()=>{const G=LF.G;G.player.x=9*16;G.player.invul=99}"); pg.wait_for_timeout(4500); pg.screenshot(path=SP+'/arena.png')
    print('boss', pg.evaluate("({a:LF.G.boss&&LF.G.boss.active,st:LF.G.boss&&LF.G.boss.state,hp:LF.G.boss&&LF.G.boss.hp})"))
    pg.wait_for_timeout(12000); pg.screenshot(path=SP+'/arena2.png')
    print('boss2', pg.evaluate("({st:LF.G.boss&&LF.G.boss.state,hp:LF.G.boss&&LF.G.boss.hp,en:LF.G.enemies.length})"))
    pg.evaluate("()=>{const G=LF.G;G.player.hasCharm=()=>false;const b=G.boss;b.hp=1;LF.Bosses.hurt(b,5,1,G)}"); pg.wait_for_timeout(2500)
    print('after kill', pg.evaluate("({f:LF.G.save.flags.snow_clear,ch:LF.G.save.charms,hp:LF.G.save.maxHp,boss:!!LF.G.boss})"))
    # replay
    pg.evaluate("()=>{LF.G.loadRoom('snow_arena','l')}"); pg.wait_for_timeout(800)
    print('replay boss', pg.evaluate("!!LF.G.boss"))
    print(errs[:10] or 'NO ERRORS')
