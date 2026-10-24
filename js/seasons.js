/* Lanternfall - seasonal bonus boards: Tempest Ridge (harder storm board) and Frostmere Pass + Frost Throne (snow board with snowmen and a snowman boss) */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, S = LF.Sprites, Art = LF.Art, In = LF.input, Phys = LF.Phys;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ============================== palettes ============================== */
  LF.PAL.storm = { name: 'Season of Storms', sky: ['#070b1a', '#101a33', '#1d2d52', '#32487a'], far: '#1a2745', mid: '#121c35', near: '#0a1124',
    rock: ['#222c44', '#2d3a58', '#3d4d70', '#161d30'], top: ['#3a6a5a', '#5aa08a', '#9ad8c0'], deep: '#0a1020', glow: '#9ad0ff', fog: '#4a6aa8', dark: .58 };
  LF.PAL.snow = { name: 'Season of Snow', sky: ['#1a2447', '#2f4478', '#6a8cc4', '#c8e0f8'], far: '#5a7aaa', mid: '#3e5a8a', near: '#26365a',
    rock: ['#6a84b0', '#8aa4cc', '#b0c8e8', '#44587e'], top: ['#c8dcf0', '#eef6ff', '#ffffff'], deep: '#26365a', glow: '#cfe8ff', fog: '#c8e0f8', dark: .3 };

  /* ============================== backgrounds (procedural, tileable) ============================== */
  const BW = 640, BH = 260, TAU = Math.PI * 2;
  function layerSet(area, build) {
    const P = LF.PAL[area], r = LF.rng(area.length * 311 + 17), sky = cv(W, H), s = sky.getContext('2d'), layers = [];
    const gr = s.createLinearGradient(0, 0, 0, H); P.sky.forEach((c, i) => gr.addColorStop(i / (P.sky.length - 1), c)); s.fillStyle = gr; s.fillRect(0, 0, W, H);
    const mk = (col, fx, fy, yb, fn, alpha) => { const c = cv(BW, BH), g = c.getContext('2d'); g.fillStyle = col; fn(g, r); layers.push({ c, fx, fy, yb, alpha: alpha == null ? 1 : alpha }); };
    const wrap = fn => { fn(0); fn(-BW); fn(BW); };
    build(s, mk, wrap, r, P);
    return { sky, layers };
  }
  Art.bgCache.storm = layerSet('storm', (s, mk, wrap, r, P) => {
    s.fillStyle = '#9ab0d044'; s.beginPath(); s.arc(230, 52, 34, 0, 7); s.fill(); s.fillStyle = '#c8d8f066'; s.beginPath(); s.arc(230, 52, 14, 0, 7); s.fill();
    mk('#0b1224', .04, .02, 20, (g, rr) => wrap(o => { for (let i = 0; i < 14; i++) { const x = o + i * 52 + rr() * 20, y = 10 + rr() * 50, w = 60 + rr() * 60; g.globalAlpha = .55 + rr() * .3; g.beginPath(); g.ellipse(x, y, w, 12 + rr() * 10, 0, 0, TAU); g.fill(); } g.globalAlpha = 1; }), .9);
    mk(P.far, .1, .05, 90, g => { for (let x = 0; x < BW; x += 2) { const y = 118 + Math.sin(x / BW * TAU * 3) * 18 + Math.sin(x / BW * TAU * 8) * 7; g.fillRect(x, y, 2, BH - y); } });
    mk(P.mid, .3, .15, 70, (g, rr) => wrap(o => { for (let i = 0; i < 7; i++) { const x = o + i * 94 + rr() * 20, h = 70 + rr() * 80, w = 16 + rr() * 12; g.fillRect(x, BH - h, w, h); g.fillRect(x - 3, BH - h, w + 6, 4); g.beginPath(); g.moveTo(x, BH - h); g.lineTo(x + w * .3, BH - h - 12 - rr() * 14); g.lineTo(x + w * .6, BH - h); g.fill(); g.clearRect(x + 4, BH - h + 18, 4, 7); } }));
    mk(P.near, .55, .3, 40, (g, rr) => wrap(o => { for (let i = 0; i < 9; i++) { const x = o + i * 72 + rr() * 24, h = 40 + rr() * 90; g.beginPath(); g.moveTo(x, BH); g.lineTo(x + 8, BH - h); g.lineTo(x + 14, BH - h * .6); g.lineTo(x + 22, BH - h * .85); g.lineTo(x + 32, BH); g.fill(); } }));
  });
  Art.bgCache.snow = layerSet('snow', (s, mk, wrap, r, P) => {
    for (let i = 0; i < 90; i++) { const y = r() * H * .55; s.globalAlpha = (1 - y / H) * (.3 + r() * .7); R(s, '#fff', r() * W, y, 1, 1); } s.globalAlpha = 1;
    for (let x = 0; x < W; x += 2) { const y = 30 + Math.sin(x * .028) * 12 + Math.sin(x * .07 + 1) * 5; for (let k = 0; k < 5; k++) { s.globalAlpha = .1 - k * .018; R(s, k % 2 ? '#8affc8' : '#a0ffd8', x, y + k * 7, 2, 7); } s.globalAlpha = .07; R(s, '#c49bff', x, y + 34, 2, 14); } s.globalAlpha = 1;
    mk(P.far, .08, .04, 90, (g, rr) => wrap(o => { for (let i = 0; i < 7; i++) { const x = o + i * 92 + rr() * 20, h = 60 + rr() * 70, w = 50 + rr() * 30; g.fillStyle = P.far; g.beginPath(); g.moveTo(x, BH); g.lineTo(x + w / 2, BH - h - 60); g.lineTo(x + w, BH); g.fill(); g.fillStyle = '#e8f4ff'; g.beginPath(); g.moveTo(x + w / 2, BH - h - 60); g.lineTo(x + w * .36, BH - h - 36); g.lineTo(x + w * .5, BH - h - 42); g.lineTo(x + w * .62, BH - h - 34); g.fill(); } }));
    mk(P.mid, .3, .15, 70, (g, rr) => wrap(o => { for (let i = 0; i < 16; i++) { const x = o + i * 40 + rr() * 14, h = 38 + rr() * 40; for (let k = 0; k < 4; k++) { const w = 22 - k * 4; g.beginPath(); g.moveTo(x, BH - h + k * 11); g.lineTo(x - w / 2, BH - h + k * 11 + 14); g.lineTo(x + w / 2, BH - h + k * 11 + 14); g.fill(); } g.fillRect(x - 1, BH - h + 40, 3, h - 38 + 20); } }));
    mk(P.near, .55, .3, 40, (g, rr) => wrap(o => { for (let i = 0; i < 6; i++) { const x = o + i * 108 + rr() * 30, h = 90 + rr() * 60; for (let k = 0; k < 6; k++) { const w = 38 - k * 5; g.beginPath(); g.moveTo(x, BH - h + k * 16); g.lineTo(x - w / 2, BH - h + k * 16 + 20); g.lineTo(x + w / 2, BH - h + k * 16 + 20); g.fill(); } g.fillRect(x - 2, BH - 28, 5, 40); } for (let x = 0; x < BW; x += 2) g.fillRect(x, BH - 12 + Math.sin(x / BW * TAU * 5) * 4, 2, 20); }));
  });

  /* decor: icicles and ice crystals on snow, wet reeds on storm */
  const mdO = Art.makeDecor;
  Art.makeDecor = function (room, at, air) {
    const d = mdO.call(this, room, at, air), a = room.area; if (a !== 'snow' && a !== 'storm') return d;
    for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
      if (at(x, y) !== '#') continue; const k = LF.hash(x, y, 31), k2 = LF.hash(x, y, 77);
      if (air(x, y - 1) && at(x, y - 1) !== '^') { if (a === 'snow' && k > .86) d.push({ t: 'crystal', x: x * T + 4 + k2 * 8, y: y * T, s: k2, l: 0 }); if (a === 'storm' && k < .4) d.push({ t: 'reed', x: x * T + k2 * 12, y: y * T, s: k, h: 5 + k * 7 }); }
      if (a === 'snow' && air(x, y + 1) && at(x, y + 1) !== 'v' && k2 < .35) d.push({ t: 'stalac', x: x * T + 3 + k * 10, y: (y + 1) * T - 2, s: k, h: 5 + k2 * 12, l: 0 });
    }
    return d;
  };

  /* music */
  const MINS = [0, 2, 3, 5, 7, 8, 10], PENS = [0, 2, 4, 7, 9];
  LF.AUDIO_TRACKS.storm = { bpm: 128, root: 50, scale: MINS, prog: [[0, 'm'], [0, 'm'], [5, 'M'], [4, 'm'], [0, 'm'], [6, 'M'], [3, 'M'], [4, 'm']], lead: 'square', arp: 'square', bass: 'square', dens: .6, seed: 71, drums: 2, echo: .4 };
  LF.AUDIO_TRACKS.frost = { bpm: 76, root: 57, scale: PENS, prog: [[0, 'M'], [3, 'M'], [4, 'm'], [2, 'M'], [0, 'M'], [3, 'M'], [4, 'm'], [2, 'M']], lead: 'triangle', arp: 'sine', bass: 'sine', dens: .4, seed: 83, drums: 0, echo: .8, arpHi: 1 };

  /* ============================== rooms ============================== */
  const Room = LF.Room, L = LF.Rooms.list;
  const back = (x, y, col) => ({ to: 'glade', sx: 21 * T, sy: 12 * T - 14, back: 1, col: col });
  Room('storm', 'Tempest Ridge', 'storm', 64, 16, 0, 3, 3, 1, 'storm').f(14);
  (function (r) {
    r.bonus = true; r.ambience = { rain: .9, wind: .55, drone: .18 };
    r.sp(15, 14, 3).sp(26, 14, 22);
    r.p(19, 10, 3).p(27, 11, 4).p(33, 9, 4).b(39, 9, 3, 1, 'c').p(44, 10, 3);
    r.e('portal', 2, 13, back(0, 0, '#ffd27a')).e('portal', 59, 13, back(0, 0, '#ffd27a'));
    r.e('husk', 10, 13).e('thorn', 22, 13).e('bat', 31, 6).e('wisp', 37, 7).e('bat', 45, 7).e('husk', 52, 13).e('thorn', 55, 13).e('beetle', 57, 13).e('wisp', 50, 9);
    r.em(18, 9, 4).em(27, 10, 4).em(33, 8, 4).em(44, 9, 3).em(49, 13, 3);
    r.e('chest', 61, 13, { give: 'embers:0', bonus: 'storm' });
  })(L.storm);

  Room('snow', 'Frostmere Pass', 'snow', 64, 16, 4, 3, 3, 1, 'frost').f(14);
  (function (r) {
    r.bonus = true; r.ambience = { wind: .6, drone: .12 };
    r.sp(14, 14, 3).sp(30, 14, 4).sp(44, 14, 3);
    r.p(31, 11, 2).p(18, 10, 3).p(24, 8, 3).p(30, 6, 3);
    r.door('r', 'r', 11, 13, 'snow_arena', 'l');
    r.e('portal', 2, 13, back(0, 0, '#ffd27a')).e('shrine', 59, 13);
    r.e('snowman', 9, 13).e('snowman', 22, 13).e('snowman', 38, 13).e('snowman', 50, 13).e('bat', 20, 7).e('bat', 41, 6).e('wisp', 47, 8);
    r.e('chest', 31, 5, { give: 'embers:80' });
    r.em(19, 9, 3).em(25, 7, 3).em(12, 13, 2).em(35, 13, 3);
  })(L.snow);

  Room('snow_arena', 'Frost Throne', 'snow', 28, 14, 7, 3, 2, 1, 'boss').f(12);
  (function (r) {
    r.bonus = true; r.ambience = { wind: .5, drone: .25 };
    r.door('l', 'l', 9, 11, 'snow', 'r');
    r.p(4, 9, 3).p(21, 9, 3);
    r.e('boss', 20, 11, { id: 'snowking', replay: 1 }).e('portal', 25, 11, back(0, 0, '#ffd27a'));
  })(L.snow_arena);

  /* the portals in the Glade appear as the story unlocks them */
  L.glade.ents.push({ type: 'portal', x: 20, y: 11, to: 'storm', sx: 4 * T, sy: 14 * T - 14, season: 'storm', lock: 'storm', col: '#9ad0ff' });
  L.glade.ents.push({ type: 'portal', x: 23, y: 11, to: 'snow', sx: 4 * T, sy: 14 * T - 14, season: 'snow', lock: 'snow', col: '#e8f4ff' });
  const unlocked = (f, k) => k === 'storm' ? !!f.boss_thorn : !!f.storm_clear;
  const loadO = G.loadRoom;
  G.loadRoom = function () {
    const r = loadO.apply(this, arguments), f = this.save.flags;
    this.items = this.items.filter(it => it.type !== 'portal' || !it.lock || unlocked(f, it.lock));
    if (this.room.id === 'glade') for (const k of ['storm', 'snow']) if (unlocked(f, k) && !f['seen_portal_' + k]) { f['seen_portal_' + k] = 1; setTimeout(() => this.toast(k === 'storm' ? 'A storm portal opens in the Glade.' : 'A snow portal opens in the Glade.'), 1800); }
    this.gust = 0; this.blizzard = 0; this.env = { light: rnd(4, 7), gt: rnd(3, 5), bt: rnd(10, 16), gdir: 1 };
    return r;
  };

  /* ============================== portals ============================== */
  const dwO = G.drawItems;
  G.drawItems = function (g, cam, t, lights) {
    dwO.call(this, g, cam, t, lights);
    for (const it of this.items) {
      if (it.type !== 'portal') continue;
      const x = Math.round(it.cx - cam.x), y = Math.round(it.by - cam.y - 16); if (x < -30 || x > W + 30) continue;
      const col = it.col || '#9ad0ff';
      g.save(); g.globalAlpha = .18 + .08 * Math.sin(t * 3); R(g, col, x - 6, y - 12, 12, 24);
      g.globalAlpha = 1;
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU + t * (it.back ? -1.4 : 1.6), px = x + Math.cos(a) * 8, py = y + Math.sin(a) * 14; g.globalAlpha = .5 + .5 * Math.sin(a * 2 + t * 4); R(g, i % 3 ? col : '#ffffff', px - 1, py - 1, 2, 2); }
      g.globalAlpha = .8; R(g, '#ffffff', x - 1, y - 1 + Math.sin(t * 5), 2, 2); g.restore();
      if (!it.back) LF.drawText(g, it.season === 'storm' ? 'STORM' : 'SNOW', x, y - 22, col, 'center');
      lights.push({ x: it.cx, y: it.by - 16, r: 38, c: col.length === 7 ? col : '#9ad0ff', a: .95 });
    }
  };
  const intO = G.interact;
  G.interact = function (it) {
    const s = this.save, f = s.flags;
    if (it.type === 'portal') {
      this.sfx('door'); const dest = it.to, sp = { x: it.sx, y: it.sy };
      this.transition(() => { this.loadRoom(dest, null, sp); LF.Save.write(s); if (dest === 'storm') this.banner('Tempest Ridge', 'Rain, gales and lightning. No shrines.'); else if (dest === 'snow') this.banner('Frostmere Pass', 'Ice underfoot. Beware the snowmen.'); });
      return;
    }
    if (it.type === 'chest' && it.bonus === 'storm') {
      it.open = true; this.sfx('ok'); this.burst(it.cx, it.by - 12, 24, '#9ad0ff', 100, 1); f.storm_runs = (f.storm_runs || 0) + 1;
      if (!f.storm_clear) { f.storm_clear = 1; this.banner('Storm Weathered', 'The snow portal opens'); this.give('heart'); }
      else { this.give('embers:' + (120 + Math.min(120, f.storm_runs * 10))); }
      LF.Save.write(s); return;
    }
    return intO.call(this, it);
  };
  LF.Seasons = {
    snowCleared(Gm, b) {
      const s = Gm.save, f = s.flags; f.snow_runs = (f.snow_runs || 0) + 1;
      setTimeout(() => { Gm.sfx('ability'); Gm.banner('The Frost King melts', f.snow_clear ? 'Embers bubble from the slush' : 'Frostbite charm claimed'); }, 700);
      if (!f.snow_clear) { f.snow_clear = 1; Gm.give('charm:frost'); } else Gm.give('embers:' + (150 + Math.min(150, f.snow_runs * 10)));
      LF.Save.write(s);
    }
  };

  /* ============================== board mechanics ============================== */
  const simO = G.simulate;
  G.simulate = function (dt) {
    const pl = this.player, area = this.room.area, vx0 = pl.vx, wasIce = area === 'snow' && pl.onGround && In.axis === 0 && pl.hurtT <= 0 && pl.dashT <= 0 && Math.abs(vx0) > 6;
    simO.call(this, dt);
    if (this.hitstopT > 0 || this.state !== 'play' || pl.dead) return;
    const e = this.env || (this.env = { light: 5, gt: 4, bt: 12, gdir: 1 });
    if (area === 'snow' && wasIce && pl.onGround && !pl.hitX) pl.vx = LF.approach(vx0, 0, 260 * dt);   // slippery ice
    if (area === 'storm') {
      e.light -= dt;
      if (e.light <= 0) {   // telegraphed lightning bolt near the player
        e.light = rnd(5, 8); const x = LF.clamp(pl.cx + rnd(-80, 80), T * 2, this.room.w * T - T * 2);
        this.hazards.push({ t: 0, delay: 1.0, life: .3, dmg: 1, col: '#dfe8ff', x: x - 8, y: 8, w: 16, h: (this.room.h - 2) * T - 8, sfx: 'crack', shake: 4 });
        setTimeout(() => { if (this.room && this.room.area === 'storm') { this.flashScreen('#dfe8ff', .55); this.sfx('boom'); } }, 1000);
      }
      e.gt -= dt;
      if (this.gust) { pl._gustT = (pl._gustT || 0) - dt; if (pl._gustT <= 0) { this.gust = 0; e.gt = rnd(5, 9); } }
      else if (e.gt <= 0) { this.gust = e.gdir = -e.gdir; pl._gustT = rnd(1.6, 2.4); if (!this.save.seen['tip:gale']) { this.save.seen['tip:gale'] = 1; this.toast('A gale shoves you around!'); } }
      if (this.gust) { const dx = this.gust * 40 * dt; if (!Phys.anyTile(this, pl.x + dx, pl.y, pl.w, pl.h, c => Phys.solid(c))) pl.x += dx; }
    } else if (area === 'snow') {
      e.bt -= dt;
      if (e.bt <= 0 && !this.boss) { e.bt = rnd(16, 24); this.blizzard = 3.2; if (!this.save.seen['tip:blizzard']) { this.save.seen['tip:blizzard'] = 1; this.toast('Blizzard! Your light shrinks.'); } }
    }
    if (this.blizzard > 0) { this.blizzard -= dt; this.lightR *= .62; }
  };
  const dlO = G.drawLighting;
  G.drawLighting = function (g, cam, lights, room, P) {
    dlO.call(this, g, cam, lights, room, P);
    if (this.blizzard > 0 && this.state !== 'dead') {
      const k = Math.min(1, this.blizzard);
      g.globalAlpha = Math.min(.3, k * .3); R(g, '#e8f4ff', 0, 0, W, H);
      g.globalAlpha = .5 * k; for (let i = 0; i < 46; i++) R(g, '#ffffff', ((i * 53 + this.clock * 300) % (W + 60)) - 30, (i * 37) % H, 10, 1);
      g.globalAlpha = 1;
    }
  };

  /* ============================== snowmen, chill, difficulty ============================== */
  function snowman(e, dt, Gm) {
    const pl = Gm.player, d = e.d, dx = pl.cx - (e.x + e.w / 2), dy = pl.cy - (e.y + e.h / 2), dist = Math.hypot(dx, dy);
    e.flash = Math.max(0, e.flash - dt); e.t += dt;
    if (e.stun > 0) { e.stun -= dt; e.vx = LF.approach(e.vx, 0, 500 * dt); e.vy = Math.min(e.vy + 900 * dt, 380); Phys.move(e, dt, Gm); return; }
    if (e.state === 'throw') {
      e.vx = 0; e.face = dx > 0 ? 1 : -1;
      if (!e.did && e.t > .45) { e.did = true; const a = Math.atan2(dy - 8, dx); Gm.projectiles.push({ x: e.x + e.w / 2 - 3, y: e.y + 4, w: 6, h: 6, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95 - 55, life: 3, dmg: 1, col: '#ffffff', glow: '#cfe8ff', grav: 190 }); Gm.sfx('shoot'); }
      if (e.t > .9) { e.state = 'idle'; e.t = -.6; }
    } else {
      const front = Phys.solid(Gm.tile(Math.floor((e.x + (e.face > 0 ? e.w + 2 : -2)) / T), Math.floor((e.y + e.h / 2) / T)));
      const ledge = e.onGround && !Phys.anyTile(Gm, e.x + (e.face > 0 ? e.w : -2), e.y + e.h + 2, 2, 2, c => Phys.solid(c) || c === '=' || c === 'c');
      if (dist < 170) e.face = dx > 0 ? 1 : -1; else if (front || ledge) e.face *= -1;
      if (front || ledge) { e.vx = 0; if (dist < 170) e.face *= 1; } else e.vx = e.face * d.spd * (dist < 170 ? 1 : .6);
      if (e.t > 2.0 && dist < 150 && Math.abs(dy) < 80) { e.state = 'throw'; e.t = 0; e.did = false; }
    }
    e.vy = Math.min(e.vy + 900 * dt, 380); Phys.move(e, dt, Gm);
  }
  const ueO = LF.updateEnemy;
  LF.updateEnemy = function (e, dt, Gm) {
    if (e.chill > 0) { e.chill -= dt; dt *= .55; }
    if (e.type === 'snowman') return snowman(e, dt, Gm);
    return ueO.call(this, e, dt, Gm);
  };
  const heO = LF.hurtEnemy;
  LF.hurtEnemy = function (e, dmg, dir, Gm) {
    const r = heO.call(this, e, dmg, dir, Gm);
    if (!r && Gm._melee && Gm.player.hasCharm('frost')) { e.chill = 2.4; Gm.burst(e.x + e.w / 2, e.y + e.h / 2, 5, '#bfe4ff', 60, 1); }
    return r;
  };
  const mkO = LF.makeEnemy;
  LF.makeEnemy = function (type, tx, ty, Gm, idx) {
    const e = mkO.apply(this, arguments);
    if (Gm.room && Gm.room.bonus) { e.maxHp = e.hp = Math.ceil(e.hp * 1.35); e.em = Math.round(e.em * 1.4); }
    return e;
  };
  const deO = S.drawEnemy;
  S.drawEnemy = function (g, e, cam, t) {
    deO.call(this, g, e, cam, t);
    if (e.chill > 0 && e.type !== 'snowman') { g.globalAlpha = .32; R(g, '#9ad8ff', e.x - cam.x, e.y - cam.y, e.w, e.h); g.globalAlpha = 1; }
  };
})();
