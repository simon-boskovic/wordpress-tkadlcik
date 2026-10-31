/**
 * Akce — port of Seminare.dc.html <main>, one Elementor section per <section>. Markup verbatim from the
 * prototype; lib/finalize.mjs turns the style attributes into tk-s-* classes and the *.dc.html links into site paths.
 *
 * SEO deltas (reference patch D6 keeps the DoD reference in step): in the seminar's harmonogram cards the day is
 * the <h4> and the topic a <p class="h3"> (two days share the topic, so the topics made duplicate headings); the
 * h4 is styled exactly like the design's .mono span. The mountain section's "Denní harmonogram" gets a visually
 * hidden " v Krkonoších" so the two h3s differ for assistive tech and outlines without changing the look.
 * The penzion link: the design's http://…/cs/ answers 404 (http and https, 2026-10-31); the visible text stays,
 * the href is the site's working https home page.
 */
import { ARROW } from '../fragments.mjs';
import { applyUx } from './ux.mjs';

/** A harmonogram day as the card's heading, styled exactly like the design's `<span class="mono …">` it replaces. */
const DAY_STYLE = "margin: 0; font-family: 'Geist Mono', ui-monospace, 'SFMono-Regular', monospace; font-size: 13px; font-weight: 400; letter-spacing: .01em; line-height: 1.6";
export const dayHeading = (day, dark = false) => (dark
  ? `<h4 class="mono" style="color: var(--on-dark-muted); ${DAY_STYLE}">${day}</h4>`
  : `<h4 class="mono muted" style="color: var(--muted); ${DAY_STYLE}">${day}</h4>`);
/** The card's topic, formerly its <h4>: same look (.h3), no heading. */
export const dayTopic = (topic) => `<p class="h3" style="margin: 0">${topic}</p>`;
/** Screen-reader-only suffix of the mountain section's "Denní harmonogram" (no visual change). */
export const HORY_HEADING = '<h3 class="eyebrow">Denní harmonogram<span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0"> v Krkonoších</span></h3>';
/** The design's harmonogram cards: [day, topic, dark]. */
export const DAYS = [
  ['Čtvrtek 27. 11. 2025', 'Korekce dlouhé sestavy středního řádu', false],
  ['Pátek 28. 11. 2025', 'Korekce dlouhé sestavy středního řádu', false],
  ['Sobota 29. 11. 2025', 'Hrátky pěti zvířat', true],
];

