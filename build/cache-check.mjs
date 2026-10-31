/**
 * Page cache acceptance checks (production-style audit) — see build/lib/cache-check.mjs.
 *   node build/cache-check.mjs [--base=http://localhost:8020] [--mode=rewrite|php]
 *   npm run cache-check -- --base=https://example.cz
 * --mode=php expects the PHP drop-in to serve (after `wp tk cache-setup --mode=php`). Exit 1 on any failure.
 */
import { runCacheChecks } from './lib/cache-check.mjs';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const failures = [];
const res = await runCacheChecks({
  base: arg('base', process.env.TK_BASE || 'http://localhost:8020'),
  mode: arg('mode', 'rewrite'),
  fail: (label, msg) => failures.push(`${label}: ${msg}`),
  log: (line) => console.log(line),
});
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nPage cache OK: ${res.hits}/${res.pages} pages served from the cache, ${res.cases} assertions.`);
