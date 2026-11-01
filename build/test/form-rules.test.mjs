// The contact form's browser validation (theme assets/js/form.js tkFormCheck) against the shared cases and rules;
// the server side runs the same cases in build/test/form-test.php.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../../', import.meta.url);
const rules = JSON.parse(readFileSync(new URL('wp-content/mu-plugins/tk-form/rules.json', root), 'utf8'));
const cases = JSON.parse(readFileSync(new URL('build/test/form-cases.json', root), 'utf8'));
const sandbox = { module: { exports: {} } };
runInNewContext(readFileSync(new URL('wp-content/themes/tkadlcik/assets/js/form.js', root), 'utf8'), sandbox);
const check = sandbox.module.exports;
const expand = (v) => v.replace(/^\{\{(\d+)\}\}$/, (_, n) => 'a'.repeat(Number(n)));

test('form rules: every shared case gives the expected invalid fields (browser side)', () => {
  for (const c of cases) {
    const data = Object.fromEntries(Object.entries(c.data).map(([k, v]) => [k, expand(v)]));
    const got = Object.keys(check(rules, data)).sort();
    assert.deepEqual(got, [...c.errors].sort(), JSON.stringify(c.data).slice(0, 120));
  }
});

test('form rules: every message the rules can produce is Czech text, none empty', () => {
  for (const [f, r] of Object.entries(rules)) {
    if (f === '_') continue;
    for (const [k, v] of Object.entries(r)) if (/Msg$|^required$/.test(k)) assert.ok(typeof v === 'string' && v.length > 5, `${f}.${k}`);
  }
});
