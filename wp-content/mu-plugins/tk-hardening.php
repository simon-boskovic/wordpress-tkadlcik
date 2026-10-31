<?php
/**
 * Plugin Name: TK Hardening
 * Description: No user enumeration for anonymous visitors: the REST users routes are gone and author archives (?author=N, /author/<name>/) answer 404 instead of redirecting to the login name. No XML-RPC and no pingbacks.
 * Version: 1.0.0
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * /wp-json/wp/v2/users would list the login names to anyone. The site
 * has no public author content, so anonymous requests get no users routes at all (rest_no_route, 404).
 * Logged-in users keep them (the block editor and wp-admin use them). The REST server applies this
 * filter after its cookie check, so a cookie without a nonce counts as anonymous here too.
 *
 * @param array $endpoints REST routes.
 * @return array
 */
function tk_hardening_rest_endpoints( $endpoints ) {
	if ( is_user_logged_in() ) {
		return $endpoints;
	}

	foreach ( array_keys( $endpoints ) as $route ) {
		if ( '/wp/v2/users' === $route || 0 === strpos( $route, '/wp/v2/users/' ) ) {
			unset( $endpoints[ $route ] );
		}
	}

	return $endpoints;
}
add_filter( 'rest_endpoints', 'tk_hardening_rest_endpoints' );

/**
 * Whether this request is an author archive an anonymous visitor must not see.
 *
 * @return bool
 */
function tk_hardening_is_author_request() {
	if ( is_user_logged_in() || is_admin() ) {
		return false;
	}

	return isset( $_GET['author'] ) || is_author(); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only check.
}

/**
 * ?author=N is a plain 404 for anonymous visitors. WordPress's redirect_canonical() would 301 it to
 * /author/<login>/ (the login name again); /author/<login>/ itself is a 404 too. Priority 0: before
 * redirect_canonical (template_redirect, 10) runs, which is then skipped for this request.
 */
function tk_hardening_author_404() {
	if ( ! tk_hardening_is_author_request() ) {
		return;
	}

	global $wp_query;
	$wp_query->set_404();
	status_header( 404 );
	nocache_headers();
	remove_action( 'template_redirect', 'redirect_canonical' );
}
add_action( 'template_redirect', 'tk_hardening_author_404', 0 );

/*
 * XML-RPC is off: the site has no remote publishing client, no Jetpack and pings are closed. xmlrpc.php is a
 * brute-force (system.multicall) and pingback-DDoS target. Three layers:
 *   - the .htaccess block of tk-security-headers answers /xmlrpc.php with a 404 before PHP starts;
 *   - xmlrpc_enabled false (no authenticated methods) and no methods at all (pingback.ping, system.* would
 *     still be served with xmlrpc_enabled false) for hosts that ignore .htaccess;
 *   - no X-Pingback header and no pingback discovery anywhere.
 */
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'xmlrpc_methods', '__return_empty_array', PHP_INT_MAX );
add_filter( 'pings_open', '__return_false', PHP_INT_MAX );

/**
 * No X-Pingback response header (WordPress adds it to singular views when pings are open; this covers a
 * plugin or a later change of the default too).
 *
 * @param array $headers Response headers.
 * @return array
 */
function tk_hardening_wp_headers( $headers ) {
	unset( $headers['X-Pingback'] );
	return $headers;
}
add_filter( 'wp_headers', 'tk_hardening_wp_headers', PHP_INT_MAX );

/** No pingback URL in bloginfo('pingback_url') either (themes print <link rel="pingback"> from it). */
add_filter(
	'bloginfo_url',
	static fn( $output, $show ) => 'pingback_url' === $show ? '' : $output,
	10,
	2
);
