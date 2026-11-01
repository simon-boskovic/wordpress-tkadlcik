# Handover — Radost v pohybu (dan24.webnode.cz → WordPress + Elementor, lokální build)

Web lektora tchaj-ťi a čchi-kungu Daniela Tkadlčíka, postavený stejnou technikou jako martinadamus.cz
(`../wordpress-adamus-main`): Hello Elementor + child theme `tkadlcik`, stránky generované z repa
(`build/generate.mjs` → `wp tk page-upsert`), The SEO Framework, vlastní statická page cache, bezpečnostní hlavičky.
Bez formuláře, analytiky a cookie lišty.

## 0. Stav (31. 10. 2026)

- **Lokálně hotové:** 7 stránek podle návrhu Claude Design + stránka zásad ochrany osobních údajů (`design_handoff_tkadlcik/`), 404, mapy na kliknutí,
  přechody mezi stránkami (View Transitions), přednačítání odkazů, JSON-LD na všech stránkách, `llms.txt`,
  ikona webu, page cache, bezpečnostní hlavičky.
- **Ověřovací nástroje přenesené z martinadamus:** `verify.mjs`, `interact.mjs`, DoD harness (`dod.mjs`),
  `serve-prototype.mjs` s referenčními patchi, `dod-evidence.mjs`. Výsledky posledního běhu: §5.
- **Nenasazeno.** Doména **radostvpohybu.cz**, hosting **Webglobe** (2026-11-01). Runbook: `docs/deploy.md`
  (balík `./build/deploy-bundle.sh`, generálka na PHP 8.2 + MySQL 5.6 `./build/rehearsal.sh` prošla 2026-11-01).
  Stav redesignu 2026-11-01: `CLAUDE.md` „Redesign of 2026-11-01“ (tento soubor popisuje stav před ním).
- **Čeká na klienta:** fotky, videa, potvrzení obsahu (§2).
- **Zásady ochrany osobních údajů** (`/zasady-ochrany-osobnich-udaju/`, 8. stránka, mimo návrh): noindex,follow
  + vlastní canonical (R21), mimo sitemap a `llms.txt`, odkaz v patičce; doplňky od klienta viz §2.4.

## 1. Kde co je

