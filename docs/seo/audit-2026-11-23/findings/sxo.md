# SXO (Search Experience) audit: radostvpohybu.cz

Date: 2026-11-23 (the day of the production deploy). Scope: all 11 indexable pages, with the focus on `/`, `/kurzy-a-lekce/`, `/seminar-vincent-chu/`, `/osm-kusu-brokatu/`, `/cviceni/` and `/akce/`.

## SXO Gap Score: 60 / 100

This score is separate from the SEO Health Score.

| Dimension | Score | Evidence |
|---|---|---|
| Page Type | 12/15 | The course, local and seminar pages match the SERP type. The beginner query has no dedicated page (see Mismatch). |
| Content Depth | 8/15 | `/kurzy-a-lekce/` has 585 words. The beginner course has about 25 words of jargon. There is no price for the 90-minute lesson and no trial or FAQ. `/osm-kusu-brokatu/` has 611 words but no how-to steps. |
| UX Signals | 10/15 | Good: "Přihlásit se" buttons with a prefilled topic, jump links, tel:/mailto: links, the "Napište mi" header CTA. Bad: the home hero's secondary CTA is an old, contradictory flyer. Past events and a 2025 block clutter the pages. On a phone, the first screen shows no date. |
| Schema | 9/15 | There is a rich graph (Organization, SportsActivityLocation with geo, Person, Event + Offer on `/akce/`). There is no Event on `/seminar-vincent-chu/` itself, and no Course or Event for the new course or the Sunday on 13. 12. |
| Media | 8/15 | The site's own YouTube videos sit behind privacy facades. Otherwise the images are stock or historical: a Beijing park photo on 8 pages and ink paintings. There is no photo of a real class, the gym interior or Vincent Chu. |
| Authority | 8/15 | Lineage, practice since 1997, "Mgr.", IČO and a link to Gin Soon. There are no testimonials, no reviews and no link to a Google Business Profile. Even a brand query returned nothing (see Info). |
| Freshness | 5/10 | The 2026 dates are current. But 2024 mountain events, a 2025 registration block with an expired deposit deadline and an undated old flyer are live. The old Webnode copy is also live. |

## What works

- **Page type fits the course queries.** `/kurzy-a-lekce/` is a proper local service page. It has the schedule (Po/Út/Čt), prices (350 Kč, 3 250 Kč for 10), the address, a click-to-load map and one "Přihlásit se" button per offer. Each button prefills the form topic (`/kontakt/?tema=n#formular`). This is the same page type as the competitors in the SERP (taiji.cz, wudang.cz, taichiresort.cz, qigong-praha.cz/rozvrh, taijipodlupou.cz).
- **Titles and H1s say what the queries say.** Examples: "Kurzy tchaj-ťi (tai chi) a čchi-kungu Praha 4", "Seminář s mistrem Vincentem Chu v Praze", "Osm kusů brokátu – čchi-kung (qigong) cvičení". The tai chi / qigong spelling variants appear in titles and descriptions.
- **The seminar page answers above the fold.** It shows the H1, then "28. 11. – 29. 11. 2026", the programme of both days, "Přihlásit se" and "Program a cena". The price is 2 500 Kč per day.
- **The teaching lineage is strong.** It is visible on home, `/o-mne/` and `/cviceni/`: Yang Sau Chung → Chu Gin Soon → Vincent Chu → Daniel Tkadlčík. Daniel has practised since 1997 and is a PE teacher. The footer shows the operator line with IČO. For the practitioner persona this is the most important trust signal.
- **Low-friction contact.** tel:/mailto: links are on every page and the form is short (name, e-mail, optional phone, topic). It promises a reply and says it stores nothing.
- **Past dates are marked.** Ended dates carry "Proběhlo" instead of silently looking current.
- **Real videos.** The site uses Daniel's own and Vincent Chu's demonstration videos, with a "Přehrát na YouTube" fallback.

## Page-type mismatch (primary finding)

The SERP was read through WebSearch (US-based, not google.cz; see Limitations). Each result was classified with the SXO taxonomy.

