<?php
/**
 * Page cache — pure rules, no WordPress calls.
 *
 * Loaded by the advanced-cache.php drop-in (before WordPress is up) and by tk-page-cache.php. The same
 * decisions exist twice and must stay in lockstep:
 *   - here (PHP: capture in WordPress, serving in the drop-in),
 *   - the generated .htaccess rules (tk_pc_htaccess_block(), built from the constants below).
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * Tracking parameters that never change the page. They are dropped from the cache key (served by the
 * PHP drop-in, HIT-PHP); any other query parameter bypasses the cache. D: "$" is the very end (without
 * it PCRE's "$" also matches before a trailing newline, so "utm_source%0A" counted as tracking; the JS twin
 * build/lib/cache-rules.mjs never did).
 */
const TK_PC_TRACKING_RE = '/^(?:utm_[a-z0-9_]+|fbclid|gclid|gclsrc|gbraid|wbraid|dclid|msclkid|yclid|twclid|ttclid|igshid|li_fat_id|mc_cid|mc_eid|_ga|_gl|_hsenc|_hsmi|srsltid)$/D';

/**
 * Cookies that mean "this visitor may see something personal": logged in, a post password, a comment
 * author, or an explicit no-cache switch (tk_nocache=1 forces a WordPress render, for debugging).
 * PCRE, case-insensitive; the .htaccess rule uses the same pattern.
 */
const TK_PC_BYPASS_COOKIE_RE = '(?:^|;)\s*(?:wordpress_logged_in_|wordpress_sec_|wp-postpass_|comment_author_|wordpress_no_cache=|tk_nocache=)';

/**
 * Cacheable request paths: lowercase slug segments, each ending in "/", nothing under wp-* and no
 * feed/embed/trackback/search segment. "/" is the front page. Anything else (files, uppercase,
 * %-encoded, missing trailing slash → WordPress's own 301) goes to WordPress.
 */
const TK_PC_PATH_RE = '(?:(?!wp-|feed/|embed/|trackback/|search/)[a-z0-9-]+/)*';

/**
 * The raw request line (Apache's THE_REQUEST) of a path with an empty segment ("//kontakt/", "/kontakt//").
 * Apache merges slashes (MergeSlashes On) before the .htaccess RewriteRule sees the path, so without this
 * condition the rules served "//kontakt/" from the cache as a 200 duplicate, while tk_pc_decide() (raw
 * REQUEST_URI) already bypasses it. Negated in the rules: such a request goes to WordPress, whose
 * redirect_canonical 301s it in one hop to the clean URL, query kept. Origin-form ("/…") or absolute-form
 * ("http://host/…") request target; the query is not looked at. Twin: RAW_DOUBLE_SLASH_RE in cache-rules.mjs.
 */
const TK_PC_RAW_DOUBLE_SLASH_RE = '^\S+\s(?:https?://[^/?\s]*)?(?:/[^/?\s]*)*//';

/**
 * Pages that are never cached, on any environment: first path segment => bypass reason. The page and
 * everything below it is left to WordPress by all layers (the .htaccess rule's lookahead, the drop-in,
 * the capture), so even a stale file on disk is never served, and WordPress answers it with no-store.
 * Use it for a page whose HTML carries per-request data (nonces, a live booking widget).
 * Segments are lowercase slugs ([a-z0-9-], no regex metacharacters: used verbatim in the patterns).
 * Example: array( 'rezervace' => 'booking' ). Empty for now.
 */
const TK_PC_NOCACHE_PATHS = array();

/**
 * Negative lookahead that keeps the TK_PC_NOCACHE_PATHS segments out of the .htaccess rules (whose
 * pattern matches the path without its leading "/"). '' when the list is empty.
 *
 * @return string
 */
function tk_pc_nocache_lookahead() {
	return TK_PC_NOCACHE_PATHS ? '(?!(?:' . implode( '|', array_keys( TK_PC_NOCACHE_PATHS ) ) . ')/)' : '';
}

/**
 * The bypass reason of a never-cached path ('' = not one of them).
 *
 * @param string $path Request path (no query), starting with "/".
 * @return string
 */
