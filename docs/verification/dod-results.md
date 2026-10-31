# Definition of Done — doklady o testování (Radost v pohybu)

Vygenerováno `node build/dod-evidence.mjs` dne 2026-10-31T15:52:56.108Z pro běh harness `node build/dod.mjs`: **2026-10-31T15:28:15.046Z#46658**.
Zdroj dat: `build/shots/dod/` (7 stránek). Co a jak se kontroluje: [docs/definition-of-done.md](../definition-of-done.md) (§2 Vzhled, §4 Kvalita a přístupnost, §8 Ověření a předání).

## Co bylo ověřeno

- **Zařízení** (DoD §8): mobil na výšku **M** (390×844), tablet na výšku **T** (820×1180) a na šířku **TL** (1180×820), desktop **D** (1440×900); mobil na šířku **ML** a velký monitor **XL** (1920×1080) jsou zaznamenány navíc, ale nejsou branou pro splnění (viz DoD §8 — vyžaduje mobil/tablet/desktop). Mobil a tablet emulují dotyk.
- **Vizuální shoda**: rozdíl proti schválenému designu (Claude Design prototyp) nejvýš **1 %** odlišných pixelů na M/T/TL/D.
- **Lighthouse** (mobil i desktop): Accessibility **100**, Best Practices **≥ 95**, SEO **100**, Performance (mobil) **≥ 90**; Core Web Vitals LCP **≤ 2,5 s**, CLS **< 0,05**.
- Dále konzole bez chyb/varování, overflow, omezený pohyb, animace, hover jen myší, stisk tlačítek, klávesnice, dotykové cíle, SEO, kontrast, obrázky, no-JS, přechody bez bílého záblesku, cross-browser smoke (viz sloupce tabulky níže — plný popis každé kontroly v `docs/definition-of-done.md` a `build/lib/dod/checks/*.mjs`).

**Známé SKIP body** (nejsou selhání tohoto webu, jsou to omezení prostředí):
- **crossbrowser SKIP** uvnitř sandboxu Claude Code: Playwright Firefox se v sandboxu nespustí; spouští se z běžného terminálu (`node build/dod.mjs --checks=crossbrowser`).

Legenda tabulky: ✓ PASS · ✗ FAIL · – N/A · B BLOCKED (externí) · s SKIP · **·** = výsledek pochází z jiného běhu harness (ignorován jako neaktuální, viz "poslední běh" výše). Prázdné pole = kontrola pro tuto stránku vůbec neproběhla.

Screenshoty: `docs/verification/screenshots/<stránka>-<zařízení>.jpg`, referenční design a lokální web vedle sebe (bez rozdílového panelu), JPEG q≈32, šířka do ~1200px (výška omezena na 6000px u velmi dlouhých stránek). Počet souborů: **28**, celková velikost: **4.5 MB**.

## Stránky × kontroly (poslední běh)

| Stránka | visual | console | overflow | reduced-motion | animations | hover | press | keyboard | targets | seo | contrast | images | nojs | flash | crossbrowser | lighthouse |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [akce](#akce) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| [clanky](#clanky) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| [cviceni](#cviceni) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| [domu](#domu) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | s | ✗ |
| [kontakt](#kontakt) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| [kurzy-a-lekce](#kurzy-a-lekce) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| [o-mne](#o-mne) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | s | ✗ |
| **stránek se selháním** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **7** | **0** | **1** | **0** | **0** | **0** | **0** | **7** |

## Vizuální rozdíl podle zařízení

| Stránka | M | T | TL | D | ML (zaznamenáno) | XL (zaznamenáno) |
|---|---|---|---|---|---|---|
| akce | 0.04% | 0.02% | 0.02% | 0.01% | 0.02% | 0.01% |
| clanky | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |
| cviceni | 0.01% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |
| domu | 0.03% | 0.01% | 0.01% | 0.01% | 0.01% | 0.01% |
| kontakt | 0.07% | 0.03% | 0.03% | 0.03% | 0.03% | 0.02% |
| kurzy-a-lekce | 0.04% | 0.02% | 0.02% | 0.02% | 0.02% | 0.01% |
| o-mne | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |

## Lighthouse (mobil + desktop)

| Stránka | Forma | A11y | BP | SEO | Perf | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| akce | mobile | 96 | 100 | 100 | 100 | 1654 ms | 0.000 | 0 ms |
| akce | desktop | 95 | 100 | 100 | 100 | 404 ms | 0.000 | 0 ms |
| clanky | mobile | 95 | 100 | 100 | 100 | 1503 ms | 0.000 | 0 ms |
| clanky | desktop | 94 | 100 | 100 | 100 | 365 ms | 0.000 | 0 ms |
| cviceni | mobile | 96 | 100 | 100 | 100 | 1504 ms | 0.000 | 0 ms |
| cviceni | desktop | 95 | 100 | 100 | 100 | 364 ms | 0.000 | 0 ms |
| domu | mobile | 95 | 100 | 100 | 100 | 1504 ms | 0.000 | 0 ms |
| domu | desktop | 95 | 100 | 100 | 100 | 364 ms | 0.000 | 0 ms |
| kontakt | mobile | 95 | 100 | 100 | 100 | 1503 ms | 0.000 | 0 ms |
| kontakt | desktop | 95 | 100 | 100 | 100 | 324 ms | 0.000 | 0 ms |
| kurzy-a-lekce | mobile | 96 | 100 | 100 | 100 | 1504 ms | 0.000 | 0 ms |
| kurzy-a-lekce | desktop | 96 | 100 | 100 | 100 | 364 ms | 0.000 | 0 ms |
| o-mne | mobile | 95 | 100 | 100 | 100 | 1504 ms | 0.000 | 0 ms |
| o-mne | desktop | 95 | 100 | 100 | 100 | 364 ms | 0.000 | 0 ms |

## Screenshoty a selhání podle stránky

### akce

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/akce-M.jpg) · [tablet 820×1180](screenshots/akce-T.jpg) · [tablet na šířku 1180×820](screenshots/akce-TL.jpg) · [desktop 1440×900](screenshots/akce-D.jpg)

- **targets** FAIL: M: local 9 (ref 9) · T: local 8 (ref 8)
- **lighthouse** FAIL: mobile accessibility 96 < 100: color-contrast (+1 more) | mobile: A11y 96 · SEO 100 · BP 100 · Perf 100 · LCP 1654 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 404 ms · CLS 0.000 · TBT 0 ms

### clanky

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/clanky-M.jpg) · [tablet 820×1180](screenshots/clanky-T.jpg) · [tablet na šířku 1180×820](screenshots/clanky-TL.jpg) · [desktop 1440×900](screenshots/clanky-D.jpg)

