/* Lanternfall - Lamplight Galleries: optional shooting puzzle rooms with ember eyes (targets), mirrors, lantern grates and ember gates */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, S = LF.Sprites, UI = LF.UI, Phys = LF.Phys, Room = LF.Room, L = LF.Rooms.list;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  /* Tiles: E ember gate (solid, opens when every eye in the room is lit)
            H lantern grate (stops bodies, lets flame through) */
  const solidO = Phys.solid; Phys.solid = function (ch) { return ch === 'E' || ch === 'H' || solidO.call(this, ch); };
  const isoO = LF.isSolidCh; LF.isSolidCh = ch => ch === 'E' || ch === 'H' || isoO(ch);
  Object.assign(G, { pzT: 0 });

  /* ---------- content: charm, lore, bounty ---------- */
  S.ICONS.glass = ['...b....', '..bwb...', '.bwbBb..', 'bwbyBBb.', '.bBYBb..', '..bBb...', '...b....', '........'];
  LF.CHARMS.glass = { name: 'Glass Ember', icon: 'glass', desc: 'Ember Shots ricochet once off walls.' };
  LF.LORE.gallery = ['Gallery Plaque', 'The lamplighters woke these eyes with flame thrown from afar. A strike will not do: the eyes answer only to fire on the wing. Wake them all and the ember gate yields.'];
  LF.LORE.mirror = ['Mirror Plaque', 'Glass bends flame. The glass on a pivot turns when struck. Iron-ringed eyes sleep deeply; only a Lance will wake them.'];
  LF.BOUNTIES.push({ id: 'lamp', name: 'Lamplighter', desc: 'Solve all four Lamplight Galleries.', test: s => [GALS.filter(id => s.flags['pz:' + id]).length, GALS.length], reward: 'heart', rtxt: '+1 heart' });

  /* ---------- the four galleries ---------- */
  const GALS = ['gal_moss', 'gal_glim', 'gal_drown', 'gal_spire'];
  const NAMES = {};
  // host room, doorway tile in it, and the gallery's floor row (for the return trip and arrival point)
  function gallery(id, host, hx, hy, build) {
    const r = build(); NAMES[id] = r.name; const F = r.floorRow;
    r.e('portal', 2, F - 1, { to: host, sx: hx * T, sy: (hy + 1) * T - 14, col: '#ffd27a', back: true });
    L[host].ents.push({ type: 'portal', x: hx, y: hy, to: id, sx: 4 * T, sy: F * T - 14, col: '#ffb23a', back: true, gallery: true });
  }
  // A: three eyes in three directions (up, diagonal, ahead). Teaches the idea.
  gallery('gal_moss', 'rootbridge', 12, 11, () => {
    const r = Room('gal_moss', 'Gallery of Eyes', 'moss', 30, 14, 2, 6, 2, 1, 'mossroot').f(12); r.floorRow = 12;
    r.pz = { timer: 0 }; r.ambience = { wind: .1, drone: .2 };
    r.b(24, 1, 1, 11, 'E').p(5, 8, 3).p(15, 7, 2);
    r.e('lore', 6, 11, { id: 'gallery' }).e('target', 10, 3).e('target', 20, 5).e('target', 22, 11).e('chest', 27, 11, { give: 'embers:80' });
    return r;
  });
  // B: both eyes sit beyond a wall; a fixed mirror bends one shot to them, a pivot mirror must be struck to aim the other.
  gallery('gal_glim', 'g_cavern', 37, 13, () => {
    const r = Room('gal_glim', 'Mirror Vault', 'glim', 32, 14, 5, 6, 2, 1, 'glimmer').f(12); r.floorRow = 12;
    r.pz = { timer: 0 }; r.ambience = { drip: .4, drone: .2 };
    r.b(13, 3, 1, 5).b(13, 8, 1, 4, 'E').b(11, 2, 1, 1).p(3, 9, 3).p(5, 6, 2).p(8, 3, 3);
    r.e('lore', 5, 11, { id: 'mirror' }).e('mirror', 12, 2, { dir: '/' }).e('mirror', 9, 1, { dir: '\\', rot: 1 });
    r.e('target', 25, 2).e('target', 27, 1).e('chest', 27, 11, { give: 'embers:100' });
    return r;
  });
  // C: timed. Once the first eye wakes, all three must be lit within 6 s: one above, an iron eye (Lance) ahead, one drifting behind.
  gallery('gal_drown', 'd_entry', 37, 11, () => {
    const r = Room('gal_drown', 'Clockwork Eyes', 'drown', 30, 14, 8, 6, 2, 1, 'drowned').f(12); r.floorRow = 12;
    r.pz = { timer: 6 }; r.ambience = { drip: .5, water: .3, drone: .15 };
    r.b(22, 5, 8, 1).b(22, 1, 1, 4, 'E').p(13, 9, 3).p(17, 7, 3);
    r.e('target', 15, 3).e('target', 28, 11, { heavy: 1 }).e('target', 4, 8, { drift: 3, sp: 1.6 }).e('chest', 26, 4, { give: 'embers:120' });
    return r;
  });
  // D: everything at once, timed: a fixed mirror, a pivot mirror, an iron eye and a drifting eye behind a lantern grate.
  gallery('gal_spire', 's_foot', 6, 11, () => {
    const r = Room('gal_spire', "Lamplighter's Crown", 'spire', 32, 16, 11, 6, 2, 1, 'spire').f(14); r.floorRow = 14;
    r.pz = { timer: 10 }; r.ambience = { wind: .2, crack: .4, drone: .2 };
    r.b(20, 7, 11, 1).b(20, 1, 1, 6, 'E').b(21, 8, 1, 6, 'H').b(17, 4, 3, 1).p(11, 11, 3).p(16, 8, 4).p(18, 11, 3);
    r.e('mirror', 6, 3, { dir: '/' }).e('mirror', 13, 6, { dir: '/', rot: 1 });
    r.e('target', 18, 3).e('target', 1, 6).e('target', 29, 13, { heavy: 1 }).e('target', 25, 10, { drift: 1.5, sp: 1.2 });
    r.e('chest', 26, 6, { give: 'charm:glass' });
    return r;
  });

  /* ---------- state ---------- */
  const items = type => G.items.filter(i => i.type === type);
  const ctr = it => ({ x: it.cx, y: it.by - 8 + (it.oy || 0) });
  const solved = () => !!(G.room && G.save.flags['pz:' + G.room.id]);
  LF.aimExtra = () => (G.room && G.room.pz && !solved()) ? items('target').filter(t => !t.lit).map(ctr) : [];

  const loadO = G.loadRoom;
  G.loadRoom = function (id) {
    const r = loadO.apply(this, arguments), s = this.save;
    this.pzT = 0;
    // gallery doorways appear once the Ember Shot is yours
    if (!s.abil.shot) this.items = this.items.filter(it => !it.gallery);
    if (this.room.pz && s.flags['pz:' + this.room.id]) {
      const g = this.room.grid; for (let y = 0; y < this.room.h; y++) for (let x = 0; x < this.room.w; x++) if (g[y][x] === 'E') g[y][x] = '.';
      items('target').forEach(t => { t.lit = true; });
    }
    items('target').forEach((t, i) => { t.ph = i * 1.7; });
    return r;
  };

  function solve() {
    const s = G.save, id = G.room.id; s.flags['pz:' + id] = 1; G.pzT = 0;
    G.openAll('E'); G.sfx('win'); G.banner('The eyes are awake', 'The ember gate opens'); G.flashScreen('#ffd27a', .25);
    G.checkBounties(); LF.Save.write(s);
  }
  function light(t) {
    const c = ctr(t), all = items('target');
    t.lit = true; G.sfx('glow'); G.sfx('ok'); G.burst(c.x, c.y, 14, '#ffd27a', 90, 0); G.ring(c.x, c.y, '#ffb23a', 14);
    const n = all.filter(x => x.lit).length; G.floatText(c.x, c.y - 10, n + ' / ' + all.length, '#ffd27a');
    if (n >= all.length) { solve(); return; }
    if (G.room.pz.timer && G.pzT <= 0) G.pzT = G.room.pz.timer;
  }
  // called by js/shot.js for each shot each frame; true consumes the shot
  LF.shotHit = function (b) {
    if (!G.room || !G.room.pz) return false;
    for (const m of items('mirror')) {
      const c = ctr(m);
      if (b.mir === m || Math.abs(b.x - c.x) > 7 || Math.abs(b.y - c.y) > 7) continue;
      const vx = b.vx, vy = b.vy;
      if (m.dir === '/') { b.vx = -vy; b.vy = -vx; } else { b.vx = vy; b.vy = vx; }
      b.x = c.x; b.y = c.y; b.mir = m; b.life = Math.max(b.life, 1.3); b.tr.length = 0; m.flash = .2;
      G.sfx('glow'); G.burst(c.x, c.y, 6, '#c8e8ff', 60, 0);
    }
    for (const t of items('target')) {
      if (t.lit) continue;
      const c = ctr(t); if (Math.abs(b.x - c.x) > 6 + b.r || Math.abs(b.y - c.y) > 6 + b.r) continue;
      if (t.heavy && !b.lance) { G.sfx('hit'); G.floatText(c.x, c.y - 10, 'LANCE ONLY', '#b0c0ff'); G.burst(b.x, b.y, 5, '#b0c0ff', 50, 1); return true; }
      light(t); if (!b.lance) return true;
    }
    return false;
  };

  const simO = G.simulate;
  G.simulate = function (dt) {
    const stop = this.hitstopT > 0;
    simO.call(this, dt);
    if (stop || this.state !== 'play' || !this.room.pz) return;
    for (const t of items('target')) if (t.drift) t.oy = Math.sin(this.clock * t.sp + t.ph) * t.drift * T;
    for (const m of items('mirror')) m.flash = Math.max(0, (m.flash || 0) - dt);
    if (this.pzT > 0 && !solved()) {
      this.pzT -= dt;
      if (this.pzT <= 0) { this.pzT = 0; items('target').forEach(t => { t.lit = false; }); this.sfx('back'); this.floatText(this.player.cx, this.player.y - 10, 'THE EYES DIM', '#8a7aa8', true); }
    }
  };
  // a strike turns a pivot mirror
  const combatO = G.combat;
  G.combat = function () {
    combatO.apply(this, arguments);
    const pl = this.player, hb = pl.hitbox(); if (!hb || !pl.hitSet || !this.room.pz) return;
    for (const m of items('mirror')) {
      if (!m.rot || pl.hitSet.has(m)) continue;
      const c = ctr(m); if (!LF.overlap(hb, { x: c.x - 7, y: c.y - 7, w: 14, h: 14 })) continue;
      pl.hitSet.add(m); m.dir = m.dir === '/' ? '\\' : '/'; m.flash = .25; this.sfx('lever'); this.ring(c.x, c.y, '#c49bff', 12); this.burst(c.x, c.y, 8, '#c8e8ff', 70, 0);
    }
  };
  const intO = G.interact;
  G.interact = function (it) {
    if (it.type === 'portal' && it.gallery) setTimeout(() => this.banner(NAMES[it.to], this.save.flags['pz:' + it.to] ? 'Solved' : 'Wake every ember eye'), 450);
    return intO.apply(this, arguments);
  };

  /* ---------- drawing ---------- */
  const dtO = G.drawTiles;
  G.drawTiles = function (g, cam, t, room, P, lights) {
    dtO.apply(this, arguments);
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(room.w - 1, Math.floor((cam.x + W) / T)), y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(room.h - 1, Math.floor((cam.y + LF.H) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ch = room.grid[y][x], sx = x * T - cam.x, sy = y * T - cam.y;
      if (ch === 'E') {
        R(g, '#1c1010', sx, sy, T, T); R(g, '#5a3a28', sx, sy, T, 2); R(g, '#5a3a28', sx, sy + T - 2, T, 2);
        for (let i = 0; i < 3; i++) { R(g, '#6a3a22', sx + 2 + i * 5, sy + 2, 2, T - 4); R(g, '#a05a30', sx + 2 + i * 5, sy + 2, 1, T - 4); }
        const a = .45 + .35 * Math.sin(t * 4 + y * .9); g.globalAlpha = a; R(g, '#ff8a3d', sx + 6, sy + 6, 4, 4); R(g, '#ffd27a', sx + 7, sy + 7, 2, 2); g.globalAlpha = 1;
        if (lights && (x + y) % 2 === 0) lights.push({ x: x * T + 8, y: y * T + 8, r: 16, c: '#ff8a3d', a: .45 });
      } else if (ch === 'H') {
        for (let i = 0; i < 3; i++) { R(g, '#3a3a4a', sx + 1 + i * 6, sy, 2, T); R(g, '#7a7a8c', sx + 1 + i * 6, sy, 1, T); }
        R(g, '#3a3a4a', sx, sy + 3, T, 2); R(g, '#3a3a4a', sx, sy + 11, T, 2); R(g, '#7a7a8c', sx, sy + 3, T, 1);
      }
    }
  };
  const diO = G.drawItems;
  G.drawItems = function (g, cam, t, lights) {
    diO.apply(this, arguments);
    for (const it of this.items) {
      if (it.type === 'portal' && it.gallery) {
        const done = this.save.flags['pz:' + it.to];
        LF.drawText(g, done ? 'GALLERY SOLVED' : 'GALLERY', Math.round(it.cx - cam.x), Math.round(it.by - cam.y - 40), done ? '#7dffb0' : '#ffb23a', 'center');
        continue;
      }
      if (it.type !== 'target' && it.type !== 'mirror') continue;
      const c = ctr(it), x = Math.round(c.x - cam.x), y = Math.round(c.y - cam.y);
      if (x < -20 || x > W + 20 || y < -20 || y > LF.H + 20) continue;
      if (it.type === 'target') {
        if (it.drift) { g.globalAlpha = .25; R(g, '#8a7aa8', x, Math.round(it.by - 8 - it.drift * T - cam.y), 1, Math.round(it.drift * T * 2)); g.globalAlpha = 1; }
        const rim = it.heavy ? '#8a9ab8' : '#4a4060';
        R(g, '#05030f', x - 6, y - 7, 12, 14); R(g, '#05030f', x - 7, y - 6, 14, 12); R(g, rim, x - 6, y - 6, 12, 12); R(g, '#1a1228', x - 4, y - 4, 8, 8);
        if (it.heavy) { R(g, '#c8d8f0', x - 6, y - 6, 2, 2); R(g, '#c8d8f0', x + 4, y - 6, 2, 2); R(g, '#c8d8f0', x - 6, y + 4, 2, 2); R(g, '#c8d8f0', x + 4, y + 4, 2, 2); }
        if (it.lit) { R(g, '#ff8a3d', x - 4, y - 4, 8, 8); R(g, '#ffd27a', x - 3, y - 3, 6, 6); R(g, '#fff2c9', x - 1, y - 1, 2, 2); lights.push({ x: c.x, y: c.y, r: 34, c: '#ffb860', a: 1 }); }
        else { g.globalAlpha = .35 + .25 * Math.sin(t * 3 + (it.ph || 0)); R(g, '#ffb23a', x - 1, y - 1, 2, 2); g.globalAlpha = 1; lights.push({ x: c.x, y: c.y, r: 12, c: '#8a6a50', a: .4 }); }
      } else {
        const fl = it.flash > 0;
        R(g, '#2a2040', x - 7, y - 7, 14, 1); R(g, '#2a2040', x - 7, y + 6, 14, 1); R(g, '#2a2040', x - 7, y - 7, 1, 14); R(g, '#2a2040', x + 6, y - 7, 1, 14);
        for (let i = 0; i < 11; i++) { const px = x - 5 + i, py = it.dir === '/' ? y + 5 - i : y - 5 + i; R(g, fl ? '#ffffff' : '#9ad0ff', px, py - 1, 1, 3); R(g, '#e8f6ff', px, py, 1, 1); }
        if (it.rot) { R(g, '#c49bff', x - 1, y + 7, 3, 2); g.globalAlpha = .5 + .3 * Math.sin(t * 4); R(g, '#c49bff', x - 8, y - 8, 2, 2); R(g, '#c49bff', x + 7, y + 7, 2, 2); g.globalAlpha = 1; }
        lights.push({ x: c.x, y: c.y, r: 18, c: '#9ad0ff', a: fl ? 1 : .5 });
      }
    }
  };
  const hudO = G.drawHUD;
  G.drawHUD = function (g) {
    hudO.call(this, g);
    if (!this.room || !this.room.pz || this.state === 'dead') return;
    const all = items('target'), n = all.filter(x => x.lit).length;
    LF.drawText(g, solved() ? 'GALLERY SOLVED' : 'EYES ' + n + ' / ' + all.length, W / 2, 14, solved() ? '#7dffb0' : '#ffd27a', 'center');
    if (this.pzT > 0) { const k = this.pzT / this.room.pz.timer; R(g, '#05030f', W / 2 - 31, 18, 62, 5); R(g, '#2a1f3a', W / 2 - 30, 19, 60, 3); R(g, k < .3 ? '#ff6f7d' : '#ffb23a', W / 2 - 30, 19, Math.round(60 * k), 3); }
  };

  /* ---------- stats, help ---------- */
  const statsO = UI.tab_stats;
  UI.tab_stats = function (body) {
    const r = statsO.apply(this, arguments), col = body.querySelector('.col');
    if (col) col.insertAdjacentHTML('beforeend', '<div class="stat"><span>Lamplight Galleries</span><b>' + GALS.filter(id => G.save.flags['pz:' + id]).length + ' / ' + GALS.length + '</b></div>');
    return r;
  };
  const helpO = UI.helpHTML;
  UI.helpHTML = function () {
    const h = helpO.apply(this, arguments), tip = '<div class="entry"><b>Lamplight Galleries:</b> once you have the Ember Shot, glowing GALLERY doorways appear in four rooms. Shoot every ember eye to open the gate. Mirrors bend shots; strike a pivot mirror to turn it. Iron-ringed eyes need a Lance, grates let shots through, and some rooms are timed.</div>';
    const i = h.lastIndexOf('</div></div>');
    return i < 0 ? h : h.slice(0, i) + tip + h.slice(i);
  };
})();
