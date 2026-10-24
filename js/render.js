/* Lanternfall - renderer: world, lighting, HUD, title backdrop */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, S = LF.Sprites;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const PROMPT = { portal: 'Step through', shrine: 'Rest at shrine', npc: 'Talk', lore: 'Read', chest: 'Open', lever: 'Pull lever', lamp: 'Relight the Great Lantern', trial: 'Begin the Trial' };
  const DYN = 'SDFGgcj';

  // light layer (offscreen)
  const lightCv = document.createElement('canvas'); lightCv.width = W; lightCv.height = H;
  const lg = lightCv.getContext('2d');
  const glowCache = {};
  function glowSprite(col) {
    if (glowCache[col]) return glowCache[col];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(.35, col + '88'); gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return glowCache[col] = c;
  }
  const cutSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
  })();

  function text(g, s, x, y, col, align) {
    g.font = 'bold 8px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#05030f'; g.fillText(s, x + 1, y + 1); g.fillStyle = col || '#fff2c9'; g.fillText(s, x, y);
  }
  LF.drawText = text;

  G.render = function (g) {
    const cam = this.cam, room = this.room, t = this.clock, pl = this.player, lights = [];
    g.save();
    if (this.shakeV > 0) g.translate(Math.round(Math.sin(this.clock * 38) * this.shakeV * .5), Math.round(Math.cos(this.clock * 31) * this.shakeV * .5));
    LF.Art.drawBG(g, room, cam, t, this.tod);
    const cx = Math.round(cam.x), cy = Math.round(cam.y), P = LF.PAL[room.area];
    g.drawImage(room.layer, -cx, -cy);
    this.drawTiles(g, cam, t, room, P, lights);
    LF.Art.drawDecor(g, room, { x: cx, y: cy }, t, lights);
    this.drawItems(g, cam, t, lights);
    for (const d of this.drops) { S.drawEmber(g, d.x - cam.x, d.y - cam.y, t, false); lights.push({ x: d.x, y: d.y, r: 14, c: '#ffb860', a: .7 }); }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.kind === 'boss') { if (e.x - cam.x > -80 && e.x - cam.x < W + 80) LF.Bosses.draw(g, e, cam, t, this); lights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 40, c: '#c49bff', a: .6 }); }
      else if (e.x - cam.x > -40 && e.x - cam.x < W + 40) { S.drawEnemy(g, e, cam, t); if (e.type === 'wisp' || e.type === 'mothfoe') lights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 30, c: '#9af0d8', a: .7 }); }
    }
    LF.drawHazards(g, this, cam, t);
    if (this.state !== 'boot') S.drawPlayer(g, pl, cam, t);
    for (const p of this.projectiles) {
      const x = p.x - cam.x, y = p.y - cam.y; R(g, p.glow || p.col, x - 1, y - 1, p.w + 2, p.h + 2); R(g, '#fff', x + 1, y + 1, p.w - 2, p.h - 2);
      lights.push({ x: p.x + 3, y: p.y + 3, r: 22, c: p.glow || p.col, a: .8 });
    }
    // water overlay (animated surface)
    this.drawWater(g, cam, t, room, P);
    for (const p of this.particles) {
      const a = Math.min(1, p.life / (p.max * .5)); g.globalAlpha = a;
      R(g, p.col, p.x - cam.x, p.y - cam.y, p.sz, p.sz);
      if (p.glow) lights.push({ x: p.x, y: p.y, r: 10, c: p.col, a: .5 * a });
    }
    g.globalAlpha = 1;
    this.drawLighting(g, cam, lights, room, P);
    // foreground motes
    for (const m of this.motes) { g.globalAlpha = .25 + .5 * Math.abs(Math.sin(m.p + m.s * 9)); R(g, P.glow, m.x, m.y, 1, 1); }
    g.globalAlpha = 1;
    g.restore();
    this.drawHUD(g);
    if (this.flash.a > 0) { g.globalAlpha = Math.min(1, this.flash.a); g.fillStyle = this.flash.c; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (this.fade.a > 0) { g.globalAlpha = Math.min(1, this.fade.a); g.fillStyle = '#05030f'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  };

  G.drawTiles = function (g, cam, t, room, P) {
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(room.w - 1, Math.floor((cam.x + W) / T));
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(room.h - 1, Math.floor((cam.y + H) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ch = room.grid[y][x]; if (DYN.indexOf(ch) < 0) continue;
      S.drawDynTile(g, room, x, y, ch, this.ts[x + ',' + y], cam, t, this);
    }
  };

  G.drawWater = function (g, cam, t, room, P) {
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(room.w - 1, Math.floor((cam.x + W) / T));
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(room.h - 1, Math.floor((cam.y + H) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (room.grid[y][x] !== 'w') continue;
      const sx = x * T - cam.x, sy = y * T - cam.y, top = room.grid[y - 1] && room.grid[y - 1][x] !== 'w';
      g.globalAlpha = .38; R(g, room.area === 'drown' ? '#2a8286' : '#3a6ad0', sx, sy, T, T);
      g.globalAlpha = .55;
      if (top) { for (let i = 0; i < T; i += 2) R(g, '#c8fff0', sx + i, sy + Math.round(Math.sin(t * 3 + (x * T + i) * .3)), 2, 1); }
      else if (((x * 7 + y * 3 + Math.floor(t * 2)) % 5) === 0) R(g, '#c8fff0', sx + 4, sy + 6, 1, 3);
      g.globalAlpha = 1;
    }
  };

  G.drawItems = function (g, cam, t, lights) {
    const s = this.save, pl = this.player;
    for (const it of this.items) {
      const x = it.cx - cam.x, y = it.by - cam.y;
      if (x < -30 || x > W + 30 || y < -40 || y > H + 60) continue;
      switch (it.type) {
        case 'shrine': { const lit = it.lit || s.flags['sh:' + it.key]; S.drawShrine(g, x, y, t, lit); if (lit) lights.push({ x: it.cx, y: it.by - 26, r: 56, c: '#ffb860', a: .95 + Math.sin(t * 9) * .05 }); else lights.push({ x: it.cx, y: it.by - 26, r: 14, c: '#6a5a90', a: .4 }); break; }
        case 'npc': S.drawNPC(g, { x, y, id: it.id, face: pl.cx < it.cx ? -1 : 1 }, t); lights.push({ x: it.cx, y: it.by - 10, r: 22, c: it.id === 'vesper' ? '#9af0d8' : '#ffd27a', a: .5 }); break;
        case 'lore': S.drawLore(g, x, y, t, s.lore.indexOf(it.id) >= 0); lights.push({ x: it.cx, y: it.by - 8, r: 14, c: '#7ad8ff', a: .4 }); break;
        case 'chest': S.drawChest(g, x, y, t, it.open); break;
        case 'lever': S.drawLever(g, x, y, t, it.on); break;
        case 'altar': { const ic = it.give.split(':'); const icon = ic[0] === 'abil' ? ic[1] : ic[0] === 'charm' ? (LF.CHARMS[ic[1]] || {}).icon : 'heart'; S.drawAltar(g, x, y, t, icon, it.taken); if (!it.taken) lights.push({ x: it.cx, y: it.by - 14, r: 36, c: '#ffd27a', a: .9 }); break; }
        case 'ember': S.drawEmber(g, x, y - 4, t, false); lights.push({ x: it.cx, y: it.by - 4, r: 16, c: '#ffb860', a: .7 }); break;
        case 'moth': S.drawMoth(g, x, y - 8, t, false); lights.push({ x: it.cx, y: it.by - 8, r: 26, c: '#c49bff', a: .9 }); break;
        case 'frag': S.drawFragment(g, x, y - 8, t); lights.push({ x: it.cx, y: it.by - 8, r: 22, c: '#ff8aa8', a: .8 }); break;
        case 'lost': S.drawEmber(g, x, y - 4, t, true); lights.push({ x: it.cx, y: it.by - 4, r: 30, c: '#ffd27a', a: 1 }); break;
        case 'trial': R(g, '#3a3050', x - 7, y - 5, 14, 5); R(g, '#4c4068', x - 5, y - 9, 10, 4); R(g, '#c49bff', x - 2, y - 14 - Math.sin(t * 8), 4, 5); R(g, '#fff', x - 1, y - 12, 2, 2); lights.push({ x: it.cx, y: it.by - 12, r: 32, c: '#c49bff', a: .9 }); break;
        case 'lamp': { // the great lantern
          R(g, '#3a2a20', x - 9, y - 4, 18, 4); R(g, '#3a2a20', x - 2, y - 36, 4, 32); R(g, '#4a3a2c', x - 9, y - 44, 18, 3); R(g, '#4a3a2c', x - 9, y - 30, 18, 3); R(g, '#4a3a2c', x - 9, y - 44, 2, 17); R(g, '#4a3a2c', x + 7, y - 44, 2, 17);
          if (it.dark) { R(g, '#2a2030', x - 6, y - 41, 12, 11); R(g, '#4a4060', x - 2, y - 38, 4, 5); }
          else { const f = Math.sin(t * 8) * 1.5; R(g, '#ff8a3d', x - 6, y - 41, 12, 11); R(g, '#ffd27a', x - 4, y - 40 - f, 8, 9); R(g, '#fff2c9', x - 2, y - 38, 4, 5); lights.push({ x: it.cx, y: it.by - 36, r: 90, c: '#ffb860', a: 1 }); }
          break;
        }
      }
    }
    // interact prompt
    if (this.near && this.state === 'play') {
      const it = this.near, x = Math.round(it.cx - cam.x), y = Math.round(it.by - cam.y - (it.type === 'lamp' ? 52 : it.type === 'shrine' ? 40 : 26));
      const label = (LF.input.lastDevice === 'touch' ? 'ACT: ' : '▲ ') + PROMPT[it.type];
      const bob = Math.round(Math.sin(this.clock * 5)); this._prompt = { label, x, y: y + bob };
    }
  };

  G.drawLighting = function (g, cam, lights, room, P) {
    const pl = this.player, dark = Math.min(.92, P.dark + this.tod * .5 + (room.id === 'trial' ? .1 : 0));
    lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.clearRect(0, 0, W, H);
    lg.fillStyle = room.area === 'moss' ? '#0a0620' : room.area === 'spire' ? '#14040a' : '#04030f'; lg.globalAlpha = dark; lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    const flick = 1 + Math.sin(this.clock * 11) * .02 + Math.sin(this.clock * 23) * .015;
    const cut = (x, y, r, a) => { lg.globalAlpha = Math.min(1, a); lg.drawImage(cutSprite, x - cam.x - r, y - cam.y - r, r * 2, r * 2); };
    if (!pl.dead) cut(pl.cx, pl.cy - 2, this.lightR * flick, 1);
    for (const l of lights) { const sx = l.x - cam.x, sy = l.y - cam.y; if (sx < -l.r || sx > W + l.r || sy < -l.r || sy > H + l.r) continue; cut(l.x, l.y, l.r, (l.a || 1) * .9); }
    lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1;
    g.drawImage(lightCv, 0, 0);
    // warm additive glows
    g.globalCompositeOperation = 'lighter';
    if (!pl.dead) { g.globalAlpha = .22; const r = this.lightR * flick; g.drawImage(glowSprite('#ffb860'), pl.cx - cam.x - r, pl.cy - cam.y - r - 2, r * 2, r * 2); }
    for (const l of lights) {
      const sx = l.x - cam.x, sy = l.y - cam.y; if (sx < -l.r || sx > W + l.r || sy < -l.r || sy > H + l.r) continue;
      g.globalAlpha = Math.min(.35, (l.a || 1) * .3); g.drawImage(glowSprite(l.c.length === 7 ? l.c : '#ffb860'), sx - l.r * .7, sy - l.r * .7, l.r * 1.4, l.r * 1.4);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // vignette
    const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  };

  G.drawHUD = function (g) {
    const s = this.save, pl = this.player; if (!s) return;
    for (let i = 0; i < s.maxHp; i++) {
      const full = i < s.hp, low = s.hp <= 1 && full, pulse = low ? Math.round(Math.sin(this.clock * 10)) : 0;
      S.drawHeart(g, 8 + i * 10, 8 + pulse, this.clock, full ? '#ff5a6e' : '#3a2a44', full ? '#fff2c9' : '#5a4a66');
    }
    S.drawEmber(g, 11, 24, this.clock, false); text(g, String(s.embers), 18, 27, '#ffd27a');
    if (s.hp < s.maxHp && s.embers >= this.kindleCost() && this.state === 'play') text(g, '▼ hold: kindle (' + this.kindleCost() + ')', 8, 46, '#ff8aa8');
    if (pl.healT > 0) { R(g, '#0b0a1a', 8, 49, 42, 4); R(g, '#ff8aa8', 9, 50, Math.round(40 * pl.healT / 1.1), 2); }
    // abilities row
    let ax = W - 10; ['glide', 'dash', 'dbl'].forEach(k => { if (s.abil[k]) { const im = S.iconImg(k); if (im.complete) { g.globalAlpha = k === 'dash' && pl.dashCD > 0 ? .35 : .95; g.drawImage(im, ax - 8, 6, 8, 8); g.globalAlpha = 1; } ax -= 10; } });
    // boss bar
    const b = this.boss;
    if (b && b.active && !b.dead) {
      const bw = 160, bx = (W - bw) / 2, by = H - 16; R(g, '#05030f', bx - 2, by - 2, bw + 4, 8); R(g, '#3a1a2c', bx, by, bw, 4); R(g, '#e0486a', bx, by, Math.max(0, bw * b.hp / b.maxHp), 4); R(g, '#ff9aa8', bx, by, Math.max(0, bw * b.hp / b.maxHp), 1);
      text(g, LF.BOSS_NAMES[b.id], W / 2, by - 4, '#ffe2a0', 'center');
    }
    if (this.trial && !this.trial.done) text(g, 'Wave ' + Math.max(1, this.trial.wave) + ' / 5', W / 2, 14, '#c49bff', 'center');
    if (this.state === 'dead') { g.globalAlpha = Math.min(.7, this.deadT * .6); R(g, '#000', 0, 0, W, H); g.globalAlpha = Math.min(1, this.deadT); g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd27a'; g.fillText('THE FLAME FADES', W / 2, H / 2); g.globalAlpha = 1; }
  };

  /* ---------- title backdrop ---------- */
  const fakeRoom = { area: 'moss', h: 12, w: 40 }; const tcam = { x: 0, y: 0 };
  const flies = Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * W, y: 40 + Math.random() * 120, p: Math.random() * 7, s: .5 + Math.random() }));
  G.renderTitle = function (g, t) {
    tcam.x = t * 9; tcam.y = 20;
    LF.Art.drawBG(g, fakeRoom, tcam, t, .15);
    // ground silhouette with a lone lantern post
    g.fillStyle = '#0c0818'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 4) g.lineTo(x, 150 + Math.sin(x * .03 + 1) * 5 + Math.sin(x * .09) * 2); g.lineTo(W, H); g.fill();
    R(g, '#1a1230', 238, 96, 3, 56); R(g, '#1a1230', 232, 94, 15, 3); R(g, '#1a1230', 234, 84, 11, 11);
    const f = Math.sin(t * 9) * .6; R(g, '#2a2040', 236, 86, 7, 7); // unlit lantern
    for (const m of flies) { m.p += .016; m.x += Math.sin(m.p * .8 + m.s * 5) * .25; m.y += Math.cos(m.p * .6 + m.s * 3) * .2; if (m.x < 0) m.x = W; if (m.x > W) m.x = 0; g.globalAlpha = .3 + .7 * Math.abs(Math.sin(m.p + m.s * 9)); R(g, '#ffd27a', m.x, m.y, 1, 1); R(g, '#ffd27a55', m.x - 1, m.y - 1, 3, 3); }
    g.globalAlpha = 1;
    // tiny flame wisp that bobs near the lantern
    const wx = 218 + Math.sin(t * .7) * 10, wy = 118 + Math.sin(t * 1.3) * 4; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; g.drawImage(glowSprite('#ffb860'), wx - 22, wy - 22, 44, 44); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    R(g, '#ff8a3d', wx - 2, wy - 1, 4, 5); R(g, '#ffd27a', wx - 1, wy - 3 - f, 2, 5); R(g, '#fff2c9', wx - .5, wy, 1, 2);
    const v = g.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, W * .65); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    if (this.fade.a > 0) { g.globalAlpha = Math.min(1, this.fade.a); g.fillStyle = '#05030f'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  };
})();
