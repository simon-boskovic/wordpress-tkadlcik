#!/usr/bin/env bash
# Dress rehearsal of the Webglobe migration (docs/deploy.md) on a local stack with production's versions
# (docker/rehearsal/: PHP 8.2, MySQL 5.6.51, Apache + .htaccess), against an ALREADY RUNNING WordPress, with the
# bundle's own scripts deploy/webglobe/00–09 run exactly as on the server (only the paths differ):
#   existing site -> 00 inventory -> 01 backup -> 02 --dry-run -> 02 -> 03 -> checks from outside
#   -> 09 rollback -> the old site is back -> 02 again -> 03
#   ./build/rehearsal.sh [--keep-bundle]   run it all
#   ./build/rehearsal.sh --down            remove the rehearsal stack and its volumes
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1
DC=(docker compose -f docker/rehearsal/docker-compose.yaml)
BASE=http://localhost:8030
if [ "${1:-}" = "--down" ]; then "${DC[@]}" down -v; exit 0; fi

# 1. Bundle and "upload": extracted into backups/rehearsal/bundle (= $D/bundle), mounted at /deploy.
if [ "${1:-}" != "--keep-bundle" ]; then ./build/deploy-bundle.sh --skip-checks; fi
BUNDLE=$(ls -t backups/deploy/tk-deploy-*.tar.gz | head -1)
rm -rf backups/rehearsal && mkdir -p backups/rehearsal/bundle
tar xzf "$BUNDLE" -C backups/rehearsal/bundle

# 2. The hosting as the client has it: WordPress already installed and running, with someone else's bits.
"${DC[@]}" down -v >/dev/null 2>&1 || true
"${DC[@]}" up -d db wordpress
for i in $(seq 1 60); do
  curl -s -o /dev/null -w '%{http_code}' "$BASE/wp-admin/install.php" 2>/dev/null | grep -q 200 && break; sleep 2
done
"${DC[@]}" run --rm -T --entrypoint sh wpcli -c '
  set -e; W=/var/www/html
  wp --path=$W core install --url=http://localhost:8030 --title="Můj web" --admin_user=majitel --admin_password=heslo-heslo --admin_email=majitel@example.com --skip-email
  wp --path=$W language core install cs_CZ --activate >/dev/null
  wp --path=$W rewrite structure "/%postname%/" >/dev/null
  wp --path=$W post create --post_type=page --post_status=publish --post_title="O nás" --post_name=o-nas >/dev/null
  wp --path=$W post create --post_type=page --post_status=publish --post_title="Kontakt (starý)" --post_name=kontakt >/dev/null
  wp --path=$W plugin install litespeed-cache --activate >/dev/null
  wp --path=$W plugin install classic-editor >/dev/null
  echo "User-agent: *" > $W/robots.txt
  echo "== the existing site:"; wp --path=$W theme list --status=active --field=name; wp --path=$W plugin list --fields=name,status
' 2>&1 | grep -v Container

# 3. The server console: the bundle's scripts with this stack's paths.
ENV='W=/var/www/html D=/deploy H=http://localhost:8030 DOMAIN=localhost:8030 PHP=php CURL_CONNECT_TO=localhost:8030:wordpress:80'
run() { echo; echo "######## $*"; "${DC[@]}" run --rm -T wpcli -c "$ENV bash /deploy/bundle/deploy/webglobe/$*" 2>&1 | grep -v ' Container '; }
run 00-inventar.sh
run 01-zaloha.sh
run 02-migrace.sh --dry-run
run 02-migrace.sh
run 03-kontrola.sh

# 4. Checks from outside, like docs/deploy.md §8 against the production domain.
FAIL=0
node build/verify.mjs --seo --cache --base="$BASE" || FAIL=1
node build/interact.mjs all --base="$BASE" 2>&1 | grep -E '^[a-z-]+: ' || true   # consent: FAIL until Site Kit is connected

# 5. Rollback, then the old site must be back exactly; then migrate again.
run 09-navrat.sh --ano
echo "== after rollback:"
"${DC[@]}" run --rm -T wpcli -c 'W=/var/www/html; wp --path=$W theme list --status=active --field=name; wp --path=$W plugin list --fields=name,status; wp --path=$W post list --post_type=page --fields=post_name,post_status; ls $W/robots.txt $W/wp-content/advanced-cache.php $W/wp-content/mu-plugins 2>&1; wp --path=$W db tables | grep -c cmplz || true' 2>&1 | grep -v ' Container '
run 02-migrace.sh
run 03-kontrola.sh || FAIL=1
"${DC[@]}" exec -T wordpress sh -c 'test -s /var/www/html/wp-content/debug.log && tail -20 /var/www/html/wp-content/debug.log || echo "debug.log empty"'
exit $FAIL
