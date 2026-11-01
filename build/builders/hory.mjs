/**
 * Cvičení na horách (/cviceni-na-horach/, restored route, redesign 2026-11-01). Text from the old page; the terms
 * are 2024 and marked "Proběhlo" (content.mjs EVENTS). The summer dates print as the old site had them.
 */
import { stage, contactStatement, more, btn } from '../fragments.mjs';
import { signupHref } from './kurzy-a-lekce.mjs';
import { hero, sec, rows, facts, pastBadge } from './parts.mjs';

const DAY = [
  ['7:30 - 8:30h', 'Ranní cvičení', true, 2], ['8:30 - 10:00h', 'Snídaně', false, 3], ['10:30 - 12:30h', 'Dopolední cvičení', true, 5],
  ['12:30 - 16:30h', 'Pauza odpočinek', false, 8], ['16:30 - 18:00h', 'Odpolední cvičení', true, 4], ['18:30h', 'Večeře', false, 2],
];

export function build({ content, page }) {
  const day = content.today;
  return page({
    slug: 'cviceni-na-horach',
    title: 'Cvičení na horách',
    scripts: [],
    frontPage: false,
    sections: [
      stage(['strazne', 'snih', 'hory', 'svitek']),

      hero({
        h1: 'Cvičení na horách: Strážné v Krkonoších',
        text: 'Cvičíme v příjemném prostředí Krkonoš, náplní semináře je ranní cvičení Osm kusů brokátu, dopolední průpravná cvičení tchaj-ťi kung, statické cvičení zhan zhuang a 13 slov tchaj-ťi.',
        actions: `<a class="more" href="#terminy">Termíny a ceny</a><a class="more" href="#misto">Penzion Exnar ve Strážném</a>`,
        stageKey: 'strazne',
      }),

      sec({
        id: 'terminy', stageKey: 'snih',
        h2: 'Termíny a ceny',
        body: `${rows([
  { name: 'Jarní cvičení na horách', val: `10. – 12. 5. 2024${pastBadge(['hory-jaro'], day)}`, desc: 'Cena: 3 800 Kč. Přihlášky: e-mailem, nebo osobně, rezervace místa po zaplacení zálohy 1000 Kč do 20. 4. 2024.' },
  { name: 'Letní týdenní kurz na horách', val: `30. 7. neděle – 7. 7. 2024 neděle${pastBadge(['hory-leto'], day)}`, desc: 'Cena: 10 000 Kč. Přihlášky: e-mailem, nebo osobně, rezervace místa po zaplacení zálohy 1000 Kč.' },
])}`,
      }),

      sec({
        id: 'den', stageKey: 'hory',
        h2: 'Denní harmonogram',
        body: `<div class="dayplan-scroll reveal"><ol class="dayplan" aria-label="Denní harmonogram">
${DAY.map(([t, n, on, f]) => `<li${on ? ' class="on"' : ''}><span class="num">${t}</span><span>${n}</span></li>`).join('\n')}
</ol></div>`,
      }),

      sec({
        id: 'misto', stageKey: 'svitek',
        h2: 'Penzion Exnar ve Strážném',
        body: `<div class="reveal">${facts([
  ['Místo', 'Strážné v Krkonoších, Strážné 2. Penzion Exnar<br><a class="lnk" href="https://penzion-exnar.ubytovani-strazne-krkonose.cz/" rel="nofollow" target="_blank">penzion-exnar.ubytovani-strazne-krkonose.cz</a>'],
  ['Ubytování', 'Polopenze, ubytování ve 2 až 3 lůžkových pokojích, výborná strava, možnost výletů po okolí, pokoje jsou se soc. zařízením.'],
  ['Přihlášky', 'E-mailem, nebo osobně, rezervace místa po zaplacení zálohy 1000 Kč.'],
])}</div>
<div class="actions reveal" style="margin-top: 28px">${btn(signupHref('Semináře a akce'), 'Přihlásit se')}${more('/akce/', 'Akce')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
