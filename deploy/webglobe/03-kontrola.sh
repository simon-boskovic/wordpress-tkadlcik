#!/usr/bin/env bash
# 03 — Kontrola po migraci (jen čte). Doplňuje lokální `node build/verify.mjs --seo --cache --base=https://radostvpohybu.cz`.
#   bash $D/bundle/deploy/webglobe/03-kontrola.sh
. "$(dirname "$0")/tk-env.sh"
FAIL=0
bad() { printf 'CHYBA %s\n' "$*"; FAIL=1; }

say "WordPress"
wp tk doctor
[ -e "$W/.maintenance" ] && bad "údržba je pořád zapnutá ($W/.maintenance)"
[ -e "$W/wp-content/mu-plugins/tk-local.php" ] && bad "tk-local.php na serveru"
[ "$(wp eval 'echo wp_get_environment_type();')" = production ] && ok "prostředí production" || bad "prostředí není production"
wp tk consent-setup --dry-run | tail -2
wp tk page-upsert --dir="$BUNDLE/build/pages" --dry-run | grep -vE '^\[ok\]' | head -5

say "Stránky (cache, stav)"
for s in $(our_slugs); do
  [ "$s" = domu ] && path=/ || path="/$s/"
  r=$(curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' "$H$path" | tr -d '\r' | awk 'NR==1{c=$2} tolower($1)=="x-tk-cache:"{x=$2} END{print c" "x}')
  printf '%-40s %s\n' "$path" "$r"
  case "$r" in "200 HIT"*|"200 HIT-PHP"*) ;; *) bad "$path: $r";; esac
done

say "Přesměrování, 404, soubory"
chk() { got=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$1"); printf '%-60s %s\n' "$1" "$got"; case "$got" in $2) ;; *) bad "$1: čekáno $2";; esac; }
case "$H" in https://*) chk "http://$DOMAIN/" "301 $H/"; chk "https://www.$DOMAIN/" "301 $H/";; esac
chk "$H/prazdna-stranka/" "410*"
chk "$H/cviceni-na-akci-s-jirim-ledvinou/" "301 $H/seminar-vincent-chu/"
chk "$H/neexistuje-$(date +%s)/" "404*"
chk "$H/wp-content/uploads/letak-savle.jpg" "200*"
chk "$H/robots.txt" "200*"
chk "$H/llms.txt" "200*"
chk "$H/sitemap.xml" "200*"
echo "sitemap <loc>: $(curl -s "$H/sitemap.xml" | grep -o '<loc>' | wc -l)   (čeká se 12: 13 stránek bez zásad)"
chk "$H/?author=1" "404*"
chk "$H/wp-json/wp/v2/users" "404*"

say "Hlavičky"
curl -sI -H 'Accept-Encoding: br, gzip' "$H/" | grep -iE '^(HTTP/|x-tk-cache|cache-control|content-encoding|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|x-powered-by)'

say "Chyby PHP"
[ -f "$W/wp-content/debug.log" ] && tail -20 "$W/wp-content/debug.log" || echo "debug.log není"

[ $FAIL -eq 0 ] && say "Vše v pořádku." || say "Jsou chyby (CHYBA výše)."
exit $FAIL
