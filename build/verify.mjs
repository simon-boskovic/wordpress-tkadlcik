/**
 * Automated acceptance checks against the local site (port of martinadamus build/verify.mjs).
 *   node build/verify.mjs [--only=kontakt,_404] [--base=http://localhost:8020] [--seo] [--cache [--cache-mode=php]]
 * Pages = build/pages/*.json, expectations = build/expectations.mjs. Exit code 1 on any failure.
 *   default  per page: HTTP 200, exactly one visible <h1> (= expected), <title>, expected texts/elements,
 *            unique in-page anchors (#videa, #chu, #hory, …), page-specific scripts present/absent, no prototype
 *            leftovers ({{ }}, .dc.html links), header + footer, images loaded and with alt, no overflow at 390 px;
 *            plus the 404 page (`_404`, also selectable with --only=_404).
 *   --seo    head (unique title, description, absolute self canonical, Open Graph, favicon/site icon, no generator
 *            meta, indexable — except seo.mjs NOINDEX: noindex,follow with the self canonical, R21), JSON-LD (exactly
 *            one block, parses, absolute URLs, a Person + the business with its IČO); site: sitemap.xml = exactly
 *            the indexable pages (7 of the 8; not the privacy page), robots.txt, llms.txt (every indexable page,
 *            never a noindex one), search noindex, no user enumeration.
 *   --cache  the static page cache checks (build/lib/cache-check.mjs, owned by the cache port).
 *   --golive go-live blockers (docs/go-live-requirements.md #25), FAIL until the client delivers: every tel: link
 *            is a Czech number (+420 and 9 digits) and no page (the noindex one included) shows a "[Foto]" or
 *            "[doplnit" placeholder. Off by default (those items are known open, the default run stays green).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openBrowser } from './lib/cdp.mjs';
import expectations, { GLOBAL_SCRIPTS, PAGE_SCRIPTS } from './expectations.mjs';
import { NOINDEX } from './seo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const BASE = arg('base', 'http://localhost:8020').replace(/\/$/, '');
const ONLY = arg('only', '').split(',').filter(Boolean);
const SEO = process.argv.includes('--seo');
const CACHE = process.argv.includes('--cache');
const GOLIVE = process.argv.includes('--golive');

const defs = readdirSync(join(HERE, 'pages')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(HERE, 'pages', f), 'utf8')));
const pages = defs.filter((d) => !ONLY.length || ONLY.includes(d.slug));
const failures = [];
const fail = (slug, msg) => failures.push(`${slug}: ${msg}`);
// '_404' is not a generated page: it selects the 404 check below, which runs by default too.
const CHECK_404 = !ONLY.length || ONLY.includes('_404');
for (const s of ONLY) if (s !== '_404' && !defs.some((d) => d.slug === s)) fail(s, 'not generated (no build/pages/' + s + '.json)');
for (const d of defs) if (!expectations[d.slug]) fail(d.slug, 'no entry in build/expectations.mjs');
const pathOf = (d) => (d.front_page ? '/' : `/${d.slug}/`);

/** Runs in the page. Scrolls through so lazy images load, then reports what the checks need. */
async function pageProbe(exp) {
  const step = Math.max(200, innerHeight * 0.75);
  for (let y = 0; y <= document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
  scrollTo(0, 0);
  await Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));
  // Case-insensitive: eyebrows are CSS text-transform:uppercase and innerText reflects the rendered case.
  const text = document.body.innerText.replace(/\s+/g, ' ').toLocaleLowerCase('cs');
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  return {
    h1: [...document.querySelectorAll('h1')].filter(vis).map((h) => h.innerText.trim().replace(/\s+/g, ' ')),
    title: document.title,
    leftovers: /\{\{|<sc-|dc-import|data-dc-tpl/.test(document.body.innerHTML),
    header: !!document.querySelector('.top header.bar'),
    footer: !!document.querySelector('footer.foot'),
    main: document.querySelectorAll('main').length,
    broken: [...document.images].filter((i) => i.getClientRects().length && !i.naturalWidth).map((i) => i.currentSrc || i.src),
    noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src),
    missingTexts: (exp.texts || []).filter((t) => !text.includes(t.replace(/\s+/g, ' ').toLocaleLowerCase('cs'))),
    missingSelectors: (exp.selectors || []).filter((s) => !document.querySelector(s)),
    notUnique: (exp.unique || []).filter((s) => document.querySelectorAll(s).length !== 1).map((s) => `${s} ×${document.querySelectorAll(s).length}`),
    badLinks: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /\.dc\.html|^\.\//.test(h)),
    deadFragments: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))),
    scripts: [...document.querySelectorAll('script[id^="tk-"][id$="-js"]')].map((s) => s.id.replace(/^tk-|-js$/g, '')),
    ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
  };
}

