# Go-live requirements: server settings the site depends on

The local Docker stack reproduces these settings (`docker-compose.yaml`, configs `apache-compress` and
`apache-cache`, plus the page cache of items 10–17). The production host must provide the same, or the
performance measured locally will not hold. Check every item on the production domain before launch.
`<domain>` below is the production domain.

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 1 | **HTTP compression** of text responses: brotli preferred, gzip at least, for `text/html`, `text/css`, `text/javascript` / `application/javascript`, `application/json`, `application/ld+json`, `application/xml`, `image/svg+xml`. | Pages and CSS shrink 5–8×; uncompressed, mobile LCP roughly doubles. | `mods-available/deflate.conf` replaced: mod_brotli (quality 6) registered before mod_deflate. | `curl -sI -H 'Accept-Encoding: br, gzip' https://<domain>/ \| grep -i content-encoding` → `br` or `gzip`. |
| 2 | **Long browser caching of static files**: `Cache-Control: public, max-age=31536000` for `.css`, `.js`, `.woff2` (theme/plugin URLs are versioned with `?ver=`); about 30 days for images. | Repeat views come from the browser cache. | mod_expires + mod_headers (`conf-enabled/zz-tk-cache.conf`). | `curl -sI https://<domain>/wp-content/themes/tkadlcik/style.css \| grep -i cache-control`. |
| 3 | **HTML caching headers come from the page cache, not from the server config.** Cached pages: `public, max-age=0, must-revalidate` + `ETag`/`Last-Modified`. Everything WordPress renders: `private` (or WordPress's `no-store`). The host must not add `Expires`/`Cache-Control` to `text/html`. | A deploy must be visible at once; an edge proxy must not keep a stale page. | `wp-content/cache/tk-page/.htaccess`, `tk-page-cache/cache.php`. | `curl -sI https://<domain>/ \| grep -i 'cache-control\|x-tk-cache'`. |
| 4 | **Correct MIME types**: `font/woff2`, `image/webp`, `image/avif`, `text/css`, `text/javascript`/`application/javascript`. | Font preloads with `type="font/woff2"` are unusable with a wrong type. | Debian Apache defaults. | `curl -sI <font URL> \| grep -i content-type`. |
| 5 | **HTTPS with HTTP/2 (or HTTP/3)**. | Multiplexed fonts/images/scripts. | none (local is plain HTTP/1.1). | `curl -sI --http2 https://<domain>/ \| head -1` → `HTTP/2 200`. |
| 6 | **TTFB ≤ about 200 ms** for HTML. | Directly eats into the 2.5 s LCP budget. | Page cache: ~3 ms HIT locally vs. tens of ms for a WordPress render. | `curl -so /dev/null -w '%{time_starttransfer}\n' https://<domain>/` with `X-TK-Cache: HIT`; compare with `-H 'Cookie: tk_nocache=1'`. |
| 7 | **Elementor settings** as written by `wp tk kit-setup`: the active kit is ours (meta `_tk_kit`), *Optimized Image Loading* off, *Lazy Load Background Images* off, Google Fonts off, Font Awesome shim off, element cache off, CSS print method `external`, experiment `e_optimized_markup` active. | The pages carry explicit loading/fetchpriority hints; Elementor's buffer and background lazy-load would fight them. | `wp tk kit-setup`. | `wp tk doctor` → kit "ours (exact settings)", print method `external`, optimized markup active. |
| 8 | **No optimisation/caching plugin that rewrites the front end** (minify, combine, defer, lazy-load) **and no second page cache.** If the host preinstalls LiteSpeed Cache (or similar), deactivate and delete it and its `.htaccess` blocks. | Double caching hides deploys; front-end rewriting breaks the theme's script timing. | none installed. | `wp plugin list --status=active`. |
| 9 | **`WP_ENVIRONMENT_TYPE` is not `local`** on production. Outgoing WordPress mail (password resets, admin notices) uses authenticated SMTP with SPF/DKIM on the domain. | `tk-local.php` activates only for `local`: it routes every mail to the local Mailpit host. | `local` (docker-compose). | `wp eval 'echo wp_get_environment_type();'` → `production`. |

## Page cache (`mu-plugins/tk-page-cache/`)

Every published page and post is stored as static HTML (+ a gzip copy, + brotli with ext-brotli) in
`wp-content/cache/tk-page/` and answered by Apache straight from disk, without starting PHP (set up by
`wp tk cache-setup`). Saving content in wp-admin purges the cache and re-warms it via WP-Cron; every deploy
ends with purge + warm.

| Path | When | `X-TK-Cache` |
|---|---|---|
| `.htaccess` rewrite rule → static file | anonymous `GET`/`HEAD`, host = the home URL's, no login/post-password/comment/`tk_nocache` cookie, no query string, a cached file exists | `HIT` |
| PHP drop-in `wp-content/advanced-cache.php` → static file | the same when the rewrite rules are not active; also URLs with only tracking parameters (`utm_*`, `fbclid`, `gclid`, …) | `HIT-PHP` |
| WordPress renders and stores the file | the first anonymous view after a purge (or `wp tk cache-warm`) of a published page/post answering 200 `text/html` without `Set-Cookie` | `MISS` / `STORED` |
| WordPress renders, nothing stored | logged in, `POST`, `wp-admin`, login, REST, search, feeds, sitemap, `robots.txt`, any other query string, 404, redirects, pagination aliases | `BYPASS (<reason>)` or none |

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 10 | **`.htaccess` with `mod_rewrite`** (`AllowOverride FileInfo` at least). `wp tk cache-setup` writes `# BEGIN TK Page Cache` … `# END TK Page Cache` right before WordPress's block. | The fastest path: no PHP, no database. | Official `wordpress:*-apache` image. | `curl -sI https://<domain>/ \| grep -i x-tk-cache` → `HIT`. `HIT-PHP` means the rules are ignored (item 12 carries the site). |
| 11 | **`mod_mime`, `mod_headers`, `mod_setenvif`, `mod_rewrite` directives honoured in `wp-content/cache/tk-page/.htaccess`.** | The `.gz` is sent with `Content-Encoding: gzip`, `Content-Type: text/html`, `Vary`, `Cache-Control`, `X-TK-Cache`; direct `/wp-content/cache/…` requests are 404. | Apache defaults. | `curl -sI -H 'Accept-Encoding: gzip' https://<domain>/` → `Content-Encoding: gzip`, `X-TK-Cache: HIT`; `curl -sI https://<domain>/wp-content/cache/tk-page/index.html` → 404. |
| 12 | **`define( 'WP_CACHE', true );` in `wp-config.php`.** | Loads the drop-in (fallback + tracking-parameter URLs). | `WORDPRESS_CONFIG_EXTRA`. | `wp tk cache-status` → `WP_CACHE true`, `Drop-in ours, current`; `curl -sI 'https://<domain>/?utm_source=x'` → `HIT-PHP`. |
| 13 | **`wp-content/cache/` writable by PHP** (dirs 755, files 644). The root `.htaccess` writable once for `wp tk cache-setup` / `headers-setup` (else paste `--print-htaccess`). | WordPress writes the files itself (temp file + rename). | Volume owned by `www-data`. | `wp tk cache-status` → `Cache dir … (writable)`. |
| 14 | **After every deploy or migration: set up, purge, warm**: `wp tk cache-setup && wp tk cache-purge && wp tk cache-warm`, or wp-admin *Nástroje → Stránková cache → Smazat a znovu naplnit cache*. `cache-setup` must run on the production host itself (absolute cache path, host). | A copied cache carries the old host/salts; the stamp check would purge it anyway on the first request. | `./build/rebuild.sh`, `./db-import.sh`. | `wp tk cache-warm` → `HIT ×N`. |
| 14a | **Brotli for the cached pages: PHP `ext-brotli` on the web PHP** (recommended, not a blocker). With it the cache also writes `index.html.br` (quality 11), which the rules serve to every `br` client. | Measured 2026-10-31 (home / O mně / Cvičení): gzip −9 25.2 / 23.6 / 27.1 kB → brotli q11 21.6 / 20.4 / 23.2 kB (−14 %). Without it a browser (`gzip, deflate, br, zstd`) gets the precompressed `.gz`; Apache's on-the-fly brotli (q6, −6 %) is used only for br-only clients. Making the rules skip the `.gz` for br clients was measured and **not** done: mod_brotli adds `-br` to the ETag, so the `max-age=0, must-revalidate` revalidation of a cached page would never answer 304 again (`BrotliAlterETag` is server-config only), and the PHP drop-in cannot brotli at all. | Docker image has no ext-brotli (gzip copy only). | `wp eval 'var_dump( function_exists( "brotli_compress" ) );'` → `true`; after `wp tk cache-warm`: `ls wp-content/cache/tk-page/index.html.br`; `curl -sI -H 'Accept-Encoding: gzip, br' https://<domain>/ \| grep -i content-encoding` → `br`. |
| 15 | **Edge/proxy cache of the host** (if any): pages send `max-age=0` and WordPress responses `private`, so it should not keep HTML; purge it after a deploy anyway. | A stale edge copy would hide a deploy. | none. | Host's purge tool. |
| 16 | **OpenLiteSpeed / LiteSpeed** reads `.htaccess` rewrite rules but ignores `Header`/`AddType`/`AddEncoding` there: run `wp tk cache-setup --mode=php` (the drop-in sends every header itself). `cache-warm` detects this and fails with that advice. | Without the headers a `.gz` would go out without `Content-Encoding` (broken page). | n/a. | `wp tk cache-warm`. |
| 17 | **HTTPS and the canonical host enforced before the cache, and `is_ssl()` true for HTTPS** (`$_SERVER['HTTPS']` or the `X-Forwarded-Proto` snippet in `wp-config.php`). | The rules are keyed to the home URL's host; WordPress only stores a page whose request scheme matches the home option. | n/a. | `curl -sI http://<domain>/` → 301 to HTTPS. |

## Security headers

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 18 | **Security headers on every response, HSTS only over HTTPS.** `wp tk headers-setup` writes `# BEGIN TK Security Headers` (needs `mod_headers`, `AllowOverride FileInfo`): `Strict-Transport-Security: max-age=300` (raise to `31536000` with `define( 'TK_HSTS_MAX_AGE', 31536000 );` + `wp tk headers-setup` after a week without problems), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=()`, no `X-Powered-By`; `readme.html`/`license.txt`/`xmlrpc.php` 404. PHP sends the same headers (`tk-security-headers.php`, the drop-in). | Baseline hardening; a short initial HSTS limits the damage of an HTTPS mistake. | `wp tk headers-setup`. | `curl -sI https://<domain>/ \| grep -i 'strict-transport\|x-frame\|nosniff\|referrer\|permissions'`. |
| 19 | **No user enumeration**: `/wp-json/wp/v2/users` and `?author=N` are 404 for anonymous visitors (`tk-hardening.php`). | Login names stay private. | mu-plugin. | `curl -sI 'https://<domain>/?author=1' \| head -1` → 404. |
| 19a | **No XML-RPC, no pingbacks**: `/xmlrpc.php` answers 404 from the `.htaccess` block (before PHP); `tk-hardening.php` also turns XML-RPC off (`xmlrpc_enabled` false, no methods), closes pings and drops `X-Pingback`. If the host or a plugin needs XML-RPC (Jetpack, a mobile app), this must be revisited. | Brute force via `system.multicall`, pingback DDoS. | `wp tk headers-setup` + mu-plugin. | `curl -sI https://<domain>/xmlrpc.php \| head -1` → 404; `curl -sI https://<domain>/ \| grep -i x-pingback` → nothing. |
| 19b | **One URL per page and crawler file**: `//page/` (empty path segment) is never served from the page cache (the rules test the raw request line) and WordPress 301s it to `/page/`, query kept; `/sitemap_index.xml`, `/sitemap.xml/`, `/SITEMAP.XML` 301 to `/sitemap.xml`; `sitemap.xsl`/`sitemap.css` send one `Cache-Control: public, max-age=3600`, an `Expires` and one `X-Robots-Tag: noindex, nofollow` (theme `inc/seo.php`; the explicit `Expires` keeps `mod_expires` from appending its one-year `max-age` for `text/css`). The host must not merge-slash-redirect or add its own `Cache-Control` to PHP responses. | Duplicate URLs, contradictory caching headers. | theme + `.htaccess` blocks. | `curl -sI 'https://<domain>//kontakt/' \| grep -i 'location\|x-tk-cache'` → `Location: …/kontakt/`, no `HIT`; `curl -sI https://<domain>/sitemap.css \| grep -ci cache-control` → 1. |

## Cookie consent and Google Analytics (port of martinadamus R45)

Complianz **7.5.5** (strict opt-in, EU) + Google Site Kit **1.188.0**, both pinned by `wp tk site-setup` and configured
by `wp tk consent-setup` (only the keys in `mu-plugins/tk-build/consent.php`; `--dry-run` prints the diff). Locally Site
Kit is installed but **never connected**: `tk-local.php` feeds Site Kit's own `googlesitekit_setup_gtag` action the fake
tag `GT-LOCALTEST`, so the markup Complianz blocks is exactly what production prints, and the harness intercepts every
Google request. Production needs the client's Google account.

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 21 | **Connect Site Kit to the client's Google account and GA4 property** (wp-admin → Site Kit → Set up, signed in as the client or with their Google account delegated; Analytics module only, no AdSense/Tag Manager). Do **not** switch on Site Kit's "Consent Mode" and do **not** update Complianz/Site Kit past the pinned versions without re-checking the blocker (Complianz's `integrations/statistics/google-analytics.php` + `class-cookie-blocker.php`). Then `wp tk consent-setup --dry-run` → 0 to change (connecting Site Kit must not re-enable Complianz's Site Kit integration; if it does, run `wp tk consent-setup`). Set the GA4 data retention (Admin → Data collection and modification → Data retention) to the value stated on the privacy page (the default is 2 months), and decide whether Google Signals stays off (recommended: off). | Without a connected property Site Kit prints no tag at all (the site works, no analytics). The pinned versions are the ones whose integration was verified. | `GT-LOCALTEST` (fake), every Google request intercepted (`node build/interact.mjs consent`). | Site Kit dashboard shows the property; GA4 Realtime shows your own visit **only after "Přijmout"**. |
| 22 | **Google Analytics loads only after consent to statistics.** Complianz strict opt-in, Complianz's own Site Kit integration **off** (Complianz → Integrace → Pluginy → Google Site Kit; it would whitelist the tag), statistics = Google Analytics, "Complianz adds the script" = No, **Consent Mode = No**, consent per service = No, cookie expiry 365 days, cookie policy = URL `/zasady-ochrany-osobnich-udaju/#cookies` (no Complianz-generated policy page). | Czech law (§ 89 odst. 3 zákona č. 127/2005 Sb.) and the GDPR require prior opt-in for analytics cookies; the privacy page states that GA loads only after consent. | `node build/interact.mjs consent`, `./wp.sh eval-file /project/build/test/consent-test.php`. | Fresh private window, DevTools open (Network filter `google`, Application → Cookies) **before** loading `https://<domain>/`: the banner shows, **no `_ga` and no request to googletagmanager.com / google-analytics.com**. `curl -s https://<domain>/ \| grep google_gtagjs-js` shows `<script type="text/plain" data-service="google-analytics" data-category="statistics" id="google_gtagjs-js" data-cmplz-src="https://www.googletagmanager.com/gtag/js?id=G-…"`. "Odmítnout" + reload: still nothing. Footer "Nastavení cookies" reopens the banner; "Přijmout": `gtag/js?id=…` loads and `_ga` appears; withdrawing (Nastavení cookies → Odmítnout) removes `_ga` and reloads. |
| 23 | **The page cache stores the blocked page and Complianz sets no cookie.** `tk_pc_nest_complianz_buffer()` nests Complianz's output buffer inside the capture (proven: without it the HIT HTML loaded googletagmanager directly); consent per service stays off (it would add `Set-Cookie` deletions); the `cmplz_*` cookies are not bypass cookies (the banner logic is client-side: one cached page serves every consent state). After connecting Site Kit (#21): `wp tk cache-purge && wp tk cache-warm`. | A HIT is served without PHP: whatever the file holds goes to every visitor. | `page-cache.int.mjs` (consent test), `interact.mjs consent`. | `curl -sI https://<domain>/` → `X-TK-Cache: HIT`, no `Set-Cookie`; the `curl … grep google_gtagjs-js` of #22 on the cached page shows `type="text/plain"`. |
| 24 | **Complianz's cookie path is `/`.** Complianz derives it from the home URL; with a port in the home URL (only locally) it is invalid, which `tk-local.php` corrects. Production's home URL has no port and no sub-directory. | Otherwise a choice made on `/kontakt/` would only apply there. | `tk-local.php` `cmplz_cookie_path`. | After "Odmítnout", DevTools → Cookies: every `cmplz_*` cookie has Path `/`. |

## Content blockers (client)

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 25 | **Go-live blocker: the contact phone is confirmed and no placeholder is visible.** The phone in `build/content.mjs` `contact` (header, footer, Kontakt, JSON-LD `telephone`, llms.txt) must be a real Czech number, `+420` + 9 digits — the design's `+420 773 287 1113` has 10 and awaits the client (`node build/generate.mjs` prints a WARNING while it does not match). No page may show a `[Foto]` placeholder (Akce) or a `[doplnit …]` placeholder (the privacy page: effective date, hosting, …). | A wrong phone number in the footer and the structured data of every page; placeholders read as an unfinished site. | `node build/verify.mjs --golive` (fails on each open item; the default run is unaffected). | `node build/verify.mjs --golive --base=https://<domain>` → passes. |

## Contact form (`mu-plugins/tk-form.php`)

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 27 | **`wp_mail` delivers through authenticated SMTP on the site's domain (SPF + DKIM + DMARC aligned)**, e.g. an SMTP plugin or the host's relay; the From address is on the domain (not `@centrum.cz`), the sender's address goes only into `Reply-To`. The recipient `TK_FORM_TO` (`tkadlcik@centrum.cz`) is confirmed by the client. Behind a proxy/CDN, filter `tk_form_client_ip` to the real client IP, or the throttle (5 messages / 10 min per IP) counts every visitor as one. | PHP `mail()` from shared hosting lands in spam or is rejected by Seznam/Centrum; a From on a foreign domain fails DMARC. Without the IP filter one visitor could block the form for everyone. | `tk-local.php` routes all mail to Mailpit (`http://localhost:8025`). | Send the form from `/kontakt/#formular`: the message arrives in the client's inbox (not spam), *Reply* goes to the sender; the sender gets the confirmation. Mail headers show `dkim=pass`, `spf=pass`, `dmarc=pass`. Six quick sends from one IP → the sixth is refused. |

## PHP and database

| # | Requirement | Why | Check on production |
|---|---|---|---|
| 20 | **PHP 8.2 or newer (web and CLI, the same version), MySQL 5.6+/MariaDB, WP-CLI over SSH** (else the wp-admin cache button and manual `.htaccess` paste). Webglobe (radostvpohybu.cz): PHP 8.2/8.4 selectable, MySQL 5.6.51, WebSSH, WP-CLI as `php8.2 /usr/local/bin/wp`. | The local stack is PHP 8.4 + MariaDB 10.11; keep code 8.2-compatible. Proven by the dress rehearsal on PHP 8.2.34 + MySQL 5.6.51 (`./build/rehearsal.sh`, 2026-11-01). | `wp --info`, `wp eval 'echo PHP_VERSION;'`. |

## Curated third-party CSS (theme `assets/css/subsets/`)

The pages print Elementor's frontend CSS inline. Only containers + HTML widgets are used, so the theme prints a
curated subset (`elementor-frontend.css`, ~6.6 kB instead of ~55 kB; Elementor's atomic-widget inline CSS: nothing)
made by `node build/css-subset.mjs` from the built pages. A subset is used only while its source file still has the
sha1 recorded in `manifest.json`, so an Elementor update simply prints the full file again (larger, never broken).

| # | Requirement | Why | Local stand-in | Check on production |
|---|---|---|---|---|
| 26 | **The same Elementor version as locally (4.3.5 on 2026-10-31) at go-live, and after any Elementor update or page change regenerate the subset locally** (`node build/css-subset.mjs`, commit, deploy). | Keeps ~48 kB raw / ~5 kB compressed off every page. | `./wp.sh eval-file /project/build/test/inline-assets-test.php` fails on a stale subset; `node build/css-subset.mjs --check` also fails when the pages need a rule the subset lacks. | `node build/css-subset.mjs --check --base=https://<domain>` → `ok` for every source. |

## Asset versioning

Every theme asset URL must carry `?ver=<file modification time>` so a changed file gets a new URL and the
year-long cache of item 2 never serves an old copy. When deploying by copying files, keep modification times
meaningful.
