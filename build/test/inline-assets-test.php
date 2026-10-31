<?php
/**
 * Inline CSS/JS (theme inc/assets.php).
 *   ./wp.sh eval-file /project/build/test/inline-assets-test.php
 * 1. The comment strippers (pure functions): what goes, what must stay.
 * 2. Rendered pages over HTTP (TK_TEST_BASE, default http://wordpress): an anonymous visitor gets the local
 *    stylesheets and the theme scripts inline (comments stripped); a logged-in user (admin bar) and the
 *    Elementor preview (editor) get the ordinary <link>/<script src> tags.
 * Never applied to the speculation rules (inc/speculation.php prints its own JSON, untouched).
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

if ( ! function_exists( 'tk_strip_css_comments' ) || ! function_exists( 'tk_strip_js_line_comments' ) || ! function_exists( 'tk_perf_enabled' ) ) {
	WP_CLI::error( 'tk_strip_css_comments() / tk_strip_js_line_comments() / tk_perf_enabled() missing (inc/assets.php)' );
}

$css = static fn( $in ) => tk_strip_css_comments( $in );

// 1a. CSS: comments gone.
$ok( '.a{color:red}' === $css( '/* x */.a{color:red}' ), 'leading comment removed: ' . wp_json_encode( $css( '/* x */.a{color:red}' ) ) );
$ok( ".a{color:red}\n.b{x:y}" === $css( ".a{color:red}\n/* ---- section (Main.dc.html:31) ---- */\n.b{x:y}" ), 'a comment on its own line goes with its line' );
$ok( ".a{color:red}\n.b{x:y}" === $css( ".a{color:red}\n/* multi\n   line\n*/\n.b{x:y}" ), 'multi-line comment removed with its lines' );
$ok( '.a{color:red}' === $css( '.a{color:red/* why */}' ), 'comment inside a declaration removed' );
$ok( '.a{color:red} .b{}' === $css( '.a{color:red} /* x */ .b{}' ), 'no double space left behind' );
$ok( 'a b' === $css( 'a/**/b' ), 'a/**/b → "a b" (never glues two tokens): ' . wp_json_encode( $css( 'a/**/b' ) ) );
$ok( '.a.b' === $css( '.a/**/.b' ), '.a/**/.b → .a.b (no descendant combinator): ' . wp_json_encode( $css( '.a/**/.b' ) ) );
$ok( '#x[y]' === $css( '#x/**/[y]' ), '#x/**/[y] → #x[y]' );
$ok( 'é ü' === $css( 'é/**/ü' ), 'non-ASCII ident chars count as ident (space kept)' );
$ok( '.a\\"b{color:red}' === $css( '.a\\"b{/* x */color:red}' ), 'escaped quote is no string start (comment after it still removed): ' . wp_json_encode( $css( '.a\\"b{/* x */color:red}' ) ) );
$ok( '.a\\/*b{}' === $css( '.a\\/*b{}' ), 'escaped slash starts no comment' );
$ok( 'a' === $css( 'a/* unterminated' ), 'an unterminated comment runs to the end (as in CSS)' );
$ok( false === strpos( $css( "/*# sourceMappingURL=x.css.map */\n.a{}" ), 'sourceMappingURL' ), 'source map comment removed' );

// 1b. CSS: what must stay.
foreach (
	array(
		'.a::before{content:"/* not a comment */"}',
		".a::before{content:'/* single */'}",
		'.a::before{content:"esc \\" /* still a string */"}',
		'.a{background:url(a/*b)}',
		'.a{background:URL( a/*b/c.png )}',
		'.a{background:url("x/*y.png")}',
		'/*! keep me (licence) */.a{}',
		'.a{color:red}',
		'.a//b{}',
	) as $keep
) {
	$ok( $keep === $css( $keep ), 'kept as is: ' . $keep . ' → ' . $css( $keep ) );
}
$ok( '/*!x*/.a{}' === $css( '/*!x*//* y */.a{}' ), '/*! kept, the plain comment after it removed' );
$ok( '' === $css( '' ), 'empty stays empty' );

