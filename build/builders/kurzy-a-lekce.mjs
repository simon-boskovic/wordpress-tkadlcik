/**
 * Nabídka kurzů a lekcí (redesign 2026-11-01). Timetable, new course, Sundays and prices from the owner's
 * "Rozpis cvičení" (PDF received 1. 11. 2026; typos fixed, wording kept). The three course descriptions keep the
 * old site's text. Anchors: #praha #novy-kurz #nedele #kurzy #kurz-brokat #kurz-slov #kurz-yang #zlin #cena #misto.
 * Registration = the Kontakt form with the topic preselected (signupHref).
 */
import { stage, mapBox, contactStatement, more, btn } from '../fragments.mjs';
import { hero, sec, facts, rows, pastBadge } from './parts.mjs';

export const SIGNUP_LABEL = 'Přihlásit se';
/** The contact form's topics, in its order (same list as TK_FORM_TOPICS in mu-plugins/tk-form.php; a test checks). */
export const FORM_TOPICS = ['Osm kusů brokátu', '13 Words of Tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Cvičení ve Zlíně', 'Semináře a akce', 'Nový kurz pro začátečníky', 'Jiný dotaz'];
/** Sign-up = the Kontakt form with the topic preselected by the server (?tema=<n>, works without JS). */
export const signupHref = (course) => {
  const i = FORM_TOPICS.indexOf(course);
  if (i < 0) throw new Error(`signupHref: unknown topic ${course}`);
  return `/kontakt/?tema=${i + 1}#formular`;
};

/** Pravidelné cvičení v Praze 4 (owner's "Rozpis cvičení", 1. 11. 2026). Also on Domů (sheet) and in llms.txt. */
export const SCHEDULE = [
  { day: 'Pondělí', time: '18:00 - 20:00', name: 'Procvičování sestavy Yang 22 pohybů', text: 'Náplň lekce průpravná cvičení taichi-kung, stání v pozicích ze sestavy. Výuka, opravy, procvičování pohybů.' },
  { day: 'Úterý', time: '18:00 - 20:00', name: 'Taichi-kung, procvičování dlouhá sestava' },
  { day: 'Čtvrtek', time: '18:00 - 20:00', name: 'Taichi-kung, procvičování dlouhá sestava' },
];
export const NEW_COURSE = {
  title: 'Nový kurz od 7. 12. 2026', day: 'Pondělí', time: '19:00 - 21:30',
  text: 'Výuka Hrátky pěti zvířat, stání v pozicích Guo Yang Tzu, procvičování sestavy Yang tchaj-ťi 8 pohybů. Pro začátečníky.',
};
/** All-day Sundays (EVENTS keys for the "Proběhlo" badge). */
export const SUNDAYS = {
  title: 'Celodenní cvičení v neděli', time: '10:00 - 12:30 a 15:00 - 17:30',
  text: 'Dopoledne procvičování Hrátky pěti zvířat a taichi-kung. Odpoledne procvičování sestav a stání v pozicích.',
  dates: [{ key: 'nedele-11', date: '15. 11. 2026' }, { key: 'nedele-12', date: '13. 12. 2026' }],
};
export const PRICE = '350 Kč lekce 120 minut, 10 lekcí 3 250 Kč';
export const PRICE_NOTE = 'Platby za lekci nebo 10 lekcí za 3 250 Kč, platba předem, platí na 3 měsíce od data zaplacení na účet.';

export const COURSES = [
  { id: 'kurz-brokat', name: 'Osm kusů brokátu', video: '/cviceni/#brokat', videoLabel: 'Osm kusů brokátu',
    text: 'Známé čchi-kungové cvičení zaměřující se na rozvoj základních dovedností, posílení těla, protažení, otevření energetických kanálů a získání základních návyků a dovedností.' },
  { id: 'kurz-slov', name: '13 Words of Tchaj-ťi', video: '/cviceni/#slov', videoLabel: '13 slov tchaj-ťi',
    text: 'Krátké a jednoduché cvičení zlepšující vnímání energie čchi, je zaměřeno zejména na otevírání energetických meridiánů. Řadí se mezi cvičení na principu Daoyin, která kladou důraz na fyzický pohyb kombinovaný s principem dýchání tuina (nádech a výdech), tak aby energie mohla lépe cirkulovat uvnitř těla.' },
  { id: 'kurz-yang', name: 'Tchaj-ťi stylu Yang', video: '/videogalerie/', videoLabel: 'Video mistra Vincenta Chu styl Yang',
    text: 'Styl Yang tchaj-ťi je pojmenován podle členů rodiny Yang, kteří tento styl dosti proslavili. Vyučujeme tento styl podle tradice a rodinného předání mistra Vincenta Chu. Cvičíme klasickou dlouhou sestavu stylu Yang, krátké sestavy a sestavu Návrat k tchaj-ťi. Sestavy se zbraněmi meč, šavle, tyč, rychlou formu a párová cvičení.' },
];

