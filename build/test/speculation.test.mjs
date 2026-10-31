// Speculative loading (theme inc/speculation.php): the static rules JSON and the tiny inline script that
// gates it in the browser. Pure: reads the PHP source, rebuilds the printed script, runs it in a vm with a
// mocked browser, and evaluates the rules with URLPattern (Node >= 24) against the site's own links.
// The live page carries the same script (build/test/inline-assets-test.php checks it is printed untouched).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../../', import.meta.url);
const SPEC = readFileSync(new URL('wp-content/themes/tkadlcik/inc/speculation.php', ROOT), 'utf8');
const BASE = 'https://radostvpohybu.cz/';

/** The exclude list as written in tk_speculation_exclude_paths() (site at the root: no prefixing). */
function excludePaths() {
  const m = /function tk_speculation_exclude_paths\(\)[\s\S]*?\$paths\s*=\s*array\(([^;]*?)\);/.exec(SPEC);
  assert.ok(m, 'exclude list found');
  return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
}

/** Mirror of tk_speculation_rules() (the PHP array, as wp_json_encode prints it). */
function rules() {
  return {
    prefetch: [{
      source: 'document',
      where: {
        and: [
          { href_matches: '/*' },
          { not: { href_matches: '/*\\?(.+)' } },
          { not: { href_matches: excludePaths() } },
          { not: { selector_matches: 'a[rel~="nofollow"]' } },
          { not: { selector_matches: '[data-no-prefetch], [data-no-prefetch] a, .no-prefetch, .no-prefetch a' } },
        ],
      },
      eagerness: 'conservative',
    }],
  };
}

