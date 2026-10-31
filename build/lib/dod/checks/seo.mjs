/**
 * seo — DoD §4 "Struktura stránky" and §5 SEO on the local page (reference recorded alongside):
 *  K1 head: lang cs, self-referencing absolute canonical, title, description, og:title/description/image,
 *     favicon (site icon), theme-color #0E0F0E (dark-only);
 *  K2 structure: one <main>, one <h1>, no heading-level skips;
 *  K5 JSON-LD (on every page): parses; a business/organisation node with address + telephone, and a Person;
 *  plus `node build/verify.mjs --seo` (sitemap/robots/llms/search/user enumeration): for multi-page runs the
 *     orchestrator runs it once for all pages (<out>/_site/verify-seo.json, stamped with the run id), else
 *     per page here. A site-level failure or a crashed verify run fails the check on EVERY page.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOINDEX, PALETTE } from '../config.mjs';
import { loadSettled, openDevice } from '../session.mjs';

const BUILD = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function probe() {
  const q = (s) => document.querySelector(s);
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetParent || getComputedStyle(h).position === 'fixed');
  const skips = [];
  hs.reduce((p, h) => { const l = +h.tagName[1]; if (l > p + 1) skips.push(h.tagName + ': ' + h.textContent.trim().slice(0, 40)); return l; }, 0);
  return {
    k1: {
      lang: document.documentElement.lang,
      canonical: q('link[rel=canonical]')?.href || '',
      ogTitle: q('meta[property="og:title"]')?.content || '',
      ogDesc: q('meta[property="og:description"]')?.content || '',
      ogImage: q('meta[property="og:image"]')?.content || '',
      favicon: q('link[rel~=icon]')?.href || '',
      title: document.title,
      desc: q('meta[name=description]')?.content || '',
      robots: q('meta[name=robots]')?.content || '',
      themeColor: q('meta[name="theme-color"]')?.content || '',
    },
    k2: { mains: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length, skips },
    k5: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try { const j = JSON.parse(s.textContent); return { nodes: j['@graph'] || (Array.isArray(j) ? j : [j]) }; } catch (e) { return { error: e.message }; }
    }),
  };
}

const PAGE_SLUGS = readdirSync(join(BUILD, 'pages')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

/**
 * Interpret a shared verify.mjs --seo result for one page. Pure (exported for the unit tests).
 * Failure lines are "- <slug>: …" for pages and "- <anything else>: …" for site-level checks (sitemap,
 * robots.txt, llms.txt, search, /old-url/ 301s). Status 1 when this page failed, any site-level check
 * failed, or verify itself exited non-zero without saying why (crash, timeout, browser missing).
 */
export function interpretSharedVerify(v, slug, path, slugs = PAGE_SLUGS) {
  const lines = String(v.out || '').split('\n');
  const failLines = lines.filter((x) => /^- [^:\s]+:/.test(x));
  const mine = failLines.filter((x) => x.startsWith(`- ${slug}:`));
  const site = failLines.filter((x) => !slugs.some((s) => x.startsWith(`- ${s}:`)));
  const pageLine = lines.find((x) => x.endsWith(` ${path}`) && /^(ok|FAIL)/.test(x)) || '';
  const crashed = v.status !== 0 && !failLines.length;
  const siteOut = [...site.map((x) => `site-level: ${x.slice(2)}`), ...(crashed ? [`verify.mjs --seo exited ${v.status} without failure lines: ${lines.slice(-5).join(' ').slice(0, 400) || '(no output)'}`] : [])];
  return {
    status: mine.length || pageLine.startsWith('FAIL') || site.length || crashed ? 1 : 0,
    out: [pageLine || '(no page line)', ...mine, ...siteOut].join('\n'),
    siteOut: siteOut.join('\n'),
    cached: true,
  };
}

function verifyFor(ctx) {
  const cache = join(ctx.root, '_site', 'verify-seo.json');
  if (existsSync(cache)) {
    let v = null;
    try { v = JSON.parse(readFileSync(cache, 'utf8')); } catch { v = null; }
    // Only the shared run written by THIS dod run (same run id); anything older is ignored.
    if (v && ctx.runId && v.runId === ctx.runId) return interpretSharedVerify(v, ctx.slug, ctx.path);
  }
  const v = spawnSync(process.execPath, [join(BUILD, 'verify.mjs'), '--seo', `--only=${ctx.slug}`, `--base=${ctx.base}`], { encoding: 'utf8', timeout: 300000 });
  return { status: v.status, out: ((v.stdout || '') + (v.stderr || '')).trim(), cached: false };
}

