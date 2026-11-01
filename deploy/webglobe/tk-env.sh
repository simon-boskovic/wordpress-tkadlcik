# Společné proměnné migrace na Webglobe (docs/deploy.md). Načítají ho všechny skripty v této složce.
# Hodnoty jde přepsat proměnnou prostředí před spuštěním, např.:  W=/jina/cesta bash 00-inventar.sh
# Generálka (build/rehearsal.sh) je takto přepisuje na cesty svého stacku.

DOMAIN=${DOMAIN:-radostvpohybu.cz}
W=${W:-/home/html/$DOMAIN/public_html/www}        # kořen WordPressu (tam, kde je wp-config.php)
D=${D:-/home/html/$DOMAIN/deploy}                 # složka pro nasazení, mimo web (FTP účet deploy.$DOMAIN)
H=${H:-https://$DOMAIN}                           # adresa webu, jak ji má volba home
PHP=${PHP:-php8.2}                                # stejná verze jako PHP webu (výchozí `php` v konzoli je 7.3)
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
