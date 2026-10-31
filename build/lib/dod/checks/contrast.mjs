/**
 * contrast — every visible text element (and placeholder) ≥ 4.5:1 against its effective background
 * (DoD §4), on D and M, each branch variant. Solid backgrounds: composited paint stack (probes.contrastProbe).
 * Text over photos/gradients: median backdrop pixels from the frozen full-page capture (probes.pixelContrast).
 */
import { DEVICE_SETS, THRESHOLDS } from '../config.mjs';
import { contrastProbe, pixelContrast } from '../probes.mjs';
import { capturePage, openDevice } from '../session.mjs';

export default {
  name: 'contrast',
  title: 'Text contrast ≥ 4.5:1 over the effective background (D, M)',
  async run(ctx) {
    const rows = [];
    for (const v of ctx.variants) for (const dev of DEVICE_SETS.contrast) {
      const b = await openDevice(dev);
      try {
        const cap = await capturePage(b, ctx.localUrl + v.suffix);
        const runs = await b.evaluate(`(${contrastProbe})()`);
        for (const r of runs) {
          if (r.image) { const p = pixelContrast(cap.img, r); if (p) { r.ratio = p.ratio; r.bg = `${p.bg} (photo, p10 ${p.p10})`; r.method = 'pixels'; } else r.method = 'pixels: too small'; }
          else r.method = 'dom';
        }
        rows.push({ variant: v.suffix, dev, runs, fails: runs.filter((r) => r.ratio != null && r.ratio < THRESHOLDS.contrast) });
      } finally { await b.close(); }
    }
    const fails = rows.flatMap((r) => r.fails.map((f) => ({ ...f, dev: r.dev, variant: r.variant })));
    const uniq = [...new Map(fails.map((f) => [`${f.el}|${f.text}|${f.color}|${f.bg}`, f])).values()];
    const md = [
      rows.map((r) => `- ${r.dev}${r.variant ? ' ' + r.variant : ''}: ${r.runs.length} text elements (${r.runs.filter((x) => x.method === 'pixels').length} over photos), ${r.fails.length} below ${THRESHOLDS.contrast}:1, lowest ${Math.min(...r.runs.filter((x) => x.ratio != null).map((x) => x.ratio)).toFixed(2)}`).join('\n'),
      uniq.length ? '\n| Device | Element | Text | Colour | Background | Ratio | Method |\n|---|---|---|---|---|---|---|\n' + uniq.slice(0, 60).map((f) => `| ${f.dev}${f.variant ? ' ' + f.variant : ''} | ${f.el} | ${f.text.replace(/\|/g, '/')} | ${f.color} | ${f.bg} | **${f.ratio}** | ${f.method} |`).join('\n') : '\nAll text meets 4.5:1.',
    ].join('\n');
    return { status: uniq.length ? 'FAIL' : 'PASS', summary: uniq.length ? `${uniq.length} text element(s) below 4.5:1, e.g. ${uniq[0].el} “${uniq[0].text.slice(0, 30)}” ${uniq[0].ratio}:1 (${uniq[0].color} on ${uniq[0].bg})` : `all text ≥ 4.5:1 (${rows.map((r) => `${r.dev} ${r.runs.length}`).join(', ')} elements)`, details: rows.map((r) => ({ ...r, runs: r.runs.map(({ colorRgba, bgRgb, ...x }) => x) })), md };
  },
};
