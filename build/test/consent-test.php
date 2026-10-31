<?php
/**
 * Cookie consent (Complianz strict opt-in + Site Kit's Google tag; port of martinadamus R45).
 *   ./wp.sh eval-file /project/build/test/consent-test.php
 * 1. Configuration: pinned plugin versions, `wp tk consent-setup` has nothing left to change (idempotent), Site
 *    Kit integration off, Consent Mode off, statistics = Google Analytics, policy URL = the privacy page #cookies.
 * 2. Rendered pages over HTTP (TK_TEST_BASE, default http://wordpress): the Google tag is blocked
 *    (type="text/plain" data-category="statistics"), no Set-Cookie on page responses, no Site Kit generator meta,
 *    Complianz CSS inline in @layer tk (no unlayered <link>, no hand-printed .cmplz-hidden <style>), complianz.js
 *    told to load no stylesheet, consent.js inline, the footer's "Nastavení cookies" control.
 * 3. The page cache: Complianz's output buffer runs inside the capture buffer (tk_pc_nest_complianz_buffer), so the
 *    STORED file and the HIT carry the tag blocked; cmplz_* cookies do not bypass the cache.
 */
$failed = 0;
$checks = 0;
$ok     = static function ( $cond, $msg ) use ( &$failed, &$checks ) {
	++$checks;
	if ( ! $cond ) {
		++$failed;
		WP_CLI::log( 'FAIL ' . $msg );
	}
};

if ( ! function_exists( 'tk_consent_diff' ) || ! class_exists( 'COMPLIANZ' ) ) {
	WP_CLI::error( 'tk_consent_diff() (mu-plugins/tk-build/consent.php) or Complianz missing: run wp tk site-setup + wp tk consent-setup' );
}

// 1. Configuration.
$ok( defined( 'CMPLZ_VERSION' ) && TK_CONSENT_COMPLIANZ_VERSION === CMPLZ_VERSION, 'Complianz version ' . ( defined( 'CMPLZ_VERSION' ) ? CMPLZ_VERSION : '-' ) . ' != pinned ' . TK_CONSENT_COMPLIANZ_VERSION );
$ok( defined( 'GOOGLESITEKIT_VERSION' ) && TK_CONSENT_SITEKIT_VERSION === GOOGLESITEKIT_VERSION, 'Site Kit version ' . ( defined( 'GOOGLESITEKIT_VERSION' ) ? GOOGLESITEKIT_VERSION : '-' ) . ' != pinned ' . TK_CONSENT_SITEKIT_VERSION );
$diff = tk_consent_diff();
$ok( array() === $diff['changes'], 'consent-setup would still change: ' . implode( ', ', wp_list_pluck( $diff['changes'], 'what' ) ) );
$opts = get_option( 'cmplz_options', array() );
$ok( 'no' === ( $opts['consent-mode'] ?? null ), 'Consent Mode must stay off (strict blocking)' );
$ok( 'google-analytics' === ( $opts['compile_statistics'] ?? null ) && 'no' === ( $opts['configuration_by_complianz'] ?? null ), 'statistics = Google Analytics inserted by Site Kit, not by Complianz' );
$int = get_option( 'complianz_options_integrations', array() );
$ok( is_array( $int ) && array_key_exists( 'google-site-kit', $int ) && ! $int['google-site-kit'], "Complianz's Site Kit integration (whitelists the tag) must be off" );
$ok( home_url( '/zasady-ochrany-osobnich-udaju/#cookies' ) === get_option( 'cmplz_cookie-statement_custom_page_url' ) && 'url' === ( $opts['cookie-statement'] ?? null ), 'cookie statement = the privacy page #cookies (no Complianz-generated policy)' );
$ok( 365 === (int) ( $opts['cookie_expiry'] ?? 0 ), 'consent cookie expiry 365 days' );
$css = function_exists( 'cmplz_upload_dir' ) ? cmplz_upload_dir( 'css' ) . 'banner-' . (int) cmplz_get_default_banner_id() . '-optin.css' : '';
$ok( $css && is_file( $css ) && false !== strpos( (string) file_get_contents( $css ), ".cmplz-cookiebanner .cmplz-btn{min-height:44px" ), 'generated banner CSS carries assets/css/consent-banner.css (re-run consent-setup after editing it)' ); // phpcs:ignore