/** The printed inline script: the PHP string concatenation, with $json substituted. */
function inlineScript(json = JSON.stringify(rules())) {
  const m = /\$js\s*=\s*([\s\S]*?);\s*\n\s*wp_print_inline_script_tag/.exec(SPEC);
  assert.ok(m, '$js assignment found');
  return m[1].split(/\s*\.\s*(?=['$])/).map((part) => {
    part = part.trim();
    if (part === '$json') return json;
    assert.match(part, /^'[^']*'$/, `unexpected piece in $js: ${part}`);
    return part.slice(1, -1);
  }).join('');
}

function run({ supports = true, saveData = false, reducedData = false, finePointer = true } = {}) {
  const appended = [];
  const media = { '(prefers-reduced-data: reduce)': reducedData, '(hover: hover) and (pointer: fine)': finePointer };
  const ctx = {
    HTMLScriptElement: supports === null ? {} : { supports: (t) => supports && t === 'speculationrules' },
    navigator: saveData === null ? {} : { connection: { saveData } },
    matchMedia: (q) => { assert.ok(q in media, `unexpected media query ${q}`); return { matches: media[q] }; },
    document: { createElement: (tag) => ({ tag }), head: { appendChild: (el) => appended.push(el) } },
    JSON,
  };
  vm.runInNewContext(inlineScript(), ctx);
  return appended;
}

test('the rules: prefetch only, document source, no prerender', () => {
  assert.doesNotMatch(SPEC, /'prerender'/, 'never prerender');
  assert.match(SPEC, /'prefetch'\s*=>\s*array\(/);
  assert.match(SPEC, /'eagerness'\s*=>\s*'conservative'/, 'conservative unless the browser script upgrades it');
  assert.match(SPEC, /remove_action\(\s*'wp_footer',\s*'wp_print_speculation_rules'\s*\)/, "core's own rules are removed");
  assert.match(SPEC, /add_action\(\s*'wp_head',\s*'tk_print_speculation_rules',\s*2\s*\)/, 'printed early in <head>');
  assert.match(SPEC, /JSON_HEX_TAG/, 'JSON cannot close the script tag');
  for (const p of ['/wp-*.php', '/wp-admin/*', '/wp-content/*', '/wp-includes/*', '/wp-json/*', '/xmlrpc.php', '/feed/*', '/*/feed/*', '/*.xml', '/*.txt']) {
    assert.ok(excludePaths().includes(p), `${p} excluded`);
  }
});

test('gating on the server: same as core plus admin/feed/embed/Customizer/Elementor editor', () => {
  const fn = /function tk_speculation_enabled\(\)\s*\{([\s\S]*?)\n\}/.exec(SPEC)[1];
  for (const c of ['is_admin()', 'is_feed()', 'is_embed()', 'is_customize_preview()', 'tk_is_elementor_editing()']) assert.ok(fn.includes(c), `off when ${c}`);
  assert.match(fn, /wp_get_speculation_rules_configuration\(\)/, "core's gate (logged-out, pretty permalinks, filter)");
  assert.match(fn, /! is_user_logged_in\(\) && \(bool\) get_option\( 'permalink_structure' \)/, 'fallback gate for older WordPress');
  assert.match(SPEC, /function tk_print_speculation_rules\(\)\s*\{\s*if \( ! tk_speculation_enabled\(\) \)\s*\{\s*return;/, 'printing is gated');
});

test('gating in the browser: support, Save-Data, prefers-reduced-data; eagerness by pointer', () => {
  assert.equal(run({ supports: false }).length, 0, 'no speculationrules support: nothing');
  assert.equal(run({ supports: null }).length, 0, 'no HTMLScriptElement.supports: nothing');
  assert.equal(run({ saveData: true }).length, 0, 'Save-Data: nothing');
  assert.equal(run({ reducedData: true }).length, 0, 'prefers-reduced-data: nothing');
  for (const [finePointer, eagerness] of [[true, 'moderate'], [false, 'conservative']]) {
    const out = run({ finePointer });
    assert.equal(out.length, 1);
    assert.equal(out[0].type, 'speculationrules');
    assert.equal(out[0].id, 'tk-speculation-rules');
    const r = JSON.parse(out[0].textContent);
    assert.deepEqual(Object.keys(r), ['prefetch']);
    assert.ok(r.prefetch.every((x) => x.eagerness === eagerness), `fine pointer ${finePointer} -> ${eagerness}`);
  }
  assert.equal(run({ saveData: null }).length, 1, 'no navigator.connection: rules still added');
});

test('which links may be prefetched (URLPattern, as the browser evaluates href_matches)', () => {
  const where = rules().prefetch[0].where.and;
  const pats = (v) => [].concat(v).map((p) => new URLPattern(p, BASE));
  const prefetchable = (href) => {
    const url = new URL(href, BASE).href;
    return pats(where[0].href_matches).some((p) => p.test(url))
      && !pats(where[1].not.href_matches).some((p) => p.test(url))
      && !pats(where[2].not.href_matches).some((p) => p.test(url));
  };
  const pages = readdirSync(new URL('build/pages/', ROOT)).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(`build/pages/${f}`, ROOT), 'utf8')))
    .map((d) => (d.front_page || d.slug === 'domu' ? '/' : `/${d.slug}/`));
  assert.ok(pages.length >= 7);
  for (const p of [...pages, '/kontakt/#mapa']) assert.ok(prefetchable(p), `${p} is prefetched`);
  for (const p of ['/kontakt/?x=1', '/?s=taichi', '/wp-admin/', '/wp-login.php', '/wp-content/uploads/a.webp', '/wp-includes/js/x.js', '/wp-json/wp/v2/pages',
    '/xmlrpc.php', '/feed/', '/kontakt/feed/', '/sitemap.xml', '/robots.txt', 'https://example.com/']) {
    assert.ok(!prefetchable(p), `${p} is never prefetched`);
  }
});

test('the script stays one variant for everyone (no per-request data in it)', () => {
  const js = inlineScript();
  assert.doesNotMatch(js, /nonce|user|\$_/i);
  assert.ok(!js.includes('</script'), 'cannot break out of its tag');
  assert.doesNotThrow(() => new vm.Script(js), 'parses');
});

// With TK_BASE set (e.g. TK_BASE=http://localhost:8020 npm test), also compare with what the live page prints.
test('the live page prints exactly this script', { skip: !process.env.TK_BASE && 'set TK_BASE to compare with a running site' }, async () => {
  const html = await (await fetch(new URL('/', process.env.TK_BASE), { headers: { 'accept-encoding': 'identity' } })).text();
  const live = /<script id="tk-speculation">\s*([\s\S]*?)\s*<\/script>/.exec(html);
  assert.ok(live, 'tk-speculation script on the front page');
  const home = new URL(process.env.TK_BASE).pathname.replace(/\/$/, '');
  assert.equal(live[1], inlineScript(JSON.stringify(rules()).replaceAll('"/', `"${home}/`)));
});