function tk_pc_nocache_reason( $path ) {
	$segment = strtolower( explode( '/', ltrim( (string) $path, '/' ), 2 )[0] );

	return array_key_exists( $segment, TK_PC_NOCACHE_PATHS ) ? TK_PC_NOCACHE_PATHS[ $segment ] : '';
}

/**
 * Accept-Encoding tests (the .htaccess rules use the same ones): the token, not followed by q=0 (RFC 9110:
 * "not acceptable").
 */
const TK_PC_AE_BR_RE   = '\bbr\b(?!\s*;\s*q\s*=\s*0(?:\.0{0,3})?(?![.\d]))';
const TK_PC_AE_GZIP_RE = '\bgzip\b(?!\s*;\s*q\s*=\s*0(?:\.0{0,3})?(?![.\d]))';

/** Request header that asks WordPress to (re)write the cache file for this URL (value: tk_pc_warm_token()). */
const TK_PC_WARM_HEADER = 'X-TK-Cache-Warm';

/**
 * Cache-Control of a cached page: every browser and proxy revalidates (ETag / Last-Modified → 304), so
 * a deploy is visible at once and an edge proxy never serves a stale page. The first view is what the
 * page cache makes fast; a revalidation is one small 304.
 *
 * @param int $edge_ttl Seconds a shared cache (s-maxage) may keep the page; 0 = none.
 * @return string
 */
function tk_pc_cache_control( $edge_ttl = 0 ) {
	$edge_ttl = max( 0, (int) $edge_ttl );

	return 'public, max-age=0' . ( $edge_ttl ? ', s-maxage=' . $edge_ttl : '' ) . ', must-revalidate';
}

/**
 * Whether the Cookie header carries a cookie that bypasses the cache.
 *
 * @param string $cookie Raw Cookie header.
 * @return bool
 */
function tk_pc_has_bypass_cookie( $cookie ) {
	return '' !== (string) $cookie && 1 === preg_match( '/' . TK_PC_BYPASS_COOKIE_RE . '/i', (string) $cookie );
}

/**
 * Whether the path (no query) may be cached.
 *
 * @param string $path Raw request path.
 * @return bool
 */
function tk_pc_path_ok( $path ) {
	return strlen( (string) $path ) <= 255 && 1 === preg_match( '~^/' . TK_PC_PATH_RE . '$~D', (string) $path );
}

/**
 * Whether a raw query string may be served from the cache: empty, or tracking parameters only.
 *
 * @param string $query Raw query string (without "?").
 * @return bool
 */
function tk_pc_query_ok( $query ) {
	foreach ( explode( '&', (string) $query ) as $pair ) {
		if ( '' === $pair ) {
			continue;
		}

		$name = strtolower( rawurldecode( explode( '=', $pair, 2 )[0] ) );

		if ( ! preg_match( TK_PC_TRACKING_RE, $name ) ) {
			return false;
		}
	}

	return true;
}

/**
 * The cache decision for one request.
 *
 * @param array $req {method, host, uri, cookie, warm}: uri = raw REQUEST_URI (path + query), warm = the
 *                   warm header is present (never served from the cache).
 * @param array $cfg {host}: the site's host[:port]; '' accepts any host.
 * @return array{cache:bool,reason:string,file:string,rewrite:bool}
 *               file = path relative to the cache directory, e.g. "kontakt/index.html";
 *               rewrite = the .htaccess rules serve it too (else only the drop-in).
 */
