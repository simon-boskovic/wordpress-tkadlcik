import { photo, PHOTOS } from '../fragments.mjs';
/**
 * O mně — port of OMne.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 */
export function build({ page }) {
  return page({
    slug: 'o-mne',
    title: 'O mně',
    scripts: [],
    frontPage: false,
    sections: [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 120px); padding-bottom: clamp(72px, 10vw, 128px)">
<div class="grid" style="--min: 440px; gap: 48px 72px; align-items: center">
<div class="stack" style="gap: 28px">
<span class="eyebrow rise">O mně</span>
<h1 class="h1 rise d1" style="font-size: clamp(44px, 6vw, 88px)">Daniel Tkadlčík, <span class="serif">lektor tchaj-ťi od roku 1997</span></h1>
<p class="lead rise d2">Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997. Prvotním důvodem, proč jsem se začal zajímat o cvičení tchaj-ťi, byly mé vleklé zdravotní problémy způsobené vrcholovým tréninkem atletiky. Tchaj-ťi mě natolik ovlivnilo, že jsem pozměnil svůj pohled na mnoho věcí, které se týkají nejen těla, ale i myšlení.</p>
</div>
<div class="rise d3" style="position: relative">
${photo(PHOTOS.portret)}
<div class="card stack" style="position: absolute; left: -16px; bottom: 28px; gap: 2px; padding: 18px 22px; border-radius: 18px; box-shadow: var(--shadow-lg)"><span style="font-size: 30px; font-weight: 500; letter-spacing: -.04em; line-height: 1.1">od roku 1997</span></div>
</div>
</div>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 128px)">
<div class="sec-head"><h2 class="h2">Cesta k tchaj-ťi <span class="serif">a mistr Vincent Chu</span></h2></div>
<ol class="stack" style="max-width: 900px">
<li class="reveal" style="display: grid; grid-template-columns: 110px 1fr; gap: 24px; padding: 26px 0; border-top: 1px solid var(--ink)"><span class="idx">01</span><div class="stack" style="gap: 6px"><h3 class="h3">Různé styly tchaj-ťi a meditace</h3><p class="body small">V průběhu času jsem se věnoval různým stylům tchaj-ťi u různých učitelů a mistrů (wudangskému tchaj-ťi, Yang tchaj-ťi, čchi-kungovým masážím a různým stylům meditace).</p></div></li>
<li class="reveal" style="display: grid; grid-template-columns: 110px 1fr; gap: 24px; padding: 26px 0; border-top: 1px solid var(--line)"><span class="idx">02</span><div class="stack" style="gap: 6px"><h3 class="h3">Rodinný styl Yang u mistra Vincenta Chu</h3><p class="body small">Od roku 2007 se intenzivně věnuji zejména rodinnému stylu Yang tchaj-ťi u mistra Vincenta Chu, který vyučuje komplexní systém rodiny Yang. Mimo jiné mě naučil rodinné předání Osmi kusů brokátu a 13 slov tchaj-ťi.</p></div></li>
<li class="reveal" style="display: grid; grid-template-columns: 110px 1fr; gap: 24px; padding: 26px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line)"><span class="idx">03</span><div class="stack" style="gap: 6px"><h3 class="h3">Masáže tuina a učitel tělesné výchovy</h3><p class="body small">Několik let jsem se také věnoval zdravotním energetickým masážím tuina. Civilním povoláním jsem učitel tělesné výchovy na II. stupni základní školy.</p></div></li>
</ol>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="panel-dark on-dark reveal" style="padding: clamp(36px, 6vw, 88px)">
<div class="grid" style="--min: 420px; gap: 40px 72px; align-items: end">
<div class="stack" style="gap: 20px">
<h2 class="eyebrow">Moje filozofie</h2>
<p class="serif" style="font-size: clamp(30px, 3.6vw, 50px); line-height: 1.12; text-wrap: balance">„Každá forma cvičení je prázdná, pokud není spojena s radostí, tichostí a klidem mysli, které jsou podstatou našeho bytí a které se snažím ve cvičení rozvíjet.“</p>
</div>
<p style="color: var(--on-dark-2); text-wrap: pretty">Mým hlavním tématem je propojení meditací, cvičení tchaj-ťi a čchi-kungu.</p>
</div>
</div>
</section>`,
    ],
  });
}
