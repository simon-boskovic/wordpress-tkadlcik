<?php
/**
 * Page cache — the WordPress side: capture, purge, warm, setup, safety-net hooks.
 *
 * Every public page (and published post) is written once as static HTML (+ .gz, + .br when PHP has
 * ext-brotli) into wp-content/cache/tk-page/<path>/index.html. Apache answers those files straight from
 * disk via the rules `wp tk cache-setup` writes into .htaccess ("X-TK-Cache: HIT"); the
 * advanced-cache.php drop-in serves the same files from PHP where the rules cannot ("HIT-PHP").
 *
 * Files are written by WordPress itself, from the real response of an anonymous GET: on a cache miss
 * (the first visitor after a purge) or when `wp tk cache-warm` asks for it with the warm header. Only a
 * published, password-free page/post (or the front page) answering 200 text/html without Set-Cookie,
 * for an anonymous visitor, with no query other than tracking parameters, is ever stored. Redirects
 * (WordPress's canonical redirect on template_redirect) exit before the capture starts, so a
 * redirecting URL never gets a file; 404s and search results are refused explicitly.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/lib.php';

/** Marker in the drop-in and the .htaccess block. */
const TK_PC_MARKER = 'TK Page Cache';

/** Post types whose single views are cached (and whose changes purge the cache). */
const TK_PC_POST_TYPES = array( 'page', 'post' );

/**
 * Absolute cache directory.
 *
 * @return string
 */
function tk_pc_dir() {
	return defined( 'TK_PAGE_CACHE_DIR' ) ? TK_PAGE_CACHE_DIR : WP_CONTENT_DIR . '/cache/tk-page';
}

/**
 * The site's host[:port] as browsers send it in Host.
 *
 * @return string
 */
function tk_pc_home_host() {
	$p = wp_parse_url( get_option( 'home' ) );

	return strtolower( ( isset( $p['host'] ) ? $p['host'] : '' ) . ( isset( $p['port'] ) ? ':' . $p['port'] : '' ) );
}

/**
 * Settings written by `wp tk cache-setup` (option tk_page_cache).
 *
 * @return array{mode:string,host:string,edge_ttl:int,precompressed:bool}
 */
function tk_pc_config() {
	$saved = get_option( 'tk_page_cache', array() );
	$cfg   = array_merge(
		array(
			'mode'          => 'off',
			'host'          => tk_pc_home_host(),
			'edge_ttl'      => 0,
			'precompressed' => true,
		),
		is_array( $saved ) ? $saved : array()
	);

	$cfg['edge_ttl']      = max( 0, (int) $cfg['edge_ttl'] );
	$cfg['precompressed'] = (bool) $cfg['precompressed'];

	return $cfg;
}

/**
 * The current request in the shape tk_pc_decide() takes.
 *
 * @return array
 */
function tk_pc_request() {
	// phpcs:disable WordPress.Security.ValidatedSanitizedInput -- raw values, only matched against strict patterns.
	return array(
		'method' => isset( $_SERVER['REQUEST_METHOD'] ) ? (string) $_SERVER['REQUEST_METHOD'] : 'GET',
		'host'   => isset( $_SERVER['HTTP_HOST'] ) ? (string) $_SERVER['HTTP_HOST'] : '',
		'uri'    => isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/',
		'cookie' => isset( $_SERVER['HTTP_COOKIE'] ) ? (string) $_SERVER['HTTP_COOKIE'] : '',
		'warm'   => ! empty( $_SERVER['HTTP_X_TK_CACHE_WARM'] ),
	);
	// phpcs:enable
}

/**
 * Whether this request carries a valid warm token (it may then overwrite an existing file).
 *
 * @return bool
 */
function tk_pc_is_warm_request() {
	$sent = isset( $_SERVER['HTTP_X_TK_CACHE_WARM'] ) ? (string) $_SERVER['HTTP_X_TK_CACHE_WARM'] : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

	return '' !== $sent && hash_equals( tk_pc_warm_token(), $sent );
}

/**
 * Current generation (changes on every purge; a capture that started before a purge is discarded).
 *
 * @return string
 */
