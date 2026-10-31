/**
 * reduced-motion and animations — both read every animation/transition the browser actually starts through
 * the CDP Animation domain (Animation.animationStarted), so nothing that runs between two samples can slip
 * through, and resolve each one to its element.
 *
 * DoD §3 (canvas.json notes.tone "POHYB"): scroll reveal once per element (IntersectionObserver), fade + 14 px
 * (`revealUp`), 60 ms stagger per batch (max 4 steps), ease-out cubic-bezier(.23,1,.32,1); entrance `.rise`;
 * breathing circle 5 s in / 5 s out (one 10 s cycle); buttons scale(.97) in 160 ms with the same easing;
 * prefers-reduced-motion → fade only (opacity keyframes / non-motion transitions), nothing infinite.
 */
import { DEVICE_SETS, MOTION } from '../config.mjs';
import { openDevice, sleep, waitRendered } from '../session.mjs';

const uniq = (list) => [...new Set(list)];

/** In-page: describe an animated element (called on the node via Runtime.callFunctionOn). */
function describeNode() {
  const el = this.nodeType === 1 ? this : this.parentElement;
  if (!el) return { label: '#' + this.nodeName };
  const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).filter((c) => !/^tk-s-/.test(c)).slice(0, 2).join('.') : '');
  const text = ((el.innerText || el.getAttribute('alt') || el.getAttribute('aria-label') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 30);
  return { label: `${tag}${text ? ` “${text}”` : ''}`, reveal: el.classList.contains('reveal'), rise: el.classList.contains('rise') };
}

/** Record Animation.animationStarted events; phase is a label the caller moves along (load → scroll …). */
async function trackAnimations(b) {
  await b.send('DOM.enable').catch(() => {});
  await b.send('Animation.enable');
  const list = [];
  const tracker = { list, phase: 'load' };
  const off = b.on('Animation.animationStarted', ({ animation: a }) => list.push({
    type: a.type, name: a.name || '', duration: Math.round(a.source?.duration ?? 0), delay: Math.round(a.source?.delay ?? 0),
    iterations: a.source?.iterations, easing: a.source?.easing || '', node: a.source?.backendNodeId, phase: tracker.phase, t: Date.now(),
  }));
  tracker.stop = async () => {
    off();
    const cache = new Map();
    for (const a of list) {
      if (!a.node) { a.label = '(pseudo/document)'; a.reveal = false; continue; }
      if (!cache.has(a.node)) {
        try {
          const { object } = await b.send('DOM.resolveNode', { backendNodeId: a.node });
          const r = await b.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: describeNode.toString(), returnByValue: true });
          cache.set(a.node, r.result.value);
        } catch { cache.set(a.node, { label: '(node gone)', reveal: false }); }
      }
      Object.assign(a, cache.get(a.node));
    }
    await b.send('Animation.disable').catch(() => {});
    return list;
  };
  return tracker;
}