// 1c. JS: whole-line // comments only.
$js = static fn( $in ) => tk_strip_js_line_comments( $in );
$ok( "(function () {\n  var a = 1;\n})();" === $js( "// header\n// more\n(function () {\n  // inside\n  var a = 1;\n})();" ), 'whole-line // comments removed' );
foreach (
	array(
		'const p = (/%$/.test(v) ? 1 : 0);',
		"const s = '//x';",
		'const u = "https://example.com/";',
		'if (x) return; // trailing comment stays (not a whole line)',
		'var r = a / b / c;',
	) as $keep
) {
	$ok( $keep === $js( $keep ), 'kept as is: ' . $keep . ' → ' . $js( $keep ) );
}
$ok( "a;\r\nb;" === $js( "a;\r\n  // c\r\nb;" ), 'CRLF line comment removed' );

// 1d. The theme's own files.
$theme = get_stylesheet_directory();
foreach ( glob( $theme . '/assets/js/*.js' ) as $file ) {
	$out = tk_strip_js_line_comments( (string) file_get_contents( $file ) ); // phpcs:ignore
	$ok( 0 === preg_match( '~^\s*//~m', $out ), basename( $file ) . ' stripped: no line starts with //' );
}
$site_raw = (string) file_get_contents( $theme . '/assets/css/site.css' ); // phpcs:ignore
$site     = tk_strip_css_comments( $site_raw );
$ok( false === strpos( $site, '.dc.html' ) && false === strpos( $site, '/*' ), 'site.css stripped: no comments, no .dc.html' );
$naive = (string) preg_replace( '~/\*.*?\*/~s', '', $site_raw ); // site.css has no "/*" in a string or url().
$ok( preg_replace( '~\s+~', '', $naive ) === preg_replace( '~\s+~', '', $site ), 'site.css: same code as a naive comment strip (whitespace aside)' );
$spec = (string) file_get_contents( $theme . '/inc/speculation.php' ); // phpcs:ignore
$ok( false === strpos( $spec, 'tk_strip_' ), 'inc/speculation.php does not call a stripper' );

// 1e. CSS subsets (build/css-subset.mjs → assets/css/subsets/manifest.json): every subset is current, i.e. its
// source still has the recorded sha1 (else the full source is served and the subset is dead weight).
$subsets = tk_css_subsets();
$ok( count( $subsets ) >= 1, 'subset manifest read (' . count( $subsets ) . ' entries)' );
foreach ( $subsets as $key => $entry ) {
	if ( 0 === strpos( $key, 'inline:' ) ) {
		continue; // Checked on the rendered page below.
	}
	$src = WP_CONTENT_DIR . '/' . $key;
	$ok( is_readable( $src ) && hash_equals( (string) $entry['sha1'], (string) sha1_file( $src ) ), "subset of $key is current (else: node build/css-subset.mjs)" );
	$ok( '' !== tk_css_subset_path( $key, (string) $entry['sha1'] ) && '' === tk_css_subset_path( $key, str_repeat( '0', 40 ) ), "$key: subset used only while the sha1 matches" );
}

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
	return is_wp_error( $r ) ? array( 0, '', '' ) : array( (int) wp_remote_retrieve_response_code( $r ), (string) wp_remote_retrieve_body( $r ), (string) wp_remote_retrieve_header( $r, 'x-tk-cache' ) );
};
$theme_url = wp_parse_url( get_stylesheet_directory_uri(), PHP_URL_PATH );
$links     = static fn( $html ) => preg_match_all( "~<link[^>]+rel=['\"]stylesheet['\"][^>]+href=['\"][^'\"]*" . preg_quote( $theme_url, '~' ) . '/assets/~', $html );
$srcs      = static fn( $html ) => preg_match_all( "~<script[^>]+id=['\"]tk-[a-z-]+-js['\"][^>]+src=~", $html );

