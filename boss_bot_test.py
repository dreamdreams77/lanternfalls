# Bot fights all four bosses and the optional Trial of Embers (player has god-mode HP).
# Usage: python3 -m http.server 8123 (in project root), then: python3 tests/boss_bot_test.py /some/output/dir
import sys, json
from playwright.sync_api import sync_playwright
SP=sys.argv[1]
BOT='''(room)=>{const G=LF.G,In=LF.input;const s=G.save;s.abil={dbl:true,dash:true,glide:true};s.maxHp=99;s.hp=99;
 G.loadRoom(room,null,{x:3*16,y:11*16-14});G.fade.a=0;G.fade.to=0;G.setState('play');
 let t=0,log=[],f=0;const b0=G.boss;
 while(t<150){ s.hp=99; const pl=G.player; In.endFrame();
   const tg=G.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-pl.x)-Math.abs(b.x-pl.x))[0];
   if(LF.state!=='play'&&LF.state!=='trans'){G.setState('play')}
   if(tg){const dx=(tg.x+tg.w/2)-pl.cx; In.set('left',dx<-14); In.set('right',dx>14); In.set('attack',(f%6)<3&&Math.abs(dx)<40); const above=tg.y+tg.h/2<pl.cy-24; In.set('up',above&&Math.abs(dx)<30&&(f%2)); In.set('jump',(f%50)<14&&Math.abs(dx)<70); In.set('dash',f%90===0);}
   G.update(1/60); t+=1/60; f++;
   if(b0&&(!G.boss||G.boss!==b0)&&b0.dead) {log.push('boss dead at '+t.toFixed(1)); break}
   if(room==='trial'&&!G.trial&&s.flags.trial_done){log.push('trial done '+t.toFixed(1));break}
   if(room==='trial'&&!G.trial&&f==30){const it=G.items.find(i=>i.type==='trial'); if(it){G.player.x=it.cx-5; G.interact(it)}}
   if(room==='trial'&&G.trial&&G.trial.wave===0&&G.trial.cd>1.4){} }
 return {room,boss:b0?b0.id:null,bossHp:b0?b0.hp:null,dead:b0?!!b0.dead:null,t:t.toFixed(1),flags:Object.keys(s.flags).filter(k=>k.startsWith('boss_')||k=='trial_done'),log,sig:s.sigils,state:LF.state}}'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(viewport={'width':960,'height':540}).new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(800); pg.click('text=New Game'); pg.wait_for_timeout(1500)
    for r in ['bower','g_prism','d_tide','s_summit','trial']:
        print(json.dumps(pg.evaluate(BOT,r)))
        pg.screenshot(path=SP+'/boss_'+r+'.png')
    print('\n'.join(errs[:10]) or 'NO ERRORS'); b.close()
