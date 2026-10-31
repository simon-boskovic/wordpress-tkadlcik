/**
 * Site-wide data from the prototype's shared header/footer (Main.dc.html .top / .mnav / footer.foot), written to
 * the theme's data/site.json for header.php, footer.php and the JSON-LD (inc/seo.php).
 *
 * NOTE: the phone is kept exactly as the design has it ("+420 773 287 1113": 10 digits after +420, a Czech
 * number has 9). To be confirmed by the client; change it here AND in the page markup (generate.mjs checks
 * that every tel:/mailto: link on the pages matches these values).
 */
export const contact = {
  name: 'Mgr. Daniel Tkadlčík',
  person: 'Daniel Tkadlčík',
  phone: '+420 773 287 1113',
  phoneHref: 'tel:+4207732871113',
  email: 'tkadlcik@centrum.cz',
};

/**
 * The two places the lessons happen (`key` = the place's tab panel id on /kurzy-a-lekce/: #praha, #zlin;
 * `city` as the site prints it, `locality` = the postal town for the JSON-LD address). `map` is the address the click-to-load Google map and the "Otevřít
 * v Google Maps" link search for (fragments.mjs mapBox; also the JSON-LD hasMap).
 */
export const places = [
  { key: 'praha', name: 'Tělocvična ZŠ Jeremenkova', street: 'Jeremenkova 1003/66A', city: 'Praha 4', locality: 'Praha', line: 'Tělocvična ZŠ Jeremenkova, Jeremenkova 1003/66A', map: 'Jeremenkova 1003/66A, Praha 4' },
  { key: 'zlin', name: 'Centrum Jiný svět', street: 'Osvoboditelů 484', city: 'Zlín', locality: 'Zlín', line: 'Centrum Jiný svět, Osvoboditelů 484, Zlín', map: 'Osvoboditelů 484, Zlín' },
];

/** Google Maps URLs for an address: the embed (requested only after the visitor's click) and the plain link. */
export const mapsEmbedUrl = (address) => `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=m&z=16&output=embed&iwloc=near`;
export const mapsLinkUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Header nav (desktop + mobile menu); the last item is the Kontakt button. */
export const nav = [
  { href: '/', label: 'Domů' },
  { href: '/cviceni/', label: 'Cvičení' },
  { href: '/kurzy-a-lekce/', label: 'Nabídka kurzů a lekcí' },
  { href: '/akce/', label: 'Akce' },
  { href: '/o-mne/', label: 'O mně' },
  { href: '/clanky/', label: 'Články' },
  { href: '/kontakt/', label: 'Kontakt', cta: true },
];

export const brand = { name: 'Radost v pohybu', tagline: 'Čchi-kung a tchaj-ťi' };

/**
 * The operator's identification (§ 435 občanského zákoníku), from the public trade register (živnostenský
 * rejstřík, checked by the user on 31. 10. 2026; see docs/HANDOVER.md). Printed in the footer (footer.php, from
 * data/site.json) and on the privacy page; the JSON-LD legalName/identifier/address (seo.mjs). The register
 * also lists the date of birth: deliberately NOT published anywhere. No DIČ (VAT id) is known: none is stated.
 */
export const business = {
  name: 'Mgr. Daniel Tkadlčík',
  ico: '75979390',
  address: 'Pod vinohradem 68/18, 147 00 Praha 4 – Braník',
  register: 'Zapsán v živnostenském rejstříku, Úřad městské části Praha 4',
};
/** The sídlo split for the schema.org PostalAddress (same facts as business.address). */
export const businessAddress = { streetAddress: 'Pod vinohradem 68/18', postalCode: '147 00', addressLocality: 'Praha', addressRegion: 'Praha 4 – Braník', addressCountry: 'CZ' };

/** The privacy page (builders/zasady.mjs): path, link label (footer) and the date the text takes effect. */
export const privacy = { href: '/zasady-ochrany-osobnich-udaju/', label: 'Zásady ochrany osobních údajů', effectiveDate: '[doplnit: datum spuštění webu]' };

export const footer = {
  about: 'Čchi-kung a tchaj-ťi Radost v pohybu nabízí kurzy, víkendové semináře a individuální cvičení.',
  // The design's footer nav ends with Články (Kontakt has its own column); the privacy page link is appended
  // (not in the design: every page must reach it, it is not in the header nav).
  links: [...nav.filter((l) => !l.cta), { href: privacy.href, label: privacy.label }],
  copyright: '© Mgr. Daniel Tkadlčík',
};
