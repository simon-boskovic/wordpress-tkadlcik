/**
 * flash — no white flash on page transitions. Records a CDP screencast (Page.startScreencast, PNG frames)
 * while navigating by a REAL click (mouse on D, tap on M) on (1) a header link and (2) a link in main that opens
 * another page, on reference and local.
 * The page background is Tuš #0E0F0E (dark-only site, luma ≈ 15); a
 * flash is a BLANK frame — more than flashWhiteShare of the frame is pure white (luma > flashWhiteLuma) while
 * neither the first nor the last frame of the recording is like that (a blank document painted between the two
 * pages). The header strip's luma per frame is recorded too (the header must not blink).
 * The site's view-transition root durations (::view-transition-old/new(root)) are read from the loaded CSS and
 * reported; at least one rule must exist (cross-document view transitions, DoD §3).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, encodePng } from '../../png.mjs';
import { DEVICE_SETS, THRESHOLDS } from '../config.mjs';
import { clickAt, openDevice, pointOf, sleep, tap, waitRendered } from '../session.mjs';

function stats(img) {
  let sum = 0, white = 0, hs = 0, hn = 0;
  const n = img.width * img.height, hdrRows = Math.round(img.height * 0.08);
  for (let i = 0, p = 0; p < n; p++, i += 4) {
    const y = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    sum += y;
    if (y > THRESHOLDS.flashWhiteLuma) white++;
    if (p < hdrRows * img.width) { hs += y; hn++; }
  }
  return { mean: sum / n, white: white / n, header: hn ? hs / hn : 0 };
}

/** In-page: view-transition animation durations of the root, outside reduced-motion media. */
function vtDurations() {
  const out = { old: [], new: [], rule: false };
  const walk = (rules, reduced) => { for (const r of rules) {
    if (/^@view-transition/.test(r.cssText || '')) out.rule = true;
    if (r.cssRules && !(r instanceof CSSStyleRule)) { walk(r.cssRules, reduced || /reduced-motion/.test(r.conditionText || (r.media && r.media.mediaText) || '')); continue; }
    if (!(r instanceof CSSStyleRule) || reduced) continue;
    const sel = r.selectorText || '';
    const d = r.style.animationDuration || (r.style.animation.match(/(\d+(?:\.\d+)?)(ms|s)\b/) || [])[0] || '';
    if (!d) continue;
    const ms = /ms$/.test(d) ? parseFloat(d) : parseFloat(d) * 1000;
    if (/::view-transition-old\(root\)/.test(sel) && !/active-view-transition-type/.test(sel)) out.old.push(ms);
    if (/::view-transition-new\(root\)/.test(sel) && !/active-view-transition-type/.test(sel)) out.new.push(ms);
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, false); } catch { /* cross-origin */ } }
  return out;
}

