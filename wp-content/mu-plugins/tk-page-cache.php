<?php
/**
 * Plugin Name: TK Page Cache
 * Description: Plugin-free full-page cache for Radost v pohybu. Stores every public page as static HTML (+ gzip, + brotli with ext-brotli) in wp-content/cache/tk-page/, served by .htaccess rewrite rules without PHP ("X-TK-Cache: HIT") or by the advanced-cache.php drop-in ("HIT-PHP"). Set up with `wp tk cache-setup`, filled with `wp tk cache-warm`, emptied with `wp tk cache-purge`.
 * Version: 1.0.0
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/tk-page-cache/cache.php';
