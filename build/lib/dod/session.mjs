/**
 * Browser sessions for the DoD harness: one headless browser per device, console/network recording,
 * the deterministic "settle → freeze → capture" pipeline used IDENTICALLY for the reference
 * (prototype) and the local page, real input helpers and in-page probes.
 */
import { openBrowser, sleep } from '../cdp.mjs';
import { decodePng } from '../png.mjs';
import { DEVICES } from './config.mjs';

export { sleep };

/** Open a headless browser emulating a device key from config.DEVICES (DPR 1). */
export async function openDevice(key, { reducedMotion = false } = {}) {
  const d = DEVICES[key];
  if (!d) throw new Error(`unknown device ${key}`);
  const b = await openBrowser({ width: d.width, height: d.height, mobile: d.touch, reducedMotion });
  await b.send('Runtime.enable');
  await b.send('Log.enable');
  await b.send('Network.enable');
  // Nothing may come from the HTTP cache: every load must be a first visit on both sides.
  await b.send('Network.setCacheDisabled', { cacheDisabled: true });
  b.device = key;
  b.dev = d;
  return b;
}

/** Record console errors/warnings, uncaught exceptions, HTTP ≥ 400 and failed requests until stop(). */
export function recordLog(b) {
  const log = { errors: [], warnings: [], http: [], failed: [], canceled: [] };
  const urls = new Map();
  const fmtArgs = (args = []) => args.map((a) => a.value ?? a.description ?? a.unserializableValue ?? a.type).join(' ').slice(0, 300);
  const offs = [
    b.on('Network.requestWillBeSent', (p) => urls.set(p.requestId, p.request.url)),
    b.on('Runtime.consoleAPICalled', (p) => {
      const where = p.stackTrace?.callFrames?.[0] ? ` (${p.stackTrace.callFrames[0].url.split('/').pop()}:${p.stackTrace.callFrames[0].lineNumber + 1})` : '';
      if (p.type === 'error' || p.type === 'assert') log.errors.push(`console.${p.type}: ${fmtArgs(p.args)}${where}`);
      else if (p.type === 'warning') log.warnings.push(`console.warn: ${fmtArgs(p.args)}${where}`);
    }),
    b.on('Runtime.exceptionThrown', (p) => {
      const e = p.exceptionDetails;
      log.errors.push(`uncaught: ${(e.exception?.description || e.text || '').split('\n')[0].slice(0, 300)}${e.url ? ` (${e.url.split('/').pop()}:${e.lineNumber + 1})` : ''}`);
    }),
    b.on('Log.entryAdded', ({ entry: e }) => {
      const line = `[${e.source}] ${e.text.slice(0, 300)}${e.url ? ' ' + e.url : ''}`;
      if (e.level === 'error') log.errors.push(line);
      else if (e.level === 'warning') log.warnings.push(line);
    }),
    b.on('Network.responseReceived', (p) => { if (p.response.status >= 400) log.http.push(`${p.response.status} ${p.response.url}`); }),
    b.on('Network.loadingFailed', (p) => {
      const line = `${p.errorText} ${urls.get(p.requestId) || p.requestId}`;
      // A canceled request (lazy image re-prioritised, navigation away) is not a failure of the page.
      (p.canceled ? log.canceled : log.failed).push(line);
    }),
  ];
  const uniq = (a) => [...new Set(a)];
  return {
    log,
    stop() {
      offs.forEach((f) => f());
      for (const k of Object.keys(log)) log[k] = uniq(log[k]);
      return log;
    },
  };
}

/* ------------------------------------------------------------------ in-page scripts */
// These are stringified and evaluated in the page; they must be self-contained.

