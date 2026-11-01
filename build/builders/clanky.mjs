/**
 * Články (redesign 2026-11-01): the two articles the old site had only as .docx downloads are now readable on the
 * page (text verbatim from the files, build/articles.mjs); the downloads stay. "Co je čchi-kung a tchaj-ťi" is
 * the old /reference/ page's text (/reference/ 301s to #co-je).
 */
import { stage, contactStatement, DOWNLOAD } from '../fragments.mjs';
import { hero, sec } from './parts.mjs';
import { PRINCIPLES, WUCHI } from '../articles.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "1. Hlavu drž zpříma, …" -> the principle's first sentence as its name, the rest as text. */
function principle(par) {
  const m = /^(\d+)\.\s*([^.]+\.)\s*(.*)$/.exec(par);
  if (!m) throw new Error(`clanky: unexpected principle "${par.slice(0, 40)}"`);
  return `<li><p><strong>${esc(m[2])}</strong> ${esc(m[3])}</p></li>`;
}

/** Wu Chi: numbered parts ("1. Postoj Wu Chi") become h3s; the title/author/subtitle lines are set apart. */
function wuchi(pars) {
  const [, author, subtitle, ...body] = pars;
  const html = body.map((t) => (/^\d+\.\s+\S/.test(t) && t.length < 40 ? `<h3>${esc(t.replace(/^\d+\.\s+/, ''))}</h3>` : `<p>${esc(t)}</p>`)).join('\n');
  return { author: esc(author), subtitle: esc(subtitle), html };
}

export function build({ content, page }) {
  const w = wuchi(WUCHI);
  return page({
    slug: 'clanky',
    title: 'Články',
    scripts: [],
    frontPage: false,
    sections: [
      stage(['vejir', 'svitek', 'weiqi', 'hory']),

      hero({
        h1: 'Články o tchaj-ťi a čchi-kungu',
        actions: `<nav class="actions" aria-label="Články">
<a class="more" href="#co-je">Co je čchi-kung a tchaj-ťi</a>
<a class="more" href="#deset-zasad">10 principů mistra Yang Chen Fu</a>
<a class="more" href="#wu-ti">Pojednání o Wu-ťi (WuChi)</a>
</nav>`,
        stageKey: 'vejir',
      }),

      `<section class="sec" id="co-je" data-stage="vejir" aria-labelledby="co-je-h">
<div class="field reveal">
<h2 class="h2" id="co-je-h">Co je čchi-kung a tchaj-ťi</h2>
<p class="body" style="margin-top: 24px">Tato cvičení byla vždy pouze přirozenými metodami meditace a boje. Původní názvy byly spočinutí v klidu a Pěst velkého předělu. Čchi-kung je komerční název pro spočinutí v klidu a stejně tak tchaj-ťi, které dnes tvoří jednu ze součástí zdravého životního stylu.</p>
</div>
</section>`,

      sec({
        id: 'deset-zasad', stageKey: 'weiqi',
        h2: '10 principů mistra Yang Chen Fu',
        intro: 'Deset důležitých zásad mistra Yang Cheng Fu.',
        body: `<article class="article reveal">
<ol>
${PRINCIPLES.slice(1).map(principle).join('\n')}
</ol>
<p><a class="btn btn-quiet" href="/wp-content/uploads/10-principu-mistra-yang-chen-fu.docx" download>Stáhnout ${DOWNLOAD}</a></p>
</article>`,
      }),

      sec({
        id: 'wu-ti', stageKey: 'hory',
        h2: 'Pojednání o Wu-ťi (WuChi)',
        intro: `${w.author}: ${w.subtitle}`,
        body: `<article class="article reveal">
${w.html}
<p><a class="btn btn-quiet" href="/wp-content/uploads/pojednani-o-wu-ti.docx" download>Stáhnout ${DOWNLOAD}</a></p>
</article>`,
      }),

      contactStatement(content),
    ],
  });
}
