// The pre-launch UX layer (builders/ux.mjs): past events by date, next-step links, registration mailtos,
// Kontakt H1 + place links, O mně internal links; the reference patches carry the same edits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as content from '../content.mjs';
import * as builders from '../builders/index.mjs';
import { createFinalizer } from '../lib/finalize.mjs';
import { definePage } from '../generate.mjs';
import { applyPatches } from '../lib/reference-patches.mjs';
import { COURSES, NEXT_STEPS_PAGES, ZLIN_COURSE, signupHref, upcomingFirst, uxEdits } from '../builders/ux.mjs';
import { EVENTS, isPast, pragueDate } from '../content.mjs';

/** All pages built as if today were `day`. */
const pagesAt = (day) => {
  const fin = createFinalizer();
  const page = (def) => definePage(fin, def);
  return Object.values(builders).flatMap((b) => [].concat(b.build({ content: { ...content, today: day }, page })));
};
const html = (pages, slug) => pages.find((p) => p.slug === slug).elements.map((e) => e.elements[0].settings.html).join('\n');
const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('isPast: the end day itself is not past, the day after is; no events = never past; unknown key throws', () => {
  assert.equal(isPast(['chu'], '2025-11-29'), false);
  assert.equal(isPast(['chu'], '2025-11-30'), true);
  assert.equal(isPast(['hory-jaro', 'hory-leto'], '2024-06-01'), false, 'one of two still ahead');
  assert.equal(isPast(['hory-jaro', 'hory-leto'], '2024-07-08'), true);
  assert.equal(isPast([], '2099-01-01'), false);
  assert.throws(() => isPast(['nope'], '2025-01-01'), /unknown event nope/);
  assert.equal(pragueDate(new Date('2025-11-29T23:30:00Z')), '2025-11-30', 'Prague date, not UTC');
  assert.deepEqual(upcomingFirst(['a', 'b', 'c'], (x) => (x === 'a' ? ['chu'] : []), '2026-01-01'), ['b', 'c', 'a']);
});

test('every event the pages print is in EVENTS exactly as printed', () => {
  const pages = pagesAt('2026-10-31');
  const all = text(pages.map((p) => html(pages, p.slug)).join('\n'));
  for (const [k, e] of Object.entries(EVENTS)) {
    assert.ok(all.includes(e.text), `${k}: "${e.text}" on the pages`);
    assert.match(e.endDate, /^\d{4}-\d{2}-\d{2}$/);
    if (e.startDate) assert.ok(e.startDate <= e.endDate, k);
  }
});

