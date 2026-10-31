import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  cacheControl, decide, hasBypassCookie, NOCACHE_PATHS, nocacheReason, pathOk, pickEncoding, queryOk, RAW_DOUBLE_SLASH_RE, WARM_HEADER,
} from '../lib/cache-rules.mjs';

const cases = JSON.parse(readFileSync(new URL('./cache-cases.json', import.meta.url), 'utf8'));
const LIB_PHP = readFileSync(new URL('../../wp-content/mu-plugins/tk-page-cache/lib.php', import.meta.url), 'utf8');

test('cache decisions (shared with build/test/page-cache-test.php)', () => {
  for (const c of cases.decide) {
    const got = decide(c.req, c.cfg);
    for (const [k, v] of Object.entries(c.expect)) assert.equal(got[k], v, `${c.name}: ${k} (${JSON.stringify(got)})`);
    assert.deepEqual(Object.keys(got).sort(), ['cache', 'file', 'reason', 'rewrite'], 'same keys as tk_pc_decide()');
  }
});

test('encoding choice (shared with the PHP drop-in)', () => {
  for (const c of cases.pick) assert.equal(pickEncoding(c.pick.accept, c.pick.br, c.pick.gz), c.expect, c.name);
});

test('raw request line with a double slash (the .htaccess THE_REQUEST condition, shared with page-cache-test.php)', () => {
  for (const c of cases.request_line) assert.equal(RAW_DOUBLE_SLASH_RE.test(c.line), c.double, c.name);
  const php = RAW_DOUBLE_SLASH_RE.source.replaceAll('\\/', '/');
  assert.ok(LIB_PHP.includes(`const TK_PC_RAW_DOUBLE_SLASH_RE = '${php}';`), `PHP twin TK_PC_RAW_DOUBLE_SLASH_RE = '${php}'`);
  assert.equal(RAW_DOUBLE_SLASH_RE.flags, 'i', 'case-insensitive like the [NC] condition');
});

test('every bypass reason and both serving paths are covered by the shared cases', () => {
  const reasons = new Set(cases.decide.filter((c) => !c.expect.cache).map((c) => c.expect.reason));
  for (const r of ['method', 'host', 'warm', 'cookie', 'path', 'query', ...Object.values(NOCACHE_PATHS)]) assert.ok(reasons.has(r), `no case for bypass reason ${r}`);
  assert.ok(cases.decide.some((c) => c.expect.cache && c.expect.rewrite === false), 'a drop-in-only case');
  assert.ok(cases.decide.some((c) => c.expect.cache && c.expect.rewrite === true), 'a rewrite case');
  const names = cases.decide.map((c) => c.name).concat(cases.pick.map((c) => c.name));
  assert.equal(new Set(names).size, names.length, 'case names are unique');
});

test('every built page is cacheable and served by the rewrite rules', () => {
  const pages = readdirSync(new URL('../pages/', import.meta.url)).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(`../pages/${f}`, import.meta.url), 'utf8')));
  assert.ok(pages.length >= 7);
  for (const p of pages) {
    const path = p.front_page || p.slug === 'domu' ? '/' : `/${p.slug}/`;
    const d = decide({ method: 'GET', uri: path }, {});
    assert.equal(d.cache, true, `${path} ${JSON.stringify(d)}`);
    assert.equal(d.rewrite, true, path);
  }
});

test('never-cached list: empty in both twins, no prototype lookups', () => {
  assert.deepEqual(NOCACHE_PATHS, {});
  assert.ok(Object.isFrozen(NOCACHE_PATHS));
  assert.match(LIB_PHP, /const TK_PC_NOCACHE_PATHS = array\(\);/, 'PHP twin is empty too');
  assert.equal(nocacheReason('/kontakt/'), '');
  assert.equal(nocacheReason('/constructor/'), '', 'no prototype lookup');
  assert.equal(nocacheReason('/__proto__/'), '', 'no prototype lookup');
  assert.equal(nocacheReason('/toString/'), '');
});

test('constants match lib.php byte for byte', () => {
  const php = (name) => {
    const m = new RegExp(`const ${name}\\s*=\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(LIB_PHP);
    assert.ok(m, `${name} in lib.php`);
    return m[1].replace(/\\'/g, "'");
  };
  const body = (re) => re.source;
  assert.equal(body(/(?:^|;)\s*(?:wordpress_logged_in_|wordpress_sec_|wp-postpass_|comment_author_|wordpress_no_cache=|tk_nocache=)/), php('TK_PC_BYPASS_COOKIE_RE'));
  const pathPhp = php('TK_PC_PATH_RE');
  assert.equal(String.raw`^\/` + pathPhp.replace(/\//g, '\\/') + '$', (/^\/(?:(?!wp-|feed\/|embed\/|trackback\/|search\/)[a-z0-9-]+\/)*$/).source);
  const trackingPhp = php('TK_PC_TRACKING_RE');
  assert.match(trackingPhp, /^\/\^\(\?:.*\)\$\/D$/, 'PHP tracking pattern is anchored with the D modifier');
  assert.equal(trackingPhp.slice(1, -2), (/^(?:utm_[a-z0-9_]+|fbclid|gclid|gclsrc|gbraid|wbraid|dclid|msclkid|yclid|twclid|ttclid|igshid|li_fat_id|mc_cid|mc_eid|_ga|_gl|_hsenc|_hsmi|srsltid)$/).source);
  assert.equal(php('TK_PC_WARM_HEADER'), WARM_HEADER);
  const ae = String.raw`(?!\s*;\s*q\s*=\s*0(?:\.0{0,3})?(?![.\d]))`;
  assert.equal(php('TK_PC_AE_BR_RE'), String.raw`\bbr\b` + ae);
  assert.equal(php('TK_PC_AE_GZIP_RE'), String.raw`\bgzip\b` + ae);
});

test('helpers', () => {
  assert.equal(hasBypassCookie(''), false);
  assert.equal(hasBypassCookie(undefined), false);
  assert.equal(hasBypassCookie('tk_nocache=1'), true);
  assert.equal(pathOk('/'), true);
  assert.equal(pathOk(''), false);
  assert.equal(queryOk(''), true);
  assert.equal(queryOk('utm_source=x&fbclid=y'), true);
  assert.equal(queryOk('utm_source=x&p=1'), false);
  assert.equal(cacheControl(), 'public, max-age=0, must-revalidate');
  assert.equal(cacheControl(600), 'public, max-age=0, s-maxage=600, must-revalidate');
  assert.equal(cacheControl(-5), 'public, max-age=0, must-revalidate');
});