// 2. Rendered pages.
$home  = wp_parse_url( home_url( '/' ) );
$host  = $home['host'] . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );
$base  = getenv( 'TK_TEST_BASE' ) ? getenv( 'TK_TEST_BASE' ) : 'http://wordpress';
$fetch = static function ( $path, $cookie = '' ) use ( $base, $host ) {
	$r = wp_remote_get(
		$base . $path,
		array(
			'redirection' => 0,
			'headers'     => array_filter(
				array(
					'Host'   => $host,
					'Cookie' => $cookie,
				)
			),
			'timeout'     => 30,
		)
	);
	return is_wp_error( $r ) ? array( 0, '', '', array() ) : array( (int) wp_remote_retrieve_response_code( $r ), (string) wp_remote_retrieve_body( $r ), (string) wp_remote_retrieve_header( $r, 'x-tk-cache' ), (array) wp_remote_retrieve_header( $r, 'set-cookie' ) );
};
$blocked = '~<script type="text/plain" data-service="google-analytics" data-category="statistics" id="google_gtagjs-js" data-cmplz-src="https://www\.googletagmanager\.com/gtag/js\?id=[^"]+"~';
$live    = '~<script[^>]+\ssrc="https://www\.googletagmanager\.com~';

$dismissed = 'cmplz_functional=allow; cmplz_statistics=deny; cmplz_marketing=deny; cmplz_preferences=deny; cmplz_banner-status=dismissed';
$accepted  = 'cmplz_functional=allow; cmplz_statistics=allow; cmplz_marketing=deny; cmplz_preferences=deny; cmplz_banner-status=dismissed';
foreach ( array( '/', '/kontakt/' ) as $path ) {
	foreach ( array( 'tk_nocache=1', 'tk_nocache=1; ' . $accepted ) as $cookie ) {
		list( $code, $html, $x, $sc ) = $fetch( $path, $cookie );
		$who                          = "$path rendered" . ( false !== strpos( $cookie, 'allow' ) ? ' (statistics consented)' : '' ) . " [$x]";
		$ok( 200 === $code, "$who: HTTP $code" );
		$ok( 1 === preg_match( $blocked, $html ) && 0 === preg_match( $live, $html ), "$who: Google tag not in its blocked form (the server never reads the consent cookies; Complianz's JS unblocks it)" );
		$ok( array() === array_filter( $sc ), "$who: Set-Cookie on a page response: " . wp_json_encode( $sc ) );
		$ok( 0 === preg_match( '~<meta[^>]+name=["\']generator["\']~i', $html ), "$who: a generator meta is printed" );
		$ok( 1 === preg_match( "~<style id='cmplz-banner-1-optin-css'>@layer tk\{~", $html ), "$who: banner CSS not inline in @layer tk" );
		$ok( 0 === preg_match( '~<link[^>]+cmplz[^>]+>~', $html ) && 0 === preg_match( '~<style>\.cmplz-hidden~', $html ), "$who: unlayered Complianz CSS (link or hand-printed .cmplz-hidden)" );
		$ok( false !== strpos( $html, '.cmplz-hidden{display:none!important}' ), "$who: the .cmplz-hidden rule moved into the layer" );
		$ok( 1 === preg_match( '~"css_file":"data:text\\\\?/css,"~', $html ), "$who: complianz.js would inject its own stylesheet" );
		$ok( 1 === preg_match( "~<script id='tk-consent-js'>\\(\\(\\) => \\{.*?data-tk-consent-open.*?</script>~s", $html ), "$who: consent.js not inline" );
		$ok( 1 === preg_match( '~<a class="tk-ft-consent" href="[^"]*/zasady-ochrany-osobnich-udaju/#cookies" data-tk-consent-open>Nastavení cookies</a>~', $html ), "$who: footer \"Nastavení cookies\" control missing" );
		$ok( 1 === preg_match( '~<div id="cmplz-cookiebanner-container">.*?cmplz-hidden~s', $html ), "$who: banner markup (hidden until complianz.js decides) missing" );
	}
}

// 3. Page cache.
$ok( false !== has_action( 'wp', 'tk_pc_nest_complianz_buffer' ), 'tk_pc_nest_complianz_buffer() not hooked on wp' );
tk_pc_purge();
list( $code, $html, $x, $sc ) = $fetch( '/kontakt/' );
$ok( 'STORED' === $x && array() === array_filter( $sc ), "first GET of /kontakt/ must be STORED without Set-Cookie (got $x)" );
$file = tk_pc_dir() . '/kontakt/index.html';
$disk = is_file( $file ) ? (string) file_get_contents( $file ) : ''; // phpcs:ignore
$ok( 1 === preg_match( $blocked, $disk ) && 0 === preg_match( $live, $disk ), 'the STORED file holds the Google tag unblocked (Complianz buffer not nested inside the capture)' );
foreach ( array( '' => 'anonymous', $dismissed => 'refused', $accepted => 'consented' ) as $cookie => $who ) {
	list( $code, $html, $x ) = $fetch( '/kontakt/', $cookie );
	$ok( 0 === strpos( $x, 'HIT' ) && 1 === preg_match( $blocked, $html ), "$who visitor: expected a HIT with the tag blocked (got $x)" );
}

$failed ? WP_CLI::error( "$failed of $checks consent checks failed" ) : WP_CLI::success( "$checks consent checks pass" );
