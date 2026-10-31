import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { blank, blit, crc32, crop, decodePng, encodePng } from '../lib/png.mjs';
import { colorDelta, compareImages, diffBands, sideBySide } from '../lib/imgdiff.mjs';

const px = (img, x, y) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)];
const fill = (img, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.data.set(c, (y * img.width + x) * 4); return img; };

/** Hand-built PNG with a chosen colour type and per-row filter, to exercise the decoder's unfilter paths. */
function rawPng(width, height, type, rowsBytes, filters) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (name, body) => {
    const h = Buffer.alloc(8); h.writeUInt32BE(body.length, 0); h.write(name, 4, 'latin1');
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([h.subarray(4), body])), 0);
    return Buffer.concat([h, body, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = type;
  const raw = Buffer.concat(rowsBytes.map((r, i) => Buffer.concat([Buffer.from([filters[i]]), Buffer.from(r)])));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('crc32 matches the PNG spec check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('encodePng -> decodePng round-trips RGBA exactly', () => {
  const img = blank(7, 5, [26, 26, 26, 255]);
  fill(img, 2, 1, 3, 2, [184, 50, 31, 255]);
  fill(img, 0, 4, 7, 1, [242, 239, 233, 128]);
  const back = decodePng(encodePng(img));
  assert.equal(back.width, 7); assert.equal(back.height, 5);
  assert.deepEqual([...back.data], [...img.data]);
});

test('decodePng handles RGB with every filter type (None, Sub, Up, Average, Paeth)', () => {
  // 2x5 RGB; the expected pixel values are chosen, the filtered bytes derived from them.
  const want = [[[10, 20, 30], [40, 50, 60]], [[70, 80, 90], [100, 110, 120]], [[5, 6, 7], [200, 201, 202]], [[9, 9, 9], [1, 2, 3]], [[250, 0, 128], [128, 64, 32]]];
  const flat = want.map((r) => r.flat());
  const enc = (f, y) => flat[y].map((v, i) => {
    const a = i >= 3 ? flat[y][i - 3] : 0, b = y ? flat[y - 1][i] : 0, c = y && i >= 3 ? flat[y - 1][i - 3] : 0;
    const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1
      : (() => { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; })();
    return (v - pred) & 0xff;
  });
  const filters = [0, 1, 2, 3, 4];
  const img = decodePng(rawPng(2, 5, 2, filters.map((f, y) => enc(f, y)), filters));
  for (let y = 0; y < 5; y++) for (let x = 0; x < 2; x++) assert.deepEqual(px(img, x, y), [...want[y][x], 255], `pixel ${x},${y}`);
});

test('decodePng expands greyscale and grey+alpha', () => {
  const g = decodePng(rawPng(2, 1, 0, [[0, 200]], [0]));
  assert.deepEqual(px(g, 1, 0), [200, 200, 200, 255]);
  const ga = decodePng(rawPng(1, 1, 4, [[90, 10]], [0]));
  assert.deepEqual(px(ga, 0, 0), [90, 90, 90, 10]);
});

test('colorDelta is 0 for identical pixels and grows with the difference', () => {
  const a = new Uint8Array([26, 26, 26, 255, 26, 26, 26, 255, 255, 255, 255, 255]);
  assert.equal(colorDelta(a, a, 0, 4), 0);
  const small = Math.abs(colorDelta(a, new Uint8Array([28, 26, 26, 255]), 0, 0));
  const big = Math.abs(colorDelta(a, a, 0, 8));
  assert.ok(small > 0 && small < big);
  assert.ok(big > 35215 * 0.1 * 0.1, 'black vs white is far above the 0.1 threshold');
  assert.ok(small < 35215 * 0.1 * 0.1, 'a 2-level nudge stays below the threshold');
});

test('compareImages: identical images give 0 diff', () => {
  const a = blank(20, 10, [26, 26, 26, 255]);
  fill(a, 3, 3, 5, 5, [242, 239, 233, 255]);
  const r = compareImages(a, { ...a, data: new Uint8Array(a.data) });
  assert.equal(r.diff, 0); assert.equal(r.ratio, 0); assert.equal(r.missing, 0);
});

test('compareImages counts a changed block and reports the rows it sits in', () => {
  const a = blank(40, 40, [26, 26, 26, 255]);
  const b = fill(blank(40, 40, [26, 26, 26, 255]), 10, 20, 10, 10, [184, 50, 31, 255]);
  const r = compareImages(a, b);
  // A flat block's interior is never anti-aliasing; allow the detector to excuse at most its outline.
  assert.ok(r.diff >= 64 && r.diff <= 100, `diff ${r.diff}`);
  assert.equal(r.rows[5], 0);
  assert.ok(r.rows[25] >= 8);
  const bands = diffBands(r.rows, { minRow: 1, minPixels: 1 });
  assert.equal(bands.length, 1);
  assert.ok(bands[0].y0 >= 20 && bands[0].y1 <= 29, JSON.stringify(bands));
  assert.deepEqual(px(r.heat, 15, 25), [255, 0, 0, 255], 'diff pixel painted red');
});

test('compareImages: a height mismatch counts as differing area over the larger canvas', () => {
  const a = blank(10, 100, [26, 26, 26, 255]);
  const b = blank(10, 90, [26, 26, 26, 255]);
  const r = compareImages(a, b);
  assert.equal(r.height, 100); assert.equal(r.total, 1000);
  assert.equal(r.missing, 100); assert.equal(r.diff, 100);
  assert.equal(r.ratio, 0.1);
  assert.deepEqual(px(r.heat, 5, 95), [255, 0, 255, 255], 'missing area painted magenta');
});

test('compareImages tolerates anti-aliased edge pixels like pixelmatch', () => {
  // A 1px-shifted soft (anti-aliased) diagonal edge: only intermediate edge pixels differ.
  const mk = (shift) => {
    const img = blank(30, 30, [0, 0, 0, 255]);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
      const d = x - y - shift;
      const v = d > 1 ? 255 : d < -1 ? 0 : Math.round(((d + 1) / 2) * 255);
      img.data.set([v, v, v, 255], (y * 30 + x) * 4);
    }
    return img;
  };
  const withAA = compareImages(mk(0), mk(0.5), { includeAA: true });
  const noAA = compareImages(mk(0), mk(0.5));
  assert.ok(withAA.diff > 0);
  assert.ok(noAA.diff < withAA.diff, `AA detection should excuse edge pixels (${noAA.diff} vs ${withAA.diff})`);
  assert.ok(noAA.aa > 0);
});

