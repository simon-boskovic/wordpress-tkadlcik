/**
 * Page cache rules — JS twin of wp-content/mu-plugins/tk-page-cache/lib.php.
 *
 * The cache check (build/lib/cache-check.mjs) uses it to predict, for any request, whether the site must
 * answer from the cache ("HIT" via the .htaccess rules, "HIT-PHP" via the drop-in) or bypass it. Keep
 * both in lockstep: build/test/cache-cases.json is run against this file (build/test/cache-rules.test.mjs)
 * and against the PHP (build/test/page-cache-test.php).
 *
 * PHP's strtolower()/strtoupper() and PCRE's /i (no /u) are ASCII-only, so are the helpers here.
 */

export const TRACKING_RE = /^(?:utm_[a-z0-9_]+|fbclid|gclid|gclsrc|gbraid|wbraid|dclid|msclkid|yclid|twclid|ttclid|igshid|li_fat_id|mc_cid|mc_eid|_ga|_gl|_hsenc|_hsmi|srsltid)$/;
export const BYPASS_COOKIE_RE = /(?:^|;)\s*(?:wordpress_logged_in_|wordpress_sec_|wp-postpass_|comment_author_|wordpress_no_cache=|tk_nocache=)/i;
export const PATH_RE = /^\/(?:(?!wp-|feed\/|embed\/|trackback\/|search\/)[a-z0-9-]+\/)*$/;
/**
 * Raw request line (Apache THE_REQUEST) of a path with an empty segment ("//kontakt/"): the .htaccess rules
 * never serve it (Apache merges slashes before RewriteRule); WordPress 301s it. Twin of TK_PC_RAW_DOUBLE_SLASH_RE.
 */
export const RAW_DOUBLE_SLASH_RE = /^\S+\s(?:https?:\/\/[^/?\s]*)?(?:\/[^/?\s]*)*\/\//i;
/** Request header that makes WordPress (re)write a cache file (twin of TK_PC_WARM_HEADER). */
export const WARM_HEADER = 'X-TK-Cache-Warm';
/** Never cached: first path segment -> bypass reason. Twin of TK_PC_NOCACHE_PATHS (lib.php). Empty for now. */
export const NOCACHE_PATHS = Object.freeze({});

const lowerAscii = (s) => String(s).replace(/[A-Z]+/g, (m) => m.toLowerCase());
const upperAscii = (s) => String(s).replace(/[a-z]+/g, (m) => m.toUpperCase());

/** The bypass reason of a never-cached path ('' = not one of them); same as tk_pc_nocache_reason(). */
export function nocacheReason(path) {
  const segment = lowerAscii(String(path).replace(/^\/+/, '').split('/')[0]);
  return Object.hasOwn(NOCACHE_PATHS, segment) ? NOCACHE_PATHS[segment] : '';
}

/** Same as tk_pc_has_bypass_cookie(). */
export function hasBypassCookie(cookie) {
  return String(cookie ?? '') !== '' && BYPASS_COOKIE_RE.test(String(cookie));
}

/** Same as tk_pc_path_ok(). */
export function pathOk(path) {
  return String(path).length <= 255 && PATH_RE.test(String(path));
}

/** Same as tk_pc_query_ok(): empty, or tracking parameters only. */
export function queryOk(query) {
  for (const pair of String(query).split('&')) {
    if (pair === '') continue;
    let name = pair.split('=')[0];
    try { name = decodeURIComponent(name); } catch { /* invalid %-sequence: PHP rawurldecode keeps it; no tracking name has one */ }
    if (!TRACKING_RE.test(lowerAscii(name))) return false;
  }
  return true;
}

const bypass = (reason) => ({ cache: false, reason, file: '', rewrite: false });

/** Same contract as tk_pc_decide(): {cache, reason, file, rewrite}. */
export function decide(req, cfg = {}) {
  const method = upperAscii(req.method ?? 'GET');
  if (method !== 'GET' && method !== 'HEAD') return bypass('method');
  const host = lowerAscii(cfg.host ?? '');
  if (host !== '' && lowerAscii(req.host ?? '') !== host) return bypass('host');
  if (req.warm) return bypass('warm');
  if (hasBypassCookie(req.cookie)) return bypass('cookie');
  const uri = String(req.uri ?? '/');
  const q = uri.indexOf('?');
  const path = q < 0 ? uri : uri.slice(0, q);
  const query = q < 0 ? '' : uri.slice(q + 1);
  const nocache = nocacheReason(path); // before the path rule, like tk_pc_decide()
  if (nocache) return bypass(nocache);
  if (!pathOk(path)) return bypass('path');
  if (!queryOk(query)) return bypass('query');
  return { cache: true, reason: '', file: `${path.slice(1)}index.html`, rewrite: query === '' };
}

const NOT_Q0 = String.raw`(?!\s*;\s*q\s*=\s*0(?:\.0{0,3})?(?![.\d]))`;
export const AE_BR_RE = new RegExp(String.raw`\bbr\b` + NOT_Q0, 'i');
export const AE_GZIP_RE = new RegExp(String.raw`\bgzip\b` + NOT_Q0, 'i');

/** Same contract as tk_pc_pick_encoding(): a token counts unless it carries q=0 (RFC 9110). */
export function pickEncoding(accept, hasBr, hasGz) {
  if (hasBr && AE_BR_RE.test(String(accept ?? ''))) return 'br';
  if (hasGz && AE_GZIP_RE.test(String(accept ?? ''))) return 'gzip';
  return '';
}

/** Same as tk_pc_cache_control(). */
export function cacheControl(edgeTtl = 0) {
  const ttl = Math.max(0, Math.trunc(Number(edgeTtl) || 0));
  return `public, max-age=0${ttl ? `, s-maxage=${ttl}` : ''}, must-revalidate`;
}
