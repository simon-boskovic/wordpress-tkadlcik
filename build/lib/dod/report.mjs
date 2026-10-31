/**
 * Report rendering. Every check result is stored on its own (<out>/<slug>/checks/<name>.json) so a
 * subset can be re-run (--checks=…) and the page report / site summary re-rendered from whatever is there.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const STATUS_ICON = { PASS: '✓', FAIL: '✗', 'N/A': '–', BLOCKED: 'B', SKIP: 's' };

export function saveResult(out, name, result) {
  const dir = join(out, 'checks');
  mkdirSync(dir, { recursive: true });
  const { md, ...rest } = result;
  writeFileSync(join(dir, `${name}.json`), JSON.stringify({ ...rest, md }, null, 1));
}

export function loadResults(out, order) {
  const dir = join(out, 'checks');
  if (!existsSync(dir)) return [];
  const byName = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return [f.slice(0, -5), JSON.parse(readFileSync(join(dir, f), 'utf8'))]; } catch { return [f.slice(0, -5), null]; }
  }).filter(([, v]) => v));
  return order.filter((n) => byName[n]).map((n) => byName[n]);
}

/**
 * The run a report describes: the given id, else the most recent run id among the results (a --summary
 * re-render). Results without a run id predate run ids and are never "current".
 */
export function currentRun(results, current) {
  if (current) return current;
  const latest = results.filter((r) => r.runId).sort((a, b) => String(a.run).localeCompare(String(b.run))).pop();
  return latest ? latest.runId : null;
}

/** A stored result from an earlier run (its check was not run in the current one). */
export const isStale = (r, run) => !run || r.runId !== run;

export function renderPage(out, meta, results, current) {
  const run = currentRun(results, current);
  const md = [
    `# DoD report — ${meta.slug}`, '',
    `- Local: ${meta.localUrl}`, `- Reference: ${meta.refUrl}`, `- Rendered: ${new Date().toISOString()}`, `- Run: ${run || '—'}`, `- Output: \`${out}\``, '',
    '| Check | Status | Summary | Run |', '|---|---|---|---|',
    ...results.map((r) => `| ${r.name} | **${r.status}**${isStale(r, run) ? ' (not run in this run — earlier result)' : ''} | ${String(r.summary).replace(/\|/g, '\\|').replace(/\n/g, ' ')} | ${(r.run || '').slice(0, 16)}${r.injected ? ' DIAGNOSTIC' : ''} |`), '',
    ...results.map((r) => `## ${r.name} — ${r.status}\n\n_${r.title}_ (${r.seconds}s${r.injected ? ', **DIAGNOSTIC: local CSS injected**' : ''})\n\n${r.md || ''}\n`),
  ].join('\n');
  writeFileSync(join(out, 'report.md'), md);
  writeFileSync(join(out, 'report.json'), JSON.stringify({ ...meta, results: results.map(({ md: _m, ...r }) => r) }, null, 1));
}

/** Site summary across pages × checks (docs-ready Markdown) + JSON. */
export function renderSummary(root, pages, order, current) {
  const rows = pages.map((p) => ({ ...p, results: loadResults(join(root, p.slug), order) }));
  const run = currentRun(rows.flatMap((r) => r.results), current);
  const used = order.filter((n) => rows.some((r) => r.results.some((x) => x.name === n)));
  // A result from an earlier run is shown in parentheses — "(✓)" means "not run in this run; last time it
  // passed" — so a subset re-run can never pass off stale ticks as current ones.
  const cell = (r, n) => { const x = r.results.find((y) => y.name === n); if (!x) return ' '; const i = STATUS_ICON[x.status] || x.status; return isStale(x, run) ? `(${i})` : i; };
  const vis = (r) => {
    const v = r.results.find((x) => x.name === 'visual');
    if (!v || !Array.isArray(v.details)) return '';
    return v.details.map((d) => `${d.device} ${(d.ratio * 100).toFixed(2)}%`).join(', ') + (isStale(v, run) ? ' (earlier run)' : '');
  };
  const counts = Object.fromEntries(used.map((n) => [n, rows.filter((r) => r.results.find((x) => x.name === n && x.status === 'FAIL' && !isStale(x, run))).length]));
  const md = [
    '# DoD — site summary (Radost v pohybu)', '',
    `Rendered ${new Date().toISOString()} for run ${run || '—'}. Legend: ✓ PASS · ✗ FAIL · – N/A · B BLOCKED (external) · s SKIP · (✓) etc. = not run in this run, status of an earlier run (stale). Per-page details: \`<slug>/report.md\`; side-by-side PNGs: \`<slug>/visual-<device>.png\` (reference | local | diff).`, '',
    `| Page | ${used.join(' | ')} |`, `|---|${used.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| [${r.slug}](${r.slug}/report.md) | ${used.map((n) => cell(r, n)).join(' | ')} |`),
    `| **pages failing** | ${used.map((n) => `**${counts[n]}**`).join(' | ')} |`, '',
    '## Visual diff per device', '', '| Page | Diff (M, T, TL, D gated; ML, XL recorded) |', '|---|---|',
    ...rows.map((r) => `| ${r.slug} | ${vis(r)} |`), '',
    '## Failing checks per page', '',
    ...rows.map((r) => {
      const cur = r.results.filter((x) => !isStale(x, run)), stale = r.results.filter((x) => isStale(x, run));
      const f = cur.filter((x) => x.status === 'FAIL' || x.status === 'BLOCKED');
      const staleLine = stale.length ? `\nNot run in this run (earlier results, not counted): ${stale.map((x) => `${x.name} ${x.status}`).join(', ')}\n` : '';
      if (!cur.length) return `### ${r.slug}\nNo check run in this run.\n${staleLine}`;
      return (f.length ? `### ${r.slug}\n` + f.map((x) => `- **${x.name}** ${x.status}: ${String(x.summary).replace(/\n/g, ' ')}`).join('\n') + '\n' : `### ${r.slug}\nAll checks run in this run pass.\n`) + staleLine;
    }),
  ].join('\n');
  writeFileSync(join(root, 'SUMMARY.md'), md);
  writeFileSync(join(root, 'summary.json'), JSON.stringify({ run, pages: rows.map((r) => ({ slug: r.slug, results: r.results.map((x) => ({ name: x.name, status: x.status, summary: x.summary, run: x.run, stale: isStale(x, run) })) })) }, null, 1));
  return { md, rows, rel: (p) => relative(root, p) };
}
