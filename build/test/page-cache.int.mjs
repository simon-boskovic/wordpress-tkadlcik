// Page cache integration cases that change the cache (purge, store, file-only deploy). Not part of
// `npm test` (the glob only picks *.test.mjs). Runs against the local stack:
//   TK_BASE=http://localhost:8020 node --test build/test/page-cache.int.mjs
// Uses GET to store (HEAD never stores). Ends with a full warm, so the cache is complete again afterwards.
// Another process editing theme/mu-plugin files meanwhile changes the build fingerprint and purges the
// cache mid-run (STORED where HIT is expected): re-run then.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { statSync, utimesSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decode, request } from '../lib/cache-check.mjs';

const BASE = process.env.TK_BASE || 'http://localhost:8020';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
// Like ./wp.sh: PHP notice dumps (Elementor deprecations, "PHP: …" up to ")]") are dropped from stdout.
const wp = (...args) => execFileSync('docker', ['compose', 'run', '--rm', '-T', 'wpcli', ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  .replace(/^PHP: [\s\S]*?^\)\]$\n?/gm, '');
const get = (path, headers = {}, method = 'GET') => request(BASE, path, { method, headers });
const state = async (path, headers = {}, method = 'GET') => (await get(path, headers, method)).headers['x-tk-cache'] || '-';
const stored = () => wp('tk', 'cache-purge', '--dry-run');
const OTHER = BASE.startsWith('https:') ? 'http' : 'https';
const PAGE = '/kontakt/';

before(() => { wp('tk', 'cache-purge'); });
after(() => { wp('tk', 'cache-warm'); });