test('diffBands merges nearby hot rows and sorts by size', () => {
  const rows = new Uint32Array(300);
  for (let y = 10; y < 20; y++) rows[y] = 10;        // band A: 100 px
  for (let y = 30; y < 35; y++) rows[y] = 10;        // 10px gap -> merges into A
  for (let y = 200; y < 260; y++) rows[y] = 20;      // band B: 1200 px
  const bands = diffBands(rows);
  assert.equal(bands.length, 2);
  assert.deepEqual([bands[0].y0, bands[0].y1, bands[0].pixels], [200, 259, 1200]);
  assert.deepEqual([bands[1].y0, bands[1].y1, bands[1].pixels], [10, 34, 150]);
});

test('sideBySide / crop / blit lay images out left to right', () => {
  const a = blank(4, 3, [255, 0, 0, 255]), b = blank(4, 5, [0, 255, 0, 255]), h = blank(4, 5, [0, 0, 255, 255]);
  const s = sideBySide(a, b, h, 2);
  assert.equal(s.width, 16); assert.equal(s.height, 5);
  assert.deepEqual(px(s, 0, 0), [255, 0, 0, 255]);
  assert.deepEqual(px(s, 4, 0), [90, 90, 90, 255]);
  assert.deepEqual(px(s, 6, 4), [0, 255, 0, 255]);
  assert.deepEqual(px(s, 12, 4), [0, 0, 255, 255]);
  const c = crop(s, 5, 1, 3, 2);
  assert.equal(c.width, 3); assert.deepEqual(px(c, 1, 0), [0, 255, 0, 255]);
  const d = blit(blank(2, 2), a, -1, -1);
  assert.deepEqual(px(d, 0, 0), [255, 0, 0, 255]);
});
