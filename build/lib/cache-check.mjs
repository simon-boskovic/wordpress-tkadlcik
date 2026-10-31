/**
 * Live checks of the static page cache (mu-plugins/tk-page-cache) against a running site.
 *   node build/cache-check.mjs [--base=http://localhost:8020] [--mode=rewrite|php]
 *
 * Read-only for the site (GET/HEAD/one POST that WordPress rejects; no purge, no warm): every built page
 * must come from the cache with the right type, encoding and validators; every bypass case must not;
 * aliases and 404s must never be stored; the cache directory is unreachable directly; crawler files and
 * REST carry explicit Cache-Control. Expectations for the request matrix come from build/lib/cache-rules.mjs
 * (the JS twin of the PHP/.htaccess rules), so the check and the rules cannot drift apart silently.
 * Run `./wp.sh tk cache-warm` first: an unwarmed page is reported as a failure.
 */
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheControl, decide, nocacheReason, NOCACHE_PATHS, WARM_HEADER } from './cache-rules.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, '..');
const XH = 'x-tk-cache';

/** Raw HTTP (no automatic decompression, any Host header, any method). */
export function request(base, path, { method = 'GET', headers = {}, body } = {}) {
  const url = new URL(path, base);
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    // agent:false: a fresh connection per request, so a keep-alive socket the server closed while a test
    // ran a slow WP-CLI step is never reused (ECONNRESET).
    const req = lib.request(url, { method, agent: false, headers: { 'user-agent': 'tk-cache-check', ...headers } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error(`timeout ${path}`)));
    if (body) req.write(body);
    req.end();
  });
}

/** The response body as text, decoded per Content-Encoding. */
export function decode(r) {
  const enc = r.headers['content-encoding'] || '';
  if (enc === 'gzip') return zlib.gunzipSync(r.body).toString('utf8');
  if (enc === 'br') return zlib.brotliDecompressSync(r.body).toString('utf8');
  return r.body.toString('utf8');
}

const pageDefs = () => readdirSync(join(BUILD, 'pages')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(BUILD, 'pages', f), 'utf8')))
  .filter((d) => (d.status || 'publish') === 'publish');
const pathOf = (d) => (d.front_page || d.slug === 'domu' ? '/' : `/${d.slug}/`);

/** Every URL that must be cached: build/pages/*.json, minus the never-cached pages. */
export function cachedPaths() {
  return pageDefs().map(pathOf).filter((p) => !nocacheReason(p)).sort();
}

/** Built pages that must never be cached: { path, reason } (none while NOCACHE_PATHS is empty). */
export function nocachePaths() {
  return pageDefs().map(pathOf).filter((p) => nocacheReason(p)).map((path) => ({ path, reason: nocacheReason(path) }));
}

/**
 * Run all checks. fail(label, message) is called per failure; log(line) per result line.
 * @returns {Promise<{hits:number, pages:number, cases:number}>}
 */
