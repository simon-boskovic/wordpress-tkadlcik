// The generated page definitions: format wp tk page-upsert reads, one <h1> per page, no prototype leftovers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPages, definePage, phoneWarning, SCRIPTS, siteJson } from '../generate.mjs';
import { createFinalizer } from '../lib/finalize.mjs';
import { VIDEO_NOTE } from '../fragments.mjs';
import { existsSync } from 'node:fs';
import { buildSeo, OG_IMAGE, OG_IMAGES } from '../seo.mjs';

const { pages, fin } = buildPages();

test('the seven design pages + the privacy page, one front page (domu)', () => {
  assert.deepEqual(pages.map((p) => p.slug).sort(), ['akce', 'clanky', 'cviceni', 'domu', 'kontakt', 'kurzy-a-lekce', 'o-mne', 'zasady-ochrany-osobnich-udaju']);
  assert.deepEqual(pages.filter((p) => p.front_page).map((p) => p.slug), ['domu']);
});

test('page definitions have the page-upsert shape', () => {
  for (const p of pages) {
    assert.deepEqual(Object.keys(p), ['slug', 'title', 'status', 'template', 'scripts', 'front_page', 'elements']);
    assert.equal(p.status, 'publish');
    assert.equal(p.template, 'elementor_header_footer');
    for (const s of p.scripts) assert.ok(SCRIPTS.has(s));
    for (const e of p.elements) {
      assert.equal(e.elType, 'container');
      assert.equal(e.elements.length, 1);
      assert.equal(e.elements[0].widgetType, 'html');
    }
  }
});