export function build({ content, page }) {
  return page({
    slug: 'akce',
    title: 'Akce',
    scripts: [],
    frontPage: false,
    sections: applyUx('akce', [
      `<section class="wrap" style="padding-top: clamp(56px, 9vw, 120px); padding-bottom: clamp(48px, 6vw, 80px)">
<div class="stack" style="gap: 28px; max-width: 1080px">
<span class="eyebrow rise">Akce</span>
<h1 class="h1 rise d1">Semináře tchaj-ťi s mistrem Vincentem Chu <span class="serif">a cvičení na horách</span></h1>
<p class="lead rise d2">Na veškeré akce, které pořádáme, se dopravujeme po vlastní ose. Tedy většinou jedeme auty a vzájemně se odvezeme.</p>
</div>
</section>`,

      `<section id="chu" class="wrap" style="padding-bottom: clamp(72px, 10vw, 128px)">
<div class="grid" style="--min: 440px; gap: 32px 64px; align-items: start; margin-bottom: 32px">
<div class="stack reveal" style="gap: 16px">
<span class="chip chip-neutral">27. 11. – 29. 11. 2025</span>
<h2 class="h2">Seminář s mistrem Vincentem Chu <span class="serif">v Praze</span></h2>
</div>
<div class="stack reveal" style="gap: 14px">
<p class="body">Dobrý den, blíží se listopadové cvičení s Vincentem.</p>
<p class="body">V Praze bude učit DaoYinový čchi-kung – Hrátky pěti zvířat v sobotu 29. 11.</p>
<p class="body">Ve čtvrtek celý den a pátek celý den je korektura dlouhé formy středního řádu. Střední řád se bude cvičit ve čtvrtek dopoledne na Dobešce a jinak na ZŠ Jeremenkova, tedy čtvrtek 27. 11. odpoledne a pátek 28. 11. celý den.</p>
<p class="body"><strong style="font-weight: 600">Pro přihlášení na seminář v Praze posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800.</strong></p>
<a class="btn btn-dark" href="Kontakt.dc.html" style="align-self: flex-start">Kontakt - ZŠ Jeremenkova ${ARROW}</a>
</div>
</div>
<h3 class="eyebrow" style="margin-bottom: 16px">Denní harmonogram</h3>
<ol class="grid" style="--min: 300px; gap: 12px">
<li class="card stack reveal" style="gap: 18px">
${dayHeading('Čtvrtek 27. 11. 2025')}
${dayTopic('Korekce dlouhé sestavy středního řádu')}
<ul class="rows small">
<li style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 0"><span>Dopolední cvičení <span class="mono">9:30 - 12:00</span></span><span class="muted">Dobeška</span></li>
<li style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 0"><span>Odpolední cvičení <span class="mono">15:00 - 17:30</span></span><span class="muted">Jeremenkova</span></li>
</ul>
</li>
<li class="card stack reveal" style="gap: 18px">
${dayHeading('Pátek 28. 11. 2025')}
${dayTopic('Korekce dlouhé sestavy středního řádu')}
<ul class="rows small">
<li style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 0"><span>Dopolední cvičení <span class="mono">9:30 - 12:30</span></span><span class="muted">Jeremenkova</span></li>
<li style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 0"><span>Odpolední cvičení <span class="mono">15:00 - 17:30</span></span><span class="muted">ZŠ Jeremenkova</span></li>
</ul>
</li>
<li class="card card-dark on-dark stack reveal" style="gap: 18px">
${dayHeading('Sobota 29. 11. 2025', true)}
${dayTopic('Hrátky pěti zvířat')}
<ul class="small">
<li style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--on-dark-line)"><span>Dopolední cvičení <span class="mono">10:00 - 12:30</span></span><span style="color: var(--on-dark-muted)">ZŠ Jeremenkova</span></li>
<li style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--on-dark-line); border-bottom: 1px solid var(--on-dark-line)"><span>Odpolední cvičení <span class="mono">15:30 - 18:00</span></span><span style="color: var(--on-dark-muted)">ZŠ Jeremenkova</span></li>
</ul>
</li>
</ol>
<p class="small muted" style="margin-top: 16px">ZŠ Jeremenkova – Jeremenkova 1003/66A</p>
</section>`,

      `<section id="hory" class="wrap" style="padding-bottom: clamp(72px, 10vw, 136px)">
<div class="card reveal" style="padding: clamp(28px, 5vw, 64px); border-radius: 32px; display: flex; flex-direction: column; gap: clamp(36px, 5vw, 56px)">
<div class="grid" style="--min: 420px; gap: 40px; align-items: center">
<div class="stack" style="gap: 18px">
<span class="chip chip-neutral">Strážné v Krkonoších</span>
<h2 class="h2">Cvičení na horách <span class="serif">v Krkonoších</span></h2>
<p class="body">Cvičíme v příjemném prostředí Krkonoš, náplní semináře je ranní cvičení Osm kusů brokátu, dopolední průpravná cvičení tchaj-ťi kung, statické cvičení zhan zhuang a 13 slov tchaj-ťi. Dále budeme procvičovat základní sestavu 12 forem Yang tchaj-ťi.</p>
</div>
<div class="ph" style="aspect-ratio: 4 / 3; min-height: 0"><span>[Foto]</span></div>
</div>

<div class="grid" style="--min: 300px; gap: 12px">
<div class="stack" style="gap: 10px; padding: 24px; border-radius: 20px; background: var(--bg)">
<h3 class="h3">Jarní cvičení na horách</h3>
<dl class="stack small" style="gap: 4px"><div><dt class="muted" style="display: inline">Termín: </dt><dd style="display: inline">10. – 12. 5. 2024</dd></div><div><dt class="muted" style="display: inline">Cena: </dt><dd style="display: inline">3 800 Kč</dd></div></dl>
</div>
<div class="stack" style="gap: 10px; padding: 24px; border-radius: 20px; background: var(--bg)">
<h3 class="h3">Letní týdenní kurz na horách</h3>
<dl class="stack small" style="gap: 4px"><div><dt class="muted" style="display: inline">Termín: </dt><dd style="display: inline">30. 7. neděle – 7. 7. 2024 neděle</dd></div><div><dt class="muted" style="display: inline">Cena: </dt><dd style="display: inline">10 000 Kč</dd></div></dl>
</div>
</div>

<div class="stack" style="gap: 14px">
${HORY_HEADING}
<div style="overflow-x: auto">
<ol class="dayline" aria-label="Denní harmonogram" style="display: flex; gap: 4px; min-width: 760px; font-size: 14px; line-height: 1.35">
<li class="stack" style="flex: 2 1 0; gap: 4px; padding: 14px 12px; border-radius: 14px; background: var(--accent); color: var(--on-accent)"><span class="mono">7:30 - 8:30h</span><span>Ranní cvičení</span></li>
<li class="stack" style="flex: 3 1 0; gap: 4px; padding: 14px 12px; border-radius: 14px; background: var(--fill)"><span class="mono">8:30 - 10:00h</span><span>Snídaně</span></li>
<li class="stack" style="flex: 5 1 0; gap: 4px; padding: 14px 12px; border-radius: 14px; background: var(--accent); color: var(--on-accent)"><span class="mono">10:30 - 12:30h</span><span>Dopolední cvičení</span></li>
<li class="stack" style="flex: 8 1 0; gap: 4px; padding: 14px 12px; border-radius: 14px; background: var(--fill)"><span class="mono">12:30 - 16:30h</span><span>Pauza odpočinek</span></li>
<li class="stack" style="flex: 4 1 0; gap: 4px; padding: 14px 12px; border-radius: 14px; background: var(--accent); color: var(--on-accent)"><span class="mono">16:30 - 18:00h</span><span>Odpolední cvičení</span></li>
<li class="stack" style="flex: 2 1 0; gap: 4px; padding: 14px 12px; border-radius: 14px; background: var(--fill)"><span class="mono">18:30h</span><span>Večeře</span></li>
</ol>
</div>
</div>

<dl class="grid" style="--min: 260px; gap: 24px 40px; border-top: 1px solid var(--line); padding-top: 32px">
<div class="stack" style="gap: 6px"><dt style="font-weight: 500">Místo</dt><dd class="small muted">Strážné v Krkonoších, Strážné 2. Penzion Exnar</dd><dd><a class="lnk small" href="https://penzion-exnar.ubytovani-strazne-krkonose.cz/" rel="nofollow" target="_blank" style="word-break: break-all">penzion-exnar.ubytovani-strazne-krkonose.cz/cs/</a></dd></div>
<div class="stack" style="gap: 6px"><dt style="font-weight: 500">Ubytování</dt><dd class="small muted">Polopenze, ubytování ve 2 až 3 lůžkových pokojích, výborná strava, možnost výletů po okolí, pokoje jsou se soc. zařízením.</dd></div>
<div class="stack" style="gap: 6px"><dt style="font-weight: 500">Přihlášky</dt><dd class="small muted">E-mailem, nebo osobně, rezervace místa po zaplacení zálohy 1000 Kč.</dd></div>
</dl>
</div>
</section>`,
    ], content.today),
  });
}
