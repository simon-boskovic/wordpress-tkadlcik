<?php
/**
 * Closes <main> and prints the shared footer (Main.dc.html footer.foot).
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

$tk_data = tk_site_data();
$tk_c    = $tk_data['contact'];
$tk_f    = $tk_data['footer'];
?>
</main>

<footer class="foot">
<div class="wrap">
<div class="foot-grid">
<div class="stack tk-ft-about"><strong class="tk-ft-name"><?php echo esc_html( $tk_data['brand']['name'] ); ?></strong><span class="small muted"><?php echo esc_html( $tk_f['about'] ); ?></span></div>
<div class="stack small tk-ft-col"><span class="eyebrow">Místo</span>
<?php foreach ( $tk_data['places'] as $tk_p ) : ?>
<a href="<?php echo esc_url( home_url( '/kurzy-a-lekce/#' . ( $tk_p['key'] ?? '' ) ) ); ?>"><?php echo esc_html( $tk_p['line'] ?? '' ); ?></a>
<?php endforeach; ?>
</div>
<div class="stack small tk-ft-col"><span class="eyebrow">Kontakt</span><span><?php echo esc_html( $tk_c['name'] ); ?></span><a href="<?php echo esc_url( $tk_c['phoneHref'] ); ?>"><?php echo esc_html( $tk_c['phone'] ); ?></a><a href="<?php echo esc_url( 'mailto:' . $tk_c['email'] ); ?>"><?php echo esc_html( $tk_c['email'] ); ?></a></div>
<nav class="stack small tk-ft-col" aria-label="Patička">
<?php foreach ( $tk_f['links'] as $tk_l ) : ?>
<a href="<?php echo esc_url( home_url( $tk_l['href'] ) ); ?>"><?php echo esc_html( $tk_l['label'] ); ?></a>
<?php endforeach; ?>
</nav>
</div>
<div class="wordmark" aria-hidden="true" data-text="<?php echo esc_attr( $tk_data['brand']['name'] ); ?>"></div>
<div class="foot-bottom">
<?php
// Operator identification (§ 435 OZ) under the copyright: data/site.json `business` {name, ico, address, register}
// (build/content.mjs). Each separator is glued to the segment before it, so a wrapped line never starts with "·".
$tk_b    = $tk_data['business'];
$tk_bseg = array_values(
	array_filter(
		array(
			(string) ( $tk_b['name'] ?? '' ),
			'' !== (string) ( $tk_b['ico'] ?? '' ) ? 'IČO ' . $tk_b['ico'] : '',
			(string) ( $tk_b['address'] ?? '' ),
			(string) ( $tk_b['register'] ?? '' ),
		),
		'strlen'
	)
);
?>
<?php if ( $tk_bseg ) : ?>
<span class="tk-ft-id"><span><?php echo esc_html( $tk_f['copyright'] ); ?></span><span class="tk-ft-op"><?php echo implode( ' ', array_map( static fn( $seg, $i ) => esc_html( $seg ) . ( $i < count( $tk_bseg ) - 1 ? '&nbsp;·' : '' ), $tk_bseg, array_keys( $tk_bseg ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each segment escaped above. ?></span></span>
<?php else : ?>
<span><?php echo esc_html( $tk_f['copyright'] ); ?></span>
<?php endif; ?>
<?php if ( function_exists( 'tk_consent_active' ) && tk_consent_active() ) : ?>
<?php // Cookie consent: reopens the Complianz banner (assets/js/consent.js); without JS it opens the privacy page's cookie section. ?>
<a class="tk-ft-consent" href="<?php echo esc_url( home_url( TK_CONSENT_FALLBACK_PATH ) ); ?>" data-tk-consent-open>Nastavení cookies</a>
<?php endif; ?>
</div>
</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
