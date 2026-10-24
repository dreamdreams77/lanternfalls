/* Lanternfall - gameplay depth: Flare gauge, combos and chains, elite foes, deflecting, new charms, bounties, bestiary */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, W = LF.W, H = LF.H, In = LF.input, cl = LF.clamp;
  Object.assign(G, { flare: 0, chain: 0, chainT: 0, combo: 0, comboT: 0, bolts: [], texts: [], flareRing: null, phoenixUsed: false, _melee: false });

  G.floatText = function (x, y, s, col, big) {
    if (this.texts.length > 28) this.texts.shift();
    this.texts.push({ x, y, s, col: col || '#fff2c9', t: 0, max: big ? 1.3 : .85, big: !!big });
  };
  G.addFlare = function (n) {
    const pl = this.player; if (!pl) return;
    this.flare = Math.min(100, this.flare + n * (pl.hasCharm('siphon') ? 1.5 : 1) * (1 + .25 * ((this.save.up || {}).fgain || 0)));
  };
  const ensureSave = s => { s.bestiary = s.bestiary || {}; s.bounties = s.bounties || {}; s.ext = Object.assign({ elites: 0, parries: 0, flares: 0, chain: 0, finish: 0, guard: 0, night: 0 }, s.ext || {}); s.up = Object.assign({ fcost: 0, fgain: 0 }, s.up || {}); };
  G.flareCost = function () { return 50 - 8 * ((this.save.up || {}).fcost || 0); };

  /* ---------- bounties ---------- */
  G.checkBounties = function () {
    const s = this.save; if (!s) return; ensureSave(s);
    for (const b of LF.BOUNTIES) {
      if (s.bounties[b.id]) continue;
      const r = b.test(s); if (r[0] < r[1]) continue;
      s.bounties[b.id] = 1; this.toast('Bounty complete: ' + b.name);
      let rw = b.reward; if (rw === 'slot' && s.slots >= 4) rw = 'embers:150';
      this.give(rw); LF.Save.write(s);
    }
  };

  /* ---------- hit handling: combo finisher, flare gain, damage numbers ---------- */
  function onHit(e, dmg, boss) {
    const melee = G._melee, s = G.save; ensureSave(s);
    if (melee) {
      G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 1.1;
      if (G.combo % 3 === 0) {
        dmg += 1; s.ext.finish++; G.hitstop(.07); G.shake(3); G.sfx('crack');
        G.floatText(e.x + e.w / 2, e.y - 6, 'FINISH', '#ff9a3c', true); G.burst(e.x + e.w / 2, e.y + e.h / 2, 10, '#ff9a3c', 110, 1);
      }
      G.addFlare(boss ? 5 : 7);
    }
    return dmg;
  }
  const hurtEnemyO = LF.hurtEnemy;
  LF.hurtEnemy = function (e, dmg, dir, Gm) {
    if (e.affix === 'shielded' && Gm._melee) {
      const pl = Gm.player, side = pl.cx > e.x + e.w / 2 ? 1 : -1;
      if (pl.atkDir === 'f' && e.face === side) { Gm.sfx('hit'); Gm.shake(1); pl.vx -= pl.face * 70; Gm.floatText(e.x + e.w / 2, e.y - 4, 'BLOCKED', '#b0c0ff'); Gm.burst(e.x + (side > 0 ? e.w : 0), e.y + e.h / 2, 8, '#b0c0ff', 90, 1); Gm.ring(e.x + e.w / 2 + side * 6, e.y + e.h / 2, '#b0c0ff', 12); return false; }
    }
    dmg = onHit(e, dmg, false);
    const killed = hurtEnemyO.call(this, e, dmg, dir, Gm);
    if (dmg >= 2 && !killed) Gm.floatText(e.x + e.w / 2, e.y - 2, String(dmg), '#fff2c9');
    return killed;
  };
  const bossHurtO = LF.Bosses.hurt;
  LF.Bosses.hurt = function (b, dmg, dir, Gm) {
    dmg = onHit(b, dmg, true);
    const r = bossHurtO.call(this, b, dmg, dir, Gm);
    if (dmg >= 2) Gm.floatText(b.x + b.w / 2, b.y - 4, String(dmg), '#ffe2a0');
    return r;
  };

  /* ---------- kills: bestiary, chain, elite effects ---------- */
  const killO = G.killEnemy;
  G.killEnemy = function (e) {
    killO.call(this, e);
    const s = this.save; ensureSave(s); const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.night) s.ext.night++;
    if (e.type) {
      if (!s.bestiary[e.type]) { const b = LF.BEAST[e.type]; if (b) this.toast('Bestiary: ' + b[0]); }
      s.bestiary[e.type] = (s.bestiary[e.type] || 0) + 1;
    }
    this.chain = this.chainT > 0 ? this.chain + 1 : 1; this.chainT = 3.2; s.ext.chain = Math.max(s.ext.chain, this.chain);
    if (this.chain >= 2) this.floatText(cx, cy - 10, 'x' + this.chain + ' CHAIN', this.chain >= 5 ? '#ff9a3c' : '#ffd27a', this.chain >= 4);
    if (this.chain >= 3) { const n = Math.min(6, this.chain - 1); for (let k = 0; k < n; k++) this.drops.push({ x: cx, y: cy, w: 4, h: 4, vx: LF.rand(-70, 70), vy: LF.rand(-150, -70), v: 1, life: 28, ghost: 1 }); }
    this.addFlare(6);
    if (e.affix) {
      s.ext.elites++; if (e.affix === 'shielded') s.ext.guard++;
      if (e.affix === 'volatile') {
        this.sfx('boom'); this.shake(4);
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + .3; this.projectiles.push({ x: cx - 2, y: cy - 2, w: 4, h: 4, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, life: 1.1, dmg: 1, col: '#ff6f7d', glow: '#ff3050', grav: 0 }); }
      } else if (e.affix === 'gilded') this.burst(cx, cy, 24, '#ffd27a', 120, 1);
      this.floatText(cx, cy - 18, LF.ELITE[e.affix][0] + ' down', LF.ELITE[e.affix][1], true);
    }
    this.checkBounties();
  };

  /* ---------- elite foes: deterministic per spawn, with affixes ---------- */
  const mkO = LF.makeEnemy;
  LF.makeEnemy = function (type, tx, ty, Gm, idx) {
    const e = mkO.apply(this, arguments);
    if (typeof idx === 'string' || !Gm.room || Gm.room.id === 'trial') return e;
    let h = 2166136261; const k = Gm.room.id + '#' + idx + ':' + Gm.save.ng;
    for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
    const r = (h >>> 0) / 4294967296; if (r > (Gm.room.bonus ? .42 : Gm.save.ng ? .3 : .2)) return e;
    const pool = e.d.fly || e.d.still ? ['gilded', 'volatile'] : ['gilded', 'volatile', 'swift', 'shielded'];
    const a = pool[Math.floor(((h >>> 8) & 255) / 256 * pool.length)];
    e.affix = a;
    if (a === 'gilded') { e.maxHp = e.hp = Math.ceil(e.hp * 2); e.em = Math.round(e.em * 3); }
    else if (a === 'volatile') { e.maxHp = e.hp = e.hp + 1; e.em = Math.round(e.em * 1.5); }
    else if (a === 'shielded') { e.maxHp = e.hp = e.hp + 1; e.em = Math.round(e.em * 2); }
    else { e.d = Object.assign({}, e.d, { spd: e.d.spd * 1.6 }); e.em = Math.round(e.em * 1.5); }
    return e;
  };

  /* ---------- player hooks: phoenix ash, moth ward ---------- */
  const PP = LF.Player.prototype, hurtP = PP.hurt;
  PP.hurt = function (Gm, dmg, srcX) {
    if (this.invul > 0 || this.dead) return false;
    const s = Gm.save;
    if (this.hasCharm('phoenix') && !Gm.phoenixUsed && s.hp - dmg <= 0) {
      Gm.phoenixUsed = true; dmg = Math.max(0, s.hp - 1);
      Gm.toast('Phoenix Ash saved you!'); Gm.burst(this.cx, this.cy, 40, '#ff9a3c', 150, 1); Gm.flashScreen('#ff9a3c', .5); Gm.sfx('ability');
    }
    const r = hurtP.call(this, Gm, dmg, srcX);
    if (r && this.hasCharm('ward')) this.invul += .7;
    return r;
  };
  const cpO = G.checkpoint; G.checkpoint = function (it) { this.phoenixUsed = false; return cpO.call(this, it); };
  const startO = G.start; G.start = function (s) { ensureSave(s); this.flare = 0; this.chain = this.combo = 0; this.phoenixUsed = false; return startO.call(this, s); };
  const loadO = G.loadRoom; G.loadRoom = function () { const r = loadO.apply(this, arguments); this.bolts = []; this.texts = []; this.flareRing = null; return r; };

  /* ---------- deflect, echo flame (hooked into the combat step) ---------- */
  const combatO = G.combat;
  G.combat = function () {
    const pl = this.player, hb = pl.hitbox(), s = this.save; ensureSave(s);
    if (hb && pl.hitSet) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i]; if (p.harmless || !LF.overlap(hb, { x: p.x, y: p.y, w: p.w, h: p.h })) continue;
        const perfect = LF.dist(p.x, p.y, pl.cx, pl.cy) < 17;
        this.projectiles.splice(i, 1);
        let tgt = null, bd = 220; for (const e of this.enemies) { if (e.dead || (e.kind === 'boss' && !e.active)) continue; const d = LF.dist(p.x, p.y, e.x + e.w / 2, e.y + e.h / 2); if (d < bd) { bd = d; tgt = e; } }
        let vx = -p.vx * 1.5, vy = -p.vy * 1.5;
        if (tgt) { const a = Math.atan2(tgt.y + tgt.h / 2 - p.y, tgt.x + tgt.w / 2 - p.x); vx = Math.cos(a) * 180; vy = Math.sin(a) * 180; }
        this.bolts.push({ x: p.x, y: p.y, w: 5, h: 5, vx, vy, life: 1.6, dmg: perfect ? 4 : 2, col: p.glow || p.col || '#ff8aa8', perfect });
        s.ext.parries++; this.hitstop(perfect ? .09 : .04); this.shake(perfect ? 4 : 2); this.sfx(perfect ? 'ability' : 'hit');
        this.floatText(p.x, p.y - 8, perfect ? 'PERFECT' : 'DEFLECT', perfect ? '#ffe2a0' : '#7ad8ff', perfect);
        this.burst(p.x, p.y, perfect ? 16 : 8, '#fff2c9', 90, 1); this.addFlare(perfect ? 10 : 4); this.checkBounties();
      }
      if (pl.hasCharm('echo') && pl.atkDir === 'f' && !pl._echo) {
        pl._echo = true; this.bolts.push({ x: pl.cx + pl.face * 12, y: pl.cy - 2, w: 5, h: 4, vx: pl.face * 210, vy: 0, life: .42, dmg: 1, col: '#ffc15a', echo: true });
      }
    }
    this._melee = true; try { combatO.call(this); } finally { this._melee = false; }
  };

  /* ---------- Flare special ---------- */
  G.doFlare = function () {
    const pl = this.player, s = this.save;
    const cost = this.flareCost();
    if (this.flare < cost) { this.sfx('back'); this.floatText(pl.cx, pl.y - 8, 'Flare ' + Math.floor(this.flare) + '/' + cost, '#8a7aa8'); return; }
    const full = this.flare >= 99.5; this.flare -= full ? 100 : cost; if (this.flare < 0) this.flare = 0;
    ensureSave(s); s.ext.flares++;
    const R = full ? 96 : 66, dmg = 2 + s.dmgLvl + (full ? 1 : 0), cx = pl.cx, cy = pl.cy;
    for (const e of this.enemies.slice()) {
      if (e.dead || (e.kind === 'boss' && !e.active)) continue;
      if (LF.dist(cx, cy, e.x + e.w / 2, e.y + e.h / 2) < R + e.w / 2) { const dir = e.x + e.w / 2 > cx ? 1 : -1; if (e.kind === 'boss') LF.Bosses.hurt(e, dmg, dir, this); else LF.hurtEnemy(e, dmg, dir, this); }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) { const p = this.projectiles[i]; if (!p.harmless && LF.dist(cx, cy, p.x, p.y) < R) { this.projectiles.splice(i, 1); this.burst(p.x, p.y, 5, p.col || '#fff', 60, 1); } }
    pl.invul = Math.max(pl.invul, .6);
    if (full && s.hp < s.maxHp) { s.hp++; this.burst(cx, cy, 14, '#ff8aa8', 70, 1); }
    this.sfx('boom'); this.shake(6); this.hitstop(.08); this.flashScreen('#ffd27a', .3);
    for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, sp = R * 2.6; this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .42, max: .5, col: k % 2 ? '#ffd27a' : '#ff8a3d', sz: 2, g: 0, glow: 1 }); }
    this.flareRing = { x: cx, y: cy, t: 0, r: R };
    this.floatText(cx, pl.y - 10, full ? 'OVERFLARE' : 'FLARE', '#ffd27a', true);
    this.checkBounties();
  };

  /* ---------- simulation wrapper ---------- */
  const simO = G.simulate;
  G.simulate = function (dt) {
    const stop = this.hitstopT > 0, pl = this.player;
    if (!stop && !pl.dead && In.hit('flare')) this.doFlare();
    simO.call(this, dt);
    if (stop) return;
    if (pl.atkT <= 0) pl._echo = false;
    this.chainT = Math.max(0, this.chainT - dt); if (!this.chainT) this.chain = 0;
    this.comboT = Math.max(0, this.comboT - dt); if (!this.comboT) this.combo = 0;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; let dead = b.life <= 0;
      if (!dead && LF.Phys.solid(this.tile(Math.floor((b.x + b.w / 2) / T), Math.floor((b.y + b.h / 2) / T)))) { dead = true; this.burst(b.x, b.y, 4, b.col, 40, 1); }
      if (!dead) for (const e of this.enemies.slice()) {
        if (e.dead || (e.kind === 'boss' && !e.active)) continue;
        if (LF.overlap({ x: b.x, y: b.y, w: b.w, h: b.h }, e)) {
          const dir = b.vx >= 0 ? 1 : -1; if (e.kind === 'boss') LF.Bosses.hurt(e, b.dmg, dir, this); else LF.hurtEnemy(e, b.dmg, dir, this);
          this.burst(b.x, b.y, b.perfect ? 14 : 6, b.col, 90, 1); dead = true; break;
        }
      }
      if (dead) this.bolts.splice(i, 1);
      else if (Math.random() < .5) this.particles.push({ x: b.x + 2, y: b.y + 2, vx: LF.rand(-8, 8), vy: LF.rand(-8, 8), life: .25, max: .3, col: b.col, sz: 1, g: 0, glow: 1 });
    }
  };
  const updO = G.update;
  G.update = function (dt) {
    updO.call(this, dt);
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; if (t.t > t.max) this.texts.splice(i, 1); }
    if (this.flareRing) { this.flareRing.t += dt; if (this.flareRing.t > .5) this.flareRing = null; }
  };

  /* ---------- Bounties + Bestiary tab ---------- */
  const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  LF.UI.tab_bounty = function (body) {
    const s = G.save; ensureSave(s); body.append(el('h2', '', 'Bounties'));
    const list = el('div'); list.style.cssText = 'max-height:calc(var(--u)*16);overflow:auto;padding-right:6px';
    for (const b of LF.BOUNTIES) {
      const [p, g] = b.test(s), done = !!s.bounties[b.id], pct = Math.min(100, Math.round(p / g * 100));
      list.append(el('div', 'entry', '<b>' + b.name + (done ? ' <span style="color:#7dffb0">- claimed</span>' : '') + '</b><br>' + b.desc + ' <span style="color:#ffd27a">Reward: ' + b.rtxt + '</span>' +
        '<div style="height:4px;background:#2a1f4a;margin-top:4px;border-radius:2px"><div style="height:4px;width:' + pct + '%;background:' + (done ? '#7dffb0' : '#ffb23a') + ';border-radius:2px"></div></div><small>' + Math.min(p, g) + ' / ' + g + '</small>'));
    }
    list.append(el('h3', '', 'Bestiary'));
    for (const k of Object.keys(LF.BEAST)) {
      const n = s.bestiary[k] || 0, b = LF.BEAST[k];
      list.append(el('div', 'entry' + (n ? '' : ' unk'), n ? '<b>' + b[0] + '</b> <small>(defeated ' + n + ')</small><br>' + b[1] : '<b>???</b><br>Not yet encountered.'));
    }
    list.append(el('h3', '', 'Elite Affixes'));
    for (const k of Object.keys(LF.ELITE)) { const a = LF.ELITE[k]; list.append(el('div', 'entry', '<b style="color:' + a[1] + '">' + a[0] + '</b><br>' + a[2])); }
    body.append(list); return [];
  };
})();
