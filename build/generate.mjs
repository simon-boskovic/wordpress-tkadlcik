/**
 * Generates everything the WordPress build consumes from the Claude Design prototype (ported into builders/):
 *
 *   build/pages/<slug>.json                                 Elementor page definitions -> wp tk page-upsert
 *   build/seo.json                                          title + description + og image per slug -> wp tk seo-setup
 *   build/media.json                                        images the pages use + alt -> wp tk media-import
 *   wp-content/themes/tkadlcik/data/schema.json             one JSON-LD @graph per slug (inc/seo.php)
 *   wp-content/themes/tkadlcik/data/llms.txt                /llms.txt body, {{home}} = home_url() (inc/seo.php)
 *   wp-content/themes/tkadlcik/data/site.json               header/footer/contact/business data (theme)
 *   wp-content/themes/tkadlcik/assets/css/states.css        hover/active/focus rules from style-hover …
 *   wp-content/themes/tkadlcik/assets/css/pages/<slug>.css  the page's style="…" rules (tk-s-*, R36)
 *
 *   node build/generate.mjs      (npm run generate)
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as content from './content.mjs';
import * as builders from './builders/index.mjs';
import { createFinalizer } from './lib/finalize.mjs';
import { createIds, section } from './lib/html.mjs';
import { buildLlms, buildSchema, buildSeo, OG_IMAGE, OG_IMAGES } from './seo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = join(HERE, '..', 'wp-content', 'themes', 'tkadlcik');
/** Allowed _tk_scripts values (theme: inc/data.php tk_page_scripts(); wp tk page-upsert validates the same list). */
export const SCRIPTS = new Set(['map', 'video', 'breath', 'plate', 'form']);

/**
 * Page definition in the format wp tk page-upsert reads (martinadamus format without `branch`).
 * `preload` (meta _tk_preload, printed in <head> by inc/assets.php): upload images to fetch early — a path
 * "/wp-content/uploads/x.webp" (e.g. a CSS-background LCP photo) or { src, sizes } for an <img> whose srcset the
 * theme adds (inc/responsive-images.php), so the preload names the same candidates; sizes must equal the <img>'s.
 */
