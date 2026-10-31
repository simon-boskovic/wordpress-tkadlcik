#!/usr/bin/env node
/**
 * Evidence generator for the DoD harness (docs/definition-of-done.md §8: "Doklady: screenshoty všech
 * stránek vedle schváleného designu (mobil, tablet, desktop)" + a test result).
 *
 * Reads `build/shots/dod/<slug>/{ref,local}-<device>.png`, `checks/*.json` and produces, under
 * `docs/verification/` (git-friendly, unlike build/shots which is huge and gitignored):
 *   - `screenshots/<slug>-<device>.jpg` — reference | local side by side, downscaled JPEG.
 *   - `dod-results.md` — Czech summary: run id, thresholds, the page × check table, the per-device
 *     visual-diff table, the Lighthouse table, and per-page links to the screenshots.
 *
 * Read-only against build/shots/dod — never writes there, so it is safe to run while the DoD harness
 * (node build/dod.mjs) is running or has run in another checkout/process. No npm dependencies: PNG
 * decode/compose reuses build/lib/png.mjs + build/lib/imgdiff.mjs; resize + JPEG encode is macOS `sips`
 * (skipped, with a clear message, when sips is unavailable — e.g. on non-macOS).
 *
 * Idempotent: rerunning replaces docs/verification/dod-results.md and every regenerated screenshot, and
 * removes screenshots for pages/devices that no longer exist in build/shots/dod (only when sips ran —
 * if sips is unavailable this run, existing screenshots are left alone rather than orphaned).
 *
 *   node build/dod-evidence.mjs [--root=build/shots/dod] [--out=docs/verification]
 *                               [--quality=32] [--max-width=1200] [--max-height=6000]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './lib/png.mjs';
import { sideBySide } from './lib/imgdiff.mjs';
import { loadResults, currentRun, isStale, STATUS_ICON } from './lib/dod/report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/** build/lib/dod/checks/index.mjs run order, mirrored here (not imported) to keep this script read-only
 *  and free of the checks' own side-imports (browser/tool discovery in cdp.mjs / tools.mjs). */
export const CHECK_ORDER = [
  'visual', 'console', 'overflow', 'reduced-motion', 'animations', 'hover', 'press', 'keyboard', 'targets',
  'seo', 'contrast', 'images', 'nojs', 'flash', 'crossbrowser', 'lighthouse',
];

/** DoD §8 device keys, mobil/tablet/desktop plus tablet-landscape when captured. */
export const EVIDENCE_DEVICES = ['M', 'T', 'TL', 'D'];
const DEVICE_LABEL = { M: 'mobil 390×844', T: 'tablet 820×1180', TL: 'tablet na šířku 1180×820', D: 'desktop 1440×900' };

const arg = (argv, n, d) => (argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');

/**
 * Scale (w, h) to fit within maxW × maxH, never upscaling. Single formula handles both the common case
 * (downscale to ~maxW wide) and the tall-page cap (maxH wins for very tall full-page captures).
 */
export function targetSize(w, h, maxW, maxH) {
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

export function discoverPages(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(root, d.name, 'checks')))
    .map((d) => d.name)
    .sort();
}

function sipsAvailable() {
  const r = spawnSync('sips', ['--help'], { stdio: 'ignore' });
  return !r.error && r.status === 0;
}

/** Compose ref | local (no diff panel) at full resolution, then downscale + JPEG-encode via sips. */
function makeScreenshot(refPath, localPath, outPath, tmpDir, { quality, maxWidth, maxHeight }) {
  const ref = decodePng(readFileSync(refPath));
  const local = decodePng(readFileSync(localPath));
  const composite = sideBySide(ref, local, null, 12);
  const tmpPng = join(tmpDir, `composite-${Math.random().toString(36).slice(2)}.png`);
  writeFileSync(tmpPng, encodePng(composite));
  const { w, h } = targetSize(composite.width, composite.height, maxWidth, maxHeight);
  try {
    const r = spawnSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), '-z', String(h), String(w), tmpPng, '--out', outPath], { stdio: ['ignore', 'ignore', 'pipe'] });
    if (r.status !== 0 || r.error) throw new Error(r.error ? r.error.message : (r.stderr || '').toString().trim() || `sips exited ${r.status}`);
  } finally {
    try { unlinkSync(tmpPng); } catch { /* best effort */ }
  }
}

