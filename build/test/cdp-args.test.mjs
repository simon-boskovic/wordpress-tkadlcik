import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraBrowserArgs, BROWSER_PATH } from '../lib/cdp.mjs';

test('no extra browser switches by default', () => {
  assert.deepEqual(extraBrowserArgs({}), []);
  assert.deepEqual(extraBrowserArgs({ TK_BLOCK_EXTERNAL: '0' }), []);
});

test('TK_BLOCK_EXTERNAL=1 maps every host but localhost/127.0.0.1/unpkg.com to NOTFOUND', () => {
  assert.deepEqual(extraBrowserArgs({ TK_BLOCK_EXTERNAL: '1' }), ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE unpkg.com']);
  assert.deepEqual(extraBrowserArgs({ TK_BLOCK_EXTERNAL: '1', TK_BLOCK_EXTERNAL_ALLOW: ' example.test ,' }), ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE unpkg.com, EXCLUDE example.test']);
});

test('TK_BROWSER_ARGS is a JSON array of strings', () => {
  assert.deepEqual(extraBrowserArgs({ TK_BROWSER_ARGS: '["--lang=cs","--foo"]' }), ['--lang=cs', '--foo']);
  assert.throws(() => extraBrowserArgs({ TK_BROWSER_ARGS: '--lang=cs' }), /JSON array/);
  assert.throws(() => extraBrowserArgs({ TK_BROWSER_ARGS: '[1]' }), /JSON array/);
});

test('a browser is found (TK_BROWSER, Playwright\'s Chrome for Testing, or an installed Chromium)', () => {
  assert.ok(BROWSER_PATH, 'no Chromium found — set TK_BROWSER');
});
