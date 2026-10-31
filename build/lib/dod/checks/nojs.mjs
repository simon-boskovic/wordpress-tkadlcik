/**
 * nojs — DoD §4 "Bez JavaScriptu: obsah je čitelný a všechny odkazy fungují".
 *  readable: with JavaScript disabled the h1 is visible, no heading/paragraph/reveal target is left at
 *            opacity 0 or visibility hidden, and at least 90 % of the words visible with JS are visible;
 *  links:    every internal <a href> answers 200 (after at most 3 redirects), every #fragment exists in
 *            the no-JS DOM; tel:/mailto: are listed; external links are listed with their status (not gated:
 *            social sites often refuse bots).
 */
import { openBrowser } from '../../cdp.mjs';
import { visibleText } from '../probes.mjs';
import { words } from '../../textdiff.mjs';
import { loadSettled, openDevice } from '../session.mjs';

const cache = new Map();   // per process: header/footer links repeat on every page
async function status(url) {
  if (cache.has(url)) return cache.get(url);
  let u = url, s = 0, hops = 0;
  try {
    for (; hops <= 3; hops++) {
      const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      s = r.status;
      if (s >= 300 && s < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u).href; continue; }
      break;
    }
  } catch (e) { s = 'ERR ' + e.message.slice(0, 40); }
  const out = { status: s, hops, final: u };
  cache.set(url, out);
  return out;
}

function nojsProbe() {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const hiddenStyle = (e) => { for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const c = getComputedStyle(p); if (parseFloat(c.opacity) < 0.05 || c.visibility === 'hidden') return true; } return false; };
  const h1 = document.querySelector('h1');
  const hidden = [...document.querySelectorAll('main h1, main h2, main h3, main p, .reveal, .rise')].filter((e) => vis(e) && hiddenStyle(e)).map((e) => e.tagName.toLowerCase() + ' “' + e.textContent.trim().slice(0, 30) + '”');
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), abs: a.href, text: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30) }));
  const ids = new Set([...document.querySelectorAll('[id], a[name]')].map((e) => e.id || e.getAttribute('name')));
  const panels = [...document.querySelectorAll('[role=tabpanel]')].map((e) => ({ id: e.id, visible: vis(e) && !hiddenStyle(e) }));
  return { panels, h1: h1 ? { text: h1.textContent.trim(), visible: vis(h1) && !hiddenStyle(h1) } : null, hidden, links, ids: [...ids], js: document.documentElement.className };
}

export default {
  name: 'nojs',
  title: 'Without JavaScript: content readable, every link works',
  async run(ctx) {
    const b = await openBrowser({ width: 1440, height: 900, javascript: false });
    let p, noWords;
    try {
      await b.goto(ctx.localUrl, 800);
      p = await b.evaluate(`(${nojsProbe})()`);
      noWords = words((await b.evaluate(`(${visibleText})()`)).text).length;
    } finally { await b.close(); }
    const j = await openDevice('D');
    let jsWords;
    try { await loadSettled(j, ctx.localUrl); jsWords = words((await j.evaluate(`(${visibleText})()`)).text).length; } finally { await j.close(); }
    const problems = [];
    if (!p.h1 || !p.h1.visible) problems.push('h1 not visible without JS');
    if (p.hidden.length) problems.push(`${p.hidden.length} element(s) invisible without JS: ${p.hidden.slice(0, 5).join(', ')}`);
    const hiddenPanels = p.panels.filter((x) => !x.visible).map((x) => x.id);
    if (hiddenPanels.length) problems.push(`tab panel(s) hidden without JS: ${hiddenPanels.join(', ')} (both Praha and Zlín must show)`);
    if (noWords < jsWords * 0.9) problems.push(`only ${noWords}/${jsWords} visible words without JS`);
    const origin = new URL(ctx.localUrl).origin;
    const seen = new Map();
    for (const l of p.links) if (!seen.has(l.abs)) seen.set(l.abs, l);
    const rows = [];
    for (const l of seen.values()) {
      const h = l.href;
      if (/^(tel:|mailto:|sms:)/.test(h)) { rows.push({ ...l, kind: 'contact', ok: true, status: '—' }); continue; }
      if (h.startsWith('#')) { const ok = h === '#' || p.ids.includes(decodeURIComponent(h.slice(1))); rows.push({ ...l, kind: 'fragment', ok, status: ok ? 'target exists' : 'NO TARGET' }); continue; }
      const u = new URL(l.abs);
      if (u.origin !== origin) { rows.push({ ...l, kind: 'external', ok: null, status: '(not checked)' }); continue; }
      const s = await status(u.href.split('#')[0]);
      let ok = s.status === 200;
      let st = `${s.status}${s.hops ? ` after ${s.hops} redirect(s) → ${s.final}` : ''}`;
      if (ok && u.hash) {
        if (u.pathname === new URL(ctx.localUrl).pathname) { ok = p.ids.includes(decodeURIComponent(u.hash.slice(1))); st += ok ? ', fragment exists' : ', FRAGMENT MISSING'; }
      }
      rows.push({ ...l, kind: 'internal', ok, status: st });
    }
    const bad = rows.filter((r) => r.ok === false);
    for (const r of bad) problems.push(`link “${r.text}” ${r.href}: ${r.status}`);
    const md = [
      `- h1 without JS: ${p.h1 ? `“${p.h1.text}” visible ${p.h1.visible}` : 'none'}; visible words ${noWords} without JS vs ${jsWords} with JS; html class "${p.js}"`,
      `- links: ${rows.length} unique (${rows.filter((r) => r.kind === 'internal').length} internal, ${rows.filter((r) => r.kind === 'fragment').length} fragments, ${rows.filter((r) => r.kind === 'contact').length} tel/mailto, ${rows.filter((r) => r.kind === 'external').length} external not gated)`,
      bad.length ? '\n| Link | href | Result |\n|---|---|---|\n' + bad.map((r) => `| ${r.text} | ${r.href} | ${r.status} |`).join('\n') : '- every internal link answers 200 and every fragment exists',
      `- external: ${rows.filter((r) => r.kind === 'external').map((r) => r.href).join(', ') || 'none'}`,
      '', problems.length ? 'Problems:\n' + problems.map((x) => `- ${x}`).join('\n') : 'Readable without JavaScript; all links work.',
    ].join('\n');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : `readable (${noWords}/${jsWords} words), ${rows.filter((r) => r.kind === 'internal').length} internal links 200`, details: { p: { ...p, ids: undefined }, rows, noWords, jsWords, problems }, md };
  },
};