/** Scroll through the page (reveals, lazy images), force lazy images eager, wait for images + fonts, back to top. */
export async function settleScript() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Instant programmatic scrolling on both sides (a smooth scroll-behavior would leave scrollY mid-way).
  document.documentElement.style.scrollBehavior = 'auto';
  document.body.style.scrollBehavior = 'auto';
  await document.fonts.ready;
  // Prototype: wait for the Claude Design runtime to render (main has content) before scrolling.
  for (let i = 0; i < 40 && document.querySelectorAll('main *').length < 20; i++) await wait(200);
  // 250 ms per stop: reveal.js's IntersectionObserver needs a full render+composite cycle per stop in headless mode.
  const step = Math.max(200, Math.round(innerHeight * 0.6));
  for (let y = 0; y <= document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await wait(250); }
  scrollTo(0, document.documentElement.scrollHeight); await wait(400);
  document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.dataset.origLoading = 'lazy'; i.loading = 'eager'; });
  await Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 8000); }))));
  await Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : 1)));
  await document.fonts.ready;
  scrollTo(0, 0);
  for (let i = 0; i < 20 && scrollY !== 0; i++) { await wait(100); scrollTo(0, 0); }
  await wait(1200);   // longest reveal: revealClip 700 ms + 80 ms + 240 ms stagger; entrance .rise 700 ms + 260 ms
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const targets = [...document.querySelectorAll('.reveal, .rise')];
  return {
    broken: [...document.images].filter((i) => vis(i) && (!i.complete || !i.naturalWidth)).map((i) => i.currentSrc || i.src),
    emptyImgBoxes: [...document.images].filter((i) => vis(i) && i.naturalWidth && getComputedStyle(i).opacity === '0').map((i) => i.currentSrc || i.src),
    hiddenReveal: targets.filter((e) => vis(e) && parseFloat(getComputedStyle(e).opacity) < 0.99).length,
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`),
    hasHeader: !!document.querySelector('header'),
    hasFooter: !!document.querySelector('footer'),
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')),
    scrollY,
  };
}

/** Freeze the settled page: no transitions, finite animations jumped to their end, infinite ones paused at 0. */
export function freezeScript() {
  const s = document.createElement('style');
  s.id = 'dod-freeze';
  s.textContent = '*,*::before,*::after{transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}';
  document.head.appendChild(s);
  // WordPress marks images decoding="async": the rasteriser may then paint an off-viewport image as an
  // empty box in a beyond-viewport capture. Sync decoding changes nothing visible, only removes that race.
  document.querySelectorAll('img').forEach((i) => { i.decoding = 'sync'; });
  for (const a of document.getAnimations()) {
    try {
      const t = a.effect && a.effect.getComputedTiming();
      if (t && Number.isFinite(t.endTime)) a.finish(); else { a.pause(); a.currentTime = 0; }
    } catch { /* ignore */ }
  }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  return document.getAnimations().filter((a) => a.playState === 'running').length;
}

/** Top-level blocks (header, main sections, footer) and labelled elements with document coordinates. */
export function layoutProbe() {
  const sy = scrollY;
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) }; };
  const txt = (el) => ((el.innerText || el.getAttribute('alt') || el.getAttribute('aria-label') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const tag = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const heading = (el) => { const h = el.querySelector('h1,h2,h3'); return h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 50) : ''; };
  const blocks = [];
  const hdr = [...document.querySelectorAll('header')].find((h) => !h.closest('main'));
  if (hdr) blocks.push({ kind: 'header', label: tag(hdr), heading: '', ...R(hdr) });
  let n = 0;
  document.querySelectorAll('main section').forEach((s) => {
    if (s.parentElement.closest('section')) return;
    const r = R(s);
    if (!r.h) return;
    blocks.push({ kind: `section ${++n}`, label: tag(s), heading: heading(s) || txt(s).slice(0, 40), ...r });
  });
  const ft = [...document.querySelectorAll('footer')].find((f) => !f.closest('main')) || document.querySelector('footer');
  if (ft) blocks.push({ kind: 'footer', label: tag(ft), heading: heading(ft), ...R(ft) });
  const elements = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,img,summary,li,label,input,textarea,select,figure,span,svg,nav,form')]
    .filter((e) => e.getClientRects().length)
    .slice(0, 6000)
    .map((e) => ({ tag: tag(e), text: txt(e).slice(0, 40), ...R(e) }))
    .filter((e) => e.w > 0 && e.h > 0);
  return { blocks, elements, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, vw: innerWidth, scrollY: sy };
}

/* ------------------------------------------------------------------ capture */

/**
 * Deterministic full-page capture: load → settle (scroll-through, lazy→eager, images + fonts) → probe layout
 * → freeze (transitions off, animations at their end state) → capture at DPR 1 beyond the viewport
 * (the device metrics are NOT resized, so 100svh heroes keep their real height).
 */
export async function capturePage(b, url, { injectCss = '' } = {}) {
  const rec = recordLog(b);
  await b.goto(url, 1200);
  // Diagnosis aid (--inject-local-css): try a CSS fix on the local page without rebuilding WordPress.
  if (injectCss) await b.evaluate(`(() => { const s = document.createElement('style'); s.id = 'dod-inject'; s.textContent = ${JSON.stringify(injectCss)}; document.head.appendChild(s); })()`);
  const settle = await b.evaluate(`(${settleScript})()`);
  const layout = await b.evaluate(`(${layoutProbe})()`);
  const running = await b.evaluate(`(${freezeScript})()`);
  await sleep(300);
  const m = await b.send('Page.getLayoutMetrics');
  const docH = Math.ceil((m.cssContentSize || m.contentSize).height);
  const h = Math.min(16000, docH);
  const shot = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: b.dev.width, height: h, scale: 1 } });
  const png = Buffer.from(shot.data, 'base64');
  const log = rec.stop();
  return { url, png, img: decodePng(png), docH, truncated: docH > 16000, layout, settle, runningAfterFreeze: running, log };
}

/** Load and scroll through without capturing (console-only runs, interaction checks). */
export async function loadSettled(b, url, { waitMs = 1200 } = {}) {
  const rec = recordLog(b);
  await b.goto(url, waitMs);
  const settle = await b.evaluate(`(${settleScript})()`);
  return { settle, log: rec.stop() };
}

/* ------------------------------------------------------------------ real input */

export async function tap(b, x, y) {
  await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
export async function mouse(b, type, x, y, extra = {}) {
  await b.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1, ...extra });
}
export async function clickAt(b, x, y) {
  await mouse(b, 'mouseMoved', x, y);
  await mouse(b, 'mousePressed', x, y);
  await mouse(b, 'mouseReleased', x, y);
}
const KEYDEF = {
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
};
/** Full key press; Enter/Space carry text so they activate like a real keyboard (keypress/click). */
export async function press(b, name, { shift = false } = {}) {
  const k = KEYDEF[name];
  const mods = shift ? 8 : 0;
  await b.send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', modifiers: mods, ...k });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mods, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
}

/**
 * Centre of the element tagged data-dod="id" after scrolling it to the viewport centre, hit-tested.
 * Returns { x, y } or { error }.
 */
export async function pointOf(b, id, { settleMs = 150 } = {}) {
  await b.evaluate(`(() => { const el = document.querySelector('[data-dod="${id}"]'); if (el) el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); })()`);
  await sleep(settleMs);
  return b.evaluate(`(() => {
    const el = document.querySelector('[data-dod="${id}"]');
    if (!el) return { error: 'gone' };
    // An inline link that wraps has one client rect per line; the centre of its bounding box can fall between
    // the lines (no link there), so aim at the largest line box instead.
    const rects = [...el.getClientRects()].filter((q) => q.width && q.height).sort((a, z) => z.width * z.height - a.width * a.height);
    const r = rects[0] || el.getBoundingClientRect();
    if (!r.width || !r.height) return { error: 'no box' };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) return { error: 'covered by ' + (hit ? hit.tagName.toLowerCase() + (hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ')[0] : '') : 'nothing'), x, y };
    return { x, y };
  })()`);
}

/** Block every click's default action and propagation (window, capture phase) — press/tap tests must not navigate. */
export const BLOCK_CLICKS = `(() => { if (window.__dodBlock) return; window.__dodBlock = (e) => { e.preventDefault(); e.stopImmediatePropagation(); }; window.addEventListener('click', window.__dodBlock, true); })()`;
export const UNBLOCK_CLICKS = `(() => { if (window.__dodBlock) window.removeEventListener('click', window.__dodBlock, true); window.__dodBlock = null; })()`;

/** Wait until the page has rendered its content (the prototype renders client-side after load). */
export async function waitRendered(b, { timeout = 8000 } = {}) {
  const t0 = Date.now();
  let prev = -1;
  while (Date.now() - t0 < timeout) {
    const n = await b.evaluate(`document.querySelectorAll('main *').length`);
    if (n > 20 && n === prev) return true;
    prev = n;
    await sleep(250);
  }
  return false;
}
