/* Lanternfall - room moods: each room gets its own backdrop (interiors, caves, thorns, crystals, arches, chains...) and colour grade,
   drawn behind the world with parallax. Rooms without a mood keep their region backdrop. */
(function () {
  'use strict';
  const LF = window.LF, W = LF.W, H = LF.H, Art = LF.Art, PAL = LF.PAL;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const wrap = (v, span) => ((v % span) + span) % span;
  const hash = (i, k) => { let h = Math.imul(i * 374761393 + k * 668265263, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };

  /* ---------- backdrop layers: (g, cam, t, P, opt) ---------- */
  const LAYERS = {
    rafters(g, cam, t, P, o) { // wooden posts, a crossbeam and hanging lanterns: the inside of a hollow stump
      const span = 110, n = 5, col = o.col || '#1a100a', hi = o.hi || '#2c1a10';
      for (let i = 0; i < n; i++) { const x = wrap(i * span - cam.x * .35, n * span) - span; R(g, col, x, 0, 12, H); R(g, hi, x + 2, 0, 2, H); R(g, '#0e0805', x + 10, 0, 2, H); }
      R(g, col, 0, 20, W, 7); R(g, hi, 0, 20, W, 1); R(g, col, 0, 62, W, 4); R(g, hi, 0, 62, W, 1);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x = wrap(i * 96 + 40 - cam.x * .55, 4 * 96) - 30, y = 34 + hash(i, 2) * 18, fl = .75 + .25 * Math.sin(t * 7 + i * 2);
        R(g, '#1a100a', x + 1, 27, 1, y - 27); R(g, '#3a2418', x - 2, y, 6, 7); g.globalAlpha = .9 * fl; R(g, '#ffc15a', x - 1, y + 1, 4, 5); R(g, '#fff2c9', x, y + 2, 2, 3);
        g.globalAlpha = .26 * fl; for (let r = 18; r > 4; r -= 5) { g.beginPath(); g.fillStyle = '#ffb860'; g.arc(x + 1, y + 4, r, 0, 6.283); g.fill(); }
      }
      g.restore(); g.globalAlpha = 1;
    },
    roots(g, cam, t, P, o) { // hanging roots with glow-worms
      for (let i = 0; i < 16; i++) {
        const x = wrap(i * 41 + hash(i, 1) * 30 - cam.x * .45, 16 * 41) - 20, len = 24 + hash(i, 3) * 70, col = hash(i, 5) > .5 ? '#1c120d' : '#2a1a12';
        for (let y = 0; y < len; y++) R(g, col, x + Math.sin(y * .12 + i) * 3 + Math.sin(t * .8 + i) * (y / len) * 2, y, y < 6 ? 3 : 2, 1);
      }
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const x = wrap(i * 53 + 17 - cam.x * .6, 12 * 53) - 10, y = 20 + hash(i, 7) * 110, a = .35 + .65 * Math.max(0, Math.sin(t * 1.4 + i * 3)); g.globalAlpha = a * .9; R(g, '#b8ff9a', x, y, 1, 1); g.globalAlpha = a * .25; R(g, '#7affb0', x - 1, y - 1, 3, 3); }
      g.restore(); g.globalAlpha = 1;
    },
    thorns(g, cam, t, P, o) { // barbed vines
      for (let i = 0; i < 9; i++) {
        const x0 = wrap(i * 80 + hash(i, 1) * 40 - cam.x * .4, 9 * 80) - 40, len = 40 + hash(i, 3) * 80; let px = x0;
        for (let y = 0; y < len; y++) { px = x0 + Math.sin(y * .09 + i * 2) * 6 + Math.sin(t * .6 + i) * (y / len); R(g, '#240c18', px, y, 3, 1); if (y % 9 === 4) { const s = hash(i, y) > .5 ? 1 : -1; R(g, '#3a1226', px + s * 3, y - 1, 2, 1); R(g, '#c8386a', px + s * 5, y - 2, 1, 1); } }
      }
    },
    crystals(g, cam, t, P, o) { // tall crystal clusters rising from the floor and hanging from the ceiling
      const col = o.col || P.mid;
      for (let i = 0; i < 8; i++) {
        const x = wrap(i * 70 + hash(i, 1) * 30 - cam.x * .28, 8 * 70) - 30, h = 40 + hash(i, 2) * 60, w = 10 + hash(i, 4) * 10, up = i % 2 === 0, y0 = up ? H : 0;
        g.fillStyle = col; g.beginPath(); if (up) { g.moveTo(x, y0); g.lineTo(x + w * .3, y0 - h); g.lineTo(x + w * .7, y0 - h * .85); g.lineTo(x + w, y0); } else { g.moveTo(x, y0); g.lineTo(x + w * .3, y0 + h); g.lineTo(x + w * .7, y0 + h * .8); g.lineTo(x + w, y0); } g.closePath(); g.fill();
        g.globalAlpha = .35; g.fillStyle = o.edge || P.glow; g.beginPath(); if (up) { g.moveTo(x + w * .3, y0 - h); g.lineTo(x + w * .45, y0 - h); g.lineTo(x + w * .2, y0); g.lineTo(x, y0); } else { g.moveTo(x + w * .3, y0 + h); g.lineTo(x + w * .45, y0 + h); g.lineTo(x + w * .2, y0); g.lineTo(x, y0); } g.fill(); g.globalAlpha = 1;
      }
    },
    arches(g, cam, t, P, o) { // stone arcade of the drowned chapel
      const span = o.span || 90, n = 6, col = o.col || '#06161b', hi = o.hi || '#0e2a31', top = o.top == null ? 34 : o.top;
      for (let i = 0; i < n; i++) {
        const x = wrap(i * span - cam.x * .32, n * span) - span;
        R(g, col, x, top + 14, 14, H); R(g, hi, x + 2, top + 14, 2, H);
        for (let k = 0; k < 14; k++) { const w = Math.round(Math.sqrt(Math.max(0, 14 * 14 - (14 - k) * (14 - k)))); R(g, col, x + 7 - w + (span - 14) / 2 * 0, top + k, 14 + (14 - w) * 0, 1); }
        R(g, col, x - 6, top + 8, span, 6); R(g, hi, x - 6, top + 8, span, 1);
      }
    },
    halo(g, cam, t, P, o) { // a holy glow behind a shrine of power
      g.save(); g.globalCompositeOperation = 'lighter'; const cx = W / 2 - (cam.x * .1) % 40 * 0, cy = 96;
      const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 130); gr.addColorStop(0, o.col || 'rgba(255,230,160,.5)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.globalAlpha = .08 + .03 * Math.sin(t); g.fillStyle = '#fff2c9'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + t * .05; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - .07) * 260, cy + Math.sin(a - .07) * 260); g.lineTo(cx + Math.cos(a + .07) * 260, cy + Math.sin(a + .07) * 260); g.fill(); }
      g.restore(); g.globalAlpha = 1;
    },
    beams(g, cam, t, P, o) { // slanting coloured light
      const cols = o.cols || ['#ff6f7d', '#ffd27a', '#7dffb0', '#7ad8ff', '#c49bff']; g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < cols.length; i++) { const x = wrap(i * 70 - cam.x * .22 + Math.sin(t * .3 + i) * 8, 5 * 70 + 80) - 50; g.globalAlpha = (o.a || .07) * (.7 + .3 * Math.sin(t * .8 + i)); g.fillStyle = cols[i]; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18, 0); g.lineTo(x + 70, H); g.lineTo(x + 36, H); g.fill(); }
      g.restore(); g.globalAlpha = 1;
    },
    chains(g, cam, t, P, o) { // hanging chains and slow-swinging censers
      for (let i = 0; i < 9; i++) {
        const x = wrap(i * 52 + 14 - cam.x * .38, 9 * 52) - 20, len = 50 + hash(i, 2) * 90, sw = Math.sin(t * .7 + i * 1.7) * 2;
        for (let y = 0; y < len; y += 4) { const px = x + sw * (y / len); R(g, '#241014', px, y, 2, 3); R(g, '#4a2428', px, y, 1, 1); }
        if (i % 3 === 0) { const px = x + sw; R(g, '#1c0c10', px - 4, len, 10, 8); R(g, '#ff9a3c', px - 2, len + 2, 6, 4); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25; g.beginPath(); g.fillStyle = '#ff8a3d'; g.arc(px + 1, len + 4, 14, 0, 6.283); g.fill(); g.restore(); }
      }
    },
    pillars(g, cam, t, P, o) { // broken columns of an old arena
      for (let i = 0; i < 6; i++) { const x = wrap(i * 76 - cam.x * .3, 6 * 76) - 40, top = 30 + hash(i, 1) * 50, w = 16 + hash(i, 2) * 6; R(g, o.col || '#120d22', x, top, w, H); R(g, o.hi || '#241a44', x + 2, top, 2, H); R(g, o.col || '#120d22', x - 3, top - 4, w + 6, 5); R(g, o.hi || '#241a44', x - 3, top - 4, w + 6, 1); }
    },
    mist(g, cam, t, P, o) { // low rolling mist
      g.save(); g.globalAlpha = .13; for (let i = 0; i < 6; i++) { const x = wrap(i * 70 - t * (5 + i) - cam.x * (.2 + i * .04), 6 * 70 + 120) - 100; R(g, o.col || '#c8e8e0', x, 112 + i * 8, 90 + i * 10, 10); } g.restore(); g.globalAlpha = 1;
    },
    petals(g, cam, t, P, o) { // drifting petals
      g.save(); for (let i = 0; i < 22; i++) { const x = wrap(i * 29 - cam.x * .5 - t * (6 + hash(i, 1) * 8) + Math.sin(t + i) * 8, W + 20) - 10, y = wrap(i * 37 + t * (10 + hash(i, 2) * 14), H + 12) - 6; g.globalAlpha = .6; R(g, o.col || '#ff9ad0', x, y, 2, 1); R(g, o.col2 || '#ffd0e8', x + 1, y + 1, 1, 1); } g.restore(); g.globalAlpha = 1;
    },
    abyss(g, cam, t, P, o) { // a deep glow rising from below
      const gr = g.createLinearGradient(0, H * .45, 0, H); gr.addColorStop(0, 'rgba(10,60,80,0)'); gr.addColorStop(1, o.col || 'rgba(40,150,170,.45)'); g.fillStyle = gr; g.fillRect(0, H * .45, W, H * .55);
    }
  };

  /* ---------- the moods: cover repaints the sky, tint grades the whole backdrop ---------- */
  const MOODS = {
    stump:      { cover: ['#24150e', '#3c2314'], a: .96, tint: ['#ffb070', .18], layers: [['rafters']] },
    burrow:     { cover: ['#0e0907', '#231610'], a: .97, tint: ['#8a5a3a', .14], layers: [['roots']] },
    rootbridge: { tint: ['#5ab0a0', .14], layers: [['mist']] },
    thicket:    { tint: ['#ff3a6a', .14], layers: [['thorns']] },
    bower:      { tint: ['#b060ff', .2], layers: [['petals', { col: '#d09aff', col2: '#f0d8ff' }]] },
    g_descent:  { tint: ['#3a5aff', .12], layers: [['crystals']] },
    g_cavern:   { tint: ['#a040ff', .14], layers: [['crystals', { col: '#1e1450', edge: '#c49bff' }]] },
    g_altar:    { tint: ['#ffe0a0', .2], layers: [['halo']] },
    g_lake:     { tint: ['#40a0ff', .12], layers: [['mist', { col: '#9ad0ff' }], ['crystals', { col: '#101a4a', edge: '#7ad8ff' }]] },
    g_prism:    { tint: ['#ffffff', .05], layers: [['beams', { a: .09 }], ['crystals', { col: '#15103e', edge: '#ffd27a' }]] },
    d_entry:    { tint: ['#20a090', .1], layers: [['arches']] },
    d_nave:     { cover: ['#031014', '#082a30'], a: .7, tint: ['#10b0b0', .1], layers: [['arches', { span: 120, top: 24 }]] },
    d_glide:    { tint: ['#80c0ff', .12], layers: [['beams', { cols: ['#c0f0ff', '#9ad0ff'], a: .06 }]] },
    d_chasm:    { cover: ['#020a12', '#06222e'], a: .8, tint: ['#0a6080', .14], layers: [['abyss']] },
    d_tide:     { tint: ['#30d0c0', .12], layers: [['arches', { span: 100 }], ['beams', { cols: ['#9af0d8'], a: .07 }]] },
    s_foot:     { tint: ['#ff6a30', .1], layers: [['chains']] },
    s_climb:    { cover: ['#10060c', '#2a0e14'], a: .6, tint: ['#e04a30', .1], layers: [['chains']] },
    s_summit:   { tint: ['#ffc060', .14], layers: [['beams', { cols: ['#ffd27a', '#ff9a3c'], a: .08 }], ['chains']] },
    trial:      { cover: ['#0a0614', '#1a1030'], a: .8, tint: ['#8a50ff', .1], layers: [['pillars']] }
  };

  const bgO = Art.drawBG;
  Art.drawBG = function (g, room, cam, t, tod) {
    bgO.call(this, g, room, cam, t, tod);
    const m = room && MOODS[room.id]; if (!m) return;
    const P = PAL[room.area];
    if (m.cover) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, m.cover[0]); gr.addColorStop(1, m.cover[1]); g.globalAlpha = m.a; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    for (const [name, o] of m.layers) LAYERS[name](g, cam, t, P, o || {});
    if (m.tint) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = m.tint[1] * 2; g.fillStyle = m.tint[0]; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = m.tint[1] * .5; g.fillRect(0, 0, W, H); g.restore(); }
  };
  LF.MOODS = MOODS;
})();