$kontakt = get_page_by_path( 'kontakt' );
$pages   = array( '/', $kontakt ? (string) wp_parse_url( get_permalink( $kontakt ), PHP_URL_PATH ) : '/kontakt/' );
foreach ( $pages as $path ) {
	foreach ( array( '', 'tk_nocache=1' ) as $cookie ) {
		list( $code, $html, $x ) = $fetch( $path, $cookie );
		$who                     = "anonymous $path" . ( $cookie ? ' (forced render)' : '' ) . " [$x]";
		$ok( 200 === $code && false === strpos( $html, 'id="wpadminbar"' ), "$who: HTTP $code, no admin bar" );
		$ok( 1 === preg_match( "~<style id='tk-site-css'>@layer tk\{(?!@import)[^<]{200,}~", $html ), "$who: site.css printed inline (in @layer tk)" );
		$ok( 1 === preg_match( "~<style id='tk-chrome-css'>(?!@import)[^<]+</style>~", $html ), "$who: chrome.css printed inline, unlayered" );
		$ok( 0 === $links( $html ), "$who: no <link rel=stylesheet> to theme CSS" );
		$ok( 1 === preg_match( "~<script id='tk-nav-js'>[^<]{20,}</script>~", $html ) && 0 === $srcs( $html ), "$who: theme scripts inline, none with src" );
		$ok( false === strpos( $html, '.dc.html' ), "$who: no prototype references left (comments stripped)" );
		$ok( 1 === preg_match( '~<script id="tk-speculation">[^<]*"href_matches"~', $html ), "$who: speculation rules present, JSON untouched" );
		$ok( 1 === preg_match( "~<style id='elementor-frontend-css'>@layer tk\{([^<]+)</style>~", $html, $ef ) && strlen( $ef[1] ) < 20000 && false !== strpos( $ef[1], '.e-con{' ) && false === strpos( $ef[1], 'elementor-lightbox' ), "$who: Elementor frontend CSS is the subset (" . strlen( $ef[1] ?? '' ) . ' B, has .e-con, no lightbox)' );
		$ok( false === strpos( $html, 'e-paragraph-base' ), "$who: Elementor's atomic-widget inline CSS dropped (subset empty)" );
	}
}

// Logged-in (admin bar) and the Elementor preview (editor): ordinary tags.
$admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ID',
	)
);
if ( ! $admins ) {
	$ok( false, 'an administrator exists' );
} else {
	$auth = LOGGED_IN_COOKIE . '=' . rawurlencode( wp_generate_auth_cookie( (int) $admins[0], time() + 600, 'logged_in' ) );
	$id   = $kontakt ? (int) $kontakt->ID : 0;
	foreach ( array( 'logged-in' => $pages[1], 'Elementor preview' => $pages[1] . '?elementor-preview=' . $id ) as $who => $path ) {
		list( $code, $html, $x ) = $fetch( $path, $auth );
		$who                    .= " $path [$x]";
		$ok( 200 === $code && 'BYPASS (cookie)' === $x, "$who: HTTP $code, X-TK-Cache \"$x\"" );
		$ok( 0 === preg_match( "~<style id='tk-site-css'>(?!@import)~", $html ), "$who: site.css not inlined" );
		$ok( $links( $html ) >= 1, "$who: theme CSS as <link> tags" );
		// The preview loads no behaviour scripts at all (tk_enqueue_assets() returns early in the editor).
		$ok( 0 === preg_match( "~<script id='tk-[a-z-]+-js'>[^<]~", $html ) && ( 0 === strpos( $who, 'Elementor' ) || $srcs( $html ) >= 1 ), "$who: no theme script inline" . ( 0 === strpos( $who, 'Elementor' ) ? '' : ', all as <script src>' ) );
		$ok( false === strpos( $html, '<script id="tk-speculation">' ), "$who: no speculation rules (logged-in/editor)" );
		$ok( 0 === preg_match( "~<style id='elementor-frontend-css'>(?!@import)~", $html ), "$who: Elementor frontend CSS not inlined (the full file, no subset)" );
	}
	list( , $html ) = $fetch( $pages[1], $auth );
	$ok( false !== strpos( $html, 'id="wpadminbar"' ), 'logged-in: admin bar shows (what turns the inlining off)' );
}

$failed ? WP_CLI::error( "$failed of $checks checks failed" ) : WP_CLI::success( "$checks inline-asset checks pass" );
