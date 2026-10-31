<?php
/**
 * Plugin Name: TK Local
 * Description: Local development only. Delivers all mail to Mailpit, trusts this machine's TLS-intercepting CA (PEM files mounted at /certs) for the WP HTTP API, fakes Site Kit's Google tag and fixes Complianz's cookie path on the local port (consent, port of martinadamus R45/R48). Inert unless WP_ENVIRONMENT_TYPE is "local".
 * Version: 1.0.0
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

if ( 'local' !== wp_get_environment_type() ) {
	return;
}

const TK_LOCAL_CERT_DIR = '/certs';

/**
 * WordPress' CA bundle plus every PEM mounted at /certs (docker/certs/*.pem), rebuilt when a source is
 * newer. Only needed behind an antivirus/proxy that intercepts TLS; with no PEM present it does nothing.
 *
 * @return string Path to the combined bundle, or '' when there is nothing to add.
 */
function tk_local_ca_bundle() {
	static $bundle = null;

	if ( null !== $bundle ) {
		return $bundle;
	}

	$bundle = '';
	$pems   = is_dir( TK_LOCAL_CERT_DIR ) ? glob( TK_LOCAL_CERT_DIR . '/*.pem' ) : array();

	if ( ! $pems ) {
		return $bundle;
	}

	// System temp dir, not uploads: uploads travel with every migration package.
	$target = trailingslashit( get_temp_dir() ) . 'tk-ca-bundle.crt';
	$source = ABSPATH . WPINC . '/certificates/ca-bundle.crt';
	$newest = max( array_map( 'filemtime', array_merge( $pems, array( $source ) ) ) );

	if ( ! file_exists( $target ) || filemtime( $target ) < $newest ) {
		$content = (string) file_get_contents( $source ); // phpcs:ignore WordPress.WP.AlternativeFunctions

		foreach ( $pems as $pem ) {
			$content .= "\n" . trim( (string) file_get_contents( $pem ) ) . "\n"; // phpcs:ignore WordPress.WP.AlternativeFunctions
		}

		if ( false === file_put_contents( $target, $content ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions
			return $bundle;
		}
	}

	$bundle = $target;

	return $bundle;
}

add_filter(
	'http_request_args',
	static function ( $args ) {
		$bundle = tk_local_ca_bundle();

		if ( $bundle ) {
			$args['sslcertificates'] = $bundle;
		}

		return $args;
	},
	5
);

// Every mail goes to Mailpit (UI: http://localhost:8026). Nothing leaves the machine.
add_action(
	'phpmailer_init',
	static function ( $phpmailer ) {
		$phpmailer->isSMTP();
		$phpmailer->Host        = 'mailpit';
		$phpmailer->Port        = 1025;
		$phpmailer->SMTPAuth    = false;
		$phpmailer->SMTPAutoTLS = false;
		$phpmailer->SMTPSecure  = '';
	}
);

// WordPress would use wordpress@localhost, which PHPMailer rejects as an invalid From address.
add_filter(
	'wp_mail_from',
	static function () {
		return 'web@radostvpohybu.local';
	}
);

/*
 * Site Kit's Google tag without Google (port of martinadamus R45). Site Kit (installed, never connected locally)
 * prints its gtag.js snippet only for a connected Analytics module; this feeds a FAKE tag id into Site Kit's own
 * documented `googlesitekit_setup_gtag` action, so Site Kit's real code prints exactly what production will get
 * once the client's Google account is connected (handle google_gtagjs, async src, the inline dataLayer/linker/
 * config calls) and Complianz blocks the very same markup. Nothing is connected to a Google account and no real
 * property id exists here; the harness intercepts every Google request (build/interact.mjs consent).
 */
add_action(
	'googlesitekit_setup_gtag',
	static function ( $gtag ) {
		$gtag->add_command( 'set', array( 'linker', array( 'domains' => array( (string) wp_parse_url( home_url(), PHP_URL_HOST ) ) ) ) );
		$gtag->add_tag( defined( 'TK_LOCAL_GTAG_ID' ) ? TK_LOCAL_GTAG_ID : 'GT-LOCALTEST' );
	}
);

/*
 * Complianz consent cookies on the local port (martinadamus R48 finding). Complianz derives the cookie path from
 * home_url() minus scheme and host (class-banner-loader.php get_cookie_path()), which leaves ":8020/" on
 * http://localhost:8020: not a valid path, so the browser falls back to the current page's directory and a
 * consent given on /kontakt/ would be stored with path=/kontakt only. Production has no port in its home URL,
 * so its path is "/" already; this only restores that locally.
 */
add_filter( 'cmplz_cookie_path', static fn( $path ) => ( is_string( $path ) && ':' === substr( $path, 0, 1 ) ) ? '/' : $path );
