/**
 * Domů (redesign 2026-11-01). Idea: "najít klid v pohybu a v klidu zase pohyb" becomes the split stage; the live
 * thing is the breathing guide (nádech / výdech, assets/js/breath.js). Copy from the old site (dan24.webnode.cz).
 */
import { btn, more, stage, contactStatement, videoBox, video } from '../fragments.mjs';
import { hero, sec, rows, pastBadge } from './parts.mjs';
import { SCHEDULE, NEW_COURSE, SUNDAYS, PRICE_NOTE } from './kurzy-a-lekce.mjs';

/**
 * The three courses (home showcase). Thumbnails = the client's own videos of each exercise. `when` follows the
 * owner's timetable of 1. 11. 2026, which has no separate lesson for Osm kusů brokátu or 13 Words (none shown).
 */
const COURSES = [
  { key: 'brokat', tab: 'Osm kusů brokátu', title: 'Osm kusů brokátu', when: '', thumb: 'yt-1Mmz_QpYk9s', alt: 'Osm kusů brokátu, jedno z provedení, které se v naší škole vyučuje',
    text: 'Známé čchi-kungové cvičení zaměřující se na rozvoj základních dovedností, posílení těla, protažení, otevření energetických kanálů a získání základních návyků a dovedností.' },
  { key: 'slov', tab: '13 Words of Tchaj-ťi', title: '13 Words of Tchaj-ťi', when: '', thumb: 'yt-1UPJuzGC1UY', alt: '13 slov tchaj-ťi',
    text: 'Krátké a jednoduché cvičení zlepšující vnímání energie čchi, je zaměřeno zejména na otevírání energetických meridiánů.' },
  { key: 'yang', tab: 'Yang Tchaj-ťi', title: 'Yang Tchaj-ťi', when: `${SCHEDULE[0].day} ${SCHEDULE[0].time}, sestava Yang 22 pohybů`, thumb: 'yt-1nFm6-XwGpU', alt: 'Začátečnická sestava 12 forem Yang tchaj-ťi',
    text: 'Styl Yang tchaj-ťi je pojmenován podle členů rodiny Yang, kteří tento styl dosti proslavili. Vyučujeme tento styl podle tradice a rodinného předání mistra Vincenta Chu.' },
];

