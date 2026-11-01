/**
 * O mně (redesign 2026-11-01): the "founder's letter" in the teacher's own first-person words (old site text).
 */
import { stage, contactStatement, more, videoBox, video } from '../fragments.mjs';
import { hero, sec } from './parts.mjs';

export function build({ content, page }) {
  return page({
    slug: 'o-mne',
    title: 'O mně',
    scripts: ['video'],
    frontPage: false,
    sections: [
      stage(['portret', 'wangmeng', 'peking']),

      hero({
        h1: 'Daniel Tkadlčík: tchaj-ťi od roku 1997',
        lead: 'Jmenuji se Daniel Tkadlčík, cvičení tchaj-ťi se věnuji od roku 1997.',
        stageKey: 'portret',
      }),

      sec({
        id: 'cesta', stageKey: 'portret',
        h2: 'Cesta k tchaj-ťi a mistr Vincent Chu',
        body: `<div class="letter reveal">
<p>Prvotním důvodem, proč jsem se začal zajímat o cvičení tchaj-ťi, byly mé vleklé zdravotní problémy způsobené vrcholovým tréninkem atletiky. Tchaj-ťi mě natolik ovlivnilo, že jsem pozměnil svůj pohled na mnoho věcí, které se týkají nejen těla, ale i myšlení.</p>
<p>V průběhu času jsem se věnoval různým stylům tchaj-ťi u různých učitelů a mistrů (wudangskému tchaj-ťi, Yang tchaj-ťi, čchi-kungovým masážím a různým stylům meditace).</p>
<p>Od roku 2007 se intenzivně věnuji zejména <a class="lnk" href="/cviceni/#yang">rodinnému stylu Yang</a> tchaj-ťi u <a class="lnk" href="/seminar-vincent-chu/">mistra Vincenta Chu</a>, který vyučuje komplexní systém rodiny Yang. Mimo jiné mě naučil rodinné předání <a class="lnk" href="/cviceni/#brokat">Osmi kusů brokátu</a> a <a class="lnk" href="/cviceni/#slov">13 slov tchaj-ťi</a>.</p>
<p>Několik let jsem se také věnoval zdravotním energetickým masážím tuina. Civilním povoláním jsem učitel tělesné výchovy na II. stupni základní školy.</p>
<div class="sign"><span class="sign-name">Daniel Tkadlčík</span><span class="sign-role">Mgr. Daniel Tkadlčík, lektor tchaj-ťi a čchi-kungu</span></div>
</div>
<figure class="media reveal" style="margin-top: 48px">${videoBox(video('1nFm6-XwGpU'))}<figcaption>${video('1nFm6-XwGpU').title}</figcaption></figure>`,
      }),

      `<section class="sec" id="filozofie" data-stage="wangmeng" aria-labelledby="filozofie-h">
<div class="field reveal">
<h2 class="h2" id="filozofie-h">Moje filozofie</h2>
<blockquote class="lead" style="margin: 24px 0; font-weight: 500"><p>„Každá forma cvičení je prázdná, pokud není spojena s radostí, tichostí a klidem mysli, které jsou podstatou našeho bytí a které se snažím ve cvičení rozvíjet.“</p></blockquote>
<p class="body">Mým hlavním tématem je propojení meditací, cvičení tchaj-ťi a čchi-kungu.</p>
</div>
</section>`,

      sec({
        id: 'linie', stageKey: 'peking',
        h2: 'Linie předání stylu Yang',
        intro: 'Výuka probíhá dle instrukcí a předání od mistra Vincenta Chu, který je hlavním instruktorem a mistrem bostonské školy <a class="lnk" href="https://www.gstaichi.org/" rel="nofollow" target="_blank">Gin Soon Tai Chi Chuan Federation</a>. Jeho otec Chu Gin Soon byl osobním žákem mistra Yang Sau Chunga.',
        body: `<ol class="chain reveal" aria-label="Linie předání"><li>Yang Sau Chung</li><li>Chu Gin Soon</li><li>Vincent Chu</li><li>Daniel Tkadlčík</li></ol>
<div class="actions reveal" style="margin-top: 32px">${more('/cviceni/', 'Cvičení')}${more('/kurzy-a-lekce/', 'Nabídka kurzů a lekcí')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
