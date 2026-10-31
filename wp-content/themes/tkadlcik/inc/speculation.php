<?php
/**
 * Speculative loading: prefetch the next page on intent (port of martinadamus inc/speculation.php).
 *
 *   - mode `prefetch` only (downloads the HTML document; no JS runs, nothing is written), never prerender.
 *   - eagerness chosen in the browser: `moderate` (hover ~200 ms / pointerdown) with a fine hover pointer,
 *     `conservative` (pointer/touch down) otherwise; nothing with Save-Data or prefers-reduced-data.
 *   - same-origin page links without a query only; never wp-*.php, wp-admin, wp-content, wp-includes,
 *     wp-json, feeds, xmlrpc, .xml/.txt, rel=nofollow, [data-no-prefetch] or .no-prefetch.
 *
 * The rules are static JSON in a tiny inline script, so the cached page stays one variant for everyone.
 * Core's own rules (footer) are removed; ours are printed early in <head>.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * Path patterns (URLPattern syntax) never speculated.
 *
 * @return string[]
 */
function tk_speculation_exclude_paths() {
	$paths = array( '/wp-*.php', '/wp-admin/*', '/wp-content/*', '/wp-includes/*', '/wp-json/*', '/xmlrpc.php', '/feed/*', '/*/feed/*', '/*.xml', '/*.txt' );

	if ( class_exists( 'WP_URL_Pattern_Prefixer' ) ) {
		$prefixer = new WP_URL_Pattern_Prefixer();
		$paths    = array_map(
			static function ( $p ) use ( $prefixer ) {
				return $prefixer->prefix_path_pattern( $p, 'home' );
			},
			$paths
		);
	}

	/**
	 * Filter: further path patterns never to speculate.
	 *
	 * @param string[] $paths URLPattern path patterns.
	 */
	return array_values( array_unique( (array) apply_filters( 'tk_speculation_exclude_paths', $paths ) ) );
}

/**
 * The rules (eagerness is set in the browser).
 *
 * @return array<string, array>
 */
function tk_speculation_rules() {
	$root = class_exists( 'WP_URL_Pattern_Prefixer' ) ? ( new WP_URL_Pattern_Prefixer() )->prefix_path_pattern( '/*', 'home' ) : '/*';

	return array(
		'prefetch' => array(
			array(
				'source'    => 'document',
				'where'     => array(
					'and' => array(
						array( 'href_matches' => $root ),
						array( 'not' => array( 'href_matches' => $root . '\\?(.+)' ) ),
						array( 'not' => array( 'href_matches' => tk_speculation_exclude_paths() ) ),
						array( 'not' => array( 'selector_matches' => 'a[rel~="nofollow"]' ) ),
						array( 'not' => array( 'selector_matches' => '[data-no-prefetch], [data-no-prefetch] a, .no-prefetch, .no-prefetch a' ) ),
					),
				),
				'eagerness' => 'conservative',
			),
		),
	);
}

/**
 * Same gate as core (no logged-in user, pretty permalinks, not disabled by filter); never in admin, the Elementor editor,
 * Customizer, feeds or embeds.
 *
 * @return bool
 */
function tk_speculation_enabled() {
	if ( is_admin() || is_feed() || is_embed() || is_customize_preview() || tk_is_elementor_editing() ) {
		return false;
	}
	if ( function_exists( 'wp_get_speculation_rules_configuration' ) ) {
		return null !== wp_get_speculation_rules_configuration();
	}
	return ! is_user_logged_in() && (bool) get_option( 'permalink_structure' );
}

/**
 * Print the rules in <head> via a tiny inline script that picks the eagerness.
 */
function tk_print_speculation_rules() {
	if ( ! tk_speculation_enabled() ) {
		return;
	}
	$json = (string) wp_json_encode( tk_speculation_rules(), JSON_HEX_TAG | JSON_UNESCAPED_SLASHES );

	$js = '(function(){var S=HTMLScriptElement;if(!S.supports||!S.supports("speculationrules"))return;'
		. 'var c=navigator.connection;if(c&&c.saveData)return;'
		. 'var m=function(q){return matchMedia(q).matches};if(m("(prefers-reduced-data: reduce)"))return;'
		. 'var r=' . $json . ',e=m("(hover: hover) and (pointer: fine)")?"moderate":"conservative";'
		. 'r.prefetch.forEach(function(x){x.eagerness=e});'
		. 'var s=document.createElement("script");s.type="speculationrules";s.id="tk-speculation-rules";s.textContent=JSON.stringify(r);document.head.appendChild(s)})();';

	wp_print_inline_script_tag( $js, array( 'id' => 'tk-speculation' ) );
}
add_action( 'wp_head', 'tk_print_speculation_rules', 2 );

remove_action( 'wp_footer', 'wp_print_speculation_rules' );