/** Runs in the page at 390 px. scrollWidth is the real test; offenders only explain a failure. */
function overflowProbe() {
  const vw = document.documentElement.clientWidth;
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) return true; return false; };
  const offenders = [...document.body.querySelectorAll('*')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el); })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''} right=${Math.round(el.getBoundingClientRect().right)}`);
  return { scrollWidth: document.documentElement.scrollWidth, vw, offenders };
}

const extraPageChecks = [];   // async (browser, def, url, fail) => {}
const siteChecks = [];        // async (fail) => {}

/** JSON-LD node types the business/person graph must carry on every page (DoD §5). */
const BUSINESS_TYPE = /LocalBusiness|SportsActivityLocation|ExerciseGym|SportsClub|Organization/;

if (SEO) {
  const titles = new Map();
  function seoProbe() {
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
    return {
      lang: document.documentElement.lang,
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      robots: meta('meta[name="robots"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogImage: meta('meta[property="og:image"]'),
      icon: document.querySelector('link[rel~="icon"]')?.href || '',
      themeColor: meta('meta[name="theme-color"]'),
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      generators: [...document.querySelectorAll('meta[name="generator"]')].map((m) => m.content),
    };
  }

  extraPageChecks.push(async (b, d, url, failPage) => {
    const s = await b.evaluate(`(${seoProbe})()`);
    if (s.lang !== 'cs' && s.lang !== 'cs-CZ') failPage(d.slug, `<html lang="${s.lang}">`);
    if (titles.has(s.title)) failPage(d.slug, `title duplicates ${titles.get(s.title)}`); else titles.set(s.title, d.slug);
    if (s.description.length < 50) failPage(d.slug, `meta description too short: "${s.description}"`);
    if (s.canonical !== url) failPage(d.slug, `canonical ${s.canonical || '(none)'} ≠ ${url}`);
    if (!s.ogTitle || !s.ogDescription) failPage(d.slug, 'og:title/og:description missing');
    if (!s.ogImage) failPage(d.slug, 'og:image missing');
    else if (!s.ogImage.startsWith(BASE + '/')) failPage(d.slug, `og:image not on this host: ${s.ogImage}`);
    else if ((await fetch(s.ogImage)).status !== 200) failPage(d.slug, `og:image ${s.ogImage} not 200`);
    if (!s.icon) failPage(d.slug, 'no <link rel=icon> (site icon)');
    else if ((await fetch(s.icon)).status !== 200) failPage(d.slug, `site icon ${s.icon} not 200`);
    if (s.themeColor.toLowerCase() !== '#0e0f0e') failPage(d.slug, `theme-color "${s.themeColor}" ≠ #0E0F0E`);
    const noindex = NOINDEX.has(d.slug);
    if (noindex !== /noindex/.test(s.robots)) failPage(d.slug, `robots meta "${s.robots}" (noindex expected: ${noindex})`);
    if (/nofollow/.test(s.robots)) failPage(d.slug, `robots meta "${s.robots}" (links must stay followed)`);
    if (s.generators.length) failPage(d.slug, `generator meta(s) in <head>: ${JSON.stringify(s.generators)}`);
    if (!s.ld.length) { failPage(d.slug, 'no JSON-LD'); return; }
    if (s.ld.length !== 1) failPage(d.slug, `${s.ld.length} JSON-LD blocks (expected exactly 1: ours)`);
    let nodes = [];
    for (const raw of s.ld) {
      try { const j = JSON.parse(raw); nodes.push(...(j['@graph'] || (Array.isArray(j) ? j : [j]))); } catch (e) { failPage(d.slug, `JSON-LD does not parse: ${e.message}`); return; }
    }
    const types = nodes.flatMap((n) => [].concat(n['@type'] || []));
    if (!types.some((t) => BUSINESS_TYPE.test(t))) failPage(d.slug, `JSON-LD has no business/organisation node (types: ${types.join(', ')})`);
    if (!types.includes('Person')) failPage(d.slug, `JSON-LD has no Person (types: ${types.join(', ')})`);
    if (!types.includes('WebPage') && !types.some((t) => /Page$/.test(t))) failPage(d.slug, `JSON-LD has no WebPage node (types: ${types.join(', ')})`);
    const org = nodes.find((n) => n['@type'] === 'Organization');
    if (!org || org.identifier?.propertyID !== 'IČO' || !org.identifier?.value || org.address?.['@type'] !== 'PostalAddress') failPage(d.slug, 'JSON-LD Organization lacks the IČO identifier / PostalAddress (legal data)');
    const strings = JSON.stringify(nodes).match(/"(?:@id|url|item|image|logo|contentUrl|thumbnailUrl)":"[^"]+"/g) || [];
    for (const kv of strings) {
      const v = kv.split('":"')[1].slice(0, -1);
      if (v.startsWith('/')) failPage(d.slug, `relative URL left in JSON-LD: ${v}`);
      if (v.startsWith(BASE + '/wp-content/') && (await fetch(v)).status !== 200) failPage(d.slug, `JSON-LD file ${v} not 200`);
    }
  });

  siteChecks.push(async (failSite) => {
    const indexable = defs.filter((d) => !NOINDEX.has(d.slug)).map((d) => BASE + pathOf(d)).sort();
    const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
    const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/\/?$/, '/')).sort();
    if (/<sitemapindex[\s>]/.test(sitemapXml)) failSite('sitemap', '/sitemap.xml is a sitemap index, expected one <urlset> with the pages');
    if (JSON.stringify(locs) !== JSON.stringify(indexable)) failSite('sitemap', `expected ${indexable.length} URLs, got ${locs.length}: extra ${locs.filter((l) => !indexable.includes(l))} missing ${indexable.filter((l) => !locs.includes(l))}`);
    for (const loc of locs) { const r = await fetch(loc, { redirect: 'manual' }); if (r.status !== 200) failSite('sitemap', `${loc} answers ${r.status}`); }

    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    for (const must of ['User-agent: *', `Sitemap: ${BASE}/sitemap.xml`]) if (!robots.includes(must)) failSite('robots.txt', `missing "${must}"`);
    if (/^Disallow: \/\s*$/m.test(robots)) failSite('robots.txt', 'contains a blanket "Disallow: /"');

    const llms = await fetch(`${BASE}/llms.txt`);
    const llmsText = await llms.text();
    if (llms.status !== 200 || !/text\/plain/.test(llms.headers.get('content-type') || '')) failSite('llms.txt', `HTTP ${llms.status} ${llms.headers.get('content-type')}`);
    else {
      const missing = defs.filter((d) => !NOINDEX.has(d.slug)).filter((d) => d.front_page ? !llmsText.includes(`${BASE}/`) : !llmsText.includes(`${BASE}/${d.slug}/`)).map((d) => d.slug);
      if (missing.length || /\{\{/.test(llmsText)) failSite('llms.txt', `pages not linked with absolute URLs: ${missing.join(', ') || '(placeholder left)'}`);
      const listed = defs.filter((d) => NOINDEX.has(d.slug) && llmsText.includes(`/${d.slug}/`)).map((d) => d.slug);
      if (listed.length) failSite('llms.txt', `noindex page(s) listed: ${listed.join(', ')}`);
    }

    const search = await (await fetch(`${BASE}/?s=tchaj`)).text();
    if (!/<meta name="robots" content="[^"]*noindex/.test(search)) failSite('search', 'search results are not noindex');

    // tk-hardening.php: no user enumeration.
    const users = await fetch(`${BASE}/wp-json/wp/v2/users`, { redirect: 'manual' });
    if (users.status !== 404) failSite('/wp-json/wp/v2/users', `expected 404, got ${users.status}`);
    const author = await fetch(`${BASE}/?author=1`, { redirect: 'manual' });
    if (/\/author\//.test(author.headers.get('location') || '') || author.status === 200) failSite('/?author=1', `reveals the author (${author.status} ${author.headers.get('location') || ''})`);
  });
}

