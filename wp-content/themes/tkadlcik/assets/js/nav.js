// Header menu (port of the martinadamus nav.js): html.tk-menu-open, aria-expanded/-label on the button, the panel
// out of the tab order while closed (inert), the rest of the page inert while open (Tab stays in the header), focus
// to the first link on open and back to the button on Escape, scroll lock on phones/tablets (full-screen panel),
// a click outside or on a link closes it, and it never comes back open from the back/forward cache.
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.menu-btn');
  var panel = document.getElementById('menu-panel');
  if (!btn || !panel) return;
  var header = panel.closest('header');
  var full = window.matchMedia('(max-width: 1180px)');
  var inerted = [];

  function setInert(open) {
    inerted.forEach(function (el) { el.removeAttribute('inert'); });
    inerted = [];
    if (!open) { panel.setAttribute('inert', ''); return; }
    panel.removeAttribute('inert');
    for (var n = header; n && n.parentElement && n !== document.body; n = n.parentElement) {
      Array.prototype.forEach.call(n.parentElement.children, function (s) {
        if (s !== n && !s.hasAttribute('inert') && s.tagName !== 'SCRIPT' && s.tagName !== 'STYLE' && !s.matches('.cmplz-cookiebanner, #cmplz-cookiebanner-container')) { s.setAttribute('inert', ''); inerted.push(s); }
      });
    }
  }
  function isOpen() { return root.classList.contains('tk-menu-open'); }
  function setOpen(open, restoreFocus) {
    var hadFocus = panel.contains(document.activeElement);
    root.classList.toggle('tk-menu-open', open);
    root.style.overflow = open && full.matches ? 'hidden' : '';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    setInert(open);
    if (open) {
      setTimeout(function () { var a = panel.querySelector('a'); if (a) a.focus({ preventScroll: true }); }, 60);
    } else if (restoreFocus && (hadFocus || document.activeElement === document.body)) {
      btn.focus();
    }
  }
  btn.addEventListener('click', function () { setOpen(!isOpen(), true); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false, false); });
  document.addEventListener('click', function (e) { if (isOpen() && !header.contains(e.target)) setOpen(false, false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); setOpen(false, true); } });
  full.addEventListener('change', function () { if (isOpen()) setOpen(false, false); });
  window.addEventListener('pageshow', function (e) { if (e.persisted && isOpen()) setOpen(false, false); });
})();
