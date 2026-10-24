/* Lanternfall - PWA: service worker registration, install prompt, persistent storage */
(function () {
  'use strict';
  const LF = window.LF, pwa = LF.pwa = { deferred: null, installed: false, standalone: false };
  try { pwa.standalone = (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || !!navigator.standalone; } catch (_) {}
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); pwa.deferred = e;
    if (LF.state === 'title' && document.getElementById('title') && LF.UI) LF.UI.title();   // show the Install button
  });
  window.addEventListener('appinstalled', () => { pwa.deferred = null; pwa.installed = true; if (LF.UI) LF.UI.toast('Installed! Find Lanternfall on your home screen.'); });
  pwa.install = async function () {
    const d = pwa.deferred; if (!d) return;
    try { d.prompt(); await d.userChoice; } catch (_) {}
    pwa.deferred = null;
  };
  // keep saves from being evicted by the browser
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {}
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (nw) nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller && LF.UI) LF.UI.toast('Update ready. Reload to play the new version.'); });
        });
      }).catch(e => console.warn('service worker unavailable', e));
    });
  }
})();
