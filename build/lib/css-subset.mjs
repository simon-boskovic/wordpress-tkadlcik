/**
 * Pure helpers for build/css-subset.mjs (no DOM, no network): a small CSS block parser that keeps every rule's
 * exact source text, a selector simplifier for "could this rule ever match?", and the serializer that writes a
 * subset made only of untouched source slices.
 *
 * The rule of the subset: a style rule is dropped only when NONE of its selectors can match any element of any
 * built page, after the selector was widened as follows (widening only ever keeps more):
 *   - every pseudo-class and pseudo-element is removed (:hover, :focus, ::before, :not(…), :is(…), :has(…) …);
 *   - every simple selector naming something the shipped JavaScript could add at run time is removed: a class,
 *     id, element or attribute name that occurs as a word in any script the pages load (or in DYNAMIC_EXTRA),
 *     and data-* attributes whose camelCase form occurs (el.dataset.fooBar);
 *   - a compound left empty becomes `*`.
 * Rules are never rewritten (a selector list is kept whole when one selector of it can match, so a list that a
 * browser drops as invalid stays exactly as invalid). @media/@supports/@layer/@container/@scope blocks are
 * filtered recursively and dropped when empty; @keyframes are kept when their name is used by the kept CSS or
 * by a script; every other at-rule (@font-face, @property, @import, @charset, @layer statements …) is kept.
 */

/** At-rules whose block holds rules (filtered recursively). */
const GROUPING = new Set(['media', 'supports', 'layer', 'container', 'scope', 'document', '-moz-document', 'starting-style']);

/**
 * Skip a string or comment starting at i; returns the index after it, or i when there is none.
 * @param {string} s
 * @param {number} i
 */
function skipOpaque(s, i) {
  const c = s[i];
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1;
    return Math.min(j + 1, s.length);
  }
  if (c === '/' && s[i + 1] === '*') {
    const end = s.indexOf('*/', i + 2);
    return end === -1 ? s.length : end + 2;
  }
  return i;
}

/** Index of the "}" closing the block whose "{" is at `open`. */
function matchBrace(s, open) {
  let depth = 0;
  let paren = 0; // braces inside ( … ), e.g. an unquoted url(a{b).png), do not count
  for (let i = open; i < s.length;) {
    const k = skipOpaque(s, i);
    if (k !== i) { i = k; continue; }
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '(') paren++;
    else if (s[i] === ')') paren = Math.max(0, paren - 1);
    else if (paren === 0 && s[i] === '{') depth++;
    else if (paren === 0 && s[i] === '}' && --depth === 0) return i;
    i++;
  }
  return s.length - 1;
}

/**
 * Parse a stylesheet (or a block's content) into items with source offsets.
 * @param {string} s
 * @param {number} [from]
 * @param {number} [to]
 * @returns {Array<{type:'rule'|'at'|'stmt', start:number, end:number, prelude:string, name?:string, bodyStart?:number, bodyEnd?:number, children?:any[]}>}
 */
export function parseCss(s, from = 0, to = s.length) {
  const items = [];
  let i = from;
  while (i < to) {
    // Leading whitespace and comments belong to no rule (they are dropped from the subset).
    if (/\s/.test(s[i])) { i++; continue; }
    const k = skipOpaque(s, i);
    if (k !== i && s[i] === '/') { i = k; continue; }

    const start = i;
    let j = i;
    let brace = -1;
    let semi = -1;
    while (j < to) {
      const kk = skipOpaque(s, j);
      if (kk !== j) { j = kk; continue; }
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === '(') { // ( … ) may hold ; or { in a url()/supports() — skip balanced
        let d = 0;
        for (; j < to; j++) {
          const q = skipOpaque(s, j);
          if (q !== j) { j = q - 1; continue; }
          if (s[j] === '(') d++;
          else if (s[j] === ')' && --d === 0) break;
        }
        j++;
        continue;
      }
      if (s[j] === '{') { brace = j; break; }
      if (s[j] === ';') { semi = j; break; }
      if (s[j] === '}') break; // stray
      j++;
    }

    const prelude = s.slice(start, brace !== -1 ? brace : semi !== -1 ? semi : j).trim();
    if (brace === -1) {
      if (semi === -1) { i = j + 1; continue; } // stray text / "}" — ignored
      if (prelude.startsWith('@')) items.push({ type: 'stmt', start, end: semi + 1, prelude });
      i = semi + 1;
      continue;
    }

    const close = matchBrace(s, brace);
    if (prelude.startsWith('@')) {
      const name = /^@([-\w]+)/.exec(prelude)?.[1]?.toLowerCase() ?? '';
      const item = { type: 'at', start, end: close + 1, prelude, name, bodyStart: brace + 1, bodyEnd: close };
      if (GROUPING.has(name)) item.children = parseCss(s, brace + 1, close);
      items.push(item);
    } else {
      items.push({ type: 'rule', start, end: close + 1, prelude, bodyStart: brace + 1, bodyEnd: close });
    }
    i = close + 1;
  }
  return items;
}

