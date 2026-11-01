// Breathing guide (the home page's live thing): the disc grows for 5 s (Nádech) and shrinks for 5 s (Výdech); the
// word follows the disc's own CSS animation (read from its currentTime, so they never drift); the counter counts
// breaths. The button stops and resumes it. Without JS the disc still breathes (CSS) and the word reads "Nádech";
// under reduced motion the disc stands still and the button is hidden.
(function () {
  var box = document.querySelector('[data-breath]');
  if (!box) return;
  var btn = document.querySelector('[data-breath-toggle]');
  var count = document.querySelector('[data-breath-count]');
  var disc = box.querySelector('.breath-disc');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) { if (btn) btn.hidden = true; return; }
  var n = 0, last = 'in', paused = false;
  function label(k) { return k === 1 ? '1 dech' : (k >= 2 && k <= 4 ? k + ' dechy' : k + ' dechů'); }
  function tick() {
    var anim = disc && disc.getAnimations ? disc.getAnimations()[0] : null;
    if (anim && anim.currentTime != null) {
      var phase = (anim.currentTime % 10000) < 5000 ? 'in' : 'ex';
      if (phase !== last) {
        box.setAttribute('data-phase', phase);
        if (phase === 'in') { n++; if (count) count.textContent = label(n); }
        last = phase;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  if (btn) btn.addEventListener('click', function () {
    paused = !paused;
    if (paused) box.setAttribute('data-paused', ''); else box.removeAttribute('data-paused');
    btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    btn.textContent = paused ? 'Pokračovat' : 'Zastavit dech';
  });
})();
