#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$REPO_ROOT"

echo '>>> Pull repo'
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Always track the most up-to-date branch from the remote instead of whatever
# the local clone defaulted to (some servers were still on an outdated `main`).
# This keeps deployments in sync with the active work branch.
git fetch origin work
git checkout work
git pull --rebase origin work

# If the script was invoked from another branch, switch back to avoid leaving
# the caller in a different state than before.
if [ "$CURRENT_BRANCH" != "work" ]; then
  git checkout "$CURRENT_BRANCH"
fi

echo '>>> Backend deps'
cd backend-auth
npm ci --omit=dev

if [ -d ../frontend-auth ]; then
  echo '>>> Frontend build'
  cd ../frontend-auth
  npm ci --omit=dev
  npm run build
  cd ../backend-auth
else
  cd ../backend-auth
fi

echo '>>> Restart PM2'
pm2 startOrReload ecosystem.config.js --update-env

pm2 status patin-api

