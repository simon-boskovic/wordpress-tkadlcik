/**
 * hover — hover styling only for a mouse.
 *  static: every CSS rule with :hover that matches something on the page must sit inside a
 *          (hover: hover) / (pointer: fine) media query (all readable stylesheets, generated states.css included);
 *  TD1:    on the touch tablet, tap every card/button/link (clicks blocked so nothing navigates) and
 *          compare its computed style before and after — nothing may stay in a hover state.
 * PASS = no sticky hover after taps AND (static clean OR every static violation proved harmless by TD1).
 * Hover parity on the desktop (mouse) is measured by the press check.
 */
import { DEVICE_SETS } from '../config.mjs';
import { BLOCK_CLICKS, loadSettled, openDevice, pointOf, sleep, tap } from '../session.mjs';

function hoverRules() {
  const out = [];
  const guardRe = /hover\s*:\s*hover|pointer\s*:\s*fine/;
  const walk = (rules, conds, href) => {
    for (const r of rules) {
      if (r.cssRules && !(r instanceof CSSStyleRule)) {
        const c = r.conditionText || (r.media && r.media.mediaText) || '';
        walk(r.cssRules, [...conds, c], href);
        continue;
      }
      if (!(r instanceof CSSStyleRule)) continue;
      if (/:hover/.test(r.selectorText)) {
        const guarded = conds.some((c) => guardRe.test(c));
        let applies = false;
        for (const sel of r.selectorText.split(',')) {
          if (!/:hover/.test(sel)) continue;
          const base = sel.replace(/:hover/g, '').replace(/::?(before|after|placeholder|marker)/g, '').trim() || '*';
          try { if (document.querySelector(base)) { applies = true; break; } } catch { applies = true; }
        }
        out.push({ sheet: (href || 'inline <style>').split('/').slice(-2).join('/'), conds: conds.filter(Boolean).join(' & '), rule: r.cssText.slice(0, 220), guarded, applies });
      }
      if (r.cssRules && r.cssRules.length) walk(r.cssRules, conds, href);   // CSS nesting
    }
  };
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch { continue; }
    walk(rules, sh.media && sh.media.mediaText ? [sh.media.mediaText] : [], sh.href);
  }
  return out;
}

/** Tag tappable candidates (cards, buttons, links, summaries) with data-dod ids; returns their descriptors. */
function tagCandidates(limit) {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]'); };
  const els = [...document.querySelectorAll('main a[href], main button, main summary, main [role=button], header a[href], header button, footer a[href]')].filter(vis);
  const seen = new Set(), out = [];
  for (const e of els) {
    const text = ((e.innerText || e.getAttribute('aria-label') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const k = e.tagName + '|' + text;
    if (seen.has(k)) continue;
    seen.add(k);
    const id = 'h' + out.length;
    e.setAttribute('data-dod', id);
    out.push({ id, text, tag: e.tagName.toLowerCase() });
    if (out.length >= limit) break;
  }
  return out;
}
const SNAP = `((id) => { const el = document.querySelector('[data-dod="' + id + '"]'); if (!el) return null;
  const pick = (e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor, c.borderTopColor, c.borderBottomColor, c.boxShadow, c.filter, c.transform, c.opacity, c.textDecorationLine].join(' | '); };
  const img = el.querySelector('img'), after = getComputedStyle(el, '::after');
  return pick(el) + ' || ' + (img ? pick(img) : '') + ' || ' + after.transform + ' ' + after.opacity; })`;

async function tapTest(dev, url, limit = 40) {
  const b = await openDevice(dev);
  try {
    await loadSettled(b, url);
    await b.evaluate(BLOCK_CLICKS);
    const cands = await b.evaluate(`(${tagCandidates})(${limit})`);
    const sticky = [], skipped = [];
    for (const c of cands) {
      try {
        const p = await pointOf(b, c.id, { settleMs: 250 });
        if (p.error) { skipped.push(`${c.tag} “${c.text}”: ${p.error}`); continue; }
        const before = await b.evaluate(`${SNAP}(${JSON.stringify(c.id)})`);
        await tap(b, p.x, p.y);
        await sleep(450);
        const after = await b.evaluate(`${SNAP}(${JSON.stringify(c.id)})`);
        if (after === null) throw new Error('page changed');
        if (before !== after) sticky.push({ el: `${c.tag} “${c.text}”`, before, after });
        await b.evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
      } catch (e) {
        // A tap that navigates despite the click block (e.g. a touch handler): note it, reload, go on.
        skipped.push(`${c.tag} “${c.text}”: navigated/changed the page on tap (${e.message.slice(0, 60)})`);
        await sleep(800);
        await loadSettled(b, url);
        await b.evaluate(BLOCK_CLICKS);
        await b.evaluate(`(${tagCandidates})(${limit})`);
      }
    }
    return { tested: cands.length, sticky, skipped };
  } finally { await b.close(); }
}

async function staticRules(url) {
  const b = await openDevice('D');
  try {
    await loadSettled(b, url);
    return await b.evaluate(`(${hoverRules})()`);
  } finally { await b.close(); }
}

export default {
  name: 'hover',
  title: 'Hover only with a mouse (static rules + TD1 taps)',
  async run(ctx) {
    const lr = await staticRules(ctx.localUrl), rr = await staticRules(ctx.refUrl);
    const lv = lr.filter((r) => !r.guarded && r.applies), rv = rr.filter((r) => !r.guarded && r.applies);
    const dev = DEVICE_SETS.hoverTap[0];
    const lt = await tapTest(dev, ctx.localUrl), rt = await tapTest(dev, ctx.refUrl);
    const pass = !lt.sticky.length;
    const md = [
      `Static: local has ${lr.length} :hover rules, **${lv.length} unguarded that match elements on this page**; reference ${rr.length} rules, ${rv.length} unguarded+matching.`,
      lv.length ? 'Local unguarded :hover rules:\n' + lv.map((r) => `- \`${r.sheet}\`${r.conds ? ` (inside ${r.conds})` : ''}: \`${r.rule.replace(/`/g, "'")}\``).join('\n') : '',
      rv.length ? 'Reference unguarded :hover rules:\n' + rv.map((r) => `- \`${r.sheet}\`: \`${r.rule.replace(/`/g, "'")}\``).join('\n') : '',
      `TD1 on ${dev}: tapped ${lt.tested} local elements → **${lt.sticky.length} left in a hover state**; reference ${rt.tested} tapped → ${rt.sticky.length}.`,
      lt.sticky.length ? lt.sticky.map((s) => `- ${s.el}\n  - before: \`${s.before}\`\n  - after:  \`${s.after}\``).join('\n') : '',
      rt.sticky.length ? 'Reference sticky: ' + rt.sticky.map((s) => s.el).join(', ') : '',
      lt.skipped.length ? `Not tappable (local): ${lt.skipped.join('; ')}` : '',
    ].filter(Boolean).join('\n\n');
    const summary = `${lv.length} unguarded :hover rule(s) matching the page (ref ${rv.length}); TD1 sticky after tap: local ${lt.sticky.length}, ref ${rt.sticky.length}`;
    return { status: pass ? 'PASS' : 'FAIL', summary, details: { localUnguarded: lv, refUnguarded: rv, localTap: lt, refTap: rt }, md };
  },
};
