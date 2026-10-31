/**
 * Definition-of-Done harness (docs/definition-of-done.md; port of the martinadamus harness): local WordPress
 * page vs the Claude Design prototype (design_handoff_tkadlcik/), check by check.
 *
 *   node build/dod.mjs [--all | --only=osobni-trenink,cenik] [--checks=visual,console,…] [--skip=lighthouse]
 *                      [--base=http://localhost:8020] [--proto=http://127.0.0.1:8765] [--out=build/shots/dod]
 *                      [--devices=M,D] [--jobs=3] [--self] [--lh-ref] [--inject-local-css=f.css] [--summary]
 *
 * One PASS/FAIL line per check. Each result is stored in <out>/<slug>/checks/<check>.json; the page
 * report <out>/<slug>/report.md(+json) and the site summary <out>/SUMMARY.md are rendered from them, so a
 * re-run of a subset updates the reports. Exit 1 on any FAIL (N/A, BLOCKED, SKIP do not fail).
 *   --all        every page in build/pages (the default when --only is absent)
 *   --jobs=N     run pages in N parallel worker processes; checks marked serial (Lighthouse) run after
 *                them one page at a time so their timings are not skewed by the parallel load
 *   --summary    only re-render the summary from stored results
 *   --self       sanity mode: visual compares reference vs reference and local vs local (both must be ~0 %)
 *   --lh-ref     also run Lighthouse on the reference page (slow; for diagnosis)
 *   --inject-local-css=<file>  add this CSS to the local page before the visual capture (diagnosis only)
 * Needs the prototype served (node build/serve-prototype.mjs). External tools, never npm dependencies:
 *   TK_LIGHTHOUSE = lighthouse binary, TK_PLAYWRIGHT = playwright package dir; both default to the gitignored
 *   .tools/pw (build/lib/dod/tools.mjs); without Lighthouse npx is tried, without Playwright (or inside the
 *   Claude Code sandbox) the cross-browser check reports SKIP.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS } from './lib/dod/checks/index.mjs';
import { DEVICES } from './lib/dod/config.mjs';
import { loadResults, renderPage, renderSummary, saveResult } from './lib/dod/report.mjs';
import { unknownFlags, USAGE } from './lib/dod/cli.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARGV = process.argv.slice(2);
if (ARGV.includes('--help') || ARGV.includes('-h')) { console.log(USAGE); process.exit(0); }
const badFlags = unknownFlags(ARGV);
if (badFlags.length) { console.error(`unknown flag(s): ${badFlags.map((f) => `--${f}`).join(', ')}\n`); console.error(USAGE); process.exit(2); }
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const flag = (n) => process.argv.includes(`--${n}`);
const BASE = arg('base', 'http://localhost:8020').replace(/\/$/, '');
const PROTO = arg('proto', 'http://127.0.0.1:8765').replace(/\/$/, '');
const OUT = resolve(arg('out', join(HERE, 'shots', 'dod')));
const ONLY = arg('only', '').split(',').filter(Boolean);
const WANT = arg('checks', '').split(',').filter(Boolean);
const SKIPC = arg('skip', '').split(',').filter(Boolean);
const DEVS = arg('devices', '').split(',').filter(Boolean);
const JOBS = Number(arg('jobs', '1')) || 1;
const ORDER = CHECKS.map((c) => c.name);
for (const d of DEVS) if (!DEVICES[d]) { console.error(`unknown device ${d} (known: ${Object.keys(DEVICES)})`); process.exit(2); }
for (const c of [...WANT, ...SKIPC]) if (!ORDER.includes(c)) { console.error(`unknown check ${c} (known: ${ORDER})`); process.exit(2); }

const defs = readdirSync(join(HERE, 'pages')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(HERE, 'pages', f), 'utf8')));
const pathOf = (d) => (d.front_page ? '/' : `/${d.slug}/`);
for (const s of ONLY) if (!defs.some((d) => d.slug === s)) { console.error(`${s}: no build/pages/${s}.json`); process.exit(2); }
const pages = defs.filter((d) => !ONLY.length || ONLY.includes(d.slug));
const checks = CHECKS.filter((c) => (!WANT.length || WANT.includes(c.name)) && !SKIPC.includes(c.name));
const INJECT = arg('inject-local-css', '');
const opts = { self: flag('self'), lhRef: flag('lh-ref'), devices: DEVS.length ? DEVS : null, injectCss: INJECT ? readFileSync(INJECT, 'utf8') : '' };
const allPages = defs.map((d) => ({ slug: d.slug }));
// One id per top-level invocation, inherited by the worker processes (env): every stored result and the
// shared verify --seo output carry it, so SUMMARY.md can tell this run's results from stale ones and the
// seo check never reuses a site-level verify result from an earlier run.
const RUN_ID = process.env.TK_DOD_RUN || `${new Date().toISOString()}#${process.pid}`;
process.env.TK_DOD_RUN = RUN_ID;

/** Page slug → prototype board (canvas.json): Main→/, Cviceni→/cviceni/, Rozvrh→/kurzy-a-lekce/, … */
export const PROTOTYPE = {
  domu: 'Main.dc.html', cviceni: 'Cviceni.dc.html', 'kurzy-a-lekce': 'Rozvrh.dc.html', akce: 'Seminare.dc.html',
  'o-mne': 'OMne.dc.html', clanky: 'Clanky.dc.html', kontakt: 'Kontakt.dc.html',
};

