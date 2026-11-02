// Picture zoom (every page): a [data-tk-zoom] link (the flyers in the reading column) and the stage's zoom button
// (or a click on the stage picture) open the picture full size, in its own colours, in a modal <dialog>: the
// browser traps focus and Escape closes it; a click anywhere or the × closes it too, and focus returns. Without
// JS the flyer link opens the file itself and the stage button stays hidden.
(function () {
  if (typeof HTMLDialogElement !== 'function') return;
  var dlg = null, im = null, cap = null, opener = null;

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'tk-zoom';
    dlg.setAttribute('aria-label', 'Zvětšený obrázek');
    dlg.innerHTML = '<button type="button" class="tk-zoom-close" aria-label="Zavřít">×</button><img alt="" decoding="async"><p class="tk-zoom-cap"></p>';
    im = dlg.querySelector('img');
    cap = dlg.querySelector('.tk-zoom-cap');
    dlg.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('tk-zoom-open');
      im.removeAttribute('src');
      if (opener && opener.focus) opener.focus();
      opener = null;
    });
    document.body.appendChild(dlg);
  }

  // The largest file the picture offers (its srcset's widest candidate, else its src).
  function largest(img) {
    var best = img.currentSrc || img.src, bw = 0;
    (img.getAttribute('srcset') || '').split(',').forEach(function (c) {
      var p = c.trim().split(/\s+/), w = parseInt(p[1], 10);
      if (p[0] && w > bw) { bw = w; best = p[0]; }
    });
    return best;
  }

  function open(src, alt, text, from) {
    if (!dlg) build();
    opener = from || document.activeElement;
    im.src = src;
    im.alt = alt || '';
    cap.textContent = text || '';
    cap.hidden = !text;
    document.documentElement.classList.add('tk-zoom-open');
    dlg.showModal();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-tk-zoom]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var img = a.querySelector('img');
    open(a.href, img ? img.alt : '', '', a);
  });

  var stage = document.querySelector('[data-stage]:not(section)');
  var btn = stage && stage.querySelector('[data-tk-zoom-stage]');
  if (!btn) return;
  btn.hidden = false;
  function openStage() {
    var fig = stage.querySelector('[data-stage-fig][data-active]') || stage.querySelector('[data-stage-fig]');
    var img = fig && fig.querySelector('img');
    if (img) open(largest(img), img.alt, fig.getAttribute('data-cap'), btn);
  }
  btn.addEventListener('click', openStage);
  stage.addEventListener('click', function (e) { if (e.target.tagName === 'IMG') openStage(); });
})();
