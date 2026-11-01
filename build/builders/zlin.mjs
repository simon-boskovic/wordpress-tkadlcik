/**
 * Cvičení ve Zlíně (/cviceni-ve-zline/, restored route, redesign 2026-11-01). Text from the old page.
 */
import { stage, contactStatement, more, mapBox, videoBox, video, btn } from '../fragments.mjs';
import { signupHref } from './kurzy-a-lekce.mjs';
import { hero, sec, facts, pastBadge } from './parts.mjs';

export function build({ content, page }) {
  const zlin = content.places[1];
  const brokat = video('1Mmz_QpYk9s');
  const slov = video('1UPJuzGC1UY');
  return page({
    slug: 'cviceni-ve-zline',
    title: 'Cvičení ve Zlíně',
    scripts: ['map', 'video'],
    frontPage: false,
    sections: [
      stage(['zlin', 'vejir', 'svitek']),

      hero({
        h1: 'Tchaj-ťi a čchi-kung ve Zlíně',
        lead: 'Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek. Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.',
        actions: `${btn(signupHref('Cvičení ve Zlíně'), 'Přihlásit se')}`,
        stageKey: 'zlin',
      }),

      sec({
        id: 'terminy', stageKey: 'zlin',
        h2: 'Místo, termíny a cena',
        body: `<div class="reveal">${facts([
  ['Místo', zlin.line],
  ['Termíny', `pátek 19. 4. 2024, od 17:30 do 20:00h${pastBadge(['zlin-termin'], content.today)}`],
  ['Cena', '400 Kč'],
])}</div>
<div class="media reveal" style="margin-top: 40px">${mapBox(zlin, content.mapsEmbedUrl, content.mapsLinkUrl)}</div>`,
      }),

      sec({
        id: 'naplne', stageKey: 'vejir',
        h2: 'Osm kusů brokátu a 13 slov tchaj-ťi',
        body: `<div class="pair">
<figure class="media reveal">${videoBox(brokat)}<figcaption>${brokat.title}</figcaption></figure>
<figure class="media reveal">${videoBox(slov)}<figcaption>${slov.title}</figcaption></figure>
</div>
<div class="actions reveal" style="margin-top: 28px">${more('/cviceni/', 'Cvičení')}${more('/kurzy-a-lekce/#zlin', 'Nabídka kurzů a lekcí')}</div>`,
      }),

      contactStatement(content, { lead: 'Centrum Jiný svět, Osvoboditelů 484, Zlín.' }),
    ],
  });
}
