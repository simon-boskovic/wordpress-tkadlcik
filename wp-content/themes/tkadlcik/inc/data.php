<?php
/**
 * Generated theme data (data/site.json from build/content.mjs) and per-page context (scripts, current path).
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/** Allowed _tk_scripts values (build/generate.mjs SCRIPTS; wp tk page-upsert validates the same list). */
const TK_PAGE_SCRIPTS = array( 'map', 'video', 'breath', 'plate', 'form' );

/**
 * Decoded data/<name>, cached per request. Missing or broken file -> empty array.
 *
 * @param string $name File name inside data/, e.g. site.json.
 * @return array
 */
function tk_theme_json( $name ) {
	static $cache = array();

	if ( ! isset( $cache[ $name ] ) ) {
		$file = TK_THEME_DIR . '/data/' . $name;
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file.
		$data           = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null;
		$cache[ $name ] = is_array( $data ) ? $data : array();
	}

	return $cache[ $name ];
}

/**
 * Header/footer/contact data generated from build/content.mjs, with safe defaults for every key the
 * templates read (so a missing data file never fatals).
 *
 * @return array{brand: array, contact: array, places: array, nav: array, footer: array, business: array}
 */
function tk_site_data() {
	$d = tk_theme_json( 'site.json' );

	return array(
		'brand'   => ( $d['brand'] ?? array() ) + array( 'name' => get_bloginfo( 'name' ), 'tagline' => '' ),
		'contact' => ( $d['contact'] ?? array() ) + array( 'name' => '', 'person' => '', 'phone' => '', 'phoneHref' => '', 'email' => '' ),
		'places'  => $d['places'] ?? array(),
		'nav'     => $d['nav'] ?? array(),
		'footer'  => ( $d['footer'] ?? array() ) + array( 'about' => '', 'links' => array(), 'copyright' => '' ),
		// Operator identification for the footer (§ 435 OZ); empty = the footer prints no such line.
		'business' => is_array( $d['business'] ?? null ) ? $d['business'] : array(),
	);
}

/**
 * Path of the current request with a trailing slash, e.g. /kontakt/.
 *
 * @return string
 */
function tk_current_path() {
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
	$path = (string) wp_parse_url( $uri, PHP_URL_PATH );

	return trailingslashit( '' === $path ? '/' : $path );
}

/**
 * A nav link is current when its path (query ignored) is the current path; links with a hash never are.
 * The 404 has no current item.
 *
 * @param string $href Link target (root-relative).
 * @param string $path Current path.
 * @return bool
 */
function tk_is_current( $href, $path ) {
	if ( is_404() || false !== strpos( $href, '#' ) ) {
		return false;
	}

	return trailingslashit( (string) wp_parse_url( $href, PHP_URL_PATH ) ) === $path;
}

/**
 * Behaviour scripts the generator asked for on this page (_tk_scripts).
 *
 * @return string[]
 */
function tk_page_scripts() {
	$scripts = is_singular( 'page' ) ? get_post_meta( get_queried_object_id(), '_tk_scripts', true ) : array();

	return is_array( $scripts ) ? array_values( array_intersect( $scripts, TK_PAGE_SCRIPTS ) ) : array();
}

/**
 * Images the generator asked the theme to preload on this page (_tk_preload, validated by `wp tk page-upsert`):
 * root-relative /wp-content/uploads/… paths, or { src, sizes } for a responsive preload of an <img>. Normalised to
 * [ 'src' => …, 'sizes' => '' or the sizes ]. Port of ma_page_preloads().
 *
 * @return array<int,array{src:string,sizes:string}>
 */
function tk_page_preloads() {
	$list = is_singular( 'page' ) ? get_post_meta( get_queried_object_id(), '_tk_preload', true ) : array();
	$out  = array();

	foreach ( is_array( $list ) ? $list : array() as $p ) {
		$src   = is_array( $p ) ? ( $p['src'] ?? null ) : $p;
		$sizes = is_array( $p ) && isset( $p['sizes'] ) && is_string( $p['sizes'] ) ? $p['sizes'] : '';

		if ( is_string( $src ) && 0 === strpos( $src, '/wp-content/uploads/' ) ) {
			$out[] = array( 'src' => $src, 'sizes' => $sizes );
		}
	}

	return $out;
}

/**
 * The arrow icon from the design (header/footer/404 only; page markup carries its own copy).
 */
function tk_arrow() {
	echo '<svg class="arr" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
}
