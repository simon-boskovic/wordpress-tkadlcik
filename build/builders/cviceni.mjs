/**
 * Cvičení (redesign 2026-11-01): Osm kusů brokátu, 13 slov tchaj-ťi, tchaj-ťi stylu Yang. Copy from the old site.
 * The full video gallery has its own page again (/videogalerie/); two videos stay here inline.
 */
import { stage, videoBox, video, contactStatement, more, btn, VIDEOS } from '../fragments.mjs';
import { hero, sec, rows } from './parts.mjs';

export { VIDEOS };

export const BROCADES = [
  ['Podpírání nebes oběma pažemi', 'Zvedáme nebesa a aktivujeme san tiao (tři ohřívače).'],
  ['Napínání luku', 'Učíme se správně uvolňovat napětí v hrudi, posilujeme srdce a stabilizujeme vnitřní oheň.'],
  ['Odtlačování nebes a země', 'Uvolňujeme žaludek a slezinu (oblasti podžebří).'],
  ['Ohlédnutí se dozadu', 'Zaháníme patero vyčerpání a sedmero zranění.'],
  ['Vrtění hlavou a kroužení páteří', 'Uvolňujeme bedra, ramena a zádové svaly.'],
  ['Oběma rukama se dotýkáme chodidel', 'Posilujeme ledviny, třísla a bedra.'],
  ['Posilovací cvičení', 'Zatínání pěstí, uvědomujeme si napětí v těle, v kotnících, kolenou, kyčlích, trupu a pažích.'],
  ['Dopadem na paty masírujeme páteř', 'Třesením se zbavujeme nemocí.'],
];

/**
 * The owner's overview of the school and its exercises (PDF "Tchaj-ťi a čchi-kung Radost v Pohybu", received
 * 1. 11. 2026). Wording kept; only typos, missing commas and an omitted "o" fixed (Prahy, principy, Rozhýbává,
 * rovnováhu, přenášet, procvičováním, "Jedná se o").
 */
export const SCHOOL_INTRO = 'Yang rodinný styl vyučujeme pod dohledem mistra Vincenta Chu, který přijíždí do Prahy každý rok koncem listopadu. Otcem Vincenta Chu byl Gin Soon Chu, který založil jednu z prvních škol tchaj-ťi v USA. Hlavní náplní je dlouhá sestava stylu Yang. Kompletní systém výuky včetně zbraní obsahuje také různé druhy čchi-kungu.';
export const SCHOOL_FORMS = [
  ['Yang dlouhá forma 108 pohybů', 'Většinou není určena pro úplné začátečníky. Začínáme výukou Yang sestavy 22 pohybů, která je jednodušší a neobsahuje náročné pohyby.'],
  ['Osm kusů brokátu', 'Doplňkové cvičení, při kterém si cvičenec osvojí základní postoj a učí se vnímat energii čchi, uvolnění a napětí, plynulost, jemnost a spojený pohyb. Patří do skupiny Dao-Yin cvičení, což znamená vedení a směřování pohybu pomocí energie čchi a dechu.'],
  ['Taichi-kung', 'Doplňkové cvičení, které prohlubuje tělesné vnímání a ukotvuje principy tchaj-ťi. Rozhýbává klouby paží, pasu (kyčle, bedra, oblast třísel) a nohou (chodidla, kolena a kyčle). Vhodné pro začátečníky.'],
  ['Hrátky pěti zvířat', 'Posilující cvičení obsahující pět cviků, z nichž každý přináleží jednomu zvířeti. Určitým způsobem napodobujeme charakter a vlastnosti jednotlivých zvířat: medvěd sílu paží, tygr, jelen rovnováhu a pružnost, opice.'],
  ['Třináct slov tchaj-ťi', 'Cvičení, které patří jako Osm kusů brokátu do skupiny Dao-Yinových cvičení, což znamená vedení a směřování pohybu pomocí energie a dechu. Jedná se o velmi dobré cvičení na protažení a rozhýbání čchi.'],
  ['Rychlá forma', 'Takzvaná aplikační forma, rozvoj hbitosti a síly s důrazem na rychlost a spojení celého těla při každém pohybu.'],
];
export const SCHOOL_WEAPONS = [
  ['Meč', 'Dvousečný čínský meč zvaný Jian. Meč patří mezi královské zbraně v tchaj-ťi a učí nás přenášet záměr Yi do zbraně.'],
  ['Šavle neboli Dao', 'Dynamické cvičení na rozvoj síly a hbitosti.'],
  ['Tyč, halapartna', 'Dynamické silové cvičení rozvíjející hbitost, sílu paží a celého těla (jedná se o cvičení s halapartnou).'],
];
export const SCHOOL_STATIC = [
  ['Wu-ťi', 'Statický čchi-kung zaměřený na stav nerozdělené jednoty, s léty praxe jde o rozvíjení stavu prázdnoty. Cvičí se v nenáročných uvolněných pozicích. Cvičení vhodné pro začátečníky.'],
  ['Zhan zhuang', 'Statický čchi-kung, který je spojen s určitým záměrem (představou pohybu), například obranného nebo útočného pohybu. Je zde potřeba zvládnout určité vytrvání ve stavu wu-ťi. Cvičení vhodné pro pokročilé cvičence.'],
  ['Guo Yang Tzu', 'Statický čchi-kung spojený s procvičováním pojivových tkání, cvičení patří do skupiny Yi Jin Jing. V pozicích se masírují vnitřní orgány, čímž se podpoří oběh čchi a krve a uvolní se svaly. Ve svém důsledku se protáhnou pojivové tkáně a posílí se kosti v celém těle. Cvičení vhodné i pro začátečníky.'],
  ['Stání v pozicích tchaj-ťi (pozice ze sestav)', 'Obdobné cvičení jako zhan zhuang.'],
];