export function build({ content, page }) {
  const day = content.today;
  const plate = `<div class="plate reveal" data-plate>
<div class="plate-pics">
${COURSES.map((c, i) => `<div data-plate-pic="${c.key}"${i ? ' hidden' : ''}>${videoBox(video(c.thumb.replace('yt-', '')))}</div>`).join('\n')}
</div>
<div class="plate-side">
<div class="tabs" role="tablist" aria-label="Cvičení">
${COURSES.map((c, i) => `<button type="button" class="tab" role="tab" id="tab-${c.key}" aria-controls="panel-${c.key}" aria-selected="${i ? 'false' : 'true'}"${i ? ' tabindex="-1"' : ''} data-plate-tab="${c.key}">${c.tab}</button>`).join('\n')}
</div>
<div class="plate-panels">
${COURSES.map((c, i) => `<div class="panel" role="tabpanel" id="panel-${c.key}" aria-labelledby="tab-${c.key}" data-plate-panel="${c.key}"${i ? ' hidden' : ''}>
<h3 class="h3">${c.title}</h3>
${c.when ? `<p class="small muted">${c.when}</p>` : ''}
<p class="body">${c.text}</p>
</div>`).join('\n')}
</div>
<div class="cells">
<a class="cell cell-ink" href="/kurzy-a-lekce/">Nabídka kurzů a lekcí</a>
<a class="cell cell-tone" href="/cviceni/">Cvičení</a>
</div>
</div>
</div>`;

  return page({
    slug: 'domu',
    title: 'Domů',
    scripts: ['breath', 'plate', 'video'],
    frontPage: true,
    // SEO audit 2026-11-01 (H6): the stage picture is the phone LCP element; fetch it with the HTML.
    preload: [{ src: '/wp-content/uploads/tk-ink-hory.webp', sizes: '(max-width: 899px) calc(104vw - 25px), calc(48.9vw - 21px)' }],
    sections: [
      stage(['hory', 'peking', 'portret', 'strazne']),

      hero({
        h1: 'Tchaj-ťi a čchi-kung v Praze 4 a ve Zlíně',
        lead: 'Najít klid v pohybu a v klidu zase pohyb je jeden z mnoha pohledů na cvičení tchaj-ťi a čchi-kungu, stejně tak i jiných forem hledajících klid a harmonii.',
        actions: `${btn('/kurzy-a-lekce/', 'Nabídka kurzů a lekcí')}${`<a class="more" href="/wp-content/uploads/letak-savle.jpg" download>Stáhnout leták na Šavli</a>`}`,
        wordmark: true,
        stageKey: 'hory',
      }),

      sec({
        id: 'naplne', stageKey: 'hory',
        h2: 'Náplň lekcí tchaj-ťi a čchi-kungu',
        body: `<div class="prose intro reveal">
<p>Čchi-kung a tchaj-ťi Radost v pohybu nabízí kurzy, víkendové semináře a individuální cvičení.</p>
<p>Náplní kurzů jsou cvičení zaměřená zejména na uvolnění, zklidnění, protažení a posílení našeho těla a celé naší bytosti. Ve své praxi čchi-kungu a tchaj-ťi propojuji cvičení s vědomým pohybem tak, aby nás směřoval k lehkosti a radosti při jejich provádění.</p>
<p>Výuka probíhá formou lekcí 90 minut nebo 120 minut, cvičíme v tělocvičně a v létě venku. Lekce jsou buď zaměřeny na čchi-kung, nebo tchaj-ťi.</p>
</div>
${rows([
  { name: 'Kloubní rozcvičení' },
  { name: 'Základní cvičení', desc: 'Statický čchi-kung, pozice zhan zhuang nebo základní postoje ze sestav tchaj-ťi.' },
  { name: 'Osm kusů brokátu nebo 13 slov tchaj-ťi', desc: 'Často do rozcvičky zařazuji cvičení Osm kusů brokátu nebo 13 slov tchaj-ťi, které pomáhá prohlubování základů.' },
], 'Průběh lekce')}`,
      }),

      sec({
        id: 'dech', stageKey: 'hory',
        h2: 'Nádech a výdech',
        body: `<div class="breath-box reveal">
<div class="breath" data-breath data-phase="in">
<span class="breath-disc" aria-hidden="true"></span>
<span class="breath-word" aria-hidden="true"><span class="in">Nádech</span><span class="ex">Výdech</span></span>
</div>
<div class="stack-l">
<p class="body">Fyzický pohyb kombinovaný s principem dýchání tuina (nádech a výdech), tak aby energie mohla lépe cirkulovat uvnitř těla.</p>
<div class="actions"><button type="button" class="btn btn-quiet" data-breath-toggle aria-pressed="false">Zastavit dech</button><span class="breath-count" data-breath-count aria-live="off"></span></div>
</div>
</div>`,
      }),

      sec({
        id: 'cviceni', stageKey: 'peking',
        h2: 'Cvičení a kurzy, které nabízíme',
        body: plate,
      }),

      `<section class="sec" id="rozvrh" data-stage="peking" aria-labelledby="rozvrh-h">
<div class="sheet-wrap reveal">
<div class="sheet">
<h2 class="sheet-title" id="rozvrh-h">Pravidelné cvičení</h2>
<p class="sheet-note">Tělocvična ZŠ Jeremenkova, Jeremenkova 1003/66A, Praha 4</p>
${SCHEDULE.map((s) => `<div class="sheet-group">
<h3>${s.day}</h3>
<div class="sheet-item"><span class="si-name">${s.name}</span><span class="si-val">${s.time}</span>${s.text ? `<span class="si-desc">${s.text}</span>` : ''}</div>
${s.day === NEW_COURSE.day ? `<div class="sheet-item"><span class="si-name">${NEW_COURSE.title}</span><span class="si-val">${NEW_COURSE.time}</span><span class="si-desc">${NEW_COURSE.text}</span></div>\n` : ''}</div>`).join('\n')}
<div class="sheet-group">
<h3>Neděle</h3>
${SUNDAYS.dates.map((d) => `<div class="sheet-item"><span class="si-name">${d.date}${pastBadge([d.key], day)}</span><span class="si-val">${SUNDAYS.time}</span></div>`).join('\n')}
</div>
<div class="sheet-group">
<h3>Cena</h3>
<div class="sheet-item"><span class="si-name">Lekce 120 minut</span><span class="si-val">350 Kč</span></div>
<div class="sheet-item"><span class="si-name">10 lekcí</span><span class="si-val">3 250 Kč</span><span class="si-desc">${PRICE_NOTE}</span></div>
<div class="sheet-item"><span class="si-name">Cvičení ve Zlíně</span><span class="si-val">400 Kč</span><span class="si-desc">1x měsíčně vždy v pátek, Centrum Jiný svět</span></div>
</div>
<p class="sheet-end"><a href="/kurzy-a-lekce/">Nabídka kurzů a lekcí</a></p>
</div>
</div>
</section>`,

      sec({
        id: 'mistr', stageKey: 'portret',
        h2: 'Yang tchaj-ťi podle mistra Vincenta Chu',
        body: `<div class="letter reveal">
<blockquote><p>„Každá forma cvičení je prázdná, pokud není spojena s radostí, tichostí a klidem mysli, které jsou podstatou našeho bytí a které se snažím ve cvičení rozvíjet.“</p></blockquote>
<p>Výuka probíhá dle instrukcí a předání od mistra Vincenta Chu, který je hlavním instruktorem a mistrem bostonské školy <a class="lnk" href="https://www.gstaichi.org/" rel="nofollow" target="_blank">Gin Soon Tai Chi Chuan Federation</a>. Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.</p>
<ol class="chain" aria-label="Linie předání"><li>Yang Sau Chung</li><li>Chu Gin Soon</li><li>Vincent Chu</li><li>Daniel Tkadlčík</li></ol>
<div class="sign"><span class="sign-name">Daniel Tkadlčík</span><span class="sign-role">cvičení tchaj-ťi se věnuji od roku 1997</span></div>
${more('/o-mne/', 'O mně')}
</div>`,
      }),

      sec({
        id: 'akce', stageKey: 'strazne',
        h2: 'Semináře a akce',
        body: `${rows([
  { name: NEW_COURSE.title, href: '/kurzy-a-lekce/#novy-kurz', val: `${NEW_COURSE.day} ${NEW_COURSE.time}`, desc: NEW_COURSE.text },
  { name: SUNDAYS.title, href: '/akce/#nedele', val: `${SUNDAYS.dates.map((d) => d.date.replace(/ 2026$/, '')).join(' a ')} 2026${pastBadge(SUNDAYS.dates.map((d) => d.key), day)}`, desc: SUNDAYS.text },
  { name: 'Seminář s mistrem Vincentem Chu', href: '/seminar-vincent-chu/', val: `21. 11. – 22. 11. 2026${pastBadge(['chu-2026'], day)}`, desc: 'Guo Yang Tzu – statický čchi-kung, vhodný i pro začátečníky. Ukázka uvolnění síly fa jin.' },
  { name: 'Seminář s mistrem Vincentem Chu', href: '/seminar-vincent-chu/', val: `27. 11. – 29. 11. 2025${pastBadge(['chu'], day)}`, desc: 'Korektura dlouhé formy středního řádu. DaoYinový čchi-kung – Hrátky pěti zvířat.' },
  { name: 'Cvičení na horách', href: '/cviceni-na-horach/', val: 'Strážné v Krkonoších', desc: 'Cvičíme v příjemném prostředí Krkonoš.' },
  { name: 'Cvičení ve Zlíně', href: '/cviceni-ve-zline/', val: '1x měsíčně vždy v pátek', desc: 'Náplní kurzu je Osm kusů brokátu a 13 slov tchaj-ťi.' },
])}
<div class="actions reveal" style="margin-top: 28px">${more('/akce/', 'Akce')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
