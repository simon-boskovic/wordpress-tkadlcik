/**
 * Static server for the Claude Design prototype, so it can be opened next to the WordPress build and the DoD
 * harness can compare against it (port of martinadamus build/serve-prototype.mjs).
 *
 *   node build/serve-prototype.mjs        -> http://127.0.0.1:8765/Main.dc.html   (PORT=… to change)
 *
 * The .dc.html files boot through support.js (the Claude Design runtime, React 18 UMD from unpkg.com), which
 * fetches the sibling .dc.html files of a <dc-import>; Chromium refuses that over file://, hence a server.
 *
 * Reference patches (build/lib/reference-patches.mjs): deliberate deviations of the production build from the
 * prototype (font picker removed, self-hosted Geist instead of Google Fonts, click-to-load map boxes, …), each
 * named and justified, are applied to the served HTML only — the files on disk stay untouched. A patch whose
 * anchor does not match exactly once makes the response a 500 with the reason, so prototype drift is caught
 * instead of silently comparing against stale content.
 * /tk-fonts/* serves the theme's assets/fonts/ (the Geist faces the font patch declares: the site's own files).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize, sep } from 'node:path';
import { applyPatches, patchesFor } from './lib/reference-patches.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(REPO, 'design_handoff_tkadlcik');
const FONT_ROOT = join(REPO, 'wp-content', 'themes', 'tkadlcik', 'assets', 'fonts');
const PORT = Number(process.env.PORT || 8765);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript',
  '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

/** Path under `root` for a request path; throws on traversal outside it. */
function resolve(root, path) {
  const file = join(root, normalize(path));
  if (file !== root && !file.startsWith(root + sep)) throw new Error('outside root');
  return file;
}

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const font = /^\/tk-fonts\/(.+)$/.exec(path);
    const file = font ? resolve(FONT_ROOT, font[1]) : resolve(ROOT, path === '/' ? '/Main.dc.html' : path);
    let body = await readFile(file);
    if (!font && patchesFor(file).length) {
      try { body = Buffer.from(applyPatches(file, body.toString('utf8')), 'utf8'); }
      catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(`500 reference patch failed: ${e.message}`); return; }
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('404');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`prototype: http://127.0.0.1:${PORT}/Main.dc.html`));
