/**
 * Markup fragments the prototype repeats verbatim on several pages (copied with their inline styles;
 * lib/finalize.mjs turns those into tk-s-* classes like everywhere else).
 */

const ARROW_PATH = '<path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>';

/** Button arrow (16 px), e.g. Main.dc.html "Nabídka kurzů a lekcí →". */
export const ARROW = `<svg class="arr" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">${ARROW_PATH}</svg>`;

/** Arrow at the foot of a .card-link (18 px, jade ink). */
export const CARD_ARROW = `<svg class="arr" style="margin-top: auto; color: var(--jade-ink)" width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">${ARROW_PATH}</svg>`;

/** Download icon (Clanky.dc.html "Stáhnout"). */
export const DOWNLOAD = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const PIN = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle></svg>';

/**
 * Click-to-load Google map for one place (port of martinadamus mapBox + assets/js/map.js, _tk_scripts "map"):
 * nothing is requested from Google until the visitor presses "Zobrazit mapu" — map.js then replaces the box
 * with the embed iframe (data-src). Without JS the button is hidden (site.css) and the link to Google Maps
 * remains. Takes the place of the design's "[Mapa]" placeholder (same 16:9 box, same radius).
 *
 * @param {{ name: string, map: string }} place content.mjs place
 * @param {(a: string) => string} embedUrl content.mjs mapsEmbedUrl
 * @param {(a: string) => string} linkUrl content.mjs mapsLinkUrl
 */
export const mapBox = (place, embedUrl, linkUrl) => {
  const amp = (u) => u.replace(/&/g, '&amp;');
  return `<div class="tk-map" data-tk-map-box data-src="${amp(embedUrl(place.map))}" data-title="Mapa – ${place.name}, ${place.map}" style="aspect-ratio: 16 / 9; min-height: 220px; border-radius: 16px">
<span class="tk-map-pin">${PIN}</span>
<button type="button" class="btn btn-jade btn-sm" data-tk-map>Zobrazit mapu</button>
<span class="small muted tk-map-note">Mapu načteme od Google až po kliknutí. <a class="lnk tk-map-link" href="${amp(linkUrl(place.map))}" target="_blank" rel="noopener">Otevřít v Google Maps</a></span>
</div>`;
};

const PLAY = '<svg width="68" height="48" viewBox="0 0 68 48" aria-hidden="true"><rect width="68" height="48" rx="14" fill="#0E0F0E" fill-opacity=".78"></rect><path d="M28 15.5v17l14.5-8.5z" fill="#FFFFFF"></path></svg>';

/**
 * The privacy notice every video box shows (twin of the map box's "Mapu načteme od Google až po kliknutí."):
 * a pill at the top of the thumbnail, gone with the box when video.js swaps in the iframe.
 */
export const VIDEO_NOTE = 'Video načteme z YouTube až po kliknutí.';

/** YouTube URLs for a video id: the privacy-enhanced embed (only after the click) and the plain watch page. */
export const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
export const youtubeWatchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/**
 * Click-to-load YouTube video (the map box's twin, theme assets/js/video.js, _tk_scripts "video"): nothing is
 * requested from Google/YouTube before the visitor's click — the thumbnail is self-hosted (client-img/yt-<id>.jpg,
 * YouTube's hqdefault downloaded once, imported as WebP by media-import). video.js replaces the
 * [data-tk-video-box] with an iframe (data-src = youtube-nocookie.com embed with autoplay, title = data-title)
 * when the [data-tk-video] button is pressed. Without JS the "Přehrát na YouTube" link opens the video on YouTube.
 * The VIDEO_NOTE pill (top of the box, pointer-events none so a click on it still plays) says that nothing is loaded from
 * YouTube before the click, like the map box's note.
 * Takes the place of the design's "[Video YouTube]" / "[YouTube <id>]" placeholders; `ratio` keeps the design box's
 * aspect ratio (the theme's .tk-video* rules in site.css style box, thumbnail and button — not inline, so the
 * no-JS rule hiding the button can win; the link pill, which only this fragment has, is styled inline).
 *
 * @param {{ id: string, title: string, ratio?: string, src?: string }} v YouTube id, caption (button label +
 *   iframe title), box aspect ratio; src overrides the thumbnail URL (reference patches use a data: URI)
 */
export const videoBox = ({ id, title, ratio = '16 / 9', src = `./client-img/yt-${id}.jpg` }) => `<div class="tk-video" data-tk-video-box data-src="${youtubeEmbedUrl(id)}" data-title="${title}" style="aspect-ratio: ${ratio}">
<img src="${src}" alt="" aria-hidden="true" width="480" height="360" loading="lazy" decoding="async">
<button type="button" class="tk-video-play" data-tk-video aria-label="Přehrát video: ${title}">${PLAY}</button>
<span class="tk-video-note" style="position: absolute; top: 12px; left: 12px; right: 12px; width: fit-content; padding: 4px 10px; border-radius: 999px; background: var(--scrim); color: var(--ink-2); font-size: 12px; line-height: 1.4; pointer-events: none">${VIDEO_NOTE}</span>
<a class="tk-video-link" href="${youtubeWatchUrl(id)}" target="_blank" rel="noopener" style="position: absolute; left: 16px; bottom: 16px; display: inline-flex; align-items: center; min-height: 44px; padding: 0 14px; border-radius: 999px; background: var(--scrim); color: var(--ink-2); font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; line-height: 1.4; text-decoration: none">Přehrát na YouTube</a>
</div>`;

/**
 * A photo in place of the design's `.ph` placeholder box: same radius, the box's size (aspect ratio or min-height),
 * cropped with object-fit/object-position. `./client-img/<file>` becomes the WebP upload (finalize); the theme's
 * responsive-images adds srcset/sizes. `priority` = above the fold (eager + fetchpriority high), else lazy.
 */
export const photo = ({ src, alt, w, h, box, pos = '50% 50%', priority = false }) => `<img src="${src}" alt="${alt}" width="${w}" height="${h}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="display: block; width: 100%; ${box}; object-fit: cover; object-position: ${pos}; border-radius: var(--r)">`;

export const PHOTOS = {
  portret: { src: './client-img/daniel-tkadlcik-portret.jpg', alt: 'Daniel Tkadlčík, lektor tchaj-ťi', w: 1440, h: 1920, box: 'aspect-ratio: 4 / 5; height: auto', pos: '55% 30%', priority: true },
  louka: { src: './client-img/louka-strom.jpg', alt: '', w: 1920, h: 1221, box: 'height: 100%; min-height: 440px', pos: '35% 50%' },
};
