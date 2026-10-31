#!/usr/bin/env bash
# Dump the database to ./backups.   ./db-export.sh [name]
set -euo pipefail
cd "$(dirname "$0")"
name=${1:-db-$(date +%Y%m%d-%H%M%S)}
out="backups/${name%.sql}.sql"
docker compose exec -T db sh -c \
  'exec mariadb-dump --single-transaction --quick --default-character-set=utf8mb4 -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' > "$out"
printf 'Wrote %s (%s)\n' "$out" "$(du -h "$out" | cut -f1)"
