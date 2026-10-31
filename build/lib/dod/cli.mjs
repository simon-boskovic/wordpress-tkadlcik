/**
 * dod.mjs command-line surface: the flag list, the `--help` text and unknown-flag detection, kept
 * apart from dod.mjs itself so both can be unit-tested without spinning up the harness.
 */

/** One entry per flag dod.mjs understands. `valued` flags take `--name=value`; the rest are booleans
 * (`--name`). `hidden` flags are accepted (never reported as unknown — --jobs mode passes them to its
 * worker processes) but left out of the printed usage since they are not part of the public surface. */
export const FLAGS = [
  { name: 'help', alias: '-h', desc: 'print this usage and exit 0 without running anything' },
  { name: 'all', desc: 'run every page in build/pages (the default when --only is absent)' },
  { name: 'only', valued: true, placeholder: '<slug,slug,…>', desc: 'run just these page slugs' },
  { name: 'checks', valued: true, placeholder: '<name,name,…>', desc: 'run just these checks (see build/lib/dod/checks/index.mjs for names)' },
  { name: 'skip', valued: true, placeholder: '<name,name,…>', desc: 'run every selected check except these' },
  { name: 'base', valued: true, placeholder: '<url>', default: 'http://localhost:8020', desc: 'local WordPress site to check' },
  { name: 'proto', valued: true, placeholder: '<url>', default: 'http://127.0.0.1:8765', desc: 'Claude Design prototype (node build/serve-prototype.mjs)' },
  { name: 'out', valued: true, placeholder: '<dir>', default: 'build/shots/dod', desc: 'where per-check results, reports and screenshots are written' },
  { name: 'devices', valued: true, placeholder: '<key,key,…>', desc: 'override a check\'s device set (keys in build/lib/dod/config.mjs DEVICES)' },
  { name: 'jobs', valued: true, placeholder: '<n>', default: '1', desc: 'run pages in N parallel worker processes; serial checks (e.g. Lighthouse) still run after them, one page at a time' },
  { name: 'self', desc: 'sanity mode: visual compares reference vs reference and local vs local (both must be ~0%)' },
  { name: 'lh-ref', desc: 'also run Lighthouse on the reference page (slow; for diagnosis)' },
  { name: 'inject-local-css', valued: true, placeholder: '<file>', desc: 'add this CSS to the local page before the visual capture (diagnosis only)' },
  { name: 'summary', desc: 'only re-render SUMMARY.md and the page reports from stored results; runs nothing' },
  { name: 'no-summary', hidden: true, desc: 'skip rendering the summary after this run (used internally by --jobs)' },
];

const FLAG_NAMES = new Set(FLAGS.flatMap((f) => [f.name, f.alias].filter(Boolean)));

export const USAGE = `Definition-of-Done harness (docs/definition-of-done.md): local WordPress page vs the
Claude Design prototype, check by check.

Usage:
  node build/dod.mjs [--all | --only=<slugs>] [--checks=<names>] [--skip=<names>]
                      [--base=<url>] [--proto=<url>] [--out=<dir>] [--devices=<keys>] [--jobs=<n>]
                      [--self] [--lh-ref] [--inject-local-css=<file>] [--summary]
  node build/dod.mjs --help | -h

One PASS/FAIL line per check. Each result is stored in <out>/<slug>/checks/<check>.json; the page
report <out>/<slug>/report.md(+json) and the site summary <out>/SUMMARY.md are rendered from them, so
a re-run of a subset updates the reports. Exit 1 on any FAIL (N/A, BLOCKED, SKIP do not fail); exit 2
on a bad argument (unknown flag, check, device or --only slug); --help exits 0 without running anything.

Flags:
${FLAGS.filter((f) => !f.hidden).map((f) => {
    const label = `--${f.name}${f.valued ? `=${f.placeholder}` : ''}${f.alias ? `, ${f.alias}` : ''}`;
    const def = f.default ? ` (default ${f.default})` : '';
    return `  ${label.padEnd(28)}${f.desc}${def}`;
  }).join('\n')}

Needs the prototype served (node build/serve-prototype.mjs). External tools, never npm dependencies:
  TK_LIGHTHOUSE   lighthouse binary      (default .tools/pw/node_modules/.bin/lighthouse, else npx)
  TK_PLAYWRIGHT   playwright package dir (default .tools/pw/node_modules/playwright, else the
                  cross-browser check reports SKIP)
`;

/** `--name` / `--name=value` tokens in argv that this CLI does not recognise (positional args and
 * `-h` pass through untouched). */
export function unknownFlags(argv) {
  return argv.filter((a) => a.startsWith('--')).map((a) => a.split('=')[0].slice(2)).filter((n) => !FLAG_NAMES.has(n));
}
