#!/usr/bin/env node
/**
 * Curated subsets of the third-party CSS the pages print inline (theme assets/css/subsets/).
 *
 *   node build/css-subset.mjs [--base=http://localhost:8020]          regenerate subsets + manifest.json
 *   node build/css-subset.mjs --check [--base=URL]                    exit 1 when a subset is stale (source
 *                                                                     changed, or the pages now need a rule)
 *   node build/css-subset.mjs --report=wp-content/themes/tkadlcik/assets/css/site.css [--base=URL]
 *                                                                     list the rules of a local file that can
 *                                                                     match nothing (for a manual clean-up)
 *
 * Why: the pages are Elementor containers + HTML widgets with one Complianz banner, yet every page inlined all
 * of Elementor's frontend.min.css (~55 kB: widgets, sections, columns, lightbox, editor states …) and every
 * banner variant. The theme (inc/assets.php tk_css_subset()) prints the subset INSTEAD of a source only while
 * the source's sha1 still equals the one recorded here, so a plugin update or a re-saved banner silently falls
 * back to the full file (bigger, never broken) until this script is run again.
 *
 * What "unused" means (deterministic, see build/lib/css-subset.mjs): a rule is dropped only when no selector of
 * it, with pseudo-classes/elements removed and every name a script could add removed, matches an element of
 * any page below (all indexable pages + privacy + 404 + search, parsed with the browser's own DOMParser).
 * The script words come from the pages' own scripts (inline + same-origin src), so JS-added states
 * ([data-open], .js, tab/map/video/consent classes) always count as present.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './lib/cdp.mjs';
import { ROUTES } from './lib/routes.mjs';
import { buildSubset, collectSelectors, dynamicPredicate, parseCss, scriptWords, widenSelector } from './lib/css-subset.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'wp-content/themes/tkadlcik/assets/css/subsets');
const MANIFEST = join(OUT_DIR, 'manifest.json');

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? def;
const BASE = arg('base', process.env.TK_BASE || 'http://localhost:8020').replace(/\/$/, '');
const CHECK = process.argv.includes('--check');
const REPORT = arg('report', '');

/** The pages whose markup decides. */
export const PAGES = [...Object.keys(ROUTES), '/zasady-ochrany-osobnich-udaju/', '/tk-css-subset-404/', '/?s=tchaj'];

/**
 * The subsetted sources. `file` = path under wp-content/ (the key tk_css_subset() looks up); `inline` = a
 * handle whose inline `after` CSS (wp_add_inline_style) is replaced (text read from the page between the
 * tk-layer markers that tk_layer_inline_styles() puts around it).
 */
export const SOURCES = [
  { id: 'elementor-frontend', file: 'plugins/elementor/assets/css/frontend.min.css' },
  { id: 'elementor-frontend-inline', inline: 'elementor-frontend' }, // atomic-widget (v4) styles: forms, background video, accordion …
];
// Not subsetted (measured 2026-10-31): Complianz's banner-1-optin.css (generated for our one banner: 0 rules
// unused) and cookieblocker.min.css (−272 bytes); not worth a stale-subset risk.

/**
 * Names Complianz builds by concatenation ("cmplz-" + category / consent type), so they are not words of its
 * script: treated as present.
 */
export const DYNAMIC_EXTRA = ['cmplz-optin', 'cmplz-optout', 'cmplz-functional', 'cmplz-preferences', 'cmplz-statistics', 'cmplz-marketing', 'cmplz-soft-cookiewall', 'cmplz-show', 'cmplz-dismissed'];

const sha1 = (s) => createHash('sha1').update(s).digest('hex');

async function get(url) {
  // tk_nocache=full-css: the theme prints the full sources (no subsets) and the page cache bypasses (never stored).
  const r = await fetch(url, { headers: { 'Accept-Encoding': 'identity', Cookie: 'tk_nocache=full-css' } });
  return { status: r.status, text: await r.text() };
}

/** Inline `after` CSS of a handle as PHP joins it (implode("\n", …)), from the printed page. */
export function inlineAfter(html, handle) {
  const m = new RegExp(`<style id=["']${handle}-inline-css["']>\\n@layer tk\\{/\\*tk-layer\\*/\\n([\\s\\S]*?)\\n/\\*tk-layer\\*/\\}`).exec(html);
  return m ? m[1] : null;
}

