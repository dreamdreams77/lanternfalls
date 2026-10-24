/* Lanternfall - world simulation: update loop, combat, items, interactions, tile states, trial */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, In = LF.input, cl = LF.clamp, Phys = LF.Phys;
  const INTERACT = { portal: 1, shrine: 1, npc: 1, lore: 1, chest: 1, lever: 1, lamp: 1, trial: 1 };
  const PROMPT = { shrine: 'Rest at shrine', npc: 'Talk', lore: 'Read', chest: 'Open', lever: 'Pull lever', lamp: 'Relight the Great Lantern', trial: 'Begin the Trial' };
  const TRIAL = [['slime', 'slime', 'beetle'], ['beetle', 'bat', 'bat'], ['husk', 'mothfoe', 'mothfoe', 'beetle'], ['husk', 'husk', 'wisp', 'wisp'], ['husk', 'beetle', 'wisp', 'bat', 'bat']];

  G.update = function (dt) {
    this.clock += dt;
    const f = this.fade;
    if (f.a !== f.to) { f.a = LF.approach(f.a, f.to, f.sp * dt); if (f.a === f.to && f.cb) { const cb = f.cb; f.cb = null; cb(); } }
    this.flash.a = Math.max(0, this.flash.a - dt * 1.6); this.shakeV = Math.max(0, this.shakeV - dt * 20);
    if (this.state === 'play') this.simulate(dt);
    else if (this.state === 'dead') this.updateDead(dt);
    else if (this.room) { this.updateParticles(dt); this.ambient(dt); }
  };

  G.updateDead = function (dt) {
    this.deadT += dt; const pl = this.player;
    pl.vy = Math.min(pl.vy + 900 * dt, 300); pl.y += pl.vy * dt; this.updateParticles(dt);
    if (this.deadT > 1.5 && this.fade.to !== 1) this.fadeTo(1, 2.5, () => this.respawn());
  };

  G.simulate = function (dt) {
    if (this.hitstopT > 0) { this.hitstopT -= dt; this.updateParticles(dt * .25); return; }
    const pl = this.player, s = this.save;
    s.time += dt;
    pl.update(this, dt);
    this.lightR = 62 + 14 * s.lightLvl + (pl.hasCharm('glow') ? 18 : 0);
    this.tod = this.room.area === 'moss' ? Math.max(0, Math.sin(s.time * .02 - .6)) * .5 : 0;
    this.combat();
    this.updateEnemies(dt);
    LF.updateProjectiles(this, dt); LF.updateHazards(this, dt);
    this.updateDrops(dt); this.updateItems(dt); this.updateTiles(dt); this.updateGates(); this.updateTrial(dt);
    this.updateParticles(dt); this.ambient(dt);
    // thornheart: hurt bursts nearby foes
    if (s.hp < this.prevHp && pl.hasCharm('thorn')) {
      this.burst(pl.cx, pl.cy, 24, '#7dffb0', 130, 1); this.sfx('break');
      for (const e of this.enemies.slice()) if (!e.dead && LF.dist(e.x + e.w / 2, e.y + e.h / 2, pl.cx, pl.cy) < 64) { if (e.kind === 'boss') LF.Bosses.hurt(e, 2, 1, this); else LF.hurtEnemy(e, 2, e.x > pl.x ? 1 : -1, this); }
    }
    this.prevHp = s.hp;
    if (this.safeT > 0) { this.safeT -= dt; if (this.safeT <= 0 && !pl.dead) { pl.teleport(pl.safe.x, pl.safe.y); pl.invul = 1.2; this.flashScreen('#c49bff', .3); this.burst(pl.cx, pl.cy, 14, '#c49bff', 80, 1); } }
    if (pl.y > this.room.h * T + 24 && !pl.dead) { pl.invul = 0; this.spikeHit(); }
    // doors
    if (this.doorCD > 0) this.doorCD -= dt;
    else if (!pl.dead) for (const k in this.room.doors) {
      const d = this.room.doors[k];
      if (LF.overlap({ x: d.x * T, y: d.y * T, w: d.w * T, h: d.h * T }, pl)) { this.sfx('door'); this.transition(() => { this.loadRoom(d.to, d.toName); if (this.save.flags.started) LF.Save.write(this.save); }); break; }
    }
    this.tutorial(dt); this.camUpdate(dt);
  };

  G.camUpdate = function (dt) {
    const pl = this.player, r = this.room, c = this.cam;
    const tx = pl.cx - W / 2 + cl(pl.vx * .22, -26, 26), ty = pl.cy - H / 2 - 8 + (In.isDown('down') && pl.onGround && Math.abs(pl.vx) < 5 && pl.healT <= 0 ? 24 : 0);
    c.x += (tx - c.x) * Math.min(1, dt * 7); c.y += (ty - c.y) * Math.min(1, dt * 6);
    c.x = r.w * T <= W ? (r.w * T - W) / 2 : cl(c.x, 0, r.w * T - W); c.y = r.h * T <= H ? (r.h * T - H) / 2 : cl(c.y, 0, r.h * T - H);
  };

  G.tutorial = function (dt) {
    const s = this.save, pl = this.player;
    if (this.room.id === 'glade' && !s.flags.wick_met) { this.tutT += dt; if (this.tutT > 1.5) this.tip('move'); if (this.tutT > 12 && s.seen['tip:move']) this.tip('attack'); }
    if (this.near) this.tip('interact');
    if (s.hp < s.maxHp && s.embers >= this.kindleCost() && pl.onGround) this.tip('heal');
    if (s.abil.dash && !s.seen['tip:dash']) this.tip('dash');
    if (this.room.id === 'g_cavern' && s.abil.dash === false) { /* nothing */ }
  };

  G.combat = function () {
    const pl = this.player, hb = pl.hitbox(); if (!hb || !pl.hitSet) return;
    for (const e of this.enemies.slice()) {
      if (e.dead || pl.hitSet.has(e) || (e.kind === 'boss' && !e.active)) continue;
      if (LF.overlap(hb, e)) {
        pl.hitSet.add(e); const dir = e.x + e.w / 2 > pl.cx ? 1 : -1;
        if (e.kind === 'boss') LF.Bosses.hurt(e, pl.dmg(), dir, this); else LF.hurtEnemy(e, pl.dmg(), dir, this);
        this.hitstop(.05); this.shake(2);
        if (pl.atkDir === 'd') { pl.vy = -230; pl.airJumps = 1; pl.dashed = false; pl.jumping = false; this.tip('pogo'); }
        else if (pl.atkDir === 'f') pl.vx -= pl.face * 45;
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) { const p = this.projectiles[i]; if (!p.harmless && LF.overlap(hb, { x: p.x, y: p.y, w: p.w, h: p.h })) { this.projectiles.splice(i, 1); this.burst(p.x, p.y, 6, p.col, 60, 1); this.sfx('hit'); } }
    // tiles: cracked walls and spike pogo
    let pogo = false;
    Phys.anyTile(this, hb.x, hb.y, hb.w, hb.h, (c, tx, ty) => {
      const k = tx + ',' + ty;
      if (c === 'S' && !pl.hitSet.has(k)) { pl.hitSet.add(k); const st = this.ts[k] || (this.ts[k] = { hp: 3 }); st.hp--; this.sfx('crack'); this.shake(2); this.burst(tx * T + 8, ty * T + 8, 6, '#9a8aa8', 60, 1); this.hitstop(.04); if (st.hp <= 0) this.breakTile(tx, ty); }
      if ((c === '^' || c === 'v') && pl.atkDir === 'd' && c === '^') pogo = true;
      return false;
    });
    if (pogo && pl.pogoT <= 0 && pl.vy > -80) { pl.vy = -230; pl.airJumps = 1; pl.dashed = false; pl.pogoT = .15; this.sfx('hit'); this.burst(pl.cx, pl.y + pl.h + 4, 6, '#fff2c9', 60, 1); }
  };

  G.updateEnemies = function (dt) {
    const pl = this.player;
    for (const e of this.enemies.slice()) {
      if (e.kind === 'boss') LF.Bosses.update(e, dt, this);
      else { if (Math.abs(e.x - pl.x) > 480) continue; LF.updateEnemy(e, dt, this); if (e.y > this.room.h * T + 60) { this.enemies.splice(this.enemies.indexOf(e), 1); continue; } }
      if (e.dead || (e.kind === 'boss' && !e.active)) continue;
      if (pl.invul <= 0 && !pl.dead && pl.dashT <= 0) {
        const r = e.kind === 'boss' ? { x: e.x + 5, y: e.y + 4, w: e.w - 10, h: e.h - 6 } : e;
        if (LF.overlap(r, pl)) pl.hurt(this, (e.d && e.d.contact) || 1, e.x + e.w / 2);
      }
    }
  };

  G.updateDrops = function (dt) {
    const pl = this.player, s = this.save, mag = pl.hasCharm('dust') ? 80 : 24;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.life -= dt; if (d.life <= 0) { this.drops.splice(i, 1); continue; }
      const dist = LF.dist(d.x, d.y, pl.cx, pl.cy);
      if (dist < mag && d.life < 27.5) { const a = Math.atan2(pl.cy - d.y, pl.cx - d.x); d.vx = Math.cos(a) * 130; d.vy = Math.sin(a) * 130; d.x += d.vx * dt; d.y += d.vy * dt; }
      else { d.vy = Math.min(d.vy + 520 * dt, 300); Phys.move(d, dt, this); if (d.onGround) { d.vy = -Math.abs(d.vy) * .3; d.vx *= .8; } }
      if (dist < 9) { s.embers += d.v; this.drops.splice(i, 1); this.sfx('ember'); this.spark(pl.cx, pl.cy - 4, '#ffd27a'); }
    }
  };

  G.updateItems = function (dt) {
    const pl = this.player, s = this.save, f = s.flags; this.near = null; let best = 99;
    for (const it of this.items.slice()) {
      const dx = it.cx - pl.cx, dy = (it.by - 8) - pl.cy, dist = Math.hypot(dx, dy), rm = () => this.items.splice(this.items.indexOf(it), 1);
      switch (it.type) {
        case 'ember': if (pl.hasCharm('dust') && dist < 60 && dist > 1) { it.cx -= dx / dist * 70 * dt; it.by -= dy / dist * 70 * dt; } if (dist < 11) { s.embers += 2; this.sfx('ember'); this.spark(it.cx, it.by - 8, '#ffd27a'); rm(); } break;
        case 'moth': if (dist < 15) { s.moths.push(it.id); this.sfx('moth'); this.burst(it.cx, it.by - 8, 20, '#c49bff', 80, 0); this.toast('Moth ' + s.moths.length + '/' + LF.totalMoths); rm(); LF.Save.write(s); } break;
        case 'frag': if (dist < 15) { f['frag:' + it.key] = 1; const n = Object.keys(f).filter(k => k.indexOf('frag:') === 0).length; this.sfx('heart'); this.burst(it.cx, it.by - 8, 20, '#ff8aa8', 80, 0); rm(); if (n % 4 === 0) this.give('heart'); else this.toast('Heart fragment ' + (n % 4) + '/4'); LF.Save.write(s); } break;
        case 'lost': if (dist < 15) { s.embers += it.n; s.lost = null; this.sfx('ember'); this.burst(it.cx, it.by - 8, 20, '#ffd27a', 90, 1); this.toast('Recovered ' + it.n + ' embers'); rm(); } break;
        case 'altar': if (!it.taken && Math.abs(dx) < 14 && Math.abs(dy) < 28) { it.taken = true; this.give(it.give); } break;
        default: if (INTERACT[it.type] && !(it.type === 'chest' && it.open) && !(it.type === 'lamp' && it.dark) && Math.abs(dx) < 20 && Math.abs(dy) < 26 && Math.abs(dx) < best) { best = Math.abs(dx); this.near = it; }
      }
    }
    if (this.near && In.hit('up') && pl.hurtT <= 0 && !pl.atkT) { this.interact(this.near); }
  };

  G.say = function (d) {
    this.setState('dialog'); In.clear();
    LF.UI.dialog(d, () => {
      this.setState('play'); In.clear();
      if (d.give) this.give(d.give);
      if (d.act === 'shop') LF.UI.shop();
      LF.Save.write(this.save);
    });
  };

  G.interact = function (it) {
    const s = this.save;
    switch (it.type) {
      case 'shrine': it.lit = true; this.checkpoint(it); this.tip('heal'); break;
      case 'npc': this.sfx('ui'); this.say(LF.DIALOG[it.id](this)); break;
      case 'lore': { const l = LF.LORE[it.id]; if (s.lore.indexOf(it.id) < 0) { s.lore.push(it.id); this.toast('Journal updated'); } this.sfx('glow'); this.say({ who: l[0], lines: [l[1]] }); break; }
      case 'chest': it.open = true; s.seen['c:' + it.key] = 1; this.sfx('ok'); this.burst(it.cx, it.by - 12, 20, '#ffd27a', 90, 1); this.give(it.give); break;
      case 'lever': if (!it.on) { it.on = true; s.flags['lever:' + this.room.id] = 1; this.sfx('lever'); if (!this.openAll('g')) this.toast('Something stirs far away...'); else this.toast('The bars rise.'); LF.Save.write(s); } break;
      case 'lamp': s.flags.ending = 1; s.ending = true; LF.Save.write(s); LF.UI.ending(); break;
      case 'trial': if (!this.trial) this.startTrial(it); break;
    }
  };

  G.updateTiles = function (dt) {
    for (const k in this.ts) {
      const st = this.ts[k], [tx, ty] = k.split(',').map(Number);
      if (st.ch === 'c') {
        if (st.gone == null) { st.t -= dt; if (st.t <= 0) { this.setTile(tx, ty, '.'); st.gone = 3; this.burst(tx * T + 8, ty * T + 6, 8, '#9a8aa8', 40, 1); this.sfx('break'); } }
        else { st.gone -= dt; if (st.gone <= 0 && !LF.overlap({ x: tx * T, y: ty * T, w: T, h: T }, this.player)) { this.setTile(tx, ty, 'c'); delete this.ts[k]; } }
      } else if (st.t != null) { st.t -= dt; if (st.t <= 0) delete this.ts[k]; }
    }
  };

  G.updateGates = function () {
    const r = this.room; if (!r.gateNeed || this.save.flags['gate:' + r.id]) return;
    if (this.sigilCount() < r.gateNeed) return;
    const pl = this.player;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.grid[y][x] === 'G' && LF.dist(pl.cx, pl.cy, x * T + 8, y * T + 8) < 54) {
      this.save.flags['gate:' + r.id] = 1; this.openAll('G'); this.banner('The Sigil Gate opens', ''); LF.Save.write(this.save); return;
    }
  };

  /* ---------- Trial of Embers (optional wave challenge) ---------- */
  G.startTrial = function (it) {
    this.trial = { wave: 0, kills: 0, cd: 1.2, alive: 0, done: false };
    const d = this.room.doors.l; for (let y = d.y; y < d.y + d.h; y++) this.room.grid[y][d.x] = 'g';
    this.sfx('gate'); this.banner('Trial of Embers', 'Survive five waves');
  };
  G.updateTrial = function (dt) {
    const t = this.trial; if (!t || t.done) return;
    const alive = this.enemies.filter(e => !e.dead).length;
    if (alive === 0) {
      t.cd -= dt;
      if (t.cd <= 0) {
        if (t.wave >= TRIAL.length) {
          t.done = true; this.openAll('g'); const s = this.save; s.gaunt = Math.max(s.gaunt, t.wave); this.sfx('win'); this.banner('Trial Complete', '');
          if (!s.flags.trial_done) { s.flags.trial_done = 1; this.give('heart'); } else this.give('embers:60');
          this.trial = null; LF.Save.write(s); return;
        }
        const list = TRIAL[t.wave++]; t.cd = 1.5; this.sfx('boss');
        list.forEach((type, i) => { const tx = 3 + Math.floor(((i + .5) / list.length) * 22), e = LF.makeEnemy(type, tx, type === 'bat' ? 2 : type === 'wisp' || type === 'mothfoe' ? 5 : 9, this, 't' + t.wave + i); e.em = Math.max(2, e.em); this.enemies.push(e); this.burst(e.x + e.w / 2, e.y + e.h / 2, 12, '#c49bff', 80, 1); });
        this.save.gaunt = Math.max(this.save.gaunt, t.wave - 1);
      }
    }
  };

  /* ---------- particles / ambient ---------- */
  G.updateParticles = function (dt) {
    const P = this.particles;
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life -= dt; if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  };
  G.ambient = function (dt) {
    for (const m of this.motes) {
      m.p += dt; m.x += Math.sin(m.p * .7 + m.s * 9) * 6 * dt - (this.room.area === 'drown' ? 0 : 2 * dt); m.y += (this.room.area === 'spire' ? -9 : this.room.area === 'drown' ? -5 : Math.cos(m.p * .5 + m.s * 5) * 4) * dt;
      if (m.x < -4) m.x = W + 4; if (m.x > W + 4) m.x = -4; if (m.y < -4) m.y = H + 4; if (m.y > H + 4) m.y = -4;
    }
  };
})();
