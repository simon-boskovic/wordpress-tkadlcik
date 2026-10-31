/**
 * press — FAQ/details and button press states, measured with real input on reference and local.
 *  details: every visible <details> opens and closes by mouse click (D), by tap (M), and by keyboard
 *           (Enter opens, Space closes on the focused summary); count must match the reference.
 *  buttons: on D, mouse over each button/card (hover style), hold the button down (press style), release
 *           elsewhere (clicks blocked). Where the reference has a press effect, local must have the same scale.
 *  Hover-style differences between reference and local are listed (informational).
 */
import { DEVICE_SETS, THRESHOLDS } from '../config.mjs';
import { BLOCK_CLICKS, UNBLOCK_CLICKS, loadSettled, mouse, openDevice, pointOf, press, sleep, tap } from '../session.mjs';

function tagDetails() {
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  return [...document.querySelectorAll('details')].filter(vis).map((d, i) => {
    const s = d.querySelector('summary');
    if (!s) return null;
    s.setAttribute('data-dod', 's' + i);
    d.setAttribute('data-dod-d', 'd' + i);
    return { id: 's' + i, d: 'd' + i, q: s.innerText.trim().replace(/\s+/g, ' ').slice(0, 50), open: d.open };
  }).filter(Boolean);
}
const detState = (b, d) => b.evaluate(`(() => { const d = document.querySelector('[data-dod-d="${d}"]'); return { open: d.open, h: Math.round(d.getBoundingClientRect().height) }; })()`);

async function detailsRun(dev, url, keyboard) {
  const b = await openDevice(dev);
  try {
    await loadSettled(b, url);
    const list = await b.evaluate(`(${tagDetails})()`);
    const res = [];
    for (const it of list) {
      const r = { q: it.q, initiallyOpen: it.open };
      const act = async () => { const p = await pointOf(b, it.id); if (p.error) throw new Error(p.error); if (b.dev.touch) await tap(b, p.x, p.y); else { await mouse(b, 'mouseMoved', p.x, p.y); await mouse(b, 'mousePressed', p.x, p.y); await mouse(b, 'mouseReleased', p.x, p.y); } await sleep(450); };
      try {
        const s0 = await detState(b, it.d);
        await act(); const s1 = await detState(b, it.d);
        await act(); const s2 = await detState(b, it.d);
        r.clickOpen = !s0.open && s1.open && s1.h > s0.h;
        r.clickClose = s1.open && !s2.open;
        if (keyboard) {
          await b.evaluate(`document.querySelector('[data-dod="${it.id}"]').focus()`);
          await press(b, 'Enter'); await sleep(450); const k1 = await detState(b, it.d);
          await press(b, 'Space'); await sleep(450); const k2 = await detState(b, it.d);
          r.enterOpen = k1.open && k1.h > s0.h; r.spaceClose = !k2.open;
        }
      } catch (e) { r.error = e.message; }
      r.ok = !r.error && r.clickOpen && r.clickClose && (!keyboard || (r.enterOpen && r.spaceClose));
      res.push(r);
    }
    return res;
  } finally { await b.close(); }
}

