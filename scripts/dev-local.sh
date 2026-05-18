#!/usr/bin/env bash
# Start local Postgres, free the dev server port, and run pnpm dev:server.
# Use RESET=1 (pnpm dev:reset) to wipe the Docker volume first.
set -euo pipefail

source "$(dirname "$0")/dev-common.sh"

dev_prepare

echo "Starting dev server (repo-root .env, port ${PORT:-3000})..."
exec env -u DATABASE_URL pnpm dev:server
