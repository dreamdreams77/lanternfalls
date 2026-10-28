/* Lanternfall - Ember Arcade: eight mini games (Moth Catcher, Ember Range, Flame Hop, Lantern Echo, Ember Stack, Moth Flight, Wick Breaker, Lantern Snake) with medals, best scores and ember rewards */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, W = LF.W, H = LF.H, In = LF.input, UI = LF.UI, h = UI.h;
  const R = (g, col, x, y, w, hh) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); };
  const txt = (g, s, x, y, col, al) => LF.drawText(g, s, x, y, col, al);
  const big = (g, s, x, y, col) => { g.font = 'bold 16px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#05030f'; g.fillText(s, x + 1, y + 1); g.fillStyle = col; g.fillText(s, x, y); };
  const rnd = LF.rand, TAU = Math.PI * 2;
  const tone = (f, d, v, type) => { const A = LF.Audio; if (A.ready && !LF.settings.mute) A.tone(type || 'triangle', f, f, d || .25, v || .09); };
  const sfx = n => LF.Audio.sfx(n);
  const BEST_KEY = 'lanternfall.arcade.v1', mem = {};
  const loadBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (_) { return mem.v || {}; } };
  const saveBest = v => { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch (_) { mem.v = v; } };
  const PAY = [0, 25, 50, 100], MEDAL = ['None', 'Bronze', 'Silver', 'Gold'];

  /* ---------- shared pixel art ---------- */
  function flame(g, x, y, t, s) {
    s = s || 1; const f = Math.round(Math.sin(t * 12) * s);
    R(g, '#ff8a3d', x - 3 * s, y - 6 * s, 6 * s, 7 * s); R(g, '#ffd27a', x - 2 * s, y - 7 * s - f, 4 * s, 6 * s); R(g, '#fff2c9', x - 1 * s, y - 3 * s, 2 * s, 2 * s);
    R(g, '#05030f', x - 2 * s, y - 4 * s, 1 * s, 1 * s); R(g, '#05030f', x + 1 * s, y - 4 * s, 1 * s, 1 * s);
  }
  function moth(g, x, y, t, col) {
    const up = Math.sin(t * 18) > 0;
    R(g, col, x - 5, y - (up ? 3 : 0), 4, 3); R(g, col, x + 1, y - (up ? 3 : 0), 4, 3); R(g, '#fff2c9', x - 1, y - 1, 2, 4);
  }
  function thorn(g, x, y, w, hh) {
    R(g, '#2f8f4c', x, y, w, hh); R(g, '#7dffb0', x + 2, y + 2, 2, 2);
    for (let i = 0; i < w; i += 4) { R(g, '#2f8f4c', x + i + 1, y - 3, 2, 3); R(g, '#c8ffd8', x + i + 1, y - 4, 1, 1); }
  }
  const glowC = {};
  function glowDot(g, x, y, r, col, a) {
    if (!glowC[col]) { const c = document.createElement('canvas'); c.width = c.height = 64; const x2 = c.getContext('2d'), gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(.4, col + '66'); gr.addColorStop(1, col + '00'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64); glowC[col] = c; }
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, (a || .25) * 2); g.drawImage(glowC[col], x - r, y - r, r * 2, r * 2); g.restore();
  }
  const skyCache = {};
  function sky(g, key, cols) {
    if (!skyCache[key]) { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, H); cols.forEach((col, i) => gr.addColorStop(i / (cols.length - 1), col)); x.fillStyle = gr; x.fillRect(0, 0, W, H); const r = LF.rng(key.length * 97); for (let i = 0; i < 60; i++) { x.globalAlpha = .3 + r() * .7; x.fillStyle = '#fff'; x.fillRect(r() * W, r() * H * .6, 1, 1); } skyCache[key] = c; }
    g.drawImage(skyCache[key], 0, 0);
  }
  function pfx(st, x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rnd(.3, 1) * (sp || 60); st.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.3, .6), col }); } }
  function stepFx(st, dt) { for (let i = st.fx.length - 1; i >= 0; i--) { const p = st.fx[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; if (p.life <= 0) st.fx.splice(i, 1); } }
  function drawFx(g, st) { for (const p of st.fx) { g.globalAlpha = Math.min(1, p.life * 3); R(g, p.col, p.x, p.y, 1, 1); } g.globalAlpha = 1; }
  function popText(st, x, y, s, col) { st.pops.push({ x, y, s, col, t: 0 }); }
  function drawPops(g, st) { for (let i = st.pops.length - 1; i >= 0; i--) { const p = st.pops[i]; g.globalAlpha = Math.max(0, 1 - p.t / .8); txt(g, p.s, p.x, p.y - p.t * 20, p.col, 'center'); if (p.t > .8) st.pops.splice(i, 1); } g.globalAlpha = 1; }
  const stepPops = (st, dt) => st.pops.forEach(p => { p.t += dt; });
  const pressed = (...ks) => ks.some(k => In.hit(k));

  /* ============================== the games ============================== */
  const GAMES = {
    /* Moth Catcher: carry the lantern under falling moths, dodge thorn seeds. Consecutive catches raise the multiplier. */
    moth: {
      name: 'Moth Catcher', desc: 'Catch falling moths in your lantern. Dodge the thorn seeds.', how: 'LEFT / RIGHT to move', medals: [200, 450, 750],
      init: () => ({ score: 0, time: 45, x: W / 2, vx: 0, lives: 3, items: [], spawnT: .5, combo: 0, fx: [], pops: [], hurt: 0, el: 0 }),
      update(st, dt, taps) {
        st.time -= dt; st.el += dt; st.hurt = Math.max(0, st.hurt - dt);
        if (taps.length) st.tx = taps[taps.length - 1].x;
        let ax = In.axis; if (!ax && st.tx != null) { if (Math.abs(st.tx - st.x) > 4) ax = Math.sign(st.tx - st.x); else st.tx = null; } if (In.axis) st.tx = null;
        st.vx = LF.approach(st.vx, ax * 175, 1400 * dt); st.x = LF.clamp(st.x + st.vx * dt, 12, W - 12);
        st.spawnT -= dt;
        if (st.spawnT <= 0) {
          st.spawnT = Math.max(.24, .55 - st.el * .006); const r = Math.random(), k = r < .08 ? 'gold' : r < .34 ? 'thorn' : 'moth';
          st.items.push({ k, x: rnd(14, W - 14), y: -8, vy: (k === 'gold' ? 85 : 45) + st.el * 1.3 + rnd(0, 20), ph: rnd(0, 6) });
        }
        const mult = 1 + Math.min(3, Math.floor(st.combo / 5));
        for (let i = st.items.length - 1; i >= 0; i--) {
          const it = st.items[i]; it.y += it.vy * dt; if (it.k !== 'thorn') it.x += Math.sin(st.el * 3 + it.ph) * 18 * dt;
          if (Math.abs(it.x - st.x) < 13 && it.y > 136 && it.y < 156) {
            st.items.splice(i, 1);
            if (it.k === 'thorn') { if (st.hurt <= 0) { st.lives--; st.hurt = 1; st.combo = 0; sfx('hurt'); pfx(st, it.x, it.y, '#7dffb0', 12, 80); popText(st, it.x, 130, 'OUCH', '#ff6f7d'); } }
            else { const p = (it.k === 'gold' ? 40 : 10) * mult; st.score += p; st.combo++; tone(it.k === 'gold' ? 1568 : 988 + Math.min(10, st.combo) * 40, .12, .06, 'square'); pfx(st, it.x, it.y, it.k === 'gold' ? '#ffd27a' : '#c49bff', 8, 60); popText(st, it.x, 130, '+' + p, it.k === 'gold' ? '#ffd27a' : '#c49bff'); }
          } else if (it.y > 166) { st.items.splice(i, 1); if (it.k !== 'thorn') { st.combo = 0; } }
        }
        stepFx(st, dt); stepPops(st, dt);
        if (st.time <= 0 || st.lives <= 0) { st.time = Math.max(0, st.time); st.over = true; }
      },
      render(g, st, t) {
        sky(g, 'moth', ['#0b0a1a', '#1d1640', '#3a2a5c']);
        R(g, '#0c0818', 0, 156, W, 24); R(g, '#1a2a20', 0, 156, W, 2);
        for (const it of st.items) {
          if (it.k === 'thorn') { R(g, '#2f8f4c', it.x - 3, it.y - 3, 6, 6); R(g, '#7dffb0', it.x - 1, it.y - 5, 2, 10); R(g, '#7dffb0', it.x - 5, it.y - 1, 10, 2); }
          else { glowDot(g, it.x, it.y, 7, it.k === 'gold' ? '#ffd27a' : '#c49bff', .3); moth(g, it.x, it.y, t + it.ph, it.k === 'gold' ? '#ffd27a' : '#c49bff'); }
        }
        if (!(st.hurt > 0 && Math.sin(t * 40) > 0)) {
          glowDot(g, st.x, 146, 22, '#ffb860', .18);
          R(g, '#4a3a2c', st.x - 11, 150, 22, 3); R(g, '#4a3a2c', st.x - 11, 141, 2, 9); R(g, '#4a3a2c', st.x + 9, 141, 2, 9); R(g, '#ffb23a', st.x - 9, 147, 18, 3);
          flame(g, st.x, 145, t);
        }
        drawFx(g, st); drawPops(g, st);
        for (let i = 0; i < 3; i++) R(g, i < st.lives ? '#ff5a6e' : '#3a2a44', 8 + i * 8, 20, 6, 5);
        const m = 1 + Math.min(3, Math.floor(st.combo / 5)); if (m > 1) txt(g, 'x' + m, 8, 36, '#ffd27a');
      }
    },

    /* Ember Range: a shooting gallery. Steer the sight, pop wisps and moths, leave the thorn targets alone, reload when dry. */
    range: {
      name: 'Ember Range', desc: 'A shooting gallery. Pop wisps and moths, never the thorns.', how: 'ARROWS aim · HIT / SHOT / JUMP fire · DOWN+fire reloads · or tap to shoot', medals: [300, 650, 1000],
      init: () => ({ score: 0, time: 40, cx: W / 2, cy: 90, vx: 0, vy: 0, ammo: 6, reload: 0, tg: [], spawnT: .4, combo: 0, fx: [], pops: [], flashT: 0, shots: 0, hits: 0, el: 0 }),
      update(st, dt, taps) {
        st.time -= dt; st.el += dt; st.flashT = Math.max(0, st.flashT - dt);
        const ax = In.axis, ay = (In.isDown('down') ? 1 : 0) - (In.isDown('up') ? 1 : 0);
        st.vx = LF.approach(st.vx, ax * 200, 1600 * dt); st.vy = LF.approach(st.vy, ay * 200, 1600 * dt);
        st.cx = LF.clamp(st.cx + st.vx * dt, 6, W - 6); st.cy = LF.clamp(st.cy + st.vy * dt, 22, H - 18);
        if (st.reload > 0) { st.reload -= dt; if (st.reload <= 0) { st.ammo = 6; tone(660, .08, .06, 'square'); } }
        let shots = taps.map(p => ({ x: p.x, y: p.y }));
        if (pressed('attack', 'shoot', 'jump')) { if (In.isDown('down') && st.ammo < 6 && st.reload <= 0) { st.reload = .7; tone(330, .1, .06, 'square'); } else shots.push({ x: st.cx, y: st.cy }); }
        for (const s of shots) {
          if (st.reload > 0) break;
          if (st.ammo <= 0) { st.reload = .9; break; }
          st.ammo--; st.shots++; st.cx = s.x; st.cy = s.y; st.flashT = .08; sfx('shot');
          let hit = null;
          for (const tg of st.tg) if (!tg.dead && tg.up > .35 && Math.hypot(tg.x - s.x, tg.y - s.y) < tg.r + 3) { hit = tg; break; }
          if (hit) {
            hit.dead = true;
            if (hit.k === 'thorn') { st.score = Math.max(0, st.score - 30); st.combo = 0; sfx('hurt'); popText(st, hit.x, hit.y - 8, '-30', '#ff6f7d'); pfx(st, hit.x, hit.y, '#7dffb0', 12, 70); }
            else { st.hits++; st.combo++; const m = 1 + Math.min(4, Math.floor(st.combo / 4)), p = { wisp: 10, moth: 25, gold: 60 }[hit.k] * m; st.score += p; popText(st, hit.x, hit.y - 8, '+' + p, hit.k === 'gold' ? '#ffd27a' : '#9af0d8'); pfx(st, hit.x, hit.y, hit.k === 'gold' ? '#ffd27a' : '#9af0d8', 12, 80); sfx('kill'); }
          } else { st.combo = 0; pfx(st, s.x, s.y, '#8a7aa8', 4, 30); }
          if (st.ammo <= 0) st.reload = .9;
        }
        st.spawnT -= dt;
        if (st.spawnT <= 0) {
          st.spawnT = Math.max(.35, .8 - st.el * .01); const r = Math.random();
          if (r < .22) { const d = Math.random() < .5 ? 1 : -1; st.tg.push({ k: Math.random() < .2 ? 'gold' : 'moth', x: d > 0 ? -8 : W + 8, y: rnd(30, 70), vx: d * rnd(70, 120) * (1 + st.el * .01), r: 6, up: 1, life: 6, ph: rnd(0, 6) }); }
          else { const row = LF.randi(0, 2), y = [72, 108, 144][row]; st.tg.push({ k: r < .42 ? 'thorn' : 'wisp', x: rnd(24, W - 24), y: y - 10, row, r: 8, up: 0, life: Math.max(1.1, 1.9 - st.el * .015), vx: 0, ph: rnd(0, 6) }); }
        }
        for (let i = st.tg.length - 1; i >= 0; i--) {
          const tg = st.tg[i]; tg.life -= dt; tg.x += tg.vx * dt;
          if (tg.row != null) tg.up = tg.dead || tg.life < .25 ? Math.max(0, tg.up - dt * 6) : Math.min(1, tg.up + dt * 6);
          else tg.y += Math.sin(st.el * 6 + tg.ph) * 30 * dt;
          if ((tg.dead && (tg.row == null || tg.up <= 0)) || tg.life <= 0 || tg.x < -20 || tg.x > W + 20) st.tg.splice(i, 1);
        }
        stepFx(st, dt); stepPops(st, dt);
        if (st.time <= 0) { st.time = 0; st.over = true; const acc = st.shots ? st.hits / st.shots : 0, bonus = Math.round(acc * 150); if (bonus) { st.score += bonus; st.note = 'Accuracy ' + Math.round(acc * 100) + '% +' + bonus; } }
      },
      render(g, st, t) {
        sky(g, 'range', ['#120d2a', '#2a1a40', '#5a2a3a']);
        R(g, '#0c0818', 0, 150, W, 30);
        const rows = [72, 108, 144];
        for (let row = 0; row < 3; row++) {
          for (const tg of st.tg) if (tg.row === row && !(tg.dead && tg.up <= 0)) {
            const y = tg.y + (1 - tg.up) * 16;
            if (tg.k === 'thorn') { R(g, '#5a2a1a', tg.x - 1, y, 2, 12); thorn(g, tg.x - 8, y - 6, 16, 8); R(g, '#ff6f7d', tg.x - 1, y - 3, 2, 2); }
            else { R(g, '#5a4a3a', tg.x - 1, y, 2, 12); glowDot(g, tg.x, y - 2, 10, '#9af0d8', .3); R(g, '#c8fff0', tg.x - 5, y - 7, 10, 10); R(g, '#9af0d8', tg.x - 3, y - 5, 6, 6); R(g, '#05030f', tg.x - 2, y - 4, 1, 2); R(g, '#05030f', tg.x + 1, y - 4, 1, 2); }
          }
          const fy = rows[row]; R(g, ['#2a1f3a', '#241a32', '#1d1428'][row], 0, fy, W, 10); for (let x = (row * 7) % 12; x < W; x += 12) R(g, '#3a2c4c', x, fy - 3, 3, 13); R(g, '#4a3a5c', 0, fy, W, 1);
        }
        for (const tg of st.tg) if (tg.row == null && !tg.dead) { glowDot(g, tg.x, tg.y, 9, tg.k === 'gold' ? '#ffd27a' : '#c49bff', .3); moth(g, tg.x, tg.y, t + tg.ph, tg.k === 'gold' ? '#ffd27a' : '#c49bff'); }
        drawFx(g, st); drawPops(g, st);
        const x = Math.round(st.cx), y = Math.round(st.cy), c = st.reload > 0 ? '#8a7aa8' : '#ff9a3c';
        if (st.flashT > 0) glowDot(g, x, y, 10, '#ffd27a', .5);
        R(g, c, x - 7, y, 5, 1); R(g, c, x + 3, y, 5, 1); R(g, c, x, y - 7, 1, 5); R(g, c, x, y + 3, 1, 5); R(g, '#fff2c9', x, y, 1, 1);
        for (let i = 0; i < 6; i++) R(g, i < st.ammo ? '#ffd27a' : '#3a2a44', 8 + i * 5, H - 10, 3, 6);
        if (st.reload > 0) txt(g, 'RELOADING', 42, H - 4, '#8a7aa8');
        const m = 1 + Math.min(4, Math.floor(st.combo / 4)); if (m > 1) txt(g, 'x' + m, 8, 30, '#ffd27a');
      }
    },

    /* Flame Hop: an endless run. Jump (and double jump) over thorns, duck under bats, grab embers. It keeps speeding up. */
    hop: {
      name: 'Flame Hop', desc: 'Run forever. Hop thorns, duck bats, grab embers.', how: 'JUMP (or tap) to hop · twice for a double hop · hold for height', medals: [200, 450, 800],
      init: () => ({ score: 0, dist: 0, spd: 95, y: 136, vy: 0, onG: true, air: 1, obs: [], em: 0, ems: [], spawnT: 1, fx: [], pops: [], el: 0, held: false }),
      update(st, dt, taps) {
        st.el += dt; st.spd = Math.min(230, 95 + st.el * 3.2); st.dist += st.spd * dt;
        const jump = pressed('jump', 'up', 'attack') || taps.length > 0;
        if (jump) {
          if (st.onG) { st.vy = -310; st.onG = false; st.held = true; tone(520, .08, .05, 'square'); }
          else if (st.air > 0) { st.vy = -270; st.air--; st.held = true; tone(780, .08, .05, 'square'); pfx(st, 60, st.y + 10, '#c49bff', 6, 50); }
        }
        if (st.held && !(In.isDown('jump') || In.isDown('up') || In.isDown('attack') || A.ptr)) { st.held = false; if (st.vy < -120) st.vy = -120; }
        st.vy += 950 * dt; st.y += st.vy * dt;
        if (st.y >= 136) { st.y = 136; st.vy = 0; st.onG = true; st.air = 1; }
        st.spawnT -= dt;
        if (st.spawnT <= 0) {
          st.spawnT = rnd(.75, 1.4) * Math.max(.55, 1 - st.el * .008);
          if (Math.random() < .28 && st.el > 6) st.obs.push({ k: 'bat', x: W + 10, y: rnd(104, 116), w: 12, h: 9 });
          else { const w = LF.randi(1, st.el > 15 ? 3 : 2) * 8; st.obs.push({ k: 'thorn', x: W + 10, y: 142, w, h: 8 }); }
          if (Math.random() < .6) { const n = LF.randi(1, 3), yy = rnd(90, 128); for (let i = 0; i < n; i++) st.ems.push({ x: W + 40 + i * 12, y: yy }); }
        }
        const pb = { x: 54, y: st.y, w: 10, h: 14 };
        for (let i = st.obs.length - 1; i >= 0; i--) {
          const o = st.obs[i]; o.x -= st.spd * dt * (o.k === 'bat' ? 1.25 : 1);
          if (o.x < -20) { st.obs.splice(i, 1); continue; }
          if (LF.overlap(pb, { x: o.x + 2, y: o.y + 1, w: o.w - 4, h: o.h - 1 })) { st.over = true; sfx('hurt'); pfx(st, 60, st.y + 7, '#ff8a3d', 20, 100); }
        }
        for (let i = st.ems.length - 1; i >= 0; i--) {
          const e = st.ems[i]; e.x -= st.spd * dt;
          if (e.x < -10) { st.ems.splice(i, 1); continue; }
          if (Math.abs(e.x - 59) < 9 && Math.abs(e.y - (st.y + 7)) < 11) { st.ems.splice(i, 1); st.em++; tone(988 + (st.em % 5) * 90, .07, .05, 'square'); pfx(st, e.x, e.y, '#ffd27a', 5, 40); popText(st, e.x, e.y - 6, '+5', '#ffd27a'); }
        }
        st.score = Math.floor(st.dist / 10) + st.em * 5;
        stepFx(st, dt); stepPops(st, dt);
      },
      render(g, st, t) {
        sky(g, 'hop', ['#0b0a1a', '#22183e', '#4a2a4a']);
        const o1 = st.dist * .15, o2 = st.dist * .4;
        g.fillStyle = '#1a1430'; g.beginPath(); g.moveTo(0, 150); for (let x = 0; x <= W; x += 4) g.lineTo(x, 110 + Math.sin((x + o1) * .02) * 14 + Math.sin((x + o1) * .05) * 5); g.lineTo(W, 150); g.fill();
        g.fillStyle = '#120d24'; g.beginPath(); g.moveTo(0, 150); for (let x = 0; x <= W; x += 4) g.lineTo(x, 128 + Math.sin((x + o2) * .035) * 8); g.lineTo(W, 150); g.fill();
        R(g, '#0c0818', 0, 150, W, 30); R(g, '#2a4a30', 0, 150, W, 2);
        for (let x = -((st.dist) % 16); x < W; x += 16) R(g, '#3a6a40', x, 149, 2, 1);
        for (const e of st.ems) { glowDot(g, e.x, e.y, 6, '#ffb860', .3); R(g, '#ff8a3d', e.x - 2, e.y - 2, 4, 4); R(g, '#ffd27a', e.x - 1, e.y - 1, 2, 2); }
        for (const o of st.obs) {
          if (o.k === 'thorn') thorn(g, o.x, o.y, o.w, o.h);
          else { const up = Math.sin(t * 16) > 0; R(g, '#3a2a50', o.x + 3, o.y + 2, 6, 6); R(g, '#5a4a7a', o.x, o.y + (up ? 0 : 4), 4, 3); R(g, '#5a4a7a', o.x + 8, o.y + (up ? 0 : 4), 4, 3); R(g, '#ff6f7d', o.x + 4, o.y + 4, 1, 1); R(g, '#ff6f7d', o.x + 7, o.y + 4, 1, 1); }
        }
        if (!st.over) { glowDot(g, 59, st.y + 7, 18, '#ffb860', .2); flame(g, 59, st.y + 14, t, 2); }
        drawFx(g, st); drawPops(g, st);
        txt(g, Math.floor(st.dist / 10) + 'm', 8, 30, '#c49bff');
      }
    },

    /* Lantern Echo: watch the lanterns light in order, then repeat it. One step longer each round. */
    echo: {
      name: 'Lantern Echo', desc: 'Watch the lanterns, then light them in the same order.', how: 'ARROWS (or tap a lantern) to light it', medals: [500, 900, 1400],
      init: () => ({ score: 0, seq: [LF.randi(0, 3)], phase: 'show', i: 0, t: -.4, lit: -1, litT: 0, wait: 0, fx: [], pops: [] }),
      update(st, dt, taps) {
        const POS = ECHO_POS, NOTE = [392, 523, 659, 784], KEYS = ['up', 'right', 'down', 'left'];
        stepFx(st, dt); stepPops(st, dt);
        st.litT = Math.max(0, st.litT - dt); if (!st.litT) st.lit = -1;
        const on = Math.max(.22, .5 - st.seq.length * .02);
        if (st.phase === 'show') {
          st.t += dt;
          if (st.t >= on + .14) { st.t = 0; st.i++; }
          if (st.i >= st.seq.length) { st.phase = 'input'; st.i = 0; st.wait = 0; return; }
          if (st.t >= 0 && st.lit < 0 && st.t < on) { st.lit = st.seq[st.i]; st.litT = on; tone(NOTE[st.lit], on, .1); }
          return;
        }
        if (st.phase === 'next') { st.t += dt; if (st.t > .6) { st.seq.push(LF.randi(0, 3)); st.phase = 'show'; st.i = 0; st.t = -.2; } return; }
        st.wait += dt; if (st.wait > 5) { st.over = true; st.note = 'Too slow!'; sfx('lose'); return; }
        let pick = -1;
        KEYS.forEach((k, n) => { if (In.hit(k)) pick = n; });
        for (const p of taps) { let bd = 34; POS.forEach((q, n) => { const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < bd) { bd = d; pick = n; } }); }
        if (pick < 0) return;
        st.wait = 0; st.lit = pick; st.litT = .22;
        if (pick !== st.seq[st.i]) { st.over = true; st.note = 'Wrong lantern'; tone(110, .5, .12, 'sawtooth'); pfx(st, POS[pick][0], POS[pick][1], '#ff6f7d', 16, 80); return; }
        tone(NOTE[pick], .22, .1); pfx(st, POS[pick][0], POS[pick][1], ECHO_COL[pick], 6, 50); st.i++;
        if (st.i >= st.seq.length) { const p = 100; st.score += p; popText(st, W / 2, 98, 'ROUND ' + st.seq.length + ' +' + p, '#ffd27a'); sfx('ok'); st.phase = 'next'; st.t = 0; }
      },
      render(g, st, t) {
        sky(g, 'echo', ['#0b0a1a', '#141030', '#22183e']);
        ECHO_POS.forEach((q, n) => {
          const lit = st.lit === n, x = q[0], y = q[1], c = ECHO_COL[n];
          if (lit) glowDot(g, x, y, 26, c, .45);
          R(g, '#3a2a20', x - 1, y - 18, 2, 6); R(g, '#4a3a2c', x - 8, y - 12, 16, 2); R(g, '#4a3a2c', x - 8, y + 10, 16, 2); R(g, '#4a3a2c', x - 8, y - 12, 2, 24); R(g, '#4a3a2c', x + 6, y - 12, 2, 24);
          R(g, lit ? c : '#2a2040', x - 6, y - 10, 12, 20); if (lit) { R(g, '#fff2c9', x - 3, y - 6, 6, 10); } else R(g, c, x - 1, y - 2, 2, 3);
          txt(g, ['▲', '▶', '▼', '◀'][n], x + (n === 1 ? 16 : n === 3 ? -16 : 0), y + (n === 0 ? -20 : n === 2 ? 26 : 3), '#5a4a7a', 'center');
        });
        drawFx(g, st); drawPops(g, st);
        txt(g, st.phase === 'input' ? 'YOUR TURN  ' + st.i + ' / ' + st.seq.length : st.phase === 'show' ? 'WATCH...' : 'NICE!', W / 2, H - 8, st.phase === 'input' ? '#7dffb0' : '#c49bff', 'center');
      }
    },

    /* Ember Stack: a block slides back and forth; drop it on the tower. Overhang is sliced off; perfect drops keep the width and can grow it back. */
    stack: {
      name: 'Ember Stack', desc: 'Drop sliding lantern blocks into a tall tower.', how: 'JUMP / HIT / SHOT (or tap) to drop the block', medals: [15, 30, 50],
      init: () => ({ score: 0, tower: [{ x: W / 2 - 40, w: 80 }], cur: { x: 0, w: 80, dir: 1 }, perfect: 0, cam: 0, chips: [], fx: [], pops: [] }),
      update(st, dt, taps) {
        const lvl = st.tower.length, c = st.cur, top = st.tower[st.tower.length - 1], BH = 8;
        c.x += c.dir * (60 + Math.min(lvl, 40) * 4) * dt;
        if (c.x < 0) { c.x = 0; c.dir = 1; } if (c.x + c.w > W) { c.x = W - c.w; c.dir = -1; }
        const want = Math.max(0, lvl * BH - 96); st.cam += (want - st.cam) * Math.min(1, dt * 6);
        for (let i = st.chips.length - 1; i >= 0; i--) { const p = st.chips[i]; p.vy += 500 * dt; p.y += p.vy * dt; if (p.y > H + 40) st.chips.splice(i, 1); }
        stepFx(st, dt); stepPops(st, dt);
        if (!(pressed('jump', 'attack', 'shoot', 'up') || taps.length)) return;
        const y = H - 10 - lvl * BH, x0 = Math.max(c.x, top.x), x1 = Math.min(c.x + c.w, top.x + top.w);
        if (x1 - x0 <= 0) { st.chips.push({ x: c.x, w: c.w, y, vy: 0, col: COLS[lvl % COLS.length] }); st.over = true; sfx('lose'); return; }
        let nb;
        if (Math.abs(c.x - top.x) < 3) {
          st.perfect++; nb = { x: top.x, w: Math.min(80, top.w + (st.perfect >= 3 ? 4 : 0)) }; st.score += 3; tone(660 + Math.min(8, st.perfect) * 80, .14, .08, 'square');
          popText(st, W / 2, y - 8 + st.cam, st.perfect >= 3 ? 'PERFECT x' + st.perfect : 'PERFECT', '#ffd27a'); pfx(st, nb.x + nb.w / 2, y + st.cam, '#ffd27a', 10, 60);
        } else {
          st.perfect = 0; nb = { x: x0, w: x1 - x0 }; st.score += 1; tone(440, .08, .06, 'square');
          const cx = c.x < top.x ? c.x : x1, cw = c.w - nb.w; if (cw > 0) st.chips.push({ x: cx, w: cw, y, vy: -40, col: COLS[lvl % COLS.length] });
        }
        st.tower.push(nb); st.cur = { x: c.dir > 0 ? 0 : W - nb.w, w: nb.w, dir: c.dir };
      },
      render(g, st, t) {
        sky(g, 'stack', ['#0b0a1a', '#1d1640', '#3a2a5c']);
        const BH = 8, cam = Math.round(st.cam);
        R(g, '#0c0818', 0, H - 10 + cam, W, 10);
        st.tower.forEach((b, i) => { const y = H - 10 - (i + 1) * BH + cam, col = i ? COLS[i % COLS.length] : '#4a3a2c'; if (y > H || y < -BH) return; R(g, col, b.x, y, b.w, BH); R(g, '#fff2c9', b.x, y, b.w, 1); R(g, '#05030f', b.x, y + BH - 1, b.w, 1); });
        for (const p of st.chips) R(g, p.col, p.x, p.y + cam, p.w, BH);
        if (!st.over) {
          const lvl = st.tower.length, y = H - 10 - (lvl + 1) * BH + cam, c = st.cur, col = COLS[lvl % COLS.length];
          glowDot(g, c.x + c.w / 2, y + 4, c.w / 2 + 6, col, .2); R(g, col, c.x, y, c.w, BH); R(g, '#fff2c9', c.x, y, c.w, 1);
        }
        drawFx(g, st); drawPops(g, st);
        txt(g, 'HEIGHT ' + (st.tower.length - 1), 8, 30, '#c49bff');
      }
    },

    /* Moth Flight: flap through the gaps in thorny vines. */
    flight: {
      name: 'Moth Flight', desc: 'Flap a moth through the gaps in the thorn vines.', how: 'JUMP (or tap) to flap', medals: [6, 15, 25],
      init: () => ({ score: 0, y: 80, vy: 0, vines: [], spawnT: .6, el: 0, fx: [], pops: [] }),
      update(st, dt, taps) {
        st.el += dt; const spd = Math.min(115, 72 + st.el * 1.1);
        if (pressed('jump', 'up', 'attack', 'shoot') || taps.length) { st.vy = -165; tone(880, .05, .04, 'square'); pfx(st, 80, st.y + 3, '#c49bff', 3, 30); }
        st.vy = Math.min(st.vy + 520 * dt, 260); st.y += st.vy * dt;
        st.spawnT -= dt;
        if (st.spawnT <= 0) { st.spawnT = 1.7; const gap = Math.max(46, 64 - st.el * .5); st.vines.push({ x: W + 8, gy: rnd(40, H - 30 - gap), gh: gap, passed: false }); }
        for (let i = st.vines.length - 1; i >= 0; i--) {
          const v = st.vines[i]; v.x -= spd * dt;
          if (v.x < -20) { st.vines.splice(i, 1); continue; }
          if (!v.passed && v.x + 14 < 76) { v.passed = true; st.score++; tone(1320, .08, .06, 'square'); popText(st, 80, st.y - 10, '+1', '#ffd27a'); }
          if (76 + 8 > v.x && 76 - 4 < v.x + 14 && (st.y - 3 < v.gy || st.y + 3 > v.gy + v.gh)) st.over = true;
        }
        if (st.y < 18 || st.y > H - 12) st.over = true;
        if (st.over) { sfx('hurt'); pfx(st, 80, st.y, '#c49bff', 16, 90); }
        stepFx(st, dt); stepPops(st, dt);
      },
      render(g, st, t) {
        sky(g, 'flight', ['#07051a', '#151036', '#2a1a40']);
        R(g, '#0c0818', 0, H - 10, W, 10); R(g, '#1a1228', 0, 14, W, 4);
        for (const v of st.vines) {
          R(g, '#1f5a34', v.x, 18, 14, v.gy - 18); R(g, '#1f5a34', v.x, v.gy + v.gh, 14, H - 10 - v.gy - v.gh);
          for (let y = 20; y < v.gy; y += 7) { R(g, '#2f8f4c', v.x - 2, y, 3, 2); R(g, '#2f8f4c', v.x + 13, y + 3, 3, 2); }
          for (let y = v.gy + v.gh + 2; y < H - 10; y += 7) { R(g, '#2f8f4c', v.x - 2, y, 3, 2); R(g, '#2f8f4c', v.x + 13, y + 3, 3, 2); }
          thorn(g, v.x - 1, v.gy - 6, 16, 6); thorn(g, v.x - 1, v.gy + v.gh, 16, 6);
        }
        if (!st.over) { glowDot(g, 80, st.y, 16, '#c49bff', .3); moth(g, 80, st.y, t * (st.vy < 0 ? 1.8 : .8), '#c49bff'); }
        drawFx(g, st); drawPops(g, st);
      }
    },

    /* Wick Breaker: bounce embers off your paddle to break crystal bricks. Bricks broken before the ember returns build a combo;
       glowing kindle bricks split the ember into three. 90 seconds, 3 lives (a life is lost only when every ember is gone). */
    breaker: {
      name: 'Wick Breaker', desc: 'Bounce embers to shatter walls of crystal bricks.', how: 'LEFT / RIGHT (or tap) to move · JUMP to launch', medals: [300, 700, 1200],
      init() { const st = { score: 0, time: 90, px: W / 2, lives: 3, level: 0, fx: [], pops: [] }; this.wall(st); return st; },
      wall(st) {
        st.level++; st.bricks = []; st.balls = [{ x: st.px, y: 158, vx: 0, vy: 0, combo: 0 }]; st.stuck = true;
        for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) if ((r + c + st.level) % 7 !== 0 || st.level === 1)
          st.bricks.push({ x: 20 + c * 28, y: 36 + r * 10, hp: r < st.level - 1 || (r === 0 && st.level > 1) ? 2 : 1, row: r, kindle: (c * 3 + r * 5 + st.level) % 11 === 0 });
      },
      speed: st => 190 * (1 + (st.level - 1) * .08),
      update(st, dt, taps) {
        st.time -= dt; if (st.time <= 0) { st.time = 0; st.over = true; return; }
        if (taps.length) st.tx = taps[taps.length - 1].x;
        let ax = In.axis; if (!ax && st.tx != null) { if (Math.abs(st.tx - st.px) > 3) ax = Math.sign(st.tx - st.px); else st.tx = null; } if (In.axis) st.tx = null;
        st.px = LF.clamp(st.px + ax * 240 * dt, 20, W - 20);
        stepFx(st, dt); stepPops(st, dt);
        const sp = this.speed(st);
        if (st.stuck) {
          const b = st.balls[0]; b.x = st.px; b.y = 158;
          if (pressed('jump', 'attack', 'shoot', 'up') || taps.length) { st.stuck = false; const a = -Math.PI / 2 + rnd(-.4, .4); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; tone(520, .08, .06, 'square'); }
          return;
        }
        for (const b of st.balls) {
          const px = b.x, py = b.y; b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 3 || b.x > W - 3) { b.vx = -b.vx; b.x = LF.clamp(b.x, 3, W - 3); }
          if (b.y < 20) { b.vy = Math.abs(b.vy); b.y = 20; }
          if (b.vy > 0 && b.y > 160 && b.y < 167 && Math.abs(b.x - st.px) < 20) {
            let k = (b.x - st.px) / 20; if (Math.abs(k) < .12) k = (k < 0 ? -1 : 1) * .12 + rnd(-.08, .08); // never dead-vertical
            let a = -Math.PI / 2 + k * 1.05;
            if (st.bricks.length <= 4) { // the ember seeks the last crystals, so a wall never stalls on one stray brick
              const br = st.bricks.reduce((m, q) => Math.abs(q.x + 12 - b.x) < Math.abs(m.x + 12 - b.x) ? q : m), to = Math.atan2(br.y + 4 - b.y, br.x + 12 - b.x);
              a = LF.lerp(a, to, .65); a = LF.clamp(a, -Math.PI + .35, -.35);
            }
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.y = 160; b.combo = 0; tone(330, .05, .05, 'square');
          }
          for (const br of st.bricks) {
            if (br.dead || b.x < br.x - 2 || b.x > br.x + 26 || b.y < br.y - 2 || b.y > br.y + 10) continue;
            if (px < br.x - 2 || px > br.x + 26) b.vx = -b.vx; else b.vy = -b.vy;
            b.x = px; b.y = py; br.hp--;
            if (br.hp <= 0) {
              br.dead = true; b.combo++; const p = (10 + br.row * 2) * Math.min(5, b.combo); st.score += p;
              pfx(st, br.x + 12, br.y + 4, br.kindle ? '#ffd27a' : COLS[br.row % COLS.length], 8, 70); tone(700 + Math.min(8, b.combo) * 70, .06, .05, 'square');
              if (b.combo >= 3) popText(st, br.x + 12, br.y - 2, 'x' + Math.min(5, b.combo), '#ffd27a');
              if (br.kindle && st.balls.length < 6) { [-.5, .5].forEach(d => { const a = Math.atan2(b.vy, b.vx) + d; st.balls.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, combo: b.combo }); }); sfx('glow'); popText(st, br.x + 12, br.y + 12, 'SPLIT!', '#ffb23a'); }
            } else { st.score += 5; pfx(st, br.x + 12, br.y + 4, '#c8e8ff', 4, 40); tone(1200, .04, .04, 'square'); }
            break;
          }
        }
        st.bricks = st.bricks.filter(br => !br.dead);
        st.balls = st.balls.filter(b => b.y <= H + 4);
        if (!st.bricks.length) { st.score += 150; popText(st, W / 2, 100, 'WALL CLEAR +150', '#ffd27a'); sfx('charm'); this.wall(st); return; }
        if (!st.balls.length) { st.lives--; sfx('hurt'); if (st.lives <= 0) { st.over = true; return; } st.balls = [{ x: st.px, y: 158, vx: 0, vy: 0, combo: 0 }]; st.stuck = true; }
      },
      render(g, st, t) {
        sky(g, 'breaker', ['#0b0a1a', '#141030', '#22183e']);
        for (const br of st.bricks) {
          const col = br.hp > 1 ? '#c8e8ff' : br.kindle ? '#ffd27a' : COLS[br.row % COLS.length]; R(g, '#05030f', br.x - 1, br.y - 1, 26, 10); R(g, col, br.x, br.y, 24, 8); R(g, '#fff2c9', br.x, br.y, 24, 1);
          if (br.hp > 1) R(g, '#7ad8ff', br.x + 2, br.y + 3, 20, 2);
          if (br.kindle) { glowDot(g, br.x + 12, br.y + 4, 12, '#ffb860', .25 + .15 * Math.sin(t * 6)); R(g, '#ff8a3d', br.x + 10, br.y + 2, 4, 4); }
        }
        R(g, '#4a3a2c', st.px - 18, 164, 36, 4); R(g, '#ffb23a', st.px - 16, 163, 32, 2); glowDot(g, st.px, 164, 22, '#ffb860', .15);
        for (const b of st.balls) { glowDot(g, b.x, b.y, 10, '#ffb860', .35); R(g, '#ff8a3d', b.x - 2, b.y - 2, 4, 4); R(g, '#fff2c9', b.x - 1, b.y - 1, 2, 2); }
        drawFx(g, st); drawPops(g, st);
        for (let i = 0; i < 3; i++) R(g, i < st.lives ? '#ff5a6e' : '#3a2a44', 8 + i * 8, 20, 6, 5);
        txt(g, 'WALL ' + st.level, W - 8, 30, '#c49bff', 'right'); // bricks start at y 36, below this line
        if (st.stuck) txt(g, 'LAUNCH!', st.px, 154, '#ffd27a', 'center');
      }
    },

    /* Lantern Snake: a trail of flame that grows as it eats embers. Don't bite your own tail or the walls. */
    snake: {
      name: 'Lantern Snake', desc: 'Grow a trail of flame by eating embers. Mind your tail.', how: 'ARROWS to turn · or tap a side of the screen', medals: [100, 250, 450],
      init: () => { const st = { score: 0, body: [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }], dir: { x: 1, y: 0 }, next: null, stepT: 0, grow: 0, food: null, gold: null, eaten: 0, fx: [], pops: [] }; snakeFood(st); return st; },
      update(st, dt, taps) {
        const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
        for (const k in D) if (In.hit(k)) st.next = { x: D[k][0], y: D[k][1] };
        for (const p of taps) { const h = st.body[0], hx = SX + h.x * SC + 5, hy = SY + h.y * SC + 5, dx = p.x - hx, dy = p.y - hy; st.next = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) }; }
        if (st.next && !(st.next.x === -st.dir.x && st.next.y === -st.dir.y)) st.dir = st.next;
        st.next = null;
        if (st.gold) { st.gold.t -= dt; if (st.gold.t <= 0) st.gold = null; }
        st.stepT -= dt; stepFx(st, dt); stepPops(st, dt);
        if (st.stepT > 0) return;
        st.stepT = Math.max(.065, .13 - st.eaten * .003);
        const h = st.body[0], n = { x: h.x + st.dir.x, y: h.y + st.dir.y };
        if (n.x < 0 || n.y < 0 || n.x >= GW || n.y >= GH || st.body.slice(0, -1).some(s => s.x === n.x && s.y === n.y)) { st.over = true; sfx('hurt'); pfx(st, SX + h.x * SC + 5, SY + h.y * SC + 5, '#ff8a3d', 18, 90); return; }
        st.body.unshift(n);
        const at = q => q && q.x === n.x && q.y === n.y, cx = SX + n.x * SC + 5, cy = SY + n.y * SC + 5;
        if (at(st.food)) { st.eaten++; st.grow += 2; st.score += 10; tone(988 + (st.eaten % 6) * 70, .07, .05, 'square'); pfx(st, cx, cy, '#ffd27a', 6, 40); snakeFood(st); if (st.eaten % 5 === 0) snakeGold(st); }
        else if (at(st.gold)) { st.score += 50; st.grow += 3; st.gold = null; tone(1568, .15, .07); popText(st, cx, cy - 6, '+50', '#ffd27a'); pfx(st, cx, cy, '#c49bff', 12, 60); }
        if (st.grow > 0) st.grow--; else st.body.pop();
      },
      render(g, st, t) {
        sky(g, 'snake', ['#0b0a1a', '#141030', '#1d1640']);
        R(g, '#4a3a2c', SX - 2, SY - 2, GW * SC + 4, GH * SC + 4); R(g, '#0c0818', SX, SY, GW * SC, GH * SC);
        for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) if ((x + y) % 2 === 0) R(g, '#100b20', SX + x * SC, SY + y * SC, SC, SC);
        const cell = (q, col, inset) => R(g, col, SX + q.x * SC + inset, SY + q.y * SC + inset, SC - inset * 2, SC - inset * 2);
        if (st.food) { glowDot(g, SX + st.food.x * SC + 5, SY + st.food.y * SC + 5, 8, '#ffb860', .35); cell(st.food, '#ff8a3d', 2); cell(st.food, '#ffd27a', 3); }
        if (st.gold && (st.gold.t > 1.5 || Math.sin(t * 20) > 0)) { glowDot(g, SX + st.gold.x * SC + 5, SY + st.gold.y * SC + 5, 10, '#c49bff', .4); moth(g, SX + st.gold.x * SC + 5, SY + st.gold.y * SC + 5, t, '#ffd27a'); }
        st.body.forEach((q, i) => { const k = i / st.body.length; cell(q, i === 0 ? '#fff2c9' : k < .5 ? '#ffb23a' : '#ff8a3d', i === 0 ? 0 : 1); });
        const h = st.body[0]; R(g, '#05030f', SX + h.x * SC + 3, SY + h.y * SC + 3, 1, 1); R(g, '#05030f', SX + h.x * SC + 6, SY + h.y * SC + 3, 1, 1);
        drawFx(g, st); drawPops(g, st);
      }
    }
  };
  const ECHO_POS = [[W / 2, 44], [W / 2 + 60, 94], [W / 2, 144], [W / 2 - 60, 94]], ECHO_COL = ['#ff8a3d', '#7ad8ff', '#7dffb0', '#c49bff'];
  const COLS = ['#ff8a3d', '#ffb23a', '#ffd27a', '#c49bff', '#7ad8ff', '#7dffb0'];
  // Lantern Snake board: 30 x 14 cells of 10 px under the score line
  const SC = 10, GW = 30, GH = 14, SX = 10, SY = 26;
  function snakeFree(st) { for (let k = 0; k < 500; k++) { const q = { x: LF.randi(0, GW - 1), y: LF.randi(0, GH - 1) }; if (!st.body.some(s => s.x === q.x && s.y === q.y) && !(st.food && st.food.x === q.x && st.food.y === q.y)) return q; } return { x: 0, y: 0 }; }
  function snakeFood(st) { st.food = snakeFree(st); }
  function snakeGold(st) { st.gold = Object.assign(snakeFree(st), { t: 5 }); }

  /* ============================== arcade controller ============================== */
  const A = LF.Arcade = {
    GAMES, cur: null, from: 'title', taps: [], ptr: false, quitBtn: null,
    medal(id, score) { const m = GAMES[id].medals; return score >= m[2] ? 3 : score >= m[1] ? 2 : score >= m[0] ? 1 : 0; },
    medals() { return (G.save && (G.save.ext || {}).medals) || {}; },
    // list of game buttons, shared by the title screen and the pause-menu tab
    list(wrap) {
      const best = loadBest(), med = this.medals(), items = [];
      Object.keys(GAMES).forEach(id => {
        const gm = GAMES[id], b = best[id] || 0, m = this.medal(id, b), won = this.from === 'pause' ? (med[id] || 0) : m;
        const btn = UI.btn('<span style="display:block">' + gm.name + ' ' + [1, 2, 3].map(k => '<i class="medal m' + (won >= k ? k : 0) + '"></i>').join('') + '</span><small style="display:block;opacity:.75;letter-spacing:.04em;text-transform:none;font-weight:600;font-size:.72em">' + gm.desc + (b ? ' · Best ' + b : '') + '</small>', () => this.play(id));
        btn.style.textAlign = 'left'; items.push(btn); wrap.append(btn);
      });
      return items;
    },
    open(from) {
      this.from = from;
      const s = h('div', 'screen dim'), p = h('div', 'panel'); p.style.minWidth = 'calc(var(--u)*40)';
      p.append(h('h2', '', 'Ember Arcade'), h('div', 'hint', 'Medals: bronze, silver, gold. Play from the pause menu during a journey to win embers for new medals.'));
      const m = h('div', 'menu agrid'); m.style.margin = '.6em auto 0'; const items = this.list(m);
      const bk = UI.btn('Back', () => { sfx('back'); UI.title(); }, 'sm'); bk.style.gridColumn = '1 / -1'; m.append(bk); items.push(bk);
      p.append(m); s.append(p); UI.show(s); UI.setNav(items, a => { if (a === 'pause') { bk.click(); return true; } return false; });
    },
    play(id) {
      const gm = GAMES[id]; UI.clearScreen(); In.clear(); LF.Audio.init(); UI.tipEl.classList.add('hidden');
      this.cur = { id, gm, st: gm.init(), ready: 1.4, over: false, overT: 0, shown: false }; this.taps = [];
      G.setState('mini'); LF.Audio.playMusic('spire');
      if (this.quitBtn) this.quitBtn.remove();
      const q = this.quitBtn = UI.btn('&times; Quit', () => this.quit(), 'sm mg-quit'); UI.layer.appendChild(q);
    },
    update(dt) {
      const c = this.cur; if (!c) return;
      const taps = this.taps; this.taps = [];
      if (In.hit('pause') && !c.shown) { this.quit(); return; }
      if (c.over) { if (!c.shown && (c.overT += dt) > .9) { c.shown = true; this.results(); } return; }
      if (c.ready > 0) { c.ready -= dt; return; }
      c.gm.update(c.st, dt, taps);
      if (c.st.over) { c.over = true; sfx(c.st.score > 0 ? 'win' : 'lose'); }
    },
    render(g) {
      const c = this.cur; if (!c) { R(g, '#05030f', 0, 0, W, H); return; }
      c.gm.render(g, c.st, G.clock);
      txt(g, 'SCORE ' + c.st.score + (c.st.time != null ? '   ' + Math.ceil(c.st.time) + 's' : ''), W / 2, 12, '#ffd27a', 'center');
      if (c.ready > 0) {
        g.globalAlpha = .7; R(g, '#05030f', 0, 52, W, 64); g.globalAlpha = 1;
        big(g, c.gm.name.toUpperCase(), W / 2, 76, '#ffe2a0'); txt(g, c.gm.how, W / 2, 92, '#c9b8e8', 'center'); txt(g, c.ready > .5 ? 'GET READY' : 'GO!', W / 2, 108, '#ff9a3c', 'center');
      }
      if (c.over && !c.shown) big(g, c.st.time === 0 ? 'TIME!' : 'GAME OVER', W / 2, H / 2, '#ff9a3c');
    },
    results() {
      const c = this.cur, id = c.id, gm = c.gm, sc = c.st.score, best = loadBest(), prevBest = best[id] || 0, medal = this.medal(id, sc);
      if (sc > prevBest) { best[id] = sc; saveBest(best); }
      let reward = '';
      if (this.from === 'pause' && G.save) {
        const s = G.save; s.ext = s.ext || {}; const med = s.ext.medals = s.ext.medals || {}, had = med[id] || 0;
        if (medal > had) { let pay = 0; for (let k = had + 1; k <= medal; k++) pay += PAY[k]; med[id] = medal; s.embers += pay; reward = MEDAL[medal] + ' medal! +' + pay + ' embers'; sfx('charm'); G.checkBounties(); LF.Save.write(s); }
        else if (medal) reward = 'Medal already earned on this journey';
      } else if (medal) reward = 'Play from the pause menu to earn embers for medals';
      const nxt = gm.medals.find(m => m > sc);
      const s = h('div', 'screen dim'), p = h('div', 'panel'); p.style.textAlign = 'center';
      p.append(h('h2', '', gm.name));
      p.insertAdjacentHTML('beforeend', '<div class="col" style="margin:0 auto">' + [['Score', sc], ['Best', Math.max(sc, prevBest) + (sc > prevBest ? ' <span style="color:#7dffb0">NEW!</span>' : '')], ['Medal', medal ? '<i class="medal m' + medal + '"></i> ' + MEDAL[medal] : 'None'], ['Next medal at', nxt || '-']].map(r => '<div class="stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>' +
        (c.st.note ? '<div class="hint">' + c.st.note + '</div>' : '') + (reward ? '<div class="hint" style="color:#ffd27a">' + reward + '</div>' : ''));
      const m = h('div', 'menu'); m.style.margin = '.8em auto 0';
      const again = UI.btn('Play Again', () => this.play(id)), back = UI.btn('Back', () => this.quit());
      m.append(again, back); p.append(m); s.append(p); UI.show(s); UI.setNav([again, back], a => { if (a === 'pause') { back.click(); return true; } return false; });
    },
    quit() {
      if (!this.cur) return;
      this.cur = null; if (this.quitBtn) { this.quitBtn.remove(); this.quitBtn = null; }
      UI.clearScreen(); In.clear(); sfx('back');
      if (this.from === 'pause' && G.room && G.save) { G.setState('paused'); LF.Audio.playMusic(G.room.music); UI.menu('arcade'); }
      else UI.title();
    }
  };

  // taps on the screen (outside the touch buttons) go to the running game, in game pixels
  document.getElementById('stage').addEventListener('pointerdown', e => {
    if (LF.state !== 'mini' || !A.cur || A.cur.shown || (e.target.closest && e.target.closest('button'))) return;
    A.taps.push(LF.toGame(e.clientX, e.clientY)); A.ptr = true;
  });
  ['pointerup', 'pointercancel'].forEach(n => window.addEventListener(n, () => { A.ptr = false; }));

  const updO = G.update;
  G.update = function (dt) { if (LF.state === 'mini') { this.clock += dt; A.update(dt); return; } return updO.call(this, dt); };

  /* ---------- pause-menu tab, bounties ---------- */
  UI.tab_arcade = function (body) {
    A.from = 'pause';
    body.append(h('h2', '', 'Ember Arcade'), h('div', 'hint', 'New medals pay embers: bronze 25, silver 50, gold 100.'));
    const m = h('div', 'menu agrid'); m.style.margin = '.5em auto 0';
    const items = A.list(m); body.append(m); return items;
  };
  const medalCount = (s, min) => Object.values((s.ext || {}).medals || {}).filter(v => v >= min).length;
  LF.BOUNTIES.push(
    { id: 'arcade', name: 'Arcade Regular', desc: 'Earn a medal in every Ember Arcade game.', test: s => [medalCount(s, 1), Object.keys(GAMES).length], reward: 'embers:120', rtxt: '120 embers' },
    { id: 'arcadegold', name: 'Arcade Legend', desc: 'Earn a gold medal in every Ember Arcade game.', test: s => [medalCount(s, 3), Object.keys(GAMES).length], reward: 'slot', rtxt: '+1 charm slot' }
  );
})();