test('exactly one <h1> per page, no inline styles, no prototype links', () => {
  for (const p of pages) {
    const html = p.elements.map((e) => e.elements[0].settings.html).join('\n');
    assert.equal((html.match(/<h1\b/g) || []).length, 1, p.slug);
    assert.doesNotMatch(html, /\sstyle=|\.dc\.html|\{\{/, p.slug);
    assert.ok(fin.styleCss(html).length > 0, p.slug);
  }
});

test('tabs only on Nabídka kurzů a lekcí, the click-to-load map there and on Kontakt, videos on Cvičení', () => {
  const want = { 'kurzy-a-lekce': ['tabs', 'map'], kontakt: ['map'], cviceni: ['video'] };
  for (const p of pages) assert.deepEqual(p.scripts, want[p.slug] || [], p.slug);
});

test('map pages: no Google request in the markup before the click, a Google Maps link without JS', () => {
  for (const slug of ['kurzy-a-lekce', 'kontakt']) {
    const html = pages.find((p) => p.slug === slug).elements.map((e) => e.elements[0].settings.html).join('\n');
    assert.doesNotMatch(html, /\[Mapa/, slug);
    assert.equal((html.match(/data-tk-map-box/g) || []).length, 2, slug);
    assert.doesNotMatch(html, /<iframe\b|\ssrc="https:\/\/maps\./, slug);
    assert.match(html, /data-src="https:\/\/maps\.google\.com\/maps\?q=Jeremenkova%201003%2F66A%2C%20Praha%204&amp;[^"]*output=embed/, slug);
    assert.match(html, /data-src="https:\/\/maps\.google\.com\/maps\?q=Osvobodite/, slug);
    assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=Jeremenkova/, slug);
  }
});

test('the page-upsert preload option: upload path used on the page, { src, sizes } matches one <img>', () => {
  const fin2 = createFinalizer();
  const img = '<section><h1>x</h1><img src="./client-img/foto.jpg" alt="A" sizes="50vw"></section>';
  const def = definePage(fin2, { slug: 't', title: 'T', preload: [{ src: '/wp-content/uploads/foto.webp', sizes: '50vw' }], sections: [img] });
  assert.deepEqual(def.preload, [{ src: '/wp-content/uploads/foto.webp', sizes: '50vw' }]);
  assert.throws(() => definePage(fin2, { slug: 't', title: 'T', preload: ['/wp-content/uploads/other.webp'], sections: [img] }), /not used on the page/);
  assert.throws(() => definePage(fin2, { slug: 't', title: 'T', preload: [{ src: '/wp-content/uploads/foto.webp', sizes: '100vw' }], sections: [img] }), /sizes="100vw"/);
  assert.throws(() => definePage(fin2, { slug: 't', title: 'T', preload: ['./client-img/foto.jpg'], sections: [img] }), /not an upload path/);
  assert.ok(!('preload' in definePage(fin2, { slug: 't', title: 'T', sections: [img] })));
});

const htmlOf = (slug) => pages.find((p) => p.slug === slug).elements.map((e) => e.elements[0].settings.html).join('\n');
const all = pages.map((p) => htmlOf(p.slug)).join('\n');

test('videos on Cvičení: click-to-load facades, self-hosted thumbnails, no YouTube request before the click', () => {
  const html = htmlOf('cviceni');
  assert.doesNotMatch(html, /\[(?:Video )?YouTube/);
  assert.doesNotMatch(html, /<iframe\b|<script\b|\ssrc="https?:\/\/[^"]*(?:youtube|ytimg|google)/);
  const boxes = [...html.matchAll(/<div data-tk-video-box data-src="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})\?autoplay=1" data-title="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(boxes, [
    ['1Mmz_QpYk9s', 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje'],
    ['1UPJuzGC1UY', '13 slov tchaj-ťi'],
    ['1nFm6-XwGpU', 'Začátečnická sestava 12 forem Yang tchaj-ťi'],
    ['NeVzb5hGM7A', 'Ukázka sestavy Yang 43 forem v provedení velkého řádu. Mistr Vincent Chu'],
    ['oZB6Gq4QzC4', 'Ukázka sestavy s holí'],
    ['1Mmz_QpYk9s', 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje'],
    ['1UPJuzGC1UY', '13 slov tchaj-ťi'],
  ]);
  // Each box carries the notice (VIDEO_NOTE, the map box's twin), removed with the box on click.
  assert.equal(html.split(`>${VIDEO_NOTE}</span>`).length - 1, boxes.length);
  for (const [id] of boxes) {
    assert.ok(html.includes(`src="/wp-content/uploads/yt-${id}.webp"`), id);
    assert.ok(html.includes(`href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"`), id);
  }
  // Gallery: each caption follows its own video.
  for (const [id, title] of boxes.slice(2)) assert.match(html, new RegExp(`embed/${id}[\\s\\S]*?</div><figcaption[^>]*>${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</figcaption>`), id);
  assert.equal((html.match(/data-tk-video\b(?!-)/g) || []).length, boxes.length);
});

test('media.json lists the images the pages use: the two client photos + the five self-hosted YouTube thumbnails', () => {
  assert.deepEqual(fin.media().map((m) => m.file), ['daniel-tkadlcik-portret.jpg', 'louka-strom.jpg', 'yt-1Mmz_QpYk9s.jpg', 'yt-1nFm6-XwGpU.jpg', 'yt-1UPJuzGC1UY.jpg', 'yt-NeVzb5hGM7A.jpg', 'yt-oZB6Gq4QzC4.jpg']);
  for (const m of fin.media()) assert.ok(existsSync(new URL(`../../client-img/${m.file}`, import.meta.url)), m.file);
  for (const f of [OG_IMAGE, ...Object.values(OG_IMAGES)]) assert.ok(/\.jpg$/.test(f) && existsSync(new URL(`../../client-files/${f}`, import.meta.url)), f);
  assert.equal(fin.media().find((m) => m.file === 'daniel-tkadlcik-portret.jpg').alt, 'Daniel Tkadlčík, lektor tchaj-ťi');
  assert.doesNotMatch(all, /\[Foto\][\s\S]{0,0}<\/span><\/div>\s*<div class="card stack" style="position: absolute/);
});

test('no old Webnode CDN links; the files are root-relative uploads with download', () => {
  assert.doesNotMatch(all, /cbaul-cdnwnd/);
  assert.match(htmlOf('domu'), /<a href="\/wp-content\/uploads\/letak-savle\.jpg" download class="btn btn-ghost">Stáhnout leták na Šavli<\/a>/);
  for (const f of ['10-principu-mistra-yang-chen-fu.docx', 'pojednani-o-wu-ti.docx']) assert.match(htmlOf('clanky'), new RegExp(`href="/wp-content/uploads/${f.replace(/\./g, '\\.')}" download`));
  const fin2 = createFinalizer();
  assert.throws(() => definePage(fin2, { slug: 't', title: 'T', sections: ['<section><h1>x</h1><a href="https://9d8f1c78e7.cbaul-cdnwnd.com/a.docx">a</a></section>'] }), /Webnode CDN/);
});

test('every target="_blank" link has rel noopener; nofollow only on third-party links', () => {
  for (const p of pages) {
    for (const [a] of htmlOf(p.slug).matchAll(/<a\b[^>]*>/g)) {
      if (/target="_blank"/.test(a)) assert.match(a, /rel="[^"]*\bnoopener\b/, `${p.slug}: ${a}`);
      if (/nofollow/.test(a)) assert.match(a, /href="https?:\/\//, `${p.slug}: ${a}`);
    }
  }
  assert.match(htmlOf('akce'), /href="https:\/\/penzion-exnar\.ubytovani-strazne-krkonose\.cz\/" rel="nofollow noopener" target="_blank"[^>]*>penzion-exnar\.ubytovani-strazne-krkonose\.cz\/cs\/<\/a>/);
});

test('Zlín: tab panels carry the place ids, the home Zlín card links straight to #zlin', () => {
  const html = htmlOf('kurzy-a-lekce');
  assert.match(html, /role="tab" id="tab-praha" aria-controls="praha"/);
  assert.match(html, /role="tab" id="tab-zlin" aria-controls="zlin"/);
  assert.match(html, /role="tabpanel" id="praha" data-panel="praha"/);
  assert.match(html, /role="tabpanel" id="zlin" data-panel="zlin"/);
  assert.doesNotMatch(html, /panel-(?:praha|zlin)/);
  assert.match(htmlOf('domu'), /href="\/kurzy-a-lekce\/#zlin" class="card card-link reveal">\n<span class="chip chip-neutral">1x měsíčně vždy v pátek<\/span>\n<h3[^>]*>Cvičení ve Zlíně/);
});

test('headings: no duplicate h2–h4 texts on a page (screen-reader text included)', () => {
  for (const p of pages) {
    const heads = [...htmlOf(p.slug).matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    const dupes = heads.filter((h, i) => heads.indexOf(h) !== i);
    assert.deepEqual(dupes, [], p.slug);
  }
  const akce = htmlOf('akce');
  for (const day of ['Čtvrtek 27. 11. 2025', 'Pátek 28. 11. 2025', 'Sobota 29. 11. 2025']) assert.match(akce, new RegExp(`<h4 class="mono[^"]*">${day}</h4>\n<p class="h3[^"]*">`));
  assert.match(htmlOf('clanky'), /<span aria-hidden="true" class="[^"]*">10<\/span>/);
});

test('seo.json covers every page: brand suffix, title ≤ 64, description 120–155 chars, og image, no phone/prices', () => {
  const seo = buildSeo(pages);
  assert.deepEqual(Object.keys(seo).sort(), pages.map((p) => p.slug).sort());
  for (const [slug, s] of Object.entries(seo)) {
    assert.deepEqual(s.robots, slug === 'zasady-ochrany-osobnich-udaju' ? ['noindex', 'follow'] : ['index', 'follow'], slug);
    assert.ok(s.title.endsWith(' | Radost v pohybu') && s.title.length <= 64, slug);
    assert.ok(s.description.length >= 120 && s.description.length <= 155, `${slug}: ${s.description.length}`);
    assert.equal(s.og, slug === 'o-mne' ? 'og-o-mne.jpg' : 'og-default.jpg', slug);
    assert.ok(s.og_alt, slug);
    assert.doesNotMatch(s.description, /\d{3} \d{3}|Kč/, slug);
    assert.match(s.description, /\(tai chi\)|\(qigong\)/, slug);
  }
  for (const slug of ['domu', 'kurzy-a-lekce', 'kontakt']) assert.match(`${seo[slug].title} ${seo[slug].description}`, /Zlín/, slug);
  assert.equal(new Set(Object.values(seo).map((s) => s.title)).size, pages.length);
  assert.throws(() => buildSeo(pages.concat({ slug: 'nope' })), /no title/);
});

test('site.json carries the header/footer data, the business identification and the privacy link', () => {
  const s = siteJson();
  assert.equal(s.nav.length, 7);
  assert.deepEqual(s.business, { name: 'Mgr. Daniel Tkadlčík', ico: '75979390', address: 'Pod vinohradem 68/18, 147 00 Praha 4 – Braník', register: 'Zapsán v živnostenském rejstříku, Úřad městské části Praha 4' });
  assert.deepEqual(s.footer.links.map((l) => l.href), ['/', '/cviceni/', '/kurzy-a-lekce/', '/akce/', '/o-mne/', '/clanky/', '/zasady-ochrany-osobnich-udaju/']);
  assert.equal(s.footer.links.at(-1).label, 'Zásady ochrany osobních údajů');
  // The register also lists the date of birth: never published.
  assert.doesNotMatch(JSON.stringify(s), /narozen|datum narození|\b19\d\d-\d\d-\d\d\b/i);
  assert.equal(s.nav.at(-1).href, '/kontakt/');
  assert.equal(s.places.length, 2);
  assert.match(s.contact.phoneHref, /^tel:\+420\d+$/);
});

test('privacy page: one <h1>, the operator\'s register data, the e-mail only (no phone), visible placeholders, no date of birth', () => {
  const html = htmlOf('zasady-ochrany-osobnich-udaju');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const t of ['Mgr. Daniel Tkadlčík', 'IČO 75979390', 'Pod vinohradem 68/18, 147 00 Praha 4 – Braník', 'Úřad městské části Praha 4', 'href="mailto:tkadlcik@centrum.cz"', 'id="cookies"',
    '_ga', '_ga_*', 'cmplz_*', 'EU–US Data Privacy Framework', 'Google Site Kit', 'cmplz_banner-status', 'cmplz_consented_services', 'platnost 365 dní', 'až 2 roky', 'se načte až poté, co v cookie liště povolíte statistiky', 'youtube-nocookie.com', '„Zobrazit mapu“', 'Nastavení cookies', 'href="https://www.uoou.gov.cz/"',
    'čl. 6 odst. 1 písm. a)', 'čl. 6 odst. 1 písm. b)', 'čl. 6 odst. 1 písm. c)', 'čl. 6 odst. 1 písm. f)', '[HOSTING – doplnit', '[doplnit:']) assert.ok(html.includes(t), t);
  assert.doesNotMatch(html, /Consent Mode/, 'Consent Mode is off: the privacy text must not claim it');
  assert.doesNotMatch(html, /tel:|773 287|narozen/);
  assert.doesNotMatch(html, /kontaktní formulář(?! nemá)/i);
  for (const p of pages) if (p.slug !== 'zasady-ochrany-osobnich-udaju') assert.doesNotMatch(htmlOf(p.slug), /\[doplnit|\[HOSTING/, p.slug);
});

test('phone guard: a WARNING (not an error) while the phone is not +420 + 9 digits', () => {
  assert.match(phoneWarning({ phone: '+420 773 287 1113', phoneHref: 'tel:+4207732871113' }), /^WARNING: .*not \+420 \+ 9 digits/);
  assert.equal(phoneWarning({ phone: '+420 773 287 111', phoneHref: 'tel:+420773287111' }), '');
});
