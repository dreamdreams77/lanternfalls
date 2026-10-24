/* Lanternfall - graphics pass 5: heat and water shimmer, anamorphic light streaks, light pools on the ground */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, FXV = LF.FX = LF.FX || { bloom: true, weather: true };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const fc = cv(W, H), fg = fc.getContext('2d');
  const mkSprite = (w, h, draw) => { const c = cv(w, h), g = c.getContext('2d'); draw(g); return c; };
  const streak = mkSprite(64, 4, g => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,220,160,0)'); gr.addColorStop(.5, 'rgba(255,240,210,1)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 1, 64, 2); g.globalAlpha = .4; g.fillRect(0, 0, 64, 4); });
  const pool = mkSprite(48, 8, g => { const gr = g.createRadialGradient(24, 4, 0, 24, 4, 24); gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.save(); g.scale(1, .3); g.translate(0, 9.5); g.fillStyle = gr; g.fillRect(0, -10, 48, 40); g.restore(); });
  const SHIMMER = { spire: [1, 5.5, 1.3], drown: [1, 3.2, .9], storm: [0, 0, 0] };

  /* ---------- screen-space shimmer: horizontal strips nudged by a travelling sine ---------- */
  function shimmer(g, t, area) {
    const fr = G.flareRing, c = SHIMMER[area];
    if ((!c || !c[0]) && !fr) return;
    const amp = c && c[0] ? 1 : 0, kf = c ? c[1] : 0, sp = c ? c[2] : 0;
    fg.globalCompositeOperation = 'copy'; fg.drawImage(g.canvas, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const cx = G.cam.x, cy = G.cam.y;
    for (let y = 0; y < H; y += 2) {
      let o = amp ? Math.round(Math.sin(y * .21 + t * kf) * amp * (area === 'drown' ? .8 : 1) * (.5 + .5 * Math.sin(y * .05 + t * sp))) : 0;
      if (fr) { const d = Math.abs(y + cy - fr.y), band = fr.r * (1 - (1 - Math.min(1, fr.t / .4)) * (1 - Math.min(1, fr.t / .4))); if (Math.abs(d - band * .5) < 10) o += Math.round(Math.sin(y * .7) * 2 * (1 - fr.t / .5)); }
      if (o) g.drawImage(fc, 0, y, W, 2, o, y, W, 2);
    }
    g.restore();
  }

  /* ---------- anamorphic streaks through strong lights, plus a light pool under the player ---------- */
  function groundBelow(x, y) {
    const tx = Math.floor(x / T), ty0 = Math.floor(y / T);
    for (let ty = ty0; ty < ty0 + 6; ty++) { const c = G.tile(tx, ty); if (LF.Phys.solid(c) || c === '=' || c === 'c') return ty * T; }
    return null;
  }
  function glints(g, cam, lights) {
    const pl = G.player; g.save(); g.globalCompositeOperation = 'lighter';
    const st = (x, y, w, a) => { const sx = x - cam.x, sy = y - cam.y; if (sx < -w || sx > W + w || sy < -4 || sy > H + 4) return; g.globalAlpha = a; g.drawImage(streak, Math.round(sx - w / 2), Math.round(sy - 2), w, 4); };
    for (const l of lights) if (l.r >= 30 && (l.a || 1) >= .6) st(l.x, l.y, l.r * 2.6, Math.min(.5, .2 * (l.a || 1)));
    if (!pl.dead) {
      const gy = groundBelow(pl.cx, pl.y + pl.h - 1);
      if (gy != null && gy - (pl.y + pl.h) < 14) { const w = G.lightR * .9, k = 1 - Math.max(0, gy - (pl.y + pl.h)) / 14; g.globalAlpha = .55 * k * (1 + Math.sin(G.clock * 11) * .05); g.drawImage(pool, Math.round(pl.cx - cam.x - w / 2), Math.round(gy - cam.y - 3), w, 6); }
    }
    g.restore();
  }

  const dlO = G.drawLighting;
  G.drawLighting = function (g, cam, lights, room, P) {
    dlO.call(this, g, cam, lights, room, P);
    if (!FXV.bloom) return;
    try { glints(g, cam, lights); if (!(LF.settings && LF.settings.reduce)) shimmer(g, this.clock, room.area); }
    catch (e) { FXV.bloom = false; console.warn('fx3 disabled', e); }
  };
})();
