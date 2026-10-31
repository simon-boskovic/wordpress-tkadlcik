// Mobile menu (design: .top[data-open], .menu-btn aria-expanded, Escape closes).
// Closing returns focus to the button; following a link (incl. same-page anchors) closes the menu;
// the menu also closes when the viewport grows past the mobile breakpoint (820 px, site.css).
(function () {
  var top = document.querySelector('.top');
  var btn = top && top.querySelector('.menu-btn');
  var menu = document.getElementById('mnav');
  if (!top || !btn || !menu) return;

  function isOpen() { return top.getAttribute('data-open') === 'true'; }
  // While the overlay is open, the page behind it is inert (no tabbing into hidden content).
  var behind = Array.prototype.slice.call(document.querySelectorAll('main, .foot'));
  function set(open, focusBtn) {
    top.setAttribute('data-open', open ? 'true' : 'false');
    behind.forEach(function (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open && focusBtn) btn.focus();
  }

  btn.addEventListener('click', function () { set(!isOpen(), false); });
  top.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); set(false, true); }
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) set(false, false);
  });

  var mq = window.matchMedia('(max-width: 820px)');
  var onChange = function () { if (!mq.matches && isOpen()) set(false, false); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);

  // Back/forward cache: never restore a page with the menu open.
  window.addEventListener('pageshow', function (e) { if (e.persisted && isOpen()) set(false, false); });
})();
