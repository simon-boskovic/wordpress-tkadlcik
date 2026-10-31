/**
 * Nabídka kurzů a lekcí — port of Rozvrh.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 *
 * Tabs (Rozvrh DCLogic tab/isPraha/isZlin/showPraha/showZlin): the holes become the initial state (Praha 4),
 * wired as WAI-ARIA tabs (ids, aria-controls/-labelledby, roving tabindex); assets/js/tabs.js (_tk_scripts
 * "tabs") switches data-tab on .tabs and .tab-panels. Without JS both panels show, stacked, and the tablist
 * is hidden (site.css, html:not(.js)). The panels' ids are the place keys (#praha, #zlin), so other pages link a
 * place directly ("/kurzy-a-lekce/#zlin", e.g. the home "Cvičení ve Zlíně" card; tabs.js opens the panel named by
 * the hash).
 *
 * The three video links of the Praha cards (design: all "Cviceni.dc.html#videa") point to the matching section on
 * Cvičení (#brokat, #slov, #yang); link texts unchanged.
 *
 * The two "[Mapa]" placeholders are click-to-load maps (fragments.mjs mapBox, _tk_scripts "map").
 */
import { ARROW, mapBox } from '../fragments.mjs';
import { applyUx } from './ux.mjs';

export function build({ content, page }) {
  return page({
    slug: 'kurzy-a-lekce',
    title: 'Nabídka kurzů a lekcí',
    scripts: ['tabs', 'map'],
    frontPage: false,
    sections: applyUx('kurzy-a-lekce', [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 120px); padding-bottom: 48px">
<div class="stack" style="gap: 28px; max-width: 980px">
<span class="eyebrow rise">Nabídka kurzů a lekcí</span>
<h1 class="h1 rise d1">Kurzy tchaj-ťi a čchi-kungu: <span class="serif">rozvrh a ceny</span></h1>
<p class="lead rise d2">Výuka probíhá formou lekcí 90 minut nebo 120 minut, cvičíme v tělocvičně a v létě venku. Lekce jsou buď zaměřeny na čchi-kung, nebo tchaj-ťi.</p>
</div>
</section>`,

      `<section class="wrap" aria-label="Nabídka kurzů a lekcí" style="padding-bottom: clamp(72px, 10vw, 128px)">
<div class="tabs rise d2" data-tab="praha" role="tablist" aria-label="Místo" style="margin-bottom: 28px">
<button type="button" role="tab" id="tab-praha" aria-controls="praha" aria-selected="true" data-tab-target="praha">Praha 4</button>
<button type="button" role="tab" id="tab-zlin" aria-controls="zlin" aria-selected="false" tabindex="-1" data-tab-target="zlin">Zlín</button>
<div class="tabs-active" aria-hidden="true"><span>Praha 4</span><span>Zlín</span></div>
</div>

<div class="tab-panels" data-tab="praha">
<div class="stack" role="tabpanel" id="praha" data-panel="praha" aria-labelledby="tab-praha" style="gap: 12px">

<article class="card grid" style="--min: 380px; gap: 24px 48px; align-items: start">
<div class="stack" style="gap: 12px">
<h2 class="h3" style="font-size: 26px">Osm kusů brokátu</h2>
<p class="body small">Známé čchi-kungové cvičení zaměřující se na rozvoj základních dovedností, posílení těla, protažení, otevření energetických kanálů a získání základních návyků a dovedností.</p>
<a class="lnk small" href="Cviceni.dc.html#brokat" style="align-self: flex-start; padding: 6px 0">Videogalerie</a>
</div>
<dl class="stack small" style="gap: 0">
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line)"><dt class="muted">Pravidelné cvičení</dt><dd><span class="mono">Úterý 18:00 - 20:00h</span><br>Osm kusů brokátu</dd></div>
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line)"><dt class="muted">Místo</dt><dd>Tělocvična ZŠ Jeremenkova</dd></div>
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line)"><dt class="muted">Cena</dt><dd>350 Kč lekce 120 minut, 10 lekcí 3 250 Kč</dd></div>
</dl>
</article>

<article class="card grid" style="--min: 380px; gap: 24px 48px; align-items: start">
<div class="stack" style="gap: 12px">
<h2 class="h3" style="font-size: 26px">13 Words of Tchaj-ťi</h2>
<p class="body small">Krátké a jednoduché cvičení zlepšující vnímání energie čchi, je zaměřeno zejména na otevírání energetických meridiánů. Řadí se mezi cvičení na principu Daoyin, která kladou důraz na fyzický pohyb kombinovaný s principem dýchání tuina (nádech a výdech), tak aby energie mohla lépe cirkulovat uvnitř těla.</p>
<a class="lnk small" href="Cviceni.dc.html#slov" style="align-self: flex-start; padding: 6px 0">Videogalerie</a>
</div>
<dl class="stack small" style="gap: 0">
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line)"><dt class="muted">Pravidelné cvičení</dt><dd><span class="mono">Úterý 18:00 - 19:30h</span><br>Osm kusů brokátu</dd></div>
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line)"><dt class="muted">Místo</dt><dd>Tělocvična ZŠ Jeremenkova</dd></div>
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line)"><dt class="muted">Cena</dt><dd>350 Kč lekce 90 minut, 10 lekcí 3 250 Kč</dd></div>
</dl>
</article>

