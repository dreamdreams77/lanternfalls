/* Lanternfall - graphics pass 6: squash and stretch, reactive foliage, ambient creatures, iris room transitions, boss letterbox, richer title sky */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, S = LF.Sprites, T = LF.T, W = LF.W, H = LF.H, FXV = LF.FX = LF.FX || { bloom: true, weather: true };
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = LF.clamp;
  const soft = (() => { const c = cv(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })();
  const tint = {}; // coloured copies of the soft glow, made on demand
  const glow = col => tint[col] || (tint[col] = (() => { const c = cv(32, 32), g = c.getContext('2d'); g.drawImage(soft, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 32, 32); return c; })());

  /* ---------- squash and stretch: the body answers every jump, fall, landing and dash ---------- */
  const simO = G.simulate;
  G.simulate = function (dt) {
    const pl = this.player, vy0 = pl.vy, was = pl.onGround, stop = this.hitstopT > 0;
    simO.call(this, dt);
    if (stop || this.state !== 'play') return;
    if (pl.onGround && !was && vy0 > 120) { pl._sq = .16; pl._sqk = clamp(vy0 / 380, .35, 1); this.burst(pl.cx, pl.y + pl.h, 4 + Math.round(pl._sqk * 4), '#c9b8e8', 50, 1); }
    pl._sq = Math.max(0, (pl._sq || 0) - dt);
    let tx = 1, ty = 1;
    if (pl._sq > 0) { const k = pl._sq / .16 * pl._sqk; tx = 1 + .2 * k; ty = 1 - .22 * k; }
    else if (pl.dashT > 0) { tx = 1.14; ty = .9; }
    else if (!pl.onGround && pl.vy < -120) { tx = .92; ty = 1.12; }
    else if (!pl.onGround && pl.vy > 220) { tx = .94; ty = 1.08; }
    const a = Math.min(1, dt * 22); pl._sx = (pl._sx || 1) + (tx - (pl._sx || 1)) * a; pl._sy = (pl._sy || 1) + (ty - (pl._sy || 1)) * a;
  };
  const dpO = S.drawPlayer;
  S.drawPlayer = function (g, pl, cam, t) {
    const sx = pl._sx || 1, sy = pl._sy || 1;
    if (pl.dead || (Math.abs(sx - 1) < .015 && Math.abs(sy - 1) < .015)) return dpO.call(this, g, pl, cam, t);
    const cx = Math.round(pl.x + pl.w / 2 - cam.x), by = Math.round(pl.y + pl.h - cam.y);
    g.save(); g.translate(cx, by); g.scale(sx, sy); g.translate(-cx, -by); dpO.call(this, g, pl, cam, t); g.restore();
  };

  /* ---------- reactive foliage: blades bend away from you and sway in the wind ---------- */
  const BLADE = { moss: 1, glim: 1, drown: 1 };
  function foliage(g, cam, t, room) {
    if (!BLADE[room.area]) return;
    const pl = G.player, P = LF.PAL[room.area], c0 = P.top[0], c1 = P.top[1];
    const tx0 = Math.max(0, Math.floor((pl.cx - 72) / T)), tx1 = Math.min(room.w - 1, Math.floor((pl.cx + 72) / T)), tyc = Math.floor(pl.cy / T);
    for (let ty = Math.max(1, tyc - 3); ty <= Math.min(room.h - 1, tyc + 4); ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = room.grid[ty][tx], up = room.grid[ty - 1][tx];
      if (!LF.Phys.solid(ch) || LF.Phys.solid(up) || up === 'w' || up === '=' ) continue;
      for (let k = 0; k < 3; k++) {
        const bx = tx * T + 3 + k * 5 + ((tx * 7 + k * 3) % 3), by = ty * T, hgt = 3 + ((tx * 5 + k * 11 + ty) % 3), dx = bx - pl.cx, dy = Math.abs(pl.cy + 6 - by);
        let bend = Math.sin(t * 1.7 + bx * .21) * .9;
        if (Math.abs(dx) < 26 && dy < 22) bend += Math.sign(dx || 1) * (1 - Math.abs(dx) / 26) * (1.5 + Math.min(2, Math.abs(pl.vx) / 40));
        const sx = bx - cam.x, sy = by - cam.y;
        if (sx < -4 || sx > W + 4) continue;
        for (let i = 0; i < hgt; i++) R(g, i === hgt - 1 ? c1 : c0, sx + bend * Math.pow(i / hgt, 1.6) * 2, sy - 1 - i, 1, 1);
      }
    }
  }
  const diO = G.drawItems;
  G.drawItems = function (g, cam, t, lights) { diO.call(this, g, cam, t, lights); if (this.room && this.player) foliage(g, cam, t, this.room); };

  /* ---------- ambient creatures: fireflies, spore lights, glow-fish; they shy away from you ---------- */
  const CRIT = { moss: ['#d8ff7a', 9, 1], glim: ['#7ad8ff', 8, 0], drown: ['#c8fff0', 7, 2] };
  let critRoom = null, crit = [];
  function critInit(room) {
    critRoom = room.id; crit = []; const c = CRIT[room.area]; if (!c) return;
    const cam = G.cam; for (let i = 0; i < c[1]; i++) crit.push({ x: cam.x + rnd(0, W), y: cam.y + rnd(20, H - 20), vx: 0, vy: 0, ph: rnd(0, 6), s: rnd(.6, 1.2) });
  }
  function critStep(dt) {
    const room = G.room, pl = G.player; if (critRoom !== room.id) critInit(room);
    const c = CRIT[room.area]; if (!c) return; const cam = G.cam, t = G.clock;
    for (const m of crit) {
      m.ph += dt * m.s;
      let ax = Math.sin(m.ph * 1.3) * 14 + (c[2] === 2 ? 10 * m.s : 0), ay = Math.cos(m.ph * 1.1) * 10;
      const dx = m.x - pl.cx, dy = m.y - pl.cy, d = Math.hypot(dx, dy);
      if (d < 34) { const f = (1 - d / 34) * 160; ax += dx / (d || 1) * f; ay += dy / (d || 1) * f; }
      m.vx += (ax - m.vx) * Math.min(1, dt * 2); m.vy += (ay - m.vy) * Math.min(1, dt * 2);
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < cam.x - 30) m.x = cam.x + W + 20; else if (m.x > cam.x + W + 30) m.x = cam.x - 20;
      if (m.y < cam.y - 20) m.y = cam.y + H + 10; else if (m.y > cam.y + H + 20) m.y = cam.y - 10;
      const gy = G.tile(Math.floor(m.x / T), Math.floor(m.y / T)); if (LF.Phys.solid(gy)) { m.y -= 16; m.vy = -10; }
    }
  }
  function critDraw(g, cam) {
    const c = CRIT[G.room.area]; if (!c) return; const t = G.clock;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const m of crit) {
      const sx = Math.round(m.x - cam.x), sy = Math.round(m.y - cam.y), on = c[2] === 1 ? 1 : (c[2] === 0 ? .6 + .4 * Math.sin(m.ph * 3) : 1), blink = c[2] === 1 ? Math.max(0, Math.sin(m.ph * 2.6)) : 1;
      if (sx < -6 || sx > W + 6 || sy < -6 || sy > H + 6) continue;
      g.globalAlpha = .55 * blink * on; g.drawImage(glow(c[0]), sx - 6, sy - 6, 12, 12);
      g.globalAlpha = .95 * blink * on; R(g, c[0], sx, sy, 1, 1);
      if (c[2] === 2) { g.globalAlpha = .5 * on; R(g, c[0], sx - Math.sign(m.vx || 1) * 2, sy, 2, 1); }
    }
    g.restore();
  }
  const dlO = G.drawLighting;
  G.drawLighting = function (g, cam, lights, room, P) {
    dlO.call(this, g, cam, lights, room, P);
    if (FXV.weather) { try { critDraw(g, cam); } catch (e) { FXV.weather = false; console.warn('fx4 disabled', e); } }
  };

  /* ---------- boss letterbox ---------- */
  G.cine = null;
  const biO = G.bossIntro;
  G.bossIntro = function (b) { this.cine = { t: 0, max: 2.6 }; return biO.apply(this, arguments); };
  const updO = G.update;
  G.update = function (dt) {
    updO.call(this, dt);
    if (this.cine) { this.cine.t += dt; if (this.cine.t > this.cine.max || this.state === 'dead') this.cine = null; }
    if (this.room && this.player && this.state === 'play' && this.hitstopT <= 0 && FXV.weather) critStep(dt);
  };
  const loadO = G.loadRoom;
  G.loadRoom = function () { const r = loadO.apply(this, arguments); critRoom = null; this.cine = null; return r; };

  /* ---------- render wrapper: iris transition between rooms, letterbox bars ---------- */
  const rO = G.render;
  G.render = function (g) {
    const iris = this.state === 'trans' && this.fade.a > 0 && this.fade.a < 1 ? this.fade.a : 0, saved = this.fade.a;
    if (iris) this.fade.a = 0;
    try { rO.call(this, g); } finally { this.fade.a = saved; }
    if (iris && this.player) {
      const cam = this.cam, pl = this.player, px = Math.round(pl.cx - cam.x), py = Math.round(pl.cy - cam.y), r = Math.pow(1 - iris, 1.4) * 230;
      g.save(); g.fillStyle = '#05030f'; g.beginPath(); g.rect(0, 0, W, H); if (r > 0) g.arc(px, py, r, 0, 6.2832, true); g.fill('evenodd');
      if (r > 3) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,190,110,' + (.45 * (1 - iris)).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, r, 0, 6.2832); g.stroke(); }
      g.restore();
    }
    const c = this.cine;
    if (c) {
      const inn = Math.min(1, c.t / .45), out = Math.min(1, Math.max(0, (c.max - c.t) / .5)), k = Math.min(inn, out) , hh = Math.round(22 * (1 - Math.pow(1 - k, 2)));
      R(g, '#05030f', 0, 0, W, hh); R(g, '#05030f', 0, H - hh, W, hh);
    }
  };

  /* ---------- title sky: moon, drifting haze, the odd shooting star ---------- */
  let star = null, starT = 4;
  const rtO = G.renderTitle;
  G.renderTitle = function (g, t) {
    rtO.call(this, g, t);
    const fa = 1 - Math.min(1, this.fade.a || 0); if (fa <= 0) return;
    g.save(); g.globalAlpha = fa; g.globalCompositeOperation = 'lighter';
    g.globalAlpha = fa * .5; g.drawImage(glow('#9aa8ff'), 28, 6, 70, 70);
    for (let i = 0; i < 4; i++) { const x = (((i * 97 - t * (6 + i * 2)) % (W + 160)) + (W + 160)) % (W + 160) - 80; g.globalAlpha = fa * .06; R(g, '#a89cff', x, 118 + i * 9 + Math.sin(t * .4 + i) * 2, 90 + i * 18, 6); }
    starT -= 1 / 60; if (starT <= 0 && !star) { star = { x: rnd(60, W), y: rnd(8, 40), t: 0 }; starT = rnd(5, 11); }
    if (star) { star.t += 1 / 60; const k = star.t / .7; if (k >= 1) star = null; else { for (let i = 0; i < 10; i++) { g.globalAlpha = fa * (1 - k) * (1 - i / 10) * .9; R(g, '#fff2c9', star.x - k * 70 + i * 2, star.y + k * 30 - i, 2, 1); } } }
    g.restore();
  };
})();
