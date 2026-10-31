/**
 * Domů — port of Main.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 */
import { ARROW, CARD_ARROW, photo, PHOTOS } from '../fragments.mjs';

export function build({ page }) {
  return page({
    slug: 'domu',
    title: 'Domů',
    scripts: [],
    frontPage: true,
    sections: [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 128px); padding-bottom: 40px">
<div class="stack" style="gap: 28px; max-width: 1080px">
<span class="eyebrow rise">Výuka tchaj-ťi a čchi-kungu · Radost v pohybu</span>
<h1 class="h1 rise d1">Tchaj-ťi a čchi-kung <span class="serif">v Praze 4</span> a ve Zlíně</h1>
<p class="lead rise d2">Najít klid v pohybu a v klidu zase pohyb je jeden z mnoha pohledů na cvičení tchaj-ťi a čchi-kungu, stejně tak i jiných forem hledajících klid a harmonii.</p>
<p class="body rise d2" style="max-width: 64ch">Čchi-kung a tchaj-ťi Radost v pohybu nabízí kurzy, víkendové semináře a individuální cvičení. Náplní kurzů jsou cvičení zaměřená zejména na uvolnění, zklidnění, protažení a posílení našeho těla a celé naší bytosti. Ve své praxi čchi-kungu a tchaj-ťi propojuji cvičení s vědomým pohybem tak, aby nás směřoval k lehkosti a radosti při jejich provádění.</p>
<div class="rise d3" style="display: flex; flex-wrap: wrap; gap: 10px; padding-top: 6px">
<a class="btn btn-dark" href="Rozvrh.dc.html">Nabídka kurzů a lekcí ${ARROW}</a>
<a class="btn btn-ghost" href="/wp-content/uploads/letak-savle.jpg" download>Stáhnout leták na Šavli</a>
</div>
</div>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(64px, 8vw, 104px)">
<div class="grid rise d4 bento" style="--min: 320px">
${photo(PHOTOS.louka)}
<div class="card card-dark on-dark stack" style="justify-content: space-between; gap: 20px; min-height: 440px">
<div class="breath" aria-hidden="true" style="width: min(100%, 270px); align-self: center; margin-top: 12px"><i></i><i></i><i></i><b class="in">Nádech</b><b class="ex">Výdech</b></div>
<p class="small" style="color: var(--on-dark-muted)">Fyzický pohyb kombinovaný s principem dýchání tuina (nádech a výdech), tak aby energie mohla lépe cirkulovat uvnitř těla.</p>
</div>
<div class="card stack" style="gap: 18px; min-height: 440px">
<span class="eyebrow">Pravidelné cvičení</span>
<ul class="rows" style="margin-top: auto">
<li class="stack" style="gap: 2px; padding: 16px 0"><span style="font-size: 22px; font-weight: 500; letter-spacing: -.03em">Pondělí</span><span class="mono muted">18:00 - 19:30h</span><span class="small">Sestava Yang 12 forem pro začátečníky, 13 Words of Tchaj-ťi</span></li>
<li class="stack" style="gap: 2px; padding: 16px 0"><span style="font-size: 22px; font-weight: 500; letter-spacing: -.03em">Úterý</span><span class="mono muted">18:00 - 20:00h</span><span class="small">Osm kusů brokátu</span></li>
</ul>
<p class="small muted">Místo: Tělocvična ZŠ Jeremenkova</p>
<a class="btn btn-jade btn-sm" href="Rozvrh.dc.html" style="align-self: flex-start">Nabídka kurzů a lekcí ${ARROW}</a>
</div>
</div>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="sec-head">
<h2 class="h2" style="max-width: 16ch">Cvičení a kurzy, <span class="serif">které nabízíme</span></h2>
</div>
<div class="grid" style="--min: 300px">
<a class="card card-link reveal" href="Cviceni.dc.html#brokat">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px"><span class="idx">01</span><span class="chip">Úterý 18:00 - 20:00h</span></div>
<h3 class="h3" style="margin-top: 40px">Osm kusů brokátu</h3>
<p class="body small">Známé čchi-kungové cvičení zaměřující se na rozvoj základních dovedností, posílení těla, protažení, otevření energetických kanálů a získání základních návyků a dovedností.</p>
${CARD_ARROW}
</a>
<a class="card card-link reveal" href="Cviceni.dc.html#slov">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px"><span class="idx">02</span><span class="chip">Úterý 18:00 - 19:30h</span></div>
<h3 class="h3" style="margin-top: 40px">13 Words of Tchaj-ťi</h3>
<p class="body small">Krátké a jednoduché cvičení zlepšující vnímání energie čchi, je zaměřeno zejména na otevírání energetických meridiánů.</p>
${CARD_ARROW}
</a>
<a class="card card-link reveal" href="Cviceni.dc.html#yang">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px"><span class="idx">03</span><span class="chip">Pondělí 18:00 - 19:30h</span></div>
<h3 class="h3" style="margin-top: 40px">Yang Tchaj-ťi</h3>
<p class="body small">Styl Yang tchaj-ťi je pojmenován podle členů rodiny Yang, kteří tento styl dosti proslavili. Vyučujeme tento styl podle tradice a rodinného předání mistra Vincenta Chu.</p>
${CARD_ARROW}
</a>
</div>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="sec-head">
<h2 class="h2">Náplň lekcí <span class="serif">tchaj-ťi a čchi-kungu</span></h2>
<p class="body" style="max-width: 46ch">Výuka probíhá formou lekcí 90 minut nebo 120 minut, cvičíme v tělocvičně a v létě venku. Lekce jsou buď zaměřeny na čchi-kung, nebo tchaj-ťi.</p>
</div>
<ol class="grid" style="--min: 260px; gap: 32px">
<li class="stack reveal" style="gap: 10px; border-top: 1px solid var(--ink); padding-top: 20px"><span class="idx">01</span><h3 class="h3">Kloubní rozcvičení</h3></li>
<li class="stack reveal" style="gap: 10px; border-top: 1px solid var(--line-2); padding-top: 20px"><span class="idx">02</span><h3 class="h3">Základní cvičení</h3><p class="body small">Statický čchi-kung, pozice zhan zhuang nebo základní postoje ze sestav tchaj-ťi.</p></li>
<li class="stack reveal" style="gap: 10px; border-top: 1px solid var(--line-2); padding-top: 20px"><span class="idx">03</span><h3 class="h3">Osm kusů brokátu nebo 13 slov tchaj-ťi</h3><p class="body small">Často do rozcvičky zařazuji cvičení Osm kusů brokátu nebo 13 slov tchaj-ťi, které pomáhá prohlubování základů.</p></li>
</ol>
</section>`,

      `<section class="wrap">
<div class="panel-dark on-dark reveal" style="padding: clamp(36px, 6vw, 88px); display: flex; flex-direction: column; gap: clamp(48px, 6vw, 80px)">
<figure class="stack" style="gap: 20px; max-width: 980px">
<blockquote class="serif" style="font-size: clamp(30px, 3.6vw, 50px); line-height: 1.14; text-wrap: balance">„Každá forma cvičení je prázdná, pokud není spojena s radostí, tichostí a klidem mysli, které jsou podstatou našeho bytí a které se snažím ve cvičení rozvíjet.“</blockquote>
<figcaption class="mono" style="color: var(--on-dark-muted)">— Daniel Tkadlčík</figcaption>
</figure>
<div class="stack" style="gap: 24px">
<p style="color: var(--on-dark-2); max-width: 72ch; text-wrap: pretty">Výuka probíhá dle instrukcí a předání od mistra Vincenta Chu, který je hlavním instruktorem a mistrem bostonské školy <a class="lnk" href="https://www.gstaichi.org/" rel="nofollow" target="_blank">Gin Soon Tai Chi Chuan Federation</a>. Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.</p>
<ol aria-hidden="true" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 16px">
<li style="border-top: 1px solid var(--on-dark-line); padding-top: 16px; font-size: 19px; font-weight: 500; letter-spacing: -.015em">Yang Sau Chung</li>
<li style="border-top: 1px solid var(--on-dark-line); padding-top: 16px; font-size: 19px; font-weight: 500; letter-spacing: -.015em">Chu Gin Soon</li>
<li style="border-top: 1px solid var(--on-dark-line); padding-top: 16px; font-size: 19px; font-weight: 500; letter-spacing: -.015em">Vincent Chu</li>
<li style="border-top: 1px solid var(--jade-light); padding-top: 16px; font-size: 19px; font-weight: 500; letter-spacing: -.015em; color: var(--jade-light)">Daniel Tkadlčík</li>
</ol>
</div>
<a class="btn btn-glass" href="OMne.dc.html" style="align-self: flex-start">O mně ${ARROW}</a>
</div>
</section>`,

      `<section class="wrap section">
<div class="sec-head"><h2 class="h2">Semináře <span class="serif">a akce</span></h2></div>
<div class="grid" style="--min: 320px">
<a class="card card-link reveal" href="Seminare.dc.html#chu">
<span class="chip chip-neutral">27. 11. – 29. 11. 2025</span>
<h3 class="h3" style="margin-top: 28px">Seminář s mistrem Vincentem Chu</h3>
<p class="body small">Korektura dlouhé formy středního řádu. DaoYinový čchi-kung – Hrátky pěti zvířat.</p>
${CARD_ARROW}
</a>
<a class="card card-link reveal" href="Seminare.dc.html#hory">
<span class="chip chip-neutral">Strážné v Krkonoších</span>
<h3 class="h3" style="margin-top: 28px">Cvičení na horách</h3>
<p class="body small">Cvičíme v příjemném prostředí Krkonoš.</p>
${CARD_ARROW}
</a>
<a class="card card-link reveal" href="Rozvrh.dc.html#zlin">
<span class="chip chip-neutral">1x měsíčně vždy v pátek</span>
<h3 class="h3" style="margin-top: 28px">Cvičení ve Zlíně</h3>
<p class="body small">Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.</p>
${CARD_ARROW}
</a>
</div>
</section>`,

      `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="panel-jade reveal" style="padding: clamp(36px, 6vw, 80px); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 32px">
<div class="stack" style="gap: 16px; max-width: 640px">
<h2 class="h2">Kontakt</h2>
<p style="font-size: 18px; color: var(--on-accent-2)">Kurzy probíhají na adrese ZŠ Jeremenkova, Jeremenkova 1003/66A.</p>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 10px">
<a class="btn btn-light" href="mailto:tkadlcik@centrum.cz">tkadlcik@centrum.cz</a>
<a class="btn btn-glass" href="tel:+4207732871113">+420 773 287 1113</a>
</div>
</div>
</section>`,
    ],
  });
}
