/* Lanternfall - procedural sprites: player, enemies, NPCs, items, dynamic tiles, icons */
(function () {
  'use strict';
  const LF = window.LF, T = LF.T;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  const S = LF.Sprites = {
    /* ---------------- player ---------------- */
    drawPlayer(g, p, cam, t) {
      if (p.invul > 0 && !p.dead && Math.floor(t * 20) % 2 === 0 && p.hurtT <= 0) return;
      const cx = Math.round(p.x + p.w / 2 - cam.x), by = Math.round(p.y + p.h - cam.y);
      const fl = p.flash > 0, C = c => fl ? '#fff' : c;
      const run = p.onGround && Math.abs(p.vx) > 14, f = Math.floor(t * 14) % 4;
      g.save(); g.translate(cx, by); g.scale(p.face, 1);
      // wings (moth wings ability): flap on double-jump, spread on glide
      if (p.abil.dbl || p.abil.glide) {
        const open = p.gliding ? 1 : p.wingT > 0 ? Math.min(1, p.wingT * 6) : (p.onGround ? 0 : .25);
        if (open > 0.05) {
          g.globalAlpha = .75; const w = 3 + 7 * open, fl2 = Math.sin(t * (p.gliding ? 6 : 30)) * 1.5 * open;
          R(g, C('#c49bff'), -5 - w, -13 + fl2, w, 4); R(g, C('#7ad8ff'), -4 - w * .8, -9 + fl2, w * .8, 3); R(g, C('#fff2c9'), -5 - w, -13 + fl2, 1, 1); g.globalAlpha = 1;
        }
      }
      const air = !p.onGround, up = air && p.vy < -20, down = air && p.vy > 40;
      const bob = p.onGround && !run ? Math.round(Math.sin(t * 2.6)) * 0 + (Math.sin(t * 2.6) > .3 ? 1 : 0) : 0;
      // legs
      const lf = run ? [[-3, 0], [-1, -1], [-1, 0], [-3, -1]][f] : [-2, 0];
      const rf = run ? [[1, -1], [1, 0], [3, 0], [1, -1]][f] : [1, 0];
      if (air) { R(g, C('#2a1a24'), -3, -3, 2, up ? 2 : 3); R(g, C('#2a1a24'), 1, up ? -4 : -3, 2, up ? 2 : 3); }
      else { R(g, C('#2a1a24'), lf[0], -3 + (lf[1] < 0 ? -1 : 0), 2, 3); R(g, C('#2a1a24'), rf[0], -3 + (rf[1] < 0 ? -1 : 0), 2, 3); }
      // cloak tail
      const tail = run ? 3 : down ? -2 : 1, flap = Math.round(Math.sin(t * 12) * (run ? 1 : 0));
      R(g, C('#9a3b30'), -5 - (run ? 1 : 0), -10 + (down ? -2 : 0) + flap, 2, 7 - (down ? 2 : 0)); R(g, C('#7a2b2b'), -6 - tail + 1, -5 + flap, tail, 2);
      // body
      R(g, C('#c8553d'), -4, -11 + bob, 8, 8 - bob); R(g, C('#e8744f'), -2, -10 + bob, 4, 5); R(g, C('#9a3b30'), -4, -6, 1, 3); R(g, C('#e8744f'), -4, -4, 8, 1);
      R(g, C('#ffc15a'), -4, -11 + bob, 8, 1);
      // hood
      R(g, C('#7a2b2b'), -4, -15 + bob, 8, 5); R(g, C('#9a3b30'), -3, -16 + bob, 5, 1); R(g, C('#7a2b2b'), -5, -14 + bob, 1, 3);
      R(g, C('#170d1c'), 0, -14 + bob, 4, 3); // face opening
      if (!(Math.floor(t * 1.7) % 9 === 0 && Math.sin(t * 40) > 0)) { R(g, C('#fff0c0'), 1, -13 + bob, 1, 1); R(g, C('#fff0c0'), 3, -13 + bob, 1, 1); }
      // lantern staff
      const lx = p.atkT > 0 ? 6 + Math.round((1 - p.atkT / .22) * 5) : 5, ly = p.atkT > 0 ? -8 : -11 + bob + (run ? Math.round(Math.sin(t * 14)) : 0);
      R(g, C('#6a4a32'), 4, -8 + bob, 1, 3); R(g, C('#6a4a32'), lx - 1 > 4 ? 4 : 4, -7 + bob, lx - 3, 1);
      R(g, C('#3a2a20'), lx, ly - 1, 4, 1); R(g, C('#3a2a20'), lx, ly + 4, 4, 1); R(g, C('#3a2a20'), lx, ly, 1, 4); R(g, C('#3a2a20'), lx + 3, ly, 1, 4);
      R(g, C('#ffc15a'), lx + 1, ly, 2, 4); R(g, C('#fff2c9'), lx + 1, ly + 1, 1, 2);
      g.restore();
    },
    /* ---------------- enemies ---------------- */
    drawEnemy(g, e, cam, t) {
      const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y), w = e.w, h = e.h, fl = e.flash > 0, C = c => fl ? '#fff' : c, ph = e.ph || 0;
      g.save(); g.translate(x + w / 2, y + h); g.scale(e.face || 1, 1);
      const hw = w / 2;
      switch (e.type) {
        case 'snowman': { const walk = e.state !== 'throw', bob = walk ? Math.round(Math.sin(t * 7 + ph)) : 0, th = e.state === 'throw', ch = e.chill > 0;
          R(g, C('#e8f2ff'), -7, -8, 14, 8); R(g, C('#ffffff'), -6, -8, 6, 2); R(g, C('#b8cce8'), -7, -3, 14, 3);
          R(g, C('#e8f2ff'), -5, -15 + bob, 10, 8); R(g, C('#b8cce8'), -5, -9 + bob, 10, 2); R(g, C('#f4f9ff'), -4, -22 + bob, 8, 8);
          R(g, C('#2a2030'), -5, -23 + bob, 10, 2); R(g, C('#2a2030'), -3, -28 + bob, 6, 5); R(g, C('#a02040'), -3, -25 + bob, 6, 1);
          R(g, th ? '#ff4060' : '#1a0f1c', -3, -20 + bob, 2, 2); R(g, th ? '#ff4060' : '#1a0f1c', 1, -20 + bob, 2, 2); R(g, C('#ff8a3d'), 1, -18 + bob, 5, 1);
          R(g, C('#d03050'), -5, -14 + bob, 10, 2); R(g, C('#d03050'), 2, -13 + bob, 2, 4); R(g, '#1a0f1c', 0, -11 + bob, 1, 1); R(g, '#1a0f1c', 0, -8 + bob, 1, 1);
          R(g, C('#6a4a2a'), -11, th ? -20 + bob : -12 + bob, 6, 1); R(g, C('#6a4a2a'), 5, th ? -20 + bob : -12 + bob, 6, 1); R(g, C('#6a4a2a'), -11, th ? -21 + bob : -13 + bob, 1, 1); R(g, C('#6a4a2a'), 10, th ? -21 + bob : -13 + bob, 1, 1);
          if (ch) { g.globalAlpha = .35; R(g, '#7ad8ff', -7, -22, 14, 22); g.globalAlpha = 1; } break; }
        case 'slime': { const sq = Math.sin(t * 5 + ph) * 1.2, hh = h - 1 + sq; R(g, C('#3a8a4a'), -hw, -hh, w, hh); R(g, C('#3a8a4a'), -hw + 1, -hh - 1, w - 2, 1); R(g, C('#7ad86a'), -hw + 2, -hh + 1, 4, 2); R(g, C('#256a38'), -hw, -2, w, 2);
          R(g, '#fff', 1, -hh + 3, 3, 3); R(g, '#1a0f1c', 2, -hh + 4, 2, 2); R(g, '#fff', -4, -hh + 3, 3, 3); R(g, '#1a0f1c', -3, -hh + 4, 2, 2); break; }
        case 'beetle': { const l = Math.floor(t * 10 + ph) % 2; R(g, C('#2a2060'), -hw, -h + 3, w, h - 3); R(g, C('#4a3ea0'), -hw + 1, -h + 2, w - 2, 3); R(g, C('#7ad8ff'), -3, -h - 1, 2, 4); R(g, C('#c49bff'), 1, -h - 3, 2, 6); R(g, C('#e8fbff'), 1, -h - 3, 1, 3);
          R(g, '#14122e', -hw + 1, -1, 2, 1 + l); R(g, '#14122e', 0, -1, 2, 2 - l); R(g, '#14122e', hw - 3, -1, 2, 1 + l); R(g, '#ff6f9a', hw - 3, -h + 5, 2, 2); break; }
        case 'mothfoe': { const fp = Math.sin(t * 22 + ph) * 3; R(g, C('#6a4a7a'), -1, -h + 2, 3, 6); R(g, C('#ffd27a'), 1, -h + 2, 1, 1);
          R(g, C('#d8b8ff'), -6, -h + 1 - fp, 5, 5); R(g, C('#ffe9b8'), -5, -h + 2 - fp, 2, 2); R(g, C('#b896f0'), 2, -h + 1 + fp * .4, 5, 5); break; }
        case 'bat': { const hang = e.state === 'hang', fp = hang ? 0 : Math.sin(t * 24 + ph) * 4; R(g, C('#3a2a60'), -2, -h + 2, 5, 6);
          if (hang) { R(g, C('#4a3a80'), -4, -h + 2, 2, 6); R(g, C('#4a3a80'), 3, -h + 2, 2, 6); } else { R(g, C('#5a4aa0'), -7, -h + 2 - fp, 5, 3); R(g, C('#5a4aa0'), 3, -h + 2 + fp * .3, 5, 3); }
          R(g, '#ff6f9a', -1, -h + 3, 1, 1); R(g, '#ff6f9a', 1, -h + 3, 1, 1); R(g, C('#3a2a60'), -2, -h, 1, 2); R(g, C('#3a2a60'), 2, -h, 1, 2); break; }
        case 'thorn': { const open = e.state === 'fire' ? 1 : 0, sw = Math.round(Math.sin(t * 2 + ph)); R(g, C('#2f6a3a'), -2, -h + 8, 4, h - 8); R(g, C('#3f8a4c'), -6, -5, 5, 2); R(g, C('#3f8a4c'), 1, -5, 5, 2); R(g, C('#2f6a3a'), -4 + sw, -h + 3, 9, 6);
          R(g, C('#d8386a'), -4 + sw, -h + 1 - open, 2, 4); R(g, C('#d8386a'), 3 + sw, -h + 1 - open, 2, 4); R(g, C('#ff8aa8'), -1 + sw, -h, 3, 3 + open); R(g, '#fff2c9', 0 + sw, -h + 2, 1, 1); R(g, '#8a2040', -5, -h + 6, 1, 3); R(g, '#8a2040', 5, -h + 6, 1, 3); break; }
        case 'wisp': { const f = Math.sin(t * 8 + ph); g.globalAlpha = .55; R(g, '#7ad8ff', -3, -h + 2, 6, 6); R(g, '#bff4ff', -4, -h + 3, 8, 4); g.globalAlpha = 1; R(g, C('#e8fbff'), -2, -h + 3, 4, 4); R(g, '#14122e', -1, -h + 4, 1, 1); R(g, '#14122e', 1, -h + 4, 1, 1);
          for (let i = 1; i < 5; i++) { g.globalAlpha = .5 - i * .1; R(g, '#7ad8ff', -2 - i * 1.5 + Math.sin(t * 6 + i) * 1.5, -h + 7 + i * 1.2, 3, 2); } g.globalAlpha = 1; break; }
        case 'jelly': { const pu = Math.sin(t * 4 + ph); g.globalAlpha = .85; R(g, C('#6ae0d0'), -6, -h + 1, 12, 7 + pu); R(g, C('#9af0e8'), -5, -h, 10, 2); R(g, C('#bffff4'), -4, -h + 2, 2, 2); g.globalAlpha = 1;
          for (let i = -5; i <= 4; i += 3) { R(g, C('#3aa0a0'), i + Math.round(Math.sin(t * 5 + i + ph)), -h + 8 + pu, 1, 7); } R(g, '#14333a', -3, -h + 4, 2, 2); R(g, '#14333a', 1, -h + 4, 2, 2); break; }
        case 'husk': { const l = Math.floor(t * 6 + ph) % 2, at = e.state === 'lunge'; R(g, C('#26242e'), -4, -h + 5, 8, h - 8); R(g, C('#3a3646'), -5, -h + 3, 10, 5); R(g, C('#5a566a'), -3, -h, 7, 6); R(g, '#ffb860', 1, -h + 2, 2, 2); R(g, C('#26242e'), -4, -3 + l, 3, 3 - l); R(g, C('#26242e'), 1, -3, 3, 3);
          R(g, C('#a89a70'), 4, -h + 6, 1, 8); R(g, C('#ffb860'), at ? 5 : 4, -h + 4, 3, 3); if (at) R(g, '#ffd27a', 6, -h + 5, 6, 1); break; }
      }
      g.restore();
    },
    /* ---------------- world objects ---------------- */
    drawEmber(g, x, y, t, big) {
      const b = Math.round(Math.sin(t * 4 + x) * 1.5), s = big ? 2 : 1; x = Math.round(x); y = Math.round(y + b);
      R(g, '#ff8a3d', x - 2 * s, y - 1 * s, 4 * s, 3 * s); R(g, '#ffd27a', x - 1 * s, y - 2 * s, 2 * s, 5 * s); R(g, '#fff2c9', x - 1, y - 1, 1, 2);
    },
    drawHeart(g, x, y, t, c1, c2) {
      c1 = c1 || '#ff5a6e'; c2 = c2 || '#ffb0b8'; x = Math.round(x); y = Math.round(y);
      R(g, c1, x, y + 1, 3, 3); R(g, c1, x + 4, y + 1, 3, 3); R(g, c1, x + 1, y, 2, 1); R(g, c1, x + 4, y, 2, 1); R(g, c1, x + 1, y + 4, 5, 1); R(g, c1, x + 2, y + 5, 3, 1); R(g, c1, x + 3, y + 6, 1, 1); R(g, c2, x + 1, y + 1, 1, 1);
    },
    drawFragment(g, x, y, t) { const b = Math.sin(t * 3 + x) * 2; this.drawHeart(g, x - 3, y - 3 + b, '#ff8aa8', '#fff'); R(g, '#fff', x + Math.sin(t * 5) * 6, y - 5 + b, 1, 1); },
    drawMoth(g, x, y, t, got) {
      const fp = Math.sin(t * 20 + x) * 2.5, bx = x + Math.sin(t * 1.5 + x) * 3, by = y + Math.cos(t * 2.1 + x) * 3;
      R(g, '#fff2c9', bx - 1, by - 1, 2, 3); R(g, '#7ad8ff', bx - 5, by - 3 - fp, 4, 4); R(g, '#c49bff', bx + 1, by - 3 + fp * .3, 4, 4); R(g, '#fff', bx - 4, by - 2 - fp, 1, 1);
    },
    drawShrine(g, x, y, t, lit) { // x,y = bottom center
      x = Math.round(x); y = Math.round(y);
      R(g, '#3a2c44', x - 7, y - 3, 14, 3); R(g, '#4c3a56', x - 5, y - 5, 10, 2); R(g, '#5a4a66', x - 2, y - 24, 4, 20); R(g, '#3a2c44', x + 1, y - 24, 1, 20);
      R(g, '#3a2a20', x - 5, y - 32, 10, 2); R(g, '#3a2a20', x - 5, y - 24, 10, 2); R(g, '#3a2a20', x - 5, y - 32, 1, 9); R(g, '#3a2a20', x + 4, y - 32, 1, 9);
      if (lit) { const f = Math.sin(t * 9) * .5; R(g, '#ff8a3d', x - 3, y - 30, 6, 6); R(g, '#ffd27a', x - 2, y - 30 - f, 4, 5); R(g, '#fff2c9', x - 1, y - 28, 2, 3); }
      else { R(g, '#2a2030', x - 3, y - 30, 6, 6); R(g, '#4a4060', x - 1, y - 28, 2, 3); }
    },
    drawAltar(g, x, y, t, icon, taken) { // x,y bottom center
      x = Math.round(x); y = Math.round(y);
      R(g, '#3a3050', x - 8, y - 4, 16, 4); R(g, '#4c4068', x - 6, y - 8, 12, 4); R(g, '#6a5a90', x - 6, y - 8, 12, 1);
      if (!taken) { const b = Math.sin(t * 3) * 2; const im = this.iconImg(icon); g.globalAlpha = .6 + .3 * Math.sin(t * 4); R(g, '#ffd27a', x - 4, y - 18 + b, 8, 8); g.globalAlpha = 1; if (im.complete) g.drawImage(im, x - 8, y - 20 + b); }
    },
    drawChest(g, x, y, t, open) {
      x = Math.round(x); y = Math.round(y); R(g, '#5a3a22', x - 7, y - 9, 14, 9); R(g, '#7a5232', x - 7, y - 9, 14, 3); R(g, '#c8a040', x - 7, y - 6, 14, 1); R(g, '#c8a040', x - 1, y - 6, 2, 3);
      if (open) { R(g, '#14100a', x - 6, y - 12, 12, 3); R(g, '#7a5232', x - 7, y - 14, 14, 2); } else R(g, '#8a6242', x - 6, y - 12, 12, 3);
    },
    drawLore(g, x, y, t, read) {
      x = Math.round(x); y = Math.round(y); R(g, '#4a4a60', x - 5, y - 13, 10, 13); R(g, '#5e5e78', x - 4, y - 14, 8, 1); R(g, '#3a3a50', x + 3, y - 13, 2, 13);
      const a = .5 + .4 * Math.sin(t * 2.5); g.globalAlpha = read ? .3 : a; R(g, '#7ad8ff', x - 2, y - 11, 4, 1); R(g, '#7ad8ff', x - 1, y - 9, 2, 5); R(g, '#7ad8ff', x - 3, y - 6, 6, 1); g.globalAlpha = 1;
    },
    drawLever(g, x, y, t, on) {
      x = Math.round(x); y = Math.round(y); R(g, '#3a3050', x - 5, y - 3, 10, 3); R(g, '#8a7a60', x - 1, y - 11, 2, 9); const d = on ? 3 : -3; R(g, '#c8553d', x - 2 + d, y - 14 + Math.abs(d) / 3, 4, 3);
    },
    drawNPC(g, n, t) {
      const x = Math.round(n.x), y = Math.round(n.y), b = Math.sin(t * 2.4 + n.x) > .2 ? 1 : 0; g.save(); g.translate(x, y); g.scale(n.face || 1, 1);
      switch (n.id) {
        case 'wick': R(g, '#6a4a7a', -5, -14 + b, 10, 11); R(g, '#d8b8ff', -9, -17 + b - Math.sin(t * 10), 5, 7); R(g, '#b896f0', 4, -17 + b + Math.sin(t * 10) * .5, 5, 7); R(g, '#e8d8b8', -3, -18 + b, 7, 6); R(g, '#1a0f1c', -2, -15 + b, 1, 1); R(g, '#1a0f1c', 2, -15 + b, 1, 1); R(g, '#e8d8b8', -3, -20 + b, 2, 3); R(g, '#e8d8b8', 2, -20 + b, 2, 3); R(g, '#8a6a4a', 6, -16, 1, 16); R(g, '#ffc15a', 5, -19, 3, 3); R(g, '#3a2a40', -4, -3, 3, 3); R(g, '#3a2a40', 2, -3, 3, 3); break;
        case 'pip': R(g, '#e8dcc8', -3, -8 + b, 6, 8); R(g, '#d8484a', -8, -15 + b, 16, 8); R(g, '#fff2c9', -6, -14 + b, 3, 3); R(g, '#fff2c9', 2, -12 + b, 3, 3); R(g, '#1a0f1c', -2, -6 + b, 1, 2); R(g, '#1a0f1c', 1, -6 + b, 1, 2); R(g, '#8a6a4a', 7, -10, 7, 10); R(g, '#c8a040', 8, -9, 5, 1); break;
        case 'marrow': R(g, '#4a8a5a', -6, -10 + b, 12, 10); R(g, '#6ac078', -5, -13 + b, 10, 5); R(g, '#fff', -4, -15 + b, 3, 3); R(g, '#fff', 1, -15 + b, 3, 3); R(g, '#1a0f1c', -3, -14 + b, 1, 2); R(g, '#1a0f1c', 2, -14 + b, 1, 2); R(g, '#2a5a3a', -3, -4, 6, 1); R(g, '#8a7a50', -9, -6, 3, 6); break;
        case 'vesper': g.globalAlpha = .75; R(g, '#c8e8e0', -5, -16 + b - 1, 10, 14 + Math.sin(t * 2) * 2); R(g, '#e8fff8', -4, -20 + b, 8, 6); R(g, '#7ad8d0', -6, -12 + b, 2, 8); R(g, '#7ad8d0', 4, -12 + b, 2, 8); R(g, '#14333a', -2, -17 + b, 1, 2); R(g, '#14333a', 1, -17 + b, 1, 2); R(g, '#e8fff8', -6, -22 + b, 12, 2); R(g, '#e8fff8', -2, -26 + b, 4, 4); g.globalAlpha = 1; break;
        default: R(g, '#c8a0ff', -4, -12, 8, 12);
      }
      g.restore();
    },
    /* ---------------- dynamic tiles ---------------- */
    drawDynTile(g, room, tx, ty, ch, st, cam, t, game) {
      const x = tx * T - cam.x, y = ty * T - cam.y;
      if (x < -T || y < -T || x > LF.W || y > LF.H) return;
      const area = room.area;
      if (ch === 'S' || ch === 'D' || ch === 'F') {
        g.save(); g.translate(-cam.x, -cam.y); const at = (a, b) => { const c2 = room.grid[b] && room.grid[b][a]; return c2 == null ? '#' : c2; };
        if (ch === 'F') { const dd = game ? LF.dist(game.player.x + 5, game.player.y + 7, tx * T + 8, ty * T + 8) : 99, r = 26 + game.lightR * .2; g.globalAlpha = LF.clamp(dd / r, 0.12, 1); }
        LF.rockTile(g, tx, ty, area, [!LF.isSolidCh(at(tx, ty - 1)), !LF.isSolidCh(at(tx + 1, ty)), !LF.isSolidCh(at(tx, ty + 1)), !LF.isSolidCh(at(tx - 1, ty))]); g.globalAlpha = 1; g.restore();
        if (ch === 'S') { const hp = st && st.hp != null ? st.hp : 3; R(g, '#0c0818', x + 3, y + 2, 1, 5); R(g, '#0c0818', x + 4, y + 6, 4, 1); R(g, '#0c0818', x + 8, y + 7, 1, 4); R(g, '#0c0818', x + 5, y + 10, 5, 1); if (hp < 3) { R(g, '#0c0818', x + 10, y + 3, 1, 6); R(g, '#0c0818', x + 7, y + 3, 3, 1); } if (hp < 2) { R(g, '#0c0818', x + 1, y + 9, 6, 1); R(g, '#0c0818', x + 11, y + 10, 3, 1); } }
        if (ch === 'D') { R(g, '#ff8a3d', x + 3, y + 3, 10, 2); R(g, '#ff8a3d', x + 3, y + 11, 10, 2); R(g, '#ff8a3d', x + 3, y + 3, 2, 10); R(g, '#ff8a3d', x + 11, y + 3, 2, 10); const a = .5 + .4 * Math.sin(t * 5); g.globalAlpha = a; R(g, '#ffd27a', x + 6, y + 6, 4, 4); g.globalAlpha = 1; }
      } else if (ch === 'G') { // sigil gate
        R(g, '#2a1f3a', x, y, T, T); R(g, '#4a3a66', x + 1, y + 1, T - 2, T - 2); R(g, '#1a1228', x + 6, y, 4, T); const k = (ty + tx) % 3, col = ['#7dffb0', '#7ad8ff', '#9af0d8'][k], lit = game && game.save && game.save.sigils[['root', 'prism', 'tide'][k]];
        R(g, lit ? col : '#2a2040', x + 3, y + 5, 3, 3); R(g, lit ? col : '#2a2040', x + 10, y + 5, 3, 3); if (lit) { g.globalAlpha = .4; R(g, col, x + 2, y + 4, 5, 5); R(g, col, x + 9, y + 4, 5, 5); g.globalAlpha = 1; }
      } else if (ch === 'g') { // lever gate (bars)
        R(g, '#1a1228', x, y, T, T); for (let i = 0; i < 4; i++) { R(g, '#8a7a60', x + 1 + i * 4, y, 2, T); R(g, '#c8b890', x + 1 + i * 4, y, 1, T); } R(g, '#5a4a38', x, y + 2, T, 2); R(g, '#5a4a38', x, y + 11, T, 2);
      } else if (ch === 'c') { // crumbling platform
        const s = st || {}, sh = s.t > 0 ? Math.round(Math.sin(t * 60)) : 0, p2 = PAL_c(area); R(g, p2[0], x + sh, y, T, 6); R(g, p2[1], x + sh, y, T, 2); R(g, p2[2], x + 2 + sh, y + 6, 3, 2); R(g, p2[2], x + 9 + sh, y + 6, 4, 3); R(g, '#0c0818', x + 6 + sh, y + 1, 1, 4);
      } else if (ch === 'j') { // jump pad
        const sq = st && st.t > 0 ? 3 : 0; R(g, '#3a2c44', x + 1, y + 12, 14, 4); R(g, '#c8553d', x + 2, y + 10 + sq, 12, 2); R(g, '#ffc15a', x + 2, y + 9 + sq, 12, 1); R(g, '#8a7a60', x + 6, y + 12 - sq, 4, 1);
      }
    },
    /* ---------------- icons (8x8 pixel art -> 16x16 data URLs) ---------------- */
    ICONS: {
      heart: ['.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'],
      ember: ['...y....', '..yY....', '.yYYy...', '.yYwY...', '.yYwYy..', '.yYYYy..', '..yYy...', '........'],
      dbl: ['p..pp..p', 'pp.pp.pp', 'bpppppbp', '.bpwwpb.', '..bwwb..', '..bppb..', '...pp...', '........'],
      dash: ['........', '.y..yy..', '..y.yYy.', 'yyyyyyYY', '..y.yYy.', '.y..yy..', '........', '........'],
      glide: ['........', 'pp....pp', 'bppppppb', '.bbppbb.', '..bppb..', '...bb...', '........', '........'],
      moth: ['b.....p.', 'bb...pp.', 'bbb.ppp.', '.bbwpp..', '..bwp...', '.bb.pp..', 'bb...pp.', '........'],
      root: ['...g....', '..ggg...', '.gGgGg..', '.gGGGg..', '..gGg...', '...n....', '..nn....', '........'],
      prism: ['...b....', '..bwb...', '.bwBwb..', '.bBwBp..', '.bwBwp..', '..bpp...', '...p....', '........'],
      tide: ['...b....', '..bb....', '.bbwb...', '.bbwbb..', 'bbbbbbb.', 'bBbBbBb.', '.bbbbb..', '........'],
      lantern: ['..ssss..', '..s..s..', '.ksyyks.', '.kyYwyk.', '.kyYwyk.', '.ksyyks.', '..kkkk..', '........'],
      quick: ['....yy..', '...yY...', '..yYy...', '.yYy.y..', 'yYy..y..', 'yy...y..', '.....y..', '........'],
      dust: ['..y..y..', '.ywy.y..', '..y..yw.', 'y..yy.y.', '..y..y..', '.y..y.y.', '..y.....', '........'],
      thorn: ['g..g..g.', 'gg.g.gg.', '.gGGGg..', '..GGG...', '..GGG...', '.gGGGg..', 'gg.g.gg.', '........'],
      glow: ['...w....', '.w.y.w..', '..yyy...', 'wyyYyyw.', '..yyy...', '.w.y.w..', '...w....', '........'],
      spark: ['..r..r..', '.rrrrrr.', 'rrwrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r.y..', '.....y..'],
      might: ['...Y....', '..YyY...', '.YyyyY..', 'YyywyyY.', '.YyyyY..', '..YyY...', '...Y....', '........'],
      swift: ['........', '..bb....', '.bbbb.b.', 'bbbbbbbb', '.bbbb.b.', '..bb....', '........', '........'],
      dmg: ['....s...', '...sw...', '..sw....', '.sw.....', 'nsw.....', 'nn......', 'n.......', '........'],
      light: ['..yyy...', '.yyyyy..', '.yywyy..', '.yyyyy..', '..yyy...', '..kkk...', '...k....', '........'],
      echo: ['........', '..y..y..', '.yY.yY..', 'yYw.yYw.', '.yY.yY..', '..y..y..', '........', '........'],
      ward: ['..pppp..', '.pwwwwp.', 'pwbwwbwp', 'pwwwwwwp', '.pwwwwp.', '..pwwp..', '...pp...', '........'],
      siphon: ['...r....', '..rr....', '.rrYr...', '.rYYr...', '.rrYrr..', '..rrr...', '...r....', '........'],
      phoenix: ['y..yy..y', 'Yy.yy.yY', 'YYyYYyYY', '.YyYYyY.', '..YwwY..', '..YwwY..', '...YY...', '........'],
      flare: ['y..y..y.', '.y.Y.y..', '..yYy...', 'yYYwYYy.', '..yYy...', '.y.Y.y..', 'y..y..y.', '........'],
      bounty: ['..kkkk..', '.kyyyyk.', 'kyYkkYyk', 'kyk..kyk', 'kyYkkYyk', '.kyyyyk.', '..kkkk..', '........'],
      frost: ['...b....', '.b.b.b..', '..bwb...', 'bbwwwbb.', '..bwb...', '.b.b.b..', '...b....', '........'],
      portal: ['..pppp..', '.pbbbbp.', 'pb....bp', 'pb.ww.bp', 'pb....bp', '.pbbbbp.', '..pppp..', '........'],
      lock: ['..kkkk..', '.k....k.', '.k....k.', 'kkkkkkkk', 'kkkyykkk', 'kkkyykkk', 'kkkkkkkk', '........']
    },
    ICOPAL: { r: '#ff5a6e', R: '#a02040', y: '#ffc15a', Y: '#ff8a3d', w: '#fff2c9', b: '#7ad8ff', B: '#3a56b8', p: '#c49bff', P: '#6a3fd0', g: '#7dffb0', G: '#2f8f4c', k: '#2a1a24', n: '#a07a52', s: '#aab0c8' },
    _icons: {}, _imgs: {},
    icon(name) {
      if (this._icons[name]) return this._icons[name];
      const rows = this.ICONS[name] || this.ICONS.lock, c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = this.ICOPAL[ch]; if (col) { g.fillStyle = col; g.fillRect(x * 2, y * 2, 2, 2); } }));
      return this._icons[name] = c.toDataURL();
    },
    iconImg(name) { if (!this._imgs[name]) { const i = new Image(); i.src = this.icon(name); this._imgs[name] = i; } return this._imgs[name]; }
  };
  function PAL_c(a) { const P = LF.PAL[a]; return [P.rock[2], P.top[1], P.rock[3]]; }
})();