function tagButtons(limit) {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]'); };
  const seen = new Map(), out = [];
  for (const e of document.querySelectorAll('main a[href], main button, header a[href], header button')) {
    if (!vis(e)) continue;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (parseFloat(cs.borderTopLeftRadius) < 6 || r.height < 36) continue;
    let text = ((e.innerText || e.getAttribute('aria-label') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const n = (seen.get(text) || 0) + 1; seen.set(text, n);
    if (n > 1) text += ` #${n}`;
    const id = 'b' + out.length;
    e.setAttribute('data-dod', id);
    out.push({ id, text, radius: parseFloat(cs.borderTopLeftRadius) });
    if (out.length >= limit) break;
  }
  return out;
}
const BSNAP = `((id) => { const el = document.querySelector('[data-dod="' + id + '"]'); const c = getComputedStyle(el); const m = new DOMMatrix(c.transform === 'none' ? undefined : c.transform);
  const img = el.querySelector('img'); const mi = img ? new DOMMatrix(getComputedStyle(img).transform === 'none' ? undefined : getComputedStyle(img).transform) : null;
  return { scale: Math.round(Math.hypot(m.a, m.b) * 1000) / 1000, ty: Math.round(m.f * 10) / 10, imgScale: mi ? Math.round(Math.hypot(mi.a, mi.b) * 1000) / 1000 : null, color: c.color, bg: c.backgroundColor, border: c.borderTopColor, filter: c.filter }; })`;

async function buttonsRun(url) {
  const b = await openDevice(DEVICE_SETS.press[0]);
  try {
    await loadSettled(b, url);
    await b.evaluate(BLOCK_CLICKS);
    const list = await b.evaluate(`(${tagButtons})(40)`);
    const out = [];
    for (const it of list) {
      const p = await pointOf(b, it.id, { settleMs: 200 });
      if (p.error) { out.push({ text: it.text, error: p.error }); continue; }
      await mouse(b, 'mouseMoved', 2, 2); await sleep(300);
      const base = await b.evaluate(`${BSNAP}(${JSON.stringify(it.id)})`);
      await mouse(b, 'mouseMoved', p.x, p.y); await sleep(350);
      const hover = await b.evaluate(`${BSNAP}(${JSON.stringify(it.id)})`);
      await mouse(b, 'mousePressed', p.x, p.y); await sleep(260);
      const down = await b.evaluate(`${BSNAP}(${JSON.stringify(it.id)})`);
      await mouse(b, 'mouseMoved', 2, 2); await mouse(b, 'mouseReleased', 2, 2); await sleep(200);
      out.push({ text: it.text, radius: it.radius, base, hover, down });
    }
    await b.evaluate(UNBLOCK_CLICKS);
    return out;
  } finally { await b.close(); }
}

const hoverSig = (x) => (x.base && x.hover ? ['color', 'bg', 'border', 'filter', 'ty', 'imgScale'].filter((k) => x.base[k] !== x.hover[k]).map((k) => `${k}: ${x.hover[k]}`).join(', ') || 'none' : '?');

export default {
  name: 'press',
  title: 'FAQ opens/closes (click, tap, keyboard); button press states',
  async run(ctx) {
    const [dDev] = DEVICE_SETS.press, [mDev] = DEVICE_SETS.faqTouch;
    const ld = await detailsRun(dDev, ctx.localUrl, true), rd = await detailsRun(dDev, ctx.refUrl, true);
    const lm = await detailsRun(mDev, ctx.localUrl, false), rm = await detailsRun(mDev, ctx.refUrl, false);
    const lb = await buttonsRun(ctx.localUrl), rb = await buttonsRun(ctx.refUrl);
    const problems = [];
    if (ld.length !== rd.length) problems.push(`details count: ref ${rd.length}, local ${ld.length}`);
    for (const r of ld) if (!r.ok) problems.push(`${dDev} “${r.q}”: ${r.error || JSON.stringify({ clickOpen: r.clickOpen, clickClose: r.clickClose, enterOpen: r.enterOpen, spaceClose: r.spaceClose })}`);
    for (const r of lm) if (!r.ok) problems.push(`${mDev} tap “${r.q}”: ${r.error || JSON.stringify({ tapOpen: r.clickOpen, tapClose: r.clickClose })}`);
    const pairs = [];
    for (const r of rb) {
      const l = lb.find((x) => x.text === r.text);
      pairs.push({ text: r.text, ref: r, local: l });
      if (!l || l.error || r.error) continue;
      const refPress = r.down.scale < 0.995;
      if (refPress && Math.abs(r.down.scale - l.down.scale) > THRESHOLDS.pressScaleTolerance) problems.push(`press “${r.text}”: ref scale ${r.down.scale}, local ${l.down.scale}`);
    }
    const hoverDiffs = pairs.filter((p) => p.local && !p.local.error && !p.ref.error && hoverSig(p.ref) !== hoverSig(p.local));
    const md = [
      `Details on ${dDev}: ${ld.filter((r) => r.ok).length}/${ld.length} local OK (reference ${rd.filter((r) => r.ok).length}/${rd.length}); tap on ${mDev}: ${lm.filter((r) => r.ok).length}/${lm.length} local OK (reference ${rm.filter((r) => r.ok).length}/${rm.length}).`,
      '', '| Button / card | ref press scale | local press scale | ref hover | local hover |', '|---|---|---|---|---|',
      ...pairs.map((p) => `| ${p.text} | ${p.ref.error ? p.ref.error : p.ref.down.scale} | ${!p.local ? 'not found' : p.local.error ? p.local.error : p.local.down.scale} | ${hoverSig(p.ref)} | ${p.local ? hoverSig(p.local) : ''} |`),
      ...lb.filter((l) => !rb.find((r) => r.text === l.text)).map((l) => `| ${l.text} (local only) | | ${l.error || l.down.scale} | | ${hoverSig(l)} |`),
      '', problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'All details toggle by click, tap and keyboard; press scales match the reference.',
      hoverDiffs.length ? `\nHover styles differ from the reference on ${hoverDiffs.length} element(s) (informational, see table).` : '',
    ].join('\n');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : `${ld.length} FAQ items OK (click/tap/Enter/Space), ${pairs.filter((p) => p.ref.down && p.ref.down.scale < 0.995).length} press states match`, details: { ld, rd, lm, rm, lb, rb, problems }, md };
  },
};
