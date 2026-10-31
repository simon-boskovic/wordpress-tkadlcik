/**
 * keyboard — Tab through the whole page on the desktop with real key events.
 *  - every visible focusable element is reached, in DOM order;
 *  - each stop shows a focus ring of exactly 2 px (DoD §4) in the focus colour --focus #8FD6CC (site.css `.site :focus-visible`);
 *  - the ring is not clipped: the outline box (border box + offset + width) must fit inside every
 *    ancestor that clips (overflow hidden/clip/auto/scroll) and inside the viewport horizontally;
 *  - focus never lands on something hidden (zero size, off-screen after scroll-into-view, opacity 0,
 *    visibility hidden, inside [inert] / aria-hidden) — except an opacity-0 element whose focus is shown by a
 *    visible ring on itself or its nearest visible ancestor within 2 levels (opacityFocusExemption).
 * The menu focus handling is covered by `node build/interact.mjs menu`; the Praha/Zlín tabs (roving tabindex:
 * only the selected tab is a Tab stop, the hidden panel is inert) by `interact.mjs tabs`.
 */
import { DEVICE_SETS, THRESHOLDS } from '../config.mjs';
import { loadSettled, openDevice, press, sleep } from '../session.mjs';

/**
 * R31.1 pure decision (mirrored inline inside the in-browser `focusProbe` below, which cannot import
 * this module since it is stringified and evaluated in the page — see the comment there). `chain` is
 * the focused element followed by up to its 2 nearest ancestors, each `{ outlineWidth, boxShadow }` as
 * read by `getComputedStyle` while the element is focused. Returns the nearest level with a visible
 * ring (`{ level: 0|1|2, kind: 'outline'|'box-shadow' }`), or null if none of the 3 nodes shows one.
 */
export function opacityFocusExemption(chain) {
  for (let level = 0; level < Math.min(3, chain.length); level++) {
    const node = chain[level];
    if (!node) continue;
    if (Number(node.outlineWidth) >= 2) return { level, kind: 'outline' };
    if (node.boxShadow && node.boxShadow !== 'none') return { level, kind: 'box-shadow' };
  }
  return null;
}

