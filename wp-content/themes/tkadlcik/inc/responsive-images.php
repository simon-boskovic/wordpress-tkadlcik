<?php
/**
 * Responsive images for the hand-authored markup.
 *
 * The page sections are HTML widgets whose <img> tags point at /wp-content/uploads/<file>.webp.
 * WordPress only adds srcset / width / height to images that pass through the_content, which
 * Elementor's HTML widget does not. This filter looks each upload up once, then adds:
 *
 *   srcset  from the attachment's generated sizes (so phones get the 480/640/768px file, not 1600px)
 *   width / height from the attachment metadata when the markup has none (CLS)
 *   decoding="async"
 *
 * Attributes already present in the markup (alt, sizes, loading, fetchpriority) are left alone.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

/**
 * Two more steps between WordPress's 300 and 768px sizes (martinadamus R57): card and portrait photos are 200–460 CSS px
 * wide, i.e. ~350–800 device px, and without them the browser had to take the 683/768px file. Generated at
 * import; `wp tk media-import` adds them to images imported before (wp_update_image_subsizes()).
 */
function tk_image_sizes() {
	add_image_size( 'tk-480', 480, 0 );
	add_image_size( 'tk-640', 640, 0 );
}
add_action( 'after_setup_theme', 'tk_image_sizes' );

/**
 * Map of upload-relative paths (as stored in _wp_attached_file) to attachment IDs.
 *
 * @return array<string,int>
 */
function tk_attached_files_map() {
	static $map = null;

	if ( null !== $map ) {
		return $map;
	}

	$map = wp_cache_get( 'tk_attached_files', 'tk' );

	if ( is_array( $map ) ) {
		return $map;
	}

	global $wpdb;

	$rows = $wpdb->get_results(
		"SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file'"
	);

	$map = array();

	foreach ( (array) $rows as $row ) {
		$map[ (string) $row->meta_value ] = (int) $row->post_id;
	}

	wp_cache_set( 'tk_attached_files', $map, 'ma', DAY_IN_SECONDS );

	return $map;
}

/**
 * Drop the cached map whenever the media library changes.
 */
function tk_flush_attached_files_map() {
	wp_cache_delete( 'tk_attached_files', 'tk' );
}
add_action( 'add_attachment', 'tk_flush_attached_files_map' );
add_action( 'delete_attachment', 'tk_flush_attached_files_map' );
add_action( 'edit_attachment', 'tk_flush_attached_files_map' );

/**
 * Attachment ID for an uploads URL, or 0.
 *
 * @param string $src Image URL as written in the markup.
 * @return int
 */
function tk_attachment_id_for_src( $src ) {
	$uploads = wp_get_upload_dir();
	$base    = trailingslashit( wp_parse_url( $uploads['baseurl'], PHP_URL_PATH ) );
	$path    = (string) wp_parse_url( $src, PHP_URL_PATH );

	if ( 0 !== strpos( $path, $base ) ) {
		return 0;
	}

	$relative = substr( $path, strlen( $base ) );
	$map      = tk_attached_files_map();

	return isset( $map[ $relative ] ) ? $map[ $relative ] : 0;
}

/**
 * The srcset WordPress builds for an uploads URL (the call tk_responsive_img_tag() makes for an <img> with that
 * src), or '' when the file is no attachment or has no sizes. The responsive image preloads (martinadamus R61 A7) use it, so
 * a preload names exactly the candidates its <img> chooses from.
 *
 * @param string $src Image URL as written in the markup (root-relative /wp-content/uploads/…).
 * @return string
 */
function tk_upload_srcset( $src ) {
	$id   = tk_attachment_id_for_src( $src );
	$meta = $id ? wp_get_attachment_metadata( $id ) : false;

	if ( ! is_array( $meta ) || empty( $meta['width'] ) ) {
		return '';
	}

	return (string) wp_calculate_image_srcset( array( (int) $meta['width'], (int) $meta['height'] ), $src, $meta, $id );
}

/**
 * Add srcset, dimensions and async decoding to one <img> tag.
 *
 * @param string $tag The full <img …> tag.
 * @return string
 */
function tk_responsive_img_tag( $tag ) {
	if ( ! preg_match( '/\ssrc="([^"]+)"/', $tag, $m ) ) {
		return $tag;
	}

	$id = tk_attachment_id_for_src( $m[1] );

	if ( ! $id ) {
		return $tag;
	}

	$meta = wp_get_attachment_metadata( $id );

	if ( ! is_array( $meta ) || empty( $meta['width'] ) ) {
		return $tag;
	}

	$add = '';

	if ( false === strpos( $tag, ' srcset=' ) ) {
		$srcset = tk_upload_srcset( $m[1] );

		if ( $srcset ) {
			$add .= ' srcset="' . esc_attr( $srcset ) . '"';

			if ( false === strpos( $tag, ' sizes=' ) ) {
				// "auto" (the image's real layout width) only for lazy images: on an eager one Chrome reads it
				// as 100vw and fetched a 1536px file for a half-width hero (martinadamus R57). Heroes carry their own sizes.
				$add .= ' sizes="' . ( preg_match( '/\sloading="lazy"/', $tag ) ? 'auto, ' : '' ) . '(max-width: 767px) 100vw, 50vw"';
			}
		}
	}

	if ( false === strpos( $tag, ' width=' ) ) {
		$add .= sprintf( ' width="%d" height="%d"', (int) $meta['width'], (int) $meta['height'] );
	}

	if ( false === strpos( $tag, ' decoding=' ) ) {
		$add .= ' decoding="async"';
	}

	return $add ? str_replace( '<img ', '<img' . $add . ' ', $tag ) : $tag;
}

/**
 * Run over every <img> in an HTML widget's output.
 *
 * @param string                 $content Rendered widget content.
 * @param \Elementor\Widget_Base $widget  The widget being rendered.
 * @return string
 */
function tk_responsive_images_in_html_widget( $content, $widget ) {
	if ( 'html' !== $widget->get_name() || false === strpos( $content, '<img' ) ) {
		return $content;
	}

	return preg_replace_callback(
		'/<img\s[^>]*>/i',
		static function ( $match ) {
			return tk_responsive_img_tag( $match[0] );
		},
		$content
	);
}
add_filter( 'elementor/widget/render_content', 'tk_responsive_images_in_html_widget', 11, 2 );
