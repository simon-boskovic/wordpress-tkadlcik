/**
 * Osm kusů brokátu (/osm-kusu-brokatu/), SEO audit 2026-11-01 (H3): results for "osm kusů brokátu" are step-by-step
 * guides and videos, so the exercise has its own guide page. Text, the eight movements and the video are the old
 * site's (moved here from Cvičení, which keeps a summary and links here); the page leads to the Tuesday class.
 */
import { stage, videoBox, video, contactStatement, more, btn } from '../fragments.mjs';
import { hero, sec } from './parts.mjs';
import { BROCADES } from './cviceni.mjs';
import { signupHref } from './kurzy-a-lekce.mjs';

export function build({ content, page }) {
  const v = video('1Mmz_QpYk9s');
  return page({
    slug: 'osm-kusu-brokatu',
    title: 'Osm kusů brokátu',
    scripts: ['video'],
    frontPage: false,
    sections: [
      stage(['snih', 'weiqi', 'peking', 'hory']),

      hero({
        h1: 'Osm kusů brokátu: čchi-kung pro zdraví',
        lead: 'Je to velmi jednoduché a velmi účinné cvičení, prospěšné pro zdraví.',
        actions: `${btn('/kurzy-a-lekce/#kurz-brokat', 'Rozvrh a ceny')}${more('#cviky', 'Názvy jednotlivých brokátů')}`,
        stageKey: 'snih',
      }),

      sec({
        id: 'co-to-je', stageKey: 'snih',
        h2: 'Cvičení ze skupiny Daoyin',
        body: `<div class="prose reveal">
<p>Osm kusů brokátu je cvičení řadící se do skupiny Daoyin (dao znamená manipulaci s tělem a jeho částmi a yin znamená ovládání nebo vedení qi). Je to velmi jednoduché a velmi účinné cvičení, prospěšné pro zdraví. Staří Číňané tuto sestavu praktikovali po dlouhou dobu jako formu cvičení pro udržení zdraví. Je to nejlepší z tradičních čínských kultivačních metod. Pro svou jednoduchost a přínos ji praktikovalo mnoho lidí a vyvinula se do mnoha variací. V základu se rozděluje na formu v sedě a ve stoje. Cílem v sedě je kultivace mysli a zdraví, cílem sestavy procvičované ve stoje je trénink fyzického těla a jeho části. Ačkoli neexistují žádné důkazy, lidé dospěli k závěru, že sedící formu vytvořil Zong Li Quan, jeden z legendárních osmi nesmrtelných v čínské mytologii. Statickou formu vytvořil generál Yue Fei v dynastii Song (960–1279) jako bojové umění a využíval ho při výcviku svých vojáků.</p>
<p>Celá sestava nás dovede k harmonizaci energie qi v těle. Když je qi v harmonii, všechny složky Yin a Yang v těle jsou vyvážené. Když jsou složky Yin a Yang vyvážené, tělo je zdravé. Osm kusů brokátu je cvičení rozdělené do osmi jednotlivých cviků. Každý z osmi cviků je speciálně navržen tak, aby pracoval na konkrétní části těla.</p>
</div>`,
      }),

      sec({
        id: 'cviky', stageKey: 'weiqi',
        h2: 'Názvy jednotlivých brokátů',
        body: `<ol class="rows reveal">
${BROCADES.map(([n, d]) => `<li><span class="r-name">${n}</span><span class="r-desc">${d}</span></li>`).join('\n')}
</ol>`,
      }),

      sec({
        id: 'video', stageKey: 'peking',
        h2: 'Osm kusů brokátu na videu',
        body: `<figure class="media reveal">${videoBox(v)}<figcaption>${v.title}</figcaption></figure>`,
      }),

      sec({
        id: 'kurz', stageKey: 'hory',
        h2: 'Kurz Osm kusů brokátu v Praze 4',
        intro: 'Známé čchi-kungové cvičení zaměřující se na rozvoj základních dovedností, posílení těla, protažení, otevření energetických kanálů a získání základních návyků a dovedností.',
        body: `<div class="reveal">
<dl class="facts"><div><dt>Pravidelné cvičení</dt><dd><a class="lnk" href="/kurzy-a-lekce/#praha">Rozpis cvičení v Praze 4</a></dd></div><div><dt>Místo</dt><dd>Tělocvična ZŠ Jeremenkova</dd></div><div><dt>Cena</dt><dd>350 Kč lekce 120 minut, 10 lekcí 3 250 Kč</dd></div></dl>
</div>
<div class="actions reveal" style="margin-top: 28px">${btn(signupHref('Osm kusů brokátu'), 'Přihlásit se')}${more('/cviceni-ve-zline/', 'Cvičení ve Zlíně')}${more('/cviceni/', 'Cvičení')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
