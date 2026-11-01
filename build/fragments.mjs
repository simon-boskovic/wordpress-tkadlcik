/**
 * Markup fragments shared by the page builders (redesign 2026-11-01, tasteskill v2 "split stage").
 * Class names only; site.css styles them. Images are written as `./client-img/<file>` and become the WebP upload
 * through lib/finalize.mjs (collected for build/media.json with their alt text).
 */
import { imageCredits } from './content.mjs';

const ARROW_PATH = '<path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>';

/** Arrow after a button or link label (16 px). */
export const ARROW = `<svg class="arr" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">${ARROW_PATH}</svg>`;

/** Download icon. */
export const DOWNLOAD = '<svg class="arr" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

/** A button: `primary` = the one filled action of a screen, `quiet` = tone-off fill. */
export const btn = (href, label, { kind = 'primary', arrow = true, attrs = '' } = {}) => `<a class="btn btn-${kind}" href="${href}"${attrs ? ` ${attrs}` : ''}>${label}${arrow ? ` ${ARROW}` : ''}</a>`;

/** A text link with an arrow (secondary action). */
export const more = (href, label, attrs = '') => `<a class="more" href="${href}"${attrs ? ` ${attrs}` : ''}>${label} ${ARROW}</a>`;

/**
 * Pictures the stage can show. `src` = client-img file, `alt` = what the picture shows, `cap` = the caption under it
 * (what it is: work, author, period), `pos` = object-position for the tall crop.
 * Found pictures carry their credit from build/image-credits.json (footer).
 */
export const PICTURES = {
  hory: { src: './client-img/tk-ink-hory.jpg', w: 1600, h: 2960, alt: 'Čínská tušová malba: hory, borovice a pavilon u vody', cap: 'Xiang Shengmo, Krajina, dynastie Ming', pos: '50% 40%' },
  weiqi: { src: './client-img/tk-ink-weiqi.jpg', w: 1306, h: 2250, alt: 'Čínská malba: taoističtí nesmrtelní hrají pod stromy hru weiqi', cap: 'Dai Jin, Krajina s taoistickými nesmrtelnými, dynastie Ming', pos: '50% 60%' },
  wangmeng: { src: './client-img/tk-ink-wang-meng.jpg', w: 1071, h: 2250, alt: 'Čínská tušová malba: vysoké hory porostlé lesem', cap: 'Wang Shimin, Krajina podle Wang Menga, 1664', pos: '50% 35%' },
  vejir: { src: './client-img/tk-ink-vejir.jpg', w: 843, h: 954, alt: 'Čínská malba v kruhu: poutník s chlapcem pod borovicí', cap: 'Ren Yi, Krajina s postavami, 1883', pos: '50% 50%' },
  svitek: { src: './client-img/tk-ink-svitek.jpg', w: 1600, h: 788, alt: 'Čínská tušová malba: hory a stromy v mlze na svitku', cap: 'Gong Xian, Krajina, dynastie Čching', pos: '30% 50%' },
  peking: { src: './client-img/tk-peking-1988.jpg', w: 1300, h: 713, alt: 'Skupina lidí cvičí ranní tchaj-ťi v pekingském parku', cap: 'Ranní tchaj-ťi v Pekingu, 1988', pos: '62% 50%' },
  snih: { src: './client-img/tk-snih-yang.jpg', w: 1920, h: 1308, alt: 'Cvičenec v bílém provádí tchaj-ťi stylu Yang ve sněhu', cap: 'Tchaj-ťi stylu Yang ve sněhu', pos: '40% 50%' },
  strazne: { src: './client-img/tk-strazne.jpg', w: 1600, h: 806, alt: 'Cesta na hřebeni nad Strážným v Krkonoších při západu slunce', cap: 'Krkonoše nad Strážným', pos: '55% 50%' },
  praha: { src: './client-img/tk-praha-jeremenkova.jpg', w: 1920, h: 1440, alt: 'Základní škola Jeremenkova v Praze-Braníku, průčelí budovy', cap: 'ZŠ Jeremenkova, Praha 4', pos: '50% 45%' },
  zlin: { src: './client-img/tk-zlin.jpg', w: 1600, h: 1200, alt: 'Zlín z výšky, pohled z Baťova mrakodrapu', cap: 'Zlín z Baťova mrakodrapu', pos: '50% 50%' },
  portret: { src: './client-img/daniel-tkadlcik-portret.jpg', w: 1440, h: 1920, alt: 'Daniel Tkadlčík, lektor tchaj-ťi', cap: 'Daniel Tkadlčík', pos: '55% 30%', own: true },
};

const fileOf = (p) => p.src.replace('./client-img/', '');
for (const p of Object.values(PICTURES)) if (!p.own && !imageCredits[fileOf(p)]) throw new Error(`fragments: no credit for ${fileOf(p)} (build/image-credits.json)`);

/**
 * The fixed picture stage (the direction's still half). `keys` = the pictures in order; the first shows on load
 * (eager, high priority), the rest crossfade in as the section carrying `data-stage="<key>"` reaches the middle of
 * the screen (assets/js/stage.js). Without JS the first picture stays. On a phone the stage is the picture at the
 * top of the page. aria-hidden is not used: the pictures are content and carry alt text.
 */
