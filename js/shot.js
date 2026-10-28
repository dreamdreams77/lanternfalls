/* Lanternfall - Ember Shot: aimed ranged shots with aim assist, a held charge that looses a piercing Lance, shot charms, upgrades and bounties */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, In = LF.input, S = LF.Sprites, UI = LF.UI, Phys = LF.Phys;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const CHARGE = .7, REGEN = .8, TAU = Math.PI * 2;
  Object.assign(G, { shots: [], ammo: 3, ammoT: 0, chargeT: 0, chReady: false, shotCD: 0, hopUsed: false });
  const ext = () => { const e = G.save.ext = G.save.ext || {}; e.shotHits = e.shotHits || 0; e.lanceKills = e.lanceKills || 0; e.pops = e.pops || 0; return e; };
  const up = k => (G.save.up || {})[k] || 0;
  G.maxAmmo = function () { return 3 + up('quiver'); };

  /* ---------- icons, charms, shop ---------- */
  S.ICONS.spitfire = ['........', '.....yy.', '...yYy..', 'yyYYwYy.', '...yYy..', '.....yy.', '........', '........'];
  S.ICONS.seeker = ['......r.', '.....rr.', '....r...', '..yy....', '.yYwy...', '.yYYy...', '..yy....', '........'];
  S.ICONS.quiver = ['.....y..', '....yY..', '...nyy..', '..nn....', '.nnn.y..', 'nnn.yY..', '.n..yy..', '........'];
  S.ICONS.lance = ['........', '......w.', 'yyyyYYww', 'YYYYYYYw', 'yyyyYYww', '......w.', '........', '........'];
  LF.CHARMS.spitfire = { name: 'Spitfire', icon: 'spitfire', desc: 'Ember Shots fork into three.' };
  LF.CHARMS.seeker = { name: 'Seeker Ember', icon: 'seeker', desc: 'Ember Shots curve toward nearby foes.' };
  LF.SHOP.splice(LF.SHOP.findIndex(i => i.type === 'slot'), 0, { id: 'spitfire', type: 'charm', cost: 190 });
  LF.SHOP.push({ id: 'quiver', type: 'up', key: 'quiver', name: 'Ember Quiver', icon: 'quiver', desc: 'Carry one more Ember Shot.', costs: [140, 280] },
    { id: 'lance', type: 'up', key: 'lance', name: 'Kindled Lance', icon: 'lance', desc: 'Charged Lances hit harder.', costs: [180, 340] });
  S.ICONS.shot = ['........', '..yy....', '.yYwy.y.', 'yYwwYyyy', '.yYwy.y.', '..yy....', '........', '........'];
  LF.ABIL_INFO.shot = ['Ember Shot', 'Fire embers from afar. Hold to charge a Lance.', 'shot'];
  LF.TIPS.shot = LF.TIPS.shoot = ['G or B fires an Ember Shot (aim with UP / DOWN). Hold it to charge a piercing Lance.', 'Tap SHOT to fire at the nearest foe. Drag from SHOT to aim. Hold it to charge a piercing Lance.'];
  const BOSS_SHOT = .5, BOSS_LANCE = .6; // bosses shrug off part of a shot, so melee stays the main way to fight them

  /* ---------- sounds ---------- */
  const sfxO = LF.Audio.sfx;
  LF.Audio.sfx = function (n, p) {
    if (n !== 'shot' && n !== 'lance' && n !== 'charge') return sfxO.call(this, n, p);
    if (!this.ready || LF.settings.mute) return;
    if (n === 'shot') { this.tone('square', 1150, 420, .07, .05); this.noise(.05, .12, 'highpass', 2600, 1200); }
    else if (n === 'lance') { this.tone('sawtooth', 280, 900, .18, .08); this.noise(.25, .3, 'bandpass', 1800, 400); this.tone('square', 150, 60, .2, .1); }
    else { this.tone('triangle', 600, 1400, .16, .06); this.tone('sine', 1500, 1500, .14, .05, .1); }
  };

  /* ---------- aiming: 8 directions from the held keys, then a gentle snap toward a foe in line of sight ---------- */
  function clear(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
    for (let i = 1; i < n; i++) if (Phys.solid(G.tile(Math.floor((x0 + (x1 - x0) * i / n) / T), Math.floor((y0 + (y1 - y0) * i / n) / T)))) return false;
    return true;
  }
  function aim(pl) {
    const ax = In.axis, u = In.isDown('up'), d = In.isDown('down') && !pl.onGround, f = ax || pl.face;
    let a = u ? (ax ? Math.atan2(-1, ax) : -Math.PI / 2) : d ? (ax ? Math.atan2(1, ax) : Math.PI / 2) : (f > 0 ? 0 : Math.PI);
    if (LF.touchAim != null) a = LF.touchAim;
    // a plain touch tap has no way to aim, so it looks for a foe across a much wider arc
    const cone = LF.touchAim == null && In.lastDevice === 'touch' && !u && !d ? 1.25 : .38;
    let best = null, bs = 1e9;
    for (const e of G.enemies) {
      if (e.dead || (e.kind === 'boss' && !e.active)) continue;
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = ex - pl.cx, dy = ey - pl.cy, dist = Math.hypot(dx, dy);
      if (dist > 210 || dist < 4) continue;
      let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = TAU - da;
      if (da > cone) continue;
      const sc = dist * (1 + da * 2);
      if (sc < bs && clear(pl.cx, pl.cy, ex, ey)) { bs = sc; best = Math.atan2(dy, dx); }
    }
    return best == null ? a : best;
  }

  function fire(lance) {
    const pl = G.player, s = G.save, a = aim(pl), cs = Math.cos(a), sn = Math.sin(a);
    if (Math.abs(cs) > .3) pl.face = cs > 0 ? 1 : -1;
    const sp = lance ? 340 : 280, ox = pl.cx + cs * 7, oy = pl.cy - 1 + sn * 6;
    const mk = (an, k) => G.shots.push({ x: ox, y: oy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: (lance ? .9 : .7) * k, r: lance ? 4 : 2,
      dmg: lance ? 3 + s.dmgLvl + up('lance') : 1, lance, hit: new Set(), tr: [], col: lance ? '#ff9a3c' : '#ffd27a' });
    mk(a, 1);
    if (!lance && pl.hasCharm('spitfire')) { mk(a - .24, .55); mk(a + .24, .55); }
    for (let k = 0; k < (lance ? 12 : 5); k++) { const b = a + LF.rand(-.5, .5), v = LF.rand(40, lance ? 160 : 90); G.particles.push({ x: ox, y: oy, vx: Math.cos(b) * v, vy: Math.sin(b) * v, life: .18, max: .22, col: k % 2 ? '#fff2c9' : '#ffb23a', sz: 1, g: 0, glow: 1 }); }
    G.ring(ox, oy, lance ? '#ff9a3c' : '#ffd27a', lance ? 14 : 6);
    G.sfx(lance ? 'lance' : 'shot');
    if (lance) {
      G.shake(3); G.hitstop(.04); pl.vx -= cs * 90;
      // a Lance fired straight down mid-air launches you once per jump
      if (sn > .5 && !pl.onGround && !G.hopUsed) { G.hopUsed = true; pl.vy = -290; pl.jumping = false; G.floatText(pl.cx, pl.y + pl.h + 4, 'LANCE HOP', '#ff9a3c'); }
    } else if (sn > .6 && !pl.onGround) pl.vy = Math.min(pl.vy, -50);
    else pl.vx -= cs * 12;
  }

  /* ---------- simulation ---------- */
  function hitWall(b, tx, ty) {
    const k = tx + ',' + ty, ch = G.tile(tx, ty);
    if (ch !== 'S') return;
    const st = G.ts[k] || (G.ts[k] = { hp: 3 }); st.hp -= b.lance ? 3 : 1; G.sfx('crack'); G.burst(tx * T + 8, ty * T + 8, 6, '#9a8aa8', 60, 1);
    if (st.hp <= 0) G.breakTile(tx, ty);
  }
  function updateShots(dt) {
    const pl = G.player, seek = pl.hasCharm('seeker');
    for (let i = G.shots.length - 1; i >= 0; i--) {
      const b = G.shots[i]; b.life -= dt;
      if (seek && !b.lance) {
        let tgt = null, bd = 120;
        for (const e of G.enemies) { if (e.dead || b.hit.has(e) || (e.kind === 'boss' && !e.active)) continue; const d = LF.dist(b.x, b.y, e.x + e.w / 2, e.y + e.h / 2); if (d < bd) { bd = d; tgt = e; } }
        if (tgt) {
          const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(tgt.y + tgt.h / 2 - b.y, tgt.x + tgt.w / 2 - b.x), sp = Math.hypot(b.vx, b.vy);
          let d = want - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          const na = cur + LF.clamp(d, -6 * dt, 6 * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.tr.push(b.x, b.y); if (b.tr.length > (b.lance ? 14 : 8)) b.tr.splice(0, 2);
      b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.life <= 0;
      const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
      if (!dead && Phys.solid(G.tile(tx, ty))) { dead = true; hitWall(b, tx, ty); G.burst(b.x, b.y, b.lance ? 10 : 4, b.col, 60, 1); }
      const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      if (!dead) for (const e of G.enemies.slice()) {
        if (e.dead || b.hit.has(e) || (e.kind === 'boss' && !e.active)) continue;
        if (!LF.overlap(box, e.kind === 'boss' ? { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 } : e)) continue;
        b.hit.add(e); const dir = b.vx >= 0 ? 1 : -1, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        if (!b.lance && e.affix === 'shielded' && Math.abs(b.vx) > Math.abs(b.vy) && e.face === -dir) {
          G.sfx('hit'); G.floatText(cx, e.y - 4, 'BLOCKED', '#b0c0ff'); G.ring(cx - dir * 6, cy, '#b0c0ff', 10); dead = true; break;
        }
        let killed;
        if (e.kind === 'boss') { LF.Bosses.hurt(e, b.lance ? Math.max(1, Math.round(b.dmg * BOSS_LANCE)) : b.dmg * BOSS_SHOT, dir, G); killed = e.dead || e.hp <= 0; }
        else { killed = LF.hurtEnemy(e, b.dmg, dir, G); if (!killed && !b.lance) e.vx *= .5; }
        if (b.lance && !killed && pl.hasCharm('frost')) e.chill = 2.4;
        const x = ext(); x.shotHits++; if (killed && b.lance) x.lanceKills++;
        G.addFlare(b.lance ? 6 : 2); G.hitstop(b.lance ? .05 : .015); G.burst(b.x, b.y, b.lance ? 12 : 6, b.col, 90, 1);
        if (!b.lance) { dead = true; break; }
      }
      // shots knock enemy projectiles out of the air; a Lance carries on through them
      if (!dead) for (let j = G.projectiles.length - 1; j >= 0; j--) {
        const p = G.projectiles[j]; if (p.harmless || !LF.overlap(box, p)) continue;
        G.projectiles.splice(j, 1); ext().pops++; G.burst(p.x, p.y, 8, p.col || '#fff', 70, 1); G.floatText(p.x, p.y - 6, 'POP', '#7ad8ff'); G.sfx('hit');
        if (!b.lance) { dead = true; break; }
      }
      if (dead) G.shots.splice(i, 1);
    }
    if (G.shots.length) G.checkBounties();
  }

  const simO = G.simulate;
  G.simulate = function (dt) {
    const stop = this.hitstopT > 0;
    simO.call(this, dt);
    if (stop || this.state !== 'play') return;
    const pl = this.player, s = this.save, max = this.maxAmmo();
    if (pl.onGround) this.hopUsed = false;
    this.shotCD = Math.max(0, this.shotCD - dt);
    if (this.ammo < max) { this.ammoT += dt; if (this.ammoT >= REGEN) { this.ammoT = 0; this.ammo++; } } else { this.ammo = max; this.ammoT = 0; }
    const can = s.abil.shot && !pl.dead && pl.hurtT <= 0 && pl.dashT <= 0;
    if (can && In.hit('shoot')) {
      if (this.ammo >= 1 && this.shotCD <= 0) { this.ammo--; this.shotCD = .13; fire(false); }
      else { this.sfx('back'); this.floatText(pl.cx, pl.y - 8, 'NO SHOTS', '#8a7aa8'); }
      this.chargeT = .001;
    } else if (this.chargeT > 0) {
      if (In.isDown('shoot') && can) {
        this.chargeT += dt;
        if (this.chargeT > .2 && Math.random() < .6) { const a = Math.random() * TAU; this.particles.push({ x: pl.cx + Math.cos(a) * 14, y: pl.cy + Math.sin(a) * 14, vx: -Math.cos(a) * 50, vy: -Math.sin(a) * 50, life: .26, max: .3, col: this.ammo >= 2 ? '#ffb23a' : '#6a5a80', sz: 1, g: 0, glow: 1 }); }
        if (this.chargeT >= CHARGE && !this.chReady && this.ammo >= 2) { this.chReady = true; this.sfx('charge'); this.ring(pl.cx, pl.cy, '#ff9a3c', 16); }
      } else {
        if (this.chargeT >= CHARGE && this.ammo >= 2 && can) { this.ammo -= 2; fire(true); }
        this.chargeT = 0; this.chReady = false;
      }
    }
    if (!In.isDown('shoot') && !this.chargeT) LF.touchAim = null;
    updateShots(dt);
  };
  const resetShots = function () { this.shots = []; this.chargeT = 0; this.chReady = false; this.ammo = this.save ? this.maxAmmo() : 3; this.ammoT = 0; };
  const loadO = G.loadRoom; G.loadRoom = function () { const r = loadO.apply(this, arguments); resetShots.call(this); return r; };

  /* ---------- unlock: the Thornmother's fall kindles the Ember Shot ---------- */
  const startO = G.start;
  G.start = function (s) { if (s.flags.boss_thorn) s.abil.shot = true; return startO.apply(this, arguments); }; // saves already past her
  const killO = G.killBoss;
  G.killBoss = function (b) {
    killO.apply(this, arguments);
    if (b.id === 'thorn' && !this.save.abil.shot) setTimeout(() => { if (!this.save.abil.shot) { this.give('abil:shot'); LF.refreshTouch && LF.refreshTouch(); } }, 3400);
  };

  /* ---------- touch: drag from the SHOT button to aim; a tap fires at the nearest foe ---------- */
  const sb = document.querySelector('#touch [data-k=shoot]');
  if (sb) {
    let tp = null;
    const press = () => { if (tp && !tp.pressed) { tp.pressed = true; In.set('shoot', true, 'touch'); } };
    const end = e => {
      if (!tp || e.pointerId !== tp.id) return;
      clearTimeout(tp.timer); press(); In.set('shoot', false); sb.classList.remove('on'); tp = null;
    };
    sb.addEventListener('pointerdown', e => {
      e.preventDefault(); if (tp) return;
      try { sb.setPointerCapture(e.pointerId); } catch (_) {}
      tp = { id: e.pointerId, p0: LF.toGame(e.clientX, e.clientY), pressed: false }; LF.touchAim = null; sb.classList.add('on'); In.lastDevice = 'touch';
      tp.timer = setTimeout(press, 140); // held still: fire at once and start charging
    });
    sb.addEventListener('pointermove', e => {
      if (!tp || e.pointerId !== tp.id) return;
      const p = LF.toGame(e.clientX, e.clientY), dx = p.x - tp.p0.x, dy = p.y - tp.p0.y;
      if (Math.hypot(dx, dy) < 5) return;
      LF.touchAim = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4); press();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => sb.addEventListener(n, end));
  }

  /* ---------- drawing: streaking shots, charge glow, ammo pips ---------- */
  const dpO = S.drawPlayer;
  S.drawPlayer = function (g, pl, cam, t) {
    dpO.call(this, g, pl, cam, t);
    if (G.chargeT > .2 && !pl.dead) {
      const k = Math.min(1, G.chargeT / CHARGE), x = pl.cx - cam.x, y = pl.cy - cam.y, on = G.chReady && Math.sin(t * 30) > 0;
      g.globalAlpha = .5 + .5 * k; R(g, on ? '#fff2c9' : '#ff9a3c', x + pl.face * 6 - 1, y - 2, 3, 3); g.globalAlpha = 1;
    }
    if (LF.touchAim != null && G.chargeT > 0 && !pl.dead) for (let i = 1; i <= 3; i++) R(g, i === 3 ? '#fff2c9' : '#ffb23a', pl.cx - cam.x + Math.cos(LF.touchAim) * (6 + i * 6) - 1, pl.cy - cam.y + Math.sin(LF.touchAim) * (6 + i * 6) - 1, 2, 2);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const b of G.shots) {
      const n = b.tr.length / 2;
      for (let i = 0; i < n; i++) { g.globalAlpha = (i + 1) / n * .55; const sz = b.lance ? 3 : 2; R(g, b.col, b.tr[i * 2] - cam.x - sz / 2, b.tr[i * 2 + 1] - cam.y - sz / 2, sz, sz); }
    }
    g.restore(); g.globalAlpha = 1;
    for (const b of G.shots) {
      const x = b.x - cam.x, y = b.y - cam.y, r = b.r;
      R(g, b.col, x - r - 1, y - r, r * 2 + 2, r * 2); R(g, b.col, x - r, y - r - 1, r * 2, r * 2 + 2); R(g, '#fff', x - r / 2, y - r / 2, Math.max(1, r), Math.max(1, r));
    }
  };
  const dlO = G.drawLighting;
  G.drawLighting = function (g, cam, lights, room, P) {
    for (const b of this.shots) lights.push({ x: b.x, y: b.y, r: b.lance ? 36 : 20, c: b.col, a: .9 });
    if (this.chReady && this.player) lights.push({ x: this.player.cx, y: this.player.cy, r: 30, c: '#ff9a3c', a: .8 });
    return dlO.call(this, g, cam, lights, room, P);
  };
  const hudO = G.drawHUD;
  G.drawHUD = function (g) {
    hudO.call(this, g);
    if (!this.save || this.state === 'dead' || !this.save.abil.shot) return;
    const max = this.maxAmmo();
    for (let i = 0; i < max; i++) {
      const x = 8 + i * 6, full = i < this.ammo, part = i === this.ammo ? this.ammoT / REGEN : 0;
      R(g, '#05030f', x - 1, 37, 6, 6); R(g, '#2a1f3a', x, 38, 4, 4);
      if (full) { R(g, '#ff8a3d', x, 38, 4, 4); R(g, '#ffd27a', x + 1, 38, 2, 3); R(g, '#fff2c9', x + 1, 39, 1, 1); }
      else if (part > 0) R(g, '#7a4a2a', x, 42 - Math.round(4 * part), 4, Math.round(4 * part));
    }
    if (this.chReady) LF.drawText(g, 'LANCE', 10 + max * 6, 43, '#ff9a3c');
  };

  /* ---------- bounties, stats, help ---------- */
  LF.BOUNTIES.push(
    { id: 'sharp', name: 'Sharpshooter', desc: 'Land 40 Ember Shots on foes.', test: s => [(s.ext || {}).shotHits || 0, 40], reward: 'charm:seeker', rtxt: 'Seeker Ember charm' },
    { id: 'lancer', name: 'Lancer', desc: 'Defeat 8 foes with a charged Lance.', test: s => [(s.ext || {}).lanceKills || 0, 8], reward: 'embers:160', rtxt: '160 embers' },
    { id: 'pops', name: 'Skeet Flame', desc: 'Shoot 15 enemy shots out of the air.', test: s => [(s.ext || {}).pops || 0, 15], reward: 'embers:120', rtxt: '120 embers' }
  );
  const statsO = UI.tab_stats;
  UI.tab_stats = function (body) {
    const r = statsO.apply(this, arguments), s = G.save.ext || {}, col = body.querySelector('.col');
    if (col) col.insertAdjacentHTML('beforeend', [['Ember Shots landed', s.shotHits || 0], ['Lance kills', s.lanceKills || 0], ['Shots popped', s.pops || 0]].map(x => '<div class="stat"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join(''));
    return r;
  };
  const helpO = UI.helpHTML;
  UI.helpHTML = function () {
    const h = helpO.apply(this, arguments), tip = '<div class="entry"><b>Ember Shot</b> (after the Thornmother): fire with G / B. Hold UP or DOWN to aim; on touch, drag from SHOT to aim or just tap it to fire at the nearest foe. Shots lean toward foes in view. You carry 3 shots that refill on their own. Hold the button to charge a <b>Lance</b> (2 shots) that pierces foes, shields and enemy shots, cracks walls in one hit, and launches you upward when fired down mid-air.</div>';
    const i = h.lastIndexOf('</div></div>');
    return i < 0 ? h : h.slice(0, i) + tip + h.slice(i);
  };
})();
