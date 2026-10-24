/* Lanternfall - combat depth: Ember Graze (dash through danger), Air Chain (unbroken pogo strings), soul wisps on kills */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, UI = LF.UI;
  Object.assign(G, { air: 0, grazeSet: null });
  const ext = () => { const e = G.save.ext = G.save.ext || {}; e.graze = e.graze || 0; e.air = e.air || 0; return e; };

  /* ---------- Ember Graze: dashing through a foe or shot feeds the Flare and pays embers ---------- */
  function graze(kind, x, y) {
    const s = ext(), pl = G.player;
    s.graze++; G.addFlare(kind === 'foe' ? 9 : 6);
    G.floatText(x, y - 8, 'GRAZE', '#9af0d8'); G.ring(x, y, '#9af0d8', 16); G.burst(x, y, 6, '#9af0d8', 70, 0); G.hitstop(.03); G.sfx('glow');
    G.drops.push({ x: pl.cx, y: pl.cy, w: 4, h: 4, vx: LF.rand(-40, 40), vy: LF.rand(-110, -60), v: 1, life: 28, ghost: 1 });
    G.checkBounties();
  }
  const simO = G.simulate;
  G.simulate = function (dt) {
    const wasStop = this.hitstopT > 0;
    simO.call(this, dt);
    if (wasStop || this.state !== 'play') return;
    const pl = this.player;
    if (pl.onGround || pl.hurtT > 0 || pl.inWater) this.air = 0;
    if (pl.dashT <= 0) { this.grazeSet = null; return; }
    const set = this.grazeSet || (this.grazeSet = new Set()), box = { x: pl.x - 5, y: pl.y - 4, w: pl.w + 10, h: pl.h + 8 };
    for (const e of this.enemies) {
      if (e.dead || set.has(e) || (e.kind === 'boss' && !e.active)) continue;
      if (LF.overlap(box, e.kind === 'boss' ? { x: e.x + 5, y: e.y + 4, w: e.w - 10, h: e.h - 6 } : e)) { set.add(e); graze('foe', e.x + e.w / 2, e.y + e.h / 2); }
    }
    for (const p of this.projectiles) {
      if (p.harmless || set.has(p)) continue;
      if (LF.overlap(box, { x: p.x, y: p.y, w: p.w, h: p.h })) { set.add(p); graze('shot', p.x, p.y); }
    }
  };

  /* ---------- Air Chain: strike downward on foes without touching ground ---------- */
  function airHit(Gm) {
    const pl = Gm.player; if (!Gm._melee || pl.atkDir !== 'd') return;
    const s = ext(); Gm.air++; s.air = Math.max(s.air, Gm.air);
    if (Gm.air < 2) return;
    const n = Gm.air; Gm.addFlare(n * 2);
    Gm.floatText(pl.cx, pl.y - 10, 'AIR x' + n, n >= 5 ? '#ff9a3c' : '#7ad8ff', n >= 4);
    if (n >= 3) for (let k = 0, m = Math.min(4, n - 2); k < m; k++) Gm.drops.push({ x: pl.cx, y: pl.cy, w: 4, h: 4, vx: LF.rand(-50, 50), vy: LF.rand(-130, -70), v: 1, life: 28, ghost: 1 });
    Gm.checkBounties();
  }
  const hurtO = LF.hurtEnemy;
  LF.hurtEnemy = function (e, dmg, dir, Gm) { const r = hurtO.call(this, e, dmg, dir, Gm); airHit(Gm); return r; };
  const bossO = LF.Bosses.hurt;
  LF.Bosses.hurt = function (b, dmg, dir, Gm) { const r = bossO.call(this, b, dmg, dir, Gm); airHit(Gm); return r; };
  const PH = LF.Player.prototype.hurt;
  LF.Player.prototype.hurt = function (Gm) { const r = PH.apply(this, arguments); if (r) Gm.air = 0; return r; };

  /* ---------- kills leave rising soul wisps ---------- */
  const killO = G.killEnemy;
  G.killEnemy = function (e) {
    killO.call(this, e);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, col = e.affix && LF.ELITE[e.affix] ? LF.ELITE[e.affix][1] : '#c8fff0';
    for (let k = 0; k < (e.affix ? 5 : 3); k++) this.particles.push({ x: cx + LF.rand(-4, 4), y: cy + LF.rand(-3, 3), vx: LF.rand(-9, 9), vy: -LF.rand(20, 36), life: 1.3, max: 1.5, col, sz: 1, g: -14, glow: 1 });
  };
  const respawnO = G.respawn; G.respawn = function () { this.phoenixUsed = false; return respawnO.apply(this, arguments); };
  const loadO = G.loadRoom; G.loadRoom = function () { const r = loadO.apply(this, arguments); this.air = 0; this.grazeSet = null; return r; };

  /* ---------- bounties, stats, help ---------- */
  LF.BOUNTIES.push(
    { id: 'graze', name: 'Needle Thread', desc: 'Graze 15 foes or shots by dashing through them.', test: s => [(s.ext || {}).graze || 0, 15], reward: 'embers:130', rtxt: '130 embers' },
    { id: 'air', name: 'Sky Dancer', desc: 'String together an x5 Air Chain.', test: s => [(s.ext || {}).air || 0, 5], reward: 'embers:140', rtxt: '140 embers' }
  );
  const statsO = UI.tab_stats;
  UI.tab_stats = function (body) {
    const r = statsO.apply(this, arguments), s = G.save.ext || {}, col = body.querySelector('.col');
    if (col) col.insertAdjacentHTML('beforeend', [['Grazes', s.graze || 0], ['Best air chain', s.air || 0], ['Best kill chain', s.chain || 0], ['Perfect and normal deflects', s.parries || 0]].map(x => '<div class="stat"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join(''));
    return r;
  };
  const helpO = UI.helpHTML;
  UI.helpHTML = function () {
    const h = helpO.apply(this, arguments), tip = '<div class="entry"><b>Graze:</b> dash through a foe or a shot to feed the Flare and earn an ember. <b>Air Chain:</b> keep pogoing off foes without landing for bonus Flare and embers.</div>';
    const i = h.lastIndexOf('</div></div>');
    return i < 0 ? h : h.slice(0, i) + tip + h.slice(i);
  };
})();
