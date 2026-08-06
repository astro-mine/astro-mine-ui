#!/usr/bin/env bash
# Wait for a container to answer, and say why when it does not (ui#21).
#
#     bash .github/scripts/wait-for-container.sh <container-name> <url> [seconds]
#
# **This exists because of the failure that produced it.** The image lane's readiness loop was six
# inline lines that polled with `curl` and then carried on. When the container started and died a
# second later, the log was sixty identical "Couldn't connect to server" lines and nothing else —
# and the entrypoint had already printed the exact cause, to a stream nobody read. A wait that
# discards the logs of the thing it was waiting for turns a one-line diagnosis into a bisect.
#
# So: poll, and on timeout print the container's status and its logs before failing. Also stop early
# if the container is already gone, because sixty seconds of polling a dead container tells you
# nothing you did not know after the first second.
#
# Lives under `.github/` rather than `scripts/`, which is where this repository keeps its *gates*;
# this is CI plumbing for one job. `.dockerignore` excludes `.github`, so it never enters the build
# context it is used to test.
set -euo pipefail

NAME="${1:?usage: wait-for-container.sh <container-name> <url> [seconds]}"
URL="${2:?usage: wait-for-container.sh <container-name> <url> [seconds]}"
DEADLINE="${3:-60}"

give_up() {
  echo "::error::$NAME never answered $URL — $1"
  echo "--- docker ps -a --------------------------------------------------------------"
  docker ps -a --filter "name=^/${NAME}$" --format '{{.Status}}\t{{.Image}}' || true
  echo "--- docker logs $NAME ---------------------------------------------------------"
  docker logs "$NAME" 2>&1 || true
  echo "-------------------------------------------------------------------------------"
  exit 1
}

for _ in $(seq 1 "$DEADLINE"); do
  if curl -fsS -o /dev/null "$URL"; then
    echo "$NAME is serving $URL."
    exit 0
  fi
  # A container that has exited will not start answering later. The entrypoint refusing a bad
  # configuration is a *deliberate* exit, and this is the path that reports it in one second rather
  # than in sixty.
  running=$(docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null || echo missing)
  [ "$running" = "true" ] || give_up "it is not running ($running)"
  sleep 1
done

give_up "it is running but never served within ${DEADLINE}s"
