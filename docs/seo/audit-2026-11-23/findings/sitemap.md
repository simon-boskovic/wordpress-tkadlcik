# Sitemap audit - https://radostvpohybu.cz/ (2026-11-23)

**Score: 93/100**

## What works
- `/sitemap.xml` returns 200, `text/xml`, valid urlset (1.6 KB, 11 URLs), no priority/changefreq, no XSLT (intentional). The SEO Framework serves one flat sitemap, no sub-sitemaps, so there is nothing else to check.
- Coverage is exactly the 11 indexable pages. Privacy page and `/cviceni-ve-zline/` are absent.
- All 11 listed URLs return 200 directly (no redirects) and have no noindex meta tag.
- `robots.txt` declares `Sitemap: https://radostvpohybu.cz/sitemap.xml` and allows crawling.
- `/sitemap_index.xml` 301s to `/sitemap.xml`. `/wp-sitemap.xml` is 404, so there is no duplicate core sitemap.
- Checked: `/cviceni-ve-zline/` 301 to `/kurzy-a-lekce/`. `/zasady-ochrany-osobnich-udaju/` is noindex and not listed.
- Canonical host/scheme (https, no www) is used in every `<loc>`.

## Findings

### 1. Low - all lastmod values are identical
Evidence: all 11 URLs have `<lastmod>2026-11-23T18:18:26+00:00</lastmod>`. This looks like a rebuild/deploy that re-saved every page today. Format is valid W3C Datetime.
Impact: Google ignores lastmod when it does not track real changes. No harm, just no signal.
Fix: let lastmod follow real content edits. Avoid mass re-saves on deploy. `page-upsert` already skips unchanged pages, so check that the deploy or `seo-setup` is not touching post_modified.

### 2. Info - `X-Robots-Tag: noindex` on sitemap.xml and robots.txt
Standard TSF behaviour, keeps the files out of search results. It does not stop sitemap processing. No action.

### 3. Info - HSTS max-age is only 300
Not a sitemap issue, noted for the security reviewer. Raise it after go-live is stable.

### 4. Info - the sitemap is served from cache
The footer comment says "Sitemap se zobrazuje z mezipameti". The cached copy was generated 2026-11-23 18:18:45 GMT, after the Zlin page was removed. It is current.

No TLS or tool issues occurred: all checks were done with curl.
