/**
 * Minimal PNG codec on node:zlib — no npm dependencies.
 * decodePng: 8-bit (and 16-bit, downsampled) greyscale / RGB / palette / grey+alpha / RGBA, non-interlaced
 *            (what Chromium's Page.captureScreenshot and Page.startScreencast produce). Returns RGBA.
 * encodePng: 8-bit RGBA, filter "Sub" per row (good enough for screenshots, keeps files small).
 */
import { deflateSync, inflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** @returns {{ width: number, height: number, data: Uint8Array }} data = RGBA, 4 bytes per pixel */
export function decodePng(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let pos = 8, width, height, depth, type, interlace, palette, trns;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const name = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (name === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      depth = body[8]; type = body[9]; interlace = body[12];
    } else if (name === 'PLTE') palette = body;
    else if (name === 'tRNS') trns = body;
    else if (name === 'IDAT') idat.push(body);
    else if (name === 'IEND') break;
  }
  if (interlace) throw new Error('interlaced PNG not supported');
  if (!(type in CHANNELS)) throw new Error(`PNG colour type ${type} not supported`);
  if (depth !== 8 && depth !== 16) throw new Error(`PNG bit depth ${depth} not supported`);
  const ch = CHANNELS[type];
  const bpp = ch * (depth / 8);            // bytes per pixel (filter unit)
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride);
  const out = new Uint8Array(width * height * 4);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[p++];
    for (let i = 0; i < stride; i++) {
      const x = raw[p++];
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v;
      switch (f) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: throw new Error(`bad PNG filter ${f}`);
      }
      cur[i] = v & 0xff;
    }
    const step = depth / 8;                 // 16-bit: take the high byte of each sample
    for (let x = 0; x < width; x++) {
      const s = x * bpp, o = (y * width + x) * 4;
      const sample = (k) => cur[s + k * step];
      if (type === 6) { out[o] = sample(0); out[o + 1] = sample(1); out[o + 2] = sample(2); out[o + 3] = sample(3); }
      else if (type === 2) {
        out[o] = sample(0); out[o + 1] = sample(1); out[o + 2] = sample(2); out[o + 3] = 255;
        if (trns && depth === 8 && trns.length >= 6 && trns[1] === out[o] && trns[3] === out[o + 1] && trns[5] === out[o + 2]) out[o + 3] = 0;
      } else if (type === 0) { out[o] = out[o + 1] = out[o + 2] = sample(0); out[o + 3] = 255; }
      else if (type === 4) { out[o] = out[o + 1] = out[o + 2] = sample(0); out[o + 3] = sample(1); }
      else { // palette
        const idx = cur[s];
        out[o] = palette[idx * 3]; out[o + 1] = palette[idx * 3 + 1]; out[o + 2] = palette[idx * 3 + 2];
        out[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
    prev.set(cur);
  }
  return { width, height, data: out };
}

function chunk(name, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(name, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** @param {{ width: number, height: number, data: Uint8Array }} img RGBA */
export function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1), s = y * stride;
    raw[o] = 1;                               // Sub filter
    for (let i = 0; i < stride; i++) raw[o + 1 + i] = (data[s + i] - (i >= 4 ? data[s + i - 4] : 0)) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

/** New blank RGBA image filled with one colour. */
export function blank(width, height, [r, g, b, a = 255] = [0, 0, 0, 255]) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; }
  return { width, height, data };
}

/** Copy src (or its [sx,sy,w,h] region) into dst at (dx,dy), clipped to dst. */
export function blit(dst, src, dx, dy, sx = 0, sy = 0, w = src.width, h = src.height) {
  for (let y = 0; y < h; y++) {
    const ty = dy + y, fy = sy + y;
    if (ty < 0 || ty >= dst.height || fy < 0 || fy >= src.height) continue;
    for (let x = 0; x < w; x++) {
      const tx = dx + x, fx = sx + x;
      if (tx < 0 || tx >= dst.width || fx < 0 || fx >= src.width) continue;
      const s = (fy * src.width + fx) * 4, d = (ty * dst.width + tx) * 4;
      dst.data[d] = src.data[s]; dst.data[d + 1] = src.data[s + 1]; dst.data[d + 2] = src.data[s + 2]; dst.data[d + 3] = src.data[s + 3];
    }
  }
  return dst;
}

/** Region copy as a new image. */
export function crop(src, x, y, w, h) {
  return blit(blank(w, h, [0, 0, 0, 0]), src, 0, 0, x, y, w, h);
}

/** Nearest-neighbour downscale by an integer-ish factor (for thumbnails of tall pages). */
export function downscale(src, factor) {
  const w = Math.max(1, Math.round(src.width / factor)), h = Math.max(1, Math.round(src.height / factor));
  const out = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (Math.min(src.height - 1, Math.floor(y * factor)) * src.width + Math.min(src.width - 1, Math.floor(x * factor))) * 4, d = (y * w + x) * 4;
    out.data[d] = src.data[s]; out.data[d + 1] = src.data[s + 1]; out.data[d + 2] = src.data[s + 2]; out.data[d + 3] = src.data[s + 3];
  }
  return out;
}
