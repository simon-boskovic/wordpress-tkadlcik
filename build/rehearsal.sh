#!/usr/bin/env bash
# Dress rehearsal of the Webglobe deploy on a local stack with production's versions (docker/rehearsal/).
#   ./build/rehearsal.sh [--keep-bundle]   bundle (HEAD) -> fresh PHP 8.2 + MySQL 5.6 stack -> runbook §5–§6 -> checks
#   ./build/rehearsal.sh --down            remove the rehearsal stack and its volumes
# The deploy steps below are the runbook's (docs/deploy.md §5–§6) with the paths of this stack:
#   W=/var/www/html (web root), D=/deploy (bundle in /deploy/bundle, secrets in /deploy/wp-secrets.env).
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1
DC=(docker compose -f docker/rehearsal/docker-compose.yaml)
BASE=http://localhost:8030

if [ "${1:-}" = "--down" ]; then "${DC[@]}" down -v; exit 0; fi

# 1. Bundle (§4.2) and "upload" (§4.3): extracted into backups/rehearsal/bundle, mounted read-only at /deploy.
if [ "${1:-}" != "--keep-bundle" ]; then ./build/deploy-bundle.sh --skip-checks; fi
BUNDLE=$(ls -t backups/deploy/tk-deploy-*.tar.gz | head -1)
rm -rf backups/rehearsal && mkdir -p backups/rehearsal/bundle
tar xzf "$BUNDLE" -C backups/rehearsal/bundle
(cd backups/rehearsal/bundle && sha256sum -c --quiet MANIFEST.sha256) && echo "MANIFEST OK"
printf 'WP_URL=%s\nWP_ADMIN_USER=spravce\nWP_ADMIN_PASSWORD=%s\nWP_ADMIN_EMAIL=admin@example.com\n' \
  "$BASE" "$(openssl rand -hex 16)" > backups/rehearsal/wp-secrets.env

# 2. Empty hosting: database + web server with WordPress core, no theme/plugins of ours.
"${DC[@]}" down -v >/dev/null 2>&1 || true
"${DC[@]}" up -d db wordpress
for i in $(seq 1 60); do
  curl -s -o /dev/null -w '%{http_code}' "$BASE/wp-admin/install.php" 2>/dev/null | grep -q 200 && break; sleep 2
done

# 3. The runbook's console steps, verbatim apart from W/D.
"${DC[@]}" run --rm -T wpcli -s <<'EOF'
set -u
W=/var/www/html; D=/deploy
wp() { command wp --path="$W" --require="$W/wp-content/mu-plugins/tk-build/class-tk-build-command.php" "$@"; }
echo "== PHP / WP-CLI"; wp --info | grep -E 'PHP version|WP-CLI version'
echo "== files (§5.2)"
mkdir -p "$W/wp-content/themes" "$W/wp-content/mu-plugins"
# (cp -a warns "can't preserve ownership" here only: the bundle is a Windows bind mount)
{ cp -a "$D/bundle/wp-content/themes/tkadlcik" "$W/wp-content/themes/" && cp -a "$D/bundle/wp-content/mu-plugins/." "$W/wp-content/mu-plugins/"; } 2>&1 | grep -v "preserve ownership" || true
test ! -e "$W/wp-content/mu-plugins/tk-local.php" && echo "tk-local.php absent (correct)"
echo "== pipeline (§6)"
wp tk site-setup --allow-non-local --secrets="$D/wp-secrets.env" || exit 1
wp tk kit-setup || exit 1
wp tk media-import --dir="$D/bundle/client-img" --manifest="$D/bundle/build/media.json" --files-dir="$D/bundle/client-files" || exit 1
wp tk site-icon --file="$D/bundle/client-img/site-icon.png" || exit 1
wp tk page-upsert --dir="$D/bundle/build/pages" || exit 1
wp tk seo-setup --file="$D/bundle/build/seo.json" || exit 1
wp tk consent-setup || exit 1
wp tk cache-setup || exit 1
wp tk headers-setup || exit 1
wp elementor flush_css; wp cache flush
wp cron event run --due-now | tail -1     # first WP-Cron round (Complianz, TSF) before the warm
wp tk cache-purge && wp tk cache-warm || exit 1
echo "== idempotence: second run must change nothing"
wp tk page-upsert --dir="$D/bundle/build/pages" --dry-run | grep -vc '^\[ok\]' || true
wp tk consent-setup --dry-run | tail -1
wp tk doctor
EOF

# 4. Checks from outside, like §7 against the production domain.
FAIL=0
node build/verify.mjs --seo --cache --base="$BASE" || FAIL=1
node build/interact.mjs all --base="$BASE" 2>&1 | grep -E '^[a-z-]+: ' || FAIL=1
"${DC[@]}" exec -T wordpress sh -c 'test -s /var/www/html/wp-content/debug.log && cat /var/www/html/wp-content/debug.log || echo "debug.log empty"'
exit $FAIL