if (GOLIVE) {
  /** Visible text of a page's HTML (scripts, styles, templates and tags removed, entities decoded). */
  const visibleText = (html) => (html.match(/<body[\s\S]*<\/body>/i)?.[0] || html)
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&#0?91;/g, '[').replace(/&#0?93;/g, ']').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  siteChecks.push(async (failSite) => {
    const phones = new Set();
    for (const d of defs) {
      const html = await (await fetch(BASE + pathOf(d))).text();
      for (const [, tel] of html.matchAll(/href="tel:([^"]*)"/g)) phones.add(tel);
      const text = visibleText(html);
      for (const ph of ['[Foto]', '[doplnit']) {
        const hits = text.split(ph).length - 1;
        if (hits) failSite(`golive ${pathOf(d)}`, `${hits}× placeholder "${ph}" on the page: ${text.slice(Math.max(0, text.indexOf(ph) - 40), text.indexOf(ph) + 60).trim()}`);
      }
    }
    for (const tel of phones) if (!/^\+420\d{9}$/.test(tel)) failSite('golive phone', `tel:${tel} is not +420 + 9 digits (confirm the number with the client: build/content.mjs contact)`);
    if (!phones.size) failSite('golive phone', 'no tel: link on any page');
  });
}

if (CACHE) {
  siteChecks.push(async (failSite) => {
    let mod;
    try { mod = await import(pathToFileURL(join(HERE, 'lib', 'cache-check.mjs')).href); } catch (e) { failSite('cache', `build/lib/cache-check.mjs not available: ${e.message}`); return; }
    await mod.runCacheChecks({ base: BASE, mode: arg('cache-mode', 'rewrite'), fail: failSite });
  });
}

