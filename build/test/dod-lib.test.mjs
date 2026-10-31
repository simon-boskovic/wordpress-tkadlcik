import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { blank } from '../lib/png.mjs';
import { contrastRatio, pixelContrast } from '../lib/dod/probes.mjs';
import { opacityFocusExemption } from '../lib/dod/checks/keyboard.mjs';
import { reducedAllowed } from '../lib/dod/checks/motion.mjs';
import { renderPage, renderSummary, saveResult, loadResults } from '../lib/dod/report.mjs';
import { CHECKS } from '../lib/dod/checks/index.mjs';
import { DEVICE_SETS, DEVICES, MOTION, PALETTE, THRESHOLDS } from '../lib/dod/config.mjs';
import { FLAGS, unknownFlags, USAGE } from '../lib/dod/cli.mjs';

test('contrastRatio matches WCAG reference values', () => {
  assert.equal(Math.round(contrastRatio([255, 255, 255], [0, 0, 0]) * 10) / 10, 21);
  const r = contrastRatio([255, 255, 255], [15, 118, 110]);   // white on Jade (canvas note: 5.4:1)
  assert.ok(r > 5.3 && r < 5.6, String(r));
  assert.ok(contrastRatio([14, 15, 14], [247, 247, 244]) > 17, 'Tuš on Kámen');
});


test('pixelContrast measures text against the backdrop pixels, not the glyphs', () => {
  const img = blank(40, 20, [30, 30, 30, 255]);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 35; x += 3) img.data.set([242, 239, 233, 255], (y * 40 + x) * 4);   // "glyph" pixels
  const r = pixelContrast(img, { doc: { x: 0, y: 0, w: 40, h: 20 }, colorRgba: [242, 239, 233, 1] });
  assert.equal(r.bg, 'rgb(30,30,30)');
  assert.ok(r.ratio > 14, String(r.ratio));
  const light = blank(40, 20, [220, 220, 220, 255]);
  assert.ok(pixelContrast(light, { doc: { x: 0, y: 0, w: 40, h: 20 }, colorRgba: [120, 120, 120, 1] }).ratio < 4.5);
});


test('R31.1 — opacityFocusExemption finds a visible ring within 2 ancestor levels, else null', () => {
  assert.deepEqual(opacityFocusExemption([{ outlineWidth: 2, boxShadow: 'none' }]), { level: 0, kind: 'outline' });
  // A visually hidden native control whose parent draws the ring via `:has(:focus-visible)`.
  assert.deepEqual(
    opacityFocusExemption([{ outlineWidth: 0, boxShadow: 'none' }, { outlineWidth: 0, boxShadow: '0 0 0 2px #e0604c' }]),
    { level: 1, kind: 'box-shadow' },
  );
  assert.deepEqual(
    opacityFocusExemption([{ outlineWidth: 0, boxShadow: 'none' }, { outlineWidth: 0, boxShadow: 'none' }, { outlineWidth: 2, boxShadow: 'none' }]),
    { level: 2, kind: 'outline' },
  );
  assert.equal(opacityFocusExemption([{ outlineWidth: 1, boxShadow: 'none' }]), null, 'a ring under 2px does not count');
  assert.equal(
    opacityFocusExemption([{ outlineWidth: 0, boxShadow: 'none' }, { outlineWidth: 0, boxShadow: 'none' }, { outlineWidth: 0, boxShadow: 'none' }, { outlineWidth: 2, boxShadow: 'none' }]),
    null,
    'a ring beyond 2 ancestor levels does not count — genuinely hidden targets stay flagged',
  );
});


test('check registry: unique names, each with a title and run()', () => {
  const names = CHECKS.map((c) => c.name);
  assert.equal(new Set(names).size, names.length);
  for (const c of CHECKS) { assert.equal(typeof c.run, 'function', c.name); assert.ok(c.title, c.name); }
  assert.ok(CHECKS.find((c) => c.name === 'lighthouse').serial, 'lighthouse runs serially in --jobs mode');
});


