#!/usr/bin/env bash
# 00 — Soupis současného WordPressu na serveru. JEN ČTE, nic nemění.
#   bash $D/bundle/deploy/webglobe/00-inventar.sh 2>&1 | tee $D/inventar.txt
# Výstup vložit do konverzace; Claude podle něj řekne, zda pokračovat zálohou (01).
. "$(dirname "$0")/tk-env.sh"

say "Prostředí"
echo "uživatel: $(whoami)   web: $W   deploy: $D   balík: $BUNDLE"
ls -d /usr/bin/php* /usr/local/bin/php* 2>/dev/null | tr '\n' ' '; echo
"$PHP" -v 2>&1 | head -1
[ -f "$W/wp-config.php" ] || stop "V $W není wp-config.php. Nastavit W na kořen WordPressu: W=/cesta bash $0"
wp --info 2>&1 | grep -E 'PHP version|WP-CLI version'
wp core version
wp db query "SELECT VERSION() AS mysql" --skip-column-names
"$PHP" -r 'echo "GD WebP: ", function_exists("imagewebp") ? "ano" : "NE", "   Imagick: ", class_exists("Imagick") ? "ano" : "ne", "\n";'
ls -ld "$W" "$W/wp-content" "$W/wp-content/uploads" 2>&1

say "Balík"
if [ -f "$BUNDLE/MANIFEST.sha256" ]; then
  sums_ok "$BUNDLE" MANIFEST.sha256 && ok "MANIFEST v pořádku, revize $(cat "$BUNDLE/REVISION")"
  [ -e "$BUNDLE/wp-content/mu-plugins/tk-local.php" ] && warn "tk-local.php v balíku (nesmí tam být)"
  echo "stránek v balíku: $(our_slugs | wc -l)"
else
  warn "balík v $BUNDLE není rozbalený"
fi

say "Volby"
for o in home siteurl blogname template stylesheet show_on_front page_on_front page_for_posts permalink_structure \
         uploads_use_yearmonth_folders upload_path upload_url_path blog_public WPLANG timezone_string elementor_active_kit; do
  printf '%-30s %s\n' "$o" "$(wp option get "$o" 2>/dev/null)"
done
wp eval 'echo "uploads baseurl: ", wp_upload_dir()["baseurl"], "\nWP_CONTENT_DIR: ", WP_CONTENT_DIR, "\nprostředí: ", wp_get_environment_type(), "\n";'
[ "$(wp option get home)" = "$H" ] && ok "home = $H" || warn "home není $H (upravit H, nebo řešit adresu webu)"

say "wp-config.php (konstanty)"
grep -nE "define\(\s*'(WP_CACHE|WP_ENVIRONMENT_TYPE|WP_MEMORY_LIMIT|WP_MAX_MEMORY_LIMIT|DISALLOW_FILE_EDIT|WP_DEBUG[A-Z_]*|FS_METHOD|WP_HOME|WP_SITEURL|FORCE_SSL_ADMIN|DB_HOST|DB_CHARSET|WP_AUTO_UPDATE_CORE|AUTOMATIC_UPDATER_DISABLED)'" "$W/wp-config.php"
grep -n "table_prefix" "$W/wp-config.php"

say "Šablony a pluginy"
wp theme list --fields=name,status,version
wp plugin list --fields=name,status,version,auto_update
ls -la "$W/wp-content/mu-plugins" 2>&1
for f in advanced-cache.php object-cache.php db.php; do
  [ -e "$W/wp-content/$f" ] && { warn "drop-in $f existuje:"; head -5 "$W/wp-content/$f"; }
done
ls "$W/wp-content/cache" 2>&1 | head

say "Obsah"
wp post list --post_type=page --post_status=any --fields=ID,post_name,post_status,post_title --format=table
wp post list --post_type=post --post_status=any --fields=ID,post_name,post_status,post_title --format=table
wp db query "SELECT post_type, post_status, COUNT(*) n FROM $(wp db prefix)posts GROUP BY post_type, post_status ORDER BY post_type"
wp user list --fields=ID,user_login,roles --format=table
du -sh "$W/wp-content/uploads" 2>/dev/null; wp db size --human-readable 2>/dev/null | tail -1

say "Kolize s balíkem"
if [ -d "$BUNDLE/build/pages" ]; then
  S=$(our_slugs | sed "s/.*/'&'/" | paste -sd, -)
  P=$(wp db prefix)
  wp db query "SELECT ID, post_type, post_status, post_name FROM ${P}posts WHERE post_name IN ($S) AND post_type NOT IN ('revision','nav_menu_item') ORDER BY post_name"
  echo "(prázdné = žádná kolize; řádek typu page se přepíše na místě, attachment/jiný typ = stop)"
  n=0
  for f in "$BUNDLE"/client-img/*.jpg "$BUNDLE"/client-img/*.png "$BUNDLE"/client-files/*; do
    [ -e "$f" ] || continue
    b=$(basename "$f"); case "$b" in *.jpg|*.jpeg|*.png) [ "${b%%.*}" = "site-icon" ] && continue; b="${b%.*}.webp";; esac
    [ -e "$W/wp-content/uploads/$b" ] && { warn "uploads/$b už existuje"; n=$((n+1)); }
  done
  [ $n -eq 0 ] && ok "žádný soubor balíku v uploads/ zatím není"
fi

say "Soubory v kořeni webu"
ls -la "$W" | grep -vE ' (wp-[a-z-]+\.php|wp-admin|wp-includes|wp-content|index\.php|xmlrpc\.php|license\.txt|readme\.html|\.|\.\.)$'
for f in robots.txt llms.txt sitemap.xml .maintenance; do [ -e "$W/$f" ] && warn "$f v kořeni webu (stíní/ovlivní WordPress)"; done

say ".htaccess"
[ -f "$W/.htaccess" ] && cat "$W/.htaccess" || warn "žádný .htaccess"

say "HTTP"
for u in "http://$DOMAIN/" "https://www.$DOMAIN/" "$H/"; do
  printf '%-36s ' "$u"; curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' "$u"
done
curl -sI -H 'Accept-Encoding: br, gzip' "$H/" | grep -iE '^(HTTP/|server|content-encoding|cache-control|x-cache|x-tk-cache|strict-transport)'

say "Hotovo (nic se nezměnilo)"
