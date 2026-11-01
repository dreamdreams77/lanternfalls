# Performance under a throttled CPU (phone stand-in): real frame times per region, and whether the adaptive quality had to step in.
# Usage: serve on :8123, then python3 tests/perf_test.py [cpu-slowdown, default 4]
import sys
from playwright.sync_api import sync_playwright
RATE = float(sys.argv[1]) if len(sys.argv) > 1 else 4
ROOMS = [('glade', 'moss'), ('g_cavern', 'glim'), ('d_nave', 'drown'), ('s_foot', 'spire'), ('storm', 'storm'), ('snow', 'snow')]
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': RATE})
    pg.goto('http://localhost:8123/index.html'); pg.wait_for_timeout(1500); pg.tap('text=New Game'); pg.wait_for_timeout(3000)
    pg.evaluate("(()=>{const s=LF.G.save;s.abil={dbl:true,dash:true,glide:true};LF.G.tutT=-99;})()")
    print('CPU slowdown x%g' % RATE)
    for rid, area in ROOMS:
        pg.evaluate("(id)=>{const G=LF.G;G.loadRoom(id,null,{x:60,y:120});G.fade.a=0;G.fade.to=0;G.state='play';G.save.hp=G.save.maxHp}", rid); pg.wait_for_timeout(600)
        r = pg.evaluate("""()=>new Promise(res=>{const ts=[];let last=performance.now();const f=now=>{ts.push(now-last);last=now;if(ts.length<150)requestAnimationFrame(f);else{ts.sort((a,b)=>a-b);const avg=ts.reduce((a,b)=>a+b,0)/ts.length;res({avg:avg,p95:ts[Math.floor(ts.length*.95)],fx:JSON.stringify(LF.FX)})}};requestAnimationFrame(f)})""")
        print('  %-9s avg %5.1f ms (%4.1f fps)  p95 %5.1f ms  effects %s' % (rid, r['avg'], 1000 / r['avg'], r['p95'], r['fx']))
    print(errs or 'NO ERRORS'); b.close()
