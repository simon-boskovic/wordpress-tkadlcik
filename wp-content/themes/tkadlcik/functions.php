<?php
/**
 * Radost v pohybu child theme (Hello Elementor).
 *
 * Page content is generated (build/generate.mjs -> Elementor HTML widgets). This theme renders what every page
 * shares — header, footer, global CSS, behaviour scripts — ported from the Claude Design prototype, and reads
 * its data from data/site.json (also generated). Same architecture as the martinadamus theme.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

define( 'TK_THEME_DIR', get_stylesheet_directory() );
define( 'TK_THEME_URI', get_stylesheet_directory_uri() );

require_once TK_THEME_DIR . '/inc/data.php';
require_once TK_THEME_DIR . '/inc/elementor.php';
require_once TK_THEME_DIR . '/inc/fonts.php';
require_once TK_THEME_DIR . '/inc/assets.php';
require_once TK_THEME_DIR . '/inc/responsive-images.php';
require_once TK_THEME_DIR . '/inc/cleanup.php';
require_once TK_THEME_DIR . '/inc/seo.php';
require_once TK_THEME_DIR . '/inc/speculation.php';
require_once TK_THEME_DIR . '/inc/consent.php';

/**
 * Theme supports. Hello Elementor (the parent) declares these as well; repeated here so the child never
 * renders without a <title> (e.g. right after the theme switch, before the parent is loaded).
 */
function tk_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'style', 'script' ) );
}
add_action( 'after_setup_theme', 'tk_setup' );
