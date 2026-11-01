# Společné proměnné migrace na Webglobe (docs/deploy.md). Načítají ho všechny skripty v této složce.
# Hodnoty jde přepsat proměnnou prostředí před spuštěním, např.:  W=/jina/cesta bash 00-inventar.sh
# Generálka (build/rehearsal.sh) je takto přepisuje na cesty svého stacku.

DOMAIN=${DOMAIN:-radostvpohybu.cz}
W=${W:-/home/html/$DOMAIN/public_html}            # kořen WordPressu (tam, kde je wp-config.php)
D=${D:-/home/html/$DOMAIN/deploy}                 # složka pro nasazení, mimo web (FTP účet deploy.$DOMAIN)
H=${H:-https://$DOMAIN}                           # adresa webu, jak ji má volba home
PHP=${PHP:-php8.4}                                # stejná verze jako PHP webu (2026-11-01: 8.4.27, LiteSpeed)
WPCLI=${WPCLI:-/usr/local/bin/wp}
BUNDLE=${BUNDLE:-$D/bundle}                       # rozbalený balík (build/deploy-bundle.sh)
B=${B:-$D/backup}                                 # zálohy (01-zaloha.sh); 09-navrat.sh z nich obnovuje

# WP-CLI s PHP webu; --require načte příkazy `wp tk` i tehdy, když téma a mu-pluginy ještě nejsou na místě.
wp() {
  if [ -f "$W/wp-content/mu-plugins/tk-build/class-tk-build-command.php" ]; then
    "$PHP" "$WPCLI" --path="$W" --require="$W/wp-content/mu-plugins/tk-build/class-tk-build-command.php" "$@"
  else
    "$PHP" "$WPCLI" --path="$W" "$@"
  fi
}

say()  { printf '\n== %s\n' "$*"; }
ok()   { printf 'OK    %s\n' "$*"; }
warn() { printf 'POZOR %s\n' "$*"; }
stop() { printf '\nSTOP  %s\n' "$*"; exit 1; }

# Stránky z balíku (slugy), pro kontrolu kolizí a pro odlišení starého obsahu.
our_slugs() { ls "$BUNDLE/build/pages" 2>/dev/null | sed 's/\.json$//'; }

# Kontrolní součty bez --quiet (funguje s GNU i BusyBox sha256sum): vypíše jen chyby, vrací stav.
sums_ok() { ( cd "$1" && out=$(sha256sum -c "$2" 2>&1); rc=$?; printf '%s\n' "$out" | grep -v ': OK$'; exit $rc ); }

# Generálka: curl na adresu webu přes jiný cíl (CURL_CONNECT_TO=localhost:8030:wordpress:80). Na serveru prázdné.
curl() { if [ -n "${CURL_CONNECT_TO:-}" ]; then command curl --connect-to "$CURL_CONNECT_TO" "$@"; else command curl "$@"; fi; }

# Webglobe = nginx + LiteSpeed. LiteSpeed's own server cache would serve stale copies next to our page cache, and it
# ignores Header/AddEncoding in wp-content/cache/tk-page/.htaccess (a .gz would go out without Content-Encoding):
# switch its cache off for the site (block at the top of .htaccess) and serve our cache from PHP (cache-setup --mode=php).
ls_cache_off() {
  grep -q '^# BEGIN TK LiteSpeed Cache off' "$W/.htaccess" 2>/dev/null && { ok "LiteSpeed cache už vypnutá (.htaccess)"; return 0; }
  { printf '%s\n' '# BEGIN TK LiteSpeed Cache off' \
      "# The site has its own page cache (TK Page Cache); LiteSpeed's server cache would serve stale copies." \
      '<IfModule LiteSpeed>' 'CacheLookup off' 'RewriteEngine On' 'RewriteRule .* - [E=Cache-Control:no-cache]' '</IfModule>' \
      '# END TK LiteSpeed Cache off'
    cat "$W/.htaccess"; } > "$W/.htaccess.tk-new" && mv "$W/.htaccess.tk-new" "$W/.htaccess" && ok "LiteSpeed cache vypnutá (.htaccess)"
}
# Purge LiteSpeed's cache for this site: a PHP response carrying X-LiteSpeed-Purge: * (no-op on other servers).
ls_cache_purge() {
  local f="$W/tk-lspurge-$RANDOM$RANDOM.php"
  echo '<?php header("X-LiteSpeed-Purge: *"); header("Cache-Control: no-store"); echo "ok";' > "$f"
  curl -s -o /dev/null -w "LiteSpeed purge: %{http_code}\n" "$H/$(basename "$f")"; rm -f "$f"
}
