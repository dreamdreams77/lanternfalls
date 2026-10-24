/* Lanternfall - more depth: Frenzied elites that enrage, Needle Wick and Skyfire charms, new bounties */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, S = LF.Sprites;
  const ext = () => { const e = G.save.ext = G.save.ext || {}; e.frenzy = e.frenzy || 0; return e; };

  /* ---------- icons and charms ---------- */
  S.ICONS.needle = ['........', '.....w..', '....wy..', '...wy...', '..wy.b..', '.wy.bb..', 'wy.bb...', '.y.b....'];
  S.ICONS.skyfire = ['...y....', '..yYy...', '.yYwYy..', '..yYy.b.', '.b.y.bb.', 'bb...b..', '.b......', '........'];
  LF.CHARMS.needle = { name: 'Needle Wick', icon: 'needle', desc: 'Grazes give double Flare, and dashes leave a moment of safety.' };
  LF.CHARMS.skyfire = { name: 'Skyfire', icon: 'skyfire', desc: 'Air Chains pay double Flare and extra embers.' };

  /* ---------- Frenzied: some Swift elites become Frenzied, tougher and enraging at half health ---------- */
  LF.ELITE.frenzied = ['Frenzied', '#ff7a3a', 'Enrages at half health and charges much faster. Finish it quickly.'];
  const mkO = LF.makeEnemy;
  LF.makeEnemy = function (type, tx, ty, Gm, idx) {
    const e = mkO.apply(this, arguments);
    if (e.affix === 'swift' && typeof idx === 'number' && (idx + (Gm.room ? Gm.room.id.length : 0)) % 2 === 0) {
      e.affix = 'frenzied'; e.d = Object.assign({}, e.d, { spd: e.d.spd / 1.6 }); e.maxHp = e.hp = e.hp + 2; e.em = Math.round(e.em / 1.5 * 2.5);
    }
    return e;
  };
  const killO = G.killEnemy;
  G.killEnemy = function (e) { killO.call(this, e); if (e.affix === 'frenzied') { ext().frenzy++; this.checkBounties(); } };

  const simO = G.simulate;
  G.simulate = function (dt) {
    const stop = this.hitstopT > 0;
    simO.call(this, dt);
    if (stop || this.state !== 'play') return;
    const pl = this.player;
    for (const e of this.enemies) {
      if (e.affix !== 'frenzied' || e.rage || e.dead || e.hp > e.maxHp / 2) continue;
      e.rage = 1; e.d = Object.assign({}, e.d, { spd: e.d.spd * 1.9 }); e.flash = .2;
      this.floatText(e.x + e.w / 2, e.y - 6, 'ENRAGED', '#ff7a3a', true); this.burst(e.x + e.w / 2, e.y + e.h / 2, 14, '#ff7a3a', 100, 1); this.ring(e.x + e.w / 2, e.y + e.h / 2, '#ff7a3a', 20); this.sfx('boss');
    }
    if (pl.dashT > 0 && pl.hasCharm('needle')) pl.invul = Math.max(pl.invul, .12);
  };

  /* ---------- bounties ---------- */
  LF.BOUNTIES.push(
    { id: 'frenzy', name: 'Calm the Storm', desc: 'Defeat 3 Frenzied elites.', test: s => [(s.ext || {}).frenzy || 0, 3], reward: 'charm:skyfire', rtxt: 'Skyfire charm' },
    { id: 'graze40', name: 'Eye of the Needle', desc: 'Graze 40 foes or shots.', test: s => [(s.ext || {}).graze || 0, 40], reward: 'charm:needle', rtxt: 'Needle Wick charm' },
    { id: 'air8', name: 'Cloud Walker', desc: 'String together an x8 Air Chain.', test: s => [(s.ext || {}).air || 0, 8], reward: 'embers:200', rtxt: '200 embers' }
  );
})();
