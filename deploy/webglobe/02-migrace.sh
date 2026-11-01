#!/usr/bin/env bash
# 02 — Migrace: nový web z balíku do stávajícího WordPressu. Běží pod údržbou; při chybě se zastaví a údržba zůstane
# zapnutá (návrat: 09-navrat.sh, nebo oprava a nové spuštění — každý krok je idempotentní).
#   bash $D/bundle/deploy/webglobe/02-migrace.sh --dry-run   jen kontroly a výpis, co by se stalo
#   bash $D/bundle/deploy/webglobe/02-migrace.sh             ostře
# Předpoklad: 00 přečtený Claudem, 01 hotová (záloha v $B).
. "$(dirname "$0")/tk-env.sh"
set -o pipefail
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

# Pluginy, které se s novým webem tlučou (vlastní page cache / minifikace / přesměrování 404 / Google Analytics bez
# souhlasu — GA vkládá Site Kit, blokovaný Complianzem do souhlasu): vypnout, nemazat.
CONFLICTING="google-analytics-for-wordpress google-analytics-dashboard-for-wp litespeed-cache wp-rocket w3-total-cache wp-super-cache wp-fastest-cache autoptimize sg-cachepress wp-optimize breeze hummingbird-performance cache-enabler comet-cache swift-performance-lite all-404-redirect-to-homepage redirect-404-to-homepage"

say "Kontroly před migrací"
[ -f "$W/wp-config.php" ] || stop "V $W není wp-config.php."
sums_ok "$BUNDLE" MANIFEST.sha256 || stop "Balík neodpovídá MANIFEST.sha256."
[ -e "$BUNDLE/wp-content/mu-plugins/tk-local.php" ] && stop "tk-local.php v balíku."
ok "balík $(cat "$BUNDLE/REVISION")"
[ -f "$B/SHA256SUMS" ] || stop "Chybí záloha ($B/SHA256SUMS). Nejdřív 01-zaloha.sh."
sums_ok "$B" SHA256SUMS || stop "Záloha v $B neodpovídá SHA256SUMS."
ok "záloha $B ($(grep '^date:' "$B/soupis.txt"))"
"$PHP" -r 'exit(version_compare(PHP_VERSION, "8.2", ">=") ? 0 : 1);' || stop "$PHP je starší než 8.2."
# Webglobe zapisuje do wp-config.php adresu z hlavičky Host ("http" . … . $_SERVER["HTTP_HOST"] . "/"): web by
# odpovídal na jakékoli jméno (www, IP) a WP-CLI vidí jen "http:". Nahradit pevnou adresou H.
if grep -qE "define\( *'WP_(HOME|SITEURL)'.*HTTP_HOST" "$W/wp-config.php"; then
  if [ $DRY -eq 1 ]; then
    warn "wp-config.php: WP_HOME/WP_SITEURL z HTTP_HOST — ostrý běh je nastaví na $H"
  else
    sed -i -E "s#^define\( *'WP_HOME',.*HTTP_HOST.*\);#define( 'WP_HOME', '$H' );#; s#^define\( *'WP_SITEURL',.*HTTP_HOST.*\);#define( 'WP_SITEURL', '$H' );#" "$W/wp-config.php"
    grep -qE "HTTP_HOST" "$W/wp-config.php" && stop "WP_HOME/WP_SITEURL se nepodařilo nahradit."
    "$PHP" "$WPCLI" --path="$W" option update home "$H" >/dev/null
    "$PHP" "$WPCLI" --path="$W" option update siteurl "$H" >/dev/null
    ok "wp-config.php: WP_HOME = WP_SITEURL = $H (volby home/siteurl taky)"
  fi
