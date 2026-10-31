// Click-to-load Google map (Nabídka kurzů a lekcí, Kontakt; port of martinadamus assets/js/map.js): nothing is
// requested from Google until the visitor presses "Zobrazit mapu" in a [data-tk-map-box] (build/fragments.mjs
// mapBox). The pressed button disappears with the box, so keyboard focus moves to the new iframe (focusable by
// default; its title names it) instead of falling back to <body>.
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('[data-tk-map]');
  if (!btn) return;
  var box = btn.closest('[data-tk-map-box]');
  if (!box) return;
  var iframe = document.createElement('iframe');
  iframe.className = 'tk-map-frame';
  iframe.title = box.getAttribute('data-title') || 'Mapa';
  iframe.src = box.getAttribute('data-src');
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.allowFullscreen = true;
  box.replaceWith(iframe);
  iframe.focus({ preventScroll: true });
});