export function stage(keys) {
  const figs = keys.map((k, i) => {
    const p = PICTURES[k];
    if (!p) throw new Error(`stage: unknown picture ${k}`);
    const load = i === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
    return `<figure class="stage-fig"${i === 0 ? ' data-active data-stage-first' : ''} data-stage-fig="${k}" data-cap="${p.cap}">
<img src="${p.src}" alt="${p.alt}" width="${p.w}" height="${p.h}" ${load} decoding="async" sizes="(max-width: 899px) calc(104vw - 25px), calc(48.9vw - 21px)" style="object-position: ${p.pos}">
</figure>`;
  });
  // One caption for the stage (what the shown picture is); stage.js swaps its text with the picture.
  return `<div class="stage" data-stage>\n${figs.join('\n')}\n<p class="stage-cap" data-stage-cap>${PICTURES[keys[0]].cap}</p>\n</div>`;
}

/** The stage keys a page uses, for the credits check (seo/tests). */
export const stageKeys = (html) => [...html.matchAll(/data-stage-fig="([\w-]+)"/g)].map((m) => m[1]);

const PIN = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle></svg>';

/**
 * Click-to-load Google map for one place (assets/js/map.js, _tk_scripts "map"): nothing is requested from Google
 * until the visitor presses "Zobrazit mapu"; map.js then replaces the box with the embed iframe (data-src).
 * Without JS the button is hidden (site.css) and the link to Google Maps remains.
 */
export const mapBox = (place, embedUrl, linkUrl) => {
  const amp = (u) => u.replace(/&/g, '&amp;');
  return `<div class="tk-map" data-tk-map-box data-src="${amp(embedUrl(place.map))}" data-title="Mapa – ${place.name}, ${place.map}">
<span class="tk-map-pin">${PIN}</span>
<button type="button" class="btn btn-primary" data-tk-map>Zobrazit mapu</button>
<span class="tk-map-note">Mapu načteme od Google až po kliknutí. <a class="tk-map-link" href="${amp(linkUrl(place.map))}" target="_blank" rel="noopener">Otevřít v Google Maps</a></span>
</div>`;
};

const PLAY = '<svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="34" fill="currentColor"></circle><path d="M28 22.5v23l18-11.5z" fill="#161C1A"></path></svg>';

/** The privacy notice every video box shows (twin of the map box's note). */
export const VIDEO_NOTE = 'Video načteme z YouTube až po kliknutí.';

/** YouTube URLs for a video id: the privacy-enhanced embed (only after the click) and the plain watch page. */
export const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
export const youtubeWatchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/**
 * Click-to-load YouTube video (assets/js/video.js, _tk_scripts "video"): the self-hosted thumbnail
 * (client-img/yt-<id>.jpg: YouTube's maxresdefault 1280x720 where it exists, else hqdefault 480x360) with a play button; video.js swaps in the youtube-nocookie iframe on the click.
 * Without JS the "Přehrát na YouTube" link opens the video on YouTube. The thumbnail is a real picture (alt).
 */
export const videoBox = ({ id, title, w = 1280, h = 720 }) => `<div class="tk-video" data-tk-video-box data-src="${youtubeEmbedUrl(id)}" data-title="${title}">
<img src="./client-img/yt-${id}.jpg" alt="Náhled videa: ${title}" width="${w}" height="${h}" loading="lazy" decoding="async">
<button type="button" class="tk-video-play" data-tk-video aria-label="Přehrát video: ${title}">${PLAY}</button>
<span class="tk-video-note">${VIDEO_NOTE}</span>
<a class="tk-video-link" href="${youtubeWatchUrl(id)}" target="_blank" rel="noopener">Přehrát na YouTube</a>
</div>`;

/** The site's videos (captions = the old Videogalerie's, typos fixed). Ids checked against YouTube oEmbed titles. */
export const VIDEOS = [
  { id: '1nFm6-XwGpU', title: 'Začátečnická sestava 12 forem Yang tchaj-ťi' },
  { id: 'NeVzb5hGM7A', title: 'Ukázka sestavy Yang 43 forem v provedení velkého řádu. Mistr Vincent Chu', w: 480, h: 360 },
  { id: 'oZB6Gq4QzC4', title: 'Ukázka sestavy s holí' },
  { id: '1Mmz_QpYk9s', title: 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje' },
  { id: '1UPJuzGC1UY', title: '13 slov tchaj-ťi' },
];
export const video = (id) => VIDEOS.find((v) => v.id === id);

/**
 * The closing statement every page ends with (direction: "the email as display type"), full width, the inverse
 * field. `lead` = the sentence at its top (words from the site).
 */
export function contactStatement(content, { lead = 'Kurzy probíhají na adrese ZŠ Jeremenkova, Jeremenkova 1003/66A.', id = 'kontakt-paticka', heading = 'Kontakt' } = {}) {
  const c = content.contact;
  const [user, domain] = c.email.split('@');
  return `<section class="statement" id="${id}" aria-labelledby="${id}-h">
<div class="statement-in">
<div class="statement-top">
<h2 id="${id}-h" class="statement-h">${heading}</h2>
<p class="statement-lead">${lead}</p>
</div>
<a class="statement-mail" href="mailto:${c.email}">${user}<wbr>@${domain}</a>
<div class="statement-foot">
<p><a href="${c.phoneHref}">${c.phone}</a><br><a href="/kontakt/#formular">Kontaktní formulář</a><br>${c.name}</p>
<p>${content.places.map((p) => p.line).join('<br>')}</p>
</div>
</div>
</section>`;
}
