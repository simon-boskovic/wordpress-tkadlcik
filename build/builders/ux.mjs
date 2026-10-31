/**
 * UX layer over the verbatim design markup (pre-launch round, no client input needed). Every change is an edit
 * {slug, file, id, name, why, find, replace} written against the prototype's markup: the builders apply it to
 * their sections (applyUx) and lib/reference-patches.mjs applies the very same edit to the served prototype
 * (D10–D14), so DoD visual parity compares against a reference that carries the change. The client's copy is
 * never reworded: links wrap existing words, de-emphasis is colour only, new UI text reuses existing labels
 * ("Nabídka kurzů a lekcí", "Kontakt", "Rozvrh a ceny") plus "Proběhlo" and "Přihlásit se e-mailem".
 *
 *   D10 past events (date-driven, content.mjs EVENTS + today): muted date + "Proběhlo" chip; past blocks after
 *       upcoming ones (Akce sections, home "Semináře a akce" cards); the past seminar's deposit sentence and CTA
 *       de-emphasised. Recomputed on every generate: rebuild after an event date passes (docs/HANDOVER.md).
 *   D11 next steps: "Rozvrh a ceny" in each Cvičení section → the matching course card on Nabídka kurzů
 *       (#kurz-brokat, #kurz-slov, #kurz-yang); a closing "Nabídka kurzů a lekcí" + "Kontakt" row on Cvičení,
 *       O mně, Články and Akce.
 *   D12 registration: "Přihlásit se e-mailem" (mailto with the course name as subject) on each course card.
 *   D13 Kontakt: the H1 names both places; each place links to its timetable (#praha, #zlin).
 *   D14 internal links in O mně's own words (→ Cvičení sections, → Akce #chu).
 */
import { ARROW } from '../fragments.mjs';
import { contact, isPast, today as buildToday } from '../content.mjs';

export const PAST_LABEL = 'Proběhlo';
export const BADGE = `<span class="chip">${PAST_LABEL}</span>`;
const MUTED = 'color: var(--muted)';
/** A past date chip: outlined and muted (instead of the filled neutral chip), followed by the badge. */
export const pastChip = (text) => `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px"><span class="chip chip-neutral" style="background: transparent; color: var(--muted); box-shadow: inset 0 0 0 1px var(--line-2)">${text}</span>${BADGE}</div>`;
/** A past date in running definition text: muted, followed by the badge. */
export const pastText = (text) => `<span style="${MUTED}">${text}</span> ${BADGE}`;

/** Course cards on Nabídka kurzů (ids + the e-mail subject = the card's heading, verbatim). */
export const COURSES = [
  { key: 'brokat', id: 'kurz-brokat', name: 'Osm kusů brokátu', para: 'získání základních návyků a dovedností.</p>', link: 'Videogalerie' },
  { key: 'slov', id: 'kurz-slov', name: '13 Words of Tchaj-ťi', para: 'tak aby energie mohla lépe cirkulovat uvnitř těla.</p>', link: 'Videogalerie' },
  { key: 'yang', id: 'kurz-yang', name: 'Tchaj-ťi stylu Yang', para: 'rychlou formu a párová cvičení.</p>', link: 'Video mistra Vincenta Chu styl Yang' },
];
export const ZLIN_COURSE = 'Cvičení ve Zlíně';
export const SIGNUP_LABEL = 'Přihlásit se e-mailem';
export const signupHref = (course) => `mailto:${contact.email}?subject=${encodeURIComponent(`Přihláška – ${course}`)}`;
const signup = (course) => `<a class="lnk small" href="${signupHref(course)}" style="padding: 6px 0">${SIGNUP_LABEL}</a>`;
/** "Rozvrh a ceny" → a place or course on Nabídka kurzů (a.lnk.small: ≥ 44 px, tk-a11y). */
export const rozvrhLink = (hash) => `<a class="lnk small" href="Rozvrh.dc.html#${hash}" style="align-self: flex-start">Rozvrh a ceny</a>`;

/** The closing next-step row (D11) appended to these pages (prototype files in reference-patches). */
export const NEXT_STEPS_PAGES = { cviceni: 'Cviceni.dc.html', 'o-mne': 'OMne.dc.html', clanky: 'Clanky.dc.html', akce: 'Seminare.dc.html' };
export const NEXT_STEPS = `<section class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div style="display: flex; flex-wrap: wrap; gap: 10px; border-top: 1px solid var(--line); padding-top: clamp(28px, 4vw, 40px)">
<a class="btn btn-dark" href="Rozvrh.dc.html">Nabídka kurzů a lekcí ${ARROW}</a>
<a class="btn btn-ghost" href="Kontakt.dc.html">Kontakt ${ARROW}</a>
</div>
</section>`;

