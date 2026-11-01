/**
 * Nabídka kurzů a lekcí (redesign 2026-11-01): the course blocks keep the old site's structure (name, description,
 * Pravidelné cvičení, Místo, Cena). Anchors kept from the previous build: #praha #kurz-brokat #kurz-slov #kurz-yang
 * #zlin #cena #misto. Registration = mailto with the course as subject (there is no form).
 */
import { stage, mapBox, contactStatement, more, btn } from '../fragments.mjs';
import { hero, sec, facts, pastBadge } from './parts.mjs';

export const SIGNUP_LABEL = 'Přihlásit se';
/** The contact form's topics, in its order (same list as TK_FORM_TOPICS in mu-plugins/tk-form.php; a test checks). */
export const FORM_TOPICS = ['Osm kusů brokátu', '13 Words of Tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Cvičení ve Zlíně', 'Semináře a akce', 'Jiný dotaz'];
/** Sign-up = the Kontakt form with the topic preselected by the server (?tema=<n>, works without JS). */
export const signupHref = (course) => {
  const i = FORM_TOPICS.indexOf(course);
  if (i < 0) throw new Error(`signupHref: unknown topic ${course}`);
  return `/kontakt/?tema=${i + 1}#formular`;
};

export const COURSES = [
  { id: 'kurz-brokat', name: 'Osm kusů brokátu', video: '/cviceni/#brokat', videoLabel: 'Osm kusů brokátu',
    text: 'Známé čchi-kungové cvičení zaměřující se na rozvoj základních dovedností, posílení těla, protažení, otevření energetických kanálů a získání základních návyků a dovedností.',
    when: 'Úterý 18:00 - 20:00h<br>Osm kusů brokátu', price: '350 Kč lekce 120 minut, 10 lekcí 3 250 Kč' },
  { id: 'kurz-slov', name: '13 Words of Tchaj-ťi', video: '/cviceni/#slov', videoLabel: '13 slov tchaj-ťi',
    text: 'Krátké a jednoduché cvičení zlepšující vnímání energie čchi, je zaměřeno zejména na otevírání energetických meridiánů. Řadí se mezi cvičení na principu Daoyin, která kladou důraz na fyzický pohyb kombinovaný s principem dýchání tuina (nádech a výdech), tak aby energie mohla lépe cirkulovat uvnitř těla.',
    when: 'Úterý 18:00 - 19:30h<br>Osm kusů brokátu', price: '350 Kč lekce 90 minut, 10 lekcí 3 250 Kč' },
  { id: 'kurz-yang', name: 'Tchaj-ťi stylu Yang', video: '/videogalerie/', videoLabel: 'Video mistra Vincenta Chu styl Yang',
    text: 'Styl Yang tchaj-ťi je pojmenován podle členů rodiny Yang, kteří tento styl dosti proslavili. Vyučujeme tento styl podle tradice a rodinného předání mistra Vincenta Chu. Cvičíme klasickou dlouhou sestavu stylu Yang, krátké sestavy a sestavu Návrat k tchaj-ťi. Sestavy se zbraněmi meč, šavle, tyč, rychlou formu a párová cvičení.',
    when: 'Pondělí 18:00 - 19:30h<br>Sestava Yang 12 forem pro začátečníky, 13 Words of Tchaj-ťi', price: '350 Kč lekce 90 minut, 10 lekcí 3 250 Kč' },
];

export function build({ content, page }) {
  const mail = content.contact.email;
  const [praha, zlin] = content.places;
  return page({
    slug: 'kurzy-a-lekce',
    title: 'Nabídka kurzů a lekcí',
    scripts: ['map'],
    frontPage: false,
    sections: [
      stage(['peking', 'snih', 'zlin', 'svitek']),

      hero({
        h1: 'Kurzy tchaj-ťi a čchi-kungu: rozvrh a ceny',
        text: 'Výuka probíhá formou lekcí 90 minut nebo 120 minut, cvičíme v tělocvičně a v létě venku. Lekce jsou buď zaměřeny na čchi-kung, nebo tchaj-ťi.',
        actions: `<nav class="actions" aria-label="Na této stránce">${more('#praha', 'Praha 4')}${more('#zlin', 'Zlín')}${more('#cena', 'Ceny lekcí')}</nav>`,
        stageKey: 'peking',
      }),

      sec({
        id: 'praha', stageKey: 'snih',
        h2: 'Pravidelné cvičení v Praze 4',
        intro: 'Tělocvična ZŠ Jeremenkova, Jeremenkova 1003/66A.',
        body: COURSES.map((c) => `<article class="course reveal" id="${c.id}" aria-labelledby="${c.id}-h">
<h3 class="h3" id="${c.id}-h">${c.name}</h3>
<p class="body">${c.text}</p>
${facts([['Pravidelné cvičení', c.when], ['Místo', 'Tělocvična ZŠ Jeremenkova'], ['Cena', c.price]])}
<div class="actions"><a class="more" href="${signupHref(c.name)}">${SIGNUP_LABEL}</a><a class="more" href="${c.video}">${c.videoLabel}</a></div>
</article>`).join('\n'),
      }),

      sec({
        id: 'zlin', stageKey: 'zlin',
        h2: 'Cvičení ve Zlíně',
        intro: 'Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek. Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.',
        body: `<div class="course reveal">
${facts([['Místo', zlin.line], ['Termíny', `pátek 19. 4. 2024, od 17:30 do 20:00h${pastBadge(['zlin-termin'], content.today)}`], ['Cena', '400 Kč']])}
<div class="actions"><a class="more" href="${signupHref('Cvičení ve Zlíně')}">${SIGNUP_LABEL}</a>${more('/cviceni-ve-zline/', 'Cvičení ve Zlíně')}</div>
</div>`,
      }),

      sec({
        id: 'cena', stageKey: 'zlin',
        h2: 'Ceny lekcí',
        body: `<div class="figures reveal">
<div><span class="figure-n">350 Kč</span><span class="figure-l">lekce 90 minut</span></div>
<div><span class="figure-n">350 Kč</span><span class="figure-l">lekce 120 minut</span></div>
<div><span class="figure-n">3 250 Kč</span><span class="figure-l">10 lekcí</span></div>
<div><span class="figure-n">400 Kč</span><span class="figure-l">Cvičení ve Zlíně</span></div>
</div>`,
      }),

      sec({
        id: 'misto', stageKey: 'svitek',
        h2: 'Kde cvičíme: Praha 4 a Zlín',
        body: `<div class="stack-l">
<div class="media reveal">${mapBox(praha, content.mapsEmbedUrl, content.mapsLinkUrl)}<p><strong>${praha.name}</strong><br><span class="muted">${praha.street}, ${praha.postalCode} ${praha.city}</span></p></div>
<div class="media reveal">${mapBox(zlin, content.mapsEmbedUrl, content.mapsLinkUrl)}<p><strong>${zlin.name}</strong><br><span class="muted">${zlin.street}, ${zlin.postalCode} ${zlin.city}</span></p></div>
</div>
<div class="actions reveal" style="margin-top: 28px">${btn('/kontakt/', 'Kontakt')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