function pageMeta(d) {
  const path = pathOf(d);
  const file = PROTOTYPE[d.slug];
  return {
    slug: d.slug, path, front: !!d.front_page,
    localUrl: BASE + path, refUrl: file ? `${PROTO}/${encodeURIComponent(file)}` : null,
    variants: [{ suffix: '', branch: '' }],
  };
}

async function runPage(d) {
  const meta = pageMeta(d);
  const out = join(OUT, d.slug);
  mkdirSync(out, { recursive: true });
  if (!meta.refUrl) { console.error(`${d.slug}: no prototype route for ${meta.path}`); return true; }
  const ctx = { ...meta, base: BASE, proto: PROTO, out, root: OUT, opts, shared: {}, runId: RUN_ID };
  console.log(`\n${d.slug}  local ${ctx.localUrl}  ↔  reference ${ctx.refUrl}${opts.self ? '  [SELF-CHECK]' : ''}`);
  let fail = false;
  for (const c of checks) {
    const t0 = Date.now();
    let r;
    // A check that exceeds its budget is a harness FAIL (and the process moves on) rather than a hung run.
    const budget = Number(process.env.TK_DOD_CHECK_TIMEOUT || 20 * 60000);
    // A harness error (browser stall, target closed under load) is retried once before it is reported.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try { r = await Promise.race([c.run(ctx), new Promise((_, rej) => setTimeout(() => rej(new Error(`check exceeded ${budget / 60000} min`)), budget).unref())]); } catch (e) { r = { status: 'FAIL', summary: `harness error: ${e.message}`, details: { stack: e.stack }, md: '```\n' + e.stack + '\n```' }; }
      if (!String(r.summary).startsWith('harness error') || attempt === 2) break;
      console.log(`retry   ${c.name.padEnd(15)} after ${r.summary}`);
    }
    r = { name: c.name, title: c.title, ...r, seconds: Math.round((Date.now() - t0) / 1000), run: new Date().toISOString(), runId: RUN_ID, injected: !!(opts.injectCss && c.name === 'visual') };
    saveResult(out, c.name, r);
    if (r.status === 'FAIL') fail = true;
    console.log(`${r.status.padEnd(7)} ${c.name.padEnd(15)} ${r.summary}  (${r.seconds}s)`);
  }
  renderPage(out, meta, loadResults(out, ORDER), RUN_ID);
  console.log(`report: ${join(out, 'report.md')}`);
  return fail;
}

/** Parallel mode: one worker process per page (non-serial checks), then serial checks page by page. */
async function runJobs() {
  const self = fileURLToPath(import.meta.url);
  const pass = process.argv.slice(2).filter((a) => !/^--(jobs|only|all|checks|skip|summary)(=|$)/.test(a));
  const par = checks.filter((c) => !c.serial).map((c) => c.name), ser = checks.filter((c) => c.serial).map((c) => c.name);
  let fail = false;
  const queue = [...pages];
  const worker = async () => {
    while (queue.length) {
      const d = queue.shift();
      if (!par.length) continue;
      await new Promise((res) => {
        const p = spawn(process.execPath, [self, `--only=${d.slug}`, `--checks=${par.join(',')}`, '--no-summary', ...pass], { stdio: ['ignore', 'pipe', 'pipe'] });
        let buf = '';
        p.stdout.on('data', (x) => { buf += x; });
        p.stderr.on('data', (x) => { buf += x; });
        p.on('close', (code) => { if (code) fail = true; process.stdout.write(buf); res(); });
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(JOBS, pages.length) }, worker));
  if (ser.length) for (const d of pages) {
    const r = spawnSync(process.execPath, [self, `--only=${d.slug}`, `--checks=${ser.join(',')}`, '--no-summary', ...pass], { stdio: 'inherit' });
    if (r.status) fail = true;
  }
  return fail;
}

/** verify.mjs --seo once for all pages (its site checks — sitemap, robots, 301s — are site-wide). */
function sharedVerify() {
  if (!checks.some((c) => c.name === 'seo') || pages.length < 2 || flag('summary')) return;
  mkdirSync(join(OUT, '_site'), { recursive: true });
  console.log('verify.mjs --seo (all pages, shared by the seo check) …');
  const v = spawnSync(process.execPath, [join(HERE, 'verify.mjs'), '--seo', `--base=${BASE}`], { encoding: 'utf8', timeout: 900000 });
  writeFileSync(join(OUT, '_site', 'verify-seo.json'), JSON.stringify({ runId: RUN_ID, status: v.status, out: ((v.stdout || '') + (v.stderr || '')).trim() || (v.error ? String(v.error) : '') }));
}

let anyFail = false;
sharedVerify();
if (flag('summary')) {
  // render only
} else if (JOBS > 1 && pages.length > 1) {
  anyFail = await runJobs();
} else {
  for (const d of pages) if (await runPage(d)) anyFail = true;
}
if (!flag('no-summary')) {
  // --summary only re-renders: "this run" is then the latest run found in the stored results.
  const current = flag('summary') ? undefined : RUN_ID;
  for (const d of defs) { const out = join(OUT, d.slug); const res = loadResults(out, ORDER); if (res.length) renderPage(out, pageMeta(d), res, current); }
  renderSummary(OUT, allPages.filter((p) => loadResults(join(OUT, p.slug), ORDER).length), ORDER, current);
  console.log(`\nsummary: ${join(OUT, 'SUMMARY.md')}`);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, '.last-run'), new Date().toISOString());
process.exit(anyFail ? 1 : 0);
