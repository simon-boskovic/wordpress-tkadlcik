# Technical SEO findings - https://radostvpohybu.cz/ (2026-11-23)

Method: curl only (headers, HTML source). No Lighthouse or rendering run. Avast TLS interception did not affect curl.

**Category score: 90/100**

## What works
- HTTPS everywhere. `http://` and `https://www.` both 301 to `https://radostvpohybu.cz/` in a single hop.
- Redirects are clean. `/CVICENI/` and `/cviceni` 301 to `/cviceni/`. `/cviceni-ve-zline/` 301s to `/kurzy-a-lekce/`. `/home/` 301s. `/prazdna-stranka/` returns 410. A missing URL returns a real 404 (`/nesmysl/`).
- robots.txt is valid and declares `Sitemap: https://radostvpohybu.cz/sitemap.xml`. AI crawlers are explicitly allowed. `/wp-admin/` and `/?s=` are blocked, and admin-ajax is allowed.
- The sitemap has 11 URLs, all indexable and all on the canonical host. The noindex privacy page is correctly excluded.
- Every page has a self-referencing canonical, a `lang="cs"` html tag, a viewport meta, a unique title and description, and og:url/og:image.
- Privacy page: `<meta robots noindex>` is present.
- Internal search `/?s=a` sends `X-Robots-Tag: noindex` plus a meta noindex.
- Security headers: HSTS, nosniff, Referrer-Policy, X-Frame-Options SAMEORIGIN, Permissions-Policy.
- Hardening: `/wp-json/wp/v2/users` is 404 and `xmlrpc.php` is 403.
- Performance: the static page cache returns `X-TK-Cache: HIT-PHP`, gzip is on, and TTFB is about 150 ms with 31 KB transferred for the home page. Fonts are self-hosted and preloaded. The LCP image is preloaded with `fetchpriority=high` and srcset.
- Structured data on the home page is rich and server-rendered: SportsOrganization, SportsActivityLocation, Person, WebSite, WebPage.
- Rendering is full SSR HTML; no JS is required for content. `llms.txt` is present.

## Findings

### 1. Low - No Content-Security-Policy header
- Evidence: `curl -sI https://radostvpohybu.cz/` shows no `content-security-policy`.
- Impact: hardening only, no ranking effect.
- Recommendation: add a report-only CSP first. Allow self, plus Google Tag/Analytics after consent, YouTube-nocookie and the Google Maps iframe.

### 2. Low - `/favicon.ico` is not a clean redirect or icon
- Evidence: `curl -sI https://radostvpohybu.cz/favicon.ico` returned `Content-Type: text/html; charset=UTF-8`. The repo's mu-plugin intends a 301 to the site icon. Bots that probe `/favicon.ico` may get HTML. I did not follow the response to confirm the final target.
- Recommendation: confirm `/favicon.ico` 301s to `/wp-content/uploads/site-icon-32x32.png` (or serves a real .ico) and returns an image content type.

### 3. Low - `/.well-known/security.txt` returns 404
- Evidence: HTTP 404, although CLAUDE.md lists it as implemented.
- Recommendation: check the `tk-redirects.php` route on the production nginx/LiteSpeed. Add the file, or ignore it if it is not wanted.

### 4. Info - Wide Cache-Control and Server variation
- `/wp-login.php` returns 200 with no noindex header. It is not linked from the site, so there is low risk.
- Recommendation: optionally send `X-Robots-Tag: noindex` for `wp-login.php`.

### 5. Info - HSTS max-age=300
- Deliberate and temporary. Raise to at least 31536000 once stable (consider includeSubDomains and preload only after that).

### 6. Info - Sitemap lastmod identical for all URLs
- Every `<lastmod>` is `2026-11-23T18:18:26+00:00` (the deploy time). Google may discount lastmod when it does not reflect real per-page changes.
- Recommendation: acceptable now. Consider using the real content-change date per page later.

### 7. Info - robots.txt AI-bot block
- The `Allow: /` group for AI bots repeats the `Disallow` lines. Correct, because a specific group overrides `*`.
