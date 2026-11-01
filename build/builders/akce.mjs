/**
 * Akce (redesign 2026-11-01): the overview of events; each has its own page again (/seminar-vincent-chu/,
 * /cviceni-na-horach/, /cviceni-ve-zline/). Anchors #chu and #hory kept. The flyer (client-files/letak-savle.jpg)
 * is the client's own picture.
 */
import { stage, contactStatement, more } from '../fragments.mjs';
import { hero, sec, rows, pastBadge } from './parts.mjs';

export function build({ content, page }) {
  const day = content.today;
  return page({
    slug: 'akce',
    title: 'Akce',
    scripts: [],
    frontPage: false,
    sections: [
      stage(['wangmeng', 'weiqi', 'strazne', 'zlin']),

      hero({
        h1: 'Semináře tchaj-ťi a cvičení na horách',
        lead: 'Na veškeré akce, které pořádáme, se dopravujeme po vlastní ose. Tedy většinou jedeme auty a vzájemně se odvezeme.',
        stageKey: 'wangmeng',
      }),

      sec({
        id: 'chu', stageKey: 'weiqi',
        h2: 'Seminář s mistrem Vincentem Chu v Praze',
        intro: 'V Praze bude učit DaoYinový čchi-kung – Hrátky pěti zvířat v sobotu 29. 11. Ve čtvrtek celý den a pátek celý den je korektura dlouhé formy středního řádu.',
        body: `${rows([
  { name: 'Čtvrtek 27. 11. 2025', val: `Korekce dlouhé sestavy středního řádu${pastBadge(['chu'], day)}` },
  { name: 'Pátek 28. 11. 2025', val: `Korekce dlouhé sestavy středního řádu${pastBadge(['chu'], day)}` },
  { name: 'Sobota 29. 11. 2025', val: `Hrátky pěti zvířat${pastBadge(['chu'], day)}` },
])}
<div class="actions reveal" style="margin-top: 28px">${more('/seminar-vincent-chu/', 'Seminář s Vincentem Chu')}</div>`,
      }),

      `<section class="sec" id="letak" data-stage="weiqi" aria-labelledby="letak-h">
<div class="stack-l">
<div class="sec-head">
<h2 class="h2 reveal" id="letak-h">Výukový seminář se šavlí stylu Yang tchaj-ťi</h2>
<div class="actions reveal"><a class="btn btn-quiet" href="/wp-content/uploads/letak-savle.jpg" download>Stáhnout leták na Šavli</a></div>
</div>
<figure class="media reveal" style="max-width: 440px"><img class="pic" src="/wp-content/uploads/letak-savle.jpg" alt="Leták: Výukový seminář s šavlí stylu Yang tchaj-ťi" width="1587" height="2245" loading="lazy" decoding="async"></figure>
</div>
</section>`,

      sec({
        id: 'hory', stageKey: 'strazne',
        h2: 'Cvičení na horách v Krkonoších',
        intro: 'Cvičíme v příjemném prostředí Krkonoš, náplní semináře je ranní cvičení Osm kusů brokátu, dopolední průpravná cvičení tchaj-ťi kung, statické cvičení zhan zhuang a 13 slov tchaj-ťi. Dále budeme procvičovat základní sestavu 12 forem Yang tchaj-ťi.',
        body: `${rows([
  { name: 'Jarní cvičení na horách', href: '/cviceni-na-horach/', val: `10. – 12. 5. 2024${pastBadge(['hory-jaro'], day)}`, desc: 'Strážné v Krkonoších, Strážné 2. Penzion Exnar. Cena: 3 800 Kč' },
  { name: 'Letní týdenní kurz na horách', href: '/cviceni-na-horach/', val: `30. 7. neděle – 7. 7. 2024 neděle${pastBadge(['hory-leto'], day)}`, desc: 'Strážné v Krkonoších, Strážné 2. Penzion Exnar. Cena: 10 000 Kč' },
])}`,
      }),

      sec({
        id: 'zlin', stageKey: 'zlin',
        h2: 'Cvičení ve Zlíně',
        intro: 'Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek. Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.',
        body: `<div class="actions reveal">${more('/cviceni-ve-zline/', 'Cvičení ve Zlíně')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
