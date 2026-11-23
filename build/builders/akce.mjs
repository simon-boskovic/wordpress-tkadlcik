/**
 * Akce (redesign 2026-11-01): the overview of events; each has its own page again (/seminar-vincent-chu/,
 * /cviceni-na-horach/). Anchors #chu and #hory kept (#zlin removed with the Zlín lessons, 23. 11. 2026). The flyer (client-files/letak-savle.jpg)
 * is the client's own picture.
 */
import { stage, contactStatement, more } from '../fragments.mjs';
import { hero, sec, rows, pastBadge } from './parts.mjs';
import { SUNDAYS } from './kurzy-a-lekce.mjs';

export function build({ content, page }) {
  const day = content.today;
  return page({
    slug: 'akce',
    title: 'Akce',
    scripts: [],
    frontPage: false,
    sections: [
      stage(['wangmeng', 'weiqi', 'strazne']),

      hero({
        h1: 'Semináře tchaj-ťi a cvičení na horách',
        lead: 'Na veškeré akce, které pořádáme, se dopravujeme po vlastní ose. Tedy většinou jedeme auty a vzájemně se odvezeme.',
        stageKey: 'wangmeng',
      }),

      sec({
        id: 'nedele', stageKey: 'wangmeng',
        h2: SUNDAYS.title,
        intro: `${SUNDAYS.text} Tělocvična ZŠ Jeremenkova, Jeremenkova 1003/66A, Praha 4.`,
        body: `${rows(SUNDAYS.dates.map((d) => ({ name: `Neděle ${d.date}`, val: `${SUNDAYS.time}${pastBadge([d.key], day)}` })))}
<p class="body reveal" style="margin-top: 20px"><strong>Cena:</strong> ${SUNDAYS.price}.</p>
<div class="actions reveal" style="margin-top: 28px">${more('/kurzy-a-lekce/#nedele', 'Nabídka kurzů a lekcí')}</div>`,
      }),

      sec({
        id: 'chu', stageKey: 'weiqi',
        h2: 'Seminář s mistrem Vincentem Chu v Praze',
        intro: 'Mistr Vincent Chu učí v Praze v sobotu 28. 11. 2026 Hrátky pěti zvířat a v neděli 29. 11. 2026 Tchaj-ťi kung, pro úplné začátečníky i pokročilé cvičence. Cena 2 500 Kč za den, ZŠ Jeremenkova.',
        body: `${rows([
  { name: 'Sobota 28. 11. 2026', val: `Hrátky pěti zvířat${pastBadge(['chu-2026-so'], day)}` },
  { name: 'Neděle 29. 11. 2026', val: `Tchaj-ťi kung${pastBadge(['chu-2026-ne'], day)}` },
  { name: '21. 11. – 22. 11. 2026', val: `Guo Yang Tzu – statický čchi-kung${pastBadge(['chu-2026'], day)}` },
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
<p class="body reveal muted">Starší seminář, leták ponecháváme pro informaci. <span class="badge">Proběhlo</span></p>
<div class="actions reveal"><a class="btn btn-quiet" href="/wp-content/uploads/letak-savle.jpg" download>Stáhnout leták na Šavli</a></div>
</div>
<figure class="media reveal" style="max-width: 440px"><a class="zoom-link" href="/wp-content/uploads/letak-savle.jpg" data-tk-zoom><img class="pic pic-doc" src="./client-img/letak-savle-nahled.jpg" alt="Leták: Výukový seminář se šavlí stylu Yang tchaj-ťi" width="880" height="1245" loading="lazy" decoding="async"></a><figcaption>Kliknutím leták zvětšíte.</figcaption></figure>
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

      contactStatement(content),
    ],
  });
}
