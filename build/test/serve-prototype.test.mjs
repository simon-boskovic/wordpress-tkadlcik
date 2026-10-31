import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const HANDOFF = new URL('../../design_handoff_tkadlcik/', import.meta.url);

test('prototype server serves pages with the reference patches, the runtime and the site fonts; never outside its roots', async (t) => {
  const port = 8798;
  const proc = spawn(process.execPath, ['build/serve-prototype.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
  t.after(() => proc.kill());
  await new Promise((resolve) => proc.stdout.once('data', resolve));
  const base = `http://127.0.0.1:${port}`;
  const main = await fetch(`${base}/`);
  assert.equal(main.status, 200);
  const html = await main.text();
  // D0 viewport, D1 self-hosted Geist (no Google request), D2 no font picker.
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  assert.match(html, /<style id="tk-fonts">@font-face\{font-family:'Geist';[^<]*url\(\/tk-fonts\/geist-latin-400-normal\.woff2\)/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|font-picker/);
  // D3: the click-to-load map box in place of the [Mapa] placeholders, with its styles.
  const rozvrh = await (await fetch(`${base}/Rozvrh.dc.html`)).text();
  assert.equal(rozvrh.split('data-tk-map-box').length, 3);
  assert.doesNotMatch(rozvrh, /\[Mapa\]/);
  assert.match(rozvrh, /<style id="tk-map-css">\.tk-map\{/);
  const kontakt = await (await fetch(`${base}/Kontakt.dc.html`)).text();
  assert.equal(kontakt.split('data-tk-map-box').length, 3);
  // Unpatched files are served byte for byte; the files on disk stay untouched.
  assert.equal(await (await fetch(`${base}/support.js`)).text(), readFileSync(new URL('support.js', HANDOFF), 'utf8'));
  assert.equal(await (await fetch(`${base}/MainMobile.dc.html`)).text(), readFileSync(new URL('MainMobile.dc.html', HANDOFF), 'utf8'));
  assert.match(readFileSync(new URL('Rozvrh.dc.html', HANDOFF), 'utf8'), /\[Mapa\]/);
  assert.match((await fetch(`${base}/support.js`)).headers.get('content-type'), /javascript/);
  const woff = await fetch(`${base}/tk-fonts/geist-latin-500-normal.woff2`);
  assert.equal(woff.status, 200);
  assert.equal(woff.headers.get('content-type'), 'font/woff2');
  for (const bad of ['/nope.html', '/tk-fonts/..%2F..%2Fstyle.css', '/%2e%2e/package.json', '/tk-fonts/%2e%2e/%2e%2e/functions.php']) assert.equal((await fetch(base + bad)).status, 404, bad);
});
