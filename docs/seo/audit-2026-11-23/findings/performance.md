# Performance and Core Web Vitals audit: https://radostvpohybu.cz/ (production, 2026-11-23)

## Method and data provenance
- **All numbers below are LAB values** (Lighthouse 12.8.2, local CLI, Chrome headless, default mobile profile = Moto G Power, simulated slow 4G with 4x CPU slowdown; desktop preset = no meaningful throttling). Single run per page/device, so expect a few hundred ms of noise.
- **No field data (CrUX) was obtained.** No CrUX credentials are configured, and the keyless PageSpeed Insights API returned HTTP 429 (daily quota exhausted). The plugin script `pagespeed_check.py` also failed with `CERTIFICATE_VERIFY_FAILED`, which is the Avast TLS interception on this PC and not a site fault. INP cannot be measured in the lab; TBT is only a proxy.
- TTFB: Lighthouse root document 60 ms (desktop run); real `curl` from this PC: TTFB 183 ms, 29 KB brotli document.

## Score: 96 / 100
Lighthouse performance 98-100 on all six runs, CLS 0, TBT 0-10 ms, no render-blocking resources, no third-party weight before consent. Points deducted for borderline mobile LCP (2.2-2.4 s vs the 2.5 s limit), missing image cache headers and one oversized flyer image.

## Measured values (lab)
| Page | Device | Perf | FCP | LCP | TBT | CLS | Speed Index | Transfer | DOM |
|---|---|---|---|---|---|---|---|---|---|
| / | mobile | 98 | 1.1 s | 2.3 s | 0 ms | 0 | 2.6 s | 256 KiB | 405 |
| / | desktop | 100 | 0.3 s | 0.5 s | 0 ms | 0 | 0.5 s | 341 KiB | 405 |
| /kurzy-a-lekce/ | mobile | 99 | 1.0 s | 2.2 s | 10 ms | 0 | 1.4 s | 243 KiB | 333 |
| /kurzy-a-lekce/ | desktop | 100 | 0.3 s | 0.5 s | 0 ms | 0 | 0.4 s | 339 KiB | 333 |
| /seminar-vincent-chu/ | mobile | 98 | 1.0 s | 2.4 s | 10 ms | 0 | 1.5 s | 536 KiB | 344 |
| /seminar-vincent-chu/ | desktop | 100 | 0.3 s | 0.5 s | 0 ms | 0 | 0.4 s | 678 KiB | 344 |

Core Web Vitals status (lab): LCP pass (mobile borderline), CLS pass (0 everywhere), INP not measurable in the lab (TBT 0-10 ms and ~400 DOM nodes make a good INP very likely). Field status: unknown.

LCP elements: home = hero ink painting `tk-ink-hory` (768 px WebP, 59 KB); kurzy = `tk-peking-1988` (61 KB); seminar = `tk-ink-weiqi` (97 KB). All are preloaded with `fetchpriority=high`, discoverable in HTML, not lazy (Lighthouse `lcp-discovery` passes).

## What works
- Cached HTML: `X-TK-Cache: HIT-PHP`, brotli 27-29 KB, ETag revalidation, HTTP/3 advertised.
- Zero render-blocking resources: CSS subset inlined, JS inline or deferred.
- Fonts: self-hosted Fira Sans woff2 (400/500, latin + latin-ext), 4 files preloaded with crossorigin, `font-display` passes, no CLS.
- Images: all hero images WebP with responsive srcset, preload `imagesrcset`, width/height set, CLS 0.
- Third parties: Google tag (`GT-KTPSBZBH`) is `type=text/plain` until statistics consent, so no Google requests on first load; YouTube and map are click-to-load facades. Lighthouse saw no third-party requests.
- Small DOM (333-405 elements), no unused JS/CSS flagged, no redirects.

## Findings

