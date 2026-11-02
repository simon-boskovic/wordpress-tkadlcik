// build/seo.mjs: the per-page JSON-LD graph (data/schema.json) and /llms.txt (data/llms.txt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as content from '../content.mjs';
import { buildPages } from '../generate.mjs';
import { buildLlms, buildSchema, legalData, NOINDEX, SEMINARS, SEO, taughtForms } from '../seo.mjs';
import { VIDEOS } from '../builders/cviceni.mjs';

const { pages } = buildPages();
const TODAY = '2026-10-31';
const schema = buildSchema(pages, { content, today: TODAY });
const byType = (graph, type) => graph.filter((n) => n['@type'] === type);

test('a graph for every page: Organization, both places, Person, WebSite, the page node', () => {
  assert.deepEqual(Object.keys(schema).sort(), pages.map((p) => p.slug).sort());
  for (const [slug, graph] of Object.entries(schema)) {
    assert.equal(byType(graph, 'Organization').length, 1, slug);
    assert.deepEqual(byType(graph, 'SportsActivityLocation').map((n) => n.address.streetAddress), ['Jeremenkova 1003/66A', 'Osvoboditelů 484'], slug);
    assert.deepEqual(byType(graph, 'Person').map((n) => n.name), ['Daniel Tkadlčík', 'Vincent Chu'], slug);
    assert.equal(byType(graph, 'WebSite').length, 1, slug);
    const page = graph.find((n) => /#webpage$/.test(n['@id']));
    assert.ok(page && page.name && page.description, slug);
    const ids = new Set(graph.map((n) => n['@id']));
    assert.equal(ids.size, graph.length, `${slug}: duplicate @id`);
  }
  assert.equal(schema.kontakt.find((n) => /#webpage$/.test(n['@id']))['@type'], 'ContactPage');
  assert.equal(schema['o-mne'].find((n) => /#webpage$/.test(n['@id']))['@type'], 'ProfilePage');
});

test('paths stay root-relative (absolutized by inc/seo.php), never a host', () => {
  const json = JSON.stringify(schema);
  assert.doesNotMatch(json, /localhost|https?:\/\/(?!schema\.org|www\.google\.com\/maps|www\.gstaichi\.org\/"|www\.youtube(?:-nocookie)?\.com\/)/);
  assert.equal(schema.domu.find((n) => n['@id'] === '/#webpage').url, '/');
});

test('breadcrumbs below the front page: Domů -> page, names = nav labels', () => {
  assert.ok(!schema.domu.some((n) => n['@type'] === 'BreadcrumbList'));
  const bc = schema['kurzy-a-lekce'].find((n) => n['@type'] === 'BreadcrumbList');
  assert.deepEqual(bc.itemListElement.map((x) => [x.position, x.name, x.item]), [[1, 'Domů', '/'], [2, 'Nabídka kurzů a lekcí', '/kurzy-a-lekce/']]);
});

test('Events only for seminars that have not started yet (the owner\'s Sundays 15. 11. and 13. 12. 2026)', () => {
  const at = (today) => byType(buildSchema(pages, { content, today }).akce, 'Event');
  const early = buildSchema(pages, { content, today: '2024-01-01' });
  assert.deepEqual(byType(early.akce, 'Event').map((e) => e.startDate), SEMINARS.map((e) => e.startDate));
  assert.deepEqual(at('2025-01-01').map((e) => e.name), ['Seminář s mistrem Vincentem Chu v Praze', 'Celodenní cvičení v neděli', 'Seminář s mistrem Vincentem Chu v Praze', 'Celodenní cvičení v neděli']);
  assert.deepEqual(at('2026-11-01').map((e) => e.startDate), ['2026-11-15', '2026-11-21', '2026-12-13']);
  assert.deepEqual(at('2026-11-16').map((e) => e.startDate), ['2026-11-21', '2026-12-13']);
  // Google's recommended fields (Search Console): every Event has a description and an image; a stated price = offers.
  for (const e of at('2026-11-01')) assert.ok(e.description && e.image.length, e.name);
  const chu = at('2026-11-01').find((e) => e.startDate === '2026-11-21');
  assert.deepEqual([chu.offers.price, chu.offers.priceCurrency, chu.performer, chu.url, chu.image], [2500, 'CZK', { '@id': '/#vincent-chu' }, '/seminar-vincent-chu/', ['/wp-content/uploads/letak-gu-yang-tzu.jpg']]);
  assert.equal(at('2026-12-14').length, 0);
  for (const e of at('2026-11-01')) assert.deepEqual(e.location, { '@id': '/#praha' });
  for (const slug of Object.keys(early)) if (slug !== 'akce') assert.equal(byType(early[slug], 'Event').length, 0, slug);
});

test('places: street, postcode, geo, locality (Praha 4), verbatim own description, priceRange from the Ceny section, own url, map', () => {
  const [praha, zlin] = byType(schema.domu, 'SportsActivityLocation');
  assert.deepEqual([praha.address.streetAddress, praha.address.addressLocality, praha.priceRange, praha.url], ['Jeremenkova 1003/66A', 'Praha 4', '350–3 250 Kč', '/kurzy-a-lekce/#praha']);
  assert.equal(praha.description, 'Kurzy probíhají na adrese ZŠ Jeremenkova, Jeremenkova 1003/66A.');
  assert.equal(zlin.description, 'Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek. Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.');
  assert.doesNotMatch(zlin.description, /víkendové semináře/);
  assert.deepEqual([zlin.address.addressLocality, zlin.priceRange, zlin.url], ['Zlín', '400 Kč', '/cviceni-ve-zline/']);
  // Postcodes and coordinates: OpenStreetMap house-level matches (content.mjs places); still no opening hours (the
  // timetable awaits the client).
  assert.deepEqual([praha.address.postalCode, praha.geo.latitude, praha.geo.longitude], ['147 00', 50.04301, 14.42334]);
  assert.deepEqual([zlin.address.postalCode, zlin.geo.latitude, zlin.geo.longitude], ['760 01', 49.22279, 17.66965]);
  for (const pl of [praha, zlin]) for (const k of ['openingHours', 'openingHoursSpecification']) assert.ok(!(k in pl), k);
  assert.deepEqual(byType(schema.domu, 'Organization')[0].areaServed, ['Praha 4', 'Zlín']);
});

test('Person: verbatim O mně description, knowsAbout, knows Vincent Chu (Gin Soon Tai Chi Chuan Federation)', () => {
  const [daniel, vincent] = byType(schema['o-mne'], 'Person');
  assert.equal(daniel.description, 'Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997. Mým hlavním tématem je propojení meditací, cvičení tchaj-ťi a čchi-kungu.');
  for (const k of ['Tchaj-ťi', 'Tai chi', 'Čchi-kung', 'Qigong', 'Osm kusů brokátu', '13 slov tchaj-ťi']) assert.ok(daniel.knowsAbout.includes(k), k);
  assert.deepEqual(daniel.knows, { '@id': '/#vincent-chu' });
  assert.equal(vincent['@id'], '/#vincent-chu');
  assert.deepEqual(vincent.affiliation, { '@type': 'SportsOrganization', name: 'Gin Soon Tai Chi Chuan Federation', url: 'https://www.gstaichi.org/' });
  const page = (slug) => schema[slug].find((n) => /#webpage$/.test(n['@id']));
  assert.deepEqual(page('o-mne').mentions, [{ '@id': '/#vincent-chu' }]);
  assert.deepEqual(page('o-mne').mainEntity, { '@id': '/#daniel' });
  assert.deepEqual(page('kontakt').mainEntity, { '@id': '/#organization' });
});

test('Person: portrait image (also the ProfilePage primaryImageOfPage), sameAs = his own YouTube channels only', () => {
  const daniel = schema['o-mne'].find((n) => n['@id'] === '/#daniel');
  assert.deepEqual(daniel.image, { '@id': '/#portrait' });
  const img = schema['o-mne'].find((n) => n['@id'] === '/#portrait');
  assert.deepEqual([img['@type'], img.url, img.width, img.height], ['ImageObject', '/wp-content/uploads/daniel-tkadlcik-portret.webp', 1200, 1600]);
  assert.deepEqual(schema['o-mne'].find((n) => n['@id'] === '/o-mne/#webpage').primaryImageOfPage, { '@id': '/#portrait' });
  assert.deepEqual(daniel.sameAs, ['https://www.youtube.com/@daniello2151974', 'https://www.youtube.com/@danieltkadlcik7684']);
  assert.ok(!JSON.stringify(schema).includes('Biztraumer'));
});

test('VideoObjects on Videogalerie only: caption as name, self-hosted thumbnail, fetched upload date, referenced by the page', () => {
  const vids = byType(schema.videogalerie, 'VideoObject');
  assert.deepEqual(vids.map((v) => v.name), VIDEOS.map((v) => v.title));
  for (const v of vids) {
    const id = v['@id'].replace('/videogalerie/#video-', '');
    assert.equal(v.thumbnailUrl, `/wp-content/uploads/yt-${id}.webp`);
    assert.equal(v.embedUrl, `https://www.youtube-nocookie.com/embed/${id}`);
    assert.equal(v.url, `https://www.youtube.com/watch?v=${id}`);
    assert.equal(v.uploadDate, content.videoUploadDates[id]);
    assert.match(v.uploadDate, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(v.description);
  }
  assert.deepEqual(schema.videogalerie.find((n) => n['@id'] === '/videogalerie/#webpage').video, vids.map((v) => ({ '@id': v['@id'] })));
  for (const slug of Object.keys(schema)) if (slug !== 'videogalerie') assert.equal(byType(schema[slug], 'VideoObject').length, 0, slug);
  const { '1nFm6-XwGpU': _drop, ...dates } = content.videoUploadDates;
  const without = buildSchema(pages, { content: { ...content, videoUploadDates: dates }, today: TODAY });
  assert.ok(!byType(without.videogalerie, 'VideoObject').some((v) => v['@id'].endsWith('1nFm6-XwGpU')), 'no date -> no VideoObject');
});

test('no Course/CourseInstance, every @id reference resolves inside its graph', () => {
  for (const [slug, graph] of Object.entries(schema)) {
    const types = graph.map((n) => n['@type']);
    for (const t of ['Course', 'CourseInstance']) assert.ok(!types.includes(t), `${slug}: ${t}`);
    const ids = new Set(graph.map((n) => n['@id']));
    const refs = JSON.stringify(graph).match(/\{"@id":"[^"]+"\}/g) || [];
    for (const r of refs) assert.ok(ids.has(JSON.parse(r)['@id']), `${slug}: dangling ${r}`);
  }
});

test('llms.txt: {{home}} links to every page, AI-readable sections, no own host', () => {
  const llms = buildLlms(pages, { content, today: TODAY });
  assert.match(llms, /^# Radost v pohybu — tchaj-ťi \(tai chi\) a čchi-kung \(qigong\)/);
  for (const l of content.nav) assert.ok(llms.includes(`({{home}}${l.href})`), l.href);
  for (const p of pages) assert.equal(llms.includes(SEO[p.slug].description), !NOINDEX.has(p.slug), p.slug);
  assert.ok(!llms.includes('zasady-ochrany-osobnich-udaju'), 'the noindex privacy page is not listed');
  assert.match(llms, /## Pravidelné cvičení/);
  assert.match(llms, /tkadlcik@centrum\.cz/);
  assert.match(llms, /^Aktualizováno: 2026-10-31$/m);
  assert.match(llms, /Yang Sau Chung → Chu Gin Soon → Vincent Chu → Daniel Tkadlčík/);
  assert.match(llms, /Gin Soon Tai Chi Chuan Federation \(\[www\.gstaichi\.org\]\(https:\/\/www\.gstaichi\.org\/\)\)/);
  assert.match(llms, /Strážné v Krkonoších, Strážné 2\. Penzion Exnar/);
  assert.match(llms, /1x měsíčně vždy v pátek/);
  assert.match(llms, /Yang Cheng Fu/);
  assert.doesNotMatch(llms, /Yang Chen Fu/);
  assert.match(llms, /\{\{home\}\}\/cviceni-ve-zline\//);
  assert.deepEqual(taughtForms(pages).length, 10);
  for (const f of taughtForms(pages)) assert.ok(llms.includes(`- ${f}\n`), f);
  assert.ok(!taughtForms(pages).includes('Sestava s mečem'));
  assert.doesNotMatch(llms, /localhost|https?:\/\/(?!www\.gstaichi\.org\/\))/);
});

test('llms.txt refuses a fact the pages do not contain', () => {
  const doctored = pages.map((p) => (p.slug === 'kurzy-a-lekce' ? { ...p, elements: [] } : p));
  assert.throws(() => buildLlms(doctored, { content }), /is not in the page text/);
});

test('Organization carries the legal data from the trade register; the venues stay separate places', () => {
  for (const [slug, graph] of Object.entries(schema)) {
    const org = byType(graph, 'Organization')[0];
    assert.equal(org.legalName, 'Mgr. Daniel Tkadlčík', slug);
    assert.deepEqual(org.identifier, { '@type': 'PropertyValue', propertyID: 'IČO', value: '75979390' }, slug);
    assert.deepEqual(org.address, { '@type': 'PostalAddress', streetAddress: 'Pod vinohradem 68/18', postalCode: '147 00', addressLocality: 'Praha 4 – Braník', addressCountry: 'CZ' }, slug);
    assert.ok(!('vatID' in org) && !('addressRegion' in org.address), slug);
    assert.equal(byType(graph, 'SportsActivityLocation').length, 2, slug);
  }
  assert.throws(() => legalData({ ...content, businessAddress: { ...content.businessAddress, postalCode: '140 00' } }), /does not match/);
  assert.throws(() => legalData(content, (s) => { if (s === '75979390') throw new Error('not on the pages'); return s; }), /not on the pages/);
});

test('privacy page: noindex set, plain WebPage with breadcrumb Domů -> Zásady ochrany osobních údajů', () => {
  assert.deepEqual([...NOINDEX], ['zasady-ochrany-osobnich-udaju']);
  const g = schema['zasady-ochrany-osobnich-udaju'];
  assert.equal(g.find((n) => /#webpage$/.test(n['@id']))['@type'], 'WebPage');
  const bc = g.find((n) => n['@type'] === 'BreadcrumbList');
  assert.deepEqual(bc.itemListElement.map((x) => [x.name, x.item]), [['Domů', '/'], ['Zásady ochrany osobních údajů', '/zasady-ochrany-osobnich-udaju/']]);
});