async function main() {
  const pages = [];
  for (const p of PAGES) {
    const { status, text } = await get(BASE + p);
    if (!/^(200|404)$/.test(String(status))) throw new Error(`${p}: HTTP ${status}`);
    pages.push({ path: p, html: text });
  }

  // Script words: every inline script (not JSON-LD) and every same-origin script file the pages load.
  const scripts = new Set();
  const srcs = new Set();
  for (const { html } of pages) {
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(m[1])) continue;
      if (m[2].trim()) scripts.add(m[2]);
      const src = /\bsrc=["']([^"']+)/.exec(m[1])?.[1];
      if (src && src.startsWith(BASE)) srcs.add(src);
    }
  }
  for (const src of srcs) scripts.add((await get(src)).text);
  const isDynamic = dynamicPredicate(scriptWords([...scripts]), DYNAMIC_EXTRA);

  // Sources.
  const front = pages[0].html;
  const sources = [];
  if (REPORT) {
    const text = readFileSync(join(ROOT, REPORT), 'utf8');
    sources.push({ id: 'report', key: REPORT, text });
  } else {
    for (const s of SOURCES) {
      if (s.file) {
        const { status, text } = await get(`${BASE}/wp-content/${s.file}`);
        if (status !== 200) throw new Error(`${s.file}: HTTP ${status}`);
        sources.push({ ...s, key: s.file, text });
      } else {
        const text = inlineAfter(front, s.inline);
        if (text === null) throw new Error(`inline CSS of ${s.inline} not found on ${PAGES[0]} (are the cascade layers on?)`);
        sources.push({ ...s, key: `inline:${s.inline}`, text });
      }
    }
  }

  // Widen every selector; match the distinct widened ones in a real DOM.
  const widened = new Map();
  for (const src of sources) {
    src.items = parseCss(src.text);
    for (const sel of collectSelectors(src.text, src.items)) widened.set(sel, widenSelector(sel, isDynamic));
  }
  const queries = [...new Set([...widened.values()].filter(Boolean))];
  const browser = await openBrowser({ consent: 'fresh' });
  let matched;
  try {
    await browser.goto('about:blank', 0);
    matched = await browser.evaluate(`(() => {
      const pages = ${JSON.stringify(pages.map((p) => p.html))};
      const qs = ${JSON.stringify(queries)};
      const docs = pages.map((h) => new DOMParser().parseFromString(h, 'text/html'));
      return qs.map((q) => { try { return docs.some((d) => d.querySelector(q)); } catch { return 'invalid'; } });
    })()`);
  } finally {
    await browser.close();
  }
  const hit = new Map(queries.map((q, i) => [q, matched[i]]));
  const keepRule = (sels) => sels.some((s) => { const w = widened.get(s); return w === null || w === undefined || hit.get(w) !== false; });
  const words = isDynamic;
  const keepKeyframes = (name, kept) => !name || new RegExp(`(^|[^\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w-])`).test(kept) || words('type', name);

  if (REPORT) {
    const { dropped } = buildSubset(sources[0].text, sources[0].items, keepRule, keepKeyframes);
    console.log(dropped.length ? dropped.join('\n') : '(nothing unused)');
    return;
  }

  const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { sources: {} };
  const manifest = { generator: 'build/css-subset.mjs', note: 'Generated; do not edit. The theme uses a subset only while the source sha1 matches.', sources: {} };
  mkdirSync(OUT_DIR, { recursive: true });
  let stale = 0;
  for (const src of sources) {
    const { css, dropped } = buildSubset(src.text, src.items, keepRule, keepKeyframes);
    const file = `${src.id}.css`;
    const entry = { sha1: sha1(src.text), subset: file, bytes: Buffer.byteLength(src.text), subsetBytes: Buffer.byteLength(css), droppedRules: dropped.length };
    manifest.sources[src.key] = entry;
    const pct = Math.round((1 - entry.subsetBytes / entry.bytes) * 100);
    if (CHECK) {
      const was = old.sources[src.key];
      const cur = existsSync(join(OUT_DIR, file)) ? readFileSync(join(OUT_DIR, file), 'utf8') : null;
      const ok = was && was.sha1 === entry.sha1 && cur === css;
      if (!ok) stale++;
      console.log(`${ok ? 'ok   ' : 'STALE'} ${src.key}${!was ? ' (not in manifest)' : was.sha1 !== entry.sha1 ? ' (source changed: the full file is served)' : cur !== css ? ' (the pages need a different subset)' : ''}`);
    } else {
      writeFileSync(join(OUT_DIR, file), css);
      console.log(`${src.key}: ${entry.bytes} → ${entry.subsetBytes} bytes (−${pct} %, ${dropped.length} rules dropped) → ${relative(ROOT, join(OUT_DIR, file))}`);
    }
  }
  if (CHECK) {
    if (stale) { console.log(`${stale} stale subset(s): run node build/css-subset.mjs --base=${BASE}`); process.exit(1); }
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