function pct(r) { return (r * 100).toFixed(2) + '%'; }

function buildScreenshots(pages, root, outDir, opts) {
  const shotsDir = join(outDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  const sipsOk = sipsAvailable();
  const missing = [];
  const generated = new Map(); // slug -> Set(device) actually written (or already present, for the doc's links)
  const expectedNames = new Set();
  let tmpDir = null;
  if (sipsOk) tmpDir = mkdtempSync(join(tmpdir(), 'tk-dod-evidence-'));
  for (const slug of pages) {
    const dir = join(root, slug);
    const devs = new Set();
    for (const dev of EVIDENCE_DEVICES) {
      const refPath = join(dir, `ref-${dev}.png`), localPath = join(dir, `local-${dev}.png`);
      const haveRef = existsSync(refPath), haveLocal = existsSync(localPath);
      if (!haveRef && !haveLocal && dev === 'TL') continue; // TL is optional (recorded only on some runs)
      if (!haveRef || !haveLocal) { missing.push(`${slug} ${dev} (${!haveRef ? 'no ref' : ''}${!haveRef && !haveLocal ? '/' : ''}${!haveLocal ? 'no local' : ''})`); continue; }
      const outName = `${slug}-${dev}.jpg`;
      expectedNames.add(outName);
      if (!sipsOk) { if (existsSync(join(shotsDir, outName))) devs.add(dev); continue; }
      try {
        makeScreenshot(refPath, localPath, join(shotsDir, outName), tmpDir, opts);
        devs.add(dev);
      } catch (e) { missing.push(`${slug} ${dev} (sips failed: ${e.message})`); }
    }
    if (devs.size) generated.set(slug, devs);
  }
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  let removed = 0;
  if (sipsOk) {
    for (const f of readdirSync(shotsDir)) {
      if (f.endsWith('.jpg') && !expectedNames.has(f)) { unlinkSync(join(shotsDir, f)); removed++; }
    }
  }
  const files = readdirSync(shotsDir).filter((f) => f.endsWith('.jpg'));
  const totalBytes = files.reduce((s, f) => s + statSync(join(shotsDir, f)).size, 0);
  return { sipsOk, missing, generated, removed, totalBytes, fileCount: files.length, shotsDir };
}

function lighthouseRow(details, ff) {
  const row = details && Array.isArray(details.rows) ? details.rows.find((r) => r.ff === ff) : null;
  if (!row || !row.local) return null;
  const s = row.local.scores || {};
  return { a11y: s.accessibility, bp: s['best-practices'], seo: s.seo, perf: s.performance, lcp: row.local.lcpMs, cls: row.local.cls, tbt: row.local.tbtMs };
}

function buildResultsDoc(pages, root, run, opts, shotStats) {
  const pageResults = pages.map((slug) => ({ slug, results: loadResults(join(root, slug), CHECK_ORDER) }));
  const used = CHECK_ORDER.filter((n) => pageResults.some((p) => p.results.some((r) => r.name === n)));
  const cell = (p, n) => {
    const r = p.results.find((x) => x.name === n);
    if (!r) return ' ';
    if (isStale(r, run)) return '·';
    return STATUS_ICON[r.status] || r.status;
  };
  const counts = Object.fromEntries(used.map((n) => [n, pageResults.filter((p) => p.results.find((x) => x.name === n && x.status === 'FAIL' && !isStale(x, run))).length]));

  const anchor = (slug) => `#${slug}`;
  const checkTable = [
    `| Stránka | ${used.join(' | ')} |`, `|---|${used.map(() => '---').join('|')}|`,
    ...pageResults.map((p) => `| [${p.slug}](${anchor(p.slug)}) | ${used.map((n) => cell(p, n)).join(' | ')} |`),
    `| **stránek se selháním** | ${used.map((n) => `**${counts[n]}**`).join(' | ')} |`,
  ].join('\n');

  const visualTable = [
    '| Stránka | M | T | TL | D | ML (zaznamenáno) | XL (zaznamenáno) |', '|---|---|---|---|---|---|---|',
    ...pageResults.map((p) => {
      const v = p.results.find((r) => r.name === 'visual');
      if (!v) return `| ${p.slug} | – | – | – | – | – | – |`;
      const stale = isStale(v, run);
      const byDev = Object.fromEntries((Array.isArray(v.details) ? v.details : []).map((d) => [d.device, d]));
      const fmt = (dev) => { const d = byDev[dev]; if (!d) return '–'; return `${pct(d.ratio)}${d.pass ? '' : ' ✗'}${stale ? ' (jiný běh)' : ''}`; };
      return `| ${p.slug} | ${fmt('M')} | ${fmt('T')} | ${fmt('TL')} | ${fmt('D')} | ${fmt('ML')} | ${fmt('XL')} |`;
    }),
  ].join('\n');

  const lhHeader = '| Stránka | Forma | A11y | BP | SEO | Perf | LCP | CLS | TBT |';
  const lhRows = [];
  for (const p of pageResults) {
    const lh = p.results.find((r) => r.name === 'lighthouse');
    if (!lh) { lhRows.push(`| ${p.slug} | — | – | – | – | – | – | – | – |`); continue; }
    const stale = isStale(lh, run) ? ' *(jiný běh)*' : '';
    for (const ff of ['mobile', 'desktop']) {
      const r = lighthouseRow(lh.details, ff);
      if (!r) { lhRows.push(`| ${p.slug}${stale} | ${ff} | – | – | – | – | – | – | – |`); continue; }
      lhRows.push(`| ${p.slug}${stale} | ${ff} | ${r.a11y ?? '–'} | ${r.bp ?? '–'} | ${r.seo ?? '–'} | ${r.perf ?? '–'} | ${r.lcp != null ? Math.round(r.lcp) + ' ms' : '–'} | ${r.cls != null ? r.cls.toFixed(3) : '–'} | ${r.tbt != null ? Math.round(r.tbt) + ' ms' : '–'} |`);
    }
  }
  const lighthouseTable = [lhHeader, '|---|---|---|---|---|---|---|---|---|', ...lhRows].join('\n');

  const perPage = pageResults.map((p) => {
    const devs = shotStats.generated.get(p.slug);
    const links = devs && devs.size
      ? EVIDENCE_DEVICES.filter((d) => devs.has(d)).map((d) => `[${DEVICE_LABEL[d]}](screenshots/${p.slug}-${d}.jpg)`).join(' · ')
      : '_žádné screenshoty (viz seznam chybějících vstupů výše)_';
    const fails = p.results.filter((r) => !isStale(r, run) && (r.status === 'FAIL' || r.status === 'BLOCKED'));
    const failLines = fails.length ? fails.map((r) => `- **${r.name}** ${r.status}: ${String(r.summary).replace(/\n/g, ' ')}`).join('\n') : '_žádné selhání v posledním běhu._';
    return `### ${p.slug}\n\nScreenshoty (referenční design | lokální web): ${links}\n\n${failLines}\n`;
  }).join('\n');

  const missingBlock = shotStats.missing.length
    ? `\n> **Chybí ve vstupech** (build/shots/dod nemá potřebné PNG, screenshot nebyl vytvořen): ${shotStats.missing.join('; ')}\n`
    : '';
  const sipsBlock = !shotStats.sipsOk
    ? `\n> **sips nebyl nalezen** — screenshoty v \`docs/verification/screenshots/\` nebyly v tomto běhu přegenerovány (ponechány beze změny, pokud tam nějaké byly). \`sips\` je vestavěný nástroj macOS; na jiném systému tuto část evidence vygenerujte na Macu.\n`
    : '';

  return `# Definition of Done — doklady o testování (Radost v pohybu)

Vygenerováno \`node build/dod-evidence.mjs\` dne ${new Date().toISOString()} pro běh harness \`node build/dod.mjs\`: **${run || '— žádný běh se svým run id nenalezen (starší data předcházející run id)'}**.
Zdroj dat: \`build/shots/dod/\` (${pages.length} stránek). Co a jak se kontroluje: [docs/definition-of-done.md](../definition-of-done.md) (§2 Vzhled, §4 Kvalita a přístupnost, §8 Ověření a předání).

## Co bylo ověřeno

- **Zařízení** (DoD §8): mobil na výšku **M** (390×844), tablet na výšku **T** (820×1180) a na šířku **TL** (1180×820), desktop **D** (1440×900); mobil na šířku **ML** a velký monitor **XL** (1920×1080) jsou zaznamenány navíc, ale nejsou branou pro splnění (viz DoD §8 — vyžaduje mobil/tablet/desktop). Mobil a tablet emulují dotyk.
- **Vizuální shoda**: rozdíl proti schválenému designu (Claude Design prototyp) nejvýš **1 %** odlišných pixelů na M/T/TL/D.
- **Lighthouse** (mobil i desktop): Accessibility **100**, Best Practices **≥ 95**, SEO **100**, Performance (mobil) **≥ 90**; Core Web Vitals LCP **≤ 2,5 s**, CLS **< 0,05**.
- Dále konzole bez chyb/varování, overflow, omezený pohyb, animace, hover jen myší, stisk tlačítek, klávesnice, dotykové cíle, SEO, kontrast, obrázky, no-JS, přechody bez bílého záblesku, cross-browser smoke (viz sloupce tabulky níže — plný popis každé kontroly v \`docs/definition-of-done.md\` a \`build/lib/dod/checks/*.mjs\`).

**Známé SKIP body** (nejsou selhání tohoto webu, jsou to omezení prostředí):
- **crossbrowser SKIP** uvnitř sandboxu Claude Code: Playwright Firefox se v sandboxu nespustí; spouští se z běžného terminálu (\`node build/dod.mjs --checks=crossbrowser\`).

Legenda tabulky: ✓ PASS · ✗ FAIL · – N/A · B BLOCKED (externí) · s SKIP · **·** = výsledek pochází z jiného běhu harness (ignorován jako neaktuální, viz "poslední běh" výše). Prázdné pole = kontrola pro tuto stránku vůbec neproběhla.
${missingBlock}${sipsBlock}
Screenshoty: \`docs/verification/screenshots/<stránka>-<zařízení>.jpg\`, referenční design a lokální web vedle sebe (bez rozdílového panelu), JPEG q≈${opts.quality}, šířka do ~${opts.maxWidth}px (výška omezena na ${opts.maxHeight}px u velmi dlouhých stránek). Počet souborů: **${shotStats.fileCount}**, celková velikost: **${(shotStats.totalBytes / 1024 / 1024).toFixed(1)} MB**.

## Stránky × kontroly (poslední běh)

${checkTable}

## Vizuální rozdíl podle zařízení

${visualTable}

## Lighthouse (mobil + desktop)

${lighthouseTable}

## Screenshoty a selhání podle stránky

${perPage}
`;
}

async function main() {
  const argv = process.argv.slice(2);
  const root = resolve(REPO, arg(argv, 'root', 'build/shots/dod'));
  const outDir = resolve(REPO, arg(argv, 'out', 'docs/verification'));
  // Defaults picked empirically against the real build/shots/dod data (martinadamus: 25 pages × 4 devices): q60/1400px
  // gave ~36 MB total; q32/1200px gives ~17 MB (target ~20 MB) while staying legible (checked visually).
  const opts = { quality: Number(arg(argv, 'quality', '32')), maxWidth: Number(arg(argv, 'max-width', '1200')), maxHeight: Number(arg(argv, 'max-height', '6000')) };

  const pages = discoverPages(root);
  if (!pages.length) { console.error(`no page directories found under ${root} — run node build/dod.mjs first`); process.exit(1); }
  console.log(`${pages.length} pages found under ${root}`);

  mkdirSync(outDir, { recursive: true });
  const shotStats = buildScreenshots(pages, root, outDir, opts);
  if (!shotStats.sipsOk) console.warn('sips not found (expected on macOS only) — screenshots were not regenerated this run');
  else console.log(`screenshots: ${shotStats.fileCount} files, ${(shotStats.totalBytes / 1024 / 1024).toFixed(1)} MB total${shotStats.removed ? `, removed ${shotStats.removed} stale file(s)` : ''}`);
  if (shotStats.missing.length) console.warn(`missing inputs (no screenshot produced): ${shotStats.missing.join('; ')}`);

  const pageResultsForRun = pages.flatMap((slug) => loadResults(join(root, slug), CHECK_ORDER));
  const run = currentRun(pageResultsForRun, null);
  console.log(`latest run id: ${run || '(none found — all stored results predate run ids)'}`);

  const doc = buildResultsDoc(pages, root, run, opts, shotStats);
  writeFileSync(join(outDir, 'dod-results.md'), doc);
  console.log(`wrote ${join(outDir, 'dod-results.md')}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) main();
