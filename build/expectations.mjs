/**
 * What verify.mjs asserts on every generated page (redesign 2026-11-01; every page in build/pages needs an entry).
 *   h1        the one visible <h1> (whitespace collapsed)
 *   title     the exact <title> (seo.mjs SEO = build/seo.json; complete incl. the brand suffix, TSF adds none)
 *   texts     visible texts that must be on the page (compared case-insensitively)
 *   selectors elements that must exist
 *   unique    selectors that must match exactly once (in-page anchors other pages link to)
 *   scripts   page-specific theme scripts (_tk_scripts → <script id="tk-<name>-js">); every other page-specific
 *             script must be absent. nav, reveal, stage and vt (view transitions) are global and checked on every page.
 */

import { SEO } from './seo.mjs';
import { COURSES, signupHref } from './builders/kurzy-a-lekce.mjs';

/** Every page ends with the contact statement (fragments.mjs contactStatement) and has the picture stage. */
const COMMON = ['[data-stage] .stage-fig img[alt]', 'main a[href="mailto:tkadlcik@centrum.cz"]'];
/** One registration mailto per course (subject = the course name). */
const SIGNUP_SELECTORS = [...COURSES.map((c) => `#${c.id} a[href="${signupHref(c.name)}"]`), `#zlin a[href="${signupHref('Cvičení ve Zlíně')}"]`];

/** Theme scripts that only some pages may load. */
export const PAGE_SCRIPTS = ['map', 'video', 'breath', 'plate'];
/** Theme scripts every page loads. */
export const GLOBAL_SCRIPTS = ['nav', 'reveal', 'stage', 'vt'];