export function definePage(fin, { slug, title, scripts = [], frontPage = false, preload = [], sections }) {
  for (const s of scripts) if (!SCRIPTS.has(s)) throw new Error(`${slug}: unknown script ${s}`);
  const ids = createIds(slug);
  const elements = sections.map((html) => section(ids, fin.finalize(html)));
  const all = elements.map((e) => e.elements[0].settings.html).join('\n');
  const pre = preload.map((entry) => {
    const src = typeof entry === 'string' ? entry : entry && entry.src;
    if (!/^\/wp-content\/uploads\/[^"]+\.webp$/.test(String(src))) throw new Error(`${slug}: preload ${JSON.stringify(entry)} is not an upload path`);
    if (!all.includes(src)) throw new Error(`${slug}: preload ${src} is not used on the page`);
    if (typeof entry === 'string') return src;
    const imgs = all.match(new RegExp(`<img\\b[^>]*\\ssrc="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g')) || [];
    if (imgs.length !== 1 || !imgs[0].includes(`sizes="${entry.sizes}"`)) throw new Error(`${slug}: preload ${src} needs exactly one <img> with sizes="${entry.sizes}"`);
    return { src, sizes: entry.sizes };
  });
  const h1 = (all.match(/<h1\b/g) || []).length;
  if (h1 !== 1) throw new Error(`${slug}: expected exactly one <h1>, found ${h1}`);
  // The old Webnode site's CDN goes away with the old site: files it hosted are uploads now (see builders).
  if (/cbaul-cdnwnd\.com/.test(all)) throw new Error(`${slug}: link to the old Webnode CDN (cbaul-cdnwnd.com) — use the upload instead`);
  // Contact links must match content.mjs (the header/footer use those values).
  // A mailto may carry a ?subject= (the course registration links, builders/ux.mjs); the address must match.
  for (const [, href] of all.matchAll(/href="((?:tel|mailto):[^"]*)"/g)) {
    if (href !== content.contact.phoneHref && href.replace(/\?subject=[^"&]*$/, '') !== `mailto:${content.contact.email}`) throw new Error(`${slug}: contact link ${href} differs from content.mjs`);
  }
  return { slug, title, status: 'publish', template: 'elementor_header_footer', scripts, front_page: frontPage, ...(pre.length ? { preload: pre } : {}), elements };
}

/** All page definitions plus the finalizer that collected their styles. */
export function buildPages() {
  const fin = createFinalizer();
  const page = (def) => definePage(fin, def);
  const pages = Object.values(builders).flatMap((b) => [].concat(b.build({ content, page })));
  const slugs = pages.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error(`duplicate slugs: ${slugs}`);
  if (pages.filter((p) => p.front_page).length !== 1) throw new Error('exactly one page must be the front page');
  return { pages, fin };
}

/** A Czech phone number in E.164 form: +420 and 9 digits. */
export const PHONE_E164 = /^\+420\d{9}$/;

/** Warning text when content.contact's phone is not a valid Czech number (non-failing: it awaits the client), else ''. */
export function phoneWarning(contact = content.contact) {
  const e164 = contact.phoneHref.replace(/^tel:/, '');
  return PHONE_E164.test(e164) ? '' : `WARNING: contact phone "${contact.phone}" (${contact.phoneHref}) is not +420 + 9 digits — confirm the number with the client before go-live (docs/go-live-requirements.md #25; build/content.mjs contact).`;
}

export function siteJson() {
  // business: the operator's identification (trade register), printed in the footer (footer.php).
  // credits: the found pictures (build/image-credits.json), credited in the footer of every page.
  const credits = Object.values(content.imageCredits).map((c) => ({ title: c.title, creator: c.creator, date: c.date, license: c.license, page: c.page }));
  return { brand: content.brand, contact: content.contact, business: content.business, places: content.places, nav: content.nav, footer: content.footer, credits };
}

const write = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { pages, fin } = buildPages();
  // The share images are JPGs in client-files/ (social scrapers mishandle WebP; imported as-is by media-import
  // --files-dir): og-default.jpg (client-img/og-default.png exported 1200x630) on every page, O mně its own
  // (seo.mjs OG_IMAGES), set as og:image by seo-setup (seo.json `og`).
  for (const f of [OG_IMAGE, ...Object.values(OG_IMAGES)]) if (!existsSync(join(HERE, '..', 'client-files', f))) throw new Error(`share image client-files/${f} is missing`);
  const og = OG_IMAGE;

  rmSync(join(HERE, 'pages'), { recursive: true, force: true });
  for (const p of pages) write(join(HERE, 'pages', `${p.slug}.json`), p);
  write(join(HERE, 'seo.json'), buildSeo(pages, { og }));
  // Always written (also when empty): with a manifest, media-import imports exactly these and never the
  // other files in client-img/ (e.g. site-icon.png, which `wp tk site-icon` handles).
  write(join(HERE, 'media.json'), fin.media());
  write(join(THEME, 'data', 'site.json'), siteJson());
  write(join(THEME, 'data', 'schema.json'), buildSchema(pages, { content }));
  write(join(THEME, 'data', 'llms.txt'), buildLlms(pages, { content }));
  write(join(THEME, 'assets', 'css', 'states.css'), `/* GENERATED by build/generate.mjs from style-hover/-active/-focus. Do not edit. */\n${fin.statesCss()}`);
  // Per page, only the tk-s-* classes that page uses (inlined into its <head> by inc/assets.php, unlayered).
  rmSync(join(THEME, 'assets', 'css', 'pages'), { recursive: true, force: true });
  for (const p of pages) write(join(THEME, 'assets', 'css', 'pages', `${p.slug}.css`), `/* GENERATED by build/generate.mjs from the inline style attributes of ${p.slug} (R36). Do not edit. */\n${fin.styleCss(JSON.stringify(p.elements))}`);

  const phone = phoneWarning();
  if (phone) console.warn(`\n${phone}\n`);
  console.log(`${pages.length} pages, ${fin.media().length} images -> build/pages/, seo.json, media.json, theme data/{site,schema}.json + llms.txt, states.css, css/pages/`);
}
