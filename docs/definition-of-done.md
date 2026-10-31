# Definition of Done – web Radost v pohybu (Daniel Tkadlčík)

Platí pro jakoukoli technologii a hosting. Web je hotový, když jsou splněné všechny body níže. Body označené
**⏳ čeká na klienta** se splní doplněním obsahu od klienta, nebo je klient písemně odsouhlasí jako vynechané (§7).

Automatické ověření: `node build/dod.mjs --all` (harness, viz §8 a `CLAUDE.md` „The DoD harness“),
`node build/verify.mjs --seo --cache` a `node build/interact.mjs all`.

## 1. Rozsah
- Veřejné stránky (7), každá podle svého návrhu (Claude Design, `design_handoff_tkadlcik/`):
  - Domů `/` (Main), Cvičení `/cviceni/` (Cviceni), Nabídka kurzů a lekcí `/kurzy-a-lekce/` (Rozvrh),
    Akce `/akce/` (Seminare), O mně `/o-mne/` (OMne), Články `/clanky/` (Clanky), Kontakt `/kontakt/` (Kontakt).
- Stránka 404 ve stylu webu (vlastní nadpis, cesta dál, `noindex`).
- Web nemá formulář: kontakt je telefon a e-mail, mapy Google a videa YouTube se načítají až na kliknutí.
- Analytika: Google Analytics (Site Kit) **jen se souhlasem** se statistickými cookies (lišta Complianz, striktní
  opt-in, stejně jako martinadamus.cz R45; podrobnosti §6 „Souhlas s cookies“).
- Záměrné odchylky od návrhu (každá pojmenovaná a zdůvodněná v `build/lib/reference-patches.mjs`):
  - **D1** písmo jen Geist (+ Geist Mono), hostované na webu; **D2** výběr písma z návrhu („Písmo“) v produkci není;
  - **D3** zástupné boxy „[Mapa]“ jsou mapy načítané na kliknutí;
  - **D0** návrh nemá `<meta name="viewport">` (plátno ho nepotřebuje), web ano;
  - **D8** spodní lišta patičky: identifikace provozovatele (§ 435 OZ) pod copyrightem a odkaz „Nastavení cookies“.
- Cookie lišta v návrhu není: harness proto začíná jako vracející se návštěvník, který odmítl vše kromě funkčních
  cookies (lišta skrytá, `build/lib/cdp.mjs`), takže srovnání s návrhem porovnává samotnou stránku; `TK_CONSENT=fresh`
  spustí kontrolu jako první návštěvu s lištou. Lighthouse měří vždy první návštěvu (lišta zobrazená).

## 2. Vzhled
Kontroluje se na šířkách 390, 820, 1180 a 1440 px a srovnává se schváleným návrhem: nejvýš **1 %** odlišných pixelů.

- **Barvy** (poznámka „TÓN HLASU / VIZUÁL v2“ v `canvas.json`):
  - pozadí **Kámen `#F7F7F4`**, karty bílé `#FFFFFF`, linky `rgba(14,15,14,.09)` / `.18`,
  - text **Tuš `#0E0F0E`**, sekundární text `#2B2D2A` / `#5F625D`,
  - akcent **Jade `#0F766E`** (bílý text na něm 5,4:1), tmavší `#0B5E58`, světlý `#E2EFEC`,
  - tmavé panely `#0E0F0E` s textem `#F2F2EE`.
- **Písmo:** Geist 400/500/600 pro nadpisy i text, Geist Mono 400 pro štítky a časy. Bez kurzívy. Písmo je
  hostované na webu (žádný požadavek na Google Fonts), přednačtené, `font-display: swap`.
- **Rozměry:** karty mají rádius **24 px** (na mobilu 20 px), tlačítka, štítky, záložky a hlavička jsou
  **pilulky** (rádius 999 px), tmavé/jade panely 32 px (mobil 24 px). Obsah je široký nejvýš 1240 px a vycentrovaný.
- **Hlavička:** plovoucí pilulka s logem (taiji kruh). Od 821 px plné menu, do 820 px tlačítko Kontakt,
  telefon a hamburger s celoobrazovkovým tmavým menu.
