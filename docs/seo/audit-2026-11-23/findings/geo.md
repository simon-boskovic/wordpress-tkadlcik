# GEO / AI Search Readiness: radostvpohybu.cz (production, 2026-11-23)

**GEO Readiness Score: 66/100**

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Citability | 25% | 58 | 14.5 |
| Structural Readability | 20% | 75 | 15.0 |
| Multi-Modal Content | 15% | 65 | 9.75 |
| Authority & Brand Signals | 20% | 40 | 8.0 |
| Technical Accessibility | 20% | 95 | 19.0 |
| **Total** | | | **66** |

Platform estimates (judgement, not measured): Google AI Overviews 62, ChatGPT Search 52, Perplexity 58, Bing Copilot 50. The on-site work is strong. The low scores come from off-site entity signals (no GBP or Firmy.cz, a thin YouTube presence, the old Webnode site still live) and from Bing/ChatGPT depending on the Bing index, which I could not verify.

## Method and tool limits
- I fetched all 12 pages, robots.txt, llms.txt and sitemap.xml with `curl`. All returned 200 from the page cache (`x-tk-cache: HIT-PHP`).
- `render_page.py` failed with `CERTIFICATE_VERIFY_FAILED` because Avast Web Shield intercepts TLS. The site itself is fine. The plugin venv with trafilatura does not exist, so I extracted the main text with a stdlib parser over `<main id="obsah">`, without nav, script, buttons or forms.
- **Not verified:**
  - Live ChatGPT and Perplexity answers (no DataForSEO).
  - Reddit: `search.json` returned 403.
  - Bing and DuckDuckGo: both served bot-degraded results with mangled diacritics, so I drew no conclusions from them.
  - Wikipedia/Wikidata: the API rate-limited this client. One WebFetch of Wikipedia succeeded.
  - gstaichi.org: the page is JS-only, so I could not see whether the federation lists Prague.
  - Real crawler IPs. I could test only user-agent strings, not WAF rules keyed on IP.