export function build({ content, page }) {
  const [praha, zlin] = content.places;
  const day = content.today;
  return page({
    slug: 'kurzy-a-lekce',
    title: 'Nabídka kurzů a lekcí',
    scripts: ['map'],
    frontPage: false,
    sections: [
      stage(['peking', 'praha', 'snih', 'zlin', 'svitek']),

      hero({
        h1: 'Kurzy tchaj-ťi a čchi-kungu: rozvrh a ceny',
        text: 'Výuka probíhá formou lekcí 90 minut nebo 120 minut, cvičíme v tělocvičně a v létě venku. Lekce jsou buď zaměřeny na čchi-kung, nebo tchaj-ťi.',
        actions: `<nav class="actions" aria-label="Na této stránce">${more('#praha', 'Praha 4')}${more('#novy-kurz', 'Nový kurz')}${more('#nedele', 'Neděle')}${more('#zlin', 'Zlín')}${more('#cena', 'Ceny lekcí')}</nav>`,
        stageKey: 'peking',
      }),

      sec({
        id: 'praha', stageKey: 'praha',
        h2: 'Rozpis cvičení v Praze 4',
        intro: 'Tělocvična ZŠ Jeremenkova, Jeremenkova 1003/66A.',
        body: `${rows(SCHEDULE.map((s) => ({ name: s.name, val: `${s.day} ${s.time}`, desc: s.text || '' })), 'Pravidelné cvičení')}
<div class="actions reveal" style="margin-top: 28px"><a class="more" href="${signupHref('Tchaj-ťi stylu Yang')}">${SIGNUP_LABEL}</a>${more('#cena', 'Ceny lekcí')}</div>`,
      }),

      sec({
        id: 'novy-kurz', stageKey: 'snih',
        h2: NEW_COURSE.title,
        body: `<div class="course reveal">
<p class="body">${NEW_COURSE.text}</p>
${facts([['Pravidelné cvičení', `${NEW_COURSE.day} ${NEW_COURSE.time}`], ['Místo', 'Tělocvična ZŠ Jeremenkova']])}
<div class="actions"><a class="more" href="${signupHref('Nový kurz pro začátečníky')}">${SIGNUP_LABEL}</a></div>
</div>`,
      }),

      sec({
        id: 'nedele', stageKey: 'snih',
        h2: SUNDAYS.title,
        intro: SUNDAYS.text,
        body: `${rows(SUNDAYS.dates.map((d) => ({ name: `Neděle ${d.date}`, val: `${SUNDAYS.time}${pastBadge([d.key], day)}` })))}
<div class="actions reveal" style="margin-top: 28px"><a class="more" href="${signupHref('Semináře a akce')}">${SIGNUP_LABEL}</a></div>`,
      }),

      sec({
        id: 'kurzy', stageKey: 'snih',
        h2: 'Co na lekcích cvičíme',
        body: COURSES.map((c) => `<article class="course reveal" id="${c.id}" aria-labelledby="${c.id}-h">
<h3 class="h3" id="${c.id}-h">${c.name}</h3>
<p class="body">${c.text}</p>
<div class="actions"><a class="more" href="${signupHref(c.name)}">${SIGNUP_LABEL}</a><a class="more" href="${c.video}">${c.videoLabel}</a></div>
</article>`).join('\n'),
      }),

      sec({
        id: 'zlin', stageKey: 'zlin',
        h2: 'Cvičení ve Zlíně',
        intro: 'Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek. Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.',
        body: `<div class="course reveal">
${facts([['Místo', zlin.line], ['Termíny', `pátek 19. 4. 2024, od 17:30 do 20:00h${pastBadge(['zlin-termin'], day)}`], ['Cena', '400 Kč']])}
<div class="actions"><a class="more" href="${signupHref('Cvičení ve Zlíně')}">${SIGNUP_LABEL}</a>${more('/cviceni-ve-zline/', 'Cvičení ve Zlíně')}</div>
</div>`,
      }),

      sec({
        id: 'cena', stageKey: 'zlin',
        h2: 'Ceny lekcí',
        body: `<div class="figures reveal">
<div><span class="figure-n">350 Kč</span><span class="figure-l">lekce 120 minut</span></div>
<div><span class="figure-n">3 250 Kč</span><span class="figure-l">10 lekcí</span></div>
<div><span class="figure-n">400 Kč</span><span class="figure-l">Cvičení ve Zlíně</span></div>
</div>
<p class="body reveal" style="margin-top: 28px">${PRICE_NOTE}</p>`,
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
