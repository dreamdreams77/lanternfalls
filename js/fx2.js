/* Lanternfall - graphics pass 4: lamp-lit surfaces, water depth and caustics, chromatic hit fringe, dash streaks */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, FXV = LF.FX = LF.FX || { bloom: true, weather: true };
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const sc = cv(W, H), sg = sc.getContext('2d'), mk = cv(W, H), mg = mk.getContext('2d');
  const soft = (() => { const c = cv(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();

  /* ---------- lamp-lit surfaces: the baked rock is added back, warmed, wherever light falls ---------- */
  function relight(g, cam, lights, room) {
    const pl = G.player; if (!room.layer) return;
    mg.globalCompositeOperation = 'source-over'; mg.globalAlpha = 1; mg.clearRect(0, 0, W, H); mg.globalCompositeOperation = 'lighter';
    const add = (x, y, r, a) => { const sx = x - cam.x, sy = y - cam.y; if (sx < -r || sx > W + r || sy < -r || sy > H + r) return; mg.globalAlpha = Math.min(1, a); mg.drawImage(soft, sx - r, sy - r, r * 2, r * 2); };
    if (!pl.dead) add(pl.cx, pl.cy - 2, G.lightR * .95, 1);
    for (const l of lights) add(l.x, l.y, l.r * .85, (l.a || 1) * .7);
    sg.globalCompositeOperation = 'copy'; sg.globalAlpha = 1; sg.drawImage(room.layer, -Math.round(cam.x), -Math.round(cam.y));
    sg.globalCompositeOperation = 'destination-in'; sg.drawImage(mk, 0, 0);
    sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = 'rgba(255,176,96,.28)'; sg.fillRect(0, 0, W, H);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .55; g.drawImage(sc, 0, 0); g.restore();
  }

  /* ---------- chromatic fringe on heavy hits ---------- */
  G.caT = 0;
  const shakeO = G.shake;
  G.shake = function (n) { shakeO.call(this, n); if (n >= 5 && !(LF.settings && LF.settings.reduce)) this.caT = Math.max(this.caT, .2); };
  function fringe(g) {
    const k = Math.min(1, G.caT / .2); if (k <= 0 || !FXV.bloom) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'copy'; sg.globalAlpha = 1; sg.drawImage(g.canvas, 0, 0);
    for (const [col, dx] of [['#ff2a2a', 1], ['#2affff', -1]]) {
      mg.globalCompositeOperation = 'copy'; mg.globalAlpha = 1; mg.drawImage(sc, 0, 0);
      mg.globalCompositeOperation = 'multiply'; mg.fillStyle = col; mg.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = .3 * k; g.drawImage(mk, dx * (1 + (k > .6 ? 1 : 0)), 0);
    }
    g.restore();
  }

  /* ---------- dash streaks ---------- */
  function streaks(g, cam, pl) {
    if (pl.dashT <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const len = 10 + (i * 7) % 13, off = 10 + i * 6, y = pl.cy - cam.y + (i - 3) * 2.6;
      g.globalAlpha = .38 - i * .03; R(g, i % 2 ? '#ffd27a' : '#fff2c9', pl.cx - cam.x - pl.face * off - (pl.face > 0 ? len : 0), y, len, 1);
    }
    g.restore();
  }

  const dlO = G.drawLighting;
  G.drawLighting = function (g, cam, lights, room, P) {
    dlO.call(this, g, cam, lights, room, P);
    try {
      if (FXV.bloom) relight(g, cam, lights, room);
      streaks(g, cam, this.player);
      fringe(g);
    } catch (e) { FXV.bloom = false; console.warn('fx2 disabled', e); }
  };

  /* ---------- water: depth shading and caustics ---------- */
  const dwO = G.drawWater;
  G.drawWater = function (g, cam, t, room, P) {
    dwO.call(this, g, cam, t, room, P);
    if (!FXV.bloom) return;
    if (!room._wd) {
      const wd = room._wd = []; let any = false;
      for (let y = 0; y < room.h; y++) { const row = wd[y] = new Array(room.w).fill(0); for (let x = 0; x < room.w; x++) if (room.grid[y][x] === 'w') { any = true; row[x] = y > 0 && room.grid[y - 1][x] === 'w' ? wd[y - 1][x] + 1 : 1; } }
      room._hasWater = any;
    }
    if (!room._hasWater) return;
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(room.w - 1, Math.floor((cam.x + W) / T));
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(room.h - 1, Math.floor((cam.y + H) / T));
    const caus = (sx, sy, x, y, a) => {
      const ph = t * 1.6 + x * 1.7 + y * 2.3, ox = Math.round(Math.sin(ph) * 3 + 4), oy = Math.round(Math.cos(ph * .8) * 2 + 4);
      g.globalAlpha = a * (.6 + .4 * Math.sin(ph * 2)); R(g, '#c8fff0', sx + ox, sy + oy, 3, 1); R(g, '#c8fff0', sx + ox + 1 + (x & 1) * 5, sy + oy + 4, 2, 1);
    };
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ch = room.grid[y][x], sx = x * T - cam.x, sy = y * T - cam.y;
      if (ch === 'w') { if (room._wd[y][x] <= 6) caus(sx, sy, x, y, .16); }
      else if (y > 0 && room.grid[y - 1][x] === 'w' && LF.Phys.solid(ch)) caus(sx, sy - 3, x, y, .3);
    }
    g.restore(); g.globalCompositeOperation = 'source-over';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (room.grid[y][x] !== 'w') continue; const d = room._wd[y][x]; if (d < 2) continue;
      g.globalAlpha = Math.min(.3, d * .028); R(g, '#02121c', x * T - cam.x, y * T - cam.y, T, T);
    }
    g.globalAlpha = 1;
  };

  const updO = G.update;
  G.update = function (dt) { updO.call(this, dt); if (this.caT > 0) this.caT = Math.max(0, this.caT - dt); };
})();
