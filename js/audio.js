/* Lanternfall - procedural chiptune music, ambience and sound effects (WebAudio, no assets) */
(function () {
  'use strict';
  const LF = window.LF;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---- track definitions: generated procedurally with a seeded RNG so each area has a stable theme ---- */
  const MIN = [0, 2, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], PEN = [0, 2, 4, 7, 9];
  const TRACKS = {
    title:   { bpm: 74, root: 50, scale: DOR, prog: [[0, 'm'], [5, 'M'], [3, 'M'], [4, 'm'], [0, 'm'], [5, 'M'], [6, 'M'], [4, 'm']], lead: 'triangle', arp: 'square', bass: 'triangle', dens: .35, seed: 11, drums: 0, echo: .5 },
    mossroot:{ bpm: 96, root: 55, scale: MAJ, prog: [[0, 'M'], [5, 'm'], [3, 'M'], [4, 'M'], [0, 'M'], [2, 'm'], [3, 'M'], [4, 'M']], lead: 'square', arp: 'triangle', bass: 'triangle', dens: .5, seed: 23, drums: 1, echo: .3 },
    glimmer: { bpm: 84, root: 52, scale: MIN, prog: [[0, 'm'], [5, 'M'], [2, 'M'], [6, 'M'], [0, 'm'], [3, 'm'], [5, 'M'], [4, 'm']], lead: 'sine', arp: 'sine', bass: 'triangle', dens: .42, seed: 37, drums: 0, echo: .65, arpHi: 1 },
    drowned: { bpm: 66, root: 49, scale: MIN, prog: [[0, 'm'], [3, 'm'], [5, 'M'], [4, 'm'], [0, 'm'], [6, 'M'], [5, 'M'], [4, 'm']], lead: 'triangle', arp: 'sine', bass: 'sine', dens: .3, seed: 41, drums: 0, echo: .75 },
    spire:   { bpm: 112, root: 57, scale: MIN, prog: [[0, 'm'], [5, 'M'], [6, 'M'], [4, 'm'], [0, 'm'], [3, 'm'], [6, 'M'], [4, 'M']], lead: 'square', arp: 'square', bass: 'square', dens: .55, seed: 53, drums: 2, echo: .35 },
    boss:    { bpm: 144, root: 50, scale: MIN, prog: [[0, 'm'], [0, 'm'], [5, 'M'], [4, 'm'], [0, 'm'], [6, 'M'], [5, 'M'], [4, 'M']], lead: 'square', arp: 'square', bass: 'square', dens: .7, seed: 67, drums: 3, echo: .25 },
    ending:  { bpm: 72, root: 53, scale: MAJ, prog: [[0, 'M'], [4, 'M'], [5, 'm'], [3, 'M'], [0, 'M'], [4, 'M'], [3, 'M'], [0, 'M']], lead: 'triangle', arp: 'sine', bass: 'triangle', dens: .4, seed: 79, drums: 0, echo: .6 }
  };
  const CH = { M: [0, 4, 7], m: [0, 3, 7] };

  function build(def) {
    const r = LF.rng(def.seed), bars = def.prog.length, steps = bars * 16;
    const t = { bass: new Array(steps).fill(null), arp: new Array(steps).fill(null), lead: new Array(steps).fill(null), len: steps };
    const deg = d => { const n = def.scale.length; const o = Math.floor(d / n); return def.root + def.scale[((d % n) + n) % n] + 12 * o; };
    const motif = [];
    for (let i = 0; i < 2; i++) { // two 2-bar motifs, reused with variation
      const m = []; let d = 7 + Math.floor(r() * 3);
      for (let s = 0; s < 32; s += 2) {
        if (r() < def.dens && (s % 8 === 0 || r() < .7)) { d += Math.floor(r() * 5) - 2; d = LF.clamp(d, 5, 13); m.push([s, d, 2 + Math.floor(r() * 3) * 2]); }
      }
      motif.push(m);
    }
    for (let b = 0; b < bars; b++) {
      const [dg, q] = def.prog[b], rootN = deg(dg) - 12, ch = CH[q];
      // bass: root/fifth pattern
      const bp = def.drums >= 2 ? [0, 2, 4, 6, 8, 10, 12, 14] : def.drums === 1 ? [0, 6, 8, 14] : [0, 8];
      bp.forEach((s, i) => { t.bass[b * 16 + s] = rootN + (i % 4 === 3 ? 7 : 0) - (rootN > def.root + 3 ? 12 : 0); });
      // arpeggio
      const step = def.arpHi ? 2 : 4;
      for (let s = 0; s < 16; s += step) {
        const k = (s / step) % 4, tone = [0, 1, 2, 1][k];
        t.arp[b * 16 + s] = rootN + 12 + ch[tone] + (def.arpHi ? 12 : 0);
      }
      // lead from motif
      const m = motif[Math.floor(b / 2) % 2 === 0 ? 0 : (b % 4 < 2 ? 1 : 0)], base = (b % 2) * 16;
      m.forEach(([s, d, len]) => { if (s >= base && s < base + 16) t.lead[b * 16 + (s - base)] = [deg(d + dg * (b % 4 === 3 ? 1 : 0)), len]; });
      if (b % 4 === 3) t.lead[b * 16 + 12] = null;
    }
    return t;
  }

  const A = LF.Audio = {
    ctx: null, ready: false, cur: null, tracks: {}, step: 0, next: 0, ambLayers: {}, lastStep: 0,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      try {
        const c = this.ctx = new C();
        this.master = c.createGain(); this.master.connect(c.destination);
        const comp = c.createDynamicsCompressor(); comp.connect(this.master); this.bus = comp;
        this.musicG = c.createGain(); this.sfxG = c.createGain(); this.ambG = c.createGain();
        [this.musicG, this.sfxG, this.ambG].forEach(g => g.connect(comp));
        // echo send
        this.echo = c.createDelay(1); this.echo.delayTime.value = .31;
        const fb = c.createGain(); fb.gain.value = .38; const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2600;
        this.echoIn = c.createGain(); this.echoIn.gain.value = 1;
        this.echoIn.connect(this.echo); this.echo.connect(ef); ef.connect(fb); fb.connect(this.echo); ef.connect(this.musicG);
        // noise buffer
        const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        let b0 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .98 * b0 + .02 * w; d[i] = w * .6 + b0 * 6; }
        this.noiseBuf = buf;
        this.makeAmbience();
        this.ready = true; this.applyVolumes();
        this.timer = setInterval(() => this.tick(), 35);
        document.addEventListener('visibilitychange', () => {
          if (!this.ctx) return;
          if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
        });
        if (this.pendingTrack) this.playMusic(this.pendingTrack);
        if (this.pendingAmb) this.setAmbience(this.pendingAmb);
      } catch (e) { console.warn('audio init failed', e); this.ctx = null; }
    },
    applyVolumes() {
      if (!this.ready) return;
      const s = LF.settings, t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.mute ? 0 : 0.9, t, .05);
      this.musicG.gain.setTargetAtTime(s.music * .55, t, .05);
      this.sfxG.gain.setTargetAtTime(s.sfx * .9, t, .05);
      this.ambG.gain.setTargetAtTime(s.amb * .6, t, .05);
    },
    /* ---------- primitives ---------- */
    tone(type, f0, f1, dur, vol, delay, dest, echo) {
      if (!this.ready) return;
      const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + .006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.sfxG); if (echo) { const e = c.createGain(); e.gain.value = echo; g.connect(e); e.connect(this.echoIn); }
      o.start(t); o.stop(t + dur + .02);
    },
    noise(dur, vol, ftype, f0, f1, delay, dest, q) {
      if (!this.ready) return;
      const c = this.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      s.buffer = this.noiseBuf; s.loop = true; f.type = ftype || 'lowpass'; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0 || 1000, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest || this.sfxG); s.start(t, Math.random()); s.stop(t + dur + .02);
    },
    /* ---------- sound effects ---------- */
    sfx(n, p) {
      if (!this.ready || LF.settings.mute) return;
      const now = performance.now(); this.sfxT = this.sfxT || {};
      if (this.sfxT[n] && now - this.sfxT[n] < (n === 'step' ? 90 : 35)) return; this.sfxT[n] = now;
      const T = (a, b, c, d, e, f) => this.tone(a, b, c, d, e, f), N = (a, b, c, d, e, f) => this.noise(a, b, c, d, e, f);
      switch (n) {
        case 'jump': T('square', 240, 520, .13, .09); break;
        case 'djump': T('square', 380, 860, .15, .09); T('triangle', 760, 1500, .12, .06, .03); break;
        case 'land': N(.09, .25, 'lowpass', 500, 120); break;
        case 'step': N(.035, .06, 'bandpass', 700 + Math.random() * 300, 400); break;
        case 'attack': N(.13, .17, 'bandpass', 1000, 3400, 0, null, 2); T('triangle', 700, 330, .12, .07); break;
        case 'hit': N(.1, .3, 'lowpass', 2400, 300); T('square', 190, 60, .12, .12); break;
        case 'kill': N(.2, .25, 'lowpass', 1800, 200); [660, 495, 330].forEach((f, i) => T('square', f, f * .8, .08, .07, i * .05)); break;
        case 'hurt': T('sawtooth', 340, 70, .3, .13); N(.2, .2, 'lowpass', 900, 150); break;
        case 'ember': T('square', 988, 988, .05, .06); T('square', 1480, 1480, .09, .06, .045); break;
        case 'heart': [523, 659, 784, 1047].forEach((f, i) => T('triangle', f, f, .22, .12, i * .08)); break;
        case 'ability': [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { T('square', f, f, .3, .07, i * .09); T('triangle', f / 2, f / 2, .3, .08, i * .09); }); break;
        case 'dash': N(.18, .3, 'highpass', 600, 3000); T('square', 300, 150, .12, .05); break;
        case 'door': T('triangle', 220, 110, .25, .12); N(.2, .1, 'lowpass', 600, 200); break;
        case 'save': [880, 1320, 1760, 2217].forEach((f, i) => this.tone('sine', f, f, 1.2, .1, i * .12, null, .4)); break;
        case 'break': N(.35, .45, 'lowpass', 2500, 150); T('square', 140, 40, .25, .12); break;
        case 'crack': N(.12, .25, 'bandpass', 3000, 900, 0, null, 3); break;
        case 'ui': T('square', 660, 660, .04, .06); break;
        case 'ok': T('square', 880, 880, .05, .07); T('square', 1320, 1320, .08, .07, .05); break;
        case 'back': T('square', 520, 330, .09, .07); break;
        case 'boss': T('sawtooth', 110, 38, 1.2, .2); N(1, .35, 'lowpass', 900, 80); T('square', 70, 35, 1, .1, .1); break;
        case 'boom': N(.6, .6, 'lowpass', 400, 50); T('sine', 90, 28, .5, .3); break;
        case 'shoot': T('square', 520, 180, .12, .06); break;
        case 'lever': T('square', 180, 180, .06, .1); T('square', 120, 120, .1, .1, .07); break;
        case 'spring': T('sine', 200, 900, .2, .12); break;
        case 'splash': N(.2, .2, 'bandpass', 1500, 500, 0, null, .8); break;
        case 'lose': [440, 392, 330, 262, 196].forEach((f, i) => T('triangle', f, f * .97, .3, .14, i * .16)); break;
        case 'win': [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => { T('square', f, f, .35, .07, i * .12); T('triangle', f / 2, f / 2, .35, .1, i * .12); }); break;
        case 'moth': [1319, 1760, 2093].forEach((f, i) => this.tone('sine', f, f, .5, .1, i * .07, null, .5)); break;
        case 'gate': N(.5, .3, 'lowpass', 600, 100); T('triangle', 110, 70, .5, .15); break;
        case 'charm': [659, 880, 1109, 1319].forEach((f, i) => this.tone('triangle', f, f, .35, .1, i * .07, null, .3)); break;
        case 'talk': T('square', 300 + Math.random() * 200 * (p || 1), 0, .03, .035); break;
        case 'glow': T('sine', 1200, 1800, .25, .04); break;
      }
    },
    talk(ch, pitch) { this.tone('square', (pitch || 280) + ((ch.charCodeAt(0) * 7) % 140), 0, .035, .03); },
    /* ---------- music ---------- */
    playMusic(name) {
      if (!this.ready) { this.pendingTrack = name; return; }
      if (this.curName === name) return;
      this.curName = name; this.pendingTrack = name;
      const c = this.ctx, t = c.currentTime;
      if (this.tg) { const old = this.tg; old.gain.cancelScheduledValues(t); old.gain.setTargetAtTime(0, t, .5); setTimeout(() => { try { old.disconnect(); } catch (_) {} }, 2500); }
      if (!name) { this.cur = null; this.tg = null; return; }
      this.tracks[name] = this.tracks[name] || build(TRACKS[name]);
      this.cur = TRACKS[name]; this.pat = this.tracks[name];
      const g = this.tg = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.2); g.connect(this.musicG);
      this.step = 0; this.next = t + .1;
    },
    stopMusic() { this.playMusic(null); },
    tick() {
      if (!this.ready) return;
      const c = this.ctx;
      this.ambTick();
      if (!this.cur || document.hidden) return;
      const spb = 60 / this.cur.bpm / 4;
      if (this.next < c.currentTime - .5) this.next = c.currentTime + .05;
      while (this.next < c.currentTime + .14) {
        this.playStep(this.step % this.pat.len, this.next, spb);
        this.step++; this.next += spb;
      }
    },
    mt(type, f, t0, dur, vol, echo) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.tg); if (echo) { const e = c.createGain(); e.gain.value = echo; g.connect(e); e.connect(this.echoIn); }
      o.start(t0); o.stop(t0 + dur + .02);
    },
    mn(t0, dur, vol, ft, f0) {
      const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      s.buffer = this.noiseBuf; f.type = ft; f.frequency.value = f0;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.tg); s.start(t0, Math.random()); s.stop(t0 + dur + .02);
    },
    playStep(i, t0, spb) {
      const d = this.cur, p = this.pat, e = d.echo;
      const b = p.bass[i], a = p.arp[i], l = p.lead[i];
      if (b != null) this.mt(d.bass, mtof(b), t0, spb * (d.drums ? 1.6 : 7), .2);
      if (a != null) this.mt(d.arp, mtof(a), t0, spb * 2.4, d.arp === 'sine' ? .11 : .055, e * .7);
      if (l) this.mt(d.lead, mtof(l[0]), t0, spb * l[1] * .95, d.lead === 'square' ? .06 : .13, e);
      const s = i % 16;
      if (d.drums >= 1) {
        if (s % 4 === 0 && d.drums >= 2) { this.mt('sine', 120, t0, .1, .35); }
        if (d.drums === 1 && (s === 0 || s === 10)) this.mt('sine', 110, t0, .1, .3);
        if (s === 4 || s === 12) this.mn(t0, d.drums >= 3 ? .12 : .08, .13, 'bandpass', 1800);
        if (s % 2 === 0) this.mn(t0, .03, d.drums >= 2 ? .06 : .035, 'highpass', 7000);
        if (d.drums >= 3 && s % 4 === 2) this.mt('sine', 90, t0, .08, .22);
      }
    },
    /* ---------- ambience ---------- */
    makeAmbience() {
      const c = this.ctx, mk = (ft, f, q) => {
        const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
        s.buffer = this.noiseBuf; s.loop = true; fl.type = ft; fl.frequency.value = f; fl.Q.value = q || .7; g.gain.value = 0;
        s.connect(fl); fl.connect(g); g.connect(this.ambG); s.start(0, Math.random()); return { g, fl };
      };
      this.ambLayers.wind = mk('bandpass', 420, .6);
      this.ambLayers.rain = mk('highpass', 2400, .5);
      this.ambLayers.water = mk('lowpass', 500, 1);
      this.ambLayers.fire = mk('bandpass', 180, .5);
      const dg = c.createGain(); dg.gain.value = 0; dg.connect(this.ambG);
      [55, 82.6, 110.5].forEach((f, i) => { const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; const og = c.createGain(); og.gain.value = [.5, .3, .08][i]; o.connect(og); og.connect(dg); o.start(); });
      this.ambLayers.drone = { g: dg };
      this.amb = {}; this.ambNext = { drip: 0, chirp: 0, crack: 0 };
    },
    setAmbience(cfg) {
      if (!this.ready) { this.pendingAmb = cfg; return; }
      this.amb = cfg || {}; const t = this.ctx.currentTime, cap = { wind: .5, rain: .35, water: .5, fire: .4, drone: .22 };
      for (const k in this.ambLayers) this.ambLayers[k].g.gain.setTargetAtTime((this.amb[k] || 0) * cap[k], t, .8);
    },
    ambTick() {
      const c = this.ctx, t = c.currentTime, a = this.amb || {};
      if (this.ambLayers.wind) { // slow gusting
        const gust = .7 + .3 * Math.sin(t * .23) * Math.sin(t * .11 + 1);
        this.ambLayers.wind.fl.frequency.setTargetAtTime(300 + 350 * gust, t, .3);
      }
      if (a.drip && t > this.ambNext.drip) {
        this.ambNext.drip = t + .6 + Math.random() * (3.5 / a.drip);
        const f = 900 + Math.random() * 1400; this.tone('sine', f * 1.5, f, .18, .09 * a.drip, 0, this.ambG, .6);
      }
      if (a.chirp && t > this.ambNext.chirp) {
        this.ambNext.chirp = t + .4 + Math.random() * 2.2 / a.chirp;
        const f = 3800 + Math.random() * 600; for (let i = 0; i < 3; i++) this.tone('sine', f, f * 1.02, .04, .035 * a.chirp, i * .07, this.ambG);
      }
      if (a.crack && t > this.ambNext.crack) {
        this.ambNext.crack = t + .2 + Math.random() * 1.2; this.noise(.04, .1 * a.crack, 'bandpass', 1500 + Math.random() * 2500, 800, 0, this.ambG, 2);
      }
    }
  };
  LF.AUDIO_TRACKS = TRACKS;
})();