- **Rozložení:** od 320 px nevzniká vodorovný posuvník.
- **Texty:** odpovídají návrhu slovo od slova (texty z původního webu, opravené jen překlepy; H1/H2 upravené pro SEO).
- **Zástupné boxy** „[Foto]“ a „[Video]“ zůstávají ve stylu návrhu, dokud klient nedodá materiál ⏳ (§7).

## 3. Chování a pohyb
- **Easing:** `cubic-bezier(.23,1,.32,1)` (ease-out) všude, kde se něco hýbe.
- **Stisk tlačítka:** `scale(.97)` za **160 ms** s tímto easingem (ikony a hamburger `.95`, karta-odkaz `.99`).
- **Hover:** jen na zařízeních s myší (`@media (hover:hover) and (pointer:fine)`). Na dotyku po klepnutí nic
  nezůstane v hover stavu.
- **Dechový kruh** (Domů): **5 s nádech / 5 s výdech**, symetrický sinus (jeden cyklus 10 s), nekonečně.
- **Záložky Praha 4 / Zlín** (Nabídka kurzů a lekcí):
  - tmavá pilulka přejíždí přechodem `clip-path` (250 ms), panely se prolnou,
  - ovládání myší, dotykem i klávesnicí (šipky ←/→ s přetočením, Home/End; Tab vede ze záložky rovnou do panelu),
  - skrytý panel je `inert` (nejde do něj tabulátorem),
  - bez JavaScriptu jsou vidět oba panely pod sebou a přepínač se neukazuje.
- **Scroll reveal:** prvky se objeví jednou při zobrazení (IntersectionObserver), fade + posun **14 px** za
  640 ms, se zpožděním **60 ms** mezi prvky jedné dávky (nejvýš 4 kroky). Každý prvek se animuje jen jednou.
  Úvodní blok stránky (`.rise`) naběhne při načtení s krátkým odstupňováním.
- **Přechody mezi stránkami:** View Transitions (stejný web): stránka se prolne (ven 160 ms, dovnitř 260 ms
  s posunem 8 px, zpět opačně), hlavička stojí, zvýraznění aktuální položky menu přejede na novou.
  Nikdy nevznikne bílý záblesk.
- **Přednačítání:** odkaz na jinou stránku webu se při najetí myší přednačte (speculation rules, prefetch;
  na dotyku konzervativně, nic při rolování; ne při Save-Data a bez JavaScriptu); přednačtená stránka jde z page cache.
- **Mobilní menu:**
  - otevře se tlačítkem, zbytek stránky (obsah, patička) je nedostupný (`inert`), Tab zůstává v menu,
  - Escape ho zavře a vrátí focus na tlačítko, klik na odkaz ho zavře,
  - po rozšíření okna nad 820 px se samo zavře.
- **Mapy:** box „Zobrazit mapu“ – nic se z Googlu nenačte, dokud návštěvník neklikne (myš, dotyk, Enter);
  pak se box nahradí mapou a focus přejde na ni. Bez JavaScriptu zůstane odkaz „Otevřít v Google Maps“.
- **Omezený pohyb** (`prefers-reduced-motion: reduce`): **jen fade** – reveal a úvod se jen prolnou, nic se
  neposouvá, dechový kruh stojí (ukazuje „Nádech“), záložky se přepnou okamžitě, tlačítka se při stisku nezmenšují,
  přechody mezi stránkami se neanimují. Obsah je hned vidět.

## 4. Kvalita a přístupnost
- **Chyby:** v konzoli nejsou chyby ani varování, žádný požadavek nevrací 4xx/5xx.
- **Lighthouse** (mobil i desktop, každá stránka):
  - Accessibility 100, Best Practices ≥ 95, SEO 100,
  - Performance (mobil) ≥ 90.
- **Core Web Vitals:** LCP ≤ 2,5 s na Slow 4G, CLS < 0,05, INP < 200 ms (laboratorně TBT < 200 ms).
- **Kontrast:** text má kontrast aspoň 4,5:1 vůči skutečnému pozadí.
- **Klávesnice:**
  - celý web jde ovládat klávesnicí, pořadí tabulátoru odpovídá pořadí v dokumentu,
  - „Přeskočit na obsah“ je první zastávka,
  - focus ring má **2 px v barvě Jade**, je vidět všude a nikde se neořízne.
