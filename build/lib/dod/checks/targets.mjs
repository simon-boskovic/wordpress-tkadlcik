/**
 * targets — scenario v2 script K7 (links inside running text excluded), on M and T after a scroll-through.
 * One addition to the verbatim script: elements nobody can touch — aria-hidden with tabindex -1 and placed
 * off-screen (the form honeypot) — are not touch targets. Reference measured too so a prototype-side failure is visible as such.
 */
import { DEVICE_SETS, THRESHOLDS } from '../config.mjs';
import { loadSettled, openDevice } from '../session.mjs';

const K7 = (min) => `[...document.querySelectorAll('a, button, [role=button], input, select, textarea, summary')]
  .filter(e => e.offsetParent && !e.closest('p, li p')).map(e => ({ el: e, r: e.getBoundingClientRect() }))
  .filter(({ el, r }) => !(el.closest('[aria-hidden="true"]') && el.tabIndex < 0) && r.right > 0 && r.bottom + scrollY > 0)
  .filter(({ r }) => r.width < ${min} || r.height < ${min}).map(({ el, r }) => \`\${el.tagName} "\${(el.textContent || el.ariaLabel || '').trim().slice(0, 30)}" \${Math.round(r.width)}×\${Math.round(r.height)}\`)`;

export default {
  name: 'targets',
  title: 'Touch targets ≥ 44 px (K7) on M and T',
  async run(ctx) {
    const rows = [];
    for (const dev of DEVICE_SETS.targets) {
      const b = await openDevice(dev);
      try {
        await loadSettled(b, ctx.localUrl);
        const local = await b.evaluate(K7(THRESHOLDS.touchTarget));
        await loadSettled(b, ctx.refUrl);
        const ref = await b.evaluate(K7(THRESHOLDS.touchTarget));
        rows.push({ dev, local, ref });
      } finally { await b.close(); }
    }
    const n = rows.reduce((s, r) => s + r.local.length, 0);
    const md = rows.map((r) => `**${r.dev}** — local ${r.local.length} failing${r.local.length ? ':\n' + r.local.map((x) => `  - \`${x}\``).join('\n') : ''}\n\nreference ${r.ref.length} failing${r.ref.length ? ':\n' + r.ref.map((x) => `  - \`${x}\``).join('\n') : ''}`).join('\n\n');
    return { status: n ? 'FAIL' : 'PASS', summary: rows.map((r) => `${r.dev}: local ${r.local.length} (ref ${r.ref.length})`).join(' · '), details: rows, md };
  },
};
