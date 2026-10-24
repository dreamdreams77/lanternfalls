/* Lanternfall - graphics pass 3: contact shadows (ambient occlusion), sprite outlines, slash arcs, impact rings, fish */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, S = LF.Sprites, Art = LF.Art;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ---------- ambient occlusion baked into the static room layer ---------- */
  const bakeO = Art.bakeRoom;
  Art.bakeRoom = function (room) {
    const r = bakeO.call(this, room);
    try {
      const g = room.layer.getContext('2d'), w = room.w, h = room.h;
      const solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? false : LF.isSolidCh(room.grid[y][x]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (solid(x, y) || room.grid[y][x] === 'w') continue;
        const x0 = x * T, y0 = y * T;
        if (solid(x, y - 1)) for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(4,2,12,' + (.34 - k * .08) + ')'; g.fillRect(x0, y0 + k, T, 1); }
        if (solid(x - 1, y)) for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(4,2,12,' + (.24 - k * .07) + ')'; g.fillRect(x0 + k, y0, 1, T); }
        if (solid(x + 1, y)) for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(4,2,12,' + (.24 - k * .07) + ')'; g.fillRect(x0 + T - 1 - k, y0, 1, T); }
        if (solid(x, y + 1)) for (let k = 0; k < 2; k++) { g.fillStyle = 'rgba(4,2,12,' + (.2 - k * .08) + ')'; g.fillRect(x0, y0 + T - 1 - k, T, 1); }
      }
    } catch (e) { console.warn('ao failed', e); }
    return r;
  };

  /* ---------- sprite outlines (scratch silhouette drawn at four offsets) ---------- */
  const SW = 96, SH = 80, sc = cv(SW, SH), sg = sc.getContext('2d'), oc = cv(SW, SH), og = oc.getContext('2d');
  sg.imageSmoothingEnabled = og.imageSmoothingEnabled = false;
  const OX = 28, OY = 28;
  function outline(g, ent, cam, t, fn, col) {
    try {
      sg.clearRect(0, 0, SW, SH);
      fn(sg, { x: ent.x - OX, y: ent.y - OY }, t);
      og.globalCompositeOperation = 'copy'; og.drawImage(sc, 0, 0);
      og.globalCompositeOperation = 'source-in'; og.fillStyle = col; og.fillRect(0, 0, SW, SH);
      const sx = Math.round(ent.x - cam.x) - OX, sy = Math.round(ent.y - cam.y) - OY;
      g.drawImage(oc, sx - 1, sy); g.drawImage(oc, sx + 1, sy); g.drawImage(oc, sx, sy - 1); g.drawImage(oc, sx, sy + 1);
    } catch (_) {}
  }
  const dpO = S.drawPlayer;
  S.drawPlayer = function (g, pl, cam, t) {
    if (!pl.dead) outline(g, pl, cam, t, (c, fc, tt) => dpO.call(S, c, pl, fc, tt), '#1c0a12');
    dpO.call(this, g, pl, cam, t);
    if (pl.atkT > 0 && !pl.dead) slash(g, pl, cam);
  };
  const deO = S.drawEnemy;
  S.drawEnemy = function (g, e, cam, t) {
    if (e.kind !== 'boss') outline(g, e, cam, t, (c, fc, tt) => deO.call(S, c, e, fc, tt), '#0a0612');
    deO.call(this, g, e, cam, t);
    if (e.affix === 'shielded') {
      const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y), fx = e.face > 0 ? sx + e.w + 1 : sx - 3;
      g.globalAlpha = .9; R(g, '#05030f', fx - 1, sy, 5, e.h); R(g, '#b0c0ff', fx, sy + 1, 3, e.h - 2); R(g, '#fff', fx + (e.face > 0 ? 1 : 0), sy + 2, 1, e.h - 4); g.globalAlpha = 1;
    }
  };

  /* ---------- slash arc (pixel-stepped, additive) ---------- */
  function slash(g, pl, cam) {
    const p = 1 - pl.atkT / .2, d = pl.atkDir, f = pl.face;
    let cx = pl.cx - cam.x, cy = pl.cy - cam.y, base, sweep = 2.2, rad = 17;
    if (d === 'f') { base = f > 0 ? -1.1 : Math.PI + 1.1; } else if (d === 'u') { base = -Math.PI / 2 - 1.1; cy -= 4; rad = 15; } else { base = Math.PI / 2 - 1.1; cy += 4; rad = 15; }
    const dirSign = d === 'f' && f < 0 ? -1 : 1, head = p * sweep;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) {
      const a = base + dirSign * (head - k * .09); if (head - k * .09 < 0 || head - k * .09 > sweep) continue;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * (d === 'f' ? .95 : .8);
      g.globalAlpha = (1 - k / 14) * (1 - p * .6);
      R(g, k < 4 ? '#fff2c9' : k < 9 ? '#ffd27a' : '#ff8a3d', x - 1, y - 1, k < 8 ? 3 : 2, k < 8 ? 3 : 2);
    }
    g.restore(); g.globalAlpha = 1;
  }

  /* ---------- impact rings ---------- */
  G.rings = [];
  G.ring = function (x, y, col, r) { if (this.rings.length < 16) this.rings.push({ x, y, col: col || '#fff2c9', r: r || 14, t: 0 }); };
  const hurtO = LF.hurtEnemy;
  LF.hurtEnemy = function (e, dmg, dir, Gm) { const r = hurtO.call(this, e, dmg, dir, Gm); if (Gm.ring) Gm.ring(e.x + e.w / 2, e.y + e.h / 2, r ? '#ffd27a' : '#fff2c9', r ? 22 : 12); return r; };
  const updO = G.update;
  G.update = function (dt) { updO.call(this, dt); for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].t += dt; if (this.rings[i].t > .22) this.rings.splice(i, 1); } };
  const dlO = G.drawLighting;
  G.drawLighting = function (g, cam, lights, room, P) {
    dlO.call(this, g, cam, lights, room, P);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const o of this.rings) {
      const k = o.t / .22, r = 3 + o.r * k; g.globalAlpha = (1 - k) * .9; g.fillStyle = o.col;
      for (let a = 0; a < 16; a++) { const an = a / 16 * 6.2832; g.fillRect(Math.round(o.x - cam.x + Math.cos(an) * r), Math.round(o.y - cam.y + Math.sin(an) * r), 1, 1); }
    }
    g.restore(); g.globalAlpha = 1;
  };

  /* ---------- fish and sparkles in water ---------- */
  const dwO = G.drawWater;
  G.drawWater = function (g, cam, t, room, P) {
    dwO.call(this, g, cam, t, room, P);
    const x0 = Math.max(1, Math.floor(cam.x / T)), x1 = Math.min(room.w - 2, Math.floor((cam.x + W) / T));
    const y0 = Math.max(1, Math.floor(cam.y / T)), y1 = Math.min(room.h - 2, Math.floor((cam.y + H) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (room.grid[y][x] !== 'w' || room.grid[y - 1][x] !== 'w') continue;
      const h = (x * 73 + y * 151) % 11; if (h > 1) continue;
      if (room.grid[y][x - 1] !== 'w' || room.grid[y][x + 1] !== 'w') continue;
      const ph = t * (.5 + h * .2) + x, fx = x * T + 8 + Math.sin(ph) * 10, face = Math.cos(ph) > 0 ? 1 : -1, fy = y * T + 7 + Math.sin(t * 2 + x) * 2;
      const sx = Math.round(fx - cam.x), sy = Math.round(fy - cam.y), col = room.area === 'drown' ? '#c8fff0' : '#7ad8ff';
      g.globalAlpha = .75; R(g, col, sx, sy, 3, 1); R(g, col, sx - face * 1, sy - 1, 1, 3); R(g, '#05030f', sx + (face > 0 ? 2 : 0), sy, 1, 1); g.globalAlpha = 1;
    }
  };
})();
