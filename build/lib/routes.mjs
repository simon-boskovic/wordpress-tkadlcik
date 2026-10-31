/**
 * Prototype file links -> site paths. The design links pages as "Main.dc.html" (no "./"); both forms are accepted.
 * Slugs are the WordPress page slugs (`domu` is the front page, served at /).
 */
export const ROUTES = {
  '/': 'Main.dc.html',
  '/cviceni/': 'Cviceni.dc.html',
  '/kurzy-a-lekce/': 'Rozvrh.dc.html',
  '/akce/': 'Seminare.dc.html',
  '/o-mne/': 'OMne.dc.html',
  '/clanky/': 'Clanky.dc.html',
  '/kontakt/': 'Kontakt.dc.html',
};

export const FILE_TO_PATH = Object.fromEntries(Object.entries(ROUTES).map(([path, file]) => [file, path]));

/** "Cviceni.dc.html#videa" -> "/cviceni/#videa". tel:, mailto:, http(s), # and / links pass through. */
export function sitePath(href) {
  const m = /^(?:\.\/)?([^/?#:]+\.dc\.html)(\?[^#]*)?(#.*)?$/.exec(href);
  if (!m) return href;
  const path = FILE_TO_PATH[decodeURIComponent(m[1])];
  if (!path) throw new Error(`No route for prototype link ${href}`);
  return path + (m[2] || '') + (m[3] || '');
}