### 1. Mobile LCP is close to the 2.5 s limit (Medium)
- Evidence: lab mobile LCP 2.3 s (home), 2.2 s (kurzy), 2.4 s (seminar) under simulated slow 4G. Home breakdown: TTFB 659 ms (throttled), render delay 1.6 s (71%). Real users on faster links are normally quicker, but a small regression would tip it over.
- Possible cause (inference, not proven): the stage picture is hidden by default and fades in (`.stage-fig{opacity:0; transition:opacity 900ms}`, plus a 2400 ms `tk-settle` animation, `site.css` lines 123-124, 317). On phones the first figure is forced visible, but `stage.js` setting `data-active` may still delay paint.
- Fix: render the first stage figure at `opacity:1` with no transition in the server HTML (`data-active` and `data-stage-first` in markup, not set by JS). Confirm the Complianz banner is not the LCP candidate. Re-measure, then check field data.

### 2. Uploads (images) carry no Cache-Control or Expires header (Medium)
- Evidence: `curl -I` on `/wp-content/uploads/tk-ink-hory-768x1421.webp` and `letak-gu-yang-tzu.jpg` returns only ETag and Content-Length. Lighthouse cache insight: 0 ms lifetime, 76-87 KiB re-downloaded per repeat visit (370 KiB on the seminar page). Fonts do have `max-age=604800`.
- Fix: add a server rule for `webp|jpg|jpeg|png|avif|svg` with `Cache-Control: public, max-age=2592000` (the repo intends 30 days for images and one year for css/js/woff2; production does not apply it to uploads). Raise fonts from 7 days to 1 year (`immutable`; they are versioned with `?ver=`).

### 3. Seminar flyer image is oversized and not WebP (Medium)
- Evidence: `/seminar-vincent-chu/` loads `letak-gu-yang-tzu.jpg`, 257 KB JPEG (1055x1490) shown at 372x525 CSS px; Lighthouse estimates 279 KiB savings (resize plus 75 KiB format). It makes the page 536 KiB on mobile vs ~250 KiB elsewhere. Not the LCP element, but it competes for bandwidth.
- Fix: convert to WebP/AVIF, add srcset (about 480/768 px) and `loading=lazy` + `decoding=async`; keep the original JPG only as the download file.

### 4. Hero images slightly larger than needed (Low)
- Evidence: home hero 59 KB for a 404x747 CSS box (about 31 KiB savings flagged); kurzy hero about 34 KiB via stronger compression. The images are rendered greyscale by CSS filter.
- Fix: re-encode at quality about 70 or AVIF; grayscale-encoded files would be smaller still.

### 5. Fonts: 140 KB preloaded on every page (Low)
- Evidence: latin 400/500 (24 KB each) plus latin-ext 400/500 (46 KB each) are all preloaded, more than half of the mobile transfer (243-256 KiB). Czech needs the ext glyphs (ě, š, č, ř, ž, ů), so they are really used.
- Fix: subset Fira Sans to Czech plus basic Latin only (one file per weight, roughly 30 KB each), or use a variable font; preload only those.

### 6. HSTS max-age is only 300 s (Low, security rather than speed)
- Evidence: `strict-transport-security: max-age=300`. Fix: raise gradually to 31536000 once stable (hand to the security agent).

### 7. Consent banner and tags (Info)
- The Complianz banner shows on the first visit (Lighthouse measures a first visit): CLS 0, TBT 0-10 ms, no measurable cost. Only `complianz.min.js` and Site Kit's deferred events script load extra. The post-consent cost of the Google tag was not measured.

## Priority list
1. Add Cache-Control to uploads, longer for fonts (Medium, minutes of work).
2. Convert and resize the seminar flyer (Medium, about -230 KB on that page).
3. Remove the fade/animation from the first stage picture in server HTML to protect mobile LCP (Medium).
4. Font subsetting and hero re-encoding (Low).
5. Obtain field data: run PSI from a network without TLS interception or add a CrUX API key; check Search Console's Core Web Vitals report (the site may be below the CrUX traffic threshold).