fi
[ $DRY -eq 1 ] && grep -qE "HTTP_HOST" "$W/wp-config.php" && HOME_NOW=$H || HOME_NOW=$(wp option get home)
[ "$HOME_NOW" = "$H" ] || stop "home je '$HOME_NOW', čeká se '$H' (upravit H nebo adresu webu)."
if [ -f "$W/wp-content/advanced-cache.php" ] && ! grep -q 'TK Page Cache\|tk-page-cache\|TK_PAGE_CACHE' "$W/wp-content/advanced-cache.php"; then
  ACP=$(head -c 400 "$W/wp-content/advanced-cache.php" | tr '\n' ' ')
  warn "advanced-cache.php patří jinému pluginu: $ACP"
  warn "vypne se s pluginem v kroku 3; pokud tam zůstane, cache-setup ho nepřepíše (pak jen HIT-PHP nebude)"
fi
P=$(wp db prefix)
S=$(our_slugs | sed "s/.*/'&'/" | paste -sd, -)
CLASH=$(wp db query "SELECT CONCAT(ID,' ',post_type,' ',post_name) FROM ${P}posts WHERE post_name IN ($S) AND post_type NOT IN ('page','revision','nav_menu_item')" --skip-column-names)
[ -z "$CLASH" ] || stop "Slug nové stránky drží jiný typ obsahu (stránka by dostala -2): $CLASH"
ok "žádná kolize slugů s jiným typem obsahu"

OLD=$(wp db query "SELECT ID FROM ${P}posts WHERE post_type IN ('page','post') AND post_status='publish' AND post_name NOT IN ($S)" --skip-column-names | paste -sd' ' -)
echo "starý publikovaný obsah, který půjde do konceptu: ${OLD:-žádný}"
[ -n "$OLD" ] && wp post list --post_type=page,post --post__in="$(echo "$OLD" | tr ' ' ',')" --fields=ID,post_type,post_name,post_title
ACTIVE_CONFLICT=""
for p in $CONFLICTING; do wp plugin is-active "$p" 2>/dev/null && ACTIVE_CONFLICT="$ACTIVE_CONFLICT $p"; done
echo "konfliktní pluginy k vypnutí:${ACTIVE_CONFLICT:- žádné}"
for f in robots.txt llms.txt sitemap.xml; do [ -e "$W/$f" ] && echo "statický $f v kořeni webu se přesune do $B/root-moved/"; done

if [ $DRY -eq 1 ]; then
  say "Nanečisto: site-setup"
  W_CLASS="$BUNDLE/wp-content/mu-plugins/tk-build/class-tk-build-command.php"
  "$PHP" "$WPCLI" --path="$W" --require="$W_CLASS" tk site-setup --dry-run --allow-non-local
  say "Nanečisto hotovo, nic se nezměnilo."
  exit 0
fi

say "1. Údržba"
echo '<?php $upgrading = time(); ?>' > "$W/.maintenance"   # time() při každém požadavku: platí, dokud se nesmaže
ok "údržba zapnutá ($W/.maintenance); WP-CLI pod ní funguje"

say "2. wp-config.php"
wp config set WP_ENVIRONMENT_TYPE production || stop "config set"
wp config set WP_CACHE true --raw || stop "config set"
wp config set DISALLOW_FILE_EDIT true --raw || stop "config set"
MEM=$(wp eval 'echo (int) wp_convert_hr_to_bytes( WP_MEMORY_LIMIT );')
[ "${MEM:-0}" -lt 134217728 ] && { wp config set WP_MEMORY_LIMIT 128M || stop "config set"; }
grep -nE "WP_ENVIRONMENT_TYPE|WP_CACHE|DISALLOW_FILE_EDIT|WP_MEMORY_LIMIT" "$W/wp-config.php"

say "3. Konfliktní pluginy vypnout"
for p in $ACTIVE_CONFLICT; do wp plugin deactivate "$p" && echo "$p" >> "$B/plugins-deactivated.txt"; done
[ -z "$ACTIVE_CONFLICT" ] && ok "žádné"
if [ -f "$W/wp-content/advanced-cache.php" ] && ! grep -q 'TK_PAGE_CACHE\|tk-page-cache' "$W/wp-content/advanced-cache.php"; then
  mkdir -p "$B/moved"; mv "$W/wp-content/advanced-cache.php" "$B/moved/advanced-cache.php" && ok "cizí advanced-cache.php přesunut do $B/moved/"
