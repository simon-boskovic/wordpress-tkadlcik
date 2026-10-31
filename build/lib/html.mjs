/**
 * Small markup helpers and the Elementor wrappers every page uses (same format as martinadamus build/lib/html.mjs).
 */
import { createHash } from 'node:crypto';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const attr = (s) => esc(s).replace(/"/g, '&quot;');

/** Deterministic 7-hex Elementor ids: the same page always regenerates the same ids (clean diffs). */
export function createIds(slug) {
  let n = 0;
  return () => createHash('sha1').update(`${slug}:${++n}`).digest('hex').slice(0, 7);
}

/** One section = one full-width, zero-padding container holding one raw-HTML widget. */
export function section(ids, html) {
  return {
    id: ids(),
    elType: 'container',
    isInner: false,
    settings: {
      content_width: 'full',
      flex_gap: { unit: 'px', size: 0, column: '0', row: '0', isLinked: true },
      padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
    },
    elements: [{ id: ids(), elType: 'widget', widgetType: 'html', settings: { html: html.trim() }, elements: [] }],
  };
}