| Query | SERP consensus (top results) | Target page and its type | Severity |
|---|---|---|---|
| tai chi Praha 4 / tchaj-ťi Praha / tai chi Praha kurzy | **Service/Local course pages, about 75%.** taiji.cz course pages, wudang.cz, taichi-praha.cz/kurzy, qigong-praha.cz/rozvrh, taichiresort.cz/kurzy, taijipodlupou.cz (Praha 4 Dobeška), taojin.cz. The rest are directories (expats.cz, firmy.cz) and university PE courses (AMU, VŠE, MUNI). The snippets lead with **price per term, weekday and time, and trial lessons**. | `/kurzy-a-lekce/` and `/`: Service + Local | **ALIGNED** |
| kurz tai chi pro začátečníky Praha | **Dedicated beginner course pages, about 60%.** wudang.cz/kurzy-taichi/zacatecnici/ (first lesson free, 2 100 Kč / 3 months, min. 8 people), taijipodlupou.cz/jak-zacit-tai-chi/ (15 × 90 min for 5 100 Kč, groups of 8–10), ts108.cz/kurz-c/ ("Základní kurz … pro začátečníky"), taiji.cz/taiji/ ("Jak začít"), taoisttaichi.org (introductory sessions). | `/kurzy-a-lekce/#novy-kurz`: one section of 2 lines | **MEDIUM**: a section answers a query that the SERP answers with whole beginner pages |
| čchi-kung kurz Praha | **Qigong-specific course pages, about 70%.** cestacisarovny.cz/cchi-kung, wushuspirit.cz/cchi-kung, taiji.cz/…/cchi-kung, taichi-praha.cz/taoisticky-qigong, shiatsu-masaz.cz/kurz-cchi-kung, cchi-kung.eu. | `/kurzy-a-lekce/` (title covers čchi-kung). The new Monday course is in fact qigong (Hrátky pěti zvířat, Guo Yang Tzu), but it is never called that. | **MEDIUM** |
| osm kusů brokátu | **Informational/Hybrid.** Articles: vykuklise.cz, taichichikung.cz, ts108.cz blog, tchajti.wordpress.com video post. Course and seminar pages: druna.cz ×2, ckp-dobrichovice.cz. A book: knihcentrum.cz, "Osm kusů brokátu (Pa-tuan-ťin)". | `/osm-kusu-brokatu/`: Hybrid (info + course CTA) | **ALIGNED** type; content gaps in F8 |
| Vincent Chu seminář (Praha) | **Event listing, low competition.** The only matching result is taijizlin.cz/…/seminare, a Zlín club's event table with the 2026 Prague sessions. The English query returns lineage pages (gstaichi.org). | `/seminar-vincent-chu/`: Event/Service | **ALIGNED**; the content conflicts are in F1, F2 and F11 |

## User stories (each tied to a SERP signal)