function tk_pc_decide( $req, $cfg ) {
	$bypass = static function ( $reason ) {
		return array(
			'cache'   => false,
			'reason'  => $reason,
			'file'    => '',
			'rewrite' => false,
		);
	};

	$method = strtoupper( isset( $req['method'] ) ? (string) $req['method'] : 'GET' );

	if ( 'GET' !== $method && 'HEAD' !== $method ) {
		return $bypass( 'method' );
	}

	$host = isset( $cfg['host'] ) ? strtolower( (string) $cfg['host'] ) : '';

	if ( '' !== $host && strtolower( isset( $req['host'] ) ? (string) $req['host'] : '' ) !== $host ) {
		return $bypass( 'host' );
	}

	if ( ! empty( $req['warm'] ) ) {
		return $bypass( 'warm' );
	}

	if ( tk_pc_has_bypass_cookie( isset( $req['cookie'] ) ? $req['cookie'] : '' ) ) {
		return $bypass( 'cookie' );
	}

	$uri   = isset( $req['uri'] ) ? (string) $req['uri'] : '/';
	$parts = explode( '?', $uri, 2 );
	$path  = $parts[0];
	$query = isset( $parts[1] ) ? $parts[1] : '';

	// The never-cached check first, so an uppercase variant of such a path reports its reason too.
	$nocache = tk_pc_nocache_reason( $path );

	if ( '' !== $nocache ) {
		return $bypass( $nocache );
	}

	if ( ! tk_pc_path_ok( $path ) ) {
		return $bypass( 'path' );
	}

	if ( ! tk_pc_query_ok( $query ) ) {
		return $bypass( 'query' );
	}

	return array(
		'cache'   => true,
		'reason'  => '',
		'file'    => ltrim( $path, '/' ) . 'index.html',
		'rewrite' => '' === $query,
	);
}

/**
 * Which stored representation to send: 'br', 'gzip' or '' (identity).
 *
 * @param string $accept Accept-Encoding header.
 * @param bool   $has_br A .br file exists.
 * @param bool   $has_gz A .gz file exists.
 * @return string
 */
function tk_pc_pick_encoding( $accept, $has_br, $has_gz ) {
	$accept = (string) $accept;

	if ( $has_br && preg_match( '/' . TK_PC_AE_BR_RE . '/i', $accept ) ) {
		return 'br';
	}

	if ( $has_gz && preg_match( '/' . TK_PC_AE_GZIP_RE . '/i', $accept ) ) {
		return 'gzip';
	}

	return '';
}

/**
 * Warm token: an HMAC of the site's salts, so only code that can read wp-config.php (WP-CLI, WP-Cron,
 * the admin action) can make WordPress rewrite an existing cache file. Works before WordPress loads.
 *
 * @return string
 */
function tk_pc_warm_token() {
	$key = ( defined( 'NONCE_KEY' ) ? NONCE_KEY : '' ) . ( defined( 'NONCE_SALT' ) ? NONCE_SALT : '' ) . ( defined( 'AUTH_KEY' ) ? AUTH_KEY : '' );

	return hash_hmac( 'sha256', 'tk_page_cache_warm', $key );
}

/**
 * Fingerprint of what a cached page depends on beyond its content: the salts, the absolute URLs (the
 * home *option*, never home_url(), which follows the request's scheme) and the deployed code
 * (theme/mu-plugin files, WordPress version). A mismatch (a migrated or re-salted site, a file-only
 * deploy) purges the cache.
 *
 * @param string $home  Home URL (get_option( 'home' )).
 * @param string $build Build fingerprint (tk_pc_build_version()).
 * @return string
 */
function tk_pc_stamp( $home, $build = '' ) {
	return substr( hash( 'sha256', (string) $home . '|' . (string) $build . '|' . tk_pc_warm_token() ), 0, 32 );
}

/**
 * The root .htaccess block (between "# BEGIN TK Page Cache" / "# END TK Page Cache").
 *
 * Plain mod_rewrite, repeated per encoding instead of %N back-references, [S=] skips or env flags, so
 * Apache 2.4 and LiteSpeed/OpenLiteSpeed (which read .htaccess rewrite rules) evaluate it the same
 * way. Needs AllowOverride FileInfo. Headers come from the cache directory's own .htaccess
 * (tk_pc_cache_dir_htaccess()).
 *
 * @param array $o {host: '' = any, cache_fs: absolute cache dir, cache_url: cache dir relative to the
 *                 RewriteBase, base: RewriteBase, precompressed: bool}.
 * @return string[] Lines (without the markers).
 */
