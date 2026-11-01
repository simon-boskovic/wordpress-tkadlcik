// Exercise tabs on the home page (square plate): one tab per course switches the picture and the text. Arrow keys,
// Home and End move between tabs (roving tabindex). Without JS every panel and the first picture show.
(function () {
  var root = document.querySelector('[data-plate]');
  if (!root) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-plate-tab]'));
  function select(tab, focus) {
    var key = tab.getAttribute('data-plate-tab');
    tabs.forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-plate-panel]'), function (p) { p.hidden = p.getAttribute('data-plate-panel') !== key; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-plate-pic]'), function (p) { p.hidden = p.getAttribute('data-plate-pic') !== key; });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (j === null) return;
      e.preventDefault();
      select(tabs[(j + tabs.length) % tabs.length], true);
    });
  });
})();