1. **Complete beginner (awareness → decision).** As a complete beginner in Praha 4, I want to know whether I can join the Monday course from 7. 12. with no experience, what it costs and what to expect, because I am unsure about joining a group. I am blocked by an **information gap**: the course description is jargon ("Hrátky pěti zvířat, stání v pozicích Guo Yang Tzu, sestava Yang 8 pohybů"), there is no price for a 90-minute lesson and nothing about a trial lesson. *Signals: beginner result titles (wudang.cz "Kurzy Tai Chi pro začátečníky", taijipodlupou.cz "Jak začít", ts108.cz "Základní kurz … pro začátečníky"). The snippets show "first lesson free" (wudang.cz), trial sessions (taichiresort.cz) and group size 8–10 (taijipodlupou.cz).*
2. **Praha 4 comparison shopper (consideration).** As someone comparing tai chi schools near Braník, I want to see the price per term, the group size and how close the gym is, because several schools sit within a few km (Dobeška in Praha 4 is 2 km away). I am blocked by **comparison fatigue and price uncertainty**: the 120-minute price does not tell me the Monday 90-minute price, and there is nothing to compare such as "groups of N" or "first lesson free". *Signal: every top course result in the extended SERP put the price and term in the snippet (3 550 Kč / 3 months, 2 100 Kč / 3 months, 5 100 Kč / 15 lessons, 3 800 Kč / 10 lessons).*
3. **Experienced Yang practitioner (decision).** As a student of the Yang family style, I want the exact programme, venue, price and booking route of Vincent Chu's Prague sessions, because he comes only once a year (end of November). I am blocked by **contradictions**: the home hero flyer advertises a saber seminar on the same dates (28.–29. 11.) at 3 900 Kč at "Plující oblaka". The seminar page still tells people to send a 1 500 Kč deposit by 15. 11. 2025. The correction sessions listed elsewhere are missing. *Signal: the only Czech SERP result for the query is the taijizlin.cz event table. It lists 6 Prague blocks between 21. 11. and 1. 12. 2026, three of them "only for those who know the form".*
4. **Exercise researcher (awareness).** As someone who heard of Osm kusů brokátu (Ba Duan Jin), I want to understand and try the eight movements, because I want a gentle home exercise. I am blocked by **technical confusion**: the page gives names and claimed effects but not how to do each movement. It does not use the names I may know (Ba Duan Jin, Pa-tuan-ťin). *Signals: the SERP is dominated by articles and videos (vykuklise.cz, taichichikung.cz with practice advice, tchajti.wordpress.com video). The top book result is titled "Osm kusů brokátu (Pa-tuan-ťin)".*
5. **Qigong seeker (consideration).** As someone looking for a qigong course, not tai chi, I want a course labelled čchi-kung with a day and time. I am blocked because the Monday course is described by its content, not as a "kurz čchi-kungu pro začátečníky". *Signal: qigong-specific course pages make up the "čchi-kung kurz Praha" SERP.*

## Persona scores

The three personas requested by the caller are scored, plus one derived from the price-led course SERP.

| Persona | Landing page | Relevance | Clarity | Trust | Action | Total | Rating |
|---|---|---|---|---|---|---|---|
| Exercise researcher | `/osm-kusu-brokatu/`, `/cviceni/`, `/clanky/` | 18 | 14 | 12 | 14 | **58** | Needs Work |
| Beginner looking for a course | `/`, `/kurzy-a-lekce/` | 17 | 14 | 12 | 18 | **61** | Good (low) |
| Praha 4 comparison shopper | `/kurzy-a-lekce/` | 19 | 17 | 11 | 15 | **62** | Good (low) |
| Experienced practitioner: Vincent Chu seminar | `/seminar-vincent-chu/`, `/akce/`, `/` | 22 | 15 | 18 | 17 | **72** | Good |

**Evidence per persona:**

- **Researcher (58, weakest).**
  - Relevance: all 8 brocade names, the Daoyin background, the 13 words, about 3 000 words of articles and videos are present.
  - Clarity: there are no step-by-step instructions or position images. "Ba Duan Jin" and "Pa-tuan-ťin" appear nowhere on the site. `/osm-kusu-brokatu/` is linked only from the footer and from `/cviceni/`.
  - Trust: unsupported health claims ("Třesením se zbavujeme nemocí", "Je to nejlepší z tradičních čínských kultivačních metod", "Zaháníme patero vyčerpání a sedmero zranění"). The articles have no author or date (article source/translator is still an open client input).
  - Action: "Rozvrh a ceny" leads to a course that does not exist as its own slot (F7).
  - **Fix first:** a "Jak cvičit" block with 8 numbered steps (starting posture, movement, breath, repetitions; one sentence each). Add synonyms to the intro: "Osm kusů brokátu (Ba Duan Jin, Pa-tuan-ťin)". Change the claims to "tradičně se uvádí…". End with "Chcete se sestavu naučit pod vedením? Pondělní kurz pro začátečníky od 7. 12. →".
