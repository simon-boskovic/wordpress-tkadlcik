import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const HANDOFF = new URL('../../design_handoff_tkadlcik/', import.meta.url);

// Since the redesign of 2026-11-01 the prototype is the historical handoff, served unpatched.
test('prototype server serves the handoff byte for byte and the site fonts; never outside its roots', async (t) => {
  const port = 8798;
  const proc = spawn(process.execPath, ['build/serve-prototype.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
  t.after(() => proc.kill());
  await new Promise((resolve) => proc.stdout.once('data', resolve));
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal(await (await fetch(`${base}/Rozvrh.dc.html`)).text(), readFileSync(new URL('Rozvrh.dc.html', HANDOFF), 'utf8'));
  assert.match((await fetch(`${base}/support.js`)).headers.get('content-type'), /javascript/);
  const woff = await fetch(`${base}/tk-fonts/fira-sans-latin-500-normal.woff2`);
  assert.equal(woff.status, 200);
  assert.equal(woff.headers.get('content-type'), 'font/woff2');
  for (const bad of ['/nope.html', '/tk-fonts/..%2F..%2Fstyle.css', '/%2e%2e/package.json', '/tk-fonts/%2e%2e/%2e%2e/functions.php']) assert.equal((await fetch(base + bad)).status, 404, bad);
});
