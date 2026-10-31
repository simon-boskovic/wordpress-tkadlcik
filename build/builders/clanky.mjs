/**
 * Články — port of Clanky.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 */
import { DOWNLOAD } from '../fragments.mjs';
import { applyUx } from './ux.mjs';

export function build({ content, page }) {
  return page({
    slug: 'clanky',
    title: 'Články',
    scripts: [],
    frontPage: false,
    sections: applyUx('clanky', [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 120px); padding-bottom: 48px">
<div class="stack" style="gap: 28px; max-width: 980px">
<span class="eyebrow rise">Články</span>
<h1 class="h1 rise d1">Články o tchaj-ťi <span class="serif">a čchi-kungu</span></h1>
</div>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<article class="card card-dark on-dark reveal" style="border-radius: 32px; padding: clamp(32px, 5vw, 64px); display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 32px 64px; margin-bottom: 16px">
<h2 class="h2" style="font-size: clamp(32px, 3.8vw, 52px)">Co je čchi-kung <span class="serif">a tchaj-ťi</span></h2>
<p style="color: var(--on-dark-2); text-wrap: pretty">Tato cvičení byla vždy pouze přirozenými metodami meditace a boje. Původní názvy byly spočinutí v klidu a Pěst velkého předělu. Čchi-kung je komerční název pro spočinutí v klidu a stejně tak tchaj-ťi, které dnes tvoří jednu ze součástí zdravého životního stylu.</p>
</article>
<div class="grid" style="--min: 420px">
<article class="card stack reveal" style="gap: 18px; min-height: 280px">
<span aria-hidden="true" style="font-size: 56px; font-weight: 500; letter-spacing: -.05em; line-height: .9; color: var(--accent-ink)">10</span>
<h2 class="h3" style="font-size: 28px; margin-top: auto">10 principů mistra Yang Chen Fu</h2>
<a class="btn btn-ghost btn-sm" href="/wp-content/uploads/10-principu-mistra-yang-chen-fu.docx" download style="align-self: flex-start">Stáhnout ${DOWNLOAD}</a>
</article>
<article class="card stack reveal" style="gap: 18px; min-height: 280px">
<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="26" fill="none" stroke="var(--accent-ink)" stroke-width="1.5"></circle></svg>
<h2 class="h3" style="font-size: 28px; margin-top: auto">Pojednání o Wu-ťi (WuChi)</h2>
<a class="btn btn-ghost btn-sm" href="/wp-content/uploads/pojednani-o-wu-ti.docx" download style="align-self: flex-start">Stáhnout ${DOWNLOAD}</a>
</article>
</div>
</section>`,
    ], content.today),
  });
}
