<?php
/**
 * The contact form's submission counter (mu-plugins/tk-form.php tk_form_count / tk_form_stats / the dashboard
 * widget). Works on a copy: the stored counter is put back afterwards.
 *   ./wp.sh eval-file /project/build/test/form-stats-test.php
 */
$fail = 0;
$ok   = static function ( $cond, $what ) use ( &$fail ) {
	if ( ! $cond ) {
		++$fail;
		WP_CLI::log( 'FAIL ' . $what );
	}
};
$saved = get_option( TK_FORM_STATS_OPTION );
delete_option( TK_FORM_STATS_OPTION );
try {
	$nov = ( new DateTimeImmutable( '2026-11-23 18:00:00', wp_timezone() ) )->getTimestamp();
	$dec = ( new DateTimeImmutable( '2026-12-02 09:30:00', wp_timezone() ) )->getTimestamp();
	tk_form_count( 'sent', 'Semináře a akce', $nov );
	tk_form_count( 'sent', 'Semináře a akce', $nov );
	tk_form_count( 'sent', '', $nov );
	tk_form_count( 'failed', 'Jiný dotaz', $nov );
	tk_form_count( 'spam', '', $nov );
	tk_form_count( 'sent', 'Nový kurz pro začátečníky', $dec );
	tk_form_count( 'sent', 'not a topic', $dec );
	tk_form_count( 'bogus', '', $dec );
	$s = tk_form_stats();
	$ok( 5 === $s['sent'] && 1 === $s['failed'] && 1 === $s['spam'], 'totals sent 5 / failed 1 / spam 1: ' . wp_json_encode( $s ) );
	$ok( array( 'sent' => 3, 'failed' => 1 ) === $s['months']['2026-11'] && array( 'sent' => 2, 'failed' => 0 ) === $s['months']['2026-12'], 'per month' );
	$ok( 2 === $s['topics']['Semináře a akce'] && 2 === $s['topics'][''] && 1 === $s['topics']['Nový kurz pro začátečníky'] && ! isset( $s['topics']['Jiný dotaz'] ), 'per topic: sent only, unknown topic = none' );
	$ok( $dec === $s['last_sent'], 'last sent' );
	$ok( 1 === preg_match( '/^\d{4}-\d{2}-\d{2}$/', $s['since'] ), 'since date' );
	global $wpdb;
	$ok( 'off' === $wpdb->get_var( $wpdb->prepare( "SELECT autoload FROM {$wpdb->options} WHERE option_name = %s", TK_FORM_STATS_OPTION ) ) || 'no' === $wpdb->get_var( $wpdb->prepare( "SELECT autoload FROM {$wpdb->options} WHERE option_name = %s", TK_FORM_STATS_OPTION ) ), 'not autoloaded' );
	$ok( false === strpos( wp_json_encode( $s ), '@' ), 'no e-mail address stored' );
	ob_start();
	tk_form_stats_widget();
	$html = ob_get_clean();
	foreach ( array( 'Odesláno celkem: <strong>5</strong>', 'Nepodařilo se odeslat e-mailem: 1×', '12/2026', '11/2026', 'Semináře a akce: 2', 'bez tématu: 2', 'Zachyceno jako spam: 1', '2. 12. 2026, 09:30' ) as $t ) {
		$ok( false !== strpos( $html, $t ), "widget shows \"$t\"" );
	}
} finally {
	delete_option( TK_FORM_STATS_OPTION );
	if ( false !== $saved ) {
		add_option( TK_FORM_STATS_OPTION, $saved, '', false );
	}
}
$fail ? WP_CLI::error( "$fail form counter checks failed" ) : WP_CLI::success( 'form counter checks pass' );