/**
 * Split on top-level commas (outside (), [] and strings).
 * @param {string} sel
 * @returns {string[]}
 */
export function splitSelectorList(sel) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < sel.length; i++) {
    const k = skipOpaque(sel, i);
    if (k !== i) { cur += sel.slice(i, k); i = k - 1; continue; }
    const c = sel[i];
    if (c === '\\') { cur += sel.slice(i, i + 2); i++; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Unescape a CSS identifier (\: → :, \31 → 1) for comparing with words. */
const unescapeIdent = (id) => id.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (m, e) => (/^[0-9a-fA-F]/.test(e) && e.trim().length > 1 ? String.fromCodePoint(parseInt(e, 16)) : e.trim() || e));

/**
 * Read an identifier (with escapes) at i.
 * @returns {[string, number]} [raw text, next index]
 */
function readIdent(s, i) {
  let j = i;
  while (j < s.length) {
    if (s[j] === '\\') { j += 2; continue; }
    if (/[\w\-\u0080-￿]/.test(s[j])) { j++; continue; }
    break;
  }
  return [s.slice(i, j), j];
}

/** Index after the balanced ( … ) or [ … ] starting at i. */
function skipGroup(s, i) {
  const open = s[i];
  const close = open === '(' ? ')' : ']';
  let d = 0;
  for (let j = i; j < s.length; j++) {
    const k = skipOpaque(s, j);
    if (k !== j) { j = k - 1; continue; }
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === open) d++;
    else if (s[j] === close && --d === 0) return j + 1;
  }
  return s.length;
}

/**
 * Widen one complex selector for matching (see the file comment). Returns a selector usable with
 * querySelector, or null when it cannot be understood (the caller then keeps the rule).
 * @param {string} sel
 * @param {(kind:'class'|'id'|'type'|'attr', name:string) => boolean} isDynamic
 * @returns {string|null}
 */
export function widenSelector(sel, isDynamic) {
  const parts = []; // compound, combinator, compound, …
  let compound = '';
  let seen = false; // the current compound had a simple selector (even one that was removed)
  const s = sel.trim();
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[\s>+~]/.test(c)) {
      let comb = ' ';
      while (i < s.length && /[\s>+~]/.test(s[i])) { if (!/\s/.test(s[i])) comb = s[i]; i++; }
      if (!parts.length && !seen) return null; // relative selector (nesting) — not handled
      parts.push(compound || '*', comb === ' ' ? ' ' : ` ${comb} `);
      compound = '';
      seen = false;
      continue;
    }
    seen = true;
    if (c === '.' || c === '#') {
      const [raw, j] = readIdent(s, i + 1);
      if (!raw) return null;
      if (!isDynamic(c === '.' ? 'class' : 'id', unescapeIdent(raw))) compound += c + raw;
      i = j;
      continue;
    }
    if (c === '[') {
      const j = skipGroup(s, i);
      const name = /^\[\s*(?:[\w-]*\|)?([\w-]+)/.exec(s.slice(i, j))?.[1];
      if (!name) return null;
      if (!isDynamic('attr', name.toLowerCase())) compound += s.slice(i, j);
      i = j;
      continue;
    }
    if (c === ':') { // pseudo-classes and pseudo-elements are removed
      const [raw, k] = readIdent(s, i + (s[i + 1] === ':' ? 2 : 1));
      if (!raw) return null;
      i = s[k] === '(' ? skipGroup(s, k) : k;
      continue;
    }
    if (c === '*') { i++; continue; }
    if (/[\w\-\u0080-\uffff\\]/.test(c)) {
      const [raw, j] = readIdent(s, i);
      if (!raw) return null;
      if (!isDynamic('type', unescapeIdent(raw).toLowerCase())) compound = raw + compound; // the type comes first
      i = j;
      continue;
    }
    return null; // &, |, % … — not understood: the caller keeps the rule
  }
  parts.push(compound || '*');
  return parts.join('');
}