export default {
  domu: {
    h1: 'Tchaj-ťi a čchi-kung v Praze 4 a ve Zlíně',
    title: SEO['domu'].title,
    texts: ['Najít klid v pohybu a v klidu zase pohyb', 'Cvičení a kurzy, které nabízíme', 'Náplň lekcí tchaj-ťi a čchi-kungu', 'Semináře a akce', 'Nádech', 'Pravidelné cvičení', '18:00 - 19:30h', '3 250 Kč'],
    selectors: [...COMMON, 'a[href$="/kurzy-a-lekce/"]', 'a[href$="/seminar-vincent-chu/"]', 'a[href$="/cviceni-na-horach/"]', 'a[href$="/cviceni-ve-zline/"]', 'a[href="/wp-content/uploads/letak-savle.jpg"][download]', '[data-breath] .breath-disc', '[data-breath-toggle]', '[role=tablist] [role=tab][aria-selected="true"]', '.wordmark'],
    unique: ['[id="rozvrh"]', '[id="dech"]'],
    scripts: ['breath', 'plate', 'video'],
  },
  cviceni: {
    h1: 'Osm kusů brokátu, 13 slov a styl Yang',
    title: SEO['cviceni'].title,
    texts: ['Celá sestava nás dovede k harmonizaci energie qi v těle', '13 slov tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Vyučuji', 'Videogalerie'],
    selectors: [...COMMON, 'a[href="#brokat"]', 'a[href="#slov"]', 'a[href="#yang"]', '#brokat a[href$="/kurzy-a-lekce/#kurz-brokat"]', '#slov a[href$="/kurzy-a-lekce/#kurz-slov"]', '#yang a[href$="/kurzy-a-lekce/#kurz-yang"]', '#brokat [data-tk-video-box] button[data-tk-video]', '#slov [data-tk-video-box] button[data-tk-video]', '#videa a[href$="/videogalerie/"]', '#brokat a[href$="/osm-kusu-brokatu/"]'],
    unique: ['[id="brokat"]', '[id="slov"]', '[id="yang"]', '[id="videa"]'],
    scripts: ['video'],
  },
  'osm-kusu-brokatu': {
    h1: 'Osm kusů brokátu: čchi-kung pro zdraví',
    title: SEO['osm-kusu-brokatu'].title,
    texts: ['Osm kusů brokátu je cvičení řadící se do skupiny Daoyin', 'Názvy jednotlivých brokátů', 'Podpírání nebes oběma pažemi', 'Dopadem na paty masírujeme páteř', 'Úterý 18:00 - 20:00h'],
    selectors: [...COMMON, 'a[href$="/kurzy-a-lekce/#kurz-brokat"]', '[data-tk-video-box] button[data-tk-video]'],
    unique: ['[id="cviky"]'],
    scripts: ['video'],
  },
  videogalerie: {
    h1: 'Videogalerie tchaj-ťi a čchi-kungu',
    title: SEO['videogalerie'].title,
    texts: ['Začátečnická sestava 12 forem Yang tchaj-ťi', 'Mistr Vincent Chu', 'Ukázka sestavy s holí', 'Osm kusů brokátu', '13 slov tchaj-ťi', 'Video načteme z YouTube až po kliknutí.'],
    selectors: [...COMMON, '[data-tk-video-box] button[data-tk-video]', '[data-tk-video-box] a[href^="https://www.youtube.com/watch?v="]'],
    scripts: ['video'],
  },
  'kurzy-a-lekce': {
    h1: 'Kurzy tchaj-ťi a čchi-kungu: rozvrh a ceny',
    title: SEO['kurzy-a-lekce'].title,
    texts: ['Osm kusů brokátu', '13 Words of Tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Pravidelné cvičení', 'Místo', 'Cena', 'Cvičení ve Zlíně', 'Ceny lekcí', '3 250 Kč', '400 Kč', 'Kde cvičíme: Praha 4 a Zlín', 'Tělocvična ZŠ Jeremenkova', 'Centrum Jiný svět'],
    selectors: [...COMMON, 'a[href$="/cviceni/#brokat"]', 'a[href$="/cviceni/#slov"]', 'a[href$="/videogalerie/"]', '[data-tk-map-box] button[data-tk-map]', ...SIGNUP_SELECTORS],
    unique: ['[id="cena"]', '[id="misto"]', '[id="praha"]', '[id="zlin"]', '[id="kurz-brokat"]', '[id="kurz-slov"]', '[id="kurz-yang"]'],
    scripts: ['map'],
  },
  'cviceni-ve-zline': {
    h1: 'Tchaj-ťi a čchi-kung ve Zlíně',
    title: SEO['cviceni-ve-zline'].title,
    texts: ['Pravidelná cvičení ve Zlíně se konají 1x měsíčně vždy v pátek.', 'Centrum Jiný svět, Osvoboditelů 484, Zlín', '400 Kč'],
    selectors: [...COMMON, '[data-tk-map-box] button[data-tk-map]', '[data-tk-video-box] button[data-tk-video]'],
    scripts: ['map', 'video'],
  },
  akce: {
    h1: 'Semináře tchaj-ťi a cvičení na horách',
    title: SEO['akce'].title,
    texts: ['Na veškeré akce, které pořádáme, se dopravujeme po vlastní ose', 'Seminář s mistrem Vincentem Chu v Praze', 'Cvičení na horách v Krkonoších', 'Cvičení ve Zlíně', 'Stáhnout leták na Šavli'],
    selectors: [...COMMON, 'a[href$="/seminar-vincent-chu/"]', 'a[href$="/cviceni-na-horach/"]', 'a[href$="/cviceni-ve-zline/"]'],
    unique: ['[id="chu"]', '[id="hory"]'],
    scripts: [],
  },
  'seminar-vincent-chu': {
    h1: 'Seminář s mistrem Vincentem Chu v Praze',
    title: SEO['seminar-vincent-chu'].title,
    texts: ['Dobrý den, blíží se listopadové cvičení s Vincentem.', 'Denní harmonogram', 'Hrátky pěti zvířat', '1035195033/0800'],
    selectors: [...COMMON, 'a[href$="/kontakt/"]'],
    scripts: [],
  },
  'cviceni-na-horach': {
    h1: 'Cvičení na horách: Strážné v Krkonoších',
    title: SEO['cviceni-na-horach'].title,
    texts: ['Cvičíme v příjemném prostředí Krkonoš', 'Jarní cvičení na horách', 'Letní týdenní kurz na horách', 'Denní harmonogram', 'Penzion Exnar', '3 800 Kč'],
    selectors: [...COMMON, '.dayplan li'],
    scripts: [],
  },
  'o-mne': {
    h1: 'Daniel Tkadlčík: tchaj-ťi od roku 1997',
    title: SEO['o-mne'].title,
    texts: ['Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997.', 'Cesta k tchaj-ťi a mistr Vincent Chu', 'Moje filozofie', 'Yang Sau Chung'],
    selectors: [...COMMON, 'main p a[href$="/cviceni/#yang"]', 'main p a[href$="/cviceni/#brokat"]', 'main p a[href$="/cviceni/#slov"]', 'main p a[href$="/seminar-vincent-chu/"]'],
    scripts: ['video'],
  },
  clanky: {
    h1: 'Články o tchaj-ťi a čchi-kungu',
    title: SEO['clanky'].title,
    texts: ['Co je čchi-kung a tchaj-ťi', '10 principů mistra Yang Chen Fu', 'Hlavu drž zpříma', 'Pojednání o Wu-ťi (WuChi)', 'Postoj Wu Chi', 'Stáhnout'],
    selectors: [...COMMON, 'a[href="/wp-content/uploads/10-principu-mistra-yang-chen-fu.docx"][download]', 'a[href="/wp-content/uploads/pojednani-o-wu-ti.docx"][download]'],
    unique: ['[id="co-je"]'],
    scripts: [],
  },
  kontakt: {
    h1: 'Kontakt: tchaj-ťi Praha 4 a Zlín',
    title: SEO['kontakt'].title,
    texts: ['Mgr. Daniel Tkadlčík', '+420 773 287 1113', 'tkadlcik@centrum.cz', 'Jeremenkova 1003/66A', 'Osvoboditelů 484, Zlín'],
    selectors: [...COMMON, 'main a[href="tel:+4207732871113"]', '[data-tk-map-box] button[data-tk-map]', 'main a[href$="/kurzy-a-lekce/#praha"]', 'main a[href$="/cviceni-ve-zline/"]', '#formular form[data-tk-form] textarea[name="message"]'],
    scripts: ['map', 'form'],
  },
  // noindex,follow + self canonical, not in sitemap/llms.txt (verify --seo).
  'zasady-ochrany-osobnich-udaju': {
    h1: 'Zásady ochrany osobních údajů',
    title: SEO['zasady-ochrany-osobnich-udaju'].title,
    texts: ['Mgr. Daniel Tkadlčík', 'IČO 75979390', 'Pod vinohradem 68/18, 147 00 Praha 4 – Braník', 'Úřad městské části Praha 4', 'tkadlcik@centrum.cz', 'Google Analytics', '_ga', 'cmplz_*', 'EU–US Data Privacy Framework', 'youtube-nocookie.com', 'Nastavení cookies', 'Úřadu pro ochranu osobních údajů', '[HOSTING – doplnit'],
    selectors: ['main a[href="mailto:tkadlcik@centrum.cz"]', 'main a[href="https://www.uoou.gov.cz/"]'],
    unique: ['[id="cookies"]'],
    scripts: [],
  },
};
