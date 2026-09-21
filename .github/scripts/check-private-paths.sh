#!/usr/bin/env bash
#
# Fail if any file that should be private can be fetched from the public site.
#
#   bash .github/scripts/check-private-paths.sh https://pineapp.win https://www.pineapp.win
#
# The website is served from public/ only, so every path below must answer with a 4xx
# (normally 404). A 2xx or a redirect means something private is reachable, and the
# script exits 1. Server errors are retried: Cloudflare sometimes answers 520/522 when it
# cannot reach the server in time, which says nothing about whether a file is exposed.
# A server error that persists is reported as UNKNOWN (also exit 1: "could not verify").
#
# EXTRA_PATHS (space separated) adds paths for a one-off check.

set -u

paths=(
  /.git/HEAD
  /.git/config
  /.github/workflows/deploy.yml
  /MEMORY.md
  /README.md
  /.env
)

# shellcheck disable=SC2206
paths+=( ${EXTRA_PATHS:-} )

if [ "$#" -eq 0 ]; then
  set -- https://pineapp.win https://www.pineapp.win
fi

fail=0

# Ask for a URL, retrying when the answer is a server error or no answer at all.
status_of() {

  local url="$1" attempt code

  for attempt in 1 2 3 4; do

    code="$(curl -s -o /dev/null --connect-timeout 10 -m 30 -w '%{http_code}' -H 'Cache-Control: no-cache' "$url")"

    case "$code" in
      000|5??)
        [ "$attempt" -lt 4 ] && sleep "${RETRY_SLEEP:-5}"
        ;;
      *)
        break
        ;;
    esac

  done

  echo "$code"

}

for base in "$@"; do

  base="${base%/}"

  for path in "${paths[@]}"; do

    code="$(status_of "${base}${path}")"

    case "$code" in
      2??|3??)
        echo "EXPOSED  ${base}${path} -> ${code}"
        fail=1
        ;;
      4??)
        echo "ok       ${base}${path} -> ${code}"
        ;;
      *)
        echo "UNKNOWN  ${base}${path} -> ${code} (could not verify after retries; re-run)"
        fail=1
        ;;
    esac

  done

done

if [ "$fail" -ne 0 ]; then
  echo
  echo "Some paths are reachable or could not be checked. See the EXPOSED / UNKNOWN lines above."
  exit 1
fi

echo
echo "All private paths are blocked on $# host(s)."
