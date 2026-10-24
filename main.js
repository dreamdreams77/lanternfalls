/* Lanternfall - boot, fixed-timestep loop, scaling, error handling */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, In = LF.input;
  LF.state = 'boot';
  const cv = document.getElementById('game'), g = cv.getContext('2d'), stage = document.getElementById('stage');
  g.imageSmoothingEnabled = false;

  /* ---------- scaling: keep 16:9, scale the 960x540 stage to fit ---------- */
  const rot = document.createElement('div');
  rot.style.cssText = 'position:fixed;left:0;right:0;top:0;padding:6px;text-align:center;background:#241c46;color:#ffd27a;font:700 13px sans-serif;letter-spacing:.1em;z-index:200;display:none';
  rot.textContent = 'Rotate your device for the best view';
  document.body.appendChild(rot);
  // Display canvas: the 320x180 game canvas is upscaled by a whole-number factor (crisp, even pixels),
  // then the browser smooths the remaining fractional scale. This removes pixel shimmer while scrolling.
  const view = document.createElement('canvas'), vg = view.getContext('2d');
  view.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:auto';
  stage.insertBefore(view, cv); cv.style.display = 'none';
  let vk = 0;
  function sizeView(s) {
    const k = Math.max(2, Math.min(6, Math.ceil(3 * s * (window.devicePixelRatio || 1) - .001)));
    if (k !== vk) { vk = k; view.width = 320 * k; view.height = 180 * k; vg.imageSmoothingEnabled = false; }
  }
  function resize() {
    const s = Math.min(window.innerWidth / 960, window.innerHeight / 540);
    sizeView(s);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    document.documentElement.style.setProperty('--u', '18px');
    rot.style.display = (window.innerHeight > window.innerWidth * 1.15 && LF.touchDetected) ? 'block' : 'none';
  }
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize); resize();

  /* ---------- error handling ---------- */
  let errs = 0;
  function fatal(e) {
    console.error(e); errs++;
    if (errs === 3) {
      const d = document.createElement('div'); d.className = 'screen dim'; d.style.zIndex = 90;
      d.innerHTML = '<div class="panel" style="text-align:center"><h2>Something flickered</h2><p>The game hit an unexpected error. Your last save is safe.</p></div>';
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Reload'; b.onclick = () => location.reload(); d.firstChild.appendChild(b); stage.appendChild(d);
    }
  }
  window.addEventListener('error', e => fatal(e.error || e.message));

  /* ---------- boot ---------- */
  LF.loadSettings(); LF.initTouch(); LF.UI.init();
  const unlock = () => { LF.Audio.init(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && LF.state === 'play') LF.UI.menu('pause'); });
  window.addEventListener('blur', () => { if (LF.state === 'play') LF.UI.menu('pause'); });
  // autosave periodically while playing
  setInterval(() => { if (G.save && LF.state === 'play' && G.save.flags.started) LF.Save.write(G.save); }, 30000);
  window.addEventListener('beforeunload', () => { if (G.save && G.save.flags.started) LF.Save.write(G.save); });

  G.fade.a = 1; G.fadeTo(0, 1.5);
  LF.UI.title();

  /* ---------- loop ---------- */
  const STEP = 1 / 60; let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    try {
      acc += Math.min(0.1, (now - last) / 1000); last = now;
      LF.pollPad();
      let n = 0;
      while (acc >= STEP && n < 5) { G.update(STEP); In.endFrame(); acc -= STEP; n++; }
      if (n === 5) acc = 0;
      LF.alpha = acc / STEP;
      if (LF.state === 'title' || !G.room) G.renderTitle(g, G.clock); else G.render(g);
      vg.drawImage(cv, 0, 0, view.width, view.height);
    } catch (e) { fatal(e); }
  }
  requestAnimationFrame(t => { last = t; frame(t); });
})();