export default {
  name: 'seo',
  title: 'Head (K1 + theme-color), structure (K2), JSON-LD (K5 fields), verify --seo',
  async run(ctx) {
    const b = await openDevice('D');
    let l, r;
    try {
      await loadSettled(b, ctx.localUrl); l = await b.evaluate(`(${probe})()`);
      await loadSettled(b, ctx.refUrl); r = await b.evaluate(`(${probe})()`);
    } finally { await b.close(); }
    const noindex = NOINDEX.includes(ctx.slug) || /noindex/.test(l.k1.robots);
    const k = l.k1, problems = [];
    if (!/^cs/.test(k.lang)) problems.push(`K1 lang="${k.lang}"`);
    if (!/^https?:\/\//.test(k.canonical) || k.canonical !== ctx.localUrl) problems.push(`K1 canonical "${k.canonical}" ≠ ${ctx.localUrl}`);
    for (const f of ['title', 'desc', 'ogTitle', 'ogDesc', 'ogImage', 'favicon']) if (!k[f]) problems.push(`K1 ${f} missing`);
    if (k.themeColor.toLowerCase() !== PALETTE.themeColor) problems.push(`theme-color "${k.themeColor}" ≠ ${PALETTE.themeColor}`);
    if (noindex) problems.push(`robots "${k.robots}": every page of this site is indexable`);
    if (l.k2.mains !== 1) problems.push(`K2 ${l.k2.mains} <main>`);
    if (l.k2.h1 !== 1) problems.push(`K2 ${l.k2.h1} <h1>`);
    if (l.k2.skips.length) problems.push(`K2 heading skips: ${l.k2.skips.join('; ')}`);
    const nodes = l.k5.flatMap((j) => j.nodes || []);
    if (!l.k5.length) problems.push('K5 no JSON-LD');
    for (const j of l.k5) if (j.error) problems.push(`K5 invalid JSON-LD: ${j.error}`);
    const types = nodes.flatMap((n) => [].concat(n['@type'] || []));
    const biz = nodes.find((n) => [].concat(n['@type'] || []).some((t) => /Business$|SportsActivityLocation|ExerciseGym|SportsClub|Organization/.test(t)));
    if (!biz) problems.push('K5 no business/organisation node');
    else for (const f of ['address', 'telephone']) if (!biz[f] && !(f === 'address' && biz.location)) problems.push(`K5 business node lacks ${f}`);
    if (!types.includes('Person')) problems.push('K5 no Person node');
    const v = verifyFor(ctx);
    if (v.status !== 0) problems.push(`verify.mjs --seo: ${v.out.split('\n').filter((x) => x.startsWith('- ') || x.startsWith('FAIL') || x.startsWith('site-level') || x.startsWith('verify.mjs')).slice(0, 5).join(' ') || v.out.split('\n').slice(-3).join(' ').slice(0, 300) || `exit ${v.status}`}`);
    const diffs = ['title', 'desc', 'ogTitle', 'ogDesc'].filter((f) => l.k1[f] !== r.k1[f]).map((f) => `${f}: ref “${r.k1[f]}” / local “${l.k1[f]}”`);
    const md = [
      '| | local | reference |', '|---|---|---|',
      ...Object.keys(k).map((f) => `| ${f} | ${String(l.k1[f]).replace(/\|/g, '\\|')} | ${String(r.k1[f]).replace(/\|/g, '\\|')} |`),
      `| K2 | main ${l.k2.mains}, h1 ${l.k2.h1}, skips ${l.k2.skips.length} | main ${r.k2.mains}, h1 ${r.k2.h1}, skips ${r.k2.skips.length} |`,
      `| JSON-LD types | ${types.join(', ')} | ${r.k5.flatMap((j) => (j.nodes || []).flatMap((n) => [].concat(n['@type'] || []))).join(', ')} |`,
      `| business node | ${biz ? ['@type', 'address', 'location', 'telephone', 'email', 'url'].map((f) => `${f} ${biz[f] ? '✓' : '✗'}`).join(', ') : '—'} | |`,
      '', `\`verify.mjs --seo\`${v.cached ? ' (shared run for all pages)' : ''}:`, '```', v.out.slice(-2500), '```',
      diffs.length ? '\nHead text differing from the reference (informational):\n' + diffs.map((d) => `- ${d}`).join('\n') : '',
      '', problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'Head, structure, JSON-LD and verify --seo pass.',
    ].join('\n');
    const status = problems.length ? 'FAIL' : 'PASS';
    return { status, summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : `K1/K2/K5 OK${noindex ? ' (noindex)' : ''}`, details: { local: l, ref: { k1: r.k1, k2: r.k2 }, noindex, verify: v, problems }, md };
  },
};
