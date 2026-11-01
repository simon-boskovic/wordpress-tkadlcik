/**
 * Videogalerie (restored route of the old site, redesign 2026-11-01): the five videos with their captions from
 * dan24.webnode.cz/videogalerie/ (typos fixed). Click-to-load facades (video.js).
 */
import { stage, videoBox, contactStatement, more, VIDEOS } from '../fragments.mjs';
import { hero, sec } from './parts.mjs';

export function build({ content, page }) {
  const [first, ...rest] = VIDEOS;
  return page({
    slug: 'videogalerie',
    title: 'Videogalerie',
    scripts: ['video'],
    frontPage: false,
    sections: [
      stage(['snih', 'wangmeng', 'peking']),

      hero({
        h1: 'Videogalerie tchaj-ťi a čchi-kungu',
        lead: first.title,
        extra: `<figure class="media rise d2">${videoBox(first)}</figure>`,
        stageKey: 'snih',
      }),

      sec({
        id: 'sestavy', stageKey: 'wangmeng',
        h2: 'Sestavy stylu Yang',
        body: `<div class="stack-l">
${rest.slice(0, 2).map((v) => `<figure class="media reveal">${videoBox(v)}<figcaption>${v.title}</figcaption></figure>`).join('\n')}
</div>`,
      }),

      sec({
        id: 'cchi-kung', stageKey: 'peking',
        h2: 'Osm kusů brokátu a 13 slov tchaj-ťi',
        body: `<div class="pair">
${rest.slice(2).map((v) => `<figure class="media reveal">${videoBox(v)}<figcaption>${v.title}</figcaption></figure>`).join('\n')}
</div>
<div class="actions reveal" style="margin-top: 28px">${more('/cviceni/', 'Cvičení')}${more('/kurzy-a-lekce/', 'Nabídka kurzů a lekcí')}</div>`,
      }),

      contactStatement(content),
    ],
  });
}