<article class="card grid" style="--min: 380px; gap: 24px 48px; align-items: start">
<div class="stack" style="gap: 12px">
<h2 class="h3" style="font-size: 26px">Tchaj-ťi stylu Yang</h2>
<p class="body small">Styl Yang tchaj-ťi je pojmenován podle členů rodiny Yang, kteří tento styl dosti proslavili. Vyučujeme tento styl podle tradice a rodinného předání mistra Vincenta Chu. Cvičíme klasickou dlouhou sestavu stylu Yang, krátké sestavy a sestavu Návrat k tchaj-ťi. Sestavy se zbraněmi meč, šavle, tyč, rychlou formu a párová cvičení.</p>
<a class="lnk small" href="Cviceni.dc.html#videa" style="align-self: flex-start; padding: 6px 0">Video mistra Vincenta Chu styl Yang</a>
</div>
<dl class="stack small" style="gap: 0">
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line)"><dt class="muted">Pravidelné cvičení</dt><dd><span class="mono">Pondělí 18:00 - 19:30h</span><br>Sestava Yang 12 forem pro začátečníky, 13 Words of Tchaj-ťi</dd></div>
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line)"><dt class="muted">Místo</dt><dd>Tělocvična ZŠ Jeremenkova</dd></div>
<div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line)"><dt class="muted">Cena</dt><dd>350 Kč lekce 90 minut, 10 lekcí 3 250 Kč</dd></div>
</dl>
</article>
</div>

<div class="grid" role="tabpanel" id="zlin" data-panel="zlin" aria-labelledby="tab-zlin" style="--min: 400px; gap: 12px; align-items: stretch">
<div class="card stack" style="gap: 16px">
<h2 class="h3" style="font-size: 26px">Cvičení ve Zlíně</h2>
<p class="body">Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek. Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.</p>
<a class="btn btn-jade btn-sm" href="Kontakt.dc.html" style="align-self: flex-start; margin-top: auto">Kontakt ${ARROW}</a>
</div>
<dl class="card stack small" style="gap: 0; padding: 12px 28px">
<div style="display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 14px 0"><dt class="muted">Místo</dt><dd>Centrum Jiný svět, Osvoboditelů 484, Zlín</dd></div>
<div style="display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line)"><dt class="muted">Termíny</dt><dd>pátek 19. 4. 2024, od 17:30 do 20:00h</dd></div>
<div style="display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line)"><dt class="muted">Cena</dt><dd>400 Kč</dd></div>
</dl>
</div>
</div>
</section>`,

      `<section class="wrap" aria-labelledby="cena" style="padding-bottom: clamp(72px, 10vw, 128px)">
<div class="sec-head"><h2 id="cena" class="h2">Ceny <span class="serif">lekcí</span></h2></div>
<div class="grid" style="--min: 250px; gap: 12px">
<div class="card stack reveal" style="gap: 10px"><span style="font-size: 48px; font-weight: 500; letter-spacing: -.045em; line-height: 1">350 Kč</span><span class="small muted">lekce 90 minut</span></div>
<div class="card stack reveal" style="gap: 10px"><span style="font-size: 48px; font-weight: 500; letter-spacing: -.045em; line-height: 1">350 Kč</span><span class="small muted">lekce 120 minut</span></div>
<div class="card card-dark on-dark stack reveal" style="gap: 10px"><span style="font-size: 48px; font-weight: 500; letter-spacing: -.045em; line-height: 1">3 250 Kč</span><span class="small" style="color: var(--on-dark-muted)">10 lekcí</span></div>
<div class="card stack reveal" style="gap: 10px"><span style="font-size: 48px; font-weight: 500; letter-spacing: -.045em; line-height: 1">400 Kč</span><span class="small muted">Cvičení ve Zlíně</span></div>
</div>
</section>`,

      `<section class="wrap" aria-labelledby="misto" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="sec-head"><h2 id="misto" class="h2">Kde cvičíme: <span class="serif">Praha 4 a Zlín</span></h2></div>
<div class="grid" style="--min: 440px; gap: 16px">
<div class="card stack reveal" style="gap: 20px; padding: 12px">
${mapBox(content.places[0], content.mapsEmbedUrl, content.mapsLinkUrl)}
<div class="stack" style="gap: 2px; padding: 4px 12px 12px"><strong style="font-weight: 500; font-size: 19px">Tělocvična ZŠ Jeremenkova</strong><span class="small muted">Jeremenkova 1003/66A</span></div>
</div>
<div class="card stack reveal" style="gap: 20px; padding: 12px">
${mapBox(content.places[1], content.mapsEmbedUrl, content.mapsLinkUrl)}
<div class="stack" style="gap: 2px; padding: 4px 12px 12px"><strong style="font-weight: 500; font-size: 19px">Centrum Jiný svět</strong><span class="small muted">Osvoboditelů 484, Zlín</span></div>
</div>
</div>
</section>`,
    ], content.today),
  });
}
