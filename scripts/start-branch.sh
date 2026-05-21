#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/start-branch.sh <change-name>" >&2
  exit 2
fi

name="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g; s/--*/-/g; s/^-//; s/-$//')"

if [ -z "$name" ]; then
  echo "Change name must contain at least one letter or number." >&2
  exit 2
fi

git switch main 2>/dev/null || git switch master
git pull --ff-only 2>/dev/null || true
git switch -c "work/$name"
