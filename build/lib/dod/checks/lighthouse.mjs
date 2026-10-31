/**
 * lighthouse — Lighthouse CLI, mobile AND desktop (DoD §4): Accessibility 100, Best Practices ≥ 95,
 * SEO 100, Performance (mobile) ≥ 90; Core Web Vitals: LCP ≤ 2.5 s (Lighthouse mobile = simulated Slow 4G),
 * CLS < 0.05, INP proxy = Total Blocking Time < 200 ms (lab). Gates in config.THRESHOLDS.lighthouse.
 * Noindex pages cannot score SEO 100 by design → SEO N/A there (reason given).
 * Runs serially in --jobs mode (performance must not be measured under parallel load).
 *
 * Lighthouse is NOT a dependency of this repo. The command comes from TK_LIGHTHOUSE, else the gitignored
 * .tools/pw install (build/lib/dod/tools.mjs), else `npx --yes lighthouse`. The browser is the one
 * build/lib/cdp.mjs found (or TK_BROWSER), passed as CHROME_PATH too (chrome-launcher honours only that
 * in some setups). --lh-ref also audits the reference page.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { BROWSER_PATH } from '../../cdp.mjs';
import { NOINDEX, THRESHOLDS } from '../config.mjs';
import { lighthouseBin } from '../tools.mjs';

const CATS = ['accessibility', 'seo', 'best-practices', 'performance'];

function runLighthouse(url, formFactor, outFile) {
  const bin = lighthouseBin();
  const args = [url, '--output=json', `--output-path=${outFile}`, `--only-categories=${CATS.join(',')}`,
    `--chrome-path=${BROWSER_PATH}`, '--chrome-flags=--headless=new --no-first-run --disable-gpu', '--quiet', '--max-wait-for-load=45000'];
  if (formFactor === 'desktop') args.push('--preset=desktop');
  const [cmd, cmdArgs] = bin ? [bin, args] : ['npx', ['--yes', 'lighthouse', ...args]];
  if (existsSync(outFile)) rmSync(outFile);
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', timeout: 240000, shell: process.platform === 'win32', env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || BROWSER_PATH } });
  if (!existsSync(outFile)) throw new Error(`lighthouse produced no report (exit ${r.status}): ${(r.stderr || r.stdout || r.error?.message || '').trim().split('\n').filter((l) => !/^\s+at /.test(l)).slice(-3).join(' ')}`);
  const j = JSON.parse(readFileSync(outFile, 'utf8'));
  const scores = Object.fromEntries(Object.entries(j.categories).map(([k, c]) => [k, c.score == null ? null : Math.round(c.score * 100)]));
  const failing = {};
  for (const [k, c] of Object.entries(j.categories)) {
    failing[k] = c.auditRefs.filter((a) => a.weight > 0 || k === 'performance').map((a) => j.audits[a.id]).filter((a) => a && a.score !== null && a.score < 1 && !['informative', 'manual', 'notApplicable'].includes(a.scoreDisplayMode))
      .map((a) => ({ id: a.id, title: a.title, score: a.score, display: a.displayValue || '', items: (a.details?.items || []).slice(0, 5).map((it) => it.node?.snippet || it.url || it.source?.url || it.node?.selector || '').filter(Boolean) }));
  }
  const m = (id) => j.audits[id]?.numericValue;
  return { scores, failing, lcpMs: m('largest-contentful-paint'), cls: m('cumulative-layout-shift'), tbtMs: m('total-blocking-time'), fcpMs: m('first-contentful-paint'), lcpEl: j.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || '', lhVersion: j.lighthouseVersion };
}

export default {
  name: 'lighthouse',
  serial: true,
  title: 'Lighthouse mobile + desktop: A11y 100, BP ≥ 95, SEO 100, Perf (mobile) ≥ 90; LCP ≤ 2.5 s, CLS < 0.05, TBT < 200 ms',
  async run(ctx) {
    const noindex = NOINDEX.includes(ctx.slug);
    const rows = [], problems = [], notes = [];
    for (const [ff, gates] of Object.entries(THRESHOLDS.lighthouse)) {
      let local;
      try { local = runLighthouse(ctx.localUrl, ff, join(ctx.out, `lighthouse-${ff}-local.json`)); } catch (e) { problems.push(`${ff}: ${e.message}`); rows.push({ ff, local: { error: e.message } }); continue; }
      let ref = null;
      if (ctx.opts.lhRef) { try { ref = runLighthouse(ctx.refUrl, ff, join(ctx.out, `lighthouse-${ff}-ref.json`)); } catch (e) { ref = { error: e.message }; } }
      for (const cat of CATS) {
        const min = gates[cat];
        if (min == null) continue;
        if (cat === 'seo' && noindex) { notes.push(`${ff} SEO N/A: page is noindex by design (score ${local.scores.seo}; Lighthouse's is-crawlable audit fails on noindex)`); continue; }
        if (local.scores[cat] == null || local.scores[cat] < min) problems.push(`${ff} ${cat} ${local.scores[cat]} < ${min}: ${(local.failing[cat] || []).map((a) => a.id).join(', ')}`);
      }
      if (gates.lcpMs != null && local.lcpMs > gates.lcpMs) problems.push(`${ff} LCP ${Math.round(local.lcpMs)} ms > ${gates.lcpMs} ms (element: ${local.lcpEl.slice(0, 100)})`);
      if (gates.cls != null && local.cls >= gates.cls) problems.push(`${ff} CLS ${local.cls.toFixed(3)} ≥ ${gates.cls}`);
      if (gates.tbtMs != null && local.tbtMs >= gates.tbtMs) problems.push(`${ff} TBT ${Math.round(local.tbtMs)} ms ≥ ${gates.tbtMs} ms (INP proxy)`);
      rows.push({ ff, local, ref });
    }
    const fmt = (x) => (!x ? 'not run (--lh-ref)' : x.error ? x.error : `A11y ${x.scores.accessibility} · SEO ${x.scores.seo} · BP ${x.scores['best-practices']} · Perf ${x.scores.performance} · LCP ${Math.round(x.lcpMs)} ms · CLS ${x.cls?.toFixed(3)} · TBT ${Math.round(x.tbtMs)} ms`);
    const md = [
      ...rows.map((r) => `- **${r.ff}** local: ${fmt(r.local)}\n- **${r.ff}** reference: ${fmt(r.ref)}${r.local.lcpEl ? `\n- ${r.ff} LCP element: \`${r.local.lcpEl.slice(0, 160).replace(/`/g, "'")}\`` : ''}`),
      ...rows.filter((r) => r.local.failing).flatMap((r) => Object.entries(r.local.failing).filter(([, a]) => a.length).map(([cat, a]) => `\nLocal ${r.ff} ${cat} audits below 1:\n` + a.slice(0, 12).map((x) => `- \`${x.id}\` ${x.title} (score ${x.score}${x.display ? ', ' + x.display : ''})${x.items.length ? ': ' + x.items.map((i) => '`' + String(i).slice(0, 120).replace(/`/g, "'") + '`').join(', ') : ''}`).join('\n'))),
      notes.length ? '\n' + notes.map((n) => `- ${n}`).join('\n') : '',
      `\nJSON reports: \`${join(ctx.out, 'lighthouse-*.json')}\``,
      problems.length ? '\nProblems:\n' + problems.map((p) => `- ${p}`).join('\n') : '',
    ].join('\n');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: (problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more) | ` : ' | ') : '') + rows.map((r) => `${r.ff}: ${fmt(r.local)}`).join(' | ') + (notes.length ? ' (SEO N/A: noindex)' : ''), details: { rows: rows.map((r) => ({ ff: r.ff, local: r.local, ref: r.ref })), problems, notes }, md };
  },
};
