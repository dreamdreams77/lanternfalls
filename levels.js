/* Lanternfall - world builder + Mossroot Hollow rooms.
   Tile legend: # rock  = one-way ledge  ^ v spikes  S cracked wall (strike x3)  F illusion wall  D dash-crack block
   G sigil gate  g bars (lever / boss-gate)  c crumble ledge  j spring pad  w water
   Physics reference (px/tiles): single jump 3.8 tiles high, 4.2 wide; double jump 6.7 high / 6.8 wide. */
(function () {
  'use strict';
  const LF = window.LF;
  const Rooms = LF.Rooms = { list: {}, order: [] };

  function Room(id, name, area, w, h, mx, my, mw, mh, music) {
    const r = {
      id, name, area, w, h, mx, my, mw: mw || 1, mh: mh || 1, music: music || area, ents: [], doors: {}, gateBoss: null, ambience: null,
      grid: Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? '#' : '.')),
      f(row, x0, x1) { for (let y = row; y < h; y++) for (let x = x0 == null ? 0 : x0; x <= (x1 == null ? w - 1 : x1); x++) r.grid[y][x] = '#'; return r; },   // floor from row down
      b(x, y, bw, bh, ch) { for (let j = y; j < y + bh; j++) for (let i = x; i < x + bw; i++) if (r.grid[j] && r.grid[j][i] != null) r.grid[j][i] = ch || '#'; return r; },
      hole(x, y, bw, bh) { return r.b(x, y, bw, bh, '.'); },
      p(x, y, n) { return r.b(x, y, n, 1, '='); },
      sp(x, y, n) { return r.b(x, y, n, 1, '^'); },
      cs(x, y, n) { return r.b(x, y, n, 1, 'v'); },
      s(x, y, ch) { r.grid[y][x] = ch; return r; },
      water(x, y, bw, bh) { for (let j = y; j < y + bh; j++) for (let i = x; i < x + bw; i++) if (r.grid[j][i] === '.') r.grid[j][i] = 'w'; return r; },
      e(type, x, y, o) { r.ents.push(Object.assign({ type, x, y }, o || {})); return r; },
      em(x, y, n, dx, dy) { for (let i = 0; i < n; i++) r.e('ember', x + i * (dx == null ? 1 : dx), y + i * (dy || 0)); return r; },
      // door(name, side, a, b, to, toName): side l/r -> rows a..b ; u/d -> cols a..b
      door(name, side, a, b, to, toName) {
        let x, y, dw, dh;
        if (side === 'l') { x = 0; y = a; dw = 1; dh = b - a + 1; } else if (side === 'r') { x = w - 1; y = a; dw = 1; dh = b - a + 1; }
        else if (side === 'u') { x = a; y = 0; dw = b - a + 1; dh = 1; } else { x = a; y = h - 1; dw = b - a + 1; dh = 1; }
        r.hole(x, y, dw, dh); r.doors[name] = { name, side, x, y, w: dw, h: dh, to, toName, room: id }; return r;
      }
    };
    Rooms.list[id] = r; Rooms.order.push(id); return r;
  }
  LF.Room = Room;

  /* ============================ MOSSROOT HOLLOW ============================ */
  // 1. Lantern Glade - the starting meadow
  Room('glade', 'Lantern Glade', 'moss', 40, 14, 2, 2, 2, 1, 'mossroot').f(12);
  (function (r) {
    r.ambience = { wind: .25, chirp: .6 };
    r.door('l', 'l', 9, 11, 'stump', 'r').door('r', 'r', 9, 11, 'rootbridge', 'l');
    r.b(22, 1, 8, 3).hole(24, 1, 4, 2).b(24, 3, 2, 1, 'F').b(26, 3, 2, 1, '#');           // secret nook above the glade
    r.p(14, 9, 4).p(20, 7, 5).p(28, 9, 3).p(31, 6, 3);
    r.e('shrine', 6, 11).e('npc', 10, 11, { id: 'wick' }).e('lore', 17, 11, { id: 'glade' });
    r.e('slime', 26, 11).e('slime', 33, 11);
    r.em(15, 8, 3).em(21, 6, 3).em(29, 8, 2).em(33, 11, 3, 1).e('moth', 32, 5, { id: 'm1' });
    r.e('chest', 26, 0, { give: 'embers:60' }); r.ents[r.ents.length - 1].y = 2; r.e('moth', 25, 1, { id: 'm2' });
  })(Rooms.list.glade);

  // 2. Hollow Stump - Pip's shop
  Room('stump', 'Hollow Stump', 'moss', 28, 12, 1, 2, 1, 1, 'mossroot').f(10);
  (function (r) {
    r.ambience = { wind: .1, chirp: .4 };
    r.door('r', 'r', 7, 9, 'glade', 'l').door('l', 'l', 7, 9, 'burrow', 'r').b(1, 7, 1, 3, 'S');
    r.b(2, 1, 24, 1).p(8, 7, 3).p(17, 6, 4);
    r.e('npc', 14, 9, { id: 'pip' }).e('lore', 5, 9, { id: 'stump' }).e('chest', 22, 9, { give: 'embers:40' });
    r.em(9, 6, 2).em(18, 5, 3);
  })(Rooms.list.stump);

  // 3. The Burrow - secret room
  Room('burrow', 'The Burrow', 'moss', 20, 12, 0, 2, 1, 1, 'mossroot').f(10);
  (function (r) {
    r.ambience = { wind: .05, drone: .3 };
    r.door('r', 'r', 7, 9, 'stump', 'l');
    r.e('chest', 10, 9, { give: 'charm:quick' }).e('moth', 5, 7, { id: 'm3' }).em(13, 9, 4).e('lore', 16, 9, { id: 'burrow' });
  })(Rooms.list.burrow);

  // 4. Rootbridge - first platforming
  Room('rootbridge', 'Rootbridge', 'moss', 48, 14, 4, 2, 2, 1, 'mossroot').f(12, 0, 14).f(12, 34, 47);
  (function (r) {
    r.ambience = { wind: .3, chirp: .5, water: .1 };
    r.door('l', 'l', 9, 11, 'glade', 'r').door('r', 'r', 9, 11, 'thicket', 'l');
    r.b(15, 12, 19, 2).sp(15, 12, 19);   // spike pit (row 12 overwritten by spikes)
    r.p(16, 10, 3).p(21, 9, 3).p(26, 10, 3).p(30, 8, 3).p(23, 6, 2);
    r.e('moth', 24, 5, { id: 'm4' }).em(17, 9, 2).em(22, 8, 2).em(27, 9, 2).em(31, 7, 2);
    r.e('slime', 8, 11).e('slime', 38, 11).e('slime', 43, 11).e('mothfoe', 25, 7).e('lore', 3, 11, { id: 'bridge' });
    r.p(5, 8, 4).p(40, 8, 4); r.em(6, 7, 2).em(41, 7, 2);
  })(Rooms.list.rootbridge);

  // 5. Thorn Thicket - double-jump altar + gated door to Glimmer Deep
  Room('thicket', 'Thorn Thicket', 'moss', 44, 14, 6, 2, 2, 1, 'mossroot').f(12);
  (function (r) {
    r.ambience = { wind: .2, chirp: .4 };
    r.door('l', 'l', 9, 11, 'rootbridge', 'r').door('r', 'r', 9, 11, 'bower', 'l').door('g', 'r', 3, 5, 'g_descent', 'l');
    r.p(4, 8, 6).p(8, 10, 3).p(12, 9, 3).p(14, 6, 3).p(22, 6, 3).p(26, 4, 4).p(30, 6, 3).p(34, 8, 3).p(38, 6, 4);
    r.sp(13, 11, 3).sp(17, 11, 5).sp(24, 11, 2).sp(30, 11, 3);
    r.e('altar', 6, 7, { give: 'abil:dbl' }).e('thorn', 10, 11).e('thorn', 21, 11).e('thorn', 28, 11).e('slime', 34, 11);
    r.e('shrine', 39, 11).e('lore', 2, 11, { id: 'thicket' });
    r.em(9, 9, 2).em(13, 8, 2).em(15, 5, 2).em(23, 5, 2).em(27, 3, 3).em(35, 7, 2);
    r.b(36, 1, 5, 3).hole(37, 1, 3, 2).s(38, 3, 'F');  // hidden crawlspace for a heart seed (jump up through the illusion wall)
    r.e('frag', 38, 2);
  })(Rooms.list.thicket);

  // 6. Thornmother's Bower - boss arena
  Room('bower', "Thornmother's Bower", 'moss', 28, 14, 8, 2, 2, 1, 'boss').f(12);
  (function (r) {
    r.ambience = { wind: .1, drone: .2 };
    r.door('l', 'l', 9, 11, 'thicket', 'r');
    r.p(6, 9, 4).p(16, 8, 4).p(12, 6, 3);
    r.e('shrine', 3, 11).e('boss', 22, 11, { id: 'thorn' });
  })(Rooms.list.bower);
})();
