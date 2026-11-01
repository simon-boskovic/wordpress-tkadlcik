/**
 * Site-wide data from the prototype's shared header/footer (Main.dc.html .top / .mnav / footer.foot), written to
 * the theme's data/site.json for header.php, footer.php and the JSON-LD (inc/seo.php).
 *
 * The phone was confirmed by the client on 2026-11-01 (+420 773 287 113; the design's "773 287 1113" had a digit
 * too many). generate.mjs checks that every tel:/mailto: link on the pages matches these values.
 */
export const contact = {
  name: 'Mgr. Daniel Tkadlčík',
  person: 'Daniel Tkadlčík',
  phone: '+420 773 287 113',
  phoneHref: 'tel:+420773287113',
  email: 'tkadlcik@centrum.cz',
};

/**
 * The two places the lessons happen (`key` = the place's tab panel id on /kurzy-a-lekce/: #praha, #zlin;
 * `city` as the site prints it, `locality` = the JSON-LD addressLocality, `street` = its streetAddress). `map` is the address the click-to-load Google map and the "Otevřít
 * v Google Maps" link search for (fragments.mjs mapBox; also the JSON-LD hasMap). `postalCode` and `geo` (5 decimals) from
 * OpenStreetMap Nominatim, house-level matches for both addresses (looked up 1. 11. 2026); `url` = the venue's page.
 */
export const places = [
  { key: 'praha', name: 'Tělocvična ZŠ Jeremenkova', street: 'Jeremenkova 1003/66A', city: 'Praha 4', locality: 'Praha 4', line: 'Tělocvična ZŠ Jeremenkova, Jeremenkova 1003/66A', map: 'Jeremenkova 1003/66A, Praha 4', postalCode: '147 00', geo: [50.04301, 14.42334], url: '/kurzy-a-lekce/#praha' },
  { key: 'zlin', name: 'Centrum Jiný svět', street: 'Osvoboditelů 484', city: 'Zlín', locality: 'Zlín', line: 'Centrum Jiný svět, Osvoboditelů 484, Zlín', map: 'Osvoboditelů 484, Zlín', postalCode: '760 01', geo: [49.22279, 17.66965], url: '/cviceni-ve-zline/' },
];

/** Google Maps URLs for an address: the embed (requested only after the visitor's click) and the plain link. */
export const mapsEmbedUrl = (address) => `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=m&z=16&output=embed&iwloc=near`;
export const mapsLinkUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/**
 * Site navigation. Every label of the old Webnode menu stays (SEO constraint of the redesign brief, 2026-11-01),
 * plus "Domů" (approved). `bar` = shown in the header bar on desktop; all items are in the Menu panel (header) and
 * the footer. The Kontakt item is the header's one action button (`cta`). Order = the menu panel's order.
 */
export const nav = [
  { href: '/', label: 'Domů' },
  { href: '/cviceni/', label: 'Cvičení', bar: true },
  { href: '/videogalerie/', label: 'Videogalerie' },
  { href: '/kurzy-a-lekce/', label: 'Nabídka kurzů a lekcí', bar: true },
  { href: '/cviceni-ve-zline/', label: 'Cvičení ve Zlíně' },
  { href: '/akce/', label: 'Akce', bar: true },
  { href: '/seminar-vincent-chu/', label: 'Seminář s Vincentem Chu' },
  { href: '/cviceni-na-horach/', label: 'Cvičení na horách' },
  { href: '/o-mne/', label: 'O mně', bar: true },
  { href: '/clanky/', label: 'Články' },
  // The header button says what it does and opens the form (approved 2026-11-01); the menu panel and footer keep "Kontakt".
  { href: '/kontakt/', label: 'Kontakt', cta: true, button: 'Napište mi', buttonHref: '/kontakt/#formular' },
];

/**
 * Pictures from open collections (downloaded with tasteskill assets.mjs, credits in build/image-credits.json):
 * shown in the pages' picture stage, credited in the footer (footer.php, data/site.json `credits`). They show the
 * world of the practice (Chinese ink landscapes, morning tai chi in Beijing 1988, Strážné, Zlín), never the
 * client's own lessons or students.
 */
export { default as imageCredits } from './image-credits.json' with { type: 'json' };

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
/** The sídlo split for the schema.org PostalAddress (same facts as business.address: street, PSČ, obec/část as printed). */
export const businessAddress = { streetAddress: 'Pod vinohradem 68/18', postalCode: '147 00', addressLocality: 'Praha 4 – Braník', addressCountry: 'CZ' };

/** The privacy page (builders/zasady.mjs): path, link label (footer) and the date the text takes effect. */
export const privacy = { href: '/zasady-ochrany-osobnich-udaju/', label: 'Zásady ochrany osobních údajů', effectiveDate: '[doplnit: datum spuštění webu]' };

