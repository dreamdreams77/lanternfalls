/* Lanternfall - settings and save data (localStorage with in-memory fallback) */
(function () {
  'use strict';
  const LF = window.LF;
  const SAVE_KEY = 'lanternfall.save.v1', SET_KEY = 'lanternfall.settings.v1';
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return mem[k] || null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (_) { delete mem[k]; } }
  };

  LF.defaultSettings = () => ({ music: 0.6, sfx: 0.8, amb: 0.7, mute: false, shake: true, touch: 'auto', reduce: false });
  LF.loadSettings = function () {
    let s = LF.defaultSettings();
    try { const r = JSON.parse(store.get(SET_KEY) || 'null'); if (r) s = Object.assign(s, r); } catch (_) {}
    LF.settings = s; return s;
  };
  LF.saveSettings = function () { store.set(SET_KEY, JSON.stringify(LF.settings)); };

  LF.newSave = function () {
    return {
      v: 1, hp: 5, maxHp: 5, embers: 0,
      abil: { dbl: false, dash: false, glide: false },
      charms: [], eq: [], slots: 2, dmgLvl: 0, lightLvl: 0, flaskLvl: 0,
      flags: {}, sigils: { root: false, prism: false, tide: false },
      moths: [], lore: [], bestiary: {}, ext: { elites: 0, parries: 0, flares: 0, chain: 0, finish: 0, guard: 0, night: 0 }, up: { fcost: 0, fgain: 0 }, bounties: {}, seen: {}, cp: { room: 'glade', x: 5, y: 9 },
      time: 0, deaths: 0, ng: 0, lost: null, gaunt: 0, ending: false, kills: 0, created: Date.now(), saved: 0
    };
  };

  LF.Save = {
    exists() { return !!store.get(SAVE_KEY); },
    load() {
      try {
        const r = JSON.parse(store.get(SAVE_KEY) || 'null');
        if (!r || r.v !== 1) return null;
        return Object.assign(LF.newSave(), r);
      } catch (e) { console.warn('save load failed', e); return null; }
    },
    write(d) {
      try { d.saved = Date.now(); store.set(SAVE_KEY, JSON.stringify(d)); return true; }
      catch (e) { console.warn('save failed', e); return false; }
    },
    remove() { store.del(SAVE_KEY); },
    summary() {
      const d = this.load(); if (!d) return null;
      return { time: d.time, room: d.cp.room, hp: d.maxHp, ng: d.ng, pct: LF.completion ? LF.completion(d) : 0 };
    }
  };

  LF.fmtTime = function (s) {
    s = Math.floor(s || 0);
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0');
  };
})();
