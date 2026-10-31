/**
 * SEO outputs for the generator (port of martinadamus build/seo.mjs):
 *   buildSeo    -> build/seo.json          (wp tk seo-setup -> The SEO Framework)
 *   buildSchema -> theme data/schema.json  (inc/seo.php prints one JSON-LD @graph per page)
 *   buildLlms   -> theme data/llms.txt     (inc/seo.php serves /llms.txt, {{home}} = home_url())
 * Site URLs are written as paths ("/akce/"); PHP resolves them with home_url(), so the same data is right on
 * localhost and on the production domain. Nothing is invented: every fact in llms.txt is checked against
 * the generated page text (buildLlms throws on a fact the pages do not contain).
 */
import { EVENTS, mapsLinkUrl } from './content.mjs';
import { VIDEOS } from './builders/cviceni.mjs';
import { PHOTOS, youtubeEmbedUrl, youtubeWatchUrl } from './fragments.mjs';

/** Brand suffix of every title (= WordPress blogname = og:site_name = the JSON-LD WebSite/Organization name). */
export const TITLE_SUFFIX = ' | Radost v pohybu';
/**
 * Upload file names of the share images. Social scrapers mishandle WebP, so these are JPGs in client-files/
 * (imported as-is by `wp tk media-import --files-dir`): og-default.jpg = client-img/og-default.png exported at
 * 1200x630 (q85); og-o-mne.jpg = the portrait cropped to 1200x630 around the face (O mně only).
 */
export const OG_IMAGE = 'og-default.jpg';
export const OG_IMAGES = { 'o-mne': 'og-o-mne.jpg' };
/** og:image:alt per share image (seo-setup writes it to the attachment's alt text). */
export const OG_ALT = { 'og-default.jpg': 'Radost v pohybu – čchi-kung a tchaj-ťi, Praha 4 a Zlín', 'og-o-mne.jpg': 'Daniel Tkadlčík, lektor tchaj-ťi' };
/** Title limits: the complete <title> incl. the suffix (Google shows ~60 chars), description 120–155 chars. */
export const TITLE_MAX = 64;
export const DESCRIPTION_RANGE = [120, 155];

/**
 * Title + meta description per page slug (written to build/seo.json for `wp tk seo-setup`). Metadata, not design
 * copy: written from facts the pages state (the visible H1s stay the design's). The international spellings
 * "tai chi" / "qigong" appear only here, as variants in brackets ("tchaj-ťi (tai chi)", "čchi-kung (qigong)");
 * Zlín is named where the page covers it. No phone number and no prices (both await the client).
 * Every title ends with TITLE_SUFFIX (seo-setup sets _tsf_title_no_blogname, so seo.json holds the complete title).
 */
export const SEO = {
  domu: {
    title: `Tchaj-ťi (tai chi) a čchi-kung Praha 4 a Zlín${TITLE_SUFFIX}`,
    description: 'Kurzy tchaj-ťi (tai chi) a čchi-kungu (qigong) v Praze 4 a ve Zlíně: Osm kusů brokátu, 13 slov tchaj-ťi a styl Yang podle mistra Vincenta Chu.',
  },
  cviceni: {
    title: `Osm kusů brokátu, 13 slov a styl Yang${TITLE_SUFFIX}`,
    description: 'Cvičení, která vyučujeme: čchi-kung (qigong) Osm kusů brokátu, 13 slov tchaj-ťi a tchaj-ťi (tai chi) stylu Yang – popis, sestavy a videogalerie.',
  },
  'kurzy-a-lekce': {
    title: `Kurzy tai chi a čchi-kungu Praha 4 a Zlín${TITLE_SUFFIX}`,
    description: 'Rozvrh a ceny kurzů tchaj-ťi (tai chi) a čchi-kungu (qigong): lekce 90 a 120 minut v tělocvičně ZŠ Jeremenkova v Praze 4 a jednou měsíčně ve Zlíně.',
  },
  akce: {
    title: `Semináře s Vincentem Chu a Krkonoše${TITLE_SUFFIX}`,
    description: 'Semináře tchaj-ťi (tai chi) s mistrem Vincentem Chu v Praze a cvičení tchaj-ťi a čchi-kungu (qigong) na horách v Krkonoších – Strážné, Penzion Exnar.',
  },
  'o-mne': {
    title: `Mgr. Daniel Tkadlčík – lektor tchaj-ťi od 1997${TITLE_SUFFIX}`,
    description: 'Mgr. Daniel Tkadlčík se věnuje tchaj-ťi (tai chi) od roku 1997, od roku 2007 rodinnému stylu Yang u mistra Vincenta Chu. Učí i čchi-kung (qigong).',
  },
  clanky: {
    title: `Články o tchaj-ťi a čchi-kungu${TITLE_SUFFIX}`,
    description: 'Co je čchi-kung (qigong) a tchaj-ťi (tai chi), 10 principů mistra Yang Cheng Fu a Pojednání o Wu-ťi (WuChi) – články a texty ke stažení.',
  },
  kontakt: {
    title: `Kontakt – tchaj-ťi a čchi-kung Praha 4 a Zlín${TITLE_SUFFIX}`,
    description: 'Kontakt na lektora tchaj-ťi (tai chi) a čchi-kungu (qigong) Mgr. Daniela Tkadlčíka. Cvičíme v ZŠ Jeremenkova v Praze 4 a v Centru Jiný svět ve Zlíně.',
  },
  'zasady-ochrany-osobnich-udaju': {
    title: `Zásady ochrany osobních údajů${TITLE_SUFFIX}`,
    description: 'Jak Radost v pohybu, kurzy tchaj-ťi a čchi-kungu (qigong), zpracovává osobní údaje: správce, účely, doba uchování, cookies, Google Analytics a vaše práva.',
  },
};