function tk_pc_generation() {
	$file = tk_pc_dir() . '/.ht-generation';

	return is_readable( $file ) ? trim( (string) file_get_contents( $file ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
}

/**
 * Write a small file atomically (temp file + rename).
 *
 * @param string $path Target.
 * @param string $data Contents.
 * @return bool
 */
function tk_pc_put( $path, $data ) {
	$tmp = $path . '.tmp' . getmypid() . wp_rand( 1000, 9999 );

	// phpcs:disable WordPress.WP.AlternativeFunctions -- direct, atomic file writes are the point.
	if ( false === file_put_contents( $tmp, $data ) ) {
		return false;
	}

	@chmod( $tmp, 0644 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

	if ( ! rename( $tmp, $path ) ) {
		unlink( $tmp );
		return false;
	}
	// phpcs:enable

	return true;
}

/**
 * Fingerprint of the deployed code: WordPress version, active theme versions, and the newest
 * modification time of the theme's and the mu-plugins' files (one directory level each, so a request
 * costs a few dozen stat calls). A file-only deploy changes it, and the stamp check purges the cache.
 *
 * @return string
 */
function tk_pc_build_version() {
	static $v = null;

	if ( null !== $v ) {
		return $v;
	}

	$dirs = array( WPMU_PLUGIN_DIR, WPMU_PLUGIN_DIR . '/tk-page-cache' );
	foreach ( array_unique( array( get_stylesheet_directory(), get_template_directory() ) ) as $theme ) {
		foreach ( array( '', '/inc', '/template-parts', '/parts', '/assets/css', '/assets/js', '/assets/fonts', '/data' ) as $sub ) {
			$dirs[] = $theme . $sub;
		}
	}

	$newest = 0;
	foreach ( $dirs as $dir ) {
		// No glob( GLOB_BRACE ): musl builds (Alpine, the WP-CLI image) lack it.
		foreach ( is_dir( $dir ) ? (array) scandir( $dir ) : array() as $name ) {
			if ( preg_match( '/\.(?:php|css|js|json|txt|woff2)$/', (string) $name ) ) {
				$newest = max( $newest, (int) @filemtime( $dir . '/' . $name ) ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			}
		}
	}

	$v = $GLOBALS['wp_version'] . '|' . wp_get_theme()->get( 'Version' ) . '|' . $newest;

	return $v;
}

/**
 * The stamp this site should have now (tk_pc_stamp() of the home option and the build).
 *
 * @return string
 */
function tk_pc_current_stamp() {
	return tk_pc_stamp( get_option( 'home' ), tk_pc_build_version() );
}

/**
 * mkdir -p with 0755 directories (wp_mkdir_p() would copy wp-content/cache's own mode, often 1777).
 *
 * @param string $dir Directory.
 * @return bool
 */
function tk_pc_mkdir( $dir ) {
	if ( is_dir( $dir ) ) {
		return true;
	}

	if ( dirname( $dir ) === $dir || ! tk_pc_mkdir( dirname( $dir ) ) ) {
		return false;
	}

	// phpcs:disable WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.file_system_operations_mkdir,WordPress.WP.AlternativeFunctions.file_system_operations_chmod -- a parallel request may create it first.
	if ( ! @mkdir( $dir, 0755 ) && ! is_dir( $dir ) ) {
		return false;
	}

	@chmod( $dir, 0755 );
	// phpcs:enable

	return true;
}

/**
 * Make sure the cache directory and its .htaccess / stamp exist.
 *
 * @return bool
 */
function tk_pc_ensure_dir() {
	$dir = tk_pc_dir();

	if ( ! is_dir( $dir ) && ! tk_pc_mkdir( $dir ) ) {
		return false;
	}

	$ht   = $dir . '/.htaccess';
	$want = tk_pc_cache_dir_htaccess( tk_pc_config()['edge_ttl'] );

	if ( ! is_readable( $ht ) || file_get_contents( $ht ) !== $want ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		tk_pc_put( $ht, $want );
	}

	if ( ! is_readable( $dir . '/.ht-stamp' ) ) {
		tk_pc_put( $dir . '/.ht-stamp', tk_pc_current_stamp() );
	}

	return true;
}

/**
 * Send (replace) the X-TK-Cache header.
 *
 * @param string $value Value.
 */
function tk_pc_header( $value ) {
	if ( ! headers_sent() ) {
		header( 'X-TK-Cache: ' . $value );
	}
}

/**
 * Why WordPress must not store this response ('' = it may).
 *
 * @return string
 */
function tk_pc_wp_reason() {
	if ( defined( 'DONOTCACHEPAGE' ) && DONOTCACHEPAGE ) {
		return 'donotcachepage';
	}

	if ( is_user_logged_in() ) {
		return 'logged-in';
	}

	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return 'not-front-end';
	}

	if ( is_404() ) {
		return '404';
	}

	if ( is_search() || is_feed() || is_preview() || is_embed() || is_trackback() || is_robots() || is_favicon() ) {
		return 'not-a-page';
	}

	if ( ! is_singular( TK_PC_POST_TYPES ) && ! is_front_page() ) {
		return 'not-a-page';
	}

	$post = get_queried_object();

	if ( ! $post instanceof WP_Post || 'publish' !== $post->post_status || post_password_required( $post ) ) {
		return 'not-public';
	}

	// Only the page's own URL: WordPress also answers 200 for /page/N/, /comment-page-N/ and
	// /<page>/N/ aliases, which would fill the disk with copies.
	if ( get_query_var( 'paged' ) || get_query_var( 'cpage' ) || (int) get_query_var( 'page' ) > 1 ) {
		return 'paged';
	}

	$own  = is_front_page() ? home_url( '/' ) : get_permalink( $post );
	$path = explode( '?', isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/', 2 )[0]; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	if ( ! $own || (string) wp_parse_url( $own, PHP_URL_PATH ) !== $path ) {
		return 'alias';
	}

	// The absolute URLs in the page follow the request's scheme (is_ssl(), e.g. X-Forwarded-Proto);
	// only a request whose scheme matches the home option may produce the copy everyone gets.
	if ( is_ssl() !== ( 'https' === wp_parse_url( get_option( 'home' ), PHP_URL_SCHEME ) ) ) {
		return 'scheme';
	}

	return '';
}

/** State of the capture running in this request. */
$GLOBALS['tk_pc_capture'] = null;

/**
 * template_redirect, last: every redirect has had its chance. Start buffering an eligible page view.
 */
function tk_pc_start_capture() {
	$cfg = tk_pc_config();

	// Never-cached pages (TK_PC_NOCACHE_PATHS): no-store for the browser and any edge proxy, whatever
	// the cache mode (even "off"), so nothing keeps per-request data.
	$nocache = tk_pc_nocache_reason( explode( '?', isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/', 2 )[0] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- only matched against fixed slugs.
	if ( '' !== $nocache && ! headers_sent() ) {
		nocache_headers();
		tk_pc_header( 'BYPASS (' . $nocache . ')' );
	}

	if ( 'off' === $cfg['mode'] ) {
		return;
	}

	// A response WordPress renders is never shared: an edge proxy in front of the site must not keep it
	// (the cached file is what is shared). 404, logged-in and error responses already carry no-store.
	$has_cc = false;
	foreach ( headers_list() as $h ) {
		if ( 0 === stripos( $h, 'cache-control:' ) ) {
			$has_cc = true;
		}
	}
	if ( ! $has_cc && ! headers_sent() ) {
		header( 'Cache-Control: private, max-age=0, must-revalidate' );
	}

	$req  = tk_pc_request();
	$warm = tk_pc_is_warm_request();
	$d    = tk_pc_decide( array_merge( $req, array( 'warm' => false ) ), $cfg );

	if ( ! $d['cache'] ) {
		tk_pc_header( 'BYPASS (' . $d['reason'] . ')' );
		return;
	}

	$reason = tk_pc_wp_reason();

	if ( '' !== $reason ) {
		tk_pc_header( 'BYPASS (' . $reason . ')' );
		return;
	}

	if ( 'GET' !== strtoupper( $req['method'] ) || ( ! $warm && is_file( tk_pc_dir() . '/' . $d['file'] ) ) ) {
		tk_pc_header( 'MISS' );
		return;
	}

	ob_start();
	$GLOBALS['tk_pc_capture'] = array(
		'file'       => $d['file'],
		'level'      => ob_get_level(),
		'generation' => tk_pc_generation(),
		'warm'       => $warm,
	);
	tk_pc_header( 'MISS' );
}
add_action( 'template_redirect', 'tk_pc_start_capture', PHP_INT_MAX );

/**
 * wp (late): Complianz's cookie blocker (consent, port of martinadamus R45) rewrites the finished page in an
 * output-buffer callback started on template_redirect (10) — outside our capture buffer, so the stored file would
 * hold the page BEFORE blocking: Site Kit's Google tag as a live <script src>, served to everyone as HIT. Restart
 * its buffer after ours (same hook, PHP_INT_MAX, added later = runs later = nested inside the capture):
 * tk_pc_finish_capture() flushes it through Complianz's callback into our buffer, so the cache stores exactly
 * what WordPress would have sent. Proof: build/test/page-cache-test.php + page-cache.int.mjs (consent).
 */
function tk_pc_nest_complianz_buffer() {
	if ( ! class_exists( 'COMPLIANZ' ) || ! isset( COMPLIANZ::$cookie_blocker ) ) {
		return;
	}
	$cb = array( COMPLIANZ::$cookie_blocker, 'start_buffer' );
	if ( false !== has_action( 'template_redirect', $cb ) ) {
		remove_action( 'template_redirect', $cb, has_action( 'template_redirect', $cb ) );
		add_action( 'template_redirect', $cb, PHP_INT_MAX );
	}
}
add_action( 'wp', 'tk_pc_nest_complianz_buffer', PHP_INT_MAX );

/**
 * Why a finished response must not be stored ('' = store it).
 *
 * @param string $html Body.
 * @return string
 */
function tk_pc_response_reason( $html ) {
	if ( 200 !== http_response_code() ) {
		return 'status-' . http_response_code();
	}

	foreach ( headers_list() as $h ) {
		if ( 0 === stripos( $h, 'set-cookie:' ) ) {
			return 'set-cookie';
		}
		if ( 0 === stripos( $h, 'content-type:' ) && false === stripos( $h, 'text/html' ) ) {
			return 'content-type';
		}
	}

	if ( strlen( $html ) < 1024 || false === stripos( $html, '</html>' ) ) {
		return 'incomplete';
	}

	if ( false !== strpos( $html, 'id="wpadminbar"' ) ) {
		return 'admin-bar';
	}

	return '';
}

/**
 * shutdown, before WordPress flushes the buffers: store the page, report the outcome in the header.
 */
function tk_pc_finish_capture() {
	$c = $GLOBALS['tk_pc_capture'];

	if ( ! $c ) {
		return;
	}

	$GLOBALS['tk_pc_capture'] = null;

	while ( ob_get_level() > $c['level'] ) {
		ob_end_flush();
	}

	if ( ob_get_level() < $c['level'] ) {
		return; // Our buffer was closed by someone else; nothing reliable to store.
	}

	$html   = (string) ob_get_contents();
	$reason = tk_pc_response_reason( $html );

	if ( '' === $reason && tk_pc_generation() !== $c['generation'] ) {
		$reason = 'purged-meanwhile';
	}

	if ( '' === $reason ) {
		$reason = tk_pc_store( $c['file'], $html ) ? '' : 'write-failed';
	}

	tk_pc_header( '' === $reason ? 'STORED' : 'MISS (not stored: ' . $reason . ')' );
}
add_action( 'shutdown', 'tk_pc_finish_capture', 0 );

/**
 * Write one page (+ .gz, + .br) atomically: temp files first, then renames.
 *
 * @param string $rel  File relative to the cache dir, e.g. kontakt/index.html.
 * @param string $html Body.
 * @return bool
 */
function tk_pc_store( $rel, $html ) {
	if ( ! tk_pc_ensure_dir() ) {
		return false;
	}

	$path = tk_pc_dir() . '/' . $rel;

	if ( ! is_dir( dirname( $path ) ) && ! tk_pc_mkdir( dirname( $path ) ) ) {
		return false;
	}

	$bodies = array( '' => $html );

	if ( tk_pc_config()['precompressed'] ) {
		if ( function_exists( 'brotli_compress' ) ) {
			$br = brotli_compress( $html, 11, defined( 'BROTLI_TEXT' ) ? BROTLI_TEXT : 1 );
			if ( is_string( $br ) ) {
				$bodies['.br'] = $br;
			}
		}

		$gz = function_exists( 'gzencode' ) ? gzencode( $html, 9 ) : false;
		if ( is_string( $gz ) ) {
			$bodies['.gz'] = $gz;
		}
	}

	// Stale precompressed siblings must never outlive a new plain file.
	foreach ( array( '.br', '.gz' ) as $ext ) {
		if ( ! isset( $bodies[ $ext ] ) && is_file( $path . $ext ) ) {
			wp_delete_file( $path . $ext );
		}
	}

	$ok = true;

	foreach ( array( '.br', '.gz', '' ) as $ext ) {
		if ( isset( $bodies[ $ext ] ) ) {
			$ok = tk_pc_put( $path . $ext, $bodies[ $ext ] ) && $ok;
		}
	}

	return $ok;
}

/**
 * Cached files (relative paths, plain and precompressed).
 *
 * @return string[]
 */
function tk_pc_files() {
	$dir = tk_pc_dir();

	if ( ! is_dir( $dir ) ) {
		return array();
	}

	$out = array();
	$it  = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ) );

	foreach ( $it as $file ) {
		if ( $file->isFile() && preg_match( '/\.html(\.gz|\.br)?$|\.tmp\d+$/', $file->getFilename() ) ) {
			$out[] = substr( $file->getPathname(), strlen( $dir ) + 1 );
		}
	}

	sort( $out );

	return $out;
}

/**
 * Delete every cached page (keeps the directory's .htaccess) and start a new generation.
 *
 * Race with serving: a request whose root rewrite rule saw the file just before it was deleted is
 * handed to WordPress by the cache directory's own .htaccess (missing file → index.php), and the
 * drop-in simply falls through when its file vanished; both render the page normally.
 *
 * @param bool $dry_run Only report.
 * @return string[] Deleted (or, dry run, deletable) files.
 */
function tk_pc_purge( $dry_run = false ) {
	$files = tk_pc_files();

	if ( $dry_run ) {
		return $files;
	}

	$dir = tk_pc_dir();

	if ( is_dir( $dir ) ) {
		tk_pc_put( $dir . '/.ht-generation', uniqid( '', true ) );
	}

	foreach ( $files as $rel ) {
		wp_delete_file( $dir . '/' . $rel );
	}

	// Remove emptied sub-directories, deepest first.
	if ( is_dir( $dir ) ) {
		$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST );
		foreach ( $it as $f ) {
			if ( $f->isDir() ) {
				@rmdir( $f->getPathname() ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- only succeeds when empty.
			}
		}
	}

	/**
	 * Fires after the page cache was purged.
	 *
	 * @param string[] $files Deleted files.
	 */
	do_action( 'tk_page_cache_purged', $files );

	return $files;
}

/**
 * Every URL the cache should hold: each published, password-free page and post (the front page as "/").
 *
 * @return array<int,array{url:string,path:string,file:string}>
 */
function tk_pc_urls() {
	$ids   = get_posts(
		array(
			'post_type'      => TK_PC_POST_TYPES,
			'post_status'    => 'publish',
			'has_password'   => false,
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'orderby'        => array(
				'type'  => 'ASC',
				'title' => 'ASC',
			),
			'no_found_rows'  => true,
		)
	);
	$front = 'page' === get_option( 'show_on_front' ) ? (int) get_option( 'page_on_front' ) : 0;
	$home  = wp_parse_url( home_url( '/' ), PHP_URL_PATH );
	$out   = array();

	foreach ( $ids as $id ) {
		$url  = $id === $front ? home_url( '/' ) : get_permalink( $id );
		$path = (string) wp_parse_url( $url, PHP_URL_PATH );
		$d    = tk_pc_decide( array( 'uri' => $path ), array() );

		if ( ! $d['cache'] || '/' !== $home ) {
			continue; // Not a cacheable shape (or WordPress in a sub-directory, unsupported).
		}

		$out[] = array(
			'url'  => $url,
			'path' => $path,
			'file' => $d['file'],
		);
	}

	return $out;
}

/**
 * Published pages that are never cached (TK_PC_NOCACHE_PATHS), with a stale file if one is on disk
 * (never served: the rules and the drop-in skip these paths; cache-purge removes it).
 *
 * @return array<int,array{path:string,reason:string,stale:bool}>
 */
function tk_pc_nocache_pages() {
	$out = array();

	foreach ( array_keys( TK_PC_NOCACHE_PATHS ) as $slug ) {
		$page = get_page_by_path( $slug, OBJECT, 'page' );

		if ( $page instanceof WP_Post && 'publish' === $page->post_status ) {
			$path  = (string) wp_parse_url( get_permalink( $page ), PHP_URL_PATH );
			$out[] = array(
				'path'   => $path,
				'reason' => tk_pc_nocache_reason( $path ),
				'stale'  => is_file( tk_pc_dir() . $path . 'index.html' ),
			);
		}
	}

	return $out;
}

/**
 * GET many URLs in parallel (PHP curl). Local Docker needs TK_PAGE_CACHE_CONNECT_TO ("wordpress:80"):
 * the URLs keep the public host, the TCP connection goes to the web container.
 *
 * @param array<int,array{url:string,headers?:string[]}> $reqs        Requests.
 * @param int                                            $concurrency Parallel connections.
 * @param bool                                           $connect_to  Apply TK_PAGE_CACHE_CONNECT_TO.
 * @return array<int,array{status:int,headers:array<string,string>,ttfb:float,time:float,error:string,size:int}>
 */
function tk_pc_http_multi( $reqs, $concurrency = 4, $connect_to = true ) {
	$out = array();

	if ( ! function_exists( 'curl_multi_init' ) ) {
		foreach ( $reqs as $i => $r ) {
			$res       = wp_remote_get(
				$r['url'],
				array(
					'timeout'     => 30,
					'redirection' => 0,
					'headers'     => tk_pc_header_map( isset( $r['headers'] ) ? $r['headers'] : array() ),
				)
			);
			$out[ $i ] = array(
				'status'  => is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res ),
				'headers' => is_wp_error( $res ) ? array() : array_change_key_case( wp_remote_retrieve_headers( $res )->getAll(), CASE_LOWER ),
				'ttfb'    => 0.0,
				'time'    => 0.0,
				'error'   => is_wp_error( $res ) ? $res->get_error_message() : '',
				'size'    => is_wp_error( $res ) ? 0 : strlen( wp_remote_retrieve_body( $res ) ),
			);
		}
		return $out;
	}

	// phpcs:disable WordPress.WP.AlternativeFunctions.curl_curl_setopt,WordPress.WP.AlternativeFunctions.curl_curl_init,WordPress.WP.AlternativeFunctions.curl_curl_getinfo,WordPress.WP.AlternativeFunctions.curl_curl_error,WordPress.WP.AlternativeFunctions.curl_curl_close -- parallel requests; the WP HTTP API is sequential.
	$mh      = curl_multi_init();
	$queue   = array_keys( $reqs );
	$handles = array();
	$heads   = array();

	$add = static function ( $i ) use ( $reqs, $mh, &$handles, &$heads, $connect_to ) {
		$ch          = curl_init( $reqs[ $i ]['url'] );
		$heads[ $i ] = array();
		curl_setopt_array(
			$ch,
			array(
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_FOLLOWLOCATION => false,
				CURLOPT_TIMEOUT        => 60,
				CURLOPT_CONNECTTIMEOUT => 10,
				CURLOPT_USERAGENT      => 'TK-Page-Cache/1.0 (+wp tk cache-warm)',
				CURLOPT_HTTPHEADER     => isset( $reqs[ $i ]['headers'] ) ? $reqs[ $i ]['headers'] : array(),
				CURLOPT_HEADERFUNCTION => static function ( $ch, $line ) use ( $i, &$heads ) {
					$parts = explode( ':', $line, 2 );
					if ( 2 === count( $parts ) ) {
						$heads[ $i ][ strtolower( trim( $parts[0] ) ) ] = trim( $parts[1] );
					}
					return strlen( $line );
				},
			)
		);
		if ( $connect_to && defined( 'TK_PAGE_CACHE_CONNECT_TO' ) && TK_PAGE_CACHE_CONNECT_TO && defined( 'CURLOPT_CONNECT_TO' ) ) {
			curl_setopt( $ch, CURLOPT_CONNECT_TO, array( '::' . TK_PAGE_CACHE_CONNECT_TO ) );
		}
		curl_multi_add_handle( $mh, $ch );
		$handles[ (int) $ch ] = array( $i, $ch );
	};

	for ( $n = 0; $n < max( 1, (int) $concurrency ) && $queue; $n++ ) {
		$add( array_shift( $queue ) );
	}

	do {
		curl_multi_exec( $mh, $running );
		curl_multi_select( $mh, 1.0 );

		while ( $info = curl_multi_info_read( $mh ) ) { // phpcs:ignore Generic.CodeAnalysis.AssignmentInCondition.FoundInWhileCondition
			$ch = $info['handle'];
			list( $i ) = $handles[ (int) $ch ];
			$out[ $i ] = array(
				'status'  => (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE ),
				'headers' => $heads[ $i ],
				'ttfb'    => (float) curl_getinfo( $ch, CURLINFO_STARTTRANSFER_TIME ),
				'time'    => (float) curl_getinfo( $ch, CURLINFO_TOTAL_TIME ),
				'error'   => CURLE_OK === $info['result'] ? '' : curl_error( $ch ),
				'size'    => strlen( (string) curl_multi_getcontent( $ch ) ),
			);
			curl_multi_remove_handle( $mh, $ch );
			curl_close( $ch );
			unset( $handles[ (int) $ch ] );

			if ( $queue ) {
				$add( array_shift( $queue ) );
				$running = 1;
			}
		}
	} while ( $running || $handles );

	curl_multi_close( $mh );
	// phpcs:enable

	ksort( $out );

	return $out;
}

/**
 * "Name: value" lines → [name => value].
 *
 * @param string[] $lines Header lines.
 * @return array<string,string>
 */
function tk_pc_header_map( $lines ) {
	$map = array();

	foreach ( $lines as $line ) {
		$parts = explode( ':', $line, 2 );
		if ( 2 === count( $parts ) ) {
			$map[ trim( $parts[0] ) ] = trim( $parts[1] );
		}
	}

	return $map;
}

/**
 * Render every URL of tk_pc_urls() through the web server and let WordPress (re)write its file.
 *
 * @param array $opts {concurrency:int, dry_run:bool}.
 * @return array{urls:array,results:array}
 */
function tk_pc_warm( $opts = array() ) {
	$opts = array_merge(
		array(
			'concurrency' => 4,
			'dry_run'     => false,
		),
		$opts
	);
	$urls = tk_pc_urls();

	if ( $opts['dry_run'] || 'off' === tk_pc_config()['mode'] ) {
		return array(
			'urls'    => $urls,
			'results' => array(),
		);
	}

	tk_pc_ensure_dir();

	$reqs = array();
	foreach ( $urls as $u ) {
		$reqs[] = array(
			'url'     => $u['url'],
			'headers' => array( TK_PC_WARM_HEADER . ': ' . tk_pc_warm_token(), 'Accept-Encoding: identity' ),
		);
	}

	$results = tk_pc_http_multi( $reqs, $opts['concurrency'] );

	update_option(
		'tk_page_cache_last_warm',
		array(
			'time'   => time(),
			'urls'   => count( $urls ),
			'stored' => count(
				array_filter(
					$results,
					static function ( $r ) {
						return isset( $r['headers']['x-tk-cache'] ) && 'STORED' === $r['headers']['x-tk-cache'];
					}
				)
			),
		),
		false
	);

	return array(
		'urls'    => $urls,
		'results' => $results,
	);
}

/**
 * The advanced-cache.php drop-in `wp tk cache-setup` writes.
 *
 * @param array $cfg tk_pc_config().
 * @return string
 */
function tk_pc_dropin_source( $cfg ) {
	return "<?php\n"
		. "/**\n"
		. ' * ' . TK_PC_MARKER . " drop-in — written by `wp tk cache-setup` (mu-plugins/tk-page-cache). Do not edit: regenerated.\n"
		. " * Serves wp-content/cache/tk-page/ from PHP when the .htaccess rules cannot. Needs define( 'WP_CACHE', true ).\n"
		. " */\n"
		. "defined( 'ABSPATH' ) || exit;\n"
		. "defined( 'TK_PAGE_CACHE_HOST' ) || define( 'TK_PAGE_CACHE_HOST', " . var_export( (string) $cfg['host'], true ) . " );\n" // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export
		. "defined( 'TK_PAGE_CACHE_EDGE_TTL' ) || define( 'TK_PAGE_CACHE_EDGE_TTL', " . (int) $cfg['edge_ttl'] . " );\n"
		. "if ( is_file( WP_CONTENT_DIR . '/mu-plugins/tk-page-cache/serve.php' ) ) {\n"
		. "\tinclude WP_CONTENT_DIR . '/mu-plugins/tk-page-cache/serve.php';\n"
		. "}\n";
}

/**
 * Root .htaccess path.
 *
 * @return string
 */
function tk_pc_htaccess_path() {
	if ( ! function_exists( 'get_home_path' ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
	}

	return rtrim( get_home_path(), '/' ) . '/.htaccess';
}

/**
 * The .htaccess contents with our block replaced (or removed when $block is null), placed right before
 * WordPress's own block so any host rules above it (e.g. a forced HTTPS redirect) still run first.
 *
 * @param string        $current Current contents.
 * @param string[]|null $block   Block lines, or null to remove.
 * @return string
 */
function tk_pc_htaccess_with_block( $current, $block ) {
	$begin   = '# BEGIN ' . TK_PC_MARKER;
	$end     = '# END ' . TK_PC_MARKER;
	$current = (string) preg_replace( '/' . preg_quote( $begin, '/' ) . '.*?' . preg_quote( $end, '/' ) . "\n*/s", '', (string) $current );

	if ( null === $block ) {
		return $current;
	}

	$text = $begin . "\n" . implode( "\n", $block ) . "\n" . $end . "\n\n";
	$pos  = strpos( $current, '# BEGIN WordPress' );

	return false === $pos ? rtrim( $current ) . ( '' === trim( $current ) ? '' : "\n\n" ) . $text : substr( $current, 0, $pos ) . $text . substr( $current, $pos );
}

/**
 * The root .htaccess block for the current settings.
 *
 * @param array $cfg tk_pc_config().
 * @return string[]
 */
function tk_pc_htaccess_lines( $cfg ) {
	$home_path = (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH );
	$content   = (string) wp_parse_url( content_url(), PHP_URL_PATH );
	$rel       = ltrim( substr( $content, strlen( rtrim( $home_path, '/' ) ) ), '/' );
	$cache_rel = $rel . substr( tk_pc_dir(), strlen( WP_CONTENT_DIR ) );

	return tk_pc_htaccess_block(
		array(
			'host'          => $cfg['host'],
			'cache_fs'      => tk_pc_dir(),
			'cache_url'     => $cache_rel,
			'base'          => $home_path,
			'precompressed' => $cfg['precompressed'],
		)
	);
}

/**
 * Install / update / remove the cache (drop-in, .htaccess block, cache dir). Idempotent.
 *
 * @param array $opts    Settings to change (mode rewrite|php|off, host, edge_ttl, precompressed).
 * @param bool  $dry_run Only report.
 * @return array{log:string[],warnings:string[]}
 */
function tk_pc_setup( $opts, $dry_run = false ) {
	$log      = array();
	$warnings = array();
	$saved    = get_option( 'tk_page_cache', array() );
	$cfg      = array_merge( tk_pc_config(), is_array( $saved ) && isset( $saved['mode'] ) ? array() : array( 'mode' => 'rewrite' ), array_filter( $opts, static fn( $v ) => null !== $v ) );

	if ( ! in_array( $cfg['mode'], array( 'rewrite', 'php', 'off' ), true ) ) {
		$warnings[] = 'Unknown mode "' . $cfg['mode'] . '" (rewrite|php|off); nothing changed.';
		return compact( 'log', 'warnings' );
	}

	$cfg['edge_ttl']      = max( 0, (int) $cfg['edge_ttl'] );
	$cfg['precompressed'] = (bool) $cfg['precompressed'];

	// 1. Settings.
	if ( $saved !== $cfg ) {
		$log[] = '[write]  option tk_page_cache = ' . wp_json_encode( $cfg );
		if ( ! $dry_run ) {
			update_option( 'tk_page_cache', $cfg, true );
		}
	} else {
		$log[] = '[ok]     option tk_page_cache = ' . wp_json_encode( $cfg );
	}

	// 2. Cache directory, its .htaccess, the stamp.
	$dir   = tk_pc_dir();
	$ht    = $dir . '/.htaccess';
	$want  = tk_pc_cache_dir_htaccess( $cfg['edge_ttl'] );
	$stamp = tk_pc_current_stamp();
	$same  = is_readable( $ht ) && file_get_contents( $ht ) === $want; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$log[] = ( $same ? '[ok]     ' : '[write]  ' ) . $ht;
	if ( ! $dry_run && ! $same ) {
		tk_pc_mkdir( $dir );
		tk_pc_put( $ht, $want );
	}
	$old_stamp = is_readable( $dir . '/.ht-stamp' ) ? trim( (string) file_get_contents( $dir . '/.ht-stamp' ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( $old_stamp !== $stamp ) {
		$log[] = '[write]  ' . $dir . '/.ht-stamp' . ( '' !== $old_stamp ? ' (site, salts or code changed: purging the cache)' : '' );
		if ( ! $dry_run ) {
			if ( '' !== $old_stamp ) {
				tk_pc_purge();
			}
			tk_pc_mkdir( $dir );
			tk_pc_put( $dir . '/.ht-stamp', $stamp );
		}
	} else {
		$log[] = '[ok]     ' . $dir . '/.ht-stamp';
	}

	// 3. Drop-in.
	$dropin  = WP_CONTENT_DIR . '/advanced-cache.php';
	$current = is_readable( $dropin ) ? (string) file_get_contents( $dropin ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$ours    = null === $current || false !== strpos( $current, TK_PC_MARKER . ' drop-in' );

	if ( ! $ours ) {
		$warnings[] = $dropin . ' belongs to another plugin; left alone (the PHP fallback is inactive).';
	} elseif ( 'off' === $cfg['mode'] ) {
		if ( null !== $current ) {
			$log[] = '[remove] ' . $dropin;
			if ( ! $dry_run ) {
				wp_delete_file( $dropin );
			}
		}
	} else {
		$src   = tk_pc_dropin_source( $cfg );
		$log[] = ( $current === $src ? '[ok]     ' : '[write]  ' ) . $dropin;
		if ( ! $dry_run && $current !== $src ) {
			tk_pc_put( $dropin, $src );
		}
		if ( ! ( defined( 'WP_CACHE' ) && WP_CACHE ) ) {
			$warnings[] = "WP_CACHE is not true, so WordPress does not load the drop-in: add define( 'WP_CACHE', true ); to wp-config.php (the rewrite rules work without it).";
		}
	}

	// 4. Root .htaccess block.
	$path    = tk_pc_htaccess_path();
	$before  = is_readable( $path ) ? (string) file_get_contents( $path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$after   = tk_pc_htaccess_with_block( $before, 'rewrite' === $cfg['mode'] ? tk_pc_htaccess_lines( $cfg ) : null );
	$changed = $after !== $before;
	$log[]   = ( $changed ? ( 'rewrite' === $cfg['mode'] ? '[write]  ' : '[remove] ' ) : '[ok]     ' ) . $path . ' (block "' . TK_PC_MARKER . '")';
	if ( ! $dry_run && $changed ) {
		if ( ( file_exists( $path ) && ! wp_is_writable( $path ) ) || ( ! file_exists( $path ) && ! wp_is_writable( dirname( $path ) ) ) ) {
			$warnings[] = $path . ' is not writable; add the block by hand (wp tk cache-setup --print-htaccess).';
		} else {
			tk_pc_put( $path, $after );
		}
	}

	if ( '/' !== (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ) {
		$warnings[] = 'WordPress is not at the domain root; the page cache supports root installs only.';
	}

	if ( ! $dry_run && 'off' === $cfg['mode'] ) {
		tk_pc_purge();
	}

	return compact( 'log', 'warnings' );
}

/*
 * ---- Explicit Cache-Control for the dynamic, non-page responses a proxy might otherwise keep --------
 *
 * robots.txt, llms.txt and the sitemaps change rarely and are fetched mostly by crawlers: public for an
 * hour. The REST API answers may depend on the visitor (authenticated): private, no-cache.
 */

/** Crawler files by request path. */
const TK_PC_CRAWLER_FILES_RE = '~^/(?:robots\.txt|llms\.txt|sitemap[a-z0-9_-]*\.(?:xml|xsl))$~';

add_action(
	'init',
	static function () {
		$path = explode( '?', isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/', 2 )[0]; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		if ( preg_match( TK_PC_CRAWLER_FILES_RE, $path ) && ! headers_sent() ) {
			header( 'Cache-Control: public, max-age=3600' );
		}
	},
	0
);

add_filter(
	'rest_post_dispatch',
	static function ( $response ) {
		if ( $response instanceof WP_HTTP_Response && ! isset( $response->get_headers()['Cache-Control'] ) && ! is_user_logged_in() ) {
			$response->header( 'Cache-Control', 'private, no-cache' );
		}
		return $response;
	}
);

/*
 * ---- Safety net: purge when something that shapes the output changes outside the build pipeline --
 * (build/rebuild.sh itself ends with `wp tk cache-purge` + `wp tk cache-warm`).
 */

/** Options whose change alters rendered pages. */
const TK_PC_PURGE_OPTIONS = array(
	'blogname',
	'blogdescription',
	'siteurl',
	'home',
	'permalink_structure',
	'show_on_front',
	'page_on_front',
	'site_icon',
	'blog_public',
	'WPLANG',
	'timezone_string',
	'date_format',
	'time_format',
	'stylesheet',
	'template',
	'theme_mods_tkadlcik',
	'autodescription-site-settings',
	'elementor_active_kit',
	'elementor_optimized_image_loading',
	'elementor_lazy_load_background_images',
	'elementor_css_print_method',
	'elementor_google_font',
	'elementor_font_display',
	'sidebars_widgets',
	'nav_menu_options',
	// Cookie consent (Complianz): the banner markup/settings and the blocker are part of every cached page.
	'cmplz_options',
	'complianz_options_integrations',
	'cmplz_cookie-statement_custom_page_url',
);

/**
 * Remember that the cache must go; purged once at the end of the request.
 */
function tk_pc_mark_dirty() {
	$GLOBALS['tk_pc_dirty'] = true;
}

/**
 * save_post and friends: ignore revisions, autosaves and auto-drafts.
 *
 * @param int $post_id Post ID.
 */
function tk_pc_on_post_change( $post_id ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) || 'auto-draft' === get_post_status( $post_id ) ) {
		return;
	}

	// A post written while a page renders (a block theme creating its wp_global_styles / wp_navigation
	// fallback on the first view) is not a content change: purging then would discard the parallel
	// captures of cache-warm.
	if ( did_action( 'template_redirect' ) && ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	// Only what the pages are built from (skips oembed_cache, customize_changeset, revisions, …).
	if ( ! in_array( get_post_type( $post_id ), array_merge( TK_PC_POST_TYPES, array( 'attachment', 'elementor_library', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_global_styles', 'wp_navigation' ) ), true ) ) {
		return;
	}

	tk_pc_mark_dirty();
}

foreach ( array( 'save_post', 'deleted_post', 'trashed_post', 'untrashed_post', 'edit_attachment', 'delete_attachment' ) as $tk_pc_hook ) {
	add_action( $tk_pc_hook, 'tk_pc_on_post_change' );
}

foreach ( array( 'switch_theme', 'upgrader_process_complete', 'activated_plugin', 'deactivated_plugin', 'elementor/core/files/clear_cache', 'customize_save_after', 'wp_update_nav_menu', 'edited_term', 'created_term', 'delete_term', 'tk_page_cache_purge' ) as $tk_pc_hook ) {
	add_action( $tk_pc_hook, 'tk_pc_mark_dirty' );
}
unset( $tk_pc_hook );

foreach ( array( 'added_option', 'updated_option', 'deleted_option' ) as $tk_pc_hook ) {
	add_action(
		$tk_pc_hook,
		static function ( $option ) {
			if ( in_array( $option, TK_PC_PURGE_OPTIONS, true ) ) {
				tk_pc_mark_dirty();
			}
		}
	);
}
unset( $tk_pc_hook );

/**
 * shutdown (late): purge once; outside WP-CLI, re-warm shortly after through WP-Cron (a visitor would
 * refill each page on its first view anyway). The build pipeline warms explicitly.
 */
function tk_pc_purge_if_dirty() {
	if ( empty( $GLOBALS['tk_pc_dirty'] ) || ! is_dir( tk_pc_dir() ) ) {
		return;
	}

	$GLOBALS['tk_pc_dirty'] = false;
	tk_pc_purge();

	if ( ! ( defined( 'WP_CLI' ) && WP_CLI ) && 'off' !== tk_pc_config()['mode'] && ! wp_next_scheduled( 'tk_page_cache_warm' ) ) {
		wp_schedule_single_event( time() + 30, 'tk_page_cache_warm' );
	}
}
add_action( 'shutdown', 'tk_pc_purge_if_dirty', 20 );

add_action(
	'tk_page_cache_warm',
	static function () {
		tk_pc_warm( array( 'concurrency' => 2 ) );
	}
);

/**
 * A copied or re-salted site (migration), or a file-only deploy: the cached pages would carry absolute
 * URLs of the old host or the old code's output. Purge once on the first request WordPress handles.
 */
function tk_pc_check_stamp() {
	$file = tk_pc_dir() . '/.ht-stamp';

	if ( ! is_readable( $file ) ) {
		return;
	}

	$stamp = tk_pc_current_stamp();

	if ( trim( (string) file_get_contents( $file ) ) !== $stamp ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		tk_pc_purge();
		tk_pc_put( $file, $stamp );
	}
}
add_action( 'init', 'tk_pc_check_stamp', 1 );

/*
 * ---- Without SSH: Tools → Stránková cache (purge + warm button) --------------------------------
 */

add_action(
	'admin_menu',
	static function () {
		$hook = add_management_page( 'Stránková cache', 'Stránková cache', 'manage_options', 'tk-page-cache', 'tk_pc_admin_page' );

		if ( $hook ) {
			// The screen's two layout rules, printed for this screen only.
			add_action(
				'admin_head-' . $hook,
				static function () {
					echo '<style>.tk-pc-table{max-width:720px}.tk-pc-form{margin-top:16px}</style>';
				}
			);
		}
	}
);

/**
 * Tools → Stránková cache.
 */
function tk_pc_admin_page() {
	$cfg   = tk_pc_config();
	$last  = get_option( 'tk_page_cache_last_warm', array() );
	$files = array_filter( tk_pc_files(), static fn( $f ) => '.html' === substr( $f, -5 ) );
	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- display only; integers, no free text from the URL.
	$done = isset( $_GET['tk_pc_done'] ) ? sprintf( 'Cache obnovena: %d z %d stránek uloženo.', absint( $_GET['tk_pc_done'] ), isset( $_GET['tk_pc_of'] ) ? absint( $_GET['tk_pc_of'] ) : 0 ) : '';
	// phpcs:enable

	echo '<div class="wrap"><h1>Stránková cache</h1>';

	if ( '' !== $done ) {
		echo '<div class="notice notice-success"><p>' . esc_html( $done ) . '</p></div>';
	}

	echo '<p>Každá veřejná stránka je uložená jako statické HTML a server ji posílá bez spuštění WordPressu. Při uložení stránky nebo příspěvku se cache sama smaže a krátce poté znovu naplní. Tlačítko níže ji smaže a hned znovu naplní — použijte ho, když se změna na webu neprojevila.</p>';
	echo '<table class="widefat striped tk-pc-table"><tbody>';
	printf( '<tr><th>Režim</th><td>%s</td></tr>', esc_html( $cfg['mode'] ) );
	printf( '<tr><th>Uložených stránek</th><td>%d z %d</td></tr>', count( $files ), count( tk_pc_urls() ) );
	printf( '<tr><th>Poslední naplnění</th><td>%s</td></tr>', ! empty( $last['time'] ) ? esc_html( wp_date( 'j. n. Y H:i', $last['time'] ) . sprintf( ' (%d/%d)', $last['stored'], $last['urls'] ) ) : '—' );
	echo '</tbody></table>';
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="tk-pc-form">';
	echo '<input type="hidden" name="action" value="tk_page_cache_rebuild">';
	wp_nonce_field( 'tk_page_cache_rebuild' );
	submit_button( 'Smazat a znovu naplnit cache', 'primary', 'submit', false );
	echo '</form></div>';
}

add_action(
	'admin_post_tk_page_cache_rebuild',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Nedostatečná oprávnění.', 403 );
		}

		check_admin_referer( 'tk_page_cache_rebuild' );
		tk_pc_purge();
		$warm   = tk_pc_warm( array( 'concurrency' => 2 ) );
		$stored = count(
			array_filter(
				$warm['results'],
				static fn( $r ) => isset( $r['headers']['x-tk-cache'] ) && 'STORED' === $r['headers']['x-tk-cache']
			)
		);

		wp_safe_redirect(
			add_query_arg(
				array(
					'tk_pc_done' => $stored,
					'tk_pc_of'   => count( $warm['urls'] ),
				),
				admin_url( 'tools.php?page=tk-page-cache' )
			)
		);
		exit;
	}
);
