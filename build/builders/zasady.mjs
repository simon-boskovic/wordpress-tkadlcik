/**
 * Zásady ochrany osobních údajů — not in the tkadlcik design; modelled on martinadamus builders/zasady.mjs
 * (+ its content.mjs privacyBody, Ruling R52) and its prototype "Zasady ochrany osobnich udaju.dc.html":
 * eyebrow "Právní informace", one <h1>, an intro, numbered <h2> sections with bullet lists, effective date at
 * the end. Written in this site's design language (wrap / stack / eyebrow / h1 / h2.h3 like Kontakt / body /
 * card / lnk) and states only what THIS site and business really do:
 *   - no contact form, no own cookies but the consent ones (Complianz cmplz_*), fonts self-hosted;
 *   - e-mail/phone communication, course/seminar registrations, deposits by bank transfer (account on Akce);
 *   - server logs at the hosting provider (host not chosen yet);
 *   - Google Analytics (Site Kit) only after the statistics consent (Complianz blocks the tag until then;
 *     Consent Mode is OFF, so nothing is sent to Google before consent); consent cookies cmplz_* 365 days;
 *   - Google Maps and YouTube (youtube-nocookie) only after the visitor's click (fragments.mjs mapBox/videoBox).
 * Every fact not known yet is a visible "[doplnit: …]" / "[HOSTING – doplnit]" placeholder (docs/HANDOVER.md
 * lists them for the client) — never an invented value. The phone number is deliberately not repeated here
 * (it is disputed, content.mjs). `id="cookies"` = target of the footer's no-JS "Nastavení cookies" fallback.
 * SEO: noindex,follow + self canonical (R21; seo.mjs NOINDEX), not in the sitemap, not in llms.txt.
 */
import { stage } from '../fragments.mjs';

export const SLUG = 'zasady-ochrany-osobnich-udaju';
export const H1 = 'Zásady ochrany osobních údajů';

// Redesign 2026-11-01: legal text unchanged; only the markup classes changed (the "Právní informace" label above
// the h1 removed; cookie names set as <code>).
const h2 = (text, id = '') => `<h2 class="h3 legal-h reveal"${id ? ` id="${id}"` : ''}>${text}</h2>`;
const p = (t) => `<p class="body reveal">${t}</p>`;
const ul = (items) => `<ul class="legal-list body reveal">\n${items.map(([b, t]) => `<li><strong>${b}</strong> – ${t}</li>`).join('\n')}\n</ul>`;

