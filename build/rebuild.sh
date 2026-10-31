#!/usr/bin/env bash
# Regenerate everything and push it into the local WordPress. Idempotent; safe to re-run.
#   ./build/rebuild.sh            full
#   ./build/rebuild.sh --pages    generate + pages only (fast loop while porting a template)
# Both end by rebuilding the static page cache (purge + warm), so every page is served from
# wp-content/cache/tk-page/ right away. A fresh database is installed by `wp tk site-setup` first.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f build/generate.mjs ]; then
  node build/generate.mjs
else
  echo "Warning: build/generate.mjs not found; using whatever is in build/pages/." >&2
fi
if [ "${1:-}" != "--pages" ]; then
  ./wp.sh tk site-setup
  ./wp.sh tk kit-setup
  ./wp.sh tk media-import --files-dir=/project/client-files   # images -> WebP; client-files/ downloads as-is
  ./wp.sh tk site-icon               # favicon/app icon from client-img/site-icon.png
fi
if compgen -G "build/pages/*.json" > /dev/null; then
  ./wp.sh tk page-upsert --dir=/project/build/pages
else
  echo "Warning: no build/pages/*.json; skipping page-upsert." >&2
fi
if [ "${1:-}" != "--pages" ]; then
  if [ -f build/seo.json ]; then ./wp.sh tk seo-setup; fi
  ./wp.sh tk consent-setup          # Complianz strict opt-in, Site Kit's tag blocked until consent (idempotent)
  ./wp.sh tk cache-setup
  ./wp.sh tk headers-setup          # security headers block in .htaccess
fi
./wp.sh elementor flush_css
./wp.sh cache flush
./wp.sh tk cache-purge
./wp.sh tk cache-warm