test('report: per-check results round-trip into the page report and the site summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'dod-'));
  try {
    const out = join(root, 'cenik');
    saveResult(out, 'visual', { name: 'visual', title: 'Visual', status: 'FAIL', summary: 'M 2.00%', details: [{ device: 'M', ratio: 0.02 }], md: 'x', seconds: 1, run: '2026-09-26T10:00', runId: 'r2' });
    saveResult(out, 'seo', { name: 'seo', title: 'SEO', status: 'BLOCKED', summary: 'opening hours', details: {}, md: 'y', seconds: 1, run: '2026-09-26T10:01', runId: 'r2' });
    const res = loadResults(out, ['visual', 'seo', 'tone']);
    assert.deepEqual(res.map((r) => r.name), ['visual', 'seo']);
    renderPage(out, { slug: 'cenik', localUrl: 'l', refUrl: 'r', }, res, 'r2');
    assert.match(readFileSync(join(out, 'report.md'), 'utf8'), /\| visual \| \*\*FAIL\*\* \| M 2\.00% \|/);
    const s = renderSummary(root, [{ slug: 'cenik' }], ['visual', 'seo', 'tone'], 'r2');
    assert.match(s.md, /\| \[cenik\]\(cenik\/report\.md\) \| ✗ \| B \|/);
    assert.match(s.md, /M 2\.00%/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


test('report: a check not run in this run shows as stale, never as a current ✓, and is not counted', () => {
  const root = mkdtempSync(join(tmpdir(), 'dod-'));
  try {
    const out = join(root, 'cenik');
    saveResult(out, 'visual', { name: 'visual', title: 'Visual', status: 'PASS', summary: 'M 0.10%', details: [{ device: 'M', ratio: 0.001 }], md: '', seconds: 1, run: '2026-09-25T08:00', runId: 'old' });
    saveResult(out, 'tone', { name: 'tone', title: 'Tone', status: 'FAIL', summary: 'x', details: {}, md: '', seconds: 1, run: '2026-09-25T08:00', runId: 'old' });
    saveResult(out, 'seo', { name: 'seo', title: 'SEO', status: 'PASS', summary: 'ok', details: {}, md: '', seconds: 1, run: '2026-09-26T10:00', runId: 'new' });
    const s = renderSummary(root, [{ slug: 'cenik' }], ['visual', 'seo', 'tone'], 'new');
    assert.match(s.md, /\| \[cenik\]\(cenik\/report\.md\) \| \(✓\) \| ✓ \| \(✗\) \|/);
    assert.match(s.md, /\| \*\*pages failing\*\* \| \*\*0\*\* \| \*\*0\*\* \| \*\*0\*\* \|/);
    assert.match(s.md, /Not run in this run \(earlier results, not counted\): visual PASS, tone FAIL/);
    // --summary re-render (no run given): the latest run id in the results is "this run".
    assert.match(renderSummary(root, [{ slug: 'cenik' }], ['visual', 'seo', 'tone']).md, /\| \(✓\) \| ✓ \| \(✗\) \|/);
    renderPage(out, { slug: 'cenik', localUrl: 'l', refUrl: 'r', }, loadResults(out, ['visual', 'seo', 'tone']), 'new');
    assert.match(readFileSync(join(out, 'report.md'), 'utf8'), /\| visual \| \*\*PASS\*\* \(not run in this run — earlier result\) \|/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


test('seo: a shared verify --seo result fails every page on a site-level failure or a crashed run', async () => {
  const { interpretSharedVerify } = await import('../lib/dod/checks/seo.mjs');
  const slugs = ['cenik', 'kontakt'];
  const ok = { status: 0, out: 'ok   /cenik/\nok   /kontakt/\n\nAll checks passed (2 pages, SEO).' };
  assert.equal(interpretSharedVerify(ok, 'cenik', '/cenik/', slugs).status, 0);
  const site = { status: 1, out: 'ok   /cenik/\nok   /kontakt/\n\n2 failure(s):\n- sitemap: /kontakt/ missing\n- /gift-vouchers/: 404 instead of 301' };
  const r = interpretSharedVerify(site, 'cenik', '/cenik/', slugs);
  assert.equal(r.status, 1);
  assert.match(r.out, /site-level: sitemap: \/kontakt\/ missing/);
  assert.match(r.out, /site-level: \/gift-vouchers\/: 404/);
  const page = { status: 1, out: 'FAIL /cenik/\nok   /kontakt/\n\n1 failure(s):\n- cenik: title missing' };
  assert.equal(interpretSharedVerify(page, 'cenik', '/cenik/', slugs).status, 1);
  assert.equal(interpretSharedVerify(page, 'kontakt', '/kontakt/', slugs).status, 0, 'another page failing does not fail this one');
  const crash = { status: 1, out: 'Error: no Chrome/Edge found' };
  const c = interpretSharedVerify(crash, 'kontakt', '/kontakt/', slugs);
  assert.equal(c.status, 1);
  assert.match(c.out, /exited 1 without failure lines: Error: no Chrome\/Edge found/);
  assert.equal(interpretSharedVerify({ status: null, out: '' }, 'kontakt', '/kontakt/', slugs).status, 1, 'timeout/killed');
});

test('config: gated visual devices are the DoD widths; tokens and thresholds as agreed', () => {
  assert.deepEqual(DEVICE_SETS.visual.map((d) => DEVICES[d].width), [390, 820, 1180, 1440]);
  assert.deepEqual(DEVICE_SETS.visualRecorded, ['ML', 'XL']);
  assert.equal(THRESHOLDS.visualMaxRatio, 0.01);
  assert.equal(THRESHOLDS.consoleWarningsFail, true);
  assert.equal(THRESHOLDS.lighthouse.mobile.performance, 90);
  assert.equal(THRESHOLDS.lighthouse.desktop.accessibility, 100);
  assert.deepEqual([PALETTE.bg, PALETTE.ink, PALETTE.jade, PALETTE.focus], ['rgb(14, 15, 14)', 'rgb(242, 242, 238)', 'rgb(15, 118, 110)', 'rgb(143, 214, 204)']);
  assert.deepEqual(THRESHOLDS.focusColors, [PALETTE.focus]);
  assert.equal(MOTION.easing, 'cubic-bezier(0.23, 1, 0.32, 1)');
  assert.equal(MOTION.pressMs, 160);
  assert.equal(MOTION.staggerStep, 60);
  assert.equal(MOTION.breathMs, 10000);
});

test('check registry: the DoD checks of this site, crossbrowser before lighthouse', () => {
  assert.deepEqual(CHECKS.map((c) => c.name), ['visual', 'console', 'overflow', 'reduced-motion', 'animations', 'hover', 'press', 'keyboard', 'targets', 'seo', 'contrast', 'images', 'nojs', 'flash', 'crossbrowser', 'lighthouse']);
});

test('crossbrowser: inside the Claude Code sandbox it reports SKIP without launching a browser', async () => {
  const xb = CHECKS.find((c) => c.name === 'crossbrowser');
  const prev = { c: process.env.CLAUDECODE, f: process.env.TK_CROSSBROWSER };
  process.env.CLAUDECODE = '1'; delete process.env.TK_CROSSBROWSER;
  try { const r = await xb.run({ localUrl: 'http://x/', out: '/nonexistent', front: false }); assert.equal(r.status, 'SKIP'); assert.match(r.summary, /sandbox/); }
  finally { if (prev.c === undefined) delete process.env.CLAUDECODE; else process.env.CLAUDECODE = prev.c; if (prev.f !== undefined) process.env.TK_CROSSBROWSER = prev.f; }
});

test('reduced motion: fade only — opacity keyframes and colour transitions pass, movement and loops fail', () => {
  const kf = { fade: { props: ['opacity'] }, revealUp: { props: ['opacity', 'translate'] }, breathe: { props: ['transform'] } };
  assert.equal(reducedAllowed({ type: 'CSSAnimation', name: 'fade', duration: 300, iterations: 1 }, kf), true);
  assert.equal(reducedAllowed({ type: 'CSSAnimation', name: 'revealUp', duration: 640, iterations: 1 }, kf), false);
  assert.equal(reducedAllowed({ type: 'CSSAnimation', name: 'breathe', duration: 10000, iterations: null }, kf), false);
  assert.equal(reducedAllowed({ type: 'CSSAnimation', name: 'fade', duration: 300, iterations: null }, kf), false, 'an infinite fade is still a loop');
  assert.equal(reducedAllowed({ type: 'CSSTransition', name: 'background-color', duration: 150 }), true);
  assert.equal(reducedAllowed({ type: 'CSSTransition', name: 'transform', duration: 160 }), false);
  assert.equal(reducedAllowed({ type: 'CSSTransition', name: 'clip-path', duration: 250 }), false);
  assert.equal(reducedAllowed({ type: 'CSSTransition', name: 'transform', duration: 0 }), true, 'an instant change is no motion');
  assert.equal(reducedAllowed({ type: 'WebAnimation', name: '', duration: 250 }), false);
});

test('dod.mjs --help: USAGE lists every flag, its default and the Lighthouse/Playwright env vars', () => {
  for (const f of ['--only', '--all', '--checks', '--skip', '--jobs', '--base', '--proto', '--out']) assert.match(USAGE, new RegExp(f.replace('-', '\\-')), f);
  assert.match(USAGE, /TK_LIGHTHOUSE/);
  assert.match(USAGE, /TK_PLAYWRIGHT/);
  assert.match(USAGE, /http:\/\/localhost:8020/, 'default --base');
  assert.match(USAGE, /http:\/\/127\.0\.0\.1:8765/, 'default --proto');
  assert.match(USAGE, /build\/shots\/dod/, 'default --out');
  assert.ok(FLAGS.every((f) => f.desc), 'every flag documents itself');
});

test('dod.mjs: unknownFlags accepts every known flag (incl. -h and the internal --no-summary) and flags the rest', () => {
  assert.deepEqual(unknownFlags(['--base=http://x', '--jobs=3', '--only=cenik', '-h', 'stray-positional']), []);
  assert.deepEqual(unknownFlags(['--no-summary', '--checks=visual']), []);
  assert.deepEqual(unknownFlags(['--bogus', '--checks=visual', '--typo=1']), ['bogus', 'typo']);
});
