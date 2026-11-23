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
# Our pages (page-upsert sets _tk_scripts) that the bundle no longer has go to draft, e.g. /cviceni-ve-zline/
# (23. 11. 2026; its URL 301s via tk-redirects.php). Nothing is deleted; the IDs are logged in $B/pages-drafted.txt.
P=$(wp db prefix); S=$(our_slugs | sed "s/.*/'&'/" | paste -sd, -)
[ -n "$S" ] || stop "balík bez stránek"
GONE=$(wp db query "SELECT p.ID FROM ${P}posts p JOIN ${P}postmeta m ON m.post_id = p.ID AND m.meta_key = '_tk_scripts' WHERE p.post_type = 'page' AND p.post_status = 'publish' AND p.post_name NOT IN ($S)" --skip-column-names | paste -sd' ' -)
for id in $GONE; do
  wp post update "$id" --post_status=draft >/dev/null && echo "$(date -Iseconds) $id" >> "$B/pages-drafted.txt" && echo "koncept (už není v balíku): #$id"
done
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
