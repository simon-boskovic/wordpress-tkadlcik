<?php
/**
 * Plugin Name: TK Build Tools
 * Description: WP-CLI commands (wp tk …) that set up the site, its pages and the page cache. CLI only — registers nothing on a web request.
 * Version: 1.0.0
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

// Locally WP-CLI already loaded the class before WordPress (wp-cli.yml), so site-setup can install it.
if ( defined( 'WP_CLI' ) && WP_CLI && ! defined( 'TK_BUILD_COMMAND_LOADED' ) ) {
	require_once __DIR__ . '/tk-build/class-tk-build-command.php';
}
