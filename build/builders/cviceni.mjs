/**
 * Cvičení — port of Cviceni.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 *
 * The design's "[Video YouTube]" / "[YouTube <id>]" placeholders are click-to-load videos (fragments.mjs
 * videoBox, _tk_scripts "video"). VIDEOS maps each caption to its YouTube id — the design's gallery had the ids
 * shuffled; corrected against the old site (dan24.webnode.cz/videogalerie/) and YouTube oEmbed titles:
 *   1nFm6-XwGpU "10. července 2020" (Daniel Tkadlčík), NeVzb5hGM7A "Vincent Chu - http://www.gstaichi.org"
 *   (third-party channel), oZB6Gq4QzC4 "Tyč, sestava stylu Yang tchaj-ťi", 1Mmz_QpYk9s "Osm kusů brokátu",
 *   1UPJuzGC1UY "13 Words of Tchaj ťi - 13 Slov Tchaj-ťi".
 * JSON-LD: seo.mjs buildSchema emits one VideoObject per gallery video (upload dates: content.mjs videoUploadDates).
 */
import { videoBox } from '../fragments.mjs';
import { applyUx } from './ux.mjs';

/** Gallery order = the design's captions (verbatim); ids corrected. */
export const VIDEOS = [
  { id: '1nFm6-XwGpU', title: 'Začátečnická sestava 12 forem Yang tchaj-ťi' },
  { id: 'NeVzb5hGM7A', title: 'Ukázka sestavy Yang 43 forem v provedení velkého řádu. Mistr Vincent Chu' },
  { id: 'oZB6Gq4QzC4', title: 'Ukázka sestavy s holí' },
  { id: '1Mmz_QpYk9s', title: 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje' },
  { id: '1UPJuzGC1UY', title: '13 slov tchaj-ťi' },
];
/** The two inline videos (brocade section: the design's 16 / 10 box; 13 slov: 16 / 9 on the dark panel). */
export const INLINE_VIDEOS = {
  brokat: { id: '1Mmz_QpYk9s', title: 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje', ratio: '16 / 10' },
  slov: { id: '1UPJuzGC1UY', title: '13 slov tchaj-ťi', ratio: '16 / 9' },
};

export function build({ content, page }) {
  return page({
    slug: 'cviceni',
    title: 'Cvičení',
    scripts: ['video'],
    frontPage: false,
    sections: applyUx('cviceni', [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 120px); padding-bottom: clamp(48px, 6vw, 80px)">
<div class="stack" style="gap: 28px; max-width: 1080px">
<span class="eyebrow rise">Cvičení, která vyučujeme</span>
<h1 class="h1 rise d1">Osm kusů brokátu, 13 slov a <span class="serif">tchaj-ťi stylu Yang</span></h1>
<nav class="rise d2" aria-label="Na této stránce" style="display: flex; flex-wrap: wrap; gap: 8px">
<a class="btn btn-ghost btn-sm" href="#brokat">Osm kusů brokátu</a>
<a class="btn btn-ghost btn-sm" href="#slov">13 slov tchaj-ťi</a>
<a class="btn btn-ghost btn-sm" href="#yang">Tchaj-ťi stylu Yang</a>
<a class="btn btn-ghost btn-sm" href="#videa">Videogalerie</a>
</nav>
</div>
</section>`,

      `<section id="brokat" class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="grid" style="--min: 440px; gap: 48px; align-items: start; margin-bottom: 48px">
<div class="stack reveal" style="gap: 20px">
<span class="idx">01</span>
<h2 class="h2">Osm kusů <span class="serif">brokátu</span></h2>
<p class="body">Osm kusů brokátu je cvičení řadící se do skupiny Daoyin (dao znamená manipulaci s tělem a jeho částmi a yin znamená ovládání nebo vedení qi). Je to velmi jednoduché a velmi účinné cvičení, prospěšné pro zdraví. Staří Číňané tuto sestavu praktikovali po dlouhou dobu jako formu cvičení pro udržení zdraví. Je to nejlepší z tradičních čínských kultivačních metod. Pro svou jednoduchost a přínos ji praktikovalo mnoho lidí a vyvinula se do mnoha variací. V základu se rozděluje na formu v sedě a ve stoje. Cílem v sedě je kultivace mysli a zdraví, cílem sestavy procvičované ve stoje je trénink fyzického těla a jeho části. Ačkoli neexistují žádné důkazy, lidé dospěli k závěru, že sedící formu vytvořil Zong Li Quan, jeden z legendárních osmi nesmrtelných v čínské mytologii. Statickou formu vytvořil generál Yue Fei v dynastii Song (960–1279) jako bojové umění a využíval ho při výcviku svých vojáků.</p>
<p class="body">Celá sestava nás dovede k harmonizaci energie qi v těle. Když je qi v harmonii, všechny složky Yin a Yang v těle jsou vyvážené. Když jsou složky Yin a Yang vyvážené, tělo je zdravé. Osm kusů brokátu je cvičení rozdělené do osmi jednotlivých cviků. Každý z osmi cviků je speciálně navržen tak, aby pracoval na konkrétní části těla.</p>
</div>
<figure class="stack reveal" style="gap: 10px">
${videoBox(INLINE_VIDEOS.brokat)}
<figcaption class="small muted">Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje.</figcaption>
</figure>
</div>
<h3 class="eyebrow" style="margin-bottom: 16px">Názvy jednotlivých brokátů</h3>
<ol class="grid" style="--min: 270px; gap: 12px">
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">01 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Podpírání nebes oběma pažemi</h4><p class="small muted">Zvedáme nebesa a aktivujeme san tiao (tři ohřívače).</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">02 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Napínání luku</h4><p class="small muted">Učíme se správně uvolňovat napětí v hrudi, posilujeme srdce a stabilizujeme vnitřní oheň.</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">03 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Odtlačování nebes a země</h4><p class="small muted">Uvolňujeme žaludek a slezinu (oblasti podžebří).</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">04 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Ohlédnutí se dozadu</h4><p class="small muted">Zaháníme patero vyčerpání a sedmero zranění.</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">05 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Vrtění hlavou a kroužení páteří</h4><p class="small muted">Uvolňujeme bedra, ramena a zádové svaly.</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">06 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Oběma rukama se dotýkáme chodidel</h4><p class="small muted">Posilujeme ledviny, třísla a bedra.</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">07 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Posilovací cvičení</h4><p class="small muted">Zatínání pěstí, uvědomujeme si napětí v těle, v kotnících, kolenou, kyčlích, trupu a pažích.</p></li>
<li class="card stack reveal" style="gap: 10px; padding: 24px"><span class="idx">08 / 08</span><h4 class="h3" style="font-size: 19px; margin: 0">Dopadem na paty masírujeme páteř</h4><p class="small muted">Třesením se zbavujeme nemocí.</p></li>
</ol>
</section>`,

      `<section id="slov" class="wrap">
<div class="panel-dark on-dark reveal" style="padding: clamp(36px, 6vw, 80px)">
<div class="grid" style="--min: 420px; gap: 48px; align-items: start">
<div class="stack" style="gap: 20px">
<span class="idx" style="color: var(--jade-light)">02</span>
<h2 class="h2">13 slov <span class="serif">tchaj-ťi</span></h2>
<p style="color: var(--on-dark-2); text-wrap: pretty">Těchto 13 slov tchaj-ťi čchüan (dřep, podepření, skládání, tlačení, oddělení, kroucení, extenze, objímání, tlačení dolů, zvedání vzad, bodání, zvedání a hledání) je spojeno s velmi jednoduchým provedením tak, aby se dalo snadno naučit, zapamatovat si ho a procvičit. Jako tradiční sólová forma tchaj-ťi čchüan je připsáno Zhang San Fengovi jako tvůrci.</p>
<p style="color: var(--on-dark-2); text-wrap: pretty">Pro tuto formu 13 slov tchaj-ťi čchüan je nezbytné dodržovat správné provedení cviků, abychom byli schopni se řídit konkrétním souborem pravidel a udrželi tak kvalitu provedení. Abychom z tohoto cvičení měli užitek, musíme věnovat pozornost každému detailu. Přestože je tato forma velmi jednoduchá na provedení, má velký přínos pro zdraví, a je to proto, že se zaměřujeme na každý detail pohybu. Tyto detaily otevřou a aktivují meridiánové kanály uvnitř těla, takže energie čchi lépe aktivuje tělo, a tak se zlepší jeho stav.</p>
</div>
<div class="stack" style="gap: 20px">
<ol style="display: flex; flex-wrap: wrap; gap: 8px">
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">01</span>dřep</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">02</span>podepření</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">03</span>skládání</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">04</span>tlačení</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">05</span>oddělení</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">06</span>kroucení</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">07</span>extenze</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">08</span>objímání</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">09</span>tlačení dolů</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">10</span>zvedání vzad</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">11</span>bodání</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">12</span>zvedání</li>
<li style="padding: 9px 15px; border-radius: 999px; background: var(--on-dark-fill); border: 1px solid var(--on-dark-line); font-size: 16px"><span class="mono" style="color: var(--jade-light); margin-right: 6px">13</span>hledání</li>
</ol>
${videoBox(INLINE_VIDEOS.slov)}
</div>
</div>
</div>
</section>`,

      `<section id="yang" class="wrap section">
<div class="sec-head">
<div class="stack" style="gap: 16px">
<span class="idx">03</span>
<h2 class="h2">Tchaj-ťi stylu <span class="serif">Yang</span></h2>
</div>
<p class="body" style="max-width: 52ch">Výuka probíhá dle instrukcí a předání od mistra Vincenta Chu, který je hlavním instruktorem a mistrem bostonské školy <a class="lnk" href="https://www.gstaichi.org/" rel="nofollow" target="_blank">Gin Soon Tai Chi Chuan Federation</a>. Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.</p>
</div>
<div class="card reveal" style="padding: 8px 28px 28px">
<h3 class="eyebrow" style="padding: 20px 0 12px">Kompletní nabídka sestav a cvičení stylu Yang tchaj-ťi</h3>
<ul style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(460px, 100%), 1fr)); column-gap: 48px">
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava Velkého řádu 12 forem – začátečnická sestava</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava Velkého řádu 43 forem</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Návrat k tchaj-ťi – krátká sestava</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Návrat k tchaj-ťi – dlouhá forma</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava Středního řádu 108 forem – tradiční sestava</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava Středního řádu 42 forem – zkrácená sestava</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava Středního řádu 22 forem – zkrácená sestava</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava s holí</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava s mečem</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Sestava se šavlí</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>13 slov tchaj-ťi</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Osm kusů brokátu – základní forma, bojová forma</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Cvičení zhan zhuang – čchi-kungové statické cvičení 8 forem</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Čchi-kung tří kruhů</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Cvičení tří kruhů</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Tchaj-ťi kung – průpravná cvičení</span><span class="chip">Vyučuji</span></li>
<li style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line)"><span>Rychlá forma</span></li>
</ul>
</div>
</section>`,

      `<section id="videa" class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="sec-head"><h2 class="h2">Videogalerie: <span class="serif">sestavy tchaj-ťi a čchi-kungu</span></h2></div>
<div class="grid" style="--min: 340px; gap: 28px 16px">
${VIDEOS.map((v) => `<figure class="stack reveal" style="gap: 12px">${videoBox(v)}<figcaption style="font-weight: 500; letter-spacing: -.01em">${v.title}</figcaption></figure>`).join('\n')}
</div>
</section>`,
    ], content.today),
  });
}
