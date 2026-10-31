<?php
/**
 * Styles and scripts (port of martinadamus inc/assets.php). Hello Elementor's own CSS is removed: the
 * prototype ran on its own site.css, and Hello's reset/theme styles would shift every section.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cache-busting version: file modification time.
 *
 * @param string $rel Path relative to the theme directory.
 * @return string
 */
function tk_asset_ver( $rel ) {
	$file = TK_THEME_DIR . '/' . $rel;

	return file_exists( $file ) ? (string) filemtime( $file ) : '0';
}

add_filter( 'hello_elementor_enqueue_style', '__return_false' );
add_filter( 'hello_elementor_enqueue_theme_style', '__return_false' );
add_filter( 'hello_elementor_description_meta_tag', '__return_false' ); // The description is The SEO Framework's (wp tk seo-setup).

/**
 * The current page's generated style-attribute rules (build/generate.mjs: assets/css/pages/<slug>.css), or ''.
 * The front page's slug is `domu`.
 *
 * @return string Path relative to the theme directory.
 */
function tk_page_css_rel() {
	if ( ! is_page() ) {
		return '';
	}

	$slug = sanitize_file_name( (string) get_post_field( 'post_name', get_queried_object_id() ) );
	$rel  = 'assets/css/pages/' . $slug . '.css';

	return ( '' !== $slug && file_exists( TK_THEME_DIR . '/' . $rel ) ) ? $rel : '';
}

/**
 * Whether a theme stylesheet holds anything besides comments and whitespace.
 *
 * @param string $rel Path relative to the theme directory.
 * @return bool
 */
