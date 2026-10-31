<?php
/**
 * Shared header (Main.dc.html .top): pill bar with brand + desktop nav, the mobile actions (Kontakt, call,
 * menu button) and the full-screen mobile menu. site.css switches them at 820 px; assets/js/nav.js drives
 * the menu (data-open on .top, aria-expanded, Escape). aria-current="page" is computed here.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

$tk_data = tk_site_data();
$tk_c    = $tk_data['contact'];
$tk_path = tk_current_path();
$tk_cur  = static fn( $href ) => tk_is_current( $href, $tk_path ) ? ' aria-current="page"' : '';
?>
<div class="top wrap" data-open="false">
<header class="bar">
<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
<svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M14 1 A13 13 0 0 1 14 27 A6.5 6.5 0 0 1 14 14 A6.5 6.5 0 0 0 14 1Z" fill="currentColor"></path><circle cx="14" cy="7.5" r="2" fill="currentColor"></circle><circle class="yin" cx="14" cy="20.5" r="2" fill="#0E0F0E"></circle></svg>
<span><?php echo esc_html( $tk_data['brand']['name'] ); ?><small><?php echo esc_html( $tk_data['brand']['tagline'] ); ?></small></span>
</a>
<nav class="nav" aria-label="Hlavní menu">
<?php
foreach ( $tk_data['nav'] as $tk_l ) :
	$tk_class = '';
	if ( ! empty( $tk_l['cta'] ) ) {
		// The Kontakt button turns jade on the Kontakt page itself (Kontakt.dc.html).
		$tk_class = ' class="btn ' . ( tk_is_current( $tk_l['href'], $tk_path ) ? 'btn-jade' : 'btn-dark' ) . ' btn-sm"';
	}
	// The current item's highlight is its own element, so the view transition can slide it to the next page's item
	// (assets/js/vt.js "nav-current"; site.css draws it instead of the link background).
	$tk_pill = '' === $tk_class && tk_is_current( $tk_l['href'], $tk_path ) ? '<span class="tk-nav-pill" aria-hidden="true"></span>' : '';
	?>
<a<?php echo $tk_class; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed string. ?> href="<?php echo esc_url( home_url( $tk_l['href'] ) ); ?>"<?php echo $tk_cur( $tk_l['href'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed attribute. ?>><?php echo $tk_pill . esc_html( $tk_l['label'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed markup + escaped label. ?></a>
<?php endforeach; ?>
</nav>
<div class="m-actions"><a class="btn btn-jade btn-sm" href="<?php echo esc_url( home_url( '/kontakt/' ) ); ?>">Kontakt</a><a class="icon-btn" href="<?php echo esc_url( $tk_c['phoneHref'] ); ?>" aria-label="<?php echo esc_attr( $tk_c['phone'] ); ?>"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></a><button class="menu-btn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Menu"><span></span><span></span></button></div>
</header>
<div id="mnav" class="mnav">
<nav class="mnav-links" aria-label="Mobilní menu">
<?php foreach ( $tk_data['nav'] as $tk_l ) : ?>
<a href="<?php echo esc_url( home_url( $tk_l['href'] ) ); ?>"<?php echo $tk_cur( $tk_l['href'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed attribute. ?>><?php echo esc_html( $tk_l['label'] ); ?></a>
<?php endforeach; ?>
</nav>
<div class="mnav-info">
<a href="<?php echo esc_url( $tk_c['phoneHref'] ); ?>"><?php echo esc_html( $tk_c['phone'] ); ?></a>
<a href="<?php echo esc_url( 'mailto:' . $tk_c['email'] ); ?>"><?php echo esc_html( $tk_c['email'] ); ?></a>
<?php foreach ( $tk_data['places'] as $tk_p ) : ?>
<span><?php echo esc_html( $tk_p['line'] ?? '' ); ?></span>
<?php endforeach; ?>
</div>
</div>
</div>
