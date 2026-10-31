/**
 * Reference patches for the DoD harness: deliberate deviations of the production build from the read-only
 * prototype (design_handoff_tkadlcik/, never edited on disk). serve-prototype.mjs applies them to the served
 * response only, so the visual/text parity checks keep comparing against a reference that carries the approved
 * change instead of being weakened or switched off.
 *
 * Every patch has an id (D1, D2, …), a name and a justification (`why`). `find` (string or RegExp) must match
 * exactly once in the file (or exactly `count` times, then every match is replaced), otherwise applyPatches
 * throws and the server answers 500 — prototype drift is reported, never silently ignored.
 * Add a patch for every future approved deviation; `npm test` checks each patch against the prototype files.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { business, mapsEmbedUrl, mapsLinkUrl, places, privacy } from '../content.mjs';
import { mapBox, videoBox, photo, PHOTOS } from '../fragments.mjs';
import { INLINE_VIDEOS, VIDEOS } from '../builders/cviceni.mjs';
import { DAYS, HORY_HEADING, dayHeading, dayTopic } from '../builders/akce.mjs';

/** The seven page prototypes (desktop files; the *Mobile.dc.html boards only <dc-import> them at 390 px). */
export const PAGE_FILES = ['Main.dc.html', 'Cviceni.dc.html', 'Rozvrh.dc.html', 'Seminare.dc.html', 'OMne.dc.html', 'Clanky.dc.html', 'Kontakt.dc.html'];

const UR_LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const UR_LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/**
 * The site's own @font-face rules (mirror of wp-content/themes/tkadlcik/inc/fonts.php tk_font_faces()), with
 * the files served by serve-prototype.mjs from /tk-fonts/ (= the theme's assets/fonts/).
 */
