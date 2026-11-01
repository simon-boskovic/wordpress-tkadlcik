<?php
// Rehearsal helper: inserts the Host-derived WP_HOME/WP_SITEURL that Webglobe writes into wp-config.php
// (as found on wp005.nameserver.sk, 2026-11-01), so 02-migrace.sh meets the same wp-config as on the server.
$f = $argv[1];
$d = "define( 'WP_HOME', \"http\" . (isset(\$_SERVER[\"HTTPS\"]) ? \"s\" : \"\") . \"://\" . \$_SERVER[\"HTTP_HOST\"] . \"/\" );\n"
	. "define( 'WP_SITEURL', \"http\" . (isset(\$_SERVER[\"HTTPS\"]) ? \"s\" : \"\") . \"://\" . \$_SERVER[\"HTTP_HOST\"] . \"/\" );\n";
$c = file_get_contents( $f );
$n = 0;
$c = preg_replace( '~/\* That.s all~', $d . '$0', $c, 1, $n );
if ( 1 !== $n ) {
	fwrite( STDERR, "marker not found in $f\n" );
	exit( 1 );
}
file_put_contents( $f, $c );
