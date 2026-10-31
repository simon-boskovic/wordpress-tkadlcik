// Page-to-page transitions (cross-document View Transitions API), port of martinadamus assets/js/vt.js (R59):
// - opt-in through @view-transition{navigation:auto} on every page (same-origin navigations only);
// - the header pill (.bar, "site-header") stays put: it is the same on every page, so it neither morphs nor fades;
// - the current-page highlight of the desktop nav ("nav-current", the .tk-nav-pill inside the aria-current link)
//   slides from the old page's item to the new one; with no counterpart (Domů -> Kontakt, whose button is not a
//   pill) it just fades;
// - the rest of the page cross-fades with a small rise (back navigation: a small drop), transform/opacity only;
// - prefers-reduced-motion: reduce -> no animation at all (the page swaps instantly).
// Runs synchronously in <head> (inc/assets.php), so the opt-in and the pagereveal listener exist before the
// first render. No line inside the CSS array starts with "//" (the inline copy drops such lines).
(function () {
  var EASE = 'cubic-bezier(.23,1,.32,1)';
  var css = document.createElement('style');
  css.id = 'tk-vt-css';
  css.textContent = [
    '@view-transition{navigation:auto}',
    '.top>.bar{view-transition-name:site-header}',
    '.bar .nav .tk-nav-pill{view-transition-name:nav-current}',
    '::view-transition-old(root){animation:160ms ' + EASE + ' both tk-vt-out}',
    '::view-transition-new(root){animation:260ms ' + EASE + ' both tk-vt-in}',
    'html:active-view-transition-type(back)::view-transition-new(root){animation-name:tk-vt-in-back}',
    '::view-transition-group(site-header){animation:none;z-index:2}',
    '::view-transition-old(site-header){animation:120ms ease both tk-vt-out}',
    '::view-transition-new(site-header){animation:none}',
    '::view-transition-group(nav-current){animation-duration:340ms;animation-timing-function:' + EASE + ';z-index:3}',
    '::view-transition-old(nav-current),::view-transition-new(nav-current){width:100%;height:100%}',
    '::view-transition-old(nav-current):only-child{animation:140ms ease both tk-vt-out}',
    '::view-transition-new(nav-current):only-child{animation:220ms ease both tk-vt-fade-in}',
    '@keyframes tk-vt-out{to{opacity:0}}',
    '@keyframes tk-vt-in{from{opacity:0;transform:translateY(8px)}}',
    '@keyframes tk-vt-in-back{from{opacity:0;transform:translateY(-8px)}}',
    '@keyframes tk-vt-fade-in{from{opacity:0}}',
    '@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  // A browser without cross-document transitions simply navigates.
  if (!('onpageswap' in window)) return;

  // Back/forward in history: the "back" type flips the rise of the new page into a drop.
  function isBack(act) {
    return !!(act && act.navigationType === 'traverse' && act.from && act.entry && act.entry.index < act.from.index);
  }

  // Leaving the page.
  window.addEventListener('pageswap', function (e) {
    if (e.viewTransition && isBack(e.activation)) e.viewTransition.types.add('back');
  });

  // Arriving on the page (before its first render).
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    if (isBack(window.navigation && navigation.activation)) e.viewTransition.types.add('back');
    window.__tkVtArrived = true;
  });
})();
