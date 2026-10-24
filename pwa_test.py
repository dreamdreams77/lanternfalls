from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':960,'height':540}); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type in('error',) else None)
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(1500)
    print('sw ready', pg.evaluate("navigator.serviceWorker.ready.then(r=>r.active&&r.active.state)"))
    pg.reload(); pg.wait_for_timeout(1500)
    print('controlled', pg.evaluate("!!navigator.serviceWorker.controller"), 'caches', pg.evaluate("caches.keys().then(k=>k.join(','))"), 'cached files', pg.evaluate("caches.keys().then(k=>caches.open(k[0]).then(c=>c.keys()).then(r=>r.length))"))
    cdp=ctx.new_cdp_session(pg); cdp.send('Page.enable')
    try: print('installability', json.dumps(cdp.send('Page.getInstallabilityErrors')))
    except Exception as e: print('install check', e)
    try: print('manifest', json.dumps(cdp.send('Page.getAppManifest'))[:300])
    except Exception as e: print('manifest check', e)
    # offline
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1800)
    print('offline title', pg.evaluate("typeof LF!=='undefined' && LF.state"))
    pg.click('text=New Game'); pg.wait_for_timeout(2500)
    print('offline play', pg.evaluate("LF.state+' '+LF.G.room.id"))
    pg.evaluate("()=>{LF.G.save.flags.boss_thorn=1;LF.G.loadRoom('snow',null,{x:64,y:210})}"); pg.wait_for_timeout(1500)
    print('offline snow', pg.evaluate("LF.G.room.id"), errs[:5] or 'NO ERRORS')
