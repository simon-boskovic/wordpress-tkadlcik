<?php
/**
 * Page cache — PHP serving path, included by wp-content/advanced-cache.php (WP_CACHE).
 *
 * Runs before WordPress connects to the database. When the .htaccess rewrite rules already answered the
 * request, PHP never starts; this is the fallback for hosts where they cannot (no mod_rewrite, a
 * server that ignores .htaccess, AllowOverride None) and for URLs the rules deliberately leave out
 * (tracking parameters such as ?utm_source=…, which are dropped from the cache key here). Marks its
 * responses "X-TK-Cache: HIT-PHP". Anything it does not serve falls through to WordPress unchanged.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.Security.ValidatedSanitizedInput -- raw server values, only matched against strict patterns.

if ( 'cli' === PHP_SAPI || empty( $_SERVER['REQUEST_METHOD'] ) ) {
	return;
}

require_once __DIR__ . '/lib.php';

( static function () {
	$dir = defined( 'TK_PAGE_CACHE_DIR' ) ? TK_PAGE_CACHE_DIR : WP_CONTENT_DIR . '/cache/tk-page';
	$d   = tk_pc_decide(
		array(
			'method' => $_SERVER['REQUEST_METHOD'],
			'host'   => isset( $_SERVER['HTTP_HOST'] ) ? $_SERVER['HTTP_HOST'] : '',
			'uri'    => isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '/',
			'cookie' => isset( $_SERVER['HTTP_COOKIE'] ) ? $_SERVER['HTTP_COOKIE'] : '',
			'warm'   => ! empty( $_SERVER['HTTP_X_TK_CACHE_WARM'] ),
		),
		array( 'host' => defined( 'TK_PAGE_CACHE_HOST' ) ? TK_PAGE_CACHE_HOST : '' )
	);

	if ( ! $d['cache'] ) {
		return;
	}

	$file = $dir . '/' . $d['file'];

	if ( ! is_file( $file ) ) {
		return;
	}

	$enc  = tk_pc_pick_encoding( isset( $_SERVER['HTTP_ACCEPT_ENCODING'] ) ? $_SERVER['HTTP_ACCEPT_ENCODING'] : '', is_file( $file . '.br' ), is_file( $file . '.gz' ) );
	$send = $file . ( 'br' === $enc ? '.br' : ( 'gzip' === $enc ? '.gz' : '' ) );
	$stat = @stat( $send ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- a purge may race us; fall through to WordPress.

	if ( ! $stat ) {
		return;
	}

	$etag = '"' . dechex( $stat['mtime'] ) . '-' . dechex( $stat['size'] ) . ( '' !== $enc ? '-' . $enc : '' ) . '"';
	$last = gmdate( 'D, d M Y H:i:s', $stat['mtime'] ) . ' GMT';

	if ( function_exists( 'ini_set' ) ) {
		ini_set( 'zlib.output_compression', '0' ); // phpcs:ignore WordPress.PHP.IniSet.Risky -- the body may already be compressed.
	}

	// Security headers: WordPress (and so tk-security-headers.php) never starts for a HIT-PHP.
	$sec = dirname( __DIR__ ) . '/tk-security-headers/lib.php';
	if ( is_file( $sec ) ) {
		require_once $sec;
		tk_sec_send( $_SERVER );
	}

	header( 'Content-Type: text/html; charset=UTF-8' );
	header( 'Cache-Control: ' . tk_pc_cache_control( defined( 'TK_PAGE_CACHE_EDGE_TTL' ) ? TK_PAGE_CACHE_EDGE_TTL : 0 ) );
	header( 'Vary: Accept-Encoding' );
	header( 'ETag: ' . $etag );
	header( 'Last-Modified: ' . $last );
	header( 'X-TK-Cache: HIT-PHP' );

	if ( '' !== $enc ) {
		header( 'Content-Encoding: ' . $enc );
	}

	$inm = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? trim( $_SERVER['HTTP_IF_NONE_MATCH'] ) : '';
	$ims = isset( $_SERVER['HTTP_IF_MODIFIED_SINCE'] ) ? strtotime( $_SERVER['HTTP_IF_MODIFIED_SINCE'] ) : false;

	if ( ( '' !== $inm && ( '*' === $inm || in_array( $etag, array_map( 'trim', explode( ',', str_replace( 'W/', '', $inm ) ) ), true ) ) )
		|| ( '' === $inm && $ims && $ims >= $stat['mtime'] ) ) {
		http_response_code( 304 );
		exit;
	}

	header( 'Content-Length: ' . $stat['size'] );

	if ( 'HEAD' !== strtoupper( $_SERVER['REQUEST_METHOD'] ) ) {
		readfile( $send ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile -- static file.
	}

	exit;
} )();
