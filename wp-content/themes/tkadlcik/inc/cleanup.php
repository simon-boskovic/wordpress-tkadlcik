<?php
/**
 * Remove what WordPress prints by default but this site never uses: emoji, global styles, oEmbed / REST / RSD /
 * shortlink / generator / feed links in <head>. (Unused CSS/JS handles are dequeued in inc/assets.php.)
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * Head and emoji cleanup.
 */
function tk_cleanup_head() {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
	add_filter( 'emoji_svg_url', '__return_false' );

	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head', 10 );
	remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links', 10 );
	remove_action( 'wp_head', 'wp_oembed_add_host_js' );
	remove_action( 'wp_head', 'feed_links', 2 );
	remove_action( 'wp_head', 'feed_links_extra', 3 );
	remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );
	remove_action( 'wp_head', 'wp_print_auto_sizes_contain_css_fix', 1 );
	remove_action( 'template_redirect', 'rest_output_link_header', 11 );
	remove_action( 'template_redirect', 'wp_shortlink_header', 11 );

	// Global styles / block supports / SVG filters (block themes only).
	remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
	remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
	remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
}
add_action( 'init', 'tk_cleanup_head' );

/**
 * No dns-prefetch for s.w.org (emoji CDN).
 *
 * @param array  $urls          URLs.
 * @param string $relation_type Relation.
 * @return array
 */
function tk_resource_hints( $urls, $relation_type ) {
	if ( 'dns-prefetch' === $relation_type ) {
		$urls = array_filter(
			$urls,
			static function ( $u ) {
				$href = is_array( $u ) ? ( $u['href'] ?? '' ) : $u;
				return false === strpos( (string) $href, 's.w.org' );
			}
		);
	}
	return $urls;
}
add_filter( 'wp_resource_hints', 'tk_resource_hints', 10, 2 );

/** No auto-sizes inline CSS fix for lazy images (no such images; keeps <head> clean). */
add_filter( 'wp_img_tag_add_auto_sizes', '__return_false' );

/**
 * Body classes: `site` carries the design's base typography (the prototype's .site wrapper).
 *
 * @param string[] $classes Classes.
 * @return string[]
 */
function tk_body_class( $classes ) {
	$classes[] = 'site';
	return $classes;
}
add_filter( 'body_class', 'tk_body_class' );
