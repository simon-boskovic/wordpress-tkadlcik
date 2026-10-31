import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE_FILES, PATCHES, applyPatches, mapCss, patchesFor, siteFontCss, videoCss } from '../lib/reference-patches.mjs';
import { VIDEOS } from '../builders/cviceni.mjs';
import { VIDEO_NOTE, mapBox } from '../fragments.mjs';
import { mapsEmbedUrl, mapsLinkUrl, places } from '../content.mjs';

const HANDOFF = new URL('../../design_handoff_tkadlcik/', import.meta.url);
const read = (f) => readFileSync(new URL(f, HANDOFF), 'utf8');

test('a string patch replaces its single match; other files and the untouched rest stay identical', () => {
  const patches = [{ file: 'a.html', id: 'D9', name: 't', why: 't', find: 'x=1', replace: 'x=2' }];
  assert.equal(applyPatches('/some/dir/a.html', '<p>x=1</p><p>y=1</p>', patches), '<p>x=2</p><p>y=1</p>');
  assert.equal(applyPatches('b.html', '<p>x=1</p>', patches), '<p>x=1</p>');
  assert.equal(patchesFor('b.html', patches).length, 0);
});

test('a regexp patch must match exactly once; $-sequences in the replacement are literal', () => {
  const patches = [{ file: 'a.html', id: 'D9', name: 't', why: 't', find: /v=\d+/, replace: 'v=$&$1' }];
  assert.equal(applyPatches('a.html', 'v=1;', patches), 'v=$&$1;');
  assert.throws(() => applyPatches('a.html', 'v=1;v=2;', patches), /D9 for a\.html .*matched 2 times, expected exactly 1/);
  assert.throws(() => applyPatches('a.html', 'w=1;', patches), /matched 0 times/);
});

test('every declared patch has an id, a name and a justification, and matches its prototype file exactly as declared', () => {
  assert.ok(PATCHES.length >= 4 * PAGE_FILES.length - 10);
  for (const p of PATCHES) {
    assert.match(p.id, /^D\d+$/);
    assert.ok(p.name && p.why && p.why.length > 30, `${p.id} ${p.file}: name + why`);
    assert.doesNotThrow(() => applyPatches(p.file, read(p.file), [p]), `${p.id} ${p.file}`);
  }
  for (const f of PAGE_FILES) assert.doesNotThrow(() => applyPatches(f, read(f)), f);
});

test('D0–D2 on every page: viewport meta, the site\'s own Geist faces instead of Google Fonts, no font picker', () => {
  for (const f of PAGE_FILES) {
    const out = applyPatches(f, read(f));
    assert.match(out, /<meta name="viewport" content="width=device-width/, f);
    assert.ok(out.includes(`<style id="tk-fonts">${siteFontCss()}</style>`), f);
    assert.doesNotMatch(out, /fonts\.googleapis\.com/, f);
    assert.doesNotMatch(out, /class="font-picker"|onChange="\{\{pickFont\}\}"/, f);
    assert.match(out, /<\/footer>\n<\/div>\n<\/x-dc>/, `${f}: the template still closes right after the footer`);
  }
  // The faces mirror inc/fonts.php: Geist 400/500/600 + Geist Mono 400, latin + latin-ext.
  const php = readFileSync(new URL('../../wp-content/themes/tkadlcik/inc/fonts.php', import.meta.url), 'utf8');
  for (const stem of siteFontCss().match(/geist-[a-z-]+-\d00-normal/g)) assert.ok(php.includes(stem.replace(/-(400|500|600)-normal$/, '-')) || php.includes(stem), stem);
  assert.equal(siteFontCss().split('@font-face').length - 1, 8);
});

test('D3: each [Mapa] placeholder becomes the site\'s map box for its own place; the map CSS is the theme\'s', () => {
  for (const [f, label] of [['Rozvrh.dc.html', '[Mapa]'], ['Kontakt.dc.html', '[Mapa Google]']]) {
    const out = applyPatches(f, read(f));
    assert.ok(!out.includes(label), f);
    for (const place of places) assert.ok(out.includes(mapBox(place, mapsEmbedUrl, mapsLinkUrl)), `${f} ${place.key}`);
    assert.ok(out.indexOf(places[0].map.split(',')[0].replace(/\//g, '%2F')) < out.indexOf(encodeURIComponent(places[1].map.split(',')[0])), `${f}: Praha box first`);
  }
  assert.match(mapCss(), /^\.tk-map\{/);
  assert.doesNotMatch(mapCss(), /:not\(\.js\)/);
});

test('D5: every YouTube placeholder on Cvičení becomes the site\'s video facade, ids mapped to their captions', () => {
  const out = applyPatches('Cviceni.dc.html', read('Cviceni.dc.html'));
  assert.doesNotMatch(out, /\[(?:Video )?YouTube/);
  const ids = [...out.matchAll(/data-tk-video-box data-src="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})\?autoplay=1"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['1Mmz_QpYk9s', '1UPJuzGC1UY', ...VIDEOS.map((v) => v.id)]);
  assert.equal((out.match(/src="data:image\/jpeg;base64,/g) || []).length, 7);
  assert.equal(out.split(`<span class="tk-video-note"`).length - 1, 7);
  assert.equal(out.split(VIDEO_NOTE).length - 1, 7);
  assert.ok(out.includes(`<style id="tk-video-css">${videoCss()}</style>`));
  assert.doesNotMatch(out, /<iframe\b|i\.ytimg\.com/);
});

test('D6: Akce harmonogram — the days are the h4s, no duplicate heading texts, same look', () => {
  const out = applyPatches('Seminare.dc.html', read('Seminare.dc.html'));
  const h4 = [...out.matchAll(/<h4\b[^>]*>([^<]*)<\/h4>/g)].map((m) => m[1]);
  assert.deepEqual(h4, ['Čtvrtek 27. 11. 2025', 'Pátek 28. 11. 2025', 'Sobota 29. 11. 2025']);
  const h3 = [...out.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => m[1].replace(/<[^>]*>/g, ''));
  assert.equal(new Set(h3).size, h3.length);
});
