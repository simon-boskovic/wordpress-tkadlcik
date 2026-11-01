<?php
/**
 * Cookie consent (port of martinadamus Ruling R45): the Complianz settings this site needs, applied by
 * `wp tk consent-setup` and checked by `wp tk doctor`. CLI only (loaded by class-tk-build-command.php).
 *
 * The integration, verified in the plugin code (Complianz 7.5.5, Site Kit 1.188.0):
 * - Complianz's own Site Kit integration (integrations/plugins/google-site-kit.php) whitelists Site Kit's
 *   tag for the cookie blocker (`google_gtagjs-js`, `google_gtagjs-js-after`) and only adds Consent Mode
 *   defaults ("advanced" Consent Mode: gtag.js loads and pings Google before consent).
 * - Strict opt-in therefore turns that integration off (Complianz → Integrace → Pluginy → Google Site Kit,
 *   option complianz_options_integrations[google-site-kit] = false), sets statistics = Google Analytics
 *   with configuration by Complianz = no: the cookie blocker then treats Site Kit's
 *   <script src="https://www.googletagmanager.com/gtag/js?id=…"> like any known statistics script
 *   (integrations/statistics/google-analytics.php → class-cookie-blocker.php replace_tags()):
 *   type="text/plain" data-category="statistics", src → data-cmplz-src. Complianz's banner JS turns it
 *   back into a real script only after consent to statistics. The inline gtag() queue stays executable
 *   (it only fills window.dataLayer, no request, no cookie) and is processed once gtag.js loads.
 * - Consent Mode stays OFF, exactly as on martinadamus.cz: with the tag blocked until consent nothing (not even
 *   a cookieless Consent Mode ping) reaches Google before the visitor agrees.
 *
 * Complianz's generated cookie policy is not used (like martinadamus): the banner's "Zásady cookies" link and
 * the footer's no-JS fallback point to the site's own privacy page, section #cookies.
 *
 * @package Tkadlcik
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || defined( 'TK_CONSENT_LOADED' ) ) {
	return;
}
define( 'TK_CONSENT_LOADED', true );

/** Complianz version this configuration was verified against (same as martinadamus.cz). */
const TK_CONSENT_COMPLIANZ_VERSION = '7.5.5';

/** Site Kit version (its tag markup was verified against Complianz's blocker in this version). */
const TK_CONSENT_SITEKIT_VERSION = '1.188.0';

/** Where the banner's "Zásady cookies" link and the footer link's no-JS fallback point. */
const TK_CONSENT_POLICY_PATH = '/zasady-ochrany-osobnich-udaju/#cookies';

/**
 * Complianz wizard/settings options (cmplz_options) this site needs. Everything else stays as it is.
 *
 * @return array<string,mixed>
 */
function tk_consent_options() {
	return array(
		'regions'                           => 'eu',
		'enable_cookie_banner'              => 'yes',
		'enable_cookie_blocker'             => 'yes',
		'safe_mode'                         => false,
		'consent_per_service'               => 'no',
		// Statistics = Google Analytics inserted by Site Kit; Complianz only blocks it until consent.
		'compile_statistics'                => 'google-analytics',
		'compile_statistics_more_info'      => array(),
		'consent_for_anonymous_stats'       => 'yes',
		'configuration_by_complianz'        => 'no',
		// Strict: no Consent Mode, so nothing (not even a cookieless ping) reaches Google before consent.
		'consent-mode'                      => 'no',
		// No marketing/third-party content. The Google maps and YouTube videos are our own click-to-load facades.
		'uses_thirdparty_services'          => 'no',
		'uses_social_media'                 => 'no',
		'uses_firstparty_marketing_cookies' => 'no',
		'uses_ad_cookies'                   => 'no',
		'uses_wordpress_comments'           => 'no',
		'cookie_expiry'                     => 365,
		'cookie-statement'                  => 'url',
		'privacy-statement'                 => 'none',
		'impressum'                         => 'none',
	);
}

/**
 * Plain WordPress options Complianz reads next to cmplz_options.
 *
 * @return array<string,mixed>
 */
