/**
 * Kontakt (redesign 2026-11-01). Phone kept exactly as the old site prints it (10 digits, awaits the client).
 */
import { stage, mapBox, contactStatement, more } from '../fragments.mjs';
import { hero, sec } from './parts.mjs';

export function build({ content, page }) {
  const c = content.contact;
  const [praha] = content.places;
  return page({
    slug: 'kontakt',
    title: 'Kontakt',
    scripts: ['map', 'form'],
    frontPage: false,
    sections: [
      stage(['svitek', 'snih', 'praha', 'hory']),

      hero({
        h1: 'Kontakt: tchaj-ťi a čchi-kung v Praze 4',
        lead: 'Kurzy probíhají na adrese ZŠ Jeremenkova, Jeremenkova 1003/66A.',
        extra: `<ul class="rows rise d2">
<li><span class="r-name">${c.name}</span></li>
<li><a class="r-name" href="${c.phoneHref}">${c.phone}</a><span class="r-val">Telefon</span></li>
<li><a class="r-name" href="mailto:${c.email}">${c.email}</a><span class="r-val">E-mail</span></li>
</ul>`,
        stageKey: 'svitek',
      }),

      sec({
        id: 'formular', stageKey: 'snih',
        h2: 'Napište mi',
        body: `<div class="reveal"><!--tk-contact-form--></div>`,
      }),

      sec({
        id: 'praha', stageKey: 'praha',
        h2: 'Tělocvična ZŠ Jeremenkova, Praha 4',
        intro: `${praha.street}, ${praha.postalCode} ${praha.city}`,
        body: `<div class="media reveal">${mapBox(praha, content.mapsEmbedUrl, content.mapsLinkUrl)}</div>
<div class="actions reveal" style="margin-top: 20px">${more('/kurzy-a-lekce/#praha', 'Rozvrh a ceny')}</div>`,
      }),

      contactStatement(content, { id: 'napiste', heading: 'E-mail' }),
    ],
  });
}
