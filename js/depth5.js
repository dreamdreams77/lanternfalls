/* Lanternfall - encounter depth: slimes that split, beetles that curl, bat flocks, thorn spreads, hit squash, and guarded discoveries (ambushes) */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, S = LF.Sprites, T = LF.T, UI = LF.UI, Phys = LF.Phys;
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ext = () => { const e = G.save.ext = G.save.ext || {}; e.ambush = e.ambush || 0; e.splits = e.splits || 0; return e; };

  /* ---------- hurt rules: curled beetles shrug off blows; every hit squashes the foe ---------- */
  const hurtO = LF.hurtEnemy;
  LF.hurtEnemy = function (e, dmg, dir, Gm) {
    if (e.type === 'beetle' && e.curl > 0) {
      Gm.sfx('hit'); Gm.hitstop(.03); Gm.floatText(e.x + e.w / 2, e.y - 4, 'CLANK', '#b0c0ff'); Gm.ring(e.x + e.w / 2, e.y + e.h / 2, '#b0c0ff', 14); Gm.burst(e.x + e.w / 2, e.y + e.h / 2, 5, '#e8fbff', 90, 0);
      return false;
    }
    const r = hurtO.call(this, e, dmg, dir, Gm);
    if (!r) {
      e._hs = .14;
      if (e.type === 'beetle' && e.affix !== 'shielded') { e._hc = (e._hc || 0) + 1; e._hct = 2; if (e._hc >= 3 && e.hp > 0) { e._hc = 0; e.curl = 1.5; e.stun = 0; Gm.floatText(e.x + e.w / 2, e.y - 10, 'CURLS UP', '#ffb0c0'); Gm.sfx('crack'); } }
    }
    return r;
  };

  /* ---------- behaviours ---------- */
  const ueO = LF.updateEnemy;
  LF.updateEnemy = function (e, dt, Gm) {
    if (e._hs > 0) e._hs -= dt;
    if (e._hct > 0) { e._hct -= dt; if (e._hct <= 0) e._hc = 0; }
    if (e.type === 'beetle' && e.curl > 0) { // rolling ball: fast, spiked, untouchable
      e.curl -= dt; e.flash = Math.max(0, e.flash - dt); e.vx = e.face * 118; e.vy = Math.min(e.vy + 900 * dt, 380); Phys.move(e, dt, Gm);
      if (e.hitX) e.face = -e.face;
      if (Math.random() < .5) Gm.particles.push({ x: e.x + e.w / 2, y: e.y + e.h - 1, vx: -e.face * 20, vy: -10, life: .3, max: .3, col: '#c9b8e8', sz: 1, g: 0 });
      if (e.curl <= 0) { e.state = 'idle'; e.t = -.7; }
      return;
    }
    const was = e.state, n = Gm.projectiles.length;
    ueO.call(this, e, dt, Gm);
    if (e.type === 'bat' && was === 'hang' && e.state === 'swoop') { // one wakes, the colony wakes
      let k = 0; for (const o of Gm.enemies) if (o !== e && o.type === 'bat' && o.state === 'hang' && Math.hypot(o.x - e.x, o.y - e.y) < 120) { o.state = 'swoop'; o.t = -.12 * (++k); }
      if (k) Gm.floatText(e.x + e.w / 2, e.y - 8, 'FLOCK!', '#ff8aa8');
    }
    if (e.type === 'thorn' && Gm.projectiles.length > n && Math.hypot(Gm.player.cx - (e.x + e.w / 2), Gm.player.cy - (e.y + e.h / 2)) < 78) { // up close it fires a fan
      const p = Gm.projectiles[Gm.projectiles.length - 1], a = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy);
      for (const d of [-.42, .42]) Gm.projectiles.push(Object.assign({}, p, { vx: Math.cos(a + d) * sp, vy: Math.sin(a + d) * sp }));
    }
  };

  const killO = G.killEnemy;
  G.killEnemy = function (e) {
    killO.call(this, e);
    if (e.type !== 'slime') return;
    const s = this.save;
    if (e.baby) { if (s.bestiary && s.bestiary.slime > 0) s.bestiary.slime--; return; } // only grown slimes count toward the bestiary
    if (this.room.id === 'trial' || e.affix === 'volatile') return;
    ext().splits++;
    for (const d of [-1, 1]) {
      const b = this.spawnEnemy('slime', e.x + e.w / 2 - 4.5 + d * 3, e.y + e.h - 7);
      b.baby = 1; b.w = 9; b.h = 7; b.hp = b.maxHp = 1; b.em = 1; b.d = Object.assign({}, b.d, { spd: b.d.spd * 1.6 }); b.vx = d * 85; b.vy = -150; b.face = d; b.ghost = 0; b.stun = .1;
    }
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 8, '#7ad86a', 90, 1);
  };

  /* ---------- drawing: hit squash, curled beetle ---------- */
  const deO = S.drawEnemy;
  S.drawEnemy = function (g, e, cam, t) {
    const x = e.x - cam.x, y = e.y - cam.y;
    if (e.type === 'beetle' && e.curl > 0) {
      const cx = Math.round(x + e.w / 2), cy = Math.round(y + e.h / 2 - 1), a = t * 16 * e.face;
      g.save(); g.translate(cx, cy); g.rotate(a);
      R(g, '#05030f', -7, -7, 14, 14); R(g, e.flash > 0 ? '#fff' : '#4a3ea0', -6, -6, 12, 12); R(g, '#2a2060', -4, -4, 8, 8); R(g, '#7ad8ff', -2, -6, 3, 2);
      for (const [px, py] of [[-9, -1], [7, -1], [-1, -9], [-1, 7], [-8, -8], [6, -8], [-8, 6], [6, 6]]) R(g, '#e8fbff', px, py, 3, 3);
      g.restore(); return;
    }
    if (e._hs > 0 && !e.dead) {
      const k = e._hs / .14, cx = Math.round(x + e.w / 2), by = Math.round(y + e.h);
      g.save(); g.translate(cx, by); g.scale(1 + .22 * k, 1 - .2 * k); g.translate(-cx, -by); deO.call(this, g, e, cam, t); g.restore(); return;
    }
    return deO.call(this, g, e, cam, t);
  };

  /* ---------- guarded discoveries: taking a treasure can wake the dark ---------- */
  let last = null, pend = 0, frame = 0, live = 0, tries = 0;
  const count = () => { const s = G.save; let n = s.moths.length; for (const k in s.flags) if (k.charCodeAt(0) === 102 && k.indexOf('frag:') === 0) n++; for (const k in s.seen) if (k.charCodeAt(0) === 99 && k.indexOf('c:') === 0) n++; return n; };
  const hash = k => { let h = 2166136261; for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const calm = () => { const r = G.room; return r && !G.boss && r.id !== 'trial' && !r.bonus && !r.pz && !r.arcade && G.state === 'play'; };
  const DEF = { moss: ['slime', 'beetle'], glim: ['bat', 'mothfoe'], drown: ['jelly', 'wisp'], spire: ['husk', 'wisp'] };
  function spawnAmbush() {
    const r = G.room, pl = G.player, s = G.save, def = LF.Rooms.list[r.id];
    let types = [...new Set(def.ents.filter(e => LF.ENEMY_TYPES[e.type] && e.type !== 'snowman').map(e => e.type))];
    if (!types.length) types = DEF[r.area] || ['slime'];
    const n = 3 + (s.ng ? 1 : 0) + (s.maxHp >= 8 ? 1 : 0); let made = 0;
    for (let i = 0; i < n * 8 && made < n; i++) {
      const type = types[made % types.length], d = LF.ENEMY_TYPES[type], side = (made + i) % 2 ? 1 : -1, px = pl.cx + side * (80 + Math.random() * 90) - d.w / 2;
      if (px < 16 || px > r.w * T - 16 - d.w) continue;
      let py;
      if (d.fly) py = Math.max(24, Math.min(r.h * T - 40, pl.cy - 10 - Math.random() * 30));
      else { const tx = Math.floor((px + d.w / 2) / T); let ty = Math.floor(pl.cy / T) - 1, found = -1; for (let k = 0; k < 12 && ty < r.h; k++, ty++) { if (Phys.solid(G.tile(tx, ty)) && !Phys.solid(G.tile(tx, ty - 1)) && G.tile(tx, ty - 1) !== 'w') { found = ty; break; } } if (found < 0) continue; py = found * T - d.h; }
      if (Phys.solid(G.tile(Math.floor((px + d.w / 2) / T), Math.floor((py + d.h / 2) / T)))) continue;
      const e = G.spawnEnemy(type, px, py); e.ambush = 1; e.em = Math.ceil(e.em * 1.3); made++;
      G.burst(e.x + e.w / 2, e.y + e.h / 2, 14, '#c49bff', 80, 1);
    }
    if (!made) return false;
    live = made; G.banner('The dark answers', 'Something guarded this'); G.sfx('ambush'); G.shake(3); return true;
  }
  const simO = G.simulate;
  G.simulate = function (dt) {
    simO.call(this, dt);
    if (this.hitstopT > 0 || this.state !== 'play') return;
    if (++frame % 12 === 0) {
      const n = count();
      if (last == null) last = n;
      else if (n > last) { last = n; if (calm() && !live && !pend && hash(this.room.id + ':' + n + ':' + this.save.ng) < .42) pend = 1.2; tries = 0; }
    }
    if (pend > 0) { pend -= dt; if (pend <= 0) { pend = 0; if (calm() && this.enemies.filter(e => !e.dead && e.kind !== 'boss').length < 7 && !spawnAmbush() && ++tries < 5) pend = .5; } } // no clear footing this time: look again shortly
    if (live && !this.enemies.some(e => e.ambush && !e.dead)) {
      live = 0; const s = ext(), pl = this.player; s.ambush++;
      for (let k = 0; k < 10; k++) this.drops.push({ x: pl.cx, y: pl.cy - 6, w: 4, h: 4, vx: LF.rand(-80, 80), vy: LF.rand(-160, -70), v: 1, life: 28, ghost: 1 });
      this.addFlare(30); this.floatText(pl.cx, pl.y - 12, 'AMBUSH CLEARED', '#ffd27a', true); this.sfx('clear'); this.burst(pl.cx, pl.cy, 18, '#ffd27a', 110, 1); this.checkBounties();
    }
  };
  const loadO = G.loadRoom; G.loadRoom = function () { const r = loadO.apply(this, arguments); live = 0; pend = 0; return r; };
  const startO = G.start; G.start = function () { last = null; live = 0; pend = 0; return startO.apply(this, arguments); };

  /* ---------- bounty, stats, help ---------- */
  LF.BOUNTIES.push({ id: 'ambush', name: 'Unshaken', desc: 'Survive 5 ambushes set off by taking a treasure.', test: s => [(s.ext || {}).ambush || 0, 5], reward: 'embers:180', rtxt: '180 embers' });
  const statsO = UI.tab_stats;
  UI.tab_stats = function (body) {
    const r = statsO.apply(this, arguments), s = G.save.ext || {}, col = body.querySelector('.col');
    if (col) col.insertAdjacentHTML('beforeend', [['Ambushes survived', s.ambush || 0], ['Slimes split', s.splits || 0]].map(x => '<div class="stat"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join(''));
    return r;
  };
  const helpO = UI.helpHTML;
  UI.helpHTML = function () {
    const h = helpO.apply(this, arguments), tip = '<div class="entry"><b>Wise foes:</b> slimes split when they fall, bats wake as a flock, Thornlings fire a fan up close, and a beetle struck three times curls into a spiked ball. Wait it out. Some treasures are guarded: taking one can wake an ambush. Clear it for a purse of embers.</div>';
    const i = h.lastIndexOf('</div></div>');
    return i < 0 ? h : h.slice(0, i) + tip + h.slice(i);
  };
})();