/** Akce sections and home cards → the events they show (past when all have ended; none = never past). */
export const AKCE_SECTION_EVENTS = { chu: ['chu'], hory: ['hory-jaro', 'hory-leto'] };
export const HOME_CARD_EVENTS = { chu: ['chu'], hory: ['hory-jaro', 'hory-leto'], zlin: [] };

/** Stable partition: items whose events are not past first, then past ones, each in design order. */
export const upcomingFirst = (items, eventsOf, day) => [...items.filter((x) => !isPast(eventsOf(x), day)), ...items.filter((x) => isPast(eventsOf(x), day))];

/** The home "Semináře a akce" cards (Main.dc.html), from the chu card to the end of the Zlín card (the design links it to Rozvrh.dc.html, the build to #zlin). */
const HOME_CARDS = /<a class="card card-link reveal" href="Seminare\.dc\.html#chu">[\s\S]*?href="Rozvrh\.dc\.html(?:#zlin)?">[\s\S]*?<\/a>/;
const homeCardKey = (card) => (card.match(/href="Seminare\.dc\.html#(\w+)"/) || [, 'zlin'])[1];

/**
 * All UX edits for a build date (YYYY-MM-DD). Date-dependent ones are emitted only when they change something.
 * `find` is a string or a RegExp (must match exactly once per page/file); `replace` a string or (match) => string.
 */