const WORDS = ['dřep', 'podepření', 'skládání', 'tlačení', 'oddělení', 'kroucení', 'extenze', 'objímání', 'tlačení dolů', 'zvedání vzad', 'bodání', 'zvedání', 'hledání'];

/** Yang forms; `taught` = marked "Vyučuji" on the old site. */
export const FORMS = [
  ['Sestava Velkého řádu 12 forem – začátečnická sestava', true],
  ['Sestava Velkého řádu 43 forem', false],
  ['Návrat k tchaj-ťi – krátká sestava', false],
  ['Návrat k tchaj-ťi – dlouhá forma', false],
  ['Sestava Středního řádu 108 forem – tradiční sestava', true],
  ['Sestava Středního řádu 42 forem – zkrácená sestava', true],
  ['Sestava Středního řádu 22 forem – zkrácená sestava', true],
  ['Sestava s holí', true],
  ['Sestava s mečem', false],
  ['Sestava se šavlí', false],
  ['13 slov tchaj-ťi', true],
  ['Osm kusů brokátu – základní forma, bojová forma', true],
  ['Cvičení zhan zhuang – čchi-kungové statické cvičení 8 forem', false],
  ['Čchi-kung tří kruhů', true],
  ['Cvičení tří kruhů', true],
  ['Tchaj-ťi kung – průpravná cvičení', true],
  ['Rychlá forma', false],
];

