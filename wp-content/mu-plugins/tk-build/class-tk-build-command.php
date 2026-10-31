<?php
/**
 * Build commands for Radost v pohybu (wp tk …), ported from the martinadamus.cz pipeline.
 *
 * Loaded early by WP-CLI itself (wp-cli.yml `require`, so that `wp tk site-setup` can run before
 * WordPress is installed) and otherwise by mu-plugins/tk-build.php (production, where no wp-cli.yml
 * points here). Guarded by a constant, not class_exists(): PHP declares the class below when it
 * compiles the file, before any statement in it runs.
 *
 * @package Tkadlcik
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || defined( 'TK_BUILD_COMMAND_LOADED' ) ) {
	return;
}

define( 'TK_BUILD_COMMAND_LOADED', true );

require_once __DIR__ . '/consent.php';

/**
 * Set up the site and write it from the generated definitions in /project/build.
 */
class TK_Build_Command {

	/** Site title. */
	const SITE_TITLE = 'Radost v pohybu';

	/** Child theme (bind-mounted from wp-content/themes/tkadlcik) and its parent. */
	const THEME        = 'tkadlcik';
	const PARENT_THEME = 'hello-elementor';

	/** Plugins from wordpress.org the site runs on (no form, no redirects). */
	const PLUGINS = array( 'elementor', 'autodescription' );

	/**
	 * Plugins pinned to the version this build was verified against (martinadamus R45): cookie consent
	 * (Complianz) and Site Kit, whose Google tag Complianz blocks until consent to statistics. Site Kit is never
	 * connected to a Google account locally (tk-local.php feeds it a fake tag id); production gets the client's
	 * Google account at go-live (docs/go-live-requirements.md).
	 */
	const PINNED_PLUGINS = array(
		'complianz-gdpr'  => TK_CONSENT_COMPLIANZ_VERSION,
		'google-site-kit' => TK_CONSENT_SITEKIT_VERSION,
	);

	/** Where the admin credentials live (the repo is mounted at /project in the wpcli container). */
	const SECRETS = '/project/wp-secrets.env';

	/** Slug of the static front page when no definition sets front_page: true. */
	const FRONT = 'domu';

	/** Allowed _tk_scripts values (consumed by the theme). */
	const SCRIPTS = array( 'nav', 'tabs', 'reveal', 'map', 'video' );

	/** Post meta that marks the Elementor kit kit-setup created and owns. */
	const TK_KIT_META = '_tk_kit';

	/** Option holding the kit that was active before kit-setup switched to ours (rollback). */
	const TK_KIT_PREVIOUS_OPTION = 'tk_kit_previous';

	/**
	 * Report the state of the install. Read-only.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 * ---
	 *
	 * @subcommand doctor
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function doctor( $args, $assoc_args ) {
		global $wpdb;

		$theme  = wp_get_theme();
		$parent = $theme->parent();
		$ours   = wp_get_theme( self::THEME );
		$rows   = array(
			$this->row( 'Site URL', home_url() ),
			$this->row( 'Environment', wp_get_environment_type() ),
			$this->row( 'WordPress', get_bloginfo( 'version' ) ),
			$this->row( 'PHP', PHP_VERSION . ( function_exists( 'brotli_compress' ) ? ' (ext-brotli)' : '' ) ),
			$this->row( 'Database', $wpdb->db_server_info() ),
			$this->row( 'Title', get_option( 'blogname' ) ),
			$this->row( 'Locale / timezone', get_locale() . ' / ' . wp_timezone_string() ),
			$this->row( 'Permalinks', get_option( 'permalink_structure' ) ? get_option( 'permalink_structure' ) : 'PLAIN - needs /%postname%/ (wp tk site-setup)' ),
			$this->row( 'Active theme', $theme->get_stylesheet() . ' ' . $theme->get( 'Version' ) . ( $parent ? ' (child of ' . $parent->get( 'Name' ) . ')' : '' ) . ( self::THEME === $theme->get_stylesheet() ? '' : ( $ours->exists() ? ' - ' . self::THEME . ' exists but is not active (wp tk site-setup)' : ' - ' . self::THEME . ' not found yet' ) ) ),
			$this->row( 'Comments (new posts)', get_option( 'default_comment_status' ) . ' / pings ' . get_option( 'default_ping_status' ) ),
		);

		foreach ( array_merge( self::PLUGINS, array_keys( self::PINNED_PLUGINS ) ) as $slug ) {
			$state = $this->plugin_state( $slug );
			if ( isset( self::PINNED_PLUGINS[ $slug ] ) && 'active ' . self::PINNED_PLUGINS[ $slug ] !== $state ) {
				$state .= ' - expected active ' . self::PINNED_PLUGINS[ $slug ] . ' (wp tk site-setup)';
			}
			$rows[] = $this->row( 'Plugin ' . $slug, $state );
		}

		$pages = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		$built = count( array_filter( $pages, static fn( $id ) => (bool) get_post_meta( $id, '_elementor_data', true ) ) );

		$rows[] = $this->row( 'Pages', count( $pages ) . ' total, ' . $built . ' built with Elementor' );
		$rows[] = $this->row( 'Front page', 'page' === get_option( 'show_on_front' ) ? '#' . get_option( 'page_on_front' ) . ' ' . get_the_title( (int) get_option( 'page_on_front' ) ) : 'latest posts (wp tk page-upsert)' );

		if ( defined( 'ELEMENTOR_VERSION' ) ) {
			$rows[] = $this->row( 'Elementor kit', $this->kit_doctor_value() );

			// Only "external" keeps Elementor's post/kit CSS as files; "internal" prints it inline in wp_head.
			$print_method = get_option( 'elementor_css_print_method', null );
			$rows[]       = $this->row( 'Elementor CSS print method', null === $print_method ? 'unset (Elementor default: external) - pin it with wp tk kit-setup' : $print_method . ( 'external' === $print_method ? '' : ' - WARNING: needs external (wp tk kit-setup)' ) );

			// e_optimized_markup must be active (no extra .elementor-widget-container per widget).
			$om_stored = get_option( 'elementor_experiment-e_optimized_markup', null );
			$om_active = class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->experiments ) && \Elementor\Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
			$rows[]    = $this->row( 'Elementor optimized markup', sprintf( '%s (option: %s)%s', $om_active ? 'active' : 'INACTIVE', null === $om_stored ? 'unset, version default' : (string) $om_stored, 'active' === $om_stored ? '' : ' - pin it with wp tk kit-setup' ) );
		}

		foreach ( tk_consent_doctor_rows() as $r ) {
			$rows[] = $this->row( $r[0], $r[1] );
		}

		$rows[] = $this->row( 'Page cache', function_exists( 'tk_pc_config' ) ? tk_pc_config()['mode'] . ', ' . count( array_filter( tk_pc_files(), static fn( $f ) => '.html' === substr( $f, -5 ) ) ) . ' pages cached (wp tk cache-status)' : 'mu-plugin missing' );

		if ( function_exists( 'tk_sec_htaccess_block' ) && function_exists( 'tk_pc_htaccess_path' ) ) {
			$ht_path = tk_pc_htaccess_path();
			$ht      = is_readable( $ht_path ) ? (string) file_get_contents( $ht_path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$state   = false === strpos( $ht, '# BEGIN ' . TK_SEC_MARKER ) ? 'block MISSING (wp tk headers-setup)' : ( tk_sec_htaccess_with_block( $ht, tk_sec_htaccess_block() ) === $ht ? 'block current' : 'block OUTDATED (wp tk headers-setup)' );
			$rows[]  = $this->row( 'Security headers', sprintf( '%s, HSTS max-age=%d (HTTPS only)', $state, tk_sec_hsts_max_age() ) );
		} else {
			$rows[] = $this->row( 'Security headers', 'mu-plugin missing' );
		}

		WP_CLI\Utils\format_items( $assoc_args['format'], $rows, array( 'check', 'value' ) );
	}

	/**
	 * One-time site configuration: install, themes, plugins, language, options, default content. Idempotent.
	 *
	 * Runs before WordPress loads, so it can install a fresh database: when WordPress is not installed yet
	 * it runs `wp core install` (title "Radost v pohybu", admin from wp-secrets.env, no e-mail). Then, in
	 * a WordPress-loaded process (`wp tk site-configure`), it installs Hello Elementor and activates the
	 * child theme "tkadlcik" (a warning while it is missing or incomplete), installs and activates
	 * Elementor and The SEO Framework, deletes akismet/hello, installs and activates cs_CZ (+ plugin and
	 * theme translations), sets timezone Europe/Prague and permalinks /%postname%/, closes comments and
	 * pings for new content and deletes WordPress's default post/page while untouched. The configuration
	 * step is for a LOCAL install only: it refuses to run unless WP_ENVIRONMENT_TYPE is 'local' or
	 * --allow-non-local is given.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : List what would run without changing anything.
	 *
	 * [--allow-non-local]
	 * : Run although WP_ENVIRONMENT_TYPE is not 'local'. Never on the live site.
	 *
	 * [--secrets=<file>]
	 * : Env file with WP_URL, WP_ADMIN_USER, WP_ADMIN_PASSWORD, WP_ADMIN_EMAIL (for a fresh install).
	 * ---
	 * default: /project/wp-secrets.env
	 * ---
	 *
	 * @subcommand site-setup
	 * @when before_wp_load
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function site_setup( $args, $assoc_args ) {
		$dry_run   = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$installed = 0 === $this->run( 'core is-installed' )->return_code;

		if ( $installed ) {
			WP_CLI::log( '[ok]     WordPress is installed' );
		} else {
			$s = $this->read_secrets( isset( $assoc_args['secrets'] ) ? (string) $assoc_args['secrets'] : self::SECRETS );
			WP_CLI::log( sprintf( '[install] wp core install --url=%s --title="%s" --admin_user=%s --admin_email=%s', $s['WP_URL'], self::SITE_TITLE, $s['WP_ADMIN_USER'], $s['WP_ADMIN_EMAIL'] ) );

			if ( $dry_run ) {
				WP_CLI::success( 'Dry run: WordPress is not installed; nothing else can be checked. Nothing was changed.' );
				return;
			}

			$res = $this->run(
				sprintf(
					'core install --url=%s --title=%s --admin_user=%s --admin_password=%s --admin_email=%s --skip-email',
					escapeshellarg( $s['WP_URL'] ),
					escapeshellarg( self::SITE_TITLE ),
					escapeshellarg( $s['WP_ADMIN_USER'] ),
					escapeshellarg( $s['WP_ADMIN_PASSWORD'] ),
					escapeshellarg( $s['WP_ADMIN_EMAIL'] )
				)
			);

			if ( $res->return_code ) {
				WP_CLI::error( 'wp core install failed: ' . trim( $res->stderr . ' ' . $res->stdout ) );
			}
		}

		$flags = ( $dry_run ? ' --dry-run' : '' ) . ( WP_CLI\Utils\get_flag_value( $assoc_args, 'allow-non-local', false ) ? ' --allow-non-local' : '' );

		// A WordPress-loaded process; its output streams through, a failure exits with its code.
		WP_CLI::runcommand(
			'tk site-configure' . $flags,
			array(
				'launch'     => true,
				'exit_error' => true,
				'return'     => false,
			)
		);
	}

	/**
	 * The WordPress-loaded half of site-setup (themes, plugins, language, options, default content). Idempotent.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : List what would run without changing anything.
	 *
	 * [--allow-non-local]
	 * : Run although WP_ENVIRONMENT_TYPE is not 'local'. Never on the live site.
	 *
	 * @subcommand site-configure
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function site_configure( $args, $assoc_args ) {
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$env     = wp_get_environment_type();

		if ( 'local' !== $env ) {
			if ( ! WP_CLI\Utils\get_flag_value( $assoc_args, 'allow-non-local', false ) ) {
				if ( ! $dry_run ) {
					WP_CLI::error( sprintf( 'site-setup is for a local install; this environment is "%s". It deletes plugins, forces permalinks and overwrites options. Pass --allow-non-local only if you really mean it (never on the live site).', $env ) );
				}
				WP_CLI::warning( sprintf( 'Environment is "%s": a real run would be refused without --allow-non-local. Reporting only.', $env ) );
			} else {
				WP_CLI::warning( sprintf( 'Environment is "%s": running because --allow-non-local was given.', $env ) );
			}
		}

		// Each runs in its own process so a freshly activated plugin/theme is loaded for the next step.
		$commands = array();
		if ( ! wp_get_theme( self::PARENT_THEME )->exists() ) {
			$commands[] = 'theme install ' . self::PARENT_THEME;
		}

		$theme = wp_get_theme( self::THEME );
		if ( ! is_file( get_theme_root() . '/' . self::THEME . '/style.css' ) ) {
			WP_CLI::warning( sprintf( 'Theme "%s" not found (wp-content/themes/%s/style.css missing): keeping the active theme "%s". Re-run wp tk site-setup once the theme exists.', self::THEME, self::THEME, get_stylesheet() ) );
		} elseif ( $theme->errors() && 'theme_no_parent' !== $theme->errors()->get_error_code() ) {
			WP_CLI::warning( sprintf( 'Theme "%s" is not usable yet (%s): %s. Re-run wp tk site-setup once the theme is complete.', self::THEME, wp_strip_all_tags( $theme->errors()->get_error_message() ), self::THEME === get_stylesheet() ? 'it is active but incomplete' : 'keeping the active theme "' . get_stylesheet() . '"' ) );
		} elseif ( self::THEME !== get_stylesheet() ) {
			$commands[] = 'theme activate ' . self::THEME;
		} elseif ( $theme->get_template() !== get_template() ) {
			// Activated before its style.css declared the parent: the stored `template` option is stale,
			// so the parent never loads. Re-activating re-reads the header and stores the parent.
			WP_CLI::log( sprintf( '[fix]    theme %s: stored parent "%s" != declared "%s"', self::THEME, get_template(), $theme->get_template() ) );
			$commands[] = 'theme activate ' . $theme->get_template();
			$commands[] = 'theme activate ' . self::THEME;
		} else {
			WP_CLI::log( sprintf( '[ok]     theme %s %s active', self::THEME, $theme->get( 'Version' ) ) );
		}

		foreach ( self::PLUGINS as $slug ) {
			if ( 0 !== strpos( $this->plugin_state( $slug ), 'active ' ) ) {
				$commands[] = 'plugin install ' . $slug . ' --activate';
			}
		}
		foreach ( self::PINNED_PLUGINS as $slug => $version ) {
			$state = $this->plugin_state( $slug );
			if ( 'active ' . $version === $state ) {
				continue;
			}
			// Not installed, or another version: install exactly the pinned one (--force replaces a different
			// version); merely inactive in the right version: activate.
			$commands[] = 'inactive ' . $version === $state ? 'plugin activate ' . $slug : 'plugin install ' . $slug . ' --version=' . $version . ' --force --activate';
		}
		foreach ( array( 'akismet', 'hello', 'hello-dolly' ) as $slug ) {
			if ( is_dir( WP_PLUGIN_DIR . '/' . $slug ) || is_file( WP_PLUGIN_DIR . '/' . $slug . '.php' ) ) {
				$commands[] = 'plugin delete ' . $slug;
			}
		}
		if ( 'cs_CZ' !== get_locale() ) {
			$commands[] = 'language core install cs_CZ --activate';
		}
		array_push(
			$commands,
			'language plugin install --all cs_CZ',
			'language theme install --all cs_CZ'
		);
		if ( '/%postname%/' !== get_option( 'permalink_structure' ) ) {
			$commands[] = 'rewrite structure /%postname%/ --hard';
		}

		foreach ( $commands as $command ) {
			WP_CLI::log( '> wp ' . $command );

			if ( $dry_run ) {
				continue;
			}

			$result = $this->run( $command );

			if ( $result->return_code ) {
				WP_CLI::warning( trim( $result->stderr ) ? trim( $result->stderr ) : 'exit code ' . $result->return_code );
			}
		}

		$options = array(
			'blogname'               => self::SITE_TITLE,
			'timezone_string'        => 'Europe/Prague',
			'date_format'            => 'j. n. Y',
			'time_format'            => 'H:i',
			'start_of_week'          => 1,
			// Flat uploads: finalize.mjs addresses every image as /wp-content/uploads/<name>.webp.
			'uploads_use_yearmonth_folders' => 0,
			'default_comment_status' => 'closed',
			'default_ping_status'    => 'closed',
			'default_pingback_flag'  => 0,
			'blog_public'            => 1,
			'elementor_onboarded'    => 1,
		);

		foreach ( $options as $name => $value ) {
			$same = (string) get_option( $name ) === (string) $value;
			WP_CLI::log( sprintf( '%s option %s = %s', $same ? '[ok]    ' : '[write] ', $name, (string) $value ) );

			if ( ! $dry_run && ! $same ) {
				update_option( $name, $value );
			}
		}

		// WordPress' default content (English and Czech slugs). Matched by slug so our pages are never touched.
		$defaults = array_filter(
			array(
				get_page_by_path( 'hello-world', OBJECT, 'post' ),
				get_page_by_path( 'ahoj-vsichni', OBJECT, 'post' ),
				get_page_by_path( 'sample-page', OBJECT, 'page' ),
				get_page_by_path( 'ukazkova-stranka', OBJECT, 'page' ),
				get_page_by_path( 'privacy-policy', OBJECT, 'page' ),
			)
		);

		foreach ( $defaults as $post ) {
			$why = self::default_post_kept_reason( $post );
			if ( '' !== $why ) {
				WP_CLI::log( sprintf( '[skip]   default %s #%d "%s": %s', $post->post_type, $post->ID, $post->post_title, $why ) );
				continue;
			}

			WP_CLI::log( sprintf( '[delete] default %s #%d "%s"', $post->post_type, $post->ID, $post->post_title ) );

			if ( ! $dry_run ) {
				wp_delete_post( $post->ID, true );
			}
		}

		WP_CLI::success( $dry_run ? 'Dry run complete. Nothing was changed.' : 'Site configured.' );
	}

	/**
	 * Why site-setup must keep a "default" post, or '' when it is WordPress's untouched install default:
	 * never modified since it was created, and the privacy-policy page still a draft.
	 *
	 * @param WP_Post $post Post.
	 * @return string
	 */
	private static function default_post_kept_reason( $post ) {
		if ( $post->post_modified_gmt !== $post->post_date_gmt ) {
			return sprintf( 'modified since it was created (%s != %s)', $post->post_modified_gmt, $post->post_date_gmt );
		}
		if ( 'privacy-policy' === $post->post_name && 'draft' !== $post->post_status ) {
			return sprintf( 'status "%s", not the install default "draft"', $post->post_status );
		}

		return '';
	}

