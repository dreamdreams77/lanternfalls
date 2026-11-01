/* Lanternfall - presentation: region map, pause header, title hints, victory rank, state hooks for CSS */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, UI = LF.UI, h = UI.h;

  /* body[data-state] lets CSS hide tips and banners behind menus, the death card and the ending */
  const setStateO = G.setState;
  G.setState = function (s) { document.body.dataset.state = s; return setStateO.apply(this, arguments); };
  document.body.dataset.state = LF.state || 'boot';

  /* ---------- region map ---------- */
  UI.tab_map = function (body) {
    body.append(h('h2', '', 'Map'));
    const cv = h('canvas'); cv.id = 'mapcv'; body.append(cv);
    const rooms = Object.values(LF.Rooms.list), s = G.save, T = LF.T;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    rooms.forEach(r => { x0 = Math.min(x0, r.mx); y0 = Math.min(y0, r.my); x1 = Math.max(x1, r.mx + r.mw); y1 = Math.max(y1, r.my + r.mh); });
    const cs = Math.max(6, Math.min(18, Math.floor(520 / (x1 - x0)), Math.floor(290 / (y1 - y0)))), pad = 14;
    cv.width = (x1 - x0) * cs + pad * 2; cv.height = (y1 - y0) * cs + pad * 2 + 4;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const pos = r => [(r.mx - x0) * cs + pad, (r.my - y0) * cs + pad + 4, r.mw * cs, r.mh * cs];
    const seenN = rooms.filter(r => s.seen['r:' + r.id]).length, byArea = {};
    // unexplored rooms: faint outline only, so the layout is hinted but not given away
    rooms.forEach(r => {
      const [x, y, w, hh] = pos(r), seen = s.seen['r:' + r.id];
      if (!seen) { g.strokeStyle = '#2a2250'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, hh - 1); g.fillStyle = '#0d0a1e'; g.fillRect(x + 1, y + 1, w - 2, hh - 2); return; }
      const P = LF.PAL[r.area]; const a = byArea[r.area] = byArea[r.area] || { x0: 1e9, y0: 1e9, x1: -1e9, n: 0 };
      a.x0 = Math.min(a.x0, x); a.x1 = Math.max(a.x1, x + w); a.y0 = Math.min(a.y0, y); a.n++;
      g.fillStyle = P.rock[3]; g.fillRect(x, y, w, hh); g.fillStyle = P.rock[2]; g.fillRect(x + 1, y + 1, w - 2, hh - 2);
      g.fillStyle = P.top[1]; g.fillRect(x + 1, y + 1, w - 2, 1); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 1, y + 2, w - 2, 2);
      r.ents.forEach((e, i) => {
        const key = r.id + '#' + i;
        if (e.type === 'shrine') { g.fillStyle = s.flags['sh:' + key] ? '#ffd27a' : '#7a6a58'; g.fillRect(x + w / 2 - 1, y + hh / 2 - 1, 3, 3); if (s.flags['sh:' + key]) { g.fillStyle = 'rgba(255,210,122,.25)'; g.fillRect(x + w / 2 - 3, y + hh / 2 - 3, 7, 7); } }
        if (e.type === 'boss' && !s.flags['boss_' + e.id]) { g.fillStyle = '#ff6f7d'; g.fillRect(x + w - 6, y + 3, 4, 4); g.fillStyle = '#05030f'; g.fillRect(x + w - 5, y + 4, 2, 2); }
        if (e.type === 'moth' && s.moths.indexOf(e.id) < 0) { g.fillStyle = '#c49bff'; g.fillRect(x + 2, y + hh - 5, 2, 2); }
        if (e.type === 'chest' && !s.seen['c:' + key]) { g.fillStyle = '#ffb23a'; g.fillRect(x + 4 + (i % 3) * 3, y + hh - 4, 2, 2); }
        if (e.type === 'portal' || e.type === 'trial') { g.fillStyle = '#9af0d8'; g.fillRect(x + w / 2 - 1, y + 3, 3, 3); }
      });
    });
    // region names above their explored rooms
    g.font = 'bold 9px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const k in byArea) { const a = byArea[k], nm = (LF.PAL[k].name || k).toUpperCase(), cx = (a.x0 + a.x1) / 2, ty = Math.max(10, a.y0 - 4); g.fillStyle = '#05030f'; g.fillText(nm, cx + 1, ty + 1); g.fillStyle = LF.PAL[k].top[1] || '#a597d4'; g.fillText(nm, cx, ty); }
    // you are here: pulsing marker
    const cur = LF.Rooms.list[G.room.id];
    if (cur) {
      const [x, y, w, hh] = pos(cur), pl = G.player, px = x + pl.cx / (cur.w * T) * w, py = y + pl.cy / (cur.h * T) * hh;
      g.strokeStyle = '#ffd27a'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, hh - 1);
      let k = 0; const draw = () => { if (!cv.isConnected) return; k += .08; const r = 3 + (Math.sin(k) + 1) * 2.2; g.clearRect(px - 9, py - 9, 18, 18); redrawAround(); g.strokeStyle = 'rgba(255,210,122,' + (.7 - (r - 3) * .12) + ')'; g.beginPath(); g.arc(px, py, r, 0, 6.283); g.stroke(); g.fillStyle = '#fff'; g.fillRect(px - 2, py - 2, 4, 4); g.fillStyle = '#ff8a3d'; g.fillRect(px - 1, py - 1, 2, 2); requestAnimationFrame(draw); };
      const base = g.getImageData(0, 0, cv.width, cv.height), redrawAround = () => g.putImageData(base, 0, 0, Math.max(0, Math.floor(px - 9)), Math.max(0, Math.floor(py - 9)), 18, 18);
      draw();
    }
    const total = rooms.length, mo = s.moths.length;
    body.append(h('div', 'hint', 'Here: <b style="color:#ffd27a">' + (cur ? cur.name : '') + '</b> &nbsp; Explored ' + seenN + ' / ' + total + ' &nbsp; Moths ' + mo + ' / ' + LF.totalMoths +
      '<br><span style="color:#ffd27a">&#9632;</span> lit shrine &nbsp; <span style="color:#ff6f7d">&#9632;</span> boss &nbsp; <span style="color:#c49bff">&#9632;</span> unfound moth &nbsp; <span style="color:#ffb23a">&#9632;</span> unopened chest &nbsp; <span style="color:#9af0d8">&#9632;</span> portal'));
    return [];
  };

  /* locked charms collapse to a lock and a question mark, so the grid fits a phone */
  const charmsO = UI.tab_charms;
  UI.tab_charms = function (body) { const r = charmsO.apply(this, arguments); body.querySelectorAll('.card.locked').forEach(c => c.classList.add('unk')); return r; };

  /* ---------- pause screen header ---------- */
  const pauseO = UI.tab_pause;
  UI.tab_pause = function (body) {
    const items = pauseO.apply(this, arguments), r = LF.Rooms.list[G.room.id], s = G.save;
    const info = h('div', 'pinfo', '<b>' + (r ? r.name : '') + '</b><span>' + (LF.PAL[G.room.area] || {}).name + '</span><span>' + LF.fmtTime(s.time) + ' played</span><span>' + LF.completion(s) + '% complete</span>');
    body.querySelector('h2').after(info); return items;
  };

  /* ---------- title: a rotating line of lore or advice ---------- */
  const LINES = ['Strike a shot out of the air and it turns on whoever threw it.', 'Dash through danger to graze it. The Flare loves a close call.', 'Shrines heal you and remember where you stand.', 'Foes with an aura are elites. The shielded ones fear your back.', 'Some walls are only illusions. Listen for the hum.', 'Embers lost in the dark wait for you where you fell.', 'Keep pogoing and the air will pay you back.', 'The Great Lantern fell, but it did not go out.'];
  let lineI = Math.floor(Math.random() * LINES.length);
  const titleO = UI.title;
  UI.title = function () {
    titleO.apply(this, arguments);
    const s = document.getElementById('title'); if (!s) return;
    const tip = h('div', 'tline', LINES[lineI++ % LINES.length]); s.append(tip);
  };

  /* ---------- victory: a rank for the journey ---------- */
  const RANKS = [[95, 'Keeper of the Great Lantern'], [70, 'Wickbearer'], [40, 'Ember Wanderer'], [0, 'Last Spark']];
  new MutationObserver(() => {
    const hd = [...UI.layer.querySelectorAll('.panel h2')].find(x => x.textContent === 'The Flame Endures');
    if (!hd || hd.dataset.ranked) return; hd.dataset.ranked = 1;
    const s = G.save, pct = LF.completion(s), rank = RANKS.find(r => pct >= r[0])[1];
    const el = h('div', 'rank', '<b>' + rank + '</b>' + (s.deaths === 0 ? '<span>Unfaded: finished without falling</span>' : '<span>Faded ' + s.deaths + (s.deaths === 1 ? ' time' : ' times') + '</span>'));
    hd.after(el);
  }).observe(document.getElementById('ui'), { childList: true, subtree: true });
})();