export async function runCacheChecks({ base, mode = 'rewrite', fail, log = () => {} }) {
  const host = new URL(base).host;
  const hitFor = (rewrite) => (mode === 'php' || !rewrite ? 'HIT-PHP' : 'HIT');
  let cases = 0;
  const check = (label, cond, msg) => { cases++; if (!cond) fail(label, msg); return cond; };

  // 1. Every page comes from the cache (as a browser asks), right type/encoding/headers.
  const pages = cachedPaths();
  let hits = 0;
  for (const path of pages) {
    const r = await request(base, path, { headers: { 'accept-encoding': 'gzip, deflate, br' } });
    const x = r.headers[XH] || '';
    const want = hitFor(decide({ uri: path }, {}).rewrite);
    let ok = check(path, r.status === 200, `HTTP ${r.status}`);
    ok = check(path, x === want, `X-TK-Cache "${x}", expected "${want}"`) && ok;
    ok = check(path, /^text\/html;\s*charset=utf-8$/i.test(r.headers['content-type'] || ''), `Content-Type "${r.headers['content-type']}"`) && ok;
    ok = check(path, ['gzip', 'br'].includes(r.headers['content-encoding']), `Content-Encoding "${r.headers['content-encoding'] || ''}" for a gzip/br request`) && ok;
    ok = check(path, /accept-encoding/i.test(r.headers.vary || ''), `Vary "${r.headers.vary || ''}" lacks Accept-Encoding`) && ok;
    ok = check(path, /^public, max-age=0(?:, s-maxage=\d+)?, must-revalidate$/.test(r.headers['cache-control'] || ''), `Cache-Control "${r.headers['cache-control']}"`) && ok;
    ok = check(path, !!r.headers.etag && !!r.headers['last-modified'], 'no ETag/Last-Modified') && ok;
    ok = check(path, r.headers['x-content-type-options'] === 'nosniff', 'security headers missing on a cached page') && ok;
    let html = '';
    try { html = decode(r); } catch (e) { ok = check(path, false, `body does not decode: ${e.message}`) && ok; }
    ok = check(path, html.includes('</html>') && !html.includes('id="wpadminbar"'), 'body incomplete or with the admin bar') && ok;
    if (ok) hits++;
    log(`${ok ? 'ok  ' : 'FAIL'} ${x.padEnd(8)} ${(r.headers['content-encoding'] || 'identity').padEnd(8)} ${path}`);
  }

  // 2. Encodings (incl. q=0 refusals), validators and HEAD on one page, through both serving paths.
  const sample = pages.includes('/kontakt/') ? '/kontakt/' : pages[0];
  for (const uri of [sample, `${sample}?utm_source=cache-check`]) {
    const viaPhp = uri.includes('?');
    const label = viaPhp ? 'drop-in' : 'rules';
    for (const [ae, want] of [['br', 'br'], ['gzip', 'gzip'], ['identity', ''], ['gzip;q=0', ''], ['gzip;q=0, br', 'br'], ['br;q=0, gzip', 'gzip'], ['', '']]) {
      const r = await request(base, uri, { headers: ae ? { 'accept-encoding': ae } : {} });
      const enc = r.headers['content-encoding'] || '';
      let html = '';
      try { html = decode(r); } catch { /* reported below */ }
      const x = r.headers[XH] || '';
      const ok = check(`${uri} [${ae || 'no Accept-Encoding'}]`, enc === want && html.includes('</html>') && x === hitFor(!viaPhp), `Content-Encoding "${enc}" (want "${want}"), X-TK-Cache "${x}", decodes: ${html.includes('</html>')}`);
      log(`${ok ? 'ok  ' : 'FAIL'} ${label} encoding "${ae}" -> ${enc || 'identity'}`);
    }
    const g = await request(base, uri, { headers: { 'accept-encoding': 'gzip' } });
    if (check(`${uri} validators`, !!g.headers.etag && !!g.headers['last-modified'], 'no ETag/Last-Modified')) {
      const a = await request(base, uri, { headers: { 'accept-encoding': 'gzip', 'if-none-match': g.headers.etag } });
      const b = await request(base, uri, { headers: { 'accept-encoding': 'gzip', 'if-modified-since': g.headers['last-modified'] } });
      const ok = check(`${uri} revalidation`, a.status === 304 && b.status === 304 && a.body.length === 0, `If-None-Match -> ${a.status}, If-Modified-Since -> ${b.status}`);
      log(`${ok ? 'ok  ' : 'FAIL'} ${label} revalidation (If-None-Match ${a.status}, If-Modified-Since ${b.status})`);
    }
    const h = await request(base, uri, { method: 'HEAD', headers: { 'accept-encoding': 'gzip' } });
    const hOk = check(`${uri} HEAD`, h.status === 200 && (h.headers[XH] || '') === hitFor(!viaPhp) && h.body.length === 0, `HEAD -> ${h.status} ${h.headers[XH]}, ${h.body.length} B body`);
    log(`${hOk ? 'ok  ' : 'FAIL'} ${label} HEAD -> ${h.status} ${h.headers[XH] || '-'}`);
  }

  // 3. Request matrix: expectations from the JS twin of the rules.
  const matrix = [
    { label: 'logged-in cookie', path: sample, headers: { cookie: 'wordpress_logged_in_0123=x' } },
    { label: 'tk_nocache cookie', path: sample, headers: { cookie: 'tk_nocache=1' } },
    { label: 'comment author cookie', path: sample, headers: { cookie: 'comment_author_0123=Jan' } },
    { label: 'analytics cookie', path: sample, headers: { cookie: '_ga=GA1.1.1' } },
    { label: 'POST to a page', path: sample, method: 'POST', body: 'a=1', headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    { label: 'wp-admin', path: '/wp-admin/' },
    { label: 'wp-login', path: '/wp-login.php' },
    { label: 'REST', path: '/wp-json/' },
    { label: 'admin-ajax', path: '/wp-admin/admin-ajax.php' },
    { label: 'search', path: '/?s=taichi' },
    { label: 'feed', path: '/feed/' },
    { label: 'sitemap', path: '/sitemap.xml' },
    { label: 'robots.txt', path: '/robots.txt' },
    { label: 'unknown query', path: `${sample}?foo=1` },
    { label: 'tracking parameters', path: `${sample}?utm_source=newsletter&utm_medium=email` },
    { label: 'fbclid on the front page', path: '/?fbclid=abc' },
    { label: 'encoded tracking name', path: '/?%75tm_source=x' },
    { label: 'warm header without a valid token', path: sample, headers: { [WARM_HEADER.toLowerCase()]: 'forged' } },
    { label: 'foreign Host', path: sample, headers: { host: 'www.example.invalid' } },
    { label: 'HEAD', path: sample, method: 'HEAD' },
  ];
  for (const m of matrix) {
    const headers = { 'accept-encoding': 'gzip', ...(m.headers || {}) };
    const r = await request(base, m.path, { method: m.method || 'GET', headers, body: m.body });
    const x = r.headers[XH] || '';
    const d = decide({ method: m.method || 'GET', host: headers.host || host, uri: m.path, cookie: headers.cookie || '', warm: !!headers[WARM_HEADER.toLowerCase()] }, { host });
    const ok = d.cache
      ? check(m.label, x === hitFor(d.rewrite) && r.status === 200, `expected ${hitFor(d.rewrite)}, got "${x}" (HTTP ${r.status})`)
      : check(m.label, !x.startsWith('HIT') && x !== 'STORED', `must bypass the cache, got "${x}"`);
    // A response WordPress rendered must never be shareable by a proxy (crawler files are public for an hour, 3e).
    const cc = r.headers['cache-control'] || '';
    const crawler = /^\/(?:robots\.txt|llms\.txt|sitemap[a-z0-9_-]*\.(?:xml|xsl))$/.test(m.path);
    const ccOk = d.cache || crawler || r.status >= 300 || !/public/.test(cc);
    check(`${m.label} (Cache-Control)`, ccOk, `bypass response is public: "${cc}"`);
    log(`${ok && ccOk ? 'ok  ' : 'FAIL'} ${(x || '-').padEnd(26)} ${String(r.status).padEnd(4)} ${m.label} ${m.method || 'GET'} ${m.path}`);
  }

  // 3b. Aliases WordPress answers with 200 (pagination, comment pages) must never be stored (disk fill).
  for (const path of ['/page/2/', `/page/${77000 + (Date.now() % 1000)}/`, `${sample}comment-page-2/`, `${sample}page/2/`]) {
    const states = [];
    for (let n = 0; n < 2; n++) states.push((await request(base, path)).headers[XH] || '-');
    const ok = check(`alias ${path}`, states.every((x) => !x.startsWith('HIT') && x !== 'STORED'), `stored or served from the cache: ${states.join(', ')}`);
    log(`${ok ? 'ok  ' : 'FAIL'} alias ${path} -> ${states.join(' / ')}`);
  }

  // 3c. The cache directory is reachable only through the rules (no second URL for a page, no stamp).
  for (const path of ['/wp-content/cache/tk-page/', '/wp-content/cache/tk-page/index.html', `/wp-content/cache/tk-page${sample}index.html.gz`, '/wp-content/cache/tk-page/.ht-stamp', '/wp-content/cache/tk-page/.ht-generation']) {
    const r = await request(base, path);
    const ok = check(`direct ${path}`, r.status === 404 || r.status === 403, `direct access answered ${r.status}`);
    log(`${ok ? 'ok  ' : 'FAIL'} direct ${path} -> ${r.status}`);
  }

  // 3d. A request claiming the other scheme (X-Forwarded-Proto) must not purge the cache (the stamp uses the
  //     home option, not home_url()): WordPress handles it, and the pages are still HITs afterwards.
  {
    const other = base.startsWith('https:') ? 'http' : 'https';
    await request(base, `${sample}?tk-cache-check=1`, { headers: { 'x-forwarded-proto': other } });
    await request(base, '/tk-cache-check-scheme/', { headers: { 'x-forwarded-proto': other } });
    const after = await Promise.all(['/', sample].map((p) => request(base, p)));
    const ok = check('scheme flip', after.every((r) => (r.headers[XH] || '').startsWith('HIT')), `after X-Forwarded-Proto: ${other}: ${after.map((r) => r.headers[XH]).join(', ')}`);
    log(`${ok ? 'ok  ' : 'FAIL'} X-Forwarded-Proto: ${other} requests leave the cache intact`);
  }

  // 3e. Explicit Cache-Control on crawler files (public, 1 h) and the REST API (private).
  for (const [path, re] of [['/robots.txt', /^public, max-age=3600$/], ['/sitemap.xml', /^public, max-age=3600$/], ['/wp-json/', /private/]]) {
    const r = await request(base, path);
    const ok = check(`Cache-Control ${path}`, r.status === 200 && re.test(r.headers['cache-control'] || ''), `HTTP ${r.status}, Cache-Control "${r.headers['cache-control'] || ''}"`);
    log(`${ok ? 'ok  ' : 'FAIL'} ${path} Cache-Control: ${r.headers['cache-control'] || '-'}`);
  }

  // 3f. Never-cached pages (TK_PC_NOCACHE_PATHS, empty for now): WordPress renders them every time, names
  //     the reason, and forbids every cache — also with a query and on HEAD.
  const never = nocachePaths();
  check('never-cached pages', never.length <= Object.keys(NOCACHE_PATHS).length, `built never-cached pages: ${never.map((p) => p.path).join(', ') || 'none'}`);
  for (const { path, reason } of never) {
    for (const [label, uri, method] of [['', path, 'GET'], [' #2', path, 'GET'], [' HEAD', path, 'HEAD'], [' ?q', `${path}?q=1`, 'GET'], [' ?utm', `${path}?utm_source=x`, 'GET']]) {
      const r = await request(base, uri, { method, headers: { 'accept-encoding': 'gzip' } });
      const x = r.headers[XH] || '';
      const cc = r.headers['cache-control'] || '';
      const ok = check(`never cached ${uri}${label}`, r.status === 200 && x === `BYPASS (${reason})` && /no-store/.test(cc) && !/public/.test(cc), `HTTP ${r.status}, X-TK-Cache "${x}", Cache-Control "${cc}"`);
      log(`${ok ? 'ok  ' : 'FAIL'} never cached ${method} ${uri} -> ${x || '-'}, ${cc}`);
    }
  }
  log(`ok   never-cached list: ${Object.keys(NOCACHE_PATHS).length ? Object.keys(NOCACHE_PATHS).join(', ') : 'empty'}`);

  // 4. 404 is never cached (twice: the first answer must not have created a file).
  const missing = `/tk-cache-check-${Date.now().toString(36)}/`;
  for (const n of [1, 2]) {
    const r = await request(base, missing);
    const x = r.headers[XH] || '';
    const ok = check(`404 #${n}`, r.status === 404 && x === 'BYPASS (404)' && /no-store/.test(r.headers['cache-control'] || ''), `HTTP ${r.status}, X-TK-Cache "${x}", Cache-Control "${r.headers['cache-control']}"`);
    log(`${ok ? 'ok  ' : 'FAIL'} 404 #${n} ${missing} -> ${r.status} ${x}`);
  }

  // 5. WordPress's trailing-slash 301 still runs in one hop to a cached page.
  {
    const path = sample.replace(/\/$/, '');
    const r = await request(base, path);
    const loc = r.headers.location ? new URL(r.headers.location, base) : null;
    let ok = check(`redirect ${path}`, r.status === 301 && !!loc, `HTTP ${r.status}`);
    if (ok) {
      const t = await request(base, loc.pathname + loc.search, { headers: { 'accept-encoding': 'gzip' } });
      ok = check(`redirect ${path}`, t.status === 200 && (t.headers[XH] || '').startsWith('HIT'), `target ${loc.pathname} answered ${t.status} ${t.headers[XH] || ''}`);
    }
    log(`${ok ? 'ok  ' : 'FAIL'} 301 ${path} -> ${loc ? loc.pathname + loc.search : '-'}`);
  }

  // 6. The cached pages' Cache-Control is exactly what lib.php builds (edge TTL aside).
  check('cache-control twin', cacheControl() === 'public, max-age=0, must-revalidate', cacheControl());

  return { hits, pages: pages.length, cases };
}