	/**
	 * Create or update Elementor pages from generated JSON definitions. Idempotent (matched by slug).
	 *
	 * All files are validated before anything is written. The previous _elementor_data of every page
	 * that gets overwritten is copied to /backups/layouts/ (never into uploads). A page whose title,
	 * status, Elementor data, template, scripts and preloads already match is reported "[ok]" and not
	 * written at all, so its modified date (the sitemap's lastmod) stays; "[update]" names the fields that
	 * differ. The definition with front_page: true (else the page "domu") becomes the static front page.
	 * Any create/update purges the page cache (save_post safety net) and clears TSF's sitemap cache.
	 *
	 * Definition: { slug, title, elements: [Elementor element tree], status?: publish|draft|private,
	 * template?: elementor_header_footer|elementor_canvas|default, scripts?: [nav|tabs|reveal|map|video],
	 * front_page?: bool, preload?: ["/wp-content/uploads/x.webp" | {src, sizes}] }.
	 *
	 * ## OPTIONS
	 *
	 * [<file>...]
	 * : Page definition files. Inside the CLI container the repo is at /project.
	 *
	 * [--dir=<dir>]
	 * : Also upsert every *.json in this directory.
	 *
	 * [--dry-run]
	 * : Validate and report without writing.
	 *
	 * ## EXAMPLES
	 *
	 *     wp tk page-upsert --dir=/project/build/pages --dry-run
	 *     wp tk page-upsert /project/build/pages/kontakt.json
	 *
	 * @subcommand page-upsert
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function page_upsert( $args, $assoc_args ) {
		if ( ! defined( 'ELEMENTOR_VERSION' ) ) {
			WP_CLI::error( 'Elementor is not active; cannot write Elementor page data (wp tk site-setup).' );
		}

		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$files   = $args;

		if ( ! empty( $assoc_args['dir'] ) ) {
			$found = glob( untrailingslashit( $assoc_args['dir'] ) . '/*.json' );
			$files = array_merge( $files, $found ? $found : array() );
		}

		if ( ! $files ) {
			WP_CLI::error( 'Pass page definition files or --dir.' );
		}

		$defs  = array_map( array( $this, 'read_definition' ), $files );
		$slugs = wp_list_pluck( $defs, 'slug' );

		if ( count( $slugs ) !== count( array_unique( $slugs ) ) ) {
			WP_CLI::error( 'Duplicate slugs across definitions: ' . implode( ', ', array_diff_assoc( $slugs, array_unique( $slugs ) ) ) );
		}

		$fronts = array_filter( $defs, static fn( $d ) => $d['front_page'] );

		if ( count( $fronts ) > 1 ) {
			WP_CLI::error( 'More than one definition has front_page: true.' );
		}

		if ( ! $fronts ) {
			foreach ( $defs as $i => $def ) {
				$defs[ $i ]['front_page'] = self::FRONT === $def['slug'];
			}
		}

		$counts = array(
			'create' => 0,
			'update' => 0,
			'ok'     => 0,
		);

		foreach ( $defs as $def ) {
			++$counts[ $this->upsert_page( $def, $dry_run ) ];
		}

		if ( ! $dry_run && class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}

		// A created/updated page changes the sitemap (<loc>, <lastmod> = post_modified), but TSF keeps
		// serving its cached copy until its own admin hooks run. Unchanged runs ([ok] only) leave it alone.
		if ( ! $dry_run && ( $counts['create'] + $counts['update'] ) > 0 && defined( 'THE_SEO_FRAMEWORK_VERSION' ) && $this->clear_tsf_sitemap_cache() ) {
			WP_CLI::log( '[sitemap] TSF sitemap cache cleared.' );
		}

		WP_CLI::success(
			$dry_run
				? sprintf( '%d page definition(s) validated (dry run, nothing written): %d to create, %d to update, %d unchanged.', count( $defs ), $counts['create'], $counts['update'], $counts['ok'] )
				: sprintf( '%d page definition(s): %d created, %d updated, %d unchanged (not written).', count( $defs ), $counts['create'], $counts['update'], $counts['ok'] )
		);
	}

	/**
	 * Import images as WebP uploads (from build/media.json, else every image in --dir).
	 *
	 * Resized to --max-edge on the long side and re-encoded as WebP; the file keeps its base name
	 * (daniel.jpg -> daniel.webp, which is what the page markup references). Alt text comes from the
	 * manifest ([{file, alt}]). Idempotent: an existing upload is updated in place (alt text, and any image
	 * size registered since it was imported, "[sizes]"); with --replace it is re-encoded from the source.
	 * A replacement never loses the current image: the new WebP is encoded first, and only when that
	 * succeeded does it overwrite the attachment's file (same attachment ID and URL, sizes regenerated).
	 * Nothing to do (no manifest, empty directory) is not an error.
	 *
	 * With --files-dir, every file in that directory is also imported as-is (no conversion, no image sizes):
	 * downloads such as .docx documents or a flyer .jpg keep their exact file name and a flat URL
	 * (/wp-content/uploads/<name>). Idempotent: an unchanged file is "[ok]", a changed one is overwritten in
	 * place ("[replace]", same attachment and URL).
	 *
	 * ## OPTIONS
	 *
	 * [--files-dir=<dir>]
	 * : Directory of downloads imported as-is (e.g. /project/client-files). Off by default.
	 *
	 * [--manifest=<file>]
	 * : JSON list of {file, alt}. Without it, every .jpg/.jpeg/.png/.webp in --dir is imported (no alt).
	 * ---
	 * default: /project/build/media.json
	 * ---
	 *
	 * [--dir=<dir>]
	 * : Directory holding the source images.
	 * ---
	 * default: /project/client-img
	 * ---
	 *
	 * [--max-edge=<px>]
	 * : Longest side after resizing.
	 * ---
	 * default: 1600
	 * ---
	 *
	 * [--quality=<q>]
	 * : WebP quality.
	 * ---
	 * default: 80
	 * ---
	 *
	 * [--replace]
	 * : Re-encode images that were already imported.
	 *
	 * [--dry-run]
	 * : Report without writing.
	 *
	 * @subcommand media-import
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function media_import( $args, $assoc_args ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$this->act_as_admin();

		$dir      = untrailingslashit( $assoc_args['dir'] );
		$dry_run  = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$replace  = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'replace', false );
		$max_edge = max( 200, (int) $assoc_args['max-edge'] );
		$quality  = min( 100, max( 1, (int) $assoc_args['quality'] ) );

		if ( ! empty( $assoc_args['files-dir'] ) ) {
			$this->import_files_as_is( untrailingslashit( (string) $assoc_args['files-dir'] ), $dry_run );
		}

		if ( is_readable( $assoc_args['manifest'] ) ) {
			$manifest = $this->read_json( $assoc_args['manifest'] );
		} else {
			$manifest = array();
			foreach ( is_dir( $dir ) ? (array) scandir( $dir ) : array() as $name ) {
				if ( preg_match( '/\.(?:jpe?g|png|webp)$/i', (string) $name ) ) {
					$manifest[] = array(
						'file' => $name,
						'alt'  => '',
					);
				}
			}
			WP_CLI::log( sprintf( 'No manifest at %s: %d image(s) found in %s.', $assoc_args['manifest'], count( $manifest ), $dir ) );
		}

		if ( ! $manifest ) {
			WP_CLI::success( 'Nothing to import.' );
			return;
		}

		if ( ! wp_image_editor_supports( array( 'mime_type' => 'image/webp' ) ) ) {
			WP_CLI::error( 'No image editor with WebP support (GD/Imagick) is available.' );
		}

		$counts  = array( 'imported' => 0, 'updated' => 0, 'replaced' => 0, 'sized' => 0 );
		$missing = array();

		foreach ( $manifest as $entry ) {
			$filename = basename( (string) $entry['file'] );
			$alt      = (string) ( $entry['alt'] ?? '' );
			$path     = $dir . '/' . $filename;

			if ( ! is_readable( $path ) ) {
				$missing[] = $filename;
				continue;
			}

			$base     = preg_replace( '/\.(jpe?g|png|webp)$/i', '', $filename );
			$existing = $this->find_attachment_by_file( $base . '.webp' );
			$action   = $existing ? ( $replace ? 'replace' : 'update' ) : 'import';

			WP_CLI::log( sprintf( '[%s] %s -> %s.webp%s', $action, $filename, $base, '' === $alt ? '  (no alt)' : '' ) );

			// Sizes registered after the image was imported are added in place.
			$missing_sizes = $existing && ! $replace ? array_keys( (array) wp_get_missing_image_subsizes( $existing ) ) : array();

			if ( $missing_sizes ) {
				WP_CLI::log( sprintf( '[sizes]  %s.webp: %s', $base, implode( ', ', $missing_sizes ) ) );
			}

			if ( $dry_run ) {
				continue;
			}

			if ( $existing && ! $replace ) {
				update_post_meta( $existing, '_wp_attachment_image_alt', $alt );
				++$counts['updated'];

				if ( $missing_sizes ) {
					$meta = wp_update_image_subsizes( $existing );
					if ( is_wp_error( $meta ) ) {
						WP_CLI::warning( sprintf( '%s: %s (sizes not added)', $filename, $meta->get_error_message() ) );
					} else {
						++$counts['sized'];
					}
				}
				continue;
			}

			// Convert first: nothing existing is touched unless the new file is ready.
			$tmp = $this->convert_to_webp( $path, $max_edge, $quality );

			if ( is_wp_error( $tmp ) ) {
				WP_CLI::warning( sprintf( '%s: %s%s', $filename, $tmp->get_error_message(), $existing ? ' (existing upload kept)' : '' ) );
				continue;
			}

			if ( $existing ) {
				$replaced = $this->replace_attachment_file( $existing, $tmp );
				@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

				if ( is_wp_error( $replaced ) ) {
					WP_CLI::warning( sprintf( '%s: %s (existing upload kept)', $filename, $replaced->get_error_message() ) );
					continue;
				}

				update_post_meta( $existing, '_wp_attachment_image_alt', $alt );
				update_post_meta( $existing, '_tk_source_file', $filename );
				++$counts['replaced'];
				continue;
			}

			$id = media_handle_sideload(
				array(
					'name'     => $base . '.webp',
					'tmp_name' => $tmp,
				),
				0,
				$base
			);

			if ( is_wp_error( $id ) ) {
				@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				WP_CLI::warning( sprintf( '%s: %s', $filename, $id->get_error_message() ) );
				continue;
			}

			update_post_meta( $id, '_wp_attachment_image_alt', $alt );
			update_post_meta( $id, '_tk_source_file', $filename );
			++$counts['imported'];
		}

		if ( $missing ) {
			WP_CLI::warning( 'Listed in the manifest but not in ' . $dir . ': ' . implode( ', ', $missing ) );
		}

		WP_CLI::success( $dry_run ? 'Dry run complete. Nothing was written.' : vsprintf( '%d imported, %d updated, %d re-encoded, %d given missing sizes.', array_values( $counts ) ) );
	}

	/**
	 * Favicon / app icon (port of martinadamus `wp ma site-icon`), with all four WordPress icon sizes.
	 *
	 * The source is the 512×512 PNG rendered from the header's taiji logo (client-img/site-icon.png). The
	 * 32/180/192/270 crops only exist when WP_Site_Icon's size filter is active while the attachment metadata
	 * is generated; setting the option alone would make WordPress link the full-size image from every icon tag.
	 * Skips the work when the source has not changed (md5 in _tk_source_hash). A replaced icon's attachment is
	 * deleted.
	 *
	 * ## OPTIONS
	 *
	 * [--file=<file>]
	 * : Source PNG, square, at least 512 px.
	 * ---
	 * default: /project/client-img/site-icon.png
	 * ---
	 *
	 * [--dry-run]
	 * : Report without writing.
	 *
	 * @subcommand site-icon
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function site_icon( $args, $assoc_args ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-site-icon.php';

		$this->act_as_admin();

		$src     = (string) $assoc_args['file'];
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$size    = is_readable( $src ) ? getimagesize( $src ) : false;

		if ( ! $size || IMAGETYPE_PNG !== $size[2] ) {
			WP_CLI::error( sprintf( 'Cannot read %s as a PNG.', $src ) );
		}
		if ( $size[0] !== $size[1] || $size[0] < 512 ) {
			WP_CLI::error( sprintf( '%s is %d×%d; the site icon must be square and at least 512 px.', $src, $size[0], $size[1] ) );
		}

		$hash    = md5_file( $src );
		$current = (int) get_option( 'site_icon' );

		if ( $current && get_post_meta( $current, '_tk_source_hash', true ) === $hash && get_attached_file( $current ) && file_exists( get_attached_file( $current ) ) ) {
			WP_CLI::success( sprintf( 'Site icon #%d is up to date.', $current ) );
			return;
		}

		if ( $dry_run ) {
			WP_CLI::success( sprintf( 'Would set the site icon from %s (current: %s).', $src, $current ? '#' . $current : 'none' ) );
			return;
		}

		// media_handle_sideload() moves the file: give it a copy.
		$tmp = wp_tempnam( 'tk-site-icon' ) . '.png';
		if ( ! copy( $src, $tmp ) ) {
			WP_CLI::error( 'Cannot copy the source to a temporary file.' );
		}

		$icon = new WP_Site_Icon();
		add_filter( 'intermediate_image_sizes_advanced', array( $icon, 'additional_sizes' ) );
		$id = media_handle_sideload(
			array(
				'name'     => 'site-icon.png',
				'tmp_name' => $tmp,
			),
			0,
			'Site icon'
		);
		remove_filter( 'intermediate_image_sizes_advanced', array( $icon, 'additional_sizes' ) );

		if ( is_wp_error( $id ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			WP_CLI::error( $id->get_error_message() );
		}

		update_post_meta( $id, '_wp_attachment_context', 'site-icon' );
		update_post_meta( $id, '_tk_source_hash', $hash );
		update_option( 'site_icon', $id );

		if ( $current && $current !== $id ) {
			wp_delete_attachment( $current, true );
		}

		$meta = wp_get_attachment_metadata( $id );
		WP_CLI::success( sprintf( 'Site icon #%d with sizes: %s', $id, implode( ', ', array_keys( isset( $meta['sizes'] ) ? $meta['sizes'] : array() ) ) ) );
	}

	/**
	 * Elementor Site Settings in a kit of our own, plus performance options. Idempotent.
	 *
	 * The active kit must be ours (post meta _tk_kit) and hold exactly these settings: kit-setup reuses a
	 * kit it created earlier or creates a fresh one through Elementor's kits manager, switches
	 * elementor_active_kit to it and remembers the previous kit in the option tk_kit_previous (rollback:
	 * wp option update elementor_active_kit <that id>). An inherited kit is never merged into.
	 * Palette and typography come from /project/build/kit.json when it exists ({system_colors,
	 * custom_colors, system_typography, …} — any kit setting key); the layout defaults (no container
	 * padding/gaps, Elementor's lightbox off) apply otherwise. Options: no Google Fonts, no Font Awesome
	 * shim, element cache off, optimized image loading off, background lazy-load off, CSS print method
	 * external, experiment e_optimized_markup active.
	 *
	 * ## OPTIONS
	 *
	 * [--file=<file>]
	 * : Kit settings JSON (optional).
	 * ---
	 * default: /project/build/kit.json
	 * ---
	 *
	 * [--dry-run]
	 * : Report what would be created, switched or rewritten without writing.
	 *
	 * @subcommand kit-setup
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function kit_setup( $args, $assoc_args ) {
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );

		if ( ! class_exists( '\Elementor\Plugin' ) || ! isset( \Elementor\Plugin::$instance->kits_manager ) ) {
			WP_CLI::error( 'Elementor is not active.' );
		}

		$settings = $this->kit_settings( isset( $assoc_args['file'] ) ? (string) $assoc_args['file'] : '/project/build/kit.json' );
		$options  = $this->kit_options();

		$changed = array();
		foreach ( $options as $name => $value ) {
			$current = get_option( $name, null );
			if ( $current !== $value ) {
				$changed[ $name ] = $current;
				WP_CLI::log( sprintf( 'option %s: %s -> %s', $name, null === $current ? '(unset)' : ( is_scalar( $current ) ? (string) $current : wp_json_encode( $current ) ), $value ) );
			}
		}

		$active_id = (int) get_option( 'elementor_active_kit' );
		$active_ok = $active_id && $this->is_elementor_kit( $active_id );
		$kit_id    = $active_ok && get_post_meta( $active_id, self::TK_KIT_META, true ) ? $active_id : $this->find_tk_kit();
		$switch    = $kit_id !== $active_id;

		if ( ! $kit_id ) {
			WP_CLI::log( sprintf( '[create] a new kit "%s" (meta %s) with exactly our settings', self::SITE_TITLE, self::TK_KIT_META ) );
		}
		if ( $switch ) {
			WP_CLI::log(
				sprintf(
					'[switch] elementor_active_kit %s -> %s; %s = %s (the old kit itself is not changed)',
					$active_id ? '#' . $active_id . ( $active_ok ? '' : ' (not a kit)' ) : '(unset)',
					$kit_id ? '#' . $kit_id : 'the new kit',
					self::TK_KIT_PREVIOUS_OPTION,
					$active_ok ? '#' . $active_id : '(unchanged, nothing to remember)'
				)
			);
		}

		$current = $kit_id ? get_post_meta( $kit_id, '_elementor_page_settings', true ) : array();
		$current = is_array( $current ) ? $current : array();
		$extra   = array_values( array_diff( array_keys( $current ), array_keys( $settings ) ) );
		$differs = array_values( array_filter( array_keys( $settings ), static fn( $k ) => ! array_key_exists( $k, $current ) || wp_json_encode( $current[ $k ] ) !== wp_json_encode( $settings[ $k ] ) ) );
		$rewrite = ! $kit_id || $extra || $differs;

		if ( $kit_id && $rewrite ) {
			WP_CLI::log( sprintf( '[rewrite] kit #%d settings: %d key(s) to set%s%s', $kit_id, count( $differs ), $differs ? ' (' . implode( ', ', $differs ) . ')' : '', $extra ? '; ' . count( $extra ) . ' foreign key(s) to drop (' . implode( ', ', $extra ) . ')' : '' ) );
		}

		WP_CLI::log(
			sprintf(
				'Kit %s: %d system + %d custom colours, %d fonts, layout (%s); %d options (%d to change).',
				$kit_id ? '#' . $kit_id : '(new)',
				isset( $settings['system_colors'] ) ? count( (array) $settings['system_colors'] ) : 0,
				isset( $settings['custom_colors'] ) ? count( (array) $settings['custom_colors'] ) : 0,
				isset( $settings['system_typography'] ) ? count( (array) $settings['system_typography'] ) : 0,
				$rewrite ? 'to write' : 'already exact',
				count( $options ),
				count( $changed )
			)
		);

		if ( $dry_run ) {
			WP_CLI::success( 'Dry run complete. Nothing was written.' );
			return;
		}

		if ( ! $kit_id ) {
			$kit_id = (int) \Elementor\Plugin::$instance->kits_manager->create(
				array( 'post_title' => self::SITE_TITLE ),
				array( self::TK_KIT_META => '1' )
			);
			if ( ! $kit_id || ! $this->is_elementor_kit( $kit_id ) ) {
				WP_CLI::error( 'Elementor could not create a kit.' );
			}
			WP_CLI::log( sprintf( 'Created kit #%d.', $kit_id ) );
		}

		if ( $rewrite ) {
			update_post_meta( $kit_id, '_elementor_page_settings', $settings ); // Exactly ours, never a merge.
		}

		if ( $switch ) {
			if ( $active_ok ) {
				update_option( self::TK_KIT_PREVIOUS_OPTION, $active_id, false );
			}
			update_option( 'elementor_active_kit', $kit_id );
		}

		foreach ( $options as $name => $value ) {
			update_option( $name, $value );
		}

		\Elementor\Plugin::$instance->files_manager->clear_cache();

		WP_CLI::success(
			sprintf(
				'Kit #%d is active and ours%s; Google Fonts, Font Awesome shim, the element cache, image-loading buffer and background lazy-load are off, CSS print method external, optimized markup active; %d option(s) changed.',
				$kit_id,
				$switch && $active_ok ? sprintf( ' (was #%d, kept in %s)', $active_id, self::TK_KIT_PREVIOUS_OPTION ) : '',
				count( $changed )
			)
		);
	}

	/**
	 * Whether a post is an Elementor kit that is not trashed.
	 *
	 * @param int $id Post ID.
	 * @return bool
	 */
	private function is_elementor_kit( $id ) {
		$post = get_post( $id );
		return $post && 'elementor_library' === $post->post_type && 'trash' !== $post->post_status && 'kit' === get_post_meta( $id, '_elementor_template_type', true );
	}

