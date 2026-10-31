<?php
/**
 * 404 (theme-styled, Czech, one <h1>). WordPress answers HTTP 404; the page cache never stores it.
 * Styles: site.css (shared classes) + chrome.css (.tk-404*). No script of its own.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

get_header();

$tk_c = tk_site_data()['contact'];
?>
<section class="wrap tk-404" aria-labelledby="tk-404-title">
<div class="stack tk-404-stack">
<span class="eyebrow rise">Chyba 404</span>
<h1 id="tk-404-title" class="h1 rise d1">Tuto stránku <span class="serif">jsem nenašel</span></h1>
<p class="lead rise d2">Odkaz je nejspíš starý, nebo se v adrese objevil překlep. Zkuste prosím některou z těchto stránek.</p>
<div class="tk-404-links rise d3">
<a class="btn btn-dark" href="<?php echo esc_url( home_url( '/' ) ); ?>">Domů <?php tk_arrow(); ?></a>
<a class="btn btn-ghost" href="<?php echo esc_url( home_url( '/kurzy-a-lekce/' ) ); ?>">Nabídka kurzů a lekcí</a>
<a class="btn btn-ghost" href="<?php echo esc_url( home_url( '/akce/' ) ); ?>">Akce</a>
<a class="btn btn-ghost" href="<?php echo esc_url( home_url( '/kontakt/' ) ); ?>">Kontakt</a>
</div>
<?php if ( '' !== $tk_c['email'] ) : ?>
<p class="small muted rise d4">Nebo napište na <a class="lnk" href="<?php echo esc_url( 'mailto:' . $tk_c['email'] ); ?>"><?php echo esc_html( $tk_c['email'] ); ?></a>.</p>
<?php endif; ?>
</div>
</section>
<?php
get_footer();
