/* Lanternfall - procedural art: palettes, tiles, decor, parallax backgrounds */
(function () {
  'use strict';
  const LF = window.LF, T = LF.T;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); };

  const PAL = LF.PAL = {
    moss:  { name: 'Mossroot Hollow', sky: ['#17123f', '#3e2468', '#a04a68', '#f0a06a'], far: '#33265e', mid: '#251c4c', near: '#130f2c',
             rock: ['#2d2236', '#3b2c44', '#4c3a56', '#1d1526'], top: ['#3f8a4c', '#68c262', '#a6e684'], deep: '#120c1c', glow: '#ffd27a', fog: '#8a6ab8', dark: .36 },
    glim:  { name: 'Glimmer Deep', sky: ['#07061a', '#0d0c33', '#17135a', '#241a78'], far: '#1a1650', mid: '#120f3c', near: '#0a0824',
             rock: ['#1f1c42', '#2b2760', '#3a3480', '#14122e'], top: ['#4a7bd8', '#7ad8ff', '#d4f4ff'], deep: '#0a0820', glow: '#7ad8ff', fog: '#5a4ad0', dark: .62 },
    drown: { name: 'Drowned Chapel', sky: ['#04161c', '#0a2e36', '#12505a', '#2a8286'], far: '#0e3d46', mid: '#0a2c34', near: '#051a20',
             rock: ['#1b3840', '#264b55', '#34626c', '#10242b'], top: ['#2f8f86', '#4fc7b4', '#9af0d8'], deep: '#071419', glow: '#9af0d8', fog: '#3aa0a0', dark: .55 },
    spire: { name: 'Ember Spire', sky: ['#14060e', '#3a0f24', '#8a2a24', '#e0742a'], far: '#4a1630', mid: '#33101f', near: '#1c0812',
             rock: ['#3a2230', '#4e2f40', '#66404e', '#24121c'], top: ['#b84a22', '#ff8a3d', '#ffd27a'], deep: '#160810', glow: '#ff9a3c', fog: '#a03a3a', dark: .5 }
  };
  const SOLID_STATIC = '#', DYN_SOLID = 'SDGgc';
  LF.isSolidCh = ch => ch === '#' || DYN_SOLID.indexOf(ch) >= 0;

  /* ---------- rock tile (shared by bake + fake walls + secret walls) ---------- */
  function rockTile(c, tx, ty, area, nb) {
    const P = PAL[area], x0 = tx * T, y0 = ty * T, h = LF.hash;
    R(c, P.rock[0], x0, y0, T, T);
    for (let i = 0; i < 16; i++) { // speckle
      const px = Math.floor(h(tx, ty, i) * T), py = Math.floor(h(tx, ty, i + 50) * T), k = h(tx, ty, i + 99);
      R(c, k < .45 ? P.rock[1] : k < .75 ? P.rock[2] : P.rock[3], x0 + px, y0 + py, k > .85 ? 2 : 1, 1);
    }
    if (area === 'drown' || area === 'spire') { // masonry
      c.fillStyle = P.rock[3];
      for (let by = 0; by < T; by += 8) { c.fillRect(x0, y0 + by, T, 1); const off = ((ty * 2 + by / 8) % 2) * 8; c.fillRect(x0 + off, y0 + by, 1, 8); c.fillRect(x0 + (off + 8) % T, y0 + by, 1, 8); }
      c.fillStyle = P.rock[2]; for (let by = 1; by < T; by += 8) c.fillRect(x0, y0 + by, T, 1);
    } else if (area === 'glim') { // crystal facets
      c.fillStyle = P.rock[3]; const d = Math.floor(h(tx, ty, 7) * 8) + 4; for (let i = 0; i < d; i++) c.fillRect(x0 + i, y0 + d - i, 1, 1);
    } else { // roots
      c.fillStyle = P.rock[3]; const rx = Math.floor(h(tx, ty, 3) * 10) + 2; for (let i = 0; i < 12; i++) c.fillRect(x0 + rx + Math.round(Math.sin(i * .7 + tx) * 2), y0 + i + 2, 1, 1);
    }
    if (nb) { // edges: nb = [up, right, down, left] air flags
      if (nb[0]) { // top cap
        R(c, P.top[0], x0, y0, T, 3); R(c, P.top[1], x0, y0, T, 1);
        for (let i = 0; i < T; i += 2) { const k = h(tx * 16 + i, ty, 5); if (k < .5) R(c, P.top[2], x0 + i, y0, 1, 1); if (k > .55) R(c, P.top[0], x0 + i, y0 + 3, 1, 1 + (k > .8 ? 2 : 0)); }
      }
      if (nb[2]) { R(c, P.rock[3], x0, y0 + T - 3, T, 3); for (let i = 0; i < T; i += 3) if (h(tx * 16 + i, ty, 9) > .5) R(c, P.rock[3], x0 + i, y0 + T - 3, 1, 3 + Math.floor(h(tx, ty * 16 + i, 4) * 3)); }
      if (nb[3]) R(c, P.rock[2], x0, y0 + (nb[0] ? 3 : 0), 1, T);
      if (nb[1]) R(c, P.rock[3], x0 + T - 2, y0, 2, T);
    }
  }
  LF.rockTile = rockTile;

  /* ---------- bake a room's static layer + generate animated decor ---------- */
  LF.Art = {
    bakeRoom(room) {
      const w = room.w, h = room.h, c = cv(w * T, h * T), g = c.getContext('2d'), P = PAL[room.area];
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '#' : room.grid[y][x];
      const air = (x, y) => { const ch = at(x, y); return !LF.isSolidCh(ch); };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ch = at(x, y);
        if (ch === '#') rockTile(g, x, y, room.area, [air(x, y - 1), air(x + 1, y), air(x, y + 1), air(x - 1, y)]);
        else if (ch === '=') {
          const x0 = x * T, y0 = y * T; R(g, P.rock[2], x0, y0, T, 4); R(g, P.top[1], x0, y0, T, 1); R(g, P.rock[3], x0, y0 + 4, T, 1);
          R(g, P.rock[1], x0 + 1, y0 + 1, T - 2, 1); if (at(x - 1, y) !== '=') R(g, P.rock[3], x0, y0, 1, 5); if (at(x + 1, y) !== '=') R(g, P.rock[3], x0 + T - 1, y0, 1, 5);
          R(g, P.rock[3], x0 + 2, y0 + 5, 2, 2); R(g, P.rock[3], x0 + T - 4, y0 + 5, 2, 2);
        } else if (ch === '^' || ch === 'v') {
          const x0 = x * T, y0 = y * T, up = ch === '^';
          for (let i = 0; i < 4; i++) for (let r = 0; r < 9; r++) {
            const wd = Math.max(1, 4 - Math.floor(r / 2.2)), yy = up ? y0 + T - 1 - r : y0 + r;
            R(g, room.area === 'glim' ? '#8fb8ff' : room.area === 'snow' ? '#d8f0ff' : room.area === 'storm' ? '#9ab0d0' : room.area === 'spire' ? '#ff7a3a' : '#c9d8a0', x0 + i * 4 + (4 - wd) / 2 | 0, yy, wd, 1);
            R(g, room.area === 'glim' ? '#3a56b8' : room.area === 'snow' ? '#6a8cc4' : room.area === 'storm' ? '#3a4a6a' : room.area === 'spire' ? '#8a2a18' : '#5a6a3a', x0 + i * 4 + 3, yy, 1, 1);
          }
        }
      }
      room.layer = c;
      room.decor = this.makeDecor(room, at, air);
    },
    makeDecor(room, at, air) {
      const d = [], w = room.w, h = room.h, a = room.area, hs = LF.hash;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (at(x, y) !== '#') continue;
        const k = hs(x, y, 31), k2 = hs(x, y, 77);
        if (air(x, y - 1) && at(x, y - 1) !== '^') { // surface decor
          if (a === 'moss') { if (k < .6) d.push({ t: 'grass', x: x * T + k2 * 12, y: y * T, s: k, h: 4 + k * 6 }); if (k > .9) d.push({ t: 'shroom', x: x * T + 8, y: y * T, s: k2, l: 34 }); if (k > .82 && k < .87) d.push({ t: 'flower', x: x * T + 5 + k2 * 6, y: y * T, s: k2 }); }
          if (a === 'glim') { if (k > .78) d.push({ t: 'crystal', x: x * T + 4 + k2 * 8, y: y * T, s: k2, l: 40 }); if (k < .12) d.push({ t: 'shroom', x: x * T + 8, y: y * T, s: k2, l: 30, blue: 1 }); }
          if (a === 'drown') { if (k < .35) d.push({ t: 'reed', x: x * T + k2 * 12, y: y * T, s: k, h: 5 + k * 8 }); if (k > .93) d.push({ t: 'candle', x: x * T + 8, y: y * T, s: k2, l: 46 }); if (k > .85 && k < .9) d.push({ t: 'bones', x: x * T + 6, y: y * T, s: k2 }); }
          if (a === 'spire') { if (k > .88) d.push({ t: 'vent', x: x * T + 8, y: y * T, s: k2, l: 44 }); if (k < .2) d.push({ t: 'ember', x: x * T + k2 * 12, y: y * T, s: k }); }
        }
        if (air(x, y + 1) && at(x, y + 1) !== 'v') { // ceiling decor
          if (a === 'moss' && k2 < .55) d.push({ t: 'vine', x: x * T + 3 + k * 10, y: (y + 1) * T - 2, s: k, h: 8 + k2 * 22 });
          if (a === 'glim' && k2 < .4) d.push({ t: 'stalac', x: x * T + 8, y: (y + 1) * T - 2, s: k, h: 5 + k * 9, l: k > .7 ? 36 : 0 });
          if (a === 'drown' && k2 < .35) d.push({ t: 'drip', x: x * T + 4 + k * 8, y: (y + 1) * T, s: k, h: 4 + k2 * 10 });
          if (a === 'spire' && k2 < .3) d.push({ t: 'chain', x: x * T + 4 + k * 8, y: (y + 1) * T - 2, s: k, h: 10 + k2 * 40 });
        }
      }
      return d;
    },
    /* ---------- decor drawing (animated) ---------- */
    drawDecor(g, room, cam, t, lights) {
      const P = PAL[room.area], x0 = cam.x - 24, x1 = cam.x + LF.W + 24, y0 = cam.y - 24, y1 = cam.y + LF.H + 24;
      for (const o of room.decor) {
        if (o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1 + 30) continue;
        const x = o.x - cam.x | 0, y = o.y - cam.y | 0, sw = Math.sin(t * 1.6 + o.s * 20);
        switch (o.t) {
          case 'grass': for (let i = 0; i < 3; i++) { R(g, i === 1 ? P.top[2] : P.top[1], x + i * 2 + Math.round(sw * (o.h / 6)), y - o.h + i * 2, 1, o.h - i * 2); R(g, P.top[0], x + i * 2, y - 2, 1, 2); } break;
          case 'reed': R(g, P.top[0], x, y - o.h, 1, o.h); R(g, P.top[1], x + Math.round(sw), y - o.h - 1, 1, 2); R(g, P.top[0], x + 2, y - o.h * .6, 1, o.h * .6); break;
          case 'flower': R(g, '#3f8a4c', x, y - 5, 1, 5); R(g, o.s > .5 ? '#ff8aa8' : '#ffe08a', x - 1, y - 7, 3, 2); R(g, '#fff', x, y - 6, 1, 1); break;
          case 'shroom': { const col = o.blue ? ['#4a8aff', '#bfe4ff'] : ['#e07a5a', '#ffd9a0']; R(g, '#e8dcc8', x - 1, y - 4, 2, 4); R(g, col[0], x - 3, y - 7, 7, 3); R(g, col[1], x - 2, y - 7, 2, 1); R(g, col[1], x + 1, y - 6, 1, 1); lights.push({ x: o.x, y: o.y - 5, r: o.l, c: col[0], a: .7 + .15 * sw }); break; }
          case 'crystal': { const c1 = o.s > .5 ? '#7ad8ff' : '#c49bff'; R(g, '#3a3480', x - 3, y - 2, 7, 2); R(g, c1, x - 1, y - 12, 3, 10); R(g, '#e8fbff', x - 1, y - 12, 1, 9); R(g, c1, x - 3, y - 7, 2, 5); R(g, c1, x + 2, y - 8, 2, 6); if (sw > .8) R(g, '#fff', x, y - 13, 1, 1); lights.push({ x: o.x, y: o.y - 8, r: o.l, c: c1, a: .75 + .15 * sw }); break; }
          case 'candle': { R(g, '#e8dcc8', x - 1, y - 6, 3, 6); R(g, '#a89a88', x + 1, y - 6, 1, 6); const f = 1 + Math.round(sw); R(g, '#ffd27a', x, y - 9 - f, 1, 2 + f); R(g, '#ff8a3d', x, y - 8, 1, 2); lights.push({ x: o.x, y: o.y - 9, r: o.l, c: '#ffb860', a: .8 + .15 * Math.sin(t * 9 + o.s * 30) }); break; }
          case 'bones': R(g, '#c8c0a8', x - 3, y - 2, 7, 2); R(g, '#e8e0cc', x - 2, y - 4, 3, 2); R(g, '#222', x - 1, y - 3, 1, 1); break;
          case 'vent': { R(g, '#2a1018', x - 4, y - 3, 9, 3); R(g, '#ff8a3d', x - 2, y - 3, 5, 1); const f = (t * 2 + o.s * 5) % 1; R(g, '#ffd27a', x - 1 + Math.sin(t * 5 + o.s * 9) * 2, y - 4 - f * 16, 2, 2); lights.push({ x: o.x, y: o.y - 4, r: o.l, c: '#ff8a3d', a: .6 + .25 * Math.sin(t * 6 + o.s * 9) }); break; }
          case 'ember': R(g, '#ff8a3d', x, y - 1, 2, 1); R(g, '#ffd27a', x, y - 1, 1, 1); break;
          case 'vine': { const n = o.h | 0; for (let i = 0; i < n; i += 2) { const sx = Math.round(Math.sin(t * 1.3 + o.s * 9 + i * .15) * (i / 10)); R(g, i % 6 === 0 ? P.top[1] : P.top[0], x + sx, y + i, 1, 2); if (i % 8 === 4) R(g, P.top[1], x + sx + 1, y + i, 2, 1); } break; }
          case 'stalac': { const n = o.h | 0; for (let i = 0; i < n; i++) R(g, i < 2 ? '#5a54b0' : '#3a3480', x - Math.max(0, 2 - (i >> 1)), y + i, Math.max(1, 5 - i), 1); if (o.l) lights.push({ x: o.x, y: o.y + n, r: o.l, c: '#9ab0ff', a: .5 }); R(g, '#bfe4ff', x, y + n - 1, 1, 1); break; }
          case 'drip': { R(g, P.top[0], x, y, 1, o.h); const f = (t * .9 + o.s * 7) % 2; if (f < .7) R(g, '#9af0d8', x, y + o.h + f * 26, 1, 2); break; }
          case 'chain': { for (let i = 0; i < o.h; i += 3) R(g, i % 6 === 0 ? '#66404e' : '#4e2f40', x + Math.round(Math.sin(t + o.s * 9 + i * .1)), y + i, 2, 2); break; }
        }
      }
    },
    /* ---------- parallax backgrounds ---------- */
    bgCache: {},
    getBG(area) {
      if (this.bgCache[area]) return this.bgCache[area];
      const P = PAL[area], rnd = LF.rng(area.length * 977 + area.charCodeAt(0)), W = 640, H = 260;
      const sky = cv(LF.W, LF.H), s = sky.getContext('2d'), gr = s.createLinearGradient(0, 0, 0, LF.H);
      P.sky.forEach((c, i) => gr.addColorStop(i / (P.sky.length - 1), c)); s.fillStyle = gr; s.fillRect(0, 0, LF.W, LF.H);
      if (area !== 'spire') for (let i = 0; i < 70; i++) { const y = rnd() * LF.H * .6; s.globalAlpha = (1 - y / LF.H) * (.3 + rnd() * .7); R(s, '#fff', rnd() * LF.W, y, 1, 1); } s.globalAlpha = 1;
      const layers = [];
      const mk = (col, fx, fy, yb, fn, alpha) => { const c = cv(W, H), g = c.getContext('2d'); g.fillStyle = col; fn(g, col, rnd); layers.push({ c, fx, fy, yb, alpha: alpha == null ? 1 : alpha }); };
      const wrap = (g, fn) => { fn(0); fn(-W); fn(W); };
      if (area === 'moss') {
        if (true) { // moon
          s.fillStyle = '#ffe9b8'; s.beginPath(); s.arc(240, 34, 13, 0, 7); s.fill(); s.fillStyle = '#e8c88a'; s.beginPath(); s.arc(236, 31, 3, 0, 7); s.arc(244, 39, 2, 0, 7); s.fill();
          const mg = s.createRadialGradient(240, 34, 10, 240, 34, 60); mg.addColorStop(0, '#ffe9b855'); mg.addColorStop(1, '#ffe9b800'); s.fillStyle = mg; s.fillRect(170, 0, 150, 100);
        }
        mk(P.far, .1, .05, 90, (g, c) => { for (let x = 0; x < W; x += 2) { const y = 120 + Math.sin(x * .02) * 20 + Math.sin(x * .05 + 2) * 9; g.fillRect(x, y, 2, H - y); } });
        mk('#2a1d50', .16, .08, 80, (g, c) => { // ruined great lantern tower (landmark)
          g.fillRect(400, 40, 22, 200); g.fillRect(394, 36, 34, 8); g.fillRect(404, 20, 14, 20); g.beginPath(); g.moveTo(402, 20); g.lineTo(411, 6); g.lineTo(420, 20); g.fill();
          g.fillStyle = '#0a0620'; g.fillRect(407, 26, 8, 10); g.fillStyle = '#2a1d50'; g.fillRect(390, 100, 12, 140); g.fillRect(426, 120, 14, 120); g.fillRect(412, 100, 2, 12);
        }, .9);
        mk(P.mid, .3, .15, 70, (g, c) => { wrap(g, o => { for (let i = 0; i < 9; i++) { const x = o + i * 74 + rnd() * 20, w = 12 + rnd() * 10; g.fillRect(x, 20, w, H); g.beginPath(); g.arc(x + w / 2, 30, 34 + rnd() * 18, 0, 7); g.arc(x + w / 2 + 20, 50, 24, 0, 7); g.arc(x + w / 2 - 22, 52, 22, 0, 7); g.fill(); } }); });
        mk(P.near, .55, .3, 40, (g, c) => { wrap(g, o => { for (let i = 0; i < 5; i++) { const x = o + i * 140 + rnd() * 40, w = 22 + rnd() * 14; g.fillRect(x, 0, w, H); for (let j = 0; j < 6; j++) { g.fillRect(x + rnd() * w, 60 + rnd() * 50, 2, 30 + rnd() * 40); } } }); });
      } else if (area === 'glim') {
        mk(P.far, .08, .05, 40, (g) => { wrap(g, o => { for (let i = 0; i < 12; i++) { const x = o + i * 54 + rnd() * 20, h = 70 + rnd() * 90, w = 10 + rnd() * 14; g.beginPath(); g.moveTo(x, H); g.lineTo(x + w / 2, H - h); g.lineTo(x + w, H); g.fill(); } }); }, .9);
        mk('#2a2a8a', .2, .1, 30, (g) => { wrap(g, o => { for (let i = 0; i < 14; i++) { const x = o + i * 46 + rnd() * 20, h = 20 + rnd() * 60; g.globalAlpha = .55; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, h); g.lineTo(x + 16, 0); g.fill(); } g.globalAlpha = 1; }); }, .7);
        mk(P.mid, .35, .18, 50, (g) => { wrap(g, o => { for (let i = 0; i < 8; i++) { const x = o + i * 84 + rnd() * 30, h = 40 + rnd() * 70; g.fillStyle = P.mid; g.beginPath(); g.moveTo(x, H); g.lineTo(x + 14, H - h); g.lineTo(x + 30, H); g.fill(); g.fillStyle = i % 2 ? '#7ad8ff' : '#c49bff'; g.globalAlpha = .8; g.fillRect(x + 13, H - h - 6, 3, 10); g.globalAlpha = 1; } }); });
        mk(P.near, .6, .3, 20, (g) => { wrap(g, o => { for (let i = 0; i < 6; i++) { const x = o + i * 120 + rnd() * 40, h = 30 + rnd() * 80; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18, h); g.lineTo(x + 36, 0); g.fill(); } }); });
      } else if (area === 'drown') {
        s.fillStyle = '#ffe9b822'; s.beginPath(); s.arc(160, 60, 38, 0, 7); s.fill(); s.fillStyle = '#9af0d855'; s.beginPath(); s.arc(160, 60, 24, 0, 7); s.fill();
        for (let i = 0; i < 8; i++) { s.fillStyle = '#04161c'; s.fillRect(160 + Math.cos(i * .785) * 8 - 1, 60 + Math.sin(i * .785) * 8 - 1, 2, 2); }
        mk(P.far, .1, .05, 60, (g) => { wrap(g, o => { for (let i = 0; i < 7; i++) { const x = o + i * 92; g.fillRect(x, 60, 18, H); g.beginPath(); g.arc(x + 55, 80, 38, Math.PI, 0); g.lineTo(x + 93, 80); g.lineTo(x + 17, 80); g.fill(); } }); });
        mk(P.mid, .3, .15, 40, (g) => { wrap(g, o => { for (let i = 0; i < 8; i++) { const x = o + i * 80 + rnd() * 12, h = 120 + rnd() * 70; g.fillRect(x, H - h, 14, h); g.fillRect(x - 3, H - h, 20, 5); g.fillRect(x - 2, H - 6, 18, 6); } }); });
        mk(P.near, .55, .3, 30, (g) => { wrap(g, o => { for (let i = 0; i < 4; i++) { const x = o + i * 170 + rnd() * 40; g.fillRect(x, 20 + rnd() * 40, 26, H); g.fillRect(x - 4, 20, 34, 6); } }); });
      } else {
        // black sun
        s.fillStyle = '#ff8a3d44'; s.beginPath(); s.arc(160, 70, 52, 0, 7); s.fill(); s.fillStyle = '#ffb85a'; s.beginPath(); s.arc(160, 70, 30, 0, 7); s.fill(); s.fillStyle = '#14060e'; s.beginPath(); s.arc(160, 70, 26, 0, 7); s.fill();
        mk(P.far, .1, .05, 60, (g) => { wrap(g, o => { for (let i = 0; i < 6; i++) { const x = o + i * 110 + rnd() * 20, h = 80 + rnd() * 110; g.fillRect(x, H - h, 24, h); g.fillRect(x - 4, H - h, 32, 8); g.fillRect(x + 4, H - h - 14, 4, 14); g.fillRect(x + 16, H - h - 10, 4, 10); } }); });
        mk(P.mid, .3, .15, 50, (g) => { wrap(g, o => { for (let i = 0; i < 6; i++) { const x = o + i * 100 + rnd() * 30, y = 40 + rnd() * 110, w = 30 + rnd() * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w * .6, y + 14 + rnd() * 10); g.lineTo(x + w * .3, y + 8); g.fill(); } }); }, .9);
        mk(P.near, .55, .3, 30, (g) => { wrap(g, o => { for (let i = 0; i < 5; i++) { const x = o + i * 130 + rnd() * 30; g.fillRect(x, 0, 18, H); g.fillRect(x - 6, 100 + rnd() * 80, 30, 10); } }); });
      }
      return this.bgCache[area] = { sky, layers };
    },
    drawBG(g, room, cam, t, tod) {
      const bg = this.getBG(room.area), P = PAL[room.area];
      g.drawImage(bg.sky, 0, 0);
      if (room.area === 'moss' && tod) { g.globalAlpha = tod; g.fillStyle = '#05031a'; g.fillRect(0, 0, LF.W, LF.H); g.globalAlpha = 1; }
      const maxY = Math.max(1, room.h * T - LF.H);
      for (const L of bg.layers) {
        const w = L.c.width, ox = -((cam.x * L.fx) % w), oy = Math.round(L.yb - 60 - (cam.y / maxY) * 40 * (L.fy * 3) + (LF.H - 180));
        g.globalAlpha = L.alpha; g.drawImage(L.c, Math.round(ox), oy); g.drawImage(L.c, Math.round(ox + w), oy); g.globalAlpha = 1;
      }
      // fog bands
      g.fillStyle = P.fog;
      for (let i = 0; i < 3; i++) { const y = 100 + i * 26 - cam.y * .1, off = (t * (4 + i * 3) + i * 90) % 320; g.globalAlpha = .06; g.fillRect(0, y, 320, 22); g.globalAlpha = .05; g.fillRect(off - 320, y + 4, 320, 12); g.fillRect(off, y + 4, 320, 12); }
      g.globalAlpha = 1;
      if (room.area === 'drown') { // god rays
        for (let i = 0; i < 4; i++) { const x = i * 90 + 20 - (cam.x * .2) % 360, a = .04 + .02 * Math.sin(t * .6 + i); g.globalAlpha = a; g.fillStyle = '#c0fff0'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 24, 0); g.lineTo(x + 70, LF.H); g.lineTo(x + 30, LF.H); g.fill(); }
        g.globalAlpha = 1;
      }
    }
  };
})();