/** An unknown URL is a real 404 (never a redirect, never stored by the page cache) rendered by the theme's 404.php. */
async function check404() {
  const path = `/neexistuje-tk-404-${Date.now().toString(36)}/`;
  const url = BASE + path;
  for (const round of [1, 2]) {
    const res = await fetch(url, { redirect: 'manual' });
    await res.text();
    if (res.status !== 404) fail('_404', `round ${round}: HTTP ${res.status} (expected 404${res.headers.get('location') ? ', redirects to ' + res.headers.get('location') : ''})`);
    const xc = res.headers.get('x-tk-cache') || '';
    if (/HIT|STORED/.test(xc)) fail('_404', `round ${round}: page cache answered "${xc}" (a 404 is never stored)`);
    if (!/no-store/.test(res.headers.get('cache-control') || '')) fail('_404', `round ${round}: Cache-Control "${res.headers.get('cache-control')}" lacks no-store`);
  }
  const exp = { texts: ['Tuto stránku jsem nenašel', 'Nabídka kurzů a lekcí', 'Kontakt'], selectors: ['main a[href$="/kontakt/"]', 'a.skip[href="#obsah"]', 'main#obsah'] };
  await desktop.goto(url);
  const r = await desktop.evaluate(`(${pageProbe})(${JSON.stringify(exp)})`);
  if (r.h1.length !== 1) fail('_404', `h1 ${JSON.stringify(r.h1)} (expected exactly one)`);
  if (!r.header || !r.footer) fail('_404', 'site header/footer missing');
  if (r.missingTexts.length) fail('_404', `missing texts: ${JSON.stringify(r.missingTexts)}`);
  if (r.missingSelectors.length) fail('_404', `missing elements: ${JSON.stringify(r.missingSelectors)}`);
  const m = await desktop.evaluate(`({ robots: document.querySelector('meta[name="robots"]')?.content || '', canonical: document.querySelectorAll('link[rel="canonical"]').length })`);
  if (!/noindex/.test(m.robots)) fail('_404', `robots "${m.robots}" lacks noindex`);
  if (m.canonical) fail('_404', `${m.canonical} canonical link(s) on a 404`);
  await phone.goto(url);
  const o = await phone.evaluate(`(${overflowProbe})()`);
  if (o.scrollWidth > o.vw) fail('_404', `horizontal overflow at 390px: scrollWidth ${o.scrollWidth} > ${o.vw} (${o.offenders.join('; ')})`);
  console.log(`${failures.some((f) => f.startsWith('_404:')) ? 'FAIL' : 'ok  '} ${path} (404)`);
}

