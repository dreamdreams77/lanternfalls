/* Lanternfall - audio pass 2: combat intensity layers, underwater and menu muffling, heartbeat, new stingers */
(function () {
  'use strict';
  const LF = window.LF, A = LF.Audio, G = LF.G;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  A.int = 0; A.intT = 0;

  /* a low-pass sits between music/ambience and the compressor: closing it muffles the world */
  const initO = A.init;
  A.init = function () {
    initO.apply(this, arguments);
    if (!this.ready || this.lp) return;
    try {
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = .6;
      this.musicG.disconnect(); this.ambG.disconnect(); this.musicG.connect(lp); this.ambG.connect(lp); lp.connect(this.bus); this.lp = lp;
    } catch (e) { console.warn('muffle unavailable', e); }
  };
  A.muffle = function (f) { if (this.lp) this.lp.frequency.setTargetAtTime(f, this.ctx.currentTime, .12); };

  /* extra layers fade in with the fight: a pulse, then hats and an octave shimmer */
  const psO = A.playStep;
  A.playStep = function (i, t0, spb) {
    psO.call(this, i, t0, spb);
    const k = this.int; if (k < .22) return;
    const d = this.cur, s = i % 16;
    if (d.drums < 2) { if (s % 8 === 0) this.mt('sine', 100, t0, .1, .2 * k); if (s === 4 || s === 12) this.mn(t0, .07, .09 * k, 'bandpass', 1600); }
    if (k > .55) {
      if (s % 2 === 0) this.mn(t0, .03, .05 * k, 'highpass', 7000);
      const a = this.pat.arp[i]; if (a != null) this.mt(d.arp, mtof(a + 12), t0, spb * 1.4, .035 * k, d.echo * .5);
    }
  };

  /* stingers and feedback sounds */
  const X = {
    perfect() { [1319, 1760, 2349].forEach((f, i) => this.tone('triangle', f, f, .35, .1, i * .05, null, .4)); this.noise(.15, .15, 'highpass', 3000, 6000); },
    heartbeat() { this.tone('sine', 62, 40, .14, .55); this.tone('sine', 58, 38, .16, .42, .2); },
    ambush() { this.tone('sawtooth', 90, 45, .9, .15); this.noise(.8, .25, 'lowpass', 700, 90); [220, 233].forEach(f => this.tone('square', f, f * .5, .6, .05, .1)); },
    clear() { [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, .2, .06, i * .07)); [262, 330, 392].forEach((f, i) => this.tone('triangle', f, f, .5, .1, i * .07)); },
    squash() { this.noise(.05, .12, 'lowpass', 900, 300); },
    curl() { this.tone('square', 600, 200, .12, .08); this.noise(.12, .15, 'bandpass', 2400, 900, 0, null, 3); },
    split() { this.tone('sine', 300, 700, .12, .1); this.tone('sine', 360, 820, .12, .08, .04); }
  };
  const sfxO = A.sfx;
  A.sfx = function (n, p) {
    const x = X[n]; if (!x) return sfxO.apply(this, arguments);
    if (!this.ready || LF.settings.mute) return;
    const now = performance.now(); this.sfxT = this.sfxT || {}; if (this.sfxT[n] && now - this.sfxT[n] < 40) return; this.sfxT[n] = now;
    x.call(this, p);
  };

  /* game hooks */
  const flO = G.floatText;
  G.floatText = function (x, y, s) { if (s === 'PERFECT') A.sfx('perfect'); return flO.apply(this, arguments); };
  let hb = 0, muf = 20000;
  const simO = G.simulate;
  G.simulate = function (dt) {
    simO.call(this, dt);
    if (this.hitstopT > 0 || this.state !== 'play') return;
    const pl = this.player, s = this.save;
    // intensity target: awake foes close by, bosses, and a running chain
    let tgt = 0; for (const e of this.enemies) { if (e.dead) continue; if (e.kind === 'boss') { if (e.active) tgt = 1; continue; } const d = Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y); if (d < 200) tgt += (1 - d / 200) * .3; }
    if (this.chain >= 3) tgt += .25; A.int += (Math.min(1, tgt) - A.int) * Math.min(1, dt * .9);
    if (s.hp <= 1 && s.maxHp > 1) { hb -= dt; if (hb <= 0) { hb = .85; A.sfx('heartbeat'); } } else hb = 0;
  };
  const updO = G.update;
  G.update = function (dt) {
    updO.call(this, dt);
    if (!A.lp) return;
    const t = LF.state === 'paused' ? 1100 : LF.state === 'dead' ? 500 : this.player && this.player.inWater && LF.state === 'play' ? 800 : 20000;
    if (t !== muf) { muf = t; A.muffle(t); }
  };
  const kO = G.killEnemy;
  G.killEnemy = function (e) { const r = kO.apply(this, arguments); if (e.type === 'slime' && !e.baby && this.room.id !== 'trial' && e.affix !== 'volatile') A.sfx('split'); return r; };
})();
