<?php
/**
 * Plugin Name: TK Security Headers
 * Description: HSTS (HTTPS only), nosniff, Referrer-Policy, X-Frame-Options and Permissions-Policy on every response. The root .htaccess block from `wp tk headers-setup` covers the static page-cache HITs; this sends the same headers from PHP.
 * Version: 1.0.0
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/tk-security-headers/lib.php';

// As early as possible, before anything is printed: covers pages, admin, admin-ajax, REST, login and
// 404s. Headers WordPress sends later with the same name (wp-login's own X-Frame-Options, wp-admin's
// Referrer-Policy) replace ours with the same value.
if ( 'cli' !== PHP_SAPI ) {
	tk_sec_send( $_SERVER );
}
