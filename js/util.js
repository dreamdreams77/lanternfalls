/* Lanternfall - core utilities: namespace, math, RNG, input */
(function () {
  'use strict';
  const LF = window.LF = window.LF || {};
  LF.W = 320; LF.H = 180; LF.T = 16;

  LF.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  LF.lerp = (a, b, t) => a + (b - a) * t;
  LF.rand = (a, b) => a + Math.random() * (b - a);
  LF.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  LF.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  LF.approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
  LF.sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;
  LF.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  LF.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // Seeded RNG (mulberry32) for stable procedural art
  LF.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  LF.hash = function (x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // Tiny event bus
  LF.bus = {
    h: {},
    on(n, f) { (this.h[n] = this.h[n] || []).push(f); },
    emit(n, a) { (this.h[n] || []).forEach(f => f(a)); }
  };

  /* ---------------- Input ---------------- */
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', KeyE: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyX: 'attack', KeyJ: 'attack', Enter: 'attack', KeyG: 'shoot', KeyB: 'shoot', KeyO: 'shoot',
    KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyV: 'flare', KeyF: 'flare', KeyQ: 'flare', Escape: 'pause', KeyP: 'pause', KeyM: 'map', Tab: 'inv', KeyI: 'inv'
  };
  const In = LF.input = {
    down: {}, pressed: {}, released: {}, buf: {}, locked: false, lastDevice: 'kb',
    isDown(a) { return !!this.down[a]; },
    hit(a) { return !!this.pressed[a]; },
    set(a, v, dev) {
      if (v) { if (!this.down[a]) this.pressed[a] = true; this.down[a] = true; }
      else { if (this.down[a]) this.released[a] = true; this.down[a] = false; }
      if (dev) this.lastDevice = dev;
    },
    endFrame() { this.pressed = {}; this.released = {}; },
    clear() { this.down = {}; this.pressed = {}; this.released = {}; },
    get axis() { return (this.down.right ? 1 : 0) - (this.down.left ? 1 : 0); }
  };
  window.addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    In.set(a, true, 'kb');
    LF.bus.emit('key', { action: a, code: e.code });
  });
  window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) In.set(a, false); });
  window.addEventListener('blur', () => In.clear());

  // Touch / pointer buttons
  LF.initTouch = function () {
    const root = document.getElementById('touch');
    const active = new Map();
    root.querySelectorAll('.tbtn').forEach(b => {
      const k = b.dataset.k;
      const press = e => {
        e.preventDefault(); In.set(k, true, 'touch'); b.classList.add('on'); active.set(e.pointerId, b);
        try { b.setPointerCapture(e.pointerId); } catch (_) {}
        LF.bus.emit('key', { action: k, code: 'touch' });
      };
      const rel = e => { In.set(k, false); b.classList.remove('on'); active.delete(e.pointerId); };
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', rel);
      b.addEventListener('pointercancel', rel);
      b.addEventListener('lostpointercapture', rel);
    });
    const show = () => { root.classList.toggle('hidden', !LF.touchOn()); root.classList.toggle('mini', LF.state === 'mini'); root.style.setProperty('--tb', { s: .85, m: 1, l: 1.22 }[(LF.settings || {}).tsize] || 1); };
    LF.refreshTouch = show;
    window.addEventListener('touchstart', () => {
      if (!LF.touchDetected) { LF.touchDetected = true; show(); } In.lastDevice = 'touch';
    }, { passive: true });
    show();
  };
  LF.touchOn = () => {
    const s = LF.settings;
    if (s && s.touch === 'on') return LF.state === 'play' || LF.state === 'paused' || LF.state === 'mini';
    if (s && s.touch === 'off') return false;
    return !!LF.touchDetected && (LF.state === 'play' || LF.state === 'mini');
  };

  // Gamepad (optional, standard mapping)
  const padPrev = {};
  LF.pollPad = function () {
    if (LF.padBlocked) return;
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (_) { LF.padBlocked = true; return; }
    const p = pads && pads[0];
    if (!p) return;
    const b = i => p.buttons[i] && p.buttons[i].pressed;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const m = {
      left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), up: ay < -0.6 || b(12), down: ay > 0.6 || b(13),
      jump: b(0), attack: b(2), shoot: b(1), dash: b(5) || b(7) || b(3), flare: b(4) || b(6), pause: b(9), map: b(8)
    };
    for (const k in m) {
      if (m[k] !== !!padPrev[k]) { In.set(k, m[k], 'pad'); if (m[k]) LF.bus.emit('key', { action: k, code: 'pad' }); }
      padPrev[k] = m[k];
    }
  };
})();
