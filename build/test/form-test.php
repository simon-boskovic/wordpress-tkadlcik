<?php
/**
 * Server half of the form validation lockstep: build/test/form-cases.json through tk_form_validate() (mu-plugins/
 * tk-form.php, rules from tk-form/rules.json). Browser half: build/test/form-rules.test.mjs.
 *   ./wp.sh eval-file /project/build/test/form-test.php
 */
$cases = json_decode( (string) file_get_contents( '/project/build/test/form-cases.json' ), true );
$fail  = 0;
foreach ( $cases as $c ) {
	$d = array( 'topic' => '' );
	foreach ( $c['data'] as $k => $v ) {
		$d[ $k ] = preg_match( '/^\{\{(\d+)\}\}$/', $v, $m ) ? str_repeat( 'a', (int) $m[1] ) : $v;
	}
	$got = array_keys( tk_form_validate( $d ) );
	sort( $got );
	$want = $c['errors'];
	sort( $want );
	if ( $got !== $want ) {
		++$fail;
		WP_CLI::log( 'FAIL ' . substr( wp_json_encode( $c['data'], JSON_UNESCAPED_UNICODE ), 0, 120 ) . ' -> got [' . implode( ',', $got ) . '] want [' . implode( ',', $want ) . ']' );
	}
}
$fail ? WP_CLI::error( "$fail of " . count( $cases ) . ' form cases failed' ) : WP_CLI::success( count( $cases ) . ' form cases pass (server)' );