export function build({ content, page }) {
  const b = content.business;
  const mail = `<a class="lnk" href="mailto:${content.contact.email}">${content.contact.email}</a>`;
  return page({
    slug: SLUG,
    title: H1,
    scripts: [],
    frontPage: false,
    sections: [
      stage(['svitek', 'hory', 'wangmeng', 'peking']),

      `<section class="sec hero hero-sub legal" data-stage="svitek">
<article class="legal-body">
<h1 class="h1 rise">${H1}</h1>
<p class="lead rise d2">Tyto zásady popisují, jaké osobní údaje v souvislosti s tímto webem, kurzy a semináři zpracovávám, proč, na jakém základě, jak dlouho a jaká máte práva.</p>

${h2('1. Správce')}
<div class="course legal-card">
<strong>${b.name}</strong>
<span class="body">IČO ${b.ico}</span>
<span class="body">Sídlo: ${b.address}</span>
<span class="body">Podnikatel zapsaný v živnostenském rejstříku, příslušný živnostenský úřad: Úřad městské části Praha 4</span>
<span class="body">E-mail: ${mail}</span>
</div>
${p('Pověřence pro ochranu osobních údajů jsem nejmenoval (jako drobný podnikatel nemám tuto povinnost). S otázkami k osobním údajům se obracejte na uvedený e-mail.')}

${h2('2. Jaké údaje zpracovávám, proč a jak dlouho')}
${ul([
  ['E-mail, telefon a kontaktní formulář', 'když mi napíšete, zavoláte nebo pošlete zprávu kontaktním formulářem na stránce Kontakt (dotaz na kurz, lekci nebo seminář), zpracovávám vaše jméno, e-mailovou adresu, případně telefonní číslo, zvolené téma a obsah zprávy. Účel: odpověď a domluva účasti. Právní základ: jednání o smlouvě a její plnění na vaši žádost (čl. 6 odst. 1 písm. b) GDPR). Zprávu z formuláře web odešle e-mailem do mé schránky a sám ji neukládá; na vaši adresu odešle krátké potvrzení o přijetí. Kvůli ochraně před spamem si web na 10 minut uloží otisk (hash) IP adresy odesílatele; právní základ: oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR). Uchování: [doplnit: lhůta, např. 3 roky od poslední komunikace].'],
  ['Přihlášky na kurzy a semináře', 'jméno, kontakt, zvolený kurz nebo akce a údaje o zaplacení zálohy. Zálohy se platí bankovním převodem na účet uvedený na stránce Akce; z převodu vidím jméno a číslo účtu plátce, částku, datum a zprávu pro příjemce. Účel: evidence přihlášky a zálohy, organizace kurzu nebo akce. Právní základ: plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR). Uchování: po dobu kurzu nebo akce a [doplnit: lhůta po jejím skončení]. Podmínky přihlášení a storna: [doplnit: storno podmínky seminářů].'],
  ['Účetní a daňové doklady', 'doklady o přijatých platbách (zálohy, kurzovné). Právní základ: zákonná povinnost (čl. 6 odst. 1 písm. c) GDPR). Uchování: po dobu, kterou stanoví účetní a daňové předpisy.'],
  ['Záznamy serveru', 'při každé návštěvě webu server automaticky zaznamená IP adresu, datum a čas, adresu stránky, typ prohlížeče a odkazující stránku. Záznamy vede poskytovatel hostingu. Účel: provoz a zabezpečení webu. Právní základ: oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR). Uchování: po dobu stanovenou poskytovatelem hostingu [HOSTING – doplnit].'],
  ['Statistika návštěvnosti', 'Google Analytics jen s vaším souhlasem, podrobnosti v bodě 4.'],
])}
${p('Poskytnutí údajů je dobrovolné; bez kontaktu se ale nelze přihlásit na kurz ani seminář. Automatizované rozhodování ani profilování neprovádím. Údaje neprodávám.')}

${h2('3. Komu údaje předávám')}
${ul([
  ['Poskytovatel hostingu', '[HOSTING – doplnit: název a sídlo]; provozuje web a vede záznamy serveru, údaje pro mě zpracovává jako zpracovatel.'],
  ['Poskytovatel e-mailu', 'e-mailová schránka centrum.cz, ve které je naše korespondence uložena.'],
  ['Banky', 'platbu zálohy zpracovává vaše a moje banka jako samostatní správci.'],
  ['Google', 'Google Ireland Limited (Irsko): statistiky Google Analytics jen s vaším souhlasem, mapa Google a videa YouTube až po vašem kliknutí (bod 4).'],
  ['Úřady', 'jen pokud to ukládá zákon (např. finanční úřad).'],
])}
${p('Mimo Evropskou unii údaje nepředávám; výjimkou je Google, který může údaje zpracovávat i v USA. Společnost Google LLC je certifikována v rámci EU–US Data Privacy Framework (rámec EU–USA pro ochranu osobních údajů), pro který Evropská komise rozhodla, že zajišťuje odpovídající úroveň ochrany.')}

${h2('4. Cookies, statistika a obsah třetích stran', 'cookies')}
${ul([
  ['Nezbytné', 'web sám žádné cookies nenastavuje; ukládá jen vaši volbu z cookie lišty (cookies <code>cmplz_*</code> nástroje Complianz: <code>cmplz_functional</code>, <code>cmplz_statistics</code>, <code>cmplz_marketing</code>, <code>cmplz_preferences</code>, <code>cmplz_banner-status</code>, <code>cmplz_policy_id</code> a <code>cmplz_consented_services</code>, platnost 365 dní). Tyto cookies souhlas nevyžadují. Právní základ: zákonná povinnost doložit souhlas (čl. 6 odst. 1 písm. c) GDPR).'],
  ['Statistické', 'Google Analytics (Google Ireland Limited, na webu přes plugin Google Site Kit) se načte až poté, co v cookie liště povolíte statistiky; do té doby je skript zablokovaný a Googlu se nic neodesílá. Zaznamenává navštívené stránky, čas a délku návštěvy, odkud jste přišli, typ zařízení a prohlížeče a přibližnou polohu odvozenou z IP adresy; vidím jen souhrnné statistiky. Cookies: <code>_ga</code> (rozlišení návštěvníků) a <code>_ga_*</code> (stav návštěvy), platnost až 2 roky (výchozí nastavení Google). Google údaje uchovává [doplnit: 2 nebo 14 měsíců podle nastavení Google Analytics] a může je zpracovávat i v USA (bod 3). Právní základ: váš souhlas (čl. 6 odst. 1 písm. a) GDPR).'],
  ['Marketingové', 'marketingové ani reklamní cookies web nepoužívá.'],
  ['Mapa Google', 'načte se až po kliknutí na tlačítko „Zobrazit mapu“; Google pak zpracuje vaši IP adresu a může nastavit vlastní cookies. Právní základ: váš souhlas daný kliknutím.'],
  ['Videa YouTube', 'načtou se až po kliknutí na video, v režimu rozšířené ochrany soukromí (youtube-nocookie.com); YouTube (Google) pak zpracuje vaši IP adresu a může do prohlížeče ukládat údaje. Právní základ: váš souhlas daný kliknutím.'],
  ['Písma', 'jsou uložena přímo na webu, při jejich načtení se nic nepředává třetím stranám.'],
])}
${p('Souhlas můžete kdykoli změnit nebo odvolat odkazem „Nastavení cookies“ v patičce webu, případně smazáním cookies v prohlížeči.')}

${h2('5. Právní základy')}
${ul([
  ['Souhlas', 'čl. 6 odst. 1 písm. a) GDPR: statistika Google Analytics, mapa Google a videa YouTube.'],
  ['Smlouva', 'čl. 6 odst. 1 písm. b) GDPR: odpovědi na dotazy, přihlášky na kurzy a semináře, zálohy.'],
  ['Zákonná povinnost', 'čl. 6 odst. 1 písm. c) GDPR: účetní a daňové doklady, doložení souhlasu s cookies.'],
  ['Oprávněný zájem', 'čl. 6 odst. 1 písm. f) GDPR: provoz a zabezpečení webu (záznamy serveru).'],
])}

${h2('6. Vaše práva')}
${p('Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování a přenositelnost. Proti zpracování na základě oprávněného zájmu můžete vznést námitku. Souhlas můžete kdykoli odvolat (u cookies odkazem „Nastavení cookies“ v patičce webu); zpracování před odvoláním tím není dotčeno. Požadavky posílejte na e-mail ' + mail + '; odpovím nejpozději do 1 měsíce.')}
${p('Stížnost můžete podat u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, <a class="lnk" href="https://www.uoou.gov.cz/" target="_blank" rel="noopener">www.uoou.gov.cz</a>.')}

${h2('7. Zabezpečení a změny')}
${p('Web běží na šifrovaném spojení (HTTPS), přístup do administrace webu i do e-mailové schránky je chráněn heslem. Tyto zásady mohu aktualizovat; aktuální verze je vždy na této stránce.')}
<p class="small muted">Platnost od ${content.privacy.effectiveDate}.</p>
</article>
</section>`,
    ],
  });
}