- **Beginner (61).**
  - Relevance: the course exists and says "Pro začátečníky", but its content is unexplained jargon.
  - Clarity: on a phone, the first screen (390 × 844) is 50svh of ink painting, the H1 and a philosophical sentence; no date or beginner message appears before the scroll. The price block says "Lekce 120 minut 350 Kč", but the Monday course is 90 minutes. The site names three different "beginner forms" (F6).
  - Trust: lineage is good, but there are no testimonials. The class photo is a Beijing park, and there is no photo of Daniel's group.
  - Action: "Přihlásit se" prefills topic 5, "Nový kurz pro začátečníky" (good). There is no trial or "come and watch" option and no deadline or capacity.
  - **Fix:** F3 and F4.
- **Comparison shopper (62).** The local page has the address, map and building photo, and the price is visible. Missing: the 90-minute price, group size, a trial, reviews and a Google Business Profile link. **Fix:** F3 (price and trial) and F9 (reviews).
- **Practitioner (72).**
  - Relevance and clarity of the 2026 block are strong.
  - Clarity drops because of the 2025 "Přihlášení na seminář 2025" deposit block (F2) and the conflicting saber flyer (F1).
  - Trust: lineage and past seminars show continuity, but there is no photo of Vincent Chu yet (Daniel shoots it 21.–22. 11.).
  - Action: the generic topic "Semináře a akce" means the visitor cannot say which day (F14).
  - **Fix:** F1, F2, F11.

**Systemic issues:**
- **Trust is the lowest dimension for 3 of 4 personas.** There is no third-party proof (testimonials, reviews), and stock photos stand in for real classes.
- **Freshness noise across pages.** Old events and old blocks sit next to current ones.

**Priority:** the beginner persona carries the highest commercial weight and a hard date (the course starts on 7. 12.). The practitioner persona has a hard date in 5 days (28.–29. 11.). Fix those two first (F1–F4), although the researcher persona scores lowest.

## Findings

### F1. High: the home hero's secondary CTA is an old flyer that contradicts the current seminar
- **Evidence:**
  - Home hero buttons: "Nabídka kurzů a lekcí" and **"Stáhnout leták na Šavli"** → `/wp-content/uploads/letak-savle.jpg`. The same flyer is the only content of the `/akce/` section "Výukový seminář se šavlí stylu Yang tchaj-ťi".
  - The flyer has no year. It says: "Kde: Plující oblaka · Kdy: 28. 11. celý den 10:00–12:30 a 15:30–18:00, 29. 11. pouze dopoledne · Cena 3 900 Kč · tkadlcik@**dentrum**.cz · Více info na **dan24.wbnoce..cz**".
  - The site itself says that on 28.–29. 11. 2026 Vincent Chu teaches Hrátky pěti zvířat and Tchaj-ťi kung at ZŠ Jeremenkova for 2 500 Kč per day.
  - So 5 days before the event, a visitor sees two seminars on the same dates with different venue, price and topic. The flyer's e-mail address is also wrong.
- **Fix:**
  - Remove the flyer button from the home hero now.
  - Until 29. 11., use "Seminář s Vincentem Chu 28.–29. 11. →" (`/seminar-vincent-chu/`) as the secondary hero CTA. After that, use "Nový kurz od 7. 12. →" (`/kurzy-a-lekce/#novy-kurz`).
  - On `/akce/`, either delete the saber section or label it "Archiv – seminář se šavlí (rok …)" without the download. Ask Daniel which year it was.

### F2. High: `/seminar-vincent-chu/` still gives 2025 registration and payment instructions
- **Evidence:**
  - The 2025 instructions are under H2 "Přihlášení na seminář 2025": "posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800".
  - They follow the H2 "Korektura dlouhé formy středního řádu" (27.–29. 11. 2025) and the full 2025 daily schedule, which mixes Dobeška and Jeremenkova.
  - The 2026 block says "platba na místě v hotovosti". This is half of the page's H2 outline and contradicts the current payment route. Someone may send a deposit to the account.
- **Fix:** delete the 2025 block. Or collapse it into a short "Archiv: listopad 2025" at the bottom with no account number or deadline. Keep the 2026 programme and registration as the only actionable content.

