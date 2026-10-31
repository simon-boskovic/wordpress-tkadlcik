/**
 * Kontakt — port of Kontakt.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 * The two "[Mapa Google]" placeholders are click-to-load maps (fragments.mjs mapBox, _tk_scripts "map").
 */
import { mapBox } from '../fragments.mjs';

export function build({ content, page }) {
  return page({
    slug: 'kontakt',
    title: 'Kontakt',
    scripts: ['map'],
    frontPage: false,
    sections: [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 120px); padding-bottom: clamp(72px, 10vw, 128px)">
<div class="grid" style="--min: 440px; gap: 48px 72px; align-items: start">
<div class="stack" style="gap: 32px">
<div class="stack" style="gap: 24px">
<span class="eyebrow rise">Kontakt</span>
<h1 class="h1 rise d1" style="font-size: clamp(44px, 6vw, 84px)">Kontakt – tchaj-ťi <span class="serif">ZŠ Jeremenkova, Praha 4</span></h1>
<p class="lead rise d2">Kurzy probíhají na adrese ZŠ Jeremenkova, Jeremenkova 1003/66A.</p>
</div>
<ul class="card rise d3" style="padding: 6px 24px">
<li style="padding: 16px 0; border-bottom: 1px solid var(--line); font-weight: 500">Mgr. Daniel Tkadlčík</li>
<li style="padding: 16px 0; border-bottom: 1px solid var(--line)"><a class="lnk" href="tel:+4207732871113">+420 773 287 1113</a></li>
<li style="padding: 16px 0"><a class="lnk" href="mailto:tkadlcik@centrum.cz">tkadlcik@centrum.cz</a></li>
</ul>
</div>
<div class="stack rise d4" style="gap: 16px">
<h2 class="h3">Kde cvičíme: Praha 4 a Zlín</h2>
<div class="card stack" style="gap: 20px; padding: 12px">
${mapBox(content.places[0], content.mapsEmbedUrl, content.mapsLinkUrl)}
<div class="stack" style="gap: 2px; padding: 4px 12px 12px"><strong style="font-weight: 500; font-size: 19px">Tělocvična ZŠ Jeremenkova</strong><span class="small muted">Jeremenkova 1003/66A</span></div>
</div>
<div class="card stack" style="gap: 20px; padding: 12px">
${mapBox(content.places[1], content.mapsEmbedUrl, content.mapsLinkUrl)}
<div class="stack" style="gap: 2px; padding: 4px 12px 12px"><strong style="font-weight: 500; font-size: 19px">Centrum Jiný svět</strong><span class="small muted">Osvoboditelů 484, Zlín</span></div>
</div>
</div>
</div>
</section>`,
    ],
  });
}
