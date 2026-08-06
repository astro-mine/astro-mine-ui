#!/bin/sh
# Write the deployment's `config.json` at container start (ui#21; ui.md §5.1, §7 rule 3).
#
# Installed as `/docker-entrypoint.d/10-runtime-config.sh`; the nginx base image runs every
# executable script there before starting the server.
#
# **This is the whole reason the image exists.** The export has no endpoint compiled into it — the
# person who deploys it is not the person who built it, and a bundle with its backend URL baked in
# is deployable only by whoever ran the build. So the address arrives at *start*, from the
# environment, and the same digest serves two deployments.
#
#   ASTRO_MINE_API_BASE_URL   the API's origin, e.g. https://api.example.org
#
# Three outcomes, and the difference between them is the point:
#
#   1. a `config.json` is already there (mounted by the operator, a ConfigMap, a compose volume) —
#      leave it alone. A mounted file is a deliberate act, and an entrypoint that overwrote it would
#      make the mount silently do nothing.
#   2. the variable is unset — write nothing. **Not an error.** An unconfigured deployment is a
#      state the application renders honestly, with a reason and a remedy, on every route; a
#      container that refused to start would replace that with a crash loop and tell the reader
#      less.
#   3. the variable is set — write the file. A malformed value *is* an error, because case 2 exists:
#      an operator who set the variable meant to configure this deployment, and silently serving the
#      unconfigured state instead would hide their typo behind a page that reads like a design
#      decision. It fails here, at start, where the message reaches the person who typed it.

set -eu

HTML_ROOT="${ASTRO_MINE_HTML_ROOT:-/usr/share/nginx/html}"
CONFIG="$HTML_ROOT/config.json"
ME="runtime-config"

if [ -f "$CONFIG" ]; then
  echo "$ME: $CONFIG is already present — leaving it as it is"
  exit 0
fi

if [ -z "${ASTRO_MINE_API_BASE_URL:-}" ]; then
  echo "$ME: ASTRO_MINE_API_BASE_URL is unset — serving unconfigured."
  echo "$ME: every page will render and say that no API is configured. To point this deployment"
  echo "$ME: at one, restart with -e ASTRO_MINE_API_BASE_URL=https://your-api.example.org, or"
  echo "$ME: mount a config.json at $CONFIG."
  exit 0
fi

# The same rule the application applies to the file it reads (`packages/api-client/src/config.ts`):
# an absolute http(s) URL is the only thing a browser can use as an API origin. Checked here too
# rather than left to the client, because here it is still attached to the person who set it.
case "$ASTRO_MINE_API_BASE_URL" in
  http://* | https://*) ;;
  *)
    echo "$ME: ASTRO_MINE_API_BASE_URL must be an absolute http(s) URL," >&2
    echo "$ME: e.g. https://api.example.org — got: $ASTRO_MINE_API_BASE_URL" >&2
    exit 1
    ;;
esac

if [ ! -w "$HTML_ROOT" ]; then
  echo "$ME: $HTML_ROOT is not writable by uid $(id -u), so config.json cannot be written." >&2
  echo "$ME: mount a config.json at $CONFIG instead, or run with a user that owns the root." >&2
  exit 1
fi

# JSON string escaping, for the two characters that can appear in a URL and break the document. A
# `printf` with an unescaped value would emit invalid JSON, which the application reports as
# `invalid` — a true statement about a file this script had no business writing that way.
ESCAPED=$(printf '%s' "$ASTRO_MINE_API_BASE_URL" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

printf '{"apiBaseUrl":"%s"}\n' "$ESCAPED" >"$CONFIG"

echo "$ME: wrote $CONFIG → $ASTRO_MINE_API_BASE_URL"
