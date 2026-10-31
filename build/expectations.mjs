/**
 * What verify.mjs asserts on every generated page (port of martinadamus build/expectations.mjs). Values come
 * from the prototype (design_handoff_tkadlcik/*.dc.html) and build/seo.json; every page in build/pages needs
 * an entry.
 *   h1        the one visible <h1> (whitespace collapsed)
 *   title     the exact <title> (seo.mjs SEO = build/seo.json; complete incl. the brand suffix, TSF adds none)
 *   texts     visible texts that must survive the port (compared case-insensitively)
 *   selectors elements that must exist
 *   unique    selectors that must match exactly once (in-page anchors other pages link to)
 *   scripts   page-specific theme scripts (_tk_scripts → <script id="tk-<name>-js">); every other page-specific
 *             script must be absent. nav, reveal and vt (view transitions) are global and checked on every page.
 */

import { SEO } from './seo.mjs';

/** Theme scripts that only some pages may load. */
export const PAGE_SCRIPTS = ['tabs', 'map', 'video'];
/** Theme scripts every page loads. */
export const GLOBAL_SCRIPTS = ['nav', 'reveal', 'vt'];

export default {
  domu: {
    h1: 'Tchaj-ťi a čchi-kung v Praze 4 a ve Zlíně',
    title: SEO['domu'].title,
    texts: ['Najít klid v pohybu a v klidu zase pohyb', 'Cvičení a kurzy, které nabízíme', 'Náplň lekcí tchaj-ťi a čchi-kungu', 'Semináře a akce', 'Nádech', 'Pondělí 18:00 - 19:30h'],
    selectors: ['a[href$="/cviceni/#brokat"]', 'a[href$="/cviceni/#slov"]', 'a[href$="/cviceni/#yang"]', 'a[href$="/akce/#chu"]', 'a[href$="/akce/#hory"]', 'a[href$="/kurzy-a-lekce/"]', 'a[href$="/kurzy-a-lekce/#zlin"]', 'a[href="/wp-content/uploads/letak-savle.jpg"][download]', '.breath'],
    scripts: [],
  },
  cviceni: {
    h1: 'Osm kusů brokátu, 13 slov a tchaj-ťi stylu Yang',
    title: SEO['cviceni'].title,
    texts: ['Osm kusů brokátu je cvičení řadící se do skupiny Daoyin', '13 slov tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Videogalerie: sestavy tchaj-ťi a čchi-kungu'],
    selectors: ['a[href="#brokat"]', 'a[href="#slov"]', 'a[href="#yang"]', 'a[href="#videa"]', '#brokat [data-tk-video-box] button[data-tk-video]', '#slov [data-tk-video-box] button[data-tk-video]', '#videa [data-tk-video-box] a[href^="https://www.youtube.com/watch?v="]'],
    unique: ['[id="brokat"]', '[id="slov"]', '[id="yang"]', '[id="videa"]'],
    scripts: ['video'],
  },
  'kurzy-a-lekce': {
    h1: 'Kurzy tchaj-ťi a čchi-kungu: rozvrh a ceny',
    title: SEO['kurzy-a-lekce'].title,
    texts: ['Osm kusů brokátu', '13 Words of Tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Cvičení ve Zlíně', 'Ceny lekcí', '3 250 Kč', '400 Kč', 'Kde cvičíme: Praha 4 a Zlín', 'Tělocvična ZŠ Jeremenkova', 'Centrum Jiný svět'],
    selectors: ['[role=tablist] button[role=tab][aria-controls="praha"][aria-selected="true"]', '[role=tablist] button[role=tab][aria-controls="zlin"]', '[role=tabpanel]#praha', '[role=tabpanel]#zlin', 'a[href$="/cviceni/#brokat"]', 'a[href$="/cviceni/#slov"]', 'a[href$="/cviceni/#yang"]', '[data-tk-map-box] button[data-tk-map]'],
    unique: ['[id="cena"]', '[id="misto"]', '[id="praha"]', '[id="zlin"]'],
    scripts: ['tabs', 'map'],
  },
  akce: {
    h1: 'Semináře tchaj-ťi s mistrem Vincentem Chu a cvičení na horách',
    title: SEO['akce'].title,
    texts: ['Na veškeré akce, které pořádáme, se dopravujeme po vlastní ose', 'Seminář s mistrem Vincentem Chu v Praze', 'Cvičení na horách v Krkonoších', 'Denní harmonogram', '1035195033/0800'],
    selectors: ['a[href$="/kontakt/"]'],
    unique: ['[id="chu"]', '[id="hory"]'],
    scripts: [],
  },
  'o-mne': {
    h1: 'Daniel Tkadlčík, lektor tchaj-ťi od roku 1997',
    title: SEO['o-mne'].title,
    texts: ['Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997.', 'Cesta k tchaj-ťi a mistr Vincent Chu', 'Rodinný styl Yang u mistra Vincenta Chu', 'Moje filozofie'],
    selectors: [],
    scripts: [],
  },
  clanky: {
    h1: 'Články o tchaj-ťi a čchi-kungu',
    title: SEO['clanky'].title,
    texts: ['Co je čchi-kung a tchaj-ťi', '10 principů mistra Yang Chen Fu', 'Pojednání o Wu-ťi (WuChi)', 'Stáhnout'],
    selectors: ['a[href="/wp-content/uploads/10-principu-mistra-yang-chen-fu.docx"][download]', 'a[href="/wp-content/uploads/pojednani-o-wu-ti.docx"][download]'],
    scripts: [],
  },
  kontakt: {
    h1: 'Kontakt – tchaj-ťi ZŠ Jeremenkova, Praha 4',
    title: SEO['kontakt'].title,
    texts: ['Mgr. Daniel Tkadlčík', '+420 773 287 1113', 'tkadlcik@centrum.cz', 'Kde cvičíme: Praha 4 a Zlín', 'Jeremenkova 1003/66A', 'Osvoboditelů 484, Zlín'],
    selectors: ['main a[href="tel:+4207732871113"]', 'main a[href="mailto:tkadlcik@centrum.cz"]', '[data-tk-map-box] button[data-tk-map]'],
    scripts: ['map'],
  },
  // Not in the design (builders/zasady.mjs); noindex,follow + self canonical, not in sitemap/llms.txt (verify --seo).
  'zasady-ochrany-osobnich-udaju': {
    h1: 'Zásady ochrany osobních údajů',
    title: SEO['zasady-ochrany-osobnich-udaju'].title,
    texts: ['Mgr. Daniel Tkadlčík', 'IČO 75979390', 'Pod vinohradem 68/18, 147 00 Praha 4 – Braník', 'Úřad městské části Praha 4', 'tkadlcik@centrum.cz', 'Google Analytics', '_ga', 'cmplz_*', 'EU–US Data Privacy Framework', 'youtube-nocookie.com', 'Nastavení cookies', 'Úřadu pro ochranu osobních údajů', '[HOSTING – doplnit'],
    selectors: ['main a[href="mailto:tkadlcik@centrum.cz"]', 'main a[href="https://www.uoou.gov.cz/"]'],
    unique: ['[id="cookies"]'],
    scripts: [],
  },
};
