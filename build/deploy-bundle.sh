#!/usr/bin/env bash
# Build the deploy bundle for production (docs/deploy.md §4). Run from Git Bash in the repo root, on the commit
# that is to be deployed:   ./build/deploy-bundle.sh [--skip-checks]
#
# The bundle holds only committed files (git archive), LF line endings, without the local-only tk-local.php,
# plus REVISION, local-versions.txt (the local WordPress/theme/plugin versions to match) and MANIFEST.sha256.
# Output: backups/deploy/tk-deploy-<short sha>.tar.gz (+ .sha256). Nothing is uploaded.
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean: commit first (the bundle is built from HEAD only)." >&2
  git status --short >&2
  exit 1
fi

node build/generate.mjs
if [ -n "$(git status --porcelain)" ]; then
  echo "generate.mjs changed files: the commit does not hold the generated state. Commit them first." >&2
  git status --short >&2
  exit 1
fi

if [ "${1:-}" != "--skip-checks" ]; then
  npm test 2>&1 | grep -E '^# (pass|fail)' || true
  node build/verify.mjs --seo
fi

REV=$(git rev-parse --short HEAD)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

git -c core.autocrlf=false -c core.eol=lf archive HEAD \
  wp-content/themes/tkadlcik wp-content/mu-plugins \
  build/pages build/seo.json build/media.json \
  client-img client-files wp-cli.yml \
  | tar -x -C "$T"
rm -f "$T/wp-content/mu-plugins/tk-local.php"
git rev-parse HEAD > "$T/REVISION"
{
  ./wp.sh core version
  ./wp.sh theme list --fields=name,version,status --format=csv
  ./wp.sh plugin list --fields=name,version,status --format=csv
} | sed 's/\r$//' > "$T/local-versions.txt"
(cd "$T" && find . -type f ! -name MANIFEST.sha256 -print0 | sort -z | xargs -0 sha256sum > MANIFEST.sha256)

mkdir -p backups/deploy
OUT="backups/deploy/tk-deploy-$REV.tar.gz"
tar czf "$OUT" -C "$T" .
(cd backups/deploy && sha256sum "tk-deploy-$REV.tar.gz" > "tk-deploy-$REV.tar.gz.sha256")

# Self-checks of the archive.
if tar tzf "$OUT" | grep -q 'tk-local.php'; then echo "tk-local.php is in the bundle" >&2; exit 1; fi
if tar xzOf "$OUT" ./wp-content/themes/tkadlcik/data/llms.txt | grep -q $'\r'; then echo "CRLF in the bundle" >&2; exit 1; fi
PAGES=$(tar tzf "$OUT" | grep -c '^./build/pages/.*\.json$')
echo "Bundle:   $OUT"
echo "Revision: $(cat "$T/REVISION")"
echo "Pages:    $PAGES"
echo "Files:    $(tar tzf "$OUT" | grep -vc '/$')"
cat "backups/deploy/tk-deploy-$REV.tar.gz.sha256"
