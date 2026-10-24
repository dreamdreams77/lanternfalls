/* Lanternfall - game core: state, room loading, effects, death/respawn, rewards */
(function () {
  'use strict';
  const LF = window.LF, T = LF.T, W = LF.W, H = LF.H, cl = LF.clamp;
  const G = LF.G = {
    state: 'boot', save: null, room: null, player: null, enemies: [], projectiles: [], particles: [], hazards: [], drops: [], items: [], ts: {}, motes: [],
    cam: { x: 0, y: 0 }, clock: 0, shakeV: 0, hitstopT: 0, flash: { c: '#fff', a: 0 }, fade: { a: 1, to: 0, sp: 2.5, cb: null }, lightR: 70, tod: 0, near: null, boss: null,
    deadT: 0, trans: false, doorCD: 0, safeT: 0, prevHp: 5, tipSeen: {}, tutT: 0, areaShown: '', bossLocked: false, trial: null, freeze: 0,

    setState(s) { this.state = s; LF.state = s; if (LF.refreshTouch) LF.refreshTouch(); },
    sfx(n, p) { LF.Audio.sfx(n, p); },
    toast(m) { if (LF.UI) LF.UI.toast(m); },
    banner(a, b) { if (LF.UI) LF.UI.banner(a, b); },
    tip(key) { // contextual tutorial tip, shown once per save
      const s = this.save; if (!s || s.seen['tip:' + key] || !LF.TIPS[key]) return; s.seen['tip:' + key] = 1;
      LF.UI.tip(LF.TIPS[key][LF.input.lastDevice === 'touch' ? 1 : 0]);
    },
    kindleCost() { return [25, 20, 15][this.save.flaskLvl] || 25; },
    canHeal() { return this.state === 'play' && !this.trans; },
    sigilCount() { const s = this.save.sigils; return (s.root ? 1 : 0) + (s.prism ? 1 : 0) + (s.tide ? 1 : 0); },

    /* ---------- effects ---------- */
    burst(x, y, n, col, spd, grav) {
      if (this.particles.length > 420) return;
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = spd * (.3 + Math.random() * .7); this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (grav ? 20 : 0), life: .35 + Math.random() * .4, max: .75, col, sz: Math.random() < .3 ? 2 : 1, g: grav ? 260 : 0 }); }
    },
    spark(x, y, col, vy) { this.particles.push({ x, y, vx: LF.rand(-6, 6), vy: vy == null ? -16 : vy, life: .6, max: .6, col, sz: 1, g: 0, glow: 1 }); },
    springTile(x, y) { const tx = Math.floor(x / T), ty = Math.floor((y + 1) / T); this.ts[tx + ',' + ty] = { t: .25 }; this.burst(x, y, 8, '#ffc15a', 70, 1); },
    shake(n) { if (LF.settings.shake) this.shakeV = Math.max(this.shakeV, n); },
    hitstop(s) { this.hitstopT = Math.max(this.hitstopT, s); },
    flashScreen(c, a) { if (LF.settings.reduce) a *= .3; this.flash = { c, a }; },
    fadeTo(to, sp, cb) { this.fade.to = to; this.fade.sp = sp || 3; this.fade.cb = cb || null; },

    /* ---------- tiles ---------- */
    tile(tx, ty) {
      const r = this.room;
      if (tx < 0 || tx >= r.w || ty < 0) return '#';
      if (ty >= r.h) return '#';
      return r.grid[ty][tx];
    },
    setTile(tx, ty, ch) { if (this.room.grid[ty] && this.room.grid[ty][tx] != null) this.room.grid[ty][tx] = ch; },
    rebake() { LF.Art.bakeRoom(this.room); },
    breakTile(tx, ty) {
      const ch = this.tile(tx, ty); if (ch !== 'D' && ch !== 'S') return;
      this.setTile(tx, ty, '.'); this.save.flags['b:' + this.room.id + ':' + tx + ':' + ty] = 1;
      this.sfx('break'); this.shake(4); this.burst(tx * T + 8, ty * T + 8, 16, LF.PAL[this.room.area].rock[2], 90, 1); this.burst(tx * T + 8, ty * T + 8, 6, '#ffd27a', 70, 1);
      this.rebake();
    },
    crumble(tx, ty) {
      const k = tx + ',' + ty; if (this.ts[k] && this.ts[k].gone != null) return;
      if (!this.ts[k]) { this.ts[k] = { t: .5, ch: 'c' }; this.sfx('crack'); }
    },
    openAll(ch, why) {
      let n = 0; const r = this.room;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.grid[y][x] === ch) { r.grid[y][x] = '.'; n++; this.burst(x * T + 8, y * T + 8, 6, '#c8b890', 50, 1); }
      if (n) { this.sfx('gate'); this.shake(3); }
      return n;
    },
    spawnEnemy(type, px, py) {
      const e = LF.makeEnemy(type, 0, 0, this, 'x' + Math.random()); e.x = px; e.y = py; e.hx = px; e.hy = py; e.ghost = 1; this.enemies.push(e); return e;
    },

    /* ---------- lifecycle ---------- */
    newGame() { const s = LF.newSave(); LF.Save.write(s); this.start(s); },
    continueGame() { const d = LF.Save.load(); if (d) this.start(d); },
    start(save) {
      this.save = save; this.player = new LF.Player(this); this.player.G = this;
      this.prevHp = save.hp = Math.max(1, Math.min(save.hp, save.maxHp)); if (save.hp < save.maxHp * .5) save.hp = save.maxHp;
      const cp = save.cp; this.areaShown = '';
      this.loadRoom(cp.room, null, { x: cp.px != null ? cp.px : cp.x * T, y: cp.py != null ? cp.py : cp.y * T });
      this.fade.a = 1; this.fadeTo(0, 2); this.setState('play'); this.tutT = 0; this.trans = false; this.deadT = 0;
      if (!save.flags.started) { save.flags.started = 1; }
    },
    loadRoom(id, doorName, spawn) {
      const def = LF.Rooms.list[id]; if (!def) { console.error('missing room', id); return; }
      const room = Object.assign({}, def, { grid: def.grid.map(r => r.slice()) }); this.room = room;
      const f = this.save.flags;
      for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) { const c = room.grid[y][x]; if ((c === 'S' || c === 'D') && f['b:' + id + ':' + x + ':' + y]) room.grid[y][x] = '.'; }
      if (f['lever:' + id] || f['gate:' + id]) { const ch = f['lever:' + id] ? 'g' : 'G'; for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) if (room.grid[y][x] === ch) room.grid[y][x] = '.'; }
      def.ents.forEach(e => { if (e.type === 'boss' && f['boss_' + e.id] && !e.replay) for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) if (room.grid[y][x] === 'g') room.grid[y][x] = '.'; });
      LF.Art.bakeRoom(room);
      this.enemies = []; this.projectiles = []; this.particles = []; this.hazards = []; this.drops = []; this.items = []; this.ts = {}; this.boss = null; this.bossLocked = false; this.trial = null; this.near = null;
      const s = this.save; s.seen['r:' + id] = 1;
      def.ents.forEach((e, i) => {
        const key = id + '#' + i;
        if (LF.ENEMY_TYPES[e.type]) { this.enemies.push(LF.makeEnemy(e.type, e.x, e.y, this, i)); return; }
        if (e.type === 'boss') { if (!f['boss_' + e.id] || e.replay) { const b = LF.Bosses.make(e.id, e.x, e.y, this); this.boss = b; this.enemies.push(b); } return; }
        if (e.type === 'moth' && s.moths.indexOf(e.id) >= 0) return;
        if (e.type === 'chest' && s.seen['c:' + key]) e = Object.assign({}, e, { open: true });
        if (e.type === 'frag' && f['frag:' + key]) return;
        if (e.type === 'altar' && s.abil[e.give.split(':')[1]]) e = Object.assign({}, e, { taken: true });
        if (e.type === 'lever') e = Object.assign({}, e, { on: !!f['lever:' + id] });
        if (e.type === 'lamp' && !f.boss_warden) e = Object.assign({}, e, { dark: true });
        this.items.push(Object.assign({}, e, { key, cx: e.x * T + 8, by: (e.y + 1) * T, idx: i }));
      });
      if (s.lost && s.lost.room === id) this.items.push({ type: 'lost', key: 'lost', n: s.lost.n, cx: cl(s.lost.x + 5, 16, room.w * T - 16), by: cl(s.lost.y + 14, 16, room.h * T - 16), x: 0, y: 0 });
      // placement
      const pl = this.player; pl.vx = pl.vy = 0; pl.invul = Math.max(pl.invul, .4); pl.atkT = 0; pl.dashT = 0; pl.dead = false; pl.healT = 0; pl.trail.length = 0;
      const d = doorName && room.doors[doorName];
      if (d) {
        if (d.side === 'l') { pl.x = (d.x + 1) * T + 2; pl.y = (d.y + d.h) * T - pl.h; pl.face = 1; }
        else if (d.side === 'r') { pl.x = d.x * T - pl.w - 2; pl.y = (d.y + d.h) * T - pl.h; pl.face = -1; }
        else if (d.side === 'u') { pl.x = d.x * T + d.w * T / 2 - pl.w / 2; pl.y = (d.y + 1) * T + 2; }
        else { pl.x = d.x * T + d.w * T / 2 - pl.w / 2; pl.y = d.y * T - pl.h - 2; }
      } else if (spawn) { pl.x = spawn.x; pl.y = spawn.y; }
      pl.safe = { x: pl.x, y: pl.y };
      this.prevHp = s.hp; this.doorCD = .5; this.camSnap();
      LF.Audio.playMusic(room.music); LF.Audio.setAmbience(room.ambience || {});
      if (this.areaShown !== room.area) { this.areaShown = room.area; this.banner(LF.PAL[room.area].name, room.name); }
      this.motes = []; for (let i = 0; i < 26; i++) this.motes.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), p: Math.random() * 6 });
    },
    transition(fn) {
      if (this.trans) return; this.trans = true; this.setState('trans');
      this.fadeTo(1, 5, () => { fn(); this.fadeTo(0, 4, () => { this.trans = false; this.setState('play'); }); });
    },
    camSnap() {
      const pl = this.player, r = this.room;
      this.cam.x = r.w * T <= W ? (r.w * T - W) / 2 : cl(pl.cx - W / 2, 0, r.w * T - W);
      this.cam.y = r.h * T <= H ? (r.h * T - H) / 2 : cl(pl.cy - H / 2 - 8, 0, r.h * T - H);
    },

    /* ---------- death & respawn ---------- */
    killPlayer() {
      const pl = this.player, s = this.save; if (pl.dead) return;
      pl.dead = true; s.hp = 0; s.deaths++; this.trial = null;
      if (s.embers > 0) s.lost = { room: this.room.id, x: pl.safe.x, y: pl.safe.y, n: s.embers };
      s.embers = 0; this.sfx('lose'); this.burst(pl.cx, pl.cy, 30, '#ffc15a', 120, 1); this.shake(6); this.flashScreen('#ffffff', .5);
      pl.vy = -150; pl.vx = 0; this.setState('dead'); this.deadT = 0; LF.Audio.playMusic(null);
    },
    respawn() {
      const s = this.save, cp = s.cp; s.hp = s.maxHp; s.flags.respawned = 1; this.player.dead = false; this.player.invul = 1; this.hazards = [];
      this.loadRoom(cp.room, null, { x: cp.px != null ? cp.px : cp.x * T, y: cp.py != null ? cp.py : cp.y * T });
      this.setState('play'); this.fadeTo(0, 2.5);
      if (s.lost) this.toast('Your embers were left where you fell.');
    },
    spikeHit() {
      const pl = this.player; if (pl.invul > 0 || pl.dead) return;
      if (pl.hurt(this, 1, pl.cx) && this.save.hp > 0) this.safeT = .3;
    },
    killEnemy(e) {
      const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1);
      this.save.kills++; this.sfx('kill'); this.shake(2); this.hitstop(.06);
      this.burst(e.x + e.w / 2, e.y + e.h / 2, 16, '#fff2c9', 100, 1); this.burst(e.x + e.w / 2, e.y + e.h / 2, 8, '#ff8a3d', 70, 1);
      const n = Math.round((e.em || 2) * (this.player.hasCharm('spark') ? 1.5 : 1));
      for (let k = 0; k < n; k++) this.drops.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, w: 4, h: 4, vx: LF.rand(-60, 60), vy: LF.rand(-130, -60), v: 1, life: 28, ghost: 1 });
      if (this.trial) this.trial.kills++;
    },
    killBoss(b) {
      const i = this.enemies.indexOf(b); if (i >= 0) this.enemies.splice(i, 1);
      const s = this.save, id = b.id; s.flags['boss_' + id] = 1; this.boss = null; this.hazards = []; this.projectiles = [];
      this.sfx('boom'); this.sfx('kill'); this.shake(10); this.hitstop(.35); this.flashScreen('#ffffff', .8);
      for (let k = 0; k < 5; k++) setTimeout(() => this.burst(b.x + b.w / 2 + LF.rand(-14, 14), b.y + b.h / 2 + LF.rand(-14, 14), 20, k % 2 ? '#ffd27a' : '#c49bff', 140, 1), k * 140);
      for (let k = 0; k < 40; k++) this.drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: 4, h: 4, vx: LF.rand(-110, 110), vy: LF.rand(-200, -60), v: 1, life: 40, ghost: 1 });
      this.openAll('g'); this.bossLocked = false;
      if (id === 'warden') { s.flags.warden_down = 1; this.banner('The Warden Falls', 'The Great Lantern waits'); LF.Audio.playMusic('ending'); }
      else if (id === 'snowking') { LF.Seasons.snowCleared(this, b); }
      else {
        const sg = { thorn: 'root', prism: 'prism', tide: 'tide' }[id]; s.sigils[sg] = true; s.maxHp++; s.hp = s.maxHp;
        setTimeout(() => { this.sfx('ability'); this.banner(LF.BOSS_NAMES[id] + ' defeated', sg.toUpperCase() + ' SIGIL + 1 HEART'); }, 700);
      }
      LF.Save.write(s);
    },
    bossTrigger(b) { return this.player.x > 6.5 * T && !this.trans; },
    bossIntro(b) {
      this.sfx('boss'); this.shake(4); this.banner(LF.BOSS_NAMES[b.id], 'Boss');
      const d = this.room.doors.l; this.bossLocked = true;
      if (d) for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) { if (this.room.grid[y][x] === '.') { this.room.grid[y][x] = 'g'; this.burst(x * T + 8, y * T + 8, 4, '#c8b890', 40, 1); } }
    },

    /* ---------- rewards ---------- */
    give(spec) {
      const s = this.save, pl = this.player, [k, v] = spec.split(':');
      if (k === 'embers') { s.embers += +v; this.sfx('ember'); this.toast('+' + v + ' embers'); }
      else if (k === 'charm') {
        if (s.charms.indexOf(v) < 0) s.charms.push(v);
        if (s.eq.length < s.slots && s.eq.indexOf(v) < 0) s.eq.push(v);
        this.sfx('charm'); const c = LF.CHARMS[v]; this.banner('Charm: ' + c.name, c.desc);
      } else if (k === 'abil') {
        s.abil[v] = true; const a = LF.ABIL_INFO[v]; this.sfx('ability'); this.hitstop(.4); this.flashScreen('#ffe2a0', .6); this.shake(5);
        this.burst(pl.cx, pl.cy, 40, '#ffd27a', 140, 1); this.banner(a[0], a[1]); setTimeout(() => this.tip(v), 2800);
      } else if (k === 'slot') { s.slots = Math.min(4, s.slots + 1); this.sfx('charm'); this.toast('+1 charm slot'); }
      else if (k === 'heart') { s.maxHp++; s.hp = s.maxHp; this.sfx('heart'); this.banner('+1 Heart', 'Your flame burns brighter'); }
      LF.Save.write(s);
    },
    equip(id) {
      const s = this.save, i = s.eq.indexOf(id); if (s.charms.indexOf(id) < 0) return false;
      if (i >= 0) s.eq.splice(i, 1); else { if (s.eq.length >= s.slots) return false; s.eq.push(id); }
      this.sfx('charm'); return true;
    },
    checkpoint(item) {
      const s = this.save, pl = this.player;
      s.cp = { room: this.room.id, x: Math.floor(item.cx / T), y: item.y, px: item.cx - pl.w / 2, py: item.by - pl.h };
      s.hp = s.maxHp; s.flags['sh:' + item.key] = 1; this.sfx('save'); this.flashScreen('#ffd27a', .25);
      this.burst(item.cx, item.by - 30, 24, '#ffd27a', 90, 1); this.toast('Shrine lit. Progress saved.');
      for (const e of this.enemies) if (e.kind === 'enemy' && !e.dead) { /* enemies persist; shrines heal only */ }
      LF.Save.write(s);
    }
  };

  LF.completion = function (d) {
    let n = 0;
    ['dbl', 'dash', 'glide'].forEach(k => { if (d.abil[k]) n++; });
    ['thorn', 'prism', 'tide', 'warden'].forEach(k => { if (d.flags['boss_' + k]) n++; });
    n += d.moths.length + Object.keys(d.flags).filter(k => k.indexOf('frag:') === 0).length + d.charms.length + (d.flags.trial_done ? 1 : 0) + Math.min(17, d.lore.length);
    return Math.min(100, Math.round(n / (3 + 4 + 11 + 4 + Object.keys(LF.CHARMS).length + 1 + 17) * 100));
  };
  LF.totalMoths = 11; LF.totalFrags = 4;
})();
