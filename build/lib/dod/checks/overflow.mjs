/**
 * overflow — documentElement.scrollWidth ≤ innerWidth at every viewport in config.OVERFLOW_VIEWPORTS
 * (touch emulation up to 1180 px and ML 844×390, mouse above), measured after a scroll-through on a fresh load.
 * Compared against documentElement.clientWidth (the layout viewport) as well as innerWidth: under mobile
 * emulation an overflowing page zooms out and innerWidth grows with it, which would hide the overflow.
 */
import { openBrowser } from '../../cdp.mjs';
import { OVERFLOW_VIEWPORTS } from '../config.mjs';

function overflowProbe() {
  const vw = document.documentElement.clientWidth;
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) return true; return false; };
  const offenders = [...document.body.querySelectorAll('*')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el); })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''} right=${Math.round(el.getBoundingClientRect().right)}`);
  return { scrollWidth: document.documentElement.scrollWidth, innerWidth, vw, offenders };
}
const heightFor = (w) => (w <= 414 ? 844 : w <= 600 ? 960 : w <= 820 ? 1180 : w <= 1180 ? 820 : w >= 1920 ? 1080 : 900);

export default {
  name: 'overflow',
  title: 'No horizontal overflow 320–1920 px (touch ≤1180 + ML, mouse above)',
  async run(ctx) {
    const touch = await openBrowser({ width: 390, height: 844, mobile: true });
    const mouse = await openBrowser({ width: 1440, height: 900 });
    const rows = [];
    try {
      for (const v of OVERFLOW_VIEWPORTS) {
        const w = v.w, isTouch = v.touch;
        const b = isTouch ? touch : mouse;
        await b.viewport(w, v.h || heightFor(w), isTouch);
        const r = {};
        for (const [side, url] of [['local', ctx.localUrl], ['ref', ctx.refUrl]]) {
          await b.goto(url, 800);
          // Guard against a lost device-metrics override (seen once: a 360 px run laid out at 1440 px).
          for (let i = 0; i < 2 && (await b.evaluate('document.documentElement.clientWidth')) !== w; i++) {
            await b.viewport(w, v.h || heightFor(w), isTouch);
            await b.goto(url, 800);
          }
          await b.evaluate(`(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await wait(120); } scrollTo(0, 0); await wait(400); })()`);
          r[side] = await b.evaluate(`(${overflowProbe})()`);
        }
        const emulated = r.local.vw === w;
        rows.push({ width: w, height: v.h || heightFor(w), touch: isTouch, ...r, emulated, pass: emulated && r.local.scrollWidth <= Math.min(r.local.innerWidth, r.local.vw, w) });
      }
    } finally { await touch.close(); await mouse.close(); }
    const fails = rows.filter((r) => !r.pass);
    const md = '| Viewport | Input | local scrollWidth / clientWidth | reference | offenders (local) |\n|---|---|---|---|---|\n'
      + rows.map((r) => `| ${r.width}×${r.height} | ${r.touch ? 'touch' : 'mouse'} | ${r.local.scrollWidth} / ${r.local.vw} ${r.pass ? '✓' : '✗'} | ${r.ref.scrollWidth} / ${r.ref.vw} | ${r.local.offenders.join('; ')} |`).join('\n');
    return { status: fails.length ? 'FAIL' : 'PASS', summary: fails.length ? `overflow at ${fails.map((r) => r.width + (r.emulated ? '' : ' (viewport emulation failed — harness)')).join(', ')}` : `no overflow at ${rows.length} widths`, details: rows, md };
  },
};
