/* Lanternfall - more depth: night wisps in Mossroot, NPC guidance for the new systems */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T;

  /* ---------- night wisps: after dusk the Hollow stirs ---------- */
  let nightT = 8, warned = false;
  const simO = G.simulate;
  G.simulate = function (dt) {
    simO.call(this, dt);
    if (this.hitstopT > 0 || this.state !== 'play') return;
    const r = this.room, pl = this.player;
    if (r.area !== 'moss' || this.boss || r.id === 'trial' || r.pz) return; // no wisps in the puzzle galleries: they would soak up puzzle shots
    const night = this.enemies.filter(e => e.night && !e.dead);
    if ((this.tod || 0) < .15) { for (const e of night) { this.burst(e.x + 5, e.y + 5, 8, '#9af0d8', 50, 0); this.enemies.splice(this.enemies.indexOf(e), 1); } return; }
    if ((this.tod || 0) < .35) return;
    nightT -= dt;
    if (nightT <= 0 && night.length < 2) {
      nightT = 11 + Math.random() * 6;
      const side = Math.random() < .5 ? -1 : 1, px = LF.clamp(pl.cx + side * LF.rand(130, 190), 20, r.w * T - 20), py = LF.clamp(pl.cy - LF.rand(10, 50), 20, r.h * T - 40);
      const e = this.spawnEnemy('wisp', px, py); e.night = true; e.em = 4; e.hx = px; e.hy = py;
      this.burst(px, py, 12, '#9af0d8', 60, 0);
      if (!warned) { warned = true; this.banner('Night wisps stir', 'Lost sparks drift in after dusk'); }
    }
  };

  /* ---------- NPCs explain the new systems once ---------- */
  const D = LF.DIALOG, wickO = D.wick, pipO = D.pip, marrowO = D.marrow;
  D.wick = function (G2) {
    const f = G2.save.flags;
    if (f.wick_met && !f.wick_flare) { f.wick_flare = 1; return { who: 'Wick', lines: ['Ah, ember! Your flame has more tricks than I taught you.', 'Every blow feeds your Flare. Press V once the gauge is half full, and light bursts from you.', 'Strike a shot out of the air and it turns on whoever threw it. Time it right, a perfect parry!', 'Foes that wear an aura are elites. Shielded ones block from the front: strike them from behind, above or below.'] }; }
    return wickO.call(this, G2);
  };
  D.pip = function (G2) {
    const f = G2.save.flags, r = pipO.call(this, G2);
    if (f.pip_met && !f.pip_bounty) { f.pip_bounty = 1; r.lines = ['Pip keeps a board of bounties, you know. Check the pause menu.', 'Finish one and the reward finds you. No paperwork. Pip hates paperwork.'].concat(r.lines); }
    return r;
  };
  D.marrow = function (G2) {
    const f = G2.save.flags, r = marrowO.call(this, G2);
    if (f.marrow_met && !f.marrow_night && (G2.save.ext || {}).night > 0) { f.marrow_night = 1; return { who: 'Marrow', lines: ['Mm. You met the night wisps.', 'They only come after dusk. Strike them quick; they are made of regret and embers.'] }; }
    return r;
  };
})();
