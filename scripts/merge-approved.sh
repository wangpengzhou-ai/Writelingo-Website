#!/bin/sh
set -eu

if [ "$#" -ne 3 ] || [ "$2" != "--approved-by" ]; then
  echo 'Usage: scripts/merge-approved.sh <branch> --approved-by "<name>"' >&2
  exit 2
fi

branch="$1"
approved_by="$3"

if [ -z "$approved_by" ]; then
  echo "Approved-by name is required." >&2
  exit 2
fi

current="$(git branch --show-current)"
case "$current" in
  main|master) ;;
  *)
    echo "Run this from main/master. Current branch: $current" >&2
    exit 1
    ;;
esac

git fetch --all --prune 2>/dev/null || true

APPROVED_MERGE=1 git merge --no-ff "$branch" -m "Merge $branch

Approved-by: $approved_by"
