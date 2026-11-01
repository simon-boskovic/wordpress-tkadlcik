<?php
/**
 * Closes <main> and prints the footer (redesign 2026-11-01): a quiet close — every page link, the operator's
 * identification (§ 435 OZ, data/site.json `business`), "Nastavení cookies" and the credits of the found pictures
 * (data/site.json `credits`, build/image-credits.json).
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

$tk_data = tk_site_data();
$tk_f    = $tk_data['footer'];
?>
</main>

<footer class="foot">
<nav class="foot-links" aria-label="Patička">
<?php foreach ( $tk_f['links'] as $tk_l ) : ?>
<a href="<?php echo esc_url( home_url( $tk_l['href'] ) ); ?>"><?php echo esc_html( $tk_l['label'] ); ?></a>
<?php endforeach; ?>
</nav>
<div class="foot-line">
<?php
// Operator identification under the copyright. Each separator is glued to the segment before it.
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
<p class="tk-ft-id"><span><?php echo esc_html( $tk_f['copyright'] ); ?></span><?php if ( $tk_bseg ) : ?><br><span class="tk-ft-op"><?php echo implode( ' ', array_map( static fn( $seg, $i ) => esc_html( $seg ) . ( $i < count( $tk_bseg ) - 1 ? '&nbsp;·' : '' ), $tk_bseg, array_keys( $tk_bseg ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each segment escaped above. ?></span><?php endif; ?></p>
<?php if ( function_exists( 'tk_consent_active' ) && tk_consent_active() ) : ?>
<?php // Cookie consent: reopens the Complianz banner (assets/js/consent.js); without JS it opens the privacy page's cookie section. ?>
<a class="tk-ft-consent" href="<?php echo esc_url( home_url( TK_CONSENT_FALLBACK_PATH ) ); ?>" data-tk-consent-open>Nastavení cookies</a>
<?php endif; ?>
</div>
<?php if ( ! empty( $tk_data['credits'] ) ) : ?>
<p class="foot-credits">Obrázky:
<?php
echo implode(
	'; ',
	array_map(
		static fn( $c ) => sprintf( '<a href="%s" rel="nofollow noopener" target="_blank">%s</a>, %s%s, %s', esc_url( $c['page'] ), esc_html( $c['title'] ), esc_html( $c['creator'] ), '' !== (string) ( $c['date'] ?? '' ) ? ' (' . esc_html( $c['date'] ) . ')' : '', esc_html( $c['license'] ) ),
		$tk_data['credits']
	)
); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the callback.
?>
</p>
<?php endif; ?>
</footer>
<?php wp_footer(); ?>
</body>
</html>
