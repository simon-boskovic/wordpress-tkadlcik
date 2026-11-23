# Content Quality and On-Page SEO: radostvpohybu.cz (production, 2026-11-23)

**Scope:** all 12 URLs were fetched with `curl` from production on 2026-11-23, along with `/llms.txt`, `/robots.txt` and `/sitemap.xml`. All returned HTTP 200. The plugin's `render_page.py` could not fetch them: Python failed certificate verification (`CERTIFICATE_VERIFY_FAILED`) because Avast Web Shield intercepts TLS on this PC. That is a local tool problem, not a site fault. The HTML was parsed offline with the Python standard library. Word counts below cover the main content only. They leave out the header, nav, footer, the shared contact block and the Complianz banner text.

## Scores

| Score | Value |
|---|---|
| **Content Quality** | **64 / 100** |
| **On-Page SEO** | **80 / 100** |
| AI citation readiness | 62 / 100 |

E-E-A-T breakdown. The weights are this skill's internal model, not Google's.

| Factor | Weight | Score | Basis |
|---|---|---|---|
| Experience | 20 % | 70 | Real first-hand signals. On /o-mne/: practice since 1997, an athletics injury as the reason he started, with Vincent Chu since 2007, and a civilian job as a PE teacher. The site also has its own YouTube demonstrations. It lacks class photos, student stories and concrete outcomes. |
| Expertise | 25 % | 65 | "Mgr." title, a documented lineage (Yang Sau Chung → Chu Gin Soon → Vincent Chu) and a full curriculum list. Several factual or terminology errors weaken it (see C-03 to C-06), and no instructor certification is shown. |
| Authoritativeness | 25 % | 50 | One external link (gstaichi.org) and YouTube `sameAs`. There are no reviews or testimonials (the old /reference/ now redirects to /clanky/#co-je), no third-party mentions, and the articles have no source or translator. |
| Trustworthiness | 30 % | 70 | Strong basics: name, IČO, phone, e-mail, gym address, privacy page, consent, clear prices. Undermined by contradictory and stale event information (C-01, C-02, C-07, C-08). |
| **Weighted** | | **64** | |

## What works

- **Every title and description is unique and fits within snippet length.** Titles run 47–64 characters and descriptions 132–155. All carry the place ("Praha 4") and the topic. The metadata template check (`metadata_template.py`, 12 pairs) gives `site_risk: low`, `templated_ratio: 0.0` and no `shared_cta_phrases`. Its only secondary flags are `description-echoes-title` on /seminar-vincent-chu/, which is harmless because the description adds the dates and program, and `brand-suffix-in-description` on the noindex privacy page.
- **Clean heading structure:** exactly one H1 per page, each matching its page's intent, for example "Tchaj-ťi a čchi-kung v Praze 4" and "Kurzy tchaj-ťi a čchi-kungu: rozvrh a ceny". There are no skipped levels and the H2s are descriptive.
- **Facts are clearly stated.** Schedule, prices ("350 Kč lekce 120 minut", "3 250 Kč 10 lekcí", "platí na 3 měsíce"), the address, the payment terms and the seminar times are all in HTML text as label/value lists. AI systems can quote these easily.
- **The lineage is stated consistently** on /, /cviceni/ and /o-mne/, and the JSON-LD supports it: `Person` Daniel with `knowsAbout` and `sameAs`; `Person` Vincent Chu with `affiliation`; `SportsActivityLocation` with `geo`; `Event`s with `Offer`; `VideoObject`s on /videogalerie/; `ProfilePage` and `ContactPage`; breadcrumbs.
- **AI crawler access is good.** `/llms.txt` gives an accurate, current summary of the pages, schedule, prices and lineage, and `robots.txt` explicitly allows the AI search and assistant bots.
- **Past events are labelled "Proběhlo"**, so a visitor can tell what is still bookable.
- **Images have descriptive Czech alt text,** for example "Skupina lidí cvičí ranní tchaj-ťi v pekingském parku".
- **Readability is adequate for Czech.** LIX is 37–48 across pages (medium difficulty) and average sentences run 8–16 words on the service pages. Only /clanky/ has many long sentences (16 over 25 words), which is acceptable for a translated treatise.
- **Duplication is low for a site this size.** The repeated blocks are short shared descriptions (lineage paragraph, exercise teasers) that make up roughly 10–20 % of a page. This is not a duplicate-content risk.

## Findings

### C-01: High. The sabre flyer promoted in the home hero contradicts the site's own 28.–29. 11. seminar and has a wrong e-mail address
- **Evidence:** On https://radostvpohybu.cz/ the hero's secondary CTA is "Stáhnout leták na Šavli". On https://radostvpohybu.cz/akce/ the same flyer is shown under the H2 "Výukový seminář se šavlí stylu Yang tchaj-ťi" (`/wp-content/uploads/letak-savle.jpg`). The flyer image reads:
  - "Kde: Plující oblaka"
  - "Kdy: 28. 11. celý den 10:00 - 12:30 a 15:30 - 18:00 / 29. 11. pouze dopoledne 10:00 - 12:30"
  - "Cena: 3 900Kč"
  - Contact "tkadlcik@dentrum.cz" (sic) and "Více info na dan24.wbnoce..cz" (sic, the old Webnode site)
  - No year.

  For the same dates, the site says: "Mistr Vincent Chu učí v Praze v sobotu 28. 11. 2026 Hrátky pěti zvířat a v neděli 29. 11. 2026 Tchaj-ťi kung … Cena 2 500 Kč za den, ZŠ Jeremenkova", with times "10:00 – 12:30, odpoledne 15:00 – 17:30".
- **Impact:** A visitor gets two different programs, venues, prices and times for the same weekend. The flyer's e-mail address bounces and its URL points to the retired Webnode site. Because the details exist only in the image, search engines and AI never see the conflict, but people do. This is the most trust-damaging item on the site.
- **Recommendation:** Ask the owner whether the sabre seminar is a past event (probably from an earlier year) or a current one.
  - If past: remove the hero CTA from / and either remove the /akce/ section or give it a "Proběhlo" badge with its year.
  - If current: publish its date, year, venue and price as HTML text with an `Event`, and replace the flyer with a corrected version (e-mail `tkadlcik@centrum.cz`, URL `radostvpohybu.cz`, typo "Radostv pohybu").

### C-02: Medium. Impossible date for the summer mountain course
- **Evidence:** https://radostvpohybu.cz/cviceni-na-horach/ and https://radostvpohybu.cz/akce/ both show "Letní týdenní kurz na horách 30. 7. neděle – 7. 7. 2024 neděle". The course would end before it starts. 30. 6. 2024 was a Sunday, so "30. 6." was almost certainly intended. `build/content.mjs:126` already notes this as awaiting the client.
- **Recommendation:** Correct it to "30. 6. – 7. 7. 2024" (or what the owner confirms). Until then, drop the start date and show only "červenec 2024".

### C-03: Medium. "Princip dýchání tuina" is a terminology error the site contradicts itself
- **Evidence:** On https://radostvpohybu.cz/ (section "Nádech a výdech") and https://radostvpohybu.cz/kurzy-a-lekce/ ("13 slov tchaj-ťi"): "Fyzický pohyb kombinovaný s principem dýchání tuina (nádech a výdech)". Tuina is Chinese therapeutic massage, and /o-mne/ itself says "zdravotním energetickým masážím tuina".
- **Recommendation:** Ask the owner for the intended term. It is probably a confusion with *tu-na* (吐纳, exhale and inhale), so "s principem dýchání tu-na (výdech a nádech)". An expert reader will notice the current wording.

### C-04: Medium. "Hrátky pěti zvířat" lists four animals and leaves the sentence unfinished
- **Evidence:** https://radostvpohybu.cz/cviceni/: "Určitým způsobem napodobujeme charakter a vlastnosti jednotlivých zvířat: medvěd sílu paží, tygr, jelen rovnováhu a pružnost, opice." The fifth animal (the crane, *jeřáb*) is missing, and the tiger and monkey have no qualities attached.
- **Recommendation:** Complete it with the owner, for example "… tygr …, jelen …, opice …, jeřáb …". This exercise is also the content of the new Monday course and the 28. 11. seminar, so this description matters for conversions.

### C-05: Medium. Inconsistencies in the Osm kusů brokátu history paragraph
- **Evidence:** https://radostvpohybu.cz/osm-kusu-brokatu/:
  - "V základu se rozděluje na formu v sedě a ve stoje … sedící formu vytvořil Zong Li Quan … Statickou formu vytvořil generál Yue Fei". The text sets up seated vs. standing, so "statickou" should be "stojící". Tradition credits Yue Fei with the standing form, and the usual name is Zhongli Quan.
  - "dao znamená manipulaci s tělem a jeho částmi a yin znamená ovládání nebo vedení qi". The usual gloss is the reverse: *dao* = guiding qi, *yin* = stretching the body.
  - "san tiao (tři ohřívače)": the term is *san jiao*, in Czech transcription *san-ťiao*.
  - "Je to nejlepší z tradičních čínských kultivačních metod" is an unsupported superlative.
- **Recommendation:** Owner review of these four phrases. They sit on the site's only dedicated topic landing page.

### C-06: Low. Proper names spelled inconsistently
- **Evidence:**
  - https://radostvpohybu.cz/clanky/: H2 "10 principů mistra Yang Chen Fu" sits directly above "Deset důležitých zásad mistra Yang Cheng Fu", and the meta description and llms.txt already say "Cheng Fu".
  - https://radostvpohybu.cz/cviceni/: "Otcem Vincenta Chu byl Gin Soon Chu" and, a few paragraphs later, "Jeho otec Chu Gin Soon".
  - Across the site: "qi / čchi / cchi", "Daoyin / Dao-Yin / DaoYinový", "Taichi-kung / Tchaj-ťi kung / taichi-kung", "Korektura / Korekce dlouhé sestavy".
- **Recommendation:** Fix the H2 to "Cheng Fu", because headings are what get quoted. Use the one form "Chu Gin Soon" (the form used in the JSON-LD). The articles may stay verbatim, but the site's own copy (cards, lists, headings) should use one transcription per term, for example "čchi" and "tchaj-ťi kung".

### C-07: Medium. Stale 2025 seminar content still reads as a live call to action
- **Evidence:** https://radostvpohybu.cz/seminar-vincent-chu/:
  - The 2025 block starts with a copied e-mail: "Dobrý den, blíží se listopadové cvičení s Vincentem. V Praze bude učit DaoYinový čchi-kung…"
  - The H2 "Přihlášení na seminář 2025" says "posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800".
  - The H2s "Denní harmonogram" and "Přihlášení na seminář 2025" give no visual cue that they belong to a past event, apart from the badge on the section above.
- **Recommendation:** Collapse the 2025 seminar into a short "Proběhlo" archive entry: date, topic, one line. Remove the bank account and deposit instruction, which a hurried visitor could act on, and rewrite the greeting as normal prose.

### C-08: Medium. /cviceni-na-horach/ is thin and entirely historical
- **Evidence:** https://radostvpohybu.cz/cviceni-na-horach/ has about 180 words. Its only dates are "10. – 12. 5. 2024 Proběhlo" and the broken summer 2024 entry (C-02). Yet it still uses future tense ("Dále budeme procvičovat…") and a "Přihlásit se" button. /akce/ repeats the same intro verbatim.
- **Recommendation:** Ask the owner whether a 2027 course is planned and add a date, even an approximate one ("jaro 2027, termín upřesníme"). Otherwise add a clear line such as "Další termín zatím není vypsán; napište mi, pokud máte zájem". Adding the owner's own photos and a short account of a past week (experience signals) would make the page substantial.

### C-09: Medium. The meta description of /osm-kusu-brokatu/ promises a course that does not exist
- **Evidence:** The description reads "… video a pravidelný úterní kurz v Praze 4." (`build/seo.mjs:50`; also in /llms.txt). The current schedule has Tuesday as "Taichi-kung, procvičování dlouhá sestava" and the beginner course on Monday. No regular course is dedicated to Osm kusů brokátu, and the home page says "Často do rozcvičky zařazuji cvičení Osm kusů brokátu".
- **Recommendation:** Change it to something like "… názvy všech osmi cviků, video a pravidelné cvičení v Praze 4 (ZŠ Jeremenkova)."

### C-10: Medium. The 90-minute Monday course has no price, and the beginner path is unclear
- **Evidence:**
  - https://radostvpohybu.cz/kurzy-a-lekce/: "Výuka probíhá formou lekcí 90 minut nebo 120 minut". The only prices are "350 Kč lekce 120 minut" and "3 250 Kč 10 lekcí", but the new course is "Pondělí 19:00 - 20:30" (90 minutes).
  - Beginners get three different starting points:
    - /cviceni/: "Začínáme výukou Yang sestavy 22 pohybů"
    - the videos: "Začátečnická sestava 12 forem Yang tchaj-ťi"
    - the new course: "procvičování sestavy Yang tchaj-ťi 8 pohybů. Pro začátečníky."
- **Recommendation:** Add the price of the 90-minute lesson, or state that the same price applies. Add a short "Jak začít" paragraph on /kurzy-a-lekce/ that names the single entry point (the Monday course), what to bring and whether a trial lesson is possible.

### C-11: High (AI citation and topical coverage). No clear answer to "Co je tchaj-ťi / čchi-kung?"
- **Evidence:** The only definition on the site is https://radostvpohybu.cz/clanky/ "Co je čchi-kung a tchaj-ťi": "Tato cvičení byla vždy pouze přirozenými metodami meditace a boje. Původní názvy byly spočinutí v klidu a Pěst velkého předělu. Čchi-kung je komerční název pro spočinutí v klidu…" This is three sentences, idiosyncratic, and not a quotable definition. The old /reference/ URL redirects here. No page answers the questions beginners actually search for: is it suitable for seniors or people with back problems, what to wear, whether to book in advance, whether a trial lesson exists, what the difference between tai chi and qigong is.
- **Recommendation:** Add a short "Časté otázky" block, ideally on /kurzy-a-lekce/ or the home page. Write five to seven questions, each with a self-contained answer of 40–60 words in the owner's voice, starting with a 50-word definition of tchaj-ťi and čchi-kung. This is the single biggest gain in AI citation readiness and also helps local search intent ("tai chi pro začátečníky Praha 4").

### C-12: Medium. The articles have no source, translator or date, and all share one URL
- **Evidence:** https://radostvpohybu.cz/clanky/ (2,822 words) has "Vincent Chu: Co se skrývá za tréninkem Zhan Zhuangu" and the Yang Cheng Fu principles with no translator, original source or publication date, and no `Article` schema. The page has no contextual inbound links (it is reached only from the nav and footer), and the articles link to no course page.
- **Recommendation:**
  - Once the owner supplies it (open client input), add an attribution line per article, for example "Autor: Vincent Chu, překlad: …, zdroj: …".
  - Consider giving each article its own URL so each can rank and be cited separately, with `Article` schema, `author` and `datePublished`.
  - At the end of each article add a link such as "Zhan zhuang si můžete vyzkoušet na lekcích → /kurzy-a-lekce/".
  - Also link to /clanky/ from /cviceni/ (zhan zhuang, wu-ťi) and from /o-mne/.

### C-13: Medium. Health claims stated as fact
- **Evidence:**
  - /osm-kusu-brokatu/: "Posilujeme ledviny…", "Třesením se zbavujeme nemocí.", "posilujeme srdce"
  - /cviceni/: "Když jsou složky Yin a Yang vyvážené, tělo je zdravé."
  - /clanky/: "Proto je stav Wu Chi nejlepší metodou k udržení dobrého zdraví." and "Z pohledu fyziologie je Wu Chi nejlepší technikou pro obnovení sil."
- **Impact:** Health is a YMYL-adjacent area. Raters and AI systems discount unhedged medical claims, and they lower trust.
- **Recommendation:** Leave the verbatim articles as they are, but frame them: add a one-line note on /clanky/ and /osm-kusu-brokatu/ such as "Popisy vycházejí z tradiční čínské nauky; cvičení nenahrazuje lékařskou péči." In the site's own copy, prefer "podle tradiční čínské medicíny…".

### C-14: Medium. Weak E-E-A-T depth on /o-mne/
- **Evidence:** https://radostvpohybu.cz/o-mne/ has about 277 words. It gives a good personal origin story but no years of teaching, no statement of authorisation from Vincent Chu or the Gin Soon federation, no class photos and no testimonials. The JSON-LD `sameAs` lists only the two YouTube channels.
- **Recommendation:**
  - Add "Vyučuji od roku …".
  - Name his teachers' roles and whether he is a certified instructor of the Gin Soon Tai Chi Chuan Federation, linking to the federation's listing if one exists.
  - Add two or three short student quotes (with consent) and one or two photos from classes.
  - Once a Google Business Profile exists, add it to `sameAs`.

### C-15: Medium. Weak internal linking to the key topic pages
- **Evidence:**
  - https://radostvpohybu.cz/osm-kusu-brokatu/, the only dedicated exercise landing page, gets one contextual link (from /cviceni/) and is absent from the header nav. On / and /kurzy-a-lekce/ the "Osm kusů brokátu" cards link to /cviceni/ instead.
  - /o-mne/ gets one contextual link (from /).
  - /clanky/ gets none (see C-12).
- **Recommendation:** Point the "Osm kusů brokátu" card links on / and /kurzy-a-lekce/ to `/osm-kusu-brokatu/`. Link "Vincent Chu" or "Daniel Tkadlčík" mentions on /cviceni/ and /seminar-vincent-chu/ to /o-mne/.

### C-16: Low. Adjacent inline elements fuse dates and times in extracted text
- **Evidence:** The markup is `13. 12. 2026</span><span class="r-val">10:00 - 12:30…` with no whitespace between the spans. Plain-text extractors (search snippets, AI crawlers, reader modes) therefore produce "13. 12. 202610:00 - 12:30" (/kurzy-a-lekce/, /akce/) and "Nový kurz od 7. 12. 202619:00 - 20:30" (/). The visual layout is unaffected.
- **Recommendation:** In `parts.mjs` rows/facts, emit a space or visually hidden separator (for example `<span class="sr-only">, </span>`) between label and value.

### C-17: Low. Videogalerie is thin text around the videos
- **Evidence:** https://radostvpohybu.cz/videogalerie/ has about 117 words. Each video carries only a caption such as "Ukázka sestavy s holí". The `VideoObject` schema is present, which is good.
- **Recommendation:** Add one or two sentences per video: what the form is, who performs it, the level, and what to watch for. This gives the video schema descriptive text and gives AI something to quote.

### C-18: Low. Small heading and typography details
- **Evidence:**
  - /cviceni/: the H2 "Tchaj-ťi a čchi-kung Radost v pohybu" is a brand heading with no topic. The real sub-sections ("Sestavy se zbraněmi", "Statická cvičení", "Kompletní nabídka sestav…") are not headings.
  - /kontakt/: the closing block's H2 is just "E-mail".
  - Time ranges mix a hyphen ("18:00 - 20:00") and an en dash ("10:00 – 12:30"), sometimes on the same page.
  - In the articles: "Klasických textech tai ji quanu se říká" (missing "V"), "Rty i zuby jsou u blízko u sebe", "dalsí", "může tělo ublížit".
- **Recommendation:** Make the /cviceni/ sub-sections H3s and rename the brand H2 (for example "Co u nás cvičíme"). Normalise time ranges to an en dash with spaces (Czech typography). Fix the obvious typos even in the verbatim texts, because they are transcription slips rather than the author's wording.

### C-19: Info. Event naming, freshness signals and word-count floors
- **Event naming:** On /akce/ both Vincent Chu `Event`s share the name "Seminář s mistrem Vincentem Chu v Praze". Distinct names such as "… – Hrátky pěti zvířat (sobota 28. 11.)" read better in rich results. The page /seminar-vincent-chu/ carries no `Event` of its own; its events live on /akce/ (this is for the schema auditor). The Sunday event has no `Offer` because the price is pending (known).
- **Freshness:** Every page's `dateModified` is the build time (2026-11-23T19:18:26), so it marks a deploy rather than a content edit, and no page shows a visible "aktualizováno" date. That is acceptable for a service site, but don't rely on it as a freshness signal.
- **Word-count floors** (coverage floors, not targets; word count is not a ranking factor):

| Page | Floor | Actual (main content) | Note |
|---|---|---|---|
| / | 500 | ~675 | Above the floor. |
| /kurzy-a-lekce/ | 800 | ~376 | Below; C-10/C-11 fill the real gap. |
| /osm-kusu-brokatu/ | 800 | ~408 | Below. |
| /cviceni/ | 800 | ~874 | Above. |
| /o-mne/ | — | ~277 | Thin (C-14). |
| /cviceni-na-horach/ | — | ~181 | Thin (C-08). |
| /videogalerie/ | — | ~117 | Thin (C-17). |
| /kontakt/ | — | ~141 | Fine for a contact page. |

## Structured findings (for audit-data.json, category "Content Quality")

```json
[
 {"id":"C-01","severity":"High","url":"https://radostvpohybu.cz/","title":"Sabre flyer in home hero contradicts the 28.-29. 11. seminar (venue/price/times) and has a wrong e-mail and the old Webnode URL"},
 {"id":"C-02","severity":"Medium","url":"https://radostvpohybu.cz/cviceni-na-horach/","title":"Impossible date '30. 7. neděle – 7. 7. 2024 neděle'"},
 {"id":"C-03","severity":"Medium","url":"https://radostvpohybu.cz/kurzy-a-lekce/","title":"'princip dýchání tuina' – tuina is massage (contradicted on /o-mne/)"},
 {"id":"C-04","severity":"Medium","url":"https://radostvpohybu.cz/cviceni/","title":"Hrátky pěti zvířat lists four animals, sentence unfinished"},
 {"id":"C-05","severity":"Medium","url":"https://radostvpohybu.cz/osm-kusu-brokatu/","title":"History/terminology inconsistencies (statická vs. stojící, dao/yin gloss, san tiao)"},
 {"id":"C-06","severity":"Low","url":"https://radostvpohybu.cz/clanky/","title":"Name inconsistencies: H2 'Yang Chen Fu'; 'Gin Soon Chu' vs 'Chu Gin Soon'; mixed transliteration"},
 {"id":"C-07","severity":"Medium","url":"https://radostvpohybu.cz/seminar-vincent-chu/","title":"Stale 2025 block with copied e-mail and deposit/bank instruction"},
 {"id":"C-08","severity":"Medium","url":"https://radostvpohybu.cz/cviceni-na-horach/","title":"Thin, only 2024 dates, future tense and sign-up CTA"},
 {"id":"C-09","severity":"Medium","url":"https://radostvpohybu.cz/osm-kusu-brokatu/","title":"Meta description promises a 'pravidelný úterní kurz' not on the schedule"},
 {"id":"C-10","severity":"Medium","url":"https://radostvpohybu.cz/kurzy-a-lekce/","title":"No price for 90-min Monday course; three different beginner forms (22/12/8)"},
 {"id":"C-11","severity":"High","url":"https://radostvpohybu.cz/clanky/","title":"No quotable definition / FAQ for 'Co je tchaj-ťi / čchi-kung', beginner questions"},
 {"id":"C-12","severity":"Medium","url":"https://radostvpohybu.cz/clanky/","title":"Articles without source/translator/date, single URL, no contextual links"},
 {"id":"C-13","severity":"Medium","url":"https://radostvpohybu.cz/osm-kusu-brokatu/","title":"Unhedged health claims (YMYL-adjacent)"},
 {"id":"C-14","severity":"Medium","url":"https://radostvpohybu.cz/o-mne/","title":"Thin author page: no teaching-since, certification, testimonials, class photos"},
 {"id":"C-15","severity":"Medium","url":"https://radostvpohybu.cz/osm-kusu-brokatu/","title":"Weak internal linking to /osm-kusu-brokatu/, /o-mne/, /clanky/"},
 {"id":"C-16","severity":"Low","url":"https://radostvpohybu.cz/kurzy-a-lekce/","title":"Adjacent spans fuse date+time in extracted text ('202610:00')"},
 {"id":"C-17","severity":"Low","url":"https://radostvpohybu.cz/videogalerie/","title":"Thin text around videos"},
 {"id":"C-18","severity":"Low","url":"https://radostvpohybu.cz/cviceni/","title":"Brand H2, sub-sections not headings, hyphen/en dash mix, typos in articles"},
 {"id":"C-19","severity":"Info","url":"https://radostvpohybu.cz/akce/","title":"Duplicate Event names, build-time dateModified, word-count floors"}
]
```
