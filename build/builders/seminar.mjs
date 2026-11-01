/**
 * Seminář s Vincentem Chu (/seminar-vincent-chu/, redesign 2026-11-01): merges the old site's two seminar pages
 * (/prazdna-stranka2/ and /cviceni-na-akci-s-jirim-ledvinou/, both 301 here: mu-plugins/tk-redirects.php). The text
 * is the newer page's (November 2025, deposit 1500 Kč); the older one repeated it with the 2024 schedule.
 */
import { stage, contactStatement, more, btn } from '../fragments.mjs';
import { hero, sec, rows, pastBadge } from './parts.mjs';

export function build({ content, page }) {
  const day = content.today;
  const past = pastBadge(['chu'], day);
  return page({
    slug: 'seminar-vincent-chu',
    title: 'Seminář s Vincentem Chu',
    scripts: [],
    frontPage: false,
    sections: [
      stage(['weiqi', 'wangmeng', 'peking', 'svitek']),

      hero({
        h1: 'Seminář s mistrem Vincentem Chu v Praze',
        lead: `27. 11. – 29. 11. 2025${past}`,
        text: 'Dobrý den, blíží se listopadové cvičení s Vincentem. V Praze bude učit DaoYinový čchi-kung – Hrátky pěti zvířat v sobotu 29. 11.',
        stageKey: 'weiqi',
      }),

      sec({
        id: 'program', stageKey: 'wangmeng',
        h2: 'Korektura dlouhé formy středního řádu',
        intro: 'Ve čtvrtek celý den a pátek celý den je korektura dlouhé formy středního řádu. Střední řád se bude cvičit ve čtvrtek dopoledne na Dobešce a jinak na ZŠ Jeremenkova, tedy čtvrtek 27. 11. odpoledne a pátek 28. 11. celý den.',
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
        h2: 'Přihlášení na seminář',
        body: `<p class="body reveal${past ? ' muted' : ''}"><strong>Pro přihlášení na seminář v Praze posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800.</strong></p>
<div class="actions reveal" style="margin-top: 28px">${past ? more('/kontakt/', 'Kontakt - ZŠ Jeremenkova') : btn('/kontakt/', 'Kontakt - ZŠ Jeremenkova')}${more('/akce/', 'Akce')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