/** In-page: the properties each @keyframes rule animates (outside reduced-motion media), plus its from-state. */
function keyframesInfo() {
  const out = {};
  const walk = (rules) => { for (const r of rules) {
    if (r.type === CSSRule.KEYFRAMES_RULE) {
      const props = new Set(); let from = '';
      for (const f of r.cssRules) { for (let i = 0; i < f.style.length; i++) props.add(f.style[i]); if (/^(from|0%)$/.test(f.keyText)) from = f.style.cssText; }
      out[r.name] = { props: [...props], from };
    } else if (r.cssRules) walk(r.cssRules);
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
  return out;
}

/** In-page: reveal targets (.reveal), keyed by text (first 30 chars) so reference and local can be matched. */
function revealTargets() {
  const seen = new Map();
  const key = (el) => {
    const t = ((el.innerText || '') + '').trim().replace(/\s+/g, ' ').slice(0, 30) || el.tagName.toLowerCase();
    const n = (seen.get(t) || 0) + 1; seen.set(t, n);
    return n > 1 ? `${t} #${n}` : t;
  };
  return [...document.querySelectorAll('.reveal')].filter((t) => t.getClientRects().length).map((t) => {
    const r = t.getBoundingClientRect(), cs = getComputedStyle(t);
    return { key: key(t), inView: r.bottom > 0 && r.top < innerHeight, visible: cs.visibility !== 'hidden', opacity: parseFloat(cs.opacity), translate: cs.translate };
  });
}

/** In-page: motion tokens read from the computed style of the first button / tab pill / breathing circle. */
function motionTokens() {
  const first = (sel) => [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
  const tr = (el, prop) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const ps = cs.transitionProperty.split(',').map((x) => x.trim()), ds = cs.transitionDuration.split(','), es = cs.transitionTimingFunction.split(/,(?![^(]*\))/);
    const i = ps.indexOf(prop);
    return i < 0 ? 'none' : `${parseFloat(ds[i % ds.length]) * 1000}ms ${es[i % es.length].trim()}`;
  };
  const btn = first('main .btn, header .btn');
  const pill = first('.tabs-active');
  const breath = first('.breath i');
  const bcs = breath && getComputedStyle(breath);
  const anim = (el) => { if (!el) return null; const c = getComputedStyle(el); return `${c.animationName} ${parseFloat(c.animationDuration) * 1000}ms ${c.animationTimingFunction}`; };
  return {
    reveal: anim(first('.reveal[data-visible]')),
    rise: anim(first('.rise')),
    button: tr(btn, 'transform'),
    tabs: tr(pill, 'clip-path'),
    breath: bcs ? `${bcs.animationName} ${parseFloat(bcs.animationDuration) * 1000}ms ${bcs.animationTimingFunction} ${bcs.animationIterationCount}` : null,
  };
}

const scrollSteps = async (b, onStep, pause = 300) => {
  const h = await b.evaluate('document.documentElement.scrollHeight');
  const step = await b.evaluate('Math.max(200, Math.round(innerHeight * 0.6))');
  for (let y = 0, i = 0; y <= h + step; y += step, i++) {
    await b.evaluate(`scrollTo(0, ${y})`);
    await sleep(pause);
    if (onStep) await onStep(i);
  }
};

const group = (anims) => {
  const m = new Map();
  for (const a of anims) {
    const k = `${a.type} ${a.name} ${a.duration}ms${a.iterations === null || a.iterations === Infinity ? ' ∞' : ''} ${a.easing} — ${a.label}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m].map(([k, n]) => (n > 1 ? `${n}× ${k}` : k));
};

/** Pure: is an animation started under prefers-reduced-motion allowed ("fade only")? */
export function reducedAllowed(a, keyframes = {}) {
  if (!(a.duration > 0)) return true;
  if (a.type === 'CSSTransition') return MOTION.nonMotionProperties.test(a.name);
  if (a.type === 'CSSAnimation') {
    if (a.iterations === null || a.iterations === Infinity) return false;
    const k = keyframes[a.name];
    if (k) return k.props.every((p) => p === 'opacity');
    return MOTION.reducedAllowedAnimations.includes(a.name);
  }
  return false;   // WebAnimation / view transition pseudo-elements: never under reduce
}

/* ------------------------------------------------------------------ reduced motion */

async function reducedRun(dev, url) {
  const b = await openDevice(dev, { reducedMotion: true });
  try {
    const tr = await trackAnimations(b);
    await b.goto(url, 1200);
    await waitRendered(b);
    tr.phase = 'scroll';
    await scrollSteps(b, null, 250);
    await b.evaluate('scrollTo(0, 0)');
    await sleep(1500);
    const keyframes = await b.evaluate(`(${keyframesInfo})()`);
    const final = await b.evaluate(`(() => {
      const targets = (${revealTargets})();
      const inf = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity)
        .map((a) => (a.animationName || a.transitionProperty || 'animation') + ' on ' + (a.effect.target ? a.effect.target.tagName.toLowerCase() + '.' + a.effect.target.className : '?'));
      const rise = [...document.querySelectorAll('.rise')].filter((e) => e.getClientRects().length && parseFloat(getComputedStyle(e).opacity) < 0.99).length;
      return { hidden: targets.filter((t) => t.visible && (t.opacity < 0.99 || (t.translate !== 'none' && t.translate !== '0px'))).map((t) => t.key), infinite: inf, riseHidden: rise };
    })()`);
    const anims = await tr.stop();
    const moving = anims.filter((a) => !reducedAllowed(a, keyframes));
    return { anims, moving, fades: anims.filter((a) => a.duration > 0 && reducedAllowed(a, keyframes)), final };
  } finally { await b.close(); }
}

export const reducedMotion = {
  name: 'reduced-motion',
  title: 'prefers-reduced-motion: fade only (no movement, nothing infinite), everything visible',
  async run(ctx) {
    const rows = [];
    for (const dev of DEVICE_SETS.reducedMotion) {
      const local = await reducedRun(dev, ctx.localUrl);
      const ref = await reducedRun(dev, ctx.refUrl);
      rows.push({ dev, local, ref, pass: !local.moving.length && !local.final.hidden.length && !local.final.infinite.length && !local.final.riseHidden });
    }
    const pass = rows.every((r) => r.pass);
    const md = rows.map((r) => [
      `**${r.dev}** — local: ${r.local.moving.length} moving animation(s)/transition(s), ${r.local.fades.length} fade(s) (allowed), ${r.local.final.hidden.length} reveal target(s) not fully visible, ${r.local.final.riseHidden} entrance element(s) hidden, ${r.local.final.infinite.length} infinite animation(s) running. Reference: ${r.ref.moving.length} moving, ${r.ref.final.hidden.length} hidden.`,
      '- local moving (not allowed):', ...group(r.local.moving).map((s) => `  - ${s}`), r.local.moving.length ? '' : '  - none',
      '- local fades (allowed):', ...group(r.local.fades).slice(0, 12).map((s) => `  - ${s}`), r.local.fades.length ? '' : '  - none',
      '- reference moving:', ...group(r.ref.moving).map((s) => `  - ${s}`), r.ref.moving.length ? '' : '  - none',
      r.local.final.hidden.length ? `- local hidden reveal targets: ${r.local.final.hidden.join(' | ')}` : '',
      r.local.final.infinite.length ? `- local infinite animations: ${r.local.final.infinite.join(' | ')}` : '',
    ].filter(Boolean).join('\n')).join('\n\n');
    const n = rows.reduce((s, r) => s + r.local.moving.length, 0);
    const nr = rows.reduce((s, r) => s + r.ref.moving.length, 0);
    return { status: pass ? 'PASS' : 'FAIL', summary: `local ${n} moving animation(s) under reduce (reference ${nr}); hidden ${rows.map((r) => r.local.final.hidden.length).join('/')}; infinite ${rows.map((r) => r.local.final.infinite.length).join('/')}`, details: rows.map((r) => ({ dev: r.dev, pass: r.pass, local: { moving: group(r.local.moving), final: r.local.final }, ref: { moving: group(r.ref.moving), final: r.ref.final } })), md };
  },
};

/* ------------------------------------------------------------------ animations (no reduced motion) */

async function revealRun(url) {
  const b = await openDevice(DEVICE_SETS.animations[0]);
  try {
    const tr = await trackAnimations(b);
    await b.goto(url, 0);
    await waitRendered(b);
    await sleep(300);
    const initial = await b.evaluate(`(${revealTargets})()`);
    tr.phase = 'scroll';
    await scrollSteps(b);
    await sleep(1500);
    const final = await b.evaluate(`(${revealTargets})()`);
    const keyframes = await b.evaluate(`(${keyframesInfo})()`);
    const tokens = await b.evaluate(`(${motionTokens})()`);
    // "Each element animates only once": scroll back to the top and through the page again.
    tr.phase = 'second';
    await b.evaluate('scrollTo(0, 0)');
    await sleep(600);
    await scrollSteps(b, null, 250);
    await sleep(800);
    const anims = await tr.stop();
    const reveal = anims.filter((a) => a.reveal && a.type === 'CSSAnimation' && a.phase !== 'second');
    const again = anims.filter((a) => a.phase === 'second' && a.reveal && a.type === 'CSSAnimation').map((a) => a.label);
    const rise = anims.filter((a) => a.rise && a.type === 'CSSAnimation' && a.phase === 'load');
    const initialHidden = initial.filter((t) => t.visible && !t.inView && t.opacity < 0.1);
    return {
      initial, final, keyframes, tokens,
      sig: uniq(reveal.map((a) => `${a.name} ${a.duration}ms ${a.easing}`)).sort(),
      delays: uniq(reveal.map((a) => a.delay)).sort((x, y) => x - y),
      again: uniq(again),
      riseSig: uniq(rise.map((a) => `${a.name} ${a.duration}ms ${a.easing} +${a.delay}ms`)).sort(),
      counts: {
        targets: initial.length,
        aboveFold: initial.filter((t) => t.inView).length,
        belowFoldHidden: initialHidden.length,
        revealed: initialHidden.filter((t) => final.find((f) => f.key === t.key && f.opacity >= 0.99)).length,
        finalHidden: final.filter((t) => t.visible && t.opacity < 0.99).length,
        revealAnims: reveal.length,
        entrance: rise.length,
      },
    };
  } finally { await b.close(); }
}

export const animations = {
  name: 'animations',
  title: 'Motion like the reference and per DoD: reveal once (fade + 14 px, 60 ms stagger), entrance, breathing 5 s/5 s, press 160 ms, tabs clip-path',
  async run(ctx) {
    const local = await revealRun(ctx.localUrl);
    const ref = await revealRun(ctx.refUrl);
    const lk = local.initial.map((t) => t.key), rk = ref.initial.map((t) => t.key);
    const onlyRef = rk.filter((k) => !lk.includes(k)), onlyLocal = lk.filter((k) => !rk.includes(k));
    const problems = [], notes = [];
    for (const r of ref.initial) {
      const l = local.initial.find((t) => t.key === r.key);
      if (!l) continue;
      const rh = !r.inView && r.opacity < 0.1, lh = !l.inView && l.opacity < 0.1;
      if (rh !== lh) problems.push(`${r.key}: hidden before scroll — ref ${rh}, local ${lh}`);
    }
    const lc = local.counts;
    if (lc.finalHidden) problems.push(`${lc.finalHidden} reveal target(s) still hidden after scrolling`);
    if (lc.revealed < lc.belowFoldHidden) problems.push(`${lc.belowFoldHidden - lc.revealed} hidden target(s) never revealed`);
    if (onlyRef.length) problems.push(`reveal targets only in reference: ${onlyRef.join(' | ')}`);
    if (onlyLocal.length) problems.push(`reveal targets only in local: ${onlyLocal.join(' | ')}`);
    if (JSON.stringify(local.sig) !== JSON.stringify(ref.sig)) problems.push(`reveal animations differ — ref [${ref.sig.join('; ')}] vs local [${local.sig.join('; ')}]`);
    // CDP reports a CSS animation's effect easing (linear); the keyframe easing is read from the computed style.
    if (lc.targets && local.tokens.reveal !== `${MOTION.revealAnimation} 640ms ${MOTION.easing}`) problems.push(`reveal is ${local.tokens.reveal}, not ${MOTION.revealAnimation} 640ms ${MOTION.easing}`);
    if (ref.tokens.reveal && local.tokens.reveal !== ref.tokens.reveal) problems.push(`reveal ${local.tokens.reveal} ≠ reference ${ref.tokens.reveal}`);
    if (ref.tokens.rise && local.tokens.rise !== ref.tokens.rise) problems.push(`entrance ${local.tokens.rise} ≠ reference ${ref.tokens.rise}`);
    const kf = local.keyframes[MOTION.revealAnimation];
    if (lc.targets && (!kf || !new RegExp(`translate: 0px ${MOTION.revealOffsetPx}px|translate: 0 ${MOTION.revealOffsetPx}px`).test(kf.from) || !/opacity: 0/.test(kf.from))) problems.push(`@keyframes ${MOTION.revealAnimation} does not start at opacity 0 + translate 14 px: ${kf ? kf.from : 'missing'}`);
    const badDelays = local.delays.filter((d) => d % MOTION.staggerStep !== 0 || d > MOTION.staggerStep * MOTION.staggerMaxSteps);
    if (badDelays.length) problems.push(`reveal delays not multiples of ${MOTION.staggerStep} ms up to ${MOTION.staggerStep * MOTION.staggerMaxSteps}: ${badDelays.join(', ')}`);
    if (local.again.length) problems.push(`element(s) animated again on the second scroll-through: ${local.again.slice(0, 6).join('; ')}`);
    if (JSON.stringify(local.riseSig) !== JSON.stringify(ref.riseSig)) problems.push(`entrance (.rise) differs — ref [${ref.riseSig.join('; ')}] vs local [${local.riseSig.join('; ')}]`);
    // Motion tokens (DoD §3), compared with the reference and the DoD values.
    if (local.tokens.button && local.tokens.button !== `${MOTION.pressMs}ms ${MOTION.easing}`) problems.push(`button transform transition ${local.tokens.button} ≠ ${MOTION.pressMs}ms ${MOTION.easing}`);
    if (ref.tokens.tabs && local.tokens.tabs !== ref.tokens.tabs) problems.push(`tab pill clip-path transition ${local.tokens.tabs} ≠ reference ${ref.tokens.tabs}`);
    if (ref.tokens.breath || local.tokens.breath) {
      if (local.tokens.breath !== ref.tokens.breath) problems.push(`breathing circle ${local.tokens.breath} ≠ reference ${ref.tokens.breath}`);
      if (local.tokens.breath && !new RegExp(`${MOTION.breathMs}ms .* infinite$`).test(local.tokens.breath)) problems.push(`breathing circle ${local.tokens.breath}: not one ${MOTION.breathMs / 1000} s cycle (5 s in / 5 s out), infinite`);
    }
    if (!lc.targets && !ref.counts.targets) notes.push('no scroll-reveal targets on this page (as in the reference)');
    const row = (k) => `| ${k} | ${ref.counts[k]} | ${local.counts[k]} |`;
    const md = ['| | reference | local |', '|---|---|---|', ...Object.keys(lc).map(row),
      `| reveal animations | ${ref.sig.join('<br>')} | ${local.sig.join('<br>')} |`,
      `| reveal delays (ms) | ${ref.delays.join(', ')} | ${local.delays.join(', ')} |`,
      `| entrance (.rise) | ${ref.riseSig.join('<br>')} | ${local.riseSig.join('<br>')} |`,
      `| reveal (computed) | ${ref.tokens.reveal || '—'} | ${local.tokens.reveal || '—'} |`,
      `| entrance (computed) | ${ref.tokens.rise || '—'} | ${local.tokens.rise || '—'} |`,
      `| button transform | ${ref.tokens.button} | ${local.tokens.button} |`,
      `| tab pill clip-path | ${ref.tokens.tabs || '—'} | ${local.tokens.tabs || '—'} |`,
      `| breathing circle | ${ref.tokens.breath || '—'} | ${local.tokens.breath || '—'} |`,
      `| re-animated on 2nd pass | ${ref.again.length} | ${local.again.length} |`,
      notes.length ? '\n' + notes.map((n) => `- ${n}`).join('\n') : '',
      '', problems.length ? 'Problems:\n' + problems.map((p) => `- ${p}`).join('\n') : 'Same reveal targets, same start state, same animations and motion tokens; all revealed once.'].join('\n');
    return { status: problems.length ? 'FAIL' : 'PASS', summary: problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : '') : `${lc.targets} reveal targets, ${lc.belowFoldHidden} hidden below the fold, all revealed once; motion tokens match`, details: { local: { ...local, keyframes: undefined }, ref: { ...ref, keyframes: undefined }, problems }, md };
  },
};