export function uxEdits(day = buildToday) {
  const E = [];
  const add = (slug, file, id, name, why, find, replace) => E.push({ slug, file, id, name, why, find, replace });
  const PAST_WHY = 'past event (content.mjs EVENTS, end date before the build date): the date is muted and marked "Proběhlo" (existing .chip), so nobody plans around a finished event; recomputed on every rebuild';

  // D10 — past events.
  const chu = isPast(['chu'], day);
  if (chu) {
    add('akce', 'Seminare.dc.html', 'D10', 'past seminar: date chip + Proběhlo', PAST_WHY,
      '<span class="chip chip-neutral">27. 11. – 29. 11. 2025</span>\n<h2 class="h2">Seminář s mistrem Vincentem Chu', `${pastChip('27. 11. – 29. 11. 2025')}\n<h2 class="h2">Seminář s mistrem Vincentem Chu`);
    add('akce', 'Seminare.dc.html', 'D10', 'past seminar: deposit sentence muted', 'the registration/deposit sentence of a finished seminar is de-emphasised (muted colour, text verbatim), so it does not read as an open call',
      '<p class="body"><strong style="font-weight: 600">Pro přihlášení na seminář v Praze', `<p class="body" style="${MUTED}"><strong style="font-weight: 600">Pro přihlášení na seminář v Praze`);
    add('akce', 'Seminare.dc.html', 'D10', 'past seminar: CTA de-emphasised', 'the finished seminar\'s contact button becomes the ghost button (same label and target), so it no longer reads as the primary call to action',
      '<a class="btn btn-dark" href="Kontakt.dc.html" style="align-self: flex-start">Kontakt - ZŠ Jeremenkova', '<a class="btn btn-ghost" href="Kontakt.dc.html" style="align-self: flex-start">Kontakt - ZŠ Jeremenkova');
  }
  for (const [key, text] of [['hory-jaro', '10. – 12. 5. 2024'], ['hory-leto', '30. 7. neděle – 7. 7. 2024 neděle']]) {
    if (isPast([key], day)) add('akce', 'Seminare.dc.html', 'D10', `past term (${key})`, PAST_WHY, `<dd style="display: inline">${text}</dd>`, `<dd style="display: inline">${pastText(text)}</dd>`);
  }
  if (isPast(['zlin-termin'], day)) {
    add('kurzy-a-lekce', 'Rozvrh.dc.html', 'D10', 'past Zlín term', PAST_WHY, '<dd>pátek 19. 4. 2024, od 17:30 do 20:00h</dd>', `<dd>${pastText('pátek 19. 4. 2024, od 17:30 do 20:00h')}</dd>`);
  }
  const homeCards = (m) => {
    const cards = m.split(/\n(?=<a class="card card-link)/).map((c) => (chu && homeCardKey(c) === 'chu' ? c.replace('<span class="chip chip-neutral">27. 11. – 29. 11. 2025</span>', pastChip('27. 11. – 29. 11. 2025')) : c));
    return upcomingFirst(cards, (c) => HOME_CARD_EVENTS[homeCardKey(c)], day).join('\n');
  };
  if (Object.values(HOME_CARD_EVENTS).some((k) => isPast(k, day))) {
    add('domu', 'Main.dc.html', 'D10', 'home event cards: past marked, upcoming first', `${PAST_WHY}; past cards move after the current offers`, HOME_CARDS, homeCards);
  }

  // D11 — next steps from Cvičení to the timetable.
  const CV_WHY = 'next step: each exercise section links to its course card (schedule + price) on Nabídka kurzů a lekcí; label "Rozvrh a ceny" from that page\'s H1';
  add('cviceni', 'Cviceni.dc.html', 'D11', 'Rozvrh a ceny (#brokat)', CV_WHY, 'aby pracoval na konkrétní části těla.</p>', `aby pracoval na konkrétní části těla.</p>\n${rozvrhLink('kurz-brokat')}`);
  add('cviceni', 'Cviceni.dc.html', 'D11', 'Rozvrh a ceny (#slov)', CV_WHY, 'a tak se zlepší jeho stav.</p>', `a tak se zlepší jeho stav.</p>\n${rozvrhLink('kurz-slov')}`);
  add('cviceni', 'Cviceni.dc.html', 'D11', 'Rozvrh a ceny (#yang)', CV_WHY, '<h2 class="h2">Tchaj-ťi stylu <span class="serif">Yang</span></h2>', `<h2 class="h2">Tchaj-ťi stylu <span class="serif">Yang</span></h2>\n${rozvrhLink('kurz-yang')}`);

  // D11 ids + D12 registration on the course cards.
  for (const c of COURSES) {
    add('kurzy-a-lekce', 'Rozvrh.dc.html', 'D11', `course card id (${c.id})`, 'anchor for the "Rozvrh a ceny" links from Cvičení (no visual change; tabs.js opens the panel holding the target)',
      `<article class="card grid" style="--min: 380px; gap: 24px 48px; align-items: start">\n<div class="stack" style="gap: 12px">\n<h2 class="h3" style="font-size: 26px">${c.name}</h2>`,
      `<article id="${c.id}" class="card grid" style="--min: 380px; gap: 24px 48px; align-items: start">\n<div class="stack" style="gap: 12px">\n<h2 class="h3" style="font-size: 26px">${c.name}</h2>`);
    add('kurzy-a-lekce', 'Rozvrh.dc.html', 'D12', `registration link (${c.name})`, 'registration: a mailto link with the course in the subject next to the card\'s existing link (≥ 44 px .lnk.small); there is no form on the site',
      new RegExp(`${c.para.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n<a class="lnk small" href="[^"]*" style="align-self: flex-start; padding: 6px 0">${c.link}</a>`),
      (m) => `${c.para}\n<div style="display: flex; flex-wrap: wrap; column-gap: 24px">${m.slice(c.para.length + 1)}${signup(c.name)}</div>`);
  }
  add('kurzy-a-lekce', 'Rozvrh.dc.html', 'D12', `registration link (${ZLIN_COURSE})`, 'registration: a mailto link with the course in the subject next to the card\'s Kontakt button',
    `<a class="btn btn-jade btn-sm" href="Kontakt.dc.html" style="align-self: flex-start; margin-top: auto">Kontakt ${ARROW}</a>`,
    `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; margin-top: auto"><a class="btn btn-jade btn-sm" href="Kontakt.dc.html">Kontakt ${ARROW}</a>${signup(ZLIN_COURSE)}</div>`);

  // D13 — Kontakt.
  add('kontakt', 'Kontakt.dc.html', 'D13', 'H1 names both places', 'SEO/clarity: the page covers Praha 4 and Zlín, so the H1 (already SEO-tuned by the designer) names both',
    'Kontakt – tchaj-ťi <span class="serif">ZŠ Jeremenkova, Praha 4</span>', 'Kontakt – tchaj-ťi <span class="serif">Praha 4 a Zlín</span>');
  add('kontakt', 'Kontakt.dc.html', 'D13', 'place → timetable (Praha)', 'each place links to its timetable panel on Nabídka kurzů a lekcí (label "Rozvrh a ceny")',
    '<span class="small muted">Jeremenkova 1003/66A</span></div>', `<span class="small muted">Jeremenkova 1003/66A</span>${rozvrhLink('praha')}</div>`);
  add('kontakt', 'Kontakt.dc.html', 'D13', 'place → timetable (Zlín)', 'each place links to its timetable panel on Nabídka kurzů a lekcí (label "Rozvrh a ceny"); Zlín was reachable only from the home teaser',
    '<span class="small muted">Osvoboditelů 484, Zlín</span></div>', `<span class="small muted">Osvoboditelů 484, Zlín</span>${rozvrhLink('zlin')}</div>`);

  // D14 — internal links in O mně (the client's words wrapped, not changed).
  const OM_WHY = 'internal linking: the client\'s own words link to the page that explains them (text unchanged, inline .lnk like the gstaichi.org link)';
  add('o-mne', 'OMne.dc.html', 'D14', 'links: styl Yang, Vincent Chu', OM_WHY,
    'zejména rodinnému stylu Yang tchaj-ťi u mistra Vincenta Chu,', 'zejména <a class="lnk" href="Cviceni.dc.html#yang">rodinnému stylu Yang</a> tchaj-ťi u <a class="lnk" href="Seminare.dc.html#chu">mistra Vincenta Chu</a>,');
  add('o-mne', 'OMne.dc.html', 'D14', 'links: brokát, 13 slov', OM_WHY,
    'rodinné předání Osmi kusů brokátu a 13 slov tchaj-ťi.', 'rodinné předání <a class="lnk" href="Cviceni.dc.html#brokat">Osmi kusů brokátu</a> a <a class="lnk" href="Cviceni.dc.html#slov">13 slov tchaj-ťi</a>.');
  return E;
}

const count = (text, find) => (typeof find === 'string' ? text.split(find).length - 1 : (text.match(new RegExp(find.source, find.flags.replace('g', '') + 'g')) || []).length);
const replaceOnce = (text, find, replace) => (typeof find === 'string'
  ? text.replace(find, () => (typeof replace === 'function' ? replace(find) : replace))
  : text.replace(find, (m) => (typeof replace === 'function' ? replace(m) : replace)));

/** The section of an Akce page string (`<section id="chu"` …), or null. */
const sectionId = (html) => (html.match(/^<section id="([\w-]+)"/) || [])[1] || null;

/**
 * A page's sections with the UX layer applied: the page's edits (each must match exactly once across the
 * sections), Akce's dated sections ordered upcoming first (in their own slots), the next-step row appended.
 */
export function applyUx(slug, sections, day = buildToday) {
  const out = [...sections];
  for (const e of uxEdits(day).filter((x) => x.slug === slug)) {
    const hits = out.map((s) => count(s, e.find));
    const total = hits.reduce((a, b) => a + b, 0);
    if (total !== 1) throw new Error(`ux ${e.id} ${slug} (${e.name}): matched ${total} times, expected 1`);
    const i = hits.indexOf(1);
    out[i] = replaceOnce(out[i], e.find, e.replace);
  }
  if (slug === 'akce') {
    const slots = out.map((s, i) => (AKCE_SECTION_EVENTS[sectionId(s)] ? i : -1)).filter((i) => i >= 0);
    const sorted = upcomingFirst(slots.map((i) => out[i]), (s) => AKCE_SECTION_EVENTS[sectionId(s)], day);
    slots.forEach((slot, k) => { out[slot] = sorted[k]; });
  }
  if (NEXT_STEPS_PAGES[slug]) out.push(NEXT_STEPS);
  return out;
}

/** Prototype twin of the Akce reorder: the chu + hory sections of Seminare.dc.html in upcoming-first order (null = unchanged). */
export const AKCE_SECTIONS = /<section id="chu"[\s\S]*?<\/section>\n\n<section id="hory"[\s\S]*?<\/section>/;
export function akceOrderPatch(day = buildToday) {
  const keys = upcomingFirst(['chu', 'hory'], (k) => AKCE_SECTION_EVENTS[k], day);
  if (keys[0] === 'chu') return null;
  return (m) => { const [chuS, horyS] = m.split(/\n\n(?=<section id="hory")/); return `${horyS}\n\n${chuS}`; };
}