### F3. High: the beginner course lacks the information needed to decide
- **Evidence:**
  - `#novy-kurz` holds one sentence: "Výuka Hrátky pěti zvířat, stání v pozicích Guo Yang Tzu, procvičování sestavy Yang tchaj-ťi 8 pohybů. Pro začátečníky." plus the weekday, time and place.
  - The prices cover only "lekce 120 minut 350 Kč" and "10 lekcí 3 250 Kč", while the Monday course is 90 minutes.
  - The site never says how many weeks the course runs, whether one can try a first lesson or join later, what to wear or bring, the age or fitness needed, or the group size. Competitors in the SERP state these (first lesson free, groups of 8–10, a fixed number of lessons).
- **Fix:** add a "Pro začátečníky" block to `#novy-kurz` (or a dedicated page, see F4):
  - Plain-language intro: "Pomalé zdravotní cvičení pro úplné začátečníky; žádná průprava není potřeba." Explain the three items in one line each.
  - The price for 90 minutes (client input).
  - Term length.
  - "První lekci si můžete vyzkoušet", if Daniel allows a trial.
  - "S sebou: pohodlné oblečení, čistá obuv do tělocvičny / ponožky".
  - The CTA "Přihlásit se na kurz od 7. 12." Add 4–5 FAQ questions; these also feed AI answers.

### F4. Medium: page-type mismatch for "kurz tai chi pro začátečníky Praha" and "čchi-kung kurz Praha"
- **Evidence:** see the mismatch table. The SERP answers with dedicated beginner and qigong course pages. The site answers with one section on `/kurzy-a-lekce/`, and the course is never called "čchi-kung" or "kurz pro začátečníky" in a heading.
- **Fix:** either rename the H2 to "Nový kurz pro začátečníky od 7. 12. 2026: čchi-kung a základy tchaj-ťi" (minimum), or create `/kurz-pro-zacatecniky/`. A new page would need the Hero (date, time, place, price, CTA), "Co se naučíte", "Jak lekce probíhá", "Pro koho", "Lektor" (lineage and photo), FAQ, the map and the CTA again. It would also need an expectations, builder and sitemap update and a link from home and the header.

### F5. High: the old Webnode site is live, indexable and shows a stale journey
- **Evidence:**
  - `https://dan24.webnode.cz/` answers 200 with `robots index,follow`, a self-canonical and the title "Dan".
  - The hero sentence ("Najít klid v pohybu a v klidu zase pohyb…") is identical to the new site, so it is duplicate content.
  - Its menu still has "Cvičení ve Zlíně", the Zlín offer that was dropped. It has no 2026 dates and no link to radostvpohybu.cz.
  - Searchers who land there see outdated offers, and it competes with the new domain. `docs/deploy.md:90` already plans "odkaz na nový web, pak vypnout".
- **Fix:** now, put a banner and link on every Webnode page: "Web se přestěhoval: radostvpohybu.cz". Use 301 redirects if the Webnode plan allows them, otherwise set noindex. Unpublish it after Search Console shows the new pages indexed.

### F6. Medium: three different "beginner forms" confuse the beginner path
- **Evidence:**
  - `/cviceni/` says "Začínáme výukou Yang sestavy 22 pohybů".
  - The videos and `/cviceni/` list call "12 forem" the "začátečnická sestava".
  - The new course teaches "Yang tchaj-ťi 8 pohybů".
- **Fix:** one sentence agreed with Daniel, e.g. "Začátečníci začínají v pondělním kurzu sestavou 8 pohybů; navazuje sestava 12 / 22 forem…". Use it on `/cviceni/`, `/kurzy-a-lekce/` and the video captions.

### F7. Medium: `/osm-kusu-brokatu/` promises a course slot that does not exist
- **Evidence:**
  - The meta description says "…video a pravidelný úterní kurz v Praze 4".
  - The H2 "Kurz Osm kusů brokátu v Praze 4" has "Přihlásit se" (topic 1).
  - The schedule has no brocade slot: Tuesday is "Taichi-kung, procvičování dlouhá sestava". The home page says brocade is part of the warm-up ("Často do rozcvičky zařazuji…"). The same applies to "13 slov" (`#kurz-slov`).