/**
 * Pages served with robots "noindex, follow" (martinadamus Ruling R21): still a self-referencing canonical
 * (theme inc/seo.php tk_force_canonical_on_noindex), left out of sitemap.xml (TSF skips noindex pages) and
 * out of llms.txt. The privacy page is legal boilerplate, not something to rank or summarise.
 */
export const NOINDEX = new Set(['zasady-ochrany-osobnich-udaju']);

/**
 * seo.json for the given pages (+ the share image's upload file name as `og` on every page); throws when a page
 * has no entry, an entry has no page, a title lacks the suffix or is too long, or a description is out of range.
 */
export function buildSeo(pages, { og = OG_IMAGE } = {}) {
  const out = {};
  const [dMin, dMax] = DESCRIPTION_RANGE;
  for (const p of pages) {
    const s = SEO[p.slug];
    if (!s) throw new Error(`seo: no title/description for ${p.slug}`);
    if (!s.title.endsWith(TITLE_SUFFIX)) throw new Error(`seo: title of ${p.slug} does not end with "${TITLE_SUFFIX}"`);
    if (s.title.length > TITLE_MAX) throw new Error(`seo: title of ${p.slug} is ${s.title.length} chars (max ${TITLE_MAX})`);
    if (s.description.length < dMin || s.description.length > dMax) throw new Error(`seo: description of ${p.slug} is ${s.description.length} chars (${dMin}–${dMax})`);
    out[p.slug] = { title: s.title, description: s.description, robots: NOINDEX.has(p.slug) ? ['noindex', 'follow'] : ['index', 'follow'], ...(og ? { og: OG_IMAGES[p.slug] || og } : {}) };
    if (out[p.slug].og && OG_ALT[out[p.slug].og]) out[p.slug].og_alt = OG_ALT[out[p.slug].og];
  }
  for (const slug of Object.keys(SEO)) if (!out[slug]) throw new Error(`seo: entry ${slug} has no page`);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const pathOf = (p) => (p.front_page ? '/' : `/${p.slug}/`);

/**
 * The seminars on Akce (Seminare.dc.html), as dated events. Only those starting on or after the build date are
 * emitted as schema.org Events (a past event in structured data is misleading). The design's are all past
 * (2024/2025), so none is emitted today; a new seminar added to the Akce page belongs here too.
 * The summer course is left out on purpose: its dates in the design are inconsistent ("30. 7. – 7. 7. 2024").
 * Dates come from content.mjs EVENTS (the same data marks past events "Proběhlo" on the pages, builders/ux.mjs).
 */
export const SEMINARS = [
  { name: 'Seminář s mistrem Vincentem Chu v Praze', startDate: EVENTS.chu.startDate, endDate: EVENTS.chu.endDate, place: 'praha', text: EVENTS.chu.text },
  { name: 'Jarní cvičení na horách', startDate: EVENTS['hory-jaro'].startDate, endDate: EVENTS['hory-jaro'].endDate, price: 3800, location: { name: 'Penzion Exnar', addressLocality: 'Strážné', streetAddress: 'Strážné 2' }, text: `Termín: ${EVENTS['hory-jaro'].text}` },
];

/** Page text (tags stripped, entities decoded, whitespace collapsed) — what the visitor reads. */
export function pageText(pages) {
  const html = pages.flatMap((p) => p.elements.map((e) => e.elements[0].settings.html)).join('\n');
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

/** Lesson prices per place for the JSON-LD priceRange (as the Ceny section prints them; checked against the page text). */
export const PRICE_RANGE = { praha: { range: '350–3 250 Kč', facts: ['350 Kč', '3 250 Kč'] }, zlin: { range: '400 Kč', facts: ['400 Kč'] } };

/** Vincent Chu and his school, as the pages name them (Cvičení #yang, Domů, O mně). */
export const LINEAGE = ['Yang Sau Chung', 'Chu Gin Soon', 'Vincent Chu', 'Daniel Tkadlčík'];
export const FEDERATION = { name: 'Gin Soon Tai Chi Chuan Federation', url: 'https://www.gstaichi.org/' };

/** Person description: verbatim sentences from O mně. */
const PERSON_DESCRIPTION = ['Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997.', 'Mým hlavním tématem je propojení meditací, cvičení tchaj-ťi a čchi-kungu.'];
/** Place descriptions: verbatim sentences about each place (Kontakt for Praha, the Zlín panel on Nabídka kurzů). */
export const PLACE_DESCRIPTION = {
  praha: ['Kurzy probíhají na adrese ZŠ Jeremenkova, Jeremenkova 1003/66A.'],
  zlin: ['Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek.', 'Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.'],
};
/** VideoObject description where the page has a fuller sentence next to the video (else the caption). */
const VIDEO_DESCRIPTION = { '1Mmz_QpYk9s': 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje.' };

/** The portrait on O mně as an image node (media-import: WebP, longest edge 1600 px). Person image + ProfilePage primaryImageOfPage. */
const portraitSize = (({ w, h }) => { const k = Math.min(1, 1600 / Math.max(w, h)); return { width: Math.round(w * k), height: Math.round(h * k) }; })(PHOTOS.portret);
export const PORTRAIT = {
  '@type': 'ImageObject', '@id': '/#portrait', url: '/wp-content/uploads/daniel-tkadlcik-portret.webp', contentUrl: '/wp-content/uploads/daniel-tkadlcik-portret.webp',
  ...portraitSize, caption: PHOTOS.portret.alt,
};
const VINCENT_DESCRIPTION = 'Výuka probíhá dle instrukcí a předání od mistra Vincenta Chu, který je hlavním instruktorem a mistrem bostonské školy Gin Soon Tai Chi Chuan Federation';

/** Visible text of one page (tags stripped, entities decoded, whitespace collapsed). */
const textOf = (page) => pageText([page]);

/** The forms marked "Vyučuji" on Cvičení (#yang list), in page order. */
export function taughtForms(pages) {
  const p = pages.find((x) => x.slug === 'cviceni');
  if (!p) return [];
  const html = p.elements.map((e) => e.elements[0].settings.html).join('\n');
  return [...html.matchAll(/<li\b[^>]*><span>([^<]+)<\/span><span class="chip">Vyučuji<\/span><\/li>/g)].map((m) => m[1]);
}

/**
 * The operator's legal identification for the Organization node (content.mjs business, from the trade
 * register): legalName, the IČO as a PropertyValue and the sídlo as its PostalAddress. Each fact must be on the
 * pages (the privacy page states them). No vatID: no DIČ is known. The training venues stay separate places.
 */
export function legalData(content, fact = (s) => s) {
  const b = content.business;
  const a = content.businessAddress;
  if (`${a.streetAddress}, ${a.postalCode} ${a.addressLocality}` !== b.address) throw new Error('schema: content.businessAddress does not match business.address');
  fact(b.address);
  return {
    legalName: fact(b.name),
    identifier: { '@type': 'PropertyValue', propertyID: 'IČO', value: fact(b.ico) },
    address: { '@type': 'PostalAddress', ...a },
  };
}

/**
 * One JSON-LD @graph per page slug: Organization (Radost v pohybu) + its two places (SportsActivityLocation, a
 * LocalBusiness subtype), Person (Daniel Tkadlčík), Vincent Chu (Person, affiliated with his federation),
 * WebSite, the page's WebPage (ContactPage / ProfilePage) and, below the front page, its BreadcrumbList; on Akce
 * the future seminars as Events. inc/seo.php adds the page's dateModified and the organisation logo (the site
 * icon) at print time and absolutizes the paths.
 * On Cvičení the gallery videos as VideoObjects (name/description = the caption on the page, self-hosted thumbnail,
 * upload date from content.videoUploadDates; a video without a date is left out), referenced by the page's `video`.
 * Deliberately absent: Course/CourseInstance/openingHours (the schedule in the design is contradictory, pending
 * the client), postalCode/geo of the venues (unknown), Events for past dates.
 *
 * @param {object[]} pages page definitions
 * @param {{ content: object, today?: string }} opts content.mjs; today = YYYY-MM-DD (default: the build date)
 */
export function buildSchema(pages, { content, today = new Date().toISOString().slice(0, 10) }) {
  const c = content.contact;
  const phone = c.phoneHref.replace(/^tel:/, '');
  // Breadcrumb names: the header nav labels, plus footer-only pages (the privacy page).
  const label = Object.fromEntries([...content.footer.links, ...content.nav].map((l) => [l.href, l.label]));
  const text = pageText(pages);
  const fact = (s) => {
    if (!text.includes(s)) throw new Error(`schema: "${s}" is not in the page text`);
    return s;
  };
  const placeNode = (pl) => {
    const price = PRICE_RANGE[pl.key];
    if (!price) throw new Error(`schema: no priceRange for place ${pl.key}`);
    price.facts.forEach(fact);
    return {
      '@type': 'SportsActivityLocation', '@id': `/#${pl.key}`, name: `${content.brand.name} – ${pl.name}`,
      description: PLACE_DESCRIPTION[pl.key].map(fact).join(' '), url: `/kurzy-a-lekce/#${pl.key}`, telephone: phone, email: c.email,
      address: { '@type': 'PostalAddress', streetAddress: fact(pl.street), addressLocality: pl.locality, addressCountry: 'CZ' },
      priceRange: price.range, currenciesAccepted: 'CZK',
      hasMap: mapsLinkUrl(pl.map), parentOrganization: { '@id': '/#organization' },
    };
  };
  for (const pl of content.places) if (!PLACE_DESCRIPTION[pl.key]) throw new Error(`schema: no description for place ${pl.key}`);
  const places = content.places.map(placeNode);
  const organization = {
    '@type': 'Organization', '@id': '/#organization', name: content.brand.name, alternateName: `${content.brand.tagline} ${content.brand.name}`,
    description: content.footer.about, url: '/', email: c.email, telephone: phone,
    areaServed: content.places.map((pl) => pl.city),
    founder: { '@id': '/#daniel' }, location: places.map((pl) => ({ '@id': pl['@id'] })),
    ...legalData(content, fact),
  };
  const [, father, master] = LINEAGE.map(fact);
  fact(VINCENT_DESCRIPTION);
  const vincent = {
    '@type': 'Person', '@id': '/#vincent-chu', name: master, honorificPrefix: 'Mistr',
    // Rewritten from the Cvičení / Domů sentence (VINCENT_DESCRIPTION, checked): his role, not the lesson.
    jobTitle: `Hlavní instruktor a mistr bostonské školy ${FEDERATION.name}`,
    description: `Hlavní instruktor a mistr bostonské školy ${fact(FEDERATION.name)}. ${fact('Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.')}`,
    affiliation: { '@type': 'SportsOrganization', name: FEDERATION.name, url: FEDERATION.url },
    parent: { '@type': 'Person', name: father },
  };
  const person = {
    '@type': 'Person', '@id': '/#daniel', name: c.person, honorificPrefix: 'Mgr.', jobTitle: 'Lektor tchaj-ťi a čchi-kungu',
    description: PERSON_DESCRIPTION.map(fact).join(' '),
    url: '/o-mne/', email: c.email, telephone: phone, worksFor: { '@id': '/#organization' }, knows: { '@id': '/#vincent-chu' },
    image: { '@id': PORTRAIT['@id'] },
    ...(content.personSameAs?.length ? { sameAs: content.personSameAs } : {}),
    knowsAbout: ['Tchaj-ťi', 'Tai chi', 'Čchi-kung', 'Qigong', 'Tchaj-ťi stylu Yang', 'Osm kusů brokátu', '13 slov tchaj-ťi', 'Meditace'],
  };
  const website = { '@type': 'WebSite', '@id': '/#website', url: '/', name: content.brand.name, inLanguage: 'cs-CZ', publisher: { '@id': '/#organization' } };
  const placeId = Object.fromEntries(content.places.map((pl) => [pl.key, `/#${pl.key}`]));
  for (const e of SEMINARS) {
    for (const t of [e.name, e.text]) if (!text.includes(t)) throw new Error(`schema: seminar "${t}" is not on the pages (keep SEMINARS in step with Akce)`);
  }

  const cviceniHtml = pages.filter((p) => p.slug === 'cviceni').flatMap((p) => p.elements.map((e) => e.elements[0].settings.html)).join('\n');
  const videos = VIDEOS.filter((v) => cviceniHtml.includes(`data-src="${youtubeEmbedUrl(v.id)}"`) && content.videoUploadDates?.[v.id]).map((v) => ({
    '@type': 'VideoObject', '@id': `/cviceni/#video-${v.id}`, name: fact(v.title), description: fact(VIDEO_DESCRIPTION[v.id] || v.title),
    thumbnailUrl: `/wp-content/uploads/yt-${v.id}.webp`, uploadDate: content.videoUploadDates[v.id],
    embedUrl: youtubeEmbedUrl(v.id).replace(/\?.*$/, ''), url: youtubeWatchUrl(v.id),
  }));

  const schema = {};
  for (const p of pages) {
    const path = pathOf(p);
    const s = SEO[p.slug];
    if (!s) throw new Error(`schema: no SEO entry for ${p.slug}`);
    if (!label[path]) throw new Error(`schema: ${path} is not in the nav (breadcrumb name)`);
    const type = p.slug === 'kontakt' ? 'ContactPage' : p.slug === 'o-mne' ? 'ProfilePage' : 'WebPage';
    const mentionsVincent = ['o-mne', 'akce'].includes(p.slug) && textOf(p).includes('Vincent');
    const graph = [organization, ...places, person, PORTRAIT, vincent, website, {
      '@type': type, '@id': `${path}#webpage`, url: path, name: s.title, description: s.description, inLanguage: 'cs-CZ',
      isPartOf: { '@id': '/#website' }, about: { '@id': '/#organization' }, author: { '@id': '/#daniel' },
      ...(path !== '/' ? { breadcrumb: { '@id': `${path}#breadcrumb` } } : {}),
      ...(p.slug === 'o-mne' ? { mainEntity: { '@id': '/#daniel' }, primaryImageOfPage: { '@id': PORTRAIT['@id'] } } : {}),
      ...(p.slug === 'cviceni' && videos.length ? { video: videos.map((v) => ({ '@id': v['@id'] })) } : {}),
      ...(p.slug === 'kontakt' ? { mainEntity: { '@id': '/#organization' } } : {}),
      ...(mentionsVincent ? { mentions: [{ '@id': '/#vincent-chu' }] } : {}),
    }];
    if (path !== '/') {
      const trail = [{ name: label['/'], item: '/' }, { name: label[path], item: path }];
      graph.push({ '@type': 'BreadcrumbList', '@id': `${path}#breadcrumb`, itemListElement: trail.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.item })) });
    }
    if (p.slug === 'akce') {
      for (const [i, e] of SEMINARS.entries()) {
        if (e.startDate < today) continue;
        graph.push({
          '@type': 'Event', '@id': `${path}#event-${i + 1}`, name: e.name, startDate: e.startDate, endDate: e.endDate,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
          location: e.place ? { '@id': placeId[e.place] } : { '@type': 'Place', name: e.location.name, address: { '@type': 'PostalAddress', streetAddress: e.location.streetAddress, addressLocality: e.location.addressLocality, addressCountry: 'CZ' } },
          organizer: { '@id': '/#organization' }, performer: { '@id': '/#daniel' }, url: path,
          ...(e.price ? { offers: { '@type': 'Offer', price: e.price, priceCurrency: 'CZK', url: path } } : {}),
        });
      }
    }
    if (p.slug === 'cviceni') graph.push(...videos);
    schema[p.slug] = graph;
  }
  return schema;
}

