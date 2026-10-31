// Praha 4 / Zlín tabs on Nabídka kurzů a lekcí (design: Rozvrh.dc.html).
// WAI-ARIA tabs: aria-selected + roving tabindex, Left/Right/Home/End move and activate.
// site.css animates the dark pill with clip-path ([data-tab] on .tabs) and cross-fades the panels
// ([data-tab] on .tab-panels). Inactive panels get visibility:hidden from the CSS, so they leave the a11y tree.
// Deep links: a URL hash naming a panel (#zlin, #praha), an element inside one, or a tab's data-tab-target
// opens that panel on load and on hashchange and scrolls it into view (site.css gives the panels the sticky
// header's scroll-margin-top). Without JS both panels are shown and the browser scrolls to the anchor itself.
(function () {
  var list = document.querySelector('.tabs[role=tablist]');
  var panels = document.querySelector('.tab-panels');
  if (!list || !panels) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role=tab]'));

  function select(tab, focus) {
    var name = tab.getAttribute('data-tab-target');
    list.setAttribute('data-tab', name);
    panels.setAttribute('data-tab', name);
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) { if (on) panel.removeAttribute('inert'); else panel.setAttribute('inert', ''); }
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  });

  // The tab a hash points to, or null: the panel (or an element inside it) with that id, else data-tab-target.
  function tabForHash() {
    var id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return null; }
    if (!id) return null;
    var el = document.getElementById(id);
    var panel = el && panels.contains(el) ? el.closest('[role=tabpanel]') : null;
    return tabs.filter(function (t) {
      return panel ? t.getAttribute('aria-controls') === panel.id : t.getAttribute('data-tab-target') === id;
    })[0] || null;
  }

  // An instant jump, like the browser's own anchor scroll it corrects (no motion to reduce).
  function openFromHash() {
    var tab = tabForHash();
    if (!tab) return false;
    select(tab, false);
    // The panels share one grid cell, so the container's top is the panel's (without the panel's 6 px entry shift).
    // Again in the next frame: the browser's own anchor scroll can land after this handler and aims at the
    // panel's pre-transition (shifted) box.
    panels.scrollIntoView({ block: 'start' });
    requestAnimationFrame(function () { panels.scrollIntoView({ block: 'start' }); });
    return true;
  }

  window.addEventListener('hashchange', openFromHash);

  if (!openFromHash()) select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
})();
