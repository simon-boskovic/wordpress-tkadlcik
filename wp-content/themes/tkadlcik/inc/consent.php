<?php
/**
 * Cookie consent (port of martinadamus R45): how the theme lives with Complianz. The consent logic itself is
 * Complianz's (strict opt-in, Site Kit's Google tag blocked until consent to statistics; configured by
 * `wp tk consent-setup`, see mu-plugins/tk-build/consent.php). This file only keeps its front-end output inside
 * the theme's rules:
 *   - its CSS goes through wp_enqueue_style, so tk_inline_style_tag() prints it inline in `@layer tk` like every
 *     other stylesheet (Complianz hand-prints one `<style>.cmplz-hidden…` in wp_head: moved into the layer);
 *   - its banner JS must not inject a second, unlayered copy of the banner stylesheet when the theme has printed
 *     that stylesheet inline (complianz.js only recognises a `<link id="cmplz-banner-…-css">`);
 *   - the footer's "Nastavení cookies" link (footer.php) reopens the banner through assets/js/consent.js
 *     (inlined like the other theme scripts by tk_inline_script_tag()).
 * Nothing here runs when Complianz is not active.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/** The privacy page's cookie section: the footer link's no-JS fallback (same as the banner's policy link). */
const TK_CONSENT_FALLBACK_PATH = '/zasady-ochrany-osobnich-udaju/#cookies';

/**
 * Whether Complianz's banner runs on this site.
 *
 * @return bool
 */
function tk_consent_active() {
	return class_exists( 'COMPLIANZ' );
}

/**
 * wp: replace Complianz's hand-printed `.cmplz-hidden` <style> (unlayered) with the same rule inside the theme's
 * layered CSS.
 */
function tk_consent_move_hidden_rule() {
	if ( ! class_exists( 'COMPLIANZ' ) || ! isset( COMPLIANZ::$banner_loader ) ) {
		return;
	}
	if ( false !== has_action( 'wp_head', array( COMPLIANZ::$banner_loader, 'cookiebanner_css' ) ) ) {
		remove_action( 'wp_head', array( COMPLIANZ::$banner_loader, 'cookiebanner_css' ) );
		add_action(
			'wp_enqueue_scripts',
			static fn() => wp_add_inline_style( 'tk-site', '.cmplz-hidden{display:none!important}' ),
			21
		);
	}
}
add_action( 'wp', 'tk_consent_move_hidden_rule' );

/**
 * complianz.js looks for the banner stylesheet as a <link id="cmplz-banner-<id>-<type>-css"> and, when it finds
 * none, appends a <link> to the file itself — unlayered, outranking site.css (R36). The theme prints that
 * stylesheet inline (tk_inline_style_tag(): `<style id=…>@layer tk{…}</style>`), so the banner's own copy is
 * already applied; hand the script an empty stylesheet to "load" instead.
 *
 * @param array $settings Complianz front-end settings (window.complianz).
 * @return array
 */
function tk_consent_front_end_settings( $settings ) {
	if ( is_array( $settings ) && isset( $settings['css_file'] ) && ( tk_perf_enabled() || tk_layers_enabled() ) ) {
		$settings['css_file'] = 'data:text/css,';
	}
	// A "URL" cookie statement gets its title from Complianz's config, built before translations load
	// ("Cookie Policy"); the banner says "Zásady cookies".
	if ( isset( $settings['page_links']['eu']['cookie-statement'] ) && is_array( $settings['page_links']['eu']['cookie-statement'] ) ) {
		$settings['page_links']['eu']['cookie-statement']['title'] = 'Zásady cookies';
	}
	return $settings;
}
add_filter( 'cmplz_cookiebanner_settings_front_end', 'tk_consent_front_end_settings' );

/**
 * The footer link's behaviour (reopen the banner, keyboard focus into it, GA cookies removed and the page
 * reloaded when statistics consent is withdrawn). Only where Complianz's banner script runs.
 */
function tk_consent_enqueue() {
	if ( ! wp_script_is( 'cmplz-cookiebanner', 'enqueued' ) || tk_is_elementor_editing() ) {
		return;
	}
	wp_enqueue_script(
		'tk-consent',
		TK_THEME_URI . '/assets/js/consent.js',
		array( 'cmplz-cookiebanner' ),
		tk_asset_ver( 'assets/js/consent.js' ),
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
}
add_action( 'wp_enqueue_scripts', 'tk_consent_enqueue', PHP_INT_MAX - 40 ); // After Complianz (PHP_INT_MAX - 50).

/*
 * No Site Kit generator meta (version disclosure, nothing a crawler uses; martinadamus R63): Site Kit prints it
 * through the filter googlesitekit_generator (wp_head + login_head). The Elementor one is off in inc/seo.php.
 */
add_filter( 'googlesitekit_generator', '__return_empty_string' );