function tagFocusables() {
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, iframe, [tabindex], [contenteditable="true"]';
  const ok = (e) => {
    if (e.disabled || e.tabIndex < 0 || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden' || e.closest('[inert]')) return false;
    const d = e.closest('details');
    if (d && !d.open && !(e.tagName === 'SUMMARY' && e.parentElement === d)) return false;
    return true;
  };
  return [...document.querySelectorAll(sel)].filter(ok).map((e, i) => {
    e.setAttribute('data-dod-k', String(i));
    return { k: i, desc: e.tagName.toLowerCase() + ' “' + ((e.innerText || e.getAttribute('aria-label') || e.getAttribute('name') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 30) + '”' };
  });
}

function focusProbe() {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  let op = 1;
  for (let p = e; p && p.nodeType === 1; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity);
  const hidden = [];
  if (r.width < 2 || r.height < 2) hidden.push(`size ${Math.round(r.width)}×${Math.round(r.height)}`);
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) hidden.push('off-screen');
  if (cs.visibility === 'hidden') hidden.push('visibility hidden');
  if (e.closest('[inert]')) hidden.push('inside [inert]');
  if (e.closest('[aria-hidden="true"]')) hidden.push('inside aria-hidden');
  // R31.1: opacity 0 (e.g. the Proměny slider's native range input) is excused, not "hidden", when a
  // real focus indicator (outline >= 2px, or a box-shadow ring) shows on the element itself or its
  // nearest visible ancestor within 2 levels — mirrors opacityFocusExemption() below in pure form.
  let opacityExempt = null;
  if (op < 0.1) {
    let node = e;
    for (let level = 0; node && node.nodeType === 1 && level <= 2; node = node.parentElement, level++) {
      const ncs = getComputedStyle(node);
      const ringWidth = ncs.outlineStyle !== 'none' ? parseFloat(ncs.outlineWidth) : 0;
      if (ringWidth >= 2 || (ncs.boxShadow && ncs.boxShadow !== 'none')) {
        const cls = typeof node.className === 'string' && node.className.trim() ? '.' + node.className.trim().split(/\s+/)[0] : '';
        opacityExempt = {
          level, kind: ringWidth >= 2 ? 'outline' : 'box-shadow',
          desc: node.tagName.toLowerCase() + cls,
        };
        break;
      }
    }
    if (!opacityExempt) hidden.push('opacity ' + op.toFixed(2));
  }
  const ow = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) : 0, off = parseFloat(cs.outlineOffset) || 0;
  const ob = { l: r.left - off - ow, t: r.top - off - ow, r: r.right + off + ow, b: r.bottom + off + ow };
  const clippedBy = [];
  if (ow) {
    if (ob.l < -0.5 || ob.r > document.documentElement.clientWidth + 0.5) clippedBy.push('viewport');
    for (let p = e.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const pc = getComputedStyle(p);
      const cx = /hidden|clip|auto|scroll/.test(pc.overflowX), cy = /hidden|clip|auto|scroll/.test(pc.overflowY);
      if (!cx && !cy) continue;
      const pr = p.getBoundingClientRect();
      const bl = parseFloat(pc.borderLeftWidth), bt = parseFloat(pc.borderTopWidth), br = parseFloat(pc.borderRightWidth), bb = parseFloat(pc.borderBottomWidth);
      const cut = (cx && (ob.l < pr.left + bl - 0.5 || ob.r > pr.right - br + 0.5)) || (cy && (ob.t < pr.top + bt - 0.5 || ob.b > pr.bottom - bb + 0.5));
      if (cut) { clippedBy.push(p.tagName.toLowerCase() + (typeof p.className === 'string' && p.className.trim() ? '.' + p.className.trim().split(/\s+/)[0] : '') + ` (overflow ${pc.overflowX}/${pc.overflowY})`); break; }
    }
  }
  return {
    k: e.getAttribute('data-dod-k'),
    desc: e.tagName.toLowerCase() + ' “' + ((e.innerText || e.getAttribute('aria-label') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 30) + '”',
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`,
    width: ow, shadow: cs.boxShadow !== 'none' ? cs.boxShadow : '',
    color: cs.outlineColor, inHeader: !!e.closest('header'),
    focusVisible: e.matches(':focus-visible'),
    hidden, clippedBy, opacityExempt,
  };
}

async function tabRun(url) {
  const b = await openDevice(DEVICE_SETS.keyboard[0]);
  try {
    await loadSettled(b, url);
    const expected = await b.evaluate(`(${tagFocusables})()`);
    await b.evaluate(`(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); scrollTo(0, 0); })()`);
    const stops = [];
    for (let i = 0; i < Math.min(250, expected.length + 8); i++) {
      await press(b, 'Tab');
      await sleep(90);
      const s = await b.evaluate(`(${focusProbe})()`);
      if (!s) { if (stops.length) break; else continue; }
      if (stops.length && s.k != null && s.k === stops[0].k) break;   // wrapped around
      stops.push(s);
    }
    const allowed = () => THRESHOLDS.focusColors;
    const reached = new Set(stops.map((s) => s.k).filter((k) => k != null).map(Number));
    const missing = expected.filter((e) => !reached.has(e.k));
    const seq = stops.map((s) => (s.k == null ? null : Number(s.k))).filter((k) => k != null);
    const outOfOrder = [];
    for (let i = 1; i < seq.length; i++) if (seq[i] < seq[i - 1]) outOfOrder.push(`${expected[seq[i - 1]].desc} → ${expected[seq[i]].desc}`);
    return {
      expected: expected.length, stops: stops.length, missing: missing.map((m) => m.desc), outOfOrder,
      badWidth: stops.filter((s) => Math.abs(s.width - THRESHOLDS.focusOutline) > 0.5).map((s) => `${s.desc} (${s.outline}${s.shadow ? ', shadow ' + s.shadow : ''})`),
      badColor: stops.filter((s) => s.width && !allowed(s).includes(s.color)).map((s) => `${s.desc} (${s.color}, expected ${allowed(s).join(' or ')})`),
      clipped: stops.filter((s) => s.clippedBy.length).map((s) => `${s.desc} clipped by ${s.clippedBy.join(', ')}`),
      hidden: stops.filter((s) => s.hidden.length).map((s) => `${s.desc}: ${s.hidden.join(', ')}`),
      // R31.1: opacity-0 stops excused by a visible ring, reported for information with their evidence.
      opacityExcused: stops.filter((s) => s.opacityExempt).map((s) => `${s.desc}: opacity 0 excused by a ${s.opacityExempt.kind} ring on ${s.opacityExempt.level === 0 ? 'the element itself' : s.opacityExempt.level === 1 ? 'its parent' : 'its grandparent'} (${s.opacityExempt.desc})`),
      untracked: stops.filter((s) => s.k == null).map((s) => s.desc),
      colors: [...new Set(stops.filter((s) => s.width).map((s) => s.color))],
    };
  } finally { await b.close(); }
}

export default {
  name: 'keyboard',
  title: 'Keyboard: full Tab order; 2 px focus ring (--focus), never clipped',
  async run(ctx) {
    const parts = [], problems = [];
    for (const v of ctx.variants) {
      const lt = await tabRun(ctx.localUrl + v.suffix);
      const tag = v.suffix ? `${v.suffix}: ` : '';
      if (lt.missing.length) problems.push(`${tag}${lt.missing.length} focusable element(s) never reached: ${lt.missing.slice(0, 6).join(', ')}`);
      if (lt.outOfOrder.length) problems.push(`${tag}Tab order differs from DOM order: ${lt.outOfOrder.slice(0, 4).join('; ')}`);
      if (lt.badWidth.length) problems.push(`${tag}${lt.badWidth.length} stop(s) without a 2 px ring: ${lt.badWidth.slice(0, 5).join(', ')}`);
      if (lt.badColor.length) problems.push(`${tag}${lt.badColor.length} stop(s) with a ring not in the focus colour (--focus #8FD6CC): ${lt.badColor.slice(0, 5).join(', ')}`);
      if (lt.clipped.length) problems.push(`${tag}${lt.clipped.length} clipped ring(s): ${lt.clipped.slice(0, 5).join('; ')}`);
      if (lt.hidden.length) problems.push(`${tag}focus on hidden element(s): ${lt.hidden.slice(0, 5).join('; ')}`);
      parts.push(`- Local${v.suffix ? ' ' + v.suffix : ''} (D): ${lt.stops} Tab stops for ${lt.expected} focusables; missing ${lt.missing.length}; out of order ${lt.outOfOrder.length}; not 2 px ${lt.badWidth.length}; wrong colour ${lt.badColor.length}; clipped ${lt.clipped.length}; hidden ${lt.hidden.length}; ring colours ${lt.colors.join(', ')}`
        + (lt.untracked.length ? `\n  - stops on elements not in the expected list: ${lt.untracked.join(', ')}` : '')
        + (lt.opacityExcused.length ? `\n  - opacity 0 excused (R31.1, informational): ${lt.opacityExcused.join('; ')}` : '')
        + [['not 2 px', lt.badWidth], ['wrong colour', lt.badColor], ['clipped', lt.clipped], ['hidden', lt.hidden], ['never reached', lt.missing]].filter(([, a]) => a.length).map(([k, a]) => `\n  - ${k}: ${a.join('; ')}`).join(''));
    }
    const md = parts.join('\n') + '\n\n' + (problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'Every focusable reached in DOM order with an unclipped 2 px focus ring.');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : 'all focusables reached; 2 px focus ring, unclipped', details: { problems }, md };
  },
};
