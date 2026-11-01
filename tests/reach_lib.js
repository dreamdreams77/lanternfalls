/* Physics-driven reachability analyser (QA tool). Uses the real Player.update and tile physics to find where a player with
   given abilities can actually go: doors, collectibles, altars, levers, shrines, plus "trap" spots with no way back to a door.
   Usage in the page: REACH.analyse({log}) -> report. Assumptions: strikeable walls (S) can be broken; dash-cracks (D) need Dash;
   sigil gates (G) open at the room's gateNeed; lever and boss bars (g) open once the lever / boss room is reached. */
window.REACH = (function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, In = LF.input;
  const KEYS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash'];
  const NUMF = ['x', 'y', 'vx', 'vy', 'face', 'onGround', 'coyote', 'jumpBuf', 'airJumps', 'dashT', 'dashCD', 'dashed', 'atkT', 'atkCD', 'invul', 'hurtT', 'flash', 'gliding', 'wingT', 'healT', 'dropT', 'inWater', 'stepT', 'wasGround', 'lastVy', 'pogoT', 'jumping', 'hitX', 'hitHead'];
  const snap = pl => { const o = {}; for (const k of NUMF) o[k] = pl[k]; return o; };
  const put = (pl, o) => { Object.assign(pl, o); pl.trail.length = 0; pl.hitSet = null; };
  const PW = 10, PH = 14;

  function frames(parts) { const f = []; for (const [n, k] of parts) for (let i = 0; i < n; i++) f.push(k); return f; }
  function macros(ab, water) {
    const M = [], d1 = [-1, 1], name = d => d < 0 ? 'left' : 'right';
    for (const d of d1) {
      const D = name(d);
      for (const n of [4, 12]) M.push(frames([[n, { [D]: 1 }]]));
      for (const h of [6, 14, 40]) for (const t of [22, 44]) M.push(frames([[h, { [D]: 1, jump: 1 }], [t - h, { [D]: 1 }]]));
      if (ab.dbl) for (const dd of [14, 20, 28, 38]) for (const h of [6, 10]) M.push(frames([[h, { [D]: 1, jump: 1 }], [dd - h, { [D]: 1 }], [10, { [D]: 1, jump: 1 }], [34, { [D]: 1 }]]));
      if (ab.dbl) M.push(frames([[40, { [D]: 1, jump: 1 }], [10, { [D]: 1 }], [40, { [D]: 1, jump: 1 }], [10, { [D]: 1 }]]));
      if (ab.dash) for (const f of [0, 12]) M.push(frames([[f + 1, { [D]: 1, jump: 1 }], [1, { [D]: 1, dash: 1 }], [26, { [D]: 1 }]]));
      if (ab.dash) M.push(frames([[1, { [D]: 1, dash: 1 }], [12, { [D]: 1 }]]));
      if (ab.glide) { M.push(frames([[110, { [D]: 1, jump: 1 }]])); M.push(frames([[240, { [D]: 1, jump: 1 }]])); M.push(frames([[10, { [D]: 1, jump: 1 }], [200, { [D]: 1 }]])); }
      if (ab.glide && ab.dbl) { M.push(frames([[10, { [D]: 1, jump: 1 }], [10, { [D]: 1 }], [10, { [D]: 1, jump: 1 }], [100, { [D]: 1, jump: 1 }]])); M.push(frames([[10, { [D]: 1, jump: 1 }], [10, { [D]: 1 }], [10, { [D]: 1, jump: 1 }], [230, { [D]: 1, jump: 1 }]])); }
    }
    if (water) for (const d of [-1, 0, 1]) { // swimming: tap jump over and over, then leave the water
      const D = d ? (d < 0 ? 'left' : 'right') : null, k = j => Object.assign(D ? { [D]: 1 } : {}, j ? { jump: 1 } : {});
      const swim = n => { const f = []; for (let i = 0; i < n; i++) { f.push(k(true)); for (let j = 0; j < 7; j++) f.push(k(false)); } return f; };
      const tails = [[]]; tails.push(frames([[28, k(false)]]));
      if (ab.dbl) { tails.push(frames([[1, k(true)], [9, k(false)], [1, k(true)], [38, k(false)]])); tails.push(frames([[1, k(true)], [16, k(false)], [1, k(true)], [38, k(false)]])); }
      if (ab.dash && D) tails.push(frames([[1, k(true)], [4, k(false)], [1, Object.assign(k(false), { dash: 1 })], [26, k(false)]]));
      for (const n of [2, 4, 7, 10]) for (const t of tails) M.push(swim(n).concat(t, frames([[26, {}]])));
    }
    M.push(frames([[8, { jump: 1 }], [30, {}]])); M.push(frames([[40, { jump: 1 }], [20, {}]]));
    if (ab.dbl) M.push(frames([[10, { jump: 1 }], [10, {}], [40, { jump: 1 }], [20, {}]]));
    M.push(frames([[2, { down: 1, jump: 1 }], [20, {}]]));   // drop through a one-way ledge
    return M;
  }

  const solid = ch => LF.Phys.solid(ch);
  function placement(room, name) {
    const d = room.doors[name], pl = { w: PW, h: PH };
    if (d.side === 'l') return { x: (d.x + 1) * T + 2, y: (d.y + d.h) * T - pl.h };
    if (d.side === 'r') return { x: d.x * T - pl.w - 2, y: (d.y + d.h) * T - pl.h };
    if (d.side === 'u') return { x: d.x * T + d.w * T / 2 - pl.w / 2, y: (d.y + 1) * T + 2 };
    return { x: d.x * T + d.w * T / 2 - pl.w / 2, y: d.y * T - pl.h - 2 };
  }

  function analyse(opts) {
    opts = opts || {}; const log = opts.log || (() => {});
    const S = G.save, savedAbil = Object.assign({}, S.abil), savedMute = LF.settings.mute, savedHp = [S.hp, S.maxHp];
    LF.settings.mute = true; S.hp = S.maxHp = 9999;
    const spikeO = G.spikeHit, pl = G.player; let hazard = false; G.spikeHit = () => { hazard = true; };
    const ids = Object.keys(LF.Rooms.list).filter(id => { const r = LF.Rooms.list[id]; return !r.pz && !r.bonus && !r.arcade && id !== 'trial' || id === 'trial'; }).filter(id => { const r = LF.Rooms.list[id]; return !r.pz && !r.bonus; });
    const world = { abil: Object.assign({ dbl: false, dash: false, glide: false }, opts.abil || {}), sig: new Set(), R: {}, events: [] };
    const state = id => world.R[id] || (world.R[id] = { seeds: [], seedSet: new Set(), lev: false, vars: {}, doorsHit: new Set(), items: new Set(), trap: 0, nodes: 0 });
    const ev = s => { world.events.push(s); log(s); };

    function variantKey(id) { const st = state(id), r = LF.Rooms.list[id]; return [world.abil.dbl ? 1 : 0, world.abil.dash ? 1 : 0, world.abil.glide ? 1 : 0, world.sig.size >= (r.gateNeed || 0) ? 1 : 0, st.lev ? 1 : 0].join(''); }

    function prepare(id) { // load the room with the variant's openings applied
      const r = LF.Rooms.list[id], st = state(id);
      G.loadRoom(id, null, { x: 40, y: 40 }); G.enemies = []; G.state = 'play';
      const room = G.room, boss = r.ents.some(e => e.type === 'boss' && !e.replay);
      for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
        const c = room.grid[y][x];
        if (c === 'S') room.grid[y][x] = '.';
        else if (c === 'D' && world.abil.dash) room.grid[y][x] = '.';
        else if (c === 'G' && world.sig.size >= (r.gateNeed || 0)) room.grid[y][x] = '.';
        else if (c === 'g' && (st.lev || boss)) room.grid[y][x] = '.';
      }
      G.room.layer = null; // physics only
    }

    function run(id, inp) {
      let haz = false; hazard = false; const samples = [];
      for (let i = 0; i < inp.length; i++) {
        for (const k of KEYS) In.set(k, !!(inp[i][k === 'left' ? 'left' : k === 'right' ? 'right' : k]));
        pl.update(G, 1 / 60); In.endFrame(); if (i % 2 === 0) samples.push([pl.x, pl.y]);
        if (hazard || pl.y > G.room.h * T + 20) { haz = true; break; }
      }
      for (const k of KEYS) In.set(k, false);
      let settle = 0;
      while (!haz && settle < 150 && !(pl.onGround && Math.abs(pl.vx) < 1)) { pl.update(G, 1 / 60); In.endFrame(); if (settle % 2 === 0) samples.push([pl.x, pl.y]); settle++; if (hazard || pl.y > G.room.h * T + 20) haz = true; }
      G.particles.length = 0; G.ts = {};
      return { haz, ok: !haz && pl.onGround, samples };
    }

    function expand(id) {
      const st = state(id), r = LF.Rooms.list[id], key = variantKey(id);
      const V = st.vars[key] || (st.vars[key] = { nodes: new Map(), queue: [], seeded: 0, edges: new Map(), doorNodes: new Set(), samples: new Set(), hit: [] });
      prepare(id); const room = G.room, ab = world.abil;
      Object.assign(S.abil, ab); const M = macros(ab, room.grid.some(row => row.includes('w')));
      const nk = (x, y) => Math.round(x / 8) + ',' + Math.round(y / 8);
      while (V.seeded < st.seeds.length) { // seeds: settle from the door placement
        const sd = st.seeds[V.seeded++]; put(pl, Object.assign(snap(pl), { x: sd.x, y: sd.y, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuf: 0, airJumps: 1, dashT: 0, dashCD: 0, dashed: false, invul: 0, hurtT: 0, inWater: false }));
        const res = run(id, frames([[1, {}]])); if (!res.ok) { ev('seed not stable in ' + id + ' at ' + sd.name); continue; }
        const k = nk(pl.x, pl.y); if (!V.nodes.has(k)) { V.nodes.set(k, snap(pl)); V.queue.push(k); }
        res.samples.forEach(p => V.samples.add(Math.round(p[0]) + ',' + Math.round(p[1])));
      }
      let guard = 0;
      while (V.queue.length && guard++ < 2500) {
        const k = V.queue.shift(), base = V.nodes.get(k);
        for (const m of M) {
          put(pl, base); const res = run(id, m); res.samples.forEach(p => V.samples.add(Math.round(p[0]) + ',' + Math.round(p[1])));
          if (!res.ok) continue;
          const k2 = nk(pl.x, pl.y); if (k2 === k) continue;
          if (!V.edges.has(k)) V.edges.set(k, new Set()); V.edges.get(k).add(k2);
          if (!V.nodes.has(k2)) { V.nodes.set(k2, snap(pl)); V.queue.push(k2); }
        }
      }
      if (guard >= 2500) ev('node cap hit in ' + id);
      // read what the samples touch
      const P = [...V.samples].map(s => s.split(',').map(Number));
      const near = (cx, cy, dx, dy) => P.some(p => Math.abs(p[0] + PW / 2 - cx) < dx && Math.abs(p[1] + PH / 2 - cy) < dy);
      const rep = { doors: [], items: {} };
      for (const dn in r.doors) { const d = r.doors[dn], rect = { x: d.x * T, y: d.y * T, w: d.w * T, h: d.h * T }; if (P.some(p => p[0] < rect.x + rect.w && p[0] + PW > rect.x && p[1] < rect.y + rect.h && p[1] + PH > rect.y)) rep.doors.push(dn); }
      r.ents.forEach((e, i) => {
        const cx = e.x * T + 8, by = (e.y + 1) * T; let ok = false;
        if (['ember', 'moth', 'frag'].includes(e.type)) ok = near(cx, by - 8, 15, 15);
        else if (e.type === 'altar') ok = near(cx, by - 8, 14, 28);
        else if (['chest', 'lever', 'shrine', 'lore', 'npc', 'lamp', 'trial'].includes(e.type)) ok = [...V.nodes.values()].some(n => Math.abs(n.x + PW / 2 - cx) < 20 && Math.abs(n.y + PH / 2 - (by - 8)) < 26); // must stand there
        else if (e.type === 'boss') ok = near(cx, by - 8, 40, 30);
        else return;
        rep.items[i] = ok;
      });
      // traps: nodes with no path to any door trajectory (only meaningful when a door is reachable at all)
      const doorNode = new Set(); // a node "reaches a door" if some macro from it overlaps a door; approximate with node proximity to door rects
      for (const dn in r.doors) { const d = r.doors[dn], rect = { x: d.x * T - 40, y: d.y * T - 40, w: d.w * T + 80, h: d.h * T + 80 }; for (const [k, s] of V.nodes) if (s.x < rect.x + rect.w && s.x + PW > rect.x && s.y < rect.y + rect.h && s.y + PH > rect.y) doorNode.add(k); }
      const rev = new Map(); for (const [a, bs] of V.edges) for (const b of bs) { if (!rev.has(b)) rev.set(b, []); rev.get(b).push(a); }
      const good = new Set(doorNode), stack = [...doorNode]; while (stack.length) { const n = stack.pop(); for (const p of rev.get(n) || []) if (!good.has(p)) { good.add(p); stack.push(p); } }
      const trap = [...V.nodes.keys()].filter(k => !good.has(k) && doorNode.size);
      return { rep, V, trap, nodes: V.nodes.size };
    }

    // ---- global fixed point ----
    const start = { x: 5 * T, y: 9 * T };
    state('glade').seeds.push({ x: start.x, y: start.y, name: 'start' }); state('glade').seedSet.add('start');
    let changed = true, rounds = 0; const results = {};
    while (changed && rounds++ < 60) {
      changed = false;
      for (const id of Object.keys(world.R)) {
        const r = LF.Rooms.list[id], st = state(id); if (!r) continue;
        const t0 = performance.now(), out = expand(id); results[id] = out; st.nodes = out.nodes; if (opts.timing) log('  expand ' + id + ' ' + Math.round(performance.now() - t0) + 'ms nodes ' + out.nodes);
        for (const dn of out.rep.doors) {
          const d = r.doors[dn]; if (!d.to || !LF.Rooms.list[d.to] || LF.Rooms.list[d.to].pz || LF.Rooms.list[d.to].bonus) continue;
          const tr = LF.Rooms.list[d.to], t = state(d.to), key = d.toName;
          if (!t.seedSet.has(key)) { t.seedSet.add(key); const p = placement(tr, d.toName); t.seeds.push({ x: p.x, y: p.y, name: key }); changed = true; ev('reached ' + d.to + ' via ' + id + '.' + dn); }
        }
        r.ents.forEach((e, i) => {
          if (!out.rep.items[i]) return;
          if (e.type === 'altar' && e.give && e.give.indexOf('abil:') === 0) { const a = e.give.split(':')[1]; if (!world.abil[a]) { world.abil[a] = true; changed = true; ev('ABILITY ' + a + ' from ' + id); } }
          if (!opts.lockSigils && e.type === 'boss' && !e.replay && ['thorn', 'prism', 'tide'].includes(e.id) && !world.sig.has(e.id)) { world.sig.add(e.id); changed = true; ev('SIGIL ' + e.id + ' (boss room ' + id + ')'); }
          if (e.type === 'lever' && !st.lev) { st.lev = true; changed = true; ev('lever pulled in ' + id); }
        });
        if (r.ents.some(e => e.type === 'boss' && !e.replay) && !st.bossSeen) { st.bossSeen = true; changed = true; }
      }
    }
    // ---- report ----
    const report = { events: world.events, abil: world.abil, sigils: [...world.sig], rooms: {}, unreachableRooms: [], missingItems: [], traps: [] };
    for (const id of ids) {
      const r = LF.Rooms.list[id], st = world.R[id];
      if (!st || !results[id]) { report.unreachableRooms.push(id); continue; }
      const out = results[id]; const miss = [];
      r.ents.forEach((e, i) => { if (out.rep.items[i] === false) miss.push(e.type + (e.id ? ':' + e.id : '') + '@' + e.x + ',' + e.y); });
      report.rooms[id] = { nodes: out.nodes, doors: out.rep.doors.length + '/' + Object.keys(r.doors).length, missing: miss, traps: out.trap.length };
      if (miss.length) report.missingItems.push(id + ': ' + miss.join(' '));
      if (out.trap.length) report.traps.push(id + ': ' + out.trap.length + ' trap node(s), e.g. ' + out.trap.slice(0, 3).map(k => k.split(',').map(n => n * 8).join(',')).join(' | '));
    }
    G.spikeHit = spikeO; Object.assign(S.abil, savedAbil); LF.settings.mute = savedMute; S.hp = savedHp[0]; S.maxHp = savedHp[1];
    return report;
  }
  return { analyse, internals: { macros, snap, put, frames, KEYS, PW, PH } };
})();