| Soubor | K čemu |
|---|---|
| `CLAUDE.md` | Provozní kontext: příkazy, `wp tk …`, page cache, build, DoD harness, pasti — **autoritativní pro práci** |
| `docs/definition-of-done.md` | Definition of Done — **akceptační brána** (§1 Rozsah … §8 Ověření a předání) |
| `docs/go-live-requirements.md` | Nastavení serveru, na kterých web závisí (#1–20) — kontrolní seznam pro výběr hostingu |
| `docs/deploy.md` | Runbook nasazení (obecný, TODO pro hosting) |
| `design_handoff_tkadlcik/` | Návrh (Claude Design, read-only): `*.dc.html`, `site.css`, `canvas.json` (poznámka „TÓN HLASU“ = tokeny a pravidla pohybu), `support.js` (runtime) |
| `build/` | generátor (`generate.mjs`, `builders/`, `content.mjs`, `fragments.mjs`, `seo.json`), `rebuild.sh`, ověřování (`verify.mjs`, `interact.mjs`, `dod.mjs`, `lib/dod/`, `expectations.mjs`, `serve-prototype.mjs`, `lib/reference-patches.mjs`), testy `build/test/` |
| `wp-content/themes/tkadlcik/`, `wp-content/mu-plugins/` | child theme, `wp tk …` příkazy, page cache, hlavičky, hardening |
| `build/shots/` (gitignored) | výstupy harnessu: `dod/SUMMARY.md`, `dod/<stránka>/report.md`, PNG reference / web / rozdíl |
| `docs/verification/` | doklady pro předání (`npm run dod:evidence`) |

## 2. Co zbývá

### 2.1 Obsah od klienta (DoD §7)
- **Fotky** místo všech „[Foto]“ a obrázek pro sdílení (og:image) — do `client-img/`, pak `./build/rebuild.sh`
  (`media-import` převede na WebP).
- **Videa** pro Videogalerii (Cvičení) místo „[Video]“ — odkazy/soubory; YouTube vkládat „na kliknutí“ jako mapy.
- ✅ **Telefon** potvrzený 2026-11-01: `+420 773 287 113` (dříve chybně `773 287 1113`) (je v hlavičce,
  mobilním menu, patičce, Kontaktu, JSON-LD i `tel:` odkazech; jediný zdroj `build/content.mjs` `contact`).
- **Karta „13 Words of Tchaj-ťi“** (Nabídka kurzů): „Úterý 18:00 – 19:30h / Osm kusů brokátu“ — čas i název lekce
  vypadají zkopírované z karty Osm kusů brokátu; potvrdit text.
- **Letní týdenní kurz na horách** (Akce): „30. 7. neděle – 7. 7. 2024 neděle“ — konec před začátkem.
- **Minulé termíny z roku 2024** (Akce: hory 10.–12. 5. 2024, letní kurz; Nabídka: Zlín „pátek 19. 4. 2024“) — dodat aktuální.
- **350 Kč za lekci 90 i 120 minut** — potvrdit cenu.
- **Soubory ke stažení** (leták na Šavli, 10 principů mistra Yang Chen Fu, Wu-ťi) leží na úložišti Webnode
  (`cbaul-cdnwnd.com`) — přenést na web před vypnutím Webnode.
- Potvrzení adres pro mapy, schválení textů a nadpisů upravených pro SEO.

### 2.1a UX vrstva před spuštěním (bez klienta) — `build/builders/ux.mjs`
Texty klienta beze změny (odkazy jen obalují jeho slova, utlumení je jen barva); nové popisky jen „Proběhlo“,
„Přihlásit se e-mailem“ a existující „Nabídka kurzů a lekcí“, „Kontakt“, „Rozvrh a ceny“.
- **Minulé akce podle data** (`build/content.mjs` `EVENTS`, datum buildu v Praze, `TK_TODAY=RRRR-MM-DD` přepíše):
  akce s koncem před dneškem má utlumený termín + štítek „Proběhlo“ (Akce: seminář Vincenta Chu a oba termíny na
  horách; Domů: karta semináře; Nabídka kurzů: termín Zlín 19. 4. 2024); minulé bloky jdou za aktuální (Domů:
  Zlín → seminář → hory). U minulého semináře je věta o záloze utlumená a tlačítko Kontakt je „ghost“.
  **Datum se počítá při generování: po uplynutí termínu akce spustit `./build/rebuild.sh --pages`** (jinak akce
  zůstane bez štítku). Nová akce = záznam v `EVENTS` (+ `seo.mjs SEMINARS` pro JSON-LD Event) a hrany v `ux.mjs`.
- **Další kroky:** na konci Cvičení, O mně, Článků a Akcí řádek „Nabídka kurzů a lekcí“ + „Kontakt“; v každé
  sekci Cvičení (#brokat, #slov, #yang) odkaz „Rozvrh a ceny“ na kartu kurzu (`#kurz-brokat`, `#kurz-slov`, `#kurz-yang`).
- **Přihláška:** každá karta kurzu (vč. Zlína) má „Přihlásit se e-mailem“ = `mailto:` s předmětem
  „Přihláška – <název kurzu>“ (`generate.mjs` povoluje u mailto jen `?subject=`).
- **Kontakt:** H1 „Kontakt – tchaj-ťi Praha 4 a Zlín“; obě místa odkazují „Rozvrh a ceny“ na `#praha` / `#zlin`.
  Řádek Zlína v patičce odkaz nemá (patička je `footer.php`, mimo generátor) — případně doplnit v šabloně.
- **O mně:** „rodinnému stylu Yang“ → `/cviceni/#yang`, „mistra Vincenta Chu“ → `/akce/#chu`,
  „Osmi kusů brokátu“ → `/cviceni/#brokat`, „13 slov tchaj-ťi“ → `/cviceni/#slov`.
- Referenční patche **D10–D14** nesou tytéž úpravy do návrhu (sdílený seznam `uxEdits()`), testy `build/test/ux.test.mjs`
  (pevná data 2024-01-01 / 2025-11-01 / 2026-10-31).

### 2.2 Otevřená rozhodnutí
- **Hosting a doména:** kde web poběží (požadavky `docs/go-live-requirements.md`, hlavně PHP ≥ 8.2, WP-CLI přes
  SSH, `.htaccess`, brotli/gzip, HTTPS + HTTP/2) a pod jakou doménou (dnes `dan24.webnode.cz`).
- **Přesměrování z Webnode:** pokud stará adresa zůstane subdoménou `webnode.cz`, 301 nastavit nejde; s vlastní
  doménou je potřeba seznam starých URL a mapa 301 na nové stránky.
- **Videa:** YouTube (na kliknutí) nebo vlastní soubory.

### 2.3 Technické nálezy z DoD (pro vlastníka šablony/generátoru)
Viz §5 „Selhání“ — každé s místem, kontrolou a pravděpodobnou příčinou.

### 2.4 Identifikace podnikatele a zásady ochrany osobních údajů
- **Zdroj údajů:** veřejný živnostenský rejstřík (RŽP), ověřil uživatel **31. 10. 2026**: Mgr. Daniel Tkadlčík,
  IČO 75979390, sídlo Pod vinohradem 68/18, 147 00 Praha 4 – Braník, podnikatel zapsaný v živnostenském rejstříku,
  příslušný živnostenský úřad Úřad městské části Praha 4. Jediný zdroj: `build/content.mjs` `business` (+ rozpad
  adresy `businessAddress` pro JSON-LD) → `data/site.json` (patička), stránka zásad, JSON-LD Organization
  (`legalName`, `identifier` IČO, `address`). **DIČ neznáme** → `vatID` se neuvádí.
- **Datum narození** z rejstříku se **záměrně nikde nezveřejňuje** (není potřeba pro § 435 OZ; test v
  `generate.test.mjs` hlídá, že se do `site.json` nedostane).
- **Telefon** na stránce zásad záměrně není (číslo je sporné, §2.1); kontakt pro GDPR = e-mail.
- **Zbývá doplnit od klienta** (na stránce viditelně jako `[doplnit: …]` / `[HOSTING – doplnit]`, zdroj
  `build/builders/zasady.mjs`, datum `content.mjs privacy.effectiveDate`):
  - **hosting:** název a sídlo poskytovatele, doba uchování serverových logů (až po výběru hostingu, §2.2),
  - **Google Analytics:** doba uchování dat (2 nebo 14 měsíců, nastavení služby GA),
  - **semináře:** podmínky přihlášení a storna; doba uchování přihlášek po skončení akce,
  - **e-mailová a telefonická komunikace:** doba uchování (např. 3 roky od poslední komunikace),
  - **datum platnosti** zásad (= datum spuštění webu).
- **Předpoklad textu:** Google Analytics se podle zadání spouští **až po souhlasu** se statistikami. Pokud by
  Consent Mode v2 běžel v „advanced“ režimu (Google tag se načte i bez souhlasu a posílá pingy bez cookies),
  musí se bod 4 zásad upravit.

## 3. Jak všechno spustit

### 3.1 Stack a build
```bash
docker compose up -d                 # WordPress :8020, MariaDB, Mailpit :8026
./wp.sh tk doctor                    # read-only report
./build/rebuild.sh                   # plný build (generate → site-setup → … → cache-warm)
./build/rebuild.sh --pages           # rychlá smyčka po změně builderu
```

### 3.2 Kontroly
```bash
npm test                                     # unit testy (build/test/**/*.test.mjs)
node build/verify.mjs                        # 8 stránek (7 z návrhu + zásady OÚ) + 404
node build/verify.mjs --seo --cache          # + head/JSON-LD/sitemap/robots/llms + page cache
node build/interact.mjs all                  # menu, nojs, tabs, reduced-motion, vt, prefetch, map
node build/interact.mjs tabs                 # jeden scénář
```

### 3.3 DoD harness
```bash
node build/serve-prototype.mjs &             # návrh na http://127.0.0.1:8765/Main.dc.html (s referenčními patchi)
node build/dod.mjs --all --jobs=3            # ~25 min; build/shots/dod/SUMMARY.md + <stránka>/report.md
node build/dod.mjs --only=kontakt --checks=visual,keyboard   # podmnožina
node build/dod.mjs --summary                 # jen překreslit SUMMARY z uložených výsledků
npm run dod:evidence                         # docs/verification/dod-results.md + JPEG screenshoty (macOS sips)
node build/dod.mjs --help                    # bezpečné, nic nespouští
```
- Prohlížeč: Playwright Chrome for Testing (`~/Library/Caches/ms-playwright/chromium-1223`), jinak `TK_BROWSER=…`.
- Lighthouse a Playwright: `.tools/pw` je symlink na `../wordpress-adamus-main/.tools/pw` (gitignored);
  **nic neinstalovat přes npm** (globální npm registry je na tomto Macu rozbité). Přepis: `TK_LIGHTHOUSE`, `TK_PLAYWRIGHT`.
- **`crossbrowser` (Firefox/WebKit) v sandboxu Claude Code = SKIP.** Z běžného terminálu:
  `TK_CROSSBROWSER=1 node build/dod.mjs --all --checks=crossbrowser`. Sandbox nikdy neobcházet.
- Návrh potřebuje síť (React z unpkg.com); `support.js` z handoffu martinadamus tyto soubory vykreslí správně
  (ověřeno: šablony `{{ }}`, reveal, záložky).

### 3.4 Referenční patche (záměrné odchylky od návrhu)
`build/lib/reference-patches.mjs` — aplikují se jen na odpověď `serve-prototype.mjs`, soubory návrhu zůstávají
beze změny; každý patch má id, název a zdůvodnění a musí sedět přesně (jinak 500 / `npm test` selže):
- **D0** `<meta name="viewport">` (plátno vykresluje návrhy v iframu pevné šířky; telefon by bez něj kreslil 980 px),
- **D1** písmo Geist z webu místo Google Fonts (stejné soubory jako `inc/fonts.php`),
- **D2** bez výběru písma (nástroj pro revizi návrhu),
- **D3** „[Mapa]“ → box mapy na kliknutí (`fragments.mjs mapBox`, styly z `site.css`),
- **D5** „[Video YouTube]“ → box videa na kliknutí (`fragments.mjs videoBox`) včetně upozornění
  „Video načteme z YouTube až po kliknutí.“ (`VIDEO_NOTE`, obdoba poznámky u mapy).
- **D10–D14** UX vrstva (`build/builders/ux.mjs`): minulé akce (D10, podle data buildu), další kroky + id karet
  kurzů + styly `tk-ux` (D11), přihláška e-mailem (D12), H1 a odkazy míst na Kontaktu (D13), odkazy v textu O mně (D14).
Každá další schválená odchylka = nový patch, ne povolení kontroly.

## 4. Pasti
- **Nikdy needitovat stránky v Elementor UI** — další `page-upsert` je přepíše.
- **Po změně šablony/CSS/JS purge + warm** (`rebuild.sh` to dělá); HIT z `.htaccess` WordPress vůbec nespustí.
- **Hladké rolování na kotvu** po příchodu z jiné stránky (např. `/cviceni/#videa`) doběhne až po ~1 s — testy
  na kotvu čekají.
- **CSS animace v CDP** hlásí easing efektu (`linear`); skutečný easing keyframů čte harness z computed style.
- **Pozadí webu je téměř bílé**, proto `flash` hledá prázdný čistě bílý snímek, ne „světlý“ snímek.
- **`dod.mjs --all` je dlouhý běh**; nespouštět dva najednou. Čekací smyčky: `pgrep -f "[b]uild/dod.mjs"`.
- **Firefox v sandboxu** se nespustí — viz §3.3.

## 5. Výsledky posledního ověření

_Doplňuje se po každém plném běhu (`node build/dod.mjs --all --jobs=3`)._

Běh `node build/dod.mjs --all --jobs=3`, run id `2026-10-31T15:28:15.046Z#46658` (~22 min). Doklady:
[`docs/verification/dod-results.md`](verification/dod-results.md) + `docs/verification/screenshots/` (28 souborů,
návrh | web, M/T/TL/D). Souhrn harnessu: `build/shots/dod/SUMMARY.md`.

| Stránka | visual | console | overflow | reduced-motion | animations | hover | press | keyboard | targets | seo | contrast | images | nojs | flash | crossbrowser | lighthouse |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| domu | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | s | ✗ |
| cviceni | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| kurzy-a-lekce | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| akce | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| o-mne | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| clanky | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| kontakt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |

- **Vizuální shoda** s návrhem (s patchi D0–D3): max **0,07 %** (Kontakt M), limit 1 %.
- **Lighthouse:** Performance 100, SEO 100, Best Practices 100, LCP mobil 1,5–1,65 s, CLS 0, TBT 0 ms;
  **Accessibility 94–96** (viz selhání).
- `npm test` 98/98 (+1 přeskočený bez `TK_BASE`), `verify.mjs --seo --cache` zelené, `interact.mjs all` zelené
  (menu, nojs, tabs, reduced-motion, vt, prefetch, map).
- `crossbrowser` = SKIP (sandbox Claude Code) — spustit z terminálu (§3.3).

**Selhání (všechna v šabloně, převzatá z návrhu — návrh má stejné hodnoty):**
1. **lighthouse / color-contrast, všechny stránky:** dekorativní `.wordmark` v patičce („Radost v pohybu“,
   `rgba(14,15,14,.07)`, `aria-hidden="true"`) — axe ho i tak měří (1,15:1). Oprava: vykreslit ho tak, aby to nebyl
   textový uzel (např. `::before { content: "Radost v pohybu" }` nebo SVG s `aria-hidden`), vzhled beze změny.
2. **lighthouse desktop / label-content-name-mismatch, všechny stránky:** `<a class="brand" aria-label="Radost v
   pohybu">` obsahuje viditelný text „Radost v pohybu Čchi-kung a tchaj-ťi“; přístupný název musí viditelný text
   obsahovat. Oprava: `aria-label` odstranit (nebo „Radost v pohybu – Čchi-kung a tchaj-ťi“).
3. **targets (K7 ≥ 44 px), všechny stránky:** odkazy v patičce (Domů … Články, telefon, e-mail: výška 24 px),
   logo na mobilu (30×44, jen ikona), `a.lnk.small` „Videogalerie“ / „Video mistra Vincenta Chu…“ (36 px,
   Nabídka). Oprava: `min-height:44px; display:inline-flex; align-items:center` (patička, `.lnk`), logo
   `min-width:44px`. Změní to vzhled proti návrhu → přidat referenční patch se zdůvodněním (DoD §4).
4. **contrast, Domů:** `a.btn.btn-glass` „+420 773 287 1113“ na panelu Jade: bílá na `rgba(255,255,255,.12)` nad
   `#0F766E` = 4,33:1 (< 4,5). Oprava: průhlednost skla ≤ .08, nebo tmavší `--jade-ink` pod tlačítkem.
