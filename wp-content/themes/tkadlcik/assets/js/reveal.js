// Scroll reveal (design DCLogic initReveal): IntersectionObserver sets [data-visible] once per element,
// 60 ms stagger within a batch (max 4 steps). The pre-hide ([data-reveal-ready] on <html>) is set by the
// inline head script (inc/assets.php), so nothing flashes; without JS nothing is ever hidden.
// site.css swaps the rise animation for a plain fade under prefers-reduced-motion.
(function () {
  var root = document.documentElement;
  if (!('IntersectionObserver' in window)) { root.removeAttribute('data-reveal-ready'); return; }
  root.setAttribute('data-reveal-ready', '');
  root.setAttribute('data-reveal-live', '');

  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty('--reveal-delay', Math.min(n, 4) * 60 + 'ms');
      entry.target.setAttribute('data-visible', '');
      io.unobserve(entry.target);
      n++;
    });
  }, { threshold: 0.12 });

  Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { io.observe(el); });
})();
