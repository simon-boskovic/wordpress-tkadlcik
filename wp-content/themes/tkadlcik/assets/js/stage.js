// The picture stage (split-stage direction): the stage shows the picture of the section the reader is in. It
// only changes on the reader's own scroll: on load (and near the top) it always shows the first picture, so a
// short first section never makes the picture jump away by itself. The section counted as current is the last
// one whose top has passed the middle of the screen. Desktop only (the stage is the fixed half above 899 px);
// without JS or on a phone the first picture stays.
(function () {
  var stage = document.querySelector('[data-stage]:not(section)');
  if (!stage) return;
  var figs = {};
  Array.prototype.forEach.call(stage.querySelectorAll('[data-stage-fig]'), function (f) { figs[f.getAttribute('data-stage-fig')] = f; });
  var first = stage.querySelector('[data-stage-first]');
  var sections = Array.prototype.slice.call(document.querySelectorAll('section[data-stage]'));
  var mq = window.matchMedia('(min-width: 900px)');
  var current = stage.querySelector('[data-active]');
  var cap = stage.querySelector('[data-stage-cap]');
  function show(f) {
    if (!f || f === current) return;
    var img = f.querySelector('img');
    if (img && img.loading === 'lazy') img.loading = 'eager';
    if (current) current.removeAttribute('data-active');
    f.setAttribute('data-active', '');
    current = f;
    if (cap) cap.textContent = f.getAttribute('data-cap') || '';
  }
  var ticking = false;
  function update() {
    ticking = false;
    if (!mq.matches) return;
    if (window.scrollY < 40) { show(first); return; }
    var mid = window.innerHeight / 2, key = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= mid) key = sections[i].getAttribute('data-stage');
    }
    show(key ? figs[key] : first);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  // Warm the other pictures once the page is idle, so a crossfade never shows an empty frame.
  var warm = function () { Object.keys(figs).forEach(function (k) { var i = figs[k].querySelector('img'); if (i) i.loading = 'eager'; }); };
  if (mq.matches) { if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 }); else setTimeout(warm, 2000); }
})();