function tk_consent_wp_options() {
	return array(
		'cmplz_cookie-statement_custom_page_url' => home_url( TK_CONSENT_POLICY_PATH ),
		'cmplz_wizard_completed_once'            => true,
	);
}

/**
 * The default banner's settings: Czech texts (martinadamus wording adapted), the dark-only site's palette as
 * fallback hex values (surface #171917 card, ink #F2F2EE text, Jade #0F766E buttons/toggles, 24 px card radius,
 * pill buttons) and the site's own CSS (assets/css/consent-banner.css), which re-points Complianz's colour
 * variables to the theme tokens. Přijmout and Odmítnout have equal weight (both Jade pills).
 *
 * @return array<string,mixed>
 */
function tk_consent_banner() {
	$css_file = get_stylesheet_directory() . '/assets/css/consent-banner.css';
	$css      = is_readable( $css_file ) ? trim( (string) file_get_contents( $css_file ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file.
	$px       = static fn( $n ) => array( 'top' => (string) $n, 'right' => (string) $n, 'bottom' => (string) $n, 'left' => (string) $n, 'type' => 'px' );
	$accent   = array( 'background' => '#0f766e', 'border' => '#0f766e', 'text' => '#ffffff' );

	return array(
		'position'                     => 'bottom-right',
		'animation'                    => 'none',
		'use_categories'               => 'view-preferences',
		'manage_consent_options'       => 'hide-everywhere', // the footer's "Nastavení cookies" reopens it.
		'checkbox_style'               => 'slider',
		'use_logo'                     => 'hide',
		'close_button'                 => true,
		'legal_documents'              => true,
		'soft_cookiewall'              => false,
		'dismiss_on_scroll'            => false,
		'dismiss_on_timeout'           => false,
		'disable_cookiebanner'         => false,
		'header'                       => array( 'text' => 'Nastavení cookies', 'show' => true ),
		'message_optin'                => 'Se souhlasem se na webu načtou statistické cookies Google Analytics, podle kterých vidím, jak se web používá. Bez souhlasu se nenačtou a web funguje stejně. Volbu lze kdykoli změnit odkazem „Nastavení cookies“ v patičce.',
		'accept'                       => 'Přijmout',
		'dismiss'                      => array( 'text' => 'Odmítnout', 'show' => true ),
		'view_preferences'             => 'Zobrazit preference',
		'save_preferences'             => 'Uložit preference',
		'revoke'                       => 'Spravovat souhlas',
		'category_functional'          => 'Funkční',
		'functional_text'              => array( 'text' => 'Nezbytné pro fungování webu a pro zapamatování této volby. Souhlas nevyžadují.', 'show' => true ),
		'category_prefs'               => array( 'text' => 'Preference', 'show' => false ),
		'preferences_text'             => array( 'text' => 'Ukládání preferencí, které si návštěvník sám nevyžádal. Web je nepoužívá.', 'show' => true ),
		'category_stats'               => array( 'text' => 'Statistické', 'show' => true ),
		'statistics_text'              => array( 'text' => 'Google Analytics (Google Ireland Ltd.) měří návštěvnost webu. Načte se jen se souhlasem.', 'show' => true ),
		'category_all'                 => array( 'text' => 'Marketingové', 'show' => false ),
		'marketing_text'               => array( 'text' => 'Web nepoužívá marketingové ani reklamní cookies.', 'show' => true ),
		'font_size'                    => 15,
		'banner_width'                 => 526,
		'colorpalette_background'      => array( 'color' => '#171917', 'border' => '#2f312e' ),
		'colorpalette_text'            => array( 'color' => '#f2f2ee', 'hyperlink' => '#f2f2ee' ),
		'colorpalette_toggles'         => array( 'background' => '#0f766e', 'bullet' => '#0e0f0e', 'inactive' => '#a9aba5' ),
		'colorpalette_button_accept'   => $accent,
		'colorpalette_button_deny'     => $accent, // equal prominence: refusing is as easy as accepting.
		'colorpalette_button_settings' => array( 'background' => '#171917', 'border' => '#2f312e', 'text' => '#f2f2ee' ),
		'colorpalette_border_radius'   => $px( 24 ),
		'buttons_border_radius'        => $px( 999 ),
		'border_width'                 => array( 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1' ),
		'use_box_shadow'               => true,
		'header_footer_shadow'         => false,
		'use_custom_cookie_css'        => true,
		'custom_css'                   => $css,
	);
}

/**
 * Normalise a value for comparison (Complianz stores booleans/ints loosely, arrays with string numbers).
 *
 * @param mixed $v Value.
 * @return string
 */
function tk_consent_norm( $v ) {
	if ( is_bool( $v ) ) {
		return $v ? '1' : '';
	}
	if ( is_array( $v ) ) {
		ksort( $v );
		return (string) wp_json_encode( array_map( 'tk_consent_norm', $v ) );
	}
	if ( null === $v || false === $v || 0 === $v || '0' === $v ) {
		return ''; // Complianz stores unchecked flags as 0/'0'/false interchangeably.
	}
	return 1 === $v ? '1' : trim( (string) $v );
}

/**
 * Short printable form of a value.
 *
 * @param mixed $v Value.
 * @return string
 */
function tk_consent_show( $v ) {
	$s = is_scalar( $v ) || null === $v ? var_export( $v, true ) : (string) wp_json_encode( $v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export
	return mb_strlen( $s ) > 90 ? mb_substr( $s, 0, 87 ) . '...' : $s;
}

/**
 * Whether Complianz is loaded, in the verified version.
 *
 * @return string '' when usable, else the reason.
 */
function tk_consent_unavailable() {
	if ( ! class_exists( 'COMPLIANZ' ) || ! function_exists( 'cmplz_get_option' ) ) {
		return 'Complianz (complianz-gdpr) is not active.';
	}
	if ( ! defined( 'CMPLZ_VERSION' ) || version_compare( CMPLZ_VERSION, '7.5', '<' ) || version_compare( CMPLZ_VERSION, '7.6', '>=' ) ) {
		return sprintf( 'Complianz %s: this configuration was verified against %s (7.5.x); re-check the integration in the plugin code before applying.', defined( 'CMPLZ_VERSION' ) ? CMPLZ_VERSION : '?', TK_CONSENT_COMPLIANZ_VERSION );
	}
	return '';
}

/**
 * Whether Complianz's cookie table is missing (fresh install configured from WP-CLI only).
 *
 * @return bool
 */
function tk_consent_cookie_table_missing() {
	global $wpdb;
	$table = $wpdb->prefix . 'cmplz_cookies';
	return $table !== $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
}

/**
 * Compare the install with the desired configuration. Only the keys listed above are looked at.
 *
 * @return array{changes: array<int,array{what:string,from:mixed,to:mixed}>, ok: array<int,string>}
 */
function tk_consent_diff() {
	$changes = array();
	$ok      = array();

	$cmplz = get_option( 'cmplz_options', array() );
	$cmplz = is_array( $cmplz ) ? $cmplz : array();
	foreach ( tk_consent_options() as $key => $want ) {
		$have = $cmplz[ $key ] ?? null;
		if ( tk_consent_norm( $have ) === tk_consent_norm( $want ) ) {
			$ok[] = 'cmplz_options[' . $key . ']';
		} else {
			$changes[] = array( 'what' => 'cmplz_options[' . $key . ']', 'from' => $have, 'to' => $want );
		}
	}

	foreach ( tk_consent_wp_options() as $key => $want ) {
		$have = get_option( $key, null );
		if ( tk_consent_norm( $have ) === tk_consent_norm( $want ) ) {
			$ok[] = $key;
		} else {
			$changes[] = array( 'what' => $key, 'from' => $have, 'to' => $want );
		}
	}

	if ( tk_consent_cookie_table_missing() ) {
		$changes[] = array( 'what' => 'table ' . $GLOBALS['wpdb']->prefix . 'cmplz_cookies', 'from' => 'missing', 'to' => 'created' );
	} else {
		$ok[] = 'table cmplz_cookies';
	}

	$integrations = get_option( 'complianz_options_integrations', array() );
	$sitekit      = is_array( $integrations ) && array_key_exists( 'google-site-kit', $integrations ) ? (bool) $integrations['google-site-kit'] : true; // Complianz default: enabled.
	if ( $sitekit ) {
		$changes[] = array( 'what' => 'complianz_options_integrations[google-site-kit]', 'from' => true, 'to' => false );
	} else {
		$ok[] = 'complianz_options_integrations[google-site-kit]';
	}

	$banner = tk_consent_default_banner();
	foreach ( tk_consent_banner() as $prop => $want ) {
		$have = $banner && property_exists( $banner, $prop ) ? $banner->{$prop} : null;
		if ( $banner && tk_consent_norm( $have ) === tk_consent_norm( $want ) ) {
			$ok[] = 'banner.' . $prop;
		} else {
			$changes[] = array( 'what' => 'banner.' . $prop, 'from' => $banner ? $have : '(no banner yet)', 'to' => $want );
		}
	}

	return array( 'changes' => $changes, 'ok' => $ok );
}

/**
 * The default Complianz banner, or null when there is none (or the table does not exist yet).
 *
 * @return CMPLZ_COOKIEBANNER|null
 */
function tk_consent_default_banner() {
	if ( ! get_option( 'cmplz_cbdb_version' ) || ! function_exists( 'cmplz_get_default_banner_id' ) ) {
		return null;
	}
	$id = (int) cmplz_get_default_banner_id();
	if ( $id <= 0 ) {
		return null;
	}
	$banner = new CMPLZ_COOKIEBANNER( $id );
	return $banner->ID ? $banner : null;
}

/**
 * Apply the configuration the way Complianz's own admin does (activation tasks, cmplz_update_option() with
 * its save hooks, banner->save() which regenerates uploads/complianz/css/banner-<id>-optin.css).
 *
 * @return array<int,string> Log lines.
 */
function tk_consent_apply() {
	$log = array();

	// What the first wp-admin visit after activation does (class-admin.php activation()).
	if ( function_exists( 'cmplz_add_manage_privacy_capability' ) ) {
		cmplz_add_manage_privacy_capability();
	}
	if ( get_option( 'cmplz_run_activation' ) && isset( COMPLIANZ::$admin ) ) {
		COMPLIANZ::$admin->activation();
		$log[] = 'ran Complianz activation (tables, capability)';
	}
	if ( ! get_option( 'cmplz_cbdb_version' ) ) {
		cmplz_install_cookiebanner_table( true );
		$log[] = 'installed the cookie banner table';
	}
	if ( tk_consent_cookie_table_missing() && function_exists( 'cmplz_install_cookie_table' ) ) {
		// Complianz creates its cookie/service tables only in wp-admin or WP-Cron (cookie/class-cookie.php
		// cmplz_install_cookie_table()); a fresh install set up from WP-CLI never had either (deploy rehearsal
		// 2026-11-01: "Table wp_cmplz_cookies doesn't exist" on every save). Run it as WP-Cron would.
		$as_cron = static function () {
			return true;
		};
		add_filter( 'wp_doing_cron', $as_cron );
		delete_option( 'cmplz_cookietable_version' );
		cmplz_install_cookie_table();
		remove_filter( 'wp_doing_cron', $as_cron );
		$log[] = tk_consent_cookie_table_missing() ? 'could NOT create the cookie table' : 'installed the cookie and service tables';
	}

	$cmplz = get_option( 'cmplz_options', array() );
	foreach ( tk_consent_options() as $key => $want ) {
		$have = is_array( $cmplz ) ? ( $cmplz[ $key ] ?? null ) : null;
		if ( tk_consent_norm( $have ) !== tk_consent_norm( $want ) ) {
			cmplz_update_option( $key, $want );
			$saved = get_option( 'cmplz_options', array() );
			if ( ! is_array( $saved ) || tk_consent_norm( $saved[ $key ] ?? null ) !== tk_consent_norm( $want ) ) {
				// cmplz_update_option() skips a field an active integration hid in this request (Site Kit hides
				// configuration_by_complianz until its integration is off): store it the way Complianz does.
				$saved         = is_array( $saved ) ? $saved : array();
				$saved[ $key ] = $want;
				update_option( 'cmplz_options', $saved );
			}
			$log[] = sprintf( 'cmplz_options[%s] = %s', $key, tk_consent_show( $want ) );
		}
	}

	foreach ( tk_consent_wp_options() as $key => $want ) {
		if ( tk_consent_norm( get_option( $key, null ) ) !== tk_consent_norm( $want ) ) {
			update_option( $key, $want );
			$log[] = sprintf( '%s = %s', $key, tk_consent_show( $want ) );
		}
	}

	$integrations = get_option( 'complianz_options_integrations', array() );
	$integrations = is_array( $integrations ) ? $integrations : array();
	if ( ! array_key_exists( 'google-site-kit', $integrations ) || $integrations['google-site-kit'] ) {
		$integrations['google-site-kit'] = false; // Same write as the toggle in Complianz → Integrace → Pluginy.
		update_option( 'complianz_options_integrations', $integrations );
		$log[] = 'complianz_options_integrations[google-site-kit] = false (Site Kit tag no longer whitelisted)';
	}

	// The wizard's "finish" step: sets cmplz_wizard_completed_once and re-saves every banner. It runs BEFORE our
	// banner save (martinadamus R49): cmplz_update_all_banners() saves the objects cached in Complianz's global
	// $cmplz_banner, and saving cmplz_options above already cached the default banner in its old state.
	if ( isset( COMPLIANZ::$wizard ) ) {
		COMPLIANZ::$wizard->finish_wizard();
	}

	tk_consent_forget_banner_cache();
	$banner = tk_consent_default_banner(); // A fresh read from the table, never the cached object.
	if ( ! $banner ) {
		$banner = new CMPLZ_COOKIEBANNER();
		$log[]  = 'created the default banner';
	}
	$changed = false;
	foreach ( tk_consent_banner() as $prop => $want ) {
		if ( ! $banner->ID || tk_consent_norm( $banner->{$prop} ?? null ) !== tk_consent_norm( $want ) ) {
			$banner->{$prop} = $want;
			$changed         = true;
			$log[]           = sprintf( 'banner.%s = %s', $prop, tk_consent_show( $want ) );
		}
	}
	if ( $changed || ! $banner->ID ) {
		$banner->save(); // Bumps banner_version and regenerates the banner CSS file.
	}
	// Anything later in this request that re-saves "all banners" must read what we just stored.
	tk_consent_forget_banner_cache();

	cmplz_delete_transient( 'cmplz_blocked_scripts' );
	$log[] = 'cleared the blocked-scripts cache; banner CSS regenerated';

	return $log;
}

/**
 * Empty Complianz's per-request banner cache (global $cmplz_banner, filled by cmplz_get_cookiebanner()), so the
 * next cmplz_get_cookiebanner() / cmplz_update_all_banners() reads the banner table again (martinadamus R49).
 *
 * @return void
 */
function tk_consent_forget_banner_cache() {
	global $cmplz_banner;
	$cmplz_banner = array(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Complianz's own cache, reset on purpose.
}

/**
 * Doctor rows: is the consent setup in place?
 *
 * @return array<int,array{0:string,1:string}>
 */
function tk_consent_doctor_rows() {
	$why = tk_consent_unavailable();
	if ( '' !== $why ) {
		return array( array( 'Consent', 'NOT READY - ' . $why ) );
	}
	$diff   = tk_consent_diff();
	$rows   = array();
	$count  = count( $diff['changes'] );
	$rows[] = array( 'Consent', $count ? $count . ' setting(s) differ - run wp tk consent-setup --dry-run' : 'Complianz ' . CMPLZ_VERSION . ' configured (strict opt-in, Site Kit tag blocked until consent)' );

	$css    = function_exists( 'cmplz_upload_dir' ) && function_exists( 'cmplz_get_default_banner_id' ) ? cmplz_upload_dir( 'css' ) . 'banner-' . (int) cmplz_get_default_banner_id() . '-optin.css' : '';
	$rows[] = array( 'Consent banner CSS', $css && is_file( $css ) ? 'uploads/complianz/css/' . basename( $css ) : 'missing - wp tk consent-setup regenerates it' );

	return $rows;
}
