/**
 * In-page probes shared by several checks (stringified and evaluated in the page — self-contained),
 * plus the Node-side helpers that finish their measurements.
 */

/**
 * Text contrast of every visible text element (and input placeholders), K3-style but over the
 * EFFECTIVE background: the paint stack at the text's centre (elementsFromPoint) is composited down to
 * the first opaque background. Text over a photo, gradient or video is marked image:true and measured
 * from screenshot pixels in Node (pixelContrast). Fixed elements are measured at scrollY 0 (where the
 * capture shows them), everything else scrolled to the viewport centre.
 */
export function contrastProbe() {
  const parse = (c) => { const m = (String(c).match(/[\d.]+/g) || ['0', '0', '0']).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
  const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (!a) return [0, 0, 0, 0]; return [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a); };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const pageBg = (() => { const h = parse(getComputedStyle(document.documentElement).backgroundColor); const b = parse(getComputedStyle(document.body).backgroundColor); return b[3] ? over(b, h[3] ? h : [255, 255, 255, 1]) : (h[3] ? h : [255, 255, 255, 1]); })();
  const isFixed = (el) => { for (let p = el; p && p.nodeType === 1; p = p.parentElement) if (/fixed|sticky/.test(getComputedStyle(p).position)) return true; return false; };
  const opacityOf = (el) => { let o = 1; for (let p = el; p && p.nodeType === 1; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity); return o; };
  const hidden = (el) => { for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true; if (/hidden|clip/.test(cs.overflow) && p.getBoundingClientRect().width <= 1) return true; } return false; };
  const label = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '');

  // Candidate elements: parents of visible text nodes, plus inputs with a placeholder.
  const els = new Map();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    // aria-hidden text is decoration (WCAG 1.4.3 exempts it), e.g. the footer's 7 % wordmark; Lighthouse/axe still reports it.
    if (!el || el.closest('script,style,noscript,template,svg,[aria-hidden="true"]') || els.has(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible') continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rect = [...r.getClientRects()].find((x) => x.width > 1 && x.height > 1);
    if (!rect || hidden(el) || opacityOf(el) < 0.05) continue;
    els.set(el, { node: n, placeholder: false });
  }
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((i) => { if (i.getClientRects().length && getComputedStyle(i).visibility === 'visible' && i.placeholder && !i.value) els.set(i, { placeholder: true }); });

  const out = [];
  const fixedFirst = [...els.keys()].sort((a, b) => Number(isFixed(b)) - Number(isFixed(a)));
  for (const el of fixedFirst) {
    const info = els.get(el);
    const fixed = isFixed(el);
    const measureRect = () => { if (info.placeholder) return el.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(info.node); return [...r.getClientRects()].find((x) => x.width > 1 && x.height > 1) || el.getBoundingClientRect(); };
    if (fixed) scrollTo(0, 0);
    else { const r0 = measureRect(); if (r0.top < 80 || r0.bottom > innerHeight - 10) scrollTo(0, Math.max(0, r0.top + scrollY - innerHeight / 2)); }
    const r = measureRect();
    const cs = getComputedStyle(el);
    let color = parse(info.placeholder ? getComputedStyle(el, '::placeholder').color : cs.color);
    color = [color[0], color[1], color[2], color[3] * opacityOf(el)];
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const stack = document.elementsFromPoint(x, y);
    let i = stack.indexOf(el);
    let path = i >= 0 ? stack.slice(i) : [];
    if (i < 0) { path = []; for (let p = el; p && p.nodeType === 1; p = p.parentElement) path.push(p); }
    const layers = [];
    let image = false, opaque = false;
    for (const s of path) {
      const sc = getComputedStyle(s);
      if (/^(IMG|VIDEO|CANVAS|PICTURE|IFRAME)$/.test(s.tagName) && s !== el) { image = true; break; }
      if (sc.backgroundImage && sc.backgroundImage !== 'none') { image = true; break; }
      const bg = parse(sc.backgroundColor);
      if (bg[3] > 0) { layers.push(bg); if (bg[3] >= 1) { opaque = true; break; } }
    }
    let bg = opaque ? layers.pop() : pageBg;
    while (layers.length) bg = over(layers.pop(), bg);
    const fg = over(color, bg);
    const text = (info.placeholder ? el.placeholder : el.textContent).trim().replace(/\s+/g, ' ').slice(0, 50);
    out.push({
      el: label(el), text, placeholder: info.placeholder, fixed,
      color: `rgb(${color.slice(0, 3).map(Math.round)})${color[3] < 1 ? ' @' + color[3].toFixed(2) : ''}`, colorRgba: color,
      bg: image ? null : `rgb(${bg.slice(0, 3).map(Math.round)})`, bgRgb: image ? null : bg.slice(0, 3),
      image, ratio: image ? null : Math.round(ratio(fg, bg) * 100) / 100,
      doc: { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      fontSize: cs.fontSize, weight: cs.fontWeight, pvStack: i >= 0,
    });
  }
  scrollTo(0, 0);
  return out;
}

const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrastRatio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/**
 * Contrast of text over a photo/gradient from the frozen full-page capture: pixels of the text box that
 * are clearly not glyph pixels (colour distance > 90 from the text colour) are the background; the text
 * colour is composited over their median and the ratio against that median is reported (plus the 10th
 * percentile, the worst part of the backdrop, for information).
 */
export function pixelContrast(img, run) {
  const { x, y, w, h } = run.doc;
  const [tr, tg, tb, ta] = run.colorRgba;
  const px = [];
  for (let yy = Math.max(0, y); yy < Math.min(img.height, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(img.width, x + w); xx++) {
    const o = (yy * img.width + xx) * 4;
    const p = [img.data[o], img.data[o + 1], img.data[o + 2]];
    if (Math.hypot(p[0] - tr, p[1] - tg, p[2] - tb) > 90) px.push(p);
  }
  if (px.length < 8) return null;
  px.sort((a, b) => lum(a) - lum(b));
  const med = px[Math.floor(px.length / 2)];
  const fg = [0, 1, 2].map((i) => run.colorRgba[i] * ta + med[i] * (1 - ta));
  const ratios = px.map((p) => contrastRatio([0, 1, 2].map((i) => run.colorRgba[i] * ta + p[i] * (1 - ta)), p)).sort((a, b) => a - b);
  return { ratio: Math.round(contrastRatio(fg, med) * 100) / 100, p10: Math.round(ratios[Math.floor(ratios.length * 0.1)] * 100) / 100, bg: `rgb(${med.join(',')})`, samples: px.length };
}

/** Visible text of the page (see tone.mjs): rendered, on-page, not clipped/hidden, text-transform applied. */
export function visibleText(rootSel, skipSel) {
  const blockOf = (el) => { for (let p = el; p; p = p.parentElement) if (!getComputedStyle(p).display.startsWith('inline')) return p; return document.body; };
  const hiddenUp = (el) => {
    let op = 1;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
      const cs = getComputedStyle(p);
      op *= parseFloat(cs.opacity);
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true;
      if (/hidden|clip/.test(cs.overflow) && p.getBoundingClientRect().width <= 1) return true;
    }
    return op < 0.05;
  };
  const docW = document.documentElement.clientWidth, sy = scrollY;
  const rectsOf = (t) => { const r = document.createRange(); r.selectNodeContents(t); return [...r.getClientRects()].filter((x) => x.width > 1 && x.height > 1); };
  const rendered = (t) => rectsOf(t).length > 0;
  const onScreen = new Map();
  const blockOnScreen = (blk) => {
    const tw = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = tw.nextNode())) {
      const p = t.parentElement;
      if (!t.nodeValue.trim() || !p || blockOf(p) !== blk || getComputedStyle(p).visibility !== 'visible') continue;
      if (rectsOf(t).some((x) => x.right > 0 && x.left < docW && x.bottom + sy > 0)) return true;
    }
    return false;
  };
  const w = document.createTreeWalker((rootSel && document.querySelector(rootSel)) || document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let out = '', lastBlock = null, n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 1) { if (n.tagName === 'BR') out += ' '; continue; }
    const t = n.nodeValue;
    if (!t.trim()) { out += ' '; continue; }
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,template,svg title')) continue;
    if (skipSel && el.closest(skipSel)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible') continue;
    // Rendered at all (display:none etc. gives no rects) …
    if (!rendered(n)) continue;
    if (hiddenUp(el)) continue;
    // … and on screen, decided per block (the inline content of one block box), not per text node: the
    // client-rendered reference splits `„{{ r.text }}“` into `„` + <span>text</span> + `“`, the server-
    // rendered page has one node. Per node, a marquee card cut by the viewport edge kept the local closing
    // quote (its single node reaches into the viewport) and dropped the reference's (its own node lies past
    // the edge) although both render identically (R66's wider face moved the line end past the edge).
    const blk0 = blockOf(el);
    if (!onScreen.has(blk0)) onScreen.set(blk0, blockOnScreen(blk0));
    if (!onScreen.get(blk0)) continue;
    let s = t;
    if (cs.textTransform === 'uppercase') s = s.toLocaleUpperCase('cs');
    else if (cs.textTransform === 'lowercase') s = s.toLocaleLowerCase('cs');
    const blk = blockOf(el);
    out += (blk === lastBlock ? '' : ' ') + s;
    lastBlock = blk;
  }
  const attrs = [...document.querySelectorAll('[placeholder], [aria-label], [title], input[type=submit], input[type=button], button[value]')]
    .filter((e) => e.getClientRects().length || e.closest('header'))
    .flatMap((e) => [e.getAttribute('placeholder'), e.getAttribute('aria-label'), e.getAttribute('title'), /submit|button/.test(e.type) && e.tagName === 'INPUT' ? e.value : null])
    .filter(Boolean);
  return { text: out, attrs: [...new Set(attrs)], branch: document.documentElement.dataset.branch || '' };
}
