/**
 * Turns markup copied from the *.dc.html templates into what WordPress serves (port of martinadamus
 * build/lib/finalize.mjs): state styles (style-hover/-active/-focus) become classes in states.css, inline
 * style="…" attributes become generated tk-s-<hash> classes (R36: rules served per page from
 * assets/css/pages/<slug>.css), prototype links ("Cviceni.dc.html#videa") become site paths ("/cviceni/#videa"),
 * images `./img/<file>` / `./client-img/<file>` (<img src> and CSS url()) become the WebP upload
 * `/wp-content/uploads/<name>.webp` that `wp tk media-import` creates (collected for build/media.json), links with
 * target="_blank" get rel="noopener" (other rel tokens such as the design's nofollow are kept), and any template
 * syntax left over from the prototype (holes, handlers, refs, the font picker) is an error.
 *
 * R36 precedence: the theme puts every other stylesheet into the cascade layer `tk` and serves these class
 * rules unlayered, so they beat any normal author rule regardless of specificity, exactly like the style
 * attribute did; their !important declarations go into the layer `tk-important`, declared before `tk`
 * (inc/assets.php), so they beat every other !important rule too — again like inline. A site.css !important
 * (layer tk) still beats a normal tk-s-* rule, as a stylesheet !important beat a normal inline style.
 */
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { sitePath } from './routes.mjs';

const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:="[^"]*")?)*)\s*(\/?)>/g;
const ATTR = /\s+([^\s=>\/]+)(?:="([^"]*)")?/g;
const STATES = { 'style-hover': ['h', 'hover'], 'style-active': ['a', 'active'], 'style-focus': ['f', 'focus'] };
const RENAME = { noValidate: 'novalidate', inputMode: 'inputmode', tabIndex: 'tabindex', referrerPolicy: 'referrerpolicy', maxLength: 'maxlength', autoComplete: 'autocomplete', readOnly: 'readonly' };
const BOOLEAN = new Set(['novalidate', 'readonly']);
// Leftover prototype syntax: holes, DC elements, React handlers/refs, prototype links, the review-only font
// picker, state attributes or style attributes the tag rewriter never saw (e.g. single-quoted ones; the tag
// body is scanned quote-aware so a `>` inside a quoted attribute cannot hide a style=).
const FORBIDDEN = [/\{\{/, /<sc-(?:if|for)\b/, /<dc-import\b/, /<x-dc\b/, /<helmet\b/, /\son[A-Z][a-zA-Z]*=/, /\sref="/, /\.dc\.html/, /\sdata-font=/, /font-picker/, /\sstyle-(?:hover|active|focus)=/, /<[a-zA-Z](?:"[^"]*"|'[^']*'|[^>"'])*\sstyle\s*=/i];
const STYLE_CLASS = /\btk-s-[0-9a-f]{8}\b/g;
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };

/** Root-relative URL of the WebP upload `wp tk media-import` makes from a source image (flat uploads, R41 port). */
export const uploadUrl = (src) => '/wp-content/uploads/' + basename(String(src)).replace(/\.(jpe?g|png|webp)$/i, '') + '.webp';

/**
 * Image sources the pipeline knows (port of martinadamus IMAGE_DIRS): `./client-img/<file>` = the repo's
 * client-img/ (photos the client supplies; `wp tk media-import` reads that directory), `./img/<file>` = the
 * prototype's form (the design handoff has no img/ directory; such a file must also be put into client-img/).
 */
export const IMAGE_DIRS = ['img', 'client-img'];
const IMG_SRC = new RegExp(`^\\./(?:${IMAGE_DIRS.join('|')})/`);
const IMG_URL = new RegExp(`url\\((['"]?)\\./(?:${IMAGE_DIRS.join('|')})/([^'")]+)\\1\\)`, 'g');
export const isImageSrc = (src) => IMG_SRC.test(String(src));

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 6);
const importantify = (css) => css.split(';').map((d) => d.trim()).filter(Boolean)
  .map((d) => (/!\s*important$/i.test(d) ? d : `${d} !important`)).join(';');

/** Attribute value -> raw text (the CSS lands in a <style> element, where entities mean nothing). */
const decode = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, x, n) => (d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : ENTITIES[n.toLowerCase()] ?? m));

/**
 * Split a declaration list on top-level semicolons (not inside quotes or parentheses: url(data:…;…),
 * content:";"), normalise each declaration to `prop:value[ !important]` — property lowercased unless it is
 * a custom property (case-sensitive), whitespace outside strings collapsed — and drop empty ones.
 */
export function parseDeclarations(css) {
  const parts = [];
  let cur = '', depth = 0, quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { cur += c; if (c === '\\' && i + 1 < css.length) cur += css[++i]; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  const squash = (v) => v.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\s+/g, (m, str) => str || ' ').trim();
  return parts.map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':');
    if (i <= 0) throw new Error(`Malformed inline declaration "${d}" in style="${css}"`);
    const prop = d.slice(0, i).trim();
    let value = squash(d.slice(i + 1));
    const important = /!\s*important$/i.test(value);
    if (important) value = value.replace(/\s*!\s*important$/i, '');
    if (!value) throw new Error(`Empty value in inline declaration "${d}"`);
    return { prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value, important };
  });
}

function guard(text) {
  for (const re of FORBIDDEN) {
    const i = text.search(re);
    if (i >= 0) throw new Error(`Unconverted prototype syntax ${re} near: ${text.slice(Math.max(0, i - 80), i + 80)}`);
  }
}

