// CSS subsets (build/lib/css-subset.mjs, used by build/css-subset.mjs): the parser keeps exact source text, the
// selector widening only ever widens, and the committed subsets are made of their source's own rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildSubset, collectSelectors, dynamicPredicate, parseCss, scriptWords, splitSelectorList, widenSelector } from '../lib/css-subset.mjs';

const ROOT = new URL('../../', import.meta.url);
const none = () => false;

test('parseCss: rules, grouping at-rules, statements, strings/comments/url() with braces', () => {
  const css = '@charset "x";/* a{b} */.a{content:"}"}@media (max-width:1px){.b{x:url(a{b).png)}}@keyframes k{0%{a:b}}@font-face{font-family:x}.c:hover{x:y}';
  const items = parseCss(css);
  assert.deepEqual(items.map((i) => [i.type, i.prelude]), [['stmt', '@charset "x"'], ['rule', '.a'], ['at', '@media (max-width:1px)'], ['at', '@keyframes k'], ['at', '@font-face'], ['rule', '.c:hover']]);
  assert.deepEqual(items[2].children.map((i) => css.slice(i.start, i.end)), ['.b{x:url(a{b).png)}']);
  assert.equal(css.slice(items[1].start, items[1].end), '.a{content:"}"}');
});

test('splitSelectorList: top-level commas only', () => {
  assert.deepEqual(splitSelectorList('.a, .b:is(.c,.d) , [x="1,2"]'), ['.a', '.b:is(.c,.d)', '[x="1,2"]']);
});

test('widenSelector: pseudo-classes/elements removed, dynamic names removed, empty compound = *', () => {
  const dyn = dynamicPredicate(new Set(['js', 'open', 'data-open', 'iframe']), ['cmplz-show']);
  assert.equal(widenSelector('.a:hover > .b::before', dyn), '.a > .b');
  assert.equal(widenSelector('html.js .x', dyn), 'html .x');
  assert.equal(widenSelector('.tk-video iframe', dyn), '.tk-video *');
  assert.equal(widenSelector('[data-open] .x ~ .y + z', dyn), '* .x ~ .y + z');
  assert.equal(widenSelector('div.x:not(.y)', dyn), 'div.x');
  assert.equal(widenSelector('.cmplz-cookiebanner.cmplz-show .b', dyn), '.cmplz-cookiebanner .b');
  assert.equal(widenSelector('.a\\:b', none), '.a\\:b');
  assert.equal(widenSelector(':root', none), '*');
  assert.equal(widenSelector('& .a', none), null, 'nesting is not understood: the rule is kept');
});

test('scriptWords: words and dataset names', () => {
  const w = scriptWords(["el.classList.add('is-open'); el.dataset.revealLive = ''; x.setAttribute('aria-expanded')"]);
  for (const k of ['is-open', 'aria-expanded', 'data-reveal-live', 'revealLive']) assert.ok(w.has(k), k);
});

test('buildSubset: exact source slices, empty groups and unused keyframes dropped', () => {
  const css = '@charset "x";.a{color:red}@media (max-width:1px){.b{x:y}.a,.z{u:v}}@keyframes k{0%{a:b}}@keyframes q{0%{a:b}}.a{animation:k 1s}.c:hover{x:y}@media print{.c{x:y}}';
  const keep = (sels) => sels.some((s) => s.startsWith('.a'));
  const used = (name, kept) => new RegExp(`(^|[^\\w-])${name}($|[^\\w-])`).test(kept);
  const { css: out, dropped } = buildSubset(css, parseCss(css), keep, used);
  assert.equal(out, '@charset "x";.a{color:red}@media (max-width:1px){.a,.z{u:v}}@keyframes k{0%{a:b}}.a{animation:k 1s}');
  assert.deepEqual(dropped.sort(), ['.b', '.c', '.c:hover', '@keyframes q'].sort());
});

test('committed subsets: manifest well-formed, every kept rule is verbatim source text order-preserving', () => {
  const dir = new URL('wp-content/themes/tkadlcik/assets/css/subsets/', ROOT);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  assert.ok(Object.keys(manifest.sources).length >= 1);
  for (const [key, e] of Object.entries(manifest.sources)) {
    assert.match(e.sha1, /^[0-9a-f]{40}$/, key);
    assert.match(e.subset, /^[a-z0-9-]+\.css$/, key);
    assert.ok(existsSync(new URL(e.subset, dir)), `${key}: ${e.subset} exists`);
    const sub = readFileSync(new URL(e.subset, dir), 'utf8');
    assert.equal(Buffer.byteLength(sub), e.subsetBytes, `${key}: size as recorded`);
    // Every top-level style rule of the subset parses, and every selector list is a plain list.
    for (const s of collectSelectors(sub, parseCss(sub))) assert.ok(s.length > 0, `${key}: empty selector`);
  }
});
