/* Lanternfall - visual effects: bloom, colour grading, weather, light shafts, ground fog, shadows, foreground silhouettes, damage text, HUD extras */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, S = LF.Sprites;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FXV = LF.FX = LF.FX || { bloom: true, weather: true };

  /* ---------- glow sprite cache ---------- */
  const glows = {};
  function glow(col) {
    if (glows[col]) return glows[col];
    const c = cv(48, 48), g = c.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, col); gr.addColorStop(.4, col + '66'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return glows[col] = c;
  }

  /* ---------- bloom: downsample, square (keeps only bright areas), blur, add back ---------- */
  const bA = cv(80, 45), bB = cv(80, 45), bC = cv(40, 23), ga = bA.getContext('2d'), gb = bB.getContext('2d'), gc = bC.getContext('2d');
  [ga, gb, gc].forEach(c => { c.imageSmoothingEnabled = true; });
  function bloom(g, k) {
    if (!FXV.bloom) return;
    try {
      ga.globalCompositeOperation = 'copy'; ga.drawImage(g.canvas, 0, 0, 80, 45);
      gb.globalCompositeOperation = 'copy'; gb.drawImage(bA, 0, 0);
      gb.globalCompositeOperation = 'multiply'; gb.drawImage(bA, 0, 0); gb.drawImage(bA, 0, 0);
      gc.globalCompositeOperation = 'copy'; gc.drawImage(bB, 0, 0, 40, 23);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter';
      g.globalAlpha = k; g.drawImage(bC, 0, 0, W, H); g.globalAlpha = k * .6; g.drawImage(bB, 0, 0, W, H);
      g.restore(); g.imageSmoothingEnabled = false;
    } catch (_) { FXV.bloom = false; }
  }

  /* ---------- colour grade per region ---------- */
  const GRADE = { moss: ['#3a2a8a', '#ff9a5a', .2], glim: ['#2a6aff', '#c04aff', .22], drown: ['#0a8a9a', '#2aa88a', .22], spire: ['#7a1a3a', '#ff7a2a', .26], storm: ['#1a3a9a', '#5a7ac8', .3], snow: ['#3a5aaa', '#e4efff', .22] };
  function grade(g, area) {
    const c = GRADE[area]; if (!c) return;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = c[2]; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  }

  /* ---------- weather / ambient particles (screen space) ---------- */
  const P = [], MAXP = 260;
  const LEAF = ['#68c262', '#a6e684', '#e0a050', '#f0a06a'], SPARK = ['#7ad8ff', '#d4f4ff', '#c49bff'], ASH = ['#ff9a3c', '#ffd27a', '#ff5a2a'];
  function spawn(area, dt, tod) {
    if (P.length > MAXP) return;
    const n = (x) => Math.random() < x * dt * 60;
    if (area === 'moss') {
      if (n(.035)) P.push({ k: 'leaf', x: rnd(0, W + 60), y: -4, vx: -rnd(8, 22), vy: rnd(8, 16), ph: rnd(0, 6), c: LEAF[(Math.random() * 4) | 0], life: 18 });
      const ri = Math.min(1, Math.max(0, (tod - .22) * 2.6));
      if (ri > 0) for (let i = 0; i < 3; i++) if (n(ri * .7)) P.push({ k: 'rain', x: rnd(0, W + 40), y: -6, vx: -34, vy: rnd(170, 210), life: 1.5 });
    } else if (area === 'glim') {
      if (n(.05)) P.push({ k: 'star', x: rnd(0, W), y: rnd(0, H), vx: rnd(-3, 3), vy: rnd(-3, 3), c: SPARK[(Math.random() * 3) | 0], life: rnd(2, 4.5), max: 4.5 });
    } else if (area === 'drown') {
      if (n(.06)) P.push({ k: 'bubble', x: rnd(0, W), y: H + 3, vx: 0, vy: -rnd(9, 22), ph: rnd(0, 6), life: 16, s: Math.random() < .3 ? 3 : 2 });
    } else if (area === 'storm') {
      for (let i = 0; i < 5; i++) if (n(.9)) P.push({ k: 'rain', x: rnd(0, W + 80), y: -6, vx: -60 - (G.gust || 0) * 50, vy: rnd(230, 300), life: 1.2 });
      if (G.gust && n(.5)) P.push({ k: 'streak', x: G.gust > 0 ? -20 : W + 20, y: rnd(0, H), vx: G.gust * rnd(260, 380), vy: rnd(-6, 6), life: 1.6, len: rnd(18, 40) });
    } else if (area === 'snow') {
      const bl = G.blizzard > 0 ? 3.2 : 1;
      for (let i = 0; i < (bl > 1 ? 3 : 1); i++) if (n(.22 * bl)) P.push({ k: 'flake', x: rnd(-20, W + 60), y: -4, vx: -rnd(4, 14) * bl, vy: rnd(14, 30) * (bl > 1 ? 1.5 : 1), ph: rnd(0, 6), s: Math.random() < .25 ? 2 : 1, life: 12 });
    } else if (area === 'spire') {
      if (n(.09)) P.push({ k: 'ash', x: rnd(0, W), y: H + 3, vx: rnd(-8, 4), vy: -rnd(10, 32), ph: rnd(0, 6), c: ASH[(Math.random() * 3) | 0], life: 12 });
      if (n(.012)) P.push({ k: 'streak', x: W + 10, y: rnd(0, H), vx: -rnd(150, 230), vy: rnd(-4, 4), life: 2, len: rnd(14, 30) });
    }
  }
  function stepP(dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.ph != null) { p.ph += dt * 2; if (p.k === 'leaf') p.y += Math.sin(p.ph * 1.4) * 8 * dt; else p.x += Math.sin(p.ph) * 6 * dt; }
      if (p.life <= 0 || p.y > H + 8 || p.y < -10 || p.x < -40 || p.x > W + 60) { P[i] = P[P.length - 1]; P.pop(); }
    }
  }
  function drawP(g, t) {
    for (const p of P) {
      switch (p.k) {
        case 'leaf': g.globalAlpha = .8; R(g, p.c, p.x, p.y, 2, 1); R(g, p.c, p.x + (Math.sin(p.ph * 3) > 0 ? 1 : 0), p.y + 1, 1, 1); break;
        case 'rain': g.globalAlpha = .3; R(g, '#a8c8ff', p.x, p.y, 1, 3); R(g, '#a8c8ff', p.x + 1, p.y + 3, 1, 2); break;
        case 'star': { const a = Math.sin(Math.max(0, p.life) / p.max * 3.1416); g.globalAlpha = a * .9; R(g, p.c, p.x, p.y, 1, 1); if (a > .6) { g.globalAlpha = a * .5; R(g, p.c, p.x - 1, p.y, 3, 1); R(g, p.c, p.x, p.y - 1, 1, 3); } break; }
        case 'bubble': g.globalAlpha = .5; R(g, '#c8fff0', p.x + 1, p.y, p.s - 2, 1); R(g, '#c8fff0', p.x, p.y + 1, 1, p.s - 2); R(g, '#c8fff0', p.x + p.s - 1, p.y + 1, 1, p.s - 2); R(g, '#c8fff0', p.x + 1, p.y + p.s - 1, p.s - 2, 1); break;
        case 'ash': g.globalAlpha = .55 + .4 * Math.sin(p.ph * 4); R(g, p.c, p.x, p.y, 1, 1); g.globalAlpha *= .3; R(g, p.c, p.x - 1, p.y - 1, 3, 3); break;
        case 'flake': g.globalAlpha = .9; R(g, '#ffffff', p.x, p.y, p.s, p.s); if (p.s > 1) { g.globalAlpha = .4; R(g, '#cfe8ff', p.x - 1, p.y, 4, 1); R(g, '#cfe8ff', p.x, p.y - 1, 1, 4); } break;
        case 'streak': g.globalAlpha = .1; R(g, '#ffe2c0', p.x, p.y, p.len, 1); break;
      }
    }
    g.globalAlpha = 1;
  }

  /* ---------- light shafts (moss by day, teal beams underwater) ---------- */
  function shafts(g, cam, t, area, tod) {
    let col, a, n = 4;
    if (area === 'moss') { col = '#ffd8a0'; a = .05 * (1 - tod * 1.6); } else if (area === 'drown') { col = '#9af0d8'; a = .05; } else if (area === 'glim') { col = '#7ad8ff'; a = .035; n = 3; } else return;
    if (a <= .002) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const bx = ((i * 97 + 20 - cam.x * .28 + Math.sin(t * .25 + i) * 6) % (W + 120) + (W + 120)) % (W + 120) - 40;
      g.globalAlpha = a * (.7 + .3 * Math.sin(t * .6 + i * 2)); g.fillStyle = col;
      g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + 16 + i * 3, 0); g.lineTo(bx + 62 + i * 6, H); g.lineTo(bx + 30, H); g.closePath(); g.fill();
    }
    g.restore();
  }

  /* ---------- ground fog (drawn before the darkness layer so it sinks into it) ---------- */
  const origDrawWater = G.drawWater;
  G.drawWater = function (g, cam, t, room, Pal) {
    origDrawWater.call(this, g, cam, t, room, Pal);
    const col = Pal.fog;
    const gr = g.createLinearGradient(0, H - 64, 0, H); gr.addColorStop(0, col + '00'); gr.addColorStop(1, col + '40');
    g.fillStyle = gr; g.fillRect(0, H - 64, W, 64);
    g.globalAlpha = .1;
    for (let i = 0; i < 7; i++) { const x = (((i * 71 - t * (4 + i * 1.3) - cam.x * (.3 + i * .05)) % (W + 80)) + (W + 80)) % (W + 80) - 40; R(g, col, x, H - 14 - i * 5 + Math.sin(t * .5 + i) * 2, 44 + i * 6, 3); }
    g.globalAlpha = 1;
  };

  /* ---------- foreground silhouettes (top edge, faster parallax than the world) ---------- */
  const FG = Array.from({ length: 16 }, (_, i) => ({ x: i * 37 + (i * 13) % 17, h: 5 + (i * 7) % 9, s: i * 1.7 }));
  function fgSil(g, cam, t, area) {
    if (area === 'spire' || area === 'storm' || area === 'snow') return;
    const col = area === 'glim' ? '#07051a' : area === 'drown' ? '#03121a' : '#0a0716';
    const span = 16 * 37 + 20;
    g.globalAlpha = .92;
    for (const f of FG) {
      const sx = (((f.x - cam.x * 1.35) % span) + span) % span - 30; if (sx > W + 10) continue;
      if (area === 'glim') { for (let k = 0; k < f.h; k++) R(g, col, sx - Math.max(0, 3 - k * .6) | 0, k, Math.max(1, 7 - k) | 0, 1); }
      else { const sw = Math.sin(t * 1.1 + f.s) * 1.5; for (let k = 0; k < f.h + 4; k++) R(g, col, sx + sw * k / 8, k, 1, 1); R(g, col, sx + sw * (f.h + 3) / 8 - 1, f.h + 2, 3, 2); if (f.h > 8) { R(g, col, sx + 2, 0, 1, 5); R(g, col, sx + 3, 4, 2, 1); } }
    }
    g.globalAlpha = 1;
  }

  /* ---------- entity shadows ---------- */
  function groundY(x, y) {
    const tx = Math.floor(x / T), ty0 = Math.floor(y / T);
    for (let ty = ty0; ty < ty0 + 9; ty++) { const c = G.tile(tx, ty); if (LF.Phys.solid(c) || c === '=' || c === 'c') return ty * T; }
    return null;
  }
  function shadow(g, cam, cx, bottom, w) {
    const gy = groundY(cx, bottom - 1); if (gy == null) return;
    const d = gy - bottom; if (d < -2 || d > 56) return;
    const k = Math.max(0, 1 - Math.max(0, d) / 56), ww = Math.max(3, Math.round(w * (.6 + .4 * k))), sx = cx - cam.x - ww / 2, sy = gy - cam.y;
    g.globalAlpha = .38 * k; R(g, '#000', sx, sy - 1, ww, 1); R(g, '#000', sx + 1, sy, ww - 2, 1); g.globalAlpha = 1;
  }
  const dpO = S.drawPlayer;
  S.drawPlayer = function (g, pl, cam, t) {
    if (G.room && !pl.dead) shadow(g, cam, pl.cx, pl.y + pl.h, 11);
    dpO.call(this, g, pl, cam, t);
    for (const b of G.bolts) {
      const x = b.x - cam.x, y = b.y - cam.y;
      g.globalAlpha = .4; R(g, b.col, x - b.vx * .02, y + 1, b.w, b.h - 2); g.globalAlpha = 1;
      R(g, b.col, x - 1, y - 1, b.w + 2, b.h + 2); R(g, '#fff', x + 1, y + 1, b.w - 2, b.h - 2);
    }
  };
  const deO = S.drawEnemy;
  S.drawEnemy = function (g, e, cam, t) {
    const x = e.x - cam.x, y = e.y - cam.y;
    if (!e.d.fly || e.d.still) shadow(g, cam, e.x + e.w / 2, e.y + e.h, e.w);
    const el = e.affix && LF.ELITE[e.affix];
    if (el) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .45 + .2 * Math.sin(t * 5 + e.ph); g.drawImage(glow(el[1]), x - 10, y - 10, e.w + 20, e.h + 20); g.restore(); }
    deO.call(this, g, e, cam, t);
    if (el) {
      const mx = Math.round(x + e.w / 2), my = Math.round(y - 9 + Math.sin(t * 4 + e.ph));
      R(g, '#05030f', mx - 3, my - 1, 7, 5); R(g, el[1], mx, my - 1, 1, 1); R(g, el[1], mx - 1, my, 3, 1); R(g, '#fff2c9', mx, my, 1, 1); R(g, el[1], mx - 2, my + 1, 5, 1); R(g, el[1], mx - 1, my + 2, 3, 1); R(g, el[1], mx, my + 3, 1, 1);
    }
    if (e.maxHp >= 4 && e.hp < e.maxHp) { const bx = Math.round(x), by = Math.round(y - 4); R(g, '#05030f', bx - 1, by - 1, e.w + 2, 4); R(g, '#3a1a2c', bx, by, e.w, 2); R(g, '#e0486a', bx, by, Math.max(1, Math.round(e.w * e.hp / e.maxHp)), 2); }
  };

  /* ---------- lighting wrapper: extra lights, then post effects ---------- */
  const dlO = G.drawLighting, vig = (() => { const c = cv(W, H), g = c.getContext('2d'), gr = g.createRadialGradient(W / 2, H / 2, H * .32, W / 2, H / 2, W * .62); gr.addColorStop(0, 'rgba(255,20,50,0)'); gr.addColorStop(1, 'rgba(255,20,50,.55)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return c; })();
  G.drawLighting = function (g, cam, lights, room, Pal) {
    for (const b of this.bolts) lights.push({ x: b.x + 2, y: b.y + 2, r: b.perfect ? 34 : 22, c: b.col.length === 7 ? b.col : '#ffb860', a: .9 });
    const fr = this.flareRing; if (fr) lights.push({ x: fr.x, y: fr.y, r: fr.r * 2.2 * (1 - fr.t), c: '#ffd27a', a: 1 });
    dlO.call(this, g, cam, lights, room, Pal);
    const t = this.clock, area = room.area;
    shafts(g, cam, t, area, this.tod || 0);
    if (FXV.weather) drawP(g, t);
    grade(g, area);
    bloom(g, .42);
    if (FXV.weather) fgSil(g, cam, t, area);
    if (this._prompt) { LF.drawText(g, this._prompt.label, this._prompt.x, this._prompt.y, '#ffd27a', 'center'); this._prompt = null; }
    // flare shockwave ring
    if (fr) { const k = Math.min(1, fr.t / .4), r = fr.r * (1 - (1 - k) * (1 - k)); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, 1 - fr.t / .5); g.strokeStyle = '#ffd27a'; g.lineWidth = 2; g.beginPath(); g.arc(Math.round(fr.x - cam.x), Math.round(fr.y - cam.y), r, 0, 6.2832); g.stroke(); g.lineWidth = 1; g.strokeStyle = '#fff2c9'; g.beginPath(); g.arc(Math.round(fr.x - cam.x), Math.round(fr.y - cam.y), r * .85, 0, 6.2832); g.stroke(); g.restore(); }
    // damage / chain text
    for (const tx of this.texts) {
      g.globalAlpha = Math.max(0, Math.min(1, (tx.max - tx.t) / .3));
      LF.drawText(g, tx.s, Math.round(tx.x - cam.x), Math.round(tx.y - cam.y - tx.t * (tx.big ? 14 : 22)), tx.col, 'center');
    }
    g.globalAlpha = 1;
    // low-health warning
    if (this.save && this.save.hp <= 1 && this.state === 'play') { g.globalAlpha = .35 + .25 * Math.sin(t * 6); g.drawImage(vig, 0, 0); g.globalAlpha = 1; }
  };

  /* ---------- HUD extras: flare gauge + chain counter ---------- */
  const hudO = G.drawHUD;
  G.drawHUD = function (g) {
    hudO.call(this, g);
    if (!this.save || this.state === 'dead') return;
    const cost = this.flareCost ? this.flareCost() : 50, f = this.flare, ready = f >= cost, full = f >= 99.5, t = this.clock;
    R(g, '#05030f', 7, 30, 44, 6); R(g, '#2a1f3a', 8, 31, 42, 4);
    R(g, full ? '#fff2c9' : ready ? (Math.sin(t * 10) > 0 ? '#ffd27a' : '#ffb23a') : '#b0642a', 8, 31, Math.round(42 * f / 100), 4);
    R(g, '#05030f', 8 + Math.round(42 * cost / 100), 30, 1, 6);
    if (ready) LF.drawText(g, LF.input.lastDevice === 'touch' ? 'FLARE' : 'FLARE [V]', 54, 36, '#ffd27a');
    if (this.chain >= 2) { LF.drawText(g, 'x' + this.chain + ' CHAIN', W - 8, 26, this.chain >= 5 ? '#ff9a3c' : '#ffd27a', 'right'); R(g, '#05030f', W - 40, 29, 32, 3); R(g, '#ffd27a', W - 39, 30, Math.round(30 * this.chainT / 3.2), 1); }
  };

  /* ---------- per-frame update: ambient particles + player's rising embers ---------- */
  let emberT = 0;
  const updO = G.update;
  G.update = function (dt) {
    updO.call(this, dt);
    if (!this.room || LF.state === 'title') { P.length = 0; return; }
    if (LF.state === 'paused' || LF.state === 'shop' || LF.state === 'dialog') return;
    spawn(this.room.area, dt, this.tod || 0); stepP(dt);
    if (this.state === 'play' && this.hitstopT <= 0) {
      const pl = this.player; emberT -= dt;
      if (pl && !pl.dead && emberT <= 0) { emberT = .09 + Math.random() * .1; this.spark(pl.cx + rnd(-3, 3), pl.y + 3, Math.random() < .5 ? '#ffb860' : '#ffd27a', -rnd(14, 26)); if (this.flare >= 50 && Math.random() < .5) this.spark(pl.cx + rnd(-5, 5), pl.cy + rnd(-4, 4), '#fff2c9', -rnd(10, 20)); }
    }
  };

  /* ---------- title screen: bloom + grade ---------- */
  const rtO = G.renderTitle;
  G.renderTitle = function (g, t) { rtO.call(this, g, t); grade(g, 'moss'); bloom(g, .5); };
})();

