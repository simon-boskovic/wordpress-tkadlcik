/**
 * Seminář s Vincentem Chu (/seminar-vincent-chu/, redesign 2026-11-01): merges the old site's two seminar pages
 * (/prazdna-stranka2/ and /cviceni-na-akci-s-jirim-ledvinou/, both 301 here: mu-plugins/tk-redirects.php). The text
 * is the newer page's (November 2025, deposit 1500 Kč); the older one repeated it with the 2024 schedule.
 * The 2026 event leads (hero + #letak = the owner's flyer for 21.–22. 11. 2026, client-files/letak-gu-yang-tzu.jpg,
 * its facts repeated as text); the November 2025 seminar follows below, unchanged except for its date line.
 */
import { stage, contactStatement, more, btn } from '../fragments.mjs';
import { hero, sec, rows, pastBadge } from './parts.mjs';
import { signupHref, SIGNUP_LABEL } from './kurzy-a-lekce.mjs';

const FLYER = '/wp-content/uploads/letak-gu-yang-tzu.jpg';

export function build({ content, page }) {
  const day = content.today;
  const past = pastBadge(['chu'], day);
  const past26 = pastBadge(['chu-2026'], day);
  return page({
    slug: 'seminar-vincent-chu',
    title: 'Seminář s Vincentem Chu',
    scripts: [],
    frontPage: false,
    sections: [
      stage(['weiqi', 'wangmeng', 'peking', 'svitek']),

      hero({
        h1: 'Seminář s mistrem Vincentem Chu v Praze',
        lead: `21. 11. – 22. 11. 2026${past26}`,
        text: 'Guo Yang Tzu – statický čchi-kung, vhodný i pro začátečníky. Mistr Vincent Chu předvede uvolnění síly <em>fa jin</em>.',
        actions: `${past26 ? '' : btn(signupHref('Semináře a akce'), SIGNUP_LABEL)}${more('#letak', 'Leták a podrobnosti')}`,
        stageKey: 'weiqi',
      }),

      sec({
        id: 'letak', stageKey: 'svitek',
        h2: 'Guo Yang Tzu – statický čchi-kung',
        intro: `Guo Yang Tzu je statický čchi-kung spojený s procvičováním pojivových tkání, cvičení patří do skupiny <em>Yi Jin Jing</em>. V pozicích se masírují vnitřní orgány, čímž se podpoří oběh čchi a krve a uvolní se svaly. Cvičení je vhodné i pro začátečníky.`,
        body: `${rows([
  { name: 'Termín', val: `21. 11. – 22. 11. 2026${past26}` },
  { name: 'Čas', val: '10:00 – 12:30 a 15:00 – 17:30' },
  { name: 'Místo', val: 'Praha 4, ZŠ Jeremenkova, tělocvična' },
  { name: 'Cena', val: '2 500 Kč' },
])}
<p class="body reveal" style="margin-top: 24px">Mistr Vincent Chu předvede uvolnění síly <em>fa jin</em>.</p>
<div class="actions reveal" style="margin-top: 28px">${past26 ? '' : btn(signupHref('Semináře a akce'), SIGNUP_LABEL)}<a class="more" href="${FLYER}" download>Stáhnout leták</a></div>
<figure class="media reveal" style="max-width: 440px; margin-top: 32px"><a class="zoom-link" href="${FLYER}" data-tk-zoom><img class="pic pic-doc" src="${FLYER}" alt="Leták: Guo Yang Tzu, statický čchi-kung, ukázka mistra Vincenta Chu, 21.–22. 11. 2026, Praha 4" width="1055" height="1490" loading="lazy" decoding="async"></a><figcaption>Kliknutím leták zvětšíte.</figcaption></figure>`,
      }),

      sec({
        id: 'program', stageKey: 'wangmeng',
        h2: 'Korektura dlouhé formy středního řádu',
        intro: `<strong>27. 11. – 29. 11. 2025</strong>${past}<br>Dobrý den, blíží se listopadové cvičení s Vincentem. V Praze bude učit DaoYinový čchi-kung – Hrátky pěti zvířat v sobotu 29. 11. Ve čtvrtek celý den a pátek celý den je korektura dlouhé formy středního řádu. Střední řád se bude cvičit ve čtvrtek dopoledne na Dobešce a jinak na ZŠ Jeremenkova, tedy čtvrtek 27. 11. odpoledne a pátek 28. 11. celý den.`,
        body: '',
      }),

      sec({
        id: 'harmonogram', stageKey: 'peking',
        h2: 'Denní harmonogram',
        body: `${rows([
  { name: 'Dopolední cvičení, 9:30 - 12:00', val: 'Dobeška', desc: 'Korekce dlouhé sestavy středního řádu' },
  { name: 'Odpolední cvičení, 15:00 - 17:30', val: 'Jeremenkova', desc: 'Korekce dlouhé sestavy středního řádu' },
], 'Čtvrtek 27. 11. 2025')}
${rows([
  { name: 'Dopolední cvičení, 9:30 - 12:30', val: 'Jeremenkova', desc: 'Korekce dlouhé sestavy středního řádu' },
  { name: 'Odpolední cvičení, 15:00 - 17:30', val: 'ZŠ Jeremenkova', desc: 'Korekce dlouhé sestavy středního řádu' },
], 'Pátek 28. 11. 2025')}
${rows([
  { name: 'Dopolední cvičení, 10:00 - 12:30', val: 'ZŠ Jeremenkova', desc: 'Hrátky pěti zvířat' },
  { name: 'Odpolední cvičení, 15:30 - 18:00', val: 'ZŠ Jeremenkova', desc: 'Hrátky pěti zvířat' },
], 'Sobota 29. 11. 2025')}
<p class="small muted reveal" style="margin-top: 24px">ZŠ Jeremenkova – Jeremenkova 1003/66A</p>`,
      }),

      sec({
        id: 'prihlaseni', stageKey: 'svitek',
        h2: 'Přihlášení na seminář 2025',
        body: `<p class="body reveal${past ? ' muted' : ''}"><strong>Pro přihlášení na seminář v Praze posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800.</strong></p>
<div class="actions reveal" style="margin-top: 28px">${past ? more('/kontakt/', 'Kontakt - ZŠ Jeremenkova') : btn('/kontakt/', 'Kontakt - ZŠ Jeremenkova')}${more('/akce/', 'Akce')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