- **Fix:** reword it to "Osm kusů brokátu cvičíme v rozcvičce pravidelných lekcí (po/út/čt) a na celodenních nedělích". Point the CTA to the beginner course. Correct the meta description in `build/seo.json`.

### F8. Medium: `/osm-kusu-brokatu/` is thinner than the informational SERP and makes unsupported health claims
- **Evidence:**
  - No step-by-step how-to and no image per movement.
  - No synonyms: "Ba Duan Jin" and "Pa-tuan-ťin" occur 0 times site-wide, while the top book result uses "Pa-tuan-ťin".
  - No "how often, when, for whom, cautions" section. The SERP pages give practice advice (taichichikung.cz: practise freely without tension, morning or evening).
  - Claims such as "Třesením se zbavujeme nemocí" and "nejlepší z tradičních čínských kultivačních metod" weaken trust.
- **Fix:** add a "Jak cvičit" list (8 numbered steps) and the synonyms in the intro and alt texts. Add a short "Jak často a pro koho" section and soften the claims ("tradičně se uvádí"). Consider an Article/HowTo structure with author Daniel and a date (`/seo content` for E-E-A-T).

### F9. Medium: no social proof, and stock imagery instead of real classes
- **Evidence:**
  - No testimonials, reviews or Google Business Profile link anywhere; `/reference/` redirects to `/clanky/#co-je`.
  - The class image is a Beijing park photo, reused on 8 pages. The site has 5 different ink paintings.
  - There is no photo of Daniel teaching, of the gym interior or of Vincent Chu.
- **Fix:**
  - Add 3–5 short student quotes (first name, how long they have practised, with consent) on home and `/kurzy-a-lekce/`.
  - Add one photo of the Monday or Tuesday group.
  - Add a Vincent Chu photo from 21.–22. 11. (already planned).
  - Link the Google Business Profile once it exists (`/seo local`).

### F10. Medium: stale event pages with active sign-up CTAs
- **Evidence:**
  - `/cviceni-na-horach/` lists only 2024 events (10.–12. 5. 2024, "30. 7. neděle – 7. 7. 2024"; the latter is an impossible range). Both are "Proběhlo", yet the page still offers "Přihlásit se". `/akce/` repeats them.
  - Home lists a 2025 seminar as "Proběhlo" in "Semináře a akce".
- **Fix:** replace the event list with "Další pobyt na horách připravujeme – napište si o termín", with the CTA topic "Semináře a akce". Fix the date range or drop it. Remove 2025 items from the home teaser list.

### F11. Medium: Vincent Chu's other Prague sessions in 2026 are not mentioned
- **Evidence:** taijizlin.cz lists Prague blocks on 23.–24. 11. (Návrat k tchaj-ťi, corrections), 26.–27. 11. (middle-level form, corrections) and 30. 11.–1. 12. (43 forms), all "only for those who know the form". The site lists only 21.–22. and 28.–29. 11. These correction sessions are exactly what the experienced persona searches for. They may be run by other organisers.
- **Fix (client question):** ask Daniel. If he takes part or can refer people, add "Další lekce mistra Chu v Praze (jen pro cvičence, kteří sestavu znají)" with dates and a contact route.

### F12. Medium: the phone's first screen sells nothing time-relevant
- **Evidence:** home at 390 px (`screenshots/home-mobile.png`): the header, then about 420 px of ink painting, the H1 and a philosophical sentence, then "Nabídka kurzů a lekcí". No "pro začátečníky", course date or seminar date appears before the first scroll. `/kurzy-a-lekce/` at 390 px shows the photo, H1 and jump links, but no schedule.
- **Fix:** keep the design and add a dated line under the H1, e.g. "Nový kurz pro začátečníky od 7. 12. · pondělí 19:00 · ZŠ Jeremenkova". Show the seminar line until 29. 11. Optionally use a shorter stage on the home page on phones (check with the tasteskill gates).

