#!/usr/bin/env bash
# WP-CLI for the local stack:  ./wp.sh plugin list
cd "$(dirname "$0")" || exit 1
out=$(docker compose run --rm -T wpcli "$@" 2>&1); status=$?
# Strip PHP deprecation dumps and compose status lines.
printf '%s\n' "$out" | sed -e '/^PHP: /,/^)\]$/d' -e '/^ Container tkadlcik/d'
exit $status