- **Dotyk:** všechny dotykové cíle mají aspoň 44×44 px (odkazy uvnitř odstavce se nepočítají).
- **Struktura stránky:**
  - každá stránka má jeden `<main>` a jeden `<h1>`, úrovně nadpisů se nepřeskakují,
  - kotvy, na které se odkazuje z jiných stránek, existují právě jednou: `#brokat`, `#slov`, `#yang`, `#videa`
    (Cvičení), `#chu`, `#hory` (Akce), `#cena`, `#misto` (Nabídka),
  - žádné duplicitní `id`.
- **Fotky:** WebP nebo AVIF, každá pod 300 kB, popisný alt, pevné rozměry (`width`/`height`), responzivní
  varianty (`srcset` + `sizes`), pod prvním zobrazením `loading="lazy"`. ⏳ fotky dodá klient (§7).
- **Bez JavaScriptu:** obsah je čitelný (nic nezůstane skryté), všechny odkazy fungují, oba panely záložek jsou vidět.
- **Skripty:** každá stránka načítá jen to, co používá (`tabs` jen Nabídka, `map` jen Nabídka a Kontakt;
  `nav`, `reveal` a přechody všude); žádné jQuery ani frontendové JS Elementoru.

## 5. SEO
- **`<head>` každé stránky:**
  - `lang="cs"`, unikátní title a meta description (`build/seo.json`),
  - absolutní kanonická URL na sebe sama, Open Graph tagy (title, description, image), ikona webu (favicon),
  - `theme-color #F7F7F4`, žádné `<meta name="generator">`.
- **Strukturovaná data (JSON-LD) na všech stránkách**, jeden blok:
  - organizace Radost v pohybu s obojím místem (Praha 4, Zlín), telefonem, e-mailem a mapou,
  - osoba Daniel Tkadlčík, WebSite, uzel stránky, BreadcrumbList pod úvodní stránkou,
  - Event jen u seminářů, které ještě nezačaly,
  - všechno projde Rich Results Testem (ověřit na produkční doméně).
- **Soubory pro vyhledávače a AI:**
  - `robots.txt` odkazuje na `sitemap.xml`,
  - sitemap obsahuje právě 7 stránek a každá URL vrací 200,
  - `llms.txt` (text/plain) odkazuje na všechny stránky absolutními URL,
  - vyhledávání je `noindex`; autoři ani uživatelé webu nejdou vyčíst (`/?author=1`, `/wp-json/wp/v2/users`).
- **URL:** čitelné (`/kurzy-a-lekce/`, `/o-mne/`). Stará URL z Webnode mají přesměrování 301 ⏳ (rozhodnutí
  o doméně a seznam starých URL, §7).

## 6. Funkce
- **Kontakt:** telefon (`tel:`) a e-mail (`mailto:`) v hlavičce, mobilním menu, patičce a na Kontaktu; formulář není.
- **Mapy na kliknutí:** viz §3; jediný požadavek na Google vznikne až po kliknutí (to kliknutí je souhlas, lišta ho
  neblokuje ani nepřekrývá).
- **Souhlas s cookies** (Complianz 7.5.5 + Site Kit 1.188.0, `wp tk consent-setup`):
  - při první návštěvě se zobrazí lišta „Nastavení cookies“ (česky, barvy a písmo webu, Přijmout a Odmítnout stejně
    výrazné, ovladatelná klávesnicí, viditelný focus, cíle ≥ 44 px, kontrast ≥ 4,5:1, bez posunu obsahu);
  - **před souhlasem nejde na Google nic** a nevznikne `_ga`; značka Google je v HTML (i v page cache) zablokovaná
    (`type="text/plain" data-category="statistics"`), Consent Mode vypnutý;
  - „Odmítnout“ platí i po obnovení stránky; „Přijmout“ načte značku; odkaz „Nastavení cookies“ v patičce lištu znovu
    otevře, odvolání souhlasu smaže `_ga` a stránku obnoví; odkaz v liště vede na `/zasady-ochrany-osobnich-udaju/#cookies`;
  - kategorie jen Funkční a Statistické; souhlas platí 365 dní; stránky neposílají `Set-Cookie`.
  - Ověření: `node build/interact.mjs consent` (každý požadavek na Google zachycen lokálně, falešná značka `GT-LOCALTEST`),
    `./wp.sh eval-file /project/build/test/consent-test.php`.