## What works
- **Every relevant AI crawler is allowed in robots.txt.** There is one explicit group for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended and Applebot-Extended. Googlebot, Bingbot and Applebot fall under `*` with `Allow: /`. CCBot and cohere-ai also fall under `*` (allowed). Testing with the real UA strings of 10 bots, including SeznamBot, gave HTTP 200 with an identical 126,588 B body in about 0.2 s each. No bot is blocked or served different content.
- **Fully server-rendered HTML.** All copy is in the raw HTML with no JS dependency. `<html lang="cs">`, canonical, and `max-snippet:-1, max-image-preview:large, max-video-preview:-1` are on all pages. `data-nosnippet` is only on the cookie banner. The sitemap holds exactly the 11 indexable pages. The privacy page is noindex.
- **llms.txt is present, well-formed and fact-checked.** It has an H1, a blockquote summary, page list with descriptions, lineage, taught forms, schedule, prices, events and NAP. `buildLlms` in `build/seo.mjs` throws if a fact is missing from the page text, so the file cannot drift from the pages. It is served as `text/plain; charset=utf-8` with `X-Robots-Tag: noindex`, so it will not rank as a page. Status: **present and valid.**
- **Rich, connected JSON-LD.** It covers Organization (IČO, legal name), SportsActivityLocation with geo, and two Person nodes (Daniel with `knowsAbout` and YouTube `sameAs`, Vincent Chu with an affiliation to the Gin Soon Tai Chi Chuan Federation and `parent` Chu Gin Soon). It also has ProfilePage with `mainEntity`, ContactPage, BreadcrumbList, 3 future Events (past ones are removed) and 5 VideoObjects with duration and uploadDate.
- **Clear entity and lineage statements in visible text.** "Linie předání stylu Yang: Yang Sau Chung → Chu Gin Soon → Vincent Chu → Daniel Tkadlčík" appears on /, /o-mne/ and in llms.txt. English Wikipedia's *Yang Shouzhong* article (Wikidata Q325815) names Chu Gin Soon as his 2nd disciple and links gstaichi.org, so the lineage is checkable against a high-trust source.
- **Facts are extractable.** Schedule and prices sit in `dl` and `li` structures ("Úterý 18:00 - 20:00", "350 Kč lekce 120 minut", "3 250 Kč 10 lekcí", "2 500 Kč za den"). Past dates are marked "Proběhlo", which is good for freshness.
- **/clanky/ is the most citable page.** It has 2,839 words, 31 paragraphs of 40 words or more, and self-contained passages (Yang Cheng Fu's 10 principles, Vincent Chu on Wu Chi and Zhan Zhuang). /osm-kusu-brokatu/ names all eight exercises with a one-line effect each, which suits list answers.
- **Bilingual term pairs** like "tchaj-ťi (tai chi)" and "čchi-kung (qigong)" in titles and descriptions match both Czech and international query spellings.
- All images have alt text. Videos are click-to-load facades that still carry the `youtube.com/watch` URL in the HTML, plus VideoObject markup.

## Findings

### 1. The old Webnode site is live, indexable and carries a stranger's name and address (High)
**Evidence:** `https://dan24.webnode.cz/` returns 200 with `<meta name="robots" content="index,follow">`, a self-canonical, and a sitemap of 13 old URLs, including `/cviceni-ve-zline/` and `/cviceni-na-akci-s-jirim-ledvinou/`. Its footer still has the template placeholder "© 2020 Petr Svoboda. Václavské náměstí 1, Praha 110 00". It says "Cvičení ve Zlíně", although Zlín was dropped on 23 November, and it shows "350 Kč lekce 90 minut", while the new site says 350 Kč per 120 minutes. It does not link to radostvpohybu.cz.

**Why it matters:** LLMs and Bing pick up both sites. They may give the wrong owner or address, offer Zlín classes, or quote a conflicting price. This is the largest entity-consistency risk.

**Fix:** In Webnode, unpublish or delete the project. If Webnode allows it, set up a 301 redirect to radostvpohybu.cz first. Otherwise, at minimum replace the content with a single "Web se přestěhoval na radostvpohybu.cz" page, set noindex and remove the placeholder footer. Then request removal of the old URLs in Bing Webmaster Tools and Google Search Console (if the subdomain can be verified). **Effort:** 30 min, client action in his Webnode account.

### 2. Off-site entity signals are thin: no GBP or Firmy.cz, two small YouTube channels, no Organization sameAs (High)
**Evidence:**
- Organization has no `sameAs`. Person has two channels, `@daniello2151974` (5 videos, 123 subscribers) and `@danieltkadlcik7684` (2 videos, 38 subscribers). Both have empty descriptions and no link to the site.
- No Google Business Profile, Firmy.cz, Mapy.cz or Facebook link appears anywhere on the site. This agrees with `findings/local.md` #1 and #3.
- Wikipedia has no entity for Daniel Tkadlčík, Radost v pohybu or Vincent Chu.
- Not verified: Reddit (403) and press mentions.

**Why it matters:** YouTube mentions are the strongest correlate of AI citation (about 0.74). For local queries such as "tai chi Praha 4", AI Overviews and ChatGPT rely on GBP, Bing Places and directory data.

**Fix:**
- Merge onto one YouTube channel, or name both clearly. Add a channel description with "tchaj-ťi / čchi-kung Praha 4 – radostvpohybu.cz" and a link. Put the site URL in every video description.
- Upload short clips from seminars and classes (Vincent Chu's Prague visits are unique content).
- Create GBP, Firmy.cz and Bing Places listings with identical NAP, then add them to Organization and `#praha` `sameAs`.
- Ask gstaichi.org to list the Prague group with a link (the most authoritative possible backlink and mention). Optionally add a Wikidata item for the business.

**Effort:** 2–4 h client time plus 15 min schema change.

### 3. The seminar page shows 2025 sign-up terms without a "past" marker (Medium-High)
**Evidence:** /seminar-vincent-chu/ has the H2 "Přihlášení na seminář 2025" with "posílejte zálohu 1500 Kč do 15. 11. 2025 na účet 1035195033/0800". The same page sells the 28–29 November 2026 seminar at "2 500 Kč za den, pokud možno platba na místě v hotovosti". The 2025 block is not marked "Proběhlo", unlike the dates above it.

**Why it matters:** An AI asked "jak se přihlásit na seminář Vincenta Chu" can extract the deposit instruction and combine it with the 2026 dates.

**Fix:** Mark the 2025 block as past ("Proběhlo", greyed), move it under an "Archiv" heading, or remove the deposit sentence. Put the 2026 sign-up instruction at the top of the section. **Effort:** 15 min (builder plus rebuild).

### 4. /cviceni-na-horach/ has only 2024 dates, one of them impossible (Medium)
**Evidence:** "Jarní cvičení na horách 10. – 12. 5. 2024 Proběhlo" and "Letní týdenní kurz na horách 30. 7. neděle – 7. 7. 2024 neděle Proběhlo". 30 July to 7 July is an impossible range; it was probably 30. 6. – 7. 7. The page has 191 words and no future date. llms.txt still lists the mountain retreat under "Akce" without saying that no date is scheduled.

**Fix:** Correct the date. Add one sentence such as "Další termín zatím není vypsán – napište si o informace" (only if confirmed by the client). Make llms.txt say the same. Optionally fold this thin page into /akce/. **Effort:** 15 min plus a client question.

### 5. No direct definition passages for the core "what is" queries (Medium)
**Evidence:**
- **Home:** the first visible sentence is poetic: "Najít klid v pohybu a v klidu zase pohyb je jeden z mnoha pohledů…" (28 words). Nothing on the page says, in one block, who teaches what, where, when and for how much.
- **/clanky/:** the H2 "Co je čchi-kung a tchaj-ťi" is answered by a 41-word paragraph that never defines either term ("Tato cvičení byla vždy pouze přirozenými metodami meditace a boje…").
- **Headings:** none of the roughly 90 H2/H3 headings is phrased as a question.
- **Passage length:** median `<p>` length is 5–13 words on most pages. Only /clanky/ and /osm-kusu-brokatu/ have passages in the 100–170 word range.

**Fix:**
- Add a 40–60 word "answer-first" lead on the home page. Example: "Radost v pohybu jsou kurzy tchaj-ťi (tai chi) a čchi-kungu (qigong) Mgr. Daniela Tkadlčíka v Praze 4 (ZŠ Jeremenkova). Cvičíme v úterý a čtvrtek 18–20 h, nový kurz pro začátečníky v pondělí od 7. 12. 2026; lekce 120 min stojí 350 Kč."
- On /clanky/ and /cviceni/, add 2–4 sentence definitions: what tai chi is (Chinese internal martial art practised as slow continuous forms), what qigong is, and what Yang style and Osm kusů brokátu are.
- Rephrase a few H2s as questions, for example "Je kurz vhodný pro začátečníky?", "Kolik stojí lekce?" and "Co si vzít na cvičení?".
- Keep all of this in the client's voice and have the client confirm the facts.

**Effort:** 1–2 h copy plus client approval.

### 6. The 90-minute lesson price is missing, and the old site contradicts the new one (Medium)
**Evidence:** The pages say "Výuka probíhá formou lekcí 90 minut nebo 120 minut", and the new Monday course is 19:00–20:30 (90 min). Only the 120-minute price (350 Kč) is published, on the site and in llms.txt. The old Webnode site says "350 Kč lekce 90 minut".

**Why it matters:** A price question about the beginners' course has no answer on the site, or a conflicting one off it.

**Fix:** Get the Monday course price from the client and publish it on /kurzy-a-lekce/, llms.txt and `priceRange`. **Effort:** 10 min after client input.

### 7. llms.txt lists a past Sunday date without a marker and could add a Q&A block (Low)
**Evidence:** "Celodenní cvičení v neděli: 15. 11. 2026, 13. 12. 2026". 15 November is past, while the pages mark it "Proběhlo". The file has no short FAQ (beginners, what to bring, how to sign up) and no summary of the articles.

**Fix:** In `buildLlms`, filter `SUNDAYS.dates` to dates on or after `today` (the same rule the Events use), or append "(proběhlo)". Add a "## Časté otázky" section built from facts already on the pages, plus one line per article on /clanky/. **Effort:** 30 min plus test update.

### 8. The articles lack authorship and translation provenance, and one entity name is inconsistent (Low)
**Evidence:**
- **10 principles:** the section "10 principů mistra Yang Chen Fu" has no source or translator. The H2 says "Chen Fu", but the body and meta say "Cheng Fu".
- **Wu Chi text:** it credits "Vincent Chu: Co se skrývá za tréninkem Zhan Zhuangu" but gives no translator or original source.
- **Markup:** /clanky/ has only WebPage, with no `Article` or `author` markup. Translator and source are already an open client input.

**Fix:** Correct the H2 to "Yang Cheng Fu". Add a source line under each text (original author, translator, year). Add `Article` nodes with `author` (Vincent Chu for the Wu Chi text, `#vincent-chu`) and `translator` once known. **Effort:** 30 min plus client input.

### 9. Freshness signals are flattened by the build (Low)
**Evidence:** Every sitemap `<lastmod>` and every `dateModified` is 2026-11-23T18:18:26, the deploy time, even on pages whose content did not change. No page shows a visible "aktualizováno" date.

**Fix:** Derive `dateModified` and lastmod from a hash of each page's content, and bump them only when the content changes. Optionally show a visible "Aktualizováno" line on /kurzy-a-lekce/ and /akce/. **Effort:** 1 h.

### 10. Bing index status is unknown, and IndexNow and Bing verification are absent (Low-Medium, not verified)
**Evidence:** The pages carry no `msvalidate.01` tag, and the repo has no IndexNow key (grep found none). ChatGPT Search and Copilot depend largely on Bing's index. I could not check Bing coverage from this machine.

**Fix:** Verify the site in Bing Webmaster Tools (import from GSC), submit the sitemap, and check the coverage of the 11 URLs. Optionally add an IndexNow ping to `cache-warm` after deploys. **Effort:** 20 min (BWT) and 1–2 h (IndexNow).

### 11. Minor content accuracy and multimedia gaps (Info)
- /cviceni/, Hrátky pěti zvířat: "Posilující cvičení obsahující pět cviků…: medvěd sílu paží, tygr, jelen rovnováhu a pružnost, opice." It names only four animals; the crane (jeřáb) is missing.
- The stage pictures are mostly classical Chinese landscape paintings with art credits. Few photos show the actual classes, teacher or gym. Real photos with descriptive alt text and captions (for example "Cvičení tchaj-ťi v tělocvičně ZŠ Jeremenkova, Praha 4") would strengthen image-based and local understanding. The Vincent Chu photo shot on 21–22 November is a good candidate.
- Tab panels on the home page (`hidden` attribute) are present in the HTML and readable by crawlers. No action needed.

## Top 5 highest-impact changes
| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | Unpublish, redirect or noindex dan24.webnode.cz (remove the "Petr Svoboda" footer, Zlín and the old price) | High | 30 min, client |
| 2 | GBP, Firmy.cz and Bing Places listings with identical NAP, plus `sameAs`; one YouTube channel with description and link | High | 2–4 h |
| 3 | Answer-first 40–60 word lead on home, plus real definitions under "Co je čchi-kung a tchaj-ťi"; a few question H2s | Medium-High | 1–2 h |
| 4 | Mark the 2025 deposit block on /seminar-vincent-chu/ as past; fix the 2024 date on /cviceni-na-horach/ and state that no new date exists | Medium | 30 min |
| 5 | Publish the 90-minute and Monday course price; filter past dates in llms.txt and add an FAQ section | Medium | 40 min after client input |

## AI crawler access status
| Crawler | Governs | robots.txt | HTTP test (UA) |
|---|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | Allowed (explicit) | 200 |
| ChatGPT-User | ChatGPT user-initiated fetch | Allowed (explicit) | 200 |
| GPTBot | OpenAI training only | Allowed (explicit) | 200 |
| Claude-SearchBot | Claude search citations | Allowed (explicit) | 200 |
| Claude-User | Claude user-initiated fetch | Allowed (explicit) | not tested |
| ClaudeBot | Anthropic training only | Allowed (explicit) | 200 |
| PerplexityBot | Perplexity search index | Allowed (explicit) | 200 |
| Perplexity-User | Perplexity user fetch | Allowed (explicit) | not tested |
| Googlebot | Google Search and AI Overviews | Allowed (`*`) | 200 |
| Google-Extended | Gemini/Vertex training and grounding (not AIO inclusion) | Allowed (explicit) | n/a (token only) |
| Bingbot | Bing, Copilot, much of ChatGPT Search | Allowed (`*`) | 200 |
| Applebot / Applebot-Extended | Siri/Spotlight / Apple Intelligence training | Allowed (`*` / explicit) | not tested |
| CCBot, cohere-ai | Training | Allowed (`*`) | CCBot 200 |

Allowing the training crawlers is a deliberate choice that suits a small business wanting visibility. Nothing needs to change.

## llms.txt and RSL
- `/llms.txt`: **present and valid**. It is 200 `text/plain` with `X-Robots-Tag: noindex`, generated and fact-checked. Improvements are in finding 7.
- `/llms-full.txt`: 404. It is optional and not needed for an 11-page site.
- RSL 1.0 (`/license.xml`, `/.well-known/rsl.xml`, robots.txt `License:`): **absent**. This is optional. It is only worth adding if the client wants machine-readable licensing terms for the translated articles.

## Brand mention analysis
| Source | Status |
|---|---|
| Wikipedia | No entity for Daniel Tkadlčík, Radost v pohybu or Vincent Chu. Yang Shouzhong (en, Q325815) names Chu Gin Soon and links gstaichi.org. |
| YouTube | 2 channels (5 and 2 videos, 123 and 38 subscribers), empty descriptions, no site link |
| Reddit | Not verified (API 403) |
| LinkedIn / Facebook | None linked from the site. Not verified off-site. |
| gstaichi.org | Not verified (JS-only page) |
| Old site dan24.webnode.cz | Live and indexable with conflicting facts (finding 1) |

## Structured data for audit-data.json (AI Search Readiness)
```json
{
  "category": "AI Search Readiness",
  "score": 66,
  "dimensions": {"citability": 58, "structural_readability": 75, "multimodal": 65, "authority_brand": 40, "technical_accessibility": 95},
  "platforms": {"google_aio": 62, "chatgpt": 52, "perplexity": 58, "bing_copilot": 50},
  "llms_txt": "present_valid",
  "rsl": "absent",
  "findings": [
    {"id": "geo-1", "severity": "High", "title": "Old Webnode site dan24.webnode.cz live, indexable, placeholder owner 'Petr Svoboda', Zlín, conflicting price"},
    {"id": "geo-2", "severity": "High", "title": "Thin off-site entity signals: no GBP/Firmy.cz, two small YouTube channels without site link, no Organization sameAs"},
    {"id": "geo-3", "severity": "Medium", "title": "Seminar page shows 2025 deposit instructions without past marker"},
    {"id": "geo-4", "severity": "Medium", "title": "Mountain page: only 2024 dates, impossible range 30. 7. - 7. 7. 2024"},
    {"id": "geo-5", "severity": "Medium", "title": "No answer-first definitions for core what-is queries; no question headings"},
    {"id": "geo-6", "severity": "Medium", "title": "90-minute / Monday course price missing; conflicts with old site"},
    {"id": "geo-7", "severity": "Low", "title": "llms.txt lists past Sunday date; no FAQ section"},
    {"id": "geo-8", "severity": "Low", "title": "Articles lack source/translator and Article schema; 'Yang Chen Fu' vs 'Cheng Fu'"},
    {"id": "geo-9", "severity": "Low", "title": "All lastmod/dateModified equal deploy time"},
    {"id": "geo-10", "severity": "Low", "title": "Bing index unverified; no IndexNow (not verified)"},
    {"id": "geo-11", "severity": "Info", "title": "Five-animals list names four; few real class photos"}
  ]
}
```
