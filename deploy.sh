#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$REPO_ROOT"

echo '>>> Pull repo'
git fetch --all
git pull --rebase

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