/**
 * /llms.txt (served by inc/seo.php with {{home}} = home_url()): a plain-text summary for AI assistants, in
 * Czech, from the site's own copy. Every quoted fact must appear in the page text, or the build fails.
 *
 * @param {object[]} pages page definitions
 * @param {{ content: object, today?: string }} opts content.mjs; today = YYYY-MM-DD ("Aktualizováno", default: the build date)
 */
export function buildLlms(pages, { content, today = new Date().toISOString().slice(0, 10) }) {
  const c = content.contact;
  const text = pageText(pages);
  const fact = (s) => {
    if (!text.includes(s)) throw new Error(`llms.txt: "${s}" is not in the page text`);
    return s;
  };
  const label = Object.fromEntries(content.nav.map((l) => [l.href, l.label]));
  const url = (path) => `{{home}}${path}`;
  const pageLine = (p) => `- [${label[pathOf(p)]}](${url(pathOf(p))}): ${SEO[p.slug].description}`;
  const order = content.nav.map((l) => l.href);
  const sorted = pages.filter((p) => !NOINDEX.has(p.slug)).sort((a, b) => order.indexOf(pathOf(a)) - order.indexOf(pathOf(b)));
  const [praha, zlin] = content.places;
  for (const pl of content.places) fact(pl.name);
  const forms = taughtForms(pages).map(fact);
  if (!forms.length) throw new Error('llms.txt: no forms marked "Vyučuji" on Cvičení');
  return [
    `# ${content.brand.name} — tchaj-ťi (tai chi) a čchi-kung (qigong), Praha 4 a Zlín`, '',
    `> ${fact(content.footer.about)}`, '',
    `Lektor: ${c.name}. ${fact('Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997.')} ${fact('Od roku 2007 se intenzivně věnuji zejména rodinnému stylu Yang tchaj-ťi u mistra Vincenta Chu')}.`,
    `Web: ${url('/')}`, 'Jazyk obsahu: čeština', `Aktualizováno: ${today}`, '',
    '## Stránky', '', ...sorted.map(pageLine), '',
    '## Linie a škola', '',
    `- Linie předání stylu Yang: ${LINEAGE.map(fact).join(' → ')}.`,
    `- ${fact(VINCENT_DESCRIPTION)} ([${FEDERATION.url.replace(/^https:\/\/|\/$/g, '')}](${FEDERATION.url})). ${fact('Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.')}`, '',
    '## Vyučované sestavy a cvičení', '',
    ...forms.map((f) => `- ${f}`), `- Popis cvičení a videogalerie: ${url('/cviceni/')}`, '',
    '## Pravidelné cvičení', '',
    `- Praha 4, ${praha.name}, ${praha.street}: ${fact('Pondělí 18:00 - 19:30h')} – ${fact('Sestava Yang 12 forem pro začátečníky, 13 Words of Tchaj-ťi')}; ${fact('Úterý 18:00 - 20:00h')} – ${fact('Osm kusů brokátu')}.`,
    `- Zlín, ${zlin.name}, ${zlin.street}: ${fact('Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek.')} ${fact('Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.')} (${url('/kurzy-a-lekce/#zlin')})`,
    `- ${fact('Výuka probíhá formou lekcí 90 minut nebo 120 minut, cvičíme v tělocvičně a v létě venku.')}`,
    `- Rozvrh a ceny: ${url('/kurzy-a-lekce/')}`, '',
    '## Ceny', '',
    `- ${fact('350 Kč lekce 90 minut')}, ${fact('350 Kč lekce 120 minut')}, ${fact('3 250 Kč 10 lekcí')}, ${fact('400 Kč Cvičení ve Zlíně')}.`, '',
    '## Akce', '',
    `- ${fact('Semináře tchaj-ťi s mistrem Vincentem Chu a cvičení na horách')}: ${url('/akce/')}`,
    `- ${fact('Cvičení na horách v Krkonoších')}: ${fact('Strážné v Krkonoších, Strážné 2. Penzion Exnar')}. ${fact('Polopenze, ubytování ve 2 až 3 lůžkových pokojích, výborná strava, možnost výletů po okolí, pokoje jsou se soc. zařízením.')}`, '',
    '## Kontakt', '',
    `${c.name}`, `Telefon: ${c.phone}`, `E-mail: ${c.email}`,
    ...content.places.map((pl) => `Místo: ${pl.line}${pl.line.includes(pl.city) ? '' : `, ${pl.city}`}`),
    `Kontakt: ${url('/kontakt/')}`, '',
  ].join('\n');
}