- **targets** FAIL: M: local 9 (ref 9) · T: local 8 (ref 8)
- **lighthouse** FAIL: mobile accessibility 95 < 100: color-contrast (+1 more) | mobile: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 1503 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 94 · SEO 100 · BP 100 · Perf 100 · LCP 365 ms · CLS 0.000 · TBT 0 ms

### cviceni

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/cviceni-M.jpg) · [tablet 820×1180](screenshots/cviceni-T.jpg) · [tablet na šířku 1180×820](screenshots/cviceni-TL.jpg) · [desktop 1440×900](screenshots/cviceni-D.jpg)

- **targets** FAIL: M: local 9 (ref 9) · T: local 8 (ref 8)
- **lighthouse** FAIL: mobile accessibility 96 < 100: color-contrast (+1 more) | mobile: A11y 96 · SEO 100 · BP 100 · Perf 100 · LCP 1504 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 364 ms · CLS 0.000 · TBT 0 ms

### domu

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/domu-M.jpg) · [tablet 820×1180](screenshots/domu-T.jpg) · [tablet na šířku 1180×820](screenshots/domu-TL.jpg) · [desktop 1440×900](screenshots/domu-D.jpg)

- **targets** FAIL: M: local 9 (ref 9) · T: local 8 (ref 8)
- **contrast** FAIL: 1 text element(s) below 4.5:1, e.g. a.btn “+420 773 287 1113” 4.33:1 (rgb(255,255,255) on rgb(44,134,127))
- **lighthouse** FAIL: mobile accessibility 95 < 100: color-contrast (+1 more) | mobile: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 1504 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 364 ms · CLS 0.000 · TBT 0 ms

### kontakt

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/kontakt-M.jpg) · [tablet 820×1180](screenshots/kontakt-T.jpg) · [tablet na šířku 1180×820](screenshots/kontakt-TL.jpg) · [desktop 1440×900](screenshots/kontakt-D.jpg)

- **targets** FAIL: M: local 11 (ref 11) · T: local 10 (ref 10)
- **lighthouse** FAIL: mobile accessibility 95 < 100: color-contrast (+1 more) | mobile: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 1503 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 324 ms · CLS 0.000 · TBT 0 ms

### kurzy-a-lekce

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/kurzy-a-lekce-M.jpg) · [tablet 820×1180](screenshots/kurzy-a-lekce-T.jpg) · [tablet na šířku 1180×820](screenshots/kurzy-a-lekce-TL.jpg) · [desktop 1440×900](screenshots/kurzy-a-lekce-D.jpg)

- **targets** FAIL: M: local 12 (ref 12) · T: local 11 (ref 11)
- **lighthouse** FAIL: mobile accessibility 96 < 100: color-contrast (+1 more) | mobile: A11y 96 · SEO 100 · BP 100 · Perf 100 · LCP 1504 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 96 · SEO 100 · BP 100 · Perf 100 · LCP 364 ms · CLS 0.000 · TBT 0 ms

### o-mne

Screenshoty (referenční design | lokální web): [mobil 390×844](screenshots/o-mne-M.jpg) · [tablet 820×1180](screenshots/o-mne-T.jpg) · [tablet na šířku 1180×820](screenshots/o-mne-TL.jpg) · [desktop 1440×900](screenshots/o-mne-D.jpg)

- **targets** FAIL: M: local 9 (ref 9) · T: local 8 (ref 8)
- **lighthouse** FAIL: mobile accessibility 95 < 100: color-contrast (+1 more) | mobile: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 1504 ms · CLS 0.000 · TBT 0 ms | desktop: A11y 95 · SEO 100 · BP 100 · Perf 100 · LCP 364 ms · CLS 0.000 · TBT 0 ms

