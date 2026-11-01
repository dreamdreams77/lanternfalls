/* Playtest bot: plans routes with the real physics (see reach_lib.js), then plays them in the live game with enemies, fighting what it meets.
   BOT.play({from, door, to}) -> {ok, frames, hpLost, deaths, kills, stuck} */
window.BOT = (function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, In = LF.input, I = REACH.internals, pl = () => G.player;
  const nk = (x, y) => Math.round(x / 8) + ',' + Math.round(y / 8);

  let avoid = []; // doors the planner must not wander into (anything but the target): in the live game they change room
  const inDoor = p => avoid.some(r => p.x < r.x + r.w && p.x + I.PW > r.x && p.y < r.y + r.h && p.y + I.PH > r.y);
  function simRun(inp) { // run frames on the player alone; returns {ok, hit samples}
    const p = pl(), samples = []; let haz = false;
    for (let i = 0; i < inp.length; i++) { for (const k of I.KEYS) In.set(k, !!inp[i][k]); p.update(G, 1 / 60); In.endFrame(); if (i % 2 === 0) samples.push([p.x, p.y]); if (p.y > G.room.h * T + 20 || G.__haz || inDoor(p)) { haz = true; break; } }
    for (const k of I.KEYS) In.set(k, false);
    let st = 0; while (!haz && st < 150 && !(p.onGround && Math.abs(p.vx) < 1)) { p.update(G, 1 / 60); In.endFrame(); if (st % 2 === 0) samples.push([p.x, p.y]); st++; if (p.y > G.room.h * T + 20 || G.__haz || inDoor(p)) haz = true; }
    return { ok: !haz && p.onGround, samples };
  }
  const touches = (samples, r) => samples.some(p => p[0] < r.x + r.w && p[0] + I.PW > r.x && p[1] < r.y + r.h && p[1] + I.PH > r.y);

  /* plan: BFS over macros from the exact current state to the first macro whose flight touches the target rect */
  function plan(rect, limit) {
    avoid = Object.values(G.room.doors).map(d => ({ x: d.x * T, y: d.y * T, w: d.w * T, h: d.h * T })).filter(r => !(r.x === rect.x && r.y === rect.y));
    const p = pl(), start = I.snap(p), saved = { inp: Object.assign({}, In.down), mute: LF.settings.mute, spike: G.spikeHit, ts: G.ts, enemies: G.enemies, parts: G.particles, hp: G.save.hp };
    LF.settings.mute = true; G.__haz = false; G.spikeHit = () => { G.__haz = true; }; G.enemies = []; G.particles = []; G.ts = {};
    const ab = G.save.abil, water = G.room.grid.some(r => r.includes('w')), M = I.macros(ab, water), nodes = new Map(), parent = new Map(), q = [];
    let result = null; const k0 = nk(p.x, p.y); nodes.set(k0, start); q.push(k0);
    outer: while (q.length && nodes.size < (limit || 700)) {
      const k = q.shift(), base = nodes.get(k);
      for (let mi = 0; mi < M.length; mi++) {
        I.put(p, base); G.__haz = false; const r = simRun(M[mi]);
        if (touches(r.samples, rect)) { const path = [mi]; let c = k; while (parent.has(c)) { const pr = parent.get(c); path.unshift(pr.mi); c = pr.k; } result = { path, M }; break outer; }
        if (!r.ok) continue; const k2 = nk(p.x, p.y); if (nodes.has(k2)) continue; nodes.set(k2, I.snap(p)); parent.set(k2, { k, mi }); q.push(k2);
      }
    }
    I.put(p, start); LF.settings.mute = saved.mute; G.spikeHit = saved.spike; G.enemies = saved.enemies; G.particles = saved.parts; G.ts = saved.ts; G.save.hp = saved.hp;
    for (const k of I.KEYS) In.set(k, false);
    return result;
  }

  const stats = { frames: 0, hpLost: 0, deaths: 0, kills: 0 };
  function frame(keys) { // one live frame, bot attacks when something threatens
    const p = pl(), k = Object.assign({}, keys);
    let near = null; for (const e of G.enemies) { if (e.dead || (e.kind === 'boss' && !e.active) || (e.spawnT > 0)) continue; const dx = (e.x + e.w / 2) - p.cx, dy = (e.y + e.h / 2) - p.cy; if (Math.abs(dy) < 18 && Math.abs(dx) < 34 && Math.sign(dx) === p.face) { near = e; break; } }
    if (near && p.atkCD <= 0 && !(near.type === 'beetle' && near.curl > 0)) k.attack = 1;
    for (const key of I.KEYS) In.set(key, !!k[key]);
    const hp0 = G.save.hp, kills0 = G.save.kills;
    G.update(1 / 60); In.endFrame(); stats.frames++;
    if (G.save.hp < hp0) stats.hpLost += hp0 - G.save.hp; stats.kills += G.save.kills - kills0;
  }

  async function play(o) { // synchronous run: from room/door to the target door of that room
    stats.frames = stats.hpLost = stats.deaths = stats.kills = 0;
    G.loadRoom(o.room, o.from || null, o.spawn || null); G.state = 'play'; G.fade.a = 0; G.fade.to = 0; G.trans = false;
    // what the game does when you walk up to them: sigil gates open for enough sigils, and a room's lever bars open once its lever is pulled
    if (G.room.gateNeed && G.sigilCount() >= G.room.gateNeed) G.openAll('G');
    if (LF.Rooms.list[o.room].ents.some(e => e.type === 'lever')) G.openAll('g');
    const room = G.room, d = room.doors[o.door], rect = { x: d.x * T, y: d.y * T, w: d.w * T, h: d.h * T };
    let fails = 0, steps = 0, idle = 0;
    while (stats.frames < (o.maxFrames || 3600)) {
      if (G.room.id !== o.room) return { ok: G.room.doors && true, via: G.room.id, frames: stats.frames, hpLost: stats.hpLost, deaths: stats.deaths, kills: stats.kills, steps };
      if (G.state === 'dead') { stats.deaths++; G.save.hp = G.save.maxHp; G.respawn && 0; G.setState('play'); G.player.dead = false; G.save.hp = G.save.maxHp; G.loadRoom(o.room, o.from || null, o.spawn || null); G.fade.a = 0; G.fade.to = 0; continue; }
      if (G.state !== 'play') { G.update(1 / 60); In.endFrame(); stats.frames++; continue; }
      const p = pl();
      if (!(p.onGround && Math.abs(p.vx) < 25 && p.hurtT <= 0)) { frame({}); if (++idle > 240) { idle = 0; fails++; } continue; }
      const pn = plan(rect, o.limit); steps++;
      if (!pn) { fails++; if (fails > 6) return { ok: false, why: 'no route', frames: stats.frames, hpLost: stats.hpLost, deaths: stats.deaths, kills: stats.kills, x: Math.round(p.x), y: Math.round(p.y), steps }; for (let i = 0; i < 30; i++) frame({}); continue; } // no honest route: wait (never wander out of a door) and report it
      const m = pn.M[pn.path[0]]; for (let i = 0; i < m.length && G.room.id === o.room && G.state === 'play'; i++) frame(m[i]);
      for (const k of I.KEYS) In.set(k, false);
    }
    return { ok: false, why: 'timeout', frames: stats.frames, hpLost: stats.hpLost, deaths: stats.deaths, kills: stats.kills, x: Math.round(pl().x), y: Math.round(pl().y), steps };
  }

  /* walk to a treasure (any entity index of the room), then see what the dark does about it */
  function fetch(o) {
    stats.frames = stats.hpLost = stats.deaths = stats.kills = 0;
    G.loadRoom(o.room, o.from || Object.keys(LF.Rooms.list[o.room].doors)[0], null); G.state = 'play'; G.fade.a = 0; G.fade.to = 0; G.enemies = G.enemies.filter(e => o.keepFoes); G.save.hp = G.save.maxHp;
    const r = LF.Rooms.list[o.room], e = r.ents[o.idx], cx = e.x * T + 8, by = (e.y + 1) * T;
    const rect = { x: cx - 8, y: by - 20, w: 16, h: 24 };
    const before = G.save.moths.length + Object.keys(G.save.flags).filter(k => k.indexOf('frag:') === 0).length + Object.keys(G.save.seen).filter(k => k.indexOf('c:') === 0).length;
    let steps = 0, fails = 0;
    while (stats.frames < 2400) {
      const now = G.save.moths.length + Object.keys(G.save.flags).filter(k => k.indexOf('frag:') === 0).length + Object.keys(G.save.seen).filter(k => k.indexOf('c:') === 0).length;
      if (now > before) break;
      if (e.type === 'chest') { const it = G.items.find(i => i.type === 'chest' && i.idx === o.idx); if (it && it.open) break; if (G.near && G.near.type === 'chest') { In.set('up', true); frame({ up: 1 }); In.set('up', false); continue; } }
      const p = pl(); if (!(p.onGround && Math.abs(p.vx) < 25 && p.hurtT <= 0)) { frame({}); continue; }
      const pn = plan(rect, 900); steps++; if (!pn) { if (++fails > 4) return { ok: false, why: 'no route to treasure' }; for (let i = 0; i < 20; i++) frame({ right: 1 }); continue; }
      const m = pn.M[pn.path[0]]; for (let i = 0; i < m.length; i++) frame(m[i]); for (const k of I.KEYS) In.set(k, false);
    }
    if (stats.frames >= 2400) return { ok: false, why: 'timeout fetching' };
    const hp0 = G.save.hp; stats.hpLost = 0; let ambush = false, tAmb = 0;
    for (let f = 0; f < 240; f++) { frame({}); if (G.enemies.some(e2 => e2.ambush)) { ambush = true; tAmb = f; break; } }
    if (!ambush) return { ok: true, ambush: false };
    const spawned = G.enemies.filter(e2 => e2.ambush).length, types = G.enemies.filter(e2 => e2.ambush).map(e2 => e2.type);
    return Object.assign({ ok: true, ambush: true, spawned, types, after: tAmb }, fight(1500, hp0));
  }
  function fight(max, hp0) {
    let f = 0, cleared = false; stats.hpLost = 0; const t0 = stats.frames, rid = G.room.id;
    while (f++ < max) {
      const live = G.enemies.filter(e => e.ambush && !e.dead); if (!live.length) { cleared = true; break; }
      if (G.state === 'dead' || G.room.id !== rid) break;
      const p = pl(); let tgt = live[0]; for (const e of live) if (Math.hypot(e.x - p.x, e.y - p.y) < Math.hypot(tgt.x - p.x, tgt.y - p.y)) tgt = e;
      const dx = (tgt.x + tgt.w / 2) - p.cx, dy = (tgt.y + tgt.h / 2) - p.cy, k = {};
      const wallL = p.x < 36, wallR = p.x > G.room.w * T - 36 - p.w; // never wander out through a door mid-fight
      const dir = dx > 0 ? 'right' : 'left', want = dx >= 0 ? 1 : -1, blocked = (dx < 0 && wallL) || (dx > 0 && wallR);
      if (Math.abs(dx) > 30) { if (!blocked) k[dir] = 1; }
      else if (p.face !== want) { if (!blocked) k[dir] = 1; }                                  // turn to face it (this game turns you as you move)
      else if (tgt.d.fly && Math.abs(dx) < 10 && !((dx > 0 && wallL) || (dx < 0 && wallR))) k[dx > 0 ? 'left' : 'right'] = 1; // step off a flier sitting on top of you
      if (dy < -34 && p.onGround && Math.abs(dx) < 40) k.jump = 1;
      if (dy < -12 && Math.abs(dx) < 16) k.up = 1;
      if (p.face === want && !k.left && !k.right && Math.abs(dx) <= 34 && Math.abs(dy) < (k.up ? 30 : 22) && p.atkCD <= 0 && !(tgt.type === 'beetle' && tgt.curl > 0) && !(tgt.spawnT > 0)) k.attack = 1;
      if (G.save.hp <= 2 && G.save.embers >= G.kindleCost() && p.onGround && !k.attack) k.down = 1;
      frame(k); if (window.BOT_TRACE && f % 30 === 0) (window.BOT_LOG = window.BOT_LOG || []).push(f + ' pl ' + Math.round(p.x) + ',' + Math.round(p.y) + (p.onGround ? 'G' : 'a') + ' hp' + G.save.hp + ' k=' + Object.keys(k).join('+') + ' foes ' + live.map(e => e.type + (e.baby ? '*' : '') + '@' + Math.round(e.x - p.x) + ',' + Math.round(e.y - p.y) + ' hp' + e.hp + (e.spawnT > 0 ? 's' : '')).join(' '));
    }
    return { cleared, frames: stats.frames - t0, hpLost: stats.hpLost, died: G.state === 'dead', fled: G.room.id !== rid };
  }
  return { play, plan, fetch, fight };
})();
