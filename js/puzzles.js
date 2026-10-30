/* Lanternfall - Lamplight Galleries: optional shooting puzzle rooms with ember eyes (targets), mirrors, prisms, switch blocks, lantern grates and ember gates */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, S = LF.Sprites, UI = LF.UI, Phys = LF.Phys, Room = LF.Room, L = LF.Rooms.list;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  /* Tiles: E ember gate (solid, opens when every eye in the room is lit)
            H lantern grate (stops bodies, lets flame through)
            X / Y switch blocks: X is solid while the switch phase is 0, Y while it is 1 (shooting a switch crystal flips the phase) */
  const solidO = Phys.solid; Phys.solid = function (ch) { return ch === 'E' || ch === 'H' || (ch === 'X' && !G.pzPhase) || (ch === 'Y' && G.pzPhase === 1) || solidO.call(this, ch); };
  const isoO = LF.isSolidCh; LF.isSolidCh = ch => ch === 'E' || ch === 'H' || isoO(ch);
  Object.assign(G, { pzT: 0, pzPhase: 0, swCD: 0 });

  /* ---------- content: charm, lore, bounty ---------- */
  S.ICONS.glass = ['...b....', '..bwb...', '.bwbBb..', 'bwbyBBb.', '.bBYBb..', '..bBb...', '...b....', '........'];
  LF.CHARMS.glass = { name: 'Glass Ember', icon: 'glass', desc: 'Ember Shots ricochet once off walls.' };
  LF.LORE.gallery = ['Gallery Plaque', 'The lamplighters woke these eyes with flame thrown from afar. A strike will not do: the eyes answer only to fire on the wing. Wake them all and the ember gate yields.'];
  LF.LORE.mirror = ['Mirror Plaque', 'Glass bends flame. The glass on a pivot turns when struck. Iron-ringed eyes sleep deeply; only a Lance will wake them.'];
  S.ICONS.kindle = ['...y....', '..yYy...', '..yYy.y.', '.yYwYyY.', '.yYwwYy.', '..yYYy..', '...kk...', '..kkkk..'];
  LF.CHARMS.kindle = { name: 'Lamplight Wick', icon: 'kindle', desc: 'Ember Shots refill 30% faster.' };
  LF.LORE.order = ['Order Plaque', 'Some eyes keep count. Wake them in the order of their marks, or all of them close again. Mind what stands in your line of fire.'];
  LF.LORE.switch = ['Switch Plaque', 'Shoot the crystal and the blue and violet stones trade places: what was wall becomes air, what was air becomes wall.'];
  LF.LORE.prism = ['Prism Plaque', 'A prism parts one flame into two. Paired eyes, ringed in green, must wake together or not at all.'];
  LF.BOUNTIES.push({ id: 'lamp2', name: 'Master Lamplighter', desc: 'Solve all eight Lamplight Galleries.', test: s => [ALL.filter(id => s.flags['pz:' + id]).length, ALL.length], reward: 'embers:300', rtxt: '300 embers' });
  LF.BOUNTIES.push({ id: 'lamp', name: 'Lamplighter', desc: 'Solve all four Lamplight Galleries.', test: s => [GALS.filter(id => s.flags['pz:' + id]).length, GALS.length], reward: 'heart', rtxt: '+1 heart' });

  /* ---------- the four galleries ---------- */
  const GALS = ['gal_moss', 'gal_glim', 'gal_drown', 'gal_spire'], ALL = GALS.concat(['gal_order', 'gal_switch', 'gal_prism', 'gal_spin']);
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
  // E: numbered eyes must wake 1-2-3-4. Two sit on the floor in one line of fire, so shooting from the wrong side wakes #4 too early.
  gallery('gal_order', 'thicket', 5, 11, () => {
    const r = Room('gal_order', 'Order of Flames', 'moss', 30, 14, 2, 7, 2, 1, 'mossroot').f(12); r.floorRow = 12;
    r.pz = { timer: 0 }; r.ambience = { wind: .1, chirp: .3 };
    r.b(25, 1, 1, 11, 'E').p(8, 8, 3).p(16, 6, 3);
    r.e('lore', 5, 11, { id: 'order' }).e('target', 22, 3, { ord: 1 }).e('target', 3, 4, { ord: 2 }).e('target', 14, 11, { ord: 3 }).e('target', 20, 11, { ord: 4 });
    r.e('chest', 28, 11, { give: 'embers:100' });
    return r;
  });
  // F: a switch crystal trades blue (X) and violet (Y) stone. One eye needs the blue slot open, one the violet wall open, one a violet ledge to stand on.
  //    A second crystal inside the eye chamber means you can never be shut in there.
  gallery('gal_switch', 'g_altar', 19, 10, () => {
    const r = Room('gal_switch', 'Switchback', 'glim', 32, 14, 5, 7, 2, 1, 'glimmer').f(12); r.floorRow = 12;
    r.pz = { timer: 0 }; r.ambience = { drip: .4, drone: .25 };
    r.b(20, 1, 1, 11).s(20, 3, 'X').b(20, 6, 1, 5, 'Y').b(21, 4, 5, 1).b(26, 1, 1, 11, 'E');
    r.b(1, 6, 2, 1).b(4, 6, 3, 1, 'Y').p(9, 9, 2).p(14, 9, 3).p(14, 4, 3);
    r.e('lore', 5, 11, { id: 'switch' }).e('switch', 17, 1).e('switch', 22, 5).e('target', 24, 3).e('target', 24, 8).e('target', 1, 5).e('chest', 29, 11, { give: 'embers:120' });
    return r;
  });
  // G: prisms split one shot into two; each pair of eyes must wake within half a second of each other.
  gallery('gal_prism', 'd_glide', 24, 11, () => {
    const r = Room('gal_prism', 'Prism Chamber', 'drown', 30, 14, 8, 7, 2, 1, 'drowned').f(12); r.floorRow = 12;
    r.pz = { timer: 0 }; r.ambience = { drip: .5, water: .25, drone: .15 };
    r.b(24, 1, 1, 11, 'E').p(4, 10, 2).p(8, 8, 3);
    r.e('lore', 5, 11, { id: 'prism' }).e('prism', 15, 7).e('target', 15, 2, { pair: 'a' }).e('target', 15, 11, { pair: 'a' });
    r.e('prism', 6, 3).e('target', 2, 3, { pair: 'b' }).e('target', 10, 3, { pair: 'b' }).e('chest', 27, 11, { give: 'embers:140' });
    return r;
  });
  // H: timed finale. A mirror that flips by itself every 1.2 s sends shots left or right; an iron eye waits behind a grate and one eye drifts.
  gallery('gal_spin', 's_climb', 22, 41, () => {
    const r = Room('gal_spin', 'Spinning Glass', 'spire', 32, 16, 11, 7, 2, 1, 'spire').f(14); r.floorRow = 14;
    r.pz = { timer: 12 }; r.ambience = { wind: .25, crack: .4, drone: .2 };
    r.b(20, 1, 1, 8).b(20, 9, 1, 5, 'H').b(26, 1, 1, 13, 'E').b(17, 4, 2, 1).b(1, 4, 2, 1).p(3, 10, 3);
    r.e('mirror', 8, 3, { dir: '/', spin: 1.2 }).e('target', 18, 3).e('target', 1, 3).e('target', 23, 13, { heavy: 1 }).e('target', 12, 8, { drift: 2, sp: 1.5 });
    r.e('chest', 29, 13, { give: 'charm:kindle' });
    return r;
  });

  /* ---------- state ---------- */
  const items = type => G.items.filter(i => i.type === type);
  const ctr = it => ({ x: it.cx, y: it.by - 8 + (it.oy || 0) });
  const solved = () => !!(G.room && G.save.flags['pz:' + G.room.id]);
  const nextOrd = () => 1 + items('target').filter(t => t.ord && t.lit).length;
  // aim assist leans toward unlit eyes (only the next one, in a numbered room). Drifting eyes are left out:
  // assist would aim where they are now, undoing the lead a player gives a moving target.
  LF.aimExtra = () => (G.room && G.room.pz && !solved()) ? items('target').filter(t => !t.lit && !t.drift && (!t.ord || t.ord === nextOrd())).map(ctr) : [];

  const loadO = G.loadRoom;
  G.loadRoom = function (id) {
    const r = loadO.apply(this, arguments), s = this.save;
    this.pzT = 0; this.pzPhase = 0; this.swCD = 0;
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
  function dim(msg) { items('target').forEach(t => { t.lit = false; }); G.pzT = 0; G.sfx('back'); G.floatText(G.player.cx, G.player.y - 10, msg, '#8a7aa8', true); }
  function light(t) {
    const c = ctr(t), all = items('target');
    if (t.ord && t.ord !== nextOrd()) { G.burst(c.x, c.y, 10, '#ff6f7d', 70, 0); dim('WRONG ORDER'); return; }
    t.lit = true; t.litAt = G.clock; G.sfx('glow'); G.sfx('ok'); G.burst(c.x, c.y, 14, '#ffd27a', 90, 0); G.ring(c.x, c.y, '#ffb23a', 14);
    const n = all.filter(x => x.lit).length; G.floatText(c.x, c.y - 10, n + ' / ' + all.length, '#ffd27a');
    if (n >= all.length) { solve(); return; }
    if (G.room.pz.timer && G.pzT <= 0) G.pzT = G.room.pz.timer;
  }
  // called by js/shot.js for each shot each frame; true consumes the shot
  LF.shotHit = function (b) {
    if (!G.room || !G.room.pz) return false;
    const near = (it, d) => { const c = ctr(it); return Math.abs(b.x - c.x) <= d && Math.abs(b.y - c.y) <= d; };
    for (const sw of items('switch')) {
      if (!near(sw, 7)) continue;
      if (G.swCD <= 0) toggle(sw);
      return true;
    }
    for (const pr of items('prism')) {
      if (b.pri === pr || !near(pr, 7)) continue;
      if (G.shots.length > 40) return true; // aligned prisms must not multiply shots without end
      const c = ctr(pr); G.sfx('glow'); G.burst(c.x, c.y, 10, '#c8e8ff', 70, 0); pr.flash = .2;
      for (const s of [1, -1]) G.shots.push(Object.assign({}, b, { x: c.x, y: c.y, vx: -b.vy * s, vy: b.vx * s, pri: pr, life: Math.max(b.life, 1.3), hit: new Set(), tr: [] }));
      return true;
    }
    for (const m of items('mirror')) {
      const c = ctr(m);
      if (b.mir === m || Math.abs(b.x - c.x) > 7 || Math.abs(b.y - c.y) > 7) continue;
      const vx = b.vx, vy = b.vy;
      if (m.dir === '/') { b.vx = -vy; b.vy = -vx; } else { b.vx = vy; b.vy = vx; }
      b.x = c.x; b.y = c.y; b.mir = m; b.tr.length = 0; m.flash = .2;
      b.refl = (b.refl || 0) + 1; if (b.refl <= 8) b.life = Math.max(b.life, 1.3); // facing mirrors must not keep a shot alive forever
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

  // flip the switch blocks, unless that would shut a block on top of you
  function toggle(sw) {
    const pl = G.player, c = ctr(sw); G.pzPhase = G.pzPhase ? 0 : 1; G.swCD = .3;
    if (Phys.anyTile(G, pl.x, pl.y, pl.w, pl.h, ch => (ch === 'X' || ch === 'Y') && Phys.solid(ch))) { G.pzPhase = G.pzPhase ? 0 : 1; G.sfx('back'); G.floatText(pl.cx, pl.y - 10, 'STAND CLEAR', '#8a7aa8'); return; }
    sw.flash = .3; G.sfx('lever'); G.sfx('glow'); G.ring(c.x, c.y, G.pzPhase ? '#c49bff' : '#7ad8ff', 16); G.shake(2);
  }
  const simO = G.simulate;
  G.simulate = function (dt) {
    const stop = this.hitstopT > 0;
    simO.call(this, dt);
    if (stop || this.state !== 'play' || !this.room.pz) return;
    for (const t of items('target')) if (t.drift) t.oy = Math.sin(this.clock * t.sp + t.ph) * t.drift * T;
    for (const m of items('mirror')) {
      m.flash = Math.max(0, (m.flash || 0) - dt);
      if (m.spin) { m.spinT = (m.spinT || 0) + dt; if (m.spinT >= m.spin) { m.spinT = 0; m.dir = m.dir === '/' ? '\\' : '/'; m.flash = .12; } }
    }
    for (const it of items('switch').concat(items('prism'))) it.flash = Math.max(0, (it.flash || 0) - dt);
    this.swCD = Math.max(0, this.swCD - dt);
    // a paired eye goes dark again if its partner does not wake within half a second
    if (!solved()) for (const t of items('target')) {
      if (!t.pair || !t.lit || this.clock - t.litAt < .5) continue;
      if (!items('target').some(o => o !== t && o.pair === t.pair && o.lit)) { t.lit = false; const c = ctr(t); this.burst(c.x, c.y, 8, '#7dffb0', 50, 0); this.floatText(c.x, c.y - 10, 'NEEDS ITS PAIR', '#7dffb0'); this.sfx('back'); }
    }
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
      } else if (ch === 'X' || ch === 'Y') {
        const on = Phys.solid(ch), col = ch === 'X' ? '#7ad8ff' : '#c49bff', dk = ch === 'X' ? '#2a4a7a' : '#4a2a6a';
        if (on) { R(g, dk, sx, sy, T, T); R(g, col, sx + 1, sy + 1, T - 2, T - 2); R(g, '#ffffff', sx + 2, sy + 2, 4, 1); R(g, dk, sx + 4, sy + 4, T - 8, T - 8); if (lights && (x + y) % 2) lights.push({ x: x * T + 8, y: y * T + 8, r: 14, c: col, a: .4 }); }
        else { g.globalAlpha = .45; for (let i = 0; i < T; i += 4) { R(g, col, sx + i, sy, 2, 1); R(g, col, sx + i, sy + T - 1, 2, 1); R(g, col, sx, sy + i, 1, 2); R(g, col, sx + T - 1, sy + i, 1, 2); } g.globalAlpha = 1; }
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
      if (it.type !== 'target' && it.type !== 'mirror' && it.type !== 'switch' && it.type !== 'prism') continue;
      const c = ctr(it), x = Math.round(c.x - cam.x), y = Math.round(c.y - cam.y);
      if (x < -20 || x > W + 20 || y < -20 || y > LF.H + 20) continue;
      if (it.type === 'switch') {
        const col = this.pzPhase ? '#c49bff' : '#7ad8ff', fl = it.flash > 0;
        for (let i = 0; i < 6; i++) { R(g, fl ? '#ffffff' : col, x - i, y - 6 + i, i * 2 + 1, 1); R(g, fl ? '#ffffff' : col, x - i, y + 6 - i, i * 2 + 1, 1); }
        R(g, '#ffffff', x - 1, y - 3, 2, 2); lights.push({ x: c.x, y: c.y, r: 26, c: col, a: .9 });
        continue;
      }
      if (it.type === 'prism') {
        const fl = it.flash > 0; R(g, '#2a2040', x - 6, y + 4, 12, 2);
        for (let i = 0; i < 9; i++) { R(g, fl ? '#ffffff' : '#c8e8ff', x - Math.floor(i * .6), y - 5 + i, Math.floor(i * 1.2) + 1, 1); }
        const k = Math.floor(this.clock * 6) % 3; R(g, ['#ff8a3d', '#7dffb0', '#7ad8ff'][k], x - 1, y, 2, 2);
        lights.push({ x: c.x, y: c.y, r: 22, c: '#c8e8ff', a: fl ? 1 : .6 });
        continue;
      }
      if (it.type === 'target') {
        if (it.drift) { g.globalAlpha = .25; R(g, '#8a7aa8', x, Math.round(it.by - 8 - it.drift * T - cam.y), 1, Math.round(it.drift * T * 2)); g.globalAlpha = 1; }
        const rim = it.heavy ? '#8a9ab8' : it.pair ? '#2f8f4c' : '#4a4060';
        R(g, '#05030f', x - 6, y - 7, 12, 14); R(g, '#05030f', x - 7, y - 6, 14, 12); R(g, rim, x - 6, y - 6, 12, 12); R(g, '#1a1228', x - 4, y - 4, 8, 8);
        if (it.heavy) { R(g, '#c8d8f0', x - 6, y - 6, 2, 2); R(g, '#c8d8f0', x + 4, y - 6, 2, 2); R(g, '#c8d8f0', x - 6, y + 4, 2, 2); R(g, '#c8d8f0', x + 4, y + 4, 2, 2); }
        if (it.lit) { R(g, '#ff8a3d', x - 4, y - 4, 8, 8); R(g, '#ffd27a', x - 3, y - 3, 6, 6); R(g, '#fff2c9', x - 1, y - 1, 2, 2); lights.push({ x: c.x, y: c.y, r: 34, c: '#ffb860', a: 1 }); }
        else { g.globalAlpha = .35 + .25 * Math.sin(t * 3 + (it.ph || 0)); R(g, '#ffb23a', x - 1, y - 1, 2, 2); g.globalAlpha = 1; lights.push({ x: c.x, y: c.y, r: 12, c: '#8a6a50', a: .4 }); }
        if (it.ord) LF.drawText(g, String(it.ord), x, y - 9, it.lit ? '#7dffb0' : it.ord === nextOrd() ? '#ffd27a' : '#8a7aa8', 'center');
      } else {
        const fl = it.flash > 0;
        R(g, '#2a2040', x - 7, y - 7, 14, 1); R(g, '#2a2040', x - 7, y + 6, 14, 1); R(g, '#2a2040', x - 7, y - 7, 1, 14); R(g, '#2a2040', x + 6, y - 7, 1, 14);
        for (let i = 0; i < 11; i++) { const px = x - 5 + i, py = it.dir === '/' ? y + 5 - i : y - 5 + i; R(g, fl ? '#ffffff' : '#9ad0ff', px, py - 1, 1, 3); R(g, '#e8f6ff', px, py, 1, 1); }
        if (it.spin) { const k = (it.spinT || 0) / it.spin; R(g, '#05030f', x - 7, y + 8, 14, 3); R(g, '#ffb23a', x - 6, y + 9, Math.round(12 * k), 1); }
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
    if (col) col.insertAdjacentHTML('beforeend', '<div class="stat"><span>Lamplight Galleries</span><b>' + ALL.filter(id => G.save.flags['pz:' + id]).length + ' / ' + ALL.length + '</b></div>');
    return r;
  };
  const helpO = UI.helpHTML;
  UI.helpHTML = function () {
    const h = helpO.apply(this, arguments), tip = '<div class="entry"><b>Lamplight Galleries:</b> once you have the Ember Shot, glowing GALLERY doorways appear in eight rooms. Shoot every ember eye to open the gate. Mirrors bend shots; strike a pivot mirror to turn it, and time your shot on a spinning one. Iron-ringed eyes need a Lance, grates let shots through, numbered eyes wake in order, green-ringed eyes wake in pairs (use a prism), switch crystals swap blue and violet stone, and some rooms are timed.</div>';
    const i = h.lastIndexOf('</div></div>');
    return i < 0 ? h : h.slice(0, i) + tip + h.slice(i);
  };
})();
