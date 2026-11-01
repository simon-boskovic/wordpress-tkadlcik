<?php
/**
 * Plugin Name: TK Redirects
 * Description: The old Webnode site's URLs that changed in the redesign (approved 2026-11-01): 301 to their new home, and 410 for the deleted placeholder page. No redirects plugin; the list is fixed in code.
 * Version: 1.0.0
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/** Old path => new path (301). Paths are lowercase, with the trailing slash. */
const TK_REDIRECTS = array(
	'/prazdna-stranka2/'                  => '/seminar-vincent-chu/',
	'/cviceni-na-akci-s-jirim-ledvinou/'  => '/seminar-vincent-chu/',
	'/reference/'                         => '/clanky/#co-je',
	'/home/'                              => '/',
);

/** Old paths that are gone for good (410): the template placeholder page. */
const TK_GONE = array( '/prazdna-stranka/' );

/**
 * The request path normalised for the lookup (no query, lowercase, one trailing slash).
 *
 * @param string $uri REQUEST_URI.
 * @return string
 */
function tk_redirect_path( $uri ) {
	$path = (string) wp_parse_url( (string) $uri, PHP_URL_PATH );
	$path = '/' . trim( strtolower( rawurldecode( $path ) ), '/' ) . '/';
	return '//' === $path ? '/' : $path;
}

/**
 * Before WordPress's own canonical redirect (priority 10), which would otherwise guess a similar page.
 */
function tk_redirects() {
	if ( is_admin() ) {
		return;
	}
	$path = tk_redirect_path( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- only compared against fixed keys.
	if ( isset( TK_REDIRECTS[ $path ] ) ) {
		wp_safe_redirect( home_url( TK_REDIRECTS[ $path ] ), 301, 'TK Redirects' );
		exit;
	}
	if ( in_array( $path, TK_GONE, true ) ) {
		global $wp_query;
		$wp_query->set_404();
		status_header( 410 );
		nocache_headers();
	}
}
add_action( 'template_redirect', 'tk_redirects', 0 );

/**
 * SEO audit 2026-11-01 (low): /favicon.ico is a permanent redirect to the site icon (WordPress core answers it with
 * a 302 by default).
 */
function tk_favicon_301() {
	$url = get_site_icon_url( 32 );
	if ( $url ) {
		wp_safe_redirect( $url, 301, 'TK Redirects' );
		exit;
	}
}
add_action( 'do_faviconico', 'tk_favicon_301', 0 );

/**
 * The site has no posts, so category and tag archives (e.g. /category/uncategorized/) are a plain 404 instead of an
 * empty noindex page.
 */
function tk_no_taxonomy_archives() {
	if ( ( is_category() || is_tag() ) && ! is_admin() ) {
		global $wp_query;
		$wp_query->set_404();
		status_header( 404 );
		nocache_headers();
	}
}
add_action( 'template_redirect', 'tk_no_taxonomy_archives', 1 );

/**
 * /.well-known/security.txt (RFC 9116): where to report a security problem. Contact = the operator's e-mail
 * (the only published address); Expires one year after the file was last checked; change both with the domain.
 */
function tk_security_txt() {
	$path = (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- compared to a fixed path.
	if ( '/.well-known/security.txt' !== $path ) {
		return;
	}
	status_header( 200 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	header( 'Cache-Control: public, max-age=86400' );
	echo "Contact: mailto:tkadlcik@centrum.cz\n";
	echo "Expires: 2027-11-01T00:00:00.000Z\n";
	echo 'Canonical: ' . esc_url_raw( home_url( '/.well-known/security.txt' ) ) . "\n";
	echo "Preferred-Languages: cs, en\n";
	exit;
}
add_action( 'parse_request', 'tk_security_txt', 0 );