/**
 * Words that scripts could turn into class/id/attribute/element names.
 * @param {string[]} scripts Script sources.
 * @returns {Set<string>}
 */
export function scriptWords(scripts) {
  const words = new Set();
  for (const js of scripts) {
    for (const m of js.matchAll(/[A-Za-z_][\w-]*/g)) {
      const w = m[0];
      words.add(w);
      words.add(w.toLowerCase());
      // el.dataset.fooBar ↔ data-foo-bar
      if (/^[a-z][a-zA-Z0-9]*$/.test(w)) words.add('data-' + w.replace(/[A-Z]/g, (u) => '-' + u.toLowerCase()));
    }
  }
  return words;
}

/**
 * Build the predicate used by widenSelector().
 * @param {Set<string>} words scriptWords() result.
 * @param {string[]} [extra] Further names treated as dynamic (documented in build/css-subset.mjs).
 */
export function dynamicPredicate(words, extra = []) {
  const ex = new Set(extra);
  return (kind, name) => ex.has(name) || words.has(name);
}

/**
 * Collect every selector of every style rule (for the matcher), each once.
 * @param {string} css
 * @param {ReturnType<typeof parseCss>} items
 * @param {Set<string>} [out]
 */
export function collectSelectors(css, items, out = new Set()) {
  for (const it of items) {
    if (it.type === 'rule') for (const s of splitSelectorList(it.prelude)) out.add(s);
    else if (it.children) collectSelectors(css, it.children, out);
  }
  return out;
}

/**
 * Serialize the subset: kept rules as their exact source text, grouping at-rules re-emitted as
 * "prelude{children}" around their kept children, @keyframes kept when keepKeyframes(name, keptCss) says so
 * (decided after the style rules, against the kept text).
 * @param {string} css
 * @param {ReturnType<typeof parseCss>} items
 * @param {(selectors: string[]) => boolean} keepRule
 * @param {(name: string, keptCss: string) => boolean} keepKeyframes
 * @returns {{css: string, dropped: string[]}}
 */
export function buildSubset(css, items, keepRule, keepKeyframes) {
  const dropped = [];
  const kfName = (it) => (/^@[-\w]+\s+([^\s{]+)/.exec(it.prelude)?.[1] ?? '').replace(/^["']|["']$/g, '');
  // Pass 1: style rules only (keyframes left out), to know which animation names the kept CSS uses.
  const render = (list, kf) => list.map((it) => {
    if (it.type === 'rule') return keepRule(splitSelectorList(it.prelude)) ? css.slice(it.start, it.end) : '';
    if (it.type === 'at' && it.children) {
      const inner = render(it.children, kf);
      return inner ? `${it.prelude}{${inner}}` : '';
    }
    if (it.type === 'at' && /keyframes$/.test(it.name)) return kf ? (kf(kfName(it)) ? css.slice(it.start, it.end) : '') : '';
    return css.slice(it.start, it.end);
  }).filter(Boolean).join('');
  const rulesOnly = render(items, null);
  const out = render(items, (name) => keepKeyframes(name, rulesOnly));

  // What went, for the report.
  const note = (list) => {
    for (const it of list) {
      if (it.type === 'rule' && !keepRule(splitSelectorList(it.prelude))) dropped.push(it.prelude);
      else if (it.children) note(it.children);
      else if (it.type === 'at' && /keyframes$/.test(it.name) && !keepKeyframes(kfName(it), rulesOnly)) dropped.push(it.prelude);
    }
  };
  note(items);
  return { css: out, dropped };
}