export function createFinalizer() {
  const rules = new Map();
  const media = new Map();    // file name -> alt (first non-empty alt wins)
  const styles = new Map();   // tk-s-<hash> -> { body, normal, important } declaration strings

  /** style="…" -> one generated class holding exactly those declarations (identical sets share it). */
  function styleClass(raw) {
    // url(&quot;./img/…&quot;) only becomes url("./img/…") after decoding, so images are rewritten here as well.
    const css = rewriteUrls(decode(raw));
    guard(css);
    if (/<\/?style/i.test(css)) throw new Error(`Inline style would break out of <style>: ${css}`);
    const decls = parseDeclarations(css);
    if (!decls.length) return null;
    const text = (d) => `${d.prop}:${d.value}`;
    const body = decls.map((d) => text(d) + (d.important ? ' !important' : '')).join(';');
    const cls = `tk-s-${createHash('sha1').update(body).digest('hex').slice(0, 8)}`;
    const entry = { body, normal: decls.filter((d) => !d.important).map(text).join(';'), important: decls.filter((d) => d.important).map((d) => `${text(d)} !important`).join(';') };
    const prev = styles.get(cls);
    if (prev && prev.body !== body) throw new Error(`Style class hash collision ${cls}: "${prev.body}" vs "${body}"`);
    styles.set(cls, entry);
    return cls;
  }

  function stateClass(kind, raw) {
    const css = decode(raw);
    guard(css);
    const [prefix, pseudo] = STATES[kind];
    const body = importantify(css);
    const cls = `tk-${prefix}-${hash(`${pseudo}|${body}`)}`;
    if (!rules.has(cls)) {
      const rule = `.${cls}:${pseudo}{${body}}`;
      // Hover only where a real pointer exists (a tap must never leave a "stuck" hover state).
      rules.set(cls, pseudo === 'hover' ? `@media (hover:hover) and (pointer:fine){${rule}}` : rule);
    }
    return cls;
  }

  function img(src, alt = '') {
    const file = basename(String(src));
    if (!media.has(file) || (!media.get(file) && alt)) media.set(file, alt);
    return uploadUrl(src);
  }

  function rewriteUrls(text) {
    return text.replace(IMG_URL, (m, q, file) => `url(${q}${img(file)}${q})`);
  }

  function rewriteTag(whole, name, attrText, selfClose) {
    const tag = name.toLowerCase();
    const attrs = [...attrText.matchAll(ATTR)].map((m) => [RENAME[m[1]] || m[1], m[2]]);
    const get = (k) => attrs.find(([n]) => n === k)?.[1];
    const classes = (get('class') || '').split(/\s+/).filter(Boolean);
    const out = [];
    let inline = null;
    for (const [k, v] of attrs) {
      if (STATES[k]) { if (v && v.trim()) classes.push(stateClass(k, v)); continue; }
      if (k === 'class') continue;
      if (k === 'style') { if (v && v.trim()) inline = styleClass(v); continue; }
      if (BOOLEAN.has(k)) { out.push([k, undefined]); continue; }
      if (k === 'href' && v !== undefined) { out.push([k, sitePath(v)]); continue; }
      if (k === 'src' && tag === 'img' && v && isImageSrc(v)) { out.push([k, img(v, get('alt'))]); continue; }
      out.push([k, v]);
    }
    // A new tab never gets a handle on this page (window.opener): rel gains noopener; nofollow etc. stay as designed.
    if (tag === 'a' && get('target') === '_blank') {
      const rel = out.find(([k]) => k === 'rel');
      const tokens = new Set(String(rel?.[1] || '').split(/\s+/).filter(Boolean));
      tokens.add('noopener');
      if (rel) rel[1] = [...tokens].join(' '); else out.push(['rel', [...tokens].join(' ')]);
    }
    if (inline) classes.push(inline);
    const cls = [...new Set(classes)];
    if (cls.length) out.push(['class', cls.join(' ')]);
    const text = out.map(([k, v]) => (v === undefined ? ` ${k}` : ` ${k}="${v}"`)).join('');
    return `<${name}${text}${selfClose ? ' /' : ''}>`;
  }

  return {
    /** Register an image used outside the page markup (e.g. an og:image); returns its upload URL. */
    addMedia: (src, alt = '') => img(src, alt),
    finalize(html) {
      const out = rewriteUrls(html).replace(TAG, rewriteTag);
      guard(out);
      return out;
    },
    /**
     * The generated rules for the tk-s-* classes used in `html` (a page's finalized sections), sorted:
     * normal declarations unlayered, !important ones in @layer tk-important (see the header comment).
     */
    styleCss(html) {
      const used = [...new Set(String(html).match(STYLE_CLASS) || [])].filter((c) => styles.has(c)).sort();
      const normal = used.filter((c) => styles.get(c).normal).map((c) => `.${c}{${styles.get(c).normal}}`);
      const important = used.filter((c) => styles.get(c).important).map((c) => `.${c}{${styles.get(c).important}}`);
      return normal.join('\n') + (normal.length ? '\n' : '') + (important.length ? `@layer tk-important{\n${important.join('\n')}\n}\n` : '');
    },
    /** build/media.json for `wp tk media-import`: every image the pages use, with its alt, sorted by file. */
    media() {
      return [...media.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([file, alt]) => ({ file, alt }));
    },
    statesCss() {
      return [...rules.keys()].sort().map((k) => rules.get(k)).join('\n') + (rules.size ? '\n' : '');
    },
  };
}
