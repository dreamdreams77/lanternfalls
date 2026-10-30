/* Lanternfall - boot, fixed-timestep loop, scaling, error handling */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, In = LF.input;
  LF.state = 'boot';
  const cv = document.getElementById('game'), g = cv.getContext('2d'), stage = document.getElementById('stage');
  g.imageSmoothingEnabled = false;

  /* ---------- scaling: keep 16:9, scale the 960x540 stage to fit ---------- */
  // Screen setting: 'fit' letterboxes as-is; 'rotate' turns the stage sideways on a portrait screen so the game
  // fills the phone when it is held in landscape with rotation lock on (no browser support needed).
  const rot = document.createElement('div');
  rot.style.cssText = 'position:fixed;left:0;right:0;top:0;padding:8px 34px 8px 8px;text-align:center;background:#241c46;color:#ffd27a;font:700 13px sans-serif;letter-spacing:.08em;z-index:200;display:none;cursor:pointer;line-height:1.5';
  rot.innerHTML = 'Rotate your device for a bigger view<br><u>or tap here to turn the game sideways</u><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:18px">&times;</span>';
  let rotHidden = false;
  rot.addEventListener('click', e => {
    if (e.target.tagName !== 'SPAN') { LF.settings.view = 'rotate'; LF.settings.viewSet = true; LF.saveSettings(); } else rotHidden = true;
    resize();
  });
  document.body.appendChild(rot);
  // Display canvas: the 320x180 game canvas is upscaled by a whole-number factor (crisp, even pixels),
  // then the browser smooths the remaining fractional scale. This removes pixel shimmer while scrolling.
  const view = document.createElement('canvas'), vg = view.getContext('2d');
  view.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:auto';
  stage.insertBefore(view, cv); cv.style.display = 'none';
  LF.view = view;
  let vk = 0;
  function sizeView(s) {
    const k = Math.max(2, Math.min(6, Math.ceil(3 * s * (window.devicePixelRatio || 1) - .001)));
    if (k !== vk) { vk = k; view.width = 320 * k; view.height = 180 * k; vg.imageSmoothingEnabled = false; }
  }
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight, st = LF.settings || {};
    // screen mode: 'auto' (default) turns the stage sideways on a portrait touch device so it fills the phone; FIT and ROTATE are explicit choices
    const mode = st.viewSet ? st.view : 'auto';
    const portrait = vh > vw * 1.15, turned = LF.rotated = (mode === 'rotate' || (mode === 'auto' && LF.touchDetected)) && vh > vw;
    const s = turned ? Math.min(vh / 960, vw / 540) : Math.min(vw / 960, vh / 540);
    sizeView(s);
    stage.style.transform = 'translate(-50%,-50%)' + (turned ? ' rotate(90deg)' : '') + ' scale(' + s + ')';
    document.documentElement.style.setProperty('--u', '18px');
    rot.style.display = (portrait && !turned && !rotHidden && LF.touchDetected) ? 'block' : 'none';
  }
  LF.resize = resize;
  // map a screen point to 320x180 game pixels, also when the stage is turned sideways
  LF.toGame = function (cx, cy) {
    const r = view.getBoundingClientRect();
    if (LF.rotated) return { x: (cy - r.top) / r.height * 320, y: (r.right - cx) / r.width * 180 };
    return { x: (cx - r.left) / r.width * 320, y: (cy - r.top) / r.height * 180 };
  };
  // optional fullscreen; also asks for landscape where the browser allows it (Android Chrome)
  LF.canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  LF.isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  LF.toggleFullscreen = function () {
    const d = document, el = d.documentElement;
    try {
      if (LF.isFullscreen()) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (_) {} };
      if (p && p.then) p.then(lock, () => {}); else lock();
    } catch (_) {}
  };
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);
  document.addEventListener('fullscreenchange', resize); window.addEventListener('touchstart', () => setTimeout(resize, 0), { passive: true, once: true });

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
  LF.loadSettings(); resize(); LF.initTouch(); resize(); LF.UI.init(); // size again once touch is known, so AUTO turns a phone's first screen too
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
      while (acc >= STEP && n < 5) {
        // keep presses made during hit-stop alive until the simulation actually runs again
        const frozen = LF.state === 'play' && G.hitstopT > 0;
        G.update(STEP); if (!frozen) In.endFrame(); acc -= STEP; n++;
      }
      if (n === 5) acc = 0;
      LF.alpha = acc / STEP;
      if (LF.state === 'mini' && LF.Arcade) LF.Arcade.render(g); else if (LF.state === 'title' || !G.room) G.renderTitle(g, G.clock); else G.render(g);
      vg.drawImage(cv, 0, 0, view.width, view.height);
    } catch (e) { fatal(e); }
  }
  requestAnimationFrame(t => { last = t; frame(t); });
})();
