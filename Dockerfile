# THE IMAGE THAT SERVES THE EXPORT (ui#21; ui.md §8, conventions.md §7.2 tier 2).
#
#     docker build -t astro-mine-ui .
#     docker run --rm -p 8080:8080 astro-mine-ui                                  # unconfigured
#     docker run --rm -p 8080:8080 -e ASTRO_MINE_API_BASE_URL=https://api… astro-mine-ui
#
# **This image exists for the hosted tier, and it changes nothing about what ships.** The deployable
# is `apps/console/out` — a directory of files any static host serves, with no Node process behind
# it (ui.md §5.1). An object store, a CDN bucket and `python -m http.server` are all first-class
# ways to run it, and none of them needs this. What the image adds is the one thing a bucket cannot
# do for itself: put the deployment's `config.json` in place at *container start*, from an
# environment variable, so the same bytes serve two deployments.
#
# **Two stages, both bases pinned by digest** (`conventions.md` §7.2 — reproducible builds, pinned
# base images). A tag is a moving target; a digest is the thing that was tested. Refresh them
# deliberately, with the reason in the commit, not by floating.
#
# **No build secret, and that is a property worth keeping.** Every `@astro-mine/*` dependency in
# this workspace is `workspace:*` and resolves locally, so `pnpm install` here reaches only the
# public registry — the image builds from a clean clone with no token, exactly as CI does (see
# `.npmrc`). If this ever needs a credential, something has been published that should not have
# been.

# ── build ─────────────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build

# Corepack resolves the pnpm version from the workspace root's `packageManager` field, so the image
# and a contributor's machine run the same pnpm. The prompt is interactive by default and would
# hang a build that has no terminal.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

WORKDIR /src

# The whole workspace in one layer, rather than manifests-then-sources for a cached install layer.
# A pnpm workspace's manifest set is eleven files across five packages, and a copy list that must
# be edited whenever a package is added is a copy list that silently stops matching — the failure
# mode being a stale dependency layer, which is worse than the minute it saves. `.dockerignore`
# keeps `node_modules`, the previous export and the test artifacts out.
COPY . .

RUN pnpm install --frozen-lockfile

# `pnpm -r run build`: the packages first, in topological order, then the app — which stages
# Cesium's runtime assets into `public/cesium` and emits the static export. Nothing is fetched from
# a CDN at runtime, which is the CX-LOCAL property this build exists to hold.
RUN pnpm build

# The export is what ships; assert it rather than trusting an exit code, so a build that silently
# stops emitting one fails here instead of producing an image that serves an empty directory.
RUN test -f apps/console/out/index.html \
  && test -d apps/console/out/cesium/Workers \
  || (echo "no static export at apps/console/out" >&2; exit 1)

# ── serve ─────────────────────────────────────────────────────────────────────────────────────
#
# `nginx-unprivileged` rather than `nginx`: it runs as uid 101 with no capability to drop and
# listens on 8080, so the image needs no root at runtime and no `--user` flag to be safe by
# default. The official image runs every executable `/docker-entrypoint.d/*.sh` before starting
# nginx, which is the hook the runtime configuration uses.
FROM nginxinc/nginx-unprivileged:1.29-alpine@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6

# The base image ends with `USER 101`, and both the entrypoint hook and the document root have to
# be installed as root. Dropped again below — nothing here runs privileged.
USER root

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/headers.conf /etc/nginx/astro-mine-headers.conf
COPY docker/10-runtime-config.sh /docker-entrypoint.d/10-runtime-config.sh

# `--chown` on the COPY rather than a `chown -R` afterwards: the export is ~22 MB, and a recursive
# chown in its own layer would duplicate every byte of it.
COPY --from=build --chown=101:101 /src/apps/console/out /usr/share/nginx/html

# **`COPY --chown` does not own the destination directory**, and that is the whole of this line.
# `--chown` applies to the entries the COPY creates; `/usr/share/nginx/html` already exists in the
# base image and keeps its root ownership, so uid 101 could read every file in it and still not
# create one. Writing `config.json` needs write on the *directory*, so the container came up, the
# entrypoint refused, and nginx never started — with the export sitting there perfectly readable.
# One directory, not `-R`: creating a file needs no permission on the neighbours.
#
# The exec bit is set here rather than relied upon from the tree: a shell script committed from a
# Windows drive lands in git as 0644, and an entrypoint hook that is not executable is silently
# skipped — the container starts, serves, and reports itself unconfigured forever.
RUN chown 101:101 /usr/share/nginx/html \
  && chmod 0755 /docker-entrypoint.d/10-runtime-config.sh

USER 101

EXPOSE 8080

# Docker and Compose honour this; Kubernetes uses its own probes and ignores it. `/` rather than a
# bespoke `/healthz`, because a health path that is not a route is a surface the application does
# not have — and the thing worth knowing is whether the export is being served.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
