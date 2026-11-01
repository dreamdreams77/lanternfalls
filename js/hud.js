/* Lanternfall - HUD: framed hearts, animated ember counter, Flare lantern gauge, ability slots, boss plate, chain meter, death card */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, S = LF.Sprites, W = LF.W, H = LF.H;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ease = k => 1 - (1 - k) * (1 - k);
  const st = { shown: null, pop: 0, gain: 0, gainT: 0, hp: null, hit: 0, heal: 0, ghost: 0, lastBoss: null };

  /* plate: a dark bevelled backing so the HUD reads over any room */
  function plate(g, x, y, w, h, a) {
    g.globalAlpha = a == null ? .62 : a; R(g, '#05030f', x + 1, y, w - 2, h); R(g, '#05030f', x, y + 1, w, h - 2);
    g.globalAlpha = .5; R(g, '#5a4a9c', x + 1, y, w - 2, 1); g.globalAlpha = 1;
  }
  const font = (g, px, w) => { g.font = (w || 'bold') + ' ' + px + 'px "Trebuchet MS",Verdana,sans-serif'; };

  G.drawHUD = function (g) {
    const s = this.save, pl = this.player; if (!s || !pl) return;
    const t = this.clock, dt = 1 / 60;
    if (st.hp == null) st.hp = s.hp;
    if (s.hp < st.hp) { st.hit = .45; } else if (s.hp > st.hp) st.heal = .5;
    st.hp = s.hp; st.hit = Math.max(0, st.hit - dt); st.heal = Math.max(0, st.heal - dt);
    if (this.state === 'dead') { this.drawDeathCard(g); return; }

    /* ---- hearts ---- */
    const hw = 8 + s.maxHp * 10 + 2;
    plate(g, 3, 3, hw, 15);
    const shake = st.hit > 0 ? Math.round(Math.sin(t * 90) * 1.5 * st.hit / .45) : 0;
    for (let i = 0; i < s.maxHp; i++) {
      const full = i < s.hp, low = s.hp <= 1 && full, pulse = low ? Math.round(Math.sin(t * 10)) : 0;
      const pop = st.heal > 0 && i === s.hp - 1 ? -Math.round(Math.sin(st.heal / .5 * 3.14) * 2) : 0;
      S.drawHeart(g, 8 + i * 10 + shake, 8 + pulse + pop, t, full ? '#ff5a6e' : '#3a2a44', full ? '#fff2c9' : '#5a4a66');
      if (st.hit > 0 && i === s.hp) { g.globalAlpha = st.hit / .45; R(g, '#fff', 8 + i * 10 + shake - 1, 6, 9, 8); g.globalAlpha = 1; }
    }

    /* ---- embers (count rolls up; +N pops beside it) ---- */
    if (st.shown == null) st.shown = s.embers;
    if (s.embers !== st.shown) {
      const d = s.embers - st.shown; if (d > 0) { st.gain += d; st.gainT = 1.1; st.pop = .3; }
      st.shown += d > 0 ? Math.max(1, Math.ceil(d * .25)) : d < 0 ? Math.min(-1, Math.floor(d * .25)) : 0; if (d < 0 && s.embers === 0) st.shown = 0;
    }
    st.pop = Math.max(0, st.pop - dt); st.gainT = Math.max(0, st.gainT - dt); if (!st.gainT) st.gain = 0;
    const label = String(st.shown); plate(g, 3, 19, 18 + label.length * 5 + (st.gainT > 0 ? 22 : 0), 11, .5);
    S.drawEmber(g, 11, 25, t, false);
    LF.drawText(g, label, 18, 28 - (st.pop > 0 ? 1 : 0), st.pop > 0 ? '#fff2c9' : '#ffd27a');
    if (st.gainT > 0) { g.globalAlpha = Math.min(1, st.gainT * 2); LF.drawText(g, '+' + st.gain, 22 + label.length * 5, 28 - Math.round((1.1 - st.gainT) * 3), '#9af0d8'); g.globalAlpha = 1; }

    /* ---- Flare lantern gauge ---- */
    const cost = this.flareCost ? this.flareCost() : 50, f = this.flare || 0, ready = f >= cost, full = f >= 99.5;
    plate(g, 3, 30, 52, 8, .55);
    R(g, '#2a1f3a', 8, 32, 44, 4);
    const fw = Math.round(44 * f / 100), pulse = Math.sin(t * 10) > 0;
    if (fw > 0) { R(g, full ? '#fff2c9' : ready ? (pulse ? '#ffd27a' : '#ffb23a') : '#b0642a', 8, 32, fw, 4); R(g, full ? '#ffffff' : '#ffe2a0', 8, 32, fw, 1); }
    R(g, '#05030f', 8 + Math.round(44 * cost / 100), 31, 1, 6);
    // flame cap
    R(g, ready ? '#ffd27a' : '#6a4a3a', 5, 33, 2, 3); R(g, ready ? '#fff2c9' : '#8a6a52', 5, 32, 1, 2);
    if (ready) { g.globalAlpha = .35 + .25 * Math.sin(t * 8); R(g, full ? '#fff2c9' : '#ffd27a', 7, 31, 46, 6); g.globalAlpha = 1; LF.drawText(g, full ? 'OVERFLARE' : (LF.input.lastDevice === 'touch' ? 'FLARE' : 'FLARE [V]'), 58, 37, full ? '#fff2c9' : '#ffd27a'); }

    /* ---- kindle hint and progress ---- */
    if (s.hp < s.maxHp && s.embers >= this.kindleCost() && this.state === 'play') LF.drawText(g, '▼ hold: kindle (' + this.kindleCost() + ')', 8, 53, '#ff8aa8');
    if (pl.healT > 0) { plate(g, 6, 55, 46, 7, .7); R(g, '#3a1a2c', 8, 57, 42, 3); R(g, '#ff8aa8', 8, 57, Math.round(42 * pl.healT / 1.1), 3); R(g, '#ffd6e0', 8, 57, Math.round(42 * pl.healT / 1.1), 1); }

    /* ---- ability slots ---- */
    const ab = [['glide'], ['dash'], ['dbl']].map(a => a[0]).filter(k => s.abil[k]);
    const tOff = document.body.classList.contains('touchui') ? 54 : 0; // keep clear of the on-screen MAP and pause buttons
    let ax = W - 6 - tOff - ab.length * 12; if (ab.length) plate(g, ax - 2, 3, ab.length * 12 + 2, 13, .55);
    for (const k of ab) {
      const im = S.iconImg(k), cdn = k === 'dash' && pl.dashCD > 0 ? pl.dashCD / .5 : 0;
      R(g, '#1c1638', ax, 5, 10, 10); if (im.complete) { g.globalAlpha = cdn > 0 ? .35 : 1; g.drawImage(im, ax + 1, 6, 8, 8); g.globalAlpha = 1; }
      if (cdn > 0) { g.globalAlpha = .75; R(g, '#ffb23a', ax, 15 - Math.round(10 * (1 - cdn)), 10, 1); g.globalAlpha = 1; }
      ax += 12;
    }

    /* ---- kill chain ---- */
    if (this.chain >= 2) {
      const col = this.chain >= 5 ? '#ff9a3c' : '#ffd27a', txt = 'x' + this.chain + ' CHAIN';
      plate(g, W - 52, 19, 49, 12, .55); LF.drawText(g, txt, W - 8, 28, col, 'right');
      R(g, '#2a1f3a', W - 49, 29, 42, 1); R(g, col, W - 49, 29, Math.round(42 * this.chainT / 3.2), 1);
    }

    /* ---- boss plate ---- */
    const b = this.boss;
    if (b && b.active && !b.dead) {
      if (st.lastBoss !== b) { st.lastBoss = b; st.ghost = b.hp; }
      st.ghost = st.ghost > b.hp ? Math.max(b.hp, st.ghost - b.maxHp * .35 * dt) : b.hp;
      const bw = 184, bx = Math.round((W - bw) / 2), by = H - 15, k = Math.max(0, b.hp / b.maxHp);
      plate(g, bx - 5, by - 12, bw + 10, 19, .7);
      R(g, '#3a1a2c', bx, by, bw, 5);
      R(g, '#ffd9d0', bx, by, Math.round(bw * Math.max(0, st.ghost / b.maxHp)), 5);
      R(g, k < .33 ? '#ff4a5a' : '#e0486a', bx, by, Math.round(bw * k), 5); R(g, '#ff9aa8', bx, by, Math.round(bw * k), 1);
      R(g, '#05030f', bx + Math.round(bw / 3), by - 1, 1, 7); R(g, '#05030f', bx + Math.round(bw * 2 / 3), by - 1, 1, 7);
      R(g, '#ffc15a', bx - 6, by - 1, 2, 7); R(g, '#ffc15a', bx + bw + 4, by - 1, 2, 7);
      LF.drawText(g, LF.BOSS_NAMES[b.id] || b.id, W / 2, by - 4, '#ffe2a0', 'center');
    } else if (!b) st.lastBoss = null;
    if (this.trial && !this.trial.done) { plate(g, W / 2 - 30, 4, 60, 12, .6); LF.drawText(g, 'WAVE ' + Math.max(1, this.trial.wave) + ' / 5', W / 2, 13, '#c49bff', 'center'); }
  };

  /* ---------- death card ---------- */
  G.drawDeathCard = function (g) {
    const s = this.save, d = this.deadT, t = this.clock;
    g.globalAlpha = Math.min(.82, d * .7); R(g, '#04020c', 0, 0, W, H); g.globalAlpha = 1;
    const k = ease(Math.min(1, d * 1.1)), cy = H / 2 - 12;
    // guttering flame
    const fl = Math.max(0, 1 - d * .45), fx = W / 2, fy = cy - 22;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .45 * fl; const gr = g.createRadialGradient(fx, fy, 0, fx, fy, 26 * fl + 4); gr.addColorStop(0, '#ffb860'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(fx - 30, fy - 30, 60, 60); g.restore();
    const fh = Math.max(1, Math.round(9 * fl)); R(g, '#ff8a3d', fx - 2, fy + 4 - fh, 4, fh); R(g, '#ffd27a', fx - 1, fy + 5 - fh, 2, Math.max(1, fh - 3)); R(g, '#3a2a20', fx - 4, fy + 5, 8, 2);
    g.globalAlpha = k; font(g, 15); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#05030f'; g.fillText('THE FLAME FADES', W / 2 + 1, cy + 11 - (1 - k) * 6); g.fillStyle = '#ffd27a'; g.fillText('THE FLAME FADES', W / 2, cy + 10 - (1 - k) * 6);
    g.globalAlpha = Math.max(0, Math.min(1, (d - .8) * 1.4)); font(g, 8, 'normal');
    const lost = s && s.lost, line = lost ? 'Your ' + lost.n + ' embers wait where you fell.' : 'The shrine calls you back.';
    g.fillStyle = '#a597d4'; g.fillText(line, W / 2, cy + 26);
    if (s) { g.fillStyle = '#6a5a98'; g.fillText('Faded ' + s.deaths + (s.deaths === 1 ? ' time' : ' times'), W / 2, cy + 38); }
    g.globalAlpha = 1;
  };
})();
