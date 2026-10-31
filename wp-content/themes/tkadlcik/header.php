<?php
/**
 * Document head and site header (replaces Hello Elementor's). Opens <main id="obsah">, which footer.php closes.
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html lang="cs">
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0E0F0E">
<meta name="color-scheme" content="dark">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip" href="#obsah">Přeskočit na obsah</a>
<?php get_template_part( 'template-parts/header-nav' ); ?>
<main id="obsah" class="tk-main" tabindex="-1">