/* ---------- smoothness: render interpolation, camera snapping, adaptive quality ---------- */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, FXV = LF.FX;
  const rec = o => { o._px = o.x; o._py = o.y; };
  const updO = G.update;
  G.update = function (dt) {
    if (this.state === 'play' && this.room && this.player) {
      rec(this.player); this.enemies.forEach(rec); this.drops.forEach(rec); this.projectiles.forEach(rec); this.bolts.forEach(rec); if (this.shots) this.shots.forEach(rec);
      this.cam._px = this.cam.x; this.cam._py = this.cam.y;
    }
    updO.call(this, dt);
  };
  let last = 0, ema = 16.7, frames = 0, level = 0;
  const rO = G.render;
  G.render = function (g) {
    const now = performance.now(), d = now - last; last = now;
    if (d < 100) { ema += (d - ema) * .05; if (++frames > 150 && ema > 25 && level < 2) { level++; frames = 0; if (level === 1) FXV.bloom = false; else FXV.weather = false; } }
    const cam = this.cam, a = Math.min(1, Math.max(0, LF.alpha || 0)), saved = [], cx = cam.x, cy = cam.y;
    const lerp = o => {
      if (o._px === undefined) return; const x = o.x, y = o.y;
      if (Math.abs(x - o._px) < 40 && Math.abs(y - o._py) < 40) { saved.push(o, x, y); o.x = o._px + (x - o._px) * a; o.y = o._py + (y - o._py) * a; }
    };
    if (this.state === 'play' && this.room && this.player) {
      lerp(this.player); this.enemies.forEach(lerp); this.drops.forEach(lerp); this.projectiles.forEach(lerp); this.bolts.forEach(lerp); if (this.shots) this.shots.forEach(lerp);
      if (cam._px !== undefined && Math.abs(cx - cam._px) < 40 && Math.abs(cy - cam._py) < 40) { cam.x = cam._px + (cx - cam._px) * a; cam.y = cam._py + (cy - cam._py) * a; }
    }
    cam.x = Math.round(cam.x); cam.y = Math.round(cam.y);
    try { rO.call(this, g); }
    finally { for (let i = 0; i < saved.length; i += 3) { saved[i].x = saved[i + 1]; saved[i].y = saved[i + 2]; } cam.x = cx; cam.y = cy; }
  };
})();
