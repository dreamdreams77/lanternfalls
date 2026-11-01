/* Lanternfall - play-quality guards found in playtesting: never arrive above a spike */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, T = LF.T, Phys = LF.Phys;
  const SAFE = '#=cDSFw', landing = (room, tx, y0) => { for (let ty = Math.max(0, y0); ty < room.h; ty++) { const c = room.grid[ty][tx]; if (c === '^') return '^'; if (c !== '.' && c !== 'v' && c !== 'j' && c !== 'L') return c; } return '.'; };

  /* Arriving through a door above a spike (or any hazard) used to cost hearts in a loop: the post-hit teleport returned the player to
     the same airborne arrival point. Slide the arrival sideways to the nearest column that lands on something safe. */
  const loadO = G.loadRoom;
  G.loadRoom = function (id, doorName, spawn) {
    const r = loadO.apply(this, arguments), pl = this.player, room = this.room; if (!room || !pl) return r;
    const row = Math.max(0, Math.floor((pl.y + pl.h) / T)), cols = x => { const a = []; for (let tx = Math.floor((x + 1) / T); tx <= Math.floor((x + pl.w - 2) / T); tx++) a.push(tx); return a; };
    const bad = x => cols(x).some(tx => tx < 1 || tx >= room.w - 1 || landing(room, tx, row) === '^');
    if (bad(pl.x)) {
      for (let d = 4; d <= 16 * 8; d += 4) for (const s of [1, -1]) {
        const x = pl.x + s * d; if (x < T || x > room.w * T - T - pl.w) continue;
        if (!bad(x) && !Phys.anyTile(this, x, pl.y, pl.w, pl.h, c => Phys.solid(c))) { pl.x = x; pl.safe = { x: pl.x, y: pl.y }; this.camSnap(); return r; }
      }
    }
    return r;
  };

  /* Floating combat text used to pile up when several callouts fired at once (FINISH, CLANK, CURLS UP...). Stack newcomers upward. */
  const ftO = G.floatText;
  G.floatText = function (x, y, s, col, big) {
    let ny = y, guard = 0, hit = true;
    while (hit && guard++ < 4) { hit = false; for (const t of this.texts) if (t.t < .45 && Math.abs(t.x - x) < 34 && Math.abs(t.y - ny) < 8) { ny -= 9; hit = true; break; } }
    return ftO.call(this, x, ny, s, col, big);
  };
})();
