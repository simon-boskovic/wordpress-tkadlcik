/**
 * visual — full-page screenshots of reference and local at each device, compared pixel by pixel.
 * Also hands the console/network logs of the same loads to the console check (ctx.shared.logs).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePng, crop } from '../../png.mjs';
import { compareImages, diffBands, sideBySide } from '../../imgdiff.mjs';
import { DEVICE_SETS, THRESHOLDS } from '../config.mjs';
import { capturePage, openDevice } from '../session.mjs';

const pct = (r) => (r * 100).toFixed(2) + '%';

/** Block of a layout containing document y. */
function blockAt(layout, y) {
  const b = layout.blocks.filter((x) => y >= x.y && y < x.y + x.h).pop();
  return b ? `${b.kind}${b.heading ? ` “${b.heading}”` : ''}` : (y >= layout.docH ? 'below page end' : 'between blocks');
}
/** Smallest labelled element containing (x, y). */
function elementAt(layout, x, y) {
  let best = null;
  for (const e of layout.elements) if (x >= e.x && x < e.x + e.w && y >= e.y && y < e.y + e.h && (!best || e.w * e.h < best.w * best.h)) best = e;
  return best ? `${best.tag}${best.text ? ` “${best.text}”` : ''}` : '—';
}
/** Horizontal centroid of differing pixels in rows y0..y1 of the heat map (red or magenta). */
function centroidX(heat, y0, y1) {
  let sx = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < heat.width; x++) {
    const o = (y * heat.width + x) * 4;
    if (heat.data[o] === 255 && heat.data[o + 1] === 0) { sx += x; n++; }
  }
  return n ? Math.round(sx / n) : Math.round(heat.width / 2);
}

/** Per-block comparison with each block cropped at its own y on both sides (isolates shifts from real changes). */
function blockDiffs(ref, loc) {
  const rb = ref.layout.blocks, lb = loc.layout.blocks, out = [];
  for (let i = 0; i < Math.max(rb.length, lb.length); i++) {
    const a = rb[i], b = lb[i];
    if (!a || !b) { out.push({ kind: (a || b).kind, missingOn: a ? 'local' : 'reference' }); continue; }
    // capturePage caps a capture at 16 000 px (`truncated`): a block that starts below the captured area
    // (very long pages, e.g. Proměny on a phone) has nothing to compare — record it instead of cropping a
    // negative height. The full-page ratio above still covers everything that was captured.
    if (a.y >= ref.img.height || b.y >= loc.img.height) { out.push({ kind: a.kind === b.kind ? a.kind : `${a.kind}/${b.kind}`, heading: a.heading || b.heading, refY: a.y, refH: a.h, locY: b.y, locH: b.h, beyondCapture: true }); continue; }
    const w = Math.min(ref.img.width, loc.img.width);
    const ca = crop(ref.img, 0, a.y, w, Math.min(a.h, ref.img.height - a.y));
    const cb = crop(loc.img, 0, b.y, w, Math.min(b.h, loc.img.height - b.y));
    const d = compareImages(ca, cb, { threshold: THRESHOLDS.pixelThreshold, heatmap: false });
    out.push({ kind: a.kind === b.kind ? a.kind : `${a.kind}/${b.kind}`, heading: a.heading || b.heading, refY: a.y, refH: a.h, locY: b.y, locH: b.h, ratio: d.ratio });
  }
  return out;
}