	/**
	 * The newest published kit kit-setup created (meta _tk_kit), or 0.
	 *
	 * @return int
	 */
	private function find_tk_kit() {
		$ids = get_posts(
			array(
				'post_type'        => 'elementor_library',
				'post_status'      => 'publish',
				'posts_per_page'   => -1,
				'orderby'          => 'ID',
				'order'            => 'DESC',
				'fields'           => 'ids',
				'meta_key'         => self::TK_KIT_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'no_found_rows'    => true,
				'suppress_filters' => true,
			)
		);
		foreach ( $ids as $id ) {
			if ( $this->is_elementor_kit( (int) $id ) ) {
				return (int) $id;
			}
		}
		return 0;
	}

	/**
	 * Doctor row: is the active Elementor kit ours and exact?
	 *
	 * @return string
	 */
	private function kit_doctor_value() {
		$id = (int) get_option( 'elementor_active_kit' );
		if ( ! $id || ! $this->is_elementor_kit( $id ) ) {
			return 'none - run wp tk kit-setup';
		}
		if ( ! get_post_meta( $id, self::TK_KIT_META, true ) ) {
			return sprintf( '#%d NOT ours (inherited kit; its Theme Style may leak) - run wp tk kit-setup', $id );
		}
		$have = get_post_meta( $id, '_elementor_page_settings', true );
		$prev = (int) get_option( self::TK_KIT_PREVIOUS_OPTION );
		$note = $prev ? sprintf( ', previous #%d in %s', $prev, self::TK_KIT_PREVIOUS_OPTION ) : '';
		return wp_json_encode( $have ) === wp_json_encode( $this->kit_settings( '/project/build/kit.json' ) )
			? sprintf( '#%d ours (exact settings%s)', $id, $note )
			: sprintf( '#%d ours, settings differ - run wp tk kit-setup%s', $id, $note );
	}

