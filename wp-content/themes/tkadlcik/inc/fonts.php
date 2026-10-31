<?php
/**
 * Self-hosted fonts: Geist 400/500/600 (text, headings, labels) and Geist Mono 400 (.mono, .eyebrow, .idx),
 * each in the latin and latin-ext subsets (Czech letters such as č ř ť ě ů live in latin-ext).
 * Files: @fontsource/geist 5.3.0 and @fontsource/geist-mono 5.3.0, SIL OFL 1.1 (assets/fonts/*-OFL.txt).
 * No Google Fonts request anywhere.
 *
 * The @font-face rules are printed from PHP (not site.css) so their URLs carry the same ?ver=<mtime>
 * as the <link rel="preload"> tags; a preload only gets used when its URL matches exactly.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

const TK_UR_LATIN     = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const TK_UR_LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/**
 * Font faces: [family, weight, file stem, subset].
 *
 * @return array<int, array{0: string, 1: int, 2: string, 3: string}>
 */
function tk_font_faces() {
	$faces = array();
	foreach ( array( 400, 500, 600 ) as $w ) {
		$faces[] = array( 'Geist', $w, 'geist-latin-ext-' . $w . '-normal', 'latin-ext' );
		$faces[] = array( 'Geist', $w, 'geist-latin-' . $w . '-normal', 'latin' );
	}
	$faces[] = array( 'Geist Mono', 400, 'geist-mono-latin-ext-400-normal', 'latin-ext' );
	$faces[] = array( 'Geist Mono', 400, 'geist-mono-latin-400-normal', 'latin' );
	return $faces;
}

/**
 * Versioned URL of a font file.
 *
 * @param string $stem File name without .woff2.
 * @return string
 */
function tk_font_url( $stem ) {
	$rel = 'assets/fonts/' . $stem . '.woff2';
	return add_query_arg( 'ver', tk_asset_ver( $rel ), TK_THEME_URI . '/' . $rel );
}

/**
 * Every face that renders above the fold on every page, so none of them swaps in late (measured at 390 and
 * 1440 px on all 7 pages): the text face (Geist 400) and the heading face (Geist 500, the H1 is the LCP
 * element), both subsets — practically every Czech line needs latin-ext too; Geist 600 latin (the header
 * wordmark "Radost v pohybu", ASCII only, so not its latin-ext file); Geist Mono 400 in both subsets (the
 * eyebrow above every H1, e.g. "Výuka tchaj-ťi a čchi-kungu"). LCP faces first.
 */
const TK_FONT_PRELOADS = array(
	'geist-latin-500-normal',
	'geist-latin-ext-500-normal',
	'geist-latin-400-normal',
	'geist-latin-ext-400-normal',
	'geist-latin-600-normal',
	'geist-mono-latin-400-normal',
	'geist-mono-latin-ext-400-normal',
);

/**
 * Font preloads and the @font-face rules.
 */
function tk_font_preloads() {
	foreach ( TK_FONT_PRELOADS as $stem ) {
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( tk_font_url( $stem ) ) );
	}

	$css = '';
	foreach ( tk_font_faces() as $f ) {
		$css .= sprintf(
			"@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;src:url(%s) format('woff2');unicode-range:%s}",
			$f[0],
			$f[1],
			esc_url_raw( tk_font_url( $f[2] ) ),
			'latin' === $f[3] ? TK_UR_LATIN : TK_UR_LATIN_EXT
		);
	}
	echo "<style id='tk-fonts'>" . $css . "</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from constants and esc_url_raw().
}
add_action( 'wp_head', 'tk_font_preloads', 1 );