export function siteFontCss() {
  const faces = [];
  for (const w of [400, 500, 600]) faces.push(['Geist', w, `geist-latin-ext-${w}-normal`, UR_LATIN_EXT], ['Geist', w, `geist-latin-${w}-normal`, UR_LATIN]);
  faces.push(['Geist Mono', 400, 'geist-mono-latin-ext-400-normal', UR_LATIN_EXT], ['Geist Mono', 400, 'geist-mono-latin-400-normal', UR_LATIN]);
  return faces.map(([fam, w, stem, ur]) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(/tk-fonts/${stem}.woff2) format('woff2');unicode-range:${ur}}`).join('');
}

/** The prototype's Google Fonts <link> (the font picker's 9 families), identical in every page file. */
const GOOGLE_FONTS_LINK = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*">/;

/** The review-only font picker at the end of every page template (fixed bottom-left). */
const FONT_PICKER = /<div class="font-picker">[\s\S]*?<\/select>\n<\/div>\n/;

/**
 * The theme's click-to-load map rules (site.css `.tk-map*`), read from the theme so the reference always shows
 * the box the site renders. The no-JS rule (`html:not(.js) [data-tk-map]`) is left out: the prototype always
 * runs JS (and has no `js` class).
 */
export const mapCss = () => (readFileSync(new URL('../../wp-content/themes/tkadlcik/assets/css/site.css', import.meta.url), 'utf8')
  .match(/^\.tk-map[^{\n]*\{[^}\n]*\}$/gm) || []).join('');

/** D3: one placeholder (+ its place's caption line, the anchor that makes the match unique) → the site's map box. */
const mapPatch = (file, label, place) => {
  const caption = `<div class="stack" style="gap: 2px; padding: 4px 12px 12px"><strong style="font-weight: 500; font-size: 19px">${place.name}</strong>`;
  return {
    file, id: 'D3', name: `click-to-load map (${place.key})`,
    why: `the design's "${label}" placeholder becomes the click-to-load Google map box (build/fragments.mjs mapBox: nothing is requested from Google before the visitor's click — GDPR; the click is the consent, the cookie banner does not gate it); the reference shows the very same box`,
    find: `<div class="ph" style="aspect-ratio: 16 / 9; min-height: 0; border-radius: 16px"><span>${label}</span></div>\n${caption}`,
    replace: `${mapBox(place, mapsEmbedUrl, mapsLinkUrl)}\n${caption}`,
  };
};

export const PATCHES = [
  ...PAGE_FILES.map((file) => ({
    file, id: 'D0', name: 'viewport meta',
    why: 'the canvas renders each board in an iframe of its own width (1440 / 390), so the prototype never needed <meta name="viewport">; on a real (emulated) phone or tablet without it the layout viewport is 980 px and the media queries never fire. The theme prints the same meta (header.php), so the reference is laid out like the site',
    find: '<meta charset="utf-8">\n',
    replace: '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n',
  })),
  ...PAGE_FILES.map((file) => ({
    file, id: 'D1', name: 'self-hosted Geist',
    why: 'production serves only Geist + Geist Mono, self-hosted by the theme (inc/fonts.php, no Google request); the reference loads the very same files instead of the Google Fonts picker families, so glyph metrics match',
    find: GOOGLE_FONTS_LINK,
    replace: `<style id="tk-fonts">${siteFontCss()}</style>`,
  })),
  ...PAGE_FILES.map((file) => ({
    file, id: 'D2', name: 'font picker removed',
    why: 'the "Písmo" select is a design-review tool (canvas note: "review-only font picker (remove for production)"); the build drops it, Geist only',
    find: FONT_PICKER,
    replace: '',
  })),
];

PATCHES.push(
  ...[['Rozvrh.dc.html', '[Mapa]'], ['Kontakt.dc.html', '[Mapa Google]']].flatMap(([file, label]) => [
    ...places.map((place) => mapPatch(file, label, place)),
    { file, id: 'D3', name: 'click-to-load map styles', why: 'the map box\'s own rules (theme site.css .tk-map*), which the prototype stylesheet does not have', find: '</helmet>', replace: () => `<style id="tk-map-css">${mapCss()}</style>\n</helmet>` },
  ]),
);

/** D4: the theme's accessibility deltas (site.css `tk-a11y` block): 44 px touch targets, glass button contrast, brand name kept for screen readers on phones. */
export const a11yCss = () => (readFileSync(new URL('../../wp-content/themes/tkadlcik/assets/css/site.css', import.meta.url), 'utf8')
  .match(/\/\* tk-a11y:start[\s\S]*?\/\* tk-a11y:end \*\//) || [''])[0];
PATCHES.push(...PAGE_FILES.map((file) => ({ file, id: 'D4', name: 'accessibility deltas', why: 'DoD §4: touch targets >= 44 px (footer links, small text links, logo), 4.5:1 contrast on the glass button over jade; the site applies the same CSS block', find: '</helmet>', replace: () => `<style id="tk-a11y-css">${a11yCss()}</style>\n</helmet>` })));

/** D7: client photos from the old site (client-img/webnode/CURATION.md) in place of two `[Foto]` placeholders; the reference shows the same image. */
const photoRef = (key) => ({ ...PHOTOS[key], src: `data:image/jpeg;base64,${readFileSync(new URL(`../../${PHOTOS[key].src.slice(2)}`, import.meta.url)).toString('base64')}` });
PATCHES.push(
  { file: 'OMne.dc.html', id: 'D7', name: 'photo (portrait)', why: 'Daniel\'s portrait from the old site replaces the [Foto] placeholder (4:5, same radius)', find: '<div class="ph" style="aspect-ratio: 4 / 5; min-height: 0"><span>[Foto]</span></div>', replace: () => photo(photoRef('portret')) },
  { file: 'Main.dc.html', id: 'D7', name: 'photo (home card)', why: 'the meadow photo the old site used (Pixabay licence) replaces the home bento [Foto] placeholder', find: '<div class="ph" style="min-height: 440px"><span>[Foto]</span></div>', replace: () => photo(photoRef('louka')) },
);

const countMatches = (text, find) => {
  if (typeof find === 'string') return find ? text.split(find).length - 1 : 0;
  const re = new RegExp(find.source, find.flags.replace('g', '') + 'g');
  return (text.match(re) || []).length;
};

/** Patches declared for `file` (matched by basename). */
export const patchesFor = (file, patches = PATCHES) => patches.filter((p) => p.file === basename(file));

/**
 * Apply every patch declared for `file` to `text`. Throws when a patch's `find` does not match exactly
 * once (0 = prototype drifted or the patch is stale, 2+ = ambiguous), naming file and patch id.
 */
export function applyPatches(file, text, patches = PATCHES) {
  let out = String(text);
  for (const p of patchesFor(file, patches)) {
    const n = countMatches(out, p.find);
    const want = p.count ?? 1;
    if (n !== want) throw new Error(`reference patch ${p.id} for ${basename(file)} (${p.name}: ${p.why}) matched ${n} times, expected exactly ${want}: ${String(p.find).slice(0, 120)}`);
    const rep = typeof p.replace === 'function' ? p.replace() : p.replace;
    const flags = typeof p.find === 'string' ? '' : p.find.flags.replace('g', '') + (want > 1 ? 'g' : '');
    out = typeof p.find === 'string' ? (want > 1 ? out.split(p.find).join(rep) : out.replace(p.find, () => rep)) : out.replace(new RegExp(p.find.source, flags), () => rep);
  }
  return out;
}

/** The theme's own rules for a component (site.css lines starting with `.<prefix>`), minus the no-JS ones. */
const themeRules = (prefix) => (readFileSync(new URL('../../wp-content/themes/tkadlcik/assets/css/site.css', import.meta.url), 'utf8')
  .match(new RegExp(`^\\.${prefix}[^{\\n]*\\{[^}\\n]*\\}$`, 'gm')) || []).join('');
/** The video facade rules the theme adds (if any; the facade itself is styled inline by fragments.mjs videoBox). */
export const videoCss = () => themeRules('tk-video');

/** The self-hosted thumbnail as a data: URI (the prototype server has no uploads; same pixels the WebP is made from). */
const thumb = (id) => `data:image/jpeg;base64,${readFileSync(new URL(`../../client-img/yt-${id}.jpg`, import.meta.url)).toString('base64')}`;
const VIDEO_WHY = 'the design\'s YouTube placeholders become the click-to-load video facade (build/fragments.mjs videoBox: self-hosted thumbnail + play button + the notice "Video načteme z YouTube až po kliknutí." (VIDEO_NOTE, the twin of the map box\'s note), nothing requested from YouTube before the click); the reference shows the very same box at the design\'s size';
/** The prototype gallery's (wrong) ids in caption order; the build maps each caption to its verified id (builders/cviceni.mjs VIDEOS). */
const PROTOTYPE_GALLERY_IDS = ['1nFm6-XwGpU', '1Mmz_QpYk9s', '1UPJuzGC1UY', 'NeVzb5hGM7A', 'oZB6Gq4QzC4'];
const CAPTION = (t) => `<figcaption style="font-weight: 500; letter-spacing: -.01em">${t}</figcaption>`;

/** D5: video facades on Cvičení (two inline placeholders + the five gallery boxes, captions verbatim). */
PATCHES.push(
  { file: 'Cviceni.dc.html', id: 'D5', name: 'video facade (brocade)', why: VIDEO_WHY, find: '<div class="ph" style="aspect-ratio: 16 / 10; min-height: 0"><span>[Video YouTube]</span></div>', replace: () => videoBox({ ...INLINE_VIDEOS.brokat, src: thumb(INLINE_VIDEOS.brokat.id) }) },
  { file: 'Cviceni.dc.html', id: 'D5', name: 'video facade (13 slov)', why: VIDEO_WHY, find: '<div class="ph ph-dark" style="aspect-ratio: 16 / 9; min-height: 0"><span>[Video YouTube]</span></div>', replace: () => videoBox({ ...INLINE_VIDEOS.slov, src: thumb(INLINE_VIDEOS.slov.id) }) },
  ...VIDEOS.map((v, i) => ({
    file: 'Cviceni.dc.html', id: 'D5', name: `video facade (gallery ${i + 1})`,
    why: `${VIDEO_WHY}; the design had the ids shuffled against their captions (verified against the old site and YouTube oEmbed), so "${v.title}" plays ${v.id}`,
    find: `<div class="ph" style="aspect-ratio: 16 / 9; min-height: 0"><span>[YouTube ${PROTOTYPE_GALLERY_IDS[i]}]</span></div>${CAPTION(v.title)}`,
    replace: () => `${videoBox({ ...v, src: thumb(v.id) })}${CAPTION(v.title)}`,
  })),
  { file: 'Cviceni.dc.html', id: 'D5', name: 'video facade styles', why: 'the facade\'s theme rules (site.css .tk-video*, if any), which the prototype stylesheet does not have', find: '</helmet>', replace: () => `<style id="tk-video-css">${videoCss()}</style>\n</helmet>` },
);

/**
 * D6: Akce heading outline (SEO/a11y audit): the harmonogram card's day is its <h4> (styled like the design's
 * .mono span), the topic a <p class="h3"> — two cards shared a topic, i.e. duplicate headings; the mountain
 * section's "Denní harmonogram" gets a visually hidden " v Krkonoších". Same look, distinct headings.
 */
const DAY_SPAN = (day, dark) => (dark ? `<span class="mono" style="color: var(--on-dark-muted)">${day}</span>` : `<span class="mono muted">${day}</span>`);
PATCHES.push(
  ...DAYS.map(([day, topic, dark]) => ({
    file: 'Seminare.dc.html', id: 'D6', name: `harmonogram day heading (${day})`,
    why: 'heading outline: the day becomes the card heading (h4, styled exactly like the design\'s mono span), the repeated topic a paragraph with the same .h3 look — no duplicate h4 texts, no visual change',
    find: `${DAY_SPAN(day, dark)}\n<h4 class="h3" style="margin: 0">${topic}</h4>`,
    replace: `${dayHeading(day, dark)}\n${dayTopic(topic)}`,
  })),
  { file: 'Seminare.dc.html', id: 'D6', name: 'second harmonogram heading', why: 'heading outline: the mountain section\'s "Denní harmonogram" h3 gets a visually hidden " v Krkonoších" so it differs from the seminar\'s; nothing visible changes', find: '<h3 class="eyebrow">Denní harmonogram</h3>\n<div style="overflow-x: auto">', replace: `${HORY_HEADING}\n<div style="overflow-x: auto">` },
);

/**
 * D8: the footer bar (every page) as footer.php prints it — the operator identification (§ 435 OZ, content.mjs
 * `business`) under the copyright, and "Nastavení cookies" (reopens the Complianz cookie banner; without JS the
 * privacy page's cookie section). Styles = chrome.css .tk-ft-id/.tk-ft-op/.tk-ft-consent as inline styles.
 */
export const footBar = (b = business) => {
  const segs = [b.name, b.ico ? `IČO ${b.ico}` : '', b.address, b.register].filter(Boolean);
  const op = segs.map((seg, i) => seg + (i < segs.length - 1 ? '&nbsp;·' : '')).join(' ');
  const id = segs.length ? `<span style="display:flex;flex-direction:column;gap:4px"><span>© Mgr. Daniel Tkadlčík</span><span style="font-size:13px;line-height:1.5">${op}</span></span>` : '<span>© Mgr. Daniel Tkadlčík</span>';
  return `<div class="foot-bottom">${id}<a href="/zasady-ochrany-osobnich-udaju/#cookies" style="display:inline-flex;align-items:center;align-self:flex-start;min-height:44px;margin-block:-12px;color:var(--ink-2);text-decoration:none">Nastavení cookies</a></div>`;
};
PATCHES.push(...PAGE_FILES.map((file) => ({ file, id: 'D8', name: 'footer bar: operator line + "Nastavení cookies"', why: 'legal: the operator identification (§ 435 OZ) under the copyright and the cookie-consent control (Complianz, strict opt-in for Google Analytics) that reopens the banner; footer.php prints the same', find: '<div class="foot-bottom"><span>© Mgr. Daniel Tkadlčík</span></div>', replace: () => footBar() })));

/** D9: the footer nav ends with the privacy page link (content.mjs `footer.links`; not in the header nav, every page must reach it). */
PATCHES.push(...PAGE_FILES.map((file) => ({ file, id: 'D9', name: 'footer nav: privacy page link', why: 'legal: the privacy policy (Zásady ochrany osobních údajů, incl. the cookie section the consent banner links to) is linked from every page\'s footer nav, after Články, like footer.php', find: '<a href="Clanky.dc.html">Články</a></nav>\n</div>\n<div class="wordmark"', replace: () => `<a href="Clanky.dc.html">Články</a><a href="${privacy.href}">${privacy.label}</a></nav>\n</div>\n<div class="wordmark"` })));