fi
# LiteSpeed Cache po vypnutí nechává v .htaccess bloky LSCACHE / NON_LSCACHE (CacheLookup on = serverová cache LiteSpeedu
# by dál ukládala HTML mimo naši page cache). Odstranit; původní .htaccess je v záloze.
if grep -q '^# BEGIN LSCACHE\|^# BEGIN NON_LSCACHE' "$W/.htaccess" 2>/dev/null; then
  sed -i '/^# BEGIN LSCACHE$/,/^# END LSCACHE$/d; /^# BEGIN NON_LSCACHE$/,/^# END NON_LSCACHE$/d' "$W/.htaccess"
  ok "bloky LSCACHE odstraněny z .htaccess"
fi

say "4. Šablona a mu-pluginy"
mkdir -p "$W/wp-content/themes" "$W/wp-content/mu-plugins"
rm -rf "$W/wp-content/themes/tkadlcik"
cp -a "$BUNDLE/wp-content/themes/tkadlcik" "$W/wp-content/themes/" || stop "kopie šablony"
cp -a "$BUNDLE/wp-content/mu-plugins/." "$W/wp-content/mu-plugins/" || stop "kopie mu-pluginů"
[ -e "$W/wp-content/mu-plugins/tk-local.php" ] && stop "tk-local.php na serveru"
ls "$W/wp-content/mu-plugins"

say "5. .htaccess (blok WordPressu)"
if ! grep -q '^# BEGIN WordPress' "$W/.htaccess" 2>/dev/null; then
  cat >> "$W/.htaccess" <<'HT'
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
HT
  ok "blok WordPressu doplněn"
else
  ok "blok WordPressu existuje"
fi

say "6. WordPress, šablona, pluginy (Hello Elementor, Elementor, The SEO Framework, Complianz, Site Kit), čeština"
wp tk site-setup --allow-non-local || stop "site-setup"

say "7. Kit Elementoru, obrázky, ikona, stránky, SEO"
wp tk kit-setup || stop "kit-setup"
wp tk media-import --dir="$BUNDLE/client-img" --manifest="$BUNDLE/build/media.json" --files-dir="$BUNDLE/client-files" || stop "media-import"
wp tk site-icon --file="$BUNDLE/client-img/site-icon.png" || stop "site-icon"
wp tk page-upsert --dir="$BUNDLE/build/pages" || stop "page-upsert"
wp tk seo-setup --file="$BUNDLE/build/seo.json" || stop "seo-setup"

say "8. Starý obsah do konceptu (zůstává, jen není veřejný)"
for id in $OLD; do
  wp post update "$id" --post_status=draft >/dev/null && echo "$id" >> "$B/old-content-drafted.txt" && echo "koncept: #$id"
done
[ -z "$OLD" ] && ok "žádný"

say "9. Statické soubory v kořeni webu"
for f in robots.txt llms.txt sitemap.xml; do
  if [ -e "$W/$f" ]; then mkdir -p "$B/root-moved"; mv "$W/$f" "$B/root-moved/$f" && echo "přesunut $f"; fi
done

say "10. Cookies, page cache, bezpečnostní hlavičky"
wp tk consent-setup | grep -vE '^change ' || stop "consent-setup"
wp tk consent-setup --dry-run | tail -2
wp tk cache-setup || stop "cache-setup"
wp tk headers-setup || stop "headers-setup"
wp plugin auto-updates disable elementor complianz-gdpr google-site-kit 2>&1 | tail -1
wp elementor flush_css; wp cache flush
wp cron event run --due-now | tail -1

say "11. Konec údržby, cache"
rm -f "$W/.maintenance"
wp tk cache-purge
wp tk cache-warm | tail -1
wp tk cache-warm | tail -1
wp tk doctor
grep -n '^# BEGIN\|^# END' "$W/.htaccess"
say "Migrace hotová. Dál 03-kontrola.sh."
