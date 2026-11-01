<?php
/**
 * Plugin Name: TK Contact Form
 * Description: The Kontakt page's contact form (added 2026-11-01 on request; port of martinadamus ma-form.php, simplified). admin-post.php?action=tk_contact validates, mails the message to the instructor (Reply-To = the sender) and a short confirmation to the sender, and stores nothing.
 * Version: 1.0.0
 *
 * Spam protection (as martinadamus): a honeypot field plus an HMAC-signed render timestamp that must be at least
 * TK_FORM_MIN_SECONDS old (faster = a bot) and at most TK_FORM_MAX_AGE old (the page cache serves the same HTML
 * for hours, so assets/js/form.js fetches a fresh token on the first interaction). A stale token (no JavaScript,
 * or a replayed cached page) gets the form back, pre-filled, with a fresh token instead of a rejection. No nonce:
 * an expired nonce would silently drop real enquiries, and CSRF means nothing for an anonymous contact form.
 * A per-IP throttle caps how many messages are mailed; the confirmation mail echoes no free text (no relay).
 *
 * The form markup is rendered here (one source for the page and the fallback page): the Kontakt builder emits the
 * marker <!--tk-contact-form-->, which the_content replaces (the page cache stores the result).
 *
 * @package Tkadlcik
 */

defined( 'ABSPATH' ) || exit;

const TK_FORM_MIN_SECONDS = 3;
const TK_FORM_MAX_AGE     = 7200;
const TK_FORM_HONEYPOT    = 'tk_hp';
const TK_FORM_RATE_LIMIT  = 5;
const TK_FORM_RATE_WINDOW = 600;
const TK_FORM_TO          = 'tkadlcik@centrum.cz';
const TK_FORM_LIMITS      = array(
	'name'    => 80,
	'email'   => 120,
	'phone'   => 20,
	'topic'   => 60,
	'message' => 2000,
);
/** The topics offered (fixed list; anything else is stored as empty). Course names as the site prints them. */
const TK_FORM_TOPICS = array( 'Osm kusů brokátu', '13 Words of Tchaj-ťi', 'Tchaj-ťi stylu Yang', 'Cvičení ve Zlíně', 'Semináře a akce', 'Nový kurz pro začátečníky', 'Jiný dotaz' );

/**
 * Signed render timestamp "<unix>.<hmac20>".
 *
 * @param int|null $time Timestamp (default now).
 * @return string
 */
function tk_form_token( $time = null ) {
	$time = null === $time ? time() : (int) $time;
	return $time . '.' . substr( hash_hmac( 'sha256', 'tk_form|' . $time, wp_salt( 'nonce' ) ), 0, 20 );
}

/**
 * Seconds since the token was signed, or -1 when malformed or forged.
 *
 * @param string $token Submitted token.
 * @return int
 */
function tk_form_token_age( $token ) {
	if ( ! preg_match( '/^(\d{9,11})\.([a-f0-9]{20})$/', (string) $token, $m ) ) {
		return -1;
	}
	if ( ! hash_equals( substr( tk_form_token( (int) $m[1] ), -20 ), $m[2] ) ) {
		return -1;
	}
	return time() - (int) $m[1];
}

/**
 * The field rules (wp-content/mu-plugins/tk-form/rules.json), shared with the browser through the form's data-rules.
 *
 * @return array<string,array<string,mixed>>
 */
