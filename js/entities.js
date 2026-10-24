/* Lanternfall - physics, player controller, enemies, projectiles */
(function () {
  'use strict';
  const LF = window.LF, T = LF.T, In = LF.input, cl = LF.clamp;

  /* ============================== PHYSICS ============================== */
  const SOLID = '#SDgG';
  const Phys = LF.Phys = {
    solid(ch) { return SOLID.indexOf(ch) >= 0; },
    move(b, dt, G, o) {
      o = o || {};
      b.hitX = 0; b.hitHead = false;
      // --- X ---
      b.x += b.vx * dt;
      let tx0 = Math.floor(b.x / T), tx1 = Math.floor((b.x + b.w - .001) / T), ty0 = Math.floor(b.y / T), ty1 = Math.floor((b.y + b.h - .001) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (this.solid(G.tile(tx, ty))) {
          if (b.vx > 0 || (b.vx === 0 && b.x + b.w / 2 < tx * T + T / 2)) { b.x = tx * T - b.w; b.hitX = 1; } else { b.x = (tx + 1) * T; b.hitX = -1; }
          b.vx = 0; tx0 = Math.floor(b.x / T); tx1 = Math.floor((b.x + b.w - .001) / T);
        }
      }
      // --- Y ---
      const prevBottom = b.y + b.h;
      b.y += b.vy * dt; b.onGround = false;
      tx0 = Math.floor(b.x / T); tx1 = Math.floor((b.x + b.w - .001) / T); ty0 = Math.floor(b.y / T); ty1 = Math.floor((b.y + b.h - .001) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const ch = G.tile(tx, ty);
        if (this.solid(ch)) {
          if (b.vy > 0 || (b.vy === 0 && prevBottom <= ty * T + 1)) { b.y = ty * T - b.h; b.onGround = true; } else { b.y = (ty + 1) * T; b.hitHead = true; }
          b.vy = 0; ty0 = Math.floor(b.y / T); ty1 = Math.floor((b.y + b.h - .001) / T);
        } else if ((ch === '=' || ch === 'c') && b.vy >= 0 && !(b.dropT > 0) && !o.ghost) {
          const top = ty * T;
          if (prevBottom <= top + .01 + (b.vy * dt > 4 ? 0 : 0) && b.y + b.h > top) {
            if (ch === 'c' && G.crumble) G.crumble(tx, ty);
            b.y = top - b.h; b.vy = 0; b.onGround = true; ty0 = Math.floor(b.y / T); ty1 = Math.floor((b.y + b.h - .001) / T);
          }
        }
      }
      if (!b.onGround && b.vy >= 0) { // probe 1px below for resting contact
        const py = b.y + b.h + .5, ty = Math.floor(py / T);
        for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - .001) / T); tx++) {
          const ch = G.tile(tx, ty);
          if (this.solid(ch) || ((ch === '=' || ch === 'c') && !(b.dropT > 0) && Math.abs(b.y + b.h - ty * T) < 1.2)) { if (b.y + b.h <= ty * T + 1) b.onGround = true; }
        }
      }
    },
    // does the rect overlap any tile satisfying fn(ch)?
    anyTile(G, x, y, w, h, fn) {
      for (let ty = Math.floor(y / T); ty <= Math.floor((y + h - .001) / T); ty++) for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - .001) / T); tx++) { const c = G.tile(tx, ty); if (fn(c, tx, ty)) return true; }
      return false;
    }
  };

  /* ============================== PLAYER ============================== */
  const P = LF.Player = function (G) {
    Object.assign(this, { x: 0, y: 0, w: 10, h: 14, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, airJumps: 1, dashT: 0, dashCD: 0, dashed: false,
      atkT: 0, atkCD: 0, atkDir: 'f', hitSet: null, invul: 0, hurtT: 0, flash: 0, dead: false, gliding: false, wingT: 0, healT: 0, dropT: 0, inWater: false,
      stepT: 0, trail: [], safe: { x: 0, y: 0 }, abil: G.save.abil, wasGround: false, hitCount: 0, lastVy: 0, pogoT: 0 });
  };
  P.prototype = {
    get cx() { return this.x + this.w / 2; }, get cy() { return this.y + this.h / 2; },
    hasCharm(id) { return this.G.save.eq.indexOf(id) >= 0; },
    teleport(x, y) { this.x = x; this.y = y; this.vx = this.vy = 0; this.safe = { x, y }; this.trail.length = 0; },
    dmg() { return 1 + this.G.save.dmgLvl + (this.hasCharm('might') ? 1 : 0); },
    update(G, dt) {
      this.G = G;
      const S = this, ab = G.save.abil;
      S.invul = Math.max(0, S.invul - dt); S.hurtT = Math.max(0, S.hurtT - dt); S.flash = Math.max(0, S.flash - dt);
      S.atkCD = Math.max(0, S.atkCD - dt); S.dashCD = Math.max(0, S.dashCD - dt); S.wingT = Math.max(0, S.wingT - dt); S.dropT = Math.max(0, S.dropT - dt);
      S.coyote = Math.max(0, S.coyote - dt); S.jumpBuf = Math.max(0, S.jumpBuf - dt); S.pogoT = Math.max(0, S.pogoT - dt);
      if (S.atkT > 0) { S.atkT -= dt; if (S.atkT <= 0) S.hitSet = null; }
      const swift = S.hasCharm('swift') ? 1.13 : 1, maxV = 96 * swift;
      const axis = S.hurtT > 0 ? 0 : In.axis;
      // ----- water -----
      const wasW = S.inWater; S.inWater = Phys.anyTile(G, S.x + 2, S.y + 6, S.w - 4, S.h - 8, c => c === 'w');
      if (S.inWater !== wasW) { G.sfx('splash'); G.burst(S.cx, S.y + S.h, 10, '#9af0d8', 60, 1); if (S.inWater) S.vy *= .35; }
      // ----- dash -----
      if (S.hurtT <= 0 && ab.dash && In.hit('dash') && S.dashCD <= 0 && !S.dashed && S.dashT <= 0) {
        S.dashT = .17; S.dashCD = .5; S.dashed = !S.onGround; S.vx = S.face * 255; S.vy = 0; S.invul = Math.max(S.invul, .22); G.sfx('dash'); G.burst(S.cx, S.cy, 8, '#ffd27a', 70, 1);
      }
      if (S.dashT > 0) {
        S.dashT -= dt; S.vy = 0; S.vx = S.face * 255; S.trail.push({ x: S.x, y: S.y, t: .2 });
        const ax = S.face > 0 ? S.x + S.w : S.x - 2; // break dash-cracks
        Phys.anyTile(G, ax, S.y + 2, 2, S.h - 4, (c, tx, ty) => { if (c === 'D') { G.breakTile(tx, ty); } return false; });
        if (S.hitX) S.dashT = 0;
      } else {
        // ----- horizontal -----
        const acc = S.onGround ? 1500 : 1000, fr = S.onGround ? 1700 : 500, wm = S.inWater ? .65 : 1;
        if (axis) { S.face = axis; S.vx = LF.approach(S.vx, axis * maxV * wm, acc * dt * (Math.sign(S.vx) === -axis ? 1.6 : 1)); }
        else S.vx = LF.approach(S.vx, 0, fr * dt);
        // ----- jump -----
        if (S.hurtT <= 0 && In.hit('jump')) {
          if (In.isDown('down') && S.onGround && Phys.anyTile(G, S.x, S.y + S.h + 1, S.w, 1, c => c === '=' || c === 'c')) { S.dropT = .2; S.y += 2; S.coyote = 0; }
          else S.jumpBuf = .13;
        }
        if (S.jumpBuf > 0) {
          if (S.coyote > 0 || (S.inWater && S.vy > -50)) { S.vy = S.inWater ? -210 : -340; S.coyote = 0; S.jumpBuf = 0; S.onGround = false; G.sfx('jump'); G.burst(S.cx, S.y + S.h, 4, '#c9b8e8', 40, 1); S.jumping = true; }
          else if (ab.dbl && S.airJumps > 0 && !S.onGround) { S.vy = -300; S.airJumps--; S.jumpBuf = 0; S.wingT = .35; G.sfx('djump'); G.burst(S.cx, S.cy, 10, '#c49bff', 70, 1); S.jumping = true; }
        }
        if (In.released.jump && S.vy < -110 && S.jumping) { S.vy = -110; S.jumping = false; }
        // ----- gravity / glide -----
        S.gliding = false;
        let g = S.inWater ? 420 : 950;
        if (ab.glide && In.isDown('jump') && S.vy > 30 && !S.onGround && !S.inWater && S.hurtT <= 0) { S.gliding = true; S.vy = LF.approach(S.vy, 36, 1400 * dt); if (Math.random() < .25) G.spark(S.cx + LF.rand(-6, 6), S.cy - 2, '#c49bff'); }
        else S.vy = Math.min(S.vy + g * dt, S.inWater ? 80 : 400);
        if (S.gliding) S.vx = cl(S.vx, -maxV * 1.05, maxV * 1.05);
      }
      // trail decay
      for (let i = S.trail.length - 1; i >= 0; i--) { S.trail[i].t -= dt; if (S.trail[i].t <= 0) S.trail.splice(i, 1); }
      // ----- attack -----
      if (S.hurtT <= 0 && In.hit('attack') && S.atkCD <= 0 && S.dashT <= 0) {
        S.atkT = .2; S.atkCD = S.hasCharm('quick') ? .2 : .31; S.hitSet = new Set();
        S.atkDir = In.isDown('up') ? 'u' : (In.isDown('down') && !S.onGround) ? 'd' : 'f';
        G.sfx('attack'); if (S.atkDir === 'f' && axis === 0) S.vx += S.face * 25;
      }
      // ----- spring / hazards -----
      const below = Phys.anyTile(G, S.x + 2, S.y + S.h, S.w - 4, 2, c => c === 'j');
      if (below && S.vy >= 0) { S.vy = -480; S.airJumps = 1; S.dashed = false; G.sfx('spring'); G.springTile(S.cx, S.y + S.h); S.jumping = false; }
      // ----- move -----
      Phys.move(S, dt, G);
      if (S.hitHead && S.vy < 0) S.vy = 0;
      // ----- grounded bookkeeping -----
      if (S.onGround) {
        S.coyote = .1; S.airJumps = 1; S.dashed = false; S.jumping = false;
        if (!S.wasGround && S.lastVy > 140) { G.sfx('land'); G.burst(S.cx, S.y + S.h, 5, '#b8a8d8', 40, 1); }
        if (Math.abs(S.vx) > 20) { S.stepT -= dt; if (S.stepT <= 0) { S.stepT = .26; G.sfx('step'); } }
        // remember last safe footing (not next to spikes)
        if (!Phys.anyTile(G, S.x - 10, S.y - 2, S.w + 20, S.h + 6, c => c === '^' || c === 'v' || c === 'c') && S.hurtT <= 0) { S.safe.x = S.x; S.safe.y = S.y; }
      }
      S.wasGround = S.onGround; S.lastVy = S.vy;
      // ----- spikes -----
      if (S.invul <= 0 || S.dashT <= 0) {
        const hit = Phys.anyTile(G, S.x + 2, S.y + 2, S.w - 4, S.h - 3, (c, tx, ty) => {
          if (c === '^') return S.y + S.h > ty * T + 7 && S.vy >= -10 || S.y + S.h > ty * T + 9; if (c === 'v') return S.y < ty * T + 9; return false;
        });
        if (hit && S.invul <= 0 && S.dashT <= 0) G.spikeHit();
      }
      // ----- kindle (heal) -----
      if (S.onGround && In.isDown('down') && Math.abs(S.vx) < 5 && G.save.hp < G.save.maxHp && G.save.embers >= G.kindleCost() && S.hurtT <= 0 && G.canHeal()) {
        S.healT += dt; if (Math.random() < .5) G.spark(S.cx + LF.rand(-5, 5), S.y + S.h - 2, '#ffd27a', -30);
        if (S.healT >= 1.1) { S.healT = 0; G.save.embers -= G.kindleCost(); G.save.hp++; G.sfx('heart'); G.burst(S.cx, S.cy, 14, '#ff8aa8', 60, 1); G.toast('Kindled +1 heart (-' + G.kindleCost() + ' embers)'); }
      } else S.healT = Math.max(0, S.healT - dt * 2);
      // clamp to world
      S.x = cl(S.x, -12, G.room.w * T + 2);
    },
    hitbox() { // attack rectangle
      const S = this;
      if (S.atkT <= 0) return null;
      if (S.atkDir === 'u') return { x: S.x - 4, y: S.y - 22, w: S.w + 8, h: 24 };
      if (S.atkDir === 'd') return { x: S.x - 4, y: S.y + S.h - 4, w: S.w + 8, h: 22 };
      return { x: S.face > 0 ? S.x + S.w - 2 : S.x - 26, y: S.y - 3, w: 28, h: S.h + 6 };
    },
    hurt(G, dmg, srcX) {
      const S = this;
      if (S.invul > 0 || S.dead) return false;
      S.G.save.hp -= dmg; S.invul = 1.2; S.hurtT = .28; S.flash = .15; S.dashT = 0;
      const d = S.cx < srcX ? -1 : 1; S.vx = d * 130; S.vy = -170;
      G.sfx('hurt'); G.shake(5); G.hitstop(.09); G.burst(S.cx, S.cy, 12, '#ff6f7d', 90, 1); G.flashScreen('#ff2040', .25);
      if (G.save.hp <= 0) G.killPlayer();
      return true;
    }
  };

  /* ============================== ENEMIES ============================== */
  const ET = {
    slime:   { w: 14, h: 10, hp: 2, em: 2, spd: 26 },
    beetle:  { w: 16, h: 10, hp: 4, em: 4, spd: 38 },
    mothfoe: { w: 12, h: 10, hp: 2, em: 2, fly: 1 },
    bat:     { w: 12, h: 10, hp: 2, em: 3, fly: 1 },
    thorn:   { w: 14, h: 16, hp: 3, em: 3, still: 1 },
    wisp:    { w: 10, h: 10, hp: 2, em: 3, fly: 1, ghost: 1 },
    jelly:   { w: 14, h: 16, hp: 3, em: 4, fly: 1 },
    husk:    { w: 12, h: 16, hp: 5, em: 6, spd: 30 },
    snowman: { w: 14, h: 22, hp: 6, em: 7, spd: 24 }
  };
  LF.ENEMY_TYPES = ET;
  LF.makeEnemy = function (type, tx, ty, G, idx) {
    const d = ET[type], hp = Math.ceil(d.hp * (1 + .5 * G.save.ng));
    const e = { kind: 'enemy', type, w: d.w, h: d.h, x: tx * T + (T - d.w) / 2, y: (ty + 1) * T - d.h, vx: 0, vy: 0, hp, maxHp: hp, face: Math.random() < .5 ? 1 : -1, flash: 0, stun: 0,
      ph: Math.random() * 6, state: 'idle', t: 0, hx: 0, hy: 0, em: d.em, key: G.room.id + '#' + idx, d };
    e.hx = e.x; e.hy = e.y;
    if (type === 'bat') e.state = 'hang';
    if (type === 'jelly') e.hy = e.y;
    return e;
  };
  LF.updateEnemy = function (e, dt, G) {
    const pl = G.player, d = e.d, dx = pl.cx - (e.x + e.w / 2), dy = pl.cy - (e.y + e.h / 2), dist = Math.hypot(dx, dy);
    e.flash = Math.max(0, e.flash - dt); e.t += dt;
    if (e.stun > 0) { e.stun -= dt; e.vx = LF.approach(e.vx, 0, 500 * dt); if (!d.fly) e.vy = Math.min(e.vy + 900 * dt, 380); Phys.move(e, dt, G, { ghost: d.ghost }); return; }
    switch (e.type) {
      case 'slime': case 'beetle': case 'husk': {
        const front = Phys.solid(G.tile(Math.floor((e.x + (e.face > 0 ? e.w + 2 : -2)) / T), Math.floor((e.y + e.h / 2) / T)));
        const ledge = e.onGround && !Phys.anyTile(G, e.x + (e.face > 0 ? e.w : -2), e.y + e.h + 2, 2, 2, c => Phys.solid(c) || c === '=' || c === 'c');
        if (e.state === 'lunge') { e.vx = e.face * 150; if (e.t > .38 || front) { e.state = 'idle'; e.t = -.5; } }
        else if (e.state === 'wind') { e.vx = 0; if (e.t > .45) { e.state = 'lunge'; e.t = 0; } }
        else {
          if (front || ledge) { e.face *= -1; }
          e.vx = e.face * d.spd * (e.type === 'beetle' && Math.sin(e.t * 2 + e.ph) > .6 ? 0 : 1);
          if (e.type === 'husk' && e.t > 0 && Math.abs(dy) < 18 && Math.abs(dx) < 75 && Math.sign(dx) === e.face) { e.state = 'wind'; e.t = 0; }
        }
        e.vy = Math.min(e.vy + 900 * dt, 380); Phys.move(e, dt, G); break;
      }
      case 'mothfoe': {
        e.ph += dt; let tx = e.hx + Math.sin(e.t * 1.4 + e.ph) * 26, ty = e.hy + Math.sin(e.t * 2.3) * 12;
        if (dist < 85) { tx = pl.cx - e.w / 2; ty = pl.cy - e.h / 2 - 6; }
        const sp = dist < 85 ? 48 : 30; e.vx = LF.approach(e.vx, cl(tx - e.x, -1, 1) * sp, 200 * dt); e.vy = LF.approach(e.vy, cl(ty - e.y, -1, 1) * sp, 200 * dt);
        if (Math.abs(e.vx) > 2) e.face = LF.sign(e.vx); Phys.move(e, dt, G); break;
      }
      case 'bat': {
        if (e.state === 'hang') { e.vx = e.vy = 0; if (Math.abs(dx) < 46 && dy > 0 && dy < 150) { e.state = 'swoop'; e.t = 0; } }
        else if (e.state === 'swoop') { const a = Math.atan2(dy, dx); e.vx = LF.approach(e.vx, Math.cos(a) * 95, 500 * dt); e.vy = LF.approach(e.vy, Math.sin(a) * 95, 500 * dt); if (e.t > 1.3) { e.state = 'return'; e.t = 0; } }
        else { const a = Math.atan2(e.hy - e.y, e.hx - e.x); e.vx = Math.cos(a) * 60; e.vy = Math.sin(a) * 60; if (Math.hypot(e.hx - e.x, e.hy - e.y) < 3) { e.state = 'hang'; e.x = e.hx; e.y = e.hy; } }
        if (Math.abs(e.vx) > 2) e.face = LF.sign(e.vx); Phys.move(e, dt, G); break;
      }
      case 'thorn': {
        e.face = dx > 0 ? 1 : -1;
        if (e.state === 'fire') { if (e.t > .35) { e.state = 'idle'; e.t = 0; } }
        else if (e.t > 2.2 && dist < 150 && dist > 12) {
          e.state = 'fire'; e.t = 0; const a = Math.atan2(dy - 4, dx), sp = 78;
          G.projectiles.push({ x: e.x + e.w / 2, y: e.y + 2, w: 5, h: 5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3, dmg: 1, col: '#ff8aa8', glow: '#ff5a8a', grav: 0 }); G.sfx('shoot');
        }
        break;
      }
      case 'wisp': {
        const a = Math.atan2(dy, dx), sp = dist < 110 ? 34 : 0, wob = Math.sin(e.t * 3 + e.ph) * 14;
        e.vx = Math.cos(a) * sp + Math.cos(a + 1.57) * wob * (sp ? 1 : 0); e.vy = Math.sin(a) * sp + Math.sin(a + 1.57) * wob * (sp ? 1 : 0);
        if (!sp) { e.vx = Math.sin(e.t + e.ph) * 10; e.vy = Math.cos(e.t * 1.3) * 8; }
        e.x += e.vx * dt; e.y += e.vy * dt; break;
      }
      case 'jelly': {
        e.vy = Math.sin(e.t * 1.6 + e.ph) * 22; e.vx = e.face * 14; const front = Phys.solid(G.tile(Math.floor((e.x + (e.face > 0 ? e.w + 2 : -2)) / T), Math.floor((e.y + e.h / 2) / T)));
        if (front || Math.abs(e.x - e.hx) > 40) e.face = Math.sign(e.hx - e.x) || -e.face; Phys.move(e, dt, G); break;
      }
    }
  };
  // damage an enemy; returns true if killed
  LF.hurtEnemy = function (e, dmg, dir, G) {
    e.hp -= dmg; e.flash = .12; e.stun = e.type === 'husk' ? .05 : .16; e.vx = dir * (e.d.fly ? 120 : 110); if (!e.d.fly && !e.d.still) e.vy = -90; if (e.state === 'wind' || e.state === 'lunge') { e.state = 'idle'; e.t = -.4; }
    G.sfx('hit'); G.burst(e.x + e.w / 2, e.y + e.h / 2, 8, '#fff2c9', 80, 1);
    if (e.hp <= 0) { G.killEnemy(e); return true; }
    return false;
  };

  /* ============================== PROJECTILES ============================== */
  LF.updateProjectiles = function (G, dt) {
    const pl = G.player;
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const p = G.projectiles[i];
      p.life -= dt; p.vy += (p.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      let dead = p.life <= 0;
      if (!p.ghost && Phys.solid(G.tile(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h / 2) / T)))) { dead = true; G.burst(p.x, p.y, 4, p.col, 40, 1); }
      if (!dead && !p.harmless && LF.overlap({ x: p.x, y: p.y, w: p.w, h: p.h }, pl) && pl.invul <= 0) { pl.hurt(G, p.dmg || 1, p.x); if (!p.pierce) dead = true; }
      if (dead) G.projectiles.splice(i, 1);
    }
  };
})();
