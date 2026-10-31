#!/usr/bin/env bash
# Restore a dump from ./backups, replacing the current database.   ./db-import.sh <file>
set -euo pipefail
cd "$(dirname "$0")"
file=${1:?usage: ./db-import.sh backups/<file>.sql}
[ -r "$file" ] || { echo "Not readable: $file" >&2; exit 1; }
read -r -p "Replace the current database with $file? [y/N] " reply
[ "$reply" = "y" ] || { echo "Aborted."; exit 1; }
docker compose exec -T db sh -c 'exec mariadb -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < "$file"
./wp.sh cache flush --quiet || true
# The static page cache (mu-plugins/tk-page-cache) holds pages rendered from the old database: re-apply
# its setup (drop-in, .htaccess block, stamp) and empty it. Pages refill on their first view, or run
# ./wp.sh tk cache-warm.
./wp.sh tk cache-setup && ./wp.sh tk cache-purge
echo "Restored $file"
