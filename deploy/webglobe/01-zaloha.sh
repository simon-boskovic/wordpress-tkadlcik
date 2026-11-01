#!/usr/bin/env bash
# 01 — Plná záloha současného webu před migrací: databáze, wp-content (bez cache), wp-config.php, .htaccess,
# soubory v kořeni webu a soupis pluginů/voleb. Na webu nic nemění. Nepřepíše existující zálohu.
#   bash $D/bundle/deploy/webglobe/01-zaloha.sh
# 09-navrat.sh obnovuje přesně z této zálohy.
. "$(dirname "$0")/tk-env.sh"
set -o pipefail

[ -f "$W/wp-config.php" ] || stop "V $W není wp-config.php."
if [ -f "$B/db.sql" ]; then stop "Záloha už existuje ($B). Nepřepisuje se: přejmenovat ji (mv $B $B-\$(date +%Y%m%d-%H%M)) a spustit znovu."; fi
umask 077
mkdir -p "$B"

say "Databáze"
wp db export "$B/db.sql" --add-drop-table || stop "wp db export selhal"
tail -1 "$B/db.sql" | grep -q 'Dump completed' && ok "dump úplný ($(du -h "$B/db.sql" | cut -f1))" || stop "dump nekončí 'Dump completed'"
wp db tables --all-tables-with-prefix --format=csv | tr ',' '\n' > "$B/tables.txt"
echo "tabulek: $(wc -l < "$B/tables.txt")"

say "Soubory"
cp -p "$W/wp-config.php" "$B/wp-config.php"
[ -f "$W/.htaccess" ] && cp -p "$W/.htaccess" "$B/htaccess" || echo "(žádný .htaccess)"
tar czf "$B/wp-content.tgz" -C "$W" --exclude='wp-content/cache' --exclude='wp-content/upgrade' wp-content \
  || stop "tar wp-content selhal"
ok "wp-content.tgz $(du -h "$B/wp-content.tgz" | cut -f1)"
# Soubory v kořeni webu mimo jádro WordPressu (robots.txt, ověřovací soubory Googlu, index.html …).
(cd "$W" && find . -maxdepth 1 -type f ! -name 'wp-*.php' ! -name index.php ! -name xmlrpc.php ! -name license.txt \
  ! -name readme.html ! -name wp-config.php ! -name .htaccess -print > "$B/root-files.txt"; tar czf "$B/root-files.tgz" -T "$B/root-files.txt")
tar tzf "$B/root-files.tgz" | sed 's/^/  koren: /'

say "Soupis"
{
  echo "date: $(date -Iseconds)"; echo "revision: $(cat "$BUNDLE/REVISION" 2>/dev/null)"
  echo "core: $(wp core version)"
  for o in home siteurl template stylesheet show_on_front page_on_front page_for_posts permalink_structure \
           uploads_use_yearmonth_folders blogname blog_public WPLANG elementor_active_kit; do
    echo "option $o: $(wp option get "$o" 2>/dev/null)"
  done
} > "$B/soupis.txt"
wp plugin list --fields=name,status,version --format=csv > "$B/plugins.csv"
wp theme list --fields=name,status,version --format=csv > "$B/themes.csv"
wp plugin list --status=active --field=name > "$B/plugins-active.txt"
cat "$B/soupis.txt"

say "Kontrolní součty"
(cd "$B" && sha256sum db.sql wp-content.tgz wp-config.php root-files.tgz $( [ -f htaccess ] && echo htaccess ) > SHA256SUMS)
cat "$B/SHA256SUMS"
gzip -t "$B/wp-content.tgz" && ok "wp-content.tgz čitelný"
ls -la "$B"
say "Záloha hotová: $B. Stáhnout si kopii na PC (FTP deploy.$DOMAIN, složka backup) před 02."
