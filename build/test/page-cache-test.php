<?php
/**
 * Same cases as cache-rules.test.mjs, against the PHP rules (mu-plugins/tk-page-cache/lib.php).
 *   ./wp.sh eval-file /project/build/test/page-cache-test.php
 * Also checks that the generated .htaccess blocks use the same patterns.
 */
$cases  = json_decode( file_get_contents( '/project/build/test/cache-cases.json' ), true ); // phpcs:ignore
$failed = 0;
$extra  = 0;
$fail   = static function ( $msg ) use ( &$failed ) {
	++$failed;
	WP_CLI::log( 'FAIL ' . $msg );
};

foreach ( $cases['decide'] as $c ) {
	$got = tk_pc_decide( $c['req'], $c['cfg'] );
	if ( array( 'cache', 'file', 'reason', 'rewrite' ) !== ( static function ( $k ) { sort( $k ); return $k; } )( array_keys( $got ) ) ) {
		$fail( $c['name'] . ': keys ' . wp_json_encode( array_keys( $got ) ) );
	}
	foreach ( $c['expect'] as $k => $v ) {
		if ( $got[ $k ] !== $v ) {
			$fail( sprintf( '%s: %s = %s, expected %s', $c['name'], $k, wp_json_encode( $got[ $k ] ), wp_json_encode( $v ) ) );
		}
	}
}
foreach ( $cases['pick'] as $c ) {
	$got = tk_pc_pick_encoding( $c['pick']['accept'], $c['pick']['br'], $c['pick']['gz'] );
	if ( $got !== $c['expect'] ) {
		$fail( sprintf( 'pick %s: got "%s", expected "%s"', $c['name'], $got, $c['expect'] ) );
	}
}

// Raw request lines with an empty path segment: the THE_REQUEST condition of the .htaccess rules.
foreach ( $cases['request_line'] as $c ) {
	if ( (bool) preg_match( '~' . TK_PC_RAW_DOUBLE_SLASH_RE . '~i', $c['line'] ) !== $c['double'] ) {
		$fail( sprintf( 'request line %s: "%s" double slash = %s', $c['name'], $c['line'], wp_json_encode( ! $c['double'] ) ) );
	}
}

// Never-cached list: empty (twin NOCACHE_PATHS in cache-rules.mjs), so the rules carry no lookahead.
++$extra;
if ( array() !== TK_PC_NOCACHE_PATHS || '' !== tk_pc_nocache_lookahead() || '' !== tk_pc_nocache_reason( '/kontakt/' ) ) {
	$fail( 'never-cached list is not empty / lookahead not empty' );
}

// The root .htaccess block, precompressed (3 rules: br, gz, plain) and plain (1 rule).
$opts  = array( 'host' => 'radostvpohybu.cz', 'cache_fs' => '/srv/wp-content/cache/tk-page', 'cache_url' => 'wp-content/cache/tk-page', 'base' => '/', 'precompressed' => true );
$block = implode( "\n", tk_pc_htaccess_block( $opts ) );
foreach ( array( TK_PC_BYPASS_COOKIE_RE, TK_PC_PATH_RE, TK_PC_AE_BR_RE, TK_PC_AE_GZIP_RE, '%{HTTP:' . TK_PC_WARM_HEADER . '} ^$', '=radostvpohybu.cz [NC]', 'RewriteCond %{QUERY_STRING} ^$', 'RewriteCond %{THE_REQUEST} !' . TK_PC_RAW_DOUBLE_SLASH_RE . ' [NC]', '"/srv/wp-content/cache/tk-page/$1index.html.br" -f', '"wp-content/cache/tk-page/$1index.html.gz" [L]' ) as $needle ) {
	++$extra;
	if ( false === strpos( $block, $needle ) ) {
		$fail( '.htaccess block lacks ' . $needle );
	}
}
++$extra;
if ( 3 !== substr_count( $block, 'RewriteRule ^(' . TK_PC_PATH_RE . ')$ ' ) ) {
	$fail( '.htaccess block: expected 3 rules (br/gz/plain) with the path pattern, got ' . substr_count( $block, 'RewriteRule ' ) );
}
++$extra;
$plain = implode( "\n", tk_pc_htaccess_block( array_merge( $opts, array( 'precompressed' => false, 'host' => '' ) ) ) );
if ( 1 !== substr_count( $plain, 'RewriteRule ' ) || false !== strpos( $plain, 'HTTP_HOST' ) || false !== strpos( $plain, 'Accept-Encoding' ) ) {
	$fail( '.htaccess block without precompression/host: one rule, no host or Accept-Encoding condition' );
}
// The rule pattern as Apache sees it (path without the leading "/").
$rule_re = '~^(' . TK_PC_PATH_RE . ')$~D';
foreach ( array( '' => 1, 'kontakt/' => 1, 'clanky/detail/' => 1, 'Kontakt/' => 0, 'wp-admin/' => 0, 'feed/' => 0, 'kontakt' => 0, 'kontakt/feed/' => 0 ) as $rel => $want ) {
	++$extra;
	if ( preg_match( $rule_re, $rel ) !== $want ) {
		$fail( sprintf( '.htaccess pattern on "%s": %s', $rel, $want ? 'not served' : 'served' ) );
	}
}

// The cache directory's .htaccess: direct access 404, headers, encodings.
$dir = tk_pc_cache_dir_htaccess();
foreach ( array( 'RewriteCond %{THE_REQUEST} \s/+wp-content/cache/ [NC]', 'RewriteRule ^ - [R=404,L]', 'Header set Cache-Control "public, max-age=0, must-revalidate"', 'Header merge Vary Accept-Encoding', 'Header set X-TK-Cache HIT', 'AddEncoding gzip .gz', 'AddEncoding br .br' ) as $needle ) {
	++$extra;
	if ( false === strpos( $dir, $needle ) ) {
		$fail( 'cache dir .htaccess lacks ' . $needle );
	}
}
++$extra;
if ( 'public, max-age=0, s-maxage=600, must-revalidate' !== tk_pc_cache_control( 600 ) || false === strpos( tk_pc_cache_dir_htaccess( 600 ), 's-maxage=600' ) ) {
	$fail( 'edge TTL not applied' );
}

$total = count( $cases['decide'] ) + count( $cases['pick'] ) + count( $cases['request_line'] );
++$extra;
if ( 3 !== substr_count( $block, 'RewriteCond %{THE_REQUEST} !' ) ) {
	$fail( '.htaccess block: expected the double-slash condition in each of the 3 rules' );
}
$failed ? WP_CLI::error( "$failed failure(s) in $total shared cases + $extra .htaccess checks" ) : WP_CLI::success( "$total shared cases pass (+ $extra .htaccess checks)" );
