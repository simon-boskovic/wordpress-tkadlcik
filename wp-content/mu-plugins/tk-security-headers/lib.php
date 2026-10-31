<?php
/**
 * Security headers — pure rules, no WordPress calls.
 *
 * Loaded by tk-security-headers.php (every WordPress request) and by the page cache's PHP drop-in
 * (mu-plugins/tk-page-cache/serve.php, before WordPress is up), and used by `wp tk headers-setup` to write
 * the root .htaccess block "# BEGIN TK Security Headers". Two layers send the same headers:
 *   - the .htaccess block (Apache mod_headers): every response, including the static page-cache HITs
 *     that never start PHP, static files and Apache's own error pages;
 *   - PHP (this file): WordPress responses and the drop-in's HIT-PHP, for hosts that ignore Header in
 *     .htaccess (OpenLiteSpeed: there the page cache runs in --mode=php anyway).
 * No duplicates when both run: the block first unsets PHP's copy ("Header unset", mod_php puts script
 * headers in the default table) and then sets the header in the "always" table (where PHP-FPM /
 * mod_proxy_fcgi puts them, so "always set" replaces those).
 *
 * No Content-Security-Policy (yet): the cached HTML is identical for hours (no per-request nonce
 * possible) and a wrong policy silently breaks embeds or inline scripts. Framing is covered by
 * X-Frame-Options. A report-only CSP can be tried after go-live.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/** Block marker in the root .htaccess. */
const TK_SEC_MARKER = 'TK Security Headers';

/**
 * Default HSTS max-age: 5 minutes, deliberately short for the first week after go-live (a mistake in
 * HTTPS or the host setup then locks visitors out for minutes, not a year). Raise it with
 * define( 'TK_HSTS_MAX_AGE', 31536000 ); in wp-config.php and `wp tk headers-setup` (docs/go-live-requirements.md).
 * No includeSubDomains, no preload: other subdomains (mail, webmail) are the host's.
 */
const TK_SEC_HSTS_DEFAULT = 300;

/**
 * Headers sent on every response, regardless of the scheme.
 *   nosniff: no MIME sniffing of responses (scripts/styles must have their real type).
 *   Referrer-Policy: the browsers' default, stated explicitly (full URL only same-origin).
 *   X-Frame-Options SAMEORIGIN: no clickjacking; the block editor/Customizer preview frame the site from
 *   the same origin and keep working. Embeds the pages themselves contain (the Google map) are not affected.
 *   Permissions-Policy: powerful features the site never uses, off for the page and every frame in it
 *   (only features Chrome/Edge recognise, an unknown one is a console error). Payment is left alone (a future
 *   booking/payment widget may need it).
 *
 * @return array<string,string>
 */
function tk_sec_headers() {
	return array(
		'X-Content-Type-Options' => 'nosniff',
		'Referrer-Policy'        => 'strict-origin-when-cross-origin',
		'X-Frame-Options'        => 'SAMEORIGIN',
		'Permissions-Policy'     => 'camera=(), microphone=(), geolocation=(), usb=()',
	);
}

/**
 * HSTS max-age in seconds (0 = no HSTS header at all).
 *
 * @return int
 */
function tk_sec_hsts_max_age() {
	return defined( 'TK_HSTS_MAX_AGE' ) ? max( 0, (int) TK_HSTS_MAX_AGE ) : TK_SEC_HSTS_DEFAULT;
}

/**
 * Whether this request reached the site over HTTPS: the server says so, or a TLS-terminating proxy in
 * front of it does (X-Forwarded-Proto). Browsers ignore HSTS on plain HTTP anyway (RFC 6797 §8.1), so a
 * forged header costs nothing.
 *
 * @param array $server $_SERVER.
 * @return bool
 */
function tk_sec_is_https( $server ) {
	$https = isset( $server['HTTPS'] ) ? strtolower( (string) $server['HTTPS'] ) : '';
	$proto = isset( $server['HTTP_X_FORWARDED_PROTO'] ) ? strtolower( trim( explode( ',', (string) $server['HTTP_X_FORWARDED_PROTO'] )[0] ) ) : '';

	return ( '' !== $https && 'off' !== $https ) || ( isset( $server['SERVER_PORT'] ) && '443' === (string) $server['SERVER_PORT'] ) || 'https' === $proto;
}

