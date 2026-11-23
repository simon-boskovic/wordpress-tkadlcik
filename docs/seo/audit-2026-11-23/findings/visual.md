# Visual and mobile audit: radostvpohybu.cz (production, 2026-11-23)

Method: Playwright Chromium, no TLS errors. Desktop 1440x900, mobile 390x844 (touch). Pages: /, /kurzy-a-lekce/, /seminar-vincent-chu/, /kontakt/, /o-mne/.
Screenshots: `docs/seo/audit-2026-11-23/screenshots/<slug>-desktop.png` and `<slug>-mobile.png`. The first-visit banner is in `home-desktop-banner.png` and `home-mobile-banner.png`.

## Score: 88/100

## What works
- H1 is visible without scrolling on all 5 pages. Desktop: top 136 px. Mobile: 518-581 px, just under the 50svh picture.
- Primary CTA is visible on mobile and desktop. "Napište mi" is in the header on every page. The hero button is visible on / ("Nabídka kurzů a lekcí", about 796 px on mobile), on the seminar page ("Přihlásit se") and on the kurzy page (link row).
- No horizontal overflow: scrollWidth equals 390 on every page and no element extends past the viewport.
- Readable text: the smallest paragraph/list font is 15 px, body copy is about 20 px on mobile, and contrast on the dark ground is high.
- The split-stage layout renders cleanly with no overlaps. The picture credit and the zoom button are tidy. The mobile header has a visible "Napište mi" pill and a hamburger.
- The cookie banner is well built. It is a card with equal Přijmout and Odmítnout pills (350x367 on mobile, 526x302 on desktop) and does not hide the CTA. After a dismiss it does not return.

## Findings

### 1. Inline text links are small tap targets (Low)
- Evidence: /seminar-vincent-chu/ (390 and 1440): phone link 127x22 and e-mail link 171x22. /o-mne/: links "rodinnému stylu Yang" 177x22, "Osmi kusů brokátu" 153x22 and "13 slov tchaj-ťi" 118x22. All pages, footer: "Gin Soon Tai Chi Chuan Fe…" 280x22. /kontakt/: privacy-policy link in the form 290x41 on mobile.
- Why: below 44-48 px height (WCAG 2.5.8 minimum is 24 px, so this passes AA).
- Fix: on phones, give the phone and e-mail links `display:inline-block; padding-block:.6em` (or `min-height:44px`) and add spacing between footer links. This matters most for the phone number, a key conversion link.

### 2. Hamburger button is 38x44 on mobile (Low)
- Evidence: all pages at 390 ("Otevřít menu").
- Fix: `min-width:44px` (48 px recommended) on the toggle.

### 3. Consent checkbox on the form is 32x56 (Info)
- Evidence: /kontakt/ at 390 and 1440. The checkbox is probably visually smaller than its label hit area. Verify the label is clickable.
- Fix: none needed if the label wraps the checkbox.

### 4. "Domů" and "Akce" links measure 40x44 and 31x44 (Info)
- Evidence: every page, both viewports. These sit in the menu overlay or nav, probably a hidden duplicate. The visible nav was not affected in the screenshots.
- Fix: none, or `min-width:44px` on the nav links.

### 5. Desktop hero leaves a large empty area on the right column (Info)
- Evidence: / and /kontakt/ at 1440x900. On / the big "radost v pohybu" wordmark fills the space under the CTAs. On /kontakt/ the contact data is sparse ("Napište mi" starts at about 740 px, the form is below the fold). The "Telefon" and "E-mail" labels are pushed far right and visually detached from their values.
- Fix: optional. Put the label above or beside its value, and consider a tap-to-call button on mobile.

### 6. Fold edge on mobile (Info)
- Evidence: / at 390x844. The hero CTA sits at the very bottom of the fold (about 796-844 px). On /kurzy-a-lekce/ only a text-link row ("Praha 4", "Nový kurz", "Neděle", "Ceny lekcí") is visible, with no filled button above the fold. The header "Napište mi" is the only filled CTA there.
- Fix: optional. Shorten the mobile picture to about 40svh, or lead with one filled button on kurzy-a-lekce.

## Not an issue
- Mojibake in the console output was a Windows terminal encoding artefact of my script. The rendered pages show correct Czech glyphs.