test('2026-10-31 (all design events over): Proběhlo + muted dates, past blocks after current ones, texts verbatim', () => {
  const pages = pagesAt('2026-10-31');
  const akce = html(pages, 'akce');
  assert.equal((akce.match(/>Proběhlo</g) || []).length, 3, 'chu + both mountain terms');
  // client text unchanged (only wrapped / recoloured)
  for (const t of ['Pro přihlášení na seminář v Praze posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800.', 'Termín: 10. – 12. 5. 2024', 'Termín: 30. 7. neděle – 7. 7. 2024 neděle', 'Kontakt - ZŠ Jeremenkova']) assert.ok(text(akce).includes(t), t);
  assert.match(akce, /<a href="\/kontakt\/" class="btn btn-ghost[^"]*">Kontakt - ZŠ Jeremenkova/, 'past seminar CTA de-emphasised');
  assert.doesNotMatch(akce, /href="\/kontakt\/" class="btn btn-dark[^"]*">Kontakt - ZŠ/);
  // both blocks past: design order kept (chu, then hory), next-step row last
  assert.ok(akce.indexOf('id="chu"') < akce.indexOf('id="hory"'));
  const domu = html(pages, 'domu');
  assert.equal((domu.match(/>Proběhlo</g) || []).length, 1, 'only the dated chu card is badged');
  const order = [...domu.matchAll(/<a href="\/(akce\/#chu|akce\/#hory|kurzy-a-lekce\/#zlin)" class="card card-link/g)].map((m) => m[1]);
  assert.deepEqual(order, ['kurzy-a-lekce/#zlin', 'akce/#chu', 'akce/#hory'], 'ongoing Zlín first, past blocks after in design order');
  const kurzy = html(pages, 'kurzy-a-lekce');
  assert.equal((kurzy.match(/>Proběhlo</g) || []).length, 1, 'Zlín term');
  assert.ok(text(kurzy).includes('pátek 19. 4. 2024, od 17:30 do 20:00h Proběhlo'));
});

test('2025-11-01 (seminar ahead, mountains over): seminar unmarked and its CTA primary; it sorts first on the home page', () => {
  const pages = pagesAt('2025-11-01');
  const akce = html(pages, 'akce');
  assert.equal((akce.match(/>Proběhlo</g) || []).length, 2, 'the two 2024 mountain terms only');
  assert.match(akce, /<a href="\/kontakt\/" class="btn btn-dark[^"]*">Kontakt - ZŠ Jeremenkova/);
  assert.ok(akce.indexOf('id="chu"') < akce.indexOf('id="hory"'), 'upcoming chu before the past mountain block');
  const domu = html(pages, 'domu');
  assert.doesNotMatch(domu, />Proběhlo</);
  const order = [...domu.matchAll(/<a href="\/(akce\/#chu|akce\/#hory|kurzy-a-lekce\/#zlin)" class="card card-link/g)].map((m) => m[1]);
  assert.deepEqual(order, ['akce/#chu', 'kurzy-a-lekce/#zlin', 'akce/#hory']);
});

test('2024-01-01 (everything ahead): no badge anywhere, design order everywhere', () => {
  const pages = pagesAt('2024-01-01');
  for (const p of pages) assert.doesNotMatch(html(pages, p.slug), /Proběhlo/, p.slug);
  assert.equal(uxEdits('2024-01-01').filter((e) => e.id === 'D10').length, 0);
  const order = [...html(pages, 'domu').matchAll(/<a href="\/(akce\/#chu|akce\/#hory|kurzy-a-lekce\/#zlin)" class="card card-link/g)].map((m) => m[1]);
  assert.deepEqual(order, ['akce/#chu', 'akce/#hory', 'kurzy-a-lekce/#zlin']);
});

test('Akce order: dated sections sort in their own slots; the hero stays first, the next-step row last', () => {
  const ids = (day) => pagesAt(day).find((p) => p.slug === 'akce').elements.map((e) => e.elements[0].settings.html).map((x) => (x.match(/^<section id="(\w+)"/) || [, x.includes('Nabídka kurzů') ? 'next' : 'hero'])[1]);
  assert.deepEqual(ids('2024-07-08'), ['hero', 'chu', 'hory', 'next'], 'chu ahead, mountains over');
  assert.deepEqual(ids('2026-10-31'), ['hero', 'chu', 'hory', 'next'], 'both over: design order');
  assert.deepEqual(upcomingFirst(['chu', 'hory'], (k) => ({ chu: ['chu'], hory: [] })[k], '2026-01-01'), ['hory', 'chu'], 'an upcoming block moves before a past one');
});

test('next steps: Cvičení sections link their course card; the closing row on four pages; course cards carry those ids', () => {
  const pages = pagesAt('2026-10-31');
  const cv = html(pages, 'cviceni');
  for (const c of COURSES) {
    const sec = cv.slice(cv.indexOf(`id="${c.key}"`));
    assert.match(sec.slice(0, sec.indexOf('</section>')), new RegExp(`href="/kurzy-a-lekce/#${c.id}"[^>]*>Rozvrh a ceny</a>`), c.key);
    assert.equal((html(pages, 'kurzy-a-lekce').match(new RegExp(`id="${c.id}"`, 'g')) || []).length, 1, c.id);
  }
  for (const slug of Object.keys(NEXT_STEPS_PAGES)) {
    const last = pages.find((p) => p.slug === slug).elements.at(-1).elements[0].settings.html;
    assert.match(last, /<a href="\/kurzy-a-lekce\/" class="btn btn-dark">Nabídka kurzů a lekcí/, slug);
    assert.match(last, /<a href="\/kontakt\/" class="btn btn-ghost">Kontakt </, slug);
  }
  for (const slug of ['domu', 'kurzy-a-lekce', 'kontakt']) assert.doesNotMatch(pages.find((p) => p.slug === slug).elements.at(-1).elements[0].settings.html, /<a href="\/kontakt\/" class="btn btn-ghost">Kontakt <svg/, slug);
});

test('registration: one mailto per course card, subject "Přihláška – <course>" URL-encoded, address from content.mjs', () => {
  const k = html(pagesAt('2026-10-31'), 'kurzy-a-lekce');
  assert.equal(signupHref('Osm kusů brokátu'), 'mailto:tkadlcik@centrum.cz?subject=P%C5%99ihl%C3%A1%C5%A1ka%20%E2%80%93%20Osm%20kus%C5%AF%20brok%C3%A1tu');
  for (const name of [...COURSES.map((c) => c.name), ZLIN_COURSE]) {
    assert.equal(k.split(`href="${signupHref(name)}"`).length - 1, 1, name);
    assert.equal(decodeURIComponent(signupHref(name).split('subject=')[1]), `Přihláška – ${name}`);
  }
  assert.equal((k.match(/>Přihlásit se e-mailem</g) || []).length, 4);
  assert.throws(() => definePage(createFinalizer(), { slug: 't', title: 'T', sections: ['<section><h1>x</h1><a href="mailto:other@x.cz?subject=a">a</a></section>'] }), /differs from content\.mjs/);
});

test('Kontakt: H1 names both places, each place links its timetable panel; O mně links wrap the client\'s words', () => {
  const pages = pagesAt('2026-10-31');
  const k = html(pages, 'kontakt');
  assert.match(k, /<h1[^>]*>Kontakt – tchaj-ťi <span class="serif">Praha 4 a Zlín<\/span><\/h1>/);
  assert.match(k, /Osvoboditelů 484, Zlín<\/span><a href="\/kurzy-a-lekce\/#zlin" class="lnk small[^"]*">Rozvrh a ceny<\/a>/);
  assert.match(k, /Jeremenkova 1003\/66A<\/span><a href="\/kurzy-a-lekce\/#praha" class="lnk small[^"]*">Rozvrh a ceny<\/a>/);
  const o = html(pages, 'o-mne');
  for (const [href, words] of [['/cviceni/#yang', 'rodinnému stylu Yang'], ['/akce/#chu', 'mistra Vincenta Chu'], ['/cviceni/#brokat', 'Osmi kusů brokátu'], ['/cviceni/#slov', '13 slov tchaj-ťi']]) {
    assert.match(o, new RegExp(`<a href="${href.replace(/\//g, '\\/')}" class="lnk">${words}</a>`), words);
  }
  assert.ok(text(o).replace(/ ([,.])/g, '$1').includes('Od roku 2007 se intenzivně věnuji zejména rodinnému stylu Yang tchaj-ťi u mistra Vincenta Chu, který vyučuje komplexní systém rodiny Yang. Mimo jiné mě naučil rodinné předání Osmi kusů brokátu a 13 slov tchaj-ťi.'));
  // the heading mentioning him stays unlinked
  assert.match(o, /<h3 class="h3">Rodinný styl Yang u mistra Vincenta Chu<\/h3>/);
});

test('reference: every UX edit is applied to its prototype file at today\'s date (D10–D14) and absent edits leave no trace', () => {
  const read = (f) => readFileSync(new URL(`../../design_handoff_tkadlcik/${f}`, import.meta.url), 'utf8');
  assert.match(applyPatches('Kontakt.dc.html', read('Kontakt.dc.html')), /Kontakt – tchaj-ťi <span class="serif">Praha 4 a Zlín<\/span>/);
  for (const f of Object.values(NEXT_STEPS_PAGES)) {
    const out = applyPatches(f, read(f));
    assert.match(out, /<a class="btn btn-dark" href="Rozvrh\.dc\.html">Nabídka kurzů a lekcí[\s\S]*<\/section>\n<\/main>/, f);
    assert.match(out, /<style id="tk-ux-css">\/\* tk-ux:start[\s\S]*tk-ux:end \*\/<\/style>/, f);
  }
  const main = applyPatches('Main.dc.html', read('Main.dc.html'));
  assert.equal((main.match(/>Proběhlo</g) || []).length, isPast(['chu']) ? 1 : 0);
});
