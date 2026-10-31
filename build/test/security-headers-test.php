<?php
/**
 * Security headers — pure rules (mu-plugins/tk-security-headers/lib.php), the .htaccess block, and the
 * headers actually served (HIT, HIT-PHP, WordPress, 404, static file; HSTS only over HTTPS).
 *   ./wp.sh eval-file /project/build/test/security-headers-test.php
 * Section 5 talks to the wordpress container over HTTP (TK_TEST_BASE, default http://wordpress).
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

if ( ! function_exists( 'tk_sec_headers_for' ) ) {
	WP_CLI::error( 'tk-security-headers.php is not loaded' );
}

// 1. HTTPS detection.
foreach (
	array(
		array( array(), false ),
		array( array( 'HTTPS' => 'on' ), true ),
		array( array( 'HTTPS' => '1' ), true ),
		array( array( 'HTTPS' => 'off' ), false ),
		array( array( 'HTTPS' => 'OFF' ), false ),
		array( array( 'HTTPS' => '' ), false ),
		array( array( 'SERVER_PORT' => '443' ), true ),
		array( array( 'SERVER_PORT' => 443 ), true ),
		array( array( 'SERVER_PORT' => '80' ), false ),
		array( array( 'HTTP_X_FORWARDED_PROTO' => 'https' ), true ),
		array( array( 'HTTP_X_FORWARDED_PROTO' => 'HTTPS, http' ), true ),
		array( array( 'HTTP_X_FORWARDED_PROTO' => 'http, https' ), false ),
		array( array( 'HTTP_X_FORWARDED_PROTO' => 'http' ), false ),
	) as $c
) {
	$ok( tk_sec_is_https( $c[0] ) === $c[1], 'is_https(' . wp_json_encode( $c[0] ) . ') should be ' . ( $c[1] ? 'true' : 'false' ) );
}

// 2. HSTS only over HTTPS; the other four always.
$http  = tk_sec_headers_for( false );
$https = tk_sec_headers_for( true );
$ok( ! isset( $http['Strict-Transport-Security'] ), 'no HSTS over HTTP' );
$ok( 'max-age=' . tk_sec_hsts_max_age() === ( $https['Strict-Transport-Security'] ?? '' ), 'HSTS over HTTPS: ' . wp_json_encode( $https ) );
$ok( defined( 'TK_HSTS_MAX_AGE' ) || 300 === tk_sec_hsts_max_age(), 'default max-age is 300 s' );
$ok( false === strpos( $https['Strict-Transport-Security'] ?? '', 'includeSubDomains' ) && false === strpos( $https['Strict-Transport-Security'] ?? '', 'preload' ), 'no includeSubDomains/preload' );
foreach ( array( 'X-Content-Type-Options' => 'nosniff', 'Referrer-Policy' => 'strict-origin-when-cross-origin', 'X-Frame-Options' => 'SAMEORIGIN' ) as $name => $value ) {
	$ok( ( $http[ $name ] ?? '' ) === $value && ( $https[ $name ] ?? '' ) === $value, "$name: $value on HTTP and HTTPS" );
}
$ok( false === strpos( $http['Permissions-Policy'] ?? '', 'payment' ) && false !== strpos( $http['Permissions-Policy'] ?? '', 'camera=()' ), 'Permissions-Policy restricts camera etc., leaves payment alone' );
$ok( ! isset( $http['Content-Security-Policy'] ), 'no CSP (deliberate, see lib.php)' );

// 3. The .htaccess block: every header unset + always set, HSTS conditional on HTTPS.
$lines = tk_sec_htaccess_block();
$block = implode( "\n", $lines );
foreach ( array_keys( tk_sec_headers() ) as $name ) {
	$ok( false !== strpos( $block, "Header unset $name\nHeader always set $name " ), "$name: unset (mod_php copy) then always set" );
}
$ok( 1 === preg_match( '~^Header always set Strict-Transport-Security "max-age=\d+" "expr=%\{HTTPS\} == \'on\' \|\| %\{HTTP:X-Forwarded-Proto\} == \'https\'"$~m', $block ), 'HSTS line is conditional on HTTPS' );
$ok( false !== strpos( $block, 'Header always unset X-Powered-By' ), 'X-Powered-By removed' );

// 3b. WordPress's readme/licence files (version disclosure) and xmlrpc.php answer 404, in the same block.
$deny = 'RewriteRule ^(?:readme\.html|license\.txt|wp-config-sample\.php|xmlrpc\.php)$ - [R=404,L]';
$ok( false !== strpos( $block, "</IfModule>\n<IfModule mod_rewrite.c>\n" ), 'mod_rewrite part follows the headers part' );
$ok( in_array( $deny, $lines, true ), 'deny rule present as its own line: ' . $deny );
$ok( in_array( 'RewriteEngine On', $lines, true ), 'RewriteEngine On inside the mod_rewrite part' );
$ok( 2 === substr_count( $block, '</IfModule>' ) && '</IfModule>' === end( $lines ), 'both parts closed, block ends with </IfModule>' );
$ok( 0 === strpos( $block, '# ' ) && false !== stripos( strtok( $block, "\n" ), 'readme' ), 'the block description names the readme/licence deny' );

// 4. Placement and idempotency.
$wp   = "# BEGIN WordPress\nRewriteEngine On\n# END WordPress\n";
$pc   = "# BEGIN TK Page Cache\nx\n# END TK Page Cache\n\n";
$host = "# host rule\nRewriteRule ^ - [L]\n\n";
$b    = tk_sec_htaccess_block();
$one  = tk_sec_htaccess_with_block( $host . $pc . $wp, $b );
$ok( strpos( $one, $host ) === 0 && strpos( $one, '# BEGIN TK Security Headers' ) < strpos( $one, '# BEGIN TK Page Cache' ), 'new block goes after host rules, before the page cache block' );
$ok( tk_sec_htaccess_with_block( $one, $b ) === $one, 'second run changes nothing' );
$two = tk_sec_htaccess_with_block( $wp, $b );
$ok( strpos( $two, '# BEGIN TK Security Headers' ) === 0 && false !== strpos( $two, '# BEGIN WordPress' ), 'without a page cache block: before WordPress' );
$ok( 1 === substr_count( tk_sec_htaccess_with_block( str_replace( 'nosniff', 'old', $one ), $b ), '# BEGIN TK Security Headers' ), 'an outdated block is replaced in place, never duplicated' );
$ok( tk_sec_htaccess_with_block( $one, null ) === $host . $pc . $wp, '--remove restores the file byte for byte' );
$ok( tk_sec_htaccess_with_block( $wp, null ) === $wp, 'removing an absent block changes nothing' );
$ok( 0 === strpos( tk_sec_htaccess_with_block( '', $b ), '# BEGIN TK Security Headers' ), 'empty file gets the block' );
$ok( function_exists( 'tk_pc_htaccess_with_block' ) && false !== strpos( tk_pc_htaccess_with_block( $one, array( 'y' ) ), "# END TK Security Headers\n\n# BEGIN TK Page Cache" ), 'cache-setup rewriting its block keeps ours in front of it' );

// 4b. The live .htaccess carries the current block.
$ht = (string) @file_get_contents( ABSPATH . '.htaccess' ); // phpcs:ignore
$ok( '' !== $ht && tk_sec_htaccess_with_block( $ht, $b ) === $ht, '.htaccess block present and current (wp tk headers-setup)' );

// 5. Served headers, over HTTP against the wordpress container (Host header keeps home_url() as configured).
$home  = wp_parse_url( home_url( '/' ) );
$hostn = $home['host'] . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );
$base  = getenv( 'TK_TEST_BASE' ) ? getenv( 'TK_TEST_BASE' ) : 'http://wordpress';
$fetch = static function ( $path, $headers = array() ) use ( $base, $hostn ) {
	$r = wp_remote_get(
		$base . $path,
		array(
			'redirection' => 0,
			'headers'     => array_merge( array( 'Host' => $hostn ), $headers ),
			'timeout'     => 20,
		)
	);
	return is_wp_error( $r ) ? array( 0, array() ) : array( (int) wp_remote_retrieve_response_code( $r ), wp_remote_retrieve_headers( $r ) );
};
$warm_path = (string) wp_parse_url( get_permalink( get_page_by_path( 'kontakt' ) ), PHP_URL_PATH );
$fetch( $warm_path ); // stores it if the cache was cold, so the next request is a HIT
$served = array(
	'HIT'          => array( $warm_path, array(), '~^HIT$~' ),
	'HIT-PHP'      => array( $warm_path . '?utm_source=sec-test', array(), '~^HIT-PHP$~' ),
	'WordPress'    => array( $warm_path . '?sec-test=1', array(), '~^BYPASS~' ),
	'404'          => array( '/tk-sec-test-missing/', array(), '~^BYPASS \(404\)$~' ),
	'static file'  => array( '/wp-content/themes/tkadlcik/style.css', array(), '~^$~' ),
	'REST'         => array( '/wp-json/', array(), '~^$~' ),
	'301 redirect' => array( rtrim( $warm_path, '/' ), array(), '~^$~' ),
);
foreach ( $served as $label => list( $path, $headers, $x_re ) ) {
	list( $code, $h ) = $fetch( $path, $headers );
	$x                = (string) ( $h['x-tk-cache'] ?? '' );
	$ok( $code > 0 && 1 === preg_match( $x_re, $x ), "$label ($path): HTTP $code, X-TK-Cache \"$x\"" );
	foreach ( tk_sec_headers() as $name => $value ) {
		$got = $h[ $name ] ?? '';
		$ok( $value === ( is_array( $got ) ? implode( ', ', $got ) : $got ), "$label: $name \"" . ( is_array( $got ) ? implode( ' | ', $got ) : $got ) . "\" (sent exactly once)" );
	}
	$ok( ! isset( $h['strict-transport-security'] ), "$label: no HSTS over plain HTTP" );
	$ok( ! isset( $h['x-powered-by'] ), "$label: no X-Powered-By" );
}
foreach ( array( $warm_path, $warm_path . '?utm_source=sec-test', '/tk-sec-test-missing/' ) as $path ) {
	list( , $h ) = $fetch( $path, array( 'X-Forwarded-Proto' => 'https' ) );
	$ok( 'max-age=' . tk_sec_hsts_max_age() === ( $h['strict-transport-security'] ?? '' ), "$path behind an HTTPS proxy: HSTS \"" . ( $h['strict-transport-security'] ?? '' ) . '"' );
}
foreach ( array( '/readme.html', '/license.txt', '/wp-config-sample.php', '/xmlrpc.php' ) as $path ) {
	list( $code ) = $fetch( $path );
	$ok( 404 === $code, "$path: HTTP $code (expected 404)" );
}

$failed ? WP_CLI::error( "$failed of $checks checks failed" ) : WP_CLI::success( "$checks security-header checks pass" );
