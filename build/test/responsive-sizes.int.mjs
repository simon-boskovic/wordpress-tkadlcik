// `sizes` of the upload photos (theme inc/responsive-images.php TK_IMAGE_SIZES) against the rendered slot width.
// Not part of `npm test` (needs the stack and a browser):
//   TK_BASE=http://localhost:8020 node --test build/test/responsive-sizes.int.mjs
// For every upload <img> with srcset on every page, at viewports 360–1920 px: the width its `sizes` resolves to
// (media conditions via matchMedia, the length measured on a probe element) must not be below the rendered width
// (the browser would pick a blurry candidate) and not more than SLACK above it (over-fetching). `auto` is
// skipped as browsers that support it use the layout width anyway; the fallback after it is what is checked.
// Images still on the generic default ("(max-width: 767px) 100vw, 50vw") are reported, not failed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from '../lib/cdp.mjs';
import { ROUTES } from '../lib/routes.mjs';

const BASE = (process.env.TK_BASE || 'http://localhost:8020').replace(/\/$/, '');
const VIEWPORTS = [360, 390, 430, 500, 501, 600, 713, 714, 767, 768, 820, 999, 1000, 1024, 1031, 1032, 1071, 1072, 1180, 1239, 1240, 1280, 1440, 1920];
const SLACK = 4; // px: rounding of vw/calc against the layout
const DEFAULT = '(max-width: 767px) 100vw, 50vw';

const MEASURE = `(() => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.cssText = 'position:absolute;visibility:hidden;height:0;left:0;top:0';
  const resolve = (sizes) => {
    const items = sizes.split(/,(?![^(]*\\))/).map((s) => s.trim()).filter((s) => s && s !== 'auto');
    for (const it of items) {
      const m = /^(\\(.*\\))\\s+([^()]+|calc\\(.*\\))$/.exec(it);
      const media = m ? m[1] : null, len = m ? m[2] : it;
      if (media && !matchMedia(media).matches) continue;
      probe.style.width = len;
      return probe.getBoundingClientRect().width;
    }
    return null;
  };
  const out = [...document.images].filter((i) => i.srcset && i.src.includes('/wp-content/uploads/') && i.getClientRects().length)
    .map((i) => ({ file: i.src.split('/').pop(), sizes: i.getAttribute('sizes') || '', w: i.getBoundingClientRect().width, want: resolve(i.getAttribute('sizes') || '') }));
  probe.remove();
  return out;
})()`;

test('upload photos: sizes matches the rendered slot at every viewport', async () => {
  const b = await openBrowser({});
  const bad = [];
  const generic = new Set();
  try {
    for (const path of [...Object.keys(ROUTES)]) {
      for (const vw of VIEWPORTS) {
        await b.viewport(vw, 900, vw < 1000);
        await b.goto(BASE + path, 200);
        for (const r of await b.evaluate(MEASURE)) {
          if (r.sizes.replace(/^auto,\s*/, '') === DEFAULT) { generic.add(`${path} ${r.file}`); continue; }
          if (r.want === null || r.want < r.w - SLACK || r.want > r.w + SLACK) bad.push(`${path} @${vw}px ${r.file}: sizes → ${r.want === null ? 'nothing' : Math.round(r.want)} px, rendered ${Math.round(r.w)} px`);
        }
      }
    }
  } finally {
    await b.close();
  }
  if (generic.size) console.log(`generic default sizes (not checked): ${[...generic].join(', ')}`);
  assert.deepEqual(bad, []);
});