const desktop = await openBrowser({ width: 1280, height: 900 });
const phone = await openBrowser({ width: 390, height: 844, mobile: true });
try {
  for (const d of pages) {
    const exp = expectations[d.slug];
    if (!exp) continue;
    const url = BASE + pathOf(d);
    const res = await fetch(url, { redirect: 'manual' });
    if (res.status !== 200) { fail(d.slug, `HTTP ${res.status} for ${url}`); continue; }

    await desktop.goto(url);
    const r = await desktop.evaluate(`(${pageProbe})(${JSON.stringify(exp)})`);
    if (r.h1.length !== 1) fail(d.slug, `${r.h1.length} visible <h1>: ${JSON.stringify(r.h1)}`);
    else if (r.h1[0] !== exp.h1) fail(d.slug, `h1 "${r.h1[0]}" ≠ expected "${exp.h1}"`);
    if (exp.title && r.title !== exp.title) fail(d.slug, `<title> "${r.title}" ≠ expected "${exp.title}"`);
    if (r.main !== 1) fail(d.slug, `${r.main} <main> elements`);
    if (r.leftovers) fail(d.slug, 'prototype template syntax left in the markup');
    if (!r.header) fail(d.slug, 'no site header (.top header.bar)');
    if (!r.footer) fail(d.slug, 'no site footer (footer.foot)');
    if (r.broken.length) fail(d.slug, `broken images: ${r.broken.join(', ')}`);
    if (r.noAlt.length) fail(d.slug, `images without alt: ${r.noAlt.join(', ')}`);
    if (r.missingTexts.length) fail(d.slug, `missing texts: ${JSON.stringify(r.missingTexts)}`);
    if (r.missingSelectors.length) fail(d.slug, `missing elements: ${JSON.stringify(r.missingSelectors)}`);
    if (r.notUnique.length) fail(d.slug, `elements that must exist exactly once: ${JSON.stringify(r.notUnique)}`);
    if (r.badLinks.length) fail(d.slug, `prototype links left: ${r.badLinks.join(', ')}`);
    if (r.deadFragments.length) fail(d.slug, `in-page links without a target: ${r.deadFragments.join(', ')}`);
    const dupIds = [...new Set(r.ids.filter((id, i) => r.ids.indexOf(id) !== i))];
    if (dupIds.length) fail(d.slug, `duplicate ids: ${dupIds.join(', ')}`);
    for (const s of GLOBAL_SCRIPTS) if (!r.scripts.includes(s)) fail(d.slug, `global script ${s} missing (#tk-${s}-js)`);
    for (const s of PAGE_SCRIPTS) {
      const want = (exp.scripts || []).includes(s), has = r.scripts.includes(s);
      if (want && !has) fail(d.slug, `page script ${s} missing (#tk-${s}-js; _tk_scripts in build/pages/${d.slug}.json: ${JSON.stringify(d.scripts || [])})`);
      if (!want && has) fail(d.slug, `page script ${s} loaded on a page that does not use it`);
    }
    for (const check of extraPageChecks) await check(desktop, d, url, fail);

    await phone.goto(url);
    const o = await phone.evaluate(`(${overflowProbe})()`);
    if (o.scrollWidth > o.vw) fail(d.slug, `horizontal overflow at 390px: scrollWidth ${o.scrollWidth} > ${o.vw} (${o.offenders.join('; ')})`);

    console.log(`${failures.some((f) => f.startsWith(d.slug + ':')) ? 'FAIL' : 'ok  '} ${pathOf(d)}`);
  }
  if (CHECK_404) await check404();
  for (const check of siteChecks) await check(fail);
} finally {
  await desktop.close();
  await phone.close();
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nAll checks passed (${pages.length} pages${SEO ? ', SEO' : ''}${CACHE ? ', page cache' : ''}${GOLIVE ? ', go-live blockers' : ''}).`);