### F13. Low: Event markup is not on the event page; new dates have no markup
- **Evidence:**
  - Event JSON-LD (2 events, offers 2 500 CZK) exists only on `/akce/`. Its `url` points to `/seminar-vincent-chu/#sobota`, which has no Event itself.
  - Both events share the identical name "Seminář s mistrem Vincentem Chu v Praze".
  - The course from 7. 12. and the Sunday on 13. 12. have no markup.
- **Fix:** emit the Events on `/seminar-vincent-chu/` as well, with day-specific names ("… – Hrátky pěti zvířat (sobota)"). Add Event (or Course + CourseInstance) for the beginner course. See `/seo schema`.

### F14. Low: seminar sign-up cannot say which day
- **Evidence:** both seminar buttons use `?tema=4` ("Semináře a akce"), the same topic as the Sunday sessions. The form has no day choice.
- **Fix:** prefill the message from the link ("Přihlašuji se na seminář s Vincentem Chu – sobota 28. 11.") or add a day hint under the button.

### F15. Low: likely terminology slip "dýchání tuina"
- **Evidence:** "principem dýchání tuina (nádech a výdech)" appears on home and `/kurzy-a-lekce/`. Tuina is massage; the breathing term is probably *tu-na* (吐纳). Knowledgeable visitors will notice.
- **Fix:** ask Daniel and correct it in `build/content.mjs`.

### F16. Info: no search visibility yet
- **Evidence:** the brand query "radostvpohybu.cz tchaj-ťi Tkadlčík" and "Vincent Chu seminář Praha" returned no result from the domain, on the deploy day. Only taijizlin.cz covers the 2026 seminar.
- **Fix:** submit the sitemap and request indexing of `/seminar-vincent-chu/` and `/kurzy-a-lekce/` in Search Console now, because both are time-critical. Check again in 2–4 weeks.

## Structured findings (for audit-data.json, category "Search Experience")