function tk_css_has_rules( $rel ) {
	$file = TK_THEME_DIR . '/' . $rel;
	return is_readable( $file ) && '' !== trim( tk_strip_css_comments( (string) file_get_contents( $file ) ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file.
}

/**
 * Enqueue theme CSS/JS. Behaviour scripts are deferred; page-specific ones only where _tk_scripts asks.
 *
 * site.css + states.css are served in @layer tk with everything else; chrome.css (header/footer element
 * classes) and the page's pages/<slug>.css (the former style="…" attributes, R36) stay unlayered (see below).
 */
function tk_enqueue_assets() {
	foreach ( array( 'site', 'states', 'chrome' ) as $i => $name ) {
		if ( 'states' === $name && ! tk_css_has_rules( 'assets/css/states.css' ) ) {
			continue; // The prototype has no style-hover/-active/-focus: the generated file is only its header comment.
		}
		wp_enqueue_style( 'tk-' . $name, TK_THEME_URI . '/assets/css/' . $name . '.css', $i ? array( 'tk-site' ) : array(), tk_asset_ver( 'assets/css/' . $name . '.css' ) );
	}

	$page_css = tk_page_css_rel();
	if ( '' !== $page_css ) {
		wp_enqueue_style( 'tk-page', TK_THEME_URI . '/' . $page_css, array( 'tk-chrome' ), tk_asset_ver( $page_css ) );
	}

	if ( tk_is_elementor_editing() ) {
		return;
	}

	// Cross-document view transitions (martinadamus R59 technique): vt.js must run in <head>, synchronously, so its
	// @view-transition opt-in and its pagereveal listener exist before the first render. Inlined by
	// tk_inline_script_tag() like the other theme scripts.
	wp_enqueue_script( 'tk-vt', TK_THEME_URI . '/assets/js/vt.js', array(), tk_asset_ver( 'assets/js/vt.js' ), array( 'in_footer' => false ) );

	$deferred = array(
		'in_footer' => true,
		'strategy'  => 'defer',
	);

	foreach ( array_merge( array( 'nav', 'reveal' ), tk_page_scripts() ) as $name ) {
		wp_enqueue_script( 'tk-' . $name, TK_THEME_URI . '/assets/js/' . $name . '.js', array(), tk_asset_ver( 'assets/js/' . $name . '.js' ), $deferred );
	}
}
add_action( 'wp_enqueue_scripts', 'tk_enqueue_assets', 20 );

/**
 * Remove parent-theme and block-editor styles this site never uses.
 */
function tk_dequeue_unused_styles() {
	foreach ( array( 'hello-elementor', 'hello-elementor-theme-style', 'hello-elementor-header-footer', 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles', 'core-block-supports' ) as $handle ) {
		wp_dequeue_style( $handle );
		wp_deregister_style( $handle );
	}

	// Hello's own header/footer menu JS: our header.php/footer.php replace Hello's templates entirely.
	wp_dequeue_script( 'hello-theme-frontend' );
	wp_deregister_script( 'hello-theme-frontend' );
}
add_action( 'wp_enqueue_scripts', 'tk_dequeue_unused_styles', 100 );

/**
 * Early <head>: the cascade-layer order, the `js` class and the scroll-reveal pre-hide switch.
 *
 * `js` on <html>: the Praha/Zlín tab panels stack only with JS (site.css; without it both show, tablist hidden),
 * and the mobile menu button only shows with JS. [data-reveal-ready] lets site.css hide `.reveal` blocks until
 * reveal.js reveals them; reveal.js sets data-reveal-live, and if it never runs the 3 s timeout lifts the pre-hide,
 * so content can never stay hidden. Without JS nothing is hidden. Off in the Elementor editor (content stays visible).
 */
function tk_head_early() {
	// The page canvas rides in the same tiny tag (same value as site.css --bg): a navigation, and a view
	// transition's snapshots, never show a white canvas before the stylesheets apply.
	if ( tk_layers_enabled() ) {
		echo "<style id='tk-layers'>@layer tk-important,tk;html{background:#0E0F0E;color-scheme:dark}</style>\n";
	} else {
		echo "<style id='tk-canvas'>html{background:#0E0F0E;color-scheme:dark}</style>\n";
	}

	if ( tk_is_elementor_editing() ) {
		echo "<script>document.documentElement.classList.add('js');</script>\n";
		return;
	}

	echo "<script>(function(d){d.classList.add('js');if(!('IntersectionObserver' in window))return;d.setAttribute('data-reveal-ready','');setTimeout(function(){if(!d.hasAttribute('data-reveal-live'))d.removeAttribute('data-reveal-ready')},3000)})(document.documentElement);</script>\n";
}
add_action( 'wp_head', 'tk_head_early', 0 );

/**
 * The page's image preloads (_tk_preload; port of martinadamus R57 / R61 A7): a CSS-background LCP photo is
 * invisible to the preload scanner, and a hero <img> after the inline CSS is found late. A responsive preload
 * carries the <img>'s own srcset/sizes (tk_upload_srcset() = the srcset tk_responsive_img_tag() gives it), so the
 * browser picks the same file.
 */
function tk_image_preloads() {
	foreach ( tk_page_preloads() as $image ) {
		$srcset = '' !== $image['sizes'] ? tk_upload_srcset( $image['src'] ) : '';

		if ( '' !== $srcset ) {
			printf( '<link rel="preload" href="%s" as="image" fetchpriority="high" imagesrcset="%s" imagesizes="%s">' . "\n", esc_url( home_url( $image['src'] ) ), esc_attr( $srcset ), esc_attr( $image['sizes'] ) );
		} else {
			printf( '<link rel="preload" href="%s" as="image" fetchpriority="high">' . "\n", esc_url( home_url( $image['src'] ) ) );
		}
	}
}
add_action( 'wp_head', 'tk_image_preloads', 1 );

/*
 * ---- Front-end performance ---------------------------------------------------------------------
 *
 * The pages are Elementor containers holding HTML widgets only, and every behaviour is the theme's own JS.
 * So on a public page view:
 *   - Elementor's frontend JS bundle (webpack runtime, frontend-modules, frontend, jQuery UI core) has nothing
 *     to run, and jQuery + jquery-migrate, which only that bundle needed, were render-blocking. They are dequeued
 *     (a script that really needs jQuery still gets it as a dependency).
 *   - Elementor v4's atomic-widget base styles (uploads/elementor/css/base-*.css) match nothing here: dequeued.
 *   - Elementor's Google Fonts are never printed (the kit uses the self-hosted Geist; inc/fonts.php).
 *   - The remaining small local stylesheets (Elementor frontend + kit/post CSS, theme site/states/chrome/page CSS)
 *     are printed inline in place of their <link> tags; the theme scripts inline before </body>.
 * None of this runs in the Elementor editor/preview, the Customizer, or when the admin bar shows.
 * tk_perf_enabled() is the single switch.
 */

/**
 * Whether the front-end optimisations apply to this request.
 *
 * @return bool
 */
function tk_perf_enabled() {
	$on = ! is_admin() && ! tk_is_elementor_editing() && ! is_admin_bar_showing() && ! is_customize_preview();

	/**
	 * Filter: turn the front-end optimisations off (e.g. for debugging a single request).
	 *
	 * @param bool $on Whether they apply.
	 */
	return (bool) apply_filters( 'tk_perf_enabled', $on );
}

/** Scripts the pages never use (see above). */
const TK_UNUSED_SCRIPTS = array( 'elementor-frontend', 'elementor-frontend-modules', 'elementor-webpack-runtime', 'jquery-ui-core', 'jquery', 'jquery-migrate' );

/**
 * Dequeue unused scripts and styles. Runs late on wp_enqueue_scripts and again on wp_footer after
 * Elementor's own wp_footer (priority 10), which is where it enqueues its frontend scripts.
 */
function tk_dequeue_unused_assets() {
	if ( ! tk_perf_enabled() ) {
		return;
	}

	foreach ( TK_UNUSED_SCRIPTS as $handle ) {
		wp_dequeue_script( $handle );
	}

	foreach ( wp_styles()->queue as $handle ) {
		$src = wp_styles()->registered[ $handle ]->src ?? '';
		if ( ( 0 === strpos( $handle, 'base-' ) && false !== strpos( (string) $src, '/elementor/css/base-' ) ) || false !== strpos( (string) $src, 'fonts.googleapis.com' ) ) {
			wp_dequeue_style( $handle );
		}
	}
}
add_action( 'wp_enqueue_scripts', 'tk_dequeue_unused_assets', PHP_INT_MAX );
add_action( 'wp_footer', 'tk_dequeue_unused_assets', 11 );

// No Google Fonts from Elementor, ever (kit-setup also sets elementor_google_font = 0).
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

/**
 * Map a URL of this site to a readable local file under wp-content/ or wp-includes/, or '' if it is not one.
 *
 * @param string $url Asset URL (may carry ?ver=).
 * @return string Absolute path, or ''.
 */
function tk_local_asset_path( $url ) {
	$url = strtok( (string) $url, '?#' );
	if ( '' === $url || false === $url ) {
		return '';
	}

	$bases = array(
		content_url()  => WP_CONTENT_DIR,
		includes_url() => ABSPATH . WPINC . '/',
	);

	foreach ( $bases as $base => $dir ) {
		$base = set_url_scheme( untrailingslashit( $base ) );
		if ( 0 === strpos( set_url_scheme( $url ), $base . '/' ) ) {
			$rel  = substr( set_url_scheme( $url ), strlen( $base ) + 1 );
			$path = realpath( untrailingslashit( $dir ) . '/' . $rel );
			$root = realpath( $dir );

			return ( $path && $root && 0 === strpos( $path, trailingslashit( $root ) ) && is_readable( $path ) ) ? $path : '';
		}
	}

	return '';
}

/**
 * Resolve a relative URL against a base URL (for url() inside inlined CSS), dropping ./ and ../ segments.
 *
 * @param string $rel  Relative reference.
 * @param string $base Absolute URL of the stylesheet.
 * @return string
 */
function tk_resolve_url( $rel, $base ) {
	$base = strtok( $base, '?#' );
	$dir  = substr( $base, 0, strrpos( $base, '/' ) + 1 );
	$p    = wp_parse_url( $dir );
	$out  = array();

	foreach ( explode( '/', ( $p['path'] ?? '/' ) . $rel ) as $seg ) {
		if ( '..' === $seg ) {
			array_pop( $out );
		} elseif ( '.' !== $seg ) {
			$out[] = $seg;
		}
	}

	return $p['scheme'] . '://' . $p['host'] . ( isset( $p['port'] ) ? ':' . $p['port'] : '' ) . implode( '/', $out );
}

/*
 * ---- Curated subsets of third-party CSS ----------------------------------------------------------
 *
 * Elementor's frontend.min.css (~55 kB: sections/columns, every widget, lightbox, editor states) and its
 * atomic-widget inline CSS were printed whole on every page, though the pages only use containers + HTML
 * widgets. build/css-subset.mjs writes assets/css/subsets/<id>.css (the source's rules that can match some
 * element of some built page, JS-added states counted as present; exact source text, never rewritten) and
 * manifest.json with each source's sha1. A subset replaces its source only while that sha1 still matches, so a
 * plugin update falls back to the full CSS until the script is re-run (`node build/css-subset.mjs --check`
 * reports stale subsets; inline-assets-test.php fails on one). Front end only (tk_perf_enabled()): the editor
 * and logged-in views get the full files.
 */

/**
 * The subset manifest: key (path under wp-content/, or "inline:<handle>") => entry. Empty for a request with the
 * cookie tk_nocache=full-css (how build/css-subset.mjs reads the full sources off the page; any tk_nocache cookie
 * already makes the page cache bypass, so such a render is never stored).
 *
 * @return array<string, array{sha1: string, subset: string}>
 */
function tk_css_subsets() {
	static $sources = null;
	if ( isset( $_COOKIE['tk_nocache'] ) && 'full-css' === $_COOKIE['tk_nocache'] ) {
		return array();
	}
	if ( null === $sources ) {
		$file    = TK_THEME_DIR . '/assets/css/subsets/manifest.json';
		$data    = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file.
		$sources = is_array( $data['sources'] ?? null ) ? $data['sources'] : array();
	}
	return $sources;
}

/**
 * The subset file for a source, or '' when there is none or the source no longer has the recorded sha1.
 *
 * @param string $key  Manifest key.
 * @param string $sha1 The source's current sha1.
 * @return string Absolute path of the subset.
 */
function tk_css_subset_path( $key, $sha1 ) {
	$entry = tk_css_subsets()[ $key ] ?? null;
	if ( ! is_array( $entry ) || ! hash_equals( (string) ( $entry['sha1'] ?? '' ), $sha1 ) || ! preg_match( '~^[a-z0-9-]+\.css$~', (string) ( $entry['subset'] ?? '' ) ) ) {
		return '';
	}
	$path = TK_THEME_DIR . '/assets/css/subsets/' . $entry['subset'];
	return is_readable( $path ) ? $path : '';
}

/**
 * A local stylesheet file to read for inlining: its subset when one matches, else the file itself.
 *
 * @param string $path Absolute path of the stylesheet.
 * @return string
 */
function tk_css_subset_file( $path ) {
	$content = realpath( WP_CONTENT_DIR );
	if ( ! $content || 0 !== strpos( $path, $content . '/' ) || ! tk_perf_enabled() ) {
		return $path;
	}
	$subset = tk_css_subset_path( substr( $path, strlen( $content ) + 1 ), (string) sha1_file( $path ) );
	return '' !== $subset ? $subset : $path;
}

/**
 * Replace a handle's inline `after` CSS by its subset ("inline:<handle>" in the manifest) when the text still has
 * the recorded sha1; an empty subset removes it. Runs before tk_layer_inline_styles() wraps it.
 */
function tk_subset_inline_styles() {
	if ( ! tk_perf_enabled() ) {
		return;
	}
	$styles = wp_styles();
	foreach ( array_keys( tk_css_subsets() ) as $key ) {
		$handle = 0 === strpos( $key, 'inline:' ) ? substr( $key, 7 ) : '';
		$after  = '' !== $handle ? $styles->get_data( $handle, 'after' ) : null;
		if ( empty( $after ) || ! is_array( $after ) || in_array( TK_LAYER_OPEN, $after, true ) ) {
			continue;
		}
		$subset = tk_css_subset_path( $key, sha1( implode( "\n", $after ) ) );
		if ( '' === $subset ) {
			continue;
		}
		$css = trim( (string) file_get_contents( $subset ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file.
		$styles->add_data( $handle, 'after', '' === $css ? array() : array( $css ) );
	}
}
add_action( 'wp_print_styles', 'tk_subset_inline_styles', PHP_INT_MAX - 1 );
add_action( 'wp_print_footer_scripts', 'tk_subset_inline_styles', 0 );

/** Stylesheets larger than this stay external (inlining is for the small render-blocking ones). */
const TK_INLINE_CSS_MAX_BYTES = 65536;

/*
 * ---- Cascade layers (R36: no inline style attributes) --------------------------------------------
 *
 * The generated pages carry no style="…" attributes: build/lib/finalize.mjs turns each one into a tk-s-<hash>
 * class (assets/css/pages/<slug>.css), and header/footer use chrome.css. An inline style beat every normal
 * author rule whatever its specificity and lost only to !important; to keep exactly that, every OTHER
 * stylesheet (Elementor frontend/kit/post CSS, site.css, states.css, WordPress/plugin CSS, their inline
 * `after` styles) is put into the cascade layer `tk` — in its original order, so they compare with each other
 * exactly as before — and the element-level rules stay unlayered: an unlayered normal rule beats any layered
 * normal rule, while a layered !important (site.css's phone overrides, e.g. `.site .h1{font-size:… !important}`)
 * still beats it, as it beat the inline style. The element rules' own !important declarations sit in the layer
 * `tk-important`, declared before `tk` (tk_head_early()), because for !important the earlier layer wins.
 * The @font-face block (inc/fonts.php) has no selectors and is printed unlayered.
 * Off in the Elementor editor/preview and the Customizer; there the element rules load as ordinary stylesheets.
 */

/** Handles served unlayered: the style-attribute replacements. */
const TK_UNLAYERED_STYLES = array( 'tk-chrome', 'tk-page' );

/** Markers around a handle's inline `after` CSS, so the wrap can be redone idempotently. */
const TK_LAYER_OPEN  = '@layer tk{/*tk-layer*/';
const TK_LAYER_CLOSE = '/*tk-layer*/}';

/**
 * Whether stylesheets are put into cascade layers on this request.
 *
 * @return bool
 */
function tk_layers_enabled() {
	$on = ! is_admin() && ! tk_is_elementor_editing() && ! is_customize_preview();

	/**
	 * Filter: turn the cascade layers off (e.g. for debugging a single request).
	 *
	 * @param bool $on Whether they apply.
	 */
	return (bool) apply_filters( 'tk_layers_enabled', $on );
}

/**
 * Wrap every registered handle's inline `after` CSS into the layer `tk`. Runs right before the head and the
 * footer styles print; re-wraps a handle that got more inline CSS since.
 */
function tk_layer_inline_styles() {
	if ( ! tk_layers_enabled() ) {
		return;
	}

	$styles = wp_styles();
	foreach ( array_keys( $styles->registered ) as $handle ) {
		$after = $styles->get_data( $handle, 'after' );
		if ( in_array( $handle, TK_UNLAYERED_STYLES, true ) || empty( $after ) || ! is_array( $after ) ) {
			continue;
		}

		$code = array_values( array_diff( $after, array( TK_LAYER_OPEN, TK_LAYER_CLOSE ) ) );
		if ( $code ) {
			$styles->add_data( $handle, 'after', array_merge( array( TK_LAYER_OPEN ), $code, array( TK_LAYER_CLOSE ) ) );
		}
	}
}
add_action( 'wp_print_styles', 'tk_layer_inline_styles', PHP_INT_MAX );
add_action( 'wp_print_footer_scripts', 'tk_layer_inline_styles', 1 );

// The Customizer's "Additional CSS" goes into the layer too.
add_filter( 'wp_get_custom_css', static fn( $css ) => tk_layers_enabled() && '' !== trim( (string) $css ) ? '@layer tk{' . $css . '}' : $css );

/**
 * CSS without its comments, for printing inline (the files keep them). A small tokenizer, not a regex: quoted
 * strings (with escapes) and unquoted url(…) are copied verbatim, so a "/*" inside them is never taken for a
 * comment; "/*!" comments (licences) stay. A comment alone on its line goes with its line; one between two
 * ident chars becomes one space, anywhere else nothing. Port of ma_strip_css_comments().
 *
 * @param string $css Stylesheet source.
 * @return string
 */
function tk_strip_css_comments( $css ) {
	$css   = (string) $css;
	$len   = strlen( $css );
	$out   = '';
	$ident = static fn( $ch ) => 1 === preg_match( '~[A-Za-z0-9_\-]~', $ch ) || ord( $ch ) >= 0x80;
	for ( $i = 0; $i < $len; ) {
		$c = $css[ $i ];

		if ( '\\' === $c ) {
			$out .= substr( $css, $i, 2 );
			$i   += 2;
			continue;
		}

		if ( '"' === $c || "'" === $c ) {
			$j = $i + 1;
			while ( $j < $len && $css[ $j ] !== $c && "\n" !== $css[ $j ] ) {
				$j += '\\' === $css[ $j ] ? 2 : 1;
			}
			$j    = min( $j + 1, $len );
			$out .= substr( $css, $i, $j - $i );
			$i    = $j;
			continue;
		}

		if ( ( 'u' === $c || 'U' === $c ) && 0 === substr_compare( $css, 'url(', $i, 4, true ) && ( 0 === $i || ! preg_match( '~[\w-]~', $css[ $i - 1 ] ) ) ) {
			$j = $i + 4;
			while ( $j < $len && false !== strpos( " \t\r\n\f", $css[ $j ] ) ) {
				++$j;
			}
			if ( $j < $len && ( '"' === $css[ $j ] || "'" === $css[ $j ] ) ) {
				$out .= substr( $css, $i, $j - $i );
				$i    = $j;
				continue;
			}
			$end  = strpos( $css, ')', $j );
			$end  = false === $end ? $len : $end + 1;
			$out .= substr( $css, $i, $end - $i );
			$i    = $end;
			continue;
		}

		if ( '/' === $c && $i + 1 < $len && '*' === $css[ $i + 1 ] ) {
			$close = strpos( $css, '*/', $i + 2 );
			$end   = false === $close ? $len : $close + 2;
			if ( $i + 2 < $len && '!' === $css[ $i + 2 ] ) {
				$out .= substr( $css, $i, $end - $i );
				$i    = $end;
				continue;
			}
			$line_start = '' === $out || 1 === preg_match( '~(?:^|\n)[ \t]*$~', $out );
			if ( $line_start && 1 === preg_match( '~\G[ \t]*(?:\r?\n|\z)~', $css, $m, 0, $end ) ) {
				$out = rtrim( $out, " \t" );
				$i   = $end + strlen( $m[0] );
				continue;
			}
			$prev = '' === $out ? ' ' : substr( $out, -1 );
			if ( false !== strpos( " \t\r\n\f", $prev ) ) {
				$end += strspn( $css, " \t", $end );
			} elseif ( $end < $len && $ident( $prev ) && $ident( $css[ $end ] ) ) {
				$out .= ' ';
			}
			$i = $end;
			continue;
		}

		$out .= $c;
		++$i;
	}

	return $out;
}

/**
 * JS without its whole-line "//" comments, for printing inline. Only lines that start (after indentation)
 * with "//" go; nothing is parsed. The theme scripts have no template literal with such a line.
 *
 * @param string $js Script source.
 * @return string
 */
function tk_strip_js_line_comments( $js ) {
	return (string) preg_replace( '~^[ \t]*//[^\r\n]*(?:\r?\n|\z)~m', '', (string) $js );
}

/**
 * A local stylesheet's CSS ready to print inline (url()s made absolute), or '' when it must stay a file
 * (not local, too large, empty, or containing </style or @import).
 *
 * @param string $href Stylesheet URL.
 * @return string
 */
function tk_inlinable_css( $href ) {
	$path = tk_local_asset_path( $href );
	$path = $path ? tk_css_subset_file( $path ) : '';
	if ( ! $path || '.css' !== substr( $path, -4 ) || filesize( $path ) > TK_INLINE_CSS_MAX_BYTES ) {
		return '';
	}

	$css = (string) file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
	if ( '' === trim( $css ) || false !== stripos( $css, '</style' ) || false !== stripos( $css, '@import' ) ) {
		return '';
	}

	$css = preg_replace( '~/\*#\s*sourceMappingURL=[^*]*\*/~', '', $css );
	$css = tk_strip_css_comments( $css );
	$css = preg_replace_callback(
		'~url\(\s*([\'"]?)([^\'")]+)\1\s*\)~i',
		static function ( $m ) use ( $href ) {
			$u = trim( $m[2] );
			if ( preg_match( '~^(?:[a-z][a-z0-9+.-]*:|/|#)~i', $u ) ) {
				return $m[0];
			}

			return 'url(' . $m[1] . tk_resolve_url( $u, $href ) . $m[1] . ')';
		},
		$css
	);

	return trim( $css );
}

/**
 * Print local stylesheets inline instead of as render-blocking <link>s (tk_perf_enabled()), and put every
 * stylesheet except TK_UNLAYERED_STYLES into the layer `tk` (tk_layers_enabled()): inline CSS inside
 * `@layer tk{…}`, a stylesheet that stays a file as `@import url(…) layer(tk)`.
 *
 * @param string $tag    The <link> tag.
 * @param string $handle Style handle.
 * @param string $href   Stylesheet URL.
 * @param string $media  Media attribute.
 * @return string
 */
function tk_inline_style_tag( $tag, $handle, $href, $media ) {
	$perf   = tk_perf_enabled();
	$layers = tk_layers_enabled();
	if ( ( ! $perf && ! $layers ) || ( false === strpos( $tag, "rel='stylesheet'" ) && false === strpos( $tag, 'rel="stylesheet"' ) ) ) {
		return $tag;
	}

	$layer = $layers && ! in_array( $handle, TK_UNLAYERED_STYLES, true );
	$media = ( $media && 'all' !== $media ) ? preg_replace( '/[^a-z0-9 ():,.\-]/i', '', $media ) : '';
	$css   = $perf ? tk_inlinable_css( $href ) : '';

	if ( '' !== $css ) {
		$css = $media ? '@media ' . $media . '{' . $css . '}' : $css;
		return sprintf( "<style id='%s-css'>%s</style>\n", esc_attr( $handle ), $layer ? '@layer tk{' . $css . '}' : $css );
	}

	if ( ! $layer ) {
		return $tag;
	}

	$url = str_replace( array( '"', '\\', "\n", "\r" ), array( '%22', '%5C', '', '' ), esc_url_raw( $href ) );

	return sprintf( "<style id='%s-css'>@import url(\"%s\") layer(tk)%s;</style>\n", esc_attr( $handle ), $url, $media ? ' ' . $media : '' );
}
add_filter( 'style_loader_tag', 'tk_inline_style_tag', 10, 4 );

/**
 * Print the small theme scripts inline instead of as separate requests: nav, reveal, tabs, map, video at the end of
 * <body> (the DOM is parsed by then, like defer), vt.js in <head> (synchronous; render-blocking as a file).
 *
 * @param string $tag    The <script> tag.
 * @param string $handle Script handle.
 * @param string $src    Script URL.
 * @return string
 */
function tk_inline_script_tag( $tag, $handle, $src ) {
	if ( 0 !== strpos( $handle, 'tk-' ) || ! tk_perf_enabled() ) {
		return $tag;
	}

	$path = tk_local_asset_path( $src );
	$js   = $path ? (string) file_get_contents( $path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
	if ( '' === trim( $js ) || false !== stripos( $js, '</script' ) ) {
		return $tag;
	}

	return sprintf( "<script id='%s-js'>%s</script>\n", esc_attr( $handle ), trim( tk_strip_js_line_comments( $js ) ) );
}
add_filter( 'script_loader_tag', 'tk_inline_script_tag', 10, 3 );