function tk_pc_htaccess_block( $o ) {
	$fs    = rtrim( (string) $o['cache_fs'], '/' );
	$url   = trim( (string) $o['cache_url'], '/' );
	$lines = array(
		'# Static page cache (mu-plugins/tk-page-cache, `wp tk cache-setup`). Do not edit: regenerated.',
		'# Anonymous GET/HEAD of a cached page is answered from ' . $url . '/ without starting PHP.',
		'<IfModule mod_rewrite.c>',
		'RewriteEngine On',
		'RewriteBase ' . ( isset( $o['base'] ) ? $o['base'] : '/' ),
	);

	$encodings = ! empty( $o['precompressed'] ) ? array( '.br' => TK_PC_AE_BR_RE, '.gz' => TK_PC_AE_GZIP_RE, '' => '' ) : array( '' => '' );

	foreach ( $encodings as $ext => $ae ) {
		$file    = '$1index.html' . $ext;
		$lines[] = 'RewriteCond %{REQUEST_METHOD} ^(GET|HEAD)$';

		if ( ! empty( $o['host'] ) ) {
			$lines[] = 'RewriteCond %{HTTP_HOST} =' . $o['host'] . ' [NC]';
		}

		$lines[] = 'RewriteCond %{HTTP:' . TK_PC_WARM_HEADER . '} ^$';
		$lines[] = 'RewriteCond %{HTTP_COOKIE} !' . TK_PC_BYPASS_COOKIE_RE . ' [NC]';
		$lines[] = 'RewriteCond %{QUERY_STRING} ^$';
		$lines[] = 'RewriteCond %{THE_REQUEST} !' . TK_PC_RAW_DOUBLE_SLASH_RE . ' [NC]';

		if ( '' !== $ae ) {
			$lines[] = 'RewriteCond %{HTTP:Accept-Encoding} ' . $ae . ' [NC]';
		}

		$lines[] = 'RewriteCond "' . $fs . '/' . $file . '" -f';
		$lines[] = 'RewriteRule ^' . tk_pc_nocache_lookahead() . '(' . TK_PC_PATH_RE . ')$ "' . $url . '/' . $file . '" [L]';
	}

	$lines[] = '</IfModule>';

	return $lines;
}

/**
 * wp-content/cache/tk-page/.htaccess: types, encodings and headers of the cached files (FileInfo
 * directives only, so AllowOverride FileInfo is enough). AddEncoding sets the encoding before
 * mod_deflate/mod_brotli run, so a precompressed file is never compressed twice.
 *
 * @param int $edge_ttl See tk_pc_cache_control().
 * @return string
 */
function tk_pc_cache_dir_htaccess( $edge_ttl = 0 ) {
	return implode(
		"\n",
		array(
			'# Static page cache: generated by `wp tk cache-setup` (mu-plugins/tk-page-cache). Do not edit.',
			'<IfModule mod_mime.c>',
			'	RemoveType .gz .br',
			'	AddType text/html .html .gz .br',
			'	AddCharset UTF-8 .html',
			'	AddEncoding gzip .gz',
			'	AddEncoding br .br',
			'</IfModule>',
			'<IfModule mod_setenvif.c>',
			'	SetEnvIfNoCase Request_URI "\.(gz|br)$" no-gzip no-brotli',
			'</IfModule>',
			// Only reachable through the root rules: a direct /wp-content/cache/tk-page/… request (THE_REQUEST is
			// the original request line, unchanged by the internal rewrite) is a 404, so the home page never
			// shows up under a second URL. If a purge deleted the file between the root rule's -f test and
			// this point, hand the request to WordPress (REQUEST_URI is still the original URL).
			'<IfModule mod_rewrite.c>',
			'	RewriteEngine On',
			'	RewriteCond %{THE_REQUEST} \s/+wp-content/cache/ [NC]',
			'	RewriteRule ^ - [R=404,L]',
			'	RewriteCond %{REQUEST_FILENAME} !-f',
			'	RewriteRule ^ /index.php [L]',
			'</IfModule>',
			'<IfModule mod_headers.c>',
			'	Header set Cache-Control "' . tk_pc_cache_control( $edge_ttl ) . '"',
			'	Header unset Expires',
			'	Header merge Vary Accept-Encoding',
			'	Header set X-TK-Cache HIT',
			'</IfModule>',
			'',
		)
	);
}
