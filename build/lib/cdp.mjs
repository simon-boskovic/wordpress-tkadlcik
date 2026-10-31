/**
 * Minimal headless-Chromium driver over the Chrome DevTools Protocol. No npm dependencies (Node ≥ 22:
 * global fetch + WebSocket). Shared by screenshot.mjs, verify.mjs and interact.mjs.
 * Clicks are real input events at the element's centre after a hit test — el.click() would pass on
 * a broken layout where something covers the target.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chromium-based browser for headless checks. TK_BROWSER overrides; otherwise Playwright's Chrome for Testing
// (any chromium-* revision in the ms-playwright cache, newest first; full Chrome so view transitions, speculation
// rules and --headless=new behave like a real visitor's browser), then Chrome, Edge or Brave. On this Mac the
// headless Brave hung while the user's own Brave was open, so Brave is only the last resort.
const HOME = process.env.HOME || process.env.USERPROFILE || '';
function playwrightChromes() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(HOME, 'Library', 'Caches', 'ms-playwright'), join(HOME, '.cache', 'ms-playwright'), join(process.env.LOCALAPPDATA || '', 'ms-playwright')].filter(Boolean);
  const out = [];
  for (const root of roots) {
    let dirs = [];
    try { dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1])); } catch { continue; }
    for (const d of dirs) out.push(
      join(root, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      join(root, d, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      join(root, d, 'chrome-linux', 'chrome'),
      join(root, d, 'chrome-win', 'chrome.exe'),
    );
  }
  return out;
}
export const BROWSER_PATH = [
  process.env.TK_BROWSER,
  ...playwrightChromes(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
].filter(Boolean).find(existsSync);
const EDGE = BROWSER_PATH;

/**
 * Extra browser switches. TK_BLOCK_EXTERNAL=1 resolves every host except localhost, 127.0.0.1 and
 * unpkg.com (the prototype's support.js loads React from there) to NOTFOUND: a hard DNS block, e.g. for runs
 * against a clone of production. Hosts to keep reachable on top of those: TK_BLOCK_EXTERNAL_ALLOW=host1,host2.
 * TK_BROWSER_ARGS: further switches as a JSON array of strings (e.g. '["--lang=cs"]'). Both apply to every CDP
 * session (dod.mjs, verify.mjs, interact.mjs, screenshot.mjs); Playwright's crossbrowser check does not use them.
 */
export function extraBrowserArgs(env = process.env) {
  const args = [];
  if (env.TK_BLOCK_EXTERNAL && env.TK_BLOCK_EXTERNAL !== '0') {
    const allow = ['localhost', '127.0.0.1', 'unpkg.com', ...String(env.TK_BLOCK_EXTERNAL_ALLOW || '').split(',').map((h) => h.trim()).filter(Boolean)];
    args.push(`--host-resolver-rules=MAP * ~NOTFOUND, ${allow.map((h) => `EXCLUDE ${h}`).join(', ')}`);
  }
  if (env.TK_BROWSER_ARGS) {
    let extra;
    try { extra = JSON.parse(env.TK_BROWSER_ARGS); } catch { throw new Error('TK_BROWSER_ARGS must be a JSON array of strings, e.g. \'["--lang=cs"]\''); }
    if (!Array.isArray(extra) || extra.some((a) => typeof a !== 'string')) throw new Error('TK_BROWSER_ARGS must be a JSON array of strings');
    args.push(...extra);
  }
  return args;
}
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const KEYS = { Escape: 27, Tab: 9, Enter: 13, ArrowLeft: 37, ArrowRight: 39, ' ': 32 };