test('first GET stores, then the rules serve HIT and the drop-in HIT-PHP (tracking query)', async () => {
  assert.doesNotMatch(stored(), /kontakt\//, 'purged');
  assert.equal(await state(PAGE, {}, 'HEAD'), 'MISS', 'HEAD renders but never stores');
  assert.doesNotMatch(stored(), /kontakt\//, 'HEAD left no file');
  const first = await get(PAGE);
  assert.equal(first.headers['x-tk-cache'], 'STORED');
  assert.match(first.headers['cache-control'], /^private/, 'the rendered (storing) response itself is private');
  assert.match(stored(), /kontakt\/index\.html\n.*kontakt\/index\.html\.gz/, 'plain + gzip on disk');
  const hit = await get(PAGE, { 'accept-encoding': 'gzip' });
  assert.equal(hit.headers['x-tk-cache'], 'HIT');
  assert.equal(hit.headers['cache-control'], 'public, max-age=0, must-revalidate');
  assert.equal(decode(hit), first.body.toString('utf8'), 'the cached copy is byte-identical to the stored render');
  assert.equal(await state(`${PAGE}?utm_source=x&fbclid=y`), 'HIT-PHP');
  assert.equal(await state(PAGE, { cookie: 'tk_nocache=1' }), 'BYPASS (cookie)', 'forced WordPress render (debug switch)');
  assert.equal(await state(PAGE), 'HIT', 'the file is still there');
});

// A request target sent verbatim (request() resolves "//kontakt/" as a protocol-relative URL).
const rawGet = (target) => new Promise((resolve, reject) => {
  const u = new URL(BASE);
  const req = (u.protocol === 'https:' ? https : http).request({ host: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), method: 'GET', path: target, headers: { host: u.host, 'accept-encoding': 'gzip' } }, (res) => {
    res.resume();
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
  });
  req.on('error', reject);
  req.end();
});

test('an empty path segment is never served from the cache: one 301 to the clean URL, query kept', async () => {
  assert.equal(await state(PAGE), 'HIT', 'the clean URL is cached');
  for (const [path, want] of [
    [`/${PAGE}`, PAGE], [`${PAGE}/`, PAGE], [`//${PAGE.slice(1)}?utm_source=x`, `${PAGE}?utm_source=x`], ['//', '/'],
  ]) {
    const r = await rawGet(path);
    assert.equal(r.status, 301, `${path}: HTTP ${r.status} (${r.headers['x-tk-cache'] || '-'})`);
    assert.equal(new URL(r.headers.location).pathname + new URL(r.headers.location).search, want, `${path} -> ${r.headers.location}`);
    assert.ok(!(r.headers['x-tk-cache'] || '').startsWith('HIT'), `${path} not from the cache`);
  }
  assert.doesNotMatch(stored(), /\/\/index/, 'no file stored for a double-slash path');
});

test('bypass reasons are named', async () => {
  const cases = [
    [PAGE, { cookie: 'wordpress_logged_in_0=x' }, 'GET', 'BYPASS (cookie)'],
    [`${PAGE}?foo=1`, {}, 'GET', 'BYPASS (query)'],
    ['/?s=taichi', {}, 'GET', 'BYPASS (query)'],
    ['/feed/', {}, 'GET', 'BYPASS (path)'],
    [PAGE, { 'content-type': 'application/x-www-form-urlencoded' }, 'POST', 'BYPASS (method)'],
    ['/page/2/', {}, 'GET', 'BYPASS (paged)'],
    [`${PAGE}page/2/`, {}, 'GET', 'BYPASS (paged)'],
    [`${PAGE}comment-page-3/`, {}, 'GET', 'BYPASS (paged)'],
  ];
  for (const [path, headers, method, want] of cases) assert.equal(await state(path, headers, method), want, `${method} ${path}`);
  assert.doesNotMatch(stored(), /page\/|comment-page/, 'no alias file on disk');
});

// Cookie consent (Complianz, port of martinadamus R45): its blocker runs inside the capture buffer
// (tk_pc_nest_complianz_buffer), so the stored copy holds Site Kit's tag blocked; no page response sets a cookie;
// the consent cookies cmplz_* are no bypass cookies (the banner logic is client-side: one page for every state).
test('consent: the stored page holds the Google tag blocked, no Set-Cookie, cmplz_* cookies still HIT', async () => {
  const BLOCKED = /<script type="text\/plain" data-service="google-analytics" data-category="statistics" id="google_gtagjs-js" data-cmplz-src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"/;
  const LIVE = /<script[^>]+\ssrc="https:\/\/www\.googletagmanager\.com/;
  wp('tk', 'cache-purge');
  const first = await get(PAGE);
  assert.equal(first.headers['x-tk-cache'], 'STORED');
  assert.equal(first.headers['set-cookie'], undefined, 'the storing render sets no cookie');
  for (const cookie of ['', 'cmplz_functional=allow; cmplz_statistics=deny; cmplz_banner-status=dismissed', 'cmplz_functional=allow; cmplz_statistics=allow; cmplz_banner-status=dismissed; _ga=GA1.1.1']) {
    const r = await get(PAGE, cookie ? { cookie, 'accept-encoding': 'gzip' } : { 'accept-encoding': 'gzip' });
    const body = decode(r);
    assert.equal(r.headers['x-tk-cache'], 'HIT', `cookie "${cookie}"`);
    assert.equal(r.headers['set-cookie'], undefined);
    assert.match(body, BLOCKED, 'cached HTML holds the tag blocked');
    assert.doesNotMatch(body, LIVE, 'cached HTML loads googletagmanager directly');
  }
});

test('404 is never stored', async () => {
  const path = `/tk-cache-int-${Date.now().toString(36)}/`;
  for (let i = 0; i < 2; i++) {
    const r = await get(path);
    assert.equal(r.status, 404);
    assert.equal(r.headers['x-tk-cache'], 'BYPASS (404)');
    assert.match(r.headers['cache-control'], /no-store/);
  }
  assert.doesNotMatch(stored(), /tk-cache-int-/);
});

test('304 revalidation on both serving paths', async () => {
  for (const uri of [PAGE, `${PAGE}?utm_medium=x`]) {
    const r = await get(uri, { 'accept-encoding': 'gzip' });
    assert.match(r.headers['x-tk-cache'], /^HIT/);
    for (const h of [{ 'if-none-match': r.headers.etag }, { 'if-modified-since': r.headers['last-modified'] }]) {
      const c = await get(uri, { 'accept-encoding': 'gzip', ...h });
      assert.equal(c.status, 304, `${uri} ${JSON.stringify(h)}`);
      assert.equal(c.body.length, 0);
    }
    const stale = await get(uri, { 'accept-encoding': 'gzip', 'if-none-match': '"0-0"' });
    assert.equal(stale.status, 200, 'a foreign ETag gets the page');
  }
});

// Lowercase "q" only here: Apache's mod_deflate (on-the-fly compression of the plain file) ignores an
// uppercase "Q=0" and gzips anyway; our own rules/drop-in refuse it (shared case "GZIP;Q=0 is refused").
test('gzip/br negotiation incl. q=0, on the rules and the drop-in', async () => {
  const want = { 'gzip, deflate, br': 'gzip', gzip: 'gzip', br: 'br', identity: '', 'gzip;q=0': '', 'GZIP; q=0.0, identity': '', 'br;q=0, gzip': 'gzip', 'gzip;q=0, br': 'br', 'gzip;q=0.001': 'gzip', '': '' };
  const html = decode(await get(PAGE, { 'accept-encoding': 'identity' }));
  for (const uri of [PAGE, `${PAGE}?gclid=1`]) {
    for (const [ae, enc] of Object.entries(want)) {
      const r = await get(uri, ae ? { 'accept-encoding': ae } : {});
      assert.equal(r.headers['content-encoding'] || '', enc, `${uri} Accept-Encoding "${ae}"`);
      assert.match(r.headers.vary || '', /accept-encoding/i);
      assert.equal(decode(r), html, `${uri} "${ae}" decodes to the same page`);
    }
  }
});

test('the cache directory is not reachable directly', async () => {
  for (const p of ['/wp-content/cache/tk-page/', '/wp-content/cache/tk-page/index.html', `/wp-content/cache/tk-page${PAGE}index.html`, `/wp-content/cache/tk-page${PAGE}index.html.gz`, '/wp-content/cache/tk-page/.ht-stamp', '/wp-content/cache/tk-page/.htaccess']) {
    const r = await get(p);
    assert.ok([403, 404].includes(r.status), `${p} -> ${r.status}`);
  }
});

test('saving a page purges the cache', async () => {
  await state('/');
  assert.equal(await state('/'), 'HIT');
  assert.equal(await state(PAGE), 'HIT');
  const id = wp('post', 'list', '--post_type=page', '--name=kontakt', '--field=ID').trim();
  assert.match(id, /^\d+$/);
  wp('eval', `wp_update_post( array( 'ID' => ${id} ) );`); // save_post, content unchanged
  assert.match(stored(), /Dry run: 0 cached pages \(0 files\)/, 'every page file is gone');
  assert.equal(await state(PAGE), 'STORED');
  assert.equal(await state('/'), 'STORED', 'the other pages too (one purge for all)');
});

test('a request whose scheme differs from the home option is rendered but never stored', async () => {
  wp('tk', 'cache-purge');
  assert.equal(await state(PAGE, { 'x-forwarded-proto': OTHER }), 'BYPASS (scheme)');
  assert.equal(await state(PAGE, { 'x-forwarded-proto': OTHER }), 'BYPASS (scheme)', 'still nothing stored');
  assert.equal(await state(PAGE), 'STORED', 'the matching scheme stores');
  assert.equal(await state(PAGE), 'HIT');
});

test('X-Forwarded-Proto flips do not purge the cache (stamp from the home option)', async () => {
  for (let i = 0; i < 3; i++) {
    await state('/tk-cache-int-404/', { 'x-forwarded-proto': OTHER });
    await state('/tk-cache-int-404/');
  }
  assert.equal(await state(PAGE), 'HIT');
});

test('a file-only deploy (newer mu-plugin file) purges the cache on the next WordPress request', async () => {
  assert.equal(await state(PAGE), 'HIT');
  const file = fileURLToPath(new URL('../../wp-content/mu-plugins/tk-hardening.php', import.meta.url));
  const { atime } = statSync(file);
  utimesSync(file, atime, new Date()); // mtime only
  await state('/tk-cache-int-404/'); // any request WordPress handles runs the stamp check
  assert.equal(await state(PAGE), 'STORED', 'the old copy was purged, WordPress rendered and stored a new one');
  assert.match(wp('tk', 'cache-status'), /Stamp\s+matches this site and build/);
});