export default {
  name: 'visual',
  title: 'Visual parity (≤ 1 % differing pixels at 390/820/1180/1440; ML, XL recorded)',
  async run(ctx) {
    const devices = ctx.opts.devices || [...DEVICE_SETS.visual, ...DEVICE_SETS.visualRecorded];
    const gated = (dev) => DEVICE_SETS.visual.includes(dev);
    const results = [];
    ctx.shared.logs = ctx.shared.logs || {};
    ctx.shared.settle = ctx.shared.settle || {};
    for (const dev of devices) {
      const b = await openDevice(dev);
      try {
        const ref = await capturePage(b, ctx.refUrl);
        const loc = ctx.opts.self ? await capturePage(b, ctx.refUrl) : await capturePage(b, ctx.localUrl, { injectCss: ctx.opts.injectCss });
        ctx.shared.logs[dev] = { ref: ref.log, local: loc.log };
        ctx.shared.settle[dev] = { ref: ref.settle, local: loc.settle };
        let locSelf = null, locSelfBands = null;
        if (ctx.opts.self) {
          // Sanity mode: reference vs reference above; local vs local here.
          const l1 = await capturePage(b, ctx.localUrl), l2 = await capturePage(b, ctx.localUrl);
          const ds = compareImages(l1.img, l2.img, { threshold: THRESHOLDS.pixelThreshold });
          locSelf = ds.ratio;
          writeFileSync(join(ctx.out, `self-local-${dev}.png`), encodePng(sideBySide(l1.img, l2.img, ds.heat)));
          locSelfBands = diffBands(ds.rows).slice(0, 5).map((band) => ({ ...band, el: elementAt(l1.layout, centroidX(ds.heat, band.y0, band.y1), Math.round((band.y0 + band.y1) / 2)) }));
        }
        const d = compareImages(ref.img, loc.img, { threshold: THRESHOLDS.pixelThreshold });
        const bands = diffBands(d.rows).slice(0, 8).map((band) => {
          const ym = Math.round((band.y0 + band.y1) / 2), xc = centroidX(d.heat, band.y0, band.y1);
          return { ...band, share: d.diff ? band.pixels / d.diff : 0, x: xc, refBlock: blockAt(ref.layout, ym), locBlock: blockAt(loc.layout, ym), refEl: elementAt(ref.layout, xc, ym), locEl: elementAt(loc.layout, xc, ym) };
        });
        let firstDiffY = -1;
        for (let y = 0; y < d.rows.length; y++) if (d.rows[y] >= 3) { firstDiffY = y; break; }
        const file = join(ctx.out, `visual-${dev}.png`);
        writeFileSync(file, encodePng(sideBySide(ref.img, loc.img, d.heat)));
        writeFileSync(join(ctx.out, `ref-${dev}.png`), ref.png);
        writeFileSync(join(ctx.out, `local-${dev}.png`), loc.png);
        // Close-ups of the largest bands (reference | local | heat), ±40 px context, max 900 px tall.
        const crops = [];
        bands.slice(0, 4).forEach((band, i) => {
          const y0 = Math.max(0, band.y0 - 40), h = Math.min(900, band.y1 - band.y0 + 81);
          const f = join(ctx.out, `visual-${dev}-band${i + 1}.png`);
          writeFileSync(f, encodePng(sideBySide(crop(ref.img, 0, y0, ref.img.width, h), crop(loc.img, 0, y0, loc.img.width, h), crop(d.heat, 0, y0, d.heat.width, h))));
          crops.push(f);
        });
        results.push({
          device: dev, ratio: d.ratio, diff: d.diff, aa: d.aa, missing: d.missing, total: d.total,
          refH: ref.docH, locH: loc.docH, truncated: ref.truncated || loc.truncated, firstDiffY, bands,
          blocks: blockDiffs(ref, loc), file, crops, locSelf, locSelfBands,
          refSettle: ref.settle, locSettle: loc.settle, running: { ref: ref.runningAfterFreeze, local: loc.runningAfterFreeze },
          gated: gated(dev), pass: d.ratio <= THRESHOLDS.visualMaxRatio,
        });
      } finally { await b.close(); }
    }
    const gatedRun = results.filter((r) => r.gated);
    const pass = gatedRun.length > 0 && gatedRun.every((r) => r.pass);
    const summary = results.map((r) => `${r.device} ${pct(r.ratio)}${r.gated ? '' : ' (rec.)'}`).join(' · ');
    const md = [
      '| Device | Diff | Ref height | Local height | First diff y | Side-by-side |', '|---|---|---|---|---|---|',
      ...results.map((r) => `| ${r.device}${r.gated ? '' : ' (recorded, not gated)'} | **${pct(r.ratio)}** ${r.pass ? '✓' : '✗'}${r.locSelf != null ? ` (local vs local ${pct(r.locSelf)})` : ''} | ${r.refH} | ${r.locH} (${r.locH - r.refH >= 0 ? '+' : ''}${r.locH - r.refH}) | ${r.firstDiffY} | \`${r.file}\` |`),
      '',
      ...results.map((r) => [
        `#### ${r.device}: where the differences are`,
        r.bands.length ? '| y range | px | share | reference block / element | local block / element |\n|---|---|---|---|---|\n' + r.bands.map((b) => `| ${b.y0}–${b.y1} | ${b.pixels} | ${(b.share * 100).toFixed(0)}% | ${b.refBlock} / ${b.refEl} | ${b.locBlock} / ${b.locEl} |`).join('\n') : 'No difference bands.',
        '',
        'Per block, each cropped at its own top (a shift above does not count here):',
        '',
        '| Block | ref y/h | local y/h | Δh | diff |\n|---|---|---|---|---|\n' + r.blocks.map((b) => (b.missingOn ? `| ${b.kind} | missing on ${b.missingOn} | | | |` : `| ${b.kind}${b.heading ? ` “${b.heading}”` : ''} | ${b.refY}/${b.refH} | ${b.locY}/${b.locH} | ${b.locH - b.refH} | ${b.beyondCapture ? 'below the 16 000 px capture' : pct(b.ratio)} |`)).join('\n'),
        '',
        r.locSelfBands && r.locSelfBands.length ? 'Local vs local bands: ' + r.locSelfBands.map((b) => `${b.y0}–${b.y1} (${b.pixels} px, ${b.el})`).join('; ') : '',
        r.crops.length ? 'Close-ups: ' + r.crops.map((c) => `\`${c}\``).join(', ') : '',
        (r.refSettle.broken.length || r.locSettle.broken.length) ? `Broken images — ref: ${r.refSettle.broken.join(', ') || 'none'}; local: ${r.locSettle.broken.join(', ') || 'none'}` : '',
        (r.refSettle.hiddenReveal || r.locSettle.hiddenReveal) ? `Reveal targets still hidden after the scroll-through — ref ${r.refSettle.hiddenReveal}, local ${r.locSettle.hiddenReveal}` : '',
        '',
      ].join('\n')),
    ].join('\n');
    // No gated device (M, T, TL, D) ran, e.g. --devices=ML,XL: nothing was held to the DoD §2 gate, so
    // this is not a PASS (an empty "every" would be vacuously true).
    if (!gatedRun.length) return { status: 'N/A', summary: `no gated device ran (gate: ${DEVICE_SETS.visual.join(', ')}); recorded only: ${summary || 'none'}`, details: results.map(({ file, crops, ...r }) => ({ ...r, file, crops })), md };
    return { status: pass ? 'PASS' : 'FAIL', summary, details: results.map(({ file, crops, ...r }) => ({ ...r, file, crops })), md };
  },
};
