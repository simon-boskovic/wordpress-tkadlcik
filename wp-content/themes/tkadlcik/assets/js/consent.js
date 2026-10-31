// Cookie consent helpers on top of Complianz's banner script (port of martinadamus R45). Enqueued only where
// complianz.js runs (inc/consent.php); printed inline at the end of <body> like the other theme scripts, i.e. it runs
// BEFORE the deferred complianz.js — everything that needs Complianz's globals waits for the event or for
// DOMContentLoaded (fired after the deferred scripts ran).
//  - [data-tk-consent-open] (the footer's "Nastavení cookies"): reopen the banner with Complianz's own
//    cmplz_set_banner_status('show') — it traps and moves focus itself. Without JS (or without the banner) the
//    link simply opens the privacy page's cookie section.
//  - Withdrawing statistics consent: Complianz stops loading the Google tag from the next page on, but leaves an
//    already running gtag.js and its _ga cookies alone (its cookie shredder needs "consent per service"). Remove
//    the Google Analytics cookies and reload, so the withdrawal takes effect at once; GA cookies present without
//    statistics consent are removed on every page load.
(() => {
  document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('[data-tk-consent-open]');
    if (!link || typeof window.cmplz_set_banner_status !== 'function' || !document.querySelector('.cmplz-cookiebanner')) return;
    e.preventDefault();
    window.cmplz_set_banner_status('show');
  });

  const GA = /^(_ga|_gid|_gat|_gcl_)/;
  const clearGa = () => {
    const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => GA.test(n));
    const parts = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < parts.length - 1; i++) domains.push(`;domain=.${parts.slice(i).join('.')}`);
    for (const n of names) for (const d of domains) document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${d}`;
    return names.length;
  };

  document.addEventListener('cmplz_status_change', (e) => {
    const d = e.detail || {};
    if (d.category !== 'statistics' || d.value !== 'deny') return;
    const tagRan = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    if (clearGa() || tagRan) setTimeout(() => { clearGa(); location.reload(); }, 300);
  });

  // A banner hidden by the browser (Brave's "block cookie notices", ad-block cosmetic filters) keeps Complianz's
  // focus trap on: Tab would cycle through invisible buttons and the page is unreachable by keyboard. On Tab, if
  // the banner is not actually visible, release Complianz's trap (its own global) before its handler runs; a
  // visible banner keeps its trap.
  const bannerVisible = (b) => {
    if (!b) return false;
    const s = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && r.width > 0 && r.height > 0;
  };
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || typeof window.cmplz_release_focus_trap !== 'function') return;
    const b = document.querySelector('.cmplz-cookiebanner');
    if (!b || bannerVisible(b)) return;
    window.cmplz_release_focus_trap();
    if (b.contains(document.activeElement)) document.activeElement.blur();
  }, true);

  // Leftovers without consent (e.g. _ga set by an earlier setup) are removed once complianz.js has run.
  const leftovers = () => { if (typeof window.cmplz_has_consent === 'function' && !window.cmplz_has_consent('statistics')) clearGa(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', leftovers, { once: true });
  else leftovers();
})();
