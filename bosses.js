/* Lanternfall - bosses: Thornmother, Prism Weaver, Drowned Bell, Hollow Warden + telegraphed hazards */
(function () {
  'use strict';
  const LF = window.LF, T = LF.T, Phys = LF.Phys, cl = LF.clamp;
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const DEF = {
    thorn: { w: 36, h: 40, hp: 22, fly: 0, contact: 1 },
    prism: { w: 26, h: 24, hp: 26, fly: 1, contact: 1 },
    tide: { w: 30, h: 34, hp: 32, fly: 1, contact: 1 },
    warden: { w: 20, h: 34, hp: 46, fly: 0, contact: 2 },
    snowking: { w: 30, h: 40, hp: 44, fly: 0, contact: 1 }
  };
  const ATK = {
    thorn: ['volley', 'roots', 'charge', 'roots', 'volley'],
    prism: ['beams', 'shards', 'rain', 'swoop', 'shards'],
    tide: ['toll', 'drops', 'dive', 'toll', 'drops'],
    warden: ['slash', 'orbs', 'leap', 'slash', 'orbs', 'combo'],
    snowking: ['throw', 'roll', 'blizzard', 'throw', 'roll', 'blizzard']
  };

  /* ---------- hazards (telegraph then strike) ---------- */
  function haz(G, o) { G.hazards.push(Object.assign({ t: 0, delay: .6, life: .35, dmg: 1, col: '#ff5a8a' }, o)); }
  LF.updateHazards = function (G, dt) {
    const pl = G.player;
    for (let i = G.hazards.length - 1; i >= 0; i--) {
      const h = G.hazards[i]; h.t += dt;
      if (h.t >= h.delay && h.t < h.delay + h.life) {
        if (!h.fired) { h.fired = true; if (h.sfx) G.sfx(h.sfx); if (h.shake) G.shake(h.shake); }
        if (pl.invul <= 0 && !pl.dead && LF.overlap(h, pl)) pl.hurt(G, h.dmg, h.x + h.w / 2);
      }
      if (h.t >= h.delay + h.life) G.hazards.splice(i, 1);
    }
  };
  LF.drawHazards = function (g, G, cam, t) {
    for (const h of G.hazards) {
      const x = h.x - cam.x, y = h.y - cam.y, on = h.t >= h.delay;
      if (!on) { g.globalAlpha = .2 + .25 * Math.sin(h.t * 30) ** 2 + h.t / h.delay * .2; g.fillStyle = h.col; g.fillRect(x | 0, (y + h.h - 2) | 0, h.w, 2); g.fillRect(x | 0, y | 0, h.w, h.h); g.globalAlpha = 1; }
      else { const k = 1 - (h.t - h.delay) / h.life; g.globalAlpha = .55 + .4 * k; R(g, h.col, x, y, h.w, h.h); R(g, '#fff', x + h.w / 2 - 1, y, 2, h.h); g.globalAlpha = 1; }
    }
  };

  const fan = (G, x, y, n, spread, sp, aim, col, glow, grav) => {
    const pl = G.player, base = aim === undefined ? Math.atan2(pl.cy - y, pl.cx - x) : aim;
    for (let i = 0; i < n; i++) {
      const a = base + (n === 1 ? 0 : (i / (n - 1) - .5) * spread);
      G.projectiles.push({ x: x - 3, y: y - 3, w: 6, h: 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4, dmg: 1, col: col || '#ff8aa8', glow: glow || col || '#ff5a8a', grav: grav || 0 });
    }
    G.sfx('shoot');
  };

  const B = LF.Bosses = {
    make(id, tx, ty, G) {
      const d = DEF[id], hp = Math.ceil(d.hp * (1 + .5 * G.save.ng));
      const b = { kind: 'boss', type: id, id, d, w: d.w, h: d.h, x: tx * T + (T - d.w) / 2, y: (ty + 1) * T - d.h, vx: 0, vy: 0, hp, maxHp: hp, face: -1, flash: 0, stun: 0, state: 'wait', t: 0, n: 0,
        ph: Math.random() * 6, phase: 1, em: 60, floorY: (ty + 1) * T, active: false, did: false, key: 'boss:' + id, hx: tx * T, hy: ty * T };
      return b;
    },
    start(b, G) { b.active = true; b.state = 'idle'; b.t = 0; G.bossIntro(b); },
    next(b) { const l = ATK[b.id]; b.state = l[b.n++ % l.length]; b.t = 0; b.did = false; },
    idle(b, ms) { b.state = 'idle'; b.t = -(ms || 0); b.did = false; },
    hurt(b, dmg, dir, G) {
      if (!b.active || b.dead) return false;
      b.hp -= dmg; b.flash = .1; G.sfx('hit'); G.burst(b.x + b.w / 2, b.y + b.h / 2, 8, '#fff2c9', 80, 1);
      if (!b.d.fly && b.state === 'idle') b.vx += dir * 8;
      const r = b.hp / b.maxHp; b.phase = b.id === 'warden' ? (r < .33 ? 3 : r < .66 ? 2 : 1) : (r < .5 ? 2 : 1);
      if (b.hp <= 0) { b.dead = true; G.killBoss(b); return true; }
      return false;
    },
    update(b, dt, G) {
      const pl = G.player; b.flash = Math.max(0, b.flash - dt);
      if (b.dead) return;
      if (!b.active) { if (G.bossTrigger(b)) B.start(b, G); return; }
      b.t += dt; b.ph += dt;
      const dx = pl.cx - (b.x + b.w / 2), dy = pl.cy - (b.y + b.h / 2);
      B['ai_' + b.id](b, dt, G, pl, dx, dy);
      if (!b.d.fly) { b.vy = Math.min(b.vy + 900 * dt, 380); Phys.move(b, dt, G); }
      else { b.x += b.vx * dt; b.y += b.vy * dt; b.x = cl(b.x, T + 2, G.room.w * T - T - b.w - 2); b.y = cl(b.y, T + 2, b.floorY - b.h); }
    },
    fly(b, tx, ty, sp, dt) { b.vx = LF.approach(b.vx, cl(tx - (b.x + b.w / 2), -1, 1) * sp, 260 * dt); b.vy = LF.approach(b.vy, cl(ty - (b.y + b.h / 2), -1, 1) * sp, 260 * dt); },

    /* ---------------- Thornmother ---------------- */
    ai_thorn(b, dt, G, pl, dx) {
      const sp = b.phase > 1 ? 1.35 : 1, cx = b.x + b.w / 2;
      switch (b.state) {
        case 'idle': b.face = dx > 0 ? 1 : -1; b.vx = Math.abs(dx) > 50 ? b.face * 16 * sp : 0; if (b.t > 1.0 / sp) B.next(b); break;
        case 'volley': b.vx = 0; if (!b.did && b.t > .5) { b.did = true; fan(G, cx, b.y + 10, b.phase > 1 ? 7 : 5, 1.1, 90 * sp); } if (b.t > 1.2) B.idle(b); break;
        case 'roots': b.vx = 0; if (!b.did && b.t > .3) { b.did = true; const n = b.phase > 1 ? 5 : 3; for (let i = 0; i < n; i++) { const x = pl.cx + (i - (n - 1) / 2) * 38 + LF.rand(-6, 6); haz(G, { x: x - 8, y: b.floorY - 34, w: 16, h: 34, delay: .7 + i * .16 / sp, life: .4, col: '#ff5a8a', sfx: 'crack', shake: 2 }); } } if (b.t > 2.0) B.idle(b); break;
        case 'charge': b.face = dx > 0 ? 1 : -1; if (b.t < .6) { b.vx = 0; b.x += Math.sin(b.t * 70) * .5; } else if (b.t < 1.25) { b.vx = b.face * 175 * sp; if (b.hitX) { b.state = 'dizzy'; b.t = 0; G.shake(7); G.sfx('boom'); G.burst(b.x + b.w / 2, b.y + 10, 14, '#ff8aa8', 90, 1); } } else B.idle(b, .3); break;
        case 'dizzy': b.vx = 0; if (b.t > 1.2) B.idle(b); break;
      }
    },
    /* ---------------- Prism Weaver ---------------- */
    ai_prism(b, dt, G, pl, dx) {
      const sp = b.phase > 1 ? 1.3 : 1, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      switch (b.state) {
        case 'idle': B.fly(b, pl.cx + Math.sin(b.ph * 1.3) * 70, 52 + Math.sin(b.ph * 2) * 12, 55 * sp, dt); if (b.t > 1.2 / sp) B.next(b); break;
        case 'beams': B.fly(b, G.room.w * T / 2 + Math.sin(b.ph) * 60, 42, 60, dt);
          if (!b.did && b.t > .4) { b.did = true; const n = b.phase > 1 ? 5 : 3; for (let i = 0; i < n; i++) haz(G, { x: pl.cx + (i - (n - 1) / 2) * 44 - 7, y: 20, w: 14, h: b.floorY - 20, delay: .8 + i * .12, life: .45, col: '#7ad8ff', sfx: 'crack' }); }
          if (b.t > 2.1) B.idle(b); break;
        case 'shards': B.fly(b, cx, 55, 20, dt); if (b.t > .5 && b.did < 3) { if (!b.n2 || b.t > b.n2) { b.n2 = b.t + .3; b.did = (b.did || 0) + 1; fan(G, cx, cy, b.phase > 1 ? 5 : 3, .7, 80 * sp, undefined, '#c49bff', '#7ad8ff'); } } if (b.t > 1.9) B.idle(b); break;
        case 'rain': B.fly(b, G.room.w * T / 2, 36, 70, dt);
          if (b.t > .4 && b.t < 1.8 && (!b.n2 || b.t > b.n2)) { b.n2 = b.t + .16 / sp; const x = LF.rand(T * 2, G.room.w * T - T * 2); G.projectiles.push({ x, y: 14, w: 6, h: 10, vx: 0, vy: 20, life: 4, dmg: 1, col: '#9ad8ff', glow: '#7ad8ff', grav: 220 }); }
          if (b.t > 2.3) B.idle(b); break;
        case 'swoop': if (b.t < .7) { B.fly(b, pl.cx, 34, 80, dt); b.vx *= .9; } else if (b.t < 1.2) { if (!b.did) { b.did = true; const a = Math.atan2(pl.cy - cy, pl.cx - cx); b.sx = Math.cos(a) * 190 * sp; b.sy = Math.sin(a) * 190 * sp; G.sfx('dash'); } b.vx = b.sx; b.vy = b.sy; } else B.idle(b); break;
      }
    },
    /* ---------------- Drowned Bell ---------------- */
    ai_tide(b, dt, G, pl, dx) {
      const sp = b.phase > 1 ? 1.3 : 1, cx = b.x + b.w / 2, W = G.room.w * T;
      switch (b.state) {
        case 'idle': B.fly(b, W / 2 + Math.sin(b.ph * .9) * 90, 56 + Math.sin(b.ph * 1.7) * 8, 55 * sp, dt); if (b.t > 1.3 / sp) B.next(b); break;
        case 'toll': B.fly(b, cx, 52, 20, dt); if (b.t < .7) b.x += Math.sin(b.t * 60) * .7;
          if (!b.did && b.t > .7) { b.did = true; G.sfx('boom'); G.shake(4); for (const s of [-1, 1]) for (let k = 0; k < (b.phase > 1 ? 2 : 1); k++) G.projectiles.push({ x: cx - 5 + s * 12, y: b.floorY - 9 - k * 0, w: 10, h: 9, vx: s * (95 + k * 40) * sp, vy: 0, life: 4, dmg: 1, col: '#9af0d8', glow: '#4fc7b4', grav: 0, ghost: 1 }); }
          if (b.t > 1.9) B.idle(b); break;
        case 'drops': B.fly(b, W / 2, 48, 40, dt);
          if (b.t > .4 && b.t < 2 && (!b.n2 || b.t > b.n2)) { b.n2 = b.t + .22 / sp; G.projectiles.push({ x: pl.cx + LF.rand(-60, 60), y: 12, w: 6, h: 10, vx: 0, vy: 30, life: 4, dmg: 1, col: '#9af0d8', glow: '#4fc7b4', grav: 240 }); }
          if (b.t > 2.4) B.idle(b); break;
        case 'dive': if (b.t < .8) { B.fly(b, pl.cx, 50, 90, dt); b.x += Math.sin(b.t * 70) * .6; } else if (b.t < 1.6) { b.vx = 0; b.vy = 280; if (b.y + b.h >= b.floorY - 1) { b.state = 'stuck'; b.t = 0; G.shake(8); G.sfx('boom'); haz(G, { x: b.x - 26, y: b.floorY - 10, w: 26, h: 10, delay: 0, life: .3, col: '#9af0d8' }); haz(G, { x: b.x + b.w, y: b.floorY - 10, w: 26, h: 10, delay: 0, life: .3, col: '#9af0d8' }); } } else B.idle(b); break;
        case 'stuck': b.vx = 0; b.vy = 0; if (b.t > 1.5) { b.state = 'rise'; b.t = 0; } break;
        case 'rise': b.vx = 0; b.vy = -110; if (b.t > .7) B.idle(b); break;
      }
    },
    /* ---------------- Frost King (bonus snow board) ---------------- */
    ai_snowking(b, dt, G, pl, dx) {
      const sp = b.phase > 1 ? 1.3 : 1, cx = b.x + b.w / 2;
      switch (b.state) {
        case 'idle': b.face = dx > 0 ? 1 : -1; b.vx = Math.abs(dx) > 60 ? b.face * 22 * sp : 0;
          if (b.phase > 1 && !b.sum) { b.sum = 1; b.state = 'summon'; b.t = 0; } else if (b.t > 1.0 / sp) B.next(b); break;
        case 'throw': b.vx = 0; b.face = dx > 0 ? 1 : -1; if (!b.did && b.t > .5) { b.did = true; fan(G, cx, b.y + 12, b.phase > 1 ? 5 : 3, .9, 120 * sp, undefined, '#ffffff', '#cfe8ff', 150); } if (b.t > 1.3) B.idle(b); break;
        case 'roll': if (b.t < .7) { b.vx = 0; b.x += Math.sin(b.t * 70) * .5; b.face = dx > 0 ? 1 : -1; }
          else if (b.t < 1.9) { b.vx = b.face * 175 * sp; if (b.hitX) { b.state = 'dizzy'; b.t = 0; G.shake(7); G.sfx('boom'); for (let i = 0; i < 3; i++) haz(G, { x: LF.rand(T * 3, G.room.w * T - T * 3) - 8, y: 20, w: 16, h: b.floorY - 20, delay: .8 + i * .25, life: .3, col: '#bfe4ff', sfx: 'crack' }); } }
          else B.idle(b); break;
        case 'dizzy': b.vx = 0; if (b.t > 1.3) B.idle(b); break;
        case 'blizzard': b.vx = 0; G.blizzard = Math.max(G.blizzard || 0, .6);
          if (b.t > .4 && b.t < 2.2 && (!b.n2 || b.t > b.n2)) { b.n2 = b.t + .2 / sp; G.projectiles.push({ x: LF.rand(T * 2, G.room.w * T - T * 2), y: 14, w: 6, h: 6, vx: LF.rand(-25, 25), vy: 30, life: 4, dmg: 1, col: '#ffffff', glow: '#cfe8ff', grav: 210 }); }
          if (b.t > 2.6) B.idle(b); break;
        case 'summon': b.vx = 0; if (b.t > .5 && !b.did) { b.did = true; G.sfx('boss'); G.spawnEnemy('snowman', cx - 70, b.y + 8); G.spawnEnemy('snowman', cx + 70, b.y + 8); G.burst(cx, b.y, 18, '#cfe8ff', 100, 1); } if (b.t > 1.2) B.idle(b); break;
      }
    },
    /* ---------------- Hollow Warden ---------------- */
    ai_warden(b, dt, G, pl, dx) {
      const sp = b.phase > 2 ? 1.4 : b.phase > 1 ? 1.2 : 1, cx = b.x + b.w / 2, dist = Math.abs(dx);
      const strike = w => { haz(G, { x: b.face > 0 ? b.x + b.w - 2 : b.x - w + 2, y: b.y - 2, w, h: b.h + 4, delay: 0, life: .16, col: '#ff9a3c', dmg: 1, sfx: 'attack', shake: 2 }); G.burst(cx + b.face * 18, b.y + 14, 6, '#ffd27a', 80, 1); };
      switch (b.state) {
        case 'idle': b.face = dx > 0 ? 1 : -1; b.vx = dist > 38 ? b.face * 44 * sp : 0; if (b.phase > 1 && !b.sum[b.phase]) { b.sum[b.phase] = 1; b.state = 'summon'; b.t = 0; } else if (b.t > .9 / sp) { if (dist < 52 && b.t > 0) { b.state = 'slash'; b.t = 0; b.did = false; } else B.next(b); } break;
        case 'slash': b.vx = 0; if (b.t < .42 / sp) b.flash = Math.max(b.flash, .03 * (Math.sin(b.t * 50) > 0)); else if (!b.did) { b.did = true; b.vx = b.face * 110; strike(36); } if (b.t > .85 / sp) B.idle(b, -.1); break;
        case 'combo': b.vx = 0; if (b.t > .35 / sp && b.did < 1) { b.did = 1; b.vx = b.face * 120; strike(36); } if (b.t > .8 / sp && b.did < 2) { b.did = 2; b.face = dx > 0 ? 1 : -1; b.vx = b.face * 140; strike(40); } if (b.t > 1.3 / sp) B.idle(b); break;
        case 'orbs': b.vx = 0; if (b.t > .45 && !b.did) { b.did = true; fan(G, cx, b.y + 8, b.phase > 2 ? 9 : b.phase > 1 ? 7 : 5, 1.4, 85 * sp, undefined, '#c49bff', '#7a3fd0'); } if (b.t > 1.2) B.idle(b); break;
        case 'leap': if (b.t < .5) { b.vx = 0; b.face = dx > 0 ? 1 : -1; } else if (!b.did) { b.did = true; b.vy = -400; b.vx = cl(dx, -150, 150) * .9; G.sfx('jump'); } else if (b.onGround && b.t > .6) { G.shake(7); G.sfx('boom'); for (const s of [-1, 1]) G.projectiles.push({ x: cx - 5 + s * 10, y: b.floorY - 12, w: 10, h: 12, vx: s * 110 * sp, vy: 0, life: 3, dmg: 1, col: '#ffb060', glow: '#ff8a3d', grav: 0, ghost: 1 }); B.idle(b, -.2); } break;
        case 'summon': b.vx = 0; if (b.t > .5 && !b.did) { b.did = true; G.sfx('boss'); G.spawnEnemy('wisp', cx - 60, b.y - 30); G.spawnEnemy('wisp', cx + 60, b.y - 30); G.burst(cx, b.y, 18, '#c49bff', 100, 1); } if (b.t > 1.2) B.idle(b); break;
      }
    },

    /* ---------------- drawing ---------------- */
    draw(g, b, cam, t, G) {
      if (b.dead) return;
      const x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y), w = b.w, h = b.h, fl = b.flash > 0, C = c => fl ? '#fff' : c, ph = b.ph;
      g.save(); g.translate(x + w / 2, y + h); g.scale(b.face || 1, 1);
      const hw = w / 2;
      if (b.id === 'snowking') {
        const bob = Math.round(Math.sin(ph * 3)), up = b.state === 'throw' || b.state === 'blizzard' || b.state === 'summon';
        R(g, C('#e8f2ff'), -15, -16, 30, 16); R(g, C('#ffffff'), -13, -16, 12, 3); R(g, C('#b8cce8'), -15, -5, 30, 5);
        R(g, C('#e8f2ff'), -11, -30 + bob, 22, 15); R(g, C('#b8cce8'), -11, -19 + bob, 22, 4); R(g, C('#ffffff'), -9, -30 + bob, 8, 2);
        R(g, C('#f4f9ff'), -8, -43 + bob, 16, 14); R(g, C('#ffffff'), -6, -43 + bob, 6, 2);
        R(g, C('#d4a020'), -9, -47 + bob, 18, 4); R(g, C('#ffd860'), -9, -51 + bob, 3, 4); R(g, C('#ffd860'), -2, -53 + bob, 4, 6); R(g, C('#ffd860'), 6, -51 + bob, 3, 4); R(g, '#ff4060', -1, -49 + bob, 2, 2);
        const eye = b.state === 'roll' || up ? '#ff4060' : '#7ad8ff'; R(g, eye, -5, -39 + bob, 3, 3); R(g, eye, 2, -39 + bob, 3, 3); R(g, '#05030f', -4, -38 + bob, 1, 1); R(g, '#05030f', 3, -38 + bob, 1, 1);
        R(g, C('#ff8a3d'), 1, -35 + bob, 9, 2); for (let i = 0; i < 5; i++) R(g, '#1a0f1c', -5 + i * 2, -32 + bob + (i % 2), 1, 1);
        R(g, C('#3a6ad0'), -12, -28 + bob, 24, 3); R(g, C('#3a6ad0'), 3, -26 + bob, 4, 8); R(g, '#1a0f1c', 0, -21 + bob, 2, 2); R(g, '#1a0f1c', 0, -14 + bob, 2, 2);
        const ay = up ? -40 + bob : -22 + bob; R(g, C('#6a4a2a'), -26, ay, 15, 2); R(g, C('#6a4a2a'), 11, ay, 15, 2); R(g, C('#6a4a2a'), -26, ay - (up ? 4 : 3), 2, 4); R(g, C('#6a4a2a'), 24, ay - (up ? 4 : 3), 2, 4);
        if (b.state === 'roll' && b.t < .7) { g.globalAlpha = .45; R(g, '#7ad8ff', -15, -43, 30, 43); g.globalAlpha = 1; }
      } else if (b.id === 'thorn') {
        const sw = Math.sin(ph * 2), sh = b.state === 'dizzy' ? 6 : 0;
        for (let i = 0; i < 6; i++) { const a = -3.0 + i * .55 + sw * .05; R(g, C('#2f6a3a'), Math.cos(a) * 22 - 2, -22 + Math.sin(a) * 20, 4, 4); R(g, C('#ff8aa8'), Math.cos(a) * 24 - 1, -23 + Math.sin(a) * 22, 2, 2); }
        R(g, C('#3a2a30'), -hw + 2, -h + 8 + sh, w - 4, h - 8 - sh); R(g, C('#4a3a40'), -hw + 6, -h + 10 + sh, 6, h - 14 - sh); R(g, C('#2f6a3a'), -hw, -h + 16 + sh, w, 8); R(g, C('#68c262'), -hw + 2, -h + 16 + sh, w - 4, 2);
        R(g, C('#3f8a4c'), -hw + 4, -h + sh, w - 8, 14); R(g, C('#68c262'), -hw + 8, -h + 2 + sh, w - 16, 2);
        const open = b.state === 'volley' || b.state === 'roots' ? 1 : 0; R(g, '#ff5a8a', 2, -h + 6 + sh, 5, 4); R(g, '#ff5a8a', 11, -h + 6 + sh, 5, 4); R(g, '#fff', 3, -h + 7 + sh, 2, 2); R(g, '#fff', 12, -h + 7 + sh, 2, 2);
        R(g, '#1a0a14', 2, -h + 12 + sh, 14, 2 + open * 3);
        R(g, C('#2f6a3a'), -hw - 8, -26 + sw, 10, 4); R(g, C('#2f6a3a'), hw - 2, -22 - sw, 10, 4); R(g, C('#ff8aa8'), -hw - 9, -27 + sw, 2, 2); R(g, C('#ff8aa8'), hw + 7, -23 - sw, 2, 2);
        if (b.state === 'charge' && b.t < .6) { g.globalAlpha = .5; R(g, '#ff5a8a', -hw, -h, w, h); g.globalAlpha = 1; }
      } else if (b.id === 'prism') {
        const hue = (t * 80) % 360, pul = Math.sin(ph * 4) * 2;
        g.fillStyle = C('hsl(' + hue + ',70%,60%)'); g.beginPath(); g.moveTo(0, -h - 4 + pul); g.lineTo(hw + 3, -h / 2); g.lineTo(0, 2 - pul); g.lineTo(-hw - 3, -h / 2); g.closePath(); g.fill();
        g.fillStyle = C('hsl(' + (hue + 60) % 360 + ',80%,80%)'); g.beginPath(); g.moveTo(0, -h - 4 + pul); g.lineTo(hw - 4, -h / 2); g.lineTo(0, -h / 2); g.closePath(); g.fill();
        R(g, C('#fff'), -2, -h / 2 - 4, 4, 6); R(g, '#1a1040', -1, -h / 2 - 2, 2, 3);
        for (let i = 0; i < 6; i++) { const a = ph * 1.5 + i * 1.05; R(g, C('hsl(' + (hue + i * 50) % 360 + ',90%,75%)'), Math.cos(a) * 22 - 1, -h / 2 + Math.sin(a) * 13 - 1, 3, 3); }
      } else if (b.id === 'tide') {
        const sw = Math.sin(ph * 2) * 2;
        R(g, '#2a4a50', -1, -300, 2, 300 - h + 6); R(g, C('#3a6a6a'), -hw + 4, -h + 4, w - 8, 8); R(g, C('#2f8f86'), -hw + 2, -h + 10, w - 4, 12); R(g, C('#4fc7b4'), -hw, -h + 20, w, 10); R(g, C('#2f8f86'), -hw - 3, -h + 28, w + 6, 6);
        R(g, C('#9af0d8'), -hw + 5, -h + 12, 3, 14); R(g, '#12252a', -4, -10, 8, 5 + Math.abs(sw)); R(g, '#c8c0a8', -2 + sw, -6, 4, 6);
        R(g, '#ff5a6e', -hw + 8, -h + 14, 3, 3); R(g, '#ff5a6e', hw - 11, -h + 14, 3, 3);
        if (b.state === 'stuck') { g.globalAlpha = .4; R(g, '#fff', -hw, -h, w, h); g.globalAlpha = 1; }
      } else if (b.id === 'warden') {
        const run = Math.abs(b.vx) > 20, lg = run ? Math.floor(t * 8) % 2 : 0, wd = b.state === 'slash' || b.state === 'combo';
        R(g, C('#1a1428'), -6, -10 + lg, 5, 10 - lg); R(g, C('#1a1428'), 1, -10 + (1 - lg), 5, 10 - (1 - lg));
        R(g, C('#2e2644'), -hw, -h + 12, w, 16); R(g, C('#4a3c6a'), -hw + 2, -h + 14, w - 4, 3); R(g, C('#6a4a9a'), -hw - 2, -h + 10, 5, 5); R(g, C('#6a4a9a'), hw - 3, -h + 10, 5, 5);
        R(g, C('#1a1428'), -6, -h, 12, 13); R(g, C('#3a2c5a'), -6, -h, 12, 2); R(g, '#ffc15a', -3, -h + 4, 6, 7); R(g, '#fff2c9', -2, -h + 5, 2, 4); R(g, '#8a5a1a', -3, -h + 4, 6, 1);
        const sy = wd ? -h + 12 : -h + 18; R(g, '#c8c0e8', hw - 1, sy - 10, 3, 26); R(g, '#fff', hw - 1, sy - 10, 1, 24); R(g, '#6a4a32', hw - 3, sy + 14, 7, 2);
        if (b.phase > 1) { g.globalAlpha = .35 + .2 * Math.sin(ph * 6); R(g, '#c49bff', -hw - 2, -h - 2, w + 4, h + 2); g.globalAlpha = 1; }
      }
      g.restore();
    }
  };
  // Warden needs a per-phase summon memory
  const _make = B.make; B.make = function (id, tx, ty, G) { const b = _make(id, tx, ty, G); b.sum = {}; return b; };
})();
