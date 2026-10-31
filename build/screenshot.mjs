/**
 * Full-page screenshot through headless Chromium (build/lib/cdp.mjs).
 *   node build/screenshot.mjs <url> <out.png> [width=1280] [height=900] [--mobile] [--viewport] [--reduced-motion] [--fresh]
 * --fresh: first visit, cookie banner shown (default: consent dismissed — see build/lib/cdp.mjs).
 * Parity workflow: node build/serve-prototype.mjs, then shoot the prototype page and the WP page at
 * 1440x900 and 390x844 --mobile into build/shots/ and compare them side by side (or let `node build/dod.mjs
 * --checks=visual` do the pixel comparison).
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openBrowser } from './lib/cdp.mjs';

const args = process.argv.slice(2);
const [url, out, width = '1280', height = '900'] = args.filter((a) => !a.startsWith('--'));
if (!url || !out) { console.error('usage: node build/screenshot.mjs <url> <out.png> [width] [height] [--mobile] [--viewport] [--reduced-motion] [--fresh]'); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });
const b = await openBrowser({ width: Number(width), height: Number(height), mobile: args.includes('--mobile'), reducedMotion: args.includes('--reduced-motion'), ...(args.includes('--fresh') ? { consent: 'fresh' } : {}) });
try {
  await b.goto(url, /\.dc\.html/.test(url) ? 2500 : 500);   // the prototype renders client-side after load
  const size = await b.screenshot(out, { full: !args.includes('--viewport') });
  console.log(`${out}  ${size.width}x${size.height}`);
} finally {
  await b.close();
}
