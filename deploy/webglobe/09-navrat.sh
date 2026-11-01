#!/usr/bin/env bash
# 09 — Návrat na stav před migrací ze zálohy 01 ($B). Obnoví databázi, wp-content (šablony, pluginy, mu-pluginy,
# uploads), wp-config.php, .htaccess a soubory v kořeni webu; odstraní, co migrace přidala.
#   bash $D/bundle/deploy/webglobe/09-navrat.sh --ano
. "$(dirname "$0")/tk-env.sh"
set -o pipefail
[ "${1:-}" = "--ano" ] || stop "Návrat přepíše web zálohou z $B. Spustit s --ano."
[ -f "$B/SHA256SUMS" ] || stop "Záloha $B neexistuje."
sums_ok "$B" SHA256SUMS || stop "Záloha v $B neodpovídá SHA256SUMS."
tail -1 "$B/db.sql" | grep -q 'Dump completed' || stop "db.sql není úplný."
ok "záloha ověřená ($(grep '^date:' "$B/soupis.txt"))"

say "1. Údržba"
echo '<?php $upgrading = time(); ?>' > "$W/.maintenance"

say "2. Databáze"
"$PHP" "$WPCLI" --path="$W" db import "$B/db.sql" || stop "db import selhal (údržba zůstává; záloha je nedotčená)"
# Tabulky, které vznikly až po záloze (Complianz apod.), smazat.
NOW=$("$PHP" "$WPCLI" --path="$W" db tables --all-tables-with-prefix --format=csv | tr ',' '\n')
EXTRA=$(printf '%s\n' "$NOW" | grep -vxF -f "$B/tables.txt" | paste -sd, -)
if [ -n "$EXTRA" ]; then "$PHP" "$WPCLI" --path="$W" db query "DROP TABLE $EXTRA" && echo "smazané nové tabulky: $EXTRA"; fi

say "3. Soubory"
rm -rf "$W/wp-content/themes" "$W/wp-content/plugins" "$W/wp-content/mu-plugins" "$W/wp-content/languages"
rm -f "$W/wp-content/advanced-cache.php"
rm -rf "$W/wp-content/cache/tk-page"
tar xzf "$B/wp-content.tgz" -C "$W" || stop "rozbalení wp-content.tgz selhalo"
cp -p "$B/wp-config.php" "$W/wp-config.php"
if [ -f "$B/htaccess" ]; then cp -p "$B/htaccess" "$W/.htaccess"; else rm -f "$W/.htaccess"; fi
tar xzf "$B/root-files.tgz" -C "$W"
ok "wp-content, wp-config.php, .htaccess, kořen webu obnoveny (soubory nahrané migrací v uploads/ zůstávají, nikde nejsou odkázané)"

say "4. Konec údržby"
rm -f "$W/.maintenance"
"$PHP" "$WPCLI" --path="$W" cache flush
"$PHP" "$WPCLI" --path="$W" option get home
"$PHP" "$WPCLI" --path="$W" theme list --status=active --field=name
curl -s -o /dev/null -w "$H/ -> %{http_code}\n" "$H/"
say "Návrat hotový. Proxy Webglobe nemá purge; stránky jsou čerstvé díky revalidaci."
