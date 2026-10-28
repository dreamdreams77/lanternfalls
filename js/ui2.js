/* Lanternfall - UI part 2: pause menu (charms, map, journal, stats), shop, ending */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G, UI = LF.UI, h = UI.h, S = LF.Sprites;
  const sfx = n => LF.Audio.sfx(n);
  const TABS = [['pause', 'Pause'], ['charms', 'Charms'], ['map', 'Map'], ['journal', 'Journal'], ['bounty', 'Bounties'], ['arcade', 'Arcade'], ['stats', 'Stats'], ['help', 'Help']];

  UI.closeMenu = function () { UI.clearScreen(); G.setState('play'); LF.input.clear(); sfx('back'); };

  UI.menu = function (tab) {
    if (LF.state === 'play' || LF.state === 'paused') { if (LF.state === 'play') { G.setState('paused'); LF.input.clear(); sfx('ui'); } } else return;
    const s = h('div', 'screen dim'), p = h('div', 'panel'); p.style.minWidth = 'calc(var(--u)*30)';
    const tabs = h('div', 'tabs'), body = h('div'); const tb = {};
    TABS.forEach(t => { const b = UI.btn(t[1], () => UI.menu(t[0]), 'sm' + (t[0] === tab ? ' sel' : '')); tb[t[0]] = b; tabs.append(b); });
    p.append(tabs, body); s.append(p);
    UI.show(s);
    const items = UI['tab_' + tab](body) || [];
    const idx = TABS.findIndex(t => t[0] === tab);
    UI.setNav(items, a => {
      if (a === 'pause') { UI.closeMenu(); return true; }
      if (a === 'map' || a === 'inv') { const want = a === 'map' ? 'map' : 'charms'; if (want === tab) UI.closeMenu(); else UI.menu(want); return true; }
      if (a === 'left') { UI.menu(TABS[(idx + TABS.length - 1) % TABS.length][0]); return true; }
      if (a === 'right') { UI.menu(TABS[(idx + 1) % TABS.length][0]); return true; }
      return false;
    });
    if (!items.length) UI.nav.sel = 0;
  };

  UI.tab_pause = function (body) {
    body.append(h('h2', '', 'Paused'));
    const m = h('div', 'menu'); m.style.margin = '0 auto';
    const items = [
      UI.btn('Resume', () => UI.closeMenu()),
      UI.btn('Save Game', () => { LF.Save.write(G.save); UI.toast('Game saved'); }),
      UI.btn('Settings', () => UI.settings(() => UI.menu('pause'))),
      UI.btn('Quit to Title', () => UI.confirm('Return to the title screen? Progress since your last shrine is kept, but your position resets to it.', 'Quit', () => { LF.Save.write(G.save); UI.clearScreen(); G.fadeTo(1, 4, () => { G.room = null; UI.title(); G.fade.a = 1; G.fadeTo(0, 3); }); }), 'danger')
    ];
    m.append(...items); body.append(m, h('div', 'hint', 'Shrines heal you and set your respawn point.')); return items;
  };

  UI.tab_charms = function (body) {
    const s = G.save; body.append(h('h2', '', 'Charms'));
    body.append(h('div', 'hint', 'Slots used: ' + s.eq.length + ' / ' + s.slots + ' — click a charm to equip or remove it'));
    const grid = h('div', 'grid'), items = [];
    Object.keys(LF.CHARMS).forEach(id => {
      const c = LF.CHARMS[id], own = s.charms.indexOf(id) >= 0, eq = s.eq.indexOf(id) >= 0;
      const card = h('div', 'card' + (eq ? ' eq' : '') + (own ? '' : ' locked'));
      card.innerHTML = '<img class="ic" src="' + S.icon(own ? c.icon : 'lock') + '"><div><b>' + (own ? c.name : '???') + '</b><span>' + (own ? c.desc : 'Not yet found') + '</span></div>';
      if (own) { card.addEventListener('click', () => { if (!G.equip(id)) { UI.toast(eq ? 'Cannot remove' : 'No free charm slot'); sfx('back'); return; } LF.Save.write(s); const keep = UI.nav ? UI.nav.sel : 0; UI.menu('charms'); UI.sel(keep, true); }); items.push(card); }
      grid.append(card);
    });
    body.append(grid);
    body.append(h('h3', '', 'Upgrades'));
    body.insertAdjacentHTML('beforeend', '<div class="stat"><span>Strike damage</span><b>' + (1 + s.dmgLvl) + '</b></div><div class="stat"><span>Lantern light</span><b>Lv ' + (1 + s.lightLvl) + '</b></div><div class="stat"><span>Kindle cost</span><b>' + G.kindleCost() + ' embers</b></div>');
    return items;
  };

  UI.tab_map = function (body) {
    body.append(h('h2', '', 'Map'));
    const cv = h('canvas'); cv.id = 'mapcv'; body.append(cv);
    const rooms = Object.values(LF.Rooms.list), s = G.save;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; rooms.forEach(r => { x0 = Math.min(x0, r.mx); y0 = Math.min(y0, r.my); x1 = Math.max(x1, r.mx + r.mw); y1 = Math.max(y1, r.my + r.mh); });
    const cs = Math.max(6, Math.min(18, Math.floor(520 / (x1 - x0)), Math.floor(300 / (y1 - y0))));
    cv.width = (x1 - x0) * cs + 8; cv.height = (y1 - y0) * cs + 8; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const t = performance.now() / 1000;
    rooms.forEach(r => {
      const seen = s.seen['r:' + r.id], x = (r.mx - x0) * cs + 4, y = (r.my - y0) * cs + 4, w = r.mw * cs, hh = r.mh * cs, P = LF.PAL[r.area];
      if (!seen) { g.fillStyle = '#17132e'; g.fillRect(x + 1, y + 1, w - 2, hh - 2); return; }
      g.fillStyle = P.rock[3]; g.fillRect(x, y, w, hh); g.fillStyle = P.rock[2]; g.fillRect(x + 1, y + 1, w - 2, hh - 2); g.fillStyle = P.top[1]; g.fillRect(x + 1, y + 1, w - 2, 1);
      r.ents.forEach((e, i) => {
        if (e.type === 'shrine') { g.fillStyle = s.flags['sh:' + r.id + '#' + i] ? '#ffd27a' : '#7a6a58'; g.fillRect(x + w / 2 - 1, y + hh / 2 - 1, 3, 3); }
        if (e.type === 'boss' && !s.flags['boss_' + e.id]) { g.fillStyle = '#ff6f7d'; g.fillRect(x + w - 5, y + 2, 3, 3); }
        if (e.type === 'moth' && s.moths.indexOf(e.id) < 0) { g.fillStyle = '#c49bff'; g.fillRect(x + 2, y + hh - 5, 2, 2); }
      });
    });
    const cur = LF.Rooms.list[G.room.id];
    if (cur) { const pl = G.player, x = (cur.mx - x0) * cs + 4 + pl.cx / (cur.w * LF.T) * cur.mw * cs, y = (cur.my - y0) * cs + 4 + pl.cy / (cur.h * LF.T) * cur.mh * cs; g.fillStyle = '#fff'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#ff8a3d'; g.fillRect(x - 1, y - 1, 2, 2); }
    body.append(h('div', 'hint', 'Here: <b style="color:#ffd27a">' + (cur ? cur.name : '') + '</b> &nbsp; ■ lit shrine &nbsp; <span style="color:#ff6f7d">■</span> boss &nbsp; <span style="color:#c49bff">■</span> unfound moth (visited rooms)'));
    return [];
  };

  UI.tab_journal = function (body) {
    const s = G.save; body.append(h('h2', '', 'Journal'));
    const list = h('div'); list.style.cssText = 'max-height:calc(var(--u)*16);overflow:auto;padding-right:6px';
    Object.keys(LF.LORE).forEach(id => { const known = s.lore.indexOf(id) >= 0, l = LF.LORE[id]; list.append(h('div', 'entry' + (known ? '' : ' unk'), known ? '<b>' + l[0] + '</b><br>' + l[1] : '<b>???</b><br>An undiscovered inscription.')); });
    body.append(list); body.append(h('div', 'hint', 'Read ' + s.lore.length + ' of ' + Object.keys(LF.LORE).length + ' inscriptions'));
    return [];
  };

  UI.tab_stats = function (body) {
    const s = G.save, f = s.flags, frags = Object.keys(f).filter(k => k.indexOf('frag:') === 0).length;
    body.append(h('h2', '', 'Stats'));
    const rows = [['Completion', LF.completion(s) + '%'], ['Time played', LF.fmtTime(s.time)], ['Hearts', s.maxHp], ['Embers', s.embers], ['Moths', s.moths.length + ' / ' + LF.totalMoths], ['Heart fragments', frags + ' / ' + LF.totalFrags], ['Charms', s.charms.length + ' / ' + Object.keys(LF.CHARMS).length],
      ['Sigils', G.sigilCount() + ' / 3'], ['Foes defeated', s.kills], ['Times faded', s.deaths], ['Trial of Embers', f.trial_done ? 'Cleared' : (s.gaunt ? 'Wave ' + s.gaunt : 'Unfound')], ['Cycle', s.ng ? 'New Game+ ' + s.ng : 'First journey']];
    const c = h('div', 'col'); c.style.margin = '0 auto'; c.innerHTML = rows.map(r => '<div class="stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join(''); body.append(c); return [];
  };

  UI.tab_help = function (body) { body.append(h('h2', '', 'How to Play')); body.insertAdjacentHTML('beforeend', UI.helpHTML()); return []; };

  /* ---------- shop ---------- */
  UI.shop = function () {
    G.setState('shop'); LF.input.clear();
    const s = G.save, f = s.flags; const sc = h('div', 'screen dim'), p = h('div', 'panel');
    const head = h('h2', '', "Pip's Wares"), bal = h('div', 'hint'); p.append(head, bal);
    const grid = h('div', 'grid'); grid.style.gridTemplateColumns = 'repeat(2,1fr)'; grid.style.maxHeight = 'calc(var(--u)*17)'; grid.style.overflowY = 'auto'; grid.style.paddingRight = '6px'; p.append(grid);
    const items = [];
    const info = it => {
      if (it.type === 'charm') { const c = LF.CHARMS[it.id]; return { name: c.name, desc: c.desc, icon: c.icon, cost: it.cost, sold: s.charms.indexOf(it.id) >= 0 }; }
      if (it.type === 'slot') { const n = f.slotsBought || 0; return { name: it.name, desc: it.desc, icon: it.icon, cost: it.cost, sold: n >= it.max || s.slots >= 4 }; }
      if (it.type === 'up') { const l = (s.up || {})[it.key] || 0; return { name: it.name + (l ? ' II' : ''), desc: it.desc, icon: it.icon, cost: it.costs[l], sold: l >= it.costs.length }; }
      const lvl = it.type === 'dmg' ? s.dmgLvl : it.type === 'light' ? s.lightLvl : s.flaskLvl;
      return { name: it.name + (lvl ? ' II' : ''), desc: it.desc, icon: it.icon, cost: it.costs[lvl], sold: lvl >= it.costs.length };
    };
    const buy = it => {
      const i = info(it); if (i.sold) return; if (s.embers < i.cost) { UI.toast('Not enough embers'); sfx('back'); return; }
      s.embers -= i.cost;
      if (it.type === 'charm') G.give('charm:' + it.id); else if (it.type === 'slot') { f.slotsBought = (f.slotsBought || 0) + 1; G.give('slot'); }
      else if (it.type === 'up') { s.up = s.up || {}; s.up[it.key] = (s.up[it.key] || 0) + 1; G.sfx('charm'); }
      else if (it.type === 'dmg') { s.dmgLvl++; G.sfx('charm'); } else if (it.type === 'light') { s.lightLvl++; G.sfx('charm'); } else { s.flaskLvl++; G.sfx('charm'); }
      LF.Save.write(s); UI.toast('Bought ' + i.name); const k = UI.nav.sel; render(); UI.sel(k, true);
    };
    const leave = UI.btn('Leave', () => { UI.clearScreen(); G.setState('play'); LF.input.clear(); sfx('back'); });
    const render = () => {
      grid.innerHTML = ''; items.length = 0; bal.innerHTML = 'Embers: <b style="color:#ffd27a">' + s.embers + '</b>';
      LF.SHOP.forEach(it => {
        if (it.need && !it.need(s)) return; // stocked only once it is useful
        const i = info(it), card = h('div', 'card' + (i.sold ? ' locked' : '') + (!i.sold && s.embers < i.cost ? ' locked' : ''));
        card.innerHTML = '<img class="ic" src="' + S.icon(i.icon) + '"><div><b>' + i.name + '</b><span>' + i.desc + '</span><span style="color:' + (i.sold ? '#7dffb0' : '#ffd27a') + '">' + (i.sold ? 'Owned' : i.cost + ' embers') + '</span></div>';
        card.addEventListener('click', () => buy(it)); grid.append(card); items.push(card);
      });
      items.push(leave); UI.setNav(items, a => { if (a === 'pause') { leave.click(); return true; } if (a === 'left') { UI.sel(UI.nav.sel - 1); return true; } if (a === 'right') { UI.sel(UI.nav.sel + 1); return true; } if (a === 'down') { UI.sel(UI.nav.sel + 2); return true; } if (a === 'up') { UI.sel(UI.nav.sel - 2); return true; } return false; });
    };
    leave.classList.add('sm'); const mw = h('div', 'menu'); mw.style.cssText = 'margin:.2em auto .6em;min-width:calc(var(--u)*8)'; mw.append(leave); bal.after(mw); sc.append(p); UI.show(sc); render();
  };

  /* ---------- ending ---------- */
  UI.ending = function () {
    G.setState('ending'); LF.input.clear(); LF.Audio.playMusic('ending'); G.sfx('win'); G.flashScreen('#ffe2a0', .8);
    const sc = h('div', 'screen'); sc.style.background = '#05030f'; sc.style.opacity = 0; sc.style.transition = 'opacity 1.6s'; sc.style.cursor = 'pointer';
    const txt = h('div', 'credits'); sc.append(txt, h('div', 'hint', 'click or press Enter'));
    UI.show(sc); requestAnimationFrame(() => { sc.style.opacity = 1; });
    let i = 0; const pages = LF.ENDING;
    const finish = () => {
      sc.innerHTML = ''; sc.style.cursor = 'default'; const s = G.save;
      const c = h('div', 'panel'); c.append(h('h2', '', 'The Flame Endures'));
      c.insertAdjacentHTML('beforeend', '<div class="col" style="margin:0 auto"><div class="stat"><span>Time</span><b>' + LF.fmtTime(s.time) + '</b></div><div class="stat"><span>Completion</span><b>' + LF.completion(s) + '%</b></div><div class="stat"><span>Moths</span><b>' + s.moths.length + '/' + LF.totalMoths + '</b></div><div class="stat"><span>Times faded</span><b>' + s.deaths + '</b></div></div>');
      const m = h('div', 'menu'); m.style.margin = '.8em auto 0';
      const a = UI.btn('Keep Exploring', () => { UI.clearScreen(); G.setState('play'); LF.input.clear(); LF.Audio.playMusic(G.room.music); });
      const b = UI.btn('New Game+', () => UI.confirm('Begin New Game+? You keep abilities, charms and upgrades. Foes grow stronger.', 'Begin', () => UI.newGamePlus()));
      const d = UI.btn('Title Screen', () => { UI.clearScreen(); G.room = null; UI.title(); });
      m.append(a, b, d); c.append(m); sc.append(c); UI.setNav([a, b, d]);
    };
    const adv = () => { if (i >= pages.length) return; i++; if (i >= pages.length) { finish(); return; } txt.style.opacity = 0; setTimeout(() => { txt.textContent = pages[i]; txt.style.opacity = 1; }, 250); };
    txt.style.transition = 'opacity .5s'; txt.textContent = pages[0];
    sc.addEventListener('click', () => adv());
    UI.setNav([], a => { if (a === 'jump' || a === 'attack' || a === 'up') { adv(); return true; } return true; });
  };

  UI.newGamePlus = function () {
    const o = G.save, n = LF.newSave();
    n.ng = o.ng + 1; n.abil = { dbl: true, dash: true, glide: true, shot: true }; n.charms = o.charms.slice(); n.eq = o.eq.slice(); n.slots = o.slots;
    n.dmgLvl = o.dmgLvl; n.lightLvl = o.lightLvl; n.flaskLvl = o.flaskLvl; n.maxHp = o.maxHp; n.hp = o.maxHp; n.lore = o.lore.slice(); n.flags = { started: 1 };
    Object.keys(o.seen).forEach(k => { if (k.indexOf('tip:') === 0) n.seen[k] = 1; });
    LF.Save.write(n); UI.clearScreen(); G.fade.a = 1; G.start(n); UI.banner('New Game+ ' + n.ng, 'The dark remembers');
  };
})();
