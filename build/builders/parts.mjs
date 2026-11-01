/**
 * Section shells every page builder uses (redesign 2026-11-01). A page = the picture stage + a hero + sections in
 * the reading column + the full-width contact statement. `stageKey` on a section = the stage picture it brings in.
 */
import { isPast } from '../content.mjs';

/** Badge for a finished event (date-driven: content.mjs EVENTS + the build date). */
export const PAST_LABEL = 'Proběhlo';
export const pastBadge = (keys, day) => (isPast(keys, day) ? ` <span class="badge">${PAST_LABEL}</span>` : '');

/** Keeps hyphenated words (tchaj-ťi, čchi-kung) on one line in headings; plain text only. */
export const nb = (t) => (/[<&]/.test(t) ? t : t.replace(/([^\s-]+-[^\s-]+)/g, '<span class="nw">$1</span>'));

const stageAttr = (key) => (key ? ` data-stage="${key}"` : '');

/**
 * The first screen: h1, the supporting sentence(s), the actions. `wordmark` = the brand name set large along the
 * bottom, crossing onto the stage (home only).
 */
export function hero({ h1, lead = '', text = '', actions = '', wordmark = false, stageKey = '', extra = '' }) {
  return `<section class="sec hero${wordmark ? '' : ' hero-sub'}"${stageAttr(stageKey)}>
<div class="hero-text">
<h1 class="h1 rise">${nb(h1)}</h1>
${lead ? `<p class="lead rise d1">${lead}</p>` : ''}
${text ? `<p class="body rise d2">${text}</p>` : ''}
${actions ? `<div class="actions rise d3">${actions}</div>` : ''}
${extra}
</div>
${wordmark ? '<p class="wordmark" aria-hidden="true">radost v pohybu</p>' : ''}
</section>`;
}

/** A reading-column section with its heading. `head` = h2 text, `intro` = optional paragraph under it. */
export function sec({ id = '', stageKey = '', h2, intro = '', body, cls = '', labelledby = true }) {
  const hid = id ? `${id}-h` : '';
  return `<section class="sec${cls ? ` ${cls}` : ''}"${id ? ` id="${id}"` : ''}${stageAttr(stageKey)}${hid && labelledby ? ` aria-labelledby="${hid}"` : ''}>
<div class="sec-head">
<h2 class="h2 reveal"${hid ? ` id="${hid}"` : ''}>${nb(h2)}</h2>
${intro ? `<p class="body reveal">${intro}</p>` : ''}
</div>
${body}
</section>`;
}

/** Two-ended rows: [{ name, val, href?, desc? }] (+ optional group label). */
export function rows(items, label = '') {
  const li = items.map((r) => {
    const name = r.href ? `<a class="r-name" href="${r.href}">${r.name}</a>` : `<span class="r-name">${r.name}</span>`;
    return `<li>${name}${r.val ? `<span class="r-val">${r.val}</span>` : ''}${r.desc ? `<span class="r-desc">${r.desc}</span>` : ''}</li>`;
  }).join('\n');
  return `<div class="rows-group reveal">${label ? `<p class="rows-label">${label}</p>` : ''}<ul class="rows">\n${li}\n</ul></div>`;
}

/** Definition facts: [[term, value], …]. */
export const facts = (pairs) => `<dl class="facts">${pairs.map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

/** An image in the reading column (grey treatment like the stage). */
export const pic = ({ src, alt, w, h, ratio = '', pos = '50% 50%', cap = '' }) => `<figure class="media reveal"><img class="pic" src="${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async" style="${ratio ? `aspect-ratio: ${ratio}; ` : ''}object-position: ${pos}">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