	/**
	 * The kit's _elementor_page_settings, exactly: layout defaults, overridden/extended by kit.json.
	 *
	 * @param string $file Optional kit settings JSON.
	 * @return array<string,mixed>
	 */
	private function kit_settings( $file ) {
		$settings = array(
			'default_generic_fonts' => 'system-ui, sans-serif',
			'container_width'       => array( 'unit' => 'px', 'size' => 1200 ),
			'container_padding'     => array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true ),
			'space_between_widgets' => array( 'unit' => 'px', 'size' => 0, 'column' => '0', 'row' => '0', 'isLinked' => true ),
			'global_image_lightbox' => '',
		);

		if ( is_readable( $file ) ) {
			$settings = array_merge( $settings, $this->read_json( $file ) );
		}

		return $settings;
	}

	/**
	 * Elementor options kit-setup pins.
	 *
	 * @return array<string,string>
	 */
	private function kit_options() {
		return array(
			'elementor_google_font'                   => '0',
			'elementor_font_display'                  => 'swap',
			'elementor_experiment-e_font_icon_svg'    => 'active',
			// The optimized markup (no extra <div class="elementor-widget-container"> per widget). Its
			// default depends on the Elementor version the site was first installed with: pin it.
			'elementor_experiment-e_optimized_markup' => 'active',
			'elementor_load_fa4_shim'                 => '',
			'elementor_element_cache_ttl'             => 'disable',
			'elementor_disable_color_schemes'         => 'yes',
			'elementor_disable_typography_schemes'    => 'yes',
			// Performance: the builders write explicit loading/fetchpriority hints; Elementor's page-wide
			// output buffer would add competing fetchpriority attributes, and its background lazy-load hides
			// inline background-images behind `background-image:none!important` until its script runs.
			'elementor_optimized_image_loading'       => '0',
			'elementor_lazy_load_background_images'   => '0',
			// "external" keeps the post/kit CSS as files; "internal" prints <style> straight into wp_head.
			'elementor_css_print_method'              => 'external',
		);
	}

	// Gotcha: no line in the docblock below (or any @subcommand docblock) may start with "@" unless
	// it is a real PHPDoc tag — WP-CLI's reflection-based synopsis parser stops reading [--opt=] /
	// `default:` blocks once it hits an unrecognized "@tag".
	/**
	 * Write per-page The SEO Framework title, description, robots, canonical and OG image from build/seo.json.
	 *
	 * seo.json: { "<slug>": { title, description, robots?: [index|noindex, follow|nofollow], og?: "<upload file name>", og_alt?: "<its alt text>",
	 * canonical?: "<absolute URL>" }, … }. TSF's own JSON-LD is switched off (structured data is the theme's
	 * job), the sitemap is on, the site name goes after the page title ("… | Radost v pohybu"). Every
	 * title in seo.json is the complete one, so each page also gets `_tsf_title_no_blogname`. The entry for
	 * "domu" (the front page) also fills TSF's homepage settings.
	 *
	 * ## OPTIONS
	 *
	 * [--file=<file>]
	 * : Path to seo.json.
	 * ---
	 * default: /project/build/seo.json
	 * ---
	 *
	 * [--dry-run]
	 * : Report what would change without writing anything.
	 *
	 * @subcommand seo-setup
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function seo_setup( $args, $assoc_args ) {
		if ( ! defined( 'THE_SEO_FRAMEWORK_VERSION' ) ) {
			WP_CLI::error( 'The SEO Framework is not active (wp tk site-setup).' );
		}

		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$entries = $this->read_json( $assoc_args['file'] );

		if ( empty( $entries ) ) {
			WP_CLI::error( 'seo.json is not a JSON object of slug => {title, description, robots, og}.' );
		}

		$written = 0;
		$home    = array();

		foreach ( $entries as $slug => $entry ) {
			$page = get_page_by_path( $slug, OBJECT, 'page' );

			if ( ! $page ) {
				WP_CLI::warning( sprintf( 'No page with slug "%s".', $slug ) );
				continue;
			}

			$title       = (string) $entry['title'];
			$description = (string) $entry['description'];
			$robots      = ! empty( $entry['robots'] ) ? (array) $entry['robots'] : array( 'index', 'follow' );
			$noindex     = in_array( 'noindex', $robots, true ) ? 1 : 0;
			$nofollow    = in_array( 'nofollow', $robots, true ) ? 1 : 0;
			$canonical   = ! empty( $entry['canonical'] ) ? esc_url_raw( (string) $entry['canonical'] ) : '';
			$og_id       = ! empty( $entry['og'] ) ? $this->find_attachment_by_file( $entry['og'] ) : 0;
			$og_url      = $og_id ? (string) wp_get_attachment_url( $og_id ) : '';

			WP_CLI::log(
				sprintf(
					'%-24s %2d/%3d chars  %-14s og:%s%s',
					$slug,
					mb_strlen( $title ),
					mb_strlen( $description ),
					implode( ',', $robots ),
					$og_id ? '#' . $og_id : ( ! empty( $entry['og'] ) ? 'MISSING ' . $entry['og'] : 'none' ),
					$canonical ? '  canonical:' . $canonical : ''
				)
			);

			if ( $dry_run ) {
				continue;
			}

			$meta = array(
				'_genesis_title'         => $title,
				'_tsf_title_no_blogname' => 1,
				'_genesis_description'   => $description,
				'_genesis_noindex'       => $noindex,
				'_genesis_nofollow'      => $nofollow,
			);

			if ( $og_url ) {
				$meta['_social_image_url'] = $og_url;
				$meta['_social_image_id']  = $og_id;
				// og:image:alt = the attachment's alt text (files imported with --files-dir have none).
				if ( ! empty( $entry['og_alt'] ) && (string) $entry['og_alt'] !== (string) get_post_meta( $og_id, '_wp_attachment_image_alt', true ) ) {
					update_post_meta( $og_id, '_wp_attachment_image_alt', sanitize_text_field( (string) $entry['og_alt'] ) );
				}
			}

			foreach ( $meta as $key => $value ) {
				update_post_meta( $page->ID, $key, $value );
			}

			if ( $canonical ) {
				update_post_meta( $page->ID, '_genesis_canonical_uri', $canonical );
			} else {
				delete_post_meta( $page->ID, '_genesis_canonical_uri' );
			}

			if ( self::FRONT === $slug || (int) get_option( 'page_on_front' ) === $page->ID ) {
				$home = array(
					'title'       => $title,
					'description' => $description,
					'og_id'       => $og_id,
					'og_url'      => $og_url,
				);
			}

			++$written;
		}

		if ( $dry_run ) {
			WP_CLI::success( 'Dry run complete. Nothing was written.' );
			return;
		}

		$options = get_option( 'autodescription-site-settings', array() );
		$options = is_array( $options ) ? $options : array();

		$options = array_merge(
			$options,
			array(
				'site_title'             => self::SITE_TITLE,
				'title_separator'        => 'pipe',
				'title_rem_additions'    => 0,
				'title_location'         => 'right',

				// The static front page: TSF reads these before the page's own meta. The tagline is off
				// because the title from seo.json is already the complete one.
				'homepage_title'         => isset( $home['title'] ) ? $home['title'] : '',
				'homepage_description'   => isset( $home['description'] ) ? $home['description'] : '',
				'homepage_tagline'       => 0,
				'homepage_title_tagline' => '',
				'home_title_location'    => 'right',

				// Social. The per-page image wins; this is the fallback for anything without one.
				'og_tags'                => 1,
				'twitter_tags'           => 1,
				'twitter_card'           => 'summary_large_image',
				'social_image_fb_url'    => isset( $home['og_url'] ) ? $home['og_url'] : '',
				'social_image_fb_id'     => isset( $home['og_id'] ) ? $home['og_id'] : 0,

				// Structured data is the theme's own job.
				'ld_json_enabled'        => 0,
				'ld_json_searchbox'      => 0,
				'ld_json_breadcrumbs'    => 0,
				'knowledge_output'       => 0,

				'sitemaps_output'        => 1,
				'sitemaps_robots'        => 1,
				'sitemaps_modified'      => 1,

				'author_noindex'         => 1,
				'date_noindex'           => 1,
				'search_noindex'         => 1,

				'noindex_post_types'     => array_merge(
					isset( $options['noindex_post_types'] ) && is_array( $options['noindex_post_types'] ) ? $options['noindex_post_types'] : array(),
					array(
						'attachment'         => 1,
						'elementor_library'  => 1,
						'e-landing-page'     => 1,
						'e-floating-buttons' => 1,
					)
				),
			)
		);

		if ( isset( $home['og_url'] ) && '' !== $home['og_url'] ) {
			$options['homepage_social_image_url'] = $home['og_url'];
			$options['homepage_social_image_id']  = $home['og_id'];
		}

		update_option( 'autodescription-site-settings', $options );

		$sitemap_cleared = $this->clear_tsf_sitemap_cache();

		WP_CLI::success( sprintf( 'SEO meta written for %d pages; TSF JSON-LD off, sitemap on%s.', $written, $sitemap_cleared ? ', sitemap cache cleared' : '' ) );
	}

	/**
	 * Clear TSF's sitemap cache: TSF serves sitemap.xml from a transient and clears it only from its admin
	 * hooks, so after WP-CLI writes it would keep the old pages. Clear it the way TSF's settings save does.
	 *
	 * @return bool Whether the cache was cleared.
	 */
	private function clear_tsf_sitemap_cache() {
		if ( class_exists( '\The_SEO_Framework\Sitemap\Cache' ) && is_callable( array( '\The_SEO_Framework\Sitemap\Cache', 'clear_sitemap_caches' ) ) ) {
			\The_SEO_Framework\Sitemap\Cache::clear_sitemap_caches();
			return true;
		}

		WP_CLI::warning( 'TSF sitemap cache API (Sitemap\Cache::clear_sitemap_caches) not found: clear it in wp-admin (SEO settings -> Save) or check sitemap.xml by hand.' );
		return false;
	}

	/**
	 * Configure cookie consent (port of martinadamus R45): Complianz strict opt-in for the EU, Site Kit's Google
	 * tag blocked until consent to statistics, the banner's Czech texts, colours and CSS. Idempotent: only the
	 * settings listed in mu-plugins/tk-build/consent.php are compared and changed, everything else in Complianz
	 * stays as it is. On production always run it with --dry-run first and read the diff. Saving the banner
	 * regenerates Complianz's banner CSS file, as the plugin's own settings screen does.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : Print every setting that differs (current and new value) without writing anything.
	 *
	 * @subcommand consent-setup
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function consent_setup( $args, $assoc_args ) {
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$why     = tk_consent_unavailable();

		if ( '' !== $why ) {
			WP_CLI::error( $why . ' Run wp tk site-setup.' );
		}

		$this->act_as_admin();
		$diff = tk_consent_diff();

		foreach ( $diff['changes'] as $c ) {
			WP_CLI::log( sprintf( 'change %s: %s -> %s', $c['what'], tk_consent_show( $c['from'] ), tk_consent_show( $c['to'] ) ) );
		}
		WP_CLI::log( sprintf( '%d setting(s) already as needed, %d to change.', count( $diff['ok'] ), count( $diff['changes'] ) ) );

		if ( $dry_run ) {
			WP_CLI::success( 'Dry run complete. Nothing was changed.' );
			return;
		}

		if ( ! $diff['changes'] ) {
			WP_CLI::success( 'Consent already configured.' );
			return;
		}

		foreach ( tk_consent_apply() as $line ) {
			WP_CLI::log( $line );
		}

		$left = tk_consent_diff()['changes'];
		foreach ( $left as $c ) {
			WP_CLI::warning( sprintf( 'still differs after saving: %s = %s (Complianz sanitised it?)', $c['what'], tk_consent_show( $c['from'] ) ) );
		}

		WP_CLI::success( $left ? 'Consent configured with warnings.' : 'Consent configured. Purge + warm the page cache next (rebuild.sh does).' );
	}

	/**
	 * Install, update or remove the page cache: the advanced-cache.php drop-in, the
	 * .htaccess rewrite block (placed right before WordPress's own block, which is never touched) and
	 * wp-content/cache/tk-page/ with its .htaccess. Idempotent; settings persist in the tk_page_cache
	 * option, so a bare re-run keeps them.
	 *
	 * ## OPTIONS
	 *
	 * [--mode=<mode>]
	 * : rewrite = .htaccess serves the files without PHP, drop-in as the fallback (default on first
	 * setup); php = drop-in only, no .htaccess block; off = remove both and purge.
	 *
	 * [--host=<host>]
	 * : Host[:port] the cached pages are served for (default: the home URL's). Use "*" for any host.
	 *
	 * [--edge-ttl=<seconds>]
	 * : s-maxage for a shared proxy in front of the site (default 0 = only the browser, revalidated).
	 *
	 * [--precompressed=<yes|no>]
	 * : Store and serve .gz (and .br with ext-brotli) next to each page (default yes). On a server that
	 * ignores the cache directory's AddEncoding/Header directives (OpenLiteSpeed), use --mode=php instead:
	 * without those headers the files would also lack Cache-Control, which cache-warm reports.
	 *
	 * [--print-htaccess]
	 * : Print the .htaccess block for the given settings and exit (to paste it by hand).
	 *
	 * [--dry-run]
	 * : Report what would change without writing anything.
	 *
	 * @subcommand cache-setup
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function cache_setup( $args, $assoc_args ) {
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$opts    = array(
			'mode'          => isset( $assoc_args['mode'] ) ? (string) $assoc_args['mode'] : null,
			'host'          => isset( $assoc_args['host'] ) ? ( '*' === $assoc_args['host'] ? '' : strtolower( (string) $assoc_args['host'] ) ) : null,
			'edge_ttl'      => isset( $assoc_args['edge-ttl'] ) ? (int) $assoc_args['edge-ttl'] : null,
			'precompressed' => isset( $assoc_args['precompressed'] ) ? in_array( strtolower( (string) $assoc_args['precompressed'] ), array( 'yes', '1', 'true', 'on' ), true ) : null,
		);

		if ( WP_CLI\Utils\get_flag_value( $assoc_args, 'print-htaccess', false ) ) {
			$cfg = array_merge( tk_pc_config(), array_filter( $opts, static fn( $v ) => null !== $v ) );
			WP_CLI::line( '# BEGIN ' . TK_PC_MARKER . "\n" . implode( "\n", tk_pc_htaccess_lines( $cfg ) ) . "\n# END " . TK_PC_MARKER );
			return;
		}

		$res = tk_pc_setup( $opts, $dry_run );

		foreach ( $res['log'] as $line ) {
			WP_CLI::log( $line );
		}

		foreach ( $res['warnings'] as $warning ) {
			WP_CLI::warning( $warning );
		}

		WP_CLI::success( $dry_run ? 'Dry run complete. Nothing was written.' : 'Page cache set up (mode: ' . tk_pc_config()['mode'] . ').' );
	}

	/**
	 * Write the security-header block "# BEGIN TK Security Headers" into the root .htaccess.
	 *
	 * HSTS (HTTPS requests only; max-age from TK_HSTS_MAX_AGE in wp-config.php, default 300 s),
	 * X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy, and no X-Powered-By,
	 * on every response Apache sends: the static page-cache HITs (no PHP), static files, WordPress. PHP
	 * sends the same headers itself (mu-plugins/tk-security-headers.php, the page cache drop-in), so a host
	 * that ignores Header in .htaccess (OpenLiteSpeed) still gets them on every PHP response. Idempotent:
	 * the block is replaced in place, placed before "# BEGIN TK Page Cache" when new.
	 *
	 * ## OPTIONS
	 *
	 * [--remove]
	 * : Remove the block (the PHP headers stay).
	 *
	 * [--print-htaccess]
	 * : Print the block (to paste by hand when .htaccess is not writable) and exit.
	 *
	 * [--dry-run]
	 * : Report without writing.
	 *
	 * ## EXAMPLES
	 *
	 *     wp tk headers-setup --dry-run
	 *     wp config set TK_HSTS_MAX_AGE 31536000 --raw && wp tk headers-setup
	 *
	 * @subcommand headers-setup
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function headers_setup( $args, $assoc_args ) {
		if ( ! function_exists( 'tk_sec_htaccess_block' ) ) {
			WP_CLI::error( 'mu-plugins/tk-security-headers.php is missing.' );
		}

		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$remove  = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'remove', false );
		$block   = tk_sec_htaccess_block();

		if ( WP_CLI\Utils\get_flag_value( $assoc_args, 'print-htaccess', false ) ) {
			WP_CLI::line( '# BEGIN ' . TK_SEC_MARKER . "\n" . implode( "\n", $block ) . "\n# END " . TK_SEC_MARKER );
			return;
		}

		$path    = tk_pc_htaccess_path();
		$before  = is_readable( $path ) ? (string) file_get_contents( $path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$after   = tk_sec_htaccess_with_block( $before, $remove ? null : $block );
		$changed = $after !== $before;
		$age     = tk_sec_hsts_max_age();

		WP_CLI::log( sprintf( '%s %s (block "%s")', $changed ? ( $remove ? '[remove]' : '[write] ' ) : '[ok]    ', $path, TK_SEC_MARKER ) );
		WP_CLI::log( sprintf( '         HSTS max-age=%d%s over HTTPS only; %s', $age, defined( 'TK_HSTS_MAX_AGE' ) ? ' (TK_HSTS_MAX_AGE)' : ' (default; raise with TK_HSTS_MAX_AGE after a week, docs/go-live-requirements.md)', implode( ', ', array_keys( tk_sec_headers() ) ) ) );

		if ( ! $dry_run && $changed ) {
			if ( ( file_exists( $path ) && ! wp_is_writable( $path ) ) || ( ! file_exists( $path ) && ! wp_is_writable( dirname( $path ) ) ) ) {
				WP_CLI::error( $path . ' is not writable; add the block by hand (wp tk headers-setup --print-htaccess).' );
			}
			tk_pc_put( $path, $after );
		}

		WP_CLI::success( $dry_run ? 'Dry run complete. Nothing was written.' : ( $remove ? 'Security headers block removed.' : 'Security headers set up.' ) );
	}

	/**
	 * Delete every cached page (wp-content/cache/tk-page/, its .htaccess stays). Idempotent.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : List the files that would be deleted.
	 *
	 * @subcommand cache-purge
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function cache_purge( $args, $assoc_args ) {
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$files   = tk_pc_purge( $dry_run );

		foreach ( $files as $file ) {
			WP_CLI::log( ( $dry_run ? '[would delete] ' : '[deleted] ' ) . $file );
		}

		$pages = count( array_filter( $files, static fn( $f ) => '.html' === substr( $f, -5 ) ) );

		if ( $dry_run ) {
			WP_CLI::success( sprintf( 'Dry run: %d cached pages (%d files) would be deleted. Nothing was written.', $pages, count( $files ) ) );
			return;
		}

		WP_CLI::success( $files ? sprintf( 'Purged %d cached pages (%d files).', $pages, count( $files ) ) : 'Cache already empty.' );
	}

	/**
	 * Render every public page and post through the web server so
	 * WordPress writes its static file, then check that the server really answers from the cache.
	 *
	 * Uses real HTTP requests (curl, parallel) with the warm header, so the files are exactly what a
	 * visitor gets. Locally the requests go to the web container (TK_PAGE_CACHE_CONNECT_TO).
	 *
	 * ## OPTIONS
	 *
	 * [--concurrency=<n>]
	 * : Parallel requests.
	 * ---
	 * default: 4
	 * ---
	 *
	 * [--skip-verify]
	 * : Skip the final check that every URL is now served from the cache.
	 *
	 * [--dry-run]
	 * : List the URLs and their cache files without requesting anything.
	 *
	 * @subcommand cache-warm
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function cache_warm( $args, $assoc_args ) {
		$dry_run = (bool) WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$cfg     = tk_pc_config();

		if ( 'off' === $cfg['mode'] && ! $dry_run ) {
			WP_CLI::error( 'The page cache is off. Run `wp tk cache-setup` first.' );
		}

		$warm = tk_pc_warm(
			array(
				'concurrency' => max( 1, (int) $assoc_args['concurrency'] ),
				'dry_run'     => $dry_run,
			)
		);

		if ( $dry_run ) {
			foreach ( $warm['urls'] as $u ) {
				WP_CLI::log( sprintf( '[%s] %s -> %s', is_file( tk_pc_dir() . '/' . $u['file'] ) ? 'cached' : 'empty ', $u['path'], $u['file'] ) );
			}
			WP_CLI::success( sprintf( 'Dry run: %d URLs would be warmed. Nothing was requested.', count( $warm['urls'] ) ) );
			return;
		}

		$failed = 0;

		foreach ( $warm['urls'] as $i => $u ) {
			$r     = isset( $warm['results'][ $i ] ) ? $warm['results'][ $i ] : array( 'status' => 0, 'headers' => array(), 'time' => 0, 'error' => 'no result' );
			$state = isset( $r['headers']['x-tk-cache'] ) ? $r['headers']['x-tk-cache'] : '-';
			$ok    = 200 === $r['status'] && 'STORED' === $state;
			$failed += $ok ? 0 : 1;
			WP_CLI::log( sprintf( '%s %-44s %3d %-22s %4d ms%s', $ok ? '[stored]' : '[FAILED]', $u['path'], $r['status'], $state, round( $r['time'] * 1000 ), '' !== $r['error'] ? ' ' . $r['error'] : '' ) );
		}

		if ( $failed ) {
			WP_CLI::error( sprintf( '%d of %d URLs were not stored.', $failed, count( $warm['urls'] ) ) );
		}

		if ( WP_CLI\Utils\get_flag_value( $assoc_args, 'skip-verify', false ) ) {
			WP_CLI::success( sprintf( 'Warmed %d URLs.', count( $warm['urls'] ) ) );
			return;
		}

		// Ask again like a visitor would: the answer must now come from the cache.
		$probe = array();
		foreach ( $warm['urls'] as $u ) {
			$probe[] = array(
				'url'     => $u['url'],
				'headers' => array( 'Accept-Encoding: gzip' ),
			);
		}
		$hits      = array();
		$bare      = 0;
		$want_cc   = tk_pc_cache_control( $cfg['edge_ttl'] );
		foreach ( tk_pc_http_multi( $probe, (int) $assoc_args['concurrency'] ) as $i => $r ) {
			$state = isset( $r['headers']['x-tk-cache'] ) ? $r['headers']['x-tk-cache'] : '-';
			$enc   = isset( $r['headers']['content-encoding'] ) ? $r['headers']['content-encoding'] : '';
			$type  = isset( $r['headers']['content-type'] ) ? $r['headers']['content-type'] : '';
			$cc    = isset( $r['headers']['cache-control'] ) ? $r['headers']['cache-control'] : '';
			$path  = $warm['urls'][ $i ]['path'];
			$hits[ $state ] = ( isset( $hits[ $state ] ) ? $hits[ $state ] : 0 ) + 1;
			if ( '-' === $state && 200 === $r['status'] ) {
				// WordPress always sends X-TK-Cache, so a 200 without it is the server answering from the
				// file while ignoring the cache directory's .htaccess headers (OpenLiteSpeed does that):
				// no Cache-Control / Vary, and an edge proxy would apply its own default TTL.
				++$bare;
				WP_CLI::warning( sprintf( '%s: served without the cache headers (Cache-Control "%s", no X-TK-Cache).', $path, $cc ) );
			} elseif ( 0 !== strpos( $state, 'HIT' ) || 200 !== $r['status'] || false === stripos( $type, 'text/html' ) ) {
				WP_CLI::warning( sprintf( '%s answers %d, X-TK-Cache "%s", Content-Type "%s": not served from the cache.', $path, $r['status'], $state, $type ) );
			} elseif ( $cc !== $want_cc ) {
				++$bare;
				WP_CLI::warning( sprintf( '%s: Cache-Control "%s", expected "%s".', $path, $cc, $want_cc ) );
			} elseif ( $cfg['precompressed'] && 'gzip' !== $enc && 'br' !== $enc ) {
				WP_CLI::warning( sprintf( '%s: a gzip request got Content-Encoding "%s". If the body is gzip anyway, the server ignores the cache directory .htaccess: run `wp tk cache-setup --mode=php`.', $path, $enc ) );
			}
		}

		if ( $bare ) {
			WP_CLI::error( sprintf( '%d of %d URLs lack the cache headers: this server ignores Header/AddType/AddEncoding in wp-content/cache/tk-page/.htaccess (e.g. OpenLiteSpeed). Run `wp tk cache-setup --mode=php` (the PHP drop-in serves the same files with every header) and warm again.', $bare, count( $warm['urls'] ) ) );
		}

		ksort( $hits );
		WP_CLI::success(
			sprintf(
				'Warmed %d URLs. Served back as: %s.%s',
				count( $warm['urls'] ),
				implode( ', ', array_map( static fn( $k, $v ) => $k . ' ×' . $v, array_keys( $hits ), $hits ) ),
				isset( $hits['HIT'] ) ? '' : ( isset( $hits['HIT-PHP'] ) ? ' (the .htaccess rules are not active here; the PHP drop-in serves the cache)' : '' )
			)
		);
	}

	/**
	 * Report the page cache state. Read-only.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 * ---
	 *
	 * @subcommand cache-status
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 */
	public function cache_status( $args, $assoc_args ) {
		$cfg    = tk_pc_config();
		$dropin = WP_CONTENT_DIR . '/advanced-cache.php';
		$ht     = is_readable( tk_pc_htaccess_path() ) ? (string) file_get_contents( tk_pc_htaccess_path() ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$files  = tk_pc_files();
		$urls   = tk_pc_urls();
		$cached = count( array_filter( $urls, static fn( $u ) => is_file( tk_pc_dir() . '/' . $u['file'] ) ) );
		$stamp  = is_readable( tk_pc_dir() . '/.ht-stamp' ) ? trim( (string) file_get_contents( tk_pc_dir() . '/.ht-stamp' ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$last   = get_option( 'tk_page_cache_last_warm', array() );
		$want   = 'rewrite' === $cfg['mode'] ? tk_pc_htaccess_with_block( $ht, tk_pc_htaccess_lines( $cfg ) ) : $ht;
		$rows   = array(
			$this->row( 'Mode', $cfg['mode'] ),
			$this->row( 'Host', '' === $cfg['host'] ? 'any' : $cfg['host'] ),
			$this->row( 'Edge TTL (s-maxage)', $cfg['edge_ttl'] ),
			$this->row( 'Precompressed', $cfg['precompressed'] ? 'gzip' . ( function_exists( 'brotli_compress' ) ? ' + br' : ' (no ext-brotli: no .br)' ) : 'no' ),
			$this->row( 'WP_CACHE', defined( 'WP_CACHE' ) && WP_CACHE ? 'true' : 'not set (drop-in not loaded)' ),
			$this->row( 'Drop-in', is_readable( $dropin ) ? ( false !== strpos( (string) file_get_contents( $dropin ), TK_PC_MARKER . ' drop-in' ) ? ( file_get_contents( $dropin ) === tk_pc_dropin_source( $cfg ) ? 'ours, current' : 'ours, outdated (run cache-setup)' ) : 'another plugin\'s' ) : 'none' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$this->row( '.htaccess block', false !== strpos( $ht, '# BEGIN ' . TK_PC_MARKER ) ? ( $want === $ht ? 'present, current' : 'present, outdated (run cache-setup)' ) : 'absent' ),
			$this->row( 'Cache dir', tk_pc_dir() . ( is_dir( tk_pc_dir() ) ? ( wp_is_writable( tk_pc_dir() ) ? ' (writable)' : ' (NOT writable)' ) : ' (missing)' ) ),
			$this->row( 'Stamp', '' === $stamp ? 'none' : ( tk_pc_current_stamp() === $stamp ? 'matches this site and build' : 'MISMATCH (purged on the next WordPress request)' ) ),
			$this->row( 'Cached URLs', sprintf( '%d of %d (%d files)', $cached, count( $urls ), count( $files ) ) ),
			$this->row(
				'Never cached',
				implode(
					', ',
					array_map(
						static fn( $p ) => sprintf( '%s (%s%s)', $p['path'], $p['reason'], $p['stale'] ? '; stale file on disk, never served — cache-purge removes it' : '' ),
						tk_pc_nocache_pages()
					)
				) ?: 'none published'
			),
			$this->row( 'Last warm', ! empty( $last['time'] ) ? wp_date( 'Y-m-d H:i:s', $last['time'] ) . sprintf( ' (%d/%d stored)', $last['stored'], $last['urls'] ) : 'never' ),
		);

		WP_CLI\Utils\format_items( $assoc_args['format'], $rows, array( 'check', 'value' ) );
	}



	/**
	 * Plugin state for doctor: "active 1.2.3", "inactive 1.2.3" or "not installed".
	 *
	 * @param string $slug Plugin directory name.
	 * @return string
	 */
	private function plugin_state( $slug ) {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		foreach ( get_plugins() as $file => $data ) {
			if ( 0 === strpos( $file, $slug . '/' ) ) {
				return ( is_plugin_active( $file ) ? 'active ' : 'inactive ' ) . $data['Version'];
			}
		}

		return 'not installed';
	}

	/**
	 * Decode a JSON file or stop with an error.
	 *
	 * @param string $file Path.
	 * @return array
	 */
	private function read_json( $file ) {
		if ( ! is_readable( $file ) ) {
			WP_CLI::error( sprintf( 'Not readable: %s', $file ) );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local CLI build tool.
		$data = json_decode( (string) file_get_contents( $file ), true );

		if ( ! is_array( $data ) ) {
			WP_CLI::error( sprintf( 'Invalid JSON in %s: %s', $file, json_last_error_msg() ) );
		}

		return $data;
	}

	/**
	 * Write one validated definition.
	 *
	 * @param array $def     Normalised definition from read_definition().
	 * @param bool  $dry_run Report only.
	 * @return string create|update|ok
	 */
	private function upsert_page( $def, $dry_run ) {
		$encoded  = wp_json_encode( $def['elements'] );
		$existing = get_page_by_path( $def['slug'], OBJECT, 'page' );
		$meta     = array(
			'_elementor_data'          => $encoded,
			'_elementor_edit_mode'     => 'builder',
			'_elementor_template_type' => 'wp-page',
			'_wp_page_template'        => $def['template'],
			'_tk_scripts'              => $def['scripts'],
			'_tk_preload'              => $def['preload'],
		);
		// An unchanged page is not written at all, so post_modified (the sitemap's <lastmod>) moves only
		// when the page really changed. _elementor_version alone (an Elementor update) is refreshed without
		// touching the post: the content is the same.
		$diff   = $existing ? $this->page_diff( $existing, $def, $meta ) : array( 'new' );
		$status = $existing ? ( $diff ? '[update]' : '[ok]    ' ) : '[create]';

		WP_CLI::log(
			sprintf(
				'%s %-34s scripts=%-14s %s%s',
				$status,
				$def['slug'],
				$def['scripts'] ? implode( ',', $def['scripts'] ) : '-',
				size_format( strlen( $encoded ) ),
				$existing && $diff ? ' (' . implode( ', ', $diff ) . ')' : ''
			)
		);

		$result = $existing ? ( $diff ? 'update' : 'ok' ) : 'create';

		if ( $dry_run ) {
			return $result;
		}

		if ( $existing && ! $diff ) {
			$page_id = $existing->ID;
			if ( (string) get_post_meta( $page_id, '_elementor_version', true ) !== ELEMENTOR_VERSION ) {
				update_post_meta( $page_id, '_elementor_version', ELEMENTOR_VERSION );
			}
		} else {
			$postarr = array(
				'post_type'    => 'page',
				'post_title'   => $def['title'],
				'post_name'    => $def['slug'],
				'post_status'  => $def['status'],
				'post_content' => '',
			);

			if ( $existing ) {
				$this->backup_elementor_data( $existing->ID, $def['slug'] );
				$postarr['ID'] = $existing->ID;
				$page_id       = wp_update_post( $postarr, true );
			} else {
				$page_id = wp_insert_post( $postarr, true );
			}

			if ( is_wp_error( $page_id ) ) {
				WP_CLI::error( $page_id->get_error_message() );
			}

			foreach ( $meta as $key => $value ) {
				if ( array() === $value && '_tk_preload' === $key ) {
					delete_post_meta( $page_id, $key );
					continue;
				}
				update_post_meta( $page_id, $key, is_string( $value ) ? wp_slash( $value ) : $value );
			}
			update_post_meta( $page_id, '_elementor_version', ELEMENTOR_VERSION );

			// Elementor caches per-post CSS in a file; drop it so the page is regenerated.
			if ( class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
				( new \Elementor\Core\Files\CSS\Post( $page_id ) )->delete();
			}
		}

		if ( $def['front_page'] ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $page_id );
		}

		// WordPress links its own privacy features (and the login screen) to this page.
		if ( 'zasady-ochrany-osobnich-udaju' === $def['slug'] || 'ochrana-osobnich-udaju' === $def['slug'] ) {
			update_option( 'wp_page_for_privacy_policy', $page_id );
		}

		return $result;
	}

	/**
	 * What differs between an existing page and its definition post fields and our meta.
	 *
	 * @param WP_Post $post Existing page.
	 * @param array   $def  Normalised definition.
	 * @param array   $meta Meta key => wanted value (_tk_preload: array() = absent).
	 * @return string[] Names of the differing fields, empty when the page is up to date.
	 */
	private function page_diff( $post, $def, $meta ) {
		$diff = array();

		foreach ( array(
			'post_title'   => $def['title'],
			'post_status'  => $def['status'],
			'post_content' => '',
		) as $field => $want ) {
			if ( (string) $post->$field !== (string) $want ) {
				$diff[] = $field;
			}
		}

		foreach ( $meta as $key => $want ) {
			$exists = metadata_exists( 'post', $post->ID, $key );
			$have   = get_post_meta( $post->ID, $key, true );

			$differs = ( '_tk_preload' === $key && array() === $want ) ? $exists : ( ! $exists || $have !== $want );

			if ( $differs ) {
				$diff[] = $key;
			}
		}

		return $diff;
	}

	/**
	 * Read, decode and validate a page definition.
	 *
	 * @param string $file Path to the JSON file.
	 * @return array Normalised definition.
	 */
	private function read_definition( $file ) {
		$parsed = $this->read_json( $file );

		foreach ( array( 'slug', 'title', 'elements' ) as $required ) {
			if ( ! isset( $parsed[ $required ] ) ) {
				WP_CLI::error( sprintf( '%s: missing required key "%s".', $file, $required ) );
			}
		}

		if ( ! is_array( $parsed['elements'] ) || empty( $parsed['elements'] ) ) {
			WP_CLI::error( sprintf( '%s: "elements" must be a non-empty array.', $file ) );
		}

		$slug = sanitize_title( $parsed['slug'] );

		if ( '' === $slug || $slug !== $parsed['slug'] ) {
			WP_CLI::error( sprintf( '%s: "%s" is not a clean slug.', $file, $parsed['slug'] ) );
		}

		$status = isset( $parsed['status'] ) ? $parsed['status'] : 'publish';

		if ( ! in_array( $status, array( 'publish', 'draft', 'private' ), true ) ) {
			WP_CLI::error( sprintf( '%s: unsupported status "%s".', $file, $status ) );
		}

		$template = isset( $parsed['template'] ) ? $parsed['template'] : 'elementor_header_footer';

		if ( ! in_array( $template, array( 'elementor_header_footer', 'elementor_canvas', 'default' ), true ) ) {
			WP_CLI::error( sprintf( '%s: unsupported template "%s".', $file, $template ) );
		}

		$scripts = isset( $parsed['scripts'] ) ? (array) $parsed['scripts'] : array();
		$unknown = array_diff( $scripts, self::SCRIPTS );

		if ( $unknown ) {
			WP_CLI::error( sprintf( '%s: unknown scripts %s.', $file, implode( ', ', $unknown ) ) );
		}

		$this->assert_unique_element_ids( $parsed['elements'] );

		// Images the theme preloads in <head> (a CSS-background LCP photo the preload scanner cannot see).
		$preload = isset( $parsed['preload'] ) ? array_values( (array) $parsed['preload'] ) : array();

		// Or { src, sizes } — a responsive preload; the theme adds the <img>'s srcset at print time.
		$upload = '~^/wp-content/uploads/[a-z0-9][a-z0-9._-]*\.(?:webp|avif|jpe?g|png)$~';

		foreach ( $preload as $entry ) {
			$ok = is_string( $entry )
				? (bool) preg_match( $upload, $entry )
				: ( is_array( $entry ) && array( 'src', 'sizes' ) === array_keys( $entry ) && is_string( $entry['src'] ) && preg_match( $upload, $entry['src'] )
					&& is_string( $entry['sizes'] ) && preg_match( '~^[a-z0-9 (),:.%-]{1,200}$~i', $entry['sizes'] ) );

			if ( ! $ok ) {
				WP_CLI::error( sprintf( '%s: preload entries must be /wp-content/uploads/<file> image paths or { "src": <such a path>, "sizes": <sizes> }.', $file ) );
			}
		}

		return array(
			'slug'       => $slug,
			'title'      => (string) $parsed['title'],
			'status'     => $status,
			'template'   => $template,
			'scripts'    => array_values( $scripts ),
			'front_page' => ! empty( $parsed['front_page'] ),
			'preload'    => $preload,
			'elements'   => $parsed['elements'],
		);
	}

	/**
	 * Elementor keys everything off element ids; duplicates corrupt the editor silently.
	 *
	 * @param array $elements Element tree.
	 * @param array $seen     Ids already encountered.
	 * @return array
	 */
	private function assert_unique_element_ids( $elements, $seen = array() ) {
		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) || ! isset( $element['id'], $element['elType'] ) ) {
				WP_CLI::error( 'Every element needs an "id" and an "elType".' );
			}

			if ( isset( $seen[ $element['id'] ] ) ) {
				WP_CLI::error( sprintf( 'Duplicate element id "%s".', $element['id'] ) );
			}

			$seen[ $element['id'] ] = true;

			if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
				$seen = $this->assert_unique_element_ids( $element['elements'], $seen );
			}
		}

		return $seen;
	}

	/**
	 * Copy a page's current Elementor data to /backups/layouts/ before overwriting it.
	 *
	 * @param int    $page_id Page being overwritten.
	 * @param string $slug    Page slug, used in the file name.
	 */
	private function backup_elementor_data( $page_id, $slug ) {
		$current = get_post_meta( $page_id, '_elementor_data', true );

		if ( ! is_string( $current ) || '' === $current ) {
			return;
		}

		// /backups is the repo's backups/ mounted writable in the CLI container. Elsewhere: temp dir, never uploads.
		$dir = is_dir( '/backups' ) ? '/backups/layouts' : trailingslashit( get_temp_dir() ) . 'tk-layouts';

		if ( ! wp_mkdir_p( $dir ) ) {
			WP_CLI::warning( 'Could not create the backup directory; continuing without a backup.' );
			return;
		}

		$path = sprintf( '%s/%s-%d-%s.json', $dir, $slug, $page_id, gmdate( 'Ymd-His' ) );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- local CLI build tool.
		if ( false === file_put_contents( $path, $current ) ) {
			WP_CLI::warning( 'Backup write failed; continuing.' );
		}
	}

	/**
	 * Overwrite an attachment's file with a new, already converted one and regenerate its sizes. The
	 * attachment keeps its ID, file name and URL (what the page markup references). The new file is
	 * copied next to the old one and renamed over it, so the old file stays intact until the new one
	 * is complete; intermediate sizes of the old file are removed only after that.
	 *
	 * @param int    $id  Attachment ID.
	 * @param string $new Path of the new file (left in place; the caller removes it).
	 * @return true|WP_Error
	 */
	private function replace_attachment_file( $id, $new ) {
		$file = get_attached_file( $id );

		if ( ! $file || ! is_file( $file ) ) {
			return new WP_Error( 'tk_replace', 'Attached file not found.' );
		}

		$staged = $file . '.tk-new';

		if ( ! @copy( $new, $staged ) || ! @rename( $staged, $file ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rename_rename
			@unlink( $staged ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			return new WP_Error( 'tk_replace', 'Could not write the new file.' );
		}

		$old  = wp_get_attachment_metadata( $id );
		$dir  = dirname( $file );
		$keep = wp_basename( $file );

		if ( is_array( $old ) && ! empty( $old['sizes'] ) ) {
			foreach ( $old['sizes'] as $size ) {
				if ( ! empty( $size['file'] ) && $size['file'] !== $keep ) {
					wp_delete_file( $dir . '/' . wp_basename( $size['file'] ) );
				}
			}
		}

		$meta = wp_generate_attachment_metadata( $id, $file );

		if ( is_wp_error( $meta ) || empty( $meta ) ) {
			return new WP_Error( 'tk_replace', 'File replaced, but its metadata could not be regenerated.' );
		}

		wp_update_attachment_metadata( $id, $meta );

		return true;
	}

	/**
	 * media-import --files-dir: import every regular file of $dir unchanged, keeping its name (flat uploads, so
	 * /wp-content/uploads/<name>). No WebP conversion, no image sub-sizes, no "-scaled" copy: these are downloads.
	 * The file types must be allowed by WordPress (.docx, .pdf, .jpg … are by default; .docx is pinned below).
	 * Idempotent by content: same md5 -> "[ok]", different -> overwritten in place ("[replace]").
	 *
	 * @param string $dir     Source directory.
	 * @param bool   $dry_run Report only.
	 */
	private function import_files_as_is( $dir, $dry_run ) {
		if ( ! is_dir( $dir ) ) {
			WP_CLI::warning( sprintf( 'Files directory %s not found: no downloads imported.', $dir ) );
			return;
		}

		$mimes = static function ( $m ) {
			$m['docx'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
			return $m;
		};
		$no_sizes = static fn() => array();
		add_filter( 'upload_mimes', $mimes );
		add_filter( 'intermediate_image_sizes_advanced', $no_sizes );
		add_filter( 'big_image_size_threshold', '__return_false' );

		$counts = array( 'imported' => 0, 'replaced' => 0, 'unchanged' => 0 );

		foreach ( (array) scandir( $dir ) as $name ) {
			$path = $dir . '/' . $name;
			if ( '.' === $name[0] || ! is_file( $path ) || 'README.md' === $name ) {
				continue;
			}

			if ( sanitize_file_name( $name ) !== $name ) {
				WP_CLI::warning( sprintf( '%s: not a clean file name (would become "%s"); skipped.', $name, sanitize_file_name( $name ) ) );
				continue;
			}

			$type = wp_check_filetype( $name );
			if ( empty( $type['type'] ) ) {
				WP_CLI::warning( sprintf( '%s: file type not allowed for uploads; skipped.', $name ) );
				continue;
			}

			$existing = $this->find_attachment_by_file( $name );
			$current  = $existing ? get_attached_file( $existing ) : '';
			$same     = $current && is_file( $current ) && md5_file( $current ) === md5_file( $path );
			$action   = $existing ? ( $same ? 'ok' : 'replace' ) : 'import';

			WP_CLI::log( sprintf( '[%s] %s -> /wp-content/uploads/%s (%s, as-is)', $action, $name, $name, $type['type'] ) );

			if ( $dry_run || $same ) {
				$same && ++$counts['unchanged'];
				continue;
			}

			if ( $existing ) {
				$staged = $current . '.tk-new';
				if ( ! @copy( $path, $staged ) || ! @rename( $staged, $current ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rename_rename
					@unlink( $staged ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
					WP_CLI::warning( sprintf( '%s: could not overwrite the existing upload (kept).', $name ) );
					continue;
				}
				wp_update_attachment_metadata( $existing, wp_generate_attachment_metadata( $existing, $current ) );
				update_post_meta( $existing, '_tk_source_hash', md5_file( $path ) );
				++$counts['replaced'];
				continue;
			}

			// media_handle_sideload() moves the temporary file: hand it a copy.
			$tmp = wp_tempnam( $name );
			if ( ! $tmp || ! copy( $path, $tmp ) ) {
				WP_CLI::warning( sprintf( '%s: could not stage the file.', $name ) );
				continue;
			}

			$id = media_handle_sideload(
				array(
					'name'     => $name,
					'tmp_name' => $tmp,
				),
				0,
				preg_replace( '/\.[^.]+$/', '', $name )
			);

			if ( is_wp_error( $id ) ) {
				@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				WP_CLI::warning( sprintf( '%s: %s', $name, $id->get_error_message() ) );
				continue;
			}

			update_post_meta( $id, '_tk_source_file', $name );
			update_post_meta( $id, '_tk_source_hash', md5_file( $path ) );
			++$counts['imported'];

			$stored = (string) get_post_meta( $id, '_wp_attached_file', true );
			if ( $stored !== $name ) {
				WP_CLI::warning( sprintf( '%s was stored as %s (a file of that name already exists in uploads); the URL differs.', $name, $stored ) );
			}
		}

		remove_filter( 'upload_mimes', $mimes );
		remove_filter( 'intermediate_image_sizes_advanced', $no_sizes );
		remove_filter( 'big_image_size_threshold', '__return_false' );

		WP_CLI::log( $dry_run ? 'Files: dry run, nothing written.' : vsprintf( 'Files: %d imported, %d replaced, %d unchanged.', array_values( $counts ) ) );
	}

	/**
	 * Attachment whose upload-relative file is exactly $file, or 0.
	 *
	 * @param string $file e.g. daniel.webp.
	 * @return int
	 */
	private function find_attachment_by_file( $file ) {
		global $wpdb;

		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file' AND meta_value = %s LIMIT 1", $file ) );
	}

	/**
	 * Resize to the long-edge limit and re-encode as WebP into a temporary file.
	 *
	 * @param string $path     Source image.
	 * @param int    $max_edge Longest side in px.
	 * @param int    $quality  WebP quality 1–100.
	 * @return string|WP_Error Temporary file path.
	 */
	private function convert_to_webp( $path, $max_edge, $quality ) {
		$staged = null;

		// GD cannot encode palette PNGs (the two logos) as WebP: promote them to truecolor first.
		if ( function_exists( 'imagecreatefrompng' ) && preg_match( '/\.png$/i', $path ) ) {
			$im = @imagecreatefrompng( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

			if ( $im && ! imageistruecolor( $im ) ) {
				imagepalettetotruecolor( $im );
				imagealphablending( $im, false );
				imagesavealpha( $im, true );

				$staged = wp_tempnam( 'tk-truecolor' ) . '.png';

				if ( ! imagepng( $im, $staged ) ) {
					$staged = null;
				}
			}

			if ( $im ) {
				imagedestroy( $im );
			}
		}

		$editor = wp_get_image_editor( $staged ? $staged : $path );

		if ( $staged ) {
			@unlink( $staged ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}

		if ( is_wp_error( $editor ) ) {
			return $editor;
		}

		$size = $editor->get_size();

		if ( max( (int) $size['width'], (int) $size['height'] ) > $max_edge ) {
			$resized = $editor->resize( $max_edge, $max_edge, false );

			if ( is_wp_error( $resized ) ) {
				return $resized;
			}
		}

		$editor->set_quality( $quality );

		$tmp = wp_tempnam( 'tk-webp' );

		if ( ! $tmp ) {
			return new WP_Error( 'tk_tmp', 'Could not create a temporary file.' );
		}

		$saved = $editor->save( $tmp, 'image/webp' );

		if ( is_wp_error( $saved ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			return $saved;
		}

		if ( $saved['path'] !== $tmp ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}

		return $saved['path'];
	}

	/**
	 * Run as the first administrator (media sideloads and some plugin APIs check capabilities).
	 */
	private function act_as_admin() {
		if ( is_user_logged_in() ) {
			return;
		}

		$admins = get_users(
			array(
				'role'   => 'administrator',
				'number' => 1,
				'fields' => 'ID',
			)
		);

		if ( $admins ) {
			wp_set_current_user( (int) $admins[0] );
		}
	}

	/**
	 * Run a WP-CLI command in its own process and capture its output.
	 *
	 * @param string $command Command without the leading "wp".
	 * @return object {stdout, stderr, return_code}
	 */
	private function run( $command ) {
		return WP_CLI::runcommand(
			$command,
			array(
				'return'     => 'all',
				'exit_error' => false,
				'launch'     => true,
			)
		);
	}

	/**
	 * Read the admin credentials env file (KEY=value lines).
	 *
	 * @param string $file Path.
	 * @return array<string,string>
	 */
	private function read_secrets( $file ) {
		if ( ! is_readable( $file ) ) {
			WP_CLI::error( sprintf( 'Not readable: %s (needs WP_URL, WP_ADMIN_USER, WP_ADMIN_PASSWORD, WP_ADMIN_EMAIL).', $file ) );
		}

		$out = array();
		foreach ( (array) file( $file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) as $line ) {
			if ( preg_match( '/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/', (string) $line, $m ) ) {
				$out[ $m[1] ] = trim( $m[2], "\"'" );
			}
		}

		foreach ( array( 'WP_URL', 'WP_ADMIN_USER', 'WP_ADMIN_PASSWORD', 'WP_ADMIN_EMAIL' ) as $key ) {
			if ( empty( $out[ $key ] ) ) {
				WP_CLI::error( sprintf( '%s is missing in %s.', $key, $file ) );
			}
		}

		return $out;
	}

	/**
	 * Shape a doctor row.
	 *
	 * @param string $check Label.
	 * @param string $value Value.
	 * @return array
	 */
	private function row( $check, $value ) {
		return array(
			'check' => $check,
			'value' => (string) $value,
		);
	}
}

WP_CLI::add_command( 'tk', 'TK_Build_Command' );
