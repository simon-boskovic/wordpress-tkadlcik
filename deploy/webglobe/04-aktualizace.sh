#!/usr/bin/env bash
# 04 — Aktualizace běžícího webu novým balíkem (změna šablony, CSS/JS, stránek, obrázků, SEO). Bez údržby: každý
# krok je idempotentní a mění jen to, co se změnilo; na konci purge + warm (CSS je vložené v uložených stránkách).
#   bash $D/bundle/deploy/webglobe/04-aktualizace.sh
# Balík nahrát a rozbalit do $BUNDLE předem (docs/deploy.md §10).
. "$(dirname "$0")/tk-env.sh"
set -o pipefail

say "Kontroly"
sums_ok "$BUNDLE" MANIFEST.sha256 || stop "Balík neodpovídá MANIFEST.sha256."
[ -e "$BUNDLE/wp-content/mu-plugins/tk-local.php" ] && stop "tk-local.php v balíku."
[ "$(wp eval 'echo "ENV=", wp_get_environment_type();' 2>/dev/null | grep -o 'ENV=[a-z]*')" = ENV=production ] || stop "Prostředí není production."
ok "balík $(cat "$BUNDLE/REVISION")"
mkdir -p "$B"; echo "$(date -Iseconds) $(cat "$BUNDLE/REVISION")" >> "$B/aktualizace.log"

say "Šablona a mu-pluginy"
rm -rf "$W/wp-content/themes/tkadlcik.new"
cp -a "$BUNDLE/wp-content/themes/tkadlcik" "$W/wp-content/themes/tkadlcik.new" || stop "kopie šablony"
rm -rf "$W/wp-content/themes/tkadlcik.old"; mv "$W/wp-content/themes/tkadlcik" "$W/wp-content/themes/tkadlcik.old"
mv "$W/wp-content/themes/tkadlcik.new" "$W/wp-content/themes/tkadlcik" && rm -rf "$W/wp-content/themes/tkadlcik.old"
cp -a "$BUNDLE/wp-content/mu-plugins/." "$W/wp-content/mu-plugins/" || stop "kopie mu-pluginů"
ok "šablona a mu-pluginy"

say "Obsah"
wp tk media-import --dir="$BUNDLE/client-img" --manifest="$BUNDLE/build/media.json" --files-dir="$BUNDLE/client-files" | grep -vE '^\[ok\]' || stop "media-import"
wp tk page-upsert --dir="$BUNDLE/build/pages" | grep -vE '^\[ok\]' || stop "page-upsert"
wp tk seo-setup --file="$BUNDLE/build/seo.json" | tail -1 || stop "seo-setup"
wp tk consent-setup --dry-run | tail -2

say "Cache"
ls_cache_off
wp elementor flush_css 2>/dev/null | tail -1; wp cache flush | tail -1
ls_cache_purge
wp tk cache-purge | tail -1
wp tk cache-warm | tail -1
wp tk cache-warm | tail -1
say "Aktualizace hotová."
