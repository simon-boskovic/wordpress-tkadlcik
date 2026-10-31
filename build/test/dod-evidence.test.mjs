import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHECK_ORDER, EVIDENCE_DEVICES, discoverPages, targetSize } from '../dod-evidence.mjs';

test('targetSize never upscales', () => {
  assert.deepEqual(targetSize(390, 3900, 1400, 6000), { w: 390, h: 3900 });
});

test('targetSize downscales by width when width is the binding constraint', () => {
  const { w, h } = targetSize(2892, 2915, 1400, 6000);
  assert.equal(w, 1400);
  assert.ok(Math.abs(h - Math.round(2915 * (1400 / 2892))) <= 1);
});

test('targetSize caps by height on very tall pages even though width would still fit', () => {
  const { w, h } = targetSize(800, 20000, 1400, 6000);
  assert.equal(h, 6000);
  assert.ok(Math.abs(w - Math.round(800 * (6000 / 20000))) <= 1);
});

test('targetSize keeps a square image within both caps', () => {
  const { w, h } = targetSize(500, 500, 1400, 6000);
  assert.deepEqual({ w, h }, { w: 500, h: 500 });
});

test('CHECK_ORDER and EVIDENCE_DEVICES are non-empty and have no duplicates', () => {
  assert.equal(new Set(CHECK_ORDER).size, CHECK_ORDER.length);
  assert.equal(new Set(EVIDENCE_DEVICES).size, EVIDENCE_DEVICES.length);
  assert.ok(CHECK_ORDER.includes('visual'));
  assert.deepEqual(EVIDENCE_DEVICES, ['M', 'T', 'TL', 'D']);
});

test('discoverPages finds only directories with a checks/ subdirectory, ignores underscore-prefixed dirs', () => {
  const root = mkdtempSync(join(tmpdir(), 'tk-dod-evidence-test-'));
  try {
    mkdirSync(join(root, 'uvod', 'checks'), { recursive: true });
    mkdirSync(join(root, 'kontakt', 'checks'), { recursive: true });
    mkdirSync(join(root, '_dev'), { recursive: true }); // excluded: leading underscore
    mkdirSync(join(root, 'no-checks-dir'), { recursive: true }); // excluded: no checks/ subdir
    writeFileSync(join(root, 'SUMMARY.md'), '# not a page'); // excluded: not a directory... it is a file
    assert.deepEqual(discoverPages(root), ['kontakt', 'uvod']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('discoverPages returns an empty array for a missing root', () => {
  assert.deepEqual(discoverPages(join(tmpdir(), 'definitely-does-not-exist-ma-dod')), []);
});
