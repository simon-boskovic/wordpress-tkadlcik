import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff, words } from '../lib/textdiff.mjs';

test('words normalises NBSP and whitespace', () => {
  assert.deepEqual(words(' Po–Pá  dle\n\tdomluvy '), ['Po–Pá', 'dle', 'domluvy']);
});

test('wordDiff: identical text has no hunks', () => {
  assert.deepEqual(wordDiff(words('a b c'), words('a b c')), []);
});

test('wordDiff reports replaced, missing and extra words with context', () => {
  const ref = words('Domluvit první trénink Ceník Pro koho je osobní trénink');
  const loc = words('Domluvit první trénink Ceník Pro koho je trénink navíc');
  const h = wordDiff(ref, loc, { context: 2 });
  assert.deepEqual(h, [
    { before: 'koho je', ref: 'osobní', local: '' },
    { before: 'osobní trénink', ref: '', local: 'navíc' },
  ]);
});

test('wordDiff groups a run of changes into one hunk', () => {
  const h = wordDiff(words('x Přeskočit na obsah y'), words('x y'));
  assert.equal(h.length, 1);
  assert.equal(h[0].ref, 'Přeskočit na obsah');
  assert.equal(h[0].local, '');
});