- **Page cache:** každá stránka se servíruje jako statický soubor (`X-TK-Cache: HIT`), po uložení obsahu se cache
  smaže a znovu naplní; 404 se nikdy neukládá. Ověření: `node build/verify.mjs --cache` / `npm run cache-check`.
- **Bezpečnostní hlavičky** na každé odpovědi (HSTS jen přes HTTPS), `readme.html`/`license.txt` 404.
- **Ke stažení** (leták, dokumenty v Článcích) ⏳: dnes odkazují na úložiště Webnode, před vypnutím Webnode je
  potřeba je přenést na web (§7).

## 7. Obsah od klienta
Každý bod je buď doplněný, nebo ho klient písemně odsouhlasil jako vynechaný. ⏳ = čeká.
- ⏳ **Fotky** místo všech „[Foto]“ (Domů, O mně, …) a obrázek pro sdílení (og:image).
- ⏳ **Videa** pro Videogalerii (Cvičení) místo „[Video]“ – odkazy nebo soubory a souhlas s vložením (YouTube by
  mělo jít také „na kliknutí“ jako mapy).
- ⏳ **Mapy:** potvrzení adres pro mapy (Jeremenkova 1003/66A, Praha 4; Osvoboditelů 484, Zlín).
- ⏳ **Telefon** `+420 773 287 1113` má 10 číslic (české číslo má 9) – ověřit správné číslo.
- ⏳ **„13 Words of Tchaj-ťi“** na Nabídce: karta uvádí „Úterý 18:00 – 19:30h, Osm kusů brokátu“ – čas i název
  lekce vypadají zkopírované z karty Osm kusů brokátu; potvrdit správný text.
- ⏳ **Letní týdenní kurz na horách** (Akce): „30. 7. neděle – 7. 7. 2024 neděle“ – konec je před začátkem, opravit.
- ⏳ **Termíny z roku 2024** (Akce: hory 10.–12. 5. 2024 a letní kurz; Nabídka: Zlín „pátek 19. 4. 2024“) jsou v minulosti – aktuální termíny.
- ⏳ **Ceny:** 350 Kč platí pro lekci 90 i 120 minut – potvrdit.
- ⏳ **Soubory ke stažení** (leták na Šavli, 10 principů, Wu-ťi) přenést z Webnode na web.
- ⏳ Klient schválil texty, ceny, kontakty a nadpisy upravené pro SEO.
- ⏳ **Google Analytics:** Google účet klienta a služba GA4 (nebo souhlas s webem bez analytiky); Site Kit se propojí
  až na produkci (`docs/go-live-requirements.md` #21), lokálně běží jen falešná značka.

## 8. Ověření a předání
- **Zařízení:** web se testuje na:
  - mobilu na výšku (390×844) a na šířku (844×390),
  - tabletu na výšku i na šířku (820×1180, 1180×820),
  - desktopu (1440×900) a velkém monitoru (1920×1080).
- **Emulace dotyku:** mobil a tablet se testují s emulací dotyku, desktop s myší.
- **Prohlížeče:** Chrome, Edge, Safari (iOS) a Firefox. Automaticky: Chromium (vše), Firefox + WebKit smoke
  (`crossbrowser`, mimo sandbox Claude Code – v něm je SKIP); Safari na skutečném iPhonu ručně.
- **Výsledek testu:** `node build/dod.mjs --all` bez FAIL (N/A a SKIP nejsou selhání), `npm test`,
  `node build/verify.mjs --seo --cache` a `node build/interact.mjs all` zelené; žádná blokující ani vysoká chyba.
- **Doklady:** screenshoty všech stránek vedle schváleného návrhu (mobil, tablet, desktop):
  `node build/dod-evidence.mjs` → `docs/verification/`.
- **Po nasazení na produkční doméně** (`docs/deploy.md`):
  - web běží přes HTTPS (HTTP/2), platí `docs/go-live-requirements.md`,
  - page cache odpovídá `HIT`, stará URL z Webnode mají 301,
  - sitemap je odeslaná v Search Console, strukturovaná data projdou Rich Results Testem,
  - Lighthouse na produkci splní §4.
- **Předávací dokumentace** (`docs/HANDOVER.md`) odpovídá skutečnému stavu.
