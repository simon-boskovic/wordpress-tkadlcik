/**
 * images — DoD §4 "Fotky: WebP nebo AVIF, každá pod 300 kB, popisný alt, pevné rozměry, responzivní varianty".
 *  format/size: every image response of the page (D and M, after a scroll-through) is WebP/AVIF (SVG allowed
 *               for icons; the favicon/site icon link is not a photo) and < 300 kB;
 *  alt:         every <img> has an alt; empty alt only when decorative (aria-hidden, or inside a link/button
 *               that has its own text);
 *  dimensions:  every <img> has width+height attributes or a CSS aspect-ratio (no layout shift);
 *  responsive:  every upload photo rendered ≥ 300 px wide has srcset + sizes; photos below the first viewport
 *               are loading="lazy", the first-viewport ones are not.
 * Pages without photos (the client's photos are still pending — [Foto] placeholders) pass trivially.
 */
import { THRESHOLDS } from '../config.mjs';
import { loadSettled, openDevice, sleep } from '../session.mjs';

async function network(dev, url) {
  const b = await openDevice(dev);
  const reqs = new Map();
  try {
    b.on('Network.responseReceived', (p) => { if (p.type === 'Image') reqs.set(p.requestId, { url: p.response.url, mime: p.response.mimeType, status: p.response.status }); });
    b.on('Network.loadingFinished', (p) => { const r = reqs.get(p.requestId); if (r) r.bytes = p.encodedDataLength; });
    await loadSettled(b, url);
    const imgs = await b.evaluate(`[...document.images].map((i) => {
      const c = getComputedStyle(i); const lab = i.closest('a,button');
      const labelled = !!lab && ((lab.innerText || '').trim().length > 0 || (lab.getAttribute('aria-label') || '').length > 0);
      return { src: (i.currentSrc || i.src).split('/').pop(), alt: i.getAttribute('alt'), hasAlt: i.hasAttribute('alt'), decorative: !!i.closest('[aria-hidden="true"]') || i.getAttribute('role') === 'presentation' || labelled,
        dims: i.hasAttribute('width') && i.hasAttribute('height'), ratio: c.aspectRatio, visible: i.getClientRects().length > 0,
        upload: i.src.includes("/wp-content/uploads/"), w: Math.round(i.getBoundingClientRect().width), srcset: i.hasAttribute('srcset'), sizes: i.hasAttribute('sizes'), loading: i.dataset.origLoading || i.getAttribute('loading') || '', top: Math.round(i.getBoundingClientRect().top + scrollY) };
    })`);
    const icons = await b.evaluate(`[...document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon]')].map((l) => l.href)`);
    return { reqs: [...reqs.values()].filter((r) => !icons.includes(r.url)), imgs };
  } finally { await b.close(); }
}

export default {
  name: 'images',
  title: 'Photos WebP/AVIF < 300 kB, alt text, fixed dimensions, srcset/sizes, lazy below the fold',
  async run(ctx) {
    const problems = [], notes = [];
    const nets = [await network('D', ctx.localUrl), await network('M', ctx.localUrl)];
    const reqs = [...new Map(nets.flatMap((n) => n.reqs).map((r) => [r.url, r])).values()];
    for (const r of reqs) {
      const photoFmt = /image\/(webp|avif)/.test(r.mime), svg = /svg/.test(r.mime);
      if (!photoFmt && !svg) problems.push(`format ${r.mime}: ${r.url.split('/').pop()}`);
      if (r.bytes > THRESHOLDS.imageMaxBytes) problems.push(`${Math.round(r.bytes / 1024)} kB > 300 kB: ${r.url.split('/').pop()}`);
    }
    const imgs = nets[0].imgs;
    for (const i of imgs) {
      if (!i.hasAlt) problems.push(`no alt attribute: ${i.src}`);
      else if (!i.alt.trim() && !i.decorative) problems.push(`empty alt on a non-decorative image: ${i.src}`);
      else if (i.alt.trim() && i.alt.trim().length < 5) notes.push(`very short alt “${i.alt}”: ${i.src}`);
      if (!i.dims && (!i.ratio || i.ratio === 'auto')) problems.push(`no width/height attributes or aspect-ratio: ${i.src}`);
    }
    const vh = 900;
    for (const i of imgs.filter((x) => x.upload && x.visible && x.w >= 300)) {
      if (!i.srcset || !i.sizes) problems.push(`no srcset/sizes on a ${i.w} px photo: ${i.src}`);
      if (i.top > vh && i.loading !== 'lazy') problems.push(`below-the-fold photo not loading="lazy": ${i.src}`);
      if (i.top < vh * 0.8 && i.loading === 'lazy') notes.push(`first-viewport photo is lazy (LCP risk): ${i.src}`);
    }
    const photos = imgs.filter((x) => x.upload).length;
    const md = [
      `- image responses (D+M): ${reqs.length} — ${reqs.map((r) => `${r.url.split('/').pop()} ${r.mime.replace('image/', '')} ${r.bytes ? Math.round(r.bytes / 1024) + ' kB' : '?'}`).join(', ')}`,
      `- <img> elements: ${imgs.length}; alt: ${imgs.filter((i) => i.alt && i.alt.trim()).length} descriptive, ${imgs.filter((i) => i.hasAlt && !i.alt.trim()).length} empty (decorative ${imgs.filter((i) => i.hasAlt && !i.alt.trim() && i.decorative).length}); dimensions: ${imgs.filter((i) => i.dims).length} with width/height, ${imgs.filter((i) => !i.dims && i.ratio && i.ratio !== 'auto').length} with aspect-ratio only`,
      `- upload photos: ${photos} (${imgs.filter((x) => x.upload && x.srcset).length} with srcset, ${imgs.filter((x) => x.upload && x.loading === 'lazy').length} lazy)`,
      notes.length ? '- notes: ' + notes.join('; ') : '',
      '', problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'Formats, sizes, alt texts, dimensions and responsive variants are as required.',
    ].join('\n');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : `${reqs.length} image(s) WebP/AVIF/SVG < 300 kB, alt + dimensions OK${photos ? `, ${photos} photo(s) responsive` : ' (no photos yet)'}`, details: { reqs, imgs, problems, notes }, md };
  },
};