```json
{
  "category": "Search Experience",
  "score": 60,
  "score_label": "SXO Gap Score",
  "dimensions": {"page_type": 12, "content_depth": 8, "ux_signals": 10, "schema": 9, "media": 8, "authority": 8, "freshness": 5},
  "personas": [
    {"name": "Exercise researcher", "relevance": 18, "clarity": 14, "trust": 12, "action": 14, "total": 58},
    {"name": "Beginner looking for a course", "relevance": 17, "clarity": 14, "trust": 12, "action": 18, "total": 61},
    {"name": "Praha 4 comparison shopper", "relevance": 19, "clarity": 17, "trust": 11, "action": 15, "total": 62},
    {"name": "Experienced practitioner (Vincent Chu seminar)", "relevance": 22, "clarity": 15, "trust": 18, "action": 17, "total": 72}
  ],
  "mismatch": [
    {"query": "tai chi Praha 4 / tchaj-ťi Praha", "serp_type": "Service/Local", "target": "/kurzy-a-lekce/", "severity": "ALIGNED"},
    {"query": "kurz tai chi pro začátečníky Praha", "serp_type": "Dedicated beginner course page", "target": "/kurzy-a-lekce/#novy-kurz", "severity": "MEDIUM"},
    {"query": "čchi-kung kurz Praha", "serp_type": "Qigong course page", "target": "/kurzy-a-lekce/", "severity": "MEDIUM"},
    {"query": "osm kusů brokátu", "serp_type": "Informational/Hybrid", "target": "/osm-kusu-brokatu/", "severity": "ALIGNED"},
    {"query": "Vincent Chu seminář", "serp_type": "Event listing", "target": "/seminar-vincent-chu/", "severity": "ALIGNED"}
  ],
  "findings": [
    {"id": "F1", "severity": "High", "title": "Home hero CTA links an undated saber-seminar flyer that conflicts with the 28.-29. 11. 2026 seminar (other venue, price 3 900 Kc, wrong e-mail dentrum.cz)", "pages": ["/", "/akce/"]},
    {"id": "F2", "severity": "High", "title": "Seminar page still shows 2025 registration: 1 500 Kc deposit by 15. 11. 2025 to an account", "pages": ["/seminar-vincent-chu/"]},
    {"id": "F3", "severity": "High", "title": "Beginner course lacks 90-min price, term length, trial lesson, what to bring, group size", "pages": ["/kurzy-a-lekce/", "/"]},
    {"id": "F4", "severity": "Medium", "title": "Page-type mismatch: beginner and qigong course queries answered by one section", "pages": ["/kurzy-a-lekce/"]},
    {"id": "F5", "severity": "High", "title": "Old Webnode site dan24.webnode.cz live, indexable, duplicate copy, no link to new site", "pages": ["https://dan24.webnode.cz/"]},
    {"id": "F6", "severity": "Medium", "title": "Three different beginner forms named (8 / 12 / 22)", "pages": ["/cviceni/", "/kurzy-a-lekce/", "/videogalerie/"]},
    {"id": "F7", "severity": "Medium", "title": "Brocade page promises a Tuesday course slot that does not exist", "pages": ["/osm-kusu-brokatu/", "/cviceni/"]},
    {"id": "F8", "severity": "Medium", "title": "Brocade page lacks how-to steps, Ba Duan Jin synonyms; unsupported health claims", "pages": ["/osm-kusu-brokatu/"]},
    {"id": "F9", "severity": "Medium", "title": "No testimonials/reviews; stock imagery instead of real classes", "pages": ["/", "/kurzy-a-lekce/"]},
    {"id": "F10", "severity": "Medium", "title": "Only 2024 mountain events with active sign-up CTA; impossible date range", "pages": ["/cviceni-na-horach/", "/akce/", "/"]},
    {"id": "F11", "severity": "Medium", "title": "Vincent Chu's other 2026 Prague correction sessions not mentioned", "pages": ["/seminar-vincent-chu/"]},
    {"id": "F12", "severity": "Medium", "title": "Mobile first screen shows no course or seminar date", "pages": ["/", "/kurzy-a-lekce/"]},
    {"id": "F13", "severity": "Low", "title": "Event JSON-LD only on /akce/, not on the seminar page; new course and Sunday unmarked", "pages": ["/seminar-vincent-chu/", "/kurzy-a-lekce/"]},
    {"id": "F14", "severity": "Low", "title": "Seminar sign-up topic cannot specify the day", "pages": ["/seminar-vincent-chu/", "/kontakt/"]},
    {"id": "F15", "severity": "Low", "title": "Likely terminology slip 'dychani tuina' (tu-na)", "pages": ["/", "/kurzy-a-lekce/"]},
    {"id": "F16", "severity": "Info", "title": "No search visibility for brand or seminar queries on deploy day", "pages": ["/"]}
  ]
}
```

## Cross-skill follow-ups
- E-E-A-T and article authorship (F8, F9): `/seo content`.
- Event and Course markup (F13): `/seo schema`.
- Local intent and Google Business Profile (F9): `/seo local`.
- Thin beginner section (F3, F4): `/seo page` on `/kurzy-a-lekce/`.
- A PDF report is available via `/seo google report`.

## Limitations
- **`render_page.py` failed in both `--mode auto` and `--mode always`** with `SSLCertVerificationError` (unable to get local issuer certificate). This comes from Avast Web Shield's TLS interception on this PC; it is not a site fault. The pages were fetched with `curl` (all 11 answered 200) and parsed with `parse_html.py`. The site is server-rendered, so the raw HTML holds all copy. Above-the-fold judgements use the existing screenshots in `docs/seo/audit-2026-11-23/screenshots/` (home and kurzy-a-lekce, mobile).
- **The SERP was read through WebSearch, which is US-based, not a google.cz SERP from Prague.** People Also Ask, local pack, AI Overview, ads and featured snippets were not observable. Page-type consensus percentages are estimates from 6–17 results per query.
- No search volumes, Search Console or Analytics data, so persona weighting is qualitative.
- The flyer content was read visually from the image. The taijizlin.cz session list was read via WebFetch and is third-party data.
- Wireframes were not requested and were not produced.