/**
 * Header lines for one response.
 *
 * @param bool $https Request came over HTTPS.
 * @return array<string,string>
 */
function tk_sec_headers_for( $https ) {
	$out = array();
	$age = tk_sec_hsts_max_age();

	if ( $https && $age > 0 ) {
		$out['Strict-Transport-Security'] = 'max-age=' . $age;
	}

	return $out + tk_sec_headers();
}

/**
 * Send the headers from PHP (WordPress or the drop-in) and drop X-Powered-By.
 *
 * @param array $server $_SERVER.
 */
function tk_sec_send( $server ) {
	if ( headers_sent() ) {
		return;
	}

	foreach ( tk_sec_headers_for( tk_sec_is_https( $server ) ) as $name => $value ) {
		header( $name . ': ' . $value );
	}

	header_remove( 'X-Powered-By' );
}

/**
 * The root .htaccess block (without the markers). mod_headers only; "expr=" needs Apache 2.4.10+.
 *
 * @return string[]
 */
function tk_sec_htaccess_block() {
	$lines = array(
		'# Security headers + readme/license/xmlrpc 404, `wp tk headers-setup`. Do not edit: regenerated.',
		'# Unset first (PHP under mod_php), then "always" (also error pages, redirects, PHP-FPM output).',
		'<IfModule mod_headers.c>',
	);
	$age   = tk_sec_hsts_max_age();

	$lines[] = 'Header unset Strict-Transport-Security';
	if ( $age > 0 ) {
		$lines[] = 'Header always set Strict-Transport-Security "max-age=' . $age . '" "expr=%{HTTPS} == \'on\' || %{HTTP:X-Forwarded-Proto} == \'https\'"';
	} else {
		$lines[] = 'Header always unset Strict-Transport-Security';
	}

	foreach ( tk_sec_headers() as $name => $value ) {
		$lines[] = 'Header unset ' . $name;
		$lines[] = 'Header always set ' . $name . ' "' . $value . '"';
	}

	$lines[] = 'Header unset X-Powered-By';
	$lines[] = 'Header always unset X-Powered-By';
	$lines[] = '</IfModule>';

	// WordPress's own readme.html/license.txt name the version; wp-config-sample.php is noise; xmlrpc.php is
	// switched off (tk-hardening.php: no XML-RPC, no pingbacks) and is a brute-force/DDoS target, so Apache
	// answers it without starting PHP. Root files only (the pattern is anchored to the .htaccess directory);
	// 404, never a redirect.
	$lines[] = '<IfModule mod_rewrite.c>';
	$lines[] = 'RewriteEngine On';
	$lines[] = 'RewriteRule ^(?:readme\.html|license\.txt|wp-config-sample\.php|xmlrpc\.php)$ - [R=404,L]';
	$lines[] = '</IfModule>';

	return $lines;
}

/**
 * The .htaccess contents with our block replaced (or removed when $block is null). A new block goes right
 * before "# BEGIN TK Page Cache" (else before "# BEGIN WordPress", else at the end), so host rules above
 * keep running first. Order does not matter to Apache (headers are not rewrite rules); it only keeps the
 * file readable.
 *
 * @param string        $current Current contents.
 * @param string[]|null $block   Block lines, or null to remove.
 * @return string
 */
function tk_sec_htaccess_with_block( $current, $block ) {
	$begin   = '# BEGIN ' . TK_SEC_MARKER;
	$end     = '# END ' . TK_SEC_MARKER;
	$current = (string) $current;
	$text    = null === $block ? '' : $begin . "\n" . implode( "\n", $block ) . "\n" . $end . "\n\n";
	$re      = '/' . preg_quote( $begin, '/' ) . '.*?' . preg_quote( $end, '/' ) . "\n*/s";

	if ( preg_match( $re, $current ) ) {
		return (string) preg_replace_callback( $re, static fn() => $text, $current, 1 );
	}

	if ( null === $block ) {
		return $current;
	}

	foreach ( array( '# BEGIN TK Page Cache', '# BEGIN WordPress' ) as $anchor ) {
		$pos = strpos( $current, $anchor );
		if ( false !== $pos ) {
			return substr( $current, 0, $pos ) . $text . substr( $current, $pos );
		}
	}

	return rtrim( $current ) . ( '' === trim( $current ) ? '' : "\n\n" ) . $text;
}