// Every browser this process starts is killed when the process exits (a hung or aborted run must not
// leave headless browsers behind).
const LIVE = new Set();
process.on('exit', () => { for (const p of LIVE) { try { p.kill(); } catch { /* gone */ } } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

// A CDP call that never answers (renderer crash, hung page) rejects after this long instead of hanging.
const CALL_TIMEOUT_MS = Number(process.env.TK_CDP_TIMEOUT || 180000);

/**
 * Cookie consent state a session starts with (port of martinadamus R45). 'dismissed' (default): a returning
 * visitor who refused everything but the functional category — Complianz's banner stays hidden, the Google tag
 * stays blocked, so parity checks against the banner-less prototype compare the page itself. 'fresh': a first
 * visit (banner shown); set TK_CONSENT=fresh to run any harness that way, the consent scenario of interact.mjs
 * does it per session. The cookies are Complianz's own (cmplz_*), written by the page's document before its
 * scripts run; the server never reads them (they bypass nothing in the page cache).
 */
export const CONSENT_DISMISSED = [['cmplz_functional', 'allow'], ['cmplz_preferences', 'deny'], ['cmplz_statistics', 'deny'], ['cmplz_marketing', 'deny'], ['cmplz_banner-status', 'dismissed']];
export const consentScript = (pairs = CONSENT_DISMISSED) => `(() => { try {
  if (!/^https?:$/.test(location.protocol) || /(^|; )cmplz_banner-status=/.test(document.cookie)) return;
  for (const [k, v] of ${JSON.stringify(pairs)}) document.cookie = k + '=' + v + '; path=/; max-age=31536000; SameSite=Lax';
} catch (e) { /* opaque origin (about:blank, data:) */ } })();`;

export async function openBrowser({ width = 1280, height = 900, mobile = false, reducedMotion = false, javascript = true, consent = process.env.TK_CONSENT || 'dismissed' } = {}) {
  if (consent !== 'dismissed' && consent !== 'fresh') throw new Error(`openBrowser: consent must be 'dismissed' or 'fresh', not ${consent}`);
  if (!EDGE) throw new Error('No Chromium browser found — install Playwright\'s chromium or set TK_BROWSER to its executable');
  const profile = mkdtempSync(join(tmpdir(), 'tk-cdp-'));
  // port=0: the OS assigns a free ephemeral port to THIS process only (no fixed-range guess that a
  // concurrent job — or a slow-exiting browser from a previous run — could already be bound to). Chrome/
  // Edge/Brave write the port they actually got to <user-data-dir>/DevToolsActivePort; since user-data-dir
  // is a fresh mkdtemp directory unique to this call, that file can only have been written by the process
  // we just spawned, so reading it also confirms the port belongs to OUR browser, not someone else's.
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', '--password-store=basic', '--hide-scrollbars', '--mute-audio', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, ...extraBrowserArgs(), 'about:blank'], { stdio: 'ignore' });
  LIVE.add(proc);
  proc.on('exit', () => LIVE.delete(proc));

  const portFile = join(profile, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 100 && port == null; i++) {
    try {
      const line = readFileSync(portFile, 'utf8').split('\n', 1)[0].trim();
      if (line) port = Number(line);
    } catch { /* not written yet */ }
    if (port == null) await sleep(150);
  }
  if (port == null) { proc.kill(); throw new Error('The browser did not write DevToolsActivePort (no free port claimed)'); }

  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
    if (!target) await sleep(150);
  }
  if (!target) { proc.kill(); throw new Error('The browser did not expose a page target'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  const waiters = [];
  const listeners = new Map();   // method -> Set(cb): persistent event subscriptions (console, network, animations)
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) {
      for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].method === msg.method) { waiters[i].res(msg.params); waiters.splice(i, 1); }
      for (const cb of listeners.get(msg.method) || []) { try { cb(msg.params, msg.sessionId); } catch { /* listener errors must not kill the socket */ } }
    }
  };
  // sessionId: a flat-mode child session (Target.setAutoAttach flatten, e.g. a prerendered page, R56).
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const id = ++seq;
    const timer = setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`CDP ${method} timed out after ${CALL_TIMEOUT_MS} ms`)); } }, CALL_TIMEOUT_MS);
    pending.set(id, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  const once = (method) => new Promise((res) => waiters.push({ method, res }));
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };
  let state = { width, height, mobile };
  const viewport = async (w, h, m = state.mobile) => {
    state = { width: w, height: h, mobile: m };
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: m });
    await send('Emulation.setTouchEmulationEnabled', { enabled: m, maxTouchPoints: m ? 5 : 1 });
  };

  await send('Page.enable');
  await viewport(width, height, mobile);
  if (mobile) await send('Emulation.setUserAgentOverride', { userAgent: PHONE_UA });
  if (reducedMotion) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  if (!javascript) await send('Emulation.setScriptExecutionDisabled', { value: true });
  if (consent === 'dismissed') await send('Page.addScriptToEvaluateOnNewDocument', { source: consentScript(CONSENT_DISMISSED) });

  /** Subscribe to a CDP event for as long as needed; returns an unsubscribe function. */
  const on = (method, cb) => {
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(cb);
    return () => listeners.get(method).delete(cb);
  };

  return {
    send,
    evaluate,
    viewport,
    on,
    once,
    get state() { return { ...state }; },
    async goto(url, waitMs = 500) {
      const loaded = once('Page.loadEventFired');
      const nav = await send('Page.navigate', { url });
      if (nav.errorText) throw new Error(`${url}: ${nav.errorText}`);
      await Promise.race([loaded, sleep(20000)]);
      await sleep(waitMs);
    },
    async click(selector) {
      const pt = await evaluate(`(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.getClientRects().length);
        if (!el) return { error: 'no visible element' };
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(hit === el || el.contains(hit))) return { error: 'covered by ' + (hit ? hit.outerHTML.slice(0, 120) : 'nothing') };
        return { x, y };
      })()`);
      if (pt.error) throw new Error(`click ${selector}: ${pt.error}`);
      if (state.mobile) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
      }
      await sleep(350);
    },
    async key(key) {
      const p = { key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: KEYS[key] };
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...p });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
      await sleep(250);
    },
    async type(selector, text) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
      await send('Input.insertText', { text });
      await sleep(100);
    },
    /**
     * Scroll through (reveals + lazy images), strip srcset, capture the full page (or the viewport).
     * Does NOT resize the emulated device metrics to the measured content height before capturing:
     * pages with viewport-relative CSS (100svh/100vh — the hero, Task 8+) would recompute those units
     * against the taller override, growing further and pushing content past the clip. captureBeyondViewport
     * lets us clip to the height measured at the real viewport without touching device metrics at all.
     */
    async screenshot(path, { full = true } = {}) {
      await evaluate(`(async () => {
        // 250ms/step: reveal.js's IntersectionObserver needs a full render+composite cycle per stop in
        // headless mode to fire before the next jump — 90ms let elements pass through unobserved on tall
        // pages (the hero, Task 8+, made scroll-throughs longer), leaving them stuck at opacity:0.
        const step = Math.max(200, innerHeight * 0.75);
        for (let y = 0; y <= document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
        scrollTo(0, 0); await new Promise((r) => setTimeout(r, 250));
        document.querySelectorAll('img[srcset]').forEach((i) => { i.removeAttribute('srcset'); i.removeAttribute('sizes'); });
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.dataset.origLoading = 'lazy'; i.loading = 'eager'; });
        // 8000ms: measured directly for the 8-photo O mně gallery (Task 14, build/test instrumentation
        // logging each image's load/error timestamp) — all 11 images on the page resolve within
        // 3-8ms of being marked eager, even with srcset/sizes stripped forcing full-size refetches.
        // A prior WIP raised this to 25000ms on a theory of connection-queueing under concurrent load;
        // that value was tested against a real, reproducible miss (last gallery image blank right after
        // a fresh rebuild.sh) and did NOT prevent it — the miss resolves via onerror almost
        // immediately, not by timing out, so no timeout length fixes it. It is a one-off cold-read race
        // on the freshly bind-mounted upload right after media-import, cleared by a retry (see the
        // rerun-once guidance for verify.mjs after a fresh rebuild) — kept at 8000ms as headroom for a
        // genuinely slow read, not because loads are observed to take anywhere near that long.
        await Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));
      })()`);
      await sleep(700);
      const { cssContentSize, contentSize } = await send('Page.getLayoutMetrics');
      const h = full ? Math.min(16000, Math.ceil((cssContentSize || contentSize).height)) : state.height;
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: state.width, height: h, scale: 1 } });
      writeFileSync(path, Buffer.from(shot.data, 'base64'));
      return { width: state.width, height: h };
    },
    async close() {
      try { ws.close(); } catch { /* already closed */ }
      proc.kill();
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* Edge may still hold a lock */ }
    },
  };
}
