/**
 * Interaction checks against the local site with real, hit-tested input (port of martinadamus build/interact.mjs).
 *   node build/interact.mjs <scenario> [--path=/kurzy-a-lekce/] [--base=http://localhost:8020]
 *   node build/interact.mjs all            every scenario in turn
 * Scenarios: menu, nojs, tabs, reduced-motion, vt, prefetch, map, consent. Each throws on the first failed assertion
 * (exit 1) and prints "<name>: ok" plus what it measured. (martinadamus's form/lead/marquee/lightbox/compare
 * scenarios have no counterpart here: no form, no marquee/gallery.)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser, sleep } from './lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const BASE = arg('base', 'http://localhost:8020').replace(/\/$/, '');
const PATH = arg('path', '/kurzy-a-lekce/');
const PAGES = readdirSync(join(HERE, 'pages')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(HERE, 'pages', f), 'utf8'))).map((d) => (d.front_page ? '/' : `/${d.slug}/`)).sort();
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const visible = (b, sel) => b.evaluate(`[...document.querySelectorAll(${JSON.stringify(sel)})].some((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && parseFloat(getComputedStyle(e).opacity) > 0.5)`);
/** Every request to Google (maps, fonts, analytics) — the site may send none before the visitor asks for a map. */
const GOOGLE = /(^|\.)google\.[a-z.]+\/|googleapis\.com|gstatic\.com|googletagmanager\.com|google-analytics\.com|doubleclick\.net|ggpht\.com/;

/** Intercept every Google request locally (never reaches the network): records it and answers a stub. */
async function interceptGoogle(b) {
  const hits = [];
  await b.send('Network.enable');
  b.on('Network.requestWillBeSent', (p) => { if (GOOGLE.test(p.request.url)) hits.push(p.request.url); });
  await b.send('Fetch.enable', { patterns: ['*google.*', '*googleapis.com*', '*gstatic.com*', '*googletagmanager.com*', '*google-analytics.com*', '*doubleclick.net*'].map((urlPattern) => ({ urlPattern })) });
  b.on('Fetch.requestPaused', (p) => {
    b.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from('<!doctype html><title>stub</title><p>map stub (interact.mjs)</p>').toString('base64') }).catch(() => {});
  });
  return hits;
}