export const footer = {
  about: 'Čchi-kung a tchaj-ťi Radost v pohybu nabízí kurzy, víkendové semináře a individuální cvičení.',
  // Every nav label (Kontakt included) plus the privacy page, which is not in the header menu.
  // The Osm kusů brokátu guide (SEO audit 2026-11-01) is not a header label (the old site's menu stays as it was).
  links: [...nav.slice(0, 2), { href: '/osm-kusu-brokatu/', label: 'Osm kusů brokátu' }, ...nav.slice(2), { href: privacy.href, label: privacy.label }],
  copyright: '© Mgr. Daniel Tkadlčík',
};

/**
 * The instructor's own YouTube channels (JSON-LD Person sameAs). Source: YouTube oEmbed
 * (https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json, fetched 31. 10. 2026):
 *   1nFm6-XwGpU, oZB6Gq4QzC4 -> author_name "Daniel Tkadlčík", author_url https://www.youtube.com/@daniello2151974
 *   1Mmz_QpYk9s, 1UPJuzGC1UY -> author_name "Daniel Tkadlcik", author_url https://www.youtube.com/@danieltkadlcik7684
 * (NeVzb5hGM7A belongs to the third-party channel @Biztraumer: not his.)
 */
export const personSameAs = ['https://www.youtube.com/@daniello2151974', 'https://www.youtube.com/@danieltkadlcik7684'];

/**
 * Upload dates of the Cvičení videos (JSON-LD VideoObject uploadDate), keyed by YouTube id. Source: each watch page
 * https://www.youtube.com/watch?v=<id>, <meta itemprop="uploadDate" content="…"> (= "uploadDate" in its page JSON),
 * fetched 31. 10. 2026. A video without a date here gets no VideoObject (uploadDate is required).
 */
/** Video lengths in seconds ("lengthSeconds" in the watch page JSON, fetched 1. 11. 2026): JSON-LD VideoObject duration. */
export const videoDurations = { '1nFm6-XwGpU': 336, 'NeVzb5hGM7A': 613, 'oZB6Gq4QzC4': 65, '1Mmz_QpYk9s': 645, '1UPJuzGC1UY': 265 };

export const videoUploadDates = {
  '1nFm6-XwGpU': '2020-07-10T04:27:49-07:00',
  'NeVzb5hGM7A': '2007-07-27T09:25:16-07:00',
  'oZB6Gq4QzC4': '2019-08-02T02:39:59-07:00',
  '1Mmz_QpYk9s': '2024-03-13T00:31:56-07:00',
  '1UPJuzGC1UY': '2024-03-13T01:18:28-07:00',
};

/**
 * Dated events the pages show (Akce, the home "Semináře a akce" teaser, the Zlín term on Nabídka kurzů), keyed
 * for builders/ux.mjs: an event whose endDate is before the build date is "past" — its date is muted and gets the
 * "Proběhlo" chip, and past blocks sort after upcoming ones. The build date is fixed at generate time, so after
 * an event date passes the site must be regenerated (`./build/rebuild.sh --pages`, docs/HANDOVER.md).
 * Dates exactly as the pages print them (`text`); nothing inferred beyond them.
 */
export const EVENTS = {
  chu: { startDate: '2025-11-27', endDate: '2025-11-29', text: '27. 11. – 29. 11. 2025' },
  'hory-jaro': { startDate: '2024-05-10', endDate: '2024-05-12', text: '10. – 12. 5. 2024' },
  // Printed "30. 7. neděle – 7. 7. 2024 neděle" (inconsistent, awaits the client): the stated end date is used;
  // every reading of it ends in summer 2024.
  'hory-leto': { endDate: '2024-07-07', text: '30. 7. neděle – 7. 7. 2024 neděle' },
  'zlin-termin': { startDate: '2024-04-19', endDate: '2024-04-19', text: 'pátek 19. 4. 2024, od 17:30 do 20:00h' },
  // Owner's "Rozpis cvičení" (PDF, 1. 11. 2026): all-day Sunday sessions in Praha 4.
  'nedele-11': { startDate: '2026-11-15', endDate: '2026-11-15', text: '15. 11. 2026' },
  'nedele-12': { startDate: '2026-12-13', endDate: '2026-12-13', text: '13. 12. 2026' },
};

/** Today's date in Prague as YYYY-MM-DD. */
export const pragueDate = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
/** The build date the past/upcoming split uses (TK_TODAY=YYYY-MM-DD overrides it, e.g. to preview a future state). */
export const today = /^\d{4}-\d{2}-\d{2}$/.test(process.env.TK_TODAY || '') ? process.env.TK_TODAY : pragueDate();
/** True when every listed event has ended before `day` (an event on `day` itself is not past; no events = never past). */
export const isPast = (keys, day = today) => keys.length > 0 && keys.every((k) => {
  if (!EVENTS[k]) throw new Error(`content: unknown event ${k}`);
  return EVENTS[k].endDate < day;
});
