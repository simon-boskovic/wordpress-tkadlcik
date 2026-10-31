import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, attr, createIds, section } from '../lib/html.mjs';

test('esc and attr escape markup', () => {
  assert.equal(esc('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
  assert.equal(attr('say "hi"'), 'say &quot;hi&quot;');
});

test('ids are deterministic per slug, unique, 7 hex chars', () => {
  const a = createIds('akce'), b = createIds('akce'), c = createIds('kontakt');
  const first = [a(), a(), a()];
  assert.deepEqual(first, [b(), b(), b()]);
  assert.notEqual(first[0], c());
  assert.equal(new Set(first).size, 3);
  for (const id of first) assert.match(id, /^[0-9a-f]{7}$/);
});

test('section wraps html in a full-width zero-padding container with one HTML widget', () => {
  const s = section(createIds('x'), '  <p>Hi</p>  ');
  assert.equal(s.elType, 'container');
  assert.equal(s.settings.content_width, 'full');
  assert.equal(s.elements.length, 1);
  assert.equal(s.elements[0].widgetType, 'html');
  assert.equal(s.elements[0].settings.html, '<p>Hi</p>');
});