export const SCENARIOS = {
  /** Menu (redesign 2026-11-01, the martinadamus menu): burger, full-screen panel on a phone, focus, inert page, Escape, link click, back to desktop. */
  async menu() {
    const b = await openBrowser({ width: 390, height: 844, mobile: true });
    const out = [];
    try {
      await b.goto(BASE + PATH);
      assert(await visible(b, '.menu-btn'), 'menu button not visible on a phone');
      assert(!(await visible(b, '.nav-link')), 'desktop nav links visible on a phone');
      const st = () => b.evaluate(`(() => { const p = document.getElementById('menu-panel'), cs = getComputedStyle(p); return { open: String(document.documentElement.classList.contains('tk-menu-open')), vis: cs.visibility, op: cs.opacity, h: Math.round(p.getBoundingClientRect().height), expanded: document.querySelector('.menu-btn').getAttribute('aria-expanded'), mainInert: document.querySelector('main').hasAttribute('inert'), footInert: !!document.querySelector('.foot[inert]'), focusIn: p.contains(document.activeElement), focusBtn: document.activeElement === document.querySelector('.menu-btn'), focus: document.activeElement && (document.activeElement.textContent || '').trim().slice(0, 30) }; })()`);
      await b.click('.menu-btn');
      await sleep(450);
      let s = await st();
      assert(s.open === 'true' && s.vis === 'visible' && s.h > 300 && s.expanded === 'true', 'menu did not open: ' + JSON.stringify(s));
      assert(s.mainInert && s.footInert, 'page content (main, footer) not inert while the menu is open: ' + JSON.stringify(s));
      await b.key('Tab');
      s = await st();
      assert(s.focusIn, 'Tab from the menu button did not move into the menu: ' + JSON.stringify(s));
      out.push(`open: overlay ${s.h}px, main+footer inert, Tab → “${s.focus}”`);
      for (let i = 0; i < 14; i++) await b.key('Tab');
      const escaped = await b.evaluate(`!!document.activeElement.closest('main, .foot')`);
      assert(!escaped, 'Tab reached the inert page behind the open menu');
      await b.key('Escape');
      s = await st();
      assert(s.open === 'false' && s.focusBtn && !s.mainInert && !s.footInert && s.expanded === 'false', 'Escape did not close cleanly / return focus to the button: ' + JSON.stringify(s));
      out.push('Escape: closed, focus back on the button, page not inert');
      await b.click('.menu-btn');
      await sleep(400);
      await b.evaluate(`document.querySelector('#menu-panel a[href$="${PATH}"]').addEventListener('click', (e) => e.preventDefault(), { once: true })`);
      await b.click(`#menu-panel a[href$="${PATH}"]`);
      s = await st();
      assert(s.open === 'false' && !s.mainInert, 'following a menu link did not close the menu: ' + JSON.stringify(s));
      out.push('menu link: closes the menu');
      await b.click('.menu-btn');
      await sleep(300);
      await b.viewport(1280, 900, false);
      await sleep(400);
      s = await st();
      assert(s.open === 'false' && !s.mainInert, 'menu stayed open after widening to desktop: ' + JSON.stringify(s));
      assert(await visible(b, '.nav-link'), 'desktop nav links hidden at 1280');
      await b.viewport(820, 1180, true);
      await sleep(300);
      assert(await visible(b, '.menu-btn') || await visible(b, '.bar .nav'), 'tablet 820: neither nav nor burger');
      const sw = await b.evaluate('document.documentElement.scrollWidth');
      assert(sw <= 820, `tablet 820: horizontal overflow ${sw}`);
      out.push('1280: desktop nav, menu closed; 820 touch: header usable, no overflow');
      console.log('menu: ok\n  ' + out.join('\n  '));
    } finally { await b.close(); }
  },

  /** With JavaScript off nothing may stay hidden, both tab panels show, the map degrades to its link. */
  async nojs() {
    const b = await openBrowser({ width: 1280, height: 900, javascript: false });
    const out = [];
    try {
      for (const path of PAGES) {
        await b.goto(BASE + path, 300);
        const r = await b.evaluate(`(() => {
          const hidden = [...document.querySelectorAll('.reveal, .rise, h1, h2, main p')].filter((e) => e.getClientRects().length && (getComputedStyle(e).opacity === '0' || getComputedStyle(e).visibility === 'hidden'));
          const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
          return { js: document.documentElement.classList.contains('js'), hidden: hidden.map((e) => e.tagName + '.' + e.className), h1: vis(document.querySelector('h1')),
            tablist: [...document.querySelectorAll('[role=tablist]')].map(vis), panels: [...document.querySelectorAll('[role=tabpanel]')].map((p) => ({ id: p.id, vis: vis(p), inert: p.hasAttribute('inert') })),
            mapBtns: [...document.querySelectorAll('[data-tk-map]')].map(vis), mapLinks: [...document.querySelectorAll('[data-tk-map-box] a[href*="google.com/maps"]')].map(vis),
            menuBtn: vis(document.querySelector('.menu-btn')) };
        })()`);
        assert(!r.js, `${path}: js class present with JS disabled`);
        assert(r.h1 && r.hidden.length === 0, `${path}: ${r.hidden.length} element(s) hidden without JS: ${r.hidden.slice(0, 4).join(', ')}`);
        assert(r.tablist.every((v) => !v), `${path}: the tab list shows without JS (it cannot work)`);
        assert(r.panels.every((p) => p.vis && !p.inert), `${path}: tab panel hidden without JS: ${JSON.stringify(r.panels)}`);
        assert(r.mapBtns.every((v) => !v), `${path}: "Zobrazit mapu" shows without JS (it cannot work)`);
        assert(r.mapLinks.every((v) => v), `${path}: "Otevřít v Google Maps" link hidden without JS`);
        out.push(`${path}: readable${r.panels.length ? `, ${r.panels.length} tab panels shown` : ''}${r.mapLinks.length ? `, ${r.mapLinks.length} map links` : ''}${r.menuBtn ? ', menu button visible (!)' : ''}`);
      }
      console.log('nojs: ok\n  ' + out.join('\n  '));
    } finally { await b.close(); }
  },

  /** Course tabs on Domů (redesign 2026-11-01, assets/js/plate.js): click, keyboard (roving tabindex, arrows, Home/End), picture + text switch together. */
  async tabs() {
    const path = '/';
    const state = (b) => b.evaluate(`(() => {
      const tabs = [...document.querySelectorAll('[data-plate] [role=tab]')];
      const shown = (sel) => [...document.querySelectorAll(sel)].filter((e) => !e.hidden && e.getClientRects().length).map((e) => e.getAttribute(sel.slice(1, -1)));
      return { selected: tabs.map((t) => t.getAttribute('aria-selected')), ti: tabs.map((t) => t.tabIndex), panels: shown('[data-plate-panel]'), pics: shown('[data-plate-pic]'), focus: document.activeElement && document.activeElement.id };
    })()`);
    const b = await openBrowser({ width: 1440, height: 900 });
    const out = [];
    try {
      await b.goto(BASE + path);
      let s = await state(b);
      assert(JSON.stringify(s.selected) === '["true","false","false"]' && JSON.stringify(s.panels) === '["brokat"]' && JSON.stringify(s.pics) === '["brokat"]', 'initial state wrong: ' + JSON.stringify(s));
      assert(JSON.stringify(s.ti) === '[0,-1,-1]', 'roving tabindex wrong: ' + JSON.stringify(s));
      await b.click('#tab-slov');
      s = await state(b);
      assert(s.selected[1] === 'true' && s.panels[0] === 'slov' && s.pics[0] === 'slov', 'click did not switch to 13 slov: ' + JSON.stringify(s));
      out.push('click: picture and text switch together');
      await b.evaluate(`document.getElementById('tab-slov').focus()`);
      await b.key('ArrowRight');
      s = await state(b);
      assert(s.focus === 'tab-yang' && s.panels[0] === 'yang', 'ArrowRight did not move to Yang: ' + JSON.stringify(s));
      await b.key('ArrowRight');
      s = await state(b);
      assert(s.focus === 'tab-brokat', 'ArrowRight did not wrap to the first tab: ' + JSON.stringify(s));
      await b.key('End');
      s = await state(b);
      assert(s.focus === 'tab-yang' && JSON.stringify(s.ti) === '[-1,-1,0]', 'End / roving tabindex wrong: ' + JSON.stringify(s));
      await b.key('Home');
      s = await state(b);
      assert(s.focus === 'tab-brokat' && s.panels[0] === 'brokat', 'Home did not return to the first tab: ' + JSON.stringify(s));
      out.push('keyboard: arrows wrap, Home/End, roving tabindex');
      console.log('tabs: ok\n  ' + out.join('\n  '));
    } finally { await b.close(); }
  },

  /** prefers-reduced-motion on every page: fade only — nothing moves, nothing loops, everything visible. */
  async 'reduced-motion'() {
    const b = await openBrowser({ width: 1440, height: 900, reducedMotion: true });
    const out = [];
    try {
      for (const path of PAGES) {
        await b.goto(BASE + path, 800);
        await b.evaluate(`(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 900)); })()`);
        const r = await b.evaluate(`(() => {
          const kf = {};
          const walk = (rules) => { for (const x of rules) { if (x.type === CSSRule.KEYFRAMES_RULE) { const p = new Set(); for (const f of x.cssRules) for (let i = 0; i < f.style.length; i++) p.add(f.style[i]); kf[x.name] = [...p]; } else if (x.cssRules) walk(x.cssRules); } };
          for (const s of document.styleSheets) { try { walk(s.cssRules); } catch {} }
          const running = document.getAnimations().filter((a) => a.playState === 'running');
          const moving = running.filter((a) => a.animationName ? !(kf[a.animationName] || []).every((p) => p === 'opacity') || a.effect.getComputedTiming().iterations === Infinity : !/^(opacity|color|background-color|border-color|visibility|box-shadow)$/.test(a.transitionProperty));
          const hidden = [...document.querySelectorAll('.reveal, .rise')].filter((e) => e.getClientRects().length && (parseFloat(getComputedStyle(e).opacity) < 0.99 || !/^(none|0px)$/.test(getComputedStyle(e).translate)));
          const breath = [...document.querySelectorAll('.breath i')].map((e) => getComputedStyle(e).animationName);
          const exhale = [...document.querySelectorAll('.breath .ex')].map((e) => getComputedStyle(e).display);
          return { moving: moving.map((a) => (a.animationName || a.transitionProperty) + ' on ' + a.effect.target.tagName.toLowerCase() + '.' + a.effect.target.className), hidden: hidden.length, breath, exhale, reveals: document.querySelectorAll('.reveal').length };
        })()`);
        assert(!r.moving.length, `${path}: moving/looping animation under reduced motion: ${r.moving.slice(0, 4).join('; ')}`);
        assert(!r.hidden, `${path}: ${r.hidden} reveal/entrance element(s) not fully shown`);
        assert(r.breath.every((n) => n === 'none') && r.exhale.every((d) => d === 'none'), `${path}: breathing circle animates under reduced motion: ${JSON.stringify(r)}`);
        out.push(`${path}: ${r.reveals} reveals shown, nothing moving${r.breath.length ? ', breathing circle still (Nádech only)' : ''}`);
      }
      // A press keeps its size (transform: none under reduce).
      await b.goto(BASE + '/', 600);
      const pressed = await b.evaluate(`(() => { const btn = [...document.querySelectorAll('main .btn')].find((e) => e.getClientRects().length); btn.scrollIntoView({ block: 'center' }); const r = btn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await b.evaluate(`addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true })`);
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pressed.x, y: pressed.y });
      await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pressed.x, y: pressed.y, button: 'left', clickCount: 1 });
      await sleep(250);
      const t = await b.evaluate(`getComputedStyle(document.querySelector('main .btn:active') || document.body).transform`);
      await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pressed.x, y: pressed.y, button: 'left', clickCount: 1 });
      assert(t === 'none', `reduced motion: a pressed button still scales (${t})`);
      out.push('pressed button: no scale');
      console.log('reduced-motion: ok\n  ' + out.join('\n  '));
    } finally { await b.close(); }
  },

  /** Cross-document view transitions: forward + back on desktop and phone, the header stays, reduced motion = none. */
  async vt() {
    const PROBE = `addEventListener('pagereveal', (e) => {
      window.__vt = { vt: !!e.viewTransition, t: performance.now() };
      if (!e.viewTransition) return;
      e.viewTransition.ready.then(() => {
        const anims = document.getAnimations().filter((a) => a.effect && a.effect.pseudoElement);
        Object.assign(window.__vt, { ready: true, types: [...e.viewTransition.types], pseudo: anims.map((a) => a.effect.pseudoElement + ' ' + (a.animationName || '') + ' ' + Math.round(a.effect.getComputedTiming().duration) + 'ms') });
      }).catch((err) => { window.__vt.error = String(err); });
      e.viewTransition.finished.then(() => { window.__vt.finished = true; });
    });`;
    const probe = async (b) => { for (let i = 0; i < 30; i++) { const p = await b.evaluate('window.__vt || null'); if (p && (!p.vt || p.ready || p.error)) return p; await sleep(100); } return b.evaluate('window.__vt || null'); };
    const go = async (b, sel) => {
      const loaded = b.once('Page.loadEventFired');
      await b.click(sel);
      await Promise.race([loaded, sleep(8000)]);
      await sleep(300);
    };
    const out = [];
    let b = await openBrowser({ width: 1440, height: 900 });
    try {
      await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
      await b.goto(BASE + '/', 800);
      const rule = await b.evaluate(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /^@view-transition/.test(r.cssText)); } catch { return false; } })`);
      assert(rule, 'no @view-transition { navigation: auto } rule on the page');
      await go(b, '.bar .nav a[href$="/cviceni/"]');
      let p = await probe(b);
      assert(p && p.vt && p.ready, 'forward navigation without a view transition: ' + JSON.stringify(p));
      assert(p.pseudo.some((x) => /::view-transition-(old|new)\(root\)/.test(x)), 'no root cross-fade: ' + JSON.stringify(p.pseudo));
      assert(!p.pseudo.some((x) => /new\(site-header\) \S+ [1-9]/.test(x)), 'the header animates in (it should stay put): ' + JSON.stringify(p.pseudo));
      out.push(`desktop / → /cviceni/: ${p.pseudo.join(', ')}`);
      const loaded = b.once('Page.loadEventFired');
      await b.evaluate('history.back()');
      await Promise.race([loaded, sleep(8000)]);
      await sleep(400);
      p = await probe(b);
      assert(p && p.vt, 'back navigation without a view transition: ' + JSON.stringify(p));
      out.push(`desktop back: types ${JSON.stringify(p.types || [])}${p.pseudo ? ', ' + p.pseudo.length + ' animations' : ''}`);
    } finally { await b.close(); }

    b = await openBrowser({ width: 390, height: 844, mobile: true });
    try {
      await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
      await b.goto(BASE + '/kurzy-a-lekce/', 800);
      await go(b, 'main a[href$="/cviceni/#brokat"]');
      const p = await probe(b);
      assert(p && p.vt && p.ready, 'phone: tap navigation without a view transition: ' + JSON.stringify(p));
      const at = await b.evaluate('location.pathname + location.hash');
      assert(at === '/cviceni/#brokat', `phone: landed on ${at}`);
      let y = 9999;   // the page scrolls smoothly to the anchor (scroll-behavior: smooth): poll until it arrives
      for (let i = 0; i < 30 && !(y >= 0 && y < 400); i++) { await sleep(150); y = await b.evaluate(`Math.round(document.getElementById('brokat').getBoundingClientRect().top)`); }
      assert(y >= 0 && y < 400, `phone: #brokat not scrolled into view after the transition (top ${y}px)`);
      out.push(`phone tap → /cviceni/#brokat: ${p.pseudo.length} animations, anchor at ${y}px`);
    } finally { await b.close(); }

    b = await openBrowser({ width: 1440, height: 900, reducedMotion: true });
    try {
      await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
      await b.goto(BASE + '/', 800);
      await go(b, '.bar .nav a[href$="/akce/"]');
      const p = await probe(b);
      const animated = (p && p.pseudo || []).filter((x) => !/ 0ms$/.test(x) && !/ none /.test(x));
      assert(p && (p.vt === false || animated.length === 0), 'reduced motion: the view transition animates: ' + JSON.stringify(p));
      out.push(`reduced motion: ${p.vt ? 'transition with 0 running animations' : 'no transition'}`);
    } finally { await b.close(); }
    console.log('vt: ok\n  ' + out.join('\n  '));
  },

  /** Speculation rules (prefetch): hover → page-cache HIT prefetch → navigational-prefetch; exclusions; phone; no JS. */
  async prefetch() {
    const abs = (p) => new URL(p, BASE).href;
    const hdr = (h, n) => { for (const k in h || {}) if (k.toLowerCase() === n) return h[k]; return ''; };
    const watch = async (b) => {
      const st = { status: new Map(), candidates: [], reqs: [], docs: [] };
      await b.send('Network.enable');
      await b.send('Preload.enable');
      b.on('Preload.prefetchStatusUpdated', (p) => st.status.set(p.prefetchUrl, p.status + '/' + p.prefetchStatus));
      b.on('Preload.preloadingAttemptSourcesUpdated', (p) => { st.candidates = p.preloadingAttemptSources.map((s) => s.key.action + ' ' + s.key.url); });
      b.on('Network.requestWillBeSent', (p) => st.reqs.push({ url: p.request.url, method: p.request.method, purpose: hdr(p.request.headers, 'sec-purpose'), type: p.type }));
      b.on('Network.responseReceived', (p) => { if (p.type === 'Document' || p.type === 'Prefetch') st.docs.push({ url: p.response.url, type: p.type, cache: hdr(p.response.headers, 'x-tk-cache'), cc: hdr(p.response.headers, 'cache-control'), fromPrefetchCache: !!p.response.fromPrefetchCache }); });
      return st;
    };
    const point = (b, href) => b.evaluate(`(() => {
      const a = [...document.querySelectorAll('a[href]')].find((x) => (x.getAttribute('href') === ${JSON.stringify(href)} || x.href === ${JSON.stringify(abs(href))}) && x.getClientRects().length);
      if (!a) return null;
      a.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    const hover = async (b, st, href, want = true) => {
      const pt = await point(b, href);
      assert(pt, `no visible link ${href}`);
      await sleep(250);
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x - 1, y: pt.y });
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
      for (let i = 0; i < 40 && want && !/^Ready/.test(st.status.get(abs(href)) || ''); i++) await sleep(100);
      if (!want) await sleep(1200);
      return pt;
    };
    const clickAt = async (b, pt) => {
      const loaded = b.once('Page.loadEventFired');
      await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
      await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
      await Promise.race([loaded, sleep(15000)]);
      await sleep(600);
    };
    const nav = (b) => b.evaluate(`(() => { const n = performance.getEntriesByType('navigation')[0]; return { url: location.href, delivery: n.deliveryType, responseStart: +n.responseStart.toFixed(1) }; })()`);
    const rules = (b) => b.evaluate(`(() => { const s = document.getElementById('tk-speculation-rules'); return { count: document.querySelectorAll('script[type=speculationrules]').length, eagerness: s ? [...new Set(JSON.parse(s.textContent).prefetch.map((r) => r.eagerness))].join() : null }; })()`);
    const out = [];
    const target = '/akce/';

    let b = await openBrowser({ width: 1280, height: 900 });
    try {
      const st = await watch(b);
      await b.goto(`${BASE}/kontakt/`, 1000);
      const r = await rules(b);
      assert(r.count === 1 && r.eagerness === 'moderate', 'desktop: expected exactly one ruleset (ours) with eagerness moderate: ' + JSON.stringify(r));
      const yes = ['/zz-tk-plain/', '/cviceni/#videa'];
      const no = ['/wp-login.php', '/wp-admin/', '/wp-json/', '/wp-content/uploads/x.webp', '/akce/?utm_source=x', '/?s=tchaj', '/llms.txt', '/robots.txt', '/sitemap.xml', '/feed/', 'https://example.com/', 'tel:+420773287113', 'mailto:tkadlcik@centrum.cz'];
      await b.evaluate(`(() => { const d = document.createElement('div'); d.id = 'tk-pf-links'; d.setAttribute('style', 'position:fixed;left:8px;top:120px;z-index:99999;background:#fff;padding:4px;display:flex;flex-direction:column;gap:4px;font:12px sans-serif');
        d.innerHTML = ${JSON.stringify([...yes, ...no].map((h) => `<a href="${h}">${h}</a>`).join('') + '<a rel="nofollow" href="/zz-tk-nofollow/">nofollow</a><a data-no-prefetch href="/zz-tk-noprefetch/">data-no-prefetch</a>')}; document.body.appendChild(d); })()`);
      await sleep(800);
      const cand = new Set(st.candidates);
      for (const h of yes) assert(cand.has('Prefetch ' + abs(h).split('#')[0]) || cand.has('Prefetch ' + abs(h)), `not a prefetch candidate: ${h} (candidates ${JSON.stringify(st.candidates)})`);
      const bad = st.candidates.filter((c) => { const u = new URL(c.replace(/^\w+ /, '')); return u.origin !== new URL(BASE).origin || /^\/(wp-|feed)/.test(u.pathname) || /\.(txt|xml)$/.test(u.pathname) || /zz-tk-(nofollow|noprefetch)/.test(u.pathname) || u.search || !/^Prefetch /.test(c); });
      assert(bad.length === 0, 'excluded URLs are speculation candidates: ' + JSON.stringify(bad));
      out.push(`candidates ${st.candidates.length}: same-origin pages only; ${no.length + 2} excluded probes absent`);
      await b.evaluate(`document.getElementById('tk-pf-links').remove()`);

      const pt = await hover(b, st, target);
      const s = st.status.get(abs(target)) || '';
      assert(/^Ready/.test(s), `hover did not prefetch ${target}: ${s || 'no status'}`);
      const pre = st.reqs.find((q) => q.url === abs(target) && q.type === 'Prefetch');
      const preDoc = st.docs.find((d) => d.url === abs(target) && d.type === 'Prefetch');
      assert(pre && pre.purpose === 'prefetch' && pre.method === 'GET', 'prefetch request missing or without Sec-Purpose: prefetch: ' + JSON.stringify(pre));
      assert(preDoc && /^HIT/.test(preDoc.cache), 'prefetch not served by the page cache (X-TK-Cache HIT): ' + JSON.stringify(preDoc));
      await clickAt(b, pt);
      const n = await nav(b);
      assert(n.url === abs(target) && n.delivery === 'navigational-prefetch', 'navigation did not use the prefetch: ' + JSON.stringify(n));
      out.push(`hover ${target}: Sec-Purpose ${pre.purpose}, X-TK-Cache ${preDoc.cache}, "${preDoc.cc}" → ${n.delivery}`);
    } finally { await b.close(); }

    b = await openBrowser({ width: 390, height: 844, mobile: true });
    try {
      const st = await watch(b);
      await b.goto(`${BASE}/`, 1000);
      const r = await rules(b);
      assert(r.eagerness === 'conservative', 'phone: expected conservative eagerness: ' + JSON.stringify(r));
      for (let y = 0; y < 4000; y += 400) { await b.evaluate(`scrollTo(0, ${y})`); await sleep(200); }
      await sleep(1200);
      assert(st.status.size === 0, 'phone: something was prefetched while scrolling: ' + JSON.stringify([...st.status]));
      out.push('phone: eagerness conservative, 0 prefetches while scrolling');
    } finally { await b.close(); }

    b = await openBrowser({ width: 1280, height: 900, reducedMotion: true });
    try {
      const st = await watch(b);
      await b.goto(`${BASE}/kontakt/`, 800);
      const pt = await hover(b, st, target);
      await clickAt(b, pt);
      const n = await nav(b);
      const h1 = await b.evaluate(`getComputedStyle(document.querySelector('h1')).opacity`);
      // The title may still be finishing its opacity fade (the one transition allowed under reduced motion).
      assert(n.delivery === 'navigational-prefetch' && parseFloat(h1) > 0.95, 'reduced motion: ' + JSON.stringify({ n, h1 }));
      out.push(`reduced motion: ${n.delivery}, h1 opacity ${h1}`);
    } finally { await b.close(); }

    b = await openBrowser({ width: 1280, height: 900, javascript: false });
    try {
      const st = await watch(b);
      await b.goto(`${BASE}/kontakt/`, 800);
      assert((await rules(b)).count === 0, 'no JS: a ruleset exists');
      await hover(b, st, target, false);
      assert(st.status.size === 0 && !st.reqs.some((q) => q.type === 'Prefetch'), 'no JS: something was prefetched');
      out.push('no JS: no ruleset, no prefetch');
    } finally { await b.close(); }
    console.log('prefetch: ok\n  ' + out.join('\n  '));
  },

  /** Click-to-load maps: nothing goes to Google before the click (every Google request intercepted locally). */
  async map() {
    const out = [];
    for (const path of ['/kurzy-a-lekce/', '/kontakt/']) {
      const b = await openBrowser({ width: 1440, height: 900 });
      try {
        const google = await interceptGoogle(b);
        await b.goto(BASE + path, 1200);
        await b.evaluate(`(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } })()`);
        await sleep(800);
        const boxes = await b.evaluate(`document.querySelectorAll('[data-tk-map-box]').length`);
        assert(boxes === 2, `${path}: expected 2 map boxes, found ${boxes}`);
        assert(google.length === 0, `${path}: Google requests before any click: ${JSON.stringify(google)}`);
        assert(await b.evaluate(`document.querySelectorAll('iframe').length`) === 0, `${path}: an iframe exists before the click`);
        // Mouse click on the first box.
        await b.click('[data-tk-map-box] [data-tk-map]');
        await sleep(800);
        let r = await b.evaluate(`(() => { const f = document.querySelector('iframe.tk-map-frame'); return { n: document.querySelectorAll('iframe.tk-map-frame').length, src: f && f.getAttribute('src'), title: f && f.title, focus: document.activeElement === f, boxes: document.querySelectorAll('[data-tk-map-box]').length, h: f ? Math.round(f.getBoundingClientRect().height) : 0 }; })()`);
        assert(r.n === 1 && /^https:\/\/maps\.google\.com\/maps\?/.test(r.src) && /output=embed/.test(r.src), `${path}: the click did not load the map iframe: ` + JSON.stringify(r));
        assert(r.focus && /^Mapa – /.test(r.title) && r.boxes === 1 && r.h >= 200, `${path}: iframe focus/title/size or the other box wrong: ` + JSON.stringify(r));
        assert(google.length >= 1 && google.every((u) => /maps\.google\.com|google\.com\/maps|gstatic|googleapis/.test(u)), `${path}: unexpected Google requests: ${JSON.stringify(google)}`);
        const after1 = google.length;
        // Keyboard on the second box: focus the button, Enter.
        await b.evaluate(`document.querySelector('[data-tk-map-box] [data-tk-map]').focus()`);
        await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await sleep(800);
        r = await b.evaluate(`({ n: document.querySelectorAll('iframe.tk-map-frame').length, boxes: document.querySelectorAll('[data-tk-map-box]').length })`);
        assert(r.n === 2 && r.boxes === 0, `${path}: Enter on the second button did not load its map: ` + JSON.stringify(r));
        out.push(`${path}: 0 Google requests before the click; click → iframe (focused, ${after1} request(s), intercepted); Enter → second map`);
      } finally { await b.close(); }
    }
    // The link fallback (no JS): button hidden, Google Maps link in a new tab.
    const b = await openBrowser({ width: 390, height: 844, mobile: true, javascript: false });
    try {
      await b.goto(BASE + '/kontakt/', 300);
      const r = await b.evaluate(`[...document.querySelectorAll('[data-tk-map-box]')].map((box) => { const btn = box.querySelector('[data-tk-map]'), a = box.querySelector('a'); return { btn: !!btn && getComputedStyle(btn).display !== 'none', href: a && a.href, target: a && a.target, rel: a && a.rel, h: Math.round(a ? a.getBoundingClientRect().height : 0) }; })`);
      assert(r.length === 2 && r.every((x) => !x.btn && /^https:\/\/www\.google\.com\/maps\/search\//.test(x.href) && x.target === '_blank' && /noopener/.test(x.rel) && x.h >= 44), 'no-JS map fallback wrong: ' + JSON.stringify(r));
      out.push('no JS: button hidden, "Otevřít v Google Maps" links (new tab, noopener, ≥ 44 px)');
    } finally { await b.close(); }
    console.log('map: ok\n  ' + out.join('\n  '));
  },

  /**
   * Cookie consent (port of martinadamus R45) in a clean profile (consent: 'fresh'). Nothing may reach Google before
   * consent to statistics; every Google request is intercepted and answered locally with a stub (it only sets a _ga
   * cookie, standing in for gtag.js), so no data ever leaves the machine and the fake tag id (tk-local.php) is all
   * Google would see. Screenshots: build/shots/consent/.
   */
  async consent() {
    const SHOTS = join(HERE, 'shots', 'consent');
    mkdirSync(SHOTS, { recursive: true });
    const out = [];
    // Page cache first: the stored (HIT) HTML must carry the tag already blocked, and no page response sets a cookie.
    await fetch(BASE + '/');
    const home = await fetch(BASE + '/');
    const html = await home.text();
    assert(/^HIT/.test(home.headers.get('x-tk-cache') || ''), `home page not served from the page cache (X-TK-Cache: ${home.headers.get('x-tk-cache')})`);
    assert(!home.headers.get('set-cookie'), 'page response sets a cookie');
    assert(/<script type="text\/plain" data-service="google-analytics" data-category="statistics" id="google_gtagjs-js" data-cmplz-src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"/.test(html), 'cached HTML does not hold the Google tag in its blocked form');
    assert(!/<script[^>]+\ssrc="https:\/\/www\.googletagmanager\.com/.test(html), 'cached HTML loads googletagmanager directly');
    out.push('cached HTML (HIT): Google tag blocked (type="text/plain" data-category="statistics"), no Set-Cookie');

    const b = await openBrowser({ width: 1440, height: 900, consent: 'fresh' });
    const google = [];
    try {
      await b.send('Network.enable');
      b.on('Network.requestWillBeSent', (p) => { if (GOOGLE.test(p.request.url)) google.push(p.request.url); });
      const stubJs = Buffer.from("document.cookie='_ga=GA1.1.1234567890.1790000000; path=/; max-age=63072000';window.__tkGtagStub=(window.__tkGtagStub||0)+1;").toString('base64');
      const stubHtml = Buffer.from('<!doctype html><title>stub</title><p>stub (interact.mjs)</p>').toString('base64');
      await b.send('Fetch.enable', { patterns: ['*google.*', '*googleapis.com*', '*gstatic.com*', '*googletagmanager.com*', '*google-analytics.com*', '*doubleclick.net*', '*youtube*', '*ytimg.com*'].map((urlPattern) => ({ urlPattern })) });
      b.on('Fetch.requestPaused', (p) => {
        const js = /googletagmanager|google-analytics/.test(p.request.url);
        b.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: js ? 'application/javascript' : 'text/html; charset=utf-8' }], body: js ? stubJs : stubHtml }).catch(() => {});
      });
      const gaCookies = async () => (await b.send('Network.getAllCookies')).cookies.filter((c) => /^_ga|^_gid/.test(c.name)).map((c) => c.name);
      const cookie = async (n) => ((await b.send('Network.getAllCookies')).cookies.find((c) => c.name === n) || {}).value;
      const bannerShown = () => b.evaluate(`(() => { const e = document.querySelector('.cmplz-cookiebanner'); return !!e && e.classList.contains('cmplz-show') && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; })()`);
      const waitBanner = async (want) => { for (let i = 0; i < 30; i++) { if ((await bannerShown()) === want) return true; await sleep(100); } return false; };
      const reload = async () => { await b.goto(await b.evaluate('location.href'), 1500); };

      // 1. First visit: banner shown, keyboard-operable, ≥ 44 px targets, nothing to Google.
      await b.goto(BASE + '/', 1500);
      assert(await waitBanner(true), 'banner not shown on the first visit');
      assert(google.length === 0 && (await gaCookies()).length === 0, `before consent: google requests ${JSON.stringify(google)}, cookies ${await gaCookies()}`);
      const sizes = await b.evaluate(`[...document.querySelectorAll('.cmplz-cookiebanner .cmplz-btn, .cmplz-cookiebanner .cmplz-close, .cmplz-cookiebanner .cmplz-link')].filter((e) => e.getClientRects().length).map((e) => ({ c: String(e.className), h: Math.round(e.getBoundingClientRect().height) }))`);
      assert(sizes.length >= 4 && sizes.every((x) => x.h >= 44), 'banner control smaller than 44 px: ' + JSON.stringify(sizes));
      const focus = [];
      for (let i = 0; i < 8; i++) {
        await b.key('Tab');
        focus.push(await b.evaluate(`(() => { const a = document.activeElement, s = getComputedStyle(a); return { cls: String(a.className || a.tagName), inBanner: !!a.closest('.cmplz-cookiebanner'), outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 }; })()`));
      }
      assert(focus.every((f) => f.inBanner), 'Tab left the open banner: ' + JSON.stringify(focus.map((f) => f.cls)));
      for (const btn of ['cmplz-accept', 'cmplz-deny', 'cmplz-view-preferences']) assert(focus.some((f) => f.cls.includes(btn)), `Tab never reached .${btn}: ${JSON.stringify(focus.map((f) => f.cls))}`);
      assert(focus.filter((f) => /cmplz-btn/.test(f.cls)).every((f) => f.outline), 'a focused banner button shows no visible focus outline');
      out.push(`first visit: banner shown, ${sizes.length} controls ≥ 44 px, Tab stays in the banner with a visible focus ring, 0 Google requests`);
      await b.screenshot(join(SHOTS, 'banner-1440.png'), { full: false });
      await b.click('.cmplz-cookiebanner .cmplz-view-preferences');
      await sleep(400);
      await b.screenshot(join(SHOTS, 'preferences-1440.png'), { full: false });
      const cats = await b.evaluate(`[...document.querySelectorAll('.cmplz-cookiebanner .cmplz-category')].filter((e) => e.getClientRects().length).map((e) => e.querySelector('.cmplz-category-title').textContent).join('|')`);
      assert(cats === 'Funkční|Statistické', 'preferences should list exactly Funkční + Statistické: ' + cats);
      const policy = await b.evaluate(`[...document.querySelectorAll('.cmplz-cookiebanner a.cmplz-link')].filter((e) => e.getClientRects().length).map((a) => a.getAttribute('href'))`);
      assert(policy.length && policy.every((h) => /\/zasady-ochrany-osobnich-udaju\/#cookies$/.test(h)), 'banner policy link must point to /zasady-ochrany-osobnich-udaju/#cookies: ' + JSON.stringify(policy));

      // 2. "Odmítnout": nothing loads, also after a reload.
      await b.click('.cmplz-cookiebanner .cmplz-deny');
      assert(await waitBanner(false), 'banner still shown after Odmítnout');
      await reload();
      assert(!(await bannerShown()), 'banner back after reload although refused');
      assert(google.length === 0 && (await gaCookies()).length === 0 && (await cookie('cmplz_statistics')) === 'deny', `after Odmítnout: google ${JSON.stringify(google)}, cookies ${await gaCookies()}, cmplz_statistics=${await cookie('cmplz_statistics')}`);
      out.push('Odmítnout: banner gone (also after reload), cmplz_statistics=deny, 0 Google requests, no _ga');

      // 2b. Click-to-load map: our own click is the consent for it — Complianz neither blocks it nor puts a second
      // placeholder over it, even with everything refused; it never pulls in the Google tag.
      await b.goto(BASE + '/kontakt/', 1200);
      await b.click('[data-tk-map-box] [data-tk-map]');
      await sleep(800);
      const map = await b.evaluate(`(() => { const f = document.querySelector('iframe.tk-map-frame'); return { src: f ? f.getAttribute('src') : null, cmplz: !!document.querySelector('.cmplz-blocked-content-notice, iframe[data-src-cmplz], iframe.cmplz-iframe') }; })()`);
      assert(map.src && /maps\.google\.com/.test(map.src) && !map.cmplz, 'map did not load on its own click, or Complianz interfered: ' + JSON.stringify(map));
      assert(!google.some((u) => /googletagmanager|google-analytics/.test(u)), 'loading the map pulled in the Google tag: ' + JSON.stringify(google));
      out.push(`refused + map click: the map loads on its own click (${google.length} intercepted request(s)), no Google tag`);
      google.length = 0;
      await b.goto(BASE + '/', 1500);

      // 3. The footer's "Nastavení cookies" reopens the banner (focus moves into it).
      const r = await b.evaluate(`(() => { const r = document.querySelector('.foot-line').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 20), width: innerWidth, height: r.height + 40 }; })()`);
      const shot = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...r, scale: 1 } });
      writeFileSync(join(SHOTS, 'footer-link-1440.png'), Buffer.from(shot.data, 'base64'));
      await b.click('[data-tk-consent-open]');
      assert(await waitBanner(true), '"Nastavení cookies" did not reopen the banner');
      assert(await b.evaluate(`!!document.activeElement.closest('.cmplz-cookiebanner')`), 'focus not moved into the reopened banner');
      assert(await b.evaluate(`location.hash === '' && location.pathname === '/'`), 'the footer link navigated instead of reopening the banner');

      // 4. "Přijmout": the Google tag (fake id) loads.
      await b.click('.cmplz-cookiebanner .cmplz-accept');
      await sleep(800);
      const tag = google.find((u) => /googletagmanager\.com\/gtag\/js\?id=/.test(u));
      assert(tag, 'no Google tag request after Přijmout: ' + JSON.stringify(google));
      assert((await gaCookies()).includes('_ga') && (await cookie('cmplz_statistics')) === 'allow', 'after Přijmout: _ga / cmplz_statistics=allow missing');
      const afterAccept = [...google];
      google.length = 0;
      await reload();
      assert(google.some((u) => /gtag\/js\?id=/.test(u)), 'the tag does not load on the next page view after consent');
      out.push(`footer "Nastavení cookies" reopens the banner (focus inside); Přijmout → ${afterAccept[0]} (intercepted), _ga set, tag loads again after reload`);

      // 5. Withdrawal: footer link → Odmítnout → GA cookies gone, page reloaded, tag no longer loads.
      await b.click('[data-tk-consent-open]');
      assert(await waitBanner(true), 'banner not reopened for the withdrawal');
      google.length = 0;
      await b.click('.cmplz-cookiebanner .cmplz-deny');
      await sleep(2500); // consent.js clears the GA cookies and reloads
      assert(google.length === 0, 'Google request after withdrawal: ' + JSON.stringify(google));
      assert((await gaCookies()).length === 0 && (await cookie('cmplz_statistics')) === 'deny', `after withdrawal: cookies ${await gaCookies()}, cmplz_statistics=${await cookie('cmplz_statistics')}`);
      await reload();
      assert(google.length === 0 && (await gaCookies()).length === 0, 'tag or _ga back after withdrawal + reload');
      out.push('withdrawal: _ga removed, page reloaded, no Google request after it');
      const cmplz = (await b.send('Network.getAllCookies')).cookies.filter((c) => /^cmplz_/.test(c.name));
      const days = Math.round(Math.max(...cmplz.map((c) => c.expires)) * 1000 - Date.now()) / 864e5;
      assert(cmplz.every((c) => c.path === '/'), 'cmplz_* cookie not on path=/: ' + JSON.stringify(cmplz.map((c) => [c.name, c.path])));
      out.push(`cmplz_* cookies: ${cmplz.map((c) => c.name).join(', ')} (path=/, ~${Math.round(days)} days)`);
    } finally { await b.close(); }

    // 6. Phone first visit (screenshot) + the cached HTML holds no unblocked Google script on any page.
    const m = await openBrowser({ width: 390, height: 844, mobile: true, consent: 'fresh' });
    try {
      const hits = await interceptGoogle(m);
      await m.goto(BASE + '/', 1500);
      const st = await m.evaluate(`(() => { const e = document.querySelector('.cmplz-cookiebanner'), r = e.getBoundingClientRect(); return { show: e.classList.contains('cmplz-show'), h: Math.round(r.height), bottom: Math.round(r.bottom), w: Math.round(r.width), sw: document.documentElement.scrollWidth }; })()`);
      assert(st.show && st.bottom <= 844 && st.h < 844 * 0.5 && st.sw <= 390, 'phone banner: ' + JSON.stringify(st));
      assert(hits.length === 0, 'phone first visit: Google requests ' + JSON.stringify(hits));
      await m.screenshot(join(SHOTS, 'banner-390.png'), { full: false });
      out.push(`phone: banner ${st.w}×${st.h} px (${Math.round((st.h / 844) * 100)} % of the screen), no overflow, 0 Google requests`);
    } finally { await m.close(); }
    for (const path of PAGES) {
      const h = await (await fetch(BASE + path)).text();
      assert(!/<script[^>]+\ssrc="https:\/\/www\.googletagmanager\.com/.test(h) && /data-category="statistics" id="google_gtagjs-js"/.test(h), `${path}: Google tag not in its blocked form`);
    }
    out.push(`every page (${PAGES.length}): the served HTML holds the tag blocked`);
    console.log('consent: ok\n  ' + out.join('\n  '));
  },
};

const name = process.argv[2];
if (name === 'all') {
  let failed = 0;
  for (const [n, fn] of Object.entries(SCENARIOS)) { try { await fn(); } catch (e) { failed++; console.error(`${n}: FAIL — ${e.message}`); } }
  process.exit(failed ? 1 : 0);
} else if (!SCENARIOS[name]) { console.error(`usage: node build/interact.mjs <${Object.keys(SCENARIOS).join('|')}|all> [--path=/x/] [--base=URL]`); process.exit(1); }
else SCENARIOS[name]().catch((e) => { console.error(`${name}: FAIL — ${e.message}`); process.exit(1); });
