<?php
/**
 * Elementor integration.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * Inside the Elementor editor or its preview iframe (reveal would hide content while editing).
 *
 * @return bool
 */
function tk_is_elementor_editing() {
	if ( ! class_exists( '\Elementor\Plugin' ) ) {
		return false;
	}

	$plugin = \Elementor\Plugin::$instance;

	return ( $plugin->editor && $plugin->editor->is_edit_mode() ) || ( $plugin->preview && $plugin->preview->is_preview_mode() );
}