/** Tag the navigation targets: a header link to another page, and a link in main to another page. */
function tagLinks() {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const internal = (a) => { const h = a.getAttribute('href') || ''; if (/^(tel:|mailto:|#|https?:\/\/(?!127\.0\.0\.1|localhost))/.test(h)) return false; const u = new URL(a.href, location.href); return u.origin === location.origin && u.pathname !== location.pathname; };
  const hdr = [...document.querySelectorAll('header .nav a[href], header a[href]')].find((a) => vis(a) && internal(a) && !a.closest('#mnav'));
  const card = [...document.querySelectorAll('main a[href]')].find((a) => vis(a) && internal(a) && !a.hasAttribute('download') && !a.closest('[role=tabpanel][inert]'));
  const out = {};
  if (hdr) { hdr.setAttribute('data-dod', 'nav-header'); out.header = (hdr.innerText || hdr.getAttribute('aria-label') || '').trim() + ' → ' + hdr.getAttribute('href'); }
  if (card) { card.setAttribute('data-dod', 'nav-card'); out.card = (card.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) + ' → ' + card.getAttribute('href'); }
  return out;
}

async function navRun(dev, url, which, outDir, tag) {
  const b = await openDevice(dev);
  try {
    await b.goto(url, 1500);
    await waitRendered(b);
    const links = await b.evaluate(`(${tagLinks})()`);
    if (!links[which]) return { error: `no ${which} link found` };
    const p = await pointOf(b, `nav-${which}`, { settleMs: 1200 });   // lets reveals near the link finish
    if (p.error) return { error: `${which} link not clickable: ${p.error}`, link: links[which] };
    const frames = [];
    const off = b.on('Page.screencastFrame', (f) => {
      frames.push({ t: f.metadata.timestamp, data: f.data });
      b.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await b.send('Page.startScreencast', { format: 'png', maxWidth: Math.round(b.dev.width / 2), maxHeight: Math.round(b.dev.height / 2), everyNthFrame: 1 });
    await sleep(400);
    const from = await b.evaluate('location.href');
    if (b.dev.touch) await tap(b, p.x, p.y); else await clickAt(b, p.x, p.y);
    await sleep(3000);
    await b.send('Page.stopScreencast');
    off();
    const to = await b.evaluate('location.href').catch(() => '?');
    let worst = null, maxHeaderJump = 0, prevHeader = null;
    const series = frames.map((f) => {
      const img = decodePng(Buffer.from(f.data, 'base64'));
      const s = stats(img);
      if (!worst || s.white > worst.white) worst = { ...s, img };
      if (prevHeader != null) maxHeaderJump = Math.max(maxHeaderJump, Math.abs(s.header - prevHeader));
      prevHeader = s.header;
      return { t: +(f.t - frames[0].t).toFixed(3), mean: +s.mean.toFixed(1), white: +s.white.toFixed(3), header: +s.header.toFixed(1) };
    });
    let file = null;
    if (worst) { file = join(outDir, `flash-${tag}.png`); writeFileSync(file, encodePng(worst.img)); }
    const ends = series.length ? Math.max(series[0].white, series[series.length - 1].white) : 0;
    const flash = series.filter((s) => s.white > THRESHOLDS.flashWhiteShare && s.white > ends + 0.2);
    return { vt: await b.evaluate(`(${vtDurations})()`).catch(() => null), link: links[which], from, to, navigated: to !== from, frames: series.length, maxMean: worst ? +worst.mean.toFixed(1) : null, maxWhite: worst ? +worst.white.toFixed(3) : null, endsWhite: +ends.toFixed(3), maxHeaderJump: +maxHeaderJump.toFixed(1), flashFrames: flash, series, file };
  } finally { await b.close(); }
}

export default {
  name: 'flash',
  title: 'Page transitions: no blank white frame, header steady, view-transition rules present (screencast)',
  async run(ctx) {
    const rows = [];
    for (const dev of DEVICE_SETS.flash) for (const which of ['header', 'card']) {
      const local = await navRun(dev, ctx.localUrl, which, ctx.out, `${dev}-${which}-local`);
      const ref = await navRun(dev, ctx.refUrl, which, ctx.out, `${dev}-${which}-ref`);
      rows.push({ dev, which, local, ref });
    }
    const problems = [];
    for (const r of rows) {
      const l = r.local;
      if (l.error && /^no \w+ link found/.test(l.error)) continue;   // the page has no such link: N/A for this navigation
      if (l.error) { problems.push(`${r.dev} ${r.which}: ${l.error}`); continue; }
      if (!l.navigated) problems.push(`${r.dev} ${r.which}: click did not navigate (${l.link})`);
      if (l.frames < 3) problems.push(`${r.dev} ${r.which}: only ${l.frames} screencast frame(s) — inconclusive`);
      if (l.flashFrames.length) problems.push(`${r.dev} ${r.which}: ${l.flashFrames.length} blank white frame(s), max white share ${l.maxWhite} (ends ${l.endsWhite})`);
    }
    const vt = rows.map((r) => r.local.vt).find((v) => v && (v.old.length || v.new.length || v.rule));
    if (!vt) problems.push('no view-transition CSS (@view-transition / ::view-transition-*(root)) on the target page');
    const cell = (x) => (x.error ? x.error : `${x.frames} frames, max white ${x.maxWhite} (ends ${x.endsWhite}), header jump ${x.maxHeaderJump}${x.navigated ? '' : ', NOT navigated'} (\`${x.file}\`)`);
    const md = ['| Device | Link | local | reference |', '|---|---|---|---|',
      ...rows.map((r) => `| ${r.dev} | ${r.which}: ${r.local.link || r.ref.link || ''} | ${cell(r.local)} | ${cell(r.ref)} |`),
      '', `View transition (local CSS): @view-transition ${vt && vt.rule ? 'present' : 'missing'}; root durations out ${vt && vt.old.length ? vt.old.join('/') + ' ms' : 'browser default'}, in ${vt && vt.new.length ? vt.new.join('/') + ' ms' : 'browser default'}.`,
      '', problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'No blank white frame between pages.'].join('\n');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : rows.map((r) => `${r.dev}/${r.which} white ${r.local.maxWhite ?? '—'}`).join(' · '), details: rows.map((r) => ({ ...r, local: { ...r.local }, ref: { ...r.ref } })), md };
  },
};
