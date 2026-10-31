/**
 * Pixel comparison in the style of pixelmatch (YIQ colour delta + anti-aliasing detection),
 * reimplemented without dependencies, plus the helpers the DoD harness needs on top:
 *  - images of different size are compared over the LARGER canvas; every pixel that exists in only
 *    one of them counts as different (a height mismatch is differing area, not something to hide);
 *  - per-row diff counts, clustered into vertical bands so a fixer knows where to look;
 *  - a heat-map image (faded reference, red = different, yellow = anti-aliasing, magenta = no counterpart).
 */
import { blank, blit } from './png.mjs';

const rgb2y = (r, g, b) => r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
const rgb2i = (r, g, b) => r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
const rgb2q = (r, g, b) => r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
const blendWhite = (c, a) => 255 + (c - 255) * a;

/** Squared YIQ distance between pixel k of a and pixel m of b (pixelmatch's colorDelta). yOnly = brightness delta only. */
export function colorDelta(a, b, k, m, yOnly = false) {
  let r1 = a[k], g1 = a[k + 1], b1 = a[k + 2], a1 = a[k + 3];
  let r2 = b[m], g2 = b[m + 1], b2 = b[m + 2], a2 = b[m + 3];
  if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) return 0;
  if (a1 < 255) { a1 /= 255; r1 = blendWhite(r1, a1); g1 = blendWhite(g1, a1); b1 = blendWhite(b1, a1); }
  if (a2 < 255) { a2 /= 255; r2 = blendWhite(r2, a2); g2 = blendWhite(g2, a2); b2 = blendWhite(b2, a2); }
  const y1 = rgb2y(r1, g1, b1), y2 = rgb2y(r2, g2, b2), y = y1 - y2;
  if (yOnly) return y;
  const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
  const q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
  const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
  return y1 > y2 ? -delta : delta;
}

function hasManySiblings(img, x1, y1, w, h) {
  const x0 = Math.max(x1 - 1, 0), y0 = Math.max(y1 - 1, 0), x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1);
  const pos = (y1 * w + x1) * 4;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
  for (let x = x0; x <= x2; x++) for (let y = y0; y <= y2; y++) {
    if (x === x1 && y === y1) continue;
    const pos2 = (y * w + x) * 4;
    if (img[pos] === img[pos2] && img[pos + 1] === img[pos2 + 1] && img[pos + 2] === img[pos2 + 2] && img[pos + 3] === img[pos2 + 3]) zeroes++;
    if (zeroes > 2) return true;
  }
  return false;
}

/** pixelmatch's antialiased(): is pixel (x1,y1) of img an anti-aliased edge pixel (checked against img2)? */
function antialiased(img, x1, y1, w, h, img2, w2, h2) {
  const x0 = Math.max(x1 - 1, 0), y0 = Math.max(y1 - 1, 0), x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1);
  const pos = (y1 * w + x1) * 4;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
  let min = 0, max = 0, minX, minY, maxX, maxY;
  for (let x = x0; x <= x2; x++) for (let y = y0; y <= y2; y++) {
    if (x === x1 && y === y1) continue;
    const delta = colorDelta(img, img, pos, (y * w + x) * 4, true);
    if (delta === 0) { zeroes++; if (zeroes > 2) return false; }
    else if (delta < min) { min = delta; minX = x; minY = y; }
    else if (delta > max) { max = delta; maxX = x; maxY = y; }
  }
  if (min === 0 || max === 0) return false;
  const inB = (x, y) => x < w2 && y < h2;
  return (hasManySiblings(img, minX, minY, w, h) && inB(minX, minY) && hasManySiblings(img2, minX, minY, w2, h2))
    || (hasManySiblings(img, maxX, maxY, w, h) && inB(maxX, maxY) && hasManySiblings(img2, maxX, maxY, w2, h2));
}

/**
 * Compare two RGBA images. Returns counts over the larger canvas, per-row diff counts and (optionally) a heat map.
 * @param {{width,height,data}} a reference
 * @param {{width,height,data}} b candidate
 * @param {{ threshold?: number, includeAA?: boolean, heatmap?: boolean }} opts threshold 0..1 (pixelmatch default 0.1)
 */
export function compareImages(a, b, { threshold = 0.1, includeAA = false, heatmap = true } = {}) {
  const W = Math.max(a.width, b.width), H = Math.max(a.height, b.height);
  const cw = Math.min(a.width, b.width), chh = Math.min(a.height, b.height);
  const maxDelta = 35215 * threshold * threshold;
  const rows = new Uint32Array(H);
  const out = heatmap ? new Uint8Array(W * H * 4) : null;
  let diff = 0, aa = 0, missing = 0;
  const A = a.data, B = b.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (x >= cw || y >= chh) {
        // Only one image has this pixel: differing area by definition.
        diff++; missing++; rows[y]++;
        if (out) { out[o] = 255; out[o + 1] = 0; out[o + 2] = 255; out[o + 3] = 255; }
        continue;
      }
      const pa = (y * a.width + x) * 4, pb = (y * b.width + x) * 4;
      const delta = colorDelta(A, B, pa, pb);
      if (Math.abs(delta) > maxDelta) {
        if (!includeAA && (antialiased(A, x, y, a.width, a.height, B, b.width, b.height) || antialiased(B, x, y, b.width, b.height, A, a.width, a.height))) {
          aa++;
          if (out) { out[o] = 255; out[o + 1] = 255; out[o + 2] = 0; out[o + 3] = 255; }
        } else {
          diff++; rows[y]++;
          if (out) { out[o] = 255; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 255; }
        }
      } else if (out) {
        // Faded greyscale of the reference so the diff can be read in context.
        const g = Math.round(20 + rgb2y(A[pa], A[pa + 1], A[pa + 2]) * 0.3);
        out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = 255;
      }
    }
  }
  const total = W * H;
  return { width: W, height: H, diff, aa, missing, total, ratio: total ? diff / total : 0, rows, heat: out ? { width: W, height: H, data: out } : null };
}

/**
 * Cluster per-row diff counts into vertical bands.
 * A row is "hot" when it has at least minRow differing pixels; hot rows closer than gap px merge.
 * Bands are returned sorted by differing-pixel count (largest first).
 */
export function diffBands(rows, { minRow = 3, gap = 24, minPixels = 50 } = {}) {
  const bands = [];
  let cur = null;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] >= minRow) {
      if (cur && y - cur.y1 <= gap) { cur.y1 = y; cur.pixels += rows[y]; }
      else { cur = { y0: y, y1: y, pixels: rows[y] }; bands.push(cur); }
    } else if (cur && rows[y] && y - cur.y1 <= gap) cur.pixels += rows[y];
  }
  return bands.filter((b) => b.pixels >= minPixels).sort((p, q) => q.pixels - p.pixels);
}

/** Reference | candidate | heat map, side by side with a grey gutter. */
export function sideBySide(a, b, heat, gutter = 16) {
  const H = Math.max(a.height, b.height, heat ? heat.height : 0);
  const W = a.width + b.width + (heat ? heat.width : 0) + gutter * (heat ? 2 : 1);
  const img = blank(W, H, [90, 90, 90, 255]);
  blit(img, a, 0, 0);
  blit(img, b, a.width + gutter, 0);
  if (heat) blit(img, heat, a.width + b.width + gutter * 2, 0);
  return img;
}
