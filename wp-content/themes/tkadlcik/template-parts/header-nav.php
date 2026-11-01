<?php
/**
 * Site header (redesign 2026-11-01): a plain bar — the yin-yang mark and name, the four `bar` links (desktop),
 * the Menu button and its panel with every nav label and the contact details (the martinadamus / truhlářství
 * menu: full screen with staggered links on phones and tablets, a dropdown on desktop; assets/js/nav.js) and the one action, Kontakt.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

$tk_data = tk_site_data();
$tk_c    = $tk_data['contact'];
$tk_path = tk_current_path();
$tk_cur  = static fn( $href ) => tk_is_current( $href, $tk_path ) ? ' aria-current="page"' : '';
$tk_cta  = null;
foreach ( $tk_data['nav'] as $tk_l ) {
	if ( ! empty( $tk_l['cta'] ) ) {
		$tk_cta = $tk_l;
	}
}
?>
<header class="bar">
<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
<svg width="32" height="32" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M14 1 A13 13 0 0 1 14 27 A6.5 6.5 0 0 1 14 14 A6.5 6.5 0 0 0 14 1Z" fill="currentColor"></path><circle cx="14" cy="7.5" r="2" fill="currentColor"></circle><circle cx="14" cy="20.5" r="2" fill="#161C1A"></circle></svg>
<span class="brand-name"><?php echo esc_html( $tk_data['brand']['name'] ); ?><small><?php echo esc_html( $tk_data['brand']['tagline'] ); ?></small></span>
</a>
<nav class="nav" aria-label="Hlavní menu">
<?php foreach ( $tk_data['nav'] as $tk_l ) : ?>
<?php if ( ! empty( $tk_l['bar'] ) ) : ?>
<a class="nav-link" href="<?php echo esc_url( home_url( $tk_l['href'] ) ); ?>"<?php echo $tk_cur( $tk_l['href'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed attribute. ?>><?php echo esc_html( $tk_l['label'] ); ?></a>
<?php endif; ?>
<?php endforeach; ?>
<button type="button" class="menu-btn" aria-expanded="false" aria-controls="menu-panel" aria-label="Otevřít menu"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span><span class="menu-word">Menu</span></button>
<?php if ( $tk_cta ) : ?>
<a class="btn btn-primary" href="<?php echo esc_url( home_url( $tk_cta['href'] ) ); ?>"<?php echo $tk_cur( $tk_cta['href'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed attribute. ?>><?php echo esc_html( $tk_cta['label'] ); ?></a>
<?php endif; ?>
</nav>
<div id="menu-panel" class="menu-panel" aria-hidden="true" inert>
<nav class="menu-links" aria-label="Všechny stránky">
<?php foreach ( $tk_data['nav'] as $tk_i => $tk_l ) : ?>
<a href="<?php echo esc_url( home_url( $tk_l['href'] ) ); ?>" style="--i: <?php echo (int) $tk_i; ?>"<?php echo empty( $tk_l['cta'] ) ? '' : ' class="menu-cta"'; ?><?php echo $tk_cur( $tk_l['href'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed attribute. ?>><?php echo esc_html( $tk_l['label'] ); ?></a>
<?php endforeach; ?>
</nav>
<div class="menu-info" style="--i: <?php echo count( $tk_data['nav'] ); ?>">
<a href="<?php echo esc_url( $tk_c['phoneHref'] ); ?>"><?php echo esc_html( $tk_c['phone'] ); ?></a>
<a href="<?php echo esc_url( 'mailto:' . $tk_c['email'] ); ?>"><?php echo esc_html( $tk_c['email'] ); ?></a>
<?php foreach ( $tk_data['places'] as $tk_p ) : ?>
<span><?php echo esc_html( $tk_p['line'] ?? '' ); ?></span>
<?php endforeach; ?>
</div>
</div>
</header>