export function build({ content, page }) {
  const brokat = video('1Mmz_QpYk9s');
  const slov = video('1UPJuzGC1UY');
  return page({
    slug: 'cviceni',
    title: 'Cvičení',
    scripts: ['video'],
    frontPage: false,
    sections: [
      stage(['snih', 'peking', 'weiqi', 'hory']),

      hero({
        h1: 'Osm kusů brokátu, 13 slov a styl Yang',
        lead: 'Cvičení, která vyučujeme.',
        actions: `<nav class="actions" aria-label="Na této stránce">${more('#brokat', 'Osm kusů brokátu')}${more('#slov', '13 slov tchaj-ťi')}${more('#yang', 'Tchaj-ťi stylu Yang')}</nav>`,
        stageKey: 'snih',
      }),

      sec({
        id: 'skola', stageKey: 'snih',
        h2: 'Tchaj-ťi a čchi-kung Radost v pohybu',
        intro: SCHOOL_INTRO,
        body: `${rows(SCHOOL_FORMS.map(([name, desc]) => ({ name, desc })), 'Sestavy a cvičení')}
${rows(SCHOOL_WEAPONS.map(([name, desc]) => ({ name, desc })), 'Sestavy se zbraněmi')}
${rows(SCHOOL_STATIC.map(([name, desc]) => ({ name, desc })), 'Statická cvičení')}
<div class="actions reveal" style="margin-top: 28px">${more('/kurzy-a-lekce/#praha', 'Rozpis cvičení')}</div>`,
      }),

      sec({
        id: 'brokat', stageKey: 'snih',
        h2: 'Osm kusů brokátu',
        body: `<div class="prose reveal">
<p>Celá sestava nás dovede k harmonizaci energie qi v těle. Když je qi v harmonii, všechny složky Yin a Yang v těle jsou vyvážené. Když jsou složky Yin a Yang vyvážené, tělo je zdravé. Osm kusů brokátu je cvičení rozdělené do osmi jednotlivých cviků. Každý z osmi cviků je speciálně navržen tak, aby pracoval na konkrétní části těla.</p>
</div>
<figure class="media reveal" style="margin: 40px 0">${videoBox(brokat)}<figcaption>${brokat.title}</figcaption></figure>
<div class="actions reveal" style="margin-top: 28px">${btn('/osm-kusu-brokatu/', 'Osm kusů brokátu', { kind: 'quiet' })}${more('/kurzy-a-lekce/#kurz-brokat', 'Rozvrh a ceny')}</div>`,
      }),

      `<section class="sec" id="slov" data-stage="weiqi" aria-labelledby="slov-h">
<div class="field reveal">
<h2 class="h2" id="slov-h">13 slov tchaj-ťi</h2>
<ol class="words" aria-label="Třináct slov">
${WORDS.map((w) => `<li>${w}</li>`).join('\n')}
</ol>
<div class="prose">
<p>Těchto 13 slov tchaj-ťi čchüan (dřep, podepření, skládání, tlačení, oddělení, kroucení, extenze, objímání, tlačení dolů, zvedání vzad, bodání, zvedání a hledání) je spojeno s velmi jednoduchým provedením tak, aby se dalo snadno naučit, zapamatovat si ho a procvičit. Jako tradiční sólová forma tchaj-ťi čchüan je připsáno Zhang San Fengovi jako tvůrci.</p>
<p>Pro tuto formu 13 slov tchaj-ťi čchüan je nezbytné dodržovat správné provedení cviků, abychom byli schopni se řídit konkrétním souborem pravidel a udrželi tak kvalitu provedení. Abychom z tohoto cvičení měli užitek, musíme věnovat pozornost každému detailu. Přestože je tato forma velmi jednoduchá na provedení, má velký přínos pro zdraví, a je to proto, že se zaměřujeme na každý detail pohybu. Tyto detaily otevřou a aktivují meridiánové kanály uvnitř těla, takže energie čchi lépe aktivuje tělo, a tak se zlepší jeho stav.</p>
</div>
<figure class="media" style="margin-top: 36px">${videoBox(slov)}</figure>
<div class="actions" style="margin-top: 20px">${more('/kurzy-a-lekce/#kurz-slov', 'Rozvrh a ceny')}</div>
</div>
</section>`,

      sec({
        id: 'yang', stageKey: 'peking',
        h2: 'Tchaj-ťi stylu Yang',
        intro: 'Výuka probíhá dle instrukcí a předání od mistra Vincenta Chu, který je hlavním instruktorem a mistrem bostonské školy <a class="lnk" href="https://www.gstaichi.org/" rel="nofollow" target="_blank">Gin Soon Tai Chi Chuan Federation</a>. Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.',
        body: `${rows(FORMS.map(([n, t]) => ({ name: n, val: t ? '<span class="badge badge-on">Vyučuji</span>' : '' })), 'Kompletní nabídka sestav a cvičení stylu Yang tchaj-ťi')}
<div class="actions reveal" style="margin-top: 28px">${more('/kurzy-a-lekce/#kurz-yang', 'Rozvrh a ceny')}</div>`,
      }),

      sec({
        id: 'videa', stageKey: 'hory',
        h2: 'Videogalerie',
        body: `<div class="pair reveal">
<figure class="media">${videoBox(video('1nFm6-XwGpU'))}<figcaption>${video('1nFm6-XwGpU').title}</figcaption></figure>
<figure class="media">${videoBox(video('oZB6Gq4QzC4'))}<figcaption>${video('oZB6Gq4QzC4').title}</figcaption></figure>
</div>
<div class="actions reveal" style="margin-top: 28px">${btn('/videogalerie/', 'Videogalerie', { kind: 'quiet' })}${more('/kurzy-a-lekce/', 'Nabídka kurzů a lekcí')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