function tk_form_rules() {
	static $rules = null;
	if ( null === $rules ) {
		$rules = json_decode( (string) file_get_contents( __DIR__ . '/tk-form/rules.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
		unset( $rules['_'] );
	}
	return $rules;
}

/**
 * Validation errors per field (Czech), from tk_form_rules(). The same engine runs in form.js (tkFormCheck);
 * build/test/form-cases.json is checked against both.
 *
 * @param array<string,string> $d Trimmed data.
 * @return array<string,string>
 */
function tk_form_validate( $d ) {
	$e   = array();
	$len = static fn( $s ) => function_exists( 'mb_strlen' ) ? mb_strlen( $s, 'UTF-8' ) : strlen( $s );
	$re  = static fn( $p, $v ) => 1 === preg_match( '~' . str_replace( '~', '\~', $p ) . '~u', $v );
	foreach ( tk_form_rules() as $field => $r ) {
		$v = (string) ( $d[ $field ] ?? '' );
		if ( '' === $v ) {
			if ( isset( $r['required'] ) ) {
				$e[ $field ] = $r['required'];
			}
			continue;
		}
		$n = $len( $v );
		if ( ( isset( $r['min'] ) && $n < $r['min'] ) || ( isset( $r['max'] ) && $n > $r['max'] ) ) {
			$e[ $field ] = $r['lenMsg'];
		} elseif ( isset( $r['pattern'] ) && ! $re( $r['pattern'], $v ) ) {
			$e[ $field ] = $r['patternMsg'];
		} elseif ( isset( $r['forbid'] ) && $re( $r['forbid'], $v ) ) {
			$e[ $field ] = $r['forbidMsg'];
		} elseif ( isset( $r['digits'] ) && ( strlen( (string) preg_replace( '/\D/', '', $v ) ) < $r['digits'][0] || strlen( (string) preg_replace( '/\D/', '', $v ) ) > $r['digits'][1] ) ) {
			$e[ $field ] = $r['digitsMsg'];
		} elseif ( isset( $r['maxLinks'] ) && preg_match_all( '~https?://|www\.~iu', $v ) > $r['maxLinks'] ) {
			$e[ $field ] = $r['linksMsg'];
		}
	}
	// WordPress's own check on top (the pattern is the browser's twin; is_email() is stricter on the domain).
	if ( ! isset( $e['email'] ) && '' !== ( $d['email'] ?? '' ) && ! is_email( $d['email'] ) ) {
		$e['email'] = tk_form_rules()['email']['patternMsg'];
	}
	return $e;
}

/**
 * The form markup (Kontakt page and the fallback page). $d = values to pre-fill, $e = field errors.
 *
 * @param array<string,string> $d Values.
 * @param array<string,string> $e Errors.
 * @return string
 */
function tk_form_markup( $d = array(), $e = array() ) {
	$v     = static fn( $k ) => esc_attr( $d[ $k ] ?? '' );
	$err   = static fn( $k ) => isset( $e[ $k ] ) ? '<span class="field-err" id="err-' . $k . '">' . esc_html( $e[ $k ] ) . '</span>' : '';
	$inv   = static fn( $k ) => isset( $e[ $k ] ) ? ' aria-invalid="true" aria-describedby="err-' . $k . '"' : '';
	$topic = $d['topic'] ?? '';
	// Sign-up links ("Přihlásit se") open /kontakt/?tema=<n>#formular: preselect that topic (a query string bypasses
	// the page cache, so this render is never stored).
	if ( '' === $topic && isset( $_GET['tema'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only preset.
		$n     = absint( wp_unslash( $_GET['tema'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$topic = TK_FORM_TOPICS[ $n - 1 ] ?? '';
	}
	$opts  = '<option value="">Vyberte (nepovinné)</option>';
	foreach ( TK_FORM_TOPICS as $t ) {
		$opts .= '<option' . ( $t === $topic ? ' selected' : '' ) . '>' . esc_html( $t ) . '</option>';
	}
	return '<form class="tk-form" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" data-tk-form novalidate data-rules="' . esc_attr( (string) wp_json_encode( tk_form_rules(), JSON_UNESCAPED_UNICODE ) ) . '">'
		. '<input type="hidden" name="action" value="tk_contact">'
		. '<input type="hidden" name="tk_t" value="' . esc_attr( tk_form_token() ) . '">'
		. '<div class="hp" aria-hidden="true"><label>Nevyplňujte <input type="text" name="' . TK_FORM_HONEYPOT . '" tabindex="-1" autocomplete="off"></label></div>'
		. '<div class="f-row"><label for="f-name">Jméno</label><input id="f-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" value="' . $v( 'name' ) . '"' . $inv( 'name' ) . '>' . $err( 'name' ) . '</div>'
		. '<div class="f-row"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" autocomplete="email" required maxlength="120" value="' . $v( 'email' ) . '"' . $inv( 'email' ) . '>' . $err( 'email' ) . '</div>'
		. '<div class="f-row"><label for="f-phone">Telefon <span class="opt">(nepovinné)</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" inputmode="tel" value="' . $v( 'phone' ) . '"' . $inv( 'phone' ) . '>' . $err( 'phone' ) . '</div>'
		. '<div class="f-row"><label for="f-topic">O co máte zájem</label><select id="f-topic" name="topic">' . $opts . '</select></div>'
		. '<div class="f-row f-wide"><label for="f-message">Zpráva</label><textarea id="f-message" name="message" rows="6" required minlength="10" maxlength="2000"' . $inv( 'message' ) . '>' . esc_textarea( $d['message'] ?? '' ) . '</textarea>' . $err( 'message' ) . '<span class="f-count" data-tk-count aria-live="polite"></span></div>'
		. '<p class="form-note f-wide">Zprávu vám pošlu e-mailem zpět; nic z ní web neukládá. Podrobnosti v <a class="lnk" href="' . esc_url( home_url( '/zasady-ochrany-osobnich-udaju/' ) ) . '">zásadách ochrany osobních údajů</a>.</p>'
		. '<div class="f-wide"><button type="submit" class="btn btn-primary">Odeslat zprávu</button></div>'
		. '</form>';
}

/** Replace the builder's marker with the form. */
add_filter(
	'the_content',
	static fn( $html ) => false === strpos( (string) $html, '<!--tk-contact-form-->' ) ? $html : str_replace( '<!--tk-contact-form-->', tk_form_markup(), $html ),
	PHP_INT_MAX
);
add_filter(
	'elementor/widget/render_content',
	static fn( $html ) => false === strpos( (string) $html, '<!--tk-contact-form-->' ) ? $html : str_replace( '<!--tk-contact-form-->', tk_form_markup(), $html ),
	PHP_INT_MAX
);

/**
 * A themed result page (sent, or the form back with what to fix). Never cached (no-store).
 *
 * @param int    $status HTTP status.
 * @param string $title  The page's h1.
 * @param string $body   Inner HTML.
 */
function tk_form_page( $status, $title, $body ) {
	status_header( $status );
	nocache_headers();
	add_filter( 'pre_get_document_title', static fn() => $title . ' | Radost v pohybu' );
	add_filter( 'wp_robots', 'wp_robots_no_robots' );
	get_header();
	echo '<section class="tk-404 tk-form-result" aria-labelledby="tk-form-h"><div class="tk-404-stack">'
		. '<h1 id="tk-form-h" class="h1">' . esc_html( $title ) . '</h1>' . $body . '</div></section>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts.
	get_footer();
	exit;
}

/** Client IP for the throttle (REMOTE_ADDR; behind a proxy filter `tk_form_client_ip`). */
function tk_form_client_ip() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	return (string) apply_filters( 'tk_form_client_ip', $ip );
}

/** True while the IP has slots left in the window (an accepted submission uses one). */
function tk_form_rate_allow() {
	$key   = 'tk_frl_' . substr( wp_hash( 'tk_form_rate|' . tk_form_client_ip(), 'nonce' ), 0, 20 );
	$count = (int) get_transient( $key );
	if ( $count >= TK_FORM_RATE_LIMIT ) {
		return false;
	}
	set_transient( $key, $count + 1, TK_FORM_RATE_WINDOW );
	return true;
}

/** admin-post.php?action=tk_contact */
function tk_form_handle() {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- anonymous contact form, see the file header.
	$raw = static fn( $k ) => isset( $_POST[ $k ] ) ? trim( sanitize_textarea_field( wp_unslash( $_POST[ $k ] ) ) ) : '';
	$d   = array(
		'name'    => $raw( 'name' ),
		'email'   => $raw( 'email' ),
		'phone'   => $raw( 'phone' ),
		'topic'   => in_array( $raw( 'topic' ), TK_FORM_TOPICS, true ) ? $raw( 'topic' ) : '',
		'message' => $raw( 'message' ),
	);
	$back = '<p><a class="btn btn-quiet" href="' . esc_url( home_url( '/kontakt/' ) ) . '">Kontakt</a></p>';

	// Honeypot: answer like a success, mail nothing.
	if ( '' !== $raw( TK_FORM_HONEYPOT ) ) {
		tk_form_page( 200, 'Děkuji, zpráva odešla', '<p class="lead">Ozvu se vám co nejdříve.</p>' . $back );
	}
	$age = tk_form_token_age( $raw( 'tk_t' ) );
	if ( $age < TK_FORM_MIN_SECONDS || $age > TK_FORM_MAX_AGE ) {
		tk_form_page( 409, 'Potvrďte prosím odeslání', '<p class="lead">Formulář byl otevřený příliš dlouho. Zkontrolujte prosím zprávu a odešlete ji znovu.</p>' . tk_form_markup( $d ) );
	}
	$e = tk_form_validate( $d );
	if ( $e ) {
		tk_form_page( 422, 'Zprávu se nepodařilo odeslat', '<p class="lead">Opravte prosím zvýrazněná pole.</p>' . tk_form_markup( $d, $e ) );
	}
	if ( ! tk_form_rate_allow() ) {
		tk_form_page( 429, 'Zprávu se nepodařilo odeslat', '<p class="lead">Z tohoto připojení odešlo v krátké době příliš mnoho zpráv. Zkuste to prosím za chvíli, nebo napište přímo na <a class="lnk" href="mailto:' . TK_FORM_TO . '">' . TK_FORM_TO . '</a>.</p>' );
	}
	// phpcs:enable

	$body = "Jméno: {$d['name']}\nE-mail: {$d['email']}\n" . ( '' !== $d['phone'] ? "Telefon: {$d['phone']}\n" : '' ) . ( '' !== $d['topic'] ? "Zájem: {$d['topic']}\n" : '' ) . "\n{$d['message']}\n\n-- \nOdesláno z kontaktního formuláře webu Radost v pohybu.";
	$sent = wp_mail(
		TK_FORM_TO,
		'Zpráva z webu' . ( '' !== $d['topic'] ? ' – ' . $d['topic'] : '' ),
		$body,
		array( 'Reply-To: ' . $d['name'] . ' <' . $d['email'] . '>' )
	);
	if ( ! $sent ) {
		tk_form_page( 500, 'Zprávu se nepodařilo odeslat', '<p class="lead">Omlouvám se, zprávu se nepodařilo odeslat. Napište prosím přímo na <a class="lnk" href="mailto:' . TK_FORM_TO . '">' . TK_FORM_TO . '</a>.</p>' . tk_form_markup( $d ) );
	}
	// Confirmation to the sender: no free text from the form (it cannot be used to send arbitrary mail).
	wp_mail(
		$d['email'],
		'Vaše zpráva pro Radost v pohybu',
		"Dobrý den,\n\nděkuji za zprávu z webu Radost v pohybu. Ozvu se vám co nejdříve.\n" . ( '' !== $d['topic'] ? "\nTéma: {$d['topic']}\n" : '' ) . "\nMgr. Daniel Tkadlčík\nČchi-kung a tchaj-ťi Radost v pohybu"
	);
	tk_form_page( 200, 'Děkuji, zpráva odešla', '<p class="lead">Ozvu se vám co nejdříve na e-mail ' . esc_html( $d['email'] ) . '.</p>' . $back );
}
add_action( 'admin_post_nopriv_tk_contact', 'tk_form_handle' );
add_action( 'admin_post_tk_contact', 'tk_form_handle' );

/** admin-ajax.php?action=tk_form_token (POST): a fresh token for a form served from the page cache. */
function tk_form_token_endpoint() {
	nocache_headers();
	wp_send_json( array( 't' => tk_form_token() ) );
}
add_action( 'wp_ajax_nopriv_tk_form_token', 'tk_form_token_endpoint' );
add_action( 'wp_ajax_tk_form_token', 'tk_form_token_endpoint' );
