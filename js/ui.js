/* Lanternfall - UI core: DOM screens, navigation, toast/banner/tip, dialog, title, settings, confirm */
(function () {
  'use strict';
  const LF = window.LF, G = LF.G;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const sfx = n => LF.Audio.sfx(n);

  const UI = LF.UI = {
    h, root: null, screen: null, nav: null, navStack: [], dlg: null,
    init() {
      this.root = document.getElementById('ui');
      this.toasts = h('div'); this.toasts.id = 'toast';
      this.bannerEl = h('div'); this.bannerEl.id = 'banner';
      this.tipEl = h('div'); this.tipEl.id = 'tip'; this.tipEl.classList.add('hidden');
      this.layer = h('div'); this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
      this.root.append(this.tipEl, this.layer, this.toasts, this.bannerEl);
      LF.bus.on('key', e => this.onKey(e.action));
      const ld = document.getElementById('loading'); if (ld) ld.remove();
    },
    /* ---------- navigation ---------- */
    setNav(items, extra) {
      this.nav = { items, sel: 0, extra };
      items.forEach((b, i) => { b.addEventListener('mouseenter', () => this.sel(i, true)); });
      this.sel(0, true);
    },
    sel(i, quiet) {
      const n = this.nav; if (!n || !n.items.length) return;
      n.sel = (i + n.items.length) % n.items.length;
      n.items.forEach((b, k) => b.classList.toggle('sel', k === n.sel));
      const cur = n.items[n.sel]; if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
      if (!quiet) sfx('ui');
    },
    pushNav() { this.navStack.push(this.nav); this.nav = null; },
    popNav() { this.nav = this.navStack.pop() || null; if (this.nav) this.sel(this.nav.sel, true); },
    onKey(a) {
      if (this.dlg) { if (a === 'jump' || a === 'attack' || a === 'up') this.dlg.advance(); return; }
      const n = this.nav;
      if (n) {
        if (n.extra && n.extra(a)) return;
        const it = n.items;
        if (a === 'up') this.sel(n.sel - 1); else if (a === 'down') this.sel(n.sel + 1);
        else if ((a === 'jump' || a === 'attack') && it[n.sel]) it[n.sel].click();
        return;
      }
      if (LF.state === 'play') {
        if (a === 'pause') this.menu('pause'); else if (a === 'map') this.menu('map'); else if (a === 'inv') this.menu('charms');
      }
    },
    show(el) { this.clearScreen(); this.screen = el; this.layer.appendChild(el); },
    clearScreen() { if (this.screen) { this.screen.remove(); this.screen = null; } this.nav = null; this.navStack = []; },
    btn(label, fn, cls) { const b = h('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', e => { e.stopPropagation(); if (!b.classList.contains('dis')) { sfx('ok'); fn(b); } }); return b; },

    /* ---------- transient widgets ---------- */
    toast(m) {
      const t = h('div', 'toast', m); this.toasts.appendChild(t);
      while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
      setTimeout(() => t.remove(), 2700);
    },
    banner(a, b) {
      const el = this.bannerEl; el.innerHTML = a + (b ? '<small>' + b + '</small>' : ''); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    },
    tip(m) {
      const t = this.tipEl; t.textContent = m; t.classList.remove('hidden'); clearTimeout(this._tipT); this._tipT = setTimeout(() => t.classList.add('hidden'), 6500);
    },
    confirm(msg, yesLabel, onYes, onNo) {
      const ov = h('div'); ov.id = 'confirm'; const p = h('div', 'panel'); p.append(h('p', '', msg));
      const row = h('div', 'menu'); row.style.margin = '0 auto';
      const close = () => { ov.remove(); this.popNav(); };
      const yes = this.btn(yesLabel, () => { close(); onYes && onYes(); }, 'danger'), no = this.btn('Cancel', () => { close(); onNo && onNo(); });
      row.append(no, yes); p.append(row); ov.append(p); this.layer.appendChild(ov); this.pushNav(); this.setNav([no, yes], a => { if (a === 'pause') { no.click(); return true; } if (a === 'left' || a === 'up') { this.sel(0); return true; } if (a === 'right' || a === 'down') { this.sel(1); return true; } return false; });
    },

    /* ---------- dialog ---------- */
    dialog(d, done) {
      const box = h('div'); box.id = 'dialog'; const p = h('div', 'panel'); const who = h('div', 'who', d.who || ''), txt = h('div', 'txt'), nx = h('div', 'nx', '▼');
      p.append(who, txt, nx); box.append(p); this.layer.appendChild(box);
      let i = 0, pos = 0, timer = null; const lines = d.lines;
      const type = () => {
        clearInterval(timer); pos = 0; txt.textContent = ''; nx.style.visibility = 'hidden';
        timer = setInterval(() => {
          pos++; txt.textContent = lines[i].slice(0, pos); if (pos % 2 === 0) LF.Audio.talk(lines[i][pos - 1] || 'a', d.who === 'Pip' ? 380 : d.who === 'Marrow' ? 180 : 280);
          if (pos >= lines[i].length) { clearInterval(timer); timer = null; nx.style.visibility = 'visible'; }
        }, 24);
      };
      const ctl = this.dlg = {
        advance() {
          if (timer) { clearInterval(timer); timer = null; txt.textContent = lines[i]; nx.style.visibility = 'visible'; return; }
          sfx('ui'); i++;
          if (i >= lines.length) { clearInterval(timer); box.remove(); UI.dlg = null; done && done(); } else type();
        }
      };
      box.addEventListener('click', () => ctl.advance()); type();
    },

    /* ---------- title ---------- */
    title() {
      G.setState('title'); LF.Audio.playMusic('title'); LF.Audio.setAmbience({ wind: .25, drone: .1 });
      const s = h('div', 'screen'); s.id = 'title';
      s.append(h('div', 'logo', 'LANTERNFALL'), h('div', 'sub', 'a small flame in a large dark'));
      const m = h('div', 'menu'), sum = LF.Save.summary(), items = [];
      if (sum) { const c = this.btn('Continue <small style="opacity:.7;letter-spacing:.05em;display:block;font-size:.7em">' + LF.fmtTime(sum.time) + ' · ' + sum.pct + '%' + (sum.ng ? ' · NG+' + sum.ng : '') + '</small>', () => this.start(false)); items.push(c); }
      items.push(this.btn('New Game', () => { if (sum) this.confirm('Start a new game? Your current save will be overwritten.', 'Overwrite', () => this.start(true)); else this.start(true); }));
      items.push(this.btn('Settings', () => this.settings(() => this.title())));
      items.push(this.btn('How to Play', () => this.help(() => this.title())));
      if (LF.Arcade) items.push(this.btn('Mini Games', () => LF.Arcade.open('title')));
      if (LF.pwa && LF.pwa.deferred && !LF.pwa.standalone) items.push(this.btn('Install App', () => LF.pwa.install(), 'sm'));
      if (sum) items.push(this.btn('Delete Save', () => this.confirm('Delete your save permanently? This cannot be undone.', 'Delete', () => { LF.Save.remove(); sfx('lose'); this.toast('Save deleted'); this.title(); }), 'danger sm'));
      m.append(...items); s.append(m, h('div', 'hint', 'Arrows/WASD · Enter or Space to select'));
      this.show(s); this.setNav(items);
    },
    start(fresh) {
      LF.Audio.init(); this.clearScreen();
      G.fade.a = 1; G.fade.to = 1;
      if (fresh) G.newGame(); else G.continueGame();
    },

    /* ---------- settings ---------- */
    settings(back) {
      const s = h('div', 'screen dim'), p = h('div', 'panel'), st = LF.settings, items = [];
      p.append(h('h2', '', 'Settings'));
      const save = () => { LF.saveSettings(); LF.Audio.applyVolumes(); };
      const slider = (label, key) => {
        const row = h('div', 'row'), lab = h('label', '', label), inp = h('input'); inp.type = 'range'; inp.min = 0; inp.max = 100; inp.value = Math.round(st[key] * 100);
        inp.addEventListener('input', () => { st[key] = inp.value / 100; save(); }); inp.addEventListener('change', () => sfx(key === 'sfx' ? 'ok' : 'ui'));
        row.append(lab, inp); p.append(row); return inp;
      };
      const sl = [slider('Music', 'music'), slider('Effects', 'sfx'), slider('Ambience', 'amb')];
      const tog = (label, get, set) => {
        const row = h('div', 'row'); row.append(h('label', '', label));
        const b = this.btn(get(), () => { set(); b.textContent = get(); save(); LF.refreshTouch && LF.refreshTouch(); }, 'tog sm'); row.append(b); p.append(row); items.push(b);
      };
      tog('Mute all', () => st.mute ? 'ON' : 'OFF', () => { st.mute = !st.mute; });
      tog('Screen shake', () => st.shake ? 'ON' : 'OFF', () => { st.shake = !st.shake; });
      tog('Reduce flashes', () => st.reduce ? 'ON' : 'OFF', () => { st.reduce = !st.reduce; });
      tog('Touch controls', () => st.touch.toUpperCase(), () => { st.touch = { auto: 'on', on: 'off', off: 'auto' }[st.touch]; });
      tog('Screen', () => st.view === 'rotate' ? 'ROTATE' : 'FIT', () => { st.view = st.view === 'rotate' ? 'fit' : 'rotate'; LF.resize && LF.resize(); });
      tog('Button size', () => ({ s: 'SMALL', m: 'MEDIUM', l: 'LARGE' })[st.tsize] || 'MEDIUM', () => { st.tsize = { s: 'm', m: 'l', l: 's' }[st.tsize] || 'l'; });
      let fs = LF.isFullscreen && LF.isFullscreen(); // fullscreen switches asynchronously, so track the requested state for the label
      if (LF.canFullscreen && LF.canFullscreen()) tog('Fullscreen', () => fs ? 'ON' : 'OFF', () => { fs = !fs; LF.toggleFullscreen(); });
      p.append(h('div', 'hint', 'Screen ROTATE turns the game sideways on a portrait phone, so it fills the screen held in landscape.'));
      const bk = this.btn('Back', () => { sfx('back'); back && back(); }); p.append(h('div', 'hint', '')); const mw = h('div', 'menu'); mw.style.margin = '.6em auto 0'; mw.append(bk); p.append(mw);
      s.append(p); this.show(s); items.push(bk);
      this.setNav(items, a => { if (a === 'pause') { bk.click(); return true; } if (a === 'left' || a === 'right') { const b = items[this.nav.sel]; if (b && b.classList.contains('tog')) b.click(); return true; } return false; });
    },

    /* ---------- how to play ---------- */
    helpHTML() {
      return '<div class="cols"><div class="col"><h3>Keyboard</h3>' +
        [['Move', 'A / D · ← →'], ['Jump (hold = higher)', 'Space · Z · K'], ['Strike (+ ↑/↓ aim)', 'X · J · Enter'], ['Ember Shot (hold = Lance)', 'G · B · O'], ['Dash', 'C · Shift · L'], ['Interact / Read / Talk', '↑ · W · E'], ['Kindle (heal)', 'Hold ↓ on ground'], ['Flare (needs gauge)', 'V · F · Q'], ['Pause / Menu', 'Esc · P'], ['Map · Charms', 'M · I / Tab']].map(r => '<div class="stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') +
        '</div><div class="col"><h3>Tips</h3><div class="entry">Light <b>shrines</b> to save and heal. Dying drops your embers where you fell; recover them.</div><div class="entry">Strike <b>down</b> in the air to bounce off foes and spikes.</div><div class="entry">Cracked walls break with 3 strikes. <b>Orange</b> cracks need the Dash. Some walls are only illusions.</div><div class="entry">Hits fill your <b>Flare</b> gauge. Spend it to blast nearby foes. Strike an incoming shot to <b>deflect</b> it back; strike just as it arrives for a perfect parry. Chain kills for bonus embers, and watch for <b>elite</b> foes with glowing auras.</div><div class="entry"><b>Seasonal boards:</b> after the Thornmother a storm portal opens in the Glade. Clear it to unlock the snow portal. Both are replayable bonus boards.</div><div class="entry"><b>Install:</b> use your browser menu (Install app, or Add to Home Screen). Lanternfall then plays offline.</div><div class="entry">Moths, heart fragments and charms hide in secret places. Gamepads work too.</div></div></div>';
    },
    help(back) {
      const s = h('div', 'screen dim'), p = h('div', 'panel'); p.append(h('h2', '', 'How to Play')); p.insertAdjacentHTML('beforeend', this.helpHTML());
      const bk = this.btn('Back', () => { sfx('back'); back(); }), mw = h('div', 'menu'); mw.style.margin = '.8em auto 0'; mw.append(bk); p.append(mw); s.append(p); this.show(s); this.setNav([bk], a => { if (a === 'pause') { bk.click(); return true; } return false; });
    }
  };
})();
