<?php
/**
 * mu-plugins/tk-hardening.php — no user enumeration for anonymous visitors.
 *   ./wp.sh eval-file /project/build/test/hardening-test.php
 * 1. REST: the /wp/v2/users routes are absent as user 0 and present as an administrator.
 * 2. Over HTTP against the wordpress container (TK_TEST_BASE, default http://wordpress), anonymous:
 *    ?author=N, /author/<login>/, the REST users endpoints answer 404 (never a 301 naming the login);
 *    sitemaps list no users; oEmbed names no author; a normal page still answers 200.
 * 3. XML-RPC off: xmlrpc_enabled false, no methods, pings closed, no pingback URL; /xmlrpc.php answers 404
 *    to GET and POST (the tk-security-headers .htaccess block); no X-Pingback header on a WordPress render.
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

$ok( function_exists( 'tk_hardening_rest_endpoints' ) && function_exists( 'tk_hardening_author_404' ), 'tk-hardening.php is loaded' );

// 1. REST routes, through the real server (rest_api_init registers the core routes).
$routes_as    = static function ( $user_id ) {
	wp_set_current_user( $user_id );
	return array_keys( rest_get_server()->get_routes() );
};
$users_routes = static fn( $routes ) => array_values( array_filter( $routes, static fn( $r ) => '/wp/v2/users' === $r || 0 === strpos( $r, '/wp/v2/users/' ) ) );

$anon = $routes_as( 0 );
$ok( array() === $users_routes( $anon ), 'anonymous: no /wp/v2/users routes, found ' . wp_json_encode( $users_routes( $anon ) ) );
$ok( in_array( '/wp/v2/pages', $anon, true ), 'anonymous: other routes (/wp/v2/pages) stay' );

$admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ID',
	)
);
$ok( ! empty( $admins ), 'an administrator exists' );
if ( $admins ) {
	$admin = $routes_as( (int) $admins[0] );
	$ok( in_array( '/wp/v2/users', $admin, true ), 'administrator: /wp/v2/users present' );
	$ok( in_array( '/wp/v2/users/(?P<id>[\d]+)', $admin, true ), 'administrator: /wp/v2/users/(?P<id>…) present' );
	$ok( in_array( '/wp/v2/users/me', $admin, true ), 'administrator: /wp/v2/users/me present' );
}
wp_set_current_user( 0 );

// 2. Over HTTP, anonymous. Inside the compose network WordPress is http://wordpress (see
// TK_PAGE_CACHE_CONNECT_TO); the Host header keeps home_url() as configured.
$home  = wp_parse_url( home_url( '/' ) );
$host  = $home['host'] . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );
$base  = getenv( 'TK_TEST_BASE' ) ? getenv( 'TK_TEST_BASE' ) : 'http://wordpress';
$fetch = static function ( $path ) use ( $base, $host ) {
	$r = wp_remote_get(
		$base . $path,
		array(
			'redirection' => 0,
			'headers'     => array( 'Host' => $host ),
			'timeout'     => 20,
		)
	);
	return is_wp_error( $r ) ? array( 0, $r->get_error_message(), '' ) : array( (int) wp_remote_retrieve_response_code( $r ), (string) wp_remote_retrieve_header( $r, 'location' ), (string) wp_remote_retrieve_body( $r ) );
};

$user  = $admins ? get_userdata( (int) $admins[0] ) : null;
$login = $user ? $user->user_login : 'admin';
$id    = $user ? (int) $user->ID : 1;
$paths = array(
	'/?author=1',
	'/?author=' . $id,
	'/?author=' . $id . '&feed=rss2',
	'/?author_name=' . rawurlencode( $login ),
	'/author/' . rawurlencode( $login ) . '/',
	'/author/' . rawurlencode( $login ) . '/feed/',
	'/wp-json/wp/v2/users',
	'/wp-json/wp/v2/users/' . $id,
	'/wp-json/wp/v2/users/me',
	'/?rest_route=/wp/v2/users',
	'/?rest_route=/wp/v2/users/' . $id,
	'/wp-sitemap-users-1.xml',
);
foreach ( $paths as $path ) {
	list( $code, $location, $body ) = $fetch( $path );
	$ok( 404 === $code || ( 401 === $code && false !== strpos( $path, '/me' ) ), "$path: HTTP $code" . ( $location ? " -> $location" : '' ) . ' (expected 404)' );
	$ok( false === stripos( $location, $login ) && false === stripos( $body, '"slug":"' . $login . '"' ), "$path: neither a redirect nor a body naming the login" );
}

// Sitemaps: TSF's /sitemap.xml and core's index (if served) list no author archives.
foreach ( array( '/sitemap.xml', '/wp-sitemap.xml' ) as $path ) {
	list( $code, , $body ) = $fetch( $path );
	$ok( 0 === preg_match( '~/author/|[?&]author=|sitemap-users~i', $body ), "$path (HTTP $code): no user entries" );
}
$ok( ! function_exists( 'wp_sitemaps_get_server' ) || ! wp_sitemaps_get_server()->sitemaps_enabled() || ! array_key_exists( 'users', wp_sitemaps_get_server()->registry->get_providers() ), 'core sitemaps: no users provider' );

// oEmbed for a page names no author (author_name/author_url would be the display name and the archive link).
$kontakt = get_page_by_path( 'kontakt' );
if ( $kontakt ) {
	list( $code, , $body ) = $fetch( '/wp-json/oembed/1.0/embed?url=' . rawurlencode( get_permalink( $kontakt ) ) );
	$data                  = json_decode( $body, true );
	$ok( 200 !== $code || ( is_array( $data ) && ! isset( $data['author_name'] ) && ! isset( $data['author_url'] ) ), "oEmbed (HTTP $code): no author_name/author_url" );
	$ok( false === stripos( $body, $login ), 'oEmbed: the login does not appear' );
}

list( $code ) = $fetch( '/kontakt/' );
$ok( 200 === $code, "/kontakt/: HTTP $code (expected 200)" );

// 3. XML-RPC and pingbacks.
$ok( false === apply_filters( 'xmlrpc_enabled', true ), 'xmlrpc_enabled is false' );
$ok( array() === apply_filters( 'xmlrpc_methods', array( 'pingback.ping' => 'this:pingback_ping', 'system.multicall' => 'this:multiCall' ) ), 'xmlrpc_methods: none (pingback.ping/system.multicall gone)' );
$ok( $kontakt && ! pings_open( $kontakt ), 'pings closed' );
$ok( '' === get_bloginfo( 'pingback_url', 'display' ), 'no pingback URL (bloginfo): "' . get_bloginfo( 'pingback_url', 'display' ) . '"' );
$ok( ! isset( apply_filters( 'wp_headers', array( 'X-Pingback' => 'x' ), null )['X-Pingback'] ), 'wp_headers drops X-Pingback' );
list( $code ) = $fetch( '/xmlrpc.php' );
$ok( 404 === $code, "GET /xmlrpc.php: HTTP $code (expected 404)" );
$r    = wp_remote_post(
	$base . '/xmlrpc.php',
	array(
		'headers' => array(
			'Host'         => $host,
			'Content-Type' => 'text/xml',
		),
		'body'    => '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName><params></params></methodCall>',
		'timeout' => 20,
	)
);
$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
$ok( 404 === $code && false === strpos( (string) wp_remote_retrieve_body( $r ), 'methodResponse' ), "POST /xmlrpc.php system.listMethods: HTTP $code (expected 404, no methodResponse)" );
$r = wp_remote_get(
	$base . '/kontakt/',
	array(
		'redirection' => 0,
		'headers'     => array(
			'Host'   => $host,
			'Cookie' => 'tk_nocache=1',
		),
		'timeout'     => 20,
	)
);
$ok( ! is_wp_error( $r ) && '' === (string) wp_remote_retrieve_header( $r, 'x-pingback' ) && false === stripos( (string) wp_remote_retrieve_body( $r ), 'rel="pingback"' ), '/kontakt/ (WordPress render): no X-Pingback header, no rel="pingback"' );

if ( $failed ) {
	WP_CLI::error( "$failed of $checks hardening checks failed." );
}
WP_CLI::success( "$checks hardening checks pass." );
